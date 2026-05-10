# 08 - 数据洞察规范

> 文档类型: Spec
> 阶段: Phase 3（UI 外壳）+ Phase 4（数据）
> 依赖: 11-document-lifecycle-spec, 27-performance-slo-spec, 33-diagnostic-logging-spec, 07-spec-settings-tabs, metrics-dictionary.md
> 来源问卷题号: T08-01 ~ T08-11, L1-35, L1-36, L1-44, L1-45, S-06, X-05, X-11, EX-06
> 权威来源: 本 Spec 各条目在"权威来源表"章节逐条标记
> 创建日期: 2026-04-20
> 最后更新: —

---

## 一、背景与目标

### 1.1 背景

0327 版 `08-data-insights-spec.md` 定义了 Hub 内 3 个基础统计卡片，未处理：指标字典 / 多层刷新 / 行动化 / Web Worker 预计算 / 数据完整性 / 降级策略。0420 问卷把 T08 的 6 个新图表 + 统计口径正式化 + Hub 强联动全部拉到最高档。

### 1.2 本 Spec 目标

1. 交付**全部 6 个新图表** + 升级现有图表到统一口径。
2. 建立 **MetricsDictionary**（独立附件 `dict/metrics-dictionary.md`），作为所有指标的唯一真值来源。
3. **字数口径**：纯文本（不含标题 / 代码块 / 公式）作为默认口径，用于目标系统 / 存储统计 / 导出报告。
4. 新增 `export_logs` 表为 ExportFrequency 图表提供数据源。
5. 采用 **轻量图表库**（unovis / frappe-charts 二选一）+ Web Worker 预计算。
6. **多层刷新策略**：实时 / 会话 / 日级，错峰计算。
7. **Hover Tooltip + 点击跳转** 深链接到 Workstation / FileManager / 过滤视图。
8. **行动化洞察**：基于数据触发建议动作（整理草稿 / 重启写作 / 创建 SmartFolder）。
9. **数据完整性 + 缺口展示 + 重算入口**。
10. **归档过滤**：归档文档不计入任何统计。
11. **大数据降级**：资源监控 + 自动采样 + 超限提示。
12. **每图独立 CSV 导出**。

### 1.3 产品铁律映射

| 铁律 | 落地条款 |
|------|---------|
| 铁律 3（零空壳交付） | 6 图表必须全部有真实数据接入 |
| 铁律 15（性能 SLO） | §7 多层刷新 + Worker + 采样 |
| 铁律 11（引用溯源三层区分） | §14 洞察建议动作需带来源说明 |

---

## 二、范围与边界

### 2.1 本轮进入 scope

- 洞察信息架构（§1）
- Metrics Dictionary（§2，独立附件 `dict/metrics-dictionary.md`）
- 6 个图表（§3）
- ExportFrequency + export_logs 表（§4）
- 图表库选型与适配层（§5）
- 交互模型 Hover/Click/跳转（§6）
- 时间范围模型（§7）
- CSV 导出（§8）
- 指标口径定义（§9，引用附件）
- 多层刷新调度器（§10）
- Web Worker 预计算（§11）
- 数据完整性与缺口展示（§12）
- 异常值处理与重算（§13）
- 洞察行动化 API（§14）
- 归档过滤（§15）
- 字数统计联动 StatusBar（§16）
- Storage Breakdown 图（§17）

### 2.2 不进入

- 统一"导出洞察报告"一键打包（T08-06 B 只选了每图 CSV）
- 团队维度聚合（远期）
- AI 生成的数据解读评论（v2.2+）

### 2.3 延后

- 指标的外部 BI 接入（v2.2+）
- 自定义指标构建器（用户自己定义指标）

---

## 三、详细规范 / 需求条目

## §1 洞察信息架构

### 1.1 入口

- Hub 首页底部 Insights Section（主入口）
- Settings > Data > Stats（子集视图）
- Workstation 左栏附加一个精简版（仅当前文档）
- 命令：`system.openInsights`

### 1.2 Hub Insights Section 布局

```
┌────────────────────────────────────────────────────────────┐
│  Data Insights                 [Expand All] [Export CSV ↓] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─ Writing Timeline ─────────┐  ┌─ Productivity ───────┐  │
│  │ [line chart]               │  │ [gauge + delta]      │  │
│  │  active days, 30-day view  │  │  words/day, avg time │  │
│  └────────────────────────────┘  └──────────────────────┘  │
│                                                            │
│  ┌─ Word Distribution ────────┐  ┌─ Recent Activity ────┐  │
│  │ [stacked bar / pie]        │  │ [heatmap calendar]    │  │
│  └────────────────────────────┘  └──────────────────────┘  │
│                                                            │
│  ┌─ Export Frequency ─────────┐  ┌─ Storage Breakdown ──┐  │
│  │ [bar by platform]          │  │ [donut + legend]     │  │
│  └────────────────────────────┘  └──────────────────────┘  │
│                                                            │
│  ── Suggested Actions ─────────────────────────────────── │
│  · You have 5 drafts untouched > 7 days  [Organize]        │
│  · Daily goal streak 12 days              [Celebrate]      │
│  · Asset orphans 12 (3.2 MB)              [Clean Up]       │
└────────────────────────────────────────────────────────────┘
```

