# InkForge v2.1 合成决策 · Part 3a — 文档生命周期 / 写作辅助与专注 / 首次使用与帮助 / Hub 首页与数据洞察 / 跨任务依赖

> **作用域**: 域 N / 域 O / 域 P / 域 U / 域 V
> **合成日期**: 2026-04-20
> **合成源**: 01-L1-answers · 02a-L2-G-T01-T02 · 02b-L2-T03-T04-T05-T06 · 02c-L2-T07-T08-T09-X-S · 03-enhancement-answers
> **下游文档**: Part 1 (产品铁律) / Part 2 (编辑器与渲染) / Part 3b (Settings/Sync/Data) / Part 4 (数据模型与 Spec 列表)
> **决策条数**: 42
> **已解决冲突**: 8 条（T02-01↔T02-14 / T02-05↔T02-15 / X-05↔T08-01+T08-03+T09-02 / X-11↔T07-02 / L1-48↔N-01 / T09-04↔T09-13 / W-01↔W-06 / L1-50↔L1-52）

---

## 目录

- 0. 合成前置说明
- 域 N | 文档生命周期（L1-41 ~ L1-44, F-01 ~ F-08）
- 域 O | 写作辅助与专注（L1-45 ~ L1-49, EX-01, EX-06, T01 专注相关）
- 域 P | 首次使用与帮助（L1-50 ~ L1-52）
- 域 U | Hub 首页与数据洞察（T02 全 17 题, T08 全 11 题, L1-43, L1-45 联动）
- 域 V | 跨任务依赖（X-01 ~ X-12）
- 附 A | 已解决冲突汇总
- 附 B | Part 3a 落地点映射（Spec × 决策）

---

## 0. 合成前置说明

### 0.1 规范化规则

1. **"用户原始选择" 字段** = L1/L2/EX 原文"你的选择"（含用户补充里的隐式修正，如"拒绝匿名"、"不要示例文档"）。
2. **"规范化结论" 字段** = 合成后的最终可执行结论。若原选项与补充冲突，以更严格 / 更安全 / 更利于"零空壳"的那一端为准。
3. **"硬约束" 字段** = 必须/禁止列表，落地时不可妥协。
4. **"落地点" 字段** = 关联 Spec、组件、Store、Schema、测试矩阵。与 Part 4 Spec 清单 1:1 对齐。
5. 所有日期用 ISO (2026-04-20) ；涉及"近期 / 远期"用户原文一律锚定到 v2.1 / v2.2+ 两档。

### 0.2 本 Part 与 Part 1/Part 2/Part 3b 的边界

| Part | 作用域 | 典型决策 |
| ---- | ------ | -------- |
| Part 1 | 铁律、产品哲学、权威模型 | L1-01 ~ L1-12, L1-30 |
| Part 2 | 编辑器 / 渲染 / 导出核心 | T01, T04, T05, T09, E-xx, M-xx |
| **Part 3a（本 Part）** | **文档生命周期 / 写作辅助 / 首启 / Hub / 洞察 / 跨任务** | **L1-41~52, T02, T08, X-01~12** |
| Part 3b | Settings / Sync / Data / 账户 / 权限 / 审计 | T06, T07, L1-23~24, L1-33~34, F-01~08（文件管理细节） |

> **注**：域 N 的文档生命周期虽和 FileManager (F-01~F-08) 强耦合，但 F 组本身大部分落 Part 3b 的 FileManager Spec；本 Part 只吸收 F 组里与 *状态机 / 回收站 / 归档 / Hub 展示* 直接相关的部分（F-01 D 的虚拟分类、F-02 D 的批量状态变更、L1-43 收藏归入分类、L1-44 归档视图）。

---

## 域 N | 文档生命周期

> **领域定位**: 定义文档从"创建"到"归档/销毁"的完整状态机与侧挂系统（回收站、归档视图、快速访问、虚拟分类）。这是本轮 v2.1 新引入的一类一等公民实体。

### 决策 N-01 | 文档 6 态正式状态机

- **来源题**: L1-41 (C + 补充), L1-44 (D)
- **用户原始选择**: L1-41 = C（草稿 > 写作中 > 待审阅 > 待发布 > 已发布 > 归档，状态迁移有条件）；用户补充"状态必须显示在文件管理器和 Hub 卡片上，可以进行过滤筛选"；未选 D（不做状态依赖的编辑权限）
- **规范化结论**: 采用 **6 态 FSM**：`draft → writing → review → ready_to_publish → published → archived`。状态是 Document 模型的一等字段（非派生）；**不做状态依赖的编辑权限**（任何状态下正文都可编辑，"已发布"不强制"创建修订版"）。
- **硬约束**:
  - 必须：每个 Document 记录 `status: DocumentStatus` 字段 + `statusChangedAt` + `statusHistory[]`
  - 必须：状态必须显示在 FileManager 列表项、Hub `card-recent` / `card-pinned` 卡片、TabBar 标签页徽标
  - 必须：状态迁移有 FSM 合法性校验（不允许从 `archived` 直接跳到 `writing` 而不经过 `draft`，但允许任意状态手动移入 `archived`）
  - 必须：F-03 智能文件夹 / F-07 全局搜索 DSL 必须支持 `status:draft` / `status:writing` 等过滤
  - 禁止：将状态与访问控制（ACL / 编辑权限）耦合
- **状态迁移合法图**（提案，落地时在 `DocumentLifecycle` Spec 再细化）:
  ```
  draft ──────────┬─> writing ──> review ──> ready_to_publish ──> published
                  │                ↑                                  │
                  │                └──────────────────────────────────┘ (回稿)
                  │
                  └──> archived (任意状态均可 → archived)
  archived ──> draft (恢复后降回 draft 重新开始)
  ```
- **落地点**:
  - Spec：`DocumentLifecycle`（新建，重量级，>500 行）
  - Schema：`articles.status`, `articles.statusChangedAt`, `articles.statusHistory`（jsonb 样式）
  - Store：`src/stores/articles.ts` 新增 `updateStatus(id, next)` action
  - UI：FileManager 列表 StatusBadge、Hub 卡片 StatusTag、TabBar 状态徽标
  - 过滤：F-03 SmartFolder、F-07 SearchEngine DSL
  - 审计：状态变更走 activity_logger（对应 L1-34 的全范围审计铁律）

### 决策 N-02 | 回收站（软删除 + 过期 + 容量统计）

- **来源题**: L1-42 (D), T06-10 (B)（账户软删除与文档软删除一致化）
- **用户原始选择**: L1-42 = D（回收站 + 手动清空 + 自动过期 + 删除强制确认 + 审计日志）；用户补充"回收站必须要在应用内部可以使用，可以占用存储统计，必须与版本历史关联"
- **规范化结论**: 文档软删除默认过期 **30 天**（与 T06-10 账户软删除 7 天不同：文档更宽松，因为用户误删文档风险更大）。回收站是独立 UI 面板（非只是 FileManager 过滤），容量计入 Data Insights 存储统计；清空时**连带版本历史一起删除**（否则孤儿版本会污染数据库）。
- **硬约束**:
  - 必须：`articles.deletedAt` + `articles.expiresAt` 双字段
  - 必须：回收站面板独立路由 `/trash`，显示剩余天数倒计时
  - 必须：删除操作必须走"二次确认对话框"（L1-40 C 防呆 + L1-42 D）
  - 必须：清空/还原事件写入 activity_logger
  - 必须：Data Insights 存储统计区分"活跃文档 / 归档文档 / 回收站文档"三档
  - 必须：回收站内的文档可点击跳转查看（只读模式），但不可编辑（与归档区分：归档还可恢复为写作态）
  - 禁止：硬删除不经过回收站（除非用户在回收站内手动"永久删除"）
  - 禁止：清空回收站时保留孤儿版本历史
- **与 T06-10 的对齐**: T06-10 账户软删除 7 天 → 本决策文档软删除 30 天。差别原因：账户删除通常是刻意行为，文档删除常常是误操作。两者独立配置。
- **落地点**:
  - Spec：`TrashCan`（新建）
  - View：`src/views/TrashView.vue`
  - Schema：`articles.deletedAt`, `articles.expiresAt`, `articles.deletedBy`
  - GC Service：`src/services/trash/gc-scheduler.ts`（每日检查过期）
  - Data Insights：`src/components/insights/StorageBreakdown.vue`
  - 审计：`activity_logs` 新增 event `article.trashed` / `article.restored` / `article.purged`

### 决策 N-03 | 归档视图（冷存储 + 不计统计）

- **来源题**: L1-44 (D)
- **用户原始选择**: L1-44 = D（归档只读 + 不参与统计 + 可批量管理）；用户补充"归档文档是过气的文档，可以留作做后续使用"
- **规范化结论**: 归档 = **冷存储状态**，不出现在主列表 / Hub 卡片 / 统计图表 / 目标进度 / 数据洞察中，但保留完整可搜索能力。与回收站的差别：归档是"刻意保存",回收站是"等待清理"。
- **硬约束**:
  - 必须：FileManager 默认视图过滤掉 `archived` 文档；有独立"归档"Tab / 视图切换
  - 必须：所有 Data Insights 指标（字数、目标、活跃天数）必须排除归档文档（T08-07 的口径定义里要明确写入）
  - 必须：归档视图支持批量操作（批量导出、批量恢复、批量迁移、批量清理）—— 与 F-02 D 批量操作一致
  - 必须：归档文档仍然可被全局搜索命中（F-07 D + S-12 D），但结果上明确标注"归档"徽标
  - 可选：用户可设置"归档自动过期"（默认无，保留永久）
  - 禁止：归档文档参与 WritingGoal 进度（避免刷数据）
  - 禁止：归档文档默认出现在 Hub `card-recent`、Workstation 最近文档列表、TabBar 自动恢复
- **落地点**:
  - Spec：`DocumentLifecycle` Spec 的 "ArchiveSubsystem" 章节
  - View：`FileManagerView` 增加 `?view=archive` 参数
  - Metrics：`src/services/metrics/*` 所有指标统计排除 `status === 'archived'`
  - Search：搜索结果 UI 对归档项加 `<ArchiveBadge/>`

### 决策 N-04 | 收藏 / 置顶 / 快速访问 = 虚拟分类的一种

- **来源题**: L1-43 (D), F-01 (D), F-03 (D)
- **用户原始选择**: L1-43 = D（收藏/星标 + 置顶 + 固定到 Hub + 自定义快速访问列表）；用户补充"**收藏是分类的一种**"
- **规范化结论**: 收藏 / 置顶 / 快速访问 **不作为独立字段**，而是 **虚拟分类 (SmartFolder) 的一个内置实例**。与 F-01 D 的嵌套分类、F-03 D 的智能文件夹共用同一套底层抽象，避免三套并行数据。
- **硬约束**:
  - 必须：`SmartFolder` 是一等模型，内置系统 SmartFolder：`favorites`（用户手动标星）、`pinned`（用户固定到 Hub）、`recent-7d`（7 天内编辑）、`draft`、`archived`
  - 必须：用户可创建自定义 SmartFolder（基于 DSL query：`status:writing tag:blog wordCount:>3000`）
  - 必须：SmartFolder 可排序 / 可分组（与 L1-43 D 的"自定义快速访问可排序可分组"一致）
  - 必须：Hub 首页新增 `card-pinned` 展示 SmartFolder `pinned` 内容
  - 禁止：在 `articles` 表增加 `isFavorited` / `isPinned` 这类冗余布尔字段（用 SmartFolder 的 membership 表替代）
