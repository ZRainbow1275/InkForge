import { describe, expect, it } from 'vitest'
import {
  buildSecureCredentialId,
  deleteSecureCredential,
  readSecureCredential,
  writeSecureCredential,
} from './keychain'

describe('secure credential keychain boundary', () => {
  it('builds a stable non-secret namespaced identifier', () => {
    expect(buildSecureCredentialId('ai', 'local-default', 'openai')).toBe(
      'com.inkforge.credentials:ai:local-default:openai',
    )
  })

  it('rejects path-like or delimiter-bearing identifiers', () => {
    expect(() => buildSecureCredentialId('sync', '../profile', 'webdav')).toThrow(
      '凭据所有者',
    )
    expect(() => buildSecureCredentialId('sync', 'profile', 'token:1')).toThrow(
      '凭据标识',
    )
  })

  it('fails closed outside the Tauri desktop runtime', async () => {
    const write = await writeSecureCredential('ai', 'local-default', 'openai', 'not-persisted')
    const read = await readSecureCredential('ai', 'local-default', 'openai')
    const remove = await deleteSecureCredential('ai', 'local-default', 'openai')

    expect(write).toMatchObject({ ok: false, reason: 'runtime-unavailable' })
    expect(read).toMatchObject({ ok: false, reason: 'runtime-unavailable' })
    expect(remove).toMatchObject({ ok: false, reason: 'runtime-unavailable' })
  })
})
