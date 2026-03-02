/**
 * OpenAI Provider
 * 支持 OpenAI Chat Completions API
 * 兼容 Azure OpenAI 等自定义端点
 */

import { logger, AppError, ErrorCode } from '@/services/error'
import { REQUEST_LIMITS } from '@/config/security'
import { isWebEnv } from '@/utils/platform'
import type {
    AIProvider,
    AIModel,
    ChatMessage,
    ChatOptions,
    ChatResponse,
} from './types'
import { OpenAIChatResponseSchema } from './types'

// ═══════════════════════════════════════════════════════════════════
// 模型定义
// ═══════════════════════════════════════════════════════════════════

const OPENAI_MODELS: readonly AIModel[] = [
    {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: '最新多模态模型，速度快、性价比高',
        maxContext: 128000,
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: '轻量级模型，适合简单任务',
        maxContext: 128000,
    },
    {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: '强大的推理能力，128K 上下文',
        maxContext: 128000,
    },
    {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: '快速且经济，适合大批量任务',
        maxContext: 16384,
    },
] as const

const DEFAULT_BASE_URL = 'https://api.openai.com'

// ═══════════════════════════════════════════════════════════════════
// Provider 实现
// ═══════════════════════════════════════════════════════════════════

export class OpenAIProvider implements AIProvider {
    readonly name = 'openai' as const
    readonly models = OPENAI_MODELS
    readonly defaultModel: string

    private readonly apiKey: string
    private readonly baseUrl: string

    constructor(apiKey: string, baseUrl?: string, defaultModel?: string) {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                'OpenAI API Key 不能为空'
            )
        }
        this.apiKey = apiKey.trim()
        this.defaultModel = defaultModel || 'gpt-4o'
        // 规范化 baseUrl：去除尾部斜杠，并去除可能的重复 /v1 后缀
        // 硅基流动等兼容 API 的 baseUrl 通常已包含 /v1
        const raw = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
        this.baseUrl = raw.endsWith('/v1') ? raw : raw + '/v1'
    }

    /**
     * 解析 API 请求 URL
     * Web dev 模式下通过 Vite CORS 代理转发，Tauri 环境直接请求
     */
    private resolveUrl(path: string): string {
        const fullUrl = `${this.baseUrl}${path}`
        // Web 环境 + dev 模式 → 通过 CORS 代理
        if (isWebEnv() && import.meta.env.DEV) {
            return `/api/cors-proxy?url=${encodeURIComponent(fullUrl)}`
        }
        return fullUrl
    }

    async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
        const model = options?.model || this.defaultModel
        const body = JSON.stringify({
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            max_tokens: options?.maxTokens || 2000,
            temperature: options?.temperature ?? 0.7,
            top_p: options?.topP,
        })

        // 请求体大小验证
        const bodySize = new TextEncoder().encode(body).length
        if (bodySize > REQUEST_LIMITS.MAX_REQUEST_BODY_SIZE) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `请求体过大: ${(bodySize / 1024 / 1024).toFixed(2)}MB，超过限制 1MB`
            )
        }

        const response = await fetch(this.resolveUrl('/chat/completions'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body,
            signal: options?.signal || AbortSignal.timeout(REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS),
        })

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '')
            logger.error('OpenAI API 请求失败', null, {
                status: response.status,
                model,
            })
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `OpenAI API 错误 (${response.status}): ${this.parseErrorMessage(errorBody, response.statusText)}`
            )
        }

        const rawData = await response.json()
        const parseResult = OpenAIChatResponseSchema.safeParse(rawData)

        if (!parseResult.success) {
            logger.warn('OpenAI 响应格式异常', {
                errors: parseResult.error.flatten().fieldErrors,
            })
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                'OpenAI 响应格式异常，可能 API 版本不兼容'
            )
        }

        const data = parseResult.data
        const choice = data.choices[0]

        return {
            content: choice?.message?.content || '',
            model: data.model,
            finishReason: choice?.finish_reason || null,
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
            },
        }
    }

    async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
        const model = options?.model || this.defaultModel

        const response = await fetch(this.resolveUrl('/chat/completions'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                max_tokens: options?.maxTokens || 2000,
                temperature: options?.temperature ?? 0.7,
                top_p: options?.topP,
                stream: true,
            }),
            signal: options?.signal || AbortSignal.timeout(REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS),
        })

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '')
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `OpenAI Stream 错误 (${response.status}): ${this.parseErrorMessage(errorBody, response.statusText)}`
            )
        }

        if (!response.body) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                'OpenAI Stream 响应体为空'
            )
        }

        yield* this.parseSSEStream(response.body)
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const result = await this.chat(
                [{ role: 'user', content: 'Say "OK" in one word.' }],
                { maxTokens: 5, temperature: 0 }
            )
            return {
                success: true,
                message: `连接成功，模型 ${result.model} 响应正常`,
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof AppError
                    ? error.message
                    : `连接失败: ${error instanceof Error ? error.message : String(error)}`,
            }
        }
    }

    // ─── 私有方法 ───

    private async *parseSSEStream(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
        const reader = body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed || !trimmed.startsWith('data: ')) continue
                    const data = trimmed.slice(6)
                    if (data === '[DONE]') return

                    try {
                        const parsed = JSON.parse(data)
                        const content = parsed.choices?.[0]?.delta?.content
                        if (typeof content === 'string' && content.length > 0) {
                            yield content
                        }
                    } catch {
                        // 跳过无法解析的行
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }
    }

    private parseErrorMessage(body: string, fallback: string): string {
        try {
            const parsed = JSON.parse(body)
            return parsed?.error?.message || fallback
        } catch {
            return fallback
        }
    }
}
