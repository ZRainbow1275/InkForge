<script setup lang="ts">
/**
 * PublishView - 发布中心
 * 核心功能：生成带内联样式的 HTML，复制后粘贴到平台编辑器
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useThemeStore, ARTICLE_PRESETS } from '@/stores/theme'
import { marked } from 'marked'
import { themePresets, convertToWechatWithStats } from '@/services/export'
import { logger } from '@/services/error'

const router = useRouter()
const editorStore = useEditorStore()
const themeStore = useThemeStore()

const { currentContent } = storeToRefs(editorStore)
const { currentPresetId } = storeToRefs(themeStore)

// 平台选择
const platform = ref<'wechat' | 'xiaohongshu' | 'zhihu'>('wechat')

// 主题预设
const selectedPreset = ref(currentPresetId.value || 'default')
const quickPresets = computed(() => ARTICLE_PRESETS.slice(0, 5))

// 导出选项（使用本地类型，映射到 export.ts 的格式）
interface LocalExportOptions {
  macCodeBlock: boolean
  lineNumbers: boolean
  convertFootnotes: boolean
  textIndent: boolean
}

const exportOptions = ref<LocalExportOptions>({
  macCodeBlock: true,
  lineNumbers: false,
  convertFootnotes: true,
  textIndent: false,
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

// Toast
const showToast = ref(false)
const toastMessage = ref('')

// 示例内容（实际应从 editorStore 获取）
const sampleContent = `# 2024 年终总结

这是一段示例文章，用于展示发布中心的功能。

## 第一章：开始

当我们审视 2024 年的设计趋势，会发现一个有趣的现象。

> 设计不仅仅是外表和感觉。设计是关于它如何工作的。

### 代码示例

\`\`\`javascript
function hello() {
  // Hello InkForge!
}
\`\`\`

更多内容请访问 [官网](https://example.com)。
`

// 生成 HTML
async function generateHtml() {
  const content = currentContent.value?.body || sampleContent
  const rawHtml = await marked(content)
  // 使用 themePresets 中的预设（与 export.ts 兼容）
  const preset = themePresets.find(p => p.id === selectedPreset.value) || themePresets[0]
  
  try {
    // 将本地选项映射到 export.ts 的格式
    const result = convertToWechatWithStats(rawHtml, preset, {
      enableCiteStatus: exportOptions.value.convertFootnotes,
      enableLineNumbers: exportOptions.value.lineNumbers,
    })
    generatedHtml.value = result.html
    stats.value = result.stats
  } catch (e) {
    generatedHtml.value = rawHtml
    logger.error('生成 HTML 失败', e)
  }
}

// 监听变化自动生成
watch([selectedPreset, exportOptions, platform], generateHtml, { deep: true, immediate: true })

// 复制富文本
async function copyRichText() {
  try {
    const blob = new Blob([generatedHtml.value], { type: 'text/html' })
    const clipboardItem = new ClipboardItem({ 'text/html': blob })
    await navigator.clipboard.write([clipboardItem])
    showToastMessage('已复制! 现在粘贴到微信公众号编辑器即可')
  } catch (e) {
    // Fallback: 使用 execCommand
    const container = document.createElement('div')
    container.innerHTML = generatedHtml.value
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    document.body.appendChild(container)
    
    const range = document.createRange()
    range.selectNodeContents(container)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    
    document.execCommand('copy')
    document.body.removeChild(container)
    showToastMessage('已复制! 现在粘贴到微信公众号编辑器即可')
  }
}

// 复制 HTML 代码
async function copyHtmlCode() {
  try {
    await navigator.clipboard.writeText(generatedHtml.value)
    showToastMessage('HTML 代码已复制到剪贴板')
  } catch (e) {
    logger.error('复制失败', e)
    showToastMessage('复制失败，请手动复制')
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
      <button class="back-btn" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        返回编辑
      </button>
      <h1 class="header-title">发布中心</h1>
      <div class="header-actions">
        <button class="copy-code-btn" @click="copyHtmlCode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          复制 HTML
        </button>
        <button class="copy-rich-btn" @click="copyRichText">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          复制富文本
        </button>
      </div>
    </header>

    <!-- Main -->
    <main class="publish-main">
      <!-- Sidebar -->
      <aside class="publish-sidebar frosted-panel">
        <!-- Platform -->
        <section class="sidebar-section">
          <h3 class="section-title">目标平台</h3>
          <div class="platform-list">
            <button 
              class="platform-item" 
              :class="{ active: platform === 'wechat' }"
              @click="platform = 'wechat'"
            >
              <div class="platform-icon wechat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/>
                </svg>
              </div>
              <span>微信公众号</span>
            </button>
            <button 
              class="platform-item" 
              :class="{ active: platform === 'xiaohongshu' }"
              @click="platform = 'xiaohongshu'"
            >
              <div class="platform-icon xiaohongshu">📕</div>
              <span>小红书</span>
            </button>
            <button 
              class="platform-item" 
              :class="{ active: platform === 'zhihu' }"
              @click="platform = 'zhihu'"
            >
              <div class="platform-icon zhihu">知</div>
              <span>知乎</span>
            </button>
          </div>
        </section>

        <!-- Theme Preset -->
        <section class="sidebar-section">
          <h3 class="section-title">快速主题</h3>
          <div class="preset-list">
            <button 
              v-for="preset in quickPresets" 
              :key="preset.id"
              class="preset-item"
              :class="{ active: selectedPreset === preset.id }"
              @click="selectedPreset = preset.id"
            >
              <div class="preset-color" :style="{ backgroundColor: preset.primaryColor }"></div>
              <span>{{ preset.name }}</span>
            </button>
          </div>
          <button class="more-themes-btn" @click="goToThemes">
            查看全部 10 种 →
          </button>
        </section>

        <!-- Export Options -->
        <section class="sidebar-section">
          <h3 class="section-title">导出选项</h3>
          <div class="options-list">
            <label class="option-item">
              <input type="checkbox" v-model="exportOptions.macCodeBlock">
              <span>Mac 风格代码块</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="exportOptions.lineNumbers">
              <span>代码行号</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="exportOptions.convertFootnotes">
              <span>外链转脚注</span>
            </label>
            <label class="option-item">
              <input type="checkbox" v-model="exportOptions.textIndent">
              <span>段落首行缩进</span>
            </label>
          </div>
        </section>

        <!-- Stats -->
        <section class="sidebar-section">
          <h3 class="section-title">输出统计</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ stats.wordCount }}</span>
              <span class="stat-label">字数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.readingTime }}</span>
              <span class="stat-label">分钟</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.codeBlockCount }}</span>
              <span class="stat-label">代码块</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.linkCount }}</span>
              <span class="stat-label">外链</span>
            </div>
          </div>
        </section>
      </aside>

      <!-- Content Area -->
      <div class="publish-content">
        <!-- View Toggle -->
        <div class="view-toggle">
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'preview' }"
            @click="viewMode = 'preview'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            预览
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'code' }"
            @click="viewMode = 'code'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            HTML 代码
          </button>
        </div>

        <!-- Preview Mode -->
        <div v-show="viewMode === 'preview'" class="preview-container">
          <div class="preview-paper" v-html="generatedHtml"></div>
        </div>

        <!-- Code Mode -->
        <div v-show="viewMode === 'code'" class="code-container">
          <pre class="code-block"><code>{{ generatedHtml }}</code></pre>
        </div>
      </div>
    </main>

    <!-- Toast -->
    <div class="toast" :class="{ visible: showToast }">
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped>
.publish-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-rice-paper);
}

/* Header */
.publish-header {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 var(--space-medium);
  gap: var(--space-medium);
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
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: var(--space-small);
}

