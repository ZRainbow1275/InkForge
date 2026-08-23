/**
 * @vitest-environment happy-dom
 *
 * v4 fidelity fixture — InkForge Signature (墨锻) brand preset.
 *
 * Palette: Graphite #252933 + Kiln #D95B3F + Tempera #3B7A6B + Amber #C19A56 + Vellum #F5F0E6
 * Visual elements:
 *  - H1 centered + ◇ ◇ ◇ Kiln ornament (open diamonds)
 *  - H1 subtitle: Ash italic, EB Garamond
 *  - H2 oversize 01–06 half-transparent Graphite numerals + Forge Line (72px × 3px Amber, left-aligned)
 *  - H3 Tempera green + § prefix italic
 *  - H4 small-caps
 *  - Strong: Amber 22% half-height underline tint
 *  - Drop cap 3.2em Graphite with Kiln left border
 *  - Table: Graphite header + Kiln bottom accent + Vellum/white alternating body
 *  - HR → ◇ ◇ ◇ Kiln ornament
 *  - Dark mode coverage on strong/em/a
 *
 * Run: cd inkforge && npx vitest run __fidelity__/render-real-article-v4.fidelity.test.ts
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { markdownToWechatWithStats } from '@/services/export/wechat'
import { chainDecorators } from '@/services/export/preset-decorations'
import type { ExportPreset, ExportTarget } from '@/types'

import { preprocessArticleForWechat, assertPreprocessLooksReasonable } from './preprocess-article'

// ─── Brand Tokens ─────────────────────────────────────────────────────────

const BRAND = {
  graphite: '#252933',
  kiln:     '#D95B3F',
  tempera:  '#3B7A6B',
  amber:    '#C19A56',
  vellum:   '#F5F0E6',
  ash:      '#6E7580',
  smoke:    '#9B958D',
  hairline: '#DED7CA',
  hearth:   '#EDE7DB',
  char:     '#1A1D24',
  ink:      '#1C1F26',
} as const

const REPO_ROOT = resolve(__dirname, '..', '..')
const ARTICLE_PATH = resolve(REPO_ROOT, 'experiment', '正文1.0.md')
const OUTPUT_DIR = resolve(
  REPO_ROOT,
  '.trellis',
  'tasks',
  '05-26-render-wechat-fidelity-test',
  'output',
)
const OUTPUT_HTML = resolve(OUTPUT_DIR, '正文1.0-wechat-v4.html')
const OUTPUT_STATS = resolve(OUTPUT_DIR, '正文1.0-wechat-v4.stats.json')

// ─── Decorators ───────────────────────────────────────────────────────────

function decorateChapterNumerals(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-num=/i.test(html)) return html
  let counter = 0
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, attrs: string | undefined, content: string) => {
    counter += 1
    const num = String(counter).padStart(2, '0')
    const a = attrs ?? ''
    return (
      `<h2${a}>` +
      `<span data-ink-num="${num}" style="display:block;font-size:2.4em;color:rgba(37,41,51,0.14);` +
      `font-family:'EB Garamond','Crimson Pro',Georgia,serif;font-weight:300;letter-spacing:-0.02em;` +
      `line-height:1;margin-bottom:0.15em;">${num}</span>` +
      `<span data-ink-h2-text="1">${content}</span>` +
      `</h2>`
    )
  })
}

function decorateForgeLine(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-line=/i.test(html)) return html
  const svgLine =
    `<section data-ink-line="1" style="margin:0.5em 0 1.8em;">` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="6" viewBox="0 0 90 6" style="display:block;">` +
    `<defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0%" stop-color="${BRAND.kiln}" stop-opacity="0.9"/>` +
    `<stop offset="100%" stop-color="${BRAND.amber}" stop-opacity="0.5"/>` +
    `</linearGradient></defs>` +
    `<rect width="90" height="3" y="1.5" rx="1.5" fill="url(#fg)"/>` +
    `</svg></section>`
  return html.replace(/<\/h2>/gi, `</h2>${svgLine}`)
}

function decorateTOC(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-toc=/i.test(html)) return html
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  const chapters: { num: string; text: string; id: string }[] = []
  let match: RegExpExecArray | null
  let counter = 0
  while ((match = h2Regex.exec(html)) !== null) {
    counter++
    const raw = match[1].replace(/<[^>]+>/g, '').trim()
    const idMatch = /id="([^"]*)"/.exec(match[0])
    const id = idMatch ? idMatch[1] : ''
    chapters.push({ num: String(counter).padStart(2, '0'), text: raw, id })
  }
  if (chapters.length === 0) return html

  const tocLis = chapters.map(ch =>
    `<li style="margin:0 0 10px;padding:0;list-style:none;line-height:1.6;font-size:14px;color:${BRAND.graphite};">` +
    `<span style="color:${BRAND.kiln};font-family:'EB Garamond',Georgia,serif;font-weight:300;margin-right:8px;">${ch.num}</span>` +
    `${ch.text}</li>`,
  ).join('')

  // SVG collapsible TOC: <style> inside SVG preserved by WeChat,
  // checkbox hack drives expand/collapse via CSS sibling selector.
  // foreignObject lets us embed HTML inside SVG scope (class= survives).
  const expandedH = 60 + chapters.length * 36
  const svgToc =
    `<section data-ink-toc="1" style="margin:2em 0 3em;">` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" style="display:block;overflow:hidden;" viewBox="0 0 375 ${expandedH}">` +
    `<style>` +
    `#ink-toc-chk{display:none;}` +
    `.ink-toc-items{max-height:0!important;overflow:hidden;transition:max-height 0.5s cubic-bezier(0.4,0,0.2,1),opacity 0.4s;opacity:0;}` +
    `#ink-toc-chk:checked~label~.ink-toc-items{max-height:${expandedH}px!important;opacity:1!important;}` +
    `.ink-toc-arrow{display:inline-block;transition:transform 0.3s ease;transform-origin:center;}` +
    `#ink-toc-chk:checked~label .ink-toc-arrow{transform:rotate(180deg);}` +
    `</style>` +
    `<foreignObject width="100%" height="${expandedH}" class="ink-toc-fo">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Source Han Serif SC','Noto Serif SC',serif;">` +
    `<input type="checkbox" id="ink-toc-chk"/>` +
    `<label for="ink-toc-chk" style="display:block;padding:14px 20px;cursor:pointer;background:#FFFFFF;border-right:1px solid ${BRAND.hairline};border-bottom:1px solid ${BRAND.hairline};">` +
    `<span style="font-size:12px;color:${BRAND.ash};letter-spacing:0.12em;font-weight:600;">CONTENTS · 目录</span>` +
    `<span class="ink-toc-arrow" style="float:right;color:${BRAND.kiln};font-size:13px;">▾</span>` +
    `</label>` +
    `<div class="ink-toc-items" style="padding:0 20px;background:#FFFFFF;border-right:1px solid ${BRAND.hairline};">` +
    `<ul style="margin:0;padding:14px 0 16px;">${tocLis}</ul>` +
    `</div>` +
    `</div>` +
    `</foreignObject>` +
    `</svg></section>`

  const h1BottomMatch = /data-ink-h1-bot="1"[^>]*>[\s\S]*?<\/div>/i.exec(html)
  if (h1BottomMatch) {
    const insertPos = (h1BottomMatch.index ?? 0) + h1BottomMatch[0].length
    return html.slice(0, insertPos) + svgToc + html.slice(insertPos)
  }
  const firstH2 = /<h2[\s>]/i.exec(html)
  if (firstH2) {
    return html.slice(0, firstH2.index) + svgToc + html.slice(firstH2.index)
  }
  return html
}

/** SVG ink-brush chapter divider — replaces plain-text ◇◇◇ with animated
 *  ink wash diamond motif. The stroke-dasharray animation creates a "draw-on"
 *  effect when the divider scrolls into view (CSS @keyframes inside SVG). */
