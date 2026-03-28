现在我已拥有全面的代码理解。让我开始撰写三份完整的 Spec 文档。

---

# 文档一：Settings 企业级设置中心规格说明书

> 2026-03-28 执行说明：Settings 的当前可执行真相以 `prompts/0327/07-settings-full-spec.md` 与 `.trellis/tasks/03-27-03-27-editor-hub-settings-full-upgrade/prd.md` 为准。本文保留原始企业化设计分析，若出现“未生效/部分生效”等旧状态描述，应以后续 0327 checkpoint 为准。

## 1. 概述

### 1.1 改造目标
将现有 7-Tab 设置页面升级为功能完备的企业级设置中心，新增 Account（账户）、Sync（同步）、Advanced（高级）三个 Tab，最终形成 10-Tab 结构。

### 1.2 最终 Tab 结构
| 序号 | Tab ID | 中文名 | 状态 |
|------|--------|--------|------|
| 1 | `account` | 账户 | **新增** |
| 2 | `appearance` | 外观 | 现有 |
| 3 | `editor` | 编辑器 | 现有 |
| 4 | `export` | 导出 | 现有 |
| 5 | `ai` | AI 服务 | 现有 |
| 6 | `data` | 数据 | 现有 |
| 7 | `sync` | 同步 | **新增** |
| 8 | `shortcuts` | 快捷键 | 现有 |
| 9 | `advanced` | 高级 | **新增** |
| 10 | `about` | 关于 | 现有 |

### 1.3 技术约束
- 图标库：lucide-vue-next（绝对禁止 Emoji）
- 状态管理：Pinia + Zod Schema 验证
- 持久化：localStorage（settings）+ IndexedDB / Dexie（新增表）
- CSS 变量：通过 App.vue 全局同步 `--accent-primary`、`--font-family` 等

---

## 2. 现状分析

### 2.1 当前 Settings 架构

**文件位置**: `D:\Desktop\Inkforge\inkforge\src\views\SettingsView.vue`（约 1600 行）
**Store 位置**: `D:\Desktop\Inkforge\inkforge\src\stores\settings.ts`（221 行）

**Zod Schema 结构**（`settings.ts` 第 10-88 行）：

```typescript
SettingsSchema = z.object({
  appearance: AppearanceSchema,  // theme, fontFamily, fontSize, lineHeight, accentColor, sidebarWidth, reducedMotion, typography{}
  editor: EditorSchema,          // autoSave, autoSaveInterval, spellCheck, typewriterMode, smartPunctuation, wordWrap, tabSize, showLineNumbers, highlightActiveLine, bracketMatching
  export: ExportSchema,          // defaultPlatform, defaultPresetId, macCodeBlock, lineNumbers, convertFootnotes, textIndent, imageMaxWidth, codeTheme
  ai: AISchema,                  // provider, apiKey, baseUrl, model, maxTokens, temperature, ollamaUrl
  data: DataSchema,              // autoBackup, backupInterval, maxBackups
  shortcuts: ShortcutSchema,     // Record<string, string>
})
```

**持久化机制**（`settings.ts` 第 97-206 行）：
- 存储键：`inkforge-settings`（localStorage）
- 加载时使用 `safeParse` 合并用户数据与默认值，容忍部分字段缺失
- 写入时 5 秒 debounce（`deep watch` 自动触发）
- 提供 `exportSettings()` / `importSettings(json)` 方法

**SettingsView.vue 现有功能**：
- 7 个 Tab 页，使用 `v-show` 切换（非路由）
- Tab 导航：左侧 sidebar + SVG 图标（手写内联 SVG，非 lucide 组件）
- 确认弹窗：`Teleport to="body"` 实现
- AI 连接测试、Ollama 模型动态拉取
- 数据统计（文章数、素材数、存储空间）
- 快捷键自定义（按键录制 + 冲突检测）
- 设置导入导出（JSON 文件下载/上传）

