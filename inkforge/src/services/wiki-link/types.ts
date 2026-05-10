import { z } from 'zod'

export const WIKI_LINK_INDEX_VERSION = 1

export const WikiLinkTokenSchema = z.object({
  target: z.string().min(1),
  anchor: z.string().min(1).nullable(),
  alias: z.string().min(1).nullable(),
  raw: z.string().min(4),
})

export type WikiLinkToken = z.infer<typeof WikiLinkTokenSchema>

export interface WikiLinkOccurrence extends WikiLinkToken {
  index: number
  line: number
  column: number
  context: string
}

export const BacklinkRecordSchema = z.object({
  id: z.string().min(1),
  indexVersion: z.literal(WIKI_LINK_INDEX_VERSION),
  sourceArticleId: z.string().min(1),
  sourceTitle: z.string().min(1),
  targetArticleId: z.string().min(1).nullable(),
  targetTitle: z.string().min(1),
  anchor: z.string().min(1).nullable(),
  alias: z.string().min(1).nullable(),
  raw: z.string().min(4),
  context: z.string(),
  resolved: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
})

export type BacklinkRecord = z.infer<typeof BacklinkRecordSchema>

export interface WikiLinkArticleSearchItem {
  id: string
  title: string
  categoryId: string | null
  status: string
  updatedAt: Date
}

export interface WikiLinkRebuildResult {
  sourceArticleId: string
  indexed: number
  resolved: number
  broken: number
}

export interface WikiLinkRebuildAllResult {
  indexedArticles: number
  indexedLinks: number
  resolved: number
  broken: number
}
