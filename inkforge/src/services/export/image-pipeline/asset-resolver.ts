import type { ImageRef, ResolvedImage } from './types'

const INKFORGE_ASSET_PREFIX = 'inkforge-asset://'

export function resolveInkforgeAsset(src: string, registry: Map<string, string>): string {
    if (!src.startsWith(INKFORGE_ASSET_PREFIX)) {
        throw new Error(`Not an inkforge-asset URL: ${src}`)
    }
    const id = src.slice(INKFORGE_ASSET_PREFIX.length)
    const url = registry.get(id)
    if (!url) {
        throw new Error(`Asset not found in registry: ${id}`)
    }
    return url
}

function inferMimeFromUrl(url: string): string | undefined {
    if (url.startsWith('data:')) {
        const match = /^data:([^;,]+)[;,]/.exec(url)
        return match?.[1]
    }
    const lower = url.toLowerCase().split(/[?#]/)[0]
    if (lower.endsWith('.png')) return 'image/png'
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
    if (lower.endsWith('.webp')) return 'image/webp'
    if (lower.endsWith('.gif')) return 'image/gif'
    if (lower.endsWith('.svg')) return 'image/svg+xml'
    return undefined
}

export function resolveImage(ref: ImageRef, registry: Map<string, string>): ResolvedImage {
    const { src } = ref
    if (src.startsWith(INKFORGE_ASSET_PREFIX)) {
        const resolvedUrl = resolveInkforgeAsset(src, registry)
        return {
            ...ref,
            resolvedUrl,
            mimeType: inferMimeFromUrl(resolvedUrl),
        }
    }
    return {
        ...ref,
        resolvedUrl: src,
        mimeType: inferMimeFromUrl(src),
    }
}
