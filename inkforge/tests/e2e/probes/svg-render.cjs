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
 *
 * Seeding note: the Stage 全屏导出 button is disabled until an article is loaded
 * (editor status 'ready'). Pinia is not on window, so we reach the live `article`
 * store through Vue's runtime (#app.__vue_app__ → provides → pinia._s) and call
 * the real addArticle + selectArticle, exactly like specs/svg-render.spec.cjs.
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

const SEED_TITLE = 'SVG 旗舰排版真机验证样稿';
const SEED_MARKDOWN = [
    '# SVG 旗舰排版真机验证样稿',
    '',
    '> 这是一段导语，用来触发封面与引用卡模块的真实注入流程。',
    '',
    '在墨铸的导出管线里，我们把高级排版编译成微信安全的内联矢量图形，',
    '让标题、分隔线、引用卡与结束标都成为可复用的参数化组件。',
    '',
    '## 章节标题触发标题头模块',
    '',
    '正文继续展开，混排英文 The quick brown fox 与中文段落，验证字体对的协同表现。',
    '',
    '### 三级标题触发竖线标题头',
    '',
    '这一段是较长的中文正文，用于测量每行折行后的汉字数量是否落在二十到二十二字的舒适区间。',
    '',
    '---',
    '',
    '> “真实渲染、真实跑通、零模拟。” —— 墨铸团队',
    '',
    '末段补充更多中文内容，确保文末结束标模块能够正确追加到正文之后。',
].join('\n');

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// Seed a real draft through the live Pinia `article` store (same bridge as the
// graded spec). Returns { ok, articleId } | { ok:false, reason }.
async function seedDraftViaPinia(browser, title, markdown) {
    return browser.execute((seedTitle, seedBody) => {
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
        try {
            const pinia = findPinia();
            if (!pinia) return { ok: false, reason: 'PINIA-UNREACHABLE' };
            const articleStore = pinia._s.get('article');
            if (!articleStore || typeof articleStore.addArticle !== 'function') {
                return { ok: false, reason: 'STORE-MISSING (article.addArticle)' };
            }
            return articleStore
                .addArticle({
                    title: seedTitle,
                    sourceUrl: 'e2e://svg-render-seed/' + Date.now(),
                    rawContent: seedBody,
                })
                .then((article) => {
                    if (!article || !article.id) return { ok: false, reason: 'CREATE-FAILED' };
                    articleStore.selectArticle(article.id);
                    return { ok: true, articleId: article.id };
                })
                .catch((err) => ({ ok: false, reason: 'ADD-ARTICLE-THREW: ' + (err && err.message ? err.message : String(err)) }));
        } catch (err) {
            return { ok: false, reason: 'SEED-EXCEPTION: ' + (err && err.message ? err.message : String(err)) };
        }
    }, title, markdown);
}

async function reachWorkstationExport(browser) {
    // Land on workstation so the editor store is active.
    await browser.execute(() => {
        if (!location.pathname.startsWith('/workstation')) {
            window.history.pushState({}, '', '/workstation');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    });
    await sleep(1000);

    // Seed + select a real draft.
    const seed = await seedDraftViaPinia(browser, SEED_TITLE, SEED_MARKDOWN);
    if (!seed || !seed.ok) {
        console.log('[probe] seeding failed:', seed && seed.reason);
        return false;
    }
    console.log('[probe] seeded draft:', seed.articleId);

    // Navigate to /workstation?id=<id> so route selection keeps it active.
    await browser.execute((id) => {
        window.history.pushState({}, '', `/workstation?id=${encodeURIComponent(id)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, seed.articleId);
    await sleep(1200);

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
            { timeout: 15_000, interval: 400 },
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
                viewBox: svg ? (svg.getAttribute('viewBox') || svg.getAttribute('viewbox')) : null,
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
                '[probe] Seeding a draft via the live Pinia store failed, or 全屏导出 ' +
                'stayed disabled. See the [probe] seeding log above for the precise ' +
                'reason. Nothing to dump.',
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
