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

// 10 种主题预设
const themes = computed(() => ARTICLE_PRESETS.map(preset => ({
  ...preset,
  // 预览文本
  previewTitle: getPreviewTitle(preset.id),
  previewText: getPreviewText(preset.id),
})))

function getPreviewTitle(id: string): string {
  const titles: Record<string, string> = {
    thesis: '论文翻译：学术严谨',
    legal: '法学研讨：庄重权威',
    report: '行业研报：数据可视',
    news: '时事点评：犀利观点',
    aigc: 'AIGC 创意：科技未来',
    code: '编程创造：极客美学',
    note: '学习笔记：清新简约',
    dark: '纯黑新闻：高端大气',
    meme: '整活风格：幽默诙谐',
    life: '人生感悟：温暖治愈',
    default: '默认主题：经典平衡',
  }
  return titles[id] || '主题预览'
}

function getPreviewText(id: string): string {
  const texts: Record<string, string> = {
    thesis: '本文基于对 2024 年最新研究成果的深入分析，探讨了人工智能在自然语言处理领域的前沿进展...',
    legal: '根据《中华人民共和国民法典》第一百四十三条规定，具备下列条件的民事法律行为有效...',
    report: '2024 年 Q1 季度，全球智能手机市场出货量达 2.89 亿台，同比增长 7.8%。其中，中国市场...',
    news: '当我们审视这一决策背后的深层逻辑，会发现一个耐人寻味的现象。政策制定者们似乎正在...',
    aigc: '想象一下，当 AI 能够理解你的创意意图，并在几秒钟内将其转化为精美的视觉作品...',
    code: 'function quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[0];\n  ...',
    note: '今天学习了 React Hooks 的核心概念，useState 和 useEffect 是最常用的两个 Hook...',
    dark: '独家深度调查：揭开某行业不为人知的秘密。经过三个月的卧底采访，记者发现...',
    meme: '家人们谁懂啊！这个功能也太好用了吧！！！用了之后效率直接提升 200%，不用真的会后悔...',
    life: '生活不是等待风暴过去，而是学会在雨中跳舞。每一个平凡的日子里，都藏着值得珍惜的小确幸...',
    default: '这是一段示例文本，用于展示默认主题的排版效果。优雅的设计，从细节开始...',
  }
  return texts[id] || '示例文本内容...'
}

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
      <button class="back-btn" @click="cancel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        返回
      </button>
      <h1 class="header-title">选择主题</h1>
      <button class="apply-btn" @click="applyPreset">
        应用主题
      </button>
    </header>

    <!-- Main -->
    <main class="themes-main">
      <!-- Theme Grid -->
      <div class="themes-grid">
        <div 
          v-for="theme in themes" 
          :key="theme.id"
          class="theme-card"
          :class="{ active: selectedPreset === theme.id }"
          @click="selectPreset(theme.id)"
        >
          <!-- Color Bar -->
          <div class="theme-bar" :style="{ backgroundColor: theme.primaryColor }"></div>
          
          <!-- Preview -->
          <div class="theme-preview">
            <h3 class="preview-title" :style="{ color: theme.primaryColor }">{{ theme.previewTitle }}</h3>
            <p class="preview-text">{{ theme.previewText }}</p>
          </div>

          <!-- Footer -->
          <div class="theme-footer">
            <div class="theme-meta">
              <span class="theme-name">{{ theme.name }}</span>
              <span class="theme-font">{{ theme.fontFamily === 'serif' ? '宋体' : theme.fontFamily === 'sans' ? '黑体' : '楷体' }}</span>
            </div>
            <div class="theme-check" v-if="selectedPreset === theme.id">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.themes-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-rice-paper);
}

/* Header */
.themes-header {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 var(--space-medium);
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-medium);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.back-btn:hover {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.apply-btn {
  padding: 8px 20px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: var(--radius-medium);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.25);
}

.apply-btn:hover {
  background: var(--accent-primary-dark);
  transform: translateY(-1px);
}

/* Main */
.themes-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-large);
}

/* Grid */
.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-medium);
  max-width: 1200px;
  margin: 0 auto;
}

/* Card */
.theme-card {
  background: var(--bg-surface);
  border-radius: var(--radius-large);
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
  box-shadow: var(--shadow-soft);
}

.theme-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-medium);
}

.theme-card.active {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 4px var(--accent-primary-light), var(--shadow-medium);
}

.theme-bar {
  height: 6px;
}

.theme-preview {
  padding: var(--space-medium);
  height: 140px;
  overflow: hidden;
}

.preview-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: var(--space-small);
  line-height: 1.4;
}

.preview-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.theme-footer {
  padding: var(--space-medium);
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-rice-paper);
}

.theme-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.theme-font {
  font-size: 11px;
  color: var(--text-muted);
}

.theme-check {
  width: 24px;
  height: 24px;
  background: var(--accent-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .themes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
