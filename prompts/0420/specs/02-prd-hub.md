---
Spec 编号: 02-prd-hub
Spec 名称: Hub 首页产品需求文档 (PRD)
Task 归属: T02 Hub 首页
版本: v2.1.0
创建日期: 2026-04-21
Author: InkForge Spec 工程组
状态: Approved
权威来源: prompts/0420/00-decisions-part3a-lifecycle-writing-hub.md (U-01 ~ U-12, U-21)
对应 Spec: 02-spec-hub-layout.md, 08-data-insights-spec.md, 07-settings-full-spec.md
关联决策: T02-01 ~ T02-17, L1-10 ~ L1-13, L1-27 ~ L1-29, L1-50 ~ L1-52, N-01 ~ N-06, W-01, EX-01, EX-03, EX-06
---

# InkForge v2.1 — Hub 首页产品需求文档 (PRD)

> 本 PRD 定义 Hub 首页的产品层契约：愿景、定位、模块范围、用户旅程、非目标、SLO 与验收标准。
> 所有工程实现细节请参考 `02-spec-hub-layout.md`。

## 目录

- 第一章 愿景与哲学
- 第二章 产品定位与范围
- 第三章 目标用户与核心使命
- 第四章 Hub 模块全景图
- 第五章 用户旅程（新用户 / 回访用户 / 高频用户）
- 第六章 非目标（明确拒绝的事）
- 第七章 性能 SLO 与交付门槛
- 第八章 业务规则与数据契约
- 第九章 视觉哲学与气质冻结
- 第十章 与 Workstation 的关系与边界
- 第十一章 可观测性与指标
- 第十二章 验收标准
- 第十三章 发布计划与分期
- 第十四章 风险登记与缓解
- 第十五章 跨 Spec 依赖地图
- 附录 A 术语表
- 附录 B 业务常量与硬性阈值
- 附录 C 设计决策溯源表
- 附录 D 度量字典引用
- 附录 E 变更日志

---

## 第一章 愿景与哲学

### 1.1 一句话愿景

Hub 是 InkForge 的"项目首页与每日启动面板"：用户每次打开 InkForge 的第一屏，它必须以**最短路径**让用户回到"正在写的那一篇"，并在过程中以**纸张式的安静气质**呈现创作状态、素材入口、目标进度与核心洞察。

### 1.2 哲学支柱（不可动摇）

1. **纸张式气质不可破坏**（对齐 L1-12 B + L1-39 A + L1-49 B+C）。视觉、颜色、行距、字体基调必须服从已冻结的"Ethereal Constructivism"设计语言；任何卡片设计若偏向 Notion/Obsidian 的"块编辑器"形态，视为违反哲学。
2. **Markdown 是唯一权威源**（对齐铁律 1，L1-05 A）。Hub 呈现的所有正文预览、字数统计、目标进度、洞察图表均由 Markdown 文本派生；Hub 不持有任何"仅 Hub 可见"的专属内容模型。
3. **零空壳交付**（对齐铁律 3，L1-04 D）。Hub 任何卡片不得以"占位插图 + 引导文案"交付；每张卡片都必须在有数据时展现真实数据，在无数据时展现可用的空态 CTA 与文字占位（T09-11 A，非 Skeleton）。
4. **iA Writer 式的安静**（对齐 L1-49 B+C）。Hub 的视觉密度必须低于 Notion 首页 50% 以上：无活动 feed、无瀑布流、无社交流、无"今日热门推荐"。所有元素必须服务于"写作回归"这一单一目的。
5. **尊重用户主权**（对齐 L1-50 B 补充、L1-52 A）。用户明确"讨厌引导"，Hub 不允许自动播放引导 Tour、强制弹窗、步骤高亮；帮助需用户主动触发（F2 / 气泡 "What's this?"）。
6. **响应式自我刷新**（对齐 T02-07 B 与决策 U-08）。Hub 不做轮询、不做手动刷新、不做脏数据检查；所有数据通过 Pinia Store 响应式自动同步。

### 1.3 Hub 在产品体系中的位置

```
InkForge (v2.1)
├── Hub          ← 本 PRD 覆盖
│   ├── 入口职责（启动即达）
│   ├── 信息聚合（洞察 / 最近 / 收藏 / 草稿）
│   ├── 快捷操作（新建 / 模板 / 导入）
│   └── FTUE 承载（欢迎与空态）
├── Workstation  ← 文档级工作区（02-spec-hub-layout 与 W 系列 Spec）
├── Settings     ← 配置中枢（07-settings-full-spec.md）
└── Insights     ← 数据洞察（08-data-insights-spec.md）—— Hub 的"内容区之一"
```

Hub 位于 Workstation 之上一层：它是**项目首页**（T02-17 C 的规范化结论），Workstation 是**文档级工作区**。两者层级清晰：**Hub 是启动态，Workstation 是聚焦态**。

### 1.4 决策原则（当需求冲突时如何裁决）

当 Hub 的任何需求发生冲突（视觉 vs 功能、密度 vs 安静、新用户 vs 高频用户），按以下优先级裁决：

1. **安全线优先**：不丢稿、不误删、不误切账户（对齐铁律 7 + 决策 V-10）。
2. **纸张气质优先**：气质不可破坏（铁律 4）。
3. **高频用户优先**：每次打开 Hub 的绝大多数用户是"已有数据的回访用户"（见第五章），空态与新用户体验不得拖慢他们。
4. **延期而非妥协**：如果某项功能要求引入 Notion 式块或社交流，选择延期而非打折实现。

---

## 第二章 产品定位与范围

### 2.1 产品定位

Hub 的产品定位是一张**"个人项目首页 + 每日写作启动面板"**，同时承载：

- **入口职责**：最短路径回到"正在写的那一篇"（T02-14 B：最近编辑且未完成的文章）。
- **信息聚合**：把分散在 Workstation、FileManager、Settings、Insights 中的关键信号浓缩为卡片矩阵。
- **快捷操作**：暴露创作 3 大入口（新建 / 模板 / 导入，T02-13 C 的入口预算）。
- **洞察预览**：将 Data Insights 的"头等舱指标"（本周字数 / 连续天数 / 目标进度）以最低阅读成本呈现在首屏。
- **FTUE 承载**：对新用户提供"欢迎弹窗 → FirstRunDispatcher → 空态 Hub"的极简路径（U-12）。

### 2.2 核心职责清单（必须落地）

