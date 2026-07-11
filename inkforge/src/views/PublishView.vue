<script setup lang="ts">
/**
 * PublishView - 发布中心
 * 核心功能：生成带内联样式的 HTML，复制后粘贴到平台编辑器
 * 支持微信公众号、小红书、知乎三平台真实渲染
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import DOMPurify from 'dompurify'
import { useArticleStore } from '@/stores/article'
import { useEditorStore } from '@/stores/editor'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { marked } from 'marked'
import {
  themePresets,
  copySanitizedPublishRichHtmlWithExecCommand,
  copyTextToClipboard,
  copyRichHtmlToClipboard,
  copyWechatHtmlToClipboard,
  markdownToWechatWithStats,
  convertToXiaohongshu,
  convertToZhihu,
  calculateStats,
  getWechatSvgApplicationSlotModuleId,
  normalizeWechatSvgApplicationPlan,
  setWechatSvgApplicationSlot,
  SVG_MODULES,
  WECHAT_SVG_APPLICATION_SLOTS,
  xiaohongshuPresets
} from '@/services/export'
import type {
  SvgInjectionPlan,
  SvgModuleFamily,
  WechatSvgApplicationSlotId,
} from '@/services/export'
import { logger } from '@/services/error'
import { isLikelyHtmlContent, serializeHtmlToMarkdown } from '@/extensions/TyporaMode'

const router = useRouter()
const route = useRoute()
const articleStore = useArticleStore()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

const { currentContent } = storeToRefs(editorStore)
const { currentPresetId } = storeToRefs(themeStore)

// 平台选择
const platform = ref<'wechat' | 'xiaohongshu' | 'zhihu'>('wechat')

// 平台信息
const platformInfo = {
  wechat: { name: '微信公众号', icon: 'wechat', tip: '复制后粘贴到微信公众号编辑器' },
  xiaohongshu: { name: '小红书', icon: 'xiaohongshu', tip: '复制后粘贴到小红书笔记编辑器' },
  zhihu: { name: '知乎', icon: 'zhihu', tip: '复制后粘贴到知乎回答/文章编辑器' },
}

// 主题预设
const selectedPreset = ref(currentPresetId.value || 'thesis')
const quickPresets = computed(() => themePresets)

// 小红书预设
const xhsPreset = ref('xhs-fresh')
const xhsPresets = xiaohongshuPresets

// 导出选项
interface LocalExportOptions {
  macCodeBlock: boolean
  lineNumbers: boolean
  convertFootnotes: boolean
  textIndent: boolean
  enableSvgModules: boolean
  svgInjectionPlan?: SvgInjectionPlan
}

const exportOptions = ref<LocalExportOptions>({
  macCodeBlock: true,
  lineNumbers: false,
  convertFootnotes: true,
  textIndent: false,
  enableSvgModules: false,
})

function svgModuleFamilyLabel(family: SvgModuleFamily): string {
  const labels: Record<SvgModuleFamily, string> = {
    header: '标题',
    divider: '分割',
    quote: '引用',
    badge: '徽章',
    endmark: '结尾',
    cover: '封面',
    interactive: '交互',
  }
  return labels[family]
}

function getCurrentPublishWechatSvgPlan(): SvgInjectionPlan {
  return normalizeWechatSvgApplicationPlan(exportOptions.value.svgInjectionPlan)
}

function getPublishWechatSvgSlotModuleId(slotId: WechatSvgApplicationSlotId): string {
  return getWechatSvgApplicationSlotModuleId(exportOptions.value.svgInjectionPlan, slotId)
}

function handlePublishWechatSvgModulesToggle() {
  const enabled = !exportOptions.value.enableSvgModules
  exportOptions.value = {
    ...exportOptions.value,
    enableSvgModules: enabled,
    svgInjectionPlan: enabled
      ? getCurrentPublishWechatSvgPlan()
      : exportOptions.value.svgInjectionPlan,
  }
}

function handlePublishWechatSvgSlotChange(slotId: WechatSvgApplicationSlotId, event: Event) {
  const target = event.target as { value?: unknown } | null
  const moduleId = typeof target?.value === 'string' ? target.value : ''
  if (!moduleId) return

  exportOptions.value = {
    ...exportOptions.value,
    enableSvgModules: true,
    svgInjectionPlan: setWechatSvgApplicationSlot(
      exportOptions.value.svgInjectionPlan,
      slotId,
      moduleId,
    ),
  }
}

const publishWechatSvgApplicationSummary = computed(() => {
  const totalFamilies = new Set(SVG_MODULES.map(module => module.family)).size
  if (exportOptions.value.enableSvgModules) {
    const plan = getCurrentPublishWechatSvgPlan()
    const activeModules = [
      plan.cover,
      plan.headings?.find(heading => heading.level === 2)?.module,
      plan.replaceHr,
      plan.blockquote,
      plan.endmark,
    ].filter(Boolean)
    return `已启用 ${activeModules.length} 个发布中心注入位；全量试用位覆盖 ${SVG_MODULES.length} 个 SVG 模块 / ${totalFamilies} 个家族。`
  }

  return `默认关闭，不改变发布中心现有导出；开启后可选择 ${SVG_MODULES.length} 个 SVG 模块并输出到微信公众号 HTML。`
})

// 视图切换
const viewMode = ref<'preview' | 'code'>('preview')

// 生成结果
const generatedHtml = ref('')
interface LocalStats {
  wordCount: number
  readingTime: number
  codeBlockCount: number
  linkCount: number
  imageCount?: number
}

const stats = ref<LocalStats>({
  wordCount: 0,
  readingTime: 0,
  codeBlockCount: 0,
  linkCount: 0,
})

// 生成状态
const isGenerating = ref(false)

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const copySuccess = ref(false)

const EMPTY_STATS: LocalStats = {
  wordCount: 0,
  readingTime: 0,
  codeBlockCount: 0,
  linkCount: 0,
}

function getRouteArticleId(): string | null {
  const rawRouteArticleId = route.query.id
  const rawArticleId = Array.isArray(rawRouteArticleId) ? rawRouteArticleId[0] : rawRouteArticleId

  if (typeof rawArticleId !== 'string') return null

  const routeArticleId = rawArticleId.trim()
  return routeArticleId.length > 0 ? routeArticleId : null
}

async function ensurePublishRouteArticleLoaded() {
  const routeArticleId = getRouteArticleId()
  if (!routeArticleId) return
  if (currentContent.value?.articleId === routeArticleId) return

  if (!articleStore.articles.some(article => article.id === routeArticleId)) {
    await articleStore.loadArticles()
  }

  if (!articleStore.articles.some(article => article.id === routeArticleId)) {
    logger.warn('Publish route article not found', { articleId: routeArticleId })
    return
  }

  if (articleStore.selectedArticleId !== routeArticleId) {
    articleStore.selectArticle(routeArticleId)
  }
}

function normalizePublishSource(content: string): string {
  return isLikelyHtmlContent(content) ? serializeHtmlToMarkdown(content) : content
}

async function renderMarkdownToHtml(content: string): Promise<string> {
  const rendered = await marked(content)
  return DOMPurify.sanitize(rendered)
}

const publishSourceMarkdown = computed(() => {
  const source = currentContent.value?.body
  if (source === undefined || source === null) return ''

  const normalized = normalizePublishSource(source)
  return normalized.trim().length > 0 ? normalized : ''
})

const hasPublishSource = computed(() => publishSourceMarkdown.value.length > 0)

const publishTitle = computed(() => {
  const title = currentContent.value?.title?.trim()
  return title && title.length > 0 ? title : '未选择文章'
})

const emptyPublishMessage = computed(() => {
  if (currentContent.value) {
    return '当前文章还没有可发布正文。请先在工作台写入正文，保存后再进行平台发布。'
  }

  return '尚未选择可发布文章。请从工作台打开真实草稿，或先创建并保存一篇文章。'
})

// 根据平台生成 HTML
async function generateHtml() {
  isGenerating.value = true

  if (!hasPublishSource.value) {
    generatedHtml.value = ''
    stats.value = { ...EMPTY_STATS }
    isGenerating.value = false
    return
  }

  const content = publishSourceMarkdown.value

  try {
    const rawHtml = await renderMarkdownToHtml(content)

    switch (platform.value) {
      case 'wechat': {
        const preset = themePresets.find(p => p.id === selectedPreset.value) || themePresets[0]
        const result = await markdownToWechatWithStats(content, preset, {
          enableCiteStatus: exportOptions.value.convertFootnotes,
          enableLineNumbers: exportOptions.value.lineNumbers,
          enableMacCodeBlock: exportOptions.value.macCodeBlock,
          enableTextIndent: exportOptions.value.textIndent,
          enableSvgModules: exportOptions.value.enableSvgModules,
          svgInjectionPlan: exportOptions.value.svgInjectionPlan,
        })
        generatedHtml.value = result.html
        stats.value = result.stats
        break
      }
      case 'xiaohongshu': {
        generatedHtml.value = convertToXiaohongshu(rawHtml, xhsPreset.value, {
          enableLineNumbers: exportOptions.value.lineNumbers,
          enableMacCodeBlock: exportOptions.value.macCodeBlock,
        })
        stats.value = calculateStats(rawHtml, 300)
        break
      }
      case 'zhihu': {
        generatedHtml.value = convertToZhihu(rawHtml, undefined, {
          enableCodeHighlight: true,
        })
        stats.value = calculateStats(rawHtml, 300)
        break
      }
    }
  } catch (e) {
    const rawHtml = await renderMarkdownToHtml(content)
    generatedHtml.value = rawHtml
    logger.error('生成 HTML 失败', e)
  } finally {
    isGenerating.value = false
  }
}

// 监听变化自动生成
watch(() => route.query.id, () => {
  void ensurePublishRouteArticleLoaded()
}, { immediate: true })

watch([publishSourceMarkdown, selectedPreset, exportOptions, platform, xhsPreset], generateHtml, { deep: true, immediate: true })

function recordPublishExportHistory(label: string, action: 'copy' | 'download'): void {
  const title = publishTitle.value.slice(0, 120)
  settingsStore.recordExportHistory({
    platform: platform.value,
    title: `${title} · ${label}`,
    bytes: new Blob([generatedHtml.value]).size,
    action,
  })
}

// 复制富文本
async function copyRichText() {
  if (!hasPublishSource.value || generatedHtml.value.trim().length === 0) {
    showToastMessage(emptyPublishMessage.value)
    return
  }

  const info = platformInfo[platform.value]
  const copiedWithModernApi = platform.value === 'wechat'
    ? await copyWechatHtmlToClipboard(generatedHtml.value)
    : await copyRichHtmlToClipboard(generatedHtml.value)
  const copied = copiedWithModernApi || copySanitizedPublishRichHtmlWithExecCommand(generatedHtml.value)
  if (!copied) {
    logger.error('Publish rich-copy failed')
    showToastMessage('复制失败，请使用下载文件或检查富文本剪贴板权限')
    return
  }

  recordPublishExportHistory('发布中心富文本', 'copy')
  copySuccess.value = true
  showToastMessage(`已复制! ${info.tip}`)
  setTimeout(() => { copySuccess.value = false }, 2000)
}

// 复制 HTML 代码
async function copyHtmlCode() {
  if (!hasPublishSource.value || generatedHtml.value.trim().length === 0) {
    showToastMessage(emptyPublishMessage.value)
    return
  }

  const copied = await copyTextToClipboard(generatedHtml.value)
  if (!copied) {
    showToastMessage('复制失败，请手动复制')
    return
  }

  recordPublishExportHistory('HTML 代码', 'copy')
  showToastMessage('HTML 代码已复制到剪贴板')
}

function buildDownloadFileName(title: string): string {
  const invalidFileNameChars = /[<>:"/\\|?*]/g
  const withoutControlChars = Array.from(title.trim())
    .map(char => (char.charCodeAt(0) < 32 ? '-' : char))
    .join('')

  const safeTitle = withoutControlChars
    .replace(invalidFileNameChars, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

  return `${safeTitle || 'inkforge-article'}-${platform.value}.html`
}

function downloadHtmlFile() {
  if (!hasPublishSource.value || generatedHtml.value.trim().length === 0) {
    showToastMessage(emptyPublishMessage.value)
    return
  }

  try {
    const blob = new Blob([generatedHtml.value], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = buildDownloadFileName(publishTitle.value)
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    recordPublishExportHistory('发布中心 HTML', 'download')
    showToastMessage('HTML 文件已生成并触发下载')
  } catch (error) {
    logger.error('发布中心 HTML 下载失败', error)
    showToastMessage('下载失败，请稍后重试')
  }
}

function showToastMessage(message: string) {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

// 返回
function goBack() {
  const routeArticleId = getRouteArticleId()
  if (routeArticleId) {
    router.push({ path: '/workstation', query: { id: routeArticleId } })
    return
  }

  router.push('/workstation')
}

function goToThemes() {
  router.push('/themes')
}

// 初始化
onMounted(() => {
  generateHtml()
})
</script>

<template>
  <div class="publish-container">
    <!-- Header -->
    <header class="publish-header">
      <div class="header-left">
        <button
          class="back-btn"
          type="button"
          aria-label="返回工作台"
          title="返回工作台"
          @click="goBack"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 class="header-title">
          发布中心
        </h1>
        <span class="header-article-title">{{ publishTitle }}</span>
      </div>
      <div class="header-right">
        <div class="header-status">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2E7D32"
            stroke-width="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{{ hasPublishSource ? 'CSS 已内联' : '等待正文' }}</span>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="publish-main">
      <!-- Left Control Panel -->
      <aside class="publish-sidebar">
        <!-- Platform Select -->
        <section class="sidebar-section">
          <h3 class="section-title">
            目标平台
          </h3>
          <div class="platform-list">
            <button
              type="button"
              class="platform-card"
              :class="{ active: platform === 'wechat' }"
              @click="platform = 'wechat'"
            >
              <div class="platform-icon-circle wechat">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z" />
                </svg>
              </div>
              <div class="platform-info">
                <span class="platform-name">微信公众号</span>
                <span class="platform-desc">CSS 内联 + 脚注转换</span>
              </div>
            </button>
            <button
              type="button"
              class="platform-card"
              :class="{ active: platform === 'xiaohongshu' }"
              @click="platform = 'xiaohongshu'"
            >
              <div class="platform-icon-circle xiaohongshu">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 4.5A2.5 2.5 0 0 1 9.5 2H20v16.5A1.5 1.5 0 0 0 18.5 17H7.75A2.75 2.75 0 0 1 5 14.25V7a2.5 2.5 0 0 1 2-2.45Z" />
                  <path d="M9 6h8" />
                  <path d="M9 10h6" />
                  <path d="M9 14h5" />
                </svg>
              </div>
              <div class="platform-info">
                <span class="platform-name">小红书</span>
                <span class="platform-desc">清新视觉 + 简化格式</span>
              </div>
            </button>
            <button
              type="button"
              class="platform-card"
              :class="{ active: platform === 'zhihu' }"
              @click="platform = 'zhihu'"
            >
              <div class="platform-icon-circle zhihu">
                <span class="platform-text-icon">知</span>
              </div>
              <div class="platform-info">
                <span class="platform-name">知乎</span>
                <span class="platform-desc">专业排版 + 代码高亮</span>
              </div>
            </button>
          </div>
        </section>

        <!-- Theme Preset (wechat) -->
        <section
          v-if="platform === 'wechat'"
          class="sidebar-section"
        >
          <h3 class="section-title">
            排版预设
          </h3>
          <div class="preset-grid">
            <button
              v-for="preset in quickPresets"
              :key="preset.id"
              type="button"
              class="preset-item"
              :class="{ active: selectedPreset === preset.id }"
              @click="selectedPreset = preset.id"
            >
              <div
                class="preset-color-bar"
                :style="{ backgroundColor: preset.primaryColor }"
              />
              <div
                class="preset-color-dot"
                :style="{ backgroundColor: preset.primaryColor }"
              />
              <span class="preset-name">{{ preset.name }}</span>
            </button>
          </div>
          <button
            type="button"
            class="more-themes-btn"
            @click="goToThemes"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="12"
                y1="8"
                x2="12"
                y2="16"
              />
              <line
                x1="8"
                y1="12"
                x2="16"
                y2="12"
              />
            </svg>
            查看全部主题
          </button>
        </section>

        <!-- XHS Preset (xiaohongshu) -->
        <section
          v-if="platform === 'xiaohongshu'"
          class="sidebar-section"
        >
          <h3 class="section-title">
            笔记风格
          </h3>
          <div class="preset-grid">
            <button
              v-for="preset in xhsPresets"
              :key="preset.id"
              type="button"
              class="preset-item"
              :class="{ active: xhsPreset === preset.id }"
              @click="xhsPreset = preset.id"
            >
              <div
                class="preset-color-bar"
                :style="{ backgroundColor: preset.primaryColor }"
              />
              <div
                class="preset-color-dot"
                :style="{ backgroundColor: preset.primaryColor }"
              />
              <span class="preset-name">{{ preset.name }}</span>
            </button>
          </div>
        </section>

        <!-- Export Options -->
        <section class="sidebar-section">
          <h3 class="section-title">
            导出选项
          </h3>
          <div class="options-list">
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="toggle-title">
                  Mac 风格代码块
                </div>
                <div class="toggle-desc">
                  添加三色圆点标题栏
                </div>
              </div>
              <div
                class="toggle-switch"
                :class="{ on: exportOptions.macCodeBlock }"
                @click="exportOptions.macCodeBlock = !exportOptions.macCodeBlock"
              >
                <div class="toggle-knob" />
              </div>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="toggle-title">
                  代码行号
                </div>
                <div class="toggle-desc">
                  显示代码块行号
                </div>
              </div>
              <div
                class="toggle-switch"
                :class="{ on: exportOptions.lineNumbers }"
                @click="exportOptions.lineNumbers = !exportOptions.lineNumbers"
              >
                <div class="toggle-knob" />
              </div>
            </div>
            <div
              v-if="platform === 'wechat'"
              class="toggle-row"
            >
              <div class="toggle-info">
                <div class="toggle-title">
                  外链转脚注
                </div>
                <div class="toggle-desc">
                  将外部链接转为底部引用
                </div>
              </div>
              <div
                class="toggle-switch"
                :class="{ on: exportOptions.convertFootnotes }"
                @click="exportOptions.convertFootnotes = !exportOptions.convertFootnotes"
              >
                <div class="toggle-knob" />
              </div>
            </div>
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="toggle-title">
                  首行缩进
                </div>
                <div class="toggle-desc">
                  段落首行缩进 2 字符
                </div>
              </div>
              <div
                class="toggle-switch"
                :class="{ on: exportOptions.textIndent }"
                @click="exportOptions.textIndent = !exportOptions.textIndent"
              >
                <div class="toggle-knob" />
              </div>
            </div>
            <div
              v-if="platform === 'wechat'"
              class="publish-svg-options"
              aria-label="发布中心微信公众号 SVG 高级排版模块"
            >
              <div
                class="publish-svg-toggle-row"
                role="button"
                tabindex="0"
                @click="handlePublishWechatSvgModulesToggle"
                @keydown.enter.prevent="handlePublishWechatSvgModulesToggle"
                @keydown.space.prevent="handlePublishWechatSvgModulesToggle"
              >
                <div class="toggle-info">
                  <div class="toggle-title">
                    SVG 高级排版模块
                  </div>
                  <div class="toggle-desc">
                    发布中心直接应用 InkForge 自有 SVG 样式
                  </div>
                </div>
                <div
                  class="toggle-switch"
                  :class="{ on: exportOptions.enableSvgModules }"
                  aria-hidden="true"
                >
                  <div class="toggle-knob" />
                </div>
              </div>
              <p class="publish-svg-summary">
                {{ publishWechatSvgApplicationSummary }}
              </p>
              <div
                class="publish-svg-slot-grid"
                :class="{ 'publish-svg-slot-grid-disabled': !exportOptions.enableSvgModules }"
              >
                <label
                  v-for="slot in WECHAT_SVG_APPLICATION_SLOTS"
                  :key="slot.id"
                  class="publish-svg-slot"
                >
                  <span class="publish-svg-slot-label">{{ slot.label }}</span>
                  <small>{{ slot.description }}</small>
                  <select
                    class="publish-svg-select"
                    :disabled="!exportOptions.enableSvgModules"
                    :value="getPublishWechatSvgSlotModuleId(slot.id)"
                    @change="handlePublishWechatSvgSlotChange(slot.id, $event)"
                  >
                    <option
                      v-for="module in slot.modules"
                      :key="module.id"
                      :value="module.id"
                    >
                      {{ module.id }} · {{ svgModuleFamilyLabel(module.family) }}
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Stats -->
        <section class="sidebar-section">
          <h3 class="section-title">
            输出统计
          </h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ stats.wordCount }}</span>
              <span class="stat-label">字数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.readingTime }}</span>
              <span class="stat-label">阅读时间</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.codeBlockCount }}</span>
              <span class="stat-label">代码块</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.linkCount }}</span>
              <span class="stat-label">链接</span>
            </div>
          </div>
        </section>

        <!-- Action Buttons -->
        <section class="sidebar-section sidebar-actions">
          <button
            type="button"
            class="btn-copy-primary"
            :class="{ success: copySuccess }"
            :disabled="!hasPublishSource || isGenerating"
            @click="copyRichText"
          >
            <svg
              v-if="!copySuccess"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect
                x="9"
                y="9"
                width="13"
                height="13"
                rx="2"
                ry="2"
              />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ copySuccess ? '已复制!' : hasPublishSource ? '复制到剪贴板' : '等待正文' }}
          </button>
          <div class="btn-row">
            <button
              type="button"
              class="btn-secondary"
              @click="viewMode = 'code'"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              查看源码
            </button>
            <button
              type="button"
              class="btn-secondary"
              :disabled="!hasPublishSource || isGenerating"
              @click="downloadHtmlFile"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line
                  x1="12"
                  y1="15"
                  x2="12"
                  y2="3"
                />
              </svg>
              下载HTML
            </button>
          </div>
        </section>
      </aside>

      <!-- Right Preview Area -->
      <div class="publish-content">
        <!-- View Toggle Tabs -->
        <div class="view-toggle-bar">
          <div class="view-tabs-pill">
            <button
              type="button"
              class="tab-btn"
              :class="{ active: viewMode === 'preview' }"
              @click="viewMode = 'preview'"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                />
              </svg>
              预览
            </button>
            <button
              type="button"
              class="tab-btn"
              :class="{ active: viewMode === 'code' }"
              @click="viewMode = 'code'"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              源码
            </button>
          </div>
          <div class="view-toggle-spacer" />
          <div
            v-if="isGenerating"
            class="generating-indicator"
          >
            <div class="generating-spinner" />
            渲染中...
          </div>
        </div>

        <!-- Preview Mode - iPhone Device Frame -->
        <div
          v-show="viewMode === 'preview'"
          class="preview-container"
        >
          <div class="device-frame">
            <div class="device-notch" />
            <div class="device-screen">
              <!-- Status Bar -->
              <div class="device-status-bar">
                <span class="device-time">9:41</span>
                <div class="device-notch-spacer" />
                <div class="device-status-icons">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  ><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  ><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" /></svg>
                </div>
              </div>
              <!-- Platform App Bar -->
              <div
                class="device-app-bar"
                :class="platform"
              >
                <span class="device-app-title">{{ platformInfo[platform].name }}</span>
              </div>
              <!-- Rendered Content -->
              <div
                v-if="hasPublishSource"
                class="device-content"
                v-html="generatedHtml"
              />
              <div
                v-else
                class="device-content publish-empty-state"
              >
                <svg
                  width="38"
                  height="38"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line
                    x1="9"
                    y1="15"
                    x2="15"
                    y2="15"
                  />
                  <line
                    x1="9"
                    y1="18"
                    x2="13"
                    y2="18"
                  />
                </svg>
                <h2>暂无可发布正文</h2>
                <p>{{ emptyPublishMessage }}</p>
                <button
                  type="button"
                  class="empty-state-action"
                  @click="goBack"
                >
                  回到工作台
                </button>
              </div>
            </div>
            <div class="device-home-indicator" />
          </div>
        </div>

        <!-- Code Mode -->
        <div
          v-show="viewMode === 'code'"
          class="code-view-container"
        >
          <div class="code-panel">
            <div class="code-panel-header">
              <span class="code-lang-badge">{{ hasPublishSource ? 'HTML (带内联样式)' : '等待真实正文' }}</span>
              <button
                type="button"
                class="code-copy-btn"
                :disabled="!hasPublishSource || isGenerating"
                @click="copyHtmlCode"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect
                    x="9"
                    y="9"
                    width="13"
                    height="13"
                    rx="2"
                    ry="2"
                  />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                复制代码
              </button>
            </div>
            <pre
              v-if="hasPublishSource"
              class="code-content"
            ><code>{{ generatedHtml }}</code></pre>
            <div
              v-else
              class="code-empty-state"
            >
              {{ emptyPublishMessage }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Toast -->
    <div
      class="toast"
      :class="{ visible: showToast }"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════
   PublishView - 发布中心样式
   对齐原型设计语言
   ═══════════════════════════════════════ */

