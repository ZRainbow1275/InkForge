# InkForge Export Pipeline — Architecture Map

> 调研落盘：本文件由 brainstorm 调研阶段的代码测绘 (Explore) 产出，全部行号引用基于 **活体应用树** `D:/Desktop/Inkforge/inkforge/`。根目录 `D:/Desktop/Inkforge/src/`（2103 行，2026-01-30 后未动）为遗留旧树，已忽略。

Active root: `inkforge/src/services/export/`

## 1. WeChat Export Pipeline (end-to-end)

入口：`convertToWechatWithStats()` — `wechat.ts:1158-1367`。
`markdownToWechat()` / `markdownToWechatWithStats()` (1392 / 1411) 先调 `renderMarkdownWithLazyOptionalEnhancements(markdown)`（来自 `@/services/rendering/lazy-optional-renderer`, line 11）产出原始 HTML，再委派。

`convertToWechatWithStats` 内部顺序：

| # | Step | File:Line | Function |
|---|------|-----------|----------|
| 0 | Option 解构与默认值 (`maxContentWidth=677`, `enableCjkSpacing=true`…) | wechat.ts:1163-1181 | inline |
| 0a | `applyWechatStyleOptions(preset, options)` — 把 Inspector 覆写 (primaryColor/fontFamily/fontSize) 叠加到 preset | wechat.ts:1087-1135, 调用于 1183 | local |
| 0b | Stats：`calculateStats(html, readingSpeed)`（或 `statsOverride`） | wechat.ts:1186-1187 | `./utils` |
| 1 | `convertTaskListCheckboxes(html, primaryColor)` — 在 DOMPurify 前，因 `<input>` 后续被剥 | wechat.ts:1190 | `./utils` |
| 1.5 | `degradeWechatLatexHtml(...)` — sanitize 前剥 KaTeX MathML | wechat.ts:1192, body 289-316 | local |
| 1.6 | `degradeWechatMermaidHtml(...)` — 把 `.mermaid-rendered`/`.mermaid-fallback` 换成文本占位 `<section>` | wechat.ts:1193, body 371-396 | local |
| 2 | **DOMPurify XSS** — `purify.sanitize(...)` 带白名单 | wechat.ts:1198-1266 | inline config |
| 2.5 | `cleanEmptyParagraphs` + `limitConsecutiveBreaks` | wechat.ts:1269 | `./utils` |
| 3 | `highlightCodeBlocks(...)` — highlight.js | wechat.ts:1272-1274 | `./utils` |
| 3.5 | `renderAlertBlocks(html)` — `> [!NOTE]` → 样式化 `<section>` | wechat.ts:1277-1279 | `./utils` |
| 4 | `convertLinksToFootnotes(html)` — 外链 → 编号脚注 | wechat.ts:1282-1284 | `./utils` |
| 5 | 包裹内容：`buildReadingTimeHeader(stats)` + content + `buildFootnoteSection(footnotes)` | wechat.ts:1287-1299 | `./utils` |
| 6 | Wrap：`<section id="nice">${finalContent}</section>` | wechat.ts:1302 | inline |
| 7 | CSS：`prepareWechatPreviewCssForJuice( generateThemeCSS(preset,'preview') + codeThemeCSS, preset.id )` | wechat.ts:1308-1311 | local + `./themes` |
| 7a | 可选 `enableTextIndent` 叠加 | wechat.ts:1314-1318 | inline |
| 8 | **juice** CSS 内联 — `juice(styledHtml,{removeStyleTags:true,preserveImportant:true,inlinePseudoElements:true})` | wechat.ts:1324-1328 | `juice` (line 9) |
| 9 | `applyHeadingDecorations(inlinedHtml, preset)` — 旧路径 (meme/elegant/tech；新 decorate 钩子在 1160 短路) | wechat.ts:1332, body 1154-1254 | `./themes` |
| 10 | **Decorate 钩子 (PR3/PR4)** — `preset.decorate(decoratedHtml, 'wechat')` | wechat.ts:1336-1338 | `./preset-decorations` |
| 11 | `enhanceTableStyles(html, primaryColor)` — 斑马行 + 主题 `<th>` | wechat.ts:1341-1343 | `./utils` |
| 12 | **`postProcessForWechat(html, primaryColor)`** — 长兼容性处理 | wechat.ts:1346, body 885-1061 | local |
| 13 | **`enforcePlatformCSS(html, 'wechat')`** — CSS 校验安全网 | wechat.ts:1349 | `./css-validator` |
| 14 | **`wechatComplianceTransform(html, complianceOpts)`** — CJK 间距 → 677 夹紧 → 暗黑元数据 | wechat.ts:1354-1361 | `./platform-rules/wechat` |
| 15 | 返回 `{ html, stats }` | wechat.ts:1363-1366 | — |

