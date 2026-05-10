import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkUpdate } from '@tauri-apps/api/updater'
import {
  UPDATER_FALLBACK_RELEASE_URL,
  UPDATER_SKIPPED_FALLBACK_KEY,
  compareSemver,
  createTauriUpdaterAdapter,
  createUpdaterService,
  createUpdaterSkipStore,
  evaluateUpdaterPolicy,
  isVersionGreaterThan,
  releaseUrlForVersion,
  stripUnsafeReleaseNoteImages,
  type SkippedVersionRecord,
  type UpdaterAdapter,
  type UpdaterSettings,
  type UpdaterSkipReason,
  type UpdaterSkipStore,
} from './index'

function createSettings(overrides: Partial<UpdaterSettings> = {}): UpdaterSettings {
  return {
    autoCheckDisabled: false,
    lastCheckAt: null,
    lastSuccessfulCheckAt: null,
    lastStatus: 'idle',
    lastDisabledReason: null,
    lastErrorMessage: null,
    latest: null,
    notifiedVersions: [],
    ...overrides,
  }
}

class MemorySkipStore implements UpdaterSkipStore {
  records = new Map<string, SkippedVersionRecord>()

  async list(): Promise<SkippedVersionRecord[]> {
    return [...this.records.values()]
  }

  async isSkipped(version: string): Promise<boolean> {
    return this.records.has(version)
  }

  async skip(version: string, reason: UpdaterSkipReason = 'user', now = 1): Promise<SkippedVersionRecord> {
    const record = { version, skippedAt: now, reason }
    this.records.set(version, record)
    return record
  }

  async clear(): Promise<void> {
    this.records.clear()
  }
}

function availableAdapter(version: string): UpdaterAdapter {
  return {
    async check() {
      return {
        status: 'available',
        update: {
          version,
          releasedAt: 1,
          notes: '# Release',
          size: 1024,
          signatureOk: true,
          releaseUrl: releaseUrlForVersion(UPDATER_FALLBACK_RELEASE_URL, version),
        },
      }
    },
  }
}

vi.mock('@tauri-apps/api/updater', () => ({
  checkUpdate: vi.fn(),
}))

afterEach(() => {
  vi.mocked(checkUpdate).mockReset()
  vi.unstubAllGlobals()
})

function createMemoryStorage() {
  const values = new Map<string, string>()

  return {
    getItem(key: string): string | null {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      values.set(key, value)
    },
    removeItem(key: string): void {
      values.delete(key)
    },
  }
}

describe('updater version helpers', () => {
  it('compares semantic versions and v-prefixed tags', () => {
    expect(compareSemver('v0.2.0', '0.1.9')).toBeGreaterThan(0)
    expect(compareSemver('0.1.0', 'v0.1.0')).toBe(0)
    expect(isVersionGreaterThan('0.1.1', '0.1.0')).toBe(true)
  })

  it('builds real GitHub release tag urls', () => {
    expect(releaseUrlForVersion('https://github.com/ZRainbow1275/InkForge/releases/', '0.2.0'))
      .toBe('https://github.com/ZRainbow1275/InkForge/releases/tag/v0.2.0')
  })
})

describe('updater policy', () => {
  it('returns typed disable reasons for user, env, enterprise, offline, runtime, and build gates', () => {
    const base = { settings: createSettings(), now: 100, buildActive: true }
    expect(evaluateUpdaterPolicy({ ...base, settings: createSettings({ autoCheckDisabled: true }) }).reason).toBe('user-setting')
    expect(evaluateUpdaterPolicy({ ...base, envUpdaterValue: '0' }).reason).toBe('env')
    expect(evaluateUpdaterPolicy({ ...base, enterpriseDisabled: true }).reason).toBe('enterprise-policy')
    expect(evaluateUpdaterPolicy({ ...base, navigatorOnline: false, offlineSince: -90_000_000 }).reason).toBe('offline')
    expect(evaluateUpdaterPolicy({ ...base, runtimeAvailable: false }).reason).toBe('runtime-unavailable')
    expect(evaluateUpdaterPolicy({ ...base, buildActive: false }).reason).toBe('build-config')
  })

  it('allows checks when no disable policy is active', () => {
    const result = evaluateUpdaterPolicy({
      settings: createSettings(),
      now: 100,
      navigatorOnline: true,
      buildActive: true,
    })
    expect(result.disabled).toBe(false)
    expect(result.reason).toBeNull()
  })
})

