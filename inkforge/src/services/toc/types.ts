import { z } from 'zod'

export const TOC_INDEX_VERSION = 1
export const TOC_HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const

export const TocHeadingLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])
export type TocHeadingLevel = z.infer<typeof TocHeadingLevelSchema>

export const TocNumberingSchema = z.enum(['none', 'decimal', 'nested'])
export type TocNumbering = z.infer<typeof TocNumberingSchema>

export const TocParseOptionsSchema = z.object({
  maxDepth: TocHeadingLevelSchema.default(6),
  numbering: TocNumberingSchema.default('none'),
  includeEmptyHeadings: z.boolean().default(true),
})
export type TocParseOptions = z.input<typeof TocParseOptionsSchema>
export type NormalizedTocParseOptions = z.output<typeof TocParseOptionsSchema>

export interface TocHeading {
  id: string
  domId: string
  slug: string
  level: TocHeadingLevel
  depth: number
  text: string
  pos: number
  line: number | null
  numbering: string | null
  children: TocHeading[]
}

export const TocHeadingSchema: z.ZodType<TocHeading> = z.lazy(() => z.object({
  id: z.string().min(1),
  domId: z.string().min(1),
  slug: z.string().min(1),
  level: TocHeadingLevelSchema,
  depth: z.number().int().nonnegative(),
  text: z.string(),
  pos: z.number().int().nonnegative(),
  line: z.number().int().nonnegative().nullable(),
  numbering: z.string().min(1).nullable(),
  children: z.array(TocHeadingSchema),
}))

export interface TocParseResult {
  flat: TocHeading[]
  tree: TocHeading[]
  options: NormalizedTocParseOptions
  parsedAt: number
}

export interface TocUpdateSummary {
  total: number
  visible: number
  activeHeadingId: string | null
  parsedAt: number
}
