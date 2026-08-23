/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  createConfiguredSyncProvider,
  getDefaultSyncProfileConfiguration,
  loadSyncProfileConfiguration,
  saveSyncProfileConfiguration,
  toRuntimeSyncConfig,
  validateSyncProfileConfiguration,
} from './configuration'
import { buildAuthHeaders, SyncProviderError } from './provider'

function configuredWebDav() {
  return {
    ...getDefaultSyncProfileConfiguration('profile-real'),
    providerId: 'webdav' as const,
    displayName: '个人 WebDAV',
    endpoint: 'http://127.0.0.1:1/dav',
    authMode: 'basic' as const,
    username: 'inkforge-user',
    enabled: true,
  }
}

describe('sync configuration metadata', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('persists only validated non-secret metadata per profile', () => {
    const saved = saveSyncProfileConfiguration(configuredWebDav())
    expect(saved.ok).toBe(true)

    const raw = localStorage.getItem('inkforge-sync-configuration-v1')
    expect(raw).toContain('profile-real')
    expect(raw).toContain('inkforge-user')
    expect(raw).not.toContain('password')
    expect(raw).not.toContain('token')
    expect(raw).not.toContain('passphrase')

    const loaded = loadSyncProfileConfiguration('profile-real')
    expect(loaded).toEqual(saved)
  })

  it('rejects incomplete provider and authentication combinations', () => {
    expect(validateSyncProfileConfiguration({
      ...configuredWebDav(),
      endpoint: '',
    })).toEqual({ ok: false, message: '同步端点不能为空' })

    expect(validateSyncProfileConfiguration({
      ...configuredWebDav(),
      authMode: 'ssh',
      keyPath: 'C:/keys/id_ed25519',
    })).toEqual({ ok: false, message: 'SSH 认证仅适用于 Git Provider' })
  })

  it('materializes a runtime-only basic secret without weakening legacy hash protection', () => {
    const runtime = toRuntimeSyncConfig(configuredWebDav(), 'runtime-only-secret')
    expect(runtime.credentials).toEqual({
      kind: 'basic-secret',
      username: 'inkforge-user',
      password: 'runtime-only-secret',
    })
    expect(buildAuthHeaders(runtime.credentials)).toEqual({
      Authorization: 'Basic aW5rZm9yZ2UtdXNlcjpydW50aW1lLW9ubHktc2VjcmV0',
    })
    expect(() => buildAuthHeaders({
      kind: 'basic',
      username: 'inkforge-user',
      passwordHash: 'hash-only',
    })).toThrow(SyncProviderError)
  })

  it('fails against a real unreachable WebDAV endpoint instead of manufacturing health', async () => {
    const provider = createConfiguredSyncProvider(
      configuredWebDav(),
      'runtime-only-secret',
    )
    await expect(provider.connect(provider.config)).rejects.toThrow()
    expect(provider.getStatus().state).toBe('error')
  })

  it('binds persisted metadata to the real SyncEngine and preserves a failed health result', async () => {
    const { useSyncStore } = await import('@/stores/sync')
    const store = useSyncStore()
    const config = {
      ...configuredWebDav(),
      authMode: 'none' as const,
      username: '',
    }

    const saved = await store.saveConfiguration(config)
    expect(saved.success).toBe(true)
    expect(store.providerId).toBe('webdav')
    expect(store.configurationState).toBe('configured')

    const checked = await store.testConfiguration()
    expect(checked.success).toBe(false)
    expect(store.connectionState).toBe('error')
    expect(store.connectionMessage).not.toBe('连接成功')
    expect(store.providerId).toBe('webdav')

    store.cleanup()
  })
})
