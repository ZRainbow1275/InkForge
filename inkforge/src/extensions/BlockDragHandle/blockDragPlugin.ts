import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { createDropIndicatorDecorations } from './decorations'
import { createMoveTopLevelBlockTransaction, getTopLevelBlockRanges, isSupportedDraggableBlock } from './moveBlock'
import type { BlockDragHandleOptions, BlockDragPluginMeta, BlockDragPluginState, BlockInfo, DropTarget } from './types'

export const blockDragPluginKey = new PluginKey<BlockDragPluginState>('inkforgeBlockDragHandle')

const BLOCK_DRAG_MIME = 'application/x-inkforge-block-drag'
const GRIP_VERTICAL_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>'
const EMPTY_PLUGIN_STATE: BlockDragPluginState = {
  dropTarget: null,
  draggingPos: null,
}

function readPluginMeta(tr: Transaction): BlockDragPluginMeta | undefined {
  return tr.getMeta(blockDragPluginKey) as BlockDragPluginMeta | undefined
}

function getTopLevelBlockInfo(view: EditorView, blockPos: number): BlockInfo | null {
  const node = view.state.doc.nodeAt(blockPos)
  if (!node || !isSupportedDraggableBlock(node)) {
    return null
  }

  const dom = view.nodeDOM(blockPos)
  if (!(dom instanceof HTMLElement)) {
    return null
  }

  return { pos: blockPos, node, dom }
}

function getTopLevelBlockAtResolvedCoords(view: EditorView, coords: { x: number; y: number }): BlockInfo | null {
  const resolvedCoords = view.posAtCoords({ left: coords.x, top: coords.y })
  if (!resolvedCoords) {
    return null
  }

  const safePos = Math.min(Math.max(resolvedCoords.pos, 0), view.state.doc.content.size)
  const $pos = view.state.doc.resolve(safePos)
  if ($pos.depth < 1) {
    return null
  }

  return getTopLevelBlockInfo(view, $pos.before(1))
}

function getTopLevelBlockAtDomPoint(view: EditorView, coords: { x: number; y: number }): BlockInfo | null {
  let element = document.elementFromPoint(coords.x, coords.y)

  while (element instanceof HTMLElement && view.dom.contains(element)) {
    try {
      const domPos = view.posAtDOM(element, 0)
      const safePos = Math.min(Math.max(domPos, 0), view.state.doc.content.size)
      const $pos = view.state.doc.resolve(safePos)

      if ($pos.depth >= 1) {
        const block = getTopLevelBlockInfo(view, $pos.before(1))
        if (block) {
          return block
        }
      }
    } catch {
      // Some decoration DOM nodes are not addressable by ProseMirror. Walk upward.
    }

    element = element.parentElement
  }

  return null
}

function getNearestTopLevelBlockByVerticalPosition(view: EditorView, coords: { x: number; y: number }): BlockInfo | null {
  const editorRect = view.dom.getBoundingClientRect()
  const isNearEditor = coords.x >= editorRect.left - 64
    && coords.x <= editorRect.right + 64
    && coords.y >= editorRect.top - 32
    && coords.y <= editorRect.bottom + 32

  if (!isNearEditor) {
    return null
  }

  let lastBlock: BlockInfo | null = null

  for (const range of getTopLevelBlockRanges(view.state.doc)) {
    const block = getTopLevelBlockInfo(view, range.pos)
    if (!block) {
      continue
    }

    const rect = block.dom.getBoundingClientRect()
    if (coords.y < rect.top + rect.height / 2) {
      return block
    }

    lastBlock = block
  }

  return lastBlock
}

function getTopLevelBlockAt(view: EditorView, coords: { x: number; y: number }): BlockInfo | null {
  return getTopLevelBlockAtResolvedCoords(view, coords)
    ?? getTopLevelBlockAtDomPoint(view, coords)
    ?? getNearestTopLevelBlockByVerticalPosition(view, coords)
}

function createHandleElement(): HTMLButtonElement {
  const handle = document.createElement('button')
  handle.type = 'button'
  handle.className = 'block-drag-handle'
  handle.draggable = true
  handle.tabIndex = -1
  handle.setAttribute('aria-label', '拖拽移动此块')
  handle.setAttribute('data-visible', 'false')
  handle.innerHTML = GRIP_VERTICAL_SVG
  return handle
}

function createGhostElement(sourceDom: HTMLElement): HTMLElement {
  const ghost = sourceDom.cloneNode(true) as HTMLElement
  ghost.classList.add('block-drag-ghost')
  ghost.style.width = `${sourceDom.offsetWidth}px`
  ghost.style.maxWidth = `${sourceDom.offsetWidth}px`
  document.body.appendChild(ghost)
  return ghost
}

function hasInkforgeDragData(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(BLOCK_DRAG_MIME)
}

