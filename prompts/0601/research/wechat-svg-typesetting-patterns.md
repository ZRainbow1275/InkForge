# Research: Reusable, Parametric SVG Typesetting Modules for Premium WeChat / 公众号 Layouts

- **Query**: Catalog reusable, parametric inline-SVG (and SVG-equivalent) typesetting modules used by top Chinese content-formatting tools (秀米 xiumi, 135editor, mdnice, doocs/md, Redink) and premium 公众号 layouts (2024–2026). Per-module: SVG primitives, color/text parameterization, viewBox conventions, responsive sizing, WeChat-safe constraints. Plus: what makes layouts look high-end/大气/有设计感 vs templated; how to derive a distinctive visual language from a brand token system rather than copying a tool's stock library.
- **Scope**: Mixed (external repos/articles fetched via `urllib` + internal InkForge docs that themselves synthesize external research)
- **Date**: 2026-06-01

> **Tooling note for the reader.** In this session the dedicated web tools (`WebSearch`, `WebFetch`, `mcp__exa__*`) and ripgrep/Glob were all unavailable. External research was done by fetching raw source files and registry data over HTTPS via Python `urllib` (works), cross-referenced against three internal InkForge docs that were themselves built from a 2025–2026 全网调研 of doocs/md, lyricat/wechat-format, and md2oa. Where a claim rests only on the internal synthesis docs (not a live external fetch this session) it is marked **[internal-synth]**; where it rests on a file fetched live this session it is marked **[fetched]**.

---

## 0. TL;DR for the consumer of this report

1. **There is NO true "inline-SVG component library" standard in 公众号 land.** The dominant production reality is: WeChat's editor *strips* `<style>`, `<link>`, `class`, CSS vars, `@media`, and most pseudo-elements; and the safest assumption is that raw `<svg>` is unreliable. The two tool families solve "decoration" two completely different ways:
   - **秀米 / 135editor (visual editors)**: decoration is delivered as **`<section>`-nested boxes with fully inlined `style`** (rounded rects, borders, gradients-as-fallback-color, background-image rasters) — *not* as `<svg>`. The "SVG" you see in premium 公众号 layouts is mostly **animated/clickable SVG done as a separate hack** (the "SVG 互动" trick), which is fragile and not part of the reusable text-styling layer.
   - **mdnice / doocs/md / Redink (markdown→公众号 converters)**: decoration is delivered as **parametric CSS keyed off a primary color + font + base font-size**, then **`juice`-inlined into `style=` attributes and CSS-vars regex-replaced** before paste. SVG is used only for narrow cases (alert icons, KaTeX math, Mermaid) and is wrapped in compatibility shims.
2. **"Inline SVG" that you author for an InkForge-style module library is feasible but must obey a fallback discipline**: author the module as SVG for the in-app preview / other platforms, but for WeChat emit a CSS/`<section>` equivalent (or rasterize), because the body editor's SVG support is inconsistent across versions and the safe path is "treat SVG as an image that must live on WeChat's own CDN." **[fetched + internal-synth]**
3. **Distinctiveness ("不撞市面") is a token-derivation problem, not a clip-art problem.** InkForge's own brand doc already models the winning pattern: pick a *non-obvious palette* (赤陶 Kiln `#D95B3F` not generic red; 铜绿 Tempera not generic blue; 黄铜 Amber not generic gold), define a *signature ornament* (空心菱形 `◇◇◇`, asymmetric 72×3px Amber "Forge Line"), and *forbid the templated tells* (4-side equal frames, `border-left` color bar H2, full-bleed gradient title blocks). Every decorative module is then a parametric instance of that token system.

---

## 1. The hard constraint layer (this governs every module)

Two internal manuals (built from doocs/md + lyricat/wechat-format + md2oa research) plus the live doocs/md source agree on the constraint surface. The single most consequential — and **internally contradictory** — point is SVG support, flagged below.

### 1.1 WeChat editor strips / breaks (consensus)

| Stripped / broken | Consequence for a module library |
|---|---|
| `<style>`, `<link>` | All CSS must be **inlined** into `style=` attrs (via `juice`) |
| `class` attribute | Cannot ship a class-based component CSS file; must inline |
| CSS variables `var(--x)` | Must **regex-replace** `var(--md-primary-color)` → literal hex post-juice |
| `@media` queries | No responsive breakpoints — sizing must be intrinsic (`%`, `em`, `max-width`) |
| `:hover` / `:focus` | No interactive decoration |
| `::before` / `::after` | **Unreliable** — decorative glyphs must be **real DOM nodes**, not pseudo-elements |
| `display:flex` & friends | doocs/md's `postProcessForWechat` *actively removes* `flex`, `flex-direction`, `flex-wrap`, `justify-content`, `align-items`; use `display:table`/`table-cell` or `float` instead |
| `position:absolute/fixed`, `top/left` | Unreliable; use `transform:translate()` or negative margins |
| `linear-gradient` | Partially unsupported on some devices → **always provide a solid-color fallback** |
| `filter`, `backdrop-filter`, `clip-path`, `animation`, `transition`, `@keyframes` | Unsupported |
| External-domain images & `background-image` URLs | Won't load — images must be re-uploaded to WeChat's own media library |

