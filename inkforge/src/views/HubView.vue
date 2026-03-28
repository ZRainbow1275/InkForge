<script setup lang="ts">
/**
 * HubView - InkForge 首页
 * 双区域设计：首屏 4x3 Bento Grid Dashboard + 下滑瀑布流文章区
 *
 * v6: 重构为 Bento Grid + Waterfall 布局
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useArticleStore } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'
import { useAIStore } from '@/stores/ai'
import { useAssetStore } from '@/stores/asset'
import { getDailyQuote, formatNumber } from '@/data/quotes'
import type { Article } from '@/types'
import { Activity } from 'lucide-vue-next'
import AddCategoryModal from '@/components/category/AddCategoryModal.vue'

const router = useRouter()
const articleStore = useArticleStore()
const categoryStore = useCategoryStore()
const aiStore = useAIStore()
const assetStore = useAssetStore()

const { articles } = storeToRefs(articleStore)

// ─── 页面加载状态 ───
const pageLoading = ref(true)

// ─── 日期时间显示 ───
const currentDateTime = ref('')

function updateDateTime(): void {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }
  currentDateTime.value = now.toLocaleDateString('zh-CN', options)
}

// ─── AI 灵感状态 ───
const aiInspirationLoading = ref(false)
const aiInspiration = ref<{ text: string; author: string } | null>(null)

// ─── 统计数据 — 全部来自真实 Store，零 Mock ───
const stats = computed(() => {
  const total = articles.value.length

  const totalWords = articles.value.reduce((sum: number, a: Article) => {
    return sum + (a.rawContent?.length || 0)
  }, 0)

  const processed = articles.value.filter((a: Article) => a.status === 'processed').length
  const completionRateNum = total === 0 ? 0 : Math.round(processed / total * 100)

  const assetCount = assetStore.assets.length
  const streak = calculateStreak()

  return {
    totalArticles: total,
    totalWords: formatNumber(totalWords),
    completionRate: completionRateNum + '%',
    completionRateNum,
    assetCount,
    streak,
  }
})

/** 计算连续创作天数 */
function calculateStreak(): number {
  if (articles.value.length === 0) return 0

  const dateSet = new Set<string>()
  articles.value.forEach((a: Article) => {
    const d = new Date(a.updatedAt || a.createdAt)
    dateSet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
  })

  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (dateSet.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

// ─── 每日名言 ───
const dailyQuote = ref(getDailyQuote())

/** AI 生成写作灵感 */
async function generateAIInspiration(): Promise<void> {
  if (aiInspirationLoading.value) return
  if (!aiStore.isAvailable) return

  aiInspirationLoading.value = true
  try {
    const result = await aiStore.generate(
      '生成灵感',
      '你是一位富有哲思的写作灵感生成器。直接输出一句金句和作者，不要任何额外说明。',
      '请生成一句关于写作、创作或思考的独特灵感金句（30字以内），并注明作者（可以是"AI灵感"）。格式：灵感内容|作者'
    )
    const parts = result.split('|')
    if (parts.length >= 2) {
      aiInspiration.value = {
        text: parts[0].trim().replace(/^[""\u201C]|[""\u201D]$/g, ''),
        author: parts[1].trim(),
      }
    } else {
      aiInspiration.value = {
        text: result.trim().replace(/^[""\u201C]|[""\u201D]$/g, ''),
        author: 'AI 灵感',
      }
    }
  } catch {
    // AI 失败时静默降级，保持本地名言
  } finally {
    aiInspirationLoading.value = false
  }
}
void generateAIInspiration()

/** 当前展示的灵感（AI 优先，fallback 本地） */
const displayQuote = computed(() => aiInspiration.value || dailyQuote.value)

// ─── 分类创建 Modal ───
const showAddCategoryModal = ref(false)

async function handleAddCategory(data: { name: string; icon: string }): Promise<void> {
  try {
    await categoryStore.addCategory(data.name, data.icon)
    showAddCategoryModal.value = false
  } catch {
    // 静默处理，store 内部有错误日志
  }
}

// ─── 图表交互 ───
const selectedDayIndex = ref<number | null>(null)

// ─── 筛选栏 ───
const filterMode = ref<'all' | 'week' | 'category'>('all')
const filterCategoryId = ref<string | null>(null)
const searchQuery = ref('')
const sortMode = ref<'recent' | 'title' | 'wordcount'>('recent')

// ─── Bento Grid 专用计算属性 ───

/** 周一到周日的标签 */
const weekDayLabels: string[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 获取本周一 00:00:00 的 Date 对象（复用，避免多处重复计算） */
function getMondayOfWeek(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** 本周每日文章数（Mon=0 ~ Sun=6） */
const weeklyChartData = computed((): number[] => {
  const monday = getMondayOfWeek()

  const counts: number[] = [0, 0, 0, 0, 0, 0, 0]

  articles.value.forEach((a: Article) => {
    const d = new Date(a.updatedAt || a.createdAt)
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(monday)
      dayStart.setDate(monday.getDate() + i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayStart.getDate() + 1)
      if (d >= dayStart && d < dayEnd) {
        counts[i]++
        break
      }
    }
  })

  return counts
})

/** 本周产出总数 */
const weeklyTotal = computed((): number =>
  weeklyChartData.value.reduce((s: number, n: number) => s + n, 0)
)

/** 今天是本周第几天（Mon=0） */
const todayIndex = computed((): number => {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
})

/** 本周最大单日产出（至少为1防除零） */
const maxDayCount = computed((): number =>
  Math.max(...weeklyChartData.value, 1)
)

/** 计算柱状图高度百分比 */
function getBarHeight(count: number): string {
  const minHeight = 8
  const pct = (count / maxDayCount.value) * 100
  return Math.max(pct, minHeight) + '%'
}

/** 选中日文章展开 */
const selectedDayArticles = computed(() => {
  if (selectedDayIndex.value === null) return []
  const monday = getMondayOfWeek()
  const targetDate = new Date(monday)
  targetDate.setDate(monday.getDate() + selectedDayIndex.value)
  const nextDate = new Date(targetDate)
  nextDate.setDate(targetDate.getDate() + 1)
  return articles.value.filter(a => {
    const d = new Date(a.updatedAt || a.createdAt)
    return d >= targetDate && d < nextDate
  })
})

/** 筛选+搜索+排序后的文章列表 */
const displayArticles = computed(() => {
  let result = [...articles.value]
  if (filterMode.value === 'week') {
    const monday = getMondayOfWeek()
    result = result.filter(a => new Date(a.updatedAt || a.createdAt) >= monday)
  } else if (filterMode.value === 'category' && filterCategoryId.value) {
    result = result.filter(a => a.categoryId === filterCategoryId.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.rawContent?.toLowerCase().includes(q)
    )
  }
  switch (sortMode.value) {
    case 'recent': result.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()); break
    case 'title': result.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN')); break
    case 'wordcount': result.sort((a, b) => (b.rawContent?.length || 0) - (a.rawContent?.length || 0)); break
  }
  return result
})

// ─── 新增：Bento Grid 专用 ───

/** 最近文章（用于最近文件卡片） */
const latestArticle = computed(() => {
  if (articles.value.length === 0) return null
  return [...articles.value].sort((a, b) =>
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  )[0]
})

/** 分类展示（最多3个，带颜色方案） */
const displayCategories = computed(() => {
  const colorSchemes = [
    { bg: '#E3F2FD', color: '#1565C0', hoverBorder: '#1565C0' },
    { bg: '#FFF3E0', color: '#F57C00', hoverBorder: '#F57C00' },
    { bg: '#E8F5E9', color: '#2E7D32', hoverBorder: '#2E7D32' },
    { bg: '#F3E5F5', color: '#7B1FA2', hoverBorder: '#7B1FA2' },
    { bg: '#FFEBEE', color: '#D32F2F', hoverBorder: '#D32F2F' },
    { bg: '#E0F7FA', color: '#00695C', hoverBorder: '#00695C' },
  ]
  return categoryStore.categories.slice(0, 3).map((cat, i) => ({
    ...cat,
    scheme: colorSchemes[i % colorSchemes.length],
  }))
})

// ─── 方法 ───

function toggleDaySelection(index: number): void {
  selectedDayIndex.value = selectedDayIndex.value === index ? null : index
}

function setFilterMode(mode: 'all' | 'week' | 'category'): void {
  filterMode.value = mode
  if (mode !== 'category') filterCategoryId.value = null
}

function getExcerpt(article: Article): string {
  if (article.description) return article.description
  if (article.rawContent) return article.rawContent.substring(0, 120)
  return '暂无内容摘要'
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'processed': return '已完成'
    case 'read': return '已读'
    default: return '草稿'
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'processed': return 'status-done'
    case 'read': return 'status-read'
    default: return 'status-draft'
  }
}

function formatRelativeTime(dateStr: string | Date): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚才'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function getCategoryColor(categoryId: string | null): string {
  if (!categoryId) return '#ECEFF1'
  const index = categoryStore.categories.findIndex(c => c.id === categoryId)
  if (index < 0) return '#ECEFF1'
  const palette = ['#D32F2F', '#1565C0', '#2E7D32', '#F57C00', '#7B1FA2', '#00695C']
  return palette[index % palette.length]
}

