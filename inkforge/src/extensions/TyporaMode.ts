import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export interface TyporaModeOptions {
  enabled: boolean
}

const pluginKey = new PluginKey('typoraMode')

function applyTyporaState(view: EditorView, enabled: boolean): void {
  const dom = view.dom as HTMLElement
  const parent = dom.closest('.editor-paper') as HTMLElement | null
  const selection = view.state.selection
  const activeNode = selection.$from.parent.type.name

  dom.classList.toggle('is-typora-mode', enabled)
  dom.dataset.typoraMode = enabled ? 'true' : 'false'
  dom.dataset.activeNode = activeNode

  if (parent) {
    parent.classList.toggle('editor-paper--typora', enabled)
    parent.dataset.activeNode = activeNode
  }
}

export const TyporaMode = Extension.create<TyporaModeOptions>({
  name: 'typoraMode',

  addOptions() {
    return {
      enabled: true,
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        view: (view) => {
          applyTyporaState(view, this.options.enabled)

          return {
            update: (updatedView) => {
              applyTyporaState(updatedView, this.options.enabled)
            },
            destroy: () => {
              const dom = view.dom as HTMLElement
              dom.classList.remove('is-typora-mode')
              delete dom.dataset.typoraMode
              delete dom.dataset.activeNode
            },
          }
        },
      }),
    ]
  },
})
