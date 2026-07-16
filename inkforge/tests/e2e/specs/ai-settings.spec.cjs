/**
 * ai-settings.spec.cjs — verifies AI settings against the real Tauri/WebView2
 * shell without calling an external model or treating a local failure as a
 * provider success.
 */
/* global after */
const { expect } = require('chai');

const ORIGINAL_SETTINGS_SNAPSHOT_KEY = 'inkforge.e2e.ai-settings.original';
const TEST_SYSTEM_PROMPT = '仅使用可核验信息；缺少来源时明确说明，不得虚构事实。';

let originalAIState = null;
let originalSnapshotWasCreated = false;

async function waitForMainWindow() {
  const titlebar = await browser.$('.ink-titlebar');
  await titlebar.waitForExist({
    timeout: 10_000,
    interval: 200,
    timeoutMsg: 'titlebar root never mounted on main Tauri window',
  });
}

async function openAISettings() {
  await browser.execute(() => {
    const target = '/settings?tab=ai';
    if (`${location.pathname}${location.search}` !== target) {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="ai"]'))),
    {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: 'AI Settings tab did not render',
    },
  );
}

async function readAIState() {
  return browser.execute(() => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const storeAI = pinia?._s.get('settings')?.settings?.ai;
    const aiStore = pinia?._s.get('ai');
    const persistedAI = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}')?.ai;
    const selectedProvider = document.querySelector(
      '[data-settings-tab="ai"] input[type="radio"]:checked',
    )?.value ?? null;
    const prompt = document.querySelector(
      '[data-settings-entry="ai.systemPrompt"] textarea',
    );
    const result = document.querySelector('[data-settings-tab="ai"] .sv-test-result');

    const project = (value) => value ? {
      provider: value.provider ?? null,
      systemPrompt: value.systemPrompt ?? null,
      lastConnectionAt: value.lastConnectionAt ?? null,
    } : null;

    return {
      store: project(storeAI),
      persisted: project(persistedAI),
      visible: {
        provider: selectedProvider,
        systemPrompt: prompt?.value ?? null,
        promptLength: Number.parseInt(prompt?.nextElementSibling?.textContent ?? '', 10),
        testButtonPresent: Boolean(document.querySelector('[data-settings-tab="ai"] .sv-test-btn')),
        testResult: result?.textContent?.trim() ?? '',
        testResultIsError: result?.classList.contains('error') ?? false,
      },
      availability: {
        available: aiStore?.isAvailable ?? null,
        error: aiStore?.status?.error ?? null,
      },
    };
  });
}

async function selectProvider(provider) {
  await openAISettings();
  const input = await browser.$(
    `[data-settings-tab="ai"] input[type="radio"][value="${provider}"]`,
  );
  await input.waitForExist({ timeout: 5_000, interval: 100 });
  await browser.execute((element) => element.closest('label')?.click(), input);
  await browser.waitUntil(
    async () => (await readAIState()).store?.provider === provider,
    {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: `AI provider did not change to ${provider}`,
    },
  );
}

async function replaceVisibleValue(selector, value) {
  const input = await browser.$(selector);
  await input.scrollIntoView({ block: 'center', inline: 'nearest' });
  await input.waitForDisplayed({ timeout: 5_000, interval: 100 });
  await input.click();
  await browser.keys(['Control', 'a']);
  await browser.keys('Backspace');
  if (value) await browser.keys(value);
}

async function waitForDebouncedSaveAndReload() {
  await browser.pause(5_200);
  await browser.refresh();
  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="ai"]'))),
    {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: 'AI Settings did not recover after reload',
    },
  );
}

