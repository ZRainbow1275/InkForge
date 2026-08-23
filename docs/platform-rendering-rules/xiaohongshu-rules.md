# 小红书渲染规则手册

> 2026-07 收口规则：小红书正文不是富文本平台。InkForge 对小红书的交付合同是“纯文本 + 图片页/海报/长图”。不得把微信公众号 HTML、SVG 或 Markdown 控制符直接泄漏到正文，也不得用系统 emoji 图标冒充排版控件。

## 一、输出合同

| 输出类型 | 用途 | 允许内容 | 禁止内容 |
| --- | --- | --- | --- |
| 纯文本正文 | 可直接粘贴到小红书描述/长文正文 | 短段落、普通列表、标题化短句、话题建议 | HTML、CSS、SVG、Markdown 控制符、伪富文本 |
| 图片页 | 承载图文卡、公式、代码、表格、流程图 | 3:4 或 1:1 图片，文字不裁切，图片顺序稳定 | 文字贴边、低对比、不可读缩放 |
| 封面/海报 | 承载标题和核心卖点 | 大标题、短副标题、品牌识别 | 二维码、外链、侵权素材、过密小字 |
| 长图 | 承载长文或报告式内容 | 分段、分页、章节锚点、导出清单 | 未检查裁切、过大文件、隐藏滚动内容 |

Executable choice source: `inkforge/src/services/export/style-catalog.ts` mirrors the user-facing
XHS style choices. UI/export-report code should read `getPlatformStyleChoices('xiaohongshu')`
instead of duplicating this document's matrix.

## 二、平台边界

### 2.0 官方内容规范与技术证据边界

- 当前权威内容约束来自小红书官方《社区规范》。发布稿不得包含标题党、图文不符、虚假体验、与产品无关或过度照搬官方营销话术的内容。
- 正文、图片和封面不得承载用于站外导流的网址、二维码、联系方式或第三方水印；版权、隐私和第三方权利仍须由真实素材来源证明。
- 批量、高频、机器模式发布以及使用程序或脚本制造虚假互动属于平台治理边界，因此 InkForge 只生成并交付本地产物，不模拟账号发布或互动。
- 这些是内容与交付约束，不是编辑器技术白名单。当前官方公开页面没有给出可稳定引用的 HTML/CSS/SVG 正文能力、标题长度、图片数量、尺寸或字节上限；相应数值只能作为可配置市场默认值和真实发布清单项。
- 公开创作者发布入口在未登录状态只提供认证壳。没有当前账号编辑器、上传响应和最终预览时，不得把本地格式、manifest 或市场经验升级成“平台已接受”。

### 2.1 正文边界

- 小红书正文默认视为纯文本。
- 不输出 `<section>`、`<div>`、`<span>`、`style`、inline SVG。
- 不输出 `#`、`##`、`**`、```、`|---|` 等 raw Markdown 控制符。
- 不生成可点击外链；链接转为“搜索关键词”或“见评论/简介”等人工说明，具体文案由用户确认。
- 用户原文中自带的平台表情可作为内容保留；InkForge 系统 UI、按钮、图标和自动生成装饰不得使用 emoji 图标。

### 2.2 图片边界

- 推荐图片比例：3:4 优先，1:1 可选。
- 常用导出尺寸：1080x1440、1242x1660 或同等 3:4 比例。
- 默认图片格式检查：JPG/PNG 优先；其他格式必须有明确转换器、预览证据和发布入口确认。
- 默认图片大小检查：当前市场资料常见上限为 20MB。InkForge 将它作为 configurable/checkable
  limit 和 publish checklist 项，账号版本或平台灰度不可验证时不得硬编码为永久常量。
- 图片页必须具备安全边距，标题和正文不得贴边。
- 多页导出必须生成顺序和 manifest，避免发布顺序错位。
- 不要把历史“最多 9 张图”硬编码为永久合同。2026 市场资料已出现“最多 18 张图片”的图文笔记说明；InkForge 应把平台上限作为可配置/可检查项，并在真实发布入口不可验证时写入 publish checklist。
- 当图片页数量从 N 变为 M 时，必须同步重建 manifest、页面顺序、页码/标题、正文中的“见第 N 张图”引用和导出文件列表。
- 删除或重排图片后，不得保留过期旧图、旧 manifest、旧封面引用或已失效正文图号。
- manifest 数量、实际图片文件数量、正文图号引用数量不一致时，应阻断导出或标记 `unavailable`，不能继续报告成功。
- 长图需要额外裁切检查，不能只看浏览器预览。

## 三、Markdown 到小红书转换

| Markdown 元素 | 纯文本输出 | 图片/长图输出 |
| --- | --- | --- |
| `# 标题` | 转为首行短标题 | 可进入封面大标题 |
| `## 二级标题` | 转为独立短句或编号段落 | 可进入章节页 |
| `**加粗**` | 去除标记，保留文字 | 可用图片排版加粗 |
| `- 列表` | 转为普通短行列表 | 可转信息卡 |
| `1. 列表` | 保留数字编号 | 可转步骤卡 |
| `> 引用` | 转为“引用：...”文本 | 可转金句卡 |
| 链接 | 转为显示文本和搜索提示 | 可在图片页说明 |
| 图片 | 输出“见第 N 张图”或插图占位说明 | 生成真实图片页 |
| 代码块 | 转为简短说明 | 生成代码截图/图片页 |
| 表格 | 转为分组文本 | 生成表格图片 |
| 公式 | 转为文字说明 | 生成公式图片 |
| Mermaid/图表 | 转为说明 | 生成图表图片 |

