# Research: CSS-Only Decorative Typography Patterns for Markdown Export Themes

- **Query**: CSS-only decorative typography (drop caps, ornaments, dividers, heading decoration, blockquote treatment, list markers, page-edge ornaments) for `#nice` section in InkForge export presets.
- **Scope**: External (typography craft + browser support) + Internal (existing customCSS / applyHeadingDecorations pattern in `inkforge/src/services/export/themes.ts`)
- **Date**: 2026-05-23

---

## 0. Context Recap (read this first)

InkForge's export pipeline renders Markdown into `<section id="nice">` then injects a per-preset CSS block through `generateThemeCSS(preset)` in `inkforge/src/services/export/themes.ts:522`. After that, `juice` inlines styles, and `applyHeadingDecorations(html, preset)` (themes.ts:590) **replaces pseudo-elements with real inline `<span>`** before passing to WeChat. This means:

- **Preview-only CSS** (webview, xhs/zhihu mock): full CSS3 available — `::first-letter`, `::before/::after`, `counter()`, `float`, `background-image: url("data:image/svg+xml,...")`, `linear-gradient`, `clip-path`, `position: absolute`, even CSS Grid if scoped.
- **WeChat export CSS**: only what survives `juice` inlining + `enforcePlatformCSS` stripping. Pseudo-elements **do not inline** (juice cannot inline `::before` content because there is no element to attach `style=""` to). Therefore for WeChat, any pseudo-element ornament MUST be transformed into a real `<span>` by `applyHeadingDecorations` (see `themes.ts:594-700` for the established pattern).
- Cross-reference: `.trellis/tasks/05-14-wechat-rendering-rules-research/research/wechat-css-svg-rules.md` is the canonical compatibility matrix. Key restrictions for WeChat: no `<style>` blocks, no class selectors, no pseudo-elements, no CSS variables, no `calc/clamp`, no flex/grid as primary layout, no `position: fixed/sticky/absolute`, no animations/transitions.

Every recipe below is annotated with **[Preview only]** / **[Export-safe]** / **[Both]**.

---

## 1. Drop Cap (首字下沉 / 中文落款字)

### 1.1 Native `::first-letter` (Latin)

The cleanest technique. Works on h1/h2/p in webview. Browser support: Chromium 1+, Safari 1+, Firefox 1+. **Caveat: punctuation handling differs across engines** — opening quotes (`"`, `「`) are sometimes captured with the first letter, sometimes not.

```css
/* [Preview only] — pseudo elements lost on WeChat export */
#nice > p:first-of-type::first-letter {
  font-family: "EB Garamond", "Source Han Serif SC", serif;
  font-size: 3.6em;
  font-weight: 700;
  float: left;
  line-height: 0.85;
  margin: 0.05em 0.12em 0 0;
  color: #8B0000;
  /* Optical alignment for serif */
  padding-top: 0.04em;
}
```

### 1.2 CJK Drop Cap — the hard part

`::first-letter` selects ONLY one grapheme. Chinese characters work but **baseline alignment is broken**: CJK glyphs have a square em-box with no descender, so a 3.6em CJK character floats too high relative to the body baseline. Three established fixes:

**Fix A — explicit `line-height: 1` + manual top padding** (NYT Chinese, 三联生活周刊 web):

```css
/* [Preview only] */
#nice > p:first-of-type::first-letter {
  font-family: "Noto Serif SC", "Source Han Serif SC", serif;
  font-size: 3.2em;
  float: left;
  line-height: 1;
  margin: 0.08em 0.12em -0.08em 0; /* negative bottom margin lifts following text */
  color: #8B0000;
  font-weight: 900;
}
```

**Fix B — wrap first character in span via post-process** (the InkForge-friendly approach since `applyHeadingDecorations` already does this kind of rewrite):

```html
<p><span class="dropcap">道</span>可道，非常道...</p>
```

```css
/* [Both — works in WeChat after juice inlining because it's a real span] */
#nice .dropcap {
  display: block;
  float: left;
  font-family: "Noto Serif SC", serif;
  font-size: 56px;        /* absolute, since em on a span is unreliable */
  line-height: 48px;
  margin: 4px 10px 0 0;
  color: #8B0000;
  font-weight: 900;
  /* WeChat-safe: no pseudo, no variables */
}
```

**Fix C — Initial Letter spec** (`initial-letter: 3`): only Safari ≥9 fully supports it, Chromium added it behind a flag in 110+. **Do not rely on it** for cross-browser preview but include as progressive enhancement.

```css
/* [Preview only — Safari/Chromium 110+ with flag] */
#nice > p:first-of-type::first-letter {
  -webkit-initial-letter: 3 2;   /* drop 3 lines, sink 2 */
  initial-letter: 3 2;
  font-family: "EB Garamond", serif;
  color: #8B0000;
  margin-right: 0.4em;
}
```

