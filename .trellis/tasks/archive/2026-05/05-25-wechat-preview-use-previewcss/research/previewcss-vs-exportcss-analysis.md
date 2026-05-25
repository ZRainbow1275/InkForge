# Research: previewCSS vs exportCSS Deep Analysis — All 12 WeChat Presets

- **Query**: Deep analysis of ALL 12 wechat preset CSS differences in InkForge
- **Scope**: internal
- **Date**: 2026-05-25

---

## 1. Infrastructure Overview

### 1.1 PERSONA_FONTS

Four persona groups, each with a CJK + Latin font pair:

| Persona | CJK Stack | Latin Stack |
|---|---|---|
| `academic` | Source Han Serif SC, Noto Serif SC, Songti SC, STSong, SimSun, serif | EB Garamond, Crimson Pro, Georgia, Times New Roman, serif |
| `business` | Source Han Sans SC, IBM Plex Sans CN, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif | Inter, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif |
| `lifestyle` | LXGW WenKai Lite, LXGW WenKai, Kaiti SC, STKaiti, KaiTi, serif | Fraunces, Crimson Pro, Georgia, serif |
| `creative` | Smiley Sans, Source Han Sans SC, PingFang SC, Microsoft YaHei, sans-serif | Space Grotesk, JetBrains Mono, Inter, sans-serif |

### 1.2 FONT_STACKS (Legacy, from constants/index.ts)

| Key | Stack |
|---|---|
| `sans` | -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", ... |
| `serif` | Georgia, "Noto Serif SC", "Source Han Serif SC", ... |
| `kai` | KaiTi, STKaiti, ... |
| `mono` | "Fira Code", "JetBrains Mono", Menlo, Monaco, ... |

These are used only in the **legacy path** of `generateThemeCSS()` when no `previewCSS`/`exportCSS` is present. All 12 presets now have both, so FONT_STACKS is effectively unused by presets.

### 1.3 Base CSS Generators (`generatePersonaBaseCSS`)

All four base CSS blocks share the same template. The only variance is font stack and line-height:

```css
#nice {
  font-family: <CJK>, <Latin>;
  max-width: min(22em, calc(100vw - 32px));   /* WECHAT-UNSUPPORTED: min(), calc() */
  margin: 0 auto;
  padding: 0 4px;
  font-size: 17px;
  line-height: 1.75 | 1.85;    /* academic/business=1.75, lifestyle/creative=1.85 */
  color: #1a1a1a;
  text-justify: inter-ideograph;
  word-break: break-word;
  line-break: strict;
  font-feature-settings: 'palt';
  -webkit-font-smoothing: antialiased;    /* webkit-only, ignored by WeChat */
  -moz-osx-font-smoothing: grayscale;     /* moz-only, ignored by WeChat */
}
#nice p { margin: 0 0 1.15em; text-indent: 0; }
#nice strong, #nice b { font-weight: 600; }
#nice em, #nice i { font-style: italic; font-family: <Latin>, <CJK>; }
```

**WeChat issues in ALL base CSS:**
- `max-width: min(22em, calc(100vw - 32px))` -- `min()` and `calc()` are **wechat-unsupported**
- `font-feature-settings: 'palt'` -- **wechat-unsupported** (OpenType features)
- `-webkit-font-smoothing` / `-moz-osx-font-smoothing` -- harmless vendor prefixes, silently ignored
- `text-justify: inter-ideograph` -- **wechat-unsupported** (CJK-specific justify mode)

These base CSS issues apply equally to BOTH previewCSS and exportCSS since both include the base.

### 1.4 Recipe System (preset-decorations.ts)

9 recipes available: `cjk-drop-cap`, `ornament-hr`, `large-quote`, `cjk-decimal-h2`, `h2-underline-fine`, `pull-quote-bordered`, `numbered-list-roman`, `h3-vertical-accent`, `h2-block-ribbon`.

Each recipe has:
- `previewCSS` — full CSS3 with `var()`, pseudo-elements, counters
- `exportCSS` — juice-safe subset
- `decorate?` — optional HTML post-processor for export targets

Recipes are composed via `composeRecipes(ids, { target })` which selects the correct CSS variant and chains decorate functions.

---

## 2. Per-Preset Deep Comparison

### Legend for categorization:
- **juice-safe**: font-family, background (solid), color, border, padding, margin, font-size, font-weight, text-align, letter-spacing, text-indent, border-radius, text-decoration, text-transform, opacity, float, display (inline/block), line-height
- **needs-decorate**: `::before`, `::after`, `::first-letter`, `counter-reset`/`counter-increment`/`content: counter(...)`, `::marker` content
- **wechat-unsupported**: `var()`, `calc()`, `min()`, `flex`/`grid`, `filter`, `transform`, `position: absolute/relative` (partial), `linear-gradient()` (partial — works inline in some contexts), `counter()` in content, `::first-letter`, `text-underline-offset`

---

### 2.1 THESIS (id: `thesis`)

