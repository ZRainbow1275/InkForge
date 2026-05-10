export const INKFORGE_ASSET_SCHEME = 'inkforge-asset://'

export function createInkforgeAssetUrl(assetId: string): string {
  const normalized = assetId.trim()
  if (!normalized) {
    throw new Error('Asset id is required')
  }

  return `${INKFORGE_ASSET_SCHEME}${encodeURIComponent(normalized)}`
}

export function isInkforgeAssetUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().startsWith(INKFORGE_ASSET_SCHEME)
}

export function extractInkforgeAssetId(value: string | null | undefined): string | null {
  if (!isInkforgeAssetUrl(value)) {
    return null
  }

  const rawId = value!.trim().slice(INKFORGE_ASSET_SCHEME.length)
  if (!rawId) {
    return null
  }

  try {
    return decodeURIComponent(rawId)
  } catch {
    return rawId
  }
}

export function getStableImageSource(src: string | null | undefined, assetId: string | null | undefined): string {
  const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : ''
  if (normalizedAssetId) {
    return createInkforgeAssetUrl(normalizedAssetId)
  }

  return typeof src === 'string' ? src : ''
}
