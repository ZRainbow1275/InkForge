import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveImage, resolveInkforgeAsset } from './asset-resolver'
import { extractFromDataUrl } from './dimension-extractor'
import {
    createXhsImageArtifactManifestFromRaster,
    createZhihuImageArtifactManifest,
    getDataUrlByteLength,
    inferXhsImageArtifactFormat,
    inferXhsImageArtifactRatio,
    inferZhihuImageArtifactFormat,
    inferZhihuImageHostStatus,
} from './artifact-manifest'
import { NotImplementedError } from './types'
import { WechatUploader } from './uploaders/wechat'
import { ZhihuUploader } from './uploaders/zhihu-stub'
import { XiaohongshuUploader } from './uploaders/xhs-stub'
import { validateXhsImageArtifactManifest, validateZhihuImageArtifactManifest } from '../quality-detector'

const uploadWechatArticleImageMock = vi.fn()

vi.mock('@/services/export/wechat-publish', () => ({
    uploadWechatArticleImage: (image: unknown) => uploadWechatArticleImageMock(image),
}))

const TINY_PNG_1X1_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg=='
const TINY_PNG_1X1_BYTES = 70

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

describe('XHS raster artifact manifests', () => {
    it('computes bytes from base64 data URLs without decoding through mock file metadata', () => {
        const dataUrl = `data:image/png;base64,${TINY_PNG_1X1_BASE64}`
        expect(getDataUrlByteLength(dataUrl)).toBe(TINY_PNG_1X1_BYTES)
        expect(getDataUrlByteLength('https://example.com/cover.png')).toBeNull()
    })

    it('infers Xiaohongshu-supported image format and ratio from real artifact metadata', () => {
        expect(inferXhsImageArtifactFormat({ mime: 'image/png' })).toBe('png')
        expect(inferXhsImageArtifactFormat({ fileName: 'cover.jpeg' })).toBe('jpeg')
        expect(inferXhsImageArtifactRatio(1080, 1440)).toBe('3:4')
        expect(inferXhsImageArtifactRatio(1080, 1080)).toBe('1:1')
        expect(inferXhsImageArtifactRatio(1200, 800)).toBeNull()
    })

    it('builds a validator-clean manifest from a generated PNG data URL', () => {
        const dataUrl = `data:image/png;base64,${TINY_PNG_1X1_BASE64}`
        const manifest = createXhsImageArtifactManifestFromRaster({
            fileName: 'cover.png',
            src: 'inkforge-asset://cover',
            dataUrl,
            cropStatus: 'ok',
        })

        expect(manifest).toMatchObject({
            kind: 'image-page',
            bodyReferences: [1],
            pages: [
                {
                    page: 1,
                    fileName: 'cover.png',
                    src: 'inkforge-asset://cover',
                    exists: true,
                    width: 1,
                    height: 1,
                    ratio: '1:1',
                    format: 'png',
                    cover: true,
                    referencedByBody: true,
                    cropStatus: 'ok',
                },
            ],
        })
        expect(manifest.pages[0]?.bytes).toBe(TINY_PNG_1X1_BYTES)
        expect(validateXhsImageArtifactManifest(manifest)).toEqual([])
    })

    it('builds a validator-clean manifest from an exported local raster file record', () => {
        const manifest = createXhsImageArtifactManifestFromRaster({
            fileName: 'cover-grid.png',
            src: 'inkforge-asset://cover-grid',
            width: 1080,
            height: 1440,
            format: 'png',
            bytes: 99_114,
            exists: true,
            cropStatus: 'ok',
        })

        expect(manifest.pages[0]).toMatchObject({
            width: 1080,
            height: 1440,
            ratio: '3:4',
            format: 'png',
            bytes: 99_114,
            exists: true,
        })
        expect(validateXhsImageArtifactManifest(manifest)).toEqual([])
    })

    it('rejects incomplete raster metadata instead of fabricating a manifest pass', () => {
        expect(() =>
            createXhsImageArtifactManifestFromRaster({
                fileName: 'cover.webp',
                src: 'inkforge-asset://cover',
                width: 1200,
                height: 800,
                bytes: 10_000,
                exists: true,
                cropStatus: 'ok',
            }),
        ).toThrow(/Unable to infer supported XHS image ratio/)

        expect(() =>
            createXhsImageArtifactManifestFromRaster({
                fileName: 'cover.png',
                src: 'inkforge-asset://cover',
                width: 1080,
                height: 1440,
                exists: true,
                cropStatus: 'ok',
            }),
        ).toThrow(/bytes must be a positive number/)
    })
})

