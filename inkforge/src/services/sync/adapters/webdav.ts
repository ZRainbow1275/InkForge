import { logger } from '@/services/error'
import type {
    ConfiguredSyncTarget,
    RemoteManifest,
    RemoteManifestEntry,
    SyncAdapter,
    SyncConnectionResult,
    SyncDeletePayload,
    SyncResolvePayload,
    SyncUploadPayload,
} from './types'
import {
    SYNC_DOCUMENTS_DIRECTORY,
    SYNC_MANIFEST_FILENAME,
    buildDocumentFilename,
    createEmptyManifest,
    createRemoteManifestEntry,
    createResolvedRemoteManifestEntry,
    describeSyncTarget,
    parseRemoteManifest,
    stringifyRemoteManifest,
    sortRemoteManifestEntries,
} from './shared'

type WebDAVTarget = Extract<ConfiguredSyncTarget, { type: 'webdav' }>

const PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname />
  </d:prop>
</d:propfind>`

function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '')
}

export class WebDAVSyncAdapter implements SyncAdapter {
    readonly type = 'webdav' as const

    private readonly baseUrl: string
    private readonly authHeader: string

    constructor(target: WebDAVTarget) {
        this.baseUrl = normalizeBaseUrl(target.url)
        this.authHeader = `Basic ${window.btoa(`${target.username}:${target.password}`)}`
    }

    async testConnection(): Promise<SyncConnectionResult> {
        const response = await fetch(this.baseUrl, {
            method: 'PROPFIND',
            headers: {
                Authorization: this.authHeader,
                Depth: '0',
                'Content-Type': 'application/xml; charset=utf-8',
            },
            body: PROPFIND_BODY,
        })

        if (response.status !== 207 && !response.ok) {
            throw new Error(`${describeSyncTarget(this.type)} 连接失败 (${response.status})`)
        }

        return {
            success: true,
            message: 'WebDAV 连接成功',
        }
    }

    async listRemoteChanges(): Promise<RemoteManifestEntry[]> {
        const manifest = await this.loadManifest()
        return sortRemoteManifestEntries(Object.values(manifest.documents))
    }

    async download(documentId: string): Promise<ArrayBuffer> {
        const response = await fetch(this.documentUrl(documentId), {
            method: 'GET',
            headers: {
                Authorization: this.authHeader,
            },
        })

        if (!response.ok) {
            throw new Error(`WebDAV 下载失败 (${response.status})`)
        }

        return response.arrayBuffer()
    }

    async upload(payload: SyncUploadPayload): Promise<RemoteManifestEntry> {
        await this.ensureDocumentsCollection()

        const response = await fetch(this.documentUrl(payload.documentId), {
            method: 'PUT',
            headers: {
                Authorization: this.authHeader,
                'Content-Type': 'application/octet-stream',
            },
            body: payload.data,
        })

        if (!response.ok) {
            throw new Error(`WebDAV 上传失败 (${response.status})`)
        }

        const manifest = await this.loadManifest()
        const entry = createRemoteManifestEntry({
            documentId: payload.documentId,
            remoteVersion: payload.remoteVersion,
            checksum: payload.checksum,
            updatedAt: payload.updatedAt,
            size: payload.data.byteLength,
            title: payload.title,
            categoryId: payload.categoryId ?? null,
        })

        manifest.documents[payload.documentId] = entry
        await this.saveManifest(manifest)
        return entry
    }

    async delete(payload: SyncDeletePayload): Promise<RemoteManifestEntry> {
        const response = await fetch(this.documentUrl(payload.documentId), {
            method: 'DELETE',
            headers: {
                Authorization: this.authHeader,
            },
        })

        if (response.status !== 404 && !response.ok) {
            throw new Error(`WebDAV 删除失败 (${response.status})`)
        }

        const manifest = await this.loadManifest()
        const entry = createRemoteManifestEntry({
            documentId: payload.documentId,
            remoteVersion: payload.remoteVersion,
            checksum: payload.checksum,
            updatedAt: payload.updatedAt,
            size: 0,
            deleted: true,
            title: payload.title,
            categoryId: payload.categoryId ?? null,
        })

        manifest.documents[payload.documentId] = entry
        await this.saveManifest(manifest)
        return entry
    }

    async resolveConflict(payload: SyncResolvePayload): Promise<RemoteManifestEntry> {
        if (payload.strategy === 'local-wins') {
            if (!payload.deleted) {
                await this.ensureDocumentsCollection()
            }

            const response = await fetch(this.documentUrl(payload.documentId), {
                method: payload.deleted ? 'DELETE' : 'PUT',
                headers: {
                    Authorization: this.authHeader,
                    ...(payload.deleted ? {} : { 'Content-Type': 'application/octet-stream' }),
                },
                body: payload.deleted ? undefined : payload.data,
            })

            if (response.status !== 404 && !response.ok) {
                throw new Error(`WebDAV 冲突解决写回失败 (${response.status})`)
            }
        }

        const manifest = await this.loadManifest()
        const entry = createResolvedRemoteManifestEntry(payload, manifest.documents[payload.documentId])
        manifest.documents[payload.documentId] = entry
        await this.saveManifest(manifest)
        return entry
    }

    private manifestUrl(): string {
        return `${this.baseUrl}/${SYNC_MANIFEST_FILENAME}`
    }

    private documentsCollectionUrl(): string {
        return `${this.baseUrl}/${SYNC_DOCUMENTS_DIRECTORY}`
    }

    private documentUrl(documentId: string): string {
        return `${this.documentsCollectionUrl()}/${buildDocumentFilename(documentId)}`
    }

    private async ensureDocumentsCollection(): Promise<void> {
        const response = await fetch(this.documentsCollectionUrl(), {
            method: 'MKCOL',
            headers: {
                Authorization: this.authHeader,
            },
        })

        if ([201, 301, 405].includes(response.status)) {
            return
        }

        if (response.status === 409) {
            throw new Error('WebDAV 文档目录创建失败：目标路径不存在')
        }

        if (!response.ok) {
            throw new Error(`WebDAV 目录初始化失败 (${response.status})`)
        }
    }

    private async loadManifest(): Promise<RemoteManifest> {
        const response = await fetch(this.manifestUrl(), {
            method: 'GET',
            headers: {
                Authorization: this.authHeader,
            },
        })

        if (response.status === 404) {
            return createEmptyManifest()
        }

        if (!response.ok) {
            throw new Error(`读取 WebDAV manifest 失败 (${response.status})`)
        }

        return parseRemoteManifest(await response.text())
    }

    private async saveManifest(manifest: RemoteManifest): Promise<void> {
        const response = await fetch(this.manifestUrl(), {
            method: 'PUT',
            headers: {
                Authorization: this.authHeader,
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: stringifyRemoteManifest(manifest),
        })

        if (!response.ok) {
            logger.error('[WebDAVSyncAdapter] 保存 manifest 失败', {
                status: response.status,
                baseUrl: this.baseUrl,
            })
            throw new Error(`保存 WebDAV manifest 失败 (${response.status})`)
        }
    }
}