describe('AI settings in the real Tauri runtime', () => {
  before(async () => {
    await waitForMainWindow();
    await openAISettings();
    const snapshotStatus = await browser.execute((snapshotKey) => {
      const raw = window.localStorage.getItem('inkforge-settings');
      const existing = window.sessionStorage.getItem(snapshotKey);
      if (existing === null) {
        window.sessionStorage.setItem(snapshotKey, JSON.stringify({
          present: raw !== null,
          value: raw,
        }));
      }
      return {
        created: existing === null,
        ready: window.sessionStorage.getItem(snapshotKey) !== null,
      };
    }, ORIGINAL_SETTINGS_SNAPSHOT_KEY);
    expect(snapshotStatus.ready, 'the original local Settings value is retained inside the WebView session')
      .to.equal(true);
    originalSnapshotWasCreated = snapshotStatus.created;
    originalAIState = (await readAIState()).store;
    expect(originalAIState, 'the production settings store exposes a complete AI object').to.include.keys(
      'provider',
      'systemPrompt',
      'lastConnectionAt',
    );
  });

  after(async () => {
    const restored = await browser.execute((snapshotKey) => {
      const snapshotRaw = window.sessionStorage.getItem(snapshotKey);
      if (!snapshotRaw) return false;
      const snapshot = JSON.parse(snapshotRaw);
      if (snapshot.present) {
        window.localStorage.setItem('inkforge-settings', snapshot.value);
      } else {
        window.localStorage.removeItem('inkforge-settings');
      }
      const matches = window.localStorage.getItem('inkforge-settings') === snapshot.value;
      window.sessionStorage.removeItem(snapshotKey);
      return matches;
    }, ORIGINAL_SETTINGS_SNAPSHOT_KEY);
    expect(restored, 'AI Settings cleanup restores the exact original localStorage value').to.equal(true);

    await browser.refresh();
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="ai"]'))),
      {
        timeout: 10_000,
        interval: 200,
        timeoutMsg: 'AI Settings did not reload after cleanup',
      },
    );
    const restoredState = await readAIState();
    expect(restoredState.store, 'AI store reloads after restoring the original Settings value')
      .to.not.equal(null);
    if (originalSnapshotWasCreated) {
      expect(restoredState.store, 'a fresh run restores its original non-secret settings projection')
        .to.deep.equal(originalAIState);
    }
  });

  it('persists provider and prompt while keeping missing-key and disabled states honest', async () => {
    await selectProvider('deepseek');
    await replaceVisibleValue('[data-settings-tab="ai"] input[type="password"]', '');
    await replaceVisibleValue(
      '[data-settings-entry="ai.systemPrompt"] textarea',
      TEST_SYSTEM_PROMPT,
    );
    await waitForDebouncedSaveAndReload();

    let state = await readAIState();
    const expectedProjection = {
      provider: 'deepseek',
      systemPrompt: TEST_SYSTEM_PROMPT,
      lastConnectionAt: originalAIState.lastConnectionAt,
    };
    expect(state.store, 'visible AI edits reach the production settings store').to.deep.equal(expectedProjection);
    expect(state.persisted, 'AI provider and prompt survive the debounced local persistence path')
      .to.deep.equal(expectedProjection);
    expect(state.visible.provider, 'the provider radio survives a real WebView reload').to.equal('deepseek');
    expect(state.visible.systemPrompt, 'the prompt textarea survives a real WebView reload')
      .to.equal(TEST_SYSTEM_PROMPT);
    expect(state.visible.promptLength, 'the visible prompt counter matches the persisted prompt')
      .to.equal(TEST_SYSTEM_PROMPT.length);
    expect(state.availability).to.deep.equal({ available: false, error: '请先配置 API Key' });

    const testButton = await browser.$('[data-settings-tab="ai"] .sv-test-btn');
    await testButton.scrollIntoView({ block: 'center', inline: 'nearest' });
    await testButton.click();
    await browser.waitUntil(
      async () => (await readAIState()).visible.testResult === '请先配置 API Key',
      {
        timeout: 5_000,
        interval: 100,
        timeoutMsg: 'missing API key did not produce an explicit connection failure',
      },
    );

    state = await readAIState();
    expect(state.visible.testResultIsError, 'missing-key connection result is rendered as an error')
      .to.equal(true);
    expect(state.store.lastConnectionAt, 'a rejected local connection check cannot record success')
      .to.equal(originalAIState.lastConnectionAt);
    expect(state.persisted.lastConnectionAt, 'a rejected check cannot persist a success timestamp')
      .to.equal(originalAIState.lastConnectionAt);

    await selectProvider('none');
    await waitForDebouncedSaveAndReload();
    state = await readAIState();
    expect(state.store.provider, 'the disabled provider survives reload').to.equal('none');
    expect(state.persisted.provider, 'the disabled provider persists locally').to.equal('none');
    expect(state.visible.provider, 'the disabled provider remains visibly selected').to.equal('none');
    expect(state.visible.testButtonPresent, 'disabled AI exposes no misleading connection action')
      .to.equal(false);
    expect(state.availability).to.deep.equal({ available: false, error: 'AI 功能已禁用' });
    expect(state.store.lastConnectionAt, 'disabling AI does not manufacture a new success timestamp')
      .to.equal(originalAIState.lastConnectionAt);
  });
});
