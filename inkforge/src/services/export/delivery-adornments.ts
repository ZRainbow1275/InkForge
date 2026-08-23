import { z } from 'zod'

import type { Platform } from './types'

export const DELIVERY_COMPONENT_TYPE_VALUES = [
  'song',
  'image',
  'link',
  'related-article',
  'contact-card',
] as const

export const CREATIVE_COMMONS_LICENSE_VALUES = [
  'none',
  'cc0-1.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'cc-by-nc-4.0',
  'cc-by-nc-sa-4.0',
  'cc-by-nd-4.0',
  'cc-by-nc-nd-4.0',
] as const

export type DeliveryComponentType = typeof DELIVERY_COMPONENT_TYPE_VALUES[number]
export type CreativeCommonsLicenseId = typeof CREATIVE_COMMONS_LICENSE_VALUES[number]
export type DeliveryAdornmentFormat = 'html' | 'text' | 'markdown'
export type DeliveryAdornmentComponentStatus =
  | 'applied'
  | 'degraded'
  | 'manual-required'
  | 'invalid'
  | 'disabled'
export type DeliveryAdornmentOutputStatus = 'included' | 'omitted'

export interface CreativeCommonsLicenseOption {
  id: CreativeCommonsLicenseId
  label: string
  shortLabel: string
  url: string | null
  description: string
}

export const CREATIVE_COMMONS_LICENSE_OPTIONS: readonly CreativeCommonsLicenseOption[] = [
  {
    id: 'none',
    label: '不附加许可协议',
    shortLabel: '不附加',
    url: null,
    description: '保持文章原有权利声明，不在产物尾部增加 CC 协议。',
  },
  {
    id: 'cc0-1.0',
    label: 'CC0 1.0 公共领域贡献',
    shortLabel: 'CC0 1.0',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    description: '在法律允许的最大范围内放弃著作权和相关权利。',
  },
  {
    id: 'cc-by-4.0',
    label: 'CC BY 4.0 署名',
    shortLabel: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    description: '允许共享与改编，但必须保留署名。',
  },
  {
    id: 'cc-by-sa-4.0',
    label: 'CC BY-SA 4.0 署名-相同方式共享',
    shortLabel: 'CC BY-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    description: '允许共享与改编，衍生作品须使用相同协议。',
  },
  {
    id: 'cc-by-nc-4.0',
    label: 'CC BY-NC 4.0 署名-非商业性使用',
    shortLabel: 'CC BY-NC 4.0',
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    description: '允许非商业共享与改编，并要求署名。',
  },
  {
    id: 'cc-by-nc-sa-4.0',
    label: 'CC BY-NC-SA 4.0 署名-非商业-相同方式共享',
    shortLabel: 'CC BY-NC-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    description: '允许非商业共享与改编，要求署名并采用相同协议。',
  },
  {
    id: 'cc-by-nd-4.0',
    label: 'CC BY-ND 4.0 署名-禁止演绎',
    shortLabel: 'CC BY-ND 4.0',
    url: 'https://creativecommons.org/licenses/by-nd/4.0/',
    description: '允许原样转载并要求署名，不允许发布改编版本。',
  },
  {
    id: 'cc-by-nc-nd-4.0',
    label: 'CC BY-NC-ND 4.0 署名-非商业-禁止演绎',
    shortLabel: 'CC BY-NC-ND 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    description: '仅允许非商业原样转载，并要求署名。',
  },
]

const BOUNDED_TEXT = z.string().trim().max(240)
const OPTIONAL_TEXT = BOUNDED_TEXT.default('')

