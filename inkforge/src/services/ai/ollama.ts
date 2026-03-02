/**
 * Ollama Provider
 * 本地 LLM 推理，通过 Tauri IPC 或 HTTP 访问
 * 无需 API Key，动态获取模型列表
 */

import { logger, AppError, ErrorCode } from '@/services/error'
import { REQUEST_LIMITS, OLLAMA_CONFIG } from '@/config/security'
import { isTauriEnv, tauriInvoke } from '@/utils/platform'
import { OllamaTagsResponseSchema } from '@/schemas/api'
import type {
    AIProvider,
    AIModel,
    ChatMessage,
    ChatOptions,
    ChatResponse,
} from './types'

// ═══════════════════════════════════════════════════════════════════
// 静态模型列表（降级时使用）
// ═══════════════════════════════════════════════════════════════════

const OLLAMA_FALLBACK_MODELS: readonly AIModel[] = [
    {
        id: 'qwen2.5:7b',
        name: 'Qwen 2.5 7B',
        description: '通义千问 2.5，中文能力优秀',
        maxContext: 32768,
    },
    {
        id: 'qwen2.5:3b',
        name: 'Qwen 2.5 3B',
        description: '轻量版千问，速度更快',
        maxContext: 32768,
    },
    {
        id: 'llama3.2:3b',
        name: 'Llama 3.2 3B',
        description: 'Meta Llama 轻量模型',
        maxContext: 128000,
    },
    {
        id: 'mistral:7b',
        name: 'Mistral 7B',
        description: 'Mistral AI 基础模型',
        maxContext: 32768,
    },
] as const

// ═══════════════════════════════════════════════════════════════════
// Tauri IPC 类型
// ═══════════════════════════════════════════════════════════════════

interface TauriOllamaStatus {
    available: boolean
    model: string | null
    error: string | null
}

// ═══════════════════════════════════════════════════════════════════
// Provider 实现
// ═══════════════════════════════════════════════════════════════════

export class OllamaProvider implements AIProvider {
    readonly name = 'ollama' as const
    readonly models = OLLAMA_FALLBACK_MODELS
    readonly defaultModel = OLLAMA_CONFIG.DEFAULT_MODEL

    private readonly baseUrl: string

    constructor(ollamaUrl?: string) {
        this.baseUrl = (ollamaUrl || OLLAMA_CONFIG.DEFAULT_BASE_URL).replace(/\/+$/, '')
        this.validateUrl(this.baseUrl)
    }

    async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
        const model = options?.model || this.defaultModel

        // Tauri 环境：通过 IPC
        if (isTauriEnv()) {
            return this.chatViaTauri(messages, model, options)
        }

        // Web 环境：使用 /api/chat（OpenAI 兼容模式）
        const body = JSON.stringify({
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: false,
            options: {
                temperature: options?.temperature ?? 0.7,
                num_predict: options?.maxTokens || 2000,
            },
        })

        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: options?.signal || AbortSignal.timeout(REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS),
        })

        if (!response.ok) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `Ollama API 错误 (${response.status}): ${response.statusText}`
            )
        }

        const data = await response.json()

        return {
            content: data.message?.content || '',
            model: data.model || model,
            finishReason: data.done ? 'stop' : null,
            usage: {
                promptTokens: data.prompt_eval_count || 0,
                completionTokens: data.eval_count || 0,
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
            },
        }
    }

    async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
        const model = options?.model || this.defaultModel

        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true,
                options: {
                    temperature: options?.temperature ?? 0.7,
                    num_predict: options?.maxTokens || 2000,
                },
            }),
            signal: options?.signal || AbortSignal.timeout(REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS),
        })

        if (!response.ok) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `Ollama Stream 错误 (${response.status}): ${response.statusText}`
            )
        }

        if (!response.body) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                'Ollama Stream 响应体为空'
            )
        }

        yield* this.parseNDJSONStream(response.body)
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            // Tauri 环境
            if (isTauriEnv()) {
                const status = await tauriInvoke<TauriOllamaStatus>('check_ollama_status')
                if (status.available) {
                    return {
                        success: true,
                        message: `Ollama 连接成功，当前模型: ${status.model || '未知'}`,
                    }
                }
                return {
                    success: false,
                    message: status.error || 'Ollama 服务不可用',
                }
            }

            // Web 环境：检查 /api/tags
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(REQUEST_LIMITS.AI_STATUS_TIMEOUT_MS),
            })

            if (!response.ok) {
                return {
                    success: false,
                    message: `Ollama 服务未响应 (${response.status})`,
                }
            }

            const rawData = await response.json()
            const parseResult = OllamaTagsResponseSchema.safeParse(rawData)

            if (!parseResult.success) {
                return {
                    success: false,
                    message: 'Ollama 响应格式异常，可能版本不兼容',
                }
            }

            const modelCount = parseResult.data.models.length
            if (modelCount === 0) {
                return {
                    success: true,
                    message: '已连接，但没有可用模型。运行 ollama pull qwen2.5:7b 下载模型',
                }
            }

            return {
                success: true,
                message: `连接成功，${modelCount} 个模型可用`,
            }
        } catch (error) {
            return {
                success: false,
                message: `Ollama 连接失败: ${error instanceof Error ? error.message : String(error)}`,
            }
        }
    }

    async listModels(): Promise<AIModel[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(REQUEST_LIMITS.AI_STATUS_TIMEOUT_MS),
            })

            if (!response.ok) return [...OLLAMA_FALLBACK_MODELS]

            const rawData = await response.json()
            const parseResult = OllamaTagsResponseSchema.safeParse(rawData)

            if (!parseResult.success) return [...OLLAMA_FALLBACK_MODELS]

            return parseResult.data.models.map(m => ({
                id: m.name,
                name: m.name,
                description: m.details?.family
                    ? `${m.details.family} (${m.details.parameter_size || '未知'})`
                    : '本地模型',
                maxContext: 32768,
            }))
        } catch {
            logger.warn('获取 Ollama 模型列表失败，使用默认列表')
            return [...OLLAMA_FALLBACK_MODELS]
        }
    }

    // ─── 私有方法 ───

    private validateUrl(url: string): void {
        try {
            const parsed = new URL(url)
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                throw new Error('不支持的协议')
            }
        } catch {
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                `Ollama URL 格式无效: ${url}`
            )
        }
    }

    private async chatViaTauri(
        messages: ChatMessage[],
        model: string,
        options?: ChatOptions
    ): Promise<ChatResponse> {
        // 将 chat 消息转成单一 prompt（Ollama 旧 API 兼容）
        const prompt = messages.map(m => {
            const prefix = m.role === 'system' ? '[System] '
                : m.role === 'user' ? '[User] '
                : '[Assistant] '
            return prefix + m.content
        }).join('\n\n')

        try {
            const result = await tauriInvoke<{ response: string; done: boolean }>('ollama_generate', {
                request: {
                    model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? 0.7,
                        num_predict: options?.maxTokens || 2000,
                    },
                },
            })

            return {
                content: result.response || '',
                model,
                finishReason: result.done ? 'stop' : null,
                usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                },
            }
        } catch (error) {
            throw new AppError(
                ErrorCode.AI_GENERATION_FAILED,
                `Ollama Tauri IPC 失败: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    private async *parseNDJSONStream(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
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
                    if (!trimmed) continue

                    try {
                        const parsed = JSON.parse(trimmed)
                        if (parsed.message?.content) {
                            yield parsed.message.content
                        }
                        if (parsed.done) return
                    } catch {
                        // 跳过
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }
    }
}
