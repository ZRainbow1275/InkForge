<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Activity, Clock3, FilePlus2, FolderPlus, LayoutTemplate } from 'lucide-vue-next'
import { getDailyQuote, formatNumber } from '@/data/quotes'
import { ARTICLE_TEMPLATES } from '@/data/templates'
import { themePresets } from '@/services/export/themes'
import { resolveIconComponent } from '@/utils/lucide-icons'
import { useAIStore } from '@/stores/ai'
import { useAccountStore } from '@/stores/account'
import { useArticleStore } from '@/stores/article'
import { useAssetStore } from '@/stores/asset'
import { useCategoryStore } from '@/stores/category'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import AddCategoryModal from '@/components/category/AddCategoryModal.vue'
import DayDetailPopover from '@/components/hub/DayDetailPopover.vue'
import ArticleWaterfall from '@/components/hub/ArticleWaterfall.vue'
import CategoryDistribution from '@/components/hub/CategoryDistribution.vue'
import ContributionHeatmap from '@/components/hub/ContributionHeatmap.vue'
import ExportFrequency from '@/components/hub/ExportFrequency.vue'
import HubHeader from '@/components/hub/HubHeader.vue'
import InspirationCard from '@/components/hub/InspirationCard.vue'
import ProductivityInsights from '@/components/hub/ProductivityInsights.vue'
import QuickActionFab from '@/components/hub/QuickActionFab.vue'
import RecentActivity from '@/components/hub/RecentActivity.vue'
import SectionNav from '@/components/hub/SectionNav.vue'
import StatsDashboard from '@/components/hub/StatsDashboard.vue'
import TagCloud from '@/components/hub/TagCloud.vue'
import TemplateMarketCard from '@/components/hub/TemplateMarketCard.vue'
import WordDistribution from '@/components/hub/WordDistribution.vue'
import WordCountTrend from '@/components/hub/WordCountTrend.vue'
import WritingTimeline from '@/components/hub/WritingTimeline.vue'

interface QuotePayload {
  text: string
  author: string
}

interface ArticleWaterfallExposed {
  focusSearch: () => void
}

const router = useRouter()
const articleStore = useArticleStore()
const accountStore = useAccountStore()
const categoryStore = useCategoryStore()
const aiStore = useAIStore()
const assetStore = useAssetStore()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const { articles } = storeToRefs(articleStore)
const { avatarUrl, avatarInitial } = storeToRefs(accountStore)

const pageLoading = ref(true)
const pageError = ref<string | null>(null)
const currentDate = ref('')
const showAddCategoryModal = ref(false)
const selectedDayIndex = ref<number | null>(null)
const popoverAnchorRect = ref<globalThis.DOMRect | null>(null)
const activeSectionIndex = ref(0)
const sectionRefs = ref<Array<HTMLElement | null>>([])
const articleWaterfallRef = ref<ArticleWaterfallExposed | null>(null)
const aiInspirationLoading = ref(false)
const aiInspiration = ref<QuotePayload | null>(null)
const weekDayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

let sectionObserver: IntersectionObserver | null = null

