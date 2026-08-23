/**
 * editor-settings.spec.cjs — proves Settings editor preferences against the
 * real Tauri WebView2 shell and a draft created through the production UI.
 */
/* global after */
const { expect } = require('chai');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const { spawn } = require('node:child_process');

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

  let lastState = null;
  try {
    await browser.waitUntil(
      async () => {
        lastState = await browser.execute((selector) => {
          const element = document.querySelector(selector);
          const routeShell = element?.closest('.app-route-shell');
          const routeShellOpacity = routeShell
            ? Number.parseFloat(window.getComputedStyle(routeShell).opacity)
            : 1;
          const root = document.getElementById('app');
          const provides = root?.__vue_app__?._context?.provides;
          const pinia = provides
            ? Object.getOwnPropertySymbols(provides)
              .map((symbol) => provides[symbol])
              .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
            : null;
          const editorStore = pinia?._s.get('editor');
          const ready = Boolean(
            element
            && element.getClientRects().length > 0
            && window.getComputedStyle(element).visibility !== 'hidden'
            && !document.querySelector('.view-fade-enter-active, .view-fade-leave-active')
            && routeShellOpacity >= 0.999
          );
          return {
            ready,
            actualRoute: `${location.pathname}${location.search}`,
            elementExists: Boolean(element),
            elementRectCount: element?.getClientRects().length ?? 0,
            elementVisibility: element ? window.getComputedStyle(element).visibility : null,
            routeShellOpacity,
            activeTransitions: document.querySelectorAll('.view-fade-enter-active, .view-fade-leave-active').length,
            editorStatus: editorStore?.status ?? null,
            editorError: editorStore?.error ?? null,
            statusPill: document.querySelector('.status-pill.error')?.textContent?.trim() ?? null,
            documentVisibility: document.visibilityState,
            documentFocused: document.hasFocus(),
          };
        }, readySelector);
        return lastState.ready;
      },
      {
        timeout: 10_000,
        interval: 50,
        timeoutMsg: `${target} did not display ${readySelector} after route transition`,
      },
    );
  } catch (error) {
    throw new Error(
      `${target} did not display ${readySelector} after route transition; state=${JSON.stringify(lastState)}`,
      { cause: error },
    );
  }
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
    const persistedContent = persistedContents
      .find((content) => content.id === currentContent?.id)
      ?? [...persistedContents].sort((left, right) => (
        new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime()
      ))[0]
      ?? null;
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

async function getVisibleHubBlankDraftControl() {
  const candidates = [
    ['.recent-create-btn', '空白草稿'],
    ['.hero-empty-btn', '空白开始'],
    ['.empty-create-btn', '新建文章'],
    ['.quick-action-item', '新建空白文档'],
  ];
  const findVisible = async () => {
    for (const [selector, label] of candidates) {
      for (const candidate of await browser.$$(selector)) {
        if (await candidate.isDisplayed() && (await candidate.getText()).includes(label)) return candidate;
      }
    }
    return null;
  };

  const existing = await findVisible();
  if (existing) return existing;

  const trigger = await browser.$('.quick-action-fab[aria-label="打开快速创建菜单"]');
  if (await trigger.isExisting() && await trigger.isDisplayed()) {
    await trigger.waitForClickable({ timeout: 5_000 });
    await trigger.click();
    await browser.waitUntil(async () => Boolean(await findVisible()), {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: 'Hub quick-create menu did not expose the blank-draft action',
    });
  }
  return findVisible();
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
  const createButton = await getVisibleHubBlankDraftControl();
  const clicked = createButton
    ? { className: await createButton.getAttribute('class'), text: await createButton.getText() }
    : null;
  expect(clicked, 'a visible production new-draft control exists').to.be.an('object');
  await createButton.click();

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
  const createButton = await getVisibleHubBlankDraftControl();
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

  const titlebar = await browser.$('.ink-titlebar');
  await titlebar.waitForDisplayed({ timeout: 5_000 });
  await titlebar.click();
  await browser.waitUntil(
    async () => browser.execute(() => document.hasFocus()),
    { timeout: 5_000, interval: 50, timeoutMsg: 'native window did not receive keyboard focus before tab activation' },
  );
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
  const activeTab = await browser.$(`[role="tab"][data-tab-id="${articleId}"]`);
  await activeTab.waitForClickable({ timeout: 5_000 });
  await activeTab.click();
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
    const layoutProfileId = originalProfileId ?? 'local-default';
    const windowId = window.sessionStorage.getItem('inkforge.layout.windowId');

    if (!articleStore || !profileStore || !layoutStore || !targetArticle || !windowId) {
      return {
        error: 'required production store, target article, or layout window is unavailable',
        fixtureProfileId: null,
        originalProfileId,
        layoutProfileId,
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
    await layoutStore.initialize(layoutProfileId, windowId);

    return {
      error: null,
      fixtureProfileId,
      originalProfileId,
      layoutProfileId,
      windowId,
    };
  }, targetArticleId);

  expect(fixture.error, 'the real layout repository accepts the isolated restore record').to.equal(null);
  expect(fixture.fixtureProfileId, 'the isolated layout restore has a profile id').to.be.a('string');
  expect(fixture.layoutProfileId, 'the production layout profile fallback is available').to.be.a('string');
  expect(fixture.windowId, 'the production layout window id is available').to.be.a('string');
  return fixture;
}

async function cleanupPersistedLayoutRestoreFixture(fixture, sourceArticleId) {
  const cleanup = await browser.execute(async ({
    fixtureProfileId,
    originalProfileId,
    windowId,
    articleId,
  }) => {
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
    }, fixture.layoutProfileId),
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
  await focusEditorForKeyboardInput(editor);
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

async function focusControlForKeyboardInput(control, label) {
  await control.waitForDisplayed({ timeout: 10_000, interval: 200 });
  const titlebar = await browser.$('.ink-titlebar');
  await titlebar.click();
  await control.scrollIntoView({ block: 'center', inline: 'nearest' });
  await control.waitForClickable({ timeout: 5_000, interval: 100 });
  await control.click();
  await browser.waitUntil(
    async () => browser.execute((element) => (
      document.activeElement === element || element.contains(document.activeElement)
    ), control),
    { timeout: 5_000, interval: 50, timeoutMsg: `${label} did not receive real native-window keyboard focus` },
  );
}

async function focusEditorForKeyboardInput(editor, moveToEnd = false) {
  await focusControlForKeyboardInput(editor, 'the real ProseMirror surface');
  if (moveToEnd) {
    await browser.keys(['Control', 'End']);
  }
}

async function typeSmartPunctuationInput(input, expectedText) {
  const editor = await browser.$('.ProseMirror');
  await focusEditorForKeyboardInput(editor);
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

async function readAssetPersistence(articleId, expectedName) {
  return browser.execute(async (targetArticleId, targetName) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const assetStore = pinia?._s.get('asset');
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
    const matchesName = (asset) => asset.name === targetName || asset.originalName === targetName;
    const toMeta = (asset) => ({
      id: asset.id,
      articleId: asset.articleId,
      name: asset.name,
      originalName: asset.originalName ?? null,
      mimeType: asset.mimeType,
      size: asset.size,
      blobSize: asset.blob?.size ?? null,
      blobType: asset.blob?.type ?? null,
      contentHashLength: asset.contentHash?.length ?? 0,
      refCount: asset.refCount ?? null,
      lifecycle: asset.lifecycle ?? null,
      storageBackend: asset.storageBackend ?? null,
      tags: [...(asset.tags ?? [])],
    });

    try {
      const [persistedAssets, refs] = await Promise.all([readAll('assets'), readAll('assetRefs')]);
      const namedPersistedAssets = persistedAssets.filter(matchesName);
      const namedAssetIds = new Set(namedPersistedAssets.map((asset) => asset.id));
      const targetRefs = refs.filter((ref) => (
        namedAssetIds.has(ref.assetId)
        && ref.referrerKind === 'article'
        && ref.referrerId === targetArticleId
      ));
      const targetAssetIds = new Set(targetRefs.map((ref) => ref.assetId));
      const live = Array.from(assetStore?.assets ?? [])
        .filter((asset) => targetAssetIds.has(asset.id) && matchesName(asset));
      const persisted = namedPersistedAssets.filter((asset) => targetAssetIds.has(asset.id));
      const cards = Array.from(document.querySelectorAll('.asset-card-grid[aria-label], .asset-card-list[aria-label]'))
        .filter((card) => card.getAttribute('aria-label') === `选择素材 ${targetName}`)
        .map((card) => ({
          ariaPressed: card.getAttribute('aria-pressed'),
          className: card.className,
          thumbnailSrc: card.querySelector('img')?.getAttribute('src') ?? '',
          thumbnailComplete: card.querySelector('img')?.complete ?? false,
          thumbnailNaturalWidth: card.querySelector('img')?.naturalWidth ?? 0,
          thumbnailNaturalHeight: card.querySelector('img')?.naturalHeight ?? 0,
        }));
      return {
        storeReady: Boolean(assetStore),
        storeError: assetStore?.error ?? null,
        cachedUrlCount: assetStore?.cachedUrlCount ?? null,
        live: live.map(toMeta),
        persisted: persisted.map(toMeta),
        globalPersisted: namedPersistedAssets.map(toMeta),
        refs: targetRefs
          .map((ref) => ({ assetId: ref.assetId, referrerKind: ref.referrerKind, referrerId: ref.referrerId })),
        allRefs: refs
          .filter((ref) => namedAssetIds.has(ref.assetId))
          .map((ref) => ({ assetId: ref.assetId, referrerKind: ref.referrerKind, referrerId: ref.referrerId })),
        cards,
        emptyText: document.querySelector('.inspector-asset-wrapper .empty-state')?.textContent
          ?.replace(/\s+/gu, ' ').trim() ?? '',
        errorText: document.querySelector('.inspector-asset-wrapper .error-banner')?.textContent
          ?.replace(/\s+/gu, ' ').trim() ?? '',
      };
    } finally {
      database.close();
    }
  }, articleId, expectedName);
}

async function cleanupCreatedAsset(articleId, expectedName) {
  return browser.execute(async (targetArticleId, targetName) => {
    const root = document.getElementById('app');
    const provides = root?.__vue_app__?._context?.provides;
    const pinia = provides
      ? Object.getOwnPropertySymbols(provides)
        .map((symbol) => provides[symbol])
        .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
      : null;
    const assetStore = pinia?._s.get('asset');
    if (!assetStore) return { error: 'production asset store unavailable', removedIds: [] };
    try {
      await assetStore.loadAssets(targetArticleId);
      const matches = Array.from(assetStore.assets).filter((asset) => (
        asset.name === targetName || asset.originalName === targetName
      ));
      for (const asset of matches) await assetStore.deleteAsset(asset.id);
      return { error: null, removedIds: matches.map((asset) => asset.id) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error), removedIds: [] };
    }
  }, articleId, expectedName);
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

async function openArticleContextMenuForTrash(articleId) {
  const rowSelector = `.fm-article-row[data-file-article-id="${articleId}"]`;
  let lastError = null;

  const flatViewButton = await browser.$('.fm-seg-tab[title="平铺视图"]');
  await flatViewButton.waitForClickable({ timeout: 5_000 });
  if ((await flatViewButton.getAttribute('aria-selected')) !== 'true') {
    await flatViewButton.click();
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const articleRow = await browser.$(rowSelector);
    await articleRow.waitForExist({ timeout: 10_000 });
    await articleRow.scrollIntoView({ block: 'center', inline: 'nearest' });
    await articleRow.waitForDisplayed({ timeout: 5_000 });
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
      lastError = new Error('article row does not expose an unobscured viewport point');
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
      await (await browser.$('[data-article-action="delete"]')).waitForDisplayed({ timeout: 2_500 });
      return;
    } catch (error) {
      lastError = error;
      await browser.keys('Escape');
    }
  }

  throw lastError ?? new Error('article context menu did not open after two native right clicks');
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

async function restoreNativeApplicationWindow() {
  const result = await browser.executeAsync((done) => {
    const invoke = window.__TAURI_INVOKE__;
    if (typeof invoke !== 'function') {
      done({ error: 'native Tauri invoke bridge is unavailable' });
      return;
    }
    invoke('focus_window', { windowId: 'main' })
      .then(() => done({ error: null }))
      .catch((error) => done({ error: error instanceof Error ? error.message : String(error) }));
  });
  if (result?.error) {
    throw new Error(`Native InkForge window restore failed: ${result.error}`);
  }
}


async function getCurrentInkForgeProcessId() {
  const applicationProcessId = Number(browser.capabilities?.['goog:processID']);
  if (!Number.isInteger(applicationProcessId) || applicationProcessId <= 0) {
    throw new Error('The current Tauri application process id is unavailable');
  }

  const script = `
    $ErrorActionPreference = 'Stop'
    $expectedProcessId = [uint32]${applicationProcessId}
    $process = Get-Process -Id $expectedProcessId -ErrorAction Stop
    if ($process.ProcessName -ne 'InkForge') {
      throw "WebDriver application PID $expectedProcessId belongs to $($process.ProcessName), not InkForge."
    }
    if ($process.MainWindowHandle -eq [IntPtr]::Zero) {
      throw "InkForge PID $expectedProcessId has no native main window."
    }
    [Console]::Out.Write($process.Id)
  `;

  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      const processId = Number.parseInt(stdout.trim(), 10);
      if (code === 0 && processId === applicationProcessId) {
        resolve(processId);
      } else {
        reject(new Error(
          `Could not bind native import dialog to the WebDriver-owned InkForge instance (exit ${code}): ${stderr.trim()}`,
        ));
      }
    });
  });
}

