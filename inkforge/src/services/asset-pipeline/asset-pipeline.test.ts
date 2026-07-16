import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { db, type AssetRecord } from '@/utils/db'
import { useAssetStore } from '@/stores/asset'
import {
  AssetPipelineError,
  AssetPipelineRepository,
  AssetPipelineService,
  assetPipeline,
  buildAssetIdFromHash,
  calculateBlobSha256,
  resolveAssetSnapshot,
  ORPHAN_ASSET_GRACE_MS,
  type AssetRefRecord,
} from './index'

const assets = new Map<string, AssetRecord>()
const refs = new Map<string, AssetRefRecord>()

interface QueryResult<T> {
  toArray: () => Promise<T[]>
  count: () => Promise<number>
  delete: () => Promise<number>
}

function assetFieldValue(asset: AssetRecord, index: string): unknown {
  return asset[index as keyof AssetRecord]
}

function refFieldValue(ref: AssetRefRecord, index: string): unknown {
  return ref[index as keyof AssetRefRecord]
}

function valuesMatch(left: unknown, right: unknown): boolean {
  return Array.isArray(left) || Array.isArray(right)
    ? JSON.stringify(left) === JSON.stringify(right)
    : left === right
}

function createQueryResult<T extends { id: string }>(source: Map<string, T>, rows: T[]): QueryResult<T> {
  return {
    toArray: async () => rows,
    count: async () => rows.length,
    delete: async () => {
      for (const row of rows) {
        source.delete(row.id)
      }
      return rows.length
    },
  }
}

function createAssetWhere(index: string) {
  return {
    equals: (value: unknown) => createQueryResult(
      assets,
      Array.from(assets.values()).filter(asset => valuesMatch(assetFieldValue(asset, index), value)),
    ),
  }
}

function createRefWhere(index: string) {
  return {
    equals: (value: unknown) => createQueryResult(
      refs,
      Array.from(refs.values()).filter(ref => valuesMatch(refFieldValue(ref, index), value)),
    ),
  }
}

