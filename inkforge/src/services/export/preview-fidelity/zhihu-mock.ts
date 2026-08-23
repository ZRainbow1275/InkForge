/**
 * 知乎 Draft.js 编辑器本地保真预览渲染器 (P3-T10)
 *
 * 输入：markdownToZhihuClean(...).markdown 产物（可能包含已转换的 equation img，
 * 也可能保留原始 $$..$$ / $..$ 当 markdown engine 关闭 convertLatexToImg 时）。
 * 输出：self-contained HTML，可直接用于 v-html，反映实测编辑画布的样貌：
 *   - 三个 preset (academic / tech / insight) 决定主色与字体
 *   - LaTeX 在 fidelity 中始终强制以 zhihu equation 端点 img 呈现
 *   - 代码块按 marked 输出再注入语言徽章
 *   - GFM 表格保留（fidelity 不接 export 的 fallback 降级）
 *   - 只有显式注册的 InkForge SVG module id 才能生成 image fallback
 *   - 用户 Markdown 中的 raw HTML / inline SVG 在可信模块注入前被净化
 *   - 不伪造账号、发布状态或平台水印；发布能力仍由独立流程证明
 *
 * 本模块 self-contained：
 *   - marked 已是项目依赖
 *   - LaTeX 强制转换复用 platform-rules/zhihu 的 convertLatexToEquationImg
 *   - 不修改 zhihu.ts / zhihu-markdown.ts
 *   - 不引入新依赖
 */

import { marked } from 'marked'
import { sanitizeUntrustedPreviewHtml } from './sanitize-untrusted-html'
import { convertLatexToEquationImg } from '../platform-rules/zhihu'
import { getSvgModule } from '../svg-modules'
import { buildSvgDataUri, svgToImgTag } from '../svg-modules/raster'
import { buildThemeContext } from '../svg-modules/theme'

// ─────────────────────────────────────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────────────────────────────────────

export type ZhihuMockPresetId = 'academic' | 'tech' | 'insight'

export interface ZhihuMockOptions {
  presetId?: ZhihuMockPresetId
  /** primary color override（覆盖 preset 默认色） */
  primaryColor?: string
  /**
   * 是否将剩余 LaTeX (markdown engine 未转的 $$..$$ / $..$) 强制转为 equation img。
   * 默认 true — 与 markdown engine 默认行为保持一致；关闭后 fidelity 中将出现
   * 原始美元符号（用于调试 markdown engine 输出）。
   */
  showLatexAsImg?: boolean
  /** 是否显示代码块语言徽章（右上角小标签）— 默认 true */
  showCodeLanguageBadge?: boolean
  /**
   * 来自 themes.ts zhihu preset.previewCSS 的主题 CSS，scope 到 `#zhihu-answer`。
   * 注入后会覆盖平台基线中的字体/装饰/标题颜色等。
   * 未提供时按实测的 Draft.js 编辑器排版基线渲染。
   *
   * 注意：preset 中由 composeRecipes 注入的规则使用 `#nice` 前缀，会被
   * 自动改写为 `#zhihu-answer` 以匹配本地预览容器 id。
   */
  themeCSS?: string
}

