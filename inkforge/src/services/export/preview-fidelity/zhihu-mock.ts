/**
 * 知乎发布预览 — 高保真 mock 渲染器 (P3-T10)
 *
 * 输入：markdownToZhihuClean(...).markdown 产物（可能包含已转换的 equation img，
 * 也可能保留原始 $$..$$ / $..$ 当 markdown engine 关闭 convertLatexToImg 时）。
 * 输出：self-contained HTML，可直接用于 v-html，反映"知乎实际会渲染"的样貌：
 *   - 三个 preset (academic / tech / insight) 决定主色与字体
 *   - LaTeX 在 fidelity 中始终强制以 zhihu equation 端点 img 呈现
 *   - 代码块按 marked 输出再注入语言徽章
 *   - GFM 表格保留（fidelity 不接 export 的 fallback 降级）
 *   - 末尾追加 watermark 提醒"知乎 web 编辑器会过滤大部分 CSS"
 *
 * 本模块 self-contained：
 *   - marked 已是项目依赖
 *   - LaTeX 强制转换复用 platform-rules/zhihu 的 convertLatexToEquationImg
 *   - 不修改 zhihu.ts / zhihu-markdown.ts
 *   - 不引入新依赖
 */

import { marked } from 'marked'
import { convertLatexToEquationImg } from '../platform-rules/zhihu'

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
   * 注入后会覆盖 mock 内联 fallback 的字体/装饰/标题颜色等。
   * 未提供时 mock 仍以内联 PRESET_TOKENS + applyInlineThemeAccents 渲染。
   *
   * 注意：preset 中由 composeRecipes 注入的规则使用 `#nice` 前缀，会被
   * 自动改写为 `#zhihu-answer` 以匹配本 mock 的容器 id。
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
  "-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Microsoft YaHei',sans-serif"

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
    fontSize: '15px',
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

  // Step 3: 注入代码块语言徽章
  const htmlWithBadges = showCodeLanguageBadge ? injectCodeLanguageBadges(rawHtml) : rawHtml

  // Step 4: 包装为 zhihu-mock 容器 + 内联主题样式
  const containerStyle = [
    `font-family:${tokens.fontFamily}`,
    `font-size:${tokens.fontSize}`,
    `line-height:1.8`,
    `color:#1a1a1a`,
    `background:${tokens.background}`,
    `padding:24px 28px`,
    `border-radius:8px`,
    `--zhihu-mock-primary:${tokens.primaryColor}`,
  ].join(';')

  const themedHtml = applyInlineThemeAccents(htmlWithBadges, tokens.primaryColor)

  // Step 5: watermark
  const watermark = `<div class="zhihu-mock-watermark" style="margin-top:24px;padding:8px 12px;font-size:12px;color:#888;border-top:1px dashed #e5e5e5;text-align:center;">预览 · 知乎 web 编辑器会过滤大部分 CSS</div>`

  // Step 6: preset themeCSS — scoped to `#zhihu-answer`. Injected before body
  // so cascade order favors mock inline styles only when no preset rule matches.
  const themeStyle = renderThemeStyle(options?.themeCSS)

  return `<section id="zhihu-answer" class="zhihu-mock zhihu-mock-${escapeAttr(options?.presetId ?? 'academic')}" data-primary="${escapeAttr(tokens.primaryColor)}" style="${containerStyle}">${themeStyle}${themedHtml}${watermark}</section>`
}

/**
 * Wrap preset.previewCSS in a `<style>` block scoped to the zhihu mock container.
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

// ─────────────────────────────────────────────────────────────────────────────
// 后处理：代码块语言徽章 + preset 主色点缀
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

/**
 * 给标题/链接/强调/blockquote 注入主色的内联样式。
 * 注意：marked 输出标准 HTML，这里只 patch 几个常见标签，避免污染纯文本结构。
 */
function applyInlineThemeAccents(html: string, primary: string): string {
  let out = html

  // h1：主色下边框
  out = out.replace(
    /<h1>([\s\S]*?)<\/h1>/g,
    (_m, body: string) =>
      `<h1 style="font-size:24px;font-weight:700;color:#1a1a1a;margin:24px 0 16px;padding-bottom:10px;border-bottom:2px solid ${primary};">${body}</h1>`
  )

  // h2：左边框
  out = out.replace(
    /<h2>([\s\S]*?)<\/h2>/g,
    (_m, body: string) =>
      `<h2 style="font-size:20px;font-weight:600;color:#1a1a1a;margin:22px 0 12px;padding-left:10px;border-left:4px solid ${primary};">${body}</h2>`
  )

  // h3：主色文字
  out = out.replace(
    /<h3>([\s\S]*?)<\/h3>/g,
    (_m, body: string) =>
      `<h3 style="font-size:17px;font-weight:600;color:${primary};margin:18px 0 10px;">${body}</h3>`
  )

  // strong：主色加粗
  out = out.replace(
    /<strong>([\s\S]*?)<\/strong>/g,
    (_m, body: string) => `<strong style="color:${primary};font-weight:600;">${body}</strong>`
  )

  // a：主色下划线
  out = out.replace(
    /<a href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g,
    (_m, href: string, attrs: string, body: string) =>
      `<a href="${href}"${attrs} style="color:${primary};text-decoration:none;border-bottom:1px solid ${primary};">${body}</a>`
  )

  // blockquote：左边框 + 浅色背景
  out = out.replace(
    /<blockquote>([\s\S]*?)<\/blockquote>/g,
    (_m, body: string) =>
      `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid ${primary};background:#f6f6f6;color:#555;">${body}</blockquote>`
  )

  // table：基础样式（fidelity 保留 GFM 表格）
  out = out.replace(
    /<table>/g,
    `<table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">`
  )
  out = out.replace(
    /<th>/g,
    `<th style="border:1px solid #e5e5e5;padding:8px 12px;background:#fafafa;text-align:left;font-weight:600;">`
  )
  out = out.replace(
    /<td>/g,
    `<td style="border:1px solid #e5e5e5;padding:8px 12px;">`
  )

  return out
}
