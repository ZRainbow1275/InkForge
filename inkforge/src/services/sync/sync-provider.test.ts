import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { buildAuthHeaders, SyncProviderError, validateSyncConfig, type SyncConfig } from './provider'
import { compareClocks, incrementClock, mergeClock } from './vector-clock'

vi.mock('./repository', () => ({
  syncRepository: {
    addLog: vi.fn().mockResolvedValue(undefined),
    enqueueOutbox: vi.fn().mockResolvedValue(undefined),
    markOutboxSynced: vi.fn().mockResolvedValue(undefined),
    markOutboxFailed: vi.fn().mockResolvedValue(undefined),
    upsertConflict: vi.fn().mockResolvedValue(undefined),
  },
}))

function createConfig(overrides: Partial<SyncConfig> = {}): SyncConfig {
  return {
    providerId: 'webdav',
    displayName: 'Team WebDAV',
    endpoint: 'https://sync.example.test/dav',
    credentials: { kind: 'token', token: 'token-1' },
    options: {},
    syncIntervalMs: 300_000,
    conflictStrategy: 'three-way-merge',
    enabled: true,
    profileId: 'profile-1',
    ...overrides,
  }
}

describe('vector clock helpers', () => {
  it('compares equal, ordered, and concurrent clocks', () => {
    expect(compareClocks({ a: 1 }, { a: 1 })).toBe('equal')
    expect(compareClocks({ a: 1 }, { a: 2 })).toBe('before')
    expect(compareClocks({ a: 3 }, { a: 2 })).toBe('after')
    expect(compareClocks({ a: 2, b: 1 }, { a: 1, b: 2 })).toBe('concurrent')
  })

  it('increments and merges profile counters without mutating inputs', () => {
    const source = { a: 1 }
    const incremented = incrementClock(source, 'a')
    expect(incremented).toEqual({ a: 2 })
    expect(source).toEqual({ a: 1 })
    expect(mergeClock({ a: 1, b: 4 }, { a: 3, c: 2 })).toEqual({ a: 3, b: 4, c: 2 })
  })
})

describe('sync provider config validation', () => {
  it('accepts a configured https token provider', () => {
    expect(validateSyncConfig(createConfig()).valid).toBe(true)
  })

  it('rejects empty endpoints and insecure git remotes', () => {
    expect(validateSyncConfig(createConfig({ endpoint: '' })).valid).toBe(false)
    expect(validateSyncConfig(createConfig({ providerId: 'git', endpoint: 'http://git.example.test/repo.git' })).errors).toContain('git remote must use https or ssh')
    expect(validateSyncConfig(createConfig({ providerId: 'git', endpoint: 'file:///tmp/repo.git' })).errors).toContain('git remote must not use file protocol')
  })

  it('does not convert password hashes into transport secrets', () => {
    expect(() => buildAuthHeaders({ kind: 'basic', username: 'u', passwordHash: 'hash-only' })).toThrow(SyncProviderError)
    expect(buildAuthHeaders({ kind: 'token', token: 'secret-token' })).toEqual({ Authorization: 'Bearer secret-token' })
  })
})