### `postProcessForWechat` 内部顺序 (wechat.ts:885-1061)

1. `replaceCssVariables(result, primaryColor)` — 889 (body 77-98)，用 `createCssVariableMap` (56-69) 替换 `var(--md-primary-color)` 等。
2. `stripForbiddenPairedTag`（`script/style/iframe/object/embed/form/button`）+ `stripForbiddenStartTags`（`input/object/embed/form/button`）— 892-898（helpers 735-790）。
3. `stripUnsafeAttributes(result)` — 898；移除 `on*` 事件 + `javascript:` URL（808-883）。
4. 首元素 `margin-top:0;` 夹紧 — 901-904。
5. `normalizeImageAttributes` — `<img>` 宽度夹到 640px，加 `max-width:100%;height:auto;`（907, body 398-505；`WECHAT_MAX_IMAGE_WIDTH=640` @207）。
6. `fixNestedLists` — 把 `<ul>/<ol>` 移出父 `<li>`（910, body 551-728）。
7. `fixMermaidSvg` — 给 `<tspan>` 内联样式保色（913, body 191-196）。
8. 第二次 `degradeWechatLatexHtml`（916）。
9. `margin:<n>px auto` 与裸 `margin:auto` 改写（919-920）。
10. **正则批量剥不支持的 CSS 属性**（928-966）：`background-clip:text`、`position:fixed|sticky`、`display:flex`、`flex/grid/gap`、`var(--…)`、`animation*`、`transition`、`@keyframes`、`backdrop-filter`、`filter`、`box-shadow:*inset*`、`text-shadow`、`clip-path`、`mask`、`-webkit-mask`。
11. 清理空/重复 style（970-973）。
12. **全局移除 `class` 属性** — `result.replace(/\sclass=…/gi,'')` @976。
13. SVG 兼容 hack：在 `<section id="nice">` 前后插零高 `<p>`（980-987）。
14. 表格宽度 + 单元格边框（990-1023）。
15. 缺省 `section#nice` 样式（1026-1029）。
16. blockquote 主题色样式（1033-1048）。
17. `figure`/`figcaption` 默认（1051-1058）。

### `wechatComplianceTransform` (platform-rules/wechat.ts:269-289)

三个幂等阶段：
1. `applyCjkLatinSpacing(result)`（138-156）— CJK 与 ASCII 字母/数字之间插 `U+202F`；`tokenize()`(61-119) 把 `<code>/<pre>/<style>/<script>` 视为不透明（`OPAQUE_TAGS` @54）。**注意：`<svg>` 不在 OPAQUE_TAGS** → SVG `<text>` 内混排 CJK/Latin 会被插窄空格。
2. `clampContentWidth(result, 677)`（168-194）— 把 `<section id="nice">` 内层包进 `<div data-wechat-clamp="1" style="max-width:677px;margin:0 auto;">`。哨兵保证幂等。
3. `injectDarkModeMetadata(result, opts)`（226-254）— 给 `DARKMODE_TARGETS`(@204: h1-6/blockquote/pre/code/table/th/td/strong/em/a) 加 `data-darkmode-*`。默认 `#FFFFFF|` / `#1F1F1F|`（26-27）。

---

## 2. Decoration / Injection System (`preset-decorations.ts`, 664 行)

### Recipe 形状 (`DecorationRecipe`, 21-30)

```ts
interface DecorationRecipe {
  id: string
  description: string
  previewCSS: string                 // 完整 CSS3 (::first-letter, counters, gradients, var(--ink-accent))
  exportCSS: string                  // juice-safe 子集 (无伪元素, 无 var())
  decorate?: (html: string, target: ExportTarget) => string  // 可选后处理
}
```

