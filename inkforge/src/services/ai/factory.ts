/**
 * AI Provider 工厂
 * 根据配置创建对应的 Provider 实例
 */

import { AppError, ErrorCode } from '@/services/error'
import type { AIProvider, ProviderConfig, ProviderName } from './types'
import { PiAIProvider } from './pi'

/**
 * 创建 AI Provider 实例
 * @param config - Provider 配置
 * @returns AIProvider 实例
 * @throws AppError 如果 Provider 类型未知或配置无效
 */
export function createProvider(config: ProviderConfig): AIProvider {
    switch (config.provider) {
        case 'openai':
        case 'anthropic':
        case 'deepseek':
        case 'ollama':
            return new PiAIProvider(config)

        default: {
            // 穷举检查（TypeScript exhaustive check）
            const _exhaustive: never = config.provider
            throw new AppError(
                ErrorCode.AI_SERVICE_UNAVAILABLE,
                `未知的 AI Provider: ${_exhaustive}`
            )
        }
    }
}

/**
 * 验证 Provider 配置是否有效
 * @param config - Provider 配置
 * @returns 验证结果
 */
export function validateProviderConfig(config: ProviderConfig): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    // 非 Ollama Provider 需要 API Key
    if (config.provider !== 'ollama' && (!config.apiKey || config.apiKey.trim().length === 0)) {
        errors.push(`${getProviderDisplayName(config.provider)} 需要提供 API Key`)
    }

    // 验证自定义 baseUrl 格式
    if (config.baseUrl) {
        try {
            const url = new URL(config.baseUrl)
            if (!['http:', 'https:'].includes(url.protocol)) {
                errors.push('API 端点必须使用 HTTP 或 HTTPS 协议')
            }
        } catch {
            errors.push('API 端点 URL 格式无效')
        }
    }

    // Ollama URL 验证
    if (config.provider === 'ollama' && config.ollamaUrl) {
        try {
            const url = new URL(config.ollamaUrl)
            if (!['http:', 'https:'].includes(url.protocol)) {
                errors.push('Ollama URL 必须使用 HTTP 或 HTTPS 协议')
            }
        } catch {
            errors.push('Ollama URL 格式无效')
        }
    }

    // Temperature 范围验证
    if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature 必须在 0-2 之间')
    }

    // MaxTokens 范围验证
    if (config.maxTokens < 100 || config.maxTokens > 8000) {
        errors.push('MaxTokens 必须在 100-8000 之间')
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * 获取 Provider 显示名称
 */
export function getProviderDisplayName(provider: ProviderName): string {
    const names: Record<ProviderName, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        deepseek: 'DeepSeek',
        ollama: 'Ollama（本地）',
    }
    return names[provider]
}

/**
 * 获取 Provider 描述
 */
export function getProviderDescription(provider: ProviderName): string {
    const descriptions: Record<ProviderName, string> = {
        openai: 'GPT-4o、GPT-4 Turbo 等强大模型，需要 API Key',
        anthropic: 'Claude Opus/Sonnet/Haiku 系列，专注安全与推理',
        deepseek: 'DeepSeek Chat/Reasoner，高性价比国产模型',
        ollama: '本地运行开源模型，完全离线，无需 API Key',
    }
    return descriptions[provider]
}

/**
 * 获取所有支持的 Provider 列表
 */
export function getAllProviders(): Array<{
    name: ProviderName
    displayName: string
    description: string
    requiresApiKey: boolean
}> {
    return [
        {
            name: 'ollama',
            displayName: getProviderDisplayName('ollama'),
            description: getProviderDescription('ollama'),
            requiresApiKey: false,
        },
        {
            name: 'openai',
            displayName: getProviderDisplayName('openai'),
            description: getProviderDescription('openai'),
            requiresApiKey: true,
        },
        {
            name: 'anthropic',
            displayName: getProviderDisplayName('anthropic'),
            description: getProviderDescription('anthropic'),
            requiresApiKey: true,
        },
        {
            name: 'deepseek',
            displayName: getProviderDisplayName('deepseek'),
            description: getProviderDescription('deepseek'),
            requiresApiKey: true,
        },
    ]
}
