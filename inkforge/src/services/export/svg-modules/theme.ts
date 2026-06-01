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
    accentSoft: rgba(accent, softAlpha),
    paper: PAPER,
    paperWarm: BRAND_TOKENS.paperWarmLight,
    ember: BRAND_TOKENS.emberLight,
    hairline: rgba(INK, 0.12),
    onAccent: relativeLuminance(accent) < 0.5 ? '#ffffff' : INK,
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
