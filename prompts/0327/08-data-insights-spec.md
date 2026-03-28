# 08 -- 数据洞察区丰富规范

> 优先级: P1
> 影响文件: hub/ 组件, HubView.vue, utils/activity-logger.ts
> 核心目标: 充实数据洞察区，让创作数据可视化丰富且有价值
> 图表总数: **9 个** = 3 个现有组件 + 6 个新增组件
> Section 位置: 数据洞察区对应 HubView 的 **Section 3 (scroll-snap index=2)**

---

## 图表总览

| 序号 | 组件名 | 状态 | 描述 |
|------|--------|------|------|
| 1 | ContributionHeatmap | 现有 | GitHub 风格贡献热力图 |
| 2 | WordCountTrend | 现有 | 最近 30 天字数趋势折线图 |
| 3 | CategoryDistribution | 现有 | 分类分布环形饼图 |
| 4 | WritingTimeline | **新增** | 最近 7-14 天写作活动时间线 |
| 5 | ProductivityInsights | **新增** | 生产力洞察 6 项指标 (2x3 网格) |
| 6 | WordDistribution | **新增** | 文章字数分布直方图 (6 个桶) |
| 7 | TagCloud | **新增** | 标签词云 (flex-wrap 布局) |
| 8 | RecentActivity | **新增** | 最近活动日志 (最多 10 条) |
| 9 | ExportFrequency | **新增** | 导出频率分布柱状图 (按平台统计) |

---

## 一、问题描述

数据洞察区 (HubView Section 3, `sectionRefs[2]`) 内容太少太空:
- 仅有 ContributionHeatmap、WordCountTrend、CategoryDistribution 三个图表
- 缺乏深度的创作分析数据 (写作时间线、生产力洞察、字数分布等)
- 空间利用不充分，桌面端仅使用两列布局
- 无数据时没有友好的空状态提示

## 二、现有组件分析

### 2.1 已有组件 (3 个)

| 组件 | 文件路径 | 功能 | Props | 数据源 |
|---|---|---|---|---|
| ContributionHeatmap | `components/hub/ContributionHeatmap.vue` | GitHub 风格贡献热力图 (52周/26周/13周) | `articles: Article[]` | articles (createdAt/updatedAt) |
| WordCountTrend | `components/hub/WordCountTrend.vue` | 最近 30 天累积字数趋势折线图 | `articles: Article[]` | articles (rawContent.length, createdAt) |
| CategoryDistribution | `components/hub/CategoryDistribution.vue` | 分类分布环形饼图 | `articles: Article[], categories: Category[]` | articles (categoryId) + categories |

**现有组件需要增强**: 三个现有组件当前缺少空状态 UI。需为每个组件添加无数据时的友好空状态提示 (见第五节 5.5)。

### 2.2 现有组件数据逻辑

**ContributionHeatmap**:
- `buildHeatmapData(articles)` -- 返回 `Map<string, number>`，key 为日期字符串 (YYYY-MM-DD)，value 为当天活动数
- 响应式根据 viewportWidth 决定显示 13/26/52 周
- 颜色映射使用品牌红 `#D32F2F` 的不同透明度

**WordCountTrend**:
- `buildTrendData(articles)` -- 返回最近 30 天的 `TrendDataPoint[]`，每天统计截至该日的累积字数
- 使用纯 SVG polyline 绘制趋势线

**CategoryDistribution**:
- `buildCategoryDistribution(categories, articles)` -- 返回 `CategorySlice[]`，按分类统计文章数量
- 使用纯 SVG arc path 绘制环形图
- 颜色方案: `#D32F2F, #1565C0, #2E7D32, #F57C00, #7B1FA2, #00695C, #E91E63, #FF5722`

### 2.3 可用数据源

从现有 Store 和数据库可提取的数据:

