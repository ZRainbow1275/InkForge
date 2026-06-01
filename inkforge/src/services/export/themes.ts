/**
 * 主题预设和 CSS 生成
 */

import type { ExportPreset, ExportTarget } from '@/types'
import { DEFAULT_PRESET_ID, FONT_STACKS } from '@/constants'
import { PERSONA_FONTS, generatePersonaBaseCSS } from './preset-fonts'
import {
  composeRecipes,
  chainDecorators,
  decorateThesisH3Section,
  decorateThesisHrDots,
  decorateLegalDropCap,
  decorateLegalH2Roman,
  decorateLegalBlockquote,
  decorateReportH1Bar,
  decorateReportH2Badge,
  decorateReportOlNumbers,
  decorateCommentaryH1Bar,
  decorateCommentaryH2Bar,
  decorateCommentaryH3Line,
  decorateCommentaryHrDiamond,
} from './preset-decorations'
import {
  composeSvgDecorate,
  deriveSvgPalette,
  decorateFlagshipH2,
  decorateFlagshipH3,
  decorateFlagshipBlockquote,
  decorateFlagshipLists,
  decorateFlagshipFooterCard,
} from './svg-modules'
import type { SvgInjectionPlan } from './svg-modules'

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

// ─── PR6 (R7): SVG「旗舰」预设族 — 见 SPEC §7.2 ────────────────────────
// 这三个预设全量使用 svg-modules inline-SVG 排版系统：封面 / 标题头 / 分隔 /
// 引用卡 / 结束标，整体视觉身份由 SVG 承载（CSS 仅作 persona 底座 + 主色文本）。
//
// 品牌锁定（brand-locked）：旗舰预设的 SVG 使用预设固定的品牌色（赤陶 Kiln /
// 铜绿 Tempera / 黄铜 Amber，见 docs/inkforge-brand-identity.md §2.1）作为设计
// 意图。Inspector 的 primaryColor 覆盖只会重着色 CSS 部分（链接/标题色），
// SVG 仍保留品牌身份。这是刻意的——旗舰=品牌门面，不随用户改色而散架。
const FLAGSHIP_KILN = '#D95B3F'    // 炉火 · 朱砂 × 赤陶（Kiln，creative）
const FLAGSHIP_TEMPERA = '#3B7A6B' // 冷却铜绿 · 时间与匠心（Tempera，academic）
const FLAGSHIP_AMBER = '#C19A56'   // 熔铸黄铜 · 朴素匠人（Amber，business）

// 旗舰 SVG plan 仅承载「纯图形」母题（封面 + 分隔线）。标题/引用/列表/落款卡
// 改由 html-blocks.ts 的内联色块装饰器承载（文字活、可重排、最贴近真机）。
// 26 个 SVG 模块仍全量注册——旗舰 plan 只是不再 wire 文字类模块。
const flagshipKilnPlan: SvgInjectionPlan = {
  cover: 'cover-grid',
  replaceHr: 'divider-forge',
}

const flagshipTemperaPlan: SvgInjectionPlan = {
  cover: 'cover-title',
  replaceHr: 'divider-diamond',
}

const flagshipAmberPlan: SvgInjectionPlan = {
  cover: 'cover-title',
  replaceHr: 'divider-grid',
}

// 旗舰内联色块装饰器用的品牌调色板（与 SVG 同源 deriveSvgPalette，保证 preview==export）。
const kilnPalette = deriveSvgPalette(FLAGSHIP_KILN, 'creative')
const temperaPalette = deriveSvgPalette(FLAGSHIP_TEMPERA, 'academic')
const amberPalette = deriveSvgPalette(FLAGSHIP_AMBER, 'business')

const FLAGSHIP_BRAND = { brand: '墨铸 · InkForge', tagline: '成为作者吧' }

// 旗舰 decorate 链：SVG 图形（封面/分隔）先行，HTML 色块装饰器（标题/引用/列表）
// 随后，落款卡最后追加。chainDecorators 已在上方 import。
const flagshipKilnDecorate = chainDecorators(
  composeSvgDecorate(flagshipKilnPlan, { primaryColor: FLAGSHIP_KILN, persona: 'creative' }),
  decorateFlagshipH2(kilnPalette, { variant: 'kiln' }),
  decorateFlagshipH3(kilnPalette),
  decorateFlagshipBlockquote(kilnPalette),
  decorateFlagshipLists(kilnPalette),
  decorateFlagshipFooterCard(kilnPalette, FLAGSHIP_BRAND),
)

const flagshipTemperaDecorate = chainDecorators(
  composeSvgDecorate(flagshipTemperaPlan, { primaryColor: FLAGSHIP_TEMPERA, persona: 'academic' }),
  decorateFlagshipH2(temperaPalette, { variant: 'tempera' }),
  decorateFlagshipH3(temperaPalette),
  decorateFlagshipBlockquote(temperaPalette),
  decorateFlagshipLists(temperaPalette),
  decorateFlagshipFooterCard(temperaPalette, FLAGSHIP_BRAND),
)

const flagshipAmberDecorate = chainDecorators(
  composeSvgDecorate(flagshipAmberPlan, { primaryColor: FLAGSHIP_AMBER, persona: 'business' }),
  decorateFlagshipH2(amberPalette, { variant: 'amber' }),
  decorateFlagshipH3(amberPalette),
  decorateFlagshipBlockquote(amberPalette),
  decorateFlagshipLists(amberPalette),
  decorateFlagshipFooterCard(amberPalette, FLAGSHIP_BRAND),
)

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
#nice { --ink-accent: #5a4a3c; background: #faf9f6; font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Crimson Pro', 'EB Garamond', 'Songti SC', serif; color: #2a2a2a; }
#nice p { line-height: 1.95; margin-bottom: 1.1em; text-indent: 2em; }
#nice p:first-of-type { text-indent: 0; }
#nice h1 { font-size: 2.1em; font-weight: 700; text-align: center; margin: 0.2em 0 0.8em; letter-spacing: 0.08em; color: #2a2a2a; font-variant-numeric: oldstyle-nums; padding: 0 0 0.3em; border-bottom: 1px solid #cdbfa9; }
#nice h2 { color: #2a2a2a; text-align: left; letter-spacing: 0.03em; margin-top: 1.8em; font-weight: 700; font-size: 1.45em; padding-bottom: 0.25em; border-bottom: 1px solid #d6c9b2; font-variant-numeric: oldstyle-nums; }
#nice h3 { color: #5a4a3c; font-weight: 600; margin-top: 1.3em; font-size: 1.18em; letter-spacing: 0.02em; font-style: italic; }
#nice h3::before { content: '§ '; color: #8a7659; font-weight: 400; font-style: normal; }
#nice strong { color: #3d2f24; font-weight: 700; }
#nice em { font-family: 'Crimson Pro', 'EB Garamond', Georgia, serif; font-style: italic; color: #4a3a2c; }
#nice blockquote { background: #f4f1ec; border-left: 3px solid #5a4a3c; padding: 0.8em 1.2em; color: #3a3027; font-style: italic; margin: 1.4em 0; }
#nice blockquote p { line-height: 1.85; text-indent: 0; }
#nice ul, #nice ol { padding-left: 1.4em; }
#nice ul li::marker { color: #8a7659; }
#nice code { font-family: 'Crimson Pro', 'EB Garamond', Georgia, serif; font-size: 0.92em; color: #5a4a3c; background: #f0eadf; padding: 0.05em 0.3em; border-radius: 2px; }
#nice a { color: #5a4a3c; border-bottom: 1px solid #b8a589; text-decoration: none; }
#nice hr { border: 0; text-align: center; height: 0; margin: 2em 0; }
#nice hr::before { content: '· · ·'; color: #8a7659; letter-spacing: 1em; font-size: 1.2em; }
#nice table th { background: #5a4a3c; color: #faf9f6; font-weight: 600; letter-spacing: 0.04em; }
#nice table td { font-variant-numeric: oldstyle-nums; }
${thesisRecipesPreview.css}`,
    exportCSS: `${academicBaseCSS}
