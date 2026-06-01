# Research: Inline SVG capabilities & boundaries inside WeChat Official Account (微信公众号) articles

- **Query**: What inline SVG survives pasting into the 公众号后台编辑器 and renders on mobile (2024–2026); what dies; the content width model; how 秀米/135editor deliver "SVG互动"; gotchas.
- **Scope**: External (web) — primary evidence from production WeChat-SVG tools, Apple-article reverse-engineering, and MDN baseline.
- **Date**: 2026-06-01
- **Feeds**: A feature that injects hand-authored parametric inline SVG into pasted WeChat article HTML for premium typesetting.

---

## ⚠️ Evidence-quality note (read first)

WeChat does **not publish** an official whitelist of allowed SVG/HTML for article body content. There is **no primary spec from Tencent**. Everything below is reconstructed from:

1. **Reverse-engineering of Apple's own official WeChat articles** + an explicit, battle-tested filter ruleset — `S-N-Lewis/wechat-apple-layout` ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [anatomy](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md), [animation snippets](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md), [QA checklist](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/qa-checklist.md), [SKILL](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md)).
2. **A working, deployable SVG-in-WeChat demo** — `Yuezi32/weixin_svg_demo` ([index.html](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html), [repo](https://github.com/Yuezi32/weixin_svg_demo)). README explicitly states: "加入微信公众号的 SVG 仅需把全部 `<svg>` 代码嵌入" (to add to WeChat, just embed the entire `<svg>` code) and that width auto-adapts via `width:100%`.
3. **A production open-source WeChat SVG editor's source code** — `cailven/opensvg` ([repo](https://github.com/cailven/opensvg), live editor [cailven.github.io/opensvg](https://cailven.github.io/opensvg/)). Its block components reveal the exact markup it emits for WeChat (e.g., [ClickSwitchBlock/Preview.vue](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue), [ScrollBlock/Preview.vue](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ScrollBlock/Preview.vue), [ImgBlock/Preview.vue](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ImgBlock/Preview.vue)).
4. **MDN** for SVG-spec baseline facts (e.g., [`<foreignObject>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject)).

These four converge strongly. The WeChat **rendering engine on mobile is the system WebView** (WKWebView on iOS, X5/system WebView on Android) — so the *renderer* itself supports almost all of SVG; the constraint is **WeChat's HTML sanitizer that runs on paste/save/publish**, which strips most non-SVG dynamic surface and all scripting. The `S-N-Lewis` repo's stack note states plainly: "纯 HTML + inline CSS（微信禁止 `<style>` 标签）", "JavaScript（微信完全禁止）", "`<style>` 标签（会被吞掉）", "`foreignObject`（内部HTML被过滤）" ([SKILL](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md)).

Where a feature was **never present** in any of the three battle-tested codebases (notably `<linearGradient>`/`<radialGradient>`, `<clipPath>`, `<mask>`, `<filter>`, `<use>`), I mark it **CONDITIONAL / UNVERIFIED** rather than asserting survival — absence from Apple-grade reverse-engineered templates is itself a caution signal. Treat those as "test before relying on."

---

## 1. Capability table — SURVIVES / DIES / CONDITIONAL

Legend: **SURVIVES** = confirmed in working WeChat-deployed SVG by ≥1 primary source. **DIES** = explicitly documented as stripped/filtered. **CONDITIONAL** = renderer supports it but not seen in battle-tested WeChat templates / behavior varies → verify.

### Core structure & shapes

| Feature | Verdict | Evidence |
|---|---|---|
| `<svg>` root | **SURVIVES** | Core of every demo. ([Yuezi index.html](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html), [opensvg blocks](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)) |
| `viewBox` | **SURVIVES** (mandatory) | Iron rule "所有 SVG 必须有 viewBox" ([SKILL §铁律 #7](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md)). Used in every template. Note: WeChat editor lowercases it to `viewbox`; both render. |
| `<path>` (+ `d`, `fill`, `transform`) | **SURVIVES** | Many `<path>` with `fill="#..."` and `transform="translate(...)"` in [Yuezi demo](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html) (firecracker artwork). |
| `<rect>` (+ `rx`/`ry`, `width`/`height`, `fill`, `stroke`, `stroke-width`, `opacity`) | **SURVIVES** | `<rect width="92" height="229" rx="12" ry="12" fill="#fc4d50">` ([Yuezi](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html)); `<rect ... rx="16" fill="rgba(...)" stroke="rgba(...)" stroke-width="1"/>` ([seed-svg-text-layout](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-svg-text-layout.html)). |
| `<circle>` (+ `cx`/`cy`/`r`, `fill`, `opacity`) | **SURVIVES** | `<circle cx="800" cy="200" r="300" fill="#667eea" opacity="0.06"/>` and pulse `<circle … fill="#FF6B6B">` ([seed text](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-svg-text-layout.html), [anim snippets](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md)). |
| `<line>` | **CONDITIONAL** | Not seen in templates (they use thin `<rect>` for dividers instead). Renderer supports `<line>`; no reason to be stripped, but the "draw a line" idiom in real WeChat SVG is a 1px-high `<rect>`. Verify. |
| `<polygon>` / `<polyline>` | **CONDITIONAL** | Not present in collected templates. Same shape family as `<path>`/`<rect>` (all "presentation" elements) → very likely survives, but untested in these sources. |
| `<g>` (group, `transform`, `opacity`, `style`) | **SURVIVES** | Heavily used: `<g style="transform: translate(140px,580px);">`, `<g opacity="0">` ([Yuezi](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html), [anim snippets](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md)). |

### Text

| Feature | Verdict | Evidence |
|---|---|---|
| `<text>` (+ `x`/`y`, `fill`, `font-size`, `font-weight`, `font-family`) | **SURVIVES** | `<text x="200" y="540" fill="#fff" style="font-size:30px">点击爆竹放飞梦想</text>` ([Yuezi](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html)); full typographic `<text>` system in [seed-svg-text-layout](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-svg-text-layout.html). This is the **recommended substitute for foreignObject** ("替代方案：纯 SVG `<text>`" — [rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)). |
| `fill="rgba(r,g,b,a)"` on text (opacity via fill) | **SURVIVES** | `fill="rgba(255,255,255,0.4)"` used for subtitles ([seed text](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-svg-text-layout.html)). |
| `<tspan>` | **CONDITIONAL** | Not in collected templates (they emit one `<text>` per visual line). Renderer supports it; very likely survives but unverified in these sources. Multi-line is done as multiple `<text>` elements, not `<tspan>` wrapping. |
| Font choice | **GOTCHA** | Recommended stack `font-family="-apple-system, PingFang SC, sans-serif"` (CJK), `Georgia, serif` (latin display), `SF Mono, Menlo, monospace` ([color-system](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/references/color-system.md)). No web-font embedding — only device fonts; Android vs iOS glyph metrics differ, so don't pixel-pack `<text>`. |

### Paint attributes

| Feature | Verdict | Evidence |
|---|---|---|
| `fill` (hex / rgba / named) | **SURVIVES** | Ubiquitous across all sources. |
| `stroke` / `stroke-width` | **SURVIVES** | `stroke="rgba(102,126,234,0.3)" stroke-width="1"` ([seed text](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-svg-text-layout.html)). |
| `opacity` (presentation attr) | **SURVIVES** | `opacity="0"`, `opacity="0.06"` widely used ([anim snippets](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md), [seed text](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-svg-text-layout.html)). |
| `transform` (attr + inline-style form) | **SURVIVES** | Both `transform="translate(-16.4 0)"` (attr) and `style="transform: translate(140px,580px)"` (CSS) coexist in [Yuezi demo](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html). |
| `fill="transparent"` for invisible hot-zones | **SURVIVES** | `<rect ... fill="transparent" opacity="0">` as a full-page click target ([anim snippets](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md)). |

### Gradients / advanced paint (CONDITIONAL — verify before use)

| Feature | Verdict | Evidence / reasoning |
|---|---|---|
| `<defs>` | **CONDITIONAL** | **Absent from all three battle-tested codebases.** Apple-grade templates achieve "gradient" looks with a **CSS gradient `background-image` on a `<section>`** (`background: #000 → #1a1a2e` is described as a CSS gradient, not an SVG one — [color-system](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/references/color-system.md)), or with semi-transparent overlapping shapes/glows (`<circle … opacity="0.06"/>`). The fact that experts who reverse-engineered Apple **never used `<defs>`/SVG gradients** is a strong "avoid / test first" signal. |
| `<linearGradient>` / `<radialGradient>` / `<stop>` | **CONDITIONAL / risky** | Same as above — never present. SVG gradients depend on `id` references inside `<defs>`; WeChat's sanitizer is known to rewrite/strip `id` and `class` attributes (see DIES table), which would **break `fill="url(#grad)"` references**. Treat as unreliable until verified on a live draft. Prefer CSS `background:linear-gradient(...)` on a wrapping `<section>`/SVG inline `style`. |
| `fill="url(#id)"` reference paint | **CONDITIONAL / risky** | Survival is coupled to `id` survival, which is doubtful (see `<use>`/`id` row). |

### Filters / masking / clipping (CONDITIONAL — verify, lean DIES)

| Feature | Verdict | Evidence / reasoning |
|---|---|---|
| `<clipPath>` | **CONDITIONAL** | Not in any collected source. Depends on `id` reference (`clip-path="url(#id)"`). Same `id`-stripping risk. Untested → assume unreliable. |
| `<mask>` | **CONDITIONAL** | Same as `<clipPath>` — `id`-referenced, never seen, treat as unreliable. |
| `<filter>` / `<feGaussianBlur>` / `feColorMatrix` etc. | **CONDITIONAL, lean DIES** | Never present in any battle-tested source; `id`-referenced; heavy. "Blur/glow" looks are instead done with large low-opacity shapes (`<circle … opacity="0.06">` = "装饰光晕" / decorative glow — [seed text](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-svg-text-layout.html)). Strongly recommend NOT relying on SVG filters. |

### Dynamic / disallowed surface

| Feature | Verdict | Evidence |
|---|---|---|
| `<script>` / any JS | **DIES** | "微信完全禁止 JS"; iron rule "禁止 JavaScript" ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [SKILL §铁律 #4](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md)). |
| `<style>` block (in-document CSS) | **DIES** | "`<style>` 标签 → 微信吞掉（inline style 保留）" ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)); SKILL stack: "微信禁止 `<style>` 标签". **Confirmed.** |
| CSS classes + CSS selectors | **DIES (in practice)** | Because `<style>` is stripped, any `class`-based styling has no effect; experts mandate **all styling inline** ("所有样式必须 inline" — [SKILL §铁律 #1](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md)). WeChat is widely reported to strip/rename `class` and `id` on save. **Confirmed in effect:** classes are useless even if not deleted. |
| `foreignObject` | **DIES** | "微信会过滤 `foreignObject` 内部的 HTML 内容；事件绑定无法生效" ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)); SKILL stack "❌ `foreignObject`（内部HTML被过滤）". MDN baseline: `<foreignObject>` is the only way to embed HTML in SVG ([MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject)) — WeChat neutralizes exactly that. **Confirmed.** |
| CSS animation (`@keyframes`, `transition`, `animation:`) | **DIES** | Requires `<style>` (stripped). Iron rule "禁止 CSS animation → 用 SVG `<animate>`" ([QA checklist 常见错误对照](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/qa-checklist.md)). Inline `transition` on style is also unreliable. |
| External `<image href="...">` (SVG `<image>` element) | **CONDITIONAL → avoid** | Never used; the universal pattern is **`background-image:url(...)` in inline `style`** on the `<svg>`/`<section>`, not `<image>` ([anatomy](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md), [ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)). Plain `<img>` HTML tag IS allowed (see opensvg ImgBlock) but must be on WeChat's CDN. |
| `<use>` / `<symbol>` / cross-references by `id` | **CONDITIONAL, lean DIES** | Never used in any source. WeChat is widely documented to **strip or rewrite `id` attributes** on save, which breaks `xlink:href="#id"`. Treat reference-based reuse as broken; **inline the markup instead** (every template repeats full markup rather than `<use>` — e.g., Yuezi repeats the firecracker `<path>` set 3×). |
| `<video>` / `<audio>` / `<iframe>` (inside SVG/article) | **DIES** | "`<video>`/`<audio>` 被过滤", "`<iframe>` 被过滤" ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)). (WeChat has its *own* approved video/audio insert UI separately.) |
| External CSS / JS `<link>`/`<script src>` | **DIES** | "外部 CSS/JS 引用 不支持" ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)). |

