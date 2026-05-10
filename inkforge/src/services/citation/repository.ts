import { parseBibTeX } from './bibtex'
import { formatBibliography, formatCitationCluster, normalizeCitationStyleId } from './format'
import type { BibEntry, CitationCluster, CitationStyleId, FormattedBibliographyEntry, FormattedCitationCluster } from './types'

export interface CitationRepositoryFileLoader {
  readTextFile(path: string): Promise<string>
}

export interface CitationRepositoryLoadOptions {
  documentPath?: string
  bibPaths: readonly string[]
  style?: CitationStyleId | string
  fileLoader?: CitationRepositoryFileLoader
}

export class CitationRepositoryError extends Error {
  constructor(
    message: string,
    readonly code: 'runtime-unavailable' | 'read-failed' | 'invalid-path',
    readonly path?: string,
  ) {
    super(message)
    this.name = 'CitationRepositoryError'
  }
}

async function createTauriFileLoader(): Promise<CitationRepositoryFileLoader> {
  try {
    const fs = await import('@tauri-apps/api/fs')
    return { readTextFile: fs.readTextFile }
  } catch {
    throw new CitationRepositoryError('Tauri file system is unavailable in this runtime.', 'runtime-unavailable')
  }
}

function resolveBibPath(documentPath: string | undefined, bibPath: string): string {
  const normalized = bibPath.trim()
  if (!normalized) throw new CitationRepositoryError('Empty bibliography path.', 'invalid-path', bibPath)
  if (/^(?:[A-Za-z]:[\\/]|\/|\\\\|[a-z]+:)/.test(normalized)) return normalized
  if (!documentPath) return normalized
  const separator = documentPath.includes('\\') ? '\\' : '/'
  const base = documentPath.split(/[\\/]/).slice(0, -1).join(separator)
  return base ? `${base}${separator}${normalized}` : normalized
}

export class CitationRepository {
  private readonly entries = new Map<string, BibEntry>()
  private style: CitationStyleId = 'gb-t-7714-2015'

  async loadFromDocument(options: CitationRepositoryLoadOptions): Promise<void> {
    const loader = options.fileLoader ?? await createTauriFileLoader()
    this.entries.clear()
    this.style = normalizeCitationStyleId(options.style)

    for (const bibPath of options.bibPaths) {
      const resolvedPath = resolveBibPath(options.documentPath, bibPath)
      let content: string
      try {
        content = await loader.readTextFile(resolvedPath)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to read bibliography file.'
        throw new CitationRepositoryError(message, 'read-failed', resolvedPath)
      }
      this.addBibTeXContent(content)
    }
  }

  addBibTeXContent(content: string): void {
    for (const entry of parseBibTeX(content)) {
      this.entries.set(entry.key, entry)
    }
  }

  getEntries(): BibEntry[] {
    return Array.from(this.entries.values())
  }

  getEntry(key: string): BibEntry | null {
    return this.entries.get(key) ?? null
  }

  search(query: string): BibEntry[] {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return this.getEntries().slice(0, 10)
    return this.getEntries()
      .filter((entry) => {
        const haystack = [entry.key, entry.type, entry.fields.author, entry.fields.editor, entry.fields.title, entry.fields.year]
          .filter((part): part is string => typeof part === 'string')
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalized)
      })
      .slice(0, 10)
  }

  setStyle(style: CitationStyleId | string): void {
    this.style = normalizeCitationStyleId(style)
  }

  formatCitation(cluster: CitationCluster): FormattedCitationCluster {
    return formatCitationCluster(cluster, this.entries, this.style)
  }

  formatBibliography(keys: readonly string[]): FormattedBibliographyEntry[] {
    return formatBibliography(keys, this.entries, this.style)
  }

  destroy(): void {
    this.entries.clear()
  }
}
