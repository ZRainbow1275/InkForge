import type { MarkdownExtension } from './types'

export const MARKDOWN_EXTENSION_REGISTRY: Record<string, MarkdownExtension> = {
  'inkforge.footnote': {
    id: 'inkforge.footnote',
    name: 'Footnote',
    syntax: '[^id] / [^id]: content',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'preserve-as-text',
      toPlatform: {
        wechat: 'footnote-list',
        zhihu: 'preserve-html',
        redbook: 'inline-paren',
        html: 'preserve-html',
        markdown: 'preserve-text',
      },
    },
    roundTripTest: 'tests/roundtrip/footnote.spec.ts',
    baselineStatus: 'render-only',
  },
  'inkforge.highlight': {
    id: 'inkforge.highlight',
    name: 'Highlight',
    syntax: '==text== / ==color:name text==',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'inline-replacement',
      toPlatform: {
        wechat: 'inline-span-bg',
        zhihu: 'mark-tag',
        redbook: 'text-only',
        html: 'mark-tag-class',
        markdown: 'mark-tag',
      },
    },
    roundTripTest: 'tests/roundtrip/highlight.spec.ts',
    baselineStatus: 'render-only',
  },
  'inkforge.toc': {
    id: 'inkforge.toc',
    name: 'TOC Macro',
    syntax: '[toc] / [toc depth=3 numbered=true]',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'render-ol',
      toPlatform: {
        wechat: 'render-ol',
        zhihu: 'render-ol',
        redbook: 'summary-text',
        html: 'preserve-html',
        markdown: 'preserve-macro',
      },
    },
    roundTripTest: 'tests/roundtrip/toc-macro.spec.ts',
    baselineStatus: 'render-only',
  },
  'inkforge.details': {
    id: 'inkforge.details',
    name: 'Details',
    syntax: '<details> / :::details Summary',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'preserve-html',
      toPlatform: {
        wechat: 'expanded',
        zhihu: 'expanded',
        redbook: 'expanded',
        html: 'keep-html',
        markdown: 'preserve-text',
      },
    },
    roundTripTest: 'tests/roundtrip/details.spec.ts',
    baselineStatus: 'render-only',
  },
  'inkforge.emoji': {
    id: 'inkforge.emoji',
    name: 'Emoji Shortcode',
    syntax: ':name:',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'shortcode',
      toPlatform: {
        wechat: 'shortcode',
        zhihu: 'shortcode',
        redbook: 'shortcode',
        html: 'shortcode',
        markdown: 'preserve-text',
      },
    },
    roundTripTest: 'tests/roundtrip/emoji.spec.ts',
    baselineStatus: 'render-only',
  },
  'inkforge.math.inline': {
    id: 'inkforge.math.inline',
    name: 'Inline Math',
    syntax: '$formula$',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'preserve-as-text',
      toPlatform: {
        wechat: 'katex-html',
        zhihu: 'katex-html',
        redbook: 'text-only',
        html: 'katex-html',
        markdown: 'preserve-text',
      },
    },
    roundTripTest: 'tests/roundtrip/math-inline.spec.ts',
    baselineStatus: 'existing',
  },
  'inkforge.math.block': {
    id: 'inkforge.math.block',
    name: 'Block Math',
    syntax: '$$formula$$',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'preserve-as-text',
      toPlatform: {
        wechat: 'katex-html',
        zhihu: 'katex-html',
        redbook: 'text-only',
        html: 'katex-html',
        markdown: 'preserve-text',
      },
    },
    roundTripTest: 'tests/roundtrip/math-block.spec.ts',
    baselineStatus: 'existing',
  },
  'inkforge.wikilink': {
    id: 'inkforge.wikilink',
    name: 'Wikilink',
    syntax: '[[title]] / [[title|alias]] / [[title#heading]]',
    portability: 'inkforge-proprietary',
    fallback: {
      toStandardMd: 'plain-text',
      toPlatform: {
        wechat: 'plain-text',
        zhihu: 'plain-text',
        redbook: 'plain-text',
        html: 'unresolved-link',
        markdown: 'preserve-text',
      },
    },
    roundTripTest: 'tests/roundtrip/wikilink.spec.ts',
    baselineStatus: 'render-only',
  },
  'inkforge.citation': {
    id: 'inkforge.citation',
    name: 'Citation',
    syntax: '[@key] / [@key; @other] / {cite: id} / blockquote source metadata',
    portability: 'inkforge-proprietary',
    fallback: {
      toStandardMd: 'preserve-pandoc-citation',
      toPlatform: {
        wechat: 'inline-citation-and-reference-list',
        zhihu: 'preserve-markdown-citation',
        redbook: 'inline-author-key',
        html: 'preserve-html',
        markdown: 'preserve-text',
      },
    },
    roundTripTest: 'tests/roundtrip/citation.spec.ts',
    baselineStatus: 'render-only',
  },
}

export function listMarkdownExtensions(): MarkdownExtension[] {
  return Object.values(MARKDOWN_EXTENSION_REGISTRY)
}

export function getMarkdownExtension(id: string): MarkdownExtension | undefined {
  return MARKDOWN_EXTENSION_REGISTRY[id]
}
