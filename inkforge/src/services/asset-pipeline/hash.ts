import { AssetPipelineError } from './types'

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function calculateBlobSha256(blob: Blob): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new AssetPipelineError('crypto_unavailable', 'Web Crypto SHA-256 is unavailable in this runtime')
  }

  const buffer = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return arrayBufferToHex(digest)
}

export function buildAssetIdFromHash(contentHash: string): string {
  return contentHash.slice(0, 16)
}
