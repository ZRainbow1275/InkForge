/**
 * 小红书长文编辑器本地保真预览渲染器 (P3-T9)
 *
 * 把 markdownToXiaohongshuText 已生成的 text artifact 放入实测长文编辑画布。
 * 关键 fidelity 不变量：关闭标题与 hashtag 元信息层时，<article> 部分的纯文本
 * （去 HTML 后）必须与 input.text 完全一致（仅 HTML escape 转义，不做文本改写）。
 * 显示元信息层时，标题/hashtags 由各自 UI 呈现，正文优先使用 input.body。
 *
 * 本模块 self-contained：
 *   - 不调用 markdownToXiaohongshuText（由调用方传入 artifact）
 *   - 不引入新依赖（escape 自实现）
 *   - 输出 HTML 可直接用于 v-html
 *   - 不伪造平台账号、发布状态、营销卡片阴影或平台水印
 */

// ─────────────────────────────────────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────────────────────────────────────

export type XhsMockPresetId = 'fresh' | 'simple' | 'warm' | 'tech' | 'nature'

export interface XhsMockOptions {
  presetId?: XhsMockPresetId
  /** primary color override（覆盖 preset 默认色） */
  primaryColor?: string
  /** 显示标题栏 (默认 true) */
  showTitleHeader?: boolean
  /** 显示 hashtag pills (默认 true) */
  showHashtagPills?: boolean
  /** 显示字符计数 (默认 true) */
  showCharCounter?: boolean
  /**
   * 来自 themes.ts xhs preset.previewCSS 的主题 CSS，scope 到 `#xhs-note`。
   * 注入后会覆盖平台基线中的字体/装饰/标题颜色等。
   * 未提供时仍按实测 896px 长文编辑画布渲染。
   *
   * 注意：preset 中由 composeRecipes 注入的规则使用 `#nice` 前缀，会被
   * 自动改写为 `#xhs-note` 以匹配本地预览容器 id。
   */
  themeCSS?: string
}

export interface XhsMockInput {
  /** 完整发布文本（来自 markdownToXiaohongshuText(...).text） */
  text: string
  /** 标题（来自 result.title，可选） */
  title?: string
  /** 正文（来自 result.body，可选） */
  body?: string
  /** 经过 platform-rules 处理后准备发布的 hashtags */
  hashtags?: string[]
  /** 文本引擎建议的话题标签（hashtags 缺失时回退使用） */
  suggestedTags?: string[]
  /** 字符总数 */
  charCount: number
  /** 是否超过平台 1000 字限制 */
  overLimit: boolean
}

