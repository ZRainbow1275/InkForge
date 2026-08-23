import type { Model } from '@earendil-works/pi-ai'
import { describe, expect, it } from 'vitest'
import { createProvider } from './factory'
import {
  PI_AI_CORE_VERSION,
  PiAIProvider,
  resolvePiProviderBaseUrl,
  toPiContext,
} from './pi'
import type { ProviderConfig } from './types'

const BASE_CONFIG: ProviderConfig = {
  provider: 'openai',
  apiKey: 'test-key-not-sent-to-a-real-service',
  baseUrl: 'http://127.0.0.1:1',
  model: 'manual-model',
  maxTokens: 512,
  temperature: 0.4,
  ollamaUrl: 'http://127.0.0.1:1',
}

const HISTORY_MODEL: Model<'openai-completions'> = {
  id: 'manual-model',
  name: 'Manual model',
  api: 'openai-completions',
  provider: 'openai',
  baseUrl: 'http://127.0.0.1:1/v1',
  reasoning: false,
  input: ['text'],
  cost: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
  },
  contextWindow: 128_000,
  maxTokens: 8_192,
}

describe('PiAIProvider', () => {
  it('normalizes provider endpoints without duplicating the API version', () => {
    expect(resolvePiProviderBaseUrl(BASE_CONFIG)).toBe('http://127.0.0.1:1/v1')
    expect(resolvePiProviderBaseUrl({
      ...BASE_CONFIG,
      baseUrl: 'https://api.example.test/v1/',
    })).toBe('https://api.example.test/v1')
    expect(resolvePiProviderBaseUrl({
      ...BASE_CONFIG,
      provider: 'anthropic',
      baseUrl: 'https://anthropic.example.test/',
    })).toBe('https://anthropic.example.test')
    expect(resolvePiProviderBaseUrl({
      ...BASE_CONFIG,
      provider: 'ollama',
      ollamaUrl: 'http://localhost:11434/',
    })).toBe('http://localhost:11434/v1')
  })

  it('maps one combined system prompt and preserves real conversation order', () => {
    const context = toPiContext([
      { role: 'system', content: ' 全局约束 ' },
      { role: 'system', content: '任务约束' },
      { role: 'user', content: '第一问' },
      { role: 'assistant', content: '第一答' },
      { role: 'user', content: '第二问' },
    ], HISTORY_MODEL)

    expect(context.systemPrompt).toBe('全局约束\n\n任务约束')
    expect(context.messages.map(message => message.role)).toEqual([
      'user',
      'assistant',
      'user',
    ])
    expect(context.messages[1]).toMatchObject({
      role: 'assistant',
      api: 'openai-completions',
      provider: 'openai',
      model: 'manual-model',
      content: [{ type: 'text', text: '第一答' }],
    })
  })

  it('routes the existing factory contract through the Pi core and retains a manual model', () => {
    const provider = createProvider(BASE_CONFIG)

    expect(provider).toBeInstanceOf(PiAIProvider)
    expect(provider.name).toBe('openai')
    expect(provider.defaultModel).toBe('manual-model')
    expect(provider.models.some(model => model.id === 'manual-model')).toBe(true)
    expect(PI_AI_CORE_VERSION).toBe('0.81.1')
  })

  it('fails closed on a real unreachable endpoint without manufacturing health success', async () => {
    const provider = new PiAIProvider(BASE_CONFIG)
    const result = await provider.testConnection()

    expect(result.success).toBe(false)
    expect(result.message).toContain('Pi Provider 连接失败')
    expect(result.message).not.toContain('连接成功')
  }, 15_000)

  it('returns a real model-discovery failure for an unreachable endpoint', async () => {
    const provider = new PiAIProvider(BASE_CONFIG)

    await expect(provider.listModels()).rejects.toThrow('Pi 模型发现失败')
    expect(provider.models.some(model => model.id === 'manual-model')).toBe(true)
  }, 15_000)

  it('honors an already-aborted request through the Pi stream lifecycle', async () => {
    const provider = new PiAIProvider(BASE_CONFIG)
    const controller = new AbortController()
    controller.abort()

    await expect(provider.chat(
      [{ role: 'user', content: '不会发送' }],
      { signal: controller.signal },
    )).rejects.toMatchObject({ name: 'AbortError' })
  }, 15_000)
})
