/**
 * editor-settings.spec.cjs — proves Settings editor preferences against the
 * real Tauri WebView2 shell and a draft created through the production UI.
 */
/* global after */
const { expect } = require('chai');

const SMART_PUNCTUATION_CASES = [
  { id: 'curlyQuotes', label: '弯引号', input: '"', expected: '“' },
  { id: 'emDash', label: '破折号', input: 'A--', expected: 'A—' },
  { id: 'ellipsis', label: '省略号', input: 'Wait...', expected: 'Wait…' },
  { id: 'arrows', label: '箭头符号', input: 'A ->', expected: 'A →' },
  { id: 'fractions', label: '分数符号', input: '1/2', expected: '½' },
  { id: 'multiplication', label: '乘号', input: '2x3', expected: '2×3' },
  { id: 'copyrightSymbols', label: '版权符号', input: '(tm)', expected: '™' },
  { id: 'degree', label: '度数符号', input: '45 deg', expected: '45°' },
  { id: 'spacedDash', label: '空格连字符', input: 'A - - B', expected: 'A — B' },
  { id: 'panguSpacing', label: '中英文空格', input: '使用V', expected: '使用 V' },
];

const createdArticleIds = new Set();
let originalListEnterBehavior = null;
let originalSmartPunctuationSettings = null;
let originalSettingsStorage;

async function waitForMainWindow() {
  const titlebar = await browser.$('.ink-titlebar');
  await titlebar.waitForExist({
    timeout: 10_000,
    interval: 200,
    timeoutMsg: 'titlebar root never mounted on main Tauri window',
  });
}

async function openRoute(target, readySelector) {
  await browser.execute((path) => {
    if (`${location.pathname}${location.search}` !== path) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, target);

  await browser.waitUntil(
    async () => browser.execute((selector) => Boolean(document.querySelector(selector)), readySelector),
    {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: `${target} did not render ${readySelector}`,
    },
  );
}

async function readListEnterBehavior() {
  return browser.execute(() => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    return pinia?._s.get('settings')?.settings?.editor?.listEnterBehavior ?? null;
  });
}

async function readSmartPunctuationSettings() {
  return browser.execute((ruleDefinitions) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const editorSettings = pinia?._s.get('settings')?.settings?.editor;
    const persisted = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}')?.editor;
    const masterInput = document.querySelector('input[aria-label="智能标点"]');
    const visibleRules = Object.fromEntries(ruleDefinitions.map((rule) => [
      rule.id,
      document.querySelector(`input[aria-label="智能标点规则：${rule.label}"]`)?.checked ?? null,
    ]));
    return {
      store: editorSettings ? {
        enabled: editorSettings.smartPunctuation,
        rules: { ...editorSettings.smartPunctuationRules },
      } : null,
      persisted: persisted ? {
        enabled: persisted.smartPunctuation,
        rules: { ...persisted.smartPunctuationRules },
      } : null,
      visible: {
        enabled: masterInput?.checked ?? null,
        rules: visibleRules,
      },
    };
  }, SMART_PUNCTUATION_CASES);
}

async function applySmartPunctuationSettings(target) {
  await openRoute('/settings?tab=editor', '[data-settings-tab="editor"]');
  const changed = await browser.execute((next, ruleDefinitions) => {
    const masterInput = document.querySelector('input[aria-label="智能标点"]');
    if (!masterInput) return { missing: ['智能标点'], toggled: 0 };
    let toggled = 0;
    if (masterInput.checked !== next.enabled) {
      masterInput.click();
      toggled += 1;
    }
    const missing = [];
    for (const rule of ruleDefinitions) {
      const input = document.querySelector(`input[aria-label="智能标点规则：${rule.label}"]`);
      if (!input) {
        missing.push(rule.label);
      } else if (input.checked !== next.rules[rule.id]) {
        input.click();
        toggled += 1;
      }
    }
    return { missing, toggled };
  }, target, SMART_PUNCTUATION_CASES);
  expect(changed.missing, 'every smart punctuation rule has a visible Settings control').to.deep.equal([]);

  await browser.pause(5_200);
  await browser.refresh();
  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="editor"]'))),
    { timeout: 10_000, interval: 200, timeoutMsg: 'Settings Editor did not recover after punctuation reload' },
  );

  const actual = await readSmartPunctuationSettings();
  expect(actual.store, 'smart punctuation store matches the visible selection').to.deep.equal(target);
  expect(actual.persisted, 'smart punctuation persists through the real debounced settings write')
    .to.deep.equal(target);
  expect(actual.visible, 'smart punctuation controls retain their checked state after reload')
    .to.deep.equal(target);
}

