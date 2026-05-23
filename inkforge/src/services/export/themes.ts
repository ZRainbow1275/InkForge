/**
 * 主题预设和 CSS 生成
 */

import type { ExportPreset, ExportTarget } from '@/types'
import { DEFAULT_PRESET_ID, FONT_STACKS } from '@/constants'
import { PERSONA_FONTS, generatePersonaBaseCSS } from './preset-fonts'
import { composeRecipes } from './preset-decorations'

// ─── PR3: persona+recipe composers for the 5 migrated presets ──────────
// Each pair (preview + export) is generated once and reused inside the
// preset definition. Persona base CSS sets the 22em line-length lock,
// 1.75 line-height (academic/business), and bilingual font stack. The
// composed recipe CSS layers decoration on top.

const academicBaseCSS = generatePersonaBaseCSS('academic')
const businessBaseCSS = generatePersonaBaseCSS('business')
const lifestyleBaseCSS = generatePersonaBaseCSS('lifestyle')
const creativeBaseCSS = generatePersonaBaseCSS('creative')

const thesisRecipesPreview = composeRecipes(['cjk-decimal-h2', 'h2-underline-fine'], { target: 'preview' })
const thesisRecipesExport = composeRecipes(['cjk-decimal-h2', 'h2-underline-fine'], { target: 'export' })

const legalRecipesPreview = composeRecipes(['cjk-decimal-h2', 'numbered-list-roman'], { target: 'preview' })
const legalRecipesExport = composeRecipes(['cjk-decimal-h2', 'numbered-list-roman'], { target: 'export' })

const reportRecipesPreview = composeRecipes(['h2-underline-fine', 'pull-quote-bordered'], { target: 'preview' })
const reportRecipesExport = composeRecipes(['h2-underline-fine', 'pull-quote-bordered'], { target: 'export' })

const commentaryRecipesPreview = composeRecipes(['large-quote', 'h3-vertical-accent'], { target: 'preview' })
const commentaryRecipesExport = composeRecipes(['large-quote', 'h3-vertical-accent'], { target: 'export' })

const aigcRecipesPreview = composeRecipes(['h3-vertical-accent', 'ornament-hr'], { target: 'preview' })
const aigcRecipesExport = composeRecipes(['h3-vertical-accent', 'ornament-hr'], { target: 'export' })

// ─── PR4: lifestyle + creative recipe composers ─────────────────────────
const notesRecipesPreview = composeRecipes(['cjk-drop-cap', 'ornament-hr', 'pull-quote-bordered'], { target: 'preview' })
const notesRecipesExport = composeRecipes(['cjk-drop-cap', 'ornament-hr', 'pull-quote-bordered'], { target: 'export' })

const lifeRecipesPreview = composeRecipes(['cjk-drop-cap', 'large-quote', 'ornament-hr'], { target: 'preview' })
const lifeRecipesExport = composeRecipes(['cjk-drop-cap', 'large-quote', 'ornament-hr'], { target: 'export' })

const elegantRecipesPreview = composeRecipes(['cjk-drop-cap', 'large-quote', 'cjk-decimal-h2', 'h3-vertical-accent'], { target: 'preview' })
const elegantRecipesExport = composeRecipes(['cjk-drop-cap', 'large-quote', 'cjk-decimal-h2', 'h3-vertical-accent'], { target: 'export' })

const memeRecipesPreview = composeRecipes(['h3-vertical-accent', 'ornament-hr', 'h2-block-ribbon'], { target: 'preview' })
const memeRecipesExport = composeRecipes(['h3-vertical-accent', 'ornament-hr', 'h2-block-ribbon'], { target: 'export' })

const codeRecipesPreview = composeRecipes(['h2-underline-fine', 'pull-quote-bordered', 'numbered-list-roman'], { target: 'preview' })
const codeRecipesExport = composeRecipes(['h2-underline-fine', 'pull-quote-bordered', 'numbered-list-roman'], { target: 'export' })

const newsRecipesPreview = composeRecipes(['large-quote', 'pull-quote-bordered', 'h2-underline-fine'], { target: 'preview' })
const newsRecipesExport = composeRecipes(['large-quote', 'pull-quote-bordered', 'h2-underline-fine'], { target: 'export' })

const techRecipesPreview = composeRecipes(['h2-block-ribbon', 'h3-vertical-accent'], { target: 'preview' })
const techRecipesExport = composeRecipes(['h2-block-ribbon', 'h3-vertical-accent'], { target: 'export' })

// highlight.js 代码主题样式 (atom-one-dark)
export const codeThemeCSS = `
/* Atom One Dark Theme */
.hljs {
  background: #282c34;
  color: #abb2bf;
}
.hljs-comment,
.hljs-quote {
  color: #5c6370;
  font-style: italic;
}
.hljs-doctag,
.hljs-keyword,
.hljs-formula {
  color: #c678dd;
}
.hljs-section,
.hljs-name,
.hljs-selector-tag,
.hljs-deletion,
.hljs-subst {
  color: #e06c75;
}
.hljs-literal {
  color: #56b6c2;
}
.hljs-string,
.hljs-regexp,
.hljs-addition,
.hljs-attribute,
.hljs-meta .hljs-string {
  color: #98c379;
}
.hljs-attr,
.hljs-variable,
.hljs-template-variable,
.hljs-type,
.hljs-selector-class,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-number {
  color: #d19a66;
}
.hljs-symbol,
.hljs-bullet,
.hljs-link,
.hljs-meta,
.hljs-selector-id,
.hljs-title {
  color: #61aeee;
}
.hljs-built_in,
.hljs-title.class_,
.hljs-class .hljs-title {
  color: #e6c07b;
}
.hljs-emphasis {
  font-style: italic;
}
.hljs-strong {
  font-weight: bold;
}
.hljs-link {
  text-decoration: underline;
}
`