`ExportTarget = 'preview' | 'wechat' | 'xhs' | 'zhihu'`（`types/index.ts:63`）。decorate 函数对 `target === 'preview'` 一律 `return html`（预览由浏览器渲染完整 CSS3）。

**契约（文件头 1-17）**：previewCSS=完整 CSS3；exportCSS=juice-safe 子集；`decorate` 注入真实 `<span>/<div>` 让伪元素效果（首字下沉、CSS counter、大引号）在剥伪元素的平台存活；所有 decorate 必须**幂等**（class 哨兵，如 `if (html.includes('class="ink-dc"')) return html`，见 71/115/169/217…）。

### 9 个 recipe 注册表 (616-626)

| id | 注入? | 哨兵 class |
|----|-------|-----------|
| `cjk-drop-cap` (39-77) | 是 | `ink-dc` |
| `ornament-hr` (80-121) | 是 | `ink-ornament-hr` |
| `large-quote` (124-182) | 是 | `ink-quote-mark` |
| `cjk-decimal-h2` (185-235) | 是 | `ink-ch-num` |
| `h2-underline-fine` (238-257) | 否(纯CSS) | — |
| `pull-quote-bordered` (260-289) | 否 | — |
| `numbered-list-roman` (292-316) | 否 | — |
| `h3-vertical-accent` (319-338) | 否 | — |
| `h2-block-ribbon` (345-374) | 否 | — |

### Preset 专属 helper (387-610)

`decorateThesisH3Section`、`decorateThesisHrDots`、`decorateLegalDropCap`、`decorateLegalH2Roman`、`decorateLegalBlockquote`、`decorateReportH1Bar`、`decorateReportH2Badge`、`decorateReportOlNumbers`、`decorateCommentaryH1Bar`、`decorateCommentaryH2Bar`、`decorateCommentaryH3Line`、`decorateCommentaryHrDiamond`。各自 class 哨兵 + 跳过 preview。

### Composer (641-650)

`composeRecipes(ids, { target })` → `{ css, decorate }`；`chainDecorators(...fns)` (660-663) 串联。

### decorate() 在各管线的位置

| Platform | Call site | Position |
|----------|-----------|----------|
| WeChat | `wechat.ts:1336-1338` | juice + applyHeadingDecorations 之后；enhanceTableStyles → postProcessForWechat → enforcePlatformCSS → wechatComplianceTransform 之前 |
| XHS | `xiaohongshu.ts:631-633` | juice 之后，postProcessForXiaohongshu → enforcePlatformCSS('xiaohongshu') 之前 |
| Zhihu | `zhihu.ts:546-548` | juice 之后，postProcessForZhihu → enforcePlatformCSS('zhihu') 之前 |

**对 SVG 注入点的含义**：decorate 在 DOMPurify **之后**运行 → 此处注入的 SVG **不再经 DOMPurify 白名单过滤**（这正是 SVG 能存活的关键），但仍会被：(a) `postProcessForWechat` 批量剥多种 CSS 属性 + **全局移除 class**(976)；(b) `enforcePlatformCSS` 从 `style="…"` 移除 `transform/transition` 等；(c) `wechatComplianceTransform` 给非不透明文本插 U+202F。因此注入的 SVG 必须：只用内联 `style`（且避开被剥属性）或表现属性；不依赖 `class`（下游剥）；幂等哨兵用 `data-*` 或元素结构（不能用 class）。

---

## 3. Platform Capability Matrix (`platform-css.ts`)

`PlatformCSSSupport` (26-59)。

| Capability | wechat (81-98) | xiaohongshu (110-127) | zhihu (138-155) |
|---|---|---|---|
| flexbox | **false** | true | true |
| grid | **false** | **false** | true |
| position | static,relative | +absolute | +absolute |
| maxWidth | true | true | true |
| boxShadow | true | true | true |
| borderRadius | true | true | true |
| gradient (CSS) | true | true | true |
| transform | **false** | true | true |
| transition | **false** | **false** | true |
| opacity | true | true | true |
| filter | **false** | **false** | true |
| customProperties var() | **false** | **false** | **false** |
| mediaQuery | **false** | **false** | true |
| calc | **false** | true | true |
| clamp | **false** | **false** | true |

接口**无 `svg` 标志位**（今天矩阵里没有 SVG 条目）。