async function readLayoutState() {
  return browser.execute(async () => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const profileId = pinia?._s.get('profile')?.activeProfileId ?? 'local-default';
    const windowId = window.sessionStorage.getItem('inkforge.layout.windowId');
    const layoutStore = pinia?._s.get('layoutPersistence');
    let persistedRecord = null;
    let persistedReadError = null;

    if (windowId) {
      try {
        const database = await new Promise((resolve, reject) => {
          const request = window.indexedDB.open('InkForgeDB');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
        });
        try {
          persistedRecord = await new Promise((resolve, reject) => {
            const request = database
              .transaction('layoutStates', 'readonly')
              .objectStore('layoutStates')
              .get(`${profileId}:${windowId}`);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error ?? new Error('layoutStates read failed'));
          });
        } finally {
          database.close();
        }
      } catch (error) {
        persistedReadError = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      contentArticleId: pinia?._s.get('editor')?.currentContent?.articleId ?? null,
      isLoading: layoutStore?.isLoading ?? null,
      layoutStoreActiveArticleId: layoutStore?.currentRecord?.activeArticleId ?? null,
      persistedActiveArticleId: persistedRecord?.activeArticleId ?? null,
      persistedReadError,
      persistedOpenArticleIds: Array.isArray(persistedRecord?.openTabs)
        ? persistedRecord.openTabs.map((tab) => tab.articleId)
        : [],
      routeArticleId: new window.URLSearchParams(window.location.search).get('id'),
      selectedArticleId: pinia?._s.get('article')?.selectedArticleId ?? null,
      windowId,
    };
  });
}

async function waitForPersistedLayoutArticle(expectedArticleId, requireRoute = true) {
  let lastState = null;
  try {
    await browser.waitUntil(
      async () => {
        lastState = await readLayoutState();
        return (!requireRoute || lastState.isLoading === false)
          && lastState.persistedReadError === null
          && lastState.persistedActiveArticleId === expectedArticleId
          && lastState.persistedOpenArticleIds.includes(expectedArticleId)
          && (!requireRoute || (
            lastState.routeArticleId === expectedArticleId
            && lastState.selectedArticleId === expectedArticleId
            && lastState.contentArticleId === expectedArticleId
          ));
      },
      {
        timeout: 15_000,
        interval: 200,
        timeoutMsg: `layout persistence never stabilized on ${expectedArticleId}`,
      },
    );
  } catch (error) {
    throw new Error(`layout state for ${expectedArticleId}: ${JSON.stringify(lastState)}`, { cause: error });
  }

  if (requireRoute) {
    await browser.pause(800);
    const stableState = await readLayoutState();
    expect(stableState.persistedActiveArticleId, 'persisted layout remains on the routed article')
      .to.equal(expectedArticleId);
    expect(stableState.persistedOpenArticleIds, 'persisted tabs retain the routed article')
      .to.include(expectedArticleId);
    expect(stableState.routeArticleId, 'route remains stable after layout hydration').to.equal(expectedArticleId);
    expect(stableState.selectedArticleId, 'article selection remains stable after layout hydration')
      .to.equal(expectedArticleId);
    expect(stableState.contentArticleId, 'editor content remains stable after layout hydration')
      .to.equal(expectedArticleId);
  }

  return lastState;
}

