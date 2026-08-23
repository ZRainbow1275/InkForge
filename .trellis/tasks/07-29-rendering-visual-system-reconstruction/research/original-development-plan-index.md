# InkForge 渲染视觉重制：原始开发计划权威索引

## 0. 首要修正：Atomic + 7 Variants

首要权威来源是：

`SystemPrompt/System Prompt.md`

该文件已完整读取 1–421 行，并明确规定：

- 10 类文章；
- 一套原子化设计系统；
- 7 种变体覆盖十类文章；
- 数字构成主义、先锋主义、社会主义现实主义与现代人文融合；
- 法学研讨和新闻各有独立变体；
- 14px、每行至少 22 字，另一处目标约 25 字；
- 避免大留白和过大字号；
- 先解决风格，再处理动画；
- 微信真实预览高于 135 编辑器内预览。

因此，本文以下 4 月、5 月、6 月计划全部是该原始决定的后续补充。此前把“24 个运行时预设各做一套独立刊物”写成总架构是错误的；正确目标是用一个 Atomic System 组合出七种艺术指导，再覆盖十类文章和三个平台。

七变体恢复过程、直接证据和待确认映射见：

`research/atomic-seven-variant-recovery.md`

## 结论

此前有两层偏差：

1. 把原始“Atomic + 7 Variants”漂移成 3 个基础主题 + 10/12 个颜色参数预设；
2. 又把 2026-06 的“微信公众号安全 SVG 与三套旗舰”当成整个渲染视觉计划。

后者只是增量能力，前者则是当前同质化的架构根因。

完整计划的层级是：

1. 最初定义 Atomic Design System + 7 Variants + 10 Article Profiles；
2. 4 月定义渲染产品、平台隔离和视觉底座；
3. 5 月再次发现预设同质化并要求恢复强视觉身份；
4. 5 月真实长文审计证明结构合规远低于视觉完成；
5. 6 月增加 SVG、旗舰元素库和市场编辑器规则转译；
6. 当前任务必须把这些能力重新装回原始 Atomic + Variant 架构。

## A. 产品总契约

### `prompts/0420/specs/04-prd-rendering.md`

权威条款：

- “一源万态——从一段 Markdown 到任何平台，都值得被精雕细琢。”
- 编辑器、预览、导出和跨平台发布产物必须语义一致、视觉可控。
- 微信、小红书、知乎等平台只共享 Markdown 输入与权威 AST，不共享中间 HTML。
- 公式、Mermaid、代码、图片等必须有真实输出和可诊断 fallback。

对本任务的含义：

- 不能用微信 HTML 复制出三个平台；
- 不能为了视觉效果污染 Markdown 权威源；
- 预设要表达同一设计意图，但必须按平台重新编排。

## B. 视觉底座

### `docs/inkforge-brand-identity.md`

该文件已完整读取 1–1442 行，是当前 InkForge 品牌层权威：

- Ink（墨）× Forge（锻造）是产品叙事；
- 品牌人格是温暖的精确、东西桥接、匠人品质、沉稳自信；
- 文章侧使用 Graphite / Kiln / Tempera / Amber / Vellum 锻造光谱；
- 当前正式标志是“墨滴 · 笔锋 · 铁砧 + Forged Red 火种”；
- 锻线、章节数字、冷热呼吸、装裱式图片、品牌化表格和 colophon 是正文接触点；
- 微信端使用 inline 样式、flow layout、真实 DOM 装饰，最大内容宽度 677px。

同目录历史段落及旧任务中出现过已退役的 Forge Nib、鼎格 / vessel mark。它们不能覆盖文档第 9 节明确更新后的当前标志。

对本任务的含义：

- 共同品牌 DNA 不是通用数字人文蓝，更不是七套共用同一版式；
- 正式标志、锻造光谱和品牌人格是少数不变量；
- 报头、章节节奏、组件轮廓、信息流和领域母题由七个 Variant 独立决定；
- 生成图无法在微信安全原语中落地时，方案本身判为不通过。

### `prompts/0420/specs/20-theme-font-typography-spec.md`

权威条款：

- `Ethereal Constructivism` 为冻结的品牌底座；
- 纸张区域需要 Typora / iA Writer 式阅读品质；
- 中英文独立字体链、Typography 参数和主题 token 是系统能力；
- 禁止 Emoji，禁止孤立的设计语汇，禁止散落硬编码；
- 应用外壳主题与编辑内容主题分轨。

对本任务的含义：

- 渲染预设不是 App Chrome 主题；
- 每套内容预设可独立艺术指导，但要继承排版纪律、token 体系和纸张品质；
- 不应把同一个方格、菱形、印章强行盖到所有版面上。

## C. 全部预设的原始视觉验收线

### `.trellis/tasks/archive/2026-05/05-23-preset-typography-overhaul/prd.md`

这是本轮“每一个版面都太丑”最直接的原始产品计划。

原定目标：

- 所有既有预设都要“眼前一亮”；
- 每个预设有独立视觉锚点；
- 用户每次切换都产生 Aha 感；
- 只有标题与一句正文时仍能识别气质；
- 中英文排版、行长、字体对和装饰节奏都要被专门设计；
- 不增加新 ID，优先把现有预设做完整。

