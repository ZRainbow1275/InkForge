import { PermissionStore } from '@/services/auth'
import type { OperationPermission, PermissionCheck as RebacPermissionCheck, RelationTuple } from '@/services/auth'
import { auditLog } from '@/services/audit'
import { generateId } from '@/utils/uuid'
import { createShareLink, type CreateShareLinkInput } from './share-link'
import { permissionRepository } from './repository'
import type { PermissionCheckResult, PermissionLevel, ResourceKind, ResourcePermissionRecord, ShareLinkVerifyResult } from './types'

const DEFAULT_OWNER_LEVEL = 'owner' as const
const NETWORK_ALLOWLIST_KEY = 'inkforge.permissions.networkOrigins'
function toOperationPermission(requiredLevel: PermissionLevel): OperationPermission {
    if (requiredLevel === 'shared-edit') return 'edit'
    if (requiredLevel === 'shared-comment') return 'comment'
    return 'view'
}

function readNetworkAllowlist(): Set<string> {
    if (typeof localStorage === 'undefined') return new Set()
    try {
        const raw = localStorage.getItem(NETWORK_ALLOWLIST_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        return new Set(Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [])
    } catch {
        return new Set()
    }
}

function writeNetworkAllowlist(origins: Set<string>): void {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(NETWORK_ALLOWLIST_KEY, JSON.stringify([...origins].sort()))
}

async function auditShareLinkCreateDenied(
    actorProfileId: string,
    ownerProfileId: string,
    resourceId: string,
    resourceKind: ResourceKind,
    reason: string,
    payload: Record<string, unknown>,
): Promise<void> {
    await auditLog('permission.share_link.create', {
        actorId: actorProfileId,
        profileId: ownerProfileId,
        resourceId,
        resourceKind,
        severity: 'error',
        outcome: 'denied',
        reason,
        payload,
        source: 'PermissionBroker.createShareLink',
    })
}

async function auditShareAccessDenied(
    ownerProfileId: string,
    reason: string,
    payload: Record<string, unknown>,
    resourceId?: string,
    resourceKind?: ResourceKind,
): Promise<void> {
    await auditLog('permission.shared_access', {
        actorId: 'share-link',
        profileId: ownerProfileId,
        resourceId,
        resourceKind,
        severity: 'warning',
        outcome: 'denied',
        reason,
        payload,
        source: 'PermissionBroker.verifyShareLink',
    })
}

export class PermissionBroker {
    constructor(
        private readonly relationStore = new PermissionStore(),
        private readonly actorId = 'local-default'
    ) { }

    async grantResourceOwner(resourceId: string, resourceKind: ResourceKind, profileId: string): Promise<void> {
        const tuple: RelationTuple = {
            namespace: resourceKind,
            objectId: resourceId,
            relation: 'owner',
            subjectNamespace: 'profile',
            subjectId: profileId,
        }
        await this.relationStore.writeRelation(tuple, this.actorId)
        await permissionRepository.upsertPermission({ resourceId, resourceKind, profileId, level: 'private' })
        await auditLog('permission.grant', {
            actorId: this.actorId,
            profileId,
            resourceId,
            resourceKind,
            severity: 'info',
            outcome: 'success',
            payload: { relation: 'owner', subjectNamespace: 'profile', subjectId: profileId },
            source: 'PermissionBroker.grantResourceOwner',
        })
    }

    async revokeRelation(tuple: RelationTuple, profileId: string): Promise<void> {
        await this.relationStore.deleteRelation(tuple)
        await auditLog('permission.revoke', {
            actorId: this.actorId,
            profileId,
            resourceId: tuple.objectId,
            resourceKind: tuple.namespace as ResourceKind,
            severity: 'warning',
            outcome: 'success',
            payload: { relation: tuple.relation, subjectNamespace: tuple.subjectNamespace, subjectId: tuple.subjectId },
            source: 'PermissionBroker.revokeRelation',
        })
    }

    async check(
        profileId: string,
        resourceId: string,
        resourceKind: ResourceKind,
        requiredLevel: PermissionLevel
    ): Promise<PermissionCheckResult> {
        const permission = requiredLevel === 'private' ? 'delete' : toOperationPermission(requiredLevel)
        const check: RebacPermissionCheck = {
            namespace: resourceKind,
            objectId: resourceId,
            permission,
            subjectNamespace: 'profile',
            subjectId: profileId,
        }

        const resourcePermission = await permissionRepository.getPermission(resourceId, resourceKind)
        const isOwnerProfile = resourcePermission?.profileId === profileId
        const allowedByRelation = await this.relationStore.check(check)
        const granted = isOwnerProfile || allowedByRelation
        const reason = granted
            ? isOwnerProfile ? 'owner-profile' : requiredLevel === 'private' ? 'owner-relation' : 'rebac-relation'
            : resourcePermission ? 'permission-denied' : 'permission-record-missing'

        const audit = await auditLog('permission.check', {
            actorId: profileId,
            profileId: resourcePermission?.profileId ?? profileId,
            resourceId,
            resourceKind,
            severity: granted ? 'info' : 'warning',
            outcome: granted ? 'allowed' : 'denied',
            reason,
            payload: { requiredLevel, permission, allowedByRelation, isOwner: isOwnerProfile, ownerOnly: requiredLevel === 'private' },
            source: 'PermissionBroker.check',
        })

        return {
            granted,
            reason,
            requiredLevel,
            actualLevel: granted ? requiredLevel === 'private' || isOwnerProfile ? DEFAULT_OWNER_LEVEL : resourcePermission?.level ?? requiredLevel : 'none',
            auditId: audit?.id,
        }
    }

    async setResourceLevel(
        profileId: string,
        resourceId: string,
        resourceKind: ResourceKind,
        level: PermissionLevel
    ): Promise<ResourcePermissionRecord> {
        const record = await permissionRepository.upsertPermission({ resourceId, resourceKind, profileId, level })
        await auditLog(level === 'private' ? 'permission.revoke' : 'permission.grant', {
            actorId: profileId,
            profileId,
            resourceId,
            resourceKind,
            severity: 'info',
            outcome: 'success',
            payload: { level },
            source: 'PermissionBroker.setResourceLevel',
        })
        return record
    }

    async createShareLink(
        profileId: string,
        resourceId: string,
        resourceKind: ResourceKind,
        input: CreateShareLinkInput
    ): Promise<ResourcePermissionRecord> {
        const record = await permissionRepository.getPermission(resourceId, resourceKind)
        if (!record) {
            await auditShareLinkCreateDenied(profileId, profileId, resourceId, resourceKind, 'permission-record-missing', {
                requestedLevel: input.level,
            })
            throw new Error('创建共享链接前必须存在资源 Owner 权限记录')
        }
        if (record.profileId !== profileId) {
            await auditShareLinkCreateDenied(profileId, record.profileId, resourceId, resourceKind, 'owner-profile-required', {
                requestedLevel: input.level,
                ownerProfileId: record.profileId,
            })
            throw new Error('只有资源 Owner Profile 可以创建共享链接')
        }

        const shareLink = createShareLink(input)
        const nextRecord: ResourcePermissionRecord = {
            ...record,
            level: input.level,
            shareLinks: [shareLink, ...record.shareLinks],
            updatedAt: Date.now(),
        }
        await permissionRepository.updateShareLinks(nextRecord)
        await auditLog('permission.share_link.create', {
            actorId: profileId,
            profileId,
            resourceId,
            resourceKind,
            severity: 'info',
            outcome: 'success',
            payload: { shareLinkId: shareLink.id, level: shareLink.level, expiresAt: shareLink.expiresAt, passwordProtected: Boolean(shareLink.passwordHash) },
            source: 'PermissionBroker.createShareLink',
        })
        return nextRecord
    }

    async verifyShareLink(code: string, password?: string): Promise<ShareLinkVerifyResult> {
        const codePrefix = code.slice(0, 4)
        const record = await permissionRepository.findByShareCode(code)
        const link = record?.shareLinks.find(item => item.code === code)
        if (!record || !link) {
            await auditShareAccessDenied(this.actorId, 'share-link-invalid', { codePrefix })
            return { granted: false, reason: '链接无效' }
        }
        if (link.status !== 'active') {
            await auditShareAccessDenied(record.profileId, 'share-link-not-active', { shareLinkId: link.id, status: link.status, codePrefix }, record.resourceId, record.resourceKind)
            return { granted: false, reason: '链接无效', resourceId: record.resourceId, resourceKind: record.resourceKind }
        }
        if (link.expiresAt !== null && Date.now() > link.expiresAt) {
            await auditShareAccessDenied(record.profileId, 'share-link-expired', { shareLinkId: link.id, expiresAt: link.expiresAt, codePrefix }, record.resourceId, record.resourceKind)
            return { granted: false, reason: '链接已过期', resourceId: record.resourceId, resourceKind: record.resourceKind }
        }
        if (link.passwordHash) {
            await auditLog('permission.shared_access', {
                actorId: 'share-link',
                profileId: record.profileId,
                resourceId: record.resourceId,
                resourceKind: record.resourceKind,
                severity: 'warning',
                outcome: 'denied',
                reason: 'password-verification-unavailable',
                payload: { shareLinkId: link.id, passwordSupplied: Boolean(password) },
                source: 'PermissionBroker.verifyShareLink',
            })
            return { granted: false, reason: '当前运行时未接入 bcrypt 密码验证，拒绝访问', resourceId: record.resourceId, resourceKind: record.resourceKind }
        }

        link.accessCount += 1
        link.lastAccessAt = Date.now()
        await permissionRepository.updateShareLinks(record)
        const audit = await auditLog('permission.shared_access', {
            actorId: 'share-link',
            profileId: record.profileId,
            resourceId: record.resourceId,
            resourceKind: record.resourceKind,
            severity: 'info',
            outcome: 'allowed',
            payload: { shareLinkId: link.id, level: link.level, accessCount: link.accessCount },
            source: 'PermissionBroker.verifyShareLink',
        })
        return { granted: true, reason: '共享链接访问已授权', resourceId: record.resourceId, resourceKind: record.resourceKind, level: link.level, auditId: audit?.id }
    }

    async checkFsAccess(targetPath: string, mode: 'read' | 'write'): Promise<boolean> {
        await auditLog('permission.check', {
            actorId: this.actorId,
            profileId: this.actorId,
            severity: 'warning',
            outcome: 'denied',
            reason: 'native-fs-permission-dialog-required',
            payload: { targetPath, mode },
            source: 'PermissionBroker.checkFsAccess',
        })
        return false
    }

    async checkNetworkAccess(url: string): Promise<boolean> {
        let parsed: URL
        try {
            parsed = new URL(url)
        } catch {
            return false
        }
        const sameOrigin = typeof location !== 'undefined' && parsed.origin === location.origin
        const localOrigin = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
        const allowlist = readNetworkAllowlist()
        const granted = sameOrigin || localOrigin || allowlist.has(parsed.origin)
        await auditLog('permission.check', {
            actorId: this.actorId,
            profileId: this.actorId,
            severity: granted ? 'info' : 'warning',
            outcome: granted ? 'allowed' : 'denied',
            reason: granted ? 'network-origin-allowed' : 'network-origin-requires-confirmation',
            payload: { origin: parsed.origin, protocol: parsed.protocol, sameOrigin, localOrigin },
            source: 'PermissionBroker.checkNetworkAccess',
        })
        return granted
    }

    async grantNetworkOrigin(origin: string): Promise<void> {
        const parsed = new URL(origin)
        const allowlist = readNetworkAllowlist()
        allowlist.add(parsed.origin)
        writeNetworkAllowlist(allowlist)
        await auditLog('permission.grant', {
            actorId: this.actorId,
            profileId: this.actorId,
            severity: 'warning',
            outcome: 'success',
            payload: { origin: parsed.origin, permission: 'network-access' },
            source: 'PermissionBroker.grantNetworkOrigin',
        })
    }

    createSessionId(): string {
        return generateId()
    }
}

export const permissionBroker = new PermissionBroker()
