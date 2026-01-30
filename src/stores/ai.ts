import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    checkOllamaStatus,
    generateSummary,
    generateTitle,
    generateTranscript,
    polishArticle,
    expandContent,
    condenseContent,
    cancelCurrentRequest,
    type AIStatus,
    type GenerateResult
} from '@/services/ai'
import { REQUEST_LIMITS } from '@/config/security'
import { useArticleStore } from './article'
import { useEditorStore } from './editor'

/**
 * AI Store
 * 管理本地AI服务状态和生成操作
 */
export const useAIStore = defineStore('ai', () => {
    const articleStore = useArticleStore()
    const editorStore = useEditorStore()

    // 状态
    const status = ref<AIStatus>({ available: false, model: null })
    const loading = ref(false)
    const currentTask = ref<string | null>(null)
    const error = ref<string | null>(null)
    const warning = ref<string | null>(null)

    // 计算属性
    const isAvailable = computed(() => status.value.available)
    const currentModel = computed(() => status.value.model)

    /**
     * 处理生成结果，设置截断警告
     */
    function handleTruncationWarning(result: GenerateResult): void {
        if (result.truncated && result.originalLength) {
            warning.value = `输入内容过长（${result.originalLength} 字符），已截断至 ${REQUEST_LIMITS.AI_MAX_INPUT_LENGTH_DEFAULT} 字符处理，结果可能不完整`
        } else {
            warning.value = null
        }
    }

    /**
     * 清除警告消息
     */
    function clearWarning(): void {
        warning.value = null
    }

    // 检查AI状态
    async function checkStatus() {
        status.value = await checkOllamaStatus()
        return status.value
    }

    // 生成摘要
    async function generateArticleSummary() {
        const article = articleStore.selectedArticle
        if (!article) return

        loading.value = true
        currentTask.value = '生成摘要'
        error.value = null
        warning.value = null

        try {
            const content = article.rawContent || article.description
            const result = await generateSummary(content)

            handleTruncationWarning(result)

            // 更新文章的AI摘要
            await articleStore.updateArticle(article.id, { aiSummary: result.content })

            return result.content
        } catch (e) {
            error.value = e instanceof Error ? e.message : '生成失败'
            throw e
        } finally {
            loading.value = false
            currentTask.value = null
        }
    }

    // 生成标题
    async function generateArticleTitle() {
        const content = editorStore.currentContent
        if (!content) return

        loading.value = true
        currentTask.value = '生成标题'
        error.value = null
        warning.value = null

        try {
            const result = await generateTitle(content.body)

            handleTruncationWarning(result)

            // 更新编辑内容
            await editorStore.updateContent({ title: result.content })

            return result.content
        } catch (e) {
            error.value = e instanceof Error ? e.message : '生成失败'
            throw e
        } finally {
            loading.value = false
            currentTask.value = null
        }
    }

    // 生成口播稿
    async function generateArticleTranscript() {
        const content = editorStore.currentContent
        if (!content) return

        loading.value = true
        currentTask.value = '生成口播稿'
        error.value = null
        warning.value = null

        try {
            const result = await generateTranscript(content.body)

            handleTruncationWarning(result)

            // 更新编辑内容
            await editorStore.updateContent({ transcript: result.content })

            return result.content
        } catch (e) {
            error.value = e instanceof Error ? e.message : '生成失败'
            throw e
        } finally {
            loading.value = false
            currentTask.value = null
        }
    }

    // 润色文章
    async function polishCurrentArticle(style: string = '专业') {
        const content = editorStore.currentContent
        if (!content) return

        loading.value = true
        currentTask.value = `润色文章 (${style})`
        error.value = null
        warning.value = null

        try {
            const result = await polishArticle(content.body, style)

            handleTruncationWarning(result)

            // 更新编辑内容
            await editorStore.updateContent({ body: result.content })

            return result.content
        } catch (e) {
            error.value = e instanceof Error ? e.message : '生成失败'
            throw e
        } finally {
            loading.value = false
            currentTask.value = null
        }
    }

    // 扩写内容
    async function expandCurrentContent(targetLength: number = 500) {
        const content = editorStore.currentContent
        if (!content) return

        loading.value = true
        currentTask.value = `扩写至${targetLength}字`
        error.value = null
        warning.value = null

        try {
            const result = await expandContent(content.body, targetLength)

            handleTruncationWarning(result)

            // 更新编辑内容
            await editorStore.updateContent({ body: result.content })

            return result.content
        } catch (e) {
            error.value = e instanceof Error ? e.message : '生成失败'
            throw e
        } finally {
            loading.value = false
            currentTask.value = null
        }
    }

    // 精简内容
    async function condenseCurrentContent(targetLength: number = 200) {
        const content = editorStore.currentContent
        if (!content) return

        loading.value = true
        currentTask.value = `精简至${targetLength}字`
        error.value = null
        warning.value = null

        try {
            const result = await condenseContent(content.body, targetLength)

            handleTruncationWarning(result)

            // 更新编辑内容
            await editorStore.updateContent({ body: result.content })

            return result.content
        } catch (e) {
            error.value = e instanceof Error ? e.message : '生成失败'
            throw e
        } finally {
            loading.value = false
            currentTask.value = null
        }
    }

    // 取消当前请求
    function cancelRequest(): boolean {
        const cancelled = cancelCurrentRequest()
        if (cancelled) {
            loading.value = false
            currentTask.value = null
            error.value = '请求已取消'
        }
        return cancelled
    }

    // 初始化 Promise 锁（解决并发调用的竞态条件）
    let initPromise: Promise<void> | null = null

    // 初始化方法（由 main.ts 显式调用，支持幂等调用，并发安全）
    async function initialize() {
        // 如果已经在初始化中，返回现有的 Promise
        if (initPromise) {
            return initPromise
        }

        // 创建新的初始化 Promise
        initPromise = (async () => {
            try {
                await checkStatus()
            } catch (error) {
                // 初始化失败时重置，允许重试
                initPromise = null
                throw error
            }
        })()

        return initPromise
    }

    // 重置方法（支持热重载和测试场景）
    function reset() {
        initPromise = null
        status.value = { available: false, model: null }
        loading.value = false
        currentTask.value = null
        error.value = null
        warning.value = null
    }

    return {
        // State
        status,
        loading,
        currentTask,
        error,
        warning,

        // Getters
        isAvailable,
        currentModel,

        // Actions
        initialize,
        reset,
        checkStatus,
        generateArticleSummary,
        generateArticleTitle,
        generateArticleTranscript,
        polishCurrentArticle,
        expandCurrentContent,
        condenseCurrentContent,
        cancelRequest,
        clearWarning
    }
})
