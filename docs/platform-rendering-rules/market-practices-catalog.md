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
| 2026-06-29 135 ordinary action rail chrome refresh | CloakBrowser 在 135 普通编辑器右侧操作栏读取到 `editorslide`、`multiedit_agent_main`、`agent_btn`、`import-article`、`copy-editor-html`、`quick-save-template`、`save-as-template`、`btn-new-msg`、`large-image-popover`、`btn-show-drafts`、`preview-editor` 和 `sync_official_accounts` | 这些是导入、复制、保存、草稿、预览、同步等编辑器动作入口，不是文章语义；若进入 WeChat/XHS/Zhihu publishable output，必须输出平台对应的 market-editor-residue error，且不升级任何 copy/preview/sync/upload/publish proof |
| 2026-06-29 135 ordinary applied image-source refresh | CloakBrowser 在 135 普通编辑器中恢复中心 UEditor iframe body 选区后点击免费样式，中心内容从 5 个顶层子节点变为 6 个，并新增 `data-id="174407"`；新块图片同时带 `src` 与 `_src` 指向 135 素材域 | `_src` 是 135 编辑器镜像素材源属性，不是可发布文章语义；`quality-detector.ts` 对 `src`、`_src`、`data-src`、`href`、`xlink:href` 指向 135 素材域的图像统一输出 `135 third-party image source`，不升级任何平台 proof |
| 2026-06-29 135 ordinary style-panel navigation refresh | CloakBrowser 在 135 普通编辑器左侧样式面板读取到 `style-operate-area`、`style-color-palette`、`style-categories`、`style-sorts` 和 `news_modal-ys` | 这些是样式库导航、主题色和排序 chrome，不是文章内容；若进入 WeChat/XHS/Zhihu publishable output，必须输出平台对应的 market-editor-residue error，且不依赖 style-card、UEditor、action rail、hosted image 或 SVG-builder 标记 |
| 2026-06-29 135 ordinary full-page navigation refresh | CloakBrowser 在 135 普通编辑器页头、公告区、账号菜单和左侧主导航读取到 `nav-header`、`top-style-tools`、`site-annoucement-list`、`login-menus`、`left-operate-menu`、`left-advertises`、`bg-header`、`category-nav`、`left_side__menu`、`ai_subsystem_nav` | 这些是站点/账号/产品导航 chrome，不是文章内容；若进入 WeChat/XHS/Zhihu publishable output，必须输出平台对应的 market-editor-residue error，且不记录账号文本、不升级任何 proof |
| 2026-06-29 135 ordinary helper iframe refresh | CloakBrowser 在 135 普通编辑器读取到 `ai_polish_box_iframe`、`js_shared_iframe`、`svg_editor_iframe`、`ueditor_0` 以及 `_src="/style-center?...` 等辅助 iframe 标记 | 这些是 AI 面板、共享桥、SVG 编辑器挂载、UEditor iframe 和样式中心浏览框，不是文章内容；若进入 WeChat/XHS/Zhihu publishable output，必须输出 `135 editor helper iframe residue`，且不把普通 iframe 全部误标为 135 来源 |
| 2026-06-19 CloakBrowser applied-rule refresh | 135 普通编辑器点击免费样式后若只插入空白 `_135editor` 占位，不足以学习 applied style；135 SVG 编辑器免费试用可暴露 trigger canvas、trigger-hot-area、`app-content-canvas`、`block-img__content`、`ant-tooltip-open`；秀米 SVG 样本可把中心纸张变成 `tn-svg-animation-carousel`、flow-canvas、`tn-yzk-font-*`、`tn-placeholder`、`opera-tn-ra-*` 和 `ng-*` 作者态树，且中心可没有 literal SVG | 强化 runtime gate：这些强特征只转译为 InkForge 自有 trigger-zone/image-slot/motion/action/schema/fallback/layout-report；若进入 WeChat/XHS/Zhihu publishable output，必须输出平台对应的 market-editor-residue error。该证据不证明手机预览、暗黑模式、同步、上传、公开预览或发布 |
| 2026-06-20 public-source rule refresh | Exa/Grok 公开来源复核了微信官方编辑器插件规范、微信编辑器 JSAPI、doocs/md、mdnice、wx-art-formatter 和 md2red。官方规范确认结构校验接口、opacity-hidden image + SVG background、`line-height:0`、固定宽高、`text-align:start/end`、`pre` 普通段落、仅 `touchstart`、Dark Mode SVG 不被常规重着色等 bad case；OSS 工具继续收敛到 CSS inlining + `text/html` clipboard、长图/PDF fallback、XHS 图片卡片 manifest | 官方规范升级为 hard-blocker/source-of-truth；OSS/市场工具只作为架构和 artifact-family 参考。不得采纳未核验的营销排名、互动率、账号发布成功、自动发布或 `<style>`/media-query-in-SVG 建议；JSAPI/插件接口存在性不等于当前 InkForge credentialed sync、preview、scheduled-send 或 publish proof |
| 2026-06-23 public-source rule refresh | Grok Search 重新抓取微信官方编辑器插件规范、微信 MP 编辑器 JSAPI、微信 H5 DarkMode 文档、doocs/md 架构文档，并复核小红书/知乎公开入口；小红书公开入口仍是登录态创作者平台，知乎公开检索未发现可作为硬规则的官方 Markdown/图片上传规格 | 继续把微信官方规范作为 hard-blocker/source-of-truth；doocs/md 只作为 parse -> inline CSS -> sanitize -> themed HTML 的架构参考；小红书/知乎保持保守本地 artifact manifest + 外部账号/platform proof gate，不采纳第三方尺寸指南或社区脚本作为发布成功证明 |
| 2026-06-23 135/Xiumi CloakBrowser applied DOM refresh | 使用既有 CloakBrowser profile 在 135 SVG 编辑器点击真实“免费试用”并选择不引入素材图，在秀米图文编辑器取消草稿恢复、打开 SVG 分类并点击可见 SVG 卡片；两者均在中间编辑/正文区出现内容后读取 DOM、样式、参数面板和分类 | 135 规则进入 safe wrapper、background-SVG、image-slot、trigger-zone、motion-param schema；秀米规则进入 SVG taxonomy、nested section tree、foreignObject/text-risk、SMIL animate-risk、layout-report 和 residue-blocker。该证据不证明微信粘贴、手机预览、暗黑模式、同步、公开预览或发布 |

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

2026-06-29 135 ordinary style-library operation chrome refresh:

- CloakBrowser-only refresh on the live 135 ordinary editor enabled the visible free filter and
  inspected a concrete left style-card DOM. A center-empty `section#autoparagraph` insertion was
  rejected as insufficient applied-content proof.
- The sampled style card exposed source-library controls:
  `judgeYangShiJurisdiction(...)`, `similarity_recommend_entry`, `material-id`,
  `material-type="style"`, `mappaobug`, and `data-model="EditorStyle"`, in addition to the
  already-covered `style_id/style_name/style_price` metadata.
- These fields are not title/card semantics. They must be stripped or blocked from InkForge
  publishable output across WeChat, Xiaohongshu, and Zhihu even when broader `_135editor`,
  `data-tools`, or style-list metadata wrappers are absent.
- This refresh adds a runtime residue gate only. It does not prove WeChat paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, public rendering,
  XHS/Zhihu account upload, or publish success.

2026-06-29 135 ordinary UEditor toolbar/editor chrome refresh:

- CloakBrowser-only refresh on the same live 135 ordinary editor read normal-editor toolbar and
  editor shell markers including `edui-toolbar`, `edui-button`, `edui-for-source`,
  `edui-for-bold`, `edui-for-fontsize`, `edui-wx-input`, `edui-editor`,
  `edui-editor-mainbar`, `edui-editor-toolbarbox`, and `edui-editor-iframeholder`.
- These fields are editor UI chrome, not article body structure or style semantics. If copied into
  WeChat, Xiaohongshu, or Zhihu output, they must be blocked even without `_135editor`,
  `data-tools`, style-list metadata, left-library operation chrome, or SVG-builder markers.
- This refresh adds a runtime residue gate only. It does not prove WeChat paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, public rendering,
  XHS/Zhihu account upload, or publish success.

2026-06-29 135 ordinary action rail chrome refresh:

- CloakBrowser-only refresh on the same live 135 ordinary editor read the right-side editor action
  rail next to the central UEditor iframe.
- Observed action rail markers included `editorslide`, `multiedit_agent_main`, `agent_btn`,
  `import-article`, `copy-editor-html`, `quick-save-template`, `save-as-template`,
  `btn-new-msg`, `large-image-popover`, `btn-show-drafts`, `preview-editor`, and
  `sync_official_accounts`.
- These fields are workflow controls for import, copy, save, draft, preview, and sync actions.
  They are not article body structure, reusable component semantics, or platform proof. If copied
  into WeChat, Xiaohongshu, or Zhihu output, they must be blocked even without `_135editor`,
  `data-tools`, style-list metadata, left-library operation chrome, UEditor toolbar chrome, or
  SVG-builder markers.
- This refresh adds a runtime residue gate only. It does not prove WeChat paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, public rendering,
  XHS/Zhihu account upload, or publish success.

2026-06-29 135 ordinary applied image-source refresh:

- CloakBrowser-only refresh restored the center UEditor iframe body selection and clicked a
  visible free style in the 135 ordinary editor. The second click produced a real center-editor
  delta: top-level children changed from 5 to 6, HTML length changed from 22552 to 25922,
  `data-id="174407"` changed from 0 to 1, and image count changed from 12 to 14.
- The inserted block carried 135-hosted image references on both standard `src` and mirrored
  `_src` attributes, alongside image metadata such as `data-width`, `data-ratio`, and `data-w`.
- `src` and `_src` are both source-material dependencies when they point at a 135 material host.
  The runtime detector must report them as `135 third-party image source` even when copied output
  has already lost `_135editor`, `data-tools`, and numeric market style ids.
- This refresh adds a local residue contract only. It does not prove WeChat paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, public rendering,
  XHS/Zhihu account upload, or publish success.

2026-06-29 135 ordinary style-panel navigation refresh:

- CloakBrowser-only refresh read live left-panel style navigation chrome in the same 135 ordinary
  editor page. Observed markers included `style-operate-area`, `style-color-palette`,
  `style-categories`, `style-sorts`, and `news_modal-ys`.
- These fields represent style-library navigation, theme-color controls, and sort controls. They
  are not article content and must not be used as reusable InkForge element source.
- The runtime detector must report them as `135 style panel navigation chrome residue` when they
  appear in WeChat, Xiaohongshu, or Zhihu publishable output, even when copied output lacks
  style-card operation buttons, UEditor toolbar chrome, action rail chrome, hosted image sources,
  or SVG-builder markers.
- This refresh adds a local residue contract only. It does not prove WeChat paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, public rendering,
  XHS/Zhihu account upload, or publish success.

2026-06-29 135 ordinary full-page navigation refresh:

- CloakBrowser-only refresh read full-page chrome around the same 135 ordinary editor page.
  Observed markers included `nav-header`, `top-style-tools`, `site-annoucement-list`,
  `login-menus`, `left-operate-menu`, `left-advertises`, `bg-header`, `category-nav`,
  `left_side__menu`, and `ai_subsystem_nav`.
- These fields represent the site header, announcement strip, account menu, product navigation,
  and left main menu. They are not article content and must not be used as reusable InkForge
  element source.
- The runtime detector must report them as `135 full-page navigation chrome residue` when they
  appear in WeChat, Xiaohongshu, or Zhihu publishable output, even when copied output lacks
  style-panel controls, style-card operation buttons, UEditor toolbar chrome, action rail chrome,
  hosted image sources, or SVG-builder markers.