**Persona**: academic | **Recipes**: cjk-decimal-h2, h2-underline-fine

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #5a4a3c }` | **wechat-unsupported** | CSS custom property; used by recipe previewCSS |
| `#nice { font-family: 'Source Han Serif SC'... }` | **juice-safe** | Explicit serif stack (exportCSS omits, relies on base) |
| `#nice { color: #2a2a2a }` | **juice-safe** | Body text color |
| `#nice p { line-height: 1.95; margin-bottom: 1.1em; text-indent: 2em }` | **juice-safe** | Paragraph rhythm |
| `#nice p:first-of-type { text-indent: 0 }` | **juice-safe** | First paragraph special case |
| `#nice h1 { ...full styling... }` | **juice-safe** | font-size:2.1em, font-weight:700, text-align:center, letter-spacing:0.08em, color:#2a2a2a, padding:0 0 0.3em, border-bottom:1px solid #cdbfa9 |
| `#nice h1 { font-variant-numeric: oldstyle-nums }` | **wechat-unsupported** | OpenType feature |
| `#nice h2 { ...full styling... }` | **juice-safe** | color:#2a2a2a, letter-spacing:0.03em, margin-top:1.8em, font-size:1.45em, padding-bottom:0.25em, border-bottom:1px solid #d6c9b2 |
| `#nice h2 { font-variant-numeric: oldstyle-nums }` | **wechat-unsupported** | OpenType feature |
| `#nice h3 { ...full styling... }` | **juice-safe** | color:#5a4a3c, font-weight:600, margin-top:1.3em, font-size:1.18em, letter-spacing:0.02em, font-style:italic |
| `#nice h3::before { content: '§ '; ... }` | **needs-decorate** | Pseudo-element section mark |
| `#nice strong { color: #3d2f24; font-weight: 700 }` | **juice-safe** | |
| `#nice em { font-family:...; font-style:italic; color:#4a3a2c }` | **juice-safe** | |
| `#nice blockquote { ...full styling... }` | **juice-safe** | background, border-left, padding, color, font-style, margin |
| `#nice blockquote p { line-height:1.85; text-indent:0 }` | **juice-safe** | |
| `#nice ul, #nice ol { padding-left:1.4em }` | **juice-safe** | |
| `#nice ul li::marker { color: #8a7659 }` | **needs-decorate** | `::marker` pseudo-element |
| `#nice code { font-family:...; font-size:0.92em; color:#5a4a3c; background:#f0eadf; padding; border-radius }` | **juice-safe** | |
| `#nice a { color:#5a4a3c; border-bottom:1px solid #b8a589; text-decoration:none }` | **juice-safe** | |
| `#nice hr { border:0; text-align:center; height:0; margin:2em 0 }` | **juice-safe** | |
| `#nice hr::before { content:'· · ·'; color:#8a7659; letter-spacing:1em; font-size:1.2em }` | **needs-decorate** | Pseudo-element ornament |
| `#nice table th { background:#5a4a3c; color:#faf9f6; font-weight:600; letter-spacing:0.04em }` | **juice-safe** | |
| `#nice table td { font-variant-numeric: oldstyle-nums }` | **wechat-unsupported** | OpenType feature |

**Recipe CSS delta** (preview uses `var(--ink-accent)`, export uses hardcoded colors):
- cjk-decimal-h2 preview: `counter-reset`, `counter-increment`, `h2::before { content: '第' counter(ink-ch, cjk-decimal) '章' }` — **needs-decorate** (handled by recipe decorate fn)
- h2-underline-fine preview: `border-bottom: 1px solid var(--ink-accent)` — **wechat-unsupported** (var())

**Decorate function**: calls `thesisRecipesExport.decorate()` which chains:
- `cjk-decimal-h2.decorate`: injects `<span class="ink-ch-num">第N章</span>` — HANDLED
- `h2-underline-fine`: no decorate function needed (pure CSS) — OK

**ALSO**: `applyHeadingDecorations` adds gold star decorations to h2 (legacy path, separate from recipe system).

**Gap analysis for thesis:**
- `h3::before { content: '§ ' }` — NOT handled by any decorate function
- `hr::before { content: '· · ·' }` — NOT handled (ornament-hr recipe not included in thesis)
- `::marker` coloring — NOT handled
- `font-variant-numeric: oldstyle-nums` — cannot be replicated in WeChat

---

### 2.2 LEGAL (id: `legal`)