`enforcePlatformCSS` (css-validator.ts:444-457) 扫描每个内联 `style`，逐声明跑 `enforceDeclarations` (464-534) + `FALLBACK_RULES` (71-207)。关键：`transform` 不支持时移除 (146-150)；`display:flex`→`block` (74-79)；`box-shadow`→`border:1px solid #e0e0e0` (138-142)；`animation` 恒移除 (168-172)；`clip-path`/`mask` 恒移除 (183-188)；gradient 函数在 `!support.gradient` 时从 `background` 系移除 (493-499)。
> 注：此处 `gradient` 指 **CSS** linear-gradient（div 背景），与 SVG `<linearGradient>` defs 不同。后者依赖 `url(#id)` 引用，受微信剥 `id` 影响 → 见 §4。

---

## 4. SVG Handling TODAY

### a) SVG 来源
仅 **Mermaid**（编辑器内可选渲染）产出 `<div class="mermaid-rendered"><svg>…</svg></div>`（fixture: `platform-export-rendering.test.ts:224`）。`fixMermaidSvg`(wechat.ts:191-196) 给 `<tspan>` 内联保色。

### b) SVG 在哪被 sanitize / 剥离

**WeChat DOMPurify 白名单 (wechat.ts:1227-1259)**：
```
ALLOWED_TAGS: p,h1-6,strong,em,u,s,del,ins,a,img,br,hr,ul,ol,li,blockquote,pre,code,
              table,thead,tbody,tr,th,td,span,div,section,sup,sub,figure,figcaption
ALLOWED_ATTR: ['href','src','alt','title','class','style','id','target']
ALLOW_DATA_ATTR: false        // 剥所有 data-*
FORBID_ATTR: ['formaction','action','xlink:href','xmlns:xlink','ping','poster','background','dynsrc','lowsrc','onload','onerror']
FORBID_TAGS: ['script','style','iframe','object','embed','form','input','button']
```
→ `<svg>/<g>/<path>/<text>/<tspan>/<foreignObject>/<linearGradient>/<defs>/<marker>` **均不在 ALLOWED_TAGS，DOMPurify 第 2 步全剥**。Mermaid 专项：`degradeWechatMermaidHtml`(371-396) 在 DOMPurify 前把 Mermaid SVG 换成文本占位，故 Mermaid SVG 永不到 DOMPurify。

> **关键测试约束**：`platform-export-rendering.test.ts:222-235`（"degrades rendered Mermaid SVG…"）断言 `expect(result.html).not.toMatch(/<svg\b|<text\b|\sclass=/i)` —— **当前导出契约 = 微信最终 HTML 无 `<svg>`**。本特性落地时需调整该断言：允许「我们有意注入的 SVG 装饰」，同时仍禁止「游离 Mermaid SVG」（建议改为基于 `data-ink-svg` 哨兵区分）。

**Preview 管线 (`MarkdownPreview.vue:35-38`)** 用更宽松的 DOMPurify：
```
ADD_TAGS: [...,'svg','g','path','defs','marker','line','rect','circle','ellipse',
           'polygon','polyline','text','tspan']
ADD_ATTR: [...,'xmlns','viewBox','d','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry',
           'points','marker-end','stroke','fill','transform','text-anchor']
```
预览允许 svg+子元素，但 **`foreignObject` 与 `linearGradient`/`radialGradient`/`stop` 不在内** → 若设计用 SVG 渐变，预览也需扩白名单（但渐变在微信不可靠，建议规避）。

### c) decorate 后注入 SVG 的下游风险
- `enhanceTableStyles` 只动 table → 安全。
- `postProcessForWechat`(885-1061)：无规则删 `<svg>` 元素；但 (i) 从任意 `style` 剥 `transform/transition/filter/clip-path/mask` 等(928-966)；(ii) 全局删 `class`(976)；(iii) 删 `script/style/iframe/object/embed/form/button`，不针对 svg/path/g/text/tspan；(iv) `stripUnsafeAttributes` 删 `on*`/`javascript:`（含 SVG），良性。
- `enforcePlatformCSS('wechat')`：从 `style` 剥 `transform`（wechat transform=false）。**SVG 表现属性 `fill/stroke/d/transform="…"`(XML 属性) 不在 `style` 内 → 安全**；但 `style="transform:..."` 会被剥。
- `wechatComplianceTransform`：`applyCjkLatinSpacing` 对非不透明文本插 U+202F，`<svg>` **不在 OPAQUE_TAGS**(@54) → 若 SVG `<text>` 混排 CJK+Latin 会被插窄空格。`injectDarkModeMetadata` 仅匹配 DARKMODE_TARGETS，不动 svg。