.copy-code-btn,
.copy-rich-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-medium);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.copy-code-btn {
  background: var(--bg-rice-paper);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.copy-code-btn:hover {
  background: var(--bg-surface);
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.copy-rich-btn {
  background: var(--accent-primary);
  border: none;
  color: white;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.25);
}

.copy-rich-btn:hover {
  background: var(--accent-primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.35);
}

/* Main */
.publish-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Sidebar */
.publish-sidebar {
  width: 280px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-section {
  padding: var(--space-medium);
  border-bottom: 1px solid var(--border-light);
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: var(--space-medium);
}

/* Platform */
.platform-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
}

.platform-item {
  display: flex;
  align-items: center;
  gap: var(--space-medium);
  padding: var(--space-small) var(--space-medium);
  border-radius: var(--radius-medium);
  background: var(--bg-rice-paper);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
  color: var(--text-secondary);
}

.platform-item:hover {
  background: var(--bg-surface);
  border-color: var(--border);
}

.platform-item.active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.platform-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.platform-icon.wechat {
  background: #07C160;
  color: white;
}

.platform-icon.xiaohongshu {
  background: #FE2C55;
}

.platform-icon.zhihu {
  background: #0066FF;
  color: white;
  font-weight: 700;
  font-size: 12px;
}

/* Presets */
.preset-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
}

.preset-item {
  display: flex;
  align-items: center;
  gap: var(--space-small);
  padding: var(--space-small) var(--space-medium);
  border-radius: var(--radius-medium);
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
  color: var(--text-secondary);
}

.preset-item:hover {
  background: var(--bg-rice-paper);
  border-color: var(--text-muted);
}

.preset-item.active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.preset-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.more-themes-btn {
  margin-top: var(--space-small);
  padding: var(--space-small);
  background: transparent;
  border: none;
  color: var(--accent-primary);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}

.more-themes-btn:hover {
  text-decoration: underline;
}

/* Options */
.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
}

.option-item {
  display: flex;
  align-items: center;
  gap: var(--space-small);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.option-item input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-primary);
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-small);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-small);
  background: var(--bg-rice-paper);
  border-radius: var(--radius-medium);
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Content */
.publish-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-toggle {
  display: flex;
  gap: 4px;
  padding: var(--space-medium);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-medium);
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn:hover {
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
}

.toggle-btn.active {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

/* Preview */
.preview-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-large);
  display: flex;
  justify-content: center;
}

.preview-paper {
  width: 100%;
  max-width: 680px;
  background: var(--bg-surface);
  border-radius: var(--radius-medium);
  box-shadow: var(--shadow-soft);
  padding: var(--space-large);
  font-family: var(--font-serif);
  font-size: 16px;
  line-height: 1.8;
}

/* Code */
.code-container {
  flex: 1;
  overflow: auto;
  padding: var(--space-medium);
  background: #1E1E1E;
}

.code-block {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: #D4D4D4;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  padding: 12px 24px;
  background: var(--text-primary);
  color: white;
  border-radius: var(--radius-medium);
  box-shadow: var(--shadow-elevated);
  font-size: 13px;
  font-weight: 500;
  z-index: 9999;
  opacity: 0;
  transition: all 0.3s var(--ease-bounce);
}

.toast.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
</style>
