/**
 * native-runtime.spec.cjs — verifies the 05-12 desktop/native boundary against
 * the real Tauri WebView2 shell. The spec intentionally avoids actions that
 * would open Explorer or an external browser/mail client. It proves runtime
 * detection, Settings UI reflection, native directory cancellation,
 * native snapshot commands, and fail-closed invalid/missing-path behavior.
 */
const { expect } = require('chai');
const { spawn } = require('child_process');

const TAURI_SIGNAL_VALUES = [
  'tauri-v1',
  'tauri-v1-invoke',
  'tauri-v1-ipc',
  'tauri-v1-metadata',
  'tauri-v1-post-message',
  'tauri-v2-internals',
];

function cancelNativeDirectoryDialog() {
  const script = `
    Add-Type @'
      using System;
      using System.Text;
      using System.Runtime.InteropServices;
      public static class InkForgeNativeDialog {
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
        public static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll")]
        public static extern bool IsWindow(IntPtr window);
      }
'@

    function Get-InkForgeVisibleWindows {
      $windows = [Collections.Generic.List[object]]::new()
      $callback = [InkForgeNativeDialog+EnumWindowsProc]{
        param([IntPtr]$window, [IntPtr]$parameter)
        if (-not [InkForgeNativeDialog]::IsWindowVisible($window)) {
          return $true
        }

        $titleBuffer = [Text.StringBuilder]::new(512)
        $classBuffer = [Text.StringBuilder]::new(256)
        [void][InkForgeNativeDialog]::GetWindowText($window, $titleBuffer, $titleBuffer.Capacity)
        [void][InkForgeNativeDialog]::GetClassName($window, $classBuffer, $classBuffer.Capacity)
        [uint32]$ownerProcessId = 0
        [void][InkForgeNativeDialog]::GetWindowThreadProcessId($window, [ref]$ownerProcessId)
        $processName = try { (Get-Process -Id $ownerProcessId -ErrorAction Stop).ProcessName } catch { '' }
        $windows.Add([pscustomobject]@{
          Handle = $window
          Title = $titleBuffer.ToString()
          ClassName = $classBuffer.ToString()
          ProcessName = $processName
        })
        return $true
      }
      [void][InkForgeNativeDialog]::EnumWindows($callback, [IntPtr]::Zero)
      return $windows
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(5)
    $title = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('6YCJ5oup5bel5L2c5Yy65paH5Lu25qC555uu5b2V'))
    do {
      $windows = Get-InkForgeVisibleWindows
      $candidate = $windows | Where-Object {
        $_.Title -eq $title -or ($_.ClassName -eq '#32770' -and $_.ProcessName -eq 'InkForge')
      } | Select-Object -First 1
      if ($candidate) {
        [void][InkForgeNativeDialog]::PostMessage($candidate.Handle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
        $closeDeadline = [DateTime]::UtcNow.AddSeconds(2)
        while ([InkForgeNativeDialog]::IsWindow($candidate.Handle) -and [DateTime]::UtcNow -lt $closeDeadline) {
          Start-Sleep -Milliseconds 50
        }
        if (-not [InkForgeNativeDialog]::IsWindow($candidate.Handle)) {
          exit 0
        }
        Write-Error 'Native directory dialog received WM_CLOSE but remained open.'
        exit 1
      }
      Start-Sleep -Milliseconds 100
    } while ([DateTime]::UtcNow -lt $deadline)
    $diagnostic = (Get-InkForgeVisibleWindows | Where-Object {
      $_.ProcessName -in @('InkForge', 'explorer') -or $_.ClassName -eq '#32770'
    } | ForEach-Object {
      "process=$($_.ProcessName); class=$($_.ClassName); titleLength=$($_.Title.Length); configuredTitle=$($_.Title -eq $title)"
    }) -join ' | '
    Write-Error "Native directory dialog was not found. Candidate windows: $diagnostic"
    exit 1
  `;

  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true },
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Native directory dialog cancellation failed (exit ${code}): ${stderr}`));
    });
  });
}

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

async function openSettingsSync() {
  await browser.execute(() => {
    const target = '/settings?tab=sync';
    if (location.pathname !== '/settings' || location.search !== '?tab=sync') {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  await browser.waitUntil(
    async () => browser.execute(() => {
      const section = document.querySelector('[data-settings-tab="sync"]');
      return Boolean(section && getComputedStyle(section).display !== 'none');
    }),
    {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: 'Settings Sync section did not render as the active tab',
    },
  );
}

async function openSettingsAudit() {
  await browser.execute(() => {
    const target = '/settings?tab=audit';
    if (location.pathname !== '/settings' || location.search !== '?tab=audit') {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  await browser.waitUntil(
    async () => browser.execute(() => {
      const section = document.querySelector('[data-settings-tab="audit"]');
      return Boolean(section && getComputedStyle(section).display !== 'none');
    }),
    {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: 'Settings Audit section did not render as the active tab',
    },
  );
}

async function openSettingsProfiles() {
  await browser.execute(() => {
    const target = '/settings?tab=profiles';
    if (location.pathname !== '/settings' || location.search !== '?tab=profiles') {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  await browser.waitUntil(
    async () => browser.execute(() => {
      const section = document.querySelector('[data-settings-tab="profiles"]');
      return Boolean(section && getComputedStyle(section).display !== 'none');
    }),
    {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: 'Settings Profiles section did not render as the active tab',
    },
  );
}

async function readProfilesUi() {
  return browser.execute(() => {
    const section = document.querySelector('[data-settings-tab="profiles"]');
    const rows = Array.from(section?.querySelectorAll('[data-profile-id]') ?? []).map((row) => ({
      id: row.getAttribute('data-profile-id'),
      text: row.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      switchDisabled: Boolean(row.querySelector('[data-profile-action="switch"]')?.disabled),
      deleteDisabled: Boolean(row.querySelector('[data-profile-action="soft-delete"]')?.disabled),
    }));
    const deletedRows = Array.from(section?.querySelectorAll('[data-profile-deleted-id]') ?? []).map((row) => ({
      id: row.getAttribute('data-profile-deleted-id'),
      text: row.textContent?.trim().replace(/\s+/g, ' ') ?? '',
    }));

    return {
      active: Boolean(section && getComputedStyle(section).display !== 'none'),
      activeProfileId: section?.querySelector('[data-profile-current-id]')?.textContent?.trim() ?? '',
      activeDbNamespace: section?.querySelector('[data-profile-current-db]')?.textContent?.trim() ?? '',
      storedActiveProfileId: window.localStorage.getItem('inkforge.activeProfileId'),
      rows,
      deletedRows,
      feedback: Array.from(section?.querySelectorAll('[data-profile-feedback]') ?? []).map((entry) => ({
        kind: entry.getAttribute('data-profile-feedback'),
        className: entry.className,
        text: entry.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      })),
      pickerDisabled: Boolean(section?.querySelector('[data-profile-file-root-picker]')?.disabled),
      pickerStatus: section?.querySelector('[data-profile-file-root-status]')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      createDisabled: Boolean(section?.querySelector('[data-profile-create]')?.disabled),
      visibleButtonsWithoutType: Array.from(section?.querySelectorAll('button') ?? [])
        .filter((entry) => entry.offsetParent !== null && entry.getAttribute('type') !== 'button')
        .map((entry) => entry.textContent?.trim().replace(/\s+/g, ' ') ?? entry.className),
    };
  });
}

async function readProfilePersistence(profileName) {
  return browser.execute(async (name) => {
    const openDatabase = (databaseName) => new Promise((resolve, reject) => {
      const request = window.indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Failed to open ${databaseName}`));
    });
    const requestValue = (request) => new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });

    const registry = await openDatabase('InkForgeDB');
    const profiles = await requestValue(registry.transaction('profiles', 'readonly').objectStore('profiles').getAll());
    registry.close();
    const matches = profiles.filter((profile) => profile.name === name);
    const profile = matches.find((entry) => entry.status === 'active') ?? matches[0] ?? null;
    const databaseNames = typeof window.indexedDB.databases === 'function'
      ? (await window.indexedDB.databases()).map((entry) => entry.name).filter(Boolean)
      : null;
    let metadata = null;
    if (profile && databaseNames?.includes(profile.dbNamespace)) {
      const profileDatabase = await openDatabase(profile.dbNamespace);
      metadata = await requestValue(
        profileDatabase.transaction('metadata', 'readonly').objectStore('metadata').get('profile-meta'),
      );
      profileDatabase.close();
    }

    return {
      activeMatchCount: matches.filter((entry) => entry.status === 'active').length,
      totalMatchCount: matches.length,
      profile,
      databaseNamesSupported: databaseNames !== null,
      namespaceExists: Boolean(profile && databaseNames?.includes(profile.dbNamespace)),
      metadata,
    };
  }, profileName);
}

