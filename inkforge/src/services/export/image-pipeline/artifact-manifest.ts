import { extractFromDataUrl } from './dimension-extractor'
import type {
    XhsImageArtifactFormat,
    XhsImageArtifactKind,
    XhsImageArtifactLimits,
    XhsImageArtifactManifest,
    XhsImageArtifactRatio,
    XhsImageCropStatus,
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

export function inferXhsImageArtifactRatio(width: number, height: number): XhsImageArtifactRatio | null {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
    const ratio = width / height
    if (Math.abs(ratio - 1) < 0.001) return '1:1'
    if (Math.abs(ratio - 0.75) < 0.001) return '3:4'
    return null
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

function normalizePositiveNumber(value: number | undefined, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new Error(`XHS raster artifact ${field} must be a positive number`)
    }
    return value
}

function normalizePositiveInteger(value: number, field: string): number {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`XHS raster artifact ${field} must be a positive integer`)
    }
    return value
}