function isAllowedHttpUrl(value: string, httpsOnly = false): boolean {
  if (value === '') return true

  try {
    const parsed = new URL(value)
    const allowedProtocol = httpsOnly
      ? parsed.protocol === 'https:'
      : parsed.protocol === 'https:' || parsed.protocol === 'http:'
    return allowedProtocol && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

const OPTIONAL_HTTP_URL = z.string()
  .trim()
  .max(2048)
  .refine(value => isAllowedHttpUrl(value), '仅允许无凭据的 HTTP/HTTPS URL')
  .default('')

const OPTIONAL_HTTPS_URL = z.string()
  .trim()
  .max(2048)
  .refine(value => isAllowedHttpUrl(value, true), '图片仅允许无凭据的 HTTPS URL')
  .default('')

const OPTIONAL_HTTPS_MEDIA_URL = z.string()
  .trim()
  .max(2048)
  .refine(value => isAllowedHttpUrl(value, true), '图片仅允许无凭据的 HTTPS URL')
  .optional()

const DeliveryComponentBaseSchema = z.object({
  id: z.string().trim().min(1).max(80),
  enabled: z.boolean().default(true),
})

const SongComponentSchema = DeliveryComponentBaseSchema.extend({
  type: z.literal('song'),
  title: OPTIONAL_TEXT,
  artist: OPTIONAL_TEXT,
  url: OPTIONAL_HTTP_URL,
  coverUrl: OPTIONAL_HTTPS_MEDIA_URL,
})

const ImageComponentSchema = DeliveryComponentBaseSchema.extend({
  type: z.literal('image'),
  url: OPTIONAL_HTTPS_URL,
  alt: OPTIONAL_TEXT,
  caption: OPTIONAL_TEXT,
})

const LinkComponentSchema = DeliveryComponentBaseSchema.extend({
  type: z.literal('link'),
  url: OPTIONAL_HTTP_URL,
  title: OPTIONAL_TEXT,
  description: OPTIONAL_TEXT,
})

const RelatedArticleComponentSchema = DeliveryComponentBaseSchema.extend({
  type: z.literal('related-article'),
  url: OPTIONAL_HTTP_URL,
  title: OPTIONAL_TEXT,
  summary: OPTIONAL_TEXT,
})

const ContactCardComponentSchema = DeliveryComponentBaseSchema.extend({
  type: z.literal('contact-card'),
  displayName: OPTIONAL_TEXT,
  accountId: OPTIONAL_TEXT,
  profileUrl: OPTIONAL_HTTP_URL,
  description: BOUNDED_TEXT.optional(),
  avatarUrl: OPTIONAL_HTTPS_MEDIA_URL,
  qrImageUrl: OPTIONAL_HTTPS_MEDIA_URL,
})

export const DeliveryPlatformComponentSchema = z.discriminatedUnion('type', [
  SongComponentSchema,
  ImageComponentSchema,
  LinkComponentSchema,
  RelatedArticleComponentSchema,
  ContactCardComponentSchema,
])

export const DeliveryAdornmentConfigSchema = z.object({
  readingTime: z.object({
    enabled: z.boolean().default(true),
    wordsPerMinute: z.number().int().min(120).max(1000).default(300),
  }).default({
    enabled: true,
    wordsPerMinute: 300,
  }),
  license: z.enum(CREATIVE_COMMONS_LICENSE_VALUES).default('none'),
  components: z.array(DeliveryPlatformComponentSchema).max(24).default([]),
})

export type DeliveryPlatformComponent = z.infer<typeof DeliveryPlatformComponentSchema>
export type DeliveryAdornmentConfig = z.infer<typeof DeliveryAdornmentConfigSchema>

export interface ResolvedDeliveryAdornmentSlots {
  valid: boolean
  issues: string[]
  config: DeliveryAdornmentConfig | null
  mastheadSong: DeliveryMastheadSong | null
  afterBodyProfile: Extract<DeliveryPlatformComponent, { type: 'contact-card' }> | null
  remainderComponents: DeliveryPlatformComponent[]
  duplicateComponents: DeliveryPlatformComponent[]
}

export interface DeliveryAdornmentComponentReport {
  id: string
  type: DeliveryComponentType
  status: DeliveryAdornmentComponentStatus
  output: DeliveryAdornmentOutputStatus
  message: string
}

export interface DeliveryAdornmentReadingTimeReport {
  enabled: boolean
  status: 'applied' | 'disabled'
  wordCount: number
  minutes: number
  wordsPerMinute: number
}

export interface ResolvedDeliveryReadingTime {
  enabled: boolean
  wordsPerMinute: number
  configValid: boolean
}

export interface DeliveryAdornmentLicenseReport {
  id: CreativeCommonsLicenseId
  status: 'applied' | 'disabled'
  label: string
  url: string | null
}

export interface DeliveryAdornmentReport {
  platform: Platform
  format: DeliveryAdornmentFormat
  valid: boolean
  issues: string[]
  readingTime?: DeliveryAdornmentReadingTimeReport
  license?: DeliveryAdornmentLicenseReport
  components: DeliveryAdornmentComponentReport[]
  warnings: string[]
}

export interface DeliveryAdornmentFragments {
  prefix: string
  suffix: string
  report?: DeliveryAdornmentReport
}

export interface DeliveryMastheadSong {
  componentId: string
  title: string
  artist: string
  url: string
  coverUrl?: string
}

export interface CreateDeliveryAdornmentFragmentsInput {
  sourceMarkdown: string
  platform: Platform
  format: DeliveryAdornmentFormat
  config?: DeliveryAdornmentConfig
  readingTimeAlreadyRendered?: boolean
  wordCountOverride?: number
  mastheadComponentId?: string
}

export interface ApplyDeliveryAdornmentsInput extends CreateDeliveryAdornmentFragmentsInput {
  content: string
}

export interface ApplyDeliveryAdornmentsResult {
  content: string
  report?: DeliveryAdornmentReport
}

interface EvaluatedComponent {
  fragment: string
  report: DeliveryAdornmentComponentReport
}

export function getDefaultDeliveryAdornmentConfig(): DeliveryAdornmentConfig {
  return DeliveryAdornmentConfigSchema.parse({})
}

export function parseDeliveryAdornmentConfig(input: unknown): DeliveryAdornmentConfig {
  return DeliveryAdornmentConfigSchema.parse(input ?? {})
}

export function getDeliveryMastheadSong(
  config: unknown,
): DeliveryMastheadSong | null {
  return resolveDeliveryAdornmentSlots(config).mastheadSong
}

export function resolveDeliveryAdornmentSlots(
  config: unknown,
): ResolvedDeliveryAdornmentSlots {
  const parsed = DeliveryAdornmentConfigSchema.safeParse(config)
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map(issue => issue.message),
      config: null,
      mastheadSong: null,
      afterBodyProfile: null,
      remainderComponents: [],
      duplicateComponents: [],
    }
  }

  const seenIds = new Set<string>()
  const uniqueComponents: DeliveryPlatformComponent[] = []
  const duplicateComponents: DeliveryPlatformComponent[] = []
  for (const component of parsed.data.components) {
    if (seenIds.has(component.id)) {
      duplicateComponents.push(component)
    } else {
      seenIds.add(component.id)
      uniqueComponents.push(component)
    }
  }

  const song = uniqueComponents.find(
    (component): component is Extract<DeliveryPlatformComponent, { type: 'song' }> => (
      component.type === 'song'
      && component.enabled
      && Boolean(normalizeInlineText(component.title))
      && Boolean(normalizeAllowedUrl(component.url))
    ),
  ) ?? null
  const profile = uniqueComponents.find(
    (component): component is Extract<DeliveryPlatformComponent, { type: 'contact-card' }> => (
      component.type === 'contact-card'
      && component.enabled
      && Boolean(normalizeInlineText(component.displayName))
    ),
  ) ?? null
  const songUrl = song ? normalizeAllowedUrl(song.url) : null
  const coverUrl = song ? normalizeAllowedUrl(song.coverUrl ?? '', true) : null

  return {
    valid: true,
    issues: [],
    config: parsed.data,
    mastheadSong: song && songUrl
      ? {
          componentId: song.id,
          title: normalizeInlineText(song.title),
          artist: normalizeInlineText(song.artist),
          url: songUrl,
          ...(coverUrl ? { coverUrl } : {}),
        }
      : null,
    afterBodyProfile: profile,
    remainderComponents: uniqueComponents.filter(component => component !== song && component !== profile),
    duplicateComponents,
  }
}