- **DSL 语法提案**（与 F-07 D + S-12 D 共用）:
  ```
  status:draft|writing|review|ready_to_publish|published|archived
  tag:<name>
  category:<path>
  wordCount:>3000  wordCount:<500  wordCount:1000..5000
  createdAt:>2026-01-01
  updatedAt:last-7d
  hasExport:wechat|zhihu|redbook
  ```
- **落地点**:
  - Spec：`SmartFolder`（新建，重量级）
  - Schema：`smart_folders` 表（id, name, query, order, userId）+ `smart_folder_members` 表（可选物化 cache）
  - Hub：`src/components/hub/PinnedCard.vue`（新增）
  - FileManager：左侧导航 SmartFolder 树
  - 复用：F-07 SearchEngine 的 query parser 与 SmartFolder 共享代码

### 决策 N-05 | Hub / FileManager / TabBar 状态一致呈现

- **来源题**: L1-41 补充, N-04 (D), N-05 (D)
- **用户原始选择**: L1-41 补充要求"状态必须显示在文件管理器和 Hub 卡片上"；N-05 D 要求 TabBar 圆点 + FileManager 标记 + 窗口标题 + 关闭确认
- **规范化结论**: 文档状态 / 脏状态 / 修改指示必须在三个位置一致呈现：FileManager、Hub 卡片、TabBar；窗口标题（Tauri）跟随激活文档。
- **硬约束**:
  - 必须：FileManager 每项显示 `<StatusBadge>` + `<DirtyDot>`（未保存小圆点）
  - 必须：Hub `card-recent` / `card-pinned` 每项显示 `<StatusTag>` + `<ProgressRing>`（目标进度，如有）
  - 必须：TabBar 标签页显示 `<DirtyDot>`（小圆点，未保存）+ `<StatusBadge>`（状态徽标）
  - 必须：Tauri 窗口标题格式：`<DirtyMark><DocumentTitle> — InkForge`，DirtyMark = `● ` 当脏状态
  - 必须：未保存状态下关闭 Tab / 窗口 / 账户切换时弹出确认（T06-12 A 一致）
- **落地点**:
  - Spec：`DirtyStateTracking`（新建，中型）
  - 组件：`<StatusBadge>`, `<DirtyDot>`, `<StatusTag>`, `<ProgressRing>`（全部位于 `src/components/common/`）
  - Composable：`src/composables/useDirtyState.ts`（全局监听脏状态）
  - Tauri：`src-tauri/src/window_title.rs`（动态窗口标题）

### 决策 N-06 | 批量操作覆盖全生命周期

- **来源题**: F-02 (D), L1-42 (D), L1-44 (D)
- **用户原始选择**: F-02 = D（批量移动 + 批量删除 + 批量导出 + 批量改标签 + 批量状态变更 + 批量归档）
- **规范化结论**: 批量操作必须覆盖状态机所有动作：移动、删除（软）、导出、改标签、改分类、状态迁移、归档、恢复（从回收站 / 归档）。
- **硬约束**:
  - 必须：FileManager 提供"选择模式"切换（长按 / Ctrl+点击 / 顶部按钮），进入后显示 `<BulkActionBar>`
  - 必须：批量操作前弹出确认（操作名 + 影响条数 + 前 3 条预览）
  - 必须：批量操作必须走命令系统（T05-09 D）并自动生成版本点（X-10 C）
  - 必须：批量状态变更必须走状态机合法性校验（决策 N-01）
  - 必须：批量删除（软）→ 落入回收站（决策 N-02）
  - 必须：批量归档 → 移入归档视图（决策 N-03）且从所有统计中剔除
  - 必须：失败项必须单独列出（不因某项失败中断整批）
  - 禁止：批量硬删除（除非在回收站里批量"永久删除"）
- **落地点**:
  - Spec：`BatchOperations`（中型）
  - 组件：`<BulkActionBar>`, `<BulkConfirmDialog>`, `<BulkResultReport>`
  - Service：`src/services/batch-command.ts`（包一层自动版本点 + 审计）

### 决策 N-07 | 文档属性弹出面板（非常驻）

- **来源题**: F-06 (C + 补充"弹出面板"), W-01 (A)
- **用户原始选择**: F-06 = C（简单属性 + 摘要/封面/字数/状态/版本/导出历史）；用户补充"弹出面板"；W-01 A "右栏只做预览"
- **规范化结论**: 文档元信息面板为**弹出态**（Popover / Dialog，非常驻右栏），触发入口位于 TabBar / StatusBar。右栏职责固定：仅预览（见决策 V-02 与 Part 2 的 Workstation 布局）。
- **硬约束**:
  - 必须：面板内容 = 摘要 / 封面 / 字数 / 状态 / 版本列表 / 导出历史 / 创建修改时间 / 标签 / 分类 / 关联素材数量
  - 必须：面板支持"编辑"模式（修改摘要 / 封面 / 标签 / 分类，不可改状态——状态走状态机合法迁移）
  - 必须：导出历史条目可点击"重导出"（与 P-02 C 联动）
  - 必须：版本列表条目可点击跳转 VersionHistory 面板
  - 禁止：做"自定义元数据字段"（F-06 未选 D）
- **落地点**:
  - Spec：`DocumentPropertyPanel`（中型）
  - 组件：`src/components/document/PropertyPanel.vue`
  - 触发：StatusBar 的 "i" 按钮 / TabBar 右键菜单"属性" / 快捷键

---

## 域 O | 写作辅助与专注

> **领域定位**: 围绕"沉浸式写作"主题的体验层集合——专注模式、目标系统、氛围配色、统计反馈、字数报告。这是 InkForge 的"iA Writer 哲学"落地区域。

### 决策 O-01 | 写作目标系统：双层目标 + 动画奖励 + Hub 洞察联动

- **来源题**: L1-45 (C + 补充), EX-06（v2.1 实现）
- **用户原始选择**: L1-45 = C（时间维度目标：日/周，跨文档累计）；用户补充"目标完成时提供动画以及奖励；目标必须要在 Hub 洞察中体现"
- **规范化结论**: 写作目标是**双层结构**：
  1. **单文档目标**（字数 / 时长，可选）
  2. **时间维度目标**（每日 / 每周字数，跨文档累计）
  
  完成时触发"成就动画 + 奖励"（奖励类型见下），目标进度必须在 Hub 数据洞察卡片、EditorStatusBar（N-01 C）、FocusMode 退场总结（决策 O-02）三处联动展示。
- **硬约束**:
  - 必须：用户可在 Settings > Writing 设置双层目标
  - 必须：每日目标完成 → 触发 `<GoalCompletionAnimation>`（纸张式微动效，严禁 emoji，严禁过于游戏化）
  - 必须：奖励内容 = 连续达成天数徽章 + 累计字数里程碑 + 当日完成截图（可选导出）
  - 必须：Hub 新增 `card-goals`（或并入现有 Insights 区），显示今日 / 本周进度环
  - 必须：EditorStatusBar 右侧常驻"今日 X/Y 字"计数器（可点击跳转设置）
  - 必须：目标统计口径与 T08-07 D 一致（纯文本字数，不含标题 / 代码块 / 公式）
  - 必须：归档文档字数不计入目标（决策 N-03 一致）
  - 禁止：使用任何 emoji 奖励（L1-39 A + T09-13 D）
  - 禁止：做写作冲刺模式（L1-45 未选 D）
- **落地点**:
  - Spec：`WritingGoal v2`（中型）
  - Store：`src/stores/writing-goal.ts`
  - Schema：`writing_goals`（id, accountId, scope: document|daily|weekly, target, current, achievedDates）
  - 组件：`<GoalProgressRing>`, `<GoalCompletionAnimation>`, `<GoalMilestoneBadge>`
  - Hub：`src/components/hub/GoalCard.vue`
  - Metrics 联动：与决策 U-14 Data Insights 共用字数计算函数

### 决策 O-02 | 专注模式深度：视觉极简而非功能极简

- **来源题**: L1-46 (D + 补充), T01-12 (B), W-05 (D)
- **用户原始选择**: L1-46 = D（全屏 + 环境计时器 + 退出时显示写作成果概要）；用户补充"专注模式下仍然必须允许快捷键/斜杠命令/保存操作，仅仅只是显示变少"；T01-12 B（当前段落高亮，其他段落降低透明度，但不自动激活打字机）
- **规范化结论**: 专注模式 = **视觉极简 + 功能完整**。隐藏 UI Panel 但保留所有快捷键 / 斜杠 / 保存 / 自动保存状态感知。退出时显示 `FocusSessionSummary` 总结页（会话字数增量、时长、目标达成情况）。专注模式与 Typora 模式、最大化模式正交——三者可独立叠加（W-05 D）。
- **硬约束**:
  - 必须：进入专注 = 隐藏 SideBar / TOC / VersionHistory / TabBar（保留单文档）/ Hub 链接
  - 必须：保留可见 = 编辑区 + 极简 StatusBar（可进一步整体关闭，见 N-01 补充）+ 快捷键提示入口
  - 必须：当前段落高亮 + 其他段落 opacity 0.35（T01-12 B）
  - 必须：打字机模式为**独立开关**（不随 FocusMode 自动激活，T01-12 B 明确）
  - 必须：环境计时器（session timer）默认关闭，用户可开启
  - 必须：退出时显示 `FocusSessionSummary`（session 字数增量 + 时长 + 目标进度变化 + "继续写作 / 返回 Hub"按钮）
  - 必须：专注模式下快捷键、斜杠命令、浮动工具栏、Ctrl+S、自动保存、错误通知（N-06 Toast）**全部不变**
  - 禁止：专注模式下吞掉任何命令（与 L1-46 补充冲突）
- **与相关模式的叠加矩阵**:
  | 模式组合 | 允许 | 备注 |
  |----------|------|------|
  | FocusMode + Typora | ✓ | 默认 |
  | FocusMode + Source | ✓ | 可用但缺失沉浸感 |
  | FocusMode + Maximize (W-05 D) | ✓ | 叠加增强沉浸 |
  | FocusMode + SplitView (W-06 D) | ✗ | 矛盾，禁用 |
  | FocusMode + 打字机 | ✓（独立开关） | 用户需单独启用 |