- This refresh adds a local residue contract only. It does not prove WeChat paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, public rendering,
  XHS/Zhihu account upload, or publish success.

2026-06-29 135 ordinary helper iframe refresh:

- CloakBrowser-only refresh read helper iframe chrome around the same 135 ordinary editor page.
  Observed markers included `ai_polish_box_iframe`, `js_shared_iframe`, `svg_editor_iframe`,
  `ueditor_0`, and `_src="/style-center?...`.
- These fields represent AI/editor helper frames, shared route bridges, SVG editor mounts, the
  UEditor iframe surface, and the 135 style-center browser frame. They are not article content and
  must not be used as reusable InkForge element source.
- The runtime detector must report them as `135 editor helper iframe residue` when they appear in
  WeChat, Xiaohongshu, or Zhihu publishable output, even when copied output lacks full-page
  navigation chrome, style-panel controls, style-card operation buttons, UEditor toolbar chrome,
  action rail chrome, hosted image sources, or SVG-builder markers.
- This refresh adds a local residue contract only. It does not prove WeChat paste, phone preview,
  iframe fidelity, Dark Mode, cover thumbnail, sync, scheduled-send, public rendering,
  XHS/Zhihu account upload, or publish success.

2026-06-09 runtime gate:

- Applied 135/Xiumi evidence now feeds a real export quality detector instead of staying doc-only.
- The detector blocks market-editor authoring residues on all three platforms with platform-specific
  issue ids: `wechat-market-editor-residue`, `xhs-market-editor-residue`, and
  `zhihu-market-editor-residue`.
- Plain prose that says "135编辑器" or "秀米" is not a residue. The gate only matches structural
  HTML, third-party image sources, market class/id/data metadata, `tn-*` authoring attributes, and
  Angular/Vue authoring attributes observed in market editor surfaces.
- The 135 branch also blocks partially cleaned style-library operation chrome such as
  `judgeYangShiJurisdiction(...)`, `similarity_recommend_entry`, style-library `material-id`, and
  `mappaobug` / `EditorStyle` controls, because those are left-panel authoring actions rather than
  article content.
- The 135 branch blocks copied UEditor toolbar/editor chrome such as `edui-toolbar`,
  `edui-for-*`, `edui-wx-input`, and `edui-editor-*`, because those are normal-editor UI controls
  rather than article content.
- The 135 branch blocks copied ordinary-editor action rail chrome such as `editorslide`,
  `copy-editor-html`, `quick-save-template`, `save-as-template`, `preview-editor`, and
  `sync_official_accounts`, because those are editor workflow controls rather than article
  content.
- The 135 branch blocks copied hosted image source references in `src`, `_src`, `data-src`,
  `href`, and `xlink:href`, because they are third-party material dependencies unless the asset is
  re-owned by InkForge and backed by the platform-specific manifest/public-host proof.
- The 135 branch blocks copied left-panel navigation chrome such as `style-operate-area`,
  `style-color-palette`, `style-categories`, `style-sorts`, and `news_modal-ys`, because those are
  editor-side library controls rather than article content.
- The 135 branch blocks copied full-page navigation chrome such as `nav-header`,
  `site-annoucement-list`, `login-menus`, `left-operate-menu`, `left-advertises`,
  `category-nav`, `left_side__menu`, and `ai_subsystem_nav`, because those are site/account/product
  navigation controls rather than article content.
- The 135 branch blocks copied helper iframe chrome such as `ai_polish_box_iframe`,
  `js_shared_iframe`, `svg_editor_iframe`, `ueditor_0`, and `_src="/style-center?...`, because
  those are editor helper surfaces rather than article content.
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

2026-06-23 public-source refresh:

- The WeChat official plugin specification still carries the highest weight for article HTML/SVG
  hard blockers. Keep the documented bad cases as detector expectations or explicit cannot-claim
  notes: opacity-hidden images below SVG backgrounds, `line-height:0`, fixed width/height
  containers, `text-align:start/end`, `touchstart`-only SVG triggers, `<pre>` around ordinary
  prose, invalid/deep article structure, and font-family drift.
- The WeChat official Dark Mode section reinforces that SVG is not recolored like normal HTML
  text. SVG should not be the default carrier for readable prose; if a text-bearing SVG is used,
  it needs an explicit contrast strategy and exact mobile Dark Mode evidence. `data-no-dark`
  protects only the current node, and `!important` remains unsafe.
- WeChat MP editor JSAPI docs describe plugin/editor channels for cover, readiness, content,
  insert HTML, selection, and editor events. Treat this as future credentialed-channel runbook
  material only; it is not evidence of InkForge paste, cover acceptance, sync, scheduled send, or
  publish success.
- The WeChat H5 DarkMode guide is useful for H5 artifacts, but Official Account article output
  still follows the stricter article-editor sanitizer. Do not use the H5 guide to justify scripts,
  media queries, external CSS, or unsupported article CSS in publishable article HTML.
- The doocs/md architecture reference confirms the same broad pipeline family already used by
  InkForge: Markdown source -> marked/custom extensions -> juice inline CSS -> DOMPurify sanitize
  -> themed HTML preview/copy. It is an architecture benchmark, not a runtime dependency or
  platform proof.
- Xiaohongshu public refresh found the official creator entry, but public detailed image-card
  specs remain login-gated in this pass. Keep XHS dimensions/manifest rules as conservative local
  guidance and require real platform upload/preview/publish evidence before claiming success.
- Zhihu public refresh found community/open-source references rather than an official hard spec.
  Keep the clean Markdown plus image/public-host proof model; do not close upload, platform
  preview, public rendering, or publish gates from community guidance.

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

2026-06-23 CloakBrowser applied SVG/H5 DOM refresh:

- 135 SVG editor trial effects can be inserted into the center canvas after the material prompt is
  resolved. The observed applied canvas used five `section + svg` blocks. Each wrapper cleared
  `font-size`, `line-height`, `margin`, and `padding`, centered the block, and used SVG `viewBox`
  geometry with image backgrounds sized slightly above 100% to close seams. The right parameter
  panel exposed image-slot requirements, trigger-zone overlap warnings, minimum trigger-area
  guidance, animation delay, and fade duration.
- InkForge should translate the 135 pattern into source-owned `safe-zero-wrapper`,
  `background-svg-frame`, `image-slot-manifest`, `trigger-zone-manifest`, `motion-timing`, and
  `static/raster fallback` rules. It must not copy 135 template HTML, CDN assets, editor classes,
  ids, or authoring metadata.
- 2026-06-27 CloakBrowser center-canvas wrapper follow-up: copied `artilce-list` must fail as
  `135 SVG editor article list wrapper residue` even when shell children, canvas ids, known
  `data-name` values, material controls, and trigger/layout wrappers are absent. Generic
  `article-item` remains insufficient.
- 2026-06-27 CloakBrowser center-canvas anchor follow-up: copied `articles-anchor` must fail as
  `135 SVG editor articles anchor residue` even when `artilce-list`, shell children, canvas ids,
  known `data-name` values, material controls, and trigger/layout wrappers are absent. Generic
  `article-item` remains insufficient.
- 2026-06-27 CloakBrowser layout child-control follow-up: copied `gap_input` must fail under the
  existing `135 SVG editor layout control residue` label even when `block-spacing`, `block-gap`,
  `gap-item-wrapper`, `article-item__editing`, Ant slider controls, shell wrappers, and canvas
  markers are absent.
- 2026-06-27 CloakBrowser free-trial effect follow-up: clicking live 135 SVG free-trial effects
  and choosing no bundled design material exposed additional builder metadata values:
  `autobounceflipcard`, `multipletouchmovetodismissimgs`, `svgscrollswithgruopsslide`,
  `clickchangecoverwithscroll`, and `clickredpakcetwithscroll`. These values must fail under
  `135 SVG builder effect data-name` without relying on canvas or shell wrappers.
- 2026-06-27 CloakBrowser free-trial second-batch follow-up: clicking the remaining visible 135
  SVG free-trial effects exposed `devicephotos`, `clickopenverticalandretainimg`,
  `slidecardsexpand`, `scrollwithclickchangeimage`, `clickpalywithsacleimageandspread`,
  `clickspreadtrackchangeimage`, `clicktrackchangeimage`,
  `touchmoveshowimagewithleakagecarousel`, `autoshowimagewithleakagecarousel`,
  `clickshowimagewithleakagecarousel`, `marqueeclickpopimage`,
  `clickplaygifwithhorizontalscroll`, `clickslideandclickswitchpop`, `doubleclickimage`,
  `clickscaleremovechangeimgs`, `clickcoverandmoveimages`, `clickchooseonepopup`,
  `clickrotatechangeimgswithtopandbgchange`, and `chooseonefromtwoclickimagewithcallback`.
  These values must fail under `135 SVG builder effect data-name` as exact metadata attributes.
- Xiumi's SVG category exposed a broad interaction taxonomy: basic SVG, image carousel,
  click-expand, path animation, draw/lottery, playful slide, switch transition, branch transition,
  slide trigger, parallax move, click switch, flip, zoom, quiz, barrage text, click show/change/open/
  disappear/pop/enlarge/print/jump/play, long-press switch, region trigger, falling click, and
  click-plus-auto.
- After a visible Xiumi SVG card was clicked, the center document used a nested
  `article -> section -> top-level component -> SVG layout` tree. The sampled component had
  multiple inline SVG nodes, nested SVG layout nodes, `rect`, `foreignObject`, text paragraphs, and
  SMIL `animate` rows. Image layers were represented as SVG backgrounds from Xiumi static assets,
  while text labels were embedded through `foreignObject`.
- InkForge should treat Xiumi `foreignObject` text and SMIL animation as high-risk WeChat features:
  they can inspire source-owned click-reveal/fade rules, but production output needs readable HTML
  fallback, image fallback, exact PC paste evidence, phone preview evidence, and Dark Mode evidence
  before any availability claim.

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
| `xhs-data-card` | 小红书 | 数据表、对比、指标、图表摘要 | card-system | medium-high | none | image page | long image | `local-browser` | 2026-06-21 本地 3 页 CloakBrowser raster pack + manifest 通过；目录本地可用并映射到现有 `xhs-tech` / 科技数码 preset，平台上传/预览/发布仍需另证 |
| `xhs-long-report` | 小红书 | 长文、宽表、分段报告 | fallback-system | medium | none | long image | image page | `local-browser` | 2026-06-21 本地 4 页 CloakBrowser raster pack + manifest 通过；目录本地可用并映射到现有 `xhs-simple` / 极简高级 preset，平台上传/预览/发布仍需另证 |
| `xhs-market-rich-card-fallback` | 小红书 | 市场富卡片、H5/互动降级、图文层转译 | fallback-system | medium | none | image page | long image | `local-browser` | 2026-06-21 本地 4 页 CloakBrowser raster pack + manifest 通过；目录本地可用并映射到现有 `xhs-nature` / 自然清新 preset，平台上传/预览/发布仍需另证 |
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
- 135 SVG trigger hot-area overlay wrappers such as `block-img__trigger`, `edit-trigger`,
  `edit-trigger__switch`, `trigger__ajuster`, `trigger_tip`, and direction handles such as
  `ajuster nw` must fail as
  `135 SVG trigger hot-area overlay residue`, not only as the broader builder-canvas residue.
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
- Trigger hot-area overlay markers are source-specific residue. `block-img__trigger`,
  `edit-trigger`, `edit-trigger__switch`, `trigger__ajuster`, `trigger_tip`, and `ajuster`
  handles must fail as `135 SVG trigger hot-area overlay residue` even when `app-content-canvas`,
  known `data-name` values, hosted material, and canvas shell markers are absent.
