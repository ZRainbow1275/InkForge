/**
 * SVG 调色板派生 — 见 prompts/0601/SPEC.md §3。
 *
 * 纯函数：同输入同输出（便于快照测试与幂等）。颜色全部输出为 hex 或 rgba
 * （微信不支持 var()）。品牌 token 从 src/styles/design-system.css:73-74 同步。
 */
import type { PresetPersona, ExportTarget } from '@/types'
import type { SvgPalette, SvgThemeContext } from './types'

/** 品牌 token（同步自 src/styles/design-system.css，不另造） */
export const BRAND_TOKENS = {
  emberLight: '#c9362c', // 铸红 --ember
  emberDark: '#e15a4e',
  paperWarmLight: '#f7f4ef', // 砚白 --paper-warm
  paperWarmDark: '#1b2230',
} as const

const INK = '#1a1a1a' // 与 preset-fonts.ts #nice color 一致
const PAPER = '#ffffff'

/** 规范化为 6 位小写 hex（不含 #）。非法输入回退到 000000。 */
export function normalizeHex(input: string): string {
  let h = String(input || '').trim().replace(/^#/, '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '000000'
  return h.toLowerCase()
}

export function hexToRgb(input: string): { r: number; g: number; b: number } {
  const h = normalizeHex(input)
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** 接受 hex，返回 rgba() 字符串（alpha 夹紧到 [0,1]）。 */
export function rgba(color: string, alpha: number): string {
  const { r, g, b } = hexToRgb(color)
  const a = Math.max(0, Math.min(1, alpha))
  // 去掉浮点尾巴，保持快照稳定
  const aStr = Number(a.toFixed(3)).toString()
  return `rgba(${r}, ${g}, ${b}, ${aStr})`
}

/** WCAG 相对亮度，用于决定 accent 上的文字取白还是取墨。 */
export function relativeLuminance(color: string): number {
  const { r, g, b } = hexToRgb(color)
  const srgb = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

/** WCAG 对比度（(L1+0.05)/(L2+0.05)）。 */
function contrastRatio(a: number, b: number): number {
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

/** WCAG 大字（≥18px 常规 / ≥14px 粗体）对比度门槛。填充条/chip 文字均为大字粗体。 */
const AA_LARGE = 3.0

/**
 * accent 之上的文字色：**白优先**（保留实色填充条/chip 的编辑感冲击力），
 * 仅当白-on-accent 对比度低于 AA 大字门槛 3.0 时才回退到墨。
 *
 * 设计一致性 + 可达性兼顾（单一 3.0 大字门槛，非每预设硬编码）：
 *   - Kiln  #D95B3F：白 CR≈3.81 ≥ 3.0 → 白（实色红条上的醒目白字，最强处理）。
 *   - Tempera #3B7A6B：白 CR≈5.02 → 白。
 *   - Amber #C19A56：白 CR≈2.0 < 3.0 → 墨（白字连 AA 大字都不到，墨字 CR≈6.65）。
 */
function pickOnAccent(accentHex: string): string {
  const whiteCr = contrastRatio(relativeLuminance('#ffffff'), relativeLuminance(accentHex))
  return whiteCr >= AA_LARGE ? '#ffffff' : INK
}

/**
 * 把 accent 朝黑(#000)逐步混合，取**最小** t（0..0.8、step 0.04）使白字-on-混合色
 * 的 WCAG 对比度 ≥ minWhiteCr（默认 4.5，正文白字门槛）。扫完仍不达标则取 t=0.8。
 * 返回 6 位 hex（带 #）。
 *
 * 用途：满幅反白色块 / 色带封面需要「能稳吃 #fff 白字」的深色 accent。
 * 例：amber #C19A56（白 CR≈2.0）→ 深棕铜；tempera #3B7A6B（白 CR≈5.02）→ t=0 不变。
 *
 * 纯函数（同输入同输出，快照稳定）。`blend(c,t)=Math.round(c*(1-t))`。
 */
export function darkenForWhiteText(hex: string, minWhiteCr = 4.5): string {
  const { r, g, b } = hexToRgb(hex)
  const whiteLum = relativeLuminance('#ffffff')
  const blend = (c: number, t: number): number => Math.round(c * (1 - t))
  const toHex = (n: number): string => n.toString(16).padStart(2, '0')
  let chosen = 0.8
  for (let t = 0; t <= 0.8 + 1e-9; t += 0.04) {
    const rt = blend(r, t)
    const gt = blend(g, t)
    const bt = blend(b, t)
    const blended = '#' + toHex(rt) + toHex(gt) + toHex(bt)
    if (contrastRatio(whiteLum, relativeLuminance(blended)) >= minWhiteCr) {
      chosen = t
      break
    }
  }
  return '#' + toHex(blend(r, chosen)) + toHex(blend(g, chosen)) + toHex(blend(b, chosen))
}

export function deriveSvgPalette(
  primaryColor: string,
  persona: PresetPersona,
  _accentColor?: string,
): SvgPalette {
  const accent = '#' + normalizeHex(primaryColor)
  // 生活/创意 persona 给更明显的余色块，学术/商务更克制
  const softAlpha = persona === 'creative' || persona === 'lifestyle' ? 0.12 : 0.08
  return {
    ink: INK,
    inkSoft: rgba(INK, 0.55),
    accent,
    accentDeep: darkenForWhiteText(accent),
    accentSoft: rgba(accent, softAlpha),
    paper: PAPER,
    paperWarm: BRAND_TOKENS.paperWarmLight,
    ember: BRAND_TOKENS.emberLight,
    hairline: rgba(INK, 0.12),
    onAccent: pickOnAccent(accent),
    // HTML 色块装饰用淡彩（纯 rgba accent，绝不渐变；见 pattern-* 研究）
    accentTint: rgba(accent, softAlpha),
    accentTintStrong: rgba(accent, 0.16),
    accentBorder: rgba(accent, 0.3),
    accentMarker: rgba(accent, 0.26),
  }
}

export function buildThemeContext(opts: {
  primaryColor: string
  persona: PresetPersona
  target: ExportTarget
  accentColor?: string
}): SvgThemeContext {
  const { primaryColor, persona, target, accentColor } = opts
  return {
    primaryColor,
    persona,
    accentColor,
    target,
    palette: deriveSvgPalette(primaryColor, persona, accentColor),
    allowMotion: target === 'preview' || target === 'wechat',
  }
}
