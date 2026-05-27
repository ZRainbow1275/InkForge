# Research: WeChat List Styling, Indentation, and Vertical Spacing Best Practices

- **Query**: Best practices for list styling (ul/ol), indentation, vertical spacing, punctuation orphaning, and block-level margins in WeChat articles on mobile (375px)
- **Scope**: mixed (internal codebase + external references: doocs/md, mdnice, 135editor, wewrite)
- **Date**: 2026-05-27

---

## 1. List Indentation (padding-left / margin-left)

### WeChat Editor Default
The WeChat native rich-text editor applies approximately **40px padding-left** on `<ul>` and `<ol>` when entered natively. This is widely considered too generous for mobile. The WeChat webview does NOT strip `padding-left` from list elements, so custom inline values are respected.

### Professional Tool Defaults

| Tool / Template | ul padding-left | ol padding-left | Notes |
|---|---|---|---|
| doocs/md (default) | `1.5em` (~24px at 16px base) | `1.5em` (~24px) | Their CSS: `#nice ul, #nice ol { padding-left: 1.5em; margin: 1em 0; }` |
| mdnice (wechat-elegant) | `2em` (~32px) | `2em` (~32px) | Higher indent, academic feel |
| 135editor templates | `1em`-`1.5em` (16-24px) | `1.2em`-`1.5em` (19-24px) | Mobile-first, tighter indent |
| wewrite (oaker-io) | `1.6em` (~26px) | `1.6em` (~26px) | Balanced approach |
| InkForge baseCSS | `24px` | `24px` | `themes.ts:263` |
| InkForge elegant preset | `1.4em` (~22px) | `1.4em` (~22px) | `themes.ts:376` |
| InkForge legal preset | inherits base | `2em` (~30px) | `themes.ts:434` — wider for Roman numerals |
| InkForge report preset | inherits base | `0` (custom counter) | `themes.ts:491` — uses `::before` counter with `padding-left:2.2em` on `li` |

### Recommended Range for Mobile (375px)
- **Optimal**: `1.2em`-`1.5em` (19-24px at 16px base)
- **Maximum before horizontal space becomes problematic**: `2em` (32px) leaves only ~303px for content on a 367px effective width (375px - 8px padding), yielding ~18 CJK chars per line in list items -- still readable but tight
- At `24px` (InkForge default): content area = 343px, list text gets ~21 CJK chars/line (acceptable)
- At `32px`: list text gets ~19 CJK chars/line (marginal)

### Critical constraint
The WeChat article container on mobile has its own ~16px side padding. Combined with InkForge's `section#nice` padding (currently `0 4px`), the effective content width is `375 - 32 - 8 = 335px`. Every pixel of list indent matters.

---

## 2. Nested List Indent

### Observed Patterns

| Source | Additional indent per level | Notes |
|---|---|---|
| doocs/md | Same `1.5em` per level | Compounds quickly: level 2 = 3em, level 3 = 4.5em |
| 135editor | `0.8em`-`1em` per level | Tighter nesting to preserve horizontal space |
| WeChat native editor | ~40px per level | Way too deep for mobile |
| Professional consensus | `1em` per level | Common in "10 万+" articles |

### InkForge Current Behavior
InkForge's `fixNestedLists()` in `wechat.ts:544` actually **extracts nested lists out of `<li>` tags** because WeChat renders `li > ul/ol` abnormally. The nested list gets moved to be a sibling after the parent `</li>`. This means nesting indent is handled by the browser's default nested list rendering, not by explicit CSS.

### Recommended
- Level 1: `1.2em`-`1.5em`
- Level 2+: `1em` additional per level
- Maximum practical depth on 375px: 2 levels (3 levels renders ~13 CJK chars/line, unreadable)

---

## 3. List Item Spacing (li margin/padding)

### Observed Patterns

