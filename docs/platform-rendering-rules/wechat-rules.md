# 微信公众号渲染规则手册

> 基于 2025-2026 年全网调研整理，参考 doocs/md、wxmp、md2oa 等项目实践验证

> 2026-06 收口规则：本文件与 [market-practices-catalog.md](./market-practices-catalog.md) 共同构成 InkForge 微信导出合同。若旧段落与 `prompts/0601/` 真实微信粘贴证据或微信官方编辑器插件规范冲突，以本节和 `.trellis/spec/frontend/wechat-svg-modules.md` 为准。

## 零、最终输出合同

InkForge 的微信公众号产物必须是可粘贴的 `inline-style HTML`；只有在真实授权、插件或 API 路径验证后，才可标记为可同步。产物可选包含经过校验的 WeChat-safe inline SVG 与 inline HTML block。市场工具经验只转化为规则和元素族，不复制 135/秀米模板。

Executable choice source: `inkforge/src/services/export/style-catalog.ts` contains the runtime
style availability catalog for WeChat/XHS/Zhihu. UI controls and export reports should use that
catalog rather than hard-coding this document's tables.

Executable proof checklist source: the same catalog exposes `getEvidenceProofRequirements()` and
`getStyleChoiceProofRequirements()`. Availability and proof are intentionally separate: a style can
remain `blocked` even when its missing proof checklist is known. `pc-editor-paste` requires an exact
InkForge artifact, safe disposable draft/cleanup proof, a real PC paste or channel event, PC DOM
readback, and sensitive-artifact hygiene. `mobile-preview` requires phone-side readback/screenshot,
Dark Mode inspection, and cover-thumbnail inspection. `published` is cross-platform final preview or
publish inspection; it does not automatically satisfy WeChat phone preview.

### 0.1 产物类型

| 产物 | 默认用途 | 要求 |
|------|----------|------|
| Inline HTML | 正文、标题、引用、表格、代码、卡片、图框 | 所有视觉样式在 `style` 上，最终输出不得依赖 `<style>`、class selector、CSS var |
| WeChat-safe SVG | 封面图形、分隔符、印章、几何图标、少量 opt-in 互动 | 通过 `checkWechatSafe`，不用 id/class/defs/gradient/filter/use/url 引用 |
| HTML block | 旗舰标题、金句、数据卡、阅读条、文末落款 | 使用 `<section>`、`<p>`、`<span>` 和安全 inline style，文本可重排 |
| Raster fallback | 公式、复杂图表、复杂互动、XHS/Zhihu 降级 | 明确标记为图片/长图/海报，不伪装成富文本 |
| Publish checklist | 小程序卡片、视频号、投票、公众号名片、音频等后台组件 | 只能列入手动/官方后台步骤，无凭据不得标记成功 |

### 0.2 市场元素族映射

| InkForge rule group | 135/秀米实践映射 | 微信输出 |
|------|------------------|----------|
| `headline-system` | 标题、编号标题、图文标题、节日/行业模板标题 | HTML block 为主，SVG 只做图形装饰 |
| `body-system` | 正文、阅读条、一键排版、段落参数修正 | inline paragraph + reading bar + lede |
| `card-system` | 引用、提示、金句、数据卡、对比卡 | inline HTML card，图标用 inline SVG |
| `figure-system` | 图片边框、拼图、多图、长图 | 图片样式规范化，多图用 table/inline-block 或长图 |
| `guide-system` | 关注、分享、文末、二维码、预览分享 | 可输出落款/占位/清单，不伪造官方组件 |
| `interactive-system` | SVG 展开、切换、滑动、路径动画、触发区 | opt-in SVG，必须实测或降级 |
| `fallback-system` | 生成长图/PDF/视频、插件复制 | 图片/长图/发布清单/unavailable 状态 |

### 0.3 135/秀米实机规则转译

2026-06-08 登录态实机学习只沉淀为 InkForge 自有规则，不复制 135/秀米模板、会员素材、私有 SVG 代码或付费样式。

