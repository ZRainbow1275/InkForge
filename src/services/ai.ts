/**
 * AI 服务 - 本地 Ollama 集成
 * 完全离线运行，支持 Web 和 Tauri 双平台
 */

import { logger, AppError, ErrorCode } from './error'
import { isTauriEnv, tauriInvoke } from '@/utils/platform'
import { REQUEST_LIMITS, getConfigWithHardLimit, OLLAMA_CONFIG } from '@/config/security'
import { TimeoutQueue, TimeoutError } from '@/utils/async-manager'
import {
    OllamaTagsResponseSchema,
    OllamaGenerateResponseSchema,
    type OllamaTagsResponse,
    type OllamaGenerateResponse
} from '@/schemas/api'

// ═══════════════════════════════════════════════════════════════════
// 安全验证
// ═══════════════════════════════════════════════════════════════════

/**
 * 验证 Ollama URL 安全性
 * 仅允许 localhost 和明确配置的安全主机
 */
function validateOllamaUrl(url: string): void {
    try {
        const parsed = new URL(url)
        const hostname = parsed.hostname.toLowerCase()

        // 使用集中配置的允许主机列表
        const allowedHosts = OLLAMA_CONFIG.ALLOWED_HOSTS as readonly string[]

        // 检查是否为允许的主机
        if (!allowedHosts.includes(hostname)) {
            const isProduction = import.meta.env.PROD

            // 生产环境严格模式：非白名单主机直接拒绝，防止 SSRF
            if (isProduction) {
                throw new AppError(
                    ErrorCode.AI_SERVICE_UNAVAILABLE,
                    '[Security] Ollama URL 使用了未授权的主机地址',
                    { reason: 'HOST_NOT_ALLOWED' }
                )
            }

            // 开发环境：仅警告，允许调试
            logger.warn('[Security] Ollama URL 使用非 localhost 地址，请确保这是预期的配置', {
                hostType: hostname.includes('.') ? 'domain' : 'ip',
                isLocalhost: false
            })
        }

        // 禁止非 HTTP(S) 协议
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                `[Security] Ollama URL 协议不安全: ${parsed.protocol}`,
                { protocol: parsed.protocol }
            )
        }
    } catch (error) {
        if (error instanceof AppError) throw error
        throw new AppError(
            ErrorCode.AI_SERVICE_UNAVAILABLE,
            '[Security] Ollama URL 格式无效',
            // 不记录完整 URL，防止泄露
            { reason: 'INVALID_URL_FORMAT' }
        )
    }
}

// ═══════════════════════════════════════════════════════════════════
// 配置常量（从安全配置中心导入，可通过环境变量覆盖）
// ═══════════════════════════════════════════════════════════════════

/** Ollama API 地址（本地）- 使用集中配置 */
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_URL || OLLAMA_CONFIG.DEFAULT_BASE_URL

// 验证 Ollama URL 安全性
validateOllamaUrl(OLLAMA_BASE_URL)

/** 默认模型 - 使用集中配置 */
const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_MODEL || OLLAMA_CONFIG.DEFAULT_MODEL

/** 状态检查超时（毫秒）- 硬性上限 30 秒 */
const STATUS_CHECK_TIMEOUT_MS = getConfigWithHardLimit(
    import.meta.env.VITE_AI_STATUS_TIMEOUT,
    REQUEST_LIMITS.AI_STATUS_TIMEOUT_MS,
    30_000 // 硬性上限：30秒
)

/** 生成请求超时（毫秒）- 硬性上限 5 分钟 */
const GENERATE_TIMEOUT_MS = getConfigWithHardLimit(
    import.meta.env.VITE_AI_GENERATE_TIMEOUT,
    REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS,
    300_000 // 硬性上限：5分钟
)

/** 请求节流间隔（毫秒）- 硬性上限 10 秒 */
const THROTTLE_INTERVAL_MS = getConfigWithHardLimit(
    import.meta.env.VITE_AI_THROTTLE_INTERVAL,
    REQUEST_LIMITS.AI_THROTTLE_INTERVAL_MS,
    10_000 // 硬性上限：10秒
)

