/**
 * Preset font infrastructure for the typography overhaul.
 *
 * Responsibilities:
 * - Declare bilingual (CJK + Latin) font stacks per persona.
 * - Declare `@font-face` records for self-hosted woff2 files served from
 *   `inkforge/public/fonts/`. When a file is absent the browser silently
 *   falls through to the next family in the stack, so missing fonts never
 *   break preview rendering.
 * - Generate per-persona base CSS (max-width 22em line-length lock,
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
 * 22em line-length lock, 1.75/1.85 line-height, CJK kerning features).
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
  max-width: min(22em, calc(100vw - 32px));
  margin: 0 auto;
  padding: 0 4px;
  font-size: 17px;
  line-height: ${lineHeight};
  color: #1a1a1a;
  text-justify: inter-ideograph;
  word-break: break-word;
  line-break: strict;
  font-feature-settings: 'palt';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

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
`
}