### SMIL animation (the ONLY motion that survives)

| Feature | Verdict | Evidence |
|---|---|---|
| `<animate>` | **SURVIVES** | "完全支持". Used everywhere (opacity, width). ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [Yuezi](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html), [ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)) |
| `<animateTransform>` (translate/scale) | **SURVIVES** | `type="translate"` slide-up and `type="scale"` pulse ([Yuezi](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html), [anim snippets](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md)). |
| `<set>` (visibility/opacity toggle) | **SURVIVES** | "完全支持（visibility 切换利器）"; used to hide after click ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [anim snippets](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md)). |
| `begin="click"` (tap triggers on mobile) | **SURVIVES** | "移动端触摸自动触发 click" — most reliable trigger ([rules begin table](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)). |
| `begin="0s"` / `begin="1.5s"` (autoplay/delay) | **SURVIVES** | Delayed/auto fade-in ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [anim snippets](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md)). |
| `begin="id.end+0.5s"` (chained sync) | **SURVIVES** | Chained animation A→B ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [anim snippets §链式动画](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md)). **Caveat:** this relies on the animate element's `id` surviving — chained SMIL works in practice, but is `id`-coupled. |
| `fill="freeze"`, `restart="never"`, `repeatCount` | **SURVIVES** | Required for click animations to "stick" and not re-trigger ([SKILL §铁律 #8/#9](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md)). |
| `calcMode="spline"` + `keySplines` (easing) | **SURVIVES** | Easing curves incl. "Apple 风格 `0.5 0 1 1`" ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [anim snippets easing table](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/svg-animation-snippets.md)). |
| `keyTimes` + `calcMode="discrete"` | **SURVIVES** | opensvg's click-switch uses `keyTimes="0;0.0000000000001;1" calcMode="discrete"` to make a step toggle ([ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)). |
| `begin="touchstart"` / `touchend` | **DIES** | "SVG SMIL 规范不包含；移动端不实用" ([rules begin table](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)). Use `click`. |
| `begin="mouseover/mouseout"`, `focusin/focusout`, `accessKey()` | **DIES on mobile** | "移动端不实用 / 有限支持 / 移动端无键盘" ([rules begin table](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)). |

### CSS layout primitives that DO survive (in inline style)

| Feature | Verdict | Evidence |
|---|---|---|
| `background-image:url(...)` in inline style (incl. on `<svg>`) | **SURVIVES** | The canonical image-delivery mechanism. ([anatomy](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md), [ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)) |
| CSS `scroll-snap-type:x mandatory` + `scroll-snap-align` | **SURVIVES** | The JS-free horizontal carousel. opensvg ScrollBlock: `scroll-snap-type:x mandatory; display:flex; overflow-x:auto; min-width:100%; scroll-snap-align:center` ([ScrollBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ScrollBlock/Preview.vue)); also [anatomy §模式C](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md). |
| `overflow-x:scroll` / `-webkit-overflow-scrolling:touch` | **SURVIVES** | Horizontal scroll containers ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [ScrollBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ScrollBlock/Preview.vue)). |
| `pointer-events:visible` / `visiblePainted` / `none` | **SURVIVES** | Transparent hot-zone control ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue), [ImgBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ImgBlock/Preview.vue)). |
| Inline `style="..."` with any CSS property | **SURVIVES** | "inline style（所有 CSS 属性）全部保留" ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)). |
| CSS variables (`var(--x)`) in inline style | **DIES** | QA checklist requires "inline style 中无 CSS 变量" ([qa-checklist §微信兼容性](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/qa-checklist.md)). |
| `calc()` in inline style | **DIES / unreliable** | QA checklist requires "inline style 中无 calc()" ([qa-checklist](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/qa-checklist.md)). |
| `flexbox` (`display:flex`) | **GOTCHA** | Lewis iron-rule says avoid flex in the *article body wrappers* ("禁止 flexbox — 用 `display:inline-block`", [SKILL §铁律 #3](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md)) — yet opensvg's ScrollBlock DOES use `display:flex` for the carousel rail ([ScrollBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ScrollBlock/Preview.vue)). Reconciliation: WeChat's editor sometimes **normalizes/strips `display:flex` on top-level pasted `<section>`s**, so flex is risky as a primary article layout but works inside a self-contained scroll rail. Verify per use. |
| `<div>` | **GOTCHA → avoid** | WeChat editor rewrites/strips `<div>`; convention is **use `<section>`** ("禁止 `<div>` — 用 `<section>`", [SKILL §铁律 #2](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md)). SVG can still live inside `<section>`. |

---

## 2. The WeChat content width model

- **Design canvas convention: 1080px-wide artboards / "750-style" retina thinking.** All Apple-grade templates author at a **1080-px-wide viewBox** (`viewbox="0 0 1080 ..."`) — see the viewBox cheat-sheet (cover 1080×1620, content 1080×1912, click-zoom 1080×516, etc.) in [anatomy §viewBox 比例速查](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md). The Yuezi demo authors at `viewBox="0 0 640 800"` ([Yuezi](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/index.html)). The exact internal-unit number doesn't matter — **only the aspect ratio matters**, because:
- **Responsive scaling = `width:100%` on the `<svg>` + a `viewBox`.** The SVG scales to fill the article body width while the `viewBox` preserves the aspect ratio and supplies intrinsic height. Yuezi README: "由于 SVG 做了 width 自适应…加入微信公众号的 SVG 仅需把全部 `<svg>` 代码嵌入" ([Yuezi README](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/README.md)). opensvg sets `width="100%"` on the SVG and drives height from the viewBox ([ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)).
- **Practical body width.** The WeChat article body is a fixed-width column (commonly cited as ~**677px** in the editor preview and on most phones the content area is the device width minus padding). Author-side you ignore the absolute px and rely on `width:100%`; **do not set a fixed pixel `width`/`height` on the outer `<svg>`** or it will not scale to the reader's screen.
- **Does inline `width`/`height` vs `viewBox` matter? YES — this is the single most important geometry rule:**
  - **Set `width:100%` (and let height be implied by viewBox).** Setting a fixed `width="1080"` would overflow / not be responsive.
  - **Percentage units as the SVG's own intrinsic size are NOT honored** — the rules note "百分比单位做宽度/高度（在推文中）无效" ([rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md)) and SKILL iron-rule #6 "禁止百分比宽度/高度 — 用 SVG viewBox". **Reconciliation of the apparent contradiction:** `width:100%` for *scaling to the container* works fine (it's everywhere in the templates); what does NOT work is trying to set an element's intrinsic **height as a percentage** or relying on percentage to establish the box. The reliable height mechanism is the **`height:0` parent + viewBox** trick (below). Treat the rule as "don't use % to *define* the SVG's own box; only use `width:100%` to fill the parent."
- **The "auto-height" trick (critical):** To make an SVG occupy correct height without JS, wrap it: `<section style="display:block;height:0;"> <svg style="display:block;..." viewbox="0 0 1080 1912"></svg></section>` — the `height:0` parent + viewBox lets the SVG naturally expand to the aspect-ratio height ([anatomy §模式A](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md)). opensvg uses `<section style="height:0px;overflow:visible">` around the SVG for the same reason ([ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)).
- **Click-zoom geometry:** to zoom an image past the column width, animate `width` from `100%` to e.g. `450%` and add `max-width:none !important;` on the SVG (WeChat otherwise caps images at column width) ([anatomy §模式B](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md), [seed-apple-style](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-apple-style.html)).

---

## 3. How 秀米 (xiumi) / 135editor / "黑科技编辑器" actually deliver "SVG互动/高级排版"

**It is NOT free-form inline `<svg>` from the user.** The dominant production pattern (confirmed by opensvg's architecture, which is an open clone of exactly these tools) is:

- **Module = a `<section>` (never `<div>`) carrying everything in INLINE styles**, with `<svg>` (or `<img>`) inside it. opensvg's blocks are literally `<section style="...inline...">` wrappers containing `<svg width="100%" viewBox=...>` ([ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue), [ScrollBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ScrollBlock/Preview.vue)). Lewis's anatomy describes the identical `<section>`-wrapped-SVG pattern as the Apple article skeleton ([anatomy](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md)).
- **Images are delivered as SVG/section `background-image` (or as WeChat-CDN `<img>`), never as external SVG `<image href>`.** opensvg's ImgBlock emits a plain `<img referrerpolicy="no-referrer" style="width:100%;height:auto;pointer-events:visible">` ([ImgBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ImgBlock/Preview.vue)); its interactive blocks use `background-image:url(...)` on the SVG ([ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)).
- **"互动" (interaction) = SMIL `<animate>`/`<set>`/`<animateTransform>` with `begin="click"`, NOT JavaScript.** The recognized interactive module families (mirrored by opensvg's block list, which clones the commercial editors) are:
  - **点击切换 ClickSwitch** (A→B image swap via opacity `<animate begin="click">`) ([ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue))
  - **横向滑动 Scroll** (CSS scroll-snap carousel) ([ScrollBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ScrollBlock/Preview.vue))
  - **点击伸长 Stretch / 零高容器 ZeroHeight** (fold/expand via `height:0` + slide `animateTransform`)
  - **淡入 Fade, 连续点击 GIF ClickGif, 自定义 HTML Custom** ([opensvg README §组件系统](https://raw.githubusercontent.com/cailven/opensvg/main/README.md))
- **Known tricks** (all corroborated):
  1. **SVG as a background-image canvas** — the SVG element itself is often empty geometry whose only job is to hold a `background-image` and animate its own `width`/`opacity`/`transform` ([ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)).
  2. **零高容器 (`height:0`) + viewBox** to control layout height and build fold/expand effects ([anatomy](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md), [ClickSwitchBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ClickSwitchBlock/Preview.vue)).
  3. **Sequence-frame "GIF"** — multiple frames toggled by SMIL `<set>`/`<animate>` (opensvg's ClickGif; also a community upload tool `imokya/wis-uploader` "微信公众号 svg 序列帧批量上传工具", [repo](https://github.com/imokya/wis-uploader)).
  4. **Hidden full-text block** at the top for accessibility/SEO indexing (`height:0;padding-left:1000px;pointer-events:none` + `<span leaf="">…</span>`), and the mandatory **`<p style="display:none;"><mp-style-type data-value="10000"></mp-style-type></p>`** trailer that WeChat's editor expects ([anatomy](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/apple-article-anatomy.md), [seed-apple-style](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-apple-style.html)).
- Other community evidence of the same pattern: `buduan/Wechat-Blacktech-SVG` ("微信公众号图文黑科技SVG交互排版样式代码", [repo](https://github.com/buduan/Wechat-Blacktech-SVG)), `ixqbar/wxsvg` ("推文svg互动相关知识点、案例整理", [repo](https://github.com/ixqbar/wxsvg)), `cxuhwiuefhuefu/wxSVG` ([repo](https://github.com/cxuhwiuefhuefu/wxSVG)).

**Takeaway:** 秀米/135 do NOT give users a raw SVG editor; they give pre-built parametric modules that compile to `<section>`+inline-style+`<svg background-image>`+SMIL. For our feature, **emitting that exact shape is the safe path.**

---

## 4. Gotchas

- **Sanitize on paste AND on publish.** WeChat's editor sanitizes pasted HTML when you drop it in (the in-editor "paste from clipboard / 秀米同步" path) and again on save/publish. Practical implication: things that *look* fine in the editor preview can still be altered on publish, and **`id`/`class` attributes are commonly stripped or renamed**, which is why all production tools avoid `id`-referenced features (`<use>`, gradients, clip/mask, filters) and inline everything. (Synthesized from the universal "all inline, no class, no id-refs" discipline across [rules](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/wechat-svg-rules.md), [SKILL](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/SKILL.md), and opensvg block markup.)
- **Mobile vs desktop divergence.** The desktop/PC web reader and the editor preview do NOT trigger SMIL `begin="click"` the way mobile touch does; Yuezi explicitly tells PC viewers to switch to mobile emulation / shrink the window to see the width-adaptive SVG ([Yuezi README](https://raw.githubusercontent.com/Yuezi32/weixin_svg_demo/master/README.md)). **Always verify on a real phone in the WeChat app**, not the desktop backend preview. The authoritative render target is the in-app WebView (WKWebView/X5).
- **Dark mode.** WeChat's reader dark mode can **auto-invert text/background colors**, but it does NOT understand your SVG `fill`s — so an SVG authored with a light background + dark `<text>` may end up dark text on a WeChat-darkened page, or your hard-coded dark SVG background stays dark while the page chrome flips. The mitigation pattern in the wild is to **bake an explicit background `<rect width=full height=full fill="#0a0a0a"/>`** (seed text template does exactly this — [seed-svg-text-layout](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-svg-text-layout.html)) so the SVG carries its own opaque background and is immune to page-level inversion. Provide explicit `color`/`fill` on every text node (SKILL iron-rule #11 "每个 `<p>` 必须显式写 color").
- **Size limits.** QA checklist enforces **single image < 500KB, total page images < 5MB** ([qa-checklist §微信兼容性](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/qa-checklist.md)). Inline SVG markup also bloats article HTML; very large `<path>` datasets increase paste-fail risk. (WeChat article total HTML has practical size ceilings; keep SVG concise.)
- **Image hosting.** `background-image`/`<img>` URLs should resolve to **WeChat's own CDN (`mmbiz` domain)** after upload; arbitrary external image URLs may be blocked or proxied. Use `referrerpolicy="no-referrer"` on `<img>` ([ImgBlock](https://raw.githubusercontent.com/cailven/opensvg/main/src/components/blocks/ImgBlock/Preview.vue), [qa-checklist](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/qa-checklist.md)).
- **`viewBox` case.** The WeChat editor frequently rewrites `viewBox` → `viewbox` (lowercase). Both render in the WebView; don't be alarmed if your casing changes on save. (Lewis QA even lists "`viewbox`(小写) vs `viewBox`(规范写法)" as a known normalization — [qa-checklist](https://github.com/S-N-Lewis/wechat-apple-layout/blob/main/references/qa-checklist.md).)
- **`-webkit-user-select:none` on the outer wrapper** prevents accidental text selection breaking the interaction; seen on the Apple seed root section ([seed-apple-style](https://raw.githubusercontent.com/S-N-Lewis/wechat-apple-layout/main/templates/seed-apple-style.html)).

---

## 5. Recommended SAFE SVG subset for WeChat (actionable)

**Emit only this, inline-everything, no external/id-referenced anything:**

### Elements — safe to author
`<svg>` (with `viewBox`, `width="100%"`, optional inline `style`), `<g>`, `<path>`, `<rect>` (incl. `rx`/`ry`), `<circle>`, `<text>` (one `<text>` per visual line), `<set>`, `<animate>`, `<animateTransform>`. Use `<rect height="1">` for divider lines. Use big low-opacity `<circle>` for "glow" instead of filters.

### Attributes / styling — safe
`fill` (hex / **rgba for opacity**), `stroke`, `stroke-width`, `opacity`, `transform` (attr or inline-style), `font-size`/`font-weight`/`font-family` (device fonts only), `pointer-events:visible|visiblePainted|none`. All visual styling either as **presentation attributes** or **inline `style=""`** — never classes, never `<style>`.

### Layout — safe
- Outer responsive image SVG: `<section style="display:block;height:0;"><svg style="display:block;background-image:url(...);background-size:cover;" viewBox="0 0 W H"></svg></section>`
- Carousel: `<section style="overflow-x:scroll;scroll-snap-type:x mandatory;display:flex">` + child `<section style="min-width:100%;scroll-snap-align:center;flex:none">`.
- Wrap modules in `<section>`, never `<div>`. Avoid `display:flex` at the top article level (OK inside a self-contained scroll rail).

### Motion — safe
SMIL only: `begin="click"` (mobile tap), `begin="0s|Ns"` (autoplay), `begin="id.end+Ns"` (chain — accept `id` risk and test), always `fill="freeze"` + `restart="never"` on click animations, `calcMode="spline"` + `keySplines` for easing.

### Required scaffolding
- Hidden full-text `<p>` at the very top (accessibility/SEO).
- Trailer `<p style="display:none;"><mp-style-type data-value="10000"></mp-style-type></p>` at the very end.
- Self-contained opaque background `<rect>` inside dark-themed SVGs (dark-mode immunity).
- `max-width:none !important` on any SVG meant to exceed column width (click-zoom).

### DO NOT emit (will die or is unreliable)
`<script>`, `<style>`, `class`, CSS `@keyframes`/`transition`, `foreignObject`, `<use>`/`<symbol>`, `<image href>` (use `background-image` instead), `<video>`/`<audio>`/`<iframe>`, CSS `var()`/`calc()` in inline style, `<div>`, `touchstart/touchend/mouseover` SMIL triggers, fixed-px outer `width`/`height`. **Avoid until live-tested:** `<defs>`, `<linearGradient>`/`<radialGradient>`, `<clipPath>`, `<mask>`, `<filter>`/`<feGaussianBlur>`, `fill="url(#id)"` — none appear in any Apple-grade or production WeChat-SVG codebase, and all depend on `id` survival. For gradients, prefer CSS `background:linear-gradient(...)` on a wrapping element or layered semi-transparent shapes.

---

## Caveats / Not Found

- **No official Tencent whitelist exists publicly.** All verdicts are reconstructed from reverse-engineering + production tools; WeChat changes its sanitizer silently over time, so **the safe subset must be re-validated on a live draft periodically** (especially the CONDITIONAL rows: gradients, clip/mask, filters, `<use>`, `<polygon>`, `<line>`, `<tspan>`).
- **Search-engine access was blocked** in this environment (Bing/Baidu/DuckDuckGo returned anti-bot/JS-only pages; jina.ai reader timed out). Evidence was therefore gathered via **direct fetches of GitHub repos/raw files and MDN**, which are higher-quality primary/secondary sources than blog snippets anyway, but I could not directly cite 秀米/135editor/mdnice official help pages or zhihu/掘金 articles by URL. The 秀米/135 mechanism is inferred from `cailven/opensvg`, an explicit open-source clone of those editors, plus the Apple reverse-engineering repo.
- **The two strongest sources mildly disagree** on `<img>` and `display:flex`: Lewis's iron rules forbid `<img>` and flex (a *stylistic/safety* preference), while opensvg (a shipping editor) uses both in constrained ways. I flagged these as GOTCHA rather than DIES — both are usable with care; the conservative path is Lewis's.
- The exact numeric **677px body width** is a widely-repeated community figure I could not pin to a primary Tencent doc in this session; the *mechanism* (`width:100%` + viewBox, no fixed px) is firmly evidenced and is what matters for implementation.
