/**
 * Tauri window control bridge for the InkForge custom titlebar.
 *
 * Decorations are disabled on the main window (see tauri.conf.json), so the UI
 * draws its own minimize / maximize / close buttons on Windows and Linux.
 * In a web browser these calls are no-ops; macOS keeps the system traffic
 * lights via titleBarStyle: Overlay, so this service is rarely invoked there.
 */
import { isTauriEnv } from '@/utils/platform'
import { logger } from '@/services/error'

function withAppWindow<T>(fn: (appWindow: import('@tauri-apps/api/window').WebviewWindow) => Promise<T>): Promise<T | null> {
    if (!isTauriEnv()) {
        return Promise.resolve(null)
    }
    return import('@tauri-apps/api/window')
        .then(({ appWindow }) => fn(appWindow))
        .catch((error) => {
            logger.warn('window-controls failed to access Tauri window API', {
                error: error instanceof Error ? error.message : String(error),
            })
            return null
        })
}

export async function minimize(): Promise<void> {
    await withAppWindow((appWindow) => appWindow.minimize())
}

export async function toggleMaximize(): Promise<void> {
    await withAppWindow((appWindow) => appWindow.toggleMaximize())
}

export async function close(): Promise<void> {
    await withAppWindow((appWindow) => appWindow.close())
}

export async function isMaximized(): Promise<boolean> {
    const result = await withAppWindow((appWindow) => appWindow.isMaximized())
    return result ?? false
}

export interface WindowMaximizeSubscription {
    unsubscribe(): void
}

export async function subscribeMaximize(
    handler: (maximized: boolean) => void,
): Promise<WindowMaximizeSubscription> {
    if (!isTauriEnv()) {
        return { unsubscribe: () => undefined }
    }
    try {
        const { appWindow } = await import('@tauri-apps/api/window')
        const unlistenResize = await appWindow.onResized(async () => {
            handler(await appWindow.isMaximized())
        })
        return {
            unsubscribe: () => {
                unlistenResize()
            },
        }
    } catch (error) {
        logger.warn('window-controls failed to subscribe maximize state', {
            error: error instanceof Error ? error.message : String(error),
        })
        return { unsubscribe: () => undefined }
    }
}
