# 09 - 设置页面完善 Spec

## 目标
将设置页面从基础版升级为企业级完整设置中心。

## 1. Tab 结构改造

### 1.1 新 Tab 结构（7 个 Tab）
| Tab | 图标 | 功能 |
|-----|------|------|
| 外观 | Palette | 主题、字体、颜色、布局 |
| 编辑器 | Edit3 | 自动保存、拼写检查、打字机模式、快捷键 |
| 导出 | Share2 | 默认预设、代码块、脚注、平台特定设置 |
| AI 服务 | Sparkles | API 配置、模型选择、功能开关 |
| 数据 | Database | 导入/导出、备份/恢复、清理 |
| 快捷键 | Keyboard | 自定义快捷键映射 |
| 关于 | Info | 版本信息、更新检查、反馈 |

## 2. Settings Store

### 2.1 新建 stores/settings.ts
```typescript
export const useSettingsStore = defineStore('settings', () => {
  // 使用 Zod schema 验证设置
  const SettingsSchema = z.object({
    appearance: z.object({
      theme: z.enum(['light', 'dark', 'system']),
      fontFamily: z.enum(['serif', 'sans', 'kai', 'mono']),
      fontSize: z.number().min(12).max(24),
      lineHeight: z.number().min(1.4).max(2.4),
      accentColor: z.string(),
      sidebarWidth: z.number().min(180).max(400),
      reducedMotion: z.boolean(),
    }),
    editor: z.object({
      autoSave: z.boolean(),
      autoSaveInterval: z.number().min(10).max(300),
      spellCheck: z.boolean(),
      typewriterMode: z.boolean(),
      smartPunctuation: z.boolean(),
      wordWrap: z.boolean(),
      tabSize: z.number().min(2).max(8),
      showLineNumbers: z.boolean(),
      highlightActiveLine: z.boolean(),
      bracketMatching: z.boolean(),
    }),
    export: z.object({
      defaultPlatform: z.enum(['wechat', 'xiaohongshu', 'zhihu']),
      defaultPresetId: z.string(),
      macCodeBlock: z.boolean(),
      lineNumbers: z.boolean(),
      convertFootnotes: z.boolean(),
      textIndent: z.boolean(),
      imageMaxWidth: z.number().min(320).max(1080),
      codeTheme: z.string(),
    }),
    ai: z.object({
      provider: z.enum(['openai', 'anthropic', 'deepseek', 'ollama', 'none']),
      apiKey: z.string(),
      baseUrl: z.string().optional(),
      model: z.string(),
      maxTokens: z.number().min(100).max(8000),
      temperature: z.number().min(0).max(2),
      ollamaUrl: z.string().optional(),
    }),
    data: z.object({
      autoBackup: z.boolean(),
      backupInterval: z.number(), // 天
      maxBackups: z.number(),
    }),
  })

  type Settings = z.infer<typeof SettingsSchema>

  const settings = ref<Settings>(getDefaultSettings())

  // 从 localStorage 加载
  function load() { ... }
  // 保存到 localStorage
  function save() { ... }
  // 重置为默认值
  function reset() { ... }
  // 导出设置为 JSON
  function exportSettings(): string { ... }
  // 导入设置
  function importSettings(json: string): void { ... }
})
```

## 3. 数据管理 Tab

### 3.1 数据导出
- 导出所有文章为 ZIP（包含 Markdown 文件和素材）
- 导出设置为 JSON
- 导出单篇文章为 Markdown

### 3.2 数据导入
- 导入 Markdown 文件
- 导入设置 JSON
- 导入 ZIP 包（批量文章）

### 3.3 数据备份
- 手动备份整个 IndexedDB
- 自动备份（可设置间隔）
- 备份恢复

### 3.4 数据清理
- 清除所有文章（需二次确认）
- 清除所有素材
- 清除版本历史
- 重置所有设置

## 4. 快捷键 Tab

### 4.1 默认快捷键映射
| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 保存 |
| Ctrl+B | 加粗 |
| Ctrl+I | 斜体 |
| Ctrl+Shift+O | 大纲面板 |
| Ctrl+/ | 注释 |
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z | 重做 |
| F11 | 专注模式 |

### 4.2 自定义快捷键
- 可修改默认快捷键
- 冲突检测
- 重置为默认

## 5. 关于 Tab

### 5.1 版本信息
- InkForge 版本号
- 构建日期
- 技术栈信息

### 5.2 开源信息
- 致谢列表（doocs/md 等）
- 开源协议

## 6. AI 服务 Tab 增强

### 6.1 Provider 选择
- 卡片式选择器（OpenAI / Anthropic / DeepSeek / Ollama）
- 每个 Provider 显示可用模型

### 6.2 连接测试
```typescript
async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const provider = createProvider(settings.ai)
    const result = await provider.chat([
      { role: 'user', content: 'Say "OK" in one word.' }
    ])
    return { success: true, message: `连接成功，模型响应正常` }
  } catch (e) {
    return { success: false, message: `连接失败: ${e.message}` }
  }
}
```

### 6.3 模型列表
- 根据选择的 Provider 动态显示可用模型
- 包含最新模型：
  - OpenAI: GPT-4o, GPT-4 Turbo, GPT-3.5
  - Anthropic: Claude Opus 4.6, Sonnet 4.6, Haiku 4.5
  - DeepSeek: Chat, Reasoner
  - Ollama: 动态获取本地已安装模型

## 验收标准
- [ ] 7 个 Tab 全部功能可用
- [ ] 设置使用 Zod schema 验证
- [ ] 设置变更实时生效
- [ ] 数据导入/导出正常
- [ ] AI 连接测试功能正常
- [ ] 快捷键自定义可用
- [ ] 无任何 Mock 设置项
