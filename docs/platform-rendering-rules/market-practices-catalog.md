# 多平台排版渲染市场实践规则目录

> 本目录用于把 135 编辑器、秀米、doocs/md、mdnice、TypeZen、微信官方编辑器规范以及 InkForge `prompts/0601/` 实机证据转化为 InkForge 自有规则。市场工具只作为分类和流程参考，不复制模板、会员素材、私有内容或账号数据。

## 1. 规则来源与边界

### 1.1 已复核来源

| 来源 | 可借鉴内容 | InkForge 处理方式 |
| --- | --- | --- |
| 135 编辑器登录页/工作台实机观察 | 样式中心、模板中心、SVG 样式、SVG 效果、公众号长图、一键排版、校对、剪贴板、预览分享、同步公众号 | 抽象为元素族、检查项和导出路径，不复制模板 |
| 135 编辑器 2026-06-08 登录态实机复核 | 编辑器内导航含导入、插入、主题色、全文黑白、吸色、标题、正文、图文、引导、布局、节日、行业、小元素、SVG；SVG 中心含点击展开/显示/切换/缩放/翻转/弹出/放大/消失/播放/抽签、滑动展示、图片轮播、长按显示、渐显展示、文字弹幕、区域触发、趣味游戏、互动答题、文字特效、引导关注 | 进入 `interactive-system`、`editor-workflow-system` 和 `layout-and-layer-system`，仅记录 taxonomy |
| 135 编辑器 2026-06-08 二次实机复核 | `beautify_editor.html` 可见样式/模板/SVG编辑器/AI排版/一键排版/我的文章/我的图片/剪切板/公众号长图，以及导入、插入、主题色、全文黑白、吸色、标题、正文、图文、引导、布局、节日、行业、小元素、SVG、复制使用、快速保存、保存同步、预览分享、同步公众号；`svg-center.html` 明确列出点击、滑动、轮播、长按、区域触发等 SVG taxonomy，且多处标注“仅支持手机端触发” | 强化 artifact-state lifecycle 和移动端门禁；PC 后台粘贴只能证明 paste sanitizer/桌面编辑器渲染，不证明手机端触发、暗黑模式或发布成功 |
| 135 编辑器 2026-06-08 当前编辑器复核 | 工具栏可见默认字体、清除格式、格式刷、字号、粗斜下划线/删除线、文字/背景色、对齐、首行缩进、段前/段后、行距、字距、两侧边距、单图/多图上传、引用、全文自动排版、竖排、查询替换、链接、Word 图片上传、AI 润色/生成、全屏、文字阴影/边框、深色模式开关、段落 lineHeight/fontSize/textIndent/padding 等参数；账号菜单含授权公众号、定时群发、水印设置、全文格式、团队管理 | 补强 `editor-workflow-system` 的 toolbar-parameter taxonomy、Dark Mode preview gate、credentialed publishing states；InkForge 只能把这些转成自有规则、检查项或不可用状态 |
| 135 编辑器 2026-06-08 公开首页实机复核 | 首页明确把经典排版、AI 排版、SVG 动效、AI 生图、团队多人使用、AI 产品矩阵、公众号专属插件、多平台分发、企业内容中台、系统插件集成、开放接口、私有化部署、授权公众号、定时群发、全文格式、水印设置、团队管理列为产品/账号工作流入口 | 补强 `editor-workflow-system` 的 artifact-state、credential-gate、team-permission 和 enterprise-integration 规则；不得把插件/同步/接口入口视作当前发布成功证明 |
| 135 公开 SVG 教程 | SVG 需要区分复制到编辑器与复制到微信后台的出口，复杂效果可通过 HTML/代码入口插入 | WeChat output contract 增加 `copy-to-editor`、`copy-to-wechat`、`plugin/sync` 三类出口 |
| 秀米登录页/图文编辑器实机观察 | 图文排版、H5、图片设计、SVG 图集、滑动、点击展开、路径动画、自由布局、图层、长图/PDF/视频出口 | 将互动 SVG、自由布局、长图/PDF 降级写成规则，非默认输出 |
| 秀米 2026-06-08 登录态实机复核 | 导入 Word/Excel/Markdown、导入公众号文章、生成长图/PDF/视频、生成贴纸图文、一键排版、同步公众号、插件复制、继续复制粘贴；组件侧含主题色、标题、卡片、图片、布局、SVG、组件；属性侧含动作/动作列表/提取动作、点击动作、背景图、图层、定位、间距、字号、组件定位、页面对齐、多选对齐、SVG 图集 | 补充导入、动作、插件/同步、图层/自由布局、artifact 状态生命周期 |
| 秀米 2026-06-08 图文编辑器二次实机复核 | `studio/v5#/paper/for/new/cube/0` 可见打开、预览、保存、导出、更多、增强模式、基础格式字号/行距/字距、图文模板、图片素材、图文收藏、剪贴板、我的图库、团队素材、音视频、样刊模板、主题色、标题、卡片、图片、布局、SVG、组件 | 强化 authoring surface / material library / canvas / preview / save / export / platform preview 分层；增强媒体、团队素材和音视频属于独立能力或清单项，不是文章渲染成功证明 |
| 秀米 2026-06-08 当前编辑器复核 | `studio/v5` 可见同步到公众号/微博草稿箱、通过插件复制、继续复制粘贴、导入 Word/Excel/Markdown、导入公众号文章、生成长图/PDF/视频、一键排版、Markdown 锚点映射（主标题/次标题/三级标题/图片/引用/分割线/顶部签名/底部签名）、动作/动作列表/提取动作、背景图、定位、图层/z-order、组件定位、复制到微信；同步后预览需微信认证，留言需公众号权限，背景图高度超过 4000 会造成安卓显示风险 | 补强 `editor-workflow-system` 的 Markdown anchor map、permission gate、platform preview gate，以及 `layout-and-layer-system` 的 background-size/crop/z-order report |
| 秀米 2026-06-08 公开首页实机复核 | 官网 v13.4.8 将图文排版、H5 制作、图片设计作为三条主线，并显式提供我的秀米、教程培训、团队功能、手机版、秀米插件、第三方对接、新建图文/H5/设计、挑选风格排版/秀/设计入口 | 将 InkForge 的平台规则分成 article、interactive-page、design-image 三种 artifact family；当前任务只承诺 article/export 渲染，不伪装 H5 或设计器能力 |
| 秀米公开插件/教程资料 | 插件复制可降低 SVG 格式丢失；长图导出是微信以外平台的重要桥 | XHS 默认把富样式转成图片/长图/海报，不伪造正文富文本 |
| 微信公众平台编辑器插件开发规范 | 固定宽高、`line-height:0`、透明图片叠 SVG、`pre` 包普通段落、深色模式、SVG `begin` 触发等风险 | 更新 WeChat hard blockers 和 quality detector 期望 |
| doocs/md 文档和 OSS Markdown 编辑器 | Markdown parser、sanitize、theme、CSS inline、clipboard `text/html`、图片上传、链接脚注 | 保留现有 InkForge 管线，强化最终输出后检测 |
| mdnice/TypeZen 等 OSS | 多主题、AI 结构清理、图片/公式/代码特殊处理、多平台适配 | 借鉴能力分类，不引入第二套 renderer |
| Redink / 渲染AI（`joshua23/redink-xiaohongshu`） | 小红书 AI 图文生成的分阶段 pipeline、外置 prompt、封面/内容页/manifest 思路 | 仅作 XHS raster/AI workflow 概念参考；不复用代码、提示词或素材；其 CC-BY-NC-SA-4.0 许可不能进入商业实现 |
| `prompts/0601/` 本机实测 | WeChat-safe SVG 子集、HTML 色块层、旗舰系统真实微信 paste 存活证据 | 作为 InkForge 最高优先级实证规则 |
| 微信公众平台 2026-06-08 二次状态复核 | `mp.weixin.qq.com` 当前停留在登录/扫码入口，未进入已认证图文编辑器 | 本轮未产生 `flagship-amber` PC 粘贴证据；所有手机微信预览、SMIL、暗黑模式、封面缩略图门禁仍保持未完成 |
| 2026-06-08 public source hygiene refresh | Grok/Exa 公开检索复核了微信 inline-style/clipboard、XHS 3:4/image-page、Zhihu Markdown/image fallback 方向；其中部分结果带弱来源或不可核验的统计/上限说法 | 只保留与现有规则一致且可落成检测项的部分；无可核验来源的百分比、固定上限、平台能力升级不得写入 runtime catalog |
| 2026-06-08 135/Xiumi logged-in Playwright taxonomy refresh | 135 当前编辑器确认 toolbar 参数、样式族、SVG/长图、复制/保存/同步/预览、深色模式、授权公众号/定时群发/团队权限；秀米当前图文编辑器确认导入 Word/Excel/Markdown、导入公众号文章、同步/插件/复制、生成长图/PDF/视频、动作/图层/背景图/定位、SVG 图集、4000px 背景图安卓风险、公众号认证/留言权限 | 作为 `editor-workflow-system` 与 `layout-and-layer-system` 的当前实机 taxonomy 证据；未执行同步、复制、预览、导出或发布，不升级任何 runtime availability |
| 2026-06-08 CloakBrowser applied-element rerun | 使用 `inkforge-0601` profile，仅用 CloakBrowser 在 135 普通编辑器、135 SVG 编辑器、秀米图文编辑器中点击免费样式/SVG 效果，确认中间编辑区/画布真实出现内容后读取 DOM | 作为 `applied-editor-element` 证据：可转化为 InkForge 规则、布局风险、插入风险、manifest/schema/fallback 要求；不复制模板源码、私有 SVG、会员素材或账号数据，也不升级为 WeChat mobile/published 证据 |
| 2026-06-17 CloakBrowser DOM learning refresh | CloakBrowser-only applied-element refresh: 135 ordinary editor insertion increased the readable UEditor iframe from five to six `section._135editor` blocks; 135 SVG editor trial effects exposed authoring effect blocks, image slots, hidden controls, and parameter panels; Xiumi SVG-gallery click inserted an image/layer/action tree with zero literal SVG/SMIL in the sampled center document | Strengthens the conversion rules for hierarchy, rhythm, image metadata, trigger zones, motion schema, layout reports, static-expanded/raster/long-image fallback, and residue blocking. It is not template source, platform paste proof, mobile preview proof, sync proof, or publish proof |
| 2026-06-09 WeChat authenticated editor read-only proof checklist | CloakBrowser `inkforge-0601` 能进入真实微信 PC 图文编辑器并读取标题/正文 `.ProseMirror`；当前正文已有真实音频卡，且 `#js_add_appmsg` / `data-action="add"` 会改变多图文草稿结构 | 只升级 `authenticated-editor-reachable` 与 `pc-editor-dom-readable`；`pc-editor-paste` 仍必须另有 exact artifact、safe disposable draft、真实粘贴/channel event、DOM readback 与敏感证据隔离 |
| 2026-06-09 WeChat amber PC ClipboardEvent readback | CloakBrowser 在真实微信 PC 图文编辑器中对 exact `flagship-amber.html` 触发程序化 `ClipboardEvent('paste')` + `DataTransfer`；微信 paste handler 接管，DOM 读回 `data-ink-svg=3` / `svg=35` / `styleAttr=195` / `classAttr=30` | 作为 channel-specific `pc-editor-paste` 证据；不推翻 2026-06-08 普通 Ctrl+V 阻断，也不升级手机预览、Dark Mode、封面缩略图、同步、定时发送或发布 |
| 2026-06-09 market-editor residue runtime gate | 基于 CloakBrowser 对 135 免费样式、135 SVG builder、秀米图文编辑器 DOM 的 applied-element 观察，补充三平台质量检测硬门禁 | `quality-detector.ts` 现在对 WeChat/XHS/Zhihu 分别输出 `wechat-market-editor-residue`、`xhs-market-editor-residue`、`zhihu-market-editor-residue`；阻断 `_135editor`、`135brush`、`135bg`、`data-tools="135编辑器"`、135 CDN、`.tn-*`、`tn-*` 属性、`ng-*` authoring 属性和秀米素材源进入最终产物 |
| 2026-06-19 CloakBrowser applied-rule refresh | 135 普通编辑器点击免费样式后若只插入空白 `_135editor` 占位，不足以学习 applied style；135 SVG 编辑器免费试用可暴露 trigger canvas、trigger-hot-area、`app-content-canvas`、`block-img__content`、`ant-tooltip-open`；秀米 SVG 样本可把中心纸张变成 `tn-svg-animation-carousel`、flow-canvas、`tn-yzk-font-*`、`tn-placeholder`、`opera-tn-ra-*` 和 `ng-*` 作者态树，且中心可没有 literal SVG | 强化 runtime gate：这些强特征只转译为 InkForge 自有 trigger-zone/image-slot/motion/action/schema/fallback/layout-report；若进入 WeChat/XHS/Zhihu publishable output，必须输出平台对应的 market-editor-residue error。该证据不证明手机预览、暗黑模式、同步、上传、公开预览或发布 |
| 2026-06-20 public-source rule refresh | Exa/Grok 公开来源复核了微信官方编辑器插件规范、微信编辑器 JSAPI、doocs/md、mdnice、wx-art-formatter 和 md2red。官方规范确认结构校验接口、opacity-hidden image + SVG background、`line-height:0`、固定宽高、`text-align:start/end`、`pre` 普通段落、仅 `touchstart`、Dark Mode SVG 不被常规重着色等 bad case；OSS 工具继续收敛到 CSS inlining + `text/html` clipboard、长图/PDF fallback、XHS 图片卡片 manifest | 官方规范升级为 hard-blocker/source-of-truth；OSS/市场工具只作为架构和 artifact-family 参考。不得采纳未核验的营销排名、互动率、账号发布成功、自动发布或 `<style>`/media-query-in-SVG 建议；JSAPI/插件接口存在性不等于当前 InkForge credentialed sync、preview、scheduled-send 或 publish proof |

