# 07 -- 设置功能完全实装规范

> 优先级: P1
> 影响文件: SettingsView.vue, stores/settings.ts
> 核心目标: 确保所有设置项都有完整的 UI 和功能实装

---

## 一、问题描述

Settings 页面虽然有 10 个 Tab，但众多功能未实装或仅有 UI 无功能。需要逐一检查并补全。

## 二、现有 Tab 结构

| Tab | ID | 图标 | 实装状态 |
|---|---|---|---|
| 账户 | account | Shield | 部分 |
| 外观 | appearance | Palette | 大部分 |
| 编辑器 | editor | BookOpen | 大部分 |
| 导出 | export | Download | 部分 |
| AI 服务 | ai | Sparkles | 大部分 |
| 数据 | data | Database | 部分 |
| 同步 | sync | Cloud | 部分 |
| 快捷键 | shortcuts | Command | 待实装 |
| 高级 | advanced | Settings2 | 部分 |
| 关于 | about | Info | 完成 |

## 三、各 Tab 详细实装规范

### 3.1 账户 Tab (account)

参见 `06-account-auth-spec.md` 第 3.5 节。

**核心功能**:
- 头像上传 (裁剪 + Base64 存储)
- 用户名/邮箱/简介编辑
- 修改密码
- 登录状态显示
- 登出按钮
- 导出账户数据 (JSON 下载)
- 删除账户 (需二次确认)

### 3.2 外观 Tab (appearance)

**已有功能** (确保正常工作):
- 主题切换 (light/dark/system) -- 3 个选项卡按钮
- 主色切换 -- 5 个预设色 + 自定义色 (需 ColorPicker)
- 字体选择 -- serif/sans/kai/mono 4 种
- 字号滑块 -- 12-24px
- 行高滑块 -- 1.4-2.4
- 侧栏宽度滑块 -- 180-400px
- 减少动画 -- toggle switch
- 排版细节:
  - 段落缩进 (toggle)
  - 段间距 (slider 0-32px)
  - 字间距 (slider -0.05-0.2em)
  - 标题样式 (4 选项)
  - 引用块风格 (3 选项)

**需增强**:
- 自定义主色: 添加一个颜色输入框 (`<input type="color">`)，允许输入任意 hex 颜色
- 主题预览: 每个主题选项旁显示一个小型预览卡片
- 字体预览: 每个字体选项使用对应字体渲染预览文本

**CSS 变量同步**: 确保以下 CSS 变量在 App.vue 中正确同步:
```typescript
watch(() => settingsStore.settings.appearance, (appearance) => {
  document.documentElement.style.setProperty('--accent-color', appearance.accentColor)
  document.documentElement.style.setProperty('--font-family', getFontStack(appearance.fontFamily))
  document.documentElement.style.setProperty('--font-size', `${appearance.fontSize}px`)
  document.documentElement.style.setProperty('--line-height', String(appearance.lineHeight))
  document.documentElement.setAttribute('data-theme', appearance.theme)
}, { deep: true, immediate: true })
```

### 3.3 编辑器 Tab (editor)

**已有功能** (确保正常工作):
- 自动保存 toggle + 间隔滑块 (10-300s)
- 拼写检查 toggle
- 打字机模式 toggle
- 智能标点 toggle
- Markdown 提示 toggle
- 自动换行 toggle
- Tab 大小 (2/4/8)
- 显示行号 toggle
- 高亮当前行 toggle
- 括号匹配 toggle
- 写作目标:
  - 启用 toggle
  - 目标字数 (100-50000)
  - 显示进度 toggle
  - 完成庆祝 toggle

**需增强**:
- **编辑器宽度选择**: narrow/medium/wide/full (新增, 参见 01-editor-ui-spec.md)
- **光标闪烁样式**: block/line/underline (可选)
- **自动补全括号**: toggle (自动关闭括号、引号)
- **默认行尾**: LF/CRLF/Auto (仅显示, Tauri 端有效)

**新增: 编辑模式选择**:

在 Editor Tab 的"写作体验"卡片中添加编辑模式选择器:

```html
<label class="field">
  <span>编辑模式</span>
  <select v-model="settingsStore.settings.editor.editorMode">
    <option value="typora">Typora 模式 (即时渲染)</option>
    <option value="split">源码 + 预览 (分屏)</option>
  </select>
</label>
```

**Zod Schema 扩展** (在 `EditorSchema` 中新增):
```typescript
editorMode: z.enum(['typora', 'split']).default('typora'),
```

**行为**:
- `typora` 模式: TipTap 即时渲染 Markdown，所见即所得
- `split` 模式: 左侧原始 Markdown 文本编辑 + 右侧实时预览 HTML

**WorkstationView.vue 消费方式**:
```typescript
const editorMode = computed(() => settingsStore.settings.editor.editorMode)
// 根据模式切换 WorkstationView 的布局:
// typora: 仅 EditorPanel
// split: EditorPanel(文本模式) + PreviewPanel(HTML 预览)
```

**新增: 编辑器宽度选择**:

在 Editor Tab 的"写作体验"卡片中添加编辑器宽度选择器:

```html
<div class="field field--full">
  <span>编辑器宽度</span>
  <div class="width-selector">
    <button
      v-for="option in editorWidthOptions"
      :key="option.value"
      class="chip-btn"
      :class="{ 'chip-btn--active': settingsStore.settings.editor.editorWidth === option.value }"
      type="button"
      @click="settingsStore.settings.editor.editorWidth = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</div>
```

**宽度选项定义**:
```typescript
const editorWidthOptions = [
  { value: 'narrow', label: '窄 (640px)', maxWidth: '640px' },
  { value: 'medium', label: '中 (768px)', maxWidth: '768px' },
  { value: 'wide', label: '宽 (960px)', maxWidth: '960px' },
  { value: 'full', label: '全宽', maxWidth: '100%' },
] as const
```