## 四、内容结构规则

### 4.1 纯文本正文

- 标题控制在 20 个中文字符左右，优先把关键词放前部。
- 正文建议 200-1000 字；超长内容应进入长图或多页图片。
- 每段 1-3 行，段间空行。
- 列表最多 5-7 项；更多内容转图片页。
- 话题建议最多 10 个，默认 3-5 个。
- 不自动添加 emoji 图标作为列表符号；默认使用 `1.`、`2.`、`-`、`[要点]`、`[提示]` 等纯文本标记。

### 4.2 图片页

- 每页只承载一个核心信息块。
- 标题、正文、图表之间保留稳定间距。
- 多行标题的副标题和正文起点必须从最后一行标题基线动态下移；不得使用只适合单行标题的固定纵坐标。封面最多三行、内容卡最多两行时都必须保持标题、副标题和正文互不重叠。
- 长词、URL、代码行需要自动换行或转截图。
- 生成后必须检测 `ok`、`warning`、`overflow` 三类布局状态。
- 若有本地/远程图片依赖，必须验证资源可加载，不用占位假图。

### 4.3 封面

- 第一张图默认为封面，应包含明确标题和主题。
- 标题最多 2 行，避免小字堆叠。
- 不使用二维码、联系方式、外链水印或未经授权素材。
- 文本对比度必须在移动端缩略图下可读。

### 4.4 图片页样式矩阵

| Choice id | 用途 | 视觉强度 | 输出 | 默认证据 | 阻断条件 |
| --- | --- | --- | --- | --- | --- |
| `xhs-clean-text` | 日常笔记正文 | low | 纯文本 | `unit-tested` | HTML/SVG/Markdown 控制符泄漏 |
| `xhs-cover-carousel` | 封面、多页图文、图表 | high | 3:4/1:1 图片页 + manifest | `local-browser` | manifest、格式、页数上限检查不通过 |
| `xhs-cover-hook` | 首图封面、标题钩子 | high | 3:4 cover image | `local-browser` | 标题裁切、对比不足、manifest 缺失 |
| `xhs-markdown-card-slicer` | 教程、清单、方法论、Markdown 分页 | medium-high | 多页图片 + 顺序 manifest | `local-browser` | 2026-06-21 本地 4 页 CloakBrowser raster pack + manifest 通过；平台上传/预览/发布仍需另证 |
| `xhs-data-card` | 数据、表格、对比 | medium | 图片页或长图 | `local-browser` | 2026-06-21 本地 3 页 CloakBrowser raster pack + manifest 通过；目录仍 blocked，密集表格、手机可读性、平台上传发布仍需另证 |
| `xhs-long-report` | 长文、报告、图文混排 | medium | 长图 artifact | `local-browser` | 2026-06-21 本地 4 页 CloakBrowser raster pack + manifest 通过；目录仍 blocked，平台上传/预览/发布仍需另证 |
| `xhs-market-rich-card-fallback` | 市场富卡片、H5/互动降级 | medium | 图片页或长图 | `local-browser` | 2026-06-21 本地 4 页 CloakBrowser raster pack + manifest 通过；目录仍 blocked，平台上传/预览/发布仍需另证 |
| `xhs-h5-design-import-boundary` | H5、设计海报、视频/PDF、贴纸图文 | low | publish checklist | `doc-only` | 必须先落成图片页/纯文本，不是正文富文本 |

