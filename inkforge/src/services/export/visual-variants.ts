import { DEFAULT_PRESET_ID } from '@/constants'
import { darkenForWhiteText } from './svg-modules/theme'
import type { Platform } from './types'

export const VISUAL_VARIANT_IDS = [
  'critical-translation',
  'jurisprudence-atlas',
  'industry-section',
  'fact-wire',
  'machine-foundry',
  'knowledge-weave',
  'human-margins',
] as const

export type VisualVariantId = typeof VISUAL_VARIANT_IDS[number]

export const ARTICLE_PROFILE_IDS = [
  'thesis-translation',
  'legal-study',
  'industry-report',
  'current-commentary',
  'aigc',
  'software-creation',
  'study-notes',
  'news',
  'playful',
  'life-reflection',
] as const

export type ArticleProfileId = typeof ARTICLE_PROFILE_IDS[number]

export interface VisualVariantDefinition {
  id: VisualVariantId
  name: string
  englishName: string
  description: string
  defaultProfileId: ArticleProfileId
}

export interface VisualVariantMastheadPresentation {
  name: string
  englishName: string
  index: string
  strap: string
}

export interface ArticleProfileDefinition {
  id: ArticleProfileId
  name: string
  variantId: VisualVariantId
}

export interface LegacyPresetVariantCompatibility {
  variantId: VisualVariantId
  compatibleVariantIds: readonly VisualVariantId[]
  strength: 'base' | 'flagship' | 'compatibility'
}

export interface ResolvedVisualVariant {
  requestedPresetId: string
  presetId: string
  variantId: VisualVariantId
  compatibleVariantIds: readonly VisualVariantId[]
  fallback: boolean
}

export interface ResolvedArticleProfile {
  requestedProfileId: string
  profileId: ArticleProfileId
  variantId: VisualVariantId
  fallback: boolean
}

export const VISUAL_VARIANTS: readonly VisualVariantDefinition[] = [
  {
    id: 'critical-translation',
    name: '典藏译本',
    englishName: 'Critical Translation',
    description: '版本、译注与原文译文双轨组织的学术出版系统。',
    defaultProfileId: 'thesis-translation',
  },
  {
    id: 'jurisprudence-atlas',
    name: '法理坐标',
    englishName: 'Jurisprudence Atlas',
    description: '围绕规则、权威层级、证据链和判例谱系展开的法学长文系统。',
    defaultProfileId: 'legal-study',
  },
  {
    id: 'industry-section',
    name: '产业剖面',
    englishName: 'Industry Section',
    description: '强调口径、情景、价值链、风险和决策窗口的高级研报系统。',
    defaultProfileId: 'industry-report',
  },
  {
    id: 'fact-wire',
    name: '事实通讯',
    englishName: 'Fact Wire',
    description: '以事实、来源、更新时间和观点证据关系驱动的新闻评论系统。',
    defaultProfileId: 'current-commentary',
  },
  {
    id: 'machine-foundry',
    name: '数字铸场',
    englishName: 'Machine Foundry',
    description: '面向模型、代码、版本、构建与复现的数字构成主义系统。',
    defaultProfileId: 'aigc',
  },
  {
    id: 'knowledge-weave',
    name: '知识经纬',
    englishName: 'Knowledge Weave',
    description: '围绕问题、概念、证据、应用与回链组织的学习系统。',
    defaultProfileId: 'study-notes',
  },
  {
    id: 'human-margins',
    name: '人文边页',
    englishName: 'Human Margins',
    description: '在成熟编辑拼贴与纪实信笺之间切换的人文表达系统。',
    defaultProfileId: 'life-reflection',
  },
] as const

const VISUAL_VARIANT_MASTHEAD_CUES: Readonly<
  Record<VisualVariantId, Pick<VisualVariantMastheadPresentation, 'index' | 'strap'>>
> = {
  'critical-translation': { index: 'I', strap: '版本 · 译注 · 双轨阅读' },
  'jurisprudence-atlas': { index: '§', strap: '规则 · 位阶 · 证据链' },
  'industry-section': { index: '03', strap: '口径 · 情景 · 决策窗口' },
  'fact-wire': { index: 'WIRE', strap: '事实 · 来源 · 观点' },
  'machine-foundry': { index: 'BUILD', strap: '模型 · 版本 · 复现' },
  'knowledge-weave': { index: 'NOTE', strap: '问题 · 概念 · 证据 · 回链' },
  'human-margins': { index: 'MARGIN', strap: '生活 · 记忆 · 余白' },
}

export function getVisualVariantMastheadPresentation(
  variantId: VisualVariantId,
): VisualVariantMastheadPresentation {
  const variant = VISUAL_VARIANTS.find(item => item.id === variantId)!
  return {
    name: variant.name,
    englishName: variant.englishName.toUpperCase(),
    ...VISUAL_VARIANT_MASTHEAD_CUES[variantId],
  }
}

export const ARTICLE_PROFILES: readonly ArticleProfileDefinition[] = [
  { id: 'thesis-translation', name: '论文翻译', variantId: 'critical-translation' },
  { id: 'legal-study', name: '法学研讨', variantId: 'jurisprudence-atlas' },
  { id: 'industry-report', name: '行业研报', variantId: 'industry-section' },
  { id: 'current-commentary', name: '时事点评', variantId: 'fact-wire' },
  { id: 'aigc', name: 'AIGC', variantId: 'machine-foundry' },
  { id: 'software-creation', name: '编程创造', variantId: 'machine-foundry' },
  { id: 'study-notes', name: '学习笔记', variantId: 'knowledge-weave' },
  { id: 'news', name: '新闻', variantId: 'fact-wire' },
  { id: 'playful', name: '整活', variantId: 'human-margins' },
  { id: 'life-reflection', name: '人生感悟', variantId: 'human-margins' },
] as const

const compatibility = (
  variantId: VisualVariantId,
  compatibleVariantIds: readonly VisualVariantId[] = [variantId],
  strength: LegacyPresetVariantCompatibility['strength'] = 'base',
): LegacyPresetVariantCompatibility => ({
  variantId,
  compatibleVariantIds,
  strength,
})

export const LEGACY_PRESET_VARIANTS = {
  wechat: {
    thesis: compatibility('critical-translation'),
    legal: compatibility('jurisprudence-atlas'),
    report: compatibility('industry-section'),
    commentary: compatibility('fact-wire'),
    aigc: compatibility('machine-foundry'),
    code: compatibility('machine-foundry'),
    notes: compatibility('knowledge-weave'),
    news: compatibility('fact-wire'),
    meme: compatibility('human-margins'),
    life: compatibility('human-margins'),
    elegant: compatibility('human-margins'),
    tech: compatibility('machine-foundry'),
    'flagship-kiln': compatibility('machine-foundry', ['machine-foundry'], 'flagship'),
    'flagship-kiln-paste-safe': compatibility('machine-foundry', ['machine-foundry'], 'compatibility'),
    'flagship-tempera': compatibility('knowledge-weave', ['knowledge-weave'], 'flagship'),
    'flagship-amber': compatibility('industry-section', ['industry-section'], 'flagship'),
  },
  xiaohongshu: {
    'xhs-fresh': compatibility('human-margins', ['human-margins'], 'compatibility'),
    'xhs-simple': compatibility(
      'critical-translation',
      ['critical-translation', 'jurisprudence-atlas', 'industry-section', 'fact-wire'],
      'compatibility',
    ),
    'xhs-warm': compatibility('human-margins', ['human-margins'], 'compatibility'),
    'xhs-tech': compatibility('machine-foundry', ['machine-foundry'], 'compatibility'),
    'xhs-nature': compatibility('knowledge-weave', ['knowledge-weave'], 'compatibility'),
  },
  zhihu: {
    'zhihu-academic': compatibility(
      'critical-translation',
      ['critical-translation', 'jurisprudence-atlas'],
      'compatibility',
    ),
    'zhihu-tech': compatibility(
      'machine-foundry',
      ['machine-foundry', 'knowledge-weave'],
      'compatibility',
    ),
    'zhihu-insight': compatibility(
      'industry-section',
      ['industry-section', 'fact-wire', 'human-margins'],
      'compatibility',
    ),
  },
} as const satisfies Record<Platform, Record<string, LegacyPresetVariantCompatibility>>

const DEFAULT_PLATFORM_PRESET: Readonly<Record<Platform, string>> = {
  wechat: DEFAULT_PRESET_ID,
  xiaohongshu: 'xhs-fresh',
  zhihu: 'zhihu-academic',
}

const DEFAULT_VARIANT_PLATFORM_PRESET: Readonly<
  Record<VisualVariantId, Readonly<Record<Platform, string>>>
> = {
  'critical-translation': {
    wechat: 'thesis',
    xiaohongshu: 'xhs-simple',
    zhihu: 'zhihu-academic',
  },
  'jurisprudence-atlas': {
    wechat: 'legal',
    xiaohongshu: 'xhs-simple',
    zhihu: 'zhihu-academic',
  },
  'industry-section': {
    wechat: 'report',
    xiaohongshu: 'xhs-simple',
    zhihu: 'zhihu-insight',
  },
  'fact-wire': {
    wechat: 'commentary',
    xiaohongshu: 'xhs-simple',
    zhihu: 'zhihu-insight',
  },
  'machine-foundry': {
    wechat: 'aigc',
    xiaohongshu: 'xhs-tech',
    zhihu: 'zhihu-tech',
  },
  'knowledge-weave': {
    wechat: 'notes',
    xiaohongshu: 'xhs-nature',
    zhihu: 'zhihu-tech',
  },
  'human-margins': {
    wechat: 'life',
    xiaohongshu: 'xhs-warm',
    zhihu: 'zhihu-insight',
  },
}

const PROFILE_PLATFORM_PRESET: Partial<
  Record<ArticleProfileId, Partial<Record<Platform, string>>>
> = {
  'current-commentary': { wechat: 'commentary' },
  news: { wechat: 'news' },
  aigc: { wechat: 'aigc' },
  'software-creation': { wechat: 'code' },
  playful: { wechat: 'meme', xiaohongshu: 'xhs-fresh' },
  'life-reflection': { wechat: 'life', xiaohongshu: 'xhs-warm' },
}

const VARIANT_ID_SET = new Set<string>(VISUAL_VARIANT_IDS)
const PROFILE_ID_SET = new Set<string>(ARTICLE_PROFILE_IDS)

export function isVisualVariantId(value: unknown): value is VisualVariantId {
  return typeof value === 'string' && VARIANT_ID_SET.has(value)
}

export function isArticleProfileId(value: unknown): value is ArticleProfileId {
  return typeof value === 'string' && PROFILE_ID_SET.has(value)
}

export function resolveArticleProfile(profileId: string): ResolvedArticleProfile {
  const profile = ARTICLE_PROFILES.find(item => item.id === profileId)
    ?? ARTICLE_PROFILES[0]
  return {
    requestedProfileId: profileId,
    profileId: profile.id,
    variantId: profile.variantId,
    fallback: profile.id !== profileId,
  }
}

export function resolveVisualVariant(platform: Platform, presetId: string): ResolvedVisualVariant {
  const platformMap = LEGACY_PRESET_VARIANTS[platform] as Readonly<
    Record<string, LegacyPresetVariantCompatibility>
  >
  const fallbackPresetId = DEFAULT_PLATFORM_PRESET[platform]
  const preset = platformMap[presetId]
  const resolvedPresetId = preset ? presetId : fallbackPresetId
  const resolved = preset ?? platformMap[fallbackPresetId]

  return {
    requestedPresetId: presetId,
    presetId: resolvedPresetId,
    variantId: resolved.variantId,
    compatibleVariantIds: resolved.compatibleVariantIds,
    fallback: !preset,
  }
}

