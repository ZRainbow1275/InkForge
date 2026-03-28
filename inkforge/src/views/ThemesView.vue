<script setup lang="ts">
/**
 * ThemesView - 主题选择器
 * 展示 10 种主题预设，点击应用后跳转回工作站
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useThemeStore, ARTICLE_PRESETS } from '@/stores/theme'

const router = useRouter()
const themeStore = useThemeStore()
const { currentPresetId } = storeToRefs(themeStore)

// 当前选中的预设（预览用）
const selectedPreset = ref(currentPresetId.value)

// 主题描述映射
function getDescription(id: string): string {
  const descriptions: Record<string, string> = {
    thesis: '学术严谨，苏联红色调',
    legal: '权威庄重，藏青主色',
    report: '商务专业，商务蓝',
    commentary: '犀利观点，新闻红',
    aigc: '科技前沿，赛博紫',
    code: '极客风格，终端绿',
    notes: '温暖活泼，橙色调',
    news: '经典黑白，极简风',
    meme: '活力四射，粉色系',
    life: '淡雅宁静，灰绿色调',
  }
  return descriptions[id] || '自定义主题'
}

// 字体类型标签
function getFontLabel(family: 'sans' | 'serif' | 'mono'): string {
  const labels: Record<string, string> = {
    sans: '无衬线',
    serif: '衬线',
    mono: '等宽',
  }
  return labels[family] || family
}

// 基础主题标签
function getBaseThemeLabel(theme: 'default' | 'grace' | 'simple'): string {
  const labels: Record<string, string> = {
    default: '默认',
    grace: '优雅',
    simple: '简约',
  }
  return labels[theme] || theme
}

// 10 种主题预设（带扩展字段）
const themes = computed(() => ARTICLE_PRESETS.map(preset => ({
  ...preset,
  description: getDescription(preset.id),
  fontLabel: getFontLabel(preset.fontFamily),
  baseThemeLabel: getBaseThemeLabel(preset.baseTheme),
  previewTitle: getPreviewTitle(preset.id),
  previewText: getPreviewText(preset.id),
})))

function getPreviewTitle(id: string): string {
  const titles: Record<string, string> = {
    thesis: '论深度学习在自然语言理解中的应用',
    legal: '论数字时代的知识产权保护边界',
    report: '2024 年新能源汽车市场深度分析',
    commentary: '深度解读：全球科技竞争新格局',
    aigc: 'Prompt 工程：与 AI 对话的艺术',
    code: '从零构建一个现代前端工程化体系',
    notes: '《设计心理学》读书笔记精华摘录',
    news: '财经观察：市场波动中的投资策略',
    meme: '我用 AI 画了一百张猫咪表情包',
    life: '放下执念，方能轻装前行',
  }
  return titles[id] || '主题预览'
}

function getPreviewText(id: string): string {
  const texts: Record<string, string> = {
    thesis: '本文基于对 2024 年最新研究成果的深入分析，探讨了人工智能在自然语言处理领域的前沿进展...',
    legal: '根据《中华人民共和国民法典》第一百四十三条规定，具备下列条件的民事法律行为有效...',
    report: '2024 年 Q1 季度，全球智能手机市场出货量达 2.89 亿台，同比增长 7.8%。其中，中国市场...',
    commentary: '当我们审视这一决策背后的深层逻辑，会发现一个耐人寻味的现象。政策制定者们似乎正在...',
    aigc: '想象一下，当 AI 能够理解你的创意意图，并在几秒钟内将其转化为精美的视觉作品...',
    code: 'function quickSort(arr) { if (arr.length <= 1) return arr; const pivot = arr[0]; ...',
    notes: '今天学习了 React Hooks 的核心概念，useState 和 useEffect 是最常用的两个 Hook...',
    news: '独家深度调查：揭开某行业不为人知的秘密。经过三个月的卧底采访，记者发现...',
    meme: '家人们谁懂啊！这个功能也太好用了吧！！！用了之后效率直接提升 200%，不用真的会后悔...',
    life: '生活不是等待风暴过去，而是学会在雨中跳舞。每一个平凡的日子里，都藏着值得珍惜的小确幸...',
  }
  return texts[id] || '示例文本内容...'
}

// 选中主题的完整数据
const selectedThemeData = computed(() => {
  return themes.value.find(t => t.id === selectedPreset.value) || themes.value[0]
})

// 预览区 HTML（示例 Markdown 渲染）
const previewHtml = computed(() => {
  const t = selectedThemeData.value
  const accentColor = t.primaryColor
  return `<h2 style="color: ${accentColor}; border-bottom: 2px solid ${accentColor}; padding-bottom: 8px; margin-bottom: 16px; font-size: 18px; font-weight: 700;">排版效果预览</h2>
<p style="margin-bottom: 14px; line-height: 1.8; color: #37474F;">这是一段正文示例，展示 <strong style="font-weight: 700;">加粗</strong> 和 <em>斜体</em> 效果。行内代码 <code style="background: ${accentColor}18; color: ${accentColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.9em;">console.log()</code> 也会按主题渲染。</p>
<blockquote style="border-left: 4px solid ${accentColor}; background: ${accentColor}0a; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; color: #37474F; font-style: italic;">引用块展示主题的引用样式。好的设计是尽可能少的设计。</blockquote>
<h3 style="color: ${accentColor}; margin: 20px 0 12px; font-size: 15px; font-weight: 600;">代码高亮</h3>
<pre style="background: #1E1E1E; color: #D4D4D4; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; overflow-x: auto; margin-bottom: 16px;"><code><span style="color: #569CD6;">const</span> <span style="color: #9CDCFE;">theme</span> = <span style="color: #CE9178;">"elegant"</span>;
<span style="color: #9CDCFE;">console</span>.<span style="color: #DCDCAA;">log</span>(<span style="color: #9CDCFE;">theme</span>);</code></pre>
<ul style="margin: 12px 0; padding-left: 20px; color: #37474F; line-height: 2;">
  <li>列表项一</li>
  <li>列表项二</li>
  <li>列表项三</li>
</ul>`
})

// 选择预设（预览）
function selectPreset(presetId: string) {
  selectedPreset.value = presetId
}

// 应用预设
function applyPreset() {
  themeStore.applyPreset(selectedPreset.value)
  router.push('/workstation')
}

// 取消
function cancel() {
  router.back()
}
</script>

<template>
  <div class="themes-container">
    <!-- Header -->
    <header class="themes-header">
      <div class="header-left">
        <button
          class="back-btn"
          @click="cancel"
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
          主题中心
        </h1>
      </div>
      <button
        class="header-apply-btn"
        @click="applyPreset"
      >
        应用
      </button>
    </header>

    <!-- Main: Left Grid + Right Preview -->
    <div class="themes-body">
      <!-- Left: Theme Grid -->
      <div class="themes-grid-wrapper">
        <div class="themes-grid">
          <div
            v-for="theme in themes"
            :key="theme.id"
            class="theme-card"
            :class="{ active: selectedPreset === theme.id }"
            @click="selectPreset(theme.id)"
          >
            <!-- Color Bar -->
            <div
              class="theme-color-bar"
              :style="{ backgroundColor: theme.primaryColor }"
            />

            <!-- Current Badge -->
            <span
              v-if="currentPresetId === theme.id"
              class="current-badge"
            >当前</span>

            <!-- Card Content -->
            <div class="theme-card-content">
              <div class="theme-card-name">
                {{ theme.name }}
              </div>
              <div class="theme-card-tags">
                <span class="tag-pill">{{ theme.baseThemeLabel }}</span>
                <span class="tag-pill">{{ theme.fontLabel }}</span>
              </div>
              <p class="theme-card-preview">
                {{ theme.previewText }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Preview Panel -->
      <aside class="preview-panel">
        <div class="preview-panel-header">
          <h2 class="preview-panel-title">
            {{ selectedThemeData.name }}
          </h2>
          <p class="preview-panel-desc">
            {{ selectedThemeData.description }}
          </p>
        </div>

        <div class="preview-render-area">
          <div
            class="preview-render-content"
            v-html="previewHtml"
          />
        </div>

        <div class="preview-panel-actions">
          <button
            class="btn-apply"
            @click="applyPreset"
          >
            应用此主题
          </button>
          <button
            class="btn-cancel"
            @click="cancel"
          >
            取消
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ═══ PAGE CONTAINER ═══ */
.themes-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAFBFC;
}