实施要求：

- 3:4、1080x1440、1242x1660、18 图、20MB 等都是配置默认值和发布清单输入，不是永久硬编码。
- 每个图片页导出必须带 manifest：页码、文件名、尺寸、比例、格式、cover 标记、正文引用状态和裁切状态。
- 长文生成页数超过当前清单上限时，必须保留完整源覆盖证据并明确阻断或要求拆包；不得只导出前 N 页后宣称全文成功。
- 普通 Markdown 空行只分隔段落，不等于强制换页。卡片切片必须在容量允许时保持完整段落，并仅由标题、显式 `xhs-page-break`、代码块或真实容量边界分页；普通正文不得被误画成列表项目符号。
- Runtime validator: `validateXhsImageArtifactManifest()` validates local image-page/long-image
  artifacts before InkForge reports local readiness. `convertToNativeFormat(..., 'xiaohongshu')`
  can carry `artifacts.xiaohongshuImageManifest` only as local preflight evidence; it is not a
  publish-state upgrade.
- 用户可选“高视觉强度”时，正文仍是纯文本；视觉丰富度只进入图片页、封面、海报或长图。
- 没有真实小红书发布入口时，只能报告本地图片 artifact 通过，不能报告平台发布通过。

## 五、质量检测清单

| 检测项 | 规则 | 结果 |
| --- | --- | --- |
| HTML 泄漏 | 出现 `<tag>` | 阻断 |
| CSS 泄漏 | 出现 `style=`、`class=`、`data-ink-block` | 阻断 |
| SVG 泄漏 | 出现 `<svg>` | 阻断；转图片页 |
| Markdown 泄漏 | 出现 `##`、`**`、代码围栏、表格分隔线 | 阻断或自动清理 |
| 话题过载 | 话题标签超过 10 个，或与正文/封面主题明显不一致 | 警告；建议收敛到 3-8 个高度相关话题 |
| 长列表 | 连续列表超过 7 项 | 警告；建议拆段或转图片页/长图 |
| 超长行 | 单行纯文本超过 120 字 | 警告；建议主动换行、拆段或转图片页 |
| 段落过长 | 单段超过 5 行 | 警告；建议拆分 |
| 正文过长 | 明显超过可读范围 | 警告；建议图片页/长图 |
| 图片比例 | 非 3:4 或 1:1 | 警告 |
| 图片格式 | 不在当前配置允许格式内，或未经过转换器落成 JPG/PNG 等可发布格式 | 阻断 / `unavailable` |
| 图片大小 | 超过当前配置的 max bytes（默认可用市场值 20MB 初始化，但须可调整） | 阻断 / `unavailable` |
| 图片数量一致性 | manifest 数量、实际文件数量、正文“见第 N 张图”引用或封面页不一致 | 阻断 |
| 图片数量上限 | 超过当前配置的 page-count limit（市场值如 18 图只能作为默认/清单项） | 阻断 / publish checklist |
| 图片重编号 | 删除/新增/重排图片后仍出现旧页码、旧文件或旧封面引用 | 阻断 |
| 图片裁切 | 标题/正文被裁切 | 阻断 |
| 文件存在 | manifest 中图片不存在 | 阻断 |
| Manifest 页序 | 页码不连续、重复、cover 不在首图或 cover 重复 | 阻断 |
| Manifest 字节数 | 缺少真实 bytes 或超过当前 max bytes | 阻断 |
| Manifest 裁切证明 | `cropStatus=overflow` 阻断；`warning/unknown` 只能作为本地 preflight 警告 | 阻断 / 警告 |
| 发布能力 | 无账号/无权限/未登录 | `blocked` / `unavailable` |

## 六、市场实践映射

| 市场能力 | InkForge 映射 |
| --- | --- |
| 秀米生成长图/PDF/视频 | XHS fallback-system：长图/图片页是可发布图文 fallback；PDF/视频仅是离线或非 XHS 正文辅助产物，不作为小红书正文富文本成功证明 |
| 小红书图片页工具 | figure-system：3:4 image pages + layout report |
| 小红书长文编辑器 | 真实账号验证项；本地只能证明 payload 和 artifact，不伪造发布 |
| 微信旗舰 HTML/SVG | 对 XHS 全部降级为图片或纯文本摘要 |
| Redink / 渲染AI | 只借鉴 staged pipeline（outline → cover → content pages）、外置 prompt、manifest/页面一致性思路；不复制代码、提示词、图片素材或生成模板，不作为平台发布证明 |