export function getPlatformPresetForVariant(
  variantId: VisualVariantId,
  platform: Platform,
  profileId?: ArticleProfileId,
): string {
  const profilePresetId = profileId
    && ARTICLE_PROFILES.find(profile => profile.id === profileId)?.variantId === variantId
    ? PROFILE_PLATFORM_PRESET[profileId]?.[platform]
    : undefined
  return profilePresetId ?? DEFAULT_VARIANT_PLATFORM_PRESET[variantId][platform]
}

const ROOT_SELECTOR: Readonly<Record<Platform, string>> = {
  wechat: '#nice',
  xiaohongshu: '#xhs-note',
  zhihu: '#zhihu-answer',
}

interface VariantPalette {
  paper: string
  ink: string
  accent: string
  secondary: string
  line: string
}

function commonVariantCSS(
  root: string,
  palette: VariantPalette,
  rhythm: { lineHeight: string; paragraphGap: string; componentRadius: string },
): string {
  const textAccent = darkenForWhiteText(palette.accent, 4.8)
  return `
${root} {
  box-sizing: border-box;
  background-color: ${palette.paper};
  color: ${palette.ink};
  letter-spacing: 0;
  line-height: ${rhythm.lineHeight};
}
${root} > p {
  margin: 0 0 ${rhythm.paragraphGap};
  padding: 0;
  border: 0;
  background-color: transparent;
  font-family: inherit;
  font-size: inherit;
  letter-spacing: 0;
  line-height: ${rhythm.lineHeight};
}
${root} .ink-article-masthead {
  margin: 0 0 24px !important;
  padding: 0 !important;
  border: 0 !important;
  background-color: transparent !important;
  color: ${palette.ink} !important;
}
${root} .ink-article-masthead__lead {
  margin: 0 !important;
  padding: 7px 2px !important;
  border: 0 !important;
  background-color: transparent !important;
  color: ${palette.secondary} !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.12em !important;
  line-height: 1.45 !important;
}
${root} .ink-article-masthead__identity {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background-color: transparent !important;
  color: ${palette.ink} !important;
}
${root} .ink-article-masthead__identity span,
${root} .ink-article-masthead__identity strong {
  box-sizing: border-box;
}
${root} .ink-article-masthead__name {
  display: inline-block !important;
  color: inherit !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  vertical-align: middle !important;
}
${root} .ink-article-masthead__index {
  display: inline-block !important;
  margin-right: 9px !important;
  color: ${textAccent} !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  vertical-align: middle !important;
}
${root} .ink-article-masthead__title {
  display: block !important;
  margin: 0 !important;
  color: inherit !important;
  font-size: 24px !important;
  font-weight: 800 !important;
  letter-spacing: 0.015em !important;
  line-height: 1.28 !important;
}
${root} .ink-article-masthead__strap {
  display: block !important;
  margin: 0 !important;
  color: ${palette.secondary} !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  letter-spacing: 0.08em !important;
}
${root} .ink-article-masthead__rule {
  display: block !important;
  width: 44px !important;
  height: 2px !important;
  margin: 9px 0 !important;
  border: 0 !important;
  background-color: ${palette.accent} !important;
}
${root} .ink-article-masthead__mark {
  display: inline-block !important;
  width: 16px !important;
  height: 16px !important;
  margin-right: 9px !important;
  border: 2px solid ${palette.accent} !important;
  vertical-align: middle !important;
}
${root} .ink-article-masthead__meta {
  margin: 0 !important;
  padding: 8px 2px 10px !important;
  border-top: 0 !important;
  border-bottom: 1px solid ${palette.line} !important;
  color: ${palette.secondary} !important;
  font-size: 12px !important;
  letter-spacing: 0.025em !important;
}
${root} .ink-article-masthead__details {
  color: ${palette.secondary} !important;
  font-size: 10px !important;
  letter-spacing: 0.04em !important;
}
${root} .ink-article-song {
  margin: 0 0 16px;
  padding: 13px 15px;
  border: 1px solid ${palette.line};
  border-left: 5px solid ${palette.accent};
  border-radius: ${rhythm.componentRadius};
  background-color: ${palette.paper};
}
${root} .ink-writing-component {
  margin: 24px 0;
  padding: 18px;
  border: 1px solid ${palette.line};
  border-left: 5px solid ${palette.accent};
  border-radius: ${rhythm.componentRadius};
  background-color: ${palette.paper};
  color: ${palette.ink};
}
${root} .ink-writing-component__label {
  color: inherit !important;
}
${root} .ink-writing-component__accent,
${root} .ink-writing-component a {
  color: ${textAccent} !important;
}
${root} .ink-writing-component__accent-border {
  border-color: ${palette.accent} !important;
}
${root} figure {
  margin: 26px 0;
}
${root} figcaption {
  margin-top: 9px;
  color: ${palette.secondary};
  font-size: 12px;
  line-height: 1.65;
}
${root} img {
  display: block;
  max-width: 100%;
  height: auto;
}
${root} h4,
${root} h5,
${root} h6 {
  margin: 1.45em 0 0.65em;
  padding-bottom: 5px;
  border-bottom: 1px solid ${palette.line};
  color: ${textAccent};
  font-weight: 700;
  line-height: 1.45;
}
${root} h4 {
  font-size: 16px;
}
${root} h5,
${root} h6 {
  font-size: 14px;
  letter-spacing: 0.02em;
}
${root} strong {
  color: ${textAccent};
  font-weight: 700;
}
${root} em {
  color: ${palette.secondary};
}
${root} del,
${root} s {
  color: ${palette.secondary};
}
${root} a {
  color: ${textAccent};
  text-decoration: none;
  border-bottom: 1px solid ${palette.accent};
}
${root} ul,
${root} ol {
  margin: 1em 0 1.2em;
  padding-left: 1.65em;
}
${root} li {
  margin: 0.42em 0;
  line-height: ${rhythm.lineHeight};
}
${root} blockquote p {
  margin: 0.45em 0;
  padding: 0;
  border: 0;
  background-color: transparent;
  text-indent: 0;
}
${root} hr {
  height: 0;
  margin: 2.1em 0;
  border: 0;
  border-top: 1px solid ${palette.line};
}
${root} table {
  width: 100%;
  margin: 1.5em 0;
  border-collapse: collapse;
}
${root} table th,
${root} table td {
  padding: 9px 10px;
  border: 1px solid ${palette.line};
  line-height: 1.55;
  text-align: left;
}
${root} code {
  padding: 0.12em 0.32em;
  border: 1px solid ${palette.line};
  background-color: ${palette.paper};
  color: ${textAccent};
}
${root} pre {
  margin: 1.5em 0;
  padding: 16px;
  border: 1px solid ${palette.line};
  background-color: #20252B;
  color: #F4F6F8;
  line-height: 1.65;
}
${root} pre code {
  padding: 0;
  border: 0;
  background-color: transparent;
  color: inherit;
}
${root} .katex {
  font-size: 1em;
  line-height: 1.6;
}
${root} .katex-display {
  margin: 1.4em 0;
  padding: 10px 12px;
  border: 1px solid ${palette.line};
  background-color: ${palette.paper};
  color: ${palette.ink};
  text-align: center;
}
`
}

function criticalTranslationCSS(root: string): string {
  const palette = {
    paper: '#FBF8F1',
    ink: '#252933',
    accent: '#7A263A',
    secondary: '#315D8C',
    line: '#D8CDBD',
  }
  return `${commonVariantCSS(root, palette, {
    lineHeight: '1.86',
    paragraphGap: '1.18em',
    componentRadius: '2px',
  })}
${root} > p {
  text-indent: 2em;
  letter-spacing: 0.01em;
}
${root} .ink-article-masthead__lead {
  border-bottom: 1px solid #7A263A !important;
  color: #315D8C !important;
}
${root} .ink-article-masthead__identity[data-ink-masthead-composition="bound-volume"] {
  display: table !important;
  width: 100% !important;
  border-top: 4px double #7A263A !important;
  border-right: 1px solid #315D8C !important;
  border-bottom: 1px solid #315D8C !important;
  background-color: #F5F0E6 !important;
}
${root} .ink-article-masthead__spine {
  display: table-cell !important;
  width: 86px !important;
  padding: 18px 10px !important;
  border-right: 5px solid #315D8C !important;
  background-color: #7A263A !important;
  color: #FFFFFF !important;
  text-align: center !important;
  vertical-align: middle !important;
}
${root} .ink-article-masthead__folio {
  display: table-cell !important;
  padding: 20px 18px 18px !important;
  color: #252933 !important;
  vertical-align: middle !important;
}
${root} .ink-article-masthead__meta {
  padding: 10px 4px 11px !important;
  border-top: 1px solid #D8CDBD !important;
  border-bottom: 3px double #7A263A !important;
}
${root} .ink-article-masthead__index {
  display: block !important;
  margin: 0 0 8px !important;
  color: #FFFFFF !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 29px !important;
  line-height: 1 !important;
}
${root} .ink-article-masthead__name {
  display: block !important;
  color: #FFFFFF !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-size: 12px !important;
  letter-spacing: 0.16em !important;
}
${root} .ink-article-masthead__rule {
  width: 72px !important;
  height: 1px !important;
  margin: 12px 0 10px !important;
  background-color: #315D8C !important;
}
${root} .ink-article-masthead__title {
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-size: 25px !important;
  text-align: left !important;
  letter-spacing: 0.02em !important;
  line-height: 1.34 !important;
}
${root} .ink-article-masthead__strap {
  color: #7A263A !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 11px !important;
  letter-spacing: 0.09em !important;
}
${root} .ink-article-song {
  border: 1px solid #D8CDBD;
  border-top: 3px double #7A263A;
  border-left: 6px solid #315D8C;
  border-radius: 0;
  background-color: #F5F0E6;
}
${root} h1 {
  margin: 1.8em 0 0.85em;
  padding: 7px 0 8px 17px;
  border-top: 0;
  border-left: 7px solid #7A263A;
  border-bottom: 1px solid #315D8C;
  color: #252933;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
  text-align: left;
  letter-spacing: 0.02em;
}
${root} h2 {
  margin: 2.2em 0 0.9em;
  padding: 7px 0 9px;
  border-top: 3px double #7A263A;
  border-bottom: 1px solid #315D8C;
  color: #252933;
  background-color: transparent;
  font-size: 19px;
  letter-spacing: 0.02em;
}
${root} h3 {
  margin: 1.65em 0 0.75em;
  padding: 2px 0 2px 12px;
  border-left: 3px solid #315D8C;
  border-bottom: 1px dotted #D8CDBD;
  color: #7A263A;
  font-size: 16px;
}
${root} h4,
${root} h5,
${root} h6 {
  border-bottom: 1px dotted #315D8C;
  color: #7A263A;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
}
${root} blockquote {
  margin: 1.6em 0;
  padding: 16px 18px 15px 22px;
  border: 0;
  border-top: 1px solid #315D8C;
  border-left: 7px solid #7A263A;
  border-bottom: 1px solid #D8CDBD;
  background-color: #F5F0E6;
  color: #3C4350;
}
${root} ul {
  padding-left: 1.75em;
  border-left: 3px double #7A263A;
}
${root} ol {
  padding-left: 1.9em;
  border-left: 1px solid #315D8C;
  border-bottom: 1px dotted #D8CDBD;
}
${root} table {
  border-top: 3px double #7A263A;
  border-bottom: 1px solid #315D8C;
}
${root} table th {
  background-color: #315D8C;
  color: #FFFFFF;
}
${root} table td {
  border-color: #D8CDBD;
  background-color: #FFFEFA;
}
${root} code {
  border: 1px solid #D8CDBD;
  border-top: 3px double #7A263A;
  border-bottom: 2px solid #315D8C;
  border-radius: 0;
  background-color: #F5F0E6;
  color: #7A263A;
  font-family: "JetBrains Mono", Consolas, monospace;
}
${root} pre {
  border: 1px solid #D8CDBD;
  border-top: 3px double #7A263A;
  border-left: 6px solid #315D8C;
  background-color: #252933;
}
${root} .katex-display {
  border: 0;
  border-top: 3px double #7A263A;
  border-bottom: 1px solid #315D8C;
  background-color: #F5F0E6;
  color: #252933;
}
${root} hr {
  border: 0;
  border-top: 3px double #7A263A;
  border-bottom: 1px solid #315D8C;
}
${root} .ink-writing-component--CitationBlock,
${root} .ink-writing-component--ArticleBlock {
  border-top: 3px double #7A263A;
  border-bottom: 1px solid #315D8C;
  border-left-width: 1px;
}
${root} .ink-writing-component {
  border-radius: 0;
  background-color: #FFFEFA;
}
${root} .ink-writing-component--CompareBlock,
${root} .ink-writing-component--TimelineBlock,
${root} .ink-writing-component--StatBlock {
  border-left: 6px solid #7A263A;
  border-right: 2px solid #315D8C;
  background-color: #F5F0E6;
}
${root} .ink-article-colophon {
  border-top: 3px double #7A263A !important;
  border-bottom: 1px solid #315D8C !important;
  color: #514B45 !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  text-align: center !important;
}
${root} .ink-article-colophon a {
  color: #315D8C !important;
}
${root} .ink-delivery-link {
  border-radius: 0 !important;
  border-left: 4px solid #7A263A !important;
  border-bottom: 1px solid #315D8C !important;
  background-color: #F5F0E6 !important;
}
${root} figure {
  padding: 12px;
  border: 1px solid #D8CDBD;
  border-top: 3px double #7A263A;
  background-color: #F5F0E6;
}
${root} img {
  padding: 4px;
  border: 1px solid #D8CDBD;
  border-bottom: 2px solid #315D8C;
  background-color: #FFFEFA;
}
${root} figcaption {
  padding-top: 7px;
  border-top: 1px dotted #D8CDBD;
  color: #7A263A;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
  text-align: right;
}
`
}