function getCategoryName(categoryId: string | null): string {
  if (!categoryId) return ''
  const cat = categoryStore.categories.find(c => c.id === categoryId)
  return cat?.name || ''
}

// ─── 导航 ───
function startNewProject(): void {
  router.push('/workstation')
}

function openArticle(articleId: string): void {
  router.push({ path: '/workstation', query: { id: articleId } })
}

function goToSettings(): void {
  router.push('/settings')
}

/** Avatar 加载失败时的回退处理 */
function handleAvatarError(e: Event): void {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22%3E%3Crect fill=%22%23D32F2F%22 width=%2240%22 height=%2240%22 rx=%228%22/%3E%3Ctext x=%2220%22 y=%2226%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22 font-weight=%22bold%22%3EIF%3C/text%3E%3C/svg%3E'
}

// ─── Ctrl+N 快捷键 ───
function handleKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    startNewProject()
  }
}

// ─── 初始化 ───
onMounted(async () => {
  updateDateTime()
  window.addEventListener('keydown', handleKeydown)
  await Promise.all([
    categoryStore.loadCategories(),
    articleStore.loadArticles(),
    assetStore.loadAssets(),
  ])
  pageLoading.value = false
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="hub-page">

    <!-- 加载状态 -->
    <div v-if="pageLoading" class="page-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <!-- HEADER -->
    <header class="hub-header">
      <div class="header-brand">
        <div class="logo">IF</div>
        <div class="brand-text">
          <h1>InkForge<span class="version-tag">v6.0</span></h1>
          <p class="welcome-text">{{ currentDateTime }}</p>
        </div>
      </div>

      <div class="header-actions">
        <button class="header-new-btn" @click="startNewProject" title="新建文章 (Ctrl+N)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建
        </button>
        <div class="sync-badge">
          <div class="sync-dot"></div>
          <span>{{ stats.totalArticles }} 篇文章</span>
        </div>
        <button class="icon-btn" @click="goToSettings" title="设置">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=InkForge"
          class="avatar"
          alt="Avatar"
          @error="handleAvatarError"
        >
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- BENTO GRID: 4col x 3row, 撑满首屏                      -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <div class="bento-container">

      <!-- 1. Hero 创作流 (2col x 2row) -->
      <div class="bento-card card-hero">
        <div class="hero-decor"></div>
        <Activity class="hero-activity-icon" :size="48" :stroke-width="1.5" />
        <div class="hero-content">
          <div class="hero-text">
            <h2 class="hero-title">创作流</h2>
            <p class="hero-subtitle">本周产出 {{ weeklyTotal }} 篇</p>
          </div>
          <div class="chart-container">
            <div v-for="(count, i) in weeklyChartData" :key="i"
              class="chart-bar"
              :class="{ active: i === todayIndex, selected: i === selectedDayIndex }"
              :style="{ height: getBarHeight(count) }"
              @click="toggleDaySelection(i)">
              <span class="tooltip">{{ count }} 篇</span>
            </div>
          </div>
          <div class="chart-labels">
            <span v-for="label in weekDayLabels" :key="label">{{ label }}</span>
          </div>
          <!-- 选中日文章展开 -->
          <transition name="expand">
            <div v-if="selectedDayIndex !== null" class="day-articles" :key="selectedDayIndex">
              <template v-if="selectedDayArticles.length > 0">
                <div v-for="article in selectedDayArticles" :key="article.id"
                  class="day-article-item" @click.stop="openArticle(article.id)">
                  <span class="day-article-title">{{ article.title }}</span>
                  <span class="day-article-status" :class="statusClass(article.status)">
                    {{ getStatusLabel(article.status) }}
                  </span>
                </div>
              </template>
              <span v-else class="day-articles-empty-text">当天无文章</span>
            </div>
          </transition>
        </div>
      </div>

      <!-- 2. Stats 统计 (1col x 2row) -->
      <div class="bento-card card-stats">
        <div class="stat-item">
          <div class="stat-icon stat-icon-red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div class="stat-value">{{ stats.totalArticles }}</div>
          <div class="stat-label">文章</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon stat-icon-blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div class="stat-value">{{ stats.totalWords }}</div>
          <div class="stat-label">字数</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon stat-icon-green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div class="stat-value">{{ stats.completionRate }}</div>
          <div class="stat-label">完成率</div>
        </div>
      </div>

      <!-- 3. 分类卡片 (2col x 1row) — 原型顺序：Categories 在 Recent 之前 -->
      <div class="bento-card card-categories">
        <div class="categories-header">
          <h3 class="categories-title">我的分类</h3>
          <div class="categories-actions">
            <span class="categories-add" @click.stop="showAddCategoryModal = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              添加
            </span>
            <span class="categories-manage" @click.stop="goToSettings">管理</span>
          </div>
        </div>
        <div class="categories-grid">
          <div v-for="(cat, i) in displayCategories" :key="cat.id"
            class="category-cell"
            :style="{
              background: cat.scheme.bg,
              color: cat.scheme.color,
              '--hover-border': cat.scheme.hoverBorder,
            }"
            @click.stop="setFilterMode('category'); filterCategoryId = cat.id">
            <svg class="category-icon-svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path v-if="i === 0" d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
              <template v-else-if="i === 1">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
              </template>
              <template v-else>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </template>
            </svg>
            <div>
              <div class="category-name">{{ cat.name }}</div>
              <div class="category-count">{{ cat.articleCount }} 篇文章</div>
            </div>
          </div>
          <div v-if="displayCategories.length === 0" class="categories-empty"
            @click.stop="showAddCategoryModal = true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #B0BEC5;">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <span>点击创建第一个分类</span>
          </div>
        </div>
      </div>

      <!-- 4. 最近文件 (1col x 1row) -->
      <div class="bento-card card-recent">
        <div class="recent-main" @click="latestArticle && openArticle(latestArticle.id)">
          <div class="recent-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            最近编辑
          </div>
          <template v-if="latestArticle">
            <h3 class="recent-title">{{ latestArticle.title }}</h3>
            <p class="recent-excerpt">{{ getExcerpt(latestArticle) }}</p>
            <div class="recent-footer">
              <span class="recent-status" :class="statusClass(latestArticle.status)">
                {{ getStatusLabel(latestArticle.status) }}
              </span>
              <div class="recent-open-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          </template>
          <p v-else class="recent-empty">暂无文章</p>
        </div>
        <div class="recent-create-actions">
          <button class="recent-action-btn" @click.stop="startNewProject">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            空白草稿
          </button>
          <button class="recent-action-btn" @click.stop="startNewProject">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            从模板创建
          </button>
        </div>
      </div>

      <!-- 5. 灵感卡片 (1col x 1row) -->
      <div class="bento-card card-inspiration">
        <div class="inspiration-top">
          <div class="inspiration-header">
            <svg class="inspiration-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span class="inspiration-label">每日灵感</span>
          </div>
          <!-- AI 可用：刷新按钮 -->
          <button
            v-if="aiStore.isAvailable"
            class="inspiration-refresh"
            :class="{ spinning: aiInspirationLoading }"
            :disabled="aiInspirationLoading"
            @click.stop="generateAIInspiration"
            title="AI 生成新灵感">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <!-- AI 未配置：引导去设置 -->
          <button
            v-else
            class="inspiration-setup"
            @click.stop="goToSettings"
            title="配置 AI 后可生成灵感">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
        <div class="inspiration-body">
          <p v-if="aiInspirationLoading" class="inspiration-loading">AI 正在为你创作灵感...</p>
          <template v-else>
            <p class="inspiration-quote">"{{ displayQuote.text }}"</p>
            <p class="inspiration-author">-- {{ displayQuote.author }}</p>
          </template>
        </div>
        <div class="inspiration-source" :class="aiInspiration ? 'source-ai' : 'source-local'">
          {{ aiInspiration ? 'AI 创作' : '本地名言' }}
        </div>
      </div>

    </div>

    <!-- 滚动引导指示器 -->
    <div v-if="articles.length > 0" class="scroll-indicator">
      <span class="scroll-text">下滑查看全部文章</span>
      <svg class="scroll-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- 筛选栏                                                  -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button class="filter-tab" :class="{ active: filterMode === 'all' }" @click="setFilterMode('all')">全部</button>
        <button class="filter-tab" :class="{ active: filterMode === 'week' }" @click="setFilterMode('week')">本周</button>
        <div class="filter-category-wrapper">
          <button class="filter-tab" :class="{ active: filterMode === 'category' }" @click="setFilterMode('category')">
            分类
          </button>
          <div v-if="filterMode === 'category'" class="category-dropdown">
            <div v-for="cat in categoryStore.categories" :key="cat.id"
              class="category-option" :class="{ selected: filterCategoryId === cat.id }"
              @click="filterCategoryId = cat.id">
              {{ cat.name }}
            </div>
            <div v-if="categoryStore.categories.length === 0" class="category-option disabled">暂无分类</div>
          </div>
        </div>
      </div>
      <div class="filter-right">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input v-model="searchQuery" type="text" placeholder="搜索文章..." class="search-input" />
        </div>
        <select v-model="sortMode" class="sort-select">
          <option value="recent">最近更新</option>
          <option value="title">按标题</option>
          <option value="wordcount">按字数</option>
        </select>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- 瀑布流文章区                                             -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <div v-if="displayArticles.length > 0" class="waterfall-grid">
      <div v-for="(article, index) in displayArticles" :key="article.id"
        class="article-card" :style="{ '--i': index }" @click="openArticle(article.id)">
        <div class="card-accent" :style="{ background: getCategoryColor(article.categoryId) }"></div>
        <div class="card-tags">
          <span v-if="article.sourceName" class="source-tag">{{ article.sourceName }}</span>
          <span class="status-tag" :class="statusClass(article.status)">
            {{ getStatusLabel(article.status) }}
          </span>
        </div>
        <h3 class="card-title">{{ article.title }}</h3>
        <p class="card-excerpt">{{ getExcerpt(article) }}</p>
        <div class="card-meta">
          <span v-if="getCategoryName(article.categoryId)" class="meta-category">{{ getCategoryName(article.categoryId) }}</span>
          <span class="meta-words">{{ (article.rawContent?.length || 0).toLocaleString() }} 字</span>
          <span class="meta-time">{{ formatRelativeTime(article.updatedAt || article.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <template v-if="articles.length === 0">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #90A4AE;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <h3>开始你的第一篇创作</h3>
        <p>点击右下角按钮或使用 Ctrl+N 开始创作之旅</p>
        <button class="empty-create-btn" @click="startNewProject">新建文章</button>
      </template>
      <template v-else>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: #90A4AE;">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <h3>没有找到匹配的文章</h3>
        <p>试试调整筛选条件或搜索关键词</p>
        <button class="empty-create-btn" @click="setFilterMode('all'); searchQuery = ''">清除筛选</button>
      </template>
    </div>

    <!-- QuickActionFab 右下角浮动按钮 -->
    <button class="quick-action-fab" @click="startNewProject" title="新建文章 (Ctrl+N)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>

    <!-- 分类创建 Modal -->
    <AddCategoryModal
      :visible="showAddCategoryModal"
      @close="showAddCategoryModal = false"
      @confirm="handleAddCategory"
    />
  </div>
</template>

<style scoped>
/* =================================================================
   HubView v6 -- Bento Grid + Waterfall
   设计语言：构成主义红 #D32F2F + 宣纸色 #FAFBFC
================================================================= */

/* --- 页面容器 --- */
.hub-page {
  min-height: 100vh;
  background: var(--bg-rice-paper, #FAFBFC);
  padding: 32px;
  color: #263238;
  overflow-y: auto;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.015'/%3E%3C/svg%3E");
}

/* === 加载状态 === */
.page-loading {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg-rice-paper, #FAFBFC);
  z-index: 100;
  animation: fadeOut 0.3s ease 0.1s forwards;
  animation-play-state: paused;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #ECEFF1;
  border-top-color: #D32F2F;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 13px;
  font-weight: 500;
  color: #90A4AE;
  letter-spacing: 0.3px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* === HEADER === */
.hub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto 32px;
  padding: 0 8px;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 36px;
  height: 36px;
  background: #D32F2F;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: -0.5px;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
  flex-shrink: 0;
}

.brand-text h1 {
  font-size: 20px;
  font-weight: 700;
  color: #263238;
  letter-spacing: -0.3px;
  margin: 0;
  line-height: 1.3;
}

.version-tag {
  font-size: 11px;
  font-weight: 500;
  color: #90A4AE;
  background: #F5F5F5;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  vertical-align: middle;
}

.welcome-text {
  font-size: 12px;
  color: #90A4AE;
  margin: 2px 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sync-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid #ECEFF1;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #607D8B;
}

.sync-dot {
  position: relative;
  width: 8px;
  height: 8px;
}

.sync-dot::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #2E7D32;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.sync-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #2E7D32;
  border-radius: 50%;
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid #ECEFF1;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  color: #607D8B;
}

.icon-btn:hover {
  background: #FFFFFF;
  border-color: #D32F2F;
  color: #D32F2F;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
}

.header-new-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #D32F2F;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
}

.header-new-btn:hover {
  background: #B71C1C;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(211, 47, 47, 0.4);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 2px solid #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* =================================================================
   BENTO GRID -- 4col x 3row
================================================================= */
.bento-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 1fr 1fr 0.8fr;
  grid-template-areas:
    "hero hero stats recent"
    "hero hero stats inspiration"
    "categories categories categories categories";
  gap: 20px;
  height: calc(100vh - 140px);
  max-width: 1400px;
  margin: 0 auto 48px;
}

/* === 滚动引导指示器 === */
.scroll-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 1400px;
  margin: -24px auto 24px;
  padding: 8px 0;
  animation: floatBounce 2s ease-in-out infinite;
}

.scroll-text {
  font-size: 11px;
  font-weight: 500;
  color: #B0BEC5;
  letter-spacing: 0.5px;
}

.scroll-arrow {
  color: #B0BEC5;
}

@keyframes floatBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(4px); }
}

