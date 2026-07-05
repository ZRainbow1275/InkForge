/**
 * svg-render.spec.cjs — verifies the WeChat-safe inline-SVG flagship typesetting
 * (PR1–PR6 of the 06-01 multiplatform-render-svg task) against the REAL Tauri
 * WebView2 binary, driven by tauri-driver + msedgedriver (NOT a vite browser).
 *
 * This is a MEANINGFUL multi-round verification: it SEEDS a real draft, opens
 * the real ExportModal, loops the 3 flagship presets, and HARD-asserts that each
 * injects responsive [data-ink-svg] modules. It only this.skip()s when the app
 * genuinely cannot reach the main window OR a draft cannot be seeded — in which
 * case it console.warns the precise reason. Once a draft is loaded, the SVG
 * assertions are HARD (failing when SVG is missing is the entire point).
 *
 * ─── PREREQUISITES (this spec does NOT self-build) ──────────────────────────
 *   1. pnpm build                       # refresh inkforge/dist (Tauri embeds it
 *                                        #   at cargo build time — visual code
 *                                        #   changes are invisible until rebuilt)
 *   2. cargo build -p inkforge          # or `pnpm tauri build --debug`; produces
 *                                        #   src-tauri/target/debug/InkForge.exe
 *   3. tauri-driver.exe on PATH or at   ~/.cargo/bin/tauri-driver.exe
 *      (override with TAURI_DRIVER_PATH)
 *   4. msedgedriver.exe matching the    ~/.local/bin/msedgedriver.exe
 *      installed WebView2 runtime       (override with MSEDGE_DRIVER_PATH)
 *
 *   Run:  pnpm test:e2e   (wdio.conf.cjs collects tests/e2e/specs/*.spec.cjs)
 *
 *   The wdio.conf.cjs onPrepare runs `cargo build` for you, but `pnpm build`
 *   must be run manually first so the embedded dist is current.
 *
 * ─── HOW THIS SPEC SEEDS A DRAFT (the reliability story) ────────────────────
 *   The Stage `全屏导出` button (`.stage-btn-secondary`) is `:disabled` unless an
 *   article is loaded (`hasContent` ⇔ editor status 'ready'|'saving'). The editor
 *   store (src/stores/editor.ts) loads content by WATCHING
 *   `articleStore.selectedArticleId`; selecting an article that has `rawContent`
 *   makes the editor create/load its `EditedContent` and flip status to 'ready'.
 *   The ExportModal preview is driven by `:content="normalizedBody"`
 *   (= currentContent.body) rendered through `markdownToWechatWithStats`.
 *
 *   Pinia is NOT exposed on window (verified: src/main.ts only `app.use(pinia)`),
 *   so we reach the live stores through Vue's runtime: the mount root `#app`
 *   carries `__vue_app__`; the active Pinia lives in
 *   `app._context.provides[<piniaSymbol>]` and exposes its instantiated stores in
 *   `pinia._s` (a Map keyed by store id). `article` and `editor` are instantiated
 *   at boot (main.ts calls useArticleStore/useEditorStore), so `pinia._s.get
 *   ('article')` yields the real, fully-validated store. We then:
 *       articleStore.addArticle({ title, sourceUrl, rawContent })  // real, zod-validated, encrypted path
 *       articleStore.selectArticle(newId)                          // triggers editor load → status 'ready'
 *   This uses the app's OWN production creation path (authority fields, audit,
 *   sync, encryption) — zero mock, zero raw-dexie schema guessing. The seeded
 *   markdown carries an H1 + H2 + H3 + `---` hr + `>` blockquote + several CJK
 *   paragraphs so every flagship plan injects cover + header(s) + divider +
 *   quote + endmark (themes.ts flagship*Plan).
 *
 *   If the Pinia bridge cannot be reached (future Vue/Pinia internals drift), we
 *   skip with a precise console.warn rather than silently passing.
 *
 * ─── ARCHITECTURE FACTS THIS SPEC RELIES ON (verified against source) ───────
 *   • The [data-ink-svg] modules are injected by `preset.decorate`
 *     (= composeSvgDecorate) which runs ONLY inside the real export pipeline
 *     (markdownToWechatWithStats, wechat.ts:1336). In the live UI that pipeline
 *     feeds the **ExportModal** preview, rendered (v-html) into `.preview-render`.
 *       NOTE: the Stage-panel mini-phone preview (`.device-screen .preview-content`)
 *       uses the high-fidelity *mock* renderer which does NOT run decorate, so it
 *       carries NO [data-ink-svg]. That is why this spec asserts inside the
 *       ExportModal, not the Stage preview.
 *   • The 3 flagship presets live in themes.ts and surface in the ExportModal
 *     preset grid (`.preset-card`) for the WeChat platform (the default platform):
 *         flagship-kiln    赤陶旗舰   #D95B3F  creative
 *         flagship-tempera 铜绿旗舰   #3B7A6B  academic
 *         flagship-amber   黄铜旗舰   #C19A56  business
 *     The cards expose NO id data-attr, so we match by visible name text
 *     (rendered in `.preset-name`).
 *   • Each injected module is (primitives.ts svgSection):
 *         <section data-ink-svg="<moduleId>" style="...">
 *           <svg viewBox="0 0 W H" width="100%" style="display:block;…">…</svg>
 *         </section>
 *     width="100%" makes the <svg> track its container width responsively.
 *   • The article body is wrapped in `<section id="nice" ...>`; the body
 *     width-lock CSS (preset-fonts.ts generatePersonaBaseCSS) sets
 *         #nice { max-width: min(22em, calc(100vw - 32px)); font-size:17px; }
 *     so 22em·17px ≈ 374px → ~20–22 CJK chars/line on a mobile column. Inside the
 *     ~460px ExportModal preview column it resolves to ~374px (band-asserted).
 *
 * ─── SELECTORS (mirror the REAL components) ─────────────────────────────────
 *     WorkstationView.vue → `.panel-stage` (stage panel), `.stage-collapsed-bar`
 *                           (collapsed trigger), `.stage-btn-secondary` (全屏导出),
 *                           `.ink-titlebar` (main-window readiness sentinel).
 *     ExportModal.vue     → `.export-panel` (teleported dialog), `.pill-btn`
 *                           (platform pills, `.active` = current), `.preset-card`
 *                           (preset grid, `.preset-name` is the label),
 *                           `.preview-render` (v-html preview), `.header-close`.
 */
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

// Flagship presets (themes.ts). We click the card by its visible name text and
// collect results keyed by the documented preset id for the evidence report.
const FLAGSHIP_PRESETS = [
  { id: 'flagship-kiln', name: '赤陶旗舰' },
  { id: 'flagship-tempera', name: '铜绿旗舰' },
  { id: 'flagship-amber', name: '黄铜旗舰' },
];

// Evidence screenshots land here (the repo-root prompts/0601/evidence tree,
// alongside the PRD + SPEC). __dirname is inkforge/tests/e2e/specs, so four
// `..` reach the repo root D:/Desktop/Inkforge. One PNG per flagship round.
const EVIDENCE_DIR = path.resolve(
  __dirname, '..', '..', '..', '..', 'prompts', '0601', 'evidence', 'e2e',
);