function jurisprudenceAtlasCSS(root: string): string {
  const palette = {
    paper: '#FCFBF6',
    ink: '#202B3A',
    accent: '#174A7E',
    secondary: '#4C627A',
    line: '#BFCBDA',
  }
  return `${commonVariantCSS(root, palette, {
    lineHeight: '1.88',
    paragraphGap: '1.05em',
    componentRadius: '0',
  })}
${root} > p {
  text-indent: 0;
  letter-spacing: 0.012em;
}
${root} .ink-article-masthead__lead {
  padding: 8px 10px !important;
  border-bottom: 1px solid #C5A45A !important;
  background-color: #0F3762 !important;
  color: #F5F0E6 !important;
}
${root} .ink-article-masthead__identity[data-ink-masthead-composition="coordinate-field"] {
  padding: 18px 18px 20px !important;
  border-left: 9px solid #C5A45A !important;
  border-bottom: 5px solid #202B3A !important;
  background-color: #174A7E !important;
  color: #FFFFFF !important;
}
${root} .ink-article-masthead__meta {
  padding: 10px 18px 11px !important;
  border-top: 1px solid #BFCBDA !important;
  border-bottom: 2px solid #174A7E !important;
  background-color: #F2F5F8 !important;
}
${root} .ink-article-masthead__axis {
  display: block !important;
  padding-bottom: 10px !important;
  border-bottom: 1px solid #8FA8C1 !important;
}
${root} .ink-article-masthead__monogram {
  display: inline-block !important;
  margin-right: 12px !important;
  color: #F5F0E6 !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 42px !important;
  font-weight: 700 !important;
  line-height: 0.75 !important;
  vertical-align: middle !important;
}
${root} .ink-article-masthead__coordinate {
  display: block !important;
  margin-top: 9px !important;
  color: #D5C6A7 !important;
  font-family: "JetBrains Mono", Consolas, monospace !important;
  font-size: 10px !important;
  letter-spacing: 0.12em !important;
}
${root} .ink-article-masthead__mark {
  width: 10px !important;
  height: 22px !important;
  margin-right: 10px !important;
  border: 0 !important;
  border-left: 3px solid #C5A45A !important;
  border-bottom: 3px solid #F5F0E6 !important;
}
${root} .ink-article-masthead__index {
  margin-right: 11px !important;
  color: #C5A45A !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 18px !important;
}
${root} .ink-article-masthead__strap {
  display: block !important;
  margin: 0 !important;
  color: #D5C6A7 !important;
}
${root} .ink-article-masthead__title {
  margin-top: 16px !important;
  padding: 0 !important;
  border: 0 !important;
  color: #FFFFFF !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-size: 25px !important;
  line-height: 1.28 !important;
}
${root} .ink-article-masthead__rule {
  width: 100% !important;
  height: 1px !important;
  margin: 13px 0 0 !important;
  background-color: #8FA8C1 !important;
}
${root} .ink-article-song {
  border: 0;
  border-left: 9px solid #174A7E;
  border-bottom: 3px solid #202B3A;
  border-radius: 0;
  background-color: #F2F5F8;
}
${root} h1 {
  margin: 1.75em 0 0.9em;
  padding: 9px 0 10px 17px;
  border-left: 9px solid #174A7E;
  border-bottom: 1px solid #BFCBDA;
  color: #174A7E;
  background-color: transparent;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
  font-size: 24px;
  line-height: 1.35;
  text-align: left;
  letter-spacing: 0.02em;
}
${root} h2 {
  margin: 2em 0 0.95em;
  padding: 9px 13px 10px;
  border: 1px solid #174A7E;
  border-left: 9px solid #174A7E;
  border-bottom: 3px solid #202B3A;
  background-color: #F2F5F8;
  color: #202B3A;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
  font-size: 19px;
  letter-spacing: 0.02em;
}
${root} h2 strong {
  color: inherit;
}
${root} h3 {
  margin: 1.55em 0 0.7em;
  padding: 7px 0 6px 12px;
  border-top: 1px solid #BFCBDA;
  border-left: 4px solid #C5A45A;
  border-bottom: 1px solid #BFCBDA;
  color: #174A7E;
  font-size: 16px;
}
${root} h4,
${root} h5,
${root} h6 {
  border-bottom: 1px solid #BFCBDA;
  color: #174A7E;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
}
${root} blockquote {
  margin: 1.5em 0;
  padding: 15px 18px;
  border: 1px solid #BFCBDA;
  border-top: 4px solid #174A7E;
  border-left: 1px solid #BFCBDA;
  border-bottom: 3px solid #202B3A;
  background-color: #F2F5F8;
  color: #26374B;
  font-style: normal;
}
${root} ol {
  padding-left: 1.8em;
}
${root} table {
  border-top: 3px solid #174A7E;
}
${root} table th {
  background-color: #202B3A;
  color: #FFFFFF;
}
${root} .ink-writing-component--TimelineBlock,
${root} .ink-writing-component--CompareBlock {
  border-left-width: 8px;
  border-bottom: 2px solid #202B3A;
  background-color: #F2F5F8;
}
${root} .ink-writing-component {
  border-radius: 0;
  border-color: #BFCBDA;
}
${root} .ink-writing-component--StatBlock,
${root} .ink-writing-component--InfoGrid,
${root} .ink-writing-component--CitationBlock {
  border-top: 4px solid #174A7E;
  border-left: 1px solid #BFCBDA;
  border-bottom: 3px solid #202B3A;
  background-color: #F2F5F8;
}
${root} .ink-article-colophon {
  padding-left: 14px !important;
  border-top: 4px solid #174A7E !important;
  border-left: 8px solid #202B3A !important;
  color: #26374B !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  text-align: left !important;
}
${root} .ink-article-colophon a {
  color: #174A7E !important;
}
${root} .ink-delivery-link {
  border-radius: 0 !important;
  border-left: 8px solid #174A7E !important;
  border-bottom: 2px solid #202B3A !important;
  background-color: #F2F5F8 !important;
}
`
}

