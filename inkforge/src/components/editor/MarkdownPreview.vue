<script setup lang="ts">
/* eslint-disable vue/no-v-html */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'
import { logger } from '@/services/error'
import { sanitizeCSSString } from '@/services/security'

// Props
const props = defineProps<{
  markdown: string
}>()

// Theme store
const themeStore = useThemeStore()
const { generatedCSS, baseTheme } = storeToRefs(themeStore)

// Rendered HTML
const renderedHtml = ref('')

// 安全的动态样式元素引用
const styleElement = ref<HTMLElement | null>(null)
const previewContainer = ref<HTMLElement | null>(null)

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true
})

// Watch markdown changes and re-render
watch(() => props.markdown, (newVal) => {
  try {
    const rawHtml = marked.parse(newVal || '') as string
    renderedHtml.value = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['section'],
      ADD_ATTR: ['data-tool']
    })
  } catch (e) {
    logger.error('Markdown 解析错误', e)
    renderedHtml.value = '<p class="error">渲染错误</p>'
  }
}, { immediate: true })

/**
 * 安全的样式注入方法
 * 使用 textContent 而非 innerHTML/v-html 来防止 XSS
 * CSS 内容经过 sanitizeCSSString 净化处理
 */
function injectSafeStyles(css: string): void {
  if (!styleElement.value) {
    return
  }

  // 净化 CSS 内容，移除危险模式
  const sanitizedCSS = sanitizeCSSString(css)

  // 使用 textContent 安全地设置样式内容
  // textContent 不会解析 HTML，防止 XSS
  styleElement.value.textContent = sanitizedCSS
}

// 监听 CSS 变化并安全注入
watch(generatedCSS, (newCSS) => {
  injectSafeStyles(newCSS)
}, { immediate: false })

// 组件挂载时创建样式元素
onMounted(() => {
  // 创建 style 元素
  styleElement.value = document.createElement('style')
  styleElement.value.setAttribute('data-dynamic-theme', 'true')

  // 将 style 元素插入到预览容器中
  if (previewContainer.value) {
    previewContainer.value.insertBefore(
      styleElement.value,
      previewContainer.value.firstChild
    )
  }

  // 初始化样式
  injectSafeStyles(generatedCSS.value)
})

// 组件卸载时清理样式元素
onUnmounted(() => {
  if (styleElement.value && styleElement.value.parentNode) {
    styleElement.value.parentNode.removeChild(styleElement.value)
  }
  styleElement.value = null
})
</script>

<template>
  <div
    ref="previewContainer"
    class="markdown-preview"
    :class="[`theme-${baseTheme}`]"
  >
    <!-- 动态样式通过 JavaScript 安全注入，不使用 v-html -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      class="preview-content"
      v-html="renderedHtml"
    />
  </div>
</template>

<style scoped>
.markdown-preview {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
}

/* Base WeChat Styles */
.preview-content {
  font-family: -apple-system-font, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  word-wrap: break-word;
}

.preview-content :deep(h1) { font-size: 22px; font-weight: bold; margin: 1.5em 0 0.8em; }
.preview-content :deep(h2) { font-size: 18px; font-weight: bold; margin: 1.5em 0 0.8em; border-bottom: 1px solid #eaeaea; padding-bottom: 10px; }
.preview-content :deep(h3) { font-size: 16px; font-weight: bold; margin: 1.2em 0 0.6em; }

.preview-content :deep(p) { margin-bottom: 1.5em; }

.preview-content :deep(blockquote) {
  margin: 1.5em 0;
  padding: 1em;
  border-left: 4px solid #0066cc;
  background: #f8f8f8;
  color: #666;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  padding-left: 2em;
  margin-bottom: 1.5em;
}

.preview-content :deep(li) { margin-bottom: 0.5em; }

.preview-content :deep(code) {
  font-family: 'Fira Code', monospace;
  background: rgba(0,0,0,0.06);
  padding: 2px 4px;
  border-radius: 3px;
}

.preview-content :deep(pre) {
  background: #282c34;
  color: #abb2bf;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  margin: 1.5em 0;
}

.preview-content :deep(img) {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 1.5em auto;
  border-radius: 4px;
}

.preview-content :deep(a) {
  color: #576b95;
  text-decoration: none;
}

.preview-content :deep(hr) {
  border: none;
  height: 1px;
  background: #eaeaea;
  margin: 2em 0;
}

/* Theme Variations */
.theme-grace .preview-content { font-family: 'Georgia', 'Noto Serif SC', serif; }
.theme-simple .preview-content { font-size: 15px; }
</style>