describe('updater service', () => {
  it('does not require install/download methods for a check-only adapter', async () => {
    const skipStore = new MemorySkipStore()
    const service = createUpdaterService({
      currentVersion: '0.1.0',
      adapter: availableAdapter('0.2.0'),
      skipStore,
      now: () => 10,
      readEnterpriseDisabled: async () => false,
      readEnvValue: () => undefined,
      buildActive: () => true,
    })

    const result = await service.checkNow(createSettings(), { source: 'startup', force: true })
    expect(result.status).toBe('available')
    expect(result.update?.version).toBe('0.2.0')
    expect(result.skipped).toBe(false)
  })

  it('keeps skipped versions visible but suppressible', async () => {
    const skipStore = new MemorySkipStore()
    await skipStore.skip('0.2.0', 'user', 5)
    const service = createUpdaterService({
      currentVersion: '0.1.0',
      adapter: availableAdapter('0.2.0'),
      skipStore,
      now: () => 10,
      readEnterpriseDisabled: async () => false,
      readEnvValue: () => undefined,
      buildActive: () => true,
    })

    const result = await service.checkNow(createSettings(), { source: 'startup', force: true })
    expect(result.status).toBe('available')
    expect(result.skipped).toBe(true)
  })

  it('does not let a lower skipped version suppress a higher release', async () => {
    const service = createUpdaterService({ currentVersion: '0.1.0', adapter: availableAdapter('0.3.0') })
    expect(service.isHigherThanSkipped({ version: '0.3.0', releasedAt: null, notes: '', size: null, signatureOk: true, releaseUrl: '' }, [{ version: '0.2.0' }])).toBe(true)
    expect(service.isHigherThanSkipped({ version: '0.2.0', releasedAt: null, notes: '', size: null, signatureOk: true, releaseUrl: '' }, [{ version: '0.2.0' }])).toBe(false)
  })

  it('returns signature-failed without exposing an update', async () => {
    const service = createUpdaterService({
      currentVersion: '0.1.0',
      adapter: { async check() { return { status: 'signature-failed', update: null, message: 'signature mismatch' } } },
      skipStore: new MemorySkipStore(),
      readEnterpriseDisabled: async () => false,
      readEnvValue: () => undefined,
      buildActive: () => true,
    })

    const result = await service.checkNow(createSettings(), { source: 'startup', force: true })
    expect(result.status).toBe('signature-failed')
    expect(result.update).toBeNull()
  })
})


describe('tauri updater adapter', () => {
  it('maps Tauri v1 checkUpdate results without invoking install APIs', async () => {
    vi.stubGlobal('window', { __TAURI_IPC__: () => undefined })
    vi.mocked(checkUpdate).mockResolvedValueOnce({
      shouldUpdate: true,
      manifest: {
        version: '0.2.0',
        date: '2026-05-03T00:00:00.000Z',
        body: '# Real release',
      },
    } as Awaited<ReturnType<typeof checkUpdate>>)

    const adapter = createTauriUpdaterAdapter('0.1.0')
    const result = await adapter.check()

    expect(checkUpdate).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('available')
    expect(result.update?.version).toBe('0.2.0')
    expect(result.update?.notes).toBe('# Real release')
  })

  it('returns unavailable in web runtime before touching Tauri APIs', async () => {
    const adapter = createTauriUpdaterAdapter('0.1.0')
    const result = await adapter.check()

    expect(checkUpdate).not.toHaveBeenCalled()
    expect(result.status).toBe('unavailable')
  })
})

describe('updater skip store', () => {
  it('falls back to localStorage-compatible persistence when Dexie is unavailable', async () => {
    const storage = createMemoryStorage()
    const skipStore = createUpdaterSkipStore(storage)

    await skipStore.skip('0.2.0', 'user', 42)

    expect(storage.getItem(UPDATER_SKIPPED_FALLBACK_KEY)).toContain('0.2.0')
    expect(await skipStore.isSkipped('0.2.0')).toBe(true)
    expect(await skipStore.list()).toEqual([{ version: '0.2.0', skippedAt: 42, reason: 'user' }])

    await skipStore.clear()
    expect(storage.getItem(UPDATER_SKIPPED_FALLBACK_KEY)).toBeNull()
  })
})

describe('release notes safety', () => {
  it('strips non-whitelisted release-note images before rendering', () => {
    const result = stripUnsafeReleaseNoteImages('![ok](https://github.com/a/b.png) ![bad](https://evil.test/a.png)')
    expect(result.markdown).toContain('https://github.com/a/b.png')
    expect(result.markdown).not.toContain('https://evil.test/a.png')
    expect(result.strippedImageCount).toBe(1)
  })
})