### 1.2 不进入实现的内容

- 不复制 135、秀米或其他平台的受版权保护模板、会员素材、私有 SVG 代码。
- 不触碰账号安全、支付、授权、发布、团队管理、素材商用声明。
- 不把无账号权限的微信、小红书、知乎同步/发布标记为成功。
- 不用 HTML 伪造微信后台原生组件，如小程序卡片、投票、视频号、音频、公众号名片。
- 不使用 emoji 作为 InkForge UI 图标；平台用户内容如原文自带表情可以保留，但系统图标必须使用 `lucide-vue-next` 或 inline SVG。

### 1.3 Applied Element Evidence Gate

市场编辑器学习必须区分三种状态：

| State | 证明了什么 | 不能证明什么 |
| --- | --- | --- |
| `market-template-listing` | 左侧列表、素材库、公开页存在某类样式或效果 | 样式实际插入、DOM 结构、微信粘贴、手机端触发、发布 |
| `applied-editor-element` | 点击样式/效果后，中间编辑区/画布真实出现内容，并能读取当前编辑器 DOM | 微信最终 sanitizer、手机预览、Dark Mode、封面缩略图、插件/同步、发布 |
| `authenticated-editor-reachable` | 真实微信 PC 图文编辑器在登录态 profile 中可进入 | artifact 粘贴、DOM sanitizer 保留、手机预览、同步、发布 |
| `pc-editor-dom-readable` | 真实微信 PC 编辑器标题/正文 DOM 可读，且视觉确认编辑区存在 | artifact 粘贴成功、手机最终渲染、Dark Mode、SMIL/点击触发、封面缩略图 |
| `pc-editor-paste` | exact artifact 被真实 PC 平台编辑器 paste handler 接收并 DOM/视觉读回 | 普通 Ctrl+V、手机最终渲染、Dark Mode、SMIL/点击触发、封面缩略图、同步、发布 |
| `platform-published` | 真实平台账号/预览/发布链路对同一 artifact 通过 | 未来平台稳定性或其他账号/渠道天然通过 |

有效市场学习流程：

1. 在市场编辑器中点击具体样式或 SVG 效果。
2. 视觉确认中间编辑区或 SVG 画布真的新增/改变了内容。
3. 读取当前编辑区域 DOM、样式属性、素材槽、参数面板和风险构造。
4. 只提炼 InkForge 自有规则、schema、fallback 和 quality gate。
5. 不复制第三方模板源码、平台私有 SVG、会员素材、账号信息、cookie、HAR 或截图。

2026-06-08 CloakBrowser rerun 的可执行结论：

- 135 普通样式插入后常见 `section._135editor`、`data-tools`、`data-id`、`135brush`、
  `135bg`、inline style、small SVG/image motif、`data-width`/`data-ratio`/`data-w` 图片元数据、
  `line-height:1.75em`、`letter-spacing:1.5px`。InkForge 可以学习节奏和结构，但必须剥离
  class/id/data metadata、第三方 CDN、flex、transform、gradient、`!important` 等依赖。
