# 多平台排版渲染市场实践规则目录

> 本目录用于把 135 编辑器、秀米、doocs/md、mdnice、TypeZen、微信官方编辑器规范以及 InkForge `prompts/0601/` 实机证据转化为 InkForge 自有规则。市场工具只作为分类和流程参考，不复制模板、会员素材、私有内容或账号数据。

## 1. 规则来源与边界

### 1.1 已复核来源

| 来源 | 可借鉴内容 | InkForge 处理方式 |
| --- | --- | --- |
| 135 编辑器登录页/工作台实机观察 | 样式中心、模板中心、SVG 样式、SVG 效果、公众号长图、一键排版、校对、剪贴板、预览分享、同步公众号 | 抽象为元素族、检查项和导出路径，不复制模板 |
| 135 编辑器 2026-06-08 登录态实机复核 | 编辑器内导航含导入、插入、主题色、全文黑白、吸色、标题、正文、图文、引导、布局、节日、行业、小元素、SVG；SVG 中心含点击展开/显示/切换/缩放/翻转/弹出/放大/消失/播放/抽签、滑动展示、图片轮播、长按显示、渐显展示、文字弹幕、区域触发、趣味游戏、互动答题、文字特效、引导关注 | 进入 `interactive-system`、`editor-workflow-system` 和 `layout-and-layer-system`，仅记录 taxonomy |
| 135 编辑器 2026-06-08 公开首页实机复核 | 首页明确把经典排版、AI 排版、SVG 动效、AI 生图、团队多人使用、AI 产品矩阵、公众号专属插件、多平台分发、企业内容中台、系统插件集成、开放接口、私有化部署、授权公众号、定时群发、全文格式、水印设置、团队管理列为产品/账号工作流入口 | 补强 `editor-workflow-system` 的 artifact-state、credential-gate、team-permission 和 enterprise-integration 规则；不得把插件/同步/接口入口视作当前发布成功证明 |
| 135 公开 SVG 教程 | SVG 需要区分复制到编辑器与复制到微信后台的出口，复杂效果可通过 HTML/代码入口插入 | WeChat output contract 增加 `copy-to-editor`、`copy-to-wechat`、`plugin/sync` 三类出口 |
| 秀米登录页/图文编辑器实机观察 | 图文排版、H5、图片设计、SVG 图集、滑动、点击展开、路径动画、自由布局、图层、长图/PDF/视频出口 | 将互动 SVG、自由布局、长图/PDF 降级写成规则，非默认输出 |
| 秀米 2026-06-08 登录态实机复核 | 导入 Word/Excel/Markdown、导入公众号文章、生成长图/PDF/视频、生成贴纸图文、一键排版、同步公众号、插件复制、继续复制粘贴；组件侧含主题色、标题、卡片、图片、布局、SVG、组件；属性侧含动作/动作列表/提取动作、点击动作、背景图、图层、定位、间距、字号、组件定位、页面对齐、多选对齐、SVG 图集 | 补充导入、动作、插件/同步、图层/自由布局、artifact 状态生命周期 |
| 秀米 2026-06-08 公开首页实机复核 | 官网 v13.4.8 将图文排版、H5 制作、图片设计作为三条主线，并显式提供我的秀米、教程培训、团队功能、手机版、秀米插件、第三方对接、新建图文/H5/设计、挑选风格排版/秀/设计入口 | 将 InkForge 的平台规则分成 article、interactive-page、design-image 三种 artifact family；当前任务只承诺 article/export 渲染，不伪装 H5 或设计器能力 |
| 秀米公开插件/教程资料 | 插件复制可降低 SVG 格式丢失；长图导出是微信以外平台的重要桥 | XHS 默认把富样式转成图片/长图/海报，不伪造正文富文本 |
| 微信公众平台编辑器插件开发规范 | 固定宽高、`line-height:0`、透明图片叠 SVG、`pre` 包普通段落、深色模式、SVG `begin` 触发等风险 | 更新 WeChat hard blockers 和 quality detector 期望 |
| doocs/md 文档和 OSS Markdown 编辑器 | Markdown parser、sanitize、theme、CSS inline、clipboard `text/html`、图片上传、链接脚注 | 保留现有 InkForge 管线，强化最终输出后检测 |
| mdnice/TypeZen 等 OSS | 多主题、AI 结构清理、图片/公式/代码特殊处理、多平台适配 | 借鉴能力分类，不引入第二套 renderer |
| Redink / 渲染AI（`joshua23/redink-xiaohongshu`） | 小红书 AI 图文生成的分阶段 pipeline、外置 prompt、封面/内容页/manifest 思路 | 仅作 XHS raster/AI workflow 概念参考；不复用代码、提示词或素材；其 CC-BY-NC-SA-4.0 许可不能进入商业实现 |
| `prompts/0601/` 本机实测 | WeChat-safe SVG 子集、HTML 色块层、旗舰系统真实微信 paste 存活证据 | 作为 InkForge 最高优先级实证规则 |

