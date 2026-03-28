import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

function createHint(text: string, className: string): HTMLElement {
    const element = document.createElement('span')
    element.className = className
    element.textContent = text
    return element
}

function hasMark(
    node: { marks?: ReadonlyArray<{ type: { name: string } }> } | null,
    markName: string
): boolean {
    return node?.marks?.some((mark) => mark.type.name === markName) ?? false
}

export const MarkdownHints = Extension.create({
    name: 'markdownHints',

    addOptions() {
        return {
            enabled: true,
            className: 'md-hint',
            cursorAware: true,
        }
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('markdownHints'),
                props: {
                    decorations: (state) => {
                        if (!this.options.enabled) {
                            return DecorationSet.empty
                        }

                        const decorations: Decoration[] = []
                        const className = this.options.className
                        const { from } = state.selection

                        const isActiveNode = (pos: number, nodeSize: number): boolean => {
                            if (!this.options.cursorAware) {
                                return false
                            }
                            return from >= pos && from <= pos + nodeSize
                        }

                        state.doc.descendants((node, pos, parent, index) => {
                            if (node.type.name === 'blockquote' && !isActiveNode(pos, node.nodeSize)) {
                                decorations.push(
                                    Decoration.widget(
                                        pos + 1,
                                        () => createHint('> ', className),
                                        { side: -1 }
                                    )
                                )
                            }

                            if (node.type.name === 'codeBlock' && !isActiveNode(pos, node.nodeSize)) {
                                const language = typeof node.attrs.language === 'string' ? node.attrs.language : ''
                                decorations.push(
                                    Decoration.widget(
                                        pos + 1,
                                        () => createHint(`\`\`\`${language}\n`, className),
                                        { side: -1 }
                                    )
                                )
                                decorations.push(
                                    Decoration.widget(
                                        pos + node.nodeSize - 1,
                                        () => createHint('\n```', className),
                                        { side: 1 }
                                    )
                                )
                            }

                            if (node.type.name === 'horizontalRule') {
                                decorations.push(
                                    Decoration.widget(
                                        pos,
                                        () => createHint('---', className),
                                        { side: -1 }
                                    )
                                )
                            }

                            if (node.type.name === 'image' && !isActiveNode(pos, node.nodeSize)) {
                                const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : ''
                                const src = typeof node.attrs.src === 'string' ? node.attrs.src : ''
                                decorations.push(
                                    Decoration.widget(
                                        pos + 1,
                                        () => createHint(`![${alt}](${src})`, className),
                                        { side: -1 }
                                    )
                                )
                            }

                            if (node.type.name === 'table' && !isActiveNode(pos, node.nodeSize)) {
                                decorations.push(
                                    Decoration.widget(
                                        pos + 1,
                                        () => createHint('| 表格 |', className),
                                        { side: -1 }
                                    )
                                )
                            }

                            if (node.type.name === 'heading') {
                                if (isActiveNode(pos, node.nodeSize)) {
                                    return
                                }
                                const level = typeof node.attrs.level === 'number' ? node.attrs.level : 1
                                decorations.push(
                                    Decoration.widget(
                                        pos + 1,
                                        () => createHint(`${'#'.repeat(level)} `, className),
                                        { side: -1 }
                                    )
                                )
                            }

                            if (node.type.name === 'listItem' && parent) {
                                if (isActiveNode(pos, node.nodeSize)) {
                                    return
                                }
                                const markerPosition = pos + 2

                                if (parent.type.name === 'bulletList') {
                                    decorations.push(
                                        Decoration.widget(
                                            markerPosition,
                                            () => createHint('- ', className),
                                            { side: -1 }
                                        )
                                    )
                                }

                                if (parent.type.name === 'orderedList') {
                                    const listIndex = typeof index === 'number' ? index : 0
                                    const start = typeof parent.attrs.start === 'number' ? parent.attrs.start : 1
                                    decorations.push(
                                        Decoration.widget(
                                            markerPosition,
                                            () => createHint(`${start + listIndex}. `, className),
                                            { side: -1 }
                                        )
                                    )
                                }

                                if (parent.type.name === 'taskList') {
                                    const checked = node.attrs?.checked === true
                                    decorations.push(
                                        Decoration.widget(
                                            markerPosition,
                                            () => createHint(`[${checked ? 'x' : ' '}] `, className),
                                            { side: -1 }
                                        )
                                    )
                                }
                            }

                            if (!node.isText || !parent) {
                                return
                            }

                            const textLength = node.text?.length ?? 0
                            if (textLength === 0) {
                                return
                            }

                            const prevSibling = typeof index === 'number' && index > 0 ? parent.child(index - 1) : null
                            const nextSibling = typeof index === 'number' && index < parent.childCount - 1
                                ? parent.child(index + 1)
                                : null

                            const addBoundary = (markName: string, open: string, close: string = open): void => {
                                if (!hasMark(node, markName)) {
                                    return
                                }

                                if (!hasMark(prevSibling, markName)) {
                                    decorations.push(
                                        Decoration.widget(
                                            pos,
                                            () => createHint(open, className),
                                            { side: -1 }
                                        )
                                    )
                                }

                                if (!hasMark(nextSibling, markName)) {
                                    decorations.push(
                                        Decoration.widget(
                                            pos + textLength,
                                            () => createHint(close, className),
                                            { side: 1 }
                                        )
                                    )
                                }
                            }

                            addBoundary('bold', '**')
                            addBoundary('italic', '*')
                            addBoundary('strike', '~~')
                            addBoundary('code', '`')
                            addBoundary('superscript', '^')
                            addBoundary('subscript', '~')

                            const linkMark = node.marks.find((mark) => mark.type.name === 'link')
                            if (linkMark) {
                                if (!hasMark(prevSibling, 'link')) {
                                    decorations.push(
                                        Decoration.widget(
                                            pos,
                                            () => createHint('[', className),
                                            { side: -1 }
                                        )
                                    )
                                }

                                if (!hasMark(nextSibling, 'link')) {
                                    const href = typeof linkMark.attrs.href === 'string' ? linkMark.attrs.href : ''
                                    decorations.push(
                                        Decoration.widget(
                                            pos + textLength,
                                            () => createHint(`](${href})`, className),
                                            { side: 1 }
                                        )
                                    )
                                }
                            }
                        })

                        return DecorationSet.create(state.doc, decorations)
                    },
                },
            }),
        ]
    },
})
