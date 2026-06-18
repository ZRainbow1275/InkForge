import { extractFromDataUrl } from './dimension-extractor'
import type {
    XhsImageArtifactFormat,
    XhsImageArtifactKind,
    XhsImageArtifactLimits,
    XhsImageArtifactManifest,
    XhsImageArtifactRatio,
    XhsImageCropStatus,
    ZhihuImageArtifact,
    ZhihuImageArtifactFormat,
    ZhihuImageArtifactKind,
    ZhihuImageArtifactManifest,
    ZhihuImageHostStatus,
} from './types'

export interface XhsRasterArtifactManifestOptions {
    kind?: XhsImageArtifactKind
    page?: number
    fileName: string
    src: string
    dataUrl?: string
    width?: number
    height?: number
    ratio?: XhsImageArtifactRatio
    format?: XhsImageArtifactFormat
    bytes?: number
    exists?: boolean
    cover?: boolean
    referencedByBody?: boolean
    bodyReferences?: readonly number[]
    cropStatus: XhsImageCropStatus
    limits?: XhsImageArtifactLimits
}

export interface ZhihuImageArtifactManifestItemInput {
    id: string
    kind: ZhihuImageArtifactKind
    sourceSrc: string
    finalSrc: string
    fileName?: string
    exists?: boolean
    uploaded?: boolean
    hostStatus?: ZhihuImageHostStatus
    width?: number
    height?: number
    format?: ZhihuImageArtifactFormat
    bytes?: number
    alt: string
    caption?: string
    textFallback?: boolean
    referencedByMarkdown?: boolean
}

export interface ZhihuImageArtifactManifestOptions {
    artifacts: readonly ZhihuImageArtifactManifestItemInput[]
    markdownReferences?: readonly string[]
    requirePlatformUpload?: boolean
    allowedFormats?: readonly ZhihuImageArtifactFormat[]
}

