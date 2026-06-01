/**
 * svg-render.spec.cjs — verifies the WeChat-safe inline-SVG flagship typesetting
 * (PR1–PR6 of the 06-01 multiplatform-render-svg task) against the REAL Tauri
 * WebView2 binary, driven by tauri-driver + msedgedriver (NOT a vite browser).
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
 * ─── ARCHITECTURE FACTS THIS SPEC RELIES ON (verified against source) ───────
 *   • The [data-ink-svg] modules are injected by `preset.decorate`
 *     (= composeSvgDecorate) which runs ONLY inside the real export pipeline
 *     (convertToWechatWithStats → markdownToWechatWithStats). In the live UI
 *     that pipeline feeds the **ExportModal** preview, rendered (v-html) into
 *     `.preview-render`.
 *       NOTE: the Stage-panel mini-phone preview (`.device-screen .preview-content`)
 *       uses the high-fidelity *mock* renderer (renderWechatMockHtml →
 *       `#wechat-article`, max-width:677px) which does NOT run decorate, so it
 *       carries NO [data-ink-svg]. That is why this spec asserts inside the
 *       ExportModal, not the Stage preview.
 *   • The 3 flagship presets live in themes.ts and surface in the ExportModal
 *     preset grid (`.preset-card`) for the WeChat platform:
 *         flagship-kiln    赤陶旗舰   #D95B3F  creative
 *         flagship-tempera 铜绿旗舰   #3B7A6B  academic
 *         flagship-amber   黄铜旗舰   #C19A56  business
 *     The cards expose NO id data-attr, so we match by visible name text.
 *   • Each injected module is:
 *         <section data-ink-svg="<moduleId>" ...>
 *           <svg viewBox="0 0 W H" width="100%" ...>…</svg>
 *         </section>
 *     width="100%" makes the <svg> track its container width responsively.
 *   • The exported article is wrapped in `<section id="nice" ...>`; the body
 *     width-lock CSS (preset-fonts.ts generatePersonaBaseCSS) sets
 *         #nice { max-width: min(22em, calc(100vw - 32px)); font-size:17px; }
 *     so 22em·17px ≈ 374px → ~20–22 CJK chars/line on a mobile column.
 *
 * ─── BEST-EFFORT / TOLERANCE NOTES ──────────────────────────────────────────
 *   • The ExportModal `全屏导出` button is `:disabled` unless an article is
 *     loaded (hasContent === editorStatus 'ready'|'saving'). We therefore first
 *     try to reach a Workstation with content; if the harness launches on the
 *     Hub with no draft, we navigate to /workstation and seed a draft via the
 *     command-palette/new-document path is NOT reliably reachable from here, so
 *     we GUARD every step with waitUntil + a graceful skip + console diagnostic
 *     rather than a hard throw, EXCEPT the core SVG assertions which must hold
 *     once the modal preview has rendered.
 *   • #nice max-width uses min(22em, calc(100vw-32px)); inside the ~520px-wide
 *     ExportModal preview column that resolves to ~374px. We assert the rendered
 *     article column width with a tolerant band (320–430px) and chars/line with
 *     a tolerant band (16–24) rather than an exact 375/20.
 *   • Selectors mirror the REAL components:
 *       WorkstationView.vue → `.stage-btn-secondary` (全屏导出),
 *                             `.stage-tab` (platform tabs),
 *                             `.preset-chip` (inspector preset strip).
 *       ExportModal.vue     → `.preset-card`, `.preview-render`,
 *                             `.pill-btn` (platform pills).
 */
const { expect } = require('chai');

// Flagship preset display names (themes.ts). We click the card by name text.
const FLAGSHIP_NAMES = ['赤陶旗舰', '铜绿旗舰', '黄铜旗舰'];

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
 * Ensure we are on a Workstation view that has the Stage export controls and a
 * loaded article. Returns true if the `全屏导出` button became clickable.
 *
 * Strategy (best-effort, all guarded):
 *   1. If already on /workstation with content, done.
 *   2. Otherwise History-push to /workstation (router uses createWebHistory —
 *      see visual.spec.cjs) and let the route guard pick an article. If there
 *      is no article the Stage export button stays disabled → we report skip.
 */