### 1.2 不进入实现的内容

- 不复制 135、秀米或其他平台的受版权保护模板、会员素材、私有 SVG 代码。
- 不触碰账号安全、支付、授权、发布、团队管理、素材商用声明。
- 不把无账号权限的微信、小红书、知乎同步/发布标记为成功。
- 不用 HTML 伪造微信后台原生组件，如小程序卡片、投票、视频号、音频、公众号名片。
- 不使用 emoji 作为 InkForge UI 图标；平台用户内容如原文自带表情可以保留，但系统图标必须使用 `lucide-vue-next` 或 inline SVG。

## 2. 平台输出合同

| 平台 | 主产物 | 样式丰富度 | 默认降级 | 不可通过项 |
| --- | --- | --- | --- | --- |
| 微信公众号 | inline-style HTML + WeChat-safe SVG/HTML block | 最高 | rasterized image、长图、发布清单 | `<style>`、事件处理器、脚本、class/id 依赖、unsupported CSS、未转存图片、伪造后台组件 |
| 小红书 | 纯文本 + 图片/海报/长图 | 正文低、图片高 | 3:4 图片页、长图、封面卡 | raw HTML、raw Markdown 控制符、超长段落、假富文本正文 |
| 知乎 | clean Markdown | Markdown 语义中高 | 图片化公式/图表、清理微信装饰 | 微信 `<section data-ink-block>`、inline SVG 装饰、CSS 依赖、不可解释的 HTML 泄漏 |

## 3. InkForge Rule Catalog

### 3.1 `headline-system`

用途：文章标题、章节标题、小节标题、编号标题、边线标题、图像标题、竖排视觉标题。

WeChat:

- H1/H2/H3 可以由 inline HTML block 承载可重排文本。
- 旗舰系统继续使用 grid、diamond、seal、constructivist motif。
- 文字不得放在不可编辑背景图中；若必须转图片，只能作为海报/长图降级。
- 禁用 fixed width、fixed height、absolute/fixed positioning 和 style transform。

XHS:

- 正文标题转为短标题和短段落。
- 富样式标题走封面图、图片页或长图，不进入正文富文本。

Zhihu:

- 保留 `#`、`##`、`###`。
- 移除微信 block wrapper 和 SVG 装饰。

### 3.2 `body-system`

用途：正文段落、lede、阅读条、摘要卡、导语、段落节奏。

WeChat:

- 段落默认 16-17px，行高 1.7-1.9，避免容器 `line-height:0`。
- 不建议自定义 `font-family`，优先保留微信默认字体栈。
- 阅读条和导语必须使用 inline style，可被 Dark Mode 算法处理。

XHS:

- 每段短、少嵌套，生成纯文本。
- 复杂摘要可变成封面图或图片页。

Zhihu:

- 保留普通 Markdown 段落。
- 不注入微信阅读条。

### 3.3 `card-system`

