import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveImage, resolveInkforgeAsset } from './asset-resolver'
import { extractFromDataUrl } from './dimension-extractor'
import { NotImplementedError } from './types'
import { WechatUploader } from './uploaders/wechat'
import { ZhihuUploader } from './uploaders/zhihu-stub'
import { XiaohongshuUploader } from './uploaders/xhs-stub'

const uploadWechatArticleImageMock = vi.fn()

vi.mock('@/services/export/wechat-publish', () => ({
    uploadWechatArticleImage: (image: unknown) => uploadWechatArticleImageMock(image),
}))

const TINY_PNG_1X1_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg=='

describe('resolveInkforgeAsset', () => {
    it('returns the registered URL when the id is in the registry', () => {
        const registry = new Map<string, string>([['abc123', 'file:///tmp/abc123.png']])
        expect(resolveInkforgeAsset('inkforge-asset://abc123', registry)).toBe('file:///tmp/abc123.png')
    })

    it('throws when the id is missing from the registry', () => {
        const registry = new Map<string, string>()
        expect(() => resolveInkforgeAsset('inkforge-asset://missing', registry)).toThrow(
            /Asset not found in registry: missing/,
        )
    })

    it('throws when the URL is not an inkforge-asset URL', () => {
        const registry = new Map<string, string>()
        expect(() => resolveInkforgeAsset('https://example.com/x.png', registry)).toThrow(
            /Not an inkforge-asset URL/,
        )
    })
})

describe('resolveImage', () => {
    it('passes external https URLs through untouched', () => {
        const registry = new Map<string, string>()
        const ref = { src: 'https://example.com/img.png', alt: 'demo', width: 100, height: 50 }
        const result = resolveImage(ref, registry)
        expect(result.resolvedUrl).toBe('https://example.com/img.png')
        expect(result.alt).toBe('demo')
        expect(result.width).toBe(100)
        expect(result.height).toBe(50)
        expect(result.mimeType).toBe('image/png')
    })

    it('resolves inkforge-asset URLs through the registry', () => {
        const registry = new Map<string, string>([['xyz', 'blob:http://localhost/xyz']])
        const result = resolveImage({ src: 'inkforge-asset://xyz' }, registry)
        expect(result.resolvedUrl).toBe('blob:http://localhost/xyz')
    })
})

describe('extractFromDataUrl', () => {
    it('parses a 1x1 PNG dataUrl into width=1, height=1, mime=image/png', () => {
        const dataUrl = `data:image/png;base64,${TINY_PNG_1X1_BASE64}`
        const dims = extractFromDataUrl(dataUrl)
        expect(dims).not.toBeNull()
        expect(dims?.width).toBe(1)
        expect(dims?.height).toBe(1)
        expect(dims?.mime).toBe('image/png')
    })

    it('returns null for non-data URLs', () => {
        expect(extractFromDataUrl('https://example.com/x.png')).toBeNull()
    })

    it('returns null for unsupported binary content', () => {
        // "hello" base64 — not a recognized image header
        const dataUrl = 'data:application/octet-stream;base64,aGVsbG8='
        expect(extractFromDataUrl(dataUrl)).toBeNull()
    })
})

describe('uploader integrations', () => {
    beforeEach(() => {
        uploadWechatArticleImageMock.mockReset()
    })

    it('WechatUploader.upload delegates to the real WeChat publish service', async () => {
        const uploader = new WechatUploader()
        uploadWechatArticleImageMock.mockResolvedValue({
            remoteUrl: 'https://mmbiz.qpic.cn/demo-uploaded/640',
            uploadedAt: '2026-05-16T00:00:00.000Z',
        })

        await expect(
            uploader.upload({ src: 'https://example.com/x.png', resolvedUrl: 'https://example.com/x.png' }),
        ).resolves.toEqual({
            remoteUrl: 'https://mmbiz.qpic.cn/demo-uploaded/640',
            uploadedAt: '2026-05-16T00:00:00.000Z',
        })

        expect(uploadWechatArticleImageMock).toHaveBeenCalledWith({
            src: 'https://example.com/x.png',
            resolvedUrl: 'https://example.com/x.png',
        })
    })

    it('ZhihuUploader.upload throws NotImplementedError', async () => {
        const uploader = new ZhihuUploader()
        await expect(
            uploader.upload({ src: 'https://example.com/x.png', resolvedUrl: 'https://example.com/x.png' }),
        ).rejects.toBeInstanceOf(NotImplementedError)
    })

    it('XiaohongshuUploader.upload throws NotImplementedError', async () => {
        const uploader = new XiaohongshuUploader()
        await expect(
            uploader.upload({ src: 'https://example.com/x.png', resolvedUrl: 'https://example.com/x.png' }),
        ).rejects.toBeInstanceOf(NotImplementedError)
    })
})