function decorateOrnament(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-ornament=/i.test(html)) return html

  const svgDivider =
    `<section data-ink-ornament="1" style="text-align:center;margin:3em 0;">` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="24" viewBox="0 0 200 24" style="display:inline-block;">` +
    `<style>` +
    `.ink-stroke{stroke-dasharray:300;stroke-dashoffset:300;animation:ink-draw 1.5s ease-out forwards;}` +
    `@keyframes ink-draw{to{stroke-dashoffset:0;}}` +
    `</style>` +
    `<line class="ink-stroke" x1="0" y1="12" x2="70" y2="12" stroke="${BRAND.hairline}" stroke-width="1"/>` +
    `<polygon points="90,4 96,12 90,20 84,12" fill="none" stroke="${BRAND.kiln}" stroke-width="1.5" opacity="0.7"/>` +
    `<polygon points="100,6 105,12 100,18 95,12" fill="${BRAND.kiln}" opacity="0.25"/>` +
    `<polygon points="110,4 116,12 110,20 104,12" fill="none" stroke="${BRAND.kiln}" stroke-width="1.5" opacity="0.7"/>` +
    `<line class="ink-stroke" x1="130" y1="12" x2="200" y2="12" stroke="${BRAND.hairline}" stroke-width="1"/>` +
    `</svg></section>`

  let result = html.replace(/<hr\s*\/?>/gi, svgDivider)
  let h2Counter = 0
  result = result.replace(/<h2(\s[^>]*)?>/gi, (match) => {
    h2Counter += 1
    if (h2Counter === 1) return match
    return svgDivider + match
  })
  return result
}

function decorateH1(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-h1-top=/i.test(html)) return html
  return html.replace(
    /(<h1(\s[^>]*)?>[\s\S]*?<\/h1>)\s*(<p(\s[^>]*)?>\s*<em[^>]*>[\s\S]*?<\/em>\s*<\/p>)?/i,
    (_m, h1: string, _attrs: string | undefined, subtitleP: string | undefined) => {
      const svgFlourish = (id: string) =>
        `<section data-ink-${id}="1" style="text-align:center;margin:${id === 'h1-top' ? '2.4em' : '0.5em'} 0 ${id === 'h1-bot' ? '2.8em' : '0.6em'};">` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="20" viewBox="0 0 180 20" style="display:inline-block;">` +
        `<style>.fl{stroke-dasharray:200;stroke-dashoffset:200;animation:fld 1.8s ease-out forwards;}@keyframes fld{to{stroke-dashoffset:0;}}</style>` +
        `<line class="fl" x1="0" y1="10" x2="60" y2="10" stroke="${BRAND.hairline}" stroke-width="0.8"/>` +
        `<path d="M70,10 L78,3 L86,10 L78,17 Z" fill="none" stroke="${BRAND.kiln}" stroke-width="1.2" opacity="0.8"/>` +
        `<circle cx="90" cy="10" r="2" fill="${BRAND.kiln}" opacity="0.5"/>` +
        `<path d="M94,10 L102,3 L110,10 L102,17 Z" fill="none" stroke="${BRAND.kiln}" stroke-width="1.2" opacity="0.8"/>` +
        `<line class="fl" x1="120" y1="10" x2="180" y2="10" stroke="${BRAND.hairline}" stroke-width="0.8"/>` +
        `</svg></section>`
      const top = svgFlourish('h1-top')
      const divider =
        `<section data-ink-h1-divider="1" style="text-align:center;margin:0.6em 0 0.5em;">` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="4" viewBox="0 0 100 4" style="display:inline-block;">` +
        `<defs><linearGradient id="hd" x1="0" y1="0" x2="1" y2="0">` +
        `<stop offset="0%" stop-color="${BRAND.kiln}" stop-opacity="0"/>` +
        `<stop offset="50%" stop-color="${BRAND.kiln}" stop-opacity="0.6"/>` +
        `<stop offset="100%" stop-color="${BRAND.kiln}" stop-opacity="0"/>` +
        `</linearGradient></defs>` +
        `<rect width="100" height="1" y="1.5" fill="url(#hd)"/>` +
        `</svg></section>`
      const bottom = svgFlourish('h1-bot')
      let subtitle = subtitleP ?? ''
      if (subtitle) {
        const subtitleStyle =
          `text-align:center;font-family:'EB Garamond','Crimson Pro',Georgia,serif;` +
          `font-style:italic;color:${BRAND.ash};letter-spacing:0.06em;font-size:1.0em;` +
          `margin:0.3em 0 0;text-indent:0;`
        if (/<p\s+[^>]*style=/i.test(subtitle)) {
          subtitle = subtitle.replace(
            /<p(\s[^>]*?)style=("[^"]*"|'[^']*')([^>]*)>/i,
            (_m, before: string, styleVal: string, after: string) => {
              const inner = styleVal.slice(1, -1).replace(/;\s*$/, '')
              return `<p${before}style="${inner};${subtitleStyle}"${after} data-ink-subtitle="1">`
            },
          )
        } else {
          subtitle = subtitle.replace(
            /<p(\s[^>]*)?>/i,
            `<p$1 data-ink-subtitle="1" style="${subtitleStyle}">`,
          )
        }
        subtitle = subtitle.replace(
          /<em(\s[^>]*?)?style=("[^"]*"|'[^']*')([^>]*?)>/i,
          (_m, before: string | undefined, styleVal: string, after: string) => {
            const b = before ?? ''
            const inner = styleVal.slice(1, -1).replace(/;\s*$/, '')
            const emOverride = `color:${BRAND.ash};font-size:1em;letter-spacing:0.04em;`
            return `<em${b}style="${inner};${emOverride}"${after}>`
          },
        )
      }
      return `${top}${h1}${subtitle}${divider}${bottom}`
    },
  )
}

function decorateImageFrame(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-img=/i.test(html)) return html
  return html.replace(
    /<img([^>]*?)>/gi,
    (_m, attrs: string) => {
      const altMatch = /alt=["']([^"']*)["']/i.exec(attrs)
      const alt = altMatch ? altMatch[1] : ''
      const caption = alt
        ? `<p data-ink-caption="1" style="margin:10px 0 0 0;font-size:13px;color:${BRAND.ash};font-style:italic;text-align:left;line-height:1.5;font-family:'EB Garamond','Source Han Serif SC',serif;">${escapeHtml(alt)}</p>`
        : ''
      return (
        `<div data-ink-img="1" style="margin:2em 0;padding:24px 24px 16px 24px;background:#FFFFFF;` +
        `border-right:1px solid ${BRAND.hairline};border-bottom:1px solid ${BRAND.hairline};overflow:hidden;">` +
        `<img${attrs} style="display:block;width:100%;height:auto;border:0;">` +
        caption +
        `</div>`
      )
    },
  )
}