async function clickProfileAction(profileId, action, deleted = false) {
  const rowSelector = deleted
    ? `[data-profile-deleted-id="${profileId}"]`
    : `[data-profile-id="${profileId}"]`;
  const button = await browser.$(`${rowSelector} [data-profile-action="${action}"]`);
  await button.waitForClickable({ timeout: 10_000, interval: 200 });
  await button.click();
}

async function readSyncUi() {
  return browser.execute(() => {
    function clone(value) {
      if (value === null || value === undefined) return value;
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return null;
      }
    }

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

    const section = document.querySelector('[data-settings-tab="sync"]');
    const manual = document.querySelector('[data-settings-entry="sync.manual"]');
    const button = manual?.querySelector('button');
    const syncStore = findPinia()?._s.get('sync');
    const cards = Array.from(section?.querySelectorAll('.sv-insight-card') ?? []).map((card) => ({
      label: card.querySelector('.sv-insight-card__label')?.textContent?.trim() ?? '',
      value: card.querySelector('.sv-insight-card__value')?.textContent?.trim() ?? '',
      meta: card.querySelector('.sv-insight-card__meta')?.textContent?.trim() ?? '',
    }));
    const feedback = Array.from(manual?.querySelectorAll('.sv-feedback') ?? []).map((entry) => ({
      className: entry.className,
      text: entry.textContent?.trim().replace(/\s+/g, ' ') ?? '',
    }));

    return {
      active: Boolean(section && getComputedStyle(section).display !== 'none'),
      providerBadge: section?.querySelector('.sv-inline-status')?.textContent?.trim() ?? '',
      cards,
      manualText: manual?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      feedback,
      buttonText: button?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      buttonDisabled: Boolean(button?.disabled),
      buttonType: button?.getAttribute('type') ?? '',
      visibleButtonsWithoutType: Array.from(section?.querySelectorAll('button') ?? [])
        .filter((entry) => entry.offsetParent !== null && entry.getAttribute('type') !== 'button')
        .map((entry) => entry.textContent?.trim().replace(/\s+/g, ' ') ?? entry.className),
      storeExists: Boolean(syncStore),
      status: syncStore?.status ?? null,
      statusText: syncStore?.statusText ?? null,
      providerId: syncStore?.providerId ?? null,
      pendingCount: syncStore?.pendingCount ?? null,
      conflictCount: syncStore?.conflictCount ?? null,
      lastError: syncStore?.lastError ?? null,
      lastResult: clone(syncStore?.lastResult ?? null),
    };
  });
}

