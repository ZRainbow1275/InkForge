/**
 * @vitest-environment happy-dom
 *
 * v5 fidelity fixture — InkForge Signature v5 (墨锻 · 结构版).
 *
 * Design thesis: "stop decorating margins, start composing the page."
 * SVG is structural, not garnish.
 *
 * Palette (tightened to 2+neutral):
 *   Graphite #252933 (text + structure)
 *   Kiln #D95B3F (single brand accent)
 *   Vellum #F5F0E6 (background)
 *   Ash #6E7580 (muted)
 *   Hairline #DED7CA (rules)
 *
 * Structural moves (from v4 audit):
 *   1. Seal (篆刻) — single asymmetric SVG stamp, upper-right
 *   2. Hanging numerals — Kiln numbers in left margin via table layout
 *   3. Pull-quote SVG cards (水墨引文砖) — feTurbulence ink wash, unique per chapter
 *   4. SMIL click-to-expand TOC — <animate begin="click">, NOT checkbox hack
 *   5. Hairline full-width rules — 0.5px Graphite, not gradient bars
 *   6. Drop cap with Kiln left border (preserved from v4)
 *
 * WeChat SVG constraints (from research):
 *   - <style> inside <svg> IS preserved
 *   - id= stripped outside SVG → use SMIL begin="click" not checkbox hack
 *   - class= stripped outside SVG, preserved inside SVG/foreignObject
 *   - outline:none on all <g> (Android click outline bug)
 *   - No trailing semicolon in animate values
 *   - Presentation Attributes mode for SVG export
 *
 * Run: cd inkforge && npx vitest run __fidelity__/render-real-article-v5.fidelity.test.ts
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { markdownToWechatWithStats } from '@/services/export/wechat'
import { chainDecorators } from '@/services/export/preset-decorations'
import type { ExportPreset, ExportTarget } from '@/types'

import { preprocessArticleForWechat, assertPreprocessLooksReasonable } from './preprocess-article'

const B = {
  graphite: '#252933',
  kiln: '#D95B3F',
  vellum: '#F5F0E6',
  ash: '#6E7580',
  hairline: '#DED7CA',
  hearth: '#EDE7DB',
  ink: '#1A1D24',
} as const

const REPO_ROOT = resolve(__dirname, '..', '..')
const ARTICLE_PATH = resolve(REPO_ROOT, 'experiment', '正文1.0.md')
const OUTPUT_DIR = resolve(REPO_ROOT, '.trellis', 'tasks', '05-26-render-wechat-fidelity-test', 'output')
const OUTPUT_HTML = resolve(OUTPUT_DIR, '正文1.0-wechat-v5.html')
const OUTPUT_STATS = resolve(OUTPUT_DIR, '正文1.0-wechat-v5.stats.json')

// ─── Pull-quote data (hand-picked per chapter) ───────────────────────────

const CHAPTER_QUOTES: Record<number, string> = {
  1: '<span style="color:#D95B3F">十年磨一剑</span>。',
  2: '试点不是答案，是<span style="color:#D95B3F">问题的具体化</span>。',
  3: '重构<span style="color:#D95B3F">跨境支付</span>的未来。',
  4: '用一国两制建设<span style="color:#D95B3F">战略纵深</span>。',
  5: '模式之争的本质，是选择<span style="color:#D95B3F">何种风险</span>的战略决断。',
  6: '共同构筑 21 世纪<span style="color:#D95B3F">最核心的国家竞争力</span>。',
}

// ─── Decorators ───────────────────────────────────────────────────────────

function decorateSeal(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-seal=/i.test(html)) return html
  // Plain HTML tag-pill (reference uses no decorative SVG seal).
  // Inline span with Kiln bg + Vellum text, placed before H1.
  const sealHtml =
    `<div data-ink-seal="1" style="margin:0 0 0.6em;">` +
    `<span style="display:inline-block;background:${B.kiln};color:${B.vellum};font-family:'Source Han Serif SC','Songti SC',serif;` +
    `font-size:13px;font-weight:600;letter-spacing:1px;padding:4px 14px;border-radius:2px;">InkForge · 战略观察</span>` +
    `</div>`
  return html.replace(/(<h1(\s[^>]*)?>)/i, `${sealHtml}$1`)
}

function decorateH1(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-h1="1"/i.test(html)) return html
  // Poster-style H1 block — dramatic editorial cover.
  // Ghost "01" Garamond background + letterspaced eyebrow + double-rule with diamond
  // + big Songti H1 + italic subtitle + meta strip. Pure HTML for WeChat fidelity.
  return html.replace(
    /(<h1(\s[^>]*)?>[\s\S]*?<\/h1>)\s*(<p(\s[^>]*)?>\s*<em[^>]*>[\s\S]*?<\/em>\s*<\/p>)?/i,
    (_m, h1: string, _attrs: string | undefined, subtitleP: string | undefined) => {
      const h1Inner = (h1.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? [, ''])[1]
      const subInner = subtitleP ? (subtitleP.match(/<em[^>]*>([\s\S]*?)<\/em>/i) ?? [, ''])[1] : ''
      const poster =
        // Section with vellum tint, Kiln top+bottom hairlines, generous padding
        `<section data-ink-h1="1" style="position:relative;margin:1em 0 1.6em;padding:38px 24px 36px;` +
        `background:${B.vellum};border-top:3px double ${B.kiln};border-bottom:3px double ${B.kiln};` +
        `text-align:center;overflow:hidden;">` +
          // Ghost "01" numeral, absolutely positioned background watermark
          `<div aria-hidden="true" style="position:absolute;top:-20px;right:-10px;` +
          `font-family:'EB Garamond',Georgia,serif;font-size:180px;font-weight:300;` +
          `color:${B.kiln};opacity:0.08;line-height:1;letter-spacing:-6px;pointer-events:none;">01</div>` +
          // Top eyebrow row — letterspaced English
          `<p style="margin:0 0 6px;font-family:'EB Garamond',Georgia,serif;font-size:11px;color:${B.kiln};` +
          `letter-spacing:8px;font-weight:700;">INKFORGE · STRATEGIC REPORT · 01</p>` +
          // Chinese eyebrow
          `<p style="margin:0 0 18px;font-family:'Source Han Serif SC','Songti SC',serif;font-size:12px;` +
          `color:${B.ash};letter-spacing:10px;">战 略 观 察 · 卷 壹</p>` +
          // Diamond + double rule
          `<div style="display:flex;align-items:center;justify-content:center;margin:0 0 20px;">` +
            `<span style="display:inline-block;width:70px;height:1px;background:${B.kiln};opacity:0.5;"></span>` +
            `<span style="margin:0 14px;color:${B.kiln};font-size:14px;">◆</span>` +
            `<span style="display:inline-block;width:70px;height:1px;background:${B.kiln};opacity:0.5;"></span>` +
          `</div>` +
          // H1 — big bold Songti
          `<h1 data-ink-h1="1" style="margin:0 0 14px!important;padding:0!important;font-family:'Source Han Serif SC','Songti SC',serif!important;` +
          `font-size:32px!important;font-weight:700!important;color:${B.graphite}!important;line-height:1.3!important;letter-spacing:2px!important;border:0!important;` +
          `text-align:center!important;">${h1Inner}</h1>` +
          // Subtitle italic Songti
          (subInner
            ? `<p data-ink-subtitle="1" style="margin:0 auto 18px;max-width:88%;font-family:'Source Han Serif SC','Songti SC',serif;` +
              `font-style:italic;font-size:15px;color:${B.ash};line-height:1.7;text-align:center;">` +
              `——${escapeHtml(subInner.replace(/^——/, ''))}</p>`
            : '') +
          // Kiln short accent + meta
          `<div style="display:inline-block;width:48px;height:2px;background:${B.kiln};margin:0 0 14px;"></div>` +
          `<p style="margin:0;font-family:'EB Garamond',Georgia,serif;font-size:11px;color:${B.ash};` +
          `letter-spacing:3px;">2026 · INKFORGE EDITORIAL · VOL. I</p>` +
        `</section>`
      return poster
    },
  )
}

function decorateDropCap(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-dc=/i.test(html)) return html
  // Skip past the entire H1 poster section if present (so drop-cap doesn't latch onto poster meta).
  const posterSection = html.match(/<section data-ink-h1="1"[\s\S]*?<\/section>/i)
  const splitMatch = posterSection ?? html.match(/<h1[\s\S]*?<\/h1>(?:\s*<p[^>]*data-ink-subtitle="1"[\s\S]*?<\/p>)?/i)
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
        `line-height:0.82;margin:0.06em 0.12em -0.06em 0;color:${B.graphite};` +
        `padding-left:8px;border-left:2px solid ${B.kiln};` +
        `font-family:'Source Han Serif SC','EB Garamond',Georgia,serif;">${ch}</span>`
      )
    },
  )
  return html.slice(0, splitMatch.index ?? 0) + head + newTail
}

function decorateTOC(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-toc=/i.test(html)) return html

  // Parse H2 + H3 + H4 in document order to build 3-level hierarchy
  type H4 = { text: string }
  type H3 = { num: string; main: string; children: H4[] }
  type Chapter = { num: string; main: string; sub: string; sections: H3[] }
  const chapters: Chapter[] = []
  let h2Counter = 0, h3Counter = 0
  const headingRegex = /<(h2|h3|h4)[^>]*>([\s\S]*?)<\/\1>/gi
  let hm: RegExpExecArray | null
  while ((hm = headingRegex.exec(html)) !== null) {
    const level = hm[1].toLowerCase()
    const text = hm[2].replace(/<[^>]+>/g, '').trim()
    if (level === 'h2') {
      h2Counter++; h3Counter = 0
      const sep = text.match(/^(.+?)(?:——|：|:)(.+)$/)
      chapters.push({
        num: String(h2Counter).padStart(2, '0'),
        main: sep ? sep[1].trim() : text,
        sub: sep ? sep[2].trim() : '',
        sections: [],
      })
    } else if (level === 'h3' && chapters.length > 0) {
      h3Counter++
      // Strip leading "N.N " from H3 text if present
      const cleanText = text.replace(/^\d+\.\d+\s*/, '')
      chapters[chapters.length - 1].sections.push({
        num: `${h2Counter}.${h3Counter}`,
        main: cleanText,
        children: [],
      })
    } else if (level === 'h4' && chapters.length > 0) {
      const lastCh = chapters[chapters.length - 1]
      if (lastCh.sections.length > 0) {
        lastCh.sections[lastCh.sections.length - 1].children.push({ text })
      }
    }
  }
  if (chapters.length === 0) return html

  // SVG-based editorial TOC with SMIL viewBox click-expand.
  // Initial viewBox shows header + 6 compact chapter rows (collapsed).
  // Click "▽ 展开全部" toggle → animate viewBox height to expanded full hierarchy.
  // Typography: serif (Songti + Garamond), Kiln/vellum palette — matches body.
  // SMIL `begin="tocToggle.click"` works in WeChat X5 webview; markup degrades gracefully.

  const totalSections = chapters.reduce((n, c) => n + c.sections.length, 0)
  const totalH4 = chapters.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.children.length, 0), 0)

  const W = 750
  const ROW_H_COMPACT = 70
  const SUB_LINE_H = 26
  const HEADER_H = 280
  const TOGGLE_Y = 250

  // Calculate detail block heights
  const detailHeights = chapters.map((ch) => {
    const h3Lines = ch.sections.length
    const h4Lines = ch.sections.reduce((n, s) => n + Math.min(s.children.length, 3), 0)
    // 50 header + 32 per H3 + 24 per H4 + 16 footer
    return 50 + h3Lines * 32 + h4Lines * 24 + 16
  })
  const H_COMPACT = HEADER_H + ROW_H_COMPACT * chapters.length + 30
  const H_EXPANDED = H_COMPACT + detailHeights.reduce((a, b) => a + b, 0) + 60

  // ─── Header SVG content (y=0..HEADER_H) ─────────────────────────
  let header = ''
  // Flourish — nib + ink lines, centered at y=50
  header += `<g transform="translate(${W / 2 - 120}, 30)">`
  header += `<circle cx="120" cy="40" r="22" fill="none" stroke="${B.kiln}" stroke-width="0.8" opacity="0.4"/>`
  header += `<circle cx="120" cy="40" r="14" fill="none" stroke="${B.kiln}" stroke-width="0.6" opacity="0.6"/>`
  header += `<polygon points="120,28 132,40 120,52 108,40" fill="${B.graphite}"/>`
  header += `<rect x="119.4" y="32" width="1.2" height="16" rx="0.6" fill="${B.vellum}"/>`
  header += `<line x1="20" y1="40" x2="92" y2="40" stroke="${B.kiln}" stroke-width="1.2" opacity="0.7"/>`
  header += `<line x1="148" y1="40" x2="220" y2="40" stroke="${B.kiln}" stroke-width="1.2" opacity="0.7"/>`
  header += `<circle cx="16" cy="40" r="2.5" fill="${B.kiln}"/>`
  header += `<circle cx="224" cy="40" r="2.5" fill="${B.kiln}"/>`
  header += `<line x1="40" y1="28" x2="92" y2="28" stroke="${B.hairline}" stroke-width="0.6"/>`
  header += `<line x1="148" y1="52" x2="200" y2="52" stroke="${B.hairline}" stroke-width="0.6"/>`
  header += `<circle cx="50" cy="28" r="1.5" fill="${B.kiln}" opacity="0.6"/>`
  header += `<circle cx="190" cy="52" r="1.5" fill="${B.kiln}" opacity="0.6"/>`
  header += `</g>`
  // CONTENTS eyebrow
  header += `<text x="${W / 2}" y="146" text-anchor="middle" font-family="'EB Garamond',Georgia,serif" font-size="14" fill="${B.kiln}" letter-spacing="10" font-weight="700">CONTENTS</text>`
  // 目 录 title
  header += `<text x="${W / 2}" y="190" text-anchor="middle" font-family="'Source Han Serif SC','Songti SC',serif" font-size="36" fill="${B.graphite}" letter-spacing="18" font-weight="700">目 录</text>`
  // Diamond rule
  header += `<line x1="${W / 2 - 100}" y1="210" x2="${W / 2 - 14}" y2="210" stroke="${B.hairline}" stroke-width="1"/>`
  header += `<text x="${W / 2}" y="215" text-anchor="middle" font-family="'EB Garamond',serif" font-size="14" fill="${B.kiln}">◆</text>`
  header += `<line x1="${W / 2 + 14}" y1="210" x2="${W / 2 + 100}" y2="210" stroke="${B.hairline}" stroke-width="1"/>`
  // Meta
  header += `<text x="${W / 2}" y="235" text-anchor="middle" font-family="'EB Garamond',Georgia,serif" font-size="13" fill="${B.ash}" letter-spacing="2">${chapters.length} CHAPTERS · ${totalSections} SECTIONS · ${totalH4} SUBSECTIONS</text>`

  // ─── Toggle buttons (y=TOGGLE_Y) — two stacked, swap via SMIL ────
  // tocOpen: ▽ 展开全部 — initially visible + clickable
  // tocClose: △ 收起目录 — initially hidden + non-interactive, stacked same spot
  // Click tocOpen → expand viewBox + show detail + swap buttons
  // Click tocClose → collapse viewBox + hide detail + swap buttons back
  const toggleY = TOGGLE_Y
  const btnX = W / 2 - 110
  let toggle = ''
  // Static button background panel (always visible)
  toggle += `<rect x="${btnX}" y="${toggleY}" width="220" height="36" rx="2" fill="${B.kiln}" opacity="0.08"/>`
  toggle += `<rect x="${btnX}" y="${toggleY}" width="220" height="36" rx="2" fill="none" stroke="${B.kiln}" stroke-width="1"/>`
  // OPEN button — initially visible
  toggle += `<g id="tocOpen" cursor="pointer">`
  toggle += `<rect x="${btnX}" y="${toggleY}" width="220" height="36" fill="transparent"/>`
  toggle += `<text x="${W / 2}" y="${toggleY + 24}" text-anchor="middle" font-family="'Source Han Serif SC','Songti SC',serif" font-size="16" fill="${B.kiln}" letter-spacing="6" font-weight="600">▽  展 开 全 部</text>`
  toggle += `<animate attributeName="opacity" begin="tocOpen.click" values="1;0" dur="0.3s" fill="freeze" restart="always"/>`
  toggle += `<animate attributeName="opacity" begin="tocClose.click" values="0;1" dur="0.3s" fill="freeze" restart="always"/>`
  toggle += `<set attributeName="pointer-events" begin="tocOpen.click" to="none"/>`
  toggle += `<set attributeName="pointer-events" begin="tocClose.click" to="auto"/>`
  toggle += `</g>`
  // CLOSE button — initially hidden (opacity 0, pointer-events none)
  toggle += `<g id="tocClose" cursor="pointer" opacity="0" pointer-events="none">`
  toggle += `<rect x="${btnX}" y="${toggleY}" width="220" height="36" fill="transparent"/>`
  toggle += `<text x="${W / 2}" y="${toggleY + 24}" text-anchor="middle" font-family="'Source Han Serif SC','Songti SC',serif" font-size="16" fill="${B.ash}" letter-spacing="6" font-weight="600">△  收 起 目 录</text>`
  toggle += `<animate attributeName="opacity" begin="tocOpen.click" values="0;1" dur="0.3s" fill="freeze" restart="always"/>`
  toggle += `<animate attributeName="opacity" begin="tocClose.click" values="1;0" dur="0.3s" fill="freeze" restart="always"/>`
  toggle += `<set attributeName="pointer-events" begin="tocOpen.click" to="auto"/>`
  toggle += `<set attributeName="pointer-events" begin="tocClose.click" to="none"/>`
  toggle += `</g>`

  // ─── Compact chapter rows (y=HEADER_H..H_COMPACT) ───────────────
  let compactRows = ''
  chapters.forEach((ch, idx) => {
    const y = HEADER_H + idx * ROW_H_COMPACT
    const cy = y + ROW_H_COMPACT / 2
    // Left big Garamond numeral
    compactRows += `<text x="50" y="${cy + 12}" font-family="'EB Garamond',Georgia,serif" font-size="46" fill="${B.kiln}" font-weight="300">${ch.num}</text>`
    // Vertical divider
    compactRows += `<line x1="118" y1="${y + 16}" x2="118" y2="${y + ROW_H_COMPACT - 16}" stroke="${B.hairline}" stroke-width="1"/>`
    // Title Songti
    const titleMax = ch.main.length > 14 ? ch.main.slice(0, 14) + '…' : ch.main
    compactRows += `<text x="140" y="${cy - 4}" font-family="'Source Han Serif SC','Songti SC',serif" font-size="22" fill="${B.graphite}" font-weight="700">${escapeHtml(titleMax)}</text>`
    // Sub italic Ash
    if (ch.sub) {
      const subMax = ch.sub.length > 20 ? ch.sub.slice(0, 20) + '…' : ch.sub
      compactRows += `<text x="140" y="${cy + 22}" font-family="'Source Han Serif SC','Songti SC',serif" font-size="14" fill="${B.ash}" font-style="italic">${escapeHtml(subMax)}</text>`
    }
    // Right meta — section count
    const h4Total = ch.sections.reduce((n, s) => n + s.children.length, 0)
    compactRows += `<text x="${W - 50}" y="${cy + 6}" text-anchor="end" font-family="'EB Garamond',Georgia,serif" font-size="13" fill="${B.kiln}" letter-spacing="3">${ch.sections.length} SEC · ${h4Total} SUB</text>`
    // Hairline below row
    compactRows += `<line x1="40" y1="${y + ROW_H_COMPACT}" x2="${W - 40}" y2="${y + ROW_H_COMPACT}" stroke="${B.hairline}" stroke-width="0.5" opacity="0.7"/>`
  })

  // ─── Detail blocks (y=H_COMPACT..H_EXPANDED) ────────────────────
  // Initial opacity=0 + animate to 1 on toggle click
  let details = ''
  let detailY = H_COMPACT + 20
  chapters.forEach((ch) => {
    let block = ''
    // Chapter header line — small Garamond number + Songti title
    block += `<text x="50" y="${detailY + 30}" font-family="'EB Garamond',Georgia,serif" font-size="22" fill="${B.kiln}" font-weight="600" letter-spacing="2">${ch.num}</text>`
    block += `<text x="100" y="${detailY + 30}" font-family="'Source Han Serif SC','Songti SC',serif" font-size="22" fill="${B.graphite}" font-weight="700">${escapeHtml(ch.main)}</text>`
    block += `<line x1="50" y1="${detailY + 42}" x2="${W - 50}" y2="${detailY + 42}" stroke="${B.kiln}" stroke-width="0.6" opacity="0.4"/>`
    let yCur = detailY + 60
    // H3 sections
    ch.sections.forEach((s) => {
      block += `<text x="68" y="${yCur}" font-family="'EB Garamond',Georgia,serif" font-size="14" fill="${B.kiln}" font-weight="700" letter-spacing="1">${s.num}</text>`
      const sMain = s.main.length > 28 ? s.main.slice(0, 28) + '…' : s.main
      block += `<text x="118" y="${yCur}" font-family="'Source Han Serif SC','Songti SC',serif" font-size="16" fill="${B.graphite}" font-weight="600">${escapeHtml(sMain)}</text>`
      yCur += 22
      // H4 subs (max 3)
      s.children.slice(0, 3).forEach((h4) => {
        block += `<circle cx="130" cy="${yCur - 4}" r="2" fill="${B.kiln}" opacity="0.6"/>`
        const h4Text = h4.text.length > 30 ? h4.text.slice(0, 30) + '…' : h4.text
        block += `<text x="142" y="${yCur}" font-family="'PingFang SC','Source Han Sans SC',sans-serif" font-size="13" fill="${B.ash}">${escapeHtml(h4Text)}</text>`
        yCur += 22
      })
      if (s.children.length > 3) {
        block += `<text x="142" y="${yCur}" font-family="'EB Garamond',Georgia,serif" font-size="12" fill="${B.ash}" font-style="italic" opacity="0.6">+ ${s.children.length - 3} more</text>`
        yCur += 22
      }
      yCur += 6
    })
    details += block
    detailY += detailHeights[chapters.indexOf(ch)] + 16
  })

  // Detail group — two animates for open/close
  const detailGroup =
    `<g opacity="0">` +
    `<animate attributeName="opacity" begin="tocOpen.click" values="0;1" dur="0.5s" fill="freeze" restart="always"/>` +
    `<animate attributeName="opacity" begin="tocClose.click" values="1;0" dur="0.4s" fill="freeze" restart="always"/>` +
    details +
    `</g>`

  // ─── Assemble SVG with viewBox click-expand AND click-collapse ──
  const tocSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${W} ${H_COMPACT}" ` +
    `preserveAspectRatio="xMidYMin meet" role="img" aria-label="目录" ` +
    `style="display:block;background:${B.vellum};">` +
      // ViewBox expand on tocOpen.click, collapse on tocClose.click
      `<animate attributeName="viewBox" begin="tocOpen.click" ` +
      `values="0 0 ${W} ${H_COMPACT};0 0 ${W} ${H_EXPANDED}" dur="0.6s" fill="freeze" restart="always"/>` +
      `<animate attributeName="viewBox" begin="tocClose.click" ` +
      `values="0 0 ${W} ${H_EXPANDED};0 0 ${W} ${H_COMPACT}" dur="0.5s" fill="freeze" restart="always"/>` +
      header +
      toggle +
      compactRows +
      detailGroup +
    `</svg>`

  // Wrap in section with same border chrome as before
  const tocHtml =
    `<section data-ink-toc="1" style="margin:1.6em 0 2em;` +
    `border-top:2px solid ${B.kiln};border-bottom:1px solid ${B.hairline};overflow:hidden;">` +
      tocSvg +
    `</section>`

  // Insert after H1 poster block
  const posterEnd = /<section data-ink-h1="1"[\s\S]*?<\/section>/i.exec(html)
  if (posterEnd) {
    const pos = (posterEnd.index ?? 0) + posterEnd[0].length
    return html.slice(0, pos) + tocHtml + html.slice(pos)
  }
  const firstH2 = /<h2[\s>]/i.exec(html)
  if (firstH2) return html.slice(0, firstH2.index) + tocHtml + html.slice(firstH2.index)
  return html
}

