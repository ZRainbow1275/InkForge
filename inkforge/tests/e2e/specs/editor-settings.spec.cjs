/**
 * editor-settings.spec.cjs — proves Settings editor preferences against the
 * real Tauri WebView2 shell and a draft created through the production UI.
 */
/* global after */
const { expect } = require('chai');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

const ABOUT_FEATURE_FLAG_KEYS = [
  'markdown-hints',
  'multi-tab',
  'ai-autocomplete',
  'performance-metrics',
];

const createdArticleIds = new Set();
const createdCategoryIds = new Set();
const createdTagIds = new Set();
let originalListEnterBehavior = null;
let originalSmartPunctuationSettings = null;
let originalWritingGoalSettings = null;
let originalDataSettings = null;

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
    async () => browser.execute((selector) => {
      const element = document.querySelector(selector);
      const routeShell = element?.closest('.app-route-shell');
      const routeShellOpacity = routeShell
        ? Number.parseFloat(window.getComputedStyle(routeShell).opacity)
        : 1;
      return Boolean(
        element
        && element.getClientRects().length > 0
        && window.getComputedStyle(element).visibility !== 'hidden'
        && !document.querySelector('.view-fade-enter-active, .view-fade-leave-active')
        && routeShellOpacity >= 0.999
      );
    }, readySelector),
    {
      timeout: 10_000,
      interval: 50,
      timeoutMsg: `${target} did not display ${readySelector} after route transition`,
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
    const articleBody = pinia?._s.get('article')?.articles
      ?.find((article) => article.id === targetArticleId)?.rawContent ?? null;
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    let persistedContents;
    try {
      persistedContents = await new Promise((resolve, reject) => {
        const request = database
          .transaction('contents', 'readonly')
          .objectStore('contents')
          .index('articleId')
          .getAll(targetArticleId);
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error ?? new Error('content version read failed'));
      });
    } finally {
      database.close();
    }
    const persistedContent = persistedContents[0] ?? null;
    const readBodyFormat = (body) => {
      if (typeof body === 'string') return 'plain';
      if (body === null || body === undefined) return 'missing';
      if (
        typeof body !== 'object'
        || typeof body.data !== 'string'
        || body.data.length === 0
      ) {
        return 'invalid';
      }
      if (body.__encrypted === true && body.version === 2) return 'encrypted-v2';
      if (body.__encrypted === false && body.version === 0) return 'unencrypted-v0';
      return 'invalid';
    };
    const persistedBodyFormat = readBodyFormat(persistedContent?.body);
    const normalizeVersions = (content) => JSON.parse(JSON.stringify(content?.versions ?? []));
    return {
      storeArticleId: currentContent?.articleId ?? null,
      persistedArticleId: persistedContent?.articleId ?? null,
      persistedContentCount: persistedContents.length,
      persistedRecords: persistedContents.map((content) => ({
        id: content.id,
        bodyFormat: readBodyFormat(content.body),
        updatedAt: content.updatedAt instanceof Date
          ? content.updatedAt.toISOString()
          : String(content.updatedAt ?? ''),
      })),
      storeBody: currentContent?.body ?? null,
      articleBody,
      persistedBodyFormat,
      persistedBodyEncrypted: persistedBodyFormat === 'encrypted-v2',
      storeCurrentVersionId: currentContent?.currentVersionId ?? null,
      persistedCurrentVersionId: persistedContent?.currentVersionId ?? null,
      storeVersions: normalizeVersions(currentContent),
      persistedVersions: normalizeVersions(persistedContent),
    };
  }, articleId);
}

async function withContentWriteTransactionLock(operation) {
  const acquired = await browser.execute(async () => {
    if (window.__INKFORGE_CONTENT_WRITE_LOCK__) {
      throw new Error('content write transaction lock is already active');
    }

    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    let resolveReady;
    let resolveDone;
    const state = {
      release: false,
      error: null,
      ready: new Promise((resolve) => { resolveReady = resolve; }),
      done: new Promise((resolve) => { resolveDone = resolve; }),
    };
    let ready = false;
    let finished = false;
    const finish = (error = null) => {
      if (finished) return;
      finished = true;
      state.error = error ? String(error.message ?? error) : state.error;
      if (!ready) {
        ready = true;
        resolveReady(false);
      }
      resolveDone();
      database.close();
    };

    const transaction = database.transaction('contents', 'readwrite');
    const store = transaction.objectStore('contents');
    const keepAlive = () => {
      const request = store.get('__inkforge-e2e-write-lock__');
      request.onsuccess = () => {
        if (!ready) {
          ready = true;
          resolveReady(true);
        }
        if (!state.release) keepAlive();
      };
      request.onerror = () => {
        state.error = request.error?.message ?? 'content write lock request failed';
      };
    };
    transaction.oncomplete = () => finish();
    transaction.onabort = () => finish(transaction.error ?? new Error('content write lock aborted'));
    transaction.onerror = () => {
      state.error = transaction.error?.message ?? 'content write lock failed';
    };
    window.__INKFORGE_CONTENT_WRITE_LOCK__ = state;
    keepAlive();

    const lockAcquired = await state.ready;
    if (!lockAcquired) {
      await state.done;
      delete window.__INKFORGE_CONTENT_WRITE_LOCK__;
      throw new Error(state.error ?? 'content write lock was not acquired');
    }
    return true;
  });
  expect(acquired, 'a real IndexedDB write transaction holds the first save open').to.equal(true);

  try {
    return await operation();
  } finally {
    const released = await browser.execute(async () => {
      const state = window.__INKFORGE_CONTENT_WRITE_LOCK__;
      if (!state) return false;
      state.release = true;
      await state.done;
      const error = state.error;
      delete window.__INKFORGE_CONTENT_WRITE_LOCK__;
      if (error) throw new Error(error);
      return true;
    });
    expect(released, 'the real IndexedDB write transaction is released').to.equal(true);
  }
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

async function installRouteRejection(routeName, articleId = null) {
  return browser.execute((targetRouteName, targetArticleId) => {
    if (window.__INKFORGE_ROUTE_REJECTION__) {
      throw new Error('route rejection is already active');
    }

    const router = document.getElementById('app')
      ?.__vue_app__?._context?.config?.globalProperties?.$router;
    if (!router || typeof router.beforeEach !== 'function') {
      return false;
    }

    const state = { count: 0, remove: null };
    state.remove = router.beforeEach((to) => {
      const routeMatches = to.name === targetRouteName;
      const articleMatches = targetArticleId === null
        || String(Array.isArray(to.query.id) ? to.query.id[0] : to.query.id ?? '') === targetArticleId;
      if (routeMatches && articleMatches) {
        state.count += 1;
        return false;
      }
      return true;
    });
    window.__INKFORGE_ROUTE_REJECTION__ = state;
    return true;
  }, routeName, articleId);
}

async function waitForRouteRejection() {
  await browser.waitUntil(
    async () => browser.execute(() => (window.__INKFORGE_ROUTE_REJECTION__?.count ?? 0) > 0),
    { timeout: 5_000, interval: 100, timeoutMsg: 'the real Vue Router guard did not reject the target navigation' },
  );
}

async function restoreRouteRejection() {
  return browser.execute(() => {
    const state = window.__INKFORGE_ROUTE_REJECTION__;
    state?.remove?.();
    delete window.__INKFORGE_ROUTE_REJECTION__;
    return state?.count ?? 0;
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
      const editorStyle = editor ? window.getComputedStyle(editor) : null;
      return {
        articleId,
        articleRawContent: article?.rawContent ?? null,
        body: editorStore?.currentContent?.body ?? null,
        contentArticleId: editorStore?.currentContent?.articleId ?? null,
        editorHtml: editor?.innerHTML ?? null,
        editorVisible: Boolean(
          editor
          && editor.getClientRects().length > 0
          && editorStyle?.display !== 'none'
          && editorStyle?.visibility !== 'hidden'
        ),
        editorText: editor?.textContent?.trim() ?? null,
        headerSaveState: document.querySelector('.status-pill')?.getAttribute('data-save-state') ?? null,
        piniaStores: pinia ? Array.from(pinia._s.keys()) : [],
        status: editorStore?.status ?? null,
      };
    });
        return Boolean(
          lastState.articleId === expectedArticleId
          && lastState.editorHtml !== null
          && lastState.editorVisible
          && lastState.headerSaveState === 'clean'
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
    throw new Error(`selected Workstation draft ${expectedArticleId} state: ${JSON.stringify(lastState)}`, { cause: error });
  }
}

async function focusEditorAtDocumentEnd(editor, evidenceLabel) {
  try {
    await browser.waitUntil(
      async () => browser.execute((surface) => {
        const style = window.getComputedStyle(surface);
        return surface.getClientRects().length > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden';
      }, editor),
      { timeout: 10_000, interval: 100, timeoutMsg: `${evidenceLabel} editor did not become visible` },
    );
    await browser.execute((surface) => {
      surface.scrollIntoView({ block: 'center', inline: 'center' });
      surface.focus();
    }, editor);
    await browser.waitUntil(
      async () => browser.execute((surface) => document.activeElement === surface, editor),
      { timeout: 5_000, interval: 100, timeoutMsg: `${evidenceLabel} editor did not receive focus` },
    );
    await browser.keys(['Control', 'End']);
  } catch (error) {
    const state = await browser.execute(() => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const editor = document.querySelector('.ProseMirror');
      const shell = document.querySelector('.editor-mode-shell');
      return {
        articleId: new window.URLSearchParams(location.search).get('id'),
        contentArticleId: pinia?._s.get('editor')?.currentContent?.articleId ?? null,
        editorRectCount: editor?.getClientRects().length ?? 0,
        editorStatus: pinia?._s.get('editor')?.status ?? null,
        shellDisplay: shell ? window.getComputedStyle(shell).display : null,
      };
    });
    throw new Error(`${evidenceLabel} editor focus state: ${JSON.stringify(state)}`, { cause: error });
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

async function createBlankDraftThroughHub() {
  await openRoute('/', '.hub-page');
  const previousArticleId = await browser.execute(() => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    return pinia?._s.get('article')?.selectedArticleId ?? null;
  });
  const selectors = ['.recent-create-btn', '.hero-empty-btn', '.empty-create-btn', '.quick-action-item'];
  await browser.waitUntil(
    async () => {
      for (const selector of selectors) {
        const candidates = await browser.$$(selector);
        for (const candidate of candidates) {
          if (await candidate.isDisplayed()) return true;
        }
      }
      return false;
    },
    { timeout: 10_000, interval: 200, timeoutMsg: 'Hub did not render a visible production new-draft control' },
  );
  let createButton = null;
  for (const selector of selectors) {
    const candidates = await browser.$$(selector);
    for (const candidate of candidates) {
      if (await candidate.isDisplayed()) {
        createButton = candidate;
        break;
      }
    }
    if (createButton) break;
  }
  expect(createButton, 'Hub exposes a visible production new-draft control').to.not.equal(null);
  await createButton.scrollIntoView({ block: 'center', inline: 'nearest' });
  await createButton.waitForClickable({ timeout: 5_000 });
  const createButtonFocused = await browser.execute((element) => {
    element.focus();
    return document.activeElement === element;
  }, createButton);
  expect(createButtonFocused, 'Hub new-draft control accepts keyboard focus').to.equal(true);
  await browser.keys('Enter');

  await browser.waitUntil(
    async () => browser.execute((oldArticleId) => {
      const articleId = new window.URLSearchParams(window.location.search).get('id');
      return location.pathname === '/workstation'
        && Boolean(articleId)
        && articleId !== oldArticleId
        && Boolean(document.querySelector('.ProseMirror'));
    }, previousArticleId),
    { timeout: 15_000, interval: 200, timeoutMsg: 'native Hub draft action did not open a new Workstation article' },
  );
  const articleId = await browser.execute(() => new window.URLSearchParams(window.location.search).get('id'));
  expect(articleId, 'native Hub draft route exposes the created article id').to.be.a('string').and.not.equal('');
  createdArticleIds.add(articleId);
  await waitForCurrentDraftReady(articleId, true);
  return articleId;
}

async function activateWorkstationTabThroughNumberShortcut(articleId) {
  const shortcutIndex = await browser.execute((targetId) => (
    Array.from(document.querySelectorAll('.workstation-tabbar [data-tab-id]'))
      .findIndex((tab) => tab.getAttribute('data-tab-id') === targetId)
  ), articleId);
  expect(shortcutIndex, `the real tab ${articleId} is available for number-shortcut activation`).to.be.at.least(0);
  expect(shortcutIndex, `the real tab ${articleId} fits the supported Ctrl+1..Ctrl+9 range`).to.be.below(9);

  const visibleTab = await browser.$(`[role="tab"][data-tab-id="${articleId}"]`);
  await visibleTab.waitForDisplayed({ timeout: 5_000 });
  await browser.execute((element) => element.focus(), visibleTab);
  await browser.keys(['Control', String(shortcutIndex + 1)]);
  await browser.waitUntil(
    async () => browser.execute((expectedId) => (
      new window.URLSearchParams(location.search).get('id') === expectedId
      && document.querySelector(`[data-tab-id="${expectedId}"]`)?.getAttribute('aria-selected') === 'true'
    ), articleId),
    { timeout: 10_000, interval: 100, timeoutMsg: `Ctrl+${shortcutIndex + 1} did not activate ${articleId}` },
  );
}

async function closeWorkstationTabThroughShortcut(articleId) {
  const tabExists = await browser.execute((targetId) => Boolean(
    document.querySelector(`.workstation-tabbar [data-tab-id="${targetId}"]`),
  ), articleId);
  if (!tabExists) return;

  const tabIsPinned = await browser.execute((targetId) => (
    document.querySelector(`[data-tab-item-id="${targetId}"]`)
      ?.classList.contains('workstation-tabbar__tab--pinned') ?? false
  ), articleId);
  if (tabIsPinned) {
    const pinButton = await browser.$(
      `[data-tab-item-id="${articleId}"] .workstation-tabbar__pin`,
    );
    await pinButton.click();
    await browser.waitUntil(
      async () => browser.execute((targetId) => !document.querySelector(
        `[data-tab-item-id="${targetId}"]`,
      )?.classList.contains('workstation-tabbar__tab--pinned'), articleId),
      { timeout: 5_000, interval: 100, timeoutMsg: `Could not unpin ${articleId} before cleanup` },
    );
  }

  await activateWorkstationTabThroughNumberShortcut(articleId);
  await browser.keys(['Control', 'w']);
  await browser.waitUntil(
    async () => browser.execute((closedId) => !document.querySelector(
      `.workstation-tabbar [data-tab-id="${closedId}"]`,
    ), articleId),
    { timeout: 10_000, interval: 100, timeoutMsg: `Ctrl+W did not close ${articleId}` },
  );
}

async function preparePersistedLayoutRestoreFixture(targetArticleId) {
  const fixture = await browser.execute(async (articleId) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const articleStore = pinia?._s.get('article');
    const profileStore = pinia?._s.get('profile');
    const layoutStore = pinia?._s.get('layoutPersistence');
    const targetArticle = articleStore?.articles.find((article) => article.id === articleId);
    const originalProfileId = profileStore?.activeProfileId ?? null;
    const windowId = window.sessionStorage.getItem('inkforge.layout.windowId');

    if (!articleStore || !profileStore || !layoutStore || !targetArticle || !originalProfileId || !windowId) {
      return {
        error: 'required production store, target article, active profile, or layout window is unavailable',
        fixtureProfileId: null,
        originalProfileId,
        windowId,
      };
    }

    const fixtureProfileId = `e2e-layout-${window.crypto.randomUUID()}`;
    await layoutStore.save({
      activeArticleId: targetArticle.id,
      activeTabId: targetArticle.id,
      openTabs: [{
        id: targetArticle.id,
        articleId: targetArticle.id,
        title: targetArticle.title,
        isPinned: false,
      }],
      tabOrder: [targetArticle.id],
    }, fixtureProfileId, windowId);
    await layoutStore.initialize(originalProfileId, windowId);

    return {
      error: null,
      fixtureProfileId,
      originalProfileId,
      windowId,
    };
  }, targetArticleId);

  expect(fixture.error, 'the real layout repository accepts the isolated restore record').to.equal(null);
  expect(fixture.fixtureProfileId, 'the isolated layout restore has a profile id').to.be.a('string');
  expect(fixture.originalProfileId, 'the active production profile can be restored').to.be.a('string');
  expect(fixture.windowId, 'the production layout window id is available').to.be.a('string');
  return fixture;
}

async function cleanupPersistedLayoutRestoreFixture(fixture, sourceArticleId) {
  const cleanup = await browser.execute(async ({ fixtureProfileId, originalProfileId, windowId, articleId }) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const articleStore = pinia?._s.get('article');
    const profileStore = pinia?._s.get('profile');
    const layoutStore = pinia?._s.get('layoutPersistence');
    const tabsStore = pinia?._s.get('workstationTabs');
    const router = root?.__vue_app__?._context?.config?.globalProperties?.$router;

    if (!articleStore || !profileStore || !layoutStore || !tabsStore || !router) {
      return { error: 'required production store or router is unavailable' };
    }

    await layoutStore.clear(fixtureProfileId, windowId);
    profileStore.$patch({ activeProfileId: originalProfileId });
    tabsStore.activateTab(articleId);
    articleStore.selectArticle(articleId);
    const query = { ...router.currentRoute.value.query, id: articleId };
    const failure = await router.replace({ name: 'Workstation', query });
    const routeArticleId = String(
      Array.isArray(router.currentRoute.value.query.id)
        ? router.currentRoute.value.query.id[0]
        : router.currentRoute.value.query.id ?? '',
    );
    const routeRestored = router.currentRoute.value.name === 'Workstation'
      && routeArticleId === articleId;
    return {
      error: failure && !routeRestored ? failure.message || 'source route was not restored' : null,
      activeProfileId: profileStore.activeProfileId,
    };
  }, {
    fixtureProfileId: fixture.fixtureProfileId,
    originalProfileId: fixture.originalProfileId,
    windowId: fixture.windowId,
    articleId: sourceArticleId,
  });

  expect(cleanup.error, 'layout restore cleanup returns to the source route').to.equal(null);
  expect(cleanup.activeProfileId, 'layout restore cleanup restores the production profile')
    .to.equal(fixture.originalProfileId);
  await waitForCurrentDraftReady(sourceArticleId);
  await browser.waitUntil(
    async () => browser.execute((profileId) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const layoutStore = pinia?._s.get('layoutPersistence');
      return layoutStore?.profileId === profileId && layoutStore?.isLoading === false;
    }, fixture.originalProfileId),
    { timeout: 10_000, interval: 100, timeoutMsg: 'layout restore cleanup did not reload the production profile' },
  );
}

async function readWorkstationTabSessionTruth() {
  return browser.execute(() => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const tabsStore = pinia?._s.get('workstationTabs');
    const persisted = JSON.parse(window.sessionStorage.getItem('inkforge.workstation.tabs.v1') || 'null');
    const tabPanel = document.getElementById('workstation-document-panel');
    return {
      domTabIds: Array.from(document.querySelectorAll('.workstation-tabbar [role="tab"][data-tab-id]'))
        .map((tab) => tab.getAttribute('data-tab-id')),
      domActiveTabId: document.querySelector('.workstation-tabbar [role="tab"][aria-selected="true"]')
        ?.getAttribute('data-tab-id') ?? null,
      storeTabIds: (tabsStore?.orderedTabs ?? []).map((tab) => tab.id),
      storeActiveTabId: tabsStore?.activeTabId ?? null,
      storeRecentlyClosedIds: (tabsStore?.recentlyClosed ?? []).map((tab) => tab.id),
      persistedTabIds: Array.isArray(persisted?.tabs) ? persisted.tabs.map((tab) => tab.id) : [],
      persistedActiveTabId: persisted?.activeTabId ?? null,
      persistedRecentlyClosedIds: Array.isArray(persisted?.recentlyClosed)
        ? persisted.recentlyClosed.map((tab) => tab.id)
        : [],
      routeArticleId: new window.URLSearchParams(location.search).get('id'),
      selectedArticleId: pinia?._s.get('article')?.selectedArticleId ?? null,
      tabPanelId: tabPanel?.id ?? null,
      tabPanelLabelledBy: tabPanel?.getAttribute('aria-labelledby') ?? null,
      tabPanelRole: tabPanel?.getAttribute('role') ?? null,
      nestedTabActionCount: document.querySelectorAll('[role="tab"] button').length,
    };
  });
}

async function readWorkstationFailureTruth(articleId, marker) {
  return browser.execute((expectedArticleId, expectedMarker) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const editorStore = pinia?._s.get('editor');
    const expectedTab = document.querySelector(`[data-tab-id="${expectedArticleId}"]`);
    const header = document.querySelector('.status-pill');
    return {
      contentArticleId: editorStore?.currentContent?.articleId ?? null,
      editorContainsMarker: document.querySelector('.ProseMirror')?.textContent?.includes(expectedMarker) ?? false,
      editorStatus: editorStore?.status ?? null,
      headerSaved: header?.classList.contains('saved') ?? null,
      headerState: header?.getAttribute('data-save-state') ?? null,
      headerText: header?.textContent?.trim() ?? '',
      routeArticleId: new window.URLSearchParams(location.search).get('id'),
      selectedArticleId: pinia?._s.get('article')?.selectedArticleId ?? null,
      selectedTab: document.querySelector('[role="tab"][aria-selected="true"]')
        ?.getAttribute('data-tab-id') ?? null,
      tabLabel: expectedTab?.getAttribute('aria-label') ?? '',
      tabState: expectedTab?.getAttribute('data-save-state') ?? null,
    };
  }, articleId, marker);
}

function assertWorkstationFailureTruth(truth, articleId, evidenceLabel) {
  expect(truth.routeArticleId, `${evidenceLabel} keeps the original route`).to.equal(articleId);
  expect(truth.selectedArticleId, `${evidenceLabel} keeps the original article selection`).to.equal(articleId);
  expect(truth.contentArticleId, `${evidenceLabel} keeps the original editor content`).to.equal(articleId);
  expect(truth.selectedTab, `${evidenceLabel} keeps the original active tab`).to.equal(articleId);
  expect(truth.editorContainsMarker, `${evidenceLabel} keeps the visible unsaved input`).to.equal(true);
  expect(truth.editorStatus, `${evidenceLabel} exposes the Store failure`).to.equal('error');
  expect(truth.headerState, `${evidenceLabel} exposes the Header failure`).to.equal('error');
  expect(truth.headerText, `${evidenceLabel} names the Header failure`).to.equal('保存失败');
  expect(truth.headerSaved, `${evidenceLabel} never applies Saved styling`).to.equal(false);
  expect(truth.tabState, `${evidenceLabel} exposes the active tab failure`).to.equal('error');
  expect(truth.tabLabel, `${evidenceLabel} never claims Saved`).to.not.include(' - Saved');
}

