<script setup lang="ts">
/**
 * HubView - InkForge 首页
 * 双区域设计：首屏 4x3 Bento Grid Dashboard + 下滑瀑布流文章区
 *
 * v6: 重构为 Bento Grid + Waterfall 布局
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  ArrowRight,
  FileText,
  FolderPlus,
  Layers,
  LayoutTemplate,
  Plus,
  Search,
  Target,
} from 'lucide-vue-next'
import { useArticleStore, type FileImportResult } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'
import { useAIStore } from '@/stores/ai'
import { useAssetStore } from '@/stores/asset'
import { useSettingsStore } from '@/stores/settings'
import { useAccountStore } from '@/stores/account'
import { useFTUEStore } from '@/stores/ftue'
import { ARTICLE_STATUS } from '@/constants'
import {
  getArticleStatusClass,
  getArticleStatusLabel,
  getLifecycleContinuationPriority,
  isCompletedStatus,
  isDraftLikeStatus,
  isUnfinishedStatus,
} from '@/core/lifecycle'
import { computeContentWordCount, computeWritingWindowStats, extractContentPreviewText } from '@/composables/useTextStats'
import { getDailyQuote, formatNumber } from '@/data/quotes'
import type { Article } from '@/types'
import AddCategoryModal from '@/components/category/AddCategoryModal.vue'
import ForgeNibMark from '@/components/chrome/ForgeNibMark.vue'
import TemplatePicker from '@/components/template/TemplatePicker.vue'
import DataInsightsSection from '@/components/hub/insights/DataInsightsSection.vue'
import UserAvatarPopover from '@/components/hub/UserAvatarPopover.vue'
import WritingFlowDayPopup from '@/components/hub/WritingFlowDayPopup.vue'
import SectionDots from '@/components/hub/SectionDots.vue'
import TemplateMarketGrid from '@/components/hub/TemplateMarketGrid.vue'
import { useScrollSnap } from '@/composables/useScrollSnap'
import { extractCover, type CoverInfo } from '@/utils/extractCover'
import type { ArticleTemplate } from '@/data/templates'
import { generateId } from '@/utils/uuid'
import { renderTemplateVariables } from '@/services/template'

const router = useRouter()
const articleStore = useArticleStore()
const categoryStore = useCategoryStore()
const aiStore = useAIStore()
const assetStore = useAssetStore()
const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
const ftueStore = useFTUEStore()

const { articles } = storeToRefs(articleStore)

const hubPageRef = ref<HTMLElement | null>(null)
const regionFlowRef = ref<HTMLElement | null>(null)
const regionTemplatesRef = ref<HTMLElement | null>(null)
const regionInsightsRef = ref<HTMLElement | null>(null)
const regionArticlesRef = ref<HTMLElement | null>(null)
const regionRefs = computed<Array<HTMLElement | null>>(() => [
  regionFlowRef.value,
  regionTemplatesRef.value,
  regionInsightsRef.value,
  regionArticlesRef.value,
])
const hubSections = [
  { id: 'flow', label: '创作流' },
  { id: 'templates', label: '模板' },
  { id: 'insights', label: '洞察' },
  { id: 'articles', label: '文章' },
]
const { activeIndex: activeRegionIndex, scrollToIndex: scrollToRegion } = useScrollSnap({
  containerRef: hubPageRef,
  regionRefs,
})

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
const articleWordCounts = computed(() => new Map(
  articles.value.map((article: Article) => [article.id, computeContentWordCount(article.rawContent ?? '')])
))

function getArticleWordCount(article: Article): number {
  return articleWordCounts.value.get(article.id) ?? 0
}

function isDraftLikeArticle(article: Article): boolean {
  return isDraftLikeStatus(article.status)
}

function isUnfinishedArticle(article: Article): boolean {
  return isUnfinishedStatus(article.status)
}

function compareArticlesByContinuationPriority(a: Article, b: Article): number {
  const priorityDiff = getLifecycleContinuationPriority(a.status) - getLifecycleContinuationPriority(b.status)
  if (priorityDiff !== 0) {
    return priorityDiff
  }

  return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
}

const stats = computed(() => {
  const total = articles.value.length

  const totalWords = articles.value.reduce((sum: number, a: Article) => {
    return sum + getArticleWordCount(a)
  }, 0)

  const processed = articles.value.filter((a: Article) => isCompletedStatus(a.status)).length
  const draftCount = articles.value.filter((article: Article) => isDraftLikeArticle(article)).length
  const completionRateNum = total === 0 ? 0 : Math.round(processed / total * 100)

  const assetCount = assetStore.assets.length
  const streak = calculateStreak()

  return {
    totalArticles: total,
    totalWords: formatNumber(totalWords),
    completionRate: completionRateNum + '%',
    completionRateNum,
    processedArticles: processed,
    draftCount,
    assetCount,
    streak,
  }
})

function toGoalPercent(current: number, target: number | undefined): number | null {
  if (!target || target < 1) {
    return null
  }

  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

const writingWindowStats = computed(() => computeWritingWindowStats(articles.value))

const workflowProgress = computed(() => {
  const goal = settingsStore.settings.writingGoal

  if (goal.dailyTarget) {
    const percent = toGoalPercent(writingWindowStats.value.todayWords, goal.dailyTarget) ?? 0
    return {
      label: '今日写作目标',
      percent,
      summary: `今日已累计 ${formatNumber(writingWindowStats.value.todayWords)} / ${formatNumber(goal.dailyTarget)} 字，本周累计 ${formatNumber(writingWindowStats.value.weeklyWords)} 字。`,
      actionLabel: '调整目标',
    }
  }

  if (goal.weeklyTarget) {
    const percent = toGoalPercent(writingWindowStats.value.weeklyWords, goal.weeklyTarget) ?? 0
    return {
      label: '本周写作目标',
      percent,
      summary: `本周已累计 ${formatNumber(writingWindowStats.value.weeklyWords)} / ${formatNumber(goal.weeklyTarget)} 字，今日产出 ${formatNumber(writingWindowStats.value.todayWords)} 字。`,
      actionLabel: '调整目标',
    }
  }

  if (stats.value.totalArticles === 0) {
    return {
      label: '文章整理进度',
      percent: 0,
      summary: '先创建第一篇文章，完成率、本周产出与整理节奏会在这里自动累计。',
      actionLabel: '设置目标',
    }
  }

  return {
    label: '文章整理进度',
    percent: Math.max(0, Math.min(100, stats.value.completionRateNum)),
    summary: `已完成 ${stats.value.processedArticles}/${stats.value.totalArticles} 篇，本周产出 ${weeklyTotal.value} 篇，连续创作 ${stats.value.streak} 天。`,
    actionLabel: '设置目标',
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
const showTemplatePicker = ref(false)
const showQuickActionMenu = ref(false)
const importInProgress = ref(false)
const latestImportResult = ref<FileImportResult | null>(null)
const latestImportTotal = computed(() => {
  const result = latestImportResult.value
  return result ? result.success + result.failed + result.skippedOversize : 0
})
const latestImportErrorsPreview = computed(() => latestImportResult.value?.errors.slice(0, 3) ?? [])
const latestImportRemainingErrorCount = computed(() => {
  const result = latestImportResult.value
  return result ? Math.max(result.errors.length - latestImportErrorsPreview.value.length, 0) : 0
})
const latestImportHasMoreErrors = computed(() => latestImportRemainingErrorCount.value > 0)
const latestImportStatusLabel = computed(() => {
  const result = latestImportResult.value
  if (!result) return ''
  if (result.success > 0 && result.failed === 0 && result.skippedOversize === 0) return '导入完成'
  if (result.success > 0) return '部分导入完成'
  if (latestImportTotal.value === 0) return '未写入文档'
  return '导入未完成'
})
const quickActionRef = ref<HTMLElement | null>(null)
const headerQuickActionTriggerRef = ref<HTMLButtonElement | null>(null)
// FAB removed; keep ref placeholder null for legacy lookup paths
const fabQuickActionTriggerRef = ref<HTMLButtonElement | null>(null)
const quickActionMenuId = 'hub-quick-action-menu'
const headerQuickActionTriggerId = 'hub-quick-action-header-trigger'
const fabQuickActionTriggerId = 'hub-quick-action-fab-trigger'
const lastQuickActionTrigger = ref<'header' | 'fab'>('header')

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
const selectedDayAnchor = ref<{ left: number; top: number; right: number; bottom: number; width: number; height: number } | null>(null)

// ─── 筛选栏 ───
const filterMode = ref<'all' | 'week' | 'category'>('all')
const filterCategoryId = ref<string | null>(null)
const searchQuery = ref('')
const sortMode = ref<'recent' | 'title' | 'wordcount'>('recent')
const headerSearchInputRef = ref<HTMLInputElement | null>(null)

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

const selectedDayLabel = computed<string>(() => {
  if (selectedDayIndex.value === null) return ''
  return weekDayLabels[selectedDayIndex.value] ?? ''
})

const selectedDateLabel = computed<string>(() => {
  if (selectedDayIndex.value === null) return ''
  const monday = getMondayOfWeek()
  const target = new Date(monday)
  target.setDate(monday.getDate() + selectedDayIndex.value)
  return `${target.getFullYear()} 年 ${target.getMonth() + 1} 月 ${target.getDate()} 日`
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
    case 'wordcount': result.sort((a, b) => getArticleWordCount(b) - getArticleWordCount(a)); break
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

const unfinishedArticles = computed(() => {
  return [...articles.value]
    .filter(article => isUnfinishedArticle(article))
    .sort(compareArticlesByContinuationPriority)
})

const continueWritingArticle = computed(() => unfinishedArticles.value[0] ?? null)

const todoArticlesForCard = computed(() =>
  unfinishedArticles.value
    .filter(article => article.id !== latestArticle.value?.id)
    .slice(0, 4)
)

/** 最近文章列表（跳过第一篇，用于 card-recent 底部） */
const recentArticlesForCard = computed(() => {
  return [...articles.value]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(1, 4)
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

function toggleDaySelection(index: number, event?: MouseEvent): void {
  if (selectedDayIndex.value === index) {
    selectedDayIndex.value = null
    selectedDayAnchor.value = null
    return
  }
  selectedDayIndex.value = index
  if (event && event.currentTarget instanceof HTMLElement) {
    const rect = event.currentTarget.getBoundingClientRect()
    selectedDayAnchor.value = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
  } else {
    selectedDayAnchor.value = null
  }
}

function setFilterMode(mode: 'all' | 'week' | 'category'): void {
  filterMode.value = mode
  if (mode !== 'category') filterCategoryId.value = null
}

function getExcerpt(article: Article): string {
  if (article.description) return article.description
  if (article.rawContent) return extractContentPreviewText(article.rawContent, 120)
  return '暂无内容摘要'
}

function getStatusLabel(status: string): string {
  return getArticleStatusLabel(status)
}

function statusClass(status: string): string {
  return getArticleStatusClass(status)
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
function buildDraftSourceUrl(kind: 'blank' | 'template'): string {
  return `inkforge://${kind}/${generateId()}`
}

function extractTemplateTitle(template: ArticleTemplate): string {
  const headingMatch = template.body.match(/^#\s+(.+)$/m)
  const heading = headingMatch?.[1]?.trim()
  if (heading && !heading.includes('{{')) {
    return heading
  }

  return `${template.name} - 未命名`
}

async function createDraftAndOpen(options: {
  title: string
  body: string
  description?: string
  sourceKind: 'blank' | 'template'
  sourceName: string
}): Promise<void> {
  const article = await articleStore.addArticle({
    title: options.title,
    sourceUrl: buildDraftSourceUrl(options.sourceKind),
    sourceName: options.sourceName,
    rawContent: options.body,
    description: options.description ?? '',
    status: ARTICLE_STATUS.DRAFT,
  })

  articleStore.selectArticle(article.id)
  await router.push({ path: '/workstation', query: { id: article.id } })
}

async function startNewProject(): Promise<void> {
  closeQuickActionMenu()
  await createDraftAndOpen({
    title: '未命名文章',
    body: '',
    description: '',
    sourceKind: 'blank',
    sourceName: 'InkForge 本地新建',
  })
}

async function handleContinueWriting(): Promise<void> {
  if (continueWritingArticle.value) {
    await openArticle(continueWritingArticle.value.id)
    return
  }

  await startNewProject()
}

async function openArticle(articleId: string): Promise<void> {
  await router.push({ path: '/workstation', query: { id: articleId } })
}

async function goToDrafts(): Promise<void> {
  await router.push({ name: 'Drafts' })
}

function getQuickActionItems(): HTMLButtonElement[] {
  return Array.from(
    quickActionRef.value?.querySelectorAll<HTMLButtonElement>('.quick-action-menu .quick-action-item:not(:disabled)') ?? [],
  )
}

function focusQuickActionItem(index: number): void {
  const items = getQuickActionItems()
  if (items.length === 0) {
    return
  }

  const safeIndex = ((index % items.length) + items.length) % items.length
  items[safeIndex]?.focus()
}

function resolveQuickActionTrigger(): HTMLButtonElement | null {
  return lastQuickActionTrigger.value === 'header'
    ? headerQuickActionTriggerRef.value
    : fabQuickActionTriggerRef.value
}

function closeQuickActionMenu(restoreFocus = false): void {
  if (!showQuickActionMenu.value) {
    return
  }

  showQuickActionMenu.value = false

  if (restoreFocus) {
    void nextTick(() => {
      resolveQuickActionTrigger()?.focus()
    })
  }
}

function openQuickActionMenu(source: 'header' | 'fab', focusTarget: 'first' | 'last' = 'first'): void {
  lastQuickActionTrigger.value = source
  showQuickActionMenu.value = true
  void nextTick(() => {
    const items = getQuickActionItems()
    focusQuickActionItem(focusTarget === 'first' ? 0 : items.length - 1)
  })
}

function openTemplatePicker(): void {
  closeQuickActionMenu()
  showTemplatePicker.value = true
}

async function handleTemplateSelect(template: ArticleTemplate): Promise<void> {
  showTemplatePicker.value = false
  const title = extractTemplateTitle(template)
  const renderedTemplate = renderTemplateVariables(template.body, {
    userInputs: { title },
    authorName: accountStore.displayName,
    createdAt: new Date(),
  })

  await createDraftAndOpen({
    title,
    body: renderedTemplate.content,
    description: template.description,
    sourceKind: 'template',
    sourceName: `模板：${template.name}`,
  })
}
async function handleImportDocuments(): Promise<void> {
  if (importInProgress.value) return

  closeQuickActionMenu()
  importInProgress.value = true

  const existingIds = new Set(articles.value.map(article => article.id))

  try {
    const result = await articleStore.importFromFiles()
    latestImportResult.value = result
    if (result.success <= 0) {
      return
    }

    const importedArticle = articles.value.find(article => !existingIds.has(article.id))
    if (importedArticle) {
      articleStore.selectArticle(importedArticle.id)
      await router.push({ path: '/workstation', query: { id: importedArticle.id } })
    }
  } finally {
    importInProgress.value = false
  }
}

function handleQuickActionOutsideClick(event: MouseEvent): void {
  if (!showQuickActionMenu.value) {
    return
  }

  const target = event.target as Node | null
  if (isWithinQuickActionControls(target)) {
    return
  }

  closeQuickActionMenu()
}

function handleQuickActionFocusChange(event: FocusEvent): void {
  if (!showQuickActionMenu.value) {
    return
  }

  const target = event.target as Node | null
  if (isWithinQuickActionControls(target)) {
    return
  }

  closeQuickActionMenu()
}

function isWithinQuickActionControls(target: Node | null): boolean {
  if (!target) {
    return false
  }

  return Boolean(
    quickActionRef.value?.contains(target)
    || headerQuickActionTriggerRef.value?.contains(target)
    || fabQuickActionTriggerRef.value?.contains(target),
  )
}

function getQuickActionTriggerSource(target: EventTarget | null): 'header' | 'fab' | null {
  if (target === headerQuickActionTriggerRef.value) {
    return 'header'
  }

  if (target === fabQuickActionTriggerRef.value) {
    return 'fab'
  }

  return null
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function handleHubKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented) {
    return
  }

  const normalizedKey = event.key.toLowerCase()
  const quickActionTriggerSource = getQuickActionTriggerSource(event.target)

  if (!showQuickActionMenu.value && quickActionTriggerSource) {
    if (normalizedKey === 'arrowdown') {
      event.preventDefault()
      openQuickActionMenu(quickActionTriggerSource, 'first')
      return
    }

    if (normalizedKey === 'arrowup') {
      event.preventDefault()
      openQuickActionMenu(quickActionTriggerSource, 'last')
      return
    }
  }

  if (showQuickActionMenu.value) {
    if (normalizedKey === 'escape') {
      event.preventDefault()
      closeQuickActionMenu(true)
      return
    }

    if (['arrowdown', 'arrowup', 'home', 'end'].includes(normalizedKey)) {
      const items = getQuickActionItems()
      if (items.length > 0) {
        event.preventDefault()

        const currentIndex = items.findIndex(item => item === document.activeElement)

        if (normalizedKey === 'home') {
          focusQuickActionItem(0)
          return
        }

        if (normalizedKey === 'end') {
          focusQuickActionItem(items.length - 1)
          return
        }

        if (normalizedKey === 'arrowdown') {
          focusQuickActionItem(currentIndex < 0 ? 0 : currentIndex + 1)
          return
        }

        focusQuickActionItem(currentIndex < 0 ? items.length - 1 : currentIndex - 1)
        return
      }
    }
  }

  const primaryKey = event.ctrlKey || event.metaKey
  if (!primaryKey) {
    return
  }

  if (isEditableTarget(event.target)) {
    return
  }

  if (normalizedKey === 'f' && !event.shiftKey && !event.altKey) {
    event.preventDefault()
    handleSearchShortcut()
    return
  }

  if (normalizedKey === 'n' && !event.shiftKey && !event.altKey) {
    event.preventDefault()
    void startNewProject()
    return
  }

  if (normalizedKey === 'n' && event.shiftKey && !event.altKey) {
    event.preventDefault()
    openTemplatePicker()
    return
  }

  if (normalizedKey === 'o' && !event.shiftKey && !event.altKey) {
    event.preventDefault()
    void handleImportDocuments()
  }
}

function goToSettings(tab?: string, section?: string): void {
  void router.push({
    path: '/settings',
    query: {
      ...(tab ? { tab } : {}),
      ...(section ? { section } : {}),
    },
  })
}

function goToAccount(): void {
  void router.push('/account')
}

/** 滚动到文章列表区（自动展示搜索结果） */
function scrollToArticlesRegion(): void {
  const region = regionArticlesRef.value ?? document.querySelector('.hub-region-articles') as HTMLElement | null
  region?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Header 搜索快捷键：聚焦 header 输入框；如已聚焦则清空 */
function handleSearchShortcut(): void {
  const input = headerSearchInputRef.value
  if (!input) {
    const fallback = document.querySelector('.filter-bar .search-input') as HTMLInputElement | null
    fallback?.focus()
    return
  }
  if (document.activeElement === input) {
    input.select()
    return
  }
  input.focus()
  input.select()
}

function onHeaderSearchFocus(): void {
  if (searchQuery.value.trim()) {
    scrollToArticlesRegion()
  }
}

function clearHeaderSearch(): void {
  searchQuery.value = ''
  headerSearchInputRef.value?.focus()
}

/** 输入首字符时自动滚到文章区，让用户即时看到过滤结果 */
watch(searchQuery, (next, prev) => {
  const hasNew = !!next.trim()
  const hadPrev = !!prev.trim()
  if (hasNew && !hadPrev) {
    scrollToArticlesRegion()
  }
})

function handleSwitchAccount(): void {
  void router.push({ path: '/account', query: { action: 'switch' } })
}

function handleSignOut(): void {
  void router.push({ path: '/account', query: { action: 'signout' } })
}

const coverCache = new Map<string, CoverInfo>()
const coverImageFailures = ref<Set<string>>(new Set())

function getArticleCover(article: Article): CoverInfo {
  const cacheKey = `${article.id}:${article.updatedAt ?? article.createdAt ?? ''}`
  let info = coverCache.get(cacheKey)
  if (!info) {
    info = extractCover(article)
    coverCache.set(cacheKey, info)
  }
  if (info.kind === 'image' && info.url && coverImageFailures.value.has(info.url)) {
    return { ...info, kind: 'placeholder', url: undefined }
  }
  return info
}

function handleCoverImageError(event: Event): void {
  const img = event.currentTarget as HTMLImageElement | null
  if (!img?.src) return
  if (!coverImageFailures.value.has(img.src)) {
    const next = new Set(coverImageFailures.value)
    next.add(img.src)
    coverImageFailures.value = next
  }
}

onMounted(() => {
  document.addEventListener('click', handleQuickActionOutsideClick)
  document.addEventListener('focusin', handleQuickActionFocusChange)
  document.addEventListener('keydown', handleHubKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleQuickActionOutsideClick)
  document.removeEventListener('focusin', handleQuickActionFocusChange)
  document.removeEventListener('keydown', handleHubKeydown)
})

// ─── 初始化 ───
onMounted(async () => {
  updateDateTime()
  await Promise.all([
    categoryStore.loadCategories(),
    articleStore.loadArticles(),
    assetStore.loadAssets(),
    accountStore.ensureDefaultAccount(),
  ])
  pageLoading.value = false
})
</script>

<template>
  <div
    ref="hubPageRef"
    class="hub-page"
  >
    <!-- 加载状态 -->
    <div
      v-if="pageLoading"
      class="page-loading"
    >
      <div class="loading-spinner" />
      <span class="loading-text">加载中...</span>
    </div>

    <SectionDots
      :sections="hubSections"
      :active-index="activeRegionIndex"
      @navigate="scrollToRegion"
    />

    <!-- HEADER (移入第一屏 region 内部，保证 scroll-snap 第一屏完整可见) -->
    <header class="hub-header hub-header-floating">
      <div class="header-brand">
        <div
          class="logo"
          role="img"
          aria-label="InkForge"
        >
          <ForgeNibMark
            :size="36"
            interactive
          />
        </div>
        <div class="brand-text">
          <h1>InkForge</h1>
          <p class="welcome-text">
            {{ currentDateTime }}
          </p>
        </div>
      </div>

      <div class="header-actions">
        <!-- 全文搜索：真实输入框，与底部筛选条共享 searchQuery -->
        <label
          class="header-search-bar"
          :class="{ 'has-value': !!searchQuery }"
        >
          <Search
            class="header-search-icon"
            :size="14"
            :stroke-width="2.2"
            aria-hidden="true"
          />
          <input
            ref="headerSearchInputRef"
            v-model="searchQuery"
            type="search"
            class="header-search-input"
            placeholder="搜索文章…"
            aria-label="搜索文章"
            spellcheck="false"
            autocomplete="off"
            @focus="onHeaderSearchFocus"
            @keydown.enter.prevent="scrollToArticlesRegion"
            @keydown.escape.prevent="searchQuery = ''"
          >
          <button
            v-if="searchQuery"
            type="button"
            class="header-search-clear"
            aria-label="清空搜索"
            @click="clearHeaderSearch"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
              />
              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
              />
            </svg>
          </button>
          <kbd v-else>Ctrl/Cmd+F</kbd>
        </label>

        <div class="sync-badge">
          <div class="sync-dot" />
          <span>{{ stats.totalArticles }} 篇文章</span>
        </div>

        <button
          type="button"
          class="icon-btn"
          title="帮助中心"
          aria-label="打开帮助中心"
          @click="ftueStore.openHelpCenter('markdown')"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line
              x1="12"
              y1="17"
              x2="12.01"
              y2="17"
            />
          </svg>
        </button>
        <button
          class="icon-btn"
          type="button"
          aria-label="打开设置"
          title="设置"
          @click="goToSettings()"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle
              cx="12"
              cy="12"
              r="3"
            />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <UserAvatarPopover
          :size="40"
          @open-account="goToAccount"
          @open-settings="goToSettings()"
          @switch-account="handleSwitchAccount"
          @sign-out="handleSignOut"
        />
      </div>
    </header>

    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- 第一屏：创作流 + 头像 + 完整可见 + 留白                   -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section
      ref="regionFlowRef"
      class="hub-region hub-region-flow"
      data-region="flow"
      aria-label="创作流"
    >
      <div class="bento-container">
        <!-- 1. Hero 创作流 (2col x 2row) -->
        <div class="bento-card card-hero">
          <div class="hero-decor" />
          <div class="hero-content">
            <div class="hero-header">
              <div class="hero-text">
                <h2 class="hero-title">
                  创作流
                </h2>
                <p class="hero-subtitle">
                  本周产出 {{ weeklyTotal }} 篇
                </p>
              </div>
              <button
                v-if="articles.length > 0"
                type="button"
                class="hero-continue-btn"
                :aria-label="continueWritingArticle ? `继续创作：${continueWritingArticle.title || '未命名文稿'}` : '当前没有未完成文稿，开始新文章'"
                @click.stop="void handleContinueWriting()"
              >
                <FileText
                  :size="16"
                  :stroke-width="2.2"
                />
                <span class="hero-continue-copy">
                  <span class="hero-continue-kicker">
                    {{ continueWritingArticle ? '继续创作' : '开始新文章' }}
                  </span>
                  <strong>{{ continueWritingArticle?.title || '从空白开始新稿' }}</strong>
                </span>
                <ArrowRight
                  :size="14"
                  :stroke-width="2.4"
                />
              </button>
            </div>
            <div class="chart-container">
              <div
                v-for="(count, i) in weeklyChartData"
                :key="i"
                class="chart-bar"
                :class="{ active: i === todayIndex, selected: i === selectedDayIndex }"
                :style="{ height: getBarHeight(count) }"
                @click="(e: MouseEvent) => toggleDaySelection(i, e)"
              >
                <span class="tooltip">{{ weekDayLabels[i] }} · {{ count }} 篇</span>
              </div>
            </div>
            <div class="chart-labels">
              <span
                v-for="label in weekDayLabels"
                :key="label"
              >{{ label }}</span>
            </div>
            <div
              v-if="articles.length === 0"
              class="hero-empty-state"
            >
              <p class="hero-empty-title">
                先写下第一篇，创作流才会真正开始跳动。
              </p>
              <div
                class="hero-empty-actions"
                role="group"
                aria-label="创作流空状态操作"
              >
                <button
                  type="button"
                  class="hero-empty-btn"
                  @click.stop="void startNewProject()"
                >
                  <Plus
                    :size="14"
                    :stroke-width="2.3"
                  />
                  <span>空白开始</span>
                </button>
                <button
                  type="button"
                  class="hero-empty-btn hero-empty-btn-secondary"
                  @click.stop="openTemplatePicker"
                >
                  <LayoutTemplate
                    :size="14"
                    :stroke-width="2.3"
                  />
                  <span>从模板创建</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Stats 累计指标 (1col x 2row) — 编辑式单核心指标 -->
        <div class="bento-card card-stats">
          <div class="stats-head">
            <span class="stats-eyebrow">累计</span>
          </div>
          <div class="stats-hero">
            <div class="stats-primary">
              <strong class="stats-primary-value">{{ stats.totalArticles }}</strong>
              <span class="stats-primary-unit">篇</span>
            </div>
            <p class="stats-primary-note">
              {{ stats.totalArticles === 0 ? '尚未开始第一篇' : '累计创作' }}
            </p>
          </div>
          <div
            v-if="stats.totalArticles > 0"
            class="stats-secondary"
          >
            <div class="stats-row">
              <span class="stats-row-label">字数</span>
              <span class="stats-row-value">{{ stats.totalWords.toLocaleString() }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-row-label">草稿</span>
              <span class="stats-row-value">{{ stats.draftCount }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-row-label">完成率</span>
              <span class="stats-row-value">{{ stats.completionRate }}</span>
            </div>
            <div class="stats-row">
              <span class="stats-row-label">连续</span>
              <span class="stats-row-value">{{ stats.streak }} 天</span>
            </div>
          </div>
        </div>

        <!-- 3. 创作工具卡 (1col x 1row) — Editorial 简化 -->
        <div class="bento-card card-new">
          <div class="new-card-head">
            <span class="new-eyebrow">开始</span>
            <h3 class="new-title">
              新建作品
            </h3>
          </div>
          <p class="new-desc">
            从空白页面、模板或本地文件起稿
          </p>
          <div
            class="new-actions"
            role="group"
            aria-label="创作工具操作"
          >
            <button
              type="button"
              class="new-action-btn"
              @click.stop="openTemplatePicker"
            >
              <LayoutTemplate
                :size="14"
                :stroke-width="2.2"
              />
              <span>模板创建</span>
            </button>
            <button
              type="button"
              class="new-action-btn new-action-btn-secondary"
              :disabled="importInProgress"
              @click.stop="void handleImportDocuments()"
            >
              <FolderPlus
                :size="14"
                :stroke-width="2.2"
              />
              <span>{{ importInProgress ? '导入中...' : '导入文档' }}</span>
            </button>
          </div>
          <div
            v-if="latestImportResult"
            class="import-result-panel"
            role="status"
            aria-live="polite"
          >
            <div class="import-result-head">
              <span class="import-result-kicker">最近导入</span>
              <strong>{{ latestImportStatusLabel }}</strong>
            </div>
            <div
              class="import-result-stats"
              aria-label="最近导入统计"
            >
              <span><strong>{{ latestImportResult.success }}</strong>成功</span>
              <span><strong>{{ latestImportResult.failed }}</strong>失败</span>
              <span><strong>{{ latestImportResult.skippedOversize }}</strong>超限跳过</span>
            </div>
            <p
              v-if="latestImportTotal === 0"
              class="import-result-note"
            >
              未选择文件，本次没有写入文档。
            </p>
            <ul
              v-else-if="latestImportErrorsPreview.length > 0"
              class="import-result-errors"
              aria-label="导入错误详情"
            >
              <li
                v-for="(error, index) in latestImportErrorsPreview"
                :key="error + '-' + index"
              >
                {{ error }}
              </li>
              <li v-if="latestImportHasMoreErrors">
                还有 {{ latestImportRemainingErrorCount }} 条错误，请重新检查源文件。
              </li>
            </ul>
          </div>
        </div>

        <!-- 4. 分类卡片 (2col x 1row) — 原型顺序：Categories 在 Recent 之前 -->
        <div class="bento-card card-categories">
          <div class="categories-header">
            <h3 class="categories-title">
              我的分类
            </h3>
            <div class="categories-actions">
              <span
                class="categories-add"
                @click.stop="showAddCategoryModal = true"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line
                    x1="12"
                    y1="5"
                    x2="12"
                    y2="19"
                  /><line
                    x1="5"
                    y1="12"
                    x2="19"
                    y2="12"
                  />
                </svg>
                添加
              </span>
              <span
                class="categories-manage"
                @click.stop="goToSettings()"
              >管理</span>
            </div>
          </div>
          <div class="categories-grid">
            <div
              v-for="(cat, i) in displayCategories"
              :key="cat.id"
              class="category-cell"
              :style="{
                background: cat.scheme.bg,
                color: cat.scheme.color,
                '--hover-border': cat.scheme.hoverBorder,
              }"
              @click.stop="setFilterMode('category'); filterCategoryId = cat.id"
            >
              <svg
                class="category-icon-svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  v-if="i === 0"
                  d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
                />
                <template v-else-if="i === 1">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line
                    x1="6"
                    y1="1"
                    x2="6"
                    y2="4"
                  /><line
                    x1="10"
                    y1="1"
                    x2="10"
                    y2="4"
                  /><line
                    x1="14"
                    y1="1"
                    x2="14"
                    y2="4"
                  />
                </template>
                <template v-else>
                  <rect
                    x="2"
                    y="7"
                    width="20"
                    height="14"
                    rx="2"
                    ry="2"
                  /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </template>
              </svg>
              <div>
                <div class="category-name">
                  {{ cat.name }}
                </div>
                <div class="category-count">
                  {{ cat.articleCount }} 篇文章
                </div>
              </div>
            </div>
            <div
              v-if="displayCategories.length === 0"
              class="categories-empty"
              @click.stop="showAddCategoryModal = true"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="color: #B0BEC5;"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line
                  x1="12"
                  y1="11"
                  x2="12"
                  y2="17"
                /><line
                  x1="9"
                  y1="14"
                  x2="15"
                  y2="14"
                />
              </svg>
              <span>点击创建第一个分类</span>
            </div>
          </div>
        </div>

        <!-- 5. 最近文件 (1col x 1row) -->
        <div class="bento-card card-recent">
          <button
            type="button"
            class="recent-main"
            :disabled="!latestArticle"
            :aria-label="latestArticle ? `打开最近文章：${latestArticle.title || '未命名文稿'}` : '暂无最近文章'"
            @click="latestArticle && openArticle(latestArticle.id)"
          >
            <div class="recent-label">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                /><polyline points="12 6 12 12 16 14" />
              </svg>
              最近编辑
            </div>
            <template v-if="latestArticle">
              <h3 class="recent-title">
                {{ latestArticle.title }}
              </h3>
              <p class="recent-excerpt">
                {{ getExcerpt(latestArticle) }}
              </p>
              <div class="recent-footer">
                <span
                  class="recent-status"
                  :class="statusClass(latestArticle.status)"
                >
                  {{ getStatusLabel(latestArticle.status) }}
                </span>
                <div class="recent-open-btn">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line
                      x1="5"
                      y1="12"
                      x2="19"
                      y2="12"
                    />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>
            </template>
            <p
              v-else
              class="recent-empty"
            >
              暂无文章
            </p>
          </button>
          <!-- 最近编辑文章列表 -->
          <div
            v-if="articles.length > 1"
            class="recent-articles-list"
          >
            <p class="recent-articles-heading">
              Recent
            </p>
            <div class="recent-articles-items">
              <button
                v-for="article in recentArticlesForCard"
                :key="article.id"
                type="button"
                class="recent-article-row"
                @click.stop="openArticle(article.id)"
              >
                <span class="recent-article-row-title">{{ article.title || '未命名文稿' }}</span>
              </button>
            </div>
          </div>
          <div
            v-if="todoArticlesForCard.length > 0"
            class="recent-todo-list"
          >
            <div class="recent-todo-head">
              <p class="recent-articles-heading">
                未完成
              </p>
              <span class="recent-todo-count">{{ todoArticlesForCard.length }} / {{ unfinishedArticles.length }}</span>
            </div>
            <div class="recent-articles-items">
              <button
                v-for="article in todoArticlesForCard"
                :key="`todo-${article.id}`"
                type="button"
                class="recent-article-row recent-article-row-todo"
                @click.stop="openArticle(article.id)"
              >
                <span class="recent-article-row-title">{{ article.title || '未命名文稿' }}</span>
                <span class="recent-article-row-meta">
                  {{ getStatusLabel(article.status) }} · {{ formatRelativeTime(article.updatedAt || article.createdAt) }}
                </span>
              </button>
            </div>
          </div>
          <div
            class="recent-create-actions"
            role="group"
            aria-label="快速创建"
          >
            <button
              type="button"
              class="recent-create-btn"
              @click.stop="void startNewProject()"
            >
              <Plus
                :size="14"
                :stroke-width="2.2"
              />
              <span>空白草稿</span>
            </button>
            <button
              type="button"
              class="recent-create-btn recent-create-btn-template"
              @click.stop="openTemplatePicker"
            >
              <LayoutTemplate
                :size="14"
                :stroke-width="2.2"
              />
              <span>从模板创建</span>
            </button>
          </div>
        </div>

        <!-- 6. 灵感卡片 (1col x 1row) -->
        <div class="bento-card card-inspiration">
          <div class="inspiration-texture" />
          <div class="inspiration-content">
            <div class="inspiration-top">
              <div class="inspiration-header">
                <svg
                  class="inspiration-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span class="inspiration-label">每日灵感</span>
              </div>
              <!-- AI 可用：刷新按钮 -->
              <button
                v-if="aiStore.isAvailable"
                class="inspiration-refresh"
                type="button"
                aria-label="AI 生成新灵感"
                :class="{ spinning: aiInspirationLoading }"
                :disabled="aiInspirationLoading"
                title="AI 生成新灵感"
                @click.stop="generateAIInspiration"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <!-- AI 未配置：引导去设置 -->
              <button
                v-else
                class="inspiration-setup"
                type="button"
                aria-label="前往设置配置 AI 灵感"
                title="配置 AI 后可生成灵感"
                @click.stop="goToSettings()"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                  />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
            <div class="inspiration-body">
              <div
                v-if="aiInspirationLoading"
                class="inspiration-loading"
                role="status"
                aria-live="polite"
              >
                <div
                  class="inspiration-skeleton"
                  aria-hidden="true"
                >
                  <span class="inspiration-skeleton-line inspiration-skeleton-line--lead" />
                  <span class="inspiration-skeleton-line" />
                  <span class="inspiration-skeleton-line inspiration-skeleton-line--short" />
                </div>
                <div class="inspiration-loading-status">
                  <span
                    class="inspiration-loading-bullet"
                    aria-hidden="true"
                  />
                  <span
                    class="inspiration-loading-bullet"
                    aria-hidden="true"
                  />
                  <span
                    class="inspiration-loading-bullet"
                    aria-hidden="true"
                  />
                  <span class="inspiration-loading-text">AI 正在为你雕琢灵感</span>
                </div>
              </div>
              <template v-else>
                <p class="inspiration-quote">
                  "{{ displayQuote.text }}"
                </p>
                <p class="inspiration-author">
                  -- {{ displayQuote.author }}
                </p>
              </template>
            </div>
            <div
              class="inspiration-source"
              :class="aiInspiration ? 'source-ai' : 'source-local'"
            >
              {{ aiInspiration ? 'AI 创作' : '本地名言' }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      ref="regionTemplatesRef"
      class="hub-region hub-region-templates hub-secondary-grid"
      data-region="templates"
      aria-labelledby="hub-template-market-title"
    >
      <TemplateMarketGrid
        @select="(template) => void handleTemplateSelect(template)"
        @create-new="openTemplatePicker"
      />

      <aside
        class="bento-card secondary-card quick-actions-card"
        aria-labelledby="hub-quick-actions-title"
      >
        <div class="secondary-card-head">
          <div>
            <p class="secondary-kicker">
              日常导航
            </p>
            <h2
              id="hub-quick-actions-title"
              class="secondary-title"
            >
              常用入口
            </h2>
          </div>
        </div>

        <div
          class="quick-link-list"
          role="group"
          aria-label="日常导航"
        >
          <button
            type="button"
            class="quick-link-btn"
            @click="void goToDrafts()"
          >
            <span
              class="quick-link-icon"
              aria-hidden="true"
            >
              <FileText
                :size="16"
                :stroke-width="2.3"
              />
            </span>
            <span class="quick-link-copy">
              <strong>打开草稿箱</strong>
              <span>查看未完成的稿件与待整理内容</span>
            </span>
          </button>

          <button
            type="button"
            class="quick-link-btn"
            @click="handleSearchShortcut"
          >
            <span
              class="quick-link-icon"
              aria-hidden="true"
            >
              <Search
                :size="16"
                :stroke-width="2.3"
              />
            </span>
            <span class="quick-link-copy">
              <strong>全文搜索</strong>
              <span>跳转到筛选条搜索全部文章</span>
            </span>
          </button>

          <button
            type="button"
            class="quick-link-btn"
            @click="goToSettings('editor', 'writing-goal')"
          >
            <span
              class="quick-link-icon"
              aria-hidden="true"
            >
              <Target
                :size="16"
                :stroke-width="2.3"
              />
            </span>
            <span class="quick-link-copy">
              <strong>写作目标</strong>
              <span>设置每日字数与阶段目标</span>
            </span>
          </button>

          <button
            type="button"
            class="quick-link-btn"
            @click="goToSettings()"
          >
            <span
              class="quick-link-icon"
              aria-hidden="true"
            >
              <Layers
                :size="16"
                :stroke-width="2.3"
              />
            </span>
            <span class="quick-link-copy">
              <strong>分类与标签管理</strong>
              <span>整理分类树、维护标签体系</span>
            </span>
          </button>
        </div>

        <div class="workflow-progress-card">
          <div class="workflow-progress-head">
            <div>
              <div class="workflow-progress-kicker">
                {{ workflowProgress.label }}
              </div>
              <strong class="workflow-progress-value">{{ workflowProgress.percent }}%</strong>
            </div>
            <div
              class="workflow-progress-icon"
              aria-hidden="true"
            >
              <Target
                :size="18"
                :stroke-width="2.2"
              />
            </div>
          </div>
          <div
            class="workflow-progress-bar"
            aria-hidden="true"
          >
            <span :style="{ width: `${workflowProgress.percent}%` }" />
          </div>
          <p class="workflow-progress-copy">
            {{ workflowProgress.summary }}
          </p>
          <button
            type="button"
            class="workflow-progress-link"
            @click.stop="goToSettings('editor', 'writing-goal')"
          >
            {{ workflowProgress.actionLabel }}
          </button>
        </div>
      </aside>
    </section>

    <section
      ref="regionInsightsRef"
      class="hub-region hub-region-insights"
      data-region="insights"
      aria-label="数据洞察"
    >
      <DataInsightsSection
        :articles="articles"
        :categories="categoryStore.categories"
      />
    </section>


    <!-- ═══════════════════════════════════════════════════════ -->
    <!-- 第四屏：文章瀑布流                                        -->
    <!-- ═══════════════════════════════════════════════════════ -->
    <section
      ref="regionArticlesRef"
      class="hub-region hub-region-articles"
      data-region="articles"
      aria-label="最近文章"
    >
      <div class="filter-bar">
        <div class="filter-tabs">
          <button
            class="filter-tab"
            type="button"
            :class="{ active: filterMode === 'all' }"
            @click="setFilterMode('all')"
          >
            全部
          </button>
          <button
            class="filter-tab"
            type="button"
            :class="{ active: filterMode === 'week' }"
            @click="setFilterMode('week')"
          >
            本周
          </button>
          <div class="filter-category-wrapper">
            <button
              class="filter-tab"
              type="button"
              :class="{ active: filterMode === 'category' }"
              @click="setFilterMode('category')"
            >
              分类
            </button>
            <div
              v-if="filterMode === 'category'"
              class="category-dropdown"
            >
              <button
                v-for="cat in categoryStore.categories"
                :key="cat.id"
                type="button"
                class="category-option"
                :class="{ selected: filterCategoryId === cat.id }"
                @click="filterCategoryId = cat.id"
              >
                {{ cat.name }}
              </button>
              <div
                v-if="categoryStore.categories.length === 0"
                class="category-option disabled"
              >
                暂无分类
              </div>
            </div>
          </div>
        </div>
        <div class="filter-right">
          <div class="search-box">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
              />
              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
              />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              aria-label="搜索最近文章"
              placeholder="搜索文章..."
              class="search-input"
            >
          </div>
          <select
            v-model="sortMode"
            class="sort-select"
            aria-label="文章排序方式"
          >
            <option value="recent">
              最近更新
            </option>
            <option value="title">
              按标题
            </option>
            <option value="wordcount">
              按字数
            </option>
          </select>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════ -->
      <!-- 瀑布流文章区                                             -->
      <!-- ═══════════════════════════════════════════════════════ -->
      <div
        v-if="displayArticles.length > 0"
        class="waterfall-grid"
      >
        <div
          v-for="(article, index) in displayArticles"
          :key="article.id"
          class="article-card"
          :style="{ '--i': index }"
          @click="openArticle(article.id)"
        >
          <div
            class="card-accent"
            :style="{ background: getCategoryColor(article.categoryId) }"
          />
          <div
            class="card-cover"
            :style="{ background: getArticleCover(article).background }"
          >
            <img
              v-if="getArticleCover(article).kind === 'image' && getArticleCover(article).url"
              :src="getArticleCover(article).url"
              :alt="article.title"
              class="card-cover-img"
              loading="lazy"
              @error="handleCoverImageError"
            >
            <span
              v-else
              class="card-cover-initial"
              aria-hidden="true"
            >{{ getArticleCover(article).initial }}</span>
            <span
              class="status-badge"
              :class="statusClass(article.status)"
            >
              {{ getStatusLabel(article.status) }}
            </span>
          </div>
          <div class="card-body">
            <div
              v-if="article.sourceName"
              class="card-tags"
            >
              <span class="source-tag">{{ article.sourceName }}</span>
            </div>
            <h3 class="card-title">
              {{ article.title || '未命名文稿' }}
            </h3>
            <p class="card-excerpt">
              {{ getExcerpt(article) }}
            </p>
            <div class="card-meta">
              <span
                v-if="getCategoryName(article.categoryId)"
                class="meta-category"
              >{{ getCategoryName(article.categoryId) }}</span>
              <span class="meta-words">{{ getArticleWordCount(article).toLocaleString() }} 字</span>
              <span class="meta-time">{{ formatRelativeTime(article.updatedAt || article.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else
        class="empty-state"
      >
        <template v-if="articles.length === 0">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: #90A4AE;"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <h3>开始你的第一篇创作</h3>
          <p>使用右下角快速创建、创作工具卡或最近编辑卡底部入口，开始第一篇创作。</p>
          <button
            class="empty-create-btn"
            type="button"
            @click="startNewProject"
          >
            新建文章
          </button>
        </template>
        <template v-else>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: #90A4AE;"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>
          <h3>没有找到匹配的文章</h3>
          <p>试试调整筛选条件或搜索关键词</p>
          <button
            class="empty-create-btn"
            type="button"
            @click="setFilterMode('all'); searchQuery = ''"
          >
            清除筛选
          </button>
        </template>
      </div>
    </section>

    <!-- 右下角浮动新建按钮 -->
    <div
      ref="quickActionRef"
      class="quick-action-stack"
    >
      <div
        v-if="showQuickActionMenu"
        :id="quickActionMenuId"
        class="quick-action-menu"
        role="menu"
        aria-label="快速创建菜单"
        :aria-labelledby="lastQuickActionTrigger === 'header' ? headerQuickActionTriggerId : fabQuickActionTriggerId"
        aria-orientation="vertical"
      >
        <button
          type="button"
          class="quick-action-item"
          role="menuitem"
          tabindex="-1"
          @click="void startNewProject()"
        >
          <Plus
            :size="16"
            :stroke-width="2.2"
          />
          <div class="quick-action-copy">
            <span class="quick-action-label">新建空白文档</span>
            <span class="quick-action-shortcut">Ctrl/Cmd+N</span>
          </div>
        </button>
        <button
          type="button"
          class="quick-action-item"
          role="menuitem"
          tabindex="-1"
          @click="openTemplatePicker"
        >
          <LayoutTemplate
            :size="16"
            :stroke-width="2.2"
          />
          <div class="quick-action-copy">
            <span class="quick-action-label">从模板创建</span>
            <span class="quick-action-shortcut">Ctrl/Cmd+Shift+N</span>
          </div>
        </button>
        <button
          type="button"
          class="quick-action-item"
          role="menuitem"
          tabindex="-1"
          :disabled="importInProgress"
          @click="void handleImportDocuments()"
        >
          <FolderPlus
            :size="16"
            :stroke-width="2.2"
          />
          <div class="quick-action-copy">
            <span class="quick-action-label">{{ importInProgress ? '导入处理中...' : '导入文档' }}</span>
            <span class="quick-action-shortcut">Ctrl/Cmd+O</span>
          </div>
        </button>
      </div>
    </div>

    <TemplatePicker
      v-if="showTemplatePicker"
      @close="showTemplatePicker = false"
      @select="void handleTemplateSelect($event)"
    />

    <!-- 分类创建 Modal -->
    <AddCategoryModal
      :visible="showAddCategoryModal"
      @close="showAddCategoryModal = false"
      @confirm="handleAddCategory"
    />

    <WritingFlowDayPopup
      :open="selectedDayIndex !== null"
      :day-label="selectedDayLabel"
      :date-label="selectedDateLabel"
      :articles="selectedDayArticles"
      :anchor="selectedDayAnchor"
      @close="() => { selectedDayIndex = null; selectedDayAnchor = null }"
      @open-article="(id: string) => { selectedDayIndex = null; selectedDayAnchor = null; void openArticle(id) }"
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
  position: relative;
  height: 100vh;
  background: var(--bg-rice-paper, #FAFBFC);
  padding: 0;
  color: #263238;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.015'/%3E%3C/svg%3E");
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.hub-page::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}

.hub-region {
  scroll-snap-align: start;
  scroll-snap-stop: always;
  height: 100vh;
  min-height: 100vh;
  padding: 24px 88px 24px 32px; /* 右侧留出 SectionDots 空间 */
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  box-sizing: border-box;
  overflow: hidden;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (max-width: 1100px) {
  .hub-region {
    padding-right: 48px;
  }
}

/* 第一屏 region 留出顶部空间给浮动 header */
.hub-region-flow {
  padding-top: 88px;
}

.hub-region--visible {
  opacity: 1;
  transform: translateY(0);
}

.hub-region-articles {
  height: auto;
  min-height: 100vh;
  padding-bottom: 64px;
}

@media (prefers-reduced-motion: reduce) {
  .hub-page {
    scroll-behavior: auto;
  }
  .hub-region {
    transition: none;
    opacity: 1;
    transform: none;
  }
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
  max-width: calc(100vw - 96px);
  width: 100%;
  margin: 0 auto 18px;
  padding: 0;
  flex-shrink: 0;
}

/* 浮动 header：脱离文档流，保证 scroll-snap 区域满屏；定位在第一屏顶部，滚动时随页面消失 */
.hub-header-floating {
  position: absolute;
  top: 24px;
  left: 32px;
  right: 32px;
  z-index: 50;
  width: auto;
  margin: 0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.15);
  flex-shrink: 0;
}

.brand-text h1 {
  font-family: var(--font-serif);
  font-size: var(--type-step-2);
  font-weight: var(--type-weight-emphasis);
  color: #263238;
  letter-spacing: 0.02em;
  margin: 0;
  line-height: 1.2;
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
  font-family: var(--font-sans);
  font-size: 12px;
  color: #90A4AE;
  margin: 2px 0 0;
  opacity: 0.85;
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
  border: 1px solid var(--hairline-light);
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
  border: 1px solid var(--hairline-light);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
  color: #607D8B;
}

.icon-btn:hover {
  background: #FFFFFF;
  border-color: var(--hairline-light);
  color: #263238;
  transform: translateY(-1px);
  box-shadow: var(--elev-2);
}

.account-avatar-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.account-avatar-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.12);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 2px solid #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
}

.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: #D32F2F;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 800;
}

/* === Header 真实搜索框（与底部筛选共享 searchQuery） === */
.header-search-bar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 8px 0 12px;
  min-width: 240px;
  background: #FFFFFF;
  border: 1px solid var(--hairline-light);
  border-radius: 10px;
  cursor: text;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
              background-color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
}

.header-search-bar:hover {
  border-color: var(--hairline-light);
  background: #FFFFFF;
  box-shadow: var(--elev-1);
}

.header-search-bar:focus-within {
  border-color: transparent;
  background: #FFFFFF;
  box-shadow: var(--focus-ring);
}

.header-search-bar.has-value {
  border-color: rgba(211, 47, 47, 0.42);
}

.header-search-icon {
  flex-shrink: 0;
  color: #90A4AE;
  transition: color 0.15s ease;
}

.header-search-bar:hover .header-search-icon,
.header-search-bar:focus-within .header-search-icon,
.header-search-bar.has-value .header-search-icon {
  color: #D32F2F;
}

.header-search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  margin: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: #263238;
  font-family: inherit;
}

.header-search-input::placeholder {
  color: #90A4AE;
  font-weight: 500;
}

/* 隐藏浏览器原生 search 类型的 X 清空按钮，避免与我们自定义按钮重复 */
.header-search-input::-webkit-search-decoration,
.header-search-input::-webkit-search-cancel-button,
.header-search-input::-webkit-search-results-button,
.header-search-input::-webkit-search-results-decoration {
  -webkit-appearance: none;
  appearance: none;
}

.header-search-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(96, 125, 139, 0.14);
  color: #607D8B;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.header-search-clear:hover {
  background: rgba(211, 47, 47, 0.16);
  color: #B71C1C;
}

.header-search-bar kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 10px;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-weight: 600;
  color: #90A4AE;
  background: #F5F5F5;
  border: 1px solid #E0E0E0;
  border-radius: 4px;
  line-height: 1.2;
  flex-shrink: 0;
}

/* === QuickActionFab === */
.quick-action-stack {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  z-index: 50;
}

.quick-action-menu {
  min-width: 228px;
  padding: 10px;
  border: 1px solid rgba(211, 47, 47, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-action-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #263238;
  cursor: pointer;
  text-align: left;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.quick-action-item:hover:not(:disabled) {
  background: #FFEBEE;
  color: #D32F2F;
  transform: translateY(-1px);
}

.quick-action-item:disabled {
  cursor: wait;
  opacity: 0.6;
}

.quick-action-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.quick-action-label {
  font-size: 13px;
  font-weight: 600;
}

.quick-action-shortcut {
  font-size: 11px;
  color: #90A4AE;
}

/* =================================================================
   BENTO GRID -- 4col x 3row
================================================================= */
.bento-container {
  display: grid;
  grid-template-columns: 1.4fr 0.7fr 1fr 1fr;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  flex: 1;
  min-height: 0;
  max-width: calc(100vw - 96px);
  width: 100%;
  margin: 0 auto;
  align-items: stretch;
}

.bento-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--hairline-light);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-fast) var(--ease-out-quart),
              transform var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  min-height: 0;
}

/* 非方形破调：让某些卡片采用不对称圆角 */
.card-stats { border-radius: 18px 26px 18px 26px; }
.card-new { border-radius: 26px 18px 26px 18px; }
.card-categories { border-radius: 22px 14px 22px 14px; }
.card-recent { border-radius: 14px 22px 14px 22px; }

/* Hero 卡片需要 overflow visible 以支持日文章展开 */
.card-hero {
  overflow: visible;
}

/* 通用 hover 效果（Hero/Inspiration 除外） */
.bento-card:not(.card-hero):not(.card-inspiration):not(.card-new):hover {
  transform: translateY(-1px);
  box-shadow: var(--elev-2);
  border-color: var(--hairline-light);
}

.bento-card:nth-child(1) { animation-delay: 0.05s; }
.bento-card:nth-child(2) { animation-delay: 0.10s; }
.bento-card:nth-child(3) { animation-delay: 0.15s; }
.bento-card:nth-child(4) { animation-delay: 0.20s; }
.bento-card:nth-child(5) { animation-delay: 0.25s; }
.bento-card:nth-child(6) { animation-delay: 0.30s; }

/* === SECONDARY TOOLS SECTION === */
.hub-secondary-grid {
  max-width: calc(100vw - 96px);
  width: 100%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 20px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.secondary-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
  padding: 18px 20px;
}

.secondary-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.secondary-kicker {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.42px;
  text-transform: uppercase;
  color: #90A4AE;
}

.secondary-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
  color: #263238;
}

