/**
 * paint-h1.cjs — one-off diagnostic, NOT a graded spec.
 *
 * Drives the running Tauri binary via tauri-driver + msedgedriver and dumps
 * the chrome control buttons' bbox + svg geometry. Used to confirm or refute
 * the H1 hypothesis (lucide-vue-next icons not rendering children inside
 * WebView2). Does NOT live under specs/ so it stays out of the spec glob.
 *
 * Run: `node tests/e2e/probes/paint-h1.cjs` (from inkforge/).
 *
 * Reads: env TAURI_DRIVER_PATH, MSEDGE_DRIVER_PATH (fallbacks to ~/.cargo/bin
 * and ~/.local/bin respectively, mirroring wdio.conf.cjs).
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

async function main() {
    console.log('[probe] spawning tauri-driver:', TAURI_DRIVER);
    console.log('[probe] msedgedriver:', MSEDGE_DRIVER);
    console.log('[probe] app binary:', APP_BIN);

    const driver = spawn(
        TAURI_DRIVER,
        ['--native-driver', MSEDGE_DRIVER],
        { stdio: ['ignore', 'inherit', 'inherit'] },
    );

    // Driver needs ~1s to bind.
    await new Promise(r => setTimeout(r, 1500));

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

        // Tauri 1.x shows splash first (520x340), then closes it + shows main
        // (1400x900) after 3s timeout or app_ready signal. Wait until we are
        // on the main window — detect via .ink-titlebar presence.
        await browser.waitUntil(
            async () => {
                try {
                    return await browser.execute(() => !!document.querySelector('.ink-titlebar'));
                } catch {
                    return false;
                }
            },
            { timeout: 30_000, interval: 300, timeoutMsg: '.ink-titlebar never appeared — probe never reached main window' },
        );
        // Extra settle time for layout/paint.
        await new Promise(r => setTimeout(r, 2000));

        const preflightVw = await browser.execute(() => ({
            vw: window.innerWidth,
            vh: window.innerHeight,
            url: location.href,
            title: document.title,
        }));
        console.log('[probe] preflight viewport+url:', JSON.stringify(preflightVw));

        const dump = await browser.execute(() => {
            const viewport = {
                vw: window.innerWidth,
                vh: window.innerHeight,
                dpr: window.devicePixelRatio,
            };
            const ttl = document.querySelector('.ink-titlebar');
            const ttlBox = ttl ? ttl.getBoundingClientRect() : null;
            const ctl = document.querySelector('.ink-titlebar__controls');
            const ctlBox = ctl ? ctl.getBoundingClientRect() : null;
            const ctlStyles = ctl ? getComputedStyle(ctl) : null;

            const btns = Array.from(document.querySelectorAll('.ink-titlebar__btn'));
            const buttons = btns.map((btn, i) => {
                const btnBox = btn.getBoundingClientRect();
                const btnStyles = getComputedStyle(btn);
                const svg = btn.querySelector('svg');
                const svgBox = svg ? svg.getBoundingClientRect() : null;
                return {
                    idx: i,
                    aria: btn.getAttribute('aria-label'),
                    btnBox: {
                        x: Math.round(btnBox.x),
                        y: Math.round(btnBox.y),
                        w: Math.round(btnBox.width),
                        h: Math.round(btnBox.height),
                    },
                    btnStyles: {
                        display: btnStyles.display,
                        visibility: btnStyles.visibility,
                        opacity: btnStyles.opacity,
                        color: btnStyles.color,
                        background: btnStyles.backgroundColor,
                    },
                    svgPresent: !!svg,
                    svgBox: svgBox ? {
                        x: Math.round(svgBox.x),
                        y: Math.round(svgBox.y),
                        w: Math.round(svgBox.width),
                        h: Math.round(svgBox.height),
                    } : null,
                    svgChildrenLen: svg ? svg.children.length : 0,
                    svgHtmlPreview: svg ? svg.outerHTML.slice(0, 220) : null,
                };
            });

            return {
                viewport,
                ttlBox: ttlBox ? {
                    x: Math.round(ttlBox.x),
                    y: Math.round(ttlBox.y),
                    w: Math.round(ttlBox.width),
                    h: Math.round(ttlBox.height),
                } : null,
                ctlBox: ctlBox ? {
                    x: Math.round(ctlBox.x),
                    y: Math.round(ctlBox.y),
                    w: Math.round(ctlBox.width),
                    h: Math.round(ctlBox.height),
                } : null,
                ctlStyles: ctlStyles ? {
                    display: ctlStyles.display,
                    visibility: ctlStyles.visibility,
                    opacity: ctlStyles.opacity,
                    position: ctlStyles.position,
                    isolation: ctlStyles.isolation,
                    transform: ctlStyles.transform,
                    backdropFilter: ctlStyles.backdropFilter || ctlStyles.webkitBackdropFilter,
                } : null,
                ttlBackdropFilter: ttl ? (getComputedStyle(ttl).backdropFilter || getComputedStyle(ttl).webkitBackdropFilter) : null,
                buttons,
            };
        });

        console.log('\n========== PAINT H1 PROBE DUMP ==========');
        console.log(JSON.stringify(dump, null, 2));
        console.log('========================================\n');

        // Verdict
        const verdicts = [];
        if (!dump.ttlBox || dump.ttlBox.w < 200) {
            verdicts.push('VIEWPORT-COLLAPSED: titlebar width < 200px — Tauri/WebView2 viewport not unfurled');
        }
        if (!dump.ctlBox || dump.ctlBox.w < 100) {
            verdicts.push('CONTROLS-MISSING: controls cluster width < 100px or absent');
        }
        const anyEmptySvg = dump.buttons.some(b => !b.svgPresent || b.svgChildrenLen === 0);
        if (anyEmptySvg) {
            verdicts.push('H1-CONFIRMED: at least one button has no svg or empty svg children — lucide DID NOT render');
        } else {
            verdicts.push('H1-NEGATIVE: all 3 buttons have non-empty svg children — lucide/inline SVG rendered correctly');
        }
        const anyZeroBox = dump.buttons.some(b => b.btnBox.w === 0 || b.btnBox.h === 0 || (b.svgBox && (b.svgBox.w === 0 || b.svgBox.h === 0)));
        if (anyZeroBox) {
            verdicts.push('PAINT-CULLED: at least one button or svg has 0×0 bbox — paint culling confirmed');
        }
        console.log('VERDICT:');
        verdicts.forEach(v => console.log('  -', v));
        console.log();
    } finally {
        if (browser) {
            try { await browser.deleteSession(); } catch { /* ignore */ }
        }
        if (driver && !driver.killed) driver.kill();
    }
}

main().catch(err => {
    console.error('[probe] FAILED:', err.stack || err);
    process.exit(1);
});