.publish-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAFBFC;
}

/* ═══ Header (52px) ═══ */
.publish-header {
  height: 52px;
  background: #FFFFFF;
  border-bottom: 1px solid #ECEFF1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #90A4AE;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.back-btn:hover {
  background: #FAFBFC;
  color: #263238;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #263238;
}

.header-article-title {
  font-size: 14px;
  color: #90A4AE;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #2E7D32;
  font-weight: 500;
}

/* ═══ Main Layout ═══ */
.publish-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ═══ Left Sidebar (360px) ═══ */
.publish-sidebar {
  width: 360px;
  border-right: 1px solid #ECEFF1;
  overflow-y: auto;
  flex-shrink: 0;
  background: #FFFFFF;
}

.sidebar-section {
  padding: 20px;
  border-bottom: 1px solid #F5F5F5;
}

.sidebar-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #90A4AE;
  margin-bottom: 12px;
}

/* ═══ Platform Cards ═══ */
.platform-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.platform-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border: 2px solid #ECEFF1;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.platform-card:hover {
  border-color: #CFD8DC;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.platform-card.active {
  border-color: #D32F2F;
  background: #FFEBEE;
}

.platform-icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.platform-icon-circle.wechat {
  background: #07C160;
  color: white;
}

.platform-icon-circle.xiaohongshu {
  background: #FE2C55;
  color: white;
}