function setTransientPluginState(view: EditorView, meta: BlockDragPluginMeta): void {
  view.dispatch(
    view.state.tr
      .setMeta(blockDragPluginKey, meta)
      .setMeta('addToHistory', false),
  )
}

class BlockDragController {
  private readonly handle: HTMLButtonElement
  private currentBlock: BlockInfo | null = null
  private handleBlock: BlockInfo | null = null
  private sourceBlock: BlockInfo | null = null
  private dropTarget: DropTarget | null = null
  private ghostElement: HTMLElement | null = null
  private showTimer: ReturnType<typeof window.setTimeout> | null = null
  private hideTimer: ReturnType<typeof window.setTimeout> | null = null
  private lastMouseMoveAt = 0

  constructor(
    private readonly view: EditorView,
    private readonly options: BlockDragHandleOptions,
  ) {
    this.handle = createHandleElement()
    this.handle.addEventListener('mousedown', this.handleMouseDown)
    this.handle.addEventListener('dragstart', this.handleDragStart)
    this.handle.addEventListener('dragend', this.handleDragEnd)
    this.mountHandle()
  }

  handleMouseMove = (view: EditorView, event: MouseEvent): boolean => {
    if (!this.options.enabled()) {
      this.hideNow()
      return false
    }

    const now = window.performance.now()
    if (now - this.lastMouseMoveAt < this.options.mouseThrottleMs) {
      return false
    }
    this.lastMouseMoveAt = now

    const block = getTopLevelBlockAt(view, { x: event.clientX, y: event.clientY })
    if (!block) {
      this.scheduleHide()
      return false
    }

    if (this.currentBlock?.pos === block.pos && this.handle.dataset.visible === 'true') {
      this.currentBlock = block
      this.handleBlock = block
      this.positionHandle(block.dom)
      return false
    }

    this.currentBlock = block
    this.scheduleShow(block)
    return false
  }

  handleMouseLeave = (): boolean => {
    this.scheduleHide()
    return false
  }

  handleDragOver = (view: EditorView, event: DragEvent): boolean => {
    if (!this.sourceBlock || !hasInkforgeDragData(event)) {
      return false
    }

    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }

    this.updateDropTarget(this.resolveDropTarget(view, event))
    return true
  }

  handleDrop = (view: EditorView, event: DragEvent): boolean => {
    if (!this.sourceBlock || !hasInkforgeDragData(event)) {
      return false
    }

    event.preventDefault()
    const dropTarget = this.resolveDropTarget(view, event) ?? this.dropTarget
    if (!dropTarget) {
      this.cleanupDrag(view)
      return true
    }

    const move = createMoveTopLevelBlockTransaction(
      view.state,
      this.sourceBlock.pos,
      dropTarget.pos,
      dropTarget.side,
    )

    if (!move) {
      this.cleanupDrag(view)
      return true
    }

    view.dispatch(move.tr.setMeta(blockDragPluginKey, { dropTarget: null, draggingPos: null } satisfies BlockDragPluginMeta))
    this.cleanupDrag(view)
    return true
  }

  handleNativeDragEnd = (view: EditorView): boolean => {
    this.cleanupDrag(view)
    return false
  }

  handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
    if (event.key !== 'Escape' || !this.sourceBlock) {
      return false
    }

    event.preventDefault()
    this.cleanupDrag(view)
    return true
  }

  destroy(): void {
    this.clearTimers()
    this.cleanupDrag(this.view)
    this.handle.removeEventListener('mousedown', this.handleMouseDown)
    this.handle.removeEventListener('dragstart', this.handleDragStart)
    this.handle.removeEventListener('dragend', this.handleDragEnd)
    this.handle.remove()
  }

  private mountHandle(): void {
    const parent = this.view.dom.parentElement
    if (!parent) {
      return
    }

    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative'
    }

    parent.appendChild(this.handle)
  }

  private scheduleShow(block: BlockInfo): void {
    if (this.showTimer) {
      window.clearTimeout(this.showTimer)
    }
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer)
      this.hideTimer = null
    }

    this.showTimer = window.setTimeout(() => {
      if (this.currentBlock?.pos !== block.pos || !this.options.enabled()) {
        return
      }
      this.handleBlock = block
      this.positionHandle(block.dom)
      this.handle.dataset.visible = 'true'
    }, this.options.showDelay)
  }

  private scheduleHide(): void {
    if (this.sourceBlock) {
      return
    }

    if (this.showTimer) {
      window.clearTimeout(this.showTimer)
      this.showTimer = null
    }
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer)
    }

    this.hideTimer = window.setTimeout(() => this.hideNow(), this.options.hideDelay)
  }

  private hideNow(): void {
    if (this.sourceBlock) {
      return
    }
    this.currentBlock = null
    this.handleBlock = null
    this.handle.dataset.visible = 'false'
  }

  private positionHandle(dom: HTMLElement): void {
    const parent = this.handle.offsetParent
    if (!(parent instanceof HTMLElement)) {
      return
    }

    const blockRect = dom.getBoundingClientRect()
    const parentRect = parent.getBoundingClientRect()
    this.handle.style.left = `${blockRect.left - parentRect.left - 30}px`
    this.handle.style.top = `${blockRect.top - parentRect.top + Math.max(0, Math.min(8, blockRect.height / 2 - 12))}px`
  }

  private clearTimers(): void {
    if (this.showTimer) {
      window.clearTimeout(this.showTimer)
      this.showTimer = null
    }
    if (this.hideTimer) {
      window.clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }

  private resolveDropTarget(view: EditorView, event: DragEvent): DropTarget | null {
    if (!this.sourceBlock) {
      return null
    }

    const block = getTopLevelBlockAt(view, { x: event.clientX, y: event.clientY })
    if (!block) {
      return null
    }

    const rect = block.dom.getBoundingClientRect()
    const side = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
    const canMove = createMoveTopLevelBlockTransaction(view.state, this.sourceBlock.pos, block.pos, side)

    return canMove ? { pos: block.pos, side, dom: block.dom } : null
  }

  private updateDropTarget(target: DropTarget | null): void {
    if (this.dropTarget?.pos === target?.pos && this.dropTarget?.side === target?.side) {
      return
    }

    this.dropTarget = target
    setTransientPluginState(this.view, {
      dropTarget: target ? { pos: target.pos, side: target.side } : null,
      draggingPos: this.sourceBlock?.pos ?? null,
    })
  }

  private cleanupDrag(view: EditorView): void {
    this.ghostElement?.remove()
    this.ghostElement = null
    this.sourceBlock?.dom.classList.remove('block-drag-source')
    this.sourceBlock = null
    this.dropTarget = null
    setTransientPluginState(view, { dropTarget: null, draggingPos: null })
    this.scheduleHide()
  }

  private handleMouseDown = (event: MouseEvent): void => {
    const block = this.handleBlock ?? this.currentBlock
    if (!block || !this.options.enabled()) {
      return
    }

    this.currentBlock = block
    event.stopPropagation()
    this.view.focus()
  }

  private handleDragStart = (event: DragEvent): void => {
    const block = this.handleBlock ?? this.currentBlock
    if (!block || !event.dataTransfer || !this.options.enabled()) {
      event.preventDefault()
      return
    }

    this.currentBlock = block
    this.sourceBlock = block
    this.sourceBlock.dom.classList.add('block-drag-source')
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(BLOCK_DRAG_MIME, JSON.stringify({ pos: this.sourceBlock.pos, nodeType: this.sourceBlock.node.type.name }))
    this.ghostElement = createGhostElement(this.sourceBlock.dom)
    event.dataTransfer.setDragImage(this.ghostElement, 8, 8)
    setTransientPluginState(this.view, { draggingPos: this.sourceBlock.pos, dropTarget: null })
  }

  private handleDragEnd = (): void => {
    this.cleanupDrag(this.view)
  }
}

export function createBlockDragPlugin(options: BlockDragHandleOptions): Plugin<BlockDragPluginState> {
  let controller: BlockDragController | null = null

  return new Plugin<BlockDragPluginState>({
    key: blockDragPluginKey,

    state: {
      init: () => EMPTY_PLUGIN_STATE,
      apply(tr, previousState) {
        const meta = readPluginMeta(tr)
        if (meta) {
          return {
            dropTarget: meta.dropTarget === undefined ? previousState.dropTarget : meta.dropTarget,
            draggingPos: meta.draggingPos === undefined ? previousState.draggingPos : meta.draggingPos,
          }
        }

        if (tr.docChanged) {
          return EMPTY_PLUGIN_STATE
        }

        return previousState
      },
    },

    props: {
      decorations(state) {
        const pluginState = blockDragPluginKey.getState(state) ?? EMPTY_PLUGIN_STATE
        return createDropIndicatorDecorations(state.doc, pluginState.dropTarget)
      },
      handleDOMEvents: {
        mousemove(view, event) {
          return controller?.handleMouseMove(view, event) ?? false
        },
        mouseleave() {
          return controller?.handleMouseLeave() ?? false
        },
        dragover(view, event) {
          return controller?.handleDragOver(view, event) ?? false
        },
        drop(view, event) {
          return controller?.handleDrop(view, event) ?? false
        },
        dragend(view) {
          return controller?.handleNativeDragEnd(view) ?? false
        },
        keydown(view, event) {
          return controller?.handleKeyDown(view, event) ?? false
        },
      },
    },

    view(view) {
      controller = new BlockDragController(view, options)
      return {
        update(nextView) {
          if (!options.enabled()) {
            controller?.handleMouseLeave()
          }
          if (nextView.state.doc !== view.state.doc) {
            controller?.handleMouseLeave()
          }
        },
        destroy() {
          controller?.destroy()
          controller = null
        },
      }
    },
  })
}
