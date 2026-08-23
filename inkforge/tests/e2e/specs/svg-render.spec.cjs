/**
 * svg-render.spec.cjs — verifies the WeChat-safe inline-SVG flagship typesetting
 * (PR1–PR6 of the 06-01 multiplatform-render-svg task) against the REAL Tauri
 * WebView2 binary, driven by tauri-driver + msedgedriver (NOT a vite browser).
 *
 * This is a MEANINGFUL multi-round verification: it SEEDS a real draft, opens
 * the real ExportModal, loops the 3 flagship presets, and HARD-asserts that each
 * injects responsive [data-ink-svg] modules. Main-window, draft-seeding, and
 * Stage-readiness preconditions are HARD failures: an unavailable real product
 * chain must never be reported as a green skipped acceptance run.
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
 *   If the Pinia bridge cannot be reached (future Vue/Pinia internals drift), the
 *   suite fails in `before` with the precise reason rather than silently passing.
 *
 * ─── ARCHITECTURE FACTS THIS SPEC RELIES ON (verified against source) ───────
 *   • The [data-ink-svg] modules are injected by `preset.decorate`
 *     (= composeSvgDecorate). The final export pipeline invokes it from
 *     markdownToWechatWithStats, while `usePreviewRenderer` invokes the same
 *     decorator with target `preview` for the Workstation Stage/split/full
 *     surfaces. This spec therefore verifies both the Stage canvas and the
 *     ExportModal artifact preview.
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
 *         #nice { max-width: min(24em, calc(100vw - 16px)); font-size:16px; }
 *     so the 375px mobile canvas retains about 22–24 CJK chars/line without
 *     horizontal clipping.
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
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Flagship presets (themes.ts). We click the card by its visible name text and
// collect results keyed by the documented preset id for the evidence report.
const FLAGSHIP_PRESETS = [
  { id: 'flagship-kiln', name: '赤陶旗舰' },
  { id: 'flagship-tempera', name: '铜绿旗舰' },
  { id: 'flagship-amber', name: '黄铜旗舰' },
];
const RUNTIME_CUSTOM_CSS_PARAGRAPH_SCOPE = '.editor-content.editor-content.editor-content.editor-content p, .tiptap-content.tiptap-content.tiptap-content.tiptap-content .ProseMirror.ProseMirror.ProseMirror.ProseMirror p';

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
  '每行二十二到二十四个汉字的移动端可读性铁律，不破坏任何既有渲染行为。',
  '',
  '## 章节标题触发标题头模块',
  '',
  '正文继续展开，混排英文 The quick brown fox 与中文段落，验证字体对在真实',
  'WebView2 内的协同表现，同时让分隔线与徽章模块拥有足够的上下文环境。',
  '',
  '### 三级标题触发竖线标题头',
  '',
  '这一段是较长的中文正文，用于测量每行折行后的汉字数量是否落在二十到',
  '二十四字的舒适区间，从而确认行宽锁在旗舰预设下依旧生效且未被破坏。',
  '',
  '---',
  '',
  '> “真实渲染、真实跑通、零模拟。” —— 墨铸团队',
  '',
  '<StatBlock version="1" label="验收覆盖率" value="100%" description="真实桌面链路" source="InkForge 本轮验收" />',
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

async function waitForRouteSettled() {
  await browser.waitUntil(
    async () => browser.execute(() => {
      const shells = Array.from(document.querySelectorAll('.app-route-shell'));
      const visibleShell = shells.find((shell) => shell.offsetParent !== null);
      if (!visibleShell) return false;

      const transitionClassNames = [
        'view-fade-enter-active',
        'view-fade-enter-from',
        'view-fade-leave-active',
        'view-fade-leave-to',
      ];
      const transitioning = shells.some((shell) =>
        transitionClassNames.some((className) => shell.classList.contains(className)));
      const opacity = Number.parseFloat(getComputedStyle(visibleShell).opacity || '1');

      return !transitioning && Number.isFinite(opacity) && opacity >= 0.99;
    }),
    {
      timeout: 8_000,
      interval: 100,
      timeoutMsg: 'route transition did not settle on one fully visible shell',
    },
  );
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

  await browser.waitUntil(
    async () => browser.execute((name) => {
      const activePill = Array.from(document.querySelectorAll('.export-panel .pill-btn.active'))
        .some((pill) => (pill.textContent || '').includes('微信'));
      const card = Array.from(document.querySelectorAll('.export-panel .preset-card'))
        .find((candidate) => (candidate.textContent || '').includes(name));
      return activePill && Boolean(card?.offsetParent);
    }, flagshipName),
    {
      timeout: 12_000,
      interval: 200,
      timeoutMsg: `WeChat preset grid never stabilized for "${flagshipName}"`,
    },
  );

  const presetCards = await browser.$$('.export-panel .preset-card');
  let targetPreset = null;
  for (const card of presetCards) {
    if ((await card.getText()).includes(flagshipName)) {
      targetPreset = card;
      break;
    }
  }
  expect(
    Boolean(targetPreset),
    `flagship preset card "${flagshipName}" must exist in the WeChat preset grid`,
  ).to.equal(true);
  await targetPreset.scrollIntoView({ block: 'center', inline: 'nearest' });
  await targetPreset.waitForClickable({ timeout: 5_000 });
  await targetPreset.click();

  // The render watcher is async (markdownToWechatWithStats). A reopened modal can
  // briefly retain the previous preset's SVG DOM, so wait for the requested card
  // and a laid-out body column instead of accepting any stale SVG sentinel.
  await browser.waitUntil(
    async () =>
      browser.execute((name) => {
        const render = document.querySelector('.export-panel .preview-render');
        if (!render) return false;
        const activeCard = Array.from(document.querySelectorAll('.export-panel .preset-card.active'))
          .some((card) => (card.textContent || '').includes(name));
        const body = render.querySelector('#nice, section[id="nice"]');
        return activeCard &&
          render.querySelectorAll('[data-ink-svg]').length > 0 &&
          (body?.getBoundingClientRect().width || 0) >= 280;
      }, flagshipName),
    {
      timeout: 20_000,
      interval: 500,
      timeoutMsg: `flagship preview never injected [data-ink-svg] for "${flagshipName}"`,
    },
  );
}

async function openExportPanel(platformLabel = '微信') {
  await openExportPanelOnly();
  await selectExportPlatform(platformLabel);
}

async function openExportPanelOnly() {
  await waitForRouteSettled();
  const collapsedBar = await browser.$('.panel-stage .stage-collapsed-bar');
  if (await collapsedBar.isExisting() && await collapsedBar.isDisplayed()) {
    await collapsedBar.waitForClickable({ timeout: 5_000 });
    await collapsedBar.click();
  }
  const exportButton = await browser.$('//aside[contains(@class,"panel-stage")]//button[normalize-space(.)="全屏导出"]');
  await exportButton.scrollIntoView({ block: 'center', inline: 'nearest' });
  await exportButton.waitForClickable({ timeout: 8_000 });
  await exportButton.click();

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
  await browser.execute(() => {
    const controlScroll = document.querySelector('.export-panel .control-scroll');
    if (controlScroll) controlScroll.scrollTop = 0;
  });
  const pills = await browser.$$('.export-panel .pill-btn');
  let target = null;
  for (const pill of pills) {
    if ((await pill.getText()).includes(platformLabel)) {
      target = pill;
      break;
    }
  }
  expect(Boolean(target), `platform pill "${platformLabel}" should exist in ExportModal`).to.equal(true);
  await target.scrollIntoView({ block: 'center', inline: 'nearest' });
  if (!(await target.getAttribute('class')).includes('active')) {
    await target.waitForClickable({ timeout: 5_000 });
    await target.click();
  }
  await browser.waitUntil(
    async () => (await target.getAttribute('class')).includes('active'),
    {
      timeout: 8_000,
      interval: 100,
      timeoutMsg: `platform pill "${platformLabel}" did not become active`,
    },
  );
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

async function clickStyleCapabilityChoice(choiceId) {
  const drawerSelector = '.export-panel details.style-diagnostics-drawer';
  const drawerOpen = await browser.execute(
    (selector) => document.querySelector(selector)?.hasAttribute('open') === true,
    drawerSelector,
  );
  if (!drawerOpen) {
    const summary = await browser.$(`${drawerSelector} > summary`);
    await summary.scrollIntoView({ block: 'center', inline: 'nearest' });
    await summary.waitForClickable({ timeout: 5_000 });
    await summary.click();
    await browser.waitUntil(
      async () => browser.execute(
        (selector) => document.querySelector(selector)?.hasAttribute('open') === true,
        drawerSelector,
      ),
      {
        timeout: 5_000,
        interval: 100,
        timeoutMsg: 'Style diagnostics drawer did not open after the real summary click',
      },
    );
  }

  const selector = `.export-panel [data-style-choice-id="${choiceId}"]`;
  const button = await browser.$(selector);
  await browser.execute((targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (!target || target.tagName !== 'BUTTON') return;
    const scrollOwner = target.closest('.control-scroll');
    if (scrollOwner) {
      const targetRect = target.getBoundingClientRect();
      const ownerRect = scrollOwner.getBoundingClientRect();
      scrollOwner.scrollTop += targetRect.top -
        ownerRect.top -
        Math.max(0, (ownerRect.height - targetRect.height) / 2);
      return;
    }
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  }, selector);
  await browser.waitUntil(
    async () => browser.execute((targetSelector) => {
      const target = document.querySelector(targetSelector);
      if (!target || target.tagName !== 'BUTTON' || target.disabled) return false;
      const rect = target.getBoundingClientRect();
      const pointX = rect.left + rect.width / 2;
      const pointY = rect.top + rect.height / 2;
      return pointX >= 0 &&
        pointX < window.innerWidth &&
        pointY >= 0 &&
        pointY < window.innerHeight &&
        document.elementFromPoint(pointX, pointY)?.closest('[data-style-choice-id]') === target;
    }, selector),
    {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: `Style capability button ${choiceId} did not enter the visible modal viewport`,
    },
  );
  await button.waitForClickable({ timeout: 5_000 });
  await button.click();
  await browser.waitUntil(
    async () => browser.execute(
      (targetSelector) =>
        document.querySelector(targetSelector)?.getAttribute('aria-pressed') === 'true',
      selector,
    ),
    {
      timeout: 12_000,
      interval: 100,
      timeoutMsg: `Style capability button ${choiceId} did not become selected`,
    },
  );
}

async function closeExportModal() {
  const close = await browser.$('.export-panel .header-close');
  await close.waitForClickable({ timeout: 5_000 });
  await close.click();
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

async function openSettingsExportHistory() {
  await browser.execute(() => {
    window.history.pushState({}, '', '/settings?tab=export');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await browser.waitUntil(
    async () => browser.execute(() => Boolean(document.querySelector('[data-settings-entry="export.history"]'))),
    {
      timeout: 12_000,
      interval: 200,
      timeoutMsg: 'Settings Export history section did not render',
    },
  );
  await waitForRouteSettled();
}

function collectExportHistoryProbe() {
  return browser.execute(() => {
    function findPinia() {
      const root = document.getElementById('app');
      const app = root && root.__vue_app__;
      if (!app || !app._context || !app._context.provides) return null;
      for (const symbol of Object.getOwnPropertySymbols(app._context.provides)) {
        const candidate = app._context.provides[symbol];
        if (candidate && candidate._s && typeof candidate._s.get === 'function') return candidate;
      }
      return null;
    }

    const settingsStore = findPinia()?._s.get('settings');
    const storeHistory = settingsStore?.settings?.export?.exportHistory ?? [];
    const section = document.querySelector('[data-settings-entry="export.history"]');
    let persistedHistory;
    try {
      persistedHistory = JSON.parse(window.localStorage.getItem('inkforge-settings') || '{}')?.export?.exportHistory ?? [];
    } catch {
      persistedHistory = [];
    }

    return {
      storeHistory: JSON.parse(JSON.stringify(storeHistory)),
      persistedHistory,
      domRows: Array.from(document.querySelectorAll('[data-export-history-entry]'))
        .map(row => (row.textContent || '').trim().replace(/\s+/g, ' ')),
      emptyText: (document.querySelector('[data-settings-entry="export.history"] .sv-placeholder-card')?.textContent || '')
        .trim()
        .replace(/\s+/g, ' '),
      sectionOverflowPx: section ? Math.max(0, section.scrollWidth - section.clientWidth) : null,
      visibleButtonsWithoutType: Array.from(section?.querySelectorAll('button') ?? [])
        .filter(button => button.offsetParent !== null && button.getAttribute('type') !== 'button')
        .map(button => (button.textContent || '').trim().replace(/\s+/g, ' ')),
    };
  });
}

async function clearExportHistoryThroughUi() {
  const clearButton = await browser.$('[data-export-history-action="clear"]');
  if (!(await clearButton.isExisting())) return false;

  await clearButton.scrollIntoView({ block: 'center', inline: 'nearest' });
  await clearButton.waitForClickable({ timeout: 5_000 });
  await clearButton.click();
  const input = await browser.$('.sv-confirm-dialog input[aria-label="确认操作校验文本"]');
  await input.waitForDisplayed({ timeout: 5_000 });
  await input.setValue('CLEAR');
  await (await browser.$('.sv-confirm-ok')).click();
  await browser.waitUntil(
    async () => browser.execute(() => (
      !document.querySelector('.sv-confirm-dialog') &&
      document.querySelectorAll('[data-export-history-entry]').length === 0
    )),
    {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: 'Export history did not clear after typed confirmation',
    },
  );
  return true;
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

async function setDeliveryAdornmentConfig(config) {
  return browser.execute((nextConfig) => {
    function findPinia() {
      const root = document.getElementById('app');
      const app = root && root.__vue_app__;
      if (!app || !app._context || !app._context.provides) return null;
      for (const sym of Object.getOwnPropertySymbols(app._context.provides)) {
        const candidate = app._context.provides[sym];
        if (candidate && candidate._s && typeof candidate._s.get === 'function') return candidate;
      }
      return null;
    }

    const settingsStore = findPinia()?._s.get('settings');
    if (!settingsStore?.settings?.export || typeof settingsStore.save !== 'function') {
      return { ok: false, reason: 'SETTINGS-STORE-MISSING' };
    }

    const clone = (value) => JSON.parse(JSON.stringify(value));
    const original = clone(settingsStore.settings.export.deliveryAdornment);
    settingsStore.settings.export.deliveryAdornment = clone(nextConfig);
    settingsStore.save();
    return {
      ok: true,
      original,
      current: clone(settingsStore.settings.export.deliveryAdornment),
    };
  }, config);
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

async function setAdvancedCustomCssState(nextState) {
  return browser.execute((state) => {
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

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    const pinia = findPinia();
    const settingsStore = pinia && pinia._s.get('settings');
    if (!settingsStore || !settingsStore.settings || typeof settingsStore.save !== 'function') {
      return { ok: false, reason: 'SETTINGS-STORE-MISSING' };
    }

    const original = clone(settingsStore.settings.advanced.customCss);
    settingsStore.settings.advanced.customCss = {
      ...settingsStore.settings.advanced.customCss,
      ...state,
      errorLog: Array.isArray(state.errorLog)
        ? state.errorLog
        : settingsStore.settings.advanced.customCss.errorLog,
    };
    settingsStore.save();
    return {
      ok: true,
      original,
      current: clone(settingsStore.settings.advanced.customCss),
    };
  }, nextState);
}

function collectAdvancedCustomCssProbe() {
  return browser.execute((runtimeParagraphScope) => {
    const style = document.getElementById('inkforge-custom-css');
    const paragraph = document.querySelector('.tiptap-content .ProseMirror p') ||
      document.querySelector('.editor-content p');
    const settingsSection = document.querySelector('[data-settings-entry="advanced.customCss"]');
    const computed = paragraph ? getComputedStyle(paragraph) : null;
    const styleSheetRules = style?.sheet
      ? Array.from(style.sheet.cssRules).map((rule) => {
        const selectorText = 'selectorText' in rule ? rule.selectorText : '';
        const declaration = 'style' in rule ? rule.style : null;
        return {
          selectorText,
          cssText: rule.cssText,
          matchesParagraph: Boolean(selectorText && paragraph?.matches?.(selectorText)),
          color: declaration?.getPropertyValue?.('color') || '',
          letterSpacing: declaration?.getPropertyValue?.('letter-spacing') || '',
        };
      })
      : [];

    return {
      pathname: location.pathname,
      search: location.search,
      styleExists: Boolean(style),
      styleText: style?.textContent || '',
      styleSheetDisabled: Boolean(style?.sheet?.disabled),
      styleSheetRuleCount: styleSheetRules.length,
      styleSheetRules,
      paragraphMatchesRuntimeScope: Boolean(paragraph?.matches?.(runtimeParagraphScope)),
      paragraphInlineStyle: paragraph?.getAttribute?.('style') || '',
      paragraphAncestry: paragraph
        ? Array.from({ length: 6 }, (_, index) => {
          let node = paragraph;
          for (let depth = 0; depth < index; depth += 1) {
            node = node?.parentElement;
          }
          if (!node) return '';
          const id = node.id ? `#${node.id}` : '';
          const className = typeof node.className === 'string'
            ? node.className.trim().replace(/\s+/g, '.')
            : '';
          return `${node.tagName.toLowerCase()}${id}${className ? `.${className}` : ''}`;
        }).filter(Boolean).join(' <- ')
        : '',
      paragraphText: paragraph?.textContent?.trim().replace(/\s+/g, ' ') || '',
      paragraphColor: computed?.color || '',
      paragraphLetterSpacing: computed?.letterSpacing || '',
      settingsSectionExists: Boolean(settingsSection),
      settingsText: settingsSection?.textContent?.trim().replace(/\s+/g, ' ') || '',
      visibleButtonsWithoutType: Array.from(settingsSection?.querySelectorAll('button') ?? [])
        .filter((button) => button.offsetParent !== null && button.getAttribute('type') !== 'button')
        .map((button) => button.textContent?.trim().replace(/\s+/g, ' ') || button.className),
    };
  }, RUNTIME_CUSTOM_CSS_PARAGRAPH_SCOPE);
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
      throw new Error(
        `[svg-render] Native acceptance could not seed a draft via the live Pinia store: ${seedFailureReason}`,
      );
    }
    seeded = true;
    seededArticleId = seedResult.articleId;

    // 4. Reach the Stage export control with the seeded draft selected.
    const reach = await reachWorkstationExport(seedResult.articleId);
    if (!reach.ready) {
      seedFailureReason = reach.reason;
      throw new Error(
        `[svg-render] Native acceptance seeded the draft but Stage 全屏导出 never enabled: ${reach.reason}`,
      );
    }
    exportReady = true;
  });

  it('seeds a real draft and enables the export pipeline (precondition)', function () {
    expect(
      seeded,
      seedFailureReason || 'a real draft was seeded via the live Pinia article store',
    ).to.equal(true);
    expect(
      exportReady,
      seedFailureReason || '全屏导出 button is enabled (editor status ready)',
    ).to.equal(true);
  });

  it('keeps editor components, delivery slots, and all 16 preset geometries aligned with the real WeChat artifact', async function () {
    const deliveryConfig = {
      readingTime: { enabled: true, wordsPerMinute: 300 },
      license: 'cc-by-4.0',
      components: [
        {
          id: 'native-song',
          type: 'song',
          enabled: true,
          title: '夜航',
          artist: '墨铸编辑部',
          url: 'https://example.com/night-flight',
        },
        {
          id: 'native-profile',
          type: 'contact-card',
          enabled: true,
          displayName: '墨铸公众号',
          accountId: 'inkforge',
          description: '欢迎关注，继续享受好文章。',
          profileUrl: 'https://example.com/inkforge',
        },
      ],
    };
    const setResult = await setDeliveryAdornmentConfig(deliveryConfig);
    expect(setResult.ok, setResult.reason || 'delivery adornment settings write').to.equal(true);

    try {
      await closeExportModalIfOpen();
      await browser.execute(() => {
        const wechatTab = Array.from(document.querySelectorAll('.panel-stage .stage-tab'))
          .find((tab) => (tab.textContent || '').includes('微信'));
        if (wechatTab && !wechatTab.classList.contains('active')) wechatTab.click();
      });
      try {
        await browser.waitUntil(
          async () => browser.execute(() => {
            const front = document.querySelector('[data-editor-projection="wechat-front"]');
            const end = document.querySelector('[data-editor-projection="wechat-end"]');
            const component = document.querySelector(
              '.tiptap-content .ink-component-card__visual .ink-writing-component--StatBlock',
            );
            const text = `${front?.textContent || ''} ${end?.textContent || ''}`;
            return Boolean(front && end && component) && text.includes('夜航') &&
              text.includes('墨铸公众号') && /阅读约\s*\d+\s*分钟/.test(text) &&
              /全文\s*\d+\s*字/.test(text);
          }),
          {
            timeout: 20_000,
            interval: 200,
            timeoutMsg: 'editor delivery projections and StatBlock visual did not converge',
          },
        );
      } catch (error) {
        const diagnostic = await browser.execute(() => ({
          pathname: location.pathname,
          search: location.search,
          activePlatform: document.querySelector('.panel-stage .stage-tab.active')?.textContent?.trim() || '',
          frontCount: document.querySelectorAll('[data-editor-projection="wechat-front"]').length,
          endCount: document.querySelectorAll('[data-editor-projection="wechat-end"]').length,
          componentCardCount: document.querySelectorAll('.tiptap-content .ink-component-card').length,
          componentVisualCount: document.querySelectorAll('.tiptap-content .ink-component-card__visual').length,
          statVisualCount: document.querySelectorAll(
            '.tiptap-content .ink-component-card__visual .ink-writing-component--StatBlock',
          ).length,
          frontText: document.querySelector('[data-editor-projection="wechat-front"]')?.textContent?.trim().replace(/\s+/g, ' ') || '',
          endText: document.querySelector('[data-editor-projection="wechat-end"]')?.textContent?.trim().replace(/\s+/g, ' ') || '',
          editorText: document.querySelector('.tiptap-content .ProseMirror')?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 240) || '',
        }));
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}; diagnostic=${JSON.stringify(diagnostic)}`,
          { cause: error },
        );
      }

      const editorProbe = await browser.execute(() => {
        const front = document.querySelector('[data-editor-projection="wechat-front"]');
        const end = document.querySelector('[data-editor-projection="wechat-end"]');
        const componentCard = document.querySelector('.tiptap-content .ink-component-card');
        const componentVisual = componentCard?.querySelector(
          '.ink-component-card__visual .ink-writing-component--StatBlock',
        );
        return {
          frontText: front?.textContent?.trim().replace(/\s+/g, ' ') || '',
          endText: end?.textContent?.trim().replace(/\s+/g, ' ') || '',
          songSlot: Boolean(front?.querySelector('[data-editor-delivery-slot="masthead-song"]')),
          profileSlot: Boolean(end?.querySelector('[data-editor-delivery-slot="after-body-profile"]')),
          componentReady: componentCard?.getAttribute('data-ink-component-status') === 'ready',
          componentVisual: Boolean(componentVisual),
          visualLinkCount: componentCard?.querySelectorAll('.ink-component-card__visual a[tabindex="-1"][aria-disabled="true"]').length ?? 0,
        };
      });
      expect(editorProbe.frontText).to.include('文章值得您享受');
      expect(editorProbe.frontText).to.include('夜航');
      expect(editorProbe.frontText).to.match(/阅读约\s*\d+\s*分钟/);
      expect(editorProbe.frontText).to.match(/全文\s*[1-9]\d*\s*字/);
      expect(editorProbe.endText).to.include('墨铸公众号');
      expect(editorProbe.endText).to.include('CC BY 4.0');
      expect(editorProbe.songSlot).to.equal(true);
      expect(editorProbe.profileSlot).to.equal(true);
      expect(editorProbe.componentReady).to.equal(true);
      expect(editorProbe.componentVisual).to.equal(true);

      await browser.execute(() => {
        document.querySelector('[data-editor-projection="wechat-front"]')?.scrollIntoView({ block: 'start' });
      });
      await browser.pause(250);
      await browser.saveScreenshot(path.join(EVIDENCE_DIR, 'editor-wechat-parity-20260802.png'));

      await openExportPanel('微信');
      try {
        await browser.waitUntil(
          async () => browser.execute(() => {
            const preview = document.querySelector('.export-panel .preview-render');
            const component = Array.from(preview?.querySelectorAll('section > strong') ?? [])
              .find(strong => strong.textContent?.trim() === '100%' &&
                strong.parentElement?.textContent?.includes('验收覆盖率') &&
                strong.parentElement?.textContent?.includes('来源：InkForge 本轮验收'))
              ?.parentElement;
            return Boolean(
              preview?.querySelector('[data-ink-masthead-song="true"]') &&
              preview?.querySelector('[data-ink-delivery="profile"]') &&
              preview?.querySelector('[data-ink-delivery="license"]') &&
              component &&
              !document.querySelector('.export-panel .preview-loading'),
            );
          }),
          {
            timeout: 20_000,
            interval: 250,
            timeoutMsg: 'WeChat artifact did not render song, profile, license, and StatBlock together',
          },
        );
      } catch (error) {
        const diagnostic = await browser.execute(() => {
          const preview = document.querySelector('.export-panel .preview-render');
          return {
            previewCount: document.querySelectorAll('.export-panel .preview-render').length,
            loading: Boolean(document.querySelector('.export-panel .preview-loading')),
            songCount: preview?.querySelectorAll('[data-ink-masthead-song="true"]').length ?? 0,
            deliveryTypes: Array.from(preview?.querySelectorAll('[data-ink-delivery]') ?? [])
              .map(element => element.getAttribute('data-ink-delivery')),
            componentIds: Array.from(preview?.querySelectorAll('[data-ink-writing-component]') ?? [])
              .map(element => element.getAttribute('data-ink-writing-component')),
            componentClasses: Array.from(preview?.querySelectorAll('[class*="ink-writing-component"]') ?? [])
              .map(element => element.getAttribute('class')),
            componentMarkup: Array.from(preview?.querySelectorAll('*') ?? [])
              .find(element => element.textContent?.trim() === '验收覆盖率')
              ?.parentElement?.outerHTML.slice(0, 1_000) || '',
            previewText: preview?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 500) || '',
          };
        });
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}; diagnostic=${JSON.stringify(diagnostic)}`,
          { cause: error },
        );
      }

      const artifactProbe = await browser.execute(() => {
        const preview = document.querySelector('.export-panel .preview-render');
        const song = preview?.querySelector('[data-ink-masthead-song="true"]');
        const metrics = Array.from(preview?.querySelectorAll('p') ?? [])
          .find(element => /阅读约\s*\d+\s*分钟/.test(element.textContent || '') &&
            /全文\s*\d+\s*字/.test(element.textContent || ''));
        const profile = preview?.querySelector('[data-ink-delivery="profile"]');
        const license = preview?.querySelector('[data-ink-delivery="license"]');
        const component = Array.from(preview?.querySelectorAll('section > strong') ?? [])
          .find(strong => strong.textContent?.trim() === '100%' &&
            strong.parentElement?.textContent?.includes('验收覆盖率') &&
            strong.parentElement?.textContent?.includes('来源：InkForge 本轮验收'))
          ?.parentElement;
        return {
          songText: song?.textContent?.trim().replace(/\s+/g, ' ') || '',
          metricsText: metrics?.textContent?.trim().replace(/\s+/g, ' ') || '',
          profileText: profile?.textContent?.trim().replace(/\s+/g, ' ') || '',
          licenseText: license?.textContent?.trim().replace(/\s+/g, ' ') || '',
          componentText: component?.textContent?.trim().replace(/\s+/g, ' ') || '',
          scriptCount: preview?.querySelectorAll('script').length ?? 0,
          foreignObjectCount: preview?.querySelectorAll('foreignObject').length ?? 0,
        };
      });
      expect(artifactProbe.songText).to.include('夜航');
      expect(artifactProbe.metricsText).to.match(/阅读约\s*\d+\s*分钟/);
      expect(artifactProbe.metricsText).to.match(/全文\s*[1-9]\d*\s*字/);
      expect(artifactProbe.profileText).to.include('墨铸公众号');
      expect(artifactProbe.licenseText).to.include('CC BY 4.0');
      expect(artifactProbe.componentText).to.include('100%');
      expect(artifactProbe.scriptCount).to.equal(0);
      expect(artifactProbe.foreignObjectCount).to.equal(0);

      const cards = await browser.$$('.export-panel .preset-card');
      expect(cards.length, 'all existing WeChat presets remain present').to.equal(16);
      const fingerprints = [];
      let previousHtml = '';
      for (const [index, card] of cards.entries()) {
        const name = (await card.getText()).trim().replace(/\s+/g, ' ');
        await card.scrollIntoView({ block: 'center', inline: 'nearest' });
        const wasActive = (await card.getAttribute('class')).includes('active');
        if (!wasActive) {
          previousHtml = await browser.execute(() => (
            document.querySelector('.export-panel .preview-render')?.innerHTML || ''
          ));
          await card.waitForClickable({ timeout: 5_000 });
          await card.click();
          await browser.waitUntil(
            async () => browser.execute((before) => {
              const preview = document.querySelector('.export-panel .preview-render');
              return !document.querySelector('.export-panel .preview-loading') &&
                Boolean(preview?.querySelector('[data-ink-masthead-song="true"]')) &&
                preview?.innerHTML !== before;
            }, previousHtml),
            {
              timeout: 20_000,
              interval: 200,
              timeoutMsg: `preset "${name}" did not produce a fresh WeChat artifact`,
            },
          );
        }

        const fingerprint = await browser.execute(() => {
          const preview = document.querySelector('.export-panel .preview-render');
          const metrics = Array.from(preview?.querySelectorAll('p') ?? [])
            .find(element => /阅读约\s*\d+\s*分钟/.test(element.textContent || '') &&
              /全文\s*\d+\s*字/.test(element.textContent || ''));
          const component = Array.from(preview?.querySelectorAll('section > strong') ?? [])
            .find(strong => strong.textContent?.trim() === '100%' &&
              strong.parentElement?.textContent?.includes('验收覆盖率') &&
              strong.parentElement?.textContent?.includes('来源：InkForge 本轮验收'))
            ?.parentElement;
          return [
            preview?.querySelector('.ink-article-song[data-ink-masthead-song="true"]'),
            metrics,
            component,
            preview?.querySelector('[data-ink-delivery="profile"]'),
          ].map(element => element?.getAttribute('style') || '').join('|');
        });
        expect(fingerprint, `preset "${name}" must render all delivery/component geometry`).to.not.equal('|||');
        fingerprints.push(fingerprint);
        await browser.execute(() => {
          const viewport = document.querySelector('.export-panel .preview-viewport');
          if (viewport) viewport.scrollTop = 0;
        });
        await browser.saveScreenshot(path.join(
          EVIDENCE_DIR,
          `preset-visual-${String(index + 1).padStart(2, '0')}-20260802.png`,
        ));
        const componentScroll = await browser.execute(() => {
          const viewport = document.querySelector('.export-panel .preview-viewport');
          const preview = document.querySelector('.export-panel .preview-render');
          const target = Array.from(preview?.querySelectorAll('section > strong') ?? [])
            .find(strong => strong.textContent?.trim() === '100%' &&
              strong.parentElement?.textContent?.includes('验收覆盖率') &&
              strong.parentElement?.textContent?.includes('来源：InkForge 本轮验收'))
            ?.parentElement;
          if (!viewport || !target) return { found: false, visible: false };
          const viewportRect = viewport.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          viewport.scrollTop += targetRect.top - viewportRect.top -
            Math.max(0, (viewportRect.height - targetRect.height) / 2);
          const visibleRect = target.getBoundingClientRect();
          return {
            found: true,
            visible: visibleRect.top < viewportRect.bottom && visibleRect.bottom > viewportRect.top,
          };
        });
        expect(componentScroll, `preset "${name}" component evidence must be visible`).to.deep.equal({
          found: true,
          visible: true,
        });
        await browser.saveScreenshot(path.join(
          EVIDENCE_DIR,
          `preset-component-${String(index + 1).padStart(2, '0')}-20260802.png`,
        ));
        const endScroll = await browser.execute(() => {
          const viewport = document.querySelector('.export-panel .preview-viewport');
          const target = document.querySelector(
            '.export-panel .preview-render [data-ink-delivery="profile"]',
          );
          if (!viewport || !target) return { found: false, visible: false };
          const viewportRect = viewport.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          viewport.scrollTop += targetRect.top - viewportRect.top -
            Math.max(0, (viewportRect.height - targetRect.height) / 2);
          const visibleRect = target.getBoundingClientRect();
          return {
            found: true,
            visible: visibleRect.top < viewportRect.bottom && visibleRect.bottom > viewportRect.top,
          };
        });
        expect(endScroll, `preset "${name}" colophon evidence must be visible`).to.deep.equal({
          found: true,
          visible: true,
        });
        await browser.saveScreenshot(path.join(
          EVIDENCE_DIR,
          `preset-end-${String(index + 1).padStart(2, '0')}-20260802.png`,
        ));
      }
      expect(new Set(fingerprints).size, 'all 16 WeChat presets keep distinct rendered geometry').to.equal(16);

      const clipboardPresetNumber = Number.parseInt(
        process.env.INKFORGE_E2E_CLIPBOARD_PRESET_NUMBER || String(cards.length),
        10,
      );
      expect(
        clipboardPresetNumber,
        'requested clipboard preset number must address one of the 16 real cards',
      ).to.be.within(1, cards.length);
      const clipboardCard = cards[clipboardPresetNumber - 1];
      const clipboardPresetName = (await clipboardCard.getText()).trim().replace(/\s+/g, ' ');
      if (!(await clipboardCard.getAttribute('class')).includes('active')) {
        const beforeClipboardHtml = await browser.execute(() => (
          document.querySelector('.export-panel .preview-render')?.innerHTML || ''
        ));
        await clipboardCard.scrollIntoView({ block: 'center', inline: 'nearest' });
        await clipboardCard.waitForClickable({ timeout: 5_000 });
        await clipboardCard.click();
        await browser.waitUntil(
          async () => browser.execute((before) => {
            const preview = document.querySelector('.export-panel .preview-render');
            return !document.querySelector('.export-panel .preview-loading') &&
              Boolean(preview?.querySelector('[data-ink-masthead-song="true"]')) &&
              preview?.innerHTML !== before;
          }, beforeClipboardHtml),
          {
            timeout: 20_000,
            interval: 200,
            timeoutMsg: `clipboard preset "${clipboardPresetName}" did not render`,
          },
        );
      }
      const clipboardArtifactHtml = await browser.execute(() => (
        document.querySelector('.export-panel .preview-render')?.innerHTML || ''
      ));
      const clipboardArtifactSha256 = crypto
        .createHash('sha256')
        .update(clipboardArtifactHtml)
        .digest('hex');
      const copyButton = await browser.$('.export-panel .act-btn.act-primary');
      await copyButton.scrollIntoView({ block: 'center', inline: 'nearest' });
      await copyButton.waitForClickable({ timeout: 12_000, interval: 200 });
      await copyButton.click();
      await browser.waitUntil(
        async () => browser.execute(() => (
          (document.querySelector('.export-panel .feedback-success')?.textContent || '').includes('已复制')
        )),
        {
          timeout: 8_000,
          interval: 100,
          timeoutMsg: 'full WeChat parity artifact was not written to the real system clipboard',
        },
      );
      // eslint-disable-next-line no-console
      console.log(`[svg-render] clipboard preset ${clipboardPresetNumber}: ${clipboardPresetName}`);
      // eslint-disable-next-line no-console
      console.log(`[svg-render] clipboard artifact sha256: ${clipboardArtifactSha256}`);

      await browser.saveScreenshot(path.join(EVIDENCE_DIR, 'wechat-artifact-parity-20260802.png'));
    } finally {
      await closeExportModalIfOpen();
      await setDeliveryAdornmentConfig(setResult.original);
    }
  });

  it('renders the selected flagship SVG modules in the real Workstation platform preview', async function () {
    expect(exportReady, seedFailureReason || 'Workstation flagship preview precondition').to.equal(true);

    await closeExportModalIfOpen();
    await browser.execute(() => {
      const redock = Array.from(document.querySelectorAll('.panel-stage .stage-widget-placeholder button'))
        .find((button) => (button.textContent || '').includes('重新停靠预览'));
      if (redock) redock.click();

      document.querySelector('.panel-inspector .inspector-collapsed-bar')?.click();

      const wechatTab = Array.from(document.querySelectorAll('.panel-stage .stage-tab'))
        .find((tab) => (tab.textContent || '').includes('微信'));
      if (wechatTab && !wechatTab.classList.contains('active')) wechatTab.click();
    });

    await browser.waitUntil(
      async () => browser.execute(() => {
        const activeTab = document.querySelector('.panel-stage .stage-tab.active');
        const kiln = Array.from(document.querySelectorAll('.panel-inspector .preset-chip'))
          .find((chip) => (chip.textContent || '').includes('赤陶旗舰'));
        return (activeTab?.textContent || '').includes('微信') && Boolean(kiln?.offsetParent);
      }),
      {
        timeout: 12_000,
        interval: 200,
        timeoutMsg: 'Workstation WeChat preset strip never exposed 赤陶旗舰',
      },
    );

    const selected = await browser.execute(() => {
      const kiln = Array.from(document.querySelectorAll('.panel-inspector .preset-chip'))
        .find((chip) => (chip.textContent || '').includes('赤陶旗舰'));
      if (!kiln) return false;
      kiln.click();
      return true;
    });
    expect(selected, 'Workstation should expose the 赤陶旗舰 preset in its real Inspector controls').to.equal(true);

    await browser.waitUntil(
      async () => browser.execute(() => {
        const host = document.querySelector(
          '.panel-stage .device-screen [data-platform-editor-host="wechat"]',
        );
        const canvas = host?.querySelector(
          '[data-platform-editor="wechat"][data-editor-canvas-width="586"]',
        );
        const ids = Array.from(host?.querySelectorAll('[data-ink-svg]') ?? [])
          .map((module) => module.getAttribute('data-ink-svg'));
        const activeKiln = Array.from(document.querySelectorAll('.panel-inspector .preset-chip.active'))
          .some((chip) => (chip.textContent || '').includes('赤陶旗舰'));
        return activeKiln && Boolean(canvas?.getBoundingClientRect().width) &&
          ids.includes('cover-grid') && ids.includes('divider-forge');
      }),
      {
        timeout: 20_000,
        interval: 300,
        timeoutMsg: 'Workstation Stage never rendered flagship-kiln inline SVG modules',
      },
    );

    const probe = await browser.execute(() => {
      const host = document.querySelector(
        '.panel-stage .device-screen [data-platform-editor-host="wechat"]',
      );
      const canvas = host?.querySelector(
        '[data-platform-editor="wechat"][data-editor-canvas-width="586"]',
      );
      const modules = Array.from(host?.querySelectorAll('[data-ink-svg]') ?? []);
      const svgs = modules.flatMap((module) => Array.from(module.querySelectorAll('svg')));
      const canvasWidth = canvas?.getBoundingClientRect().width ?? 0;
      const widestSvg = svgs.reduce(
        (max, svg) => Math.max(max, svg.getBoundingClientRect().width),
        0,
      );
      return {
        canvasWidth,
        widestSvg,
        moduleIds: modules.map((module) => module.getAttribute('data-ink-svg')),
        svgCount: svgs.length,
        responsiveSvgCount: svgs.filter((svg) => svg.getAttribute('width') === '100%').length,
        scriptCount: host?.querySelectorAll('script').length ?? 0,
        foreignObjectCount: host?.querySelectorAll('foreignObject').length ?? 0,
      };
    });

    expect(probe.canvasWidth, 'measured WeChat editor canvas must be laid out').to.be.greaterThan(200);
    expect(probe.moduleIds, 'Stage should contain the selected flagship cover').to.include('cover-grid');
    expect(probe.moduleIds, 'Stage should contain the selected flagship divider').to.include('divider-forge');
    expect(probe.svgCount, 'Stage should render real inline SVG').to.be.greaterThan(0);
    expect(probe.responsiveSvgCount, 'every flagship SVG keeps width="100%"').to.equal(probe.svgCount);
    expect(probe.widestSvg, 'responsive SVG must not exceed its platform canvas').to.be.at.most(probe.canvasWidth + 1);
    expect(probe.scriptCount, 'WeChat preview must not contain script').to.equal(0);
    expect(probe.foreignObjectCount, 'WeChat preview must not contain foreignObject').to.equal(0);
  });

  it('uses the persisted Settings default export platform as the Workstation and ExportModal initial platform', async function () {
    expect(exportReady, seedFailureReason || 'default export platform precondition').to.equal(true);

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
    expect(exportReady, seedFailureReason || 'export custom CSS precondition').to.equal(true);

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
              .filter((p) => !p.closest('[data-ink-svg], [data-ink-block]'))
              .filter((p) => (p.textContent || '').trim())
              .sort((left, right) =>
                (right.textContent || '').trim().length - (left.textContent || '').trim().length)[0];
            return Boolean(para) && !document.querySelector('.export-panel .preview-loading');
          }),
        {
          timeout: 12_000,
          interval: 300,
          timeoutMsg: 'WeChat ExportModal preview did not settle on a body paragraph',
        },
      );

      const probe = await browser.execute(() => {
        const para = Array.from(document.querySelectorAll('.export-panel .preview-render #nice p'))
          .filter((p) => !p.closest('[data-ink-svg], [data-ink-block]'))
          .filter((p) => (p.textContent || '').trim())
          .sort((left, right) =>
            (right.textContent || '').trim().length - (left.textContent || '').trim().length)[0];
        const runtimeStyle = document.getElementById('inkforge-custom-css');
        const previewRender = document.querySelector('.export-panel .preview-render');
        const style = para ? para.getAttribute('style') || '' : '';
        return {
          style,
          normalizedStyle: style.replace(/\s+/g, '').toLowerCase(),
          computedColor: para ? getComputedStyle(para).color : '',
          computedLetterSpacing: para ? getComputedStyle(para).letterSpacing : '',
          previewContainsCustomColor: Boolean(
            previewRender?.innerHTML.toLowerCase().includes('#123456'),
          ),
          previewContainsCustomLetterSpacing: Boolean(
            previewRender?.innerHTML.toLowerCase().includes('letter-spacing: 1px'),
          ),
          hasRuntimeCustomCss: Boolean(runtimeStyle),
          runtimeStyleContainsExportCss: Boolean(runtimeStyle && runtimeStyle.textContent && runtimeStyle.textContent.includes('#123456')),
        };
      });

      expect(
        probe.normalizedStyle,
        `export preview paragraph carries inline export custom CSS (${probe.style})`,
      ).to.include('color:#123456');
      expect(
        probe.normalizedStyle,
        `export preview paragraph carries inline letter spacing (${probe.style})`,
      ).to.include('letter-spacing:1px');
      expect(probe.runtimeStyleContainsExportCss, 'export custom CSS must not be injected into runtime editor CustomCSS style tag').to.equal(false);
    } finally {
      await closeExportModalIfOpen();
      await setExportCustomCss(originalCss);
    }
  });

  it('applies Settings Advanced runtime CustomCSS to the real editor and removes it without export leakage', async function () {
    expect(exportReady, seedFailureReason || 'runtime CustomCSS precondition').to.equal(true);

    const css = 'p { color: rgb(12, 34, 56); letter-spacing: 2px; }';
    const invalidDraft = 'p { background: url(javascript:alert(1)); color: red !important; }';
    const setResult = await setAdvancedCustomCssState({
      enabled: true,
      draft: css,
      published: css,
      confirmedAt: new Date().toISOString(),
      suspendedReason: null,
      lastAppliedAt: new Date().toISOString(),
      errorLog: [],
    });
    expect(setResult.ok, setResult.reason || 'settings advanced.customCss write').to.equal(true);
    const original = setResult.original;

    try {
      await closeExportModalIfOpen();
      const reach = await reachWorkstationExport(seededArticleId);
      expect(reach.ready, reach.reason || 'workstation editor should be ready for runtime CustomCSS').to.equal(true);

      let latestRuntimeProbe = null;
      await browser.waitUntil(
        async () => {
          const probe = await collectAdvancedCustomCssProbe();
          latestRuntimeProbe = probe;
          return probe.styleExists &&
            probe.styleText.includes(RUNTIME_CUSTOM_CSS_PARAGRAPH_SCOPE) &&
            probe.styleText.includes('rgb(12, 34, 56)') &&
            probe.paragraphColor === 'rgb(12, 34, 56)' &&
            probe.paragraphLetterSpacing === '2px';
        },
        {
          timeout: 12_000,
          interval: 300,
          timeoutMsg: 'Settings advanced.customCss did not inject scoped runtime CSS into the real editor',
        },
      ).catch((error) => {
        const details = latestRuntimeProbe ? JSON.stringify(latestRuntimeProbe) : 'no probe collected';
        throw new Error(`${error.message}; last probe: ${details}`);
      });

      const appliedProbe = await collectAdvancedCustomCssProbe();
      expect(appliedProbe.styleText, 'runtime CustomCSS is scoped to editor-content and live ProseMirror').to.include(RUNTIME_CUSTOM_CSS_PARAGRAPH_SCOPE);
      expect(appliedProbe.styleText, 'runtime CustomCSS contains the applied color only after sandboxing').to.include('rgb(12, 34, 56)');
      expect(appliedProbe.styleText, 'runtime CustomCSS does not create export CSS marker').not.to.include('data-inkforge-custom-css');
      expect(appliedProbe.paragraphColor, 'real editor paragraph receives runtime CustomCSS color').to.equal('rgb(12, 34, 56)');
      expect(appliedProbe.paragraphLetterSpacing, 'real editor paragraph receives runtime CustomCSS letter spacing').to.equal('2px');

      await browser.refresh();
      await waitForMainWindow();
      const reloadReach = await reachWorkstationExport(seededArticleId);
      expect(reloadReach.ready, reloadReach.reason || 'workstation editor should reload with persisted runtime CustomCSS').to.equal(true);
      await browser.waitUntil(
        async () => {
          const probe = await collectAdvancedCustomCssProbe();
          return probe.styleExists && probe.paragraphColor === 'rgb(12, 34, 56)';
        },
        {
          timeout: 12_000,
          interval: 300,
          timeoutMsg: 'persisted advanced.customCss did not re-inject after app reload',
        },
      );

      const invalidResult = await setAdvancedCustomCssState({
        enabled: true,
        draft: invalidDraft,
        published: css,
        confirmedAt: new Date().toISOString(),
        suspendedReason: null,
      });
      expect(invalidResult.ok, invalidResult.reason || 'settings advanced.customCss invalid draft write').to.equal(true);
      await browser.execute(() => {
        window.history.pushState({}, '', '/settings?tab=advanced');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await browser.waitUntil(
        async () => {
          const probe = await collectAdvancedCustomCssProbe();
          return probe.settingsSectionExists &&
            probe.settingsText.includes('CustomCSS') &&
            probe.settingsText.includes('主动内容') &&
            probe.settingsText.includes('!important');
        },
        {
          timeout: 12_000,
          interval: 300,
          timeoutMsg: 'Settings Advanced did not surface CustomCSS sandbox errors for an invalid draft',
        },
      );

      const invalidProbe = await collectAdvancedCustomCssProbe();
      expect(invalidProbe.visibleButtonsWithoutType, 'CustomCSS action buttons keep explicit non-submit type').to.deep.equal([]);
      expect(invalidProbe.styleText, 'invalid CustomCSS draft must not enter runtime style').not.to.include('javascript:');
      expect(invalidProbe.styleText, 'invalid CustomCSS draft must not enter runtime style').not.to.include('!important');
      expect(invalidProbe.styleText, 'last known good published runtime CSS remains scoped').to.include('rgb(12, 34, 56)');

      const disabled = await setAdvancedCustomCssState({
        enabled: false,
        draft: '',
        published: '',
        confirmedAt: null,
        suspendedReason: null,
        lastAppliedAt: null,
        errorLog: [],
      });
      expect(disabled.ok, disabled.reason || 'settings advanced.customCss reset write').to.equal(true);
      await browser.waitUntil(
        async () => {
          const probe = await collectAdvancedCustomCssProbe();
          return !probe.styleExists && probe.settingsText.includes('未启用');
        },
        {
          timeout: 12_000,
          interval: 300,
          timeoutMsg: 'disabled/reset advanced.customCss did not remove the runtime style tag',
        },
      );
    } finally {
      await setAdvancedCustomCssState(original);
      await browser.execute((articleId) => {
        window.history.pushState({}, '', `/workstation?id=${encodeURIComponent(articleId)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, seededArticleId);
      await browser.pause(300);
    }
  });

  it('persists a successful WeChat rich copy in Settings history and clears it through the real UI', async function () {
    expect(exportReady, seedFailureReason || 'export history precondition').to.equal(true);

    try {
      await closeExportModalIfOpen();
      await openSettingsExportHistory();
      await clearExportHistoryThroughUi();
      const initial = await collectExportHistoryProbe();
      expect(initial.storeHistory, 'history starts empty through the real clear action').to.deep.equal([]);
      expect(initial.persistedHistory, 'empty history is durable before the copy action').to.deep.equal([]);

      const reach = await reachWorkstationExport(seededArticleId);
      expect(reach.ready, reach.reason || 'workstation export button should be ready for history proof').to.equal(true);
      await openExportPanel('微信');

      const richClipboardAvailable = await browser.execute(() => (
        typeof window.navigator.clipboard?.write === 'function' && typeof window.ClipboardItem === 'function'
      ));
      expect(richClipboardAvailable, 'real WebView2 must expose rich ClipboardItem.write for WeChat style copy').to.equal(true);

      const copyButton = await browser.$('.export-panel .act-btn.act-primary');
      await copyButton.scrollIntoView({ block: 'center', inline: 'nearest' });
      await copyButton.waitForClickable({ timeout: 12_000, interval: 200 });
      await copyButton.click();
      await browser.waitUntil(
        async () => browser.execute(() => (
          (document.querySelector('.export-panel .feedback-success')?.textContent || '').includes('已复制')
        )),
        {
          timeout: 8_000,
          interval: 100,
          timeoutMsg: 'WeChat rich clipboard write did not return success',
        },
      );

      await closeExportModal();
      await openSettingsExportHistory();
      let recorded;
      await browser.waitUntil(
        async () => {
          recorded = await collectExportHistoryProbe();
          return recorded.sectionOverflowPx === 0;
        },
        {
          timeout: 5_000,
          interval: 100,
          timeoutMsg: 'export history layout retained horizontal overflow after route transition settled',
        },
      );
      expect(recorded.storeHistory, 'one successful app copy is recorded').to.have.length(1);
      expect(recorded.persistedHistory, 'the copy record is persisted').to.have.length(1);
      expect(recorded.domRows, 'Settings renders the same real history row').to.have.length(1);
      expect(recorded.storeHistory[0]).to.include({ platform: 'wechat', action: 'copy' });
      expect(recorded.storeHistory[0].title).to.include(SEED_TITLE);
      expect(recorded.storeHistory[0].title).to.include('HTML 原生产物');
      expect(recorded.storeHistory[0].bytes).to.be.greaterThan(0);
      expect(recorded.domRows[0]).to.include('微信公众号');
      expect(recorded.domRows[0]).to.include('复制到剪贴板');
      expect(recorded.sectionOverflowPx, 'history section must not overflow horizontally').to.equal(0);
      expect(recorded.visibleButtonsWithoutType, 'history actions keep explicit button semantics').to.deep.equal([]);

      await browser.refresh();
      await waitForMainWindow();
      await openSettingsExportHistory();
      const reloaded = await collectExportHistoryProbe();
      expect(reloaded.storeHistory, 'history survives a real app reload').to.have.length(1);
      expect(reloaded.persistedHistory[0].id).to.equal(recorded.storeHistory[0].id);

      expect(await clearExportHistoryThroughUi(), 'clear history button should exist for a populated list').to.equal(true);
      const cleared = await collectExportHistoryProbe();
      expect(cleared.storeHistory).to.deep.equal([]);
      expect(cleared.persistedHistory).to.deep.equal([]);
      expect(cleared.emptyText).to.include('暂无导出历史');

      await browser.refresh();
      await waitForMainWindow();
      await openSettingsExportHistory();
      const clearedReload = await collectExportHistoryProbe();
      expect(clearedReload.storeHistory, 'cleared history remains empty after reload').to.deep.equal([]);
      expect(clearedReload.persistedHistory).to.deep.equal([]);
    } finally {
      await closeExportModalIfOpen();
      await browser.execute((articleId) => {
        window.history.pushState({}, '', `/workstation?id=${encodeURIComponent(articleId)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, seededArticleId);
      await browser.pause(300);
      await reachWorkstationExport(seededArticleId);
    }
  });

  it('surfaces style capability gates for all platforms in the real ExportModal', async function () {
    expect(exportReady, seedFailureReason || 'style capability gate precondition').to.equal(true);

    await openExportPanel('微信');

    const wechat = await collectStyleCapabilityProbe();
    expect(wechat.summary, 'WeChat style capability summary').to.include('微信公众号 当前可用 8/17');
    expect(wechat.summary, 'WeChat acceptance audit summary').to.include('验收审计 不可宣称');
    expect(wechat.summary, 'WeChat execution runbook summary').to.include('执行手册 开放');
    expect(wechat.summary, 'WeChat committed release gate summary').to.include('canClaimComplete=false');
    expect(wechat.summary, 'WeChat committed release gate exposes exact-artifact conflicts')
      .to.include('fingerprintConflicts 0');
    expect(wechat.externalChecklistText, 'WeChat external proof checklist is visible')
      .to.include('外部证明清单 12 行');
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
      .to.include('外部清单 12');
    expect(wechat.localActionabilityText, 'WeChat local actionability prevents false local completion claims')
      .to.include('不得把目录阻断或外部平台行当作本地补证完成');
    expect(wechat.localActionabilityGroups, 'local actionability exposes local/catalog groups')
      .to.have.length(2);
    expect(wechat.externalHandoffText, 'WeChat external proof handoff is visible')
      .to.include('外部交接 12 行');
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
        flag.includes('8') &&
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
        flag.includes('8') &&
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
        group.includes('8') &&
        group.includes('微信公众号 8') &&
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
        group.includes('8') &&
        group.includes('登录编辑器 URL 1') &&
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
    expect(wechat.preflightText, 'WeChat preflight row mirrors the available catalog count')
      .to.include('可用 8/17');
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

    await clickStyleCapabilityChoice('wechat-flagship-kiln');

    await browser.waitUntil(
      async () => browser.execute(() => {
        const kiln = document.querySelector(
          '.export-panel [data-style-choice-id="wechat-flagship-kiln"]',
        );
        const activePreset = Array.from(document.querySelectorAll('.export-panel .preset-card'))
          .find((card) => card.classList.contains('active'));
        const preflight = Array.from(document.querySelectorAll('.export-panel [class*="preflight"]'))
          .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
          .find((text) => text.includes('样式能力目录')) || '';

        return kiln?.getAttribute('aria-pressed') === 'true' &&
          (activePreset?.textContent || '').includes('赤陶旗舰') &&
          preflight.includes('已选择 赤陶旗舰（flagship-kiln）') &&
          preflight.includes('Kiln creative flagship');
      }),
      {
        timeout: 12_000,
        interval: 100,
        timeoutMsg: 'Kiln capability click did not settle into the matching active preset and preflight',
      },
    );

    const applicationProbe = await browser.execute(() => {
      const cards = Array.from(document.querySelectorAll('.export-panel .style-choice-card'));
      const kiln = document.querySelector(
        '.export-panel [data-style-choice-id="wechat-flagship-kiln"]',
      );
      const amber = cards.find((card) => (card.textContent || '').includes('Amber business flagship'));
      const toolbar = cards.find((card) => (card.textContent || '').includes('Toolbar typography parameter map'));
      const activePreset = Array.from(document.querySelectorAll('.export-panel .preset-card'))
        .find((card) => card.classList.contains('active'));
      const preflight = Array.from(document.querySelectorAll('.export-panel [class*="preflight"]'))
        .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
        .find((text) => text.includes('样式能力目录')) || '';

      return {
        kilnDisabled: Boolean(kiln?.disabled),
        kilnPressed: kiln?.getAttribute('aria-pressed') || '',
        amberDisabled: Boolean(amber?.disabled),
        toolbarDisabled: Boolean(toolbar?.disabled),
        activePresetText: (activePreset?.textContent || '').trim().replace(/\s+/g, ' '),
        preflight,
      };
    });
    expect(applicationProbe.kilnDisabled, 'Kiln style is selectable because it maps to a real preset').to.equal(false);
    expect(applicationProbe.kilnPressed, 'Kiln style exposes selected state after click').to.equal('true');
    expect(applicationProbe.amberDisabled, 'Amber is selectable as a preset-backed current-round style').to.equal(false);
    expect(applicationProbe.toolbarDisabled, 'Toolbar parameter map is selectable as a current-round preset-backed style').to.equal(false);
    expect(applicationProbe.activePresetText, 'style click selects the real Kiln preset').to.include('赤陶旗舰');
    expect(applicationProbe.preflight, 'preflight names the selected style and real preset')
      .to.include('已选择 赤陶旗舰（flagship-kiln）');
    expect(applicationProbe.preflight, 'preflight lists every capability represented by the shared preset')
      .to.include('Kiln creative flagship');

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
      .to.include('可用 7/8；受限 0；不可用 1');
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

    await clickStyleCapabilityChoice('xhs-data-card');
    await clickStyleCapabilityChoice('xhs-long-report');
    await clickStyleCapabilityChoice('xhs-market-rich-card-fallback');
    const xhsApplicationProbe = await browser.execute(() => {
      const cardsAfter = Array.from(document.querySelectorAll('.export-panel .style-choice-card'));
      const dataAfter = cardsAfter.find((card) => (card.textContent || '').includes('Data and table image card'));
      const longAfter = cardsAfter.find((card) => (card.textContent || '').includes('Long report image artifact'));
      const marketAfter = cardsAfter.find((card) => (card.textContent || '').includes('Market rich card image fallback'));
      const activePreset = Array.from(document.querySelectorAll('.export-panel .preset-card'))
        .find((card) => card.classList.contains('active'));
      const preflight = Array.from(document.querySelectorAll('.export-panel [class*="preflight"]'))
        .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' '))
        .find((text) => text.includes('样式能力目录')) || '';

      return {
        dataDisabled: Boolean(dataAfter?.disabled),
        longDisabled: Boolean(longAfter?.disabled),
        marketDisabled: Boolean(marketAfter?.disabled),
        dataPressed: dataAfter?.getAttribute('aria-pressed') || '',
        longPressed: longAfter?.getAttribute('aria-pressed') || '',
        marketPressed: marketAfter?.getAttribute('aria-pressed') || '',
        activePresetText: (activePreset?.textContent || '').trim().replace(/\s+/g, ' '),
        preflight,
      };
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
      .to.include('已选择 自然清新（xhs-nature）');
    expect(xhsApplicationProbe.preflight, 'XHS preflight lists the selected mapped capability')
      .to.include('Market rich card image fallback');

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
      .to.include('可用 4/8；受限 3；不可用 1');
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
      expect(exportReady, seedFailureReason || `${flagship.id} export precondition`).to.equal(true);

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

  it('flagship body yields a mobile-comfortable ~22–24 CJK chars/line (real layout, ship font)', async function () {
    expect(exportReady, seedFailureReason || 'chars/line export precondition').to.equal(true);
    await closeExportModalIfOpen();
    await browser.execute(() => {
      document.querySelector('.panel-stage .stage-collapsed-bar')?.click();
      document.querySelector('.panel-inspector .inspector-collapsed-bar')?.click();
      const wechatTab = Array.from(document.querySelectorAll('.panel-stage .stage-tab'))
        .find((tab) => (tab.textContent || '').includes('微信'));
      if (wechatTab && !wechatTab.classList.contains('active')) wechatTab.click();
    });
    await browser.waitUntil(
      async () => browser.execute(() => {
        const activeTab = document.querySelector('.panel-stage .stage-tab.active');
        const preset = Array.from(document.querySelectorAll('.panel-inspector .preset-chip'))
          .find((chip) => (chip.textContent || '').includes('铜绿旗舰'));
        return (activeTab?.textContent || '').includes('微信') && Boolean(preset?.offsetParent);
      }),
      {
        timeout: 12_000,
        interval: 200,
        timeoutMsg: 'Workstation WeChat preset strip never exposed 铜绿旗舰',
      },
    );
    await browser.execute(() => {
      const preset = Array.from(document.querySelectorAll('.panel-inspector .preset-chip'))
        .find((chip) => (chip.textContent || '').includes('铜绿旗舰'));
      preset?.click();
    });
    await browser.waitUntil(
      async () => browser.execute(() => {
        const active = Array.from(document.querySelectorAll('.panel-inspector .preset-chip.active'))
          .some((chip) => (chip.textContent || '').includes('铜绿旗舰'));
        const canvas = document.querySelector('.panel-stage [data-platform-editor="wechat"]');
        return active && Boolean(canvas?.querySelector('p'));
      }),
      {
        timeout: 20_000,
        interval: 300,
        timeoutMsg: 'Workstation Stage never rendered 铜绿旗舰 body content',
      },
    );

    // The Stage is the canonical live renderer. Measure the seeded paragraph's
    // actual Range line boxes so the assertion covers the shipped DOM, font,
    // padding, punctuation, and CJK wrapping rules without an artificial probe.
    const layout = await browser.execute(() => {
      const canvas = document.querySelector('.panel-stage [data-platform-editor="wechat"]');
      const body = Array.from(canvas?.querySelectorAll('p') || [])
        .find((paragraph) => paragraph.textContent?.includes('在墨铸的导出管线里'));
      if (!canvas || !body) return null;

      const lines = new Map();
      const walker = document.createTreeWalker(body, window.NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (let index = 0; index < node.textContent.length; index += 1) {
          if (/\s/.test(node.textContent[index])) continue;
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          const rect = range.getClientRects()[0];
          if (!rect) continue;
          const top = Math.round(rect.top);
          lines.set(top, (lines.get(top) || 0) + 1);
        }
      }
      const lineCounts = Array.from(lines.entries())
        .sort(([a], [b]) => a - b)
        .map(([, count]) => count);
      const sourceStyle = getComputedStyle(body);
      return {
        canvasWidth: Math.round(canvas.getBoundingClientRect().width),
        bodyWidth: Math.round(body.getBoundingClientRect().width),
        charsPerLine: lineCounts[0] || 0,
        lineCounts,
        fontSize: sourceStyle.fontSize,
        wordBreak: sourceStyle.wordBreak,
      };
    });

    expect(layout, 'a representative Stage body <p> exists to measure chars/line').to.not.equal(null);
    expect(layout.canvasWidth, 'the WeChat Stage canvas is laid out').to.be.greaterThan(200);

    expect(
      layout.charsPerLine,
      `real Stage CJK chars/line @${layout.bodyWidth}px/${layout.fontSize} (target 22–24): ` +
        `lineCounts=${layout.lineCounts.join(',')} wordBreak=${layout.wordBreak}`,
    ).to.be.within(22, 24);

    // eslint-disable-next-line no-console
    console.log(
      `[svg-render] chars/line (real Stage): ${layout.charsPerLine} ` +
        `(lines=${layout.lineCounts.join(',')} @${layout.bodyWidth}px/${layout.fontSize})`,
    );
  });

  it('keeps only the latest native edit and preset render after 10 rapid rounds', async function () {
    expect(exportReady, seedFailureReason || 'native preview performance precondition').to.equal(true);
    await closeExportModalIfOpen();

    for (const selector of [
      '.panel-stage .stage-collapsed-bar',
      '.panel-inspector .inspector-collapsed-bar',
    ]) {
      const collapsedBar = await browser.$(selector);
      if (await collapsedBar.isExisting() && await collapsedBar.isDisplayed()) {
        await collapsedBar.waitForClickable({ timeout: 5_000, interval: 100 });
        await collapsedBar.click();
      }
    }

    const inspectorPin = await browser.$('.panel-inspector .inspector-pin-btn');
    if (
      await inspectorPin.isExisting()
      && await inspectorPin.isDisplayed()
      && await inspectorPin.getAttribute('aria-pressed') !== 'true'
    ) {
      await inspectorPin.waitForClickable({ timeout: 5_000, interval: 100 });
      await inspectorPin.click();
    }

    const stageTabs = await browser.$$('.panel-stage .stage-tab');
    let wechatTab = null;
    for (const tab of stageTabs) {
      if ((await tab.getText()).includes('微信')) {
        wechatTab = tab;
        break;
      }
    }
    expect(Boolean(wechatTab), 'the real Workstation Stage exposes the WeChat tab').to.equal(true);
    if (!(await wechatTab.getAttribute('class')).includes('active')) {
      await wechatTab.scrollIntoView({ block: 'center', inline: 'nearest' });
      await wechatTab.waitForClickable({ timeout: 5_000, interval: 100 });
      await wechatTab.click();
    }

    const presetNames = [
      '论文翻译',
      '法学研讨',
      '行业研报',
      '时事点评',
      'AIGC',
      '编程创造',
      '学习笔记',
      '新闻',
      '整活',
      '赤陶旗舰',
    ];
    const renderTimes = [];
    const wallTimes = [];
    const rounds = [];

    for (const [index, presetName] of presetNames.entries()) {
      const marker = `INKFORGE-PERF-${String(index + 1).padStart(2, '0')}`;
      const editor = await browser.$('.tiptap-content .ProseMirror');
      await editor.waitForDisplayed({ timeout: 10_000, interval: 100 });
      await (await browser.$('.ink-titlebar')).click();
      await editor.scrollIntoView({ block: 'center', inline: 'nearest' });
      await editor.waitForClickable({ timeout: 5_000, interval: 100 });
      await editor.click();
      await browser.waitUntil(
        async () => browser.execute((surface) => (
          document.activeElement === surface || surface.contains(document.activeElement)
        ), editor),
        {
          timeout: 5_000,
          interval: 50,
          timeoutMsg: `round ${index + 1} editor did not receive native keyboard focus`,
        },
      );

      const startedAt = Date.now();
      await browser.keys(['Control', 'End']);
      await browser.keys('Enter');
      await browser.keys(marker);
      await browser.waitUntil(
        async () => browser.execute((expectedMarker) => (
          document.querySelector('.tiptap-content .ProseMirror')?.textContent?.includes(expectedMarker) ?? false
        ), marker),
        {
          timeout: 5_000,
          interval: 50,
          timeoutMsg: `round ${index + 1} marker "${marker}" did not enter the real ProseMirror body`,
        },
      );

      const chips = await browser.$$('.panel-inspector .preset-chip');
      let targetChip = null;
      for (const chip of chips) {
        if ((await chip.getText()).includes(presetName)) {
          targetChip = chip;
          break;
        }
      }
      expect(Boolean(targetChip), `round ${index + 1} preset "${presetName}" exists`).to.equal(true);
      await targetChip.scrollIntoView({ block: 'center', inline: 'nearest' });
      await targetChip.waitForClickable({ timeout: 5_000, interval: 100 });
      await targetChip.click();

      await browser.waitUntil(
        async () => browser.execute((expectedMarker, expectedPreset) => {
          const host = document.querySelector(
            '.panel-stage .device-screen [data-platform-editor-host="wechat"]',
          );
          const activePreset = Array.from(document.querySelectorAll('.panel-inspector .preset-chip.active'))
            .some((chip) => (chip.textContent || '').includes(expectedPreset));
          return activePreset && (host?.textContent || '').includes(expectedMarker);
        }, marker, presetName),
        {
          timeout: 20_000,
          interval: 100,
          timeoutMsg: `round ${index + 1} did not settle marker "${marker}" with preset "${presetName}"`,
        },
      );

      const renderTimeText = await browser.execute(() => (
        document.querySelector('.stat-item.render-time')?.textContent || ''
      ));
      const renderTimeMatch = renderTimeText.match(/([\d.]+)\s*ms/i);
      expect(renderTimeMatch, `round ${index + 1} exposes the real preview render time`).to.not.equal(null);
      const renderTime = Number.parseFloat(renderTimeMatch[1]);
      const wallTime = Date.now() - startedAt;
      expect(Number.isFinite(renderTime), `round ${index + 1} render time is finite`).to.equal(true);
      renderTimes.push(renderTime);
      wallTimes.push(wallTime);
      rounds.push({ round: index + 1, marker, presetName, renderTime, wallTime });
    }

    await browser.pause(600);
    const finalMarker = `INKFORGE-PERF-${String(presetNames.length).padStart(2, '0')}`;
    const finalProbe = await browser.execute((marker) => {
      const host = document.querySelector(
        '.panel-stage .device-screen [data-platform-editor-host="wechat"]',
      );
      const activePreset = Array.from(document.querySelectorAll('.panel-inspector .preset-chip.active'))
        .find((chip) => (chip.textContent || '').includes('赤陶旗舰'));
      return {
        markerPresent: (host?.textContent || '').includes(marker),
        finalPresetActive: Boolean(activePreset),
        coverPresent: Boolean(host?.querySelector('[data-ink-svg="cover-grid"]')),
        dividerPresent: Boolean(host?.querySelector('[data-ink-svg="divider-forge"]')),
        editorDisplayed: Boolean(document.querySelector('.tiptap-content .ProseMirror')?.offsetParent),
      };
    }, finalMarker);
    expect(finalProbe).to.deep.equal({
      markerPresent: true,
      finalPresetActive: true,
      coverPresent: true,
      dividerPresent: true,
      editorDisplayed: true,
    });

    const sortedRenderTimes = [...renderTimes].sort((a, b) => a - b);
    const sortedWallTimes = [...wallTimes].sort((a, b) => a - b);
    const percentile = (values, fraction) => values[Math.ceil(values.length * fraction) - 1];
    const metrics = {
      rounds,
      renderP50: percentile(sortedRenderTimes, 0.5),
      renderP95: percentile(sortedRenderTimes, 0.95),
      wallP50: percentile(sortedWallTimes, 0.5),
      wallP95: percentile(sortedWallTimes, 0.95),
    };
    expect(metrics.renderP95, 'preview render p95 remains below a visible two-second freeze').to.be.below(2_000);
    expect(metrics.wallP95, 'native edit + preset settle p95 remains below five seconds').to.be.below(5_000);

    await browser.saveScreenshot(path.join(EVIDENCE_DIR, 'native-preview-performance-20260802.png'));
    // eslint-disable-next-line no-console
    console.log(`[svg-render] native preview performance: ${JSON.stringify(metrics)}`);
  });
});