async function readAuditUi() {
  return browser.execute(() => {
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

    const section = document.querySelector('[data-settings-tab="audit"]');
    const auditStore = findPinia()?._s.get('audit');
    const cards = Object.fromEntries(
      Array.from(section?.querySelectorAll('.sv-insight-card') ?? []).map((card) => [
        card.querySelector('.sv-insight-card__label')?.textContent?.trim() ?? '',
        card.querySelector('.sv-insight-card__value')?.textContent?.trim() ?? '',
      ]),
    );
    const feedback = Array.from(section?.querySelectorAll('.sv-feedback') ?? [])
      .map((entry) => entry.textContent?.trim().replace(/\s+/g, ' ') ?? '');
    const domActions = Array.from(section?.querySelectorAll('.sv-history-row__main strong') ?? [])
      .map((entry) => entry.textContent?.trim() ?? '');
    const selects = Array.from(section?.querySelectorAll('select') ?? []);
    const lastExport = auditStore?.lastExport;

    let jsonValid = false;
    let jsonEntryCount = null;
    let jsonTotalCount = null;
    if (lastExport?.mimeType?.startsWith('application/json')) {
      try {
        const parsed = JSON.parse(lastExport.content);
        jsonValid = Boolean(parsed && Array.isArray(parsed.entries));
        jsonEntryCount = Array.isArray(parsed?.entries) ? parsed.entries.length : null;
        jsonTotalCount = typeof parsed?.totalCount === 'number' ? parsed.totalCount : null;
      } catch {
        jsonValid = false;
      }
    }

    return {
      active: Boolean(section && getComputedStyle(section).display !== 'none'),
      storeExists: Boolean(auditStore),
      cards,
      feedback,
      domActions,
      emptyText: section?.querySelector('.sv-placeholder-card')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      keywordValue: section?.querySelector('input[type="search"]')?.value ?? '',
      actionFilter: selects[0]?.value ?? '',
      severityFilter: selects[1]?.value ?? '',
      visibleButtonsWithoutType: Array.from(section?.querySelectorAll('button') ?? [])
        .filter((entry) => entry.offsetParent !== null && entry.getAttribute('type') !== 'button')
        .map((entry) => entry.textContent?.trim().replace(/\s+/g, ' ') ?? entry.className),
      totalCount: auditStore?.totalCount ?? null,
      page: auditStore?.page ?? null,
      pageCount: auditStore?.pageCount ?? null,
      queryProfileId: auditStore?.queryParams?.profileId ?? null,
      queryKeyword: auditStore?.queryParams?.keyword ?? null,
      queryActions: Array.isArray(auditStore?.queryParams?.actions)
        ? Array.from(auditStore.queryParams.actions)
        : [],
      storeActions: Array.isArray(auditStore?.entries)
        ? auditStore.entries.map((entry) => entry.action)
        : [],
      isLoading: auditStore?.isLoading ?? null,
      error: auditStore?.error ?? null,
      integrityStatus: auditStore?.integrityStatus ?? null,
      integrityMessage: auditStore?.integrityMessage ?? null,
      lastExport: lastExport
        ? {
            fileName: lastExport.fileName,
            mimeType: lastExport.mimeType,
            totalCount: lastExport.totalCount,
            containsSyncPush: lastExport.content.includes('sync.push'),
            csvHeaderValid: lastExport.content.startsWith('"timestamp","action","actor_profile"'),
            jsonValid,
            jsonEntryCount,
            jsonTotalCount,
          }
        : null,
    };
  });
}

async function clickAuditButton(label) {
  return browser.execute((requestedLabel) => {
    const section = document.querySelector('[data-settings-tab="audit"]');
    const button = Array.from(section?.querySelectorAll('button') ?? [])
      .find((entry) => entry.textContent?.trim().replace(/\s+/g, ' ') === requestedLabel);
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }, label);
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

async function readAuditActionCounts(actions = ['updater.user-check', 'command.execute'], profileId = null) {
  return browser.execute((requestedActions, requestedProfileId) => {
    const actions = requestedActions;

    return new Promise((resolve) => {
      const request = window.indexedDB.open('InkForgeDB');

      request.onerror = () => {
        resolve({
          ok: false,
          reason: request.error ? request.error.message : 'indexeddb-open-failed',
          counts: Object.fromEntries(actions.map((action) => [action, 0])),
          latest: {},
        });
      };

      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('auditLogs')) {
          database.close();
          resolve({
            ok: true,
            counts: Object.fromEntries(actions.map((action) => [action, 0])),
            latest: {},
          });
          return;
        }

        const transaction = database.transaction('auditLogs', 'readonly');
        const store = transaction.objectStore('auditLogs');
        const all = store.getAll();

        all.onerror = () => {
          database.close();
          resolve({
            ok: false,
            reason: all.error ? all.error.message : 'auditLogs-read-failed',
            counts: Object.fromEntries(actions.map((action) => [action, 0])),
            latest: {},
          });
        };

        all.onsuccess = () => {
          const rows = (Array.isArray(all.result) ? all.result : [])
            .filter((row) => !requestedProfileId || row?.profileId === requestedProfileId);
          const counts = Object.fromEntries(actions.map((action) => [
            action,
            rows.filter((row) => row && row.action === action).length,
          ]));
          const latest = Object.fromEntries(actions.map((action) => {
            const entry = rows
              .filter((row) => row && row.action === action)
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0] || null;
            return [action, entry];
          }));

          database.close();
          resolve({ ok: true, counts, latest });
        };
      };
    });
  }, actions, profileId);
}