#nice { background: #faf9f6; }
#nice h1 { font-size: 2.1em; font-weight: 700; text-align: center; margin: 0 0 0.6em; letter-spacing: 0.05em; color: #2a2a2a; }
#nice h2 { color: #2a2a2a; text-align: left; letter-spacing: 0.02em; margin-top: 1.6em; }
#nice h3 { color: #5a4a3c; font-weight: 600; margin-top: 1.2em; }
#nice blockquote { background: #f4f1ec; border-left: 3px solid #5a4a3c; padding: 0.8em 1.2em; color: #2a2a2a; }
#nice table th { background: #5a4a3c; color: #fff; }
${thesisRecipesExport.css}`,
    decorate: chainDecorators(
      thesisRecipesExport.decorate,
      decorateThesisH3Section,
      decorateThesisHrDots,
    ),
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
#nice { --ink-accent: #1a1a2e; font-family: 'Source Han Serif SC', 'Noto Serif SC', 'EB Garamond', 'Songti SC', serif; background: #fbfaf5; color: #1a1a2e; counter-reset: legal-section; }
#nice p { line-height: 1.85; margin-bottom: 1em; text-align: justify; text-indent: 2em; }
#nice p:first-of-type { text-indent: 0; }
#nice p:first-of-type::first-letter { font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif; font-size: 3em; font-weight: 700; float: left; line-height: 0.9; margin: 0.05em 0.12em -0.05em 0; color: #1a1a2e; }
#nice h1 { font-size: 2em; font-weight: 700; text-align: center; margin: 0.2em 0 1em; color: #1a1a2e; letter-spacing: 0.08em; text-transform: uppercase; padding-bottom: 0.4em; border-bottom: 3px double #1a1a2e; }
#nice h2 { color: #1a1a2e; font-weight: 700; margin-top: 2em; font-size: 1.4em; letter-spacing: 0.04em; border-bottom: 1px solid #1a1a2e; padding-bottom: 0.3em; counter-increment: legal-section; }
#nice h2::before { content: '§ ' counter(legal-section, upper-roman) '. '; font-family: 'EB Garamond', Georgia, serif; font-weight: 400; margin-right: 0.3em; color: #3d3d52; }
#nice h3 { color: #1a1a2e; font-weight: 600; font-size: 1.15em; font-style: italic; margin-top: 1.3em; }
#nice strong { color: #1a1a2e; font-weight: 700; text-decoration: underline; text-decoration-color: #b8b8c8; text-underline-offset: 0.2em; }
#nice em { font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif; font-style: italic; }
#nice blockquote { background: #f4f4ee; border-left: 4px double #1a1a2e; padding: 1em 1.3em; color: #1a1a2e; font-style: normal; margin: 1.5em 0; }
#nice blockquote p { text-indent: 0; line-height: 1.8; }
#nice blockquote::before { content: '“'; font-family: 'EB Garamond', Georgia, serif; font-size: 2.5em; color: #1a1a2e; line-height: 0; vertical-align: -0.4em; margin-right: 0.1em; opacity: 0.4; }
#nice ol { padding-left: 2em; }
#nice ol li::marker { font-family: 'EB Garamond', Georgia, serif; font-weight: 600; color: #1a1a2e; }
#nice ul li::marker { color: #1a1a2e; }
#nice code { font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif; font-style: italic; background: #ebebe0; color: #1a1a2e; padding: 0.05em 0.3em; }
#nice a { color: #1a1a2e; border-bottom: 1px solid #1a1a2e; }
#nice hr { border: 0; border-top: 1px solid #1a1a2e; margin: 2em 0; position: relative; }
#nice table th { background: #1a1a2e; color: #fbfaf5; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.92em; }
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
    decorate: chainDecorators(
      decorateLegalDropCap,
      decorateLegalH2Roman,
      decorateLegalBlockquote,
    ),
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
#nice { --ink-accent: #004080; font-family: 'Source Han Sans SC', 'IBM Plex Sans CN', 'Noto Sans SC', 'Inter', 'PingFang SC', sans-serif; background: #ffffff; color: #1A3A5C; counter-reset: report-h2; }
#nice p { line-height: 1.75; margin-bottom: 0.95em; text-align: justify; }
#nice h1 { font-size: 2em; font-weight: 800; margin: 0.2em 0 0.6em; color: #004080; letter-spacing: -0.01em; line-height: 1.25; padding: 0.6em 0.8em; background: #F2F5F9; border-left: 6px solid #004080; }
#nice h1::after { content: ''; display: block; margin-top: 0.4em; width: 60px; height: 3px; background: #004080; }
#nice h2 { color: #004080; font-weight: 700; letter-spacing: 0.01em; margin-top: 2em; font-size: 1.4em; padding-bottom: 0.3em; border-bottom: 2px solid #004080; counter-increment: report-h2; display: flex; align-items: baseline; gap: 0.6em; }
#nice h2::before { content: '0' counter(report-h2); font-family: 'Inter', sans-serif; font-weight: 800; color: #fff; background: #004080; padding: 0.1em 0.5em; font-size: 0.7em; border-radius: 3px; letter-spacing: 0.05em; }
#nice h3 { color: #1A3A5C; font-weight: 600; font-size: 1.15em; margin-top: 1.4em; padding-left: 0.7em; border-left: 3px solid #004080; }
#nice h4 { color: #36474F; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.92em; }
#nice strong { color: #004080; font-weight: 700; background: linear-gradient(180deg, transparent 60%, rgba(0,64,128,0.15) 60%); padding: 0 0.1em; }
#nice em { font-style: normal; color: #004080; font-weight: 600; }
#nice ul li::marker { color: #004080; content: '▸ '; }
#nice ul li { margin-bottom: 0.4em; }
#nice ol { counter-reset: report-li; padding-left: 0; }
#nice ol li { list-style: none; counter-increment: report-li; padding-left: 2.2em; position: relative; margin-bottom: 0.5em; }
#nice ol li::before { content: counter(report-li, decimal-leading-zero); position: absolute; left: 0; top: 0.05em; color: #004080; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.95em; }
#nice blockquote { background: #F5F8FB; border-left: 4px solid #004080; padding: 1em 1.3em; color: #36474F; border-radius: 0 4px 4px 0; }
#nice code { font-family: 'Inter', 'Consolas', monospace; background: #EFF3F7; color: #004080; padding: 0.05em 0.3em; border-radius: 2px; }
#nice table th { background: #F2F5F9; color: #1A3A5C; font-weight: 700; border-bottom: 3px solid #004080; text-transform: uppercase; font-size: 0.88em; letter-spacing: 0.05em; }
#nice table td { border-color: #E6ECF2; font-variant-numeric: tabular-nums; }
#nice a { color: #004080; border-bottom: 1px solid #99B4CC; }
#nice hr { border: 0; height: 3px; background: linear-gradient(90deg, #004080, #004080 60px, #E6ECF2 60px, #E6ECF2); margin: 2em 0; }
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
    decorate: chainDecorators(
      reportRecipesExport.decorate,
      decorateReportH1Bar,
      decorateReportH2Badge,
      decorateReportOlNumbers,
    ),
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
#nice { --ink-accent: #c0392b; font-family: 'Source Han Sans SC', 'IBM Plex Sans CN', 'Noto Sans SC', 'Inter', 'PingFang SC', sans-serif; background: #ffffff; color: #1a1a1a; }
#nice p { line-height: 1.7; margin-bottom: 1em; font-size: 1.02em; }
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0.1em 0 0.4em; color: #1a1a1a; letter-spacing: -0.02em; line-height: 1.15; }
#nice h1::after { content: ''; display: block; width: 80px; height: 5px; background: #c0392b; margin-top: 0.4em; }
#nice h2 { color: #c0392b; font-weight: 900; font-size: 1.65em; margin-top: 1.8em; line-height: 1.3; letter-spacing: -0.01em; position: relative; padding-left: 0.7em; }
#nice h2::before { content: ''; position: absolute; left: 0; top: 0.25em; bottom: 0.25em; width: 6px; background: #c0392b; }
#nice h3 { color: #1a1a1a; font-weight: 800; font-size: 1.22em; margin-top: 1.3em; }
#nice h3::after { content: ''; display: block; width: 28px; height: 2px; background: #c0392b; margin-top: 0.3em; }
#nice strong { color: #c0392b; font-weight: 800; }
#nice em { font-family: 'Inter', 'Source Han Sans SC', sans-serif; font-style: italic; font-weight: 600; color: #1a1a1a; border-bottom: 1px dashed #c0392b; }
#nice blockquote { border-left: 5px solid #c0392b; background: #FFF5F3; padding: 1em 1.3em; margin: 1.4em 0; color: #2a1a17; font-style: italic; font-size: 1.08em; }
#nice blockquote p { line-height: 1.65; }
#nice blockquote::before { content: '“'; font-family: 'Inter', Georgia, serif; font-size: 3em; line-height: 0; vertical-align: -0.5em; color: #c0392b; margin-right: 0.15em; opacity: 0.5; }
#nice ul li { padding-left: 0.2em; margin-bottom: 0.5em; }
#nice ul li::marker { color: #c0392b; content: '— '; }
#nice ol li::marker { color: #c0392b; font-weight: 800; }
#nice code { font-family: 'Inter', 'Consolas', monospace; background: #FFEBE8; color: #c0392b; padding: 0.05em 0.3em; border-radius: 2px; font-weight: 600; }
#nice a { color: #c0392b; font-weight: 600; border-bottom: 2px solid #c0392b; }
#nice hr { border: 0; border-top: 3px solid #c0392b; margin: 2.4em 0; position: relative; }
#nice hr::after { content: '◆'; position: absolute; left: 50%; top: -0.6em; transform: translateX(-50%); color: #c0392b; background: #ffffff; padding: 0 0.6em; font-size: 0.9em; }
#nice table th { background: #c0392b; color: #fff; font-weight: 700; }
${commentaryRecipesPreview.css}`,
    exportCSS: `${businessBaseCSS}
#nice h1 { font-size: 2.2em; font-weight: 900; margin: 0 0 0.5em; color: #1a1a1a; letter-spacing: -0.01em; }
#nice h2 { color: #c0392b; font-weight: 900; font-size: 1.5em; margin-top: 1.6em; }
#nice strong { color: #c0392b; font-weight: 700; }
#nice hr { border: 0; border-top: 2px solid #c0392b; margin: 2.4em 0; }
${commentaryRecipesExport.css}`,
    decorate: chainDecorators(
      commentaryRecipesExport.decorate,
      decorateCommentaryH1Bar,
      decorateCommentaryH2Bar,
      decorateCommentaryH3Line,
      decorateCommentaryHrDiamond,
    ),
    customCSS: `
      #nice h2 { color: #C00000; font-weight: 900; font-size: 22px; margin-top: 32px; }
      #nice strong { color: #C00000; font-weight: 900; }
      #nice blockquote { border-left: 4px solid #C00000; font-style: italic; background: #FFF5F5; border-radius: 0 4px 4px 0; }
      #nice hr { border-top: 2px solid #C00000; margin: 32px 0; }
    `
  },
  // AIGC: 科技商务, 思源黑体 + Inter, h3 竖条 + ornament HR; 数据蓝
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
#nice { --ink-accent: #2563eb; font-family: 'Inter', 'Source Han Sans SC', 'IBM Plex Sans CN', 'Noto Sans SC', 'PingFang SC', sans-serif; background: #ffffff; color: #1a1a1a; counter-reset: aigc-h2; }
#nice p { line-height: 1.75; margin-bottom: 0.95em; }
#nice h1 { font-size: 2.1em; font-weight: 800; margin: 0.2em 0 0.6em; color: #1a1a1a; letter-spacing: -0.01em; line-height: 1.25; padding: 0.5em 0.8em; background: #EFF6FF; border-left: 5px solid #2563eb; }
#nice h1::after { content: ''; display: block; margin-top: 0.4em; width: 80px; height: 3px; background: linear-gradient(90deg, #2563eb, #06b6d4); }
#nice h2 { color: #2563eb; font-weight: 700; margin-top: 1.8em; font-size: 1.4em; padding-bottom: 0.3em; border-bottom: 2px solid #2563eb; padding-left: 0; border-left: none; counter-increment: aigc-h2; }
#nice h2::before { content: '0' counter(aigc-h2); font-family: 'Inter', 'JetBrains Mono', monospace; font-weight: 800; color: #fff; background: #2563eb; padding: 0.1em 0.5em; font-size: 0.7em; border-radius: 3px; margin-right: 0.6em; letter-spacing: 0.05em; }
#nice h3 { color: #1e40af; font-weight: 600; font-size: 1.15em; margin-top: 1.4em; padding-left: 0.7em; border-left: 3px solid #2563eb; text-transform: uppercase; letter-spacing: 0.03em; }
#nice h4 { color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.92em; }
#nice strong { color: #2563eb; font-weight: 700; }
#nice em { font-family: 'Inter', 'Source Han Sans SC', sans-serif; font-style: italic; color: #1e40af; }
#nice code { font-family: 'JetBrains Mono', 'Inter', monospace; background: #1e293b; color: #93c5fd; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
#nice pre { background: #1e293b; border-radius: 6px; padding: 1em; border: 1px solid #334155; }
#nice pre code { color: #e2e8f0; background: transparent; }
#nice blockquote { border-left: 4px solid #2563eb; background: #EFF6FF; padding: 1em 1.3em; color: #1e40af; border-radius: 0 4px 4px 0; }
#nice blockquote p { line-height: 1.7; }
#nice ul li::marker { color: #2563eb; content: '▸ '; }
#nice ol li::marker { color: #2563eb; font-weight: 700; font-family: 'Inter', monospace; }
#nice a { color: #2563eb; border-bottom: 1px solid #93c5fd; text-decoration: none; }
#nice hr { border: 0; height: 3px; background: linear-gradient(90deg, #2563eb, #2563eb 60px, #E2E8F0 60px, #E2E8F0); margin: 2em 0; }
#nice table th { background: #2563eb; color: #fff; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; font-size: 0.88em; }
#nice table td { border-color: #E2E8F0; }
${aigcRecipesPreview.css}`,
    exportCSS: `${businessBaseCSS}