- 2026-06-20 CloakBrowser shell refresh: the active 135 SVG editor free-trial page exposed center
  shell wrappers such as `content-canvas`, `content-background`, `content-inner`, `block-inner`,
  `block-img__inner`, `placeholder__help`, `placeholder__icon`, `article-item__inner`,
  `article-item__label`, and `article-item__del`. Specific shell markers are blocked as
  `135 SVG editor shell residue` if copied into WeChat/XHS/Zhihu output.
- 2026-06-26 135 base-shell TDD closeout: copied center shell roots using
  `content-canvas content-background content-inner`, `block-inner`, or exact `block-img` now fail
  as `135 SVG editor shell residue` even when image-slot helpers, placeholders, article-item
  chrome, known effect ids, trigger overlays, hosted materials, and `svg:135` styles are absent.
  Generic `block` alone remains insufficient.
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
  `ant-switch-checked` trigger switches. Trigger overlay and switch controls now have
  source-specific residue labels; they remain schema inputs only and must not be copied into
  publishable output.
- 2026-06-21 CloakBrowser SVG background-style refresh: a material-included 135 free-trial layer
  exposed a tall background SVG using `background-attachment`, `background-position`,
  `background-repeat`, `background-size:100.1% 100.1%`, `margin-top:-1px`,
  `pointer-events:none`, `user-select:none`, `vertical-align:top`, `width:100%`, and the
  135-specific inline style marker `svg:135`. That marker must fail as
  `135 SVG background style marker` if copied into WeChat/XHS/Zhihu publishable output. The
  layout idea may only be rewritten into an InkForge-owned image-slot/fallback manifest plus a
  layout report.
- 2026-06-22 post-reboot CloakBrowser recheck: the live SVG editor again accepted a visible
  `免费试用` click, the material-included confirmation, and then inserted an active
  `coverclickmovewithspread` block. The sampled block used the same zero-font/zero-line-height
  section and background-only `viewBox="0 0 1080 1920"` SVG with
  `background-size:100.1% 100.1%`, `display:inline-block`, `margin-top:-1px`,
  `pointer-events:none`, `svg:135`, `user-select:none`, `vertical-align:top`, and `width:100%`.
  This is reproducible market-rule evidence for gap sealing and trigger-zone schema design, not
  reusable source or platform proof.
- 2026-06-22 same-day material-confirmation detail: the `免费试用` path displayed a blocking
  confirmation asking whether to include default design material. Choosing the material-included
  branch exposed right-panel fields for cover image slots, `DIY设计图片 1080 x 1920`, cover exit
  direction, cover animation duration, expand animation duration, expanded-content editing,
  gap/spacing controls, and expanded background guidance. InkForge should model this as
  source-owned image-slot manifest + trigger/motion parameter schema + expanded-content fallback,
  never as copied 135 material or an implicit public image-host proof.
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
  source-specific Xiumi component-binding diagnostics if copied into WeChat/XHS/Zhihu output.
- 2026-06-22 executable fallback-catalog contract refresh: the market SVG/H5/rich-layout family is
  visible in the runtime style catalog by platform-specific proof state. WeChat
  `wechat-market-svg-h5-fallback-matrix` and Zhihu `zhihu-market-rich-layout-fallback` remain
  blocked; XHS `xhs-market-rich-card-fallback` is local-browser available after the source-owned
  image-page/manifest pack passed. The XHS row still does not satisfy upload, preview, public
  article, or publish proof, and it may not map to a selectable preset until a real InkForge
  preset/export-option mapping exists.
- 2026-06-21 Xiumi SVG recovery-modal recheck: the live v5 paper editor exposed the SVG taxonomy
  and a readable `.tn-editing-panel`, but an unsaved-draft recovery confirmation blocked safe
  application proof. Do not automate restore/cancel decisions. Treat this as taxonomy and blocker
  evidence only until an operator safely clears the account/editor state and the center editor
  mutation is read back.
- 2026-06-22 post-reboot Xiumi Studio recheck: the fixed CloakBrowser profile opened Studio v5 but
  stayed on the editor-selection/login surface after `图文排版` was clicked. This is current
  login-state blocker evidence only; do not record it as applied center-paper DOM evidence.
  Existing Xiumi residue rules continue to rely on prior applied-editor runs and public-source
  cross-checks.
- 2026-06-22 same-day direct paper-editor recheck: navigating directly to the v5 paper editor
  opened a new untitled article. The visible authoring surface exposed top actions `打开`, `预览`,
  `保存`, `导出`, `更多`, base formatting fields for font size, line height, letter spacing, and
  default image state, plus left categories `图文模板`, `图片素材`, `图文收藏`, `剪贴板`, `我的图库`,
  `团队素材`, `音视频`, `样刊模板`, and filter tabs `标题`, `卡片`, `图片`, `布局`, `SVG`, `组件`.
  The visible template cards were not literal center SVG. They were nested
  `tn-tpl-item` / `tn-from-house-paper-cp` / `section.tn-comp-pin.tn-comp-style-pin` trees with
  inline `display:flex`, `flex-flow`, `line-height:0`, `margin`, `transform`, `opacity`, and small
  image motifs. Use this as Xiumi section-rhythm and component-tree learning; all `tn-*`, `ng-*`,
  template renderer, and hosted material markers remain publish-blocking residue.
- 2026-06-22 executable residue-gate follow-up: the live 135 SVG material-path observation now has
  a runtime detector row for copied material/parameter panel classes such as `editor-bar`,
  `editor-img__block`, `editor-spread__edit`, and `editor-background`. The visible Xiumi
  template-card tree is covered by a dedicated fixture using `tn-tpl-item`,
  `tn-from-house-paper-cp`, and `section.tn-comp-pin.tn-comp-style-pin`. These fixtures prove only
  InkForge's local no-copy gate on WeChat/XHS/Zhihu publishable output; they do not prove WeChat
  paste, mobile trigger behavior, Dark Mode, cover thumbnail acceptance, sync, upload, public
  preview, scheduled send, or publish success.
- 2026-06-26 CloakBrowser material-panel child-control follow-up: the 135 right-side settings panel
  exposed source-specific child controls such as `edit-image`, `image__title-bar`,
  `edit-add-images`, `edit-add-btn`, `edit-add__title`, `edit-animate`,
  `edit-animate__title`, `edit-animate__opt`, and `animate__dur`. Treat these as image-slot and
  motion-parameter inputs only after rewriting them into InkForge-owned schemas; copied controls
  remain `135 SVG material panel residue`.
- 2026-06-22 applied Xiumi SVG sample follow-up: clicking the live `SVG` category expanded the
  library from 23 to 43 template items and exposed the same mobile-interaction taxonomy in the
  current editor. Clicking the first visible SVG image-gallery sample changed the center
  `.tn-editing-panel` from 21 to 51 `tn-comp` nodes, 9 to 27 `tn-cell` nodes, 78 to 81 images, and
  1 to 2 contenteditable cells while center literal SVG stayed `0`. The applied center carried
  `tn-animate`, `tn-link`, `tn-uuid`, `opera-tn-ra-*`, `tn-image-presenter raw-image`,
  `tn-content-overlap`, `ui-sortable`, `ui-slider`, Angular runtime attributes, and hosted
  `statics.xiumi.us` references. This is strong applied-editor DOM evidence for InkForge-owned
  schema/fallback design, and still residue if copied into publishable output.
- 2026-06-29 Xiumi hosted background refresh: clicking a live Xiumi v5 paper template inserted
  center-canvas content whose visual title block used inline `background-image:url(...)` pointing
  at `statics.xiumi.us` with an OSS transform query. Treat this as the same external market-editor
  asset dependency as `img` / `source` hosted materials. It must fail under
  `Xiumi third-party image source` until rewritten into InkForge-owned local/public asset records.
- 2026-06-29 135 SVG trial coverage audit: clicking a live 135 SVG editor `试用` effect selected a
  center block and exposed effect-specific right-panel controls. The observed `data-name`,
  `app-content-canvas`, `content-*`, `block-*`, `edit-placeholder`, `placeholder__*`,
  `editor-bar-*`, `editor-img__*`, `edit-image`, `edit-add-*`, `edit-animate__*`, and
  `animate__dur` markers are already covered by existing 135 builder, shell, material-panel, and
  image-slot diagnostics. Vue scoped `data-v-*` attributes remain non-blocking by themselves
  because they are too broad without a source-specific 135 anchor.
- 2026-06-21 Xiumi template-renderer refresh: the live v5 paper editor exposed the template
  injection/preview pipeline in the visible template list and hidden controls. Markers included
  `tplLib.onTemplateClicked`, `tpl2BoxClasses`, `tpl2PresentType`, `tn-tpl-pose-fit-box`,
  `renderer_accelerate`, and `validateImageTypeInHtml`. These are Xiumi authoring/rendering
  pipeline residue, not portable article HTML. They must fail as
  `Xiumi template renderer pipeline residue` if copied into WeChat/XHS/Zhihu output.
- 2026-06-29 Xiumi Angular input/source/event refresh: the live v5 paper editor exposed
  class-cleaned Angular authoring attributes including `ng-keydown`, `ng-keyup`, `ng-src`,
  `ng-mousedown`, `ng-mouseup`, `ng-mouseenter`, `ng-copy`, `ng-readonly`, and
  `ng-transclude`. These are runtime binding metadata, not article behavior. They remain under
  the existing `Angular/Vue authoring attribute` residue label and must be rewritten as
  InkForge-owned source behavior or omitted before any WeChat/XHS/Zhihu output is publishable.
- 2026-06-29 Xiumi Hammer gesture refresh: the live v5 paper editor exposed class-cleaned
  `hm-pan` gesture directives in addition to already-covered `hm-panstart`, `hm-panend`,
  `hm-panmove`, `hm-recognizer-options`, `stop-propagation`, and `tn-attach-to`. Treat these as
  editor-side gesture routing metadata only. They remain under the existing
  `Xiumi selection overlay control residue` label and cannot be copied into publishable output as
  proof of mobile drag/click fidelity.
- 2026-06-29 Xiumi style-binding refresh: the live v5 paper editor exposed class-cleaned
  `tn-style` attributes. These are editor-side style binding metadata, not ordinary publishable
  inline style and not a portable style source. They remain under the precise
  `Xiumi style binding metadata residue` label and must be translated into InkForge-owned style
  schema or removed before publishable output is allowed.
- 2026-06-29 Xiumi Angular link/dropzone refresh: the live v5 paper editor exposed class-cleaned
  Angular binding attributes including `ng-href`, `ng-dropzone`, `ng-dropzone-handler`, and
  `ng-dropzone-options`. These are editor-side link and drag/drop upload bindings, not ordinary
  publishable `href`, upload proof, public-host proof, or credentialed-channel proof. They remain
  under the existing `Angular/Vue authoring attribute` residue label.
- 2026-06-29 Xiumi text-input completion refresh: the live v5 paper editor exposed
  `tn-text-input-done-for` alongside already-covered `tn-text-input-begin` and
  `tn-text-input-done`. This is editor-side text editing event binding metadata, not article text,
  typography fidelity proof, or paste proof. It remains under the existing
  `Xiumi font and format control residue` label.
- 2026-06-29 Xiumi button-state refresh: the live v5 paper editor exposed class-cleaned
  `ng-checked`, `uib-btn-radio`, and `uib-btn-checkbox` attributes. These are Angular/UI
  Bootstrap selection and toggle bindings, not ordinary checkbox/radio semantics, form-control
  fidelity proof, or credentialed-channel proof. They remain under the existing
  `Angular/Vue authoring attribute` and `Xiumi UI Bootstrap control directive residue` labels.
- 2026-06-29 Xiumi UI Bootstrap tab-content refresh: the live v5 paper editor exposed
  `uib-tab-content-transclude` alongside already-covered UI Bootstrap tab heading, dropdown,
  tooltip, and button-state directives. This is editor-side tab panel plumbing, not publishable
  article tab semantics, mobile interaction proof, or credentialed-channel proof. It remains under
  the existing `Xiumi UI Bootstrap control directive residue` label.
