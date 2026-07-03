import { SVG_MODULES } from './svg-modules'
import type { SvgInjectionPlan, SvgModuleFamily, SvgModuleSpec } from './svg-modules'

export type WechatSvgApplicationSlotId =
  | 'cover'
  | 'heading'
  | 'divider'
  | 'blockquote'
  | 'showcase'

export interface WechatSvgApplicationSlot {
  id: WechatSvgApplicationSlotId
  label: string
  description: string
  planTarget: 'cover' | 'heading-h2' | 'replace-hr' | 'blockquote' | 'endmark'
  modules: readonly SvgModuleSpec[]
}

const WECHAT_SVG_FALLBACK_MODULE_ID = SVG_MODULES[0]?.id ?? ''

function modulesByFamily(family: SvgModuleFamily): readonly SvgModuleSpec[] {
  return SVG_MODULES.filter(module => module.family === family)
}

function firstModuleId(family: SvgModuleFamily): string {
  return SVG_MODULES.find(module => module.family === family)?.id ?? WECHAT_SVG_FALLBACK_MODULE_ID
}

export const WECHAT_SVG_APPLICATION_SLOTS: readonly WechatSvgApplicationSlot[] = [
  {
    id: 'cover',
    label: '封面导语',
    description: '插入文首封面或导语 SVG，适合公众号头图式开场。',
    planTarget: 'cover',
    modules: modulesByFamily('cover'),
  },
  {
    id: 'heading',
    label: '二级标题',
    description: '替换 H2 标题为 SVG 标题系统，承接文章章节层级。',
    planTarget: 'heading-h2',
    modules: modulesByFamily('header'),
  },
  {
    id: 'divider',
    label: '分割线',
    description: '替换 Markdown 分割线，形成更强的章节节奏。',
    planTarget: 'replace-hr',
    modules: modulesByFamily('divider'),
  },
  {
    id: 'blockquote',
    label: '引用卡片',
    description: '替换引用块，保留原始引用文本并应用 SVG 样式。',
    planTarget: 'blockquote',
    modules: modulesByFamily('quote'),
  },
  {
    id: 'showcase',
    label: '全量试用位',
    description: '将任意已注册 SVG 模块追加到文末，用于应用层全量预览与挑选。',
    planTarget: 'endmark',
    modules: SVG_MODULES,
  },
]

export function createDefaultWechatSvgInjectionPlan(): SvgInjectionPlan {
  return {
    cover: firstModuleId('cover'),
    headings: [{ level: 2, module: firstModuleId('header') }],
    replaceHr: firstModuleId('divider'),
    blockquote: firstModuleId('quote'),
    endmark: firstModuleId('endmark'),
  }
}

export function normalizeWechatSvgApplicationPlan(plan?: SvgInjectionPlan): SvgInjectionPlan {
  const defaults = createDefaultWechatSvgInjectionPlan()
  return {
    ...defaults,
    ...plan,
    headings: plan?.headings && plan.headings.length > 0
      ? plan.headings
      : defaults.headings,
  }
}

export function getWechatSvgApplicationSlotModuleId(
  plan: SvgInjectionPlan | undefined,
  slotId: WechatSvgApplicationSlotId,
): string {
  const normalized = normalizeWechatSvgApplicationPlan(plan)

  switch (slotId) {
    case 'cover':
      return normalized.cover ?? ''
    case 'heading':
      return normalized.headings?.find(heading => heading.level === 2)?.module
        ?? normalized.headings?.[0]?.module
        ?? ''
    case 'divider':
      return normalized.replaceHr ?? ''
    case 'blockquote':
      return normalized.blockquote ?? ''
    case 'showcase':
      return normalized.endmark ?? ''
    default: {
      const exhaustive: never = slotId
      return exhaustive
    }
  }
}

export function setWechatSvgApplicationSlot(
  plan: SvgInjectionPlan | undefined,
  slotId: WechatSvgApplicationSlotId,
  moduleId: string,
): SvgInjectionPlan {
  const normalized = normalizeWechatSvgApplicationPlan(plan)

  switch (slotId) {
    case 'cover':
      return { ...normalized, cover: moduleId }
    case 'heading':
      return {
        ...normalized,
        headings: [{ level: 2, module: moduleId }],
      }
    case 'divider':
      return { ...normalized, replaceHr: moduleId }
    case 'blockquote':
      return { ...normalized, blockquote: moduleId }
    case 'showcase':
      return { ...normalized, endmark: moduleId }
    default: {
      const exhaustive: never = slotId
      return exhaustive
    }
  }
}