| 市场观察 | InkForge 微信规则 |
|----------|-------------------|
| 135：样式中心、模板中心、标题/正文/图文/引导/布局/节日/行业/小元素/SVG 分类 | 进入元素族 catalog；只作为 trigger、persona、quality detector 的 taxonomy |
| 135：点击展开/显示/切换/缩放/翻转/弹出/播放/抽签、滑动展示、图片轮播、长按显示、文字弹幕、区域触发、互动答题等 SVG taxonomy | 进入 `interactive-system` 候选；默认 `blocked`，只有通过 WeChat-safe SVG 校验和真实微信编辑器/移动端验证后才可标记可用 |
| 135 SVG 中心：多处效果标注“仅支持手机端触发” | 进入 `mobile-only-risk`；PC 后台粘贴和本地 e2e 只能证明结构/保留/桌面可视化，不能替代手机微信触发证据 |
| 135 当前编辑器：字号、行距、字距、首行缩进、段前/段后、两侧边距、文字/背景色、文字阴影/边框、竖排、全文黑白/深色模式开关、Word 图片上传、AI 润色/生成等工具栏参数 | 进入 toolbar-parameter taxonomy；InkForge 只能映射为现有 preset/settings/quality detector/checklist，不创建绕过 `convertToWechatWithStats` 的第二套排版器 |
| 秀米：导入 Word/Excel/Markdown、导入公众号文章、一键排版、插件复制、继续复制粘贴、同步公众号 | 进入 artifact state machine：`imported`、`local-rendered`、`copy-to-editor`、`copy-to-wechat`、`plugin-transfer`、`sync-draft`、`preview-share`/`platform-preview`、`scheduled-send`/`scheduled-publish`、`published`，各状态独立验收 |
| 秀米：动作/动作列表/提取动作、点击动作、图层、定位、背景图、组件定位、多选对齐、SVG 图集 | 映射为 `layout-and-layer-system`；微信正文必须保持 DOM 可读顺序，绝对/自由布局默认降级为图片/长图 |
| 秀米：Markdown 锚点映射、同步后预览、留言权限、背景图高度风险、复制到微信 | Markdown anchors 只映射语义元素；同步后预览和留言需要微信认证/账号权限；背景图、z-order、复制到微信都需要平台预览和布局报告 |
| 秀米：生成长图/PDF/视频、贴纸图文 | 作为 fallback artifact，不作为微信公众号正文富文本成功证明 |

### 0.3A Applied-Element Rules From CloakBrowser

2026-06-08 CloakBrowser applied-element rerun 更新了微信规则的证据门：只看 135/秀米左侧样式列表不够，必须点击真实样式/效果、确认中间编辑区/画布已经出现内容，再读取 DOM 和参数面板。该证据等级是 `applied-editor-element`，仍低于 `pc-editor-paste`、`mobile-preview`、`credentialed-sync` 和 `published`。

135 普通编辑器应用后规则：

- `section._135editor`、`data-tools="135编辑器"`、`data-id`、`135brush`、`135bg`、大量 inline styles 和少量 inline SVG/image motifs 只说明 135 的 authoring/output structure；InkForge 输出不得依赖这些 class/id/data metadata。
- `data-width="100%"`、`data-ratio`、`data-w` 是可学习的图片 manifest 思路。InkForge 应用为自有 image manifest、intrinsic ratio、caption、upload/localization checklist，而不是保留 135 CDN 或元数据。
- `line-height:1.75em`、`letter-spacing:1.5px`、`font-size:14px`、`text-align:justify` 是可学习的正文节奏。进入微信输出时必须经过现有段落参数、inline style 和 quality detector。
- `display:flex`、`justify-content`、fixed width/height、`transform`、vendor transform、`linear-gradient`、`!important`、class/id dependency 都是重写或阻断对象。安全替代是普通 flow block、table/table-cell、inline-block、solid background、WeChat-safe SVG motif 或 raster fallback。
- 135 的实机插入证明了一个编辑器风险：市场样式可能被插入到当前光标所在的另一个样式块内部，导致重叠和竖排挤压。InkForge 的 toolbar/marker insert 必须使用 block-boundary sentinel；如果 selection 在 `data-ink-block` / `data-ink-svg` 内部，应把新块插入到最近 block 之后，或要求先退出当前块。
- InkForge editor runtime now enforces this through `inkforge/src/extensions/BlockBoundaryInsertion.ts`.
  Slash commands and block snippets must insert block content through that helper so a callout,
  details block, market card, or future SVG/H5 marker becomes a top-level sibling instead of
  being silently nested inside the current paragraph/card. Inline text snippets keep inline
  behavior.