- **ArticleStore**: `articles[]` (id, title, rawContent, status, categoryId, tags, createdAt, updatedAt)
- **CategoryStore**: `categories[]` (id, name, icon, articleCount)
- **AssetStore**: `assets[]` (id, filename, mimeType, size, createdAt)
- **EditorStore**: `currentContent` (body, title, transcript)
- **activity_logs 表**: 活动日志 (id, action, targetType, targetId, details, timestamp) -- 通过 `utils/activity-logger.ts` 写入
- **SyncStore**: 同步状态和历史

## 三、新增数据洞察组件 (6 个)

### 3.1 WritingTimeline (新增)

**描述**: 最近 7-14 天的写作活动时间线，以时间轴形式展示每天的创建/编辑活动

**文件**: `components/hub/WritingTimeline.vue`

**Props**:
```typescript
interface WritingTimelineProps {
  articles: Article[]
  maxDays?: number  // 默认 7
}
```

**布局**:
```
今天     | -- 编辑了 "设计规范文档" (1200 字)
         | -- 创建了 "会议纪要" (600 字)
昨天     | -- 编辑了 "产品需求文档" (3400 字)
3月25日  | (无活动)
3月24日  | -- 创建了 "周报" (800 字)
```

**数据计算**:
```typescript
interface TimelineEntry {
  dateLabel: string       // "今天" | "昨天" | "3月25日"
  dateKey: string         // "2026-03-27"
  items: TimelineItem[]   // 当天的活动列表
}

interface TimelineItem {
  articleId: string
  title: string
  action: 'created' | 'edited'
  wordCount: number
  timestamp: Date
}

function buildTimeline(articles: Article[], maxDays: number): TimelineEntry[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const entries: TimelineEntry[] = []

  for (let offset = 0; offset < maxDays; offset++) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const dateKey = formatDateKey(date)

    let dateLabel: string
    if (offset === 0) dateLabel = '今天'
    else if (offset === 1) dateLabel = '昨天'
    else dateLabel = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })

    const items: TimelineItem[] = articles
      .filter(article => {
        const created = formatDateKey(new Date(article.createdAt))
        const updated = formatDateKey(new Date(article.updatedAt || article.createdAt))
        return created === dateKey || updated === dateKey
      })
      .map(article => {
        const created = formatDateKey(new Date(article.createdAt))
        return {
          articleId: article.id,
          title: article.title,
          action: created === dateKey ? 'created' as const : 'edited' as const,
          wordCount: article.rawContent?.length ?? 0,
          timestamp: new Date(article.updatedAt || article.createdAt),
        }
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    entries.push({ dateLabel, dateKey, items })
  }

  return entries
}
```

