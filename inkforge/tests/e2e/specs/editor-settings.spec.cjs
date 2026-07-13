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

const WRITING_GOAL_FIELDS = [
  { key: 'documentTarget', selector: '#writing-goal-document', errorSelector: '#writing-goal-document-error' },
  { key: 'dailyTarget', selector: '#writing-goal-daily', errorSelector: '#writing-goal-daily-error' },
  { key: 'weeklyTarget', selector: '#writing-goal-weekly', errorSelector: '#writing-goal-weekly-error' },
];

const createdArticleIds = new Set();
let originalListEnterBehavior = null;
let originalSmartPunctuationSettings = null;
let originalWritingGoalSettings = null;
let originalDataSettings = null;
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

async function readWritingGoalSettings() {
  return browser.execute((fields) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const storeGoal = pinia?._s.get('settings')?.settings?.writingGoal;
    const persistedGoal = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}')?.writingGoal;
    const normalize = (goal) => Object.fromEntries(fields.map(({ key }) => [key, goal?.[key] ?? null]));
    return {
      store: normalize(storeGoal),
      persisted: normalize(persistedGoal),
      visible: Object.fromEntries(fields.map(({ key, selector }) => [
        key,
        document.querySelector(selector)?.value ?? null,
      ])),
      errors: Object.fromEntries(fields.map(({ key, errorSelector }) => [
        key,
        document.querySelector(errorSelector)?.textContent?.trim() ?? '',
      ])),
      controls: Object.fromEntries(fields.map(({ key, selector }) => {
        const input = document.querySelector(selector);
        return [key, input ? { type: input.type, min: input.min, step: input.step } : null];
      })),
      status: document.querySelector('#writing-goal-section .sv-inline-status')?.textContent?.trim() ?? null,
    };
  }, WRITING_GOAL_FIELDS);
}

async function readDataSettingsAndDiagnostics() {
  return browser.execute(() => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const storeData = pinia?._s.get('settings')?.settings?.data;
    const persistedData = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}')?.data;
    const backupSection = document.querySelector('[data-settings-entry="data.backup"]');
    const storageSection = document.querySelector('[data-settings-entry="data.storage"]');
    const cacheSection = document.querySelector('[data-settings-entry="data.cache"]');
    const normalize = (data) => data ? {
      autoBackup: data.autoBackup,
      backupInterval: data.backupInterval,
      maxBackups: data.maxBackups,
    } : null;
    return {
      store: normalize(storeData),
      persisted: normalize(persistedData),
      visible: {
        autoBackup: backupSection?.querySelector('input[type="checkbox"]')?.checked ?? null,
        backupInterval: backupSection?.querySelector('input[aria-label="备份间隔（分钟）"]')?.value ?? null,
        maxBackups: backupSection?.querySelector('input[aria-label="备份保留数量"]')?.value ?? null,
      },
      manualBackupResult: document.querySelector('#data-manual-backup-result')?.textContent?.trim() ?? '',
      runtimeStatus: document.querySelector('#data-runtime-diagnostics-status')?.textContent?.trim() ?? '',
      diagnostics: {
        storageState: storageSection?.getAttribute('data-storage-state') ?? null,
        storageUsage: Number(storageSection?.getAttribute('data-storage-usage')),
        storageQuota: Number(storageSection?.getAttribute('data-storage-quota')),
        localStorageBytes: Number(storageSection?.getAttribute('data-local-storage-bytes')),
        localStorageKeys: Number(storageSection?.getAttribute('data-local-storage-keys')),
        indexedDbState: storageSection?.getAttribute('data-indexeddb-state') ?? null,
        indexedDbRecords: Number(storageSection?.getAttribute('data-indexeddb-records')),
        indexedDbTables: Number(storageSection?.getAttribute('data-indexeddb-tables')),
        cacheState: cacheSection?.getAttribute('data-cache-state') ?? null,
        cacheBuckets: Number(cacheSection?.getAttribute('data-cache-buckets')),
        serviceWorkerSummary: cacheSection?.getAttribute('data-service-worker-summary') ?? null,
      },
    };
  });
}

async function applyDataBackupSettings(target) {
  await openRoute('/settings?tab=data', '[data-settings-tab="data"]');
  const backupSection = await browser.$('[data-settings-entry="data.backup"]');
  await backupSection.scrollIntoView({ block: 'center', inline: 'nearest' });

  const autoBackupInput = await backupSection.$('input[type="checkbox"]');
  if (await autoBackupInput.isSelected() !== target.autoBackup) {
    await browser.execute((element) => element.click(), autoBackupInput);
  }

  for (const [selector, value] of [
    ['input[aria-label="备份间隔（分钟）"]', target.backupInterval],
    ['input[aria-label="备份保留数量"]', target.maxBackups],
  ]) {
    const input = await backupSection.$(selector);
    await browser.execute((element, nextValue) => {
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
      const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (!valueSetter) throw new Error('native HTMLInputElement value setter is unavailable');
      valueSetter.call(element, nextValue);
      element.dispatchEvent(new window.Event('input', { bubbles: true }));
      element.dispatchEvent(new window.Event('change', { bubbles: true }));
      element.blur();
    }, input, String(value));
  }

  await browser.waitUntil(
    async () => {
      const current = await readDataSettingsAndDiagnostics();
      return JSON.stringify(current.store) === JSON.stringify(target);
    },
    { timeout: 5_000, interval: 100, timeoutMsg: 'Data backup controls did not update the settings store' },
  );

  await browser.pause(5_200);
  await browser.refresh();
  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="data"]'))),
    { timeout: 10_000, interval: 200, timeoutMsg: 'Data settings did not recover after reload' },
  );

  const actual = await readDataSettingsAndDiagnostics();
  expect(actual.store, 'Data backup settings reach the live settings store').to.deep.equal(target);
  expect(actual.persisted, 'Data backup settings survive the real debounced localStorage write')
    .to.deep.equal(target);
  expect(actual.visible, 'Data backup controls recover the persisted values after reload').to.deep.equal({
    autoBackup: target.autoBackup,
    backupInterval: String(target.backupInterval),
    maxBackups: String(target.maxBackups),
  });
}