.bento-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #ECEFF1;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

/* Hero 卡片需要 overflow visible 以支持日文章展开 */
.card-hero {
  overflow: visible;
}

/* 通用 hover 效果（Hero/Inspiration 除外） */
.bento-card:not(.card-hero):not(.card-inspiration):hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border-color: rgba(211, 47, 47, 0.2);
}

.bento-card:nth-child(1) { animation-delay: 0.05s; }
.bento-card:nth-child(2) { animation-delay: 0.10s; }
.bento-card:nth-child(3) { animation-delay: 0.15s; }
.bento-card:nth-child(4) { animation-delay: 0.20s; }
.bento-card:nth-child(5) { animation-delay: 0.25s; }

/* === 1. HERO CARD (创作流) === */
.card-hero {
  grid-area: hero;
  background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%);
  border: none;
  color: white;
  display: flex;
  flex-direction: column;
}

.hero-decor {
  position: absolute;
  top: -60%;
  right: -25%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
  border-radius: 50%;
}

.hero-activity-icon {
  position: absolute;
  top: 24px;
  right: 24px;
  opacity: 0.15;
  pointer-events: none;
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hero-text {
  margin-bottom: 20px;
}

.hero-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 6px;
  line-height: 1.3;
}

.hero-subtitle {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

.chart-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  flex: 1;
  min-height: 80px;
  padding-top: 8px;
}