### 1.3 响应式

- 4 列 → 2 列 → 1 列（对应 Hub T02-08 C）
- 铁三角（Hero / Recent / Stats）保留，Insights 是 Stats 的超集（优先级 1）

---

## §2 Metrics Dictionary（独立附件）

### 2.1 目的

所有指标的**权威定义**集中在 `prompts/0420/dict/metrics-dictionary.md`。本 Spec 只定义索引与接口，不重复字段说明。

### 2.2 每个指标必须包含字段

```markdown
## <指标 ID> (`metric.id`)

- **业务定义**: ...
- **单位**: word / second / day / byte / count
- **数据源表**: articles / activity_logs / export_logs / ...
- **计算公式**: ...（伪代码）
- **边界条件**:
  - 空文档：返回 0
  - 归档文档：不计入
  - 回收站文档：不计入
  - 草稿：计入
- **异常处理**:
  - NaN → 视为 0
  - 超大值 > 1e9 → 标记为 corrupted
- **刷新层**: realtime / session / daily
- **口径版本**: v1
- **历史变更**:
  - v1: 2026-04-20 初始
```

### 2.3 本 Spec 涉及的指标清单

| 指标 ID | 说明 | 单位 | 层 |
|---------|------|------|---|
| `word.plainText` | 纯文本字数（不含标题/代码/公式） | 字 | realtime |
| `word.withTitle` | 纯文本 + 标题 | 字 | realtime |
| `word.all` | 全部（含代码公式） | 字 | realtime |
| `word.selection` | 当前选区 | 字 | realtime |
| `time.session` | 当前会话编辑时长 | 秒 | realtime |
| `time.total` | 历史编辑总时长 | 秒 | session |
| `activeDays.last30` | 最近 30 天活跃天数 | 天 | daily |
| `streak.current` | 当前连续写作天数 | 天 | daily |
| `productivity.wordsPerDay.avg30` | 30 天日均字数 | 字 | daily |
| `productivity.sessionDuration.avg` | 会话时长均值 | 秒 | daily |
| `wordDistribution.byStatus` | 按状态字数分布 | 字 | session |
| `wordDistribution.byCategory` | 按分类字数分布 | 字 | daily |
| `export.count.byPlatform` | 按平台导出次数 | 次 | session |
| `storage.active` | 活跃文档占用 | 字节 | daily |
| `storage.archived` | 归档占用 | 字节 | daily |
| `storage.trashed` | 回收站占用 | 字节 | daily |
| `storage.assets.total` | 资产总占用 | 字节 | daily |
| `storage.assets.orphan` | 孤儿资产占用 | 字节 | daily |
| `goal.daily.progress` | 今日目标进度 | 字/字 | realtime |
| `goal.weekly.progress` | 本周目标进度 | 字/字 | realtime |

---

## §3 6 个图表设计

### 3.1 `WritingTimelineCard`

- **目的**: 30 天写作节奏
- **视觉**: 折线图 + 柱状图混合（字数 + 活跃天数）
- **交互**:
  - Hover → Tooltip（日期 / 字数 / 活跃秒数 / 文章数）
  - Click → 跳 FileManager 过滤 `updatedAt:<date>`
- **展开**: 可切 7 天 / 30 天 / 90 天 / 自定义
- **口径**: `word.plainText` 按天聚合（排除归档）

### 3.2 `ProductivityInsightsCard`

- **目的**: 近期生产力对比
- **视觉**: 两个大数字（本周 vs 上周） + 进度环 + delta 箭头
- 指标：
  - 本周总字数
  - 相比上周 delta %
  - 日均字数
  - 平均会话时长
- **交互**: Hover 显示计算公式；Click → 跳 Metrics Dictionary

### 3.3 `WordDistributionCard`

- **目的**: 文字产出分布
- **视觉**: 堆叠条形图（按状态）+ 切换按分类
- 默认按状态（draft / writing / review / published / 归档不含）
- **交互**: Click 某段 → 跳 FileManager 过滤对应 status

### 3.4 `RecentActivityCard`

- **目的**: GitHub 风格活动热图
- **视觉**: 7×N 网格，颜色表示字数
- 展示最近 12 周
- **交互**:
  - Hover → 日期 + 字数 + 文章列表
  - Click → 跳 Timeline 详情

### 3.5 `ExportFrequencyCard`

- **目的**: 导出分布
- **视觉**: 柱状图 按平台（微信 / 知乎 / 小红书 / HTML / Markdown）
- 展示最近 30 天
- **交互**: Click → 跳 Settings > Data > Export History（或 PublishAdapter 历史）