beforeEach(() => {
  assets.clear()
  refs.clear()

  vi.spyOn(db.assets, 'get').mockImplementation((async (key: string) => assets.get(String(key))) as never)
  vi.spyOn(db.assets, 'bulkGet').mockImplementation((async (keys: string[]) => keys.map(key => assets.get(String(key)))) as never)
  vi.spyOn(db.assets, 'add').mockImplementation((async (record: AssetRecord) => {
    assets.set(record.id, record)
    return record.id
  }) as never)
  vi.spyOn(db.assets, 'update').mockImplementation((async (key: string, changes: Partial<AssetRecord>) => {
    const current = assets.get(String(key))
    if (!current) return 0
    assets.set(current.id, { ...current, ...changes })
    return 1
  }) as never)
  vi.spyOn(db.assets, 'delete').mockImplementation((async (key: string) => {
    assets.delete(String(key))
  }) as never)
  vi.spyOn(db.assets, 'where').mockImplementation(((index: string) => createAssetWhere(index)) as never)
  vi.spyOn(db.assets, 'toArray').mockImplementation((async () => Array.from(assets.values())) as never)

  vi.spyOn(db.assetRefs, 'get').mockImplementation((async (key: string) => refs.get(String(key))) as never)
  vi.spyOn(db.assetRefs, 'add').mockImplementation((async (record: AssetRefRecord) => {
    refs.set(record.id, record)
    return record.id
  }) as never)
  vi.spyOn(db.assetRefs, 'delete').mockImplementation((async (key: string) => {
    refs.delete(String(key))
  }) as never)
  vi.spyOn(db.assetRefs, 'bulkDelete').mockImplementation((async (keys: string[]) => {
    for (const key of keys) refs.delete(key)
  }) as never)
  vi.spyOn(db.assetRefs, 'where').mockImplementation(((index: string) => createRefWhere(index)) as never)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('asset pipeline hashing and MIME classification', () => {
  it('uses real Web Crypto SHA-256 bytes for deterministic content ids', async () => {
    const hash = await calculateBlobSha256(new Blob(['hello'], { type: 'text/plain' }))

    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
    expect(buildAssetIdFromHash(hash)).toBe('2cf24dba5fb0a30e')
  })

  it('rejects unsupported MIME types without writing asset rows', async () => {
    const service = new AssetPipelineService(new AssetPipelineRepository())

    await expect(service.ingestBlob(new Blob(['binary'], { type: 'application/x-msdownload' }), {
      originalName: 'tool.exe',
      mimeType: 'application/x-msdownload',
    })).rejects.toBeInstanceOf(AssetPipelineError)

    expect(assets.size).toBe(0)
    expect(refs.size).toBe(0)
  })
})

describe('asset pipeline ingest and dedupe', () => {
  it('deduplicates identical bytes and increments real references', async () => {
    const service = new AssetPipelineService(new AssetPipelineRepository())
    const first = await service.ingestBlob(new Blob(['same bytes'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'note-a.txt',
      referrer: { kind: 'article', id: 'article-1' },
    })
    const second = await service.ingestBlob(new Blob(['same bytes'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'note-b.txt',
      referrer: { kind: 'article', id: 'article-2' },
    })

    expect(first.asset.id).toBe(second.asset.id)
    expect(first.isNew).toBe(true)
    expect(second.isNew).toBe(false)
    expect(assets.size).toBe(1)
    expect(refs.size).toBe(2)
    expect(assets.get(first.asset.id)?.refCount).toBe(2)
    expect(assets.get(first.asset.id)?.category).toBe('attachment')
    expect(assets.get(first.asset.id)?.blob).toBeInstanceOf(Blob)
  })

  it('lists a deduplicated asset through each article reference and isolates reference removal', async () => {
    const service = new AssetPipelineService(new AssetPipelineRepository())
    const first = await service.ingestBlob(new Blob(['shared bytes'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'shared-a.txt',
      referrer: { kind: 'article', id: 'article-1' },
    })
    await service.ingestBlob(new Blob(['shared bytes'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'shared-b.txt',
      referrer: { kind: 'article', id: 'article-2' },
    })

    await expect(service.listAssets({ articleId: 'article-1' })).resolves.toMatchObject([{ id: first.asset.id }])
    await expect(service.listAssets({ articleId: 'article-2' })).resolves.toMatchObject([{ id: first.asset.id }])

    await service.removeReference(first.asset.id, { kind: 'article', id: 'article-1' })

    await expect(service.listAssets({ articleId: 'article-1' })).resolves.toEqual([])
    await expect(service.listAssets({ articleId: 'article-2' })).resolves.toMatchObject([{ id: first.asset.id }])
    expect(assets.has(first.asset.id)).toBe(true)
    expect(refs.size).toBe(1)
  })

  it('stores attachments without image-only thumbnail processing', async () => {
    const service = new AssetPipelineService(new AssetPipelineRepository())

    const result = await service.ingestBlob(new Blob(['id,name\n1,Ada'], { type: 'text/csv' }), {
      profileId: 'profile-1',
      originalName: 'contacts.csv',
    })

    expect(result.asset.type).toBe('file')
    expect(result.asset.category).toBe('attachment')
    expect(result.asset.thumbnail).toBeUndefined()
    expect(result.asset.contentHash).toHaveLength(64)
    expect(result.asset.originalName).toBe('contacts.csv')
  })

  it('backfills a legacy article owner before another article reference can remove the asset', async () => {
    const repository = new AssetPipelineRepository()
    const service = new AssetPipelineService(repository)
    const legacy = await service.ingestBlob(new Blob(['legacy shared bytes'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'legacy.txt',
    })
    assets.set(legacy.asset.id, {
      ...legacy.asset,
      articleId: 'article-1',
      legacyArticleRefMigrated: undefined,
    })
    await repository.addRef({
      assetId: legacy.asset.id,
      profileId: 'profile-1',
      kind: 'article',
      id: 'article-2',
    })

    await expect(service.listAssets({ articleId: 'article-1' })).resolves.toMatchObject([{ id: legacy.asset.id }])
    expect(Array.from(refs.values()).map(ref => ref.referrerId).sort()).toEqual(['article-1', 'article-2'])

    await service.removeReference(legacy.asset.id, { kind: 'article', id: 'article-2' })

    await expect(service.listAssets({ articleId: 'article-1' })).resolves.toMatchObject([{ id: legacy.asset.id }])
    expect(assets.has(legacy.asset.id)).toBe(true)
    expect(Array.from(refs.values()).map(ref => ref.referrerId)).toEqual(['article-1'])
  })

  it('returns every matching asset when no explicit page limit is requested', async () => {
    const service = new AssetPipelineService(new AssetPipelineRepository())
    for (let index = 0; index < 101; index += 1) {
      await service.ingestBlob(new Blob([`asset-${index}`], { type: 'text/plain' }), {
        profileId: 'profile-1',
        originalName: `asset-${index}.txt`,
      })
    }

    await expect(service.listAssets({ profileId: 'profile-1' })).resolves.toHaveLength(101)
    await expect(service.listAssets({ profileId: 'profile-1', limit: 10, offset: 5 })).resolves.toHaveLength(10)
  })
})

describe('asset store article switching', () => {
  it('keeps the newest article result when older loading finishes later', async () => {
    const service = new AssetPipelineService(new AssetPipelineRepository())
    const first = await service.ingestBlob(new Blob(['article-a'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'article-a.txt',
    })
    const second = await service.ingestBlob(new Blob(['article-b'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'article-b.txt',
    })
    let resolveFirst: ((records: AssetRecord[]) => void) | undefined
    let resolveSecond: ((records: AssetRecord[]) => void) | undefined
    const firstRequest = new Promise<AssetRecord[]>(resolve => { resolveFirst = resolve })
    const secondRequest = new Promise<AssetRecord[]>(resolve => { resolveSecond = resolve })
    vi.spyOn(assetPipeline, 'listAssets').mockImplementation(options => (
      options?.articleId === 'article-a' ? firstRequest : secondRequest
    ))
    setActivePinia(createPinia())
    const store = useAssetStore()

    const olderLoad = store.loadAssets('article-a')
    const newerLoad = store.loadAssets('article-b')
    resolveSecond?.([second.asset])
    await newerLoad
    resolveFirst?.([first.asset])
    await olderLoad

    expect(store.assets.map(asset => asset.id)).toEqual([second.asset.id])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})

describe('asset references and orphan cleanup', () => {
  it('marks unreferenced assets as orphaned and honors the 24h grace window', async () => {
    const repository = new AssetPipelineRepository()
    const service = new AssetPipelineService(repository)
    const result = await service.ingestBlob(new Blob(['orphan candidate'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'orphan.txt',
      referrer: { kind: 'article', id: 'article-1' },
    })

    await service.removeReference(result.asset.id, { kind: 'article', id: 'article-1' })
    const orphaned = assets.get(result.asset.id)
    expect(orphaned?.refCount).toBe(0)
    expect(orphaned?.lifecycle).toBe('orphaned')
    expect(orphaned?.orphanedAt).toEqual(expect.any(Number))

    const withinGrace = await service.purgeExpiredOrphans({ now: orphaned!.orphanedAt! + 60_000 })
    expect(withinGrace).toBe(0)
    expect(assets.has(result.asset.id)).toBe(true)

    const afterGrace = await service.purgeExpiredOrphans({ now: orphaned!.orphanedAt! + ORPHAN_ASSET_GRACE_MS + 1 })
    expect(afterGrace).toBe(1)
    expect(assets.has(result.asset.id)).toBe(false)
  })
})

describe('asset snapshots and external URL boundaries', () => {
  it('builds inline base64 snapshots from the stored IndexedDB Blob on demand', async () => {
    const service = new AssetPipelineService(new AssetPipelineRepository())
    const result = await service.ingestBlob(new Blob(['snapshot'], { type: 'text/plain' }), {
      profileId: 'profile-1',
      originalName: 'snapshot.txt',
    })

    const snapshot = await resolveAssetSnapshot(result.asset.id, 'inline-base64')

    expect(snapshot.status).toBe('inline-base64')
    expect(snapshot.dataUrl).toBe('data:text/plain;base64,c25hcHNob3Q=')
    expect(snapshot.bytes).toBe(8)
  })

  it('fails URL ingest honestly when the remote resource is not fetchable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 403,
      headers: new Headers(),
      blob: async () => new Blob([], { type: 'text/plain' }),
    })))
    const service = new AssetPipelineService(new AssetPipelineRepository())

    await expect(service.ingestUrl('https://example.invalid/image.png', {
      profileId: 'profile-1',
    })).rejects.toMatchObject({ code: 'fetch_failed' })
    expect(assets.size).toBe(0)
  })
})
