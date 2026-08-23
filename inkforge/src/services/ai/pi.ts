import type {
  Api,
  AssistantMessage,
  Context,
  Message,
  Model,
  Models,
  ProviderStreams,
  Usage,
} from '@earendil-works/pi-ai'
import { z } from 'zod'
import { REQUEST_LIMITS } from '@/config/security'
import { AppError, ErrorCode } from '@/services/error'
import type {
  AIModel,
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ProviderConfig,
  ProviderName,
} from './types'

export const PI_AI_CORE_VERSION = '0.81.1'

type PiTextApi = 'openai-completions' | 'anthropic-messages'

interface PiRuntime {
  models: Models
}

interface PiModelDescriptor extends AIModel {
  maxOutput: number
  reasoning?: boolean
}

const ZERO_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
} as const

const ZERO_USAGE: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: {
    ...ZERO_COST,
    total: 0,
  },
}

const PROVIDER_MODELS: Record<ProviderName, readonly PiModelDescriptor[]> = {
  openai: [
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      description: '高质量通用写作与长上下文任务',
      maxContext: 1_047_576,
      maxOutput: 32_768,
    },
    {
      id: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini',
      description: '速度与质量平衡的通用模型',
      maxContext: 1_047_576,
      maxOutput: 32_768,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: '多模态通用模型',
      maxContext: 128_000,
      maxOutput: 16_384,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: '轻量快速的日常写作模型',
      maxContext: 128_000,
      maxOutput: 16_384,
    },
    {
      id: 'Qwen/Qwen3-8B',
      name: 'Qwen3 8B',
      description: 'OpenAI 兼容端点常用中文模型',
      maxContext: 32_768,
      maxOutput: 8_192,
      reasoning: true,
    },
  ],
  anthropic: [
    {
      id: 'claude-opus-4-6',
      name: 'Claude Opus 4.6',
      description: '复杂推理、研究与高质量长文',
      maxContext: 200_000,
      maxOutput: 32_000,
      reasoning: true,
    },
    {
      id: 'claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      description: '写作质量、速度与成本平衡',
      maxContext: 200_000,
      maxOutput: 64_000,
      reasoning: true,
    },
    {
      id: 'claude-haiku-4-5',
      name: 'Claude Haiku 4.5',
      description: '快速整理、摘要与轻量改写',
      maxContext: 200_000,
      maxOutput: 8_192,
    },
  ],
  deepseek: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      description: '通用写作、整理与对话',
      maxContext: 64_000,
      maxOutput: 8_192,
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek Reasoner',
      description: '复杂分析与推理任务',
      maxContext: 64_000,
      maxOutput: 8_192,
      reasoning: true,
    },
  ],
  ollama: [
    {
      id: 'qwen2.5:7b',
      name: 'Qwen 2.5 7B',
      description: '本地中文写作与轻量改写',
      maxContext: 32_768,
      maxOutput: 8_192,
    },
    {
      id: 'llama3.2:latest',
      name: 'Llama 3.2',
      description: '本地通用模型',
      maxContext: 32_768,
      maxOutput: 8_192,
    },
    {
      id: 'mistral:latest',
      name: 'Mistral',
      description: '本地快速通用模型',
      maxContext: 32_768,
      maxOutput: 8_192,
    },
  ],
}

const DEFAULT_MODELS: Record<ProviderName, string> = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4-6',
  deepseek: 'deepseek-chat',
  ollama: 'qwen2.5:7b',
}

const OpenAIModelListSchema = z.object({
  data: z.array(z.object({
    id: z.string().trim().min(1),
  })),
})

const AnthropicModelListSchema = z.object({
  data: z.array(z.object({
    id: z.string().trim().min(1),
    display_name: z.string().trim().min(1).optional(),
  })),
})