- 135 普通编辑器会把新样式插入到当前光标所在位置；如果光标在已有样式卡内部，视觉上会出现重叠和挤压。InkForge 的工具栏/marker 插入必须使用幂等哨兵和 block-boundary insertion guard。
- InkForge runtime guard lives in `inkforge/src/extensions/BlockBoundaryInsertion.ts`.
  Toolbar/slash/snippet code that inserts a card, callout, details block, market marker, or
  future SVG/H5-style block must route through this helper instead of raw `insertContent()`.
  Text snippets may remain inline, but `type: "block"` snippets and block JSON/HTML should
  replace an empty command paragraph or insert after the current top-level block.
- 135 SVG 编辑器是 effect builder：免费试用效果在画布中生成 block，并在右侧暴露 cover/element/bottom image slots、motion timing、scale、direction、expanded-content background、gap removal、block ordering/spacing controls。InkForge 应建 source-owned effect skeleton、image-slot manifest、trigger-zone manifest、motion parameter schema 和 mobile preview gate。
- 秀米 `.tn-page/.tn-comp/.tn-cell` 是 authoring component tree。普通图文卡和 `SVG图集/图集滚动`
  可能没有 literal `<svg>`，而是图片槽、图层、动作、contenteditable cell、flex/free-layout state。
  InkForge 必须转为 readable DOM order、inline HTML block、image manifest、raster/long-image fallback
  和 layout report。

These rules supersede taxonomy-only learning for future market probes. A later agent must not
claim a 135/Xiumi rule was learned unless the applied-element chain above is recorded.

2026-06-20 135 ordinary free-style applied readback refresh:

- CloakBrowser-only refresh on the active 135 ordinary editor confirmed a visible non-VIP style
  click as an applied-editor-element. After focusing `#ueditor_0` and clicking `#style-173703`,
  current readback reported `bodyChildren=6`, `bodyHtmlLen=25148`, `nodes=186`, `sections=122`,
  `styleAttrs=131`, `dataTools=7`, `dataId=7`, `dataBrushType=18`, `svgs=5`, `images=12`, and
  `style173703=2`.
- Grok/Exa public-source checks on the same day corroborated only the market taxonomy for
  135/Xiumi SVG/H5 families such as click, slide, carousel, expand, long-press, region trigger,
  and H5 surfaces.
- This reconfirms the existing applied-element and no-copy boundary for 135 ordinary editor DOM.
  Learn hierarchy, rhythm, title/body grouping, and insertion-risk patterns only after rewriting
  them as source-owned InkForge modules. Do not add runtime availability or claim WeChat paste,
  phone preview, sync, scheduled-send, public preview, XHS/Zhihu upload, or publish proof from this
  evidence.

2026-06-09 runtime gate:

- Applied 135/Xiumi evidence now feeds a real export quality detector instead of staying doc-only.
- The detector blocks market-editor authoring residues on all three platforms with platform-specific
  issue ids: `wechat-market-editor-residue`, `xhs-market-editor-residue`, and
  `zhihu-market-editor-residue`.
- Plain prose that says "135编辑器" or "秀米" is not a residue. The gate only matches structural
  HTML, third-party image sources, market class/id/data metadata, `tn-*` authoring attributes, and
  Angular/Vue authoring attributes observed in market editor surfaces.
- These blockers are an implementation of the no-copy boundary. They do not prove WeChat paste,
  mobile preview, Dark Mode, sync, scheduled send, or publish success.

2026-06-20 public-source refresh:

- WeChat's official editor plugin specification is the primary public rule source for editor
  compatibility. Keep `opacity:0` image overlays under SVG backgrounds, text containers with
  `line-height:0`, fixed-width/height content containers, `text-align:start/end`, ordinary prose
  inside `<pre>`, and SVG animations that only begin on `touchstart` as hard blockers.
- The official structure verifier (`verify_article_structure`) should be treated as an optional
  credentialed/operator check, not as local proof that a style is available or published.
- WeChat editor JSAPI cover/content/insert operations are plugin/editor channels. They may inform a
  future `credentialed-channel` runbook, but their documentation alone cannot satisfy paste,
  phone-preview, sync, scheduled-send, or publish gates.
- Public OSS formatters such as doocs/md, mdnice, and wx-art-formatter reinforce the current
  InkForge pipeline choice: parse or normalize source content, apply source-owned theme structure,
  inline CSS before copy/export, and write a `text/html` artifact. They do not justify importing
  their themes, licenses, browser flows, or a second renderer.
- Public XHS converters such as md2red reinforce that Xiaohongshu is an image-card / carousel /
  long-image artifact family with plain text metadata. Borrow manifest discipline and manual
  preview/edit/export flow, not platform automation.
- Search-result summaries that recommend publishable `<style>` blocks, media queries inside SVG,
  one-click account publishing, or universal SVG survival conflict with InkForge's stricter
  evidence policy unless later proven by exact artifact readback.

2026-06-09 layout report runtime gate:

- The WeChat quality detector now emits `wechat-layout-report-required` when final output still
  contains market-style free positioning, z-order layers, background image layers, cropped overflow,
  fixed geometry, manual offsets, negative overlap spacing, or invisible/custom hit areas.
- This gate is separate from `wechat-unsupported-css`: unsupported CSS says the platform cannot
  safely keep a property; layout-report-required says a 135/Xiumi-style layer system needs a
  readable DOM order, text fallback, crop/overflow proof, trigger-area proof, target-platform label,
  or raster/long-image fallback before it can be reported as exportable.
- Normal InkForge-owned inline flow blocks using `background-color`, borders, padding, margins,
  readable line-height, and source-owned SVG motifs should not trigger this gate.

2026-06-17 CloakBrowser DOM learning refresh:

- 135 ordinary style insertion was verified inside the center UEditor iframe: a concrete free
  style click changed `section._135editor` count from 5 to 6. The sampled blocks used nested
  sections, inline styles, data metadata, image-ratio metadata, third-party image hosts, flex,
  transforms, rotations, and assistant/editor classes. InkForge may learn hierarchy, rhythm,
  image ratio, title/body/card grouping, and insertion-risk patterns only.
- 135 SVG editor trial effects are authoring blocks, not reusable source. The sampled canvas used
  effect block names, image placeholders, Ant Design icon SVGs, hidden editor controls, and a
  parameter panel. Convert these observations into source-owned image-slot manifests, trigger-zone
  manifests, motion parameters, block-order schemas, static-expanded fallback, raster fallback, and
  mobile-preview gates.
- Xiumi SVG-gallery insertion can produce an image/layer/action tree rather than literal SVG. In
  the sampled document, the library showed many SVG preview nodes, but the inserted center document
  contained three image cells and zero literal SVG/SMIL nodes. Do not infer inline-SVG availability
  from library preview counts; translate Xiumi `tn-*`/`ng-*`/flow-canvas/action/layer state into
  readable DOM order, layout reports, image manifests, and fallback artifacts.

## 2. 平台输出合同

| 平台 | 主产物 | 样式丰富度 | 默认降级 | 不可通过项 |
| --- | --- | --- | --- | --- |
| 微信公众号 | inline-style HTML + WeChat-safe SVG/HTML block | 最高 | rasterized image、长图、发布清单 | `<style>`、事件处理器、脚本、class/id 依赖、unsupported CSS、未转存图片、伪造后台组件 |
| 小红书 | 纯文本 + 图片/海报/长图 | 正文低、图片高 | 3:4 图片页、长图、封面卡 | raw HTML、raw Markdown 控制符、超长段落、假富文本正文 |
| 知乎 | clean Markdown | Markdown 语义中高 | 图片化公式/图表、清理微信装饰 | 微信 `<section data-ink-block>`、inline SVG 装饰、CSS 依赖、不可解释的 HTML 泄漏 |

## 2A. 用户可选样式矩阵总览

InkForge 的样式丰富度必须作为“可选规则”暴露给用户，而不是把市场模板照搬成固定输出。每个可选项都需要同时声明平台、内容块、输出形态、降级策略和证据标签。

Executable mirror:

- `inkforge/src/services/export/style-catalog.ts` is the typed runtime catalog for this table.
- Future UI/export-report code should read `getPlatformStyleChoices()` and
  `evaluateStyleChoiceAvailability()` instead of duplicating these docs in component state.