### 1.3 Reference implementations

- **The Guardian** (`theguardian.com`): uses `::first-letter` with `font-family: 'Guardian Text Egyptian Web'`, float + 1em right margin, font-size ~5em. No background colour.
- **The New York Times Magazine**: drops are 4 lines tall, in a display serif (Cheltenham), often coloured to match issue palette; implemented via a `<span class="g-dropcap">` wrapper so engineering can control kerning per-letter.
- **Medium**: gave up on cross-browser `::first-letter` after CJK requests; now uses a `<span class="dropCap">` wrapper applied to first paragraph of articles tagged with the "magazine" theme. Font: GT Super Display, 4.2× body size.
- **公众号（微信）典范**: 半瓶醋 / 槽边往事 — use **图片首字**（PNG embedded as `<img>`) because pseudo-elements break. Inkforge's `applyHeadingDecorations` pattern is the modern equivalent (inline `<span>` instead of img).

### 1.4 Cross-browser caveats summary

| Issue | Affected | Workaround |
|---|---|---|
| Punctuation captured by `::first-letter` | Firefox vs Chromium | Use real `<span>` wrap when starting char is `"`, `「`, `（` |
| CJK baseline off | All browsers | Negative bottom margin + explicit line-height |
| `::first-letter` ignores `display: inline-block` | Spec compliance | Use `float: left` instead |
| WeChat strips pseudo | WeChat editor | Wrapper `<span>` via post-process |

---

## 2. Ornaments and Dividers (5–10 patterns)

### 2.1 Unicode glyph compendium (zero CSS cost)

| Glyph | Code | Style note |
|---|---|---|
| ❦ | `\002766` (Floral Heart) | Victorian, common book dingbat |
| ☙ | `\002619` (Reversed Floral Heart) | Pair with ❦ for symmetric break |
| ❧ | `\002767` (Rotated Floral Heart) | Asymmetric, art nouveau |
| ✦ ✧ | `\002726` `\002727` | Four-pointed star; works in tech/aigc presets |
| ✺ ✹ | `\00273A` `\002739` | Six/twelve-petal asterism |
| ❡ | `\002761` (Curved Stem Paragraph Sign) | Use as paragraph-break ornament |
| ⁂ | `\002042` (Asterism) | Classic three-asterisk break |
| ❈ | `\002748` (Heavy Sparkle) | High-contrast, good on dark bg |
| ◈ ◇ ◆ | Diamond family | Modernist, used by Knausgaard editions |
| 卐卍 | Avoid for cultural reasons | — |
| 卽 ✱ ✸ | Daggers/petals | Editorial sidebar markers |

### 2.2 Pattern A — Centered glyph divider with hairlines

The "卫报 + Atavist" combo. Two thin lines flanking a glyph, all from `<hr>` decoration.

```css
/* [Preview only — requires ::before/::after] */
#nice hr {
  border: 0;
  text-align: center;
  margin: 2.5em 0;
  overflow: visible;
}
#nice hr::before {
  content: "❦";
  display: inline-block;
  font-size: 22px;
  color: #8B0000;
  padding: 0 1em;
  background: #faf9f6;
  position: relative;
  top: -0.6em;
}
#nice hr {
  border-top: 1px solid #c8c0b0;
  height: 0;
}
```

**WeChat-safe variant** — render at post-process time as plain HTML:

```html
<!-- Replace <hr> with real markup before juice -->
<div style="text-align:center;margin:32px 0;line-height:0;">
  <span style="display:inline-block;border-top:1px solid #c8c0b0;width:38%;vertical-align:middle;"></span>
  <span style="color:#8B0000;font-size:22px;padding:0 1em;vertical-align:middle;">❦</span>
  <span style="display:inline-block;border-top:1px solid #c8c0b0;width:38%;vertical-align:middle;"></span>
</div>
```

### 2.3 Pattern B — Asterism (⁂)

The simplest, oldest editorial break. Three asterisks in triangle formation. Single character `U+2042`, no CSS gymnastics.

```css
#nice hr.asterism {
  border: 0;
  text-align: center;
  margin: 3em 0;
  color: #888;
  font-size: 18px;
  letter-spacing: 0.5em;
}
#nice hr.asterism::before { content: "⁂"; }
```

### 2.4 Pattern C — Art Deco SVG line (filigree)

Use `background-image` with inline SVG data URI. Renders sharp at all DPIs.

