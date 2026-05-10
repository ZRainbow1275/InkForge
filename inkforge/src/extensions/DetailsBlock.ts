import { Node, mergeAttributes } from '@tiptap/core'

export interface DetailsBlockOptions {
  HTMLAttributes: Record<string, string>
}

export const DetailsBlock = Node.create<DetailsBlockOptions>({
  name: 'detailsBlock',

  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      summary: {
        default: '详情',
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-summary')
          ?? Array.from(element.children)
            .find((child) => child.tagName.toLowerCase() === 'summary')
            ?.textContent
            ?.trim()
          ?? '详情',
        renderHTML: (attributes: { summary?: string }) => ({
          'data-summary': attributes.summary ?? '详情',
        }),
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'details' },
      { tag: 'div[data-inkforge-details]' },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const summary = typeof node.attrs.summary === 'string' && node.attrs.summary.trim()
      ? node.attrs.summary
      : '详情'

    return [
      'details',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-inkforge-details': 'true',
      }),
      ['summary', summary],
      ['div', { 'data-details-content': 'true' }, 0],
    ]
  },
})
