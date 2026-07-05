/**
 * native-runtime.spec.cjs — verifies the 05-12 desktop/native boundary against
 * the real Tauri WebView2 shell. The spec intentionally avoids actions that
 * would open Explorer, open an external browser/mail client, or require an OS
 * file picker selection. It proves runtime detection, Settings UI reflection,
 * native snapshot commands, and fail-closed invalid/missing-path behavior.
 */
const { expect } = require('chai');

const TAURI_SIGNAL_VALUES = [
  'tauri-v1',
  'tauri-v1-invoke',
  'tauri-v1-ipc',
  'tauri-v1-metadata',
  'tauri-v1-post-message',
  'tauri-v2-internals',
];

async function waitForMainWindow() {
  const titlebar = await browser.$('.ink-titlebar');
  await titlebar.waitForExist({
    timeout: 10_000,
    interval: 200,
    timeoutMsg: 'titlebar root never mounted on main Tauri window',
  });
}

async function openSettingsAbout() {
  await browser.execute(() => {
    const target = '/settings?tab=about&section=desktop-runtime';
    if (location.pathname !== '/settings' || location.search !== '?tab=about&section=desktop-runtime') {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('[data-settings-entry="about.desktopRuntime"]'))),
    {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: 'Settings About desktop runtime section did not render',
    },
  );
}

async function readDesktopRuntimeUi() {
  return browser.execute(() => {
    const section = document.querySelector('[data-settings-entry="about.desktopRuntime"]');
    const cards = Array.from(section?.querySelectorAll('.sv-insight-card') ?? []).map((card) => ({
      label: card.querySelector('.sv-insight-card__label')?.textContent?.trim() ?? '',
      value: card.querySelector('.sv-insight-card__value')?.textContent?.trim() ?? '',
      meta: card.querySelector('.sv-insight-card__meta')?.textContent?.trim() ?? '',
    }));
    const capabilities = Array.from(section?.querySelectorAll('.sv-tech-badge') ?? []).map((badge) => ({
      text: badge.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      state: badge.getAttribute('data-status') ?? '',
      title: badge.getAttribute('title') ?? '',
    }));
    const notes = Array.from(section?.querySelectorAll('.sv-section-note') ?? [])
      .map((note) => note.textContent?.trim().replace(/\s+/g, ' ') ?? '');

    return {
      text: section?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      cards,
      capabilities,
      note: notes.at(-1) ?? '',
      notes,
      visibleButtonsWithoutType: Array.from(section?.querySelectorAll('button') ?? [])
        .filter((button) => button.offsetParent !== null && button.getAttribute('type') !== 'button')
        .map((button) => button.textContent?.trim().replace(/\s+/g, ' ') ?? button.className),
    };
  });
}

async function runDesktopStoreProbe() {
  return browser.execute(async () => {
    function findPinia() {
      const root = document.getElementById('app');
      const app = root && root.__vue_app__;
      const provides = app && app._context && app._context.provides;
      if (!provides) return null;
      for (const sym of Object.getOwnPropertySymbols(provides)) {
        const candidate = provides[sym];
        if (candidate && candidate._s && typeof candidate._s.get === 'function') {
          return candidate;
        }
      }
      return null;
    }

    const runtimeGlobals = [
      '__TAURI__',
      '__TAURI_INTERNALS__',
      '__TAURI_INVOKE__',
      '__TAURI_IPC__',
      '__TAURI_METADATA__',
      '__TAURI_POST_MESSAGE__',
    ].reduce((acc, key) => {
      acc[key] = typeof window[key];
      return acc;
    }, {});

    const pinia = findPinia();
    const desktopStore = pinia && pinia._s.get('desktop');
    if (!desktopStore) {
      return {
        ok: false,
        reason: 'DESKTOP-STORE-MISSING',
        runtimeGlobals,
      };
    }

    await desktopStore.refresh();
    const missingPath = 'C:/InkForge-Native-Boundary-Missing-Do-Not-Create.md';
    const emptyReveal = await desktopStore.revealPath('   ');
    const missingReveal = await desktopStore.revealPath(missingPath);
    const invalidUrl = await desktopStore.openUrl('javascript:alert(1)');
    const malformedUrl = await desktopStore.openUrl('not a url');

    return {
      ok: true,
      runtimeGlobals,
      snapshot: desktopStore.snapshot,
      error: desktopStore.error,
      emptyReveal,
      missingReveal,
      invalidUrl,
      malformedUrl,
    };
  });
}