秀米图文编辑器应用后规则：

- `.tn-page`、`.tn-comp`、`.tn-cell`、`.tn-cell-group`、`.tn-comp-pin` 是秀米 authoring internals。微信正文不得保留这些 class、contenteditable cell、flex/free-layout dependency。
- 秀米 `SVG图集/图集滚动` 插入后可以没有 literal `<svg>`，而是多张图片、图层、动作和滚动状态。InkForge 应把这类样式归为 `interactive artifact family`：image-slot manifest、motion/action schema、mobile trigger gate、static/raster/long-image fallback。
- 标题样式应抽象为自有 inline HTML block：文本保持可编辑和可重排，背景色块/边框/几何 motif 用安全 inline style 或 source-owned SVG path；不要导入 `.tn-*` 组件树。
- `line-height:0`、fixed height、overflow hidden、background image、z-order 和自由定位必须进入 layout report；不能在微信正文中无报告输出。
- Runtime gate: `wechat-layout-report-required` blocks free positioning, z-order, background
  image layers, overflow crop, fixed geometry, manual offsets, negative overlap spacing, and
  invisible/custom hit areas unless the renderer has rewritten them into safe flow markup or a
  raster/long-image fallback with layout report proof. This gate is intentionally separate from
  `wechat-unsupported-css`.

135 SVG 编辑器应用后规则：

- 135 SVG builder 是 effect builder，不是 raw template source。`封面图`、`元素图`、`底层片` 等槽位应转为 InkForge image-slot manifest。
- `动画时长`、`放大时长`、`展开时长`、`元素缩小比例`、`元素图移动方向` 等参数应转为 motion parameter schema 和 direction enum。
- `展开内容背景`、`去缝隙`、`上移`、`下移`、`间距`、`复制`、`删除` 等操作说明互动效果需要 expanded-content model、block order/spacing model 和 fallback plan。
- 全文背景高度超过 4000px 的风险仍按移动端/Android layout gate 处理。
- 免费试用、购买提示、Vue/Ant DOM、私有 SVG 源码和素材要求只作为规则参考，不进入 InkForge 实现。

三平台 runtime 残留阻断：

- 2026-06-09 起，`inkforge/src/services/export/quality-detector.ts` 会把 135/秀米 authoring
  residue 作为导出前错误处理。微信 issue id 为 `wechat-market-editor-residue`。
- 阻断对象包括 `_135editor`、`135brush`、`135bg`、`data-tools="135编辑器"`、135 CDN 图片源、
  `.tn-page/.tn-comp/.tn-cell/.tn-cell-group/.tn-comp-pin`、`tn-*` authoring 属性、`ng-click` /
  `ng-style` / `ng-repeat` 等创作态属性和秀米素材源。
- 普通正文提到“135编辑器”“秀米”不会触发该错误；必须出现结构性 HTML、authoring metadata
  或第三方素材依赖才会阻断。
- 阻断后的安全路径是重写为 InkForge 自有 inline HTML、WeChat-safe SVG、image manifest、
  layout report 或 raster fallback；不得保留市场 class/id/data、第三方 CDN、私有 SVG 或会员素材。

交互 SVG 分级：

- `static-safe`：只含图形装饰、分隔符、印章、几何图标；可按默认 SVG 校验进入微信输出。
- `click-safe-candidate`：SMIL `begin="click"` 或时间序列，不依赖脚本、事件属性、class/id/外部 CSS；必须有 PC 编辑器和移动端触发证据。
- `mobile-only-risk`：只标注手机端触发、长按触发或依赖 `touchstart` 的效果；默认 `blocked`，必须提供静态 fallback，并用手机微信预览记录触发前后，不能用 PC 后台 DOM 或 Tauri/WebView2 截图替代。
- `script-or-dom-event`：依赖 `<script>`、`onclick`、`onload`、JS listener、外部 CSS、`<style>` 或 class selector 的效果；禁止进入微信正文输出。

状态证明规则：