async function readVersionPersistence(articleId) {
  return browser.execute(async (targetArticleId) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const currentContent = pinia?._s.get('editor')?.currentContent ?? null;
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    let persistedContent;
    try {
      persistedContent = await new Promise((resolve, reject) => {
        const request = database
          .transaction('contents', 'readonly')
          .objectStore('contents')
          .index('articleId')
          .get(targetArticleId);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error ?? new Error('content version read failed'));
      });
    } finally {
      database.close();
    }
    const normalizeVersions = (content) => JSON.parse(JSON.stringify(content?.versions ?? []));
    return {
      storeArticleId: currentContent?.articleId ?? null,
      persistedArticleId: persistedContent?.articleId ?? null,
      storeBody: currentContent?.body ?? null,
      persistedBody: persistedContent?.body ?? null,
      storeCurrentVersionId: currentContent?.currentVersionId ?? null,
      persistedCurrentVersionId: persistedContent?.currentVersionId ?? null,
      storeVersions: normalizeVersions(currentContent),
      persistedVersions: normalizeVersions(persistedContent),
    };
  }, articleId);
}

async function runRealVersionWriteRace(articleId) {
  return browser.execute(async (targetArticleId) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const editorStore = pinia?._s.get('editor');
    const currentContent = editorStore?.currentContent ?? null;
    if (!editorStore || currentContent?.articleId !== targetArticleId) {
      throw new Error('the production editor store does not own the target article');
    }

    const targetVersionId = currentContent.versions[0]?.id;
    if (!targetVersionId) throw new Error('the production draft has no switch target version');
    const prunedVersionId = currentContent.versions.find((version) => (
      version.trigger === 'interval' && version.id !== targetVersionId
    ))?.id;
    if (!prunedVersionId) throw new Error('the production draft has no interval version to prune');

    const bodyRaceSuffix = ' concurrent body save proof';
    const [, intervalVersion, manualVersion] = await Promise.all([
      editorStore.updateContent({ body: `${currentContent.body}${bodyRaceSuffix}` }),
      editorStore.createVersion('interval', '并发自动备份验收'),
      editorStore.createVersion('manual_save', '并发手动备份验收'),
    ]);
    const [companionVersion] = await Promise.all([
      editorStore.createVersion('manual_save', '并发切换伴随备份验收'),
      editorStore.pruneVersions([prunedVersionId]),
      editorStore.switchVersion(targetVersionId),
    ]);
    const createdVersionIds = [intervalVersion, manualVersion, companionVersion]
      .map((version) => version?.id ?? null)
      .filter((id) => typeof id === 'string');

    return { bodyRaceSuffix, createdVersionIds, prunedVersionId, targetVersionId };
  }, articleId);
}

