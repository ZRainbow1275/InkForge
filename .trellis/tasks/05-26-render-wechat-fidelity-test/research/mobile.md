# Mobile Responsiveness Audit — WeChat Fidelity Output

**Verdict: WARNING — CONCERNS (workable on iPhone 375px, marginal on 360px Android, table is the only real bottleneck)**

Audited: `正文1.0-wechat.html` (172KB, 0 images, 1 table, 0 links). Test viewports: 375px (iPhone), 360px (Android), 414px (Plus).

## 1. 677px clamp behavior on 375px viewport

`section#nice` carries inline `padding:0 4px` (not 16px — the prompt brief was off). The clamp wrapper `<div data-wechat-clamp="1" style="max-width:677px;margin:0 auto;">` collapses to 100% width on mobile because no min-width fights it. Effective content width: **375 − 8 = 367px** on iPhone, **352px on 360px Android**. At 16px font, that yields ~22 CJK chars per line — within the comfortable 20–28 reading range. **Workable, but tight on Android.** The 4px side padding is too thin; on real WeChat the wrapper element gets its own 16px article-page padding, which masks this, but inside the fidelity shell (no extra pad) text kisses the edge.

## 2. Table overflow risk — the only real failure mode

The single table (战略意图阶段表) is 3 columns wrapped in `<section style="overflow:hidden">…<table style="width:100%;border-collapse:collapse">`. **No `table-layout:fixed`** (grep confirmed 0 matches), so the browser uses `auto` algorithm. Each `td`/`th` has `word-break:break-word` (10 matches: 1 section + 9 cells), which saves Latin runs — but Chinese sentences with `<br>` line breaks like "• 2014 年，央行成立法定数字货币研究小组" force minimum content width based on the longest unbreakable run. On 343px effective width with 3 cols + borders + 10px×2 padding per cell, each column gets ~96px — barely enough for 5–6 CJK chars per line. Result: cells stack tall (5–8 lines each) but **no horizontal scroll**, because the outer `overflow:hidden` clips and `word-break` cooperates. The "shadow wrapper" with `border-radius:8px;overflow:hidden` is well-chosen for mobile.

## 3. Font scale — inline override defeats user accessibility setting

`section#nice` carries `font-size:16px` (verified — the test override won over the preset's 15px; 51 matches of `font-size:` in content but the root anchor is line 31's `font-size:16px`). Inline element styles override WeChat reader's user-pref font scale (XS/S/M/L/XL). **Accessibility regression for elderly readers who depend on size XL.** Smaller risk: `font-size:0.88em` on table headers + `font-size:0.92em` on h4 → on 16px base that's 14.1px/14.7px, below WeChat's recommended 15px minimum.

## 4. Touch target spacing — N/A but reading-time chip is correct

`linkCount=0` means no body-level tap targets to audit. The reading-time header (line 33) renders three pill-separated stats inline with 10px gap — non-interactive, so no 44×44 hit-area requirement applies. Pass.

## 5. word-break:break-word cascade

`section#nice` declares it; CSS inheritance does NOT propagate `word-break` to descendants by default, but child `<p>` elements don't redeclare a conflicting value, so it inherits via the box's effective styling in modern engines. Risk surface: only **1 long English run >15 chars** in the entire document (`BlinkMacSystemFont`, and it's in the standalone-doc `<head>` CSS, not body). Body content has no long URLs, no English compound terms ≥15 chars. **Effectively a no-op safeguard for this article.**

## 6. Dark-mode metadata absence

`enableDarkMode:false` → 0 `data-darkmode-*` attributes (verified). WeChat's reader has a global "护眼/夜间" mode that auto-inverts to dark bg. Without metadata, mmbiz uses heuristic inversion, which on 186 occurrences of `color:#004080` (deep navy) produces a **dim mid-blue on near-black bg, contrast ratio ~3.5:1 — below WCAG AA 4.5:1**. The strong/h3 brand color and the linear-gradient highlight backgrounds (`rgba(0,64,128,0.15)`) become near-invisible smudges. **Real readability hit for night-mode users.**

## 7. Payload size — inline-style duplication is the bloat driver

177 body `<p style="...">` tags each carry the identical ~107-char paragraph style (`padding:0;margin:0 0 1.15em;text-indent:0;line-height:1.75;margin-bottom:0.95em;text-align:justify`) — **~19KB of duplicated CSS, ~11% of total payload**. Plus 1042+ inline `<strong style="color:#004080;font-weight:700;background:linear-gradient(...);padding:0 0.1em">` segments (~135 chars each). On 3G (~400kbps), 172KB ≈ 3.4s — WeChat pre-fetches so user-perceptible TTFB is fine, but on metered networks this is wasteful. WeChat does NOT allow `<style>` blocks in posted articles, so de-duplication via classes isn't an option — but a build-time pass that emits CSS variables via inline `:root` style on `section#nice` and references them would not work either. **The bloat is structural to the paste-into-WeChat constraint; flag but don't fix.**

## Top 3 actionable fixes (ranked by mobile UX impact)

1. **Enable `enableDarkMode:true` in the fixture call** (`render-real-article.fidelity.test.ts:53`). Inject `data-darkmode-color="#FFFFFF|"` and `data-darkmode-original-color="#004080|#004080"` so WeChat night mode preserves the brand-blue intent rather than rendering it as a smudge. Highest impact, zero render-time cost.
2. **Add `table-layout:fixed` + explicit per-column width hints** in the WeChat table emitter (where the `<table style="width:100%">` is built). Even on this 3-col table mobile renders OK, but a 4-5 col table will overflow on 360px Android. Cheap insurance.
3. **Raise `section#nice` side padding from `0 4px` to `0 12px`** (or 16px on mobile). Prevents text kissing viewport edge when the article is opened outside the fidelity shell — i.e., real WeChat in-app browser without extra page chrome. Tiny diff, large polish gain.
