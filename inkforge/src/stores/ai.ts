import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createProvider } from '@/services/ai/factory'
import type {
    AIModel,
    AIProvider,
    ProviderName,
    ChatMessage,
} from '@/services/ai/types'
import {
    deleteSecureCredential,
    readSecureCredential,
    writeSecureCredential,
} from '@/services/credentials/keychain'
import { useSettingsStore } from '@/stores/settings'
import { useArticleStore } from '@/stores/article'
import { useEditorStore } from '@/stores/editor'
import { AppError, ErrorCode, logger } from '@/services/error'
import { REQUEST_LIMITS } from '@/config/security'

// ═══════════════════════════════════════════════════════════════════
// System Prompts
// ═══════════════════════════════════════════════════════════════════

const SYSTEM_PROMPTS = {
    outline: `你是一位专业的写作助手，擅长为微信公众号文章生成清晰、层次分明的大纲。
要求：
- 使用 Markdown 格式
- 包含引言和总结
- 使用 ## (H2) 作为主要章节标题
- 使用 ### (H3) 作为子章节标题
- 每个章节下用简短的一句话描述核心要点
- 大纲应包含 3-5 个主要章节
- 结构清晰、逻辑连贯`,

    polish: `你是一位资深的文字润色专家，擅长根据不同风格对文章进行精细打磨。
要求：
- 保持原文核心含义不变
- 修正语法错误和不通顺的表达
- 提升文字的表现力和感染力
- 直接输出润色后的全文，不要添加任何说明或注释`,

    title: `你是一位微信公众号标题专家，擅长生成吸引读者点击的标题。
要求：
- 每个标题 15-25 字
- 不以标点符号结尾
- 风格多样化：可包含疑问式、数字式、对比式、悬念式等
- 标题之间用换行分隔
- 只输出标题列表，不要编号和额外说明`,

    summary: `你是一位专业的摘要撰写者，擅长提炼文章核心要点。
要求：
- 摘要长度控制在 100-200 字
- 覆盖文章的核心观点和关键信息
- 语言精练，避免冗余表达
- 直接输出摘要内容，不要添加"摘要："等前缀`,

    transcript: `你是一位专业的播客内容编辑，擅长将书面内容改写为适合口播的稿件。
要求：
- 使用口语化表达，自然流畅
- 适当加入过渡语（"说到这里"、"接下来"、"大家想想看"等）
- 保持原文核心信息完整
- 控制在 200-500 字
- 不使用复杂的书面语和长难句
- 可以适当加入互动语（"你们觉得呢"等）`,

    continueWriting: `你是一位专业写作助手，擅长根据已有上下文自然地续写内容。
要求：
- 保持与上文一致的语气、风格和主题
- 自然衔接，不要重复上文内容
- 续写 200-400 字
- 内容有深度，不是简单的重复或废话
- 直接续写，不要添加任何说明`,
} as const

const AI_CREDENTIAL_OWNER = 'local-settings'

export type AICredentialState =
    | 'idle'
    | 'loading'
    | 'stored'
    | 'missing'
    | 'not-required'
    | 'legacy-session'
    | 'error'

export type AIModelDiscoveryState = 'idle' | 'loading' | 'ready' | 'error'

export interface AIOperationResult {
    success: boolean
    message: string
}

/**
 * 将多个系统约束合并为单条消息，兼容仅消费首条 system 消息的 Provider。
 */
export function composeAISystemPrompt(...prompts: Array<string | undefined>): string {
    return prompts
        .map(prompt => prompt?.trim() ?? '')
        .filter(prompt => prompt.length > 0)
        .join('\n\n')
}

// ═══════════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════════

/**
 * AI Store (重构版)
 * 基于 Provider 抽象层，支持多种 AI 服务
 */
