/**
 * @vitest-environment happy-dom
 */
import { createApp, nextTick, reactive, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

const stats = {
  wordCount: 1,
  readingTime: 1,
  codeBlockCount: 0,
  linkCount: 0,
}

describe('PublishView article snapshot ownership', () => {
  it('ignores stale renderer and draft results after the selected article changes', async () => {
    vi.resetModules()
    const currentContent = ref({ articleId: 'article-a', title: 'Article A', body: 'ARTICLE_A' })
    const currentPresetId = ref('thesis')
    const route = reactive({ query: { id: 'article-a' } as Record<string, string> })
    const routerPush = vi.fn()
    const sharedTitle = `${'标'.repeat(31)}😀`
    const selectedArticleId = ref('article-a')
    const selectArticle = vi.fn((articleId: string) => { selectedArticleId.value = articleId })
    const firstArticleLoad = deferred<void>()
    const secondArticleLoad = deferred<void>()
    const articles = [{ id: 'article-a' }]
    const loadArticles = vi.fn()
      .mockImplementationOnce(() => firstArticleLoad.promise)
      .mockImplementationOnce(() => secondArticleLoad.promise)
      .mockResolvedValue(undefined)
    const articleStore = {
      articles,
      get selectedArticleId() { return selectedArticleId.value },
      loadArticles,
      selectArticle,
    }
    const firstRender = deferred<{ html: string; stats: typeof stats }>()
    const firstPublish = deferred<{
      articleCount: number
      createdAt: string
      coverHandle: string
      uploadedContentHtml: string
      uploadedImageCount: number
    }>()
    const renderWechat = vi.fn((content: string) => {
      if (content === 'ARTICLE_A') return firstRender.promise
      if (content === 'BROKEN_ARTICLE') return Promise.reject(new Error('renderer failed'))
      return Promise.resolve({
        html: `<section><p>${content}</p><img src="https://example.com/cover.png"></section>`,
        stats,
      })
    })
    const publishDraft = vi.fn()
      .mockImplementationOnce(() => firstPublish.promise)
      .mockResolvedValue({
        articleCount: 1,
        createdAt: '2026-08-21T00:00:00.000Z',
        coverHandle: 'c'.repeat(32),
        uploadedContentHtml: '<section><p>ARTICLE_C</p></section>',
        uploadedImageCount: 1,
      })

    vi.doMock('pinia', () => ({ storeToRefs: (store: unknown) => store }))
    vi.doMock('vue-router', () => ({
      useRoute: () => route,
      useRouter: () => ({ push: routerPush }),
    }))
    vi.doMock('@/stores/article', () => ({
      useArticleStore: () => articleStore,
    }))
    vi.doMock('@/stores/editor', () => ({
      useEditorStore: () => ({ currentContent }),
    }))
    vi.doMock('@/stores/settings', () => ({
      useSettingsStore: () => ({ recordExportHistory: vi.fn() }),
    }))
    vi.doMock('@/stores/theme', () => ({
      useThemeStore: () => ({ currentPresetId }),
    }))
    vi.doMock('@/extensions/TyporaMode', () => ({
      isLikelyHtmlContent: () => false,
      serializeHtmlToMarkdown: (value: string) => value,
    }))
    vi.doMock('@/services/error', () => ({
      logger: { error: vi.fn(), warn: vi.fn() },
    }))
    vi.doMock('@/services/export', () => ({
      themePresets: [{ id: 'thesis', name: '论文', primaryColor: '#333333' }],
      xiaohongshuPresets: [{ id: 'xhs-fresh', name: '清新', primaryColor: '#333333' }],
      SVG_MODULES: [],
      WECHAT_SVG_APPLICATION_SLOTS: [],
      WECHAT_DRAFT_TITLE_MAX_CHARS: 32,
      normalizeWechatSvgApplicationPlan: () => ({}),
      getWechatSvgApplicationSlotModuleId: () => '',
      setWechatSvgApplicationSlot: () => ({}),
      markdownToWechatWithStats: renderWechat,
      convertToXiaohongshu: (html: string) => html,
      convertToZhihu: (html: string) => html,
      calculateStats: () => stats,
      describeWechatPublishStatus: () => '微信草稿通道已配置',
      getWechatPublishStatus: () => Promise.resolve({
        configured: true,
        missingKeys: [],
        source: 'env.local',
        appIdHint: 'wx…test',
      }),
      publishWechatDraft: publishDraft,
      copySanitizedPublishRichHtmlWithExecCommand: () => true,
      copyTextToClipboard: () => Promise.resolve(true),
      copyRichHtmlToClipboard: () => Promise.resolve(true),
      copyWechatHtmlToClipboard: () => Promise.resolve(true),
    }))

    const { default: PublishView } = await import('../PublishView.vue')
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(PublishView)
    app.mount(host)

    await vi.waitFor(() => expect(renderWechat).toHaveBeenCalledTimes(1))
    const draftButton = Array.from(host.querySelectorAll('button'))
      .find(button => button.textContent?.includes('创建微信草稿')) as HTMLButtonElement

    route.query.id = 'article-b'
    expect(draftButton.disabled).toBe(true)
    await nextTick()
    expect(loadArticles).toHaveBeenCalledTimes(1)

    route.query.id = 'article-c'
    await nextTick()
    expect(loadArticles).toHaveBeenCalledTimes(2)
    articles.push({ id: 'article-b' }, { id: 'article-c' }, { id: 'article-d' })
    secondArticleLoad.resolve()
    await vi.waitFor(() => expect(selectArticle).toHaveBeenLastCalledWith('article-c'))
    firstArticleLoad.resolve()
    await Promise.resolve()
    expect(selectedArticleId.value).toBe('article-c')

    route.query.id = 'article-b'
    await nextTick()
    expect(selectArticle).toHaveBeenLastCalledWith('article-b')
    expect(renderWechat).toHaveBeenCalledTimes(1)

    currentContent.value = { articleId: 'article-b', title: sharedTitle, body: 'SHARED_ARTICLE' }
    await nextTick()
    await vi.waitFor(() => expect(host.querySelector('.device-content')?.textContent).toContain('SHARED_ARTICLE'))

    firstRender.resolve({
      html: '<section><p>ARTICLE_A</p><img src="https://example.com/a.png"></section>',
      stats,
    })
    await nextTick()
    await Promise.resolve()
    expect(host.querySelector('.device-content')?.textContent).toContain('SHARED_ARTICLE')
    expect(host.querySelector('.device-content')?.textContent).not.toContain('ARTICLE_A')
    expect(renderWechat).toHaveBeenCalledTimes(2)

    await vi.waitFor(() => expect(draftButton.disabled).toBe(false))
    draftButton.click()
    await vi.waitFor(() => expect(publishDraft).toHaveBeenCalledTimes(1))
    expect(publishDraft.mock.calls[0]?.[0]).toMatchObject({
      title: sharedTitle,
      contentHtml: expect.stringContaining('SHARED_ARTICLE'),
      coverHandle: undefined,
    })

    route.query.id = 'article-c'
    expect(draftButton.disabled).toBe(true)
    await nextTick()
    expect(selectArticle).toHaveBeenLastCalledWith('article-c')
    expect(renderWechat).toHaveBeenCalledTimes(2)

    currentContent.value = { articleId: 'article-c', title: sharedTitle, body: 'SHARED_ARTICLE' }
    await nextTick()
    await vi.waitFor(() => expect(renderWechat).toHaveBeenCalledTimes(3))
    await vi.waitFor(() => expect(host.querySelector('.device-content')?.textContent).toContain('SHARED_ARTICLE'))

    const copyButton = Array.from(host.querySelectorAll('button'))
      .find(button => button.textContent?.includes('复制到剪贴板')) as HTMLButtonElement
    const toast = host.querySelector('.toast') as HTMLElement
    vi.useFakeTimers()
    copyButton.click()
    await Promise.resolve()
    await nextTick()
    expect(toast.classList.contains('visible')).toBe(true)
    vi.advanceTimersByTime(2990)

    firstPublish.resolve({
      articleCount: 1,
      createdAt: '2026-08-21T00:00:00.000Z',
      coverHandle: 'b'.repeat(32),
      uploadedContentHtml: '<section><p>ARTICLE_B</p></section>',
      uploadedImageCount: 1,
    })
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()
    expect(host.textContent).not.toContain('草稿已创建；正文图片 1 张')
    expect(host.textContent).toContain('上一快照的微信草稿已创建')
    vi.advanceTimersByTime(20)
    await nextTick()
    expect(toast.classList.contains('visible')).toBe(true)
    vi.clearAllTimers()
    vi.useRealTimers()

    await vi.waitFor(() => expect(draftButton.disabled).toBe(false))
    draftButton.click()
    await vi.waitFor(() => expect(publishDraft).toHaveBeenCalledTimes(2))
    expect(publishDraft.mock.calls[1]?.[0]).toMatchObject({
      title: sharedTitle,
      contentHtml: expect.stringContaining('SHARED_ARTICLE'),
      coverHandle: undefined,
    })

    route.query.id = 'article-d'
    await nextTick()
    currentContent.value = { articleId: 'article-d', title: 'Broken article', body: 'BROKEN_ARTICLE' }
    await nextTick()
    await vi.waitFor(() => expect(renderWechat).toHaveBeenCalledTimes(4))
    await vi.waitFor(() => expect(host.querySelector('.device-content')?.textContent).toContain('BROKEN_ARTICLE'))
    expect(draftButton.disabled).toBe(true)
    expect(host.textContent).toContain('微信专用渲染失败')

    app.unmount()
    host.remove()
  })
})