| Source | li margin-bottom | li line-height | Notes |
|---|---|---|---|
| doocs/md | `0.5em` (~8px) | `1.75` | Compact but readable |
| mdnice | `0.4em`-`0.6em` | `1.75` | Varies by preset |
| 135editor tight | `4px`-`6px` | `1.6`-`1.7` | Mobile-optimized |
| 135editor loose | `8px`-`10px` | `1.75`-`1.85` | Formal/academic |
| WeChat native | `~0` (default UA) | `1.6` | No extra spacing |
| InkForge baseCSS | `9px` | `1.8` | `themes.ts:267-268` |
| InkForge report preset | `0.4em`-`0.5em` (~6-8px) | inherit (1.75) | `themes.ts:490,492` |

### Recommended for 30,000-word articles
- `margin-bottom: 0.4em` (6-7px at 16px base) -- tighter than InkForge's current 9px
- `line-height: 1.75` (matches body copy)
- Rationale: In a long-form article, loose list spacing (>8px per item) makes 10-item lists occupy excessive vertical space, breaking reading rhythm. Professional WeChat articles targeting mobile use tight list spacing.

---

## 4. Punctuation Orphaning Prevention

### The Problem
Chinese punctuation marks (full-width colon, comma, period, semicolon) can wrap to the start of a new line, which is typographically incorrect in Chinese. The marks are: `：` `，` `。` `；` `、` `）` `》` `】` `」` `』`

### CSS Solutions

#### `line-break: strict` (RECOMMENDED -- already partially used)
```css
line-break: strict;
```
This tells the browser to apply CJK line-breaking rules strictly:
- Prevents kinsoku-shori violations (opening brackets at line end, closing brackets at line start)
- Prevents punctuation at line start
- **WeChat webview support**: YES -- the iOS/Android WebView both support `line-break`
- **Already present in**: `preset-fonts.ts:211` (`line-break: strict`) but NOT in the base CSS at `themes.ts:142-151` or in the `wechat.ts:1028` section#nice fallback

#### `word-break: break-word` vs `word-break: break-all`
```css
word-break: break-word;  /* PREFERRED -- respects CJK rules */
/* NOT: word-break: break-all; -- this ignores kinsoku-shori */
```
- `break-word` (alias for `overflow-wrap: break-word` in most engines): breaks long words but respects CJK punctuation rules
- `break-all`: breaks at any character boundary INCLUDING before punctuation -- CAUSES orphaning
- **InkForge current**: Uses `word-break: break-word` on section#nice (correct) but some elements use `word-break: break-all` (LaTeX fallback at `wechat.ts:264,267` -- acceptable there since it's formula text, not prose)

#### `overflow-wrap: break-word` (complementary)
```css
overflow-wrap: break-word;
```
Should be paired with `word-break` for robustness. Handles edge case of very long Latin strings within CJK text.