**Persona**: academic | **Recipes**: cjk-decimal-h2, numbered-list-roman

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #1a1a2e }` | **wechat-unsupported** | |
| `#nice { font-family: explicit serif stack }` | **juice-safe** | |
| `#nice { background: #fbfaf5; color: #1a1a2e; counter-reset: legal-section }` | **juice-safe** (bg/color), **needs-decorate** (counter-reset) | |
| `#nice p { line-height:1.85; margin-bottom:1em; text-align:justify; text-indent:2em }` | **juice-safe** | |
| `#nice p:first-of-type { text-indent: 0 }` | **juice-safe** | |
| `#nice p:first-of-type::first-letter { font-size:3em; font-weight:700; float:left; line-height:0.9; margin; color:#1a1a2e }` | **needs-decorate** | Drop cap via `::first-letter` |
| `#nice h1 { font-size:2em; text-align:center; margin; color; letter-spacing:0.08em; text-transform:uppercase; padding-bottom:0.4em; border-bottom:3px double #1a1a2e }` | **juice-safe** | |
| `#nice h2 { counter-increment: legal-section }` | **needs-decorate** | CSS counter |
| `#nice h2::before { content: '§ ' counter(legal-section, upper-roman) '. '; font-family; font-weight; margin-right; color }` | **needs-decorate** | CSS counter + pseudo-element |
| `#nice h3 { font-style: italic; margin-top: 1.3em }` | **juice-safe** | |
| `#nice strong { text-decoration: underline; text-decoration-color: #b8b8c8; text-underline-offset: 0.2em }` | **juice-safe** (underline), **wechat-unsupported** (text-underline-offset, text-decoration-color) | |
| `#nice em { font-family: 'EB Garamond'... }` | **juice-safe** | |
| `#nice blockquote { border-left: 4px double #1a1a2e; padding:1em 1.3em; margin:1.5em 0 }` | **juice-safe** | |
| `#nice blockquote p { text-indent:0; line-height:1.8 }` | **juice-safe** | |
| `#nice blockquote::before { content:'"'; font-size:2.5em; ... }` | **needs-decorate** | Large quote pseudo-element |
| `#nice ol { padding-left: 2em }` | **juice-safe** | |
| `#nice ol li::marker { font-family; font-weight:600; color }` | **needs-decorate** | |
| `#nice ul li::marker { color: #1a1a2e }` | **needs-decorate** | |
| `#nice code { font-family; font-style:italic; background:#ebebe0; color:#1a1a2e; padding }` | **juice-safe** | |
| `#nice a { color:#1a1a2e; border-bottom:1px solid #1a1a2e }` | **juice-safe** | |
| `#nice hr { border:0; border-top:1px solid #1a1a2e; margin:2em 0; position:relative }` | **juice-safe** (border), **wechat-unsupported** (position:relative) | |
| `#nice table th { text-transform:uppercase; font-size:0.92em; letter-spacing:0.05em }` | **juice-safe** | |

**Recipe CSS delta:**
- cjk-decimal-h2: same as thesis — **needs-decorate** (HANDLED by recipe)
- numbered-list-roman: `list-style-type: upper-roman` — **juice-safe**; `::marker` color — **needs-decorate**

**Decorate function**: calls `legalRecipesExport.decorate()`:
- `cjk-decimal-h2.decorate`: injects chapter numbers — HANDLED
- `numbered-list-roman`: NO decorate function (relies on CSS `list-style-type`)

**Gap analysis for legal:**
- `p:first-of-type::first-letter` (drop cap) — NOT handled. Legal uses its OWN drop cap, NOT the `cjk-drop-cap` recipe!
- `h2::before` with `counter(legal-section, upper-roman)` — cjk-decimal-h2 recipe overrides this with `第N章`, causing CONFLICT
- `blockquote::before { content: '"' }` — NOT handled. Legal doesn't use `large-quote` recipe!
- `ol li::marker` / `ul li::marker` styling — NOT handled
- `text-underline-offset`, `text-decoration-color` on strong — WeChat unsupported
- `position: relative` on hr — WeChat partially unsupported

---

### 2.3 REPORT (id: `report`)

