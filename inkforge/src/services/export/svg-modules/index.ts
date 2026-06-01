/**
 * svg-modules — 微信安全 inline-SVG 高级排版组件系统。
 * 公共桶导出 + 模块注册表。见 prompts/0601/SPEC.md。
 *
 * PR1 地基：types/theme/primitives/wechat-safe。
 * PR2 静态模块族：headers/dividers/quotes/badges/endmarks/covers（22 变体）。
 * PR3 将追加 inject.ts（composeSvgDecorate 注入钩子）与 interactive 族。
 */
import type { SvgModuleSpec } from './types'
import { headerModules } from './headers'
import { dividerModules } from './dividers'
import { quoteModules } from './quotes'
import { badgeModules } from './badges'
import { endmarkModules } from './endmarks'
import { coverModules } from './covers'
import { interactiveModules } from './interactive'

export * from './types'
export * from './theme'
export * from './primitives'
export * from './wechat-safe'
export * from './inject'
export * from './raster'

export { headerModules } from './headers'
export { dividerModules } from './dividers'
export { quoteModules } from './quotes'
export { badgeModules } from './badges'
export { endmarkModules } from './endmarks'
export { coverModules } from './covers'
export { interactiveModules } from './interactive'

/** 全部模块：PR2 静态族（22 变体）+ PR4 interactive 族（4 变体）= 26。 */
export const SVG_MODULES: SvgModuleSpec[] = [
  ...headerModules,
  ...dividerModules,
  ...quoteModules,
  ...badgeModules,
  ...endmarkModules,
  ...coverModules,
  ...interactiveModules,
]

/** id → 模块规格 映射，供 inject.ts 与预设按 id 取模块。 */
export const SVG_MODULE_REGISTRY: Record<string, SvgModuleSpec> = Object.fromEntries(
  SVG_MODULES.map((m) => [m.id, m]),
)

export function getSvgModule(id: string): SvgModuleSpec | undefined {
  return SVG_MODULE_REGISTRY[id]
}

/** 按族过滤模块。 */
export function getSvgModulesByFamily(family: SvgModuleSpec['family']): SvgModuleSpec[] {
  return SVG_MODULES.filter((m) => m.family === family)
}
