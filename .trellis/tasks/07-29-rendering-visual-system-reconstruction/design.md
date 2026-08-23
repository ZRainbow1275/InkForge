# Technical Design — 全类型渲染视觉系统重制

## 1. Status and authority

本设计将以下输入收敛为一个可实施方案：

1. `SystemPrompt/System Prompt.md` 的原始决定：一套 Atomic Design System、七个 Variant、十类 Article Profile；
2. `docs/inkforge-brand-identity.md` 的当前品牌身份；
3. 本任务 `prd.md` 中 D1–D15 的产品决定和七套最终方向板；
4. 现有 16 个微信、5 个小红书、3 个知乎运行时入口；
5. 已完成的真实渲染根修复、完整语义基线、文章抬头和写作组件链；
6. `.trellis/spec/frontend/wechat-svg-modules.md` 与 `flagship-element-catalog.md` 的平台安全约束。

本文件只定义技术边界、数据流、兼容策略和验收形状。概念板是艺术指导输入，不是运行时资产或完成证据。

## 2. Design outcome

### 2.1 One sentence

在现有导出注册表、CSS 双轨、recipe/decorator、写作组件和平台适配器之上，增加一个很薄的“七 Variant / 十 Article Profile”权威映射，并把现有预设的正文、首尾与语义组件升级为七套可辨识艺术指导；不建立第二套渲染器。

### 2.2 Non-goals

- 不删除、重命名或静默合并任何现有 preset ID、SVG 模块、写作组件或平台能力；
- 不复制 7 份完整 renderer，也不创建 24 份独立 CSS 系统；
- 不把应用 Chrome 的 `visual-system` 主题和文章排版主题混为一体；
- 不让 GPT Image 2 产物进入运行时；
- 不自动发布、同步、定时发送或操作小红书、知乎、微信公众号账号；
- 不复制 135、秀米、doocs/md 的模板、专有资产或私有实现；
- 不为未来假设需求设计通用页面 DSL、插件协议或远程主题市场。

## 3. Current runtime baseline to reuse

### 3.1 Existing registries

| Runtime source | Current facts | Reuse decision |
|---|---|---|
| `services/export/themes.ts` | 16 个微信 ID；`previewCSS` / `exportCSS` 双轨；`decorate`；`visualSignature`；`composeRecipes` 与 `chainDecorators` | 继续作为微信 preset 与最终 CSS/decorator 事实源 |
| `services/export/xiaohongshu.ts` | 5 个小红书 ID；独立 wrapper、CSS 和 decorator | 继续作为小红书平台适配器，不接收微信最终 HTML |
| `services/export/zhihu.ts` | 3 个知乎 ID；独立语义长文输出 | 继续作为知乎平台适配器，不接收微信 wrapper |
| `services/export/index.ts` | `getPlatformPresets()` 与三平台转换入口 | 保持公共入口和向后兼容 |
| `services/export/preset-decorations.ts` | recipe 注册表、组合器和幂等 decorator 链 | 扩充现有配方，不建立并行 recipe engine |
| `services/export/svg-modules/*` | 微信安全 SVG、可重排 HTML block、图片页与 fallback | 复用已验证原语；SVG 不承载长正文 |
| `services/writing-components.ts` | Zod 注册、18 类内置组件、真实字段、稳定 JSX、平台渲染 | 直接消费；本任务不再创建组件注册表 |
| `services/visual-system/*` | 应用外观和 Typography token | 只复用字体与排版 token，不把 App Chrome 皮肤当文章 Variant |

### 3.2 Already-completed foundations

相邻任务已经实现并验证以下基础，本任务不得重复：

- Tauri/WebView2 主题样式可见；
- 375px 下 22 个 CJK 字/完整行的共享排版基线；
- 文章抬头的真实阅读时间、真实类别、可选真实歌曲与幂等注入；
- H1–H6、强调、列表、表格、代码、公式、引用、图片等完整语义基线；
- `MpProfile`、`AuthorBlock`、`QRCodeBlock`、`TipBlock`、`InfoGrid`、`TableBlock`、`TimelineBlock`、`CompareBlock`、`StatBlock`、`GalleryBlock`、`CitationBlock`、`SongBlock`、`ImageBlock`、`LinkBlock`、`ArticleBlock`、`ContactCard`、`WechatMediaBlock`；
- TipTap 原子节点、JSX 往返、Stage 与 `/组件` 入口；
- XHS/Zhihu 本地安全 fallback。

