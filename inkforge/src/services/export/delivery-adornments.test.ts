/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest'

import {
  DeliveryAdornmentConfigSchema,
  applyDeliveryAdornmentsToOutput,
  createDeliveryAdornmentFragments,
  getDefaultDeliveryAdornmentConfig,
  getDeliveryMastheadSong,
  resolveDeliveryAdornmentSlots,
} from './delivery-adornments'
import { convertToNativeFormat, convertToPlatform } from './index'
import type { DeliveryAdornmentConfig } from './delivery-adornments'

const DELIVERY_CONFIG: DeliveryAdornmentConfig = {
  readingTime: {
    enabled: true,
    wordsPerMinute: 300,
  },
  license: 'cc-by-nc-sa-4.0',
  components: [
    {
      id: 'delivery-image',
      type: 'image',
      enabled: true,
      url: 'https://images.example.com/inkforge-cover.png',
      alt: 'InkForge 排版封面',
      caption: '远程 HTTPS 配图',
    },
    {
      id: 'delivery-link',
      type: 'link',
      enabled: true,
      url: 'https://example.com/inkforge',
      title: 'InkForge 项目主页',
      description: '继续阅读与资料入口',
    },
    {
      id: 'delivery-related',
      type: 'related-article',
      enabled: true,
      url: 'https://example.com/articles/related',
      title: '关联文章',
      summary: '与当前主题相关的延伸阅读。',
    },
    {
      id: 'delivery-song',
      type: 'song',
      enabled: true,
      title: '夜航',
      artist: 'InkForge',
      url: '',
    },
    {
      id: 'delivery-contact',
      type: 'contact-card',
      enabled: true,
      displayName: '墨铸编辑部',
      accountId: 'inkforge-editorial',
      profileUrl: '',
    },
  ],
}

const MARKDOWN = [
  '# 真实交付附加内容',
  '',
  '这是一段用于验证阅读时间、平台组件与许可协议的真实 Markdown 正文。',
  '',
  '第二段包含 InkForge desktop publishing workflow。',
].join('\n')

