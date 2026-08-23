/**
 * Preset font infrastructure for the typography overhaul.
 *
 * Responsibilities:
 * - Declare bilingual (CJK + Latin) font stacks per persona.
 * - Declare `@font-face` records for self-hosted woff2 files served from
 *   `inkforge/public/fonts/`. When a file is absent the browser silently
 *   falls through to the next family in the stack, so missing fonts never
 *   break preview rendering.
 * - Generate per-persona base CSS (22–24 CJK characters per line,
 *   line-height 1.8 rhythm, font-feature-settings palt for CJK kerning).
 *
 * Binary woff2 files are NOT shipped in this PR — see
 * `inkforge/public/fonts/manifest.json` and `scripts/font-subset.mjs`
 * for the manual subsetting workflow.
 */

import type { FontSpec, PresetPersona } from '@/types'

// ════════════════════════════════════════════════════════════════════════
// Per-persona canonical bilingual font pair
// ════════════════════════════════════════════════════════════════════════

export const PERSONA_FONTS: Record<PresetPersona, FontSpec> = {
  academic: {
    cjk: "'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', serif",
    latin: "'EB Garamond', 'Crimson Pro', Georgia, 'Times New Roman', serif",
  },
  business: {
    cjk: "'Source Han Sans SC', 'IBM Plex Sans CN', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    latin: "'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  },
  lifestyle: {
    cjk: "'LXGW WenKai Lite', 'LXGW WenKai', 'Kaiti SC', 'STKaiti', 'KaiTi', serif",
    latin: "'Fraunces', 'Crimson Pro', Georgia, serif",
  },
  creative: {
    cjk: "'Smiley Sans', 'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    latin: "'Space Grotesk', 'JetBrains Mono', 'Inter', sans-serif",
  },
}

// ════════════════════════════════════════════════════════════════════════
// @font-face declarations
// ════════════════════════════════════════════════════════════════════════

export interface FontFaceSpec {
  family: string
  weight: number | string
  style: 'normal' | 'italic'
  /** Public-relative URL, served from `inkforge/public/fonts/` */
  file: string
  /** Optional unicode-range for subset chunking */
  unicodeRange?: string
  fontDisplay: 'swap' | 'block' | 'fallback'
}

export const FONT_FACE_SPECS: FontFaceSpec[] = [
  // ─── CJK (subset ~3500 char, single or paired weights) ───────────────
  {
    family: 'Source Han Serif SC',
    weight: 400,
    style: 'normal',
    file: '/fonts/SourceHanSerifSC-Regular-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Source Han Serif SC',
    weight: 700,
    style: 'normal',
    file: '/fonts/SourceHanSerifSC-Bold-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Source Han Sans SC',
    weight: 400,
    style: 'normal',
    file: '/fonts/SourceHanSansSC-Regular-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Source Han Sans SC',
    weight: 600,
    style: 'normal',
    file: '/fonts/SourceHanSansSC-Semibold-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'LXGW WenKai Lite',
    weight: 400,
    style: 'normal',
    file: '/fonts/LXGWWenKaiLite-Regular.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Smiley Sans',
    weight: 400,
    style: 'normal',
    file: '/fonts/SmileySans-Oblique-subset.woff2',
    fontDisplay: 'swap',
  },

  // ─── Latin (subset ASCII + Latin-1 supplement + ext-A) ───────────────
  {
    family: 'EB Garamond',
    weight: 400,
    style: 'normal',
    file: '/fonts/EBGaramond-Regular-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'EB Garamond',
    weight: 400,
    style: 'italic',
    file: '/fonts/EBGaramond-Italic-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Inter',
    weight: 400,
    style: 'normal',
    file: '/fonts/Inter-Regular-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Inter',
    weight: 600,
    style: 'normal',
    file: '/fonts/Inter-SemiBold-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Fraunces',
    weight: 400,
    style: 'normal',
    file: '/fonts/Fraunces-Regular-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Crimson Pro',
    weight: 400,
    style: 'normal',
    file: '/fonts/CrimsonPro-Regular-subset.woff2',
    fontDisplay: 'swap',
  },
  {
    family: 'Space Grotesk',
    weight: 500,
    style: 'normal',
    file: '/fonts/SpaceGrotesk-Medium-subset.woff2',
    fontDisplay: 'swap',
  },
]

/**
 * Emit the complete `@font-face` block for all bundled fonts.
 * Safe to inject once into the preview document head; missing files fall
 * through silently.
 */
export function generateFontFaceCSS(): string {
  return FONT_FACE_SPECS
    .map(spec => {
      const lines = [
        '@font-face {',
        `  font-family: '${spec.family}';`,
        `  font-weight: ${spec.weight};`,
        `  font-style: ${spec.style};`,
        `  font-display: ${spec.fontDisplay};`,
        `  src: url('${spec.file}') format('woff2');`,
      ]
      if (spec.unicodeRange) {
        lines.push(`  unicode-range: ${spec.unicodeRange};`)
      }
      lines.push('}')
      return lines.join('\n')
    })
    .join('\n\n')
}

// ════════════════════════════════════════════════════════════════════════
// Per-persona base CSS
// ════════════════════════════════════════════════════════════════════════

/**
 * Generate the foundation CSS for a persona.
 *
 * Layered model: persona base CSS sets the body rhythm (font stack,
 * 22–24 CJK character line-length lock, 1.75/1.85 line-height, CJK kerning features).
 * Each preset's `previewCSS` / `exportCSS` layers on top with decoration
 * and color motif.
 *
 * Academic and business presets read denser (1.75) — the reader scans for
 * information. Lifestyle and creative presets read more leisurely (1.85)
 * — the reader savors the rhythm.
 */
export function generatePersonaBaseCSS(persona: PresetPersona): string {
  const fonts = PERSONA_FONTS[persona]
  const dense = persona === 'academic' || persona === 'business'
  const lineHeight = dense ? '1.75' : '1.85'

  return `#nice {
  font-family: ${fonts.cjk}, ${fonts.latin};
  width: 100%;
  max-width: min(24em, calc(100vw - 16px));
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0;
  font-size: 16px;
  line-height: ${lineHeight};
  color: #1a1a1a;
  text-justify: inter-ideograph;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-break: strict;
  font-feature-settings: 'palt';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#nice h1,
#nice h2,
#nice h3,
#nice h4,
#nice h5,
#nice h6 {
  margin: 1.8em 0 0.75em;
  color: #16191c;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

#nice h1 { font-size: 2em; }
#nice h2 { font-size: 1.65em; }
#nice h3 { font-size: 1.35em; }
#nice h4 { font-size: 1.15em; }
#nice h5 { font-size: 1em; }
#nice h6 { font-size: 0.9em; color: #5d6670; }

#nice p {
  margin: 0 0 1.15em;
  text-indent: 0;
}

#nice strong,
#nice b {
  font-weight: 600;
}

#nice em,
#nice i {
  font-style: italic;
  font-family: ${fonts.latin}, ${fonts.cjk};
}

#nice del,
#nice s {
  color: #707880;
  text-decoration: line-through;
}

#nice a {
  color: #315d8c;
  text-decoration: underline;
  text-underline-offset: 0.16em;
  overflow-wrap: anywhere;
}

#nice code {
  padding: 0.12em 0.32em;
  border-radius: 4px;
  background: #f3f4f6;
  font-family: 'JetBrains Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 0.88em;
}

#nice pre {
  margin: 1.35em 0;
  padding: 1em;
  border-radius: 8px;
  background: #20252b;
  color: #f5f7f8;
  line-height: 1.65;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

#nice pre code {
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: 0.88em;
}

#nice blockquote {
  margin: 1.35em 0;
  padding: 0.75em 1em;
  border-left: 4px solid #bcc4cc;
  background: #f7f8fa;
  color: #525b64;
}

#nice ul,
#nice ol {
  margin: 0 0 1.15em;
  padding-left: 1.55em;
}

#nice li {
  margin: 0.35em 0;
}

#nice ul[data-type='taskList'],
#nice .task-list {
  padding-left: 0;
  list-style: none;
}

#nice table {
  width: 100%;
  margin: 1.35em 0;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 0.9em;
}

#nice th,
#nice td {
  padding: 0.65em 0.75em;
  border: 1px solid #dfe3e7;
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

#nice th {
  background: #f3f5f7;
  font-weight: 700;
}

#nice figure {
  margin: 1.5em 0;
}

#nice img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

#nice figcaption {
  margin-top: 0.65em;
  color: #7a838c;
  font-size: 0.8em;
  line-height: 1.55;
  text-align: center;
}

#nice hr {
  height: 1px;
  margin: 2em 0;
  border: 0;
  background: #dfe3e7;
}

#nice .katex {
  font-size: 1em;
}

#nice .katex-display {
  margin: 1.35em 0;
  overflow-x: auto;
  overflow-y: hidden;
}

#nice .mermaid,
#nice .ink-mermaid,
#nice [data-mermaid] {
  max-width: 100%;
  margin: 1.5em auto;
  overflow-x: auto;
  text-align: center;
}

#nice .ink-citation,
#nice .ink-source,
#nice .ink-footnotes {
  color: #68717a;
  font-size: 0.82em;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
`
}
