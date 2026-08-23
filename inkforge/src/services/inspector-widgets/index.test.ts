import { describe, expect, it } from 'vitest'
import {
  buildDocumentStatistics,
  clampInspectorWidgetLayout,
  createDefaultInspectorWidgetLayouts,
  extractExternalLinks,
  INSPECTOR_WIDGET_IDS,
  InspectorWidgetPayloadSchema,
  normalizeInspectorWidgetLayouts,
  parseInspectorWidgetRequest,
} from './index'

describe('inspector widgets', () => {
  it('keeps the detachable surface set explicit and defaulted', () => {
    const layouts = createDefaultInspectorWidgetLayouts()

    expect(INSPECTOR_WIDGET_IDS).toEqual([
      'platform-preview',
      'references',
      'document-statistics',
    ])
    expect(Object.keys(layouts)).toEqual(INSPECTOR_WIDGET_IDS)
    expect(Object.values(layouts).every(layout => layout.placement === 'docked')).toBe(true)
  })

  it('normalizes persisted geometry and rejects an untrusted native window label', () => {
    const normalized = normalizeInspectorWidgetLayouts({
      'platform-preview': {
        placement: 'floating',
        x: -50,
        y: 50_000,
        width: 5_000,
        height: 1,
        nativeWindowLabel: 'ignored',
        article: { body: 'must not persist' },
      },
      references: {
        placement: 'native',
        x: 10,
        y: 20,
        width: 420,
        height: 440,
        nativeWindowLabel: 'https://example.com',
      },
    })

    expect(normalized['platform-preview']).toMatchObject({
      placement: 'floating',
      x: 0,
      y: 10_000,
      width: 720,
      height: 220,
      nativeWindowLabel: null,
    })
    expect(normalized.references.placement).toBe('docked')
    expect(normalized.references.nativeWindowLabel).toBeNull()
    expect(normalized['platform-preview']).not.toHaveProperty('article')
  })

  it('keeps floating cards inside the current workstation bounds', () => {
    expect(clampInspectorWidgetLayout({
      placement: 'floating',
      x: 900,
      y: 700,
      width: 500,
      height: 500,
      nativeWindowLabel: null,
    }, { width: 800, height: 600 })).toEqual({
      placement: 'floating',
      x: 288,
      y: 88,
      width: 500,
      height: 500,
      nativeWindowLabel: null,
    })
  })

  it('extracts and deduplicates supported Markdown references', () => {
    const links = extractExternalLinks([
      '[InkForge](https://inkforge.example/docs)',
      '<https://inkforge.example/docs>',
      '[source]: https://example.com/source',
    ].join('\n'))

    expect(links).toEqual([
      { text: 'InkForge', href: 'https://inkforge.example/docs' },
      { text: 'source', href: 'https://example.com/source' },
    ])
  })

  it('derives deterministic document statistics from the real body', () => {
    expect(buildDocumentStatistics('# 标题\n\n第一段。\n\n第二段 [源](https://example.com)', 401, 1)).toEqual({
      words: 401,
      nonWhitespaceCharacters: 34,
      paragraphs: 3,
      headings: 1,
      links: 1,
      readingMinutes: 2,
    })
  })

  it('accepts only controlled utility-window requests and HTTP(S) payload links', () => {
    const validLabel = 'inspector-references-0123456789abcdef'
    expect(parseInspectorWidgetRequest(
      `?inspectorWidget=references&profileId=profile-a&articleId=article-a&windowLabel=${validLabel}`,
    )).toEqual({
      surfaceId: 'references',
      profileId: 'profile-a',
      articleId: 'article-a',
      windowLabel: validLabel,
    })
    expect(parseInspectorWidgetRequest(
      `?inspectorWidget=https://example.com&profileId=a&articleId=b&windowLabel=${validLabel}`,
    )).toBeNull()
    expect(parseInspectorWidgetRequest(
      '?inspectorWidget=references&profileId=a&articleId=b&windowLabel=main',
    )).toBeNull()

    const basePayload = {
      articleId: 'article-a',
      articleTitle: 'Article',
      platform: 'wechat',
      platformLabel: '微信',
      previewHtml: '<p>content</p>',
      previewLoading: false,
      previewIsSample: false,
      statistics: buildDocumentStatistics('content', 1, 1),
      updatedAt: 1,
    }
    expect(InspectorWidgetPayloadSchema.safeParse({
      ...basePayload,
      links: [{ text: 'safe', href: 'https://example.com' }],
    }).success).toBe(true)
    expect(InspectorWidgetPayloadSchema.safeParse({
      ...basePayload,
      links: [{ text: 'unsafe', href: 'javascript:alert(1)' }],
    }).success).toBe(false)
  })
})
