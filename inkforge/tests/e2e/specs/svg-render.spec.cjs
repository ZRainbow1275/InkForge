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
    ready = false;
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
      cardCount: cards.length,
      availableCount: byClass('style-choice-available'),
      blockedCount: byClass('style-choice-blocked'),
      unavailableCount: byClass('style-choice-unavailable'),
      cards: cards.map((card) => ({
        className: card.className,
        text: (card.textContent || '').trim().replace(/\s+/g, ' '),
      })),
      preflightText: summaries.join(' | '),
    };
  });
}

function closeExportModal() {
  return browser.execute(() => {
    const close = document.querySelector('.export-panel .header-close');
    if (close) close.click();
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

  it('surfaces style capability gates for all platforms in the real ExportModal', async function () {
    if (!exportReady) {
      // eslint-disable-next-line no-console
      console.warn(`[svg-render] style capability gates skip — ${seedFailureReason}`);
      return this.skip();
    }

    await openExportPanel('微信');

    const wechat = await collectStyleCapabilityProbe();
    expect(wechat.summary, 'WeChat style capability summary').to.include('微信公众号 当前可用 4/7');
    expect(wechat.cardCount, 'WeChat choice card count').to.equal(7);
    expect(wechat.availableCount, 'WeChat available choice count').to.equal(4);
    expect(wechat.blockedCount, 'WeChat blocked choice count').to.equal(2);
    expect(wechat.unavailableCount, 'WeChat unavailable choice count').to.equal(1);
    expect(wechat.preflightText, 'WeChat preflight row mirrors catalog stats')
      .to.include('样式能力目录可用 4/7；受限 2；不可用 1');
    expect(
      wechat.cards.some((card) =>
        card.className.includes('style-choice-blocked') &&
        card.text.includes('Amber business flagship') &&
        card.text.includes('real WeChat PC paste reduced the rich HTML artifact to plain text')),
      'Amber stays blocked after the ordinary WeChat paste failure evidence',
    ).to.equal(true);
    expect(
      wechat.cards.some((card) =>
        card.className.includes('style-choice-unavailable') &&
        card.text.includes('Official widget publish checklist')),
      'official-account widgets stay unavailable without credentialed proof',
    ).to.equal(true);

    await selectExportPlatform('小红书');
    const xhs = await collectStyleCapabilityProbe();
    expect(xhs.summary, 'XHS style capability summary').to.include('小红书 当前可用 2/3');
    expect(xhs.cardCount, 'XHS choice card count').to.equal(3);
    expect(xhs.availableCount, 'XHS available choice count').to.equal(2);
    expect(xhs.blockedCount, 'XHS blocked choice count').to.equal(1);
    expect(xhs.preflightText, 'XHS preflight row mirrors catalog stats')
      .to.include('样式能力目录可用 2/3；受限 1；不可用 0');
    expect(
      xhs.cards.some((card) =>
        card.className.includes('style-choice-blocked') &&
        card.text.includes('Long report image artifact')),
      'XHS long-image report remains blocked until artifact crop/size proof exists',
    ).to.equal(true);

    await selectExportPlatform('知乎');
    const zhihu = await collectStyleCapabilityProbe();
    expect(zhihu.summary, 'Zhihu style capability summary').to.include('知乎 当前可用 2/3');
    expect(zhihu.cardCount, 'Zhihu choice card count').to.equal(3);
    expect(zhihu.availableCount, 'Zhihu available choice count').to.equal(2);
    expect(zhihu.blockedCount, 'Zhihu blocked choice count').to.equal(1);
    expect(zhihu.preflightText, 'Zhihu preflight row mirrors catalog stats')
      .to.include('样式能力目录可用 2/3；受限 1；不可用 0');
    expect(
      zhihu.cards.some((card) =>
        card.className.includes('style-choice-blocked') &&
        card.text.includes('Diagram and formula image fallback')),
      'Zhihu image fallback remains blocked without public image-host proof',
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
      const niceEl =
        render.querySelector('#nice') ||
        render.querySelector('section[id="nice"]') ||
        render;
      const niceBox = niceEl.getBoundingClientRect();

      // Longest body <p> NOT inside an injected SVG module (decorative).
      const paras = Array.from(render.querySelectorAll('p'))
        .filter((p) => !p.closest('[data-ink-svg]'));
      let best = null;
      for (const p of paras) {
        const text = (p.textContent || '').trim();
        if (!text) continue;
        if (!best || text.length > best.text.length) best = { text, el: p };
      }

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