interface PresetTokens {
  primaryColor: string
  fontFamily: string
  background: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset 配色（5 个内置 preset）
// ─────────────────────────────────────────────────────────────────────────────

const FONT_STACK_CN =
  "'AlibabaPuHuiTi','OPPOSans','PingFang SC','Source Han Sans SC','Microsoft YaHei',sans-serif"

const PRESET_TOKENS: Record<XhsMockPresetId, PresetTokens> = {
  fresh: {
    primaryColor: '#2BBF7C',
    fontFamily: FONT_STACK_CN,
    background: '#FAFFFB',
  },
  simple: {
    primaryColor: '#607D8B',
    fontFamily: FONT_STACK_CN,
    background: '#FAFAFA',
  },
  warm: {
    primaryColor: '#FF6B6B',
    fontFamily: FONT_STACK_CN,
    background: '#FFF7F5',
  },
  tech: {
    primaryColor: '#2962FF',
    fontFamily: FONT_STACK_CN,
    background: '#F5F8FF',
  },
  nature: {
    primaryColor: '#43A047',
    fontFamily: FONT_STACK_CN,
    background: '#F4FBF4',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML escape — self-contained，覆盖 5 个高危字符
// ─────────────────────────────────────────────────────────────────────────────

const ESCAPE_TABLE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE_TABLE[ch] ?? ch)
}

// ─────────────────────────────────────────────────────────────────────────────
// 公共 API
// ─────────────────────────────────────────────────────────────────────────────

const CHAR_LIMIT = 1000

export function renderXhsMockHtml(
  input: XhsMockInput,
  options: XhsMockOptions = {}
): string {
  const presetId: XhsMockPresetId = options.presetId ?? 'fresh'
  const tokens = PRESET_TOKENS[presetId] ?? PRESET_TOKENS.fresh
  const primary = options.primaryColor ?? tokens.primaryColor
  const baselineStyle = renderPlatformBaselineStyle(tokens.fontFamily)
  const themeStyle = renderThemeStyle(options.themeCSS)

  const showTitle = options.showTitleHeader ?? true
  const showHashtags = options.showHashtagPills ?? true
  const showCounter = options.showCharCounter ?? true

  // With both metadata layers disabled, the article is the exact publishable
  // artifact. Otherwise title/hashtags are rendered separately and body avoids
  // duplicating those fields in the canvas.
  const articleText = !showTitle && !showHashtags
    ? input.text
    : input.body && input.body.length > 0
      ? input.body
      : input.text

  // Hashtags: prefer input.hashtags; fallback to suggestedTags
  const tags =
    input.hashtags && input.hashtags.length > 0
      ? input.hashtags
      : input.suggestedTags ?? []
  const hashtagSection = showHashtags && tags.length > 0
    ? renderHashtagPills(tags, primary)
    : ''

  const headerSection = renderHeader(input, primary, {
    showTitle,
    showCounter,
  })

  const articleStyle = [
    'margin:0',
    'padding:4px 0 8px',
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';')

  const sectionStyle = [
    'display:block',
    'width:100%',
    'max-width:896px',
    'margin:0 auto',
    'padding:0 22px 40px',
    `--xhs-preview-primary:${primary}`,
    `--xhs-preview-background:${tokens.background}`,
    'box-sizing:border-box',
  ].join(';')

  return [
    `<section id="xhs-note" class="xhs-mock" data-platform-editor="xiaohongshu" data-editor-canvas-width="896" data-preset="${escapeHtml(presetId)}" style="${sectionStyle}">`,
    baselineStyle,
    themeStyle,
    headerSection,
    `<article class="xhs-mock-body" style="${articleStyle}">${escapeHtml(articleText)}</article>`,
    hashtagSection,
    '</section>',
  ].join('')
}

function renderPlatformBaselineStyle(fontFamily: string): string {
  return [
    '<style data-platform-baseline="xiaohongshu">',
    `#xhs-note{font-family:${fontFamily};font-size:16px;line-height:28px;color:#262626;background:var(--xhs-preview-background,#fff);}`,
    '#xhs-note .xhs-mock-title{font-size:24px;line-height:36px;font-weight:500;text-align:left;color:#262626;}',
    '#xhs-note .xhs-mock-body{font-size:16px;line-height:28px;}',
    '</style>',
  ].join('')
}

/**
 * Wrap preset.previewCSS in a `<style>` block scoped to the xhs mock container.
 *
 * - themes.ts xhs preset CSS already uses `#xhs-note` selectors, injected as-is.
 * - composeRecipes() returns rules prefixed with `#nice` — rewritten to
 *   `#xhs-note` so decoration recipes (drop cap, ornament hr, …) match the
 *   actual mock DOM.
 * - `</style>` in the payload is escaped to prevent breaking out of the block.
 */
function renderThemeStyle(css: string | undefined): string {
  if (!css || !css.trim()) return ''
  const rescoped = css.replace(/#nice\b/g, '#xhs-note')
  const safe = rescoped.replace(/<\/style/gi, '<\\/style')
  return `<style data-preset-theme="xhs-note">${safe}</style>`
}

// ─────────────────────────────────────────────────────────────────────────────
// 内部渲染辅助
// ─────────────────────────────────────────────────────────────────────────────

function renderHeader(
  input: XhsMockInput,
  primary: string,
  opts: { showTitle: boolean; showCounter: boolean }
): string {
  const { showTitle, showCounter } = opts
  const hasTitle = showTitle && Boolean(input.title)
  const counterHtml = showCounter ? renderCounter(input, primary) : ''

  if (!hasTitle && !counterHtml) return ''

  const counterRow = counterHtml
    ? `<div style="display:flex;justify-content:flex-end;margin-bottom:${hasTitle ? '8px' : '0'};">${counterHtml}</div>`
    : ''

  const titleHtml = hasTitle
    ? `<div class="xhs-mock-title" style="font-size:24px;line-height:36px;font-weight:500;text-align:left;color:#262626;padding:0 0 8px;word-break:break-word;">${escapeHtml(input.title!)}</div>`
    : ''

  const headerStyle = hasTitle
    ? 'display:block;margin-bottom:8px;padding-top:18px'
    : 'display:block;margin-bottom:10px'

  return `<header class="xhs-mock-meta" style="${headerStyle}">${counterRow}${titleHtml}</header>`
}

function renderCounter(input: XhsMockInput, primary: string): string {
  const count = Math.max(0, Math.floor(input.charCount))
  const over = input.overLimit || count > CHAR_LIMIT

  // 在限内：用 preset primary 色 + 8% 透明背景，呈现轻量 chip 风格。
  // 超限：白字 + 红底文字警示，与项目无 Emoji 规则保持一致。
  const color = over ? '#FFFFFF' : primary
  const bg = over ? '#E53935' : `${primary}14`
  const prefix = over ? '超限 ' : ''
  const counterStyle = [
    'display:inline-flex',
    'align-items:center',
    'gap:4px',
    'font-size:11px',
    `color:${color}`,
    `background:${bg}`,
    'padding:3px 10px',
    'border-radius:999px',
    over ? 'font-weight:700' : 'font-weight:500',
    'letter-spacing:0.3px',
    'white-space:nowrap',
  ].join(';')

  return `<div class="xhs-mock-counter" style="${counterStyle}">${escapeHtml(prefix)}${count} / ${CHAR_LIMIT} 字</div>`
}

function renderHashtagPills(tags: string[], primary: string): string {
  const footerStyle = [
    'display:flex',
    'flex-wrap:wrap',
    'gap:8px',
    'margin-top:14px',
    'padding-top:12px',
    'border-top:1px solid rgba(0,0,0,0.05)',
  ].join(';')

  const pillStyle = [
    'display:inline-flex',
    'align-items:center',
    `color:${primary}`,
    `background:${hexToTintBackground(primary)}`,
    'font-size:13px',
    'font-weight:500',
    'padding:5px 12px',
    'border-radius:999px',
    `border:1px solid ${primary}22`,
    'letter-spacing:0.2px',
  ].join(';')

  const pills = tags
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .map((t) => `<span class="xhs-mock-tag" style="${pillStyle}">${escapeHtml(t)}</span>`)
    .join('')

  return `<footer class="xhs-mock-hashtags" style="${footerStyle}">${pills}</footer>`
}

/** 将 primary hex 转一个 8% 透明的浅色背景。失败时回退灰白色。 */
function hexToTintBackground(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return '#F5F5F5'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r},${g},${b},0.08)`
}
