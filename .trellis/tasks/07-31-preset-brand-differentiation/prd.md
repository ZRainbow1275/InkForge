# 同品牌多版式差异化渲染

## Goal

在保留 InkForge 可识别品牌 DNA 的前提下，使微信公众号的每一个可选排版预设都成为
独立设计，而不是七套大类或十个内容 Profile 之间继续共用骨架、只替换颜色和栏目文字。

本任务是
`.trellis/tasks/07-30-brand-rendering-design-recovery/`
的视觉差异化子任务。它不建立第二套渲染器，不改变真实内容模型，也不删除任何 preset、
组件或平台能力；只在现有 `VisualVariant + ArticleProfile + legacy preset` 映射中完成
“同一品牌、不同出版物”的艺术指导。

## Confirmed Facts

1. 当前唯一渲染链已经能在 release `InkForge.exe` / Tauri WebView2 中输出真实微信预览。
2. 七个 VisualVariant 已有各自的方向板和领域母题，但共享 Variant 的多个 preset/Profile
   仍可能运行时同构。
3. 用户最新目标优先级高于笼统“统一风格”：品牌元素必须保留，但每一版必须有不同设计。
4. 微信共有 16 个现有 preset；小红书、知乎本轮只保持本地转换回归，发布由用户手动测试。
5. 真实原生验收已确认画布约 390px、正文约 22 字/行且无横向溢出；这些可读性基线不能因
   差异化而退化。

## Requirements

### R1. 品牌 DNA 统一但不共享构图

所有预设必须共同保留：

- InkForge 的编辑出版气质、克制精确的线条与层级；
- 固定品牌微签名“文章值得您享受”及真实 InkForge colophon；
- 安全的 CJK serif/sans/mono 字体回退、390px 阅读宽度和连续正文；
- 真实标题、分类、阅读时间、字数、作者、来源、CC 与组件字段；
- 现有微信安全内联规则、SVG 安全规则和内容完整性。

上述共同点只能形成品牌识别，不能形成统一卡片、统一左轨、统一标题框或统一 masthead。

### R2. 16 个微信 preset 均具有独立视觉指纹

每个 preset 至少在以下六个维度中的三个维度与其他任一 preset 不同：

1. masthead 构图与视觉重心；
2. H1/H2/H3 的比例、方向和章节编号语言；
3. 正文缩进、段间节奏和引导方式；
4. 引用、列表、表格、代码和图片的轮廓；
5. writing components（时间线、对比、统计、图集、来源、歌曲、名片、文章链接、微信媒体）
   的视觉容器；
6. 分隔线、CC、延伸链接和 colophon 的收束方式。

去掉颜色值后，任意两套仍必须能通过结构、比例和节奏辨认。

### R3. 共享 Variant 的 preset 必须显著分化

- `时事点评`：观点—证据—反方的评论构图；`新闻`：版次—来源—时间的事实流构图。
- `AIGC`：模型、Prompt、媒体输出的实验场；`编程创造`：终端、版本、构建流水；
  `科技`：电路、规格、工程说明。
- `整活`：成熟编辑拼贴和强节拍；`人生感悟`：纪实信笺和慢阅读；`优雅`：典籍页、
  章号与精细留白。
- 赤陶、赤陶兼容、铜绿、黄铜旗舰继续保留各自 SVG/安全强度和旗舰装帧，不能退化成基础
  preset 的换色副本。

### R4. 完整语义表面服从各 preset 的艺术指导

差异化必须同时覆盖真实短文与完整文章中会出现的 H1–H6、普通段落、strong、em、del、
链接、行内代码、列表、引用、表格、代码块、公式、Mermaid、图片、题注、脚注、来源、
所有现有 writing components、作者、CC 和文末链接。

普通正文仍是透明、无边框、无逐段 padding 的连续阅读流；缺少真实字段时省略或显示既有
诚实 fallback，不生成假作者、假数字、假来源、假图片或假平台信息。

### R5. 使用现有管线完成最小根因修复

- 保留 `themes.ts`、`visual-variants.ts`、`buildReadingTimeHeader()`、writing-component
  registry、decorators、Juice、sanitize 和三个平台 adapter。
- 使用已有 `presetId` / `ArticleProfile` 作为差异化输入，不新增 renderer、主题 DSL、
  store、数据库字段、依赖或运行时图片资产。
- `commonVariantCSS()` 只承担安全和可读性底座；艺术构图归各 Variant/Profile/preset。

### R6. 原生软件逐套验收

- 最终只以 release `InkForge.exe` / Tauri WebView2 作为视觉完成证据。
- 同一篇通过应用真实 Pinia/持久化链创建的验收文稿，逐一生成 16 套首屏，并对代表预设
  检查中段、组件和文末。
- 验收文稿只陈述本项目排版事实，不伪造外部数字、作者、来源或平台身份。
- 临时截图存系统临时目录，不提交账号态、私有正文、Cookie、Token、HAR 或 profile。

## Acceptance Criteria

- [x] AC-1：16/16 微信 preset 均保留、可选、可预览，ID 和名称未删除或重命名。
- [x] AC-2：16 套最终 CSS/DOM 结构指纹在去掉颜色和固定文案后仍唯一。
- [x] AC-3：任意两套至少有三个不同视觉维度，不存在同 masthead + 同标题卡 + 同正文节奏。
- [x] AC-4：七个 VisualVariant 与既有最终方向板在视觉重心和领域母题上可对应。
- [x] AC-5：`时事点评/新闻`、`AIGC/编程创造/科技`、`整活/人生感悟/优雅` 原生首屏可
  一眼区分。
- [x] AC-6：所有预设共同保留 InkForge 品牌微签名、colophon、真实 metadata 和可读性底座。
- [x] AC-7：H1–H6、引用、列表、表格、代码、图片及全部现有 writing components
  均有 preset/Variant 主题化表现或诚实 fallback。
- [x] AC-8：390px 等效画布无横向溢出、重叠、浅底浅字、异常大空白；正文约 18–24 字/行。
- [x] AC-9：复制微信富文本后的内联 HTML 仍满足安全、幂等和内容完整性检查。
- [x] AC-10：目标测试、export 串行回归、ESLint、`vue-tsc`、生产构建和 application
  preflight 通过。
- [x] AC-11：真实 release 软件完成 16 套截图目检；自动结构测试不得替代视觉结论。
- [x] AC-12：小红书、知乎现有本地转换回归通过；不执行或声称平台发布。

## Out of Scope

- 新增或删除 preset、VisualVariant、ArticleProfile 或 writing component；
- 重构编辑器、状态管理、数据模型或平台发布系统；
- 自动登录、上传、同步、定时发送或发布到微信公众号、小红书、知乎；
- 把 135、秀米或其他市场编辑器的 DOM、素材、账号数据复制进 InkForge。

## Constraints

- 不删除任何现有功能、模块、组件或用户数据。
- 不使用 mock、假数据、浏览器网页截图或字符串断言冒充原生完成。
- 不提交临时视觉证据和敏感运行时文件。
- 精确修改当前渲染文件，保护工作树中大量 unrelated dirty changes。