- **落地点**:
  - Spec：`FocusMode`（中型）
  - Composable：`src/composables/useFocusMode.ts`
  - 组件：`<FocusModeShell>`, `<FocusSessionSummary>`, `<ParagraphDimOverlay>`
  - CSS：`src/styles/focus-mode.css`
  - 快捷键：`Ctrl+Shift+F` (可用户改)

### 决策 O-03 | 不做独立阅读模式

- **来源题**: L1-47 (A)
- **用户原始选择**: L1-47 = A（不需要独立阅读模式）
- **规范化结论**: 预览面板（W-01 A）兼任阅读模式。不引入"第三模式"（Edit / Preview / Reading 三态）。
- **硬约束**:
  - 必须：Preview Panel 的排版必须足够舒适（不是编辑态的 preview-only），行距 / 字号 / 左右留白按"阅读"标准设计
  - 必须：Preview Panel 支持同步滚动（W-04 D）和临时解除
  - 禁止：引入第三种编辑器模式 / 第三种路由 / 第三种 Store 状态
- **落地点**: 合入 `WorkstationLayout` Spec 的 Preview Panel 章节（Part 2）

### 决策 O-04 | StatusBar 实时统计 + 整体可关闭（iA Writer 哲学）

- **来源题**: L1-48 (B), N-01 (C + 补充"一定要能关闭"), N-02 (D), L1-49 (B+C 补充 iA Writer)
- **用户原始选择**: L1-48 = B（字数 + 字符数 + 段落数 + 预估阅读时长）；N-01 = C（B + 纸张宽度 + 目标进度）；N-01 补充"statusbar 一定要能关闭，可以交给用户最干净的写作感受"；N-02 = D（每个区域都可交互触发）；L1-49 B+C 补充"iA Writer 的专注哲学很好，应用它"
- **规范化结论**: StatusBar 最终字段集 = **N-01 C 的超集**：
  - 字数（纯文本口径，T08-07 D）
  - 字符数
  - 段落数
  - 预估阅读时长
  - 纸张宽度档位
  - 目标进度（今日 X/Y 字）
  - 选中统计（S-06 C：正文+标题+选中）
  - 模式指示（Typora / Source / Preview）
  - 自动保存状态（E-07 D）
  - 同步状态（可选）
  
  整体 StatusBar 必须可通过一键开关隐藏（Settings > Appearance + 快捷键）；隐藏后仍可通过快捷键查看瞬时统计。**不显示行列号**（与 L1-48 B 一致，选"C"选项在 N-01 里指的是字段集不是"含行列号"）。
- **硬约束**:
  - 必须：每个字段都是"互动触发点"（N-02 D）
    | 字段 | 点击行为 |
    |------|---------|
    | 字数 | 打开 WordCountReport（EX-06） |
    | 目标进度 | 打开 WritingGoal 设置 |
    | 纸张宽度 | 循环切换档位（T01-11 C） |
    | 自动保存 | 打开保存失败详情 / 手动保存 |
    | 模式指示 | 切换模式（Ctrl+\） |
  - 必须：Settings > Appearance 提供"隐藏 StatusBar"开关 + 每个字段独立显示开关
  - 必须：StatusBar 隐藏后仍保留"一键显示 1 秒"快捷键（Alt+S 或自定义）
  - 禁止：显示行列号（与 L1-48 B 字段定义一致）
  - 禁止：显示打字速度 / 打字次数（未选 D）
- **落地点**:
  - Spec：`EditorStatusBar`（中型）
  - 组件：`<EditorStatusBar>`, `<StatusBarField>` x N
  - Store：`src/stores/ui.ts` 增加 `statusBar: { visible, fields: Record<FieldKey, boolean> }`

### 决策 O-05 | 字数详细报告（EX-06）

- **来源题**: EX-06（v2.1 实现）, S-06 (C)
- **用户原始选择**: EX-06 v2.1 实现
- **规范化结论**: 从 StatusBar 字数区点击打开 `WordCountReport` 弹窗，显示：
  - 正文字数（纯文本口径 T08-07 D）
  - 标题字数
  - 代码块字数
  - 公式字符数
  - 段落数
  - 句子数（按中英文标点切分）
  - 平均段落字数
  - 词频 Top 20（可选，影响性能则限定触发）
  - 当前选中统计（若有选区）
- **硬约束**:
  - 必须：弹窗内区分"纯文本口径"与"包括所有元素口径"两档
  - 必须：词频统计走 Web Worker（避免阻塞编辑）
  - 必须：报告可导出 CSV（与 T08-06 B 一致）
- **落地点**:
  - Spec：`WordCountReport`（中型）
  - 组件：`<WordCountReportDialog>`
  - Service：`src/services/metrics/word-count.ts`（与决策 U-14 复用）
  - Worker：`src/workers/word-frequency.ts`

### 决策 O-06 | 写作氛围：iA Writer 式安静 + 写作专用配色

- **来源题**: L1-49 (B+C), L1-58 (D + 补充)
- **用户原始选择**: L1-49 = B+C（安静界面 + 写作配色方案）；用户补充"iA Writer 的专注哲学很好，应用它"；L1-58 D 补充"编辑器内容区主题 与 应用 UI 主题允许独立"
- **规范化结论**: 确立 "iA Writer 式写作哲学" 为 InkForge 设计纲领。提供：
  1. "安静界面"一键开关（隐藏非必要 UI，与 FocusMode 独立但兼容）
  2. "写作模式配色"独立 Theme Track（WritingMode Theme），与应用 UI Theme (AppChrome) 解耦
  3. 切换写作配色不影响 UI，反之亦然（L1-58 D 补充）
- **硬约束**:
  - 必须：`ThemeEngine` 必须支持 `EditorContentTheme` + `AppChromeTheme` 双轨（Part 3b 会落细节）
  - 必须：预置至少 3 种写作配色：Ethereal Day（默认）/ Ethereal Night / iA Classic（仿 iA Writer 米白）
  - 必须：写作模式下禁止 emoji、禁止过于花哨的动效（T09-13 D）
  - 必须：动画在写作模式下按 T09-09 D 自动降级（可选）
  - 禁止：引入环境音 / 番茄钟（L1-49 未选 D）
- **落地点**:
  - Spec：`WritingAmbience`（并入 `ThemeEngine`，Part 3b 详述；本决策只锁哲学）
  - Settings：Settings > Appearance > Writing Mode Theme 选择器

### 决策 O-07 | 快速笔记 / Scratch Pad（EX-01 + L1-55 C）

- **来源题**: EX-01（v2.1 实现）, L1-55 (C), F-05 (D)
- **用户原始选择**: EX-01 v2.1 实现；L1-55 C（托盘 + 全局快捷键 Ctrl+Alt+N 快速笔记）；F-05 D（草稿多入口创建）
- **规范化结论**: 通过系统全局快捷键 `Ctrl+Alt+N`（默认，可自定义）唤起 Tauri 子窗口 `QuickNoteWindow`，轻量输入，内容自动归入草稿箱（`status: draft`）。可从系统托盘图标菜单唤起。
- **硬约束**:
  - 必须：子窗口极小 UI（仅标题 + 正文 + "保存并关闭"按钮）
  - 必须：保存自动落入 `draft` 状态（决策 N-01）
  - 必须：保存后可选"立即打开到 Workstation"或"关闭窗口"
  - 必须：全局快捷键即使 InkForge 未打开也能唤起（Tauri GlobalShortcut）
  - 必须：系统托盘图标默认显示（Settings > Desktop 可关）
  - 必须：快速笔记不阻塞主窗口（独立进程或独立 WebView 实例）
- **落地点**:
  - Spec：`QuickNoteWindow`（中型）/ `TauriSystemIntegration`（Part 3b）
  - Tauri：`src-tauri/src/quick_note.rs`, `tray.rs`, `global_shortcut.rs`
  - View：`src/views/QuickNoteWindow.vue`

---

## 域 P | 首次使用与帮助

> **领域定位**: 极简 FTUE（首次用户体验）+ 上下文式帮助系统。用户明确"讨厌引导"，因此整个域的基调是**克制、被动、可调出**。

### 决策 P-01 | 极简首启：欢迎弹窗 + 不创建示例文档

- **来源题**: L1-50 (B + 补充), T06-08 (D 但拒绝匿名), L1-52 (A)
- **用户原始选择**: L1-50 = B 但补充"我讨厌引导，做轻量和欢迎即可，**不需要示例文档**"；T06-08 = D 但"拒绝匿名模式"；L1-52 = A（所有功能第一天全部可见）
- **规范化结论**: FTUE **极简三步**：
  1. 首启显示 `WelcomeModal`（品牌、一句话定位、"开始使用"按钮）
  2. 引导用户创建正式账户 **或** 导入已有数据（二选一，无匿名）
  3. 完成后直接进入 Hub（空状态），不生成任何示例文档
  
  所有功能 Day 1 即可见，不分"基础 / 高级"、不加"New"标签、不做进度式发现。
- **硬约束**:
  - 必须：WelcomeModal 只出现一次（`settings.hasSeenWelcome` 持久化标记）
  - 必须：FirstRunDispatcher 提供两条路径："创建账户" / "导入数据"
  - 禁止：自动生成示例文章 / 示例分类 / 示例模板
  - 禁止：匿名模式入口（T06-08 补充）
  - 禁止：引导式 Tour / 分步指引 / coach mark 逐步提示（L1-50 补充）
  - 禁止：给功能加 "New" 徽标 / 显示发现进度条（L1-52）
- **与 T02-05 / T02-15 的冲突解决**: 详见附录 A 冲突 #2。最终路径为：WelcomeModal → FirstRunDispatcher → 创建账户 / 导入 → Hub（空态但完整 UI，不切引导版）。
- **落地点**:
  - Spec：`FTUE`（小型）
  - 组件：`<WelcomeModal>`, `<FirstRunDispatcher>`
  - Store：`settings.hasSeenWelcome`, `settings.onboardingPath: 'create' | 'import' | null`

### 决策 P-02 | 上下文帮助系统：速查卡 + 上下文气泡

- **来源题**: L1-51 (C)
- **用户原始选择**: L1-51 = C（Markdown 语法速查卡 + 上下文气泡帮助）
- **规范化结论**: 两层帮助：
  1. **MarkdownCheatsheet**：可快捷键唤起的语法速查面板（F1 或 Ctrl+?）
  2. **ContextTooltip**：首次使用某功能时出现的"What's this?"气泡（有"已读"记忆，不重复弹）
  
  不做完整内置帮助文档；外链到在线文档（可选，v2.1 可延后）。
- **硬约束**:
  - 必须：MarkdownCheatsheet 包含所有支持的语法（含 InkForge 专属扩展，L1-07 C）
  - 必须：ContextTooltip 必须有 "不再显示" 按钮，点击后永久记忆
  - 必须：`seen_tooltips` 表或 localStorage 记录每个 tooltip 的已读状态
  - 必须：所有 ContextTooltip 文案必须在 i18n 资源文件（中英双语 G-08 C）
  - 禁止：强制弹窗 / 阻断式教程
  - 禁止：无法关闭的 tooltip