function updateDate(): void {
  currentDate.value = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function calculateStreak(): number {
  if (articles.value.length === 0) return 0
  const activityDates = new Set(articles.value.map((article) => formatDateKey(new Date(article.updatedAt || article.createdAt))))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  for (let offset = 0; offset < 365; offset += 1) {
    const cursor = new Date(today)
    cursor.setDate(today.getDate() - offset)
    if (activityDates.has(formatDateKey(cursor))) streak += 1
    else if (offset > 0) break
  }
  return streak
}

function getMondayOfWeek(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const stats = computed(() => {
  const totalArticles = articles.value.length
  const totalWordsRaw = articles.value.reduce((sum, article) => sum + (article.rawContent?.length ?? 0), 0)
  const processed = articles.value.filter((article) => article.status === 'processed').length
  const completionRateNum = totalArticles === 0 ? 0 : Math.round((processed / totalArticles) * 100)
  return {
    totalArticles,
    totalWords: formatNumber(totalWordsRaw),
    completionRate: `${completionRateNum}%`,
    completionRateNum,
    assetCount: assetStore.assets.length,
    streak: calculateStreak(),
  }
})

const activePresetId = computed(() => settingsStore.settings.export.defaultPresetId ?? themePresets[0]?.id ?? null)
const quotePayload = computed<QuotePayload>(() => aiInspiration.value ?? getDailyQuote())
const inspirationSourceLabel = computed(() => aiInspiration.value ? 'AI 灵感生成' : '本地每日引言')

const latestArticle = computed(() => {
  if (articles.value.length === 0) return null
  return [...articles.value].sort((left, right) =>
    new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime()
  )[0]
})

const displayCategories = computed(() => categoryStore.categories.slice(0, 3).map((category, index) => ({
  ...category,
  tone: ['#E3F2FD', '#FFF3E0', '#E8F5E9'][index % 3],
  color: ['#1565C0', '#F57C00', '#2E7D32'][index % 3],
})))

const weeklyChartData = computed(() => {
  const monday = getMondayOfWeek()
  const counts = [0, 0, 0, 0, 0, 0, 0]
  articles.value.forEach((article) => {
    const articleDate = new Date(article.updatedAt || article.createdAt)
    for (let index = 0; index < 7; index += 1) {
      const dayStart = new Date(monday)
      dayStart.setDate(monday.getDate() + index)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayStart.getDate() + 1)
      if (articleDate >= dayStart && articleDate < dayEnd) {
        counts[index] += 1
        break
      }
    }
  })
  return counts
})

const weeklyTotal = computed(() => weeklyChartData.value.reduce((sum, value) => sum + value, 0))
const todayIndex = computed(() => {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
})
const selectedDayArticles = computed(() => {
  if (selectedDayIndex.value === null) return []
  const monday = getMondayOfWeek()
  const targetDate = new Date(monday)
  targetDate.setDate(monday.getDate() + selectedDayIndex.value)
  const nextDate = new Date(targetDate)
  nextDate.setDate(targetDate.getDate() + 1)
  return articles.value.filter((article) => {
    const date = new Date(article.updatedAt || article.createdAt)
    return date >= targetDate && date < nextDate
  })
})
const selectedDayTitle = computed(() => {
  if (selectedDayIndex.value === null) return ''
  const monday = getMondayOfWeek()
  const targetDate = new Date(monday)
  targetDate.setDate(monday.getDate() + selectedDayIndex.value)
  return `${weekDayLabels[selectedDayIndex.value]} · ${targetDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`
})

function isInputFocused(): boolean {
  const activeElement = document.activeElement
  return activeElement instanceof HTMLElement
    && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT' || activeElement.isContentEditable)
}

function setSectionRef(element: globalThis.Element | ComponentPublicInstance | null, index: number): void {
  sectionRefs.value[index] = element instanceof HTMLElement ? element : null
}

function setupSectionObserver(): void {
  sectionObserver?.disconnect()
  sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        const index = sectionRefs.value.indexOf(entry.target as HTMLElement)
        if (index >= 0) activeSectionIndex.value = index
      }
    }
  }, { threshold: 0.5 })
  sectionRefs.value.forEach((section) => section && sectionObserver?.observe(section))
}