本任务只改变这些能力如何被七种艺术指导组织、着色和排布。

## 4. Minimal canonical model

### 4.1 IDs

只新增两个稳定、封闭的 ID 集合：

```ts
type VisualVariantId =
  | 'critical-translation'
  | 'jurisprudence-atlas'
  | 'industry-section'
  | 'fact-wire'
  | 'machine-foundry'
  | 'knowledge-weave'
  | 'human-margins'

type ArticleProfileId =
  | 'thesis-translation'
  | 'legal-study'
  | 'industry-report'
  | 'current-commentary'
  | 'aigc'
  | 'software-creation'
  | 'study-notes'
  | 'news'
  | 'playful'
  | 'life-reflection'
```

它们只表达设计意图，不替换平台 preset ID。

### 4.2 One small registry, not a new renderer

新增一个只读 `as const` 注册表，保存：

- Variant 的稳定 ID、中文名和默认 Article Profile；
- Article Profile 到 Variant 的默认映射；
- 24 个现有平台 preset ID 到 Variant / 强度 / 兼容用途的映射；
- 供 UI 展示的 `PresetVisualSignature`；
- 平台可用性和 fallback 说明。

注册表不保存任意模板语言、不执行脚本、不动态加载代码。实际 CSS、HTML、SVG 和图片页仍由现有平台文件与 decorator 生成。

### 4.3 Selection state

```text
current article
  + selected VisualVariantId
  + selected ArticleProfileId
  + optional legacy platform preset override
  -> platform recipe resolution
```

- 新文稿按 Article Profile 选默认 Variant；
- 用户可以独立切换 Variant，不改变文稿内容；
- 旧文稿若没有 Variant，只从当前保存的微信 preset ID 推导一次默认值；
- 旧的微信、小红书、知乎 preset ID 继续保存和读取，作为兼容/平台覆盖；
- 不重写 Markdown，不迁移组件 JSX，不清空用户设置；
- 未识别旧值回退到当前平台默认值并记录可诊断信息，不抛弃原值。

## 5. Rendering data flow

```text
Markdown / TipTap authoritative content
          │
          ├─ strict writing-component parse + Zod validation
          │
          └─ canonical Markdown/AST/semantic HTML
                         │
         VisualVariant + ArticleProfile + platform override
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
      WeChat            XHS              Zhihu
 existing HTML      existing text/     existing clean
 + Juice path       poster/cards       Markdown/HTML
        │                │                 │
 shared baseline    native page        semantic longform
 + variant recipe   recomposition       + variant recipe
 + profile blocks   + image fallback    + image fallback
        │                │                 │
 safety/readback    artifact checks     artifact checks
```

### 5.1 WeChat order

1. 将 Markdown/组件转换为经过信任边界校验的语义 HTML；
2. 选择现有 preset 兼容入口和对应 Variant 配方；
3. 合并共享排版基线、Variant CSS 和用户 Typography；
4. 通过现有 Juice 路径内联样式；
5. 对可信、已净化内容执行 Variant decorator，恰好一次；
6. 追加真实文章抬头、适用组件和文末；
7. 执行微信安全、空白、几何、图片和源码检查；
8. 应用内预览、复制、导出和发布中心消费同一结果。

### 5.2 Xiaohongshu

- 复用 `xiaohongshu.ts`、文本引擎和图片页切片器；
- 同一 Variant 共享色彩角色、字体层级、母题和叙事节奏，但重新编排为封面、信息页、正文页、数据页、图集页和文末页；
- 不把微信 `#nice` wrapper、inline SVG 或公众号 HTML 直接传入；
- 旧的 5 个 XHS ID 只选择平台兼容外观，不限制七 Variant；
- 本轮只证明本地真实图片/文本产物，发布由用户手测。

### 5.3 Zhihu