.secondary-badge {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #FAD4D8;
  background: #FFF5F5;
  color: #B71C1C;
  font-size: 11px;
  font-weight: 700;
}

.secondary-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #607D8B;
}

.template-category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-category-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #FAFBFC;
  border: 1px solid var(--hairline-light);
  color: #607D8B;
  font-size: 11px;
  font-weight: 600;
}

.template-category-pill strong {
  color: #263238;
  font-size: 12px;
}

.template-market-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.template-market-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--hairline-light);
  background: #FFFFFF;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-fast) var(--ease-out-quart),
              transform var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart);
}

.template-market-item:hover {
  border-color: var(--hairline-light);
  background: #FFFFFF;
  transform: translateY(-1px);
  box-shadow: var(--elev-2);
}

.template-market-icon,
.quick-link-icon,
.workflow-progress-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #FFF5F5;
  color: #D32F2F;
  border: 1px solid #FAD4D8;
}

.template-market-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.template-market-topline {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #B0BEC5;
}

.template-market-copy strong {
  color: #263238;
  font-size: 13px;
  line-height: 1.4;
}

.template-market-copy > span:last-child {
  font-size: 12px;
  line-height: 1.55;
  color: #607D8B;
}

.quick-link-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.quick-link-btn {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--hairline-light);
  border-radius: 14px;
  background: #FFFFFF;
  color: #263238;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  flex: 1 1 0;
  min-height: 60px;
  max-height: 96px;
}