function industrySectionCSS(root: string): string {
  const palette = {
    paper: '#FCFBF7',
    ink: '#252933',
    accent: '#9A7436',
    secondary: '#3B7A6B',
    line: '#D9D2C6',
  }
  return `${commonVariantCSS(root, palette, {
    lineHeight: '1.78',
    paragraphGap: '1em',
    componentRadius: '4px',
  })}
${root} > p {
  text-indent: 0;
  font-variant-numeric: tabular-nums;
}
${root} .ink-article-masthead__lead {
  padding: 8px 10px !important;
  border-bottom: 1px solid #C19A56 !important;
  background-color: #F5F0E6 !important;
  color: #3B7A6B !important;
}
${root} .ink-article-masthead__identity[data-ink-masthead-composition="section-cut"] {
  padding: 18px 18px 20px !important;
  border-top: 6px solid #C19A56 !important;
  border-left: 1px solid #3B7A6B !important;
  border-bottom: 2px solid #3B7A6B !important;
  background-color: #252933 !important;
  color: #F5F0E6 !important;
}
${root} .ink-article-masthead__meta {
  padding: 10px 7px 11px !important;
  border-top: 1px solid #C19A56 !important;
  border-bottom: 1px solid #D9D2C6 !important;
  color: #3B7A6B !important;
}
${root} .ink-article-masthead__section-rail {
  display: block !important;
  overflow: hidden !important;
  padding-bottom: 9px !important;
  border-bottom: 1px solid #59606A !important;
}
${root} .ink-article-masthead__name {
  color: #C19A56 !important;
  font-size: 15px !important;
  letter-spacing: 0.12em !important;
}
${root} .ink-article-masthead__index {
  float: right !important;
  margin: 0 !important;
  color: #F5F0E6 !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 22px !important;
}
${root} .ink-article-masthead__title {
  margin-top: 17px !important;
  color: #FFFFFF !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-size: 25px !important;
  line-height: 1.25 !important;
}
${root} .ink-article-masthead__rule {
  width: 86px !important;
  height: 4px !important;
  margin: 12px 0 0 !important;
  background-color: #C19A56 !important;
}
${root} .ink-article-masthead__strap {
  display: block !important;
  margin-top: 12px !important;
  color: #D5C6A7 !important;
}
${root} .ink-article-song {
  border: 1px solid #D9D2C6;
  border-top: 5px solid #C19A56;
  border-left: 2px solid #3B7A6B;
  border-radius: 2px;
  background-color: #F5F0E6;
}
${root} h1 {
  margin: 1.8em 0 0.9em;
  padding: 10px 0 11px 15px;
  border-top: 1px solid #D9D2C6;
  border-left: 8px solid #C19A56;
  border-bottom: 2px solid #3B7A6B;
  background-color: #F5F0E6;
  color: #252933;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
  font-size: 24px;
  line-height: 1.28;
  letter-spacing: 0.025em;
}
${root} h2 {
  margin: 2em 0 0.9em;
  padding: 9px 13px;
  border: 0;
  border-left: 8px solid #C19A56;
  border-bottom: 3px solid #252933;
  background-color: #3B7A6B;
  color: #FFFFFF;
  font-size: 19px;
}
${root} h3 {
  margin: 1.5em 0 0.65em;
  padding: 6px 9px;
  border-left: 3px solid #3B7A6B;
  border-bottom: 1px solid #D9D2C6;
  color: #765520;
  background-color: #F5F0E6;
  font-size: 16px;
}
${root} h4,
${root} h5,
${root} h6 {
  border-bottom: 1px solid #C19A56;
  color: #3B7A6B;
}
${root} blockquote {
  margin: 1.45em 0;
  padding: 15px 17px;
  border: 0;
  border-top: 5px solid #C19A56;
  border-bottom: 2px solid #3B7A6B;
  background: #252933 !important;
  color: #F5F0E6 !important;
}
${root} table {
  border-top: 4px solid #C19A56;
}
${root} table th {
  background-color: #252933;
  color: #F5F0E6;
}
${root} table td {
  border-color: #D9D2C6;
  font-variant-numeric: tabular-nums;
}
${root} .ink-writing-component--StatBlock {
  border: 0;
  border-top: 6px solid #C19A56;
  border-bottom: 2px solid #3B7A6B;
  background-color: #252933;
  color: #F5F0E6;
}
${root} .ink-writing-component--StatBlock .ink-writing-component__accent {
  color: #C19A56 !important;
}
${root} .ink-writing-component--CompareBlock {
  border-left-color: #3B7A6B;
  background-color: #F5F0E6;
}
${root} .ink-writing-component {
  border-radius: 2px;
  border-color: #D9D2C6;
}
${root} .ink-writing-component--TimelineBlock,
${root} .ink-writing-component--GalleryBlock,
${root} .ink-writing-component--ArticleBlock {
  border-top: 5px solid #C19A56;
  border-left: 2px solid #3B7A6B;
  border-bottom: 2px solid #252933;
  background-color: #F5F0E6;
}
${root} .ink-article-colophon {
  border-top: 6px solid #C19A56 !important;
  border-bottom: 2px solid #3B7A6B !important;
  background-color: #252933 !important;
  color: #F5F0E6 !important;
  font-variant-numeric: tabular-nums !important;
}
${root} .ink-article-colophon a {
  color: #C19A56 !important;
}
${root} .ink-delivery-link {
  border-radius: 2px !important;
  border-top: 4px solid #C19A56 !important;
  border-left: 2px solid #3B7A6B !important;
  background-color: #F5F0E6 !important;
}
`
}

function factWireCSS(root: string, presetId: string): string {
  const palette = {
    paper: '#FFFFFF',
    ink: '#202328',
    accent: '#D95B3F',
    secondary: '#5C6670',
    line: '#CDD2D7',
  }
  const isNews = presetId === 'news'
  const profileCSS = isNews
    ? `
/* inkforge-profile:fact-wire-news */
${root} .ink-article-masthead__identity[data-ink-masthead-composition="newswire-front"] {
  padding: 16px 17px 18px !important;
  border-top: 9px solid #D95B3F !important;
  border-bottom: 5px solid #202328 !important;
  background-color: #FFFFFF !important;
}
${root} .ink-article-masthead__dateline {
  display: block !important;
  padding-bottom: 9px !important;
  border-bottom: 1px solid #202328 !important;
}
${root} .ink-article-masthead__dateline .ink-article-masthead__index {
  padding: 3px 7px !important;
  background-color: #D95B3F !important;
  color: #FFFFFF !important;
}
${root} .ink-article-masthead__dateline .ink-article-masthead__name {
  margin-left: 9px !important;
  color: #202328 !important;
}
${root} .ink-article-masthead__wire-deck {
  display: block !important;
  margin-top: 12px !important;
  padding: 8px 10px !important;
  border-left: 7px solid #D95B3F !important;
  background-color: #F3F4F5 !important;
}
${root} .ink-article-masthead__wire-deck .ink-article-masthead__rule {
  width: 100% !important;
  height: 1px !important;
  margin: 8px 0 0 !important;
  background-color: #202328 !important;
}
${root} h1 {
  border-top: 9px solid #D95B3F;
  border-bottom: 4px solid #202328;
  background-color: #FFFFFF;
  color: #202328;
}
${root} h2 {
  border-left: 8px solid #D95B3F;
  border-bottom: 3px solid #202328;
  background-color: #202328;
  color: #FFFFFF;
}
${root} blockquote {
  border-top: 2px solid #202328;
  border-left: 8px solid #D95B3F;
  border-bottom: 2px solid #202328;
  background-color: #F3F4F5;
}
${root} h3 {
  padding: 7px 0 6px;
  border-top: 3px solid #202328;
  border-left: 0;
  border-bottom: 1px solid #D95B3F;
  letter-spacing: 0.025em;
}
${root} .ink-writing-component {
  border: 0;
  border-top: 2px solid #202328;
  border-bottom: 5px solid #D95B3F;
  background-color: #FFFFFF;
}
${root} .ink-article-colophon {
  border-top: 9px solid #D95B3F !important;
  border-left: 0 !important;
  border-bottom: 4px solid #202328 !important;
  background-color: #F3F4F5 !important;
  text-align: left !important;
}
`
    : `
/* inkforge-profile:fact-wire-commentary */
${root} .ink-article-masthead__identity[data-ink-masthead-composition="commentary-brief"] {
  padding: 17px 18px 18px !important;
  border-left: 8px solid #315D8C !important;
  border-top: 1px solid #202328 !important;
  border-bottom: 4px solid #D95B3F !important;
  background-color: #F7F3EE !important;
}
${root} .ink-article-masthead__commentary-rail {
  display: block !important;
  margin-top: 12px !important;
  padding: 9px 11px !important;
  border-top: 1px solid #202328 !important;
  border-left: 6px solid #315D8C !important;
  background-color: #FFFFFF !important;
}
${root} .ink-article-masthead__commentary-rail .ink-article-masthead__index {
  padding: 2px 6px !important;
  background-color: #315D8C !important;
  color: #FFFFFF !important;
}
${root} .ink-article-masthead__commentary-rail .ink-article-masthead__name {
  margin-left: 9px !important;
  color: #D95B3F !important;
}
${root} .ink-article-masthead__commentary-rail .ink-article-masthead__strap {
  display: inline-block !important;
  margin-left: 10px !important;
}
${root} h1 {
  border-top: 2px solid #202328;
  border-left: 8px solid #315D8C;
  border-bottom: 4px solid #D95B3F;
  background-color: #F7F3EE;
  color: #202328;
}
${root} h2 {
  border-left: 8px solid #315D8C;
  border-bottom: 3px solid #D95B3F;
  background-color: #F7F3EE;
  color: #202328;
}
${root} blockquote {
  border-top: 1px solid #202328;
  border-left: 8px solid #315D8C;
  border-bottom: 4px solid #D95B3F;
  background-color: #F7F3EE;
}
${root} h3 {
  padding: 6px 0 6px 12px;
  border-top: 0;
  border-left: 6px solid #315D8C;
  border-bottom: 3px solid #D95B3F;
  letter-spacing: 0.01em;
}
${root} .ink-writing-component {
  border: 1px solid #CDD2D7;
  border-left: 8px solid #315D8C;
  border-bottom: 3px solid #D95B3F;
  background-color: #F7F3EE;
}
${root} .ink-article-colophon {
  border-top: 2px solid #202328 !important;
  border-left: 8px solid #315D8C !important;
  border-bottom: 4px solid #D95B3F !important;
  background-color: #F7F3EE !important;
  text-align: right !important;
}
`
  return `${commonVariantCSS(root, palette, {
    lineHeight: '1.72',
    paragraphGap: '0.9em',
    componentRadius: '0',
  })}
${root} > p {
  text-indent: 0;
  letter-spacing: 0.005em;
}
${root} .ink-article-masthead__lead {
  padding: 8px 7px !important;
  border-bottom: 1px solid #202328 !important;
  color: #315D8C !important;
}
${root} .ink-article-masthead__meta {
  padding: 9px 7px 10px !important;
  border-top: 1px solid #CDD2D7 !important;
  border-bottom: 3px solid #202328 !important;
  color: #5C6670 !important;
}
${root} .ink-article-masthead__title {
  color: #202328 !important;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 25px !important;
  font-weight: 900 !important;
  letter-spacing: -0.025em !important;
  line-height: 1.16 !important;
}
${root} .ink-article-masthead__rule {
  width: 88px !important;
  height: 5px !important;
  margin: 12px 0 10px !important;
  background-color: #D95B3F !important;
}
${root} .ink-article-masthead__index {
  padding: 2px 6px !important;
  background-color: #202328 !important;
  color: #FFFFFF !important;
  font-size: 10px !important;
}
${root} .ink-article-masthead__name {
  margin-right: 10px !important;
  color: #D95B3F !important;
}
${root} .ink-article-song {
  border: 0;
  border-top: 2px solid #202328;
  border-left: 8px solid #D95B3F;
  border-bottom: 2px solid #202328;
  border-radius: 0;
  background-color: #F7F3EE;
}
${root} h1 {
  margin: 1.65em 0 0.85em;
  padding: 13px 13px 12px;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.18;
  text-align: left;
  letter-spacing: -0.02em;
}
${root} h2 {
  margin: 1.8em 0 0.8em;
  padding: 9px 12px;
  font-size: 20px;
  font-weight: 900;
}
${root} h3 {
  margin: 1.35em 0 0.65em;
  padding-left: 10px;
  border-left: 4px solid #D95B3F;
  color: #202328;
  font-size: 16px;
  font-weight: 800;
}
${root} h4,
${root} h5,
${root} h6 {
  border-bottom: 1px solid #202328;
  color: #D95B3F;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
}
${root} blockquote {
  margin: 1.4em 0;
  padding: 14px 16px;
  color: #34383D;
  font-style: normal;
}
${root} strong {
  color: #B9412A;
  font-weight: 800;
}
${root} table th {
  background-color: #202328;
  color: #FFFFFF;
}
${root} .ink-writing-component--TimelineBlock,
${root} .ink-writing-component--CitationBlock,
${root} .ink-writing-component--LinkBlock {
  border-left-width: 8px;
  border-top: 1px solid #202328;
  border-bottom: 1px solid #202328;
  background-color: #F7F3EE;
}
${root} .ink-writing-component {
  border-radius: 0;
}
${root} .ink-writing-component--StatBlock,
${root} .ink-writing-component--CompareBlock,
${root} .ink-writing-component--GalleryBlock {
  border-top: 2px solid #202328;
  border-left: 8px solid #D95B3F;
  border-bottom: 3px solid #315D8C;
  background-color: #F3F4F5;
}
${root} figure {
  padding-bottom: 10px;
  border-bottom: 4px solid #202328;
}
${root} .ink-article-colophon {
  border-top: 8px solid #D95B3F !important;
  border-bottom: 3px solid #202328 !important;
  color: #202328 !important;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-weight: 800 !important;
  letter-spacing: 0.04em !important;
}
${root} .ink-article-colophon a {
  color: #B9412A !important;
}
${root} .ink-delivery-link {
  border-radius: 0 !important;
  border-top: 2px solid #202328 !important;
  border-left: 8px solid #D95B3F !important;
  border-bottom: 2px solid #202328 !important;
  background-color: #F7F3EE !important;
}
${profileCSS}
`
}

