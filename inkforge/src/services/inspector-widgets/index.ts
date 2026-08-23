import { z } from 'zod'

export const INSPECTOR_WIDGET_IDS = [
  'platform-preview',
  'references',
  'document-statistics',
] as const

export type InspectorWidgetId = typeof INSPECTOR_WIDGET_IDS[number]

export const INSPECTOR_WIDGET_META: Record<InspectorWidgetId, { title: string; description: string }> = {
  'platform-preview': { title: '平台预览', description: '查看当前平台与样式的真实渲染结果' },
  references: { title: '引用链接', description: '检查、打开和复制当前文稿的外部引用' },
  'document-statistics': { title: '文稿统计', description: '查看当前文稿的字数、结构与阅读时间' },
}

export const INSPECTOR_WIDGET_EVENTS = {
  ready: 'inkforge://inspector-widget-ready',
  state: 'inkforge://inspector-widget-state',
  redock: 'inkforge://inspector-widget-redock',
  close: 'inkforge://inspector-widget-close',
} as const

export const INSPECTOR_WIDGET_CHANNEL = 'inkforge-inspector-widgets'

export const INSPECTOR_WIDGET_PLACEMENTS = ['docked', 'floating', 'native', 'closed'] as const
export type InspectorWidgetPlacement = typeof INSPECTOR_WIDGET_PLACEMENTS[number]

const NativeWindowLabelSchema = z.string().regex(/^inspector-[a-z0-9-]+-[0-9a-f]{16}$/)
const WidgetPlacementSchema = z.enum(INSPECTOR_WIDGET_PLACEMENTS)

export const InspectorWidgetLayoutSchema = z.object({
  placement: WidgetPlacementSchema,
  x: z.number().finite().min(0).max(10_000),
  y: z.number().finite().min(0).max(10_000),
  width: z.number().finite().min(280).max(720),
  height: z.number().finite().min(220).max(760),
  nativeWindowLabel: NativeWindowLabelSchema.nullable(),
})

export type InspectorWidgetLayout = z.infer<typeof InspectorWidgetLayoutSchema>

export const InspectorWidgetLayoutsSchema = z.object({
  'platform-preview': InspectorWidgetLayoutSchema,
  references: InspectorWidgetLayoutSchema,
  'document-statistics': InspectorWidgetLayoutSchema,
})

export type InspectorWidgetLayouts = z.infer<typeof InspectorWidgetLayoutsSchema>

const DEFAULT_INSPECTOR_WIDGET_LAYOUTS: InspectorWidgetLayouts = {
  'platform-preview': {
    placement: 'docked',
    x: 72,
    y: 72,
    width: 440,
    height: 560,
    nativeWindowLabel: null,
  },
  references: {
    placement: 'docked',
    x: 112,
    y: 104,
    width: 420,
    height: 420,
    nativeWindowLabel: null,
  },
  'document-statistics': {
    placement: 'docked',
    x: 152,
    y: 136,
    width: 360,
    height: 300,
    nativeWindowLabel: null,
  },
}

export function createDefaultInspectorWidgetLayouts(): InspectorWidgetLayouts {
  return Object.fromEntries(
    INSPECTOR_WIDGET_IDS.map(id => [id, { ...DEFAULT_INSPECTOR_WIDGET_LAYOUTS[id] }]),
  ) as InspectorWidgetLayouts
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

export function isInspectorWidgetId(value: unknown): value is InspectorWidgetId {
  return typeof value === 'string' && INSPECTOR_WIDGET_IDS.includes(value as InspectorWidgetId)
}

export function normalizeInspectorWidgetLayouts(input: unknown): InspectorWidgetLayouts {
  const defaults = createDefaultInspectorWidgetLayouts()
  const candidate = isRecord(input) ? input : {}

  return Object.fromEntries(INSPECTOR_WIDGET_IDS.map(id => {
    const fallback = defaults[id]
    const raw = isRecord(candidate[id]) ? candidate[id] : {}
    const placement = typeof raw.placement === 'string'
      && INSPECTOR_WIDGET_PLACEMENTS.includes(raw.placement as InspectorWidgetPlacement)
      ? raw.placement as InspectorWidgetPlacement
      : fallback.placement
    const parsedWindowLabel = NativeWindowLabelSchema.safeParse(raw.nativeWindowLabel)
    const nativeWindowLabel = parsedWindowLabel.success ? parsedWindowLabel.data : null

    return [id, {
      placement: placement === 'native' && !nativeWindowLabel ? 'docked' : placement,
      x: boundedNumber(raw.x, fallback.x, 0, 10_000),
      y: boundedNumber(raw.y, fallback.y, 0, 10_000),
      width: boundedNumber(raw.width, fallback.width, 280, 720),
      height: boundedNumber(raw.height, fallback.height, 220, 760),
      nativeWindowLabel: placement === 'native' ? nativeWindowLabel : null,
    } satisfies InspectorWidgetLayout]
  })) as InspectorWidgetLayouts
}

export interface InspectorWidgetBounds {
  width: number
  height: number
}

export function clampInspectorWidgetLayout(
  layout: InspectorWidgetLayout,
  bounds: InspectorWidgetBounds,
): InspectorWidgetLayout {
  const safeWidth = Math.max(280, Number.isFinite(bounds.width) ? bounds.width : 0)
  const safeHeight = Math.max(220, Number.isFinite(bounds.height) ? bounds.height : 0)
  const width = Math.min(layout.width, Math.max(280, safeWidth - 24))
  const height = Math.min(layout.height, Math.max(220, safeHeight - 24))

  return {
    ...layout,
    x: Math.min(Math.max(12, layout.x), Math.max(12, safeWidth - width - 12)),
    y: Math.min(Math.max(12, layout.y), Math.max(12, safeHeight - height - 12)),
    width,
    height,
  }
}

export interface ExtractedLink {
  text: string
  href: string
}

export function extractExternalLinks(markdown: string): ExtractedLink[] {
  if (!markdown) return []

  const links: ExtractedLink[] = []
  const seen = new Set<string>()
  const append = (text: string, href: string) => {
    if (seen.has(href)) return
    seen.add(href)
    links.push({ text: text || href, href })
  }
  let match: RegExpExecArray | null

  const markdownLink = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
  while ((match = markdownLink.exec(markdown)) !== null) append(match[1], match[2])

  const autoLink = /<(https?:\/\/[^>]+)>/g
  while ((match = autoLink.exec(markdown)) !== null) append(match[1], match[1])

  const referenceDefinition = /^\[([^\]]+)\]:\s*(https?:\/\/\S+)/gm
  while ((match = referenceDefinition.exec(markdown)) !== null) append(match[1], match[2])

  return links
}