.quick-link-btn:hover:not(:disabled) {
  border-color: rgba(211, 47, 47, 0.32);
  background: #FFF8F8;
  transform: translateY(-1px);
}

.quick-link-btn:disabled {
  cursor: wait;
  opacity: 0.68;
}

.quick-link-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.quick-link-copy strong {
  font-size: 13px;
  line-height: 1.4;
  color: #263238;
}

.quick-link-copy span:last-child {
  font-size: 12px;
  line-height: 1.55;
  color: #607D8B;
}

.workflow-progress-card {
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, #FFFFFF 0%, #FFF8F8 100%);
  border: 1px solid #FAD4D8;
}

.workflow-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workflow-progress-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.36px;
  text-transform: uppercase;
  color: #90A4AE;
}

.workflow-progress-value {
  display: block;
  margin-top: 4px;
  font-size: 26px;
  line-height: 1;
  color: #B71C1C;
}

.workflow-progress-bar {
  width: 100%;
  height: 10px;
  margin-top: 14px;
  border-radius: 999px;
  background: rgba(211, 47, 47, 0.08);
  overflow: hidden;
}

.workflow-progress-bar span {
  display: block;
  height: 100%;
  min-width: 10px;
  border-radius: inherit;
  background: linear-gradient(90deg, #D32F2F 0%, #F0625D 100%);
  transition: width 0.18s ease;
}

.workflow-progress-copy {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.65;
  color: #607D8B;
}

.workflow-progress-link {
  margin-top: 12px;
  padding: 0;
  border: none;
  background: transparent;
  color: #C62828;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.productivity-signal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.productivity-signal {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--hairline-light);
  background: #FAFBFC;
}

.productivity-signal-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #607D8B;
}