```css
/* [Both — background-image survives juice as inline style] */
#nice hr.deco-deco {
  border: 0;
  height: 24px;
  margin: 3em 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 24'><path d='M0 12 H110' stroke='%23B8860B' stroke-width='1'/><circle cx='120' cy='12' r='3' fill='none' stroke='%23B8860B'/><path d='M130 12 L150 4 L170 12 L150 20 Z' fill='none' stroke='%23B8860B'/><circle cx='180' cy='12' r='3' fill='none' stroke='%23B8860B'/><path d='M190 12 H300' stroke='%23B8860B' stroke-width='1'/></svg>");
  background-repeat: no-repeat;
  background-position: center;
}
```

> URL-encoding note: `#` must be encoded as `%23`, `"` as `'` inside the data URI. WeChat allows `background-image` with data URIs in inline style; tested in `.trellis/tasks/05-14-wechat-rendering-rules-research`.

### 2.5 Pattern D — Dot matrix divider

```css
#nice hr.dots {
  border: 0;
  margin: 2em 0;
  text-align: center;
  background: radial-gradient(circle, #888 1.5px, transparent 1.5px) 0 0/14px 14px;
  height: 3px;
}
```

For WeChat-safe equivalent, use repeated `<span>` dots in a `<div>`:

```html
<div style="text-align:center;margin:24px 0;letter-spacing:8px;color:#888;font-size:8px;">• • • • • • • • • • •</div>
```

### 2.6 Pattern E — Em-dash colophon

For "life", "elegant" presets — minimalist editorial pause.

```css
#nice hr.emdash {
  border: 0;
  text-align: center;
  margin: 3em 0;
  color: #999;
  font-size: 20px;
  letter-spacing: 0.2em;
}
#nice hr.emdash::before { content: "— ❧ —"; }
```

### 2.7 Pattern F — Vertical accent (between two paragraphs, no `<hr>`)

For Chinese vertical-feel layouts.

```css
#nice p + p.accent {
  position: relative;
  padding-top: 28px;
}
#nice p + p.accent::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 12px;
  background: #B8860B;
}
```

### 2.8 Pattern G — Section opener: paragraph initial ornament

Used by 收获 / 单读 layout. Place `❡` before paragraphs marked `.opener`.

```css
#nice p.opener::before {
  content: "❡";
  color: #8B0000;
  font-size: 1.1em;
  margin-right: 0.3em;
  vertical-align: 0.05em;
}
```

### 2.9 Pattern H — Side scallop (gradient mask)

CSS-only "torn paper" edge — high decorativeness for `meme` / `life` presets.

```css
#nice .scallop {
  --r: 12px;
  padding: 24px;
  background: #FFF8E7;
  mask:
    radial-gradient(var(--r) at var(--r) 50%, #0000 98%, #000) -100% 0/100% calc(2*var(--r));
}
```

*Preview-only*; mask + variables die in WeChat.

### 2.10 Pattern I — Inline ornament between heading and body

```css
#nice h2 + p::before {
  content: "✦";
  color: #B8860B;
  font-size: 0.8em;
  margin-right: 0.6em;
  vertical-align: 0.15em;
}
```

---

## 3. Heading Decorations

### 3.1 Numbered chapters via CSS counters

```css
/* [Preview only] */
#nice {
  counter-reset: chapter;
}
#nice h2 {
  counter-increment: chapter;
  position: relative;
  padding-left: 60px;
}
#nice h2::before {
  content: counter(chapter, decimal-leading-zero);
  position: absolute;
  left: 0;
  top: 0;
  font-family: "EB Garamond", serif;
  font-size: 2.4em;
  font-weight: 200;
  color: #B8860B;
  line-height: 1;
}
```

**Roman numerals** for scholarly presets:

```css
#nice h2::before { content: counter(chapter, upper-roman) "."; }
```

**CJK numerals** for `thesis` / `legal` Chinese-first presets:

```css
#nice h2::before { content: counter(chapter, cjk-decimal) "、"; }
/* Output: 一、 二、 三、 */
```

> `cjk-decimal`, `simp-chinese-formal`, `simp-chinese-informal`, `trad-chinese-formal`, `cjk-heavenly-stem`, `cjk-earthly-branch` are all spec-supported. Chromium ≥17, Firefox ≥50, Safari ≥10.1.

### 3.2 Vertical decorative bar (current InkForge `h2` look, modernized)

```css
#nice h2 {
  position: relative;
  padding-left: 16px;
  font-weight: 700;
}
#nice h2::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.2em;
  bottom: 0.2em;
  width: 4px;
  background: linear-gradient(180deg, #8B0000 0%, #C8A45C 100%);
  border-radius: 2px;
}
```

**Export-safe equivalent**: use `border-left` directly on h2 (already in current themes). No pseudo needed:

```css
#nice h2 { border-left: 4px solid #8B0000; padding-left: 16px; }
```

### 3.3 Side-margin notes via float (marginalia-lite)

For Talmudic / academic style — h3 acts as anchor, sibling `.margin-note` floats out.

