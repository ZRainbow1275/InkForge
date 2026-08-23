/**
 * @vitest-environment happy-dom
 *
 * P3-T11 — usePreviewRenderer 路由更新 e2e-style 测试
 *
 * 验证目标：
 *  - xiaohongshu 路径渲染的 HTML，stripTags 后纯文本与 markdownToXiaohongshuText 输出
 *    text 的相似度 ≥ 0.95
 *  - zhihu 路径输出含 equation img + table（marked 渲染产物）
 *  - wechat 路径仍输出 styled HTML（含 `<section id="nice">`）
 *  - previewMeta 在三平台上分别含合理字段
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { effectScope, ref, nextTick, type Ref } from 'vue'
import { usePreviewRenderer } from './usePreviewRenderer'
import type { Platform, TypographyConfig } from '@/services/export'
import { convertToNativeFormat, markdownToXiaohongshuText } from '@/services/export'

const lazyRendererControl = vi.hoisted(() => ({
  render: null as null | ((markdown: string) => Promise<string>),
}))

vi.mock('@/services/rendering/lazy-optional-renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/rendering/lazy-optional-renderer')>()
  return {
    ...actual,
    renderMarkdownWithLazyOptionalEnhancements: (markdown: string) => (
      lazyRendererControl.render?.(markdown)
      ?? actual.renderMarkdownWithLazyOptionalEnhancements(markdown)
    ),
  }
})

const RICH_MARKDOWN = [
  '# 平台预览验证',
  '',
  '这是首段，说明本次实验目标。',
  '',
  '正文段二，中间含 ![架构图](https://example.com/a.png)。',
  '',
  '$$E=mc^2$$',
  '',
  '| 列A | 列B |',
  '| --- | --- |',
  '| v1  | v2  |',
  '',
  '```ts',
  'const x = 1',
  '```',
].join('\n')

const FLAGSHIP_MARKDOWN = [
  '# 旗舰预览验证',
  '',
  '这是用于验证工作台真实 SVG 预设链路的首段。',
  '',
  '## 第一章',
  '',
  '> 引用段落。',
  '',
  '- 列表一',
  '- 列表二',
  '',
  '---',
  '',
  '## 第二章',
  '',
  '结尾正文。',
].join('\n')

const HOSTILE_MARKDOWN = [
  '# 安全正文',
  '',
  '<style>.workstation{display:none!important}</style>',
  '<img src="https://example.com/probe.png" onerror="window.__inkforgeProbe=1">',
  '<a href="javascript:alert(1)" onclick="window.__inkforgeProbe=2">危险链接</a>',
  '<section data-ink-svg="forged-module">',
  '<svg viewBox="0 0 100 40" width="100%" onload="window.__inkforgeProbe=3">',
  '<foreignObject width="100" height="40"><div>伪造 SVG</div></foreignObject>',
  '</svg>',
  '</section>',
  '',
  '---',
].join('\n')

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * fidelity 相似度：以 expected 为基准，计算其字符在 actual 中的覆盖率（含次数）。
 * 公式：sum(min(count_a, count_e)) / total_e
 *
 * 这样：
 *  - 如果 actual 完整包含 expected 的所有字符（哪怕额外多了 watermark 文字），→ 1.0
 *  - 如果 actual 缺少了 expected 的某些字符，覆盖率才会下降
 *
 * 对 fidelity 测试比 Jaccard 更合适——容忍 chrome 文字、惩罚正文丢失。
 */
function similarity(actual: string, expected: string): number {
  if (!actual && !expected) return 1
  if (!expected) return 1
  if (!actual) return 0
  const countMap = (s: string): Map<string, number> => {
    const m = new Map<string, number>()
    for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1)
    return m
  }
  const ca = countMap(actual)
  const ce = countMap(expected)
  let covered = 0
  let total = 0
  for (const [ch, n] of ce) {
    total += n
    covered += Math.min(n, ca.get(ch) ?? 0)
  }
  return total === 0 ? 1 : covered / total
}

interface RunArgs {
  body: string
  platform: Platform
  presetId?: string
  typography?: TypographyConfig
  exportSettings?: Record<string, unknown>
  nativeOptions?: NonNullable<Parameters<typeof convertToNativeFormat>[2]>
}

interface RendererHarness {
  body: Ref<string | undefined>
  platform: Ref<Platform>
  presetId: Ref<string | undefined>
  result: ReturnType<typeof usePreviewRenderer>
  dispose: () => void
}