async function runClipboardTextProbe() {
  return browser.execute(async () => {
    function findPinia() {
      const root = document.getElementById('app');
      const app = root && root.__vue_app__;
      const provides = app && app._context && app._context.provides;
      if (!provides) return null;
      for (const sym of Object.getOwnPropertySymbols(provides)) {
        const candidate = provides[sym];
        if (candidate && candidate._s && typeof candidate._s.get === 'function') {
          return candidate;
        }
      }
      return null;
    }

    const pinia = findPinia();
    const desktopStore = pinia && pinia._s.get('desktop');
    if (!desktopStore) {
      return {
        ok: false,
        reason: 'DESKTOP-STORE-MISSING',
      };
    }

    const original = await desktopStore.readClipboardText();
    const canRestoreOriginalText = Boolean(original && original.ok && typeof original.value === 'string');
    const restoreText = canRestoreOriginalText ? original.value : '';
    const sample = `InkForge desktop clipboard text probe ${Date.now()} ${Math.random().toString(16).slice(2)}`;
    let writeResult;
    let readResult;
    let restoreResult;
    let restoreReadResult;

    try {
      writeResult = await desktopStore.writeClipboardText(sample);
      readResult = await desktopStore.readClipboardText();
    } finally {
      restoreResult = await desktopStore.writeClipboardText(restoreText);
      if (canRestoreOriginalText) {
        restoreReadResult = await desktopStore.readClipboardText();
      }
    }

    return {
      ok: true,
      originalReadOk: Boolean(original && original.ok),
      originalWasText: canRestoreOriginalText,
      writeOk: Boolean(writeResult && writeResult.ok),
      readOk: Boolean(readResult && readResult.ok),
      readMatches: Boolean(readResult && readResult.ok && readResult.value === sample),
      readLength: readResult && readResult.ok && typeof readResult.value === 'string'
        ? readResult.value.length
        : null,
      restoreOk: Boolean(restoreResult && restoreResult.ok),
      restoreWasExactText: canRestoreOriginalText
        ? Boolean(restoreReadResult && restoreReadResult.ok && restoreReadResult.value === restoreText)
        : null,
      writeSource: writeResult && writeResult.source,
      readSource: readResult && readResult.source,
      restoreSource: restoreResult && restoreResult.source,
      restoreReadSource: restoreReadResult && restoreReadResult.source,
      writeReason: writeResult && !writeResult.ok ? writeResult.reason : null,
      readReason: readResult && !readResult.ok ? readResult.reason : null,
      restoreReason: restoreResult && !restoreResult.ok ? restoreResult.reason : null,
      restoreReadReason: restoreReadResult && !restoreReadResult.ok ? restoreReadResult.reason : null,
    };
  });
}