export function getDataUrlByteLength(dataUrl: string): number | null {
    if (!dataUrl.startsWith('data:')) return null
    const commaIdx = dataUrl.indexOf(',')
    if (commaIdx < 0) return null
    const header = dataUrl.slice(5, commaIdx)
    if (!header.includes(';base64')) return null

    const payload = dataUrl.slice(commaIdx + 1).replace(/\s/g, '')
    if (!payload) return null
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

export function inferXhsImageArtifactFormat(input: {
    mime?: string
    fileName?: string
    src?: string
}): XhsImageArtifactFormat | null {
    const candidates = [input.mime, input.fileName, input.src]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(value => value.toLowerCase().split(/[?#]/)[0])

    for (const candidate of candidates) {
        if (candidate.includes('image/png') || candidate.endsWith('.png')) return 'png'
        if (candidate.includes('image/jpeg') || candidate.endsWith('.jpg')) return 'jpg'
        if (candidate.endsWith('.jpeg')) return 'jpeg'
    }

    return null
}

export function inferZhihuImageArtifactFormat(input: {
    mime?: string
    fileName?: string
    src?: string
}): ZhihuImageArtifactFormat | null {
    const candidates = [input.mime, input.fileName, input.src]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(value => value.toLowerCase().split(/[?#]/)[0])

    for (const candidate of candidates) {
        if (candidate.includes('image/png') || candidate.endsWith('.png')) return 'png'
        if (candidate.includes('image/jpeg') || candidate.endsWith('.jpg')) return 'jpg'
        if (candidate.endsWith('.jpeg')) return 'jpeg'
        if (candidate.includes('image/gif') || candidate.endsWith('.gif')) return 'gif'
    }

    return null
}

export function inferXhsImageArtifactRatio(width: number, height: number): XhsImageArtifactRatio | null {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
    const ratio = width / height
    if (Math.abs(ratio - 1) < 0.001) return '1:1'
    if (Math.abs(ratio - 0.75) < 0.001) return '3:4'
    return null
}

export function inferZhihuImageHostStatus(src: string): ZhihuImageHostStatus {
    const value = src.trim()
    if (!value) return 'missing'
    if (/^(?:blob:|data:|file:)/i.test(value)) return 'local-only'
    if (/^(?:\.{1,2}\/|\/|[a-z]:\\|[a-z]:\/)/i.test(value)) return 'local-only'

    let url: URL
    try {
        url = new URL(value)
    } catch {
        return 'blocked'
    }

    if (url.protocol !== 'https:') return 'blocked'

    const host = url.hostname.toLowerCase()
    if (isLocalOrPrivateHost(host)) return 'local-only'
    if (isWechatImageHost(host)) return 'blocked'
    if (/^(?:picx|pic\d*)\.zhimg\.com$/i.test(host)) return 'platform-hosted'

    return 'public-https'
}

export function createXhsImageArtifactManifestFromRaster(
    options: XhsRasterArtifactManifestOptions,
): XhsImageArtifactManifest {
    const dimensions = options.dataUrl ? extractFromDataUrl(options.dataUrl) : null
    const width = normalizePositiveNumber(options.width ?? dimensions?.width, 'width')
    const height = normalizePositiveNumber(options.height ?? dimensions?.height, 'height')
    const ratio = options.ratio ?? inferXhsImageArtifactRatio(width, height)
    if (!ratio) {
        throw new Error(`Unable to infer supported XHS image ratio from ${width}x${height}`)
    }

    const format = options.format ?? inferXhsImageArtifactFormat({
        mime: dimensions?.mime,
        fileName: options.fileName,
        src: options.src,
    })
    if (!format) {
        throw new Error(`Unable to infer supported XHS image format for ${options.fileName}`)
    }

    const bytes = normalizePositiveNumber(
        options.bytes ?? (options.dataUrl ? getDataUrlByteLength(options.dataUrl) ?? undefined : undefined),
        'bytes',
    )
    const page = normalizePositiveInteger(options.page ?? 1, 'page')
    const referencedByBody = options.referencedByBody ?? true
    const bodyReferences = [...(options.bodyReferences ?? (referencedByBody ? [page] : []))]

    return {
        kind: options.kind ?? 'image-page',
        pages: [
            {
                page,
                fileName: options.fileName,
                src: options.src,
                exists: options.exists ?? Boolean(options.dataUrl),
                width,
                height,
                ratio,
                format,
                bytes,
                cover: options.cover ?? page === 1,
                referencedByBody,
                cropStatus: options.cropStatus,
            },
        ],
        bodyReferences,
        ...(options.limits ? { limits: options.limits } : {}),
    }
}

export function createZhihuImageArtifactManifest(
    options: ZhihuImageArtifactManifestOptions,
): ZhihuImageArtifactManifest {
    if (options.artifacts.length === 0) {
        throw new Error('Zhihu image artifact manifest must contain at least one artifact')
    }

    const artifacts = options.artifacts.map(artifact =>
        createZhihuImageArtifact(artifact, options.requirePlatformUpload === true),
    )
    const markdownReferences = options.markdownReferences
        ? [...options.markdownReferences]
        : artifacts
            .filter(artifact => artifact.referencedByMarkdown !== false)
            .map(artifact => artifact.finalSrc)

    return {
        artifacts,
        markdownReferences,
        ...(options.requirePlatformUpload !== undefined ? { requirePlatformUpload: options.requirePlatformUpload } : {}),
        ...(options.allowedFormats ? { allowedFormats: [...options.allowedFormats] } : {}),
    }
}

function createZhihuImageArtifact(
    input: ZhihuImageArtifactManifestItemInput,
    requirePlatformUpload: boolean,
): ZhihuImageArtifact {
    const finalSrc = normalizeNonEmptyString(input.finalSrc, 'finalSrc')
    const inferredHostStatus = inferZhihuImageHostStatus(finalSrc)
    const hostStatus = input.hostStatus ?? inferredHostStatus
    if (input.hostStatus && input.hostStatus !== inferredHostStatus) {
        throw new Error(`Zhihu image artifact hostStatus ${input.hostStatus} does not match ${finalSrc}`)
    }

    const uploaded = input.uploaded ?? false
    if (uploaded && hostStatus !== 'platform-hosted') {
        throw new Error('Zhihu uploaded proof requires a platform-hosted finalSrc')
    }
    if (requirePlatformUpload && (hostStatus !== 'platform-hosted' || uploaded !== true)) {
        throw new Error('Zhihu platform-upload manifest requires uploaded platform-hosted artifacts')
    }

    const format = input.format ?? inferZhihuImageArtifactFormat({
        fileName: input.fileName,
        src: finalSrc,
    })
    if (!format) {
        throw new Error(`Unable to infer supported Zhihu image format for ${finalSrc}`)
    }

    const exists = uploaded ? input.exists : normalizeRequiredTrue(input.exists, 'exists')
    const bytes = uploaded
        ? normalizeOptionalPositiveNumber(input.bytes, 'bytes')
        : normalizePositiveNumber(input.bytes, 'bytes')
    const width = normalizeOptionalPositiveNumber(input.width, 'width')
    const height = normalizeOptionalPositiveNumber(input.height, 'height')
    const fileName = normalizeOptionalNonEmptyString(input.fileName, 'fileName')
    const caption = normalizeOptionalNonEmptyString(input.caption, 'caption')
    const alt = normalizeNonEmptyString(input.alt, 'alt')

    if (isSemanticZhihuArtifact(input.kind, alt) && !caption && input.textFallback !== true) {
        throw new Error('Zhihu semantic image artifacts require caption or textFallback')
    }

    return {
        id: normalizeNonEmptyString(input.id, 'id'),
        kind: input.kind,
        sourceSrc: normalizeNonEmptyString(input.sourceSrc, 'sourceSrc'),
        finalSrc,
        hostStatus,
        uploaded,
        format,
        alt,
        ...(fileName ? { fileName } : {}),
        ...(exists !== undefined ? { exists } : {}),
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
        ...(bytes !== undefined ? { bytes } : {}),
        ...(caption ? { caption } : {}),
        ...(input.textFallback !== undefined ? { textFallback: input.textFallback } : {}),
        ...(input.referencedByMarkdown !== undefined ? { referencedByMarkdown: input.referencedByMarkdown } : {}),
    }
}

function normalizePositiveNumber(value: number | undefined, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`XHS raster artifact ${field} must be a positive number`)
    }
    return value
}

function normalizeOptionalPositiveNumber(value: number | undefined, field: string): number | undefined {
    if (value === undefined) return undefined
    return normalizePositiveNumber(value, field)
}

function normalizePositiveInteger(value: number, field: string): number {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`XHS raster artifact ${field} must be a positive integer`)
    }
    return value
}

function normalizeRequiredTrue(value: boolean | undefined, field: string): true {
    if (value !== true) {
        throw new Error(`Zhihu image artifact ${field} must be true for local preflight artifacts`)
    }
    return true
}

function normalizeNonEmptyString(value: string, field: string): string {
    const trimmed = value.trim()
    if (!trimmed) {
        throw new Error(`Zhihu image artifact ${field} must be a non-empty string`)
    }
    return trimmed
}

function normalizeOptionalNonEmptyString(value: string | undefined, field: string): string | undefined {
    if (value === undefined) return undefined
    return normalizeNonEmptyString(value, field)
}

function isLocalOrPrivateHost(host: string): boolean {
    return host === 'localhost'
        || host === '[::1]'
        || host.endsWith('.local')
        || /^127\./.test(host)
        || host === '0.0.0.0'
        || /^10\./.test(host)
        || /^192\.168\./.test(host)
        || /^172\.(?:1[6-9]|2\d|3[0-1])\./.test(host)
}

function isWechatImageHost(host: string): boolean {
    return host === 'mmbiz.qpic.cn'
        || host === 'mmbiz.qlogo.cn'
        || host === 'res.wx.qq.com'
}

function isSemanticZhihuArtifact(kind: ZhihuImageArtifactKind, alt: string): boolean {
    return kind === 'formula-image'
        || kind === 'diagram-image'
        || kind === 'table-image'
        || /(?:公式|方程|图表|流程|架构|表格|数据|统计|截图|示意|diagram|chart|graph|mermaid|plantuml|vega|equation|formula|table|architecture|flow)/i.test(alt)
}
