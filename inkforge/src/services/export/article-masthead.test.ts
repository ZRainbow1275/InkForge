/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from 'vitest'

import type { DeliveryAdornmentConfig } from './delivery-adornments'
import { getPresetById, themePresets } from './themes'
import { buildReadingTimeHeader } from './utils'
import { VISUAL_VARIANTS, resolveVisualVariant } from './visual-variants'
import { convertToWechatWithStats } from './wechat'

const BASE_WECHAT_PRESET_IDS = [
  'thesis',
  'legal',
  'report',
  'commentary',
  'aigc',
  'code',
  'notes',
  'news',
  'meme',
  'life',
  'elegant',
  'tech',
] as const

const STATS = {
  wordCount: 880,
  readingTime: 3,
  codeBlockCount: 1,
  linkCount: 0,
  imageCount: 2,
  headingCount: 3,
  tableCount: 1,
}

const STRUCTURE_FIXTURE = [
  '<h1>信息如何形成秩序</h1>',
  '<p>正文用于比较同一真实内容在不同预设中的结构差异。</p>',
  '<h2>证据与判断</h2>',
  '<blockquote><p>引用必须保留来源语义。</p></blockquote>',
  '<table><thead><tr><th>维度</th><th>结果</th></tr></thead><tbody><tr><td>结构</td><td>可读</td></tr></tbody></table>',
  '<pre><code>const verified = true</code></pre>',
].join('')

const SONG_CONFIG: DeliveryAdornmentConfig = {
  readingTime: { enabled: true, wordsPerMinute: 300 },
  license: 'none',
  components: [{
    id: 'real-masthead-song',
    enabled: true,
    type: 'song',
    title: '真实歌曲',
    artist: '真实作者',
    url: 'https://music.example.com/verified-song',
  }],
}

