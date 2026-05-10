export interface ImageDimensions {
    width: number
    height: number
    mime: string
}

function decodeBase64ToBytes(base64: string): Uint8Array {
    if (typeof atob === 'function') {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
        }
        return bytes
    }
    const bufferCtor = (globalThis as { Buffer?: { from(input: string, enc: string): Uint8Array } }).Buffer
    if (bufferCtor) {
        return new Uint8Array(bufferCtor.from(base64, 'base64'))
    }
    throw new Error('No base64 decoder available in this environment')
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
    return (bytes[offset] << 8) | bytes[offset + 1]
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
    return (
        (bytes[offset] * 0x1000000) +
        ((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
    )
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
    return (
        bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] * 0x1000000)
    )
}

function parsePng(bytes: Uint8Array): ImageDimensions | null {
    if (bytes.length < 24) return null
    if (
        bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47 ||
        bytes[4] !== 0x0d || bytes[5] !== 0x0a || bytes[6] !== 0x1a || bytes[7] !== 0x0a
    ) {
        return null
    }
    const width = readUint32BE(bytes, 16)
    const height = readUint32BE(bytes, 20)
    return { width, height, mime: 'image/png' }
}

function parseJpeg(bytes: Uint8Array): ImageDimensions | null {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
    let offset = 2
    while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) return null
        while (bytes[offset] === 0xff && offset < bytes.length) offset++
        const marker = bytes[offset]
        offset++
        // SOFn markers (excluding DHT/JPG/DAC) carry dimensions
        const isSof =
            (marker >= 0xc0 && marker <= 0xcf) &&
            marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
        if (isSof) {
            if (offset + 7 > bytes.length) return null
            const height = readUint16BE(bytes, offset + 3)
            const width = readUint16BE(bytes, offset + 5)
            return { width, height, mime: 'image/jpeg' }
        }
        if (offset + 2 > bytes.length) return null
        const segLen = readUint16BE(bytes, offset)
        offset += segLen
    }
    return null
}

function parseWebp(bytes: Uint8Array): ImageDimensions | null {
    if (bytes.length < 30) return null
    // "RIFF" .... "WEBP"
    if (
        bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
        bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50
    ) {
        return null
    }
    // Chunk header at offset 12: "VP8 ", "VP8L", or "VP8X"
    const c0 = bytes[12], c1 = bytes[13], c2 = bytes[14], c3 = bytes[15]
    // VP8X
    if (c0 === 0x56 && c1 === 0x50 && c2 === 0x38 && c3 === 0x58) {
        const width = (readUint32LE(bytes, 24) & 0xffffff) + 1
        const height = (readUint32LE(bytes, 27) & 0xffffff) + 1
        return { width, height, mime: 'image/webp' }
    }
    // VP8L
    if (c0 === 0x56 && c1 === 0x50 && c2 === 0x38 && c3 === 0x4c) {
        if (bytes[20] !== 0x2f) return null
        const b0 = bytes[21], b1 = bytes[22], b2 = bytes[23], b3 = bytes[24]
        const width = 1 + (((b1 & 0x3f) << 8) | b0)
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
        return { width, height, mime: 'image/webp' }
    }
    // VP8 (lossy)
    if (c0 === 0x56 && c1 === 0x50 && c2 === 0x38 && c3 === 0x20) {
        // Frame tag at 20..22, start code at 23..25 should be 0x9d 0x01 0x2a
        if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null
        const width = readUint16LE(bytes, 26) & 0x3fff
        const height = readUint16LE(bytes, 28) & 0x3fff
        return { width, height, mime: 'image/webp' }
    }
    return null
}

export function extractFromDataUrl(dataUrl: string): ImageDimensions | null {
    if (!dataUrl.startsWith('data:')) return null
    const commaIdx = dataUrl.indexOf(',')
    if (commaIdx < 0) return null
    const header = dataUrl.slice(5, commaIdx)
    const payload = dataUrl.slice(commaIdx + 1)
    const isBase64 = header.includes(';base64')
    if (!isBase64) return null
    let bytes: Uint8Array
    try {
        bytes = decodeBase64ToBytes(payload)
    } catch {
        return null
    }
    return parsePng(bytes) ?? parseJpeg(bytes) ?? parseWebp(bytes)
}

export async function extractFromBlob(blob: Blob): Promise<ImageDimensions> {
    const mime = blob.type || 'application/octet-stream'
    const g = globalThis as {
        createImageBitmap?: (b: Blob) => Promise<{ width: number; height: number; close?: () => void }>
        Image?: new () => HTMLImageElement
        URL?: { createObjectURL(b: Blob): string; revokeObjectURL(u: string): void }
    }
    if (typeof g.createImageBitmap === 'function') {
        const bitmap = await g.createImageBitmap(blob)
        const { width, height } = bitmap
        bitmap.close?.()
        return { width, height, mime }
    }
    if (g.Image && g.URL) {
        const url = g.URL.createObjectURL(blob)
        try {
            const dims = await new Promise<ImageDimensions>((resolve, reject) => {
                const img = new g.Image!()
                img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, mime })
                img.onerror = () => reject(new Error('Failed to load image for dimension extraction'))
                img.src = url
            })
            return dims
        } finally {
            g.URL.revokeObjectURL(url)
        }
    }
    throw new Error('No image dimension extraction backend available')
}