- `copy-to-editor` 成功不等于 `copy-to-wechat` 成功。
- `authenticated-editor-reachable` 只证明真实微信 PC 编辑器可达。
- `pc-editor-dom-readable` 只证明真实微信 PC 编辑器标题/正文 DOM 可读。
- `plugin-transfer` 成功不等于平台渲染成功。
- `sync-draft` 成功不等于发布成功。
- `preview-share` / `platform-preview` 只证明预览入口当前可见，不证明发布、手机端触发或暗黑模式通过。
- `scheduled-send` / `scheduled-publish` 是凭据和分发状态，不等于当前已发布成功。
- `published` 必须由真实账号、授权、接口/后台返回、平台预览和必要的手机端检查共同证明。
- `pc-editor-paste` 只证明当前微信 PC 后台粘贴 sanitizer 和桌面编辑器保留/渲染路径；不得外推为手机最终渲染、SMIL/点击触发、暗黑模式、封面缩略图或发布成功。
- 如果 `text/html` 剪贴板中含富 HTML/SVG，但微信编辑器读回只有纯文本，该渠道必须记录为 `blocked`。`flagship-amber` 在 2026-06-08 的普通 `Control+V` 路径就是此状态。
- 2026-06-09 CloakBrowser `inkforge-0601` 只读复核证明微信编辑器可达且 `.ProseMirror` DOM 可读，但当前草稿正文已有真实音频卡，因此没有执行粘贴、保存、预览或发布。该证据不得升级任何 PC 粘贴、手机预览、同步或发布门禁。
- 同一只读复核还观察到当前真实草稿存在 `#js_add_appmsg` / `data-action="add"` 的“增加一条/新建内容”入口；该入口会改变多图文草稿结构，未在没有 disposable draft 和 cleanup proof 的情况下点击，不能作为安全粘贴测试入口。

### 0.4 禁止项

- 不使用 emoji 作为 InkForge UI 图标或系统装饰图标；用 `lucide-vue-next` 或 inline SVG path。
- 不输出事件处理器、脚本、`<style>`、外部 CSS、class/id 依赖。
- 不使用透明图片叠 SVG 隐藏真实图片，避免发布后图片不可编辑。
- 不用 fixed width/fixed height 撑版，不用 `line-height:0` 隐藏内容。
- 不把普通段落放进 `<pre>`。
- 不用 `position:absolute/fixed`、`flex/grid/gap`、animation/transition/filter。
- 不把无凭据同步/发布/上传标记为通过。

### 0.5 微信用户可选样式矩阵

| Choice id | 适用内容 | 输出形态 | 默认状态 | 必要证据 | 不通过时降级 |
| --- | --- | --- | --- | --- | --- |
| `wechat-classic-inline` | 原 12 微信预设 | inline-style HTML | enabled | `unit-tested` + focused export tests | 保留基础 inline HTML |
| `wechat-quiet-editorial` | 长文、评论、报告 | HTML block + 少量几何 SVG | enabled for flagship | `local-browser` | 移除 SVG，仅保留 HTML 色块 |
| `wechat-toolbar-parameter-map` | 字号、行距、字距、缩进、两侧边距 | inline-style HTML | available | `local-browser` | 回到基础段落参数 |
| `wechat-cover-seal-divider` | 封面、分隔、落款 | WeChat-safe static SVG | opt-in | `unit-tested` + `local-browser` | PNG/JPG 或普通分隔线 |
| `wechat-card-rich` | 金句、数据、对比、时间线 | inline HTML card | opt-in | `unit-tested` | 普通引用/列表/段落 |
| `wechat-flagship-kiln` | 创意旗舰长文 | WeChat-safe SVG + HTML block | available locally | `local-browser` | 图片 fallback 或普通 inline HTML |
| `wechat-flagship-tempera` | 学术/报告旗舰长文 | WeChat-safe SVG + HTML block | available locally | `local-browser` | 图片 fallback 或普通 inline HTML |
| `wechat-flagship-amber` | 商业结构稿、对比、时间线 | WeChat-safe SVG + HTML block | blocked | `pc-editor-paste` still missing | 普通剪贴板路径已在 2026-06-08 真实编辑器中降级为纯文本；需插件/HTML 替换/授权同步等明确渠道另证 |
| `wechat-click-reveal` | 点击展开、切换、序列帧 | SMIL candidate SVG | blocked by default | `pc-editor-paste` + `mobile-preview` | static-safe SVG 或长图 |
| `wechat-mobile-only-effect` | 长按、touch-only、区域触发 | mobile-only SVG candidate | blocked | `mobile-preview` before/after | 静态图 / 图片页 |
| `wechat-carousel-switch` | 图片轮播、点击切换、滑动触发 | mobile-only SVG candidate | blocked | `mobile-preview` before/after | 图片序列 / 长图 |
| `wechat-official-widget-checklist` | 小程序卡片、视频号、投票、音频 | publish checklist / official editor component | unavailable without credential | `credentialed-sync` 或 `published` | 手动发布清单 |
| `wechat-plugin-transfer-checklist` | 插件传输、复制到微信通道 | publish checklist | unavailable without channel proof | `credentialed-sync` | 手动发布清单 |
| `wechat-sync-draft-checklist` | 授权账号、草稿同步、图片传输 | publish checklist | unavailable without authorization | `credentialed-sync` | 手动发布清单 |
| `wechat-h5-design-boundary` | H5、设计图、增强媒体、PDF/视频 | publish checklist | unavailable for article body | `doc-only` | 独立 artifact family |

