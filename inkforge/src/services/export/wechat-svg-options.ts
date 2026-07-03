import type { ExportPreset, PresetPersona } from '@/types'

import { composeSvgDecorate } from './svg-modules'
import type { SvgInjectionPlan } from './svg-modules'
import type { WechatExportOptions } from './types'

type WechatSvgOptionPreset = Pick<ExportPreset, 'primaryColor'> &
  Partial<Pick<ExportPreset, 'persona'>>

export function hasWechatSvgInjectionPlan(plan?: SvgInjectionPlan): plan is SvgInjectionPlan {
  return Boolean(
    plan?.cover ||
    plan?.replaceHr ||
    plan?.blockquote ||
    plan?.endmark ||
    (plan?.headings && plan.headings.length > 0),
  )
}

function getWechatSvgPersona(preset: WechatSvgOptionPreset): PresetPersona {
  return preset.persona ?? 'business'
}

export function applyWechatOptionSvgModules(
  html: string,
  preset: WechatSvgOptionPreset,
  options: WechatExportOptions,
): string {
  if (options.enableSvgModules !== true || !hasWechatSvgInjectionPlan(options.svgInjectionPlan)) {
    return html
  }

  return composeSvgDecorate(options.svgInjectionPlan, {
    primaryColor: preset.primaryColor,
    persona: getWechatSvgPersona(preset),
  })(html, 'wechat')
}
