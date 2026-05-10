import { describe, expect, it, vi } from 'vitest'
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
})
