import { isTauriEnv, tauriInvoke } from '@/utils/platform'

export type SecureCredentialScope = 'ai' | 'sync'

export type SecureCredentialFailureReason =
  | 'runtime-unavailable'
  | 'invalid-identifier'
  | 'failed'

export type SecureCredentialResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      reason: SecureCredentialFailureReason
      message: string
    }

const CREDENTIAL_SEGMENT_PATTERN = /^[a-zA-Z0-9._-]{1,120}$/
const CREDENTIAL_PREFIX = 'com.inkforge.credentials'

function validateCredentialSegment(value: string, label: string): string {
  const normalized = value.trim()
  if (!CREDENTIAL_SEGMENT_PATTERN.test(normalized)) {
    throw new Error(`${label} 只能包含字母、数字、点、下划线或连字符`)
  }
  return normalized
}

export function buildSecureCredentialId(
  scope: SecureCredentialScope,
  ownerId: string,
  credentialId: string,
): string {
  return [
    CREDENTIAL_PREFIX,
    scope,
    validateCredentialSegment(ownerId, '凭据所有者'),
    validateCredentialSegment(credentialId, '凭据标识'),
  ].join(':')
}

function getCredentialIdResult(
  scope: SecureCredentialScope,
  ownerId: string,
  credentialId: string,
): SecureCredentialResult<string> {
  try {
    return {
      ok: true,
      value: buildSecureCredentialId(scope, ownerId, credentialId),
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid-identifier',
      message: error instanceof Error ? error.message : '凭据标识无效',
    }
  }
}

export async function writeSecureCredential(
  scope: SecureCredentialScope,
  ownerId: string,
  credentialId: string,
  secret: string,
): Promise<SecureCredentialResult<true>> {
  if (!isTauriEnv()) {
    return {
      ok: false,
      reason: 'runtime-unavailable',
      message: '系统凭据库仅在 InkForge 桌面应用中可用',
    }
  }

  const id = getCredentialIdResult(scope, ownerId, credentialId)
  if (!id.ok) return id

  const normalizedSecret = secret.trim()
  if (!normalizedSecret) {
    return {
      ok: false,
      reason: 'failed',
      message: '凭据不能为空',
    }
  }

  try {
    await tauriInvoke<void>('store_key', {
      keyId: id.value,
      keyData: normalizedSecret,
    })
    return { ok: true, value: true }
  } catch (error) {
    return {
      ok: false,
      reason: 'failed',
      message: `系统凭据库写入失败: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function readSecureCredential(
  scope: SecureCredentialScope,
  ownerId: string,
  credentialId: string,
): Promise<SecureCredentialResult<string | null>> {
  if (!isTauriEnv()) {
    return {
      ok: false,
      reason: 'runtime-unavailable',
      message: '系统凭据库仅在 InkForge 桌面应用中可用',
    }
  }

  const id = getCredentialIdResult(scope, ownerId, credentialId)
  if (!id.ok) return id

  try {
    const value = await tauriInvoke<string | null>('get_key', {
      keyId: id.value,
    })
    return { ok: true, value: value?.trim() || null }
  } catch (error) {
    return {
      ok: false,
      reason: 'failed',
      message: `系统凭据库读取失败: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function deleteSecureCredential(
  scope: SecureCredentialScope,
  ownerId: string,
  credentialId: string,
): Promise<SecureCredentialResult<true>> {
  if (!isTauriEnv()) {
    return {
      ok: false,
      reason: 'runtime-unavailable',
      message: '系统凭据库仅在 InkForge 桌面应用中可用',
    }
  }

  const id = getCredentialIdResult(scope, ownerId, credentialId)
  if (!id.ok) return id

  try {
    await tauriInvoke<void>('delete_key', {
      keyId: id.value,
    })
    return { ok: true, value: true }
  } catch (error) {
    return {
      ok: false,
      reason: 'failed',
      message: `系统凭据库删除失败: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