/** 最大输入内容长度（字符）- 使用硬性上限保护 */
const MAX_INPUT_LENGTH = getConfigWithHardLimit(
    import.meta.env.VITE_AI_MAX_INPUT_LENGTH,
    REQUEST_LIMITS.AI_MAX_INPUT_LENGTH_DEFAULT,
    REQUEST_LIMITS.AI_MAX_INPUT_LENGTH_HARD_LIMIT
)

/** 最大请求体大小（字节）- 1MB */
const MAX_REQUEST_BODY_SIZE = REQUEST_LIMITS.MAX_REQUEST_BODY_SIZE

// ═══════════════════════════════════════════════════════════════════
// Tauri IPC 类型定义
// ═══════════════════════════════════════════════════════════════════

/** Tauri 后端返回的 Ollama 状态 */
interface TauriOllamaStatus {
    available: boolean
    model: string | null
    error: string | null
}

/** Tauri 生成请求参数 */
interface TauriGenerateRequest {
    model: string
    prompt: string
    stream: boolean
    options?: {
        temperature?: number
        num_predict?: number
    }
}

/** Tauri 生成响应 */
interface TauriGenerateResponse {
    response: string
    done: boolean
}

// ═══════════════════════════════════════════════════════════════════
// 请求节流控制
// ═══════════════════════════════════════════════════════════════════

/** 首选模型列表（从集中配置导入） */
const PREFERRED_MODELS = OLLAMA_CONFIG.PREFERRED_MODELS

/** AI 请求队列（使用新的 TimeoutQueue 替代手动实现） */
const aiRequestQueue = new TimeoutQueue({
    name: 'ai-request',
    maxConcurrent: 1,
    maxQueueSize: REQUEST_LIMITS.AI_QUEUE_MAX_SIZE,
    defaultTimeoutMs: 60_000 // 队列等待超时 60 秒
})

/** AI 请求状态管理器（简化版，队列逻辑已移至 TimeoutQueue） */
const aiRequestState = {
    lastRequestTime: 0,
    activeController: null as AbortController | null,

    updateLastRequestTime(): void {
        this.lastRequestTime = Date.now()
    },

    getTimeSinceLastRequest(): number {
        return Date.now() - this.lastRequestTime
    },

    setController(controller: AbortController): void {
        this.activeController = controller
    },

    clearController(): void {
        this.activeController = null
    },

    abortIfActive(): boolean {
        if (this.activeController) {
            this.activeController.abort()
            this.activeController = null
            return true
        }
        return false
    },

    /**
     * 重置所有状态（用于测试或多标签页场景）
     */
    reset(): void {
        this.lastRequestTime = 0
        if (this.activeController) {
            this.activeController.abort()
        }
        this.activeController = null
        // 清空队列
        aiRequestQueue.forceReleaseAll()
    }
}

/**
 * 节流检查：确保请求间隔不小于 THROTTLE_INTERVAL_MS
 */
function checkThrottle(): void {
    const timeSinceLastRequest = aiRequestState.getTimeSinceLastRequest()

    if (timeSinceLastRequest < THROTTLE_INTERVAL_MS) {
        throw new AppError(
            ErrorCode.AI_SERVICE_UNAVAILABLE,
            `请求过于频繁，请等待 ${Math.ceil((THROTTLE_INTERVAL_MS - timeSinceLastRequest) / 1000)} 秒后重试`
        )
    }
}

/**
 * 重置 AI 请求状态（用于测试或清理）
 */
export function resetAIState(): void {
    aiRequestState.reset()
}

/**
 * 取消当前活跃的 AI 请求
 */
export function cancelCurrentRequest(): boolean {
    if (aiRequestState.abortIfActive()) {
        logger.info('AI 请求已取消')
        return true
    }
    return false
}

/**
 * AI 服务状态
 */
export interface AIStatus {
    available: boolean
    model: string | null
    error?: string
}

/**
 * 生成选项
 */
export interface GenerateOptions {
    model?: string
    temperature?: number
    maxTokens?: number
}

/**
 * 生成结果（包含截断信息）
 */
export interface GenerateResult {
    content: string
    truncated: boolean
    originalLength?: number
}

/**
 * 检查 Ollama 是否可用（平台自适应）
 */
