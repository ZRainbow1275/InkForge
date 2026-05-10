import { z } from 'zod'

export const CITATION_STYLE_IDS = ['apa', 'mla', 'chicago-author-date', 'gb-t-7714-2015'] as const
export type CitationStyleId = typeof CITATION_STYLE_IDS[number]

export const CitationStyleIdSchema = z.enum(CITATION_STYLE_IDS)

export const BibEntrySchema = z.object({
  key: z.string().min(1),
  type: z.string().min(1),
  fields: z.record(z.string(), z.string()),
})
export type BibEntry = z.infer<typeof BibEntrySchema>

export interface BibAuthorName {
  original: string
  given: string
  family: string
}

export interface CitationItem {
  key: string
  suppressAuthor: boolean
  suffix: string
  locator: string | null
}

export interface CitationCluster {
  raw: string
  items: CitationItem[]
}

export interface FormattedCitationCluster {
  raw: string
  keys: string[]
  formattedText: string
  unresolvedKeys: string[]
}

export interface FormattedBibliographyEntry {
  key: string
  html: string
  text: string
}

export interface FootnoteDefinition {
  id: string
  markdown: string
}

export interface FootnoteReference {
  id: string
  displayIndex: number
  occurrenceIndex: number
}

export interface FootnoteExtractionResult {
  markdown: string
  definitions: Map<string, FootnoteDefinition>
}

export interface FootnoteRenderState {
  definitions: Map<string, FootnoteDefinition>
  order: Map<string, number>
  referenceCounts: Map<string, number>
}

export interface CitationRenderState {
  entries: Map<string, BibEntry>
  usedKeys: string[]
  style: CitationStyleId
}

export interface CitationMarkdownRenderOptions {
  bibEntries?: readonly BibEntry[]
  style?: CitationStyleId
}

export type CitationPlatform = 'html' | 'wechat' | 'zhihu' | 'xiaohongshu' | 'markdown'