| 职责 | 必须落地的体现 | 决策溯源 |
|---|---|---|
| J-01 快速回到在写文章 | Hero 的 `<ContinueWritingButton>` | U-03 |
| J-02 快速新建文档 | QuickActionFab 展开 3 项 | U-09 |
| J-03 聚合最近编辑 | card-recent 动态条数 | U-07 |
| J-04 聚合收藏 / Pinned | PinnedDocsCard（由收藏虚拟分类派生） | L1-43 D / F-03 |
| J-05 聚合草稿 | DraftBoxCard + 过期提醒 | U-04 |
| J-06 聚合素材 | AssetManagerCard 显示占用与孤儿警告 | U-04 |
| J-07 聚合待办 / 任务 | TodoPanel（从文档状态机派生的"未完成"视图） | N-01 L1-41 C |
| J-08 数据洞察预览卡 | InsightsCard（6 图中选 2-3 头等舱） | U-13 |
| J-09 目标进度呈现 | Hero 图表 + StatusBar 联动 | U-03 + O-01 |
| J-10 每日引言 | InspirationCard 三层引言池 | U-06 |
| J-11 FTUE 承载 | WelcomeModal + FirstRunDispatcher + 空态 Hub | U-12 P-01 |
| J-12 帮助触发 | 气泡式 "What's this?" + F2 速查卡 | L1-51 C |
| J-13 SectionNav 导航 | 保留现状（T02-10 A） | U-05 |
| J-14 垃圾回收入口 | RecycleBinEntry（落在 Sidebar 或 Section 3 底部） | N-02 |
| J-15 账户切换入口 | HeaderAvatarMenu 气泡 | T06-07 B |

### 2.2.a 2026-04-22 当前实现注记

- Wave 1 当前真实实现已在 `HubView.vue` 中接入写作目标进度，但仍属于现有卡片框架内的增量落地，而不是完整拆分出独立 `GoalCard` 组件树。
- 当前目标口径为：优先显示 `dailyTarget` 的当日累计进度；若未配置 `dailyTarget`，则回退到 `weeklyTarget` 的周累计进度；两者都未配置时，Hub 回退显示文章整理进度。
- 当前“调整目标”跳转已对齐到 `/settings?tab=editor&section=writing-goal`，因为本轮并未新增独立 `Writing` tab。
- Wave 1 当前真实实现已在 Hero 卡中接入“继续创作”按钮，并在 Recent 卡中接入“未完成”列表；这两块能力都还内嵌在 `HubView.vue` 内，而不是已经拆成独立 `ContinueWritingButton.vue / TodoPanel.vue` 组件文件。
- 由于当前 `Article` 真实状态模型仍未整体迁移到 spec 中的 `draft / writing / review / ready_to_publish / published / archived`，所以当前实现先按现有真值收口：继续创作与未完成列表都基于 `status !== 'processed'` 的候选集，再按 `updatedAt` 倒序派生。
- “继续创作”无候选时会真实退化为“开始新文章”；“未完成”列表为空时整块区域不会渲染，避免出现空壳待办卡。
- Wave 1 当前真实实现已把首页总字数、文章列表字数字段与“按字数”排序统一到 `computeContentWordCount()` 的纯正文口径，开始对齐 R-M-04 关于 `countPlainText(doc)` 的约束，而不是继续沿用 Markdown 源串长度。
- Wave 1 当前真实实现已把 Recent / 列表摘要统一投影为纯文本片段；Markdown 仍是 authority，但首页展示层不会直接暴露 `#` 等标记符。

### 2.3 显式不承担的职责

- **编辑**：Hub 不是编辑器；所有编辑动作必须跳转到 Workstation。
- **版本历史**：Hub 不展示版本历史；跳 Workstation 左栏 VersionHistory Tab。
- **发布配置**：Hub 不配置发布渠道；跳 Settings > Export/Publish。
- **多人协作**：Hub 不承载任何协作消息、评论、审阅流（远期需求）。
- **社交流 / 推荐流**：永久排除。

---

## 第三章 目标用户与核心使命

### 3.1 目标用户画像

Hub 的目标用户严格对齐 InkForge v2.1 整体用户画像（L1-02 A + 远期锚点）：

- **P0 — 个人本地用户**：Markdown-first 写作者，每日至少启动 InkForge 一次，单机 50+ 账户能力为个人多 Profile（非团队）服务。
- **P1 — 5-10 人小团队（远期）**：v2.1 不打磨协作体验，但 Hub 数据结构（profileId 分区、虚拟分类、状态机）需为远期预留钩子。
- **角色分化**：v2.1 Hub 默认所有用户都是"作者"。远期将扩展"管理员 / 非作者"角色，影响 Hub 可见卡片集合（由 `hub.card.visibleRoles` 配置驱动，v2.1 锁定为 `['author']`）。

### 3.2 核心使命（User Missions）

| 使命 ID | 描述 | 触发情境 | 期望时长 |
|---|---|---|---|
| M-01 | 回到昨天写的那篇 | 每日上班 / 创作开启时 | ≤ 3 秒 |
| M-02 | 开新的一篇 | 有新灵感时 | ≤ 5 秒 |
| M-03 | 从模板复用 | 周报 / 日记 / 技术笔记重复场景 | ≤ 8 秒 |
| M-04 | 查看最近产出 | 每日晨会前 / 周五复盘 | ≤ 10 秒 |
| M-05 | 查看当前目标进度 | 目标周期内多次 | ≤ 5 秒 |
| M-06 | 找特定类别文章 | 按分类/标签翻旧文 | ≤ 15 秒（含展开） |
| M-07 | 导入已有 Markdown | 初次迁移 / 临时接入 | ≤ 20 秒 |
| M-08 | 检查草稿是否过期 | 每周或每月 | ≤ 10 秒 |
| M-09 | 检查素材库占用 | 当存储报警时 | ≤ 10 秒 |
| M-10 | 看今日灵感引言 | 被动浏览 | 0（即时可见） |

Hub 的**全部设计**都服务于这 10 个使命；任何卡片、任何交互都必须能映射到至少一个使命，否则视为冗余。

### 3.3 使命达成时长指标

下表定义"从 Hub 打开到使命完成"的硬性时间预算（与第七章 SLO 互补）：

| 使命 | 目标时长 | 衡量点 | 失败判定 |
|---|---|---|---|
| M-01 | ≤ 3s | Hero ContinueWritingButton 点击 → Workstation 加载完成 | > 5s 记为失败 |
| M-02 | ≤ 5s | FAB 展开 → 新建空白文档 → Workstation 可输入 | > 8s 记为失败 |
| M-03 | ≤ 8s | FAB 展开 → 模板选择面板 → 模板应用 → Workstation | > 15s 记为失败 |
| M-04 | ≤ 10s | Hub 打开 → Hero 图表可读 | > 15s 记为失败 |
| M-05 | ≤ 5s | Hub 打开 → 目标进度条可见 | > 8s 记为失败 |

---

## 第四章 Hub 模块全景图

### 4.1 模块层级

Hub 由四个层级构成（自顶向下）：