.productivity-signal strong {
  display: block;
  margin-top: 10px;
  font-size: 18px;
  line-height: 1;
  color: #263238;
}

.productivity-signal p {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: #78909C;
}

.productivity-draft-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.productivity-draft-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(207, 216, 220, 0.82);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  color: #263238;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, background 0.18s ease;
}

.productivity-draft-item:hover {
  border-color: rgba(211, 47, 47, 0.24);
  background: rgba(255, 245, 245, 0.92);
  transform: translateY(-1px);
}

.productivity-draft-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.18);
}

.productivity-draft-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.productivity-draft-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  color: #263238;
}

.productivity-draft-time {
  font-size: 11px;
  color: #78909C;
}

.productivity-draft-meta {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #546E7A;
}

.productivity-signal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

/* === 1. HERO CARD (创作流) === */
/* 红色梯度背景 + 白色文字 + 右上 radial 纹理 — 品牌锚点 */
.card-hero {
  grid-column: span 2;
  grid-row: span 2;
  background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%);
  border: none;
  color: #FFFFFF;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 28px 32px;
  position: relative;
  overflow: hidden;
}

.hero-decor {
  position: absolute;
  top: -60%;
  right: -25%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
  pointer-events: none;
  border-radius: 50%;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hero-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.hero-text {
  min-width: 0;
}

.hero-continue-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  max-width: 300px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #FFFFFF;
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.hero-continue-btn:hover {
  border-color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.26);
  transform: translateY(-1px);
}