### 3.6 `StorageBreakdownCard`

- **目的**: 磁盘占用
- **视觉**: Donut + 图例
- 分段：Active / Archived / Trashed / Assets / Versions / Backups / Logs
- **交互**: Click 分段 → 跳对应管理面板（回收站 / 归档视图 / 资产管理）

---

## §4 ExportFrequency 与 export_logs 表（T08-02 B）

### 4.1 schema

```sql
CREATE TABLE export_logs (
  id INTEGER PRIMARY KEY,
  accountId TEXT NOT NULL,
  articleId TEXT,                  -- NULL for batch export
  adapter TEXT NOT NULL,           -- 'wechat' | 'zhihu' | 'redbook' | 'html' | 'markdown' | 'batch-zip'
  params TEXT,                     -- JSON(export preset, theme, etc.)
  outputBytes INTEGER,
  durationMs INTEGER,
  result TEXT CHECK(result IN ('success', 'partial', 'failed')),
  errorCode TEXT,
  startedAt INTEGER NOT NULL,
  finishedAt INTEGER NOT NULL
);
CREATE INDEX idx_export_logs_accountId_time ON export_logs(accountId, startedAt DESC);
CREATE INDEX idx_export_logs_adapter ON export_logs(adapter);
```

### 4.2 写入点

- 每个 PublishAdapter 在导出前后调用 `exportLogger.begin()` / `exportLogger.finish()`
- 失败也要写一条（`result: 'failed'` + errorCode）

### 4.3 保留策略

- 保留 180 天（覆盖"90 天审计"之余留余量用于半年趋势）
- 超过由 daily GC 清理

### 4.4 隐私

- `params.apiKey` 这类敏感字段绝不入库；Logger 入口自动 redact

---

## §5 图表库选型与适配层

### 5.1 候选（T08-03 C）

- **unovis**（@unovis/ts + @unovis/vue）
  - 优点：模块化、Vue 支持、~40KB
  - 缺点：相对新，生态比 Chart.js 小
- **frappe-charts**
  - 优点：极轻、SVG 原生
  - 缺点：维护节奏慢

### 5.2 选型原则（v2.1 POC 决定）

1. Lighthouse 兼容：懒加载后首屏不受影响
2. 视觉符合 Ethereal Constructivism
3. 支持所有 6 图表类型（line / bar / stacked / heatmap / donut / gauge）
4. Tree-shake 友好
5. 主题跟随 App（T04-11 B）

### 5.3 适配层

```ts
// src/services/chart-adapter/types.ts
export interface ChartAdapter<P = unknown> {
  mount(el: HTMLElement, props: P): Promise<ChartInstance>
  unmount(inst: ChartInstance): void
  resize(inst: ChartInstance, size: { w; h }): void
  exportPng(inst: ChartInstance): Promise<Blob>
}

// 对外统一使用适配层，不直接 import 底层库
```

### 5.4 主题联动

- 适配层读取 `themeEngine.getTokens('editor-content')` 生成调色板
- 主题切换 → 所有图表实例调用 `update()` 刷新色板
- 不破坏平台适配（T04-11 B）

### 5.5 Lazy Load

- 图表库通过 dynamic import：`const lib = await import('@unovis/vue')`
- 首次进入 Insights Section 才加载（Intersection Observer 触发）

---

## §6 交互模型（Hover / Click / 跳转）

### 6.1 Hover

- 200ms 延迟（避免 flicker）
- Tooltip 使用 Portal 避免被裁剪
- 内容统一模板：`{label} — {value} ({unit}) · {breakdown}`

### 6.2 Click

- 所有图表组件 emit `navigate` 事件
- 路由规则：
  | 图表 | 目标 |
  |------|------|
  | WritingTimeline 日期 | `/files?updatedAt=<date>` |
  | WordDistribution 状态段 | `/files?status=<status>` |
  | WordDistribution 分类段 | `/files?category=<id>` |
  | RecentActivity 日期 | `/insights/timeline?date=<date>` |
  | ExportFrequency 平台 | `/settings/data?anchor=export-history&platform=<p>` |
  | StorageBreakdown 分段 | 根据分段跳 FileManager/Trash/Archive/AssetManager |

### 6.3 深链接规范

- FileManager / Workstation / Settings 必须支持 query 参数过滤
- 命令面板能直接调用

---

## §7 时间范围模型

### 7.1 默认

- 所有图表默认 30 天
- Storage 图表不受时间范围影响（始终是当前快照）

### 7.2 可展开（T08-05 C）

- 点击卡片右上角 "⤢" → 打开 `<InsightDetailModal>`
- Modal 内可切 7 / 30 / 90 / 自定义（date picker）
- Modal 内保留所有交互（hover / click / export csv）

### 7.3 记忆

