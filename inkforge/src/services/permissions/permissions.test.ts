import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PermissionStore } from '@/services/auth'
import { buildShareUrl, createShareLink, generateShareCode } from './share-link'
import { PermissionBroker } from './broker'
import { permissionRepository } from './repository'
import { isResourceKind, upsertResourcePermissionSchema, type ResourcePermissionRecord, type ShareLink } from './types'

const auditLogMock = vi.hoisted(() => vi.fn(async () => ({ id: 'audit-test' })))

vi.mock('@/services/audit', () => ({
    auditLog: auditLogMock,
}))

function createPermissionRecord(overrides: Partial<ResourcePermissionRecord> = {}): ResourcePermissionRecord {
    return {
        id: 'permission-1',
        resourceId: 'doc-1',
        resourceKind: 'document',
        profileId: 'owner-profile',
        level: 'private',
        shareLinks: [],
        createdAt: 1_712_000_000_000,
        updatedAt: 1_712_000_000_000,
        ...overrides,
    }
}

function createStoredShareLink(overrides: Partial<ShareLink> = {}): ShareLink {
    return {
        id: 'share-link-1',
        code: 'ABCDEFGH',
        level: 'shared-read',
        expiresAt: null,
        passwordHash: null,
        createdAt: 1_712_000_000_000,
        accessCount: 0,
        status: 'active',
        ...overrides,
    }
}

function createRelationStore(allowed: boolean): PermissionStore {
    return {
        check: vi.fn(async () => allowed),
        writeRelation: vi.fn(async () => undefined),
        deleteRelation: vi.fn(async () => undefined),
    } as unknown as PermissionStore
}

beforeEach(() => {
    auditLogMock.mockClear()
    auditLogMock.mockResolvedValue({ id: 'audit-test' })
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('permission resource schemas', () => {
    it('validates resource kinds and permission levels strictly', () => {
        expect(isResourceKind('document')).toBe(true)
        expect(isResourceKind('unknown')).toBe(false)
        expect(upsertResourcePermissionSchema.parse({
            profileId: 'profile-1',
            resourceKind: 'document',
            resourceId: 'doc-1',
            level: 'shared-edit',
        })).toEqual({
            profileId: 'profile-1',
            resourceKind: 'document',
            resourceId: 'doc-1',
            level: 'shared-edit',
        })
        expect(() => upsertResourcePermissionSchema.parse({
            profileId: '',
            resourceKind: 'document',
            resourceId: 'doc-1',
            level: 'shared-edit',
        })).toThrow()
    })
})

describe('permission share links', () => {
    it('generates URL-safe short codes using runtime crypto', () => {
        const codes = new Set(Array.from({ length: 64 }, () => generateShareCode()))

        expect(codes.size).toBe(64)
        for (const code of codes) {
            expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8}$/u)
        }
    })

    it('creates active links without exposing a plaintext password', () => {
        const link = createShareLink({ level: 'shared-read', expiresAt: null, passwordHash: 'hash-only' })

        expect(link.code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8}$/u)
        expect(link.status).toBe('active')
        expect(link.accessCount).toBe(0)
        expect(link.passwordHash).toBe('hash-only')
    })

    it('builds app and web share URLs without trailing-slash drift', () => {
        expect(buildShareUrl('abc12345', 'https://app.inkforge.io/')).toEqual({
            appUrl: 'inkforge://share/abc12345',
            webUrl: 'https://app.inkforge.io/share/abc12345',
        })
    })
})

