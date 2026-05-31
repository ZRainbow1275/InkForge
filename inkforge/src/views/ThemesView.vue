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
    thesis: '学术论文排版样张',
    legal: '法学论述排版样张',
    report: '行业研报排版样张',
    commentary: '观点评论排版样张',
    aigc: '创意写作排版样张',
    code: '技术文档排版样张',
    notes: '学习笔记排版样张',
    news: '新闻稿件排版样张',
    meme: '轻量短文排版样张',
    life: '随笔散文排版样张',
  }
  return titles[id] || '主题排版样张'
}

function getPreviewText(id: string): string {
  const texts: Record<string, string> = {
    thesis: '用于观察论文标题、摘要正文、脚注引用与长段落节奏，不包含任何真实研究结论。',
    legal: '用于观察法条引用、论证层级与庄重语气的视觉节奏，不替代真实法律文本。',
    report: '用于观察数据表述、结论段落与摘要结构的排版密度，不含任何市场数字。',
    commentary: '用于观察观点开头、短段落推进与醒目标题的呈现效果，不对应真实事件。',
    aigc: '用于观察创意标题、概念段落与行动句式的版面张力，不宣称真实功能结果。',
    code: 'const layoutToken = "inkforge"; // 用于观察等宽字体、代码块和行内代码效果',
    notes: '用于观察学习笔记中的小标题、条目、摘录与复盘段落，不引用真实书籍内容。',
    news: '用于观察新闻稿导语、事实段落与结尾提示的层级关系，不冒充新闻事实。',
    meme: '用于观察轻量短文的密集语气、短句节奏与强调样式，不包含真实推广承诺。',
    life: '用于观察随笔段落、柔和标题与引用块之间的留白关系，不代表真实个人经历。',
  }
  return texts[id] || '用于观察主题排版结构的样张文本，不包含真实业务数据。'
}

// 选中主题的完整数据
const selectedThemeData = computed(() => {
  return themes.value.find(t => t.id === selectedPreset.value) || themes.value[0]
})

// 预览区 HTML（排版样张渲染，不冒充真实业务数据）
const previewHtml = computed(() => {
  const t = selectedThemeData.value
  const accentColor = t.primaryColor
  return `<h2 style="color: ${accentColor}; border-bottom: 2px solid ${accentColor}; padding-bottom: 8px; margin-bottom: 16px; font-size: 18px; font-weight: 700;">排版效果预览</h2>
<p style="margin-bottom: 14px; line-height: 1.8; color: #37474F;">这是一段排版样张正文，仅用于观察 <strong style="font-weight: 700;">加粗</strong>、<em>斜体</em>、行内代码 <code style="background: ${accentColor}18; color: ${accentColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.9em;">layoutToken</code> 与段落留白效果，不代表真实业务数据。</p>
<blockquote style="border-left: 4px solid ${accentColor}; background: ${accentColor}0a; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; color: #37474F; font-style: italic;">引用块用于检验主题的引用层级、边线与背景透明度，不冒充真实摘录。</blockquote>
<h3 style="color: ${accentColor}; margin: 20px 0 12px; font-size: 15px; font-weight: 600;">代码排版</h3>
<pre style="background: #1E1E1E; color: #D4D4D4; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; overflow-x: auto; margin-bottom: 16px;"><code><span style="color: #569CD6;">const</span> <span style="color: #9CDCFE;">layoutToken</span> = <span style="color: #CE9178;">"inkforge"</span>;
<span style="color: #9CDCFE;">renderThemePreview</span>(<span style="color: #9CDCFE;">layoutToken</span>);</code></pre>
<ul style="margin: 12px 0; padding-left: 20px; color: #37474F; line-height: 2;">
  <li>标题层级样张</li>
  <li>段落节奏样张</li>
  <li>引用与代码样张</li>
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
          type="button"
          class="back-btn"
          aria-label="返回上一页"
          title="返回上一页"
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
        type="button"
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
          <button
            v-for="theme in themes"
            :key="theme.id"
            type="button"
            class="theme-card"
            :class="{ active: selectedPreset === theme.id }"
            :aria-pressed="selectedPreset === theme.id"
            :aria-label="`选择主题：${theme.name}`"
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
          </button>
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
            type="button"
            class="btn-apply"
            @click="applyPreset"
          >
            应用此主题
          </button>
          <button
            type="button"
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
  background: var(--bg-rice-paper, #FAFBFC);
}

/* ═══ HEADER ═══ */
.themes-header {
  height: 52px;
  background: var(--bg-surface, #FFFFFF);
  border-bottom: 1px solid var(--hairline, #ECEFF1);
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
  border: 1px solid var(--hairline, #ECEFF1);
  cursor: pointer;
  color: var(--text-secondary, #607D8B);
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    border-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
}

.back-btn:hover {
  background: var(--accent-primary-light, #FFEBEE);
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #263238);
}

.header-apply-btn {
  padding: 6px 20px;
  background: var(--accent-primary, #D32F2F);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart);
}

.header-apply-btn:hover {
  background: var(--accent-primary-dark, #B71C1C);
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
  appearance: none;
  width: 100%;
  padding: 0;
  position: relative;
  background: var(--bg-surface, #FFFFFF);
  border: 2px solid transparent;
  border-radius: 12px;
  color: inherit;
  font: inherit;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-base) var(--ease-out-quart),
    border-color var(--motion-base) var(--ease-out-quart),
    transform var(--motion-base) var(--ease-out-quart);
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
  transform: translateY(-1px);
  box-shadow: var(--elev-2);
}

.theme-card.active {
  border-color: var(--accent-primary, #D32F2F);
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
  background: var(--accent-primary, #D32F2F);
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
  color: var(--text-primary, #263238);
  margin-bottom: 4px;
}

.theme-card-tags {
  display: flex;
  gap: 6px;
}

.tag-pill {
  font-size: 10px;
  background: var(--bg-rice-paper, #F5F5F5);
  color: var(--text-secondary, #607D8B);
  padding: 2px 8px;
  border-radius: 10px;
}

.theme-card-preview {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
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
  background: var(--bg-surface, #FFFFFF);
  border-left: 1px solid var(--hairline, #ECEFF1);
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
  color: var(--text-primary, #263238);
  margin-bottom: 4px;
}

.preview-panel-desc {
  font-size: 13px;
  color: var(--text-secondary, #607D8B);
}

/* Render Area — 样张预览场（砚白纸面） */
.preview-render-area {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--hairline, #ECEFF1);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  background: var(--paper-warm, #F7F4EF);
}

.preview-render-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #37474F);
}

/* Action Buttons */
.preview-panel-actions {
  flex-shrink: 0;
}

.btn-apply {
  width: 100%;
  height: 42px;
  background: var(--accent-primary, #D32F2F);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart);
}

.btn-apply:hover {
  background: var(--accent-primary-dark, #B71C1C);
  box-shadow: var(--glow-ember);
  transform: translateY(-1px);
}

.btn-cancel {
  width: 100%;
  height: 38px;
  background: transparent;
  border: 1px solid var(--hairline, #ECEFF1);
  color: var(--text-secondary, #607D8B);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    border-color var(--motion-fast) var(--ease-out-quart);
}

.btn-cancel:hover {
  background: var(--bg-rice-paper, #FAFBFC);
  border-color: var(--hairline, #CFD8DC);
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
