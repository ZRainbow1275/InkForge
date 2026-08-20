/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ErrorCode } from '@/services/error'

import {
  approveWechatDraftPublishPlan,
  createWechatDraft,
  describeWechatPublishStatus,
  getWechatPublishStatus,
  isWechatHostedContentImageUrl,
  planWechatDraftPublish,
  publishWechatDraft,
  rewriteWechatArticleImages,
  uploadWechatCoverImage,
  uploadWechatArticleImage,
} from './wechat-publish'
import type {
  WechatDraftPublishApproval,
  WechatDraftPublishInput,
  WechatDraftPublishPlan,
} from './wechat-publish'

const invokeMock = vi.fn()
const isTauriEnvMock = vi.fn<() => boolean>()
const resolveAssetSnapshotMock = vi.fn()
const COVER_HANDLE = 'a'.repeat(32)

function approvePlan(plan: WechatDraftPublishPlan): WechatDraftPublishApproval {
  return approveWechatDraftPublishPlan(plan, {
    targetMatched: true,
    verificationMethod: 'visible-editor-confirmation',
    approvedSideEffectUpperBounds: { ...plan.sideEffectUpperBounds },
  })
}

async function planEligibleDraft(input: WechatDraftPublishInput): Promise<WechatDraftPublishPlan> {
  const plan = await planWechatDraftPublish(input)
  expect(plan.eligible).toBe(true)
  return plan
}

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
      coverHandle: COVER_HANDLE,
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
      coverHandle: COVER_HANDLE,
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

  it('rejects any raw media id field returned across the Rust-to-Web boundary', async () => {
    invokeMock.mockResolvedValue({
      remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/demo-uploaded/640',
      coverHandle: COVER_HANDLE,
      mediaId: 'raw-private-cover-id',
    })

    await expect(uploadWechatCoverImage({
      src: 'https://example.com/cover.png',
      resolvedUrl: 'https://example.com/cover.png',
      mimeType: 'image/png',
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.UNKNOWN_ERROR,
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

  it('plans unique uploads without invoking Tauri and counts WeChat-hosted images as zero uploads', async () => {
    const input: WechatDraftPublishInput = {
      title: '本地预检',
      contentHtml: [
        '<p><img src="https://example.com/a.png" alt="a"></p>',
        '<p><img src="https://example.com/a.png" alt="duplicate"></p>',
        '<p><img src="https://mmbiz.qpic.cn/mmbiz_png/kept/640" alt="hosted"></p>',
      ].join(''),
    }

    const plan = await planWechatDraftPublish(input)

    expect(plan).toMatchObject({
      eligible: true,
      reasons: [],
      images: {
        uniqueNonWechatImageCount: 1,
        uniqueWechatHostedImageCount: 1,
        preparedArticleUploadCount: 1,
      },
      cover: { state: 'upload-required' },
      sideEffectUpperBounds: {
        draftCreates: 1,
        articleImageUploads: 1,
        permanentCoverUploads: 1,
      },
    })
    expect(plan.inputFingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(plan.planFingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('collects deterministic image failures after a valid first cover without invoking Tauri', async () => {
    const plan = await planWechatDraftPublish({
      title: '本地预检失败',
      contentHtml: [
        '<img src="https://example.com/valid.png">',
        '<img src="https://example.com/invalid.webp">',
        '<img src="file:///private/not-supported.png">',
        '<img srcset="https://example.com/srcset-only.png 1x">',
        '<img src="https://mmbiz.qpic.cn/mmbiz_png/kept/640">',
      ].join(''),
    })

    expect(plan.eligible).toBe(false)
    expect(plan.reasons.map(reason => reason.code)).toContain('article-image-invalid')
    expect(plan.images).toMatchObject({
      uniqueNonWechatImageCount: 3,
      uniqueWechatHostedImageCount: 1,
      preparedArticleUploadCount: 1,
    })
    expect(plan.cover.state).toBe('upload-required')
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('rejects malformed remote URLs and SVG query sources after a valid image without invoking Tauri', async () => {
    const plan = await planWechatDraftPublish({
      title: '静态来源预检',
      contentHtml: [
        '<img src="https://example.com/valid.png">',
        '<img src="https://">',
        '<img src="https://example.com/diagram.svg?cache=1">',
      ].join(''),
    })

    expect(plan.eligible).toBe(false)
    expect(plan.reasons.map(reason => reason.code)).toContain('article-image-invalid')
    expect(plan.images.preparedArticleUploadCount).toBe(1)
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('rejects invalid draft option flags before any prepared upload can mutate WeChat', async () => {
    const plan = await planWechatDraftPublish({
      title: '选项预检',
      contentHtml: '<img src="https://example.com/valid.png">',
      showCoverPic: 2 as 0 | 1,
    })

    expect(plan.eligible).toBe(false)
    expect(plan.reasons.map(reason => reason.code)).toContain('metadata-invalid')
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('requires the same approved plan before the first Tauri invoke', async () => {
    const input: WechatDraftPublishInput = {
      title: '授权门禁',
      contentHtml: '<img src="https://example.com/body.png">',
      coverHandle: COVER_HANDLE,
    }
    const plan = await planEligibleDraft(input)

    const copiedApproval = { ...approvePlan(plan) }
    await expect(publishWechatDraft(input, plan, copiedApproval)).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    })

    await expect((publishWechatDraft as unknown as (
      value: WechatDraftPublishInput,
      currentPlan: WechatDraftPublishPlan,
    ) => Promise<unknown>)(input, plan)).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(publishWechatDraft(input, plan, {
      ...approvePlan(plan),
      planFingerprint: 'b'.repeat(64),
    })).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(publishWechatDraft(input, plan, {
      ...approvePlan(plan),
      approvedSideEffectUpperBounds: {
        ...plan.sideEffectUpperBounds,
        articleImageUploads: plan.sideEffectUpperBounds.articleImageUploads + 1,
      },
    })).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(publishWechatDraft({ ...input, title: '输入已变化' }, plan, approvePlan(plan))).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    })

    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('rejects stale approval from an equivalent plan before the first Tauri invoke', async () => {
    const input: WechatDraftPublishInput = {
      title: '旧批准',
      contentHtml: '<img src="https://example.com/body.png">',
      coverHandle: COVER_HANDLE,
    }
    const firstPlan = await planEligibleDraft(input)
    const firstApproval = approvePlan(firstPlan)
    const secondPlan = await planEligibleDraft(input)

    expect(secondPlan).not.toBe(firstPlan)
    expect(secondPlan.planFingerprint).toBe(firstPlan.planFingerprint)
    await expect(publishWechatDraft(input, secondPlan, firstApproval)).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    })
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('reuses locally prepared asset bytes during approved execution', async () => {
    const dataUrl = 'data:image/png;base64,ZmFrZQ=='
    resolveAssetSnapshotMock.mockResolvedValue({
      assetId: 'asset-plan',
      status: 'inline-base64',
      mimeType: 'image/png',
      originalName: 'asset-plan.png',
      bytes: 4,
      dataUrl,
    })
    invokeMock
      .mockResolvedValueOnce({ remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/planned/640' })
      .mockResolvedValueOnce({ articleCount: 1 })
    const input: WechatDraftPublishInput = {
      title: '本地资产计划',
      contentHtml: '<img src="inkforge-asset://asset-plan" alt="planned">',
      coverHandle: COVER_HANDLE,
    }
    const plan = await planEligibleDraft(input)

    expect(resolveAssetSnapshotMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).not.toHaveBeenCalled()

    const approval = approvePlan(plan)
    await expect(publishWechatDraft(input, plan, approval)).resolves.toMatchObject({
      articleCount: 1,
      uploadedImageCount: 1,
    })
    expect(resolveAssetSnapshotMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenNthCalledWith(1, 'wechat_upload_article_image', {
      input: expect.objectContaining({ dataUrl }),
    })
    await expect(publishWechatDraft(input, plan, approval)).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    })
    expect(invokeMock).toHaveBeenCalledTimes(2)
  })

  it('removes stale srcset attributes while rewriting WeChat article images', async () => {
    invokeMock.mockResolvedValue({
      remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/replaced/640',
    })

    const rewritten = await rewriteWechatArticleImages(
      '<picture><source srcset="https://example.com/unplanned.png 1x">'
        + '<img src="https://example.com/a.png" srcset="https://example.com/a@2x.png 2x"></picture>'
        + '<p><img src="https://mmbiz.qpic.cn/mmbiz_png/kept/640" srcset="https://example.com/old.png 2x"></p>',
    )

    expect(rewritten.html).toContain('https://mmbiz.qpic.cn/mmbiz_png/replaced/640')
    expect(rewritten.html).not.toContain('srcset=')
    expect(rewritten.html).not.toContain('unplanned.png')
  })

  it('ignores an unused body cover candidate when an opaque cover handle exists', async () => {
    const plan = await planEligibleDraft({
      title: '已有封面句柄',
      contentHtml: '<img src="https://mmbiz.qpic.cn/body.webp">',
      coverHandle: COVER_HANDLE,
    })

    expect(plan.cover).toEqual({
      state: 'existing-handle-unverified',
      remoteValidityUnverified: true,
    })
    expect(plan.sideEffectUpperBounds.permanentCoverUploads).toBe(0)
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('uses the prepared draft option snapshot after asynchronous upload starts', async () => {
    let resolveUpload!: (value: { remoteUrl: string }) => void
    invokeMock
      .mockImplementationOnce(() => new Promise(resolve => { resolveUpload = resolve }))
      .mockResolvedValueOnce({ articleCount: 1 })
    const input: WechatDraftPublishInput = {
      title: '选项快照',
      contentHtml: '<img src="https://example.com/body.png">',
      coverHandle: COVER_HANDLE,
      showCoverPic: 0,
      needOpenComment: 0,
      onlyFansCanComment: 1,
    }
    const plan = await planEligibleDraft(input)
    const execution = publishWechatDraft(input, plan, approvePlan(plan))
    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1))

    input.showCoverPic = 1
    input.needOpenComment = 1
    input.onlyFansCanComment = 0
    resolveUpload({ remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/snapshot/640' })
    await execution

    expect(invokeMock).toHaveBeenNthCalledWith(2, 'wechat_create_draft', {
      article: expect.objectContaining({
        showCoverPic: 0,
        needOpenComment: 0,
        onlyFansCanComment: 1,
      }),
    })
  })

  it('blocks draft creation when content still references non-WeChat image hosts', async () => {
    await expect(createWechatDraft({
      title: 'Draft title',
      content: '<p><img src="https://example.com/not-uploaded.png"></p>',
      coverHandle: COVER_HANDLE,
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
      coverHandle: COVER_HANDLE,
    })).rejects.toMatchObject({
      name: 'AppError',
      code: ErrorCode.VALIDATION_ERROR,
    })
    await expect(createWechatDraft({
      title: 'Draft title',
      content: '<picture><source srcset="https://example.com/not-uploaded.png 1x"><img src="https://mmbiz.qpic.cn/ok.png"></picture>',
      coverHandle: COVER_HANDLE,
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
      coverHandle: COVER_HANDLE,
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
      coverHandle: COVER_HANDLE,
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
      digest: '摘'.repeat(121),
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

  it('normalizes camelCase article input before Tauri draft creation', async () => {
    invokeMock.mockResolvedValue({
      articleCount: 1,
    })

    const result = await createWechatDraft({
      title: '  Draft title  ',
      content: '<p><img src="https://mmbiz.qpic.cn/mmbiz_png/ok/640"></p>',
      coverHandle: `  ${COVER_HANDLE}  `,
      author: '   ',
      digest: `  ${'摘'.repeat(120)}  `,
      showCoverPic: 1,
      contentSourceUrl: '  https://example.com/source  ',
      needOpenComment: 1,
      onlyFansCanComment: 0,
    })

    expect(invokeMock).toHaveBeenCalledWith('wechat_create_draft', {
      article: expect.objectContaining({
        title: 'Draft title',
        coverHandle: COVER_HANDLE,
        digest: '摘'.repeat(120),
        showCoverPic: 1,
        contentSourceUrl: 'https://example.com/source',
        needOpenComment: 1,
        onlyFansCanComment: 0,
      }),
    })
    const invokedArticle = invokeMock.mock.calls[0]?.[1]?.article as Record<string, unknown>
    expect(invokedArticle).not.toHaveProperty('author')
    expect(result).not.toHaveProperty('mediaId')
    expect(result.articleCount).toBe(1)
  })

  it('publishes a draft by rewriting images and binding the first real image as an opaque cover handle', async () => {
    invokeMock
      .mockResolvedValueOnce({
        remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/uploaded-body/640',
      })
      .mockResolvedValueOnce({
        remoteUrl: 'https://mmbiz.qpic.cn/mmbiz_png/uploaded-cover/640',
        coverHandle: COVER_HANDLE,
      })
      .mockResolvedValueOnce({
        articleCount: 1,
      })

    const input: WechatDraftPublishInput = {
      title: '真实草稿',
      contentHtml: '<p><img src="https://example.com/body.png" alt="body"></p>',
      showCoverPic: 1,
    }
    const plan = await planEligibleDraft(input)
    expect(invokeMock).not.toHaveBeenCalled()
    const result = await publishWechatDraft(input, plan, approvePlan(plan))

    expect(invokeMock).toHaveBeenNthCalledWith(1, 'wechat_upload_article_image', {
      input: expect.objectContaining({
        remoteUrl: 'https://example.com/body.png',
      }),
    })
    expect(invokeMock).toHaveBeenNthCalledWith(2, 'wechat_upload_cover_image', {
      input: expect.objectContaining({
        remoteUrl: 'https://example.com/body.png',
      }),
    })
    expect(invokeMock).toHaveBeenNthCalledWith(3, 'wechat_create_draft', {
      article: expect.objectContaining({
        title: '真实草稿',
        coverHandle: COVER_HANDLE,
        showCoverPic: 1,
        content: expect.stringContaining('https://mmbiz.qpic.cn/mmbiz_png/uploaded-body/640'),
      }),
    })
    expect(result).not.toHaveProperty('mediaId')
    expect(result.coverHandle).toBe(COVER_HANDLE)
    expect(result.uploadedImageCount).toBe(1)
    expect(result.uploadedContentHtml).not.toContain('https://example.com/body.png')
  })

  it('refuses draft publishing when the article has no reusable handle or real cover image', async () => {
    const plan = await planWechatDraftPublish({
      title: '真实草稿',
      contentHtml: '<p>正文没有图片</p>',
    })

    expect(plan.eligible).toBe(false)
    expect(plan.reasons.map(reason => reason.code)).toContain('cover-image-missing')
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('validates draft metadata before uploading article images', async () => {
    const plan = await planWechatDraftPublish({
      title: '超长标题'.repeat(11),
      contentHtml: '<p><img src="https://example.com/body.png" alt="body"></p>',
      coverHandle: COVER_HANDLE,
    })

    expect(plan.eligible).toBe(false)
    expect(plan.reasons.map(reason => reason.code)).toContain('metadata-invalid')
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('does not upload a permanent cover before rewritten draft content passes validation', async () => {
    invokeMock.mockResolvedValueOnce({
      remoteUrl: 'https://example.com/not-wechat-after-upload.png',
    })

    const input: WechatDraftPublishInput = {
      title: '真实草稿',
      contentHtml: '<p><img src="https://example.com/body.png" alt="body"></p>',
      coverImage: {
        src: 'https://example.com/cover.png',
        resolvedUrl: 'https://example.com/cover.png',
        mimeType: 'image/png',
      },
    }
    const plan = await planEligibleDraft(input)

    await expect(publishWechatDraft(input, plan, approvePlan(plan))).rejects.toMatchObject({
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