describe('SyncEngine no-provider contract', () => {
  it('reports failure when manual sync is requested without a provider', async () => {
    const { SyncEngine } = await import('./engine')
    const engine = new SyncEngine({ profileId: 'profile-1' })

    const result = await engine.sync()

    expect(result.success).toBe(false)
    expect(result.error).toContain('同步提供者未配置')
    expect(engine.getState().status).toBe('paused')
    expect(engine.getState().lastSyncAt).toBeNull()
  })

  it('keeps each engine bound to its construction profile', async () => {
    const { SyncEngine } = await import('./engine')
    const { syncRepository } = await import('./repository')
    const engine = new SyncEngine({ profileId: '  profile-2  ' })

    await engine.sync()

    expect(syncRepository.addLog).toHaveBeenLastCalledWith(expect.objectContaining({ profileId: 'profile-2' }))
    expect(() => new SyncEngine({ profileId: '   ' })).toThrow('profileId is required')
  })

  it('preserves pending changes and reports failure when no provider is configured', async () => {
    const { SyncEngine } = await import('./engine')
    const engine = new SyncEngine({ profileId: 'profile-1' })

    await engine.getChangeTracker().trackChange('doc-1', 'update', 'real content')
    const result = await engine.sync()

    expect(result.success).toBe(false)
    expect(result.error).toContain('同步提供者未配置')
    expect(engine.getChangeTracker().getPendingChanges()).toHaveLength(1)
    expect(engine.getState().status).toBe('paused')
  })

  it('detaches and restores network listeners with the engine lifecycle', async () => {
    let online = true
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    vi.stubGlobal('window', { addEventListener, removeEventListener })
    vi.stubGlobal('navigator', {
      get onLine() {
        return online
      },
    })
    const { SyncEngine } = await import('./engine')
    const engine = new SyncEngine({ profileId: 'profile-1' })
    const syncSpy = vi.spyOn(engine, 'sync')

    try {
      expect(addEventListener).toHaveBeenCalledTimes(2)
      engine.deactivate()
      expect(removeEventListener).toHaveBeenCalledTimes(2)

      online = false
      engine.activate()
      expect(addEventListener).toHaveBeenCalledTimes(4)
      expect(engine.getState().status).toBe('offline')
      expect(syncSpy).not.toHaveBeenCalled()
      engine.activate()
      expect(addEventListener).toHaveBeenCalledTimes(4)

      engine.deactivate()
      online = true
      engine.activate()
      expect(engine.getState().status).toBe('paused')
      expect(syncSpy).toHaveBeenCalledTimes(1)
    } finally {
      engine.dispose()
      vi.unstubAllGlobals()
    }
  })
})

describe('Sync store profile isolation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps pending queues and outbox attribution isolated when switching profiles', async () => {
    const { syncRepository } = await import('./repository')
    const { useSyncStore } = await import('@/stores/sync')
    const store = useSyncStore()

    store.setProfile('profile-a')
    await store.markDirty('doc-a', 'content-a')
    expect(store.pendingCount).toBe(1)

    store.setProfile('profile-b')
    expect(store.pendingCount).toBe(0)
    await store.markDirty('doc-b', 'content-b')
    expect(store.pendingCount).toBe(1)

    store.setProfile('profile-a')
    expect(store.pendingCount).toBe(1)
    expect(syncRepository.enqueueOutbox).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ articleId: 'doc-a', profileId: 'profile-a' }),
    )
    expect(syncRepository.enqueueOutbox).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ articleId: 'doc-b', profileId: 'profile-b' }),
    )
    expect(() => store.setProfile('   ')).toThrow('profileId is required')

    store.cleanup()
  })

  it('does not let an old profile sync completion overwrite the active result', async () => {
    const { syncRepository } = await import('./repository')
    const { useSyncStore } = await import('@/stores/sync')
    const store = useSyncStore()
    let releaseOldLog: (() => void) | undefined
    vi.mocked(syncRepository.addLog).mockImplementationOnce(() => new Promise<void>((resolve) => {
      releaseOldLog = resolve
    }))

    store.setProfile('profile-a')
    await store.markDirty('doc-a', 'content-a')
    const oldSync = store.sync()
    await vi.waitFor(() => expect(releaseOldLog).toBeTypeOf('function'))

    store.setProfile('profile-b')
    const activeResult = await store.sync()
    expect(activeResult.error).toBe('同步提供者未配置')
    expect(store.lastResult?.error).toBe(activeResult.error)

    releaseOldLog?.()
    const oldResult = await oldSync
    expect(oldResult.error).toContain('已保留待同步队列')
    expect(store.lastResult?.error).toBe(activeResult.error)

    store.cleanup()
  })

  it('pauses inactive profile auto-sync and resumes it when that profile is active again', async () => {
    vi.useFakeTimers()
    const { syncRepository } = await import('./repository')
    const { useSyncStore } = await import('@/stores/sync')
    const store = useSyncStore()

    try {
      store.setProfile('profile-a')
      store.startAutoSync(100)
      store.setProfile('profile-b')
      await vi.advanceTimersByTimeAsync(300)
      expect(syncRepository.addLog).not.toHaveBeenCalled()

      store.setProfile('profile-a')
      await vi.advanceTimersByTimeAsync(100)
      expect(syncRepository.addLog).toHaveBeenCalledTimes(1)

      store.stopAutoSync()
      await vi.advanceTimersByTimeAsync(300)
      expect(syncRepository.addLog).toHaveBeenCalledTimes(1)
    } finally {
      store.cleanup()
      vi.useRealTimers()
    }
  })
})