**Zod Schema 扩展** (在 `EditorSchema` 中新增):
```typescript
editorWidth: z.enum(['narrow', 'medium', 'wide', 'full']).default('medium'),
```

**EditorPanel.vue 消费方式**:
```typescript
const editorMaxWidth = computed(() => {
  const widthMap: Record<string, string> = {
    narrow: '640px',
    medium: '768px',
    wide: '960px',
    full: '100%',
  }
  return widthMap[settingsStore.settings.editor.editorWidth] ?? '768px'
})
```

```css
.editor-paper {
  max-width: v-bind(editorMaxWidth);
  margin: 0 auto;
}
```

**实装要点**: 每个 toggle/slider 的变更都必须:
1. 通过 `settingsStore.settings.editor.xxx = newValue` 修改 Pinia state
2. 5 秒后自动保存到 localStorage (已有 debounce watch)
3. 实时反映到编辑器 (已有 watch → updateExtensionOptions)

### 3.4 导出 Tab (export)

**已有功能**:
- 默认平台选择 (wechat/xiaohongshu/zhihu)
- 默认预设 ID
- Mac 风格代码块 toggle
- 行号 toggle
- 脚注转换 toggle
- 段落缩进 toggle
- 图片最大宽度滑块 (320-1080px)
- 代码主题选择

**需增强**:
- **平台预览**: 选择平台后显示一个简短的平台说明和排版特点
- **自定义 CSS 编辑器**: 允许用户为每个平台添加自定义 CSS
  - 使用 CodeMirror (已安装 vue-codemirror) 作为 CSS 编辑器
  - 实时预览效果
- **导出历史**: 显示最近的导出记录 (平台、时间、文章标题)
- **一键复制到剪贴板**: 在导出设置旁添加"现在复制"按钮

### 3.5 AI 服务 Tab (ai)

**已有功能**:
- Provider 选择 (openai/anthropic/deepseek/ollama/none)
- API Key 输入 (密码字段)
- Base URL 输入
- Model 输入
- Max Tokens 滑块 (100-8000)
- Temperature 滑块 (0-2)
- Ollama URL 输入
- 连接测试按钮
- Ollama 模型列表加载

**需增强**:
- **API Key 可见性切换**: 使用 Eye/EyeOff 图标切换密码显示
- **Provider 说明**: 每个 Provider 旁显示简短说明:
  - OpenAI: "OpenAI API 兼容接口 (默认硅基流动)"
  - Anthropic: "Anthropic Claude API"
  - DeepSeek: "DeepSeek API"
  - Ollama: "本地 Ollama 服务"
- **模型下拉选择**: 对于已知的 Provider，提供模型下拉:
  - OpenAI/SiliconFlow: Qwen/Qwen3-8B, deepseek-ai/DeepSeek-V3, ...
  - Anthropic: claude-3-opus, claude-3-sonnet, ...
  - DeepSeek: deepseek-chat, deepseek-reasoner
  - Ollama: 从 API 动态获取
- **系统提示词编辑**: 添加 textarea 让用户自定义 AI 系统提示词
- **连接状态持久化**: 显示上次成功连接的时间

### 3.6 数据 Tab (data)

**已有功能**:
- 存储占用显示 (浏览器配额)
- 数据库表记录数统计
- Markdown/HTML/TXT 文件导入
- 设置 JSON 导出/导入
- 完整 IndexedDB 快照导出/导入
- 清空文章
- 清理素材
- 重置设置

**需增强**:
- **存储使用可视化**: 用进度条显示每个表的存储占比
- **导入进度**: 批量导入时显示进度条和当前处理文件名
- **自动备份设置**:
  - 启用自动备份 toggle
  - 备份间隔 (1/3/7/14/30 天)
  - 最大备份数 (3/5/10)
  - 备份位置: localStorage / 下载目录 (Tauri)
- **危险操作增强**: 所有危险操作需要输入 "确认删除" 文本才能执行

### 3.7 同步 Tab (sync)

**已有功能**:
- 同步目标配置 (WebDAV/S3/REST)
- 同步启用 toggle
- 同步间隔选择
- 冲突策略选择
- 分类过滤
- 加密设置
- 主密钥管理

**需增强**:
- **同步状态仪表盘**: 在 Tab 顶部显示:
  - 上次同步时间
  - 同步状态 (成功/失败/进行中)
  - 待同步变更数
- **同步日志**: 显示最近 20 条同步日志 (时间、操作、结果)
- **连接测试**: 点击按钮测试同步目标的连通性
- **手动同步按钮**: 立即触发一次同步

### 3.8 快捷键 Tab (shortcuts) -- 重点实装

**这是最需要实装的 Tab。** 当前仅定义了 7 个快捷键动作，需扩展至 32 个，按功能分为 5 组。

