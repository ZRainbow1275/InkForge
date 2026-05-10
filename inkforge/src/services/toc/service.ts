import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { findActiveHeadingByPosition, parseTocFromMarkdown, parseTocFromProseMirrorDoc } from './parser'
import type { TocHeading, TocParseOptions, TocParseResult } from './types'

export class TocService {
  parseMarkdown(markdown: string, options: TocParseOptions = {}): TocParseResult {
    return parseTocFromMarkdown(markdown, options)
  }

  parseEditorDoc(doc: ProseMirrorNode, options: TocParseOptions = {}): TocParseResult {
    return parseTocFromProseMirrorDoc(doc, options)
  }

  findActive(flatHeadings: TocHeading[], position: number): TocHeading | null {
    return findActiveHeadingByPosition(flatHeadings, position)
  }
}

export const tocService = new TocService()