**Persona**: academic | **Recipes**: h2-underline-fine, pull-quote-bordered

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #004080 }` | **wechat-unsupported** | |
| `#nice { font-family: explicit sans stack; background:#ffffff; color:#1A3A5C; counter-reset:report-h2 }` | **juice-safe** (font/bg/color), **needs-decorate** (counter) | |
| `#nice p { line-height:1.75; margin-bottom:0.95em; text-align:justify }` | **juice-safe** | |
| `#nice h1 { font-size:2em; font-weight:800; margin; color:#004080; letter-spacing:-0.01em; line-height:1.25; padding:0.6em 0.8em; background:#F2F5F9; border-left:6px solid #004080 }` | **juice-safe** | |
| `#nice h1::after { content:''; display:block; margin-top:0.4em; width:60px; height:3px; background:#004080 }` | **needs-decorate** | Pseudo-element underline accent |
| `#nice h2 { ...full styling...; counter-increment:report-h2; display:flex; align-items:baseline; gap:0.6em }` | **juice-safe** (color etc), **needs-decorate** (counter), **wechat-unsupported** (display:flex, gap) | |
| `#nice h2::before { content:'0' counter(report-h2); font-family:'Inter'; font-weight:800; color:#fff; background:#004080; padding; font-size:0.7em; border-radius:3px; letter-spacing }` | **needs-decorate** | Counter + pseudo-element |
| `#nice h3 { color:#1A3A5C; font-weight:600; font-size:1.15em; margin-top:1.4em; padding-left:0.7em; border-left:3px solid #004080 }` | **juice-safe** | |
| `#nice h4 { color:#36474F; text-transform:uppercase; letter-spacing:0.08em; font-size:0.92em }` | **juice-safe** | |
| `#nice strong { color:#004080; font-weight:700; background:linear-gradient(180deg, transparent 60%, rgba(0,64,128,0.15) 60%); padding:0 0.1em }` | **juice-safe** (color, font-weight), **wechat-unsupported** (linear-gradient) | |
| `#nice em { font-style:normal; color:#004080; font-weight:600 }` | **juice-safe** | |
| `#nice ul li::marker { color:#004080; content:'▸ ' }` | **needs-decorate** | ::marker with custom content |
| `#nice ul li { margin-bottom: 0.4em }` | **juice-safe** | |
| `#nice ol { counter-reset:report-li; padding-left:0 }` | **needs-decorate** (counter) | |
| `#nice ol li { list-style:none; counter-increment:report-li; padding-left:2.2em; position:relative; margin-bottom:0.5em }` | **needs-decorate** (counter), **wechat-unsupported** (position:relative) | |
| `#nice ol li::before { content:counter(report-li, decimal-leading-zero); position:absolute; left:0; top:0.05em; color:#004080; font-family:'Inter'; font-weight:700; font-size:0.95em }` | **needs-decorate** | Counter + pseudo-element + absolute positioning |
| `#nice blockquote { background:#F5F8FB; border-left:4px solid #004080; padding; color:#36474F; border-radius:0 4px 4px 0 }` | **juice-safe** | |
| `#nice code { font-family:'Inter','Consolas'; background:#EFF3F7; color:#004080; padding; border-radius }` | **juice-safe** | |
| `#nice table th { background:#F2F5F9; color:#1A3A5C; font-weight:700; border-bottom:3px solid #004080; text-transform:uppercase; font-size:0.88em; letter-spacing:0.05em }` | **juice-safe** | |
| `#nice table td { border-color:#E6ECF2; font-variant-numeric:tabular-nums }` | **juice-safe** (border-color), **wechat-unsupported** (font-variant-numeric) | |
| `#nice a { color:#004080; border-bottom:1px solid #99B4CC }` | **juice-safe** | |
| `#nice hr { border:0; height:3px; background:linear-gradient(90deg, #004080, #004080 60px, #E6ECF2 60px, #E6ECF2); margin:2em 0 }` | **wechat-unsupported** (linear-gradient) | |

**Recipe CSS delta:**
- h2-underline-fine: `border-bottom: 1px solid var(--ink-accent)` (preview) vs `1px solid #5a4a3c` (export) — preview uses var() **wechat-unsupported**
- pull-quote-bordered: `border-top/bottom: 2px solid var(--ink-accent)` vs hardcoded — preview uses var() **wechat-unsupported**

**Decorate function**: calls `reportRecipesExport.decorate()`:
- h2-underline-fine: no decorate — OK
- pull-quote-bordered: no decorate — OK

**Gap analysis for report:**
- `h1::after` underline accent — NOT handled by any decorate
- `h2::before` numbered badge `01`, `02`... — NOT handled (no recipe covers `report-h2` counter)
- `display: flex; align-items: baseline; gap` on h2 — WeChat unsupported
- `ol li::before` with `counter(report-li, decimal-leading-zero)` — NOT handled
- `ul li::marker { content: '▸ ' }` — NOT handled
- `strong` background gradient — WeChat unsupported
- `hr` linear-gradient — WeChat unsupported
- `font-variant-numeric: tabular-nums` — WeChat unsupported

---

### 2.4 COMMENTARY / editorial (id: `commentary`)