async function waitForRouteAfterLayoutHydration(expectedArticleId, previousLayoutArticleId) {
  let lastState = null;
  try {
    await browser.waitUntil(
      async () => {
        lastState = await readLayoutState();
        return lastState.isLoading === false
          && lastState.layoutStoreActiveArticleId === previousLayoutArticleId
          && lastState.routeArticleId === expectedArticleId
          && lastState.selectedArticleId === expectedArticleId
          && lastState.contentArticleId === expectedArticleId;
      },
      {
        timeout: 15_000,
        interval: 200,
        timeoutMsg: `route ${expectedArticleId} did not survive layout hydration`,
      },
    );
  } catch (error) {
    throw new Error(`hydrated route state for ${expectedArticleId}: ${JSON.stringify(lastState)}`, { cause: error });
  }

  await browser.pause(800);
  const stableState = await readLayoutState();
  expect(stableState.routeArticleId, 'route remains stable after loading the older layout record')
    .to.equal(expectedArticleId);
  expect(stableState.selectedArticleId, 'selection remains stable after loading the older layout record')
    .to.equal(expectedArticleId);
  expect(stableState.contentArticleId, 'editor content remains stable after loading the older layout record')
    .to.equal(expectedArticleId);
}

async function waitForCurrentDraftReady(expectedArticleId, expectEmpty = false) {
  let lastState = null;
  try {
    await browser.waitUntil(
      async () => {
        lastState = await browser.execute(() => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const editorStore = pinia?._s.get('editor');
      const articleStore = pinia?._s.get('article');
      const articleId = new window.URLSearchParams(window.location.search).get('id');
      const editor = document.querySelector('.ProseMirror');
      const article = articleStore?.articles?.find((candidate) => candidate.id === articleId);
      return {
        articleId,
        articleRawContent: article?.rawContent ?? null,
        body: editorStore?.currentContent?.body ?? null,
        contentArticleId: editorStore?.currentContent?.articleId ?? null,
        editorHtml: editor?.innerHTML ?? null,
        editorText: editor?.textContent?.trim() ?? null,
        piniaStores: pinia ? Array.from(pinia._s.keys()) : [],
        status: editorStore?.status ?? null,
      };
    });
        return Boolean(
          lastState.articleId === expectedArticleId
          && lastState.editorHtml !== null
          && (lastState.status === 'ready' || lastState.status === 'saving')
          && lastState.contentArticleId === lastState.articleId
          && (!expectEmpty || (
            lastState.articleRawContent?.trim() === ''
            && lastState.body?.trim() === ''
            && lastState.editorText === ''
          )),
        );
      },
      { timeout: 15_000, interval: 200, timeoutMsg: 'selected Workstation draft never reached ready state' },
    );
  } catch (error) {
    throw new Error(`selected Workstation draft state: ${JSON.stringify(lastState)}`, { cause: error });
  }
}

async function selectListEnterBehavior(label, value) {
  await openRoute('/settings?tab=editor', '[data-settings-tab="editor"]');
  const clicked = await browser.execute((buttonLabel) => {
    const section = document.querySelector('[data-settings-tab="editor"]');
    const button = Array.from(section?.querySelectorAll('button') ?? [])
      .find((candidate) => candidate.textContent?.trim() === buttonLabel);
    if (!button) return false;
    button.click();
    return true;
  }, label);
  expect(clicked, `Settings button ${label} exists`).to.equal(true);

  await browser.waitUntil(
    async () => browser.execute((buttonLabel) => {
      const section = document.querySelector('[data-settings-tab="editor"]');
      return Array.from(section?.querySelectorAll('button') ?? [])
        .some((button) => button.textContent?.trim() === buttonLabel && button.classList.contains('selected'));
    }, label),
    {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: `${label} never became selected`,
    },
  );

  await browser.pause(5_200);
  await browser.refresh();
  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="editor"]'))),
    { timeout: 10_000, interval: 200, timeoutMsg: 'Settings Editor did not recover after reload' },
  );

  const persisted = await browser.execute((buttonLabel) => {
    const section = document.querySelector('[data-settings-tab="editor"]');
    const selected = Array.from(section?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent?.trim() === buttonLabel);
    const settings = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}');
    return {
      selected: Boolean(selected?.classList.contains('selected')),
      stored: settings?.editor?.listEnterBehavior ?? null,
    };
  }, label);
  expect(persisted.selected, `${label} remains selected after reload`).to.equal(true);
  expect(persisted.stored, `${label} persists through the settings store`).to.equal(value);
}