- `getPlatformStyleAvailabilityReport()` is the runtime summary for ExportModal preflight and
  style-capability display. UI counts must come from this report, not from doc tables or local
  component constants.
- `getPlatformStyleApplicationReport()` is the second gate for interactive UI actions. A style
  may be `available` but still not `selectable` when no existing InkForge preset/export option
  can honestly realize it yet.
- Docs may describe additional `doc-only` ideas, but user-visible availability must come from
  the executable catalog and current evidence labels.

| Choice id | 平台 | 内容块 | 样式族 | 视觉强度 | 动效 | 主输出 | 降级 | 最低证据标签 | 阻断条件 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `wechat-classic-inline` | 微信 | 原 12 微信预设 | body-system | medium | none | inline HTML | static fallback | `unit-tested` | 微信 sanitizer 变化、官方组件需求、unsupported CSS |
| `wechat-quiet-editorial` | 微信 | lede、阅读条、引用、footer | card-system | medium | static | inline HTML | static fallback | `local-browser` | 固定容器、`line-height:0`、`text-align:start/end` |
| `wechat-toolbar-parameter-map` | 微信 | 字号、行距、字距、缩进、两侧边距 | body-system | medium | none | inline HTML | static fallback | `local-browser` | 工具栏参数不得绕过现有微信 renderer |
| `wechat-cover-seal-divider` | 微信 | 封面、分隔、落款 | headline-system | high | static | WeChat-safe SVG | image fallback | `local-browser` | 精确 artifact 的 PC paste、封面缩略图仍需另证 |
| `wechat-card-rich` | 微信 | 金句、数据、对比、时间线、清单 | card-system | medium-high | static | inline HTML | static fallback | `local-browser` | 固定容器、透明图叠 SVG、Dark Mode 证据缺失 |
| `wechat-flagship-kiln` | 微信 | 标题、金句、数据、分隔、落款 | headline-system | high | static | WeChat-safe SVG | image fallback | `local-browser` | 手机预览、封面缩略图仍需另证 |
| `wechat-flagship-tempera` | 微信 | 学术长文、报告、目录 | headline-system | medium-high | static | WeChat-safe SVG | image fallback | `local-browser` | 手机预览、Dark Mode 仍需另证 |
| `wechat-flagship-amber` | 微信 | 商业结构稿、对比、时间线、卡片 | headline-system | medium-high | static | WeChat-safe SVG | static fallback | `pc-editor-paste` | 2026-06-18 普通 OS Ctrl+V exact proof 已覆盖 PC 粘贴；手机预览、Dark Mode、封面缩略图和发布仍需另证 |
| `wechat-click-reveal` | 微信 | 点击展开、渐进披露 | interactive-system | high | click-candidate | WeChat-safe SVG | static fallback | `mobile-preview` | SMIL/click 手机前后证据缺失 |
| `wechat-mobile-only-effect` | 微信 | 长按、touch-only、区域触发 | interactive-system | high | mobile-only | WeChat-safe SVG | static fallback | `mobile-preview` | 市场标签提示仅手机端触发，默认 blocked |
| `wechat-carousel-switch` | 微信 | 图片轮播、点击切换、序列帧、滑动触发 | interactive-system | high | mobile-only | WeChat-safe SVG | image fallback | `mobile-preview` | 手机微信读回和静态 fallback 缺失 |
| `wechat-official-widget-checklist` | 微信 | 小程序卡片、视频号、投票、音频、名片 | guide-system | low | none | publish checklist | unavailable | `credentialed-sync` | 无真实账号权限、接口返回或后台组件证据 |
| `wechat-plugin-transfer-checklist` | 微信 | 插件传输、复制到微信通道、格式丢失读回 | editor-workflow-system | low | none | publish checklist | unavailable | `credentialed-sync` | 未执行插件传输和通道级 DOM 读回 |
| `wechat-sync-draft-checklist` | 微信 | 授权账号、草稿同步、图片传输、同步读回 | editor-workflow-system | low | none | publish checklist | unavailable | `credentialed-sync` | 无真实授权同步响应；同步不等于预览/发布 |
| `wechat-h5-design-boundary` | 微信 | H5、设计图、增强媒体、PDF/视频 | editor-workflow-system | low | none | publish checklist | unavailable | `doc-only` | 独立 artifact family，不是微信公众号正文渲染成功 |
| `xhs-clean-text` | 小红书 | 标题、短段、列表、话题 | body-system | low | none | plain text | plain text | `unit-tested` | HTML/SVG/Markdown 控制符泄漏 |
| `xhs-cover-carousel` | 小红书 | 封面、步骤卡、图文卡、图表 | figure-system | high | none | image page | long image | `local-browser` | manifest、格式、页数上限检查不通过 |
| `xhs-cover-hook` | 小红书 | 封面标题、副标题、主题钩子 | headline-system | high | none | image page | plain text | `local-browser` | 封面裁切、对比、manifest cover 标记缺失 |
| `xhs-markdown-card-slicer` | 小红书 | H2 分页、手动分页、清单、代码卡 | figure-system | medium-high | none | image page | long image | `local-browser` | 2026-06-21 本地 4 页 CloakBrowser raster pack + manifest 通过；平台上传/预览/发布仍需另证 |
| `xhs-data-card` | 小红书 | 数据表、对比、指标、图表摘要 | card-system | medium-high | none | image page | long image | `local-browser` | 2026-06-21 本地 3 页 CloakBrowser raster pack + manifest 通过；目录仍 blocked，密集表格/手机可读性/平台上传发布仍需另证 |
| `xhs-long-report` | 小红书 | 长文、宽表、分段报告 | fallback-system | medium | none | long image | image page | `local-browser` | 2026-06-21 本地 4 页 CloakBrowser raster pack + manifest 通过；目录仍 blocked，平台上传/预览/发布仍需另证 |
| `xhs-market-rich-card-fallback` | 小红书 | 市场富卡片、H5/互动降级、图文层转译 | fallback-system | medium | none | image page | long image | `local-browser` | 2026-06-21 本地 4 页 CloakBrowser raster pack + manifest 通过；目录仍 blocked，平台上传/预览/发布仍需另证 |
| `xhs-h5-design-import-boundary` | 小红书 | H5、设计海报、视频/PDF、贴纸图文 | editor-workflow-system | low | none | publish checklist | unavailable | `doc-only` | 需先落成图片页/纯文本，不是正文富文本 |
| `zhihu-clean-column` | 知乎 | 标题、段落、引用、列表、代码 | body-system | medium | none | clean Markdown | clean Markdown | `unit-tested` | 微信 wrapper、HTML/CSS、inline SVG 泄漏 |
| `zhihu-academic-latex-column` | 知乎 | LaTeX、脚注、代码、引用 | body-system | medium | none | clean Markdown | image fallback | `unit-tested` | 2026-06-21 本地 clean Markdown exact artifact 已提交；公式预览、public host、artifact manifest、平台发布仍需另证 |
| `zhihu-wechat-adapted` | 知乎 | 微信标题、引用、卡片、列表、落款 | fallback-system | medium | none | clean Markdown | image fallback | `unit-tested` | 2026-06-21 本地 WeChat residue cleanup exact artifact 已提交；public host、artifact manifest、平台发布仍需另证 |
| `zhihu-diagram-article` | 知乎 | 公式图、图表图、表格图 | figure-system | medium | none | image fallback | clean Markdown | `local-browser` | public HTTPS / platform-host 证明、alt/caption 缺失 |
| `zhihu-complex-table-fallback` | 知乎 | 宽表、多段单元格、表格截图、题注 | card-system | medium | none | image fallback | clean Markdown | `local-browser` | 栅格 artifact 与公开图片 host 证据缺失 |
| `zhihu-data-table` | 知乎 | 简单表、数据摘要、对比行 | card-system | medium | none | clean Markdown | image fallback | `unit-tested` | 表格分隔线非法、复杂表格未简化或缺 alt/caption |
| `zhihu-public-image-upload-checklist` | 知乎 | 平台图片上传、公开 HTTPS 重写、alt、caption | editor-workflow-system | low | none | publish checklist | unavailable | `credentialed-sync` | 需真实知乎或公开图床上传响应 |

选择规则：