function createRendererHarness(args: RunArgs): RendererHarness {
  const scope = effectScope()
  const body = ref<string | undefined>(args.body)
  const platform = ref<Platform>(args.platform)
  const presetId = ref<string | undefined>(args.presetId)
  const result = scope.run(() => usePreviewRenderer({
    body,
    platform,
    getExportSettings: () => ({
      defaultPresetId: presetId.value,
      ...args.exportSettings,
    }),
    getAppearance: () => ({
      accentColor: '#FF2442',
      fontFamily: 'PingFang SC',
      typography: args.typography,
    }),
    getNativeExportOptions: () => args.nativeOptions,
  }))!

  return {
    body,
    platform,
    presetId,
    result,
    dispose: () => scope.stop(),
  }
}

async function waitForPreview(
  harness: RendererHarness,
  predicate: (html: string) => boolean = Boolean,
  timeout = 3000,
): Promise<void> {
  const deadline = Date.now() + timeout
  while (!predicate(harness.result.previewHtml.value) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50))
    await nextTick()
  }
}

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1
}

async function run(
  args: RunArgs
): Promise<{
  previewHtml: string
  previewLoading: boolean
  previewMeta: ReturnType<typeof usePreviewRenderer>['previewMeta']['value']
  dispose: () => void
}> {
  const harness = createRendererHarness(args)

  // Wait for debounce + rAF + dynamic imports without assuming a fixed
  // cold-start duration on memory-constrained Windows runners.
  await waitForPreview(harness)

  return {
    previewHtml: harness.result.previewHtml.value,
    previewLoading: harness.result.previewLoading.value,
    previewMeta: harness.result.previewMeta.value,
    dispose: harness.dispose,
  }
}

