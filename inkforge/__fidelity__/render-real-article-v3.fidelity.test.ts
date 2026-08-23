/**
 * @vitest-environment happy-dom
 *
 * v3 fidelity fixture — Stratechery-风 自定义 preset，金融研报体。
 *
 * 调色板：navy #0a2540 + gold #b8860b + cream #fbf9f4。
 * 视觉元素：
 *  - H1 居中大号 serif + ◆◆◆ ornament 双侧
 *  - H1 后 italic 副标题（Garamond）
 *  - H2 oversize 01-06 半透明 Arabic 数字 + 标题 + 60px 金色短下划线
 *  - H3 § 前缀 + italic
 *  - H4 SMALL CAPS Latin（CJK 无副作用）
 *  - Strong 金色 65%-基线高亮 + navy 文字
 *  - Em Garamond italic 金色变体
 *  - Drop cap 3.4em navy 浮动首字（首段正文）
 *  - Table navy header on cream body
 *  - HR → ◆ ◆ ◆ ornament
 *  - 暗黑模式 strong/em 全覆盖
 *
 * 运行：cd inkforge && npx vitest run __fidelity__/render-real-article-v3.fidelity.test.ts
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { markdownToWechatWithStats } from '@/services/export/wechat'
import { chainDecorators } from '@/services/export/preset-decorations'
import type { ExportPreset, ExportTarget } from '@/types'

import { preprocessArticleForWechat, assertPreprocessLooksReasonable } from './preprocess-article'

const REPO_ROOT = resolve(__dirname, '..', '..')
const ARTICLE_PATH = resolve(REPO_ROOT, 'experiment', '正文1.0.md')
const OUTPUT_DIR = resolve(
  REPO_ROOT,
  '.trellis',
  'tasks',
  '05-26-render-wechat-fidelity-test',
  'output',
)
const OUTPUT_HTML = resolve(OUTPUT_DIR, '正文1.0-wechat-v3.html')
const OUTPUT_STATS = resolve(OUTPUT_DIR, '正文1.0-wechat-v3.stats.json')

// ─── Decorators ────────────────────────────────────────────────────────────

/** 把每个 <h2> 头部插入半透明 oversize Arabic 序号（01..06）。
 *  注：postProcessForWechat 会剥离所有 class= 属性（行 976），所以我们用 data-v3-*
 *  做幂等性标记 + 测试断言锚点，data-* 属性在 WeChat 合规化中得以保留。 */
function decorateV3OversizeNumerals(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-v3-num=/i.test(html)) return html
  let counter = 0
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, attrs: string | undefined, content: string) => {
    counter += 1
    const num = String(counter).padStart(2, '0')
    const a = attrs ?? ''
    return (
      `<h2${a}>` +
      `<span data-v3-num="${num}" style="display:inline-block;font-size:2.6em;color:rgba(10,37,64,0.22);` +
      `font-family:'EB Garamond','Crimson Pro',Georgia,serif;font-weight:700;letter-spacing:-0.03em;` +
      `margin-right:0.45em;vertical-align:-0.08em;line-height:1;">${num}</span>` +
      `<span data-v3-h2-text="1">${content}</span>` +
      `</h2>`
    )
  })
}

/** 在 H2 文本下方注入 60px 金色短下划线（juice 内联后用真实 div 实现，
 *  避开 ::after 在 WeChat 端的不可靠表现）。 */
function decorateV3GoldUnderline(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-v3-rule=/i.test(html)) return html
  return html.replace(
    /<\/h2>/gi,
    `</h2><div data-v3-rule="1" style="width:88px;height:4px;background:#b8860b;margin:0.5em 0 1.6em 0;border-radius:1px;"></div>`,
  )
}

/** <hr> → ◆ ◆ ◆ 金色 ornament；并在每个 H2 章节标题前（首章除外）插入同款
 *  ornament 制造章节呼吸。 */
function decorateV3OrnamentHr(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-v3-ornament-hr=/i.test(html)) return html
  const ornamentDiv =
    `<div data-v3-ornament-hr="1" style="text-align:center;margin:3em 0;color:#b8860b;letter-spacing:0.8em;font-size:20px;opacity:0.9;">◆ ◆ ◆</div>`
  // 1. 真实 <hr> 全部替换。
  let result = html.replace(/<hr\s*\/?>/gi, ornamentDiv)
  // 2. 每个 H2 章节标题前注入；用计数器跳过第一个。
  let h2Counter = 0
  result = result.replace(/<h2(\s[^>]*)?>/gi, (match) => {
    h2Counter += 1
    if (h2Counter === 1) return match
    return ornamentDiv + match
  })
  return result
}