#nice { font-family: 'Inter', 'Source Han Sans SC', 'IBM Plex Sans CN', 'Noto Sans SC', 'PingFang SC', sans-serif; background: #ffffff; color: #1a1a1a; }
#nice p { line-height: 1.75; margin-bottom: 0.95em; }
#nice h1 { font-size: 2.1em; font-weight: 800; margin: 0.2em 0 0.6em; color: #1a1a1a; letter-spacing: -0.01em; line-height: 1.25; padding: 0.5em 0.8em; background: #EFF6FF; border-left: 5px solid #2563eb; }
#nice h2 { color: #2563eb; font-weight: 700; margin-top: 1.8em; font-size: 1.4em; padding-bottom: 0.3em; border-bottom: 2px solid #2563eb; padding-left: 0; border-left: none; }
#nice h3 { color: #1e40af; font-weight: 600; font-size: 1.15em; margin-top: 1.4em; padding-left: 0.7em; border-left: 3px solid #2563eb; letter-spacing: 0.03em; }
#nice h4 { color: #475569; font-weight: 600; letter-spacing: 0.08em; font-size: 0.92em; }
#nice strong { color: #2563eb; font-weight: 700; }
#nice em { font-style: italic; color: #1e40af; }
#nice code { font-family: 'JetBrains Mono', 'Inter', monospace; background: #1e293b; color: #93c5fd; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
#nice pre { background: #1e293b; border-radius: 6px; padding: 1em; border: 1px solid #334155; }
#nice pre code { color: #e2e8f0; background: transparent; }
#nice blockquote { border-left: 4px solid #2563eb; background: #EFF6FF; padding: 1em 1.3em; color: #1e40af; border-radius: 0 4px 4px 0; }
#nice a { color: #2563eb; border-bottom: 1px solid #93c5fd; text-decoration: none; }
#nice hr { border: 0; height: 3px; background: #2563eb; margin: 2em 0; }
#nice table th { background: #2563eb; color: #fff; font-weight: 700; letter-spacing: 0.03em; font-size: 0.88em; }
#nice table td { border-color: #E2E8F0; }
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
#nice { --ink-accent: #16a34a; font-family: 'JetBrains Mono', 'Source Han Sans SC', 'Maple Mono CN', monospace; background: #fafffe; color: #1a1a1a; }
#nice p { line-height: 1.8; margin-bottom: 1em; letter-spacing: 0.01em; }
#nice h1 { font-size: 2em; font-weight: 700; color: #16a34a; margin: 0.2em 0 0.6em; letter-spacing: -0.01em; border-bottom: 2px dashed #16a34a; padding-bottom: 0.3em; font-family: 'JetBrains Mono', monospace; }
#nice h1::before { content: '# '; color: #16a34a; opacity: 0.5; }
#nice h2 { color: #16a34a; font-weight: 700; margin-top: 1.8em; font-size: 1.35em; font-family: 'JetBrains Mono', monospace; }
#nice h2::before { content: '// '; color: #16a34a; opacity: 0.4; font-weight: 400; }
#nice h3 { color: #15803d; font-weight: 600; font-size: 1.1em; margin-top: 1.3em; font-family: 'JetBrains Mono', monospace; }
#nice h3::before { content: '> '; color: #16a34a; opacity: 0.4; font-weight: 400; }
#nice strong { color: #16a34a; font-weight: 700; background: rgba(22,163,74,0.08); padding: 0.05em 0.2em; border-radius: 2px; }
#nice em { font-style: italic; color: #6b7280; }
#nice code { font-family: 'JetBrains Mono', 'Fira Code', monospace; background: #0d1117; color: #7ee787; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
#nice pre { background: #0d1117; border-radius: 6px; padding: 1em; border: 1px solid #30363d; }
#nice pre code { color: #c9d1d9; background: transparent; }
#nice blockquote { border-left: 4px solid #16a34a; background: #0d1117; padding: 1em 1.3em; color: #8b949e; font-family: 'JetBrains Mono', monospace; font-size: 0.95em; border-radius: 0 4px 4px 0; }
#nice blockquote p { line-height: 1.7; }
#nice ul li::marker { color: #16a34a; content: '- '; }
#nice ol li::marker { color: #16a34a; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
#nice a { color: #16a34a; border-bottom: 1px dashed #16a34a; text-decoration: none; }
#nice hr { border: 0; border-top: 1px dashed #16a34a; margin: 2em 0; }
#nice table th { background: #0d1117; color: #7ee787; font-weight: 700; font-family: 'JetBrains Mono', monospace; border-bottom: 2px solid #16a34a; }
#nice table td { border-color: #30363d; font-family: 'JetBrains Mono', monospace; font-size: 0.92em; }
${codeRecipesPreview.css}`,
    exportCSS: `${creativeBaseCSS}