原定验收：

- 同一 Markdown 在 3 秒内可区分；
- 每套至少有多个独特视觉特征；
- 预设身份不能只在特殊组件出现。

失败原因：

- 当时把“不同颜色 + persona 基础 CSS + 2–4 个装饰 recipe”判成通过；
- 没有逐张完整长文进行艺术评审；
- 没有用统一完整 specimen 比较全部语义；
- screenshot 归档甚至没有完整自动完成；
- 因此代码条件通过了，视觉目标没有通过。

## D. 真实长文视觉失败证据

### `.trellis/tasks/archive/2026-07/05-26-render-wechat-fidelity-test/fidelity_report.md`

核心证据：

- 微信合规 10/10，但 UX polish 只有 5/10；
- H1/H2 装饰无法覆盖实际只使用 H3/H4 的真实文章；
- 标题层级坍缩，长文没有路标；
- 200 多个 `strong` 造成强调密度过载；
- CJK 字体顺序、移动边距、表格、暗黑模式仍有问题；
- 真实长文没有触发的代码、公式、图片、引用等分支，不能被宣称为已验收。

### `.trellis/tasks/archive/2026-07/05-26-render-wechat-fidelity-test/research/v5-visual-audit.md`

核心证据：

- 目录卡 60%–83% 为空；
- 引用 SVG 的正文只占卡片约 4%；
- 高 viewBox 配合隐藏动效制造了“看起来坏掉”的大空白；
- 小字、细线和 SVG 缩放后跌到不可读或亚像素；
- 不工作的点击提示比无交互更差。

对本任务的含义：

- 任何视觉验收都必须包含真实长文；
- 必须量化空白、文字占比、字号、层级比例和裁切；
- “DOM 有元素”不等于用户看到了有效设计。

## E. 微信安全 SVG 与旗舰增量

### `.trellis/tasks/archive/2026-07/06-01-multiplatform-render-svg/prd.md`

该任务定义：

- 微信使用参数化安全 inline SVG；
- 小红书转为图片 / 海报；
- 知乎使用语义 Markdown / 图片 fallback；
- 保留所有既有预设；
- 增加三套旗舰；
- 不重构主管线。

它没有取代全预设艺术指导。其“非旗舰预设零行为改动”恰好说明它只覆盖旗舰增量。

### `research/enhancement-brief.md`

最重要的根因判断：

- 90% 的正文仍是普通 Markdown；
- 设计困在透明 SVG 和亚像素细线里；
- 最大杠杆是可重排的 inline HTML 内容块；
- SVG 应负责几何与图形，不承载长正文。

### `research/impl-bold-magazine-direction.md`

第一轮方向：

- 加重封面、满幅色块、巨号和反白；
- 解决“太素”；
- 但容易形成通用重型杂志模板。

### `research/impl-brand-system-round2.md`

第二轮方向：

- 引入“铸字 × 构成主义 × 金石印章”；
- 形成墨铸识别；
- 仍只覆盖旗舰预设。

### `research/impl-constructivist-structure-round3.md`

第三轮方向：

- 将方格、菱形、构成主义贯穿 H2/H3/引用/列表；
- 解决普通“色条 + 左边框”同质化；
- 但三旗舰又趋向共享同一几何母题。

### `research/impl-element-library-round4.md`

第四轮方向：

- 将阅读条、目录、金句、数据、图片框变成规则；
- 为编辑器插入组件建立 marker 和装饰器基础。

### `research/impl-element-library-round5.md`

第五轮方向：

- 扩展横幅、折叠、时间线、对比、数据和动效；
- 证明元素库继续增长；
- 同时暴露“隐藏但占高”“交互在渠道中不可靠”等风险。

### `.trellis/spec/frontend/flagship-element-catalog.md`

当前可复用基础：

- 元素分类、trigger、平台 artifact、safety、idempotency、fallback；
- 微信安全 HTML / SVG；
- XHS 图片页 / 长图；
- Zhihu Markdown / 图片；
- 135 / 秀米只能作为分类和工作流参考，禁止复制模板。

## F. 当前运行时事实

当前源码注册：

- `themes.ts`：16 个微信入口；
- `xiaohongshu.ts`：5 个小红书预设；
- `zhihu.ts`：3 个知乎预设；
- 合计 24 个运行时预设入口。

其中：

- `flagship-kiln-paste-safe` 很可能是渠道兼容变体，而不是新的刊物人格；
- 该判断必须在 Grill Me 中明确，不得通过删除或静默合并解决。

## G. 本轮应怎样纠偏

1. 先建立每套预设的艺术指导，不先写 CSS。
2. 用完整语义 specimen 而非单个标题验收。
3. 用 GPT Image 2 生成概念板和批评板，不把生成图当产物。
4. 正文节奏先于 SVG 数量。
5. 三平台独立排版，但保留同一刊物人格的设计意图。
6. 在原生 Tauri 软件中做最终视觉验收。
7. 用 contact sheet 比较所有预设，直接淘汰“只有换色”的方案。
8. 任何视觉通过都要有真实长文、短文、组件全集和平台产物四类证据。