async function activateWorkstationTabThroughRovingKey(sourceArticleId, key, targetArticleId, expectEmpty = false) {
  const sourceTab = await browser.$(`[role="tab"][data-tab-id="${sourceArticleId}"]`);
  await sourceTab.waitForDisplayed({ timeout: 5_000 });
  await browser.execute((element) => element.focus(), sourceTab);
  await browser.keys(key);
  await browser.waitUntil(
    async () => browser.execute((expectedId) => {
      const activeTab = document.querySelector(`[role="tab"][data-tab-id="${expectedId}"]`);
      return new window.URLSearchParams(location.search).get('id') === expectedId
        && activeTab?.getAttribute('aria-selected') === 'true'
        && document.activeElement === activeTab;
    }, targetArticleId),
    { timeout: 10_000, interval: 100, timeoutMsg: `${key} did not focus and activate ${targetArticleId}` },
  );
  await waitForCurrentDraftReady(targetArticleId, expectEmpty);
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

  await openRoute('/workstation', '.workstation');
  await openRoute('/', '.hub-page');
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
      for (const closedTab of [...tabsStore.recentlyClosed]) {
        if (!articleIds.includes(closedTab.articleId)) continue;
        tabsStore.openOrRefreshTab({
          articleId: closedTab.articleId,
          title: closedTab.title,
          docType: closedTab.docType,
        });
        tabsStore.closeTab(closedTab.id, { remember: false });
      }
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
      const persistedTabs = JSON.parse(
        window.sessionStorage.getItem('inkforge.workstation.tabs.v1') || 'null',
      );
      return {
        error: null,
        remainingArticleIds: articleStore.articles
          .filter((article) => articleIds.includes(article.id))
          .map((article) => article.id),
        statuses: records.map((record) => record?.status ?? null),
        liveRecentlyClosedArticleIds: tabsStore.recentlyClosed
          .filter((tab) => articleIds.includes(tab.articleId))
          .map((tab) => tab.articleId),
        persistedRecentlyClosedArticleIds: Array.isArray(persistedTabs?.recentlyClosed)
          ? persistedTabs.recentlyClosed
            .filter((tab) => articleIds.includes(tab.articleId))
            .map((tab) => tab.articleId)
          : [],
      };
    } finally {
      database.close();
    }
  }, ids);

  expect(result.error, 'cleanup can access the real production stores').to.equal(null);
  expect(result.remainingArticleIds, 'created test drafts leave the active article collection').to.deep.equal([]);
  expect(result.statuses, 'created test drafts are moved through the production trash path')
    .to.deep.equal(ids.map(() => 'trashed'));
  expect(result.liveRecentlyClosedArticleIds, 'cleanup removes created drafts from the live restore queue')
    .to.deep.equal([]);
  expect(result.persistedRecentlyClosedArticleIds, 'cleanup removes created drafts from the persisted restore queue')
    .to.deep.equal([]);
  await openRoute('/', '.hub-page');
}

async function readCategoryRelation(categoryId, articleId = null) {
  return browser.execute(async (targetCategoryId, targetArticleId) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const categoryStore = pinia?._s.get('category');
    const articleStore = pinia?._s.get('article');
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    const readRecord = (storeName, key) => {
      if (!key) return Promise.resolve(null);
      return new Promise((resolve, reject) => {
        const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error ?? new Error(`${storeName} read failed`));
      });
    };
    const serializeCategory = (category) => category ? {
      id: category.id,
      name: category.name,
    } : null;
    const serializeArticle = (article) => article ? {
      id: article.id,
      categoryId: article.categoryId ?? null,
    } : null;

    try {
      const [persistedCategory, persistedArticle] = await Promise.all([
        readRecord('categories', targetCategoryId),
        readRecord('articles', targetArticleId),
      ]);
      return {
        storesReady: Boolean(categoryStore && articleStore),
        store: {
          category: serializeCategory(categoryStore?.categories?.find((category) => category.id === targetCategoryId)),
          article: serializeArticle(articleStore?.articles?.find((article) => article.id === targetArticleId)),
        },
        persisted: {
          category: serializeCategory(persistedCategory),
          article: serializeArticle(persistedArticle),
        },
      };
    } finally {
      database.close();
    }
  }, categoryId, articleId);
}

async function cleanupCreatedCategories() {
  const ids = Array.from(createdCategoryIds);
  if (ids.length === 0) return;

  await openRoute('/', '.hub-page');
  const result = await browser.execute(async (categoryIds) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const categoryStore = pinia?._s.get('category');
    const articleStore = pinia?._s.get('article');
    if (!categoryStore || !articleStore) {
      return { error: 'required production stores unavailable', remainingCategoryIds: categoryIds, remainingArticleIds: [] };
    }

    try {
      const categoryArticleIds = articleStore.articles
        .filter((article) => categoryIds.includes(article.categoryId))
        .map((article) => article.id);
      for (const articleId of categoryArticleIds) {
        const article = articleStore.articles.find((candidate) => candidate.id === articleId);
        if (article && article.status !== 'trashed') await articleStore.deleteArticle(articleId);
      }
      for (const categoryId of categoryIds) {
        if (categoryStore.categories.some((category) => category.id === categoryId)) {
          await categoryStore.deleteCategory(categoryId);
        }
      }
      return {
        error: null,
        remainingCategoryIds: categoryStore.categories
          .filter((category) => categoryIds.includes(category.id))
          .map((category) => category.id),
        remainingArticleIds: articleStore.articles
          .filter((article) => categoryIds.includes(article.categoryId))
          .map((article) => article.id),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        remainingCategoryIds: categoryStore.categories
          .filter((category) => categoryIds.includes(category.id))
          .map((category) => category.id),
        remainingArticleIds: articleStore.articles
          .filter((article) => categoryIds.includes(article.categoryId))
          .map((article) => article.id),
      };
    }
  }, ids);

  expect(result.error, 'category cleanup can access the real production stores').to.equal(null);
  expect(result.remainingArticleIds, 'articles left under created categories are deleted through production actions')
    .to.deep.equal([]);
  expect(result.remainingCategoryIds, 'created categories leave the active category collection').to.deep.equal([]);
  await openRoute('/', '.hub-page');
}

async function readTagPersistence(articleId, tagIds) {
  return browser.execute(async (targetArticleId, targetTagIds) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const tagStore = pinia?._s.get('tags');
    const articleStore = pinia?._s.get('article');
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    const requestValue = (request, message) => new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(message));
    });
    const serializeTag = (tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      docCount: tag.docCount,
    });

    try {
      const transaction = database.transaction(['tags', 'docTags', 'articles'], 'readonly');
      const [persistedTags, persistedRelations, persistedArticle] = await Promise.all([
        requestValue(transaction.objectStore('tags').getAll(), 'tag rows read failed'),
        requestValue(transaction.objectStore('docTags').getAll(), 'docTags rows read failed'),
        requestValue(transaction.objectStore('articles').get(targetArticleId), 'article tag mirror read failed'),
      ]);
      const ids = new Set(targetTagIds);
      const byId = (left, right) => left.id.localeCompare(right.id);
      return {
        storesReady: Boolean(tagStore && articleStore),
        store: {
          tags: (tagStore?.tags ?? []).filter(tag => ids.has(tag.id)).map(serializeTag).sort(byId),
          docTagIds: (tagStore?.docTagsByDocId?.[targetArticleId] ?? [])
            .filter(tag => ids.has(tag.id))
            .map(tag => tag.id)
            .sort(),
          articleTags: [...(articleStore?.articles?.find(article => article.id === targetArticleId)?.tags ?? [])].sort(),
        },
        persisted: {
          tags: persistedTags.filter(tag => ids.has(tag.id)).map(serializeTag).sort(byId),
          docTagIds: persistedRelations
            .filter(relation => relation.docId === targetArticleId && ids.has(relation.tagId))
            .map(relation => relation.tagId)
            .sort(),
          articleTags: [...(persistedArticle?.tags ?? [])].sort(),
        },
      };
    } finally {
      database.close();
    }
  }, articleId, tagIds);
}

async function createVisibleTag(articleId, name) {
  const query = await browser.$('[data-tag-query]');
  await query.waitForDisplayed({ timeout: 10_000 });
  await query.setValue(name);
  const createButton = await browser.$('[data-tag-create]');
  await createButton.waitForClickable({ timeout: 5_000 });
  await createButton.click();

  let tagId = null;
  await browser.waitUntil(
    async () => {
      tagId = await browser.execute((targetArticleId, expectedName) => {
        const root = document.getElementById('app');
        const provides = root?.__vue_app__?._context?.provides;
        const pinia = provides
          ? Object.getOwnPropertySymbols(provides)
            .map((symbol) => provides[symbol])
            .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
          : null;
        const store = pinia?._s.get('tags');
        const tag = store?.tags.find(candidate => candidate.name === expectedName);
        return tag && store.docTagsByDocId[targetArticleId]?.some(candidate => candidate.id === tag.id)
          ? tag.id
          : null;
      }, articleId, name);
      return typeof tagId === 'string' && tagId.length > 0;
    },
    { timeout: 10_000, interval: 100, timeoutMsg: `visible tag creation did not assign ${name} to the real article` },
  );
  createdTagIds.add(tagId);
  await browser.waitUntil(
    async () => (await (await browser.$('[data-tag-query]')).getValue()) === '',
    { timeout: 5_000, interval: 100, timeoutMsg: 'successful tag creation did not clear the visible query' },
  );
  return tagId;
}

async function cleanupCreatedTags() {
  const ids = Array.from(createdTagIds);
  if (ids.length === 0) return;

  await openRoute('/workstation?manager=tags', '[data-tag-browser]');
  const result = await browser.execute(async (tagIds) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const tagStore = pinia?._s.get('tags');
    if (!tagStore) return { error: 'production tag store unavailable', remainingTagIds: tagIds };

    try {
      await tagStore.loadTags();
      for (const tagId of tagIds) {
        if (tagStore.tags.some(tag => tag.id === tagId)) await tagStore.deleteTag(tagId);
      }
      return {
        error: null,
        remainingTagIds: tagStore.tags.filter(tag => tagIds.includes(tag.id)).map(tag => tag.id),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        remainingTagIds: tagStore.tags.filter(tag => tagIds.includes(tag.id)).map(tag => tag.id),
      };
    }
  }, ids);

  expect(result.error, 'tag cleanup can access the real production tag store').to.equal(null);
  expect(result.remainingTagIds, 'run-created tags leave the production store through tag actions').to.deep.equal([]);
  createdTagIds.clear();
}

async function openCategoryContextMenu(categoryId) {
  const rowSelector = `[data-file-category-id="${categoryId}"]`;
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const categoryRow = await browser.$(rowSelector);
    await categoryRow.waitForExist({ timeout: 10_000 });
    await categoryRow.scrollIntoView({ block: 'center', inline: 'nearest' });
    await categoryRow.waitForDisplayed({ timeout: 5_000 });
    const point = await browser.execute((selector) => {
      const row = document.querySelector(selector);
      if (!row) return null;
      const rect = row.getBoundingClientRect();
      const x = Math.round(rect.left + Math.min(12, rect.width / 2));
      const y = Math.round(rect.top + rect.height / 2);
      const hit = document.elementFromPoint(x, y);
      if (!hit || hit.closest(selector) !== row) return null;
      return { x, y };
    }, rowSelector);

    if (!point) {
      lastError = new Error('category row does not expose an unobscured viewport point');
      continue;
    }

    await browser.action('pointer', { parameters: { pointerType: 'mouse' } })
      .move({ duration: 0, x: point.x, y: point.y })
      .pause(100)
      .down({ button: 2 })
      .pause(50)
      .up({ button: 2 })
      .perform();

    try {
      await (await browser.$('[data-category-action="new-article"]')).waitForDisplayed({ timeout: 2_500 });
      return;
    } catch (error) {
      lastError = error;
      await browser.keys('Escape');
    }
  }

  throw lastError ?? new Error('category context menu did not open after two native right clicks');
}

async function readExtensionRegistryEvidence(extensionId) {
  return browser.execute(async (targetExtensionId) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const extensionStore = pinia?._s.get('extensions');
    const liveRecord = extensionStore?.records?.find((record) => record.extensionId === targetExtensionId) ?? null;
    const row = Array.from(document.querySelectorAll('[data-extension-id]'))
      .find((element) => element.getAttribute('data-extension-id') === targetExtensionId);
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    const readAll = (storeName) => new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`${storeName} read failed`));
    });

    try {
      const [extensionRows, storageRows, auditRows] = await Promise.all([
        readAll('extensions'),
        readAll('extensionStorage'),
        readAll('auditLogs'),
      ]);
      const persistedRecord = extensionRows.find((record) => record.extensionId === targetExtensionId) ?? null;
      return {
        installedCount: extensionStore?.installedCount ?? null,
        enabledCount: extensionStore?.enabledCount ?? null,
        blockedCount: extensionStore?.blockedCount ?? null,
        live: liveRecord ? {
          id: liveRecord.id,
          profileId: liveRecord.profileId,
          extensionId: liveRecord.extensionId,
          status: liveRecord.status,
          enabled: liveRecord.enabled,
          grantedPermissions: [...liveRecord.grantedPermissions],
          commandPermissions: [...liveRecord.commandPermissions],
          runtimeBlockedReason: liveRecord.runtimeBlockedReason ?? null,
        } : null,
        persisted: persistedRecord ? {
          id: persistedRecord.id,
          profileId: persistedRecord.profileId,
          extensionId: persistedRecord.extensionId,
          status: persistedRecord.status,
          enabled: persistedRecord.enabled,
          grantedPermissions: [...persistedRecord.grantedPermissions],
          commandPermissions: [...persistedRecord.commandPermissions],
          runtimeBlockedReason: persistedRecord.runtimeBlockedReason ?? null,
        } : null,
        storageCount: storageRows.filter((record) => record.extensionId === targetExtensionId).length,
        auditActions: auditRows
          .filter((record) => record.resourceId === targetExtensionId)
          .map((record) => ({ action: record.action, outcome: record.outcome })),
        ui: row ? {
          text: row.textContent?.replace(/\s+/gu, ' ').trim() ?? '',
          permissionChips: Array.from(row.querySelectorAll('.sv-chip-btn__label'))
            .map((element) => element.textContent?.trim() ?? ''),
        } : null,
      };
    } finally {
      database.close();
    }
  }, extensionId);
}

async function cleanupExtension(extensionId) {
  return browser.execute(async (targetExtensionId) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const extensionStore = pinia?._s.get('extensions');
    if (!extensionStore) {
      return { error: 'extension store unavailable', removed: false };
    }
    const record = extensionStore.records.find((candidate) => candidate.extensionId === targetExtensionId);
    if (!record) {
      return { error: null, removed: false };
    }
    try {
      await extensionStore.uninstallExtension(record.profileId, record.extensionId, record.profileId);
      return { error: null, removed: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error), removed: false };
    }
  }, extensionId);
}

async function readShortcutRegistryEvidence(shortcutIds) {
  return browser.execute((targetShortcutIds) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const storeShortcuts = pinia?._s.get('settings')?.settings?.shortcuts ?? {};
    const persistedShortcuts = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}')?.shortcuts ?? {};
    const visible = Object.fromEntries(targetShortcutIds.map((shortcutId) => {
      const trigger = document.querySelector(`[data-shortcut-id="${shortcutId}"]`);
      return [shortcutId, trigger ? {
        binding: Array.from(trigger.querySelectorAll('kbd')).map((element) => element.textContent?.trim() ?? '').join('+'),
        ariaLabel: trigger.getAttribute('aria-label'),
        conflict: trigger.closest('.shortcut-input')?.querySelector('.shortcut-input__message')?.textContent?.trim() ?? '',
      } : null];
    }));
    return {
      store: Object.fromEntries(targetShortcutIds.map((shortcutId) => [shortcutId, storeShortcuts[shortcutId] ?? null])),
      persisted: Object.fromEntries(targetShortcutIds.map((shortcutId) => [shortcutId, persistedShortcuts[shortcutId] ?? null])),
      allStore: { ...storeShortcuts },
      visible,
      duplicateText: document.querySelector('.sv-shortcut-conflict')?.textContent?.replace(/\s+/gu, ' ').trim() ?? '',
      visibleItemCount: document.querySelectorAll('[data-settings-tab="shortcuts"] .sv-shortcut-item').length,
      searchAriaLabel: document.querySelector('input[aria-label="搜索快捷键"]')?.getAttribute('aria-label') ?? null,
    };
  }, shortcutIds);
}

async function beginShortcutRecording(shortcutId) {
  const trigger = await browser.$(`[data-shortcut-id="${shortcutId}"]`);
  await trigger.scrollIntoView({ block: 'center', inline: 'nearest' });
  await trigger.click();
  await browser.waitUntil(
    async () => browser.execute((element) => (
      document.activeElement === element
      && element.classList.contains('shortcut-input__trigger--recording')
    ), trigger),
    { timeout: 5_000, interval: 100, timeoutMsg: `${shortcutId} recorder did not enter focused recording mode` },
  );
  return trigger;
}

async function sendShortcutBinding(binding) {
  const aliases = { Ctrl: 'Control', Cmd: 'Meta', Option: 'Alt' };
  await browser.keys(binding.split('+').map((key) => aliases[key] || (key.length === 1 ? key.toLowerCase() : key)));
}

async function recordShortcut(shortcutId, binding) {
  await beginShortcutRecording(shortcutId);
  await sendShortcutBinding(binding);
}

async function exerciseNativeWindowFocusLoss(shortcutId) {
  const trigger = await beginShortcutRecording(shortcutId);
  const mainWindowHandle = await browser.getWindowHandle();
  const minimizeButton = await browser.$('button[aria-label="最小化"]');
  await minimizeButton.waitForClickable({ timeout: 5_000 });
  await minimizeButton.click();
  let recordingWhileMinimized = null;
  let focusLossError = null;
  let restoreError = null;
  try {
    await browser.waitUntil(
      async () => {
        recordingWhileMinimized = await browser.execute((element) => ({
          documentHasFocus: document.hasFocus(),
          documentVisibility: document.visibilityState,
          recording: element.classList.contains('shortcut-input__trigger--recording'),
        }), trigger);
        return !recordingWhileMinimized.recording;
      },
      { timeout: 5_000, interval: 100, timeoutMsg: 'the real Tauri minimize control did not disarm recording' },
    );
  } catch (error) {
    focusLossError = error;
  } finally {
    await browser.pause(300);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await browser.maximizeWindow();
        await browser.switchToWindow(mainWindowHandle);
        await (await browser.$('.ink-titlebar')).click();
        restoreError = null;
        break;
      } catch (error) {
        restoreError = error;
        await browser.pause(300);
      }
    }
  }
  if (restoreError) {
    throw new Error('Tauri window could not be restored after native minimize', {
      cause: restoreError,
    });
  }
  await browser.waitUntil(
    async () => browser.execute(() => document.hasFocus()),
    { timeout: 5_000, interval: 100, timeoutMsg: 'Tauri window did not regain focus after native restore' },
  );
  if (focusLossError) {
    throw new Error(`native minimize focus-loss state: ${JSON.stringify(recordingWhileMinimized)}`, {
      cause: focusLossError,
    });
  }
  return recordingWhileMinimized;
}

async function clickShortcutReset(shortcutId) {
  const clicked = await browser.execute((targetShortcutId) => {
    const trigger = document.querySelector(`[data-shortcut-id="${targetShortcutId}"]`);
    const resetButton = Array.from(trigger?.closest('.sv-shortcut-item')?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent?.trim() === '重置');
    resetButton?.click();
    return Boolean(resetButton);
  }, shortcutId);
  expect(clicked, `the ${shortcutId} row exposes its real reset action`).to.equal(true);
}

async function setCheckboxThroughUi(selector, checked) {
  const input = await browser.$(selector);
  const track = await browser.$(`${selector} + .sv-switch-track`);
  await track.scrollIntoView({ block: 'center', inline: 'nearest' });
  if ((await input.isSelected()) !== checked) {
    await track.click();
  }
  await browser.waitUntil(
    async () => (await input.isSelected()) === checked,
    { timeout: 5_000, interval: 100, timeoutMsg: `${selector} did not reach checked=${checked}` },
  );
}

async function confirmSettingsAction(verificationWord) {
  const verification = await browser.$('.sv-confirm-verify input');
  await verification.waitForDisplayed({ timeout: 5_000 });
  await verification.scrollIntoView({ block: 'center', inline: 'nearest' });
  await browser.execute((element) => element.focus(), verification);
  await browser.waitUntil(
    () => browser.execute((element) => document.activeElement === element, verification),
    {
      timeout: 5_000,
      timeoutMsg: 'Settings confirmation input did not receive keyboard focus',
    },
  );
  await browser.keys(['Control', 'a']);
  await browser.keys(verificationWord);
  await browser.waitUntil(async () => (await verification.getValue()) === verificationWord, {
    timeout: 5_000,
    timeoutMsg: `Settings confirmation input did not contain ${verificationWord}`,
  });
  const confirm = await browser.$('.sv-confirm-ok');
  await confirm.waitForEnabled({ timeout: 5_000 });
  await confirm.click();
}

async function activateSettingsImport() {
  const button = await browser.$('[data-settings-action="import"]');
  await button.waitForDisplayed({ timeout: 5_000 });
  await browser.execute((element) => {
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    element.focus();
  }, button);
  await browser.waitUntil(
    async () => browser.execute(() => document.activeElement?.matches('[data-settings-action="import"]') ?? false),
    { timeout: 5_000, interval: 100, timeoutMsg: 'Settings import action did not receive focus' },
  );
  await browser.keys('Enter');
}

