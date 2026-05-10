import { CommandContextTag, type Command, type CommandContext, type CommandHistoryEntry, type CommandMatchRange, type SearchResult } from '@/types/command-palette'
import { isCommandVisible } from './registry'

const MAX_RESULTS = 12
const GROUP_LABELS: Record<string, string> = {
  editor: 'Editor',
  document: 'Document',
  hub: 'Hub',
  export: 'Export',
  publish: 'Publish',
  view: 'View',
  settings: 'Settings',
  ai: 'AI',
  extension: 'Extensions',
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function acronym(value: string): string {
  return value
    .split(/[^a-zA-Z0-9\u4e00-\u9fff]+/u)
    .filter(Boolean)
    .map(part => part[0]?.toLowerCase() ?? '')
    .join('')
}

function findSubsequenceRanges(query: string, target: string): [number, number][] | null {
  const ranges: [number, number][] = []
  let targetIndex = 0

  for (const queryChar of query) {
    const foundIndex = target.indexOf(queryChar, targetIndex)
    if (foundIndex === -1) {
      return null
    }
    ranges.push([foundIndex, foundIndex])
    targetIndex = foundIndex + 1
  }

  return ranges
}

function scoreText(query: string, rawText: string): { score: number; ranges: [number, number][] } | null {
  const text = normalize(rawText)
  if (!query || !text) return null

  if (text === query) {
    return { score: 0, ranges: [[0, rawText.length - 1]] }
  }

  if (text.startsWith(query)) {
    return { score: 0.05, ranges: [[0, query.length - 1]] }
  }

  const includesIndex = text.indexOf(query)
  if (includesIndex >= 0) {
    return {
      score: 0.15 + includesIndex / Math.max(text.length, 1) / 10,
      ranges: [[includesIndex, includesIndex + query.length - 1]],
    }
  }

  const acronymValue = acronym(rawText)
  if (acronymValue && acronymValue.startsWith(query)) {
    return { score: 0.25, ranges: [[0, Math.min(rawText.length - 1, query.length - 1)]] }
  }

  const subsequenceRanges = findSubsequenceRanges(query, text)
  if (subsequenceRanges) {
    const spread = subsequenceRanges[subsequenceRanges.length - 1][1] - subsequenceRanges[0][0]
    return { score: 0.35 + spread / Math.max(text.length, 1) / 5, ranges: subsequenceRanges }
  }

  return null
}

export function calculateHistoryBonus(commandId: string, history: CommandHistoryEntry[]): number {
  const recentEntries = history.slice(-20)
  let idx = -1
  for (let index = recentEntries.length - 1; index >= 0; index--) {
    if (recentEntries[index].commandId === commandId) {
      idx = index
      break
    }
  }
  if (idx === -1) return 0
  if (idx >= recentEntries.length - 5) return 0.3
  return 0.1
}

function getFieldCandidates(command: Command): { key: CommandMatchRange['key']; value: string; weight: number }[] {
  return [
    { key: 'title', value: command.title, weight: 1 },
    { key: 'keywords', value: command.keywords.join(' '), weight: 1.2 },
    { key: 'subtitle', value: command.subtitle ?? '', weight: 1.5 },
    { key: 'group', value: GROUP_LABELS[command.group] ?? command.group, weight: 1.8 },
  ]
}

function scoreCommand(command: Command, query: string): { score: number; matches: CommandMatchRange[] } | null {
  const candidates = getFieldCandidates(command)
  let bestScore = Number.POSITIVE_INFINITY
  const matches: CommandMatchRange[] = []

  for (const candidate of candidates) {
    const match = scoreText(query, candidate.value)
    if (!match) continue

    const weightedScore = match.score * candidate.weight
    if (weightedScore < bestScore) {
      bestScore = weightedScore
    }
    matches.push({ key: candidate.key, indices: match.ranges })
  }

  if (!matches.length) return null
  return { score: bestScore, matches }
}

export class FuzzySearchEngine {
  private indexedCommands: Command[] = []

  rebuildIndex(commands: Command[]): void {
    this.indexedCommands = [...commands]
  }

  search(
    query: string,
    context: CommandContext,
    history: CommandHistoryEntry[],
    contextFilter: CommandContextTag[] = [],
  ): SearchResult[] {
    const normalizedQuery = normalize(query)
    if (!normalizedQuery) return []

    return this.filterByContext(context, contextFilter)
      .map((command, index) => {
        const scored = scoreCommand(command, normalizedQuery)
        if (!scored) return null
        const historyBonus = calculateHistoryBonus(command.id, history)
        const prefixBonus = normalize(command.title).startsWith(normalizedQuery) ? 0.2 : 0
        return {
          command,
          score: scored.score - historyBonus - prefixBonus + index / 10_000,
          matches: scored.matches,
        }
      })
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_RESULTS)
  }

  filterByContext(context: CommandContext, contextFilter: CommandContextTag[] = []): Command[] {
    return this.indexedCommands.filter(command => {
      if (!isCommandVisible(command, context.activeContexts, contextFilter)) {
        return false
      }

      if (context.cursorContext?.inCodeBlock && command.group === 'editor') {
        return command.contexts.some(tag => tag !== CommandContextTag.Editor)
      }

      return true
    })
  }
}

export function toSearchResult(command: Command, score = 0): SearchResult {
  return { command, score, matches: [] }
}