```
HubPage（根视图）
├── Sidebar（可折叠左侧栏）
│   ├── HeaderAvatarMenu（账户 + 主题 + 帮助）
│   ├── CategoriesTree（嵌套分类 + 智能文件夹）
│   ├── PinnedDocsQuick（收藏快速访问）
│   ├── RecycleBinEntry（回收站入口）
│   └── SettingsGear（跳 Settings）
├── Main（Bento Grid）
│   ├── Section 1 / Hero（铁三角：Hero + Recent + Stats）
│   │   ├── HeroSection（WritingFlowCard 2.0 + ContinueWritingButton）
│   │   ├── RecentDocsCard（动态条数）
│   │   └── StatsPreviewCard（本周字数 / 连续天数 / 目标进度）
│   ├── Section 2 / 创作工具
│   │   ├── TemplateMarketCard
│   │   ├── DraftBoxCard
│   │   └── AssetManagerCard
│   ├── Section 3 / 聚合信息
│   │   ├── PinnedDocsCard（详细视图）
│   │   ├── CategoriesCard（分类概览 + 点击就地展开）
│   │   ├── TodoPanel（未完成文档列表）
│   │   └── InspirationCard（每日引言）
│   └── Section 4 / 数据洞察（Insights 预览）
│       ├── InsightsCard × 2-3（头等舱指标图表）
│       └── UpdateLogCard（更新日志 + 新功能高亮）
├── SectionNav（右侧圆点导航，T02-10 A）
├── QuickActionFab（右下角 FAB，3 入口，U-09）
└── FTUEBubble（条件性上下文气泡，L1-51 C）
```

### 4.2 模块职责与状态

| 模块 | 默认可见 | 空态表现 | 数据源 | 响应式来源 |
|---|---|---|---|---|
| HeroSection | 是 | "尚无写作记录，开始第一篇吧" | `useArticlesStore`, `useMetricsStore` | articles.list + metrics.dailyWordCount |
| RecentDocsCard | 是 | "最近没有文章" + FAB 指引 | `useArticlesStore.recent` | articles.list (desc by updatedAt) |
| StatsPreviewCard | 是 | "开始写作以记录统计" | `useMetricsStore` | metrics.weekly, metrics.streak |
| TemplateMarketCard | 是 | 显示内置 8 模板 | `useTemplatesStore` | templates.all |
| DraftBoxCard | 是 | "暂无草稿" | `useDraftsStore` | drafts.list |
| AssetManagerCard | 是 | "素材库为空" | `useAssetsStore` | assets.summary |
| PinnedDocsCard | 条件可见 | 不可见（Pinned 为空时） | `useArticlesStore.pinned` | virtualCategories.pinned |
| CategoriesCard | 是 | "尚无分类" | `useCategoriesStore` | categories.tree |
| TodoPanel | 条件可见 | 不可见（无未完成项时） | `useArticlesStore.todo` | articles.filter(status ∈ unfinished) |
| InspirationCard | 是 | 显示硬编码引言 | `useInspirationService` | quotes.daily |
| InsightsCard | 是 | 显示"数据准备中"占位 | `useInsightsStore` | insights.top3 |
| UpdateLogCard | 条件可见 | 不可见（无新版本时） | `useUpdaterStore` | updater.latest |
| FTUEBubble | 条件可见 | 见 4.3 | `useFTUEStore` | ftue.pendingHints |

### 4.3 FTUEBubble 触发条件

FTUE 气泡是 Hub 提供的**唯一引导机制**（对齐 L1-50 B 补充"讨厌引导"的硬约束）：

- **只在以下条件触发**：用户首次停留在 Hub 超过 2 秒，且某个关键入口从未被交互过。
- **最多同时显示 1 个气泡**，不弹出堆叠气泡流。
- **"已读"持久化**：气泡关闭后写入 `hub.ftue.seen.<hintId>`，再不出现。
- **一键全部关闭**：气泡右上角提供"再也不显示引导"按钮，一键关闭所有 FTUE。
- **禁止自动播放步骤 Tour**。

### 4.4 可见性优先级规则（铁三角保护）

根据决策 U-11，Hub 在屏幕宽度受限时按优先级降级：

| 优先级 | 成员 | 裁剪规则 |
|---|---|---|
| P1（铁三角） | Hero / RecentDocs / StatsPreview | 任何宽度下都保留 |
| P2 | TemplateMarket / DraftBox / AssetManager | < 1024px 并列显示变 2 列 |
| P3 | Categories / Pinned / Todo / Inspiration | < 768px 折叠为"展开查看" |
| P4 | Insights / UpdateLog | < 768px 隐藏 |

### 4.5 入口预算铁律（T02-13 C）

Hub 全页面的"新建入口"严格限定为 3 个：

1. FAB → 新建空白文档
2. FAB → 从模板创建
3. FAB → 导入 Markdown / DOCX

**禁止任何其他卡片出现"新建"CTA**；Hero 无候选文章时的"开始新文章"按钮是唯一例外，此时 FAB 入口 #1 退化为"当前入口"。

---

## 第五章 用户旅程（新用户 / 回访用户 / 高频用户）

### 5.1 旅程 J-A：新用户首次启动

**情境**：用户刚安装 InkForge v2.1，尚未创建账户，尚无任何文章、模板、设置。

**完整路径**：

1. 应用启动 → 检测"无任何 Profile"
2. 进入 `FirstRunDispatcher`（U-12 / 决策 P-01）
3. `WelcomeModal`（仅欢迎弹窗，**不自动创建示例文档**）
4. 用户二选一：创建正式账户 / 导入已有数据（拒绝匿名，T06-08 补充）
5. 进入 **空态 Hub**（不是"引导版 Hub"，不是"独立 Onboarding"）
6. Hub 呈现：
   - Hero：WritingFlowCard 2.0 显示"尚无写作记录，开始第一篇吧" + 一个"开始新文章"按钮
   - RecentDocsCard：文字占位 "最近没有文章"
   - StatsPreviewCard：文字占位 "开始写作以记录统计"
   - InspirationCard：显示硬编码引言池中的一条
   - 其他卡片：按 4.2 的空态表现呈现
7. FAB 在右下角可见 / 可点
8. FTUEBubble 条件触发（例如停留 2 秒后，指向 FAB 的"开始创作吧"气泡，一次性）

**硬约束**：

- 禁止自动创建 Demo 文档（L1-50 补充）。
- 禁止自动打开 Workstation（用户必须显式点 CTA）。
- 禁止多步 Tour、禁止分步高亮。

### 5.2 旅程 J-B：回访用户（有数据但非高频）

**情境**：用户有 5-50 篇文章，每周启动 3-5 次 InkForge。

**完整路径**：

1. 应用启动 → 加载 Profile → 进入 Hub
2. Hero：WritingFlowCard 2.0 显示"最近 7 天写作分布" + `<ContinueWritingButton>` 指向"最近编辑且未完成"文章
3. RecentDocsCard：显示 2-5 条（根据卡片高度动态计算）
4. StatsPreviewCard：显示本周字数、连续天数、目标进度
5. 用户点击 ContinueWritingButton → 跳 Workstation 打开该文章

**期望时长**：从打开 InkForge 到点击 ContinueWritingButton ≤ 3 秒（M-01）。

**硬约束**：

- Hub 打开后，ContinueWritingButton 的计算必须已经完成（不能出现"计算中..."）。
- Hero 图表的首屏渲染必须 ≤ 500ms（见第七章 SLO）。

### 5.3 旅程 J-C：高频用户（每日启动 2-5 次）

**情境**：用户有 100+ 篇文章，每日启动 2-5 次，使用多种分类、智能文件夹、目标系统。

**完整路径**：