.hero-continue-btn:hover .hero-continue-kicker {
  color: #FFFFFF;
}

.hero-continue-btn:focus-visible {
  outline: none;
  border-color: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.32);
}

.hero-continue-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.hero-continue-kicker {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
  transition: color 0.18s ease;
}

.hero-continue-copy strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: #FFFFFF;
}

.hero-title {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 4px;
  line-height: 1.15;
  color: #FFFFFF;
  letter-spacing: 0.5px;
}

.hero-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.chart-container {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex: 1;
  min-height: 60px;
  padding-top: 16px;
}

.chart-bar {
  flex: 1;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 4px 4px 0 0;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  position: relative;
  min-height: 6%;
}

.chart-bar:hover {
  background: rgba(255, 255, 255, 0.32);
}

.chart-bar.active {
  background: #FFFFFF;
}

.chart-bar.selected {
  background: #FFE4E4;
  transform: scaleX(1.08);
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
  margin-top: 12px;
  padding-bottom: 4px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.72);
}

.chart-labels span {
  flex: 1;
  text-align: center;
}

.hero-empty-state {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
}

.hero-empty-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.96);
}

.hero-empty-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.hero-empty-btn {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: #B71C1C;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.hero-empty-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.4);
  background: #FFFFFF;
}

.hero-empty-btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #FFFFFF;
}

.hero-empty-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.16);
}

/* Day articles expand */
.day-articles {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  position: relative;
  z-index: 1;
}

.day-articles-empty-text {
  display: block;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  padding: 8px 0;
}

.day-article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
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
  color: #FFFFFF;
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

/* === 2. STATS CARD — Editorial 单指标卡 === */
.card-stats {
  grid-row: span 2;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 18px;
  padding: 22px 24px 20px;
  background: #FAFBFC;
  border: 1px solid var(--hairline-light);
  position: relative;
  overflow: hidden;
}

