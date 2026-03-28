import {
    RemoteManifestSchema,
    REMOTE_MANIFEST_VERSION,
    type RemoteManifest,
    type RemoteConflictResolution,
    type RemoteManifestEntry,
    type SyncResolvePayload,
} from './types'

export const SYNC_MANIFEST_FILENAME = 'manifest.json'
export const SYNC_DOCUMENTS_DIRECTORY = 'documents'

export function createEmptyManifest(): RemoteManifest {
    return {
        version: REMOTE_MANIFEST_VERSION,
        updatedAt: new Date().toISOString(),
        documents: {},
    }
}

export function parseRemoteManifest(payload: string): RemoteManifest {
    if (!payload.trim()) {
        return createEmptyManifest()
    }

    return RemoteManifestSchema.parse(JSON.parse(payload))
}

export function stringifyRemoteManifest(manifest: RemoteManifest): string {
    return JSON.stringify({
        ...manifest,
        updatedAt: new Date().toISOString(),
    }, null, 2)
}

export function sortRemoteManifestEntries(entries: RemoteManifestEntry[]): RemoteManifestEntry[] {
    return [...entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function buildDocumentFilename(documentId: string): string {
    return `${encodeURIComponent(documentId)}.inkforge`
}

export function createRemoteManifestEntry(
    input: {
        documentId: string
        remoteVersion: number
        checksum: string
        updatedAt: string
        size: number
        deleted?: boolean
        title?: string
        categoryId?: string | null
        resolution?: RemoteConflictResolution
    }
): RemoteManifestEntry {
    return {
        documentId: input.documentId,
        remoteVersion: input.remoteVersion,
        checksum: input.checksum,
        updatedAt: input.updatedAt,
        size: input.size,
        deleted: input.deleted ?? false,
        title: input.title,
        categoryId: input.categoryId ?? null,
        resolution: input.resolution,
    }
}

export function createConflictResolutionRecord(
    payload: SyncResolvePayload,
    resolvedAt: string = new Date().toISOString(),
): RemoteConflictResolution {
    return {
        strategy: payload.strategy,
        state: payload.strategy === 'manual' ? 'pending' : 'resolved',
        resolvedAt,
        localVersion: payload.localVersion,
        remoteVersion: payload.remoteVersion,
        localChecksum: payload.localChecksum,
        remoteChecksum: payload.remoteChecksum,
        resolvedVersion: payload.resolvedVersion,
        resolvedChecksum: payload.resolvedChecksum,
    }
}

export function createResolvedRemoteManifestEntry(
    payload: SyncResolvePayload,
    currentEntry?: RemoteManifestEntry,
): RemoteManifestEntry {
    const resolvedAt = new Date().toISOString()
    const prefersLocal = payload.strategy === 'local-wins'

    return createRemoteManifestEntry({
        documentId: payload.documentId,
        remoteVersion: prefersLocal
            ? payload.resolvedVersion
            : currentEntry?.remoteVersion ?? payload.remoteVersion,
        checksum: prefersLocal
            ? payload.resolvedChecksum
            : currentEntry?.checksum ?? payload.remoteChecksum,
        updatedAt: prefersLocal
            ? payload.updatedAt
            : currentEntry?.updatedAt ?? payload.updatedAt,
        size: prefersLocal
            ? (payload.deleted ? 0 : payload.data?.byteLength ?? currentEntry?.size ?? 0)
            : currentEntry?.size ?? 0,
        deleted: prefersLocal
            ? payload.deleted ?? false
            : currentEntry?.deleted ?? false,
        title: prefersLocal
            ? payload.title ?? currentEntry?.title
            : currentEntry?.title ?? payload.title,
        categoryId: prefersLocal
            ? payload.categoryId ?? currentEntry?.categoryId ?? null
            : currentEntry?.categoryId ?? payload.categoryId ?? null,
        resolution: createConflictResolutionRecord(payload, resolvedAt),
    })
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''

    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }

    return window.btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
    }

    return bytes.buffer
}

export function toArrayBuffer(value: Uint8Array | ArrayBuffer): ArrayBuffer {
    if (value instanceof ArrayBuffer) {
        return value
    }

    return value.buffer.slice(
        value.byteOffset,
        value.byteOffset + value.byteLength,
    )
}

export function encodeText(value: string): Uint8Array {
    return new TextEncoder().encode(value)
}

export async function sha256Hex(value: string | Uint8Array | ArrayBuffer): Promise<string> {
    const input = typeof value === 'string' ? encodeText(value) : value
    const hashBuffer = await crypto.subtle.digest('SHA-256', input)
    return Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hmacSha256(
    key: string | Uint8Array | ArrayBuffer,
    value: string | Uint8Array | ArrayBuffer,
): Promise<ArrayBuffer> {
    const rawKey = typeof key === 'string' ? encodeText(key) : key
    const keyBuffer = rawKey instanceof ArrayBuffer ? rawKey : toArrayBuffer(rawKey)
    const data = typeof value === 'string' ? encodeText(value) : value
    const dataBuffer = data instanceof ArrayBuffer ? data : toArrayBuffer(data)

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    )

    return crypto.subtle.sign('HMAC', cryptoKey, dataBuffer)
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function describeSyncTarget(targetType: 'webdav' | 's3' | 'rest'): string {
    switch (targetType) {
        case 'webdav':
            return 'WebDAV'
        case 's3':
            return 'S3'
        case 'rest':
            return 'REST API'
        default:
            return targetType
    }
}