- Effects requiring plugin, sync, or enhanced upload remain credentialed-channel work. Local
  browser evidence, market listing evidence, and applied-editor-element evidence are insufficient.

Evidence:
- `prompts/0601/evidence/market-editor-cloakbrowser-svg-deep-pass-20260620.txt`
- `prompts/0601/evidence/market-editor-trigger-overlay-residue-contract-20260620.txt`
- `prompts/0601/evidence/135-svg-trigger-hot-area-overlay-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-svg-layer-slot-residue-contract-20260620.txt`
- `prompts/0601/evidence/xiumi-svg-gallery-state-wrapper-residue-20260620.txt`
- `prompts/0601/evidence/xiumi-component-binding-attribute-residue-20260620.txt`
- `prompts/0601/evidence/135-svg-editor-shell-residue-contract-20260620.txt`
- `prompts/0601/evidence/135-svg-editor-layout-control-residue-contract-20260620.txt`
- `prompts/0601/evidence/135-svg-free-trial-cloakbrowser-recheck-20260621.txt`
- `prompts/0601/evidence/135-background-only-svg-compatibility-fixture-20260620.txt`
- `prompts/0601/evidence/market-live-recheck-135-xiumi-20260622.txt`
- `prompts/0601/evidence/xiumi-applied-svg-sample-cloakbrowser-20260622.txt`
- `prompts/0601/evidence/market-fallback-catalog-contract-20260620.txt`
- `prompts/0601/evidence/xiumi-svg-recheck-recovery-modal-blocker-20260621.txt`
- `prompts/0601/evidence/market-editor-cloakbrowser-svg-pipeline-residue-refresh-20260621.txt`
- `prompts/0601/evidence/xiumi-angular-input-source-event-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-hammer-pan-directive-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-style-binding-metadata-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-angular-link-dropzone-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-text-input-done-for-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-angular-uib-button-state-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-uib-tab-content-transclude-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-css-background-image-source-20260629.txt`
- `prompts/0601/evidence/135-svg-trial-coverage-audit-20260629.txt`
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
- The local-conflict blocker must only count local committed-evidence and catalog conflicts.
  Missing phone preview, authenticated editor, credentialed channel, public host, scheduled-send,
  and platform publish rows remain in their dedicated blocker buckets even though they still make
  the overall release unclaimable.
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

Current 2026-06-22 snapshot after the XHS local catalog-open follow-up:
- `status=blocked-by-external`
- `canClaimComplete=false`
- `localManifestCount=20`
- `wechatPcManifestCount=2`
- `combinedManifestCount=22`
- `combinedIssueCount=13`
- `cannotClaimSteps=29`
- `phoneOpenSteps=4`
- `externalDependencyOpenSteps=14`
- `unsafeToAutomateOpenSteps=13`
- `mutatingOpenSteps=13`
- `blockerCount=4`
- no local-conflict blocker remains
- phone preview platform counts: `wechat=4`
- external dependency platform counts: `wechat=7`, `xiaohongshu=2`, `zhihu=5`
- unsafe-to-automate platform counts: `wechat=7`, `xiaohongshu=2`, `zhihu=4`
- Missing `zhihu-artifact-manifest` rows that require public/platform image hosts remain
  unclaimable, but they are not displayed as local artifact chores in the committed release
  blocker.
- Aggregate `unit-test-coverage` and `local-browser-rendering` gaps whose remaining missing rows
  are entirely blocked catalog choices no longer create separate local requirement-missing
  conflicts.

Evidence:
- `prompts/0601/evidence/style-proof-release-blocker-counts-20260622.txt`
- `prompts/0601/evidence/style-proof-release-local-conflict-scope-20260622.txt`
- `prompts/0601/evidence/style-proof-release-blocked-choice-only-scope-20260622.txt`
- `prompts/0601/evidence/xhs-local-catalog-open-20260622.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 33.

## 12. 2026-06-22 ExportModal Style Choice Notice Localization

The runtime style catalog may keep terse technical blocker strings for tests and developer reports,
but ExportModal is an operator surface. Known catalog blocker and reason strings must be mapped to
compact Chinese copy before they appear inside style cards.

Rules:
- Localize only in the UI display layer. Do not mutate `PLATFORM_STYLE_CHOICES`, availability
  decisions, style proof manifests, release-gate reports, or execution runbooks.
- Keep blocker meaning intact: translated notices still mean "missing proof" or "blocked until
  external proof exists", not "verified".
- Unknown future catalog strings should remain visible as-is until a reviewed localization is
  added.
- Style-card fallback labels and style-catalog preflight blocked reasons are part of the same
  operator surface. Render fallback output as `降级：...` and pass preflight `reason` strings
  through the same localized notice mapper before display.
- Narrow UI checks must cover style-card details at mobile width because these cards contain dense
  evidence summaries, blocker chips, and execution-runbook counts.

Evidence:
- `prompts/0601/evidence/style-choice-notice-localization-20260622.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 34.

## 13. 2026-06-22 XHS Style Choice Application Mapping

Three Xiaohongshu choices with committed source-owned raster/manifest proof are now mapped to
existing presets so operators can select them in the real ExportModal:

- `xhs-data-card` -> `xhs-tech` / `科技数码`
- `xhs-long-report` -> `xhs-simple` / `极简高级`
- `xhs-market-rich-card-fallback` -> `xhs-nature` / `自然清新`

Rules:
- The mapping is an application affordance only. It reuses existing Xiaohongshu presets and does
  not add a new upload, sync, public-host, scheduled-send, preview, or publish path.
- A choice must stay disabled when it is either unusable by catalog evidence or available but lacks
  a real `STYLE_CHOICE_APPLICATIONS` entry.
- The visible style-catalog preflight row must identify the selected style and the real preset id.
- `platform-publish`, account upload, platform preview, public URL acceptance, scheduled send,
  public article rendering, and publish success remain unclaimable until exact external evidence
  exists.

Evidence:
- `prompts/0601/evidence/xhs-style-choice-application-mapping-20260622.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 35.

## 14. 2026-06-23 Public Source Refresh Boundary

This refresh updates the public-source layer without changing renderer behavior, local evidence
manifests, style availability, account workflows, browser state, or platform proof status.

Rules:
- WeChat official editor-plugin and Dark Mode documents remain the primary public authority for
  article HTML/SVG blockers.
- WeChat MP editor JSAPI documentation may inform future credentialed-channel checklists, but it
  must not be treated as successful paste, sync, cover, scheduled-send, preview, or publish proof.
- WeChat H5 DarkMode guidance applies to H5/web artifacts. Article exports still need the stricter
  Official Account editor sanitizer, inline-style, no-script, and no-external-CSS contract.
- doocs/md remains an OSS architecture reference for Markdown parsing, CSS inlining, sanitization,
  and themed HTML output. It must not be imported as a second renderer or cited as platform proof.
- Xiaohongshu's public creator entry being login-gated means public third-party size guides remain
  weak evidence. Keep real XHS account upload, platform preview, scheduled send, public rendering,
  and publish proof as external gates.
- Zhihu community/open-source Markdown guidance may support conservative local cleanup decisions,
  but official public-host, account upload, platform preview, public rendering, and publish gates
  stay open until exact platform evidence exists.

Evidence:
- `prompts/0601/evidence/public-source-refresh-20260623.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 42.

## 15. 2026-06-23 WeChat Market SVG/H5 Fallback Matrix Refresh

The 135/Xiumi live DOM study is now reflected in the executable WeChat fallback catalog without
changing platform proof status.

Rules:
- `wechat-market-svg-h5-fallback-matrix` stays blocked and unmapped from style applications.
  It is a visible capability family and fallback checklist, not a selectable WeChat export style.
- The runtime catalog may list the observed family map: background SVG shell, click expand, click
  show/hide, click switch, slide trigger, image carousel, path animation, parallax, long press,
  region trigger, card/title/divider/cover structures, text marquee, quiz/game, typed image-slot
  manifests, normalized trigger-zone manifests, external H5 handoff boundary, and H5 handoff.
- 135 background-SVG shells are translated only into source-owned layout reports, image-slot
  manifests, trigger-zone manifests, motion schema, static fallback, or raster fallback.
- Xiumi SVG/title/card samples that expose wrapper trees or image/layer/action structures cannot
  become WeChat inline-SVG proof when the center readback has no visible inline SVG.
- External H5 pages, vendor H5 packages, and plugin/sync handoffs remain publish-checklist states
  until the exact InkForge artifact has platform preview or publish proof.
- Detector blockers must keep zero-line-height, fixed-size containers, class/id dependency,
  transparent image under SVG/background layers, unsafe SVG constructs, touchstart-only triggers,
  and layout-report-required gates visible to reports.
- This refresh does not prove WeChat PC editor paste, phone preview, mobile interaction, Dark Mode,
  cover thumbnail acceptance, credentialed sync, public preview, scheduled send, public rendering,
  XHS/Zhihu upload, or publish success.

Evidence:
- `prompts/0601/evidence/market-live-dom-135-xiumi-20260623.txt`
- `prompts/0601/evidence/wechat-market-svg-h5-fallback-matrix-20260623.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` section 54.

## 16. 2026-06-25 Market Editor Residue Rule Tightening

The applied 135/Xiumi DOM learning has been converted into additional executable residue blockers.
These rules tighten static publishability checks only; they do not change platform proof status,
style availability, account workflows, browser state, sync, upload, scheduled-send, or publish
claims.

Rules:
- 135 SVG trigger hot-area overlays such as `block-img__trigger`, `edit-trigger`,
  `edit-trigger__switch`, `trigger__ajuster`, `trigger_tip`, and `ajuster` resize handles must
  fail independently of broader SVG builder canvas markers.
- 135 SVG trigger switch controls such as `ant-switch`, `ant-switch-checked`, `ant-switch-inner`,
  and `ant-switch-handle` must fail independently of trigger overlay geometry and broader SVG
  builder canvas markers.
- 135 SVG editor toolbar controls such as `editor-toolbar`, `editor-toolbar__tool`,
  `toolbar-tool`, `bar-item`, `bar-item__label`, `delete-dropdown_entry`,
  `tool-dropdown_entry`, and `team_btn` must fail independently of canvas, shell, layout, or
  material-panel wrappers.
- 135 SVG editor user/header chrome such as `header-user`, `user-info noheader`,
  `user-info__head`, and `user-info__nickname` must fail independently of toolbar classes,
  sidebar/navigation wrappers, material cards, shell wrappers, layout controls, material-panel
  controls, or canvas wrappers. Generic user, avatar, nickname, profile, or account wording is not
  enough; the detector stays anchored to 135 SVG editor header/user class names and never records
  real account text in committed evidence.
- 135 SVG editor brand/header menu chrome such as `header__logo`, `header__link menu` paired with
  `/svgeditor/`, and `img/logo_name.*.png` must fail independently of user/header chrome,
  work-title controls, toolbar classes, sidebar/navigation wrappers, material cards, shell
  wrappers, layout controls, material-panel controls, or canvas wrappers. Generic header, logo,
  menu, home, brand, link, or editor wording is not enough; `header__link menu` only counts when it
  is tied to the 135 SVG editor route.
- 135 SVG editor work-title edit controls such as `work-title`, `work-title__editing`, and
  `edit-text__input` paired with the live placeholder `作品标题` must fail independently of
  header/user chrome, toolbar classes, sidebar/navigation wrappers, material cards, shell wrappers,
  layout controls, material-panel controls, or canvas wrappers. Generic title, work, edit, input,
  placeholder, or `作品标题` text is not enough; the detector stays anchored to 135 SVG editor title
  control class names.
