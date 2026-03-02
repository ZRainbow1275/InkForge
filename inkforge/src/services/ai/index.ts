/**
 * AI Provider 模块入口
 * 统一导出所有 Provider 相关类型和工具
 */

// 核心类型
export type {
    AIProvider,
    AIModel,
    ChatMessage,
    ChatRole,
    ChatOptions,
    ChatResponse,
    TokenUsage,
    ProviderName,
    ProviderConfig,
} from './types'

// Zod Schema（用于响应验证）
export {
    OpenAIChatResponseSchema,
    OpenAIStreamChunkSchema,
    AnthropicMessageResponseSchema,
    AnthropicStreamEventSchema,
} from './types'

// Provider 实现
export { OpenAIProvider } from './openai'
export { AnthropicProvider } from './anthropic'
export { DeepSeekProvider } from './deepseek'
export { OllamaProvider } from './ollama'

// 工厂函数
export {
    createProvider,
    validateProviderConfig,
    getProviderDisplayName,
    getProviderDescription,
    getAllProviders,
} from './factory'