async function readSettingsTransferEvidence() {
  return browser.execute(() => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const settingsStore = pinia?._s.get('settings');
    const live = settingsStore?.settings;
    const persisted = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}');
    const normalizeSnapshots = (source) => (source ?? []).map((snapshot) => ({
      id: snapshot.id,
      reason: snapshot.reason,
      schemaVersion: snapshot.schemaVersion,
    }));
    const normalizeExportHistory = (source) => (source ?? []).map((entry) => ({
      id: entry.id,
      title: entry.title,
      bytes: entry.bytes,
      action: entry.action,
    }));
    const dataTab = document.querySelector('[data-settings-tab="data"]');
    const feedback = Array.from(dataTab?.querySelectorAll('.sv-feedback') ?? [])
      .find((element) => element.getClientRects().length > 0);
    const importInput = document.querySelector('[data-settings-import-input]');

    return {
      exportedJson: typeof settingsStore?.exportSettings === 'function'
        ? settingsStore.exportSettings()
        : null,
      store: {
        schemaVersion: live?.schemaVersion ?? null,
        reducedMotion: live?.appearance?.reducedMotion ?? null,
        snapshots: normalizeSnapshots(live?.advanced?.migrationSnapshots),
        exportHistory: normalizeExportHistory(live?.export?.exportHistory),
      },
      persisted: {
        schemaVersion: persisted?.schemaVersion ?? null,
        reducedMotion: persisted?.appearance?.reducedMotion ?? null,
        snapshots: normalizeSnapshots(persisted?.advanced?.migrationSnapshots),
        exportHistory: normalizeExportHistory(persisted?.export?.exportHistory),
      },
      ui: {
        importInputExists: Boolean(importInput),
        importInputAccept: importInput?.getAttribute('accept') ?? null,
        importInputAriaHidden: importInput?.getAttribute('aria-hidden') ?? null,
        importInputTabIndex: importInput?.tabIndex ?? null,
        importPickerClickCount: window.__inkforgeSettingsImportPickerClicks ?? 0,
        importValueCleared: importInput?.value === '',
        feedbackText: feedback?.textContent?.trim() ?? '',
        feedbackType: feedback?.classList.contains('error')
          ? 'error'
          : feedback?.classList.contains('success') ? 'success' : null,
        reducedMotionChecked: document.querySelector('input[aria-label="减弱动效"]')?.checked ?? null,
      },
    };
  });
}

async function readAboutSettingsEvidence() {
  return browser.execute(async (featureFlagKeys) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const settingsStore = pinia?._s.get('settings');
    const performanceStore = pinia?._s.get('performance');
    const ftueStore = pinia?._s.get('ftue');
    const liveSettings = settingsStore?.settings;
    const persistedSettings = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}');
    const clone = (source) => source == null ? null : JSON.parse(JSON.stringify(source));
    const normalizeFlags = (source) => Object.fromEntries(
      featureFlagKeys.map((key) => [key, source?.[key] ?? null]),
    );
    const normalizeProxy = (source) => ({
      enabled: source?.enabled ?? null,
      protocol: source?.protocol ?? null,
      host: source?.host ?? null,
      port: source?.port ?? null,
      username: source?.username ?? null,
      password: source?.password ?? null,
    });
    const normalizeSnapshots = (source) => (source ?? []).map((snapshot) => ({
      id: snapshot.id,
      reason: snapshot.reason,
      schemaVersion: snapshot.schemaVersion,
    }));
    const normalizeSupport = (source) => (source ?? []).map((item) => ({
      key: item.key,
      label: item.label,
      supportState: item.supportState,
      reason: item.reason,
    }));
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('InkForgeDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
    });
    const readAll = (storeName) => new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`${storeName} read failed`));
    });
    const readOne = (storeName, key) => new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error(`${storeName} read failed`));
    });

    try {
      const [performanceSamples, performanceEvents, ftueRecord] = await Promise.all([
        readAll('performanceSamples'),
        readAll('performanceDegradationEvents'),
        readOne('ftue', 'state'),
      ]);
      const featureFlags = Object.fromEntries(featureFlagKeys.map((key) => {
        const input = document.querySelector(`[data-feature-flag="${key}"]`);
        return [key, input ? {
          checked: input.checked,
          ariaLabel: input.getAttribute('aria-label'),
          consumer: input.getAttribute('data-feature-flag-consumer'),
        } : null];
      }));
      const proxySection = document.querySelector('[data-settings-entry="about.proxy"]');
      const migrationSection = document.querySelector('[data-settings-entry="about.migration"]');
      const performanceSection = document.querySelector('[data-settings-entry="about.performanceSlo"]');
      const performanceLedger = document.querySelector('[data-performance-slo-ledger]');
      return {
        route: `${window.location.pathname}${window.location.search}`,
        store: {
          schemaVersion: liveSettings?.schemaVersion ?? null,
          logLevel: liveSettings?.advanced?.logLevel ?? null,
          developerMode: liveSettings?.advanced?.developerMode ?? null,
          customCss: clone(liveSettings?.advanced?.customCss),
          updater: clone(liveSettings?.advanced?.updater),
          featureFlags: normalizeFlags(liveSettings?.featureFlags),
          proxy: normalizeProxy(liveSettings?.proxy),
          snapshots: normalizeSnapshots(liveSettings?.advanced?.migrationSnapshots),
        },
        persisted: {
          schemaVersion: persistedSettings?.schemaVersion ?? null,
          logLevel: persistedSettings?.advanced?.logLevel ?? null,
          developerMode: persistedSettings?.advanced?.developerMode ?? null,
          customCss: clone(persistedSettings?.advanced?.customCss),
          updater: clone(persistedSettings?.advanced?.updater),
          featureFlags: normalizeFlags(persistedSettings?.featureFlags),
          proxy: normalizeProxy(persistedSettings?.proxy),
          snapshots: normalizeSnapshots(persistedSettings?.advanced?.migrationSnapshots),
        },
        performance: {
          databaseSampleCount: performanceSamples.length,
          databaseEventCount: performanceEvents.length,
          storeSampleCount: performanceStore?.samples?.length ?? null,
          storeEventCount: performanceStore?.events?.length ?? null,
          collecting: performanceStore?.isCollecting ?? null,
          status: performanceStore?.summary?.status ?? null,
          supportMatrix: normalizeSupport(performanceStore?.supportMatrix),
          unsupportedCapabilities: normalizeSupport(performanceStore?.unsupportedCapabilities),
        },
        ftue: {
          storeStep: ftueStore?.ftueState?.step ?? null,
          persistedStep: ftueRecord?.step ?? null,
          welcomeVisible: ftueStore?.welcomeVisible ?? null,
          helpCenterOpen: ftueStore?.helpCenterOpen ?? null,
          seenHelpCount: ftueStore?.seenHelpKeys?.length ?? null,
        },
        ui: {
          schemaVersion: Number(migrationSection?.getAttribute('data-settings-schema-version') ?? NaN),
          currentSchemaVersion: Number(migrationSection?.getAttribute('data-current-settings-schema-version') ?? NaN),
          logLevel: document.querySelector('[data-about-log-level]')?.value ?? null,
          runtimeLogLevel: document.querySelector('[data-runtime-log-level]')?.getAttribute('data-runtime-log-level') ?? null,
          developerModeChecked: document.querySelector('[data-settings-entry="about.devPanel"] input[type="checkbox"]')?.checked ?? null,
          updaterAutoCheckEnabled: document.querySelector('[data-settings-entry="about.updater"] input[type="checkbox"]')?.checked ?? null,
          featureFlags,
          proxyStatus: proxySection?.getAttribute('data-proxy-status') ?? null,
          proxyMessage: proxySection?.querySelector('.sv-form-grid__full:last-child .sv-section-note')?.textContent?.trim() ?? '',
          performanceEnabled: performanceSection?.getAttribute('data-performance-enabled') ?? null,
          performanceSectionVisible: Boolean(performanceSection && performanceSection.getClientRects().length > 0),
          performanceLedgerVisible: Boolean(performanceLedger && performanceLedger.getClientRects().length > 0),
          performanceSampleCount: performanceLedger?.getAttribute('data-performance-sample-count') ?? null,
          performanceEventCount: performanceLedger?.getAttribute('data-performance-event-count') ?? null,
          performanceUnsupportedCapabilities: Array.from(
            document.querySelectorAll('[data-performance-capability]'),
          ).map((element) => ({
            key: element.getAttribute('data-performance-capability'),
            supportState: element.getAttribute('data-performance-support-state'),
            text: element.textContent?.trim() ?? '',
          })),
          ftueStep: document.querySelector('[data-ftue-step]')?.getAttribute('data-ftue-step') ?? null,
          welcomeDialogVisible: Boolean(document.querySelector('[aria-labelledby="if-welcome-title"]')),
          helpDialogVisible: Boolean(document.querySelector('[aria-labelledby="if-help-title"]')),
        },
      };
    } finally {
      database.close();
    }
  }, ABOUT_FEATURE_FLAG_KEYS);
}

