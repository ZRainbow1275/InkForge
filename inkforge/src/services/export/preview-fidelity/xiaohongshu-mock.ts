/**
 * 小红书发布预览 — 高保真 mock 渲染器 (P3-T9)
 *
 * 把 markdownToXiaohongshuText 已生成的 text artifact 包装成 RED 卡片样式 HTML。
 * 关键 fidelity 不变量：<article> 部分的纯文本（去 HTML 后）必须与 input.text
 * 完全一致（仅 HTML escape 转义，不做任何文本改写）。
 *
 * 本模块 self-contained：
 *   - 不调用 markdownToXiaohongshuText（由调用方传入 artifact）
 *   - 不引入新依赖（escape 自实现）
 *   - 输出 HTML 可直接用于 v-html
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
  "'PingFang SC','Hiragino Sans GB','Source Han Sans CN',Helvetica,Arial,sans-serif"

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

// 每个 preset 的标题 emoji 装饰（参考 XHS 真实笔记排版习惯：
// fresh → 自然清新, simple → 极简笔记, warm → 温暖治愈,
// tech → 科技数码, nature → 户外自然）
const TITLE_DECORATIONS: Record<XhsMockPresetId, string> = {
  fresh: '🌿',
  simple: '📝',
  warm: '💕',
  tech: '💡',
  nature: '🌱',
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
const WATERMARK_TEXT = '小红书 · 发布预览'

export function renderXhsMockHtml(
  input: XhsMockInput,
  options: XhsMockOptions = {}
): string {
  const presetId: XhsMockPresetId = options.presetId ?? 'fresh'
  const tokens = PRESET_TOKENS[presetId] ?? PRESET_TOKENS.fresh
  const primary = options.primaryColor ?? tokens.primaryColor
  const titleEmoji = TITLE_DECORATIONS[presetId]

  const showTitle = options.showTitleHeader ?? true
  const showHashtags = options.showHashtagPills ?? true
  const showCounter = options.showCharCounter ?? true

  // Body: prefer input.body when provided; else use full text
  const articleText = input.body && input.body.length > 0 ? input.body : input.text

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
    titleEmoji,
  })

  const articleStyle = [
    'margin:0',
    'padding:4px 2px 8px',
    'color:#2A2A2A',
    `font-family:${tokens.fontFamily}`,
    'font-size:16px',
    'line-height:1.85',
    'letter-spacing:0.2px',
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';')

  const sectionStyle = [
    'display:block',
    'max-width:400px',
    'margin:0 auto',
    'padding:22px 22px 18px',
    'border-radius:18px',
    `background:linear-gradient(180deg, ${tokens.background} 0%, #FFFFFF 60%)`,
    `border-top:3px solid ${primary}`,
    'box-shadow:0 10px 32px rgba(0,0,0,0.08),0 2px 6px rgba(0,0,0,0.04)',
    `font-family:${tokens.fontFamily}`,
    'color:#333',
    'box-sizing:border-box',
  ].join(';')

  const watermarkStyle = [
    'margin-top:14px',
    'padding-top:10px',
    'border-top:1px dashed rgba(180,180,180,0.4)',
    'font-size:11px',
    `color:${primary}99`,
    'text-align:center',
    'letter-spacing:1px',
  ].join(';')

  return [
    `<section class="xhs-mock" data-preset="${escapeHtml(presetId)}" style="${sectionStyle}">`,
    headerSection,
    `<article class="xhs-mock-body" style="${articleStyle}">${escapeHtml(articleText)}</article>`,
    hashtagSection,
    `<div class="xhs-mock-watermark" style="${watermarkStyle}">${escapeHtml(WATERMARK_TEXT)}</div>`,
    '</section>',
  ].join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// 内部渲染辅助
// ─────────────────────────────────────────────────────────────────────────────

function renderHeader(
  input: XhsMockInput,
  primary: string,
  opts: { showTitle: boolean; showCounter: boolean; titleEmoji?: string }
): string {
  const { showTitle, showCounter, titleEmoji } = opts
  const hasTitle = showTitle && Boolean(input.title)
  const counterHtml = showCounter ? renderCounter(input, primary) : ''

  if (!hasTitle && !counterHtml) return ''

  const counterRow = counterHtml
    ? `<div style="display:flex;justify-content:flex-end;margin-bottom:${hasTitle ? '8px' : '0'};">${counterHtml}</div>`
    : ''

  const decoLeft = titleEmoji ? `${escapeHtml(titleEmoji)} ` : ''
  const titleHtml = hasTitle
    ? `<div class="xhs-mock-title" style="text-align:center;font-size:19px;font-weight:700;color:#1A1A1A;line-height:1.4;letter-spacing:0.5px;padding:4px 0 8px;word-break:break-word;">${decoLeft}${escapeHtml(input.title!)}</div>`
    : ''

  const headerStyle = hasTitle
    ? `display:block;margin-bottom:14px;border-bottom:1px solid ${primary}22;padding-bottom:6px`
    : 'display:block;margin-bottom:10px'

  return `<header class="xhs-mock-meta" style="${headerStyle}">${counterRow}${titleHtml}</header>`
}

function renderCounter(input: XhsMockInput, primary: string): string {
  const count = Math.max(0, Math.floor(input.charCount))
  const over = input.overLimit || count > CHAR_LIMIT

  // 在限内：用 preset primary 色 + 8% 透明背景，呈现轻量 chip 风格。
  // 超限：白字 + 红底警示，与不变量测试保持一致（含 ⚠ + #E53935 + "1100 / 1000 字"）。
  const color = over ? '#FFFFFF' : primary
  const bg = over ? '#E53935' : `${primary}14`
  const prefix = over ? '⚠️ ' : ''
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