1. 应用启动 → 进入 Hub
2. 用户视线扫描模式：从上到下 → 从左到右（对齐西方阅读习惯）
3. Hero 图表快速扫描 → 若目标进度达标/接近达标 → 有成就感激励（O-01 动画奖励）
4. RecentDocsCard 扫描 → 找到今天要继续的那篇 → 点击进入 Workstation
5. 若今天要开新一篇：按 Ctrl+N 或 FAB → 新建

**期望时长**：从 Hub 打开到开始写作 ≤ 3 秒（M-01）。

**硬约束**：

- Hub 必须在首屏 500ms 内全部可交互（不能等到 2 秒后才响应点击）。
- Hub 响应式刷新（从其他窗口编辑回到 Hub）必须 ≤ 100ms（对齐 U-08）。

### 5.4 旅程 J-D：周期性复盘用户

**情境**：用户每周五或每月末用 Hub 复盘。

**路径**：

1. Hub → Section 4 InsightsCard 预览
2. 点击 "查看全部洞察" → 跳 Insights 完整视图（或展开当前卡片）
3. 或点击卡片进入具体图表的详情 Modal（U-17）

**硬约束**：

- InsightsCard 只显示 2-3 个头等舱指标，不允许塞满 6 个（对齐 U-11 P4 优先级）。

### 5.5 旅程 J-E：账户切换用户（多 Profile）

**情境**：用户有多个 Profile（个人 / 工作 / 学术），每日切换 1-2 次。

**路径**：

1. Hub 右上角 HeaderAvatarMenu 点击
2. 气泡菜单展开（T06-07 B）：账户名 / 管理账户 / 设置 / 退出
3. 选择另一个账户 → 走 `window.location.reload()`（T06-05 C）
4. 进入另一个账户的 Hub（完全隔离，L1-23 D）

**硬约束**：

- 切换前必须检查当前 Workstation 是否有未保存内容（T06-12 A，自动保存失败时禁止切换）。
- 切换走完整 reload 而非 Store 热切换（避免污染）。

### 5.6 旅程 J-F：迁移与导入用户

**情境**：从 Typora / Obsidian / VS Code 迁移到 InkForge。

**路径**：

1. Hub FAB → 导入 Markdown / DOCX
2. 打开 `ImportWizard`（S-13 D）
3. 选择文件或文件夹
4. 导入完成后跳回 Hub，RecentDocsCard 立即显示新导入的文章

**硬约束**：

- 导入过程中 Hub 必须显示进度指示（用 Toast Sonner）。
- 导入失败走"数据风险错误"等级（G-13 D 补充）。

### 5.7 旅程 J-G：灾难恢复用户

**情境**：上次崩溃 / 异常退出后再次打开 InkForge。

**路径**：

1. 应用启动 → 检测"异常退出标记"（R-01 D）
2. 进入 `RecoveryMode` UI（优先级高于 Hub）
3. 用户选择恢复版本 → 跳回 Hub（或直接跳 Workstation 继续写）

**硬约束**：

- Hub 不展示"上次崩溃"提示；灾难恢复走独立 UI。
- 如用户选择"放弃恢复"，Hub 按正常回访用户呈现。

---

## 第六章 非目标（明确拒绝的事）

### 6.1 视觉与信息流层面的非目标

- **不做瀑布流 feed**：Hub 永不呈现无限滚动的文章信息流。
- **不做社交流**：Hub 不展示任何来自其他用户 / 网络的内容。
- **不做活动时间线**：Hub 不展示"某某分享了某文"之类的时间线。
- **不做推荐文章**：Hub 不进行任何推荐算法，用户看到的文章顺序仅由 `updatedAt desc` 或虚拟分类查询决定。
- **不做 Notion 式块编辑**：Hub 卡片不允许被用户拖拽调整为自由块（违反铁律 4）。
- **不做数据库视图**：Hub 不是 Notion 的 Database View；分类 / 标签的"表格视图"属于 FileManager。

### 6.2 交互与引导层面的非目标

- **不做 Tour**：不做分步引导（对齐 L1-50 B 补充）。
- **不做 Onboarding 视频**：不嵌入视频播放。
- **不做"今日必做"任务强提示**：TodoPanel 是被动信息，不主动打扰。
- **不做"未登录"状态**：InkForge 没有"登录"概念；本地 Profile 切换不是登录。
- **不做"未保存提示横幅"**：未保存状态通过 TabBar / StatusBar 展现，Hub 不承担此职责。

### 6.3 数据与性能层面的非目标

- **不做后台轮询**：Hub 不做任何定时数据拉取（U-08 禁止）。
- **不做"强制刷新"按钮**：用户不需要刷新 Hub（Store 响应式保证）。
- **不做"数据预热"**：启动即渲染真实数据，不允许"正在加载..."占位超过 500ms。
- **不做"数据导出"**：Hub 自己不提供导出入口；每个 InsightCard 有自己的 CSV 导出（U-18）。

### 6.4 功能边界层面的非目标

- **不做评论 / 审阅**：对齐 L1-14 C（评论进入 v2.1 但不在 Hub 承载）。
- **不做同步状态中心**：同步状态展现在 Settings / StatusBar，不在 Hub。
- **不做插件市场入口**：L1-37 D 的插件 SDK 入口在 Settings 而非 Hub。
- **不做"工作区切换"**：Hub 不承载多工作区切换；多窗口由 TabBar + 系统窗口管理器承担（L1-53 C）。

### 6.5 商业化层面的非目标

- **不做广告位**：永不展示任何广告。
- **不做付费升级提示**：v2.1 完全开源（L1-37 D "完全开源"）。
- **不做订阅 / 会员入口**：Hub 无此概念。

---

## 第七章 性能 SLO 与交付门槛

### 7.1 性能 SLO（硬指标）

下表定义 Hub 的硬性性能指标，违反视为 v2.1 交付失败：

| 指标 | 目标 | 测量点 | 失败判定 |
|---|---|---|---|
| SLO-01 首屏渲染完成时间 (FCP) | ≤ 500ms | Hub 打开到 Hero 图表可读 | > 800ms 记为失败 |
| SLO-02 可交互时间 (TTI) | ≤ 500ms | Hub 打开到 FAB 可点击 | > 800ms 记为失败 |
| SLO-03 交互响应延迟 | ≤ 100ms | 点击卡片到 UI 反馈 | > 150ms 记为失败 |
| SLO-04 Store 响应式刷新 | ≤ 100ms | Workstation 写入 → Hub 卡片更新 | > 200ms 记为失败 |
| SLO-05 图表重绘 | ≤ 200ms | 数据变化后 Hero / Insights 图表重绘 | > 400ms 记为失败 |
| SLO-06 Lighthouse Performance | > 80 | 构建产物跑分 | ≤ 80 记为失败 |
| SLO-07 CategoriesCard 展开 | ≤ 150ms | 点击 → 展开到最终高度 | > 250ms 记为失败 |
| SLO-08 FAB 展开动画 | ≤ 200ms | 点击 → 3 项出现 | > 300ms 记为失败 |

### 7.2 内存与资源约束

