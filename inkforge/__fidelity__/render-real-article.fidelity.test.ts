/**
 * @vitest-environment happy-dom
 *
 * 一次性 fidelity fixture：用真实 markdownToWechatWithStats 管线渲染
 * D:/Desktop/Inkforge/experiment/正文1.0.md，把结果包装成一份可独立浏览器打开的
 * HTML，落盘到 .trellis/tasks/05-26-render-wechat-fidelity-test/output/。
 *
 * 不属于常规测试套件 — 与 trellis 任务 05-26-render-wechat-fidelity-test 配对。
 * 运行：cd inkforge && npx vitest run __fidelity__/render-real-article.fidelity.test.ts
 *
 * 不要把 expect 当成"功能测试"看 — 这里 expect 只是保证 happy-dom 环境
 * 能跑通管线、文件成功落盘，真正的验收靠 fidelity_report.md。
 */

import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { markdownToWechatWithStats } from '@/services/export/wechat'
import { themePresets } from '@/services/export/themes'

// Trellis-managed绝对路径（fixture 锁定在仓库根）
const REPO_ROOT = resolve(__dirname, '..', '..')
const ARTICLE_PATH = resolve(REPO_ROOT, 'experiment', '正文1.0.md')
const OUTPUT_DIR = resolve(
  REPO_ROOT,
  '.trellis',
  'tasks',
  '05-26-render-wechat-fidelity-test',
  'output',
)
const OUTPUT_HTML = resolve(OUTPUT_DIR, '正文1.0-wechat.html')
const OUTPUT_STATS = resolve(OUTPUT_DIR, '正文1.0-wechat.stats.json')

// 选择 report preset：商务理性 + 商务蓝调，h2 编号 + pull-quote 双线对接
// 文章的"第N部分 / 1.x"分级结构最自然。
const PRESET_ID = 'report'
// 主色保持 report 默认 #004080；本任务不做主色覆盖。

describe('fidelity fixture · WeChat render of 正文1.0.md', () => {
  it('renders the full article through markdownToWechatWithStats and writes output', async () => {
    const preset = themePresets.find((p) => p.id === PRESET_ID)
    if (!preset) {
      throw new Error(`preset ${PRESET_ID} not found in themePresets`)
    }

    const markdown = readFileSync(ARTICLE_PATH, 'utf8')
    expect(markdown.length).toBeGreaterThan(30_000)

    const { html, stats } = await markdownToWechatWithStats(markdown, preset, {
      enableCjkSpacing: true,
      maxContentWidth: 677,
      enableDarkMode: false,
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

    expect(html).toContain('<section')
    expect(html).toContain('id="nice"')
    expect(html.length).toBeGreaterThan(10_000)

    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    const articleTitle = '中国数字人民币战略全景报告 · 微信公众号渲染保真度测试'
    const docHtml = buildStandaloneDoc(html, articleTitle, preset.id, preset.primaryColor)
    writeFileSync(OUTPUT_HTML, docHtml, 'utf8')
    writeFileSync(
      OUTPUT_STATS,
      JSON.stringify(
        {
          presetId: preset.id,
          presetName: preset.name,
          presetPrimaryColor: preset.primaryColor,
          generatedAt: new Date().toISOString(),
          markdownBytes: Buffer.byteLength(markdown, 'utf8'),
          htmlBytes: Buffer.byteLength(docHtml, 'utf8'),
          innerHtmlBytes: Buffer.byteLength(html, 'utf8'),
          stats,
        },
        null,
        2,
      ),
      'utf8',
    )

    // sanity — 文件确实落盘
    expect(existsSync(OUTPUT_HTML)).toBe(true)
    expect(existsSync(OUTPUT_STATS)).toBe(true)
  }, 60_000)
})

/**
 * 把 wechat-rendered `<section id="nice">…</section>` 包成可独立浏览器打开的 HTML 文档。
 * 顶部 chrome 模拟微信公众号文章页头；外层用 #f5f6f7 衬底凸显 677px 内容列。
 */
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
<meta name="generator" content="InkForge fidelity fixture (preset=${safePreset})">
<title>${safeTitle}</title>
<style>
  html, body { margin: 0; padding: 0; }
  body { background: #f5f6f7; font-family: -apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC','Hiragino Sans GB','Microsoft YaHei',Arial,sans-serif; }
  .wechat-fidelity-shell { max-width: 720px; margin: 24px auto; }
  .wechat-fidelity-chrome { background: #ffffff; padding: 16px 20px; border-bottom: 1px solid #ececec; }
  .wechat-fidelity-chrome .name { font-size: 17px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
  .wechat-fidelity-chrome .meta { font-size: 12px; color: #999; margin-top: 4px; }
  .wechat-fidelity-chrome .meta a { color: ${safeColor}; text-decoration: none; }
  .wechat-fidelity-body { background: #ffffff; }
  .wechat-fidelity-footer { font-size: 12px; color: #999; text-align: center; padding: 16px; background: #ffffff; border-top: 1px dashed #ececec; }
  .wechat-fidelity-banner { font-size: 12px; color: #666; background: #fff3cd; border: 1px solid #f4d97a; border-radius: 4px; padding: 8px 12px; margin: 0 0 12px; }
</style>
</head>
<body>
<div class="wechat-fidelity-shell">
  <div class="wechat-fidelity-banner">
    fidelity fixture · 此 HTML 由 InkForge wechat 导出管线渲染生成；复制时请仅复制 <code>&lt;section id="nice"&gt;…&lt;/section&gt;</code> 部分到微信后台。
  </div>
  <header class="wechat-fidelity-chrome">
    <div class="name">InkForge · 渲染保真度测试</div>
    <div class="meta"><a href="#">InkForge</a> · ${escapeHtml(generatedAt)} · preset=${safePreset}</div>
  </header>
  <main class="wechat-fidelity-body">
    ${innerHtml}
  </main>
  <footer class="wechat-fidelity-footer">
    generated by InkForge fidelity fixture · preset <strong>${safePreset}</strong> · primary <span style="color:${safeColor}">${safeColor}</span>
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