describe('delivery adornment schema and renderer', () => {
  it('provides deterministic backward-compatible defaults', () => {
    expect(getDefaultDeliveryAdornmentConfig()).toEqual({
      readingTime: {
        enabled: true,
        wordsPerMinute: 300,
      },
      license: 'none',
      components: [],
    })

    expect(DeliveryAdornmentConfigSchema.parse({})).toEqual(
      getDefaultDeliveryAdornmentConfig(),
    )
  })

  it('rejects active-content URLs at the schema boundary', () => {
    const result = DeliveryAdornmentConfigSchema.safeParse({
      components: [{
        id: 'unsafe-link',
        type: 'link',
        enabled: true,
        title: '危险链接',
        description: '',
        url: 'javascript:alert(1)',
      }],
    })

    expect(result.success).toBe(false)
  })

  it('encodes Markdown destination delimiters before rendering Zhihu links', () => {
    const injectedUrl = 'https://example.com/foo)![track](https://evil.example/pixel'
    const result = createDeliveryAdornmentFragments({
      sourceMarkdown: MARKDOWN,
      platform: 'zhihu',
      format: 'markdown',
      config: {
        readingTime: { enabled: false, wordsPerMinute: 300 },
        license: 'none',
        components: [{
          id: 'safe-link',
          type: 'link',
          enabled: true,
          title: '安全链接',
          description: '',
          url: injectedUrl,
        }],
      },
    })

    expect(result.suffix).toContain('foo%29![track]%28https://evil.example/pixel')
    expect(result.suffix).not.toContain('foo)![track](https://evil.example/pixel')
    expect(result.suffix).not.toMatch(/!\[track\]\(/)
  })

  it('adds WeChat-safe HTML, promotes a static profile, and leaves native song selection manual', async () => {
    const result = await convertToNativeFormat(MARKDOWN, 'wechat', {
      includeQualityReport: false,
      exportOptions: {
        enableCiteStatus: false,
        enableCodeHighlight: false,
        deliveryAdornment: DELIVERY_CONFIG,
      },
    })

    expect(result.format).toBe('html')
    expect(result.content).toContain('阅读约')
    expect(result.content).toContain('InkForge 排版封面')
    expect(result.content).toContain('InkForge 项目主页')
    expect(result.content).toContain('关联文章')
    expect(result.content).toContain('墨铸编辑部')
    expect(result.content).toContain('inkforge-editorial')
    expect(result.content).toContain('CC BY-NC-SA 4.0')
    expect(result.content).toContain('data-ink-delivery="link"')
    expect(result.content).toContain('data-ink-delivery="license"')
    expect(result.content).toContain('border-top:4px solid #C19A56')
    expect(result.content).not.toContain('javascript:')
    expect(result.content).not.toContain('夜航')
    expect(result.content.indexOf('墨铸编辑部')).toBeLessThan(
      result.content.indexOf('InkForge 排版封面'),
    )
    expect(result.content.indexOf('InkForge 排版封面')).toBeLessThan(
      result.content.indexOf('InkForge 项目主页'),
    )
    expect(result.content.indexOf('InkForge 项目主页')).toBeLessThan(
      result.content.indexOf('关联文章'),
    )
    expect(result.content.indexOf('关联文章')).toBeLessThan(
      result.content.indexOf('CC BY-NC-SA 4.0'),
    )

    expect(result.deliveryAdornment?.valid).toBe(true)
    expect(result.deliveryAdornment?.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delivery-image', status: 'applied', output: 'included' }),
      expect.objectContaining({ id: 'delivery-related', status: 'degraded', output: 'included' }),
      expect.objectContaining({ id: 'delivery-song', status: 'manual-required', output: 'omitted' }),
      expect.objectContaining({ id: 'delivery-contact', status: 'degraded', output: 'included' }),
    ]))
  })

  it('resolves duplicate IDs, eligibility, promoted slots, and remainder in source order', () => {
    const config: DeliveryAdornmentConfig = {
      readingTime: { enabled: true, wordsPerMinute: 300 },
      license: 'none',
      components: [
        {
          id: 'incomplete-song',
          type: 'song',
          enabled: true,
          title: '缺少链接',
          artist: '',
          url: '',
          coverUrl: '',
        },
        {
          id: 'masthead-song',
          type: 'song',
          enabled: true,
          title: '夜航',
          artist: '墨铸编辑部',
          url: 'https://example.com/audio/night-flight',
          coverUrl: 'https://images.example.com/night-flight.png',
        },
        {
          id: 'masthead-song',
          type: 'contact-card',
          enabled: true,
          displayName: '重复 ID 名片',
          accountId: '',
          profileUrl: '',
          description: '',
          avatarUrl: '',
          qrImageUrl: '',
        },
        {
          id: 'own-profile',
          type: 'contact-card',
          enabled: true,
          displayName: '墨铸公众号',
          accountId: 'inkforge',
          profileUrl: '',
          description: '欢迎关注真实公众号',
          avatarUrl: 'https://images.example.com/avatar.png',
          qrImageUrl: 'https://images.example.com/qr.png',
        },
        {
          id: 'related',
          type: 'related-article',
          enabled: true,
          title: '延伸阅读',
          summary: '',
          url: 'https://example.com/related',
        },
        {
          id: 'extra-profile',
          type: 'contact-card',
          enabled: true,
          displayName: '联合作者公众号',
          accountId: '',
          profileUrl: '',
          description: '',
          avatarUrl: '',
          qrImageUrl: '',
        },
      ],
    }

    const resolved = resolveDeliveryAdornmentSlots(config)
    expect(resolved.valid).toBe(true)
    expect(resolved.mastheadSong).toEqual({
      componentId: 'masthead-song',
      title: '夜航',
      artist: '墨铸编辑部',
      url: 'https://example.com/audio/night-flight',
      coverUrl: 'https://images.example.com/night-flight.png',
    })
    expect(resolved.afterBodyProfile?.id).toBe('own-profile')
    expect(resolved.remainderComponents.map(component => component.id)).toEqual([
      'incomplete-song',
      'related',
      'extra-profile',
    ])

    expect(getDeliveryMastheadSong(config)?.componentId).toBe('masthead-song')

    const fragments = createDeliveryAdornmentFragments({
      sourceMarkdown: MARKDOWN,
      platform: 'wechat',
      format: 'html',
      config,
      readingTimeAlreadyRendered: true,
      mastheadComponentId: resolved.mastheadSong?.componentId,
    })
    expect(fragments.suffix.indexOf('墨铸公众号')).toBeLessThan(
      fragments.suffix.indexOf('延伸阅读'),
    )
    expect(fragments.suffix.indexOf('延伸阅读')).toBeLessThan(
      fragments.suffix.indexOf('联合作者公众号'),
    )
    expect(fragments.suffix).not.toContain('重复 ID 名片')
    expect(fragments.report?.components).toHaveLength(config.components.length)
    expect(fragments.report?.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'incomplete-song', status: 'manual-required', output: 'omitted' }),
      expect.objectContaining({ id: 'masthead-song', type: 'song', status: 'degraded', output: 'included' }),
      expect.objectContaining({ id: 'masthead-song', type: 'contact-card', status: 'invalid', output: 'omitted' }),
      expect.objectContaining({ id: 'own-profile', status: 'degraded', output: 'included' }),
      expect.objectContaining({ id: 'extra-profile', status: 'degraded', output: 'included' }),
    ]))
  })

  it('keeps the first duplicate ID before eligibility and ignores a later valid duplicate', () => {
    const resolved = resolveDeliveryAdornmentSlots({
      components: [
        {
          id: 'duplicate-song',
          type: 'song',
          title: '首项缺少链接',
          url: '',
        },
        {
          id: 'duplicate-song',
          type: 'song',
          title: '后项虽然完整也不得覆盖',
          url: 'https://example.com/duplicate-song',
        },
        {
          id: 'fallback-song',
          type: 'song',
          title: '真正提升项',
          url: 'https://example.com/fallback-song',
        },
      ],
    })

    expect(resolved.mastheadSong?.componentId).toBe('fallback-song')
    expect(resolved.remainderComponents.map(component => component.id)).toEqual(['duplicate-song'])
    expect(resolved.duplicateComponents).toHaveLength(1)
    expect(resolved.duplicateComponents[0]?.id).toBe('duplicate-song')
  })

  it('keeps an eligible song in the suffix until its resolved masthead slot is actually rendered', () => {
    const config: DeliveryAdornmentConfig = {
      readingTime: { enabled: true, wordsPerMinute: 300 },
      license: 'none',
      components: [{
        id: 'suffix-song',
        type: 'song',
        enabled: true,
        title: '候选歌曲',
        artist: '',
        url: 'https://example.com/candidate-song',
      }],
    }

    const safeParse = vi.spyOn(DeliveryAdornmentConfigSchema, 'safeParse')
    const fragments = createDeliveryAdornmentFragments({
      sourceMarkdown: MARKDOWN,
      platform: 'wechat',
      format: 'html',
      config,
      readingTimeAlreadyRendered: true,
    })

    const safeParseCalls = safeParse.mock.calls.length
    safeParse.mockRestore()
    expect(safeParseCalls).toBe(1)
    expect(fragments.suffix).toContain('候选歌曲')
    expect(fragments.report?.components).toContainEqual(expect.objectContaining({
      id: 'suffix-song',
      status: 'degraded',
      output: 'included',
    }))
  })

  it('accepts optional HTTPS media fields and rejects insecure images', () => {
    const legacy = DeliveryAdornmentConfigSchema.parse({
      components: [{
        id: 'legacy-profile',
        type: 'contact-card',
        displayName: '旧名片',
      }],
    })
    expect(legacy.components[0]).not.toHaveProperty('description')
    expect(legacy.components[0]).not.toHaveProperty('avatarUrl')
    expect(legacy.components[0]).not.toHaveProperty('qrImageUrl')

    expect(DeliveryAdornmentConfigSchema.safeParse({
      components: [
        {
          id: 'song',
          type: 'song',
          title: '夜航',
          url: 'https://example.com/night-flight',
          coverUrl: 'https://images.example.com/cover.png',
        },
        {
          id: 'profile',
          type: 'contact-card',
          displayName: '墨铸公众号',
          description: '欢迎关注',
          avatarUrl: 'https://images.example.com/avatar.png',
          qrImageUrl: 'https://images.example.com/qr.png',
        },
      ],
    }).success).toBe(true)

    for (const field of ['coverUrl', 'avatarUrl', 'qrImageUrl']) {
      const component = field === 'coverUrl'
        ? { id: field, type: 'song', title: '夜航', url: 'https://example.com/night-flight', [field]: 'http://images.example.com/image.png' }
        : { id: field, type: 'contact-card', displayName: '墨铸公众号', [field]: 'http://images.example.com/image.png' }
      expect(DeliveryAdornmentConfigSchema.safeParse({ components: [component] }).success).toBe(false)
    }
  })

  it('renders one real song in the WeChat masthead and reports no duplicate suffix', async () => {
    const config: DeliveryAdornmentConfig = {
      readingTime: { enabled: true, wordsPerMinute: 300 },
      license: 'none',
      components: [{
        id: 'masthead-song',
        type: 'song',
        enabled: true,
        title: '夜航',
        artist: '墨铸编辑部',
        url: 'https://example.com/audio/night-flight',
      }],
    }

    expect(getDeliveryMastheadSong(config)).toEqual({
      componentId: 'masthead-song',
      title: '夜航',
      artist: '墨铸编辑部',
      url: 'https://example.com/audio/night-flight',
    })

    const result = await convertToNativeFormat(MARKDOWN, 'wechat', {
      includeQualityReport: false,
      exportOptions: {
        enableCiteStatus: false,
        enableCodeHighlight: false,
        deliveryAdornment: config,
      },
    })

    expect(result.content.match(/夜航/g)).toHaveLength(1)
    expect(result.content).toContain('data-ink-masthead-song="true"')
    expect(result.deliveryAdornment?.components).toContainEqual(expect.objectContaining({
      id: 'masthead-song',
      status: 'degraded',
      output: 'included',
    }))
  })

  it('degrades Xiaohongshu components truthfully without writing image/card placeholders', async () => {
    const result = await convertToNativeFormat(MARKDOWN, 'xiaohongshu', {
      includeQualityReport: false,
      exportOptions: {
        deliveryAdornment: DELIVERY_CONFIG,
      },
      xiaohongshuTextOptions: {
        injectEmojis: false,
        generateTags: false,
        hashtagInBody: false,
        addSignature: false,
        titleSplit: false,
      },
    })

    expect(result.format).toBe('text')
    expect(result.content).toMatch(/^预计阅读 \d+ 分钟/)
    expect(result.content).toContain('InkForge 项目主页')
    expect(result.content).toContain('https://example.com/inkforge')
    expect(result.content).toContain('CC BY-NC-SA 4.0')
    expect(result.content).not.toContain('InkForge 排版封面')
    expect(result.content).not.toContain('夜航')
    expect(result.deliveryAdornment?.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'delivery-image', status: 'manual-required', output: 'omitted' }),
      expect.objectContaining({ id: 'delivery-link', status: 'degraded', output: 'included' }),
    ]))
  })

  it('emits native Zhihu Markdown for supported image/link components and appends CC at the tail', async () => {
    const result = await convertToNativeFormat(MARKDOWN, 'zhihu', {
      includeQualityReport: false,
      exportOptions: {
        deliveryAdornment: DELIVERY_CONFIG,
      },
    })

    expect(result.format).toBe('markdown')
    expect(result.content).toMatch(/^> 预计阅读 \d+ 分钟/)
    expect(result.content).toContain(
      '![InkForge 排版封面](https://images.example.com/inkforge-cover.png)',
    )
    expect(result.content).toContain(
      '[InkForge 项目主页](https://example.com/inkforge)',
    )
    expect(result.content.trim().endsWith(
      '[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)',
    )).toBe(true)
  })

  it('uses the same snapshot in HTML previews for non-WeChat platforms', async () => {
    const [xhsPreview, zhihuPreview] = await Promise.all([
      convertToPlatform(MARKDOWN, 'xiaohongshu', {
        exportOptions: { deliveryAdornment: DELIVERY_CONFIG },
      }),
      convertToPlatform(MARKDOWN, 'zhihu', {
        exportOptions: { deliveryAdornment: DELIVERY_CONFIG },
      }),
    ])

    for (const preview of [xhsPreview, zhihuPreview]) {
      expect(preview).toContain('预计阅读')
      expect(preview).toContain('InkForge 项目主页')
      expect(preview).toContain('CC BY-NC-SA 4.0')
      expect(preview).not.toContain('javascript:')
    }
  })

  it('keeps the original output byte-for-byte when no adornment snapshot is supplied', () => {
    const original = '<section><p>原始产物</p></section>'
    const result = applyDeliveryAdornmentsToOutput({
      content: original,
      sourceMarkdown: MARKDOWN,
      platform: 'wechat',
      format: 'html',
      config: undefined,
      readingTimeAlreadyRendered: true,
    })

    expect(result.content).toBe(original)
    expect(result.report).toBeUndefined()
  })
})