// 基础CSS样式
export const baseCSS = `
/* 基础样式 */
#nice {
  font-size: 16px;
  line-height: 1.85;
  color: #263238;
  padding: 20px;
  word-break: break-word;
  letter-spacing: 0;
}

#nice p {
  margin: 0 0 18px 0;
  padding: 0;
  line-height: 1.85;
}

#nice h1 {
  font-size: 25px;
  font-weight: 700;
  color: #1F2933;
  margin: 34px 0 20px 0;
  padding: 0 0 14px 0;
  line-height: 1.38;
  border-bottom: 2px solid #E6ECF2;
}

#nice h2 {
  font-size: 20px;
  font-weight: 700;
  color: #0066cc;
  margin: 30px 0 16px 0;
  padding: 8px 0 8px 14px;
  line-height: 1.45;
  border-left: 4px solid #0066cc;
  background: #F7FAFC;
  border-radius: 0 4px 4px 0;
}

#nice h3 {
  font-size: 17px;
  font-weight: 700;
  color: #0066cc;
  margin: 20px 0 12px 0;
  padding: 0 0 0 10px;
  line-height: 1.5;
  border-left: 3px solid #D8E2EC;
}

#nice h4 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 16px 0 8px 0;
  padding: 0;
  line-height: 1.5;
}

#nice h5 {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin: 12px 0 8px 0;
  padding: 0;
  line-height: 1.5;
}

#nice h6 {
  font-size: 13px;
  font-weight: 600;
  color: #777;
  margin: 12px 0 8px 0;
  padding: 0;
  line-height: 1.5;
}

#nice strong {
  font-weight: 700;
  color: #1F2933;
}

#nice em {
  font-style: italic;
}

#nice del, #nice s {
  text-decoration: line-through;
  color: #999;
}

#nice mark {
  background: #fff3b0;
  padding: 2px 4px;
  border-radius: 2px;
}

#nice sub {
  font-size: 0.75em;
  vertical-align: sub;
}

#nice sup {
  font-size: 0.75em;
  vertical-align: super;
}

#nice blockquote {
  margin: 18px 0;
  padding: 14px 16px;
  border-left: 4px solid #0066cc;
  background: #F6F8FA;
  color: #455A64;
  border-radius: 0 6px 6px 0;
}

#nice blockquote p {
  margin: 4px 0;
}

#nice ul, #nice ol {
  margin: 16px 0;
  padding-left: 24px;
}

#nice li {
  margin-bottom: 9px;
  line-height: 1.8;
}

#nice code {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 0.92em;
  background: #fff5f5;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--md-primary-color, #c7254e);
  word-break: break-word;
}

#nice pre {
  margin: 18px 0;
  padding: 16px;
  background: #282c34;
  border-radius: 6px;
  overflow-x: auto;
}

#nice pre code {
  background: transparent;
  color: #abb2bf;
  padding: 0;
  font-size: 14px;
  line-height: 1.6;
}

#nice a {
  color: #0066cc;
  text-decoration: none;
}

#nice img {
  max-width: 100%;
  height: auto;
  margin: 18px auto;
  border-radius: 6px;
}

#nice table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  font-size: 14px;
}

#nice th, #nice td {
  padding: 10px 12px;
  border: 1px solid #D8E2EC;
  text-align: left;
  line-height: 1.65;
}

#nice th {
  background: #F1F5F9;
  font-weight: 600;
}

#nice figure {
  margin: 20px 0;
  padding: 0;
  text-align: center;
}

#nice figcaption {
  margin-top: 8px;
  color: #78909C;
  font-size: 13px;
  line-height: 1.6;
}

#nice hr {
  border: none;
  border-top: 1px solid #E6ECF2;
  margin: 28px 0;
}
`