describe('Settings editor preferences in the real Tauri runtime', () => {
  before(async () => {
    await waitForMainWindow();
    await openRoute('/settings?tab=editor', '[data-settings-tab="editor"]');
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
      await cleanupCreatedTags();
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await cleanupCreatedArticles();
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await cleanupCreatedCategories();
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (cleanupErrors.length > 0) {
      const messages = cleanupErrors.map((error) => error instanceof Error ? error.message : String(error));
      throw new AggregateError(cleanupErrors, `editor settings E2E cleanup failed: ${messages.join(' | ')}`);
    }
  });

  it('keeps Hub insights truthful and quick actions keyboard-operable with real article data', async function () {
    this.timeout(90_000);
    await startSmartPunctuationErrorProbe();
    let probeStopped = false;

    try {
      await openRoute('/', '.hub-page');
      const initialState = await browser.execute(() => {
        const articleCards = Array.from(document.querySelectorAll('.article-card'));
        const categoryCells = Array.from(document.querySelectorAll('.category-cell'));
        const emptyCategory = document.querySelector('.categories-empty');
        const tagEmpty = document.querySelector('.tag-cloud-empty');
        return {
          headerTriggerTag: document.querySelector('#hub-quick-action-header-trigger')?.tagName ?? null,
          fabTriggerTag: document.querySelector('#hub-quick-action-fab-trigger')?.tagName ?? null,
          menuVisible: Boolean(document.querySelector('#hub-quick-action-menu')),
          chartButtonCount: Array.from(document.querySelectorAll('.chart-container .chart-bar'))
            .filter((element) => element.tagName === 'BUTTON').length,
          categoryActionTags: Array.from(document.querySelectorAll('.categories-actions > *'))
            .map((element) => element.tagName),
          categoryCellsAreButtons: categoryCells.every((element) => element.tagName === 'BUTTON'),
          emptyCategoryTag: emptyCategory?.tagName ?? null,
          articleCardsAreAnchors: articleCards.every((element) => element.tagName === 'A'),
          placeholderCloudCount: document.querySelectorAll('.tag-cloud--placeholder').length,
          emptyCloudNestedTagCount: tagEmpty?.querySelectorAll('.tag-cloud span').length ?? 0,
          emptyCloudHint: tagEmpty?.querySelector('.tag-empty-hint')?.textContent?.trim() ?? null,
        };
      });

      expect(initialState.headerTriggerTag, 'the header quick-action trigger is a native button').to.equal('BUTTON');
      expect(initialState.fabTriggerTag, 'the floating quick-action trigger is a native button').to.equal('BUTTON');
      expect(initialState.menuVisible, 'the quick-action menu starts closed').to.equal(false);
      expect(initialState.chartButtonCount, 'all seven weekly bars are keyboard-reachable buttons').to.equal(7);
      expect(initialState.categoryActionTags, 'category header actions use native buttons')
        .to.deep.equal(['BUTTON', 'BUTTON']);
      expect(initialState.categoryCellsAreButtons, 'rendered category cards use native buttons').to.equal(true);
      if (initialState.emptyCategoryTag !== null) {
        expect(initialState.emptyCategoryTag, 'the empty-category action uses a native button').to.equal('BUTTON');
      }
      expect(initialState.articleCardsAreAnchors, 'existing article cards expose real links').to.equal(true);
      expect(initialState.placeholderCloudCount, 'the empty Tag Cloud renders no fabricated placeholder cloud')
        .to.equal(0);
      expect(initialState.emptyCloudNestedTagCount, 'the empty Tag Cloud renders no fabricated tag labels')
        .to.equal(0);
      if (initialState.emptyCloudHint !== null) {
        expect(initialState.emptyCloudHint, 'the empty Tag Cloud explains its real-data boundary')
          .to.equal('为文档添加标签后将展示真实标签云');
      }

      const headerTrigger = await browser.$('#hub-quick-action-header-trigger');
      await headerTrigger.scrollIntoView({ block: 'center', inline: 'center' });
      await browser.execute((element) => element.focus(), headerTrigger);
      await browser.keys('Enter');
      await browser.waitUntil(
        async () => browser.execute(() => (
          location.pathname === '/'
          && document.querySelectorAll('#hub-quick-action-menu [role="menuitem"]').length === 3
          && document.activeElement === document.querySelector('#hub-quick-action-menu [role="menuitem"]')
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Enter did not open and focus the header quick-action menu' },
      );
      expect(
        await browser.execute(() => document.querySelector('#hub-quick-action-menu')?.getAttribute('aria-labelledby')),
        'the menu is labelled by the owning header trigger',
      ).to.equal('hub-quick-action-header-trigger');

      await browser.keys('ArrowDown');
      expect(
        await browser.execute(() => Array.from(document.querySelectorAll('#hub-quick-action-menu [role="menuitem"]'))
          .indexOf(document.activeElement)),
        'ArrowDown moves to the second quick action',
      ).to.equal(1);
      await browser.keys('End');
      expect(
        await browser.execute(() => Array.from(document.querySelectorAll('#hub-quick-action-menu [role="menuitem"]'))
          .indexOf(document.activeElement)),
        'End moves to the last quick action',
      ).to.equal(2);
      await browser.keys('Home');
      expect(
        await browser.execute(() => Array.from(document.querySelectorAll('#hub-quick-action-menu [role="menuitem"]'))
          .indexOf(document.activeElement)),
        'Home returns to the first quick action',
      ).to.equal(0);
      await browser.keys('Escape');
      await browser.waitUntil(
        async () => browser.execute(() => (
          !document.querySelector('#hub-quick-action-menu')
          && document.activeElement?.id === 'hub-quick-action-header-trigger'
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Escape did not close the menu and restore header focus' },
      );

      const fabTrigger = await browser.$('#hub-quick-action-fab-trigger');
      await browser.execute((element) => element.focus(), fabTrigger);
      await browser.keys(' ');
      await browser.waitUntil(
        async () => browser.execute(() => (
          location.pathname === '/'
          && document.querySelector('#hub-quick-action-menu')?.getAttribute('aria-labelledby')
            === 'hub-quick-action-fab-trigger'
          && document.activeElement === document.querySelector('#hub-quick-action-menu [role="menuitem"]')
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Space did not open and focus the floating quick-action menu' },
      );
      await browser.keys('Escape');
      await browser.waitUntil(
        async () => browser.execute(() => (
          !document.querySelector('#hub-quick-action-menu')
          && document.activeElement?.id === 'hub-quick-action-fab-trigger'
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Escape did not restore floating-trigger focus' },
      );

      await browser.execute((element) => element.focus(), headerTrigger);
      await browser.keys('Enter');
      await browser.waitUntil(
        async () => browser.execute(() => (
          document.activeElement === document.querySelector('#hub-quick-action-menu [role="menuitem"]')
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'header menu did not reopen for the create action' },
      );
      await browser.keys('Enter');
      await browser.waitUntil(
        async () => browser.execute(() => (
          location.pathname === '/workstation'
          && Boolean(new window.URLSearchParams(location.search).get('id'))
          && Boolean(document.querySelector('.ProseMirror'))
        )),
        { timeout: 15_000, interval: 200, timeoutMsg: 'the keyboard quick action did not create a real draft' },
      );
      const articleId = await browser.execute(() => new window.URLSearchParams(location.search).get('id'));
      expect(articleId, 'the real quick action exposes the created article id').to.be.a('string').and.not.equal('');
      createdArticleIds.add(articleId);
      await waitForCurrentDraftReady(articleId, true);

      const articleBody = Array.from({ length: 105 }, (_, index) => `hub${index}`).join(' ');
      const editor = await browser.$('.ProseMirror');
      await browser.execute((element) => element.focus(), editor);
      await browser.keys(articleBody);
      await browser.keys(['Control', 's']);
      await browser.waitUntil(
        async () => browser.execute((expectedText) => {
          const root = document.getElementById('app');
          const provides = root?.__vue_app__?._context?.provides;
          const pinia = provides
            ? Object.getOwnPropertySymbols(provides)
              .map((symbol) => provides[symbol])
              .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
            : null;
          const articleIdFromRoute = new window.URLSearchParams(location.search).get('id');
          const article = pinia?._s.get('article')?.articles
            ?.find((candidate) => candidate.id === articleIdFromRoute);
          return article?.rawContent?.includes(expectedText) ?? false;
        }, articleBody),
        { timeout: 10_000, interval: 200, timeoutMsg: 'the real article content did not persist through save' },
      );

      await openRoute('/', '.hub-page');
      await browser.waitUntil(
        async () => browser.execute((expectedId) => {
          const cards = Array.from(document.querySelectorAll('a.article-card'));
          const exactCard = cards.find((card) => new window.URL(card.href).searchParams.get('id') === expectedId);
          return Boolean(
            exactCard
            && document.querySelector('.heatmap-body')
            && document.querySelector('.trend-bars:not(.trend-bars--placeholder)')
            && document.querySelector('.bucket-list')
            && document.querySelector('.timeline-list .timeline-item'),
          );
        }, articleId),
        { timeout: 10_000, interval: 200, timeoutMsg: 'Hub insights did not render the saved real article' },
      );
      const populatedState = await browser.execute((expectedId) => {
        const card = Array.from(document.querySelectorAll('a.article-card'))
          .find((candidate) => new window.URL(candidate.href).searchParams.get('id') === expectedId);
        return {
          cardTag: card?.tagName ?? null,
          cardHrefId: card ? new window.URL(card.href).searchParams.get('id') : null,
          heatmapVisible: Boolean(document.querySelector('.heatmap-body')),
          trendVisible: Boolean(document.querySelector('.trend-bars:not(.trend-bars--placeholder)')),
          distributionVisible: Boolean(document.querySelector('.bucket-list')),
          timelineVisible: Boolean(document.querySelector('.timeline-list .timeline-item')),
          placeholderCloudCount: document.querySelectorAll('.tag-cloud--placeholder').length,
        };
      }, articleId);
      expect(populatedState, 'the populated Hub uses the saved article across card and insight views').to.deep.equal({
        cardTag: 'A',
        cardHrefId: articleId,
        heatmapVisible: true,
        trendVisible: true,
        distributionVisible: true,
        timelineVisible: true,
        placeholderCloudCount: 0,
      });

      const articleCard = await browser.$(`a.article-card[href*="${articleId}"]`);
      await browser.execute((element) => element.focus(), articleCard);
      await browser.keys('Enter');
      await browser.waitUntil(
        async () => browser.execute((expectedId) => (
          location.pathname === '/workstation'
          && new window.URLSearchParams(location.search).get('id') === expectedId
          && Boolean(document.querySelector('.ProseMirror'))
        ), articleId),
        { timeout: 10_000, interval: 200, timeoutMsg: 'keyboard activation did not follow the article card link' },
      );

      const errors = await stopSmartPunctuationErrorProbe();
      probeStopped = true;
      expect(errors, 'fresh Hub quick-action, insight, and article-card runtime errors').to.deep.equal([]);
    } finally {
      if (!probeStopped) await stopSmartPunctuationErrorProbe();
    }
  });

  it('mounts the real Workstation tab bar and preserves pin, route, close, restore, and layout state', async function () {
    this.timeout(120_000);
    await startSmartPunctuationErrorProbe();
    let probeStopped = false;
    let firstArticleId = null;
    let secondArticleId = null;
    const runtimeErrors = [];

    try {
      let closeLastProbe = await readWorkstationTabSessionTruth();
      if (closeLastProbe.storeTabIds.length === 0) {
        await createBlankDraftThroughHub();
        closeLastProbe = await readWorkstationTabSessionTruth();
      }
      expect(closeLastProbe.storeTabIds, 'the isolated close-last probe owns exactly one real tab')
        .to.have.length(1);
      const closeLastArticleId = closeLastProbe.storeActiveTabId;
      expect(closeLastArticleId, 'the close-last probe has one active article').to.be.a('string');
      const closeLastItem = await browser.$(`[data-tab-item-id="${closeLastArticleId}"]`);
      await closeLastItem.moveTo();
      const closeLastButton = await closeLastItem.$('.workstation-tabbar__close');
      await closeLastButton.waitForClickable({ timeout: 5_000 });
      expect(await installRouteRejection('Hub'), 'the real Vue Router installs a close-last rejection guard')
        .to.equal(true);
      try {
        await closeLastButton.click();
        await waitForRouteRejection();
        expect(
          await readWorkstationTabSessionTruth(),
          'a rejected close-last navigation preserves route, selection, tab, restore queue, and session state',
        ).to.deep.equal(closeLastProbe);
      } finally {
        expect(await restoreRouteRejection(), 'the close-last guard observed one real navigation attempt')
          .to.equal(1);
      }

      firstArticleId = await createBlankDraftThroughHub();
      const firstTab = await browser.$(`[data-tab-id="${firstArticleId}"]`);
      await firstTab.waitForDisplayed({ timeout: 10_000 });
      expect(await firstTab.getAttribute('aria-selected'), 'the first real article tab starts active').to.equal('true');
      expect(await firstTab.getText(), 'the real article title is rendered in the mounted tab bar')
        .to.include('未命名文章');

      const firstTabItem = await browser.$(`[data-tab-item-id="${firstArticleId}"]`);
      const firstPinButton = await firstTabItem.$('.workstation-tabbar__pin');
      await firstPinButton.waitForClickable({ timeout: 5_000 });
      await firstPinButton.click();
      await browser.waitUntil(
        async () => (await browser.$(`[data-tab-item-id="${firstArticleId}"]`)).getAttribute('class')
          .then((className) => className.includes('workstation-tabbar__tab--pinned')),
        { timeout: 5_000, interval: 100, timeoutMsg: 'the visible first tab did not enter the pinned group' },
      );

      secondArticleId = await createBlankDraftThroughHub();
      await browser.waitUntil(
        async () => browser.execute((expectedIds) => {
          const tabs = Array.from(document.querySelectorAll('.workstation-tabbar [data-tab-id]'));
          return expectedIds.every((id) => tabs.some((tab) => tab.getAttribute('data-tab-id') === id));
        }, [firstArticleId, secondArticleId]),
        { timeout: 10_000, interval: 100, timeoutMsg: 'both real article ids did not render in the tab bar' },
      );

      let evidence = await browser.execute((expectedFirstId, expectedSecondId) => {
        const root = document.getElementById('app');
        const provides = root?.__vue_app__?._context?.provides;
        const pinia = provides
          ? Object.getOwnPropertySymbols(provides)
            .map((symbol) => provides[symbol])
            .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
          : null;
        const tabsStore = pinia?._s.get('workstationTabs');
        const persisted = JSON.parse(window.sessionStorage.getItem('inkforge.workstation.tabs.v1') || 'null');
        return {
          domOrder: Array.from(document.querySelectorAll('.workstation-tabbar [data-tab-id]'))
            .map((tab) => tab.getAttribute('data-tab-id')),
          activeTabId: tabsStore?.activeTabId ?? null,
          pinnedIds: (tabsStore?.orderedTabs ?? []).filter((tab) => tab.isPinned).map((tab) => tab.id),
          persistedOrder: Array.isArray(persisted?.tabs) ? persisted.tabs.map((tab) => tab.id) : [],
          persistedActiveTabId: persisted?.activeTabId ?? null,
          routeArticleId: new window.URLSearchParams(location.search).get('id'),
          expectedFirstId,
          expectedSecondId,
        };
      }, firstArticleId, secondArticleId);
      expect(evidence.domOrder, 'both created articles render in the real tab bar')
        .to.include.members([firstArticleId, secondArticleId]);
      expect(
        evidence.domOrder.indexOf(firstArticleId) < evidence.domOrder.indexOf(secondArticleId),
        'the pinned article remains before the created regular article',
      ).to.equal(true);
      expect(
        evidence.pinnedIds.filter((id) => id === firstArticleId || id === secondArticleId),
        'only the first created article is pinned',
      ).to.deep.equal([firstArticleId]);
      expect(evidence.persistedOrder, 'session persistence contains both created articles')
        .to.include.members([firstArticleId, secondArticleId]);
      expect(
        evidence.persistedOrder.indexOf(firstArticleId) < evidence.persistedOrder.indexOf(secondArticleId),
        'session persistence keeps the pinned article before the created regular article',
      ).to.equal(true);
      expect(evidence.activeTabId, 'the second created article is active in the store').to.equal(secondArticleId);
      expect(evidence.persistedActiveTabId, 'the second created article is active in session persistence')
        .to.equal(secondArticleId);
      expect(evidence.routeArticleId, 'the second created article owns the route').to.equal(secondArticleId);

      const fileManagerFlushText = `file-manager-switch-${Date.now()}`;
      const secondEditorBeforeFileSwitch = await browser.$('.ProseMirror');
      await focusEditorAtDocumentEnd(secondEditorBeforeFileSwitch, 'FileManager switch flush');
      await browser.keys(fileManagerFlushText);
      const collapsedManagerBar = await browser.$('.manager-collapsed-bar');
      if (await collapsedManagerBar.isExisting()) {
        await collapsedManagerBar.waitForDisplayed({ timeout: 5_000 });
        await browser.execute((element) => element.focus(), collapsedManagerBar);
        await browser.keys('Enter');
      }
      const filesManagerTab = await browser.$('[data-manager-tab="files"]');
      await filesManagerTab.waitForClickable({ timeout: 5_000 });
      await filesManagerTab.click();

      const firstFileManagerItem = await browser.$(
        `.fm-quick-access-item[data-file-article-id="${firstArticleId}"]`,
      );
      await firstFileManagerItem.waitForDisplayed({ timeout: 5_000 });
      await firstFileManagerItem.scrollIntoView({ block: 'center', inline: 'nearest' });
      await firstFileManagerItem.waitForClickable({ timeout: 5_000 });
      await firstFileManagerItem.click();
      await waitForCurrentDraftReady(firstArticleId, true);

      let fileManagerSwitchPersistence = null;
      await browser.waitUntil(
        async () => {
          const source = await readVersionPersistence(secondArticleId);
          const target = await readVersionPersistence(firstArticleId);
          fileManagerSwitchPersistence = { source, target };
          return source.persistedBodyEncrypted
            && target.persistedBodyEncrypted
            && source.articleBody?.includes(fileManagerFlushText)
            && !target.articleBody?.includes(fileManagerFlushText)
            && target.storeArticleId === firstArticleId;
        },
        { timeout: 10_000, interval: 100, timeoutMsg: 'FileManager selection did not flush and isolate the source article' },
      );
      expect(fileManagerSwitchPersistence.source.persistedBodyEncrypted,
        'FileManager source selection flush keeps an encrypted v2 body').to.equal(true);
      expect(fileManagerSwitchPersistence.source.articleBody,
        'FileManager selection persists the source editor before changing article').to.include(fileManagerFlushText);
      expect(fileManagerSwitchPersistence.target.articleBody,
        'FileManager selection never writes the source editor into the target article')
        .to.not.include(fileManagerFlushText);

      await (await browser.$(`[data-tab-id="${secondArticleId}"]`)).click();
      await waitForCurrentDraftReady(secondArticleId);
      expect(await (await browser.$('.ProseMirror')).getText(),
        'returning to the FileManager source restores its isolated persisted body')
        .to.include(fileManagerFlushText);

      const guardedSwitchBefore = await readWorkstationTabSessionTruth();
      const rejectedArrowLeftTargetId = await browser.execute((activeId) => {
        const tabs = Array.from(document.querySelectorAll('.workstation-tabbar [data-tab-id]'));
        const activeIndex = tabs.findIndex((tab) => tab.getAttribute('data-tab-id') === activeId);
        if (activeIndex < 0 || tabs.length < 2) return null;
        return tabs[(activeIndex - 1 + tabs.length) % tabs.length]?.getAttribute('data-tab-id') ?? null;
      }, secondArticleId);
      expect(rejectedArrowLeftTargetId, 'ArrowLeft resolves a distinct real adjacent tab')
        .to.be.a('string').and.not.equal(secondArticleId);
      expect(
        await installRouteRejection('Workstation', rejectedArrowLeftTargetId),
        'the real Vue Router installs an article-switch rejection guard',
      ).to.equal(true);
      try {
        const activeSecondTab = await browser.$(`[data-tab-id="${secondArticleId}"]`);
        await activeSecondTab.waitForDisplayed({ timeout: 5_000 });
        await browser.execute((element) => element.focus(), activeSecondTab);
        expect(
          await browser.execute(() => document.activeElement?.getAttribute('data-tab-id') ?? null),
          'the real active tab owns focus before the roving keyboard request',
        ).to.equal(secondArticleId);
        await browser.keys(['ArrowLeft']);
        await waitForRouteRejection();
        expect(
          await readWorkstationTabSessionTruth(),
          'a rejected keyboard article switch preserves route, selection, tab, restore queue, and session state',
        ).to.deep.equal(guardedSwitchBefore);
        expect(
          await browser.execute(() => document.activeElement?.getAttribute('data-tab-id') ?? null),
          'a rejected roving activation keeps focus on the still-active tab',
        ).to.equal(secondArticleId);
      } finally {
        expect(await restoreRouteRejection(), 'the switch guard observed one real navigation attempt').to.equal(1);
      }

      const firstOrderedTabId = evidence.domOrder[0];
      const lastOrderedTabId = evidence.domOrder.at(-1);
      const previousOrderedTabId = evidence.domOrder.at(-2);
      expect(firstOrderedTabId, 'the real tablist exposes a first roving target').to.be.a('string');
      expect(lastOrderedTabId, 'the real tablist exposes a last roving target').to.be.a('string');
      expect(previousOrderedTabId, 'the real tablist exposes a prior target for ArrowLeft').to.be.a('string');
      const blankArticleIds = [firstArticleId];
      await activateWorkstationTabThroughRovingKey(
        secondArticleId,
        'Home',
        firstOrderedTabId,
        blankArticleIds.includes(firstOrderedTabId),
      );
      await activateWorkstationTabThroughRovingKey(
        firstOrderedTabId,
        'End',
        lastOrderedTabId,
        blankArticleIds.includes(lastOrderedTabId),
      );
      await activateWorkstationTabThroughRovingKey(
        lastOrderedTabId,
        'ArrowLeft',
        previousOrderedTabId,
        blankArticleIds.includes(previousOrderedTabId),
      );
      await activateWorkstationTabThroughRovingKey(
        previousOrderedTabId,
        'ArrowRight',
        lastOrderedTabId,
        blankArticleIds.includes(lastOrderedTabId),
      );

      const tabSemantics = await readWorkstationTabSessionTruth();
      expect(tabSemantics.nestedTabActionCount, 'tab roles never contain nested pin or close buttons').to.equal(0);
      expect(tabSemantics.tabPanelId, 'the active editor exposes one stable tabpanel id')
        .to.equal('workstation-document-panel');
      expect(tabSemantics.tabPanelRole, 'the active editor uses the tabpanel role').to.equal('tabpanel');
      expect(tabSemantics.tabPanelLabelledBy, 'the active tabpanel is labelled by the active real tab')
        .to.equal(`workstation-tab-${lastOrderedTabId}`);

      const refreshedFirstTab = await browser.$(`[data-tab-id="${firstArticleId}"]`);
      await refreshedFirstTab.click();
      await browser.waitUntil(
        async () => browser.execute((expectedId) => (
          new window.URLSearchParams(location.search).get('id') === expectedId
          && document.querySelector(`[data-tab-id="${expectedId}"]`)?.getAttribute('aria-selected') === 'true'
        ), firstArticleId),
        { timeout: 10_000, interval: 100, timeoutMsg: 'tab activation did not synchronize the real route id' },
      );
      await waitForCurrentDraftReady(firstArticleId, true);

      const switchFlushText = `tab switch flush ${Date.now()}`;
      const firstEditor = await browser.$('.ProseMirror');
      await focusEditorAtDocumentEnd(firstEditor, 'initial switch flush');
      await browser.keys(switchFlushText);
      await browser.waitUntil(
        async () => browser.execute((activeId) => {
          const tab = document.querySelector(`[data-tab-id="${activeId}"]`);
          return tab?.getAttribute('data-save-state') === 'saving'
            && tab.getAttribute('aria-label')?.endsWith(' - Saving');
        }, firstArticleId),
        { timeout: 5_000, interval: 50, timeoutMsg: 'the active tab falsely remained Saved during debounce' },
      );

      const pendingSaveTruth = await browser.execute((activeId) => ({
        headerState: document.querySelector('.status-pill')?.getAttribute('data-save-state') ?? null,
        headerText: document.querySelector('.status-pill')?.textContent?.trim() ?? '',
        headerSaved: document.querySelector('.status-pill')?.classList.contains('saved') ?? null,
        tabLabel: document.querySelector(`[data-tab-id="${activeId}"]`)?.getAttribute('aria-label') ?? '',
      }), firstArticleId);
      expect(pendingSaveTruth.headerState, 'the Header shares the active tab save-state mapping').to.equal('saving');
      expect(['保存中…', '同步中…'], 'the Header reports an explicit in-flight state')
        .to.include(pendingSaveTruth.headerText);
      expect(pendingSaveTruth.headerSaved, 'the Header never applies Saved styling during debounce').to.equal(false);
      expect(pendingSaveTruth.tabLabel, 'the tab never claims Saved during debounce').to.not.include(' - Saved');

      const overlappingSaveText = ` overlapping-save-${Date.now()}`;
      await withContentWriteTransactionLock(async () => {
        await browser.waitUntil(
          async () => browser.execute((marker) => {
            const root = document.getElementById('app');
            const provides = root?.__vue_app__?._context?.provides;
            const pinia = provides
              ? Object.getOwnPropertySymbols(provides)
                .map((symbol) => provides[symbol])
                .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
              : null;
            const editor = pinia?._s.get('editor');
            return editor?.status === 'saving' && !editor.currentContent?.body?.includes(marker);
          }, switchFlushText),
          { timeout: 5_000, interval: 20, timeoutMsg: 'the real first save did not enter the held pre-echo window' },
        );
        await browser.keys(overlappingSaveText);
      });
      await browser.waitUntil(
        async () => browser.execute((firstMarker, newerMarker) => {
          const root = document.getElementById('app');
          const provides = root?.__vue_app__?._context?.provides;
          const pinia = provides
            ? Object.getOwnPropertySymbols(provides)
              .map((symbol) => provides[symbol])
              .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
            : null;
          const persistedEcho = pinia?._s.get('editor')?.currentContent?.body ?? '';
          return persistedEcho.includes(firstMarker) && !persistedEcho.includes(newerMarker);
        }, switchFlushText, overlappingSaveText),
        { timeout: 5_000, interval: 20, timeoutMsg: 'the older save result did not arrive before the newer debounce' },
      );
      expect(
        await browser.execute((marker) => document.querySelector('.ProseMirror')?.textContent?.includes(marker) ?? false,
          overlappingSaveText),
        'an older same-document persistence echo never overwrites the newer local editor revision',
      ).to.equal(true);

      await browser.waitUntil(
        async () => browser.execute((activeId) => (
          document.querySelector(`[data-tab-id="${activeId}"]`)?.getAttribute('data-save-state') === 'clean'
        ), firstArticleId),
        { timeout: 10_000, interval: 100, timeoutMsg: 'the save-state probe did not settle before failure injection' },
      );
      const routeSwitchFlushText = `route-switch-rejection-${Date.now()}`;
      const routeSwitchBeforeFailure = await readWorkstationTabSessionTruth();
      expect(await installDataFaultInjection('backup-write'), 'route-switch failure injection replaces one browser API')
        .to.equal(1);
      try {
        await focusEditorAtDocumentEnd(firstEditor, 'route rejection');
        await browser.keys(routeSwitchFlushText);
        const markerPresentBeforeRoute = await browser.execute((targetId, marker) => {
          const markerPresent = document.querySelector('.ProseMirror')?.textContent?.includes(marker) ?? false;
          if (!markerPresent) return false;
          window.history.pushState({}, '', `/workstation?id=${encodeURIComponent(targetId)}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
          return true;
        }, secondArticleId, routeSwitchFlushText);
        expect(markerPresentBeforeRoute, 'real keyboard input reaches the source editor before route-driven switching')
          .to.equal(true);
        let routeSwitchRejectedState = null;
        try {
          await browser.waitUntil(
            async () => {
              routeSwitchRejectedState = await readWorkstationFailureTruth(firstArticleId, routeSwitchFlushText);
              return routeSwitchRejectedState.routeArticleId === firstArticleId
                && routeSwitchRejectedState.selectedArticleId === firstArticleId
                && routeSwitchRejectedState.contentArticleId === firstArticleId
                && routeSwitchRejectedState.selectedTab === firstArticleId
                && routeSwitchRejectedState.editorContainsMarker
                && routeSwitchRejectedState.editorStatus === 'error'
                && routeSwitchRejectedState.headerState === 'error'
                && routeSwitchRejectedState.tabState === 'error';
            },
            { timeout: 10_000, interval: 100, timeoutMsg: 'failed route-driven tab switch did not restore the original article state' },
          );
        } catch (error) {
          throw new Error(`route-switch rejection evidence: ${JSON.stringify(routeSwitchRejectedState)}`, { cause: error });
        }
        assertWorkstationFailureTruth(routeSwitchRejectedState, firstArticleId, 'failed route-driven switch');
        const routeSwitchAfterFailure = await readWorkstationTabSessionTruth();
        expect(routeSwitchAfterFailure, 'failed route-driven switch preserves Store, route, DOM, panel, and session state')
          .to.deep.equal(routeSwitchBeforeFailure);
      } finally {
        await restoreDataFaultInjection();
      }

      const refreshedSecondTab = await browser.$(`[data-tab-id="${secondArticleId}"]`);
      await refreshedSecondTab.waitForClickable({ timeout: 5_000 });
      await refreshedSecondTab.click();
      await waitForCurrentDraftReady(secondArticleId);
      let switchPersistence = null;
      await browser.waitUntil(
        async () => {
          const firstPersistence = await readVersionPersistence(firstArticleId);
          const secondPersistence = await readVersionPersistence(secondArticleId);
          switchPersistence = {
            first: firstPersistence,
            second: secondPersistence,
          };
          return switchPersistence.first.persistedBodyEncrypted
            && switchPersistence.second.persistedBodyEncrypted
            && switchPersistence.first.articleBody?.includes(switchFlushText)
            && switchPersistence.first.articleBody?.includes(overlappingSaveText)
            && switchPersistence.first.articleBody?.includes(routeSwitchFlushText)
            && switchPersistence.second.articleBody?.includes(fileManagerFlushText)
            && !switchPersistence.second.articleBody?.includes(switchFlushText)
            && !switchPersistence.second.articleBody?.includes(overlappingSaveText)
            && !switchPersistence.second.articleBody?.includes(routeSwitchFlushText)
            && switchPersistence.second.storeArticleId === secondArticleId;
        },
        { timeout: 10_000, interval: 100, timeoutMsg: 'tab activation did not flush and isolate the source article' },
      );
      expect(
        switchPersistence.first.persistedContentCount,
        `the source article owns one contents row: ${JSON.stringify(switchPersistence.first.persistedRecords)}`,
      ).to.equal(1);
      expect(switchPersistence.first.persistedBodyEncrypted, 'the source contents row keeps an encrypted v2 storage body')
        .to.equal(true);
      expect(switchPersistence.first.articleBody, 'switching immediately persists and synchronizes the source article')
        .to.include(switchFlushText);
      expect(switchPersistence.first.articleBody, 'the newer overlapping editor revision remains durable')
        .to.include(overlappingSaveText);
      expect(switchPersistence.first.articleBody, 'the successful retry persists text from the rejected route switch')
        .to.include(routeSwitchFlushText);
      expect(
        switchPersistence.second.persistedContentCount,
        `the target article owns one contents row: ${JSON.stringify(switchPersistence.second.persistedRecords)}`,
      ).to.equal(1);
      expect(switchPersistence.second.persistedBodyEncrypted, 'the target contents row keeps an encrypted v2 storage body')
        .to.equal(true);
      expect(switchPersistence.second.articleBody, 'switching preserves the target article own persisted text')
        .to.include(fileManagerFlushText);
      expect(switchPersistence.second.articleBody, 'switching never writes source text into the target article')
        .to.not.include(switchFlushText)
        .and.to.not.include(overlappingSaveText)
        .and.to.not.include(routeSwitchFlushText);

      const layoutRestoreFixture = await preparePersistedLayoutRestoreFixture(firstArticleId);
      const layoutRestoreMarker = `layout restore flush ${Date.now()}`;
      let layoutRouteGuardInstalled = false;
      let layoutRouteGuardCount = null;
      try {
        const layoutRestoreEditor = await browser.$('.ProseMirror');
        await focusEditorAtDocumentEnd(layoutRestoreEditor, 'persisted layout restore flush');
        await browser.keys(layoutRestoreMarker);
        await browser.waitUntil(
          async () => browser.execute((activeId, marker) => (
            document.querySelector(`[data-tab-id="${activeId}"]`)?.getAttribute('data-save-state') === 'saving'
            && document.querySelector('.ProseMirror')?.textContent?.includes(marker)
          ), secondArticleId, layoutRestoreMarker),
          {
            timeout: 5_000,
            interval: 20,
            timeoutMsg: 'persisted layout restore source did not expose its real pending editor state',
          },
        );

        const routeSetup = await browser.execute(async (sourceArticleId, marker) => {
            const root = document.getElementById('app');
            const provides = root?.__vue_app__?._context?.provides;
            const pinia = provides
              ? Object.getOwnPropertySymbols(provides)
                .map((symbol) => provides[symbol])
                .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
              : null;
            const router = root?.__vue_app__?._context?.config?.globalProperties?.$router;
            const articleStore = pinia?._s.get('article');
            const editorStore = pinia?._s.get('editor');
            const tabsStore = pinia?._s.get('workstationTabs');
            if (!router || !articleStore || !editorStore || !tabsStore) {
              return { error: 'required production store or router is unavailable' };
            }

            const query = { ...router.currentRoute.value.query };
            delete query.id;
            const failure = await router.replace({ name: 'Workstation', query });
            return {
              error: failure ? failure.message : null,
              routeArticleId: new window.URLSearchParams(location.search).get('id'),
              selectedArticleId: articleStore.selectedArticleId,
              contentArticleId: editorStore.currentContent?.articleId ?? null,
              activeTabId: tabsStore.activeTabId,
              editorContainsMarker: document.querySelector('.ProseMirror')?.textContent?.includes(marker) ?? false,
              expectedSourceArticleId: sourceArticleId,
            };
        }, secondArticleId, layoutRestoreMarker);
        expect(routeSetup, 'the real Workstation reaches a stable route without an article query').to.deep.equal({
          error: null,
          routeArticleId: null,
          selectedArticleId: secondArticleId,
          contentArticleId: secondArticleId,
          activeTabId: secondArticleId,
          editorContainsMarker: true,
          expectedSourceArticleId: secondArticleId,
        });

        const layoutRestoreBefore = await readWorkstationTabSessionTruth();
        expect(
          await installRouteRejection('Workstation', firstArticleId),
          'the real Vue Router guards the persisted-layout target article',
        ).to.equal(true);
        layoutRouteGuardInstalled = true;

        const restoreTriggered = await browser.execute((fixtureProfileId) => {
            const root = document.getElementById('app');
            const provides = root?.__vue_app__?._context?.provides;
            const pinia = provides
              ? Object.getOwnPropertySymbols(provides)
                .map((symbol) => provides[symbol])
                .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
              : null;
            const profileStore = pinia?._s.get('profile');
            if (!profileStore) return false;
            profileStore.$patch({ activeProfileId: fixtureProfileId });
            return true;
        }, layoutRestoreFixture.fixtureProfileId);
        expect(restoreTriggered, 'the production profile watcher receives the persisted-layout profile').to.equal(true);

        await waitForRouteRejection();
        const layoutRestoreAfter = await readWorkstationTabSessionTruth();
        const layoutRestoreChangedFields = Object.keys(layoutRestoreBefore)
          .filter((key) => JSON.stringify(layoutRestoreAfter[key]) !== JSON.stringify(layoutRestoreBefore[key]))
          .map((key) => ({
            key,
            before: layoutRestoreBefore[key],
            after: layoutRestoreAfter[key],
          }));
        expect(
          layoutRestoreChangedFields,
          `rejected persisted-layout state changes: ${JSON.stringify(layoutRestoreChangedFields)}`,
        ).to.deep.equal([]);

        let layoutRestorePersistence = null;
        await browser.waitUntil(
          async () => {
            layoutRestorePersistence = await readVersionPersistence(secondArticleId);
            return layoutRestorePersistence.persistedBodyEncrypted
              && layoutRestorePersistence.articleBody?.includes(layoutRestoreMarker)
              && layoutRestorePersistence.storeArticleId === secondArticleId;
          },
          {
            timeout: 10_000,
            interval: 100,
            timeoutMsg: 'persisted layout restore did not flush the source through the real encrypted repository',
          },
        );
        expect(
          layoutRestorePersistence.articleBody,
          'persisted layout restore saves the source editor before the rejected target navigation',
        ).to.include(layoutRestoreMarker);
        expect(
          layoutRestorePersistence.persistedBodyEncrypted,
          'persisted layout restore keeps the source contents row encrypted',
        ).to.equal(true);
      } finally {
        if (layoutRouteGuardInstalled) {
          layoutRouteGuardCount = await restoreRouteRejection();
        }
        await cleanupPersistedLayoutRestoreFixture(layoutRestoreFixture, secondArticleId);
      }
      expect(layoutRouteGuardCount, 'persisted layout restore attempted exactly one real guarded navigation')
        .to.equal(1);

      const secondTabItem = await browser.$(`[data-tab-item-id="${secondArticleId}"]`);
      await secondTabItem.moveTo();
      const secondCloseButton = await secondTabItem.$('.workstation-tabbar__close');
      await secondCloseButton.waitForClickable({ timeout: 5_000 });
      expect(await secondCloseButton.getAttribute('aria-label'), 'the visible close control names its real article')
        .to.equal('Close 未命名文章');
      const closeFlushText = `tab close flush ${Date.now()}`;
      const secondEditor = await browser.$('.ProseMirror');
      await focusEditorAtDocumentEnd(secondEditor, 'close flush');
      await browser.keys(closeFlushText);
      await browser.waitUntil(
        async () => browser.execute((activeId) => (
          document.querySelector(`[data-tab-id="${activeId}"]`)?.getAttribute('data-save-state') === 'saving'
        ), secondArticleId),
        { timeout: 5_000, interval: 50, timeoutMsg: 'the close target did not expose its pending save state' },
      );

      await browser.waitUntil(
        async () => browser.execute((activeId) => (
          document.querySelector(`[data-tab-id="${activeId}"]`)?.getAttribute('data-save-state') === 'clean'
        ), secondArticleId),
        { timeout: 10_000, interval: 100, timeoutMsg: 'the close save-state probe did not settle before failure injection' },
      );
      const closeFailureFlushText = `close-rejection-${Date.now()}`;
      const closeBeforeFailure = await readWorkstationTabSessionTruth();
      expect(await installDataFaultInjection('backup-write'), 'close failure injection replaces one browser API')
        .to.equal(1);
      try {
        await focusEditorAtDocumentEnd(secondEditor, 'close rejection');
        await browser.keys(closeFailureFlushText);
        await secondCloseButton.click();
        let closeRejectedState = null;
        try {
          await browser.waitUntil(
            async () => {
              closeRejectedState = await readWorkstationFailureTruth(secondArticleId, closeFailureFlushText);
              return closeRejectedState.routeArticleId === secondArticleId
                && closeRejectedState.selectedArticleId === secondArticleId
                && closeRejectedState.contentArticleId === secondArticleId
                && closeRejectedState.selectedTab === secondArticleId
                && closeRejectedState.editorContainsMarker
                && closeRejectedState.editorStatus === 'error'
                && closeRejectedState.headerState === 'error'
                && closeRejectedState.tabState === 'error';
            },
            { timeout: 10_000, interval: 100, timeoutMsg: 'failed close did not keep the original active tab and route' },
          );
        } catch (error) {
          throw new Error(`close rejection evidence: ${JSON.stringify(closeRejectedState)}`, { cause: error });
        }
        assertWorkstationFailureTruth(closeRejectedState, secondArticleId, 'failed close');
        const closeAfterFailure = await readWorkstationTabSessionTruth();
        expect(closeAfterFailure, 'failed close preserves Store, route, DOM, panel, restore queue, and session state')
          .to.deep.equal(closeBeforeFailure);
      } finally {
        await restoreDataFaultInjection();
      }

      const guardedCloseBefore = await readWorkstationTabSessionTruth();
      const guardedCloseIndex = guardedCloseBefore.storeTabIds.indexOf(secondArticleId);
      const guardedCloseRemaining = guardedCloseBefore.storeTabIds.filter((id) => id !== secondArticleId);
      const guardedCloseTarget = guardedCloseRemaining[guardedCloseIndex]
        ?? guardedCloseRemaining[guardedCloseIndex - 1]
        ?? guardedCloseRemaining.at(-1);
      expect(guardedCloseTarget, 'the active close has one real fallback route target').to.be.a('string');
      expect(
        await installRouteRejection('Workstation', guardedCloseTarget),
        'the real Vue Router installs an active-close rejection guard',
      ).to.equal(true);
      try {
        await secondCloseButton.click();
        await waitForRouteRejection();
        expect(
          await readWorkstationTabSessionTruth(),
          'a rejected active close preserves route, selection, tabs, restore queue, and session state',
        ).to.deep.equal(guardedCloseBefore);
      } finally {
        expect(await restoreRouteRejection(), 'the active-close guard observed one real navigation attempt')
          .to.equal(1);
      }

      await browser.execute((element) => element.focus(), secondCloseButton);
      await browser.keys('Enter');
      let closeEvidence = null;
      try {
        await browser.waitUntil(
          async () => {
            closeEvidence = await browser.execute((closedId, expectedRemainingId) => {
              const root = document.getElementById('app');
              const provides = root?.__vue_app__?._context?.provides;
              const pinia = provides
                ? Object.getOwnPropertySymbols(provides)
                  .map((symbol) => provides[symbol])
                  .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
                : null;
              const tabsStore = pinia?._s.get('workstationTabs');
              const persisted = JSON.parse(window.sessionStorage.getItem('inkforge.workstation.tabs.v1') || 'null');
              const activeDomId = document.querySelector('.workstation-tabbar [aria-selected="true"]')
                ?.getAttribute('data-tab-id') ?? null;
              return {
                closedTabPresent: Boolean(document.querySelector(`[data-tab-id="${closedId}"]`)),
                expectedRemainingTabPresent: Boolean(document.querySelector(`[data-tab-id="${expectedRemainingId}"]`)),
                activeDomId,
                restoreDisabled: document.querySelector('.workstation-tabbar__restore')?.hasAttribute('disabled') ?? null,
                storeTabIds: (tabsStore?.orderedTabs ?? []).map((tab) => tab.id),
                storeActiveTabId: tabsStore?.activeTabId ?? null,
                storeRecentlyClosedIds: (tabsStore?.recentlyClosed ?? []).map((tab) => tab.id),
                persistedTabIds: Array.isArray(persisted?.tabs) ? persisted.tabs.map((tab) => tab.id) : [],
                persistedRecentlyClosedIds: Array.isArray(persisted?.recentlyClosed)
                  ? persisted.recentlyClosed.map((tab) => tab.id)
                  : [],
                routeArticleId: new window.URLSearchParams(location.search).get('id'),
                selectedArticleId: pinia?._s.get('article')?.selectedArticleId ?? null,
                focusedTabId: document.activeElement?.getAttribute('data-tab-id') ?? null,
              };
            }, secondArticleId, firstArticleId);
            return closeEvidence.closedTabPresent === false
              && closeEvidence.expectedRemainingTabPresent === true
              && closeEvidence.activeDomId !== null
              && closeEvidence.activeDomId === closeEvidence.storeActiveTabId
              && closeEvidence.activeDomId === closeEvidence.routeArticleId
              && closeEvidence.activeDomId === closeEvidence.selectedArticleId
              && closeEvidence.restoreDisabled === false;
          },
          { timeout: 5_000, interval: 100, timeoutMsg: 'closing the active tab did not expose a consistent restore state' },
        );
      } catch (error) {
        throw new Error(`active tab close evidence: ${JSON.stringify(closeEvidence)}`, { cause: error });
      }
      expect(closeEvidence.storeTabIds, 'the first created article remains open after closing the second')
        .to.include(firstArticleId).and.not.include(secondArticleId);
      expect(closeEvidence.storeRecentlyClosedIds, 'the Store records the second article in its restore queue')
        .to.include(secondArticleId);
      expect(closeEvidence.persistedTabIds, 'session persistence removes only the closed article')
        .to.include(firstArticleId).and.not.include(secondArticleId);
      expect(closeEvidence.persistedRecentlyClosedIds, 'session persistence records the real closed article')
        .to.include(secondArticleId);
      expect(closeEvidence.focusedTabId, 'keyboard activation of the close button moves focus to the new active real tab')
        .to.equal(closeEvidence.activeDomId);
      let closePersistence = null;
      await browser.waitUntil(
        async () => {
          closePersistence = await readVersionPersistence(secondArticleId);
          return closePersistence.persistedBodyEncrypted
            && closePersistence.articleBody?.includes(closeFlushText)
            && closePersistence.articleBody?.includes(closeFailureFlushText);
        },
        { timeout: 10_000, interval: 100, timeoutMsg: 'closing immediately did not flush the closed article' },
      );
      expect(
        closePersistence.persistedContentCount,
        `the closed article owns one contents row: ${JSON.stringify(closePersistence.persistedRecords)}`,
      ).to.equal(1);
      expect(closePersistence.persistedBodyEncrypted, 'the closed contents row keeps an encrypted v2 storage body')
        .to.equal(true);
      expect(closePersistence.articleBody, 'closing immediately persists and synchronizes the active article before removal')
        .to.include(closeFlushText);
      expect(closePersistence.articleBody, 'the successful close retry persists text from the rejected close')
        .to.include(closeFailureFlushText);

      const restoreButton = await browser.$('.workstation-tabbar__restore');
      await restoreButton.waitForClickable({ timeout: 5_000 });
      const restoreSourceArticleId = closeEvidence.activeDomId;
      await waitForCurrentDraftReady(restoreSourceArticleId);
      const guardedRestoreBefore = await readWorkstationTabSessionTruth();
      expect(
        await installRouteRejection('Workstation', secondArticleId),
        'the real Vue Router installs a restore rejection guard',
      ).to.equal(true);
      try {
        await restoreButton.click();
        await waitForRouteRejection();
        expect(
          await readWorkstationTabSessionTruth(),
          'a rejected restore preserves route, selection, tabs, restore queue, and session state',
        ).to.deep.equal(guardedRestoreBefore);
      } finally {
        expect(await restoreRouteRejection(), 'the restore guard observed one real navigation attempt').to.equal(1);
      }
      const restoreFlushText = `tab restore flush ${Date.now()}`;
      const restoreSourceEditor = await browser.$('.ProseMirror');
      await focusEditorAtDocumentEnd(restoreSourceEditor, 'restore flush');
      await browser.keys(restoreFlushText);
      await browser.waitUntil(
        async () => browser.execute((activeId) => (
          document.querySelector(`[data-tab-id="${activeId}"]`)?.getAttribute('data-save-state') === 'saving'
        ), restoreSourceArticleId),
        { timeout: 5_000, interval: 50, timeoutMsg: 'the restore source did not expose its pending save state' },
      );

      await browser.waitUntil(
        async () => browser.execute((activeId) => (
          document.querySelector(`[data-tab-id="${activeId}"]`)?.getAttribute('data-save-state') === 'clean'
        ), restoreSourceArticleId),
        { timeout: 10_000, interval: 100, timeoutMsg: 'the restore save-state probe did not settle before failure injection' },
      );
      const restoreFailureFlushText = `restore-rejection-${Date.now()}`;
      const restoreBeforeFailure = await readWorkstationTabSessionTruth();
      expect(await installDataFaultInjection('backup-write'), 'restore failure injection replaces one browser API')
        .to.equal(1);
      try {
        await focusEditorAtDocumentEnd(restoreSourceEditor, 'restore rejection');
        await browser.keys(restoreFailureFlushText);
        await restoreButton.click();
        let restoreRejectedState = null;
        try {
          await browser.waitUntil(
            async () => {
              restoreRejectedState = await readWorkstationFailureTruth(
                restoreSourceArticleId,
                restoreFailureFlushText,
              );
              return restoreRejectedState.routeArticleId === restoreSourceArticleId
                && restoreRejectedState.selectedArticleId === restoreSourceArticleId
                && restoreRejectedState.contentArticleId === restoreSourceArticleId
                && restoreRejectedState.selectedTab === restoreSourceArticleId
                && restoreRejectedState.editorContainsMarker
                && restoreRejectedState.editorStatus === 'error'
                && restoreRejectedState.headerState === 'error'
                && restoreRejectedState.tabState === 'error';
            },
            { timeout: 10_000, interval: 100, timeoutMsg: 'failed restore did not preserve the source tab and restore queue' },
          );
        } catch (error) {
          throw new Error(`restore rejection evidence: ${JSON.stringify(restoreRejectedState)}`, { cause: error });
        }
        assertWorkstationFailureTruth(restoreRejectedState, restoreSourceArticleId, 'failed restore');
        const restoreAfterFailure = await readWorkstationTabSessionTruth();
        expect(restoreAfterFailure, 'failed restore preserves Store, route, DOM, panel, restore queue, and session state')
          .to.deep.equal(restoreBeforeFailure);
      } finally {
        await restoreDataFaultInjection();
      }

      await restoreButton.click();
      await browser.waitUntil(
        async () => browser.execute((restoredId) => (
          new window.URLSearchParams(location.search).get('id') === restoredId
          && document.querySelector(`[data-tab-id="${restoredId}"]`)?.getAttribute('aria-selected') === 'true'
        ), secondArticleId),
        { timeout: 10_000, interval: 100, timeoutMsg: 'restored tab did not reactivate its real article and route' },
      );
      await waitForCurrentDraftReady(secondArticleId);
      const restoredBody = await (await browser.$('.ProseMirror')).getText();
      expect(restoredBody, 'restored content includes the close-time flush').to.include(closeFlushText);
      expect(restoredBody, 'restored content includes text from the rejected close retry')
        .to.include(closeFailureFlushText);
      const restoreSourcePersistence = await readVersionPersistence(restoreSourceArticleId);
      expect(
        restoreSourcePersistence.persistedContentCount,
        `the restore source owns one contents row: ${JSON.stringify(restoreSourcePersistence.persistedRecords)}`,
      ).to.equal(1);
      expect(restoreSourcePersistence.persistedBodyEncrypted, 'the restore source contents row keeps an encrypted v2 storage body')
        .to.equal(true);
      expect(restoreSourcePersistence.articleBody, 'successful restore retry persists and synchronizes the source article first')
        .to.include(restoreFlushText);
      expect(restoreSourcePersistence.articleBody, 'the successful restore retry persists text from the rejected restore')
        .to.include(restoreFailureFlushText);

      await activateWorkstationTabThroughNumberShortcut(restoreSourceArticleId);
      await waitForCurrentDraftReady(restoreSourceArticleId);
      const immediateReloadedRestoreSourceBody = await (await browser.$('.ProseMirror')).getText();
      const immediateRestoreSourcePersistence = await readVersionPersistence(restoreSourceArticleId);
      expect(
        immediateReloadedRestoreSourceBody,
        `the production repository reloads the restore-source flush: ${JSON.stringify(immediateRestoreSourcePersistence.persistedRecords)}`,
      ).to.include(restoreFlushText);
      expect(immediateReloadedRestoreSourceBody, 'the production repository reloads the rejected-restore retry flush')
        .to.include(restoreFailureFlushText);
      await activateWorkstationTabThroughNumberShortcut(secondArticleId);
      await waitForCurrentDraftReady(secondArticleId);

      const layoutBeforeReload = await waitForPersistedLayoutArticle(secondArticleId);
      expect(layoutBeforeReload.persistedOpenArticleIds, 'durable layout contains both real open articles')
        .to.include.members([firstArticleId, secondArticleId]);

      runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
      probeStopped = true;
      await browser.refresh();
      await waitForCurrentDraftReady(secondArticleId);
      await startSmartPunctuationErrorProbe();
      probeStopped = false;
      const layoutAfterReload = await waitForPersistedLayoutArticle(secondArticleId);
      expect(layoutAfterReload.persistedOpenArticleIds, 'both real tabs survive a native WebView reload')
        .to.include.members([firstArticleId, secondArticleId]);

      const reloadedSecondBody = await (await browser.$('.ProseMirror')).getText();
      expect(reloadedSecondBody, 'native reload decrypts the successful close flush').to.include(closeFlushText);
      expect(reloadedSecondBody, 'native reload decrypts the rejected-close retry flush')
        .to.include(closeFailureFlushText);
      await activateWorkstationTabThroughNumberShortcut(firstArticleId);
      await waitForCurrentDraftReady(firstArticleId);
      const reloadedFirstBody = await (await browser.$('.ProseMirror')).getText();
      expect(reloadedFirstBody, 'native reload decrypts the source switch flush').to.include(switchFlushText);
      expect(reloadedFirstBody, 'native reload decrypts the rejected-route retry flush')
        .to.include(routeSwitchFlushText);
      if (restoreSourceArticleId === firstArticleId) {
        expect(reloadedFirstBody, 'native reload decrypts the restore-source flush').to.include(restoreFlushText);
        expect(reloadedFirstBody, 'native reload decrypts the rejected-restore retry flush')
          .to.include(restoreFailureFlushText);
      } else {
        await activateWorkstationTabThroughNumberShortcut(restoreSourceArticleId);
        await waitForCurrentDraftReady(restoreSourceArticleId);
        const reloadedRestoreSourceBody = await (await browser.$('.ProseMirror')).getText();
        expect(reloadedRestoreSourceBody, 'native reload decrypts the restore-source flush')
          .to.include(restoreFlushText);
        expect(reloadedRestoreSourceBody, 'native reload decrypts the rejected-restore retry flush')
          .to.include(restoreFailureFlushText);
      }
      await activateWorkstationTabThroughNumberShortcut(secondArticleId);
      await waitForCurrentDraftReady(secondArticleId);

      evidence = await browser.execute(() => ({
        domIds: Array.from(document.querySelectorAll('.workstation-tabbar [data-tab-id]'))
          .map((tab) => tab.getAttribute('data-tab-id')),
        activeDomId: document.querySelector('.workstation-tabbar [aria-selected="true"]')
          ?.getAttribute('data-tab-id') ?? null,
        visibleButtonsWithoutType: Array.from(document.querySelectorAll('.workstation-tabbar button'))
          .filter((button) => button.getClientRects().length > 0 && button.getAttribute('type') !== 'button')
          .length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(evidence.domIds, 'reloaded tab bar keeps both real ids').to.include.members([firstArticleId, secondArticleId]);
      expect(evidence.activeDomId, 'reloaded tab bar keeps the restored article active').to.equal(secondArticleId);
      expect(evidence.visibleButtonsWithoutType, 'tab bar buttons keep explicit non-submit semantics').to.equal(0);
      expect(evidence.overflow, 'the mounted tab bar does not add horizontal overflow').to.be.at.most(0);

      runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
      probeStopped = true;
      expect(runtimeErrors, 'tab pin, route, close, restore, and reload emit no fresh runtime errors').to.deep.equal([]);
    } finally {
      await restoreRouteRejection();
      if (!probeStopped) await stopSmartPunctuationErrorProbe();
      if (secondArticleId) await closeWorkstationTabThroughShortcut(secondArticleId);
      if (firstArticleId) await closeWorkstationTabThroughShortcut(firstArticleId);
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
      await editor.waitForDisplayed({ timeout: 10_000, interval: 200 });
      await browser.execute((surface) => {
        surface.scrollIntoView({ block: 'center', inline: 'center' });
        surface.focus();
      }, editor);
      await browser.waitUntil(
        async () => browser.execute(() => document.activeElement?.classList.contains('ProseMirror') ?? false),
        { timeout: 5_000, interval: 100, timeoutMsg: 'writing-goal editor surface did not receive focus' },
      );
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

  async function verifySettingsTransfer() {
    this.timeout(120_000);
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'inkforge-settings-import-'));
    const settingsPath = path.join(tempDirectory, 'settings.json');
    const runtimeErrors = [];

    fs.writeFileSync(settingsPath, '{"schemaVersion":', 'utf8');
    await startSmartPunctuationErrorProbe();
    let errorProbeActive = true;
    let rollbackNeeded = false;

    try {
      await openRoute('/settings?tab=data', '[data-settings-tab="data"]');
      const before = await readSettingsTransferEvidence();
      expect(before.ui.importInputExists, 'the real Settings file input remains addressable').to.equal(true);
      expect(before.ui.importInputAccept, 'the Settings input accepts JSON files').to.equal('application/json,.json');
      expect(before.ui.importInputAriaHidden, 'the hidden picker is not duplicated in the accessibility tree')
        .to.equal('true');
      expect(before.ui.importInputTabIndex, 'the hidden picker is excluded from keyboard tab order').to.equal(-1);
      expect(before.exportedJson, 'the production store exports Settings JSON').to.be.a('string').and.not.equal('');

      const exportButton = await browser.$('[data-settings-action="export"]');
      await exportButton.waitForDisplayed({ timeout: 5_000 });
      await browser.execute((button) => {
        button.scrollIntoView({ block: 'center', inline: 'nearest' });
        button.focus();
      }, exportButton);
      await browser.waitUntil(
        async () => browser.execute(() => document.activeElement?.matches('[data-settings-action="export"]') ?? false),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Settings export action did not receive focus' },
      );
      await browser.keys('Enter');
      await browser.waitUntil(
        async () => (await readSettingsTransferEvidence()).store.exportHistory.length
          === Math.min(before.store.exportHistory.length + 1, 10),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Settings export did not write the real export history' },
      );
      const exported = await readSettingsTransferEvidence();
      expect(exported.store.exportHistory[0], 'the visible export action records the generated Settings Blob')
        .to.include({ title: 'Settings JSON', action: 'download' });
      expect(exported.store.exportHistory[0]?.bytes, 'the generated Settings JSON Blob is non-empty')
        .to.be.greaterThan(0);
      expect(exported.persisted.exportHistory[0], 'the Settings export history persists immediately')
        .to.deep.equal(exported.store.exportHistory[0]);

      await browser.execute(() => {
        const input = document.querySelector('[data-settings-import-input]');
        window.__inkforgeSettingsImportPickerClicks = 0;
        input?.addEventListener('click', () => {
          window.__inkforgeSettingsImportPickerClicks += 1;
        });
      });
      const importInput = await browser.$('[data-settings-import-input]');
      await activateSettingsImport();
      await importInput.addValue(settingsPath);
      await browser.waitUntil(
        async () => (await readSettingsTransferEvidence()).ui.feedbackText
          === 'Settings JSON 解析失败，请确认文件内容完整。',
        { timeout: 5_000, interval: 100, timeoutMsg: 'invalid Settings JSON did not surface parse feedback' },
      );
      const afterInvalid = await readSettingsTransferEvidence();
      expect(afterInvalid.ui.feedbackType, 'invalid Settings JSON is visibly rejected').to.equal('error');
      expect(afterInvalid.store.reducedMotion, 'invalid Settings JSON leaves live settings unchanged')
        .to.equal(before.store.reducedMotion);
      expect(afterInvalid.store.snapshots, 'invalid Settings JSON creates no rollback point')
        .to.deep.equal(before.store.snapshots);
      expect(afterInvalid.ui.importPickerClickCount, 'the visible Import action opened the production picker')
        .to.equal(1);
      expect(afterInvalid.ui.importValueCleared, 'the failed file selection is cleared for same-path retry')
        .to.equal(true);

      const candidate = JSON.parse(exported.exportedJson);
      candidate.appearance.reducedMotion = !before.store.reducedMotion;
      fs.writeFileSync(settingsPath, JSON.stringify(candidate, null, 2), 'utf8');

      await activateSettingsImport();
      await importInput.addValue(settingsPath);
      await confirmSettingsAction('IMPORT');
      await browser.waitUntil(
        async () => {
          const current = await readSettingsTransferEvidence();
          return current.store.reducedMotion === !before.store.reducedMotion
            && current.persisted.reducedMotion === !before.store.reducedMotion
            && current.store.snapshots[0]?.reason?.startsWith('import:v');
        },
        { timeout: 10_000, interval: 100, timeoutMsg: 'valid Settings import did not persist with a rollback point' },
      );
      rollbackNeeded = true;
      const imported = await readSettingsTransferEvidence();
      expect(imported.ui.feedbackType, 'valid Settings JSON reports visible success').to.equal('success');
      expect(imported.ui.importPickerClickCount, 'the same visible Import action accepts the same path again')
        .to.equal(2);
      expect(imported.ui.importValueCleared, 'the successful file selection is also cleared').to.equal(true);
      expect(imported.store.snapshots, 'a successful import retains a bounded local rollback ledger')
        .to.have.length(Math.min(before.store.snapshots.length + 1, 10));
      expect(before.store.snapshots.map((snapshot) => snapshot.id), 'the import rollback point is newly created')
        .not.to.include(imported.store.snapshots[0]?.id);
      expect(imported.persisted.snapshots, 'the complete rollback ledger persists immediately')
        .to.deep.equal(imported.store.snapshots);

      await openRoute('/settings?tab=appearance', '[data-settings-tab="appearance"]');
      const reducedMotionInput = await browser.$('input[aria-label="减弱动效"]');
      expect(await reducedMotionInput.isSelected(), 'the imported value reaches the visible Appearance control')
        .to.equal(!before.store.reducedMotion);

      runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
      errorProbeActive = false;
      await browser.refresh();
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="appearance"]'))),
        { timeout: 10_000, interval: 200, timeoutMsg: 'Appearance settings did not recover after import reload' },
      );
      await startSmartPunctuationErrorProbe();
      errorProbeActive = true;
      const reloadedImport = await readSettingsTransferEvidence();
      expect(reloadedImport.store.reducedMotion, 'the imported value survives reload in Pinia')
        .to.equal(!before.store.reducedMotion);
      expect(reloadedImport.persisted.reducedMotion, 'the imported value survives reload in localStorage')
        .to.equal(!before.store.reducedMotion);
      expect(reloadedImport.ui.reducedMotionChecked, 'the reloaded visible control matches persisted Settings')
        .to.equal(!before.store.reducedMotion);

      await openRoute('/settings?tab=about', '[data-settings-tab="about"]');
      const restoreLatest = await browser.$('[data-migration-action="restore-latest"]');
      await restoreLatest.waitForDisplayed({ timeout: 5_000 });
      await restoreLatest.click();
      await confirmSettingsAction('RESTORE');
      await browser.waitUntil(
        async () => {
          const current = await readSettingsTransferEvidence();
          return current.store.reducedMotion === before.store.reducedMotion
            && current.persisted.reducedMotion === before.store.reducedMotion;
        },
        { timeout: 10_000, interval: 100, timeoutMsg: 'the import rollback point did not restore original Settings' },
      );
      rollbackNeeded = false;

      runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
      errorProbeActive = false;
      await browser.refresh();
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="about"]'))),
        { timeout: 10_000, interval: 200, timeoutMsg: 'About settings did not recover after rollback reload' },
      );
      await startSmartPunctuationErrorProbe();
      errorProbeActive = true;
      const reloadedRollback = await readSettingsTransferEvidence();
      expect(reloadedRollback.store.reducedMotion, 'rollback survives reload in Pinia')
        .to.equal(before.store.reducedMotion);
      expect(reloadedRollback.persisted.reducedMotion, 'rollback survives reload in localStorage')
        .to.equal(before.store.reducedMotion);
      expect(reloadedRollback.store.snapshots, 'rollback preserves the local snapshot ledger')
        .to.deep.equal(imported.store.snapshots);
    } finally {
      if (errorProbeActive) runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
      if (rollbackNeeded) {
        const restored = await browser.execute(() => {
          const root = document.getElementById('app');
          const provides = root?.__vue_app__?._context?.provides;
          const pinia = provides
            ? Object.getOwnPropertySymbols(provides)
              .map((symbol) => provides[symbol])
              .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
            : null;
          return pinia?._s.get('settings')?.restoreLatestRollbackPoint?.() ?? false;
        });
        if (!restored) runtimeErrors.push({ type: 'cleanup', message: 'Settings rollback cleanup failed' });
      }
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }

    expect(runtimeErrors, 'Settings export, invalid import, valid import, reload, and rollback emit no fresh runtime errors')
      .to.deep.equal([]);
  }

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
    expect(racePersistence.persistedBodyEncrypted, 'the concurrent contents row keeps an encrypted v2 storage body')
      .to.equal(true);
    expect(racePersistence.articleBody, 'concurrent body state remains identical across editor and article stores')
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

  it('validates, persists, blocks, and uninstalls local extensions through real registry boundaries', async function () {
    this.timeout(90_000);
    await openRoute('/settings?tab=extensions', '[data-settings-tab="extensions"]');
    const extensionId = `local.settings-audit-${Date.now()}`;
    const manifest = {
      id: extensionId,
      name: 'InkForge Settings Audit Extension',
      version: '1.0.0',
      author: 'local',
      description: 'Exercises the real local extension registry without executing third-party code.',
      entry: './dist/index.js',
      inkforgeVersion: '>=0.1.0',
      permissions: ['storage:read', 'ui:command'],
      sandboxLevel: 'strict',
      commandPermissions: ['document.read'],
    };
    const before = await readExtensionRegistryEvidence(extensionId);
    const textarea = await browser.$('textarea[aria-label="扩展 manifest JSON"]');
    const installButton = await browser.$('[data-extension-action="install"]');
    let runtimeErrors;

    await startSmartPunctuationErrorProbe();
    try {
      await textarea.setValue(JSON.stringify({ ...manifest, id: 'Bad.Id' }, null, 2));
      await installButton.click();
      await browser.waitUntil(
        async () => browser.execute(() => (
          document.querySelector('[data-settings-tab="extensions"] .sv-feedback.error')?.textContent?.trim().length ?? 0
        ) > 0),
        { timeout: 10_000, interval: 100, timeoutMsg: 'invalid extension manifest did not surface validation feedback' },
      );
      const invalid = await readExtensionRegistryEvidence('Bad.Id');
      expect(invalid.live, 'an invalid manifest never enters the live extension registry').to.equal(null);
      expect(invalid.persisted, 'an invalid manifest never enters IndexedDB').to.equal(null);
      expect(invalid.installedCount, 'invalid validation leaves the installed count unchanged')
        .to.equal(before.installedCount);

      await textarea.setValue(JSON.stringify(manifest, null, 2));
      await installButton.click();
      await browser.waitUntil(
        async () => (await readExtensionRegistryEvidence(extensionId)).live?.status === 'installed',
        { timeout: 10_000, interval: 100, timeoutMsg: 'valid local manifest did not reach the real extension registry' },
      );
      const installed = await readExtensionRegistryEvidence(extensionId);
      expect(installed.installedCount, 'real manifest install increments the profile registry count')
        .to.equal(before.installedCount + 1);
      expect(installed.live, 'the live extension record retains the validated permissions').to.deep.include({
        extensionId,
        status: 'installed',
        enabled: false,
        grantedPermissions: ['storage:read', 'ui:command'],
        commandPermissions: ['document.read'],
      });
      expect(installed.persisted, 'the complete lifecycle fields cross the real IndexedDB boundary')
        .to.deep.equal(installed.live);
      expect(installed.ui?.permissionChips, 'permission chips reflect the persisted extension record')
        .to.include.members(['storage / read', 'ui / command', 'command: document.read']);
      expect(installed.auditActions, 'real extension install writes a durable success audit row')
        .to.deep.include({ action: 'system.plugin_install', outcome: 'success' });
      expect(installed.storageCount, 'install does not fabricate extension storage').to.equal(0);

      const toggleButton = await browser.$(`[data-extension-id="${extensionId}"] [data-extension-action="toggle"]`);
      await toggleButton.click();
      await browser.waitUntil(
        async () => (await readExtensionRegistryEvidence(extensionId)).persisted?.status === 'blocked',
        { timeout: 10_000, interval: 100, timeoutMsg: 'unavailable Worker runtime did not persist a blocked lifecycle state' },
      );
      const blocked = await readExtensionRegistryEvidence(extensionId);
      expect(blocked.live, 'runtime activation fails closed without a fake enabled state').to.deep.include({
        extensionId,
        status: 'blocked',
        enabled: false,
        runtimeBlockedReason: 'extension-runtime-unavailable',
      });
      expect(blocked.persisted, 'the blocked state is durable and matches the live store').to.deep.equal(blocked.live);
      expect(blocked.blockedCount, 'the real blocked count includes the unavailable runtime')
        .to.equal(before.blockedCount + 1);
      expect(blocked.ui?.text, 'the UI explains the exact fail-closed runtime reason')
        .to.include('extension-runtime-unavailable');
      expect(blocked.auditActions, 'runtime denial writes a durable failure audit row')
        .to.deep.include({ action: 'system.plugin_enable', outcome: 'failure' });

      const uninstallButton = await browser.$(`[data-extension-id="${extensionId}"] [data-extension-action="uninstall"]`);
      await uninstallButton.click();
      await browser.waitUntil(
        async () => {
          const current = await readExtensionRegistryEvidence(extensionId);
          return current.live === null && current.persisted === null;
        },
        { timeout: 10_000, interval: 100, timeoutMsg: 'extension uninstall did not clear the live and persisted records' },
      );
      const removed = await readExtensionRegistryEvidence(extensionId);
      expect(removed.installedCount, 'uninstall restores the original registry count').to.equal(before.installedCount);
      expect(removed.storageCount, 'uninstall leaves no extension storage records').to.equal(0);
      expect(removed.ui, 'the uninstalled extension card disappears').to.equal(null);
      expect(removed.auditActions, 'real uninstall writes a durable success audit row')
        .to.deep.include({ action: 'system.plugin_uninstall', outcome: 'success' });
    } finally {
      const cleanup = await cleanupExtension(extensionId);
      expect(cleanup.error, 'extension cleanup remains on the production uninstall path').to.equal(null);
      runtimeErrors = await stopSmartPunctuationErrorProbe();
    }
    expect(runtimeErrors, 'extension validation and lifecycle actions emit no fresh runtime errors').to.deep.equal([]);
  });

  it('records, rejects conflicts, persists, and resets shortcuts through the real Settings UI', async function () {
    this.timeout(90_000);
    await openRoute('/settings?tab=shortcuts', '[data-settings-tab="shortcuts"]');
    const shortcutIds = ['toggleSidebar', 'togglePreview'];
    const initial = await readShortcutRegistryEvidence(shortcutIds);
    const candidate = ['Ctrl+Shift+Y', 'Ctrl+Shift+U', 'Ctrl+Shift+J', 'Ctrl+Shift+K']
      .find((binding) => !Object.values(initial.allStore).includes(binding));
    expect(candidate, 'the test finds a real unused shortcut without overwriting another action').to.be.a('string');
    expect(initial.searchAriaLabel, 'the shortcut search input has an accessible name').to.equal('搜索快捷键');
    expect(initial.visible.toggleSidebar?.ariaLabel, 'the recorder identifies the action it changes')
      .to.equal('录制切换侧栏快捷键');
    let runtimeErrors;

    await startSmartPunctuationErrorProbe();
    try {
      const beforeFocusLoss = await readShortcutRegistryEvidence(shortcutIds);
      await beginShortcutRecording('toggleSidebar');
      const searchInput = await browser.$('input[aria-label="搜索快捷键"]');
      await searchInput.click();
      await browser.waitUntil(
        async () => browser.execute(() => (
          !document.querySelector('[data-shortcut-id="toggleSidebar"]')
            ?.classList.contains('shortcut-input__trigger--recording')
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'recorder did not stop after focus moved to search' },
      );
      await sendShortcutBinding(candidate);
      expect((await readShortcutRegistryEvidence(shortcutIds)).store.toggleSidebar,
        'real control focus departure disarms the recorder before later key input')
        .to.equal(beforeFocusLoss.store.toggleSidebar);
      await searchInput.setValue('');

      const nativeFocusLoss = await exerciseNativeWindowFocusLoss('toggleSidebar');
      expect(nativeFocusLoss.recording, 'native window focus loss disarms the recorder').to.equal(false);
      expect((await readShortcutRegistryEvidence(shortcutIds)).store.toggleSidebar,
        'native window focus loss never mutates the binding')
        .to.equal(beforeFocusLoss.store.toggleSidebar);

      await recordShortcut('toggleSidebar', candidate);
      await browser.waitUntil(
        async () => (await readShortcutRegistryEvidence(shortcutIds)).store.toggleSidebar === candidate,
        { timeout: 5_000, interval: 100, timeoutMsg: 'shortcut recording did not update the live settings store' },
      );

      await recordShortcut('togglePreview', candidate);
      await browser.waitUntil(
        async () => (await readShortcutRegistryEvidence(shortcutIds)).visible.togglePreview?.conflict.includes('切换侧栏'),
        { timeout: 5_000, interval: 100, timeoutMsg: 'duplicate shortcut recording did not show the conflicting action' },
      );
      const conflicted = await readShortcutRegistryEvidence(shortcutIds);
      expect(conflicted.store.togglePreview, 'a conflict never mutates the competing shortcut')
        .to.equal(initial.store.togglePreview);
      expect(conflicted.store.toggleSidebar, 'the accepted shortcut remains active after a rejected conflict')
        .to.equal(candidate);
      expect(conflicted.duplicateText, 'rejected input never creates a persisted duplicate binding').to.equal('');
      await browser.keys('Escape');

      await browser.pause(5_200);
      await browser.refresh();
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="shortcuts"]'))),
        { timeout: 10_000, interval: 200, timeoutMsg: 'shortcut settings did not recover after reload' },
      );
      const persisted = await readShortcutRegistryEvidence(shortcutIds);
      expect(persisted.store.toggleSidebar, 'the recorded binding survives reload in the live store').to.equal(candidate);
      expect(persisted.persisted.toggleSidebar, 'the recorded binding survives the debounced localStorage write')
        .to.equal(candidate);
      expect(persisted.visible.toggleSidebar?.binding, 'the shortcut recorder renders the persisted binding')
        .to.equal(candidate);

      const persistedSearchInput = await browser.$('input[aria-label="搜索快捷键"]');
      await persistedSearchInput.setValue('切换侧栏');
      await browser.waitUntil(
        async () => (await readShortcutRegistryEvidence(shortcutIds)).visibleItemCount === 1,
        { timeout: 5_000, interval: 100, timeoutMsg: 'shortcut search did not filter the real registry list' },
      );
      await persistedSearchInput.setValue('');

      await clickShortcutReset('toggleSidebar');
      await browser.waitUntil(
        async () => (await readShortcutRegistryEvidence(shortcutIds)).store.toggleSidebar === 'Ctrl+Shift+B',
        { timeout: 5_000, interval: 100, timeoutMsg: 'per-shortcut reset did not restore the default binding' },
      );
      await browser.refresh();
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="shortcuts"]'))),
        { timeout: 10_000, interval: 200, timeoutMsg: 'shortcut settings did not recover after individual reset' },
      );
      const individuallyReset = await readShortcutRegistryEvidence(shortcutIds);
      expect(individuallyReset.persisted.toggleSidebar, 'individual reset saves immediately').to.equal('Ctrl+Shift+B');

      await recordShortcut('toggleSidebar', candidate);
      await browser.waitUntil(
        async () => (await readShortcutRegistryEvidence(shortcutIds)).store.toggleSidebar === candidate,
        { timeout: 5_000, interval: 100, timeoutMsg: 'shortcut did not change before the global reset proof' },
      );
      const resetAllButton = await browser.$('.sv-shortcuts-footer button');
      await resetAllButton.click();
      await browser.waitUntil(
        async () => (await readShortcutRegistryEvidence(shortcutIds)).store.toggleSidebar === 'Ctrl+Shift+B',
        { timeout: 5_000, interval: 100, timeoutMsg: 'global shortcut reset did not restore defaults' },
      );
      await browser.refresh();
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('[data-settings-tab="shortcuts"]'))),
        { timeout: 10_000, interval: 200, timeoutMsg: 'shortcut settings did not recover after global reset' },
      );
      const reset = await readShortcutRegistryEvidence(shortcutIds);
      expect(reset.store.toggleSidebar, 'global reset restores the live default').to.equal('Ctrl+Shift+B');
      expect(reset.persisted.toggleSidebar, 'global reset persists the default immediately').to.equal('Ctrl+Shift+B');
      expect(reset.duplicateText, 'the default registry contains no shortcut conflicts').to.equal('');
    } finally {
      runtimeErrors = await stopSmartPunctuationErrorProbe();
    }
    expect(runtimeErrors, 'shortcut recording, conflict, persistence, and reset emit no fresh runtime errors')
      .to.deep.equal([]);
  });

  it('routes, persists, samples, previews, rolls back, and resets About settings through real boundaries', async function () {
    this.timeout(120_000);
    const runtimeErrors = [];
    await startSmartPunctuationErrorProbe();
    try {
      await openRoute('/settings?tab=about', '[data-settings-tab="about"]');
      const settingsSearch = await browser.$('#settings-search-input');
      await settingsSearch.setValue('Feature Flags');
      await browser.pause(100);
      const featureSearchEvidence = await browser.execute(() => ({
        value: document.querySelector('#settings-search-input')?.value ?? null,
        results: Array.from(document.querySelectorAll('[data-settings-search-result]')).map((element) => ({
          id: element.getAttribute('data-settings-search-result'),
          label: element.querySelector('.sv-settings-search-result__label')?.textContent?.trim() ?? '',
        })),
      }));
      expect(featureSearchEvidence.value, 'visible search input receives the requested query').to.equal('Feature Flags');
      expect(featureSearchEvidence.results, 'the real Settings registry returns the Feature Flags row')
        .to.deep.include({ id: 'about.featureFlags', label: 'Feature Flags' });
      const featureResult = await browser.$('[data-settings-search-result="about.featureFlags"]');
      await featureResult.waitForDisplayed({ timeout: 5_000 });
      await featureResult.click();
      await browser.waitUntil(
        async () => browser.execute(() => new window.URLSearchParams(window.location.search).get('tab') === 'ai'),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Feature Flags search result did not route to the real AI tab' },
      );
      const featureSection = await browser.$('[data-settings-entry="about.featureFlags"]');
      await featureSection.waitForDisplayed({ timeout: 5_000 });

      await settingsSearch.setValue('代理设置');
      const proxyResult = await browser.$('[data-settings-search-result="about.proxy"]');
      await proxyResult.waitForDisplayed({ timeout: 5_000 });
      await proxyResult.click();
      const proxySection = await browser.$('[data-settings-entry="about.proxy"]');
      await proxySection.waitForDisplayed({ timeout: 5_000 });
      expect(await browser.execute(() => new window.URLSearchParams(window.location.search).get('tab')),
        'proxy registry navigation stays on the tab that owns the real controls')
        .to.equal('ai');

      await openRoute('/settings?tab=about', '[data-settings-tab="about"]');
      const createSnapshot = await browser.$('[data-migration-action="create"]');
      await createSnapshot.waitForDisplayed({ timeout: 5_000 });
      const initial = await readAboutSettingsEvidence();
      expect(initial.store.schemaVersion, 'live Settings schema is current')
        .to.equal(initial.ui.currentSchemaVersion);
      expect(initial.ui.schemaVersion, 'visible migration card shows the current schema')
        .to.equal(initial.ui.currentSchemaVersion);
      expect(initial.ui.currentSchemaVersion, 'current Settings schema is a positive integer')
        .to.be.a('number').and.greaterThan(0);
      await createSnapshot.click();
      await browser.waitUntil(
        async () => (await readAboutSettingsEvidence()).store.snapshots.length === initial.store.snapshots.length + 1,
        { timeout: 5_000, interval: 100, timeoutMsg: 'manual Settings snapshot was not created' },
      );
      const withSnapshot = await readAboutSettingsEvidence();
      const createdSnapshot = withSnapshot.store.snapshots[0];
      expect(createdSnapshot.reason, 'the visible action creates the expected real rollback point').to.equal('manual:about');
      expect(withSnapshot.persisted.snapshots[0]?.id, 'snapshot persistence is immediate').to.equal(createdSnapshot.id);
      expect(withSnapshot.persisted.schemaVersion, 'the first visible Settings write persists the current schema')
        .to.equal(withSnapshot.ui.currentSchemaVersion);

      const targetLogLevel = initial.store.logLevel === 'warn' ? 'debug' : 'warn';
      const logLevelSelect = await browser.$('[data-about-log-level]');
      await logLevelSelect.selectByAttribute('value', targetLogLevel);
      await browser.waitUntil(
        async () => {
          const evidence = await readAboutSettingsEvidence();
          return evidence.store.logLevel === targetLogLevel && evidence.ui.runtimeLogLevel === targetLogLevel;
        },
        { timeout: 5_000, interval: 100, timeoutMsg: 'log level did not reach the runtime logger boundary' },
      );

      await openRoute('/settings?tab=ai', '[data-settings-tab="ai"]');
      await featureSection.waitForDisplayed({ timeout: 5_000 });
      const targetFlags = Object.fromEntries(ABOUT_FEATURE_FLAG_KEYS.map((key) => [
        key,
        key === 'performance-metrics' ? true : !initial.store.featureFlags[key],
      ]));
      for (const key of ABOUT_FEATURE_FLAG_KEYS.filter((candidate) => candidate !== 'performance-metrics')) {
        await setCheckboxThroughUi(`[data-feature-flag="${key}"]`, targetFlags[key]);
      }
      if (initial.store.featureFlags['performance-metrics']) {
        await setCheckboxThroughUi('[data-feature-flag="performance-metrics"]', false);
      }
      await setCheckboxThroughUi('[data-feature-flag="performance-metrics"]', true);
      await browser.waitUntil(
        async () => {
          const evidence = await readAboutSettingsEvidence();
          return evidence.performance.databaseSampleCount > initial.performance.databaseSampleCount
            && evidence.performance.storeSampleCount > 0
            && evidence.performance.collecting === true;
        },
        { timeout: 20_000, interval: 250, timeoutMsg: 'performance flag did not write real IndexedDB samples' },
      );

      await setCheckboxThroughUi('[data-proxy-field="enabled"]', true);
      const proxyHost = await browser.$('[data-proxy-field="host"]');
      await proxyHost.setValue('');
      await browser.waitUntil(
        async () => (await readAboutSettingsEvidence()).ui.proxyStatus === 'invalid',
        { timeout: 5_000, interval: 100, timeoutMsg: 'empty enabled proxy did not surface invalid status' },
      );
      const proxyProtocol = await browser.$('[data-proxy-field="protocol"]');
      const proxyPort = await browser.$('[data-proxy-field="port"]');
      const proxyUsername = await browser.$('[data-proxy-field="username"]');
      const proxyPassword = await browser.$('[data-proxy-field="password"]');
      await proxyProtocol.selectByAttribute('value', 'socks5');
      await proxyPort.setValue('7890');
      await proxyHost.setValue('127.0.0.1');
      await proxyUsername.setValue('acceptance-user');
      await proxyPassword.setValue('acceptance-secret');
      await browser.waitUntil(
        async () => (await readAboutSettingsEvidence()).ui.proxyStatus === 'ready',
        { timeout: 5_000, interval: 100, timeoutMsg: 'valid proxy fields did not reach ready preview status' },
      );
      const readyProxy = await readAboutSettingsEvidence();
      expect(readyProxy.ui.proxyMessage, 'proxy preview masks visible credentials')
        .to.include('socks5://***:***@127.0.0.1:7890');
      expect(readyProxy.ui.proxyMessage, 'proxy preview never renders the entered secret')
        .not.to.include('acceptance-secret');

      await browser.pause(5_200);
      runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
      await browser.refresh();
      await (await browser.$('[data-settings-entry="about.featureFlags"]')).waitForDisplayed({ timeout: 10_000 });
      await startSmartPunctuationErrorProbe();
      const persisted = await readAboutSettingsEvidence();
      const targetProxy = {
        enabled: true,
        protocol: 'socks5',
        host: '127.0.0.1',
        port: 7890,
        username: 'acceptance-user',
        password: 'acceptance-secret',
      };
      expect(persisted.store.logLevel, 'log level survives reload in Pinia').to.equal(targetLogLevel);
      expect(persisted.persisted.logLevel, 'log level survives the production debounce').to.equal(targetLogLevel);
      expect(persisted.ui.runtimeLogLevel, 'the runtime logger badge matches persisted state').to.equal(targetLogLevel);
      expect(persisted.store.featureFlags, 'all live feature flags retain their selected values').to.deep.equal(targetFlags);
      expect(persisted.persisted.featureFlags, 'all feature flags survive reload').to.deep.equal(targetFlags);
      for (const key of ABOUT_FEATURE_FLAG_KEYS) {
        expect(persisted.ui.featureFlags[key]?.checked, `${key} switch reflects the persisted value`)
          .to.equal(targetFlags[key]);
        expect(persisted.ui.featureFlags[key]?.consumer, `${key} exposes an honest consumer classification`)
          .to.equal(key === 'performance-metrics' ? 'performance-slo' : 'reserved');
      }
      expect(persisted.store.proxy, 'proxy fields survive reload in Pinia').to.deep.equal(targetProxy);
      expect(persisted.persisted.proxy, 'proxy fields survive the production debounce').to.deep.equal(targetProxy);
      expect(persisted.ui.proxyStatus, 'reloaded proxy preview remains ready without claiming connectivity').to.equal('ready');
      expect(persisted.ui.performanceEnabled, 'performance panel is controlled by the persisted flag').to.equal('true');
      expect(persisted.performance.databaseSampleCount, 'the SLO ledger contains real samples after reload')
        .to.be.greaterThan(initial.performance.databaseSampleCount);
      expect(Number(persisted.ui.performanceSampleCount), 'the visible SLO count reflects the production store')
        .to.equal(persisted.performance.storeSampleCount);

      const expectedUnsupported = persisted.performance.supportMatrix
        .filter((item) => item.supportState !== 'supported');
      expect(persisted.performance.supportMatrix, 'the production collector exposes its runtime support matrix')
        .not.to.be.empty;
      expect(persisted.performance.unsupportedCapabilities, 'limited and unsupported capabilities are derived from the support matrix')
        .to.deep.equal(expectedUnsupported);
      expect(persisted.performance.unsupportedCapabilities, 'the current WebView2 reports real limited or unsupported capabilities')
        .not.to.be.empty;
      expect(persisted.ui.performanceUnsupportedCapabilities, 'the visible performance card reports the same capability limits')
        .to.deep.equal(expectedUnsupported.map((item) => ({
          key: item.key,
          supportState: item.supportState,
          text: `${item.label}: ${item.reason}`,
        })));

      const defaultFlags = {
        'markdown-hints': true,
        'multi-tab': false,
        'ai-autocomplete': false,
        'performance-metrics': false,
      };
      const defaultProxy = {
        enabled: false,
        protocol: 'http',
        host: '',
        port: 7890,
        username: '',
        password: '',
      };
      const defaultUpdater = {
        autoCheckDisabled: false,
        lastCheckAt: null,
        lastSuccessfulCheckAt: null,
        lastStatus: 'idle',
        lastDisabledReason: null,
        lastErrorMessage: null,
        latest: null,
        notifiedVersions: [],
      };
      const resetAiTab = await browser.$('[data-settings-action="reset-current-tab"]');
      await resetAiTab.waitForDisplayed({ timeout: 5_000 });
      await browser.execute((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }), resetAiTab);
      await resetAiTab.waitForClickable({ timeout: 5_000 });
      await resetAiTab.click();
      await confirmSettingsAction('RESET');
      await browser.waitUntil(
        async () => (await readAboutSettingsEvidence()).store.snapshots[0]?.reason === 'reset-tab:ai',
        { timeout: 10_000, interval: 150, timeoutMsg: 'AI tab reset did not create its rollback point' },
      );
      const aiReset = await readAboutSettingsEvidence();
      expect(aiReset.store.featureFlags, 'AI reset restores default feature flags').to.deep.equal(defaultFlags);
      expect(aiReset.store.proxy, 'AI reset restores default proxy fields').to.deep.equal(defaultProxy);
      expect(aiReset.persisted.featureFlags, 'AI reset persists default feature flags').to.deep.equal(defaultFlags);
      expect(aiReset.persisted.proxy, 'AI reset persists default proxy fields').to.deep.equal(defaultProxy);
      expect(aiReset.store.logLevel, 'AI reset does not change the About-owned log level').to.equal(targetLogLevel);
      expect(aiReset.store.snapshots[0]?.reason, 'AI reset creates a rollback point for its real ownership boundary')
        .to.equal('reset-tab:ai');

      await openRoute('/settings?tab=about', '[data-settings-tab="about"]');
      await browser.waitUntil(
        async () => (await readAboutSettingsEvidence()).performance.collecting === false,
        { timeout: 5_000, interval: 100, timeoutMsg: 'disabled performance flag did not stop the production collector' },
      );
      const disabledPerformance = await readAboutSettingsEvidence();
      expect(disabledPerformance.ui.performanceSectionVisible, 'disabled performance remains visibly addressable')
        .to.equal(true);
      expect(disabledPerformance.ui.performanceEnabled, 'AI reset disables the performance collector flag')
        .to.equal('false');
      expect(disabledPerformance.ui.performanceLedgerVisible, 'disabled performance does not present a live ledger')
        .to.equal(false);
      expect(disabledPerformance.performance.collecting, 'disabled performance stops the production collector')
        .to.equal(false);

      const restoreLatest = await browser.$('[data-migration-action="restore-latest"]');
      await restoreLatest.waitForDisplayed({ timeout: 5_000 });
      await restoreLatest.click();
      await confirmSettingsAction('RESTORE');
      await browser.waitUntil(
        async () => {
          const evidence = await readAboutSettingsEvidence();
          return evidence.store.featureFlags['performance-metrics'] === true
            && evidence.store.proxy.enabled === true;
        },
        { timeout: 10_000, interval: 150, timeoutMsg: 'AI reset rollback point did not restore its visible sentinels' },
      );
      const aiRollback = await readAboutSettingsEvidence();
      expect(aiRollback.store.logLevel, 'AI rollback preserves the selected About log level').to.equal(targetLogLevel);
      expect(aiRollback.store.featureFlags, 'AI rollback restores all selected feature flags').to.deep.equal(targetFlags);
      expect(aiRollback.store.proxy, 'AI rollback restores all selected proxy fields').to.deep.equal(targetProxy);

      await openRoute('/settings?tab=advanced', '[data-settings-tab="advanced"]');
      const customCssSnippet = await browser.$('.sv-custom-css-snippet');
      await customCssSnippet.waitForDisplayed({ timeout: 5_000 });
      await customCssSnippet.selectByIndex(1);
      await browser.waitUntil(
        async () => {
          const evidence = await readAboutSettingsEvidence();
          return evidence.store.customCss?.draft
            && evidence.store.customCss.draft !== aiRollback.store.customCss?.draft;
        },
        { timeout: 5_000, interval: 100, timeoutMsg: 'visible CustomCSS snippet action did not persist a sentinel draft' },
      );
      const customCssSentinel = await readAboutSettingsEvidence();
      expect(customCssSentinel.persisted.customCss, 'visible CustomCSS sentinel is persisted before About reset')
        .to.deep.equal(customCssSentinel.store.customCss);

      await openRoute('/settings?tab=about', '[data-settings-tab="about"]');
      const developerModeInput = await browser.$('[data-settings-entry="about.devPanel"] input[type="checkbox"]');
      if (!await developerModeInput.isSelected()) {
        await (await browser.$('[data-settings-entry="about.devPanel"] label.sv-toggle-row')).click();
      }
      const updaterAutoCheckInput = await browser.$('[data-settings-entry="about.updater"] input[type="checkbox"]');
      if (await updaterAutoCheckInput.isSelected()) {
        await (await browser.$('[data-settings-entry="about.updater"] label.sv-toggle-row')).click();
      }
      await browser.waitUntil(
        async () => {
          const evidence = await readAboutSettingsEvidence();
          return evidence.store.developerMode === true
            && evidence.store.updater?.autoCheckDisabled === true;
        },
        { timeout: 5_000, interval: 100, timeoutMsg: 'visible About controls did not establish advanced reset sentinels' },
      );
      const aboutSentinels = await readAboutSettingsEvidence();
      expect(aboutSentinels.ui.developerModeChecked, 'Developer Mode sentinel is visible').to.equal(true);
      expect(aboutSentinels.ui.updaterAutoCheckEnabled, 'Updater disabled sentinel is visible').to.equal(false);
      const snapshotsBeforeAboutReset = aboutSentinels.store.snapshots;

      const resetAboutTab = await browser.$('[data-settings-action="reset-current-tab"]');
      await browser.execute((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }), resetAboutTab);
      await resetAboutTab.waitForClickable({ timeout: 5_000 });
      await resetAboutTab.click();
      await confirmSettingsAction('RESET');
      await browser.waitUntil(
        async () => (await readAboutSettingsEvidence()).store.snapshots[0]?.reason === 'reset-tab:about',
        { timeout: 10_000, interval: 150, timeoutMsg: 'About reset did not create its rollback point' },
      );
      const aboutReset = await readAboutSettingsEvidence();
      expect(aboutReset.persisted.logLevel, 'About reset persists the default runtime log level')
        .to.equal(aboutReset.store.logLevel);
      expect(aboutReset.store.logLevel, 'About reset changes the selected non-default log level')
        .not.to.equal(targetLogLevel);
      expect(aboutReset.ui.runtimeLogLevel, 'About reset applies the default level to the runtime logger')
        .to.equal(aboutReset.store.logLevel);
      expect(aboutReset.store.developerMode, 'About reset restores the Developer Mode default').to.equal(false);
      expect(aboutReset.persisted.developerMode, 'About reset persists the Developer Mode default').to.equal(false);
      expect(aboutReset.ui.developerModeChecked, 'About reset updates the visible Developer Mode control').to.equal(false);
      expect(aboutReset.store.updater, 'About reset restores the complete updater defaults').to.deep.equal(defaultUpdater);
      expect(aboutReset.persisted.updater, 'About reset persists the complete updater defaults').to.deep.equal(defaultUpdater);
      expect(aboutReset.ui.updaterAutoCheckEnabled, 'About reset updates the visible updater control').to.equal(true);
      expect(aboutReset.store.customCss, 'About reset preserves the complete CustomCSS state')
        .to.deep.equal(customCssSentinel.store.customCss);
      expect(aboutReset.persisted.customCss, 'About reset persists the preserved CustomCSS state')
        .to.deep.equal(customCssSentinel.store.customCss);
      expect(aboutReset.store.featureFlags, 'About reset preserves AI-owned feature flags').to.deep.equal(targetFlags);
      expect(aboutReset.store.proxy, 'About reset preserves AI-owned proxy fields').to.deep.equal(targetProxy);
      expect(aboutReset.store.snapshots[0]?.reason, 'About reset creates its own rollback point')
        .to.equal('reset-tab:about');
      expect(snapshotsBeforeAboutReset.every((snapshot) => (
        aboutReset.store.snapshots.some((retained) => retained.id === snapshot.id)
      )), 'About reset retains every pre-existing migration snapshot').to.equal(true);
      expect(aboutReset.persisted.snapshots, 'About reset persists the retained snapshot ledger')
        .to.deep.equal(aboutReset.store.snapshots);
      expect(aboutReset.store.schemaVersion, 'About reset retains the current Settings schema')
        .to.equal(aboutReset.ui.currentSchemaVersion);
      expect(aboutReset.persisted.schemaVersion, 'About reset persists the current Settings schema')
        .to.equal(aboutReset.ui.currentSchemaVersion);

      const restoreManual = await browser.$(
        `[data-migration-action="restore"][data-migration-snapshot-id="${createdSnapshot.id}"]`,
      );
      await restoreManual.waitForDisplayed({ timeout: 5_000 });
      await restoreManual.click();
      await confirmSettingsAction('RESTORE');
      await browser.waitUntil(
        async () => {
          const evidence = await readAboutSettingsEvidence();
          return evidence.store.logLevel === initial.store.logLevel
            && JSON.stringify(evidence.store.featureFlags) === JSON.stringify(initial.store.featureFlags)
            && JSON.stringify(evidence.store.proxy) === JSON.stringify(initial.store.proxy);
        },
        { timeout: 10_000, interval: 150, timeoutMsg: 'manual rollback point did not restore the captured Settings state' },
      );
      runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
      await browser.refresh();
      const aboutSection = await browser.$('[data-settings-entry="about.migration"]');
      await aboutSection.waitForDisplayed({ timeout: 10_000 });
      await startSmartPunctuationErrorProbe();
      const restored = await readAboutSettingsEvidence();
      expect(restored.persisted.logLevel, 'rollback saves the restored log level immediately')
        .to.equal(initial.store.logLevel);
      expect(restored.persisted.featureFlags, 'rollback saves the restored feature flags immediately')
        .to.deep.equal(initial.store.featureFlags);
      expect(restored.persisted.proxy, 'rollback saves the restored proxy fields immediately')
        .to.deep.equal(initial.store.proxy);
      expect(restored.store.developerMode, 'manual rollback restores the captured Developer Mode state')
        .to.equal(initial.store.developerMode);
      expect(restored.persisted.developerMode, 'manual rollback persists the captured Developer Mode state')
        .to.equal(initial.store.developerMode);
      expect(restored.store.updater, 'manual rollback restores the captured updater state')
        .to.deep.equal(initial.store.updater);
      expect(restored.persisted.updater, 'manual rollback persists the captured updater state')
        .to.deep.equal(initial.store.updater);
      expect(restored.store.customCss, 'manual rollback restores the captured CustomCSS state')
        .to.deep.equal(initial.store.customCss);
      expect(restored.persisted.customCss, 'manual rollback persists the captured CustomCSS state')
        .to.deep.equal(initial.store.customCss);
      expect(restored.store.snapshots.some((snapshot) => snapshot.id === createdSnapshot.id),
        'rollback retains the real snapshot ledger').to.equal(true);

      const openHelp = await browser.$('[data-ftue-action="open-help"]');
      await openHelp.click();
      const helpDialog = await browser.$('[aria-labelledby="if-help-title"]');
      await helpDialog.waitForDisplayed({ timeout: 5_000 });
      expect((await readAboutSettingsEvidence()).ftue.helpCenterOpen,
        'Help Center visibility is owned by the real FTUE store').to.equal(true);

      const helpTabs = await helpDialog.$$('.if-help__tab');
      let helpSearchTab = null;
      for (const tab of helpTabs) {
        if ((await tab.getText()).trim() === '搜索') {
          helpSearchTab = tab;
          break;
        }
      }
      expect(helpSearchTab, 'Help exposes the real search tab by its visible label').to.not.equal(null);
      await helpSearchTab.click();
      const helpSearchInput = await helpDialog.$('.if-help__search input[type="search"]');
      await helpSearchInput.waitForDisplayed({ timeout: 5_000 });
      await helpSearchInput.click();
      await browser.keys('加粗');
      await browser.waitUntil(
        async () => browser.execute(() => Array.from(document.querySelectorAll('.if-help__result'))
          .some((element) => element.querySelector('span')?.textContent?.trim() === '文字格式')),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Help search did not return the real Markdown formatting result' },
      );
      const helpResults = await helpDialog.$$('.if-help__result');
      let formattingResult = null;
      for (const result of helpResults) {
        const resultTitle = await result.$('span');
        if ((await resultTitle.getText()).trim() === '文字格式') {
          formattingResult = result;
          break;
        }
      }
      expect(formattingResult, 'Help search exposes the exact shipped Markdown formatting result').to.not.equal(null);
      await formattingResult.click();
      await browser.waitUntil(
        async () => browser.execute(() => (
          document.querySelector('.if-help__tab[aria-selected="true"]')?.textContent?.trim() === 'Markdown 速查'
          && Array.from(document.querySelectorAll('.if-help__section h3'))
            .some((heading) => heading.textContent?.trim() === '文字格式')
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Help search result did not open its real Markdown section' },
      );

      await helpSearchTab.click();
      await helpSearchInput.click();
      await browser.keys(['Control', 'a']);
      await browser.keys('Backspace');
      const missingHelpQuery = 'inkforge-no-such-help-topic-20260715';
      await browser.keys(missingHelpQuery);
      await browser.waitUntil(
        async () => browser.execute((expectedQuery) => {
          const input = document.querySelector('.if-help__search input[type="search"]');
          const emptyState = document.querySelector('.if-help__empty');
          return input?.value === expectedQuery
            && document.querySelectorAll('.if-help__result').length === 0
            && emptyState?.textContent?.trim() === '输入关键词后显示真实帮助内容和当前快捷键绑定。'
            && emptyState.getClientRects().length > 0
            && window.getComputedStyle(emptyState).visibility !== 'hidden';
        }, missingHelpQuery),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Help search did not expose an honest no-result state' },
      );

      const closeHelp = await browser.$('[aria-label="关闭帮助中心"]');
      await closeHelp.click();
      await helpDialog.waitForDisplayed({ timeout: 5_000, reverse: true });

      const resetFtue = await browser.$('[data-ftue-action="reset"]');
      await resetFtue.click();
      const confirmFtue = await browser.$('.sv-confirm-ok');
      await confirmFtue.waitForDisplayed({ timeout: 5_000 });
      await confirmFtue.click();
      const welcomeDialog = await browser.$('[aria-labelledby="if-welcome-title"]');
      await welcomeDialog.waitForDisplayed({ timeout: 10_000 });
      const resetState = await readAboutSettingsEvidence();
      expect(resetState.ftue.storeStep, 'FTUE reset reaches the live store').to.equal('not_started');
      expect(resetState.ftue.persistedStep, 'FTUE reset reaches the IndexedDB ftue table').to.equal('not_started');
      expect(resetState.ftue.welcomeVisible, 'FTUE reset immediately opens the welcome flow').to.equal(true);
      expect(resetState.ftue.seenHelpCount, 'FTUE reset clears only help-read state').to.equal(0);

      const skipWelcome = await welcomeDialog.$('.if-welcome__ghost');
      await skipWelcome.waitForClickable({ timeout: 5_000 });
      await skipWelcome.click();
      await welcomeDialog.waitForDisplayed({ timeout: 10_000, reverse: true });
      await browser.waitUntil(
        async () => (await readAboutSettingsEvidence()).ftue.persistedStep === 'skipped',
        { timeout: 5_000, interval: 100, timeoutMsg: 'welcome skip did not persist through the FTUE service' },
      );
      runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
      await browser.refresh();
      await (await browser.$('[data-settings-entry="about.migration"]')).waitForDisplayed({ timeout: 10_000 });
      await startSmartPunctuationErrorProbe();
      const reloadedFtue = await readAboutSettingsEvidence();
      expect(reloadedFtue.ftue.storeStep, 'skipped FTUE state survives reload in the store').to.equal('skipped');
      expect(reloadedFtue.ftue.persistedStep, 'skipped FTUE state survives reload in IndexedDB').to.equal('skipped');
      expect(reloadedFtue.ui.welcomeDialogVisible, 'normal reload follows the non-repeat welcome policy').to.equal(false);
    } finally {
      runtimeErrors.push(...await stopSmartPunctuationErrorProbe());
    }
    expect(runtimeErrors, 'About navigation, persistence, rollback, performance, proxy, and FTUE emit no fresh runtime errors')
      .to.deep.equal([]);
  });

  it('runs tag assignment, filtering, management, merge, and cleanup through real persistence', async function () {
    this.timeout(180_000);
    const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const firstName = `E2ETag${runId}A`;
    const secondName = `E2ETag${runId}B`;
    const renamedSecondName = `E2ETag${runId}C`;
    const deletedName = `E2ETag${runId}D`;
    const articleId = await createBlankDraftThroughHub();

    await openRoute(
      `/workstation?id=${encodeURIComponent(articleId)}&manager=tags`,
      '[data-tag-browser]',
    );
    const firstId = await createVisibleTag(articleId, firstName);
    const secondId = await createVisibleTag(articleId, secondName);
    const managedTagIds = [firstId, secondId];

    let evidence = null;
    await browser.waitUntil(
      async () => {
        evidence = await readTagPersistence(articleId, managedTagIds);
        return evidence.storesReady
          && evidence.store.tags.length === 2
          && evidence.persisted.tags.length === 2
          && evidence.store.docTagIds.length === 2
          && evidence.persisted.docTagIds.length === 2;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'created tags did not reach both Pinia and IndexedDB relations' },
    );
    expect(evidence.store.tags.map(tag => tag.name).sort(), 'live tag store keeps both visible creations')
      .to.deep.equal([firstName, secondName].sort());
    expect(evidence.persisted.tags.map(tag => tag.name).sort(), 'IndexedDB keeps both real tag rows')
      .to.deep.equal([firstName, secondName].sort());
    expect(evidence.store.articleTags, 'live Article.tags mirrors the authoritative relations')
      .to.deep.equal([firstName, secondName].sort());
    expect(evidence.persisted.articleTags, 'persisted Article.tags mirrors the authoritative relations')
      .to.deep.equal([firstName, secondName].sort());

    await browser.refresh();
    await (await browser.$('[data-tag-browser]')).waitForDisplayed({ timeout: 30_000 });
    await browser.waitUntil(
      async () => {
        evidence = await readTagPersistence(articleId, managedTagIds);
        return evidence.store.docTagIds.length === 2 && evidence.persisted.docTagIds.length === 2;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'tag relations did not survive a real Workstation refresh' },
    );

    await (await browser.$('[data-tag-filter-mode="OR"]')).click();
    await (await browser.$(`[data-tag-all-list] [data-tag-select-id="${firstId}"]`)).click();
    await (await browser.$('[data-tag-filter-apply]')).click();
    await (await browser.$(`[data-tag-filtered-doc-id="${articleId}"]`)).waitForDisplayed({ timeout: 10_000 });

    const tagSwitchSourceId = await createBlankDraftThroughHub();
    await openRoute(
      `/workstation?id=${encodeURIComponent(tagSwitchSourceId)}&manager=tags`,
      '[data-tag-browser]',
    );
    await (await browser.$('[data-tag-filter-apply]')).click();
    const filteredTarget = await browser.$(`[data-tag-filtered-doc-id="${articleId}"]`);
    await filteredTarget.waitForClickable({ timeout: 10_000 });
    const tagBrowserFlushText = `tag-browser-switch-${Date.now()}`;
    const tagSwitchSourceEditor = await browser.$('.ProseMirror');
    await focusEditorAtDocumentEnd(tagSwitchSourceEditor, 'TagBrowser switch flush');
    await browser.keys(tagBrowserFlushText);
    await filteredTarget.click();
    await waitForCurrentDraftReady(articleId, true);

    let tagBrowserSwitchPersistence = null;
    await browser.waitUntil(
      async () => {
        const source = await readVersionPersistence(tagSwitchSourceId);
        const target = await readVersionPersistence(articleId);
        tagBrowserSwitchPersistence = { source, target };
        return source.persistedBodyEncrypted
          && target.persistedBodyEncrypted
          && source.articleBody?.includes(tagBrowserFlushText)
          && !target.articleBody?.includes(tagBrowserFlushText)
          && target.storeArticleId === articleId;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'TagBrowser selection did not flush and isolate the source article' },
    );
    expect(tagBrowserSwitchPersistence.source.articleBody,
      'TagBrowser selection persists the source editor before changing article').to.include(tagBrowserFlushText);
    expect(tagBrowserSwitchPersistence.target.articleBody,
      'TagBrowser selection never writes the source editor into the filtered target')
      .to.not.include(tagBrowserFlushText);

    await (await browser.$(`[data-tag-all-list] [data-tag-select-id="${secondId}"]`)).click();
    await (await browser.$('[data-tag-filter-mode="AND"]')).click();
    await (await browser.$('[data-tag-filter-apply]')).click();
    await (await browser.$(`[data-tag-filtered-doc-id="${articleId}"]`)).waitForDisplayed({ timeout: 10_000 });

    await openRoute('/', '.hub-page');
    await browser.waitUntil(
      async () => browser.execute((expectedNames) => {
        const renderedNames = Array.from(document.querySelectorAll('.tag-cloud span'))
          .map(element => element.textContent?.trim() ?? '');
        return expectedNames.every(name => renderedNames.includes(name));
      }, [firstName, secondName]),
      { timeout: 10_000, interval: 100, timeoutMsg: 'Hub tag cloud did not render the two real assigned tags' },
    );

    await openRoute(
      `/workstation?id=${encodeURIComponent(articleId)}&manager=tags`,
      '[data-tag-browser]',
    );
    await (await browser.$('[data-tag-manager-open]')).click();
    await (await browser.$('[data-tag-manager-dialog]')).waitForDisplayed({ timeout: 5_000 });
    await (await browser.$(`[data-tag-edit-start="${secondId}"]`)).click();
    let editInput = await browser.$(`[data-tag-edit-input="${secondId}"]`);
    await editInput.waitForDisplayed({ timeout: 5_000 });
    await editInput.setValue(renamedSecondName);
    await (await browser.$(`[data-tag-edit-color="${secondId}"]`)).selectByAttribute('value', '#15803d');
    await (await browser.$(`[data-tag-edit-save="${secondId}"]`)).click();
    await browser.waitUntil(
      async () => browser.execute((tagId) => !document.querySelector(`[data-tag-edit-input="${tagId}"]`), secondId),
      {
        timeout: 5_000,
        interval: 100,
        timeoutMsg: 'successful tag update did not leave edit mode through its completion callback',
      },
    );
    await browser.waitUntil(
      async () => {
        evidence = await readTagPersistence(articleId, managedTagIds);
        const live = evidence.store.tags.find(tag => tag.id === secondId);
        const persisted = evidence.persisted.tags.find(tag => tag.id === secondId);
        return live?.name === renamedSecondName
          && live?.color === '#15803d'
          && persisted?.name === renamedSecondName
          && persisted?.color === '#15803d'
          && evidence.store.articleTags.includes(renamedSecondName)
          && evidence.persisted.articleTags.includes(renamedSecondName);
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'tag rename/color did not repair both article mirrors' },
    );

    await (await browser.$(`[data-tag-edit-start="${secondId}"]`)).click();
    editInput = await browser.$(`[data-tag-edit-input="${secondId}"]`);
    await editInput.waitForDisplayed({ timeout: 5_000 });
    await editInput.setValue(firstName);
    await (await browser.$(`[data-tag-edit-save="${secondId}"]`)).click();
    const duplicateError = await browser.$('[data-tag-manager-error]');
    await duplicateError.waitForDisplayed({ timeout: 5_000 });
    expect(await duplicateError.getText(), 'duplicate manager rename surfaces the repository conflict')
      .to.include(`Tag already exists: ${firstName}`);
    expect(await editInput.getValue(), 'rejected manager rename keeps the entered value visible').to.equal(firstName);
    expect(await (await browser.$('[data-tag-manager-dialog]')).isDisplayed(), 'rejected manager rename keeps the dialog open')
      .to.equal(true);
    evidence = await readTagPersistence(articleId, managedTagIds);
    expect(evidence.persisted.tags.find(tag => tag.id === secondId)?.name, 'duplicate rejection keeps the persisted prior name')
      .to.equal(renamedSecondName);

    await (await browser.$('[aria-label="关闭标签管理"]')).click();
    const deletedId = await createVisibleTag(articleId, deletedName);
    managedTagIds.push(deletedId);
    await (await browser.$('[data-tag-manager-open]')).click();
    await (await browser.$('[data-tag-manager-dialog]')).waitForDisplayed({ timeout: 5_000 });
    await (await browser.$(`[data-tag-delete="${deletedId}"]`)).click();
    await browser.waitUntil(
      async () => {
        evidence = await readTagPersistence(articleId, managedTagIds);
        return !evidence.store.tags.some(tag => tag.id === deletedId)
          && !evidence.persisted.tags.some(tag => tag.id === deletedId)
          && !evidence.store.docTagIds.includes(deletedId)
          && !evidence.persisted.docTagIds.includes(deletedId)
          && !evidence.store.articleTags.includes(deletedName)
          && !evidence.persisted.articleTags.includes(deletedName);
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'manager delete did not remove the tag relation and mirrors' },
    );

    await (await browser.$('[data-tag-merge-target]')).selectByAttribute('value', firstId);
    await (await browser.$(`[data-tag-merge-source="${secondId}"]`)).click();
    const mergeButton = await browser.$('[data-tag-merge-submit]');
    await mergeButton.waitForClickable({ timeout: 5_000 });
    await mergeButton.click();
    await browser.waitUntil(
      async () => {
        evidence = await readTagPersistence(articleId, managedTagIds);
        const firstLive = evidence.store.tags.find(tag => tag.id === firstId);
        const firstPersisted = evidence.persisted.tags.find(tag => tag.id === firstId);
        return firstLive?.docCount === 1
          && firstPersisted?.docCount === 1
          && !evidence.store.tags.some(tag => tag.id === secondId)
          && !evidence.persisted.tags.some(tag => tag.id === secondId)
          && evidence.store.docTagIds.length === 1
          && evidence.persisted.docTagIds.length === 1
          && evidence.store.docTagIds[0] === firstId
          && evidence.persisted.docTagIds[0] === firstId
          && JSON.stringify(evidence.store.articleTags) === JSON.stringify([firstName])
          && JSON.stringify(evidence.persisted.articleTags) === JSON.stringify([firstName]);
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'manager merge did not preserve one authoritative target relation' },
    );

    await (await browser.$('[aria-label="关闭标签管理"]')).click();
    const removeFirst = await browser.$(`[data-tag-remove-id="${firstId}"]`);
    await removeFirst.waitForClickable({ timeout: 5_000 });
    await removeFirst.click();
    await browser.waitUntil(
      async () => {
        evidence = await readTagPersistence(articleId, managedTagIds);
        const firstLive = evidence.store.tags.find(tag => tag.id === firstId);
        const firstPersisted = evidence.persisted.tags.find(tag => tag.id === firstId);
        return firstLive?.docCount === 0
          && firstPersisted?.docCount === 0
          && evidence.store.docTagIds.length === 0
          && evidence.persisted.docTagIds.length === 0
          && evidence.store.articleTags.length === 0
          && evidence.persisted.articleTags.length === 0;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'visible tag removal did not clear authoritative relation and mirrors' },
    );

    await (await browser.$('[data-tag-manager-open]')).click();
    await (await browser.$('[data-tag-manager-dialog]')).waitForDisplayed({ timeout: 5_000 });
    await (await browser.$('[data-tag-cleanup]')).click();
    await browser.waitUntil(
      async () => {
        evidence = await readTagPersistence(articleId, managedTagIds);
        return evidence.store.tags.length === 0
          && evidence.persisted.tags.length === 0
          && evidence.store.docTagIds.length === 0
          && evidence.persisted.docTagIds.length === 0;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'orphan cleanup did not remove the final zero-reference tag' },
    );
  });

  it('runs category CRUD from Hub through the real Workstation file manager', async function () {
    this.timeout(180_000);
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const categoryName = `E2E-${runId}`;
    const duplicateCategoryName = `  ${categoryName.toUpperCase()}  `;
    const renamedCategoryName = `E2E-renamed-${runId}`;

    await openRoute('/', '.hub-page');
    const addCategory = await browser.$('[data-hub-category-add]');
    await addCategory.scrollIntoView({ block: 'center', inline: 'nearest' });
    await addCategory.waitForClickable({ timeout: 5_000 });
    await addCategory.click();

    const createDialog = await browser.$('[data-category-create-dialog]');
    await createDialog.waitForDisplayed({ timeout: 5_000 });
    const categoryNameInput = await browser.$('[data-category-name-input]');
    await categoryNameInput.waitForDisplayed({ timeout: 5_000 });
    await categoryNameInput.setValue(categoryName);
    await (await browser.$('[data-category-create-confirm]')).click();

    let categoryId = null;
    await browser.waitUntil(
      async () => {
        categoryId = await browser.execute((expectedName) => {
          const root = document.getElementById('app');
          const provides = root?.__vue_app__?._context?.provides;
          const pinia = provides
            ? Object.getOwnPropertySymbols(provides)
              .map((symbol) => provides[symbol])
              .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
            : null;
          return pinia?._s.get('category')?.categories
            .find((category) => category.name === expectedName)?.id ?? null;
        }, categoryName);
        return typeof categoryId === 'string' && categoryId.length > 0;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'Hub category creation did not reach the production category store' },
    );
    createdCategoryIds.add(categoryId);
    await createDialog.waitForDisplayed({ timeout: 5_000, reverse: true });

    let createdRelation = null;
    await browser.waitUntil(
      async () => {
        createdRelation = await readCategoryRelation(categoryId);
        return createdRelation.storesReady
          && createdRelation.store.category?.id === categoryId
          && createdRelation.persisted.category?.id === categoryId;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'Hub category creation did not persist to IndexedDB' },
    );
    expect(createdRelation.store.category, 'Hub creates the category through the live Pinia store')
      .to.deep.equal({ id: categoryId, name: categoryName });
    expect(createdRelation.persisted.category, 'Hub category creation reaches the real IndexedDB record')
      .to.deep.equal({ id: categoryId, name: categoryName });

    await addCategory.click();
    const duplicateDialog = await browser.$('[data-category-create-dialog]');
    await duplicateDialog.waitForDisplayed({ timeout: 5_000 });
    const duplicateCategoryNameInput = await browser.$('[data-category-name-input]');
    await duplicateCategoryNameInput.waitForDisplayed({ timeout: 5_000 });
    await duplicateCategoryNameInput.setValue(duplicateCategoryName);
    await (await browser.$('[data-category-create-confirm]')).click();
    const duplicateError = await browser.$('[data-category-create-error]');
    await duplicateError.waitForDisplayed({ timeout: 5_000 });
    expect(await duplicateError.getText(), 'normalized duplicate category names are rejected').to.equal('分类名称已存在');
    expect(await duplicateCategoryNameInput.getValue(), 'the rejected category modal retains its entered value')
      .to.equal(duplicateCategoryName);
    expect(await duplicateDialog.isDisplayed(), 'the rejected category modal stays open').to.equal(true);
    await (await browser.$('[data-category-create-close]')).click();
    await duplicateDialog.waitForDisplayed({ timeout: 5_000, reverse: true });

    const manageCategories = await browser.$('[data-hub-category-manage]');
    await manageCategories.scrollIntoView({ block: 'center', inline: 'nearest' });
    await manageCategories.waitForClickable({ timeout: 5_000 });
    await manageCategories.click();
    await browser.waitUntil(
      async () => browser.execute(() => (
        location.pathname === '/workstation'
        && new window.URLSearchParams(location.search).get('manager') === 'files'
      )),
      {
        timeout: 10_000,
        interval: 200,
        timeoutMsg: 'Hub category-management route boundary did not reach /workstation?manager=files',
      },
    );
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(document.querySelector('.fm-root')?.getClientRects().length)),
      {
        timeout: 30_000,
        interval: 200,
        timeoutMsg: 'Workstation hydration boundary did not render a visible FileManager (.fm-root) within 30s',
      },
    );
    await browser.waitUntil(
      async () => {
        const relation = await readCategoryRelation(categoryId);
        return relation.store.category?.id === categoryId && relation.persisted.category?.id === categoryId;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'FileManager did not load the persisted Hub category into Pinia' },
    );
    const treeViewTab = await browser.$('[role="tab"][title="树形视图"]');
    await treeViewTab.waitForClickable({ timeout: 5_000 });
    if ((await treeViewTab.getAttribute('aria-selected')) !== 'true') await treeViewTab.click();

    const articleIdsBefore = await browser.execute((targetCategoryId) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      return pinia?._s.get('article')?.articles
        .filter((article) => article.categoryId === targetCategoryId)
        .map((article) => article.id) ?? [];
    }, categoryId);
    await openCategoryContextMenu(categoryId);
    await (await browser.$('[data-category-action="new-article"]')).click();

    let articleId = null;
    await browser.waitUntil(
      async () => {
        articleId = await browser.execute((targetCategoryId, priorArticleIds) => {
          const root = document.getElementById('app');
          const provides = root?.__vue_app__?._context?.provides;
          const pinia = provides
            ? Object.getOwnPropertySymbols(provides)
              .map((symbol) => provides[symbol])
              .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
            : null;
          const articleStore = pinia?._s.get('article');
          return articleStore?.articles.find((article) => (
            article.categoryId === targetCategoryId && !priorArticleIds.includes(article.id)
          ))?.id ?? null;
        }, categoryId, articleIdsBefore);
        return typeof articleId === 'string' && articleId.length > 0;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'the FileManager context menu did not create a category article' },
    );
    createdArticleIds.add(articleId);

    let categoryArticleRelation = null;
    await browser.waitUntil(
      async () => {
        categoryArticleRelation = await readCategoryRelation(categoryId, articleId);
        return categoryArticleRelation.storesReady
          && categoryArticleRelation.store.article?.categoryId === categoryId
          && categoryArticleRelation.persisted.article?.categoryId === categoryId;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'new FileManager article did not persist its category relation' },
    );
    expect(categoryArticleRelation.store.article, 'the live article store keeps the FileManager category id')
      .to.deep.equal({ id: articleId, categoryId });
    expect(categoryArticleRelation.persisted.article, 'the IndexedDB article record keeps the FileManager category id')
      .to.deep.equal({ id: articleId, categoryId });

    await openCategoryContextMenu(categoryId);
    await (await browser.$('[data-category-action="rename"]')).click();
    const renameInput = await browser.$('[data-category-rename-input]');
    await renameInput.waitForDisplayed({ timeout: 5_000 });
    await renameInput.click();
    await browser.waitUntil(
      async () => browser.execute(() => document.activeElement?.matches('[data-category-rename-input]') === true),
      { timeout: 2_000, interval: 50, timeoutMsg: 'category rename input did not receive real keyboard focus' },
    );
    await browser.keys(['Control', 'a']);
    await browser.keys(renamedCategoryName);
    expect(await renameInput.getValue(), 'the real rename input receives the replacement category name')
      .to.equal(renamedCategoryName);
    await browser.keys('Enter');

    let renamedRelation = null;
    await browser.waitUntil(
      async () => {
        renamedRelation = await readCategoryRelation(categoryId, articleId);
        return renamedRelation.store.category?.name === renamedCategoryName
          && renamedRelation.persisted.category?.name === renamedCategoryName
          && renamedRelation.store.article?.categoryId === categoryId
          && renamedRelation.persisted.article?.categoryId === categoryId;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'category rename did not preserve its article relation id' },
    );
    expect(renamedRelation.store.category?.id, 'rename keeps the live category identifier stable').to.equal(categoryId);
    expect(renamedRelation.persisted.category?.id, 'rename keeps the persisted category identifier stable').to.equal(categoryId);
    await browser.waitUntil(
      async () => browser.execute(() => (
        document.querySelector('[data-category-action-status]')?.getAttribute('data-tone') === 'success'
      )),
      { timeout: 5_000, interval: 100, timeoutMsg: 'category rename did not expose its production success status' },
    );

    await openRoute('/', '.hub-page');
    const categoryCard = await browser.$(`[data-hub-category-id="${categoryId}"]`);
    if (await categoryCard.isExisting() && await categoryCard.isDisplayed()) {
      await categoryCard.click();
    } else {
      const categoryFilter = await browser.$('.filter-category-wrapper .filter-tab');
      await categoryFilter.scrollIntoView({ block: 'center', inline: 'nearest' });
      await categoryFilter.waitForClickable({ timeout: 5_000 });
      await categoryFilter.click();
      let categoryOption = null;
      await browser.waitUntil(
        async () => {
          const categoryOptions = await browser.$$('.category-option');
          categoryOption = null;
          for (const option of categoryOptions) {
            if ((await option.getText()).trim() === renamedCategoryName) {
              categoryOption = option;
              break;
            }
          }
          return categoryOption !== null;
        },
        { timeout: 5_000, interval: 100, timeoutMsg: 'Hub category filter did not render the renamed category' },
      );
      await categoryOption.click();
    }
    await browser.waitUntil(
      async () => browser.execute((targetArticleId) => {
        const targetCard = document.querySelector(`[data-hub-article-id="${targetArticleId}"]`);
        if (!targetCard || targetCard.getClientRects().length === 0) return false;
        const style = window.getComputedStyle(targetCard);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }, articleId),
      { timeout: 10_000, interval: 200, timeoutMsg: 'Hub category filter did not render its persisted article' },
    );

    await openRoute('/workstation?manager=files', '.fm-root');
    await openCategoryContextMenu(categoryId);
    await (await browser.$('[data-category-action="delete"]')).click();
    const deleteConfirmation = await browser.$('[data-category-delete-confirm]');
    await deleteConfirmation.waitForDisplayed({ timeout: 5_000 });
    await (await browser.$('[data-category-delete-submit]')).click();

    let deletedRelation = null;
    await browser.waitUntil(
      async () => {
        deletedRelation = await readCategoryRelation(categoryId, articleId);
        return deletedRelation.storesReady
          && deletedRelation.store.category === null
          && deletedRelation.persisted.category === null
          && deletedRelation.store.article?.categoryId === null
          && deletedRelation.persisted.article?.categoryId === null;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'deleting a category did not migrate its article to categoryId=null' },
    );
    expect(deletedRelation.store.article, 'category deletion updates the live article relation').to.deep.equal({ id: articleId, categoryId: null });
    expect(deletedRelation.persisted.article, 'category deletion persists the migrated article relation').to.deep.equal({ id: articleId, categoryId: null });

    await browser.refresh();
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(document.querySelector('.fm-root')?.getClientRects().length)),
      {
        timeout: 30_000,
        interval: 200,
        timeoutMsg: 'Workstation refresh hydration boundary did not render a visible FileManager (.fm-root) within 30s',
      },
    );
    let reloadedRelation = null;
    await browser.waitUntil(
      async () => {
        reloadedRelation = await readCategoryRelation(categoryId, articleId);
        return reloadedRelation.storesReady
          && reloadedRelation.store.category === null
          && reloadedRelation.persisted.category === null
          && reloadedRelation.store.article?.categoryId === null
          && reloadedRelation.persisted.article?.categoryId === null;
      },
      { timeout: 10_000, interval: 100, timeoutMsg: 'category deletion migration did not survive refresh' },
    );
    expect(reloadedRelation.store.article, 'the reloaded Pinia article keeps categoryId=null').to.deep.equal({ id: articleId, categoryId: null });
    expect(reloadedRelation.persisted.article, 'the reloaded IndexedDB article keeps categoryId=null').to.deep.equal({ id: articleId, categoryId: null });
  });

  // Import intentionally creates a durable rollback audit row, so keep this in the disposable final session slot.
  it('exports and imports Settings JSON through the real file and rollback boundaries', verifySettingsTransfer);
});