用途：引用、提示、警告、金句、数据卡、对比卡、时间线、检查清单。

WeChat:

- 文本卡片使用 `<section>` + inline style，不依赖 class。
- 图标使用 inline SVG path 或几何图形，不用 emoji。
- `box-shadow` 只允许非 inset，避免深色模式和微信公共样式冲突。
- 数据卡要有文本备份，不能只靠图片。

XHS:

- 数据卡、对比卡、时间线优先转图片页。
- 正文只保留简化文字和条目。

Zhihu:

- 引用转 `>`。
- 检查清单转普通列表或保留平台兼容 Markdown。
- 数据卡转 Markdown 表格或分段描述。

### 3.4 `figure-system`

用途：单图、题注、多图网格、长图分段、封面图、图文组。

WeChat:

- 图片 `width`/`height` 属性转 inline style。
- 避免固定容器宽度；外层 `max-width:100%`。
- 不用透明图片叠 SVG 来隐藏真实图片。
- 不把纯文本长期承载在图片或 SVG 中，除非是明确的 poster/long-image artifact。

XHS:

- 默认 3:4 竖图优先，支持 1:1。
- 多张图片需要顺序、标题和安全边距检查。
- 导出图片页时必须检查文字不被裁切。

Zhihu:

- 远程图片可能不可用时给出提示。
- SVG 图片需要转 PNG/JPG 或保留为链接说明。

### 3.5 `guide-system`

用途：关注、分享、阅读全文、文末落款、二维码占位、发布清单。

WeChat:

- 关注/二维码/名片类能力涉及官方后台组件时，规则只输出占位或发布清单，不伪造组件。
- 文末落款可使用 inline HTML block 和 WeChat-safe SVG seal。

XHS:

- 不生成外链和二维码引导。
- 可输出话题建议和封面/图片页说明。

Zhihu:

- 外链保留 Markdown link；二维码或平台引导转普通说明。

### 3.6 `interactive-system`

用途：轮播、点击展开、切换、弹出、路径动画、区域触发、滑动展示。

WeChat:

- 只允许 opt-in。
- SVG 交互必须通过 `checkWechatSafe` 扩展规则和真实平台/编辑器验证。
- SMIL `begin` 不能仅有 `touchstart`；PC/移动都需要可触发。项目默认不使用 DOM 事件处理器。
- 复杂交互必须有 rasterized fallback 或 publish checklist。

XHS:

- 正文不支持交互；必须降级为图片组、视频或长图。

Zhihu:

- 不输出交互 SVG；降级为图片、链接或文字说明。

### 3.7 `fallback-system`

用途：长图、海报、PNG 公式/表格/图表、手动发布清单、unavailable 状态。

所有平台共享规则：

- 降级不是失败，只要 artifact type 明确、可预览、可测试。
- 无凭据、无上传权限、平台限制时返回 `blocked` / `unavailable`，不得返回 `success`。
- 任何图片化输出必须提供可读性检查、尺寸检查、裁切检查和文件存在性检查。

### 3.8 `editor-workflow-system`

用途：导入、清洗、一键排版、校对、复制、插件传输、同步草稿、预览分享、导出、发布前检查。

市场映射：

- 135：导入、插入、主题色、全文黑白、吸色、一键排版、文本校对、剪切板、预览分享、同步公众号。
- 135 公开首页补充：经典排版与 AI 排版是两条不同入口；AI 生文/生图/图表/问答、文案转笔记、AI 配图、AI 场景创作是内容生成/重写阶段，不等于发布；公众号插件、多平台分发、授权公众号、定时群发、企业内容中台、系统插件集成、开放接口、私有化部署和团队管理均属于 credentialed workflow。
- 秀米：导入 Word/Excel/Markdown、导入公众号文章、一键排版、插件复制、继续复制粘贴、同步公众号/微博、生成长图/PDF/视频。
- 秀米公开首页补充：图文排版、H5 制作、图片设计是不同 artifact family；`new paper`、`new tablet/H5`、`new placard/design` 不能共用同一渲染成功状态。
- doocs/md / OSS：Markdown 源优先，预览 DOM 复制时进行 CSS 内联，最终通过 `text/html` 剪贴板或平台 API 输出。