**Persona**: business | **Recipes**: large-quote, h3-vertical-accent

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #c0392b }` | **wechat-unsupported** | |
| `#nice { font-family: explicit sans stack; background:#ffffff; color:#1a1a1a }` | **juice-safe** | |
| `#nice p { line-height:1.7; margin-bottom:1em; font-size:1.02em }` | **juice-safe** | |
| `#nice h1 { font-size:2.4em; font-weight:900; margin; color:#1a1a1a; letter-spacing:-0.02em; line-height:1.15 }` | **juice-safe** | |
| `#nice h1::after { content:''; display:block; width:80px; height:5px; background:#c0392b; margin-top:0.4em }` | **needs-decorate** | |
| `#nice h2 { color:#c0392b; font-weight:900; font-size:1.65em; margin-top:1.8em; line-height:1.3; letter-spacing:-0.01em; position:relative; padding-left:0.7em }` | **juice-safe** (mostly), **wechat-unsupported** (position:relative) | |
| `#nice h2::before { content:''; position:absolute; left:0; top:0.25em; bottom:0.25em; width:6px; background:#c0392b }` | **needs-decorate** + **wechat-unsupported** (position:absolute) | |
| `#nice h3 { color:#1a1a1a; font-weight:800; font-size:1.22em; margin-top:1.3em }` | **juice-safe** | |
| `#nice h3::after { content:''; display:block; width:28px; height:2px; background:#c0392b; margin-top:0.3em }` | **needs-decorate** | |
| `#nice em { font-family:'Inter'...; font-style:italic; font-weight:600; color:#1a1a1a; border-bottom:1px dashed #c0392b }` | **juice-safe** | |
| `#nice blockquote { border-left:5px solid #c0392b; background:#FFF5F3; padding; margin; color; font-style:italic; font-size:1.08em }` | **juice-safe** | |
| `#nice blockquote p { line-height: 1.65 }` | **juice-safe** | |
| `#nice blockquote::before { content:'"'; font-size:3em; line-height:0; vertical-align:-0.5em; color:#c0392b; margin-right:0.15em; opacity:0.5 }` | **needs-decorate** | Large quote mark |
| `#nice ul li { padding-left:0.2em; margin-bottom:0.5em }` | **juice-safe** | |
| `#nice ul li::marker { color:#c0392b; content:'— ' }` | **needs-decorate** | ::marker with custom content |
| `#nice ol li::marker { color:#c0392b; font-weight:800 }` | **needs-decorate** | |
| `#nice code { font-family; background:#FFEBE8; color:#c0392b; padding; border-radius; font-weight:600 }` | **juice-safe** | |
| `#nice a { color:#c0392b; font-weight:600; border-bottom:2px solid #c0392b }` | **juice-safe** | |
| `#nice hr { border:0; border-top:3px solid #c0392b; margin:2.4em 0; position:relative }` | **juice-safe** (border), **wechat-unsupported** (position:relative) | |
| `#nice hr::after { content:'◆'; position:absolute; left:50%; top:-0.6em; transform:translateX(-50%); color:#c0392b; background:#ffffff; padding:0 0.6em; font-size:0.9em }` | **needs-decorate** + **wechat-unsupported** (position:absolute, transform) | |
| `#nice table th { background:#c0392b; color:#fff; font-weight:700 }` | **juice-safe** | |

**Recipe CSS delta:**
- large-quote: preview uses `position:relative/absolute`, `var(--ink-accent)` — **wechat-unsupported**; export is simpler
- h3-vertical-accent: preview uses `var(--ink-accent)` — **wechat-unsupported**; export hardcodes color

**Decorate function**: calls `commentaryRecipesExport.decorate()`:
- large-quote.decorate: injects `<span class="ink-quote-mark">"</span>` — HANDLED
- h3-vertical-accent: no decorate — OK

**Gap analysis for commentary:**
- `h1::after` red bar — NOT handled
- `h2::before` left vertical bar (position:absolute) — NOT handled
- `h3::after` short red underline — NOT handled
- `hr::after { content:'◆' }` diamond ornament — NOT handled
- `::marker` custom content (`— `) — NOT handled
- **Commentary's own blockquote::before** duplicates the large-quote recipe's — recipe handles it for export

---

### 2.5 AIGC (id: `aigc`)

**Persona**: business | **Recipes**: h3-vertical-accent, ornament-hr

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #2563eb }` | **wechat-unsupported** | |

**That's it.** The AIGC preset's previewCSS and exportCSS are **nearly identical** — the only difference is `--ink-accent` declaration on `#nice`. All other rules (h1, h2, strong, code, blockquote, a) are character-for-character the same.

**Recipe CSS delta:**
- h3-vertical-accent: preview uses `var(--ink-accent)` — **wechat-unsupported**; export hardcodes
- ornament-hr: preview uses `var(--ink-accent)` in `::before` — **needs-decorate** + **wechat-unsupported**; export handles via `.ink-ornament-hr` class

**Decorate function**: calls `aigcRecipesExport.decorate()`:
- h3-vertical-accent: no decorate — OK
- ornament-hr.decorate: replaces `<hr>` with `<div class="ink-ornament-hr">❀ ❀ ❀</div>` — HANDLED

**Gap analysis for AIGC:**
- Minimal gap. AIGC is the BEST-aligned preset. Only `var()` and recipe pseudo-elements differ.

---

### 2.6 CODE / devlog (id: `code`)

**Persona**: creative | **Recipes**: h2-underline-fine, pull-quote-bordered, numbered-list-roman

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #16a34a }` | **wechat-unsupported** | |

**That's it.** Code's previewCSS and exportCSS are **nearly identical**. The only significant difference is:
- previewCSS has `--ink-accent` declaration
- exportCSS uses slightly shorter font-family `'JetBrains Mono', 'Source Han Sans SC', monospace` (omits `'Maple Mono CN'`)

**Recipe CSS delta:**
- h2-underline-fine, pull-quote-bordered, numbered-list-roman: preview uses `var(--ink-accent)`, export hardcodes — **wechat-unsupported** (var only)

**Decorate function**: calls `codeRecipesExport.decorate()`:
- h2-underline-fine: no decorate — OK
- pull-quote-bordered: no decorate — OK
- numbered-list-roman: no decorate — OK