function scrollToSection(index: number): void {
  sectionRefs.value[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function focusWaterfallSearchAfterScroll(): void {
  window.setTimeout(() => articleWaterfallRef.value?.focusSearch(), 360)
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  const key = event.key.toLowerCase()
  const isModifierPressed = event.ctrlKey || event.metaKey
  if (isModifierPressed && key === 'n') {
    event.preventDefault()
    void handleNewArticle()
  } else if (isModifierPressed && key === 'f') {
    event.preventDefault()
    scrollToSection(3)
    focusWaterfallSearchAfterScroll()
  } else if (event.key === '/' && !isInputFocused()) {
    event.preventDefault()
    scrollToSection(3)
    focusWaterfallSearchAfterScroll()
  }
}

function handleBarSelect(index: number, event: MouseEvent): void {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  popoverAnchorRect.value = target.getBoundingClientRect()
  selectedDayIndex.value = selectedDayIndex.value === index ? null : index
  if (selectedDayIndex.value === null) popoverAnchorRect.value = null
}

function closeDayPopover(): void {
  selectedDayIndex.value = null
  popoverAnchorRect.value = null
}

function getHeroBarHeight(count: number): string {
  const maxCount = Math.max(...weeklyChartData.value, 1)
  const percentage = (count / maxCount) * 100
  return `${Math.max(percentage, 8)}%`
}

function openArticle(articleId: string): void {
  articleStore.selectArticle(articleId)
  void router.push('/workstation')
}

function goToSettings(): void {
  void router.push('/settings')
}

function goToAccount(): void {
  void router.push('/account')
}

async function createArticleWithContent(title: string, body: string, description: string, sourceUrl: string): Promise<void> {
  const article = await articleStore.addArticle({
    title,
    sourceUrl,
    sourceName: 'InkForge',
    description,
    rawContent: body,
    categoryId: categoryStore.selectedCategoryId ?? undefined,
    tags: [],
  })
  await editorStore.createContent(article.id, article.title, body)
  articleStore.selectArticle(article.id)
  await router.push('/workstation')
}

async function handleNewArticle(): Promise<void> {
  const stamp = new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  try {
    await createArticleWithContent(`未命名文稿 ${stamp}`, '', '从 Hub 创建的空白草稿', `local://hub-draft/${Date.now()}`)
  } catch {
    pageError.value = '创建文章失败，请稍后重试。'
  }
}

async function handleCreateFromTemplate(): Promise<void> {
  const template = ARTICLE_TEMPLATES[0]
  try {
    await createArticleWithContent(`${template.name} ${new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`, template.body, template.description, `local://hub-template/${template.id}/${Date.now()}`)
  } catch {
    pageError.value = '模板创建失败，请稍后重试。'
  }
}

async function handleImportFile(): Promise<void> {
  try {
    await articleStore.importFromFiles()
  } catch {
    pageError.value = '导入文件失败，请检查文件格式后重试。'
  }
}

async function handleAddCategory(data: { name: string; icon: string }): Promise<void> {
  try {
    await categoryStore.addCategory(data.name, data.icon)
    showAddCategoryModal.value = false
  } catch {
    pageError.value = '创建分类失败，请稍后重试。'
  }
}

async function generateAIInspiration(): Promise<void> {
  if (aiInspirationLoading.value || !aiStore.isAvailable) return
  aiInspirationLoading.value = true
  try {
    const result = await aiStore.generate(
      '生成写作灵感',
      '你是一位精炼的写作灵感生成器，只返回短句和作者。',
      '生成一句关于写作、思考或表达的短句，格式为：内容|作者。'
    )
    const [text, author] = result.split('|')
    aiInspiration.value = { text: text?.trim() || result.trim(), author: author?.trim() || 'AI 灵感' }
  } catch {
    pageError.value = pageError.value ?? 'AI 灵感生成失败，已自动回退到本地引言。'
  } finally {
    aiInspirationLoading.value = false
  }
}

function persistPreset(presetId: string): void {
  settingsStore.settings.export.defaultPresetId = presetId
  settingsStore.save()
}

onMounted(async () => {
  updateDate()
  window.addEventListener('keydown', handleGlobalKeydown)
  try {
    await Promise.all([
      categoryStore.loadCategories(),
      articleStore.loadArticles(),
      assetStore.loadAssets(),
      accountStore.loadAccount(settingsStore.settings.account.profileId),
    ])
  } catch {
    pageError.value = 'Hub 数据加载失败，部分内容可能暂时不可用。'
  }
  pageLoading.value = false
  await nextTick()
  setupSectionObserver()
  void generateAIInspiration()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  sectionObserver?.disconnect()
})
</script>

<template>
  <div class="hub-page">
    <div
      v-if="pageLoading"
      class="hub-loading"
    >
      <div class="hub-loading__spinner" />
      <p class="text-sm font-semibold text-slate-500">
        正在从本地数据仓库装载 Hub
      </p>
    </div>

    <SectionNav
      :section-count="4"
      :active-index="activeSectionIndex"
      @navigate="scrollToSection"
    />

    <section
      :ref="(element) => setSectionRef(element, 0)"
      class="hub-section"
    >
      <HubHeader
        :current-date="currentDate"
        :article-count="stats.totalArticles"
        :avatar-url="avatarUrl"
        :avatar-initial="avatarInitial"
        @new-article="handleNewArticle"
        @open-settings="goToSettings"
        @open-account="goToAccount"
      />
      <div
        v-if="pageError"
        class="mx-auto mb-5 w-full max-w-[1400px] rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-700"
      >
        {{ pageError }}
      </div>
      <div class="bento-container">
        <article class="card-hero">
          <Activity
            :size="48"
            class="absolute right-6 top-6 opacity-15"
          />
          <h2 class="font-['Noto_Serif_SC'] text-[28px] font-bold">
            创作流
          </h2>
          <p class="mt-1 text-sm text-white/80">
            本周产出 {{ weeklyTotal }} 篇
          </p>
          <div class="mt-6 flex flex-1 items-end gap-3">
            <div
              v-for="(count, index) in weeklyChartData"
              :key="index"
              class="flex flex-1 flex-col items-center gap-2"
            >
              <button
                type="button"
                class="w-full rounded-lg transition-all"
                :class="[
                  index === todayIndex ? 'bg-white/40' : 'bg-white/20',
                  index === selectedDayIndex ? 'bg-white ring-2 ring-white/60' : '',
                ]"
                :style="{ height: getHeroBarHeight(count), minHeight: '8px' }"
                :title="`${weekDayLabels[index]}: ${count} 篇`"
                @click="handleBarSelect(index, $event)"
              />
              <span class="text-[10px] uppercase tracking-wider text-white/60">{{ weekDayLabels[index] }}</span>
            </div>
          </div>
          <DayDetailPopover
            v-if="selectedDayIndex !== null"
            :visible="true"
            :date-title="selectedDayTitle"
            :articles="selectedDayArticles"
            :anchor-rect="popoverAnchorRect"
            @close="closeDayPopover"
            @open-article="openArticle"
          />
        </article>

        <StatsDashboard
          class="card-stats"
          :stats="stats"
        />

        <article class="card-recent rounded-[20px] border border-slate-200 bg-white/90 p-6 backdrop-blur-xl">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Continue
          </p>
          <h3 class="mt-2 text-2xl font-bold text-slate-800">
            最近编辑
          </h3>
          <button
            v-if="latestArticle"
            type="button"
            class="mt-4 flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
            @click="openArticle(latestArticle.id)"
          >
            <span class="text-base font-bold leading-7 text-slate-800">{{ latestArticle.title }}</span>
            <span class="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><Clock3 :size="14" />{{ new Date(latestArticle.updatedAt || latestArticle.createdAt).toLocaleDateString('zh-CN') }}</span>
          </button>
          <div
            v-else
            class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400"
          >
            尚无最近编辑记录
          </div>
          <div class="mt-5 border-t border-slate-200/80 pt-5">
            <p class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Quick Create
            </p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
                @click="handleNewArticle"
              >
                <FilePlus2 :size="16" />空白草稿
              </button>
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"
                @click="handleCreateFromTemplate"
              >
                <LayoutTemplate :size="16" />从模板创建
              </button>
            </div>
          </div>
        </article>

        <article class="card-categories rounded-[20px] border border-slate-200 bg-white/90 p-6 backdrop-blur-xl">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Categories
              </p>
              <h3 class="mt-2 text-2xl font-bold text-slate-800">
                分类结构
              </h3>
            </div>
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500"
              title="添加分类"
              @click="showAddCategoryModal = true"
            >
              <FolderPlus :size="16" />
            </button>
          </div>
          <div
            v-if="displayCategories.length > 0"
            class="mt-5 grid gap-3 md:grid-cols-3"
          >
            <button
              v-for="category in displayCategories"
              :key="category.id"
              type="button"
              class="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border px-4 py-4 text-left"
              :style="{ background: category.tone, color: category.color, borderColor: category.color + '2e' }"
              @click="scrollToSection(3)"
            >
              <component
                :is="resolveIconComponent(category.icon, 'Folder')"
                :size="16"
              />
              <span class="font-bold">{{ category.name }}</span>
              <strong class="text-lg">{{ category.articleCount }}</strong>
            </button>
          </div>
          <div
            v-else
            class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400"
          >
            还没有自定义分类，先创建一个结构化写作容器。
          </div>
        </article>

        <InspirationCard
          class="card-inspiration"
          :quote="quotePayload.text"
          :author="quotePayload.author"
          :loading="aiInspirationLoading"
          :ai-available="aiStore.isAvailable"
          :source-label="inspirationSourceLabel"
          @refresh="generateAIInspiration"
          @configure="goToSettings"
        />
      </div>
    </section>

    <section
      :ref="(element) => setSectionRef(element, 1)"
      class="hub-section"
    >
      <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
            Section 2
          </p><h2 class="mt-2 text-4xl font-bold text-slate-800">
            创作工具区
          </h2>
        </div>
        <div class="grid gap-5">
          <div class="rounded-[20px] border border-slate-200 bg-white/90 p-6 backdrop-blur-xl">
            <TemplateMarketCard
              :presets="themePresets"
              :active-preset-id="activePresetId"
              @select="persistPreset"
              @apply="persistPreset"
            />
          </div>
        </div>
      </div>
    </section>

    <section
      :ref="(element) => setSectionRef(element, 2)"
      class="hub-section"
    >
      <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
            Section 3
          </p><h2 class="mt-2 text-4xl font-bold text-slate-800">
            数据洞察区
          </h2>
        </div>
        <div class="grid gap-5 xl:grid-cols-[1.85fr_1fr]">
          <ContributionHeatmap :articles="articles" />
          <ProductivityInsights
            :articles="articles"
            :categories="categoryStore.categories"
          />
        </div>
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <WordCountTrend :articles="articles" />
          <WordDistribution :articles="articles" />
          <CategoryDistribution
            :articles="articles"
            :categories="categoryStore.categories"
          />
        </div>
        <div class="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <WritingTimeline :articles="articles" />
          <div class="grid gap-5">
            <TagCloud :articles="articles" />
            <RecentActivity :articles="articles" />
          </div>
        </div>
        <ExportFrequency :articles="articles" />
      </div>
    </section>

    <section
      :ref="(element) => setSectionRef(element, 3)"
      class="hub-section hub-section--articles"
    >
      <ArticleWaterfall
        ref="articleWaterfallRef"
        :articles="articles"
        :categories="categoryStore.categories"
        @open-article="openArticle"
      />
    </section>

    <QuickActionFab
      @new-article="handleNewArticle"
      @import-file="handleImportFile"
      @from-template="handleCreateFromTemplate"
    />
    <AddCategoryModal
      :visible="showAddCategoryModal"
      @close="showAddCategoryModal = false"
      @confirm="handleAddCategory"
    />
  </div>
</template>

<style scoped>
.hub-page {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  background: radial-gradient(circle at top left, var(--accent-light, rgba(211, 47, 47, 0.08)), transparent 30%), linear-gradient(180deg, var(--bg-page, #fafbfc) 0%, var(--bg-page-secondary, #f4f6f8) 100%);
}

.hub-loading {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(250, 251, 252, 0.9);
  backdrop-filter: blur(18px);
}

.hub-loading__spinner {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 3px solid rgba(211, 47, 47, 0.14);
  border-top-color: #d32f2f;
  animation: hub-spin 0.8s linear infinite;
}

.hub-section {
  min-height: 100vh;
  padding: 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.hub-section--articles {
  min-height: 100vh;
  padding-bottom: 80px;
  justify-content: flex-start;
}

.bento-container {
  width: min(1400px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
  grid-template-areas: "hero hero stats recent" "hero hero stats recent" "cats cats insp insp";
  gap: 20px;
  height: calc(100vh - 160px);
}

.card-hero {
  grid-area: hero;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 28px;
  border-radius: 24px;
  overflow: hidden;
  color: white;
  background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%);
  box-shadow: 0 24px 48px rgba(211, 47, 47, 0.18);
}
.card-stats { grid-area: stats; }
.card-recent { grid-area: recent; }
.card-categories { grid-area: cats; }
.card-inspiration { grid-area: insp; }

@keyframes hub-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 1023px) {
  .bento-container {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto;
    grid-template-areas: "hero hero" "stats recent" "insp insp" "cats cats";
    height: auto;
  }
}

@media (max-width: 767px) {
  .hub-page { scroll-snap-type: none; }
  .hub-section {
    min-height: auto;
    padding: 20px;
    scroll-snap-align: none;
    scroll-snap-stop: normal;
  }
  .bento-container {
    grid-template-columns: 1fr;
    grid-template-areas: "hero" "stats" "recent" "cats" "insp";
  }
}

[data-theme='dark'] .hub-loading {
  background: rgba(15, 23, 42, 0.86);
}
</style>