describe('InkForge — native desktop runtime boundary', () => {
  before(async () => {
    await waitForMainWindow();
    await openSettingsAbout();
  });

  it('Settings About reports the real Tauri runtime and native capability matrix', async () => {
    await browser.waitUntil(
      async () => {
        const ui = await readDesktopRuntimeUi();
        return ui.text.includes('Tauri Desktop') && !ui.text.includes('Web Runtime');
      },
      {
        timeout: 15_000,
        interval: 300,
        timeoutMsg: 'desktop runtime UI did not resolve to Tauri Desktop',
      },
    );

    const ui = await readDesktopRuntimeUi();
    const runtimeCard = ui.cards.find((card) => card.label === 'Runtime');
    const windowCard = ui.cards.find((card) => card.label === 'Window');
    const appDataCard = ui.cards.find((card) => card.label === 'App Data');

    expect(runtimeCard?.value, 'runtime label').to.equal('Tauri Desktop');
    expect(TAURI_SIGNAL_VALUES, 'runtime signal must be an explicit Tauri signal').to.include(runtimeCard?.meta);
    expect(windowCard?.value, 'current window label').to.equal('main');
    expect(windowCard?.meta, 'window list count').to.match(/native window/);
    expect(appDataCard?.value, 'target OS').to.equal('windows');
    expect(appDataCard?.meta, 'app data dir surfaced').to.be.a('string').and.not.equal('native path unavailable');
    expect(ui.note, 'native runtime note').to.include('Native runtime information loaded from real Tauri commands');
    expect(ui.visibleButtonsWithoutType, 'desktop runtime buttons keep explicit non-submit type').to.deep.equal([]);

    const capability = (label) => ui.capabilities.find((entry) => entry.text.startsWith(label + ':'));
    expect(capability('Application Info')?.state, 'app-info capability').to.equal('available');
    expect(capability('Window Management')?.state, 'window-management capability').to.equal('available');
    expect(capability('Native File Dialog')?.state, 'native-file-dialog capability').to.equal('available');
    expect(capability('Reveal in File Manager')?.state, 'file-reveal capability').to.equal('available');
    expect(capability('External URL Open')?.state, 'shell-open capability').to.equal('available');
    expect(capability('File Watcher')?.state, 'file-watch planned state is honest').to.equal('planned');
    expect(capability('Update Notification')?.state, 'updater planned state is honest without fake release endpoint').to.equal('planned');
    expect(capability('Package Signing')?.state, 'package signing planned/local release boundary').to.equal('planned');
  });

  it('desktop store calls real native commands and fails closed for unsafe or missing inputs', async () => {
    const probe = await runDesktopStoreProbe();
    expect(probe.ok, probe.reason || 'desktop store probe').to.equal(true);

    const hasTauriRuntimeGlobal = Object.values(probe.runtimeGlobals).some((value) => value !== 'undefined');
    expect(hasTauriRuntimeGlobal, 'Tauri IPC globals exist in WebView2').to.equal(true);

    expect(probe.snapshot.runtime.kind, 'snapshot runtime kind').to.equal('tauri');
    expect(TAURI_SIGNAL_VALUES, 'snapshot runtime signal').to.include(probe.snapshot.runtime.signal);
    expect(probe.snapshot.app.name, 'native app name').to.equal('InkForge');
    expect(probe.snapshot.app.targetOs, 'native target OS').to.equal('windows');
    expect(probe.snapshot.currentWindow.label, 'current window').to.equal('main');
    expect(probe.snapshot.windows.map((entry) => entry.label), 'native window list from Rust command').to.include('main');
    expect(probe.error, 'desktop store refresh should not surface an error').to.equal(null);

    expect(probe.emptyReveal, 'empty reveal path should fail before native command').to.include({
      ok: false,
      reason: 'invalid-input',
      source: 'tauri',
    });
    expect(probe.emptyReveal.message, 'empty reveal message').to.include('filePath is required');

    expect(probe.missingReveal, 'missing reveal path should call native command and fail closed').to.include({
      ok: false,
      reason: 'failed',
      source: 'tauri',
    });
    expect(probe.missingReveal.message, 'missing reveal native error').to.include('path does not exist');

    expect(probe.invalidUrl, 'unsafe URL protocol should fail before shell.open').to.include({
      ok: false,
      reason: 'invalid-input',
      source: 'tauri',
    });
    expect(probe.invalidUrl.message, 'unsafe URL protocol message').to.include('URL protocol is not allowed');

    expect(probe.malformedUrl, 'malformed URL should fail before shell.open').to.include({
      ok: false,
      reason: 'invalid-input',
      source: 'tauri',
    });
    expect(probe.malformedUrl.message, 'malformed URL message').to.include('URL format is invalid');
  });

  it('desktop store writes and reads real Tauri clipboard text without claiming rich clipboard support', async () => {
    const probe = await runClipboardTextProbe();

    expect(probe.ok, probe.reason || 'clipboard text probe').to.equal(true);
    expect(probe.originalReadOk, 'original clipboard readText command should complete').to.equal(true);
    expect(probe.writeOk, probe.writeReason || 'clipboard writeText should succeed').to.equal(true);
    expect(probe.readOk, probe.readReason || 'clipboard readText should succeed').to.equal(true);
    expect(probe.readMatches, 'readText returns exactly the text written through the native API').to.equal(true);
    expect(probe.readLength, 'probe text length').to.be.a('number').and.greaterThan(20);
    expect(probe.restoreOk, probe.restoreReason || 'clipboard should be restored through writeText').to.equal(true);
    if (probe.originalWasText) {
      expect(
        probe.restoreWasExactText,
        probe.restoreReadReason || 'clipboard restore should be read back exactly when original content was text',
      ).to.equal(true);
      expect(probe.restoreReadSource, 'restore readback source').to.equal('tauri');
    }
    expect(probe.writeSource, 'write source').to.equal('tauri');
    expect(probe.readSource, 'read source').to.equal('tauri');
    expect(probe.restoreSource, 'restore source').to.equal('tauri');
  });
});