const OllamaModelListSchema = z.object({
  models: z.array(z.object({
    name: z.string().trim().min(1),
  })),
})

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizeOpenAIBaseUrl(value: string): string {
  const normalized = stripTrailingSlashes(value)
  return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`
}

export function resolvePiProviderBaseUrl(config: ProviderConfig): string {
  if (config.provider === 'ollama') {
    return normalizeOpenAIBaseUrl(config.ollamaUrl || 'http://localhost:11434')
  }

  if (config.baseUrl?.trim()) {
    const normalized = stripTrailingSlashes(config.baseUrl.trim())
    return config.provider === 'anthropic'
      ? normalized
      : normalizeOpenAIBaseUrl(normalized)
  }

  if (config.provider === 'anthropic') return 'https://api.anthropic.com'
  if (config.provider === 'deepseek') return 'https://api.deepseek.com/v1'
  return 'https://api.openai.com/v1'
}

function getPiApi(provider: ProviderName): PiTextApi {
  return provider === 'anthropic' ? 'anthropic-messages' : 'openai-completions'
}

function isPiTextModel(model: Model<Api>): model is Model<PiTextApi> {
  return model.api === 'openai-completions' || model.api === 'anthropic-messages'
}

function getRequestApiKey(config: ProviderConfig): string {
  return config.provider === 'ollama' ? 'ollama-local' : config.apiKey.trim()
}

function getKnownDescriptor(provider: ProviderName, modelId: string): PiModelDescriptor {
  const known = PROVIDER_MODELS[provider].find(model => model.id === modelId)
  if (known) return known

  return {
    id: modelId,
    name: modelId,
    description: '由当前 Pi-compatible Provider 端点发现或手动配置',
    maxContext: 128_000,
    maxOutput: 8_192,
  }
}

function createPiModel(
  provider: ProviderName,
  modelId: string,
  baseUrl: string,
): Model<PiTextApi> {
  const descriptor = getKnownDescriptor(provider, modelId)
  const api = getPiApi(provider)

  return {
    id: descriptor.id,
    name: descriptor.name,
    api,
    provider,
    baseUrl,
    reasoning: descriptor.reasoning ?? false,
    input: ['text'],
    cost: ZERO_COST,
    contextWindow: descriptor.maxContext,
    maxTokens: descriptor.maxOutput,
    ...(api === 'openai-completions'
      ? {
          compat: {
            supportsDeveloperRole: false,
            supportsReasoningEffort: descriptor.reasoning ?? false,
            supportsUsageInStreaming: true,
            maxTokensField: 'max_tokens' as const,
          },
        }
      : {}),
  }
}

function createAssistantHistoryMessage(
  message: ChatMessage,
  model: Model<PiTextApi>,
  timestamp: number,
): AssistantMessage {
  return {
    role: 'assistant',
    content: [{ type: 'text', text: message.content }],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: ZERO_USAGE,
    stopReason: 'stop',
    timestamp,
  }
}

export function toPiContext(
  messages: ChatMessage[],
  model: Model<PiTextApi>,
): Context {
  const systemPrompt = messages
    .filter(message => message.role === 'system')
    .map(message => message.content.trim())
    .filter(Boolean)
    .join('\n\n')

  const timestamp = Date.now()
  const history: Message[] = messages
    .filter(message => message.role !== 'system')
    .map((message, index) => {
      if (message.role === 'assistant') {
        return createAssistantHistoryMessage(message, model, timestamp + index)
      }

      return {
        role: 'user' as const,
        content: message.content,
        timestamp: timestamp + index,
      }
    })

  return {
    ...(systemPrompt ? { systemPrompt } : {}),
    messages: history,
  }
}

function getResponseText(message: AssistantMessage): string {
  return message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
}

function mapFinishReason(
  stopReason: AssistantMessage['stopReason'],
): ChatResponse['finishReason'] {
  if (stopReason === 'stop' || stopReason === 'toolUse') return 'stop'
  if (stopReason === 'length') return 'length'
  if (stopReason === 'error' || stopReason === 'aborted') return 'error'
  return null
}

function throwForFailedMessage(message: AssistantMessage): void {
  if (message.stopReason === 'aborted') {
    throw new DOMException('请求已取消', 'AbortError')
  }
  if (message.stopReason === 'error') {
    throw new AppError(
      ErrorCode.AI_GENERATION_FAILED,
      message.errorMessage || 'Pi Provider 返回错误',
    )
  }
}

function ensureRequestWithinLimit(messages: ChatMessage[]): void {
  const size = new TextEncoder().encode(JSON.stringify(messages)).length
  if (size > REQUEST_LIMITS.MAX_REQUEST_BODY_SIZE) {
    throw new AppError(
      ErrorCode.AI_GENERATION_FAILED,
      `请求体过大: ${(size / 1024 / 1024).toFixed(2)}MB，超过限制 1MB`,
    )
  }
}

function mergeModelCatalog(
  provider: ProviderName,
  modelIds: readonly string[],
): AIModel[] {
  const merged = new Map<string, AIModel>()

  for (const model of PROVIDER_MODELS[provider]) {
    merged.set(model.id, model)
  }

  for (const modelId of modelIds) {
    const descriptor = getKnownDescriptor(provider, modelId)
    merged.set(modelId, {
      id: descriptor.id,
      name: descriptor.name,
      description: descriptor.description,
      maxContext: descriptor.maxContext,
    })
  }

  return [...merged.values()]
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const timeout = AbortSignal.timeout(REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS)
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout
  const response = await fetch(url, { ...init, signal })
  if (!response.ok) {
    throw new AppError(
      ErrorCode.AI_SERVICE_UNAVAILABLE,
      `模型目录请求失败 (${response.status} ${response.statusText})`,
    )
  }
  return response.json()
}

async function discoverProviderModelIds(
  config: ProviderConfig,
  baseUrl: string,
  signal?: AbortSignal,
): Promise<string[]> {
  if (config.provider === 'ollama') {
    const root = stripTrailingSlashes(config.ollamaUrl || 'http://localhost:11434')
    const parsed = OllamaModelListSchema.parse(await fetchJson(`${root}/api/tags`, {
      method: 'GET',
      signal,
    }))
    return parsed.models.map(model => model.name)
  }

  if (config.provider === 'anthropic') {
    const parsed = AnthropicModelListSchema.parse(await fetchJson(`${baseUrl}/v1/models`, {
      method: 'GET',
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': config.apiKey.trim(),
      },
      signal,
    }))
    return parsed.data.map(model => model.id)
  }

  const parsed = OpenAIModelListSchema.parse(await fetchJson(`${baseUrl}/models`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    signal,
  }))
  return parsed.data.map(model => model.id)
}

async function loadProviderStreams(api: PiTextApi): Promise<ProviderStreams> {
  if (api === 'anthropic-messages') {
    const module = await import('@earendil-works/pi-ai/api/anthropic-messages')
    return {
      stream: module.stream,
      streamSimple: module.streamSimple,
    }
  }

  const module = await import('@earendil-works/pi-ai/api/openai-completions')
  return {
    stream: module.stream,
    streamSimple: module.streamSimple,
  }
}

export class PiAIProvider implements AIProvider {
  readonly name: ProviderName
  readonly defaultModel: string

  private readonly config: ProviderConfig
  private readonly baseUrl: string
  private modelCatalog: AIModel[]
  private runtimePromise: Promise<PiRuntime> | null = null

  constructor(config: ProviderConfig) {
    this.config = {
      ...config,
      apiKey: config.apiKey.trim(),
    }
    this.name = config.provider
    this.defaultModel = config.model.trim() || DEFAULT_MODELS[config.provider]
    this.baseUrl = resolvePiProviderBaseUrl(config)
    this.modelCatalog = mergeModelCatalog(config.provider, [this.defaultModel])
  }

  get models(): readonly AIModel[] {
    return this.modelCatalog
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    ensureRequestWithinLimit(messages)
    const { models } = await this.getRuntime()
    const model = this.requireModel(models, options?.model)
    const result = await models.complete(model, toPiContext(messages, model), {
      apiKey: getRequestApiKey(this.config),
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      signal: options?.signal,
      timeoutMs: REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS,
      maxRetries: 0,
    })

    throwForFailedMessage(result)

    return {
      content: getResponseText(result),
      model: result.responseModel || result.model,
      finishReason: mapFinishReason(result.stopReason),
      usage: {
        promptTokens: result.usage.input,
        completionTokens: result.usage.output,
        totalTokens: result.usage.totalTokens,
      },
    }
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    ensureRequestWithinLimit(messages)
    const { models } = await this.getRuntime()
    const model = this.requireModel(models, options?.model)
    const stream = models.stream(model, toPiContext(messages, model), {
      apiKey: getRequestApiKey(this.config),
      maxTokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      signal: options?.signal,
      timeoutMs: REQUEST_LIMITS.AI_GENERATE_TIMEOUT_MS,
      maxRetries: 0,
    })

    for await (const event of stream) {
      if (event.type === 'text_delta') {
        yield event.delta
      } else if (event.type === 'error') {
        throwForFailedMessage(event.error)
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.chat(
        [{ role: 'user', content: '仅回复 OK' }],
        {
          model: this.defaultModel,
          maxTokens: 8,
          temperature: 0,
        },
      )
      return {
        success: true,
        message: `Pi ${PI_AI_CORE_VERSION} 连接成功，模型 ${result.model} 响应正常`,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error
          ? `Pi Provider 连接失败: ${error.message}`
          : 'Pi Provider 连接失败',
      }
    }
  }

  async listModels(): Promise<AIModel[]> {
    const { models } = await this.getRuntime()
    const result = await models.refresh({
      allowNetwork: true,
      force: true,
    })

    const refreshError = result.errors.get(this.name)
    if (refreshError) {
      throw new AppError(
        ErrorCode.AI_SERVICE_UNAVAILABLE,
        `Pi 模型发现失败: ${refreshError.message}`,
      )
    }

    this.modelCatalog = mergeModelCatalog(
      this.name,
      models.getModels(this.name).map(model => model.id),
    )
    return [...this.modelCatalog]
  }

  private async getRuntime(): Promise<PiRuntime> {
    if (!this.runtimePromise) {
      this.runtimePromise = this.createRuntime()
    }
    return this.runtimePromise
  }

  private async createRuntime(): Promise<PiRuntime> {
    const [{ createModels, createProvider }, streams] = await Promise.all([
      import('@earendil-works/pi-ai'),
      loadProviderStreams(getPiApi(this.name)),
    ])
    const staticModels = this.modelCatalog.map(model =>
      createPiModel(this.name, model.id, this.baseUrl)
    )
    const models = createModels()
    models.setProvider(createProvider<PiTextApi>({
      id: this.name,
      name: `InkForge ${this.name} via Pi`,
      baseUrl: this.baseUrl,
      auth: {
        apiKey: {
          name: this.name === 'ollama' ? 'Ollama local endpoint' : `${this.name} API key`,
          check: async () => ({
            type: 'api_key',
            source: this.name === 'ollama' ? 'local endpoint' : 'InkForge secure settings',
          }),
          resolve: async () => ({
            auth: {
              apiKey: getRequestApiKey(this.config),
              baseUrl: this.baseUrl,
            },
            source: this.name === 'ollama' ? 'local endpoint' : 'InkForge secure settings',
          }),
        },
      },
      models: staticModels,
      fetchModels: async context => {
        const ids = await discoverProviderModelIds(
          this.config,
          this.baseUrl,
          context.signal,
        )
        return ids.map(id => createPiModel(this.name, id, this.baseUrl))
      },
      api: streams,
    }))
    return { models }
  }

  private requireModel(models: Models, modelId?: string): Model<PiTextApi> {
    const selectedId = modelId?.trim() || this.defaultModel
    const model = models.getModel(this.name, selectedId)
    if (!model || !isPiTextModel(model)) {
      throw new AppError(
        ErrorCode.AI_SERVICE_UNAVAILABLE,
        `Pi Provider 未找到模型: ${selectedId}`,
      )
    }
    return model
  }
}