function decorateDropCap(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-dc=/i.test(html)) return html
  const splitMatch = html.match(/<h1[\s\S]*?<\/h1>(?:\s*<p[^>]*data-ink-subtitle="1"[\s\S]*?<\/p>)?/i)
  if (!splitMatch) return html
  const head = splitMatch[0]
  const tailStart = (splitMatch.index ?? 0) + head.length
  const tail = html.slice(tailStart)
  let dropped = false
  const newTail = tail.replace(
    /<p(\s[^>]*)?>(\s*)([一-鿿㐀-䶿A-Za-z0-9])/,
    (match, attrs: string | undefined, ws: string, ch: string) => {
      if (dropped) return match
      dropped = true
      const a = attrs ?? ''
      return (
        `<p${a}>${ws}<span data-ink-dc="1" style="font-size:3.2em;font-weight:600;float:left;` +
        `line-height:0.82;margin:0.06em 0.12em -0.06em 0;color:${BRAND.graphite};` +
        `padding-left:8px;border-left:2px solid ${BRAND.kiln};` +
        `font-family:'Source Han Serif SC','EB Garamond',Georgia,serif;">${ch}</span>`
      )
    },
  )
  return html.slice(0, splitMatch.index ?? 0) + head + newTail
}

// ─── Preset CSS ───────────────────────────────────────────────────────────