| 资源 | 预算 | 超限行为 |
|---|---|---|
| Hub 首屏 JS 体积 | ≤ 350KB（gzipped） | 超限触发 G-04 C 按需加载 |
| Hub 首屏 CSS 体积 | ≤ 60KB | 超限触发审计 |
| 单个 Card 内存占用 | ≤ 5MB | 超限触发 U-22 采样降级 |
| Hub 运行时 heap 增量 | ≤ 30MB | 超限触发内存报警 |

### 7.3 可用性 SLO

| 指标 | 目标 |
|---|---|
| Hub 打开成功率 | ≥ 99.9% |
| Store 响应式链路断裂率 | ≤ 0.01% |
| 数据一致性（Hub 与 Workstation） | 100%（同步快照） |

### 7.4 交付门槛（Release Gate）

Hub PRD 对应的 Task 02 合并 PR 前必须通过以下门槛：

1. **全部 SLO 达标**：至少在中端机（i5-10300H / 16GB / SSD）上达标。
2. **E2E 覆盖**：Playwright 测试覆盖第五章全部 7 个用户旅程。
3. **空态全覆盖**：4.2 表中每个"空态表现"都有对应单测与 E2E 截图。
4. **输入预算遵守**：Hub 总入口数不超过 3 个（FAB 展开 3 项）。
5. **铁三角保护**：Hero + RecentDocs + StatsPreview 在任何屏幕宽度下都可见。
6. **气质冻结验证**：人工审查视觉语言是否违反 Ethereal Constructivism。
7. **引导禁令遵守**：无分步弹窗、无 Tour、无强制高亮。
8. **FTUE 极简遵守**：仅保留 WelcomeModal + FirstRunDispatcher。

---

## 第八章 业务规则与数据契约

### 8.1 业务规则（Must / Should / May）

#### 8.1.1 Must 级规则

| ID | 规则 |
|---|---|
| R-M-01 | Hub 打开时必须立即拉起响应式订阅；无轮询、无手动 refresh。 |
| R-M-02 | ContinueWritingButton 指向算法：`articles.filter(status ∈ {draft, writing, review, ready_to_publish}).orderBy(updatedAt desc)[0]`。 |
| R-M-03 | RecentDocsCard 必须排除归档文档（status = archived）与回收站文档。 |
| R-M-04 | 所有"字数"统计必须走 `countPlainText(doc)`（U-14）。 |
| R-M-05 | 目标进度必须使用同一套指标定义（对齐 `MetricsDictionary`）。 |
| R-M-06 | Hub 打开时当前 Profile 必须已解锁（若有本地密码，PIN 通过，T06-09 D）。 |
| R-M-07 | 铁三角在任何断点下可见。 |
| R-M-08 | FAB 固定右下角，展开动画 ≤ 200ms。 |
| R-M-09 | CategoriesCard 点击就地展开，禁止跳转（U-10）。 |
| R-M-10 | InsightsCard 只承载 2-3 个头等舱指标；完整 Insights 由独立 Spec 承担。 |
| R-M-11 | Hero 图表点击必须跳转到该日期对应的文章列表（深链接，U-16）。 |
| R-M-12 | 所有卡片必须支持"无数据 / 加载中 / 错误 / 正常"四态。 |
| R-M-13 | 无数据状态必须使用文字占位，禁止 Skeleton 伪数据（T09-11 A）。 |
| R-M-14 | 每个卡片必须持有 `priority` 字段用于裁剪。 |
| R-M-15 | Hub 的所有 CTA 必须可通过键盘导航到达（Tab / Enter）。 |

#### 8.1.2 Should 级规则

| ID | 规则 |
|---|---|
| R-S-01 | Hero 图表应支持色盲模式（可配置 palette 预设）。 |
| R-S-02 | Hub 应在"夜间模式"下保持同等可读性。 |
| R-S-03 | Hub 应在"护眼模式"下降低纯白背景亮度。 |
| R-S-04 | Hub 应在"暗夜红"模式下保持系统化配色（非单纯红滤镜）。 |
| R-S-05 | 卡片标题应支持 i18n（zh-CN / en-US，G-08 C）。 |
| R-S-06 | 卡片内容应支持 i18n，含数字 / 日期的本地化格式。 |
| R-S-07 | 动画应尊重 `prefers-reduced-motion` 系统设置（自动降级为无动画）。 |

#### 8.1.3 May 级规则

| ID | 规则 |
|---|---|
| R-Y-01 | Hub 可选提供"壁纸 / 写作氛围"开关（对齐 L1-49 B+C，但 v2.1 不是 P0 必做）。 |
| R-Y-02 | Hub 可选提供"布局自定义"入口（v2.2 候选）。 |
| R-Y-03 | Hub 可选提供"卡片收藏"能力（v2.2 候选）。 |

### 8.2 数据契约

#### 8.2.1 Hub 依赖的 Store 列表

| Store | 职责 | Hub 订阅的 getter |
|---|---|---|
| `useArticlesStore` | 文章主数据 | `recent`, `pinned`, `todo`, `continueTarget` |
| `useMetricsStore` | 度量数据 | `weekly`, `streak`, `goalProgress`, `wordCountToday` |
| `useTemplatesStore` | 模板 | `all` |
| `useDraftsStore` | 草稿 | `list`, `expiringCount` |
| `useAssetsStore` | 素材 | `summary`, `orphans` |
| `useCategoriesStore` | 分类 | `tree`, `smartFolders` |
| `useInsightsStore` | 洞察 | `top3`, `suggestions` |
| `useInspirationService` | 引言 | `daily` |
| `useFTUEStore` | 首次体验 | `pendingHints` |
| `useUpdaterStore` | 更新器 | `latest`, `current` |
| `useAuthStore` | 当前 Profile | `currentProfile`, `isLocked` |
| `useSettingsStore` | 用户设置 | `theme`, `language`, `paperWidth` |

#### 8.2.2 Hub 不允许直接访问的 Store

- `useEditorStore`（Workstation 专属，Hub 不读取编辑器状态）
- `useVersionHistoryStore`（Workstation 专属）
- `usePublishStore`（Settings 专属）
- `useSyncStore`（Settings / StatusBar 专属）

#### 8.2.3 写操作契约

**Hub 默认是只读视图**，仅以下场景允许写：

| 写操作 | 入口 | 落点 |
|---|---|---|
| 用户点击 FAB 新建 | FAB | `articlesStore.create()` → 跳 Workstation |
| 用户点击"继续创作" | Hero | 不写；仅路由跳转 |
| 用户点击 InspirationCard 收藏图标 | Card | `quotesStore.favorite(id)` |
| 用户关闭 FTUE 气泡 | FTUEBubble | `ftueStore.markSeen(hintId)` |
| 用户折叠 Sidebar | Sidebar | `settingsStore.updateHubSidebarCollapsed()` |
| 用户点击卡片"展开" | 任意 Card | 仅本地状态，不落盘 |

---

## 第九章 视觉哲学与气质冻结

### 9.1 设计语言（Ethereal Constructivism）

Hub 所有视觉必须服从 InkForge 整体设计语言（详见 `20-theme-font-typography-spec.md`）：