.chart-bar {
  flex: 1;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px 6px 0 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  position: relative;
  min-height: 8%;
}

.chart-bar:hover {
  background: rgba(255, 255, 255, 0.95);
}

.chart-bar.active {
  background: white;
  box-shadow: 0 -4px 20px rgba(255, 255, 255, 0.4);
}

.chart-bar.selected {
  background: rgba(255, 255, 255, 0.95);
  transform: scaleX(1.15);
  box-shadow: 0 -4px 16px rgba(255, 255, 255, 0.5);
}

.chart-bar .tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  background: #263238;
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.chart-bar:hover .tooltip {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

/* Day articles expand */
.day-articles {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 1;
}

.day-articles-empty-text {
  display: block;
  text-align: center;
  font-size: 12px;
  opacity: 0.6;
  padding: 8px 0;
}

.day-article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
  gap: 8px;
}

.day-article-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.day-article-title {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.day-article-status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.day-article-status.status-done {
  background: rgba(46, 125, 50, 0.3);
  color: #C8E6C9;
}

.day-article-status.status-read {
  background: rgba(21, 101, 192, 0.3);
  color: #BBDEFB;
}

.day-article-status.status-draft {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 200px;
  opacity: 1;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
}

/* === 2. STATS CARD === */
.card-stats {
  grid-area: stats;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  gap: 0;
}

.stat-item {
  text-align: center;
  padding: 12px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.stat-icon-red {
  background: #FFEBEE;
  color: #D32F2F;
}

.stat-icon-blue {
  background: #E3F2FD;
  color: #1565C0;
}

.stat-icon-green {
  background: #E8F5E9;
  color: #2E7D32;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #263238;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #90A4AE;
  margin-top: 4px;
}

.stat-divider {
  width: 60%;
  height: 1px;
  background: #ECEFF1;
}

/* === 3. RECENT FILE CARD === */
.card-recent {
  grid-area: recent;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.recent-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.recent-create-actions {
  display: flex;
  gap: 8px;
  padding-top: 10px;
  margin-top: auto;
  border-top: 1px solid #ECEFF1;
}

.recent-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  background: transparent;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #607D8B;
  cursor: pointer;
  transition: all 0.15s ease;
}

.recent-action-btn:hover {
  border-color: #D32F2F;
  color: #D32F2F;
  background: #FFEBEE;
}

.recent-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #90A4AE;
  margin-bottom: 8px;
}

.recent-title {
  font-size: 14px;
  font-weight: 700;
  color: #263238;
  margin: 0 0 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recent-excerpt {
  font-size: 12px;
  color: #607D8B;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.recent-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 10px;
}

.recent-status {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.recent-status.status-done {
  background: #E8F5E9;
  color: #2E7D32;
}

.recent-status.status-read {
  background: #E3F2FD;
  color: #1565C0;
}

.recent-status.status-draft {
  background: #FFF8E1;
  color: #F57C00;
}

.recent-open-btn {
  width: 36px;
  height: 36px;
  background: #263238;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.recent-main:hover .recent-open-btn {
  transform: scale(1.1);
  background: #D32F2F;
}

.recent-empty {
  font-size: 13px;
  color: #90A4AE;
  margin: auto 0;
  text-align: center;
}

/* === 4. CATEGORIES CARD === */
.card-categories {
  grid-area: categories;
  display: flex;
  flex-direction: column;
}

.categories-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.categories-title {
  font-size: 14px;
  font-weight: 700;
  color: #263238;
  margin: 0;
}

.categories-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.categories-add {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #2E7D32;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.categories-add:hover {
  opacity: 0.7;
}

.categories-manage {
  font-size: 12px;
  font-weight: 500;
  color: #D32F2F;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.categories-manage:hover {
  opacity: 0.7;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  flex: 1;
}

.category-cell {
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid transparent;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.category-cell:hover {
  border-color: var(--hover-border);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.category-icon-svg {
  flex-shrink: 0;
  margin-bottom: 4px;
}

.category-name {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.category-count {
  font-size: 11px;
  opacity: 0.7;
}

.categories-empty {
  grid-column: span 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #90A4AE;
  cursor: pointer;
  border: 2px dashed #ECEFF1;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.categories-empty:hover {
  border-color: #B0BEC5;
  color: #607D8B;
}

/* === 5. INSPIRATION CARD (极简左边框风格) === */
.card-inspiration {
  grid-area: inspiration;
  background: #FFFFFF;
  border: 1px solid #ECEFF1;
  border-left: 3px solid #D32F2F;
  border-radius: 20px;
  backdrop-filter: none;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.inspiration-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.inspiration-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.inspiration-icon {
  color: #D32F2F;
}

.inspiration-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #90A4AE;
}

.inspiration-refresh {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #F5F5F5;
  border: none;
  color: #90A4AE;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.inspiration-refresh:hover:not(:disabled) {
  background: #FFEBEE;
  color: #D32F2F;
}

.inspiration-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.inspiration-refresh.spinning svg {
  animation: spin 1s linear infinite;
}

.inspiration-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.inspiration-quote {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  font-style: normal;
  color: #1e293b;
  line-height: 1.6;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.inspiration-author {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  text-align: right;
}

.inspiration-source {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  transition: all 0.3s ease;
}

.inspiration-source.source-ai {
  color: #D32F2F;
  background: #FFEBEE;
}

.inspiration-source.source-local {
  color: #78909C;
  background: #F5F5F5;
}

.inspiration-setup {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #F5F5F5;
  border: 1px dashed #ECEFF1;
  color: #90A4AE;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.inspiration-setup:hover {
  background: #FFEBEE;
  border-color: #D32F2F;
  color: #D32F2F;
}

.inspiration-loading {
  font-size: 13px;
  color: #90A4AE;
  margin: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* =================================================================
   FILTER BAR
================================================================= */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto 20px;
  padding: 12px 4px;
  gap: 16px;
  position: sticky;
  top: -1px;
  z-index: 10;
  background: var(--bg-rice-paper, #FAFBFC);
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* 滚动到 sticky 状态时显示底边线 */
.filter-bar:not([style]) {
  border-bottom-color: #ECEFF1;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  align-items: center;
}

.filter-tab {
  padding: 6px 14px;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 500;
  color: #607D8B;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-tab:hover {
  border-color: #D32F2F;
  color: #D32F2F;
}

.filter-tab.active {
  background: #D32F2F;
  color: white;
  border-color: #D32F2F;
}

.filter-category-wrapper {
  position: relative;
}

.category-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 140px;
  background: white;
  border: 1px solid #ECEFF1;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  z-index: 20;
  animation: fadeInUp 0.2s ease;
}

.category-option {
  padding: 8px 12px;
  font-size: 12px;
  color: #37474F;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.1s ease;
}

.category-option:hover {
  background: #FFEBEE;
  color: #D32F2F;
}

.category-option.selected {
  background: #FFEBEE;
  color: #D32F2F;
  font-weight: 600;
}

.category-option.disabled {
  color: #90A4AE;
  cursor: default;
}

.category-option.disabled:hover {
  background: transparent;
  color: #90A4AE;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  color: #90A4AE;
  transition: border-color 0.15s ease;
}

.search-box:focus-within {
  border-color: #D32F2F;
}

.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: #263238;
  width: 140px;
}

.search-input::placeholder {
  color: #B0BEC5;
}

.sort-select {
  padding: 6px 10px;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  color: #607D8B;
  cursor: pointer;
  outline: none;
  appearance: auto;
}

.sort-select:focus {
  border-color: #D32F2F;
}

/* =================================================================
   WATERFALL GRID
================================================================= */
.waterfall-grid {
  columns: 3 280px;
  column-gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.article-card {
  break-inside: avoid;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #ECEFF1;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(min(var(--i), 10) * 50ms);
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border-color: rgba(211, 47, 47, 0.2);
}

.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 16px 16px 0 0;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.source-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: #F5F5F5;
  color: #607D8B;
}

.status-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.status-tag.status-draft {
  background: #FFF8E1;
  color: #F57C00;
}

.status-tag.status-read {
  background: #E3F2FD;
  color: #1565C0;
}

.status-tag.status-done {
  background: #E8F5E9;
  color: #2E7D32;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #263238;
  margin: 0 0 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-excerpt {
  font-size: 13px;
  color: #607D8B;
  line-height: 1.6;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: #90A4AE;
}

.meta-category {
  font-weight: 600;
  color: #607D8B;
}

.meta-words {
  color: #90A4AE;
}

.meta-time {
  color: #B0BEC5;
}

/* =================================================================
   QUICK ACTION FAB
================================================================= */
.quick-action-fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  background: #D32F2F;
  color: white;
  border: none;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(211, 47, 47, 0.4), 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 50;
}

.quick-action-fab:hover {
  transform: scale(1.1);
  background: #B71C1C;
  box-shadow: 0 6px 24px rgba(211, 47, 47, 0.5), 0 3px 12px rgba(0, 0, 0, 0.15);
}

.quick-action-fab:active {
  transform: scale(0.95);
}

/* =================================================================
   EMPTY STATE
================================================================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  max-width: 1400px;
  margin: 80px auto 0;
  text-align: center;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 700;
  color: #37474F;
  margin: 0;
}

.empty-state p {
  font-size: 13px;
  color: #90A4AE;
  margin: 0;
}

.empty-create-btn {
  margin-top: 8px;
  padding: 10px 24px;
  background: #D32F2F;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.empty-create-btn:hover {
  background: #B71C1C;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(211, 47, 47, 0.3);
}

/* =================================================================
   ANIMATIONS
================================================================= */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.8);
    opacity: 0;
  }
}

/* =================================================================
   REDUCED MOTION
================================================================= */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* =================================================================
   RESPONSIVE
================================================================= */

/* >1400px: 4 columns waterfall */
@media (min-width: 1401px) {
  .waterfall-grid {
    columns: 4 280px;
  }
}

/* 1200-1400px: 3 columns (default) */

/* 800-1200px: bento 2col, waterfall 2col */
@media (max-width: 1200px) {
  .bento-container {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto;
    grid-template-areas:
      "hero hero"
      "stats recent"
      "inspiration inspiration"
      "categories categories";
    height: auto;
  }

  .card-hero {
    min-height: 280px;
  }

  .card-stats {
    flex-direction: row;
    justify-content: space-around;
  }

  .stat-divider {
    width: 1px;
    height: 40px;
  }

  .categories-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .waterfall-grid {
    columns: 2 280px;
  }
}

/* <800px: all 1 column */
@media (max-width: 800px) {
  .hub-page {
    padding: 16px;
  }

  .hub-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .bento-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    grid-template-areas:
      "hero"
      "stats"
      "recent"
      "inspiration"
      "categories";
    height: auto;
    gap: 16px;
  }

  .card-hero {
    min-height: 260px;
  }

  .card-stats {
    flex-direction: row;
    justify-content: space-around;
    padding: 20px;
  }

  .stat-divider {
    width: 1px;
    height: 40px;
  }

  .categories-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .waterfall-grid {
    columns: 1;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .filter-tabs {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .filter-right {
    width: 100%;
  }

  .search-input {
    width: 100%;
    flex: 1;
  }

  .search-box {
    flex: 1;
  }

  .bento-card {
    padding: 20px;
  }

  .quick-action-fab {
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 14px;
  }
}
</style>
