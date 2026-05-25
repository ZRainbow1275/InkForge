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

// ─── P3-T11 — preview metadata ──────────────────────────────────────
/**
 * 平台无关的元信息容器，UI 可在手机框下方展示「字数 / 超限 / 公式数 / 表格数」等。
 * 字段全部 optional —— 不同平台只填自己关心的部分。
 */
export interface PreviewMeta {
  /** 当前预览代表的平台 */
  platform?: Platform
  /** 总字数 / 字符数 */
  charCount?: number
  /** 是否超出该平台字数限制（小红书 1000） */
  overLimit?: boolean
  /** 段落数 */
  paragraphCount?: number
  /** 标题（小红书 titleSplit 抽出） */
  title?: string
  /** 注入正文 footer 的 hashtags（小红书） */
  hashtags?: string[]
  /** 文本引擎建议的话题标签（小红书） */
  suggestedTags?: string[]
  /** 块级 LaTeX 数（知乎） */
  latexBlocks?: number
  /** 行内 LaTeX 数（知乎） */
  latexInlines?: number
  /** Mermaid 块数（知乎） */
  mermaidCount?: number
  /** 任务列表数（知乎） */
  taskListCount?: number
  /** 表格降级数（知乎） */
  tablesConverted?: number
  /** 是否使用空内容 sample 兜底（用于 UI 标示「示例内容」徽章） */
  isSample?: boolean
}

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
  /** P3-T11：native artifact 元信息（字数 / 公式数 等）。失败或未渲染时为 null */
  previewMeta: Ref<PreviewMeta | null>
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
  const previewMeta = ref<PreviewMeta | null>(null)

  let rafId: number | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  // 渲染序号：每次 scheduleRender 自增，renderPreview 完成时仅当 token 仍是
  // 最新值才写回 previewHtml/previewMeta，避免并发 async 渲染的 stale write
  // 导致预设切换 off-by-one。
  let renderToken = 0

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
   * 执行预览渲染。
   *
   * P3-T11：按平台分流到正确的 native artifact + fidelity 包装：
   *   - wechat → convertToPlatform (HTML 引擎) — unchanged
   *   - xiaohongshu → markdownToXiaohongshuText → renderXhsMockHtml
   *   - zhihu → markdownToZhihuClean → renderZhihuMockHtml
   */
  async function renderPreview(token: number): Promise<void> {
    const rawBody = options.body.value
    const isEmptyBody = !rawBody || !rawBody.trim()

    previewLoading.value = true
    const startTime = performance.now()

    // 仅当当前 render 仍是最新一次 schedule 时才写回结果。
    const isStale = (): boolean => token !== renderToken

    try {
      const exportSettings = options.getExportSettings()
      const appearance = options.getAppearance()
      const platform = options.platform.value
      const presetId = exportSettings.defaultPresetId as string | undefined
      const primaryColor = appearance.accentColor

      // 空内容兜底：用 resolveSampleContent 注入 sample markdown，让 preset 身份首次可见
      // 仍走与 body-present 完全相同的渲染管线，保持视觉一致性
      let body = rawBody as string
      if (isEmptyBody) {
        const { resolveSampleContent, getPresetById } = await import('@/services/export')
        const activePreset = presetId ? getPresetById(presetId) : undefined
        body = resolveSampleContent({ sampleContent: activePreset?.sampleContent })
      }

      if (platform === 'xiaohongshu') {
        const { markdownToXiaohongshuText, getXiaohongshuPresets } = await import('@/services/export')
        const { renderXhsMockHtml } = await import(
          '@/services/export/preview-fidelity/xiaohongshu-mock'
        )
        const textResult = markdownToXiaohongshuText(body)
        if (isStale()) return
        const xhsKey = stripXhsPresetPrefix(presetId)
        const xhsPresetId = xhsKey ? `xhs-${xhsKey}` : undefined
        const xhsThemeCSS = xhsPresetId
          ? getXiaohongshuPresets().find((p) => p.id === xhsPresetId)?.previewCSS
          : undefined
        previewHtml.value = renderXhsMockHtml(
          {
            text: textResult.text,
            title: textResult.title,
            body: textResult.body,
            hashtags: textResult.hashtags,
            suggestedTags: textResult.suggestedTags,
            charCount: textResult.charCount,
            overLimit: textResult.overLimit,
          },
          {
            presetId: xhsKey,
            primaryColor,
            themeCSS: xhsThemeCSS,
          }
        )
        previewMeta.value = {
          platform: 'xiaohongshu',
          charCount: textResult.charCount,
          overLimit: textResult.overLimit,
          paragraphCount: textResult.paragraphCount,
          title: textResult.title,
          hashtags: textResult.hashtags,
          suggestedTags: textResult.suggestedTags,
          isSample: isEmptyBody,
        }
      } else if (platform === 'zhihu') {
        const { markdownToZhihuClean, getZhihuPresets } = await import('@/services/export')
        const { renderZhihuMockHtml } = await import(
          '@/services/export/preview-fidelity/zhihu-mock'
        )
        const mdResult = markdownToZhihuClean(body)
        if (isStale()) return
        const zhihuKey = stripZhihuPresetPrefix(presetId)
        const zhihuPresetId = zhihuKey ? `zhihu-${zhihuKey}` : undefined
        const zhihuThemeCSS = zhihuPresetId
          ? getZhihuPresets().find((p) => p.id === zhihuPresetId)?.previewCSS
          : undefined
        previewHtml.value = renderZhihuMockHtml(
          {
            markdown: mdResult.markdown,
            latexBlocks: mdResult.latexBlocksConverted,
            latexInlines: mdResult.latexInlinesConverted,
            mermaidCount: mdResult.mermaidCount,
            taskListCount: mdResult.taskListCount,
          },
          {
            presetId: zhihuKey,
            primaryColor,
            themeCSS: zhihuThemeCSS,
          }
        )
        previewMeta.value = {
          platform: 'zhihu',
          latexBlocks: mdResult.latexBlocksConverted,
          latexInlines: mdResult.latexInlinesConverted,
          mermaidCount: mdResult.mermaidCount,
          taskListCount: mdResult.taskListCount,
          tablesConverted: mdResult.tablesConverted,
          isSample: isEmptyBody,
        }
      } else {
        // wechat: mock 渲染器 — 对齐 xhs/zhihu 架构
        // 注入 previewCSS 为 <style> 块，浏览器原生渲染伪元素/counter/字体
        const { renderMarkdownWithLazyOptionalEnhancements } = await import(
          '@/services/rendering/lazy-optional-renderer'
        )
        const { getPresetById, generateThemeCSS } = await import('@/services/export')
        const { renderWechatMockHtml } = await import(
          '@/services/export/preview-fidelity/wechat-mock'
        )

        const renderedHtml = await renderMarkdownWithLazyOptionalEnhancements(body)
        if (isStale()) return

        const preset = presetId ? getPresetById(presetId) : undefined
        const wechatThemeCSS = preset ? generateThemeCSS(preset, 'preview') : undefined

        previewHtml.value = renderWechatMockHtml(
          { html: renderedHtml },
          {
            presetId,
            primaryColor,
            themeCSS: wechatThemeCSS,
          }
        )
        previewMeta.value = { platform: 'wechat', isSample: isEmptyBody }
      }
    } catch {
      if (isStale()) return
      previewHtml.value = '<p style="color:#C62828;">预览渲染失败</p>'
      previewMeta.value = null
    } finally {
      if (!isStale()) {
        previewLoading.value = false
        lastRenderTime.value = Math.round(performance.now() - startTime)
      }
    }
  }

  /**
   * 把 ExportSettings 里的 preset id（'xhs-fresh' / 'xhs-warm' …）转成
   * fidelity 模块期望的短键（'fresh' / 'warm' …）。
   * 未识别时返回 undefined，由 fidelity 模块用默认值兜底。
   */
  function stripXhsPresetPrefix(
    presetId: string | undefined
  ): 'fresh' | 'simple' | 'warm' | 'tech' | 'nature' | undefined {
    if (!presetId) return undefined
    const m = presetId.match(/^xhs-(fresh|simple|warm|tech|nature)$/)
    return m ? (m[1] as 'fresh' | 'simple' | 'warm' | 'tech' | 'nature') : undefined
  }

  function stripZhihuPresetPrefix(
    presetId: string | undefined
  ): 'academic' | 'tech' | 'insight' | undefined {
    if (!presetId) return undefined
    const m = presetId.match(/^zhihu-(academic|tech|insight)$/)
    return m ? (m[1] as 'academic' | 'tech' | 'insight') : undefined
  }

  /**
   * 调度渲染：防抖 + requestAnimationFrame
   */
  function scheduleRender(): void {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    if (rafId !== null) cancelAnimationFrame(rafId)

    // 任何一次 schedule 都让此前在飞的 renderPreview 失效 —— 即使 timer/rAF
    // 已经触发但 dynamic import 还没解决，token 比对会丢弃它的写回。
    const token = ++renderToken
    const delay = getDebounceDelay()

    debounceTimer = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        void renderPreview(token)
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

  return { previewHtml, previewLoading, lastRenderTime, previewMeta }
}
