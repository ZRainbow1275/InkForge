/**
 * 智能防抖预览渲染 Composable
 *
 * 根据文档长度动态调整防抖延迟：
 * - 短文档 (<2000字) -> 50ms（近乎实时）
 * - 中等文档 (2000-10000字) -> 100ms
 * - 长文档 (>10000字) -> 150ms
 *
 * 使用 requestAnimationFrame 确保渲染不阻塞 UI 绘制帧
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { Platform } from '@/services/export'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

export interface PreviewRendererOptions {
  /** Markdown 正文内容 */
  body: Ref<string | undefined>
  /** 目标平台 */
  platform: Ref<Platform>
  /** 获取当前导出设置（惰性求值，避免不必要的深度 watch） */
  getExportSettings: () => Record<string, unknown>
  /** 获取当前外观设置 */
  getAppearance: () => { accentColor: string; fontFamily: string }
}

export interface PreviewRendererReturn {
  /** 渲染后的 HTML */
  previewHtml: Ref<string>
  /** 是否正在渲染 */
  previewLoading: Ref<boolean>
  /** 上次渲染耗时 (ms) */
  lastRenderTime: Ref<number>
}

// ═══════════════════════════════════════════════════════════════════
// 防抖阈值常量
// ═══════════════════════════════════════════════════════════════════

/** 短文档阈值（字符数） */
const SHORT_DOC_THRESHOLD = 2000
/** 长文档阈值（字符数） */
const LONG_DOC_THRESHOLD = 10000

/** 短文档防抖延迟 (ms) */
const SHORT_DOC_DELAY = 50
/** 中等文档防抖延迟 (ms) */
const MEDIUM_DOC_DELAY = 100
/** 长文档防抖延迟 (ms) */
const LONG_DOC_DELAY = 150

// ═══════════════════════════════════════════════════════════════════
// Composable
// ═══════════════════════════════════════════════════════════════════

export function usePreviewRenderer(options: PreviewRendererOptions): PreviewRendererReturn {
  const previewHtml = ref('')
  const previewLoading = ref(false)
  const lastRenderTime = ref(0)

  let rafId: number | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 根据文档长度计算防抖延迟
   */
  function getDebounceDelay(): number {
    const bodyLength = options.body.value?.length ?? 0
    if (bodyLength < SHORT_DOC_THRESHOLD) return SHORT_DOC_DELAY
    if (bodyLength < LONG_DOC_THRESHOLD) return MEDIUM_DOC_DELAY
    return LONG_DOC_DELAY
  }

  /**
   * 执行预览渲染
   */
  async function renderPreview(): Promise<void> {
    const body = options.body.value
    if (!body) {
      previewHtml.value = ''
      return
    }

    previewLoading.value = true
    const startTime = performance.now()

    try {
      const { convertToPlatform } = await import('@/services/export')
      const exportSettings = options.getExportSettings()
      const appearance = options.getAppearance()

      const result = await convertToPlatform(body, options.platform.value, {
        presetId: exportSettings.defaultPresetId as string | undefined,
        exportOptions: {
          enableMacCodeBlock: exportSettings.macCodeBlock as boolean | undefined,
          enableLineNumbers: exportSettings.lineNumbers as boolean | undefined,
          enableCiteStatus: exportSettings.convertFootnotes as boolean | undefined,
          enableTextIndent: exportSettings.textIndent as boolean | undefined,
          codeTheme: exportSettings.codeTheme as
            | 'atom-one-dark'
            | 'atom-one-light'
            | 'github-dark'
            | 'github-light'
            | 'monokai'
            | 'vs2015'
            | 'dracula'
            | undefined,
        },
        overrides: {
          primaryColor: appearance.accentColor,
          fontFamily: appearance.fontFamily,
        },
      })
      previewHtml.value = result
    } catch {
      previewHtml.value = '<p style="color:#C62828;">预览渲染失败</p>'
    } finally {
      previewLoading.value = false
      lastRenderTime.value = Math.round(performance.now() - startTime)
    }
  }

  /**
   * 调度渲染：防抖 + requestAnimationFrame
   */
  function scheduleRender(): void {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    if (rafId !== null) cancelAnimationFrame(rafId)

    const delay = getDebounceDelay()

    debounceTimer = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        void renderPreview()
      })
    }, delay)
  }

  // ─── Watch 触发源 ───
  // 将 getter 返回值序列化为稳定字符串 key，
  // 用简单字符串比较替代 deep: true 的递归遍历，避免无谓性能开销。
  watch(
    [
      options.body,
      options.platform,
      () => JSON.stringify(options.getExportSettings()),
      () => JSON.stringify(options.getAppearance()),
    ],
    scheduleRender,
    { immediate: true },
  )

  // ─── 清理 ───
  onUnmounted(() => {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return { previewHtml, previewLoading, lastRenderTime }
}
