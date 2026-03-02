/**
 * Anthropic Provider
 * 支持 Anthropic Messages API (v1)
 * 独立的认证方式（x-api-key）和消息格式
 */

import { logger, AppError, ErrorCode } from '@/services/error'
import { REQUEST_LIMITS } from '@/config/security'
import type {
    AIProvider,
    AIModel,
    ChatMessage,
    ChatOptions,
    ChatResponse,
} from './types'
import { AnthropicMessageResponseSchema } from './types'

// ═══════════════════════════════════════════════════════════════════
// 模型定义
// ═══════════════════════════════════════════════════════════════════

const ANTHROPIC_MODELS: readonly AIModel[] = [
    {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        description: '最强推理能力，适合复杂写作和分析',
        maxContext: 200000,
    },
    {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        description: '平衡能力与速度，适合日常写作',
        maxContext: 200000,
    },
    {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        description: '快速轻量，适合简单任务',
        maxContext: 200000,
    },
] as const

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
const ANTHROPIC_API_VERSION = '2023-06-01'

// ═══════════════════════════════════════════════════════════════════
// Provider 实现
// ═══════════════════════════════════════════════════════════════════

export class AnthropicProvider implements AIProvider {
    readonly name = 'anthropic' as const
    readonly models = ANTHROPIC_MODELS
    readonly defaultModel = 'claude-sonnet-4-6'

    private readonly apiKey: string
    private readonly baseUrl: string

    constructor(apiKey: string, baseUrl?: string) {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                'Anthropic API Key 不能为空'
            )
        }
        this.apiKey = apiKey.trim()
        this.baseUrl = (baseUrl || ANTHROPIC_BASE_URL).replace(/\/+$/, '')
    }

    async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
        const model = options?.model || this.defaultModel

        // Anthropic 需要将 system 消息分离
        const systemMessage = messages.find(m => m.role === 'system')
        const nonSystemMessages = messages.filter(m => m.role !== 'system')

        const body: Record<string, unknown> = {
            model,
            max_tokens: options?.maxTokens || 2000,
            temperature: options?.temperature ?? 0.7,
            top_p: options?.topP,
            messages: nonSystemMessages.map(m => ({
                role: m.role,
                content: m.content,
            })),
        }

        if (systemMessage) {
            body.system = systemMessage.content
        }

        const bodyStr = JSON.stringify(body)
        const bodySize = new TextEncoder().encode(bodyStr).length
        if (bodySize > REQUEST_LIMITS.MAX_REQUEST_BODY_SIZE) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `请求体过大: ${(bodySize / 1024 / 1024).toFixed(2)}MB，超过限制 1MB`
            )
        }

        const response = await fetch(`${this.baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': ANTHROPIC_API_VERSION,
                'Content-Type': 'application/json',
            },
            body: bodyStr,
            signal: options?.signal || AbortSignal.timeout(REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS),
        })

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '')
            logger.error('Anthropic API 请求失败', null, {
                status: response.status,
                model,
            })
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `Anthropic API 错误 (${response.status}): ${this.parseErrorMessage(errorBody, response.statusText)}`
            )
        }

        const rawData = await response.json()
        const parseResult = AnthropicMessageResponseSchema.safeParse(rawData)

        if (!parseResult.success) {
            logger.warn('Anthropic 响应格式异常', {
                errors: parseResult.error.flatten().fieldErrors,
            })
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                'Anthropic 响应格式异常，可能 API 版本不兼容'
            )
        }

        const data = parseResult.data
        const textContent = data.content.find(c => c.type === 'text')

        return {
            content: textContent?.text || '',
            model: data.model,
            finishReason: this.mapStopReason(data.stop_reason),
            usage: {
                promptTokens: data.usage.input_tokens,
                completionTokens: data.usage.output_tokens,
                totalTokens: data.usage.input_tokens + data.usage.output_tokens,
            },
        }
    }

    async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
        const model = options?.model || this.defaultModel

        const systemMessage = messages.find(m => m.role === 'system')
        const nonSystemMessages = messages.filter(m => m.role !== 'system')

        const body: Record<string, unknown> = {
            model,
            max_tokens: options?.maxTokens || 2000,
            temperature: options?.temperature ?? 0.7,
            top_p: options?.topP,
            stream: true,
            messages: nonSystemMessages.map(m => ({
                role: m.role,
                content: m.content,
            })),
        }

        if (systemMessage) {
            body.system = systemMessage.content
        }

        const response = await fetch(`${this.baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': ANTHROPIC_API_VERSION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: options?.signal || AbortSignal.timeout(REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS),
        })

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '')
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `Anthropic Stream 错误 (${response.status}): ${this.parseErrorMessage(errorBody, response.statusText)}`
            )
        }

        if (!response.body) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                'Anthropic Stream 响应体为空'
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

                    try {
                        const parsed = JSON.parse(data)
                        // Anthropic 流式：content_block_delta 事件包含文本
                        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                            yield parsed.delta.text
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

    private mapStopReason(
        reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null
    ): ChatResponse['finishReason'] {
        switch (reason) {
            case 'end_turn': return 'stop'
            case 'max_tokens': return 'length'
            case 'stop_sequence': return 'stop'
            default: return null
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