/* ═══ HEADER ═══ */
.themes-header {
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
  border-radius: 8px;
  background: transparent;
  border: 1px solid #ECEFF1;
  cursor: pointer;
  color: #607D8B;
  transition: all 0.15s;
}

.back-btn:hover {
  background: #FFEBEE;
  border-color: #D32F2F;
  color: #D32F2F;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #263238;
}

.header-apply-btn {
  padding: 6px 20px;
  background: #D32F2F;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.header-apply-btn:hover {
  background: #B71C1C;
}

/* ═══ BODY: GRID + PREVIEW ═══ */
.themes-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ═══ LEFT: GRID WRAPPER ═══ */
.themes-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* ═══ THEME CARD ═══ */
.theme-card {
  position: relative;
  background: #FFFFFF;
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  animation: cardSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.theme-card:nth-child(1)  { animation-delay: 0.05s; }
.theme-card:nth-child(2)  { animation-delay: 0.10s; }
.theme-card:nth-child(3)  { animation-delay: 0.15s; }
.theme-card:nth-child(4)  { animation-delay: 0.20s; }
.theme-card:nth-child(5)  { animation-delay: 0.25s; }
.theme-card:nth-child(6)  { animation-delay: 0.30s; }
.theme-card:nth-child(7)  { animation-delay: 0.35s; }
.theme-card:nth-child(8)  { animation-delay: 0.40s; }
.theme-card:nth-child(9)  { animation-delay: 0.45s; }
.theme-card:nth-child(10) { animation-delay: 0.50s; }

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.theme-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.theme-card.active {
  border-color: #D32F2F;
}

/* Color Bar */
.theme-color-bar {
  height: 4px;
  width: 100%;
}

/* Current Badge */
.current-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #D32F2F;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  z-index: 1;
}