用户看到的“可用”必须对应当前证据等级。`blocked` 项可以显示为实验/清单项，但按钮不得导出为成功状态。

---

## 一、HTML 标签白名单

### 支持的标签

| 类别 | 标签 | 备注 |
|------|------|------|
| 段落/标题 | `<p>`, `<h1>`~`<h6>` | 结构化内容组织 |
| 文本修饰 | `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<br>`, `<del>`, `<sub>`, `<sup>` | 文字样式 |
| 列表 | `<ul>`, `<ol>`, `<li>` | 有序/无序列表 |
| 链接 | `<a>` | 外链触发安全提醒弹窗 |
| 图像 | `<img>` | 自动 max-width:100% |
| 布局 | `<section>`, `<div>`, `<span>` | 容器/行内容器 |
| 表格 | `<table>`, `<tr>`, `<td>`, `<th>`, `<thead>`, `<tbody>` | 完整表格支持 |
| 引用 | `<blockquote>` | 块引用 |
| 代码 | `<pre>`, `<code>` | 代码展示 |
| 水平线 | `<hr>` | 分隔线 |
| 媒体 | `<mpvoice>`, `<mpvideo>` | 微信专属媒体标签；只能由官方后台/真实授权路径验证 |
| SVG | `<svg>`, `<g>`, `<path>`, `<rect>`, `<circle>`, `<line>`, `<text>` | 仅限 WeChat-safe 子集，见 `.trellis/spec/frontend/wechat-svg-modules.md` |

### 不支持/被过滤的标签
- `<script>`, `<style>`, `<link>` — 安全限制
- `<iframe>`, `<embed>`, `<object>` — 嵌入限制
- `<form>`, `<input>`, `<button>`, `<select>` — 表单不支持
- `<audio>`, `<video>` — 需使用微信专属标签或后台组件
- `<canvas>` — 不作为正文输出
- SVG 中的 `<foreignObject>`, `<defs>`, `<linearGradient>`, `<clipPath>`, `<mask>`, `<filter>`, `<use>`, 外部 `<image href>` — 需降级或重写为安全子集

---

## 二、CSS 支持规则

### 核心规则
1. **仅支持内联 `style` 属性** — 不支持 `<style>` 标签和外部 CSS 文件
2. **不支持 `class` 属性** — 微信编辑器会过滤掉所有 class
3. **不支持 CSS 变量** — `var(--xxx)` 无效，必须替换为实际值
4. **不支持 `@media` 查询** — 内联样式中无法使用媒体查询
5. **不支持伪类/伪元素** — `:hover`, `::before` 等无效

### 支持的 CSS 属性

| 类别 | 属性 | 示例 |
|------|------|------|
| 字体 | `font-size`, `font-weight`, `font-style`, `font-family`, `color` | `font-size:16px; color:#333;` |
| 间距 | `margin`, `padding`, `line-height`, `letter-spacing` | `margin:16px 0; line-height:1.75;` |
| 对齐 | `text-align`, `vertical-align` | `text-align:center;` |
| 显示 | `display` (block/inline-block/table/table-cell) | `display:table-cell;` |
| 背景 | `background-color`, `background` | `background-color:#f7f7f7;` |
| 边框 | `border`, `border-radius`, `box-shadow` | `border-radius:4px;` |
| 装饰 | `text-decoration`, `opacity` | `text-decoration:underline;` |
| 尺寸 | 响应式/媒体归一化尺寸：`max-width`, `min-width`, `height:auto`, 图片归一化、SVG 内部几何 | `max-width:100%; height:auto;`；正文/卡片/标题等可读容器禁止 fixed width/fixed height 撑版 |
| 交互 | `pointer-events` | `pointer-events:none;` |
| 溢出 | `overflow`, `overflow-x`, `overflow-y` | `overflow:hidden;` |
| 定位 | 不推荐 | 使用结构顺序、margin、table-cell 替代 |
| 文字 | `white-space`, `word-break`, `word-wrap` | `word-break:break-all;` |
| SVG 变换 | `transform` XML 属性 | 仅用于 SVG presentation attribute，不写在 HTML style 内 |

