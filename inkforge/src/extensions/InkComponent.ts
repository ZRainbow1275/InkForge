import { mergeAttributes, Node } from '@tiptap/core'
import {
  parseWritingComponentSource,
  renderWritingComponentVisualBody,
  type WritingComponentProp,
} from '@/services/writing-components'

const COMPONENT_SUMMARY_VALUE_LIMIT = 72

function compactComponentText(value: string, limit = COMPONENT_SUMMARY_VALUE_LIMIT): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (!compact) return '""'
  return compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact
}

function summarizeComponentProp(value: WritingComponentProp): string {
  if (Array.isArray(value)) return compactComponentText(value.join(' / '))
  return compactComponentText(String(value))
}

function summarizeComponentPayload(source: string): {
  summary: string
  issues: string[]
  status?: string
  componentId?: string
  label?: string
} {
  const parsed = parseWritingComponentSource(source)
  const sourceSummary = compactComponentText(source, 120)
  if (!parsed) return { summary: sourceSummary, issues: [] }

  const props = parsed.node?.props
  if (!props) {
    return {
      summary: sourceSummary,
      issues: parsed.issues,
      status: parsed.status,
      componentId: parsed.definition?.id,
      label: parsed.definition?.label,
    }
  }

  const fieldLabels = new Map(
    parsed.definition?.fields.map(field => [field.key, field.label] as const) ?? [],
  )
  const definitionKeys = parsed.definition?.fields
    .map(field => field.key)
    .filter(key => Object.prototype.hasOwnProperty.call(props, key)) ?? []
  const extraKeys = Object.keys(props).filter(key => !definitionKeys.includes(key))
  const keys = [...definitionKeys, ...extraKeys]
  const entries = keys.slice(0, 3).map((key) => (
    `${fieldLabels.get(key) ?? key}：${summarizeComponentProp(props[key])}`
  ))
  const remaining = keys.length - entries.length

  return {
    summary: entries.length > 0
      ? `${entries.join(' · ')}${remaining > 0 ? ` · 另 ${remaining} 项` : ''}`
      : sourceSummary,
    issues: parsed.issues,
    status: parsed.status,
    componentId: parsed.node?.componentId ?? parsed.definition?.id,
    label: parsed.definition?.label,
  }
}

export interface InkComponentOptions {
  HTMLAttributes: Record<string, unknown>
  onEditRequested?: (source: string, position: number | null) => void
}

export const InkComponent = Node.create<InkComponentOptions>({
  name: 'inkComponent',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      onEditRequested: undefined,
    }
  },

  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: element => element.getAttribute('data-ink-component-source') ?? '',
        renderHTML: attributes => ({ 'data-ink-component-source': attributes.source }),
      },
      componentId: {
        default: 'Unknown',
        parseHTML: element => element.getAttribute('data-ink-component-id') ?? 'Unknown',
        renderHTML: attributes => ({ 'data-ink-component-id': attributes.componentId }),
      },
      label: {
        default: '未知组件',
        parseHTML: element => element.getAttribute('data-ink-component-label') ?? '未知组件',
        renderHTML: attributes => ({ 'data-ink-component-label': attributes.label }),
      },
      status: {
        default: 'unknown',
        parseHTML: element => element.getAttribute('data-ink-component-status') ?? 'unknown',
        renderHTML: attributes => ({ 'data-ink-component-status': attributes.status }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-ink-component-source]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      class: 'ink-component-node',
    })]
  },

  addNodeView() {
    const onEditRequested = this.options.onEditRequested
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('section')
      dom.className = 'ink-component-card'
      dom.contentEditable = 'false'

      const render = () => {
        const source = String(node.attrs.source || '')
        const payload = summarizeComponentPayload(source)
        const componentId = payload.componentId
          ?? String(node.attrs.componentId || 'Unknown')
        const label = payload.label
          ?? String(node.attrs.label || componentId || '未知组件')
        const status = payload.status
          ?? String(node.attrs.status || 'unknown')
        const issueText = payload.issues.slice(0, 2).join('；')
        const statusText = issueText || (status === 'ready' ? '已通过组件校验' : `状态：${status}`)
        const visualBody = status === 'ready'
          ? renderWritingComponentVisualBody(source)
          : null

        dom.dataset.inkComponentSource = source
        dom.dataset.inkComponentId = componentId
        dom.dataset.inkComponentLabel = label
        dom.dataset.inkComponentStatus = status
        dom.classList.toggle('has-error', status !== 'ready')
        dom.setAttribute('role', 'group')
        dom.setAttribute('aria-label', `${label}，${componentId}，${statusText}`)
        if (status === 'ready') {
          dom.removeAttribute('aria-invalid')
        } else {
          dom.setAttribute('aria-invalid', 'true')
        }
        dom.replaceChildren()

        const chrome = document.createElement('div')
        chrome.className = 'ink-component-card__chrome'
        const copy = document.createElement('div')
        copy.className = 'ink-component-card__copy'
        const header = document.createElement('div')
        header.className = 'ink-component-card__header'
        const type = document.createElement('code')
        type.className = 'ink-component-card__type'
        type.textContent = componentId
        const title = document.createElement('strong')
        title.textContent = label
        header.append(type, title)
        const summary = document.createElement('p')
        summary.className = 'ink-component-card__summary'
        summary.textContent = payload.summary
        const meta = document.createElement('small')
        meta.className = 'ink-component-card__status'
        meta.textContent = statusText
        copy.append(header, summary, meta)
        chrome.append(copy)

        if (onEditRequested) {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'ink-component-card__edit'
          button.textContent = '编辑'
          button.setAttribute('aria-label', `编辑${label}`)
          button.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            const position = typeof getPos === 'function' ? getPos() : null
            onEditRequested(source, typeof position === 'number' ? position : null)
          })
          chrome.append(button)
        }

        dom.append(chrome)

        if (visualBody) {
          const visual = document.createElement('div')
          visual.className = 'ink-component-card__visual'
          visual.innerHTML = visualBody
          visual.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
            link.tabIndex = -1
            link.setAttribute('aria-disabled', 'true')
            link.draggable = false
          })
          const getVisualLink = (target: EventTarget | null): HTMLAnchorElement | null => (
            target instanceof Element ? target.closest<HTMLAnchorElement>('a') : null
          )
          visual.addEventListener('pointerdown', (event) => {
            if (!getVisualLink(event.target)) return
            event.preventDefault()
            const position = typeof getPos === 'function' ? getPos() : null
            if (typeof position === 'number') editor.commands.setNodeSelection(position)
          })
          visual.addEventListener('click', (event) => {
            if (!getVisualLink(event.target)) return
            event.preventDefault()
            event.stopPropagation()
          })
          visual.addEventListener('keydown', (event) => {
            if (!getVisualLink(event.target) || !['Enter', ' '].includes(event.key)) return
            event.preventDefault()
            event.stopPropagation()
          })
          dom.append(visual)
        }
      }

      render()
      return {
        dom,
        selectNode: () => dom.classList.add('is-selected'),
        deselectNode: () => dom.classList.remove('is-selected'),
        update: updatedNode => {
          if (updatedNode.type.name !== this.name) return false
          node = updatedNode
          render()
          return true
        },
        stopEvent: event => (
          event.target instanceof Element
          && Boolean(event.target.closest('.ink-component-card__edit'))
        ),
        ignoreMutation: () => true,
      }
    }
  },
})
