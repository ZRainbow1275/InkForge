import DOMPurify from 'dompurify'

export const PUBLISH_COPY_ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's', 'del', 'ins',
  'a', 'img', 'br', 'hr',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div', 'section', 'sup', 'sub', 'mark',
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line',
  'polyline', 'polygon', 'text', 'tspan', 'animate',
  'animateTransform', 'animatetransform', 'set',
] as const

export const PUBLISH_COPY_ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'style',
  'data-ink-svg', 'data-ink-block', 'data-ink-role', 'data-ink-module',
  'xmlns', 'viewBox', 'viewbox', 'width', 'height',
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'd', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'opacity', 'fill-opacity',
  'stroke-opacity', 'font-size', 'font-family', 'font-weight',
  'letter-spacing', 'text-anchor', 'dominant-baseline', 'transform',
  'attributeName', 'attributename', 'attributeType', 'attributetype',
  'type', 'begin', 'dur', 'from', 'to', 'values',
  'keyTimes', 'keytimes', 'keySplines', 'keysplines',
  'calcMode', 'calcmode', 'repeatCount', 'repeatcount', 'restart',
] as const

export function sanitizePublishRichCopyHtml(html: string): string {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...PUBLISH_COPY_ALLOWED_TAGS],
    ALLOWED_ATTR: [...PUBLISH_COPY_ALLOWED_ATTR],
    ALLOW_DATA_ATTR: true,
    SAFE_FOR_XML: true,
  })

  if (typeof document === 'undefined') {
    return sanitized
  }

  const template = document.createElement('template')
  template.innerHTML = sanitized

  template.content
    .querySelectorAll('script, style, foreignObject, foreignobject')
    .forEach(node => node.remove())

  template.content.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith('on') || /^javascript:/i.test(value)) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  return template.innerHTML
}