function machineFoundryCSS(root: string, presetId: string): string {
  const palette = {
    paper: '#FAFAF7',
    ink: '#252933',
    accent: '#D95B3F',
    secondary: '#315D8C',
    line: '#BFC7D0',
  }
  const profile = presetId === 'code'
    ? 'code'
    : ['tech', 'xhs-tech', 'zhihu-tech'].includes(presetId)
      ? 'tech'
      : 'aigc'
  const profileCSS = profile === 'code'
    ? `
/* inkforge-profile:machine-foundry-code */
${root} .ink-article-masthead__identity[data-ink-masthead-composition="terminal-log"] {
  padding: 0 0 18px !important;
  border-top: 6px solid #20252B !important;
  border-left: 8px solid #315D8C !important;
  border-bottom: 5px solid #D95B3F !important;
  background-color: #20252B !important;
}
${root} .ink-article-masthead__terminal {
  display: block !important;
  padding: 9px 13px !important;
  border-bottom: 1px solid #5C6670 !important;
  background-color: #111519 !important;
}
${root} .ink-article-masthead__prompt {
  display: inline-block !important;
  margin-right: 10px !important;
  color: #79D6A3 !important;
  font-family: "JetBrains Mono", Consolas, monospace !important;
  font-size: 14px !important;
}
${root} .ink-article-masthead__terminal .ink-article-masthead__index {
  padding: 2px 6px !important;
  border: 1px solid #79D6A3 !important;
  background-color: transparent !important;
  color: #79D6A3 !important;
}
${root} .ink-article-masthead__terminal .ink-article-masthead__name {
  margin-left: 9px !important;
  color: #FFFFFF !important;
}
${root} .ink-article-masthead__identity .ink-article-masthead__title {
  padding: 18px 17px 8px !important;
}
${root} .ink-article-masthead__build-track {
  display: block !important;
  margin: 0 17px !important;
  padding-top: 9px !important;
  border-top: 1px solid #315D8C !important;
}
${root} .ink-article-masthead__build-track .ink-article-masthead__rule {
  width: 100% !important;
  height: 2px !important;
  margin: 8px 0 0 !important;
  background-color: #79D6A3 !important;
}
${root} h1 {
  border-top: 3px solid #79D6A3;
  border-left: 8px solid #315D8C;
  border-bottom: 5px solid #D95B3F;
  background-color: #20252B;
  color: #FFFFFF;
}
${root} h2 {
  border-left: 8px solid #315D8C;
  border-bottom: 3px solid #79D6A3;
  background-color: #ECEFF2;
}
${root} h3 {
  padding: 8px 11px;
  border: 1px solid #30363D;
  border-left: 8px solid #79D6A3;
  border-bottom: 4px solid #D95B3F;
  background-color: #111519;
  color: #FFFFFF;
}
${root} .ink-writing-component {
  border: 1px solid #30363D;
  border-top: 4px solid #79D6A3;
  border-left: 1px solid #30363D;
  border-bottom: 5px solid #D95B3F;
  background-color: #111519;
  color: #F4F6F8;
}
${root} .ink-writing-component__accent,
${root} .ink-writing-component a {
  color: #AFC9E8 !important;
}
${root} .ink-article-colophon {
  border-top: 4px solid #79D6A3 !important;
  border-left: 1px solid #30363D !important;
  border-bottom: 5px solid #D95B3F !important;
  background-color: #111519 !important;
  color: #F4F6F8 !important;
  text-align: left !important;
}
`
    : profile === 'tech'
      ? `
/* inkforge-profile:machine-foundry-tech */
${root} .ink-article-masthead__identity[data-ink-masthead-composition="circuit-board"] {
  padding: 15px 16px 18px !important;
  border-top: 2px solid #315D8C !important;
  border-left: 10px solid #315D8C !important;
  border-bottom: 6px solid #20252B !important;
  background-color: #ECEFF2 !important;
  color: #252933 !important;
}
${root} .ink-article-masthead__circuit {
  display: block !important;
  padding-bottom: 10px !important;
  border-bottom: 1px solid #BFC7D0 !important;
}
${root} .ink-article-masthead__circuit .ink-article-masthead__mark {
  width: 28px !important;
  height: 12px !important;
  border-top: 4px solid #315D8C !important;
  border-right: 4px solid #D95B3F !important;
  border-bottom: 1px solid #315D8C !important;
}
${root} .ink-article-masthead__circuit .ink-article-masthead__name {
  margin-right: 10px !important;
  color: #315D8C !important;
}
${root} .ink-article-masthead__circuit .ink-article-masthead__index {
  float: right !important;
  color: #D95B3F !important;
}
${root} .ink-article-masthead__forge-plate {
  display: block !important;
  margin-top: 13px !important;
  padding: 13px 14px !important;
  border-left: 6px solid #D95B3F !important;
  background-color: #FFFFFF !important;
}
${root} .ink-article-masthead__forge-plate .ink-article-masthead__title {
  color: #252933 !important;
}
${root} .ink-article-masthead__forge-plate .ink-article-masthead__strap {
  margin-top: 8px !important;
  color: #315D8C !important;
}
${root} h1 {
  border-top: 2px solid #315D8C;
  border-left: 10px solid #315D8C;
  border-bottom: 6px solid #20252B;
  background-color: #ECEFF2;
  color: #252933;
}
${root} h2 {
  border-left: 6px solid #D95B3F;
  border-bottom: 3px solid #315D8C;
  background-color: #FFFFFF;
}
${root} h3 {
  padding: 7px 10px;
  border-top: 2px solid #315D8C;
  border-left: 0;
  border-right: 5px solid #D95B3F;
  border-bottom: 1px solid #BFC7D0;
  background-color: #FFFFFF;
  color: #315D8C;
}
${root} .ink-writing-component {
  border: 1px solid #BFC7D0;
  border-left: 1px solid #BFC7D0;
  border-right: 8px solid #315D8C;
  border-bottom: 2px solid #D95B3F;
  background-color: #FFFFFF;
}
${root} .ink-article-colophon {
  border-top: 2px solid #315D8C !important;
  border-left: 1px solid #BFC7D0 !important;
  border-right: 8px solid #D95B3F !important;
  border-bottom: 6px solid #20252B !important;
  background-color: #ECEFF2 !important;
  color: #252933 !important;
  text-align: right !important;
}
`
      : `
/* inkforge-profile:machine-foundry-aigc */
${root} .ink-article-masthead__identity[data-ink-masthead-composition="model-matrix"] {
  display: table !important;
  width: 100% !important;
  padding: 0 !important;
  border: 1px solid #252933 !important;
  border-top: 7px solid #315D8C !important;
  border-bottom: 6px solid #D95B3F !important;
  background-color: #F4F1EA !important;
  color: #252933 !important;
}
${root} .ink-article-masthead__model-index {
  display: table-cell !important;
  width: 76px !important;
  padding: 18px 10px !important;
  background-color: #D95B3F !important;
  color: #FFFFFF !important;
  text-align: center !important;
  vertical-align: middle !important;
}
${root} .ink-article-masthead__model-index .ink-article-masthead__index {
  display: block !important;
  margin: 0 0 13px !important;
  padding: 4px 5px !important;
  border: 1px solid #FFFFFF !important;
  background-color: transparent !important;
  color: #FFFFFF !important;
}
${root} .ink-article-masthead__model-index .ink-article-masthead__mark {
  display: block !important;
  width: 31px !important;
  height: 31px !important;
  margin: 0 auto !important;
  border: 6px double #FFFFFF !important;
  background-color: #315D8C !important;
}
${root} .ink-article-masthead__model-copy {
  display: table-cell !important;
  padding: 20px 18px 18px !important;
  vertical-align: middle !important;
}
${root} .ink-article-masthead__model-copy .ink-article-masthead__name {
  display: block !important;
  padding-bottom: 9px !important;
  border-bottom: 1px solid #315D8C !important;
  color: #315D8C !important;
  font-size: 11px !important;
  letter-spacing: 0.15em !important;
}
${root} .ink-article-masthead__model-copy .ink-article-masthead__title {
  margin-top: 13px !important;
  color: #252933 !important;
  font-size: 25px !important;
  line-height: 1.22 !important;
}
${root} .ink-article-masthead__model-copy .ink-article-masthead__strap {
  margin-top: 12px !important;
  padding-top: 9px !important;
  border-top: 3px solid #D95B3F !important;
  color: #315D8C !important;
}
${root} h1 {
  border-top: 8px solid #315D8C;
  border-right: 8px solid #D95B3F;
  border-bottom: 1px solid #252933;
  background-color: #F4F1EA;
  color: #252933;
  text-align: right;
}
${root} h2 {
  border-top: 1px solid #252933;
  border-left: 0;
  border-right: 8px solid #D95B3F;
  border-bottom: 4px solid #315D8C;
  background-color: #FFFFFF;
}
${root} h3 {
  padding: 8px 13px;
  border-top: 7px solid #315D8C;
  border-left: 0;
  border-right: 7px solid #D95B3F;
  border-bottom: 1px solid #252933;
  background-color: #F4F1EA;
  color: #252933;
  text-align: right;
}
${root} .ink-writing-component {
  border: 1px solid #252933;
  border-top: 7px solid #315D8C;
  border-left: 1px solid #252933;
  border-right: 7px solid #D95B3F;
  border-bottom: 1px solid #252933;
  background-color: #F4F1EA;
}
${root} .ink-article-colophon {
  border-top: 7px solid #315D8C !important;
  border-left: 1px solid #252933 !important;
  border-right: 7px solid #D95B3F !important;
  border-bottom: 1px solid #252933 !important;
  background-color: #F4F1EA !important;
  color: #252933 !important;
  text-align: right !important;
}
`
  return `${commonVariantCSS(root, palette, {
    lineHeight: '1.78',
    paragraphGap: '1em',
    componentRadius: '2px',
  })}
${root} > p {
  text-indent: 0;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  letter-spacing: 0;
}
${root} .ink-article-masthead__identity {
  font-family: "JetBrains Mono", Consolas, monospace !important;
}
${root} .ink-article-masthead__meta {
  padding: 9px 8px 10px !important;
  border-top: 1px solid #315D8C !important;
  border-bottom: 2px solid #D95B3F !important;
  color: #315D8C !important;
  font-family: "JetBrains Mono", Consolas, monospace !important;
}
${root} .ink-article-masthead__index {
  padding: 3px 7px !important;
  border: 1px solid #D95B3F !important;
  background-color: #D95B3F !important;
  color: #FFFFFF !important;
  font-family: "JetBrains Mono", Consolas, monospace !important;
  font-size: 10px !important;
}
${root} .ink-article-masthead__mark {
  width: 24px !important;
  height: 10px !important;
  border: 0 !important;
  border-top: 3px solid #315D8C !important;
  border-bottom: 3px solid #D95B3F !important;
}
${root} .ink-article-masthead__name {
  font-family: "JetBrains Mono", Consolas, monospace !important;
  font-size: 12px !important;
}
${root} .ink-article-masthead__title {
  padding: 0 !important;
  color: #FFFFFF !important;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 25px !important;
}
${root} .ink-article-masthead__strap {
  color: #B9C9DD !important;
  font-family: "JetBrains Mono", Consolas, monospace !important;
}
${root} .ink-article-song {
  border: 1px solid #BFC7D0;
  border-top: 3px solid #315D8C;
  border-left: 8px solid #D95B3F;
  border-radius: 2px;
  background-color: #ECEFF2;
  font-family: "JetBrains Mono", Consolas, monospace;
}
${root} h1 {
  margin: 1.7em 0 0.85em;
  padding: 15px 15px 14px;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.24;
  letter-spacing: 0.015em;
}
${root} h2 {
  margin: 1.9em 0 0.85em;
  padding: 9px 12px;
  color: #252933;
  font-size: 19px;
  font-weight: 800;
}
${root} h3 {
  margin: 1.45em 0 0.65em;
  padding: 0 0 7px;
  border-bottom: 2px solid #315D8C;
  color: #B9412A;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 16px;
}
${root} h4,
${root} h5,
${root} h6 {
  border-bottom: 1px solid #315D8C;
  color: #B9412A;
  font-family: "JetBrains Mono", Consolas, monospace;
}
${root} code {
  border: 1px solid #BFC7D0;
  border-radius: 2px;
  background-color: #ECEFF2;
  color: #7F2E20;
}
${root} pre {
  border: 1px solid #315D8C;
  border-left: 7px solid #D95B3F;
  border-radius: 2px;
  background-color: #20252B;
  color: #F4F6F8;
}
${root} blockquote {
  margin: 1.45em 0;
  padding: 14px 16px;
  border: 1px solid #BFC7D0;
  border-left: 7px solid #315D8C;
  background-color: #ECEFF2;
  color: #303944;
}
${root} table th {
  background-color: #252933;
  color: #FFFFFF;
  font-family: "JetBrains Mono", Consolas, monospace;
}
${root} ul {
  padding-left: 1.75em;
  border-left: 6px solid #315D8C;
  background-color: #ECEFF2;
}
${root} ol {
  padding-left: 1.9em;
  border-left: 6px solid #D95B3F;
  border-bottom: 2px solid #315D8C;
}
${root} table {
  border-top: 4px solid #315D8C;
  border-bottom: 3px solid #D95B3F;
}
${root} table td {
  border-color: #BFC7D0;
  background-color: #FFFFFF;
  font-variant-numeric: tabular-nums;
}
${root} .katex-display {
  border: 1px solid #252933;
  border-top: 5px solid #315D8C;
  border-right: 5px solid #D95B3F;
  background-color: #ECEFF2;
  color: #252933;
  font-family: "JetBrains Mono", Consolas, monospace;
}
${root} hr {
  border: 0;
  border-top: 3px solid #315D8C;
  border-bottom: 2px solid #D95B3F;
}
${root} figure {
  padding: 10px;
  border: 1px solid #BFC7D0;
  border-left: 7px solid #315D8C;
  border-bottom: 4px solid #D95B3F;
  background-color: #FFFFFF;
}
${root} img {
  padding: 3px;
  border: 1px solid #BFC7D0;
  border-right: 4px solid #315D8C;
  background-color: #FFFFFF;
}
${root} figcaption {
  padding: 7px 9px;
  border-left: 4px solid #D95B3F;
  background-color: #ECEFF2;
  color: #315D8C;
  font-family: "JetBrains Mono", Consolas, monospace;
  text-align: left;
}
${root} .ink-writing-component {
  border-radius: 2px;
}
${root} .ink-writing-component--CompareBlock,
${root} .ink-writing-component--ArticleBlock,
${root} .ink-writing-component--WechatMediaBlock {
  border-top: 4px solid #315D8C;
  border-bottom: 2px solid #D95B3F;
  border-left-width: 1px;
  background-color: #ECEFF2;
}
${root} .ink-article-colophon {
  border-top: 2px solid #D95B3F !important;
  border-left: 8px solid #D95B3F !important;
  border-bottom: 4px solid #315D8C !important;
  background-color: #252933 !important;
  color: #FFFFFF !important;
  font-family: "JetBrains Mono", Consolas, monospace !important;
}
${root} .ink-article-colophon a {
  color: #AFC9E8 !important;
}
${root} .ink-delivery-link {
  border-radius: 2px !important;
  border-top: 3px solid #315D8C !important;
  border-left: 7px solid #D95B3F !important;
  background-color: #ECEFF2 !important;
  font-family: "JetBrains Mono", Consolas, monospace !important;
}
${profileCSS}
`
}