/** H1 上下加 ◆ ◆ ◆ 金色 ornament，并把紧跟着的 <em> 副标题包装居中。 */
function decorateV3H1Ornaments(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-v3-h1-ornament-top=/i.test(html)) return html
  return html.replace(
    /(<h1(\s[^>]*)?>[\s\S]*?<\/h1>)\s*(<p(\s[^>]*)?>\s*<em[^>]*>[\s\S]*?<\/em>\s*<\/p>)?/i,
    (_m, h1: string, _attrs: string | undefined, subtitleP: string | undefined) => {
      const top = `<div data-v3-h1-ornament-top="1" style="text-align:center;margin:2em 0 0.6em 0;color:#b8860b;letter-spacing:0.8em;font-size:20px;opacity:0.9;">◆ ◆ ◆</div>`
      const bottom = `<div data-v3-h1-ornament-bot="1" style="text-align:center;margin:0.4em 0 2.4em 0;color:#b8860b;letter-spacing:0.8em;font-size:20px;opacity:0.9;">◆ ◆ ◆</div>`
      // subtitle 居中 + Garamond 金色，data-v3-subtitle 标记。
      // 注：juice 已经把 paragraph CSS 内联到 <p style="...">，
      // 直接追加新的 style="..." 会产生双属性（无效 HTML）。
      // 这里把 v3 子标题样式合并进既有 style 字符串。
      let subtitle = subtitleP ?? ''
      if (subtitle) {
        const subtitleExtraStyle =
          `text-align:center;font-family:'EB Garamond','Crimson Pro',Georgia,serif;` +
          `font-style:italic;color:#b8860b;letter-spacing:0.06em;font-size:1.05em;` +
          `margin:0.4em 0 0;text-indent:0;`
        // case A: <p style="...">  → 合并; case B: <p>  → 注入新 style
        if (/<p\s+[^>]*style=/i.test(subtitle)) {
          subtitle = subtitle.replace(
            /<p(\s[^>]*?)style=("[^"]*"|'[^']*')([^>]*)>/i,
            (_m, before: string, styleVal: string, after: string) => {
              const inner = styleVal.slice(1, -1).replace(/;\s*$/, '')
              return `<p${before}style="${inner};${subtitleExtraStyle}"${after} data-v3-subtitle="1">`
            },
          )
        } else {
          subtitle = subtitle.replace(
            /<p(\s[^>]*)?>/i,
            `<p$1 data-v3-subtitle="1" style="${subtitleExtraStyle}">`,
          )
        }
        // 同时把里面 <em> 的颜色/字体强制覆盖（juice 已经设了 #8a6500，但居中布局要保持）
        subtitle = subtitle.replace(
          /<em(\s[^>]*?)?style=("[^"]*"|'[^']*')([^>]*?)>/i,
          (_m, before: string | undefined, styleVal: string, after: string) => {
            const b = before ?? ''
            const inner = styleVal.slice(1, -1).replace(/;\s*$/, '')
            const emOverride = `color:#b8860b;font-size:1em;letter-spacing:0.04em;`
            return `<em${b}style="${inner};${emOverride}"${after}>`
          },
        )
      }
      return `${top}${h1}${subtitle}${bottom}`
    },
  )
}

/** Drop cap 注入：跳过 H1 + 副标题 <p>，落在文章正文第一段。 */
function decorateV3DropCap(html: string, target: ExportTarget): string {
  if (target === 'preview') return html
  if (/data-v3-dc=/i.test(html)) return html
  // 找到 H1 之后的第一个【非 v3-subtitle】<p>
  // 思路：先把 <h1>...</h1>+(可选 subtitle p) 部分切走，处理剩余内容的第一个 <p>。
  const splitMatch = html.match(/<h1[\s\S]*?<\/h1>(?:\s*<p[^>]*data-v3-subtitle="1"[\s\S]*?<\/p>)?/i)
  if (!splitMatch) return html
  const head = splitMatch[0]
  const tailStart = (splitMatch.index ?? 0) + head.length
  const tail = html.slice(tailStart)
  // 在 tail 中第一个 <p ...><X> 注入 drop cap
  let dropped = false
  const newTail = tail.replace(
    /<p(\s[^>]*)?>(\s*)([一-鿿㐀-䶿A-Za-z0-9])/,
    (match, attrs: string | undefined, ws: string, ch: string) => {
      if (dropped) return match
      dropped = true
      const a = attrs ?? ''
      return (
        `<p${a}>${ws}<span data-v3-dc="1" style="font-size:3.4em;font-weight:700;float:left;` +
        `line-height:0.88;margin:0.05em 0.14em -0.06em 0;color:#0a2540;` +
        `font-family:'Source Han Serif SC','EB Garamond',Georgia,serif;">${ch}</span>`
      )
    },
  )
  return html.slice(0, splitMatch.index ?? 0) + head + newTail
}