净结论：今天微信路径经 DOMPurify 显式剥所有 SVG，并在此前降级 Mermaid，无任何"保留 SVG"路径。未来 SVG 注入须走 decorate 钩子（DOMPurify 之后、受信任），并审计上面 `transform`-style 剥除、`class` 删除、U+202F 注入三大隐患。`foreignObject`/`linearGradient` 在导出代码路径 0 命中。

---

## 5. Preset Data Model

### 核心类型 (`types/index.ts`)
- `PresetPersona = 'academic'|'business'|'lifestyle'|'creative'`（56）
- `ExportTarget = 'preview'|'wechat'|'xhs'|'zhihu'`（63）
- `FontSpec { cjk; latin }`（68-73）
- `ExportPreset`（75-107）：`{ id,name,icon,description,theme,fontFamily,fontSize,primaryColor,isUseIndent,isUseJustify,customCSS?,persona?,fonts?,previewCSS?,exportCSS?,decorate?,sampleContent? }`

### 导出局部类型 (`services/export/types.ts`)
- `XiaohongshuPreset`（193-219）：+`accentColor/secondaryBg?/listMarker?/dividerText?` + 双轨 schema
- `ZhihuPreset`（228-252）：+`accentColor/fontSize?/codeTheme?` + 双轨
- `WechatExportOptions extends ExportOptions`（309-320）：+`enableCjkSpacing?/maxContentWidth?(默认677,null禁用)/enableDarkMode?/darkModeText?/darkModeBg?`
- `ExportOptions`（105-134）：14 toggle
- `Platform = 'wechat'|'xiaohongshu'|'zhihu'`（184）

### 预设数量
- **WeChat (themes.ts:349-1061)** — `themePresets[]` **12 个**：thesis(352)/legal(408)/report(466)/commentary(527)/aigc(584)/code(647)/notes(715)/news(770)/meme(828)/life(888)/elegant(945)/tech(1001)。
- **Xiaohongshu (xiaohongshu.ts:258+)** — `xiaohongshuPresets[]` **5 个**：xhs-fresh(261)/xhs-simple(284)/xhs-warm(315)/xhs-tech(346)/xhs-nature(379)。
- **Zhihu (zhihu.ts:56-133)** — `ZHIHU_PRESETS[]` **3 个**：zhihu-academic(59)/zhihu-tech(83)/zhihu-insight(109)。

### Persona 配色 token
**无集中 `PERSONA_COLORS` 常量**。实际：(1) `PERSONA_FONTS: Record<PresetPersona,FontSpec>`（preset-fonts.ts:24-41，仅字体）；(2) 每个 preset 的 `primaryColor`（事实上的 persona accent）—— 12 微信值：thesis `#5a4a3c`/legal `#1a1a2e`/report `#004080`/commentary `#c0392b`/aigc `#2563eb`/code `#16a34a`/notes `#d2691e`/news `#0f172a`/meme `#ff006e`/life `#a0522d`/elegant `#4a3c5a`/tech `#6366f1`；(3) CSS 变量 `--ink-accent` 映射 `preset.primaryColor`（`createCssVariableMap` wechat.ts:58-69，默认 `#D32F2F`）；(4) XHS/Zhihu 的 `accentColor`。decorator 读 `preset.primaryColor`（XHS/Zhihu 另读 `accentColor`）；persona 名仅用于选字体 + `generatePersonaBaseCSS` 的 line-height（academic/business 1.75 vs lifestyle/creative 1.85）。

---

## 6. 20-22 字/行约束

### `preset-fonts.ts` 正文宽度锁
`generatePersonaBaseCSS(persona)`（196-233），关键块（201-215）：
```css
#nice {
  font-family: ${fonts.cjk}, ${fonts.latin};
  max-width: min(22em, calc(100vw - 32px));
  margin: 0 auto; padding: 0 4px;
  font-size: 17px;
  line-height: ${lineHeight};   /* 1.75 学术/商务，1.85 生活/创意 */
  ...
}
```
`22em × 17px = 374px` 正文宽度，匹配 375px iPhone 视口与"每行 18-22 字"。

