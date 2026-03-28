import { z } from 'zod'
import type { SyncTarget } from '@/stores/settings'
import type { ConflictStrategy } from '../conflict-resolver'

export const REMOTE_MANIFEST_VERSION = 1

export const RemoteConflictResolutionSchema = z.object({
    strategy: z.enum(['local-wins', 'remote-wins', 'manual']),
    state: z.enum(['resolved', 'pending']).default('resolved'),
    resolvedAt: z.string().min(1),
    localVersion: z.number().int().min(0),
    remoteVersion: z.number().int().min(0),
    localChecksum: z.string(),
    remoteChecksum: z.string(),
    resolvedVersion: z.number().int().min(0),
    resolvedChecksum: z.string(),
})

export const RemoteManifestEntrySchema = z.object({
    documentId: z.string().min(1),
    remoteVersion: z.number().int().min(0),
    checksum: z.string(),
    updatedAt: z.string().min(1),
    size: z.number().int().min(0),
    deleted: z.boolean().optional().default(false),
    categoryId: z.string().nullable().optional(),
    title: z.string().optional(),
    resolution: RemoteConflictResolutionSchema.optional(),
})

export const RemoteManifestSchema = z.object({
    version: z.literal(REMOTE_MANIFEST_VERSION),
    updatedAt: z.string().min(1),
    documents: z.record(z.string(), RemoteManifestEntrySchema),
})

export type RemoteManifestEntry = z.infer<typeof RemoteManifestEntrySchema>
export type RemoteManifest = z.infer<typeof RemoteManifestSchema>
export type RemoteConflictResolution = z.infer<typeof RemoteConflictResolutionSchema>
export type ConfiguredSyncTarget = Exclude<SyncTarget, { type: 'none' }>

export interface SyncConnectionResult {
    success: boolean
    message: string
}

export interface SyncUploadPayload {
    documentId: string
    remoteVersion: number
    checksum: string
    updatedAt: string
    title?: string
    categoryId?: string | null
    data: ArrayBuffer
}

export interface SyncDeletePayload {
    documentId: string
    remoteVersion: number
    checksum: string
    updatedAt: string
    title?: string
    categoryId?: string | null
}

export interface SyncResolvePayload {
    documentId: string
    strategy: ConflictStrategy
    localVersion: number
    remoteVersion: number
    localChecksum: string
    remoteChecksum: string
    resolvedVersion: number
    resolvedChecksum: string
    updatedAt: string
    title?: string
    categoryId?: string | null
    deleted?: boolean
    data?: ArrayBuffer
}

export interface SyncAdapter {
    readonly type: ConfiguredSyncTarget['type']
    testConnection(): Promise<SyncConnectionResult>
    listRemoteChanges(): Promise<RemoteManifestEntry[]>
    download(documentId: string): Promise<ArrayBuffer>
    upload(payload: SyncUploadPayload): Promise<RemoteManifestEntry>
    delete(payload: SyncDeletePayload): Promise<RemoteManifestEntry>
    resolveConflict(payload: SyncResolvePayload): Promise<RemoteManifestEntry | void>
}