async function createBlankDraft(expectedBehavior, previousLayoutArticleId = null) {
  await openRoute('/', '.hub-page');
  if (previousLayoutArticleId) {
    await waitForPersistedLayoutArticle(previousLayoutArticleId, false);
  }
  const hubState = await browser.execute(() => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const persisted = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}');
    return {
      behavior: pinia?._s.get('settings')?.settings?.editor?.listEnterBehavior ?? null,
      href: location.href,
      origin: location.origin,
      persistedBehavior: persisted?.editor?.listEnterBehavior ?? null,
      selectedArticleId: pinia?._s.get('article')?.selectedArticleId ?? null,
    };
  });
  expect(hubState.behavior, 'Hub keeps the selected list Enter behavior in memory').to.equal(expectedBehavior);
  expect(hubState.persistedBehavior, 'Hub keeps the selected list Enter behavior in storage').to.equal(expectedBehavior);
  const clicked = await browser.execute(() => {
    const candidates = [
      ['.recent-create-btn', '空白草稿'],
      ['.hero-empty-btn', '空白开始'],
      ['.empty-create-btn', '新建文章'],
      ['.quick-action-item', '新建空白文档'],
    ];
    const button = candidates
      .map(([selector, label]) => Array.from(document.querySelectorAll(selector))
        .find((candidate) => candidate.textContent?.trim().includes(label) && candidate.offsetParent !== null))
      .find(Boolean);
    if (!button) return null;
    button.click();
    return { className: button.className, text: button.textContent?.trim() ?? '' };
  });
  expect(clicked, 'a visible production new-draft control exists').to.be.an('object');

  await browser.waitUntil(
    async () => browser.execute((oldArticleId) => {
      const articleId = new window.URLSearchParams(window.location.search).get('id');
      return location.pathname === '/workstation'
        && Boolean(articleId)
        && articleId !== oldArticleId
        && Boolean(document.querySelector('.ProseMirror'));
    }, hubState.selectedArticleId),
    { timeout: 15_000, interval: 200, timeoutMsg: 'new draft never opened in Workstation' },
  );
  const articleId = await browser.execute(() => new window.URLSearchParams(window.location.search).get('id'));
  expect(articleId, 'new draft route exposes the created article id').to.be.a('string').and.not.equal('');
  createdArticleIds.add(articleId);
  await waitForCurrentDraftReady(articleId, true);
  if (previousLayoutArticleId) {
    await waitForRouteAfterLayoutHydration(articleId, previousLayoutArticleId);
  }
  return articleId;
}

async function prepareListEnterScenario(expectedBehavior) {
  const editor = await browser.$('.ProseMirror');
  await editor.waitForDisplayed({ timeout: 10_000, interval: 200 });
  await browser.execute((surface) => {
    surface.scrollIntoView({ block: 'center', inline: 'center' });
    surface.focus();
  }, editor);
  await browser.waitUntil(
    async () => browser.execute(() => document.activeElement?.classList.contains('ProseMirror') ?? false),
    { timeout: 5_000, interval: 100, timeoutMsg: 'editor surface did not receive focus' },
  );
  await browser.keys(['Control', 'a']);
  await browser.keys('Backspace');
  await browser.waitUntil(
    async () => browser.execute(() => document.querySelector('.ProseMirror')?.textContent?.trim() === ''),
    { timeout: 5_000, interval: 100, timeoutMsg: 'keyboard clear did not empty the new draft' },
  );
  await browser.keys('-');
  await browser.keys(' ');
  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('.ProseMirror > ul > li'))),
    { timeout: 5_000, interval: 100, timeoutMsg: 'Markdown input rule did not create a bullet list' },
  );
  await browser.keys('parent');
  const beforeEnter = await browser.execute(() => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const surface = document.querySelector('.ProseMirror');
    window.__inkforgeListEnterProbe = null;
    surface?.addEventListener('keydown', (event) => {
      window.__inkforgeListEnterProbe = {
        isComposing: event.isComposing,
        key: event.key,
      };
    }, { capture: true, once: true });
    return {
      settingsBehavior: pinia?._s.get('settings')?.settings?.editor?.listEnterBehavior ?? null,
      storedSettingsBehavior: JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}')
        ?.editor?.listEnterBehavior ?? null,
    };
  });
  expect(beforeEnter.settingsBehavior, 'Workstation uses the selected list Enter behavior')
    .to.equal(expectedBehavior);
  expect(beforeEnter.storedSettingsBehavior, 'Workstation keeps the selected list Enter behavior persisted')
    .to.equal(expectedBehavior);
  await browser.keys('Enter');
  await browser.pause(200);
  const afterSplit = await readListShape();
  const keyEvent = await browser.execute(() => window.__inkforgeListEnterProbe ?? null);
  expect(keyEvent?.key, 'the real keyboard emitted Enter').to.equal('Enter');
  expect(keyEvent?.isComposing, 'the real keyboard event is not an IME composition event').to.equal(false);
  expect(
    afterSplit.topLevelItemCount,
    `Enter produced an unexpected list shape: ${JSON.stringify({ afterSplit, beforeEnter, keyEvent })}`,
  ).to.equal(expectedBehavior === 'notion' ? 2 : 1);

  if (expectedBehavior === 'typora') {
    expect(afterSplit.firstTopLevelItemChildren, 'Typora Enter keeps a second paragraph inside the list item')
      .to.deep.equal(['P', 'P']);
    return;
  }

  await browser.keys('Tab');

  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('.ProseMirror li li'))),
    { timeout: 5_000, interval: 100, timeoutMsg: 'keyboard input did not create an empty nested list item' },
  );
}

