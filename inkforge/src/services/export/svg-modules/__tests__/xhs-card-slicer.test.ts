import { describe, expect, it } from 'vitest'
import { createXhsImageArtifactManifestFromRasterArtifacts } from '../../image-pipeline'
import { validateXhsImageArtifactManifest } from '../../quality-detector'
import { checkWechatSafe } from '../wechat-safe'
import {
  createXhsMarkdownCardSliceManifestInputs,
  renderXhsMarkdownCardSliceSvg,
  sliceMarkdownToXhsCards,
} from '../xhs-card-slicer'

const CARD_MARKDOWN = [
  '# InkForge 排版卡片',
  '',
  '## 选题结构',
  '- 开头先给结论',
  '- 每张卡只保留一个动作',
  '- 正文引用图片请见第 1 张图',
  '',
  '<!-- xhs-page-break -->',
  '',
  '## 发布前检查',
  '1. 重新生成图片页',
  '2. 校验正文图号引用',
  '3. 不把敏感材料入库',
  '',
  '```ts',
  'const gate = "local-browser"',
  'const publish = false',
  '```',
].join('\n')

describe('sliceMarkdownToXhsCards', () => {
  it('turns source Markdown headings, page breaks, lists, and code fences into ordered card slices', () => {
    const result = sliceMarkdownToXhsCards(CARD_MARKDOWN, {
      subtitle: '本地卡片分页验证',
      maxLinesPerCard: 4,
    })

    expect(result.sourceTitle).toBe('InkForge 排版卡片')
    expect(result.overflow).toBe(false)
    expect(result.slices.map(slice => slice.kind)).toEqual(['cover', 'section', 'section', 'code'])
    expect(result.slices.map(slice => slice.page)).toEqual([1, 2, 3, 4])
    expect(result.bodyReferences).toEqual([1, 2, 3, 4])
    expect(result.slices[1]?.title).toBe('选题结构')
    expect(result.slices[2]?.title).toBe('发布前检查')
    expect(result.slices[3]?.title).toBe('代码卡片 / ts')
    expect(result.slices.flatMap(slice => slice.lines).join('\n')).not.toContain('```')
    expect(result.slices.flatMap(slice => slice.lines).join('\n')).not.toContain('<!--')
  })

  it('marks overflow when the configured XHS page budget is exceeded', () => {
    const result = sliceMarkdownToXhsCards(CARD_MARKDOWN, {
      includeCover: false,
      maxPages: 2,
      maxLinesPerCard: 2,
    })

    expect(result.overflow).toBe(true)
    expect(result.slices).toHaveLength(2)
    expect(result.slices.every(slice => slice.overflow)).toBe(true)
  })
})

describe('renderXhsMarkdownCardSliceSvg', () => {
  it('renders WeChat-safe source-owned SVG that can feed the XHS raster pipeline', () => {
    const result = sliceMarkdownToXhsCards(CARD_MARKDOWN, { maxLinesPerCard: 5 })
    const sectionCard = result.slices.find(slice => slice.kind === 'section')
    expect(sectionCard).toBeDefined()
    if (!sectionCard) return

    const svg = renderXhsMarkdownCardSliceSvg(sectionCard, {
      primaryColor: '#2f6f63',
      persona: 'business',
    })

    expect(svg).toContain('data-ink-svg="xhs-markdown-card-slicer"')
    expect(svg).toContain('viewBox="0 0 1080 1440"')
    expect(svg).not.toContain('<style')
    expect(svg).not.toContain('class=')
    expect(svg).not.toContain('<foreignObject')
    expect(checkWechatSafe(svg)).toEqual([])
  })

  it('creates manifest inputs that validate after real raster metadata is attached', () => {
    const result = sliceMarkdownToXhsCards(CARD_MARKDOWN, { maxPages: 3 })
    const manifestInputs = createXhsMarkdownCardSliceManifestInputs(result.slices, {
      fileNamePrefix: 'xhs-card-slicer-proof',
      srcPrefix: 'inkforge-asset://xhs-card-slicer-proof',
    })
    const manifest = createXhsImageArtifactManifestFromRasterArtifacts({
      artifacts: manifestInputs.map(input => ({
        ...input,
        width: 1080,
        height: 1440,
        format: 'png',
        bytes: 120_000 + input.page,
        exists: true,
      })),
    })

    expect(manifest.pages.map(page => page.fileName)).toEqual([
      'xhs-card-slicer-proof-01.png',
      'xhs-card-slicer-proof-02.png',
      'xhs-card-slicer-proof-03.png',
    ])
    expect(manifest.bodyReferences).toEqual([1, 2, 3])
    expect(validateXhsImageArtifactManifest(manifest)).toEqual([])
  })

})
