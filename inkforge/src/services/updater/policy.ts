import {
  UPDATER_OFFLINE_DISABLE_MS,
  type UpdaterPolicyInput,
  type UpdaterPolicyResult,
} from './types'

function isDisabledEnvValue(value: string | undefined): boolean {
  if (value === undefined) {
    return false
  }

  return ['0', 'false', 'off', 'disabled'].includes(value.trim().toLowerCase())
}

export function evaluateUpdaterPolicy(input: UpdaterPolicyInput): UpdaterPolicyResult {
  if (input.settings.autoCheckDisabled) {
    return {
      disabled: true,
      reason: 'user-setting',
      message: 'Updater checks are disabled by user settings.',
    }
  }

  if (isDisabledEnvValue(input.envUpdaterValue)) {
    return {
      disabled: true,
      reason: 'env',
      message: 'Updater checks are disabled by environment policy.',
    }
  }

  if (input.enterpriseDisabled) {
    return {
      disabled: true,
      reason: 'enterprise-policy',
      message: 'Updater checks are disabled by enterprise policy.',
    }
  }

  if (input.navigatorOnline === false && input.offlineSince !== null && input.offlineSince !== undefined) {
    const offlineFor = input.now - input.offlineSince
    if (offlineFor >= UPDATER_OFFLINE_DISABLE_MS) {
      return {
        disabled: true,
        reason: 'offline',
        message: 'Updater checks are disabled after more than 24 hours offline.',
      }
    }
  }

  if (input.runtimeAvailable === false) {
    return {
      disabled: true,
      reason: 'runtime-unavailable',
      message: 'Tauri updater runtime is unavailable in this environment.',
    }
  }

  if (input.buildActive === false) {
    return {
      disabled: true,
      reason: 'build-config',
      message: 'Tauri updater is disabled by the current desktop build configuration.',
    }
  }

  return {
    disabled: false,
    reason: null,
    message: null,
  }
}

interface EnterprisePolicyFile {
  updater?: {
    disabled?: unknown
  }
}

export async function readEnterpriseUpdaterDisabled(fetcher: typeof fetch = globalThis.fetch): Promise<boolean> {
  if (typeof fetcher !== 'function') {
    return false
  }

  try {
    const response = await fetcher('/config/enterprise.json', { cache: 'no-store' })
    if (!response.ok) {
      return false
    }

    const data = await response.json() as EnterprisePolicyFile
    return data.updater?.disabled === true
  } catch {
    return false
  }
}

export function readUpdaterEnvValue(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>
  return env.VITE_INKFORGE_UPDATER ?? env.INKFORGE_UPDATER
}
