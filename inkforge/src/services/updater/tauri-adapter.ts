import { UPDATER_FALLBACK_RELEASE_URL, type UpdateInfo, type UpdaterAdapter, type UpdaterAdapterResult } from './types'
import { isVersionGreaterThan, releaseUrlForVersion } from './semver'

interface TauriUpdateManifest {
  version?: string
  date?: string
  body?: string
  notes?: string
}

interface TauriCheckUpdateResult {
  shouldUpdate: boolean
  manifest?: TauriUpdateManifest | null
}

function hasTauriRuntime(): boolean {
  const candidate = window as typeof window & { __TAURI__?: unknown; __TAURI_IPC__?: unknown }
  return Boolean(candidate.__TAURI__ || candidate.__TAURI_IPC__)
}

function normalizeManifest(manifest: TauriUpdateManifest | null | undefined, currentVersion: string, releaseBaseUrl: string): UpdateInfo | null {
  const version = manifest?.version?.trim()
  if (!version || !isVersionGreaterThan(version, currentVersion)) {
    return null
  }

  const releasedAt = manifest?.date ? Date.parse(manifest.date) : null
  const notes = manifest?.body ?? manifest?.notes ?? ''

  return {
    version,
    releasedAt: Number.isFinite(releasedAt) ? releasedAt : null,
    notes,
    size: null,
    signatureOk: true,
    releaseUrl: releaseUrlForVersion(releaseBaseUrl, version),
  }
}

function normalizeUpdaterError(error: unknown): UpdaterAdapterResult {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()

  if (normalized.includes('signature') || normalized.includes('verification') || normalized.includes('pubkey')) {
    return {
      status: 'signature-failed',
      update: null,
      message,
    }
  }

  if (normalized.includes('not allowed') || normalized.includes('not enabled') || normalized.includes('inactive')) {
    return {
      status: 'unavailable',
      update: null,
      message,
    }
  }

  return {
    status: 'failed',
    update: null,
    message,
  }
}

export class TauriV1UpdaterAdapter implements UpdaterAdapter {
  constructor(
    private readonly currentVersion: string,
    private readonly releaseBaseUrl: string = UPDATER_FALLBACK_RELEASE_URL,
  ) {}

  async check(): Promise<UpdaterAdapterResult> {
    if (typeof window === 'undefined' || !hasTauriRuntime()) {
      return {
        status: 'unavailable',
        update: null,
        message: 'Tauri updater runtime is unavailable in the current web environment.',
      }
    }

    try {
      const { checkUpdate } = await import('@tauri-apps/api/updater')
      const result = await checkUpdate() as TauriCheckUpdateResult
      if (!result.shouldUpdate) {
        return { status: 'none', update: null }
      }

      const update = normalizeManifest(result.manifest, this.currentVersion, this.releaseBaseUrl)
      if (!update) {
        return { status: 'none', update: null }
      }

      return { status: 'available', update }
    } catch (error) {
      return normalizeUpdaterError(error)
    }
  }
}

export function createTauriUpdaterAdapter(currentVersion: string, releaseBaseUrl?: string): UpdaterAdapter {
  return new TauriV1UpdaterAdapter(currentVersion, releaseBaseUrl)
}
