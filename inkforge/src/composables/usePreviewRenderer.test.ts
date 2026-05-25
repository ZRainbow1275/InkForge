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
import { effectScope, ref, nextTick } from 'vue'
import { usePreviewRenderer } from './usePreviewRenderer'
import type { Platform } from '@/services/export'
import { markdownToXiaohongshuText } from '@/services/export'

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
}

async function run(
  args: RunArgs
): Promise<{
  previewHtml: string
  previewLoading: boolean
  previewMeta: ReturnType<typeof usePreviewRenderer>['previewMeta']['value']
  dispose: () => void
}> {
  const scope = effectScope()
  const result = scope.run(() => {
    const body = ref<string | undefined>(args.body)
    const platform = ref<Platform>(args.platform)
    return usePreviewRenderer({
      body,
      platform,
      getExportSettings: () => ({
        defaultPresetId: args.presetId,
      }),
      getAppearance: () => ({ accentColor: '#FF2442', fontFamily: 'PingFang SC' }),
    })
  })!

  // Wait for debounce + rAF + dynamic import + render
  await new Promise((r) => setTimeout(r, 250))
  // Drain pending microtasks (dynamic imports may chain promises)
  for (let i = 0; i < 5; i++) await nextTick()
  await new Promise((r) => setTimeout(r, 100))
  for (let i = 0; i < 5; i++) await nextTick()

  return {
    previewHtml: result.previewHtml.value,
    previewLoading: result.previewLoading.value,
    previewMeta: result.previewMeta.value,
    dispose: () => scope.stop(),
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
