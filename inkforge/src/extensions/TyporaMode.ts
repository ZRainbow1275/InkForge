import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Selection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { isValidFootnoteId, serializeCitationElementFromHtml } from '@/services/citation'
import { renderMarkdownWithLazyOptionalEnhancements } from '@/services/rendering/lazy-optional-renderer'
import { createInkforgeAssetUrl, extractInkforgeAssetId } from '@/utils/asset-url'

export type EditorMode = 'typora' | 'source' | 'preview'
export type EditorWidth = 'narrow' | 'medium' | 'wide' | 'full'
export type TyporaSyncState = 'synced' | 'syncing' | 'dirty' | 'offline'
export const TYPORA_MODE_REFRESH_META = 'typoraModeRefresh'

export interface TyporaModeOptions {
  enabled: boolean
  activeLineClass: string
}

export interface TyporaActiveLine {
  from: number
  to: number
  depth: number
  nodeName: string
  text: string
  blockToken: string
  inlineTokens: string[]
  selectionFrom: number
  selectionTo: number
  isCollapsedSelection: boolean
}

export interface TyporaModeStorage {
  enabled: boolean
  activeLine: TyporaActiveLine
  lastUpdatedAt: number
}

const DEFAULT_OPTIONS: TyporaModeOptions = {
  enabled: true,
  activeLineClass: 'typora-active-line',
}

const EMPTY_ACTIVE_LINE: TyporaActiveLine = {
  from: 0,
  to: 0,
  depth: 0,
  nodeName: '',
  text: '',
  blockToken: '',
  inlineTokens: [],
  selectionFrom: 0,
  selectionTo: 0,
  isCollapsedSelection: true,
}

const typoraPluginKey = new PluginKey<TyporaActiveLine>('typoraMode')

const INLINE_MARKDOWN_TOKENS: Record<string, string> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  code: '`',
  link: '[]()',
  highlight: '==',
  superscript: '^',
  subscript: '~',
}

const BLOCK_MARKDOWN_TOKENS: Record<string, string> = {
  blockquote: '>',
  codeBlock: '```',
  bulletList: '-',
  orderedList: '1.',
  taskList: '- [ ]',
  horizontalRule: '---',
  table: '|',
  image: '![]()',
}

interface ListContext {
  ordered: boolean
  index: number
  task: boolean
  checked: boolean
}

function escapeInlineMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/([`*_~[\]])/g, '\\$1')
}

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function escapeMarkdownTitle(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function prefixMultiline(text: string, firstPrefix: string, nestedPrefix: string): string {
  const lines = text.split('\n')
  return lines
    .map((line, index) => `${index === 0 ? firstPrefix : nestedPrefix}${line}`)
    .join('\n')
}

function getInlineTokens(selection: Selection): string[] {
  const tokens = new Set<string>()
  const marks = selection.$from.marks()

  for (const mark of marks) {
    const token = INLINE_MARKDOWN_TOKENS[mark.type.name]
    if (token) {
      tokens.add(token)
    }
  }

  return Array.from(tokens)
}

function resolveListContext(state: EditorState, depth: number): ListContext | null {
  const $from = state.selection.$from

  for (let currentDepth = depth; currentDepth > 0; currentDepth -= 1) {
    const node = $from.node(currentDepth)

    if (node.type.name === 'taskItem') {
      return {
        ordered: false,
        index: 0,
        task: true,
        checked: Boolean(node.attrs.checked),
      }
    }

    if (node.type.name === 'listItem') {
      const parentDepth = currentDepth - 1
      const parent = parentDepth >= 0 ? $from.node(parentDepth) : null
      if (!parent) {
        return null
      }

      if (parent.type.name === 'orderedList') {
        const start = Number(parent.attrs.start ?? 1)
        return {
          ordered: true,
          index: start + $from.index(parentDepth),
          task: false,
          checked: false,
        }
      }

      if (parent.type.name === 'bulletList') {
        return {
          ordered: false,
          index: 0,
          task: false,
          checked: false,
        }
      }
    }
  }

  return null
}

function resolveBlockToken(state: EditorState, node: ProseMirrorNode, depth: number): string {
  if (node.type.name === 'heading') {
    const level = Number(node.attrs.level ?? 1)
    return '#'.repeat(Math.min(Math.max(level, 1), 6))
  }

  const directToken = BLOCK_MARKDOWN_TOKENS[node.type.name]
  if (directToken) {
    return directToken
  }

  const listContext = resolveListContext(state, depth)
  if (listContext) {
    if (listContext.task) {
      return listContext.checked ? '- [x]' : '- [ ]'
    }

    if (listContext.ordered) {
      return `${listContext.index}.`
    }

    return '-'
  }

  return ''
}

function computeActiveLine(state: EditorState): TyporaActiveLine {
  const { selection } = state
  const { $from } = selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (!node.isBlock) {
      continue
    }

    const from = $from.before(depth)
    const to = $from.after(depth)

    return {
      from,
      to,
      depth,
      nodeName: node.type.name,
      text: node.textContent,
      blockToken: resolveBlockToken(state, node, depth),
      inlineTokens: getInlineTokens(selection),
      selectionFrom: selection.from,
      selectionTo: selection.to,
      isCollapsedSelection: selection.empty,
    }
  }

  return { ...EMPTY_ACTIVE_LINE }
}

function syncDomMetadata(root: HTMLElement | null, nextState: TyporaActiveLine, enabled: boolean): void {
  if (!root) {
    return
  }

  root.dataset.typoraMode = enabled ? 'active' : 'inactive'
  root.dataset.typoraNode = nextState.nodeName
  root.dataset.typoraBlockToken = nextState.blockToken
  root.dataset.typoraInlineTokens = nextState.inlineTokens.join(' ')

  if (enabled) {
    root.classList.add('typora-mode-enabled')
  } else {
    root.classList.remove('typora-mode-enabled')
  }
}

function inlineChildrenToMarkdown(parent: Node): string {
  return Array.from(parent.childNodes)
    .map((child) => nodeToMarkdown(child, 0, true))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
}

function footnoteItemsToMarkdown(items: readonly HTMLElement[]): string {
  return items.map((item) => {
    const id = item.dataset.footnoteId?.trim() ?? ''
    if (!isValidFootnoteId(id)) return ''

    const clone = item.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.ink-footnote-back, .ink-footnote-backs').forEach(node => node.remove())
    const markdown = Array.from(clone.childNodes)
      .map((child) => nodeToMarkdown(child, 0, false))
      .join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!markdown) return `[^${id}]:`
    const [firstLine, ...restLines] = markdown.split('\n')
    const continuation = restLines.map(line => (line.trim() ? `    ${line}` : '')).join('\n')
    return continuation ? `[^${id}]: ${firstLine}\n${continuation}` : `[^${id}]: ${firstLine}`
  }).filter(Boolean).join('\n')
}

function footnoteSectionToMarkdown(section: HTMLElement): string {
  return footnoteItemsToMarkdown(Array.from(section.querySelectorAll<HTMLElement>('li[data-footnote-id]')))
}

function footnoteListToMarkdown(list: HTMLElement): string {
  const items = Array.from(list.children).filter((child): child is HTMLElement => (
    child instanceof HTMLElement &&
    child.tagName.toLowerCase() === 'li' &&
    isValidFootnoteId(child.dataset.footnoteId?.trim() ?? '')
  ))
  return footnoteItemsToMarkdown(items)
}

function isFootnoteTitleElement(node: Node | undefined): node is HTMLElement {
  return node instanceof HTMLElement && node.classList.contains('ink-footnotes__title')
}

function isOrderedFootnoteList(node: Node | undefined): node is HTMLElement {
  return node instanceof HTMLElement && node.tagName.toLowerCase() === 'ol' && footnoteListToMarkdown(node) !== ''
}

function serializeBodyChildrenToMarkdown(body: HTMLElement): string {
  const parts: string[] = []
  const children = Array.from(body.childNodes)

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]
    const next = children[index + 1]

    if (isFootnoteTitleElement(child) && isOrderedFootnoteList(next)) {
      parts.push(`${footnoteListToMarkdown(next)}\n\n`)
      index += 1
      continue
    }

    parts.push(nodeToMarkdown(child, 0, false))
  }

  return parts.join('')
}

function extractCheckboxState(element: HTMLElement): { task: boolean; checked: boolean } {
  const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement | null
  if (checkbox) {
    return { task: true, checked: checkbox.checked }
  }

  const attrChecked = element.getAttribute('data-checked')
  if (attrChecked === 'true' || attrChecked === 'false') {
    return { task: true, checked: attrChecked === 'true' }
  }

  return { task: false, checked: false }
}

function listToMarkdown(element: HTMLElement, depth: number): string {
  const ordered = element.tagName.toLowerCase() === 'ol'
  const start = Number(element.getAttribute('start') ?? '1')
  const items = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.tagName.toLowerCase() === 'li',
  )

  return items
    .map((item, index) => listItemToMarkdown(item, depth, {
      ordered,
      index: start + index,
      ...extractCheckboxState(item),
    }))
    .join('\n')
}

function listItemToMarkdown(element: HTMLElement, depth: number, context: ListContext): string {
  const indent = '  '.repeat(depth)
  const marker = context.task
    ? `${indent}- [${context.checked ? 'x' : ' '}] `
    : context.ordered
      ? `${indent}${context.index}. `
      : `${indent}- `

  const nestedIndent = `${indent}  `
  const contentParts: string[] = []
  const nestedLists: string[] = []

  Array.from(element.childNodes).forEach((child) => {
    if (child instanceof HTMLElement) {
      const tag = child.tagName.toLowerCase()
      if (tag === 'ul' || tag === 'ol') {
        nestedLists.push(listToMarkdown(child, depth + 1))
        return
      }

      if (tag === 'input' && child.getAttribute('type') === 'checkbox') {
        return
      }
    }

    contentParts.push(nodeToMarkdown(child, depth, true))
  })

  const inlineContent = contentParts.join('').trim() || ''
  const contentLine = prefixMultiline(inlineContent || ' ', marker, nestedIndent)

  if (nestedLists.length === 0) {
    return contentLine
  }

  return `${contentLine}\n${nestedLists.join('\n').trim()}`
}

function blockquoteToMarkdown(element: HTMLElement): string {
  const content = normalizeMarkdown(Array.from(element.childNodes).map((child) => nodeToMarkdown(child, 0, false)).join(''))
  if (!content) {
    return ''
  }

  return content
    .split('\n')
    .map((line) => (line.trim().length > 0 ? `> ${line}` : '>'))
    .join('\n')
}

function detailsToMarkdown(details: HTMLElement, depth: number): string {
  const children = Array.from(details.children)
  const summary = children
    .find((child) => child.tagName.toLowerCase() === 'summary')
    ?.textContent
    ?.trim() || details.getAttribute('data-summary') || '详情'
  const contentElement = children
    .find((child) => child.getAttribute('data-details-content') === 'true')
  const contentNodes = Array.from((contentElement ?? details).childNodes)
    .filter((child) => !(child instanceof HTMLElement && child.tagName.toLowerCase() === 'summary'))
  const content = contentNodes
    .map((child) => nodeToMarkdown(child, depth + 1, false))
    .join('')
    .trim()

  return '<details>\n<summary>' + escapeInlineMarkdown(summary) + '</summary>\n\n' + content + '\n</details>'
}

function tableToMarkdown(element: HTMLElement): string {
  const rows = Array.from(element.querySelectorAll('tr'))
    .map((row) =>
      Array.from(row.children)
        .map((cell) => inlineChildrenToMarkdown(cell).replace(/\|/g, '\\|').trim()),
    )
    .filter((row) => row.length > 0)

  if (rows.length === 0) {
    return ''
  }

  const header = rows[0]
  const separator = header.map(() => '---')
  const body = rows.slice(1)

  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ]

  return lines.join('\n')
}

function nodeToMarkdown(node: Node, depth: number, inlineContext: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    return inlineContext ? escapeInlineMarkdown(text) : text
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  const tag = node.tagName.toLowerCase()
  if (node.classList.contains('ink-footnote-ref')) {
    const id = node.dataset.footnoteId ?? node.querySelector<HTMLElement>('[data-footnote-id]')?.dataset.footnoteId ?? ''
    return isValidFootnoteId(id) ? `[^${id}]` : ''
  }
  if (node.classList.contains('ink-academic-citation')) {
    return serializeCitationElementFromHtml(node)
  }
  if (tag === 'section' && node.classList.contains('ink-footnotes')) {
    const footnotes = footnoteSectionToMarkdown(node)
    return footnotes ? `${footnotes}\n\n` : ''
  }
  if (tag === 'section' && node.classList.contains('ink-bibliography')) {
    return ''
  }

  const inlineContent = inlineChildrenToMarkdown(node)

  switch (tag) {
    case 'p':
      return inlineContext ? inlineContent : `${inlineContent}\n\n`
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(tag.slice(1))
      return `${'#'.repeat(level)} ${inlineContent}\n\n`
    }
    case 'blockquote':
      return `${blockquoteToMarkdown(node)}\n\n`
    case 'pre': {
      const code = node.querySelector('code')
      const codeText = code?.textContent ?? node.textContent ?? ''
      const className = code?.getAttribute('class') ?? node.getAttribute('class') ?? ''
      const languageMatch = className.match(/language-([A-Za-z0-9_-]+)/)
      const language = languageMatch?.[1] ?? ''
      const fence = language ? `\`\`\`${language}` : '```'
      return `${fence}\n${codeText.replace(/\n+$/, '')}\n\`\`\`\n\n`
    }
    case 'ul':
    case 'ol':
      return `${listToMarkdown(node, depth)}\n\n`
    case 'hr':
      return '---\n\n'
    case 'img': {
      const src = node.getAttribute('src') ?? ''
      const assetId = node.getAttribute('data-asset-id') ?? extractInkforgeAssetId(src)
      const stableSrc = assetId ? createInkforgeAssetUrl(assetId) : src
      const alt = escapeInlineMarkdown(node.getAttribute('alt') ?? '')
      const caption = node.getAttribute('data-caption') ?? ''
      const title = caption ? ` "${escapeMarkdownTitle(caption)}"` : ''
      return `![${alt}](${stableSrc}${title})${inlineContext ? '' : '\n\n'}`
    }
    case 'table':
      return `${tableToMarkdown(node)}\n\n`
    case 'details':
      return `${detailsToMarkdown(node, depth)}\n\n`
    case 'summary':
      return ''
    case 'a': {
      const href = node.getAttribute('href') ?? ''
      return href ? `[${inlineContent || href}](${href})` : inlineContent
    }
    case 'strong':
    case 'b':
      return `**${inlineContent}**`
    case 'em':
    case 'i':
      return `*${inlineContent}*`
    case 's':
    case 'strike':
    case 'del':
      return `~~${inlineContent}~~`
    case 'code':
      return inlineContext ? `\`${node.textContent ?? ''}\`` : `\`${node.textContent ?? ''}\`\n\n`
    case 'mark':
      return `==${inlineContent}==`
    case 'sup':
      return `^${inlineContent}^`
    case 'sub':
      return `~${inlineContent}~`
    case 'br':
      return inlineContext ? '  \n' : '\n'
    case 'section':
    case 'article':
    case 'main':
    case 'div':
    case 'span':
    case 'figure':
    case 'figcaption':
      return Array.from(node.childNodes).map((child) => nodeToMarkdown(child, depth, inlineContext)).join('')
    case 'input':
      return ''
    default:
      return Array.from(node.childNodes).map((child) => nodeToMarkdown(child, depth, inlineContext)).join('')
  }
}