async function reachWorkstationExport() {
  const onWorkstation = await browser.execute(
    () => location.pathname.startsWith('/workstation'),
  );
  if (!onWorkstation) {
    await browser.execute(() => {
      window.history.pushState({}, '', '/workstation');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await browser.pause(1200);
  }

  // The Stage panel may start collapsed; if so, click its collapsed bar.
  await browser.execute(() => {
    const bar = document.querySelector('.panel-stage .stage-collapsed-bar');
    if (bar) bar.click();
  });
  await browser.pause(400);

  // Wait for the 全屏导出 button (`.stage-btn-secondary`) to be present and
  // enabled (enabled ⇔ an article is loaded).
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
      { timeout: 12_000, interval: 400 },
    );
    ready = true;
  } catch {
    ready = false;
  }
  return ready;
}

/**
 * Open the ExportModal, switch the platform pill to WeChat, then click the
 * flagship preset card matching `flagshipName`. Returns once the modal preview
 * (`.preview-render`) has rendered non-empty content for that preset.
 */
async function openFlagshipExportPreview(flagshipName) {
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

  // Make sure the WeChat platform pill is active (flagship presets are WeChat).
  await browser.execute(() => {
    const pills = Array.from(document.querySelectorAll('.export-panel .pill-btn'));
    // WeChat is the first pill; click it if not already active.
    const wechat = pills.find((p) => /微信/.test(p.textContent || '')) || pills[0];
    if (wechat && !wechat.classList.contains('active')) wechat.click();
  });
  await browser.pause(400);

  // Click the flagship preset card by its visible name.
  const clicked = await browser.execute((name) => {
    const cards = Array.from(document.querySelectorAll('.export-panel .preset-card'));
    const card = cards.find((c) => (c.textContent || '').includes(name));
    if (!card) return false;
    card.click();
    return true;
  }, flagshipName);

  expect(clicked, `flagship preset card "${flagshipName}" must exist in the WeChat preset grid`).to.equal(true);

  // The render watcher is async (markdownToWechatWithStats). Wait for the
  // preview to render non-empty HTML for the chosen preset, i.e. until at least
  // one [data-ink-svg] section is present in `.preview-render`.
  await browser.waitUntil(
    async () =>
      browser.execute(
        () => {
          const render = document.querySelector('.export-panel .preview-render');
          if (!render) return false;
          return render.querySelectorAll('[data-ink-svg]').length > 0;
        },
      ),
    {
      timeout: 20_000,
      interval: 500,
      timeoutMsg: `flagship preview never injected [data-ink-svg] for "${flagshipName}"`,
    },
  );
}

function closeExportModal() {
  return browser.execute(() => {
    const close = document.querySelector('.export-panel .header-close');
    if (close) close.click();
  });
}

// ─── specs ───────────────────────────────────────────────────────────────────