**布局**:
```
┌────────────────────────────────────────────────┐
│  快捷键设置                                      │
│                                                  │
│  搜索快捷键: [______________]                    │
│                                                  │
│  ─── 格式化 (8 项) ───                           │
│  加粗         [Ctrl+B]        [重置]             │
│  斜体         [Ctrl+I]        [重置]             │
│  下划线       [Ctrl+U]        [重置]             │
│  删除线       [Ctrl+Shift+S]  [重置]             │
│  行内代码     [Ctrl+Shift+`]  [重置]             │
│  插入链接     [Ctrl+K]        [重置]             │
│  清除格式     [Ctrl+\]        [重置]             │
│  高亮         [Ctrl+Shift+H]  [重置]             │
│                                                  │
│  ─── 标题 (5 项) ───                             │
│  一级标题     [Ctrl+1]        [重置]             │
│  二级标题     [Ctrl+2]        [重置]             │
│  三级标题     [Ctrl+3]        [重置]             │
│  四级标题     [Ctrl+4]        [重置]             │
│  正文段落     [Ctrl+0]        [重置]             │
│                                                  │
│  ─── 块级 (7 项) ───                             │
│  引用块       [Ctrl+Shift+Q]  [重置]             │
│  代码块       [Ctrl+Shift+K]  [重置]             │
│  有序列表     [Ctrl+Shift+[]  [重置]             │
│  无序列表     [Ctrl+Shift+]]  [重置]             │
│  任务列表     [Ctrl+Shift+X]  [重置]             │
│  插入表格     [Ctrl+T]        [重置]             │
│  分割线       [Ctrl+Enter]    [重置]             │
│                                                  │
│  ─── 编辑 (6 项) ───                             │
│  保存         [Ctrl+S]        [重置]             │
│  撤销         [Ctrl+Z]        [重置]             │
│  重做         [Ctrl+Shift+Z]  [重置]             │
│  查找替换     [Ctrl+H]        [重置]             │
│  查找         [Ctrl+F]        [重置]             │
│  全选         [Ctrl+A]        [重置]             │
│                                                  │
│  ─── 视图 (7 项) ───                             │
│  切换左栏     [Ctrl+Shift+E]  [重置]             │
│  切换预览     [Ctrl+Shift+P]  [重置]             │
│  切换大纲     [Ctrl+Shift+O]  [重置]             │
│  专注模式     [F11]           [重置]             │
│  打字机模式   [F9]            [重置]             │
│  切换编辑模式 [Ctrl+Shift+M]  [重置]             │
│  放大         [Ctrl+=]        [重置]             │
│                                                  │
│  [全部重置为默认]                                │
└────────────────────────────────────────────────┘
```

#### 3.8.1 完整快捷键定义表

**格式化组** (8 项):

| 动作 ID | 标签 | 默认绑定 | 说明 | TipTap 命令 |
|---------|------|---------|------|------------|
| `bold` | 加粗 | `Ctrl+B` | 切换当前选区的加粗状态 | `editor.chain().toggleBold().run()` |
| `italic` | 斜体 | `Ctrl+I` | 切换当前选区的斜体状态 | `editor.chain().toggleItalic().run()` |
| `underline` | 下划线 | `Ctrl+U` | 切换当前选区的下划线状态 | `editor.chain().toggleUnderline().run()` |
| `strikethrough` | 删除线 | `Ctrl+Shift+S` | 切换当前选区的删除线状态 | `editor.chain().toggleStrike().run()` |
| `inlineCode` | 行内代码 | `` Ctrl+Shift+` `` | 切换当前选区的行内代码状态 | `editor.chain().toggleCode().run()` |
| `link` | 插入链接 | `Ctrl+K` | 弹出链接输入对话框 | 触发 LinkDialog |
| `clearFormat` | 清除格式 | `Ctrl+\` | 移除选区所有格式标记 | `editor.chain().clearNodes().unsetAllMarks().run()` |
| `highlight` | 高亮 | `Ctrl+Shift+H` | 切换当前选区的高亮状态 | `editor.chain().toggleHighlight().run()` |

**标题组** (5 项):

| 动作 ID | 标签 | 默认绑定 | 说明 | TipTap 命令 |
|---------|------|---------|------|------------|
| `heading1` | 一级标题 | `Ctrl+1` | 设为/取消一级标题 | `editor.chain().toggleHeading({ level: 1 }).run()` |
| `heading2` | 二级标题 | `Ctrl+2` | 设为/取消二级标题 | `editor.chain().toggleHeading({ level: 2 }).run()` |
| `heading3` | 三级标题 | `Ctrl+3` | 设为/取消三级标题 | `editor.chain().toggleHeading({ level: 3 }).run()` |
| `heading4` | 四级标题 | `Ctrl+4` | 设为/取消四级标题 | `editor.chain().toggleHeading({ level: 4 }).run()` |
| `paragraph` | 正文段落 | `Ctrl+0` | 恢复为正文段落 | `editor.chain().setParagraph().run()` |

**块级组** (7 项):

| 动作 ID | 标签 | 默认绑定 | 说明 | TipTap 命令 |
|---------|------|---------|------|------------|
| `blockquote` | 引用块 | `Ctrl+Shift+Q` | 切换引用块 | `editor.chain().toggleBlockquote().run()` |
| `codeBlock` | 代码块 | `Ctrl+Shift+K` | 切换代码块 | `editor.chain().toggleCodeBlock().run()` |
| `orderedList` | 有序列表 | `Ctrl+Shift+[` | 切换有序列表 | `editor.chain().toggleOrderedList().run()` |
| `bulletList` | 无序列表 | `Ctrl+Shift+]` | 切换无序列表 | `editor.chain().toggleBulletList().run()` |
| `taskList` | 任务列表 | `Ctrl+Shift+X` | 切换任务列表 | `editor.chain().toggleTaskList().run()` |
| `table` | 插入表格 | `Ctrl+T` | 插入 3x3 表格 | `editor.chain().insertTable({ rows: 3, cols: 3 }).run()` |
| `horizontalRule` | 分割线 | `Ctrl+Enter` | 插入水平分割线 | `editor.chain().setHorizontalRule().run()` |

**编辑组** (6 项):

| 动作 ID | 标签 | 默认绑定 | 说明 | TipTap 命令 |
|---------|------|---------|------|------------|
| `save` | 保存 | `Ctrl+S` | 立即保存当前文档 | 调用 `editorStore.saveNow()` |
| `undo` | 撤销 | `Ctrl+Z` | 回退上一步编辑操作 | `editor.chain().undo().run()` |
| `redo` | 重做 | `Ctrl+Shift+Z` | 恢复刚刚撤销的编辑操作 | `editor.chain().redo().run()` |
| `findReplace` | 查找替换 | `Ctrl+H` | 打开查找替换面板 | 触发 FindReplace 组件 |
| `find` | 查找 | `Ctrl+F` | 打开仅查找面板 | 触发 FindReplace 组件 (findOnly 模式) |
| `selectAll` | 全选 | `Ctrl+A` | 选中全部内容 | `editor.chain().selectAll().run()` |

**视图组** (7 项):

| 动作 ID | 标签 | 默认绑定 | 说明 | 命令 |
|---------|------|---------|------|------|
| `toggleSidebar` | 切换左栏 | `Ctrl+Shift+E` | 显示或隐藏文件管理左栏 | 切换 WorkstationView 的 `showSidebar` |
| `togglePreview` | 切换预览 | `Ctrl+Shift+P` | 显示或隐藏右侧预览面板 | 切换 WorkstationView 的 `showPreview` |
| `toggleOutline` | 切换大纲 | `Ctrl+Shift+O` | 显示或隐藏大纲面板 | 切换 OutlinePanel 可见性 |
| `focusMode` | 专注模式 | `F11` | 隐藏所有面板仅保留编辑器 | 切换 WorkstationView 的 `isFocusMode` |
| `typewriterMode` | 打字机模式 | `F9` | 编辑器光标始终居中 | 切换 `settingsStore.settings.editor.typewriterMode` |
| `switchEditorMode` | 切换编辑模式 | `Ctrl+Shift+M` | 在 Typora 即时渲染和源码+预览分屏之间切换 | 切换 `settingsStore.settings.editor.editorMode` |
| `zoomIn` | 放大 | `Ctrl+=` | 增加编辑器字号 | `settingsStore.settings.appearance.fontSize += 1` |

#### 3.8.2 DEFAULT_SHORTCUTS 更新

在 `stores/settings.ts` 中扩展 `DEFAULT_SHORTCUTS`:

```typescript
export const DEFAULT_SHORTCUTS: Record<string, string> = {
  // 格式化组
  bold: 'Ctrl+B',
  italic: 'Ctrl+I',
  underline: 'Ctrl+U',
  strikethrough: 'Ctrl+Shift+S',
  inlineCode: 'Ctrl+Shift+`',
  link: 'Ctrl+K',
  clearFormat: 'Ctrl+\\',
  highlight: 'Ctrl+Shift+H',

  // 标题组
  heading1: 'Ctrl+1',
  heading2: 'Ctrl+2',
  heading3: 'Ctrl+3',
  heading4: 'Ctrl+4',
  paragraph: 'Ctrl+0',

  // 块级组
  blockquote: 'Ctrl+Shift+Q',
  codeBlock: 'Ctrl+Shift+K',
  orderedList: 'Ctrl+Shift+[',
  bulletList: 'Ctrl+Shift+]',
  taskList: 'Ctrl+Shift+X',
  table: 'Ctrl+T',
  horizontalRule: 'Ctrl+Enter',

  // 编辑组
  save: 'Ctrl+S',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Shift+Z',
  findReplace: 'Ctrl+H',
  find: 'Ctrl+F',
  selectAll: 'Ctrl+A',

  // 视图组
  toggleSidebar: 'Ctrl+Shift+E',
  togglePreview: 'Ctrl+Shift+P',
  toggleOutline: 'Ctrl+Shift+O',
  focusMode: 'F11',
  typewriterMode: 'F9',
  switchEditorMode: 'Ctrl+Shift+M',
  zoomIn: 'Ctrl+=',
}
```

#### 3.8.3 shortcutDefinitions 更新

在 `SettingsView.vue` 中扩展 `shortcutDefinitions`:

```typescript
interface ShortcutGroup {
  id: string
  label: string
  items: ShortcutDefinition[]
}

