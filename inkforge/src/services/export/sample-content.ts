/**
 * Sample markdown content for empty-state preview.
 *
 * When the user opens the preview panel with no article content, the rendered
 * preview substitutes this sample so the preset's visual identity (fonts,
 * decorations, colors, typography rhythm) remains visible.
 *
 * Schema matches PRD §Sample Content Schema: h1 + lead blockquote + paragraph
 * (with bold/italic) + h2 + bilingual paragraph + list + code block + long quote.
 */

import type { ExportPreset } from '@/types'

export const DEFAULT_SAMPLE_MARKDOWN = `# 文章标题示例

> 这是一段引言，展示 preset 在 lead 段落上的处理。

正文段落的字体、行高、字距、首字下沉的视觉效果都在这里呈现，并且支持**强调**和*斜体*。

## 二级标题

正文混排英文：The quick brown **fox** jumps over the lazy dog. CJK + Latin 字体对的协同效果。

- 列表项一
- 列表项二
- 列表项三

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}\`;
}
\`\`\`

> "这是一段长引文。" —— 鲁迅
`

/**
 * Resolve sample content for a preset, honoring per-preset override.
 */
export function resolveSampleContent(preset: Pick<ExportPreset, 'sampleContent'>): string {
  return preset.sampleContent ?? DEFAULT_SAMPLE_MARKDOWN
}