export async function checkOllamaStatus(): Promise<AIStatus> {
    // Tauri 环境：通过 IPC 调用后端（绕过 CORS）
    if (isTauriEnv()) {
        try {
            const status = await tauriInvoke<TauriOllamaStatus>('check_ollama_status')
            return {
                available: status.available,
                model: status.model,
                error: status.error || undefined
            }
        } catch (error) {
            logger.warn('Tauri IPC 调用失败', { error: error instanceof Error ? error.message : String(error) })
            return {
                available: false,
                model: null,
                error: 'Tauri 后端通信失败'
            }
        }
    }

    // Web 环境：直接 fetch
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(STATUS_CHECK_TIMEOUT_MS)
        })

        if (!response.ok) {
            logger.warn('Ollama 服务未响应', { status: response.status })
            return { available: false, model: null, error: 'Ollama 服务未响应' }
        }

        const rawData = await response.json()

        // Schema 校验：确保响应格式正确
        const parseResult = OllamaTagsResponseSchema.safeParse(rawData)
        if (!parseResult.success) {
            logger.warn('Ollama 响应格式异常', {
                errors: parseResult.error.flatten().fieldErrors
            })
            return {
                available: false,
                model: null,
                error: 'Ollama 响应格式异常，可能版本不兼容'
            }
        }

        const data: OllamaTagsResponse = parseResult.data
        const models = data.models

        if (models.length === 0) {
            return { available: false, model: null, error: '没有可用的模型，请运行: ollama pull qwen2.5:7b' }
        }

        // 查找首选模型（使用常量）
        let selectedModel = models[0].name

        for (const preferred of PREFERRED_MODELS) {
            if (models.some((m) => m.name === preferred)) {
                selectedModel = preferred
                break
            }
        }

        logger.info('Ollama 可用', { model: selectedModel })
        return { available: true, model: selectedModel }
    } catch (error) {
        logger.warn('Ollama 连接失败', { error: error instanceof Error ? error.message : String(error) })
        return {
            available: false,
            model: null,
            error: 'Ollama 未运行。请先安装并启动 Ollama: https://ollama.ai'
        }
    }
}

/**
 * 调用 Ollama 生成（平台自适应）
 * @param prompt - 提示词
 * @param options - 生成选项
 * @throws AppError 如果请求过于频繁、超时或生成失败
 */
async function generate(prompt: string, options: GenerateOptions = {}): Promise<GenerateResult> {
    // 1. 节流检查
    checkThrottle()

    // 2. 获取并发槽位（使用 TimeoutQueue，带超时保护）
    try {
        await aiRequestQueue.acquireSlot()
    } catch (error) {
        if (error instanceof TimeoutError) {
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                '请求等待超时，请稍后重试'
            )
        }
        throw error
    }

    try {
        // 3. 输入长度检查（不可变处理）
        const wasTruncated = prompt.length > MAX_INPUT_LENGTH
        const originalLength = wasTruncated ? prompt.length : undefined

        const truncatedPrompt = wasTruncated
            ? (() => {
                logger.warn('AI 输入内容过长，已截断', { originalLength: prompt.length, maxLength: MAX_INPUT_LENGTH })
                return prompt.slice(0, MAX_INPUT_LENGTH) + '\n\n[内容已截断...]'
            })()
            : prompt

        const model = options.model || DEFAULT_MODEL

        // 4. 构建请求参数
        const requestParams: TauriGenerateRequest = {
            model,
            prompt: truncatedPrompt,
            stream: false,
            options: {
                temperature: options.temperature || 0.7,
                num_predict: options.maxTokens || 1000
            }
        }

        // 5. 请求体大小验证
        const requestBody = JSON.stringify(requestParams)
        const requestBodySize = new TextEncoder().encode(requestBody).length
        if (requestBodySize > MAX_REQUEST_BODY_SIZE) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `请求体过大: ${(requestBodySize / 1024 / 1024).toFixed(2)}MB，超过限制 1MB`,
                { size: requestBodySize, maxSize: MAX_REQUEST_BODY_SIZE }
            )
        }

        aiRequestState.updateLastRequestTime()

        // 6. 平台分支：Tauri IPC vs Web Fetch
        if (isTauriEnv()) {
            try {
                const result = await tauriInvoke<TauriGenerateResponse>('ollama_generate', { request: requestParams })
                return {
                    content: result.response || '',
                    truncated: wasTruncated,
                    originalLength
                }
            } catch (error) {
                logger.error('Tauri AI 生成失败', error instanceof Error ? error : null, { model })
                throw new AppError(
                    ErrorCode.AI_GENERATION_FAILED,
                    `AI 生成失败: ${error instanceof Error ? error.message : String(error)}`,
                    { model }
                )
            }
        }

        // Web 环境：使用 fetch
        const controller = new AbortController()
        aiRequestState.setController(controller)
        const timeoutId = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)

        try {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: requestBody
            })

            if (!response.ok) {
                logger.error('AI 生成失败', null, { status: response.status, model })
                throw new AppError(
                    ErrorCode.AI_GENERATION_FAILED,
                    `AI 生成失败: ${response.statusText}`,
                    { status: response.status, model }
                )
            }

            const rawData = await response.json()

            // Schema 校验：确保响应格式正确
            const parseResult = OllamaGenerateResponseSchema.safeParse(rawData)
            if (!parseResult.success) {
                logger.warn('Ollama 生成响应格式异常', {
                    errors: parseResult.error.flatten().fieldErrors
                })
                throw new AppError(
                    ErrorCode.AI_GENERATION_FAILED,
                    'AI 响应格式异常，可能版本不兼容',
                    { validationErrors: parseResult.error.flatten().fieldErrors }
                )
            }

            const data: OllamaGenerateResponse = parseResult.data
            return {
                content: data.response,
                truncated: wasTruncated,
                originalLength
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new AppError(
                    ErrorCode.AI_SERVICE_UNAVAILABLE,
                    '请求已取消或超时',
                    { timeout: GENERATE_TIMEOUT_MS }
                )
            }
            throw error
        } finally {
            clearTimeout(timeoutId)
            aiRequestState.clearController()
        }
    } finally {
        // 释放并发槽位（确保始终执行）
        aiRequestQueue.releaseSlot()
    }
}

