/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import { createWechatStyleExportSamplesReport } from './wechat-style-export-samples'

describe('WeChat style export samples report', { timeout: 60_000 }, () => {
  it('renders every selectable WeChat style choice through the real WeChat exporter with SVG options enabled', async () => {
    const report = await createWechatStyleExportSamplesReport()

    expect(report).toMatchObject({
      notProof: true,
      scope: 'wechat-style-export-samples',
      status: 'wechat-style-samples-ready',
      summary: {
        wechatStyleChoiceCount: 17,
        selectableStyleChoiceCount: 13,
        renderedStyleChoiceCount: 13,
        svgBearingStyleChoiceCount: 13,
        totalSvgModuleCount: 45,
        issueCount: 0,
      },
      issues: [],
      boundary: {
        xhsZhihuPublishAutomationDeferred: true,
        requiresManualWeChatProof: true,
        doesNotClaimReleaseComplete: true,
      },
    })
    expect(report.summary.uniquePresetCount).toBeGreaterThanOrEqual(4)
    expect(report.summary.totalSvgModuleCount).toBeGreaterThanOrEqual(report.summary.renderedStyleChoiceCount)

    const choiceIds = report.samples.map(sample => sample.choiceId)
    expect(choiceIds).toEqual([
      'wechat-classic-inline',
      'wechat-quiet-editorial',
      'wechat-toolbar-parameter-map',
      'wechat-cover-seal-divider',
      'wechat-card-rich',
      'wechat-flagship-kiln',
      'wechat-flagship-kiln-paste-safe',
      'wechat-flagship-tempera',
      'wechat-flagship-amber',
      'wechat-click-reveal',
      'wechat-mobile-only-effect',
      'wechat-carousel-switch',
      'wechat-market-svg-h5-fallback-matrix',
    ])

    for (const sample of report.samples) {
      expect(sample.htmlLength, sample.choiceId).toBeGreaterThan(1000)
      expect(sample.htmlSha256, sample.choiceId).toMatch(/^[a-f0-9]{64}$/)
      expect(sample.svgModuleCount, sample.choiceId).toBeGreaterThan(0)
      expect(sample.svgModuleIds, sample.choiceId).toContain('cover-title')
      expect(sample.svgModuleIds, sample.choiceId).toContain('endmark-fin')
      expect(sample.stats.wordCount, sample.choiceId).toBeGreaterThan(0)
      expect(sample.stats.headingCount, sample.choiceId).toBeGreaterThan(0)
      expect(sample.stats.tableCount, sample.choiceId).toBeGreaterThan(0)
      expect(sample.stats.codeBlockCount, sample.choiceId).toBeGreaterThan(0)
    }
  })
})