function decorateHangingNumerals(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-num=/i.test(html)) return html
  let counter = 0
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, attrs: string | undefined, content: string) => {
    counter += 1
    const num = String(counter).padStart(2, '0')
    // Strip juice-inlined style to avoid duplicate style= attributes (HTML ignores second one)
    const a = (attrs ?? '').replace(/\s*style=("[^"]*"|'[^']*')/gi, '')
    return (
      // CHAPTER eyebrow above the row
      `<div style="margin:2em 0 4px;font-family:'EB Garamond',Georgia,serif;font-size:11px;color:${B.kiln};` +
      `letter-spacing:6px;font-weight:700;">CHAPTER ${num}</div>` +
      `<table data-ink-num="${counter}" width="100%" style="border:0!important;border-collapse:collapse;margin:0 0 4px;background:transparent!important;box-shadow:none!important;">` +
      `<tr style="background:transparent!important;">` +
      // Big Garamond numeral
      `<td style="width:96px;vertical-align:middle;padding:0 16px 0 0;border:0!important;background:transparent!important;` +
      `font:300 72px/0.9 'EB Garamond',Georgia,serif;color:${B.kiln};">${num}</td>` +
      // Kiln vertical bar
      `<td style="width:4px;padding:0;border:0!important;background:${B.kiln} !important;"></td>` +
      // H2 title, bumped to 28px
      `<td style="vertical-align:middle;padding:0 0 0 16px;border:0!important;background:transparent!important;">` +
      `<h2${a} style="margin:0!important;padding:0!important;font-size:28px;font-weight:700;color:${B.graphite}!important;` +
      `background:transparent!important;border:0!important;line-height:1.3;font-family:'Source Han Serif SC','Songti SC',serif;">${content}</h2>` +
      `</td></tr></table>` +
      // Hairline under section
      `<div style="width:100%;height:1px;background:${B.graphite};opacity:0.15;margin:14px 0 1.2em;"></div>`
    )
  })
}