.card-stats::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 100% 0%, rgba(211, 47, 47, 0.045) 0%, transparent 45%),
    repeating-linear-gradient(135deg, rgba(96, 125, 139, 0.025) 0 1px, transparent 1px 14px);
  pointer-events: none;
}

.stats-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stats-mark {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 22px;
  font-weight: 400;
  color: rgba(211, 47, 47, 0.32);
  line-height: 1;
}

.stats-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #607D8B;
}

.stats-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-self: center;
  justify-self: start;
  margin: 18px 0;
}

/* 刻度装饰：在数字下方填补留白 */
.stats-hero::after {
  content: '';
  display: block;
  margin-top: 14px;
  width: 64px;
  height: 2px;
  background:
    linear-gradient(90deg, #D32F2F 0%, #D32F2F 35%, transparent 35%, transparent 100%),
    repeating-linear-gradient(90deg, rgba(96, 125, 139, 0.32) 0 2px, transparent 2px 8px);
  border-radius: 2px;
}

.stats-primary {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
}

.stats-primary-value {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 92px;
  font-weight: 700;
  line-height: 0.92;
  color: #263238;
  letter-spacing: -3px;
  font-variant-numeric: tabular-nums;
}

.stats-primary-unit {
  font-size: 18px;
  font-weight: 500;
  color: #90A4AE;
}

.stats-primary-note {
  margin: 0;
  font-size: 12px;
  color: #90A4AE;
  letter-spacing: 0.4px;
}

.stats-spark {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 38px;
  margin-top: 6px;
  padding: 4px 0;
  border-top: 1px dashed rgba(207, 216, 220, 0.55);
}

.stats-spark-bar {
  flex: 1;
  min-width: 4px;
  border-radius: 2px;
  background: linear-gradient(180deg, #CFD8DC 0%, #B0BEC5 100%);
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.stats-spark-bar--today {
  background: linear-gradient(180deg, #D32F2F 0%, #B71C1C 100%);
  opacity: 1;
}

.stats-secondary {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  padding-top: 14px;
  border-top: 1px solid var(--hairline-light);
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.stats-row-label {
  font-size: 10px;
  letter-spacing: 0.6px;
  color: #90A4AE;
  text-transform: uppercase;
  font-weight: 600;
}

.stats-row-value {
  font-size: 14px;
  font-weight: 700;
  color: #263238;
  font-variant-numeric: tabular-nums;
}

/* === 3. NEW PROJECT CARD — Editorial 简化 === */
.card-new {
  border: 1px solid var(--hairline-light);
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.card-new:hover {
  border-color: #D32F2F;
  box-shadow: 0 8px 24px rgba(38, 50, 56, 0.06);
}

.new-card-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.new-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #607D8B;
}

.new-title {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 20px;
  font-weight: 700;
  color: #263238;
  margin: 0;
  line-height: 1.25;
  letter-spacing: 0.3px;
}

.new-desc {
  font-size: 12px;
  color: #90A4AE;
  margin: 0;
  line-height: 1.55;
}

.new-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.new-action-btn {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  border: 1px solid #263238;
  border-radius: 8px;
  background: #263238;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.new-action-btn:hover:not(:disabled) {
  background: #D32F2F;
  border-color: #D32F2F;
  transform: translateY(-1px);
}

.new-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.new-action-btn-secondary {
  background: transparent;
  border-color: #ECEFF1;
  color: #455A64;
}

.new-action-btn-secondary:hover:not(:disabled) {
  background: #FAFBFC;
  border-color: #263238;
  color: #263238;
}

.new-action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.18);
}

.import-result-panel {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(211, 47, 47, 0.14);
  border-radius: 14px;
  background: rgba(255, 245, 246, 0.72);
}

.import-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #263238;
}

.import-result-kicker {
  color: #8A1C1F;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.import-result-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.import-result-stats span {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
  min-height: 28px;
  padding: 4px 6px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.76);
  color: #455A64;
  font-size: 11px;
}

.import-result-stats strong {
  color: #B71C1C;
  font-size: 15px;
  line-height: 1;
}

.import-result-note {
  margin: 0;
  color: #546E7A;
  font-size: 12px;
  line-height: 1.5;
}

.import-result-errors {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.import-result-errors li {
  color: #8A1C1F;
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

/* === 4. RECENT FILE CARD === */
.card-recent {
  display: flex;
  flex-direction: column;
  min-height: 180px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(176, 190, 197, 0.4) transparent;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.card-recent::-webkit-scrollbar {
  width: 6px;
}

.card-recent::-webkit-scrollbar-track {
  background: transparent;
}

.card-recent::-webkit-scrollbar-thumb {
  background: rgba(176, 190, 197, 0.35);
  border-radius: 3px;
}

.card-recent::-webkit-scrollbar-thumb:hover {
  background: rgba(176, 190, 197, 0.6);
}

.card-recent .recent-main {
  flex: 0 0 auto;
}

.card-recent .recent-articles-list,
.card-recent .recent-todo-list {
  flex: 0 0 auto;
}

.card-recent .recent-create-actions {
  flex: 0 0 auto;
}

.recent-main {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  flex: 1;
}

.recent-main:disabled {
  cursor: default;
}

.recent-main:focus-visible,
.recent-article-row:focus-visible,
.recent-create-btn:focus-visible,
.template-market-item:focus-visible,
.quick-link-btn:focus-visible,
.quick-action-item:focus-visible,
.account-avatar-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.18);
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

/* Recent articles list at bottom of card-recent */
.recent-articles-list {
  margin-top: 12px;
  border-top: 1px solid var(--hairline-light);
  padding-top: 12px;
}

.recent-todo-list {
  margin-top: 12px;
  border-top: 1px solid var(--hairline-light);
  padding-top: 12px;
}

.recent-todo-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.recent-todo-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #FFF3E0;
  color: #A15C00;
  font-size: 11px;
  font-weight: 700;
}

.recent-articles-heading {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #B0BEC5;
  margin: 0 0 8px;
}

.recent-articles-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-article-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  font-size: 13px;
  color: #607D8B;
  cursor: pointer;
  transition: background 0.15s ease;
}

.recent-article-row:hover {
  background: #F5F5F5;
}

.recent-article-row-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-article-row-todo {
  align-items: flex-start;
  flex-direction: column;
  gap: 4px;
}

.recent-article-row-meta {
  font-size: 11px;
  color: #90A4AE;
  line-height: 1.4;
}

.recent-create-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ECEFF1;
}

.recent-create-btn {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--hairline-light);
  border-radius: 10px;
  background: #FFFFFF;
  color: #455A64;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.recent-create-btn:hover {
  border-color: #D32F2F;
  color: #B71C1C;
  background: #FFF8F8;
  transform: translateY(-1px);
}

.recent-create-btn-template {
  background: #FFF8E1;
  color: #A15C00;
}

/* === 5. CATEGORIES CARD === */
.card-categories {
  grid-column: span 2;
  display: flex;
  flex-direction: column;
  min-height: 180px;
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
  grid-template-columns: repeat(3, 1fr);
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
  grid-column: span 3;
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

/* === 6. INSPIRATION CARD — 古典编辑风（占 col4 row2-3 填补 card-new 下方空白） === */
.card-inspiration {
  grid-column: 4;
  grid-row: 2 / span 2;
  position: relative;
  background:
    radial-gradient(ellipse 320px 160px at 18% -8%, rgba(211, 47, 47, 0.05), transparent 70%),
    linear-gradient(180deg, #FFFEFB 0%, #FAF7F2 100%);
  border: 1px solid var(--hairline-light);
  border-left: 3px solid #D32F2F;
  color: #263238;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 180px;
  overflow: hidden;
  isolation: isolate;
}

.card-inspiration::before {
  content: '"';
  position: absolute;
  top: -32px;
  left: 14px;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Times New Roman', serif;
  font-size: 180px;
  font-weight: 400;
  line-height: 1;
  color: rgba(211, 47, 47, 0.06);
  pointer-events: none;
  z-index: 0;
  letter-spacing: -8px;
}

.card-inspiration::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(96, 125, 139, 0.06) 1px, transparent 0);
  background-size: 18px 18px;
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}

.inspiration-texture {
  display: none;
}

.inspiration-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 14px;
}

.inspiration-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.inspiration-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(211, 47, 47, 0.18);
  backdrop-filter: blur(4px);
}

.inspiration-icon {
  color: #D32F2F;
  filter: drop-shadow(0 1px 2px rgba(211, 47, 47, 0.20));
}

.inspiration-label {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #B71C1C;
}

.inspiration-refresh {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #FFF5F5;
  border: 1px solid #FAD4D8;
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
  gap: 12px;
}

.inspiration-quote {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'STZhongsong', serif;
  font-size: 19px;
  font-style: normal;
  font-weight: 500;
  color: #2C1810;
  line-height: 1.85;
  letter-spacing: 0.4px;
  margin: 0;
  opacity: 1;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

.inspiration-author {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 600;
  color: #8B5A3C;
  margin: 0;
  padding-top: 12px;
  text-align: right;
  letter-spacing: 1px;
  position: relative;
}

.inspiration-author::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(211, 47, 47, 0.32) 50%, rgba(139, 90, 60, 0.42) 100%);
}

.inspiration-source {
  position: static;
  align-self: flex-end;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.3px;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  transition: opacity 0.2s ease;
  opacity: 0.55;
}

.inspiration-source.source-ai {
  color: #B71C1C;
}

.inspiration-source.source-local {
  color: #90A4AE;
}

.inspiration-setup {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #FAFBFC;
  border: 1px dashed #CFD8DC;
  color: #607D8B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.inspiration-setup:hover {
  background: #FFF5F5;
  border-color: #D32F2F;
  color: #D32F2F;
}

.inspiration-loading {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 4px 0 0;
  padding: 0;
}

.inspiration-skeleton {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.inspiration-skeleton-line {
  position: relative;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(207, 216, 220, 0.28) 0%,
    rgba(211, 47, 47, 0.18) 50%,
    rgba(207, 216, 220, 0.28) 100%
  );
  background-size: 220% 100%;
  animation: inspirationShimmer 1.6s linear infinite;
  overflow: hidden;
}

.inspiration-skeleton-line--lead {
  width: 92%;
  height: 14px;
}

.inspiration-skeleton-line--short {
  width: 48%;
}

@keyframes inspirationShimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.inspiration-loading-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #B71C1C;
}

.inspiration-loading-bullet {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #D32F2F;
  opacity: 0.32;
  animation: inspirationPulse 1.2s ease-in-out infinite;
}

.inspiration-loading-bullet:nth-child(1) { animation-delay: 0s; }
.inspiration-loading-bullet:nth-child(2) { animation-delay: 0.18s; }
.inspiration-loading-bullet:nth-child(3) { animation-delay: 0.36s; }

.inspiration-loading-text {
  margin-left: 6px;
}

@keyframes inspirationPulse {
  0%, 100% { opacity: 0.32; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.15); }
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
  max-width: calc(100vw - 96px);
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
  border: 1px solid var(--hairline-light);
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
  border: 1px solid var(--hairline-light);
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
  border: 1px solid var(--hairline-light);
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
  border: 1px solid var(--hairline-light);
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
  columns: 6 280px;
  column-gap: 24px;
  max-width: calc(100vw - 96px);
  width: 100%;
  margin: 0 auto;
}

.article-card {
  break-inside: avoid;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--hairline-light);
  border-radius: 16px;
  margin-bottom: 24px;
  cursor: pointer;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-fast) var(--ease-out-quart),
              transform var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(min(var(--i), 10) * 50ms);
  display: flex;
  flex-direction: column;
}

.card-cover {
  position: relative;
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-cover-initial {
  position: relative;
  font-size: 48px;
  font-weight: 800;
  color: rgba(38, 50, 56, 0.42);
  letter-spacing: 2px;
}

.status-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #455A64;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2px;
  backdrop-filter: blur(6px);
  z-index: 1;
}

.status-badge.status-draft {
  background: rgba(245, 124, 0, 0.92);
  color: #FFFFFF;
}

.status-badge.status-writing {
  background: rgba(21, 101, 192, 0.92);
  color: #FFFFFF;
}

.status-badge.status-pending,
.status-badge.status-review {
  background: rgba(106, 27, 154, 0.92);
  color: #FFFFFF;
}

.status-badge.status-publish-ready,
.status-badge.status-ready {
  background: rgba(46, 125, 50, 0.92);
  color: #FFFFFF;
}