// Seeded markdown — H1 + lead blockquote + CJK paragraphs + H2 + H3 + `---` hr +
// a second blockquote, so EVERY flagship plan (cover + headings[2,3] + replaceHr
// + blockquote + endmark) finds its anchors. Paragraphs are long CJK runs so the
// chars/line probe has a representative wrapping line.
const SEED_TITLE = 'SVG 旗舰排版真机验证样稿';
const SEED_MARKDOWN = [
  '# SVG 旗舰排版真机验证样稿',
  '',
  '> 这是一段导语，用来触发封面与引用卡模块的真实注入流程。',
  '',
  '在墨铸的导出管线里，我们把高级排版编译成微信安全的内联矢量图形，',
  '让标题、分隔线、引用卡与结束标都成为可复用的参数化组件，并且严格遵守',
  '每行二十到二十二个汉字的移动端可读性铁律，不破坏任何既有渲染行为。',
  '',
  '## 章节标题触发标题头模块',
  '',
  '正文继续展开，混排英文 The quick brown fox 与中文段落，验证字体对在真实',
  'WebView2 内的协同表现，同时让分隔线与徽章模块拥有足够的上下文环境。',
  '',
  '### 三级标题触发竖线标题头',
  '',
  '这一段是较长的中文正文，用于测量每行折行后的汉字数量是否落在二十到',
  '二十二字的舒适区间，从而确认行宽锁在旗舰预设下依旧生效且未被破坏。',
  '',
  '---',
  '',
  '> “真实渲染、真实跑通、零模拟。” —— 墨铸团队',
  '',
  '末段补充更多中文内容，确保文末结束标模块能够正确追加到正文之后，',
  '并且整篇文章的多个 SVG 模块都能在导出预览中被探针稳定地观测到。',
].join('\n');

// ─── shared helpers ─────────────────────────────────────────────────────────

async function waitForMainWindow() {
  await browser.waitUntil(
    async () => {
      try {
        return await browser.execute(() => !!document.querySelector('.ink-titlebar'));
      } catch {
        return false;
      }
    },
    {
      timeout: 30_000,
      interval: 300,
      timeoutMsg: '.ink-titlebar never appeared — never reached main window',
    },
  );
  // Settle for layout/paint.
  await browser.pause(1500);
}

/**
 * Reach the live Pinia `article` + `editor` stores through Vue's runtime, seed a
 * real draft via the app's own validated creation path, and select it so the
 * editor loads it (status → 'ready'). Returns a diagnostic object:
 *   { ok: true, articleId } on success
 *   { ok: false, reason }   on failure (caller decides skip + warn)
 */
async function seedDraftViaPinia(title, markdown) {
  return browser.execute((seedTitle, seedBody) => {
    function findPinia() {
      const root = document.getElementById('app');
      const app = root && root.__vue_app__;
      if (!app || !app._context || !app._context.provides) return null;
      const provides = app._context.provides;
      // Pinia registers itself under a non-enumerable Symbol key; find the
      // provided value that looks like a Pinia instance (has the `_s` store Map).
      for (const sym of Object.getOwnPropertySymbols(provides)) {
        const candidate = provides[sym];
        if (candidate && candidate._s && typeof candidate._s.get === 'function') {
          return candidate;
        }
      }
      return null;
    }

    try {
      const pinia = findPinia();
      if (!pinia) return { ok: false, reason: 'PINIA-UNREACHABLE: #app.__vue_app__ provides has no Pinia (with _s store map)' };

      const articleStore = pinia._s.get('article');
      if (!articleStore || typeof articleStore.addArticle !== 'function') {
        return { ok: false, reason: 'STORE-MISSING: pinia._s has no usable `article` store (addArticle missing)' };
      }

      // Async creation: addArticle is a real zod-validated, encrypted, audited
      // path. We return a Promise so webdriver awaits it.
      return articleStore
        .addArticle({
          title: seedTitle,
          sourceUrl: 'e2e://svg-render-seed/' + Date.now(),
          rawContent: seedBody,
        })
        .then((article) => {
          if (!article || !article.id) {
            return { ok: false, reason: 'CREATE-FAILED: addArticle returned no article id' };
          }
          articleStore.selectArticle(article.id);
          return { ok: true, articleId: article.id };
        })
        .catch((err) => ({
          ok: false,
          reason: 'ADD-ARTICLE-THREW: ' + (err && err.message ? err.message : String(err)),
        }));
    } catch (err) {
      return { ok: false, reason: 'SEED-EXCEPTION: ' + (err && err.message ? err.message : String(err)) };
    }
  }, title, markdown);
}

/**
 * Ensure we are on a Workstation view with the seeded draft loaded and the
 * `全屏导出` button (`.stage-btn-secondary`) enabled. Returns:
 *   { ready: true } once the export button is enabled
 *   { ready: false, reason } otherwise.
 */