### 不支持/有风险的 CSS
- `animation`, `transition` — 动画无效
- `@keyframes` — 不支持
- `position: fixed` — 无效
- `linear-gradient` — 部分设备不支持，建议回退纯色
- `filter` — 大部分不支持
- `backdrop-filter` — 不支持
- `clip-path` — 不支持
- `display:flex`, `display:grid`, `gap` — InkForge 后处理会移除，使用 `table` / `table-cell`
- `line-height:0`, fixed `width` / `height` — 会触发微信官方结构/可见性风险
- `text-align:start/end` — 终端表现不稳定
- `!important` — 破坏平台公共样式和 Dark Mode 修正
- `caret-color: transparent` 或等价透明光标 — 会破坏编辑器定位体验
- `opacity:0` 真实图片 + SVG/background 覆盖 — 发布后会导致公众号后台无法修改真实图片

### 官方编辑器 API 与结构验证

- 微信插件规范提供 `verify_article_structure` 风格的文章结构验证接口思路。InkForge 的最终 HTML
  质量门应把 width/height/line-height/opacity/pre/text-align/begin 等官方坏例视为平台阻断项，
  即使单个 SVG 片段通过 `checkWechatSafe`。
- `mp_editor_set_content`、`mp_editor_insert_html` 和剪贴板 `text/html` 都只是输入/插入通道；
  成功插入不等于移动端预览、Dark Mode、封面缩略图、同步或发布成功。
- `mp_editor_change_cover` 说明封面裁切是独立编辑器能力。封面图、2.35:1 / 1:1 裁切和手机预览入口
  必须单独留证，不能由正文粘贴通过推断。

---

## 三、关键渲染约束

### 1. CSS 内联化（强制）
```
原始: <p class="paragraph">文本</p> + .paragraph { color: #333; }
转换: <p style="color:#333;">文本</p>
工具: juice 库（npm install juice）
```

### 2. CSS 变量替换（强制）
```
原始: style="color: var(--md-primary-color)"
转换: style="color: #1a73e8"
方式: 正则替换 var(--xxx) → 实际值
```

### 3. 外链处理（强烈推荐）
- 非 `mp.weixin.qq.com` 域名链接会触发「即将离开微信」安全提醒
- 最佳实践：外链转文末脚注
```
原始: 请参考 [这篇文章](https://example.com)
转换: 请参考 这篇文章[1]
脚注: [1] https://example.com
```

### 4. 嵌套列表修复（强制）
微信对 `<li>` 内嵌套 `<ul>`/`<ol>` 的渲染异常
```html
<!-- 原始（有问题） -->
<ul>
  <li>项目一
    <ul>
      <li>子项</li>
    </ul>
  </li>
</ul>

<!-- 修复后（兄弟节点） -->
<ul>
  <li>项目一</li>
  <ul style="margin-left:20px;">
    <li>子项</li>
  </ul>
</ul>
```

### 5. 代码高亮处理
- highlight.js 生成的 `class` 会被过滤
- 必须将高亮颜色转为内联 `style`
```html
<!-- 错误：class 会被过滤 -->
<span class="hljs-keyword">const</span>

<!-- 正确：内联样式 -->
<span style="color:#c678dd;">const</span>
```

### 6. 图片处理
- 微信自动添加 `max-width:100%`
- `width`/`height` 属性需移到 inline style
- 建议图片宽度 ≤ 640px
- SVG 内嵌图片**必须**使用微信素材库链接
```html
<!-- 原始 -->
<img width="600" height="400" src="...">

<!-- 处理后 -->
<img style="width:600px; height:auto; max-width:100%;" src="...">
```