- 每个图表在 modal 内的时间范围选择持久化（per-account setting）
- 关闭 Modal 回到卡片视图仍显示默认 30 天

---

## §8 CSV 导出（T08-06 B）

### 8.1 入口

- 每张卡片右上角 ⋯ 菜单 → "Export CSV"
- Insights Section 顶部 "Export All CSV"（打包成 zip）

### 8.2 CSV 字段

- UTF-8 with BOM（Excel 兼容）
- 文件名：`inkforge-insight-<metricId>-<YYYYMMDD-HHmmss>.csv`
- 列头中英双语（根据当前 locale）
- 第一行包含"口径版本号 / 生成时间"元数据注释（`# metric.id v1, generated 2026-04-20 08:00`）

### 8.3 保存路径

- 走 Tauri `save` dialog → 用户选择目录
- 默认目录 `~/Documents/InkForge/Insights/`

---

## §9 指标口径定义（引用附件）

详见 `dict/metrics-dictionary.md`。以下为本 Spec 内硬约束：

### 9.1 字数口径（T08-07 D + 补充）

- **默认口径 = `word.plainText`**：
  - 纯正文文本
  - **不含标题**（`<h1>~<h6>`）
  - **不含代码块**（`<pre><code>`）
  - **不含公式**（行内 `$...$` 和块 `$$...$$`）
  - 不含 HTML 注释 / frontmatter
  - 中英混合：中文按字符计数，英文按 token（`\b\w+\b`）计数
- 字数口径变更 → schemaVersion bump + 迁移（引用 07-spec §5）

### 9.2 时长口径

- 会话（session）：连续编辑无超过 5 分钟空闲的片段
- 超过 5 分钟空闲即结束一个 session
- session 合并：同一文档 15 分钟内的多个 session 合并

### 9.3 活跃日

- 某日累计 `word.plainText` delta ≥ 100 字 → 算活跃日

### 9.4 归档与回收站

- 归档文档（`status === 'archived'`）**不计入**任何指标（L1-44 D）
- 回收站文档（`deletedAt !== null`）同样不计入
- 草稿（draft）**计入**

---

## §10 多层刷新调度器（T08-08 D + 补充）

### 10.1 三层

| 层 | 触发 | 典型指标 |
|----|------|---------|
| **Realtime** | 编辑器 onChange / selection change | `word.plainText`, `word.selection`, `goal.daily.progress` |
| **Session** | 每 30s 一次 / 关键事件（保存 / 导入 / 导出 / 状态变更） | `wordDistribution.byStatus`, `export.count.byPlatform` |
| **Daily** | 启动 + 每日一次（requestIdleCallback） | `productivity.*`, `storage.*`, `activeDays.*` |

### 10.2 调度器实现

```ts
// src/services/metrics-scheduler/index.ts
class MetricsScheduler {
  registerMetric(def: MetricDef): void
  invalidate(metricId: MetricId, reason: 'event' | 'time' | 'manual'): void
  getValue<T>(metricId: MetricId): { value: T; freshness: number; computing: boolean }
  subscribe(metricId: MetricId, handler: (value) => void): Unsubscribe
}
```

### 10.3 错峰计算

- 同层多个指标 → queue + `requestIdleCallback` 分片
- 单片最长 10ms（避免阻塞渲染）
- 超过 → 切到 Worker（§11）

### 10.4 缓存

- 每层指标的结果写入 `metrics_cache` 表
- 缓存 key: `<metricId>@<scope>@<version>`
- 过期策略：realtime 不缓存；session TTL 30min；daily TTL 24h

### 10.5 刷新事件

```ts
// 由编辑器 / FileManager / Export 等模块 emit
bus.on('article.saved', () => scheduler.invalidate('wordDistribution.byStatus', 'event'))
bus.on('article.archived', () => scheduler.invalidate('storage.*', 'event'))
bus.on('export.completed', () => scheduler.invalidate('export.*', 'event'))
```

---

## §11 Web Worker 预计算（T08-11 D + 补充）

### 11.1 Worker 职责

- 大数据聚合（按日 / 按分类）
- 词频统计（EX-06 / WordCountReport）
- 完整性校验（§12）

### 11.2 Worker 实现

```
src/workers/
├── insights-worker.ts        # 入口，接收 {metricId, params} 返回 value
├── metrics/
│   ├── word-count.ts         # 纯文本字数计算
│   ├── activity-aggregate.ts
│   ├── storage-breakdown.ts
│   └── export-frequency.ts
└── utils/
    └── debounce.ts
```

### 11.3 通信

- `postMessage({ cmd, payload, requestId })`
- Scheduler 维护 requestId → resolver 映射
- 支持 AbortSignal（用户关闭 Insights Section → 取消未完成的计算）

### 11.4 内存

- Worker 内不保留大对象缓存（由 Scheduler 层管理 `metrics_cache`）
- 每次计算结束 → 主动 GC 建议

---