- 复用 `zhihu.ts` 与 `zhihu-markdown.ts`；
- 优先语义标题、段落、引用、表格、代码、公式、图片与来源；
- 复杂 SVG 组件转为带替代文本的真实图片 fallback；
- 旧的 3 个 Zhihu ID 是平台兼容基线，Variant 决定上层艺术指导；
- 不输出微信 wrapper，不声称账号发布成功。

## 6. Brand DNA versus Variant ownership

### 6.1 Shared brand layer

所有 Variant 共享且只能共享：

- 当前正式 InkForge 标志；
- Graphite、Kiln、Tempera、Amber、Vellum 的角色意义；
- 宋 / 黑 / Mono 字体职责；
- “温暖的精确、东西桥接、匠人品质、沉稳自信”；
- 可读性、真实数据、图片题注、来源和 colophon 纪律；
- 真实 DOM 装饰、微信安全 SVG 和平台 fallback 契约。

### 6.2 Variant-owned layer

每套独立拥有：

- 报头和封面构图；
- 标题比例与章节节奏；
- 正文缩进、留白、强调预算和信息密度；
- 引用、列表、表格、代码、图片、时间线等组件轮廓；
- 领域母题和短 SVG 几何；
- 图像裁切、装裱和题注方式；
- 文末节奏与结束标；
- XHS 页序与 Zhihu 降级方式。

不得把同一封面、H2、引用卡和结束标换色后分配给七套。

## 7. Seven Variant recipes

| Variant | Palette and type | Masthead / body rhythm | Component signatures | Closing |
|---|---|---|---|---|
| V1 Critical Translation | Vellum + Oxblood + Cobalt；宋体正文、Garamond 拉丁、Mono 校勘 | 典藏译本报头；原文与译文双轨；长段落克制分栏后在窄屏顺序重排 | facsimile 图版、译注、术语表、版本谱系、论点—证据、交叉引用 | 译者/校者、版本说明、参考文献、CC |
| V2 Jurisprudence Atlas | Cobalt + Graphite + Vellum；法学宋体与理性 Sans | 法理坐标报头；IRAC 纵轴贯穿；连续正文，卡片只服务边界与比较 | 法条、判例、权威层级、证据链、多数/异议、引证网络 | 裁判要旨、权威来源、未决问题、CC |
| V3 Industry Section | Graphite + Amber + Tempera；高价值财经宋体与数字 Sans | 产业剖面封面；价值链/情景带穿插长文；结论与正文有明确呼吸 | KPI、统计、价值链、情景、风险、决策窗口、图表口径 | 结论、风险披露、数据来源、方法、CC |
| V4 Fact Wire | Kiln + Graphite + Amber；强标题 Sans 与纪实宋体 | 铸红构成主义大封面；新闻与时评两种节拍；纪实图像承担人文重量 | 5W1H、事实状态、来源节点、更新时间、勘误、论点/反方/不确定性 | 来源账本、更新时间、更正、编辑说明、CC |
| V5 Machine Foundry | Graphite + Kiln + Cobalt；Sans + Mono | 数字铸场报头；材料—模具—淬炼—锻次构建轨；正文仍是出版物 | Prompt、代码、Diff、模型、版本、资产、benchmark、故障 fallback | 构建信息、版本、证据、复现步骤、CC |
| V6 Knowledge Weave | Tempera + Cobalt + Kiln；人文 Sans/宋体 | 知识经纬封面；解释正文 + 页边注在窄屏顺序化；回链贯穿 | 问题、概念、证据、应用、复盘、费曼说明、正反例、复习与知识图 | 知识索引、回链、下一步、来源、CC |
| V7 Human Margins | playful: Kiln/Cobalt/Amber；quiet: Graphite/Vellum/Tempera | playful 为成熟编辑拼贴和对话节拍；quiet 为纪实信笺和缓慢正文 | 真实梗图位、对话、信件、回忆时间线、诗性引文、非规则装裱 | 人类脉冲线、作者小记、相关内容、品牌 colophon |

### 7.1 Profile-specific modes

- V4：`news` 使用事实流；`current-commentary` 使用观点、证据、反方和不确定性；
- V5：`aigc` 强调媒体、Prompt 和模型；`software-creation` 强调代码、版本、构建和复现；
- V7：`playful` 与 `life-reflection` 只共享人文底色和品牌结束，不共享密度。

