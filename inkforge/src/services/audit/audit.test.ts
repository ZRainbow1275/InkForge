import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/utils/db'
import { buildAuditHashSource, computeAuditHash, stableStringify, verifyAuditRecord } from './integrity'
import { auditRepository } from './repository'
import { sanitizeAuditPayload } from './sanitize'
import type { AuditEntry, AuditLogRecord } from './types'

function createAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
    return {
        id: 'audit-1',
        action: 'permission.check',
        actorId: 'profile-1',
        profileId: 'profile-1',
        resourceId: 'doc-1',
        resourceKind: 'document',
        timestamp: 1_712_000_000_000,
        severity: 'warning',
        outcome: 'denied',
        reason: 'permission-denied',
        payload: { requiredLevel: 'write', nested: { token: 'secret-token', safe: 'visible' } },
        source: 'audit.test',
        ...overrides,
    }
}

function createAuditRecord(entry: AuditEntry, prevHash: string | null, entryHash: string): AuditLogRecord {
    return {
        ...entry,
        schemaVersion: 1,
        integrityVersion: 1,
        prevHash,
        entryHash,
        integrityStatus: 'verified',
        createdAt: entry.timestamp + 1,
    }
}

function createWhereResult(entries: AuditLogRecord[]) {
    return {
        equals: () => ({
            toArray: async () => entries,
        }),
    } as unknown as ReturnType<typeof db.auditLogs.where>
}

function stubLocalStorage(): Map<string, string> {
    const storage = new Map<string, string>()
    const localStorageStub = {
        get length() {
            return storage.size
        },
        clear: vi.fn(() => storage.clear()),
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => {
            storage.delete(key)
        }),
        setItem: vi.fn((key: string, value: string) => {
            storage.set(key, value)
        }),
    } satisfies Storage
    vi.stubGlobal('localStorage', localStorageStub)
    return storage
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('audit payload sanitization', () => {
    it('redacts secrets and high-risk content while preserving safe metadata', () => {
        const file = new File(['real markdown'], 'draft.md', { type: 'text/markdown' })
        const payload = sanitizeAuditPayload({
            password: 'pass-1',
            authorization: 'Bearer token',
            rawContent: '# secret draft',
            nested: { accessToken: 'token-1', label: 'safe' },
            file,
            blob: new Blob(['image'], { type: 'image/png' }),
        })

        expect(payload.password).toBe('[redacted]')
        expect(payload.authorization).toBe('[redacted]')
        expect(payload.rawContent).toBe('[redacted]')
        expect(payload.nested).toEqual({ accessToken: '[redacted]', label: 'safe' })
        expect(payload.file).toEqual({ kind: 'File', name: 'draft.md', size: 13, type: 'text/markdown' })
        expect(payload.blob).toEqual({ kind: 'Blob', size: 5, type: 'image/png' })
    })

    it('caps excessively long strings and deep objects deterministically', () => {
        const payload = sanitizeAuditPayload({
            note: 'x'.repeat(2_100),
            level1: { level2: { level3: { level4: { level5: { level6: { level7: 'stop' } } } } } },
        })

        expect(String(payload.note)).toHaveLength(2_003)
        expect(String(payload.note).endsWith('...')).toBe(true)
        expect(payload.level1).toEqual({ level2: { level3: { level4: { level5: { level6: '[max-depth]' } } } } })
    })
})

describe('audit integrity hash chain', () => {
    it('serializes object keys in stable order', () => {
        expect(stableStringify({ b: 2, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":2}')
    })

    it('binds the previous hash into the entry hash', async () => {
        const entry = createAuditEntry()
        const firstHash = await computeAuditHash(entry, null)
        const chainedHash = await computeAuditHash(entry, firstHash)

        expect(firstHash).toMatch(/^[a-f0-9]{64}$/u)
        expect(chainedHash).toMatch(/^[a-f0-9]{64}$/u)
        expect(chainedHash).not.toBe(firstHash)
        expect(buildAuditHashSource(entry, firstHash)).toContain(firstHash)
    })

    it('detects tampering without relying on mock storage', async () => {
        const entry = createAuditEntry()
        const entryHash = await computeAuditHash(entry, null)
        const record: AuditLogRecord = {
            ...entry,
            schemaVersion: 1,
            integrityVersion: 1,
            prevHash: null,
            entryHash,
            integrityStatus: 'verified',
            createdAt: entry.timestamp + 1,
        }

        expect(await verifyAuditRecord(record)).toBe(true)
        expect(await verifyAuditRecord({ ...record, payload: { requiredLevel: 'admin' } })).toBe(false)
        expect(await verifyAuditRecord({ ...record, integrityStatus: 'unavailable' })).toBe(false)
    })
})

describe('audit repository hardening', () => {
    it('stores fallback evidence and reports null when IndexedDB append fails', async () => {
        const fallbackStorage = stubLocalStorage()
        vi.spyOn(db.auditLogs, 'where').mockReturnValue(createWhereResult([]))
        vi.spyOn(db.auditLogs, 'add').mockRejectedValue(new Error('quota exceeded'))

        const result = await auditRepository.log('permission.check', {
            actorId: 'profile-1',
            profileId: 'profile-1',
            resourceId: 'doc-1',
            resourceKind: 'document',
            severity: 'warning',
            outcome: 'denied',
            reason: 'permission-denied',
            payload: { token: 'secret-token', safe: 'visible' },
            source: 'audit.test',
        })

        expect(result).toBeNull()
        const [fallbackKey, fallbackValue] = Array.from(fallbackStorage.entries())[0]
        expect(fallbackKey).toContain('inkforge-audit-fallback-')
        expect(fallbackValue).toContain('permission.check')
        expect(fallbackValue).toContain('[redacted]')
    })

    it('accepts a retained hash-chain anchor after old ledger entries are cleaned up', async () => {
        const firstEntry = createAuditEntry({ id: 'audit-1', timestamp: 1_712_000_000_000 })
        const firstHash = await computeAuditHash(firstEntry, null)
        const secondEntry = createAuditEntry({ id: 'audit-2', timestamp: 1_712_000_000_100 })
        const secondHash = await computeAuditHash(secondEntry, firstHash)
        const retainedRecord = createAuditRecord(secondEntry, firstHash, secondHash)
        vi.spyOn(db.auditLogs, 'where').mockReturnValue(createWhereResult([retainedRecord]))

        await expect(auditRepository.verifyIntegrity('profile-1')).resolves.toEqual({
            checked: 1,
            valid: true,
            firstBrokenEntryId: null,
            reason: null,
        })
    })
})