export const DocumentStatisticsSchema = z.object({
  words: z.number().int().nonnegative(),
  nonWhitespaceCharacters: z.number().int().nonnegative(),
  paragraphs: z.number().int().nonnegative(),
  headings: z.number().int().nonnegative(),
  links: z.number().int().nonnegative(),
  readingMinutes: z.number().int().nonnegative(),
})

export type DocumentStatistics = z.infer<typeof DocumentStatisticsSchema>

export function buildDocumentStatistics(markdown: string, words: number, linkCount: number): DocumentStatistics {
  const normalizedWords = Number.isFinite(words) ? Math.max(0, Math.trunc(words)) : 0
  const paragraphs = markdown.trim()
    ? markdown.split(/\n\s*\n/).filter(block => block.trim().length > 0).length
    : 0

  return {
    words: normalizedWords,
    nonWhitespaceCharacters: markdown.replace(/\s/g, '').length,
    paragraphs,
    headings: (markdown.match(/^#{1,6}\s+\S/gm) ?? []).length,
    links: Math.max(0, Math.trunc(linkCount)),
    readingMinutes: normalizedWords === 0 ? 0 : Math.max(1, Math.ceil(normalizedWords / 400)),
  }
}

const HttpUrlSchema = z.string().url().refine(value => {
  const protocol = new URL(value).protocol
  return protocol === 'http:' || protocol === 'https:'
}, 'Only HTTP(S) references are allowed')

export const InspectorWidgetPayloadSchema = z.object({
  articleId: z.string().min(1).nullable(),
  articleTitle: z.string(),
  platform: z.string().min(1),
  platformLabel: z.string().min(1),
  previewHtml: z.string(),
  previewLoading: z.boolean(),
  previewIsSample: z.boolean(),
  links: z.array(z.object({ text: z.string(), href: HttpUrlSchema })),
  statistics: DocumentStatisticsSchema,
  updatedAt: z.number().int().nonnegative(),
})

export type InspectorWidgetPayload = z.infer<typeof InspectorWidgetPayloadSchema>

export const InspectorWidgetStateEnvelopeSchema = z.object({
  windowLabel: NativeWindowLabelSchema,
  payload: InspectorWidgetPayloadSchema,
})

export const InspectorWidgetHandshakeSchema = z.object({
  surfaceId: z.enum(INSPECTOR_WIDGET_IDS),
  articleId: z.string().min(1),
  windowLabel: NativeWindowLabelSchema,
})

export type InspectorWidgetHandshake = z.infer<typeof InspectorWidgetHandshakeSchema>

export const InspectorWidgetChannelMessageSchema = z.union([
  z.object({
    type: z.enum(['ready', 'redock', 'close']),
    data: InspectorWidgetHandshakeSchema,
  }),
  z.object({
    type: z.literal('state'),
    data: InspectorWidgetStateEnvelopeSchema,
  }),
])

export type InspectorWidgetChannelMessage = z.infer<typeof InspectorWidgetChannelMessageSchema>

export interface InspectorWidgetRequest extends InspectorWidgetHandshake {
  profileId: string
}

export function parseInspectorWidgetRequest(search: string): InspectorWidgetRequest | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const surfaceId = params.get('inspectorWidget')
  const articleId = params.get('articleId')?.trim() ?? ''
  const profileId = params.get('profileId')?.trim() ?? ''
  const windowLabel = params.get('windowLabel')?.trim() ?? ''

  if (!isInspectorWidgetId(surfaceId) || !articleId || !profileId || articleId.length > 256 || profileId.length > 256) {
    return null
  }
  if (!NativeWindowLabelSchema.safeParse(windowLabel).success) {
    return null
  }

  return { surfaceId, articleId, profileId, windowLabel }
}
