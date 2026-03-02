# 08 - 首页功能增强 Spec

## 目标
将首页（HubView）从 Mock 数据驱动改为真实数据驱动，并增加写作辅助功能。

## 1. Mock 数据替换

### 1.1 统计数据真实化

#### 文章总数
```typescript
// 当前（Mock）
totalArticles: articles.value.length || 24  // fallback 到 24
// 修复
totalArticles: articles.value.length  // 纯真实数据
```

#### 总阅读量 → 总字数
```typescript
// 当前（Mock）
totalViews: '8.5K'
// 修复为真实可计算的指标
totalWords: computed(() => {
  return articles.value.reduce((sum, a) => {
    return sum + (a.rawContent?.length || 0)
  }, 0)
})
// 显示格式化：formatNumber(totalWords) → "12.3K 字"
```

#### 效率指数 → 完成率
```typescript
// 当前（Mock）
efficiency: '98%'
// 修复
completionRate: computed(() => {
  const total = articles.value.length
  if (total === 0) return '0%'
  const published = articles.value.filter(a => a.status === 'published').length
  return Math.round(published / total * 100) + '%'
})
```

### 1.2 周创作数据真实化
```typescript
// 当前（Mock）
const weeklyData = ref([
  { day: '周一', count: 3, height: 40 },
  // ... 硬编码
])

// 修复：从真实数据聚合
const weeklyData = computed(() => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const today = new Date()
  const result = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dayStart = new Date(date.setHours(0, 0, 0, 0))
    const dayEnd = new Date(date.setHours(23, 59, 59, 999))

    const count = articles.value.filter(a => {
      const created = new Date(a.createdAt)
      return created >= dayStart && created <= dayEnd
    }).length

    result.push({
      day: days[dayStart.getDay()],
      count,
      height: 0, // 稍后计算
      active: i === 0
    })
  }

  // 计算柱状图高度（相对最大值）
  const max = Math.max(...result.map(d => d.count), 1)
  result.forEach(d => d.height = Math.round(d.count / max * 100))

  return result
})
```

### 1.3 分类数据真实化
```typescript
// 当前有 fallback 默认分类
// 修复：完全来自数据库
const categoryItems = computed(() => {
  if (categories.value.length === 0) {
    return [] // 空状态，显示"创建第一个分类"提示
  }
  return categories.value.map(c => ({
    ...c,
    icon: getCategoryIcon(c.icon || c.name),
    color: getCategoryColor(c.color),
    count: c.articleCount || 0
  }))
})
```

## 2. 每日灵感真实化

### 2.1 内置金句库
```typescript
// data/quotes.ts
export const quotes: Quote[] = [
  { text: '简约是复杂的终极形式。', author: '达·芬奇' },
  { text: '设计不仅仅是外表和感觉。设计是关于它如何工作的。', author: '史蒂夫·乔布斯' },
  { text: '少即是多。', author: '路德维希·密斯·凡德罗' },
  { text: '好的设计是尽可能少的设计。', author: '迪特·拉姆斯' },
  // ... 500+ 条中英文名言
]
```

### 2.2 每日轮换算法
```typescript
function getDailyQuote(): Quote {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  )
  const index = dayOfYear % quotes.length
  return quotes[index]
}
```

### 2.3 支持用户自定义
- 设置页面中添加"自定义灵感语录"管理
- 自定义语录优先显示

## 3. 创作流交互增强

### 3.1 柱状图可点击
点击某天的柱状图 → 弹出该日创建的文章列表浮窗
```vue
<div
  class="chart-bar"
  @click="showDayArticles(index)"
>
  <!-- ... -->
</div>

<!-- 浮窗 -->
<div v-if="showArticlePopup" class="article-popup">
  <h4>{{ selectedDay.day }} 的文章</h4>
  <div v-for="article in dayArticles" :key="article.id" class="popup-article">
    <span>{{ article.title }}</span>
    <button @click="openArticle(article.id)">打开</button>
  </div>
</div>
```

### 3.2 分类可自定义
- 点击"管理"进入分类管理
- 支持新建、编辑、删除分类
- 支持自定义分类颜色和图标

## 4. 新增写作辅助卡片

### 4.1 写作挑战卡
- 每日写作目标（如"今天写 500 字"）
- 进度条显示
- 连续写作天数统计

### 4.2 最近编辑时间线
- 最近 5 篇编辑过的文章
- 显示编辑时间和状态

### 4.3 快捷模板入口
- "今日日记"
- "读书笔记"
- "技术博客"
- 点击直接创建对应模板的新文章

## 5. 空状态处理

当没有文章时：
- 创作流区域显示"开始你的第一篇创作"引导
- 统计卡片显示 0
- 分类区域显示"创建第一个分类"按钮

## 验收标准
- [ ] 文章总数来自真实数据
- [ ] 总字数来自真实计算
- [ ] 完成率来自真实计算
- [ ] 周创作数据从 createdAt 聚合
- [ ] 每日灵感每天自动更换
- [ ] 分类完全来自数据库
- [ ] 柱状图可点击查看当日文章
- [ ] 空状态有友好提示
- [ ] 无任何 Mock 数据