```css
/* [Preview only — requires negative margin + container] */
#nice {
  max-width: 720px;
  margin: 0 auto;
  position: relative;
}
#nice .margin-note {
  float: right;
  width: 160px;
  margin-right: -200px;     /* push outside the column */
  font-size: 0.85em;
  color: #888;
  font-style: italic;
  border-left: 2px solid #ccc;
  padding-left: 10px;
  line-height: 1.4;
}
```

### 3.4 Gradient underline

```css
#nice h2 {
  display: inline-block;
  background-image: linear-gradient(180deg, transparent 80%, #FFD70080 80%);
  background-repeat: no-repeat;
  background-size: 100% 100%;
  padding: 0 4px;
}
```

Mimics highlighter pen. The trick: `background-image` survives juice inlining. For WeChat, the existing `applyHeadingDecorations` 'meme' branch already does this for `<strong>` — extend the same pattern.

### 3.5 Dash-and-dot leaders (between h2 and section number)

```css
#nice h2 {
  display: flex;
  align-items: baseline;
}
#nice h2::after {
  content: "";
  flex: 1;
  margin-left: 16px;
  border-bottom: 1px dotted #ccc;
  transform: translateY(-4px);
}
```

> Preview only — `flex` not safe for WeChat. Export-safe alternative: skip leader, use bottom border on h2.

### 3.6 H1 corner ornament (top-left art deco)

```css
#nice h1 {
  position: relative;
  padding: 24px 0 16px 36px;
  text-align: center;
}
#nice h1::before, #nice h1::after {
  content: "";
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: #B8860B;
}
#nice h1::before {
  top: 0; left: 0;
  border-top: 2px solid;
  border-left: 2px solid;
}
#nice h1::after {
  bottom: 0; right: 0;
  border-bottom: 2px solid;
  border-right: 2px solid;
}
```

### 3.7 H3 with leading glyph + small caps

```css
#nice h3 {
  font-variant-caps: all-small-caps;
  letter-spacing: 0.1em;
  color: #8B0000;
}
#nice h3::before {
  content: "◆ ";
  color: #B8860B;
  font-size: 0.7em;
  vertical-align: 0.15em;
}
```

---

## 4. Blockquote Treatments

### 4.1 Large quote glyph (Anglo style)

```css
/* [Preview only] */
#nice blockquote {
  position: relative;
  padding: 28px 32px 24px 64px;
  font-family: "EB Garamond", "Noto Serif SC", serif;
  font-style: italic;
  color: #555;
  background: #faf8f3;
  border-left: none;
}
#nice blockquote::before {
  content: "\201C";    /* " */
  position: absolute;
  top: -8px;
  left: 12px;
  font-size: 80px;
  line-height: 1;
  color: #8B0000;
  font-family: Georgia, serif;
  opacity: 0.4;
}
```

### 4.2 CJK 「」 / 『』 / 《》

```css
#nice blockquote::before {
  content: "「";
  position: absolute;
  top: 0; left: 8px;
  font-size: 48px;
  color: #8B0000;
  line-height: 1;
}
#nice blockquote::after {
  content: "」";
  position: absolute;
  bottom: -12px; right: 12px;
  font-size: 48px;
  color: #8B0000;
  line-height: 1;
}
```

### 4.3 French Guillemets «»

For European editorial flavour (legal / report presets).

```css
#nice blockquote {
  padding: 18px 28px;
  font-style: italic;
  border-left: 3px solid #1A3A5C;
  background: #f7f6f0;
}
#nice blockquote p::before { content: "« "; color: #1A3A5C; font-weight: 700; }
#nice blockquote p::after  { content: " »"; color: #1A3A5C; font-weight: 700; }
```

### 4.4 Talmudic side-note pull-quote

Use a real wrapping div around blockquote (post-process), float right.

```html
<aside class="pullquote">
  <blockquote>真理总是在少数人手里</blockquote>
</aside>
```

```css
#nice aside.pullquote {
  float: right;
  width: 240px;
  margin: 8px -120px 16px 24px;   /* extrude into right margin */
  border-top: 2px solid #8B0000;
  border-bottom: 2px solid #8B0000;
  padding: 16px 0;
}
#nice aside.pullquote blockquote {
  margin: 0;
  border: 0;
  font-family: "Noto Serif SC", serif;
  font-size: 1.2em;
  font-weight: 600;
  line-height: 1.5;
  color: #8B0000;
  text-align: center;
}
```

### 4.5 Color-blocked pull-quote (full-bleed)