#nice { font-family: 'JetBrains Mono', 'Source Han Sans SC', monospace; background: #fafffe; color: #1a1a1a; }
#nice p { line-height: 1.8; margin-bottom: 1em; letter-spacing: 0.01em; }
#nice h1 { font-size: 2em; font-weight: 700; color: #16a34a; margin: 0.2em 0 0.6em; letter-spacing: -0.01em; border-bottom: 2px dashed #16a34a; padding-bottom: 0.3em; }
#nice h2 { color: #16a34a; font-weight: 700; margin-top: 1.8em; font-size: 1.35em; }
#nice h3 { color: #15803d; font-weight: 600; font-size: 1.1em; margin-top: 1.3em; }
#nice strong { color: #16a34a; font-weight: 700; background: rgba(22,163,74,0.08); padding: 0.05em 0.2em; border-radius: 2px; }
#nice em { font-style: italic; color: #6b7280; }
#nice code { font-family: 'JetBrains Mono', 'Fira Code', monospace; background: #0d1117; color: #7ee787; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
#nice pre { background: #0d1117; border-radius: 6px; padding: 1em; border: 1px solid #30363d; }
#nice pre code { color: #c9d1d9; background: transparent; }
#nice blockquote { border-left: 4px solid #16a34a; background: #0d1117; padding: 1em 1.3em; color: #8b949e; font-size: 0.95em; border-radius: 0 4px 4px 0; }
#nice a { color: #16a34a; border-bottom: 1px dashed #16a34a; text-decoration: none; }
#nice hr { border: 0; border-top: 1px dashed #16a34a; margin: 2em 0; }
#nice table th { background: #0d1117; color: #7ee787; font-weight: 700; border-bottom: 2px solid #16a34a; }
#nice table td { border-color: #30363d; font-size: 0.92em; }
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
#nice { --ink-accent: #d2691e; font-family: 'LXGW WenKai Lite', 'LXGW WenKai', 'Kaiti SC', 'Fraunces', serif; background: #fdfaf3; color: #3d2b1f; }
#nice p { line-height: 2.0; margin-bottom: 1.1em; }
#nice h1 { font-size: 2em; font-weight: 700; color: #5a3a1c; margin: 0.2em 0 0.6em; text-align: center; letter-spacing: 0.04em; }
#nice h1::after { content: ''; display: block; width: 60px; height: 2px; background: #d2691e; margin: 0.5em auto 0; opacity: 0.6; }
#nice h2 { color: #d2691e; font-weight: 600; margin-top: 1.6em; padding: 0.4em 0.8em; background: #fcf4e4; border-radius: 6px; border-left: 4px solid #d2691e; font-size: 1.3em; }
#nice h2::before { content: '\\270F '; font-size: 0.85em; opacity: 0.6; }
#nice h3 { color: #a0522d; font-weight: 600; font-style: italic; font-size: 1.12em; margin-top: 1.3em; }
#nice strong { color: #d2691e; font-weight: 700; background: rgba(255,248,220,0.7); padding: 0.05em 0.25em; border-radius: 3px; }
#nice em { font-family: 'LXGW WenKai Lite', 'Fraunces', serif; font-style: italic; color: #8b6914; }
#nice code { font-family: 'LXGW WenKai Lite', monospace; background: rgba(210,105,30,0.08); color: #a0522d; padding: 0.1em 0.35em; border-radius: 4px; }
#nice blockquote { border-left: 4px solid #d2691e; background: #FFF8DC; padding: 1em 1.3em; color: #5a3a1c; border-radius: 0 8px 8px 0; font-style: italic; }
#nice blockquote p { line-height: 1.85; }
#nice ul li::marker { color: #d2691e; }
#nice ol li::marker { color: #d2691e; font-weight: 600; }
#nice a { color: #d2691e; border-bottom: 1px solid #e6c9a8; text-decoration: none; }
#nice table th { background: #d2691e; color: #fff; font-weight: 600; }
#nice table td { border-color: #e6d5c3; }
${notesRecipesPreview.css}`,
    exportCSS: `${lifestyleBaseCSS}