InkForge 合同：

- `imported` 只是输入状态，不等于可信内容。任何外部 HTML/SVG/图片包都必须记录来源类型、运行 sanitize/schema validation、拒绝 unsupported construct，并保留 provenance/audit note。
- `one-click-typeset` 只能调用现有 renderer / preset / quality detector，不得新建绕过管线的模板拼接路径。
- `copy-to-editor`、`copy-to-wechat`、`plugin-transfer`、`sync-draft`、`published` 是不同 artifact state。前一状态成功不得推断后一状态成功。
- `plugin-transfer` 是传输渠道，不是平台渲染证明。插件/同步路径必须有传输前安全检查、传输后格式丢失检测和不可用 fallback。
- `sync-draft` / `published` 必须经过真实凭据、账号授权、权限、接口返回和平台预览确认；任一缺失时输出 `blocked` / `unavailable`。
- `authorized-account`、`scheduled-publish`、`team-shared`、`enterprise-api`、`private-deploy` 是权限/分发能力，不是排版渲染能力。它们只能在真实账号、团队、接口和部署配置存在时进入发布路径；否则只显示检查项和阻断原因。
- `ai-draft`、`ai-layout`、`ai-chart`、`ai-image`、`text-to-xhs-note` 是上游内容/素材生成状态。进入 InkForge 渲染前必须落成可审计 Markdown、image manifest 或 structured artifact，且必须经过同样的平台质量检测。
- `preview-share` 只能证明本地或托管预览可见，不证明微信/小红书/知乎最终渲染。
- `export-long-image`、`export-pdf`、`export-video` 是 fallback artifact，不得伪装为平台正文富文本。

### 3.9 `layout-and-layer-system`

用途：秀米式自由布局、图层、背景、触发区、命中区、分屏/拼图、长图分段、poster canvas。

布局 primitive taxonomy：

| Primitive | WeChat | XHS | Zhihu |
| --- | --- | --- | --- |
| flow layout | inline HTML block | plain text / image page | Markdown |
| split / two-column | table/table-cell or stacked blocks | image page | Markdown table or stacked paragraphs |
| mosaic / image grid | real images with inline style, or raster fallback | image page / carousel images | Markdown images or raster collage |
| free canvas / poster | raster fallback or strictly verified SVG/HTML subset | 3:4 image page / long image | image fallback |
| long-image sections | image artifact + manifest | primary rich-output route | image fallback only |
| interactive region | opt-in WeChat-safe SVG with real verification | unavailable; use image/video | unavailable; use image/link/text |

Layering rules:

- WeChat HTML output must preserve readable DOM order. Visual layering must not make text inaccessible to selection, copy, screen reading, or Dark Mode review.
- Unsupported absolute/free-layout compositions degrade to raster/long-image with text backup.
- Background images must not hide editable images or meaningful text. If background is used, foreground text needs explicit contrast and mobile crop checks.
- Hit areas and trigger regions must be visible or documented. Invisible overlays are only allowed inside a verified WeChat-safe SVG module and must have a static fallback.
- Z-order, locked layers, and overlapping regions require a per-artifact layout report: visible order, DOM order, text fallback, crop/overflow status, and platform target.

### 3.10 Market Observation Coverage Trace