## 8. Semantic component use

### 8.1 Existing components are the only content model

时间线、对比卡、数据统计卡、图集、引文来源、歌曲、名片、文章链接、图片和微信原生媒体描述全部使用现有 `writing-components.ts` 注册表。Variant 只能改变其视觉表达，不能另造字段或把数据硬编码进 CSS/SVG。

### 8.2 Data truth rules

- 标题、正文、作者、来源、日期、单位、统计口径、图片和平台信息来自文稿或用户输入；
- 阅读时间可以从当前真实正文计算；
- 歌曲、二维码、媒体 ID、名片、文章链接和图片必须字段完整才输出；
- 缺字段时隐藏该组件或显示编辑器内可恢复错误，不在导出结果中填示例；
- 图表同时要求标题、口径、单位、时间范围和来源；
- 生成图中的文字、人物、数字、二维码和媒体均不得复制；
- 微信原生媒体无法由本地 HTML 可靠生成时，输出明确静态 fallback 或“待平台插入”元数据，不做假播放控件。

### 8.3 Profile recommendations, not forced content

每个 Article Profile 可以推荐组件，但不能自动虚构组件：

| Profile | Recommended components |
|---|---|
| 论文翻译 | CitationBlock、TableBlock、ImageBlock、ArticleBlock、AuthorBlock |
| 法学研讨 | TimelineBlock、CompareBlock、CitationBlock、TableBlock |
| 行业研报 | StatBlock、TableBlock、CompareBlock、GalleryBlock、CitationBlock |
| 新闻 / 时评 | TimelineBlock、CitationBlock、ImageBlock、LinkBlock |
| AIGC | GalleryBlock、ImageBlock、CompareBlock、StatBlock、LinkBlock |
| 编程创造 | TipBlock、TableBlock、CompareBlock、ArticleBlock、LinkBlock |
| 学习笔记 | InfoGrid、TimelineBlock、TipBlock、ArticleBlock |
| 整活 | GalleryBlock、ImageBlock、SongBlock、LinkBlock |
| 人生感悟 | SongBlock、ImageBlock、CitationBlock、AuthorBlock |

## 9. WeChat implementation budget

### 9.1 Allowed

- semantic HTML and real DOM decoration nodes;
- inline `style`;
- normal flow, block/inline-block and conservative tables;
- solid backgrounds, borders, padding, margin and text alignment;
- `<img>` with real alternative text and captions;
- safe SVG `path` / `rect` / `circle` / `line` with explicit solid colors;
- short SVG labels only when HTML cannot express the geometry;
- existing sanitizer, Juice, compliance and idempotency sentinels.

### 9.2 Not allowed as a visual dependency

- external stylesheet, class-dependent behavior or scripts;
- pseudo-elements surviving into final WeChat output;
- fixed/absolute positioning for article layout;
- complex grid/flex, transforms, filters, masks, glass effects or gradient-dependent identity;
- `foreignObject`, external resources or event handlers in SVG;
- long CJK paragraphs, citations, tables or lists inside SVG;
- fake expand, play, hover, realtime, swipe or progress behavior;
- hidden animation states that reserve large blank height.

### 9.3 Responsive geometry

- primary checks: 375px, 393px and 677px;
- no horizontal article or SVG overflow from 320px through 677px;
- body target: readable 16px-class output, 22–25 CJK chars/line depending on actual glyphs and user Typography;
- no decorative empty area exceeding its content purpose;
- minimum visible label size and line thickness must survive WebView2 and WeChat scaling;
- `prefers-reduced-motion` and static fallback remain valid.

## 10. UI and persistence

### 10.1 One canonical choice

- 工作台、主题页、导出弹窗和发布中心读取同一 `VisualVariantId`；
- 平台切换不重置 Variant，只重新解析平台配方；
- 旧平台 preset 选择保留为兼容/高级覆盖，不再被描述为新的文章人格；
- Variant 卡展示真实 `PresetVisualSignature`，不展示无法由运行时产生的概念图特征；
- 组件插入继续走现有 Stage 和 `/组件`，不增加第二个组件库。

### 10.2 Migration