- **配色主调**：纸张米白 / 深墨灰 / 品牌红（#D32F2F）作为强调。
- **字体**：中英双字族（LXGW WenKai Screen + Inter），可被 L1-57 D 系统覆盖。
- **行距**：默认 1.75，不低于 1.5。
- **圆角**：统一 8px / 12px 双档（卡片 12px / 元素 8px）。
- **阴影**：硬阴影，绝不用 Notion 式柔光。

### 9.2 卡片设计规范

所有 Hub 卡片遵循统一元规范（在 02-spec-hub-layout.md 中详细定义）：

- **最小高度**：160px。
- **内边距**：16px / 20px / 24px 三档。
- **标题层级**：卡片标题 = `h3` 等级，`font-weight: 600`。
- **Action 区**：右上角 slot，最多 2 个图标按钮。
- **底部空间**：卡片底部必须有 12px 呼吸。

### 9.3 动效哲学

- **进入动画**：80ms 缓入（仅首次渲染）。
- **退出动画**：120ms 缓出。
- **缓动函数**：`cubic-bezier(0.4, 0, 0.2, 1)` 统一。
- **禁用 bounce**：Hub 不允许弹性动画。
- **Reduced Motion**：尊重 `prefers-reduced-motion`，全部降级为 0ms。

### 9.4 色盲与护眼

- 图表使用 Tableau 10 色盲友好调色板。
- 护眼模式背景：`#F5F0E6`。
- 暗夜红模式：`#1A0000` 背景 + `#FF6060` 主调。

### 9.5 图标系统

- 全部使用 `lucide-vue-next`（禁止 emoji、禁止 Font Awesome 混用）。
- 图标尺寸：16 / 20 / 24 / 32 四档。
- 图标颜色：`currentColor`，跟随文本色。

---

## 第十章 与 Workstation 的关系与边界

### 10.1 层级关系

```
用户启动 → Hub (启动态) → Workstation (聚焦态)
```

- **Hub** 是启动面板 / 项目首页。
- **Workstation** 是文档级工作区。
- 两者**有层级**，但**无强制状态保留**（U-01）。

### 10.2 路由与过渡

- 路由：`/hub` 与 `/workstation/:id` 独立。
- 过渡：Hub → Workstation 走 `slide-left`（T09-02 A）；反向 `slide-right`。
- 返回按钮：Workstation 左上角显著可见，点击回 Hub。

### 10.3 数据双向流

- **Workstation 写 → Hub 响应式更新**（通过 Store）。
- **Hub 不向 Workstation 注入状态**（除了路由参数如 `?highlight=...`）。
- **Hub 不保留 Workstation 快照**：用户从 Workstation 回 Hub，再回 Workstation，不保证状态恢复（U-01 与 D 的差别）。

### 10.4 多窗口规则

- 每个 Tauri 窗口独立持有一个 Hub 实例（L1-53 C）。
- 同一 Profile 下，多个窗口可各自打开 Hub（互不冲突）。
- 跨窗口数据共享通过 IndexedDB + 广播通道。

### 10.5 与 FileManager 的边界

- **FileManager** 是文档管理工具（分类 / 批量 / 视图切换）。
- **Hub** 是项目首页（聚合入口 / 洞察 / 快捷）。
- CategoriesCard 的"点击就地展开"（U-10）不是 FileManager 的替代，仅是快速预览。
- 用户需要完整 FileManager 能力时走 `/files` 路由（Sidebar 的分类项点击触达）。

### 10.6 与 Settings 的边界

- **Settings** 是配置中枢。
- Hub 的"设置入口"在 Sidebar / HeaderAvatarMenu 的 "设置" 菜单项。
- Hub 本身不承载任何配置表单；仅承载配置成果的呈现（例如主题切换立即反映在 Hub 视觉）。

---

## 第十一章 可观测性与指标

### 11.1 必须埋点的事件

| 事件 | 触发点 | 用途 |
|---|---|---|
| `hub.opened` | Hub 每次打开 | 计算启动频率 |
| `hub.continue_writing_clicked` | ContinueWritingButton | 计算 M-01 达成率 |
| `hub.fab_opened` | FAB 展开 | 计算新建入口使用率 |
| `hub.fab.new_blank` | FAB 展开后选新建 | 区分新建路径 |
| `hub.fab.template` | FAB 展开后选模板 | 区分模板使用率 |
| `hub.fab.import` | FAB 展开后选导入 | 区分导入频率 |
| `hub.recent_doc_clicked` | RecentDocsCard 条目点击 | 计算回归效率 |
| `hub.category_expanded` | CategoriesCard 就地展开 | 衡量分类使用习惯 |
| `hub.inspiration_favorited` | 引言收藏 | 衡量引言质量 |
| `hub.insights_card_clicked` | InsightsCard 点击 | 衡量洞察深读率 |
| `hub.ftue_bubble_shown` | FTUE 气泡显示 | 衡量气泡触达率 |
| `hub.ftue_bubble_dismissed` | FTUE 气泡关闭 | 衡量气泡干扰度 |
| `hub.sidebar_collapsed` | Sidebar 折叠切换 | 衡量布局偏好 |
| `hub.card_error` | 任何卡片错误 | 错误追踪 |

### 11.2 性能埋点

| 指标 | 采集频率 | 告警阈值 |
|---|---|---|
| `hub.fcp` | 每次打开 | > 800ms |
| `hub.tti` | 每次打开 | > 800ms |
| `hub.store_reactive_latency` | 每次 Workstation 写入 | > 200ms |
| `hub.chart_rerender_latency` | 每次数据变化 | > 400ms |

### 11.3 审计与日志

- Hub 级关键事件（账户切换、导入、批量删除入口点击）写入 `activity_logs`（L1-34 D "全范围审计"）。
- 保留期：3 个月（L1-34 补充）。
- 可导出为 CSV（用户本人可见）。

---

## 第十二章 验收标准（25+）

### 12.1 功能性验收（Must Pass）