### Workstation 真机预览框
`WorkstationView.vue`：`.preview-device-frame`（4342-4351，`width:375px` @4344，注释 4341"模拟 375px 移动视口，每行 18-22 字"）；移动断点 4353-4360 → 100%；`.device-frame` 第二选择器（4827-4839，`max-width:375px` @4829）。stage 基宽 `--workstation-stage-width` 默认 400px（4364）。导出侧 `maxContentWidth=677`（`DEFAULT_MAX_WIDTH` platform-rules/wechat.ts:25）。

---

## 7. Test Layout

### export/ 同目录
citation-export / platform-export-rendering（大集成,~35 it）/ preset-decorations / preset-fonts / themes-migration / wechat-publish / xhs / zhihu；`__tests__/frozen-prototype` + `__tests__/pipeline-cross-platform`（140/174/231/286/331 覆盖 WeChat/XHS/Zhihu/硬上限/跨路由）；`image-pipeline/image-pipeline`；`platform-rules/{wechat,xiaohongshu,zhihu}`；`preview-fidelity/{xiaohongshu,zhihu}-mock`；`renderers/ast`。

### preview-fidelity mocks（**非假数据，是预览保真层**，禁止删除）
`preview-fidelity/`：`wechat-mock.ts`（无同名测试）把渲染 HTML 包进 `<section id="wechat-article">` chrome，previewCSS 以 `<style>` 注入并把 `#nice → #wechat-article`，绕过 juice/DOMPurify/postProcess，仅供应用内预览；`xiaohongshu-mock.ts`+test（`renderXhsMockHtml` @133，5 预设色表 + 装饰表 64-108）；`zhihu-mock.ts`+test（`renderZhihuMockHtml` @128，scoped 到 `#zhihu-answer`，代码块语言徽章 + 主色着色 @187）。作用：预览看到接近平台真实渲染，而不付出有损导出管线代价；对应 `.test.ts` 锁结构不变量。

### E2E
`tests/e2e/`：`wdio.conf.cjs`（Tauri）；`probes/paint-h1.cjs`；`specs/visual.spec.cjs`（校验 live Tauri build 的设计 token 如 `--motion-base=180ms`，引用 `docs/inkforge-brand-identity.md §§13-16`）。

---

## 8. Icon Library

**`lucide-vue-next` 唯一图标库**（50 文件导入；`@heroicons/@iconify/fontawesome/...` 0 命中）。`src/utils/iconography.ts`：2-24 单点导入 20 个 Lucide 组件；28-52 `exportIconMap`（preset/platform key → 组件，如 `thesis→FileText`/`wechat→MessageSquare`/`xiaohongshu→BookOpen`/`zhihu→GraduationCap`）；54-76 `exportIconAliases`（旧 emoji → 规范 key）；78+ `resolveExportIcon(iconOrKey, fallback=FileText)`。

---

## 关键设计交叉引用（给 SVG 注入方案）

- 微信受限 DOMPurify 之后唯一安全注入缝 = `preset.decorate(html,'wechat')`（wechat.ts:1336-1338）。decorator 在 sanitize 后、postProcess 前运行。
- 下游必须规避：`postProcessForWechat` 删所有 `class`(976) + 剥 `transform/transition/filter/clip-path/mask/box-shadow:*inset*`(928-966)；零高 `<p>` 标记环绕 `section#nice`(980-987) 勿冲突；`enforcePlatformCSS` 再剥 `style` 内 `transform`；`wechatComplianceTransform` 给非不透明文本插 U+202F（**需把 `<svg>` 纳入 OPAQUE_TAGS 或保护 SVG `<text>`**）。
- 微信支持 `gradient(CSS):true/boxShadow:true/borderRadius:true/opacity:true`，但 `transform/transition/filter/customProperties/mediaQuery/calc/clamp:false`。SVG 内用 `<linearGradient>` defs（SVG 元素而非 CSS 函数）**理论不受 enforcePlatformCSS 影响，但受微信剥 `id` 影响 → 见 §4 / wechat-svg-capabilities.md**。