**视觉设计**:
- 时间轴使用垂直线 (2px, #ECEFF1)
- 每个活动节点使用 6px 圆点 (#D32F2F 表示创建, #1565C0 表示编辑)
- 无活动日显示灰色虚线 + "(无活动)" 文字
- 图标: `Plus` (创建), `Edit3` (编辑) from lucide-vue-next

**空状态**: "还没有写作活动记录，开始创作你的第一篇文章。"

### 3.2 ProductivityInsights (新增)

**描述**: 生产力洞察卡片，分析写作习惯，以 2x3 网格展示 6 个关键指标

**文件**: `components/hub/ProductivityInsights.vue`

**Props**:
```typescript
interface ProductivityInsightsProps {
  articles: Article[]
  categories: Category[]
}
```

**显示内容**:

| 指标 | 计算方式 | 图标 (lucide) |
|---|---|---|
| 最高产时段 | 按 `createdAt` 小时分布统计，取出现次数最多的时段 (如 "14:00-15:00") | `Clock` |
| 最高产星期 | 按 `createdAt` 星期分布统计，取最多的星期 (如 "周三") | `Calendar` |
| 平均文章长度 | `totalWords / totalArticles`，格式化为 "1.2K 字" | `FileText` |
| 最长文章 | `max(rawContent.length)`，显示文章标题 + 字数 | `Award` |
| 写作速度趋势 | 最近 7 天 vs 前 7 天的新增字数对比，显示百分比变化 | `TrendingUp` 或 `TrendingDown` |
| 最活跃分类 | 文章数最多的分类名称 | `FolderOpen` |

**数据计算**:
```typescript
interface InsightMetric {
  label: string
  value: string
  icon: Component
  tone: 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'teal'
}

function computeInsights(articles: Article[], categories: Category[]): InsightMetric[] {
  // 最高产时段
  const hourCounts = new Map<number, number>()
  articles.forEach(a => {
    const hour = new Date(a.createdAt).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
  })
  const peakHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
  const peakHourLabel = `${String(peakHour).padStart(2, '0')}:00-${String(peakHour + 1).padStart(2, '0')}:00`

  // 最高产星期
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const dayCounts = new Map<number, number>()
  articles.forEach(a => {
    const day = new Date(a.createdAt).getDay()
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  })
  const peakDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0

  // 平均文章长度
  const totalWords = articles.reduce((sum, a) => sum + (a.rawContent?.length ?? 0), 0)
  const avgLength = articles.length > 0 ? Math.round(totalWords / articles.length) : 0

  // ... 其他指标类似
}
```

**布局**: 2x3 网格，每个指标一个小卡片，显示图标 + 指标名称 + 指标值

**空状态**: "数据不足以生成洞察，请创建更多文章。"

### 3.3 WordDistribution (新增)

**描述**: 文章字数分布直方图，展示不同字数范围内的文章数量

**文件**: `components/hub/WordDistribution.vue`

**Props**:
```typescript
interface WordDistributionProps {
  articles: Article[]
}
```

**X 轴**: 字数范围: 0-500, 500-1K, 1K-2K, 2K-5K, 5K-10K, 10K+
**Y 轴**: 文章数量

**数据计算**:
```typescript
interface DistributionBucket {
  label: string
  min: number
  max: number      // Infinity 表示上限
  count: number
  percentage: number  // 相对于最大桶的百分比 (用于柱状图高度)
}

const BUCKET_RANGES = [
  { label: '0-500', min: 0, max: 500 },
  { label: '500-1K', min: 500, max: 1000 },
  { label: '1K-2K', min: 1000, max: 2000 },
  { label: '2K-5K', min: 2000, max: 5000 },
  { label: '5K-10K', min: 5000, max: 10000 },
  { label: '10K+', min: 10000, max: Infinity },
]
```

**实现**: 使用纯 CSS + HTML 绘制柱状图 (与项目约束"无外部图表库"一致):

```html
<div class="bar-chart">
  <div
    v-for="(bucket, index) in buckets"
    :key="index"
    class="bar-column"
  >
    <span class="bar-count">{{ bucket.count }}</span>
    <div
      class="bar"
      :style="{ height: `${bucket.percentage}%` }"
    />
    <span class="bar-label">{{ bucket.label }}</span>
  </div>
</div>
```

**空状态**: "还没有文章数据，字数分布将在创作后自动生成。"

### 3.4 TagCloud (新增)

**描述**: 标签词云，按标签出现频率调整字体大小

**文件**: `components/hub/TagCloud.vue`

**Props**:
```typescript
interface TagCloudProps {
  articles: Article[]
}
```

**数据计算**:
```typescript
interface TagEntry {
  tag: string
  count: number
  fontSize: number  // 12px - 28px
}

function buildTagCloud(articles: Article[]): TagEntry[] {
  const tagMap = new Map<string, number>()

  articles.forEach(article => {
    const tags = article.tags ?? []
    tags.forEach(tag => {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
    })
  })

  if (tagMap.size === 0) return []

  const maxFrequency = Math.max(...tagMap.values())
  return [...tagMap.entries()]
    .map(([tag, count]) => ({
      tag,
      count,
      fontSize: 12 + (count / maxFrequency) * 16,
    }))
    .sort((a, b) => b.count - a.count)
}
```

**如果标签数据不足** (少于 3 个标签): 显示空状态提示，不使用替代数据

**视觉设计**:
- 标签使用 flex-wrap 布局，间距 8px
- 颜色使用品牌色的不同透明度: 高频 = #D32F2F，中频 = #607D8B，低频 = #90A4AE
- 每个标签可点击 (未来可跳转到标签筛选)

**空状态**: "文章标签为空，在工作台为文章添加标签后，词云将自动生成。"

### 3.5 RecentActivity (新增)

**描述**: 最近活动日志卡片，显示创建/编辑/导出/删除等操作记录

**文件**: `components/hub/RecentActivity.vue`

**Props**:
```typescript
interface RecentActivityProps {
  articles: Article[]
  maxItems?: number  // 默认 10
}
```

**显示**:
```
最近活动
--------
[Clock]    10:30  编辑了 "设计规范" (+200 字)
[Plus]     09:15  创建了 "新文章"
[Download] 昨天   导出到微信公众号
[Trash]    昨天   删除了 "草稿3"
```

**数据源**: 优先从 `activity_logs` 表读取 (如果 `utils/activity-logger.ts` 已实装)。如果 activity_logs 表为空或未实装，则从 articles 的 createdAt/updatedAt 推断活动:

```typescript
interface ActivityEntry {
  id: string
  action: 'created' | 'edited' | 'exported' | 'deleted'
  title: string
  detail: string        // "+200 字" 或 "微信公众号"
  timeLabel: string     // "10:30" 或 "昨天"
  timestamp: Date
  icon: Component       // lucide icon
}

function buildActivityFromArticles(articles: Article[], maxItems: number): ActivityEntry[] {
  // 从 articles 的 createdAt/updatedAt 推断创建和编辑活动
  const entries: ActivityEntry[] = []

  articles.forEach(article => {
    entries.push({
      id: `created-${article.id}`,
      action: 'created',
      title: article.title,
      detail: `${article.rawContent?.length ?? 0} 字`,
      timeLabel: formatRelativeTime(new Date(article.createdAt)),
      timestamp: new Date(article.createdAt),
      icon: Plus,
    })

    if (article.updatedAt && article.updatedAt !== article.createdAt) {
      entries.push({
        id: `edited-${article.id}`,
        action: 'edited',
        title: article.title,
        detail: '',
        timeLabel: formatRelativeTime(new Date(article.updatedAt)),
        timestamp: new Date(article.updatedAt),
        icon: Edit3,
      })
    }
  })

  return entries
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxItems)
}
```

**图标**: `Plus` (创建), `Edit3` (编辑), `Download` (导出), `Trash2` (删除) from lucide-vue-next

**空状态**: "还没有活动记录，所有创作操作都会在这里留下足迹。"

### 3.6 ExportFrequency (新增)

**描述**: 导出频率分布柱状图，展示各平台的导出次数，帮助创作者了解自己的发布习惯

**文件**: `components/hub/ExportFrequency.vue`

**Props**:
```typescript
interface ExportFrequencyProps {
  /** 不直接使用 articles，而是从 activity_logs 表读取导出记录 */
  maxPlatforms?: number  // 默认 6，最多显示的平台数量
}
```

**数据来源**: 从 `activity_logs` 表中筛选 `action === 'export'` 的记录，按 `details` 字段中的平台名称 (platform key) 分组统计。

```typescript
import { getActivityLogs } from '@/utils/db'  // 或直接 db.activityLogs

interface PlatformExportEntry {
  platform: string        // 'wechat' | 'xiaohongshu' | 'zhihu' | 'juejin' | 'toutiao' | 'bilibili'
  displayName: string     // '微信公众号' | '小红书' | ...
  count: number
  percentage: number      // 相对于最大桶的百分比 (用于柱状图宽度)
  color: string           // 平台代表色
}

const PLATFORM_META: Record<string, { displayName: string; color: string }> = {
  wechat:      { displayName: '微信公众号', color: '#07C160' },
  xiaohongshu: { displayName: '小红书',     color: '#FE2C55' },
  zhihu:       { displayName: '知乎',       color: '#0066FF' },
  juejin:      { displayName: '掘金',       color: '#1E80FF' },
  toutiao:     { displayName: '头条',       color: '#F85959' },
  bilibili:    { displayName: 'B站',        color: '#00A1D6' },
}

async function buildExportFrequency(maxPlatforms: number): Promise<PlatformExportEntry[]> {
  const logs = await getActivityLogs()
  const exportLogs = logs.filter(log => log.action === 'export')

  const platformCounts = new Map<string, number>()
  exportLogs.forEach(log => {
    const platform = extractPlatformFromDetails(log.details)
    if (platform) {
      platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1)
    }
  })

  const maxCount = Math.max(...platformCounts.values(), 1)

  return [...platformCounts.entries()]
    .map(([platform, count]) => ({
      platform,
      displayName: PLATFORM_META[platform]?.displayName ?? platform,
      count,
      percentage: (count / maxCount) * 100,
      color: PLATFORM_META[platform]?.color ?? '#607D8B',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxPlatforms)
}

function extractPlatformFromDetails(details: string): string | null {
  // details 格式: "exported to wechat" 或 JSON { platform: 'wechat' }
  try {
    const parsed = JSON.parse(details)
    return parsed.platform ?? null
  } catch {
    const match = details.match(/(?:exported?\s+to\s+|platform:\s*)(\w+)/i)
    return match?.[1] ?? null
  }
}
```

**支持平台** (与项目导出引擎的 6 平台适配器对应):

| 平台 key | 显示名 | 代表色 |
|---|---|---|
| wechat | 微信公众号 | #07C160 |
| xiaohongshu | 小红书 | #FE2C55 |
| zhihu | 知乎 | #0066FF |
| juejin | 掘金 | #1E80FF |
| toutiao | 头条 | #F85959 |
| bilibili | B站 | #00A1D6 |

**视觉设计**: 水平柱状图，每个平台一行:
```
导出频率分布
────────────────────────────────
微信公众号  ████████████████  12
知乎        ██████████        8
小红书      ████              3
掘金        ██                2
头条        █                 1
B站         █                 1
```

**实现**: 纯 CSS + HTML 水平柱状图:
```html
<div class="export-chart">
  <div
    v-for="entry in platformEntries"
    :key="entry.platform"
    class="export-row"
  >
    <span class="export-row__label">{{ entry.displayName }}</span>
    <div class="export-row__track">
      <div
        class="export-row__bar"
        :style="{ width: `${entry.percentage}%`, background: entry.color }"
      />
    </div>
    <span class="export-row__count">{{ entry.count }}</span>
  </div>
</div>
```

```css
.export-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-row {
  display: grid;
  grid-template-columns: 100px 1fr 40px;
  align-items: center;
  gap: 12px;
}

.export-row__label {
  font-size: 13px;
  font-weight: 600;
  color: #455A64;
  text-align: right;
}

.export-row__track {
  height: 20px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  overflow: hidden;
}

.export-row__bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 4px;
}

.export-row__count {
  font-size: 13px;
  font-weight: 700;
  color: #263238;
}
```

**空状态**: "还没有导出记录，在工作台使用导出功能后，平台分布将自动生成。" (图标: `Download`)

## 四、Section 3 布局重新设计

### 4.1 桌面端布局 (1024px+)

Section 3 在 HubView.vue 中对应 `sectionRefs[2]`，使用 3 行布局:

```
+---------------------------------------------------------+
| Section 3: 数据洞察区                                     |
|                                                           |
| +------------- 65% ----------------+------ 35% ------+   |
| | ContributionHeatmap              | ProductivityInsights |
| | (贡献热力图, 52/26/13周)         | (生产力洞察, 6项)    |
| |                                  |                      |
| +---------------------------------+----------------------+   |
|                                                           |
| +---- 33% -----+------ 33% ------+------ 33% ------+   |
| | WordCountTrend | WordDistribution | CategoryDistrib. |  |
| | (字数趋势)     | (字数分布)       | (分类分布)       |  |
| +---------------+------------------+-----------------+   |
|                                                           |
| +------------- 60% ----------------+------ 40% ------+   |
| | WritingTimeline                   | 右侧面板          |  |
| | (写作时间线)                       | TagCloud (上半)    |  |
| |                                   | RecentActivity(下) |  |
| +----------------------------------+--------------------+   |
|                                                           |
| +---------------------- 100% -------------------------+   |
| | ExportFrequency (导出频率分布)                        |  |
| +-----------------------------------------------------+   |
+---------------------------------------------------------+
```

**CSS Grid**:
```css
.insights-grid {
  display: grid;
  gap: 20px;
}

.insights-row-1 {
  display: grid;
  grid-template-columns: 1.85fr 1fr;
  gap: 20px;
}

.insights-row-2 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.insights-row-3 {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
}

.insights-row-3__right {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 20px;
}

.insights-row-4 {
  /* ExportFrequency 100% 宽度 */
}
```

### 4.2 平板端布局 (768px - 1024px)

```
+-------------------------------+
| ContributionHeatmap (100%)    |
+-------------------------------+
| ProductivityInsights (100%)   |
+---------------+---------------+
| WordCountTrend | WordDistrib. |
+---------------+---------------+
| CategoryDist. | TagCloud      |
+---------------+---------------+
| WritingTimeline (100%)        |
+-------------------------------+
| RecentActivity (100%)         |
+-------------------------------+
| ExportFrequency (100%)        |
+-------------------------------+
```

### 4.3 手机端布局 (< 768px)

所有组件 100% 宽度，垂直堆叠，顺序:
1. ContributionHeatmap
2. ProductivityInsights
3. WordCountTrend
4. WordDistribution
5. CategoryDistribution
6. WritingTimeline
7. TagCloud
8. RecentActivity
9. ExportFrequency

## 五、图表样式统一规范

所有数据洞察组件遵循统一视觉风格:

### 5.1 卡片容器

```css
.insight-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.insight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
}
```

### 5.2 卡片标题

```css
.insight-eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #D32F2F;
  margin-bottom: 8px;
}

.insight-heading {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}
```

### 5.3 图表颜色

- 主色: `#D32F2F` (品牌红)
- 辅助色: `#1565C0` (蓝), `#2E7D32` (绿), `#F57C00` (橙), `#7B1FA2` (紫), `#00695C` (青)
- 背景: `#FAFBFC`
- 网格线: `rgba(0, 0, 0, 0.04)`
- 空状态文字: `#90A4AE`

### 5.4 数字动画

大数字使用 count-up 动画 (easeOutCubic):

```typescript
function useCountUp(target: Ref<number>, duration: number = 1000) {
  const display = ref(0)
  let animationFrame: number

  watch(target, (newVal) => {
    const start = display.value
    const diff = newVal - start
    const startTime = performance.now()

    function step(time: number) {
      const progress = Math.min((time - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      display.value = Math.round(start + diff * eased)
      if (progress < 1) animationFrame = requestAnimationFrame(step)
    }

    cancelAnimationFrame(animationFrame)
    animationFrame = requestAnimationFrame(step)
  }, { immediate: true })

  return display
}
```

适用组件: ProductivityInsights (所有数字指标), StatsDashboard (streak 天数)

### 5.5 空状态设计

所有图表组件在无数据时必须显示友好的空状态:

```html
<div v-if="hasNoData" class="insight-empty">
  <component :is="emptyIcon" :size="32" class="insight-empty__icon" />
  <p class="insight-empty__text">{{ emptyMessage }}</p>
</div>
```

```css
.insight-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 16px;
  min-height: 160px;
}

.insight-empty__icon {
  color: #CFD8DC;
}

.insight-empty__text {
  font-size: 14px;
  color: #90A4AE;
  text-align: center;
  max-width: 280px;
  line-height: 1.6;
}
```

**各组件空状态提示**:

| 组件 | 空状态消息 | 图标 |
|---|---|---|
| ContributionHeatmap | "还没有写作活动数据，创作后热力图将自动填充。" | `CalendarDays` |
| WordCountTrend | "字数趋势将在创建文章后自动生成。" | `TrendingUp` |
| CategoryDistribution | "为文章指定分类后，分布图将自动生成。" | `PieChart` |
| WritingTimeline | "还没有写作活动记录，开始创作你的第一篇文章。" | `Clock` |
| ProductivityInsights | "数据不足以生成洞察，请创建更多文章。" | `BarChart3` |
| WordDistribution | "还没有文章数据，字数分布将在创作后自动生成。" | `BarChart` |
| TagCloud | "文章标签为空，在工作台为文章添加标签后，词云将自动生成。" | `Tags` |
| RecentActivity | "还没有活动记录，所有创作操作都会在这里留下足迹。" | `Activity` |
| ExportFrequency | "还没有导出记录，在工作台使用导出功能后，平台分布将自动生成。" | `Download` |

## 六、HubView.vue Section 3 Template 更新

将现有 Section 3 (HubView.vue line 567-590) 替换为:

```html
<section
  :ref="(element) => setSectionRef(element, 2)"
  class="hub-section"
>
  <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
        Section 3
      </p>
      <h2 class="mt-2 text-4xl font-bold text-slate-800">
        数据洞察区
      </h2>
    </div>

    <!-- Row 1: Heatmap + Insights -->
    <div class="grid gap-5 xl:grid-cols-[1.85fr_1fr]">
      <ContributionHeatmap :articles="articles" />
      <ProductivityInsights :articles="articles" :categories="categoryStore.categories" />
    </div>

    <!-- Row 2: Trend + Distribution + Category -->
    <div class="grid gap-5 xl:grid-cols-3">
      <WordCountTrend :articles="articles" />
      <WordDistribution :articles="articles" />
      <CategoryDistribution :articles="articles" :categories="categoryStore.categories" />
    </div>

    <!-- Row 3: Timeline + (TagCloud + RecentActivity) -->
    <div class="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <WritingTimeline :articles="articles" />
      <div class="grid gap-5 grid-rows-2">
        <TagCloud :articles="articles" />
        <RecentActivity :articles="articles" />
      </div>
    </div>

    <!-- Row 4: Export Frequency -->
    <ExportFrequency :articles="articles" />
  </div>
</section>
```

## 七、文件清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | `components/hub/WritingTimeline.vue` | 写作活动时间线 (7-14 天) |
| 新增 | `components/hub/ProductivityInsights.vue` | 生产力洞察 (6 项指标, 2x3 网格) |
| 新增 | `components/hub/WordDistribution.vue` | 字数分布直方图 (6 个桶) |
| 新增 | `components/hub/TagCloud.vue` | 标签词云 (flex-wrap 布局) |
| 新增 | `components/hub/RecentActivity.vue` | 最近活动日志 (最多 10 条) |
| 新增 | `components/hub/ExportFrequency.vue` | 导出频率分布 (水平柱状图) |
| 修改 | `components/hub/ContributionHeatmap.vue` | 添加空状态 UI |
| 修改 | `components/hub/WordCountTrend.vue` | 添加空状态 UI |
| 修改 | `components/hub/CategoryDistribution.vue` | 添加空状态 UI |
| 修改 | `views/HubView.vue` | Section 3 布局重排，导入 6 个新组件 |

## 八、验收标准

- [ ] 数据洞察区包含 9 个不同的图表/卡片 (3 现有 + 6 新增)
- [ ] 所有图表使用真实数据 (来自 ArticleStore / CategoryStore / activity_logs)
- [ ] 所有 9 个图表在无数据时显示友好的空状态 (图标 + 提示文字)
- [ ] 桌面/平板/手机三端布局正确
- [ ] 数字有 count-up 动画 (ProductivityInsights)
- [ ] 颜色方案与品牌一致 (#D32F2F 系列)
- [ ] 图表可响应数据变化 (reactive, 使用 computed)
- [ ] 所有图标使用 lucide-vue-next (无 Emoji)
- [ ] 无 Mock 数据
- [ ] 无外部图表库依赖 (纯 SVG + CSS 实现)