function decoratePullQuote(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  // Per-chapter pull-quote posters removed (user request).
  // Design language moved to H1 poster block. Strip stray <hr> from markdown.
  return html.replace(/<hr\s*\/?>/gi, '')
}

function decorateEndmark(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-end=/i.test(html)) return html
  // Plain HTML endmark — clean hairline + 完 character. No SVG.
  const end =
    `<section data-ink-end="1" style="text-align:center;margin:3em 0 1.5em;">` +
    `<span style="display:inline-block;width:60px;height:1px;background:${B.hairline};vertical-align:middle;"></span>` +
    `<span style="display:inline-block;margin:0 16px;font-family:'Source Han Serif SC','Songti SC',serif;` +
    `font-size:14px;color:${B.ash};letter-spacing:6px;">完</span>` +
    `<span style="display:inline-block;width:60px;height:1px;background:${B.hairline};vertical-align:middle;"></span>` +
    `</section>`
  const lastSection = html.lastIndexOf('</section>')
  if (lastSection === -1) return html + end
  return html.slice(0, lastSection) + end + html.slice(lastSection)
}

function decorateReadingBadge(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-ink-badge=/i.test(html)) return html
  // Plain HTML meta line (reference pattern — no SVG decoration for metadata)
  const badge =
    `<p data-ink-badge="1" style="margin:0 0 1.2em;font-family:'EB Garamond',Georgia,serif;font-size:13px;color:${B.ash};letter-spacing:0.5px;">` +
    `<span style="color:${B.kiln};font-weight:600;">⏱</span> 101 min · <span style="color:${B.graphite};">30,106</span> 字 · 6 章` +
    `</p>`
  const sectionOpen = /<section\b[^>]*id=["']nice["'][^>]*>/i.exec(html)
  if (sectionOpen) {
    const pos = (sectionOpen.index ?? 0) + sectionOpen[0].length
    return html.slice(0, pos) + badge + html.slice(pos)
  }
  return badge + html
}

