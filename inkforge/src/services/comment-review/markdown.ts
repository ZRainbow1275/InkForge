const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char] ?? char)
}

export function extractMentions(markdown: string): string[] {
  const mentions = new Set<string>()
  const matcher = /(^|\s)@([A-Za-z0-9][A-Za-z0-9_.:-]{1,80})/gu
  let match = matcher.exec(markdown)

  while (match) {
    mentions.add(match[2])
    match = matcher.exec(markdown)
  }

  return Array.from(mentions)
}

export function stripReviewMarkdown(markdown: string): string {
  return markdown
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/\*\*([^*]+)\*\*/gu, '$1')
    .replace(/__([^_]+)__/gu, '$1')
    .replace(/\*([^*]+)\*/gu, '$1')
    .replace(/_([^_]+)_/gu, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gu, '$1')
}

export function renderInlineReviewMarkdown(markdown: string): string {
  let html = escapeHtml(markdown)
  html = html.replace(/`([^`]+)`/gu, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/gu, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/gu, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/gu, '<em>$1</em>')
  html = html.replace(/(^|\s)@([A-Za-z0-9][A-Za-z0-9_.:-]{1,80})/gu, '$1<span class="review-mention" data-profile-id="$2">@$2</span>')
  return html
}