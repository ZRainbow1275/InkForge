import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { BlockDropSide } from './types'

export function createDropIndicatorDecorations(
  doc: ProseMirrorNode,
  dropTarget: { pos: number; side: BlockDropSide } | null,
): DecorationSet {
  if (!dropTarget) {
    return DecorationSet.empty
  }

  if (dropTarget.pos < 0 || dropTarget.pos > doc.content.size) {
    return DecorationSet.empty
  }

  const targetNode = doc.nodeAt(dropTarget.pos)
  if (!targetNode) {
    return DecorationSet.empty
  }

  const widgetPos = dropTarget.side === 'before'
    ? dropTarget.pos
    : dropTarget.pos + targetNode.nodeSize

  const indicator = Decoration.widget(
    widgetPos,
    () => {
      const element = document.createElement('div')
      element.className = 'block-drag-insert-line'
      element.setAttribute('aria-hidden', 'true')
      return element
    },
    {
      key: `block-drag-insert-${dropTarget.pos}-${dropTarget.side}`,
      side: dropTarget.side === 'before' ? -1 : 1,
    },
  )

  return DecorationSet.create(doc, [indicator])
}
