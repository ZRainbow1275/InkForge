/**
 * visual.spec.cjs — verifies the 05-28 visual elevation against real Tauri build.
 * Refs: docs/inkforge-brand-identity.md §§13–16, §12.4, §12.6.
 *
 * Notes
 *  - Tauri 1.x post-1.4 defaults `withGlobalTauri` to false. Vue imports
 *    appWindow directly from `@tauri-apps/api/window`; no `window.__TAURI__`.
 *    IPC reachability is verified by drag-region semantics + click-no-throw.
 *  - Vite/terser minifies CSS values (e.g. `180ms` → `.18s`,
 *    `#D95B3F` → `rgb(217,91,63)` only sometimes). Token assertions therefore
 *    normalize via parseFloat / regex rather than exact string match.
 *  - The Tauri binary embeds `inkforge/dist` at cargo build time. After any
 *    visual code change run `pnpm build && cargo build -p inkforge` to refresh.
 */
const { expect } = require('chai');

function timeMs(raw) {
  const v = String(raw).trim();
  if (v.endsWith('ms')) return parseFloat(v);
  if (v.endsWith('s')) return parseFloat(v) * 1000;
  return NaN;
}
function px(raw) {
  const v = String(raw).trim();
  if (v.endsWith('px')) return parseFloat(v);
  return NaN;
}

async function getCSSVar(name) {
  return browser.execute(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );
}

async function waitForTokens() {
  await browser.waitUntil(
    async () => {
      const v = await getCSSVar('--motion-base');
      return timeMs(v) === 180;
    },
    { timeout: 15_000, interval: 200, timeoutMsg: 'tokens.css never applied (--motion-base never resolved to 180ms)' },
  );
}

describe('InkForge — chrome', () => {
  before(async () => {
    await waitForTokens();
  });

  it('TitleBar present with 3 control buttons + seal slot', async () => {
    const titlebar = await browser.$('.ink-titlebar');
    expect(await titlebar.isExisting(), 'titlebar root').to.equal(true);

    const seal = await browser.$('.ink-titlebar__seal');
    expect(await seal.isExisting(), 'seal slot').to.equal(true);

    const btns = await browser.$$('.ink-titlebar__btn');
    expect(btns.length, '3 control buttons').to.be.at.least(3);

    const close = await browser.$('.ink-titlebar__btn--close');
    expect(await close.isExisting(), 'close btn').to.equal(true);
  });

  it('Max button click round-trips without throwing (IPC allowlist accepts)', async () => {
    const btns = await browser.$$('.ink-titlebar__btn');
    const max = btns[1];
    expect(await max.isClickable(), 'maximize button reachable').to.equal(true);
    await max.click();
    await browser.pause(300);
    await max.click();
    await browser.pause(200);
  });
});

describe('InkForge — brand mark', () => {
  it('TitleBar Forge Nib seal renders SVG body (rect + polygon + slit)', async () => {
    const counts = await browser.execute(() => {
      const seal = document.querySelector('.ink-titlebar .forge-nib-mark, .ink-titlebar__seal svg');
      if (!seal) return null;
      return {
        rects: seal.querySelectorAll('rect').length,
        polygons: seal.querySelectorAll('polygon').length,
      };
    });
    expect(counts, 'titlebar seal SVG present').to.not.equal(null);
    expect(counts.rects, 'kiln + slit + amber rects').to.be.at.least(3);
    expect(counts.polygons, 'graphite nib diamond').to.equal(1);
  });
});

describe('InkForge — tokens', () => {
  before(async () => {
    await waitForTokens();
  });

  it('Motion ladder matches §13 (instant 80, fast 120, base 180, slow 240)', async () => {
    expect(timeMs(await getCSSVar('--motion-instant')), 'instant').to.equal(80);
    expect(timeMs(await getCSSVar('--motion-fast')), 'fast').to.equal(120);
    expect(timeMs(await getCSSVar('--motion-base')), 'base').to.equal(180);
    expect(timeMs(await getCSSVar('--motion-slow')), 'slow').to.equal(240);
  });

  it('Typography rhythm matches §15 (14/22/34/56)', async () => {
    expect(px(await getCSSVar('--type-step-1')), 'step1').to.equal(14);
    expect(px(await getCSSVar('--type-step-2')), 'step2').to.equal(22);
    expect(px(await getCSSVar('--type-step-3')), 'step3').to.equal(34);
    expect(px(await getCSSVar('--type-step-4')), 'step4').to.equal(56);
  });

  it('Easing curve matches §13 (cubic-bezier ease-out-quart)', async () => {
    const ease = await getCSSVar('--ease-out-quart');
    // Minifier may strip spaces/leading zeros: cubic-bezier(0.22, 1, 0.36, 1) → cubic-bezier(.22,1,.36,1)
    expect(ease).to.match(/cubic-bezier\(\s*0?\.22\s*,\s*1\s*,\s*0?\.36\s*,\s*1\s*\)/);
  });

  it('Focus ring token contains Kiln double-stroke (§14)', async () => {
    const ring = await getCSSVar('--focus-ring');
    // Either hex preserved or RGB form.
    const hasKiln =
      ring.toUpperCase().includes('#D95B3F') ||
      /rgb\(\s*217\s*,\s*91\s*,\s*63\s*\)/.test(ring);
    expect(hasKiln, `kiln color in focus ring: ${ring}`).to.equal(true);
    expect(ring).to.match(/2px/);
    expect(ring).to.match(/4px/);
  });
});

describe('InkForge — theme cascade', () => {
  before(async () => {
    await waitForTokens();
  });

  it('Default lands in light theme on first launch', async () => {
    const theme = await browser.execute(
      () => document.documentElement.getAttribute('data-theme'),
    );
    expect(theme).to.equal('light');
  });

  it('Toggling data-theme to dark flips body background through Vellum→Char range', async () => {
    const before = await browser.execute(
      () => getComputedStyle(document.body).backgroundColor,
    );

    await browser.execute(() => {
      const root = document.documentElement;
      root.setAttribute('data-theme', 'dark');
      root.classList.remove('theme-light');
      root.classList.add('theme-dark');
    });
    await browser.pause(400);

    const after = await browser.execute(
      () => getComputedStyle(document.body).backgroundColor,
    );

    expect(before, 'background flipped').to.not.equal(after);

    await browser.execute(() => {
      const root = document.documentElement;
      root.setAttribute('data-theme', 'light');
      root.classList.remove('theme-dark');
      root.classList.add('theme-light');
    });
  });
});