### 2.2 功能实现差距分析（逐 Tab）

#### Appearance Tab -- 部分生效
| 设置项 | 绑定路径 | 是否真正生效 | 原因分析 |
|--------|----------|-------------|----------|
| `theme` | `settings.appearance.theme` | **未完全生效** | UI 绑定存在但缺少 `document.documentElement.classList` 切换逻辑和 CSS 变量响应（需在 App.vue 中 watch） |
| `fontFamily` | `settings.appearance.fontFamily` | **已生效** | App.vue 已有全局 CSS var 同步逻辑（根据 MEMORY 记录） |
| `fontSize` | `settings.appearance.fontSize` | **部分生效** | 绑定到 CSS var 但编辑器（TipTap）是否响应取决于编辑器组件是否读取此变量 |
| `lineHeight` | `settings.appearance.lineHeight` | **部分生效** | 同上 |
| `accentColor` | `settings.appearance.accentColor` | **已生效** | App.vue 同步 `--accent-primary` |
| `sidebarWidth` | `settings.appearance.sidebarWidth` | **未生效** | 无任何组件读取此值绑定到实际面板宽度 |
| `reducedMotion` | `settings.appearance.reducedMotion` | **未生效** | 缺少 `prefers-reduced-motion` 媒体查询适配和动画条件判断 |
| `typography.*` | `settings.appearance.typography` | **未生效** | Schema 定义完整但无任何消费者；paragraphIndent、headingStyle、blockquoteStyle 等均无响应 |

#### Editor Tab -- 大部分未真正生效
| 设置项 | 是否真正生效 | 原因分析 |
|--------|-------------|----------|
| `autoSave` | **未生效** | 缺少 `setInterval` 定时器实现；editor store 的 `updateContent` 由用户操作触发，无自动定时保存 |
| `autoSaveInterval` | **未生效** | 同上 |
| `spellCheck` | **未生效** | TipTap 编辑器未读取此值设置 `spellcheck` 属性 |
| `typewriterMode` | **可能已生效** | 有 `TypewriterMode` TipTap 扩展存在（`inkforge/src/extensions/`），但需确认是否根据此设置项动态启用 |
| `smartPunctuation` | **可能已生效** | 有 `SmartPunctuation` 扩展，同上 |
| `wordWrap` | **未生效** | 无 CSS 动态绑定 `white-space` |
| `tabSize` | **未生效** | TipTap 无内置缩进配置机制绑定此值 |
| `showLineNumbers` | **未生效** | 无行号显示实现 |
| `highlightActiveLine` | **未生效** | 无当前行高亮 CSS 实现 |
| `bracketMatching` | **未生效** | TipTap 无内置括号匹配 |

#### Export Tab -- 部分生效
| 设置项 | 是否真正生效 | 原因分析 |
|--------|-------------|----------|
| `defaultPlatform` | **可能已生效** | ExportModal 打开时是否读取此值取决于 ExportModal 组件实现 |
| `defaultPresetId` | **可能已生效** | 同上 |
| `macCodeBlock` | **传递给渲染管线** | 需确认 RenderPipeline 是否消费 |
| `lineNumbers` | **传递给渲染管线** | 同上 |
| `convertFootnotes` | **传递给渲染管线** | 同上 |
| `textIndent` | **传递给渲染管线** | 同上 |
| `imageMaxWidth` | **传递给渲染管线** | 同上 |
| `codeTheme` | **传递给渲染管线** | 同上 |

#### AI Tab -- 已生效
| 设置项 | 是否真正生效 | 原因分析 |
|--------|-------------|----------|
| `provider` | **已生效** | AI store 的 `provider` computed 读取 `settingsStore.settings.ai`，自动重建 Provider 实例 |
| `apiKey` | **已生效** | 传递给 `createProvider()` |
| `baseUrl` | **已生效** | 传递给 Provider |
| `model` | **已生效** | 传递给每次 API 调用 |
| `maxTokens` | **已生效** | 传递给 ChatOptions |
| `temperature` | **已生效** | 传递给 ChatOptions |
| `ollamaUrl` | **已生效** | 传递给 OllamaProvider |
| 连接测试按钮 | **已生效** | `testAIConnection()` 调用 `aiStore.testConnection()` |