async function readUpdaterCommandProbe() {
  return browser.execute(() => {
    function clone(value) {
      if (value === null || value === undefined) return value;
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return null;
      }
    }

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
    const updaterStore = pinia && pinia._s.get('updater');
    const section = document.querySelector('[data-settings-entry="about.updater"]');
    const activeCommand = document.querySelector('#command-palette-option-updater\\.checkUpdates, [id="command-palette-option-updater.checkUpdates"]');

    return {
      pathname: location.pathname,
      search: location.search,
      commandPaletteOpen: Boolean(document.querySelector('.cp-overlay')),
      activeCommandText: activeCommand?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      sectionExists: Boolean(section),
      sectionText: section?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      visibleButtonsWithoutType: Array.from(section?.querySelectorAll('button') ?? [])
        .filter((button) => button.offsetParent !== null && button.getAttribute('type') !== 'button')
        .map((button) => button.textContent?.trim().replace(/\s+/g, ' ') ?? button.className),
      updaterStoreExists: Boolean(updaterStore),
      status: updaterStore?.status ?? null,
      busy: Boolean(updaterStore?.busy),
      actionMessage: clone(updaterStore?.actionMessage ?? null),
      lastResult: clone(updaterStore?.lastResult ?? null),
      updaterSettings: clone(updaterStore?.updaterSettings ?? null),
    };
  });
}