export const useAIStore = defineStore('ai', () => {
    const settingsStore = useSettingsStore()

    // ─── 状态 ───
    const loading = ref(false)
    const error = ref<string | null>(null)
    const currentTask = ref<string | null>(null)
    const streamingContent = ref('')
    const isStreaming = ref(false)
    const secureApiKey = ref('')
    const credentialState = ref<AICredentialState>('idle')
    const credentialMessage = ref('')
    const discoveredModels = ref<AIModel[]>([])
    const modelDiscoveryState = ref<AIModelDiscoveryState>('idle')
    const modelDiscoveryMessage = ref('')
    let credentialRequestId = 0
    let modelDiscoveryRequestId = 0

    // ─── 请求控制 ───
    /** 活跃请求控制器池：跟踪所有进行中的请求，支持全量取消 */
    const activeControllers = new Set<AbortController>()
    let lastRequestTime = 0

    // ─── 计算属性 ───

    /**
     * 当前 Provider 实例（响应式，随 settings 变化自动重建）
     * 返回 null 表示 AI 未配置或配置无效
     */
    const provider = computed<AIProvider | null>(() => {
        const config = settingsStore.settings.ai
        if (config.provider === 'none') return null
        if (config.provider !== 'ollama' && !secureApiKey.value) return null

        try {
            return createProvider({
                provider: config.provider as ProviderName,
                apiKey: secureApiKey.value,
                baseUrl: config.baseUrl,
                model: config.model,
                maxTokens: config.maxTokens,
                temperature: config.temperature,
                ollamaUrl: config.ollamaUrl,
            })
        } catch (e) {
            logger.warn('创建 AI Provider 失败', {
                provider: config.provider,
                error: e instanceof Error ? e.message : String(e),
            })
            return null
        }
    })

    /** AI 是否可用 */
    const isAvailable = computed(() => provider.value !== null)

    /** 当前 Provider 的静态模型与真实发现结果，按模型 ID 去重。 */
    const availableModels = computed<AIModel[]>(() => {
        const models = [
            ...(provider.value?.models ?? []),
            ...discoveredModels.value,
        ]
        return Array.from(new Map(models.map(model => [model.id, model])).values())
    })

    /** 当前凭据是否已经可供会话使用。 */
    const hasStoredCredential = computed(() => {
        const providerName = settingsStore.settings.ai.provider
        if (providerName === 'ollama') return true
        return credentialState.value === 'stored'
            || credentialState.value === 'legacy-session'
    })

    /** 只有系统凭据库写入成功时才为 true。 */
    const isCredentialSecurelyStored = computed(
        () => credentialState.value === 'stored'
    )

    /** 当前模型显示名称 */
    const currentModelName = computed(() => {
        if (!provider.value) return '未配置'
        const model = availableModels.value.find(
            m => m.id === settingsStore.settings.ai.model
        )
        return model?.name || settingsStore.settings.ai.model
    })

    /**
     * 兼容旧 API: status 对象
     * 旧 AIPanel.vue 使用 status.error
     */
    const status = computed(() => ({
        available: isAvailable.value,
        model: isAvailable.value ? settingsStore.settings.ai.model : null,
        error: !isAvailable.value
            ? getUnavailableReason()
            : undefined,
    }))

    /** 兼容旧 API: currentModel */
    const currentModel = computed(() => currentModelName.value)

    // ─── 内部工具 ───

    /** 获取不可用的原因 */
    function getUnavailableReason(): string {
        const config = settingsStore.settings.ai
        if (config.provider === 'none') return 'AI 功能已禁用'
        if (config.provider !== 'ollama' && !secureApiKey.value) {
            if (credentialState.value === 'loading') return '正在读取系统凭据库'
            if (credentialState.value === 'error' && credentialMessage.value) {
                return credentialMessage.value
            }
            return '请先配置 API Key'
        }
        return 'AI 服务配置异常'
    }

    /** 节流检查 */
    function checkThrottle(): void {
        const now = Date.now()
        const elapsed = now - lastRequestTime
        const interval = REQUEST_LIMITS.AI_THROTTLE_INTERVAL_MS

        if (elapsed < interval) {
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                `请求过于频繁，请等待 ${Math.ceil((interval - elapsed) / 1000)} 秒后重试`
            )
        }
    }

    /** 确保 provider 可用 */
    function ensureProvider(): AIProvider {
        const p = provider.value
        if (!p) {
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                getUnavailableReason()
            )
        }
        return p
    }

    /** 构建消息列表 */
    function buildMessages(systemPrompt: string, userContent: string): ChatMessage[] {
        return [
            {
                role: 'system',
                content: composeAISystemPrompt(
                    settingsStore.settings.ai.systemPrompt,
                    systemPrompt
                ),
            },
            { role: 'user', content: userContent },
        ]
    }

    // ─── 核心方法 ───

    /**
     * 非流式生成（内部基础方法）
     * @param taskName - 任务显示名称
     * @param systemPrompt - 系统提示词
     * @param userContent - 用户内容
     * @returns 生成的文本
     */
    async function generate(
        taskName: string,
        systemPrompt: string,
        userContent: string
    ): Promise<string> {
        checkThrottle()
        const p = ensureProvider()

        loading.value = true
        currentTask.value = taskName
        error.value = null

        const controller = new AbortController()
        activeControllers.add(controller)

        try {
            lastRequestTime = Date.now()

            const messages = buildMessages(systemPrompt, userContent)
            const config = settingsStore.settings.ai

            const response = await p.chat(messages, {
                model: config.model,
                maxTokens: config.maxTokens,
                temperature: config.temperature,
                signal: controller.signal,
            })

            return response.content
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                error.value = '请求已取消'
                return ''
            }
            const msg = e instanceof AppError
                ? e.message
                : (e instanceof Error ? e.message : '生成失败')
            error.value = msg
            throw e
        } finally {
            loading.value = false
            currentTask.value = null
            activeControllers.delete(controller)
        }
    }

    /**
     * 流式生成
     * @param systemPrompt - 系统提示词
     * @param userContent - 用户内容
     * @param onChunk - 每次收到新文本片段时的回调
     * @returns 完整的生成文本
     */
    async function streamGenerate(
        systemPrompt: string,
        userContent: string,
        onChunk: (chunk: string) => void
    ): Promise<string> {
        checkThrottle()
        const p = ensureProvider()

        loading.value = true
        isStreaming.value = true
        streamingContent.value = ''
        error.value = null

        const controller = new AbortController()
        activeControllers.add(controller)

        try {
            lastRequestTime = Date.now()

            const messages = buildMessages(systemPrompt, userContent)
            const config = settingsStore.settings.ai

            let fullContent = ''

            for await (const chunk of p.stream(messages, {
                model: config.model,
                maxTokens: config.maxTokens,
                temperature: config.temperature,
                signal: controller.signal,
            })) {
                fullContent += chunk
                streamingContent.value = fullContent
                onChunk(chunk)
            }

            return fullContent
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                error.value = '请求已取消'
                return streamingContent.value
            }
            const msg = e instanceof AppError
                ? e.message
                : (e instanceof Error ? e.message : '流式生成失败')
            error.value = msg
            throw e
        } finally {
            loading.value = false
            isStreaming.value = false
            activeControllers.delete(controller)
        }
    }

    /**
     * 流式多轮对话
     * 复用现有 Provider 流式接口，支持完整的 ChatMessage 历史
     * @param messages - 完整的对话消息列表（含 system / user / assistant 历史）
     * @param onChunk - 每次收到新文本片段时的回调
     * @param signal - 外部 AbortSignal（可选，用于上层取消）
     * @returns 完整的回复文本
     */
    async function streamChat(
        messages: ChatMessage[],
        onChunk: (chunk: string) => void,
        signal?: AbortSignal
    ): Promise<string> {
        if (!isAvailable.value || provider.value == null) {
            throw new Error('AI 未配置或不可用')
        }
        checkThrottle()
        const p = provider.value

        const controller = new AbortController()
        activeControllers.add(controller)

        // 关联外部 signal：已中止则立即中止，否则监听中止事件
        if (signal?.aborted) {
            controller.abort()
        } else {
            signal?.addEventListener('abort', () => controller.abort())
        }

        isStreaming.value = true
        loading.value = true
        error.value = null

        try {
            lastRequestTime = Date.now()

            const config = settingsStore.settings.ai
            let full = ''

            for await (const chunk of p.stream(messages, {
                model: config.model,
                maxTokens: config.maxTokens,
                temperature: config.temperature,
                signal: controller.signal,
            })) {
                full += chunk
                onChunk(chunk)
            }

            return full
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                error.value = '请求已取消'
                throw e
            }
            const msg = e instanceof AppError
                ? e.message
                : (e instanceof Error ? e.message : '流式对话失败')
            error.value = msg
            throw e
        } finally {
            activeControllers.delete(controller)
            isStreaming.value = false
            loading.value = false
        }
    }

    // ─── AI 功能方法 ───

    /**
     * 生成文章大纲
     * @param topic - 主题或关键词
     * @returns Markdown 格式的大纲
     */
    async function generateOutline(topic: string): Promise<string> {
        return generate(
            '生成大纲',
            SYSTEM_PROMPTS.outline,
            `请为以下主题生成一个微信公众号文章大纲：\n\n${topic}`
        )
    }

    /**
     * 润色文章
     * @param text - 原始文本
     * @param style - 润色风格（专业/简洁/生动/学术）
     * @returns 润色后的文本
     */
    async function polishText(text: string, style: string): Promise<string> {
        return generate(
            `润色文章 (${style})`,
            SYSTEM_PROMPTS.polish,
            `请以"${style}"风格润色以下文章：\n\n${text}`
        )
    }

    /**
     * 生成候选标题
     * @param content - 文章内容
     * @param count - 标题数量（默认 5）
     * @returns 标题列表
     */
    async function generateTitles(content: string, count: number = 5): Promise<string[]> {
        const result = await generate(
            '生成标题',
            SYSTEM_PROMPTS.title,
            `请为以下内容生成 ${count} 个候选标题：\n\n${content}`
        )

        // 解析标题列表（按换行分割，过滤空行和编号前缀）
        return result
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^\d+[.\s、)）]+/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, count)
    }

    /**
     * 生成摘要
     * @param content - 文章内容
     * @returns 100-200 字的摘要
     */
    async function generateSummary(content: string): Promise<string> {
        return generate(
            '生成摘要',
            SYSTEM_PROMPTS.summary,
            `请为以下内容生成摘要：\n\n${content}`
        )
    }

    /**
     * 生成口播稿
     * @param content - 文章内容
     * @returns 口语化的播客脚本
     */
    async function generateTranscript(content: string): Promise<string> {
        return generate(
            '生成口播稿',
            SYSTEM_PROMPTS.transcript,
            `请将以下内容改写为口播稿：\n\n${content}`
        )
    }

    /**
     * 续写内容
     * @param context - 已有的上下文
     * @returns 续写的内容
     */
    async function continueWriting(context: string): Promise<string> {
        return generate(
            '续写内容',
            SYSTEM_PROMPTS.continueWriting,
            `请根据以下上下文续写：\n\n${context}`
        )
    }

    // ─── 兼容旧 API 的方法 ───
    // 这些方法保持了与旧 store 一致的签名，供现有组件使用

    /**
     * 生成文章摘要（兼容旧 API，操作 article/editor store）
     */
    async function generateArticleSummary(): Promise<string | undefined> {
        const articleStore = useArticleStore()
        const article = articleStore.selectedArticle
        if (!article) return undefined

        const content = article.rawContent || article.description
        const result = await generateSummary(content)

        await articleStore.updateArticle(article.id, { aiSummary: result })
        return result
    }

    /**
     * 生成文章标题（兼容旧 API，操作 editor store）
     */
    async function generateArticleTitle(): Promise<string | undefined> {
        const editorStore = useEditorStore()
        const content = editorStore.currentContent
        if (!content) return undefined

        const titles = await generateTitles(content.body, 1)
        const title = titles[0] || ''

        if (title) {
            await editorStore.updateContent({ title })
        }
        return title
    }

    /**
     * 生成口播稿（兼容旧 API，操作 editor store）
     */
    async function generateArticleTranscript(): Promise<string | undefined> {
        const editorStore = useEditorStore()
        const content = editorStore.currentContent
        if (!content) return undefined

        const result = await generateTranscript(content.body)
        await editorStore.updateContent({ transcript: result })
        return result
    }

    /**
     * 润色当前文章（兼容旧 API，操作 editor store）
     */
    async function polishCurrentArticle(style: string = '专业'): Promise<string | undefined> {
        const editorStore = useEditorStore()
        const content = editorStore.currentContent
        if (!content) return undefined

        const result = await polishText(content.body, style)
        await editorStore.updateContent({ body: result })
        return result
    }

    /**
     * 扩写当前内容（兼容旧 API，操作 editor store）
     */
    async function expandCurrentContent(targetLength: number = 500): Promise<string | undefined> {
        const editorStore = useEditorStore()
        const content = editorStore.currentContent
        if (!content) return undefined

        const result = await generate(
            `扩写至${targetLength}字`,
            `你是一位专业写作助手，擅长扩充内容。要求：
- 在原文基础上增加细节、案例和分析
- 保持原文的主题和语气
- 扩写后总字数约 ${targetLength} 字
- 直接输出扩写后的全文`,
            `请扩写以下内容至约 ${targetLength} 字：\n\n${content.body}`
        )

        await editorStore.updateContent({ body: result })
        return result
    }

    /**
     * 精简当前内容（兼容旧 API，操作 editor store）
     */
    async function condenseCurrentContent(targetLength: number = 200): Promise<string | undefined> {
        const editorStore = useEditorStore()
        const content = editorStore.currentContent
        if (!content) return undefined

        const result = await generate(
            `精简至${targetLength}字`,
            `你是一位专业的文字精简专家。要求：
- 保留核心信息和关键观点
- 去除冗余表达和次要细节
- 精简后总字数约 ${targetLength} 字
- 直接输出精简后的全文`,
            `请将以下内容精简至约 ${targetLength} 字：\n\n${content.body}`
        )

        await editorStore.updateContent({ body: result })
        return result
    }

    // ─── 连接测试 ───

    function isCredentialRequired(providerName: ProviderName | 'none'): providerName is Exclude<ProviderName, 'ollama'> {
        return providerName !== 'none' && providerName !== 'ollama'
    }

    /**
     * 从系统凭据库读取指定 Provider 的 API Key。
     * 浏览器或测试环境会显式失败，不使用 localStorage 伪装安全存储。
     */
    async function loadApiCredential(
        providerName: ProviderName | 'none' = settingsStore.settings.ai.provider
    ): Promise<AIOperationResult> {
        const requestId = ++credentialRequestId
        discoveredModels.value = []
        modelDiscoveryState.value = 'idle'
        modelDiscoveryMessage.value = ''

        if (!isCredentialRequired(providerName)) {
            secureApiKey.value = ''
            credentialState.value = providerName === 'ollama' ? 'not-required' : 'idle'
            credentialMessage.value = providerName === 'ollama'
                ? 'Ollama 本地服务不需要 API Key'
                : 'AI 功能已禁用'
            return { success: true, message: credentialMessage.value }
        }

        credentialState.value = 'loading'
        credentialMessage.value = '正在读取系统凭据库'
        const result = await readSecureCredential(
            'ai',
            AI_CREDENTIAL_OWNER,
            providerName
        )

        if (requestId !== credentialRequestId) {
            return { success: false, message: 'Provider 已切换，已忽略过期的凭据读取结果' }
        }

        if (!result.ok) {
            secureApiKey.value = ''
            credentialState.value = 'error'
            credentialMessage.value = result.message
            return { success: false, message: result.message }
        }

        secureApiKey.value = result.value ?? ''
        credentialState.value = result.value ? 'stored' : 'missing'
        credentialMessage.value = result.value
            ? 'API Key 已由系统凭据库托管'
            : '尚未保存 API Key'
        return { success: true, message: credentialMessage.value }
    }

    /** 将 API Key 写入系统凭据库；成功后才清除旧版明文设置。 */
    async function saveApiCredential(
        providerName: ProviderName,
        secret: string
    ): Promise<AIOperationResult> {
        if (!isCredentialRequired(providerName)) {
            return { success: false, message: '当前 Provider 不需要 API Key' }
        }

        const requestId = ++credentialRequestId
        credentialState.value = 'loading'
        credentialMessage.value = '正在写入系统凭据库'
        const result = await writeSecureCredential(
            'ai',
            AI_CREDENTIAL_OWNER,
            providerName,
            secret
        )

        if (!result.ok) {
            if (requestId === credentialRequestId) {
                credentialState.value = 'error'
                credentialMessage.value = result.message
            }
            return { success: false, message: result.message }
        }

        if (settingsStore.settings.ai.provider === providerName) {
            secureApiKey.value = secret.trim()
            credentialState.value = 'stored'
            credentialMessage.value = 'API Key 已安全保存到系统凭据库'
            if (settingsStore.settings.ai.apiKey) {
                settingsStore.settings.ai.apiKey = ''
                settingsStore.save()
            }
        }
        return { success: true, message: 'API Key 已安全保存到系统凭据库' }
    }

    /** 删除指定 Provider 的系统凭据；不会把删除结果伪装为远端成功。 */
    async function clearApiCredential(
        providerName: ProviderName
    ): Promise<AIOperationResult> {
        if (!isCredentialRequired(providerName)) {
            return { success: false, message: '当前 Provider 没有 API Key' }
        }

        const requestId = ++credentialRequestId
        credentialState.value = 'loading'
        credentialMessage.value = '正在删除系统凭据'
        const result = await deleteSecureCredential(
            'ai',
            AI_CREDENTIAL_OWNER,
            providerName
        )

        if (!result.ok) {
            if (requestId === credentialRequestId) {
                credentialState.value = 'error'
                credentialMessage.value = result.message
            }
            return { success: false, message: result.message }
        }

        if (settingsStore.settings.ai.provider === providerName) {
            secureApiKey.value = ''
            credentialState.value = 'missing'
            credentialMessage.value = 'API Key 已从系统凭据库删除'
            if (settingsStore.settings.ai.apiKey) {
                settingsStore.settings.ai.apiKey = ''
                settingsStore.save()
            }
        }
        return { success: true, message: 'API Key 已从系统凭据库删除' }
    }

    /** 从真实 Provider 端点刷新模型，并保留 Pi 适配器提供的静态目录。 */
    async function refreshModels(): Promise<AIOperationResult> {
        const p = provider.value
        if (!p) {
            const message = getUnavailableReason()
            modelDiscoveryState.value = 'error'
            modelDiscoveryMessage.value = message
            return { success: false, message }
        }

        const requestId = ++modelDiscoveryRequestId
        modelDiscoveryState.value = 'loading'
        modelDiscoveryMessage.value = '正在从 Provider 获取模型'

        try {
            const models = p.listModels
                ? await p.listModels()
                : [...p.models]
            if (requestId !== modelDiscoveryRequestId) {
                return { success: false, message: 'Provider 已切换，已忽略过期的模型结果' }
            }
            discoveredModels.value = models
            modelDiscoveryState.value = 'ready'
            modelDiscoveryMessage.value = `已读取 ${models.length} 个可用模型`
            return { success: true, message: modelDiscoveryMessage.value }
        } catch (e) {
            const message = e instanceof Error ? e.message : '读取模型失败'
            if (requestId === modelDiscoveryRequestId) {
                modelDiscoveryState.value = 'error'
                modelDiscoveryMessage.value = message
            }
            return { success: false, message }
        }
    }

    /**
     * 测试 AI 服务连接
     */
    async function testConnection(): Promise<{ success: boolean; message: string }> {
        const p = provider.value
        if (!p) {
            return {
                success: false,
                message: getUnavailableReason(),
            }
        }

        try {
            return await p.testConnection()
        } catch (e) {
            return {
                success: false,
                message: e instanceof Error ? e.message : '连接测试失败',
            }
        }
    }

    // ─── 请求控制 ───

    /**
     * 取消当前活跃的 AI 请求
     */
    function cancelRequest(): boolean {
        if (activeControllers.size === 0) return false

        for (const controller of activeControllers) {
            controller.abort()
        }
        activeControllers.clear()
        loading.value = false
        currentTask.value = null
        isStreaming.value = false
        error.value = '请求已取消'
        return true
    }

    // ─── 兼容旧 API ───

    /**
     * 检查 AI 状态（兼容旧 API）
     * 新实现通过 computed provider 自动检测，此方法触发一次连接测试
     */
    async function checkStatus() {
        const result = await testConnection()
        return {
            available: result.success,
            model: isAvailable.value ? settingsStore.settings.ai.model : null,
            error: result.success ? undefined : result.message,
        }
    }

    /**
     * 初始化 AI 凭据。
     * 旧版明文 key 仅作为本次迁移输入；系统凭据库写入成功后立即从设置中清除。
     */
    async function initialize(): Promise<void> {
        const config = settingsStore.settings.ai
        const providerName = config.provider

        if (!isCredentialRequired(providerName)) {
            await loadApiCredential(providerName)
            return
        }

        const legacySecret = config.apiKey.trim()
        if (legacySecret) {
            secureApiKey.value = legacySecret
            credentialState.value = 'legacy-session'
            credentialMessage.value = '检测到旧版明文 API Key，正在迁移到系统凭据库'

            const migration = await saveApiCredential(providerName, legacySecret)
            if (!migration.success) {
                secureApiKey.value = legacySecret
                credentialState.value = 'legacy-session'
                credentialMessage.value = `旧版 API Key 仅在当前会话使用；${migration.message}`
                logger.warn('AI API Key 未能迁移到系统凭据库', {
                    provider: providerName,
                    reason: migration.message,
                })
            }
            return
        }

        await loadApiCredential(providerName)
    }

    /** 重置状态 */
    function reset(): void {
        cancelRequest()
        loading.value = false
        currentTask.value = null
        error.value = null
        streamingContent.value = ''
        isStreaming.value = false
        lastRequestTime = 0
        secureApiKey.value = ''
        credentialState.value = 'idle'
        credentialMessage.value = ''
        discoveredModels.value = []
        modelDiscoveryState.value = 'idle'
        modelDiscoveryMessage.value = ''
        credentialRequestId += 1
        modelDiscoveryRequestId += 1
    }

    /** 清除警告（兼容旧 API） */
    function clearWarning(): void {
        error.value = null
    }

    return {
        // ─── State ───
        loading,
        error,
        currentTask,
        streamingContent,
        isStreaming,

        // 兼容旧 API
        status,
        warning: error, // 旧 store 中 warning 和 error 分开，新 store 统一为 error

        // ─── Getters ───
        isAvailable,
        currentModel,
        currentModelName,
        provider,
        availableModels,
        hasStoredCredential,
        isCredentialSecurelyStored,
        credentialState,
        credentialMessage,
        modelDiscoveryState,
        modelDiscoveryMessage,

        // ─── 纯函数 AI 方法（新 API） ───
        generateOutline,
        polishText,
        generateTitles,
        generateSummary,
        generateTranscript,
        continueWriting,
        streamGenerate,
        streamChat,
        testConnection,
        loadApiCredential,
        saveApiCredential,
        clearApiCredential,
        refreshModels,

        // ─── 通用生成 ───
        generate,

        // ─── 兼容旧 API 方法（操作 store） ───
        generateArticleSummary,
        generateArticleTitle,
        generateArticleTranscript,
        polishCurrentArticle,
        expandCurrentContent,
        condenseCurrentContent,
        cancelRequest,
        clearWarning,

        // ─── 生命周期 ───
        initialize,
        reset,
        checkStatus,
    }
})