**Gap analysis for CODE:**
- Minimal gap. Second best-aligned preset after AIGC.

---

### 2.7 NOTES / studynote (id: `notes`)

**Persona**: lifestyle | **Recipes**: cjk-drop-cap, ornament-hr, pull-quote-bordered

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #d2691e }` | **wechat-unsupported** | |

**That's it.** Notes' previewCSS and exportCSS are **identical** except for `--ink-accent`.

**Recipe CSS delta:**
- cjk-drop-cap: preview uses `::first-letter` — **needs-decorate**; export uses `.ink-dc` class
- ornament-hr: preview uses `::before` — **needs-decorate**; export uses `.ink-ornament-hr`
- pull-quote-bordered: preview uses `var(--ink-accent)` — **wechat-unsupported**

**Decorate function**: calls `notesRecipesExport.decorate()`:
- cjk-drop-cap.decorate: wraps first char in `<span class="ink-dc">` — HANDLED
- ornament-hr.decorate: replaces `<hr>` with ornament div — HANDLED
- pull-quote-bordered: no decorate — OK

**Gap analysis for NOTES:**
- Minimal gap. Recipes handle the pseudo-element conversions well.

---

### 2.8 NEWS (id: `news`)

**Persona**: creative | **Recipes**: large-quote, pull-quote-bordered, h2-underline-fine

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #0f172a }` | **wechat-unsupported** | |

**That's it.** News' previewCSS and exportCSS are **identical** except for `--ink-accent`.

**Recipe CSS delta:**
- large-quote: preview uses `position:relative/absolute`, `var(--ink-accent)`, `::before` — **needs-decorate** + **wechat-unsupported**; export is simpler
- pull-quote-bordered: uses `var(--ink-accent)` — **wechat-unsupported**
- h2-underline-fine: uses `var(--ink-accent)` — **wechat-unsupported**

**Decorate function**: calls `newsRecipesExport.decorate()`:
- large-quote.decorate: injects quote mark span — HANDLED
- pull-quote-bordered: no decorate — OK
- h2-underline-fine: no decorate — OK

**Gap analysis for NEWS:**
- Minimal gap. Well-handled by recipe system.

---

### 2.9 MEME / lifestyle (id: `meme`)

**Persona**: creative | **Recipes**: h3-vertical-accent, ornament-hr, h2-block-ribbon

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #ff006e }` | **wechat-unsupported** | |

**That's it.** Meme's previewCSS and exportCSS are **identical** except for `--ink-accent`.

**Recipe CSS delta:**
- h3-vertical-accent: `var()` — **wechat-unsupported**
- ornament-hr: `::before` + `var()` — **needs-decorate**
- h2-block-ribbon: `var()` — **wechat-unsupported**; both preview/export have same structure

**Decorate function**: calls `memeRecipesExport.decorate()`:
- h3-vertical-accent: no decorate — OK
- ornament-hr.decorate: replaces `<hr>` with ornament div — HANDLED
- h2-block-ribbon: no decorate — OK

**ALSO**: `applyHeadingDecorations` adds yellow highlighter gradient to `<strong>` tags (meme case).

**Gap analysis for MEME:**
- Minimal gap. Well-aligned.

---

### 2.10 LIFE / lifestyle (id: `life`)

**Persona**: lifestyle | **Recipes**: cjk-drop-cap, large-quote, ornament-hr

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #a0522d }` | **wechat-unsupported** | |

**That's it.** Life's previewCSS and exportCSS are **identical** except for `--ink-accent`.

**Recipe CSS delta:**
- cjk-drop-cap: `::first-letter` — **needs-decorate**
- large-quote: `::before` + positioning — **needs-decorate**
- ornament-hr: `::before` — **needs-decorate**

**Decorate function**: calls `lifeRecipesExport.decorate()`:
- cjk-drop-cap.decorate: wraps first char — HANDLED
- large-quote.decorate: injects quote mark — HANDLED
- ornament-hr.decorate: replaces hr — HANDLED

**Gap analysis for LIFE:**
- Minimal gap. All pseudo-elements handled by recipe decorators.

---

### 2.11 ELEGANT (id: `elegant`)

**Persona**: lifestyle (but uses academic fonts) | **Recipes**: cjk-drop-cap, large-quote, cjk-decimal-h2, h3-vertical-accent

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #4a3c5a }` | **wechat-unsupported** | |

**That's it.** Elegant's previewCSS and exportCSS are **identical** except for `--ink-accent`.

**Recipe CSS delta:**
- cjk-drop-cap: `::first-letter` — **needs-decorate**
- large-quote: `::before` + positioning — **needs-decorate**
- cjk-decimal-h2: counters + `::before` — **needs-decorate**
- h3-vertical-accent: `var()` — **wechat-unsupported**