Source: `docs/微信渲染规则.md` and `docs/platform-rendering-rules/wechat-rules.md` (internal, 2026-02-27 / 2025-26 调研) **[internal-synth]**; corroborated live by the doocs/md export-pipeline file list (`packages/core/src/theme/cssProcessor.ts`, `themeInjector.ts`, `themeExporter.ts`) fetched this session **[fetched]**.

### 1.2 The SVG contradiction (must resolve before building any "SVG module")

| Source | Claim about raw `<svg>` in 公众号 body |
|---|---|
| `docs/微信渲染规则.md` §1.1 & §3.5 | "⚠️ SVG — 部分支持，交互不支持; 需边界处理" → treat as **partially supported but lossy**; wrap with empty `<p>&nbsp;</p>` before/after to survive copy-paste; rewrite `<tspan>` fills for Mermaid. **[internal-synth]** |
| `docs/platform-rendering-rules/wechat-rules.md` §一 | "`<canvas>`, `<svg>` — SVG 内图片必须用微信素材库链接" → effectively **don't rely on inline `<svg>`**; any SVG-as-image must reference a WeChat-hosted asset. **[internal-synth]** |

**Resolution / what this means for a module library:** the safe contract is **two-channel rendering** — (a) author each module as clean inline `<svg>` (for in-app preview + 小红书/知乎 channels where it's safer) and (b) for WeChat emit a `<section>`/CSS fallback OR a rasterized image uploaded to WeChat media. This matches doocs/md's own behavior: it does NOT decorate headings/dividers with `<svg>`; it decorates with inlined CSS on `<h2>`/`<hr>` and only uses SVG for alert icons + math (where it then applies compatibility shims). **[fetched]**

### 1.3 WeChat-safe typography baseline (consensus)

- Body font-size **14–16px**, line-height **1.75–2.0**, letter-spacing **0.03–0.05em**, paragraph spacing **~1.5em**; max content width **~677px** (InkForge brand doc) / images ≤ **640px**.
- Safe property set: `font-*`, `color`, `margin/padding`, `line-height`, `letter-spacing`, `text-align`, `border`, `border-radius`, `box-shadow`, `background(-color)`, `display:block/inline-block/table/table-cell`, `width/max-width`, `float`, `overflow`, `transform` (cautious).
- First-element `margin-top` must be **zeroed** (WeChat injects top whitespace otherwise).

Source: `docs/微信渲染规则.md` §4, `docs/inkforge-brand-identity.md` §3, §5.1 **[internal-synth]**.

---

## 2. Module taxonomy (the deliverable table)

Each module is described as a **parametric template** taking `{primary}` (primary color), `{font}` (font stack), and `{base}` (base font-size in px). "WeChat-safe?" rates the *recommended build* (CSS/`<section>`), not raw `<svg>`.

| # | Module type | Recommended primitives (CSS/section build) | True-SVG primitives (preview / non-WeChat) | Parameters | viewBox convention | Responsive sizing | WeChat-safe? |
|---|---|---|---|---|---|---|---|
| **1a** | **Heading — number badge** (序号徽章标题) | `<span>` inline-block circle: `width/height`, `border-radius:50%`, `background:{primary}`, white number; title text in sibling `<span>` | `<svg viewBox="0 0 40 40">` `<circle cx=20 cy=20 r=18 fill={primary}/>` + `<text x=20 y=26 text-anchor=middle fill=#fff>01</text>` | `{primary}`, badge size, number, title | square `0 0 40 40` | `width` in px (no scaling); height auto | ✅ (CSS circle) / ⚠️ (svg) |
| **1b** | **Heading — ribbon / banner title** (色块/丝带标题) | `<h2>` as `display:table` (centered) OR `<section>` with `background:{primary}` solid (NOT gradient), white text, `padding`, `border-radius`. Asymmetric variant: bottom `border-bottom:3px solid {primary}` only | `<svg>` `<path>` ribbon with fold notches (`<polygon>`) | `{primary}`, fill vs outline, radius | `0 0 W H`, W≈600 | `width:100%`/`max-width`; intrinsic | ✅ (section) |
| **1c** | **Heading — bracket frame** (括号/边角框标题) | Real DOM corner marks: 4× `<span>` positioned with `border-top/left` etc., OR a `<section>` with `border:1px solid {primary}` + inset padding | `<svg>` 4 corner `<path>` L-shapes, `stroke={primary}` | `{primary}`, stroke width, corner length | `0 0 W H` | `width:100%` | ✅ (section) |
| **1d** | **Heading — numbered + asymmetric rule** (InkForge signature) | Big half-opacity numeral `<span>` (EB Garamond `01`) + title `<span>` + a `<div>` 72×3px `{accent}` "Forge Line", **left-aligned** | n/a (pure type + rect) | `{primary}` (numeral), `{accent}` (line), index | n/a | px line width fixed | ✅ |
| **2a** | **Divider — geometric / seal** (几何/印章分隔) | `<p text-align:center>` with real glyph nodes: `◇ ◇ ◇` colored `{primary}`, `letter-spacing` | `<svg viewBox="0 0 120 16">` 3× `<rect>` rotated 45° (diamonds) `fill={primary}` | `{primary}`, glyph, spacing, opacity | `0 0 120 16` (wide-short) | `max-width` ~120–200px, centered | ✅ (glyph) |
| **2b** | **Divider — gradient hairline** | `<hr>`/`<section>` `height:1px; background:linear-gradient(to right, transparent, rgba(0,0,0,.1), transparent)` **+ solid fallback** | `<svg>` `<line>` + `<linearGradient>` | `{primary}` or neutral, opacity | `0 0 W 2` | `width:100%`; `margin:2em 0` | ⚠️ (gradient device-dependent; fallback ✅) |
| **2c** | **Divider — dotted / dashed** | `<section>` `border-top:1px dashed {primary}` OR repeated dot glyphs `· · · ✿ · · ·` | `<svg>` `<line stroke-dasharray="2 6">` | `{primary}`, dash pattern, motif glyph | `0 0 W 2` | `width:100%` | ✅ |
| **2d** | **Divider — leaf / ink motif** (叶纹/水墨) | Center glyph node (`✿`/`🌿`/`❦`) flanked by two `border-top` lines built as `display:table` 3-cell row, OR a centered WeChat-hosted PNG | `<svg>` `<path>` botanical, `fill={primary}` | `{primary}`, motif | `0 0 200 24` | `max-width`, centered | ✅ (glyph+rule) |
| **3a** | **Quote — corner-bracket card** (引号角标卡) | `<section>` with big decorative `"` glyph node top-left (colored `{primary}`, large font, `line-height` clipped), body text below; `padding`, light bg `{primary}10` | `<svg>` `<text>“` or `<path>` quote mark | `{primary}`, bg alpha, quote glyph | `0 0 W H` | `width:100%` | ✅ |
| **3b** | **Quote — left-bar** (左色条引用) | `blockquote` `border-left:4px solid {primary}; background:{primary}10 or #f5f7f9; padding:1em 1.4em; border-radius:0 4px 4px 0` | n/a (pure CSS) | `{primary}`, bg, radius, italic on/off | n/a | `width:auto` | ✅ |
| **3c** | **Quote — card w/ shadow** (卡片阴影引用) | `<section>` rounded `border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,.05); background:#fff; padding` | n/a | `{primary}` accent edge, radius, shadow | n/a | `width:100%` | ✅ (shadow OK) |
| **4a** | **Badge — circular number** (圆形数字徽章) | inline-block `<span>` circle, `{primary}` fill, white centered digit (`display:inline-block`, `line-height=size`) | `<svg viewBox="0 0 32 32">` `<circle r=15 fill={primary}/>` + `<text>` | `{primary}`, digit, size | `0 0 32 32` | fixed px | ✅ (CSS) |
| **4b** | **Badge — tag / pill chip** (标签/胶囊) | `<span>` `display:inline-block; background:{primary}10; color:{primary}; border-radius:999px; padding:2px 10px; font-size:.85em` | `<svg>` `<rect rx=12>` + `<text>` | `{primary}`, fill alpha, label | `0 0 W 24` | intrinsic to text | ✅ |
| **4c** | **Badge — KPI / data chip** (数据/要点 KPI) | `display:table` cell group: big number `<span>` ({primary}, bold, 1.8–2.4em) + label `<span>` (Ash, .85em) stacked via `display:block` | `<svg>` `<text>` two tspans | `{primary}`, value, unit, label | `0 0 W H` | `display:table-cell` row (NOT flex) | ✅ (table layout) |
| **5a** | **End mark — "全文完"** (结束标) | centered `<p>` glyph row: `◇ ◇ ◇` or `· 全文完 ·` colored `{primary}`, small caps, letter-spacing | `<svg>` seal `<path>`/`<rect>` diamonds | `{primary}`, text, glyph | `0 0 120 16` | centered, fixed | ✅ (glyph) |
| **5b** | **Signature / logo lockup** (署名/logo锁版) | `<section>` centered: small WeChat-hosted logo PNG + name `<span>` + tagline `<span>`; or pure-type lockup (no raster) | `<svg>` logo (NOT WeChat-safe inline → rasterize) | `{primary}`, name, tagline, logo asset | brand mark box | centered, `max-width` | ✅ (raster on WeChat CDN) / ❌ (inline svg logo) |
| **6a** | **Cover / lead-in banner** (封面/导语 banner) | Full-width `<img>` (WeChat-hosted, ≤640–677px) for the *visual*;导语 as a `<section>` tinted `{primary}08` with left rule + italic intro text | `<svg>` decorative title plate (preview only) | `{primary}`, cover image, intro text | image native | `width:100%; max-width` | ✅ (image + section) |

> **Why so many "recommended = CSS/section, not SVG"**: this is exactly how 秀米/135editor ship their library (nested `<section>` boxes with inline styles + WeChat-hosted background rasters), and how doocs/md decorates headings/quotes/dividers (inline CSS on real elements). Raw inline `<svg>` is the *exception path* in every production tool examined. **[fetched + internal-synth]**

---

## 3. How each tool family actually builds these (with concrete code)

### 3.1 doocs/md — parametric CSS, juice-inlined, var-replaced (the markdown-converter pattern)

doocs/md is a monorepo (`apps/web`, `packages/core/src/theme/*`, `packages/shared/src/configs/theme-css/*`). Themes are **plain CSS files** authored with **one CSS variable as the parameter**: `var(--md-primary-color)`, plus `var(--md-font-size)` and `var(--foreground)`. The pipeline (`themeInjector` → `cssProcessor`/`juice` → `themeExporter`) injects the theme, inlines it, and **regex-replaces the vars with literal values** before paste. **[fetched]**

Source files fetched this session:
- Theme CSS: `https://raw.githubusercontent.com/doocs/md/main/packages/shared/src/configs/theme-css/grace.css` and `.../default.css`
- Theme engine: `packages/core/src/theme/{cssProcessor,cssVariables,selectorMapping,themeApplicator,themeExporter,themeInjector,cssScopeWrapper}.ts` (file list confirmed via GitHub tree API)

**Heading patterns, verbatim from `default.css` [fetched]:**
```css
/* H1 = centered, display:table, bottom rule in primary color */
h1 { display:table; padding:0 1em; border-bottom:2px solid var(--md-primary-color);
     margin:2em auto 1em; font-size:calc(var(--md-font-size) * 1.2); text-align:center; }
/* H2 = centered SOLID primary block, white text (the classic "ribbon" look) */
h2 { display:table; padding:0 .2em; margin:4em auto 2em; color:#fff;
     background:var(--md-primary-color); font-size:calc(var(--md-font-size) * 1.2);
     text-align:center; }
/* H3 = left color bar */
h3 { padding-left:8px; border-left:3px solid var(--md-primary-color);
     font-size:calc(var(--md-font-size) * 1.1); }
```

**Divider (`grace.css`) — gradient hairline [fetched]:**
```css
hr { height:1px; border:none; margin:2em 0;
     background:linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0.1), rgba(0,0,0,0)); }
```

**Blockquote (`grace.css`) — left-bar + radius + soft shadow [fetched]:**
```css
blockquote { font-style:italic; padding:1em 1em 1em 2em;
             border-left:4px solid var(--md-primary-color); border-radius:6px;
             color:rgba(0,0,0,.6); box-shadow:0 4px 6px rgba(0,0,0,.05); }
```

**Key parameterization takeaways (doocs/md) [fetched]:**
- The *only* color parameter is `--md-primary-color`; the *only* type parameters are `--md-font-size` (scaled with `calc(... * 1.2/1.3/1.4)`) and a font stack. This is the minimal "accept a primary color + font" contract the InkForge task asks for.
- **Scale is expressed as `calc(base * factor)`**, giving a deterministic type scale (1.0 / 1.1 / 1.2 / 1.3 / 1.4) — important for the "type scale" design principle in §5.
- Decoration lives on **real elements** (`h1/h2/h3/hr/blockquote`), never pseudo-elements, so it survives juice + WeChat.
- SVG appears ONLY as **alert icons** (`.alert-icon-note { fill:#478be6 }` etc. — fills are themed per alert type, not by primary color) and for math/Mermaid, which then get compatibility shims (`<tspan style="fill:#333 !important">`, empty `<p>` boundary nodes). **[fetched]**

### 3.2 mdnice — same converter family

mdnice (the original "微信 Markdown 编辑器") established the `#nice { ... }` scoping convention that doocs/md and InkForge both inherit (InkForge's preset `customCSS` examples all target `#nice h2`, `#nice blockquote`, etc.). Same model: CSS keyed on a primary color, inlined for paste, decoration on real elements. **[internal-synth — InkForge `docs/主题系统.md` reproduces the `#nice` selector convention and per-preset `customCSS` snippets]**

### 3.3 秀米 xiumi / 135editor — visual editors, `<section>` boxes + hosted rasters

These are WYSIWYG "drag a decorated box in" editors, not markdown converters. The output they paste into 公众号 is **deeply nested `<section>` elements with fully inlined `style`** (rounded rects via `border-radius`, color blocks, borders, soft `box-shadow`) plus **background images that are auto-uploaded to WeChat's media library**. The "SVG" interactivity seen in some premium accounts (scroll-to-reveal, click-to-flip) is the separate **"SVG 互动"** hack — pasted SVG markup that WeChat tolerates for a narrow feature set and that breaks easily; it is *not* the mechanism behind their everyday title/divider/quote modules. **[internal-synth — characterization consistent across the two internal rendering-rule manuals, which were built from 全网调研 of these editors; not independently re-fetched live this session — treat tool-internal HTML specifics as directional, verify against a real paste if precision matters]**

### 3.4 Redink / 小红书-style presets

The 小红书 family in InkForge's own preset system shows the "decoration = emoji glyph + rule" approach that mirrors Redink/小红书 aesthetics: heading auto-prefixed emoji (`🌸`/`◆`/`⚡`), themed `<hr>` replaced by a centered glyph divider (`· · · ✿ · · ·`), list bullets replaced by emoji, end-mark `✨ 感谢阅读 ✨`. All glyph-based (real text nodes), zero SVG — maximally paste-safe. **[internal-synth — `docs/主题系统.md` §二-A]**

| xhs preset | primary | heading emoji | bullet | divider |
|---|---|---|---|---|
| 清新少女 | `#FF2442` | 🌸🌷💐 | ✨ | `· · · ✿ · · ·` |
| 极简高级 | `#1A1A1A` | ◆◇▫ | ▸ | `———` |
| 温暖治愈 | `#D4A574` | 🧡💛🤎 | 🧡 | `· · · ♡ · · ·` |
| 科技数码 | `#4F46E5` | ⚡💫✦ | 🔹 | `· · · ⚡ · · ·` |
| 自然清新 | `#059669` | 🌿🍀🌱 | 🍃 | `· · · 🌿 · · ·` |

---

## 4. Parameterization recipe for a hand-authored, themeable module library

Synthesizing the doocs/md model (verified) into the contract the task asks for ("accept a primary color + font"):

```
Module(template) inputs:
  primary   : hex (e.g. #D95B3F)         // the one accent
  accent2   : hex (optional, e.g. #3B7A6B) // cool counter-accent for "breathing"
  font      : { display, body, mono } stacks
  base      : number px (16)             // drives calc() type scale
  tone      : { surface bg, hairline, muted text } neutrals from token system
```

**Rules that make the library reusable AND WeChat-safe:**
1. **Author twice, render by channel.** Keep a clean inline-`<svg>` master per module (for in-app preview / 小红书 / 知乎) and a `<section>`/CSS twin for WeChat. Never assume the SVG survives the 公众号 body.
2. **Color enters in exactly 3 ways**: `fill`/`stroke`/`color` = `{primary}`; tints = `{primary}` + 8–12% alpha for fills (doocs/md uses `{primary}10` ≈ 6% via `background:var(--md-primary-color)` with low-alpha hexes; InkForge brand uses `{primary}10`); white text on solid `{primary}` for the ribbon variant.
3. **No CSS vars in the shipped WeChat HTML** — compute literals at export. (Author with vars for DX, regex-replace on export exactly like doocs/md.)
4. **viewBox convention for the SVG masters**: square `0 0 40 40` for badges/number circles; wide-short `0 0 W 16–24` for dividers/end-marks; content-box `0 0 W H` for cards/banners. Always set `preserveAspectRatio` default and size via the wrapper's `width`/`max-width`, never via `width="40"` attribute alone (WeChat re-parses width attrs inconsistently → move to `style="width:Npx"`). **[fetched — img-attr→style rule in `微信渲染规则.md` §3.3]**
5. **Responsive sizing without `@media`**: full-width modules use `width:100%; max-width:677px`; fixed ornaments use px; type scales via `calc(base*factor)` so changing `base` rescales the whole system. No breakpoints exist on WeChat.
6. **Layout primitives**: use `display:table`/`table-cell` + `vertical-align`, `float`, `inline-block`, negative margins. NEVER `flex`/`grid` (stripped). NEVER `::before`/`::after` (use real glyph `<span>` nodes). **[fetched]**
7. **Gradients always carry a solid fallback** (set `background:{solid}` then `background:linear-gradient(...)` so non-supporting devices keep the solid). **[fetched]**

---

## 5. What makes a layout look "高级 / 大气 / 有设计感" vs templated

Distilled from the doocs/md type-scale mechanics (verified) + InkForge brand doc's explicit anti-templating rules (internal):

| Lever | "Templated / cheap" tell | "高级 / 大气" move |
|---|---|---|
| **Whitespace ratio** | Cramped; decoration touching text; ≤1.5 line-height | Generous: line-height **1.85–2.0**, paragraph gap ~1.2–1.5em, large margins around H2 (doocs/md uses `margin:4em auto 2em` on H2 — big vertical air is the "大气" signal). **[fetched]** |
| **Palette restraint** | 3+ saturated colors, rainbow emoji, full-bleed gradient title blocks | **One accent + one cool counter-accent + neutrals.** InkForge: Kiln + Tempera cold/hot "breathing," Amber sparingly. Ember-class accent used "≤2×/screen." |
| **Type scale** | Random sizes, bold everywhere | **Deterministic ratio** via `calc(base*1.0/1.1/1.2/1.3/1.4)` (doocs/md). One display face + one body face; weight contrast not color contrast. **[fetched]** |
| **Alignment grid** | Everything centered; mixed alignments | Consistent left-grid for body; *intentional* asymmetry for ornaments (InkForge "Forge Line" 72×3px **left-aligned**, image frame border on **bottom+right only**) reads as crafted, not stock. |
| **Decoration density** | A decorated box around every paragraph (秀米 over-use) | Decoration reserved for **structural beats** (H2, section divider, pull-quote, end-mark). Empty space does the work. |
| **Emphasis** | Pure-color bold runs | Half-height highlight tint (InkForge `strong { background:linear-gradient(180deg, transparent 65%, rgba(193,154,86,.22) 65%) }`) — subtle "highlighter" not loud color. |
| **Headings** | `border-left` color bar + background block (the "企业 PPT" tell, per InkForge §4.6) | Hierarchy from **numeral size contrast + a single thin metal rule**, no background block. |

Sources: type-scale & spacing numbers from doocs/md CSS **[fetched]**; the anti-templating rules, "≤2 ember/screen," asymmetric ornament, half-height highlight, and "no border-left/background-block H2 = PPT tell" framing from `docs/inkforge-brand-identity.md` §4 + MEMORY "Elevation: Quiet Press" **[internal-synth]**.

---

## 6. The "不撞市面" angle — deriving a distinctive language from tokens

InkForge's brand doc is itself a textbook case and the strongest internal reference for this exact question. The method **[internal-synth, `docs/inkforge-brand-identity.md` §2.4, §4]**:

1. **Pick a non-obvious palette by *narrative*, not by trend.** Every competitor reaches for blue `#0066cc` / red `#E74C3C` / purple `#6B5B95`. InkForge derives color from a "forge spectrum" story → 赤陶 Kiln `#D95B3F` ("not red, not orange, not coral"), 铜绿 Tempera `#3B7A6B`, 黄铜 Amber `#C19A56` ("not #FFD700 gold"), 宣纸 Vellum `#F5F0E6` ("warm white, not #FFF/#FAFAFA"), 高碳钢 Graphite `#252933` ("blue-undertoned dark, not #000/#333"). The differentiator is the *between-the-obvious-buckets* choice.
2. **Define ONE signature ornament and reuse it everywhere.** InkForge: 空心菱形 `◇◇◇` (hollow, not solid `◆`) as H1 mark, section divider, and end-mark — one motif → instant recognizability without clip-art.
3. **Encode an aesthetic rule that competitors won't copy.** InkForge: *asymmetry* (left-aligned 72×3px line; bottom+right-only image frame) + *restraint* ("ember ≤2×/screen"). These read as "designed by someone" because stock libraries are symmetric and maximalist.
4. **Make every module a parametric instance of the token set**, so swapping `{primary}` re-skins the whole system coherently — the opposite of pasting a 秀米 stock box whose colors are baked in and clash with your palette.
5. **Forbid the templated tells explicitly** (the §5 table is essentially a "don't" list). Distinctiveness is as much *subtraction* (no gradient title blocks, no border-left H2, no rainbow emoji) as addition.

InkForge already encodes the parametric contract the task wants: `ThemePreset { primaryColor, fontFamily, fontSize, lineHeight, firstLineIndent, textAlign, ... }` and per-preset `customCSS` targeting `#nice h2/blockquote/...` — i.e., a module library *is* a set of token-parametrized CSS/section templates, not a clip-art folder. **[internal-synth, `docs/主题系统.md` §1.2, §3]**

---

## 7. Concrete starter snippets (WeChat-safe, parametric) derived from the above

These are **fallback-channel (CSS/section) builds** — the WeChat-safe twin of each SVG master. Replace `{primary}`/`{accent}` at export.

```html
<!-- 1a Heading number badge (no flex, no pseudo, inline-block) -->
<h2 style="margin:3em 0 1em;font-size:1.3em;font-weight:700;color:#252933;">
  <span style="display:inline-block;width:28px;height:28px;line-height:28px;
    border-radius:50%;background:{primary};color:#fff;text-align:center;
    font-size:.8em;margin-right:.5em;vertical-align:middle;">01</span>章节标题
</h2>

<!-- 1d InkForge signature heading: numeral + asymmetric forge line -->
<section style="margin:3em 0 1.4em;">
  <span style="font-size:2.4em;color:rgba(37,41,51,.14);font-family:'EB Garamond',serif;
    font-weight:300;">01</span>
  <span style="font-size:1.35em;font-weight:600;letter-spacing:.05em;color:#252933;">章节标题</span>
  <div style="width:72px;height:3px;background:{accent};margin:.6em 0 0;border-radius:1.5px;"></div>
</section>

<!-- 2a Geometric seal divider (real glyph nodes, no svg) -->
<p style="text-align:center;color:{primary};font-size:18px;letter-spacing:.5em;
  margin:1.6em 0;opacity:.85;">◇ ◇ ◇</p>

<!-- 2b Gradient hairline with solid fallback -->
<section style="height:1px;margin:2em 0;background:{primary};
  background:linear-gradient(to right,transparent,rgba(0,0,0,.1),transparent);"></section>

<!-- 3a Corner-quote pull card -->
<section style="position:relative;background:{primary}14;border-radius:8px;
  padding:1.2em 1.4em 1.2em 2.4em;margin:1.6em 0;box-shadow:0 4px 6px rgba(0,0,0,.05);">
  <span style="position:absolute;left:.4em;top:.1em;font-size:2.4em;color:{primary};
    line-height:1;opacity:.5;">"</span>
  引用正文……
</section>

<!-- 4c KPI chip row via display:table (NOT flex) -->
<section style="display:table;width:100%;margin:1.4em 0;">
  <span style="display:table-cell;text-align:center;">
    <span style="display:block;font-size:2em;font-weight:700;color:{primary};">128%</span>
    <span style="display:block;font-size:.85em;color:#6E7580;">同比增长</span>
  </span>
  <!-- repeat table-cell for more KPIs -->
</section>

<!-- 5a End mark -->
<p style="text-align:center;color:{primary};letter-spacing:.4em;font-size:14px;
  margin:2.4em 0 1em;">◇ ◇ ◇</p>
<p style="text-align:center;color:#9B958D;font-size:13px;letter-spacing:.2em;">全文完</p>
```
Snippet provenance: structure/constraints from doocs/md CSS + `微信渲染规则.md` **[fetched]**; signature numeral/forge-line/seal/strong-highlight values from `inkforge-brand-identity.md` **[internal-synth]**.

---

## 8. Internal references found (most useful local files)

| File | Why it matters |
|---|---|
| `D:/Desktop/Inkforge/docs/微信渲染规则.md` | The authoritative WeChat-safe pipeline: juice inlining, var regex-replace, SVG boundary shims, flex-removal, alert blocks, table/blockquote/figcaption styling. **Single most important constraint doc.** |
| `D:/Desktop/Inkforge/docs/platform-rendering-rules/wechat-rules.md` | Tag whitelist; states `<svg>` body usage is unreliable (SVG-as-image must be WeChat-hosted) — the conservative counterpoint to the above's "partially supported." |
| `D:/Desktop/Inkforge/docs/platform-rendering-rules/{xiaohongshu,zhihu}-rules.md` | Per-platform decoration rules (not read in full this session; relevant for the dual-channel "author twice" strategy). |
| `D:/Desktop/Inkforge/docs/主题系统.md` | Existing parametric preset system (`ThemePreset`, 12 WeChat + 5 小红书 + 3 知乎 presets), `#nice`-scoped `customCSS` per preset, `generateThemeCSS` — the module-library plumbing already exists. |
| `D:/Desktop/Inkforge/docs/inkforge-brand-identity.md` | The token system + signature ornaments + explicit anti-templating rules + WeChat export mapping. **Primary reference for the "不撞市面" derivation.** |

## 9. External references (fetched live this session)

- doocs/md theme CSS — `https://raw.githubusercontent.com/doocs/md/main/packages/shared/src/configs/theme-css/grace.css` and `.../default.css` — heading/divider/blockquote parametric CSS keyed on `--md-primary-color` + `calc(--md-font-size * factor)`. **[fetched, verbatim above]**
- doocs/md theme engine file list — `packages/core/src/theme/{cssProcessor,cssVariables,selectorMapping,themeApplicator,themeExporter,themeInjector,cssScopeWrapper}.ts` (via `api.github.com/repos/doocs/md/git/trees/main?recursive=1`) — confirms inline+var-replace pipeline. **[fetched]**
- lyricat/wechat-format — `api.github.com/repos/lyricat/wechat-format` tree — confirms it is a CodeMirror-based editor (CSS under `src/assets/css`, codemirror themes); its themes folder layout differs from doocs/md. **[fetched, partial]**
- npm registry — searches for `wechat svg` / `mp-html` / `wxapp-svg` returned **no general-purpose inline-SVG 公众号 typesetting component library**; closest hits are mini-program rich-text renderers (`mp-html`) and crypto/API libs — corroborating §0's "no standard inline-SVG module library exists." `https://registry.npmjs.org/-/v1/search?text=mp-html` **[fetched]**

## 10. Caveats / Not found / verification debt

- **SVG support is genuinely ambiguous** — the two internal manuals disagree (§1.2). I could NOT independently verify against a live 公众号 paste this session (no browser/WeChat access). **Treat raw inline `<svg>` in the WeChat body as untrusted; verify empirically before relying on it.**
- **秀米/135editor exact output HTML was NOT re-fetched live** (their editors are JS apps behind auth; the characterization in §3.3 comes from the internal 全网调研 docs). If precise 秀米 `<section>` markup matters, capture a real paste.
- **mdnice and Redink** were characterized via the InkForge synth docs + the shared `#nice` convention, not via live source fetch this session.
- **Dedicated web/search tools (WebSearch/WebFetch/exa) were unavailable**; all external data came through `urllib` raw-file/registry fetches, which cannot render JS-driven docs/sites. A future pass with working web tools should pull: WeChat official 公众号 editor changelog on SVG, a 秀米 exported sample, and 135editor module HTML for byte-level confirmation.
- No code files were modified. This report is the only artifact written, at the requested path.

---

## 11. 2026-06-18 CloakBrowser market editor DOM/CSS pass

This pass used CloakBrowser only and treated 135/Xiumi as live design-system references, not as
reusable source. No save, copy, sync, upload, phone-share, scheduled-send, or publish path was used.

### Xiumi findings

- In the Xiumi v5 paper editor, the SVG category exposed a broad interactive taxonomy: 基础SVG,
  图片轮播, 点击展开, 路径动画, 抽签效果, 趣味滑动, 轮换转场, 分支转场, 滑动触发, 视差移动, 点击切换,
  翻页/翻转, 缩放, 点击答题, 文字弹幕, 点击显示, 点击换图, 点击打开, 点击消失, 点击弹出, 点击放大,
  点击打印, 点击跳转, 点击播放, 长按切换, 区域触发, 点击掉落, 点击+自动.
- The SVG list preview can contain literal SVG, SMIL animation, and `foreignObject`, but the
  applied center canvas may convert the selected component into image cells and `tn-*` authoring
  layers. This means Xiumi SVG sampling is taxonomy/fallback evidence, not direct inline-SVG proof.
- Title and card templates rely heavily on nested authoring layers, image ornaments, background
  images, transforms, negative margins, width/height constraints, and dense inline styling. InkForge
  should translate those patterns into source-owned title, card, callout, timeline, QA, image-frame,
  gallery, poster, and long-image modules.

### 135 findings

- The 135 SVG editor organizes effects as SVG效果/SVG模板 plus categories such as 基础款, 图片, 点击,
  轮播, 滑动, 自动, 音视频, 展开, 长按, 布局, 公众号, 超链接/小程序, and 其它.
- Observed effect blocks used `block[data-name]` identities, placeholders, hidden trigger controls,
  image slots, percentage/inset hot-zone adjusters, and tall `viewBox=0 0 1080 1920` background
  layers.
- The useful reusable grammar is an InkForge-owned schema: `effectType`, image slots, hot zones,
  motion duration/delay/direction/scale/order, trigger type, static-expanded fallback, raster
  fallback, and layout report.
- The ordinary 135 editor uses nested `section` grammars and inline styles for titles/body/cards,
  but market residue such as `_135editor`, `135brush`, `135bg`, `data-tools`, market data ids,
  vendor class names, and hosted media URLs must be blocked from InkForge publishable output.

### Rule synthesis for InkForge

- Market editors may expand the style catalog taxonomy, visual rhythm, and fallback planning, but
  no vendor DOM, class, private media URL, paid/member source, or account state may enter generated
  output.
- WeChat SVG/rich styles must pass InkForge's own renderer, WeChat-safe checks, quality detector,
  style catalog gates, and style proof manifest gates.
- Xiaohongshu must receive plain text or manifest-backed image pages/posters/long images, while
  Zhihu must receive semantic Markdown or public-host image fallback with alt/caption.
- Mobile-only/touch-only effects remain unavailable until exact phone-preview evidence exists for
  the InkForge artifact.

Evidence artifact: `prompts/0601/evidence/market-editor-dom-css-learning-20260618.txt`.