describe('Zhihu image artifact manifests', () => {
    it('infers Zhihu-supported image formats and host status from final artifact URLs', () => {
        expect(inferZhihuImageArtifactFormat({ mime: 'image/gif' })).toBe('gif')
        expect(inferZhihuImageArtifactFormat({ fileName: 'diagram.jpeg' })).toBe('jpeg')
        expect(inferZhihuImageArtifactFormat({ src: 'https://static.example.com/table.png?x=1' })).toBe('png')
        expect(inferZhihuImageArtifactFormat({ src: 'https://static.example.com/table.webp' })).toBeNull()

        expect(inferZhihuImageHostStatus('https://picx.zhimg.com/v2-diagram.png')).toBe('platform-hosted')
        expect(inferZhihuImageHostStatus('https://cdn.example.com/diagram.png')).toBe('public-https')
        expect(inferZhihuImageHostStatus('blob:http://localhost/diagram')).toBe('local-only')
        expect(inferZhihuImageHostStatus('http://cdn.example.com/diagram.png')).toBe('blocked')
        expect(inferZhihuImageHostStatus('https://mmbiz.qpic.cn/wechat.png')).toBe('blocked')
        expect(inferZhihuImageHostStatus('')).toBe('missing')
    })

    it('builds a validator-clean public HTTPS fallback manifest from local file metadata', () => {
        const finalSrc = 'https://static.example.com/inkforge-diagram.png'
        const manifest = createZhihuImageArtifactManifest({
            artifacts: [
                {
                    id: 'diagram-1',
                    kind: 'diagram-image',
                    sourceSrc: 'inkforge-asset://diagram-1',
                    finalSrc,
                    fileName: 'inkforge-diagram.png',
                    exists: true,
                    width: 1200,
                    height: 720,
                    bytes: 98_000,
                    alt: '架构图',
                    caption: '图 1: 架构图说明',
                    referencedByMarkdown: true,
                },
            ],
        })

        expect(manifest).toMatchObject({
            markdownReferences: [finalSrc],
            artifacts: [
                {
                    id: 'diagram-1',
                    hostStatus: 'public-https',
                    uploaded: false,
                    exists: true,
                    format: 'png',
                    bytes: 98_000,
                    referencedByMarkdown: true,
                },
            ],
        })
        expect(validateZhihuImageArtifactManifest(manifest)).toEqual([])
    })

    it('builds a validator-clean platform-upload manifest only when upload proof is explicit', () => {
        const finalSrc = 'https://picx.zhimg.com/v2-inkforge-figure.png'
        const manifest = createZhihuImageArtifactManifest({
            requirePlatformUpload: true,
            artifacts: [
                {
                    id: 'figure-1',
                    kind: 'inline-image',
                    sourceSrc: 'inkforge-asset://figure-1',
                    finalSrc,
                    uploaded: true,
                    width: 1280,
                    height: 720,
                    alt: '配图',
                    referencedByMarkdown: true,
                },
            ],
        })

        expect(manifest.artifacts[0]).toMatchObject({
            hostStatus: 'platform-hosted',
            uploaded: true,
            format: 'png',
        })
        expect(validateZhihuImageArtifactManifest(manifest)).toEqual([])
    })

    it('rejects unsafe Zhihu metadata instead of fabricating public host or upload proof', () => {
        expect(() =>
            createZhihuImageArtifactManifest({
                artifacts: [
                    {
                        id: 'diagram-1',
                        kind: 'diagram-image',
                        sourceSrc: 'inkforge-asset://diagram-1',
                        finalSrc: 'blob:http://localhost/diagram',
                        hostStatus: 'public-https',
                        exists: true,
                        bytes: 10_000,
                        alt: '架构图',
                        caption: '图 1: 架构图说明',
                    },
                ],
            }),
        ).toThrow(/hostStatus public-https does not match/)

        expect(() =>
            createZhihuImageArtifactManifest({
                requirePlatformUpload: true,
                artifacts: [
                    {
                        id: 'diagram-1',
                        kind: 'diagram-image',
                        sourceSrc: 'inkforge-asset://diagram-1',
                        finalSrc: 'https://picx.zhimg.com/v2-diagram.png',
                        exists: true,
                        bytes: 10_000,
                        alt: '架构图',
                        caption: '图 1: 架构图说明',
                    },
                ],
            }),
        ).toThrow(/requires uploaded platform-hosted artifacts/)

        expect(() =>
            createZhihuImageArtifactManifest({
                artifacts: [
                    {
                        id: 'diagram-1',
                        kind: 'diagram-image',
                        sourceSrc: 'inkforge-asset://diagram-1',
                        finalSrc: 'https://static.example.com/diagram.png',
                        exists: true,
                        alt: '架构图',
                        caption: '图 1: 架构图说明',
                    },
                ],
            }),
        ).toThrow(/bytes must be a positive number/)
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