function decorateImageFrame(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  // Image frames — picture-frame with corner SVG ornaments + caption.
  let out = html
  if (!/data-ink-img=/i.test(out)) {
    out = out.replace(
      /<img([^>]*?)>/gi,
      (_m, attrs: string) => {
        const altMatch = /alt=["']([^"']*)["']/i.exec(attrs)
        const alt = altMatch ? altMatch[1] : ''
        const caption = alt
          ? `<p data-ink-caption="1" style="margin:10px 0 0;font-size:13px;color:${B.ash};font-style:italic;` +
            `font-family:'EB Garamond','Source Han Serif SC',serif;text-align:center;">${escapeHtml(alt)}</p>`
          : ''
        return (
          `<div data-ink-img="1" style="margin:2em 0;padding:18px;background:#FFF;` +
          `border:1px solid ${B.hairline};box-shadow:0 2px 0 ${B.hairline};overflow:hidden;">` +
          `<img${attrs} style="display:block;width:100%;height:auto;border:0;">` +
          caption + `</div>`
        )
      },
    )
  }

  // Table frames — picture-frame chrome via CSS borders (WeChat strips
  // position:absolute). Centered SVG flourish + ◆ TABLE label above, table
  // body inside thick Kiln top + thin sides + hairline bottom.
  if (!/data-ink-frame=/i.test(out)) {
    const frameFlourish =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 36" width="180" height="36" ` +
      `style="display:block;margin:0 auto;" aria-hidden="true">` +
        `<line x1="10" y1="18" x2="70" y2="18" stroke="${B.kiln}" stroke-width="1" opacity="0.7"/>` +
        `<line x1="110" y1="18" x2="170" y2="18" stroke="${B.kiln}" stroke-width="1" opacity="0.7"/>` +
        `<circle cx="6" cy="18" r="2" fill="${B.kiln}"/>` +
        `<circle cx="174" cy="18" r="2" fill="${B.kiln}"/>` +
        `<polygon points="90,8 100,18 90,28 80,18" fill="${B.kiln}"/>` +
        `<rect x="89.5" y="11" width="1" height="14" fill="${B.vellum}"/>` +
      `</svg>`
    out = out.replace(
      /<table\b([^>]*)>([\s\S]*?)<\/table>/gi,
      (full, attrs: string, body: string) => {
        // Skip ToC rows and hanging-numeral tables — already styled
        if (/data-ink-toc-row=/i.test(attrs) || /data-ink-num=/i.test(attrs)) return full
        return (
          `<div data-ink-frame="1" style="margin:2em 0;padding:18px 16px 16px;` +
          `background:${B.vellum};border-top:4px solid ${B.kiln};border-bottom:1px solid ${B.kiln};` +
          `border-left:1px solid ${B.hairline};border-right:1px solid ${B.hairline};">` +
            // Frame header — flourish + label
            `<div style="text-align:center;margin:0 0 10px;">` +
              frameFlourish +
              `<div style="font-family:'EB Garamond',Georgia,serif;font-size:11px;color:${B.kiln};` +
              `letter-spacing:6px;font-weight:700;margin-top:4px;">◆ TABLE · 表</div>` +
            `</div>` +
            `<table${attrs}>${body}</table>` +
          `</div>`
        )
      },
    )
  }
  return out
}

