/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from 'vitest'
import {
  convertToNativeFormat,
  convertToWechatWithStats,
  detectQuality,
  getDefaultPreset,
  markdownToXiaohongshuText,
  markdownToZhihuClean,
} from './index'

const REAL_EXPORT_MARKDOWN = [
  '# 发布验证',
  '',
  '正文包含 [官网](https://vite.dev) 和 ![架构图](https://example.com/arch.png)。',
  '',
  '> [!NOTE]',
  '> 请先在目标平台预览真实草稿。',
  '',
  '| 渠道 | 原生格式 |',
  '| --- | --- |',
  '| 微信 | HTML |',
  '| 小红书 | 纯文本 |',
  '',
  '```mermaid',
  'graph TD',
  'A-->B',
  '```',
  '',
  '```ts',
  'const exported = true',
  '```',
  '',
  '<span class="legacy" style="color:red">HTML文本</span>',
].join('\n')

describe('platform native export rendering rules', () => {
  it('keeps WeChat HTML compatible with draft content sanitization and inline CSS rendering', () => {
    const preset = getDefaultPreset()
    const result = convertToWechatWithStats(
      [
        '<style>.bad{display:flex;gap:8px}</style>',
        '<section class="bad" style="display:flex;gap:8px;color:var(--md-primary-color)">',
        '<h1 style="margin-top:24px">发布验证</h1>',
        '<p onclick="evil()">正文<a href="javascript:alert(1)">坏链</a><a href="https://vite.dev">官网</a></p>',
        '<img class="hero" src="https://example.com/a.png" width="640" height="480" alt="架构图">',
        '<pre><code class="language-ts">const exported = true</code></pre>',
        '<table><tr><th>渠道</th><th>格式</th></tr><tr><td>微信</td><td>HTML</td></tr></table>',
        '<script>alert(1)</script><iframe></iframe>',
        '</section>',
      ].join(''),
      preset,
      { enableReadingTime: false, enableCiteStatus: true }
    )

    expect(result.html).not.toMatch(/<style\b/i)
    expect(result.html).not.toMatch(/<script\b|<iframe\b|<form\b|<input\b/i)
    expect(result.html).not.toMatch(/\sclass=/i)
    expect(result.html).not.toMatch(/javascript:/i)
    expect(result.html).not.toMatch(/onclick=/i)
    expect(result.html).not.toMatch(/display:\s*flex|gap:\s*8px|var\(/i)
    expect(result.html).toMatch(/style="[^"]+"/i)
    expect(result.html).toContain('max-width:100%')
    expect(result.html).toContain('border:1px solid #ddd')
    expect(result.html).toContain('https://vite.dev')
  })

  // ─── P2-T6 WeChat platform-rules 接入 ─────────────────────────────
  // 注意: 故意把 CJK 与 Latin/digit 紧贴在一起以触发间距规则，间距规则会跳过
  // 已经有空白分隔的 token 对（thin-space 或常规空格）。
  const WECHAT_COMPLIANCE_HTML = [
    '<h2 style="color:#333">中文word与Vue3写代码</h2>',
    '<p>正文段落混排React18组件。</p>',
    '<blockquote style="background-color:#eee">引用区</blockquote>',
    '<pre><code>var x = 1</code></pre>',
    '<table><tr><th>列</th></tr><tr><td>值</td></tr></table>',
  ].join('')
  const THIN_SPACE = '\u202F'

  it('inserts U+202F thin space between CJK and Latin/digit on WeChat export by default', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
    })
    expect(result.html).toContain(`中文${THIN_SPACE}word`)
    expect(result.html).toContain(`Vue3${THIN_SPACE}写代码`)
    expect(result.html).toContain(`React18${THIN_SPACE}组件`)
  })

  it('clamps WeChat content to 677px wrapper by default with idempotent marker', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
    })
    expect(result.html).toContain('data-wechat-clamp="1"')
    expect(result.html).toContain('max-width:677px')
  })

  it('skips WeChat content-width clamp when maxContentWidth is null', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
      maxContentWidth: null,
    })
    expect(result.html).not.toContain('data-wechat-clamp="1"')
    expect(result.html).not.toContain('max-width:677px')
  })

  it('honors a custom maxContentWidth on WeChat export', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
      maxContentWidth: 800,
    })
    expect(result.html).toContain('max-width:800px')
  })

  it('injects WeChat dark-mode metadata on h2/blockquote/pre/code/td when enabled', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
      enableDarkMode: true,
    })
    expect(result.html).toMatch(/<h2[^>]*data-darkmode-color=/i)
    expect(result.html).toMatch(/<blockquote[^>]*data-darkmode-color=/i)
    expect(result.html).toMatch(/<pre[^>]*data-darkmode-color=/i)
    expect(result.html).toMatch(/<td[^>]*data-darkmode-color=/i)

    const defaultResult = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
    })
    expect(defaultResult.html).not.toContain('data-darkmode-color')
  })

  it('omits CJK thin-space when enableCjkSpacing is explicitly false', () => {
    const result = convertToWechatWithStats(WECHAT_COMPLIANCE_HTML, getDefaultPreset(), {
      enableReadingTime: false,
      enableCjkSpacing: false,
    })
    expect(result.html).not.toContain(THIN_SPACE)
    expect(result.html).toMatch(/中文word|Vue3写代码|React18组件/)
  })

  it('converts Xiaohongshu export to platform-native plain text without raw Markdown or HTML leakage', () => {
    const result = markdownToXiaohongshuText(REAL_EXPORT_MARKDOWN, {
      addSignature: false,
      autoSplitParagraphs: false,
      generateTags: true,
      injectEmojis: false,
    })

    // P2-T7: 图占位改用 platform-rules/buildImagePlaceholder（带 ratio + size）
    expect(result.text).toContain('[配图1: 架构图（3:4 @ 1080x1440 推荐）')
    expect(result.text).toContain('官网（检索关键词「官网」）')
    expect(result.text).toContain('[配图] Mermaid 图表建议转为图片')
    expect(result.text).toContain('[代码] 代码片段 (ts):')
    expect(result.text).toContain('[表格] 渠道 / 原生格式')
    expect(result.text).not.toMatch(/```|graph TD|<span|style=|class=|!\[|\]\(https?:/i)
    expect(result.overLimit).toBe(false)
    expect(result.suggestedTags.length).toBeGreaterThan(0)
    expect(result.suggestedTags.every(tag => /^#[^#]{2,20}$/.test(tag))).toBe(true)
  })

  it('keeps Zhihu export as clean Markdown while removing platform-hostile HTML and Mermaid source', () => {
    // 默认行为：LaTeX → equation img，表格 → HTML <table>，无 lang code 围栏 → text
    const result = markdownToZhihuClean([REAL_EXPORT_MARKDOWN, '', '$$E=mc^2$$'].join(String.fromCharCode(10)))

    expect(result.markdown).toContain('[官网](https://vite.dev)')
    expect(result.markdown).toContain('![架构图](https://example.com/arch.png)')
    // 默认 tableHandling='html'：GFM 表格转为知乎原生支持的 HTML <table>
    expect(result.markdown).not.toContain('| 渠道 | 原生格式 |')
    expect(result.markdown).toContain('<table>')
    expect(result.markdown).toContain('<th>渠道</th>')
    expect(result.markdown).toContain('<td>微信</td>')
    expect(result.markdown).not.toContain('> **表格 1**')
    expect(result.markdown).toContain('```ts')
    // 默认 convertLatexToImg=true：$$...$$ 被转为带 ee_img class 的 equation img
    expect(result.markdown).not.toContain('$$E=mc^2$$')
    expect(result.markdown).toMatch(
      /<img src="https:\/\/www\.zhihu\.com\/equation\?tex=E%3Dmc%5E2"[^>]*class="ee_img tr_noresize"[^>]*eeimg="1"/
    )
    expect(result.markdown).toContain('知乎不支持 Mermaid 渲染')
    // 不应残留平台敌对的 HTML/Mermaid 源；equation img 与 table 是受信白名单输出
    expect(result.markdown).not.toMatch(/```mermaid|graph TD|<span|style=/i)
    // 注：现存合法 class 仅限 ee_img tr_noresize（equation img 工业标准）
    const stripWhitelisted = result.markdown
      .replace(/class="ee_img tr_noresize"/g, '')
    expect(stripWhitelisted).not.toMatch(/class=/i)
    expect(result.cleanedHtmlTags).toContain('span')
    expect(result.mermaidCount).toBe(1)
    expect(result.latexCount).toBe(1)
    expect(result.latexBlocksConverted).toBe(1)
    expect(result.tablesConverted).toBe(1)

    const quality = detectQuality([REAL_EXPORT_MARKDOWN, '', '$$E=mc^2$$'].join(String.fromCharCode(10)), 'zhihu')
    expect(quality.issues.some(issue => issue.id === 'zhihu-latex-preview')).toBe(true)
  })

  it('routes the unified native exporter to the correct real platform formats', async () => {
    const [wechat, xiaohongshu, zhihu] = await Promise.all([
      convertToNativeFormat(REAL_EXPORT_MARKDOWN, 'wechat', {
        includeQualityReport: false,
        exportOptions: { enableReadingTime: false },
      }),
      convertToNativeFormat(REAL_EXPORT_MARKDOWN, 'xiaohongshu', {
        includeQualityReport: false,
        xiaohongshuTextOptions: { addSignature: false, injectEmojis: false },
      }),
      convertToNativeFormat(REAL_EXPORT_MARKDOWN, 'zhihu', {
        includeQualityReport: false,
      }),
    ])

    expect(wechat.format).toBe('html')
    expect(wechat.content).toMatch(/<section[^>]+id="nice"/i)
    expect(wechat.content).not.toMatch(/<style\b|\sclass=|javascript:/i)

    expect(xiaohongshu.format).toBe('text')
    // P2-T7: 图占位行带 ratio + size 推荐
    expect(xiaohongshu.content).toContain('[配图1: 架构图（3:4 @ 1080x1440 推荐）')
    expect(xiaohongshu.content).not.toMatch(/```|<span|!\[/i)

    expect(zhihu.format).toBe('markdown')
    expect(zhihu.content).toContain('[官网](https://vite.dev)')
    expect(zhihu.content).not.toMatch(/<span|style=|class=/i)
  })
})