.status-badge.status-published,
.status-badge.status-done {
  background: rgba(27, 94, 32, 0.92);
  color: #FFFFFF;
}

.status-badge.status-archived {
  background: rgba(55, 71, 79, 0.92);
  color: #FFFFFF;
}

.card-body {
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.article-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--elev-2);
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
  font-size: 16px;
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
   EMPTY STATE
================================================================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  max-width: calc(100vw - 96px);
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

  .template-market-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* 1200-1400px: 3 columns (default) */

/* 800-1200px: bento 2col, waterfall 2col */
@media (max-width: 1200px) {
  .bento-container {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto;
    height: auto;
  }

  .card-hero {
    grid-column: span 2;
    grid-row: span 1;
    min-height: 280px;
  }

  .hero-header {
    flex-direction: column;
  }

  .hero-continue-btn {
    width: 100%;
    max-width: none;
  }

  .card-stats {
    grid-row: span 1;
  }

  .card-categories {
    grid-column: span 2;
  }

  .waterfall-grid {
    columns: 2 280px;
  }

  .hub-secondary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .template-market-grid,
  .productivity-signal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* <800px: all 1 column */
@media (max-width: 800px) {
  .hub-page {
    padding: 16px;
    padding-bottom: 88px;
  }

  .hub-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-search-bar {
    min-width: 0;
    flex: 1;
    height: 40px;
  }

  .header-search-bar kbd {
    display: none;
  }

  .sync-badge {
    padding: 8px 12px;
  }

  .quick-action-stack {
    right: 16px;
    bottom: 16px;
  }

  .bento-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    height: auto;
    gap: 16px;
  }

  .hub-secondary-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }

  .card-hero {
    grid-column: span 1;
    min-height: 260px;
  }

  .hero-empty-actions {
    flex-direction: column;
  }

  .hero-header {
    gap: 12px;
  }

  .hero-continue-btn {
    min-width: 0;
    padding: 11px 12px;
  }

  .card-stats {
    grid-row: span 1;
    padding: 20px 24px;
  }

  .card-categories {
    grid-column: span 1;
  }

  .categories-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .new-actions,
  .recent-create-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .secondary-card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .template-market-grid,
  .productivity-signal-grid {
    grid-template-columns: 1fr;
  }

  .secondary-badge {
    align-self: flex-start;
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
}
.productivity-signal-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 28px;
  margin-top: 10px;
  padding: 0 12px;
  border: 1px solid rgba(51, 68, 79, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: #263238;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
}

.productivity-signal-link:hover {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(38, 50, 56, 0.24);
  transform: translateY(-1px);
}

.productivity-signal-link-secondary {
  background: rgba(255, 245, 245, 0.82);
  border-color: rgba(211, 47, 47, 0.2);
  color: #B71C1C;
}


/* P2-09 overflow and theme polish */
.brand-text,
.recent-label,
.recent-article-row,
.productivity-draft-item,
.article-card {
  min-width: 0;
}

.welcome-text,
.day-article-title,
.recent-title,
.recent-article-row-title,
.productivity-draft-title,
.productivity-draft-time,
.productivity-draft-meta,
.quick-action-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.new-title,
.new-desc,
.secondary-title,
.secondary-desc,
.workflow-progress-copy,
.card-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.inspiration-quote {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.workflow-progress-value {
  font-variant-numeric: tabular-nums;
  font-size: clamp(24px, 3vw, 32px);
  overflow-wrap: anywhere;
}

.chart-labels,
.categories-grid,
.productivity-signal-grid,
.template-market-grid,
.waterfall-grid {
  min-width: 0;
}

/* === DARK MODE — Hub Editorial === */
html.theme-dark .hub-page,
html[data-theme="dark"] .hub-page {
  background:
    radial-gradient(ellipse 1200px 800px at 8% -10%, rgba(211, 47, 47, 0.16), transparent 55%),
    radial-gradient(ellipse 900px 600px at 92% 110%, rgba(100, 181, 246, 0.06), transparent 60%),
    #0E141C;
  color: #ECEFF4;
  background-image:
    radial-gradient(ellipse 1200px 800px at 8% -10%, rgba(211, 47, 47, 0.16), transparent 55%),
    radial-gradient(ellipse 900px 600px at 92% 110%, rgba(100, 181, 246, 0.06), transparent 60%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E");
}

/* 通用卡片在暗色下提升一档可见 */
html.theme-dark .bento-card:not(.card-hero):not(.card-inspiration),
html[data-theme="dark"] .bento-card:not(.card-hero):not(.card-inspiration),
html.theme-dark .article-card,
html[data-theme="dark"] .article-card,
html.theme-dark .workflow-progress-card,
html[data-theme="dark"] .workflow-progress-card {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
  color: #ECEFF4;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.32);
}

/* 累计指标卡（中间，单指标）— 用更深一档背景营造层次 */
html.theme-dark .card-stats,
html[data-theme="dark"] .card-stats {
  background: #131A23;
  border-color: rgba(255, 255, 255, 0.06);
}

html.theme-dark .card-stats::before,
html[data-theme="dark"] .card-stats::before {
  background:
    radial-gradient(circle at 100% 0%, rgba(239, 83, 80, 0.10) 0%, transparent 45%),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 14px);
}

html.theme-dark .stats-mark,
html[data-theme="dark"] .stats-mark {
  color: rgba(239, 83, 80, 0.42);
}

html.theme-dark .stats-spark,
html[data-theme="dark"] .stats-spark {
  border-top-color: rgba(255, 255, 255, 0.08);
}

html.theme-dark .stats-spark-bar,
html[data-theme="dark"] .stats-spark-bar {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%);
}

html.theme-dark .stats-spark-bar--today,
html[data-theme="dark"] .stats-spark-bar--today {
  background: linear-gradient(180deg, #EF5350 0%, #B71C1C 100%);
}

html.theme-dark .stats-secondary,
html[data-theme="dark"] .stats-secondary {
  border-top-color: rgba(255, 255, 255, 0.08);
}

html.theme-dark .stats-row-value,
html[data-theme="dark"] .stats-row-value {
  color: #ECEFF4;
}

/* 新建作品 — 更高一档 */
html.theme-dark .card-new,
html[data-theme="dark"] .card-new {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
}

/* Hero 红色卡 — 暗色下用更深的红到酒红渐变，去掉刺眼感 */
html.theme-dark .card-hero,
html[data-theme="dark"] .card-hero {
  background: linear-gradient(135deg, #B71C1C 0%, #7F1212 100%);
  box-shadow: 0 12px 40px rgba(127, 18, 18, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

html.theme-dark .card-hero .hero-decor,
html[data-theme="dark"] .card-hero .hero-decor {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
}

/* 灵感卡 */
html.theme-dark .card-inspiration,
html[data-theme="dark"] .card-inspiration {
  background:
    radial-gradient(ellipse 320px 160px at 18% -8%, rgba(239, 83, 80, 0.10), transparent 70%),
    linear-gradient(180deg, #1F2733 0%, #161D27 100%);
  border-color: rgba(255, 255, 255, 0.08);
  border-left-color: #EF5350;
}

html.theme-dark .card-inspiration::before,
html[data-theme="dark"] .card-inspiration::before {
  color: rgba(239, 83, 80, 0.10);
}

html.theme-dark .card-inspiration::after,
html[data-theme="dark"] .card-inspiration::after {
  background-image:
    radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
  opacity: 0.4;
}

html.theme-dark .inspiration-header,
html[data-theme="dark"] .inspiration-header {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(239, 83, 80, 0.32);
}

html.theme-dark .inspiration-label,
html[data-theme="dark"] .inspiration-label {
  color: #EF9A9A;
}

html.theme-dark .inspiration-quote,
html[data-theme="dark"] .inspiration-quote {
  color: #ECEFF4;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
}

html.theme-dark .inspiration-author,
html[data-theme="dark"] .inspiration-author {
  color: #D7C0A8;
}

html.theme-dark .inspiration-author::before,
html[data-theme="dark"] .inspiration-author::before {
  background: linear-gradient(90deg, transparent 0%, rgba(239, 83, 80, 0.42) 50%, rgba(215, 192, 168, 0.42) 100%);
}

html.theme-dark .inspiration-skeleton-line,
html[data-theme="dark"] .inspiration-skeleton-line {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(239, 83, 80, 0.22) 50%,
    rgba(255, 255, 255, 0.04) 100%
  );
  background-size: 220% 100%;
}

html.theme-dark .inspiration-loading-status,
html[data-theme="dark"] .inspiration-loading-status {
  color: #EF9A9A;
}

html.theme-dark .inspiration-loading-bullet,
html[data-theme="dark"] .inspiration-loading-bullet {
  background: #EF5350;
}

html.theme-dark .inspiration-source.source-local,
html[data-theme="dark"] .inspiration-source.source-local {
  color: #8590A0;
}

html.theme-dark .inspiration-source.source-ai,
html[data-theme="dark"] .inspiration-source.source-ai {
  color: #EF9A9A;
}

/* 主标题文字 — 全部白系 */
html.theme-dark .stats-primary-value,
html.theme-dark .secondary-title,
html.theme-dark .new-title,
html.theme-dark .recent-title,
html.theme-dark .card-title,
html.theme-dark .inspiration-quote,
html.theme-dark .hero-continue-copy strong,
html[data-theme="dark"] .stats-primary-value,
html[data-theme="dark"] .secondary-title,
html[data-theme="dark"] .new-title,
html[data-theme="dark"] .recent-title,
html[data-theme="dark"] .card-title,
html[data-theme="dark"] .inspiration-quote,
html[data-theme="dark"] .hero-continue-copy strong {
  color: #ECEFF4;
}

/* 次要文字 — 提亮到 #B5BFCC 而非 var(--text-secondary)#CBD5E1 太亮 */
html.theme-dark .stats-primary-note,
html.theme-dark .stats-primary-unit,
html.theme-dark .stats-row-label,
html.theme-dark .stats-row-value,
html.theme-dark .secondary-kicker,
html.theme-dark .secondary-desc,
html.theme-dark .new-desc,
html.theme-dark .new-eyebrow,
html.theme-dark .recent-article-row-meta,
html[data-theme="dark"] .stats-primary-note,
html[data-theme="dark"] .stats-primary-unit,
html[data-theme="dark"] .stats-row-label,
html[data-theme="dark"] .stats-row-value,
html[data-theme="dark"] .secondary-kicker,
html[data-theme="dark"] .secondary-desc,
html[data-theme="dark"] .new-desc,
html[data-theme="dark"] .new-eyebrow,
html[data-theme="dark"] .recent-article-row-meta {
  color: #B5BFCC;
}

/* row-value（如 "字数 3"）数字保持高亮以易读 */
html.theme-dark .stats-row-value,
html[data-theme="dark"] .stats-row-value {
  color: #ECEFF4;
}

/* stats-secondary 顶部分割线在暗色下提清楚 */
html.theme-dark .stats-secondary,
html[data-theme="dark"] .stats-secondary {
  border-top-color: rgba(255, 255, 255, 0.10);
}

/* 新建作品按钮：模板创建（主，暗色用品牌红） + 导入文档（次，白边） */
html.theme-dark .new-action-btn,
html[data-theme="dark"] .new-action-btn {
  background: #D32F2F;
  border-color: #D32F2F;
  color: #FFFFFF;
}

html.theme-dark .new-action-btn:hover:not(:disabled),
html[data-theme="dark"] .new-action-btn:hover:not(:disabled) {
  background: #EF5350;
  border-color: #EF5350;
  color: #FFFFFF;
}

html.theme-dark .new-action-btn-secondary,
html[data-theme="dark"] .new-action-btn-secondary {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.20);
  color: #B5BFCC;
}

html.theme-dark .new-action-btn-secondary:hover:not(:disabled),
html[data-theme="dark"] .new-action-btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: #ECEFF4;
  color: #ECEFF4;
}

/* 通用 elevation 卡 hover 阴影 */
html.theme-dark .bento-card:not(.card-hero):not(.card-inspiration):not(.card-new):hover,
html[data-theme="dark"] .bento-card:not(.card-hero):not(.card-inspiration):not(.card-new):hover {
  background: #1F2832;
  border-color: rgba(239, 83, 80, 0.32);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.42);
}

/* 浮动 header */
html.theme-dark .hub-header,
html[data-theme="dark"] .hub-header {
  color: #ECEFF4;
}

html.theme-dark .header-search-bar,
html[data-theme="dark"] .header-search-bar {
  background: rgba(26, 34, 45, 0.72);
  border-color: rgba(255, 255, 255, 0.08);
}

html.theme-dark .header-search-bar:hover,
html[data-theme="dark"] .header-search-bar:hover {
  background: rgba(239, 83, 80, 0.10);
  border-color: rgba(239, 83, 80, 0.42);
}

html.theme-dark .header-search-bar:focus-within,
html[data-theme="dark"] .header-search-bar:focus-within {
  background: rgba(26, 34, 45, 0.92);
  border-color: rgba(239, 83, 80, 0.55);
  box-shadow: 0 0 0 3px rgba(239, 83, 80, 0.20);
}

html.theme-dark .header-search-icon,
html[data-theme="dark"] .header-search-icon {
  color: #8590A0;
}
html.theme-dark .header-search-bar:hover .header-search-icon,
html.theme-dark .header-search-bar:focus-within .header-search-icon,
html.theme-dark .header-search-bar.has-value .header-search-icon,
html[data-theme="dark"] .header-search-bar:hover .header-search-icon,
html[data-theme="dark"] .header-search-bar:focus-within .header-search-icon,
html[data-theme="dark"] .header-search-bar.has-value .header-search-icon {
  color: #EF5350;
}

html.theme-dark .header-search-input,
html[data-theme="dark"] .header-search-input {
  color: #ECEFF4;
}
html.theme-dark .header-search-input::placeholder,
html[data-theme="dark"] .header-search-input::placeholder {
  color: #8590A0;
}

html.theme-dark .header-search-clear,
html[data-theme="dark"] .header-search-clear {
  background: rgba(255, 255, 255, 0.06);
  color: #B5BFCC;
}
html.theme-dark .header-search-clear:hover,
html[data-theme="dark"] .header-search-clear:hover {
  background: rgba(239, 83, 80, 0.20);
  color: #EF9A9A;
}

html.theme-dark .header-search-bar kbd,
html[data-theme="dark"] .header-search-bar kbd {
  background: rgba(255, 255, 255, 0.08);
  color: #ECEFF4;
  border-color: rgba(255, 255, 255, 0.12);
}

html.theme-dark .quick-create-btn,
html[data-theme="dark"] .quick-create-btn {
  background: rgba(239, 83, 80, 0.12);
  border-color: rgba(239, 83, 80, 0.42);
  color: #EF9A9A;
}

html.theme-dark .quick-create-btn:hover,
html[data-theme="dark"] .quick-create-btn:hover {
  background: #EF5350;
  border-color: #EF5350;
  color: #FFFFFF;
}

html.theme-dark .sync-badge,
html[data-theme="dark"] .sync-badge {
  background: rgba(26, 34, 45, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #B5BFCC;
}

/* 章节点 SectionDots */
html.theme-dark .section-dot,
html[data-theme="dark"] .section-dot {
  background: rgba(255, 255, 255, 0.18);
}

html.theme-dark .section-dot.is-active,
html[data-theme="dark"] .section-dot.is-active {
  background: #EF5350;
  box-shadow: 0 0 0 6px rgba(239, 83, 80, 0.18);
}

/* 模板卡 dark */
html.theme-dark .template-market-section,
html[data-theme="dark"] .template-market-section {
  background: #131A23;
  border-color: rgba(255, 255, 255, 0.06);
}

html.theme-dark .template-market-card,
html[data-theme="dark"] .template-market-card {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
  color: #ECEFF4;
}

html.theme-dark .template-market-card:hover,
html[data-theme="dark"] .template-market-card:hover {
  background: #1F2832;
  border-color: rgba(239, 83, 80, 0.42);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);
}

html.theme-dark .template-market-card-cta,
html[data-theme="dark"] .template-market-card-cta {
  background: rgba(255, 255, 255, 0.02);
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.16);
}