.platform-icon-circle.zhihu {
  background: #0084FF;
  color: white;
}

.platform-text-icon {
  font-size: 16px;
  font-weight: 700;
  color: white;
}

.platform-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.platform-name {
  font-size: 14px;
  font-weight: 600;
  color: #263238;
}

.platform-card.active .platform-name {
  color: #D32F2F;
}

.platform-desc {
  font-size: 12px;
  color: #607D8B;
}

/* ═══ Preset Grid (2 columns) ═══ */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #FFFFFF;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
  color: #37474F;
  position: relative;
  overflow: hidden;
}

.preset-item:hover {
  border-color: #CFD8DC;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.preset-item.active {
  border-color: #D32F2F;
  background: #FFEBEE;
  color: #D32F2F;
}

.preset-color-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 0 2px 2px 0;
}

.preset-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.preset-name {
  font-size: 13px;
  font-weight: 500;
}

.more-themes-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 0;
  background: transparent;
  border: none;
  color: #D32F2F;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.more-themes-btn:hover {
  opacity: 0.75;
}

/* ═══ Toggle Rows (Export Options) ═══ */
.options-list {
  display: flex;
  flex-direction: column;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #F5F5F5;
}

.toggle-row:last-child {
  border-bottom: none;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toggle-title {
  font-size: 13px;
  font-weight: 600;
  color: #263238;
}

.toggle-desc {
  font-size: 11px;
  color: #90A4AE;
}

.toggle-switch {
  width: 40px;
  height: 20px;
  background: #E0E0E0;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-switch.on {
  background: #D32F2F;
}

.toggle-knob {
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch.on .toggle-knob {
  transform: translateX(20px);
}

.publish-svg-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #FFCDD2;
  border-radius: 10px;
  background: #FFF8F8;
}

.publish-svg-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #FFEBEE;
  cursor: pointer;
  outline: none;
}

