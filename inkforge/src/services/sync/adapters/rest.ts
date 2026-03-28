import type {
    ConfiguredSyncTarget,
    RemoteManifestEntry,
    SyncAdapter,
    SyncConnectionResult,
    SyncDeletePayload,
    SyncResolvePayload,
    SyncUploadPayload,
} from './types'
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    createRemoteManifestEntry,
    createResolvedRemoteManifestEntry,
    describeSyncTarget,
} from './shared'

type RestTarget = Extract<ConfiguredSyncTarget, { type: 'rest' }>

interface RestManifestResponse {
    documents?: RemoteManifestEntry[]
}

interface RestDocumentResponse {
    data?: string
}

interface RestResolveResponse {
    document?: RemoteManifestEntry
}

function isRemoteManifestEntry(value: unknown): value is RemoteManifestEntry {
    if (!value || typeof value !== 'object') {
        return false
    }

    return 'documentId' in value
}

export class RestSyncAdapter implements SyncAdapter {
    readonly type = 'rest' as const

    private readonly baseUrl: string

    constructor(private readonly target: RestTarget) {
        this.baseUrl = target.url.replace(/\/+$/, '')
    }

    async testConnection(): Promise<SyncConnectionResult> {
        const response = await this.request('/pull', {
            method: 'GET',
        })

        if (!response.ok) {
            throw new Error(`${describeSyncTarget(this.type)} 连接失败 (${response.status})`)
        }

        return {
            success: true,
            message: 'REST API 连接成功',
        }
    }

    async listRemoteChanges(): Promise<RemoteManifestEntry[]> {
        const response = await this.request('/pull', { method: 'GET' })

        if (response.status === 404) {
            return []
        }

        if (!response.ok) {
            throw new Error(`读取 REST manifest 失败 (${response.status})`)
        }

        const payload = await response.json() as RestManifestResponse
        return (payload.documents ?? []).map((entry) => createRemoteManifestEntry(entry))
    }

    async download(documentId: string): Promise<ArrayBuffer> {
        const response = await this.request(`/pull?documentId=${encodeURIComponent(documentId)}`, {
            method: 'GET',
        })

        if (!response.ok) {
            throw new Error(`REST 文档下载失败 (${response.status})`)
        }

        const contentType = response.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
            const payload = await response.json() as RestDocumentResponse
            if (!payload.data) {
                throw new Error('REST 下载响应缺少 data 字段')
            }

            return base64ToArrayBuffer(payload.data)
        }

        return response.arrayBuffer()
    }

    async upload(payload: SyncUploadPayload): Promise<RemoteManifestEntry> {
        const response = await this.request('/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                action: 'upsert',
                documentId: payload.documentId,
                remoteVersion: payload.remoteVersion,
                checksum: payload.checksum,
                updatedAt: payload.updatedAt,
                title: payload.title,
                categoryId: payload.categoryId ?? null,
                encoding: 'base64',
                data: arrayBufferToBase64(payload.data),
            }),
        })

        if (!response.ok) {
            throw new Error(`REST 上传失败 (${response.status})`)
        }

        return createRemoteManifestEntry({
            documentId: payload.documentId,
            remoteVersion: payload.remoteVersion,
            checksum: payload.checksum,
            updatedAt: payload.updatedAt,
            size: payload.data.byteLength,
            title: payload.title,
            categoryId: payload.categoryId ?? null,
        })
    }

    async delete(payload: SyncDeletePayload): Promise<RemoteManifestEntry> {
        const response = await this.request('/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                action: 'delete',
                documentId: payload.documentId,
                remoteVersion: payload.remoteVersion,
                checksum: payload.checksum,
                updatedAt: payload.updatedAt,
                title: payload.title,
                categoryId: payload.categoryId ?? null,
            }),
        })

        if (!response.ok) {
            throw new Error(`REST 删除失败 (${response.status})`)
        }

        return createRemoteManifestEntry({
            documentId: payload.documentId,
            remoteVersion: payload.remoteVersion,
            checksum: payload.checksum,
            updatedAt: payload.updatedAt,
            size: 0,
            deleted: true,
            title: payload.title,
            categoryId: payload.categoryId ?? null,
        })
    }

    async resolveConflict(payload: SyncResolvePayload): Promise<RemoteManifestEntry> {
        const response = await this.request('/resolve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({
                documentId: payload.documentId,
                strategy: payload.strategy,
                localVersion: payload.localVersion,
                remoteVersion: payload.remoteVersion,
                localChecksum: payload.localChecksum,
                remoteChecksum: payload.remoteChecksum,
                resolvedVersion: payload.resolvedVersion,
                resolvedChecksum: payload.resolvedChecksum,
                updatedAt: payload.updatedAt,
                title: payload.title,
                categoryId: payload.categoryId ?? null,
                deleted: payload.deleted ?? false,
                encoding: payload.data ? 'base64' : undefined,
                data: payload.data ? arrayBufferToBase64(payload.data) : undefined,
            }),
        })

        if (!response.ok) {
            throw new Error(`REST 冲突解决回写失败 (${response.status})`)
        }

        const contentType = response.headers.get('content-type') ?? ''
        if (contentType.includes('application/json')) {
            const responsePayload = await response.json() as RestResolveResponse | RemoteManifestEntry
            const entry = isRemoteManifestEntry(responsePayload)
                ? responsePayload
                : responsePayload.document

            if (entry) {
                return createRemoteManifestEntry(entry)
            }
        }

        return createResolvedRemoteManifestEntry(payload)
    }

    private request(path: string, init: RequestInit): Promise<Response> {
        return fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${this.target.token}`,
                ...(init.headers ?? {}),
            },
        })
    }
}