// ─── Preset ───────────────────────────────────────────────────────────────

const V3_CSS = `
#nice {
  font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Source Han Serif CN', 'EB Garamond', 'Crimson Pro', Georgia, serif;
  background: #fbf9f4;
  color: #1a1a1a;
  font-size: 16px;
  line-height: 1.85;
}
#nice h1 {
  font-size: 2.2em !important;
  font-weight: 700;
  text-align: center;
  color: #0a2540 !important;
  margin: 0.4em 0 0.3em !important;
  padding: 0 !important;
  letter-spacing: 0.04em;
  border-bottom: 0 !important;
  font-family: 'Source Han Serif SC', 'EB Garamond', Georgia, serif;
  line-height: 1.3;
}
#nice h2 {
  margin: 2.6em 0 0.4em 0 !important;
  padding: 0 !important;
  font-size: 1.55em;
  font-weight: 700;
  color: #0a2540 !important;
  background: transparent !important;
  border-left: 0 !important;
  border-bottom: 0 !important;
  border-radius: 0 !important;
  letter-spacing: 0.02em;
  line-height: 1.35;
}
#nice h3 {
  font-size: 1.18em;
  color: #0a2540;
  font-weight: 600;
  margin: 1.8em 0 0.6em 0;
  font-style: italic;
  border-left: 0 !important;
  padding-left: 0 !important;
}
#nice h3::before {
  content: '§\\00a0';
  color: #b8860b;
  font-weight: 400;
  font-family: 'EB Garamond', Georgia, serif;
  margin-right: 0.15em;
  font-style: normal;
}
#nice h4 {
  font-size: 1em;
  color: #0a2540;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin: 1.4em 0 0.5em 0;
  font-variant: small-caps;
}
#nice p {
  line-height: 1.95;
  margin: 0 0 1em 0;
  text-align: justify;
  color: #1a1a1a;
}
#nice strong {
  color: #0a2540;
  font-weight: 700;
  background: linear-gradient(180deg, transparent 62%, rgba(184,134,11,0.20) 62%);
  padding: 0 0.08em;
}
#nice em {
  font-family: 'EB Garamond', 'Crimson Pro', Georgia, serif;
  font-style: italic;
  color: #8a6500;
}
#nice blockquote {
  border-left: 0 !important;
  border-top: 2px solid #b8860b !important;
  border-bottom: 2px solid #b8860b !important;
  background: transparent !important;
  padding: 1.2em 0 !important;
  margin: 2em 0 !important;
  font-style: italic;
  text-align: center;
  font-size: 1.08em;
  color: #0a2540;
  border-radius: 0 !important;
}
#nice blockquote p {
  text-indent: 0;
  line-height: 1.7;
  margin: 0;
}
#nice hr {
  border: 0;
  height: 0;
}
#nice ul li::marker { color: #b8860b; }
#nice ol li::marker { color: #b8860b; font-weight: 700; font-family: 'EB Garamond', Georgia, serif; }
#nice a {
  color: #0a2540;
  border-bottom: 1px solid #b8860b;
  text-decoration: none;
}
#nice table {
  border: 1px solid #d0c8b8;
  margin: 1.6em 0;
  border-collapse: collapse;
  width: 100%;
}
#nice table th {
  background: #0a2540 !important;
  color: #fbf9f4 !important;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 12px 14px !important;
  border: 1px solid #0a2540 !important;
  text-align: left;
}
#nice table td {
  background: #fefdfa !important;
  border: 1px solid #e0d8c4 !important;
  padding: 12px 14px !important;
  color: #1a1a1a;
}
`

const v3Preset: ExportPreset = {
  id: 'v3-finance-report',
  name: '金融研报体（v3 自定义）',
  icon: 'thesis',
  description: 'Stratechery 风：navy + gold + cream，oversize 序号 + 金色短下划线 + ornament HR',
  theme: 'grace',
  fontFamily: 'serif',
  fontSize: '16px',
  primaryColor: '#0a2540',
  isUseIndent: false,
  isUseJustify: true,
  previewCSS: V3_CSS,
  exportCSS: V3_CSS,
  decorate: chainDecorators(
    decorateV3H1Ornaments,
    decorateV3DropCap,
    decorateV3OversizeNumerals,
    decorateV3GoldUnderline,
    decorateV3OrnamentHr,
  ),
}

// ─── Test ──────────────────────────────────────────────────────────────────