function interactWithNativeImportDialog(filePath = null, expectedProcessId) {
  if (!Number.isInteger(expectedProcessId) || expectedProcessId <= 0) {
    throw new Error('A positive WebDriver-owned InkForge process id is required for native import interaction.');
  }
  const encodedMode = Buffer.from(filePath ? 'select' : 'cancel', 'utf8').toString('base64');
  const encodedPath = Buffer.from(filePath ?? '', 'utf8').toString('base64');
  const encodedTitle = Buffer.from('导入文件', 'utf8').toString('base64');
  const script = `
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes
    Add-Type @'
      using System;
      using System.ComponentModel;
      using System.Text;
      using System.Runtime.InteropServices;
      public static class InkForgeImportDialog {
        public delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);
        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetWindowText(IntPtr window, StringBuilder text, int maxCount);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetClassName(IntPtr window, StringBuilder className, int maxCount);
        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr window);
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr window);
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint count, INPUT[] inputs, int size);
        [DllImport("user32.dll")]
        public static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll")]
        public static extern IntPtr GetDlgItem(IntPtr dialog, int controlId);
        [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessageW")]
        public static extern IntPtr SendMessageText(IntPtr window, uint message, IntPtr wParam, string lParam);
        [DllImport("user32.dll")]
        public static extern bool IsWindow(IntPtr window);

        [StructLayout(LayoutKind.Sequential)]
        private struct INPUT {
          public uint type;
          public InputUnion data;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct InputUnion {
          [FieldOffset(0)]
          public MOUSEINPUT mouse;
          [FieldOffset(0)]
          public KEYBDINPUT keyboard;
          [FieldOffset(0)]
          public HARDWAREINPUT hardware;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MOUSEINPUT {
          public int x;
          public int y;
          public uint mouseData;
          public uint flags;
          public uint time;
          public IntPtr extraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct KEYBDINPUT {
          public ushort virtualKey;
          public ushort scanCode;
          public uint flags;
          public uint time;
          public IntPtr extraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct HARDWAREINPUT {
          public uint message;
          public ushort lowParameter;
          public ushort highParameter;
        }

        public static void SendUnicodeText(string text) {
          if (String.IsNullOrEmpty(text)) {
            throw new ArgumentException("Unicode input text must not be empty.", "text");
          }

          const uint KeyboardInput = 1;
          const uint Unicode = 0x0004;
          const uint KeyUp = 0x0002;
          INPUT[] inputs = new INPUT[text.Length * 2];
          for (int index = 0; index < text.Length; index++) {
            ushort codeUnit = text[index];
            inputs[index * 2] = new INPUT {
              type = KeyboardInput,
              data = new InputUnion {
                keyboard = new KEYBDINPUT { scanCode = codeUnit, flags = Unicode }
              }
            };
            inputs[index * 2 + 1] = new INPUT {
              type = KeyboardInput,
              data = new InputUnion {
                keyboard = new KEYBDINPUT { scanCode = codeUnit, flags = Unicode | KeyUp }
              }
            };
          }

          uint sent = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
          if (sent != (uint)inputs.Length) {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Unicode path input was incomplete.");
          }
        }
      }
'@

    $expectedProcessId = [uint32]${expectedProcessId}

    function Find-InkForgeImportDialog {
      $windows = [Collections.Generic.List[object]]::new()
      $callback = [InkForgeImportDialog+EnumWindowsProc]{
        param([IntPtr]$window, [IntPtr]$parameter)
        if (-not [InkForgeImportDialog]::IsWindowVisible($window)) {
          return $true
        }
        $titleBuffer = [Text.StringBuilder]::new(512)
        $classBuffer = [Text.StringBuilder]::new(256)
        [void][InkForgeImportDialog]::GetWindowText($window, $titleBuffer, $titleBuffer.Capacity)
        [void][InkForgeImportDialog]::GetClassName($window, $classBuffer, $classBuffer.Capacity)
        [uint32]$ownerProcessId = 0
        [void][InkForgeImportDialog]::GetWindowThreadProcessId($window, [ref]$ownerProcessId)
        $processName = try { (Get-Process -Id $ownerProcessId -ErrorAction Stop).ProcessName } catch { '' }
        $windows.Add([pscustomobject]@{
          Handle = $window
          Title = $titleBuffer.ToString()
          ClassName = $classBuffer.ToString()
          ProcessId = $ownerProcessId
          ProcessName = $processName
        })
        return $true
      }
      [void][InkForgeImportDialog]::EnumWindows($callback, [IntPtr]::Zero)
      $expectedTitle = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedTitle}'))
      $matches = @($windows | Where-Object {
        $_.Title -eq $expectedTitle -and
        $_.ClassName -eq '#32770' -and
        $_.ProcessName -eq 'InkForge' -and
        $_.ProcessId -eq $expectedProcessId
      })
      if ($matches.Count -gt 1) {
        throw "Multiple native import dialogs belong to the exact InkForge test process $expectedProcessId."
      }
      return $matches | Select-Object -First 1
    }

    $mode = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedMode}'))
    $filePath = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPath}'))
    if ($mode -eq 'select' -and -not [IO.File]::Exists($filePath)) {
      throw 'The configured native import file does not exist.'
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
      $candidate = Find-InkForgeImportDialog
      if ($candidate) {
        if ($mode -eq 'cancel') {
          $dialogRoot = [System.Windows.Automation.AutomationElement]::FromHandle($candidate.Handle)
          $buttons = $dialogRoot.FindAll(
            [System.Windows.Automation.TreeScope]::Descendants,
            [System.Windows.Automation.PropertyCondition]::new(
              [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
              [System.Windows.Automation.ControlType]::Button
            )
          )
          $cancelButton = $buttons | Where-Object {
            $automationId = $_.Current.AutomationId
            $name = $_.Current.Name
            $automationId -in @('2', 'CancelButton') -or $name -in @('取消', 'Cancel')
          } | Select-Object -First 1
          $buttonDiagnostics = ($buttons | ForEach-Object {
            "id=$($_.Current.AutomationId);nameLength=$($_.Current.Name.Length);enabled=$($_.Current.IsEnabled)"
          }) -join ','
          $interactionDiagnostic = "buttonCount=$($buttons.Count);cancelFound=$([bool]$cancelButton);buttons=$buttonDiagnostics"

          if ($cancelButton) {
            $invokePattern = $cancelButton.GetCurrentPattern(
              [System.Windows.Automation.InvokePattern]::Pattern
            )
            $invokePattern.Invoke()
          } else {
            [void][InkForgeImportDialog]::SetForegroundWindow($candidate.Handle)
            Start-Sleep -Milliseconds 150
            [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
          }

          $cancelDeadline = [DateTime]::UtcNow.AddSeconds(2)
          while ([InkForgeImportDialog]::IsWindow($candidate.Handle) -and [DateTime]::UtcNow -lt $cancelDeadline) {
            Start-Sleep -Milliseconds 50
          }
          if ([InkForgeImportDialog]::IsWindow($candidate.Handle)) {
            [void][InkForgeImportDialog]::SendMessage(
              $candidate.Handle,
              0x0111,
              [IntPtr]2,
              [IntPtr]::Zero
            )
            $commandDeadline = [DateTime]::UtcNow.AddSeconds(2)
            while ([InkForgeImportDialog]::IsWindow($candidate.Handle) -and [DateTime]::UtcNow -lt $commandDeadline) {
              Start-Sleep -Milliseconds 50
            }
          }
          if ([InkForgeImportDialog]::IsWindow($candidate.Handle)) {
            [void][InkForgeImportDialog]::PostMessage(
              $candidate.Handle,
              0x0010,
              [IntPtr]::Zero,
              [IntPtr]::Zero
            )
          }
        } else {
          $dialogRoot = [System.Windows.Automation.AutomationElement]::FromHandle($candidate.Handle)
          $foregroundDeadline = [DateTime]::UtcNow.AddSeconds(2)
          do {
            [void][InkForgeImportDialog]::SetForegroundWindow($candidate.Handle)
            if ([InkForgeImportDialog]::GetForegroundWindow().ToInt64() -eq $candidate.Handle.ToInt64()) {
              break
            }
            Start-Sleep -Milliseconds 50
          } while ([DateTime]::UtcNow -lt $foregroundDeadline)
          if ([InkForgeImportDialog]::GetForegroundWindow().ToInt64() -ne $candidate.Handle.ToInt64()) {
            throw 'The exact native import dialog could not receive foreground input.'
          }

          [System.Windows.Forms.SendKeys]::SendWait('%n')
          Start-Sleep -Milliseconds 150
          $focusedElement = [System.Windows.Automation.AutomationElement]::FocusedElement
          $editCondition = [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Edit
          )
          $fileNameHost = $dialogRoot.FindFirst(
            [System.Windows.Automation.TreeScope]::Descendants,
            [System.Windows.Automation.PropertyCondition]::new(
              [System.Windows.Automation.AutomationElement]::AutomationIdProperty,
              '1148'
            )
          )
          $focusedValuePattern = $null
          $focusedHasValuePattern = $focusedElement -and $focusedElement.TryGetCurrentPattern(
            [System.Windows.Automation.ValuePattern]::Pattern,
            [ref]$focusedValuePattern
          )
          $fileNameHostValuePattern = $null
          $fileNameHostHasValuePattern = $fileNameHost -and $fileNameHost.TryGetCurrentPattern(
            [System.Windows.Automation.ValuePattern]::Pattern,
            [ref]$fileNameHostValuePattern
          )
          $pathEntry = if ($focusedHasValuePattern) {
            $focusedElement
          } elseif ($fileNameHostHasValuePattern) {
            $fileNameHost
          } elseif ($fileNameHost) {
            $fileNameHost.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $editCondition)
          } else {
            $null
          }
          if (-not $pathEntry) {
            $pathEntry = $dialogRoot.FindAll(
              [System.Windows.Automation.TreeScope]::Descendants,
              $editCondition
            ) | Where-Object {
              $_.Current.IsEnabled -and -not $_.Current.IsOffscreen
            } | Where-Object {
              $_.Current.AutomationId -eq '1148' -or $_.Current.Name -match '文件名|File name'
            } | Select-Object -First 1
          }
          $fileNameHandle = [InkForgeImportDialog]::GetDlgItem($candidate.Handle, 1148)
          $interactionDiagnostic = "mode=select;focusedId=$($focusedElement.Current.AutomationId);focusedType=$($focusedElement.Current.ControlType.ProgrammaticName);pathId=$($pathEntry.Current.AutomationId);pathType=$($pathEntry.Current.ControlType.ProgrammaticName);fileNameHandle=$($fileNameHandle.ToInt64())"
          if ($pathEntry -and $pathEntry.Current.ProcessId -eq $dialogRoot.Current.ProcessId) {
            $valuePatternObject = $null
            if ($pathEntry.TryGetCurrentPattern(
              [System.Windows.Automation.ValuePattern]::Pattern,
              [ref]$valuePatternObject
            )) {
              ([System.Windows.Automation.ValuePattern]$valuePatternObject).SetValue($filePath)
            } else {
              $pathEntry.SetFocus()
              [InkForgeImportDialog]::SendUnicodeText($filePath)
            }

            $buttons = $dialogRoot.FindAll(
              [System.Windows.Automation.TreeScope]::Descendants,
              [System.Windows.Automation.PropertyCondition]::new(
                [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                [System.Windows.Automation.ControlType]::Button
              )
            )
            $openButton = $buttons | Where-Object {
              $_.Current.IsEnabled -and (
                $_.Current.AutomationId -in @('1', 'OpenButton') -or
                $_.Current.Name -like '打开*' -or
                $_.Current.Name -like 'Open*'
              )
            } | Select-Object -First 1
            if ($openButton) {
              $invokePattern = $openButton.GetCurrentPattern(
                [System.Windows.Automation.InvokePattern]::Pattern
              )
              $invokePattern.Invoke()
            } else {
              $pathEntry.SetFocus()
              [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
            }
          } elseif ($fileNameHandle -ne [IntPtr]::Zero) {
            [void][InkForgeImportDialog]::SendMessageText(
              $fileNameHandle,
              0x000C,
              [IntPtr]::Zero,
              $filePath
            )
            [void][InkForgeImportDialog]::SendMessage(
              $candidate.Handle,
              0x0111,
              [IntPtr]1,
              $fileNameHandle
            )
          } else {
            throw "The native import dialog did not expose an owned file-name control. $interactionDiagnostic"
          }

          $firstEnterDeadline = [DateTime]::UtcNow.AddMilliseconds(1200)
          while ([InkForgeImportDialog]::IsWindow($candidate.Handle) -and [DateTime]::UtcNow -lt $firstEnterDeadline) {
            Start-Sleep -Milliseconds 50
          }
          if ([InkForgeImportDialog]::IsWindow($candidate.Handle)) {
            if ([InkForgeImportDialog]::GetForegroundWindow().ToInt64() -ne $candidate.Handle.ToInt64()) {
              throw "The native import dialog lost foreground ownership after path entry. $interactionDiagnostic"
            }
            [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
          }
        }

        $closeDeadline = [DateTime]::UtcNow.AddSeconds(5)
        while ([InkForgeImportDialog]::IsWindow($candidate.Handle) -and [DateTime]::UtcNow -lt $closeDeadline) {
          Start-Sleep -Milliseconds 50
        }
        if (-not [InkForgeImportDialog]::IsWindow($candidate.Handle)) {
          exit 0
        }
        throw "The native import dialog remained open after the bounded interaction. $interactionDiagnostic"
      }
      Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $deadline)

    throw 'The native InkForge import dialog was not found.'
  `;

  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Native import dialog interaction failed (exit ${code}): ${stderr.trim()}`));
    });
  });
}

async function exerciseNativeWindowFocusLoss(shortcutId) {
  const trigger = await beginShortcutRecording(shortcutId);
  const mainWindowHandle = await browser.getWindowHandle();
  const expectedSizeControlLabel = await browser.execute(() => {
    if (document.querySelector('button[aria-label="还原"]')) return '还原';
    if (document.querySelector('button[aria-label="最大化"]')) return '最大化';
    return null;
  });
  expect(expectedSizeControlLabel, 'the native window exposes a deterministic size-state control before minimize')
    .to.be.oneOf(['最大化', '还原']);
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
        await restoreNativeApplicationWindow();
        await browser.switchToWindow(mainWindowHandle);
        await browser.waitUntil(
          async () => (await browser.$(`button[aria-label="${expectedSizeControlLabel}"]`)).isExisting(),
          { timeout: 5_000, interval: 100, timeoutMsg: 'the Tauri window did not restore its pre-minimize size state' },
        );
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
      const proxySection = document.querySelector('[data-settings-entry="ai.proxy"]');
      const migrationSection = document.querySelector('[data-settings-entry="advanced.migration"]');
      const performanceSection = document.querySelector('[data-settings-entry="advanced.performanceSlo"]');
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
          developerModeChecked: document.querySelector('[data-settings-entry="advanced.devPanel"] input[type="checkbox"]')?.checked ?? null,
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

      const fabTrigger = await browser.$('#hub-quick-action-fab-trigger');
      await fabTrigger.scrollIntoView({ block: 'center', inline: 'center' });
      await browser.execute((element) => element.focus(), fabTrigger);
      await browser.keys('Enter');
      await browser.waitUntil(
        async () => browser.execute(() => (
          location.pathname === '/'
          && document.querySelectorAll('#hub-quick-action-menu [role="menuitem"]').length === 3
          && document.activeElement === document.querySelector('#hub-quick-action-menu [role="menuitem"]')
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Enter did not open and focus the floating quick-action menu' },
      );
      expect(
        await browser.execute(() => document.querySelector('#hub-quick-action-menu')?.getAttribute('aria-labelledby')),
        'the menu is labelled by the owning floating trigger',
      ).to.equal('hub-quick-action-fab-trigger');

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
          && document.activeElement?.id === 'hub-quick-action-fab-trigger'
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Escape did not close the menu and restore floating-trigger focus' },
      );

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

      await browser.execute((element) => element.focus(), fabTrigger);
      await browser.keys('Enter');
      await browser.waitUntil(
        async () => browser.execute(() => (
          document.activeElement === document.querySelector('#hub-quick-action-menu [role="menuitem"]')
        )),
        { timeout: 5_000, interval: 100, timeoutMsg: 'floating menu did not reopen for the create action' },
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

  it('imports, cancels, and rejects real files through the native Hub dialog', async function () {
    this.timeout(120_000);
    const nonce = Date.now();
    const expectedTitle = `InkForge 原生导入 ${nonce}`;
    const marker = `native-import-marker-${nonce}`;
    const markdownPath = path.join(os.tmpdir(), `inkforge-native-import-${nonce}.md`);
    const oversizePath = path.join(os.tmpdir(), `inkforge-native-import-oversize-${nonce}.md`);
    fs.writeFileSync(
      markdownPath,
      [
        '---',
        `title: "${expectedTitle}"`,
        'description: Native Hub import acceptance',
        'author: InkForge E2E',
        'tags:',
        '  - native-import',
        '---',
        '',
        `# ${expectedTitle}`,
        '',
        marker,
      ].join('\n'),
      'utf8',
    );
    fs.writeFileSync(oversizePath, Buffer.alloc((10 * 1024 * 1024) + 1, 0x61));

    const readArticleIds = () => browser.execute(() => {
      const provides = document.getElementById('app')?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      return [...(pinia?._s.get('article')?.articles ?? [])]
        .map((article) => article.id)
        .sort();
    });
    const triggerImport = async (filePath = null) => {
      const importButton = await browser.$('.card-new .new-action-btn-secondary');
      await importButton.scrollIntoView({ block: 'center', inline: 'center' });
      await importButton.waitForClickable({ timeout: 5_000, interval: 100 });
      const focusResult = await browser.executeAsync((done) => {
        const invoke = window.__TAURI_INVOKE__;
        if (typeof invoke !== 'function') {
          done({ error: 'native Tauri invoke bridge is unavailable' });
          return;
        }
        invoke('focus_window', { windowId: 'main' })
          .then(() => done({ error: null }))
          .catch((error) => done({ error: error instanceof Error ? error.message : String(error) }));
      });
      expect(focusResult.error, 'native import binds after restoring the exact main window').to.equal(null);
      await (await browser.$('.ink-titlebar')).click();
      const expectedProcessId = await getCurrentInkForgeProcessId();
      const dialogInteraction = interactWithNativeImportDialog(filePath, expectedProcessId);
      await importButton.click();
      await dialogInteraction;
    };

    try {
      await openRoute('/', '.hub-page');
      const baselineIds = await readArticleIds();

      await triggerImport();
      await browser.waitUntil(
        async () => browser.execute(() => (
          location.pathname === '/'
          && document.querySelector('.import-result-panel .import-result-note')
            ?.textContent?.includes('未选择文件')
        )),
        { timeout: 10_000, interval: 100, timeoutMsg: 'native Hub import cancellation was not surfaced' },
      );
      expect(await readArticleIds(), 'cancelling the native file dialog creates no article')
        .to.deep.equal(baselineIds);

      await triggerImport(markdownPath);
      await browser.waitUntil(
        async () => browser.execute((previousIds) => {
          const routeId = new window.URLSearchParams(location.search).get('id');
          return location.pathname === '/workstation'
            && Boolean(routeId)
            && !previousIds.includes(routeId)
            && Boolean(document.querySelector('.ProseMirror'));
        }, baselineIds),
        {
          timeout: 20_000,
          interval: 200,
          timeoutMsg: 'native Hub Markdown import did not open the imported Workstation article',
        },
      );

      const articleId = await browser.execute(() => new window.URLSearchParams(location.search).get('id'));
      expect(articleId, 'native import exposes a new route article id').to.be.a('string').and.not.equal('');
      createdArticleIds.add(articleId);
      await waitForCurrentDraftReady(articleId);

      await browser.waitUntil(
        async () => browser.execute((targetId, expectedMarker) => {
          const provides = document.getElementById('app')?.__vue_app__?._context?.provides;
          const pinia = provides
            ? Object.getOwnPropertySymbols(provides)
              .map((symbol) => provides[symbol])
              .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
            : null;
          const article = pinia?._s.get('article')?.articles
            ?.find((candidate) => candidate.id === targetId);
          return Boolean(
            article?.rawContent?.includes(expectedMarker)
            && document.querySelector('.ProseMirror')?.textContent?.includes(expectedMarker)
          );
        }, articleId, marker),
        { timeout: 15_000, interval: 200, timeoutMsg: 'imported Markdown did not hydrate through the real editor' },
      );

      const metadata = await browser.execute(async (targetId, title, expectedMarker) => {
        const provides = document.getElementById('app')?.__vue_app__?._context?.provides;
        const pinia = provides
          ? Object.getOwnPropertySymbols(provides)
            .map((symbol) => provides[symbol])
            .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
          : null;
        const articleStore = pinia?._s.get('article');
        const article = articleStore?.articles?.find((candidate) => candidate.id === targetId) ?? null;
        const database = await new Promise((resolve, reject) => {
          const request = window.indexedDB.open('InkForgeDB');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
        });
        try {
          const readOne = (storeName, key) => new Promise((resolve, reject) => {
            const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error ?? new Error(`${storeName} read failed`));
          });
          const readAll = (storeName) => new Promise((resolve, reject) => {
            const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result ?? []);
            request.onerror = () => reject(request.error ?? new Error(`${storeName} read failed`));
          });
          const [persistedArticle, auditRows] = await Promise.all([
            readOne('articles', targetId),
            readAll('auditLogs'),
          ]);
          const importAudit = [...auditRows]
            .filter((row) => row?.action === 'document.import')
            .sort((left, right) => {
              const leftTime = new Date(left?.timestamp ?? 0).getTime();
              const rightTime = new Date(right?.timestamp ?? 0).getTime();
              return rightTime - leftTime;
            })[0] ?? null;
          return {
            routeId: new window.URLSearchParams(location.search).get('id'),
            selectedArticleId: articleStore?.selectedArticleId ?? null,
            title: article?.title ?? null,
            sourceName: article?.sourceName ?? null,
            sourceIsFile: article?.sourceUrl?.startsWith('file://') ?? false,
            rawHasMarker: article?.rawContent?.includes(expectedMarker) ?? false,
            editorHasMarker: document.querySelector('.ProseMirror')?.textContent?.includes(expectedMarker) ?? false,
            persistedTitle: persistedArticle?.title ?? null,
            persistedSourceName: persistedArticle?.sourceName ?? null,
            persistedSourceIsFile: persistedArticle?.sourceUrl?.startsWith('file://') ?? false,
            auditOutcome: importAudit?.outcome ?? null,
            auditPayload: importAudit?.payload ?? null,
            expectedTitleMatches: article?.title === title,
          };
        } finally {
          database.close();
        }
      }, articleId, expectedTitle, marker);

      expect(metadata, 'native Hub import reaches route, stores, IndexedDB, editor, and audit boundaries')
        .to.deep.include({
          routeId: articleId,
          selectedArticleId: articleId,
          title: expectedTitle,
          sourceName: '导入 Markdown',
          sourceIsFile: true,
          rawHasMarker: true,
          editorHasMarker: true,
          persistedTitle: expectedTitle,
          persistedSourceName: '导入 Markdown',
          persistedSourceIsFile: true,
          auditOutcome: 'success',
          expectedTitleMatches: true,
        });
      expect(metadata.auditPayload, 'native file import records truthful audit counts').to.deep.include({
        source: 'file-picker',
        success: 1,
        failed: 0,
        skippedOversize: 0,
        errorCount: 0,
      });

      let persistence = await readVersionPersistence(articleId);
      expect(persistence.persistedArticleId, 'native import creates one durable content record').to.equal(articleId);
      expect(persistence.persistedContentCount, 'native import does not create duplicate content rows').to.equal(1);
      expect(persistence.persistedBodyEncrypted, 'native import persists the Markdown body as encrypted-v2').to.equal(true);
      expect(persistence.articleBody, 'native import keeps the real Markdown body in the article store').to.include(marker);

      await browser.refresh();
      await waitForCurrentDraftReady(articleId);
      persistence = await readVersionPersistence(articleId);
      expect(persistence.storeBody, 'native import survives full Tauri reload and decryption').to.include(marker);
      expect(persistence.persistedBodyEncrypted, 'reloaded native import remains encrypted-v2').to.equal(true);

      await openRoute('/', '.hub-page');
      const beforeOversizeIds = await readArticleIds();
      await triggerImport(oversizePath);
      await browser.waitUntil(
        async () => browser.execute(() => {
          const panel = document.querySelector('.import-result-panel');
          const text = panel?.textContent?.replace(/\s+/gu, '') ?? '';
          return location.pathname === '/' && text.includes('1超限跳过') && text.includes('文件过大');
        }),
        { timeout: 20_000, interval: 200, timeoutMsg: 'oversize native import was not rejected visibly' },
      );
      expect(await readArticleIds(), 'oversize native import creates no article')
        .to.deep.equal(beforeOversizeIds);
    } finally {
      try {
        const discoveredIds = await browser.execute((title) => {
          const provides = document.getElementById('app')?.__vue_app__?._context?.provides;
          const pinia = provides
            ? Object.getOwnPropertySymbols(provides)
              .map((symbol) => provides[symbol])
              .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
            : null;
          return (pinia?._s.get('article')?.articles ?? [])
            .filter((article) => article.title === title)
            .map((article) => article.id);
        }, expectedTitle);
        for (const discoveredId of discoveredIds) createdArticleIds.add(discoveredId);
      } finally {
        fs.rmSync(markdownPath, { force: true });
        fs.rmSync(oversizePath, { force: true });
      }
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
      const retainedTabId = closeLastProbe.storeActiveTabId ?? closeLastProbe.storeTabIds[0];
      await openRoute(`/workstation?id=${encodeURIComponent(retainedTabId)}`, '.workstation');
      await waitForCurrentDraftReady(retainedTabId);
      closeLastProbe = await readWorkstationTabSessionTruth();
      for (const extraTabId of closeLastProbe.storeTabIds.filter((id) => id !== retainedTabId)) {
        await closeWorkstationTabThroughShortcut(extraTabId);
      }
      closeLastProbe = await readWorkstationTabSessionTruth();
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
    await focusEditorForKeyboardInput(editor, true);
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
    await focusEditorForKeyboardInput(editor, true);
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
    const clickBackupButton = async () => {
      const currentButton = await browser.$('[data-data-action="create-backup"]');
      await currentButton.scrollIntoView({ block: 'center', inline: 'nearest' });
      await currentButton.waitForClickable({
        timeout: 5_000,
        interval: 100,
        timeoutMsg: 'the real immediate-backup button did not become clickable',
      });
      await currentButton.click();
    };

    expect(await installDataFaultInjection('backup-write'), 'backup failure injection replaces one browser API')
      .to.equal(1);
    try {
      await clickBackupButton();
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

    await clickBackupButton();
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

  it('creates, compares, cancels, restores, and reloads real versions through the visible panel', async function () {
    this.timeout(120_000);
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const firstLabel = `Panel v1 ${runId}`;
    const secondLabel = `Panel v2 ${runId}`;
    const firstMarker = `version-panel-first-${runId}`;
    const secondMarker = `version-panel-second-${runId}`;
    const listEnterBehavior = await readListEnterBehavior();
    const persistedListEnterBehavior = await browser.execute(() => (
      JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}')?.editor?.listEnterBehavior ?? null
    ));
    if (persistedListEnterBehavior !== listEnterBehavior) {
      await selectListEnterBehavior(
        listEnterBehavior === 'typora' ? 'Typora 默认' : '逐级减缩',
        listEnterBehavior,
      );
    }
    const articleId = await createBlankDraft(listEnterBehavior);
    const staleTargetSetup = await browser.execute(async (title, sourceUrl) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const articleStore = pinia?._s.get('article');
      if (!articleStore) return { articleId: null, failure: 'article store unavailable' };
      try {
        const article = await articleStore.addArticle({
          title,
          sourceUrl,
          sourceName: 'Native version failure proof',
          rawContent: 'Real stale-version target',
        });
        return { articleId: article.id, failure: null };
      } catch (error) {
        return {
          articleId: null,
          failure: error instanceof Error ? error.message : String(error),
        };
      }
    }, `Stale version target ${runId}`, `manual://version-stale/${runId}`);
    if (staleTargetSetup.articleId) createdArticleIds.add(staleTargetSetup.articleId);
    expect(staleTargetSetup.failure, 'real stale-version target is created through the production store')
      .to.equal(null);
    expect(staleTargetSetup.articleId, 'real stale-version target exposes a persistent id')
      .to.be.a('string').and.not.equal('');

    const editor = await browser.$('.ProseMirror');

    await focusEditorForKeyboardInput(editor, true);
    await browser.keys(firstMarker);
    await pressConfiguredShortcut('save', 'Ctrl+S');
    await browser.waitUntil(
      async () => (await readVersionPersistence(articleId)).storeBody.includes(firstMarker),
      { timeout: 10_000, interval: 100, timeoutMsg: 'the first real editor state did not save before versioning' },
    );
    await openRoute(
      `/workstation?id=${encodeURIComponent(articleId)}&manager=versions`,
      '.version-panel',
    );

    const saveVisibleVersion = async (label) => {
      const labelInput = await browser.$('.version-panel .label-input');
      await labelInput.setValue(label);
      await (await browser.$('.version-panel .save-btn')).click();
      await browser.waitUntil(
        async () => (await readVersionPersistence(articleId)).storeVersions.some(
          (version) => version.label === label,
        ),
        { timeout: 10_000, interval: 100, timeoutMsg: `visible version ${label} was not persisted` },
      );
    };

    const versionButtonByLabel = async (label) => {
      const buttons = await browser.$$('button.version-item');
      for (const button of buttons) {
        if ((await button.getText()).includes(label)) return button;
      }
      throw new Error(`Visible version button not found: ${label}`);
    };

    await saveVisibleVersion(firstLabel);
    await focusEditorForKeyboardInput(await browser.$('.ProseMirror'));
    await pressConfiguredShortcut('selectAll', 'Ctrl+A');
    await browser.keys(`${firstMarker} ${secondMarker}`);
    await pressConfiguredShortcut('save', 'Ctrl+S');
    await browser.waitUntil(
      async () => (await readVersionPersistence(articleId)).storeBody.includes(secondMarker),
      { timeout: 10_000, interval: 100, timeoutMsg: 'the second real editor state did not save before versioning' },
    );
    await saveVisibleVersion(secondLabel);

    const created = await readVersionPersistence(articleId);
    const firstVersion = created.storeVersions.find((version) => version.label === firstLabel);
    const secondVersion = created.storeVersions.find((version) => version.label === secondLabel);
    expect(firstVersion?.body, 'the first visible version captures the first real editor state')
      .to.include(firstMarker).and.not.include(secondMarker);
    expect(secondVersion?.body, 'the second visible version captures the changed editor state')
      .to.include(firstMarker).and.include(secondMarker);
    expect(
      created.persistedVersions.find((version) => version.id === firstVersion?.id),
      'the first visible version reaches IndexedDB with its exact id and payload',
    ).to.deep.equal(firstVersion);
    expect(
      created.persistedVersions.find((version) => version.id === secondVersion?.id),
      'the second visible version reaches IndexedDB with its exact id and payload',
    ).to.deep.equal(secondVersion);

    await (await browser.$('.version-panel .diff-toggle-btn')).click();
    await (await versionButtonByLabel(firstLabel)).click();
    await (await versionButtonByLabel(secondLabel)).click();
    const compareButton = await browser.$('.version-panel .diff-execute-btn');
    expect(await compareButton.isEnabled(), 'two visible version selections enable comparison').to.equal(true);
    await compareButton.click();

    const diffModal = await browser.$('.diff-modal[role="dialog"]');
    await diffModal.waitForDisplayed({ timeout: 5_000 });
    const diffText = await diffModal.getText();
    expect(diffText, 'the semantic diff names both persisted versions').to.include(firstLabel).and.include(secondLabel);
    expect(diffText, 'the semantic diff exposes the changed real marker').to.include(secondMarker);
    await (await browser.$('.diff-modal .close-btn')).click();
    await diffModal.waitForDisplayed({ reverse: true, timeout: 5_000 });

    await (await browser.$('.version-panel .diff-toggle-btn')).click();
    const firstVersionButton = await versionButtonByLabel(firstLabel);
    expect(await firstVersionButton.getTagName(), 'version rows use native keyboard-operable controls').to.equal('button');
    expect(await firstVersionButton.getAttribute('type')).to.equal('button');
    await firstVersionButton.click();
    const confirmOverlay = await browser.$('.confirm-overlay');
    await confirmOverlay.waitForDisplayed({ timeout: 5_000 });
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('data-version-switch-action')),
      'the destructive version switch initially focuses its safe cancel action',
    ).to.equal('cancel');
    await browser.keys(['Shift', 'Tab']);
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('data-version-switch-action')),
      'Shift+Tab wraps to the final version-switch action',
    ).to.equal('confirm');
    await browser.keys('Tab');
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('data-version-switch-action')),
      'Tab wraps back to the first version-switch action',
    ).to.equal('cancel');
    await browser.keys('Escape');
    await confirmOverlay.waitForDisplayed({ reverse: true, timeout: 5_000 });
    expect(
      await browser.execute(() => document.activeElement?.textContent?.trim() ?? ''),
      'Escape restores focus to the invoking visible version row',
    ).to.include(firstLabel);
    expect((await readVersionPersistence(articleId)).storeCurrentVersionId, 'cancel preserves the newer version')
      .to.equal(secondVersion?.id);

    await firstVersionButton.click();
    let failureOverlay = await browser.$('.confirm-overlay');
    await failureOverlay.waitForDisplayed({ timeout: 5_000 });
    const staleSelectionFailure = await browser.execute((targetArticleId) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const articleStore = pinia?._s.get('article');
      if (!articleStore) return 'article store unavailable';
      articleStore.selectArticle(targetArticleId);
      return null;
    }, staleTargetSetup.articleId);
    expect(staleSelectionFailure, 'stale version probe selects another real production article').to.equal(null);
    await browser.waitUntil(
      async () => browser.execute((targetArticleId) => {
        const root = document.getElementById('app');
        const provides = root?.__vue_app__?._context?.provides;
        const pinia = provides
          ? Object.getOwnPropertySymbols(provides)
            .map((symbol) => provides[symbol])
            .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
          : null;
        const editorStore = pinia?._s.get('editor');
        return editorStore?.currentContent?.articleId === targetArticleId
          && editorStore?.status === 'ready';
      }, staleTargetSetup.articleId),
      { timeout: 10_000, interval: 100, timeoutMsg: 'real stale-version target did not become editor authority' },
    );

    await (await failureOverlay.$('.confirm-ok-btn')).click();
    const switchError = await failureOverlay.$('[data-version-switch-error]');
    await switchError.waitForDisplayed({ timeout: 5_000 });
    expect(await switchError.getText(), 'stale version failure is visible and actionable')
      .to.include('目标版本已不存在');
    expect(await failureOverlay.isDisplayed(), 'stale version failure keeps the destructive dialog open')
      .to.equal(true);
    expect(
      await (await failureOverlay.$('.confirm-dialog')).getAttribute('aria-describedby'),
      'dynamic version failure joins the dialog description',
    ).to.include('version-switch-error');
    await (await failureOverlay.$('[data-version-switch-action="cancel"]')).click();
    await failureOverlay.waitForDisplayed({ reverse: true, timeout: 5_000 });

    const originalSelectionFailure = await browser.execute((targetArticleId) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const articleStore = pinia?._s.get('article');
      if (!articleStore) return 'article store unavailable';
      articleStore.selectArticle(targetArticleId);
      return null;
    }, articleId);
    expect(originalSelectionFailure, 'version success path restores the original production article').to.equal(null);
    await waitForCurrentDraftReady(articleId);

    const restoredFirstVersionButton = await versionButtonByLabel(firstLabel);
    await restoredFirstVersionButton.click();
    failureOverlay = await browser.$('.confirm-overlay');
    await failureOverlay.waitForDisplayed({ timeout: 5_000 });
    await (await failureOverlay.$('.confirm-ok-btn')).click();
    await browser.waitUntil(
      async () => (await readVersionPersistence(articleId)).storeCurrentVersionId === firstVersion?.id,
      { timeout: 10_000, interval: 100, timeoutMsg: 'confirmed visible version restore did not persist' },
    );

    const switchedText = await (await browser.$('.ProseMirror')).getText();
    expect(switchedText, 'confirmed restore renders the selected version body').to.include(firstMarker);
    expect(switchedText, 'confirmed restore removes content introduced only by the newer version')
      .not.to.include(secondMarker);

    await browser.refresh();
    await waitForMainWindow();
    await waitForCurrentDraftReady(articleId);
    const reloaded = await readVersionPersistence(articleId);
    expect(reloaded.storeCurrentVersionId, 'the restored currentVersionId survives a real app reload')
      .to.equal(firstVersion?.id);
    expect(reloaded.persistedCurrentVersionId, 'IndexedDB retains the restored currentVersionId')
      .to.equal(firstVersion?.id);
    expect(reloaded.persistedVersions, 'reload preserves the exact version history').to.deep.equal(reloaded.storeVersions);
    expect(reloaded.storeBody, 'reload preserves the restored body').to.include(firstMarker).and.not.include(secondMarker);
    expect(reloaded.persistedBodyEncrypted, 'version restore retains encrypted-v2 storage').to.equal(true);
  });

  it('replaces, formats, tables, serializes, previews, and reloads real editor content', async function () {
    this.timeout(150_000);
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const needle = `editor-needle-${runId}`;
    const replacement = `editor-replaced-${runId}`;
    const linkUrl = `https://example.test/inkforge/${runId}`;
    const articleId = await createBlankDraftThroughHub();
    const editor = await browser.$('.ProseMirror');

    await startSmartPunctuationErrorProbe();
    let probeStopped = false;
    try {
      await focusEditorForKeyboardInput(editor, true);
      for (const character of `${needle} middle ${needle}`) await browser.keys(character);

      const replaceShortcut = await pressConfiguredShortcut('replace', 'Ctrl+H');
      const findPanel = await browser.$('.find-replace-panel');
      await findPanel.waitForDisplayed({ timeout: 5_000 });
      expect(await findPanel.getText(), `${replaceShortcut} opens the visible replace surface`)
        .to.include('Find and replace').and.include('Replace all');
      const findInput = await findPanel.$('input[placeholder="Find text"]');
      const replacementInput = await findPanel.$('input[placeholder="Replace with"]');
      await findInput.setValue(needle);
      const matchCount = await findPanel.$('.find-replace-count');
      await browser.waitUntil(
        async () => (await matchCount.getText()).endsWith('/2'),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Find did not resolve both real editor matches' },
      );
      await replacementInput.setValue(replacement);
      await browser.waitUntil(
        async () => (await replacementInput.getValue()) === replacement,
        { timeout: 5_000, interval: 100, timeoutMsg: 'Replacement field did not retain the complete real value' },
      );
      const replaceAll = await findPanel.$('.find-replace-btn.primary');
      await replaceAll.waitForEnabled({ timeout: 5_000 });
      await replaceAll.click();
      await browser.waitUntil(
        async () => browser.execute((oldText, newText) => {
          const text = document.querySelector('.ProseMirror')?.textContent ?? '';
          return !text.includes(oldText) && text.split(newText).length - 1 === 2;
        }, needle, replacement),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Replace all did not mutate both real editor matches' },
      );
      await (await findPanel.$('button[aria-label="Close find replace"]')).click();
      await findPanel.waitForDisplayed({ reverse: true, timeout: 5_000 });

      await focusEditorForKeyboardInput(editor);
      await pressConfiguredShortcut('selectAll', 'Ctrl+A');
      let floatingToolbar = await browser.$('.floating-toolbar');
      await floatingToolbar.waitForDisplayed({ timeout: 5_000 });
      const boldButton = await floatingToolbar.$('button[title="加粗 (Ctrl+B)"]');
      await boldButton.waitForClickable({ timeout: 5_000 });
      await boldButton.click();
      expect(await browser.execute(() => document.querySelector('.ProseMirror strong')?.textContent ?? null),
        'the visible bold control formats the selected real text').to.include(replacement);

      await focusEditorForKeyboardInput(editor);
      await pressConfiguredShortcut('selectAll', 'Ctrl+A');
      floatingToolbar = await browser.$('.floating-toolbar');
      await floatingToolbar.waitForDisplayed({ timeout: 5_000 });
      await (await floatingToolbar.$('button[title="链接 (Ctrl+K)"]')).click();
      let linkInput = await browser.$('.ft-link-field');
      await linkInput.waitForDisplayed({ timeout: 5_000 });
      await linkInput.setValue('javascript:alert(1)');
      await (await browser.$('.ft-link-confirm')).click();
      expect(await browser.execute(() => document.querySelector('.ProseMirror a') === null),
        'the visible link control rejects a dangerous protocol').to.equal(true);
      const linkError = await browser.$('.ft-link-error');
      await linkError.waitForDisplayed({ timeout: 5_000 });
      expect(await linkError.getText(), 'dangerous protocol rejection is visible and actionable')
        .to.include('安全');
      linkInput = await browser.$('.ft-link-field');
      await linkInput.waitForDisplayed({ timeout: 5_000 });
      expect(await linkInput.getAttribute('aria-invalid'), 'the rejected URL is exposed to assistive technology')
        .to.equal('true');
      await linkInput.setValue(linkUrl);
      await linkError.waitForDisplayed({ reverse: true, timeout: 5_000 });
      await (await browser.$('.ft-link-confirm')).click();
      await browser.waitUntil(
        async () => browser.execute((href) => document.querySelector('.ProseMirror a')?.getAttribute('href') === href, linkUrl),
        { timeout: 5_000, interval: 100, timeoutMsg: 'the visible link control did not apply the safe URL' },
      );

      await browser.waitUntil(
        async () => browser.execute(() => document.activeElement?.classList.contains('ProseMirror') === true),
        { timeout: 5_000, interval: 50, timeoutMsg: 'link confirmation did not restore real editor focus' },
      );
      await focusEditorForKeyboardInput(editor, true);
      await browser.keys('Enter');
      const tableShortcut = await pressConfiguredShortcut('table', 'Ctrl+Alt+Shift+T');
      const table = await browser.$('.ProseMirror table');
      await table.waitForDisplayed({ timeout: 5_000 });
      expect(await table.$$('tr'), `${tableShortcut} inserts the configured 3-row table`).to.have.length(3);
      const tableToolbar = await browser.$('.table-floating-toolbar');
      await tableToolbar.waitForDisplayed({ timeout: 5_000 });
      const addRowBelow = await tableToolbar.$('button[title="Add row below"]');
      await addRowBelow.waitForClickable({ timeout: 5_000 });
      await addRowBelow.click();
      await browser.waitUntil(
        async () => (await browser.$$('.ProseMirror table tr')).length === 4,
        { timeout: 5_000, interval: 100, timeoutMsg: 'table toolbar did not add a real fourth row' },
      );

      await browser.keys(['Control', 's']);
      await browser.waitUntil(
        async () => {
          const state = await readVersionPersistence(articleId);
          return state.storeBody.includes(replacement)
            && state.articleBody.includes(replacement)
            && state.persistedBodyEncrypted;
        },
        { timeout: 20_000, interval: 100, timeoutMsg: 'formatted table document did not reach encrypted persistence' },
      );

      const sourceShortcut = await pressConfiguredShortcut('setSourceMode', 'Ctrl+Alt+S');
      const sourceEditor = await browser.$('.source-mode-layout .cm-content');
      await sourceEditor.waitForDisplayed({ timeout: 5_000 });
      const sourceText = await sourceEditor.getText();
      expect(sourceText, `${sourceShortcut} projects the real serialized document`).to.include(replacement).and.include(linkUrl);

      const previewShortcut = await pressConfiguredShortcut('setPreviewMode', 'Ctrl+Alt+P');
      const preview = await browser.$('.preview-mode-shell');
      await preview.waitForDisplayed({ timeout: 5_000 });
      const previewState = await browser.execute((expectedText) => {
        const shell = document.querySelector('.preview-mode-shell');
        return {
          markerCount: (shell?.textContent ?? '').split(expectedText).length - 1,
          href: shell?.querySelector('a')?.getAttribute('href') ?? null,
          strongText: shell?.querySelector('strong')?.textContent ?? null,
          tableRows: shell?.querySelectorAll('table tr').length ?? 0,
        };
      }, replacement);
      expect(previewState, `${previewShortcut} renders the same safe serialized document read-only`).to.deep.equal({
        markerCount: 2,
        href: linkUrl,
        strongText: `${replacement} middle ${replacement}`,
        tableRows: 4,
      });

      await pressConfiguredShortcut('setTyporaMode', 'Ctrl+Alt+T');
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('.editor-mode-shell.mode-typora .ProseMirror'))),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Typora mode did not recover after serialized preview proof' },
      );
      await browser.refresh();
      await waitForMainWindow();
      await waitForCurrentDraftReady(articleId);
      const reloadedState = await browser.execute((expectedText) => {
        const surface = document.querySelector('.ProseMirror');
        return {
          markerCount: (surface?.textContent ?? '').split(expectedText).length - 1,
          href: surface?.querySelector('a')?.getAttribute('href') ?? null,
          strongText: surface?.querySelector('strong')?.textContent ?? null,
          tableRows: surface?.querySelectorAll('table tr').length ?? 0,
        };
      }, replacement);
      expect(reloadedState, 'reload reconstructs inline marks, safe link, and table rows from encrypted storage')
        .to.deep.equal({
          markerCount: 2,
          href: linkUrl,
          strongText: `${replacement} middle ${replacement}`,
          tableRows: 4,
        });
      expect((await readVersionPersistence(articleId)).persistedBodyEncrypted, 'reloaded editor stays encrypted-v2')
        .to.equal(true);

      const errors = await stopSmartPunctuationErrorProbe();
      probeStopped = true;
      expect(errors, 'fresh toolbar, keymap, serializer, and mode-switch runtime errors').to.deep.equal([]);
    } finally {
      if (!probeStopped) await stopSmartPunctuationErrorProbe();
    }
  });

  it('coalesces concurrent real delete and restore mutations without duplicate audits', async function () {
    this.timeout(120_000);
    const articleId = await createBlankDraftThroughHub();
    const categorySetup = await browser.execute(async (targetArticleId, categoryName) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const articleStore = pinia?._s.get('article');
      const categoryStore = pinia?._s.get('category');
      if (!articleStore || !categoryStore) {
        return { categoryId: null, failure: 'required production stores unavailable' };
      }

      let categoryId = null;
      try {
        const category = await categoryStore.addCategory(categoryName);
        categoryId = category.id;
        await articleStore.moveToCategory(targetArticleId, category.id);
        return { categoryId, failure: null };
      } catch (error) {
        return {
          categoryId,
          failure: error instanceof Error ? error.message : String(error),
        };
      }
    }, articleId, `Concurrent lifecycle ${Date.now().toString(36)}`);

    if (categorySetup.categoryId) createdCategoryIds.add(categorySetup.categoryId);
    expect(categorySetup.failure, 'real category setup commits through production stores').to.equal(null);
    expect(categorySetup.categoryId, 'real category setup returns a persistent id').to.be.a('string').and.not.equal('');

    await openRoute('/drafts', '.drafts-view');
    const openTrash = await browser.$('[data-drafts-action="open-trash"]');
    await openTrash.click();
    const trashPanel = await browser.$('.trash-panel[role="dialog"]');
    await trashPanel.waitForDisplayed({ timeout: 10_000 });
    await (await trashPanel.$('[aria-label="关闭回收站"]')).click();
    await trashPanel.waitForExist({ reverse: true, timeout: 5_000 });

    const result = await browser.execute(async (targetArticleId, targetCategoryId) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const articleStore = pinia?._s.get('article');
      const trashStore = pinia?._s.get('trash');
      const categoryStore = pinia?._s.get('category');
      if (!articleStore || !trashStore || !categoryStore) {
        return { failure: 'required production stores unavailable' };
      }

      const database = await new Promise((resolve, reject) => {
        const request = window.indexedDB.open('InkForgeDB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
      });
      const readArticle = () => new Promise((resolve, reject) => {
        const request = database.transaction('articles', 'readonly').objectStore('articles').get(targetArticleId);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error ?? new Error('article read failed'));
      });
      const readCategory = () => new Promise((resolve, reject) => {
        const request = database.transaction('categories', 'readonly').objectStore('categories').get(targetCategoryId);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error ?? new Error('category read failed'));
      });
      const readAudits = () => new Promise((resolve, reject) => {
        const request = database.transaction('auditLogs', 'readonly').objectStore('auditLogs').getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error ?? new Error('audit log read failed'));
      });
      const readContentCount = () => new Promise((resolve, reject) => {
        const request = database
          .transaction('contents', 'readonly')
          .objectStore('contents')
          .index('articleId')
          .count(targetArticleId);
        request.onsuccess = () => resolve(request.result ?? 0);
        request.onerror = () => reject(request.error ?? new Error('content count failed'));
      });
      const countAudits = (rows, action, source) => rows.filter((entry) => (
        (entry.docId === targetArticleId || entry.resourceId === targetArticleId)
        && entry.action === action
        && entry.source === source
      )).length;

      try {
        const before = await readAudits();
        const beforeCategory = await readCategory();
        const beforeLiveCategory = categoryStore.categories
          .find((category) => category.id === targetCategoryId);

        const deleteResults = await Promise.all([
          articleStore.deleteArticle(targetArticleId),
          articleStore.deleteArticle(targetArticleId),
        ]);
        const afterDelete = await readAudits();
        const trashedArticle = await readArticle();
        const afterDeleteCategory = await readCategory();
        const afterDeleteLiveCategory = categoryStore.categories
          .find((category) => category.id === targetCategoryId);

        const firstRestore = trashStore.restore(targetArticleId);
        const secondRestore = trashStore.restore(targetArticleId);
        const restoredArticles = await Promise.all([firstRestore, secondRestore]);
        await articleStore.loadArticles();

        const afterRestore = await readAudits();
        const restoredArticle = await readArticle();
        const afterRestoreCategory = await readCategory();
        const afterRestoreLiveCategory = categoryStore.categories
          .find((category) => category.id === targetCategoryId);
        return {
          failure: null,
          deleteResults,
          deleteAuditDelta: countAudits(afterDelete, 'document.delete', 'useArticleStore')
            - countAudits(before, 'document.delete', 'useArticleStore'),
          restoredIds: restoredArticles.map((article) => article.id),
          restoreAuditDelta: countAudits(afterRestore, 'document.restore', 'useTrashStore.restore')
            - countAudits(afterDelete, 'document.restore', 'useTrashStore.restore'),
          trashedStatus: trashedArticle?.status ?? null,
          restoredStatus: restoredArticle?.status ?? null,
          liveRestoredStatus: articleStore.articles
            .find((article) => article.id === targetArticleId)?.status ?? null,
          categoryCounts: {
            beforePersisted: beforeCategory?.articleCount ?? null,
            beforeLive: beforeLiveCategory?.articleCount ?? null,
            afterDeletePersisted: afterDeleteCategory?.articleCount ?? null,
            afterDeleteLive: afterDeleteLiveCategory?.articleCount ?? null,
            afterRestorePersisted: afterRestoreCategory?.articleCount ?? null,
            afterRestoreLive: afterRestoreLiveCategory?.articleCount ?? null,
          },
          contentCount: await readContentCount(),
        };
      } catch (error) {
        return { failure: error instanceof Error ? error.message : String(error) };
      } finally {
        database.close();
      }
    }, articleId, categorySetup.categoryId);

    expect(result.failure, 'concurrent production mutation probe completes without a repository error').to.equal(null);
    expect(result.deleteResults, 'duplicate soft-delete callers observe the same committed outcome')
      .to.deep.equal([null, null]);
    expect(result.deleteAuditDelta, 'duplicate soft-delete callers create one real audit side effect').to.equal(1);
    expect(result.trashedStatus, 'the single soft-delete commit reaches IndexedDB').to.equal('trashed');
    expect(result.restoredIds, 'duplicate restore callers resolve the same real article').to.deep.equal([articleId, articleId]);
    expect(result.restoreAuditDelta, 'duplicate restore callers create one real audit side effect').to.equal(1);
    expect(result.restoredStatus, 'the single restore commit reaches IndexedDB').to.equal('draft');
    expect(result.liveRestoredStatus, 'the restored article is reconciled into the live article store').to.equal('draft');
    expect(result.categoryCounts, 'the real category count follows the same committed delete/restore boundary')
      .to.deep.equal({
        beforePersisted: 1,
        beforeLive: 1,
        afterDeletePersisted: 0,
        afterDeleteLive: 0,
        afterRestorePersisted: 1,
        afterRestoreLive: 1,
      });
    expect(result.contentCount, 'coalesced delete and restore preserve the real encrypted content').to.be.greaterThan(0);
  });

  it('moves, restores, and permanently purges a real draft through the visible trash lifecycle', async function () {
    this.timeout(180_000);
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const marker = `trash-lifecycle-${runId}`;
    const failureArticleId = await createBlankDraftThroughHub();
    const articleId = await createBlankDraftThroughHub();

    const readLifecycle = async () => browser.execute(async (targetArticleId) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const articleStore = pinia?._s.get('article');
      const trashStore = pinia?._s.get('trash');
      const database = await new Promise((resolve, reject) => {
        const request = window.indexedDB.open('InkForgeDB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('InkForgeDB open failed'));
      });
      const readRecord = (storeName, key) => new Promise((resolve, reject) => {
        const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error ?? new Error(`${storeName} read failed`));
      });
      const readAll = (storeName) => new Promise((resolve, reject) => {
        const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error ?? new Error(`${storeName} read failed`));
      });
      const readContents = () => new Promise((resolve, reject) => {
        const request = database
          .transaction('contents', 'readonly')
          .objectStore('contents')
          .index('articleId')
          .getAll(targetArticleId);
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error ?? new Error('contents read failed'));
      });

      try {
        const [persistedArticle, persistedContents, auditRows] = await Promise.all([
          readRecord('articles', targetArticleId),
          readContents(),
          readAll('auditLogs'),
        ]);
        const compactArticle = (article) => article ? {
          id: article.id,
          status: article.status,
          deletedAt: article.deletedAt ? String(article.deletedAt) : null,
          expiresAt: article.expiresAt ? String(article.expiresAt) : null,
        } : null;
        return {
          liveArticle: compactArticle(
            articleStore?.articles?.find((article) => article.id === targetArticleId) ?? null,
          ),
          trashArticle: compactArticle(
            trashStore?.items?.find((article) => article.id === targetArticleId) ?? null,
          ),
          persistedArticle: compactArticle(persistedArticle),
          persistedContentCount: persistedContents.length,
          audits: auditRows
            .filter((entry) => entry.docId === targetArticleId || entry.resourceId === targetArticleId)
            .map((entry) => ({
              action: entry.action,
              severity: entry.severity,
              outcome: entry.outcome,
              source: entry.source ?? null,
              payload: entry.payload ?? {},
            })),
        };
      } finally {
        database.close();
      }
    }, articleId);

    const deleteThroughVisibleFileManager = async () => {
      await openRoute(
        `/workstation?id=${encodeURIComponent(articleId)}&manager=files`,
        '.fm-root',
      );
      await openArticleContextMenuForTrash(articleId);
      await (await browser.$('[data-article-action="delete"]')).click();

      let confirmation = await browser.$('[data-category-delete-confirm]');
      await confirmation.waitForDisplayed({ timeout: 5_000 });
      expect(await (await confirmation.$('.fm-confirm-modal')).getAttribute('role'), 'soft delete uses a modal destructive alert contract')
        .to.equal('alertdialog');
      expect(await (await confirmation.$('.fm-confirm-title')).getText(), 'soft delete is named as a trash move')
        .to.equal('移入回收站');
      const confirmationText = await (await confirmation.$('.fm-confirm-text')).getText();
      expect(confirmationText, 'soft-delete copy exposes the real recovery path')
        .to.include('回收站').and.include('恢复').and.not.include('不可撤销');
      await browser.waitUntil(
        async () => (
          await browser.execute(() => document.activeElement?.getAttribute('data-file-delete-action'))
        ) === 'cancel',
        { timeout: 5_000, interval: 100, timeoutMsg: 'file delete dialog did not focus its safe cancel action' },
      );
      await browser.keys(['Shift', 'Tab']);
      expect(
        await browser.execute(() => document.activeElement?.getAttribute('data-file-delete-action')),
        'Shift+Tab wraps to the final file-delete action',
      ).to.equal('confirm');
      await browser.keys('Tab');
      expect(
        await browser.execute(() => document.activeElement?.getAttribute('data-file-delete-action')),
        'Tab wraps back to the safe file-delete action',
      ).to.equal('cancel');
      await browser.keys('Escape');
      await confirmation.waitForExist({ reverse: true, timeout: 5_000 });
      expect(
        await browser.execute(() => document.activeElement?.getAttribute('data-file-article-id')),
        'cancelling the file-delete dialog restores focus to the invoking article row',
      ).to.equal(articleId);

      await openArticleContextMenuForTrash(articleId);
      await (await browser.$('[data-article-action="delete"]')).click();
      confirmation = await browser.$('[data-category-delete-confirm]');
      await confirmation.waitForDisplayed({ timeout: 5_000 });
      await (await confirmation.$('[data-file-delete-submit]')).click();

      await browser.waitUntil(
        async () => {
          const state = await readLifecycle();
          return state.liveArticle === null
            && state.persistedArticle?.status === 'trashed'
            && state.persistedContentCount > 0
            && state.audits.some((entry) => (
              entry.action === 'document.delete'
              && entry.source === 'useArticleStore'
              && entry.payload?.softDelete === true
            ));
        },
        { timeout: 15_000, interval: 150, timeoutMsg: 'visible soft delete did not reach IndexedDB and audit log' },
      );
    };

    await openRoute('/drafts', '.drafts-view');
    const initializeTrash = await browser.$('[data-drafts-action="open-trash"]');
    await initializeTrash.click();
    const initializedTrashPanel = await browser.$('.trash-panel[role="dialog"]');
    await initializedTrashPanel.waitForDisplayed({ timeout: 10_000 });
    await (await initializedTrashPanel.$('[aria-label="关闭回收站"]')).click();
    await initializedTrashPanel.waitForExist({ reverse: true, timeout: 5_000 });

    await openRoute(
      `/workstation?id=${encodeURIComponent(failureArticleId)}&manager=files`,
      '.fm-root',
    );
    await openArticleContextMenuForTrash(failureArticleId);
    await (await browser.$('[data-article-action="delete"]')).click();
    const failureConfirmation = await browser.$('[data-category-delete-confirm]');
    await failureConfirmation.waitForDisplayed({ timeout: 5_000 });

    const staleDeleteResult = await browser.execute(async (targetArticleId) => {
      const root = document.getElementById('app');
      const provides = root?.__vue_app__?._context?.provides;
      const pinia = provides
        ? Object.getOwnPropertySymbols(provides)
          .map((symbol) => provides[symbol])
          .find((candidate) => candidate?._s && typeof candidate._s.get === 'function')
        : null;
      const articleStore = pinia?._s.get('article');
      const trashStore = pinia?._s.get('trash');
      if (!articleStore || !trashStore) {
        return { failure: 'required production stores unavailable', contentDeleted: null };
      }
      try {
        await articleStore.deleteArticle(targetArticleId);
        const purgeResult = await trashStore.purge(targetArticleId);
        return { failure: null, contentDeleted: purgeResult.contentDeleted };
      } catch (error) {
        return {
          failure: error instanceof Error ? error.message : String(error),
          contentDeleted: null,
        };
      }
    }, failureArticleId);
    expect(staleDeleteResult.failure, 'real stale-delete setup commits through delete and purge stores')
      .to.equal(null);
    expect(staleDeleteResult.contentDeleted, 'real stale-delete setup removes persisted content').to.be.greaterThan(0);
    createdArticleIds.delete(failureArticleId);

    await (await failureConfirmation.$('[data-file-delete-submit]')).click();
    const visibleDeleteError = await failureConfirmation.$('[data-file-delete-error]');
    await visibleDeleteError.waitForDisplayed({ timeout: 5_000 });
    expect((await visibleDeleteError.getText()).trim(), 'stale FileManager delete exposes a visible error')
      .to.not.equal('');
    expect(await failureConfirmation.isDisplayed(), 'failed FileManager delete keeps the alert dialog open')
      .to.equal(true);
    expect(
      await (await failureConfirmation.$('.fm-confirm-modal')).getAttribute('aria-describedby'),
      'dynamic FileManager failure joins the destructive dialog description',
    ).to.include('file-manager-delete-error');
    await (await failureConfirmation.$('[data-file-delete-action="cancel"]')).click();
    await failureConfirmation.waitForExist({ reverse: true, timeout: 5_000 });
    expect(
      await browser.execute(() => document.activeElement?.classList.contains('fm-new-btn') === true),
      'a vanished invoking row restores focus to the FileManager fallback action',
    ).to.equal(true);

    await openRoute(`/workstation?id=${encodeURIComponent(articleId)}`, '.ProseMirror');
    await waitForCurrentDraftReady(articleId);
    await focusEditorForKeyboardInput(await browser.$('.ProseMirror'), true);
    for (const character of marker) await browser.keys(character);
    await browser.keys(['Control', 's']);
    await browser.waitUntil(
      async () => (await readVersionPersistence(articleId)).storeBody.includes(marker),
      { timeout: 10_000, interval: 100, timeoutMsg: 'trash lifecycle source draft did not save' },
    );
    expect((await readVersionPersistence(articleId)).persistedBodyEncrypted, 'source body uses encrypted-v2 storage')
      .to.equal(true);

    await deleteThroughVisibleFileManager();
    const deleted = await readLifecycle();
    expect(deleted.persistedArticle?.status, 'soft delete preserves a real trashed article row').to.equal('trashed');
    expect(deleted.persistedContentCount, 'soft delete preserves the real content for recovery').to.be.greaterThan(0);

    await openRoute('/drafts', '.drafts-view');
    const openTrash = await browser.$('[data-drafts-action="open-trash"]');
    expect(await openTrash.getTagName(), 'the trash entry is a native keyboard-operable control').to.equal('button');
    await openTrash.click();
    let trashPanel = await browser.$('.trash-panel[role="dialog"]');
    await trashPanel.waitForDisplayed({ timeout: 10_000 });
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('aria-label')),
      'opening the trash panel moves focus through the real visible trigger',
    ).to.equal('关闭回收站');
    await (await trashPanel.$('[aria-label="关闭回收站"]')).click();
    await trashPanel.waitForExist({ reverse: true, timeout: 5_000 });
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('data-drafts-action')),
      'closing the trash panel restores focus to its visible trigger',
    ).to.equal('open-trash');
    await openTrash.click();
    trashPanel = await browser.$('.trash-panel[role="dialog"]');
    await trashPanel.waitForDisplayed({ timeout: 10_000 });
    const trashItem = await browser.$(`[data-trash-article-id="${articleId}"]`);
    await trashItem.waitForDisplayed({ timeout: 10_000 });
    await (await trashItem.$('[data-trash-action="restore"]')).click();

    await browser.waitUntil(
      async () => {
        const state = await readLifecycle();
        return state.liveArticle?.status === 'draft'
          && state.persistedArticle?.status === 'draft'
          && state.persistedContentCount > 0
          && state.audits.some((entry) => (
            entry.action === 'document.restore'
            && entry.source === 'useTrashStore.restore'
          ));
      },
      { timeout: 15_000, interval: 150, timeoutMsg: 'visible restore did not recover the draft and audit it' },
    );
    await browser.refresh();
    await waitForMainWindow();
    await openRoute(`/workstation?id=${encodeURIComponent(articleId)}`, '.ProseMirror');
    await waitForCurrentDraftReady(articleId);
    expect(await (await browser.$('.ProseMirror')).getText(), 'restored content survives a real app reload').to.include(marker);
    expect((await readVersionPersistence(articleId)).persistedBodyEncrypted, 'restored content remains encrypted-v2')
      .to.equal(true);

    await deleteThroughVisibleFileManager();
    await openRoute('/drafts', '.drafts-view');
    await (await browser.$('[data-drafts-action="open-trash"]')).click();
    const purgeItem = await browser.$(`[data-trash-article-id="${articleId}"]`);
    await purgeItem.waitForDisplayed({ timeout: 10_000 });
    await (await purgeItem.$('[data-trash-action="purge"]')).click();
    let purgeDialog = await browser.$('.trash-confirm[role="alertdialog"]');
    await purgeDialog.waitForDisplayed({ timeout: 5_000 });
    expect(await purgeDialog.getText(), 'permanent deletion requires a distinct destructive confirmation')
      .to.include('永久删除').and.include('正文和版本历史');
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('data-trash-action')),
      'the nested destructive dialog focuses its safe cancel action',
    ).to.equal('cancel-purge');
    await browser.keys(['Shift', 'Tab']);
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('data-trash-action')),
      'Shift+Tab wraps to the final nested-dialog action',
    ).to.equal('confirm-purge');
    await browser.keys('Tab');
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('data-trash-action')),
      'Tab wraps back to the first nested-dialog action',
    ).to.equal('cancel-purge');
    await browser.keys('Escape');
    await purgeDialog.waitForExist({ reverse: true, timeout: 5_000 });
    expect(
      await browser.execute(() => document.activeElement?.getAttribute('data-trash-action')),
      'cancelling permanent delete restores focus to the invoking purge button',
    ).to.equal('purge');
    await (await purgeItem.$('[data-trash-action="purge"]')).click();
    purgeDialog = await browser.$('.trash-confirm[role="alertdialog"]');
    await purgeDialog.waitForDisplayed({ timeout: 5_000 });
    await (await purgeDialog.$('[data-trash-action="confirm-purge"]')).click();

    await browser.waitUntil(
      async () => {
        const state = await readLifecycle();
        return state.liveArticle === null
          && state.trashArticle === null
          && state.persistedArticle === null
          && state.persistedContentCount === 0
          && state.audits.some((entry) => (
            entry.action === 'document.delete'
            && entry.severity === 'critical'
            && entry.source === 'useTrashStore.purge'
            && entry.payload?.permanent === true
          ));
      },
      { timeout: 15_000, interval: 150, timeoutMsg: 'visible permanent delete did not purge article, content, and audit it' },
    );
    createdArticleIds.delete(articleId);
    expect(await purgeItem.isExisting(), 'purged draft leaves the visible trash list').to.equal(false);
  });

  it('uploads, deduplicates, searches, reloads, shares, and deletes a real SVG asset through the Workstation UI', async function () {
    this.timeout(240_000);
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const assetName = `inkforge-asset-${runId}.svg`;
    const attachmentName = `inkforge-asset-${runId}.txt`;
    const invalidName = `inkforge-asset-${runId}.exe`;
    const assetTag = `asset-${runId}`;
    const assetPath = path.join(os.tmpdir(), assetName);
    const attachmentPath = path.join(os.tmpdir(), attachmentName);
    const invalidPath = path.join(os.tmpdir(), invalidName);
    const svgSource = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96">',
      '  <rect width="160" height="96" rx="12" fill="#f6efe2"/>',
      '  <path d="M24 62 52 30l24 24 18-18 42 42H24Z" fill="#c9473a"/>',
      '  <circle cx="118" cy="27" r="9" fill="#1e2a32"/>',
      '</svg>',
    ].join('\n');
    let articleId = null;
    let secondArticleId = null;

    fs.writeFileSync(assetPath, svgSource, 'utf8');
    fs.writeFileSync(attachmentPath, 'InkForge attachment insertion acceptance fixture.', 'utf8');
    fs.writeFileSync(invalidPath, Buffer.from('MZ InkForge unsupported MIME acceptance fixture.', 'utf8'));

    const openAssetSurface = async () => {
      const inspector = await browser.$('.panel-inspector');
      await inspector.waitForExist({ timeout: 10_000 });
      let defaultPreset = null;
      for (const preset of await browser.$$('.layout-preset-btn')) {
        if ((await preset.getText()).trim() === '默认') {
          defaultPreset = preset;
          break;
        }
      }
      if (defaultPreset) {
        await defaultPreset.scrollIntoView({ block: 'center', inline: 'nearest' });
        await defaultPreset.waitForClickable({ timeout: 5_000 });
        await defaultPreset.click();
      }
      const collapsedBar = await browser.$('.panel-inspector.collapsed .inspector-collapsed-bar');
      if (await collapsedBar.isExisting()) {
        await collapsedBar.waitForClickable({ timeout: 5_000 });
        await collapsedBar.click();
      }
      const inspectorPin = await browser.$('.inspector-pin-btn');
      await inspectorPin.waitForDisplayed({ timeout: 5_000 });
      if ((await inspectorPin.getAttribute('aria-pressed')) !== 'true') {
        await browser.execute((element) => element.focus(), inspectorPin);
        await browser.keys('Enter');
        await browser.waitUntil(
          async () => (await inspectorPin.getAttribute('aria-pressed')) === 'true',
          { timeout: 5_000, interval: 100, timeoutMsg: 'visible inspector pin did not keep the asset surface mounted' },
        );
      }
      const uploader = await browser.$('.inspector-asset-wrapper .asset-uploader');
      await uploader.waitForDisplayed({ timeout: 10_000 });
      await uploader.scrollIntoView({ block: 'center', inline: 'nearest' });
      return uploader;
    };
    const uploadThroughNativeInput = async (filePath, bypassAccept = false) => {
      const input = await browser.$('.inspector-asset-wrapper input[type="file"]');
      const originalAccept = await input.getAttribute('accept');
      await browser.execute((element) => {
        element.dataset.inkforgeOriginalStyle = element.getAttribute('style') ?? '';
        Object.assign(element.style, {
          display: 'block',
          position: 'fixed',
          inset: '0 auto auto 0',
          width: '2px',
          height: '2px',
          opacity: '0.01',
          zIndex: '2147483647',
        });
      }, input);
      if (bypassAccept) {
        await browser.execute((element) => element.removeAttribute('accept'), input);
      }
      try {
        await input.setValue(filePath);
      } finally {
        await browser.execute((element, accept) => {
          const originalStyle = element.dataset.inkforgeOriginalStyle ?? '';
          delete element.dataset.inkforgeOriginalStyle;
          if (originalStyle) element.setAttribute('style', originalStyle);
          else element.removeAttribute('style');
          if (accept === null) element.removeAttribute('accept');
          else element.setAttribute('accept', accept);
        }, input, originalAccept);
      }
    };
    const waitForDecodedAssetCard = async () => {
      const card = await browser.$(`[aria-label="选择素材 ${assetName}"]`);
      await card.waitForDisplayed({ timeout: 10_000 });
      await card.scrollIntoView({ block: 'center', inline: 'nearest' });
      await browser.waitUntil(
        async () => browser.execute((element) => {
          const image = element.querySelector('img');
          return Boolean(image?.complete && image.naturalWidth === 160 && image.naturalHeight === 96);
        }, card),
        { timeout: 10_000, interval: 100, timeoutMsg: 'visible SVG asset card did not decode at 160 x 96' },
      );
      return card;
    };

    try {
      articleId = await createBlankDraftThroughHub();
      const uploader = await openAssetSurface();
      expect(await uploader.getAttribute('role'), 'the upload surface is keyboard reachable').to.equal('button');
      expect(await uploader.getAttribute('aria-label'), 'the upload surface has an accessible name').to.equal('上传素材文件');

      await uploadThroughNativeInput(assetPath);
      let uploaded = null;
      await browser.waitUntil(
        async () => {
          uploaded = await readAssetPersistence(articleId, assetName);
          return uploaded.live.length === 1
            && uploaded.persisted.length === 1
            && uploaded.cards.length === 1
            && uploaded.persisted[0].blobSize > 0;
        },
        { timeout: 20_000, interval: 200, timeoutMsg: 'real SVG upload did not reach Pinia, IndexedDB, and the visible card' },
      );
      await browser.waitUntil(
        async () => {
          const uploaderClass = await (await browser.$('.inspector-asset-wrapper .asset-uploader')).getAttribute('class');
          return !uploaderClass.split(/\s+/u).includes('uploading');
        },
        { timeout: 10_000, interval: 100, timeoutMsg: 'initial SVG upload did not finish its visible upload cycle' },
      );
      await waitForDecodedAssetCard();
      uploaded = await readAssetPersistence(articleId, assetName);
      expect(uploaded.storeError, 'successful upload leaves no hidden store error').to.equal(null);
      expect(uploaded.live[0].id, 'the live and persisted asset use the same content id')
        .to.equal(uploaded.persisted[0].id);
      expect(uploaded.persisted[0], 'the real SVG Blob keeps its production metadata').to.include({
        articleId,
        name: assetName,
        originalName: assetName,
        mimeType: 'image/svg+xml',
        blobType: 'image/svg+xml',
        contentHashLength: 64,
        lifecycle: 'active',
        storageBackend: 'indexeddb',
      });
      expect(uploaded.persisted[0].blobSize, 'stored Blob size matches the real fixture bytes')
        .to.equal(Buffer.byteLength(svgSource));
      expect(uploaded.refs, 'the upload creates one durable article reference').to.deep.equal([{
        assetId: uploaded.persisted[0].id,
        referrerKind: 'article',
        referrerId: articleId,
      }]);
      expect(uploaded.cards[0].thumbnailSrc.startsWith('blob:'), 'the visible preview uses a real Object URL').to.equal(true);
      expect(uploaded.cards[0], 'the visible SVG decodes at its real intrinsic dimensions').to.include({
        thumbnailComplete: true,
        thumbnailNaturalWidth: 160,
        thumbnailNaturalHeight: 96,
      });
      const cardThumbnailUrl = uploaded.cards[0].thumbnailSrc;

      let assetCard = await browser.$(`[aria-label="选择素材 ${assetName}"]`);
      await assetCard.waitForDisplayed({ timeout: 5_000 });
      expect(await assetCard.getTagName(), 'asset cards use native button semantics').to.equal('button');
      expect(await assetCard.getAttribute('type'), 'asset cards never submit a surrounding form').to.equal('button');
      await assetCard.scrollIntoView({ block: 'center', inline: 'nearest' });
      await browser.execute((element) => element.focus(), assetCard);
      await browser.keys(' ');
      await browser.waitUntil(
        async () => (await assetCard.getAttribute('aria-pressed')) === 'true',
        { timeout: 5_000, interval: 100, timeoutMsg: 'keyboard asset selection did not update aria-pressed' },
      );

      await browser.execute((element) => element.focus(), assetCard);
      await browser.keys(['Shift', 'F10']);
      let contextMenu = await browser.$('.context-menu[role="menu"]');
      await contextMenu.waitForDisplayed({ timeout: 5_000 });
      const firstMenuAction = await browser.execute(() => document.activeElement?.textContent?.replace(/\s+/gu, ' ').trim() ?? '');
      expect(firstMenuAction, 'keyboard context menu moves focus to its first native action').to.include('插入到编辑器');
      await browser.keys('Enter');
      const insertedImage = await browser.$(`.ProseMirror img.asset-image[alt="${assetName}"]`);
      await browser.waitUntil(
        async () => browser.execute((image) => image.complete && image.naturalWidth === 160 && image.naturalHeight === 96, insertedImage),
        { timeout: 10_000, interval: 100, timeoutMsg: 'the real asset action did not insert and decode the SVG in the editor' },
      );
      const insertedImageSrc = await insertedImage.getAttribute('src');
      expect(insertedImageSrc.startsWith('blob:'), 'the editor resolves the stable asset id through a live Blob URL').to.equal(true);
      expect(insertedImageSrc, 'the editor and asset card own separate Blob URL lifecycles').to.not.equal(cardThumbnailUrl);
      const cachedAfterVisualInsert = await readAssetPersistence(articleId, assetName);
      expect(cachedAfterVisualInsert.cachedUrlCount, 'the editor-owned URL remains represented in the production cache')
        .to.be.greaterThan(0);

      const sourceShortcut = await pressConfiguredShortcut('setSourceMode', 'Ctrl+Alt+S');
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(document.querySelector('.source-mode-layout .cm-content'))),
        { timeout: 5_000, interval: 100, timeoutMsg: `${sourceShortcut} did not open Source mode for asset insertion` },
      );
      await openAssetSurface();
      assetCard = await waitForDecodedAssetCard();
      await browser.execute((element) => element.focus(), assetCard);
      await browser.keys(['Shift', 'F10']);
      contextMenu = await browser.$('.context-menu[role="menu"]');
      await contextMenu.waitForDisplayed({ timeout: 5_000 });
      await browser.keys('Enter');
      const sourceImageMarkdown = `![${assetName}](inkforge-asset://${uploaded.persisted[0].id} "${assetName}")`;
      try {
        await browser.waitUntil(
          async () => browser.execute(
            (markdown) => (document.querySelector('.source-mode-layout .cm-content')?.textContent ?? '').includes(markdown),
            sourceImageMarkdown,
          ),
          { timeout: 5_000, interval: 100, timeoutMsg: 'source-mode asset insertion did not append the stable Markdown image' },
        );
      } catch (error) {
        const state = await browser.execute(() => ({
          sourceText: document.querySelector('.source-mode-layout .cm-content')?.textContent ?? '',
          sourceLayout: document.querySelector('.source-mode-layout')?.className ?? null,
          visibleMenu: document.querySelector('.context-menu[role="menu"]')?.textContent?.replace(/\s+/gu, ' ').trim() ?? null,
          toast: document.querySelector('.transient-toast')?.textContent?.replace(/\s+/gu, ' ').trim() ?? null,
          activeElement: document.activeElement?.outerHTML?.slice(0, 500) ?? '',
        }));
        throw new Error(`${error.message}; state=${JSON.stringify(state)}`, { cause: error });
      }
      await pressConfiguredShortcut('setTyporaMode', 'Ctrl+Alt+T');
      await browser.waitUntil(
        async () => browser.execute(
          (name) => document.querySelectorAll(`.editor-mode-shell.mode-typora .ProseMirror img.asset-image[alt="${name}"]`).length === 2,
          assetName,
        ),
        { timeout: 10_000, interval: 100, timeoutMsg: 'Source-mode asset insertion did not round-trip into two visual image nodes' },
      );

      await (await browser.$('.panel-inspector .collapse-trigger')).click();
      await browser.waitUntil(
        async () => browser.execute(() => !document.querySelector('.inspector-asset-wrapper .asset-uploader')),
        { timeout: 5_000, interval: 100, timeoutMsg: 'the inspector did not unmount the asset manager after visible collapse' },
      );
      const cardPreviewAfterUnmount = await browser.execute(async (url) => {
        try {
          const response = await window.fetch(url);
          return response.ok;
        } catch {
          return false;
        }
      }, cardThumbnailUrl);
      expect(cardPreviewAfterUnmount, 'unmounting the asset manager revokes its card-owned Blob URL').to.equal(false);
      expect(
        await browser.execute((image) => image.isConnected && image.complete && image.naturalWidth === 160 && image.naturalHeight === 96, insertedImage),
        'collapsing the inspector does not revoke the editor-owned asset URL',
      ).to.equal(true);

      await openAssetSurface();
      assetCard = await browser.$(`[aria-label="选择素材 ${assetName}"]`);
      await assetCard.waitForDisplayed({ timeout: 5_000 });
      await browser.execute((element) => element.focus(), assetCard);
      await browser.keys(['Shift', 'F10']);
      contextMenu = await browser.$('.context-menu[role="menu"]');
      await contextMenu.waitForDisplayed({ timeout: 5_000 });

      await browser.keys('Escape');
      await browser.waitUntil(
        async () => browser.execute((element) => document.activeElement === element, assetCard),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Escape did not restore focus to the asset-card menu opener' },
      );

      await browser.keys(['Shift', 'F10']);
      contextMenu = await browser.$('.context-menu[role="menu"]');
      await contextMenu.waitForDisplayed({ timeout: 5_000 });
      await browser.keys('ArrowDown');
      await browser.keys('ArrowDown');
      const editTagsAction = await browser.execute(() => document.activeElement?.textContent?.replace(/\s+/gu, ' ').trim() ?? '');
      expect(editTagsAction, 'menu ArrowDown reaches the real tag action').to.include('编辑标签');
      await browser.keys('Enter');
      const tagDialog = await browser.$('.tags-edit-overlay[role="dialog"]');
      try {
        await tagDialog.waitForDisplayed({ timeout: 5_000 });
      } catch (error) {
        const state = await browser.execute(() => ({
          contextMenuVisible: Boolean(document.querySelector('.context-menu')),
          tagDialogExists: Boolean(document.querySelector('.tags-edit-overlay')),
          visibleMenus: Array.from(document.querySelectorAll('[role="menu"]'))
            .map((menu) => menu.textContent?.replace(/\s+/gu, ' ').trim() ?? ''),
          activeElement: document.activeElement?.outerHTML?.slice(0, 500) ?? '',
        }));
        throw new Error(`${error.message}; state=${JSON.stringify(state)}`, { cause: error });
      }
      const tagInput = await tagDialog.$('.tags-input');
      expect(
        await browser.execute((element) => document.activeElement === element, tagInput),
        'the tag dialog receives initial keyboard focus',
      ).to.equal(true);
      await browser.keys(['Shift', 'Tab']);
      expect(
        await browser.execute(() => document.activeElement?.classList.contains('tags-confirm-btn') ?? false),
        'Shift+Tab wraps from the first tag field to the last dialog action',
      ).to.equal(true);
      await browser.keys('Tab');
      expect(
        await browser.execute((element) => document.activeElement === element, tagInput),
        'Tab wraps from the last tag action back to the first field',
      ).to.equal(true);
      await tagInput.setValue(`svg, ${assetTag}`);
      expect(await tagInput.getValue(), 'the visible tag input receives the exact operator value')
        .to.equal(`svg, ${assetTag}`);
      await (await tagDialog.$('.tags-confirm-btn')).click();
      try {
        await browser.waitUntil(
          async () => {
            const current = await readAssetPersistence(articleId, assetName);
            return current.live[0]?.tags.includes(assetTag)
              && current.persisted[0]?.tags.includes(assetTag);
          },
          { timeout: 10_000, interval: 100, timeoutMsg: 'visible asset tag edit did not persist' },
        );
      } catch (error) {
        const state = await readAssetPersistence(articleId, assetName);
        throw new Error(`${error.message}; state=${JSON.stringify(state)}`, { cause: error });
      }

      assetCard = await browser.$(`[aria-label="选择素材 ${assetName}"]`);
      await browser.execute((element) => element.focus(), assetCard);
      await browser.keys(' ');
      await browser.waitUntil(
        async () => (await assetCard.getAttribute('aria-pressed')) === 'true',
        { timeout: 5_000, interval: 100, timeoutMsg: 'asset selection did not recover after inspector remount' },
      );
      const searchInput = await browser.$('.inspector-asset-wrapper .search-input');
      expect(await searchInput.getAttribute('aria-label'), 'asset search has an accessible name').to.equal('搜索素材');
      await searchInput.setValue(assetTag);
      await browser.keys('Delete');
      expect(await browser.$$('.confirm-overlay[role="dialog"]'), 'Delete inside asset search never opens asset deletion').to.have.length(0);
      expect(await browser.$$(`[aria-label="选择素材 ${assetName}"]`), 'tag search retains the matching real asset')
        .to.have.length(1);
      await searchInput.setValue(`missing-${runId}`);
      await browser.waitUntil(
        async () => (await readAssetPersistence(articleId, assetName)).emptyText.includes('未找到匹配素材'),
        { timeout: 5_000, interval: 100, timeoutMsg: 'asset search did not expose the honest no-result state' },
      );
      const clearSearchButton = await browser.$('.inspector-asset-wrapper .search-clear');
      expect(await clearSearchButton.getAttribute('aria-label'), 'asset search exposes a named clear action')
        .to.equal('清除素材搜索');
      await clearSearchButton.click();
      await browser.waitUntil(
        async () => (await searchInput.getValue()) === '',
        { timeout: 5_000, interval: 100, timeoutMsg: 'asset search did not clear through the visible action' },
      );
      await browser.waitUntil(
        async () => (await readAssetPersistence(articleId, assetName)).cards.length === 1,
        { timeout: 5_000, interval: 100, timeoutMsg: 'clearing the asset search did not restore the real asset card' },
      );

      const listToggle = await browser.$('.inspector-asset-wrapper [title="列表视图"]');
      await listToggle.click();
      assetCard = await browser.$(`[aria-label="选择素材 ${assetName}"]`);
      await assetCard.waitForDisplayed({ timeout: 5_000 });
      expect(await assetCard.getAttribute('class'), 'asset list view renders the real asset')
        .to.include('asset-card-list');

      await uploadThroughNativeInput(assetPath);
      await browser.waitUntil(
        async () => (await (await browser.$('.inspector-asset-wrapper .asset-uploader')).getAttribute('class'))
          .split(/\s+/u).includes('uploading'),
        { timeout: 5_000, interval: 50, timeoutMsg: 'duplicate SVG upload never entered the visible uploading state' },
      );
      await browser.waitUntil(
        async () => {
          const current = await readAssetPersistence(articleId, assetName);
          const uploaderClass = await (await browser.$('.inspector-asset-wrapper .asset-uploader')).getAttribute('class');
          return current.live.length === 1
            && current.persisted.length === 1
            && current.cards.length === 1
            && !uploaderClass.split(/\s+/u).includes('uploading');
        },
        { timeout: 15_000, interval: 100, timeoutMsg: 'duplicate SVG upload did not finish as one content-addressed asset' },
      );
      const deduplicated = await readAssetPersistence(articleId, assetName);
      expect(deduplicated.persisted[0].id, 'duplicate upload keeps the original content id')
        .to.equal(uploaded.persisted[0].id);

      await uploadThroughNativeInput(invalidPath, true);
      try {
        await browser.waitUntil(
          async () => (await readAssetPersistence(articleId, assetName)).errorText.length > 0,
          { timeout: 10_000, interval: 100, timeoutMsg: 'invalid MIME upload did not surface a visible error' },
        );
      } catch (error) {
        const state = await readAssetPersistence(articleId, assetName);
        throw new Error(`${error.message}; state=${JSON.stringify(state)}`, { cause: error });
      }
      const rejected = await readAssetPersistence(articleId, assetName);
      expect(rejected.errorText, 'invalid MIME rejection remains visible').to.include('Unsupported asset MIME type');
      expect(rejected.live, 'invalid MIME creates no extra live asset').to.have.length(1);
      expect(rejected.persisted, 'invalid MIME creates no extra persisted asset').to.have.length(1);

      await uploadThroughNativeInput(attachmentPath, true);
      await browser.waitUntil(
        async () => {
          const attachment = await readAssetPersistence(articleId, attachmentName);
          return attachment.live.length === 1
            && attachment.persisted.length === 1
            && attachment.cards.length === 1;
        },
        { timeout: 15_000, interval: 100, timeoutMsg: 'real text attachment did not reach the production asset store and UI' },
      );
      const attachmentCard = await browser.$(`[aria-label="选择素材 ${attachmentName}"]`);
      await attachmentCard.waitForDisplayed({ timeout: 5_000 });
      await attachmentCard.doubleClick();
      const attachmentToast = await browser.$('.mode-switch-toast[role="status"]');
      await attachmentToast.waitForDisplayed({ timeout: 5_000 });
      expect(await attachmentToast.getText(), 'non-image insertion fails with visible product feedback')
        .to.include('仅支持将图片或 SVG 素材插入编辑器');
      expect(
        await browser.execute((name) => document.querySelectorAll(`.ProseMirror img[alt="${name}"]`).length, attachmentName),
        'a supported attachment is never misrepresented as an editor image node',
      ).to.equal(0);

      await waitForCurrentDraftReady(articleId);
      await browser.refresh();
      await waitForCurrentDraftReady(articleId);
      await browser.waitUntil(
        async () => browser.execute(
          (name) => {
            const images = Array.from(document.querySelectorAll(`.ProseMirror img.asset-image[alt="${name}"]`));
            return images.length === 2
              && images.every((image) => image.complete && image.naturalWidth === 160 && image.naturalHeight === 96);
          },
          assetName,
        ),
        { timeout: 10_000, interval: 100, timeoutMsg: 'visual and Source-mode SVG insertions did not both survive production reload' },
      );
      await openAssetSurface();
      await browser.waitUntil(
        async () => {
          const current = await readAssetPersistence(articleId, assetName);
          return current.live.length === 1
            && current.persisted.length === 1
            && current.cards.length === 1
            && current.persisted[0].tags.includes(assetTag);
        },
        { timeout: 15_000, interval: 200, timeoutMsg: 'asset Blob and tags did not survive the production reload path' },
      );
      await waitForDecodedAssetCard();

      secondArticleId = await createBlankDraftThroughHub();
      await openAssetSurface();
      await uploadThroughNativeInput(assetPath);
      let sharedInSecondArticle = null;
      await browser.waitUntil(
        async () => {
          sharedInSecondArticle = await readAssetPersistence(secondArticleId, assetName);
          const uploaderClass = await (await browser.$('.inspector-asset-wrapper .asset-uploader')).getAttribute('class');
          return sharedInSecondArticle.live.length === 1
            && sharedInSecondArticle.persisted.length === 1
            && sharedInSecondArticle.globalPersisted.length === 1
            && sharedInSecondArticle.refs.length === 1
            && sharedInSecondArticle.allRefs.length === 2
            && sharedInSecondArticle.cards.length === 1
            && !uploaderClass.split(/\s+/u).includes('uploading');
        },
        { timeout: 20_000, interval: 200, timeoutMsg: 'same-byte SVG upload did not create one shared asset with two durable article references' },
      );
      await waitForDecodedAssetCard();
      sharedInSecondArticle = await readAssetPersistence(secondArticleId, assetName);
      expect(sharedInSecondArticle.persisted[0].id, 'cross-article deduplication reuses the original content id')
        .to.equal(uploaded.persisted[0].id);
      expect(
        sharedInSecondArticle.allRefs.map((ref) => ref.referrerId).sort(),
        'one content-addressed asset keeps both article references',
      ).to.deep.equal([articleId, secondArticleId].sort());

      await browser.refresh();
      await waitForCurrentDraftReady(secondArticleId, true);
      await openAssetSurface();
      await browser.waitUntil(
        async () => {
          const current = await readAssetPersistence(secondArticleId, assetName);
          return current.live.length === 1
            && current.persisted.length === 1
            && current.cards.length === 1;
        },
        { timeout: 15_000, interval: 200, timeoutMsg: 'shared asset did not reload through the second article reference' },
      );
      await waitForDecodedAssetCard();

      assetCard = await browser.$(`[aria-label="选择素材 ${assetName}"]`);
      await assetCard.scrollIntoView({ block: 'center', inline: 'nearest' });
      await browser.execute((element) => element.focus(), assetCard);
      await browser.keys(' ');
      await browser.waitUntil(
        async () => (await assetCard.getAttribute('aria-pressed')) === 'true',
        { timeout: 5_000, interval: 100, timeoutMsg: 'second-article keyboard selection did not update aria-pressed' },
      );
      await browser.keys('Delete');
      let deleteDialog = await browser.$('.confirm-overlay[role="dialog"]');
      await deleteDialog.waitForDisplayed({ timeout: 5_000 });
      const deleteCancel = await deleteDialog.$('.cancel-btn');
      expect(
        await browser.execute((element) => document.activeElement === element, deleteCancel),
        'the delete dialog initially focuses its safe cancel action',
      ).to.equal(true);
      await browser.keys(['Shift', 'Tab']);
      expect(
        await browser.execute(() => document.activeElement?.classList.contains('delete-confirm-btn') ?? false),
        'Shift+Tab wraps from cancel to the final destructive action',
      ).to.equal(true);
      await browser.keys('Enter');
      await browser.waitUntil(
        async () => {
          const current = await readAssetPersistence(secondArticleId, assetName);
          return current.live.length === 0
            && current.persisted.length === 0
            && current.refs.length === 0
            && current.cards.length === 0
            && current.globalPersisted.length === 1
            && current.allRefs.length === 1
            && current.allRefs[0].referrerId === articleId;
        },
        { timeout: 15_000, interval: 200, timeoutMsg: 'second-article deletion did not remove only its own durable reference' },
      );

      await openRoute(`/workstation?id=${encodeURIComponent(articleId)}`, '.ProseMirror');
      await waitForCurrentDraftReady(articleId);
      await openAssetSurface();
      let retainedByFirstArticle = null;
      await browser.waitUntil(
        async () => {
          retainedByFirstArticle = await readAssetPersistence(articleId, assetName);
          return retainedByFirstArticle.live.length === 1
            && retainedByFirstArticle.persisted.length === 1
            && retainedByFirstArticle.globalPersisted.length === 1
            && retainedByFirstArticle.refs.length === 1
            && retainedByFirstArticle.allRefs.length === 1
            && retainedByFirstArticle.cards.length === 1;
        },
        { timeout: 15_000, interval: 200, timeoutMsg: 'deleting the second reference incorrectly removed the first article asset' },
      );
      await waitForDecodedAssetCard();
      retainedByFirstArticle = await readAssetPersistence(articleId, assetName);
      expect(retainedByFirstArticle.persisted[0].id, 'the surviving article keeps the original shared asset')
        .to.equal(uploaded.persisted[0].id);

      const reloadedInsertedImage = await browser.$(`.ProseMirror img.asset-image[alt="${assetName}"]`);
      await browser.waitUntil(
        async () => browser.execute(
          (image) => image.complete && image.naturalWidth === 160 && image.naturalHeight === 96,
          reloadedInsertedImage,
        ),
        { timeout: 10_000, interval: 100, timeoutMsg: 'inserted SVG did not survive article reload through its stable asset id' },
      );
      const blobUrlsBeforeDelete = [
        retainedByFirstArticle.cards[0].thumbnailSrc,
        await reloadedInsertedImage.getAttribute('src'),
      ].filter((url, index, urls) => url.startsWith('blob:') && urls.indexOf(url) === index);
      expect(blobUrlsBeforeDelete, 'the retained card and editor image resolve through live Blob URLs')
        .to.have.length.greaterThan(0);
      const cachedUrlCountBeforeDelete = retainedByFirstArticle.cachedUrlCount;

      assetCard = await browser.$(`[aria-label="选择素材 ${assetName}"]`);
      await assetCard.scrollIntoView({ block: 'center', inline: 'nearest' });
      await browser.execute((element) => element.focus(), assetCard);
      await browser.keys(' ');
      await browser.waitUntil(
        async () => (await assetCard.getAttribute('aria-pressed')) === 'true',
        { timeout: 5_000, interval: 100, timeoutMsg: 'first-article keyboard selection did not update aria-pressed' },
      );
      await browser.keys('Delete');
      deleteDialog = await browser.$('.confirm-overlay[role="dialog"]');
      await deleteDialog.waitForDisplayed({ timeout: 5_000 });
      expect(
        await browser.execute(() => document.activeElement?.classList.contains('cancel-btn') ?? false),
        'the final delete dialog also starts on the safe action',
      ).to.equal(true);
      await browser.keys(['Shift', 'Tab']);
      await browser.keys('Enter');

      let deletedEverywhere = null;
      await browser.waitUntil(
        async () => {
          deletedEverywhere = await readAssetPersistence(articleId, assetName);
          return deletedEverywhere.live.length === 0
            && deletedEverywhere.persisted.length === 0
            && deletedEverywhere.globalPersisted.length === 0
            && deletedEverywhere.refs.length === 0
            && deletedEverywhere.allRefs.length === 0
            && deletedEverywhere.cards.length === 0;
        },
        { timeout: 15_000, interval: 200, timeoutMsg: 'last-reference deletion did not clear Pinia, IndexedDB, refs, and UI' },
      );
      expect(deletedEverywhere.cachedUrlCount, 'last-reference deletion shrinks the production Object URL cache')
        .to.be.lessThan(cachedUrlCountBeforeDelete);
      const revokedUrlStates = await browser.execute(async (urls) => Promise.all(urls.map(async (url) => {
        try {
          const response = await window.fetch(url);
          return { url, reachable: response.ok };
        } catch {
          return { url, reachable: false };
        }
      })), blobUrlsBeforeDelete);
      expect(revokedUrlStates.every((state) => !state.reachable), 'last-reference deletion revokes every captured asset Blob URL')
        .to.equal(true);
    } finally {
      if (secondArticleId) {
        try {
          await cleanupCreatedAsset(secondArticleId, assetName);
        } catch {
          // The outer isolated WebView2 data root remains the final fail-closed cleanup boundary.
        }
      }
      if (articleId) {
        try {
          await cleanupCreatedAsset(articleId, assetName);
        } catch {
          // The outer isolated WebView2 data root remains the final fail-closed cleanup boundary.
        }
        try {
          await cleanupCreatedAsset(articleId, attachmentName);
        } catch {
          // The outer isolated WebView2 data root remains the final fail-closed cleanup boundary.
        }
      }
      fs.rmSync(assetPath, { force: true });
      fs.rmSync(attachmentPath, { force: true });
      fs.rmSync(invalidPath, { force: true });
    }
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
      await focusControlForKeyboardInput(searchInput, 'the shortcut search input');
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
      expect(await searchInput.getValue(), 'a shortcut chord does not write text into the focused search input')
        .to.equal('');

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
      await focusControlForKeyboardInput(persistedSearchInput, 'the reloaded shortcut search input');
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

  it('routes, persists, samples, previews, rolls back, and resets Settings by their real owning tabs', async function () {
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
        .to.deep.include({ id: 'advanced.featureFlags', label: 'Feature Flags' });
      const featureResult = await browser.$('[data-settings-search-result="advanced.featureFlags"]');
      await featureResult.waitForDisplayed({ timeout: 5_000 });
      await featureResult.click();
      await browser.waitUntil(
        async () => browser.execute(() => new window.URLSearchParams(window.location.search).get('tab') === 'advanced'),
        { timeout: 5_000, interval: 100, timeoutMsg: 'Feature Flags search result did not route to the real Advanced tab' },
      );
      const featureSection = await browser.$('[data-settings-entry="advanced.featureFlags"]');
      await featureSection.waitForDisplayed({ timeout: 5_000 });

      await settingsSearch.setValue('代理设置');
      const proxyResult = await browser.$('[data-settings-search-result="ai.proxy"]');
      await proxyResult.waitForDisplayed({ timeout: 5_000 });
      await proxyResult.click();
      const proxySection = await browser.$('[data-settings-entry="ai.proxy"]');
      await proxySection.waitForDisplayed({ timeout: 5_000 });
      expect(await browser.execute(() => new window.URLSearchParams(window.location.search).get('tab')),
        'proxy registry navigation stays on the tab that owns the real controls')
        .to.equal('ai');

      await openRoute('/settings?tab=advanced', '[data-settings-tab="advanced"]');
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
      expect(createdSnapshot.reason, 'the visible action creates the expected real rollback point').to.equal('manual:advanced');
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

      await openRoute('/settings?tab=advanced', '[data-settings-tab="advanced"]');
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

      await openRoute('/settings?tab=ai', '[data-settings-tab="ai"]');
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
      await (await browser.$('[data-settings-entry="ai.proxy"]')).waitForDisplayed({ timeout: 10_000 });
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
      expect(aiReset.store.featureFlags, 'AI reset preserves Advanced-owned feature flags').to.deep.equal(targetFlags);
      expect(aiReset.store.proxy, 'AI reset restores default proxy fields').to.deep.equal(defaultProxy);
      expect(aiReset.persisted.featureFlags, 'AI reset persists the preserved Advanced-owned feature flags').to.deep.equal(targetFlags);
      expect(aiReset.persisted.proxy, 'AI reset persists default proxy fields').to.deep.equal(defaultProxy);
      expect(aiReset.store.logLevel, 'AI reset does not change the Advanced-owned log level').to.equal(targetLogLevel);
      expect(aiReset.store.snapshots[0]?.reason, 'AI reset creates a rollback point for its real ownership boundary')
        .to.equal('reset-tab:ai');

      await openRoute('/settings?tab=advanced', '[data-settings-tab="advanced"]');
      await browser.waitUntil(
        async () => (await readAboutSettingsEvidence()).performance.collecting === true,
        { timeout: 5_000, interval: 100, timeoutMsg: 'AI reset incorrectly stopped the Advanced-owned performance collector' },
      );
      const preservedPerformance = await readAboutSettingsEvidence();
      expect(preservedPerformance.ui.performanceSectionVisible, 'Advanced performance remains visibly addressable')
        .to.equal(true);
      expect(preservedPerformance.ui.performanceEnabled, 'AI reset preserves the Advanced-owned performance flag')
        .to.equal('true');
      expect(preservedPerformance.ui.performanceLedgerVisible, 'enabled performance retains the live ledger')
        .to.equal(true);
      expect(preservedPerformance.performance.collecting, 'enabled performance keeps the production collector running')
        .to.equal(true);

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
      expect(customCssSentinel.persisted.customCss, 'visible CustomCSS sentinel is persisted before the updater reset')
        .to.deep.equal(customCssSentinel.store.customCss);

      const developerModeInput = await browser.$('[data-settings-entry="advanced.devPanel"] input[type="checkbox"]');
      if (!await developerModeInput.isSelected()) {
        await (await browser.$('[data-settings-entry="advanced.devPanel"] label.sv-toggle-row')).click();
      }
      await openRoute('/settings?tab=about', '[data-settings-tab="about"]');
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
        { timeout: 5_000, interval: 100, timeoutMsg: 'visible Advanced and About controls did not establish reset sentinels' },
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
      expect(aboutReset.persisted.logLevel, 'About reset preserves the Advanced-owned runtime log level')
        .to.equal(targetLogLevel);
      expect(aboutReset.store.logLevel, 'About reset preserves the selected non-default log level')
        .to.equal(targetLogLevel);
      expect(aboutReset.ui.runtimeLogLevel, 'About reset leaves the runtime logger at the selected level')
        .to.equal(targetLogLevel);
      expect(aboutReset.store.developerMode, 'About reset preserves the Advanced-owned Developer Mode').to.equal(true);
      expect(aboutReset.persisted.developerMode, 'About reset persists the preserved Developer Mode').to.equal(true);
      expect(aboutReset.ui.developerModeChecked, 'About reset leaves the Developer Mode control selected').to.equal(true);
      expect(aboutReset.store.updater, 'About reset restores the complete updater defaults').to.deep.equal(defaultUpdater);
      expect(aboutReset.persisted.updater, 'About reset persists the complete updater defaults').to.deep.equal(defaultUpdater);
      expect(aboutReset.ui.updaterAutoCheckEnabled, 'About reset updates the visible updater control').to.equal(true);
      expect(aboutReset.store.customCss, 'About reset preserves the complete CustomCSS state')
        .to.deep.equal(customCssSentinel.store.customCss);
      expect(aboutReset.persisted.customCss, 'About reset persists the preserved CustomCSS state')
        .to.deep.equal(customCssSentinel.store.customCss);
      expect(aboutReset.store.featureFlags, 'About reset preserves Advanced-owned feature flags').to.deep.equal(targetFlags);
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

      await openRoute('/settings?tab=advanced', '[data-settings-tab="advanced"]');
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
      const aboutSection = await browser.$('[data-settings-entry="advanced.migration"]');
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
      await (await browser.$('[data-settings-entry="advanced.migration"]')).waitForDisplayed({ timeout: 10_000 });
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

    await (await browser.$('.ink-titlebar')).click();
    await openCategoryContextMenu(categoryId);
    await (await browser.$('[data-category-action="rename"]')).click();
    const renameInput = await browser.$('[data-category-rename-input]');
    await renameInput.waitForDisplayed({ timeout: 5_000 });
    await renameInput.scrollIntoView({ block: 'center', inline: 'nearest' });
    await renameInput.waitForClickable({ timeout: 5_000, interval: 100 });
    await renameInput.click();
    await browser.waitUntil(
      async () => browser.execute(() => document.activeElement?.matches('[data-category-rename-input]') === true),
      { timeout: 5_000, interval: 50, timeoutMsg: 'category rename input did not receive real keyboard focus' },
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