async function runCrossDocumentWriteQueueIsolation(sourceArticleId, targetArticleId) {
  return browser.execute(async (sourceId, targetId) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const editorStore = pinia?._s.get('editor');
    const articleStore = pinia?._s.get('article');
    const sourceContent = editorStore?.currentContent ?? null;
    if (!editorStore || !articleStore || sourceContent?.articleId !== sourceId) {
      throw new Error('the production stores do not own the source article');
    }

    const readPersistedContent = async (articleId) => {
      const database = await new Promise((resolve, reject) => {
        const request = window.indexedDB.open('InkForgeDB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
      });
      try {
        return await new Promise((resolve, reject) => {
          const request = database
            .transaction('contents', 'readonly')
            .objectStore('contents')
            .index('articleId')
            .get(articleId);
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => reject(request.error ?? new Error('cross-document content read failed'));
        });
      } finally {
        database.close();
      }
    };

    const targetBefore = await readPersistedContent(targetId);
    if (!targetBefore) throw new Error('the production target content does not exist');
    const targetArticleBodyBefore = articleStore.articles.find((article) => article.id === targetId)?.rawContent ?? null;

    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const headBody = `${sourceContent.body} queue-head-${stamp}`;
    const queuedBody = `${sourceContent.body} queue-final-${stamp}`;
    const versionLabel = `跨文稿队列隔离 ${stamp}`;
    const headWrite = editorStore.updateContent({ body: headBody });
    const queuedWrite = editorStore.updateContent({ body: queuedBody });
    const queuedVersion = editorStore.createVersion('manual_save', versionLabel);

    articleStore.selectArticle(targetId);
    const [, , createdVersion] = await Promise.all([headWrite, queuedWrite, queuedVersion]);

    const deadline = Date.now() + 10_000;
    while (editorStore.currentContent?.articleId !== targetId && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (editorStore.currentContent?.articleId !== targetId) {
      throw new Error('the production editor store did not switch to the target article');
    }

    const targetLiveBody = editorStore.currentContent.body;
    const targetLiveVersions = [...editorStore.currentContent.versions];
    const targetAfter = await readPersistedContent(targetId);
    const versionId = createdVersion?.id ?? null;
    articleStore.selectArticle(sourceId);
    while (editorStore.currentContent?.articleId !== sourceId && Date.now() < deadline + 10_000) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (editorStore.currentContent?.articleId !== sourceId) {
      throw new Error('the production editor store did not reload the source article');
    }
    const sourceReloadedBody = editorStore.currentContent.body;
    const sourceReloadedVersions = [...editorStore.currentContent.versions];

    articleStore.selectArticle(targetId);
    while (editorStore.currentContent?.articleId !== targetId && Date.now() < deadline + 20_000) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (editorStore.currentContent?.articleId !== targetId) {
      throw new Error('the production editor store did not restore the target article');
    }
    const targetReloadedVersions = [...editorStore.currentContent.versions];
    const targetReloadedCurrentVersionId = editorStore.currentContent.currentVersionId;

    return {
      queuedBody,
      versionId,
      storeArticleId: editorStore.currentContent.articleId,
      liveTargetBody: targetLiveBody,
      targetBodyBefore: targetArticleBodyBefore,
      targetBodyAfter: editorStore.currentContent.body,
      rawTargetBodyUnchanged: JSON.stringify(targetAfter?.body ?? null) === JSON.stringify(targetBefore.body),
      rawTargetVersionsUnchanged: JSON.stringify(targetAfter?.versions ?? [])
        === JSON.stringify(targetBefore.versions ?? []),
      rawTargetCurrentVersionUnchanged: targetAfter?.currentVersionId === targetBefore.currentVersionId,
      targetVersionCountBefore: targetBefore.versions?.length ?? 0,
      targetVersionCountAfter: targetAfter?.versions?.length ?? 0,
      targetReloadedVersionsMatchPersisted: JSON.stringify(targetReloadedVersions)
        === JSON.stringify(targetAfter?.versions ?? []),
      targetReloadedCurrentVersionMatchesPersisted: targetReloadedCurrentVersionId
        === targetAfter?.currentVersionId,
      sourceBodyAfter: sourceReloadedBody,
      sourceVersionMatches: sourceReloadedVersions.filter((version) => version.id === versionId).length,
      targetVersionMatches: targetLiveVersions.filter((version) => version.id === versionId).length,
      targetPersistedVersionMatches: targetAfter?.versions?.filter((version) => version.id === versionId).length ?? 0,
      sourceVersionBody: sourceReloadedVersions.find((version) => version.id === versionId)?.body ?? null,
      sourceVersionLabel: sourceReloadedVersions.find((version) => version.id === versionId)?.label ?? null,
      versionLabel,
    };
  }, sourceArticleId, targetArticleId);
}

async function installDataFaultInjection(mode) {
  return browser.execute((faultMode) => {
    if (window.__INKFORGE_DATA_FAULTS__) {
      throw new Error('data fault injection is already active');
    }

    const restorers = [];
    const override = (target, key, value) => {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      Object.defineProperty(target, key, {
        configurable: true,
        writable: true,
        value,
      });
      restorers.push(() => {
        if (descriptor) Object.defineProperty(target, key, descriptor);
        else delete target[key];
      });
    };

    try {
      if (faultMode === 'backup-write') {
        override(window.IDBObjectStore.prototype, 'put', () => {
          throw new window.DOMException('forced backup write failure', 'QuotaExceededError');
        });
      } else if (faultMode === 'diagnostics') {
        override(window.navigator.storage, 'estimate', () => Promise.reject(new Error('forced storage estimate failure')));
        override(window.caches, 'keys', () => Promise.reject(new Error('forced cache read failure')));
        override(window.IDBObjectStore.prototype, 'count', () => {
          throw new window.DOMException('forced IndexedDB count failure', 'UnknownError');
        });
      } else {
        throw new Error(`unknown data fault mode: ${faultMode}`);
      }
    } catch (error) {
      for (const restore of [...restorers].reverse()) restore();
      throw error;
    }

    window.__INKFORGE_DATA_FAULTS__ = restorers;
    return restorers.length;
  }, mode);
}

async function restoreDataFaultInjection() {
  return browser.execute(() => {
    const restorers = window.__INKFORGE_DATA_FAULTS__ ?? [];
    for (const restore of [...restorers].reverse()) restore();
    delete window.__INKFORGE_DATA_FAULTS__;
    return restorers.length;
  });
}

async function readBrowserStorageTruth() {
  return browser.execute(async () => {
    let localStorageBytes = 0;
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) ?? '';
      const value = window.localStorage.getItem(key) ?? '';
      localStorageBytes += (key.length + value.length) * 2;
    }

    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    let indexedDbRecords = 0;
    let indexedDbTables;
    try {
      const tableNames = Array.from(database.objectStoreNames);
      indexedDbTables = tableNames.length;
      for (const tableName of tableNames) {
        indexedDbRecords += await new Promise((resolve, reject) => {
          const request = database.transaction(tableName, 'readonly').objectStore(tableName).count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error(`${tableName} count failed`));
        });
      }
    } finally {
      database.close();
    }

    const estimate = await window.navigator.storage.estimate();
    const cacheNames = await window.caches.keys();
    const serviceWorkerRegistrations = await window.navigator.serviceWorker.getRegistrations();
    return {
      storageUsage: estimate.usage ?? 0,
      storageQuota: estimate.quota ?? 0,
      localStorageBytes,
      localStorageKeys: window.localStorage.length,
      indexedDbRecords,
      indexedDbTables,
      cacheBuckets: cacheNames.length,
      serviceWorkerSummary: serviceWorkerRegistrations.length > 0
        ? `${serviceWorkerRegistrations.length} 个注册`
        : '未注册 Service Worker',
    };
  });
}