function knowledgeWeaveCSS(root: string): string {
  const palette = {
    paper: '#FBFCF9',
    ink: '#263333',
    accent: '#3B7A6B',
    secondary: '#315D8C',
    line: '#C9D9D4',
  }
  return `${commonVariantCSS(root, palette, {
    lineHeight: '1.94',
    paragraphGap: '1.15em',
    componentRadius: '7px',
  })}
${root} > p {
  text-indent: 2em;
  letter-spacing: 0.015em;
}
${root} .ink-article-masthead__lead {
  padding: 8px 9px !important;
  border-bottom: 1px solid #C19A56 !important;
  color: #3B7A6B !important;
}
${root} .ink-article-masthead__identity[data-ink-masthead-composition="weave-map"] {
  padding: 18px 17px 20px !important;
  border-left: 8px solid #C19A56 !important;
  border-bottom: 5px solid #315D8C !important;
  background-color: #0F5B55 !important;
  color: #F5F0E6 !important;
}
${root} .ink-article-masthead__meta {
  padding: 10px 10px 11px !important;
  border-top: 1px solid #3B7A6B !important;
  border-bottom: 1px solid #C9D9D4 !important;
  background-color: #F5F0E6 !important;
}
${root} .ink-article-masthead__weave-kicker {
  display: block !important;
  padding-bottom: 9px !important;
  border-bottom: 1px solid #77A69D !important;
}
${root} .ink-article-masthead__mark {
  width: 16px !important;
  height: 16px !important;
  border: 2px solid #F5F0E6 !important;
  border-right: 6px solid #C19A56 !important;
  background-color: transparent !important;
}
${root} .ink-article-masthead__name {
  color: #F5F0E6 !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-size: 15px !important;
}
${root} .ink-article-masthead__nodes {
  display: block !important;
  margin: 12px 0 5px !important;
}
${root} .ink-article-masthead__nodes > span {
  display: inline-block !important;
  width: 24px !important;
  height: 24px !important;
  margin-right: 7px !important;
  border: 1px solid #F5F0E6 !important;
  border-radius: 50% !important;
  background-color: #C19A56 !important;
  color: #0F5B55 !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  line-height: 22px !important;
  text-align: center !important;
}
${root} .ink-article-masthead__title {
  padding: 8px 0 10px !important;
  border-bottom: 1px solid #77A69D !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #F5F0E6 !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-size: 25px !important;
  font-weight: 700 !important;
}
${root} .ink-article-masthead__weave-path {
  display: block !important;
  margin-top: 10px !important;
}
${root} .ink-article-masthead__index {
  margin: 0 9px 0 0 !important;
  padding: 2px 6px !important;
  border: 1px solid #C19A56 !important;
  color: #F5F0E6 !important;
  font-size: 9px !important;
}
${root} .ink-article-masthead__strap {
  display: inline-block !important;
  margin: 0 !important;
  color: #D5C6A7 !important;
}
${root} .ink-article-song {
  border: 1px solid #C9D9D4;
  border-top: 3px solid #315D8C;
  border-left: 7px solid #3B7A6B;
  border-radius: 7px;
  background-color: #F5F0E6;
}
${root} h1 {
  margin: 1.8em 0 0.9em;
  padding: 13px 14px 12px;
  border-top: 2px solid #C19A56;
  border-left: 7px solid #3B7A6B;
  border-bottom: 2px solid #315D8C;
  background-color: #F5F0E6;
  color: #263333;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
  font-size: 24px;
  line-height: 1.32;
  text-align: left;
  letter-spacing: 0.02em;
}
${root} h2 {
  margin: 2em 0 0.9em;
  padding: 8px 10px 8px 14px;
  border-left: 6px solid #3B7A6B;
  border-bottom: 2px solid #315D8C;
  background-color: #F5F0E6;
  color: #263333;
  font-size: 19px;
}
${root} h3 {
  margin: 1.55em 0 0.7em;
  padding: 5px 0 6px 11px;
  border-left: 3px solid #C19A56;
  border-bottom: 1px dotted #3B7A6B;
  color: #315D8C;
  font-size: 16px;
}
${root} h4,
${root} h5,
${root} h6 {
  border-bottom: 1px dotted #3B7A6B;
  color: #315D8C;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
}
${root} blockquote {
  margin: 1.5em 0;
  padding: 15px 17px;
  border: 1px solid #C9D9D4;
  border-left: 6px solid #3B7A6B;
  background-color: #F5F0E6;
  color: #334743;
}
${root} table th {
  background-color: #3B7A6B;
  color: #FFFFFF;
}
${root} .ink-writing-component--InfoGrid,
${root} .ink-writing-component--TimelineBlock,
${root} .ink-writing-component--TipBlock {
  border-top: 3px solid #315D8C;
  border-left-color: #3B7A6B;
  background-color: #F5F0E6;
}
${root} .ink-writing-component {
  border-radius: 7px;
  border-color: #C9D9D4;
}
${root} .ink-writing-component--CompareBlock,
${root} .ink-writing-component--StatBlock,
${root} .ink-writing-component--CitationBlock {
  border-top: 3px solid #C19A56;
  border-left: 7px solid #3B7A6B;
  border-bottom: 2px solid #315D8C;
  background-color: #F5F0E6;
}
${root} .ink-writing-component--TimelineBlock .ink-writing-component__accent-border {
  border-left-width: 3px !important;
}
${root} .ink-article-colophon {
  border-top: 3px solid #3B7A6B !important;
  border-bottom: 1px dotted #315D8C !important;
  background-color: #F5F0E6 !important;
  color: #334743 !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
}
${root} .ink-article-colophon a {
  color: #315D8C !important;
}
${root} .ink-delivery-link {
  border-radius: 7px !important;
  border-top: 3px solid #315D8C !important;
  border-left: 6px solid #3B7A6B !important;
  background-color: #F5F0E6 !important;
}
`
}