.publish-svg-toggle-row:focus-visible {
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.18);
}

.publish-svg-summary {
  margin: 0;
  color: #607D8B;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.publish-svg-slot-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.publish-svg-slot-grid-disabled {
  opacity: 0.62;
}

.publish-svg-slot {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  min-width: 0;
  padding: 8px;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  background: #FFFFFF;
}

.publish-svg-slot-label {
  color: #263238;
  font-size: 12px;
  font-weight: 700;
}

.publish-svg-slot small {
  color: #90A4AE;
  font-size: 10px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.publish-svg-select {
  min-width: 0;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ECEFF1;
  border-radius: 7px;
  background: #FFFFFF;
  color: #263238;
  font-size: 11px;
  outline: none;
}

.publish-svg-select:disabled {
  color: #90A4AE;
  cursor: not-allowed;
}

.publish-svg-select:focus {
  border-color: #D32F2F;
}

/* ═══ Stats Grid (4 columns) ═══ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #263238;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 11px;
  color: #90A4AE;
  font-weight: 500;
}

/* ═══ Action Buttons ═══ */
.sidebar-actions {
  padding: 20px;
}

.btn-copy-primary {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #D32F2F;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.25);
}

.btn-copy-primary:hover {
  background: #B71C1C;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.35);
}

.btn-copy-primary:disabled,
.btn-secondary:disabled,
.code-copy-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
  box-shadow: none;
}