async function applyWritingGoalSettings(target) {
  await openRoute('/settings?tab=editor&section=writing-goal', '#writing-goal-section');
  for (const { key, selector } of WRITING_GOAL_FIELDS) {
    const input = await browser.$(selector);
    await input.scrollIntoView({ block: 'center', inline: 'nearest' });
    await input.waitForDisplayed({ timeout: 5_000, interval: 100 });
    await browser.execute((element) => element.focus(), input);
    await browser.keys(['Control', 'a']);
    await browser.keys('Backspace');
    if (target[key] === null) {
      await browser.execute((element) => element.blur(), input);
    } else {
      for (const character of String(target[key])) await browser.keys(character);
    }
  }

  const enabledCount = Object.values(target).filter((value) => value !== null).length;
  const expectedStatus = enabledCount === 0 ? '未配置' : `已配置 ${enabledCount} 项`;
  await browser.waitUntil(
    async () => (await readWritingGoalSettings()).status === expectedStatus,
    { timeout: 5_000, interval: 100, timeoutMsg: 'writing goal status did not reflect visible inputs' },
  );

  await browser.pause(5_200);
  await browser.refresh();
  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('#writing-goal-section'))),
    { timeout: 10_000, interval: 200, timeoutMsg: 'writing goal settings did not recover after reload' },
  );

  const actual = await readWritingGoalSettings();
  const expectedVisible = Object.fromEntries(WRITING_GOAL_FIELDS.map(({ key }) => [
    key,
    target[key] === null ? '' : String(target[key]),
  ]));
  const expectedControl = Object.fromEntries(WRITING_GOAL_FIELDS.map(({ key }) => [
    key,
    { type: 'number', min: '1', step: '1' },
  ]));
  expect(actual.store, 'writing goal store matches the visible Settings values').to.deep.equal(target);
  expect(actual.persisted, 'writing goals persist through the real debounced settings write').to.deep.equal(target);
  expect(actual.visible, 'writing goal inputs retain their values after reload').to.deep.equal(expectedVisible);
  expect(actual.errors, 'valid writing goals have no validation errors').to.deep.equal({
    documentTarget: '',
    dailyTarget: '',
    weeklyTarget: '',
  });
  expect(actual.controls, 'writing goals use positive integer native controls').to.deep.equal(expectedControl);
  expect(actual.status, 'writing goal status survives reload').to.equal(expectedStatus);
}

async function readHubWritingGoalCard() {
  return browser.execute(() => {
    const label = document.querySelector('.workflow-progress-kicker')?.textContent?.trim() ?? null;
    const summary = document.querySelector('.workflow-progress-copy')?.textContent?.trim() ?? '';
    const percentText = document.querySelector('.workflow-progress-value')?.textContent?.trim() ?? '';
    return {
      label,
      summary,
      percent: Number.parseInt(percentText, 10),
      numbers: (summary.match(/[\d,]+/g) ?? []).map((value) => Number(value.replaceAll(',', ''))),
    };
  });
}