/**
 * 生成摘要
 */
export async function generateSummary(content: string, options?: GenerateOptions): Promise<GenerateResult> {
    const prompt = `请为以下内容生成一个简洁的中文摘要（100-150字）：

${content}

摘要：`

    return generate(prompt, options)
}

/**
 * 生成文章标题
 */
export async function generateTitle(content: string, options?: GenerateOptions): Promise<GenerateResult> {
    const prompt = `请为以下内容生成一个吸引人的微信公众号文章标题（15-25字，不要使用标点符号结尾）：

${content}

标题：`

    const result = await generate(prompt, { ...options, maxTokens: 50 })
    return {
        ...result,
        content: result.content.trim().replace(/^["'《]|["'》]$/g, '')
    }
}

/**
 * 生成口播稿
 */
export async function generateTranscript(content: string, options?: GenerateOptions): Promise<GenerateResult> {
    const prompt = `请将以下内容改写成适合口播的稿件。要求：
1. 口语化表达，自然流畅
2. 适当加入过渡语
3. 控制在200-300字
4. 不要使用书面语

原文：
${content}

口播稿：`

    return generate(prompt, options)
}

/**
 * 润色文章
 */
export async function polishArticle(content: string, style: string = '专业', options?: GenerateOptions): Promise<GenerateResult> {
    const prompt = `请润色以下文章，使其更加${style}。保持原意，优化表达：

${content}

润色后：`

    return generate(prompt, options)
}

/**
 * 扩写内容
 */
export async function expandContent(content: string, targetLength: number = 500, options?: GenerateOptions): Promise<GenerateResult> {
    const prompt = `请扩写以下内容至约${targetLength}字，添加更多细节和例子：

${content}

扩写后：`

    return generate(prompt, { ...options, maxTokens: targetLength + 200 })
}

/**
 * 缩写内容
 */
export async function condenseContent(content: string, targetLength: number = 200, options?: GenerateOptions): Promise<GenerateResult> {
    const prompt = `请将以下内容精简至约${targetLength}字，保留核心信息：

${content}

精简后：`

    return generate(prompt, { ...options, maxTokens: targetLength + 100 })
}

/**
 * 生成大纲
 */
export async function generateOutline(topic: string, options?: GenerateOptions): Promise<GenerateResult> {
    const prompt = `请为主题"${topic}"生成一个微信公众号文章大纲，包含：
1. 引言
2. 3-5个主要观点
3. 总结

大纲：`

    return generate(prompt, options)
}