async function reachWorkstationExport(articleId) {
  // Navigate to /workstation?id=<seededId> so the route → selectArticle path
  // (WorkstationView syncRouteArticleSelection) keeps the draft selected even if
  // a tab/layout watcher re-runs. Router uses createWebHistory (see visual.spec).
  await browser.execute((id) => {
    const target = id ? `/workstation?id=${encodeURIComponent(id)}` : '/workstation';
    if (!location.pathname.startsWith('/workstation') || (id && !location.search.includes(id))) {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, articleId);
  await browser.pause(1200);

  // The Stage panel may start collapsed; expand it via its collapsed bar.
  await browser.execute(() => {
    const bar = document.querySelector('.panel-stage .stage-collapsed-bar');
    if (bar) bar.click();
  });
  await browser.pause(400);

  let ready = false;
  try {
    await browser.waitUntil(
      async () => {
        const state = await browser.execute(() => {
          const btn = document.querySelector('.panel-stage .stage-btn-secondary');
          if (!btn) return 'absent';
          return btn.disabled ? 'disabled' : 'ready';
        });
        return state === 'ready';
      },
      { timeout: 15_000, interval: 400 },
    );
    ready = true;
  } catch {
    // Keep the default false state; the branch below reads the final button status.
  }

  if (!ready) {
    const state = await browser.execute(() => {
      const btn = document.querySelector('.panel-stage .stage-btn-secondary');
      return btn ? (btn.disabled ? 'disabled' : 'ready') : 'absent';
    });
    return { ready: false, reason: `STAGE-EXPORT-${state.toUpperCase()}: 全屏导出 button never became enabled after seeding` };
  }
  return { ready: true };
}

/**
 * Open the ExportModal, ensure the WeChat platform pill is active, click the
 * flagship preset card matching `flagshipName`, and wait until the modal preview
 * (`.preview-render`) has rendered at least one [data-ink-svg] module for that
 * preset. Throws (HARD) if the card is missing or the SVG never injects.
 */
async function openFlagshipExportPreview(flagshipName) {
  await openExportPanel('微信');

  // Click the flagship preset card by its visible name.
  const clicked = await browser.execute((name) => {
    const cards = Array.from(document.querySelectorAll('.export-panel .preset-card'));
    const card = cards.find((c) => (c.textContent || '').includes(name));
    if (!card) return false;
    card.click();
    return true;
  }, flagshipName);

  expect(clicked, `flagship preset card "${flagshipName}" must exist in the WeChat preset grid`).to.equal(true);

  // The render watcher is async (markdownToWechatWithStats). Wait for the preview
  // to render at least one [data-ink-svg] section in `.preview-render`.
  await browser.waitUntil(
    async () =>
      browser.execute(() => {
        const render = document.querySelector('.export-panel .preview-render');
        if (!render) return false;
        return render.querySelectorAll('[data-ink-svg]').length > 0;
      }),
    {
      timeout: 20_000,
      interval: 500,
      timeoutMsg: `flagship preview never injected [data-ink-svg] for "${flagshipName}"`,
    },
  );
}

async function openExportPanel(platformLabel = '微信') {
  await openExportPanelOnly();

  const selected = await browser.execute((label) => {
    const pills = Array.from(document.querySelectorAll('.export-panel .pill-btn'));
    const target = pills.find((p) => (p.textContent || '').includes(label)) || pills[0];
    if (!target) return false;
    if (!target.classList.contains('active')) target.click();
    return true;
  }, platformLabel);
  expect(selected, `platform pill "${platformLabel}" should exist in ExportModal`).to.equal(true);
  await browser.pause(400);
}

async function openExportPanelOnly() {
  // Click 全屏导出 to open the ExportModal.
  await browser.execute(() => {
    const btn = document.querySelector('.panel-stage .stage-btn-secondary');
    if (btn && !btn.disabled) btn.click();
  });

  // Modal teleports to <body>; wait for the panel + preset grid to mount.
  await browser.waitUntil(
    async () =>
      browser.execute(
        () =>
          !!document.querySelector('.export-panel') &&
          document.querySelectorAll('.export-panel .preset-card').length > 0,
      ),
    {
      timeout: 12_000,
      interval: 300,
      timeoutMsg: 'ExportModal (.export-panel + .preset-card) never mounted',
    },
  );
}

async function selectExportPlatform(platformLabel) {
  const selected = await browser.execute((label) => {
    const pills = Array.from(document.querySelectorAll('.export-panel .pill-btn'));
    const target = pills.find((p) => (p.textContent || '').includes(label));
    if (!target) return false;
    if (!target.classList.contains('active')) target.click();
    return true;
  }, platformLabel);
  expect(selected, `platform pill "${platformLabel}" should exist in ExportModal`).to.equal(true);
  await browser.pause(400);
}

function collectStyleCapabilityProbe() {
  return browser.execute(() => {
    const cards = Array.from(document.querySelectorAll('.export-panel .style-choice-card'));
    const summaries = Array.from(document.querySelectorAll('.export-panel [class*="preflight"]'))
      .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
      .filter((text) => text.includes('样式能力目录'));
    const byClass = (className) => cards.filter((card) => card.classList.contains(className)).length;

    return {
      summary: (document.querySelector('.export-panel .style-catalog-summary')?.textContent || '')
        .trim()
        .replace(/\s+/g, ' '),
      externalChecklistText: (document.querySelector('.export-panel .style-proof-external-checklist')?.textContent || '')
        .trim()
        .replace(/\s+/g, ' '),
      externalChecklistGroups: Array.from(document.querySelectorAll('.export-panel .style-proof-external-checklist__group'))
        .map((group) => (group.textContent || '').trim().replace(/\s+/g, ' ')),
      externalHandoffText: (document.querySelector('.export-panel .style-proof-external-handoff')?.textContent || '')
        .trim()
        .replace(/\s+/g, ' '),
      externalHandoffFlags: Array.from(document.querySelectorAll('.export-panel .style-proof-external-handoff__flag'))
        .map((flag) => (flag.textContent || '').trim().replace(/\s+/g, ' ')),
      localActionabilityText: (document.querySelector('.export-panel .style-proof-local-actionability')?.textContent || '')
        .trim()
        .replace(/\s+/g, ' '),
      localActionabilityGroups: Array.from(document.querySelectorAll('.export-panel .style-proof-local-actionability__group'))
        .map((group) => (group.textContent || '').trim().replace(/\s+/g, ' ')),
      marketSummaries: Array.from(document.querySelectorAll('.export-panel .style-choice-market-summary'))
        .map((summary) => (summary.textContent || '').trim().replace(/\s+/g, ' ')),
      marketChipLabels: Array.from(document.querySelectorAll('.export-panel .style-choice-market-capabilities span'))
        .map((chip) => (chip.textContent || '').trim().replace(/\s+/g, ' ')),
      marketOverflowCount: Array.from(document.querySelectorAll('.export-panel .style-choice-market-summary, .export-panel .style-choice-market-capabilities'))
        .filter((el) => el.scrollWidth > el.clientWidth + 1).length,
      acceptancePreflightText: Array.from(document.querySelectorAll('.export-panel [class*="preflight"]'))
        .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
        .filter((text) => text.includes('验收宣称审计'))
        .join(' | '),
      releaseGatePreflightText: Array.from(document.querySelectorAll('.export-panel [class*="preflight"]'))
        .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
        .filter((text) => text.includes('fingerprintConflicts'))
        .join(' | '),
      cardCount: cards.length,
      availableCount: byClass('style-choice-available'),
      blockedCount: byClass('style-choice-blocked'),
      unavailableCount: byClass('style-choice-unavailable'),
      cards: cards.map((card) => ({
        className: card.className,
        disabled: Boolean(card.disabled),
        pressed: card.getAttribute('aria-pressed'),
        text: (card.textContent || '').trim().replace(/\s+/g, ' '),
      })),
      preflightText: summaries.join(' | '),
    };
  });
}

async function closeExportModal() {
  await browser.execute(() => {
    const close = document.querySelector('.export-panel .header-close');
    if (close) close.click();
  });
  await browser.waitUntil(
    async () => browser.execute(() => !document.querySelector('.export-panel')),
    {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: 'ExportModal did not unmount after close',
    },
  );
}

async function closeExportModalIfOpen() {
  const open = await browser.execute(() => Boolean(document.querySelector('.export-panel')));
  if (open) {
    await closeExportModal();
  }
}

async function setDefaultExportPlatform(platform) {
  return browser.execute((nextPlatform) => {
    function findPinia() {
      const root = document.getElementById('app');
      const app = root && root.__vue_app__;
      if (!app || !app._context || !app._context.provides) return null;
      const provides = app._context.provides;
      for (const sym of Object.getOwnPropertySymbols(provides)) {
        const candidate = provides[sym];
        if (candidate && candidate._s && typeof candidate._s.get === 'function') {
          return candidate;
        }
      }
      return null;
    }

    const pinia = findPinia();
    const settingsStore = pinia && pinia._s.get('settings');
    if (!settingsStore || !settingsStore.settings || typeof settingsStore.save !== 'function') {
      return { ok: false, reason: 'SETTINGS-STORE-MISSING' };
    }

    const original = settingsStore.settings.export.defaultPlatform;
    settingsStore.settings.export.defaultPlatform = nextPlatform;
    settingsStore.save();
    return {
      ok: true,
      original,
      current: settingsStore.settings.export.defaultPlatform,
    };
  }, platform);
}

async function setExportCustomCss(css) {
  return browser.execute((nextCss) => {
    function findPinia() {
      const root = document.getElementById('app');
      const app = root && root.__vue_app__;
      if (!app || !app._context || !app._context.provides) return null;
      const provides = app._context.provides;
      for (const sym of Object.getOwnPropertySymbols(provides)) {
        const candidate = provides[sym];
        if (candidate && candidate._s && typeof candidate._s.get === 'function') {
          return candidate;
        }
      }
      return null;
    }

    const pinia = findPinia();
    const settingsStore = pinia && pinia._s.get('settings');
    if (!settingsStore || !settingsStore.settings || typeof settingsStore.save !== 'function') {
      return { ok: false, reason: 'SETTINGS-STORE-MISSING' };
    }

    const original = settingsStore.settings.export.customCss;
    settingsStore.settings.export.customCss = nextCss;
    settingsStore.save();
    return {
      ok: true,
      original,
      current: settingsStore.settings.export.customCss,
    };
  }, css);
}

async function getActiveStagePlatformLabel() {
  return browser.execute(() => {
    const active = document.querySelector('.panel-stage .stage-tab.active');
    return (active?.textContent || '').trim().replace(/\s+/g, ' ');
  });
}

async function getActiveExportPlatformLabel() {
  return browser.execute(() => {
    const active = document.querySelector('.export-panel .pill-btn.active');
    return (active?.textContent || '').trim().replace(/\s+/g, ' ');
  });
}

function ensureEvidenceDir() {
  try {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  } catch {
    /* ignore — saveScreenshot will surface a clearer error if the dir is bad */
  }
}

// ─── specs ───────────────────────────────────────────────────────────────────

describe('InkForge — SVG flagship typesetting (PR7, multi-round, real binary)', () => {
  let seeded = false;
  let seedFailureReason = '';
  let exportReady = false;
  let seededArticleId = '';

  before(async () => {
    ensureEvidenceDir();

    // 1. Main window.
    await waitForMainWindow();

    // 2. Land on a workstation route first so the editor store is active.
    await browser.execute(() => {
      if (!location.pathname.startsWith('/workstation')) {
        window.history.pushState({}, '', '/workstation');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });
    await browser.pause(1000);

    // 3. Seed a real draft via the live Pinia store.
    const seedResult = await seedDraftViaPinia(SEED_TITLE, SEED_MARKDOWN);
    if (!seedResult || !seedResult.ok) {
      seedFailureReason = (seedResult && seedResult.reason) || 'UNKNOWN seeding failure';
      // eslint-disable-next-line no-console
      console.warn(
        `[svg-render] Could not seed a draft via the live Pinia store: ${seedFailureReason}. ` +
        'The SVG-injection assertions need a loaded document; without one the export button ' +
        'stays disabled. Skipping the live-UI flagship assertions.',
      );
      return;
    }
    seeded = true;
    seededArticleId = seedResult.articleId;

    // 4. Reach the Stage export control with the seeded draft selected.
    const reach = await reachWorkstationExport(seedResult.articleId);
    if (!reach.ready) {
      seedFailureReason = reach.reason;
      // eslint-disable-next-line no-console
      console.warn(
        `[svg-render] Draft seeded (article ${seedResult.articleId}) but the Stage 全屏导出 ` +
        `button never enabled: ${reach.reason}. Skipping live-UI flagship assertions.`,
      );
      return;
    }
    exportReady = true;
  });

  it('seeds a real draft and enables the export pipeline (precondition)', function () {
    if (!seeded) {
      // eslint-disable-next-line no-console
      console.warn(`[svg-render] precondition skip — ${seedFailureReason}`);
      return this.skip();
    }
    expect(seeded, 'a real draft was seeded via the live Pinia article store').to.equal(true);
    if (!exportReady) {
      // eslint-disable-next-line no-console
      console.warn(`[svg-render] export-button skip — ${seedFailureReason}`);
      return this.skip();
    }
    expect(exportReady, '全屏导出 button is enabled (editor status ready)').to.equal(true);
  });

  it('uses the persisted Settings default export platform as the Workstation and ExportModal initial platform', async function () {
    if (!exportReady) {
      // eslint-disable-next-line no-console
      console.warn(`[svg-render] default export platform skip — ${seedFailureReason}`);
      return this.skip();
    }

    let originalPlatform = 'wechat';
    const setResult = await setDefaultExportPlatform('zhihu');
    expect(setResult.ok, setResult.reason || 'settings export.defaultPlatform write').to.equal(true);
    originalPlatform = setResult.original || originalPlatform;
    expect(setResult.current, 'settings store should persist the requested default platform').to.equal('zhihu');

    try {
      await closeExportModalIfOpen();
      await browser.execute(() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await browser.pause(500);

      const reach = await reachWorkstationExport(seededArticleId);
      expect(reach.ready, reach.reason || 'workstation export button should be ready after remount').to.equal(true);

      const stagePlatform = await getActiveStagePlatformLabel();
      expect(stagePlatform, 'Workstation Stage should initialize from settings.export.defaultPlatform').to.include('知乎');

      await openExportPanelOnly();
      const modalPlatform = await getActiveExportPlatformLabel();
      expect(modalPlatform, 'ExportModal should initialize from settings.export.defaultPlatform').to.include('知乎');
    } finally {
      await closeExportModalIfOpen();
      await setDefaultExportPlatform(originalPlatform);
      await browser.execute(() => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await browser.pause(300);
      await reachWorkstationExport(seededArticleId);
    }
  });

  it('applies Settings export-only custom CSS to the real WeChat export preview without runtime CustomCSS leakage', async function () {
    if (!exportReady) {
      // eslint-disable-next-line no-console
      console.warn(`[svg-render] export custom CSS skip — ${seedFailureReason}`);
      return this.skip();
    }

    const setResult = await setExportCustomCss('#nice p { color: #123456; letter-spacing: 1px; }');
    expect(setResult.ok, setResult.reason || 'settings export.customCss write').to.equal(true);
    const originalCss = setResult.original || '';

    try {
      await closeExportModalIfOpen();
      await openExportPanel('微信');

      await browser.waitUntil(
        async () =>
          browser.execute(() => {
            const para = Array.from(document.querySelectorAll('.export-panel .preview-render #nice p'))
              .find((p) => !p.closest('[data-ink-svg]'));
            if (!para) return false;
            const style = para.getAttribute('style') || '';
            return /(?:^|;)color:\s*#123456(?:;|$)/.test(style) &&
              /(?:^|;)letter-spacing:\s*1px(?:;|$)/.test(style);
          }),
        {
          timeout: 12_000,
          interval: 300,
          timeoutMsg: 'Settings export.customCss did not inline into the WeChat ExportModal preview paragraph',
        },
      );

      const probe = await browser.execute(() => {
        const para = Array.from(document.querySelectorAll('.export-panel .preview-render #nice p'))
          .find((p) => !p.closest('[data-ink-svg]'));
        const runtimeStyle = document.getElementById('inkforge-custom-css');
        return {
          style: para ? para.getAttribute('style') || '' : '',
          hasRuntimeCustomCss: Boolean(runtimeStyle),
          runtimeStyleContainsExportCss: Boolean(runtimeStyle && runtimeStyle.textContent && runtimeStyle.textContent.includes('#123456')),
        };
      });

      expect(probe.style, 'export preview paragraph carries inline export custom CSS').to.match(/(?:^|;)color:\s*#123456(?:;|$)/);
      expect(probe.style, 'export preview paragraph carries inline letter spacing').to.match(/(?:^|;)letter-spacing:\s*1px(?:;|$)/);
      expect(probe.runtimeStyleContainsExportCss, 'export custom CSS must not be injected into runtime editor CustomCSS style tag').to.equal(false);
    } finally {
      await closeExportModalIfOpen();
      await setExportCustomCss(originalCss);
    }
  });

  it('surfaces style capability gates for all platforms in the real ExportModal', async function () {
    if (!exportReady) {
      // eslint-disable-next-line no-console
      console.warn(`[svg-render] style capability gates skip — ${seedFailureReason}`);
      return this.skip();
    }

    await openExportPanel('微信');

    const wechat = await collectStyleCapabilityProbe();
    expect(wechat.summary, 'WeChat style capability summary').to.include('微信公众号 当前可用 8/17');
    expect(wechat.summary, 'WeChat acceptance audit summary').to.include('验收审计 不可宣称');
    expect(wechat.summary, 'WeChat execution runbook summary').to.include('执行手册 开放');
    expect(wechat.summary, 'WeChat committed release gate summary').to.include('canClaimComplete=false');
    expect(wechat.summary, 'WeChat committed release gate exposes exact-artifact conflicts')
      .to.include('fingerprintConflicts 0');
    expect(wechat.externalChecklistText, 'WeChat external proof checklist is visible')
      .to.include('外部证明清单 8 行');
    expect(wechat.externalChecklistText, 'external proof checklist keeps publish/sync success disabled')
      .to.include('当前不会启用发布、同步或平台成功宣称');
    expect(wechat.externalChecklistGroups, 'external proof checklist exposes four release blocker groups')
      .to.have.length(4);
    expect(wechat.localActionabilityText, 'WeChat local actionability summary is visible')
      .to.include('本地可行动 0');
    expect(wechat.localActionabilityText, 'WeChat local actionability exposes catalog-blocked rows')
      .to.include('目录阻断 11');
    expect(wechat.localActionabilityText, 'WeChat local actionability exposes safe local row count')
      .to.include('安全本地 11');
    expect(wechat.localActionabilityText, 'WeChat local actionability links back to current-round external checklist')
      .to.include('外部清单 8');
    expect(wechat.localActionabilityText, 'WeChat local actionability prevents false local completion claims')
      .to.include('不得把目录阻断或外部平台行当作本地补证完成');
    expect(wechat.localActionabilityGroups, 'local actionability exposes local/catalog groups')
      .to.have.length(2);
    expect(wechat.externalHandoffText, 'WeChat external proof handoff is visible')
      .to.include('外部交接 8 行');
    expect(wechat.externalHandoffText, 'external handoff exposes group count')
      .to.include('分组 4');
    expect(wechat.externalHandoffText, 'external handoff keeps safe external automation closed')
      .to.include('安全外部 0');
    expect(wechat.externalHandoffText, 'external handoff mirrors no local actionable rows')
      .to.include('本地可行动 0');
    expect(wechat.externalHandoffText, 'external handoff explains why it cannot be automated')
      .to.include('没有可本地自动化的安全外部证明行');
    expect(wechat.externalHandoffText, 'external handoff points to the next operator row')
      .to.include('下一步：');
    expect(wechat.externalHandoffText, 'external handoff prioritizes phone-side proof first')
      .to.include('；手机');
    expect(wechat.externalHandoffFlags, 'external handoff exposes five handoff flags')
      .to.have.length(5);
    expect(
      wechat.externalHandoffFlags.some((flag) =>
        flag.includes('手机') &&
        flag.includes('4') &&
        flag.includes('需要手机预览读回')),
      'external handoff exposes phone rows',
    ).to.equal(true);
    expect(
      wechat.externalHandoffFlags.some((flag) =>
        flag.includes('账号') &&
        flag.includes('4') &&
        flag.includes('需要真实账号环境')),
      'external handoff exposes current-round WeChat account rows',
    ).to.equal(true);
    expect(wechat.externalChecklistText, 'current-round WeChat checklist keeps public-host rows out of scope')
      .to.include('public host 0');
    expect(
      wechat.externalHandoffFlags.some((flag) =>
        flag.includes('人工') &&
        flag.includes('4') &&
        flag.includes('不得本地自动执行')),
      'external handoff exposes current-round unsafe WeChat rows',
    ).to.equal(true);
    expect(
      wechat.externalHandoffFlags.some((flag) =>
        flag.includes('平台变更') &&
        flag.includes('4') &&
        flag.includes('涉及同步或发布')),
      'external handoff exposes current-round mutating WeChat rows',
    ).to.equal(true);
    expect(
      wechat.localActionabilityGroups.some((group) =>
        group.includes('本地可做') &&
        group.includes('0') &&
        group.includes('当前没有可直接本地补证行')),
      'local actionability marks there is no direct local proof task',
    ).to.equal(true);
    expect(
      wechat.localActionabilityGroups.some((group) =>
        group.includes('目录阻断') &&
        group.includes('11') &&
        group.includes('微信公众号') &&
        group.includes('目录来源')),
      'local actionability keeps catalog-blocked rows separate from actionable local work',
    ).to.equal(true);
    expect(
      wechat.externalChecklistGroups.some((group) =>
        group.includes('手机预览') &&
        group.includes('4') &&
        group.includes('外部阻断') &&
        group.includes('封面缩略图 1') &&
        group.includes('暗黑模式 1')),
      'external proof checklist exposes phone preview rows',
    ).to.equal(true);
    expect(
      wechat.externalChecklistGroups.some((group) =>
        group.includes('外部依赖') &&
        group.includes('4') &&
        group.includes('微信公众号 4') &&
        !group.includes('小红书') &&
        !group.includes('知乎')),
      'external proof checklist exposes only current-round WeChat external dependency rows',
    ).to.equal(true);
    expect(
      wechat.externalChecklistGroups.some((group) =>
        group.includes('需人工') &&
        group.includes('4') &&
        group.includes('发布/平台预览 1') &&
        group.includes('授权通道响应 1')),
      'external proof checklist exposes current-round unsafe-to-automate WeChat rows',
    ).to.equal(true);
    expect(
      wechat.externalChecklistGroups.some((group) =>
        group.includes('平台变更') &&
        group.includes('4') &&
        group.includes('发布/平台预览 1') &&
        group.includes('授权通道响应 1')),
      'external proof checklist exposes current-round mutating WeChat rows',
    ).to.equal(true);
    expect(wechat.cardCount, 'WeChat choice card count').to.equal(17);
    expect(wechat.availableCount, 'WeChat available choice count').to.equal(8);
    expect(wechat.blockedCount, 'WeChat blocked choice count').to.equal(5);
    expect(wechat.unavailableCount, 'WeChat unavailable choice count').to.equal(4);
    expect(wechat.marketSummaries, 'WeChat shows exactly one market capability summary')
      .to.have.length(1);
    expect(wechat.marketSummaries[0], 'WeChat market capability summary mirrors runtime catalog')
      .to.include('市场能力：21；降级 3；待证明 16；外部交接 2');
    expect(wechat.marketChipLabels, 'WeChat market matrix exposes five visible market chips')
      .to.have.length(5);
    expect(wechat.marketChipLabels, 'WeChat market chips expose learned SVG/H5 families')
      .to.include.members([
        '背景 SVG · 静态 · 待证明',
        '图集轮播 · 滑动 · 待证明',
        '点击展开 · 点击 · 待证明',
      ]);
    expect(wechat.marketOverflowCount, 'WeChat market capability rows wrap inside style cards')
      .to.equal(0);
    expect(wechat.preflightText, 'WeChat preflight row mirrors catalog stats')
      .to.include('样式能力目录可用 8/17；受限 5；不可用 4');
    expect(wechat.acceptancePreflightText, 'WeChat preflight exposes cannot-claim audit')
      .to.include('验收宣称审计不可宣称');
    expect(wechat.acceptancePreflightText, 'WeChat preflight exposes execution runbook totals')
      .to.include('执行手册开放');
    expect(wechat.acceptancePreflightText, 'WeChat preflight points phone-preview next action')
      .to.include('手机：手机预览');
    expect(wechat.releaseGatePreflightText, 'WeChat preflight blocks committed release claims')
      .to.include('canClaimComplete=false');
    expect(wechat.releaseGatePreflightText, 'WeChat preflight exposes committed fingerprint conflicts')
      .to.include('fingerprintConflicts 0');
    expect(wechat.releaseGatePreflightText, 'WeChat preflight embeds local actionability summary')
      .to.include('本地可行动 0');
    expect(wechat.releaseGatePreflightText, 'WeChat preflight exposes release operator next actions')
      .to.include('operatorNext');
    expect(wechat.releaseGatePreflightText, 'WeChat preflight points remaining proof collection')
      .to.include('不得声明手机预览、同步、发布或 public host 已完成');
    expect(
      wechat.cards.some((card) =>
        card.text.includes('验收审计：不可宣称') &&
        /验收审计：不可宣称[^]*；手机 [1-9]/.test(card.text) &&
        card.text.includes('手机预览')),
      'WeChat cards expose phone-preview cannot-claim counts and gates',
    ).to.equal(true);
    expect(
      wechat.cards.some((card) =>
        card.text.includes('执行手册：开放') &&
        card.text.includes('字段 phonePreviewContentVerified')),
      'WeChat cards expose execution runbook field contracts without claiming phone proof',
    ).to.equal(true);
    const amberCapabilityCard = wechat.cards.find((card) =>
      card.text.includes('Amber business flagship'));
    expect(
      amberCapabilityCard,
      'Amber capability card is present in the WeChat style catalog',
    ).to.exist;
    expect(
      amberCapabilityCard.className,
      'Amber remains UI-blocked until pc-editor-paste evidence is present',
    ).to.include('style-choice-blocked');
    expect(
      amberCapabilityCard.text,
      'Amber blocked card exposes the default evidence floor',
    ).to.include('需 PC 编辑器');
    expect(
      amberCapabilityCard.text,
      'Amber blocked card still exposes phone/publish blockers',
    ).to.include('手机预览证明缺失');
    expect(
      amberCapabilityCard.text,
      'Amber blocked card still exposes publish blockers',
    ).to.include('平台预览或发布证明缺失');
    expect(
      wechat.cards.some((card) =>
        card.className.includes('style-choice-blocked') &&
        card.text.includes('Mobile-only SVG effect candidate') &&
        card.text.includes('微信手机端前后对照证据缺失')),
      'mobile-only SVG effects stay blocked until phone WeChat evidence exists',
    ).to.equal(true);
    expect(
      wechat.cards.some((card) =>
        card.className.includes('style-choice-blocked') &&
        card.text.includes('Market SVG/H5 fallback matrix') &&
        card.text.includes('135/秀米 SVG 与 H5 规则必须重写')),
      'market SVG/H5 fallback matrix stays blocked until InkForge-owned fallback proof exists',
    ).to.equal(true);
    const marketMatrixCard = wechat.cards.find((card) =>
      card.text.includes('Market SVG/H5 fallback matrix'));
    expect(
      marketMatrixCard,
      'WeChat market matrix card is present in the style catalog',
    ).to.exist;
    expect(
      marketMatrixCard.disabled,
      'WeChat market matrix is selectable as a current-round safe fallback application',
    ).to.equal(false);
    expect(
      wechat.cards.some((card) =>
        card.className.includes('style-choice-unavailable') &&
        card.text.includes('Plugin transfer channel checklist')),
      'plugin transfer stays unavailable without channel-specific proof',
    ).to.equal(true);

    const applicationProbe = await browser.executeAsync((done) => {
      const finish = () => {
        const cardsAfter = Array.from(document.querySelectorAll('.export-panel .style-choice-card'));
        const kilnAfter = cardsAfter.find((card) => (card.textContent || '').includes('Kiln creative flagship'));
        const amberAfter = cardsAfter.find((card) => (card.textContent || '').includes('Amber business flagship'));
        const toolbarAfter = cardsAfter.find((card) => (card.textContent || '').includes('Toolbar typography parameter map'));
        const activePreset = Array.from(document.querySelectorAll('.export-panel .preset-card'))
          .find((card) => card.classList.contains('active'));
        const preflight = Array.from(document.querySelectorAll('.export-panel [class*="preflight"]'))
          .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
          .find((text) => text.includes('样式能力目录')) || '';

        done({
          kilnDisabled: Boolean(kilnAfter?.disabled),
          kilnPressed: kilnAfter?.getAttribute('aria-pressed') || '',
          amberDisabled: Boolean(amberAfter?.disabled),
          toolbarDisabled: Boolean(toolbarAfter?.disabled),
          activePresetText: (activePreset?.textContent || '').trim().replace(/\s+/g, ' '),
          preflight,
        });
      };

      const cards = Array.from(document.querySelectorAll('.export-panel .style-choice-card'));
      const kiln = cards.find((card) => (card.textContent || '').includes('Kiln creative flagship'));
      if (kiln && !kiln.disabled) kiln.click();
      window.setTimeout(finish, 350);
    });
    expect(applicationProbe.kilnDisabled, 'Kiln style is selectable because it maps to a real preset').to.equal(false);
    expect(applicationProbe.kilnPressed, 'Kiln style exposes selected state after click').to.equal('true');
    expect(applicationProbe.amberDisabled, 'Amber is selectable as a preset-backed current-round style').to.equal(false);
    expect(applicationProbe.toolbarDisabled, 'Toolbar parameter map is selectable as a current-round preset-backed style').to.equal(false);
    expect(applicationProbe.activePresetText, 'style click selects the real Kiln preset').to.include('赤陶旗舰');
    expect(applicationProbe.preflight, 'preflight names the selected style and real preset')
      .to.include('已选择 Kiln creative flagship → 赤陶旗舰（flagship-kiln）');

    await selectExportPlatform('小红书');
    const xhs = await collectStyleCapabilityProbe();
    expect(xhs.summary, 'XHS style capability summary').to.include('小红书 当前可用 7/8');
    expect(xhs.summary, 'XHS acceptance audit summary').to.include('验收审计 不可宣称');
    expect(xhs.summary, 'XHS execution runbook summary').to.include('执行手册 开放');
    expect(xhs.cardCount, 'XHS choice card count').to.equal(8);
    expect(xhs.availableCount, 'XHS available choice count').to.equal(7);
    expect(xhs.blockedCount, 'XHS blocked choice count').to.equal(0);
    expect(xhs.unavailableCount, 'XHS unavailable choice count').to.equal(1);
    expect(xhs.marketSummaries, 'XHS shows exactly one market capability summary')
      .to.have.length(1);
    expect(xhs.marketSummaries[0], 'XHS market fallback summary mirrors runtime catalog')
      .to.include('市场能力：3；自有 1；降级 2');
    expect(xhs.marketChipLabels, 'XHS market fallback exposes all local fallback chips')
      .to.include.members([
        '标题卡片 · 静态 · 自有',
        '图集轮播 · 静态 · 降级',
        '静态栅格 · 静态 · 降级',
      ]);
    expect(xhs.marketOverflowCount, 'XHS market capability rows wrap inside style cards')
      .to.equal(0);
    expect(xhs.preflightText, 'XHS preflight row mirrors catalog stats')
      .to.include('样式能力目录可用 7/8；受限 0；不可用 1');
    expect(xhs.acceptancePreflightText, 'XHS preflight exposes cannot-claim audit')
      .to.include('验收宣称审计不可宣称');
    expect(xhs.acceptancePreflightText, 'XHS preflight exposes execution runbook totals')
      .to.include('执行手册开放');
    expect(
      xhs.cards.some((card) =>
        card.text.includes('执行手册：开放') &&
        /字段 [A-Za-z]/.test(card.text)),
      'XHS cards expose execution runbook artifact field contracts',
    ).to.equal(true);
    expect(
      xhs.cards.some((card) =>
        card.className.includes('style-choice-available') &&
        !card.disabled &&
        card.text.includes('Long report image artifact')),
      'XHS long-image report is locally available and visible as a preset-backed action',
    ).to.equal(true);
    expect(
      xhs.cards.some((card) =>
        card.className.includes('style-choice-available') &&
        !card.disabled &&
        card.text.includes('Data and table image card')),
      'XHS data-card choice is selectable after mapping to a real preset',
    ).to.equal(true);
    expect(
      xhs.cards.some((card) =>
        card.className.includes('style-choice-unavailable') &&
        card.text.includes('H5 and design import boundary')),
      'XHS H5/design routes remain separate artifact-family checklists',
    ).to.equal(true);
    expect(
      xhs.cards.some((card) =>
        card.className.includes('style-choice-available') &&
        !card.disabled &&
        card.text.includes('Market rich card image fallback')),
      'XHS market rich card fallback is locally available and mapped to a real preset-backed action',
    ).to.equal(true);
    expect(
      xhs.cards.some((card) =>
        !card.disabled &&
        card.className.includes('style-choice-available') &&
        card.text.includes('Market rich card image fallback') &&
        card.text.includes('市场能力：3；自有 1；降级 2') &&
        card.text.includes('标题卡片 · 静态 · 自有')),
      'XHS market fallback surfaces market metadata while staying mapped to the real preset action',
    ).to.equal(true);

    const xhsApplicationProbe = await browser.executeAsync((done) => {
      const clickChoice = (label) => {
        const card = Array.from(document.querySelectorAll('.export-panel .style-choice-card'))
          .find((item) => (item.textContent || '').includes(label));
        if (card && !card.disabled) card.click();
      };
      const read = () => {
        const cardsAfter = Array.from(document.querySelectorAll('.export-panel .style-choice-card'));
        const dataAfter = cardsAfter.find((card) => (card.textContent || '').includes('Data and table image card'));
        const longAfter = cardsAfter.find((card) => (card.textContent || '').includes('Long report image artifact'));
        const marketAfter = cardsAfter.find((card) => (card.textContent || '').includes('Market rich card image fallback'));
        const activePreset = Array.from(document.querySelectorAll('.export-panel .preset-card'))
          .find((card) => card.classList.contains('active'));
        const preflight = Array.from(document.querySelectorAll('.export-panel [class*="preflight"]'))
          .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
          .find((text) => text.includes('样式能力目录')) || '';

        done({
          dataDisabled: Boolean(dataAfter?.disabled),
          longDisabled: Boolean(longAfter?.disabled),
          marketDisabled: Boolean(marketAfter?.disabled),
          dataPressed: dataAfter?.getAttribute('aria-pressed') || '',
          longPressed: longAfter?.getAttribute('aria-pressed') || '',
          marketPressed: marketAfter?.getAttribute('aria-pressed') || '',
          activePresetText: (activePreset?.textContent || '').trim().replace(/\s+/g, ' '),
          preflight,
        });
      };

      clickChoice('Data and table image card');
      window.setTimeout(() => {
        clickChoice('Long report image artifact');
        window.setTimeout(() => {
          clickChoice('Market rich card image fallback');
          window.setTimeout(read, 350);
        }, 250);
      }, 250);
    });
    expect(xhsApplicationProbe.dataDisabled, 'XHS data-card style is selectable').to.equal(false);
    expect(xhsApplicationProbe.longDisabled, 'XHS long-report style is selectable').to.equal(false);
    expect(xhsApplicationProbe.marketDisabled, 'XHS market fallback style is selectable').to.equal(false);
    expect(xhsApplicationProbe.marketPressed, 'last clicked XHS mapped style exposes selected state').to.equal('true');
    expect(xhsApplicationProbe.dataPressed, 'previous XHS mapped style is no longer selected').to.equal('false');
    expect(xhsApplicationProbe.longPressed, 'previous XHS mapped style is no longer selected').to.equal('false');
    expect(xhsApplicationProbe.activePresetText, 'XHS mapped style click selects the real Nature preset')
      .to.include('自然清新');
    expect(xhsApplicationProbe.preflight, 'XHS preflight names the selected style and real preset')
      .to.include('已选择 Market rich card image fallback → 自然清新（xhs-nature）');

    await selectExportPlatform('知乎');
    const zhihu = await collectStyleCapabilityProbe();
    expect(zhihu.summary, 'Zhihu style capability summary').to.include('知乎 当前可用 4/8');
    expect(zhihu.summary, 'Zhihu acceptance audit summary').to.include('验收审计 不可宣称');
    expect(zhihu.summary, 'Zhihu execution runbook summary').to.include('执行手册 开放');
    expect(zhihu.cardCount, 'Zhihu choice card count').to.equal(8);
    expect(zhihu.availableCount, 'Zhihu available choice count').to.equal(4);
    expect(zhihu.blockedCount, 'Zhihu blocked choice count').to.equal(3);
    expect(zhihu.unavailableCount, 'Zhihu unavailable choice count').to.equal(1);
    expect(zhihu.marketSummaries, 'Zhihu shows exactly one market capability summary')
      .to.have.length(1);
    expect(zhihu.marketSummaries[0], 'Zhihu market fallback summary mirrors runtime catalog')
      .to.include('市场能力：3；降级 2；待证明 1');
    expect(zhihu.marketChipLabels, 'Zhihu market fallback exposes public-host fallback chips')
      .to.include.members([
        '标题卡片 · 静态 · 降级',
        '公网图片 · 公网 · 待证明',
        '静态栅格 · 静态 · 降级',
      ]);
    expect(zhihu.marketOverflowCount, 'Zhihu market capability rows wrap inside style cards')
      .to.equal(0);
    expect(zhihu.preflightText, 'Zhihu preflight row mirrors catalog stats')
      .to.include('样式能力目录可用 4/8；受限 3；不可用 1');
    expect(zhihu.acceptancePreflightText, 'Zhihu preflight exposes cannot-claim audit')
      .to.include('验收宣称审计不可宣称');
    expect(zhihu.acceptancePreflightText, 'Zhihu preflight exposes execution runbook totals')
      .to.include('执行手册开放');
    expect(
      zhihu.cards.some((card) =>
        card.text.includes('执行手册：开放') &&
        /字段 [A-Za-z]/.test(card.text)),
      'Zhihu cards expose execution runbook artifact field contracts',
    ).to.equal(true);
    expect(
      zhihu.cards.some((card) =>
        card.className.includes('style-choice-blocked') &&
        card.text.includes('Diagram and formula image fallback')),
      'Zhihu image fallback remains blocked without public image-host proof',
    ).to.equal(true);
    expect(
      zhihu.cards.some((card) =>
        card.className.includes('style-choice-unavailable') &&
        card.text.includes('Public image upload checklist')),
      'Zhihu public image upload remains credentialed before publishability',
    ).to.equal(true);
    expect(
      zhihu.cards.some((card) =>
        card.className.includes('style-choice-blocked') &&
        card.text.includes('Market rich layout image fallback')),
      'Zhihu market rich layout fallback remains blocked until public-host proof exists',
    ).to.equal(true);
    expect(
      zhihu.cards.some((card) =>
        card.disabled &&
        card.className.includes('style-choice-blocked') &&
        card.text.includes('Market rich layout image fallback') &&
        card.text.includes('市场能力：3；降级 2；待证明 1') &&
        card.text.includes('公网图片 · 公网 · 待证明')),
      'Zhihu market fallback surfaces market metadata without bypassing public-host proof',
    ).to.equal(true);

    await closeExportModal();
  });

  // MULTI-ROUND: loop the 3 flagship presets. Each round HARD-asserts injected
  // responsive [data-ink-svg] modules + saves an evidence screenshot.
  for (const flagship of FLAGSHIP_PRESETS) {
    it(`${flagship.id} (${flagship.name}) injects responsive [data-ink-svg] modules into the export preview`, async function () {
      if (!exportReady) {
        // eslint-disable-next-line no-console
        console.warn(`[svg-render] ${flagship.id} skip — ${seedFailureReason}`);
        return this.skip();
      }

      await openFlagshipExportPreview(flagship.name);

      const probe = await browser.execute(() => {
        const render = document.querySelector('.export-panel .preview-render');
        const sections = Array.from(render.querySelectorAll('[data-ink-svg]'));
        const modules = sections.map((sec) => {
          const svg = sec.querySelector('svg');
          const secBox = sec.getBoundingClientRect();
          const svgBox = svg ? svg.getBoundingClientRect() : null;
          const parentBox = svg && svg.parentElement
            ? svg.parentElement.getBoundingClientRect()
            : null;
          return {
            moduleId: sec.getAttribute('data-ink-svg'),
            hasSvg: !!svg,
            viewBox: svg ? (svg.getAttribute('viewBox') || svg.getAttribute('viewbox')) : null,
            secW: secBox ? Math.round(secBox.width) : 0,
            svgW: svgBox ? Math.round(svgBox.width) : 0,
            svgH: svgBox ? Math.round(svgBox.height) : 0,
            parentW: parentBox ? Math.round(parentBox.width) : 0,
            // delta between the svg width and its container (parent) width
            deltaToParent:
              svgBox && parentBox
                ? Math.abs(svgBox.width - parentBox.width)
                : Number.POSITIVE_INFINITY,
          };
        });
        return { count: sections.length, modules };
      });

      // AC: at least one SVG module injected.
      expect(probe.count, `at least one [data-ink-svg] module in ${flagship.id} export preview`).to.be.at.least(1);

      for (const mod of probe.modules) {
        // Each [data-ink-svg] section contains an <svg> with a viewBox attr.
        expect(mod.hasSvg, `module ${mod.moduleId} contains an <svg>`).to.equal(true);
        expect(mod.viewBox, `module ${mod.moduleId} <svg> has a viewBox`).to.be.a('string');
        expect(mod.viewBox, `module ${mod.moduleId} viewBox is "0 0 W H"`).to.match(
          /^[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+$/,
        );
        // Responsive width:100% — the svg fills its parent within ~3px.
        expect(
          mod.deltaToParent,
          `module ${mod.moduleId} <svg> width tracks its container (width:100%): ` +
            `svgW=${mod.svgW}px parentW=${mod.parentW}px`,
        ).to.be.below(3);
        // Sanity: a painted svg has non-zero width + height (catches WebView2 0×0 culling).
        expect(mod.svgW, `module ${mod.moduleId} <svg> painted width > 0`).to.be.above(0);
        expect(mod.svgH, `module ${mod.moduleId} <svg> painted height > 0`).to.be.above(0);
      }

      // Evidence screenshot for this round.
      try {
        await browser.saveScreenshot(path.join(EVIDENCE_DIR, `${flagship.id}.png`));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[svg-render] screenshot for ${flagship.id} failed: ${err && err.message ? err.message : err}`);
      }

      // eslint-disable-next-line no-console
      console.log(
        `[svg-render] ${flagship.id}: ${probe.count} [data-ink-svg] modules; ` +
        `sample bbox ${JSON.stringify(probe.modules[0])}`,
      );

      await closeExportModal();
      await browser.pause(400);
    });
  }

  it('flagship body yields a mobile-comfortable ~20–22 CJK chars/line (real layout, ship font)', async function () {
    if (!exportReady) {
      // eslint-disable-next-line no-console
      console.warn(`[svg-render] chars/line skip — ${seedFailureReason}`);
      return this.skip();
    }
    await openFlagshipExportPreview('铜绿旗舰');

    // WHY a mobile-emulated probe instead of dividing the preview column by its
    // font-size: the ExportModal preview is a *desktop* ~400px column rendered
    // with a smaller *preview-only* font (≈15px) and WITHOUT the 22em clamp
    // (`min(22em, calc(...))` carries calc(), which the WeChat-compliance pass
    // strips — mobile WeChat instead constrains the body to the phone width).
    // So the preview column is NOT a faithful chars/line oracle. The shipped
    // guarantee is: #nice font-size:17px (generatePersonaBaseCSS lock) inside a
    // mobile body column (~360px = a ~375px phone minus WeChat body padding).
    // We reproduce THAT here with real glyph layout (catches glyph-advance /
    // letter-spacing regressions like a stray U+202F injected into CJK runs).
    const layout = await browser.execute(() => {
      const render = document.querySelector('.export-panel .preview-render');

      // Longest body <p> NOT inside an injected SVG module (decorative).
      const paras = Array.from(render.querySelectorAll('p'))
        .filter((p) => !p.closest('[data-ink-svg]'));
      let best = null;
      for (const p of paras) {
        const text = (p.textContent || '').trim();
        if (!text) continue;
        if (!best || text.length > best.text.length) best = { text, el: p };
      }

      const niceEl =
        best?.el.closest('#nice') ||
        Array.from(render.querySelectorAll('#nice, section[id="nice"]')).find(
          (el) => !el.closest('[data-ink-svg]'),
        ) ||
        render;
      const niceBox = niceEl.getBoundingClientRect();

      const SHIP_FONT_PX = 17; // generatePersonaBaseCSS #nice font-size lock
      const MOBILE_COL_PX = 360; // ~375px phone − WeChat body padding
      const LINE_HEIGHT = 1.75; // academic persona (铜绿/tempera)
      let charsPerLine = null;
      let lineCount = null;
      let sampleChars = null;
      if (best) {
        const cs = getComputedStyle(best.el);
        const probe = document.createElement('div');
        probe.style.position = 'absolute';
        probe.style.left = '-99999px';
        probe.style.top = '0';
        probe.style.visibility = 'hidden';
        probe.style.width = MOBILE_COL_PX + 'px';
        probe.style.fontSize = SHIP_FONT_PX + 'px';
        probe.style.lineHeight = String(LINE_HEIGHT);
        probe.style.whiteSpace = 'normal';
        probe.style.wordBreak = 'break-word';
        probe.style.lineBreak = 'strict';
        // Inherit the real body font stack + kerning so CJK glyph advance is
        // faithful to what ships (font substitution differs per machine).
        probe.style.fontFamily = cs.fontFamily;
        probe.style.fontFeatureSettings = cs.fontFeatureSettings;
        probe.textContent = best.text;
        render.appendChild(probe);
        const lineHeightPx = SHIP_FONT_PX * LINE_HEIGHT;
        lineCount = Math.max(1, Math.round(probe.scrollHeight / lineHeightPx));
        sampleChars = best.text.length;
        charsPerLine = Math.round(sampleChars / lineCount);
        render.removeChild(probe);
      }
      return {
        niceWidth: Math.round(niceBox.width),
        hadPara: !!best,
        charsPerLine,
        lineCount,
        sampleChars,
      };
    });

    // A real body paragraph must exist to measure; else the seed contract broke.
    expect(layout.hadPara, 'a representative body <p> exists to measure chars/line').to.equal(true);

    // Sanity: the preview body column is bounded (catches runaway full-bleed width).
    expect(
      layout.niceWidth,
      `#nice body column width bounded (px): ${layout.niceWidth}`,
    ).to.be.within(280, 760);

    // The shipped guarantee: ~20–22 CJK chars/line on a mobile column at 17px.
    // Band 18–24 absorbs cross-machine glyph-advance variance while still failing
    // on a gross regression (e.g. injected thin-spaces or a broken width lock).
    expect(
      layout.charsPerLine,
      `mobile-emulated CJK chars/line @${360}px/17px (target 20–22; band 18–24): ` +
        `lines=${layout.lineCount} chars=${layout.sampleChars}`,
    ).to.be.within(18, 24);

    // eslint-disable-next-line no-console
    console.log(
      `[svg-render] chars/line (mobile-emulated): ${layout.charsPerLine} ` +
        `(${layout.sampleChars} chars over ${layout.lineCount} lines @360px/17px)`,
    );

    await closeExportModal();
  });
});
