import { marked } from 'marked'
import { renderInkforgeMarkdownExtensions } from '@/services/markdown-ext'

type KatexModule = {
  default?: {
    renderToString: (source: string, options: Record<string, unknown>) => string
  }
  renderToString?: (source: string, options: Record<string, unknown>) => string
}
type MermaidModule = {
  default?: {
    initialize: (options: Record<string, unknown>) => void
    render: (id: string, source: string) => Promise<{ svg: string }>
  }
}

let katexModulePromise: Promise<KatexModule | null> | null = null
let mermaidModulePromise: Promise<MermaidModule | null> | null = null
let mermaidCounter = 0

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function loadKatex(): Promise<KatexModule | null> {
  if (!katexModulePromise) {
    katexModulePromise = import('katex').catch(() => null)
  }

  return katexModulePromise
}

async function loadMermaid(): Promise<MermaidModule | null> {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').catch(() => null)
  }

  return mermaidModulePromise
}

async function renderLatex(source: string, displayMode: boolean): Promise<string> {
  const katex = await loadKatex()
  const renderer = katex?.renderToString ?? katex?.default?.renderToString
  if (!renderer) {
    const tag = displayMode ? 'div' : 'span'
    return `<${tag} class="math-fallback"><code>${escapeHtml(source)}</code></${tag}>`
  }

  return renderer(source, {
    throwOnError: false,
    strict: 'warn',
    output: 'htmlAndMathml',
    displayMode,
    trust: false,
  })
}

async function renderMermaid(source: string): Promise<string> {
  const mermaid = (await loadMermaid())?.default
  if (!mermaid) {
    return `<pre class="mermaid-fallback"><code>${escapeHtml(source)}</code></pre>`
  }

  try {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
    const result = await mermaid.render(`inkforge_mermaid_${Date.now()}_${mermaidCounter++}`, source)
    return `<div class="mermaid-rendered">${result.svg}</div>`
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mermaid render failed'
    return `<pre class="mermaid-fallback" data-error="${escapeHtml(message)}"><code>${escapeHtml(source)}</code></pre>`
  }
}

async function replaceAsync(
  value: string,
  pattern: RegExp,
  replacer: (...args: string[]) => Promise<string>,
): Promise<string> {
  const matches = Array.from(value.matchAll(pattern))
  if (matches.length === 0) {
    return value
  }

  const replacements = await Promise.all(matches.map(match => replacer(...match)))
  let result = ''
  let lastIndex = 0

  matches.forEach((match, index) => {
    const start = match.index ?? 0
    result += value.slice(lastIndex, start)
    result += replacements[index]
    lastIndex = start + match[0].length
  })

  return result + value.slice(lastIndex)
}

export async function renderMarkdownWithOptionalEnhancements(markdown: string): Promise<string> {
  let staged = markdown || ''

  staged = await replaceAsync(staged, /^```mermaid\s*\n([\s\S]*?)\n```$/gm, async (_match, source) => {
    return await renderMermaid(source)
  })

  staged = await replaceAsync(staged, /\$\$\s*([\s\S]*?)\s*\$\$/g, async (_match, source) => {
    return await renderLatex(source, true)
  })

  staged = await replaceAsync(staged, /(^|[^\\$])\$([^\n$]+?)\$/g, async (_match, prefix, source) => {
    return `${prefix}${await renderLatex(source, false)}`
  })

  staged = await renderInkforgeMarkdownExtensions(staged)

  const html = await marked.parse(staged, {
    breaks: true,
    gfm: true,
  })

  return typeof html === 'string' ? html : String(html)
}