async function typeSmartPunctuationInput(input, expectedText) {
  const editor = await browser.$('.ProseMirror');
  await editor.waitForDisplayed({ timeout: 10_000, interval: 200 });
  await browser.execute((surface) => surface.focus(), editor);
  await browser.keys(['Control', 'a']);
  await browser.keys('Backspace');
  await browser.waitUntil(
    async () => browser.execute(() => document.querySelector('.ProseMirror')?.textContent === ''),
    { timeout: 5_000, interval: 100, timeoutMsg: 'smart punctuation test could not clear the editor' },
  );
  for (const character of Array.from(input)) {
    await browser.keys(character);
  }
  let actualText = null;
  try {
    await browser.waitUntil(
      async () => {
        actualText = await browser.execute(() => document.querySelector('.ProseMirror')?.textContent ?? null);
        return actualText === expectedText;
      },
      {
        timeout: 5_000,
        interval: 100,
        timeoutMsg: `smart punctuation input ${JSON.stringify(input)} did not render ${JSON.stringify(expectedText)}`,
      },
    );
  } catch (error) {
    throw new Error(
      `smart punctuation input ${JSON.stringify(input)} expected ${JSON.stringify(expectedText)}, got ${JSON.stringify(actualText)} (${Array.from(actualText ?? '').map(character => character.codePointAt(0)).join(',')})`,
      { cause: error },
    );
  }
  return browser.execute(() => document.querySelector('.ProseMirror')?.textContent ?? null);
}

async function pressConfiguredShortcut(shortcutId, fallback) {
  const binding = await browser.execute((id, defaultBinding) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    return pinia?._s.get('settings')?.settings?.shortcuts?.[id] || defaultBinding;
  }, shortcutId, fallback);
  const aliases = { Ctrl: 'Control', Cmd: 'Meta', Option: 'Alt' };
  const keys = binding.split('+').map((key) => aliases[key] || (key.length === 1 ? key.toLowerCase() : key));
  await browser.keys(keys);
  return binding;
}