export function resolveDeliveryReadingTime(
  config: DeliveryAdornmentConfig | undefined,
  fallbackEnabled: boolean,
  fallbackWordsPerMinute: number,
): ResolvedDeliveryReadingTime {
  if (config === undefined) {
    return {
      enabled: fallbackEnabled,
      wordsPerMinute: fallbackWordsPerMinute,
      configValid: true,
    }
  }

  const parsed = DeliveryAdornmentConfigSchema.safeParse(config)
  if (!parsed.success) {
    return {
      enabled: fallbackEnabled,
      wordsPerMinute: fallbackWordsPerMinute,
      configValid: false,
    }
  }

  return {
    enabled: parsed.data.readingTime.enabled,
    wordsPerMinute: parsed.data.readingTime.wordsPerMinute,
    configValid: true,
  }
}

export function getCreativeCommonsLicenseOption(
  id: CreativeCommonsLicenseId,
): CreativeCommonsLicenseOption {
  return CREATIVE_COMMONS_LICENSE_OPTIONS.find(option => option.id === id)
    ?? CREATIVE_COMMONS_LICENSE_OPTIONS[0]
}

export function getDeliveryComponentTypeLabel(type: DeliveryComponentType): string {
  const labels: Record<DeliveryComponentType, string> = {
    song: '歌曲',
    image: '图片',
    link: '链接',
    'related-article': '关联文章',
    'contact-card': '名片',
  }
  return labels[type]
}