#nice { font-family: 'LXGW WenKai Lite', 'LXGW WenKai', 'Kaiti SC', 'Fraunces', serif; background: #fdfaf3; color: #3d2b1f; }
#nice p { line-height: 2.0; margin-bottom: 1.1em; }
#nice h1 { font-size: 2em; font-weight: 700; color: #5a3a1c; margin: 0.2em 0 0.6em; text-align: center; letter-spacing: 0.04em; }
#nice h2 { color: #d2691e; font-weight: 600; margin-top: 1.6em; padding: 0.4em 0.8em; background: #fcf4e4; border-radius: 6px; border-left: 4px solid #d2691e; font-size: 1.3em; }
#nice h3 { color: #a0522d; font-weight: 600; font-style: italic; font-size: 1.12em; margin-top: 1.3em; }
#nice strong { color: #d2691e; font-weight: 700; background: rgba(255,248,220,0.7); padding: 0.05em 0.25em; border-radius: 3px; }
#nice em { font-style: italic; color: #8b6914; }
#nice code { background: rgba(210,105,30,0.08); color: #a0522d; padding: 0.1em 0.35em; border-radius: 4px; }
#nice blockquote { border-left: 4px solid #d2691e; background: #FFF8DC; padding: 1em 1.3em; color: #5a3a1c; border-radius: 0 8px 8px 0; font-style: italic; }
#nice a { color: #d2691e; border-bottom: 1px solid #e6c9a8; text-decoration: none; }
#nice table th { background: #d2691e; color: #fff; font-weight: 600; }
#nice table td { border-color: #e6d5c3; }
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
#nice { --ink-accent: #0f172a; font-family: 'Space Grotesk', 'Source Han Sans SC', 'PingFang SC', sans-serif; background: #ffffff; color: #0f172a; }
#nice p { line-height: 1.65; margin-bottom: 0.85em; text-align: justify; }
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0.1em 0 0.5em; color: #0f172a; letter-spacing: -0.02em; text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 0.3em; line-height: 1.15; }
#nice h1::after { content: ''; display: block; width: 40px; height: 3px; background: #dc2626; margin: 0.4em auto 0; }
#nice h2 { color: #0f172a; font-weight: 900; font-size: 1.5em; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1.8em; border-bottom: 2px solid #0f172a; padding-bottom: 0.25em; }
#nice h3 { color: #0f172a; font-weight: 800; font-size: 1.15em; border-left: 4px solid #dc2626; padding-left: 0.6em; margin-top: 1.3em; font-style: italic; }
#nice h4 { color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.9em; }
#nice strong { color: #dc2626; font-weight: 900; }
#nice em { font-style: italic; color: #475569; }
#nice blockquote { border-left: 4px solid #dc2626; background: transparent; padding: 0.8em 1.2em; color: #334155; font-style: italic; font-size: 1.05em; }
#nice blockquote::before { content: '\\201C'; font-size: 3em; line-height: 0; vertical-align: -0.5em; color: #dc2626; margin-right: 0.1em; opacity: 0.4; font-family: Georgia, serif; }
#nice code { background: #f1f5f9; color: #0f172a; padding: 0.1em 0.35em; border-radius: 2px; font-weight: 600; }
#nice ul li::marker { color: #dc2626; font-weight: 900; }
#nice ol li::marker { color: #0f172a; font-weight: 900; }
#nice a { color: #0f172a; border-bottom: 1px solid #0f172a; font-weight: 600; }
#nice hr { border: 0; border-top: 1px solid #0f172a; margin: 1.8em 0; }
#nice table th { background: #0f172a; color: #fff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.88em; }
#nice table td { border-color: #e2e8f0; }
${newsRecipesPreview.css}`,
    exportCSS: `${creativeBaseCSS}
#nice { font-family: 'Space Grotesk', 'Source Han Sans SC', 'PingFang SC', sans-serif; background: #ffffff; color: #0f172a; }
#nice p { line-height: 1.65; margin-bottom: 0.85em; }
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0.1em 0 0.5em; color: #0f172a; letter-spacing: -0.02em; text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 0.3em; line-height: 1.15; }
#nice h2 { color: #0f172a; font-weight: 900; font-size: 1.5em; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1.8em; border-bottom: 2px solid #0f172a; padding-bottom: 0.25em; }
#nice h3 { color: #0f172a; font-weight: 800; font-size: 1.15em; border-left: 4px solid #dc2626; padding-left: 0.6em; margin-top: 1.3em; font-style: italic; }
#nice h4 { color: #475569; font-weight: 700; letter-spacing: 0.06em; font-size: 0.9em; }
#nice strong { color: #dc2626; font-weight: 900; }
#nice em { font-style: italic; color: #475569; }
#nice blockquote { border-left: 4px solid #dc2626; background: transparent; padding: 0.8em 1.2em; color: #334155; font-style: italic; font-size: 1.05em; }
#nice code { background: #f1f5f9; color: #0f172a; padding: 0.1em 0.35em; border-radius: 2px; font-weight: 600; }
#nice a { color: #0f172a; border-bottom: 1px solid #0f172a; font-weight: 600; }
#nice hr { border: 0; border-top: 1px solid #0f172a; margin: 1.8em 0; }
#nice table th { background: #0f172a; color: #fff; font-weight: 700; letter-spacing: 0.04em; font-size: 0.88em; }
#nice table td { border-color: #e2e8f0; }
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
#nice { --ink-accent: #ff006e; font-family: 'Smiley Sans', 'Source Han Sans SC', 'PingFang SC', sans-serif; background: #fffbfc; color: #1a1a1a; }
#nice p { line-height: 1.9; margin-bottom: 1.1em; }
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0.1em 0 0.5em; color: #ff006e; letter-spacing: -0.02em; font-family: 'Smiley Sans', 'Source Han Sans SC', sans-serif; line-height: 1.15; font-style: italic; }
#nice h1::after { content: ''; display: block; width: 100px; height: 4px; background: linear-gradient(90deg, #ff006e, #ff6b9d, #ff006e); margin-top: 0.3em; border-radius: 2px; }
#nice h2 { background: #ff006e; color: #fff; padding: 0.5em 0.8em; border-radius: 8px; margin-top: 1.6em; margin-bottom: 0.9em; font-weight: 800; font-size: 1.4em; font-family: 'Smiley Sans', 'Source Han Sans SC', sans-serif; }
#nice h3 { color: #ff006e; font-weight: 700; font-size: 1.15em; border-left: 4px solid #ff006e; padding-left: 0.6em; margin-top: 1.3em; font-style: italic; }
#nice strong { color: #ff006e; font-weight: 900; background: rgba(255,0,110,0.08); padding: 0.05em 0.2em; border-radius: 3px; }
#nice em { font-style: italic; color: #a855f7; font-weight: 500; }
#nice code { font-family: 'Smiley Sans', monospace; background: rgba(255,0,110,0.1); color: #ff006e; padding: 0.15em 0.4em; border-radius: 6px; font-weight: 600; }
#nice blockquote { border-left: 5px solid #ff006e; background: #fff0f5; border-radius: 0 16px 16px 0; padding: 1em 1.3em; color: #8b2252; font-style: italic; }
#nice blockquote p { line-height: 1.75; }
#nice ul li::marker { color: #ff006e; content: '\\2726 '; }
#nice ol li::marker { color: #ff006e; font-weight: 900; }
#nice a { color: #ff006e; font-weight: 600; border-bottom: 2px solid #ff6b9d; text-decoration: none; }
#nice hr { border: 0; border-top: 3px dashed #ff006e; margin: 2em 0; }
#nice table th { background: #ff006e; color: #fff; font-weight: 700; }
#nice table td { border-color: #ffd6e7; }
${memeRecipesPreview.css}`,
    exportCSS: `${creativeBaseCSS}
