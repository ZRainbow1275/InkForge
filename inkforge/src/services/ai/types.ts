/**
 * AI Provider 统一类型定义
 * 所有 Provider 必须实现这些接口
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════
// 核心接口
// ═══════════════════════════════════════════════════════════════════

/** 聊天消息角色 */
export type ChatRole = 'system' | 'user' | 'assistant'

/** 聊天消息 */
export interface ChatMessage {
    role: ChatRole
    content: string
}

/** 聊天选项 */
export interface ChatOptions {
    model?: string
    maxTokens?: number
    temperature?: number
    topP?: number
    /** AbortSignal（用于取消请求） */
    signal?: AbortSignal
}

/** 聊天响应 */
export interface ChatResponse {
    content: string
    usage: TokenUsage
    /** 模型实际使用的 ID */
    model: string
    /** 完成原因 */
    finishReason: 'stop' | 'length' | 'content_filter' | 'error' | null
}

/** Token 使用量 */
export interface TokenUsage {
    promptTokens: number
    completionTokens: number
    totalTokens: number
}

/** AI 模型信息 */
export interface AIModel {
    id: string
    name: string
    description: string
    maxContext: number
}

/** Provider 名称 */
export type ProviderName = 'openai' | 'anthropic' | 'deepseek' | 'ollama'

/** Provider 配置 */
export interface ProviderConfig {
    provider: ProviderName
    apiKey: string
    baseUrl?: string
    model: string
    maxTokens: number
    temperature: number
    ollamaUrl?: string
}

// ═══════════════════════════════════════════════════════════════════
// Provider 接口
// ═══════════════════════════════════════════════════════════════════

/**
 * 统一 AI Provider 接口
 * 所有 Provider 必须实现此接口
 */
export interface AIProvider {
    /** Provider 唯一名称 */
    readonly name: ProviderName
    /** 支持的模型列表 */
    readonly models: readonly AIModel[]
    /** 默认模型 ID */
    readonly defaultModel: string

    /**
     * 聊天补全（非流式）
     * @param messages - 聊天消息列表
     * @param options - 可选参数
     * @returns 完整的聊天响应
     */
    chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>

    /**
     * 流式聊天补全
     * @param messages - 聊天消息列表
     * @param options - 可选参数
     * @returns 异步可迭代的文本流
     */
    stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>

    /**
     * 测试连接
     * @returns 是否连接成功及消息
     */
    testConnection(): Promise<{ success: boolean; message: string }>

    /**
     * 获取可用模型列表（动态获取，如 Ollama）
     * 默认返回静态模型列表
     */
    listModels?(): Promise<AIModel[]>
}

// ═══════════════════════════════════════════════════════════════════
// Zod Schema（响应验证）
// ═══════════════════════════════════════════════════════════════════

/** OpenAI Chat Completion 响应 Schema */
export const OpenAIChatResponseSchema = z.object({
    id: z.string(),
    object: z.literal('chat.completion'),
    created: z.number(),
    model: z.string(),
    choices: z.array(z.object({
        index: z.number(),
        message: z.object({
            role: z.enum(['assistant']),
            content: z.string().nullable(),
        }),
        finish_reason: z.enum(['stop', 'length', 'content_filter']).nullable(),
    })),
    usage: z.object({
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
        total_tokens: z.number(),
    }).optional(),
})

/** OpenAI 流式 Chunk Schema */
export const OpenAIStreamChunkSchema = z.object({
    id: z.string(),
    object: z.literal('chat.completion.chunk'),
    created: z.number(),
    model: z.string(),
    choices: z.array(z.object({
        index: z.number(),
        delta: z.object({
            role: z.enum(['assistant']).optional(),
            content: z.string().nullable().optional(),
        }),
        finish_reason: z.enum(['stop', 'length', 'content_filter']).nullable(),
    })),
})

/** Anthropic Messages 响应 Schema */
export const AnthropicMessageResponseSchema = z.object({
    id: z.string(),
    type: z.literal('message'),
    role: z.literal('assistant'),
    content: z.array(z.object({
        type: z.literal('text'),
        text: z.string(),
    })),
    model: z.string(),
    stop_reason: z.enum(['end_turn', 'max_tokens', 'stop_sequence']).nullable(),
    usage: z.object({
        input_tokens: z.number(),
        output_tokens: z.number(),
    }),
})

/** Anthropic 流式事件类型 */
export const AnthropicStreamEventSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('content_block_delta'),
        index: z.number(),
        delta: z.object({
            type: z.literal('text_delta'),
            text: z.string(),
        }),
    }),
    z.object({
        type: z.literal('message_start'),
        message: z.object({
            id: z.string(),
            model: z.string(),
            usage: z.object({
                input_tokens: z.number(),
                output_tokens: z.number(),
            }),
        }),
    }),
    z.object({
        type: z.literal('message_delta'),
        delta: z.object({
            stop_reason: z.enum(['end_turn', 'max_tokens', 'stop_sequence']).nullable(),
        }),
        usage: z.object({
            output_tokens: z.number(),
        }),
    }),
    z.object({
        type: z.literal('message_stop'),
    }),
    z.object({
        type: z.literal('content_block_start'),
        index: z.number(),
        content_block: z.object({
            type: z.literal('text'),
            text: z.string(),
        }),
    }),
    z.object({
        type: z.literal('content_block_stop'),
        index: z.number(),
    }),
    z.object({
        type: z.literal('ping'),
    }),
])

export type OpenAIChatResponse = z.infer<typeof OpenAIChatResponseSchema>
export type OpenAIStreamChunk = z.infer<typeof OpenAIStreamChunkSchema>
export type AnthropicMessageResponse = z.infer<typeof AnthropicMessageResponseSchema>
export type AnthropicStreamEvent = z.infer<typeof AnthropicStreamEventSchema>