export function createDeliveryAdornmentFragments(
  input: CreateDeliveryAdornmentFragmentsInput,
): DeliveryAdornmentFragments {
  if (input.config === undefined) {
    return {
      prefix: '',
      suffix: '',
      report: undefined,
    }
  }

  const resolved = resolveDeliveryAdornmentSlots(input.config)
  if (!resolved.valid || !resolved.config) {
    return {
      prefix: '',
      suffix: '',
      report: {
        platform: input.platform,
        format: input.format,
        valid: false,
        issues: resolved.issues,
        components: [],
        warnings: ['交付附加内容未通过校验，未写入任何附加产物。'],
      },
    }
  }

  const config = resolved.config
  const wordCount = input.wordCountOverride ?? countReadingUnits(input.sourceMarkdown)
  const minutes = Math.max(1, Math.ceil(wordCount / config.readingTime.wordsPerMinute))
  const readingTime: DeliveryAdornmentReadingTimeReport = {
    enabled: config.readingTime.enabled,
    status: config.readingTime.enabled ? 'applied' : 'disabled',
    wordCount,
    minutes,
    wordsPerMinute: config.readingTime.wordsPerMinute,
  }
  const licenseOption = getCreativeCommonsLicenseOption(config.license)
  const license: DeliveryAdornmentLicenseReport = {
    id: config.license,
    status: config.license === 'none' ? 'disabled' : 'applied',
    label: licenseOption.shortLabel,
    url: licenseOption.url,
  }

  const evaluatedByComponent = new Map<DeliveryPlatformComponent, EvaluatedComponent>()
  const mastheadComponent = resolved.mastheadSong
    ? config.components.find(component => (
        component.id === resolved.mastheadSong?.componentId && component.type === 'song'
      ))
    : undefined
  const mastheadPromoted = Boolean(
    mastheadComponent && input.mastheadComponentId === resolved.mastheadSong?.componentId,
  )
  if (mastheadComponent && mastheadPromoted) {
    evaluatedByComponent.set(
      mastheadComponent,
      evaluated(mastheadComponent, 'degraded', 'included', '歌曲真实资料已置于文章抬头；公众号原生曲库仍需在平台内确认。'),
    )
  }
  const profileEvaluation = resolved.afterBodyProfile
    ? evaluateDeliveryComponent(resolved.afterBodyProfile, input.platform, input.format)
    : null
  if (resolved.afterBodyProfile && profileEvaluation) {
    evaluatedByComponent.set(resolved.afterBodyProfile, profileEvaluation)
  }
  const suffixComponentSet = new Set(resolved.remainderComponents)
  if (mastheadComponent && !mastheadPromoted) suffixComponentSet.add(mastheadComponent)
  const suffixComponents = config.components.filter(component => suffixComponentSet.has(component))
  const remainderEvaluations = suffixComponents.map(component => {
    const evaluation = evaluateDeliveryComponent(component, input.platform, input.format)
    evaluatedByComponent.set(component, evaluation)
    return evaluation
  })
  for (const component of resolved.duplicateComponents) {
    evaluatedByComponent.set(
      component,
      evaluated(component, 'invalid', 'omitted', `交付组件 ID“${component.id}”重复；已保留首项并省略此项。`),
    )
  }
  const evaluatedComponents = config.components
    .map(component => evaluatedByComponent.get(component))
    .filter((item): item is EvaluatedComponent => item !== undefined)
  const componentFragments = [
    profileEvaluation?.fragment ?? '',
    ...remainderEvaluations.map(item => item.fragment),
  ]
    .filter(Boolean)
  const licenseFragment = renderLicenseFragment(licenseOption, input.format)
  const prefix = config.readingTime.enabled && !input.readingTimeAlreadyRendered
    ? renderReadingTimeFragment(readingTime, input.format)
    : ''
  const suffixParts = [...componentFragments]
  if (licenseFragment) suffixParts.push(licenseFragment)

  const warnings = evaluatedComponents
    .filter(item => item.report.status === 'manual-required' || item.report.status === 'invalid')
    .map(item => item.report.message)

  return {
    prefix,
    suffix: joinFragments(suffixParts, input.format),
    report: {
      platform: input.platform,
      format: input.format,
      valid: true,
      issues: [],
      readingTime,
      license,
      components: evaluatedComponents.map(item => item.report),
      warnings,
    },
  }
}