#nice { font-family: 'Smiley Sans', 'Source Han Sans SC', 'PingFang SC', sans-serif; background: #fffbfc; color: #1a1a1a; }
#nice p { line-height: 1.9; margin-bottom: 1.1em; }
#nice h1 { font-size: 2.4em; font-weight: 900; margin: 0.1em 0 0.5em; color: #ff006e; letter-spacing: -0.02em; font-family: 'Smiley Sans', 'Source Han Sans SC', sans-serif; line-height: 1.15; font-style: italic; }
#nice h2 { background: #ff006e; color: #fff; padding: 0.5em 0.8em; border-radius: 8px; margin-top: 1.6em; margin-bottom: 0.9em; font-weight: 800; font-size: 1.4em; }
#nice h3 { color: #ff006e; font-weight: 700; font-size: 1.15em; border-left: 4px solid #ff006e; padding-left: 0.6em; margin-top: 1.3em; font-style: italic; }
#nice strong { color: #ff006e; font-weight: 900; background: rgba(255,0,110,0.08); padding: 0.05em 0.2em; border-radius: 3px; }
#nice em { font-style: italic; color: #a855f7; font-weight: 500; }
#nice code { background: rgba(255,0,110,0.1); color: #ff006e; padding: 0.15em 0.4em; border-radius: 6px; font-weight: 600; }
#nice blockquote { border-left: 5px solid #ff006e; background: #fff0f5; border-radius: 0 16px 16px 0; padding: 1em 1.3em; color: #8b2252; font-style: italic; }
#nice a { color: #ff006e; font-weight: 600; border-bottom: 2px solid #ff6b9d; text-decoration: none; }
#nice hr { border: 0; border-top: 3px dashed #ff006e; margin: 2em 0; }
#nice table th { background: #ff006e; color: #fff; font-weight: 700; }
#nice table td { border-color: #ffd6e7; }
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
#nice { --ink-accent: #a0522d; font-family: 'Fraunces', 'LXGW WenKai Lite', 'Crimson Pro', Georgia, serif; background: #fefcf8; color: #3d2b1f; }
#nice p { line-height: 2.0; margin-bottom: 1.3em; }
#nice h1 { font-size: 2em; font-weight: 500; text-align: center; color: #5a3a1c; letter-spacing: 0.04em; margin: 0.2em 0 1em; font-family: 'Fraunces', 'Crimson Pro', Georgia, serif; }
#nice h1::after { content: ''; display: block; width: 80px; height: 1px; background: #d4b896; margin: 0.6em auto 0; }
#nice h2 { color: #a0522d; font-weight: 500; font-size: 1.35em; letter-spacing: 0.04em; border-bottom: 1px solid #d4b896; padding-bottom: 0.4em; margin-top: 2em; font-style: italic; }
#nice h3 { color: #8b4513; font-weight: 500; font-size: 1.1em; letter-spacing: 0.02em; margin-top: 1.5em; }
#nice strong { color: #a0522d; font-weight: 600; }
#nice em { font-family: 'Fraunces', 'Crimson Pro', Georgia, serif; font-style: italic; color: #6b5a4a; }
#nice blockquote { border-left: 3px solid #d4b896; color: #6b5a4a; font-style: italic; background: rgba(212,184,150,0.08); padding: 1em 1.3em; border-radius: 0 4px 4px 0; }
#nice blockquote p { line-height: 1.85; }
#nice code { font-family: 'Crimson Pro', Georgia, monospace; background: rgba(160,82,45,0.06); color: #8b4513; padding: 0.1em 0.3em; border-radius: 3px; font-style: italic; }
#nice ul li::marker { color: #d4b896; }
#nice ol li::marker { color: #a0522d; font-weight: 500; }
#nice a { color: #a0522d; border-bottom: 1px solid #d4b896; text-decoration: none; }
#nice table th { background: #a0522d; color: #fefcf8; font-weight: 500; letter-spacing: 0.03em; }
#nice table td { border-color: #e6d5c3; }
${lifeRecipesPreview.css}`,
    exportCSS: `${lifestyleBaseCSS}
#nice { font-family: 'Fraunces', 'LXGW WenKai Lite', 'Crimson Pro', Georgia, serif; background: #fefcf8; color: #3d2b1f; }
#nice p { line-height: 2.0; margin-bottom: 1.3em; }
#nice h1 { font-size: 2em; font-weight: 500; text-align: center; color: #5a3a1c; letter-spacing: 0.04em; margin: 0.2em 0 1em; }
#nice h2 { color: #a0522d; font-weight: 500; font-size: 1.35em; letter-spacing: 0.04em; border-bottom: 1px solid #d4b896; padding-bottom: 0.4em; margin-top: 2em; font-style: italic; }
#nice h3 { color: #8b4513; font-weight: 500; font-size: 1.1em; letter-spacing: 0.02em; margin-top: 1.5em; }
#nice strong { color: #a0522d; font-weight: 600; }
#nice em { font-style: italic; color: #6b5a4a; }
#nice blockquote { border-left: 3px solid #d4b896; color: #6b5a4a; font-style: italic; background: rgba(212,184,150,0.08); padding: 1em 1.3em; border-radius: 0 4px 4px 0; }
#nice code { background: rgba(160,82,45,0.06); color: #8b4513; padding: 0.1em 0.3em; border-radius: 3px; font-style: italic; }
#nice a { color: #a0522d; border-bottom: 1px solid #d4b896; text-decoration: none; }
#nice table th { background: #a0522d; color: #fefcf8; font-weight: 500; letter-spacing: 0.03em; }
#nice table td { border-color: #e6d5c3; }
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
#nice { --ink-accent: #4a3c5a; font-family: ${PERSONA_FONTS.academic.cjk}, ${PERSONA_FONTS.academic.latin}; background: #fafaf6; color: #2a2438; }
#nice p { line-height: 1.95; margin-bottom: 1.2em; text-indent: 2em; }
#nice p:first-of-type { text-indent: 0; }
#nice p:first-of-type::first-letter { font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif; font-size: 3em; font-weight: 700; float: left; line-height: 0.85; margin: 0.05em 0.12em -0.05em 0; color: #4a3c5a; }
#nice h1 { font-size: 2.2em; font-weight: 600; text-align: center; color: #2a2438; letter-spacing: 0.04em; margin: 0.2em 0 1em; font-family: 'Source Han Serif SC', 'EB Garamond', Georgia, serif; }
#nice h1::after { content: ''; display: block; width: 120px; height: 1px; background: #4a3c5a; margin: 0.5em auto 0; opacity: 0.4; }
#nice h2 { color: #4a3c5a; font-weight: 600; font-size: 1.4em; border-left: 0 !important; border-bottom: 2px double #4a3c5a; background: transparent !important; padding: 0 0 0.4em 0 !important; margin: 2em 0 1em 0; letter-spacing: 0.03em; }
#nice h3 { color: #4a3c5a; font-weight: 600; font-size: 1.15em; font-style: italic; margin-top: 1.4em; }
#nice strong { color: #4a3c5a; font-weight: 700; }
#nice em { font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif; font-style: italic; color: #6b5a7a; }
#nice blockquote { border-left: 3px solid #4a3c5a; background: #f4f2f8; font-style: italic; padding: 1em 1.3em; color: #3a3048; border-radius: 0 4px 4px 0; }
#nice blockquote p { line-height: 1.85; text-indent: 0; }
#nice code { font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif; background: rgba(74,60,90,0.06); color: #4a3c5a; padding: 0.05em 0.3em; border-radius: 2px; font-style: italic; }
#nice ul li::marker { color: #4a3c5a; }
#nice ol li::marker { color: #4a3c5a; font-weight: 600; }
#nice a { color: #4a3c5a; border-bottom: 1px solid #c4b6d8; text-decoration: none; }
#nice table th { background: #4a3c5a; color: #fafaf6; font-weight: 600; letter-spacing: 0.03em; }
#nice table td { border-color: #d8d0e0; }
${elegantRecipesPreview.css}`,
    exportCSS: `${lifestyleBaseCSS}
