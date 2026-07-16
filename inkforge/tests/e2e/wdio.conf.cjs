/**
 * wdio.conf.cjs — Tauri 1.x e2e harness.
 *
 * tauri-driver wraps msedgedriver to drive the actual Tauri WebView2 binary,
 * so this exercises real IPC (appWindow.*, allowlist, drag region) — not a
 * vite-served browser facsimile. See ../prd.md for goals + AC.
 */
const os = require('os');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const TAURI_DRIVER_PORT = 4444;
const E2E_MASTER_KEY_ID = 'com.inkforge.keychain:inkforge_e2e_master_key_v3';
const MAX_NATIVE_HOST_CLIENT_GAP_PX = 8;

let tauriDriver;
let isolatedWebViewUserDataDir;
global.__INKFORGE_E2E_DATA_ISOLATED__ = false;

function isNativeHostWebViewBoundsAligned(host, client) {
  return Math.abs(host.width - client.width) <= MAX_NATIVE_HOST_CLIENT_GAP_PX
    && Math.abs(host.height - client.height) <= MAX_NATIVE_HOST_CLIENT_GAP_PX;
}

function terminateTauriDriverOnProcessExit() {
  const driver = tauriDriver;
  tauriDriver = undefined;
  if (!driver || driver.exitCode !== null || driver.signalCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(driver.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  driver.kill();
}

process.once('exit', terminateTauriDriverOnProcessExit);
process.once('SIGINT', () => process.exit(130));
process.once('SIGTERM', () => process.exit(143));

function getScopedDriverDirectory(userDataDir) {
  const relativeToTemp = path.relative(os.tmpdir(), userDataDir);
  const segments = relativeToTemp.split(path.sep);
  const isScopedDriverDirectory = segments.length === 2
    && segments[0].startsWith('scoped_dir')
    && segments[1] === 'EBWebView'
    && !relativeToTemp.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativeToTemp);
  return isScopedDriverDirectory ? path.dirname(userDataDir) : null;
}

function getListeningProcessId(port) {
  const script = [
    `$connection = Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -eq ${port} } | Select-Object -First 1`,
    'if ($connection) { [Console]::Out.Write($connection.OwningProcess) }',
  ].join('; ');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Unable to inspect Tauri driver port ${port}: ${result.stderr.trim()}`);
  }
  const processId = Number(result.stdout.trim());
  return Number.isInteger(processId) && processId > 0 ? processId : null;
}

function assertTauriDriverPortAvailable() {
  const listeningProcessId = getListeningProcessId(TAURI_DRIVER_PORT);
  if (listeningProcessId !== null) {
    throw new Error(
      `Refusing E2E: port ${TAURI_DRIVER_PORT} is already owned by PID ${listeningProcessId}; no stale driver may be reused`,
    );
  }
}

async function waitForTauriDriverOwnership() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (!tauriDriver) throw new Error('tauri-driver process was not created');
    if (tauriDriver.exitCode !== null || tauriDriver.signalCode !== null) {
      throw new Error(`tauri-driver exited before owning port ${TAURI_DRIVER_PORT}`);
    }

    const listeningProcessId = getListeningProcessId(TAURI_DRIVER_PORT);
    if (listeningProcessId !== null) {
      if (listeningProcessId !== tauriDriver.pid) {
        throw new Error(
          `Refusing E2E: port ${TAURI_DRIVER_PORT} is owned by PID ${listeningProcessId}, not launched tauri-driver PID ${tauriDriver.pid}`,
        );
      }
      console.log(`[InkForge E2E] tauri-driver PID ${tauriDriver.pid} owns port ${TAURI_DRIVER_PORT}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`tauri-driver PID ${tauriDriver?.pid ?? 'unknown'} did not own port ${TAURI_DRIVER_PORT} within 10 seconds`);
}