.btn-copy-primary:disabled:hover {
  background: #D32F2F;
}

.btn-secondary:disabled:hover {
  background: #FFFFFF;
  border-color: #ECEFF1;
  color: #607D8B;
}

.code-copy-btn:disabled:hover {
  background: #37474F;
  color: #B0BEC5;
}

.btn-copy-primary.success {
  background: #2E7D32;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.25);
}

.btn-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-secondary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  background: #FFFFFF;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #607D8B;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: #FAFBFC;
  border-color: #CFD8DC;
  color: #37474F;
}

/* ═══ Right Content Area ═══ */
.publish-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #FAFBFC;
}

/* ═══ View Toggle (Pill Tabs) ═══ */
.view-toggle-bar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #FFFFFF;
  border-bottom: 1px solid #ECEFF1;
  flex-shrink: 0;
}

.view-tabs-pill {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: #F5F5F5;
  border-radius: 8px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: #90A4AE;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #607D8B;
}

.tab-btn.active {
  background: #FFFFFF;
  color: #263238;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.view-toggle-spacer {
  flex: 1;
}

.generating-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #90A4AE;
  font-weight: 500;
}

.generating-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #ECEFF1;
  border-top-color: #D32F2F;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ═══ Preview Container (iPhone Device Frame) ═══ */
