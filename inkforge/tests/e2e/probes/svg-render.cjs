/**
 * svg-render.cjs — one-off diagnostic, NOT a graded spec.
 *
 * Drives the running Tauri binary via tauri-driver + msedgedriver, opens the
 * ExportModal, selects each flagship preset (赤陶旗舰 / 铜绿旗舰 / 黄铜旗舰), and
 * dumps the geometry of every injected [data-ink-svg] module (bbox + viewBox +
 * width-vs-container delta) plus the #nice body-column width and the
 * chars/line estimate, for manual inspection. Mirrors probes/paint-h1.cjs.
 *
 * Does NOT live under specs/ so it stays out of the wdio spec glob.
 *
 * PREREQS (this probe does NOT build anything):
 *   pnpm build                     # refresh inkforge/dist (Tauri embeds it)
 *   cargo build -p inkforge        # → src-tauri/target/debug/InkForge.exe
 *   tauri-driver.exe + msedgedriver.exe available (see env below)
 *
 * Run: `node tests/e2e/probes/svg-render.cjs` (from inkforge/).
 *
 * Reads env TAURI_DRIVER_PATH, MSEDGE_DRIVER_PATH (fallbacks to ~/.cargo/bin
 * and ~/.local/bin respectively, mirroring wdio.conf.cjs / paint-h1.cjs).
 *
 * Architecture note: [data-ink-svg] modules are injected by preset.decorate
 * (composeSvgDecorate) which runs in the real export pipeline feeding the
 * ExportModal preview (`.preview-render`). The Stage mini-phone preview uses a
 * mock renderer (`#wechat-article`, 677px) that does NOT inject SVG — so this
 * probe inspects the ExportModal, not the Stage.
 */
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { remote } = require('webdriverio');

const TAURI_DRIVER = process.env.TAURI_DRIVER_PATH ||
    path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver.exe');
const MSEDGE_DRIVER = process.env.MSEDGE_DRIVER_PATH ||
    path.resolve(os.homedir(), '.local', 'bin', 'msedgedriver.exe');
const APP_BIN = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'src-tauri',
    'target',
    'debug',
    'InkForge.exe',
);

const FLAGSHIP_NAMES = ['赤陶旗舰', '铜绿旗舰', '黄铜旗舰'];

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function reachWorkstationExport(browser) {
    const onWorkstation = await browser.execute(
        () => location.pathname.startsWith('/workstation'),
    );
    if (!onWorkstation) {
        await browser.execute(() => {
            window.history.pushState({}, '', '/workstation');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
        await sleep(1200);
    }
    await browser.execute(() => {
        const bar = document.querySelector('.panel-stage .stage-collapsed-bar');
        if (bar) bar.click();
    });
    await sleep(400);
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
        return true;
    } catch {
        return false;
    }
}

async function openFlagshipPreview(browser, flagshipName) {
    await browser.execute(() => {
        const btn = document.querySelector('.panel-stage .stage-btn-secondary');
        if (btn && !btn.disabled) btn.click();
    });
    await browser.waitUntil(
        async () => browser.execute(
            () =>
                !!document.querySelector('.export-panel') &&
                document.querySelectorAll('.export-panel .preset-card').length > 0,
        ),
        { timeout: 12_000, interval: 300, timeoutMsg: 'ExportModal never mounted' },
    );
    await browser.execute(() => {
        const pills = Array.from(document.querySelectorAll('.export-panel .pill-btn'));
        const wechat = pills.find((p) => /微信/.test(p.textContent || '')) || pills[0];
        if (wechat && !wechat.classList.contains('active')) wechat.click();
    });
    await sleep(400);
    const clicked = await browser.execute((name) => {
        const cards = Array.from(document.querySelectorAll('.export-panel .preset-card'));
        const card = cards.find((c) => (c.textContent || '').includes(name));
        if (!card) return false;
        card.click();
        return true;
    }, flagshipName);
    if (!clicked) return false;
    try {
        await browser.waitUntil(
            async () => browser.execute(() => {
                const render = document.querySelector('.export-panel .preview-render');
                return !!render && render.querySelectorAll('[data-ink-svg]').length > 0;
            }),
            { timeout: 20_000, interval: 500 },
        );
    } catch {
        // fall through — dump whatever rendered
    }
    return true;
}

function dumpPreviewGeometry(browser) {
    return browser.execute(() => {
        const render = document.querySelector('.export-panel .preview-render');
        if (!render) return { error: 'no .preview-render' };

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
                viewBox: svg ? svg.getAttribute('viewBox') : null,
                widthAttr: svg ? svg.getAttribute('width') : null,
                secBox: secBox
                    ? { x: Math.round(secBox.x), y: Math.round(secBox.y), w: Math.round(secBox.width), h: Math.round(secBox.height) }
                    : null,
                svgBox: svgBox
                    ? { w: Math.round(svgBox.width), h: Math.round(svgBox.height) }
                    : null,
                parentW: parentBox ? Math.round(parentBox.width) : null,
                deltaToParent:
                    svgBox && parentBox
                        ? Math.round(Math.abs(svgBox.width - parentBox.width) * 100) / 100
                        : null,
            };
        });

        const niceEl = render.querySelector('#nice') || render;
        const niceBox = niceEl.getBoundingClientRect();
        const paras = Array.from(render.querySelectorAll('p'));
        let best = null;
        for (const p of paras) {
            const text = (p.textContent || '').trim();
            if (!text) continue;
            if (!best || text.length > best.len) best = { len: text.length, el: p };
        }
        let fontSizePx = 17;
        let paraW = niceBox.width;
        if (best) {
            fontSizePx = parseFloat(getComputedStyle(best.el).fontSize) || 17;
            paraW = best.el.getBoundingClientRect().width || niceBox.width;
        }

        return {
            moduleCount: sections.length,
            modules,
            niceWidth: Math.round(niceBox.width),
            hadNice: niceEl !== render,
            paraWidth: Math.round(paraW),
            fontSizePx: Math.round(fontSizePx),
            charsPerLine: Math.round(paraW / fontSizePx),
        };
    });
}