- 默认给用户展示当前平台可真实支持的样式，不把 `blocked` 或 `unavailable` 样式伪装为可用。
- ExportModal 的“样式能力”面板可以提供真实可选动作，但必须同时满足两层 gate：
  `evaluateStyleChoiceAvailability().usable === true` 且
  `getStyleChoiceApplication(choice.id)` 指向现有 InkForge preset/export option。没有真实映射
  的 `available` choice 只能展示为“仅说明能力”，不能成为可点击模板。
- 点击可选样式必须通过现有 preset/export option 改变真实渲染路径，例如选择
  `wechat-flagship-kiln` 时实际选择 `flagship-kiln` preset。不得只设置 UI active 状态。
- 手动选择 preset 后应清空或同步样式 choice 状态，避免“卡片显示 A、实际 preset 是 B”的错位。
- 高级样式必须有低风险 fallback。微信互动 SVG 的 fallback 是静态 SVG 或图片；XHS/Zhihu 的 fallback 是图片/长图或语义 Markdown。
- 市场工具 taxonomy 可以扩充 `Choice id`，但不得导入第三方模板代码、会员素材、私有 SVG、账号数据或 copyrighted layout geometry。
- 所有选择项都必须经过对应平台质量检测器。检测失败时 UI 应显示阻断原因，不应继续导出为成功状态。
- `wechat-flagship-amber` 当前在 executable catalog 中为 `available`，证据地板是
  `pc-editor-paste`。依据是 2026-06-18 CloakBrowser-only 普通 OS Ctrl+V exact
  `flagship-amber.html` disposable-draft 证明；它只开放 PC 粘贴地板，不开放手机预览、
  Dark Mode、封面缩略图、同步、定时发送或发布状态。

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
- Raster exports must carry configurable ratio, dimensions, format, max bytes, max page count,
  manifest order, cover, and body-reference checks. Market values such as 1080x1440, JPG/PNG,
  20MB, and 18 images are defaults/checklist inputs, not eternal constants.

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
- 市场页标注“仅支持手机端触发”的效果默认归入 `mobile-only-risk`。即使 PC 后台粘贴保留 SVG，也必须在手机微信预览中记录触发前后和静态兜底，才能从 `blocked` 转为可用。
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
- `copy-to-wechat-pc-editor` 也只能证明当前 PC 后台 paste sanitizer 和桌面编辑器 DOM/可视化路径；它不能证明手机微信最终渲染、SMIL/click 触发、Dark Mode、封面缩略图、草稿同步或发布成功。
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
- Runtime enforcement: WeChat final-output checks must surface these constructs through
  `wechat-layout-report-required` unless the renderer has already degraded them to a safe flow
  block, raster artifact, or long-image artifact with reportable proof.

### 3.10 Market Observation Coverage Trace

| Observation category | Current InkForge rule target | Status |
| --- | --- | --- |
| style center / style blocks | `headline-system`, `body-system`, `card-system` | normative |
| template center / sample templates | no-copy boundary, persona/theme presets | taxonomy only |
| SVG style/effect/templates | `interactive-system`, `wechat-svg-modules` | normative with real-verification gate |
| mobile-only SVG trigger labels | `interactive-system`, evidence README | blocked until real mobile WeChat trigger evidence |
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
| applied 135 free title/image-text styles | `headline-system`, `figure-system`, `card-system`, `editor-workflow-system` | normative rewrite rule: learn section rhythm, image metadata, and paragraph cadence; strip third-party metadata/class/id/flex/transform/gradient |
| applied 135 insertion overlap | `editor-workflow-system`, future editor toolbar/marker actions | block-boundary insertion guard required; cursor-inside-card insertions must be prevented or repaired |
| applied 135 SVG trial effect builder | `interactive-system`, `layout-and-layer-system`, `fallback-system` | effect skeleton + image-slot manifest + trigger/motion schema + mobile preview gate; no private template copy |
| applied Xiumi SVG gallery/title samples | `interactive-system`, `layout-and-layer-system`, `headline-system` | authoring component tree only; convert to readable DOM order, own inline HTML/SVG/raster fallback, and layout report |
| 135/Xiumi authoring residue in export source | platform quality detector | runtime blocker across WeChat/XHS/Zhihu; rewrite as source-owned HTML/SVG/image manifest/fallback before export |

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
- A source that shows PC editor paste success cannot prove mobile WeChat rendering, click/SMIL interaction, Dark Mode, cover-thumbnail acceptance, scheduled send, or publish success.
- A source that shows free layout/layers cannot bypass DOM readability, Dark Mode, mobile overflow, and fallback checks.
- A source that only shows a template/effect listing cannot prove the applied DOM. A source that
  shows an applied 135/Xiumi editor element still cannot prove WeChat sanitizer, mobile preview,
  plugin transfer, sync, scheduled send, or publish.
- A search summary or market page claiming XHS accepts basic HTML, inline SVG, Markdown control
  syntax, or third-party editor responsive wrappers cannot loosen the XHS pure-text + raster
  artifact contract unless backed by reachable primary/live platform evidence.
- If two sources disagree on platform limits, use configurable limits and a publish checklist until the live platform can verify the current account.
- Do not adopt search summaries that contain unverifiable product names, version numbers,
  percentages, or "official report" references without a reachable primary source. 2026-06-08
  Grok search returned such claims for SVG plugins, so it was treated as a weak conflict source
  and did not loosen the WeChat-safe contract.
- Exa search results are usable only when they point back to reachable official/product/store
  pages. The 2026-06-08 Exa refresh corroborated 135's official AI/SVG/multi-platform taxonomy
  and the Chrome Web Store listing for the Xiumi plugin; it did not prove final WeChat mobile
  rendering.

### 3.12 Evidence Label Schema

Every style option, export artifact, and completion report must use one of these evidence labels.
Labels are cumulative only when the exact same artifact has passed the lower gate; do not infer a
higher label from a different artifact or platform.

| Label | Meaning | Acceptable evidence | Must not imply |
| --- | --- | --- | --- |
| `doc-only` | Rule is documented but not executable yet | docs/spec entry with source and fallback | any runtime safety |
| `applied-editor-element` | A concrete market style/effect was clicked, visually applied in the central editor/canvas, and DOM/controls were read | CloakBrowser evidence with no template/source/account material committed | InkForge detector behavior, local rendering, platform paste, mobile preview, sync, publish |
| `unit-tested` | Detector/converter behavior is covered in focused tests | Vitest output and asserted issue/artifact IDs | browser rendering or platform paste |
| `local-browser` | Artifact rendered in a local browser or Tauri/WebView2 path | Playwright/browser probe, screenshot, console/overflow checks | platform sanitizer survival |
| `pc-editor-paste` | Artifact pasted into a real PC platform editor and read back | authenticated editor DOM/visual evidence without secrets | mobile rendering, Dark Mode, sync, publish |
| `mobile-preview` | Artifact verified in target mobile preview | phone preview before/after screenshots or measured behavior | publish success |
| `credentialed-sync` | Real account/authorized sync created a draft/material | API/backend/editor evidence with sensitive data redacted | final published rendering |
| `published` | Real platform publish completed and was inspected | public URL or authorized final preview evidence | future platform stability |
| `blocked` | Work is gated by missing permission, account, hardware, or platform behavior | exact blocker and next verifiable action | failure of local renderer |
| `unavailable` | Platform contract forbids or cannot support the feature | rule citation and fallback path | a bug to be fixed by styling |

Evidence retention rules:

- Authenticated screenshots, QR codes, cookies, tokens, HAR, browser profiles, and account data are sensitive artifacts. They are not committed unless separately reviewed and redacted.
- Runtime proof requirements are executable in `inkforge/src/services/export/style-catalog.ts`.
  `getEvidenceProofRequirements()` maps one label to required proof items, while
  `getStyleChoiceProofRequirements()` dedupes a style choice's `evidenceFloor` and
  `publishEvidence` requirements. These helpers do not change `evaluateStyleChoiceAvailability()`.
  Platform-specific artifact manifest requirements must stay platform-gated: `credentialed-sync`
  only proves account/channel response, sync readback, and sensitive-artifact hygiene; XHS
  image-page/long-image choices add `xhs-artifact-manifest`, while Zhihu image-fallback/upload
  choices add `public-image-host` plus `zhihu-artifact-manifest`.
