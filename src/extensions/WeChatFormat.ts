import { Extension } from '@tiptap/core'

/**
 * WeChat Format Extension
 * Ensures editor content uses WeChat-compatible attributes and structures.
 */
export const WeChatFormat = Extension.create({
    name: 'wechatFormat',

    addGlobalAttributes() {
        return [
            {
                types: ['heading', 'paragraph', 'image', 'blockquote', 'codeBlock'],
                attributes: {
                    class: {
                        default: null,
                        renderHTML: attributes => {
                            if (!attributes.class) return {}
                            return { class: attributes.class }
                        },
                        parseHTML: element => element.getAttribute('class'),
                    },
                    style: {
                        default: null,
                        renderHTML: attributes => {
                            if (!attributes.style) return {}
                            return { style: attributes.style }
                        },
                        parseHTML: element => element.getAttribute('style'),
                    }
                },
            },
        ]
    },
})
