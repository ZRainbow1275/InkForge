import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { logger } from './services/error'
import { isTauriEnv } from '@/utils/platform'
import './styles/main.css'
import './styles/client.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Store 清理函数引用（在初始化后赋值）
let cleanupStores: (() => void) | null = null

/**
 * 设置应用清理处理器
 * 支持 Web 和 Tauri 双环境
 */
function setupCleanupHandlers(): void {
    // Web 环境：beforeunload 事件
    window.addEventListener('beforeunload', () => {
        if (cleanupStores) {
            cleanupStores()
        }
    })

    // Tauri 环境：窗口关闭事件
    if (isTauriEnv()) {
        import('@tauri-apps/api/event').then(({ listen }) => {
            listen('tauri://close-requested', () => {
                if (cleanupStores) {
                    cleanupStores()
                }
            }).catch((error) => {
                logger.warn('Tauri 关闭事件监听注册失败', { error: error instanceof Error ? error.message : String(error) })
            })
        }).catch((error) => {
            logger.warn('Tauri event API 加载失败', { error: error instanceof Error ? error.message : String(error) })
        })
    }
}

// 显式初始化 Store（在 Pinia 注册后、挂载前）
async function initializeStores() {
    const { useArticleStore } = await import('./stores/article')
    const { useAIStore } = await import('./stores/ai')
    const { useCategoryStore } = await import('./stores/category')
    const { useEditorStore } = await import('./stores/editor')

    const articleStore = useArticleStore()
    const aiStore = useAIStore()
    const categoryStore = useCategoryStore()
    const editorStore = useEditorStore()

    // 注册统一的清理函数
    cleanupStores = () => {
        editorStore.cleanup()
        aiStore.reset()
        logger.info('所有 Store 资源已清理')
    }

    // 设置清理处理器
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
        logger.error('应用初始化失败', error)
        // 显示用户友好的错误界面
        const appEl = document.getElementById('app')
        if (appEl) {
            // 使用 DOM API 创建元素，避免 innerHTML 安全风险
            const errorContainer = document.createElement('div')
            errorContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; color: #333;'

            const title = document.createElement('h1')
            title.style.cssText = 'font-size: 24px; margin-bottom: 16px;'
            title.textContent = '应用初始化失败'

            const message = document.createElement('p')
            message.style.cssText = 'color: #666; margin-bottom: 24px;'
            message.textContent = '请刷新页面重试，如问题持续请清除浏览器数据'

            const button = document.createElement('button')
            button.style.cssText = 'padding: 12px 24px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;'
            button.textContent = '刷新页面'
            button.onclick = () => location.reload()

            errorContainer.appendChild(title)
            errorContainer.appendChild(message)
            errorContainer.appendChild(button)

            appEl.replaceChildren()
            appEl.appendChild(errorContainer)
        }
    })