## §12 数据完整性与缺口展示（T08-09 D + 补充）

### 12.1 完整性校验

- 每个指标计算完成 → 调用 `integrityChecker.verify(metricId, value, rawSource)`
- 检查：
  - 日期连续性（有没有缺失天）
  - 数值合理性（非负、< 1e9）
  - 引用一致性（如 `wordDistribution.byStatus` 各段之和应等于 `word.plainText` 全量）

### 12.2 缺口展示

- 图表数据缺口 → 显示空白区间 + dashed 提示
- 图表右上角 `<IntegrityBadge>`：
  - OK（green）
  - Partial（yellow）
  - Corrupted（red）
- 点击 Badge → 打开 `<IntegrityDetailModal>`
  - 显示异常来源列表（source table / record id / reason）
  - 提供 "Recompute" 按钮
  - 提供 "Export anomaly list" 按钮

### 12.3 Recompute

- Recompute = 重置缓存 + 强制 Worker 重算
- 进度条显示；期间图表显示 "Recomputing..." 文字

### 12.4 统计可信度（补充"我注重统计可信"）

- 所有指标必须带"置信度"标签（High / Medium / Low）
- Medium / Low 时在 Tooltip 说明原因（如"基于 10 条样本"）

---

## §13 异常值处理与重算

### 13.1 异常处理矩阵

| 异常 | 行为 |
|------|------|
| NaN / undefined | 视为 0 |
| 负数 | 视为 0 + 记录 anomaly |
| 超过 1e9（不合理） | 视为 corrupted，图表显示 Partial 状态 |
| 数据缺失某天 | 显示空白 + 不补 0 |
| 计算超时 10s | 标记 Medium confidence + Toast |

### 13.2 手动重算入口

- 每张图表 ⋯ 菜单 → "Recompute"
- Settings > Advanced > "Recompute All Metrics"
- 命令：`system.recomputeMetrics`（risk: medium）

### 13.3 自动触发重算

- schema 迁移完成
- 从备份恢复完成
- DB 完整性校验发现异常

---

## §14 洞察行动化 API（T08-10 D + 补充）

### 14.1 建议动作（Suggested Actions）

- 基于指标阈值规则引擎生成
- 每条建议含：
  - 标题 + 简短描述
  - 指标来源（`metric.id` + value）
  - 行动按钮（跳转 / 一键命令）
  - "忽略"按钮（24h 内不再提示）

### 14.2 内置规则示例

```ts
// src/data/insight-action-rules.ts
export const rules: InsightRule[] = [
  {
    id: 'draft.stale',
    when: (m) => m.get('drafts.stale7d') >= 3,
    build: (m) => ({
      title: `You have ${m.get('drafts.stale7d')} drafts untouched for 7+ days`,
      description: 'Consider reviewing or archiving them.',
      action: { label: 'Organize', command: 'system.openFileManager', args: { filter: 'status:draft updatedAt:<7d' } }
    })
  },
  {
    id: 'goal.streak',
    when: (m) => m.get('streak.current') >= 7,
    build: (m) => ({
      title: `Writing streak: ${m.get('streak.current')} days!`,
      description: 'Keep the momentum going.',
      action: { label: 'Celebrate', command: 'system.showBadges' }
    })
  },
  {
    id: 'asset.orphan',
    when: (m) => m.get('storage.assets.orphan') > 5 * 1024 * 1024,
    build: (m) => ({
      title: `${formatBytes(m.get('storage.assets.orphan'))} orphan assets detected`,
      description: 'These assets are not referenced by any active article.',
      action: { label: 'Clean Up', command: 'system.openAssetOrphanReview' }
    })
  },
]
```

### 14.3 用户开关

- Settings > Writing > Insights > "Show Suggested Actions"（默认开）
- 单条规则可 Mute（忽略 × N 次后永久关闭）

### 14.4 强联动（补充"Hub/Workstation 强联动"）

- Hub → Insights → 点击建议 → 带参数跳对应 View
- Workstation → 底部状态栏可选显示"最近一条建议"
- 所有跳转遵循 §6.3 深链接规范

---

## §15 归档过滤（L1-44 D）

### 15.1 统一过滤

- 所有指标计算在 Worker 层**默认**添加 `WHERE status != 'archived' AND deletedAt IS NULL`
- 仅以下图表**允许包含归档**并单独标注：
  - `StorageBreakdown`（archived 作为独立段展示）
  - 专门的"Archive Insight"子视图（可选入口）

### 15.2 接口

```ts
interface MetricQueryOptions {
  includeArchived?: boolean  // 默认 false
  includeTrashed?: boolean   // 默认 false
  accountId: AccountId
  timeRange?: { from; to }
}
```

### 15.3 UI 徽标

- 图表左下角小字："Excluding archived"（可切换）
- Storage Breakdown 的 Archived 段带 Tooltip 说明"Archived items are not counted in productivity metrics."

