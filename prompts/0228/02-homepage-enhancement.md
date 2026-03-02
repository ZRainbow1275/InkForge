# 02 - 首页增强 + 瀑布流布局

## 问题描述

### 问题 A: 统计指标不完整
- 当前 HubView 的统计数据（文章总数、总字数、完成率、素材总数、连续天数）虽然来自真实数据，但交互性不足
- 创作流柱状图（weeklyData）只有 hover tooltip，无点击交互

### 问题 B: 柱状图点击无反应
- 点击创作流柱状图的某一天的柱子，期望显示该天创建的文章列表
- 当前无 click handler

### 问题 C: 缺少瀑布流文章展示
- 首页缺少文章内容的可视化浏览体验
- 需要类似 Pinterest/小红书的瀑布流（masonry）布局展示文章卡片

## 设计方案

### A. 柱状图点击交互

```typescript
// 新增状态
const selectedDayArticles = ref<Article[]>([])
const selectedDayLabel = ref('')
const showDayArticles = ref(false)

function handleBarClick(dayData: WeeklyBarData) {
  const date = new Date()
  date.setDate(date.getDate() - (6 - dayData.index))
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

  selectedDayArticles.value = articles.value.filter(a => {
    const created = new Date(a.createdAt)
    return created >= dayStart && created <= dayEnd
  })
  selectedDayLabel.value = `${date.getMonth() + 1}/${date.getDate()} (${dayData.day})`
  showDayArticles.value = true
}
```

在 Hero Card 底部添加文章弹出列表：
```html
<!-- 日期文章列表浮层 -->
<Transition name="slide-up">
  <div v-if="showDayArticles" class="day-articles-panel">
    <div class="day-articles-header">
      <span>{{ selectedDayLabel }} 的文章</span>
      <button @click="showDayArticles = false">关闭</button>
    </div>
    <div v-if="selectedDayArticles.length === 0" class="day-articles-empty">
      当天无创作记录
    </div>
    <div v-else class="day-articles-list">
      <div
        v-for="article in selectedDayArticles"
        :key="article.id"
        class="day-article-item"
        @click="router.push({ path: '/workstation', query: { id: article.id } })"
      >
        <span class="article-title">{{ article.title }}</span>
        <span class="article-status" :class="article.status">{{ article.status }}</span>
      </div>
    </div>
  </div>
</Transition>
```

### B. 瀑布流文章展示

在 Bento Grid 下方添加独立的瀑布流区域：

```vue
<!-- 瀑布流区域 -->
<section class="waterfall-section" v-if="articles.length > 0">
  <div class="waterfall-header">
    <h2>全部文章</h2>
    <div class="waterfall-filters">
      <button
        v-for="filter in waterfallFilters"
        :key="filter.value"
        class="filter-chip"
        :class="{ active: activeFilter === filter.value }"
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </div>
  </div>
  <div class="waterfall-grid" ref="waterfallRef">
    <div
      v-for="article in filteredArticles"
      :key="article.id"
      class="waterfall-card"
      @click="openArticle(article.id)"
    >
      <div class="card-cover" v-if="article.coverImage">
        <img :src="article.coverImage" :alt="article.title" loading="lazy" />
      </div>
      <div class="card-body">
        <h3>{{ article.title }}</h3>
        <p class="card-excerpt">{{ getExcerpt(article) }}</p>
        <div class="card-meta">
          <span class="card-category" v-if="article.categoryName">{{ article.categoryName }}</span>
          <span class="card-date">{{ formatDate(article.updatedAt || article.createdAt) }}</span>
          <span class="card-words">{{ article.rawContent?.length || 0 }} 字</span>
        </div>
      </div>
    </div>
  </div>
</section>
```

#### 瀑布流 CSS（纯 CSS columns 方案，无需 JS 库）

```css
.waterfall-grid {
  columns: 4 280px;
  column-gap: 20px;
  padding: 0;
}

.waterfall-card {
  break-inside: avoid;
  margin-bottom: 20px;
  background: var(--bg-frosted);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.waterfall-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-float);
  border-color: rgba(211, 47, 47, 0.2);
}
```

#### 瀑布流过滤器

```typescript
const waterfallFilters = [
  { value: 'all', label: '全部' },
  { value: 'recent', label: '最近编辑' },
  { value: 'processed', label: '已发布' },
  { value: 'draft', label: '草稿' },
]

const activeFilter = ref('all')

const filteredArticles = computed(() => {
  let list = [...articles.value]
  switch (activeFilter.value) {
    case 'recent':
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      break
    case 'processed':
      list = list.filter(a => a.status === 'processed')
      break
    case 'draft':
      list = list.filter(a => a.status !== 'processed')
      break
  }
  return list
})
```

## 修改文件清单

### 需要修改
| 文件 | 修改内容 |
|------|----------|
| `src/views/HubView.vue` | 添加柱状图点击、日期文章面板、瀑布流区域 |
| `src/data/quotes.ts` | 无修改（已有 372 条） |

### 依赖添加
- 无新依赖（纯 CSS columns 实现瀑布流）

## 验证标准

1. 点击创作流柱状图的任意一天 → 显示该天创建的文章列表
2. 文章列表中的项目可点击跳转到编辑器
3. 无文章的日期显示「当天无创作记录」
4. 瀑布流区域展示所有文章卡片
5. 过滤器（全部/最近/已发布/草稿）正确筛选
6. 瀑布流响应式：窄屏自动减少列数
7. 文章卡片点击跳转到编辑器
8. 统计计数全部来自真实数据，无 mock

## 优先级

**P1** — 用户体验增强
