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
    arrayBufferToHex,
    buildDocumentFilename,
    createEmptyManifest,
    createRemoteManifestEntry,
    createResolvedRemoteManifestEntry,
    describeSyncTarget,
    hmacSha256,
    parseRemoteManifest,
    sha256Hex,
    stringifyRemoteManifest,
    sortRemoteManifestEntries,
} from './shared'

type S3Target = Extract<ConfiguredSyncTarget, { type: 's3' }>

interface SignedRequestOptions {
    method: 'GET' | 'PUT' | 'DELETE'
    key?: string
    query?: Record<string, string>
    body?: string | ArrayBuffer
    contentType?: string
}

export class S3SyncAdapter implements SyncAdapter {
    readonly type = 's3' as const

    private readonly endpoint: URL
    private resolvedRegion: string

    constructor(private readonly target: S3Target) {
        this.endpoint = new URL(target.endpoint)
        this.resolvedRegion = target.region === 'auto' ? 'us-east-1' : target.region
    }

    async testConnection(): Promise<SyncConnectionResult> {
        const response = await this.signedFetch({
            method: 'GET',
            query: {
                'list-type': '2',
                'max-keys': '1',
                prefix: `${SYNC_DOCUMENTS_DIRECTORY}/`,
            },
        })

        if (!response.ok) {
            throw new Error(`${describeSyncTarget(this.type)} 连接失败 (${response.status})`)
        }

        return {
            success: true,
            message: 'S3 连接成功',
        }
    }

    async listRemoteChanges(): Promise<RemoteManifestEntry[]> {
        const response = await this.signedFetch({
            method: 'GET',
            key: SYNC_MANIFEST_FILENAME,
        })

        if (response.status === 404) {
            return []
        }

        if (!response.ok) {
            throw new Error(`读取 S3 manifest 失败 (${response.status})`)
        }

        const manifest = parseRemoteManifest(await response.text())
        return sortRemoteManifestEntries(Object.values(manifest.documents))
    }

    async download(documentId: string): Promise<ArrayBuffer> {
        const response = await this.signedFetch({
            method: 'GET',
            key: this.documentKey(documentId),
        })

        if (!response.ok) {
            throw new Error(`S3 下载失败 (${response.status})`)
        }

        return response.arrayBuffer()
    }