// ─── Preset CSS ───────────────────────────────────────────────────────────

const V5_CSS = `
#nice {
  font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', STSong, Georgia, serif;
  background: ${B.vellum};
  color: ${B.graphite};
  font-size: 16px;
  line-height: 1.75;
  word-break: break-word;
  overflow-wrap: break-word;
  line-break: strict;
}
#nice h1 {
  font-size: 30px !important;
  font-weight: 700;
  text-align: left !important;
  color: ${B.graphite} !important;
  margin: 0.4em 0 0.3em !important;
  padding: 0 !important;
  border: 0 !important;
  line-height: 1.25;
}
#nice h2 {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 22px;
  font-weight: 700;
  color: ${B.graphite} !important;
  background: transparent !important;
  border: 0 !important;
  line-height: 1.35;
}
#nice h3 {
  font-size: 21px;
  color: ${B.graphite};
  font-weight: 700;
  font-family: 'Source Han Serif SC', 'Songti SC', serif;
  margin: 1.6em 0 0.5em;
  border: 0 !important;
  padding: 4px 0 4px 16px !important;
  border-left: 4px solid ${B.kiln} !important;
  background: linear-gradient(90deg, rgba(217,91,63,0.06) 0%, transparent 60%) !important;
  line-height: 1.4;
}
#nice h4 {
  font-size: 16px;
  color: ${B.ash};
  font-weight: 700;
  margin: 1.2em 0 0.3em;
  line-height: 1.5;
}
#nice p {
  line-height: 1.75;
  margin: 0 0 1em;
  text-align: justify;
  word-break: break-word;
  overflow-wrap: break-word;
  color: ${B.graphite};
}
#nice strong {
  color: ${B.graphite};
  font-weight: 700;
  background: linear-gradient(180deg, transparent 65%, rgba(217,91,63,0.18) 65%);
  padding: 0 0.05em;
}
#nice em {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic;
  color: ${B.ash};
}
#nice blockquote {
  border-left: 2px solid ${B.kiln} !important;
  border-top: 0 !important;
  border-bottom: 0 !important;
  border-right: 0 !important;
  background: transparent !important;
  padding: 0.5em 1em !important;
  margin: 1.2em 0 !important;
  font-style: italic;
  color: ${B.ash};
  border-radius: 0 !important;
}
#nice blockquote p { text-indent: 0; margin: 0; }
#nice hr { border: 0; height: 0; }
#nice ul, #nice ol { padding-left: 1.2em; margin: 0.8em 0; }
#nice li { margin-bottom: 0.4em; }
#nice ul li::marker { color: ${B.kiln}; }
#nice ol li::marker { color: ${B.kiln}; font-weight: 700; font-family: 'EB Garamond', serif; }
#nice a { color: ${B.graphite}; border-bottom: 0.5px solid ${B.kiln}; text-decoration: none; }
#nice table { border: 0.5px solid ${B.hairline}; margin: 1.2em 0; border-collapse: collapse; width: 100%; }
#nice table thead { border-bottom: 2px solid ${B.kiln} !important; }
#nice table th {
  background: ${B.hearth} !important;
  color: ${B.graphite} !important;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 12px !important;
  border: 0.5px solid ${B.hairline} !important;
  border-bottom: 2px solid ${B.kiln} !important;
}
#nice table td {
  background: #FFF !important;
  border: 0.5px solid ${B.hairline} !important;
  padding: 8px 12px !important;
  color: ${B.graphite};
  font-size: 14px;
  line-height: 1.65;
}
#nice table tr:nth-child(even) td { background: ${B.vellum} !important; }
`