- 135 SVG editor work-tool quick-entry chrome such as `work-tool`, `work-tool-signature fixed`,
  `ant_btn_panel`, `idea-entry-quick`, `entry-popover`, and `btn-entry ant-btn` must fail
  independently of header/logo/menu chrome, user/header chrome, work-title controls, toolbar
  classes, sidebar/navigation wrappers, material cards, shell wrappers, layout controls,
  material-panel controls, or canvas wrappers. Generic work, tool, entry, history, signature,
  quick, panel, button, or editor wording is not enough, and generic `entry-list`, `entry-item`,
  `history`, `button`, or `ant-btn` is never a standalone trigger.
- 135 SVG sidebar icon/help chrome such as `side-tab-menu__icon-box`,
  `side-tab-menu__icon`, `side-bar-banner-wrap`, and `sidebar-help black` must fail
  independently of sidebar/navigation wrappers, toolbar classes, material search controls,
  material-panel controls, header/user chrome, work-title controls, work-tool quick-entry chrome,
  shell wrappers, layout controls, or canvas wrappers. Generic sidebar, icon, help, banner,
  active, work, upload, material, or editor wording is not enough, and `side-bar-banner-wrap`
  must not be misreported as the older sidebar/navigation label.
- 135 SVG sidebar icon asset paths such as `img/sidebar-work-active.1e2c6eb1.png` must fail
  independently of sidebar icon/help classes, sidebar/navigation wrappers, toolbar classes,
  material search controls, material-panel controls, header/user chrome, work-title controls,
  work-tool quick-entry chrome, shell wrappers, layout controls, or canvas wrappers. Generic
  sidebar/icon/image wording and generic data images are not enough; the rule stays anchored to
  source-specific relative `img/sidebar-*.png` resources.
- 135 SVG sidebar/navigation controls such as `side-bar`, `side-bar-wrap`,
  `side-bar-menu-wrap`, `side-tab-menu`, `side-tab-menu__content`,
  `side-tab-menu__label`, `side-tab-content`, `side-bar-content-wrap`, and `tab-special` must
  fail independently of toolbar, shell, layout, material-panel, or canvas wrappers. The `side-bar`
  marker is a full class-name match, not a prefix match for icon/banner helpers.
- 135 SVG material search child controls such as `search__wrap`, `search__input`,
  `search-area`, `search-input`, and `search-hint` must fail when paired with the live search
  placeholder `请输入关键词搜索` or search/help icon markers. This catches cleaned child-only
  search controls without relying on `tab-special__searchbar`, sidebar wrappers, filters, or
  material cards. Generic search wording, `search-input` alone, and Ant icon classes alone remain
  out of scope.
- 135 SVG material component path attributes such as the exact
  `file_path="sidebar/tabs/ItemElement"` value must fail independently of material list-card
  classes, sidebar/navigation wrappers, filters, category wrappers, search controls, loader state,
  purchase controls, toolbar controls, shell wrappers, layout controls, material-panel controls,
  known 135 `data-name` values, hosted media, trigger overlays, Ant switch controls, `svg:135`
  styles, or `background-size:100.1%` background shells. Generic `file_path`, path, sidebar, tab,
  item, or component wording is not enough; the detector stays anchored to that exact 135 SVG
  material component path.
- 135 SVG editor center-canvas article-list wrappers such as `artilce-list` must fail
  independently of shell wrappers, builder canvas markers, layout controls, toolbar classes,
  sidebar/navigation wrappers, material controls, material-panel controls, trigger overlays,
  known `data-name` values, hosted media, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells. Generic `article-item` is not a standalone trigger.
- 135 SVG editor center-canvas anchor wrappers such as `articles-anchor` must fail independently
  of `artilce-list`, `article-item__inner/label/del`, `articles_pop`, shell wrappers, builder
  canvas markers, layout controls, toolbar classes, sidebar/navigation wrappers, material
  controls, material-panel controls, trigger overlays, known `data-name` values, hosted media,
  Ant switch controls, `svg:135` styles, or `background-size:100.1%` background shells. Generic
  `article-item` is not a standalone trigger.
- 135 SVG editor gap/spacing child controls such as `gap_input` must fail under the existing
  layout-control residue independently of `block-spacing`, `block-gap`, `gap-item-wrapper`,
  `article-item__editing`, Ant slider controls, shell wrappers, builder canvas markers, toolbar
  classes, sidebar/navigation wrappers, material controls, material-panel controls, trigger
  overlays, known `data-name` values, hosted media, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- 135 SVG builder effect metadata such as `autobounceflipcard`,
  `multipletouchmovetodismissimgs`, `svgscrollswithgruopsslide`,
  `clickchangecoverwithscroll`, and `clickredpakcetwithscroll` must fail under
  `135 SVG builder effect data-name` independently of `app-content-canvas`, `content-wrapper`,
  `block-img__content`, `block-img__default`, `edit-placeholder`, `placeholder__name`, editor
  shell wrappers, trigger overlays, layout controls, toolbar classes, sidebar/navigation wrappers,
  material controls, material-panel controls, hosted media, Ant switch controls, `svg:135` styles,
  or `background-size:100.1%` background shells.
- 135 SVG builder effect metadata second-batch values such as `devicephotos`,
  `clickopenverticalandretainimg`, `slidecardsexpand`, `scrollwithclickchangeimage`,
  `clickpalywithsacleimageandspread`, `clickspreadtrackchangeimage`,
  `clicktrackchangeimage`, `touchmoveshowimagewithleakagecarousel`,
  `autoshowimagewithleakagecarousel`, `clickshowimagewithleakagecarousel`,
  `marqueeclickpopimage`, `clickplaygifwithhorizontalscroll`,
  `clickslideandclickswitchpop`, `doubleclickimage`, `clickscaleremovechangeimgs`,
  `clickcoverandmoveimages`, `clickchooseonepopup`,
  `clickrotatechangeimgswithtopandbgchange`, and `chooseonefromtwoclickimagewithcallback` must
  fail under `135 SVG builder effect data-name` independently of canvas wrappers, shell wrappers,
  trigger overlays, layout controls, toolbar classes, sidebar/navigation wrappers, material
  controls, material-panel controls, hosted media, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- 135 SVG material list-card controls such as `item-element`, `item-element_id`,
  `item-element__box`, `item-content__tag`, `item-element__title`, `item-element__price`,
  `item-line`, `element-actions__wrap`, `element-price__wrap`, `item-summary-tag`, and
  `item-collect-tag` must fail independently of sidebar, toolbar, shell, layout,
  material-panel, or canvas wrappers.
- 135 SVG material filter controls such as `menu-filter`, `menu-filter__container`,
  `menu-filter__group`, `menu-level__group`, `menu__warp_btn`, `level_entry`, `svg-types`,
  `tab-switch_btn`, `special-tags__left`, `special-tags__center`, `special-tags__right`,
  `special-tags__cover`, `tab-visible_cat`, `preview-guide`, `usage-history`, and
  `modal-entrance` must fail independently of sidebar, list-card, toolbar, shell, layout,
  material-panel, or canvas wrappers. Generic search/filter/list wording is not enough; the rule
  stays anchored to source-specific 135 SVG editor class/id names.
- 135 SVG material category wrappers and activity entrances such as `tab-special__functions`,
  `tab-special__tags`, `tab-special__tap`, `tab-special__list`, `tab_special_functions`,
  `tab-menufilter`, `filter_category`, `filter-list__fold`, `svgMubanYaoqingEnter`, and
  `img-preview-hide` must fail independently of the material filter, material list-card, sidebar,
  toolbar, shell, layout, material-panel, or canvas wrappers. Generic `item`, `active`, `more`,
  `new`, `search-input`, and `list-item` selectors remain out of scope.
- 135 SVG material preview asset paths such as `img/img-preview-show.0471d3a6.svg` and
  `img/img-preview-hide.bff8f2cc.svg` must fail independently of preview classes,
  material-category wrappers, material-filter controls, sidebar icon assets, material cards,
  shell wrappers, layout controls, or canvas wrappers. Generic preview/image/show/hide wording and
  generic SVG images are not enough; the rule stays anchored to source-specific relative
  `img/img-preview-show|hide` resources.
- 135 SVG material action asset pairs such as `img/message.6ba842d4.svg` and
  `img/collect.645fe3be.svg` must fail independently of material-list card classes, preview
  assets, category wrappers, filters, sidebar icon assets, toolbar, shell, layout, or canvas
  wrappers. Generic message/collect/action/icon wording and single generic SVG icons are not
  enough; the rule stays anchored to a nearby pair of source-specific relative `img/message` and
  `img/collect` resources.
- 135 SVG material category helper asset pairs such as `img/hot.74ee6ac4.png` and
  `img/icon-up2.e0ef1973.png` must fail independently of material-category classes, filter
  controls, preview assets, action assets, material-list card classes, sidebar icon assets,
  toolbar, shell, layout, or canvas wrappers. Generic hot/fold/up/category/helper/icon wording and
  single generic PNG images are not enough; the rule stays anchored to a nearby pair of
  source-specific relative `img/hot` and `img/icon-up2` resources.
- 135 SVG material list-loader state such as `issvglist="true"` and `list-loader__inner`,
  `list-loader__load`, `list-loader__loading`, and `list-loader__loading-inner` must fail
  independently of material card items, category wrappers, filters, sidebar, toolbar, shell,
  layout, material-panel, or canvas wrappers. Generic `list-item`, `loading`, `black`, `active`,
  Ant icon, and button classes remain out of scope.
- 135 SVG material purchase/discount child controls such as `discount-instructions`,
  `discount-desc`, and `btn-buy` buttons paired with `ant-btn` and the live action text
  `免费试用` / `立即购买` must fail independently of material card items, list-loader state,
  category wrappers, filters, sidebar, toolbar, shell, layout, material-panel, or canvas wrappers.
  Generic price, buy, trial, discount, button, `btn`, `ant-btn`, and `new` wording/classes remain
  out of scope.
- A copied 135 background-SVG shell that combines `background-size:100.1% 100.1%` with a nearby
  tall `svg viewBox="0 0 1080 <height>"` must fail market-editor residue on WeChat, Xiaohongshu,
  and Zhihu, even when vendor class/id/source markers are stripped.
- Xiumi flow-canvas wrappers such as `tn-group-flow-canvas-for-svg-animation` must fail
  independently of broader `tn-cell`, `tn-animate`, Angular, editable, hosted-media, or
  `foreignObject` markers.
- Xiumi placeholder metadata such as `tn-placeholder` must fail independently of `tn-yzk-font-*`,
  `tn-cell`, flow-canvas, Angular, opera runtime, editable, hosted-media, or SVG content-layer
  markers.
- Xiumi yzk font metadata such as `tn-yzk-font-usage-id` must fail independently of
  `tn-placeholder`, `tn-cell`, flow-canvas, Angular, opera runtime, editable, hosted-media, or SVG
  content-layer markers.
- Xiumi disabled control bindings such as `disable-tn-group-flex-box` must fail independently of
  `opera-tn-ra-*`, `tn-*`, Angular, editable, hosted-media, or SVG content-layer markers.
- Xiumi runtime path bindings such as `opera-tn-ra-comp` and `opera-tn-ra-cell` must fail as
  source-specific component/cell runtime path binding residues instead of the old broad
  `Xiumi runtime binding attribute` bucket.
- Xiumi component authoring tree classes such as `tn-comp-inst`, `tn-comp-top-level`,
  `tn-comp-pin`, and `tn-comp-style-pin` must fail independently of `tn-page`, `tn-cell`,
  `tn-tpl`, hosted-media, Angular, opera runtime, or SVG content-layer markers.