function verifyIsolatedWebViewUserDataDir() {
  const applicationProcessId = Number(global.browser?.capabilities?.['goog:processID']);
  if (!Number.isInteger(applicationProcessId) || applicationProcessId <= 0) {
    throw new Error('The Tauri application process id is unavailable');
  }
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$commandLine = Get-CimInstance Win32_Process -Filter "ParentProcessId = ${applicationProcessId}" | Where-Object { $_.Name -eq 'msedgewebview2.exe' } | Select-Object -First 1 -ExpandProperty CommandLine`,
    'if (-not $commandLine) { exit 2 }',
    'if ($commandLine -match \'--enable-automation\' -and $commandLine -match \'--user-data-dir="([^"]+)"\') { [Console]::Out.Write($Matches[1]); exit 0 }',
    'exit 3',
  ].join('; ');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error(`Unable to verify the automated WebView2 data directory (exit ${result.status}): ${result.stderr.trim()}`);
  }

  const userDataDir = path.resolve(result.stdout.trim());
  const scopedDriverDirectory = getScopedDriverDirectory(userDataDir);
  if (!scopedDriverDirectory) {
    throw new Error('Refusing to run E2E outside the native driver temporary WebView2 data directory');
  }

  isolatedWebViewUserDataDir = userDataDir;
  global.__INKFORGE_E2E_DATA_ISOLATED__ = true;
  console.log(`[InkForge E2E] isolated WebView2 data verified in ${path.basename(scopedDriverDirectory)}`);
}

async function deleteIsolatedCredential() {
  const result = await global.browser.executeAsync((keyId, done) => {
    const invoke = window.__TAURI_INVOKE__;
    if (typeof invoke !== 'function') {
      done({ error: 'native Tauri invoke bridge is unavailable' });
      return;
    }
    invoke('get_key', { keyId })
      .then((storedKey) => {
        if (typeof storedKey !== 'string' || storedKey.length === 0) {
          throw new Error('the dedicated E2E credential was not created');
        }
        return invoke('delete_key', { keyId });
      })
      .then(() => done({ error: null }))
      .catch((error) => done({ error: error instanceof Error ? error.message : String(error) }));
  }, E2E_MASTER_KEY_ID);
  if (result?.error) {
    throw new Error(`Unable to remove the isolated E2E credential: ${result.error}`);
  }
  console.log('[InkForge E2E] isolated OS credential removed');
}

async function selectMainApplicationWindow() {
  const deadline = Date.now() + 15_000;
  let lastError = null;
  let lastHandles = [];

  while (Date.now() < deadline) {
    try {
      lastHandles = await global.browser.getWindowHandles();
      for (const handle of lastHandles) {
        try {
          await global.browser.switchToWindow(handle);
          const isMainWindow = await global.browser.execute(() => Boolean(document.querySelector('.ink-titlebar')));
          if (isMainWindow) {
            console.log(`[InkForge E2E] selected main WebView from ${lastHandles.length} window handle(s)`);
            return;
          }
        } catch (error) {
          lastError = error;
        }
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? 'none');
  throw new Error(`Unable to select the InkForge main WebView from ${lastHandles.length} handle(s): ${detail}`);
}

async function ensureMainApplicationWindowInteractable() {
  await selectMainApplicationWindow();
  const titlebar = await global.browser.$('.ink-titlebar');
  await titlebar.waitForDisplayed({ timeout: 5_000 });

  const restoreButton = await global.browser.$('button[aria-label="还原"]');
  if (await restoreButton.isExisting()) {
    await restoreButton.click();
    await global.browser.waitUntil(
      async () => (await global.browser.$('button[aria-label="最大化"]')).isExisting(),
      {
        timeout: 5_000,
        interval: 100,
        timeoutMsg: 'The native Tauri window did not leave maximized state before E2E interaction',
      },
    );
  }

  await titlebar.click();
  await global.browser.waitUntil(
    async () => global.browser.execute(() => window.innerWidth >= 800 && window.innerHeight >= 500),
    {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: 'The main Tauri WebView did not reach a desktop-interactable viewport after window normalization',
    },
  );
  const alignedBounds = await global.browser.waitUntil(
    async () => {
      const host = await global.browser.getWindowRect();
      const client = await global.browser.execute(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }));
      const widthGap = host.width - client.width;
      const heightGap = host.height - client.height;
      if (!isNativeHostWebViewBoundsAligned(host, client)) {
        return false;
      }
      return { host, client, widthGap, heightGap };
    },
    {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: 'The native Tauri host and WebView client bounds are desynchronized',
    },
  );
  console.log(
    `[InkForge E2E] host/client bounds aligned: host=${alignedBounds.host.width}x${alignedBounds.host.height}, client=${alignedBounds.client.width}x${alignedBounds.client.height}, gap=${alignedBounds.widthGap}x${alignedBounds.heightGap}`,
  );
  await global.browser.waitUntil(
    async () => global.browser.execute(() => document.hasFocus()),
    {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: 'The main Tauri WebView did not regain foreground focus',
    },
  );
}

async function stopTauriDriver() {
  const driver = tauriDriver;
  tauriDriver = undefined;
  if (!driver || driver.exitCode !== null || driver.signalCode !== null) return;

  await new Promise((resolve, reject) => {
    const handleClose = () => {
      clearTimeout(timeout);
      driver.off('error', handleError);
      resolve();
    };
    const handleError = (error) => {
      clearTimeout(timeout);
      driver.off('close', handleClose);
      reject(error);
    };
    const timeout = setTimeout(() => {
      driver.off('close', handleClose);
      driver.off('error', handleError);
      reject(new Error('tauri-driver did not exit within 5 seconds; refusing WebView2 data cleanup'));
    }, 5_000);

    driver.once('close', handleClose);
    driver.once('error', handleError);
    if (driver.exitCode !== null || driver.signalCode !== null) {
      handleClose();
      return;
    }
    if (!driver.killed) driver.kill();
  });
}

async function removeIsolatedWebViewData() {
  if (!isolatedWebViewUserDataDir) return;
  const scopedDriverDirectory = getScopedDriverDirectory(isolatedWebViewUserDataDir);
  isolatedWebViewUserDataDir = undefined;
  if (!scopedDriverDirectory) {
    throw new Error('Refusing to remove an unverified WebView2 data directory');
  }
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      fs.rmSync(scopedDriverDirectory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 49 || !['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error.code)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

assertTauriDriverPortAvailable();

exports.config = {
  specs: [path.resolve(__dirname, 'specs', '*.spec.cjs')],
  maxInstances: 1,

  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: path.resolve(
          __dirname,
          '..',
          '..',
          'src-tauri',
          'target',
          'debug',
          'InkForge.exe',
        ),
      },
    },
  ],

  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 300_000 },

  hostname: '127.0.0.1',
  port: TAURI_DRIVER_PORT,

  // Build the current frontend and re-embed it in the Tauri debug binary.
  // Calling cargo directly can reuse an executable with stale dist assets.
  onPrepare: () => {
    if (process.env.INKFORGE_E2E_SKIP_TAURI_BUILD === '1') return;

    const isWindows = process.platform === 'win32';
    const result = spawnSync(
      isWindows ? (process.env.ComSpec || 'cmd.exe') : 'pnpm',
      isWindows
        ? ['/d', '/s', '/c', 'pnpm exec tauri build --debug --bundles none']
        : ['exec', 'tauri', 'build', '--debug', '--bundles', 'none'],
      {
        cwd: path.resolve(__dirname, '..', '..'),
        stdio: 'inherit',
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Tauri E2E build failed with exit code ${result.status}`);
  },

  // Spawn tauri-driver. It in turn launches msedgedriver on a free port and
  // proxies WebDriver commands into the Tauri WebView2 surface.
  beforeSession: async () => {
    global.__INKFORGE_E2E_DATA_ISOLATED__ = false;
    isolatedWebViewUserDataDir = undefined;
    const msedgePath = path.resolve(
      os.homedir(),
      '.local',
      'bin',
      'msedgedriver.exe',
    );
    tauriDriver = spawn(
      path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver.exe'),
      ['--port', String(TAURI_DRIVER_PORT), '--native-driver', msedgePath],
      { stdio: ['ignore', process.stdout, process.stderr], windowsHide: true },
    );
    try {
      await waitForTauriDriverOwnership();
    } catch (error) {
      await stopTauriDriver().catch(() => undefined);
      throw error;
    }
  },

  before: async () => {
    verifyIsolatedWebViewUserDataDir();
    await ensureMainApplicationWindowInteractable();
  },
  beforeTest: async () => {
    if (!global.__INKFORGE_E2E_DATA_ISOLATED__) {
      throw new Error('E2E requires the native driver scoped WebView2 data root');
    }
    await ensureMainApplicationWindowInteractable();
  },
  after: async () => {
    await deleteIsolatedCredential();
  },

  afterSession: async () => {
    try {
      await stopTauriDriver();
      await removeIsolatedWebViewData();
    } finally {
      global.__INKFORGE_E2E_DATA_ISOLATED__ = false;
    }
  },
};

exports.isNativeHostWebViewBoundsAligned = isNativeHostWebViewBoundsAligned;
