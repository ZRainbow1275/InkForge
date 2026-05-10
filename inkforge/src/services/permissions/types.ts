import { z } from 'zod'

export const RESOURCE_KIND_VALUES = ['document', 'folder', 'comment', 'version', 'publish'] as const
export const PERMISSION_LEVEL_VALUES = ['private', 'shared-read', 'shared-comment', 'shared-edit'] as const
export const SHARE_LINK_STATUS_VALUES = ['active', 'revoked'] as const

export type ResourceKind = typeof RESOURCE_KIND_VALUES[number]
export type PermissionLevel = typeof PERMISSION_LEVEL_VALUES[number]
export type ShareLinkStatus = typeof SHARE_LINK_STATUS_VALUES[number]

export interface ShareLink {
    id: string
    code: string
    level: Exclude<PermissionLevel, 'private'>
    expiresAt: number | null
    passwordHash: string | null
    createdAt: number
    accessCount: number
    lastAccessAt?: number
    status: ShareLinkStatus
}

export interface ResourcePermissionRecord {
    id: string
    resourceId: string
    resourceKind: ResourceKind
    profileId: string
    level: PermissionLevel
    shareLinks: ShareLink[]
    updatedAt: number
    createdAt: number
}

export interface UpsertResourcePermissionInput {
    resourceId: string
    resourceKind: ResourceKind
    profileId: string
    level: PermissionLevel
}

export interface PermissionCheckResult {
    granted: boolean
    reason: string
    requiredLevel: PermissionLevel
    actualLevel: PermissionLevel | 'owner' | 'none'
    auditId?: string
}

export interface ShareLinkVerifyResult {
    granted: boolean
    reason: string
    resourceId?: string
    resourceKind?: ResourceKind
    level?: Exclude<PermissionLevel, 'private'>
    auditId?: string
}

export const upsertResourcePermissionSchema = z.object({
    resourceId: z.string().min(1),
    resourceKind: z.enum(RESOURCE_KIND_VALUES),
    profileId: z.string().min(1),
    level: z.enum(PERMISSION_LEVEL_VALUES),
}) satisfies z.ZodType<UpsertResourcePermissionInput>

export function isResourceKind(value: string): value is ResourceKind {
    return RESOURCE_KIND_VALUES.includes(value as ResourceKind)
}