async function startSmartPunctuationErrorProbe() {
  await browser.execute(() => {
    const entries = [];
    const stringify = (value) => value instanceof Error ? value.message : String(value);
    const onError = (event) => entries.push(`error:${event.message}`);
    const onRejection = (event) => entries.push(`rejection:${stringify(event.reason)}`);
    const originalConsoleError = console.error;
    console.error = (...args) => {
      entries.push(`console:${args.map(stringify).join(' ')}`);
      originalConsoleError(...args);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.__inkforgeSmartPunctuationErrorProbe = {
      entries,
      onError,
      onRejection,
      originalConsoleError,
    };
  });
}

async function stopSmartPunctuationErrorProbe() {
  return browser.execute(() => {
    const probe = window.__inkforgeSmartPunctuationErrorProbe;
    if (!probe) return [];
    window.removeEventListener('error', probe.onError);
    window.removeEventListener('unhandledrejection', probe.onRejection);
    console.error = probe.originalConsoleError;
    delete window.__inkforgeSmartPunctuationErrorProbe;
    return [...probe.entries];
  });
}

async function readListShape() {
  return browser.execute(() => {
    const editor = document.querySelector('.ProseMirror');
    const listItems = Array.from(editor?.querySelectorAll('li') ?? []);
    const directList = Array.from(editor?.children ?? []).find((child) => (
      child.tagName === 'UL' || child.tagName === 'OL'
    ));
    return {
      directChildren: Array.from(editor?.children ?? []).map((child) => child.tagName),
      listItemDepths: listItems.map((item) => {
        let depth = 0;
        let current = item.parentElement;
        while (current && current !== editor) {
          if (current.tagName === 'UL' || current.tagName === 'OL') depth += 1;
          current = current.parentElement;
        }
        return depth;
      }),
      nestedListCount: editor?.querySelectorAll('li ul, li ol').length ?? 0,
      firstTopLevelItemChildren: directList?.querySelector(':scope > li')
        ? Array.from(directList.querySelector(':scope > li').children).map((child) => child.tagName)
        : [],
      topLevelItemCount: directList
        ? Array.from(directList.children).filter((child) => child.tagName === 'LI').length
        : 0,
      text: editor?.textContent ?? '',
      html: editor?.innerHTML ?? '',
    };
  });
}

async function exerciseNestedListEnter(expectedBehavior, previousLayoutArticleId) {
  const articleId = await createBlankDraft(expectedBehavior, previousLayoutArticleId);
  await prepareListEnterScenario(expectedBehavior);
  const before = await readListShape();
  let after = before;
  if (expectedBehavior === 'notion') {
    await browser.keys('Enter');
    await browser.pause(250);
    after = await readListShape();
    expect(after.html, 'Notion Enter changes the empty nested list structure').to.not.equal(before.html);
  }

  await browser.keys(['Control', 's']);
  await browser.pause(1_000);
  await openRoute('/', '.hub-page');
  await waitForPersistedLayoutArticle(articleId, false);
  await openRoute(`/workstation?id=${articleId}`, '.ProseMirror');
  await waitForCurrentDraftReady(articleId);
  await browser.refresh();
  await waitForCurrentDraftReady(articleId);
  await waitForPersistedLayoutArticle(articleId);
  const reloaded = await readListShape();
  expect(reloaded.directChildren, 'manual save persists the list root shape').to.deep.equal(after.directChildren);
  expect(reloaded.listItemDepths, 'manual save persists list nesting').to.deep.equal(after.listItemDepths);
  expect(reloaded.text, 'manual save persists list text').to.equal(after.text);
  return { articleId, shape: after };
}

async function cleanupCreatedArticles() {
  const ids = Array.from(createdArticleIds);
  if (ids.length === 0) return;

  await openRoute('/', '.hub-page');
  const cleanupRouteId = await browser.execute((articleIds) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const articles = pinia?._s.get('article')?.articles ?? [];
    return articleIds.find((articleId) => articles.some((article) => article.id === articleId)) ?? null;
  }, ids);
  if (cleanupRouteId) {
    await openRoute(`/workstation?id=${cleanupRouteId}`, '.ProseMirror');
    await waitForCurrentDraftReady(cleanupRouteId);
  }

  const result = await browser.execute(async (articleIds) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const articleStore = pinia?._s.get('article');
    const layoutStore = pinia?._s.get('layoutPersistence');
    const tabsStore = pinia?._s.get('workstationTabs');
    if (!articleStore || !layoutStore || !tabsStore) {
      return { error: 'required production stores unavailable', remainingArticleIds: articleIds, statuses: [] };
    }

    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    try {
      const readArticles = () => Promise.all(articleIds.map((articleId) => new Promise((resolve, reject) => {
        const request = database.transaction('articles', 'readonly').objectStore('articles').get(articleId);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error ?? new Error('article cleanup read failed'));
      })));
      const recordsBeforeCleanup = await readArticles();
      for (const [index, articleId] of articleIds.entries()) {
        if (recordsBeforeCleanup[index] && recordsBeforeCleanup[index].status !== 'trashed') {
          await articleStore.deleteArticle(articleId);
        }
      }
      for (const tab of [...tabsStore.tabs]) {
        if (articleIds.includes(tab.articleId)) {
          tabsStore.closeTab(tab.id, { remember: false });
        }
      }

      if (layoutStore.profileId) {
        const openTabs = tabsStore.serializeForLayout();
        await layoutStore.save({
          activeArticleId: tabsStore.activeTab?.articleId ?? null,
          activeTabId: tabsStore.activeTabId,
          openTabs,
          tabOrder: openTabs.map((tab) => tab.id),
        });
      }

      const records = await readArticles();
      return {
        error: null,
        remainingArticleIds: articleStore.articles
          .filter((article) => articleIds.includes(article.id))
          .map((article) => article.id),
        statuses: records.map((record) => record?.status ?? null),
      };
    } finally {
      database.close();
    }
  }, ids);

  expect(result.error, 'cleanup can access the real production stores').to.equal(null);
  expect(result.remainingArticleIds, 'created test drafts leave the active article collection').to.deep.equal([]);
  expect(result.statuses, 'created test drafts are moved through the production trash path')
    .to.deep.equal(ids.map(() => 'trashed'));
  await openRoute('/', '.hub-page');
}