#nice { font-family: ${PERSONA_FONTS.academic.cjk}, ${PERSONA_FONTS.academic.latin}; background: #fafaf6; color: #2a2438; }
#nice p { line-height: 1.95; margin-bottom: 1.2em; }
#nice h1 { font-size: 2.2em; font-weight: 600; text-align: center; color: #2a2438; letter-spacing: 0.04em; margin: 0.2em 0 1em; }
#nice h2 { color: #4a3c5a; font-weight: 600; font-size: 1.4em; border-left: 0 !important; border-bottom: 2px double #4a3c5a; background: transparent !important; padding: 0 0 0.4em 0 !important; margin: 2em 0 1em 0; letter-spacing: 0.03em; }
#nice h3 { color: #4a3c5a; font-weight: 600; font-size: 1.15em; font-style: italic; margin-top: 1.4em; }
#nice strong { color: #4a3c5a; font-weight: 700; }
#nice em { font-style: italic; color: #6b5a7a; }
#nice blockquote { border-left: 3px solid #4a3c5a; background: #f4f2f8; font-style: italic; padding: 1em 1.3em; color: #3a3048; border-radius: 0 4px 4px 0; }
#nice code { background: rgba(74,60,90,0.06); color: #4a3c5a; padding: 0.05em 0.3em; border-radius: 2px; font-style: italic; }
#nice a { color: #4a3c5a; border-bottom: 1px solid #c4b6d8; text-decoration: none; }
#nice table th { background: #4a3c5a; color: #fafaf6; font-weight: 600; letter-spacing: 0.03em; }
#nice table td { border-color: #d8d0e0; }
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
#nice { --ink-accent: #6366f1; font-family: 'Space Grotesk', 'Source Han Sans SC', 'PingFang SC', sans-serif; background: #fafaff; color: #1a1a2e; }
#nice p { line-height: 1.8; margin-bottom: 1em; }
#nice h1 { font-size: 2.1em; font-weight: 800; margin: 0.2em 0 0.6em; color: #4338ca; letter-spacing: -0.01em; padding: 0.5em 0.8em; background: #6366f1; color: #fff; border-radius: 4px; line-height: 1.3; }
#nice h1::after { content: ''; display: block; margin-top: 0.3em; width: 50px; height: 3px; background: rgba(255,255,255,0.5); border-radius: 2px; }
#nice h2 { background: #6366f1; color: #fff; padding: 0.5em 0.8em; border-radius: 4px; margin-top: 1.6em; margin-bottom: 0.9em; font-weight: 700; font-size: 1.35em; }
#nice h2::before { content: '[0x] '; font-family: 'JetBrains Mono', 'Space Grotesk', monospace; font-weight: 400; opacity: 0.6; font-size: 0.8em; }
#nice h3 { color: #6366f1; font-weight: 600; font-size: 1.12em; border-left: 3px solid #6366f1; padding-left: 0.6em; margin-top: 1.3em; }
#nice h4 { color: #4338ca; font-weight: 600; letter-spacing: 0.04em; font-size: 0.92em; }
#nice strong { color: #6366f1; font-weight: 700; }
#nice em { font-style: italic; color: #818cf8; }
#nice code { font-family: 'JetBrains Mono', 'Space Grotesk', monospace; background: rgba(99,102,241,0.08); color: #4338ca; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
#nice pre { background: #1e1b4b; border-radius: 6px; padding: 1em; border: 1px solid #312e81; }
#nice pre code { color: #c7d2fe; background: transparent; }
#nice blockquote { border-left: 4px solid #6366f1; background: #eef2ff; border-radius: 0 4px 4px 0; padding: 1em 1.3em; color: #3730a3; }
#nice blockquote p { line-height: 1.7; }
#nice ul li::marker { color: #6366f1; }
#nice ol li::marker { color: #6366f1; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
#nice a { color: #6366f1; border-bottom: 1px solid #a5b4fc; text-decoration: none; }
#nice hr { border: 0; height: 3px; background: linear-gradient(90deg, #6366f1, #8b5cf6); margin: 2em 0; border-radius: 2px; }
#nice table th { background: #6366f1; color: #fff; font-weight: 700; letter-spacing: 0.03em; }
#nice table td { border-color: #e0e7ff; }
${techRecipesPreview.css}`,
    exportCSS: `${creativeBaseCSS}
#nice { font-family: 'Space Grotesk', 'Source Han Sans SC', 'PingFang SC', sans-serif; background: #fafaff; color: #1a1a2e; }
#nice p { line-height: 1.8; margin-bottom: 1em; }
#nice h1 { font-size: 2.1em; font-weight: 800; margin: 0.2em 0 0.6em; padding: 0.5em 0.8em; background: #6366f1; color: #fff; border-radius: 4px; line-height: 1.3; }
#nice h2 { background: #6366f1; color: #fff; padding: 0.5em 0.8em; border-radius: 4px; margin-top: 1.6em; margin-bottom: 0.9em; font-weight: 700; font-size: 1.35em; }
#nice h3 { color: #6366f1; font-weight: 600; font-size: 1.12em; border-left: 3px solid #6366f1; padding-left: 0.6em; margin-top: 1.3em; }
#nice h4 { color: #4338ca; font-weight: 600; letter-spacing: 0.04em; font-size: 0.92em; }
#nice strong { color: #6366f1; font-weight: 700; }
#nice em { font-style: italic; color: #818cf8; }
#nice code { font-family: 'JetBrains Mono', 'Space Grotesk', monospace; background: rgba(99,102,241,0.08); color: #4338ca; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
#nice pre { background: #1e1b4b; border-radius: 6px; padding: 1em; border: 1px solid #312e81; }
#nice pre code { color: #c7d2fe; background: transparent; }
#nice blockquote { border-left: 4px solid #6366f1; background: #eef2ff; border-radius: 0 4px 4px 0; padding: 1em 1.3em; color: #3730a3; }
#nice a { color: #6366f1; border-bottom: 1px solid #a5b4fc; text-decoration: none; }
#nice hr { border: 0; height: 3px; background: #6366f1; margin: 2em 0; border-radius: 2px; }
#nice table th { background: #6366f1; color: #fff; font-weight: 700; letter-spacing: 0.03em; }
#nice table td { border-color: #e0e7ff; }
${techRecipesExport.css}`,
    decorate: (html: string, target: ExportTarget): string => techRecipesExport.decorate(html, target),
    customCSS: `
      #nice { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.8; }
      #nice p { margin-bottom: 1em; }
      #nice blockquote { border-left: 4px solid #6366f1; background: #f0f0ff; border-radius: 0 8px 8px 0; }
    `
  },
  // ─── PR6 (R7) SVG 旗舰预设族 — 全量 inline-SVG 排版（SPEC §7.2） ───────
  // 视觉身份由 svg-modules 承载（封面/标题头/分隔/引用卡/结束标 + SMIL 交互）。
  // CSS 仅提供 persona 底座（22em 行长锁 + 字体）与主色文本，故 previewCSS /
  // exportCSS 复用 persona base CSS 加最小主色块即可，不再重复造装饰。
  // 品牌锁定：decorate 内的 SVG 用预设固定品牌色（Inspector 改色只动 CSS 部分）。
  //
  // FLAGSHIP-KILN: 赤陶旗舰, creative, Kiln #D95B3F; cover-grid + ribbon/vrule
  //                标题 + Forge 分隔 + 大引号 + vessel 结束标。
  {
    id: 'flagship-kiln',
    name: '赤陶旗舰',
    icon: 'flagship-kiln',
    description: 'SVG 旗舰 · 赤陶炉火，构成主义',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: FLAGSHIP_KILN,
    isUseIndent: false,
    isUseJustify: false,
    persona: 'creative',
    fonts: PERSONA_FONTS.creative,
    previewCSS: `${creativeBaseCSS}