export function applyDeliveryAdornmentsToOutput(
  input: ApplyDeliveryAdornmentsInput,
): ApplyDeliveryAdornmentsResult {
  const fragments = createDeliveryAdornmentFragments(input)
  if (!fragments.report) {
    return {
      content: input.content,
      report: undefined,
    }
  }

  return {
    content: joinOutput(input.content, fragments.prefix, fragments.suffix, input.format),
    report: fragments.report,
  }
}

function evaluateDeliveryComponent(
  component: DeliveryPlatformComponent,
  platform: Platform,
  format: DeliveryAdornmentFormat,
): EvaluatedComponent {
  if (!component.enabled) {
    return evaluated(component, 'disabled', 'omitted', '该组件已停用，不写入产物。')
  }

  switch (component.type) {
    case 'image':
      return evaluateImageComponent(component, platform, format)
    case 'link':
      return evaluateLinkComponent(component, platform, format)
    case 'related-article':
      return evaluateRelatedArticleComponent(component, platform, format)
    case 'song':
      return evaluateSongComponent(component, platform, format)
    case 'contact-card':
      return evaluateContactCardComponent(component, platform, format)
    default: {
      const exhaustive: never = component
      return exhaustive
    }
  }
}

function evaluateImageComponent(
  component: Extract<DeliveryPlatformComponent, { type: 'image' }>,
  platform: Platform,
  format: DeliveryAdornmentFormat,
): EvaluatedComponent {
  const url = normalizeAllowedUrl(component.url, true)
  if (!url) {
    return evaluated(component, 'invalid', 'omitted', '图片缺少可公开访问的 HTTPS URL，未写入产物。')
  }
  if (!normalizeInlineText(component.alt)) {
    return evaluated(component, 'invalid', 'omitted', '图片缺少真实替代文本，未写入产物。')
  }
  if (platform === 'xiaohongshu') {
    return evaluated(
      component,
      'manual-required',
      'omitted',
      '小红书图片必须在客户端上传；已保留配置，但不会把不可执行占位写入文本。',
    )
  }

  return evaluated(
    component,
    'applied',
    'included',
    platform === 'wechat'
      ? '图片以安全 HTTPS HTML 写入；公众号编辑器可能在粘贴或草稿阶段重新托管。'
      : '图片以知乎 Markdown 图片语法写入。',
    renderImageFragment(component, url, format),
  )
}

function evaluateLinkComponent(
  component: Extract<DeliveryPlatformComponent, { type: 'link' }>,
  platform: Platform,
  format: DeliveryAdornmentFormat,
): EvaluatedComponent {
  const url = normalizeAllowedUrl(component.url)
  if (!url) {
    return evaluated(component, 'invalid', 'omitted', '链接缺少有效 HTTP/HTTPS URL，未写入产物。')
  }
  if (!normalizeInlineText(component.title)) {
    return evaluated(component, 'invalid', 'omitted', '链接缺少真实标题，未写入产物。')
  }

  return evaluated(
    component,
    platform === 'xiaohongshu' ? 'degraded' : 'applied',
    'included',
    platform === 'xiaohongshu'
      ? '小红书文本不承诺可点击链接，已降级为标题与公开 URL。'
      : '链接已写入平台原生产物。',
    renderLinkFragment('延伸链接', component.title, component.description, url, format),
  )
}