- Xiumi cell container authoring classes such as `tn-cell`, `tn-cell-inst`, `tn-cell-image`,
  `tn-cell-text`, and `tn-cell-group` must fail independently of `tn-comp`, `tn-page`,
  `tn-tpl`, hosted-media, Angular, opera runtime, or SVG content-layer markers.
- Xiumi layer authoring classes such as `tn-layer` and `tn-layer-absolute` must fail
  independently of `tn-comp`, `tn-cell`, `tn-page`, `tn-tpl`, hosted-media, Angular, opera
  runtime, or SVG content-layer markers, while `tn-layer-slot` stays covered by the slot rule.
- Xiumi page authoring classes such as `tn-page` and `tn-page-root` must fail independently of
  `tn-comp`, `tn-cell`, `tn-layer`, `tn-tpl`, hosted-media, Angular, opera runtime, or SVG
  content-layer markers, while `tn-page-slot` and `tn-page-vessel` stay covered by their more
  specific rules.
- Xiumi template authoring classes such as `tn-tpl` and `tn-tpl-card` must fail independently of
  `tn-comp`, `tn-cell`, `tn-layer`, `tn-page`, hosted-media, Angular, opera runtime,
  renderer-pipeline attributes, or SVG content-layer markers.
- Xiumi source-house authoring classes such as `tn-from-house` and `tn-from-house-template` must
  fail independently of component, cell, layer, page, template, hosted-media, Angular, opera
  runtime, renderer-pipeline, or SVG content-layer markers.
- Xiumi basic style fragment classes such as `basic-style-desc`, `flow-page-basic-style`, and
  `fragment-type-flow_page_basic_style` must fail independently of broader `tn-tpl*`,
  `tn-from-house*`, and theme-color mask markers. These editor-side "basic format" fragment cards
  can inform InkForge-owned default typography controls, but must never be copied as publishable
  body DOM.
- Xiumi theme color mask classes such as `tn-theme-color-mask` and
  `tn-theme-color-mask-active` must fail independently of component, cell, layer, page, template,
  source-house, hosted-media, Angular, opera runtime, renderer-pipeline, or SVG content-layer
  markers.
- The old generic `Xiumi tn-* authoring tree` bucket has been decomposed into precise component,
  cell, layer, page, template, source-house, and theme-color-mask diagnostics.
- Xiumi component-template binding attributes such as `tn-bind-comp-tpl-id` and
  `tn-bind-comp-index` must fail independently of the broader component-binding bucket.
- Xiumi component identity metadata such as `tn-uuid` must fail independently of the broader
  component-binding bucket.
- Xiumi animation binding metadata such as `tn-animate` and `tn-animate-on-self` must fail
  independently of the broader component-binding bucket.
- Xiumi link binding metadata such as `tn-link` must fail independently of the broader
  component-binding bucket.
- Xiumi image binding metadata such as `tn-image` and `tn-image-usage` must fail independently of
  the broader component-binding bucket.
- Xiumi component-structure binding metadata such as `tn-comp`, `tn-comp-role`, `tn-comp-index`,
  and `tn-comp-pose` must fail independently of the broader component-binding bucket.
- Xiumi cell binding metadata such as `tn-cell` and `tn-cell-type` must fail independently of the
  broader component-binding bucket.
- Xiumi child layout binding metadata such as `tn-child-position` and `tn-child-orientation` must
  fail independently of the broader component-binding bucket. `tn-child-orientation="flow-canvas"`
  may still also report `Xiumi SVG carousel flow-canvas residue` as a separate SVG/H5 risk.
- Xiumi page binding metadata such as `tn-page-stage-size`,
  `tn-page-view-box-editor-desktop`, and `tn-page-cache-gatherer` must fail independently of the
  broader component-binding bucket.
- Xiumi atom context binding metadata such as `tn-atom-context` must fail independently of the
  broader component-binding bucket.
- Xiumi auxiliary binding metadata such as `tn-bind-aux-prop` must fail independently of the
  generic `Xiumi tn-* attribute` catch-all. Live Xiumi paper-editor DOM uses this attribute to bind
  auxiliary state such as `compAux.bgc1` into a shape/line cell; publishable outputs must carry the
  resolved inline style or InkForge-owned SVG/HTML fallback, never the editor-side binding.
- The old broad `Xiumi component binding attribute residue` bucket is now fully decomposed. The
  generic `Xiumi tn-* attribute` guard remains a final catch-all for unexpected Xiumi `tn-*`
  leakage.
- The old broad `Xiumi runtime binding attribute` bucket is now decomposed for `opera-tn-ra-comp`
  and `opera-tn-ra-cell`. The generic `Xiumi tn-* attribute` guard remains a final catch-all for
  nested Xiumi `tn-*` leakage in copied runtime attribute names.
- Xiumi root/text cleanup residues such as `tn-paper-document-root` and `tn-text` must fail after
  broader component wrappers are removed.
- Xiumi page/layer slot residues such as `tn-page-slot` and `tn-layer-slot` must fail after
  broader layer-slot wrappers are removed.
- Xiumi child layer state residues such as `tn-child-position-absolute`,
  `tn-child-position-static`, `tn-child-orientation-fixed`, and
  `tn-child-orientation-flow-canvas` must fail after page/layer slot wrappers are removed.
- Xiumi raw image-cell residues such as `raw-image` must fail after broader layer-slot wrappers are
  removed.
- Xiumi image-instance wrappers such as `tn-image-inst-wrapper` must fail after broader gallery
  state wrappers are removed.
- Xiumi overflow-hidden state residues such as `tn-overflow-hidden` must fail after broader
  gallery state wrappers are removed.
- Xiumi page-vessel residues such as `tn-page-vessel` must fail after broader gallery state
  wrappers are removed.
- Xiumi group sortable-box residues such as `tn-group-sortable-box` must fail after broader
  gallery state wrappers are removed.
- Xiumi sortable-pin residues such as `tn-sortable-pin` must fail after broader gallery state
  wrappers are removed.
- Xiumi quick-input residues such as `tn-quick-input-block` and `tn-__quick_input__-inst` must
  fail after broader gallery state wrappers are removed.
- Xiumi state-toggle residues such as `tn-state-active` and `tn-state-frozen` must fail after
  broader gallery state wrappers are removed.
- Xiumi editing-state residues such as `tn-on-child-editing` must fail after broader gallery
  state wrappers are removed.
- Xiumi page editing/frozen-toggle residues such as `tn-editing-cell-frozen-toggle-enabled` must
  fail after broader page-container and `tn-on-*` editing-state wrappers are removed.
- Xiumi in-cell active-state residues such as `tn-in-cell-state-active` must fail after broader
  gallery state wrappers are removed.
- Xiumi group-box wrapper residues such as `tn-group-box-wrapper` and `tn-group-fixed-box` must
  fail after broader gallery state wrappers are removed.
- The previous `Xiumi SVG gallery state wrapper residue` bucket has now been split into precise
  executable labels for image instance, overflow hidden, page vessel, group sortable box, sortable
  pin, quick input, state toggle, editing state, in-cell active state, and group box wrappers.
- Xiumi image-presentation residues such as `tn-image-presenter` must fail after broader `tn-*`
  authoring-tree wrappers are removed.
- Xiumi applied image-gallery state residue such as `tn-content-overlap` must fail after broader
  state wrappers are removed.
- Xiumi interaction-layer styles must fail when the same style attribute contains both
  `touch-action` and `user-select`; these are editor interaction controls, not article styling.
- Xiumi atom drag/drop residues such as `tn-atom-dragging-source`,
  `tn-atom-dropping-sink`, and `on-atom-drop` must report a precise atom drag/drop label instead
  of falling back to the generic `Xiumi tn-* attribute` diagnostic.
- Xiumi editing-dock residues such as `tn-editing-dock`, `tn-editing-show-data`, and
  `tn-editing-cube-index` must fail after atom drag/drop and component authoring-tree markers are
  removed, and must report the precise `Xiumi editing dock residue` label.
- Xiumi comment toolbar/panel residues such as `page-comment-on-toolbar`, `tn-comment-panel`, and
  `tn-comment-list` must fail after right-toolbar and paper auxiliary-tree markers are removed,
  and must report the precise `Xiumi comment toolbar panel residue` label.
- Xiumi page toolbar residues such as `tn-page-toolbar` must fail after comment-toolbar markers
  are removed, and must report the precise `Xiumi page toolbar residue` label instead of falling
  through to the broader page authoring-tree diagnostic. Co-observed `tn-menu`, `booklet`, and
  `stop-propagation` markers are not standalone triggers for this rule.
- Xiumi attribute-board residues such as `tn-attribute-board-entry`, `tn-attr-assemble-tabs`,
  `op-attr-assemble-*`, and `op-attr-view-attr-assemble-*` must fail after operator-depot and
  `dc-*` markers are removed, and must report the precise
  `Xiumi attribute board control residue` label.
- Xiumi attribute stack panel residues such as `tn-attribute-stack-panel-root` and
  `tn-attribute-stack-panel` must fail after attribute-board cleanup, and must report the precise
  `Xiumi attribute stack panel residue` label. These editor-side stacked property-panel
  containers may inform InkForge-owned style schemas, but must never be copied as publishable body
  DOM.
- Xiumi generated-link controls such as `op-gen-link`, `op-cp-background-audio`, and
  `op-cp-wx-miniprogram-link` must fail after attribute-board cleanup, and must report the
  precise `Xiumi generated link control residue` label.
- Xiumi WeChat cover controls such as `op-ce-wx-cover` must fail after generated-link cleanup,
  and must report the precise `Xiumi WeChat cover control residue` label. This protects the
  publishable article body from copied cover-picker controls; it does not prove WeChat cover
  thumbnail acceptance.
- Xiumi WeChat cover menu and preview controls such as a class/id value containing both
  `op-bar-menu` and `cover-menu`, plus `op-ce-video-xm-cover` and `svg-cover`, must fail after
  generated-link, dark-mask, operation-bar, and cover-panel cleanup, and must report the precise
  `Xiumi WeChat cover control residue` label. Generic child classes such as `cover-desc` and
  `cover-imgs` are context only and are not standalone triggers. The generic operation-bar
  detector must exclude `cover-menu` so cover picker controls are not misclassified as
  `Xiumi operation bar dropdown residue`.
- Xiumi scale-panel controls such as `op-ce-scale` must fail after WeChat-cover cleanup, and must
  report the precise `Xiumi scale panel control residue` label. These editor-side scale, width,
  and height controls may inform InkForge-owned layout reports, but must never be copied as
  publishable body DOM.
- Xiumi menu input/icon controls such as `op-menu-input`, `op-menu-icon`, and `op-bar-item-icon`
  must fail after scale-panel cleanup, and must report the precise
  `Xiumi menu input/icon control residue` label. These editor-side font-size, spacing, padding,
  layout-menu, style-brush, and table-control surfaces may inform InkForge-owned parameter
  schemas, but must never be copied as publishable body DOM. `op-bar-item-icon` must not be
  misreported as 135 toolbar residue.
- Xiumi operation-bar input/separator controls such as `op-bar-input` and `op-bar-separator` must
  fail after menu-input cleanup, and must report the precise
  `Xiumi operation bar input/separator residue` label. These editor-side width/height, x/y,
  margin, padding, line-height, text-decoration, and panel separator controls may inform
  InkForge-owned layout reports and parameter schemas, but must never be copied as publishable
  body DOM.
- Xiumi box-metrics controls such as `op-ce-box-metrics` must fail after operation-bar
  input/separator cleanup, and must report the precise
  `Xiumi box metrics control residue` label. These editor-side margin, padding, line-height,
  border style, border width, border radius, and format-extraction controls may inform
  InkForge-owned layout reports and box-model parameter schemas, but must never be copied as
  publishable body DOM.
