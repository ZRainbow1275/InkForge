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
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const TAURI_DRIVER_PORT = 4444;
const E2E_MASTER_KEY_ID = 'com.inkforge.keychain:inkforge_e2e_master_key_v3';
const MAX_NATIVE_HOST_CLIENT_GAP_PX = 8;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_RELEASE_APPLICATION_PATH = path.resolve(
  PROJECT_ROOT,
  'src-tauri',
  'target',
  'release',
  'InkForge.exe',
);
const RELEASE_APPLICATION_PATH = process.env.INKFORGE_E2E_APPLICATION
  ? path.resolve(process.env.INKFORGE_E2E_APPLICATION)
  : DEFAULT_RELEASE_APPLICATION_PATH;
const DEFAULT_RELEASE_EXE_SHA256 = '524b72a5fa1b4b72832aff88460a7487fbffbed8024035fb4221b29966e32791';
const DEFAULT_RELEASE_PRODUCER_SHA256 = '88c35464733fb2f309e895dad536a8a9575c6292f61043f87a5de5a1f3440cf3';
const RELEASE_PRODUCER_ROOTS = [
  path.resolve(PROJECT_ROOT, 'src', 'services', 'export'),
  path.resolve(PROJECT_ROOT, 'src', 'services', 'writing-components.ts'),
  path.resolve(PROJECT_ROOT, 'src', 'components', 'export', 'ExportModal.vue'),
];
const E2E_SCOPE_ID = crypto.createHash('sha256')
  .update(`${PROJECT_ROOT}\0${TAURI_DRIVER_PORT}\0${RELEASE_APPLICATION_PATH}`)
  .digest('hex')
  .slice(0, 16);
const ISOLATED_WEBVIEW_ROOT = path.resolve(os.tmpdir(), `inkforge-e2e-${E2E_SCOPE_ID}`);
const ISOLATED_WEBVIEW_USER_DATA_DIR = path.resolve(ISOLATED_WEBVIEW_ROOT, 'EBWebView');

let tauriDriver;
let releaseIdentity;
global.__INKFORGE_E2E_DATA_ISOLATED__ = false;

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isProducerSourceFile(filePath) {
  const normalizedPath = filePath.replaceAll('\\', '/');
  return /\.(?:ts|vue)$/u.test(normalizedPath)
    && !/(?:\.test\.ts|\/__tests__\/)/u.test(normalizedPath);
}

function listProducerFiles(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  return fs.readdirSync(targetPath, { withFileTypes: true })
    .flatMap(entry => listProducerFiles(path.join(targetPath, entry.name)))
    .filter(isProducerSourceFile);
}

function sha256ProducerSourceSet(filePaths) {
  const hash = crypto.createHash('sha256');
  for (const filePath of [...filePaths].sort()) {
    const relativePath = path.relative(PROJECT_ROOT, filePath).split(path.sep).join('/');
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(filePath));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function assertReleaseIdentity() {
  if (process.platform !== 'win32') {
    throw new Error('Refusing release E2E: InkForge release acceptance requires Windows WebView2');
  }
  if (!fs.existsSync(RELEASE_APPLICATION_PATH) || !fs.statSync(RELEASE_APPLICATION_PATH).isFile()) {
    throw new Error('Refusing release E2E: the configured InkForge.exe release binary is missing');
  }
  const normalizedApplicationPath = RELEASE_APPLICATION_PATH.replaceAll('\\', '/').toLowerCase();
  if (!normalizedApplicationPath.endsWith('/inkforge.exe') || normalizedApplicationPath.includes('/target/debug/')) {
    throw new Error('Refusing release E2E: the configured application is not a release InkForge.exe');
  }

  const expectedSha256 = (process.env.INKFORGE_E2E_EXPECTED_EXE_SHA256 || DEFAULT_RELEASE_EXE_SHA256)
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(expectedSha256)) {
    throw new Error('Refusing release E2E: expected EXE SHA-256 must be exactly 64 hexadecimal characters');
  }
  const executableSha256 = sha256File(RELEASE_APPLICATION_PATH);
  if (executableSha256 !== expectedSha256) {
    throw new Error(`Refusing release E2E: EXE SHA-256 mismatch; expected ${expectedSha256}, got ${executableSha256}`);
  }
  if (RELEASE_PRODUCER_ROOTS.some(producerPath => !fs.existsSync(producerPath))) {
    throw new Error('Refusing release E2E: the artifact producer source set is incomplete');
  }
  const producerFiles = RELEASE_PRODUCER_ROOTS.flatMap(listProducerFiles);
  const producerSha256 = sha256ProducerSourceSet(producerFiles);
  const expectedProducerSha256 = (
    process.env.INKFORGE_E2E_EXPECTED_PRODUCER_SHA256 || DEFAULT_RELEASE_PRODUCER_SHA256
  ).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(expectedProducerSha256)) {
    throw new Error('Refusing release E2E: expected producer SHA-256 must be exactly 64 hexadecimal characters');
  }
  if (producerSha256 !== expectedProducerSha256) {
    throw new Error(
      `Refusing release E2E: producer SHA-256 mismatch; expected ${expectedProducerSha256}, got ${producerSha256}`,
    );
  }

  return {
    applicationPath: RELEASE_APPLICATION_PATH,
    executableBytes: fs.statSync(RELEASE_APPLICATION_PATH).size,
    executableSha256,
    producerLabel: `export-source-set-v1:${producerFiles.length}`,
    producerSha256,
  };
}

