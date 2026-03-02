# 04 - AI 功能集成 Spec

## 目标
将 AI 功能从 Mock 状态升级为通过真实 API 驱动的智能写作助手。

## 1. AI Service 架构

### 1.1 统一 Provider 接口
```typescript
// services/ai/provider.ts
interface AIProvider {
  name: string
  models: AIModel[]
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  model: string
  maxTokens?: number
  temperature?: number
  topP?: number
}

interface ChatResponse {
  content: string
  usage: { promptTokens: number; completionTokens: number }
}

interface AIModel {
  id: string
  name: string
  description: string
  maxContext: number
}
```

### 1.2 Provider 实现

#### OpenAI Provider (services/ai/openai.ts)
```typescript
class OpenAIProvider implements AIProvider {
  private apiKey: string
  private baseUrl: string  // 支持自定义端点（如 Azure OpenAI）

  models = [
    { id: 'gpt-4o', name: 'GPT-4o', maxContext: 128000 },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxContext: 128000 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxContext: 16384 },
  ]

  async chat(messages, options) {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4o',
        messages,
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
      })
    })
    // ... parse response
  }
}
```

#### Anthropic Provider (services/ai/anthropic.ts)
```typescript
class AnthropicProvider implements AIProvider {
  models = [
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', maxContext: 200000 },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', maxContext: 200000 },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', maxContext: 200000 },
  ]
  // Anthropic Messages API
}
```

#### DeepSeek Provider (services/ai/deepseek.ts)
```typescript
class DeepSeekProvider implements AIProvider {
  models = [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', maxContext: 64000 },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', maxContext: 64000 },
  ]
  // OpenAI-compatible API
}
```

#### Ollama Provider (services/ai/ollama.ts)
```typescript
class OllamaProvider implements AIProvider {
  // 本地 LLM，通过 Tauri 命令调用
  // 无需 API Key
}
```

### 1.3 Provider Factory
```typescript
// services/ai/factory.ts
function createProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case 'openai': return new OpenAIProvider(config.apiKey, config.baseUrl)
    case 'anthropic': return new AnthropicProvider(config.apiKey)
    case 'deepseek': return new DeepSeekProvider(config.apiKey)
    case 'ollama': return new OllamaProvider(config.ollamaUrl)
  }
}
```

## 2. AI 功能清单

### 2.1 大纲生成
- 输入：文章主题/关键词
- 输出：结构化大纲（H2/H3 层级）
- 推荐模型：Claude Opus 4.6
- System Prompt：专业写作助手，生成符合中文写作习惯的文章大纲

### 2.2 文章润色
- 输入：选中的段落文字
- 输出：润色后的文字
- 模式：专业/简洁/生动/学术
- 推荐模型：GPT-4o / Claude Sonnet

### 2.3 标题生成
- 输入：文章正文摘要
- 输出：5 个候选标题
- 针对不同平台优化（微信标题 vs 小红书标题 vs 知乎标题）

### 2.4 摘要生成
- 输入：全文
- 输出：100-200 字摘要
- 支持不同风格（新闻式/学术式/营销式）

### 2.5 口播稿生成
- 输入：文章正文
- 输出：口语化的播客/视频脚本
- 自动添加语气词、过渡句

### 2.6 SVG 设计生成
- 输入：设计需求描述
- 输出：SVG 代码
- 推荐模型：Gemini / Claude
- 用于文章封面、装饰图

### 2.7 续写
- 输入：已有文字 + 光标位置
- 输出：续写内容
- 支持多种风格

## 3. AI Store 改造

### 3.1 stores/ai.ts 重构
```typescript
export const useAIStore = defineStore('ai', () => {
  const settingsStore = useSettingsStore()

  const provider = computed(() => {
    const config = settingsStore.aiConfig
    if (!config.apiKey && config.provider !== 'ollama') return null
    return createProvider(config)
  })

  const isAvailable = computed(() => provider.value !== null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const streamingContent = ref('')

  async function generateOutline(topic: string): Promise<string>
  async function polishText(text: string, style: string): Promise<string>
  async function generateTitles(content: string, platform: Platform): Promise<string[]>
  async function generateSummary(content: string, style: string): Promise<string>
  async function generateTranscript(content: string): Promise<string>
  async function generateSVG(prompt: string): Promise<string>
  async function continueWriting(context: string): Promise<string>

  // 流式输出
  async function* streamGenerate(prompt: string): AsyncIterable<string>
})
```

## 4. AI Panel 组件改造

### 4.1 功能选择器
- 大纲生成
- 润色改写
- 标题建议
- 摘要生成
- 续写
- SVG 设计
- 自由对话

### 4.2 交互设计
- 侧面滑出面板
- 流式文字输出（打字机效果）
- 结果可一键插入编辑器
- 历史对话记录

## 5. Settings 集成

### 5.1 AI 设置扩展
```typescript
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'deepseek' | 'ollama'
  apiKey: string
  baseUrl?: string  // 自定义 API 端点
  model: string
  maxTokens: number
  temperature: number
  ollamaUrl?: string  // 本地 Ollama 地址
}
```

### 5.2 连接测试
- "测试连接"按钮，发送简单请求验证 API Key 有效性
- 显示可用模型列表
- 显示余额信息（如果 API 支持）

## 验收标准
- [ ] 配置 OpenAI API Key 后可真实调用 GPT-4o
- [ ] 配置 Anthropic API Key 后可真实调用 Claude
- [ ] 配置 DeepSeek API Key 后可真实调用
- [ ] Ollama 本地调用正常
- [ ] 大纲生成功能正常
- [ ] 文章润色功能正常
- [ ] 标题生成功能正常
- [ ] 流式输出有打字机效果
- [ ] 无任何 Mock AI 响应