describe('fidelity fixture v3 · WeChat render (Stratechery preset, ornaments + oversize numerals)', () => {
  it('renders preprocessed article through v3 custom preset and writes v3 output', async () => {
    const raw = readFileSync(ARTICLE_PATH, 'utf8')
    expect(raw.length).toBeGreaterThan(30_000)

    const { markdown, stats: preprocStats } = preprocessArticleForWechat(raw)
    assertPreprocessLooksReasonable(preprocStats)

    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    const { html, stats } = await markdownToWechatWithStats(markdown, v3Preset, {
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

    // ─── Regression gates ────────────────────────────────────────────────
    const strayBold = (html.match(/\*\*/g) ?? []).length
    expect(strayBold).toBe(0)

    const oversizeNum = (html.match(/data-v3-num=/g) ?? []).length
    expect(oversizeNum).toBe(6) // 6 章节

    const goldRule = (html.match(/data-v3-rule=/g) ?? []).length
    expect(goldRule).toBe(6)

    const ornamentH1 = (html.match(/data-v3-h1-ornament-top=/g) ?? []).length
    expect(ornamentH1).toBe(1)

    const dropCap = (html.match(/data-v3-dc=/g) ?? []).length
    expect(dropCap).toBe(1)

    const ornamentHr = (html.match(/data-v3-ornament-hr=/g) ?? []).length
    // 6 个章节 - 首章 = 5 个章节前 ornament，外加任何 <hr> 替换。
    expect(ornamentHr).toBeGreaterThanOrEqual(5)

    const articleTitle = '中国数字人民币战略全景报告 · v3 微信渲染（金融研报体）'
    const docHtml = buildStandaloneDoc(html, articleTitle, v3Preset.id, v3Preset.primaryColor)
    writeFileSync(OUTPUT_HTML, docHtml, 'utf8')
    writeFileSync(
      OUTPUT_STATS,
      JSON.stringify(
        {
          version: 'v3',
          presetId: v3Preset.id,
          presetName: v3Preset.name,
          presetPrimaryColor: v3Preset.primaryColor,
          generatedAt: new Date().toISOString(),
          markdownBytesOriginal: Buffer.byteLength(raw, 'utf8'),
          markdownBytesPreprocessed: Buffer.byteLength(markdown, 'utf8'),
          htmlBytes: Buffer.byteLength(docHtml, 'utf8'),
          innerHtmlBytes: Buffer.byteLength(html, 'utf8'),
          preprocStats,
          renderStats: stats,
          decorations: {
            oversizeNumerals: oversizeNum,
            goldUnderlines: goldRule,
            h1OrnamentTop: ornamentH1,
            dropCap: dropCap,
            ornamentHr,
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
<meta name="generator" content="InkForge fidelity fixture v3 (preset=${safePreset})">
<title>${safeTitle}</title>
<style>
  html, body { margin: 0; padding: 0; }
  body { background: #f0ece4; font-family: -apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif; }
  .wechat-fidelity-shell { max-width: 720px; margin: 24px auto; box-shadow: 0 10px 32px rgba(10,37,64,0.10); border-radius: 2px; overflow: hidden; }
  .wechat-fidelity-chrome { background: #ffffff; padding: 16px 20px; border-bottom: 1px solid #ececec; }
  .wechat-fidelity-chrome .name { font-size: 17px; font-weight: 600; color: #0a2540; line-height: 1.4; }
  .wechat-fidelity-chrome .meta { font-size: 12px; color: #999; margin-top: 4px; }
  .wechat-fidelity-chrome .meta a { color: ${safeColor}; text-decoration: none; }
  .wechat-fidelity-body { background: #fbf9f4; }
  .wechat-fidelity-footer { font-size: 12px; color: #999; text-align: center; padding: 16px; background: #ffffff; border-top: 1px dashed #ececec; }
  .wechat-fidelity-banner { font-size: 12px; color: #0a2540; background: #fffbe9; border: 1px solid #b8860b; border-radius: 2px; padding: 8px 12px; margin: 0 0 12px; }
</style>
</head>
<body>
<div class="wechat-fidelity-shell">
  <div class="wechat-fidelity-banner">
    fidelity fixture v3 · preset=<strong>${safePreset}</strong>（Stratechery 风：navy + gold + cream）· 复制时请仅复制 <code>&lt;section id="nice"&gt;…&lt;/section&gt;</code> 到微信后台。
  </div>
  <header class="wechat-fidelity-chrome">
    <div class="name">InkForge · 渲染保真度测试 v3</div>
    <div class="meta"><a href="#">InkForge</a> · ${escapeHtml(generatedAt)} · preset=${safePreset}</div>
  </header>
  <main class="wechat-fidelity-body">
    ${innerHtml}
  </main>
  <footer class="wechat-fidelity-footer">
    generated by InkForge fidelity fixture v3 · preset <strong>${safePreset}</strong> · primary <span style="color:${safeColor}">${safeColor}</span>
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