function humanMarginsCSS(root: string, presetId: string): string {
  const palette = {
    paper: '#FCFAF6',
    ink: '#302E2A',
    accent: '#3B7A6B',
    secondary: '#6B6258',
    line: '#D9D0C4',
  }
  const common = `${commonVariantCSS(root, palette, {
    lineHeight: '1.88',
    paragraphGap: '1.28em',
    componentRadius: '10px',
  })}
${root} > p {
  text-indent: 2em;
  letter-spacing: 0.012em;
}
${root} .ink-article-masthead__lead {
  padding: 8px 7px !important;
  border-bottom: 1px solid #D9D0C4 !important;
  color: #6B6258 !important;
}
${root} .ink-article-masthead__identity[data-ink-masthead-composition="quiet-letter"],
${root} .ink-article-masthead__identity[data-ink-masthead-composition="archival-letter"] {
  padding: 18px 19px 20px !important;
  border-top: 2px solid #3B7A6B !important;
  border-left: 1px solid #D9D0C4 !important;
  border-bottom: 1px dotted #D9D0C4 !important;
  background-color: #FCFAF6 !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-weight: 600 !important;
}
${root} .ink-article-masthead__meta {
  padding: 10px 7px 11px !important;
  border-top: 1px solid #D9D0C4 !important;
  border-bottom: 1px solid #3B7A6B !important;
  color: #6B6258 !important;
}
${root} .ink-article-masthead__letter-open,
${root} .ink-article-masthead__letter-folio,
${root} .ink-article-masthead__letter-close {
  display: block !important;
}
${root} .ink-article-masthead__letter-open {
  padding-bottom: 9px !important;
  border-bottom: 1px solid #D9D0C4 !important;
}
${root} .ink-article-masthead__name {
  color: #3B7A6B !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-size: 15px !important;
}
${root} .ink-article-masthead__strap {
  display: inline-block !important;
  margin: 0 0 0 10px !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
}
${root} .ink-article-masthead__rule {
  width: 72px !important;
  height: 1px !important;
  margin: 12px 0 !important;
  background-color: #D9D0C4 !important;
}
${root} .ink-article-masthead__title {
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  font-size: 25px !important;
  font-weight: 600 !important;
  text-align: center !important;
  letter-spacing: 0.02em !important;
}
${root} .ink-article-masthead__index {
  display: block !important;
  margin: 13px 0 0 !important;
  color: #6B6258 !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 9px !important;
  text-align: center !important;
}
${root} .ink-article-song {
  border: 1px solid #D9D0C4;
  border-top: 2px solid #3B7A6B;
  border-bottom: 4px solid #B66A3C;
  border-radius: 0;
  background-color: #F5F0E6;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
}
${root} h1 {
  margin: 1.85em 0 0.95em;
  padding: 12px 11px;
  border-top: 2px solid #3B7A6B;
  border-bottom: 1px dotted #D9D0C4;
  color: #302E2A;
  background-color: #FCFAF6;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.38;
  text-align: center;
  letter-spacing: 0.02em;
}
${root} h2 {
  margin: 2.1em 0 0.95em;
  padding: 9px 13px 10px;
  border-top: 1px solid #D9D0C4;
  border-bottom: 2px solid #3B7A6B;
  background-color: transparent;
  color: #302E2A;
  font-size: 19px;
  font-weight: 600;
}
${root} h3 {
  margin: 1.6em 0 0.75em;
  padding-bottom: 5px;
  border-bottom: 1px dotted #D9D0C4;
  color: #3B7A6B;
  font-size: 16px;
  font-weight: 600;
}
${root} h4,
${root} h5,
${root} h6 {
  border-bottom: 1px dotted #D9D0C4;
  color: #6B6258;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
}
${root} blockquote {
  margin: 1.6em 0;
  padding: 18px;
  border: 1px solid #D9D0C4;
  border-left: 4px solid #3B7A6B;
  background-color: #F5F0E6;
  color: #504A43;
  font-style: italic;
}
${root} table th {
  background-color: #302E2A;
  color: #FFFFFF;
}
${root} ul {
  padding-left: 1.75em;
  border-top: 1px dotted #D9D0C4;
  border-left: 3px solid #3B7A6B;
}
${root} ol {
  padding-left: 1.9em;
  border-left: 3px solid #B66A3C;
  border-bottom: 1px dotted #D9D0C4;
}
${root} table {
  border-top: 2px solid #3B7A6B;
  border-bottom: 1px dotted #D9D0C4;
}
${root} table td {
  border-color: #D9D0C4;
  background-color: #FCFAF6;
}
${root} code {
  border: 1px solid #D9D0C4;
  border-left: 3px solid #3B7A6B;
  border-bottom: 2px solid #B66A3C;
  border-radius: 6px;
  background-color: #F5F0E6;
  color: #3B7A6B;
  font-family: "JetBrains Mono", Consolas, monospace;
}
${root} pre {
  border: 1px solid #D9D0C4;
  border-top: 2px solid #3B7A6B;
  border-bottom: 4px solid #B66A3C;
  background-color: #302E2A;
}
${root} .katex-display {
  border: 0;
  border-top: 1px dotted #D9D0C4;
  border-bottom: 2px solid #3B7A6B;
  background-color: #FCFAF6;
  color: #302E2A;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
}
${root} hr {
  border: 0;
  border-top: 1px dotted #D9D0C4;
  border-bottom: 2px solid #3B7A6B;
}
${root} img {
  padding: 5px;
  border: 1px solid #D9D0C4;
  border-bottom: 3px solid #3B7A6B;
  background-color: #FFFFFF;
}
${root} figcaption {
  padding-top: 7px;
  border-top: 1px dotted #D9D0C4;
  color: #6B6258;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif;
  text-align: center;
}
${root} .ink-writing-component--SongBlock,
${root} .ink-writing-component--AuthorBlock,
${root} .ink-writing-component--CitationBlock {
  border-top: 2px solid #3B7A6B;
  border-bottom: 1px solid #D9D0C4;
  border-left-width: 1px;
  background-color: #F5F0E6;
}
${root} .ink-writing-component {
  border-radius: 0;
  border-color: #D9D0C4;
}
${root} .ink-article-colophon {
  border-top: 1px solid #D9D0C4 !important;
  border-bottom: 4px solid #3B7A6B !important;
  color: #6B6258 !important;
  font-family: "Source Han Serif SC", "Noto Serif SC", STSong, serif !important;
  text-align: center !important;
}
${root} .ink-article-colophon a {
  color: #3B7A6B !important;
}
${root} .ink-delivery-link {
  border-radius: 10px !important;
  border-top: 2px solid #3B7A6B !important;
  border-bottom: 1px solid #D9D0C4 !important;
  background-color: #F5F0E6 !important;
}
`
  const isPlayful = presetId === 'meme' || presetId === 'xhs-fresh'
  if (presetId === 'elegant') {
    return `${common}
/* inkforge-profile:human-margins-elegant */
${root} .ink-article-masthead__identity[data-ink-masthead-composition="archival-letter"] {
  padding: 21px 22px 22px !important;
  border-top: 4px double #4A3A5A !important;
  border-left: 1px solid #B9AEC2 !important;
  border-right: 1px solid #B9AEC2 !important;
  border-bottom: 4px double #4A3A5A !important;
  background-color: #FBF9FC !important;
  text-align: center !important;
}
${root} .ink-article-masthead__letter-folio {
  padding-bottom: 10px !important;
  border-bottom: 1px solid #B9AEC2 !important;
}
${root} .ink-article-masthead__letter-folio .ink-article-masthead__index,
${root} .ink-article-masthead__letter-folio .ink-article-masthead__name {
  display: inline-block !important;
  margin: 0 6px !important;
  color: #4A3A5A !important;
}
${root} .ink-article-masthead__identity .ink-article-masthead__rule {
  width: 54px !important;
  margin: 13px auto !important;
  background-color: #B9AEC2 !important;
}
${root} .ink-article-masthead__letter-close {
  margin-top: 12px !important;
  color: #6B6258 !important;
  font-style: italic !important;
  letter-spacing: 0.1em !important;
}
${root} h1 {
  border-top: 4px double #4A3A5A;
  border-bottom: 1px solid #B9AEC2;
  background-color: #FBF9FC;
  color: #302E2A;
}
${root} h2 {
  border-top: 1px solid #B9AEC2;
  border-left: 4px solid #4A3A5A;
  border-bottom: 1px solid #B9AEC2;
  background-color: #FBF9FC;
  color: #4A3A5A;
}
${root} blockquote {
  border-top: 1px solid #B9AEC2;
  border-left: 4px double #4A3A5A;
  border-bottom: 1px solid #B9AEC2;
  background-color: #FBF9FC;
}
${root} h3 {
  padding: 7px 0;
  border-top: 3px double #4A3A5A;
  border-left: 0;
  border-bottom: 1px solid #B9AEC2;
  color: #4A3A5A;
  text-align: center;
  letter-spacing: 0.03em;
}
${root} .ink-writing-component {
  border: 1px solid #B9AEC2;
  border-top: 4px double #4A3A5A;
  border-left: 1px solid #B9AEC2;
  border-bottom: 4px double #4A3A5A;
  background-color: #FBF9FC;
}
${root} .ink-article-colophon {
  border-top: 4px double #4A3A5A !important;
  border-left: 1px solid #B9AEC2 !important;
  border-bottom: 1px solid #B9AEC2 !important;
  background-color: #FBF9FC !important;
  color: #4A3A5A !important;
  text-align: center !important;
}
${root} figure {
  padding: 14px;
  border: 1px solid #B9AEC2;
  border-bottom: 4px double #4A3A5A;
  background-color: #FFFFFF;
}
`
  }
  if (!isPlayful) {
    return `${common}
/* inkforge-profile:human-margins-quiet */
${root} .ink-article-masthead__identity[data-ink-masthead-composition="quiet-letter"] {
  border-left: 6px solid #3B7A6B !important;
  border-bottom: 1px dotted #D9D0C4 !important;
}
${root} .ink-article-masthead__letter-folio {
  color: #6B6258 !important;
  text-align: right !important;
}
${root} h3 {
  padding: 5px 0;
  border-top: 0;
  border-left: 0;
  border-bottom: 1px solid #3B7A6B;
  color: #B66A3C;
  letter-spacing: 0.025em;
}
${root} .ink-writing-component {
  border: 0;
  border-top: 1px solid #3B7A6B;
  border-right: 4px solid #B66A3C;
  border-bottom: 1px dotted #D9D0C4;
  background-color: #FFFFFF;
}
${root} .ink-article-colophon {
  border-top: 1px solid #3B7A6B !important;
  border-left: 0 !important;
  border-bottom: 1px dotted #D9D0C4 !important;
  background-color: #FFFFFF !important;
  color: #6B6258 !important;
  text-align: right !important;
}
${root} figure {
  padding: 12px;
  border: 1px solid #D9D0C4;
  border-bottom: 5px solid #3B7A6B;
  background-color: #FFFFFF;
}
`
  }

  return `${common}
/* inkforge-profile:human-margins-playful */
${root} {
  background-color: #FFFFFF;
  color: #252933;
}
${root} > p {
  text-indent: 0;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  letter-spacing: 0;
}
${root} .ink-article-masthead__identity {
  border-top: 7px solid #D95B3F !important;
  border-left: 8px solid #315D8C !important;
  border-bottom: 6px solid #C19A56 !important;
  background-color: #252933 !important;
  color: #FFFFFF !important;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-weight: 900 !important;
}
${root} .ink-article-masthead__collage-label {
  display: inline-block !important;
  padding: 6px 9px !important;
  border: 2px solid #252933 !important;
  background-color: #C19A56 !important;
}
${root} .ink-article-masthead__collage-label .ink-article-masthead__index,
${root} .ink-article-masthead__collage-label .ink-article-masthead__name {
  display: inline-block !important;
  margin: 0 6px 0 0 !important;
  color: #252933 !important;
}
${root} .ink-article-masthead__collage-note {
  display: block !important;
  margin-top: 12px !important;
  padding: 9px 10px !important;
  border-left: 6px solid #C19A56 !important;
  background-color: #FFFFFF !important;
}
${root} .ink-article-masthead__collage-note .ink-article-masthead__strap {
  display: inline-block !important;
  color: #252933 !important;
}
${root} .ink-article-masthead__meta {
  border-top: 2px solid #252933 !important;
  border-bottom: 4px solid #D95B3F !important;
  color: #315D8C !important;
  font-weight: 700 !important;
}
${root} .ink-article-masthead__index {
  padding: 3px 7px !important;
  border: 2px solid #252933 !important;
  background-color: #C19A56 !important;
  color: #252933 !important;
  font-size: 10px !important;
}
${root} .ink-article-masthead__title {
  margin: 12px 0 0 !important;
  color: #FFFFFF !important;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 25px !important;
  font-weight: 900 !important;
  text-align: left !important;
}
${root} .ink-article-masthead__mark {
  float: right !important;
  width: 18px !important;
  height: 18px !important;
  margin: 2px 0 0 !important;
  border: 4px solid #D95B3F !important;
  background-color: #315D8C !important;
}
${root} .ink-article-masthead__name {
  display: block !important;
  margin-top: 11px !important;
  color: #FFFFFF !important;
}
${root} .ink-article-masthead__strap {
  color: #F0D8AC !important;
}
${root} h1 {
  padding: 17px 15px;
  border-top: 7px solid #D95B3F;
  border-bottom: 6px solid #315D8C;
  background-color: #252933;
  color: #FFFFFF;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 25px;
  font-weight: 900;
  text-align: left;
  letter-spacing: -0.015em;
}
${root} h2 {
  padding: 10px 13px;
  border: 0;
  border-left: 8px solid #315D8C;
  border-bottom: 4px solid #C19A56;
  border-radius: 0;
  background-color: #D95B3F;
  color: #FFFFFF;
  font-weight: 800;
}
${root} h3 {
  padding-left: 11px;
  border-left: 5px solid #C19A56;
  color: #315D8C;
  font-weight: 800;
}
${root} blockquote {
  border: 2px solid #252933;
  border-left: 8px solid #D95B3F;
  border-bottom: 5px solid #C19A56;
  border-radius: 0;
  background-color: #F5F0E6;
  color: #252933;
  font-style: normal;
}
${root} figure {
  padding: 11px;
  border: 2px solid #252933;
  border-left: 8px solid #315D8C;
  border-bottom: 8px solid #C19A56;
  background-color: #FFFFFF;
}
${root} .ink-writing-component {
  border-radius: 0;
}
${root} .ink-writing-component--GalleryBlock,
${root} .ink-writing-component--ImageBlock,
${root} .ink-writing-component--SongBlock {
  border: 2px solid #252933;
  border-left: 8px solid #D95B3F;
  border-bottom: 6px solid #315D8C;
  background-color: #F5F0E6;
}
${root} .ink-article-colophon {
  border: 2px solid #252933 !important;
  border-left: 8px solid #D95B3F !important;
  border-bottom: 6px solid #315D8C !important;
  background-color: #F5F0E6 !important;
  color: #252933 !important;
  font-family: "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  text-align: left !important;
}
${root} .ink-article-colophon a {
  color: #315D8C !important;
}
${root} .ink-delivery-link {
  border-radius: 0 !important;
  border: 2px solid #252933 !important;
  border-left: 8px solid #D95B3F !important;
  border-bottom: 6px solid #315D8C !important;
  background-color: #F5F0E6 !important;
}
`
}