function exposeReleaseIdentity(identity) {
  global.__INKFORGE_E2E_RELEASE_IDENTITY__ = {
    executableBytes: identity.executableBytes,
    executableSha256: identity.executableSha256,
    producerLabel: identity.producerLabel,
    producerSha256: identity.producerSha256,
  };
}

function verifyLaunchedReleaseBinary() {
  if (!releaseIdentity) throw new Error('Release identity was not established before the native session');
  const applicationProcessId = Number(global.browser?.capabilities?.['goog:processID']);
  if (!Number.isInteger(applicationProcessId) || applicationProcessId <= 0) {
    throw new Error('The launched release application process id is unavailable');
  }
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${applicationProcessId}"`,
    "if (-not $process -or $process.Name -ne 'InkForge.exe' -or -not $process.ExecutablePath) { exit 2 }",
    '[Console]::Out.Write($process.ExecutablePath)',
  ].join('; ');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error('Refusing E2E: unable to read the launched InkForge.exe executable path');
  }
  const launchedPath = path.resolve(result.stdout.trim());
  if (launchedPath.toLowerCase() !== releaseIdentity.applicationPath.toLowerCase()) {
    throw new Error('Refusing E2E: the WebDriver process is not the configured release InkForge.exe');
  }
}

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

function getTaskOwnedDriverDirectory(userDataDir) {
  return path.resolve(userDataDir).toLowerCase() === ISOLATED_WEBVIEW_USER_DATA_DIR.toLowerCase()
    ? ISOLATED_WEBVIEW_ROOT
    : null;
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
    'if ($commandLine -match \'--enable-automation\' -and $commandLine -match \'--user-data-dir=(?:"([^"]+)"|([^ ]+))\') { if ($Matches[1]) { [Console]::Out.Write($Matches[1]) } else { [Console]::Out.Write($Matches[2]) }; exit 0 }',
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
  const taskOwnedDriverDirectory = getTaskOwnedDriverDirectory(userDataDir);
  if (!taskOwnedDriverDirectory) {
    const actualLeaf = path.relative(os.tmpdir(), userDataDir).split(path.sep).join('/');
    const expectedLeaf = path.relative(os.tmpdir(), ISOLATED_WEBVIEW_USER_DATA_DIR).split(path.sep).join('/');
    throw new Error(`Refusing to run E2E outside the task-owned WebView2 data directory: actual=${actualLeaf}; expected=${expectedLeaf}`);
  }

  global.__INKFORGE_E2E_DATA_ISOLATED__ = true;
  console.log(`[InkForge E2E] isolated WebView2 data verified in ${path.basename(taskOwnedDriverDirectory)}`);
}