---

## §16 字数统计联动 StatusBar（S-06 C + T08-07 D）

### 16.1 StatusBar 字段

- 正文字数 `word.plainText`
- 标题字数（可选开关）
- 选中统计 `word.selection`（仅有选区时显示）
- 口径选择器点击可切"纯文本 / 含标题 / 全部"

### 16.2 实时性

- 编辑时 realtime 层更新
- 输入法 composition 期间**不更新**（避免闪烁）
- 每次保存后重算一次确保对账一致

### 16.3 WordCountReport 整合（EX-06）

- StatusBar 字数区点击 → 打开 `<WordCountReportDialog>`
- 报告内容：
  - 各口径详细字数
  - 段落数 / 句子数（按中英标点切分）
  - 平均段落字数
  - 词频 Top 20（Worker 计算）
  - 选中文本独立统计
- 报告可导出 CSV

### 16.4 全局开关

- Settings > Writing > StatusBar > Fields 矩阵统一管理

---

## §17 Storage Breakdown 图

### 17.1 数据源

```
storage.active        ← Σ size(articles where status != 'archived' and deletedAt IS NULL)
storage.archived      ← Σ size(articles where status == 'archived')
storage.trashed       ← Σ size(articles where deletedAt IS NOT NULL)
storage.assets.total  ← Σ size(assets_index where refCount > 0)
storage.assets.orphan ← Σ size(assets_index where refCount == 0)
storage.versions      ← Σ size(article_versions)
storage.backups       ← Σ size(profiles/<id>/backups/*)
storage.logs          ← Σ size(activity_logs) + Σ size(export_logs)
storage.cache         ← Σ size(metrics_cache) + Σ size(tmp/*)
```

### 17.2 计算

- Daily 层，走 Worker
- 每次文件系统操作（写入 / 删除 / 迁移）→ emit `storage.changed` → invalidate

### 17.3 视觉

- Donut 图 + 图例
- 每段颜色对应语义：
  - Active（蓝）
  - Archived（灰）
  - Trashed（橙）
  - Assets（绿）
  - Versions（紫）
  - Backups（青）
  - Logs/Cache（棕）

### 17.4 Click 跳转

- Active → FileManager 默认视图
- Archived → FileManager 归档视图
- Trashed → 回收站
- Assets → Asset Manager
- Orphan Assets → Orphan Review
- Versions → Settings > Data > Stats
- Backups → Settings > Data > Auto Backup
- Logs → Advanced > Log Folder

---

## 四、数据模型变更

```sql
-- 导出日志（§4）
CREATE TABLE export_logs (
  id INTEGER PRIMARY KEY,
  accountId TEXT NOT NULL,
  articleId TEXT,
  adapter TEXT NOT NULL,
  params TEXT,
  outputBytes INTEGER,
  durationMs INTEGER,
  result TEXT CHECK(result IN ('success', 'partial', 'failed')),
  errorCode TEXT,
  startedAt INTEGER NOT NULL,
  finishedAt INTEGER NOT NULL
);

-- 指标缓存（§10.4）
CREATE TABLE metrics_cache (
  key TEXT PRIMARY KEY,         -- '<metricId>@<scope>@<version>'
  accountId TEXT NOT NULL,
  value TEXT,                   -- JSON
  computedAt INTEGER,
  expiresAt INTEGER,
  confidence TEXT CHECK(confidence IN ('high', 'medium', 'low')),
  source TEXT                   -- 'realtime' | 'session' | 'daily' | 'manual'
);
CREATE INDEX idx_metrics_cache_account ON metrics_cache(accountId);

-- 异常记录（§12）
CREATE TABLE metric_anomalies (
  id INTEGER PRIMARY KEY,
  accountId TEXT NOT NULL,
  metricId TEXT NOT NULL,
  detectedAt INTEGER,
  sourceTable TEXT,
  sourceRecordId TEXT,
  reason TEXT,
  resolved BOOLEAN DEFAULT 0
);

-- 建议动作静音记录（§14.3）
CREATE TABLE insight_rule_mutes (
  accountId TEXT NOT NULL,
  ruleId TEXT NOT NULL,
  mutedUntil INTEGER,
  dismissCount INTEGER DEFAULT 0,
  PRIMARY KEY (accountId, ruleId)
);
```

---

## 五、接口与落地目录