| Observation category | Current InkForge rule target | Status |
| --- | --- | --- |
| style center / style blocks | `headline-system`, `body-system`, `card-system` | normative |
| template center / sample templates | no-copy boundary, persona/theme presets | taxonomy only |
| SVG style/effect/templates | `interactive-system`, `wechat-svg-modules` | normative with real-verification gate |
| long image / PDF / video | `fallback-system`, XHS image page/long image | normative artifact fallback |
| import Word/Excel/Markdown/article | `editor-workflow-system` | normative ingress validation |
| export / copy / preview share | `editor-workflow-system` | normative artifact-state lifecycle |
| plugin copy / sync | `editor-workflow-system` | credential/channel-gated |
| AI layout / AI image / text-to-XHS | `editor-workflow-system`, XHS raster pipeline | ingress only; must materialize as Markdown/image manifest before export |
| authorized account / scheduled publish | `editor-workflow-system` | credential-gated; never inferred from copy/export |
| enterprise content middle platform / API / private deploy | `editor-workflow-system` | integration boundary only; no publish success without real endpoint |
| paper / H5 / design separation | Xiumi public homepage | artifact-family separation; current rule set covers article/export first |
| actions / extracted actions | `interactive-system`, `layout-and-layer-system` | opt-in only |
| layers / free layout / z-order | `layout-and-layer-system` | raster fallback unless proven safe |
| layout / component positioning | `layout-and-layer-system` | platform-specific mapping |
| AI image-and-text staged pipeline | Redink / 渲染AI XHS generator | conceptual only; no code/prompt/template reuse |

### 3.11 Source Conflict And Proof Hierarchy

Market editors and public tutorials often demonstrate effects in their own authoring surface. InkForge must resolve conflicts in this order:

1. Platform official docs and API contracts.
2. InkForge real artifacts and real platform/editor evidence under `prompts/0601/evidence/`.
3. Project validators and tests such as `checkWechatSafe`, XHS leakage checks, Zhihu Markdown checks, and artifact manifest checks.
4. Logged-in 135/Xiumi/browser observations as taxonomy and workflow references only.
5. Search-engine summaries and public blogs/examples/OSS projects as implementation ideas only.

Conflict rules:

- A source that relies on `<script>`, event attributes, DOM listeners, class selectors, `<style>`, external CSS, or external SVG/image resources cannot loosen the WeChat output contract.
- A source that shows plugin copy, preview share, or draft sync cannot prove final publish rendering without credentialed platform confirmation.
- A source that shows free layout/layers cannot bypass DOM readability, Dark Mode, mobile overflow, and fallback checks.
- If two sources disagree on platform limits, use configurable limits and a publish checklist until the live platform can verify the current account.
- Do not adopt search summaries that contain unverifiable product names, version numbers,
  percentages, or "official report" references without a reachable primary source. 2026-06-08
  Grok search returned such claims for SVG plugins, so it was treated as a weak conflict source
  and did not loosen the WeChat-safe contract.
- Exa search results are usable only when they point back to reachable official/product/store
  pages. The 2026-06-08 Exa refresh corroborated 135's official AI/SVG/multi-platform taxonomy
  and the Chrome Web Store listing for the Xiumi plugin; it did not prove final WeChat mobile
  rendering.

## 4. WeChat Hard Rules

### 4.1 HTML inline style

允许：

- `color`
- `background-color`
- solid `background`
- `border`
- `border-left`
- `border-radius`
- `padding`
- `margin`
- non-inset `box-shadow`
- `font-size`
- `font-weight`
- `font-style`
- `text-align`
- `line-height`
- `letter-spacing`
- `display:block`
- `display:inline-block`
- `display:table`
- `display:table-cell`
- `vertical-align`
- `word-break`
- `white-space`
- `opacity`，但不得用于隐藏真实图片再叠 SVG

禁止或高风险：

- `<style>`、`<script>`、event handler、external CSS
- `class`/`id` 依赖
- `var(...)`、`calc(...)`
- `linear-gradient`/`radial-gradient` 用于文字背景
- `filter`、`backdrop-filter`
- `animation`、`transition`、`@keyframes`
- `position:fixed`、`position:absolute`
- `display:flex`、`display:grid`、`gap`
- fixed container width/height
- 普通段落使用 `<pre>`
- `line-height:0`
- `text-align:start/end`
- `!important`

### 4.2 SVG subset

允许：