html.theme-dark .template-market-cover,
html[data-theme="dark"] .template-market-cover {
  background: linear-gradient(135deg, rgba(239, 83, 80, 0.18) 0%, rgba(239, 83, 80, 0.06) 100%);
  color: #EF9A9A;
}

html.theme-dark .template-market-pill,
html[data-theme="dark"] .template-market-pill {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
  color: #B5BFCC;
}

html.theme-dark .template-market-pill--active,
html[data-theme="dark"] .template-market-pill--active {
  background: #EF5350;
  border-color: #EF5350;
  color: #FFFFFF;
}

/* 数据洞察卡 */
html.theme-dark :deep(.insight-card),
html[data-theme="dark"] :deep(.insight-card) {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
  color: #ECEFF4;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.32);
}

html.theme-dark :deep(.insight-card-head h3),
html[data-theme="dark"] :deep(.insight-card-head h3) {
  color: #ECEFF4;
}

html.theme-dark :deep(.insight-eyebrow),
html[data-theme="dark"] :deep(.insight-eyebrow) {
  color: #8590A0;
}

/* quick-link-btn 在暗色下 */
html.theme-dark .quick-link-btn,
html[data-theme="dark"] .quick-link-btn {
  background: #131A23;
  border-color: rgba(255, 255, 255, 0.08);
  color: #ECEFF4;
}

html.theme-dark .quick-link-btn:hover,
html[data-theme="dark"] .quick-link-btn:hover {
  background: #1F2832;
  border-color: rgba(239, 83, 80, 0.42);
}

html.theme-dark .quick-link-copy strong,
html[data-theme="dark"] .quick-link-copy strong {
  color: #ECEFF4;
}
html.theme-dark .quick-link-copy span:last-child,
html[data-theme="dark"] .quick-link-copy span:last-child {
  color: #8590A0;
}

html.theme-dark .quick-link-icon,
html[data-theme="dark"] .quick-link-icon,
html.theme-dark .template-market-icon,
html[data-theme="dark"] .template-market-icon,
html.theme-dark .workflow-progress-icon,
html[data-theme="dark"] .workflow-progress-icon {
  background: rgba(239, 83, 80, 0.14);
  border-color: rgba(239, 83, 80, 0.32);
  color: #EF9A9A;
}

/* 文章卡 dark */
html.theme-dark .filter-chip,
html[data-theme="dark"] .filter-chip {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
  color: #B5BFCC;
}

html.theme-dark .filter-chip.is-active,
html[data-theme="dark"] .filter-chip.is-active {
  background: #EF5350;
  border-color: #EF5350;
  color: #FFFFFF;
}

html.theme-dark .article-search-input,
html[data-theme="dark"] .article-search-input {
  background: #131A23;
  border-color: rgba(255, 255, 255, 0.08);
  color: #ECEFF4;
}

html.theme-dark .article-search-input::placeholder,
html[data-theme="dark"] .article-search-input::placeholder {
  color: #8590A0;
}

/* 类别面板空状态 */
html.theme-dark .categories-empty,
html[data-theme="dark"] .categories-empty {
  border-color: rgba(255, 255, 255, 0.10);
  color: #8590A0;
}

/* === 灵感卡 setup/refresh 按钮 暗色补齐 === */
html.theme-dark .inspiration-setup,
html[data-theme="dark"] .inspiration-setup {
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.18);
  color: #B5BFCC;
}
html.theme-dark .inspiration-setup:hover,
html[data-theme="dark"] .inspiration-setup:hover {
  background: rgba(239, 83, 80, 0.10);
  border-color: #EF5350;
  color: #EF5350;
}

html.theme-dark .inspiration-refresh,
html[data-theme="dark"] .inspiration-refresh {
  background: rgba(239, 83, 80, 0.10);
  border-color: rgba(239, 83, 80, 0.32);
  color: #EF9A9A;
}
html.theme-dark .inspiration-refresh:hover:not(:disabled),
html[data-theme="dark"] .inspiration-refresh:hover:not(:disabled) {
  background: rgba(239, 83, 80, 0.18);
  border-color: #EF5350;
  color: #EF5350;
}

/* === Header icon-btn (帮助/设置) 暗色补齐 === */
html.theme-dark .icon-btn,
html[data-theme="dark"] .icon-btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.10);
  color: #B5BFCC;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
html.theme-dark .icon-btn:hover,
html[data-theme="dark"] .icon-btn:hover {
  background: rgba(239, 83, 80, 0.12);
  border-color: #EF5350;
  color: #EF5350;
}

/* === Articles 区段筛选条 / 搜索 / 排序 暗色补齐 === */
html.theme-dark .filter-bar,
html[data-theme="dark"] .filter-bar {
  background: var(--bg-page, #0F141B);
}
html.theme-dark .filter-bar:not([style]),
html[data-theme="dark"] .filter-bar:not([style]) {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

html.theme-dark .filter-tab,
html[data-theme="dark"] .filter-tab {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: #B5BFCC;
}
html.theme-dark .filter-tab:hover,
html[data-theme="dark"] .filter-tab:hover {
  border-color: #EF5350;
  color: #EF5350;
  background: rgba(239, 83, 80, 0.10);
}
html.theme-dark .filter-tab.active,
html[data-theme="dark"] .filter-tab.active {
  background: #D32F2F;
  border-color: #D32F2F;
  color: #FFFFFF;
}

html.theme-dark .category-dropdown,
html[data-theme="dark"] .category-dropdown {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.40);
}
html.theme-dark .category-option,
html[data-theme="dark"] .category-option {
  color: #ECEFF4;
}
html.theme-dark .category-option:hover,
html[data-theme="dark"] .category-option:hover {
  background: rgba(239, 83, 80, 0.12);
  color: #EF9A9A;
}
html.theme-dark .category-option.selected,
html[data-theme="dark"] .category-option.selected {
  background: rgba(239, 83, 80, 0.14);
  color: #EF9A9A;
}
html.theme-dark .category-option.disabled,
html[data-theme="dark"] .category-option.disabled {
  color: #6E7886;
}

html.theme-dark .search-box,
html[data-theme="dark"] .search-box {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: #B5BFCC;
}
html.theme-dark .search-box:focus-within,
html[data-theme="dark"] .search-box:focus-within {
  border-color: #EF5350;
}
html.theme-dark .search-input,
html[data-theme="dark"] .search-input {
  color: #ECEFF4;
}
html.theme-dark .search-input::placeholder,
html[data-theme="dark"] .search-input::placeholder {
  color: #6E7886;
}

html.theme-dark .sort-select,
html[data-theme="dark"] .sort-select {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: #ECEFF4;
}
html.theme-dark .sort-select option,
html[data-theme="dark"] .sort-select option {
  background: #1A222D;
  color: #ECEFF4;
}
html.theme-dark .sort-select:focus,
html[data-theme="dark"] .sort-select:focus {
  border-color: #EF5350;
}

/* === Article card 暗色补齐 === */
/* cover 背景由 inline 渐变绘制（亮色 palette），暗色下叠加深色遮罩压暗 */
html.theme-dark .card-cover::after,
html[data-theme="dark"] .card-cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 20, 27, 0.55) 0%, rgba(15, 20, 27, 0.78) 100%);
  pointer-events: none;
}
html.theme-dark .card-cover .status-badge,
html.theme-dark .card-cover .card-cover-initial,
html[data-theme="dark"] .card-cover .status-badge,
html[data-theme="dark"] .card-cover .card-cover-initial {
  position: relative;
  z-index: 1;
}
html.theme-dark .card-cover-initial,
html[data-theme="dark"] .card-cover-initial {
  color: rgba(255, 255, 255, 0.32);
}
html.theme-dark .source-tag,
html[data-theme="dark"] .source-tag {
  background: rgba(255, 255, 255, 0.06);
  color: #B5BFCC;
}
html.theme-dark .card-excerpt,
html[data-theme="dark"] .card-excerpt {
  color: #B5BFCC;
}
html.theme-dark .card-meta,
html[data-theme="dark"] .card-meta {
  color: #8590A0;
}
html.theme-dark .meta-category,
html[data-theme="dark"] .meta-category {
  color: #B5BFCC;
}
html.theme-dark .meta-words,
html[data-theme="dark"] .meta-words {
  color: #8590A0;
}
html.theme-dark .meta-time,
html[data-theme="dark"] .meta-time {
  color: #6E7886;
}
html.theme-dark .article-card:hover,
html[data-theme="dark"] .article-card:hover {
  border-color: rgba(239, 83, 80, 0.32);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.40), 0 2px 8px rgba(0, 0, 0, 0.24);
}


@media (max-width: 768px) {
  .welcome-text {
    max-width: calc(100vw - 48px);
  }

  .stats-primary-value {
    font-size: 48px;
  }
}

</style>
