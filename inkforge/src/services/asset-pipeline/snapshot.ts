import { db } from '@/utils/db'
import {
  type AssetSnapshot,
  type AssetSnapshotMode,
  sanitizeAssetName,
} from './types'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

async function blobToDataUrl(blob: Blob, mimeType: string): Promise<string> {
  const buffer = await blob.arrayBuffer()
  return `data:${mimeType};base64,${bytesToBase64(new Uint8Array(buffer))}`
}

function extensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/png': return '.png'
    case 'image/jpeg':
    case 'image/jpg': return '.jpg'
    case 'image/gif': return '.gif'
    case 'image/svg+xml': return '.svg'
    case 'image/webp': return '.webp'
    case 'image/avif': return '.avif'
    case 'application/pdf': return '.pdf'
    case 'text/plain': return '.txt'
    case 'text/csv': return '.csv'
    case 'application/json': return '.json'
    case 'text/markdown': return '.md'
    default: return ''
  }
}

export async function resolveAssetSnapshot(assetId: string, mode: AssetSnapshotMode = 'inline-base64'): Promise<AssetSnapshot> {
  const asset = await db.assets.get(assetId)
  if (!asset) {
    return {
      assetId,
      status: 'missing',
      mimeType: null,
      originalName: null,
      bytes: 0,
      reason: 'Asset record was not found in IndexedDB',
    }
  }

  const mimeType = asset.mimeType || 'application/octet-stream'
  const originalName = asset.originalName ?? asset.name ?? asset.id
  const bytes = asset.compressedSizeBytes ?? asset.sizeBytes ?? asset.size

  if (mode === 'external-url') {
    if (asset.externalUrl) {
      return {
        assetId,
        status: 'external-url',
        mimeType,
        originalName,
        bytes,
        externalUrl: asset.externalUrl,
      }
    }
    return {
      assetId,
      status: 'placeholder-manual',
      mimeType,
      originalName,
      bytes,
      reason: 'Asset has no external URL; manual upload or inline export is required',
    }
  }

  if (mode === 'local-relative') {
    const extension = extensionFromMime(mimeType)
    return {
      assetId,
      status: 'local-relative',
      mimeType,
      originalName,
      bytes,
      relativePath: `assets/${asset.id}${extension}`,
    }
  }

  if (mode === 'placeholder-manual') {
    return {
      assetId,
      status: 'placeholder-manual',
      mimeType,
      originalName,
      bytes,
      reason: `Manual asset handling required for ${sanitizeAssetName(originalName)}`,
    }
  }

  return {
    assetId,
    status: 'inline-base64',
    mimeType,
    originalName,
    bytes,
    dataUrl: await blobToDataUrl(asset.blob, mimeType),
  }
}