```
src/
├── services/
│   ├── metrics/
│   │   ├── index.ts                   // MetricsService
│   │   ├── scheduler.ts               // MetricsScheduler
│   │   ├── integrity-checker.ts
│   │   ├── cache.ts
│   │   └── builtins/
│   │       ├── word-count.ts
│   │       ├── time-session.ts
│   │       ├── active-days.ts
│   │       ├── productivity.ts
│   │       ├── word-distribution.ts
│   │       ├── export-frequency.ts
│   │       ├── storage-breakdown.ts
│   │       └── goal-progress.ts
│   ├── chart-adapter/
│   │   ├── index.ts
│   │   ├── unovis-adapter.ts           // or frappe-adapter
│   │   └── theme-bridge.ts
│   ├── insights/
│   │   ├── action-generator.ts
│   │   ├── csv-exporter.ts
│   │   └── navigate-bus.ts
│   └── export-logger/
│       └── index.ts
├── components/
│   └── insights/
│       ├── InsightCard.vue              // 通用容器
│       ├── InsightActions.vue
│       ├── IntegrityBadge.vue
│       ├── IntegrityDetailModal.vue
│       ├── InsightDetailModal.vue
│       ├── WritingTimelineCard.vue
│       ├── ProductivityInsightsCard.vue
│       ├── WordDistributionCard.vue
│       ├── RecentActivityCard.vue
│       ├── ExportFrequencyCard.vue
│       ├── StorageBreakdownCard.vue
│       └── WordCountReportDialog.vue
├── workers/
│   ├── insights-worker.ts
│   └── word-frequency.ts
├── stores/
│   └── metrics.ts
└── data/
    └── insight-action-rules.ts
```

---

## 六、性能与降级

| 指标 | 目标 | 降级 |
|------|------|------|
| Hub Insights 首次可见 | < 1s（Lighthouse X-05） | 先显示骨架 / 空框，Worker 陆续填充 |
| 单图表 Worker 计算 | ≤ 500ms（典型数据量） | 采样降级到 1000 点 |
| 全量图表同时刷新 | ≤ 3s | 错峰 + 任务队列 |
| Hover Tooltip | ≤ 16ms（60fps） | 无降级需求 |
| CSV 导出（< 10MB） | ≤ 2s | 后台 zip |

### 6.1 降级策略（T08-11 D）

| 触发条件 | 动作 |
|----------|------|
| 主线程占用 > 50% 持续 3s | 暂停 daily 层刷新 |
| 内存 > 500MB | 清理 metrics_cache（保留 session 层） |
| 数据点超过 `maxSampleSize` | 降采样（均值聚合）+ 显示徽标 |
| Lighthouse score 预估 < 80 | 关闭图表动画 |

### 6.2 maxSampleSize（每图默认）

| 图表 | 最大点数 |
|------|---------|
| WritingTimeline | 365 |
| ProductivityInsights | 90 |
| WordDistribution | 20 段 |
| RecentActivity | 365 |
| ExportFrequency | 180 |
| StorageBreakdown | 10 段 |

超出 → 均值聚合到阈值内。

---

## 七、验收矩阵

### 正向样本

1. 首次打开 Hub → Insights Section → 6 个图表在 1s 内可见（骨架 → Worker 填充 → 渲染）
2. 编辑文章 → StatusBar 字数实时更新（纯文本口径）
3. 归档一篇文章 → WordDistribution / ProductivityInsights 自动刷新排除该文章
4. 导出微信 → ExportFrequency 秒级更新（session 层）
5. Hover WritingTimeline 某一天 → Tooltip 显示正确数据
6. Click WordDistribution "Draft" 段 → 跳 FileManager 过滤草稿
7. Export single card CSV → 文件内容正确 + UTF-8 BOM
8. 建议动作点击 "Organize drafts" → 跳转到对应过滤视图
9. 打开 WordCountReport → 词频 Top 20 正确排序

### 失败样本

10. Worker 计算超时 10s → 图表标 Medium confidence + Toast + 提供 Recompute
11. export_logs 表空（全新账户）→ ExportFrequency 显示 EmptyState + 引导"Try exporting"
12. 磁盘空间不足 Storage Breakdown 无法统计 backups → 显示 Partial 状态 + 说明
13. 计算出负值 → 视为 0 + 记录 anomaly
14. 图表库加载失败（网络 / 文件损坏）→ 降级为纯 HTML table 展示数据

### 恢复样本

15. 异常数据点触发 Corrupted 状态 → 用户点 Recompute → 异常清除 / 持续存在则给出明细
16. IndexedDB 完整性异常 → 重新扫描 export_logs → 重算 ExportFrequency
17. 从备份恢复账户 → 自动触发 all-recompute
18. 归档分类后归档图表切换视图 → 切回默认 excludes archived

### 边界样本

19. 单日字数超过 100000（极端用户）→ 图表正常渲染 + 不截断
20. 账户有 10000 篇文章 → Daily 层 Worker 在 <5s 完成聚合（采样启用）
21. 时间范围 7 天，但实际数据只有 2 天 → 缺口正确显示
22. 用户切换字数口径 → 立即反映到 StatusBar + 所有相关图表 + CSV 导出
23. 同一账户跨窗口编辑 → 两边 Insights 通过 BroadcastChannel 同步刷新
24. Worker crash → 主线程 fallback 降级计算 + Toast 提示

---

## 八、权威来源表