#### Data Tab -- 大部分未生效
| 设置项 | 是否真正生效 | 原因分析 |
|--------|-------------|----------|
| `autoBackup` | **未生效** | Schema 定义存在但无定时备份调度器 |
| `backupInterval` | **未生效** | 同上 |
| `maxBackups` | **未生效** | 同上 |
| 数据统计 | **已生效** | 从 articleStore 和 assetStore 读取 |
| 设置导入导出 | **已生效** | JSON 文件下载/上传完整实现 |
| 危险区域（清除/重置） | **已生效** | 调用 store 方法 |

#### Shortcuts Tab -- 部分生效
| 设置项 | 是否真正生效 | 原因分析 |
|--------|-------------|----------|
| 快捷键录制 | **已生效** | 按键录制 + 冲突检测完整实现 |
| 快捷键绑定到实际操作 | **未生效** | 设置值保存了但无全局 keydown 监听器将快捷键映射到实际操作（如 Ctrl+S -> 保存） |

---

## 3. 使所有现有设置真正生效

### 3.1 Appearance Tab 生效方案

**App.vue 需新增/完善的 watch 逻辑**：

```typescript
// 文件: inkforge/src/App.vue
// 在 setup 中添加以下 watchers:

import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

// 主题切换
watch(
  () => settingsStore.settings.appearance.theme,
  (theme) => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      root.classList.add(prefersDark ? 'theme-dark' : 'theme-light')
    } else {
      root.classList.add(`theme-${theme}`)
    }
  },
  { immediate: true }
)

// 字体大小
watch(
  () => settingsStore.settings.appearance.fontSize,
  (size) => {
    document.documentElement.style.setProperty('--editor-font-size', `${size}px`)
  },
  { immediate: true }
)

// 行高
watch(
  () => settingsStore.settings.appearance.lineHeight,
  (lh) => {
    document.documentElement.style.setProperty('--editor-line-height', String(lh))
  },
  { immediate: true }
)

// 侧边栏宽度
watch(
  () => settingsStore.settings.appearance.sidebarWidth,
  (width) => {
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
  },
  { immediate: true }
)

// 减弱动效
watch(
  () => settingsStore.settings.appearance.reducedMotion,
  (reduced) => {
    document.documentElement.classList.toggle('reduced-motion', reduced)
  },
  { immediate: true }
)
```

**CSS 支撑**（`inkforge/src/styles/main.css` 或 App.vue style）：
```css
.reduced-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* 排版变量 */
:root {
  --editor-font-size: 16px;
  --editor-line-height: 1.8;
  --sidebar-width: 240px;
}
```

**Typography 子设置生效**需要在 EditorPanel 和 PreviewPanel 中消费 `settings.appearance.typography` 对象的各字段，通过 CSS variables 或直接 style 绑定。

### 3.2 Editor Tab 生效方案

**自动保存定时器**（在 EditorPanel.vue 或独立 composable 中实现）：

```typescript
// 文件: inkforge/src/composables/useAutoSave.ts
import { watch, onUnmounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useEditorStore } from '@/stores/editor'

export function useAutoSave() {
  const settingsStore = useSettingsStore()
  const editorStore = useEditorStore()
  const timerId = ref<ReturnType<typeof setInterval> | null>(null)

  function startAutoSave() {
    stopAutoSave()
    if (!settingsStore.settings.editor.autoSave) return

    const intervalMs = settingsStore.settings.editor.autoSaveInterval * 1000
    timerId.value = setInterval(async () => {
      if (editorStore.isReady && editorStore.currentContent) {
        await editorStore.updateContent({})  // 触发 updatedAt 更新
      }
    }, intervalMs)
  }

  function stopAutoSave() {
    if (timerId.value) {
      clearInterval(timerId.value)
      timerId.value = null
    }
  }

  watch(
    () => [settingsStore.settings.editor.autoSave, settingsStore.settings.editor.autoSaveInterval],
    () => startAutoSave(),
    { immediate: true }
  )

  onUnmounted(() => stopAutoSave())

  return { startAutoSave, stopAutoSave }
}
```