- Xiumi crop-panel child controls such as `crop-panel`, `crop-attr-menu`, `crop-ratio-item`, and
  `crop-image` must fail after worker-surface cleanup, and must report the precise
  `Xiumi crop panel child control residue` label. These editor-side crop menu, ratio-selection,
  and crop-preview surfaces may inform InkForge-owned image-crop reports and cover/image handling
  schemas, but must never be copied as publishable body DOM.
- Xiumi background-attribute controls such as `bg-attr-menu`, `bg-repeat-select`,
  `bg-attach-check`, and `ce-op-background` must fail after crop-panel cleanup, and must report
  the precise `Xiumi background attribute control residue` label. These editor-side background
  repeat, attachment, and background operation surfaces may inform InkForge-owned background
  layout reports, but must never be copied as publishable body DOM.
- Xiumi animation attribute panels such as `op-comp-animation-attr-board`,
  `op-attr-view-cp-animation*`, and `anim-selector-x` must fail after background-attribute
  cleanup, and must report the precise `Xiumi animation attribute panel residue` label. These
  editor-side animation effect, direction, duration, delay, loop, easing, extraction, and
  clipboard surfaces may inform InkForge-owned motion/action schemas, but must never be copied as
  publishable body DOM.
- Xiumi animation panel child controls such as `anim-unit-container`, `anim-item-list`,
  `anim-unit-box`, `anim-clipboard`, `anim-title-bar`, and `anim-content` must fail after
  animation-attribute cleanup, and must report the precise
  `Xiumi animation panel child residue` label. These editor-side animation list, title, unit, and
  clipboard surfaces may inform InkForge-owned motion/action schemas, but must never be copied as
  publishable body DOM.
- Xiumi animation style picker controls such as `anim-desc`, `anim-expand-bottom`, `anim-icon`,
  `anim-style`, `anim-styles`, `animate-styles-type`, and `animate-general` must fail after
  animation-list cleanup, and must report the precise `Xiumi animation style picker residue` label.
  These editor-side animation effect groups and icon children may inform InkForge-owned
  motion/action schemas, but must never be copied as publishable body DOM.
- Xiumi animate operation panels such as `animate-op-btn-panel` must fail after animation-child
  cleanup, and must report the precise `Xiumi animate operation panel residue` label. The
  top-operation detector must treat `op-btn*` as class/id tokens so this source-specific animation
  action-extraction panel is not misclassified as `Xiumi top operation button residue`.
- Xiumi operation dark-mask surfaces such as `op-dark-mask` must fail after WeChat-cover cleanup,
  and must report the precise `Xiumi dark mask control residue` label. These editor-side mask
  overlays may surround control panels, but must never be copied as publishable body DOM.
- Xiumi layout/form panels such as `layout-box-panel`, `form-input-panel`, `op-ce-form-input`,
  `trigger-props-panel`, and `trigger-radio-input` must fail after operation-bar cleanup, and must
  report the precise `Xiumi layout form panel residue` label. These editor-side layout, column,
  option, and form-trigger controls may inform InkForge-owned form/layout schemas, but must never
  be copied as publishable body DOM.
- Xiumi layout/form child controls such as `cell-layout-box`, `menuitem-level`, `padding-input`,
  `attr-thin-label`, and `attr-btn` must fail even when layout/form parent panels are absent, and
  must report the precise `Xiumi layout form child residue` label. These editor-side dropdown,
  table/column insertion, padding, attribute-label, and confirm/reset controls may inform
  InkForge-owned form/layout schemas, but must never be copied as publishable body DOM.
- Xiumi component operation-depot actions such as `dc-cp-link`, `dc-cp-copy-to-clipboard`,
  `dc-cp-wx-miniprogram-link`, `dc-cp-out-comp-edit`, `dc-cp-quick-input-prompt`,
  `dc-cp-replace-template`, `dc-cp-rolling-over`, and `dc-cp-zorder` must fail with
  `Xiumi component operation depot action residue`. They may inform InkForge-owned link,
  clipboard, mini-program-link, replacement, carousel/rolling, z-order, H5 fallback, and
  interaction-proof policy, but copied Xiumi operation-depot DOM is not publishable body DOM,
  article link DOM, H5 proof, or platform proof.
- Xiumi operation-panel component controls such as `op-cp-animation`, `op-cp-insert-text`,
  `op-cp-margin`, `op-cp-margin-tb`, `op-cp-save`, `op-cp-scale`, `op-ce-bg-bar`, and
  `op-ce-profile-card` must fail with `Xiumi operation panel component control residue`. They may
  inform InkForge-owned animation, insertion, margin, save-state, scale, background-bar, profile
  card, H5 fallback, and interaction-proof policy, but copied Xiumi operation-panel DOM is not
  publishable body DOM, profile-card proof, H5 proof, or platform proof.
- Xiumi background/transparency operation controls such as `op-background-sec` and
  `op-gen-transparency` must fail with `Xiumi background transparency operation residue`. They
  may inform InkForge-owned background, transparency, raster fallback, Dark Mode, and
  visual-fidelity proof policy, but copied Xiumi background operation DOM is not publishable body
  DOM, background fidelity proof, transparency proof, or platform proof.
- Xiumi component-depot native/embed controls such as `dc-ce-audio-card`, `dc-ce-music-card`,
  `dc-ce-map`, `dc-ce-map-tx`, `dc-ce-profile-card`, `dc-ce-redpack-cover`, `dc-ce-svg`,
  `dc-ce-video-card`, `dc-ce-video-link`, `dc-ce-video-tx`, and `dc-ce-video-xm` must fail with
  `Xiumi component depot native control residue`. They may inform InkForge-owned media, map,
  profile, action, SVG, video, manifest, and fallback schemas, but copied Xiumi component-depot DOM
  is not publishable body DOM or platform proof.
- Xiumi component-depot SVG/animation controls such as `dc-ce-animation`,
  `dc-ce-svg-animate`, and `dc-ce-svg-animation` must fail with
  `Xiumi component depot SVG animation residue`. They may inform InkForge-owned SVG animation,
  SMIL/H5 fallback, and interaction proof policy, but copied Xiumi component-depot control DOM is
  not publishable applied SVG output or mobile interaction proof. Plain `dc-ce-svg` remains native
  component residue and must not overmatch `dc-ce-svg-*` controls.
- Xiumi component-depot external edit/link controls such as `dc-ce-out-cell-edit` and
  `dc-ce-play-cp-link` must fail with `Xiumi component depot external edit link residue`. They may
  inform InkForge-owned link, external component, and editor handoff policy, but copied Xiumi
  component-depot control DOM is not publishable article link DOM or platform link proof.
- Xiumi component-depot form/input controls such as `dc-ce-input-checkbox`,
  `dc-ce-input-radio`, `dc-ce-input-select`, `dc-ce-input-text`, and
  `dc-ce-input-multi-line-text` must fail with `Xiumi component depot form input residue`. They
  may inform InkForge-owned H5/form schemas and static fallback requirements, but copied Xiumi
  component-depot DOM is not publishable body DOM or interaction proof.
- Xiumi component-depot layout/geometry controls such as `dc-ce-layout-free`,
  `dc-ce-layout-fixed-aspect-ratio`, `dc-ce-layout-scroll-direction`, `dc-ce-layout-column`,
  `dc-ce-layout-hidden`, `dc-ce-layout-style`, `dc-ce-layout-transparent`,
  `dc-ce-layout-vertical-align`, `dc-ce-static-position-size`, `dc-ce-auto-align`,
  `dc-ce-width`, `dc-ce-height`, `dc-ce-margin`, `dc-ce-spacing`, and `dc-ce-frozen` must fail
  with `Xiumi component depot layout geometry residue`. They may inform InkForge-owned layout
  reports, geometry schemas, static fallbacks, and safe rendering constraints, but copied Xiumi
  component-depot DOM is not publishable body DOM or free-layout proof.
- Xiumi component-depot table controls such as `dc-ce-classic-table-column-width`,
  `dc-ce-classic-table-grid`, `dc-ce-classic-table-merge`, `dc-ce-classic-table-quickly`,
  `dc-ce-classic-table-style`, and `dc-ce-classic-table-width` must fail with
  `Xiumi component depot table control residue`. They may inform InkForge-owned table fallback,
  column-width, merge-fidelity, grid, and platform table policy design, but copied Xiumi
  component-depot DOM is not publishable body DOM or complex-table proof.
- Xiumi component-depot table auxiliary controls such as `dc-ce-table-column-width`,
  `dc-ce-table-grid`, and `dc-ce-table-style-brush` must fail with
  `Xiumi component depot table auxiliary residue`. They may inform InkForge-owned non-classic
  table fallback, column-width, grid, and style-brush policy, but copied Xiumi component-depot DOM
  is not publishable body table DOM or table fidelity proof.
- Xiumi component-depot image transform controls such as `dc-ce-crop-image-crop`,
  `dc-ce-image-animation`, `dc-ce-image-crop`, `dc-ce-image-design`,
  `dc-ce-image-enhancement`, `dc-ce-image-flip`, `dc-ce-image-for-layout-datum`,
  `dc-ce-image-library`, `dc-ce-image-png-size`, `dc-ce-image-popup`,
  `dc-ce-image-replace-color`, `dc-ce-image-src`, `dc-ce-image-straw-color`,
  `dc-ce-image-style-brush`, `dc-ce-image-svg-clip`, and `dc-ce-image-to-background` must fail
  with `Xiumi component depot image transform residue`. They may inform InkForge-owned image
  crop, SVG clip, popup image, background conversion, color replacement, and raster fallback
  schemas, but copied Xiumi component-depot DOM is not publishable body DOM or image fidelity
  proof.
- Xiumi component-depot box/background style controls such as `dc-ce-background`,
  `dc-ce-box-border`, `dc-ce-box-formats`, `dc-ce-box-metrics`, `dc-ce-box-shadow`, and
  `dc-ce-transparency` must fail with `Xiumi component depot box style residue`. They may inform
  InkForge-owned background, border, shadow, transparency, and visual-style fallback policy, but
  copied Xiumi component-depot DOM is not publishable body decoration DOM or visual fidelity
  proof.
- Xiumi component-depot typography controls such as `dc-ce-font-size-scale`,
  `dc-ce-paragraph-margin`, `dc-ce-text-all`, `dc-ce-text-code`,
  `dc-ce-text-decoration`, `dc-ce-text-shadow`, and `dc-ce-text-shadow-style` must fail with
  `Xiumi component depot typography control residue`. They may inform InkForge-owned typography,
  paragraph spacing, code style, text-decoration, and text-shadow fallback policy, but copied
  Xiumi component-depot DOM is not publishable body text DOM or typography fidelity proof.
- Xiumi component-depot mobile viewport controls such as `dc-ce-mobile-background`,
  `dc-ce-mobile-group`, `dc-ce-mobile-image`, `dc-ce-mobile-text`, and
  `dc-ce-mobile-unsupport` must fail with `Xiumi component depot mobile viewport residue`. They
  may inform InkForge-owned responsive fallback, mobile viewport, H5 degradation, and phone-proof
  checklist design, but copied Xiumi component-depot DOM is not publishable body DOM, H5 proof, or
  phone preview proof.