### 7. 数学公式
- 微信不支持 MathML 或 LaTeX 直接渲染。
- KaTeX/MathJax 的 `katex-html` 不能直接作为最终通过项；需要转为 WeChat-safe SVG、PNG 或图片化公式。
- 公式 SVG 必须具备明确底色或 `currentColor`/显式 fill，避免 Dark Mode 下不可读。
- 若公式无法安全保留，输出为图片 fallback，并在质量报告中标明。

### 8. 表格样式
- 必须完全内联样式
- 建议添加 `border-collapse: collapse` 和单元格边框
```html
<table style="border-collapse:collapse; width:100%; margin:16px 0;">
  <tr>
    <th style="border:1px solid #ddd; padding:8px 12px; background:#f5f5f5;">标题</th>
  </tr>
  <tr>
    <td style="border:1px solid #ddd; padding:8px 12px;">内容</td>
  </tr>
</table>
```

---

## 四、富文本复制技术

### Clipboard API 方案（推荐）
```javascript
async function copyToClipboard(html: string, text: string) {
  const htmlBlob = new Blob([html], { type: 'text/html' })
  const textBlob = new Blob([text], { type: 'text/plain' })
  const item = new ClipboardItem({
    'text/html': htmlBlob,
    'text/plain': textBlob,
  })
  await navigator.clipboard.write([item])
}
```

### 关键影响样式属性列表（getComputedStyle 过滤用）
```javascript
const EffectCssAttrs = [
  'fontSize', 'fontWeight', 'fontFamily', 'fontStyle',
  'color', 'backgroundColor',
  'textAlign', 'lineHeight', 'letterSpacing',
  'whiteSpace', 'wordBreak',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'border', 'borderRadius', 'borderColor', 'borderWidth',
  'display', 'verticalAlign',
  'width', 'maxWidth', 'height',
  'textDecoration', 'opacity',
  'listStyleType',
  'overflowX', 'overflowY',
]
```

---

## 五、渲染管线参考（doocs/md 验证方案）

```
Step 1: Markdown → HTML (marked + 自定义 renderer)
Step 2: 代码高亮 (highlight.js, class → inline style)
Step 3: 数学公式 (KaTeX → SVG)
Step 4: 安全清理 (DOMPurify.sanitize)
Step 5: 容器包装 (createContainer)
Step 6: CSS 内联化 (juice)
Step 7: 后处理
  ├── 嵌套列表修复 (li > ul → 兄弟节点)
  ├── 图片样式处理 (attr → inline style)
  ├── SVG 兼容性 (Mermaid 图表)
  ├── CSS 变量替换 (--var → 实际值)
  └── 外链转脚注
Step 8: 输出 WeChat-Compatible HTML
```

## 六、微信官方编辑器规范补充

微信官方编辑器插件规范已经明确若干会破坏编辑器和移动端呈现的风险。InkForge 质量检测与代码实现应覆盖这些点：

| 风险 | 规则 |
|------|------|
| 透明 `<img>` 叠加 SVG 背景图 | 禁止用来替代可编辑图片；图片应真实可见、可转存、可替换 |
| `line-height:0` | 禁止包裹文本内容 |
| fixed `width` / `height` | 容器不得固定到桌面宽度；移动端不能溢出或不可见 |
| `text-align:start/end` | 统一改为 `left`、`center`、`right` |
| SVG `animate begin` 仅 `touchstart` | opt-in 互动 SVG 需要同时覆盖 PC 和移动触发；默认不输出 DOM 事件处理器 |
| 普通段落放进 `<pre>` | 仅代码块使用 `<pre>`；普通正文使用 `<p>` 或 `<section>` |
| 深色模式渐变文字背景 | 文字背景使用纯色或有明确 fallback，渐变仅用于无文本装饰 |
| SVG 承载纯文本 | 尽量改为 HTML block；必须用 SVG 时要显式底色和 fill |

## 七、验证要求

- `convertToWechatWithStats` 后的最终 HTML 必须再次做 forbidden CSS / raw class / raw style tag / SVG safety 检测。
- 旗舰预设必须同时验证 `preview` 和 `wechat` target。
- 修改 SVG 或 HTML block 后，需要运行 `svg-modules`、`platform-rules`、`preview-fidelity` focused tests。
- 有真实微信公众号粘贴权限时做 paste recheck；没有权限时标记为 `blocked: needs real WeChat editor paste`，不可写成通过。