.preview-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 24px;
  background: #FAFBFC;
}

.device-frame {
  max-width: 375px;
  width: 100%;
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 40px;
  padding: 16px;
  min-height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  animation: deviceSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes deviceSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.device-notch {
  width: 120px;
  height: 28px;
  background: #1A1A1A;
  border-radius: 14px;
  margin: 0 auto 12px;
  flex-shrink: 0;
}

.device-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 4px;
}

.device-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 4px;
  font-size: 13px;
  font-weight: 700;
  color: #263238;
  flex-shrink: 0;
}

.device-time {
  font-size: 14px;
  font-weight: 700;
}

.device-notch-spacer {
  width: 120px;
}

.device-status-icons {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #263238;
}

.device-app-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px 12px;
  border-bottom: 1px solid #F5F5F5;
  flex-shrink: 0;
}

.device-app-title {
  font-size: 16px;
  font-weight: 700;
}

.device-app-bar.wechat .device-app-title { color: #07C160; }
.device-app-bar.xiaohongshu .device-app-title { color: #FE2C55; }
.device-app-bar.zhihu .device-app-title { color: #0084FF; }

.device-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-size: 15px;
  line-height: 1.8;
}

.publish-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 420px;
  text-align: center;
  color: #78909C;
}

.publish-empty-state svg {
  color: #B0BEC5;
}

.publish-empty-state h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.4;
  color: #263238;
}