export interface ZhihuMockInput {
  /** markdownToZhihuClean(...).markdown 产物 */
  markdown: string
  /** 经 markdown engine 转换的块级 LaTeX 数 — 仅作为元信息，不影响渲染 */
  latexBlocks?: number
  /** 行内 LaTeX 数 — 同上 */
  latexInlines?: number
  /** Mermaid 提示数 — 同上 */
  mermaidCount?: number
  /** 任务列表数 — 同上 */
  taskListCount?: number
  /**
   * 仅接受 InkForge 注册表中的模块 id。不得从 markdown/raw HTML 的
   * data-ink-svg 属性推断，以免把用户输入提升为可信 SVG。
   */
  trustedSvgModuleIds?: readonly string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset 配色（按 team-lead 指定，与 export/zhihu.ts 内联色独立）
// ─────────────────────────────────────────────────────────────────────────────

interface PresetTokens {
  primaryColor: string
  fontFamily: string
  fontSize: string
  background: string
}

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Microsoft YaHei','Source Han Sans SC','Noto Sans CJK SC','WenQuanYi Micro Hei','MiSans L3','Segoe UI',sans-serif"

const PRESET_TOKENS: Record<ZhihuMockPresetId, PresetTokens> = {
  academic: {
    primaryColor: '#1565C0',
    fontFamily: FONT_STACK,
    fontSize: '16px',
    background: '#ffffff',
  },
  tech: {
    primaryColor: '#2962FF',
    fontFamily: FONT_STACK,
    fontSize: '16px',
    background: '#ffffff',
  },
  insight: {
    primaryColor: '#6A1B9A',
    fontFamily: FONT_STACK,
    fontSize: '16px',
    background: '#ffffff',
  },
}

function resolveTokens(options?: ZhihuMockOptions): PresetTokens {
  const id: ZhihuMockPresetId = options?.presetId ?? 'academic'
  const base = PRESET_TOKENS[id] ?? PRESET_TOKENS.academic
  if (options?.primaryColor) {
    return { ...base, primaryColor: options.primaryColor }
  }
  return base
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML 转义（仅用于属性值，主体由 marked 输出）
// ─────────────────────────────────────────────────────────────────────────────

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ─────────────────────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 把 cleaned Markdown 渲染为知乎风格的预览 HTML。
 */
export function renderZhihuMockHtml(
  input: ZhihuMockInput,
  options?: ZhihuMockOptions
): string {
  const tokens = resolveTokens(options)
  const showLatexAsImg = options?.showLatexAsImg ?? true
  const showCodeLanguageBadge = options?.showCodeLanguageBadge ?? true

  // Step 1: 强制 LaTeX → equation img（fidelity 不容忍未渲染的公式）
  let md = input.markdown
  if (showLatexAsImg) {
    md = convertLatexToEquationImg(md).md
  }

  // Step 2: marked 渲染（沿用全局 gfm/breaks 配置；此处仅显式 parse）
  const rawHtml = marked.parse(md, { async: false, gfm: true, breaks: true }) as string

  // Step 3: markdown/raw HTML 是不可信输入。先移除 style、事件、active URL、
  // data-* 与 inline SVG，再注入下方由 InkForge 代码生成的可信预览装饰。
  const sanitizedHtml = sanitizeUntrustedPreviewHtml(rawHtml, {
    additionalAttrs: ['eeimg'],
  })

  // Step 4: 注入代码块语言徽章（仅处理上一步净化后的受控 code 结构）。
  const htmlWithBadges = showCodeLanguageBadge
    ? injectCodeLanguageBadges(sanitizedHtml)
    : sanitizedHtml

  // Step 5: SVG fallback 只来自注册表 id；绝不扫描用户 HTML 中的哨兵。
  const trustedSvgFallbacks = renderTrustedSvgModuleFallbacks(
    input.trustedSvgModuleIds,
    tokens.primaryColor,
    options?.presetId ?? 'academic',
  )
  const htmlWithSvgFallbacks = `${htmlWithBadges}${trustedSvgFallbacks}`

  // Step 6: 2026-07-27 实机测量的 800px Draft.js 编辑画布。
  const containerStyle = [
    `font-family:${tokens.fontFamily}`,
    `font-size:${tokens.fontSize}`,
    'line-height:25.6px',
    'color:#191b1f',
    `background:${tokens.background}`,
    'width:100%',
    'max-width:800px',
    'min-height:100%',
    'margin:0 auto',
    'padding:0',
    'box-sizing:border-box',
  ].join(';')

  // Step 7: baseline 先于 preset 注入，确保平台默认节奏可被用户选择的预设覆盖。
  const baselineStyle = renderPlatformBaselineStyle()
  const themeStyle = renderThemeStyle(options?.themeCSS)

  return [
    `<section class="zhihu-editor-canvas" data-platform-editor="zhihu" data-editor-canvas-width="800" style="${containerStyle}">`,
    baselineStyle,
    themeStyle,
    `<article id="zhihu-answer" class="zhihu-mock zhihu-mock-${escapeAttr(options?.presetId ?? 'academic')}" data-primary="${escapeAttr(tokens.primaryColor)}" style="width:100%;min-width:0;--zhihu-mock-primary:${tokens.primaryColor};">`,
    htmlWithSvgFallbacks,
    '</article>',
    '</section>',
  ].join('')
}

const ZHIHU_PRESET_PERSONA = {
  academic: 'academic',
  tech: 'business',
  insight: 'creative',
} as const

function renderTrustedSvgModuleFallbacks(
  moduleIds: readonly string[] | undefined,
  primaryColor: string,
  presetId: ZhihuMockPresetId,
): string {
  if (!moduleIds?.length) return ''

  const theme = buildThemeContext({
    primaryColor,
    persona: ZHIHU_PRESET_PERSONA[presetId],
    target: 'zhihu',
  })

  return [...new Set(moduleIds)]
    .slice(0, 32)
    .map((moduleId) => getSvgModule(moduleId))
    .filter((module) => module !== undefined)
    .map((module) => replaceInkSvgModulesWithImageFallback(
      module.render({ theme, text: module.description }),
    ))
    .join('')
}

function renderPlatformBaselineStyle(): string {
  return [
    '<style data-platform-baseline="zhihu">',
    '#zhihu-answer{font-size:16px;line-height:25.6px;color:#191b1f;}',
    '#zhihu-answer h1{font-size:24px;line-height:36px;font-weight:600;margin:0;padding:0;}',
    '#zhihu-answer h2{font-size:19.2px;line-height:28.8px;font-weight:600;margin:0;padding:0;}',
    '#zhihu-answer h3{font-size:17px;line-height:25.6px;font-weight:600;margin:0;padding:0;}',
    '#zhihu-answer p{margin:0 0 16px;padding:0;}',
    '#zhihu-answer blockquote{margin:0 0 16px;padding:0 0 0 12px;border-left:2px solid #d3d6db;color:#5c626b;}',
    '</style>',
  ].join('')
}

/**
 * Wrap preset.previewCSS in a `<style>` block scoped to the Zhihu article.
 *
 * - themes.ts zhihu preset CSS already uses `#zhihu-answer` selectors, injected as-is.
 * - composeRecipes() returns rules prefixed with `#nice` — rewritten to
 *   `#zhihu-answer` so decoration recipes match the actual mock DOM.
 * - `</style>` in the payload is escaped to prevent breaking out of the block.
 */
function renderThemeStyle(css: string | undefined): string {
  if (!css || !css.trim()) return ''
  const rescoped = css.replace(/#nice\b/g, '#zhihu-answer')
  const safe = rescoped.replace(/<\/style/gi, '<\\/style')
  return `<style data-preset-theme="zhihu-answer">${safe}</style>`
}

function replaceInkSvgModulesWithImageFallback(html: string): string {
  return html.replace(
    /<section\b(?=[^>]*\bdata-ink-svg=(["'])([^"']+)\1)[^>]*>[\s\S]*?<svg\b[\s\S]*?<\/svg>[\s\S]*?<\/section>/gi,
    (sectionHtml: string, _quote: string, rawModuleId: string) => {
      const moduleId = normalizeInkSvgModuleId(rawModuleId)
      const { width, height } = inferSvgImageSize(sectionHtml)
      const dataUri = buildSvgDataUri(sectionHtml, width, height)
      return svgToImgTag(dataUri, moduleId, `InkForge ${moduleId} image fallback`)
    }
  )
}

function normalizeInkSvgModuleId(rawModuleId: string): string {
  return rawModuleId.replace(/[^a-z0-9_-]/gi, '') || 'svg-module'
}

function inferSvgImageSize(svgHtml: string): { width: number; height: number } {
  const viewBox = /<svg\b[^>]*\bviewBox\s*=\s*["']\s*[-.\d]+\s+[-.\d]+\s+([-.\d]+)\s+([-.\d]+)\s*["']/i.exec(svgHtml)
  if (viewBox) {
    const viewBoxWidth = Number(viewBox[1])
    const viewBoxHeight = Number(viewBox[2])
    if (Number.isFinite(viewBoxWidth) && viewBoxWidth > 0 && Number.isFinite(viewBoxHeight) && viewBoxHeight > 0) {
      return {
        width: 1080,
        height: Math.max(1, Math.round((1080 * viewBoxHeight) / viewBoxWidth)),
      }
    }
  }

  const explicitWidth = /<svg\b[^>]*\bwidth\s*=\s*["'](\d+(?:\.\d+)?)["']/i.exec(svgHtml)
  const explicitHeight = /<svg\b[^>]*\bheight\s*=\s*["'](\d+(?:\.\d+)?)["']/i.exec(svgHtml)
  if (explicitWidth && explicitHeight) {
    const width = Number(explicitWidth[1])
    const height = Number(explicitHeight[1])
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
      return {
        width: 1080,
        height: Math.max(1, Math.round((1080 * height) / width)),
      }
    }
  }

  return { width: 1080, height: 360 }
}

// ─────────────────────────────────────────────────────────────────────────────
// 后处理：代码块语言徽章
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 在 `<pre><code class="language-xxx">` 上方追加一个语言徽章 div，
 * 用 wrapper `<div class="zhihu-mock-codeblock">` 包裹原 pre。
 */
function injectCodeLanguageBadges(html: string): string {
  return html.replace(
    /<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang: string, body: string) => {
      const safeLang = escapeAttr(lang)
      const badge = `<span class="zhihu-mock-code-badge" style="position:absolute;top:6px;right:10px;font-size:11px;font-family:monospace;color:#9aa0a6;letter-spacing:0.5px;text-transform:uppercase;">${safeLang}</span>`
      const wrapper = `<div class="zhihu-mock-codeblock" style="position:relative;margin:18px 0;">${badge}<pre style="margin:0;padding:14px 16px;background:#1e1e1e;color:#d4d4d4;border-radius:6px;overflow-x:auto;font-family:Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.6;"><code class="language-${safeLang}">${body}</code></pre></div>`
      return wrapper
    }
  )
}
