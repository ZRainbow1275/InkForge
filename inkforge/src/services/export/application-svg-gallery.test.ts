import { describe, expect, it } from 'vitest'

import {
  createApplicationSvgGalleryReport,
  createApplicationSvgGallerySnapshot,
  getApplicationSvgGallerySentinelIssues,
  renderApplicationSvgGalleryHtml,
} from './application-svg-gallery'

describe('application SVG gallery service', () => {
  it('builds an application-consumable snapshot for every SVG module/persona pair', () => {
    const snapshot = createApplicationSvgGallerySnapshot()

    expect(snapshot).toMatchObject({
      notProof: true,
      scope: 'application-gallery',
      status: 'application-gallery-ready',
      summary: {
        svgModuleCount: 27,
        svgFamilyCount: 7,
        personaCount: 4,
        renderedModulePersonaPairs: 108,
        wechatSafeViolationCount: 0,
        moduleSentinelFailureCount: 0,
      },
      issues: [],
    })
    expect(snapshot.tiles).toHaveLength(108)
    expect(new Set(snapshot.tiles.map(tile => tile.moduleId))).toHaveLength(27)
    expect(new Set(snapshot.tiles.map(tile => tile.persona))).toEqual(new Set([
      'academic',
      'business',
      'lifestyle',
      'creative',
    ]))

    for (const tile of snapshot.tiles) {
      expect(getApplicationSvgGallerySentinelIssues(tile.html, tile.moduleId)).toEqual([])
    }
  })

  it('renders deterministic local gallery markup from the service snapshot', () => {
    const snapshot = createApplicationSvgGallerySnapshot()
    const report = createApplicationSvgGalleryReport(
      snapshot,
      'prompts/0601/evidence/application-svg-gallery-20260704.html',
    )
    const html = renderApplicationSvgGalleryHtml(snapshot, {
      generatedAt: '2026-07-04T00:00:00.000Z',
    })

    expect(report).toMatchObject({
      notProof: true,
      scope: 'application-gallery',
      status: 'application-gallery-ready',
      outputPath: 'prompts/0601/evidence/application-svg-gallery-20260704.html',
      issues: [],
    })
    expect(html).toContain('InkForge Application SVG Gallery')
    expect(html).toContain('2026-07-04T00:00:00.000Z')
    expect(html.match(/class="gallery-tile"/g)).toHaveLength(108)
    expect(html.match(/data-ink-svg=/g)?.length).toBeGreaterThanOrEqual(108)
    expect(html).not.toContain('<script')
    expect(html).not.toContain('foreignObject')
    expect(html).not.toContain('javascript:')
  })
})