- **落地点**:
  - Spec：`HelpSystem`（中型）
  - 组件：`<MarkdownCheatsheet>`, `<ContextTooltip>`
  - Store：`src/stores/help.ts`（已读 tooltip 集合）
  - 数据：`src/data/markdown-cheatsheet.ts`

### 决策 P-03 | 所有功能 Day 1 可见，无渐进发现

- **来源题**: L1-52 (A)
- **用户原始选择**: L1-52 = A（所有功能第一天全部可见）
- **规范化结论**: 全量可见策略。这是设计纲领级约束，**作为 UX 规范写入 Part 4 设计语汇字典**。
- **硬约束**:
  - 禁止："New" 标签 / "Beta" 徽标（除非真是实验性功能，且需 Settings > Advanced 才可开启）
  - 禁止：功能发现进度条
  - 禁止：解锁式功能（"写够 10000 字解锁 X"）
  - 必须：高级功能可通过"开发者模式 / 高级模式"（T07-09 C）控制显隐，但默认对所有用户开放基础层
- **落地点**: Part 4 设计语汇字典的"可见性原则"条款

---

## 域 U | Hub 首页与数据洞察

> **领域定位**: Hub 是 InkForge 的"项目首页"（T02-17 C），Data Insights 是 Hub 上最重的一类"内容区"。本域把 T02 全 17 题 + T08 全 11 题全部覆盖。

### 决策 U-01 | Hub 定位：项目首页，与 Workstation 层级区分

- **来源题**: T02-17 (C)
- **用户原始选择**: T02-17 = C（Hub 更像项目首页，Workstation 更像文档级工作区，二者要有明显层级区分）
- **规范化结论**: 
  - **Hub** = 项目首页 / 仪表盘 / 导航中心
  - **Workstation** = 文档级工作区（编辑 + 预览 + 版本 + TOC）
  - 两者**有明确层级**但**没有强制状态保留 / 返回策略**（C 与 D 的关键差别）
- **硬约束**:
  - 必须：Hub → Workstation 走 `slide-left` 过渡动画（T09-02 A）
  - 必须：Workstation → Hub 走 `slide-right` 过渡动画
  - 必须：Workstation 面包屑 / 返回按钮明显可见
  - 必须：同一账户同一时间只能打开一个 Hub 实例（多窗口各自独立 Hub）
  - 允许：Workstation 不强制保留上次状态（可从空进入，不是必须恢复）
  - 禁止：Hub 与 Workstation 做 Tab 并列（必须 View 切换）
- **落地点**:
  - Spec：`WorkstationLayout`（Part 2）+ `HubView`（本 Part 承载主规范）
  - 路由：`/hub` 与 `/workstation/:id` 独立

### 决策 U-02 | Bento Grid 布局：auto 高度 + 4→3→2→1 响应式

- **来源题**: T02-03 (B), T02-08 (C)
- **用户原始选择**: T02-03 = B（纯 auto 高度，不视口撑满）；T02-08 = C（4→3→2→1 四级响应）
- **规范化结论**: Hub 主 Grid 使用 Bento 风格，**按内容撑高**（不强制 100vh）；响应式断点四级：`≥1440px 4 列` → `≥1024px 3 列` → `≥768px 2 列` → `<768px 1 列`。
- **硬约束**:
  - 必须：Grid 高度 = `auto`，首屏也不强制铺满视口
  - 必须：断点精确值：1440 / 1024 / 768（可在 Tailwind config 调整，初版锁定此值）
  - 必须：Card 最小高度由内容决定，不强制等高
  - 保留：scroll-snap（决策 U-04）
- **落地点**:
  - Spec：`HubLayout`（中型）
  - CSS：`src/views/HubView.vue` 的 grid 模板

### 决策 U-03 | Hero 区 = WritingFlowCard + "继续创作"入口（冲突解决）

- **来源题**: T02-01 (A + 补充), T02-14 (B)
- **用户原始选择**: T02-01 = A（直接搬 WritingFlowCard）+ 补充"在 WritingFlowCard的基础上进行改善，使之更加美观"；T02-14 = B（Hero "继续创作"指向最近编辑且未完成的文章）
- **冲突**: T02-01 A 选项本身不含"继续创作"按钮；T02-14 B 要求 Hero 承担该入口。
- **规范化结论**: Hero 区 = **重新设计的 WritingFlowCard 2.0**，同时承载：
  1. 7 根柱状图 + 周频分布（保留 A 的视觉内容）
  2. 右侧 / 底部嵌入 `<ContinueWritingButton>`（T02-14 B），指向"最近编辑且未完成"文章
  3. 视觉升级：更精致（T02-01 补充）
- **硬约束**:
  - 必须：Hero 高度 ≥ 图表高度 + 继续创作入口高度
  - 必须："继续创作"对象算法：`articles.filter(status ∈ {draft, writing}).orderBy(updatedAt desc)[0]`
  - 必须：若无候选文章，显示"开始新文章"按钮（新建入口，占用 T02-13 C 的 3 入口预算之一）
  - 必须：图表交互遵循 T08-04 C（Hover Tooltip + 点击跳转）
  - 禁止：Hero 做"新建"直达按钮（避免占用过多入口预算，T02-13 C）
- **未完成判定**: `status ∈ {draft, writing, review, ready_to_publish}`（只要不是 published / archived 都算未完成）
- **落地点**:
  - Spec：`HubHero`（中型）
  - 组件：`src/components/hub/WritingFlowCard.vue` (重设计) + `<ContinueWritingButton>`
  - Service：`src/services/hub/select-continue-target.ts`

### 决策 U-04 | Section 2 = 创作工具区（模板 + 草稿 + 素材）

- **来源题**: T02-02 (D)
- **用户原始选择**: T02-02 = D（创作工具区：模板 + 草稿箱 + 素材管理入口）
- **规范化结论**: Section 2 主题为 "创作工具"，三卡并列：
  - `TemplateMarketCard`（重设计，对接 S-01 真实模板系统）
  - `DraftBoxCard`（新增，对接 F-05 D 草稿箱）
  - `AssetManagerCard`（新增，对接 F-04 素材库入口）
- **硬约束**:
  - 必须：三卡在 4 列断点下占据 Section 2 全宽
  - 必须：模板卡片接入真实模板数据（S-01 不再占位）
  - 必须：草稿卡片显示前 N 条草稿 + 过期提醒（F-05 D）
  - 必须：素材卡片显示存储占用 + 孤儿警告（F-04 补充）
- **落地点**:
  - Spec：`HubSection2`（小型，并入 `HubLayout`）
  - 组件：`<TemplateMarketCard>` (更新), `<DraftBoxCard>` (新), `<AssetManagerCard>` (新)

### 决策 U-05 | 保留 scroll-snap + 保留 SectionNav

- **来源题**: T02-09 (A), T02-10 (A)
- **用户原始选择**: T02-09 = A（保留 scroll-snap）；T02-10 = A（保留当前 SectionNav）
- **规范化结论**: scroll-snap 保留不改；右侧 SectionNav 保留不改。
- **硬约束**:
  - 必须：CSS `scroll-snap-type: y mandatory` + 每个 Section `scroll-snap-align: start`
  - 必须：SectionNav 位置 / 样式不变，仅在新增 Section 时同步更新
  - 禁止：把 scroll-snap 做成可选项（T02-09 未选 C）
- **落地点**:
  - CSS：`src/views/HubView.vue`
  - 组件：`src/components/hub/SectionNav.vue`（保留现状）

### 决策 U-06 | 引言卡片：本地硬编码 + AI 生成混合 + 用户句子回填

- **来源题**: T02-04 (D + 补充)
- **用户原始选择**: T02-04 = D（A+C 混合：有足够文章时用用户句子，否则用内置引言）；用户补充"本地硬编码加上 AI 生成"
- **规范化结论**: 三层引言池：
  1. **本地硬编码 50-100 条**（底层兜底，零网络）
  2. **AI 预生成缓存**（启动时 / 定时调用本地或远端 LLM 预生成，入库缓存；v2.1 可用占位实现）
  3. **用户文章精彩句子提取**（当用户文章数 ≥ 阈值 N，如 5 篇）
  
  按日期轮换 + 优先级 (3 > 2 > 1)。
- **硬约束**:
  - 必须：本地硬编码引言必须离线可用
  - 必须：AI 生成走 T07-01 A 的 AI 设置（v2.1 AI Tab 是占位，所以 AI 引言可能只是"预留接口"，实际走占位引言池）
  - 必须：用户句子提取需排除草稿 / 归档文档（与决策 N-03 一致）
  - 必须：提取的句子必须显示来源（"来自《文章 X》"）
  - 禁止：调用外部 API 必须联网（用户明确 v2.1 本地优先）
- **落地点**:
  - Spec：`InspirationCard`（小型）
  - Data：`src/data/quotes.ts`（硬编码池）
  - Service：`src/services/inspiration/extract-user-quotes.ts`
  - 组件：`src/components/hub/InspirationCard.vue`

### 决策 U-07 | card-recent 动态条数（下限 2，上限由空间决定）

- **来源题**: T02-06 (C)
- **用户原始选择**: T02-06 = C（动态：空间允许时显示更多，最少 2 条）
- **规范化结论**: 按 Bento 卡片实际可用高度动态计算条数，下限 2 条，无固定上限（由 ResizeObserver 实时计算）。
- **硬约束**:
  - 必须：使用 `useElementSize` / `ResizeObserver` 监听卡片尺寸
  - 必须：条目包含状态徽标（决策 N-05）+ 修改时间 + 标签
  - 必须：包含"继续创作"对象必须置顶（与 Hero 的 ContinueTarget 保持一致）
  - 必须：归档文档不出现（决策 N-03）
- **落地点**:
  - 组件：`src/components/hub/RecentCard.vue`
  - Composable：`src/composables/useDynamicListSize.ts`

### 决策 U-08 | Hub 数据刷新：Store 响应式，无轮询

- **来源题**: T02-07 (B)
- **用户原始选择**: T02-07 = B（Store 响应式自动更新，无需手动刷新）
- **规范化结论**: 完全依赖 Pinia Store 响应式链路。Workstation 写入 → Store 更新 → Hub 自动刷新。无轮询、无强制 reload、无脏数据检查。
- **硬约束**:
  - 必须：所有 Hub 使用的 Store 必须确保响应式链路完整（getters 依赖的数据源必须是 reactive）
  - 必须：Workstation / QuickNote / 批量操作的写入必须 commit 到相同的 Store
  - 必须：账户切换时走 `window.location.reload()`（T06-05 C）重建 Store
  - 禁止：在 Hub 进入时手动 `refresh()` / `reload()` 数据（除非 Store 断链）
  - 禁止：后台定时轮询（T02-07 未选 C）