**Decorate function**: calls `elegantRecipesExport.decorate()`:
- cjk-drop-cap.decorate: wraps first char — HANDLED
- large-quote.decorate: injects quote mark — HANDLED
- cjk-decimal-h2.decorate: injects chapter numbers — HANDLED
- h3-vertical-accent: no decorate — OK

**ALSO**: `applyHeadingDecorations` adds `「」` book-bracket decorations + double-line border to h2 (elegant case).

**Gap analysis for ELEGANT:**
- Minimal gap. The most decoration-heavy preset, but all pseudo-elements are covered.

---

### 2.12 TECH (id: `tech`)

**Persona**: creative | **Recipes**: h2-block-ribbon, h3-vertical-accent

#### Properties in previewCSS but NOT in exportCSS:

| CSS Property / Rule | Category | Notes |
|---|---|---|
| `#nice { --ink-accent: #6366f1 }` | **wechat-unsupported** | |

**That's it.** Tech's previewCSS and exportCSS are **identical** except for `--ink-accent`.

**Recipe CSS delta:**
- h2-block-ribbon: `var()` — **wechat-unsupported**; structure same
- h3-vertical-accent: `var()` — **wechat-unsupported**

**Decorate function**: calls `techRecipesExport.decorate()`:
- h2-block-ribbon: no decorate — OK
- h3-vertical-accent: no decorate — OK

**ALSO**: `applyHeadingDecorations` adds indigo-purple gradient background to h2 (tech case).

**Gap analysis for TECH:**
- Minimal gap. Very well-aligned.

---

## 3. Summary Classification Matrix

### 3.1 Preset Richness Delta: previewCSS vs exportCSS

| Preset | # Unique Preview Properties | Gap Severity | Decorate Coverage |
|---|---|---|---|
| **thesis** | ~25 unique rules | **HIGH** | Partial — h3::before, hr::before, ::marker NOT handled |
| **legal** | ~30 unique rules | **CRITICAL** | Partial — ::first-letter drop cap, h2::before Roman counter, blockquote::before, ::marker NOT handled |
| **report** | ~30 unique rules | **CRITICAL** | None for unique rules — h1::after, h2::before counter badge, ol::before counter, ::marker, gradients NOT handled |
| **commentary** | ~25 unique rules | **HIGH** | Partial — h1::after, h2::before bar, h3::after, hr::after diamond, ::marker NOT handled |
| **aigc** | ~1 unique rule | **MINIMAL** | Full — only var() differs |
| **code** | ~1 unique rule | **MINIMAL** | Full — only var() + minor font stack diff |
| **notes** | ~1 unique rule | **MINIMAL** | Full — recipes cover all pseudo-elements |
| **news** | ~1 unique rule | **MINIMAL** | Full — recipes cover quote mark |
| **meme** | ~1 unique rule | **MINIMAL** | Full — recipes cover ornament hr |
| **life** | ~1 unique rule | **MINIMAL** | Full — recipes cover all 3 pseudo-element types |
| **elegant** | ~1 unique rule | **MINIMAL** | Full — 4 recipes all have decorators |
| **tech** | ~1 unique rule | **MINIMAL** | Full — only var() differs |

### 3.2 Three Tiers of Presets

**Tier 1 — Near-identical (8 presets)**: aigc, code, notes, news, meme, life, elegant, tech
- previewCSS === exportCSS except for `--ink-accent: <color>` declaration
- Switching from exportCSS to previewCSS for these would add ONLY the `--ink-accent` custom property (which is wechat-unsupported anyway)
- **Net gain from switching: ZERO** (the var() references are in recipe CSS, not the preset body)

**Tier 2 — Moderately different (1 preset)**: thesis
- previewCSS has ~25 extra styling rules (full typography, h3::before section mark, hr ornament, marker colors, etc.)
- About 70% of unique properties are **juice-safe** and would survive
- 3 rules need new decorate handlers; 3 rules are wechat-unsupported

**Tier 3 — Heavily different (3 presets)**: legal, report, commentary
- previewCSS has ~25-30 extra rules each
- Complex counter systems, drop caps, absolute-positioned pseudo-elements
- About 50-60% juice-safe, 25-30% needs-decorate, 15-20% wechat-unsupported
- These would benefit MOST from switching, but also need the most decorate work

### 3.3 Wechat-Unsupported Properties Found Across ALL Presets

These exist in the **base CSS** (shared by all) and cannot be fixed by switching:

| Property | Location | Impact |
|---|---|---|
| `min()`, `calc()` | `generatePersonaBaseCSS` — `max-width: min(22em, calc(100vw - 32px))` | Layout width — WeChat ignores, content fills width |
| `font-feature-settings: 'palt'` | `generatePersonaBaseCSS` | CJK kerning — silently ignored |
| `text-justify: inter-ideograph` | `generatePersonaBaseCSS` | CJK justify — silently ignored |
| `var(--ink-accent, ...)` | Recipe previewCSS (all 9 recipes) | Colors fall back to nothing if var() stripped |
| `font-variant-numeric` | thesis, legal, report | Oldstyle/tabular nums — silently ignored |
| `text-underline-offset` | legal strong | Underline offset — silently ignored |
| `text-decoration-color` | legal strong | Custom underline color — silently ignored |
| `position: absolute/relative` | legal hr, report ol, commentary h2/hr | Positioning — partially supported |
| `transform: translateX()` | commentary hr::after | Transform — unsupported |
| `display: flex; gap` | report h2 | Flexbox — unsupported |
| `linear-gradient()` | report strong, report hr | Gradient — partially supported (inline only) |