## 七、验收要求

- 运行 XHS 转换 focused tests，覆盖 HTML、SVG、Markdown 泄漏负例。
- 对图片页/长图运行截图或导出文件存在性检查。
- 浏览器移动视口验证不横向溢出。
- 无真实小红书账号或发布权限时，只能报告本地 artifact 通过和平台发布 `blocked`。

## 八、Source Index

> 3:4、1080x1440、1242x1660、最多 18 图等均来自 2026 市场资料和当前可见入口经验，账号版本、地区、灰度发布和平台策略可能变动。InkForge 必须把这些值作为 configurable/checkable limit 与 publish checklist 项，而不是硬编码为永久常量。

弱来源冲突规则：搜索摘要或第三方文章若声称小红书正文支持 basic HTML、inline SVG、
Markdown 控制符或 135/秀米响应式 wrapper，不得据此放宽“纯文本 + 图片页/海报/长图”合同。
只有真实小红书发布入口、账号权限和最终预览证据能改变 publishable body 规则。

- Xiaohongshu official Community Rules: `https://agree.xiaohongshu.com/h5/terms/ZXXY20221213003/-1`
- Xiaohongshu official community-rules index: `https://ark.xiaohongshu.com/ark`
- Xiaohongshu official creator publish entry: `https://creator.xiaohongshu.com/publish`
- Rednote / Xiaohongshu 3:4 cover market reference: `https://xiaohongshu.oimi.ai/en/blog/xiaohongshu-cover-size`
- Xiaohongshu 2026 image-size market reference: `https://focalflow.app/blog/xiaohongshu-image-guide-2026/`
- Social media aspect-ratio market reference: `https://toolora.info/en/t/social-aspect-ratio-guide/`
- Xiaohongshu 2026 format guide market reference: `https://www.travelofchina.com/how-to-post-on-xiaohongshu/`
- Rednote content guideline market reference: `https://mktgplus.com/130/essential-faqs-for-international-brands-on-xiaohongshu-rednote`
- Redink / 渲染AI XHS workflow reference: `https://github.com/joshua23/redink-xiaohongshu` (concept only; CC-BY-NC-SA-4.0 non-commercial boundary)

## 九、2026-07-27 长文编辑器实测校准

- 当前长文编辑器使用 TipTap / ProseMirror，原始桌面编辑画布约 `896px`；正文
  `16px / 28px`，H1 `24px / 36px, 500`，H2 `20px / 26px, 500`。
- 有序列表基线为 `margin:2px 0 16px;padding-left:18px`，无序列表左内边距约 `16px`；
  引用为 `2px` 左边框、`12px` 左内边距和约 `16px` 下边距。
- 本地 fidelity wrapper 使用 `data-platform-editor="xiaohongshu"`、
  `data-editor-canvas-width="896"` 与 `AlibabaPuHuiTi` / `OPPOSans` 优先字体；不得添加虚构
  圆角营销卡片、渐变、阴影、平台账号或水印。
- “一键排版”进入的是独立多页卡片编辑流程。该流程的视觉结果应由真实 raster/card artifact
  表达，不得把 HTML 预览卡片冒充成小红书可发布富文本。
- `markdownToXiaohongshuText` 的纯文本仍是文本发布权威；3:4 图片页、长图和 manifest 是图文
  发布权威。预览主题只能帮助作者选择样式，不能改变平台不接收 HTML/SVG 正文的合同。
- 用户已取消自动发布测试；账号上传、下一步卡片确认和最终发布由用户手测，自动化不得点击发布。

## 十、Release 产物与平台读回分离

- `releaseArtifactReceipt` 只在最终 release 软件通过可见 Export 入口、原生目录窗口和现有 raster
  writer 写出纯文本、完整 PNG 页组与 manifest，并对实际 bytes 回读后成立。测试 helper 构造的
  manifest、历史图片或 preview DOM 不能替代该门禁。
- `platformReadbackReceipt` 必须绑定上述 exact artifact hash、可见正文/上传 ingress 和目标创作
  surface；通过真实控件粘贴/上传后再读回正文顺序、图片页序与裁切。登录页、上传前预览和本地
  validator 均不能升级为 `platform-editor-rendered`。
- 两条 receipt 可以连接，但不能合并：release 改变时重跑产物 receipt；bytes、ingress 或 target
  改变时外部读回失效。账号登录不可用时保持 `blocked`，`published=false` 独立保留。