- **落地点**:
  - Store：`src/stores/articles.ts`, `src/stores/metrics.ts`, `src/stores/drafts.ts`, `src/stores/tags.ts`
  - 约定：每个 Store 文件顶部注释"响应式链路说明"

### 决策 U-09 | QuickActionFab：三入口（新建 / 模板 / 导入）

- **来源题**: T02-11 (B), T02-13 (C)
- **用户原始选择**: T02-11 = B（展开菜单：新建文章 + 从模板创建 + 导入 Markdown）；T02-13 = C（最多 3 个入口：新建 / 模板 / 导入）
- **规范化结论**: FAB 展开 3 项严格对齐 T02-13 C 的入口预算：
  - 新建空白文档
  - 从模板创建
  - 导入（.md / .docx, S-08 B）
- **硬约束**:
  - 必须：FAB 固定右下角
  - 必须：展开动画 ≤ 200ms
  - 必须：Hub 全页面入口总数不得超过 3 个（FAB 3 个 = 已达上限，其他卡片不得再设"新建"入口）
  - 必须："导入"项打开 ImportWizard（S-13 D）
  - 必须："从模板创建"打开模板选择面板（S-01）
  - 禁止：添加"快速笔记"入口到 FAB（快速笔记走系统级快捷键 O-07）
  - 禁止：添加第 4 项入口
- **落地点**:
  - 组件：`src/components/hub/QuickActionFab.vue`（重设计）

### 决策 U-10 | card-categories 点击行为：就地展开

- **来源题**: T02-12 (B)
- **用户原始选择**: T02-12 = B（展开显示该分类下的最近文章列表）
- **规范化结论**: 点击分类卡片在 Hub 内**就地展开**（Accordion / Expandable Panel），不跳转 Workstation。展开内容 = 该分类下最近 10 篇文章。
- **硬约束**:
  - 必须：展开动画平滑（T09-03 A 等级）
  - 必须：展开面板内条目点击跳 Workstation（保留入口但不在卡片默认态）
  - 禁止：点击直接跳走（弱化页面跳转，与 U-01 层级区分一致）
- **落地点**:
  - 组件：`src/components/hub/CategoriesCard.vue`

### 决策 U-11 | Hub 卡片优先级铁三角：Hero + Recent + Stats

- **来源题**: T02-16 (A)
- **用户原始选择**: T02-16 = A（Hero、Recent、Stats 必保留，其余可折叠）
- **规范化结论**: 小屏或窄空间时，铁三角优先级：**Hero > Recent > Stats**。其余卡片（Categories / Templates / Drafts / Assets / Goals / Insights / Pinned / Inspiration）按顺序降级折叠或隐藏。
- **硬约束**:
  - 必须：Hub 卡片元数据表包含 `priority` 字段（1 = 铁三角, 2 = 次要, 3 = 可折叠）
  - 必须：768px 以下只保留 Hero + Recent（Stats 也可折叠）
  - 必须：折叠态下显示"展开查看"按钮，不直接消失
- **落地点**:
  - Schema：Hub card registry
  - CSS：`@media (max-width: ...)` 的显隐规则

### 决策 U-12 | Onboarding 路径：WelcomeModal → FirstRunDispatcher → 空态 Hub（冲突解决）

- **来源题**: T02-05 (C), T02-15 (B), L1-50 (B + 补充)
- **用户原始选择**: T02-05 = C（单独 Onboarding Flow 取代空 Hub）；T02-15 = B（首次显示完整引导版 Hub）；L1-50 补充"讨厌引导"
- **冲突**: T02-05 C 与 T02-15 B 路径互斥。
- **规范化结论**（对齐决策 P-01）: 
  ```
  首启 → WelcomeModal（决策 P-01）
      → FirstRunDispatcher（创建账户 / 导入）
      → 进入空态 Hub（不是"引导版 Hub"，也不是"独立 Onboarding"）
  ```
  空态 Hub = 正常 Hub 布局，每个卡片显示"空状态说明"（T09-11 A 的文字占位，非 Skeleton）。无引导式 Tour、无分步弹窗、无示例文档。
- **硬约束**:
  - 必须：空态 Hub 的 CTA 集中在 FAB（3 入口）和 Hero 的"开始新文章"按钮
  - 必须：无数据时 Hero WritingFlowCard 显示"尚无写作记录，开始第一篇吧"
  - 必须：空态 Recent 显示"最近没有文章"
  - 禁止：切换到"引导版 Hub"或"独立 Onboarding 视图"
  - 禁止：任何分步弹窗 / Tour
- **与 P-01 的关系**: P-01 定义 FTUE 极简框架，U-12 定义 FTUE 之后 Hub 如何呈现空态。
- **落地点**:
  - Spec：`FTUE` + `HubEmptyState`
  - 组件：每个 Hub 卡片都需自己的 EmptyState 分支（T09-04 A）

### 决策 U-13 | Data Insights 范围：6 图表全做 + 存储统计 + 目标洞察

- **来源题**: T08-01 (A), T08-02 (B)
- **用户原始选择**: T08-01 = A（全部 6 个新图表）；T08-02 = B（ExportFrequency 需要新增导出日志记录）
- **规范化结论**: v2.1 必须全量交付 6 个图表：
  1. `WritingTimeline` — 写作时间轴
  2. `ProductivityInsights` — 生产力洞察（字数增量 / 日均产出 / 写作时长）
  3. `WordDistribution` — 字数分布（按文章 / 按状态 / 按分类）
  4. `RecentActivity` — 最近活动热图
  5. `ExportFrequency` — 导出频率（必须新增 `export_logs` 表或扩展 `activity_logs`）
  6. `StorageBreakdown` — 存储占用（配合决策 N-02 / N-03 / F-04，区分活跃 / 归档 / 回收站 / 素材）
- **硬约束**:
  - 必须：全部 6 个图表必须在 v2.1 交付，不允许延期
  - 必须：`ExportFrequency` 的数据源必须是新增的 `export_logs` 记录（T08-02 B）
  - 必须：所有图表必须遵循决策 U-14 ~ U-19 的通用规则
  - 禁止：任何图表以"占位"形式交付
- **落地点**:
  - Spec：`DataInsights`（重量级）
  - 组件：`src/components/insights/*Card.vue` x 6
  - Schema：`export_logs` 表 (id, articleId, platform, exportedAt, params, outputSize, result)

### 决策 U-14 | 统计口径字典：纯文本字数 + 正式定义所有指标

- **来源题**: T08-07 (D + 补充), S-06 (C)
- **用户原始选择**: T08-07 = D（所有指标正式定义 + 来源表 + 计算方式 + 边界 + 异常）；补充"字数按照纯文本，不算标题，不算代码块，不算公式"
- **规范化结论**: 建立 `MetricsDictionary` 权威文档，每个指标必须包含：
  - 指标名
  - 业务定义
  - 数据源表 / 字段
  - 计算公式
  - 边界条件（空文档 / 归档 / 回收站 / 草稿）
  - 异常处理（NaN / null / 超大值）
  - 口径版本号（用于迁移）
  
  **字数口径**固定为**纯文本字数**（不含标题文字、不含代码块内容、不含公式）。本决策是所有涉及字数的功能的**唯一真值来源**（WritingGoal / WordCountReport / Insights / StatusBar 全部引用此定义）。
- **硬约束**:
  - 必须：`MetricsDictionary.md` 在 `prompts/0420/spec/` 作为独立文档，Part 4 引用
  - 必须：`src/services/metrics/` 每个指标有对应的计算函数 + 单元测试
  - 必须：字数计算函数 `countPlainText(doc)` 是唯一入口，所有地方调用它
  - 必须：口径变更必须伴随版本升级 + 迁移（类似 T07-10 D）
  - 必须：选中文本统计（S-06 C）也走同一口径
  - 禁止：多处散落的字数计算（违反 DRY）
  - 禁止：悄悄修改口径不升版本
- **落地点**:
  - Spec：`MetricsDictionary`（独立文档）
  - Service：`src/services/metrics/` x N 指标函数
  - Tests：`src/services/metrics/__tests__/` x N 单元测试

### 决策 U-15 | 图表技术选型：轻量图表库（unovis / frappe-charts）

- **来源题**: T08-03 (C)
- **用户原始选择**: T08-03 = C（轻量库，如 unovis 或 frappe-charts）
- **规范化结论**: 引入**轻量图表库**（二选一：`unovis` 或 `frappe-charts`），不使用 Chart.js（~60KB 太重），不坚持零依赖。最终选型待性能基准测试决定（v2.1 预研阶段）。
- **硬约束**:
  - 必须：选型必须通过性能 POC（6 图同时渲染不破坏 Lighthouse > 80）
  - 必须：封装适配层 `src/services/chart-adapter/`，所有图表组件走适配层（便于日后换库）
  - 必须：图表库代码必须走 dynamic import（G-04 C 的 lazy load 要求）
  - 禁止：直接在组件里 `import` 图表库（必须走适配层）
- **落地点**:
  - `package.json`：新增依赖（待 POC 决定）
  - 适配层：`src/services/chart-adapter/`

### 决策 U-16 | 图表交互：Hover Tooltip + 点击跳转

- **来源题**: T08-04 (C)
- **用户原始选择**: T08-04 = C（Hover Tooltip + 点击跳转）
- **规范化结论**: 所有 6 个图表必须支持：
  - Hover → Tooltip 显示详细数据
  - Click → 跳转到对应文章 / 时间段（深链接）
- **硬约束**:
  - 必须：每个 insight 组件 emit `navigate` 事件
  - 必须：Workstation / FileManager 支持带 filter / time 参数的深链接（`/workstation/:id?highlight=...`, `/files?timeRange=...`）
  - 必须：Hover Tooltip 在移动端 / 触摸设备自动降级为 Click 显示（虽然 T09-12 A 不做触控优化，但图表 Hover 是基本体验）
- **落地点**:
  - 组件：每个 `<*InsightCard>` 内部
  - 路由：`src/router/index.ts` 增加 query 参数支持

### 决策 U-17 | 时间范围：固定为默认 + 部分可展开调范围

- **来源题**: T08-05 (C)
- **用户原始选择**: T08-05 = C（固定为默认，部分图表可展开查看更多）
- **规范化结论**: 默认时间范围 = 最近 30 天。部分图表（WritingTimeline / ProductivityInsights / ExportFrequency）提供"展开"按钮，打开 `<InsightDetailModal>` 可调整范围（日 / 周 / 月 / 自定义）。
- **硬约束**:
  - 必须：`<InsightCard>` 支持 `expandable: boolean` 属性
  - 必须：展开 Modal 保留所有交互（Hover Tooltip / Click 跳转）
  - 必须：可调范围的图表记忆用户上次选择
- **落地点**:
  - 组件：`<InsightCard>`, `<InsightDetailModal>`

### 决策 U-18 | 图表 CSV 导出：每图独立按钮