interface ShortcutDefinition {
  id: string
  label: string
  description: string
}

const shortcutGroups: ShortcutGroup[] = [
  {
    id: 'formatting',
    label: '格式化',
    items: [
      { id: 'bold', label: '加粗', description: '切换当前选区的加粗状态' },
      { id: 'italic', label: '斜体', description: '切换当前选区的斜体状态' },
      { id: 'underline', label: '下划线', description: '切换当前选区的下划线状态' },
      { id: 'strikethrough', label: '删除线', description: '切换当前选区的删除线状态' },
      { id: 'inlineCode', label: '行内代码', description: '切换当前选区的行内代码状态' },
      { id: 'link', label: '插入链接', description: '弹出链接输入对话框' },
      { id: 'clearFormat', label: '清除格式', description: '移除选区所有格式标记' },
      { id: 'highlight', label: '高亮', description: '切换当前选区的高亮状态' },
    ],
  },
  {
    id: 'headings',
    label: '标题',
    items: [
      { id: 'heading1', label: '一级标题', description: '设为/取消一级标题' },
      { id: 'heading2', label: '二级标题', description: '设为/取消二级标题' },
      { id: 'heading3', label: '三级标题', description: '设为/取消三级标题' },
      { id: 'heading4', label: '四级标题', description: '设为/取消四级标题' },
      { id: 'paragraph', label: '正文段落', description: '恢复为正文段落' },
    ],
  },
  {
    id: 'blocks',
    label: '块级',
    items: [
      { id: 'blockquote', label: '引用块', description: '切换引用块' },
      { id: 'codeBlock', label: '代码块', description: '切换代码块' },
      { id: 'orderedList', label: '有序列表', description: '切换有序列表' },
      { id: 'bulletList', label: '无序列表', description: '切换无序列表' },
      { id: 'taskList', label: '任务列表', description: '切换任务列表' },
      { id: 'table', label: '插入表格', description: '插入 3x3 表格' },
      { id: 'horizontalRule', label: '分割线', description: '插入水平分割线' },
    ],
  },
  {
    id: 'editing',
    label: '编辑',
    items: [
      { id: 'save', label: '保存', description: '立即保存当前文档' },
      { id: 'undo', label: '撤销', description: '回退上一步编辑操作' },
      { id: 'redo', label: '重做', description: '恢复刚刚撤销的编辑操作' },
      { id: 'findReplace', label: '查找替换', description: '打开查找替换面板' },
      { id: 'find', label: '查找', description: '打开仅查找面板' },
      { id: 'selectAll', label: '全选', description: '选中全部内容' },
    ],
  },
  {
    id: 'view',
    label: '视图',
    items: [
      { id: 'toggleSidebar', label: '切换左栏', description: '显示或隐藏文件管理左栏' },
      { id: 'togglePreview', label: '切换预览', description: '显示或隐藏右侧预览面板' },
      { id: 'toggleOutline', label: '切换大纲', description: '显示或隐藏大纲面板' },
      { id: 'focusMode', label: '专注模式', description: '隐藏所有面板仅保留编辑器' },
      { id: 'typewriterMode', label: '打字机模式', description: '编辑器光标始终居中' },
      { id: 'switchEditorMode', label: '切换编辑模式', description: '在 Typora 和源码+预览之间切换' },
      { id: 'zoomIn', label: '放大', description: '增加编辑器字号' },
    ],
  },
]
```

#### 3.8.4 分组显示 UI

```vue
<template>
  <!-- 快捷键 Tab -->
  <section class="settings-section-stack">
    <!-- 搜索 -->
    <div class="shortcut-search">
      <Search :size="14" />
      <input
        v-model="shortcutFilter"
        type="search"
        placeholder="搜索快捷键动作..."
      />
    </div>

    <!-- 分组列表 -->
    <section
      v-for="group in filteredShortcutGroups"
      :key="group.id"
      class="setting-card"
    >
      <header class="card-header">
        <h2 class="card-title">{{ group.label }}</h2>
      </header>

      <div class="shortcut-list">
        <article
          v-for="shortcut in group.items"
          :key="shortcut.id"
          class="shortcut-item"
        >
          <div>
            <h3>{{ shortcut.label }}</h3>
            <p>{{ shortcut.description }}</p>
          </div>
          <div class="shortcut-actions">
            <code>{{ settingsStore.settings.shortcuts[shortcut.id] || '未设置' }}</code>
            <button
              class="secondary-btn"
              type="button"
              @click="startShortcutRecording(shortcut.id)"
            >
              {{ editingShortcut === shortcut.id ? '按下组合键' : '录制' }}
            </button>
            <button
              class="ghost-btn"
              type="button"
              @click="resetShortcut(shortcut.id)"
            >
              默认
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- 全部重置 -->
    <div class="button-row">
      <button class="danger-btn" type="button" @click="resetAllShortcuts">
        <RefreshCw :size="14" />
        <span>全部重置为默认</span>
      </button>
    </div>

    <!-- 冲突提示 -->
    <p v-if="shortcutConflict" class="helper-text helper-text--error">
      {{ shortcutConflict }}
    </p>
  </section>