const v5Preset: ExportPreset = {
  id: 'inkforge-v5',
  name: 'InkForge v5（墨锻 · 结构版）',
  icon: 'forge',
  description: 'Structural asymmetry: seal + hanging numerals + pull-quote ink cards + SMIL TOC',
  theme: 'grace',
  fontFamily: 'serif',
  fontSize: '16px',
  primaryColor: B.graphite,
  isUseIndent: false,
  isUseJustify: true,
  previewCSS: V5_CSS,
  exportCSS: V5_CSS,
  decorate: chainDecorators(
    decorateReadingBadge,
    decorateSeal,
    decorateH1,
    decorateDropCap,
    decorateTOC,
    decorateHangingNumerals,
    decoratePullQuote,
    decorateEndmark,
    decorateImageFrame,
  ),
}

// ─── Test ─────────────────────────────────────────────────────────────────

describe('fidelity v5 · InkForge Structural (篆刻 + hanging nums + pull-quote ink cards)', () => {
  it('renders article through v5 structural preset', async () => {
    const raw = readFileSync(ARTICLE_PATH, 'utf8')
    expect(raw.length).toBeGreaterThan(30_000)

    const { markdown, stats: preprocStats } = preprocessArticleForWechat(raw)
    assertPreprocessLooksReasonable(preprocStats)

    if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

    const { html, stats } = await markdownToWechatWithStats(markdown, v5Preset, {
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

    // ─── Gates ───────────────────────────────────────────────────────
    expect((html.match(/\*\*/g) ?? []).length).toBe(0)

    const seal = (html.match(/data-ink-seal=/g) ?? []).length
    expect(seal).toBe(1)

    const nums = (html.match(/data-ink-num=/g) ?? []).length
    expect(nums).toBe(6)

    const toc = (html.match(/data-ink-toc=/g) ?? []).length
    expect(toc).toBe(1)

    const dc = (html.match(/data-ink-dc=/g) ?? []).length
    expect(dc).toBe(1)

    const pqs = (html.match(/data-ink-pq=/g) ?? []).length
    expect(pqs).toBe(0)

    const endmark = (html.match(/data-ink-end=/g) ?? []).length
    expect(endmark).toBe(1)

    const badge = (html.match(/data-ink-badge=/g) ?? []).length
    expect(badge).toBe(1)

    const title = '中国数字人民币战略全景报告 · v5 InkForge Structural（墨锻 · 结构版）'
    const docHtml = buildDoc(html, title)
    writeFileSync(OUTPUT_HTML, docHtml, 'utf8')
    writeFileSync(OUTPUT_STATS, JSON.stringify({
      version: 'v5',
      brand: 'InkForge Structural',
      presetId: v5Preset.id,
      palette: B,
      generatedAt: new Date().toISOString(),
      markdownBytesOriginal: Buffer.byteLength(raw, 'utf8'),
      markdownBytesPreprocessed: Buffer.byteLength(markdown, 'utf8'),
      htmlBytes: Buffer.byteLength(docHtml, 'utf8'),
      innerHtmlBytes: Buffer.byteLength(html, 'utf8'),
      preprocStats,
      renderStats: stats,
      decorations: { seal, nums, toc, dc, pqs, endmark, badge, strayBold: 0 },
    }, null, 2), 'utf8')

    expect(existsSync(OUTPUT_HTML)).toBe(true)
  }, 60_000)
})

function buildDoc(inner: string, title: string): string {
  const t = escapeHtml(title)
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', ' UTC')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<style>
html,body{margin:0;padding:0}
body{background:${B.hearth};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif}
.shell{max-width:720px;margin:24px auto;box-shadow:0 6px 24px rgba(37,41,51,0.06);border-radius:2px;overflow:hidden}
.chrome{background:#fff;padding:16px 20px;border-bottom:1px solid #ececec}
.chrome .name{font-size:17px;font-weight:600;color:${B.graphite}}
.chrome .meta{font-size:12px;color:${B.ash};margin-top:4px}
.chrome .meta a{color:${B.kiln};text-decoration:none}
.body{background:${B.vellum}}
.footer{font-size:12px;color:${B.ash};text-align:center;padding:16px;background:#fff;border-top:1px dashed #ececec}
.banner{font-size:12px;color:${B.graphite};background:#fef8f0;border:1px solid ${B.hairline};padding:8px 12px;margin:0 0 12px}
</style>
</head>
<body>
<div class="shell">
  <div class="banner">InkForge v5 · 结构版（Graphite + Kiln，2 色收敛）· 复制 <code>&lt;section id="nice"&gt;</code> 到微信后台。</div>
  <header class="chrome">
    <div class="name">InkForge · v5 结构版</div>
    <div class="meta"><a href="#">InkForge</a> · ${escapeHtml(ts)}</div>
  </header>
  <main class="body">${inner}</main>
  <footer class="footer">InkForge v5 · ${escapeHtml(ts)}</footer>
</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