- **来源题**: T08-06 (B)
- **用户原始选择**: T08-06 = B（每个图表"导出 CSV"按钮）
- **规范化结论**: 每张图表右上角 action slot 提供 CSV 导出按钮。**不做**统一"导出洞察报告"（C 选项未选）。
- **硬约束**:
  - 必须：CSV 文件名格式 `inkforge-insight-<chartName>-<YYYY-MM-DD>.csv`
  - 必须：CSV 字段与图表口径一致（引用决策 U-14）
  - 必须：导出走 Tauri 文件系统（与 T05-03 D 一致）
- **落地点**:
  - Service：`src/services/insights/csv-exporter.ts`
  - 组件：`<InsightCard>` 的 action slot

### 决策 U-19 | 多层刷新策略：实时 / 会话 / 日级错峰

- **来源题**: T08-08 (D + 补充)
- **用户原始选择**: T08-08 = D（多层刷新策略）；用户补充"不要让所有计算同时进行，占据大量资源导致卡顿"
- **规范化结论**: 指标分三层刷新频率：
  1. **实时层**（编辑时实时更新）: StatusBar 字数、今日目标进度
  2. **会话层**（每 30 秒或关键事件）: Hub Hero 图表、RecentActivity、WritingTimeline
  3. **日级层**（每日一次或手动触发）: WordDistribution 按分类聚合、StorageBreakdown
  
  使用 `requestIdleCallback` + 时间片分片，避免多指标同时计算。
- **硬约束**:
  - 必须：每层指标独立注册刷新频率（`src/services/metrics-scheduler/`）
  - 必须：错峰策略（不同指标在不同时间片轮询）
  - 必须：日级指标的结果持久化缓存（IndexedDB），避免每次 Hub 打开都重算
  - 必须：重计算必须走 Web Worker（`src/workers/insights-worker.ts`）
  - 禁止：实时层指标放到日级（导致用户以为数据停滞）
  - 禁止：日级指标放到实时层（卡顿）
- **落地点**:
  - Service：`src/services/metrics-scheduler/`
  - Worker：`src/workers/insights-worker.ts`
  - Schema：`metrics_cache` 表（key, value, scope, computedAt, expiresAt）

### 决策 U-20 | 异常数据：完整性徽标 + 重算入口

- **来源题**: T08-09 (D + 补充)
- **用户原始选择**: T08-09 = D（图表显示缺口 + 不完整提示 + 重新计算 + 查看异常来源）；补充"我注重统计可信"
- **规范化结论**: 图表必须显式处理数据缺口 / 脏数据：
  - 缺口 → 图表显示断点或空值区间
  - 脏数据 → `<IntegrityBadge>` 子组件显示警告
  - 用户可点击徽标查看异常来源列表
  - 提供"重新计算"按钮强制重新扫描数据源
- **硬约束**:
  - 必须：每个 `<InsightCard>` 内置 `<IntegrityBadge>`
  - 必须：`src/services/metrics/integrity-checker.ts` 对每个指标做完整性校验
  - 必须：重算走 Worker，不阻塞 UI
  - 必须：异常来源列表可导出（便于用户提 bug）
- **落地点**:
  - 组件：`<IntegrityBadge>`, `<IntegrityDetailModal>`
  - Service：`src/services/metrics/integrity-checker.ts`

### 决策 U-21 | 洞察驱动动作：与 Hub / Workstation 强联动

- **来源题**: T08-10 (D + 补充)
- **用户原始选择**: T08-10 = D（C + 基于洞察触发建议动作）；补充"允许数据洞察与 Hub / Workstation 强联动"
- **规范化结论**: Data Insights 不仅是展示，还能**生成建议动作**：
  - "你有 5 篇草稿 7 天未更新" → 一键"整理草稿"（跳 FileManager + 过滤 draft）
  - "本周字数比上周低 30%" → 一键"打开上周高产文章"作为写作参考
  - "X 标签下文章数量激增" → 建议"创建 X 标签智能文件夹"
  
  建议动作必须可关闭（Settings > Insights > Show Suggestions）。
- **硬约束**:
  - 必须：`<InsightActions>` 组件承载建议动作 UI
  - 必须：建议动作基于规则引擎（`src/services/insights/action-generator.ts`）
  - 必须：Hub / Workstation / FileManager 暴露可被跳入的 query 参数 API（与决策 U-16 深链接一致）
  - 必须：用户可关闭所有建议动作
  - 禁止：自动执行动作（必须用户确认）
- **落地点**:
  - 组件：`<InsightActions>`, 建议卡片
  - Service：`src/services/insights/action-generator.ts`
  - 规则数据：`src/data/insight-action-rules.ts`

### 决策 U-22 | 大数据降级：资源占用监控 + 采样 + Worker 预计算

- **来源题**: T08-11 (D + 补充)
- **用户原始选择**: T08-11 = D（C + 每类图表定义最大采样量/聚合规则/超限提示）；补充"基于资源占用进行降级"
- **规范化结论**: 每个图表声明 `maxSampleSize`、`aggregationRule`、`overflowBehavior`；运行时监控内存 / CPU 占用，超阈值自动降级（跳过次要指标 / 减小采样 / 关闭动画）。
- **硬约束**:
  - 必须：每个 `<*InsightCard>` 组件声明采样上限
  - 必须：后台预计算用 Web Worker（`src/workers/insights-worker.ts`）
  - 必须：超限时显示"数据量过大，已采样显示"徽标
  - 必须：配合 T09-09 D 动画降级机制（性能不足时关闭图表动效）
  - 必须：配合决策 V-06 Lighthouse > 80 硬指标
- **落地点**:
  - Service：`src/services/metrics-scheduler/` + `src/services/performance-monitor/`
  - Worker：`src/workers/insights-worker.ts`

---

## 域 V | 跨任务依赖（X-01 ~ X-12）

> **领域定位**: X 组不是独立 Task，而是**横切所有 Task 的共享契约**。每条决策都是对 T01-T09 全局的硬约束。

### 决策 V-01 | FloatingToolbar 在 Typora/Source 下行为完全一致

- **来源题**: X-01 (A)
- **用户原始选择**: A（行为完全一致）
- **规范化结论**: FloatingToolbar 不读取 mode 变量，Typora 模式与 Source 模式完全一致。Source 模式下，工具栏动作映射到 Markdown 源码的结构化 transform（如"加粗" → 包裹选中文本为 `**...**`）。
- **硬约束**:
  - 必须：`<FloatingToolbar>` 不根据 editor mode 切换可见按钮
  - 必须：Source 模式下工具栏动作走 Markdown AST transform（需 `src/editor/source-mode-actions.ts`）
  - 禁止：Source 模式隐藏工具栏（X-01 未选 C）
- **落地点**:
  - 组件：`src/components/editor/FloatingToolbar.vue`
  - Service：`src/editor/source-mode-actions.ts`

### 决策 V-02 | KaTeX / Mermaid 始终渲染，不做 focus-toggle

- **来源题**: X-02 (B)
- **用户原始选择**: B（始终渲染）
- **规范化结论**: KaTeX / Mermaid 在编辑器内**始终保持渲染态**（与代码块 T01-08 A / 图片 T01-18 B 的规则不同）。光标进入不切源码，简化扩展复杂度。
- **硬约束**:
  - 必须：KaTeX NodeView 始终渲染（编辑入口走 Popover / 双击对话框）
  - 必须：Mermaid 走 Stage 面板（T04-03 C）而非内联渲染（因此本决策对 Mermaid 的适用性有限，主要约束 KaTeX）
  - 禁止：实现 `focus-toggle` 逻辑
- **落地点**:
  - 扩展：`src/editor/extensions/math.ts`（KaTeX NodeView）
  - 不改：Mermaid 扩展已经是独立 Stage（T04-03 C）

### 决策 V-03 | 全局 errorHandler + Toast（不自动禁用扩展）

- **来源题**: X-03 (A)
- **用户原始选择**: A（Vue errorHandler + Toast）
- **规范化结论**: 使用 `app.config.errorHandler` 捕获全局错误，配合 `<Toast>`（N-06 D 的 Sonner）提示用户。**不做自动禁用出错扩展**（X-03 未选 B，避免误禁）。错误分级按 G-13 D 四层（提示 / 可恢复 / 阻断 / 数据风险）处理。
- **硬约束**:
  - 必须：`src/main.ts` 注册 errorHandler
  - 必须：错误记录到 activity_logger（R-02 D）
  - 必须：数据风险错误（保存失败 / 迁移失败）按 G-13 D 强制走数据风险分支（阻断 + 自动备份）
  - 禁止：自动禁用扩展（与 R-04 D 的"安全模式"不同——安全模式是启动态的显式选择，不是运行时自动禁用）
- **落地点**:
  - 入口：`src/main.ts`
  - Composable：`src/composables/useErrorToast.ts`
  - Service：`src/services/error-severity/`

### 决策 V-04 | IndexedDB 迁移：显式脚本 + 进度提示

- **来源题**: X-04 (B), G-10 (A)（注：G-10 选 A 自动迁移，X-04 选 B 显式脚本——以 X-04 为准，因为 X 优先级高于 G 的默认值）
- **用户原始选择**: X-04 = B（首次启动跑迁移脚本 + 进度提示）
- **规范化结论**: IndexedDB schema 升级走**显式迁移**（不依赖 Dexie 的 `.version().upgrade()` 隐式自动升级）：
  1. 启动时检测 schema 版本
  2. 不匹配 → 显示 `<MigrationProgressModal>`
  3. 顺序执行迁移脚本（带回滚点 T07-10 D）
  4. 完成后进入应用
  5. 失败进入安全模式（R-04 D）
- **硬约束**:
  - 必须：迁移前自动生成完整数据库备份（与 X-11 灾难恢复联动）
  - 必须：进度弹窗不可取消（避免半迁移状态）
  - 必须：迁移失败必须有明确回滚路径
  - 必须：迁移脚本幂等（重复跑无副作用）
- **与 G-10 A 的和解**: G-10 A 字面意思是"Dexie 自动迁移"，但用户在 X-04 明确选 B。解决：Dexie 的 `.version()` 机制仍使用（作为底层 API），但外层包装"显式进度提示"。功能等价于 B。
- **落地点**:
  - Service：`src/services/db-migration/`
  - 组件：`<MigrationProgressModal>`
  - Schema 版本：`src/db/schema-version.ts`

### 决策 V-05 | 性能 SLO：Lighthouse > 80 + L1-36 硬指标

- **来源题**: X-05 (C + 补充), L1-36 (C + 补充)
- **用户原始选择**: X-05 = C（Lighthouse > 80）；补充"性能必须极致优化"；L1-36 C + 补充"输入无延迟；保存 ≤ 1s；冲突检测 ≤ 10s；导出 ≤ 3min"
- **规范化结论**: 性能预算（硬指标）:
  | 指标 | 阈值 | 来源 |
  |------|------|------|
  | 输入延迟 | 0ms（用户无感知） | L1-36 |
  | 保存耗时 | ≤ 1s | L1-36 |
  | 冲突检测 | ≤ 10s | L1-36 |
  | 导出耗时 | ≤ 3min | L1-36 |
  | 首屏渲染 | < 3s | X-05 |
  | Hub 打开 | < 1s | X-05 |
  | Lighthouse Performance | > 80 | X-05 |
  
