<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import DOMPurify from 'dompurify'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'
import { logger } from '@/services/error'
import { sanitizeCSSString } from '@/services/security'
import { renderMarkdownWithOptionalEnhancements } from '@/services/rendering/optional-renderers'

// Props
const props = defineProps<{
  markdown: string
}>()

// Theme store
const themeStore = useThemeStore()
const { generatedCSS, baseTheme } = storeToRefs(themeStore)

// Rendered HTML
const renderedHtml = ref('')
const styleElement = ref<HTMLStyleElement | null>(null)
const previewContainer = ref<HTMLElement | null>(null)

let renderSequence = 0

// Watch markdown changes and re-render.
watch(() => props.markdown, async (newVal) => {
  const sequence = ++renderSequence
  try {
    const rawHtml = await renderMarkdownWithOptionalEnhancements(newVal || '')
    if (sequence !== renderSequence) {
      return
    }

    renderedHtml.value = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['section', 'nav', 'mark', 'sup', 'footer', 'details', 'summary', 'math', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'annotation', 'svg', 'g', 'path', 'defs', 'marker', 'line', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'text', 'tspan'],
      ADD_ATTR: ['id', 'class', 'href', 'title', 'role', 'tabindex', 'aria-label', 'aria-hidden', 'style', 'data-tool', 'data-error', 'data-max-depth', 'data-numbered', 'data-highlight-color', 'data-footnote-id', 'data-footnote-index', 'data-footnote-ref-index', 'data-citation-id', 'data-citation-kind', 'data-citation-raw', 'data-citation-keys', 'data-citation-style', 'data-citation-missing', 'data-bibliography-key', 'data-source-url', 'data-wikilink-target', 'data-wikilink-anchor', 'data-wikilink-resolved', 'data-emoji-name', 'open', 'data-summary', 'data-inkforge-details', 'data-details-content', 'xmlns', 'viewBox', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'stroke', 'fill', 'transform', 'text-anchor']
    })
  } catch (e) {
    logger.error('Markdown render error', e)
    renderedHtml.value = '<p class="error">Render error</p>'
  }
}, { immediate: true })

function injectSafeStyles(css: string): void {
  if (!styleElement.value) {
    return
  }

  const sanitizedCSS = sanitizeCSSString(css)
  styleElement.value.textContent = sanitizedCSS
}

watch(generatedCSS, (newCSS) => {
  injectSafeStyles(newCSS)
}, { immediate: false })

onMounted(() => {
  styleElement.value = document.createElement('style')
  styleElement.value.setAttribute('data-dynamic-theme', 'true')

  if (previewContainer.value) {
    previewContainer.value.insertBefore(
      styleElement.value,
      previewContainer.value.firstChild
    )
  }

  injectSafeStyles(generatedCSS.value)
})

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
    <!-- 鍔ㄦ€佹牱寮忛€氳繃 JavaScript 瀹夊叏娉ㄥ叆锛屼笉浣跨敤 v-html -->
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

.preview-content :deep(.ink-toc) {
  margin: 1.5em 0;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.preview-content :deep(.ink-toc__list) {
  margin: 0;
  padding-left: 1.2em;
  list-style: none;
  counter-reset: ink-toc;
}

.preview-content :deep(.ink-toc__item) {
  margin: 0.35em 0;
  padding-left: calc(var(--ink-toc-depth, 0) * 1em);
  counter-increment: ink-toc;
}

.preview-content :deep(.ink-toc[data-numbered="true"] .ink-toc__item::before) {
  content: counters(ink-toc, ".") ". ";
  color: #64748b;
}

.preview-content :deep(.ink-highlight) {
  padding: 0.05em 0.25em;
  border-radius: 0.3em;
  background: var(--ink-highlight-color, #fff176);
}

.preview-content :deep(.ink-highlight--green) { --ink-highlight-color: #a5d6a7; }
.preview-content :deep(.ink-highlight--blue) { --ink-highlight-color: #90caf9; }
.preview-content :deep(.ink-highlight--pink) { --ink-highlight-color: #f48fb1; }
.preview-content :deep(.ink-highlight--purple) { --ink-highlight-color: #ce93d8; }
.preview-content :deep(.ink-highlight--orange) { --ink-highlight-color: #ffcc80; }
.preview-content :deep(.ink-highlight--red) { --ink-highlight-color: #ef9a9a; }
.preview-content :deep(.ink-highlight--gray) { --ink-highlight-color: #cfd8dc; }

.preview-content :deep(.ink-footnote-ref) {
  font-size: 0.75em;
  vertical-align: super;
}

.preview-content :deep(.ink-footnotes) {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid #e2e8f0;
  color: #475569;
}

.preview-content :deep(.ink-footnotes__title) {
  font-size: 14px;
  color: #64748b;
}

.preview-content :deep(.ink-footnote-back) {
  margin-left: 0.5em;
  font-size: 12px;
  color: #64748b;
}

.preview-content :deep(.ink-details) {
  margin: 1.5em 0;
  padding: 12px 14px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #f8fbff;
}

.preview-content :deep(.ink-details__summary) {
  cursor: pointer;
  font-weight: 700;
  color: #1e3a8a;
}

.preview-content :deep(.ink-details__content) {
  margin-top: 1em;
}

.preview-content :deep(.ink-emoji--shortcode) {
  padding: 0.05em 0.35em;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.92em;
}

.preview-content :deep(.ink-wikilink--unresolved),
.preview-content :deep(.ink-cite--unresolved a) {
  color: #b45309;
  border-bottom: 1px dashed currentColor;
}

.preview-content :deep(.ink-citation) {
  border-left-color: #22c55e;
  background: #f0fdf4;
}

.preview-content :deep(.ink-citation--inferred) {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.preview-content :deep(.ink-citation--authored) {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.preview-content :deep(.ink-citation__meta) {
  display: flex;
  gap: 0.75em;
  margin-top: 0.75em;
  font-size: 12px;
  color: #64748b;
}

.preview-content :deep(.katex-display),
.preview-content :deep(.math-fallback) {
  display: block;
  margin: 1.2em 0;
  padding: 12px 14px;
  overflow-x: auto;
  text-align: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.preview-content :deep(.mermaid-rendered),
.preview-content :deep(.mermaid-fallback) {
  display: flex;
  justify-content: center;
  margin: 1.5em 0;
  padding: 14px;
  overflow-x: auto;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.preview-content :deep(.mermaid-rendered svg) {
  max-width: 100%;
  height: auto;
}

/* Theme Variations */
.theme-grace .preview-content { font-family: 'Georgia', 'Noto Serif SC', serif; }
.theme-simple .preview-content { font-size: 15px; }
.preview-content :deep(.ink-footnote-backs) {
  margin-left: 0.5em;
  white-space: nowrap;
}

.preview-content :deep(.ink-academic-citation) {
  padding: 0.05em 0.25em;
  border-radius: 0.35em;
  background: #eef6ff;
  color: #1d4ed8;
  font-style: normal;
  white-space: nowrap;
}

.preview-content :deep(.ink-academic-citation--unresolved) {
  background: #fff7ed;
  color: #b45309;
  border-bottom: 1px dashed currentColor;
}

.preview-content :deep(.ink-bibliography) {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid #dbeafe;
  color: #334155;
}

.preview-content :deep(.ink-bibliography__title) {
  font-size: 14px;
  color: #475569;
}
</style>
