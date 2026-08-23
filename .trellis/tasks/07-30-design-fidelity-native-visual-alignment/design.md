# Technical Design — 设计稿逐屏视觉对齐与原生验收

## 1. Diagnosis

当前 `visual-variants.ts` 已建立七 Variant / 十 Profile / 旧 preset 的正确映射，但视觉实现
主要是七个 CSS builder：

- 统一 `commonVariantCSS()` 先给所有抬头和组件相同骨架；
- 每个 Variant 再修改颜色、边框、圆角和少量字体；
- 大多数 Variant 给 `#nice > p` 添加左轨、底线或色块；
- `buildReadingTimeHeader()` 始终生成同一“墨铸 · 文章”抬头；
- `ExportModal.vue` 使用 900px 面板、400px 控制列和流体预览。

这套实现能证明 CSS 已应用，却无法复现七张方向板的报头构图、正文节奏、信息层级和领域母题。
根因不是少几条 CSS，而是“视觉意图没有进入渲染数据流”。

## 2. Architectural Boundary

保留唯一现有管线：

```text
real article title/category/content/options
  -> existing Markdown + writing-component conversion
  -> resolve VisualVariant / ArticleProfile
  -> variant masthead spec + variant flow CSS
  -> existing decorators and SVG modules
  -> DOMPurify / Juice / platform sanitizer
  -> WeChat preview and copied HTML
```

不新增 renderer、store、数据库表、模板 DSL 或依赖。

## 3. Minimal Contract Changes

### 3.1 Real article identity

只在现有 `WechatExportOptions` 中增加微信需要的可选真实标题字段；分类字段已经存在：

```ts
articleTitle?: string
articleCategory?: string
```

`ExportModal.vue` 已拥有 `title` 与 `articleCategory` props，直接透传；`PublishView.vue`
复用当前文章标题和分类 store，不新增状态源。Variant/Profile 继续完全由现有 preset 兼容映射解析，
不增加重复选择字段。

工作台检查器的 `usePreviewRenderer()` 也必须消费同一真实标题、分类和 preset 映射；右侧激活卡、
中间报头、复制成品、导出弹窗与发布中心不得出现 Variant 漂移。

### 3.2 Closed masthead specification

在 `visual-variants.ts` 中由 `getVisualVariantMastheadPresentation()` 维护闭合的 masthead
presentation，只描述七套必需的视觉事实：

- 产品名 / 英文名；
- 短索引与编辑导语；
- 与 CSS builder 对应的闭合 Variant ID。

`utils.ts` 继续负责 HTML 转义、真实数据渲染和七套 normal-flow HTML 构图。短图形母题
使用微信安全的空 HTML 几何元素与边框表达，不把长正文、标题、作者或来源放进 SVG，
也不扩大 SVG 白名单。

保持 `buildReadingTimeHeader()` 导出名兼容；只扩展 metadata，使已有调用者不受影响。
阅读时间开关只移除分钟提示，不能连带删除承载文章身份的 Variant 报头。

### 3.3 Variant flow CSS

继续使用 `getVisualVariantCSS()`，但重写七个 builder 的职责：

- 去掉所有 Variant 对普通 `> p` 的卡片化；
- 使用连续段落、克制分隔、章节间距、字体角色和少量节奏轨；
- 以抬头、H1/H2/H3、quote、figure、table、code、writing component 和 colophon
  形成差异；
- CC/许可尾注与延伸链接按 Variant 使用不同的安全边框、字级和节奏；
- 只有语义组件可以成为卡片；
- 每套至少一个独有的非颜色结构信号。

不把方向板强行压缩成多栏微信正文；设计稿的多栏关系在窄屏中按阅读顺序重排为单栏，
保留层级、比例、分隔和领域母题。

## 4. Seven Variant Translation

### V1 Critical Translation

- 首屏：V1 装帧侧签、酒红书脊、蓝红双轨、典藏书页。
- 正文：宋体连续流，原文/译文组件使用红蓝轨；普通段落只保留克制书页节奏。
- 组件：译注、术语、版本、来源、图版、参考资料具有书籍校勘语言。