function evaluateRelatedArticleComponent(
  component: Extract<DeliveryPlatformComponent, { type: 'related-article' }>,
  platform: Platform,
  format: DeliveryAdornmentFormat,
): EvaluatedComponent {
  const url = normalizeAllowedUrl(component.url)
  if (!url) {
    return evaluated(component, 'invalid', 'omitted', '关联文章缺少有效 HTTP/HTTPS URL，未写入产物。')
  }
  if (!normalizeInlineText(component.title)) {
    return evaluated(component, 'invalid', 'omitted', '关联文章缺少真实标题，未写入产物。')
  }

  return evaluated(
    component,
    'degraded',
    'included',
    platform === 'wechat'
      ? '公众号原生关联文章卡片需要编辑器或凭据能力，当前安全降级为可访问链接卡片。'
      : '关联文章已降级为标题、摘要与链接。',
    renderLinkFragment('关联文章', component.title, component.summary, url, format),
  )
}

function evaluateSongComponent(
  component: Extract<DeliveryPlatformComponent, { type: 'song' }>,
  platform: Platform,
  format: DeliveryAdornmentFormat,
): EvaluatedComponent {
  if (!normalizeInlineText(component.title)) {
    return evaluated(component, 'invalid', 'omitted', '歌曲缺少真实歌曲名，未写入产物。')
  }
  const url = normalizeAllowedUrl(component.url)
  if (!url) {
    return evaluated(
      component,
      'manual-required',
      'omitted',
      platform === 'wechat'
        ? '公众号原生歌曲需要在微信编辑器内选择曲库；元数据已保留，产物不写入假播放器。'
        : '歌曲缺少可访问 URL，已保留配置并省略不可执行占位。',
    )
  }

  return evaluated(
    component,
    'degraded',
    'included',
    platform === 'wechat'
      ? '公众号原生歌曲仍需编辑器曲库确认，当前安全降级为歌曲链接卡片。'
      : '歌曲已降级为标题、作者与公开链接。',
    renderSongFragment(component, url, format),
  )
}

function evaluateContactCardComponent(
  component: Extract<DeliveryPlatformComponent, { type: 'contact-card' }>,
  platform: Platform,
  format: DeliveryAdornmentFormat,
): EvaluatedComponent {
  if (!normalizeInlineText(component.displayName)) {
    return evaluated(component, 'invalid', 'omitted', '名片缺少真实名称，未写入产物。')
  }
  const url = normalizeAllowedUrl(component.profileUrl)
  return evaluated(
    component,
    'degraded',
    'included',
    platform === 'wechat'
      ? '公众号原生名片仍需编辑器确认，当前输出可读的静态关注名片。'
      : '名片已降级为可读的静态资料。',
    renderContactCardFragment(component, url, format),
  )
}

function evaluated(
  component: DeliveryPlatformComponent,
  status: DeliveryAdornmentComponentStatus,
  output: DeliveryAdornmentOutputStatus,
  message: string,
  fragment = '',
): EvaluatedComponent {
  return {
    fragment,
    report: {
      id: component.id,
      type: component.type,
      status,
      output,
      message,
    },
  }
}

function renderReadingTimeFragment(
  report: DeliveryAdornmentReadingTimeReport,
  format: DeliveryAdornmentFormat,
): string {
  const message = `预计阅读 ${report.minutes} 分钟 · 全文 ${report.wordCount} 字`
  if (format === 'html') {
    return [
      '<section class="ink-delivery-reading-time" data-ink-delivery="reading-time" aria-label="阅读时间提示" style="margin:0 0 24px;padding:12px 16px;',
      'border:1px solid #E8EAED;border-radius:10px;background:#FAFBFC;',
      'color:#67737D;font-size:13px;line-height:1.7;letter-spacing:0.2px;">',
      escapeHtml(message),
      '</section>',
    ].join('')
  }
  if (format === 'markdown') {
    return `> ${message}`
  }
  return message
}

function renderLicenseFragment(
  option: CreativeCommonsLicenseOption,
  format: DeliveryAdornmentFormat,
): string {
  if (!option.url) return ''

  if (format === 'html') {
    return [
      '<section class="ink-article-colophon ink-delivery-license" data-ink-delivery="license" aria-label="许可协议" style="margin:28px 0 0;padding:16px 0 0;',
      'border-top:1px solid #E8EAED;color:#7A848C;font-size:12px;line-height:1.7;">',
      '本文采用 ',
      `<a href="${escapeHtmlAttribute(option.url)}" target="_blank" `,
      'style="color:#536A7A;text-decoration:underline;text-underline-offset:3px;">',
      escapeHtml(option.shortLabel),
      '</a> 协议授权。</section>',
    ].join('')
  }
  if (format === 'markdown') {
    return `**授权协议：** [${escapeMarkdownText(option.shortLabel)}](${option.url})`
  }
  return `授权协议：${option.shortLabel} · ${option.url}`
}