**TipTap 编辑器属性绑定**（EditorPanel.vue 中）：

```typescript
// spellcheck 属性
watch(
  () => settingsStore.settings.editor.spellCheck,
  (enabled) => {
    if (editor.value) {
      editor.value.view.dom.setAttribute('spellcheck', String(enabled))
    }
  }
)

// wordWrap CSS
watch(
  () => settingsStore.settings.editor.wordWrap,
  (wrap) => {
    if (editor.value) {
      editor.value.view.dom.style.whiteSpace = wrap ? 'pre-wrap' : 'pre'
      editor.value.view.dom.style.wordBreak = wrap ? 'break-word' : 'normal'
    }
  }
)

// TypewriterMode extension 动态切换
watch(
  () => settingsStore.settings.editor.typewriterMode,
  (enabled) => {
    if (editor.value) {
      if (enabled) {
        editor.value.commands.enableTypewriterMode()  // 如扩展支持
      } else {
        editor.value.commands.disableTypewriterMode()
      }
    }
  }
)
```

### 3.3 Export Tab 生效方案

ExportModal 组件需在 `onMounted` 时读取 `settingsStore.settings.export.defaultPlatform` 和 `settingsStore.settings.export.defaultPresetId` 作为初始选中值。所有 export schema 字段（`macCodeBlock`、`lineNumbers`、`convertFootnotes`、`textIndent`、`imageMaxWidth`、`codeTheme`）需传递给 RenderPipeline 的配置对象。

### 3.4 AI Tab -- 已完全生效

无需额外工作。当前实现通过 computed `provider` 自动随 settings 变化重建 Provider 实例。

### 3.5 Data Tab 生效方案

**自动备份调度器**：

```typescript
// 文件: inkforge/src/composables/useAutoBackup.ts
import { watch, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export function useAutoBackup() {
  const settingsStore = useSettingsStore()
  let timerId: ReturnType<typeof setInterval> | null = null

  function startAutoBackup() {
    stopAutoBackup()
    if (!settingsStore.settings.data.autoBackup) return

    const intervalMs = settingsStore.settings.data.backupInterval * 24 * 60 * 60 * 1000  // 天 -> 毫秒
    timerId = setInterval(async () => {
      await performBackup()
    }, intervalMs)
  }

  function stopAutoBackup() {
    if (timerId) { clearInterval(timerId); timerId = null }
  }

  async function performBackup(): Promise<void> {
    // 从 IndexedDB 导出所有文档为 JSON
    // 保存到 localStorage 或触发文件下载
    // 维护 maxBackups 限制（删除最旧的备份）
  }

  watch(
    () => [settingsStore.settings.data.autoBackup, settingsStore.settings.data.backupInterval],
    () => startAutoBackup(),
    { immediate: true }
  )

  onUnmounted(() => stopAutoBackup())
}
```

**存储使用量显示**：

```typescript
async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate()
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 }
  }
  return { usage: 0, quota: 0 }
}
```

### 3.6 Shortcuts Tab 生效方案

需要一个全局键盘事件监听器，将设置中定义的快捷键映射到实际操作：