describe('permission broker enforcement', () => {
    it('requires owner semantics for private checks instead of viewer access', async () => {
        const relationStore = createRelationStore(false)
        const broker = new PermissionBroker(relationStore, 'local-actor')
        vi.spyOn(permissionRepository, 'getPermission').mockResolvedValue(createPermissionRecord())

        const result = await broker.check('viewer-profile', 'doc-1', 'document', 'private')

        expect(result.granted).toBe(false)
        expect(result.reason).toBe('permission-denied')
        expect(relationStore.check).toHaveBeenCalledWith(expect.objectContaining({ permission: 'delete' }))
        expect(auditLogMock).toHaveBeenCalledWith('permission.check', expect.objectContaining({
            outcome: 'denied',
            payload: expect.objectContaining({ ownerOnly: true, permission: 'delete' }),
        }))
    })

    it('allows private checks only when an owner relation is present', async () => {
        const relationStore = createRelationStore(true)
        const broker = new PermissionBroker(relationStore, 'local-actor')
        vi.spyOn(permissionRepository, 'getPermission').mockResolvedValue(createPermissionRecord({ profileId: 'different-owner' }))

        const result = await broker.check('owner-by-relation', 'doc-1', 'document', 'private')

        expect(result.granted).toBe(true)
        expect(result.reason).toBe('owner-relation')
        expect(result.actualLevel).toBe('owner')
    })

    it('does not create an owner permission record while creating a share link', async () => {
        const broker = new PermissionBroker(createRelationStore(false), 'local-actor')
        vi.spyOn(permissionRepository, 'getPermission').mockResolvedValue(undefined)
        const upsertSpy = vi.spyOn(permissionRepository, 'upsertPermission').mockResolvedValue(createPermissionRecord())

        await expect(broker.createShareLink('profile-1', 'doc-1', 'document', { level: 'shared-read', expiresAt: null })).rejects.toThrow('必须存在资源 Owner 权限记录')

        expect(upsertSpy).not.toHaveBeenCalled()
        expect(auditLogMock).toHaveBeenCalledWith('permission.share_link.create', expect.objectContaining({
            outcome: 'denied',
            reason: 'permission-record-missing',
        }))
    })

    it('denies non-owner share link creation with audit evidence', async () => {
        const broker = new PermissionBroker(createRelationStore(false), 'local-actor')
        vi.spyOn(permissionRepository, 'getPermission').mockResolvedValue(createPermissionRecord({ profileId: 'owner-profile' }))

        await expect(broker.createShareLink('other-profile', 'doc-1', 'document', { level: 'shared-read', expiresAt: null })).rejects.toThrow('只有资源 Owner Profile 可以创建共享链接')

        expect(auditLogMock).toHaveBeenCalledWith('permission.share_link.create', expect.objectContaining({
            actorId: 'other-profile',
            profileId: 'owner-profile',
            outcome: 'denied',
            reason: 'owner-profile-required',
        }))
    })

    it('audits invalid and expired share link attempts without storing the full code', async () => {
        const broker = new PermissionBroker(createRelationStore(false), 'local-actor')
        vi.spyOn(permissionRepository, 'findByShareCode').mockResolvedValueOnce(undefined)

        await expect(broker.verifyShareLink('ABCDEFGH')).resolves.toMatchObject({ granted: false, reason: '链接无效' })
        expect(auditLogMock).toHaveBeenCalledWith('permission.shared_access', expect.objectContaining({
            profileId: 'local-actor',
            outcome: 'denied',
            reason: 'share-link-invalid',
            payload: { codePrefix: 'ABCD' },
        }))

        auditLogMock.mockClear()
        const expiredLink = createStoredShareLink({ expiresAt: Date.now() - 1_000 })
        vi.spyOn(permissionRepository, 'findByShareCode').mockResolvedValueOnce(createPermissionRecord({ shareLinks: [expiredLink] }))
        const updateSpy = vi.spyOn(permissionRepository, 'updateShareLinks').mockResolvedValue(undefined)

        await expect(broker.verifyShareLink(expiredLink.code)).resolves.toMatchObject({ granted: false, reason: '链接已过期' })
        expect(updateSpy).not.toHaveBeenCalled()
        expect(auditLogMock).toHaveBeenCalledWith('permission.shared_access', expect.objectContaining({
            profileId: 'owner-profile',
            outcome: 'denied',
            reason: 'share-link-expired',
            payload: expect.objectContaining({ codePrefix: 'ABCD', shareLinkId: expiredLink.id }),
        }))
    })
})
