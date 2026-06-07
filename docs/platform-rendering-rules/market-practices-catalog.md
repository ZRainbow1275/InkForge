# 多平台排版渲染市场实践规则目录

> 本目录用于把 135 编辑器、秀米、doocs/md、mdnice、TypeZen、微信官方编辑器规范以及 InkForge `prompts/0601/` 实机证据转化为 InkForge 自有规则。市场工具只作为分类和流程参考，不复制模板、会员素材、私有内容或账号数据。

## 1. 规则来源与边界

### 1.1 已复核来源

| 来源 | 可借鉴内容 | InkForge 处理方式 |
| --- | --- | --- |
| 135 编辑器登录页/工作台实机观察 | 样式中心、模板中心、SVG 样式、SVG 效果、公众号长图、一键排版、校对、剪贴板、预览分享、同步公众号 | 抽象为元素族、检查项和导出路径，不复制模板 |
| 135 公开 SVG 教程 | SVG 需要区分复制到编辑器与复制到微信后台的出口，复杂效果可通过 HTML/代码入口插入 | WeChat output contract 增加 `copy-to-editor`、`copy-to-wechat`、`plugin/sync` 三类出口 |
| 秀米登录页/图文编辑器实机观察 | 图文排版、H5、图片设计、SVG 图集、滑动、点击展开、路径动画、自由布局、图层、长图/PDF/视频出口 | 将互动 SVG、自由布局、长图/PDF 降级写成规则，非默认输出 |
| 秀米公开插件/教程资料 | 插件复制可降低 SVG 格式丢失；长图导出是微信以外平台的重要桥 | XHS 默认把富样式转成图片/长图/海报，不伪造正文富文本 |
| 微信公众平台编辑器插件开发规范 | 固定宽高、`line-height:0`、透明图片叠 SVG、`pre` 包普通段落、深色模式、SVG `begin` 触发等风险 | 更新 WeChat hard blockers 和 quality detector 期望 |
| doocs/md 文档和 OSS Markdown 编辑器 | Markdown parser、sanitize、theme、CSS inline、clipboard `text/html`、图片上传、链接脚注 | 保留现有 InkForge 管线，强化最终输出后检测 |
| mdnice/TypeZen 等 OSS | 多主题、AI 结构清理、图片/公式/代码特殊处理、多平台适配 | 借鉴能力分类，不引入第二套 renderer |
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
- 135 SVG export tutorial: `https://www.135editor.com/books/chapter/1/410`
- 135 SVG insertion tutorial: `https://www.135editor.com/geo/gongzhonghaopaiban/1516/`
- Xiumi official site: `https://xiumi.us/`
- Xiumi Chrome extension listing: Chrome Web Store `fifkoliiibjdpcdfcknjjcpnahhnihid`
- doocs/md docs: `https://md.doocs.org/` and `https://github.com/doocs/md`
- InkForge real WeChat evidence: `prompts/0601/evidence/`
- InkForge WeChat SVG spec: `.trellis/spec/frontend/wechat-svg-modules.md`
