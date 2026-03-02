# 03 - 编辑器渲染同步优化

## 问题描述

1. **编辑器左右同步延迟**：当前 WorkstationView 使用 300ms `setTimeout` 防抖触发预览渲染，导致编辑和预览之间有明显延迟
2. **CSS 渲染管线不一致**：编辑器内的呈现（TipTap）和右侧预览（marked + platform converter）使用不同的 CSS 管线，导致视觉不一致
3. **主线程阻塞**：大文档渲染时 `marked.parse()` 和 `juice` CSS 内联化在主线程执行，可能导致 UI 卡顿

## 当前架构

```
WorkstationView.vue:
  watch([body, platform, exportSettings, appearance]) → setTimeout(renderPreview, 300)

renderPreview():
  body → convertToPlatform(body, platform, options) → previewHtml

convertToPlatform() (services/export/index.ts):
  markdown → marked.parse() → platform converter → result HTML

Platform Converter (e.g., wechat.ts):
  html → generateThemeCSS() → DOMPurify → juice (CSS inline) → post-process
```

## 解决方案

### Phase 1: 优化防抖策略

将 300ms setTimeout 替换为智能防抖 + requestAnimationFrame：

```typescript
// composables/usePreviewRenderer.ts

import { ref, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { Platform } from '@/services/export'

interface PreviewRendererOptions {
  body: Ref<string | undefined>
  platform: Ref<Platform>
  exportSettings: Ref<Record<string, unknown>>
  appearance: Ref<{ accentColor: string; fontFamily: string }>
}

export function usePreviewRenderer(options: PreviewRendererOptions) {
  const previewHtml = ref('')
  const previewLoading = ref(false)

  let rafId: number | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastRenderTime = 0

  // 智能防抖：短文档 50ms，长文档 150ms
  function getDebounceDelay(): number {
    const bodyLength = options.body.value?.length || 0
    if (bodyLength < 2000) return 50   // 短文档：近乎实时
    if (bodyLength < 10000) return 100  // 中等文档
    return 150                          // 长文档
  }

  async function renderPreview() {
    const body = options.body.value
    if (!body) {
      previewHtml.value = ''
      return
    }

    previewLoading.value = true
    const startTime = performance.now()

    try {
      const { convertToPlatform } = await import('@/services/export')
      const result = await convertToPlatform(body, options.platform.value, {
        overrides: {
          primaryColor: options.appearance.value.accentColor,
          fontFamily: options.appearance.value.fontFamily,
        },
      })
      previewHtml.value = result
    } catch {
      previewHtml.value = '<p style="color:#C62828;">渲染失败</p>'
    } finally {
      previewLoading.value = false
      lastRenderTime = performance.now() - startTime
    }
  }

  function scheduleRender() {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (rafId) cancelAnimationFrame(rafId)

    const delay = getDebounceDelay()

    debounceTimer = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        renderPreview()
      })
    }, delay)
  }

  watch(
    [options.body, options.platform, options.exportSettings, options.appearance],
    scheduleRender,
    { immediate: true, deep: true }
  )

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { previewHtml, previewLoading, lastRenderTime: ref(lastRenderTime) }
}
```

### Phase 2: CSS 管线统一

确保编辑器 TipTap 内容和预览使用相同的排版 CSS：

```typescript
// services/export/shared-typography.ts

/**
 * 共享排版 CSS 变量 — 编辑器和预览统一使用
 * 来源：settings.appearance 中的用户配置
 */
export function generateSharedTypographyCSS(options: {
  fontFamily: string
  fontSize: number
  lineHeight: number
  accentColor: string
}): string {
  const fontStack = getFontStack(options.fontFamily)

  return `
    --inkforge-font-family: ${fontStack};
    --inkforge-font-size: ${options.fontSize}px;
    --inkforge-line-height: ${options.lineHeight};
    --inkforge-accent: ${options.accentColor};
    --inkforge-heading-font: 'Noto Serif SC', ${fontStack};
    --inkforge-code-font: 'JetBrains Mono', 'Fira Code', monospace;
  `
}

function getFontStack(key: string): string {
  switch (key) {
    case 'serif': return "'Noto Serif SC', 'Source Han Serif SC', serif"
    case 'sans': return "'Noto Sans SC', 'Source Han Sans SC', -apple-system, sans-serif"
    case 'kai': return "'KaiTi', 'STKaiti', serif"
    case 'mono': return "'JetBrains Mono', 'Fira Code', monospace"
    default: return "'Noto Serif SC', serif"
  }
}
```

### Phase 3: 渲染性能监控

```typescript
// 在 EditorStatusBar 中展示渲染耗时
<span v-if="lastRenderTime > 0" class="render-time">
  渲染: {{ Math.round(lastRenderTime) }}ms
</span>
```

## 修改文件清单

### 需要创建
| 文件 | 说明 |
|------|------|
| `src/composables/usePreviewRenderer.ts` | 预览渲染 composable，智能防抖 |
| `src/services/export/shared-typography.ts` | 共享排版 CSS 生成 |

### 需要修改
| 文件 | 修改内容 |
|------|----------|
| `src/views/WorkstationView.vue` | 使用 `usePreviewRenderer` 替换内联 watch + setTimeout |
| `src/components/editor/EditorPanel.vue` | 应用共享排版 CSS 到 TipTap 编辑器 |
| `src/components/editor/EditorStatusBar.vue` | 展示渲染耗时 |
| `src/services/export/index.ts` | 集成共享排版 CSS |

### 依赖添加
- 无新依赖

## 验证标准

1. 短文档（<2000字）编辑后 50ms 内预览更新
2. 中等文档（2000-10000字）编辑后 100ms 内预览更新
3. 长文档（>10000字）编辑后 150ms 内预览更新
4. 编辑器内排版和预览排版视觉一致
5. 大文档编辑时 UI 无明显卡顿
6. EditorStatusBar 实时显示渲染耗时

## 优先级

**P0** — 核心编辑体验