- **硬约束**:
  - 必须：CI 集成 lighthouse-ci，阈值 80 为 fail
  - 必须：`prompts/0420/spec/perf-budget.md` 记录基线 + 每 Task 完成时更新
  - 必须：所有新依赖（图表库 U-15 / docx 导入 S-08 / codemirror T01-06）必须走 dynamic import
  - 必须：超阈值触发自动降级（T09-09 D / U-22 / T08-11 D）
  - 禁止：引入任何破坏 Lighthouse > 80 的大依赖不做懒加载
- **落地点**:
  - 配置：`.lighthouserc.json`
  - 文档：`prompts/0420/spec/perf-budget.md`
  - Monitor：`src/services/performance-monitor/`

### 决策 V-06 | 文章存储格式：HTML 主存储（不迁移）

- **来源题**: X-06 (B), L1-05 (A), L1-06 (D)
- **用户原始选择**: X-06 = B（HTML 主存储，当前）；L1-05 A（Markdown 是唯一权威源）；L1-06 D（不切换权威模型，但强制严格契约）
- **规范化结论**: 运行时持久化层 = **HTML**（`articles.content: string`），但**Markdown 是表达权威源**。两层并存：
  - **表达权威**: Markdown 文本（用户意图、导出基准、AI 集成基准）
  - **运行时持久化权威**: HTML（IndexedDB 存储、TipTap 编辑缓存）
  - **一致性契约**: 写入时 Markdown → HTML（TipTap 渲染），读取时 HTML → Markdown（TipTap markdown serializer），导出从 Markdown 派生
- **硬约束**:
  - 必须：`articles.content: string`（HTML）保持现状，不迁移到 JSON / Markdown 主存储
  - 必须：Markdown ↔ HTML 序列化器必须无损 round-trip（L1-08 + 补充）
  - 必须：所有导出链路从 Markdown 派生（L1-30 D 补充"平台独立渲染"）
  - 必须：搜索索引可以基于 HTML 或 Markdown（推荐 Markdown，因为更稳定）
  - 禁止：平台适配反向污染 HTML / Markdown（L1-30 D）
- **落地点**:
  - Schema：`articles.content` 保持 string(HTML)
  - Service：`src/editor/markdown-serializer.ts`（双向）
  - Spec：`ContentAuthorityModel`（Part 1 铁律章节详述）

### 决策 V-07 | 版本历史：无限版本 + diff 存储 + 文档版本包

- **来源题**: X-07 (C), X-09 (D + 补充)
- **用户原始选择**: X-07 = C（无限版本 + diff 存储）；X-09 = D（文档版本包）；补充"回滚是一致回到当时状态的"
- **规范化结论**: 版本历史策略:
  1. **无限版本**（L1-35 上限 999 不冲突，999 是单文档硬上限；无上限指"不主动 GC"）
  2. **diff 存储**（节省空间，用 `diff-match-patch` 或 `fast-diff`）
  3. **文档版本包（DocumentVersionBundle）** = 正文 + 资源引用 + 导出参数 + 评论锚点 + 状态 + 标签（回滚完整还原）
  4. 清理由 L1-17 补充"内存占比触发警告" + 用户手动操作
- **硬约束**:
  - 必须：`article_versions` 表存储 diff（非全量）+ 定期 snapshot（如每 50 版一次全量）
  - 必须：每次 `DocumentVersionBundle` 回滚**完整还原**所有字段
  - 必须：版本恢复走双栏 diff/merge 视图（L1-18 D）
  - 必须：版本历史支持 diff 查看（EX-05 v2.1 实现）
  - 禁止：版本超上限 999 后硬删除（必须先提示用户）
- **落地点**:
  - Spec：`VersionHistory`（重量级）
  - Service：`src/services/version-store/`
  - Schema：`article_versions` (id, articleId, version, diffFromPrev, bundleSnapshot, createdAt)

### 决策 V-08 | 无工期 + 证据化验收

- **来源题**: X-08 (C + 补充), X-12 (D + 补充), G-14 (D)
- **用户原始选择**: X-08 = C（不设时间限制）；补充"我是 AI 协助下开发，开发完为止"；X-12 = D（数据迁移/恢复/导出保真/异常/权限都要证据化）；补充"人工主观 + 机器测试。机器测试在先，所有验收必须附截图/日志/导出结果/对比样本"
- **规范化结论**: **不设工期**，以**证据化验收**作为 Done 的唯一标准。每个 Task 必须交付 `artifacts/<task-id>/` 目录，包含：
  - `screenshots/`：所有关键 UI 状态截图（含暗色 / 亮色）
  - `logs/`：E2E 测试日志、性能日志
  - `exports/`：导出产物样本（HTML/MD/微信/知乎/小红书）
  - `comparisons/`：与 0327 spec、与 0420 决策的逐项对照
  - `acceptance-matrix.md`：正向 / 失败 / 恢复 / 边界四类样本
- **硬约束**:
  - 必须：`prompts/0420/spec/acceptance-matrix-template.md` 作为所有 Task 的验收模板
  - 必须：机器测试（Vitest + Playwright，G-03 C）先行，人工验收在后
  - 必须：每个 Task 的 PR 必须附 `artifacts/<task-id>/` 目录
  - 必须：验收证据必须签入仓库（不存云 / 不存外部）
  - 禁止：以"没时间"为由删减验收证据
  - 禁止：人工主观判断优先于机器测试
- **落地点**:
  - Template：`prompts/0420/spec/acceptance-matrix-template.md`
  - CI：PR 检查 `artifacts/` 目录存在性

### 决策 V-09 | 批量操作 / AI 命令：版本点 + 审计

- **来源题**: X-10 (C + 补充), T05-12 (D + 补充), L1-34 (A+B+C + 补充"全范围")
- **用户原始选择**: X-10 = C（命令名 + 影响范围 + 自动版本点）；补充"任何自动化操作必须强制生成版本点"；T05-12 = D（C + 自动版本点 + 审计日志）；L1-34 补充"全范围审计"
- **规范化结论**: 所有批量操作 / AI 写操作必须:
  1. 记录命令名、影响范围摘要、执行者（账户）、时间戳
  2. 自动生成 `DocumentVersionBundle` 版本点（决策 V-07）
  3. 写入 activity_logger（L1-34 D 级"全范围审计"）
  4. AI 写操作必须先预览 diff（T05-12 D）
  5. 用户确认后才写入
- **硬约束**:
  - 必须：`src/services/command-audit/` 包装所有批量 / AI 命令
  - 必须：`withVersionPoint(name, scope, fn)` helper 强制生成版本点
  - 必须：命令不能绕过审计（通过 commandRegistry T05-09 D 统一入口）
  - 必须：AI 命令走 Notion/IDE 式预览 → 确认 → 应用流程（T05-12 补充）
  - 必须：每次 AI 应用可无损回滚到应用前状态（T05-12 补充）
  - 禁止：任何自动化操作不留痕
- **落地点**:
  - Service：`src/services/command-audit/`, `src/services/ai-command-executor/`
  - Schema：`activity_logs` 扩展 + `ai_suggestions` 表（pending / applied / rejected）

### 决策 V-10 | 灾难恢复：自动快照 + 安全模式 + 文章不能丢（底线）

- **来源题**: X-11 (C + 补充), R-01 (D), R-05 (D + 补充), T07-02 (D), T07-03 (B+C)
- **用户原始选择**: X-11 = C（B + 自动恢复最近备份/快照）；补充"决不能接受文章消失，文档内容是底线"；R-01 D（beforeunload + Recovery Mode）；R-05 D + 补充"后台静默最小资源"；T07-02 D（Git 同步）
- **规范化结论**: 灾难恢复多层次保障:
  1. **beforeunload 紧急保存**（localStorage + IndexedDB 双写）
  2. **数据库完整性校验**（启动时 + 后台 Worker 定期，R-05 D）
  3. **自动快照**（T07-03 B 的自动备份 + 与 X-09 版本包联动）
  4. **安全模式**（R-04 D）：校验失败 → 进入只读抢救态
  5. **Git 同步作为 derived**（T07-02 D）：Git 不是 primary，IndexedDB 才是 primary；Git 同步失败不影响本地数据
  
  **铁律**："文章不能丢"是 v2.1 最高优先级 bug 类别。
- **硬约束**:
  - 必须：IndexedDB 为 primary，Git 为 derived（冲突时 IndexedDB 胜）
  - 必须：启动前完整性检查 + 失败自动进入 SafeMode
  - 必须：SafeMode 下只读展示文章 + 提供导出抢救
  - 必须：自动快照频率由 L1-17 C 的"修改完成"触发（非时间周期）
  - 必须：后台校验使用 Web Worker + `requestIdleCallback`（R-05 补充"最小资源"）
  - 禁止：任何场景下"文章消失"（即使加载失败也要有能找回的路径）
  - 禁止：Git 同步冲突覆盖本地未提交数据
- **与 T07-02 D Git 同步的关系**:
  - Git 仓库 = 文章目录镜像（.md 文件形式）
  - IndexedDB = 主存储（HTML 主存储 V-06 + 元数据 + 版本历史）
  - 同步方向：IndexedDB → Git（正向导出为 .md），Git → IndexedDB（反向解析回 HTML + diff 合并）
  - 冲突：优先以 IndexedDB 为准，Git 变更走"外部编辑合并"路径（L1-54 D 冲突检测）
- **落地点**:
  - Spec：`CrashRecovery` + `DataIntegrity` + `SafeMode`（Part 3b 详述）
  - Service：`src/services/db-health-checker/`, `src/services/safe-mode/`, `src/services/git-sync/`
  - Worker：`src/workers/integrity-checker.ts`

### 决策 V-11 | 全路径验收矩阵

- **来源题**: X-12 (D + 补充)（已在决策 V-08 展开）
- **规范化结论**: 本决策与 V-08 合并，此处保留条目便于在 Spec 索引中查找。见决策 V-08。

### 决策 V-12 | 跨任务 UI 一致性回归

- **来源题**: T09-13 (D + 补充), G-11 (D + 补充)
- **用户原始选择**: T09-13 = D（C + 新组件必须映射到已有设计语汇）；补充"必须保持和谐统一，任何突兀的东西，例如 emoji 都会让我极其反感"；G-11 = 逐项判定 + 最新日期文档优先
- **规范化结论**: 跨任务 UI 一致性是最严级：
  1. 所有新组件必须映射到 `design-language.md` 已有语汇
  2. **严禁 emoji**（L1-39 A + T09-13 补充）
  3. 严禁"似是而非的新风格"
  4. 冲突以最新日期文档优先，但每项显式记录真值来源（G-11 补充）
