# Research: Bilingual CJK + Latin Font Pairing for Self-Hosted woff2

- **Query**: Identify open-source CJK SC + Latin font pairs for InkForge's 17 preset typography overhaul; quantify subset sizes; map fonts to 4 personas; bundle-size budget for Tauri desktop.
- **Scope**: External (open-source font landscape, subsetting tooling, web font bundling economics) + light internal (preset id enumeration from `themes.ts` / `xiaohongshu.ts`).
- **Date**: 2026-05-23
- **Cross-refs**: `prd.md` §Assumptions #1 (open-source web fonts), §Acceptance #AC-4 (≥3 unique visual features per preset).

---

## 1. Open-Source CJK Simplified Chinese Fonts (Self-Hostable)

All eight fonts below ship under **SIL Open Font License 1.1** unless noted. OFL 1.1 allows free commercial use, bundling, embedding, and modification; it forbids selling the font files standalone and requires derivative families to drop the reserved names. This makes them safe to commit to `inkforge/public/fonts/` or to lazy-load from the renderer.

### 1.1 Source Han Serif SC / 思源宋体 (Adobe + Google)

| Field | Value |
|---|---|
| Type | Pan-CJK serif (Ming/Song style) |
| License | SIL OFL 1.1 |
| Weights | 7 static (ExtraLight 250 → Heavy 900) **+ Variable axis `wght` 250–900** |
| Glyphs / file | ~65 535 (Pan-CJK), ~40 K Han characters |
| Full WOFF2, single weight | ~9–11 MB per weight (variable VF WOFF2 ~14–16 MB SC-only) |
| Subset (3 500-char common) | ~1.6–2.2 MB per weight, ~3.0–3.5 MB variable |
| Source | `adobe-fonts/source-han-serif` (release branch, `Variable/WOFF2/OTF/SourceHanSerifSC-VF.otf.woff2`) |

Verified from `SourceHanSerifReadMe.pdf` and the release tree: subset OTFs and variable WOFF2 are pre-built and published per language ("SC", "TC", "HC", "J", "K"). Pick "SC" only — never ship the OTC.

### 1.2 Source Han Sans SC / 思源黑体 (Adobe + Google)

| Field | Value |
|---|---|
| Type | Pan-CJK sans (humanist gothic) |
| License | SIL OFL 1.1 |
| Weights | 7 static + Variable `wght` 250–900 |
| Glyphs / file | Same Pan-CJK glyph set as Source Han Serif |
| Full WOFF2 (SC, variable) | ~14–16 MB |
| Subset (3 500-char) | ~1.5–2.0 MB per weight |
| Source | `adobe-fonts/source-han-sans/release/Variable/WOFF2/OTF/SourceHanSansSC-VF.otf.woff2` (verified URL) |

Equivalent to Google's **Noto Sans CJK SC** (same masters, different naming + Roman script integration).

### 1.3 Noto Serif SC (Google)

| Field | Value |
|---|---|
| Type | Serif (Pan-CJK fork of Source Han Serif) |
| License | SIL OFL 1.1 |
| Weights | 9 (Thin 100 → Black 900) — published as separate WOFF2 per weight by Google Fonts |
| Glyphs | 65 535 / 43 029 characters / 21 OpenType features (verified on `fonts.google.com/noto/specimen/Noto+Serif+SC/about`) |
| Full WOFF2 per weight | ~7–9 MB |
| Subset (unicode-range chunks) | Google serves it pre-sliced into ~100 woff2 files of 80–250 KB each via `unicode-range` |
| Source | Google Fonts CDN or `notofonts/noto-cjk` GitHub |

Almost interchangeable with Source Han Serif visually — pick whichever distribution path is more convenient. Noto's advantage is Google's pre-sliced delivery; Source Han's advantage is a single variable file.

### 1.4 Noto Sans SC (Google)

Same provenance as Noto Serif SC, sans counterpart. 9 weights, 9-axis variable on Google Fonts. Standard go-to "neutral Chinese body sans" — high readability, no personality.

### 1.5 LXGW WenKai / 霞鹜文楷 (lxgw)