const INKFORGE_CSS = `
#nice {
  font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Source Han Serif CN', 'EB Garamond', Georgia, serif;
  background: ${BRAND.vellum};
  color: ${BRAND.graphite};
  font-size: 16px;
  line-height: 1.85;
}
#nice h1 {
  font-size: 2.0em !important;
  font-weight: 700;
  text-align: center;
  color: ${BRAND.graphite} !important;
  margin: 0.4em 0 0.3em !important;
  padding: 0 !important;
  letter-spacing: 0.03em;
  border-bottom: 0 !important;
  font-family: 'Source Han Serif SC', 'EB Garamond', Georgia, serif;
  line-height: 1.35;
}
#nice h2 {
  margin: 2.4em 0 0.3em 0 !important;
  padding: 0 !important;
  font-size: 1.35em;
  font-weight: 600;
  color: ${BRAND.graphite} !important;
  background: transparent !important;
  border-left: 0 !important;
  border-bottom: 0 !important;
  border-radius: 0 !important;
  letter-spacing: 0.05em;
  line-height: 1.35;
}
#nice h3 {
  font-size: 1.12em;
  color: ${BRAND.tempera} !important;
  font-weight: 600;
  margin: 1.6em 0 0.5em 0;
  font-style: italic;
  border-left: 0 !important;
  padding-left: 0 !important;
}
#nice h4 {
  font-size: 1em;
  color: ${BRAND.ash};
  font-weight: 600;
  letter-spacing: 0.06em;
  margin: 1.3em 0 0.4em 0;
  font-variant: small-caps;
}
#nice p {
  line-height: 1.85;
  margin: 0 0 1.2em 0;
  text-align: justify;
  color: ${BRAND.graphite};
}
#nice strong {
  color: ${BRAND.graphite};
  font-weight: 700;
  background: linear-gradient(180deg, transparent 65%, rgba(193,154,86,0.22) 65%);
  padding: 0 0.06em;
}
#nice em {
  font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif;
  font-style: italic;
  color: ${BRAND.ash};
}
#nice blockquote {
  border-left: 3px solid ${BRAND.tempera} !important;
  border-top: 0 !important;
  border-bottom: 0 !important;
  background: ${BRAND.hearth} !important;
  padding: 1em 1.4em !important;
  margin: 1.6em 0 !important;
  font-style: italic;
  color: #3D4048;
  border-radius: 0 4px 4px 0 !important;
}
#nice blockquote p {
  text-indent: 0;
  line-height: 1.75;
  margin: 0;
}
#nice hr {
  border: 0;
  height: 0;
}
#nice ul li::marker { color: ${BRAND.kiln}; }
#nice ol li::marker { color: ${BRAND.kiln}; font-weight: 700; font-family: 'EB Garamond', Georgia, serif; }
#nice a {
  color: ${BRAND.graphite};
  border-bottom: 1px solid ${BRAND.amber};
  text-decoration: none;
}
#nice table {
  border: 1px solid ${BRAND.hairline};
  margin: 1.6em 0;
  border-collapse: collapse;
  width: 100%;
}
#nice table thead {
  border-bottom: 3px solid ${BRAND.kiln} !important;
}
#nice table th {
  background: ${BRAND.hearth} !important;
  color: ${BRAND.graphite} !important;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.02em;
  padding: 14px 16px !important;
  border: 1px solid ${BRAND.hairline} !important;
  border-bottom: 3px solid ${BRAND.kiln} !important;
  text-align: left;
}
#nice table td {
  background: #FFFFFF !important;
  border: 1px solid ${BRAND.hairline} !important;
  padding: 12px 16px !important;
  color: ${BRAND.graphite};
  font-size: 15px;
  line-height: 1.7;
}
#nice table tr:nth-child(even) td {
  background: ${BRAND.vellum} !important;
}
`