// 10种主题预设
export const themePresets: ExportPreset[] = [
  // THESIS: 学术正经, 思源宋体 + EB Garamond, 第N章编号 + h2 极细底线; 墨色单调
  {
    id: 'thesis',
    name: '论文翻译',
    icon: 'thesis',
    description: '学术严谨，墨色单调',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#5a4a3c',
    isUseIndent: true,
    isUseJustify: true,
    persona: 'academic',
    fonts: PERSONA_FONTS.academic,
    previewCSS: `${academicBaseCSS}
#nice { --ink-accent: #5a4a3c; background: #faf9f6; }
#nice h1 { font-size: 2.1em; font-weight: 700; text-align: center; margin: 0 0 0.6em; letter-spacing: 0.05em; color: #2a2a2a; }
#nice h2 { color: #2a2a2a; text-align: left; letter-spacing: 0.02em; margin-top: 1.6em; }
#nice h3 { color: #5a4a3c; font-weight: 600; margin-top: 1.2em; }
#nice blockquote { background: #f4f1ec; border-left: 3px solid #5a4a3c; padding: 0.8em 1.2em; color: #2a2a2a; }
#nice table th { background: #5a4a3c; color: #fff; }
${thesisRecipesPreview.css}`,
    exportCSS: `${academicBaseCSS}
#nice { background: #faf9f6; }
#nice h1 { font-size: 2.1em; font-weight: 700; text-align: center; margin: 0 0 0.6em; letter-spacing: 0.05em; color: #2a2a2a; }
#nice h2 { color: #2a2a2a; text-align: left; letter-spacing: 0.02em; margin-top: 1.6em; }
#nice h3 { color: #5a4a3c; font-weight: 600; margin-top: 1.2em; }
#nice blockquote { background: #f4f1ec; border-left: 3px solid #5a4a3c; padding: 0.8em 1.2em; color: #2a2a2a; }
#nice table th { background: #5a4a3c; color: #fff; }
${thesisRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => thesisRecipesExport.decorate(html, target),
    customCSS: `
      #nice { background: #faf9f6; }
      #nice h2 { text-align: center; font-variant: small-caps; letter-spacing: 2px; border-bottom: 1px solid #8B0000; padding-bottom: 12px; margin-bottom: 24px; }
      #nice h3 { color: #8B0000; font-weight: 700; }
      #nice blockquote { border-left: 4px solid #8B0000; background: rgba(139,0,0,0.03); border-radius: 0 4px 4px 0; padding: 12px 16px; }
      #nice table th { background: #8B0000; color: #fff; }
    `
  },
  // LEGAL: 法学严谨, 思源宋体 + EB Garamond, 第N章编号 + 罗马序号列表; 近黑庄重
  {
    id: 'legal',
    name: '法学研讨',
    icon: 'legal',
    description: '法学严谨，近黑庄重',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#1a1a2e',
    isUseIndent: true,
    isUseJustify: true,
    persona: 'academic',
    fonts: PERSONA_FONTS.academic,
    previewCSS: `${academicBaseCSS}
#nice { --ink-accent: #1a1a2e; }
#nice h1 { font-size: 2em; font-weight: 700; text-align: center; margin: 0 0 0.8em; color: #1a1a2e; letter-spacing: 0.04em; }
#nice h2 { color: #1a1a2e; font-weight: 700; margin-top: 1.6em; border-bottom: 1px solid #1a1a2e; padding-bottom: 0.3em; }
#nice h3 { color: #1a1a2e; font-weight: 600; }
#nice blockquote { background: #f4f4ee; border-left: 3px solid #1a1a2e; padding: 0.8em 1.2em; color: #1a1a2e; font-style: normal; }
#nice table th { background: #1a1a2e; color: #fff; }
#nice table td { border-color: #d0d0c8; }
${legalRecipesPreview.css}`,
    exportCSS: `${academicBaseCSS}
#nice h1 { font-size: 2em; font-weight: 700; text-align: center; margin: 0 0 0.8em; color: #1a1a2e; letter-spacing: 0.04em; }
#nice h2 { color: #1a1a2e; font-weight: 700; margin-top: 1.6em; border-bottom: 1px solid #1a1a2e; padding-bottom: 0.3em; }
#nice h3 { color: #1a1a2e; font-weight: 600; }
#nice blockquote { background: #f4f4ee; border-left: 3px solid #1a1a2e; padding: 0.8em 1.2em; color: #1a1a2e; font-style: normal; }
#nice table th { background: #1a1a2e; color: #fff; }
#nice table td { border-color: #d0d0c8; }
${legalRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => legalRecipesExport.decorate(html, target),
    customCSS: `
      #nice h2 { border-bottom: 2px solid #1A3A5C; padding-bottom: 8px; color: #1A3A5C; }
      #nice h3 { border-left: 4px solid #4A7C59; padding-left: 12px; }
      #nice blockquote { background: #f5f5f0; border-left-color: #4A7C59; border-radius: 0 4px 4px 0; font-style: normal; }
      #nice table th { background: #1A3A5C; color: #fff; }
      #nice table td { border-color: #d0d0c8; }
    `
  },
  // REPORT: 商务理性, 思源宋体 + EB Garamond, h2 极细底线 + pull-quote 双线; 商务蓝
  {
    id: 'report',
    name: '行业研报',
    icon: 'report',
    description: '商务理性，商务蓝调',
    theme: 'default',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#004080',
    isUseIndent: false,
    isUseJustify: true,
    persona: 'academic',
    fonts: PERSONA_FONTS.academic,
    previewCSS: `${academicBaseCSS}
#nice { --ink-accent: #004080; }
#nice h1 { font-size: 2em; font-weight: 700; margin: 0 0 0.5em; color: #004080; letter-spacing: -0.01em; }
#nice h2 { color: #004080; font-weight: 700; letter-spacing: 0; margin-top: 1.8em; }
#nice h3 { color: #1A3A5C; font-weight: 600; }
#nice strong { color: #004080; }
#nice table th { background: #F2F5F9; color: #1A3A5C; font-weight: 600; border-bottom: 2px solid #004080; }
#nice table td { border-color: #E6ECF2; }
#nice a { color: #004080; }
${reportRecipesPreview.css}`,
    exportCSS: `${academicBaseCSS}
#nice h1 { font-size: 2em; font-weight: 700; margin: 0 0 0.5em; color: #004080; letter-spacing: -0.01em; }
#nice h2 { color: #004080; font-weight: 700; letter-spacing: 0; margin-top: 1.8em; }
#nice h3 { color: #1A3A5C; font-weight: 600; }
#nice strong { color: #004080; }
#nice table th { background: #F2F5F9; color: #1A3A5C; font-weight: 600; border-bottom: 2px solid #004080; }
#nice table td { border-color: #E6ECF2; }
#nice a { color: #004080; }
${reportRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => reportRecipesExport.decorate(html, target),
    customCSS: `
      #nice h2 { color: #004080; font-weight: 700; letter-spacing: -0.2px; border-bottom: 1px solid #D6DEE6; padding-bottom: 6px; margin-top: 32px; }
      #nice h3 { color: #1A3A5C; font-weight: 600; }
      #nice table th { background: #F2F5F9; color: #1A3A5C; font-weight: 600; border-bottom: 2px solid #004080; }
      #nice table td { border-color: #E6ECF2; }
      #nice blockquote { background: #F5F8FB; border-left: 3px solid #004080; border-radius: 0; color: #36474F; }
      #nice a { color: #004080; }
    `
  },
  // COMMENTARY: 评论锋利, 思源黑体 + Inter, 大引号 + h3 竖条; 热血红
  {
    id: 'commentary',
    name: '时事点评',
    icon: 'commentary',
    description: '观点锋利，热血红调',
    theme: 'simple',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#c0392b',
    isUseIndent: false,
    isUseJustify: true,
    persona: 'business',
    fonts: PERSONA_FONTS.business,
    previewCSS: `${businessBaseCSS}
#nice { --ink-accent: #c0392b; }
#nice h1 { font-size: 2.2em; font-weight: 900; margin: 0 0 0.5em; color: #1a1a1a; letter-spacing: -0.01em; }
#nice h2 { color: #c0392b; font-weight: 900; font-size: 1.5em; margin-top: 1.6em; }
#nice strong { color: #c0392b; font-weight: 700; }
#nice hr { border: 0; border-top: 2px solid #c0392b; margin: 2.4em 0; }
${commentaryRecipesPreview.css}`,
    exportCSS: `${businessBaseCSS}
#nice h1 { font-size: 2.2em; font-weight: 900; margin: 0 0 0.5em; color: #1a1a1a; letter-spacing: -0.01em; }
#nice h2 { color: #c0392b; font-weight: 900; font-size: 1.5em; margin-top: 1.6em; }
#nice strong { color: #c0392b; font-weight: 700; }
#nice hr { border: 0; border-top: 2px solid #c0392b; margin: 2.4em 0; }
${commentaryRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => commentaryRecipesExport.decorate(html, target),
    customCSS: `
      #nice h2 { color: #C00000; font-weight: 900; font-size: 22px; margin-top: 32px; }
      #nice strong { color: #C00000; font-weight: 900; }
      #nice blockquote { border-left: 4px solid #C00000; font-style: italic; background: #FFF5F5; border-radius: 0 4px 4px 0; }
      #nice hr { border-top: 2px solid #C00000; margin: 32px 0; }
    `
  },
  // AIGC: 科技理性, 思源黑体 + Inter, h3 竖条 + ornament HR; 科技蓝
  {
    id: 'aigc',
    name: 'AIGC',
    icon: 'aigc',
    description: '科技理性，科技蓝调',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#2563eb',
    isUseIndent: false,
    isUseJustify: false,
    persona: 'business',
    fonts: PERSONA_FONTS.business,
    previewCSS: `${businessBaseCSS}
#nice { --ink-accent: #2563eb; }
#nice h1 { font-size: 2.1em; font-weight: 700; margin: 0 0 0.6em; color: #1a1a1a; letter-spacing: -0.01em; }
#nice h2 { color: #2563eb; font-weight: 700; margin-top: 1.6em; padding-left: 0; border-left: none; }
#nice strong { color: #2563eb; }
#nice code { background: rgba(37,99,235,0.08); color: #2563eb; padding: 0.1em 0.35em; border-radius: 3px; }
#nice blockquote { border-left: 3px solid #2563eb; background: rgba(37,99,235,0.04); padding: 0.8em 1.2em; border-radius: 0 4px 4px 0; }
#nice a { color: #2563eb; }
${aigcRecipesPreview.css}`,
    exportCSS: `${businessBaseCSS}
#nice h1 { font-size: 2.1em; font-weight: 700; margin: 0 0 0.6em; color: #1a1a1a; letter-spacing: -0.01em; }
#nice h2 { color: #2563eb; font-weight: 700; margin-top: 1.6em; padding-left: 0; border-left: none; }
#nice strong { color: #2563eb; }
#nice code { background: rgba(37,99,235,0.08); color: #2563eb; padding: 0.1em 0.35em; border-radius: 3px; }
#nice blockquote { border-left: 3px solid #2563eb; background: rgba(37,99,235,0.04); padding: 0.8em 1.2em; border-radius: 0 4px 4px 0; }
#nice a { color: #2563eb; }
${aigcRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => aigcRecipesExport.decorate(html, target),
    customCSS: `
      #nice h2 { color: #7B2D8E; background: linear-gradient(135deg, rgba(123,45,142,0.08), rgba(99,102,241,0.08)); padding: 8px 12px; border-radius: 4px; }
      #nice code { background: rgba(123,45,142,0.1); color: #7B2D8E; }
      #nice blockquote { border-left: 4px solid #7B2D8E; background: rgba(123,45,142,0.03); }
      #nice a { color: #7B2D8E; }
    `
  },
  // CODE: 代码教程, 思源黑体 + JetBrains Mono, h2 极细底线 + 罗马序号列表; 终端绿
  {
    id: 'code',
    name: '编程创造',
    icon: 'code',
    description: '代码教程，终端绿调',
    theme: 'default',
    fontFamily: 'monospace',
    fontSize: '15px',
    primaryColor: '#16a34a',
    isUseIndent: false,
    isUseJustify: false,
    persona: 'creative',
    fonts: PERSONA_FONTS.creative,
    previewCSS: `${creativeBaseCSS}
#nice { --ink-accent: #16a34a; font-family: 'JetBrains Mono', 'Source Han Sans SC', 'Maple Mono CN', monospace; }
#nice h1 { font-size: 2em; font-weight: 700; color: #16a34a; margin: 0 0 0.6em; letter-spacing: -0.01em; }
#nice h2 { color: #16a34a; font-weight: 700; margin-top: 1.6em; }
#nice h3 { color: #16a34a; font-weight: 600; }
#nice strong { color: #16a34a; }
#nice code { background: rgba(22,163,74,0.08); color: #15803d; padding: 0.1em 0.35em; border-radius: 3px; font-family: 'JetBrains Mono', monospace; }
#nice pre { background: #0d1117; border-radius: 6px; padding: 1em; }
#nice pre code { color: #c9d1d9; background: transparent; }
#nice blockquote { border-top: 2px solid #16a34a; border-bottom: 2px solid #16a34a; background: transparent; padding: 1em 0; }
#nice a { color: #16a34a; }
${codeRecipesPreview.css}`,
    exportCSS: `${creativeBaseCSS}
#nice { font-family: 'JetBrains Mono', 'Source Han Sans SC', monospace; }
#nice h1 { font-size: 2em; font-weight: 700; color: #16a34a; margin: 0 0 0.6em; letter-spacing: -0.01em; }
#nice h2 { color: #16a34a; font-weight: 700; margin-top: 1.6em; }
#nice h3 { color: #16a34a; font-weight: 600; }
#nice strong { color: #16a34a; }
#nice code { background: rgba(22,163,74,0.08); color: #15803d; padding: 0.1em 0.35em; border-radius: 3px; font-family: 'JetBrains Mono', monospace; }
#nice pre { background: #0d1117; border-radius: 6px; padding: 1em; }
#nice pre code { color: #c9d1d9; background: transparent; }
#nice blockquote { border-top: 2px solid #16a34a; border-bottom: 2px solid #16a34a; background: transparent; padding: 1em 0; }
#nice a { color: #16a34a; }
${codeRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => codeRecipesExport.decorate(html, target),
    customCSS: `
      #nice { background: #0d1117; color: #c9d1d9; font-family: 'JetBrains Mono', monospace; }
      #nice h2, #nice h3 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
      #nice p { color: #c9d1d9; }
      #nice a { color: #58a6ff; }
      #nice code { background: #161b22; color: #79c0ff; border: 1px solid #30363d; }
      #nice blockquote { border-left: 4px solid #3fb950; background: rgba(63,185,80,0.05); }
      #nice table th { background: #161b22; color: #c9d1d9; border-color: #30363d; }
      #nice table td { border-color: #30363d; background: #0d1117; }
      #nice strong { color: #ff7b72; }
      #nice hr { border-top: 1px solid #30363d; }
    `
  },
  // NOTES: 个人笔记, LXGW WenKai + Fraunces, drop cap + 花体 hr + 双线 pull-quote; 巧克力色奶油底
  {
    id: 'notes',
    name: '学习笔记',
    icon: 'notes',
    description: '知识卡片，奶油暖调',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#d2691e',
    isUseIndent: false,
    isUseJustify: false,
    persona: 'lifestyle',
    fonts: PERSONA_FONTS.lifestyle,
    previewCSS: `${lifestyleBaseCSS}
#nice { --ink-accent: #d2691e; background: #fdfaf3; }
#nice h1 { font-size: 2em; font-weight: 700; color: #5a3a1c; margin: 0 0 0.6em; }
#nice h2 { color: #d2691e; font-weight: 600; margin-top: 1.6em; padding: 6px 12px; background: #fcf4e4; border-radius: 4px; border-left: 4px solid #d2691e; }
#nice h3 { color: #a0522d; font-weight: 600; }
#nice strong { color: #d2691e; }
#nice code { background: rgba(210,105,30,0.08); color: #a0522d; padding: 0.1em 0.35em; border-radius: 3px; }
#nice table th { background: #d2691e; color: #fff; }
#nice a { color: #d2691e; }
${notesRecipesPreview.css}`,
    exportCSS: `${lifestyleBaseCSS}
#nice { background: #fdfaf3; }
#nice h1 { font-size: 2em; font-weight: 700; color: #5a3a1c; margin: 0 0 0.6em; }
#nice h2 { color: #d2691e; font-weight: 600; margin-top: 1.6em; padding: 6px 12px; background: #fcf4e4; border-radius: 4px; border-left: 4px solid #d2691e; }
#nice h3 { color: #a0522d; font-weight: 600; }
#nice strong { color: #d2691e; }
#nice code { background: rgba(210,105,30,0.08); color: #a0522d; padding: 0.1em 0.35em; border-radius: 3px; }
#nice table th { background: #d2691e; color: #fff; }
#nice a { color: #d2691e; }
${notesRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => notesRecipesExport.decorate(html, target),
    customCSS: `
      #nice h2 { color: #E07020; background: #FFF8E7; padding: 8px 14px; border-radius: 6px; border-left: 4px solid #E07020; }
      #nice blockquote { background: #FFF8E7; border-left-color: #E07020; border-radius: 4px; }
      #nice table th { background: #E07020; color: #fff; }
      #nice code { background: rgba(224,112,32,0.08); color: #E07020; }
    `
  },
  // NEWS: 新闻报道, 思源黑体 + Inter, 大引号 + 双线 pull-quote + h2 极细底线; 板岩黑庄重
  {
    id: 'news',
    name: '新闻',
    icon: 'news',
    description: '新闻报道，板岩黑调',
    theme: 'simple',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#0f172a',
    isUseIndent: false,
    isUseJustify: true,
    persona: 'creative',
    fonts: PERSONA_FONTS.creative,
    previewCSS: `${creativeBaseCSS}
#nice { --ink-accent: #0f172a; }
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0 0 0.5em; color: #0f172a; letter-spacing: -0.02em; text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 0.3em; }
#nice h2 { color: #0f172a; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1.8em; }
#nice h3 { color: #0f172a; font-weight: 800; border-left: 4px solid #0f172a; padding-left: 0.6em; }
#nice strong { color: #0f172a; font-weight: 900; }
#nice a { color: #0f172a; border-bottom: 1px solid #0f172a; }
#nice table th { background: #0f172a; color: #fff; }
${newsRecipesPreview.css}`,
    exportCSS: `${creativeBaseCSS}
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0 0 0.5em; color: #0f172a; letter-spacing: -0.02em; text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 0.3em; }
#nice h2 { color: #0f172a; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1.8em; }
#nice h3 { color: #0f172a; font-weight: 800; border-left: 4px solid #0f172a; padding-left: 0.6em; }
#nice strong { color: #0f172a; font-weight: 900; }
#nice a { color: #0f172a; border-bottom: 1px solid #0f172a; }
#nice table th { background: #0f172a; color: #fff; }
${newsRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => newsRecipesExport.decorate(html, target),
    customCSS: `
      #nice h2 { font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-top: 3px solid #000; border-bottom: 1px solid #000; padding: 10px 0; text-align: center; }
      #nice h3 { font-weight: 700; border-left: 4px solid #000; padding-left: 12px; }
      #nice blockquote { border-left: 3px solid #000; background: #f5f5f5; }
      #nice strong { font-weight: 900; }
    `
  },
  // MEME: meme风, 得意黑 + Space Grotesk, h2 全色块条 + h3 竖条 + 花体 hr; 热粉
  {
    id: 'meme',
    name: '整活',
    icon: 'meme',
    description: 'meme风，热粉破格',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#ff006e',
    isUseIndent: false,
    isUseJustify: false,
    persona: 'creative',
    fonts: PERSONA_FONTS.creative,
    previewCSS: `${creativeBaseCSS}
#nice { --ink-accent: #ff006e; }
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0 0 0.5em; color: #ff006e; letter-spacing: -0.02em; font-family: 'Smiley Sans', 'Source Han Sans SC', sans-serif; }
#nice h2 { background: #ff006e; color: #fff; padding: 0.5em 0.8em; border-radius: 4px; margin-top: 1.6em; margin-bottom: 0.9em; font-weight: 800; }
#nice h3 { color: #ff006e; font-weight: 700; border-left: 3px solid #ff006e; padding-left: 0.6em; }
#nice strong { color: #ff006e; font-weight: 900; }
#nice code { background: rgba(255,0,110,0.1); color: #ff006e; padding: 0.1em 0.35em; border-radius: 4px; }
#nice blockquote { border-left: 4px solid #ff006e; background: #fff0f5; border-radius: 0 12px 12px 0; padding: 12px 16px; }
#nice table th { background: #ff006e; color: #fff; }
#nice hr { border-top: 2px dashed #ff006e; }
#nice a { color: #ff006e; }
${memeRecipesPreview.css}`,
    exportCSS: `${creativeBaseCSS}
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0 0 0.5em; color: #ff006e; letter-spacing: -0.02em; font-family: 'Smiley Sans', 'Source Han Sans SC', sans-serif; }
#nice h2 { background: #ff006e; color: #fff; padding: 0.5em 0.8em; border-radius: 4px; margin-top: 1.6em; margin-bottom: 0.9em; font-weight: 800; }
#nice h3 { color: #ff006e; font-weight: 700; border-left: 3px solid #ff006e; padding-left: 0.6em; }
#nice strong { color: #ff006e; font-weight: 900; }
#nice code { background: rgba(255,0,110,0.1); color: #ff006e; padding: 0.1em 0.35em; border-radius: 4px; }
#nice blockquote { border-left: 4px solid #ff006e; background: #fff0f5; border-radius: 0 12px 12px 0; padding: 12px 16px; }
#nice table th { background: #ff006e; color: #fff; }
#nice hr { border-top: 2px dashed #ff006e; }
#nice a { color: #ff006e; }
${memeRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => memeRecipesExport.decorate(html, target),
    customCSS: `
      #nice h2 { color: #FF6B9D; font-weight: 800; font-size: 20px; }
      #nice h3 { color: #FF6B9D; }
      #nice strong { color: #FF6B9D; font-weight: 800; }
      #nice blockquote { border-left: 4px solid #FF6B9D; background: #FFF0F5; border-radius: 0 12px 12px 0; padding: 12px 16px; }
      #nice code { background: rgba(255,107,157,0.1); color: #FF6B9D; border-radius: 4px; }
      #nice table th { background: #FF6B9D; color: #fff; }
      #nice hr { border-top: 2px dashed #FF6B9D; margin: 24px 0; }
      #nice a { color: #FF6B9D; }
    `
  },
  // LIFE: 生活随笔, LXGW WenKai Lite + Crimson Pro, drop cap + 大引号 + 花体 hr; 棕褐温和
  {
    id: 'life',
    name: '人生感悟',
    icon: 'life',
    description: '生活随笔，棕褐温和',
    theme: 'simple',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: '#a0522d',
    isUseIndent: true,
    isUseJustify: false,
    persona: 'lifestyle',
    fonts: PERSONA_FONTS.lifestyle,
    previewCSS: `${lifestyleBaseCSS}
#nice { --ink-accent: #a0522d; background: #fefcf8; }
#nice p { line-height: 2.0; margin-bottom: 1.3em; }
#nice h1 { font-size: 2em; font-weight: 500; text-align: center; color: #5a3a1c; letter-spacing: 0.04em; margin: 0 0 1em; }
#nice h2 { color: #a0522d; font-weight: 500; letter-spacing: 0.04em; border-bottom: 1px solid #d4b896; padding-bottom: 0.4em; margin-top: 2em; }
#nice h3 { color: #8b4513; font-weight: 500; }
#nice strong { color: #a0522d; font-weight: 600; }
#nice blockquote { border-left: 3px solid #d4b896; color: #6b5a4a; font-style: italic; background: rgba(212,184,150,0.08); padding: 0.8em 1.2em; }
#nice a { color: #a0522d; border-bottom: 1px solid #d4b896; }
${lifeRecipesPreview.css}`,
    exportCSS: `${lifestyleBaseCSS}
#nice { background: #fefcf8; }
#nice p { line-height: 2.0; margin-bottom: 1.3em; }
#nice h1 { font-size: 2em; font-weight: 500; text-align: center; color: #5a3a1c; letter-spacing: 0.04em; margin: 0 0 1em; }
#nice h2 { color: #a0522d; font-weight: 500; letter-spacing: 0.04em; border-bottom: 1px solid #d4b896; padding-bottom: 0.4em; margin-top: 2em; }
#nice h3 { color: #8b4513; font-weight: 500; }
#nice strong { color: #a0522d; font-weight: 600; }
#nice blockquote { border-left: 3px solid #d4b896; color: #6b5a4a; font-style: italic; background: rgba(212,184,150,0.08); padding: 0.8em 1.2em; }
#nice a { color: #a0522d; border-bottom: 1px solid #d4b896; }
${lifeRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => lifeRecipesExport.decorate(html, target),
    customCSS: `
      #nice { max-width: 600px; margin: 0 auto; }
      #nice p { line-height: 2.2; margin-bottom: 1.5em; }
      #nice h2 { color: #555; font-weight: 400; letter-spacing: 1px; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-top: 36px; }
      #nice h3 { color: #666; font-weight: 400; }
      #nice blockquote { border-left: 3px solid #ccc; background: #fafafa; color: #888; font-style: italic; border-radius: 0 4px 4px 0; }
      #nice hr { border-top: 1px solid #eee; margin: 36px 0; }
      #nice a { color: #888; border-bottom: 1px solid #ddd; }
    `
  },
  // ELEGANT: 优雅长文, 思源宋体 + EB Garamond (lifestyle), drop cap + 大引号 + cjk-decimal h2 + h3 竖条; 深紫
  {
    id: 'elegant',
    name: '优雅',
    icon: 'elegant',
    description: '优雅长文，深紫书卷',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '16px',
    primaryColor: '#4a3c5a',
    isUseIndent: true,
    isUseJustify: true,
    persona: 'lifestyle',
    fonts: { cjk: PERSONA_FONTS.academic.cjk, latin: PERSONA_FONTS.academic.latin },
    previewCSS: `${lifestyleBaseCSS}
#nice { --ink-accent: #4a3c5a; font-family: ${PERSONA_FONTS.academic.cjk}, ${PERSONA_FONTS.academic.latin}; background: #fafaf6; }
#nice p { line-height: 1.95; margin-bottom: 1.2em; }
#nice h1 { font-size: 2.2em; font-weight: 600; text-align: center; color: #2a2438; letter-spacing: 0.04em; margin: 0 0 1em; }
#nice h2 { color: #4a3c5a; font-weight: 600; border-bottom: 2px double #4a3c5a; padding-bottom: 0.4em; margin-top: 2em; }
#nice h3 { color: #4a3c5a; font-weight: 600; }
#nice strong { color: #4a3c5a; }
#nice blockquote { border-left: 3px solid #4a3c5a; background: #f4f2f8; font-style: italic; padding: 0.8em 1.2em; }
#nice a { color: #4a3c5a; border-bottom: 1px solid #c4b6d8; }
${elegantRecipesPreview.css}`,
    exportCSS: `${lifestyleBaseCSS}
#nice { font-family: ${PERSONA_FONTS.academic.cjk}, ${PERSONA_FONTS.academic.latin}; background: #fafaf6; }
#nice p { line-height: 1.95; margin-bottom: 1.2em; }
#nice h1 { font-size: 2.2em; font-weight: 600; text-align: center; color: #2a2438; letter-spacing: 0.04em; margin: 0 0 1em; }
#nice h2 { color: #4a3c5a; font-weight: 600; border-bottom: 2px double #4a3c5a; padding-bottom: 0.4em; margin-top: 2em; }
#nice h3 { color: #4a3c5a; font-weight: 600; }
#nice strong { color: #4a3c5a; }
#nice blockquote { border-left: 3px solid #4a3c5a; background: #f4f2f8; font-style: italic; padding: 0.8em 1.2em; }
#nice a { color: #4a3c5a; border-bottom: 1px solid #c4b6d8; }
${elegantRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => elegantRecipesExport.decorate(html, target),
    customCSS: `
      #nice { font-family: Georgia, "Noto Serif SC", "Source Han Serif SC", serif; line-height: 1.9; }
      #nice p { margin-bottom: 1.2em; text-indent: 2em; }
      #nice h2 { font-weight: 600; border-bottom: 2px double #B8860B; padding-bottom: 8px; }
      #nice blockquote { border-left: 3px solid #B8860B; background: #faf8f0; font-style: italic; }
    `
  },
  // TECH: 科技, 思源黑体 + Space Grotesk (creative), h2 全色块条 + h3 竖条; 靛蓝
  {
    id: 'tech',
    name: '科技',
    icon: 'tech',
    description: '科技，靛蓝未来',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: '#6366f1',
    isUseIndent: false,
    isUseJustify: false,
    persona: 'creative',
    fonts: PERSONA_FONTS.creative,
    previewCSS: `${creativeBaseCSS}
#nice { --ink-accent: #6366f1; }
#nice h1 { font-size: 2.1em; font-weight: 700; margin: 0 0 0.6em; color: #4338ca; letter-spacing: -0.01em; }
#nice h2 { background: #6366f1; color: #fff; padding: 0.5em 0.8em; border-radius: 4px; margin-top: 1.6em; margin-bottom: 0.9em; font-weight: 700; }
#nice h3 { color: #6366f1; font-weight: 600; border-left: 2px solid #6366f1; padding-left: 0.6em; }
#nice strong { color: #6366f1; }
#nice code { background: rgba(99,102,241,0.08); color: #4338ca; padding: 0.1em 0.35em; border-radius: 3px; }
#nice blockquote { border-left: 4px solid #6366f1; background: #f0f0ff; border-radius: 0 8px 8px 0; padding: 0.8em 1.2em; }
#nice a { color: #6366f1; }
#nice table th { background: #6366f1; color: #fff; }
${techRecipesPreview.css}`,
    exportCSS: `${creativeBaseCSS}
#nice h1 { font-size: 2.1em; font-weight: 700; margin: 0 0 0.6em; color: #4338ca; letter-spacing: -0.01em; }
#nice h2 { background: #6366f1; color: #fff; padding: 0.5em 0.8em; border-radius: 4px; margin-top: 1.6em; margin-bottom: 0.9em; font-weight: 700; }
#nice h3 { color: #6366f1; font-weight: 600; border-left: 2px solid #6366f1; padding-left: 0.6em; }
#nice strong { color: #6366f1; }
#nice code { background: rgba(99,102,241,0.08); color: #4338ca; padding: 0.1em 0.35em; border-radius: 3px; }
#nice blockquote { border-left: 4px solid #6366f1; background: #f0f0ff; border-radius: 0 8px 8px 0; padding: 0.8em 1.2em; }
#nice a { color: #6366f1; }
#nice table th { background: #6366f1; color: #fff; }
${techRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => techRecipesExport.decorate(html, target),
    customCSS: `
      #nice { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.8; }
      #nice p { margin-bottom: 1em; }
      #nice blockquote { border-left: 4px solid #6366f1; background: #f0f0ff; border-radius: 0 8px 8px 0; }
    `
  }
]

/**
 * 生成主题CSS
 *
 * PR3 dual-track: when `target === 'export'` and preset.exportCSS is present,
 * the export-safe CSS replaces the legacy customCSS layer (persona base CSS
 * already includes font/line-length lock). When `target === 'preview'` and
 * preset.previewCSS is present, the full CSS3 variant is used instead.
 * Presets that haven't been migrated yet fall through to the legacy path.
 */
export function generateThemeCSS(preset: ExportPreset, target: 'preview' | 'export' = 'export'): string {
  // ─── New dual-track path: preset has explicit per-target CSS ──────────
  const dualTrackCSS = target === 'preview' ? preset.previewCSS : preset.exportCSS
  if (dualTrackCSS) {
    let css = baseCSS + '\n' + dualTrackCSS
    if (preset.isUseIndent) {
      css += '\n#nice p { text-indent: 2em; }'
    }
    if (preset.isUseJustify) {
      css += '\n#nice p { text-align: justify; }'
    }
    return css
  }

  // ─── Legacy path: customCSS + computed font / primary color ───────────
  let css = baseCSS

  // 字体 - 使用统一的字体栈定义
  const fontKey = preset.fontFamily === 'sans-serif' ? 'sans'
    : preset.fontFamily === 'monospace' ? 'mono'
    : preset.fontFamily as keyof typeof FONT_STACKS

  const fontStack = FONT_STACKS[fontKey] || FONT_STACKS.sans

  css += `
    #nice { font-family: ${fontStack}; font-size: ${preset.fontSize}; }
  `

  // 主色
  css += `
    #nice a { color: ${preset.primaryColor}; }
    #nice h2 { color: ${preset.primaryColor}; border-left-color: ${preset.primaryColor}; }
    #nice h3 { color: ${preset.primaryColor}; }
    #nice blockquote { border-left-color: ${preset.primaryColor}; }
    #nice code { color: ${preset.primaryColor}; }
    #nice table th { background: ${preset.primaryColor}; color: #fff; }
  `

  // 首行缩进
  if (preset.isUseIndent) {
    css += `
      #nice p { text-indent: 2em; }
    `
  }

  // 两端对齐
  if (preset.isUseJustify) {
    css += `
      #nice p { text-align: justify; }
    `
  }

  // 自定义CSS
  if (preset.customCSS) {
    css += preset.customCSS
  }

  return css
}

/**
 * 获取预设
 */
export function getPresetById(id: string): ExportPreset | undefined {
  return themePresets.find(p => p.id === id)
}

export function getDefaultPreset(): ExportPreset {
  return getPresetById(DEFAULT_PRESET_ID) ?? themePresets[0]
}

/**
 * 在 juice CSS 内联之后应用主题特定的标题装饰
 *
 * 某些主题效果（如伪元素 ::before/::after、渐变文字裁剪）
 * 无法通过 CSS 内联实现，或微信公众号不支持。
 * 此函数将这些效果转换为真实的内联 HTML 元素。
 *
 * @param html - juice 内联后的 HTML 字符串
 * @param preset - 当前使用的导出预设
 * @returns 应用装饰后的 HTML 字符串
 */
export function applyHeadingDecorations(html: string, preset: ExportPreset): string {
  let result = html

  switch (preset.id) {
    case 'thesis':
      // 在 h2 内容前后添加金色星号装饰
      // 替代原先的 ::before/::after 伪元素
      result = result.replace(
        /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
        (_match: string, attrs: string, content: string) => {
          return `<h2${attrs}><span style="color:#D4AF37;margin-right:8px;">&#9733;</span>${content}<span style="color:#D4AF37;margin-left:8px;">&#9733;</span></h2>`
        }
      )
      break

    case 'report':
      // 报告主题无需额外 h2 装饰，顶部边框通过 CSS 内联处理
      break

    case 'news':
      // 新闻主题的 h2 已通过 CSS 边框样式处理
      break

    case 'meme':
      // 为 strong 标签添加黄色荧光笔高亮效果
      // 替代原先的 background gradient（微信对 gradient 支持有限）
      result = result.replace(
        /<strong([^>]*)>([\s\S]*?)<\/strong>/gi,
        (_match: string, attrs: string, content: string) => {
          // 如果已有 background 样式则跳过，避免重复处理
          if (attrs.includes('background')) return _match

          // 合并或创建 style 属性
          const existingStyle = attrs.match(/style="([^"]*)"/)
          // 纯色 fallback（微信不支持 gradient，剥离后保留纯色底色）
          const highlightStyle = 'background:#FFFACD;background:linear-gradient(180deg, transparent 60%, #FFD700 60%);display:inline;'
          if (existingStyle) {
            const mergedAttrs = attrs.replace(
              /style="([^"]*)"/,
              `style="$1;${highlightStyle}"`
            )
            return `<strong${mergedAttrs}>${content}</strong>`
          }
          return `<strong${attrs} style="${highlightStyle}">${content}</strong>`
        }
      )
      break

    case 'elegant':
      // 优雅主题：h2 底部双线装饰（暗金色）+ 前后书名号装饰
      result = result.replace(
        /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
        (_match: string, attrs: string, content: string) => {
          // 确保 style 中包含双线底部边框
          const existingStyle = attrs.match(/style="([^"]*)"/)
          const doubleLineStyle = 'border-bottom:2px double #B8860B;padding-bottom:8px;'
          if (existingStyle) {
            if (!existingStyle[1].includes('border-bottom')) {
              const mergedAttrs = attrs.replace(
                /style="([^"]*)"/,
                `style="$1;${doubleLineStyle}"`
              )
              return `<h2${mergedAttrs}><span style="color:#B8860B;margin-right:6px;">&#12302;</span>${content}<span style="color:#B8860B;margin-left:6px;">&#12303;</span></h2>`
            }
          }
          return `<h2${attrs}><span style="color:#B8860B;margin-right:6px;">&#12302;</span>${content}<span style="color:#B8860B;margin-left:6px;">&#12303;</span></h2>`
        }
      )
      break

    case 'tech':
      // 科技主题：h2 靛蓝紫渐变背景色条
      result = result.replace(
        /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
        (_match: string, attrs: string, content: string) => {
          // 纯色 fallback（微信不支持 gradient，剥离后保留主色底色）
          const techStyle = 'background:#6366f1;background:linear-gradient(135deg, #6366f1, #8b5cf6);color:#fff;padding:8px 16px;border-radius:4px;font-weight:700;'
          const existingStyle = attrs.match(/style="([^"]*)"/)
          if (existingStyle) {
            const mergedAttrs = attrs.replace(
              /style="([^"]*)"/,
              `style="$1;${techStyle}"`
            )
            return `<h2${mergedAttrs}>${content}</h2>`
          }
          return `<h2${attrs} style="${techStyle}">${content}</h2>`
        }
      )
      break

    default:
      // 其他主题（legal, commentary, aigc, code, notes, life）
      // 均使用纯 CSS 内联样式，无需额外 HTML 装饰
      break
  }

  return result
}
