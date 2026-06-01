/**
 * SVG 模块注入钩子 — 见 prompts/0601/SPEC.md §5.1。
 *
 * `composeSvgDecorate(plan, opts)` 返回一个符合现有 `decorate(html, target)` 契约的
 * 函数，可经 `chainDecorators` 叠加到任意预设的 decorate 之后，不重构主管线。
 *
 * 注入时机：在 wechat/xhs/zhihu 管线里 decorate 运行于 DOMPurify 之后、postProcess
 * 之前（见 codebase-export-pipeline.md §2）。因此此处注入的 SVG 不再被导出 DOMPurify
 * 过滤，但仍要满足微信安全子集（模块本身已由 wechat-safe 保证）。
 *
 * 幂等：标题/hr/blockquote 替换后锚点消失，二次运行自然 no-op；cover/endmark
 * 为前插/追加，用 `data-ink-svg="<id>"` 哨兵防重复。
 *
 * 目标分支：preview/wechat 直出 inline SVG；xhs/zhihu 若提供 `rasterize` 回调
 * （PR5 raster.ts 注入）则栅格化为 <img>，否则回退 inline。
 */
import type { ExportTarget, PresetPersona } from '@/types'
import { buildThemeContext } from './theme'
import { getSvgModule } from './index'
import type { SvgModuleSpec, SvgModuleParams } from './types'

export interface SvgInjectionPlan {
  /** 文首插入封面/导语模块 id */
  cover?: string
  /** 标题级别 → 标题头模块 id（替换 <hN>…</hN>） */
  headings?: { level: 1 | 2 | 3 | 4 | 5 | 6; module: string }[]
  /** <hr> → 分隔线模块 id */
  replaceHr?: string
  /** <blockquote> → 引用卡模块 id */
  blockquote?: string
  /** 文末追加结束标模块 id */
  endmark?: string
}

export interface SvgDecorateOptions {
  primaryColor: string
  persona: PresetPersona
  accentColor?: string
  /**
   * PR5 接缝：xhs/zhihu 栅格化回调。(svgHtml, module, target) → 替换 HTML
   * （通常是带 data-ink-svg 哨兵的 <img>）。未提供时 xhs/zhihu 回退 inline。
   */
  rasterize?: (svgHtml: string, module: SvgModuleSpec, target: ExportTarget) => string
}

const TAG_RE = /<[^>]+>/g

/** 从元素内 HTML 抽取纯文本（去标签 + 解实体 + 折叠空白）。 */
export function extractText(innerHtml: string): string {
  return String(innerHtml || '')
    .replace(TAG_RE, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function emit(
  spec: SvgModuleSpec,
  params: SvgModuleParams,
  target: ExportTarget,
  opts: SvgDecorateOptions,
): string {
  const svg = spec.render(params)
  if ((target === 'xhs' || target === 'zhihu') && opts.rasterize) {
    return opts.rasterize(svg, spec, target)
  }
  return svg
}

/**
 * 构造一个 `(html, target) => string` 装饰器，按 plan 把锚点替换/插入为 SVG 模块。
 */
export function composeSvgDecorate(
  plan: SvgInjectionPlan,
  opts: SvgDecorateOptions,
): (html: string, target: ExportTarget) => string {
  return (html: string, target: ExportTarget): string => {
    if (!html) return html
    let result = html
    const theme = buildThemeContext({
      primaryColor: opts.primaryColor,
      persona: opts.persona,
      target,
      accentColor: opts.accentColor,
    })

    // 1. 标题 → 标题头模块（替换 <hN>…</hN>）
    if (plan.headings) {
      for (const h of plan.headings) {
        const spec = getSvgModule(h.module)
        if (!spec) continue
        const re = new RegExp(`<h${h.level}\\b[^>]*>([\\s\\S]*?)<\\/h${h.level}>`, 'gi')
        result = result.replace(re, (_m, inner: string) =>
          emit(spec, { theme, text: extractText(inner) }, target, opts),
        )
      }
    }

    // 2. <hr> → 分隔线模块
    if (plan.replaceHr) {
      const spec = getSvgModule(plan.replaceHr)
      if (spec) {
        const re = /<hr\b[^>]*\/?>(?:\s*<\/hr>)?/gi
        result = result.replace(re, () => emit(spec, { theme }, target, opts))
      }
    }

    // 3. <blockquote> → 引用卡模块
    if (plan.blockquote) {
      const spec = getSvgModule(plan.blockquote)
      if (spec) {
        const re = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi
        result = result.replace(re, (_m, inner: string) =>
          emit(spec, { theme, text: extractText(inner) }, target, opts),
        )
      }
    }

    // 4. 文首封面（前插，data-ink-svg 哨兵防重复）
    if (plan.cover) {
      const spec = getSvgModule(plan.cover)
      if (spec && !result.includes(`data-ink-svg="${plan.cover}"`)) {
        result = emit(spec, { theme }, target, opts) + result
      }
    }

    // 5. 文末结束标（追加，哨兵防重复）
    if (plan.endmark) {
      const spec = getSvgModule(plan.endmark)
      if (spec && !result.includes(`data-ink-svg="${plan.endmark}"`)) {
        result = result + emit(spec, { theme }, target, opts)
      }
    }

    return result
  }
}

/** 串联多个 decorate 函数（与 preset-decorations.chainDecorators 同义，便于本模块独立使用）。 */
export function chainSvgDecorators(
  ...fns: ((html: string, target: ExportTarget) => string)[]
): (html: string, target: ExportTarget) => string {
  return (html: string, target: ExportTarget): string =>
    fns.reduce((acc, fn) => (fn ? fn(acc, target) : acc), html)
}