const v4Preset: ExportPreset = {
  id: 'inkforge-signature',
  name: 'InkForge Signature（墨锻）',
  icon: 'forge',
  description: 'InkForge 品牌：Graphite + Kiln + Tempera + Amber，锻造光谱',
  theme: 'grace',
  fontFamily: 'serif',
  fontSize: '16px',
  primaryColor: BRAND.graphite,
  isUseIndent: false,
  isUseJustify: true,
  previewCSS: INKFORGE_CSS,
  exportCSS: INKFORGE_CSS,
  decorate: chainDecorators(
    decorateH1,
    decorateDropCap,
    decorateTOC,
    decorateChapterNumerals,
    decorateForgeLine,
    decorateOrnament,
    decorateImageFrame,
  ),
}

// ─── Test ─────────────────────────────────────────────────────────────────

describe('fidelity fixture v4 · InkForge Signature (墨锻) brand preset', () => {
  it('renders preprocessed article through InkForge Signature and writes v4 output', async () => {
    const raw = readFileSync(ARTICLE_PATH, 'utf8')
    expect(raw.length).toBeGreaterThan(30_000)

    const { markdown, stats: preprocStats } = preprocessArticleForWechat(raw)
    assertPreprocessLooksReasonable(preprocStats)

    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    const { html, stats } = await markdownToWechatWithStats(markdown, v4Preset, {
      enableCjkSpacing: true,
      maxContentWidth: 677,
      enableDarkMode: true,
      enableReadingTime: true,
      enableCiteStatus: true,
      enableAlertBlocks: true,
      enableEnhancedTable: true,
      enableCodeHighlight: true,
      enableCodeLanguageLabel: true,
      enableTextIndent: false,
      fontFamily: 'serif',
      fontSize: '16px',
    })

    // ─── Regression gates ──────────────────────────────────────────────
    const strayBold = (html.match(/\*\*/g) ?? []).length
    expect(strayBold).toBe(0)

    const chapterNums = (html.match(/data-ink-num=/g) ?? []).length
    expect(chapterNums).toBe(6)

    const forgeLines = (html.match(/data-ink-line=/g) ?? []).length
    expect(forgeLines).toBe(6)

    const h1Top = (html.match(/data-ink-h1-top=/g) ?? []).length
    expect(h1Top).toBe(1)

    const dropCap = (html.match(/data-ink-dc=/g) ?? []).length
    expect(dropCap).toBe(1)

    const ornaments = (html.match(/data-ink-ornament=/g) ?? []).length
    expect(ornaments).toBeGreaterThanOrEqual(5)

    const h1Divider = (html.match(/data-ink-h1-divider=/g) ?? []).length
    expect(h1Divider).toBe(1)

    const toc = (html.match(/data-ink-toc=/g) ?? []).length
    expect(toc).toBe(1)

    // Table: verify Kiln accent on th bottom border (juice strips spaces)
    expect(html).toContain(`border-bottom:3px solid ${BRAND.kiln}`)
    // Table header must be light bg (readable), not dark
    expect(html).toContain(`background:${BRAND.hearth}`)

    const articleTitle = '中国数字人民币战略全景报告 · v4 InkForge Signature（墨锻）'
    const docHtml = buildStandaloneDoc(html, articleTitle, v4Preset.id, v4Preset.primaryColor)
    writeFileSync(OUTPUT_HTML, docHtml, 'utf8')
    writeFileSync(
      OUTPUT_STATS,
      JSON.stringify(
        {
          version: 'v4',
          brand: 'InkForge Signature',
          presetId: v4Preset.id,
          presetName: v4Preset.name,
          palette: BRAND,
          generatedAt: new Date().toISOString(),
          markdownBytesOriginal: Buffer.byteLength(raw, 'utf8'),
          markdownBytesPreprocessed: Buffer.byteLength(markdown, 'utf8'),
          htmlBytes: Buffer.byteLength(docHtml, 'utf8'),
          innerHtmlBytes: Buffer.byteLength(html, 'utf8'),
          preprocStats,
          renderStats: stats,
          decorations: {
            chapterNumerals: chapterNums,
            forgeLines,
            h1OrnamentTop: h1Top,
            h1Divider,
            dropCap,
            toc,
            ornaments,
            strayBold,
          },
        },
        null,
        2,
      ),
      'utf8',
    )

    expect(existsSync(OUTPUT_HTML)).toBe(true)
    expect(existsSync(OUTPUT_STATS)).toBe(true)
  }, 60_000)
})

