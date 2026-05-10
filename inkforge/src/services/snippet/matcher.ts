import type { SnippetContext, SnippetRecord, SnippetTriggerMatch } from './types'

function normalizeForCase(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLocaleLowerCase()
}

function isBoundary(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char)
}

export function isSnippetInScope(snippet: SnippetRecord, context: Pick<SnippetContext, 'articleId' | 'tags'>): boolean {
  if (snippet.scope.type === 'global') return true
  if (snippet.scope.type === 'document') return Boolean(context.articleId && snippet.scope.articleId === context.articleId)
  const activeTags = new Set(context.tags.map(tag => tag.toLocaleLowerCase()))
  return snippet.scope.tags.some(tag => activeTags.has(tag.toLocaleLowerCase()))
}

export function filterSnippetsForContext(snippets: SnippetRecord[], context: Pick<SnippetContext, 'articleId' | 'tags'>): SnippetRecord[] {
  return snippets.filter(snippet => isSnippetInScope(snippet, context))
}

export function matchSnippetTrigger(textBeforeCursor: string, snippets: SnippetRecord[]): SnippetTriggerMatch | null {
  const candidates = snippets
    .filter(snippet => snippet.type === 'text' && snippet.trigger.length > 0)
    .map(snippet => {
      const haystack = normalizeForCase(textBeforeCursor, snippet.triggerCaseSensitive)
      const trigger = normalizeForCase(snippet.trigger, snippet.triggerCaseSensitive)
      if (!haystack.endsWith(trigger)) return null
      const fromOffset = textBeforeCursor.length - snippet.trigger.length
      if (!isBoundary(textBeforeCursor[fromOffset - 1])) return null
      return {
        snippet,
        trigger: snippet.trigger,
        fromOffset,
        toOffset: textBeforeCursor.length,
      } satisfies SnippetTriggerMatch
    })
    .filter((match): match is SnippetTriggerMatch => match !== null)

  candidates.sort((a, b) => {
    const triggerDelta = b.trigger.length - a.trigger.length
    if (triggerDelta !== 0) return triggerDelta
    const usageDelta = b.snippet.usageCount - a.snippet.usageCount
    if (usageDelta !== 0) return usageDelta
    return (b.snippet.lastUsedAt ?? 0) - (a.snippet.lastUsedAt ?? 0)
  })

  return candidates[0] ?? null
}