- `<svg>` with `viewBox` and responsive width
- `<g>`、`<path>`、`<rect>`、`<circle>`、`<line>`、`<text>`
- presentation attributes: `fill`、`stroke`、`stroke-width`、`opacity`、`transform`
- solid colors and explicit text fill
- opaque background for text-bearing SVG or Dark Mode-sensitive blocks

禁止：

- `<defs>`、gradient、clip/mask/filter、`<use>`、`url(#...)`
- `class`/`id` dependency
- `<style>` dependency
- `foreignObject`
- external `<image href>`
- script/event handler
- SVG used to hide/replace editable images in a way that prevents official-account editing

### 4.3 Dark Mode

- Text and background must be nested in the same visual container.
- Avoid gradient behind text; if a gradient is purely decorative, it must not carry text.
- SVG text must have explicit fill and sufficient contrast.
- Transparent images or SVGs with dark strokes need light/dark contrast review.
- Do not use `data-no-dark` as a blanket escape hatch; it only solves a narrow class of cases.

## 5. Verification Contract

Docs/spec changes are not enough. Any renderer change must be proven by:

- focused unit tests for the changed export function or rule.
- negative tests for raw HTML, raw Markdown, unsupported CSS, or SVG safety violations.
- desktop browser screenshot and console sweep.
- mobile 390px width screenshot and overflow measurement.
- `vue-tsc`, non-mutating ESLint, and production build unless blocked by exact local toolchain failure.
- GitNexus impact before code edits and detect_changes before final report.

## 6. Source Index

- WeChat official editor plugin specification: `https://developers.weixin.qq.com/doc/subscription/guide/product/plugin_spec.html`
- WeChat official draft API index: `https://developers.weixin.qq.com/doc/offiaccount/Draft_Box/Add_draft.html`
- WeChat official material API index: `https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/Adding_Permanent_Assets.html`
- 135 SVG export tutorial: `https://www.135editor.com/books/chapter/1/410`
- 135 SVG insertion tutorial: `https://www.135editor.com/geo/gongzhonghaopaiban/1516/`
- 135 SVG center real-browser entry: `https://www.135editor.com/svg-center.html`
- 135 editor real-browser entry: `https://www.135editor.com/beautify_editor.html`
- 135 public homepage / product taxonomy real-browser entry: `https://www.135editor.com/`
- 135 Exa-corroborated product taxonomy: `https://www.135editor.com/beautify_editor.html`,
  `https://by.135editor.com/`
- Xiumi official site: `https://xiumi.us/`
- Xiumi paper editor real-browser entry: `https://xiumi.us/studio/v5/paper`
- Xiumi Chrome extension listing: Chrome Web Store `fifkoliiibjdpcdfcknjjcpnahhnihid`
- doocs/md official editor: `https://md.doocs.org/`
- doocs/md source: `https://github.com/doocs/md`
- Redink / 渲染AI XHS workflow reference: `https://github.com/joshua23/redink-xiaohongshu` (concept only; CC-BY-NC-SA-4.0 non-commercial boundary)
- WeWrite WeChat constraints reference: `https://github.com/oaker-io/wewrite/blob/main/references/wechat-constraints.md`
- VerySmallWoods WeChat markdown copy/paste architecture reference: `https://www.verysmallwoods.com/blog/20260119-wechat-markdown-copy-paste`
- netpi WeChat SVG interaction research reference: `https://github.com/netpi/wechat-layout`
- doocs/md docs: `https://md.doocs.org/` and `https://github.com/doocs/md`
- InkForge real WeChat evidence: `prompts/0601/evidence/`
- InkForge market-rule agent output: `.trellis/tasks/06-01-multiplatform-render-svg/research/market-rule-agent-output.csv`
- InkForge real PC paste evidence path: `prompts/0601/evidence/wechat-paste/`
- InkForge real XHS browser raster evidence path: `prompts/0601/evidence/xhs-raster/`
- InkForge WeChat SVG spec: `.trellis/spec/frontend/wechat-svg-modules.md`