describe('usePreviewRenderer — platform routing (P3-T11)', () => {
  // Suppress Vue's warn about onUnmounted-outside-component in effectScope-based tests.
  let warnSpy: ReturnType<typeof vi.spyOn>
  beforeAll(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterAll(() => {
    warnSpy.mockRestore()
  })


  it('xiaohongshu: preview text similarity ≥0.95 vs markdownToXiaohongshuText output', async () => {
    const { previewHtml, previewMeta, dispose } = await run({
      body: RICH_MARKDOWN,
      platform: 'xiaohongshu',
      presetId: 'xhs-fresh',
    })
    try {
      expect(previewHtml).toContain('xhs-mock')
      expect(previewHtml).toContain('data-preset="fresh"')
      expect(previewMeta).not.toBeNull()
      expect(previewMeta?.platform).toBe('xiaohongshu')
      expect(typeof previewMeta?.charCount).toBe('number')

      const expected = markdownToXiaohongshuText(RICH_MARKDOWN)
      const stripped = decodeEntities(stripTags(previewHtml))
      const sim = similarity(stripped, expected.text)
      // 记录实测值到 stdout 便于团队复盘
      // eslint-disable-next-line no-console
      console.log(`[XHS preview similarity] = ${sim.toFixed(4)}`)
      expect(sim).toBeGreaterThanOrEqual(0.95)
    } finally {
      dispose()
    }
  })

  it('zhihu: preview HTML contains equation img + table elements', async () => {
    const { previewHtml, previewMeta, dispose } = await run({
      body: RICH_MARKDOWN,
      platform: 'zhihu',
      presetId: 'zhihu-academic',
    })
    try {
      expect(previewHtml).toContain('zhihu-mock')
      // equation img: zhihu 公式 CDN 占位 + ee_img 工业标准 class
      expect(previewHtml).toMatch(/<img[^>]*zhihu\.com\/equation/i)
      expect(previewHtml).toContain('class="ee_img tr_noresize"')
      // Zhihu 默认 tableHandling='html'：GFM 表格转为 HTML <table>（知乎原生支持）。
      expect(previewHtml).toMatch(/<table\b/i)
      expect(previewHtml).toMatch(/<th[^>]*>列A<\/th>/)
      expect(previewHtml).toMatch(/<th[^>]*>列B<\/th>/)
      // ts 代码块也应保留
      expect(previewHtml).toContain('const x = 1')

      expect(previewMeta?.platform).toBe('zhihu')
      expect(previewMeta?.latexBlocks).toBeGreaterThanOrEqual(1)
    } finally {
      dispose()
    }
  })

  it('wechat: preview HTML uses mock renderer with wechat-article container', async () => {
    const { previewHtml, previewMeta, dispose } = await run({
      body: RICH_MARKDOWN,
      platform: 'wechat',
    })
    try {
      expect(previewHtml).toMatch(/<section[^>]+id="wechat-article"/i)
      // wechat HTML should NOT contain xhs/zhihu fidelity markers
      expect(previewHtml).not.toContain('xhs-mock')
      expect(previewHtml).not.toContain('zhihu-mock')
      expect(previewMeta?.platform).toBe('wechat')
    } finally {
      dispose()
    }
  })

  it('wechat: preview and export share the real article masthead metadata', async () => {
    const { previewHtml, dispose } = await run({
      body: '# 行业观察\n\n这是用于计算真实阅读时间的正文。',
      platform: 'wechat',
      presetId: 'thesis',
      exportSettings: {
        articleTitle: '真实文章标题',
        articleCategory: '行业研究',
        enableReadingTime: true,
        readingSpeed: 300,
        deliveryAdornment: {
          readingTime: { enabled: true, wordsPerMinute: 300 },
          license: 'none',
          components: [{
            id: 'preview-song',
            enabled: true,
            type: 'song',
            title: '真实预览歌曲',
            artist: '真实作者',
            url: 'https://music.example.com/preview-song',
          }],
        },
      },
    })
    try {
      expect(previewHtml).toContain('data-ink-masthead-variant="critical-translation"')
      expect(previewHtml).toContain('典藏译本')
      expect(previewHtml).toContain('真实文章标题')
      expect(previewHtml).toContain('文章值得您享受')
      expect(previewHtml).toContain('行业研究')
      expect(previewHtml).toContain('真实预览歌曲')
      expect(previewHtml).toContain('真实作者')
      expect(previewHtml).toMatch(/阅读约\s*1\s*分钟/)
      expect(previewHtml).not.toContain('第 01 期')
    } finally {
      dispose()
    }
  })

  it('wechat: wraps the exact native artifact and commits its stats/report together', async () => {
    const body = '# 同源产物\n\n这是用于验证右侧预览与复制产物完全同源的真实正文。'
    const nativeOptions = {
      presetId: 'thesis',
      includeQualityReport: false,
      exportOptions: {
        articleTitle: '同源产物标题',
        articleCategory: '验收',
        enableReadingTime: true,
        readingSpeed: 120,
        deliveryAdornment: {
          readingTime: { enabled: true, wordsPerMinute: 120 },
          license: 'cc-by-4.0' as const,
          components: [{
            id: 'shared-artifact-song',
            enabled: true,
            type: 'song' as const,
            title: '同源歌曲',
            artist: '真实作者',
            url: 'https://music.example.com/shared-artifact',
          }],
        },
      },
      overrides: {
        primaryColor: '#315D8C',
        fontFamily: 'serif',
      },
    }
    const native = await convertToNativeFormat(body, 'wechat', nativeOptions)
    const { previewHtml, previewMeta, dispose } = await run({
      body,
      platform: 'wechat',
      presetId: 'thesis',
      nativeOptions,
      exportSettings: nativeOptions.exportOptions,
    })

    try {
      expect(previewHtml).toContain(native.content)
      expect(previewMeta?.stats).toEqual(native.stats)
      expect(previewMeta?.deliveryAdornment).toEqual(native.deliveryAdornment)
      expect(previewMeta?.isSample).toBe(false)
    } finally {
      dispose()
    }
  })

  it('wechat: disabling reading time keeps the selected masthead, title, category, and song', async () => {
    const { previewHtml, dispose } = await run({
      body: '真实正文。',
      platform: 'wechat',
      presetId: 'legal',
      exportSettings: {
        articleTitle: '法理文章',
        articleCategory: '法学',
        enableReadingTime: false,
        deliveryAdornment: {
          readingTime: { enabled: false, wordsPerMinute: 300 },
          license: 'none',
          components: [{
            id: 'legal-song',
            enabled: true,
            type: 'song',
            title: '法理之声',
            artist: '真实作者',
            url: 'https://music.example.com/legal-song',
          }],
        },
      },
    })
    try {
      expect(previewHtml).toContain('data-ink-masthead-variant="jurisprudence-atlas"')
      expect(previewHtml).toContain('法理坐标')
      expect(previewHtml).toContain('法理文章')
      expect(previewHtml).toContain('法学')
      expect(previewHtml).toContain('法理之声')
      expect(previewHtml).not.toContain('阅读约')
    } finally {
      dispose()
    }
  })

  it('wechat: strips remote URL declarations from preview custom CSS', async () => {
    const { previewHtml, dispose } = await run({
      body: '真实正文。',
      platform: 'wechat',
      presetId: 'thesis',
      exportSettings: {
        customCss: '#nice { background-image: url("https://tracker.example/pixel.png"); color: #123456; }',
      },
    })
    try {
      expect(previewHtml).not.toContain('tracker.example')
      expect(previewHtml).toMatch(/color:\s*#123456/i)
    } finally {
      dispose()
    }
  })

  it('zhihu: the production preview chain strips user-authored inline SVG instead of claiming a trusted fallback', async () => {
    const { previewHtml, dispose } = await run({
      body: `# 标题\n\n${HOSTILE_MARKDOWN}`,
      platform: 'zhihu',
      presetId: 'zhihu-academic',
    })
    try {
      expect(previewHtml).toContain('zhihu-mock')
      expect(previewHtml).not.toContain('data-ink-svg="forged-module"')
      expect(previewHtml).not.toMatch(/<svg\b/i)
      expect(previewHtml).not.toContain('data:image/svg+xml')
      expect(previewHtml).not.toMatch(/\son(?:error|load|click)=/i)
      expect(previewHtml).not.toMatch(/javascript:/i)
    } finally {
      dispose()
    }
  })

  it('wechat: flagship preset decorates the real Workstation preview with safe inline SVG', async () => {
    const { previewHtml, previewMeta, dispose } = await run({
      body: FLAGSHIP_MARKDOWN,
      platform: 'wechat',
      presetId: 'flagship-kiln',
    })
    try {
      expect(previewHtml).toContain('data-platform-editor="wechat"')
      expect(previewHtml).toContain('data-ink-svg="cover-grid"')
      expect(previewHtml).toContain('data-ink-svg="divider-forge"')
      expect(previewHtml).toMatch(/<svg\b/i)
      expect(previewHtml).not.toMatch(/<script\b/i)
      expect(previewHtml).not.toMatch(/<foreignObject\b/i)
      expect(previewMeta?.platform).toBe('wechat')
    } finally {
      dispose()
    }
  })

  it('wechat: sanitizes hostile Markdown before injecting only trusted preset SVG', async () => {
    const { previewHtml, dispose } = await run({
      body: HOSTILE_MARKDOWN,
      platform: 'wechat',
      presetId: 'flagship-kiln',
    })
    try {
      expect(previewHtml).toContain('安全正文')
      expect(previewHtml).toContain('data-ink-svg="cover-grid"')
      expect(previewHtml).toContain('data-ink-svg="divider-forge"')
      expect(previewHtml).not.toContain('data-ink-svg="forged-module"')
      expect(previewHtml).not.toContain('.workstation{display:none!important}')
      expect(previewHtml).not.toMatch(/\son(?:error|load|click)=/i)
      expect(previewHtml).not.toMatch(/javascript:/i)
      expect(previewHtml).not.toMatch(/<foreignObject\b/i)
      expect(countOccurrences(previewHtml, 'data-ink-svg="cover-grid"')).toBe(1)
      expect(countOccurrences(previewHtml, 'data-ink-svg="divider-forge"')).toBe(1)
    } finally {
      dispose()
    }
  })

  it('drops stale async renders after rapid body, platform, and preset switches', async () => {
    let releaseSlowRender: (() => void) | undefined
    let markSlowRenderStarted: (() => void) | undefined
    const slowRenderGate = new Promise<void>((resolve) => {
      releaseSlowRender = resolve
    })
    const slowRenderStarted = new Promise<void>((resolve) => {
      markSlowRenderStarted = resolve
    })

    lazyRendererControl.render = async (markdown: string) => {
      if (markdown.includes('SLOW-FIRST')) {
        markSlowRenderStarted?.()
        await slowRenderGate
      }
      return `<h1>${markdown}</h1><p>FINAL-BODY-MARKER</p><hr>`
    }

    const harness = createRendererHarness({
      body: '# SLOW-FIRST',
      platform: 'wechat',
      presetId: 'flagship-amber',
    })

    try {
      await slowRenderStarted

      harness.body.value = '# FAST-XHS'
      harness.platform.value = 'xiaohongshu'
      harness.presetId.value = 'xhs-tech'
      await waitForPreview(
        harness,
        (html) => html.includes('data-platform-editor="xiaohongshu"') && html.includes('FAST-XHS'),
      )

      harness.body.value = '# FAST-FINAL'
      harness.platform.value = 'wechat'
      harness.presetId.value = 'flagship-kiln'
      await waitForPreview(
        harness,
        (html) => html.includes('FINAL-BODY-MARKER') && html.includes('data-ink-svg="cover-grid"'),
      )

      releaseSlowRender?.()
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()

      const finalHtml = harness.result.previewHtml.value
      expect(finalHtml).toContain('data-platform-editor="wechat"')
      expect(finalHtml).toContain('FINAL-BODY-MARKER')
      expect(finalHtml).not.toContain('SLOW-FIRST')
      expect(finalHtml).not.toContain('xhs-mock')
      expect(finalHtml).not.toContain('data-ink-svg="cover-title"')
      expect(countOccurrences(finalHtml, 'data-ink-svg="cover-grid"')).toBe(1)
      expect(countOccurrences(finalHtml, 'data-ink-svg="divider-forge"')).toBe(1)
    } finally {
      releaseSlowRender?.()
      lazyRendererControl.render = null
      harness.dispose()
    }
  })

  it('invalidates old WeChat stats as soon as a new render is scheduled', async () => {
    const harness = createRendererHarness({
      body: '# FIRST\n\n第一版正文。',
      platform: 'wechat',
      presetId: 'flagship-kiln',
    })

    try {
      await waitForPreview(harness, html => html.includes('FIRST'))
      expect(harness.result.previewMeta.value?.platform).toBe('wechat')
      expect(harness.result.previewMeta.value?.stats).toBeDefined()

      harness.body.value = '# SECOND\n\n第二版正文内容更多。'
      await nextTick()

      expect(harness.result.previewLoading.value).toBe(true)
      expect(harness.result.previewMeta.value).toBeNull()

      await waitForPreview(harness, html => html.includes('SECOND'))
      expect(harness.result.previewMeta.value?.platform).toBe('wechat')
      expect(harness.result.previewMeta.value?.stats).toBeDefined()
    } finally {
      harness.dispose()
    }
  })

  it('wechat: keeps an empty live draft in the explicit software empty state', async () => {
    const harness = createRendererHarness({
      body: '   ',
      platform: 'wechat',
      presetId: 'flagship-kiln',
    })

    try {
      await nextTick()
      expect(harness.result.previewLoading.value).toBe(true)
      await waitForPreview(harness, () => !harness.result.previewLoading.value)
      expect(harness.result.previewHtml.value).toBe('')
      expect(harness.result.previewMeta.value).toEqual({
        platform: 'wechat',
        isSample: false,
      })
    } finally {
      harness.dispose()
    }
  })

  it('wechat: canonical typography changes every supported preview rule', async () => {
    const { previewHtml, dispose } = await run({
      body: '# 标题\n\n正文段落。\n\n> 引用段落。',
      platform: 'wechat',
      typography: {
        fontSize: 20,
        lineHeight: 2,
        letterSpacing: 0.08,
        paragraphSpacing: 28,
        paragraphIndent: true,
        textAlign: 'justify',
        listSpacing: 14,
        headingScale: 'display',
        headingStyle: 'pill',
        blockquoteStyle: 'card',
        dividerStyle: 'ornament',
        mediaStyle: 'framed',
        fontFamily: 'wenkai',
      },
    })
    try {
      const template = document.createElement('template')
      template.innerHTML = previewHtml
      const bodyParagraph = Array.from(template.content.querySelectorAll('p'))
        .find(element => element.textContent === '正文段落。')
      const quote = template.content.querySelector('blockquote')
      const quoteParagraph = quote?.querySelector('p')
      const heading = template.content.querySelector('h1')

      expect(bodyParagraph?.getAttribute('style')).toContain('font-size:20px')
      expect(bodyParagraph?.getAttribute('style')).toContain('line-height:2')
      expect(bodyParagraph?.getAttribute('style')).toContain('letter-spacing:0.08em')
      expect(bodyParagraph?.getAttribute('style')).toContain('margin-bottom:28px')
      expect(bodyParagraph?.getAttribute('style')).toContain('text-indent:2em')
      expect(bodyParagraph?.getAttribute('style')).toContain('text-align:justify')
      expect(quoteParagraph?.getAttribute('style')).toContain('text-indent:0')
      expect(heading?.getAttribute('style')).toContain('font-size:2em')
      expect(heading?.getAttribute('style')).toContain('border-radius:999px')
      expect(quote?.getAttribute('style')).toContain('box-shadow:0 8px 24px')
      expect(previewHtml).toContain('LXGW WenKai')
    } finally {
      dispose()
    }
  })

  it('empty body: renders sample content and flags previewMeta.isSample = true', async () => {
    // Contract change (DEFECT 2 fix): when body is empty, usePreviewRenderer now
    // resolves a preset-aware sample markdown via resolveSampleContent() and
    // renders it through the platform pipeline. previewMeta carries isSample:true
    // so the UI can show a "示例内容" badge instead of the old empty-state.
    const { previewHtml, previewMeta, dispose } = await run({
      body: '',
      platform: 'xiaohongshu',
    })
    try {
      expect(previewHtml.length).toBeGreaterThan(0)
      expect(previewHtml).toContain('xhs-mock')
      expect(previewMeta?.platform).toBe('xiaohongshu')
      expect(previewMeta?.isSample).toBe(true)
    } finally {
      dispose()
    }
  })
})
