import {
  ASSET_COMPRESSION_THRESHOLD,
  ASSET_THUMBNAIL_SIZE,
  type AssetMimeCategory,
  normalizeMimeType,
} from './types'

export interface ProcessedAssetBlob {
  blob: Blob
  mimeType: string
  thumbnail?: Blob
  width?: number
  height?: number
}

function canUseBrowserImagePipeline(): boolean {
  return typeof Image !== 'undefined'
    && typeof document !== 'undefined'
    && typeof URL !== 'undefined'
    && typeof URL.createObjectURL === 'function'
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to decode image asset'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), mimeType, quality)
  })
}

async function compressImage(blob: Blob, image: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) return blob

  context.drawImage(image, 0, 0)
  const compressed = await canvasToBlob(canvas, 'image/webp', 0.82)
  return compressed && compressed.size < blob.size ? compressed : blob
}

async function generateThumbnail(image: HTMLImageElement): Promise<Blob | undefined> {
  const canvas = document.createElement('canvas')
  let width = image.naturalWidth
  let height = image.naturalHeight

  if (width > height) {
    if (width > ASSET_THUMBNAIL_SIZE) {
      height = Math.round(height * ASSET_THUMBNAIL_SIZE / width)
      width = ASSET_THUMBNAIL_SIZE
    }
  } else if (height > ASSET_THUMBNAIL_SIZE) {
    width = Math.round(width * ASSET_THUMBNAIL_SIZE / height)
    height = ASSET_THUMBNAIL_SIZE
  }

  canvas.width = Math.max(1, width)
  canvas.height = Math.max(1, height)
  const context = canvas.getContext('2d')
  if (!context) return undefined

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return await canvasToBlob(canvas, 'image/webp', 0.72) ?? undefined
}

export async function processAssetBlob(blob: Blob, category: AssetMimeCategory, mimeType: string): Promise<ProcessedAssetBlob> {
  const normalized = normalizeMimeType(mimeType)
  if (category !== 'image' || !canUseBrowserImagePipeline() || normalized === 'image/svg+xml') {
    return { blob, mimeType: normalized || blob.type }
  }

  try {
    const image = await loadImage(blob)
    const shouldCompress = blob.size > ASSET_COMPRESSION_THRESHOLD && normalized !== 'image/gif' && normalized !== 'image/avif'
    const storedBlob = shouldCompress ? await compressImage(blob, image) : blob
    const thumbnail = normalized === 'image/gif' ? undefined : await generateThumbnail(image)

    return {
      blob: storedBlob,
      mimeType: storedBlob.type || normalized || blob.type,
      thumbnail,
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  } catch {
    return { blob, mimeType: normalized || blob.type }
  }
}