#### `hanging-punctuation` (NOT recommended)
```css
hanging-punctuation: first last allow-end;
```
Elegant solution but **NOT supported in WeChat webview** (WebKit-based but the property is Safari-only as of 2026, and WeChat's X5/Chromium kernel does not implement it).

### Recommended CSS for WeChat Anti-Orphaning
```css
section#nice {
  line-break: strict;
  word-break: break-word;
  overflow-wrap: break-word;
}
```
All three properties are supported in WeChat's WebView (both iOS WKWebView and Android X5 Chromium kernel). The combination ensures:
1. CJK punctuation never starts a line (`line-break: strict`)
2. Long mixed-script words break safely (`word-break: break-word`)
3. Overflow is prevented (`overflow-wrap: break-word`)

### Gap in Current InkForge Code
- `preset-fonts.ts:211` sets `line-break: strict` but this only applies to the "narrowColumn" base CSS, not to all presets
- `themes.ts:149` (baseCSS for all presets) sets `word-break: break-word` but NOT `line-break: strict`
- `wechat.ts:1028` (section#nice fallback) sets `word-break: break-word` but NOT `line-break: strict`
- **Missing**: `line-break: strict` should be in the baseCSS and the wechat.ts section#nice fallback

---

## 5. Vertical Spacing Between Elements

### Observed Professional Values (compiled from doocs/md, 135editor templates, 秀米, and "10万+" articles)

#### Heading to Body Text

| Transition | Recommended | InkForge baseCSS | doocs/md | Notes |
|---|---|---|---|---|
| H1 bottom margin | `20px`-`24px` | `20px` (`themes.ts:164`) | `20px` | After title |
| H2 bottom margin | `14px`-`18px` | `16px` (`themes.ts:173`) | `15px` | H2 to first para |
| H3 bottom margin | `10px`-`14px` | `12px` (`themes.ts:186`) | `10px` | Tight coupling to content |
| H4 bottom margin | `8px`-`10px` | `8px` (`themes.ts:196`) | `8px` | Subheading |

#### Body Paragraphs

| Metric | Recommended | InkForge baseCSS | doocs/md | 135editor |
|---|---|---|---|---|
| p margin-bottom | `0.8em`-`1.2em` (13-19px) | `18px` (`themes.ts:154`) | `1em` (16px) | `0.8em`-`1em` |
| p line-height | `1.75`-`1.85` | `1.85` (`themes.ts:156`) | `1.75` | `1.6`-`1.75` |

Note: InkForge's 18px paragraph gap is slightly loose compared to the 13-16px range used by doocs/md and 135editor. For long-form articles this matters: 200 paragraphs x 18px = 3600px of gap vs 200 x 14px = 2800px -- an 800px difference in total scroll height.

#### Body Text to List

| Transition | Recommended | InkForge baseCSS | doocs/md |
|---|---|---|---|
| ul/ol margin-top | `0.8em`-`1.2em` (13-19px) | `16px` (`themes.ts:262`) | `1em` (16px) |
| ul/ol margin-bottom | `0.8em`-`1.2em` | `16px` | `1em` |

#### List to Next Heading

| Transition | Recommended | Notes |
|---|---|---|
| ul/ol bottom + H2 top | combined `2em`-`2.5em` (32-40px) | The heading's top margin does this work |
| ul/ol bottom + H3 top | combined `1.5em`-`2em` (24-32px) | H3 creates section break |

#### Between List and Blockquote

| Transition | Recommended | InkForge baseCSS |
|---|---|---|
| blockquote margin-top | `1em`-`1.5em` (16-24px) | `18px` (`themes.ts:249`) |
| blockquote margin-bottom | `1em`-`1.5em` | `18px` |

### 135editor / 秀米 Specific Observations
- 135editor uses very tight spacing: `p { margin: 0; padding-bottom: 12px; }` (avoid margin, use padding to prevent WeChat margin collapsing)
- 秀米 uses `section` wrappers around each element with explicit `padding` instead of margins for spacing control
- Both tools avoid margin-top on paragraphs and use only margin-bottom or padding-bottom, because WeChat's webview has unpredictable margin collapsing at the top of containers

---

## 6. WeChat Margin Behavior and Known Issues

### Margin Collapsing in WeChat Webview
- **Adjacent sibling margins DO collapse** in WeChat's webview (standard CSS behavior)
- **Parent-child margin collapsing ALSO happens** -- a `<p>` with `margin-top` inside a `<section>` can merge with the section's own margin
- **InkForge already handles the most critical case**: `wechat.ts:900-904` zeros out the first element's `margin-top` (doocs/md best practice)

### Known WeChat Margin Stripping
- WeChat does NOT strip `margin` from inline-styled elements
- WeChat DOES sometimes strip margin from elements without inline styles (relying on class-based CSS)
- Since InkForge uses `juice` to inline all CSS, margins survive the WeChat paste

### Margin vs Padding Strategy for WeChat

| Property | Behavior in WeChat | Recommendation |
|---|---|---|
| `margin-top` on first child | May create unwanted gap at top | Zero it (already done) |
| `margin-bottom` on paragraphs | Stable, reliable | Use for vertical rhythm |
| `margin` on ul/ol | Stable | Use normally |
| `padding` on ul/ol | Stable; affects indent | Use `padding-left` for indent |
| `margin` on blockquote | Stable but collapses with adjacent margins | Use consistent values |
| `margin-top` on headings | Stable; primary section-break mechanism | Use `1.4em`-`2em` |

### WeChat-Specific Gotcha: `margin: auto`
InkForge's `wechat.ts:919-920` already handles this:
```js
result = result.replace(/margin:\s*(\d+)px\s+auto/g, 'margin: $1px 0')
result = result.replace(/margin:\s*auto/g, 'margin: 0')
```
WeChat does not support `margin: auto` for centering (no `display:flex` available).

---

## 7. Blockquote Styling on Mobile

### Professional Template Patterns

| Source | border-left | padding | background | border-radius |
|---|---|---|---|---|
| doocs/md | `3px solid <accent>` | `10px 15px` | `#f7f7f7` or theme bg | `0` |
| mdnice | `4px solid <accent>` | `12px 16px` | theme-specific | `0 4px 4px 0` |
| 135editor | `3px solid <color>` | `8px 12px` | `#f5f5f5` or transparent | `0`-`4px` |
| 秀米 | `2px`-`4px solid` | `10px 14px` | semi-transparent | varies |
| InkForge baseCSS | `4px solid #0066cc` | `14px 16px` | `#F6F8FA` | `0 6px 6px 0` |
| InkForge wechat.ts fallback | `4px solid <accent>` | `12px 16px` | `#f5f7f9` | `0 8px 8px 0` |

### Mobile-Specific Concerns (375px)
- **Effective content width in blockquote**: 367px (viewport) - 8px (section padding) - 4px (border-left) - 32px (blockquote padding L+R) = **323px** (~20 CJK chars at 16px)
- **Risk**: With 14px-16px horizontal padding on EACH side, blockquotes eat 36-40px of horizontal space. On Android 360px devices, that's worse.
- **Professional practice**: Keep blockquote padding tighter on mobile: `8px 12px` is the 135editor standard, vs InkForge's `14px 16px`

### Recommended Blockquote CSS for WeChat Mobile
```css
blockquote {
  margin: 1em 0;
  padding: 10px 14px;
  border-left: 3px solid <accent>;
  background: <light-bg>;
  border-radius: 0 4px 4px 0;
  font-size: 15px;
  line-height: 1.75;
  color: #555;
}
blockquote p {
  margin: 4px 0;
  text-indent: 0;
}
```

---

## Codebase File Reference

| File | Relevance |
|---|---|
| `inkforge/src/services/export/themes.ts:140-268` | baseCSS with all default spacing values for #nice elements |
| `inkforge/src/services/export/themes.ts:360-500` | Per-preset overrides (elegant, legal, report) with custom list/blockquote CSS |
| `inkforge/src/services/export/wechat.ts:885-1061` | postProcessForWechat() -- all WeChat-specific HTML transforms |
| `inkforge/src/services/export/wechat.ts:1028` | section#nice fallback style (font-size, line-height, word-break) |
| `inkforge/src/services/export/platform-rules/wechat.ts` | CJK/Latin spacing, content-width clamp, dark-mode metadata |
| `inkforge/src/services/export/preset-fonts.ts:200-215` | narrowColumn base CSS with `line-break: strict` |
| `inkforge/src/services/export/platform-css.ts:81-98` | WECHAT_SUPPORT matrix (flexbox:false, calc:false, etc.) |
| `inkforge/src/services/export/css-validator.ts` | CSS property validation and fallback rules |
| `inkforge/src/services/export/shared-typography.ts` | Typography config to CSS variable mapping |

---

## Caveats / Not Found

1. **No live 135editor/秀米 CSS dumps**: These tools generate inline-styled HTML and their templates are not open-source. Values above are from inspecting exported HTML in blog posts analyzing their output, and from the tools' visual behavior on mobile. Exact pixel values may vary by template.

2. **`line-break: strict` support in WeChat X5 kernel**: Confirmed supported in Chromium (which X5 is based on) since Chrome 58. WeChat's current X5 kernel is Chromium 107+. iOS WeChat uses WKWebView (Safari engine) which also supports `line-break: strict` since Safari 11.

3. **`hanging-punctuation` NOT supported**: Despite being a W3C recommendation, this property only works in Safari. WeChat's Android webview (X5/Chromium) does not support it. Do not rely on it.

4. **doocs/md CSS values**: Referenced from their open-source repository at `github.com/doocs/md`. Their default theme uses CSS that is well-tested in WeChat production articles.

5. **Margin collapsing**: The research on WeChat margin behavior is based on doocs/md documentation and InkForge's own comments in `wechat.ts`. Direct testing in WeChat's editor would confirm edge cases.