```typescript
// 文件: inkforge/src/composables/useGlobalShortcuts.ts
import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useEditorStore } from '@/stores/editor'

export function useGlobalShortcuts() {
  const settingsStore = useSettingsStore()
  const editorStore = useEditorStore()

  const actionMap: Record<string, () => void> = {
    save: () => editorStore.updateContent({}),
    bold: () => { /* editor.commands.toggleBold() */ },
    italic: () => { /* editor.commands.toggleItalic() */ },
    undo: () => { /* editor.commands.undo() */ },
    redo: () => { /* editor.commands.redo() */ },
    outline: () => { /* toggle outline panel */ },
    focusMode: () => { /* toggle focus mode */ },
  }

  function handleKeyDown(e: KeyboardEvent) {
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')
    if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
    }
    const combo = parts.join('+')

    for (const [action, binding] of Object.entries(settingsStore.settings.shortcuts)) {
      if (binding === combo && actionMap[action]) {
        e.preventDefault()
        actionMap[action]()
        return
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))
}
```

---

## 4. 新增 Account Tab（账户管理）

### 4.1 数据模型

```typescript
// 文件: inkforge/src/schemas/account.ts
import { z } from 'zod'

export const AccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '名称不能为空').max(50, '名称不超过50字'),
  email: z.string().email('邮箱格式无效').or(z.literal('')).default(''),
  avatarBlobId: z.string().nullable().default(null),  // 引用 assets 表中的 Blob id
  bio: z.string().max(200, '简介不超过200字').default(''),
  createdAt: z.union([z.date(), z.string(), z.number()]).transform(v => new Date(v)),
  updatedAt: z.union([z.date(), z.string(), z.number()]).transform(v => new Date(v)),
})

export type Account = z.infer<typeof AccountSchema>

export const CreateAccountDTOSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  email: z.string().email().or(z.literal('')).optional(),
  bio: z.string().max(200).optional(),
})

export type CreateAccountDTO = z.infer<typeof CreateAccountDTOSchema>

export const UpdateAccountDTOSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  bio: z.string().max(200).optional(),
  avatarBlobId: z.string().nullable().optional(),
})

export type UpdateAccountDTO = z.infer<typeof UpdateAccountDTOSchema>
```

### 4.2 Account Tab UI 规格

