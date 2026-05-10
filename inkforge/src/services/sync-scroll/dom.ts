export function getScrollMax(element: HTMLElement): number {
  return Math.max(0, element.scrollHeight - element.clientHeight)
}

export function clampScrollTop(value: number, maxScrollTop: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(0, value), Math.max(0, maxScrollTop))
}

function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement
}

export function getElementScrollOffset(element: Element, container: HTMLElement): number {
  if (isHTMLElement(element)) {
    let offset = 0
    let current: HTMLElement | null = element
    while (current && current !== container) {
      offset += current.offsetTop
      current = current.offsetParent as HTMLElement | null
    }
    if (current === container) {
      return offset
    }
  }

  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return elementRect.top - containerRect.top + container.scrollTop
}

export function setScrollTopImmediate(element: HTMLElement, value: number): void {
  const previousBehavior = element.style.scrollBehavior
  const target = clampScrollTop(value, getScrollMax(element))
  element.style.scrollBehavior = 'auto'
  element.scrollTop = target
  element.style.scrollBehavior = previousBehavior
}

function escapeCssIdentifier(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
}

export function queryElementById(root: HTMLElement, id: string): Element | null {
  return root.querySelector(`#${escapeCssIdentifier(id)}`)
}