/* Card Content */
.theme-card-content {
  padding: 20px;
}

.theme-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #263238;
  margin-bottom: 4px;
}

.theme-card-tags {
  display: flex;
  gap: 6px;
}

.tag-pill {
  font-size: 10px;
  background: #F5F5F5;
  color: #607D8B;
  padding: 2px 8px;
  border-radius: 10px;
}

.theme-card-preview {
  font-size: 12px;
  color: #90A4AE;
  margin-top: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ═══ RIGHT: PREVIEW PANEL ═══ */
.preview-panel {
  width: 400px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: calc(100vh - 52px);
  background: #FFFFFF;
  border-left: 1px solid #ECEFF1;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.preview-panel-header {
  margin-bottom: 20px;
}

.preview-panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #263238;
  margin-bottom: 4px;
}

.preview-panel-desc {
  font-size: 13px;
  color: #607D8B;
}

/* Render Area */
.preview-render-area {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #ECEFF1;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
}

.preview-render-content {
  font-size: 14px;
  line-height: 1.7;
  color: #37474F;
}

/* Action Buttons */
.preview-panel-actions {
  flex-shrink: 0;
}

.btn-apply {
  width: 100%;
  height: 42px;
  background: #D32F2F;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-apply:hover {
  background: #B71C1C;
}

.btn-cancel {
  width: 100%;
  height: 38px;
  background: transparent;
  border: 1px solid #ECEFF1;
  color: #607D8B;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: #FAFBFC;
  border-color: #CFD8DC;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1000px) {
  .preview-panel {
    display: none;
  }
  .themes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .themes-grid {
    grid-template-columns: 1fr;
  }
  .themes-grid-wrapper {
    padding: 16px;
  }
}
</style>
