/**
 * wdio.conf.cjs — Tauri 1.x e2e harness.
 *
 * tauri-driver wraps msedgedriver to drive the actual Tauri WebView2 binary,
 * so this exercises real IPC (appWindow.*, allowlist, drag region) — not a
 * vite-served browser facsimile. See ../prd.md for goals + AC.
 */
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

let tauriDriver;

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
  mochaOpts: { ui: 'bdd', timeout: 90_000 },

  hostname: '127.0.0.1',
  port: 4444,

  // Build the Tauri debug binary so the harness has something to launch.
  // The pre-existing wechat.rs clippy errors are NOT promoted to deny here
  // (per PRD risks section) — default warning level is fine for tests.
  onPrepare: () =>
    spawnSync(
      'cargo',
      ['build', '--manifest-path=../../src-tauri/Cargo.toml'],
      { cwd: __dirname, stdio: 'inherit' },
    ),

  // Spawn tauri-driver. It in turn launches msedgedriver on a free port and
  // proxies WebDriver commands into the Tauri WebView2 surface.
  beforeSession: () => {
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

  afterSession: () => {
    if (tauriDriver && !tauriDriver.killed) tauriDriver.kill();
  },
};
