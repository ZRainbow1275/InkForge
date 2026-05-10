import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { logger } from './services/error'
import { isTauriEnv } from '@/utils/platform'
import {
    getCurrentProfileId,
    getOrCreateWindowId,
    markCleanShutdown,
    updateCachedEmergencySnapshot,
    writeCachedEmergencyPayloadSync,
} from '@/services/crash-recovery'
import { useArticleStore } from './stores/article'
import { useAIStore } from './stores/ai'
import { useCategoryStore } from './stores/category'
import { useEditorStore } from './stores/editor'
import { useCrashRecoveryStore } from './stores/crashRecovery'
import { useDesktopStore } from './stores/desktop'
import './styles/main.css'
import './styles/client.css'
import 'katex/dist/katex.min.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Store 娓呯悊鍑芥暟寮曠敤锛堝湪鍒濆鍖栧悗璧嬪€硷級
let cleanupStores: (() => void) | null = null
let cleanupCrashRecoveryHandlers: (() => void) | null = null

/**
 * 璁剧疆搴旂敤娓呯悊澶勭悊鍣?
 * 鏀寔 Web 鍜?Tauri 鍙岀幆澧?
 */
function setupCleanupHandlers(): void {
    window.addEventListener('beforeunload', () => {
        writeCachedEmergencyPayloadSync()
        markCleanShutdown(getCurrentProfileId(), getOrCreateWindowId())
    }, { capture: true })

    if (isTauriEnv()) {
        import('@tauri-apps/api/event').then(({ listen }) => {
            listen('tauri://close-requested', () => {
                writeCachedEmergencyPayloadSync()
                markCleanShutdown(getCurrentProfileId(), getOrCreateWindowId())
                if (cleanupStores) {
                    cleanupStores()
                }
            }).catch((error) => {
                logger.warn('Tauri close event listener registration failed', { error: error instanceof Error ? error.message : String(error) })
            })
        }).catch((error) => {
            logger.warn('Tauri event API load failed', { error: error instanceof Error ? error.message : String(error) })
        })
    }
}

// 显式初始化 Store（在 Pinia 注册后、挂载前）
async function initializeStores() {
    const articleStore = useArticleStore()
    const aiStore = useAIStore()
    const categoryStore = useCategoryStore()
    const editorStore = useEditorStore()
    const crashRecoveryStore = useCrashRecoveryStore()
    const desktopStore = useDesktopStore()

    const profileId = getCurrentProfileId()
    const windowId = getOrCreateWindowId()
    crashRecoveryStore.initialize(profileId, windowId)
    void desktopStore.refresh()

    const stopEmergencySnapshotWatch = watch(
        () => editorStore.currentContent,
        (content) => {
            void updateCachedEmergencySnapshot({
                profileId: getCurrentProfileId(),
                windowId,
                articleId: content?.articleId ?? null,
                title: content?.title ?? '',
                content: content?.body ?? '',
                dirty: editorStore.status === 'saving',
            }).catch((caught) => {
                logger.warn('Crash recovery emergency snapshot update failed', {
                    error: caught instanceof Error ? caught.message : String(caught),
                })
            })
        },
        { immediate: true, deep: false }
    )

    const flushEmergencyPayload = () => {
        const result = writeCachedEmergencyPayloadSync()
        if (!result.ok && result.error !== 'no cached emergency payload') {
            logger.warn('Crash recovery emergency payload write failed', { error: result.error })
        }
    }

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            flushEmergencyPayload()
        }
    }

    const handlePageHide = () => {
        flushEmergencyPayload()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide, { capture: true })
    cleanupCrashRecoveryHandlers = () => {
        stopEmergencySnapshotWatch()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('pagehide', handlePageHide, { capture: true })
    }

    // Register centralized cleanup after crash-recovery hooks are live.
    cleanupStores = () => {
        cleanupCrashRecoveryHandlers?.()
        editorStore.cleanup()
        aiStore.reset()
        logger.info('All Store resources have been cleaned up')
    }

    setupCleanupHandlers()

    await Promise.all([
        articleStore.initialize(),
        aiStore.initialize(),
        categoryStore.initialize()
    ])
}

initializeStores()
    .then(() => {
        app.mount('#app')
    })
    .catch((error) => {
        logger.error('Application initialization failed', error)
        // 鏄剧ず鐢ㄦ埛鍙嬪ソ鐨勯敊璇晫闈?
        const appEl = document.getElementById('app')
        if (appEl) {
            // 浣跨敤 DOM API 鍒涘缓鍏冪礌锛岄伩鍏?innerHTML 瀹夊叏椋庨櫓
            const errorContainer = document.createElement('div')
            errorContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; color: #333;'

            const title = document.createElement('h1')
            title.style.cssText = 'font-size: 24px; margin-bottom: 16px;'
            title.textContent = 'Application initialization failed'

            const message = document.createElement('p')
            message.style.cssText = 'color: #666; margin-bottom: 24px;'
            message.textContent = 'Please refresh the page and retry. If the issue persists, clear browser data.'

            const button = document.createElement('button')
            button.style.cssText = 'padding: 12px 24px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;'
            button.textContent = '鍒锋柊椤甸潰'
            button.onclick = () => location.reload()

            errorContainer.appendChild(title)
            errorContainer.appendChild(message)
            errorContainer.appendChild(button)

            appEl.replaceChildren()
            appEl.appendChild(errorContainer)
        }
    })