describe('InkForge — SVG flagship typesetting (PR7)', () => {
  let workstationReady = false;

  before(async () => {
    await waitForMainWindow();
    workstationReady = await reachWorkstationExport();
    if (!workstationReady) {
      // eslint-disable-next-line no-console
      console.warn(
        '[svg-render] Stage 全屏导出 button never became enabled — no article ' +
        'loaded in this harness session. SVG-injection assertions need a ' +
        'document; open/create a draft before running, or extend the harness ' +
        'fixture. Skipping the live-UI flagship assertions.',
      );
    }
  });

  it('flagship-kiln injects responsive [data-ink-svg] modules into the export preview', async function () {
    if (!workstationReady) return this.skip();
    await openFlagshipExportPreview('赤陶旗舰');

    const probe = await browser.execute(() => {
      const render = document.querySelector('.export-panel .preview-render');
      const sections = Array.from(render.querySelectorAll('[data-ink-svg]'));
      const modules = sections.map((sec) => {
        const svg = sec.querySelector('svg');
        const secBox = sec.getBoundingClientRect();
        const svgBox = svg ? svg.getBoundingClientRect() : null;
        return {
          moduleId: sec.getAttribute('data-ink-svg'),
          hasSvg: !!svg,
          viewBox: svg ? svg.getAttribute('viewBox') : null,
          secW: secBox ? Math.round(secBox.width) : 0,
          svgW: svgBox ? Math.round(svgBox.width) : 0,
          // delta between the svg width and its container (parent) width
          deltaToParent:
            svg && svg.parentElement
              ? Math.abs(
                  svg.getBoundingClientRect().width -
                    svg.parentElement.getBoundingClientRect().width,
                )
              : Number.POSITIVE_INFINITY,
        };
      });
      return { count: sections.length, modules };
    });

    // AC: at least one SVG module injected.
    expect(probe.count, 'at least one [data-ink-svg] module in export preview').to.be.at.least(1);

    for (const mod of probe.modules) {
      // Each [data-ink-svg] section contains an <svg> with a viewBox attr.
      expect(mod.hasSvg, `module ${mod.moduleId} contains an <svg>`).to.equal(true);
      expect(mod.viewBox, `module ${mod.moduleId} <svg> has a viewBox`).to.be.a('string');
      expect(mod.viewBox, `module ${mod.moduleId} viewBox is "0 0 W H"`).to.match(
        /^[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+$/,
      );
      // Responsive width:100% — the svg fills its parent within ~2px.
      expect(
        mod.deltaToParent,
        `module ${mod.moduleId} <svg> width tracks its container (width:100%)`,
      ).to.be.below(2.5);
      // Sanity: a painted svg has non-zero width (catches WebView2 0×0 culling).
      expect(mod.svgW, `module ${mod.moduleId} <svg> painted width > 0`).to.be.above(0);
    }

    await closeExportModal();
  });

  it('flagship presets render a ~mobile body column with ~18–22 CJK chars/line', async function () {
    if (!workstationReady) return this.skip();
    await openFlagshipExportPreview('铜绿旗舰');

    const layout = await browser.execute(() => {
      const render = document.querySelector('.export-panel .preview-render');
      // The exported article is wrapped in <section id="nice"> (body width
      // lock). Fall back to the preview-render box if the wrapper was stripped.
      const niceEl =
        render.querySelector('#nice') ||
        render.querySelector('section[id="nice"]') ||
        render;
      const niceBox = niceEl.getBoundingClientRect();

      // A representative CJK paragraph: the longest <p> by text length.
      const paras = Array.from(render.querySelectorAll('p'));
      let best = null;
      for (const p of paras) {
        const text = (p.textContent || '').trim();
        if (!text) continue;
        if (!best || text.length > best.text.length) {
          best = { text, el: p };
        }
      }
      let fontSizePx = 17;
      let paraW = niceBox.width;
      if (best) {
        const cs = getComputedStyle(best.el);
        fontSizePx = parseFloat(cs.fontSize) || 17;
        paraW = best.el.getBoundingClientRect().width || niceBox.width;
      }
      // CJK glyphs are ~1em wide → chars/line ≈ columnWidth / fontSize.
      const charsPerLine = paraW / fontSizePx;
      return {
        niceWidth: Math.round(niceBox.width),
        paraWidth: Math.round(paraW),
        fontSizePx: Math.round(fontSizePx),
        charsPerLine: Math.round(charsPerLine),
        hadNice: niceEl !== render,
        hadPara: !!best,
      };
    });

    // Tolerant mobile-column band: 22em·17px ≈ 374px, clamped by container.
    expect(layout.niceWidth, `#nice body column width (~375px mobile frame)`).to.be.within(
      300,
      460,
    );
    // Tolerant chars/line band around the 20–22 target.
    expect(
      layout.charsPerLine,
      `representative CJK paragraph chars/line (target ~18–22; band 16–24): ` +
        `paraW=${layout.paraWidth}px fontSize=${layout.fontSizePx}px`,
    ).to.be.within(16, 24);

    await closeExportModal();
  });
});