</template>
```

**搜索过滤逻辑**:
```typescript
const shortcutFilter = ref('')

const filteredShortcutGroups = computed(() => {
  const keyword = shortcutFilter.value.trim().toLowerCase()
  if (!keyword) return shortcutGroups

  return shortcutGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(keyword)
        || item.description.toLowerCase().includes(keyword)
        || item.id.toLowerCase().includes(keyword)
      ),
    }))
    .filter((group) => group.items.length > 0)
})
```

**全部重置**:
```typescript
function resetAllShortcuts(): void {
  const confirmed = window.confirm('将所有快捷键重置为默认绑定，是否继续？')
  if (!confirmed) return

  for (const [key, value] of Object.entries(DEFAULT_SHORTCUTS)) {
    settingsStore.settings.shortcuts[key] = value
  }
  setNotice('success', '所有快捷键已重置为默认值')
}
```

**实现要点**:
- 快捷键绑定输入: 点击录制按钮后，全局监听下一个按键组合
- 冲突检测: 如果新绑定与现有绑定冲突，显示冲突的动作名称
- 搜索过滤: 输入关键字按标签/描述/ID 过滤显示的快捷键
- 分组显示: 格式化 / 标题 / 块级 / 编辑 / 视图，每组一个 setting-card
- 持久化: 修改后自动保存到 `settingsStore.settings.shortcuts`（已有 debounce watch）
- 重置: 单项重置和全部重置

**快捷键录入组件**: `ShortcutInput.vue`（可选独立组件，也可内联到 SettingsView）

```vue
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string  // e.g., "Ctrl+B"
  label: string
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isRecording = ref(false)

function startRecording() {
  isRecording.value = true
}

function handleKeydown(event: KeyboardEvent) {
  if (!isRecording.value) return
  event.preventDefault()
  event.stopPropagation()

  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')

  const key = event.key
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    parts.push(key.length === 1 ? key.toUpperCase() : key)
    emit('update:modelValue', parts.join('+'))
    isRecording.value = false
  }
}
</script>
```

### 3.9 高级 Tab (advanced) -- 补全实装

**已有功能**:
- 日志级别选择 (off/error/warn/info/debug)
- 性能指标显示 toggle
- Feature Flags 列表
- 代理设置 (HTTP proxy)
- 设置 Profiles 管理

#### 3.9.1 日志级别选择器

**当前 UI**（已在 SettingsView.vue `#advanced-runtime` 卡片中实现）:

```html
<label class="field">
  <span>日志级别</span>
  <select v-model="settingsStore.settings.advanced.logLevel">
    <option value="off">关闭</option>
    <option value="error">Error</option>
    <option value="warn">Warn</option>
    <option value="info">Info</option>
    <option value="debug">Debug</option>
  </select>
</label>
```

**需补全的行为绑定**: 日志级别变更后需要驱动 `services/error.ts` 中的 `logger` 实例更新过滤级别:

```typescript
// App.vue 或独立 composable 中
watch(() => settingsStore.settings.advanced.logLevel, (level) => {
  logger.setLevel(level)
}, { immediate: true })
```

如果 `logger` 不支持运行时 `setLevel`，需要扩展 `services/error.ts`:

```typescript
// services/error.ts 中添加:
const LOG_LEVEL_PRIORITY: Record<string, number> = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
}

let currentLevel = 'warn'

export function setLogLevel(level: string): void {
  currentLevel = level
}

function shouldLog(level: string): boolean {
  return (LOG_LEVEL_PRIORITY[level] ?? 0) <= (LOG_LEVEL_PRIORITY[currentLevel] ?? 2)
}
```

#### 3.9.2 Feature Flags 开关

**当前 `DEFAULT_FEATURE_FLAGS`** (定义在 `stores/settings.ts`):

| Flag ID | 名称 | 说明 | 默认值 |
|---------|------|------|--------|
| `markdown-hints` | Markdown 语法提示 | 在编辑器中显示轻量 Markdown 结构提示 | enabled |
| `multi-tab` | 多标签编辑 | 允许在工作台中同时保留多个文章标签页 | enabled |
| `ai-autocomplete` | AI 自动补全 | 预留 AI 补全能力开关，供后续联调启用 | disabled |
| `performance-metrics` | 性能指标面板 | 在界面中显示更详细的渲染与同步指标 | disabled |

**UI 实装** (已在 `#advanced-flags` 卡片中实现):

每个 flag 显示为一行:

```
[Toggle] Markdown 语法提示                 [实验性]
         在编辑器中显示轻量 Markdown 结构提示。
```

```html
<div class="flag-list">
  <label
    v-for="flag in settingsStore.settings.advanced.featureFlags"
    :key="flag.id"
    class="flag-item"
  >
    <div>
      <strong>{{ flag.name }}</strong>
      <span v-if="flag.experimental" class="status-pill status-pill--info">
        实验性
      </span>
      <p>{{ flag.description }}</p>
    </div>
    <input v-model="flag.enabled" type="checkbox" />
  </label>
</div>
```

**需补全的行为绑定**: 各组件需要在运行时读取 feature flag 状态来决定是否启用对应功能:

```typescript
// composables/useFeatureFlag.ts
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export function useFeatureFlag(flagId: string): { enabled: ComputedRef<boolean> } {
  const settingsStore = useSettingsStore()
  const enabled = computed(() => {
    const flag = settingsStore.settings.advanced.featureFlags.find(f => f.id === flagId)
    return flag?.enabled ?? false
  })
  return { enabled }
}

// 使用示例 (EditorPanel.vue):
const { enabled: markdownHintsEnabled } = useFeatureFlag('markdown-hints')
// 根据 markdownHintsEnabled 决定是否注册 MarkdownHints 扩展
```

#### 3.9.3 代理设置表单

**当前 `ProxySchema`** (定义在 `stores/settings.ts`):

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | false | 代理总开关 |
| `host` | string | '' | 代理主机地址 |
| `port` | number (1-65535) | 7890 | 代理端口 |
| `username` | string | '' | 认证用户名（可选） |
| `password` | string | '' | 认证密码（可选） |
| `protocol` | 'http' \| 'https' \| 'socks5' | 'http' | 代理协议 |

**UI 实装** (已在 `#advanced-proxy` 卡片中实现):

```
[Toggle] 启用代理

协议: [http    v]
地址: [127.0.0.1_____________]
端口: [7890____]
用户名: [________________]
密码: [________________] [Eye/EyeOff]
```

```html
<div class="field-grid">
  <label class="field">
    <span>启用代理</span>
    <input v-model="settingsStore.settings.advanced.proxy.enabled" type="checkbox" />
  </label>
  <label class="field">
    <span>协议</span>
    <select v-model="settingsStore.settings.advanced.proxy.protocol">
      <option value="http">HTTP</option>
      <option value="https">HTTPS</option>
      <option value="socks5">SOCKS5</option>
    </select>
  </label>
  <label class="field">
    <span>主机</span>
    <input
      v-model="settingsStore.settings.advanced.proxy.host"
      type="text"
      placeholder="127.0.0.1"
    />
  </label>
  <label class="field">
    <span>端口</span>
    <input
      v-model.number="settingsStore.settings.advanced.proxy.port"
      type="number"
      min="1"
      max="65535"
    />
  </label>
  <label class="field">
    <span>用户名</span>
    <input v-model="settingsStore.settings.advanced.proxy.username" type="text" />
  </label>
  <label class="field">
    <span>密码</span>
    <div class="secret-field">
      <input
        v-model="settingsStore.settings.advanced.proxy.password"
        :type="revealProxyPassword ? 'text' : 'password'"
      />
      <button class="ghost-btn" type="button" @click="revealProxyPassword = !revealProxyPassword">
        <Eye v-if="!revealProxyPassword" :size="14" />
        <EyeOff v-else :size="14" />
      </button>
    </div>
  </label>
</div>
```

**需补全的行为绑定**: 代理设置变更后需要影响所有出站 HTTP 请求（AI API 调用、同步请求等）。在 Tauri 环境下通过 Tauri 的 HTTP 代理 API 生效；在浏览器环境下需要通过 `fetch` 的 proxy 中间件传递。

```typescript
// services/http-proxy.ts (新增)
import { useSettingsStore } from '@/stores/settings'

export function getProxyConfig(): { enabled: boolean; url: string } | null {
  const settingsStore = useSettingsStore()
  const proxy = settingsStore.settings.advanced.proxy

  if (!proxy.enabled || !proxy.host) return null

  const auth = proxy.username
    ? `${proxy.username}:${proxy.password}@`
    : ''

  return {
    enabled: true,
    url: `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`,
  }
}
```

#### 3.9.4 缓存管理

**新增 setting-card**: `#advanced-cache`

**UI 布局**:

```
+--------------------------------------------------------------------+
| 缓存管理                                                            |
| 管理浏览器 Cache API 存储和内存中的预览缓存。                        |
+--------------------------------------------------------------------+
|                                                                    |
|  浏览器缓存     [12.3 MB]     [清除渲染缓存]                       |
|  预览缓存       [活跃]        [清除预览缓存]                       |
|  Service Worker [未注册]                                           |
|                                                                    |
+--------------------------------------------------------------------+
```

**实现逻辑**:

```typescript
const cacheSize = ref<string>('计算中...')
const previewCacheActive = ref(false)
const swRegistered = ref(false)

async function refreshCacheStats(): Promise<void> {
  // 浏览器 Cache API 大小估算
  if ('caches' in window) {
    const keys = await caches.keys()
    let totalBytes = 0
    for (const key of keys) {
      const cache = await caches.open(key)
      const requests = await cache.keys()
      for (const request of requests) {
        const response = await cache.match(request)
        if (response) {
          const blob = await response.blob()
          totalBytes += blob.size
        }
      }
    }
    cacheSize.value = formatBytes(totalBytes)
  } else {
    cacheSize.value = '不可用'
  }

  // Service Worker 状态
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    swRegistered.value = !!registration
  }
}

async function clearRenderCache(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
  }
  await refreshCacheStats()
  setNotice('success', '渲染缓存已清除')
}

function clearPreviewCache(): void {
  // 通知 WorkstationView / PreviewPanel 清除内存中的已渲染 HTML
  // 通过 eventBus 或 Pinia action
  window.dispatchEvent(new CustomEvent('inkforge:clear-preview-cache'))
  previewCacheActive.value = false
  setNotice('success', '预览缓存已清除')
}
```

**模板**:

```html
<section id="advanced-cache" class="setting-card">
  <header class="card-header">
    <div>
      <h2 class="card-title">缓存管理</h2>
      <p class="card-subtitle">管理浏览器 Cache API 存储和内存预览缓存。</p>
    </div>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-card__label">浏览器缓存</span>
      <strong>{{ cacheSize }}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">预览缓存</span>
      <strong>{{ previewCacheActive ? '活跃' : '空闲' }}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">Service Worker</span>
      <strong>{{ swRegistered ? '已注册' : '未注册' }}</strong>
    </div>
  </div>

  <div class="button-row">
    <button class="secondary-btn" type="button" @click="clearRenderCache">
      <Trash2 :size="14" />
      <span>清除渲染缓存</span>
    </button>
    <button class="secondary-btn" type="button" @click="clearPreviewCache">
      <Trash2 :size="14" />
      <span>清除预览缓存</span>
    </button>
  </div>
</section>
```

#### 3.9.5 开发者工具

**新增 setting-card**: `#advanced-devtools`

**UI 布局**:

```
+--------------------------------------------------------------------+
| 开发者工具                                       [导出调试信息]     |
| 查看运行时环境、数据库状态和编辑器内部状态。                        |
+--------------------------------------------------------------------+
|                                                                    |
|  Dexie 版本    [v5]          TipTap 状态    [idle]                 |
|  数据库记录    [1,234]       编辑器节点数   [42]                    |
|  浏览器存储    [45.2 MB]     IndexedDB 表   [11]                   |
|                                                                    |
+--------------------------------------------------------------------+
```

**实现逻辑**:

```typescript
import { db } from '@/utils/db'

const dexieVersion = computed(() => db.verno)
const editorNodeCount = ref(0)
const editorStatus = ref('idle')

function refreshEditorDevInfo(): void {
  // 如果编辑器实例可通过全局获取:
  const editorEl = document.querySelector('.ProseMirror')
  if (editorEl) {
    editorNodeCount.value = editorEl.querySelectorAll('*').length
    editorStatus.value = 'active'
  } else {
    editorNodeCount.value = 0
    editorStatus.value = 'idle'
  }
}

function exportDebugInfo(): void {
  const info = {
    version: APP_VERSION,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    settings: settingsStore.exportSettings(),
    databaseVersion: db.verno,
    databaseSize: databaseSize.value,
    syncStatus: syncStore.status,
    lastSyncAt: syncStore.lastSyncAt,
    pendingChanges: syncStore.pendingCount,
    featureFlags: settingsStore.settings.advanced.featureFlags.map(f => ({
      id: f.id, enabled: f.enabled,
    })),
    timestamp: new Date().toISOString(),
  }
  downloadTextFile(`inkforge-debug-${Date.now()}.json`, JSON.stringify(info, null, 2))
  setNotice('success', '调试信息已导出')
}
```

**模板**:

```html
<section id="advanced-devtools" class="setting-card">
  <header class="card-header">
    <div>
      <h2 class="card-title">开发者工具</h2>
      <p class="card-subtitle">查看运行时环境、数据库状态和编辑器内部状态。</p>
    </div>
    <button class="secondary-btn" type="button" @click="exportDebugInfo">
      <Download :size="14" />
      <span>导出调试信息</span>
    </button>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-card__label">Dexie 版本</span>
      <strong>v{{ dexieVersion }}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">数据库总记录</span>
      <strong>{{ databaseSize?.total ?? 0 }}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">TipTap 状态</span>
      <strong>{{ editorStatus }}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">编辑器节点数</span>
      <strong>{{ editorNodeCount }}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">IndexedDB 表</span>
      <strong>{{ DATABASE_TABLES.length }}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">浏览器存储</span>
      <strong>{{ storageUsageLabel }}</strong>
    </div>
  </div>
</section>
```

#### 3.9.6 性能监控

条件显示: 仅当 `performance-metrics` feature flag 启用时渲染。

**新增 setting-card**: `#advanced-performance`