**AC-F-01** 新安装首次启动后，WelcomeModal 正确弹出，不自动创建 Demo 文档。
**AC-F-02** 关闭 WelcomeModal 后进入 FirstRunDispatcher，提供"创建正式账户 / 导入已有数据"两个选项，**不提供**匿名模式。
**AC-F-03** 首次进入空态 Hub，铁三角（Hero / RecentDocs / StatsPreview）全部可见。
**AC-F-04** 空态下 Hero 显示"尚无写作记录，开始第一篇吧"，点击"开始新文章"跳 Workstation 新文档。
**AC-F-05** 空态下 RecentDocsCard 显示"最近没有文章"文字占位（非 Skeleton）。
**AC-F-06** 空态下 InspirationCard 显示本地硬编码引言之一。
**AC-F-07** 存在 1+ 未完成文章时，Hero `<ContinueWritingButton>` 指向 `updatedAt` 最新的那篇。
**AC-F-08** Hero 图表点击某一日柱子跳转到该日期对应的文章列表（深链接，`/files?date=...`）。
**AC-F-09** RecentDocsCard 按卡片高度动态计算条数，下限 2 条。
**AC-F-10** CategoriesCard 点击分类后**就地展开**，不跳转到 Workstation / FileManager。
**AC-F-11** 展开的 Categories 面板内条目点击跳 Workstation。
**AC-F-12** QuickActionFab 展开 3 项：新建空白文档 / 从模板创建 / 导入。
**AC-F-13** FAB 禁止添加第 4 项；任何 PR 若添加第 4 项视为违反入口预算。
**AC-F-14** DraftBoxCard 显示前 N 条草稿 + 过期提醒（>30 天标记）。
**AC-F-15** AssetManagerCard 显示存储占用 + 孤儿素材数量。
**AC-F-16** TodoPanel 从"未完成文档"过滤得出列表，条目点击跳 Workstation。
**AC-F-17** InspirationCard 按日期轮换，优先级：用户句子 > AI 生成 > 本地硬编码。
**AC-F-18** InsightsCard 显示 2-3 个头等舱指标；点击单图跳转完整 Insights 或展开 Modal。
**AC-F-19** 账户切换走 `window.location.reload()`，并确保自动保存不失败才允许切换。
**AC-F-20** Sidebar 支持折叠 / 展开，状态持久化。
**AC-F-21** FTUEBubble 仅在"首次停留超 2 秒 + 关键入口未交互过"时触发，最多同时 1 个。
**AC-F-22** FTUEBubble 关闭后永不重新弹出（除用户主动重置）。
**AC-F-23** 任何卡片点击必须在 100ms 内给出视觉反馈。
**AC-F-24** Workstation 写入文章后，Hub 对应卡片在 100ms 内响应式刷新。
**AC-F-25** Hub 在无网络环境下正常可用（对齐 L1-02 A 本地优先）。

### 12.2 视觉验收（Must Pass）

**AC-V-01** Hub 视觉符合 Ethereal Constructivism 设计语言。
**AC-V-02** 所有卡片圆角统一（卡片 12px / 元素 8px）。
**AC-V-03** 所有卡片标题使用 `h3` 等级 + `font-weight: 600`。
**AC-V-04** 所有图标使用 `lucide-vue-next`，无 emoji / 无 Font Awesome 混用。
**AC-V-05** 进入动画 80ms，退出动画 120ms，缓动统一 `cubic-bezier(0.4, 0, 0.2, 1)`。
**AC-V-06** `prefers-reduced-motion` 系统设置被尊重，动画降级为 0ms。
**AC-V-07** 图表使用色盲友好调色板。
**AC-V-08** 亮色 / 暗色 / 护眼 / 暗夜红四主题下 Hub 均正常可读。

### 12.3 性能验收（Must Pass）

**AC-P-01** SLO-01 FCP ≤ 500ms。
**AC-P-02** SLO-02 TTI ≤ 500ms。
**AC-P-03** SLO-03 交互响应 ≤ 100ms。
**AC-P-04** SLO-04 Store 响应式刷新 ≤ 100ms。
**AC-P-05** SLO-05 图表重绘 ≤ 200ms。
**AC-P-06** SLO-06 Lighthouse Performance > 80。
**AC-P-07** Hub 首屏 JS gzipped ≤ 350KB。
**AC-P-08** 无网络环境下 Hub 首屏时间同样 ≤ 500ms。

### 12.4 响应式验收（Must Pass）

**AC-R-01** ≥1440px 4 列布局。
**AC-R-02** ≥1024px 3 列布局。
**AC-R-03** ≥768px 2 列布局。
**AC-R-04** <768px 1 列布局。
**AC-R-05** 铁三角在 <768px 断点下仍必可见（StatsPreview 允许折叠为"展开查看"）。
**AC-R-06** Sidebar 在 <1024px 默认折叠。
**AC-R-07** FAB 在所有断点下位置一致（右下 24px）。

### 12.5 i18n 与 a11y 验收

**AC-I-01** 全部文案可在 zh-CN / en-US 两种语言下切换。
**AC-I-02** 日期 / 数字格式本地化正确。
**AC-I-03** 卡片内无硬编码中文 / 英文字符串（全部走 i18n 资源文件）。
**AC-A-01** Hub 键盘可访问（Tab 遍历所有 CTA）。
**AC-A-02** 所有交互元素有 aria-label（即便 G-09 A 不做 WCAG AA，也保留基础 label）。

### 12.6 安全与数据验收

**AC-S-01** Hub 不缓存敏感数据（如 profile 密钥）到 localStorage。
**AC-S-02** 跨 Profile 数据严格隔离（切换账户 reload 后看不到旧 Profile 数据）。
**AC-S-03** Hub 不向外部服务器发送任何分析数据（v2.1 完全本地）。

### 12.7 灾难场景验收

**AC-D-01** Hub 在 IndexedDB 损坏时显示"数据风险错误"并进入安全模式（R-04 D）。
**AC-D-02** Hub 在某卡片报错时，其他卡片正常运作（错误隔离）。
**AC-D-03** Hub 在 Store 断链时不白屏，显示"数据加载异常，请重启"提示。

---

## 第十三章 发布计划与分期

### 13.1 v2.1 Hub 交付范围（P0 必做）

| 模块 | 是否 P0 |
|---|---|
| HubPage 主框架 | P0 |
| Sidebar 折叠 | P0 |
| HeroSection (WritingFlowCard 2.0) | P0 |
| ContinueWritingButton | P0 |
| RecentDocsCard 动态条数 | P0 |
| StatsPreviewCard 铁三角第三 | P0 |
| TemplateMarketCard | P0 |
| DraftBoxCard | P0 |
| AssetManagerCard | P0 |
| CategoriesCard + 就地展开 | P0 |
| InspirationCard 三层引言 | P0 |
| QuickActionFab 3 项 | P0 |
| SectionNav 保留 | P0 |
| WelcomeModal + FirstRunDispatcher | P0 |
| 空态 Hub | P0 |
| HeaderAvatarMenu | P0 |
| 4 主题适配 | P0 |
| i18n (zh / en) | P0 |

### 13.2 v2.1 Hub 交付范围（P1 推荐）

| 模块 | 是否 P1 |
|---|---|
| InsightsCard 预览 | P1 |
| TodoPanel | P1 |
| PinnedDocsCard | P1 |
| UpdateLogCard | P1 |
| FTUEBubble 上下文气泡 | P1 |
| 深链接跳转（Hero 点击日期） | P1 |

### 13.3 延期到 v2.2+ 的能力

- 卡片自定义布局
- 壁纸 / 写作氛围开关
- 社区模板市场
- 插件 Hub Card 扩展点

---

## 第十四章 风险登记与缓解

### 14.1 技术风险

| 风险 | 可能性 | 影响 | 缓解 |
|---|---|---|---|
| 图表库选型 POC 失败 | 中 | 延迟 | 预留 2 周 POC，失败时回退原生 SVG |
| Store 响应式链路断裂 | 低 | 高 | 单测覆盖 + 运行时检测 |
| IndexedDB 性能不足 | 中 | 中 | Web Worker 预计算 + 采样降级 |
| Tauri 跨窗口同步延迟 | 中 | 中 | 广播通道 + 去抖 |
| 主题切换 FOUC | 中 | 低 | 预加载 CSS 变量 |

### 14.2 产品风险