async function readWorkstationGoalPills() {
  return browser.execute(() => Array.from(document.querySelectorAll('.goal-pill')).map((pill) => {
    const title = pill.getAttribute('title') ?? '';
    const numbers = (title.match(/[\d,]+/g) ?? []).map((value) => Number(value.replaceAll(',', '')));
    return {
      label: pill.querySelector('.goal-pill__label')?.textContent?.trim() ?? null,
      title,
      current: numbers[0] ?? null,
      target: numbers[1] ?? null,
      percent: Number.parseInt(pill.querySelector('strong')?.textContent ?? '', 10),
    };
  }));
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
    originalWritingGoalSettings = (await readWritingGoalSettings()).store;
    expect(Object.keys(originalWritingGoalSettings ?? {}).sort(), 'the original writing goal shape is complete')
      .to.deep.equal(WRITING_GOAL_FIELDS.map(({ key }) => key).sort());
    await openRoute('/settings?tab=data', '[data-settings-tab="data"]');
    originalDataSettings = (await readDataSettingsAndDiagnostics()).store;
    expect(originalDataSettings, 'the original Data backup settings are available').to.include.keys(
      'autoBackup',
      'backupInterval',
      'maxBackups',
    );
  });

  after(async () => {
    const cleanupErrors = [];
    try {
      const currentWritingGoal = (await readWritingGoalSettings()).store;
      if (originalWritingGoalSettings
        && JSON.stringify(currentWritingGoal) !== JSON.stringify(originalWritingGoalSettings)) {
        await applyWritingGoalSettings(originalWritingGoalSettings);
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
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
      await openRoute('/settings?tab=data', '[data-settings-tab="data"]');
      const currentDataSettings = (await readDataSettingsAndDiagnostics()).store;
      if (originalDataSettings
        && JSON.stringify(currentDataSettings) !== JSON.stringify(originalDataSettings)) {
        await applyDataBackupSettings(originalDataSettings);
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
      await browser.execute((surface) => surface.focus(), sourceEditor);
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

  it('persists writing goals and reflects real Hub and Workstation progress', async () => {
    const configured = { documentTarget: 10, dailyTarget: 20, weeklyTarget: 100 };
    await applyWritingGoalSettings(configured);

    await startSmartPunctuationErrorProbe();
    let probeStopped = false;
    try {
      await openRoute('/', '.hub-page');
      const dailyBaseline = await readHubWritingGoalCard();
      expect(dailyBaseline.label, 'Hub prioritizes the configured daily goal').to.equal('今日写作目标');
      expect(dailyBaseline.numbers[1], 'Hub renders the configured daily target from real settings').to.equal(20);
      expect(dailyBaseline.numbers, 'daily summary exposes today, target, and weekly counts').to.have.length(3);
      const baselineTodayWords = dailyBaseline.numbers[0];
      const baselineWeeklyWords = dailyBaseline.numbers[2];

      const listEnterBehavior = await readListEnterBehavior();
      const articleId = await createBlankDraft(listEnterBehavior);
      const editor = await browser.$('.ProseMirror');
      await editor.click();
      await browser.keys('alpha beta gamma delta');
      await browser.waitUntil(
        async () => (await readWorkstationGoalPills())
          .some((goal) => goal.label === '文稿' && goal.current === 4 && goal.target === 10 && goal.percent === 40),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Workstation did not update document goal progress' },
      );
      await browser.keys(['Control', 's']);
      const expectedTodayWords = baselineTodayWords + 4;
      const expectedWeeklyWords = baselineWeeklyWords + 4;
      const expectedDailyPercent = Math.max(0, Math.min(100, Math.round((expectedTodayWords / 20) * 100)));
      await browser.waitUntil(
        async () => (await readWorkstationGoalPills())
          .some((goal) => goal.label === '今日'
            && goal.current === expectedTodayWords
            && goal.target === 20
            && goal.percent === expectedDailyPercent),
        { timeout: 10_000, interval: 200, timeoutMsg: 'saved draft did not update daily Workstation progress' },
      );

      const dailyWorkstation = await readWorkstationGoalPills();
      expect(dailyWorkstation, 'Workstation shows real document and daily progress').to.deep.equal([
        { label: '文稿', title: '文稿目标：4 / 10 字', current: 4, target: 10, percent: 40 },
        {
          label: '今日',
          title: `今日目标：${expectedTodayWords} / 20 字`,
          current: expectedTodayWords,
          target: 20,
          percent: expectedDailyPercent,
        },
      ]);

      await openRoute('/', '.hub-page');
      await browser.waitUntil(
        async () => {
          const card = await readHubWritingGoalCard();
          return card.numbers[0] === expectedTodayWords && card.numbers[2] === expectedWeeklyWords;
        },
        { timeout: 10_000, interval: 200, timeoutMsg: 'Hub did not reflect the saved writing totals' },
      );
      const dailyHub = await readHubWritingGoalCard();
      expect(dailyHub.numbers, 'Hub daily summary uses the saved real article').to.deep.equal([
        expectedTodayWords,
        20,
        expectedWeeklyWords,
      ]);
      expect(dailyHub.percent, 'Hub daily percent matches the saved real count').to.equal(expectedDailyPercent);

      const errors = await stopSmartPunctuationErrorProbe();
      probeStopped = true;
      expect(errors, 'fresh daily writing-goal browser errors').to.deep.equal([]);

      await applyWritingGoalSettings({ documentTarget: 10, dailyTarget: null, weeklyTarget: 100 });
      await startSmartPunctuationErrorProbe();
      probeStopped = false;
      await openRoute('/', '.hub-page');
      const weeklyHub = await readHubWritingGoalCard();
      const expectedWeeklyPercent = Math.max(0, Math.min(100, Math.round((expectedWeeklyWords / 100) * 100)));
      expect(weeklyHub.label, 'Hub falls back to the configured weekly goal').to.equal('本周写作目标');
      expect(weeklyHub.numbers, 'Hub weekly summary keeps saved week and day totals').to.deep.equal([
        expectedWeeklyWords,
        100,
        expectedTodayWords,
      ]);
      expect(weeklyHub.percent, 'Hub weekly percent matches the saved real count').to.equal(expectedWeeklyPercent);

      await openRoute(`/workstation?id=${articleId}`, '.ProseMirror');
      await waitForCurrentDraftReady(articleId);
      const weeklyWorkstation = await readWorkstationGoalPills();
      expect(weeklyWorkstation[0], 'Workstation retains the real document progress').to.deep.equal({
        label: '文稿',
        title: '文稿目标：4 / 10 字',
        current: 4,
        target: 10,
        percent: 40,
      });
      expect(weeklyWorkstation[1], 'Workstation falls back to real weekly progress').to.deep.equal({
        label: '本周',
        title: `本周目标：${expectedWeeklyWords} / 100 字`,
        current: expectedWeeklyWords,
        target: 100,
        percent: expectedWeeklyPercent,
      });

      const weeklyErrors = await stopSmartPunctuationErrorProbe();
      probeStopped = true;
      expect(weeklyErrors, 'fresh weekly writing-goal browser errors').to.deep.equal([]);

      await openRoute('/settings?tab=editor&section=writing-goal', '#writing-goal-section');
      const documentInput = await browser.$('#writing-goal-document');
      await documentInput.scrollIntoView({ block: 'center', inline: 'nearest' });
      await documentInput.waitForDisplayed({ timeout: 5_000, interval: 100 });
      await browser.execute((element) => element.focus(), documentInput);
      await browser.keys(['Control', 'a']);
      await browser.keys('-2');
      await browser.waitUntil(
        async () => (await readWritingGoalSettings()).errors.documentTarget === '请输入大于等于 1 的整数',
        { timeout: 5_000, interval: 100, timeoutMsg: 'invalid writing goal did not show validation feedback' },
      );
      await browser.pause(5_200);
      const invalid = await readWritingGoalSettings();
      const expectedPreserved = { documentTarget: 10, dailyTarget: null, weeklyTarget: 100 };
      expect(invalid.store, 'invalid negative goal preserves the live target').to.deep.equal(expectedPreserved);
      expect(invalid.persisted, 'invalid negative goal does not overwrite the persisted target')
        .to.deep.equal(expectedPreserved);
      expect(invalid.visible.documentTarget, 'invalid text remains visible for correction').to.equal('-2');
      expect(invalid.errors.documentTarget, 'invalid goal exposes actionable feedback')
        .to.equal('请输入大于等于 1 的整数');

      await browser.refresh();
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('#writing-goal-section'))),
        { timeout: 10_000, interval: 200, timeoutMsg: 'writing goal settings did not recover after invalid input' },
      );
      const reloaded = await readWritingGoalSettings();
      expect(reloaded.store, 'reload retains the last valid target').to.deep.equal(expectedPreserved);
      expect(reloaded.persisted, 'reload reads the last valid target').to.deep.equal(expectedPreserved);
      expect(reloaded.visible.documentTarget, 'reload restores the last valid visible value').to.equal('10');
      expect(reloaded.errors.documentTarget, 'validation feedback clears after reload').to.equal('');
    } finally {
      if (!probeStopped) await stopSmartPunctuationErrorProbe();
    }
  });

  it('persists Data backup settings, writes real versions, and reports real storage diagnostics', async function () {
    this.timeout(300_000);
    const configured = { autoBackup: true, backupInterval: 1, maxBackups: 2 };
    await applyDataBackupSettings(configured);

    const listEnterBehavior = await readListEnterBehavior();
    const articleId = await createBlankDraft(listEnterBehavior);
    const proofBody = 'InkForge real auto backup proof';
    const editor = await browser.$('.ProseMirror');
    await browser.execute((surface) => surface.focus(), editor);
    for (const character of proofBody) await browser.keys(character);
    await browser.waitUntil(
      async () => browser.execute((expected) => {
        const root = document.getElementById('app');
        const provides = root?.__vue_app__?._context?.provides;
        const pinia = provides
          ? Object.getOwnPropertySymbols(provides)
            .map((symbol) => provides[symbol])
            .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
          : null;
        return pinia?._s.get('editor')?.currentContent?.body?.includes(expected) ?? false;
      }, proofBody),
      { timeout: 5_000, interval: 100, timeoutMsg: 'the real editor body did not receive the backup proof text' },
    );

    let automaticVersionState = null;
    await browser.waitUntil(
      async () => {
        automaticVersionState = await readVersionPersistence(articleId);
        const stored = automaticVersionState.storeVersions.find((version) => (
          version.trigger === 'interval' && version.body.includes(proofBody)
        ));
        const persisted = stored
          ? automaticVersionState.persistedVersions.find((version) => version.id === stored.id)
          : null;
        return Boolean(stored && persisted?.body.includes(proofBody));
      },
      {
        timeout: 75_000,
        interval: 500,
        timeoutMsg: 'the configured one-minute automatic backup never reached IndexedDB',
      },
    );
    expect(automaticVersionState.storeArticleId, 'the auto snapshot belongs to the active production draft')
      .to.equal(articleId);
    expect(automaticVersionState.persistedArticleId, 'the auto snapshot reached the production contents table')
      .to.equal(articleId);

    const liveAutomaticVersions = automaticVersionState.storeVersions.filter((version) => (
      version.trigger === 'interval' && version.body.includes(proofBody)
    ));
    const persistedAutomaticVersions = automaticVersionState.persistedVersions.filter((version) => (
      version.trigger === 'interval' && version.body.includes(proofBody)
    ));
    expect(liveAutomaticVersions, 'the configured timer creates exactly one matching live snapshot')
      .to.have.length(1);
    expect(persistedAutomaticVersions, 'the configured timer creates exactly one matching persisted snapshot')
      .to.have.length(1);
    expect(persistedAutomaticVersions[0], 'the same automatic snapshot id and payload reach IndexedDB')
      .to.deep.equal(liveAutomaticVersions[0]);

    const routeFlushSuffix = ' immediate route flush proof';
    await browser.execute((surface) => surface.focus(), editor);
    for (const character of routeFlushSuffix) await browser.keys(character);

    expect(await installDataFaultInjection('backup-write'), 'route failure injection replaces one browser API')
      .to.equal(1);
    try {
      await browser.execute(() => {
        window.history.pushState({}, '', '/settings?tab=data');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await browser.waitUntil(
        async () => browser.execute(() => (
          location.pathname === '/workstation'
          && document.querySelector('.status-pill.error')?.textContent?.trim() === '保存失败'
        )),
        { timeout: 10_000, interval: 100, timeoutMsg: 'failed editor persistence did not block route leave visibly' },
      );
      const blockedRoute = await browser.execute(() => ({
        path: location.pathname,
        status: document.querySelector('.status-pill.error')?.textContent?.trim() ?? '',
      }));
      expect(blockedRoute, 'a failed route flush keeps the real Workstation visible').to.deep.equal({
        path: '/workstation',
        status: '保存失败',
      });
    } finally {
      await restoreDataFaultInjection();
    }

    await openRoute('/settings?tab=data', '[data-settings-tab="data"]');
    const beforeManual = await readVersionPersistence(articleId);
    expect(beforeManual.storeBody, 'route leave flushes the latest DOM body into the live editor store')
      .to.include(routeFlushSuffix.trim());
    const backupButton = await browser.$('[data-data-action="create-backup"]');
    await backupButton.scrollIntoView({ block: 'center', inline: 'nearest' });
    expect(await backupButton.isEnabled(), 'an open real draft enables immediate backup').to.equal(true);

    expect(await installDataFaultInjection('backup-write'), 'backup failure injection replaces one browser API')
      .to.equal(1);
    try {
      await backupButton.click();
      await browser.waitUntil(
        async () => (await readDataSettingsAndDiagnostics()).manualBackupResult.startsWith('创建备份失败：'),
        { timeout: 10_000, interval: 100, timeoutMsg: 'immediate backup did not surface the real IndexedDB write failure' },
      );
      const afterFailedManual = await readVersionPersistence(articleId);
      expect(afterFailedManual.storeVersions, 'a failed backup adds no live version')
        .to.have.length(beforeManual.storeVersions.length);
      expect(afterFailedManual.persistedVersions, 'a failed backup adds no persisted version')
        .to.have.length(beforeManual.persistedVersions.length);
    } finally {
      await restoreDataFaultInjection();
    }

    await backupButton.click();
    await browser.waitUntil(
      async () => (await readDataSettingsAndDiagnostics()).manualBackupResult.startsWith('已创建备份：'),
      { timeout: 10_000, interval: 100, timeoutMsg: 'immediate backup did not report a persisted success' },
    );

    const afterManual = await readVersionPersistence(articleId);
    expect(afterManual.storeVersions.length, 'immediate backup adds exactly one live version')
      .to.equal(beforeManual.storeVersions.length + 1);
    expect(afterManual.persistedVersions.length, 'immediate backup adds exactly one persisted version')
      .to.equal(beforeManual.persistedVersions.length + 1);
    const manualVersion = afterManual.storeVersions.at(-1);
    expect(manualVersion?.trigger, 'immediate backup uses the manual_save trigger').to.equal('manual_save');
    expect(manualVersion?.body, 'immediate backup captures the active real editor body').to.include(proofBody);
    expect(manualVersion?.body, 'immediate backup captures text typed immediately before route leave')
      .to.include(routeFlushSuffix.trim());
    expect(
      afterManual.persistedVersions.find((version) => version.id === manualVersion?.id),
      'the exact immediate-backup version id and payload exist in IndexedDB',
    ).to.deep.equal(manualVersion);

    const refreshButton = await browser.$('[data-data-action="refresh-diagnostics"]');
    await refreshButton.scrollIntoView({ block: 'center', inline: 'nearest' });

    expect(await installDataFaultInjection('diagnostics'), 'diagnostic failure injection replaces three browser APIs')
      .to.equal(3);
    try {
      await refreshButton.click();
      await browser.waitUntil(
        async () => {
          const current = await readDataSettingsAndDiagnostics();
          return current.runtimeStatus.startsWith('部分诊断不可用：')
            && current.diagnostics.storageState === 'limited'
            && current.diagnostics.indexedDbState === 'error'
            && current.diagnostics.cacheState === 'error';
        },
        { timeout: 15_000, interval: 200, timeoutMsg: 'runtime diagnostics did not expose the injected failure states' },
      );
    } finally {
      await restoreDataFaultInjection();
    }

    await refreshButton.click();
    await browser.waitUntil(
      async () => {
        const current = await readDataSettingsAndDiagnostics();
        return current.runtimeStatus === '诊断已刷新'
          && current.diagnostics.storageState === 'ready'
          && current.diagnostics.indexedDbState === 'ready'
          && ['ready', 'empty'].includes(current.diagnostics.cacheState);
      },
      { timeout: 15_000, interval: 200, timeoutMsg: 'runtime storage diagnostics did not reach a complete state' },
    );

    const diagnostics = (await readDataSettingsAndDiagnostics()).diagnostics;
    const truth = await readBrowserStorageTruth();
    expect(diagnostics.localStorageBytes, 'LocalStorage bytes match a direct key/value traversal')
      .to.equal(truth.localStorageBytes);
    expect(diagnostics.localStorageKeys, 'LocalStorage key count matches the browser API')
      .to.equal(truth.localStorageKeys);
    expect(diagnostics.indexedDbRecords, 'IndexedDB records match direct counts across every object store')
      .to.equal(truth.indexedDbRecords);
    expect(diagnostics.indexedDbTables, 'IndexedDB table count matches objectStoreNames')
      .to.equal(truth.indexedDbTables);
    expect(diagnostics.cacheBuckets, 'Cache bucket count matches Cache Storage')
      .to.equal(truth.cacheBuckets);
    expect(diagnostics.serviceWorkerSummary, 'Service Worker summary matches real registrations')
      .to.equal(truth.serviceWorkerSummary);
    expect(diagnostics.storageQuota, 'Storage quota matches a direct StorageManager estimate')
      .to.equal(truth.storageQuota);
    expect(Math.abs(diagnostics.storageUsage - truth.storageUsage), 'Storage usage remains stable across adjacent reads')
      .to.be.lessThan(65_536);

    const beforeUnmountWindow = await readVersionPersistence(articleId);
    await browser.pause(65_000);
    const afterUnmountWindow = await readVersionPersistence(articleId);
    expect(afterUnmountWindow.storeVersions, 'Workstation unmount stops live automatic snapshots')
      .to.have.length(beforeUnmountWindow.storeVersions.length);
    expect(afterUnmountWindow.persistedVersions, 'Workstation unmount stops persisted automatic snapshots')
      .to.have.length(beforeUnmountWindow.persistedVersions.length);

    const race = await runRealVersionWriteRace(articleId);
    expect(race.createdVersionIds, 'all concurrent production version writes resolve with real ids')
      .to.have.length(3);
    const racePersistence = await readVersionPersistence(articleId);
    for (const versionId of race.createdVersionIds) {
      expect(
        racePersistence.storeVersions.filter((version) => version.id === versionId),
        `concurrent version ${versionId} exists exactly once in the live store`,
      ).to.have.length(1);
      expect(
        racePersistence.persistedVersions.filter((version) => version.id === versionId),
        `concurrent version ${versionId} exists exactly once in IndexedDB`,
      ).to.have.length(1);
      expect(
        racePersistence.storeVersions.find((version) => version.id === versionId)?.body,
        `concurrent version ${versionId} captures the serialized body save`,
      ).to.include(race.bodyRaceSuffix.trim());
    }
    expect(racePersistence.storeVersions.some((version) => version.id === race.prunedVersionId),
      'queued automatic pruning removes the overflow version from the live store').to.equal(false);
    expect(racePersistence.persistedVersions.some((version) => version.id === race.prunedVersionId),
      'queued automatic pruning removes the overflow version from IndexedDB').to.equal(false);
    expect(racePersistence.persistedVersions, 'concurrent version arrays remain identical across Pinia and IndexedDB')
      .to.deep.equal(racePersistence.storeVersions);
    expect(racePersistence.persistedBody, 'concurrent body state remains identical across Pinia and IndexedDB')
      .to.equal(racePersistence.storeBody);
    expect(racePersistence.persistedCurrentVersionId, 'concurrent currentVersionId remains identical across boundaries')
      .to.equal(racePersistence.storeCurrentVersionId);
    expect(racePersistence.storeCurrentVersionId, 'the serialized version switch wins after the companion write')
      .to.equal(race.targetVersionId);

    const isolationArticleId = await createBlankDraft(listEnterBehavior);
    const isolation = await runCrossDocumentWriteQueueIsolation(isolationArticleId, articleId);
    expect(isolation.versionId, 'the queued source-document version resolves with a real id')
      .to.be.a('string').and.not.equal('');
    expect(isolation.storeArticleId, 'the production editor finishes on the selected target document')
      .to.equal(articleId);
    expect(isolation.sourceBodyAfter, 'the queued source body is persisted to its captured document')
      .to.equal(isolation.queuedBody);
    expect(isolation.sourceVersionMatches, 'the queued source version exists exactly once on the source document')
      .to.equal(1);
    expect(isolation.sourceVersionBody, 'the queued source version captures the final queued body')
      .to.equal(isolation.queuedBody);
    expect(isolation.sourceVersionLabel, 'the queued source version keeps its requested label')
      .to.equal(isolation.versionLabel);
    expect(isolation.targetVersionMatches, 'the source version id never leaks into the selected target document')
      .to.equal(0);
    expect(isolation.targetPersistedVersionMatches, 'the source version id never leaks into target IndexedDB state')
      .to.equal(0);
    expect(isolation.targetBodyAfter, 'the queued source payload never overwrites the target document')
      .to.equal(isolation.targetBodyBefore);
    expect(isolation.liveTargetBody, 'the live target body remains equal to its persisted content')
      .to.equal(isolation.targetBodyBefore);
    expect(isolation.rawTargetBodyUnchanged, 'the target IndexedDB body remains byte-for-byte equivalent')
      .to.equal(true);
    expect(isolation.rawTargetVersionsUnchanged, 'the complete target IndexedDB version array remains unchanged')
      .to.equal(true);
    expect(isolation.rawTargetCurrentVersionUnchanged, 'the target IndexedDB currentVersionId remains unchanged')
      .to.equal(true);
    expect(isolation.targetVersionCountAfter, 'the queued source version never changes target retention state')
      .to.equal(isolation.targetVersionCountBefore);
    expect(isolation.targetReloadedVersionsMatchPersisted, 'the reloaded target versions equal IndexedDB exactly')
      .to.equal(true);
    expect(
      isolation.targetReloadedCurrentVersionMatchesPersisted,
      'the reloaded target currentVersionId equals IndexedDB exactly',
    ).to.equal(true);

  });
});