### V2 Jurisprudence Atlas

- 首屏：深蓝法理坐标场、象牙标题、黄铜坐标点。
- 正文：连续法学正文，IRAC/权威层级组件使用纵轴与节点；卡片只用于边界和比较。
- 图表：关系图、判例谱系和证据链使用现有 Mermaid/SVG 安全能力。

### V3 Industry Section

- 首屏：石墨深色封面、黄铜标题、铜绿数据轨；无封面图时使用纯色剖面与短几何。
- 正文：高价值研报节奏，段落连续；KPI、情景、价值链和风险块承担信息密度。
- 表格与数字采用 tabular-nums，来源和口径始终可见。

### V4 Fact Wire

- 首屏：Kiln 铸红与石墨黑构成，纪念碑标题，短斜向 SVG 不承载文字。
- 正文：新闻/时评节拍，硬分隔、时间码、来源节点、事实状态和更正轨。
- 不把每段正文做成黑红卡片。

### V5 Machine Foundry

- 首屏：石墨工业场、Kiln 热端、Cobalt 冷端、Mono 锻次元数据。
- 正文：出版物正文串联 Prompt、代码、版本、资产和证据；技术组件采用工业规格语言。
- 禁止退化成 IDE/终端面板。

### V6 Knowledge Weave

- 首屏：Tempera 知识网络、节点和回链短 SVG、问题—概念—证据—应用—复盘轨。
- 正文：解释型连续阅读，页边注在窄屏顺序化；知识组件使用节点而非通用卡片。

### V7 Human Margins

- playful：Kiln/Cobalt/Amber 编辑拼贴、非规则图像装裱、对话与真实梗图位。
- quiet：Graphite/Vellum/Tempera 信笺、缓慢正文、记忆时间线和诗性引文。
- 无图片时均以纯排版成立，不生成示例图片。

## 5. Export Modal Fidelity Workspace

只调整现有 `ExportModal.vue`：

- 桌面宽度上限提升为适合视觉验收的范围；
- 控制区缩至足够完成选择的宽度；
- 右侧使用居中的 390px 微信设备画布，而不是让产物填满任意剩余宽度；
- 风格选择保留 16 个入口，但增加 Variant 名称/短签名，避免用户只看到颜色条；
- 诊断和高级参数继续放在折叠区；
- 预览切换保持同一滚动容器，避免重建造成跳动。

移动端沿用当前纵向布局，不删除任何功能。

## 6. Safety and Compatibility

- 所有用户文字继续经现有 escape/sanitize。
- 用户颜色仍限定六位 HEX。
- 历史自定义 CSS 中含 `url(...)` 的声明在内联前整体删除，不加载远程字体、图片或跟踪资源。
- 短图形 SVG 只能使用现有安全属性白名单，不含外链、脚本、事件和长文本。
- export CSS 继续遵守微信安全子集。
- 旧 preset ID、设置和历史数据无需迁移。
- 未提供新增字段时输出保持兼容。

## 7. Visual Acceptance Method

### 7.1 Source material

- 方向板只作为视觉基准，不作为运行时素材。
- 真实文章从本机数据库动态选择：
  - 最短有效文章；
  - 最长有效文章；
  - 组件最丰富文章。
- 若本机缺少某种真实数据，相应组件标为未验收，不用 mock 补齐。

### 7.2 Native matrix

在真实 Release `InkForge.exe` 中记录：

- 7 Variant × 首屏；
- 7 Variant × 中段；
- 7 Variant × 文末；
- V7 playful / quiet 各一组；
- 390px 等效微信画布；
- 16 preset 的选择可达性。

每张按五项判定：构图、字级、正文节奏、专属签名、微信安全。
任一项只换色、段落卡片化、横向裁切、假数据、未主题化组件，均退回修复。

## 8. Rollback

- 变更集中在现有 export types、masthead、variant CSS、ExportModal 和对应测试。
- 若某 Variant 新构图导致微信产物不安全，只回滚该 Variant spec/CSS，不回滚映射或其他功能。
- 保留旧 preset 与 pipeline，可用精确文件回退恢复，不需要数据迁移。