| 风险 | 可能性 | 影响 | 缓解 |
|---|---|---|---|
| 用户认为 Hub 过于安静 / 信息量不足 | 低 | 中 | 可选"信息密度"开关（v2.2） |
| 用户认为铁三角太死板 | 低 | 低 | 不改；坚持 U-11 A |
| 用户认为 FTUE 气泡仍是引导 | 中 | 低 | 提供"永久关闭"选项 |

### 14.3 用户体验风险

| 风险 | 可能性 | 影响 | 缓解 |
|---|---|---|---|
| Hero 图表首屏 > 500ms | 中 | 高 | 图表库 lazy load + 预渲染骨架 |
| CategoriesCard 展开卡顿 | 低 | 中 | 预加载 + 动画降级 |
| 新用户无法理解 Hub 用途 | 低 | 低 | WelcomeModal 一句话定位即可 |

---

## 第十五章 跨 Spec 依赖地图

### 15.1 Hub 依赖的上游 Spec

| Spec | 提供给 Hub 的 |
|---|---|
| `10-markdown-authority-spec.md` | Markdown 权威模型（AC 数据源） |
| `11-content-model-spec.md` | 文章 / 草稿 / 附件 Schema |
| `20-theme-font-typography-spec.md` | 视觉语言 / 字体 / 排版 |
| `27-performance-slo-spec.md` | 性能硬指标 |
| `33-diagnostic-logging-spec.md` | 事件埋点协议 |
| `17-crash-recovery-spec.md` | Hub 启动前的恢复检测 |
| `41-settings-migration-spec.md` | Hub 相关设置的迁移 |
| `06-account-auth-spec.md` | Profile / HeaderAvatarMenu |
| `07-settings-full-spec.md` | 跳转到 Settings 的入口 |

### 15.2 Hub 下游 Spec

| Spec | Hub 提供给它的 |
|---|---|
| `02-spec-hub-layout.md` | 本 PRD 的全部产品规则 |
| `08-data-insights-spec.md` | InsightsCard 的调用契约 |
| `FileManager` Spec | 从 CategoriesCard 就地展开后跳转的 query 参数 |
| `09-ui-polish-spec.md` | Hub 视觉验收点 |

### 15.3 Hub 平行依赖的 Spec

| Spec | 平行耦合点 |
|---|---|
| `03-spec-keybindings.md` | Hub 快捷键（F2 速查、Ctrl+N 新建、Ctrl+K 搜索等） |
| `StatusBar` Spec | Hub 不显示 StatusBar，但共享统计口径 |
| `TabBar` Spec | Hub 不使用 TabBar；Workstation 使用 |

---

## 附录 A 术语表

| 术语 | 含义 |
|---|---|
| Hub | InkForge 项目首页，启动态 |
| Workstation | 文档级工作区，聚焦态 |
| Bento Grid | 块状响应式网格布局 |
| 铁三角 | Hero + RecentDocs + StatsPreview 三张必保留的卡片 |
| FAB | Floating Action Button，浮动操作按钮 |
| FTUE | First Time User Experience，首次使用体验 |
| 空态 Hub | 无任何数据时的 Hub 呈现形态 |
| ContinueTarget | "继续创作"算法锁定的候选文章 |
| 入口预算 | Hub 全页面允许的"新建入口"上限，T02-13 C 的 3 个 |
| 虚拟分类 | 通过查询 / 状态聚合出的分类（收藏 / 智能文件夹） |
| 头等舱指标 | InsightsCard 仅展示的 2-3 个最关键指标 |
| Session | 自 Hub 打开到关闭的一次会话 |

## 附录 B 业务常量与硬性阈值

| 常量 | 值 | 依据 |
|---|---|---|
| Hub 入口预算上限 | 3 | T02-13 C |
| RecentDocs 最低条数 | 2 | T02-06 C |
| 草稿过期天数 | 30 | F-05 D 习惯 |
| 断点集合 | 1440 / 1024 / 768 | U-02 |
| FCP 预算 | 500ms | SLO-01 |
| TTI 预算 | 500ms | SLO-02 |
| 响应式刷新预算 | 100ms | SLO-04 |
| FTUE 气泡触发停留阈值 | 2000ms | 4.3 |
| 卡片最小高度 | 160px | 9.2 |
| 进入动画 | 80ms | 9.3 |
| 退出动画 | 120ms | 9.3 |
| 审计日志保留期 | 90 天 | L1-34 补充 |
| Profile 最大数量 | 50 | L1-35 |
| 单文档最大字符数 | 900,000 | L1-35 |
| 附件最大数量 | 2000 | L1-35 |
| 版本最大数 | 999 | L1-35 |

## 附录 C 设计决策溯源表

| 决策 | 来源 | 对应章节 |
|---|---|---|
| Hub 是项目首页 | U-01 / T02-17 C | 第一、第十章 |
| Bento Grid 高度 auto | U-02 / T02-03 B | 第四章 |
| Hero = WritingFlowCard 2.0 + ContinueWritingButton | U-03 / T02-01 + T02-14 | 第四章 |
| Section 2 = 创作工具 | U-04 / T02-02 D | 第四章 |
| 保留 scroll-snap / SectionNav | U-05 / T02-09 + T02-10 | 第四章 |
| 引言三层池 | U-06 / T02-04 D | 第四章 |
| Recent 动态条数 | U-07 / T02-06 C | 第四章 |
| Store 响应式无轮询 | U-08 / T02-07 B | 第一、第八章 |
| FAB 3 入口 | U-09 / T02-11 + T02-13 | 第四、第十二章 |
| Categories 就地展开 | U-10 / T02-12 B | 第四、第十二章 |
| 铁三角 | U-11 / T02-16 A | 第四章 |
| 极简 FTUE | U-12 + P-01 / L1-50 B 补充 | 第五章 |
| Hub → Workstation slide-left | T09-02 A | 第十章 |
| 零空壳交付 | L1-04 D | 第一章 |
| 纸张气质冻结 | L1-12 B / L1-39 A | 第一、第九章 |

## 附录 D 度量字典引用

Hub 使用的所有字数 / 目标 / 时间指标均引用 `MetricsDictionary`（U-14）定义，具体包括：

- `countPlainText(doc)` — 正文字数（排除标题、代码块、公式）
- `metrics.streak` — 连续写作天数
- `metrics.weeklyWordCount` — 本周字数
- `metrics.goalProgress` — 目标进度百分比
- `metrics.dailyWordCount(date)` — 某日字数
- `metrics.articleCount(status)` — 按状态统计文章数

**口径版本**：v1.0.0。任何变更必须走 T07-10 D 迁移流程。

## 附录 E 变更日志

| 版本 | 日期 | 变更摘要 | 作者 |
|---|---|---|---|
| v2.1.0 | 2026-04-21 | 初版；对齐 0420 决策文件 U 系列 | InkForge Spec 工程组 |

---

## 终章 · 交付信号

**Hub PRD 的终极衡量指标**：用户每日打开 InkForge 时，是否能在 3 秒内回到"昨天写的那篇"。若是，Hub 交付合格；若否，任何美观都不能弥补。

> "Don't make users think about where they left off. Show them."

以上即 Hub 首页 PRD v2.1.0 全部内容。