```html
<section
  v-if="useFeatureFlag('performance-metrics').enabled.value"
  id="advanced-performance"
  class="setting-card"
>
  <header class="card-header">
    <div>
      <h2 class="card-title">性能监控</h2>
      <p class="card-subtitle">实时监控编辑器渲染性能和数据库 I/O 延迟。</p>
    </div>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-card__label">编辑器渲染 FPS</span>
      <strong>{{ renderFPS }}</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">自动保存延迟</span>
      <strong>{{ autoSaveLatency }}ms</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">IndexedDB 读写延迟</span>
      <strong>{{ idbLatency }}ms</strong>
    </div>
    <div class="stat-card">
      <span class="stat-card__label">内存使用</span>
      <strong>{{ memoryUsage }}</strong>
    </div>
  </div>
</section>
```

**性能指标采集逻辑**:

```typescript
const renderFPS = ref(60)
const autoSaveLatency = ref(0)
const idbLatency = ref(0)
const memoryUsage = ref('--')

let rafId: number | null = null
let lastFrameTime = performance.now()
let frameCount = 0

function startFPSMonitor(): void {
  function tick(): void {
    frameCount++
    const now = performance.now()
    if (now - lastFrameTime >= 1000) {
      renderFPS.value = frameCount
      frameCount = 0
      lastFrameTime = now
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function stopFPSMonitor(): void {
  if (rafId !== null) cancelAnimationFrame(rafId)
}

async function measureIDBLatency(): Promise<void> {
  const start = performance.now()
  await db.articles.count()
  idbLatency.value = Math.round(performance.now() - start)
}

function updateMemoryUsage(): void {
  const perf = performance as Performance & { memory?: { usedJSHeapSize: number } }
  if (perf.memory) {
    memoryUsage.value = formatBytes(perf.memory.usedJSHeapSize)
  }
}
```

### 3.10 关于 Tab (about)

**已完成**。确保显示:
- 版本号: 0.1.0
- 设计语言: Ethereal Constructivism
- 技术栈列表
- 开源协议 (如有)

## 四、通用 UI 模式

### 4.1 设置项组件

每个设置项使用统一的布局:
```
[图标] 设置名称                 [控件]
       设置描述文本
```

### 4.2 Section 分隔

使用细线 + 标题分隔不同的设置组:
```html
<div class="settings-section">
  <h3 class="settings-section-title">组标题</h3>
  <div class="settings-section-content">
    <!-- 设置项 -->
  </div>
</div>
```

### 4.3 重置按钮

每个 Tab 底部提供"重置此分类"按钮:
```html
<button @click="resetCategory('editor')" class="...">
  <RefreshCw :size="14" />重置编辑器设置
</button>
```

实现:
```typescript
function resetCategory(category: keyof Settings): void {
  const defaults = getDefaultSettings()
  settingsStore.settings[category] = defaults[category]
  settingsStore.save()
}
```

## 五、文件清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | views/SettingsView.vue | 补全所有 Tab 的实装，快捷键分组显示 + 搜索过滤 |
| 新增 | components/settings/ShortcutInput.vue | 快捷键录入组件（可选独立组件） |
| 新增 | components/settings/ColorPicker.vue | 自定义颜色选择器 |
| 修改 | stores/settings.ts | 扩充 Schema（editorWidth, editorMode），扩展 DEFAULT_SHORTCUTS 至 33 项 |
| 新增 | composables/useFeatureFlag.ts | Feature Flag 状态读取 composable |
| 新增 | services/http-proxy.ts | 代理配置读取服务 |
| 修改 | services/error.ts | 添加运行时日志级别切换 setLogLevel |
| 修改 | components/editor/EditorPanel.vue | 消费 editorWidth / editorMode 设置 |
| 修改 | views/WorkstationView.vue | 根据 editorMode 切换 typora/split 布局 |

## 六、验收标准

### Tab 完整性
- [ ] 所有 10 个 Tab 都有完整 UI 和功能
- [ ] 各 Tab 的所有设置控件均绑定到 Pinia state
- [ ] 所有设置持久化到 localStorage
- [ ] 导入/导出 JSON 功能正常

### Shortcuts Tab
- [ ] 快捷键 Tab 显示 33 个快捷键动作，分为 5 组（格式化 8 / 标题 5 / 块级 7 / 编辑 6 / 视图 7）
- [ ] 每组使用独立的 setting-card 显示
- [ ] 搜索过滤可按标签/描述/ID 过滤快捷键
- [ ] 快捷键录入支持按键组合监听
- [ ] 冲突检测在绑定重复组合键时显示冲突提示
- [ ] 单项重置和全部重置功能正常
- [ ] DEFAULT_SHORTCUTS 包含所有 33 个默认绑定

### Editor Tab
- [ ] 编辑模式选择器（Typora / 源码+预览）正确绑定
- [ ] 编辑器宽度选择器（narrow / medium / wide / full）正确绑定
- [ ] EditorPanel.vue 消费 editorWidth 设置并应用 max-width
- [ ] WorkstationView.vue 根据 editorMode 切换布局

### Advanced Tab
- [ ] 日志级别选择变更后驱动 logger 实例更新过滤级别
- [ ] Feature Flags 开关变更后实时影响对应功能的启用状态
- [ ] 代理设置表单完整（协议/地址/端口/用户名/密码）
- [ ] 密码字段支持 Eye/EyeOff 切换显示
- [ ] 缓存管理卡片显示浏览器缓存大小、预览缓存状态、Service Worker 状态
- [ ] 清除渲染缓存 / 清除预览缓存按钮功能正常
- [ ] 开发者工具卡片显示 Dexie 版本、数据库总记录数、TipTap 状态、IndexedDB 表数
- [ ] 导出调试信息按钮可下载完整的调试 JSON（含 settings、DB 状态、sync 状态）
- [ ] 性能监控卡片在 performance-metrics flag 启用时显示 FPS / 保存延迟 / IDB 延迟 / 内存

### 通用
- [ ] 外观设置实时生效（无需刷新）
- [ ] 编辑器设置实时同步到 TipTap
- [ ] 数据 Tab 的导入/导出/重置功能正常
- [ ] 同步 Tab 显示同步状态和日志
- [ ] 无 Emoji
- [ ] 无 TS 错误