**Profile 编辑区域**：
- 头像区：圆形 80x80，点击触发文件上传（accept=image/*），上传后裁剪为 200x200 正方形存入 assets 表
- 默认头像：基于 `name` 首字母生成 SVG（背景色取 `accentColor`）
- 名称输入框：实时验证长度
- 邮箱输入框：Zod email 验证
- 个人简介：textarea，计数器显示 `n/200`
- 保存按钮：调用 accountStore.updateAccount()

**数据归属区域**：
- 显示"数据导出"按钮 -- GDPR 风格导出所有个人数据为 JSON
- 显示"删除账户"按钮 -- 清除所有数据（二次确认弹窗，输入"DELETE"确认）

**未来扩展区域**：
- "登录/注册"卡片，标注"即将推出"
- OAuth 图标占位（Lucide `LogIn` 图标 + GitHub/Google 文字标签）
- "设备管理"卡片，标注"即将推出"

### 4.3 Account Store

```typescript
// 文件: inkforge/src/stores/account.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/utils/db'
import { AccountSchema, type Account, type CreateAccountDTO, type UpdateAccountDTO, CreateAccountDTOSchema, UpdateAccountDTOSchema } from '@/schemas/account'
import { generateId } from '@/utils/uuid'
import { logger } from '@/services/error'

const DEFAULT_ACCOUNT_ID = 'local-default'

export const useAccountStore = defineStore('account', () => {
  const currentAccount = ref<Account | null>(null)
  const isLoaded = ref(false)

  async function loadOrCreateDefault(): Promise<void> {
    try {
      const existing = await db.accounts.get(DEFAULT_ACCOUNT_ID)
      if (existing) {
        currentAccount.value = AccountSchema.parse(existing)
      } else {
        const now = new Date()
        const account: Account = AccountSchema.parse({
          id: DEFAULT_ACCOUNT_ID,
          name: 'InkForge 用户',
          email: '',
          avatarBlobId: null,
          bio: '',
          createdAt: now,
          updatedAt: now,
        })
        await db.accounts.add(account)
        currentAccount.value = account
      }
      isLoaded.value = true
    } catch (e) {
      logger.error('加载账户失败', e)
    }
  }

  async function updateAccount(updates: UpdateAccountDTO): Promise<boolean> {
    if (!currentAccount.value) return false
    const validated = UpdateAccountDTOSchema.parse(updates)
    const updated = {
      ...currentAccount.value,
      ...validated,
      updatedAt: new Date(),
    }
    const parsed = AccountSchema.parse(updated)
    await db.accounts.put(parsed)
    currentAccount.value = parsed
    return true
  }

  async function updateAvatar(blob: Blob): Promise<string> {
    // 存储到 assets 表，返回 asset ID
    const assetId = generateId()
    await db.assets.add({
      id: assetId,
      articleId: null,
      name: `avatar-${Date.now()}.png`,
      type: 'image',
      mimeType: blob.type,
      size: blob.size,
      blob,
      tags: ['avatar'],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await updateAccount({ avatarBlobId: assetId })
    return assetId
  }

  async function exportAllData(): Promise<string> {
    // GDPR 风格导出
    const articles = await db.articles.toArray()
    const categories = await db.categories.toArray()
    const contents = await db.contents.toArray()
    const documents = await db.documents.toArray()
    const versions = await db.versions.toArray()
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      account: currentAccount.value,
      articles, categories, contents, documents, versions,
    }, null, 2)
  }

  async function deleteAccount(): Promise<void> {
    // 清除所有数据
    await db.delete()
    localStorage.removeItem('inkforge-settings')
    currentAccount.value = null
  }

  const displayName = computed(() => currentAccount.value?.name ?? 'InkForge 用户')
  const avatarInitial = computed(() => {
    const name = currentAccount.value?.name ?? ''
    return name.charAt(0).toUpperCase() || 'U'
  })

  loadOrCreateDefault()

  return {
    currentAccount, isLoaded, displayName, avatarInitial,
    loadOrCreateDefault, updateAccount, updateAvatar, exportAllData, deleteAccount,
  }
})
```

---

## 5. 新增 Sync Tab（同步设置）

### 5.1 Zod Schema 扩展

```typescript
// 新增到 inkforge/src/stores/settings.ts

const SyncTargetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('webdav'),
    url: z.string().url('WebDAV URL 格式无效'),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  z.object({
    type: z.literal('s3'),
    endpoint: z.string().url('S3 Endpoint 格式无效'),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
    bucket: z.string().min(1),
    region: z.string().default('auto'),
  }),
  z.object({
    type: z.literal('rest'),
    url: z.string().url('REST API URL 格式无效'),
    token: z.string().min(1),
  }),
  z.object({
    type: z.literal('none'),
  }),
])

const SyncSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  target: SyncTargetSchema.default({ type: 'none' }),
  interval: z.enum(['5m', '15m', '30m', '1h', 'manual']).default('15m'),
  conflictStrategy: z.enum(['local-wins', 'remote-wins', 'manual']).default('local-wins'),
  encryptionEnabled: z.boolean().default(true),
  selectedCategoryIds: z.array(z.string()).default([]),  // 空数组表示全部同步
})
```

### 5.2 Sync Tab UI 规格

**同步目标配置区域**：
- 下拉选择同步类型：WebDAV / S3 / REST API / 未配置
- 根据选中类型动态显示对应配置表单
- WebDAV：URL + 用户名 + 密码（密码 type=password + 眼睛切换）
- S3：Endpoint + Access Key + Secret Key（密码字段）+ Bucket + Region
- REST API：URL + Bearer Token
- "测试连接"按钮 -- 发送 HEAD 请求验证凭证

**同步策略区域**：
- 自动同步开关（toggle）
- 同步间隔选择（radio group）：5分钟 / 15分钟 / 30分钟 / 1小时 / 手动
- 冲突解决策略选择（radio group）：本地优先 / 远端优先 / 手动合并
- 选择性同步：分类列表（checkbox），勾选参与同步的分类

**同步状态 Dashboard 区域**：
- 最后同步时间（从 syncStore.lastSyncAt 读取）
- 待同步变更数（从 syncStore.pendingCount 读取）
- 同步状态文本（从 syncStore.statusText 读取）
- 冲突列表（从 syncStore.conflicts 读取）：每个冲突显示文档标题 + 本地版本号 + 远端版本号 + "使用本地" / "使用远端" 按钮
- "立即同步"按钮

**加密设置区域**：
- 端对端加密开关
- 加密算法标签（只读显示）：AES-GCM-256
- 密钥派生说明（只读显示）：主密钥包装使用 PBKDF2 310,000 iterations；同步内容派生使用 PBKDF2 100,000 iterations
- "初始化/解锁主密钥"按钮 -- 弹窗输入主密码，调用 `unlockWithPassword(password)`
- "生成恢复密钥"按钮 -- 弹窗输入导出密码，调用 `exportMasterKey(exportPassword)`，显示恢复密钥包
- "导入恢复密钥"按钮 -- 弹窗输入恢复密钥包 + 导出密码 + 新密码，调用 `importMasterKey(bundle, exportPassword, newPassword)`

**当前交付状态说明**：
- 底层主密钥生命周期能力已在 `key-management.ts` 中可用，并已被同步链路真实验收使用。
- `SettingsView.vue` 当前已完整落地搜索、同步目标配置、同步状态与冲突处理，以及主密钥初始化/解锁、恢复密钥导出/导入、复制/下载与键盘关闭等正式 UI 入口。
- Settings / Sync 的正式验收应基于真实浏览器与真实 REST target 执行；手动“立即同步”在同步目标已配置时必须直接走远端链路，不受自动同步开关约束。

### 5.3 同步间隔映射

```typescript
const SYNC_INTERVAL_MAP: Record<string, number> = {
  '5m':     5 * 60 * 1000,
  '15m':   15 * 60 * 1000,
  '30m':   30 * 60 * 1000,
  '1h':    60 * 60 * 1000,
  'manual': 0,  // 0 表示不自动同步
}
```

---

## 6. 新增 Advanced Tab（高级设置）

### 6.1 Zod Schema 扩展

```typescript
const FeatureFlagSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean().default(false),
  experimental: z.boolean().default(true),
})

const ProxySchema = z.object({
  enabled: z.boolean().default(false),
  host: z.string().default(''),
  port: z.number().min(1).max(65535).default(7890),
  username: z.string().default(''),
  password: z.string().default(''),
  protocol: z.enum(['http', 'https', 'socks5']).default('http'),
})

const AdvancedSettingsSchema = z.object({
  logLevel: z.enum(['off', 'error', 'warn', 'info', 'debug']).default('warn'),
  showPerformanceMetrics: z.boolean().default(false),
  featureFlags: z.array(FeatureFlagSchema).default([
    { id: 'markdown-hints', name: 'Markdown 语法提示', description: '输入时显示 Markdown 语法提示浮窗', enabled: false, experimental: true },
    { id: 'multi-tab', name: '多文档标签', description: '支持同时打开多个文档编辑', enabled: false, experimental: true },
    { id: 'ambient-sound', name: '环境音效', description: '打字时播放舒缓的环境音效', enabled: false, experimental: true },
    { id: 'ai-autocomplete', name: 'AI 自动补全', description: '输入时使用 AI 预测并自动补全内容', enabled: false, experimental: true },
    { id: 'version-diff', name: '版本对比', description: '支持两个版本之间的差异可视化对比', enabled: false, experimental: true },
  ]),
  proxy: ProxySchema.default({}),
})
```

### 6.2 Advanced Tab UI 规格

**开发者选项区域**：
- 日志级别选择（select）：关闭 / 错误 / 警告 / 信息 / 调试
- 性能指标显示开关（toggle）
- "查看 IndexedDB 数据"按钮 -- 弹窗显示各表的记录数和大小估算

**实验性功能区域**：
- Feature Flag 列表，每个 flag 显示：
  - 名称 + `[实验性]` 标签（Lucide `FlaskConical` 图标）
  - 描述文字
  - Toggle 开关
- 底部说明文字："实验性功能可能不稳定，随时可能更改或移除"

**数据迁移区域**：
- 导入来源选择：Notion / Obsidian / Typora / 文件夹
- "选择文件夹"按钮 -- 使用 `showDirectoryPicker()` API（Chromium）或 `<input type="file" webkitdirectory>`
- 导入预览列表：显示将要导入的 .md 文件名、大小
- 冲突处理策略选择（radio）：跳过 / 覆盖 / 重命名
- "开始导入"按钮 + 进度条

**代理设置区域**：
- 代理开关（toggle）
- 协议选择（radio）：HTTP / HTTPS / SOCKS5
- 代理地址输入框
- 端口输入框（number，1-65535）
- 认证用户名（可选）
- 认证密码（可选，密码字段）

**设置 Profile 系统区域**：
- 当前 Profile 名称显示
- "保存为新 Profile"按钮 -- 弹窗输入名称
- Profile 列表：每行显示名称 + "切换" + "删除" + "重命名"按钮
- 快捷 Profile：预设的"工作模式" / "写作模式" / "演示模式"卡片

---

## 7. 设置搜索功能

### 7.1 搜索数据结构

```typescript
interface SearchableSettingItem {
  tabId: TabId
  sectionTitle: string
  label: string
  description: string
  /** 搜索匹配权重：label > description > sectionTitle */
  keywords: string[]
  /** 在 Tab 内的 DOM 选择器（用于滚动到视图） */
  anchorId: string
}
```

### 7.2 搜索索引

在 `SettingsView.vue` 的 `<script setup>` 中预构建搜索索引（静态数组），包含所有设置项的 `label`、`description`、`tabId`。搜索输入框使用 `v-model` 绑定搜索关键词，通过 computed 属性实时过滤匹配项。匹配结果显示为下拉列表，点击后切换到对应 Tab 并高亮对应设置行。

### 7.3 UI 位置

搜索栏放置在 Settings 页面 Header 中（右侧），使用 Lucide `Search` 图标 + 文本输入框。

---

## 8. 完整 Zod Schema 更新

### 8.1 新增 Schema 定义

在 `settings.ts` 的 `SettingsSchema` 中新增三个顶级字段：

```typescript
const SettingsSchema = z.object({
  appearance: AppearanceSchema,
  editor: EditorSchema,
  export: ExportSchema,
  ai: AISchema,
  data: DataSchema,
  shortcuts: ShortcutSchema,
  // === 新增 ===
  account: z.object({
    profileId: z.string().default('local-default'),
  }).default({}),
  sync: SyncSettingsSchema.default({
    enabled: false,
    target: { type: 'none' },
    interval: '15m',
    conflictStrategy: 'local-wins',
    encryptionEnabled: true,
    selectedCategoryIds: [],
  }),
  advanced: AdvancedSettingsSchema.default({
    logLevel: 'warn',
    showPerformanceMetrics: false,
    featureFlags: [],
    proxy: { enabled: false, host: '', port: 7890, username: '', password: '', protocol: 'http' },
  }),
})
```

### 8.2 迁移策略

`load()` 方法已使用"默认值与用户数据合并"模式（第 130-143 行），新增字段会自动获得默认值。只需在合并逻辑中添加：

```typescript
sync: { ...getDefaultSettings().sync, ...parsed.sync },
advanced: { ...getDefaultSettings().advanced, ...parsed.advanced },
account: { ...getDefaultSettings().account, ...parsed.account },
```