describe('Settings editor preferences in the real Tauri runtime', () => {
  before(async () => {
    await waitForMainWindow();
    await openRoute('/settings?tab=editor', '[data-settings-tab="editor"]');
    originalSettingsStorage = await browser.execute(() => window.localStorage.getItem('inkforge-settings'));
    originalListEnterBehavior = await readListEnterBehavior();
    expect(['notion', 'typora'], 'the original list Enter preference is valid')
      .to.include(originalListEnterBehavior);
    originalSmartPunctuationSettings = (await readSmartPunctuationSettings()).store;
    expect(originalSmartPunctuationSettings?.enabled, 'the original smart punctuation master value is valid')
      .to.be.a('boolean');
    expect(Object.keys(originalSmartPunctuationSettings?.rules ?? {}).sort(), 'the original rule matrix is complete')
      .to.deep.equal(SMART_PUNCTUATION_CASES.map((rule) => rule.id).sort());
  });

  after(async () => {
    const cleanupErrors = [];
    try {
      const currentSettings = (await readSmartPunctuationSettings()).store;
      if (originalSmartPunctuationSettings
        && JSON.stringify(currentSettings) !== JSON.stringify(originalSmartPunctuationSettings)) {
        await applySmartPunctuationSettings(originalSmartPunctuationSettings);
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      const currentBehavior = await readListEnterBehavior();
      if (originalListEnterBehavior && currentBehavior !== originalListEnterBehavior) {
        await selectListEnterBehavior(
          originalListEnterBehavior === 'notion' ? '逐级减缩' : 'Typora 默认',
          originalListEnterBehavior,
        );
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      if (originalSettingsStorage !== undefined) {
        const restoredStorage = await browser.execute((original) => {
          if (original === null) {
            window.localStorage.removeItem('inkforge-settings');
          } else {
            window.localStorage.setItem('inkforge-settings', original);
          }
          return window.localStorage.getItem('inkforge-settings');
        }, originalSettingsStorage);
        expect(restoredStorage, 'Settings cleanup restores the original localStorage value and key presence')
          .to.equal(originalSettingsStorage);
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await cleanupCreatedArticles();
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (cleanupErrors.length > 0) {
      const messages = cleanupErrors.map((error) => error instanceof Error ? error.message : String(error));
      throw new AggregateError(cleanupErrors, `editor settings E2E cleanup failed: ${messages.join(' | ')}`);
    }
  });

  it('persists both list Enter modes and applies distinct nested-list behavior', async () => {
    await selectListEnterBehavior('逐级减缩', 'notion');
    const seedArticleId = await createBlankDraft('notion');
    const notionResult = await exerciseNestedListEnter('notion', seedArticleId);

    await selectListEnterBehavior('Typora 默认', 'typora');
    const typoraResult = await exerciseNestedListEnter('typora', notionResult.articleId);
    const notion = notionResult.shape;
    const typora = typoraResult.shape;

    expect(notion.nestedListCount, 'Notion Enter lifts the empty nested item').to.equal(0);
    expect(notion.topLevelItemCount, 'Notion Enter keeps an empty top-level list item').to.equal(2);
    expect(
      {
        directChildren: typora.directChildren,
        listItemDepths: typora.listItemDepths,
        nestedListCount: typora.nestedListCount,
        topLevelItemCount: typora.topLevelItemCount,
      },
      'Typora mode must remain observably distinct from Notion mode',
    ).to.not.deep.equal({
      directChildren: notion.directChildren,
      listItemDepths: notion.listItemDepths,
      nestedListCount: notion.nestedListCount,
      topLevelItemCount: notion.topLevelItemCount,
    });
  });

  it('persists the smart punctuation matrix and applies every rule through real keyboard input', async () => {
    const allRulesDisabled = Object.fromEntries(SMART_PUNCTUATION_CASES.map((rule) => [rule.id, false]));
    const allRulesEnabled = Object.fromEntries(SMART_PUNCTUATION_CASES.map((rule) => [rule.id, true]));

    await applySmartPunctuationSettings({ enabled: false, rules: allRulesDisabled });
    const listEnterBehavior = await readListEnterBehavior();
    const articleId = await createBlankDraft(listEnterBehavior);
    expect(await typeSmartPunctuationInput('A--', 'A--'), 'master off preserves raw punctuation').to.equal('A--');

    await applySmartPunctuationSettings({ enabled: true, rules: allRulesDisabled });
    await openRoute(`/workstation?id=${articleId}`, '.ProseMirror');
    await waitForCurrentDraftReady(articleId);
    expect(await typeSmartPunctuationInput('A--', 'A--'), 'disabled em dash rule preserves raw punctuation')
      .to.equal('A--');

    await applySmartPunctuationSettings({ enabled: true, rules: allRulesEnabled });
    await openRoute(`/workstation?id=${articleId}`, '.ProseMirror');
    await waitForCurrentDraftReady(articleId);
    await startSmartPunctuationErrorProbe();
    let probeStopped = false;
    try {
      for (const rule of SMART_PUNCTUATION_CASES) {
        expect(
          await typeSmartPunctuationInput(rule.input, rule.expected),
          `${rule.id} transforms through the mounted production editor`,
        ).to.equal(rule.expected);
      }

      const urlInput = 'https://example.test/A--';
      expect(await typeSmartPunctuationInput(urlInput, urlInput), 'URL-like text remains raw').to.equal(urlInput);
      expect(
        await browser.execute(() => document.querySelector('.ProseMirror a') === null),
        'autolink stays disabled for URL-like text',
      ).to.equal(true);

      await typeSmartPunctuationInput('', '');
      for (const character of '``` ') await browser.keys(character);
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('.ProseMirror pre'))),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Markdown code-fence input did not create a code block' },
      );
      for (const character of 'A--') await browser.keys(character);
      expect(
        await browser.execute(() => document.querySelector('.ProseMirror pre')?.textContent ?? null),
        'code block keeps smart punctuation raw',
      ).to.equal('A--');

      const sourceShortcut = await pressConfiguredShortcut('setSourceMode', 'Ctrl+Alt+S');
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('.source-mode-layout .cm-content'))),
        { timeout: 5_000, interval: 100, timeoutMsg: `${sourceShortcut} did not open Source mode` },
      );
      const sourceEditor = await browser.$('.source-mode-layout .cm-content');
      await sourceEditor.click();
      await browser.keys(['Control', 'a']);
      await browser.keys('Backspace');
      for (const character of 'A--') await browser.keys(character);
      expect(
        await browser.execute(() => document.querySelector('.source-mode-layout .cm-content')?.textContent ?? null),
        'Source mode keeps smart punctuation raw',
      ).to.equal('A--');
      await pressConfiguredShortcut('setTyporaMode', 'Ctrl+Alt+T');
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('.editor-mode-shell.mode-typora .ProseMirror'))),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Typora mode did not recover after Source-mode proof' },
      );

      const errors = await stopSmartPunctuationErrorProbe();
      probeStopped = true;
      expect(errors, 'fresh SmartPunctuation browser errors').to.deep.equal([]);
    } finally {
      if (!probeStopped) await stopSmartPunctuationErrorProbe();
    }
    await browser.keys(['Control', 's']);
    await browser.pause(1_000);
  });
});