    async upload(payload: SyncUploadPayload): Promise<RemoteManifestEntry> {
        const response = await this.signedFetch({
            method: 'PUT',
            key: this.documentKey(payload.documentId),
            body: payload.data,
            contentType: 'application/octet-stream',
        })

        if (!response.ok) {
            throw new Error(`S3 上传失败 (${response.status})`)
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
        const response = await this.signedFetch({
            method: 'DELETE',
            key: this.documentKey(payload.documentId),
        })

        if (response.status !== 404 && !response.ok) {
            throw new Error(`S3 删除失败 (${response.status})`)
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
            const response = await this.signedFetch({
                method: payload.deleted ? 'DELETE' : 'PUT',
                key: this.documentKey(payload.documentId),
                body: payload.deleted ? undefined : payload.data,
                contentType: payload.deleted ? undefined : 'application/octet-stream',
            })

            if (response.status !== 404 && !response.ok) {
                throw new Error(`S3 冲突解决写回失败 (${response.status})`)
            }
        }

        const manifest = await this.loadManifest()
        const entry = createResolvedRemoteManifestEntry(payload, manifest.documents[payload.documentId])
        manifest.documents[payload.documentId] = entry
        await this.saveManifest(manifest)
        return entry
    }

    private async loadManifest(): Promise<RemoteManifest> {
        const response = await this.signedFetch({
            method: 'GET',
            key: SYNC_MANIFEST_FILENAME,
        })

        if (response.status === 404) {
            return createEmptyManifest()
        }

        if (!response.ok) {
            throw new Error(`读取 S3 manifest 失败 (${response.status})`)
        }

        return parseRemoteManifest(await response.text())
    }

    private async saveManifest(manifest: RemoteManifest): Promise<void> {
        const response = await this.signedFetch({
            method: 'PUT',
            key: SYNC_MANIFEST_FILENAME,
            body: stringifyRemoteManifest(manifest),
            contentType: 'application/json; charset=utf-8',
        })

        if (!response.ok) {
            logger.error('[S3SyncAdapter] 保存 manifest 失败', {
                endpoint: this.target.endpoint,
                bucket: this.target.bucket,
                status: response.status,
            })
            throw new Error(`保存 S3 manifest 失败 (${response.status})`)
        }
    }

    private documentKey(documentId: string): string {
        return `${SYNC_DOCUMENTS_DIRECTORY}/${buildDocumentFilename(documentId)}`
    }

    private async signedFetch(options: SignedRequestOptions, retryOnRegionMismatch: boolean = true): Promise<Response> {
        const { url, headers } = await this.buildSignedRequest(options)
        const response = await fetch(url, {
            method: options.method,
            headers,
            body: options.body,
        })

        const bucketRegion = response.headers.get('x-amz-bucket-region')
        if (
            retryOnRegionMismatch &&
            bucketRegion &&
            bucketRegion !== this.resolvedRegion &&
            (this.target.region === 'auto' || response.status === 301 || response.status === 400)
        ) {
            this.resolvedRegion = bucketRegion
            return this.signedFetch(options, false)
        }

        return response
    }

    private async buildSignedRequest(options: SignedRequestOptions): Promise<{ url: string; headers: Headers }> {
        const url = new URL(this.endpoint.toString())
        url.pathname = this.buildCanonicalPath(options.key)

        if (options.query) {
            for (const [key, value] of Object.entries(options.query)) {
                url.searchParams.set(key, value)
            }
        }

        const now = new Date()
        const amzDate = toAmzDate(now)
        const dateStamp = toDateStamp(now)
        const payloadHash = await sha256Hex(options.body ?? '')
        const canonicalUri = canonicalizeUri(url.pathname)
        const canonicalQuery = canonicalizeQuery(url.searchParams)
        const host = url.host

        const canonicalHeaders = [
            `host:${host}`,
            `x-amz-content-sha256:${payloadHash}`,
            `x-amz-date:${amzDate}`,
            '',
        ].join('\n')
        const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

        const canonicalRequest = [
            options.method,
            canonicalUri,
            canonicalQuery,
            canonicalHeaders,
            signedHeaders,
            payloadHash,
        ].join('\n')

        const credentialScope = `${dateStamp}/${this.resolvedRegion}/s3/aws4_request`
        const stringToSign = [
            'AWS4-HMAC-SHA256',
            amzDate,
            credentialScope,
            await sha256Hex(canonicalRequest),
        ].join('\n')

        const signingKey = await this.deriveSigningKey(dateStamp)
        const signature = arrayBufferToHex(await hmacSha256(signingKey, stringToSign))

        const authorization = [
            'AWS4-HMAC-SHA256 Credential=',
            `${this.target.accessKeyId}/${credentialScope}, `,
            `SignedHeaders=${signedHeaders}, `,
            `Signature=${signature}`,
        ].join('')

        const headers = new Headers({
            Authorization: authorization,
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDate,
        })

        if (options.contentType) {
            headers.set('Content-Type', options.contentType)
        }

        return {
            url: url.toString(),
            headers,
        }
    }

    private buildCanonicalPath(key?: string): string {
        const segments = [
            this.endpoint.pathname.replace(/\/+$/, ''),
            encodeURIComponent(this.target.bucket),
            key,
        ].filter((segment): segment is string => Boolean(segment))

        return `/${segments.join('/').replace(/^\/+/, '')}`
    }

    private async deriveSigningKey(dateStamp: string): Promise<ArrayBuffer> {
        const kDate = await hmacSha256(`AWS4${this.target.secretAccessKey}`, dateStamp)
        const kRegion = await hmacSha256(kDate, this.resolvedRegion)
        const kService = await hmacSha256(kRegion, 's3')
        return hmacSha256(kService, 'aws4_request')
    }
}

function toAmzDate(date: Date): string {
    const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
    return `${iso.slice(0, 8)}T${iso.slice(8, 14)}Z`
}

function toDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function canonicalizeUri(pathname: string): string {
    return pathname
        .split('/')
        .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
        .join('/')
        .replace(/%2F/g, '/')
}

function canonicalizeQuery(searchParams: URLSearchParams): string {
    return [...searchParams.entries()]
        .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
            if (leftKey === rightKey) {
                return leftValue.localeCompare(rightValue)
            }

            return leftKey.localeCompare(rightKey)
        })
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
}