- Proof manifests are executable too. `validateStyleProofManifest()` validates a redacted
  `StyleProofManifest` and returns `QualityIssue[]` for missing requirements, weaker-than-claimed
  evidence labels, platform/choice mismatch, blocked choices, unsafe committed references,
  missing exact-artifact proof, missing disposable draft proof, missing phone readback, missing
  public image host, or missing XHS/Zhihu artifact-manifest validation. It is a proof-quality
  gate only; it never upgrades `available`, `selectable`, `published`, or platform success state.
- `getStyleProofManifestReport()` turns the same validator output into requirement and artifact
  rows: `satisfied`, `missing`, `invalid`, `accepted`, `sensitive`, or `unsafe-commit`. Use it for
  evidence checklists, completion reports, and follow-up CloakBrowser platform probes. It must not
  be used as an export converter, availability shortcut, or proof of mobile preview/sync/publish.
- `createStyleProofManifestDraft()` creates an empty, redacted `StyleProofManifest` scaffold for a
  platform/evidence label or a full style choice. It deliberately leaves `artifacts: []`, so the
  report lists missing real evidence instead of inventing proof artifacts. Use it before collecting
  CloakBrowser or platform evidence; do not commit filled manifests until sensitive-artifact review.
- `getPlatformStyleProofReadinessReport()` lifts those empty drafts to a full platform matrix.
  It lists every style choice, the missing/invalid proof requirement ids, and catalog-blocked
  choices. It is the operator checklist for full acceptance, not a success signal.
- `getPlatformStyleProofCollectionPlan()` converts the readiness gaps into ordered collection
  gates: local evidence, market editor probing, authenticated PC editor proof, phone preview,
  credentialed channel, public host, platform publish, and sensitive-artifact hygiene. It marks
  which steps are mutating, require external accounts, require a phone, or are safe to automate
  locally. The plan is a work queue for real evidence collection; it is not proof that any gate
  has passed.
- A test log can prove `unit-tested`, not `pc-editor-paste`.
- A 135/秀米 authoring preview can prove taxonomy and workflow state, not WeChat final mobile rendering.
- A 135/秀米 applied-editor-element proof can additionally prove authoring DOM structure,
  insertion risks, image-slot/layout/motion requirements, and rewrite/fallback needs. It still
  cannot prove WeChat final mobile rendering.
- A WeChat PC editor paste can prove current PC sanitizer retention, not SMIL/click behavior on mobile.
- A WeChat PC editor paste failure must also be recorded as evidence. If the clipboard artifact
  was rich HTML but the editor readback is plain text, mark that exact channel `blocked` instead
  of retrying until a local artifact is mistaken for platform proof.

### 3.13 InkForge Original Style Offering Trace

This trace maps existing InkForge style assets to user-facing choices so future additions remain additive.

| Existing InkForge asset | User-facing choice | Platforms | Evidence floor | Notes |
| --- | --- | --- | --- | --- |
| Original 12 WeChat presets | Classic WeChat presets | WeChat | `unit-tested` / prior `local-browser` evidence when rerun | Must remain behaviorally unchanged; no forced SVG injection |
| `flagship-kiln` | Bold creative flagship | WeChat; XHS/Zhihu via fallback only | `local-browser` | High-contrast editorial; no copied market geometry |
| `flagship-tempera` | Calm academic flagship | WeChat; XHS/Zhihu via fallback only | `local-browser` | Long-form reading rhythm and directory/card emphasis |
| `flagship-amber` | Structured business flagship | WeChat; XHS/Zhihu via fallback only | `local-browser` plus channel-specific PC ClipboardEvent readback | Runtime catalog remains blocked until mobile/publish proof; ordinary Ctrl+V still blocked |
| `style-catalog.ts` | Gate-aware style availability catalog | WeChat / XHS / Zhihu | `unit-tested` | Runtime mirror of this matrix; do not fork it in UI code |
| SVG static modules | Divider, seal, cover geometry | WeChat inline; XHS/Zhihu image fallback | `unit-tested` | Safe subset only |
| SVG interactive modules | Click/candidate interaction | WeChat opt-in | `unit-tested`; availability requires `mobile-preview` | Default blocked for mobile-only/touch-only patterns |
| XHS raster pipeline | Cover, carousel, long image | XHS | `local-browser` after canvas probe | Needs manifest/format/count/crop checks |
| Zhihu clean Markdown converter | Article/answer Markdown | Zhihu | `unit-tested` | Images and diagrams need upload/public-host evidence |

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
- `caret-color: rgba(...,0)` or equivalent invisible-caret edits in authoring surfaces
- `opacity:0` on editable real images while an SVG/background image is shown in their place

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
- text-bearing SVG without an opaque background, `currentColor` wrapper color, or explicit
  fill/stroke contrast proof for Dark Mode

### 4.3 Dark Mode

- Text and background must be nested in the same visual container.
- Avoid gradient behind text; if a gradient is purely decorative, it must not carry text.
- SVG text must have explicit fill and sufficient contrast.
- Transparent images or SVGs with dark strokes need light/dark contrast review.
- Do not use `data-no-dark` as a blanket escape hatch; it only solves a narrow class of cases.

### 4.4 Market editor evidence split

- A visible 135/Xiumi library category or selected library item is `market-template-listing`.
  It can update taxonomy, vocabulary, and risk labels only.
- A market editor click becomes `applied-editor-element` only when the center editor, canvas, or
  paper changes and the after-state DOM can be read.
- 135 SVG editor examples may inform trigger zones, image slots, motion parameters, static
  fallback, raster fallback, and phone-preview gates. Do not copy trial effect source, market ids,
  exact coordinates, paid material, or authoring wrappers.
- 135 ordinary editor examples must include a meaningful center-editor delta before a style rule is
  learned. A click that only inserts an empty `_135editor` placeholder is insertion-risk evidence,
  not reusable title/card/body style evidence.
- 135 SVG trigger-canvas wrappers such as `app-content-canvas`, `block-img__content`, and
  `ant-tooltip-open` are residue signals. They can inform InkForge trigger-zone and expanded-
  content schema only after being rewritten as source-owned modules.
- 135 ordinary editor examples may inform title/body rhythm, nested hierarchy, and block insertion
  risk. Do not retain `_135editor`, helper classes, `data-tools`, `data-id`, editor metadata,
  transforms, or market image dependencies.
- Xiumi SVG/H5 examples may inform image carousel, click-expand, path animation, draw, slide,
  transition, parallax, click switch, flip, zoom, quiz, bullet text, popup, print, jump, play,
  long-press, and region-trigger taxonomies. If the center paper does not change, keep the evidence
  at `market-template-listing`.
- Xiumi SVG/H5 examples that do change the center paper may still be authoring-state only.
  `tn-svg-animation-*`, `tn-child-orientation="flow-canvas"`, `tn-group-usage-flow-canvas`,
  `tn-yzk-font-*`, `tn-placeholder`, `opera-tn-ra-*`, Angular `ng-*`, and `ui-sortable` must be
  blocked from publishable output and converted to image manifests, action schema, readable DOM
  order, or raster/long-image fallback.
- Neither `market-template-listing` nor `applied-editor-element` proves WeChat phone rendering,
  Dark Mode, mobile interaction, cover acceptance, account sync, scheduled send, or publish.

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
- Toolbox365 Markdown-to-WeChat traps reference: `https://www.toolbox365.cn/tutorials/markdown-to-wechat-typesetting-traps/`
- Canva Xiaohongshu size market reference: `https://www.canva.cn/sizes/little-red-book/`
- Xiaohongshu / Rednote cover size market reference: `https://xiaohongshu.oimi.ai/en/blog/xiaohongshu-cover-size`
- VSCode-Zhihu source reference: `https://github.com/niudai/VSCode-Zhihu`
- md2zhihu source reference: `https://github.com/drmingdrmer/md2zhihu`
- netpi WeChat SVG interaction research reference: `https://github.com/netpi/wechat-layout`
- doocs/md docs: `https://md.doocs.org/` and `https://github.com/doocs/md`
- InkForge real WeChat evidence: `prompts/0601/evidence/`
- InkForge market-rule agent output: `.trellis/tasks/06-01-multiplatform-render-svg/research/market-rule-agent-output.csv`
- InkForge logged-in market editor taxonomy evidence:
  `prompts/0601/evidence/market-editor-live-taxonomy-refresh-20260608.txt`
- InkForge CloakBrowser applied-element market evidence:
  `prompts/0601/evidence/market-editor-element-probe-20260608.txt`
- InkForge CloakBrowser market applied refresh evidence:
  `prompts/0601/evidence/market-editor-applied-refresh-20260617.txt`
