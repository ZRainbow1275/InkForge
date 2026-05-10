export * from './types'
export * from './sandbox'
export * from './runtime'

import type { CustomCssSnippet } from './types'

export const CUSTOM_CSS_SNIPPETS: readonly CustomCssSnippet[] = [
  {
    id: 'paper-padding',
    label: '纸张边距',
    description: '调整正文纸张内边距。',
    css: `.editor-content {\n  padding: 4em 6em;\n}`,
  },
  {
    id: 'heading-rule',
    label: '标题分隔线',
    description: '给一级标题添加低干扰边线。',
    css: `.editor-content h1 {\n  border-bottom: 2px solid var(--paper-border, rgba(38, 50, 56, 0.16));\n  padding-bottom: 0.35em;\n}`,
  },
  {
    id: 'blockquote-accent',
    label: '引用强调',
    description: '增强 blockquote 左侧视觉锚点。',
    css: `.editor-content blockquote {\n  border-left: 4px solid var(--paper-brand, #D32F2F);\n  padding-left: 1.2em;\n}`,
  },
  {
    id: 'code-shadow',
    label: '代码块内阴影',
    description: '给代码块添加纸张内侧层次。',
    css: `.editor-content pre {\n  box-shadow: inset 4px 0 0 var(--paper-brand, #D32F2F);\n}`,
  },
  {
    id: 'link-underline',
    label: '链接下划线',
    description: '让正文链接更接近出版物样式。',
    css: `.editor-content a {\n  text-decoration-thickness: 0.08em;\n  text-underline-offset: 0.18em;\n}`,
  },
  {
    id: 'image-frame',
    label: '图片边框',
    description: '给编辑区图片添加柔和边框。',
    css: `.editor-content img {\n  border-radius: 12px;\n  border: 1px solid rgba(38, 50, 56, 0.12);\n}`,
  },
] as const