```css
#nice blockquote.pull-quote {
  background: linear-gradient(135deg, #1A3A5C 0%, #2C5F8F 100%);
  color: #fff;
  padding: 32px 40px;
  border: 0;
  border-radius: 4px;
  font-size: 1.3em;
  font-weight: 500;
  margin: 32px 0;
  text-align: center;
  position: relative;
}
#nice blockquote.pull-quote::after {
  content: "— 编辑";
  display: block;
  margin-top: 16px;
  font-size: 0.7em;
  letter-spacing: 0.2em;
  opacity: 0.7;
}
```

### 4.6 Hanging punctuation

True hanging punctuation needs `hanging-punctuation: first` (Safari only, since 2017; Chromium added support in 121+; Firefox: tracking issue #1253). Fall back to negative `text-indent`.

```css
#nice blockquote {
  hanging-punctuation: first last;
  /* fallback */
  text-indent: -0.4em;
  padding-left: 0.4em;
}
```

> Caveat: combining `text-indent` fallback with paragraph `text-indent: 2em` (the `isUseIndent` preset flag) conflicts. Use it only on `<blockquote>`, never on body `<p>` when indent is enabled.

---

## 5. List Markers

### 5.1 Counter + custom prefix — Chinese numerals

```css
#nice ol.cjk-num {
  list-style: none;
  counter-reset: cjk;
  padding-left: 2em;
}
#nice ol.cjk-num > li {
  counter-increment: cjk;
  position: relative;
}
#nice ol.cjk-num > li::before {
  content: counter(cjk, cjk-decimal) "、";
  position: absolute;
  left: -2em;
  width: 2em;
  color: #8B0000;
  font-weight: 600;
}
/* Renders: 一、 二、 三、 */
```

### 5.2 Roman numerals (Ⅰ Ⅱ Ⅲ — Unicode characters, not lowercase i)

```css
#nice ol.roman > li::before {
  content: counter(item, upper-roman) ".";
}
#nice ol.roman { counter-reset: item; }
#nice ol.roman > li { counter-increment: item; list-style: none; }
```

For typographic Roman numeral Unicode (Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ at `U+2160`+), use `@counter-style` (Chromium 91+, Firefox 33+, Safari 17+):

```css
@counter-style unicode-roman {
  system: fixed Ⅰ;
  symbols: Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ Ⅷ Ⅸ Ⅹ Ⅺ Ⅻ;
  suffix: ". ";
}
#nice ol.uroman { list-style: unicode-roman; }
```

### 5.3 Diamond / square markers

```css
#nice ul.diamond { list-style: none; padding-left: 1.5em; }
#nice ul.diamond > li { position: relative; }
#nice ul.diamond > li::before {
  content: "◇";
  position: absolute;
  left: -1.5em;
  color: #B8860B;
}
#nice ul.diamond > li.featured::before { content: "◆"; }
```

### 5.4 Filled/outlined toggle by nesting

```css
#nice ul > li::marker { color: #8B0000; }
#nice ul > li > ul > li::marker { content: "▢ "; color: #C8A45C; }
#nice ul > li > ul > li > ul > li::marker { content: "▶ "; color: #8B0000; }
```

> `::marker` styling: Chromium 86+, Firefox 68+, Safari 11.1+. Allowed properties on `::marker` are limited (color, content, font-*, white-space, animation, transition — NOT background, NOT layout).

### 5.5 Tight vs loose spacing strategies

```css
/* Tight (technical lists) */
#nice ul.tight > li { margin-bottom: 0.25em; line-height: 1.5; }

/* Loose (editorial / poetry) */
#nice ul.loose > li { margin-bottom: 1.2em; line-height: 2; }
```

For paragraphs inside `<li>`, override the default `margin: 0` to maintain rhythm:

```css
#nice li > p { margin: 0 0 0.4em 0; }
#nice li > p:last-child { margin-bottom: 0; }
```

### 5.6 Definition-list style 序号 with hanging indent

```css
#nice ol.indented > li {
  list-style-position: outside;
  padding-left: 0.4em;
  margin-left: 1.5em;
}
```

---

## 6. Page-Edge Ornaments / Marginalia

### 6.1 Article container (the prerequisite)

All marginalia need a positioning context.

```css
#nice {
  max-width: 720px;
  margin: 0 auto;
  position: relative;
  /* important: padding to make room for marginalia */
  padding: 0 40px;
}
```

### 6.2 H1 art deco corners (already shown in 3.6) — combine with side bracket

```css
#nice h1 {
  position: relative;
  text-align: center;
  padding: 28px 0;
}
#nice h1::before, #nice h1::after {
  content: "";
  position: absolute;
  width: 60px;
  height: 1px;
  background: #B8860B;
  top: 50%;
}
#nice h1::before { left: 0; }
#nice h1::after  { right: 0; }
```

### 6.3 Footer ribbon

```css
#nice::after {
  content: "— InkForge · 2026 —";
  display: block;
  text-align: center;
  margin-top: 4em;
  padding: 12px 0;
  border-top: 1px solid #ddd;
  color: #999;
  font-size: 0.85em;
  letter-spacing: 0.3em;
}
```

> `#nice::after` requires preview-only; for export, append a real `<div>` post-process.

### 6.4 Marginalia anchor — footnote-like inline numbers

```css
#nice {
  counter-reset: footnote;
}
#nice sup.fn {
  counter-increment: footnote;
  font-size: 0.7em;
  vertical-align: super;
  color: #8B0000;
  margin: 0 0.2em;
}
#nice sup.fn::before { content: counter(footnote); }
```

Pair with absolute-positioned side note for "true" marginalia:

```css
#nice .side-note {
  position: absolute;
  right: -180px;
  width: 160px;
  font-size: 0.78em;
  color: #666;
  line-height: 1.5;
  padding-left: 8px;
  border-left: 1px solid #ccc;
  /* y position is set inline per-note via style="top:..." */
}
```

This is preview-only; absolute positioning breaks in WeChat.

### 6.5 Decorative left-margin column (`thesis` style)

A 1px hairline rule running the full height of the article, with section markers as dots.

```css
#nice {
  position: relative;
  padding-left: 60px;
}
#nice::before {
  content: "";
  position: absolute;
  left: 24px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, #B8860B 5%, #B8860B 95%, transparent);
}
#nice h2::before {       /* dot on the rail */
  content: "";
  position: absolute;
  left: -42px;
  top: 0.6em;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #B8860B;
  box-shadow: 0 0 0 2px #fff;
}
```

---

## 7. Mode Boundaries — What Works Where

### 7.1 Capability matrix

| Technique | Preview (webview) | WeChat export | XHS export | Zhihu export |
|---|:--:|:--:|:--:|:--:|
| `::first-letter` | YES | NO | NO | NO |
| `::before` / `::after` | YES | NO (juice cannot inline) | NO | NO |
| `::marker` | YES (limited props) | NO | NO | NO |
| `counter()` / `counter-reset` | YES | NO (pseudo dies) | NO | NO |
| `content: ""` for ornaments | YES | NO | NO | NO |
| `background-image: url(data:...)` | YES | YES (inline style) | YES | YES (when supported) |
| `linear-gradient` background | YES | RISKY (kept by enforcePlatformCSS, may render varied on clients) | YES | YES |
| `linear-gradient` text clip | YES | NO (`background-clip:text` stripped) | NO | NO |
| `float: left/right` | YES | YES (kept) | YES | YES |
| `position: relative` | YES | YES | YES | YES |
| `position: absolute` | YES | NO (unstable) | NO | NO |
| CSS Grid / Flex (primary layout) | YES | NO | NO | NO |
| CSS variables `var()` | YES | NO | NO | NO |
| `calc()` / `clamp()` | YES | NO | NO | NO |
| `transform` | YES | NO (stripped) | NO | NO |
| `@counter-style` declaration | YES | NO | NO | NO |
| `hanging-punctuation` | Safari only | NO | NO | NO |
| `initial-letter` | Safari + Chromium 110+(flag) | NO | NO | NO |
| Unicode glyphs in `content` | YES | NO | NO | NO |
| Unicode glyphs as real text | YES | YES | YES | YES |
| `border`, `border-radius` | YES | YES | YES | YES |
| `box-shadow` | YES | YES | YES | YES |
| `opacity` | YES | YES | YES | YES |
| `text-decoration` thickness | YES | PARTIAL (basic underline only) | YES | YES |
| `font-variant: small-caps` | YES | YES (Latin only) | YES | YES |
| `font-feature-settings` | YES | RISKY | YES | YES |

### 7.2 Strategy: dual-track CSS per preset

Mirror the existing pattern in `themes.ts`:

```ts
{
  customCSS: '...',                  // injected pre-juice for the preview pane
  applyHeadingDecorations(preset)    // transforms pseudo-elements into real <span> for WeChat
}
```

For the new preset overhaul, formalize this into two strings per preset:

- `previewCSS`: full richness — `::first-letter`, `::before`, `counter`, `position: absolute`. Goes into the `<style>` block in PreviewPanel.
- `exportCSS`: bare-bones colours / borders / fonts that survive juice + `enforcePlatformCSS`.
- `decorate(html, target: 'preview'|'wechat'|'xhs'|'zhihu')`: post-process function that injects real `<span>` ornaments for export targets, leaves preview HTML untouched (preview gets ornaments via CSS).

### 7.3 Reference: where the existing pipeline strips features

- `inkforge/src/services/export/platform-css.ts`: defines the per-platform property whitelist.
- `inkforge/src/services/export/wechat.ts:1194` `generateThemeCSS` — preset CSS injection point.
- `inkforge/src/services/export/themes.ts:590-700` `applyHeadingDecorations` — the established "pseudo → real span" rewriting pattern. Extend this for drop caps, ornaments, list prefixes.
- WeChat compatibility specifics: see `.trellis/tasks/05-14-wechat-rendering-rules-research/research/wechat-css-svg-rules.md` (canonical reference for hard rules).

---

## 8. Quick-Pick Recipe Bank (10 concrete blocks ready to paste into `customCSS`)

### Recipe 1 — Magazine drop cap (preview-only)

```css
#nice > p:first-of-type::first-letter {
  font-family: "EB Garamond", "Source Han Serif SC", serif;
  font-size: 3.6em; font-weight: 700; float: left;
  line-height: 0.85; margin: 0.05em 0.12em 0 0;
  color: var(--accent, #8B0000);
}
```

### Recipe 2 — CJK drop cap with wrapper span (export-safe)

```css
#nice .dropcap {
  float: left; font-family: "Noto Serif SC", serif;
  font-size: 56px; line-height: 48px;
  margin: 4px 10px 0 0; color: #8B0000; font-weight: 900;
}
```
Pair with post-process that wraps the first character of `<p>` into `<span class="dropcap">`.

### Recipe 3 — Centred floral divider

```css
#nice hr {
  border: 0; text-align: center; margin: 2.5em 0;
  height: 1px; background: #c8c0b0; overflow: visible;
}
#nice hr::before {
  content: "❦"; display: inline-block;
  font-size: 22px; color: #8B0000;
  padding: 0 1em; background: var(--page-bg, #fff);
  position: relative; top: -0.7em;
}
```

### Recipe 4 — Numbered chapter heading

```css
#nice { counter-reset: chapter; }
#nice h2 {
  counter-increment: chapter; position: relative;
  padding-left: 70px; min-height: 1.6em;
}
#nice h2::before {
  content: counter(chapter, decimal-leading-zero);
  position: absolute; left: 0; top: -0.15em;
  font: 200 2.6em/1 "EB Garamond", serif;
  color: var(--accent, #B8860B);
}
```

### Recipe 5 — CJK numbered heading

```css
#nice { counter-reset: cjkch; }
#nice h2 {
  counter-increment: cjkch; position: relative; padding-left: 2.6em;
}
#nice h2::before {
  content: "第" counter(cjkch, cjk-decimal) "章";
  position: absolute; left: 0; top: 0.05em;
  font-size: 0.6em; color: #8B0000;
  letter-spacing: 0.05em; padding: 4px 8px;
  border: 1px solid #8B0000; border-radius: 2px;
}
```

### Recipe 6 — Large quote-mark blockquote

```css
#nice blockquote {
  position: relative; padding: 28px 32px 24px 64px;
  font-style: italic; color: #555;
  background: #faf8f3; border-left: none; border-radius: 4px;
}
#nice blockquote::before {
  content: "\201C"; position: absolute;
  top: -8px; left: 12px; font-size: 80px; line-height: 1;
  color: var(--accent, #8B0000);
  font-family: Georgia, serif; opacity: 0.4;
}
```

### Recipe 7 — Roman numeral ordered list

```css
#nice ol.roman { counter-reset: rmn; list-style: none; padding-left: 2.4em; }
#nice ol.roman > li { counter-increment: rmn; position: relative; }
#nice ol.roman > li::before {
  content: counter(rmn, upper-roman) ".";
  position: absolute; left: -2.4em; width: 2em; text-align: right;
  color: #8B0000; font-family: "EB Garamond", serif; font-weight: 600;
}
```

### Recipe 8 — Highlighter underline on h2

```css
#nice h2 {
  display: inline-block;
  background-image: linear-gradient(180deg, transparent 70%, #FFD70066 70%);
  background-repeat: no-repeat;
  background-size: 100% 100%;
  padding: 0 6px;
}
```

### Recipe 9 — Art deco corner brackets on h1

```css
#nice h1 { position: relative; padding: 28px 36px; text-align: center; }
#nice h1::before, #nice h1::after {
  content: ""; position: absolute;
  width: 28px; height: 28px; border-color: var(--accent, #B8860B);
}
#nice h1::before { top: 0; left: 0; border-top: 2px solid; border-left: 2px solid; }
#nice h1::after  { bottom: 0; right: 0; border-bottom: 2px solid; border-right: 2px solid; }
```

### Recipe 10 — Left-rail with section dots

```css
#nice { position: relative; padding-left: 60px; }
#nice::before {
  content: ""; position: absolute; left: 24px; top: 0; bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, #B8860B 5%, #B8860B 95%, transparent);
}
#nice h2 { position: relative; }
#nice h2::after {
  content: ""; position: absolute;
  left: -44px; top: 0.5em;
  width: 9px; height: 9px; border-radius: 50%;
  background: #B8860B; box-shadow: 0 0 0 2px #fff;
}
```

### Bonus Recipe 11 — SVG filigree hr (data-URI, export-safe)

```css
#nice hr {
  border: 0; height: 24px; margin: 3em 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 24'><path d='M0 12 H110' stroke='%23B8860B'/><circle cx='120' cy='12' r='3' fill='none' stroke='%23B8860B'/><path d='M130 12 L150 4 L170 12 L150 20 Z' fill='none' stroke='%23B8860B'/><circle cx='180' cy='12' r='3' fill='none' stroke='%23B8860B'/><path d='M190 12 H300' stroke='%23B8860B'/></svg>");
  background-position: center; background-repeat: no-repeat;
}
```

### Bonus Recipe 12 — Pull-quote color block

```css
#nice blockquote.pull {
  background: linear-gradient(135deg, #1A3A5C, #2C5F8F);
  color: #fff; padding: 32px 40px; border: 0; border-radius: 4px;
  font-size: 1.3em; font-weight: 500;
  margin: 32px 0; text-align: center;
}
#nice blockquote.pull::after {
  content: "— 编辑"; display: block; margin-top: 16px;
  font-size: 0.7em; letter-spacing: 0.2em; opacity: 0.7;
}
```

---

## 9. Mapping Recipes to InkForge's 17 Presets (suggestions, non-binding)

| Preset | Drop cap | Divider | H2 deco | Blockquote | List | Edge |
|---|---|---|---|---|---|---|
| thesis | R1 (gold) | R3 (❦) | R5 (CJK 第N章) | R6 (大 ") | R7 (Roman) | R10 (rail) |
| legal | — | R3 (·) | R4 (numbered) | R6 («») | R7 (Roman) | R9 (corners) |
| report | — | thin rule | R8 (color band) | minimal | tight | — |
| commentary | R1 (red) | em-dash | R8 (red highlight) | R6 (italic) | — | — |
| aigc | — | R11 (SVG geo) | gradient bar | gradient bg | diamond | — |
| code | — | dotted | hash prefix `# ` | `// quote` | — | — |
| notes | — | dot matrix | R8 (yellow hl) | card | diamond | — |
| news | — | thick black hr | R4 (white-on-black) | minimal | — | — |
| meme | — | dashed pink | R8 (highlight) | speech bubble | emoji | — |
| life | small CJK | em-dash (R5) | hairline ↓ | italic minimal | loose | — |
| elegant | R2 (CJK) | R3 (❦) | R8 (gold underline) | R6 (large ") | R7 | R9 (corners) |
| tech | — | R11 SVG | gradient band | gradient | — | — |
| xhs presets | — | emoji dividers | colored pill | colored card | emoji | — |
| zhihu presets | — | hairline | bold weight | grey block | — | — |

---

## Caveats / Not Found

- `initial-letter` CSS spec exists but cross-browser support is poor; treat as progressive enhancement only.
- `hanging-punctuation` Safari-only as of 2026-05 in stable channels; Chromium 121+ shipped support. Firefox tracking issue is still open.
- Could not directly invoke `mcp__exa__web_search_exa` from this agent context — recommendations above draw on (a) the existing `.trellis/tasks/05-14-wechat-rendering-rules-research` report, (b) known stable CSS standards (CSS Lists Level 3, CSS Generated Content Level 3, CSS Pseudo-Elements Level 4), and (c) public design-system documentation (Guardian Type Style Guide, NYT Magazine engineering blog, Atavist engineering posts).
- XHS/Zhihu pseudo-element support not separately confirmed beyond "behaves like WeChat for safety" — recommend verifying via `inkforge/src/services/export/platform-css.ts` definitions when implementing.
- `@counter-style` is widely supported but not used in InkForge code yet; if adopted, place it in `previewCSS` only and provide `list-style: decimal` fallback.

## Related Files in Repo

| File | Why relevant |
|---|---|
| `inkforge/src/services/export/themes.ts` | 17 preset definitions, `generateThemeCSS`, `applyHeadingDecorations` |
| `inkforge/src/services/export/platform-css.ts` | Per-platform CSS property whitelist |
| `inkforge/src/services/export/wechat.ts` | Export pipeline; juice + post-process step where pseudo-element → span happens |
| `inkforge/src/services/export/shared-typography.ts` | Shared font stacks etc. |
| `.trellis/tasks/05-14-wechat-rendering-rules-research/research/wechat-css-svg-rules.md` | Canonical WeChat CSS/SVG support matrix |
| `.trellis/tasks/05-23-preset-typography-overhaul/prd.md` | Parent PRD with the 4 research deliverables |
