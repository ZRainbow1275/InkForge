/**
 * DeepSeek Provider
 * 使用 OpenAI 兼容 API，仅修改 baseUrl 和模型列表
 */

import { AppError, ErrorCode } from '@/services/error'
import type {
    AIProvider,
    AIModel,
    ChatMessage,
    ChatOptions,
    ChatResponse,
} from './types'
import { OpenAIProvider } from './openai'

// ═══════════════════════════════════════════════════════════════════
// 模型定义
// ═══════════════════════════════════════════════════════════════════

const DEEPSEEK_MODELS: readonly AIModel[] = [
    {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: '通用对话模型，适合日常写作',
        maxContext: 64000,
    },
    {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        description: '强化推理能力，适合分析和逻辑任务',
        maxContext: 64000,
    },
] as const

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

// ═══════════════════════════════════════════════════════════════════
// Provider 实现（委托给 OpenAI Provider）
// ═══════════════════════════════════════════════════════════════════

/**
 * DeepSeek Provider
 * 基于 OpenAI 兼容 API，通过组合模式复用 OpenAIProvider 实现
 */
export class DeepSeekProvider implements AIProvider {
    readonly name = 'deepseek' as const
    readonly models = DEEPSEEK_MODELS
    readonly defaultModel = 'deepseek-chat'

    private readonly delegate: OpenAIProvider

    constructor(apiKey: string, baseUrl?: string) {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                'DeepSeek API Key 不能为空'
            )
        }
        // 使用 OpenAI 兼容接口，仅替换 baseUrl
        this.delegate = new OpenAIProvider(
            apiKey,
            baseUrl || DEEPSEEK_BASE_URL
        )
    }

    async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
        return this.delegate.chat(messages, {
            ...options,
            model: options?.model || this.defaultModel,
        })
    }

    async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
        yield* this.delegate.stream(messages, {
            ...options,
            model: options?.model || this.defaultModel,
        })
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const result = await this.chat(
                [{ role: 'user', content: 'Say "OK" in one word.' }],
                { maxTokens: 5, temperature: 0 }
            )
            return {
                success: true,
                message: `连接成功，DeepSeek ${result.model} 响应正常`,
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
}