- 新设置缺失：从现有微信 preset ID 按 PRD R6 映射；
- 映射失败：使用当前默认 preset 对应 Variant，同时保留原始值用于诊断；
- 已有 preset、文章、分类、素材、组件、Typography、自定义组件和导出设置不变；
- 不执行批量文章迁移；
- 不新增依赖。

## 11. Verification design

### 11.1 Automated structural corpus

一份完整语义 corpus 覆盖：

- H1–H6、连续正文、strong/em/del、行内代码和链接；
- 无序、有序、嵌套、任务列表；
- 引用、金句、脚注、来源、分隔；
- 表格、代码、KaTeX、Mermaid；
- 图片、题注、图集；
- 时间线、对比、统计、callout；
- 全部适用写作组件；
- 文章抬头和文末。

该 corpus 只证明结构、安全、幂等和样式覆盖，不证明真实视觉或外部平台成功。

### 11.2 Real local article corpus

最终验收从当前本机真实数据库动态选择：

1. 字数最多的有效长文；
2. 字数最少但有有效正文的短文；
3. 组件最丰富的文稿。

选择逻辑只读；文章内容、作者、来源、图片和私有字段不写入仓库。若当前库没有组件丰富文稿，使用用户在软件中真实编辑的当前稿，不插入伪数据。

### 11.3 Visual matrix

| Matrix | Required result |
|---|---|
| 7 Variant × paragraph-only | 没有两套仅换色；正文区域也能辨认 |
| 7 Variant × full semantic corpus | 全元素可见、无裸区、无裁切、无假控件 |
| 7 Variant × 375/393/677px WeChat | 行长、层级、空白、SVG 和图片几何合格 |
| 7 Variant × long/short/component-rich real article | 真实软件完整长页截图 |
| XHS 7 Variant local artifacts | 平台原生页序、无微信 wrapper |
| Zhihu 7 Variant local artifacts | 语义长文、无微信 wrapper、fallback 完整 |
| Contact sheet | 3 秒可辨；共享品牌而非共享模板 |

### 11.4 Native and platform evidence

- 使用 release Tauri / WebView2 软件，不以 Vite 浏览器页面冒充成品；
- 在工作台、分栏、全屏、导出前预览和发布中心核对同一文稿与 Variant；
- 检查实际复制 HTML 源码和粘贴后 DOM；
- 若现有登录态可用，在 CloakBrowser 的微信公众号桌面编辑器中执行一次不发布的粘贴/读回；
- 小红书、知乎不自动发布，由用户手测；
- 微信手机预览、同步、定时发送和发布不属于本任务完成条件。

## 12. Compatibility and rollback

- 24 个现有 ID 全部保留并由回归测试锁定；
- 旧调用者仍可直接传 `presetId`；
- 新 `variantId` 是附加设计意图，不破坏旧 API；
- Variant decorator 继续要求幂等，重复预览或导出不重复注入；
- 每个实施切片可以只回退本切片新增映射/配方，不需要回滚文章数据；
- 不使用数据库 destructive migration；
- 若某平台的某个母题不安全，只回退该平台的表现层，不降低其他平台或删除 Variant。

## 13. Key trade-offs

### 13.1 Why not seven independent renderers

已有平台渲染、组件、安全和 fallback 都已存在。复制七套会让安全修复、组件升级和平台兼容产生 21 个分叉，违反原始 Atomic 设计和不大重构约束。

### 13.2 Why not keep only the current four personas

`academic/business/lifestyle/creative` 只够做字体和密度底座，无法表达七套独立报头、正文节奏、领域组件和图像语言。它们继续作为字体/基础 CSS 的实现细节，不再作为用户看到的视觉人格。

### 13.3 Why keep legacy platform presets

它们承载旧设置、用户习惯、渠道兼容和已经验证的输出差异。删除会破坏兼容；继续把它们当作视觉人格则会维持同质化。因此保留 ID，但让七 Variant 成为设计权威。

### 13.4 Why WeChat first

微信的 inline CSS、SVG、粘贴和移动端限制最严格。先在最窄能力集成立，再做 XHS 图片页和 Zhihu 语义长文，能避免概念板先成立、实际产物后降级成裸文本。