describe('article masthead', () => {
  it('uses the real title, real statistics, fixed editorial guidance, and an optional real category', () => {
    const html = buildReadingTimeHeader(STATS, {
      title: '真实标题',
      category: '行业观察',
      variantId: 'industry-section',
    })

    expect(html).toContain('文章值得您享受')
    expect(html).toContain('INKFORGE · INDUSTRY SECTION')
    expect(html).toContain('真实标题')
    expect(html).toContain('阅读约 3 分钟')
    expect(html).toContain('全文 880 字')
    expect(html).toContain('类别 行业观察')
    expect(html).toContain('data-ink-masthead-variant="industry-section"')
    expect(html).toContain('产业剖面')
    expect(html).toContain('class="ink-article-masthead__identity"')
    expect(html).toContain('class="ink-article-masthead__meta"')
    expect(html).not.toContain('未分类')
    expect(html).not.toContain('未命名歌曲')
  })

  it('omits unavailable category data instead of inventing it', () => {
    const html = buildReadingTimeHeader(STATS)

    expect(html).toContain('文章值得您享受')
    expect(html).not.toContain('类别 ')
    expect(html).not.toContain('未命名文章')
  })

  it('keeps the visual masthead when the reading-time prompt is disabled', () => {
    const html = buildReadingTimeHeader(STATS, {
      title: '真实标题',
      category: '真实分类',
      showReadingTime: false,
      variantId: 'jurisprudence-atlas',
    })

    expect(html).toContain('data-ink-masthead-variant="jurisprudence-atlas"')
    expect(html).toContain('真实标题')
    expect(html).toContain('类别 真实分类')
    expect(html).not.toContain('阅读约')
  })

  it('keeps the selected variant masthead in the real converter when reading time is disabled', () => {
    const preset = getPresetById('legal')
    expect(preset).toBeDefined()

    const result = convertToWechatWithStats('<p>真实正文。</p>', preset!, {
      enableReadingTime: false,
      articleTitle: '真实标题',
      articleCategory: '真实分类',
      enableCiteStatus: false,
      enableCodeHighlight: false,
      deliveryAdornment: {
        readingTime: { enabled: false, wordsPerMinute: 300 },
        license: 'none',
        components: [{
          id: 'real-song',
          type: 'song',
          enabled: true,
          title: '真实歌曲',
          artist: '真实作者',
          url: 'https://music.example.com/real-song',
        }],
      },
    })

    expect(result.html).toContain('data-ink-masthead-variant="jurisprudence-atlas"')
    expect(result.html).toContain('真实标题')
    expect(result.html).toContain('真实分类')
    expect(result.html).toContain('真实歌曲')
    expect(result.html).toContain('真实作者')
    expect(result.html).not.toContain('阅读约')
  })

  it('escapes untrusted masthead metadata at the post-sanitize insertion boundary', () => {
    const html = buildReadingTimeHeader(STATS, {
      title: '<img src=x onerror=alert(1)>',
      category: '</span><script>alert(2)</script>',
      song: {
        title: '<svg onload=alert(3)>',
        artist: '" onmouseover="alert(4)',
        url: 'https://music.example.com/verified-song',
      },
    })

    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<svg onload')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;svg onload=alert(3)&gt;')
    expect(html).toContain('&quot; onmouseover=&quot;alert(4)')
  })

  it('gives all seven visual variants a distinct masthead structure without fake article data', () => {
    const expectedCompositions = {
      'critical-translation': 'bound-volume',
      'jurisprudence-atlas': 'coordinate-field',
      'industry-section': 'section-cut',
      'fact-wire': 'commentary-brief',
      'machine-foundry': 'model-matrix',
      'knowledge-weave': 'weave-map',
      'human-margins': 'quiet-letter',
    } as const
    const mastheads = VISUAL_VARIANTS.map(variant => buildReadingTimeHeader(STATS, {
      title: '同一篇真实文章',
      category: '真实分类',
      variantId: variant.id,
    }))

    expect(new Set(mastheads).size).toBe(VISUAL_VARIANTS.length)
    for (const [index, html] of mastheads.entries()) {
      expect(html).toContain(`data-ink-masthead-variant="${VISUAL_VARIANTS[index].id}"`)
      expect(html).toContain(
        `data-ink-masthead-composition="${expectedCompositions[VISUAL_VARIANTS[index].id]}"`,
      )
      expect(html).toContain('同一篇真实文章')
      expect(html).toContain(VISUAL_VARIANTS[index].name)
      expect(html).not.toContain('未命名')
    }
    const structuralFingerprints = mastheads.map(html => html
      .replace(/data-ink-masthead-(?:variant|layout)="[^"]+"/g, 'data-ink-masthead=""')
      .replace(/ink-article-masthead--[^\s"]+/g, 'ink-article-masthead--variant')
      .replace(/>[^<]*</g, '><'))
    expect(new Set(structuralFingerprints).size).toBe(VISUAL_VARIANTS.length)
  })

  it.each([
    ['fact-wire', 'commentary', 'news'],
    ['machine-foundry', 'aigc', 'code'],
    ['machine-foundry', 'code', 'tech'],
    ['human-margins', 'meme', 'life'],
    ['human-margins', 'life', 'elegant'],
  ] as const)(
    'keeps %s profile mastheads structurally distinct for %s and %s',
    (variantId, firstPresetId, secondPresetId) => {
      const render = (presetId: string) => buildReadingTimeHeader(STATS, {
        title: '同一篇真实文章',
        category: '真实分类',
        variantId,
        presetId,
      })
      const first = render(firstPresetId)
      const second = render(secondPresetId)
      const fingerprint = (html: string) => html
        .replace(/style="[^"]*"/g, '')
        .replace(/>[^<]*</g, '><')
        .replace(/\s+/g, ' ')

      expect(first).toContain(`data-ink-masthead-profile="${firstPresetId}"`)
      expect(second).toContain(`data-ink-masthead-profile="${secondPresetId}"`)
      expect(fingerprint(first)).not.toBe(fingerprint(second))
    },
  )

  it('gives every base WeChat preset its own masthead composition while keeping one brand line', () => {
    const compositions = BASE_WECHAT_PRESET_IDS.map((presetId) => {
      const variantId = resolveVisualVariant('wechat', presetId).variantId
      const html = buildReadingTimeHeader(STATS, {
        title: '同一篇真实文章',
        category: '真实分类',
        variantId,
        presetId,
      })
      const composition = /data-ink-masthead-composition="([^"]+)"/.exec(html)?.[1]

      expect(composition, presetId).toBeTruthy()
      expect(html, presetId).toContain('INKFORGE ·')
      expect(html, presetId).toContain('文章值得您享受')
      return composition
    })

    expect(new Set(compositions).size).toBe(BASE_WECHAT_PRESET_IDS.length)
  })

  it('keeps all sixteen final WeChat preset structures distinct after the real converter', () => {
    const fingerprints = themePresets.map((preset) => {
      const result = convertToWechatWithStats(STRUCTURE_FIXTURE, preset, {
        enableReadingTime: true,
        articleTitle: '同一篇真实文章',
        articleCategory: '真实分类',
        enableCiteStatus: false,
        enableCodeHighlight: false,
      })
      const template = document.createElement('template')
      template.innerHTML = result.html
      expect(template.content.textContent, preset.id).toContain('INKFORGE ·')
      expect(template.content.textContent, preset.id).toContain('文章值得您享受')
      for (const element of template.content.querySelectorAll('*')) {
        element.removeAttribute('style')
        element.removeAttribute('data-ink-masthead-variant')
        element.removeAttribute('data-ink-masthead-layout')
        element.removeAttribute('data-ink-masthead-profile')
      }
      for (const node of Array.from(template.content.querySelectorAll('*'))) {
        for (const child of Array.from(node.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) child.textContent = ''
        }
      }

      return template.innerHTML.replace(/\s+/g, ' ').trim()
    })

    expect(new Set(fingerprints).size).toBe(themePresets.length)
  })

  it('renders only a complete real song and never invents a player', () => {
    const html = buildReadingTimeHeader(STATS, {
      song: {
        title: '真实歌曲',
        artist: '真实作者',
        url: 'https://music.example.com/verified-song',
      },
    })
    const incomplete = buildReadingTimeHeader(STATS, {
      song: { title: '只有标题', url: '' },
    })

    expect(html).toContain('data-ink-masthead-song="true"')
    expect(html).toContain('真实歌曲')
    expect(html).toContain('真实作者')
    expect(html).toContain('https://music.example.com/verified-song')
    expect(html).toContain('公众号原生曲库需在平台内确认')
    expect(html).not.toMatch(/<audio\b|<iframe\b|未命名歌曲/)
    expect(incomplete).not.toContain('data-ink-masthead-song')
    expect(incomplete).not.toContain('只有标题')
    expect(html.indexOf('文章值得您享受')).toBeLessThan(html.indexOf('data-ink-masthead-song="true"'))
    expect(html.indexOf('data-ink-masthead-song="true"')).toBeLessThan(html.indexOf('ink-article-masthead__identity'))
    expect(html).not.toContain('float:')
  })

  it.each(['flagship-kiln', 'flagship-kiln-paste-safe', 'flagship-tempera', 'flagship-amber'])(
    'keeps the complete masthead contract after %s decoration',
    (presetId) => {
      const preset = getPresetById(presetId)
      expect(preset).toBeDefined()

      const result = convertToWechatWithStats('<h1>真实标题</h1><p>真实正文。</p>', preset!, {
        enableReadingTime: true,
        articleTitle: '真实标题',
        articleCategory: '行业观察',
        enableCiteStatus: false,
        enableCodeHighlight: false,
      })

      expect(result.html).toContain('data-ink-block="flagship-readbar"')
      expect(result.html).toContain('文章值得您享受')
      expect(result.html).toContain('真实标题')
      expect(result.html).toContain('行业观察')
    },
  )

  it.each(themePresets.map(preset => [preset.id, preset.primaryColor] as const))(
    'places one theme-bound real song inside the %s masthead after its brand lead',
    (presetId, primaryColor) => {
      const preset = getPresetById(presetId)
      expect(preset).toBeDefined()

      const result = convertToWechatWithStats('<h1>真实标题</h1><p>真实正文。</p>', preset!, {
        enableReadingTime: true,
        articleTitle: '真实标题',
        articleCategory: '行业观察',
        enableCiteStatus: false,
        enableCodeHighlight: false,
        deliveryAdornment: SONG_CONFIG,
      })
      const template = document.createElement('template')
      template.innerHTML = result.html
      const songTitle = Array.from(template.content.querySelectorAll('strong'))
        .find(element => element.textContent === '真实歌曲')
      const songCard = songTitle?.closest('section')
      const masthead = template.content.querySelector('section[data-ink-masthead-variant]')

      expect(songCard, presetId).not.toBeNull()
      expect(masthead?.contains(songCard ?? null), presetId).toBe(true)
      expect(songCard?.outerHTML.toLowerCase(), presetId).toContain(primaryColor.toLowerCase())
      expect(result.html.match(/真实歌曲/g), presetId).toHaveLength(1)
      expect(result.html, presetId).toContain('文章值得您享受')
      expect(result.html, presetId).toContain('行业观察')
    },
  )
})