### 3.4 Unhandled Pseudo-Elements Requiring New Decorate Functions

| Preset | Pseudo-Element | What It Does | Priority |
|---|---|---|---|
| thesis | `h3::before { content: '§ ' }` | Section symbol before h3 | Medium |
| thesis | `hr::before { content: '· · ·' }` | Ornament dots on hr | Medium |
| legal | `p:first-of-type::first-letter` | 3em drop cap | High |
| legal | `h2::before { content: '§ ' counter(upper-roman) }` | Roman section numbers | High |
| legal | `blockquote::before { content: '"' }` | Large opening quote | High |
| report | `h1::after` | Underline accent bar | Medium |
| report | `h2::before { content: counter(decimal-leading-zero) }` | Numbered badge 01, 02... | High |
| report | `ol li::before { content: counter(decimal-leading-zero) }` | Custom list numbering | High |
| commentary | `h1::after` | Red accent bar | Medium |
| commentary | `h2::before` | Left vertical bar (abs positioned) | High |
| commentary | `h3::after` | Short red underline | Medium |
| commentary | `hr::after { content: '◆' }` | Diamond ornament | Medium |

### 3.5 Unhandled ::marker Customizations

All `::marker` rules in previewCSS are lost in export. Affected presets:
- thesis: `ul li::marker { color: #8a7659 }`
- legal: `ol li::marker { font-family, font-weight, color }`, `ul li::marker { color }`
- report: `ul li::marker { color, content: '▸ ' }`
- commentary: `ul li::marker { color, content: '— ' }`, `ol li::marker { color, font-weight }`

---

## 4. Recipe Coverage Summary

| Recipe | Has decorate? | What decorate does | Used by presets |
|---|---|---|---|
| `cjk-drop-cap` | YES | Wraps first char in `<span class="ink-dc">` | notes, life, elegant |
| `ornament-hr` | YES | Replaces `<hr>` with `<div>❀ ❀ ❀</div>` | aigc, notes, meme, life |
| `large-quote` | YES | Injects `<span class="ink-quote-mark">"</span>` | commentary, news, life, elegant |
| `cjk-decimal-h2` | YES | Injects `<span class="ink-ch-num">第N章</span>` | thesis, legal, elegant |
| `h2-underline-fine` | NO | Pure CSS — border-bottom | thesis, report, code, news |
| `pull-quote-bordered` | NO | Pure CSS — border-top/bottom | report, code, notes, news |
| `numbered-list-roman` | NO | Pure CSS — list-style-type | legal, code |
| `h3-vertical-accent` | NO | Pure CSS — border-left | commentary, aigc, elegant, tech |
| `h2-block-ribbon` | NO | Pure CSS — background + padding | meme, tech |

---

## 5. The `applyHeadingDecorations` Legacy Function

File: `themes.ts:991-1088`

This is a SEPARATE decoration system from the recipe pipeline. It runs post-juice on the final HTML. Current handlers:

| Preset | What it does | Overlaps with recipe? |
|---|---|---|
| thesis | Gold star ★ before/after h2 | YES — conflicts with cjk-decimal-h2 recipe |
| report | (no-op comment) | N/A |
| news | (no-op comment) | N/A |
| meme | Yellow highlighter gradient on `<strong>` | NO — unique |
| elegant | 「」brackets + double-line border on h2 | YES — conflicts with cjk-decimal-h2 recipe |
| tech | Indigo-purple gradient background on h2 | YES — conflicts with h2-block-ribbon recipe |

**Default case**: legal, commentary, aigc, code, notes, life — "均使用纯 CSS 内联样式，无需额外 HTML 装饰"

---

## Caveats / Not Found

1. The analysis of `var()` fallback behavior is theoretical — WeChat's actual CSS parser behavior with `var(--x, fallback)` needs testing. Some WeChat versions may honor the fallback value.
2. The `::marker` pseudo-element support in WeChat is uncertain — newer WeChat webview versions (based on Chromium) may support basic `::marker` color.
3. `linear-gradient()` inline support in WeChat is partially supported when juice-inlined into `style=""` attributes — behavior varies by WeChat version.
4. The interaction between `applyHeadingDecorations` and recipe `decorate` functions for thesis/elegant/tech may cause double-decoration if both are called on the same HTML. The call order and deduplication strategy is not clear from the code.
5. The `counter-reset: legal-section` in legal preset body AND `counter-reset: ink-ch` from cjk-decimal-h2 recipe may conflict — both try to number h2 elements differently.
