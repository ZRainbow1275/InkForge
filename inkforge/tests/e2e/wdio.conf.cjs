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

let tauriDriver;
let isolatedWebViewUserDataDir;
global.__INKFORGE_E2E_DATA_ISOLATED__ = false;

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
  port: 4444,

  // Build the Tauri debug binary so the harness has something to launch.
  // The pre-existing wechat.rs clippy errors are NOT promoted to deny here
  // (per PRD risks section) — default warning level is fine for tests.
  onPrepare: () => {
    if (process.env.INKFORGE_E2E_SKIP_TAURI_BUILD === '1') return;

    const result = spawnSync(
      'cargo',
      ['build', '--manifest-path=../../src-tauri/Cargo.toml'],
      { cwd: __dirname, stdio: 'inherit' },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Tauri debug build failed with exit code ${result.status}`);
  },

  // Spawn tauri-driver. It in turn launches msedgedriver on a free port and
  // proxies WebDriver commands into the Tauri WebView2 surface.
  beforeSession: () => {
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
      ['--native-driver', msedgePath],
      { stdio: [null, process.stdout, process.stderr] },
    );
  },

  before: async () => {
    verifyIsolatedWebViewUserDataDir();
    await selectMainApplicationWindow();
  },
  beforeTest: () => {
    if (!global.__INKFORGE_E2E_DATA_ISOLATED__) {
      throw new Error('E2E requires the native driver scoped WebView2 data root');
    }
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