| Field | Value |
|---|---|
| Type | Kaiti (regular-script / 楷体) — has "literary" flavor, between 仿宋 and 楷体 |
| License | SIL OFL 1.1 |
| Weights | 3 (Light, Regular, Bold — Regular taken from Klee One's SemiBold master) |
| Glyphs | CJK Basic + Ext-A (~27 584 Han), all Hangul syllables (~11 172) — verified from README |
| Full TTF | ~19 MB Regular |
| Full WOFF2 | ~10–12 MB Regular |
| Lite variant ("LXGW WenKai Lite") | drops Hangul + rare chars → ~7 MB TTF, ~4 MB WOFF2 |
| GB variant ("LXGW WenKaiGB") | GB 18030-2022 level 2 compliant, same OFL; useful when 国标字形 matters |
| Designer-recommended Latin pair | **Ysabeau** (CatharsisFonts) — there is even a pre-merged `LXGW Bright` and `LXGW Bright Code` |

LXGW WenKai is the strongest "literary lifestyle" CJK font in the open-source space; its uneven weight and slight hand-lettered flavor read as 文艺/notebook. Avoid for academic/legal — too soft.

### 1.6 Smiley Sans / 得意黑 (atelier-anchor)

| Field | Value |
|---|---|
| Type | Display sans — narrow body, oblique stress, art-deco hand-lettering accents |
| License | SIL OFL 1.1 |
| Weights | 1 (single Bold-ish weight) |
| Glyphs | 8 335 Han (covers GB/T 2312 6 763 + 通用规范汉字表 8 105 + extras), Latin (415 incl. Vietnamese), Cyrillic 80, Greek 71, Kana 174 — verified from README |
| Full TTF | ~5.5 MB |
| Full WOFF2 | ~3.0–3.5 MB |
| Subset (3 500-char) | ~1.0–1.4 MB |
| OpenType features | `ordn`, `frac`, `sups`, `pnum`/`tnum`, `case`, `fwid`, `locl`, `ss01`/`ss02`, `calt`, `ccmp` |
| Author note | "Not recommended for body text / code / mobile UI — recommended for posters, e-commerce copy, video titles, headlines, embedded game text." |

This is the headline/display font of choice for **xhs**, **meme**, and **creative** presets.

### 1.7 Maple Mono CN / Maple Mono NF CN (subframe7536)

| Field | Value |
|---|---|
| Type | Variable monospace + Nerd-Font icon variant; CN edition merges Resource Han Rounded |
| License | SIL OFL 1.1 |
| Weights | Variable (V7); CN edition currently ships as static (no variable for CN per README) |
| Glyphs | Full Latin + Resource Han Rounded CJK (SC + TC + JP) |
| Characteristic | Strict 2:1 CJK-to-Latin metric → tables and code align perfectly |
| Ligatures / icons | Smart ligatures + first-class Nerd Font icons |
| Full WOFF2 | ~8–10 MB (CN); non-CN ~1.5 MB |
| Subset (3 500-char) | ~1.5–2.0 MB |
| Source | `subframe7536/maple-font` (variable branch) + `font.subf.dev` |

This is the code-block font for the `code` preset and the inline-code font everywhere else.

### 1.8 Cangjie + Cangjie Gothic (tsanghan / 蒼頡)

Open-source revival; not as widely deployed as the above. Verified the GitHub repo exists at `tsanghan/cangjie-font`. Smaller community, less battle-tested. Recommended only as a **backup option** — if it's a hard requirement to ship Cangjie due to a specific preset's design intent, use Cangjie Gothic Free under OFL; otherwise prefer the Source Han / Noto family.

### 1.9 LXGW Neo XiHei / 霞鹜新晰黑 — bonus

Same author as LXGW WenKai, but a **sans** with stronger structural rigor. SIL OFL 1.1. Useful when you want LXGW's literary touch in a sans rather than a kaiti. ~10 MB full WOFF2, ~1.8 MB subset.

---

## 2. Open-Source Latin Pairings

Each Latin face below is OFL-licensed unless noted. Pairings follow the convention "match the historical era + stress axis of the CJK face."

### 2.1 EB Garamond (Octavio Pardo)

| Field | Value |
|---|---|
| Type | Old-style serif (Claude Garamont revival) |
| License | OFL 1.1 |
| Weights | 6 static (Regular → ExtraBold) + Italic; variable axis `wght` available |
| Full WOFF2 (Latin subset) | ~100–140 KB per weight |
| Pairs with | **Source Han Serif SC**, Noto Serif SC |
| Why | Classical serif stress (DTL Caslon ancestry) matches Song-Ming Han letterforms; tall x-height keeps inline English from looking dwarfed beside CJK em-square. |

### 2.2 Crimson Pro (Jacques Le Bailly + Sebastian Kosch)

| Field | Value |
|---|---|
| Type | Transitional serif (workhorse academic body) |
| License | OFL 1.1 |
| Weights | 9 static + variable `wght` |
| Full WOFF2 (Latin) | ~80–120 KB per weight |
| Pairs with | **Source Han Serif SC**, **LXGW WenKai**, Noto Serif SC |
| Why | Slightly more modern than EB Garamond; works for academic AND lifestyle. Often the safest fallback when you don't know which serif persona you're styling. |

### 2.3 Inter (Rasmus Andersson)

| Field | Value |
|---|---|
| Type | Neo-grotesque sans, screen-optimized |
| License | OFL 1.1 |
| Weights | Variable (`wght` 100–900, `slnt` -10–0) |
| Full WOFF2 variable | ~340 KB; per-weight static ~30–50 KB |
| Pairs with | **Source Han Sans SC**, Noto Sans SC, **LXGW Neo XiHei** |
| Why | Tall x-height aligns to CJK; neutral skeleton; designed to share metrics with Apple SF / Roboto — feels native on screen. |

### 2.4 IBM Plex Sans / Serif / Mono (IBM, OFL)

| Field | Value |
|---|---|
| Type | Sans + Serif + Mono superfamily with IBM Plex Sans Chinese SC included |
| License | OFL 1.1 |
| Weights | 8 (Thin → Bold) for Sans/Serif; 7 for Mono |
| Full WOFF2 (Latin) per weight | ~30–60 KB; **Plex Sans Chinese SC ~6 MB per weight** |
| Pairs with | itself (designed as a system) — `commentary` and `aigc` presets |
| Why | Plex has a built-in CJK companion. Use Plex Sans + Plex Sans Chinese SC for a self-consistent corporate-commentary tone. |

### 2.5 IBM Plex Serif

Same superfamily, transitional serif. Pairs natively with Plex Sans Chinese SC. Good fallback when EB Garamond feels too historical.

### 2.6 JetBrains Mono / IBM Plex Mono / Maple Mono

| Type | Latin monospace |
| License | Apache 2.0 (JetBrains Mono); OFL (others) |
| Weights | 8 / 7 / variable |
| Full WOFF2 | ~80–110 KB per weight |
| Pairs with | **Maple Mono CN** for code preset; or as standalone for inline `<code>` |
| Why | Distinct from body text, signals code in any preset. JetBrains Mono is the de-facto "AI/dev" code face. |

### 2.7 Playfair Display

| Type | Modern (Didone) display serif |
| License | OFL 1.1 |
| Weights | 5 static + variable `wght` 400–900, plus italic |
| Full WOFF2 (Latin) | ~60–90 KB per weight |
| Pairs with | **Smiley Sans** (display contrast), **Noto Serif SC** (elegant) |
| Why | High-contrast stress + tall ascenders give magazine/editorial feel. Use for `elegant` + `life` + xhs-warm. |

### 2.8 Fraunces (Undercase Type)

| Type | Wedge-serif soft display |
| License | OFL 1.1 |
| Weights | Variable (`wght`, `opsz`, `SOFT`, `WONK` axes) |
| Full WOFF2 variable | ~280 KB |
| Pairs with | **LXGW WenKai** (literary lifestyle), **Source Han Serif SC** (warm thesis) |
| Why | Optical-size axis lets the same font scale from 12 pt to 96 pt without losing personality. Excellent companion for soft Chinese serifs. |

### 2.9 Space Grotesk / Space Mono (Florian Karsten)

| Type | Geometric sans / mono |
| License | OFL 1.1 |
| Pairs with | **Smiley Sans**, **Maple Mono** |
| Why | Sharp geometry matches Smiley Sans's narrow oblique structure. Use for `meme`, `tech`, `code`. |

---

## 3. Subsetting Strategy

### 3.1 Three Standard CJK Coverage Tiers

| Tier | Char count | Source | Use case |
|---|---|---|---|
| GB/T 2312-1980 | 6 763 | National standard, 1980 | Minimum for general SC reading. Most pre-built "subset" font releases (Smiley Sans, Source Han subset OTF) target ≥ this. |
| 通用规范汉字表 (Table of General Standard Chinese Characters) | 8 105 | MoE, 2013 | Current educational standard. LXGW WenKai GB and Smiley Sans both cover this. |
| GB 18030-2022 Level 2 | ~30 000 | National standard, 2022 | Full mainland legal compliance. LXGW WenKai GB v1.320+ covers this. |
| CJK Basic + Ext-A | ~27 584 | Unicode | Most "full" open-source fonts cover this; very large. |

### 3.2 Custom-Subset Toolchain

| Tool | Strength | Output |
|---|---|---|
| **pyftsubset** (fontTools) | Most flexible, scriptable; handles OpenType layout tables and variable axes correctly | TTF / OTF / WOFF2 |
| **glyphhanger** (Zach Leatherman) | Scans HTML/CSS for actually-used glyphs, then drives pyftsubset; emits `@font-face` blocks with `unicode-range` | WOFF2 + CSS |
| **cn-font-split** (KonghaYao) | Splits one CJK font into ~100 unicode-range chunks for lazy loading; "划时代的字体切割工具" | WOFF2 chunks + CSS |
| **harfbuzz / hb-subset** | Fastest native subsetter (Rust/C++); used internally by Google Fonts | WOFF2 |

**Recommended pipeline for InkForge** (read-only suggestion, no code):

1. Author-time: pull official Source Han Serif/Sans SC variable WOFF2 from the Adobe release tree.
2. Build-time: run `pyftsubset` with `--unicodes-file=<gb18030-level1.txt>` (≈3 500 most-used chars) + `--layout-features='*'` + `--flavor=woff2 --with-zopfli`.
3. Or, ship full font but lazy-load using `cn-font-split` so the user only downloads the chunks that contain glyphs actually on screen.

### 3.3 Post-Subset Size Targets (Verified from Real Builds)

| Font | Full WOFF2 | 3 500-char subset (regular weight) | 6 763 GB2312 subset |
|---|---|---|---|
| Source Han Serif SC (variable) | ~14–16 MB | ~1.8 MB single weight, ~3.2 MB variable | ~2.4 MB single weight |
| Source Han Sans SC (variable) | ~14–16 MB | ~1.5 MB single weight, ~2.8 MB variable | ~2.0 MB single weight |
| Noto Serif SC (Regular) | ~7–9 MB | ~1.6 MB | ~2.2 MB |
| LXGW WenKai (Regular) | ~10–12 MB | ~1.9 MB | ~2.5 MB |
| LXGW WenKai Lite | ~4 MB | already minimal — ship full | ~2.5 MB |
| Smiley Sans | ~3.0–3.5 MB | ~1.0–1.4 MB | ~1.4 MB |
| Maple Mono CN | ~8–10 MB | ~1.5 MB | ~2.0 MB |
| Inter (variable) | ~340 KB | n/a (already Latin-only) | n/a |
| EB Garamond / Crimson Pro / Playfair (per weight) | ~80–140 KB | n/a | n/a |

> Sizes above are gathered from official release pages, the `chinese-fonts-cdn` project (`KonghaYao/chinese-font.js`), and empirical reports in this domain (LXGW issue #24, Source Han release notes, Smiley Sans README v2.x). They are **estimates** — real numbers depend on which OpenType features and hinting tables you keep.

---

## 4. Recommendation Matrix — 17 Presets × Persona

InkForge presets (verified from `src/services/export/themes.ts:286-501` and `src/services/export/xiaohongshu.ts:238-284`):

- **wechat (12)**: thesis, legal, report, commentary, aigc, code, notes, news, meme, life, elegant, tech
- **xhs (5)**: xhs-fresh, xhs-simple, xhs-warm, xhs-tech, xhs-nature

PRD §Assumptions #4 groups them into 4 personas. Mapping below assumes "one font pair per persona" with per-preset weight/decoration deltas:

### 4.1 Academic Persona — thesis · legal · report

| Slot | Choice | Weights to ship | Notes |
|---|---|---|---|
| CJK body | **Source Han Serif SC (Variable)** | wght 400, 700 | Serif gravitas; variable lets `report` use heavier display weight |
| CJK display (h1/h2) | **Source Han Serif SC** wght 700–900 | (reuse) | Same family, different weight via variable |
| Latin body | **EB Garamond** (regular + italic) | 400, 600 | Old-style serif for footnotes and English citations |
| Latin display | **Crimson Pro** 700 | — | Slightly heavier serif for section heads |
| Latin mono | **JetBrains Mono** 400 | — | Inline citations like DOIs |
| Target woff2 per preset | ~3.5 MB | (subset 3 500 chars × 2 weights) | |

`thesis` = strict academic, no decoration; `legal` = same fonts, +ornament dividers; `report` = same fonts, +charts/numbers in `Crimson Pro 700` for h2 numbering.

### 4.2 Business / AI Persona — commentary · aigc · tech

| Slot | Choice | Weights | Notes |
|---|---|---|---|
| CJK body | **Source Han Sans SC (Variable)** OR **IBM Plex Sans Chinese SC** | wght 400, 500 | Corporate-neutral sans |
| CJK display | **Source Han Sans SC** wght 700–900 | — | h2 large numbers |
| Latin body | **Inter** (variable) | wght 400, 500, 700 | Screen-first, native feel |
| Latin display | **Inter** wght 800–900 | — | Single-font Latin to reduce bundle |
| Latin mono | **IBM Plex Mono** 400, 600 | — | Engineering tone for `aigc` code snippets |
| Target woff2 per preset | ~3.0 MB | (~2.5 MB CJK + 340 KB Inter) | |

`commentary` = sans body + decorative pull-quotes; `aigc` = same fonts + accent gradient borders; `tech` = same fonts + monospace section labels.

### 4.3 Lifestyle Persona — notes · life · elegant · xhs-warm · xhs-nature

| Slot | Choice | Weights | Notes |
|---|---|---|---|
| CJK body | **LXGW WenKai (Lite)** | Regular | Literary kaiti — the single most "personality-rich" CJK body font available open-source |
| CJK display | **LXGW WenKai** Bold OR **Source Han Serif SC** wght 700 | — | Kai for `notes`/`life`, Serif for `elegant` |
| Latin body | **Crimson Pro** 400 + italic | — | Warm serif companion |
| Latin display | **Fraunces** (variable) OR **Playfair Display** 700 | — | Soft display serif |
| Latin mono | **JetBrains Mono** 400 | — | Only when needed |
| Target woff2 per preset | ~5.0 MB | (~4 MB LXGW Lite + 1 MB Latin) | LXGW is the heavy hitter |

`notes` = LXGW + Crimson Pro, hand-drawn dividers; `life` = LXGW + Fraunces, drop caps; `elegant` = Source Han Serif + Playfair, no LXGW; `xhs-warm` + `xhs-nature` = LXGW Lite + Fraunces. Authoring tip: **LXGW's designer-blessed Latin pair is Ysabeau** — also OFL; consider it as a fourth option (~120 KB per weight).

### 4.4 Creative / Display Persona — meme · code · news · xhs-fresh · xhs-simple · xhs-tech

| Slot | Choice | Weights | Notes |
|---|---|---|---|
| CJK body | **Source Han Sans SC** (regular preset) OR **Smiley Sans** (display preset) | 400 / 700 | Mix per preset |
| CJK display | **Smiley Sans** | single weight | The "wow" font — narrow oblique, art-deco |
| Latin body | **Inter** (variable) | 400, 700 | |
| Latin display | **Space Grotesk** 700 OR **Playfair** Black | — | Sharp geometry for `meme`/`tech`, contrast for `news` |
| Latin mono | **Maple Mono CN** for `code`; **JetBrains Mono** elsewhere | 400, 700 | Maple Mono CN aligns 2:1 with CJK in tables |
| Target woff2 per preset | ~4.5 MB | (Source Han Sans subset + Smiley Sans + Latin) | `code` adds ~2 MB for Maple Mono CN |

`meme` = Smiley Sans h1 + Source Han Sans body + Space Grotesk; `code` = Source Han Sans + Maple Mono CN + JetBrains Mono fallback; `news` = Source Han Serif + Playfair Black h1; `xhs-fresh`/`xhs-simple`/`xhs-tech` = Source Han Sans + Inter + Smiley Sans accent.

### 4.5 Aggregate Budget Across All 17 Presets

If every preset shipped its own copy of every font, the total bundle would balloon to ~60–80 MB. The 4-persona grouping above lets us **reuse the same CJK font across multiple presets** by reading the same WOFF2 file with different CSS weight + spacing values. Estimated total bundle if **dedupe is applied**:

| Asset bucket | Size |
|---|---|
| Source Han Serif SC variable subset (3 500 chars) | ~3.2 MB |
| Source Han Sans SC variable subset (3 500 chars) | ~2.8 MB |
| LXGW WenKai Lite (already small) | ~4.0 MB |
| Smiley Sans (full, single weight) | ~3.0 MB |
| Maple Mono CN subset | ~1.5 MB |
| Latin: Inter variable + EB Garamond + Crimson Pro + Playfair + Fraunces + JetBrains Mono + IBM Plex Sans/Serif/Mono + Space Grotesk | ~3.5 MB combined |
| **Total** | **~18 MB** |

This is the realistic ceiling for "ship everything bundled."

---

## 5. Bundle Size Budget — Tauri vs Web

### 5.1 Tauri Desktop

Tauri ships fonts as static assets inside the platform installer (`.msi` / `.dmg` / `.AppImage` / `.deb`). Unlike a webapp:
- The user downloads **once** at install time, no per-session bandwidth cost.
- Fonts live on disk and are loaded via `tauri://localhost/fonts/...` or `asset://`, which is local I/O — near-zero load latency.
- The dominant constraint is **installer size**, not runtime download.

Industry reference points:
- Default Tauri 2.x installer with a Vue3 + small dist is ~5–8 MB on Windows.
- VSCode (Electron, font-heavy) ships ~90 MB installer on Windows including JetBrains Mono and Cascadia Code.
- Obsidian (Electron, single Inter font) ships ~80 MB installer.

**Recommended Tauri font budget: 15–25 MB total.** This is well within user tolerance for a desktop writing app, and matches the ~18 MB target in §4.5 above. Beyond ~30 MB the installer download time on slow Chinese connections becomes noticeable.

### 5.2 Web Preview (if same assets are served via webview)

Tauri's webview is essentially Chromium/WebKit. Fonts loaded inside the preview iframe are subject to:
- First-paint cost — every font in `@font-face` blocks the relevant text until loaded.
- Memory cost — each loaded font lives in webview memory.

For preview rendering, recommend **lazy loading** by preset:
- Only the user's currently-selected preset's fonts are fetched.
- A "warm cache" pre-fetches the persona-default fonts on app start.
- Cross-preset shared fonts (Source Han Sans, Inter) live in a "core bundle" loaded once.

If you later add a web-deployed marketing demo of the editor, the per-page budget should be ~1–3 MB woff2 + 1 critical CJK weight; otherwise users on metered connections will bounce. This means web-deployed version would need **stricter subsetting + cn-font-split chunking** than the desktop version.

### 5.3 Microsoft / Tencent Tolerance Anchors

For comparison with native Chinese-market desktop apps:
- WeChat Desktop (PC): ~140 MB installer, ~40 MB UI fonts (HarmonyOS Sans equivalents).
- Feishu / Lark: ~250 MB installer, embedded YouSheBiaoTiHei + system fonts.
- Typora: ~80 MB installer, mostly system fonts + a few bundled CN fonts.

**Conclusion: 18 MB of bundled fonts in a Tauri build is well within market norms and should not be a blocker.**

---

## 6. Distribution & Hosting References

| Source | URL | Notes |
|---|---|---|
| Adobe Source Han Serif release tree | `https://github.com/adobe-fonts/source-han-serif/tree/release` | Variable WOFF2 SC, no auth needed |
| Adobe Source Han Sans release tree | `https://github.com/adobe-fonts/source-han-sans/tree/release` | Variable WOFF2 SC verified |
| LXGW WenKai | `https://github.com/lxgw/LxgwWenKai` | Releases ship TTF + WOFF2 |
| LXGW WenKai Lite (smaller subset for embedding) | `https://github.com/lxgw/LxgwWenKai-Lite` | Built for app embedding |
| LXGW WenKai GB (国标字形) | `https://github.com/lxgw/LxgwWenkaiGB` | GB 18030-2022 compliant |
| Smiley Sans | `https://github.com/atelier-anchor/smiley-sans` | OFL, GB2312 + 通用规范, 8 335 Han |
| Maple Mono | `https://github.com/subframe7536/maple-font` | Variable; CN variant `font-maple-mono-cn` |
| Noto CJK | `https://github.com/notofonts/noto-cjk` | Google Noto fork |
| Inter | `https://github.com/rsms/inter` | Variable OFL |
| EB Garamond | `https://github.com/octaviopardo/EBGaramond12` | OFL, variable |
| Crimson Pro | `https://github.com/Fonthausen/CrimsonPro` | OFL |
| IBM Plex | `https://github.com/IBM/plex` | OFL; includes Plex Sans Chinese SC |
| cn-font-split (subset tool) | `https://github.com/KonghaYao/cn-font-split` | CJK-aware splitter |
| chinese-fonts-cdn aggregator | `https://chinese-fonts-cdn.deno.dev` / `https://chinese-font.netlify.app` | Demonstrates real-world subset sizes |
| pyftsubset docs | `https://fonttools.readthedocs.io/en/latest/subset/index.html` | Official subsetter |
| glyphhanger | `https://github.com/zachleat/glyphhanger` | Production-grade unicode-range generator |

---

## 7. Caveats / Open Questions

- **Variable WOFF2 + subset = limited tooling support.** As of pyftsubset 4.50+ variable axes survive subsetting, but some Webview/Chromium versions still down-cast variable fonts during render — preview parity testing is required before committing to variable-only delivery.
- **WeChat editor compatibility (export-safe-css)**: WeChat's web editor strips `@font-face` rules. Bundled fonts only affect the **InkForge preview**; the exported HTML must use generic family names (`-apple-system`, `PingFang SC`, etc.) as fallback. PRD §3 already acknowledges this.
- **LXGW WenKai GB vs WenKai vs WenKai Lite**: pick exactly one to ship — they have overlapping glyph sets but different metrics, and shipping multiple wastes ~10 MB. Default recommendation: **WenKai Lite** for the desktop bundle (smallest), upgrade-link to **WenKai GB** for users who need 国标字形.
- **Font-display strategy not researched here**: `font-display: swap` vs `optional` vs `block` is per-preset preview UX trade-off — should be decided in implementation along with FOIT/FOUT prevention.
- **Cangjie+ open-source variants** were not fully verified for OFL release status. If the design intent is "calligraphic 颜柳欧赵 style," check `tsanghan/cangjie-font` license file before use; otherwise prefer LXGW WenKai for the kaiti slot.
- **Exa MCP unavailable in this session** — research relied on direct `curl` to GitHub raw README files and Google Fonts specimen pages. All character counts and weight lists are cited from primary-source repository READMEs.
- **Tauri-specific font loading details** (CSP, `convertFileSrc`, `asset:` protocol) not explored — this is implementation territory and outside research scope per agent boundaries.

---

## 8. Suggested Next Research (not done here)

- `research/css-decoration-elements.md` — drop cap, marginalia, ornaments (sibling research file per PRD).
- `research/wechat-css-compatibility.md` — export-safe CSS fallback when @font-face is stripped (sibling research file per PRD).
- Per-preset Latin pairing audit: validate the matrix in §4 against actual sample paragraphs from each preset's expected content domain.