- InkForge WeChat authenticated editor proof checklist evidence:
  `prompts/0601/evidence/style-proof-checklist-20260609.txt`
- InkForge real PC paste evidence path: `prompts/0601/evidence/wechat-paste/`
- InkForge real XHS browser raster evidence path: `prompts/0601/evidence/xhs-raster/`
- InkForge WeChat SVG spec: `.trellis/spec/frontend/wechat-svg-modules.md`

## 7. 2026-06-18 OSS Converter Source Refresh

This refresh adds public source-backed converter rules to the market catalog. It complements the
live 135/Xiumi CloakBrowser passes; it does not replace external platform proof.

Sources:
- doocs/md: clipboard/export/theme source under `apps/web/src/services/export/`,
  `apps/web/src/composables/useImageUploader.ts`, and `packages/core/src/theme/`.
- mdnice/markdown-nice: `src/utils/converter.js`, WeChat/Zhihu sidebar copy actions, theme menu,
  style editor, and normal theme template.
- pilipala5/RedBookCards: Markdown processor and fixed-size image/PDF exporter.

Rules for InkForge:
- WeChat output follows the converter-family pattern: collect the effective theme CSS, make it
  match the export fragment, inline it, then run platform cleanup and quality gates. Preview theme
  injection alone is not publishable proof.
- WeChat images should carry stable style-level dimensions after conversion. Raw image attributes
  alone are not a sufficient paste contract.
- Math, Mermaid, and SVG diagrams require platform-specific treatment. WeChat may use exact inline
  SVG proof; Zhihu and Xiaohongshu should use formula text, semantic Markdown, public-host image,
  poster, or long-image fallback.
- Xiaohongshu visual output is an image artifact workflow with real page files and manifest
  consistency. It is not a rich HTML body workflow.
- Zhihu visual output is Markdown or public-host image fallback with alt/caption and URL safety.
- Local clipboard/export readiness cannot satisfy authenticated editor paste, phone preview, Dark
  Mode, cover thumbnail, sync, public-host acceptance, upload, scheduled send, or publish gates.

Evidence:
- `prompts/0601/evidence/oss-converter-source-refresh-20260618.txt`
- `prompts/0601/research/wechat-svg-typesetting-patterns.md` section 12.

## 8. 2026-06-20 CloakBrowser SVG Deep Pass

This refresh records the deeper 135/Xiumi browser pass requested for SVG/H5/style rules. It is
market-rule extraction only; it does not replace exact InkForge artifact proof on WeChat, XHS, or
Zhihu.

135 SVG editor rules:
- Free-trial/no-material SVG effects are schema inputs, not reusable source. Map image slots,
  hidden trigger overlays, percentage hot areas, resize handles, direction controls,
  animation-duration fields, expanded content, ordering, spacing, copy/delete, and gap-removal
  controls to InkForge-owned manifest fields and layout reports.
- Trial placeholders, central-canvas authoring wrappers, effect-family ids, Vue/Ant wrappers,
  trigger helpers, and editor metadata must remain market-editor residue blockers if they appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- 2026-06-20 CloakBrowser shell refresh: the active 135 SVG editor free-trial page exposed center
  shell wrappers such as `content-canvas`, `content-background`, `content-inner`, `block-inner`,
  `block-img__inner`, `placeholder__help`, `placeholder__icon`, `article-item__inner`,
  `article-item__label`, and `article-item__del`. Specific shell markers are blocked as
  `135 SVG editor shell residue` if copied into WeChat/XHS/Zhihu output.
- 2026-06-20 CloakBrowser layout-control refresh: a visible 135 SVG free-trial click populated the
  center canvas with authoring-only spacing, gap, slider, and hidden title-edit controls such as
  `block-spacing`, `block-gap`, `gap-item-wrapper`, `article-item__editing`,
  `ant-slider-track`, and `ant-slider-handle`. These may inform InkForge-owned spacing policy and
  gap-removal schema only; copied controls are blocked as `135 SVG editor layout control residue`.
- 2026-06-21 CloakBrowser free-trial recheck: after a visible `免费试用` click, the 135 SVG editor
  center DOM contained two `content-canvas` / `content-inner` / `content-background` containers,
  ten `block-img__inner` image-slot shells, ten `placeholder__help` helpers, two
  `block-spacing` / `block-gap` controls, four `gap-item-wrapper` rows, four
  `ant-slider-track` / `ant-slider-handle` controls, and `edit-trigger__switch` /
  `ant-switch-checked` trigger switches. This confirms that the existing detector coverage for
  trigger, placeholder, image-slot, spacing, gap, and slider authoring residue is still the right
  enforcement path.
- 2026-06-21 CloakBrowser SVG background-style refresh: a material-included 135 free-trial layer
  exposed a tall background SVG using `background-attachment`, `background-position`,
  `background-repeat`, `background-size:100.1% 100.1%`, `margin-top:-1px`,
  `pointer-events:none`, `user-select:none`, `vertical-align:top`, `width:100%`, and the
  135-specific inline style marker `svg:135`. That marker must fail as
  `135 SVG background style marker` if copied into WeChat/XHS/Zhihu publishable output. The
  layout idea may only be rewritten into an InkForge-owned image-slot/fallback manifest plus a
  layout report.
- A selected 135 SVG effect proves only applied authoring structure and parameter taxonomy. It does
  not prove final visual fidelity, PC paste, phone preview, tap/swipe/long-press behavior, Dark
  Mode, cover thumbnail acceptance, sync, scheduled send, public preview, or publish.
- 2026-06-20 background-only SVG compatibility fixture: a material-included 135-style shell can be
  reduced to a zero-font / zero-line-height `section` containing a background-only
  `viewBox="0 0 1080 1920"` SVG with `background-size:100.1% 100.1%`, `margin-top:-1px`,
  `vertical-align:top`, and `pointer-events:none`, even when all vendor class/id/data/source
  markers are absent. Existing platform gates must still block it as WeChat line-height/layout
  risk, XHS HTML/SVG leakage, and Zhihu inline SVG/HTML/style leakage.

Xiumi SVG/H5 rules:
- SVG category labels are taxonomy and manifest inputs. Preserve component family, behavior family,
  interaction channel, image ratio, fallback family, and proof requirement.
- Examples include SVG gallery/layout/animation, free sliding layout, overlapping layout, gallery
  scroll/switch, transition, slide sequence, fade-in, interactive/non-interactive state, and image
  ratios such as 1080x720, 1080x1440, and 1080x2223.
- Non-interactive or auto-only gallery effects may justify static, auto, raster, carousel-page, or
  long-image fallbacks. They cannot satisfy mobile tap, swipe, long-press, phone-preview, or publish
  proof.
- `tn-*`, `ng-*`, Xiumi material URLs, action/layer authoring classes, free-layout canvas classes,
  and editor runtime attributes are residue blockers, not exportable structure.
- 2026-06-20 Xiumi SVG layer-slot rerun: a clicked SVG gallery/scrolling sample changed the center
  `.tn-editing-panel` by `htmlLength +31920`, `tnComp +15`, `tnCell +18`, `img +3`, and
  `contenteditable +1`, while inline SVG stayed `0`. Fine-grained authoring markers such as
  `tn-page-slot`, `tn-layer-slot`, `tn-child-position-absolute/static`,
  `tn-child-orientation-fixed/flow-canvas`, and `raw-image` are residue blockers even when broad
  `tn-comp` / `tn-cell` wrappers or hosted-media URLs are absent.
- 2026-06-20 Xiumi SVG gallery state-wrapper refresh: the live applied center sample exposed
  `tn-image-inst-wrapper`, `tn-quick-input-*`, `tn-page-vessel`, `tn-group-sortable-box`,
  `tn-sortable-pin`, `tn-state-*`, `tn-on-*`, `tn-in-cell-state-active`, `tn-overflow-hidden`,
  and `tn-content-overlap`. These state wrappers must be blocked from WeChat/XHS/Zhihu
  publishable output and translated only into InkForge-owned image-slot manifests, layout reports,
  static/raster fallback, or editor-state diagnostics.
- 2026-06-20 Xiumi component-binding refresh: the same applied center state exposed component
  binding attributes such as `tn-bind-comp-tpl-id`, `tn-comp-role`, `tn-comp`, `tn-comp-pose`,
  `tn-uuid`, `tn-animate`, `tn-animate-on-self`, `tn-cell-type`, `tn-child-position`,
  `tn-child-orientation`, `tn-page-stage-size`, `tn-page-cache-gatherer`, `tn-atom-context`,
  `tn-link`, and `tn-image-usage`. These bindings are editor/runtime schema and must be blocked as
  `Xiumi component binding attribute residue` if copied into WeChat/XHS/Zhihu output.
