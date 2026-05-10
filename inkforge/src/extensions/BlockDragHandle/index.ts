import { Extension } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import { createBlockDragPlugin } from './blockDragPlugin'
import { moveCurrentTopLevelBlock } from './moveBlock'
import type { BlockDragHandleOptions } from './types'

export { blockDragPluginKey } from './blockDragPlugin'
export {
  createMoveTopLevelBlockTransaction,
  findTopLevelBlockRange,
  getTopLevelBlockRanges,
  isSupportedDraggableBlock,
  moveCurrentTopLevelBlock,
  resolveCurrentTopLevelBlock,
  SUPPORTED_BLOCK_NODE_TYPES,
} from './moveBlock'
export type { BlockDragHandleOptions, BlockDropSide, BlockInfo, DropTarget } from './types'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockDragHandle: {
      moveBlockUp: () => ReturnType
      moveBlockDown: () => ReturnType
    }
  }
}

export const BlockDragHandle = Extension.create<BlockDragHandleOptions>({
  name: 'blockDragHandle',

  addOptions() {
    return {
      showDelay: 200,
      hideDelay: 400,
      mouseThrottleMs: 33,
      enabled: () => true,
    }
  },

  addCommands() {
    return {
      moveBlockUp: () => ({ state, dispatch }) => moveCurrentTopLevelBlock(state, dispatch as ((tr: Transaction) => void) | undefined, 'up'),
      moveBlockDown: () => ({ state, dispatch }) => moveCurrentTopLevelBlock(state, dispatch as ((tr: Transaction) => void) | undefined, 'down'),
    }
  },

  addKeyboardShortcuts() {
    return {
      'Alt-ArrowUp': () => this.editor.commands.moveBlockUp(),
      'Alt-ArrowDown': () => this.editor.commands.moveBlockDown(),
    }
  },

  addProseMirrorPlugins() {
    return [createBlockDragPlugin(this.options)]
  },
})
