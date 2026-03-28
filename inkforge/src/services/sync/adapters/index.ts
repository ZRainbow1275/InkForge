import type { SyncTarget } from '@/stores/settings'
import type { ConfiguredSyncTarget, SyncAdapter } from './types'
import { RestSyncAdapter } from './rest'
import { S3SyncAdapter } from './s3'
import { WebDAVSyncAdapter } from './webdav'

export function createSyncAdapter(target: SyncTarget): SyncAdapter | null {
    switch (target.type) {
        case 'webdav':
            return new WebDAVSyncAdapter(target)
        case 's3':
            return new S3SyncAdapter(target)
        case 'rest':
            return new RestSyncAdapter(target)
        case 'none':
        default:
            return null
    }
}

export function isConfiguredSyncTarget(target: SyncTarget): target is ConfiguredSyncTarget {
    return target.type !== 'none'
}

export { WebDAVSyncAdapter } from './webdav'
export { S3SyncAdapter } from './s3'
export { RestSyncAdapter } from './rest'

export type {
    ConfiguredSyncTarget,
    RemoteConflictResolution,
    RemoteManifest,
    RemoteManifestEntry,
    SyncAdapter,
    SyncConnectionResult,
    SyncDeletePayload,
    SyncResolvePayload,
    SyncUploadPayload,
} from './types'
