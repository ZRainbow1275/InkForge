# 恢复品牌化渲染设计并重构视觉预设

## Goal

纠正 2026-07-30 原生软件目检发现的视觉偏差：当前七个 VisualVariant 虽然已经能真实渲染，
但仍共用同一套浅色纸张、抬头、标题卡和组件边框骨架，主要通过颜色与局部标记区分，
与仓库中已经批准的七张最终方向板不一致。

本轮在不建立第二套 renderer、不删除任何 preset/组件/功能的前提下，恢复
`Atomic Design System + 7 VisualVariants + 10 ArticleProfiles` 的原始设计：

- 共用可读性、安全、真实数据和平台适配底座；
- 七套分别拥有报头构图、标题比例、正文节奏、组件轮廓、图像装裱和文末签名；
- 16 个微信入口继续可选，并由真实 preset/profile 映射到七套视觉人格；
- 优先完成微信公众号应用内预览与可复制 HTML；小红书、知乎保持本地转换回归，
  发布继续由用户手动测试。

权威视觉输入：

1. `.trellis/tasks/07-29-rendering-visual-system-reconstruction/research/concept-boards/`
   中七套最终方向板；
2. `.trellis/tasks/07-29-rendering-visual-system-reconstruction/prd.md` 的 D1–D15；
3. `.trellis/spec/frontend/visual-variant-system.md`；
4. 用户本轮提供的 11 张原生 `InkForge.exe` 截图和“排版混乱、平庸、缺少品牌感”的否决结论。

## Confirmed Defects

1. `commonVariantCSS()` 同时控制七套 masthead、组件、H4–H6、表格、代码和基础轮廓，
   共享范围超过品牌底座，直接制造同模板换色。
2. `buildMastheadIdentity()` 只在同一个 `<p>` 中重排相同 span，无法表达七套方向板的
   书脊、坐标、剖面、版次、铸场、知识网络和人文双档构图。
3. `AIGC` / `编程创造`、`时事点评` / `新闻`、`整活` / `人生感悟` 等共享 Variant 的
   ArticleProfile 差异过弱，运行时仅有文字或小标记变化。
4. 短文只暴露抬头、H1/H2 和普通段落时，多个预设仍表现为“浅灰标题卡 + 左轨/底线”。
5. 现有自动测试证明结构非空、映射存在和 CSS 字符串不同，但不能拦截“共享骨架换色”。
6. 方向板中的完整语义设计尚未完整传递到引用、表格、代码、图片、时间线、对比、
   数据、图集、来源、歌曲、名片、文章链接、微信媒体和 CC 文末。

## Requirements

### R1. 继续使用唯一现有渲染管线

- 保留 Markdown/TipTap、writing-components、`themes.ts`、Juice、sanitize、SVG 模块、
  三个平台转换器和当前状态存储。
- 不新增 renderer、主题 DSL、数据库表、动态模板执行器或依赖。
- 视觉修复集中在现有 masthead 与 VisualVariant 组合边界。

### R2. 共享底座不得共享版式

- 共同层只负责安全排版、连续正文、字体 fallback、图片宽度、基础表格/代码可读性和
  writing-component 数据真实性。
- masthead、H1–H6、引用、列表、表格、代码、图片、组件和 colophon 的艺术表达由
  Variant 所有。
- 任意两套不能只靠颜色、边框颜色或英文栏目名区分。

### R3. 七套方向必须对照既有最终方向板

- V1 典藏译本：酒红装帧、原文—译文双轨、校勘与版本语言。
- V2 法理坐标：深蓝坐标场、IRAC 轴、权威层级与连续法学正文。
- V3 产业剖面：石墨/黄铜、剖面带、数据口径、价值链与风险披露。
- V4 事实通讯：Kiln 构成主义、纪实石墨、版次/时间码/来源/更正。
- V5 数字铸场：石墨工业场、冷热双端、Mono 锻次、材料—模具—淬炼—锻次。
- V6 知识经纬：Tempera 网络、问题—概念—证据—应用—复盘和回链。
- V7 人文边页：
  - playful 为成熟编辑拼贴、对话节拍与非规则装裱；
  - quiet 为纪实信笺、慢正文、记忆时间线与诗性引文。

方向板中的文章、图片、作者、数字、来源、二维码和媒体只是设计样本，不进入运行时。

### R4. Profile 共享 Variant 但不得视觉同义

