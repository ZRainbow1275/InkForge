import { describe, it, expect } from 'vitest'
import {
  splitTitleAndBody,
  tightenParagraphs,
  appendHashtagsToBody,
  composeHashtagMix,
  buildImagePlaceholder,
  xhsTextRulesTransform,
  type HashtagCandidate,
} from './xiaohongshu'

describe('splitTitleAndBody', () => {
  it('crops a 25-char first line at 20 chars and prepends leftover into body lead', () => {
    const text = 'AAAAAAAAAA1111122222BBBBB\n后续正文一行\n后续正文二行'
    const result = splitTitleAndBody(text)
    expect(result.title).toBe('AAAAAAAAAA1111122222')
    expect(result.title.length).toBe(20)
    // leftover "BBBBB" must be prepended back into body
    expect(result.body.startsWith('BBBBB')).toBe(true)
    expect(result.body).toContain('后续正文一行')
    expect(result.body).toContain('后续正文二行')
    expect(result.droppedFromTitle).toBe(5)
  })

  it('splits at last whitespace ≤20 chars when available', () => {
    const text = 'Hello World 这是一个 长长长长长 标题 多余内容\n正文1'
    const result = splitTitleAndBody(text)
    expect(result.title.length).toBeLessThanOrEqual(20)
    // The leftover (after the chosen whitespace) should reappear in body lead.
    const reconstructed = result.title.replace(/\s+/g, '') + result.body.split('\n')[0].replace(/\s+/g, '')
    expect(reconstructed).toContain('Hello')
    expect(reconstructed).toContain('多余内容')
  })

  it('keeps short first line as title untouched', () => {
    const text = '简短标题\n\n正文'
    const result = splitTitleAndBody(text)
    expect(result.title).toBe('简短标题')
    expect(result.body).toBe('正文')
    expect(result.droppedFromTitle).toBe(0)
  })

  it('returns defaultTitle when input is empty', () => {
    const result = splitTitleAndBody('', { defaultTitle: '默认标题' })
    expect(result.title).toBe('默认标题')
    expect(result.body).toBe('')
  })
})

describe('tightenParagraphs', () => {
  it('splits a single 6-line paragraph into 2 paragraphs of 3 lines (default maxLines=3)', () => {
    const para = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'].join('\n')
    const result = tightenParagraphs(para)
    const paragraphs = result.split(/\n\s*\n/)
    expect(paragraphs.length).toBe(2)
    expect(paragraphs[0].split('\n').length).toBe(3)
    expect(paragraphs[1].split('\n').length).toBe(3)
    expect(paragraphs[0]).toBe('l1\nl2\nl3')
    expect(paragraphs[1]).toBe('l4\nl5\nl6')
  })

  it('preserves blank lines between paragraphs', () => {
    const text = 'a1\na2\na3\n\nb1\nb2'
    const result = tightenParagraphs(text)
    expect(result).toBe('a1\na2\na3\n\nb1\nb2')
  })

  it('does not break Markdown-converted ordered lists', () => {
    const list = '1. 第一项\n2. 第二项\n3. 第三项\n4. 第四项\n5. 第五项'
    const result = tightenParagraphs(list, { maxLines: 3 })
    // Should remain a single block since it is detected as an ordered list.
    expect(result).toBe(list)
  })
})