function renderImageFragment(
  component: Extract<DeliveryPlatformComponent, { type: 'image' }>,
  url: string,
  format: DeliveryAdornmentFormat,
): string {
  const alt = normalizeInlineText(component.alt) || '文章配图'
  const caption = normalizeInlineText(component.caption)

  if (format === 'html') {
    const captionHtml = caption
      ? `<figcaption style="margin-top:8px;color:#7A848C;font-size:12px;line-height:1.6;text-align:center;">${escapeHtml(caption)}</figcaption>`
      : ''
    return [
      '<figure style="margin:24px 0;text-align:center;">',
      `<img src="${escapeHtmlAttribute(url)}" alt="${escapeHtmlAttribute(alt)}" `,
      'style="display:block;width:100%;max-width:100%;height:auto;margin:0 auto;border-radius:10px;" />',
      captionHtml,
      '</figure>',
    ].join('')
  }
  if (format === 'markdown') {
    return [`![${escapeMarkdownText(alt)}](${url})`, caption ? `*${escapeMarkdownText(caption)}*` : '']
      .filter(Boolean)
      .join('\n\n')
  }
  return ''
}

function renderSongFragment(
  component: Extract<DeliveryPlatformComponent, { type: 'song' }>,
  url: string,
  format: DeliveryAdornmentFormat,
): string {
  const detail = component.artist ? `演唱：${component.artist}` : ''
  const link = renderLinkFragment('歌曲', component.title, detail, url, format)
  const coverUrl = normalizeAllowedUrl(component.coverUrl ?? '', true)
  if (!coverUrl) return link

  if (format === 'html') {
    return [
      '<figure style="margin:18px 0 10px;text-align:center;">',
      `<img src="${escapeHtmlAttribute(coverUrl)}" alt="${escapeHtmlAttribute(`${normalizeInlineText(component.title)} 封面`)}" `,
      'style="display:block;width:100%;max-width:240px;height:auto;margin:0 auto;border-radius:10px;" />',
      '</figure>',
      link,
    ].join('')
  }
  if (format === 'markdown') {
    return `![${escapeMarkdownText(`${component.title} 封面`)}](${coverUrl})\n\n${link}`
  }
  return `封面：${coverUrl}\n${link}`
}

function renderContactCardFragment(
  component: Extract<DeliveryPlatformComponent, { type: 'contact-card' }>,
  profileUrl: string | null,
  format: DeliveryAdornmentFormat,
): string {
  const displayName = normalizeInlineText(component.displayName)
  const accountId = normalizeInlineText(component.accountId)
  const description = normalizeInlineText(component.description ?? '')
  const avatarUrl = normalizeAllowedUrl(component.avatarUrl ?? '', true)
  const qrImageUrl = normalizeAllowedUrl(component.qrImageUrl ?? '', true)

  if (format === 'html') {
    return [
      '<section class="ink-delivery-profile" data-ink-delivery="profile" aria-label="作者公众号名片" style="margin:24px 0;padding:18px;border:1px solid #E3E8EC;border-radius:10px;background:#FFFFFF;text-align:center;">',
      avatarUrl
        ? `<img src="${escapeHtmlAttribute(avatarUrl)}" alt="${escapeHtmlAttribute(`${displayName} 头像`)}" style="display:block;width:72px;max-width:100%;height:auto;margin:0 auto 10px;border-radius:50%;" />`
        : '',
      `<strong style="display:block;color:#263238;font-size:17px;line-height:1.5;">${escapeHtml(displayName)}</strong>`,
      accountId
        ? `<span style="display:block;margin-top:4px;color:#7A848C;font-size:12px;line-height:1.6;">账号：${escapeHtml(accountId)}</span>`
        : '',
      description
        ? `<p style="margin:9px 0 0;color:#53616B;font-size:13px;line-height:1.7;">${escapeHtml(description)}</p>`
        : '',
      profileUrl
        ? `<a href="${escapeHtmlAttribute(profileUrl)}" target="_blank" style="display:inline-block;margin-top:10px;color:#536A7A;text-decoration:underline;text-underline-offset:3px;">查看公开资料</a>`
        : '',
      qrImageUrl
        ? `<img src="${escapeHtmlAttribute(qrImageUrl)}" alt="${escapeHtmlAttribute(`${displayName} 二维码`)}" style="display:block;width:144px;max-width:70%;height:auto;margin:14px auto 0;" />`
        : '',
      '</section>',
    ].join('')
  }

  const lines = [
    `作者名片：${displayName}`,
    accountId ? `账号：${accountId}` : '',
    description,
    profileUrl ? `公开资料：${profileUrl}` : '',
    avatarUrl ? `头像：${avatarUrl}` : '',
    qrImageUrl ? `二维码：${qrImageUrl}` : '',
  ].filter(Boolean)
  if (format === 'markdown') {
    return lines.map((line, index) => index === 0 ? `**${escapeMarkdownText(line)}**` : escapeMarkdownText(line)).join('\n\n')
  }
  return lines.join('\n')
}