- `news` 与 `current-commentary` 共享 V4，但分别强化事实流与观点—证据—反方流。
- `aigc` 与 `software-creation` 共享 V5，但分别强化媒体/Prompt 与代码/版本/构建。
- `playful` 与 `life-reflection` 共享 V7，但必须有不同构图密度和正文节奏。
- 旧 preset ID 继续作为 profile/强度/兼容入口，不删除、不重命名。

### R5. 完整语义覆盖

七套均需为以下真实内容提供专门样式或诚实 fallback：

- 报头、可选歌曲、真实标题/分类/阅读时间/字数；
- H1–H6、普通段落、strong、em、del、链接、行内代码；
- 有序/无序/任务/嵌套列表、引用、分隔线、脚注、来源；
- 表格、代码块、KaTeX、Mermaid、图片、题注；
- Timeline、Compare、Stat、Gallery、Citation、Song、Author/Profile、Article/Link、
  Image、ContactCard、WechatMedia；
- 作者、参考资料、CC 协议、延伸链接、InkForge colophon。

缺少真实字段时省略或输出已有的显式 fallback，不生成占位作者、假数字、假来源或假媒体。

### R6. 微信安全与阅读优先

- 普通段落保持连续阅读，不把每段包装成卡片、轨道、色块或多重边框。
- 390px 等效画布、14px 基准下保持约 22 个中文字符/行；不扩大无意义边距。
- 最终 HTML 不依赖外链 CSS、脚本、事件、伪元素、定位式正文、复杂 flex/grid、
  渐变、滤镜、mask、长文本 SVG 或市场编辑器残留。
- 可编辑长文本使用普通 HTML；SVG 只承担短几何和安全图形。
- 用户 Typography 继续在七套中真实生效且不产生浅底浅字。

### R7. 原生软件视觉验收

- 最终验收使用当前 Release `InkForge.exe` / Tauri WebView2，不用浏览器页面冒充。
- 同一真实文稿一次生成七套首屏/中段/文末 contact sheet，不再要求用户逐套等待。
- 短文、长文、组件丰富文稿均从本机真实数据动态选择；仓库不保存私有正文。
- 视觉验收和安全/测试验收分开记录。

## Acceptance Criteria

- [ ] AC-1：七套 masthead 拥有不同 normal-flow DOM 结构指纹和独占 hook，不是同一 `<p>` 重排。
- [ ] AC-2：七套普通正文在去掉颜色后仍可通过构图、字级、节奏与标题结构辨认。
- [ ] AC-3：七套与对应方向板在首屏轮廓、视觉重心、标题比例和领域母题上可直接对应。
- [ ] AC-4：`news/current-commentary`、`aigc/software-creation`、`playful/life-reflection`
  各自具有可见且数据真实的 profile 差异。
- [ ] AC-5：16 个微信 preset 全部保留、可选、即时预览并映射稳定。
- [ ] AC-6：普通段落为透明、无边框、无逐段 padding 的连续阅读流。
- [ ] AC-7：H1–H6、引用、列表、表格、代码、公式、图片和全部现有写作组件均有
  Variant 主题化样式或诚实 fallback。
- [ ] AC-8：真实标题、分类、阅读时间、字数、歌曲和组件字段只从真实输入生成；
  缺失时无假数据。
- [ ] AC-9：390px 等效画布无横向裁切、重叠、异常大空白或小于可读阈值的关键标签。
- [ ] AC-10：复制微信富文本后的安全检查通过，未引入第三方 DOM/资产、远程信标或不支持 CSS。
- [ ] AC-11：小红书、知乎现有本地转换回归通过；不执行或声称平台发布。
- [ ] AC-12：目标 Vitest、export 全量、ESLint、`vue-tsc`、生产构建和 application preflight 通过。
- [ ] AC-13：真实 Release 软件完成七套 contact sheet 目检；没有两套只换色或共享同一骨架。
- [ ] AC-14：docs/spec 记录结构指纹、视觉规则、微信安全边界和仍需用户手测的外部门禁。

## Constraints

- 不删除任何现有功能、模块、组件、preset 或用户数据。
- 不提交临时截图、账号态、Cookie、Token、浏览器 profile、HAR 或私有文章内容。
- 不使用 mock、生成图或字符串断言冒充原生视觉完成。
- 不自动发布、同步、定时发送或操作微信公众号、小红书、知乎账号。
- 精确修改和精确验证；保护当前大量 unrelated dirty changes。