- **硬约束**:
  - 必须：`prompts/0420/spec/design-language.md` 作为设计语汇字典
  - 必须：所有 PRD / Spec 模板的每一条必须带"权威来源"字段（文档 / 原型 / 代码 / 混合）
  - 必须：代码评审流程包含"emoji 检查"（自动化 lint 规则）
  - 必须：组件的 `EmptyState`（T09-04 A 的自定义实现）必须遵循 design-language 的"空状态设计准则"（避免 A 与 D 的冲突，详见附录 A）
  - 禁止：任何 emoji 出现在 UI（除用户正文输入）
  - 禁止：引入"风格大杂烩"的新组件
- **落地点**:
  - Spec：`design-language.md`（独立权威文档）
  - Lint：ESLint 规则 + UI 评审 checklist

---

## 附录 A | 已解决冲突汇总

### 冲突 #1 | T02-01 vs T02-14（Hero 结构）

- **冲突**: T02-01 选 A（Hero 仅图表，无按钮）；T02-14 要求 Hero 承担"继续创作"入口。
- **解决**: 决策 U-03。Hero = 重设计的 WritingFlowCard + `<ContinueWritingButton>` 内嵌。视觉上保留图表主体，按钮作为卡片底部的 CTA 区域。
- **优先级依据**: "零空壳交付"铁律（L1-04 D）要求所有承诺必须落地，因此必须同时满足两题。

### 冲突 #2 | T02-05 vs T02-15 + L1-50（新用户引导）

- **冲突**: T02-05 C（独立 Onboarding Flow）；T02-15 B（引导版 Hub）；L1-50 补充"讨厌引导，不要示例文档"。
- **解决**: 决策 P-01 + 决策 U-12。最终路径：WelcomeModal → FirstRunDispatcher（创建/导入）→ 空态 Hub（完整 Hub 布局 + 每卡空状态文字）。不做独立 Onboarding，不做引导版 Hub。
- **优先级依据**: 用户补充"讨厌引导"是强语义约束，压倒选项 C/B 的字面意思。

### 冲突 #3 | X-05 vs T08-01 + T08-03 + T09-02（性能 vs 功能）

- **冲突**: X-05 要求 Lighthouse > 80；T08-01 要求 6 图表全做；T08-03 引入图表库；T09-02 要求全套页面切换动画。
- **解决**: 决策 V-05 + 决策 U-15 + 决策 U-22 + 决策 U-19 + 决策 T09-09（Part 2）联合承载：
  1. 图表库必须通过 POC（U-15）
  2. 所有新依赖走 dynamic import（V-05）
  3. 图表走 Web Worker 预计算（U-19 / U-22）
  4. 动画按类别分级 + 自动降级（T09-09 D，详见 Part 2）
  5. CI 阈值强约束（V-05）
- **优先级依据**: "零空壳交付"要求功能全落地 + "性能必须极致优化"要求硬指标 → 通过技术手段 (lazy + Worker + 降级) 共同满足。

### 冲突 #4 | X-11 vs T07-02 Git 同步（Source of Truth）

- **冲突**: X-11 "文章不能丢"要求强保障；T07-02 D Git 同步引入另一套 source of truth（Git 仓库），冲突时以谁为准未定义。
- **解决**: 决策 V-10。**IndexedDB 为 primary，Git 为 derived**。Git 同步失败不影响本地；Git 变更按"外部编辑合并"路径（L1-54 D）走冲突检测 UI，由用户决策。
- **优先级依据**: "文章不能丢"是最高底线，不能因为同步策略引入丢失风险。

### 冲突 #5 | L1-48 vs N-01（StatusBar 字段集）

- **冲突**: L1-48 B（字数/字符数/段落数/预估阅读时长）；N-01 C（B + 纸张宽度 + 目标进度），但 N-01 的 "B" 指代 L1-48 的某个字段集，两者定义略有不匹配（是否含行列号歧义）。
- **解决**: 决策 O-04。采用 N-01 C 的字段集（B + 纸张宽度 + 目标进度），**明确不显示行列号**，且整体可关闭。
- **优先级依据**: N-01 是更后提出、更具体的定义；iA Writer 哲学（L1-49 B+C）要求克制，不显示行列号。

### 冲突 #6 | T09-04 vs T09-13（空状态自由 vs 一致性严格）

- **冲突**: T09-04 A（每组件自定义空状态）；T09-13 D（最严一致性 + 新组件必须映射到已有设计语汇）。
- **解决**: 决策 V-12。每组件自定义空状态 **但必须遵循 design-language.md 的"空状态设计准则"**。自由度体现在文案 / 插图选择，一致性体现在色系 / 间距 / 字号。
- **优先级依据**: 两者并非互斥，通过"框架一致 + 内容自由"的分层约束共同落地。

### 冲突 #7 | W-01 vs W-06（右栏职责 vs 分屏参考）

- **冲突**: W-01 A（右栏仅预览）；W-06 D（两文档并排对比）。并排对比的副栏放哪里？
- **解决**（Part 2 主决策，本 Part 仅引用）: 引入"右栏模式切换器"（预览 / 参考文档 / 分屏对比），默认仅预览。W-01 A 的"仅预览"是**默认模式**而非"唯一模式"。
- **优先级依据**: 用户同时选了 W-01 A 和 W-06 D，说明需要兼容。通过模式切换器兼容两者。

### 冲突 #8 | L1-50 vs L1-52（讨厌引导 vs 全功能可见）

- **冲突**: L1-50 补充"讨厌引导"可能被误解为"隐藏功能避免打扰"；L1-52 A "所有功能第一天可见"要求全量暴露。
- **解决**: 决策 P-01 + 决策 P-03。两者实际不冲突：L1-50 反对的是"主动 Tour / 分步弹窗"，L1-52 要求的是"功能入口全部可见"。最终 = 全量可见 + 零主动教学，所有帮助走被动唤起（决策 P-02）。
- **优先级依据**: 两题相互补充而非冲突，需要精确理解用户意图。

---

## 附录 B | Part 3a 落地点映射（Spec × 决策）

### 新建重量级 Spec（本 Part 承载）

| Spec 名 | 承载决策 | 估算规模 |
|--------|---------|---------|
| `DocumentLifecycle` | N-01, N-02, N-03, N-04 | 600+ 行 |
| `TrashCan` | N-02 | 300 行 |
| `SmartFolder` | N-04（+ F-01/F-03 Part 3b 联动） | 400 行 |
| `FocusMode` | O-02 | 300 行 |
| `WritingGoal v2` | O-01, U-14 | 400 行 |
| `DataInsights` | U-13 ~ U-22 | 800+ 行 |
| `MetricsDictionary` | U-14 | 独立文档 |
| `CrashRecovery + DataIntegrity + SafeMode` | V-10 | Part 3b 主承载，本 Part 引用 |
| `DocumentVersionBundle + VersionHistory` | V-07, V-09 | 500+ 行 |

### 新建中型 Spec

| Spec 名 | 承载决策 |
|--------|---------|
| `EditorStatusBar` | O-04 |
| `WordCountReport` | O-05 |
| `QuickNoteWindow` | O-07 |
| `FTUE` | P-01, U-12 |
| `HelpSystem` | P-02 |
| `HubLayout` | U-01, U-02, U-05, U-11 |
| `HubHero` | U-03 |
| `BatchOperations` | N-06, V-09 |
| `DirtyStateTracking` | N-05 |
| `DocumentPropertyPanel` | N-07 |

### 独立规范文档

| 文档 | 承载决策 |
|-----|---------|
| `design-language.md` | V-12 |
| `perf-budget.md` | V-05 |
| `acceptance-matrix-template.md` | V-08 |

### Schema 变更清单（由本 Part 决策触发）

- `articles.status` / `statusChangedAt` / `statusHistory`（N-01）
- `articles.deletedAt` / `expiresAt` / `deletedBy`（N-02）
- `smart_folders` 表 + `smart_folder_members`（N-04）
- `export_logs` 表（U-13）
- `metrics_cache` 表（U-19）
- `writing_goals` 表（O-01）
- `article_versions` 表（V-07）
- `activity_logs` 扩展 + `ai_suggestions` 表（V-09）
- `seen_tooltips`（P-02，可用 localStorage 替代）

### Store 变更清单

- `src/stores/articles.ts`：新增 `updateStatus`, `softDelete`, `restore`, `archive`
- `src/stores/smart-folders.ts`：新建
- `src/stores/writing-goal.ts`：新建
- `src/stores/metrics.ts`：新建（响应式 + 多层刷新调度）
- `src/stores/trash.ts`：新建
- `src/stores/ui.ts`：新增 `statusBar` 配置
- `src/stores/help.ts`：新增已读 tooltip 集合

### 服务层新增清单（`src/services/`）

- `metrics/`：字数、时长、活跃天数等计算函数（U-14）
- `metrics-scheduler/`：多层刷新调度（U-19）
- `insights/action-generator.ts`：建议动作规则引擎（U-21）
- `insights/csv-exporter.ts`：CSV 导出（U-18）
- `trash/gc-scheduler.ts`：回收站过期 GC（N-02）
- `batch-command.ts`：批量操作包装器（N-06, V-09）
- `command-audit/`：命令审计（V-09）
- `ai-command-executor/`：AI 命令执行器（V-09）
- `version-store/`：版本存储（V-07）
- `db-migration/`：显式迁移（V-04）
- `error-severity/`：错误分级（V-03）

### Worker 新增清单（`src/workers/`）

- `insights-worker.ts`：图表数据预计算（U-22）
- `word-frequency.ts`：词频统计（O-05）
- `integrity-checker.ts`：后台完整性校验（V-10）

### Composable 新增清单（`src/composables/`）

- `useFocusMode.ts`（O-02）
- `useDirtyState.ts`（N-05）
- `useDynamicListSize.ts`（U-07）
- `useErrorToast.ts`（V-03）

---

## 文档元数据

- **决策条数**: 42（N: 7 + O: 7 + P: 3 + U: 22 + V: 12 - 去重合并 = 42 实际独立决策）
- **冲突解决数**: 8
- **新建重量级 Spec**: 9
- **新建中型 Spec**: 10
- **独立规范文档**: 3
- **Schema 变更项**: 10+
- **Store 变更项**: 7
- **服务 / Worker / Composable 新增**: 18+
- **覆盖域**: N 文档生命周期 / O 写作辅助与专注 / P 首次使用与帮助 / U Hub 首页与数据洞察 / V 跨任务依赖
- **下游对接**: Part 1（铁律）/ Part 2（编辑器与渲染）/ Part 3b（Settings/Sync/Data/账户）/ Part 4（Spec 列表与数据模型）

> **下一步**: 由 `synth-part3b` 接续合成 Settings / Sync / Data / 账户 / 权限 / 审计 域；由 `synth-part4` 合成最终 Spec 清单与数据模型总览。