#nice { background: #ffffff; color: #1a1a1a; }
#nice strong { color: ${FLAGSHIP_KILN}; font-weight: 700; background: rgba(217,91,63,0.12); padding: 0 0.12em; border-radius: 3px; }
#nice a { color: ${FLAGSHIP_KILN}; border-bottom: 1px solid ${FLAGSHIP_KILN}; text-decoration: none; }
#nice code { background: rgba(217,91,63,0.08); color: ${FLAGSHIP_KILN}; padding: 0.1em 0.35em; border-radius: 3px; }
#nice table th { background: ${FLAGSHIP_KILN}; color: #fff; font-weight: 700; }`,
    exportCSS: `${creativeBaseCSS}
#nice { background: #ffffff; color: #1a1a1a; }
#nice strong { color: ${FLAGSHIP_KILN}; font-weight: 700; background: rgba(217,91,63,0.12); padding: 0 0.12em; border-radius: 3px; }
#nice a { color: ${FLAGSHIP_KILN}; border-bottom: 1px solid ${FLAGSHIP_KILN}; text-decoration: none; }
#nice code { background: rgba(217,91,63,0.08); color: ${FLAGSHIP_KILN}; padding: 0.1em 0.35em; border-radius: 3px; }
#nice table th { background: ${FLAGSHIP_KILN}; color: #fff; font-weight: 700; }`,
    // 品牌锁定：SVG 图形 + HTML 色块装饰器全用 Kiln 品牌色（见上方注释）。
    decorate: flagshipKilnDecorate,
    customCSS: ''
  },
  // FLAGSHIP-TEMPERA: 铜绿旗舰, academic, Tempera #3B7A6B; cover-title +
  //                   bracket/vrule 标题 + 菱形分隔 + 角标引用 + 全文完结束标。
  {
    id: 'flagship-tempera',
    name: '铜绿旗舰',
    icon: 'flagship-tempera',
    description: 'SVG 旗舰 · 铜绿匠心，学术沉静',
    theme: 'grace',
    fontFamily: 'serif',
    fontSize: '15px',
    primaryColor: FLAGSHIP_TEMPERA,
    isUseIndent: false,
    isUseJustify: true,
    persona: 'academic',
    fonts: PERSONA_FONTS.academic,
    previewCSS: `${academicBaseCSS}
#nice { background: #ffffff; color: #2a2a2a; }
#nice strong { color: ${FLAGSHIP_TEMPERA}; font-weight: 700; background: rgba(59,122,107,0.10); padding: 0 0.12em; border-radius: 3px; }
#nice a { color: ${FLAGSHIP_TEMPERA}; border-bottom: 1px solid ${FLAGSHIP_TEMPERA}; text-decoration: none; }
#nice code { background: rgba(59,122,107,0.08); color: ${FLAGSHIP_TEMPERA}; padding: 0.1em 0.35em; border-radius: 3px; }
#nice table th { background: ${FLAGSHIP_TEMPERA}; color: #fff; font-weight: 600; }`,
    exportCSS: `${academicBaseCSS}
#nice { background: #ffffff; color: #2a2a2a; }
#nice strong { color: ${FLAGSHIP_TEMPERA}; font-weight: 700; background: rgba(59,122,107,0.10); padding: 0 0.12em; border-radius: 3px; }
#nice a { color: ${FLAGSHIP_TEMPERA}; border-bottom: 1px solid ${FLAGSHIP_TEMPERA}; text-decoration: none; }
#nice code { background: rgba(59,122,107,0.08); color: ${FLAGSHIP_TEMPERA}; padding: 0.1em 0.35em; border-radius: 3px; }
#nice table th { background: ${FLAGSHIP_TEMPERA}; color: #fff; font-weight: 600; }`,
    // 品牌锁定：SVG 图形 + HTML 色块装饰器全用 Tempera 品牌色（见上方注释）。
    decorate: flagshipTemperaDecorate,
    customCSS: ''
  },
  // FLAGSHIP-AMBER: 黄铜旗舰, business, Amber #C19A56; cover-title + vrule
  //                 标题 + 网格分隔 + 左竖条引用 + 细线署名结束标。
  {
    id: 'flagship-amber',
    name: '黄铜旗舰',
    icon: 'flagship-amber',
    description: 'SVG 旗舰 · 熔铸黄铜，商务克制',
    theme: 'default',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    primaryColor: FLAGSHIP_AMBER,
    isUseIndent: false,
    isUseJustify: true,
    persona: 'business',
    fonts: PERSONA_FONTS.business,
    previewCSS: `${businessBaseCSS}
#nice { background: #ffffff; color: #1a1a1a; }
#nice strong { color: #1a1a1a; font-weight: 700; background: rgba(193,154,86,0.22); padding: 0 0.12em; border-radius: 3px; }
#nice a { color: #8a6c2e; border-bottom: 1px solid ${FLAGSHIP_AMBER}; text-decoration: none; }
#nice code { background: rgba(193,154,86,0.1); color: #8a6c2e; padding: 0.1em 0.35em; border-radius: 3px; }
#nice table th { background: ${FLAGSHIP_AMBER}; color: #fff; font-weight: 700; }`,
    exportCSS: `${businessBaseCSS}
#nice { background: #ffffff; color: #1a1a1a; }
#nice strong { color: #1a1a1a; font-weight: 700; background: rgba(193,154,86,0.22); padding: 0 0.12em; border-radius: 3px; }
#nice a { color: #8a6c2e; border-bottom: 1px solid ${FLAGSHIP_AMBER}; text-decoration: none; }
#nice code { background: rgba(193,154,86,0.1); color: #8a6c2e; padding: 0.1em 0.35em; border-radius: 3px; }
#nice table th { background: ${FLAGSHIP_AMBER}; color: #fff; font-weight: 700; }`,
    // 品牌锁定：SVG 图形 + HTML 色块装饰器全用 Amber 品牌色（见上方注释）。
    decorate: flagshipAmberDecorate,
    customCSS: ''
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

  // Migrated dual-track presets use recipe/preset decorators as the single
  // source of export-only HTML decoration. Keep the legacy path only for
  // meme's strong highlighter, which is not represented by a recipe.
  if (preset.decorate && preset.id !== 'meme') {
    return result
  }

  switch (preset.id) {
    case 'thesis':
      // Thesis decorations (第N章, § h3 prefix, · · · hr ornament) are now
      // handled by the chained decorators in preset.decorate(). The legacy
      // gold-star ★ h2 decorations have been removed to avoid conflict with
      // the cjk-decimal-h2 recipe that injects "第N章" before each h2.
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