async function runUpdaterCommandPaletteProbe() {
  const beforeAudit = await readAuditActionCounts();

  await browser.execute(() => {
    window.dispatchEvent(new window.KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }));
  });

  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('.cp-overlay .cp-search-input'))),
    {
      timeout: 8_000,
      interval: 200,
      timeoutMsg: 'command palette did not open from Ctrl+K shortcut',
    },
  );

  const input = await browser.$('.cp-search-input');
  await input.setValue('Updater: Check');

  await browser.waitUntil(
    async () => {
      const probe = await readUpdaterCommandProbe();
      return probe.activeCommandText.includes('Updater: Check for Updates');
    },
    {
      timeout: 8_000,
      interval: 200,
      timeoutMsg: 'updater command did not appear in Command Palette search results',
    },
  );

  const clicked = await browser.execute(() => {
    const target =
      document.getElementById('command-palette-option-updater.checkUpdates') ||
      Array.from(document.querySelectorAll('.cp-item'))
        .find((item) => (item.textContent || '').includes('Updater: Check for Updates'));
    if (!target) return false;
    target.click();
    return true;
  });
  expect(clicked, 'Updater command should be clickable from the real Command Palette').to.equal(true);

  await browser.waitUntil(
    async () => {
      const probe = await readUpdaterCommandProbe();
      if (!probe.sectionExists || probe.busy || probe.commandPaletteOpen) {
        return false;
      }
      const audit = await readAuditActionCounts();
      return (
        probe.lastResult?.source === 'manual' &&
        audit.counts['updater.user-check'] > beforeAudit.counts['updater.user-check'] &&
        audit.counts['command.execute'] > beforeAudit.counts['command.execute']
      );
    },
    {
      timeout: 15_000,
      interval: 300,
      timeoutMsg: 'updater command did not finish with settings section and audit evidence',
    },
  );

  const afterAudit = await readAuditActionCounts();
  return {
    beforeAudit,
    afterAudit,
    probe: await readUpdaterCommandProbe(),
  };
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
    if (!canRestoreOriginalText) {
      return {
        ok: true,
        skipped: true,
        reason: 'INITIAL-CLIPBOARD-NOT-TEXT',
      };
    }

    const restoreText = original.value;
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
      skipped: false,
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

  it('Settings Audit renders an empty real filter result without fabricating ledger rows', async () => {
    await openSettingsAudit();
    const noMatch = `inkforge-empty-filter-${Date.now()}`;
    const keywordInput = await browser.$('[data-settings-tab="audit"] input[type="search"]');
    await keywordInput.setValue(noMatch);
    expect(await clickAuditButton('应用过滤'), 'no-match filter action is enabled').to.equal(true);

    await browser.waitUntil(
      async () => {
        const probe = await readAuditUi();
        return probe.storeExists &&
          !probe.isLoading &&
          probe.keywordValue === noMatch &&
          probe.queryKeyword === noMatch &&
          probe.totalCount === 0;
      },
      {
        timeout: 10_000,
        interval: 250,
        timeoutMsg: 'Settings Audit did not resolve the real no-match filter result',
      },
    );

    const empty = await readAuditUi();
    expect(empty.active, 'Settings Audit is the visible active tab').to.equal(true);
    expect(empty.cards['记录总数'], 'empty filtered count').to.equal('0');
    expect(empty.domActions, 'empty filter result renders no fake rows').to.deep.equal([]);
    expect(empty.emptyText, 'empty filter result explains how real rows appear').to.include('暂无审计记录');
    expect(empty.integrityStatus, 'integrity is not pre-claimed before verification').to.equal('unknown');
    expect(empty.cards['完整性'], 'overview starts unknown').to.equal('unknown');

    const resetKeywordInput = await browser.$('[data-settings-tab="audit"] input[type="search"]');
    await resetKeywordInput.click();
    await browser.keys(['Control', 'a']);
    await browser.keys('Backspace');
    await browser.waitUntil(
      async () => (await readAuditUi()).keywordValue === '',
      {
        timeout: 5_000,
        interval: 150,
        timeoutMsg: 'Settings Audit keyword input did not clear through Ctrl+A and Backspace',
      },
    );
    expect(await clickAuditButton('应用过滤'), 'clear filter action is enabled').to.equal(true);
    await browser.waitUntil(
      async () => {
        const probe = await readAuditUi();
        return !probe.isLoading && probe.keywordValue === '' && probe.queryKeyword === null;
      },
      {
        timeout: 10_000,
        interval: 250,
        timeoutMsg: 'Settings Audit did not clear the no-match filter through the real input path',
      },
    );
  });

  it('Settings Profiles persists one lifecycle and preserves its database namespace', async () => {
    const profileName = 'InkForge E2E 工作区';
    await openSettingsProfiles();
    await browser.waitUntil(
      async () => (await readProfilesUi()).rows.length > 0,
      { timeout: 10_000, interval: 250, timeoutMsg: 'Profile registry did not load' },
    );

    let evidence = await readProfilePersistence(profileName);
    if (!evidence.profile) {
      const nameInput = await browser.$('#profile-name-input');
      await nameInput.setValue(profileName);
      const createButton = await browser.$('[data-profile-create]');
      await createButton.waitForClickable({ timeout: 5_000, interval: 150 });
      await createButton.click();
      await browser.waitUntil(
        async () => (await readProfilePersistence(profileName)).activeMatchCount === 1,
        { timeout: 10_000, interval: 250, timeoutMsg: 'Profile creation did not persist one active registry row' },
      );
      evidence = await readProfilePersistence(profileName);
    } else if (evidence.profile.status === 'deleted') {
      await clickProfileAction(evidence.profile.id, 'restore', true);
      await browser.waitUntil(
        async () => (await readProfilePersistence(profileName)).profile?.status === 'active',
        { timeout: 10_000, interval: 250, timeoutMsg: 'Existing E2E Profile did not restore' },
      );
      evidence = await readProfilePersistence(profileName);
    }

    expect(evidence.activeMatchCount, 'exactly one active E2E profile').to.equal(1);
    expect(evidence.profile?.fileRoot, 'Tauri profile without picker selection keeps a real null root').to.equal(null);
    expect(evidence.profile?.fileRootStatus, 'Tauri profile without picker selection is unassigned').to.equal('unassigned');
    expect(evidence.databaseNamesSupported, 'WebView2 exposes readonly database enumeration').to.equal(true);
    expect(evidence.namespaceExists, 'dynamic Profile namespace exists').to.equal(true);
    expect(evidence.metadata, 'Profile namespace metadata exists').to.include({
      id: 'profile-meta',
      profileId: evidence.profile.id,
      profileName,
      dbNamespace: evidence.profile.dbNamespace,
      schemaVersion: 1,
    });

    let ui = await readProfilesUi();
    expect(ui.active, 'Profiles is visible').to.equal(true);
    expect(ui.pickerDisabled, 'native directory picker is enabled in real Tauri runtime').to.equal(false);
    expect(ui.pickerStatus, 'unselected native boundary is explicit').to.include('尚未分配文件根');
    expect(ui.visibleButtonsWithoutType, 'Profile controls keep explicit non-submit type').to.deep.equal([]);

    await (await browser.$('[data-profile-file-root-picker]')).click();
    await cancelNativeDirectoryDialog();
    await browser.waitUntil(
      async () => (await readProfilesUi()).feedback.some((entry) => entry.text.includes('已取消目录选择')),
      { timeout: 10_000, interval: 250, timeoutMsg: 'Native directory dialog cancellation was not surfaced' },
    );
    const cancelledPicker = await readProfilesUi();
    expect(cancelledPicker.pickerStatus, 'cancel keeps the file root unassigned').to.include('尚未分配文件根');

    const duplicateInput = await browser.$('#profile-name-input');
    await duplicateInput.setValue(profileName);
    await (await browser.$('[data-profile-create]')).click();
    await browser.waitUntil(
      async () => (await readProfilesUi()).feedback.some((entry) => entry.text.includes('工作区名称已存在')),
      { timeout: 10_000, interval: 250, timeoutMsg: 'Duplicate Profile name was not rejected visibly' },
    );
    evidence = await readProfilePersistence(profileName);
    expect(evidence.activeMatchCount, 'duplicate submit does not add another active row').to.equal(1);

    ui = await readProfilesUi();
    if (ui.activeProfileId !== evidence.profile.id) {
      await clickProfileAction(evidence.profile.id, 'switch');
      await browser.waitUntil(
        async () => (await readProfilesUi()).activeProfileId === evidence.profile.id,
        { timeout: 10_000, interval: 250, timeoutMsg: 'E2E Profile did not become active through UI switch' },
      );
    }

    const profileAuditBefore = await readAuditActionCounts(['sync.push']);
    await openSettingsSync();
    const profileSyncUi = await readSyncUi();
    expect(profileSyncUi.providerId, 'Profile attribution probe must not call a configured provider').to.equal(null);
    const profileSyncClicked = await browser.execute(() => {
      const button = document.querySelector('[data-settings-entry="sync.manual"] button');
      if (!button || button.disabled) return false;
      button.click();
      return true;
    });
    expect(profileSyncClicked, 'Profile-scoped sync probe is enabled').to.equal(true);
    await browser.waitUntil(
      async () => {
        const audit = await readAuditActionCounts(['sync.push']);
        return audit.ok && audit.counts['sync.push'] === profileAuditBefore.counts['sync.push'] + 1;
      },
      { timeout: 8_000, interval: 250, timeoutMsg: 'Profile-scoped sync probe did not append one audit row' },
    );
    const profileAuditAfter = await readAuditActionCounts(['sync.push']);
    expect(profileAuditAfter.latest['sync.push']?.profileId, 'sync audit follows the active Profile id')
      .to.equal(evidence.profile.id);

    await openSettingsProfiles();
    ui = await readProfilesUi();
    const fallback = ui.rows.find((row) => row.id !== evidence.profile.id);
    expect(fallback?.id, 'another real Profile is available for switch verification').to.be.a('string').and.not.equal('');
    await clickProfileAction(fallback.id, 'switch');
    await browser.waitUntil(
      async () => {
        const current = await readProfilesUi();
        return current.activeProfileId === fallback.id && current.storedActiveProfileId === fallback.id;
      },
      { timeout: 10_000, interval: 250, timeoutMsg: 'Profile switch did not persist the active pointer' },
    );

    await clickProfileAction(evidence.profile.id, 'soft-delete');
    const confirmInput = await browser.$('.sv-confirm-dialog input');
    await confirmInput.setValue(profileName);
    const confirmButton = await browser.$('.sv-confirm-ok');
    await confirmButton.waitForClickable({ timeout: 5_000, interval: 150 });
    await confirmButton.click();
    await browser.waitUntil(
      async () => (await readProfilePersistence(profileName)).profile?.status === 'deleted',
      { timeout: 10_000, interval: 250, timeoutMsg: 'Profile did not enter the real recovery state' },
    );
    const deleted = await readProfilePersistence(profileName);
    expect(deleted.profile?.deletedAt, 'soft delete writes deletedAt').to.be.a('number');
    expect(deleted.namespaceExists, 'soft delete preserves the namespace').to.equal(true);
    expect(deleted.metadata?.profileId, 'soft delete preserves namespace metadata').to.equal(deleted.profile.id);

    await clickProfileAction(deleted.profile.id, 'restore', true);
    await browser.waitUntil(
      async () => (await readProfilePersistence(profileName)).profile?.status === 'active',
      { timeout: 10_000, interval: 250, timeoutMsg: 'Profile did not restore from the recovery state' },
    );
    const restored = await readProfilePersistence(profileName);
    expect(restored.activeMatchCount, 'restore returns one active row').to.equal(1);
    expect(restored.profile?.deletedAt, 'restore clears the numeric deletion timestamp').to.equal(null);
    expect(restored.namespaceExists, 'restore keeps the same namespace').to.equal(true);
    expect(restored.metadata?.dbNamespace, 'restored metadata remains consistent').to.equal(restored.profile.dbNamespace);
  });

  it('Command Palette manual updater check opens Settings About and writes honest audit evidence', async () => {
    const result = await runUpdaterCommandPaletteProbe();
    const { probe, beforeAudit, afterAudit } = result;

    expect(probe.updaterStoreExists, 'updater store should be instantiated by the real app root').to.equal(true);
    expect(probe.commandPaletteOpen, 'command palette closes after a successful command').to.equal(false);
    expect(probe.pathname, 'command routes to Settings').to.equal('/settings');
    expect(probe.search, 'command routes directly to About updater section').to.include('tab=about');
    expect(probe.search, 'command routes directly to About updater section').to.include('section=updater');
    expect(probe.sectionExists, 'Settings About updater section renders').to.equal(true);
    expect(probe.visibleButtonsWithoutType, 'updater buttons keep explicit non-submit type').to.deep.equal([]);

    expect(probe.lastResult?.source, 'manual command calls updaterStore.checkNow').to.equal('manual');
    expect(probe.lastResult?.status, 'unconfigured local updater must not fake update success').to.equal('disabled');
    expect(
      ['build-config', 'runtime-unavailable', 'env', 'user-setting', 'offline'],
      `typed disabled reason: ${probe.lastResult?.disabledReason}`,
    ).to.include(probe.lastResult?.disabledReason);
    expect(probe.status, 'store status mirrors typed updater result').to.equal('disabled');
    expect(probe.updaterSettings?.lastCheckAt, 'manual check writes lastCheckAt to Settings').to.be.a('string').and.not.equal('');
    expect(probe.updaterSettings?.lastStatus, 'Settings stores typed updater status').to.equal('disabled');
    expect(probe.updaterSettings?.lastDisabledReason, 'Settings stores typed disabled reason')
      .to.equal(probe.lastResult.disabledReason);
    expect(probe.actionMessage?.type, 'manual disabled result is surfaced as informational feedback').to.equal('info');
    expect(probe.actionMessage?.text, 'manual command surfaces a user-visible updater message')
      .to.be.a('string').and.not.equal('');
    expect(probe.sectionText, 'Settings updater section remains explicit about not installing updates')
      .to.include('install/download/relaunch API');

    expect(
      afterAudit.counts['updater.user-check'],
      'manual updater check writes updater.user-check audit evidence',
    ).to.be.greaterThan(beforeAudit.counts['updater.user-check']);
    expect(
      afterAudit.latest['updater.user-check']?.payload?.source,
      'updater audit payload records manual source',
    ).to.equal('manual');
    expect(
      afterAudit.latest['updater.user-check']?.payload?.status,
      'updater audit payload records the typed disabled result',
    ).to.equal('disabled');
    expect(
      afterAudit.counts['command.execute'],
      'Command Palette records successful command execution through the audit ledger',
    ).to.be.greaterThan(beforeAudit.counts['command.execute']);
    expect(
      afterAudit.latest['command.execute']?.payload?.commandId,
      'command audit payload records the updater command id',
    ).to.equal('updater.checkUpdates');
  });

  it('Settings Sync calls the real unconfigured provider boundary and records one honest failure', async () => {
    await openSettingsSync();
    const before = await readSyncUi();

    expect(before.active, 'Settings Sync is the visible active tab').to.equal(true);
    expect(before.storeExists, 'real sync Pinia store is mounted').to.equal(true);
    expect(before.providerId, 'test must not trigger an externally configured provider').to.equal(null);
    expect(before.providerBadge, 'provider badge is honest when unconfigured').to.equal('未配置');
    expect(before.statusText, 'status text must not claim remote success').to.match(/^同步未配置/);
    expect(before.pendingCount, 'pending count comes from ChangeTracker state').to.be.a('number').and.at.least(0);
    expect(before.conflictCount, 'conflict count comes from SyncEngine state').to.be.a('number').and.at.least(0);
    expect(before.manualText, 'manual sync copy explains the real provider requirement').to.include('不会把本地队列标记为远端成功');
    expect(before.buttonText, 'manual action is visible').to.equal('立即同步');
    expect(before.buttonDisabled, 'manual action is enabled before the real call').to.equal(false);
    expect(before.buttonType, 'manual action is non-submit').to.equal('button');
    expect(before.visibleButtonsWithoutType, 'visible Sync buttons keep explicit type').to.deep.equal([]);

    const beforeAudit = await readAuditActionCounts(['sync.push']);
    expect(beforeAudit.ok, beforeAudit.reason || 'pre-sync audit read').to.equal(true);

    const clicked = await browser.execute(() => {
      const button = document.querySelector('[data-settings-entry="sync.manual"] button');
      if (!button || button.disabled) return false;
      button.click();
      return true;
    });
    expect(clicked, 'manual sync button calls the real Settings handler').to.equal(true);

    await browser.waitUntil(
      async () => {
        const probe = await readSyncUi();
        return probe.status === 'paused' &&
          probe.lastResult?.success === false &&
          probe.feedback.some((entry) => entry.text.includes('同步提供者未配置')) &&
          !probe.buttonDisabled;
      },
      {
        timeout: 12_000,
        interval: 250,
        timeoutMsg: 'manual sync did not surface the typed unconfigured-provider failure',
      },
    );

    await browser.waitUntil(
      async () => {
        const audit = await readAuditActionCounts(['sync.push']);
        return audit.ok && audit.counts['sync.push'] > beforeAudit.counts['sync.push'];
      },
      {
        timeout: 8_000,
        interval: 250,
        timeoutMsg: 'manual sync failure did not persist sync.push audit evidence',
      },
    );

    const after = await readSyncUi();
    const afterAudit = await readAuditActionCounts(['sync.push']);
    const providerErrors = after.feedback.filter((entry) => entry.text.includes('同步提供者未配置'));

    expect(after.status, 'SyncEngine enters the honest unconfigured state').to.equal('paused');
    expect(after.statusText, 'status card remains explicit after the action').to.match(/^同步未配置/);
    expect(after.lastResult, 'store retains the real SyncResult').to.include({
      success: false,
      uploaded: 0,
      downloaded: 0,
      newConflicts: 0,
    });
    expect(after.lastResult.error, 'typed result reports the provider boundary').to.include('同步提供者未配置');
    expect(after.lastError, 'engine state exposes the same real error').to.include('同步提供者未配置');
    expect(providerErrors, 'UI deduplicates the store and action error surfaces').to.have.length(1);
    expect(after.feedback.some((entry) => entry.text.includes('同步完成')), 'no fake success feedback is rendered').to.equal(false);
    expect(after.buttonText, 'manual action returns from busy state').to.equal('立即同步');
    expect(after.buttonDisabled, 'manual action re-enables after failure').to.equal(false);

    expect(afterAudit.counts['sync.push'], 'one persisted sync.push audit row is added')
      .to.equal(beforeAudit.counts['sync.push'] + 1);
    expect(afterAudit.latest['sync.push']?.outcome, 'audit outcome is failure').to.equal('failure');
    expect(afterAudit.latest['sync.push']?.payload?.providerId, 'audit records unconfigured provider').to.equal('unconfigured');
    expect(afterAudit.latest['sync.push']?.payload?.errorCode, 'audit records typed provider error').to.equal('PROVIDER_UNCONFIGURED');
  });

  it('Settings Audit reads, filters, exports, and verifies the real durable ledger', async () => {
    await openSettingsSync();
    const syncBefore = await readSyncUi();
    expect(syncBefore.providerId, 'audit probe must not call a configured remote provider').to.equal(null);

    const auditBefore = await readAuditActionCounts(['sync.push']);
    expect(auditBefore.ok, auditBefore.reason || 'pre-audit durable ledger read').to.equal(true);

    const syncClicked = await browser.execute(() => {
      const button = document.querySelector('[data-settings-entry="sync.manual"] button');
      if (!button || button.disabled) return false;
      button.click();
      return true;
    });
    expect(syncClicked, 'real no-provider sync action creates the audit subject').to.equal(true);

    await browser.waitUntil(
      async () => {
        const audit = await readAuditActionCounts(['sync.push']);
        return audit.ok && audit.counts['sync.push'] === auditBefore.counts['sync.push'] + 1;
      },
      {
        timeout: 8_000,
        interval: 250,
        timeoutMsg: 'real sync failure did not append exactly one durable audit row',
      },
    );

    const createdAudit = await readAuditActionCounts(['sync.push']);
    expect(createdAudit.latest['sync.push']?.outcome, 'audit subject is a real failure record').to.equal('failure');
    expect(createdAudit.latest['sync.push']?.payload?.errorCode, 'audit subject keeps typed error metadata')
      .to.equal('PROVIDER_UNCONFIGURED');
    const createdProfileAudit = await readAuditActionCounts(
      ['sync.push'],
      createdAudit.latest['sync.push']?.profileId ?? null,
    );

    await openSettingsAudit();
    await browser.waitUntil(
      async () => !(await readAuditUi()).isLoading,
      { timeout: 10_000, interval: 200, timeoutMsg: 'Settings Audit did not finish its initial refresh' },
    );
    expect(await clickAuditButton('刷新审计'), 'visible refresh button is enabled').to.equal(true);

    await browser.waitUntil(
      async () => {
        const probe = await readAuditUi();
        return probe.storeExists &&
          !probe.isLoading &&
          probe.queryProfileId === createdAudit.latest['sync.push']?.profileId &&
          probe.storeActions.includes('sync.push') &&
          probe.domActions.includes('sync.push');
      },
      {
        timeout: 10_000,
        interval: 250,
        timeoutMsg: 'Settings Audit did not render the real profile-scoped ledger row',
      },
    );

    const unfiltered = await readAuditUi();
    expect(unfiltered.active, 'Settings Audit is the visible active tab').to.equal(true);
    expect(unfiltered.storeExists, 'real audit Pinia store is mounted').to.equal(true);
    expect(unfiltered.error, 'repository refresh has no hidden error').to.equal(null);
    expect(unfiltered.totalCount, 'real profile ledger has entries').to.be.a('number').and.greaterThan(0);
    expect(unfiltered.cards['记录总数'], 'overview count mirrors the store').to.equal(String(unfiltered.totalCount));
    expect(unfiltered.cards.Profile, 'overview profile mirrors the query').to.equal(unfiltered.queryProfileId);
    expect(unfiltered.visibleButtonsWithoutType, 'visible Audit buttons keep explicit type').to.deep.equal([]);

    const actionFilter = await browser.$('[data-settings-tab="audit"] select');
    await actionFilter.selectByAttribute('value', 'sync.push');
    await browser.waitUntil(
      async () => {
        const probe = await readAuditUi();
        return !probe.isLoading &&
          probe.actionFilter === 'sync.push' &&
          probe.queryActions.length === 1 &&
          probe.queryActions[0] === 'sync.push' &&
          probe.storeActions.length > 0 &&
          probe.storeActions.every((action) => action === 'sync.push') &&
          probe.domActions.every((action) => action === 'sync.push');
      },
      {
        timeout: 10_000,
        interval: 250,
        timeoutMsg: 'real action filter did not constrain the ledger to sync.push',
      },
    );

    const filtered = await readAuditUi();
    expect(filtered.totalCount, 'filtered durable count').to.equal(createdProfileAudit.counts['sync.push']);
    expect(filtered.cards['当前页'], 'filtered result stays on the first page').to.equal('1 / 1');
    expect(filtered.integrityStatus, 'integrity is not pre-claimed before the user action').to.equal('unknown');

    expect(await clickAuditButton('校验完整性'), 'integrity action is enabled').to.equal(true);
    await browser.waitUntil(
      async () => {
        const probe = await readAuditUi();
        return probe.integrityStatus === 'valid' && /^已验证 \d+ 条审计链路$/u.test(probe.integrityMessage ?? '');
      },
      {
        timeout: 10_000,
        interval: 250,
        timeoutMsg: 'real audit hash-chain integrity result did not become valid',
      },
    );

    const integrity = await readAuditUi();
    expect(integrity.cards['完整性'], 'overview reflects verified integrity').to.equal('valid');
    expect(integrity.feedback, 'integrity result is visible').to.include(integrity.integrityMessage);

    expect(await clickAuditButton('导出 CSV'), 'CSV export action is enabled').to.equal(true);
    await browser.waitUntil(
      async () => {
        const probe = await readAuditUi();
        return probe.lastExport?.fileName?.endsWith('.csv') &&
          probe.feedback.some((message) => message.includes('已导出') && message.includes('.csv'));
      },
      {
        timeout: 10_000,
        interval: 250,
        timeoutMsg: 'filtered CSV export did not report the real repository result',
      },
    );

    const csv = await readAuditUi();
    expect(csv.lastExport?.mimeType, 'CSV MIME type').to.equal('text/csv;charset=utf-8');
    expect(csv.lastExport?.totalCount, 'CSV uses the current filtered count').to.equal(filtered.totalCount);
    expect(csv.lastExport?.csvHeaderValid, 'CSV has the repository audit header').to.equal(true);
    expect(csv.lastExport?.containsSyncPush, 'CSV contains the real filtered action').to.equal(true);

    expect(await clickAuditButton('导出 JSON'), 'JSON export action is enabled').to.equal(true);
    await browser.waitUntil(
      async () => {
        const probe = await readAuditUi();
        return probe.lastExport?.fileName?.endsWith('.json') &&
          probe.feedback.some((message) => message.includes('已导出') && message.includes('.json'));
      },
      {
        timeout: 10_000,
        interval: 250,
        timeoutMsg: 'filtered JSON export did not report the real repository result',
      },
    );

    const json = await readAuditUi();
    expect(json.lastExport?.mimeType, 'JSON MIME type').to.equal('application/json;charset=utf-8');
    expect(json.lastExport?.totalCount, 'JSON uses the current filtered count').to.equal(filtered.totalCount);
    expect(json.lastExport?.jsonValid, 'JSON export parses with an entries array').to.equal(true);
    expect(json.lastExport?.jsonEntryCount, 'JSON exports every filtered entry').to.equal(filtered.totalCount);
    expect(json.lastExport?.jsonTotalCount, 'JSON metadata reports the same count').to.equal(filtered.totalCount);
    expect(json.lastExport?.containsSyncPush, 'JSON contains the real filtered action').to.equal(true);
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
    if (probe.skipped) {
      expect(probe.reason, 'non-text clipboard state is left untouched').to.equal('INITIAL-CLIPBOARD-NOT-TEXT');
      return;
    }
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