function renderLinkFragment(
  kindLabel: string,
  titleValue: string,
  detailValue: string,
  url: string,
  format: DeliveryAdornmentFormat,
): string {
  const title = normalizeInlineText(titleValue) || kindLabel
  const detail = normalizeInlineText(detailValue)

  if (format === 'html') {
    const detailHtml = detail
      ? `<span style="display:block;margin-top:4px;color:#7A848C;font-size:12px;line-height:1.6;">${escapeHtml(detail)}</span>`
      : ''
    return [
      `<section class="ink-delivery-link" data-ink-delivery="link" data-ink-delivery-kind="${escapeHtmlAttribute(kindLabel)}" style="margin:18px 0;padding:15px 16px;border:1px solid #E3E8EC;`,
      'border-radius:10px;background:#FFFFFF;">',
      `<a href="${escapeHtmlAttribute(url)}" target="_blank" `,
      'style="display:block;color:#263238;text-decoration:none;">',
      `<span style="display:block;margin-bottom:5px;color:#8A959D;font-size:11px;line-height:1.4;letter-spacing:0.4px;">${escapeHtml(kindLabel)}</span>`,
      `<strong style="display:block;font-size:15px;line-height:1.55;">${escapeHtml(title)}</strong>`,
      detailHtml,
      `<span style="display:block;margin-top:6px;color:#607D8B;font-size:11px;line-height:1.5;word-break:break-all;">${escapeHtml(url)}</span>`,
      '</a></section>',
    ].join('')
  }
  if (format === 'markdown') {
    return [
      `**${escapeMarkdownText(kindLabel)}：** [${escapeMarkdownText(title)}](${url})`,
      detail ? escapeMarkdownText(detail) : '',
    ].filter(Boolean).join('\n\n')
  }
  return [
    `${kindLabel}：${title}`,
    detail,
    url,
  ].filter(Boolean).join('\n')
}

function joinFragments(parts: string[], format: DeliveryAdornmentFormat): string {
  const filtered = parts.map(part => part.trim()).filter(Boolean)
  if (filtered.length === 0) return ''
  return filtered.join(format === 'html' ? '' : '\n\n')
}

function joinOutput(
  content: string,
  prefix: string,
  suffix: string,
  format: DeliveryAdornmentFormat,
): string {
  if (format === 'html') {
    return `${prefix}${content}${suffix}`
  }

  return [prefix, content.trim(), suffix]
    .map(part => part.trim())
    .filter(Boolean)
    .join('\n\n')
}

function countReadingUnits(markdown: string): number {
  const normalized = markdown
    .replace(/```[\s\S]*?```/g, match => match.replace(/^```[^\n]*|```$/g, ' '))
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[`*_>#~|{}[\]()-]/g, ' ')
  const cjkCount = (normalized.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) ?? []).length
  const latinWordCount = (normalized.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length
  return cjkCount + latinWordCount
}

function normalizeAllowedUrl(value: string, httpsOnly = false): string | null {
  if (!isAllowedHttpUrl(value, httpsOnly) || value === '') return null

  try {
    return new URL(value).toString().replace(/\(/g, '%28').replace(/\)/g, '%29')
  } catch {
    return null
  }
}

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeMarkdownText(value: string): string {
  return normalizeInlineText(value).replace(/([\\[\]*_`])/g, '\\$1')
}
