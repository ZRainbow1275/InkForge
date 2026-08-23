/**
 * @vitest-environment happy-dom
 *
 * v2 fidelity fixture：用 preprocess-article + `elegant` preset 重渲染
 * D:/Desktop/Inkforge/experiment/正文1.0.md。
 *
 * v1 三大短板这一版要解决:
 *  1. 77 处 `**X**` 字面残留（CJK 标点旁的 CommonMark flanking 规则失败）
 *     → preprocessArticleForWechat 在 marked 之前把它们改写成 <strong> HTML。
 *  2. H3/H4 视觉层级塌缩（六个章节 H3 与子节 H3 同色同字号）
 *     → preprocessor 把"### **第X部分…**" 提升为 ## H2 +
 *       elegant preset 的 cjk-decimal-h2 + double-border H2 让章节自然脱颖。
 *  3. 死板 report 蓝调（#004080 商务理性）
 *     → elegant preset：深紫 #4a3c5a + 思源宋体 + EB Garamond,
 *       带 cjk-drop-cap / large-quote / h3-vertical-accent 装饰，更具书卷气。
 *
 * 运行：cd inkforge && npx vitest run __fidelity__/render-real-article-v2.fidelity.test.ts
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { markdownToWechatWithStats } from '@/services/export/wechat'
import { themePresets } from '@/services/export/themes'

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
const OUTPUT_HTML = resolve(OUTPUT_DIR, '正文1.0-wechat-v2.html')
const OUTPUT_STATS = resolve(OUTPUT_DIR, '正文1.0-wechat-v2.stats.json')
const OUTPUT_PROCESSED_MD = resolve(OUTPUT_DIR, '正文1.0.preprocessed.md')

// elegant preset：深紫书卷 + drop cap + 大引号 + cjk-decimal h2 + h3 竖条。
const PRESET_ID = 'elegant'

describe('fidelity fixture v2 · WeChat render (elegant preset, preprocessed)', () => {
  it('renders preprocessed article through elegant preset and writes v2 output', async () => {
    const preset = themePresets.find((p) => p.id === PRESET_ID)
    if (!preset) {
      throw new Error(`preset ${PRESET_ID} not found in themePresets`)
    }

    const raw = readFileSync(ARTICLE_PATH, 'utf8')
    expect(raw.length).toBeGreaterThan(30_000)

    const { markdown, stats: preprocStats } = preprocessArticleForWechat(raw)
    assertPreprocessLooksReasonable(preprocStats)

    // 留底——便于审计预处理是否按预期改写
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true })
    }
    writeFileSync(OUTPUT_PROCESSED_MD, markdown, 'utf8')

    const { html, stats } = await markdownToWechatWithStats(markdown, preset, {
      enableCjkSpacing: true,
      maxContentWidth: 677,
      enableDarkMode: true, // v2：开启暗黑模式元数据，避免 252 处 linear-gradient 高亮在夜读丢失
      enableReadingTime: true,
      enableCiteStatus: true,
      enableAlertBlocks: true,
      enableEnhancedTable: true,
      enableCodeHighlight: true,
      enableCodeLanguageLabel: true,
      enableTextIndent: true, // v2：lifestyle persona + 首段 drop cap 需要 text-indent: 2em
      fontFamily: 'serif',
      fontSize: '16px',
    })

    expect(html).toContain('<section')
    expect(html).toContain('id="nice"')
    expect(html.length).toBeGreaterThan(10_000)

    // v2 关键回归门：marked 之前已经把 `**X**` 翻译成 <strong>，
    // 渲染后正文里不应再出现裸 `**`。
    const strayBoldMarkers = (html.match(/\*\*/g) ?? []).length
    expect(strayBoldMarkers).toBe(0)

    const articleTitle = '中国数字人民币战略全景报告 · v2 微信公众号渲染（elegant preset）'
    const docHtml = buildStandaloneDoc(html, articleTitle, preset.id, preset.primaryColor)
    writeFileSync(OUTPUT_HTML, docHtml, 'utf8')
    writeFileSync(
      OUTPUT_STATS,
      JSON.stringify(
        {
          version: 'v2',
          presetId: preset.id,
          presetName: preset.name,
          presetPrimaryColor: preset.primaryColor,
          generatedAt: new Date().toISOString(),
          markdownBytesOriginal: Buffer.byteLength(raw, 'utf8'),
          markdownBytesPreprocessed: Buffer.byteLength(markdown, 'utf8'),
          htmlBytes: Buffer.byteLength(docHtml, 'utf8'),
          innerHtmlBytes: Buffer.byteLength(html, 'utf8'),
          preprocStats,
          renderStats: stats,
          regression: {
            strayBoldMarkers,
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
<meta name="generator" content="InkForge fidelity fixture v2 (preset=${safePreset})">
<title>${safeTitle}</title>
<style>
  html, body { margin: 0; padding: 0; }
  body { background: #ece9e2; font-family: -apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif; }
  .wechat-fidelity-shell { max-width: 720px; margin: 24px auto; box-shadow: 0 6px 24px rgba(74,60,90,0.12); }
  .wechat-fidelity-chrome { background: #ffffff; padding: 16px 20px; border-bottom: 1px solid #ececec; }
  .wechat-fidelity-chrome .name { font-size: 17px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
  .wechat-fidelity-chrome .meta { font-size: 12px; color: #999; margin-top: 4px; }
  .wechat-fidelity-chrome .meta a { color: ${safeColor}; text-decoration: none; }
  .wechat-fidelity-body { background: #ffffff; }
  .wechat-fidelity-footer { font-size: 12px; color: #999; text-align: center; padding: 16px; background: #ffffff; border-top: 1px dashed #ececec; }
  .wechat-fidelity-banner { font-size: 12px; color: #4a3c5a; background: #f4f2f8; border: 1px solid #d8d0e0; border-radius: 4px; padding: 8px 12px; margin: 0 0 12px; }
</style>
</head>
<body>
<div class="wechat-fidelity-shell">
  <div class="wechat-fidelity-banner">
    fidelity fixture v2 · preset=<strong>${safePreset}</strong>（preprocess + elegant 主题）· 复制时请仅复制 <code>&lt;section id="nice"&gt;…&lt;/section&gt;</code> 到微信后台。
  </div>
  <header class="wechat-fidelity-chrome">
    <div class="name">InkForge · 渲染保真度测试 v2</div>
    <div class="meta"><a href="#">InkForge</a> · ${escapeHtml(generatedAt)} · preset=${safePreset}</div>
  </header>
  <main class="wechat-fidelity-body">
    ${innerHtml}
  </main>
  <footer class="wechat-fidelity-footer">
    generated by InkForge fidelity fixture v2 · preset <strong>${safePreset}</strong> · primary <span style="color:${safeColor}">${safeColor}</span>
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