| 条目 | 权威来源 | 注释 |
|------|---------|------|
| 6 图表全做 | 文档（T08-01 A） | 新增 |
| export_logs 表 | 文档（T08-02 B） | 新增 |
| 轻量图表库 | 文档（T08-03 C） | 新增 |
| Hover + Click 跳转 | 文档（T08-04 C） | 升级 |
| 时间范围展开 | 文档（T08-05 C） | 新增 |
| 每图 CSV 导出 | 文档（T08-06 B） | 新增 |
| 字数纯文本口径 | 文档（T08-07 D + 补充） | 新增 |
| 多层刷新 | 文档（T08-08 D + 补充） | 新增 |
| 完整性徽标 + 重算 | 文档（T08-09 D + 补充） | 新增 |
| 行动化 + Hub/Workstation 联动 | 文档（T08-10 D + 补充） | 新增 |
| 大数据降级 | 文档（T08-11 D + 补充） | 新增 |
| 归档不计统计 | 文档（L1-44 D） | 跨引用 |
| 字数 = 正文 + 标题 + 选中（StatusBar） | 文档（S-06 C） | 新增 |
| 性能 Lighthouse > 80 | 文档（X-05 C + 补充） | 跨引用 |
| 文章不能丢（恢复底线） | 文档（X-11 C + 补充） | 跨引用（§12 完整性） |

---

## 九、与其他 Spec 的依赖关系

- **01-spec-editor-typora**: 编辑器 onChange → Realtime 层字数
- **05-spec-toolbar**: 命令 `system.openInsights` / `system.recomputeMetrics`
- **06-spec-account-auth**: 账户切换 → 重置 Store + Cache
- **07-spec-settings-tabs**: Settings 控制面板（Writing / Data / Advanced）
- **11-document-lifecycle-spec**: status 字段 + archived 过滤
- **12-file-manager-spec**: 深链接跳转目标
- **23-sync-provider-spec**: export_logs 同步策略
- **27-performance-slo-spec**: Lighthouse + 输入延迟闸门
- **29-data-integrity-spec**: 重算入口 + 完整性校验联动
- **33-diagnostic-logging-spec**: activity_logs + export_logs 保留策略
- **35-inspiration-card-spec**（如有）: Hub 其他卡片布局协同
- **metrics-dictionary.md**: 附件，权威字段来源

---

## 十、风险与缓解

| 风险 | 级别 | 缓解 |
|------|------|------|
| 图表库选型失误导致重做 | **高** | v2.1 早期 POC（两库各试一个图表）+ 适配层隔离 |
| Worker 计算太慢影响首屏 | 高 | 骨架先行 + 分层刷新 + 采样降级 |
| 归档过滤遗漏导致数据错 | 高 | 统一 Query Helper + 单测覆盖所有指标 |
| 字数口径纠纷（用户预期不一致） | 中 | StatusBar 有口径切换器 + WordCountReport 详情 |
| 多窗口并发 invalidate 风暴 | 中 | debounce + BroadcastChannel coalesce |
| 大账户（10k 文章）性能 | 中 | maxSampleSize + Worker + Daily 缓存 |
| 建议动作过于嘈杂 | 低 | Mute + 开关 + 每规则独立 |

---

## 十一、metrics-dictionary.md 骨架（附件目录参考）

> 实际内容在独立文件 `prompts/0420/dict/metrics-dictionary.md`，本节仅列骨架以便交叉引用。

```
# Metrics Dictionary — v1 (2026-04-20)

## Conventions
- 单位 / 精度 / 时区 / 口径版本号规则

## Index
| Metric ID | Layer | Unit | Owner Spec |
| word.plainText | realtime | word | 08-data-insights |
| ... | ... | ... | ... |

## Definitions (详细)
### word.plainText
- Business Definition
- Formula
- Boundaries
- Exceptions
- Layer
- Example
- Changelog

### ...（每个指标一节）
```

---

（完）

## 2026-04-29 Completion Ledger

- Scope: 本次完成 P1-08 Hub 本地数据洞察 baseline，不宣称完成本 0420 super-spec 的全部 analytics platform。
- 已落地：9 张 Hub 图表卡片、`DataInsightsSection` 四行布局、`useCountUp` 动画、统一 `InsightEmptyState`、纯 SVG/CSS 图表与 `HubView` 接入。
- 真实数据边界：全部数据从 `articles` / `categories` 派生；没有真实 `activity_logs` 表时 RecentActivity 只从文章时间推断；没有真实 `export_logs` 表时 ExportFrequency 展示空状态。
- 明确未伪造完成：持久化 `activity_logs`、持久化 `export_logs`、worker/cache 指标层、chart adapter、StorageBreakdown、CSV card export、IntegrityBadge modal/recompute、BroadcastChannel 多窗口同步仍属于后续 0420 扩展项。
- 验证已通过：`P1_08_CODE_CLEAN_OK`、`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build`。
