/**
 * Tell the Rust backend that the Vue app has mounted and is ready to be shown.
 *
 * The Tauri setup hook starts a 3-second fallback timer that will close the
 * splash and show the main window even if this never arrives (panic, hang,
 * infinite mount loop). When this signal lands first it short-circuits the
 * timer so the splash → main transition feels immediate.
 *
 * In non-Tauri environments (vite dev server, vitest, browser preview) this
 * resolves to a no-op so callers can `void notifyAppReady()` unconditionally.
 */

import { logger } from '@/services/error'
import { isTauriEnv } from '@/utils/platform'

export async function notifyAppReady(): Promise<void> {
  if (!isTauriEnv()) {
    return
  }

  try {
    const { invoke } = await import('@tauri-apps/api/tauri')
    await invoke('app_ready')
  } catch (error) {
    logger.warn('notifyAppReady failed; splash fallback timeout will handle the transition', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
