import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  breaks: true,
  gfm: true,
})

function renderInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  const content = Array.from(node.childNodes).map(renderInline).join('')
  const tag = node.tagName.toLowerCase()

  switch (tag) {
    case 'strong':
    case 'b':
      return `**${content}**`
    case 'em':
    case 'i':
      return `*${content}*`
    case 's':
    case 'strike':
    case 'del':
      return `~~${content}~~`
    case 'code':
      return `\`${content}\``
    case 'a': {
      const href = node.getAttribute('href') ?? ''
      return href ? `[${content || href}](${href})` : content
    }
    case 'br':
      return '  \n'
    case 'img': {
      const alt = node.getAttribute('alt') ?? ''
      const src = node.getAttribute('src') ?? ''
      return src ? `![${alt}](${src})` : ''
    }
    default:
      return content
  }
}

function renderList(list: HTMLElement, depth = 0): string {
  const ordered = list.tagName.toLowerCase() === 'ol'
  const items = Array.from(list.children).filter((child): child is HTMLElement => child instanceof HTMLElement)

  return items
    .map((item, index) => {
      const prefix = ordered ? `${index + 1}. ` : '- '
      const indent = '  '.repeat(depth)
      const fragments: string[] = []

      Array.from(item.childNodes).forEach((child) => {
        if (!(child instanceof HTMLElement) || !['ul', 'ol'].includes(child.tagName.toLowerCase())) {
          fragments.push(renderInline(child))
          return
        }

        const nested = renderList(child, depth + 1)
        if (nested.trim()) {
          fragments.push(`\n${nested}`)
        }
      })

      const main = fragments.join('').trim()
      const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement | null
      const marker = checkbox ? `[${checkbox.checked ? 'x' : ' '}] ` : ''
      return `${indent}${prefix}${marker}${main}`.trimEnd()
    })
    .join('\n')
}

function renderTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length === 0) {
    return ''
  }

  const matrix = rows.map((row) => {
    const cells = Array.from(row.children).filter((cell): cell is HTMLElement => cell instanceof HTMLElement)
    return cells.map((cell) => renderInline(cell).replace(/\n+/g, ' ').trim())
  })

  const header = matrix[0] ?? []
  const separator = header.map(() => '---')
  const body = matrix.slice(1)
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ]

  return lines.join('\n')
}

function renderBlock(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').trim()
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  const tag = node.tagName.toLowerCase()

  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(tag.slice(1))
      return `${'#'.repeat(level)} ${Array.from(node.childNodes).map(renderInline).join('').trim()}`
    }
    case 'p':
      return Array.from(node.childNodes).map(renderInline).join('').trim()
    case 'blockquote': {
      const text = Array.from(node.childNodes).map(renderBlock).join('\n').trim()
      return text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    }
    case 'ul':
    case 'ol':
      return renderList(node)
    case 'pre': {
      const code = node.querySelector('code')
      const raw = code?.textContent ?? node.textContent ?? ''
      const className = code?.getAttribute('class') ?? ''
      const language = className.match(/language-([\w-]+)/)?.[1] ?? ''
      return `\`\`\`${language}\n${raw.trimEnd()}\n\`\`\``
    }
    case 'hr':
      return '---'
    case 'table':
      return renderTable(node)
    case 'img':
      return renderInline(node)
    case 'figure':
    case 'section':
    case 'article':
    case 'div':
      return Array.from(node.childNodes).map(renderBlock).filter(Boolean).join('\n\n')
    default:
      return Array.from(node.childNodes).map(renderInline).join('').trim()
  }
}

export function markdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown || '') as string
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['section'],
    ADD_ATTR: ['data-tool'],
  })
}

export function htmlToMarkdown(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) {
    return ''
  }

  if (typeof DOMParser === 'undefined') {
    return trimmed.replace(/<[^>]+>/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  }

  const parser = new DOMParser()
  const documentNode = parser.parseFromString(trimmed, 'text/html')
  const blocks = Array.from(documentNode.body.childNodes)
    .map(renderBlock)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}