describe('appendHashtagsToBody', () => {
  it('appends 3 hashtags to empty input separated by blank line', () => {
    const result = appendHashtagsToBody('', ['#aaa', '#bbb', '#ccc'])
    expect(result).toBe('#aaa #bbb #ccc')
  })

  it('appends hashtags to body bottom with double newline separator', () => {
    const result = appendHashtagsToBody('正文一段', ['#aaa', '#bbb'])
    expect(result).toBe('正文一段\n\n#aaa #bbb')
  })

  it('dedupes against existing #xxx in text', () => {
    const result = appendHashtagsToBody(
      '正文里已经有 #设计 标签',
      ['#设计', '#排版', '#视觉']
    )
    expect(result).toContain('#排版')
    expect(result).toContain('#视觉')
    // #设计 appears only once (in the original body), not in appended block
    const matches = result.match(/#设计/g)
    expect(matches?.length).toBe(1)
  })

  it('returns text unchanged when hashtags list is empty', () => {
    expect(appendHashtagsToBody('正文', [])).toBe('正文')
  })

  it('respects dedupAgainst set', () => {
    const dedup = new Set(['#aaa'])
    const result = appendHashtagsToBody('', ['#aaa', '#bbb'], { dedupAgainst: dedup })
    expect(result).toBe('#bbb')
  })
})

describe('composeHashtagMix', () => {
  it('picks 2 hot (≥0.7) + 2 niche (<0.3) tags from a 5-candidate pool', () => {
    const candidates: HashtagCandidate[] = [
      { tag: '热门A', popularity: 0.95 },
      { tag: '热门B', popularity: 0.8 },
      { tag: '中等', popularity: 0.5 },
      { tag: '小众A', popularity: 0.2 },
      { tag: '小众B', popularity: 0.1 },
    ]
    const result = composeHashtagMix(candidates)
    expect(result).toHaveLength(4)
    expect(result).toContain('#热门A')
    expect(result).toContain('#热门B')
    expect(result).toContain('#小众A')
    expect(result).toContain('#小众B')
  })

  it('returns empty array when no candidates supplied', () => {
    expect(composeHashtagMix([])).toEqual([])
  })

  it('respects custom hot/niche counts and total ≤ hot+niche', () => {
    const candidates: HashtagCandidate[] = [
      { tag: 'h1', popularity: 0.9 },
      { tag: 'h2', popularity: 0.85 },
      { tag: 'h3', popularity: 0.75 },
      { tag: 'n1', popularity: 0.05 },
    ]
    const result = composeHashtagMix(candidates, { hot: 1, niche: 1 })
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('#h1')
    expect(result[1]).toBe('#n1')
  })
})

describe('buildImagePlaceholder', () => {
  it('builds exact placeholder string for 3:4 architecture diagram', () => {
    const result = buildImagePlaceholder('架构图', { ratio: '3:4', size: '1080x1440' })
    expect(result).toBe('[配图: 架构图（3:4 @ 1080x1440 推荐）')
  })

  it('matches exact form including index', () => {
    const result = buildImagePlaceholder('架构图', { ratio: '3:4', size: '1080x1440', index: 2 })
    expect(result).toBe('[配图2: 架构图（3:4 @ 1080x1440 推荐）')
  })

  it('defaults size based on ratio', () => {
    expect(buildImagePlaceholder('封面', { ratio: '1:1' })).toContain('1080x1080')
    expect(buildImagePlaceholder('横图', { ratio: '4:3' })).toContain('1440x1080')
  })

  it('falls back to "配图" when alt is empty', () => {
    const result = buildImagePlaceholder('')
    expect(result).toContain('配图')
  })
})

describe('xhsTextRulesTransform — smoke', () => {
  it('runs end-to-end on a 30-line MD-converted text', () => {
    const lines: string[] = []
    lines.push('如何在三天内交付一个高质量的小红书内容引擎实战指南')
    for (let i = 1; i <= 25; i++) {
      lines.push(`第${i}行正文，描述某个步骤或要点。`)
    }
    lines.push('[配图] 见架构总览图')
    lines.push('[配图] 见效果对比图')
    lines.push('— 感谢阅读')
    const text = lines.join('\n')

    const result = xhsTextRulesTransform(
      {
        text,
        suggestedTags: ['#内容引擎', '#小红书运营'],
        paragraphs: 6,
      },
      {
        hashtagCandidates: [
          { tag: '内容引擎', popularity: 0.92 },
          { tag: '产品经理', popularity: 0.78 },
          { tag: '研发提效', popularity: 0.2 },
          { tag: '冷启动经验', popularity: 0.15 },
          { tag: '通用', popularity: 0.5 },
        ],
        imagePlaceholders: [
          { ratio: '3:4', size: '1080x1440' },
          { ratio: '1:1', size: '1080x1080' },
        ],
        tighten: { maxLines: 3 },
      }
    )

    // Title was longer than 20 chars → should be cropped.
    expect(result.title.length).toBeLessThanOrEqual(20)
    expect(result.title.length).toBeGreaterThan(0)

    // Body should contain image placeholders, not raw "[配图] 见…".
    expect(result.body).not.toMatch(/^\[配图\]\s*见/m)
    expect(result.imageHints.length).toBe(2)
    expect(result.imageHints[0]).toContain('3:4 @ 1080x1440 推荐')
    expect(result.imageHints[1]).toContain('1:1 @ 1080x1080 推荐')

    // Hashtags: 2 hot + 2 niche = 4 tags.
    expect(result.hashtags).toHaveLength(4)
    expect(result.hashtags).toContain('#内容引擎')
    expect(result.hashtags).toContain('#冷启动经验')

    // Final text: starts with title and contains hashtag block at the end.
    expect(result.text.startsWith(result.title)).toBe(true)
    expect(result.text.endsWith(result.hashtags.join(' '))).toBe(true)
  })
})
