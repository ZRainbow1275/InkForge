/**
 * @vitest-environment happy-dom
 */
import { nextTick, toRaw } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  composeAISystemPrompt,
  useAIStore,
} from './ai'
import { useAIChatStore } from './aiChat'
import { useSettingsStore } from './settings'

interface OllamaRequestBody {
  messages: Array<{
    role: string
    content: string
  }>
}

describe('AI settings and writing-task prompts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('persists provider and system prompt, then resets the complete AI tab', async () => {
    const store = useSettingsStore()
    const defaultAISettings = structuredClone(toRaw(store.settings.ai))
    store.settings.ai.provider = 'deepseek'
    store.settings.ai.apiKey = ''
    store.settings.ai.systemPrompt = '只引用可核验事实，并明确区分事实与观点。'

    await nextTick()
    await vi.advanceTimersByTimeAsync(5000)

    setActivePinia(createPinia())
    const reloaded = useSettingsStore()
    expect(reloaded.settings.ai.provider).toBe('deepseek')
    expect(reloaded.settings.ai.systemPrompt).toBe('只引用可核验事实，并明确区分事实与观点。')

    reloaded.resetTab('ai')
    expect(reloaded.settings.ai).toEqual(defaultAISettings)

    setActivePinia(createPinia())
    const resetReloaded = useSettingsStore()
    expect(resetReloaded.settings.ai).toEqual(defaultAISettings)
  })

  it('returns honest disabled and missing-key states without recording success', async () => {
    const settingsStore = useSettingsStore()
    const aiStore = useAIStore()

    settingsStore.settings.ai.provider = 'none'
    expect(await aiStore.testConnection()).toEqual({
      success: false,
      message: 'AI 功能已禁用',
    })
    expect(settingsStore.settings.ai.lastConnectionAt).toBeNull()

    settingsStore.settings.ai.provider = 'openai'
    settingsStore.settings.ai.apiKey = ''
    expect(await aiStore.testConnection()).toEqual({
      success: false,
      message: '请先配置 API Key',
    })
    expect(settingsStore.settings.ai.lastConnectionAt).toBeNull()
  })

  it('forwards constraints through real failed Ollama writing, chat, and regeneration requests', async () => {
    const settingsStore = useSettingsStore()
    settingsStore.settings.ai.provider = 'ollama'
    settingsStore.settings.ai.ollamaUrl = 'http://127.0.0.1:1'
    settingsStore.settings.ai.systemPrompt = '全局事实约束'

    const originalFetch = globalThis.fetch
    if (typeof originalFetch !== 'function') {
      throw new Error('native fetch is unavailable')
    }

    const requestBodies: string[] = []
    globalThis.fetch = async (input, init) => {
      if (typeof init?.body === 'string') {
        requestBodies.push(init.body)
      }
      return originalFetch(input, init)
    }

    try {
      const aiStore = useAIStore()
      const chatStore = useAIChatStore()

      await expect(aiStore.generateOutline('可核验主题')).rejects.toThrow()
      aiStore.reset()

      await chatStore.send('请核对当前文档', { docContext: '当前文档中的可核验事实' })
      expect(chatStore.turns[chatStore.turns.length - 1]?.status).toBe('error')

      aiStore.reset()
      await chatStore.regenerateLast()
      expect(chatStore.turns[chatStore.turns.length - 1]?.status).toBe('error')
    } finally {
      globalThis.fetch = originalFetch
    }

    expect(requestBodies).toHaveLength(3)
    const requests = requestBodies.map(body => JSON.parse(body) as OllamaRequestBody)
    const [writingRequest, ...chatRequests] = requests
    expect(writingRequest.messages.filter(message => message.role === 'system')).toHaveLength(1)
    expect(writingRequest.messages[0].content).toMatch(
      /^全局事实约束\n\n你是一位专业的写作助手/,
    )
    expect(writingRequest.messages.some(message => (
      message.role === 'user' && message.content.includes('可核验主题')
    ))).toBe(true)

    for (const request of chatRequests) {
      expect(request.messages.filter(message => message.role === 'system')).toEqual([
        {
          role: 'system',
          content: '全局事实约束\n\n当前文档内容供参考：\n\n当前文档中的可核验事实',
        },
      ])
      expect(request.messages.some(message => (
        message.role === 'user' && message.content === '请核对当前文档'
      ))).toBe(true)
    }
  })

  it('combines provider constraints in stable global-before-task order', () => {
    expect(composeAISystemPrompt('  全局事实约束  ', '  当前任务约束  ')).toBe(
      '全局事实约束\n\n当前任务约束',
    )
    expect(composeAISystemPrompt('   ', '当前任务约束')).toBe('当前任务约束')
  })
})