async function main() {
    console.log('[probe] spawning tauri-driver:', TAURI_DRIVER);
    console.log('[probe] msedgedriver:', MSEDGE_DRIVER);
    console.log('[probe] app binary:', APP_BIN);

    const driver = spawn(
        TAURI_DRIVER,
        ['--native-driver', MSEDGE_DRIVER],
        { stdio: ['ignore', 'inherit', 'inherit'] },
    );
    await sleep(1500);

    let browser;
    try {
        browser = await remote({
            hostname: '127.0.0.1',
            port: 4444,
            connectionRetryCount: 3,
            logLevel: 'warn',
            capabilities: {
                'tauri:options': { application: APP_BIN },
            },
        });

        await browser.waitUntil(
            async () => {
                try {
                    return await browser.execute(() => !!document.querySelector('.ink-titlebar'));
                } catch {
                    return false;
                }
            },
            { timeout: 30_000, interval: 300, timeoutMsg: '.ink-titlebar never appeared' },
        );
        await sleep(2000);

        const ready = await reachWorkstationExport(browser);
        console.log('[probe] workstation export reachable:', ready);
        if (!ready) {
            console.log(
                '[probe] No article loaded → 全屏导出 disabled. Open/create a draft ' +
                'first, then re-run. Nothing to dump.',
            );
            return;
        }

        for (const name of FLAGSHIP_NAMES) {
            console.log(`\n========== FLAGSHIP "${name}" SVG GEOMETRY ==========`);
            const opened = await openFlagshipPreview(browser, name);
            if (!opened) {
                console.log(`  (preset card "${name}" not found — skipped)`);
                continue;
            }
            const dump = await dumpPreviewGeometry(browser);
            console.log(JSON.stringify(dump, null, 2));

            // Quick verdicts.
            const verdicts = [];
            if (!dump.moduleCount) {
                verdicts.push('NO-SVG: zero [data-ink-svg] modules — decorate did not run');
            } else {
                const anyMissingViewBox = dump.modules.some((m) => !m.viewBox);
                if (anyMissingViewBox) verdicts.push('VIEWBOX-MISSING: a module <svg> lacks viewBox');
                const anyNonResponsive = dump.modules.some(
                    (m) => m.deltaToParent === null || m.deltaToParent > 2.5,
                );
                if (anyNonResponsive) verdicts.push('WIDTH-DRIFT: an <svg> width !≈ container (width:100% not honored?)');
                const anyZero = dump.modules.some((m) => !m.svgBox || m.svgBox.w === 0);
                if (anyZero) verdicts.push('PAINT-CULLED: an <svg> has 0-width bbox');
            }
            if (dump.niceWidth < 300 || dump.niceWidth > 460) {
                verdicts.push(`NICE-WIDTH-OUT-OF-BAND: ${dump.niceWidth}px (expected ~375, band 300–460)`);
            }
            if (dump.charsPerLine < 16 || dump.charsPerLine > 24) {
                verdicts.push(`CHARS-OUT-OF-BAND: ${dump.charsPerLine}/line (expected ~18–22, band 16–24)`);
            }
            if (!verdicts.length) verdicts.push('OK: modules responsive + viewBox present + column ~mobile width');
            console.log('  VERDICT:');
            verdicts.forEach((v) => console.log('    -', v));

            // Close the modal before the next preset.
            await browser.execute(() => {
                const close = document.querySelector('.export-panel .header-close');
                if (close) close.click();
            });
            await sleep(500);
        }
        console.log('\n====================================================\n');
    } finally {
        if (browser) {
            try { await browser.deleteSession(); } catch { /* ignore */ }
        }
        if (driver && !driver.killed) driver.kill();
    }
}

main().catch((err) => {
    console.error('[probe] FAILED:', err.stack || err);
    process.exit(1);
});