- Xiumi editor control surfaces must fail when class/id attributes contain `ui-slider` control
  classes, `ui-sortable` drag/sort controls, `op-loader` operation-panel loader state, operation
  panel directive attributes such as `tn-panel-move`, `tn-op-back-mask`, and `tn-op-menu`, or
  operator-dock / external-edit-panel controls such as `op-dock`, `out-comp-edit-dock`,
  `out-comp-edit-panel`, `op-ce-layout-carousel`, `cell-group-edit-container`,
  `menu-style-input`, and `svg-animation-assistant`, operator depot/menu items such as
  `op-dc-depot`, `op-dc-slot`, `ce-dc`, `dc-ce-svg`, `dc-cp-aux-props`, and
  `tn-op-dc-item`, or selection-overlay child controls such as `full-screen-mask`, `brim-group`,
  `box-lines`, `box-handles`, `hm-panstart`, `hm-panmove`, `stop-propagation`, and
  `tn-attach-to`, or crop/worker-surface controls such as `op-worker-surface`,
  `op-worker-block-gesture`, `crop-mask`, `crop-box`, and `crop-handle`, or paper auxiliary
  component-tree controls such as `tn-paper-aux-comps-tree-assistant`,
  `tn-paper-aux-comps-tree`, `paper-comps-assistant`, `paper-aux-comp-tree`,
  `aux-tree-node-data`, and `on-paper-aux-tree-node-*`, or top operation buttons such as
  `x3-nav-op-buttons`, `tn-op-btn-group`, `op-btn`, `op-btn-inset-icon`,
  `op-btn-inset-desc`, and `op-more`, or navigation shell wrappers such as `x3-navbar`,
  `x3-nav-brand`, `x3-nav-path`, and `x3-nav-misc`, or header shell wrappers such as
  `tn-header`, or UI Bootstrap directives such as `uib-dropdown`,
  `uib-dropdown-toggle`, `uib-dropdown-menu`, `uib-tooltip`, `tooltip-placement`, and
  `tooltip-popup-delay`, or Xiumi dropdown directives such as `tn-dropdown`,
  `tn-dropdown-toggle`, and `tn-dropdown-menu`, or cleaned-down template scene markers such as
  `tn-scene-paper` and `tn-lighting-box`, group/ground authoring markers such as
  `tn-group-usage-normal`, `tn-ground-slot`, `tn-ground-inst`, and `tn-cube-inst`, or
  image-enhancement/crop child controls such as `op-cp-image-enhancement`,
  `op-ce-image-enhancement`, `op-ce-image-popup`, `enhance-attr-menu`, and `thumb-crop-img`, or
  background child bars such as `op-cp-bg-bar`, or document selection shell markers such as
  `multi-comp-select-panel`, `tn-fly-away-workaround-ios13`, and `dock-loader`, or cover
  placeholder shells such as `cover-imgs`, `cover-placeholder`, `cover-mask`, `mask-border`,
  `play-placeholder`, and `second-placeholder`, or component drag/drop receiver surfaces such as
  `tn-comp-dragging-receiver`, `tn-comp-container-dragging-cancel`,
  `tn-comp-container-dragging-remove`, `tn-comp-moving-canceler`, and
  `tn-comp-trash-receiver`, or template list refresh directives such as `tn-pull-to-refresh`, or
  template card hover markers such as
  `inner-image-box`, `lighting-hover`, `comp-feature-matched`, and `large-tpl`, or layout/form
  child controls such as `cell-layout-box`, `menuitem-level`, `padding-input`,
  `attr-thin-label`, and `attr-btn`, or operation-bar
  dropdown/menu controls such as `op-bar-menu`,
  `op-bar-btn`, `op-bar-icon`, `shortcut-op-bar-panel`, `spacing-panel`, `format-panel`,
  `size-list-menu`, and `insert-text-op-bar-panel`, or color-selector controls such as
  `color-selector-dropdown`, `op-theme-color-sec`, `text-color-btn`, `tn-color-circle`,
  `hello-color-x`, `on-color-choose`, `support-color-category`, and template color-fetch flags,
  or theme-color widget controls such as `color-widget`, `op-color-text`,
  `tn-color-palette-dock`, and `tn-color-picker-mask`,
  or color-palette panel controls such as `tn-color-palette-panel`,
  `tn-color-palette-panel-mask`, `tnColorPaletteInst`, and `tnColorPaletteMask`, or
  body-level color picker triggers such as `tnColorPickerTrigger` and
  `tnGradientColorPickerTrigger`, or
  hidden media upload inputs such as `audioFileUploadInput`, `videoFileUploadInput`,
  `tn-audio-uploader`, and `tn-video-uploader`, or
  audio/media panel controls such as `audios`, `audio-panel`, `audio-src`, `audio-status`,
  `audio-edit`, `audio-del`, and `audio-group`, or
  font/basic-format controls such as `tn-global-format-dropdown`, `tn-basic-format-tabset`,
  `font-family-menu`, `font-family-list`, `stc-family-name-yzk-*`, `text-format-brush`,
  `text-misc`, `size-input`, `tn-list-locate-active-item`, `tn-text-input-begin`,
  `tn-text-input-done`, and font-size skim callbacks, or
  text-toolbar controls where `op-text-sec` is paired with `font-size`, `font-family`,
  `text-style`, or `text-misc`, or text-editing flyout controls such as
  `in-text-cell-editing-op`, `cp-op-quick-input-prompt`, `op-text-img-resizing-surface`,
  `text-bgd-shadow`, and `toggle-color-btn`, or text-format brush panels such as
  `brush-panel`, or menu pin controls such as `op-cp-menu-pin` and `op-cp-menu-pin-tb`, or
  account/sync dropdown panels such as `wx-user-panel`, or statistics dropdown panels such as
  `statistics-tool-panel`, or message notification dropdown controls such as `usr-message-box`,
  `message-box-toggle`, `turn-to-message-setting`, and `turn-to-message-list`, or user profile
  dropdown controls such as `usr-info-desc-frame`, or editor prompt banners such as
  `tn-compatible-prompt` and `tn-operate-prompt`, or
  attribute context-menu host nodes such as
  `attr-bar-context-menu-host-for-comp-insert`,
  `attr-bar-context-menu-host-for-comp-modify`, and
  `attr-bar-context-menu-host-for-cell`, or panel-header controls such as
  `panel-handler`, `panel-placeholder`, `hammer-handler`, `comment-panel-header`, and the
  `glyphicon` + `panel-close` class combination, or right-toolbar controls such as `x5-right-toolbar`,
  `right-toolbar-container`, `right-toolbar-switch`, `right-toolbar-arrow-*`,
  `content-statistics`, `page-assist-on-toolbar`, `zooming-selector`, and
  `tn-viewport-zooming-panel`, or sidebar/tab controls such as `sidebar-panel`,
  `sidebar-style-normal`, `x3-tab-item`, and `tn-tab-ctrl-pin`, or meta-panel controls such as
  `tn-meta-container`, `tn-meta-panel`, and `toggle-green-gray`.
- All of the above remain no-copy/source-ownership gates. They can inform InkForge-owned image
  slot manifests, motion/action schema, readable DOM order, layout reports, static fallback,
  raster fallback, or long-image fallback only.

Evidence:
- `prompts/0601/evidence/135-base-residue-coverage-20260629.txt`
- `prompts/0601/evidence/style-proof-135-background-size-shell-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-flow-canvas-animation-wrapper-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-placeholder-metadata-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-yzk-font-metadata-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-disabled-control-binding-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-runtime-path-binding-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-component-authoring-tree-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-cell-container-authoring-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-layer-authoring-tree-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-page-authoring-tree-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-template-authoring-tree-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-source-house-authoring-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-basic-style-fragment-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-theme-color-mask-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-component-template-binding-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-component-identity-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-animation-binding-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-link-binding-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-image-binding-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-sound-comment-binding-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-preload-image-directive-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-structure-binding-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-cell-binding-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-operator-dock-control-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-selection-overlay-control-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-child-layout-binding-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-page-binding-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-page-mode-binding-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-atom-context-binding-metadata-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-atom-drag-drop-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-editing-dock-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-comment-toolbar-panel-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-paper-document-root-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-text-cell-class-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-page-layer-slot-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-child-layer-state-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-raw-image-cell-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-image-instance-wrapper-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-third-party-image-source-coverage-20260629.txt`
- `prompts/0601/evidence/xiumi-overflow-hidden-state-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-page-vessel-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-group-sortable-box-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-sortable-pin-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-quick-input-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-quick-input-instance-residue-20260627.txt`
- `prompts/0601/evidence/xiumi-state-toggle-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-editing-state-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-editing-frozen-toggle-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-in-cell-active-state-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-group-box-wrapper-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-image-presenter-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-content-overlap-state-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-interaction-style-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-ui-slider-control-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-sortable-control-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-operation-panel-loader-residue-20260625.txt`
- `prompts/0601/evidence/xiumi-operation-panel-directive-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-operation-bar-dropdown-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-color-selector-control-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-font-format-control-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-text-input-begin-directive-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-text-toolbar-control-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-right-toolbar-control-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-sidebar-tab-control-residue-20260626.txt`
- `prompts/0601/evidence/xiumi-meta-panel-control-residue-20260626.txt`
- `prompts/0601/evidence/135-svg-trigger-hot-area-overlay-residue-20260626.txt`
- `prompts/0601/evidence/135-svg-trigger-switch-control-residue-20260626.txt`
- `prompts/0601/evidence/135-svg-editor-base-shell-residue-20260626.txt`
- `prompts/0601/evidence/135-svg-editor-toolbar-residue-20260626.txt`
- `prompts/0601/evidence/135-svg-user-header-chrome-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-header-logo-menu-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-work-title-edit-control-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-work-tool-quick-entry-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-sidebar-icon-help-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-sidebar-icon-asset-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-sidebar-navigation-residue-20260626.txt`
- `prompts/0601/evidence/135-svg-material-search-control-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-list-item-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-filter-control-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-category-wrapper-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-preview-asset-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-action-asset-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-category-helper-asset-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-list-loader-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-purchase-control-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-material-component-path-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-editor-article-list-wrapper-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-editor-articles-anchor-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-editor-gap-input-child-residue-20260627.txt`
- `prompts/0601/evidence/135-svg-builder-effect-data-name-expansion-20260627.txt`
- `prompts/0601/evidence/135-svg-builder-effect-data-name-second-expansion-20260627.txt`
- `prompts/0601/evidence/xiumi-wechat-cover-control-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-scale-panel-control-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-menu-input-icon-control-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-operation-bar-input-separator-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-box-metrics-control-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-crop-panel-child-control-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-image-crop-directive-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-background-attribute-control-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-animation-attribute-panel-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-animation-panel-child-control-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-attribute-stack-panel-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-animate-operation-panel-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-dark-mask-control-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-layout-form-panel-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-animation-style-picker-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-animation-style-picker-icon-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-animation-picker-directive-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-wechat-cover-menu-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-dropdown-directive-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-template-scene-marker-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-group-ground-marker-residue-20260628.txt`
- `prompts/0601/evidence/xiumi-image-enhancement-crop-control-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-background-bar-child-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-document-selection-shell-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-cover-placeholder-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-cover-image-description-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-template-card-hover-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-layout-form-child-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-text-editing-flyout-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-panel-header-control-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-brush-panel-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-attr-context-menu-host-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-menu-pin-control-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-account-sync-panel-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-statistics-panel-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-message-panel-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-user-profile-menu-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-editor-prompt-banner-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-navigation-shell-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-header-shell-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-drag-receiver-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-editor-interaction-directive-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-color-palette-panel-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-media-upload-input-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-color-picker-trigger-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-theme-color-widget-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-color-selector-class-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-audio-panel-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-audio-library-control-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-audio-room-tab-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-login-layer-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-template-entry-block-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-template-list-refresh-directive-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-operation-depot-action-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-operation-panel-component-control-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-background-transparency-operation-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-state-loading-utility-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-native-control-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-svg-animation-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-external-edit-link-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-form-input-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-layout-geometry-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-table-control-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-table-auxiliary-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-image-transform-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-box-style-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-typography-control-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-component-depot-mobile-viewport-residue-20260629.txt`
- `prompts/0601/evidence/xiumi-text-operation-section-residue-20260629.txt`
- `.trellis/spec/frontend/wechat-svg-modules.md` sections 74-234.