export function isLikelyHtmlContent(value: string | null | undefined): boolean {
  if (!value) {
    return false
  }

  return /<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(value) && /<\/([a-z][\w-]*)>/i.test(value)
}

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const normalized = normalizeMarkdown(markdown)
  if (!normalized) {
    return ''
  }

  return renderMarkdownWithLazyOptionalEnhancements(normalized)
}

export function serializeHtmlToMarkdown(value: string): string {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }

  if (!isLikelyHtmlContent(normalized)) {
    return normalizeMarkdown(normalized)
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(normalized, 'text/html')
  const markdown = serializeBodyChildrenToMarkdown(doc.body)

  return normalizeMarkdown(markdown)
}

export const TyporaMode = Extension.create<TyporaModeOptions>({
  name: 'typoraMode',

  addOptions() {
    return { ...DEFAULT_OPTIONS }
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
      activeLine: { ...EMPTY_ACTIVE_LINE },
      lastUpdatedAt: 0,
    } satisfies TyporaModeStorage
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options
    const storage = this.storage as TyporaModeStorage

    return [
      new Plugin<TyporaActiveLine>({
        key: typoraPluginKey,

        state: {
          init(_, state) {
            return computeActiveLine(state)
          },

          apply(transaction, value, _oldState, newState) {
            if (!transaction.docChanged && !transaction.selectionSet && !transaction.getMeta(TYPORA_MODE_REFRESH_META)) {
              return value
            }

            return computeActiveLine(newState)
          },
        },

        props: {
          decorations(state) {
            if (!extensionOptions.enabled) {
              return DecorationSet.empty
            }

            const activeLine = typoraPluginKey.getState(state)
            if (!activeLine || activeLine.from === activeLine.to) {
              return DecorationSet.empty
            }

            return DecorationSet.create(state.doc, [
              Decoration.node(activeLine.from, activeLine.to, {
                class: extensionOptions.activeLineClass,
                'data-typora-block-token': activeLine.blockToken,
                'data-typora-inline-tokens': activeLine.inlineTokens.join(' '),
                'data-typora-node': activeLine.nodeName,
              }),
            ])
          },
        },

        view(view) {
          const updateStorage = (state: EditorState) => {
            const nextState = typoraPluginKey.getState(state) ?? { ...EMPTY_ACTIVE_LINE }
            storage.enabled = extensionOptions.enabled
            storage.activeLine = nextState
            storage.lastUpdatedAt = Date.now()

            const root = view.dom as HTMLElement | null
            syncDomMetadata(root, nextState, extensionOptions.enabled)
          }

          updateStorage(view.state)

          return {
            update(nextView, prevState) {
              if (
                prevState.selection.eq(nextView.state.selection) &&
                prevState.doc.eq(nextView.state.doc) &&
                storage.enabled === extensionOptions.enabled
              ) {
                return
              }

              updateStorage(nextView.state)
            },

            destroy() {
              syncDomMetadata(view.dom as HTMLElement | null, { ...EMPTY_ACTIVE_LINE }, false)
            },
          }
        },
      }),
    ]
  },
})
