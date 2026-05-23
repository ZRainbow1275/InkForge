/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ErrorCode } from '@/services/error'

import {
  createWechatDraft,
  describeWechatPublishStatus,
  getWechatPublishStatus,
  isWechatHostedContentImageUrl,
  publishWechatDraft,
  rewriteWechatArticleImages,
  uploadWechatCoverImage,
  uploadWechatArticleImage,
} from './wechat-publish'

const invokeMock = vi.fn()
const isTauriEnvMock = vi.fn<() => boolean>()
const resolveAssetSnapshotMock = vi.fn()

vi.mock('@/utils/platform', () => ({
  isTauriEnv: () => isTauriEnvMock(),
  tauriInvoke: <T>(cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args) as Promise<T>,
}))

vi.mock('@/services/asset-pipeline/snapshot', () => ({
  resolveAssetSnapshot: (assetId: string, mode: string) => resolveAssetSnapshotMock(assetId, mode),
}))

describe('wechat-publish service', () => {
  beforeEach(() => {
    invokeMock.mockReset()
    resolveAssetSnapshotMock.mockReset()
    isTauriEnvMock.mockReset()
    isTauriEnvMock.mockReturnValue(true)
  })

  it('returns web runtime status outside Tauri', async () => {
    isTauriEnvMock.mockReturnValue(false)

    await expect(getWechatPublishStatus()).resolves.toEqual({
      configured: false,
      missingKeys: ['WECHAT_APP_ID', 'WECHAT_APP_SECRET'],
      source: 'web-runtime',
      appIdHint: null,
    })
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('passes through already-hosted WeChat images without IPC upload', async () => {
    const image = {
      src: 'https://mmbiz.qpic.cn/mmbiz_png/demo/640',
      resolvedUrl: 'https://mmbiz.qpic.cn/mmbiz_png/demo/640',
    }

    const result = await uploadWechatArticleImage(image)

    expect(result.remoteUrl).toBe(image.resolvedUrl)
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('rejects SVG input before calling the upload command', async () => {
    await expect(uploadWechatArticleImage({
      src: 'https://example.com/diagram.svg',
      resolvedUrl: 'https://example.com/diagram.svg',
      mimeType: 'image/svg+xml',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('applies separate image format rules for article images and permanent covers', async () => {
    invokeMock.mockResolvedValueOnce({
      remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/demo-uploaded/640',
      mediaId: 'cover-media-1',
    })

    await expect(uploadWechatArticleImage({
      src: 'https://example.com/diagram.webp',
      resolvedUrl: 'https://example.com/diagram.webp',
      mimeType: 'image/webp',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(uploadWechatCoverImage({
      src: 'https://example.com/cover.gif',
      resolvedUrl: 'https://example.com/cover.gif',
      mimeType: 'image/gif',
    })).resolves.toMatchObject({
      remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/demo-uploaded/640',
      mediaId: 'cover-media-1',
    })
    await expect(uploadWechatArticleImage({
      src: 'https://example.com/body.gif',
      resolvedUrl: 'https://example.com/body.gif',
      mimeType: 'image/gif',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).toHaveBeenCalledWith('wechat_upload_cover_image', {
      input: expect.objectContaining({
        remoteUrl: 'https://example.com/cover.gif',
        mimeType: 'image/gif',
      }),
    })
  })

  it('only treats http and https WeChat image URLs as already hosted', () => {
    expect(isWechatHostedContentImageUrl('https://mmbiz.qpic.cn/mmbiz_png/demo/640')).toBe(true)
    expect(isWechatHostedContentImageUrl('http://mmbiz.qpic.cn/mmbiz_png/demo/640')).toBe(true)
    expect(isWechatHostedContentImageUrl('ftp://mmbiz.qpic.cn/mmbiz_png/demo/640')).toBe(false)
  })

  it('normalizes inkforge assets to data URLs before invoking article upload', async () => {
    resolveAssetSnapshotMock.mockResolvedValue({
      assetId: 'asset-1',
      status: 'inline-base64',
      mimeType: 'image/png',
      originalName: 'asset-1.png',
      bytes: 68,
      dataUrl: 'data:image/png;base64,ZmFrZQ==',
    })
    invokeMock.mockResolvedValue({
      remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/demo-uploaded/640',
    })

    const result = await uploadWechatArticleImage({
      src: 'inkforge-asset://asset-1',
      resolvedUrl: 'inkforge-asset://asset-1',
      mimeType: 'image/png',
    })

    expect(resolveAssetSnapshotMock).toHaveBeenCalledWith('asset-1', 'inline-base64')
    expect(invokeMock).toHaveBeenCalledWith('wechat_upload_article_image', {
      input: expect.objectContaining({
        dataUrl: 'data:image/png;base64,ZmFrZQ==',
        filename: 'wechat-upload.png',
        mimeType: 'image/png',
      }),
    })
    expect(result.remoteUrl).toBe('https://mmbiz.qpic.cn/mmbiz_png/demo-uploaded/640')
  })

  it('rewrites duplicated external images only once', async () => {
    invokeMock.mockResolvedValue({
      remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/replaced/640',
    })

    const rewritten = await rewriteWechatArticleImages([
      '<p><img src="https://example.com/a.png" alt="a"></p>',
      '<p><img src="https://example.com/a.png" alt="b"></p>',
      '<p><img src="https://mmbiz.qpic.cn/mmbiz_png/kept/640" alt="keep"></p>',
    ].join(''))

    expect(rewritten.uploadedImages).toHaveLength(1)
    expect(rewritten.html).toContain('https://mmbiz.qpic.cn/mmbiz_png/replaced/640')
    expect(rewritten.html).toContain('https://mmbiz.qpic.cn/mmbiz_png/kept/640')
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })

  it('removes stale srcset attributes while rewriting WeChat article images', async () => {
    invokeMock.mockResolvedValue({
      remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/replaced/640',
    })

    const rewritten = await rewriteWechatArticleImages(
      '<p><img src="https://example.com/a.png" srcset="https://example.com/a@2x.png 2x"></p>'
        + '<p><img src="https://mmbiz.qpic.cn/mmbiz_png/kept/640" srcset="https://example.com/old.png 2x"></p>',
    )

    expect(rewritten.html).toContain('https://mmbiz.qpic.cn/mmbiz_png/replaced/640')
    expect(rewritten.html).not.toContain('srcset=')
  })

  it('blocks draft creation when content still references non-WeChat image hosts', async () => {
    await expect(createWechatDraft({
      title: 'Draft title',
      content: '<p><img src="https://example.com/not-uploaded.png"></p>',
      thumbMediaId: 'thumb-1',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('blocks draft creation when srcset still references non-WeChat image hosts', async () => {
    await expect(createWechatDraft({
      title: 'Draft title',
      content: '<p><img src="https://mmbiz.qpic.cn/mmbiz_png/ok/640" srcset="https://example.com/not-uploaded.png 2x"></p>',
      thumbMediaId: 'thumb-1',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('blocks draft creation when content exceeds WeChat article limits', async () => {
    await expect(createWechatDraft({
      title: 'Draft title',
      content: 'a'.repeat(20_000),
      thumbMediaId: 'thumb-1',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('blocks draft creation when WeChat draft metadata exceeds official limits', async () => {
    const baseArticle = {
      title: 'Draft title',
      content: '<p><img src="https://mmbiz.qpic.cn/mmbiz_png/ok/640"></p>',
      thumbMediaId: 'thumb-1',
    }

    await expect(createWechatDraft({
      ...baseArticle,
      title: '标'.repeat(33),
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(createWechatDraft({
      ...baseArticle,
      author: '作者'.repeat(9),
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(createWechatDraft({
      ...baseArticle,
      digest: '摘'.repeat(129),
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(createWechatDraft({
      ...baseArticle,
      contentSourceUrl: `https://example.com/${'x'.repeat(1100)}`,
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(createWechatDraft({
      ...baseArticle,
      contentSourceUrl: 'javascript:alert(1)',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('sends camelCase article input to Tauri draft creation command', async () => {
    invokeMock.mockResolvedValue({
      mediaId: 'draft-1',
      articleCount: 1,
    })

    const result = await createWechatDraft({
      title: 'Draft title',
      content: '<p><img src="https://mmbiz.qpic.cn/mmbiz_png/ok/640"></p>',
      thumbMediaId: 'thumb-1',
      showCoverPic: 1,
      contentSourceUrl: 'https://example.com/source',
      needOpenComment: 1,
      onlyFansCanComment: 0,
    })

    expect(invokeMock).toHaveBeenCalledWith('wechat_create_draft', {
      article: expect.objectContaining({
        title: 'Draft title',
        thumbMediaId: 'thumb-1',
        showCoverPic: 1,
        contentSourceUrl: 'https://example.com/source',
        needOpenComment: 1,
        onlyFansCanComment: 0,
      }),
    })
    expect(result.mediaId).toBe('draft-1')
    expect(result.articleCount).toBe(1)
  })

  it('publishes a draft by rewriting article images and using a real thumbMediaId', async () => {
    invokeMock
      .mockResolvedValueOnce({
        remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/uploaded-body/640',
      })
      .mockResolvedValueOnce({
        mediaId: 'draft-media-1',
        articleCount: 1,
      })

    const result = await publishWechatDraft({
      title: '真实草稿',
      contentHtml: '<p><img src="https://example.com/body.png" alt="body"></p>',
      thumbMediaId: 'thumb-media-1',
      showCoverPic: 1,
    })

    expect(invokeMock).toHaveBeenNthCalledWith(1, 'wechat_upload_article_image', {
      input: expect.objectContaining({
        remoteUrl: 'https://example.com/body.png',
      }),
    })
    expect(invokeMock).toHaveBeenNthCalledWith(2, 'wechat_create_draft', {
      article: expect.objectContaining({
        title: '真实草稿',
        thumbMediaId: 'thumb-media-1',
        showCoverPic: 1,
        content: expect.stringContaining('https://mmbiz.qpic.cn/mmbiz_png/uploaded-body/640'),
      }),
    })
    expect(result.mediaId).toBe('draft-media-1')
    expect(result.thumbMediaId).toBe('thumb-media-1')
    expect(result.uploadedImageCount).toBe(1)
    expect(result.uploadedContentHtml).not.toContain('https://example.com/body.png')
  })

  it('refuses draft publishing without either a thumbMediaId or a cover image', async () => {
    await expect(publishWechatDraft({
      title: '真实草稿',
      contentHtml: '<p><img src="https://example.com/body.png" alt="body"></p>',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('validates draft metadata before uploading article images', async () => {
    await expect(publishWechatDraft({
      title: '超长标题'.repeat(11),
      contentHtml: '<p><img src="https://example.com/body.png" alt="body"></p>',
      thumbMediaId: 'thumb-media-1',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('does not upload a permanent cover before rewritten draft content passes validation', async () => {
    invokeMock.mockResolvedValueOnce({
      remoteUrl: 'https://example.com/not-wechat-after-upload.png',
    })

    await expect(publishWechatDraft({
      title: '真实草稿',
      contentHtml: '<p><img src="https://example.com/body.png" alt="body"></p>',
      coverImage: {
        src: 'https://example.com/cover.png',
        resolvedUrl: 'https://example.com/cover.png',
        mimeType: 'image/png',
      },
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenCalledWith('wechat_upload_article_image', {
      input: expect.objectContaining({
        remoteUrl: 'https://example.com/body.png',
      }),
    })
  })

  it('describes configured and missing credential states', () => {
    expect(describeWechatPublishStatus({
      configured: true,
      missingKeys: [],
      source: 'env.local',
      appIdHint: 'wx12***34',
    })).toContain('inkforge/.env.local')

    expect(describeWechatPublishStatus({
      configured: false,
      missingKeys: ['WECHAT_APP_SECRET'],
      source: 'none',
      appIdHint: null,
    })).toContain('不要使用 VITE_ 前缀')
  })
})