- 2026-06-20 executable fallback-catalog contract: the market SVG/H5/rich-layout family is visible
  in the runtime style catalog only as blocked fallback choices:
  `wechat-market-svg-h5-fallback-matrix`, `xhs-market-rich-card-fallback`, and
  `zhihu-market-rich-layout-fallback`. They document available design directions and required
  fallback paths without claiming availability. WeChat requires phone preview/publish proof; XHS
  requires real image-page/long-image manifest proof; Zhihu requires public-host image fallback
  proof with alt/caption and manifest validation. The 2026-06-21 `xhs-market-rich-card-fallback`
  local raster pack supplies source-owned image-page/manifest proof only; it does not satisfy
  upload, preview, public article, or publish proof. None may map to a selectable preset until all
  required InkForge-owned artifacts and platform proof exist.
- 2026-06-21 Xiumi SVG recovery-modal recheck: the live v5 paper editor exposed the SVG taxonomy
  and a readable `.tn-editing-panel`, but an unsaved-draft recovery confirmation blocked safe
  application proof. Do not automate restore/cancel decisions. Treat this as taxonomy and blocker
  evidence only until an operator safely clears the account/editor state and the center editor
  mutation is read back.
- 2026-06-21 Xiumi template-renderer refresh: the live v5 paper editor exposed the template
  injection/preview pipeline in the visible template list and hidden controls. Markers included
  `tplLib.onTemplateClicked`, `tpl2BoxClasses`, `tpl2PresentType`, `tn-tpl-pose-fit-box`,
  `renderer_accelerate`, and `validateImageTypeInHtml`. These are Xiumi authoring/rendering
  pipeline residue, not portable article HTML. They must fail as
  `Xiumi template renderer pipeline residue` if copied into WeChat/XHS/Zhihu output.
- Effects requiring plugin, sync, or enhanced upload remain credentialed-channel work. Local
  browser evidence, market listing evidence, and applied-editor-element evidence are insufficient.

Evidence:
- `prompts/0601/evidence/market-editor-cloakbrowser-svg-deep-pass-20260620.txt`
- `prompts/0601/evidence/market-editor-trigger-overlay-residue-contract-20260620.txt`
- `prompts/0601/evidence/xiumi-svg-layer-slot-residue-contract-20260620.txt`
- `prompts/0601/evidence/xiumi-svg-gallery-state-wrapper-residue-20260620.txt`
- `prompts/0601/evidence/xiumi-component-binding-attribute-residue-20260620.txt`
- `prompts/0601/evidence/135-svg-editor-shell-residue-contract-20260620.txt`
- `prompts/0601/evidence/135-svg-editor-layout-control-residue-contract-20260620.txt`
- `prompts/0601/evidence/135-svg-free-trial-cloakbrowser-recheck-20260621.txt`
- `prompts/0601/evidence/135-background-only-svg-compatibility-fixture-20260620.txt`
- `prompts/0601/evidence/market-fallback-catalog-contract-20260620.txt`
- `prompts/0601/evidence/xiumi-svg-recheck-recovery-modal-blocker-20260621.txt`
- `prompts/0601/evidence/market-editor-cloakbrowser-svg-pipeline-residue-refresh-20260621.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 16.

## 9. 2026-06-20 External Proof Freshness Contract

Market-editor, authenticated editor, phone preview, public-host, credentialed channel, and
platform-publish evidence are time-sensitive. A proof row collected against a live external surface
must not be reused indefinitely as if it still represented the current platform behavior.

Rules:
- External proof rows must carry `collectedAt` as a parseable redacted timestamp on the same
  matching `StyleProofArtifact` row that carries the proof flags.
- The default freshness window is 14 days. Rows with no timestamp, a future/unparseable timestamp,
  or a timestamp older than the window emit manifest issues and cannot satisfy acceptance.
- Local-only proof remains reusable without `collectedAt`: unit tests, local browser rendering,
  exact-artifact binding, artifact-manifest validation, and sensitive-hygiene reviews are not
  external platform proof by themselves.
- Existing committed WeChat PC proof keeps its real evidence collection dates. Those dates are not
  automatically renewed by local test runs; once stale, the release gate must ask the operator to
  refresh evidence instead of silently claiming success.
- This contract strengthens accounting only. It does not create phone preview, sync, upload,
  scheduled-send, public-host, or publish evidence.

Runtime issue ids:
- `style-proof-manifest-collected-at-missing`
- `style-proof-manifest-collected-at-invalid`
- `style-proof-manifest-proof-stale`

Evidence:
- `prompts/0601/evidence/style-proof-external-freshness-contract-20260620.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 19.

## 10. 2026-06-21 Execution Runbook Freshness Guidance

The execution runbook now carries the freshness contract forward into the operator-facing checklist.
This keeps stale external proof visible in reports and UI consumers without changing the underlying
platform rendering rules.

Rules:
- Every `StyleProofExecutionRunbookStep` exposes whether a fresh `collectedAt` timestamp is
  required, the active freshness window, and the current freshness issue ids.
- Missing, future/unparseable, and stale timestamps are presented as distinct cannot-claim reasons.
- Freshness failures ask the operator to recapture the exact external proof and attach one matching
  row with `collectedAt` inside the active window.
- Local-only proof rows remain timestamp-free in the runbook.
- This is guidance for real evidence collection. It does not claim that phone preview, Dark Mode,
  cover thumbnail, sync, upload, scheduled send, public-host, or publish proof has been collected.

Evidence:
- `prompts/0601/evidence/style-proof-runbook-freshness-guidance-20260621.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 20.

## 11. 2026-06-22 Committed Release Blocker Count Readout

The committed-evidence release gate is the operator-facing stoplight for whether local evidence,
PC evidence, phone proof, public-host proof, credentialed channel proof, scheduled-send proof,
platform-preview proof, and publish proof can be described as complete. It is a read-only accounting
surface, not a renderer, uploader, synchronizer, or publisher.

Rules:
- `getCommittedStyleProofEvidenceReleaseGateReport()` remains the only committed-evidence release
  gate for the current redacted manifest pack.
- `issueIds` is a de-duplicated scanner list. Use `issueCounts` when a report needs exact issue
  occurrence totals.
- Step-backed blockers expose `platformStepCounts` and `requirementStepCounts` so operators can
  see whether the remaining work is WeChat phone preview, credentialed editor/channel work, public
  host validation, scheduled send, or platform publish readback.
- The local-conflict blocker summarizes manifest issues and may have empty step-count arrays.
- ExportModal may display these counts in the committed proof preflight row, but the row stays
  blocked while `canClaimComplete=false` and must not enable sync, upload, scheduled-send, preview,
  or publish actions.
- ExportModal must translate release-gate operator actions into concise Chinese UI summaries from
  structured fields such as `requirementId` and `boundary`. Raw service-layer runbook prose should
  remain available to developer-facing reports, but it should not be dumped into the compact
  operator row.
- Snapshot counts are diagnostic only. They must never be used to infer phone preview, Dark Mode,
  cover thumbnail, sync, upload, public-host, scheduled-send, platform-preview, public rendering,
  or publish success.

Current 2026-06-22 snapshot after the WeChat Kiln paste-safe committed local proof:
- `status=blocked-by-local-conflict`
- `canClaimComplete=false`
- `localManifestCount=20`
- `wechatPcManifestCount=2`
- `combinedManifestCount=22`
- `combinedIssueCount=16`
- `cannotClaimSteps=32`
- `phoneOpenSteps=4`
- `externalDependencyOpenSteps=14`
- `unsafeToAutomateOpenSteps=13`
- `mutatingOpenSteps=13`
- `blockerCount=5`
- local conflict issue counts: `style-proof-manifest-requirement-missing=13`,
  `style-proof-manifest-choice-blocked=3`
- phone preview platform counts: `wechat=4`
- external dependency platform counts: `wechat=7`, `xiaohongshu=2`, `zhihu=5`
- unsafe-to-automate platform counts: `wechat=7`, `xiaohongshu=2`, `zhihu=4`

Evidence:
- `prompts/0601/evidence/style-proof-release-blocker-counts-20260622.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 33.
