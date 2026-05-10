# 数据洞察丰富 (3 → 9 图表)

## 规格参考
- `prompts/0327/08-data-insights-spec.md` (完整规范)

## 背景
Hub 首页数据洞察区目前只有 3 个图表组件，需扩展到 9 个。全部使用纯 SVG + CSS 实现，无外部图表库依赖。

## 当前完成基线
- [DONE] ContributionHeatmap / WordCountTrend / CategoryDistribution 已在 `insights/` 组件集中补齐空状态。
- [DONE] 新增 WritingTimeline / ProductivityInsights / WordDistribution / TagCloud / RecentActivity / ExportFrequency。
- [DONE] `DataInsightsSection` 已接入 `HubView` 筛选栏前，形成 4 行响应式 Section 3。
- [BOUNDARY] 当前 slice 不伪造 `activity_logs` / `export_logs` 表；缺表场景使用真实文章时间推断或展示空状态。

## Requirements

### 现有 3 组件修改
为 ContributionHeatmap/WordCountTrend/CategoryDistribution 添加空状态 UI:
- 灰色占位图形 + 说明文字
- 使用 Lucide 图标 (CalendarDays/TrendingUp/PieChart)

### 新组件 1: WritingTimeline.vue
- 垂直时间轴 7-14 天
- 创建 = 红色圆点 / 编辑 = 蓝色圆点
- 每个时间点: 日期 + 标题 + 操作类型
- 数据源: articles 的 createdAt/updatedAt
- 空状态: Clock 图标 + "暂无写作记录"

### 新组件 2: ProductivityInsights.vue
- 2x3 网格 6 项指标:
  1. 最高产时段 (0-23h)
  2. 最高产星期 (周一-日)
  3. 平均文章长度 (字)
  4. 最长文章 (标题 + 字数)
  5. 写作速度趋势 (字/分钟)
  6. 最活跃分类
- `useCountUp` composable: easeOutCubic 1000ms 数字动画
- 空状态: BarChart3 图标 + "积累更多数据后显示"

### 新组件 3: WordDistribution.vue
- 水平柱状图直方图
- 6 个桶: 0-500 / 500-1K / 1K-2K / 2K-5K / 5K-10K / 10K+
- 纯 SVG 实现
- 空状态: BarChart 图标

### 新组件 4: TagCloud.vue
- flex-wrap 布局
- 字体: 12-28px 按频率线性缩放
- 颜色: slate-400 → 品牌红 (按频率渐变)
- 数据源: articles 标签字段
- 空状态: Tag 图标 + "添加文章标签后显示"

### 新组件 5: RecentActivity.vue
- 最近 10 条活动日志
- 优先使用 `activity_logs` 表，回退到 articles 推断
- 每条: 图标 + 描述 + 时间 (相对时间)
- 空状态: Activity 图标 + "暂无活动"

### 新组件 6: ExportFrequency.vue
- 水平柱状图按平台统计
- 6 平台: wechat/xiaohongshu/zhihu/juejin/toutiao/bilibili
- 平台颜色: 微信绿/小红书红/知乎蓝/掘金蓝/头条红/B站蓝
- 空状态: Share2 图标 + "导出文章后显示"

### HubView Section 3 布局 (4 行)
```
Row 1: ContributionHeatmap (65%) + ProductivityInsights (35%)
Row 2: WordCountTrend + WordDistribution + CategoryDistribution (各 33%)
Row 3: WritingTimeline (60%) + [TagCloud + RecentActivity 堆叠] (40%)
Row 4: ExportFrequency (100%)
```

### 统一视觉风格
- `.insight-card` 容器: 白色毛玻璃 / 圆角 20px / hover 上浮
- `.insight-eyebrow`: #D32F2F 11px uppercase 标题
- 颜色方案统一

### 响应式
- 桌面: 上述布局
- 平板: 2 列交替
- 手机: 全部 100% 堆叠

## Acceptance Criteria
- [x] 9 个图表组件全部渲染正常
- [x] 全部有空状态 UI
- [x] 纯 SVG + CSS (无外部图表库)
- [x] 数据源真实: ArticleStore / CategoryStore 派生；RecentActivity 使用文章时间推断；ExportFrequency 在无 `export_logs` 时保持空状态
- [x] useCountUp 数字动画正常
- [x] Section 3 四行布局正确
- [x] 三端响应式
- [x] `pnpm exec vue-tsc --noEmit` 零错误

## 2026-04-29 Completion Note

- 已实现 `DataInsightsSection`，在 Hub 筛选栏前渲染 9 张数据洞察卡片，布局为 65/35、三列、60/40 堆叠与 Export 全宽四行结构。
- 已新增 `insights/` 组件集：ContributionHeatmap、WordCountTrend、CategoryDistribution、WritingTimeline、ProductivityInsights、WordDistribution、TagCloud、RecentActivity、ExportFrequency、InsightEmptyState 与共享类型。
- 所有图表均从真实 `articles` / `categories` props 派生，不引入 sample、fixture、mock 或外部 chart library。
- `RecentActivity` 在没有持久化 `activity_logs` 表时只用真实文章 `createdAt` / `updatedAt` 推断；`ExportFrequency` 在没有 `export_logs` 表时保持真实空状态，不伪造平台计数。
- 已补齐 `useCountUp` 数字动画并处理空集合、缺失日期、无分类、无标签、无导出日志等真实边界。

### Verification

- `P1_08_CODE_CLEAN_OK`
- `pnpm exec vue-tsc --noEmit`
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`
- `pnpm build`，仅保留既有 chunk size warning