.publish-empty-state p {
  max-width: 260px;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}

.empty-state-action {
  margin-top: 4px;
  padding: 8px 14px;
  border: 1px solid #D32F2F;
  border-radius: 999px;
  background: #FFF5F5;
  color: #B71C1C;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.empty-state-action:hover {
  background: #FFE8E8;
  transform: translateY(-1px);
}

.device-home-indicator {
  width: 134px;
  height: 5px;
  background: #BDBDBD;
  border-radius: 3px;
  margin: 12px auto 0;
  flex-shrink: 0;
}

/* v-html rendered content overrides */
.device-content :deep(section) {
  all: initial;
  display: block;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  word-break: break-word;
}

.device-content :deep(img) {
  max-width: 100% !important;
  height: auto !important;
}

.device-content :deep(pre) {
  overflow-x: auto;
  max-width: 100%;
}

.device-content :deep(table) {
  max-width: 100%;
  overflow-x: auto;
  display: block;
}

/* ═══ Code View ═══ */
.code-view-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.code-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #263238;
  border-radius: 8px;
  overflow: hidden;
}

.code-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #1E272C;
  border-bottom: 1px solid #37474F;
}

.code-lang-badge {
  font-size: 11px;
  font-weight: 600;
  color: #78909C;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.code-copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #37474F;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #B0BEC5;
  cursor: pointer;
  transition: all 0.15s;
}

.code-copy-btn:hover {
  background: #455A64;
  color: white;
}

.code-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #E0E0E0;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  max-height: 600px;
}

.code-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #90A4AE;
  font-size: 13px;
  line-height: 1.7;
  text-align: center;
}

/* ═══ Toast ═══ */
.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #263238;
  color: white;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  font-size: 13px;
  font-weight: 600;
  z-index: 9999;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast svg {
  color: #4CAF50;
  flex-shrink: 0;
}

.toast.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

/* ═══ Animations ═══ */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
