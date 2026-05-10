import { db } from '@/utils/db'
import { generateId } from '@/utils/uuid'
import { upsertResourcePermissionSchema, type ResourcePermissionRecord, type ResourceKind, type UpsertResourcePermissionInput } from './types'

export class PermissionRepository {
    async upsertPermission(input: UpsertResourcePermissionInput): Promise<ResourcePermissionRecord> {
        const parsed = upsertResourcePermissionSchema.parse(input)
        const existing = await this.getPermission(parsed.resourceId, parsed.resourceKind)
        const now = Date.now()
        const record: ResourcePermissionRecord = {
            id: existing?.id ?? generateId(),
            resourceId: parsed.resourceId,
            resourceKind: parsed.resourceKind,
            profileId: parsed.profileId,
            level: parsed.level,
            shareLinks: existing?.shareLinks ?? [],
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        }
        await db.resourcePermissions.put(record)
        return record
    }

    async getPermission(resourceId: string, resourceKind: ResourceKind): Promise<ResourcePermissionRecord | undefined> {
        return db.resourcePermissions
            .where('[resourceKind+resourceId]')
            .equals([resourceKind, resourceId])
            .first()
    }

    async findByShareCode(code: string): Promise<ResourcePermissionRecord | undefined> {
        const records = await db.resourcePermissions.toArray()
        return records.find(record => record.shareLinks.some(link => link.code === code))
    }

    async updateShareLinks(record: ResourcePermissionRecord): Promise<void> {
        await db.resourcePermissions.update(record.id, {
            shareLinks: record.shareLinks,
            updatedAt: Date.now(),
        })
    }
}

export const permissionRepository = new PermissionRepository()
