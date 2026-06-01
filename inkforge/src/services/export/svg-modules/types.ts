/**
 * SVG 高级排版组件系统 — 数据模型
 *
 * 见 prompts/0601/SPEC.md §2。这是整个 svg-modules 子系统的契约层：
 * 所有模块 render 返回的字符串必须通过 wechat-safe.ts 的 assertWechatSafe。
 *
 * 设计铁律（来自 prompts/0601/research/wechat-svg-capabilities.md）：
 * - 仅微信安全子集：<svg viewBox width="100%">/<g>/<path>/<rect>/<circle>/<text>
 *   + fill(hex/rgba)/stroke/opacity/transform(属性)/SMIL；<section> 包裹（绝不 <div>）。
 * - 禁止 class/<style>/var()/calc()/foreignObject/<defs>/渐变/clip/mask/filter/use/外链<image>。
 * - 颜色全部 hex 或 rgba（微信不支持 var()）。
 */
import type { PresetPersona, ExportTarget } from '@/types'

/** 从 preset.primaryColor + persona + 品牌 token 派生的安全调色板（全 hex/rgba） */
export interface SvgPalette {
  /** 正文/主文字色（深） */
  ink: string
  /** 次文字 rgba */
  inkSoft: string
  /** = preset.primaryColor（规范化为 #rrggbb） */
  accent: string
  /** 低透明度 accent（rgba）——渐变/光晕的安全替代 */
  accentSoft: string
  /** 背景（亮） */
  paper: string
  /** 品牌 --paper-warm 砚白 */
  paperWarm: string
  /** 品牌 --ember 铸红（每屏 ≤2 次自律） */
  ember: string
  /** 细线/分隔色 */
  hairline: string
  /** accent 之上的文字色（按对比度自动取白或墨） */
  onAccent: string
  /** 卡片底板淡彩（rgba accent，creative/lifestyle 0.12 / 其余 0.08） */
  accentTint: string
  /** 较强淡彩（rgba accent 0.16），用于 callout/标题底板 */
  accentTintStrong: string
  /** 边框用 accent（rgba accent 0.30） */
  accentBorder: string
  /** 列表标记用 accent（rgba accent 0.26） */
  accentMarker: string
}

export interface SvgThemeContext {
  primaryColor: string
  persona: PresetPersona
  /** xhs/zhihu 次色 */
  accentColor?: string
  target: ExportTarget
  palette: SvgPalette
  /** preview/wechat 允许 SMIL；xhs/zhihu 栅格化时取静态首帧 */
  allowMotion: boolean
}

export interface SvgScrollItem {
  title: string
  body?: string
}

export interface SvgModuleParams {
  theme: SvgThemeContext
  text?: string
  subtitle?: string
  /** 编号徽章序号 */
  index?: number
  /** 横滑卡片 / 序列帧条目 */
  items?: SvgScrollItem[]
  /** 模块族内变体 id */
  variant?: string
}

export type SvgModuleRenderer = (p: SvgModuleParams) => string

export type SvgModuleFamily =
  | 'header'
  | 'divider'
  | 'quote'
  | 'badge'
  | 'endmark'
  | 'cover'
  | 'interactive'

export interface SvgModuleSpec {
  /** 全局唯一，用作 data-ink-svg 哨兵值 */
  id: string
  family: SvgModuleFamily
  description: string
  render: SvgModuleRenderer
  /** 是否含 SMIL（需 theme.allowMotion） */
  interactive?: boolean
  /** preview/wechat 直出 inline；列出的 target 需 raster.ts 包成 <img>。默认 ['xhs','zhihu'] */
  rasterizeOn?: ExportTarget[]
}