async function reloadVerifiedReleaseSession() {
  const previousProcessId = Number(global.browser?.capabilities?.['goog:processID']);
  if (!Number.isInteger(previousProcessId) || previousProcessId <= 0) {
    throw new Error('Refusing restart acceptance: the previous InkForge process id is unavailable');
  }
  await global.browser.reloadSession({
    'tauri:options': {
      application: RELEASE_APPLICATION_PATH,
      webviewOptions: {
        userDataFolder: ISOLATED_WEBVIEW_ROOT,
      },
    },
  });
  verifyLaunchedReleaseBinary();
  verifyIsolatedWebViewUserDataDir();
  await ensureMainApplicationWindowInteractable();
  const currentProcessId = Number(global.browser?.capabilities?.['goog:processID']);
  if (currentProcessId === previousProcessId) {
    throw new Error('Refusing restart acceptance: reloadSession reused the previous InkForge process');
  }
  return { previousProcessId, currentProcessId };
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

async function focusMainApplicationWindow() {
  const focusResult = await global.browser.executeAsync((done) => {
    const invoke = window.__TAURI_INVOKE__;
    if (typeof invoke !== 'function') {
      done({ error: 'native Tauri invoke bridge is unavailable' });
      return;
    }
    invoke('focus_window', { windowId: 'main' })
      .then(() => done({ error: null }))
      .catch((error) => done({ error: error instanceof Error ? error.message : String(error) }));
  });
  if (focusResult?.error) {
    throw new Error(`Unable to restore the main Tauri window foreground focus: ${focusResult.error}`);
  }
}

async function ensureMainApplicationWindowInteractable() {
  await selectMainApplicationWindow();
  const titlebar = await global.browser.$('.ink-titlebar');
  await titlebar.waitForDisplayed({ timeout: 5_000 });

  await global.browser.waitUntil(
    async () => {
      const isInteractable = await global.browser.execute(() => (
        document.hasFocus() && window.innerWidth >= 800 && window.innerHeight >= 500
      ));
      if (isInteractable) return true;
      await focusMainApplicationWindow();
      return false;
    },
    {
      timeout: 10_000,
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
        focused: document.hasFocus(),
      }));
      if (!client.focused) {
        await focusMainApplicationWindow();
        return false;
      }
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
    async () => {
      const focused = await global.browser.execute(() => document.hasFocus());
      if (focused) return true;
      await focusMainApplicationWindow();
      return false;
    },
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
  const taskOwnedDriverDirectory = getTaskOwnedDriverDirectory(ISOLATED_WEBVIEW_USER_DATA_DIR);
  if (!taskOwnedDriverDirectory) {
    throw new Error('Refusing to remove an unverified WebView2 data directory');
  }
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      fs.rmSync(taskOwnedDriverDirectory, { recursive: true, force: true });
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
        application: RELEASE_APPLICATION_PATH,
        webviewOptions: {
          userDataFolder: ISOLATED_WEBVIEW_ROOT,
        },
      },
    },
  ],

  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 300_000 },

  hostname: '127.0.0.1',
  port: TAURI_DRIVER_PORT,

  onPrepare: () => {
    releaseIdentity = assertReleaseIdentity();
    exposeReleaseIdentity(releaseIdentity);
    fs.rmSync(ISOLATED_WEBVIEW_ROOT, { recursive: true, force: true });
    fs.mkdirSync(ISOLATED_WEBVIEW_ROOT, { recursive: true });
    console.log('[InkForge E2E] release identity verified', JSON.stringify({
      executableBytes: releaseIdentity.executableBytes,
      executableSha256: releaseIdentity.executableSha256,
      producerSha256: releaseIdentity.producerSha256,
    }));
  },

  // Spawn tauri-driver. It in turn launches msedgedriver on a free port and
  // proxies WebDriver commands into the Tauri WebView2 surface.
  beforeSession: async () => {
    releaseIdentity = assertReleaseIdentity();
    exposeReleaseIdentity(releaseIdentity);
    global.__INKFORGE_E2E_DATA_ISOLATED__ = false;
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
    verifyLaunchedReleaseBinary();
    verifyIsolatedWebViewUserDataDir();
    await ensureMainApplicationWindowInteractable();
    global.__INKFORGE_E2E_RELOAD_RELEASE_SESSION__ = reloadVerifiedReleaseSession;
  },
  beforeTest: async () => {
    if (!global.__INKFORGE_E2E_DATA_ISOLATED__) {
      throw new Error('E2E requires the task-owned WebView2 data root');
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
      global.__INKFORGE_E2E_RELOAD_RELEASE_SESSION__ = undefined;
      global.__INKFORGE_E2E_RELEASE_IDENTITY__ = undefined;
      releaseIdentity = undefined;
    }
  },
};

exports.isNativeHostWebViewBoundsAligned = isNativeHostWebViewBoundsAligned;
exports.isProducerSourceFile = isProducerSourceFile;