type WechatDeliveryEdge = 'top' | 'right' | 'bottom' | 'left'

interface WechatDeliveryTreatment {
  accent: string
  songEdge: WechatDeliveryEdge
  metricsEdge: WechatDeliveryEdge
  componentEdge: WechatDeliveryEdge
  profileEdge: WechatDeliveryEdge
  radius: string
  songPadding: string
  componentPadding: string
  profilePadding: string
  songAlign: 'left' | 'center' | 'right'
  profileAlign: 'left' | 'center' | 'right'
}

const WECHAT_DELIVERY_TREATMENTS: Readonly<Record<string, WechatDeliveryTreatment>> = {
  thesis: { accent: '#5A4A3C', songEdge: 'left', metricsEdge: 'bottom', componentEdge: 'left', profileEdge: 'top', radius: '2px', songPadding: '13px 15px', componentPadding: '18px', profilePadding: '20px', songAlign: 'left', profileAlign: 'center' },
  legal: { accent: '#1A1A2E', songEdge: 'top', metricsEdge: 'left', componentEdge: 'top', profileEdge: 'right', radius: '0', songPadding: '14px 16px', componentPadding: '19px', profilePadding: '18px', songAlign: 'left', profileAlign: 'right' },
  report: { accent: '#004080', songEdge: 'bottom', metricsEdge: 'top', componentEdge: 'bottom', profileEdge: 'left', radius: '3px', songPadding: '12px 16px', componentPadding: '17px', profilePadding: '18px', songAlign: 'left', profileAlign: 'left' },
  commentary: { accent: '#C0392B', songEdge: 'right', metricsEdge: 'bottom', componentEdge: 'right', profileEdge: 'top', radius: '0', songPadding: '11px 14px', componentPadding: '16px', profilePadding: '17px', songAlign: 'right', profileAlign: 'left' },
  aigc: { accent: '#2563EB', songEdge: 'left', metricsEdge: 'top', componentEdge: 'bottom', profileEdge: 'right', radius: '5px', songPadding: '12px 15px', componentPadding: '17px', profilePadding: '18px', songAlign: 'left', profileAlign: 'right' },
  code: { accent: '#16A34A', songEdge: 'top', metricsEdge: 'bottom', componentEdge: 'right', profileEdge: 'left', radius: '1px', songPadding: '12px 14px', componentPadding: '16px', profilePadding: '16px', songAlign: 'left', profileAlign: 'left' },
  notes: { accent: '#D2691E', songEdge: 'bottom', metricsEdge: 'right', componentEdge: 'left', profileEdge: 'top', radius: '7px', songPadding: '14px 16px', componentPadding: '18px', profilePadding: '20px', songAlign: 'center', profileAlign: 'center' },
  news: { accent: '#0F172A', songEdge: 'right', metricsEdge: 'left', componentEdge: 'top', profileEdge: 'bottom', radius: '0', songPadding: '10px 13px', componentPadding: '15px', profilePadding: '16px', songAlign: 'left', profileAlign: 'left' },
  meme: { accent: '#FF006E', songEdge: 'left', metricsEdge: 'right', componentEdge: 'top', profileEdge: 'bottom', radius: '10px', songPadding: '13px 16px', componentPadding: '18px', profilePadding: '19px', songAlign: 'center', profileAlign: 'center' },
  life: { accent: '#A0522D', songEdge: 'top', metricsEdge: 'left', componentEdge: 'bottom', profileEdge: 'right', radius: '8px', songPadding: '15px 17px', componentPadding: '20px', profilePadding: '21px', songAlign: 'left', profileAlign: 'right' },
  elegant: { accent: '#4A3C5A', songEdge: 'bottom', metricsEdge: 'top', componentEdge: 'right', profileEdge: 'left', radius: '2px', songPadding: '14px 18px', componentPadding: '21px', profilePadding: '22px', songAlign: 'center', profileAlign: 'left' },
  tech: { accent: '#6366F1', songEdge: 'right', metricsEdge: 'bottom', componentEdge: 'left', profileEdge: 'top', radius: '4px', songPadding: '11px 15px', componentPadding: '16px', profilePadding: '17px', songAlign: 'right', profileAlign: 'left' },
  'flagship-kiln': { accent: '#D95B3F', songEdge: 'left', metricsEdge: 'bottom', componentEdge: 'top', profileEdge: 'right', radius: '2px', songPadding: '14px 16px', componentPadding: '18px', profilePadding: '20px', songAlign: 'left', profileAlign: 'right' },
  'flagship-kiln-paste-safe': { accent: '#D95B3F', songEdge: 'top', metricsEdge: 'right', componentEdge: 'bottom', profileEdge: 'left', radius: '0', songPadding: '12px 14px', componentPadding: '16px', profilePadding: '17px', songAlign: 'left', profileAlign: 'left' },
  'flagship-tempera': { accent: '#3B7A6B', songEdge: 'bottom', metricsEdge: 'left', componentEdge: 'right', profileEdge: 'top', radius: '6px', songPadding: '15px 17px', componentPadding: '19px', profilePadding: '21px', songAlign: 'center', profileAlign: 'center' },
  'flagship-amber': { accent: '#C19A56', songEdge: 'right', metricsEdge: 'top', componentEdge: 'left', profileEdge: 'bottom', radius: '1px', songPadding: '13px 15px', componentPadding: '17px', profilePadding: '18px', songAlign: 'right', profileAlign: 'left' },
}

function deliveryEdgeDeclaration(edge: WechatDeliveryEdge, accent: string): string {
  return `border-${edge}: 5px solid ${accent} !important;`
}

function wechatDeliveryTreatmentCSS(root: string, presetId: string): string {
  const treatment = WECHAT_DELIVERY_TREATMENTS[presetId]
  if (!treatment) return ''
  const flagshipSongFrame = presetId.startsWith('flagship-')
    ? `outline: 1px solid ${treatment.accent} !important; outline-offset: 3px !important;`
    : ''

  return `
${root} .ink-article-song[data-ink-masthead-song="true"] {
  ${deliveryEdgeDeclaration(treatment.songEdge, treatment.accent)}
  ${flagshipSongFrame}
  border-radius: ${treatment.radius} !important;
  padding: ${treatment.songPadding} !important;
  text-align: ${treatment.songAlign} !important;
}
${root} .ink-article-masthead__meta {
  ${deliveryEdgeDeclaration(treatment.metricsEdge, treatment.accent)}
  padding: 9px 10px !important;
}
${root} .ink-writing-component {
  ${deliveryEdgeDeclaration(treatment.componentEdge, treatment.accent)}
  border-radius: ${treatment.radius} !important;
  padding: ${treatment.componentPadding} !important;
}
${root} .ink-delivery-profile[data-ink-delivery="profile"] {
  ${deliveryEdgeDeclaration(treatment.profileEdge, treatment.accent)}
  border-radius: ${treatment.radius} !important;
  padding: ${treatment.profilePadding} !important;
  text-align: ${treatment.profileAlign} !important;
}
`
}

const VARIANT_CSS_BUILDERS: Readonly<
  Record<VisualVariantId, (root: string, presetId: string) => string>
> = {
  'critical-translation': root => criticalTranslationCSS(root),
  'jurisprudence-atlas': root => jurisprudenceAtlasCSS(root),
  'industry-section': root => industrySectionCSS(root),
  'fact-wire': (root, presetId) => factWireCSS(root, presetId),
  'machine-foundry': (root, presetId) => machineFoundryCSS(root, presetId),
  'knowledge-weave': root => knowledgeWeaveCSS(root),
  'human-margins': (root, presetId) => humanMarginsCSS(root, presetId),
}

export function getVisualVariantCSS(
  platform: Platform,
  presetId: string,
  target: 'preview' | 'export' = 'export',
  variantId?: VisualVariantId,
): string {
  const resolved = resolveVisualVariant(platform, presetId)
  const selectedVariantId = variantId ?? resolved.variantId
  const root = ROOT_SELECTOR[platform]
  const deliveryTreatment = platform === 'wechat'
    ? wechatDeliveryTreatmentCSS(root, resolved.presetId)
    : ''
  return `
/* inkforge-variant:${selectedVariantId}; platform:${platform}; target:${target} */
${VARIANT_CSS_BUILDERS[selectedVariantId](root, presetId)}
${deliveryTreatment}
`.trim()
}