function buildStandaloneDoc(
  innerHtml: string,
  title: string,
  presetId: string,
  primaryColor: string,
): string {
  const safeTitle = escapeHtml(title)
  const safePreset = escapeHtml(presetId)
  const safeColor = escapeHtml(primaryColor)
  const generatedAt = new Date().toISOString().replace('T', ' ').replace('Z', ' UTC')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="InkForge fidelity fixture v4 (preset=${safePreset})">
<title>${safeTitle}</title>
<style>
  html, body { margin: 0; padding: 0; }
  body { background: ${BRAND.hearth}; font-family: -apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif; }
  .wechat-fidelity-shell { max-width: 720px; margin: 24px auto; box-shadow: 0 8px 28px rgba(37,41,51,0.08); border-radius: 2px; overflow: hidden; }
  .wechat-fidelity-chrome { background: #ffffff; padding: 16px 20px; border-bottom: 1px solid #ececec; }
  .wechat-fidelity-chrome .name { font-size: 17px; font-weight: 600; color: ${BRAND.graphite}; line-height: 1.4; }
  .wechat-fidelity-chrome .meta { font-size: 12px; color: ${BRAND.smoke}; margin-top: 4px; }
  .wechat-fidelity-chrome .meta a { color: ${BRAND.kiln}; text-decoration: none; }
  .wechat-fidelity-body { background: ${BRAND.vellum}; }
  .wechat-fidelity-footer { font-size: 12px; color: ${BRAND.smoke}; text-align: center; padding: 16px; background: #ffffff; border-top: 1px dashed #ececec; }
  .wechat-fidelity-banner { font-size: 12px; color: ${BRAND.graphite}; background: #fef8f0; border: 1px solid ${BRAND.amber}; border-radius: 2px; padding: 8px 12px; margin: 0 0 12px; }
  .wechat-fidelity-banner strong { color: ${BRAND.kiln}; }
</style>
</head>
<body>
<div class="wechat-fidelity-shell">
  <div class="wechat-fidelity-banner">
    InkForge Signature v4 · <strong>${safePreset}</strong>（Graphite + Kiln + Tempera + Amber）· 复制时仅选取 <code>&lt;section id="nice"&gt;…&lt;/section&gt;</code>。
  </div>
  <header class="wechat-fidelity-chrome">
    <div class="name">InkForge · 品牌渲染保真度测试 v4</div>
    <div class="meta"><a href="#">InkForge</a> · ${escapeHtml(generatedAt)} · preset=${safePreset}</div>
  </header>
  <main class="wechat-fidelity-body">
    ${innerHtml}
  </main>
  <footer class="wechat-fidelity-footer">
    Generated by InkForge · preset <strong>${safePreset}</strong> · primary <span style="color:${safeColor}">${safeColor}</span> · accent <span style="color:${BRAND.kiln}">${BRAND.kiln}</span>
  </footer>
</div>
</body>
</html>
`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
