# 49-SPEC | Editor Keymap 规范

> **文档层级**: Spec（技术规范）
> **适用任务**: 并入 T01（Typora 编辑器） + T03（键盘快捷键）
> **依赖 Spec**: `01-spec-editor-typora.md`、`03-spec-keybindings.md`（批次 C）、`22-command-palette-spec.md`（批次 D）、`50-smart-punctuation-spec.md`
> **创建日期**: 2026-04-20
> **对应 Roadmap §3 新增 Spec 小增强**: `#49 列表 Enter=减少缩进` / `#50 多光标 Ctrl+D` / `#52 撤销逻辑分组`
> **目标读者**: T01 / T03 Implement Agent

---

## 目录

- 第 1 章 列表 Enter = 减少缩进（Notion 风格，E-01=B）
- 第 2 章 Tab 键上下文感知
- 第 3 章 撤销逻辑分组（E-10=B）
- 第 4 章 多光标 Ctrl+D（E-06=B）
- 第 5 章 自定义 TipTap Keymap 扩展实现
- 第 6 章 与 33 快捷键映射表一致性
- 第 7 章 验收矩阵
- 第 8 章 权威来源登记表

---

# 第 1 章 列表 Enter = 减少缩进（Notion 风格，E-01=B）

## 1.1 决策依据

- **E-01=B**（Notion / Bear 风格）
- **Roadmap §2.1 要点 19**: 列表 Enter = 减少缩进
- **决策 A-06**: Typora / iA Writer 纯 A 档位，但在键位层吸收 Notion 的列表哲学，降低深度写作者嵌套操作成本

## 1.2 行为矩阵

| 当前状态 | Enter 行为 | 说明 |
|---------|-----------|------|
| 列表项非空 | 新建同级列表项 | 与 Typora 一致 |
| 列表项为空（非嵌套） | 退出列表，回到普通段落 | 与 Typora 一致 |
| 列表项为空（嵌套） | **减少一级缩进**（从 N 级回到 N-1 级） | **Notion 风格，本条是关键差异** |
| 顶层空列表项 | 退出列表 | 覆盖 E-01=B 的边界情况 |

## 1.3 交互样例

### 1.3.1 示例一：三级嵌套减缩

```
开始状态：
- A
  - B
    - C
      - （空，光标在此）

按 Enter：
- A
  - B
    - C
    - （空，回到上一级，光标在此）

再按 Enter：
- A
  - B
    - C
  - （再回一级）

再按 Enter：
- A
  - B
    - C
- （再回一级）

再按 Enter：
- A
  - B
    - C

（完全退出列表，光标在普通段落）
```

### 1.3.2 示例二：任务列表同样适用

```
- [ ] 任务 A
  - [ ] 子任务 B
    - [ ] （空）←按 Enter

→

- [ ] 任务 A
  - [ ] 子任务 B
  - [ ] （空） ←光标
```

### 1.3.3 示例三：有序列表

```
1. A
   1. B
      1. （空） ←按 Enter

→

1. A
   1. B
   2. （空） ←光标；自动续号
```

## 1.4 实现

**位置**: `src/editor/keymaps/list-keymap.ts`

```ts
import { Extension } from '@tiptap/core'
import type { KeyboardShortcutCommand } from '@tiptap/core'

export const ListNotionKeymap = Extension.create({
  name: 'listNotionKeymap',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }): boolean => {
        const { selection, schema } = editor.state
        const { $from, empty } = selection

        if (!empty) return false // 有选区时交给默认处理

        // 查找是否在 listItem 内
        const listItem = findParentOfType($from, [
          schema.nodes.listItem,
          schema.nodes.taskItem
        ])
        if (!listItem) return false

        // 检查当前 listItem 是否为空
        const isEmpty = listItem.node.textContent.trim() === ''

        if (!isEmpty) {
          return false // 非空 → 默认新建同级项
        }

        // 空 listItem：减少一级缩进（liftListItem）
        const listItemType = listItem.node.type
        const canLift = editor.can().chain().liftListItem(listItemType.name).run()

        if (canLift) {
          // 执行 lift
          editor.chain().liftListItem(listItemType.name).run()

          // 分组：模式切换 / 列表减缩视为独立 undo 组
          markUndoGroup(editor, 'list-lift')

          return true
        }

        // 顶层空项 → 退出列表
        editor.chain().liftListItem(listItemType.name).focus().run()
        return true
      },

      'Shift-Enter': ({ editor }): boolean => {
        // 软换行（单个 listItem 内换行）
        editor.chain().insertContent('<br>').run()
        return true
      }
    }
  }
})
```

## 1.5 与 Typora 默认行为对比

| 场景 | Typora 默认 | InkForge v2.1 (E-01=B) |
|------|------------|------------------------|
| 空嵌套列表项按 Enter | 直接退出整个列表 | 减少一级缩进 |
| 空顶层列表项按 Enter | 退出列表 | 退出列表（相同） |

**理由**: Typora 退出过于激进，深度写作者反复嵌套时需要多次 Tab 重建；Notion 风格允许逐级"弹出"，更符合思维梳理的自然节奏。

## 1.6 Settings 开关

提供 Settings 项允许回退到 Typora 默认：

```ts
// src/stores/settings.ts
editor.listEnterBehavior: 'notion' | 'typora' // 默认 'notion'
```

---

# 第 2 章 Tab 键上下文感知

## 2.1 决策依据

- **T03-07=C**（Tab 键上下文感知）
- **E-01 补充**（列表缩进）
- **Roadmap §2.3 要点 5**（Tab 键上下文感知：列表 / 代码块 / 焦点切换）

## 2.2 行为矩阵

| 当前上下文 | Tab | Shift+Tab |
|-----------|-----|-----------|
| 列表项（非空 / 空） | 增加一级缩进（sinkListItem） | 减少一级缩进（liftListItem） |
| 代码块内 | 插入 4 个空格（或 1 个 Tab 字符，按 Settings） | 删除行首 4 空格 / 1 Tab |
| 表格单元格 | 移动到下一格（跨行）；最后格则新增一列 | 移动到上一格 |
| 重块元素编辑态（公式 / Mermaid / 图片） | 按各自规则（§1.3.1 ~ §1.3.5 in Spec 01） | 同上 |
| 普通段落 / 选中文本 | **焦点切换**（系统默认，交给浏览器/Tauri） | 反向焦点切换 |
| 行首段落（无选区） | **焦点切换**（不插入 Tab） | 反向焦点切换 |

## 2.3 实现

**位置**: `src/editor/keymaps/tab-context.ts`

```ts
export const TabContextKeymap = Extension.create({
  name: 'tabContextKeymap',

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }): boolean => {
        const ctx = detectContext(editor)
        switch (ctx) {
          case 'list':
            return editor.chain().sinkListItem('listItem').run() ||
                   editor.chain().sinkListItem('taskItem').run()
          case 'codeBlock':
            const indent = editor.storage.settings?.codeBlockIndent || '    '
            editor.chain().insertContent(indent).run()
            return true
          case 'table':
            return editor.chain().goToNextCell().run() ||
                   editor.chain().addColumnAfter().goToNextCell().run()
          case 'mathBlock':
          case 'mermaidBlock':
          case 'image':
            return handleHeavyBlockTab(editor, ctx)
          case 'paragraph':
          default:
            return false // 焦点切换交给默认
        }
      },

      'Shift-Tab': ({ editor }): boolean => {
        const ctx = detectContext(editor)
        switch (ctx) {
          case 'list':
            return editor.chain().liftListItem('listItem').run() ||
                   editor.chain().liftListItem('taskItem').run()
          case 'codeBlock':
            return removeLeadingIndent(editor)
          case 'table':
            return editor.chain().goToPreviousCell().run()
          default:
            return false
        }
      }
    }
  }
})

function detectContext(editor: Editor): 'list' | 'codeBlock' | 'table' | 'mathBlock' | 'mermaidBlock' | 'image' | 'paragraph' {
  const { $from } = editor.state.selection
  for (let d = $from.depth; d > 0; d--) {
    const nodeType = $from.node(d).type.name
    if (['listItem', 'taskItem'].includes(nodeType)) return 'list'
    if (nodeType === 'codeBlock') return 'codeBlock'
    if (['tableCell', 'tableHeader'].includes(nodeType)) return 'table'
    if (nodeType === 'mathBlock') return 'mathBlock'
    if (nodeType === 'mermaidBlock') return 'mermaidBlock'
  }
  // 检查是否在图片 NodeView 内
  const selectedNode = editor.state.selection.$from.parent
  if (selectedNode.type.name === 'image') return 'image'
  return 'paragraph'
}
```

## 2.4 与 Source 模式的区别

Source 模式（vue-codemirror）使用 CM6 自带的 Tab 行为：

- 文本模式下 Tab = 插入 Tab 字符（或按 indentUnit）
- 代码块语法检测到 fenced code block 时同 CodeMirror 默认
- Source 模式下不做"焦点切换"行为，因为 CM6 不是传统 textarea

---

# 第 3 章 撤销逻辑分组（E-10=B）

## 3.1 决策依据

- **E-10=B**（撤销按逻辑操作分组）
- **Spec 01 §10** 已描述 CheckpointHistory 与模式切换检查点
- 本章补充"逻辑分组"的具体分组规则

## 3.2 分组规则

| 操作类型 | 分组策略 | 示例 |
|---------|---------|------|
| 文本输入（连续字母） | 同组合并 | 输入 "hello" = 1 组 |
| 文本输入（遇空格） | 分组 | 输入 "hello " = 2 组（hello / 空格） |
| 文本输入（遇标点） | 分组 | 输入 "hello." = 2 组 |
| 文本输入（遇换行） | 分组 | Enter 独立为 1 组 |
| Backspace / Delete（连续） | 同组合并 | 连续删除 10 字符 = 1 组 |
| 粘贴 | 独立 1 组 | Ctrl+V 为独立 undo 项 |
| 剪切 | 独立 1 组 | Ctrl+X 为独立 undo 项 |
| 格式化（加粗 / 斜体 / 高亮） | 独立 1 组 | 每次 Ctrl+B 为独立 undo 项 |
| 块级转换（标题 / 引用） | 独立 1 组 | 段落 → 标题为独立 undo 项 |
| 列表操作（sinkListItem / liftListItem / Enter） | 独立 1 组 | 每次 Tab / Shift+Tab / 空项 Enter 为独立 undo 项 |
| 模式切换（Ctrl+\） | 检查点（跨组） | 模式切换本身不是 undo 项，但标记 Checkpoint |
| AI / 自动化写操作 | 独立 1 组 + 版本点 | 受 R-18 约束，同时 createAutoCheckpoint |

## 3.3 实现

见 Spec 01 §10 `CheckpointHistory`；本章补充分组判定函数：

```ts
// src/editor/extensions/CheckpointHistory.ts（补充）

function inferLogicalGroup(tr: Transaction, prevTr?: Transaction): string {
  // 1. Transaction meta 显式标记优先
  const explicitGroup = tr.getMeta('undoGroup')
  if (explicitGroup) return explicitGroup

  // 2. 按 step 类型推断
  const steps = tr.steps
  if (steps.length === 0) return 'noop'

  // 分析 step 类型
  const stepTypes = steps.map(s => s.constructor.name)

  if (stepTypes.every(t => t === 'ReplaceStep')) {
    // 文本 / 删除 / 插入
    const inserted = getInsertedText(tr)
    if (inserted.length > 0) {
      if (/[\s\p{P}\n]/u.test(inserted)) return 'text-input-boundary'
      return 'text-input'
    }
    if (getDeletedLength(tr) > 0) return 'delete'
  }

  if (stepTypes.includes('AddMarkStep') || stepTypes.includes('RemoveMarkStep')) {
    return 'format'
  }

  if (tr.getMeta('paste')) return 'paste'
  if (tr.getMeta('cut')) return 'cut'
  if (tr.getMeta('slash-command')) return 'slash-command'
  if (tr.getMeta('ai-write')) return 'ai-write'
  if (tr.getMeta('list-lift') || tr.getMeta('list-sink')) return 'list-op'

  return 'other'
}

function shouldMergeWithPrevious(prevGroup: string, currentGroup: string): boolean {
  if (prevGroup === currentGroup) {
    // 同组合并：仅 text-input 和 delete 两类
    return ['text-input', 'delete'].includes(currentGroup)
  }
  return false
}
```

## 3.4 组边界符号

以下字符插入后强制分组（即使 logicalGroup 相同）：

- 空格
- 所有 Unicode 标点（`\p{P}`）
- 换行符
- Tab

## 3.5 newGroupDelay

TipTap 原生 History 的 `newGroupDelay`（默认 500ms）被**覆盖为 Infinity**，禁用时间分组，纯按逻辑分组：

```ts
History.configure({
  newGroupDelay: Infinity
})
```

## 3.6 性能考量

- 分组判定必须在 Transaction apply 同步路径中完成，延迟 ≤ 1ms
- 历史栈深度 500（可配）；超出后最旧的项丢弃
- 大文档 transaction（如导入一篇 10 万字）独立成组，避免合并其他操作

---

# 第 4 章 多光标 Ctrl+D（E-06=B）

## 4.1 决策依据

- **E-06=B**（Ctrl+D 选中下一个相同词）
- 用户补充："克制的增强"，仅做 Ctrl+D；**不做 Alt+Click 和列选择**

## 4.2 行为定义

| 操作 | 行为 |
|------|------|
| 无选区 + 光标在词内 + Ctrl+D | 选中光标所在的整词（基于 Unicode word boundary） |
| 有选区（单光标） + Ctrl+D | 向下查找下一个匹配（区分大小写、全词匹配）并 *添加* 为多光标选区 |
| 有多光标选区 + Ctrl+D | 继续添加下一个匹配（不替换） |
| Ctrl+U | 移除最后一个添加的匹配（撤销多光标） |
| Ctrl+Shift+L | 选中所有匹配（一次性） |
| 多光标状态 + Esc | 退出多光标（保留主光标） |

## 4.3 实现

**位置**: `src/editor/extensions/MultiCursor.ts`

```ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection, Selection } from '@tiptap/pm/state'

// ProseMirror 原生不支持多光标；InkForge 采用"多范围选区"模拟
// 方案：自定义 Selection 类 MultiSelection

export class MultiSelection extends Selection {
  readonly ranges: { from: number; to: number }[]
  readonly primary: number // primary index

  // 实现 Selection 接口的所有必需方法...
}

export const MultiCursor = Extension.create({
  name: 'multiCursor',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('multiCursor'),
        props: {
          decorations: (state) => renderMultiCursorDecorations(state)
        }
      })
    ]
  },

  addKeyboardShortcuts() {
    return {
      'Mod-d': ({ editor }) => {
        const { selection } = editor.state

        if (selection.empty) {
          // 无选区 → 选中当前词
          const wordRange = expandToWord(editor.state.doc, selection.$from)
          editor.commands.setTextSelection(wordRange)
          return true
        }

        // 查找下一个匹配
        const selectedText = getSelectedText(editor.state)
        const fromPos = getMaxEnd(selection) // 从当前选区的最后一个 range 末尾开始
        const nextMatch = findNextOccurrence(
          editor.state.doc,
          selectedText,
          fromPos,
          { caseSensitive: true, wholeWord: true }
        )

        if (nextMatch) {
          addCursorRange(editor, nextMatch)
          return true
        }

        // 未找到 → 从头开始
        const firstMatch = findNextOccurrence(
          editor.state.doc,
          selectedText,
          0,
          { caseSensitive: true, wholeWord: true }
        )
        if (firstMatch && !isAlreadySelected(selection, firstMatch)) {
          addCursorRange(editor, firstMatch)
          return true
        }

        return false
      },

      'Mod-u': ({ editor }) => removeLastCursor(editor),

      'Mod-Shift-l': ({ editor }) => {
        // 选中所有匹配
        const selectedText = getSelectedText(editor.state)
        const allMatches = findAllOccurrences(editor.state.doc, selectedText, {
          caseSensitive: true,
          wholeWord: true
        })
        setMultiSelection(editor, allMatches)
        return true
      },

      Escape: ({ editor }) => {
        const selection = editor.state.selection
        if (selection instanceof MultiSelection && selection.ranges.length > 1) {
          exitMultiCursor(editor)
          return true
        }
        return false
      }
    }
  }
})
```

## 4.4 视觉

- 每个多光标位置显示独立闪烁光标
- 所有选区使用主题高亮色（与单光标一致）
- StatusBar 显示 `多光标 3/5`（当前选中的数量 / 总匹配数）

## 4.5 与其他功能的交互

- **与 Typora cursor-aware 冲突处理**: 多光标时以"主光标"的位置决定 TyporaMode 的活动范围；其他光标范围不触发 cursor-aware
- **与 CheckpointHistory 交互**: 多光标状态下的输入视为一个 undo 组
- **与 FindReplace**: Ctrl+Shift+L 与 FindReplace 的"选中所有匹配"入口等价

## 4.6 性能约束

- 匹配查找必须异步（超过 1000 个匹配时显示进度）
- 超过 100 个光标时给出警告（性能降级）

---

# 第 5 章 自定义 TipTap Keymap 扩展实现

## 5.1 Keymap 扩展总览

```
src/editor/extensions/
├── MarkdownHints.ts        # Typora 视觉 decoration
├── CheckpointHistory.ts    # §3 Undo 检查点
├── MultiCursor.ts          # §4 多光标
├── IMEObserver.ts          # IME 事件观察
├── FocusHighlight.ts       # 专注模式段落高亮
└── keymaps/
    ├── index.ts            # 统一导出 + 注册顺序
    ├── list-keymap.ts      # §1 列表 Enter
    ├── tab-context.ts      # §2 Tab 上下文
    ├── paper-width.ts      # §16 纸张宽度
    └── shared.ts           # 共享键位（保存 / 切模式 / 查找）
```

## 5.2 注册顺序（优先级）

TipTap / ProseMirror 的键位扩展按注册顺序确定优先级；**先注册 = 优先级高**。

```ts
// src/editor/extensions/index.ts
export const INKFORGE_EXTENSIONS = [
  // 1. 核心键位（优先级最高）
  ListNotionKeymap,          // §1 列表 Enter
  TabContextKeymap,           // §2 Tab
  MultiCursor,                // §4 Ctrl+D
  PaperWidthKeymap,           // Ctrl+=

  // 2. 历史与状态
  CheckpointHistory,          // §3 Undo

  // 3. Typora 视觉
  MarkdownHints,              // cursor-aware
  FocusHighlight,

  // 4. 平台兼容
  IMEObserver,

  // 5. TipTap 官方扩展（基础标题 / 列表 / 粗体 等）
  ...StarterKit.configure({ history: false })  // 禁用原生 history，改用 CheckpointHistory
]
```

## 5.3 键位冲突策略

### 5.3.1 InkForge 内部冲突

- 同一键位多个扩展注册 → 先注册的胜出
- `ListNotionKeymap.Enter` > StarterKit ListItem 默认 Enter
- `MultiCursor.Mod-d` > TipTap 可能的默认

### 5.3.2 与 Tauri / OS 冲突

- Windows: `Ctrl+=` 可能被浏览器拦截（Web 开发态），Tauri 生产态通过 `preventDefault` 覆盖
- macOS: `Cmd+\` 可能系统级触发，Tauri 配置覆盖
- 冲突由 Spec 03 键盘快捷键中央仲裁器处理（见 Spec 03 §5 冲突检测）

### 5.3.3 IME 合成期

- IME `isComposing=true` 时所有快捷键 **except Ctrl+数字跳过** 正常响应（T03-08=B）
- 具体跳过键位见 Spec 03

## 5.4 Keymap 热更新

用户在 Settings 修改快捷键时：

1. `SettingsStore.shortcuts` 更新
2. `keymapManager.rebuild()` 重新生成 keymap
3. 编辑器 `editor.setOptions({ extensions: [...] })` 动态替换
4. StatusBar 显示"快捷键已更新"

详见 Spec 03 §3（快捷键热更新）。

## 5.5 声明式注册接口

为降低散落 `addKeyboardShortcuts` 的维护成本，InkForge 提供声明式注册：

```ts
// src/editor/keymaps/registry.ts
export interface KeymapDefinition {
  id: string                  // 唯一 id，用于 Settings 修改
  defaultKey: string          // 默认键位
  scope: 'editor' | 'global' | 'source' | 'typora-only'
  handler: (ctx: KeymapContext) => boolean
  description: string         // 用于帮助面板
  group?: string              // 分组（编辑 / 格式 / 视图 / ...）
}

export function registerKeymap(def: KeymapDefinition): void
```

所有本 Spec 定义的键位通过 `registerKeymap` 注册；SettingsMutex 保证热更新时的原子性。

---

# 第 6 章 与 33 快捷键映射表一致性

## 6.1 33 键位总览（来自 Spec 03）

Spec 03 定义了 v2.1 的 33 个全局 / 编辑器快捷键。本 Spec 实现的键位必须与之完全一致。

## 6.2 本 Spec 覆盖的键位（摘录）

| 快捷键 | 功能 | 本 Spec 章节 | Spec 03 表格 ID |
|--------|------|-------------|----------------|
| Enter | 列表 Enter = 减少缩进 | §1 | KB-ENTER |
| Shift+Enter | 列表内软换行 | §1 | KB-SHIFT-ENTER |
| Tab | 列表缩进 / 代码块缩进 / 表格跳格 / 焦点切换 | §2 | KB-TAB |
| Shift+Tab | Tab 反向 | §2 | KB-SHIFT-TAB |
| Ctrl+Z / Cmd+Z | Undo（逻辑分组） | §3 | KB-UNDO |
| Ctrl+Shift+Z / Cmd+Shift+Z | Redo | §3 | KB-REDO |
| Ctrl+D / Cmd+D | 多光标下一个 | §4 | KB-MULTI-DOWN |
| Ctrl+U / Cmd+U | 移除最后多光标 | §4 | KB-MULTI-UP |
| Ctrl+Shift+L / Cmd+Shift+L | 选中所有匹配 | §4 | KB-MULTI-ALL |
| Esc | 退出多光标 / 退出重块 / 退出专注 | §4 / Spec 01 §9 / Spec 21 | KB-ESC |
| Ctrl+= / Cmd+= | 纸张宽度循环 | Spec 01 §16 | KB-PAPER |
| Ctrl+Shift+= / Cmd+Shift+= | 纸张宽度反向 | Spec 01 §16 | KB-PAPER-REV |
| Ctrl+\ / Cmd+\ | 模式切换 Typora→Source→Preview | Spec 01 §7 | KB-MODE |
| Ctrl+Shift+\ / Cmd+Shift+\ | 模式切换反向 | Spec 01 §7 | KB-MODE-REV |
| Ctrl+V / Cmd+V | 粘贴（清洗） | Spec 01 §11 | KB-PASTE |
| Ctrl+Shift+V / Cmd+Shift+V | 粘贴（强制保留 HTML） | Spec 01 §11 | KB-PASTE-HTML |
| Ctrl+C / Cmd+C | 复制（多格式） | Spec 01 §13 | KB-COPY |
| Ctrl+X / Cmd+X | 剪切（多格式） | Spec 01 §13 | KB-CUT |
| Ctrl+S / Cmd+S | 保存（强制序列化） | Spec 01 §1.3 | KB-SAVE |

## 6.3 冲突检查脚本

`tests/keymap/conflicts.spec.ts` 必须：

1. 解析 Spec 03 的 33 键位表格
2. 解析本 Spec 实现的所有 `KeymapDefinition`
3. 交叉检查重复 / 缺失 / 不一致
4. CI 强制跑

## 6.4 快捷键帮助面板

Spec 03 定义的帮助面板需要展示本 Spec 实现的键位：

- 按 group 分组显示（编辑 / 格式 / 视图 / 选择 / 切换）
- 支持搜索（按键位字符 / 按功能名）
- 支持修改（SettingsStore.shortcuts 热更新）

---

# 第 7 章 验收矩阵

## 7.1 验收维度

- **键位正向**: 每个键位在正确上下文下执行预期操作
- **上下文切换**: Tab 在不同上下文的不同行为
- **边界**: 空列表 / 顶层列表 / 超大文档
- **冲突**: 与 IME / 与浏览器 / 与系统
- **性能**: 键位触发延迟 ≤ 16ms

## 7.2 用例矩阵（示例）

### 7.2.1 列表 Enter（§1）

| AC ID | 场景 | 前置 | 操作 | 预期 |
|-------|------|------|------|------|
| AC-LIST-ENTER-01 | 非空项新建同级 | `- A`（光标在 A 后） | Enter | 新建 `- ` 同级项 |
| AC-LIST-ENTER-02 | 空项退出列表（顶层） | `- `（空顶层项） | Enter | 变为普通段落 |
| AC-LIST-ENTER-03 | 空项减缩（嵌套） | 三级嵌套空项 | Enter | 回到二级 |
| AC-LIST-ENTER-04 | 任务列表同样适用 | `- [ ] `（空任务项） | Enter | 减一级 |
| AC-LIST-ENTER-05 | 有序列表自动续号 | `1. A` + `1. `（嵌套空项） | Enter | 回到上一级，续号为 `2.` |
| AC-LIST-ENTER-06 | Shift+Enter 软换行 | `- A`（光标在 A 后） | Shift+Enter | `- A<br>` 不分项 |

### 7.2.2 Tab 上下文（§2）

| AC ID | 场景 | 前置 | 操作 | 预期 |
|-------|------|------|------|------|
| AC-TAB-01 | 列表缩进 | `- A` | Tab | 变为 `  - A` |
| AC-TAB-02 | 代码块缩进 | 代码块 `const x = 1;` | Tab | 插入 4 空格 |
| AC-TAB-03 | 表格跳格 | 表格第一格 | Tab | 跳到第二格 |
| AC-TAB-04 | 表格末格新增列 | 表格最后格 | Tab | 新增列并跳入 |
| AC-TAB-05 | 段落焦点切换 | 普通段落 | Tab | 焦点跳到下一个可聚焦元素（工具栏按钮 / 侧栏） |
| AC-TAB-06 | Shift+Tab 列表减缩 | `  - A`（二级） | Shift+Tab | 变为 `- A` |
| AC-TAB-07 | Shift+Tab 代码块减缩 | 代码块首行 `    const x = 1;` | Shift+Tab | 删除 4 空格 |
| AC-TAB-08 | 重块元素编辑态 Tab | 图片编辑面板 | Tab | 在 alt/url/caption 间切换 |

### 7.2.3 Undo 逻辑分组（§3）

| AC ID | 场景 | 操作 | 预期 |
|-------|------|------|------|
| AC-UNDO-01 | 文本输入合并 | 输入 "hello" | 1 次 Undo 撤销全部 5 字符 |
| AC-UNDO-02 | 空格分组 | 输入 "hello world" | 3 次 Undo（world → 空格 → hello） |
| AC-UNDO-03 | 标点分组 | 输入 "hello." | 2 次 Undo（. → hello） |
| AC-UNDO-04 | 格式独立 | 选中 "hello" + Ctrl+B | 1 次 Undo 撤销加粗；文本还在 |
| AC-UNDO-05 | 粘贴独立 | 粘贴一段文字 | 1 次 Undo 撤销整段 |
| AC-UNDO-06 | 模式切换检查点 | Typora 输入 "a" → 切 Source → Source 输入 "b" → Ctrl+Z | 先撤销 Source 的 "b"；再 Ctrl+Z 切回 Typora 并撤销 "a" |
| AC-UNDO-07 | 时间分组禁用 | 输入 "a"，等 10s，输入 "b" | 仍合并为 "ab"（newGroupDelay=Infinity） |
| AC-UNDO-08 | 连续删除合并 | 连续按 Backspace 10 次 | 1 次 Undo 恢复 10 字符 |

### 7.2.4 多光标（§4）

| AC ID | 场景 | 前置 | 操作 | 预期 |
|-------|------|------|------|------|
| AC-MULTI-01 | 选中当前词 | 光标在 "hello" 内 | Ctrl+D | 选中 "hello" |
| AC-MULTI-02 | 添加下一个匹配 | 选中 "hello" | Ctrl+D | 添加下一个 "hello" 为多光标 |
| AC-MULTI-03 | 环绕查找 | 选中最后一个 "hello" | Ctrl+D | 从头开始添加第一个未选中的 "hello" |
| AC-MULTI-04 | 移除最后 | 多光标 3 个 "hello" | Ctrl+U | 移除最后添加的 |
| AC-MULTI-05 | 选中所有 | 光标在 "hello" 内 | Ctrl+D 然后 Ctrl+Shift+L | 选中所有匹配 |
| AC-MULTI-06 | Esc 退出 | 多光标 5 个 | Esc | 仅保留主光标 |
| AC-MULTI-07 | 多光标输入 | 多光标 3 个位置 | 输入 "X" | 三个位置同时插入 "X" |
| AC-MULTI-08 | 多光标格式 | 多光标 3 个词 | Ctrl+B | 三个词同时加粗 |
| AC-MULTI-09 | 全词匹配 | 选中 "test" | Ctrl+D | 不匹配 "testing"（全词） |

## 7.3 性能验收

| AC ID | 场景 | 门槛 |
|-------|------|------|
| AC-PERF-01 | Tab 上下文判定 | ≤ 1ms |
| AC-PERF-02 | Ctrl+D 单次查找 | ≤ 16ms（1 万字文档） |
| AC-PERF-03 | Ctrl+Shift+L 全匹配 | ≤ 100ms（1 万字文档 / 1000 匹配） |
| AC-PERF-04 | Undo 逻辑分组判定 | ≤ 1ms |
| AC-PERF-05 | 列表 Enter 减缩 | ≤ 16ms |

## 7.4 冲突矩阵

| 键位 | 冲突源 | 预期处理 |
|------|-------|---------|
| Ctrl+D | Windows 收藏（Web 开发态） | Tauri 生产：preventDefault；Web 开发：浏览器拦截（此时不影响生产） |
| Ctrl+= | 浏览器缩放 | 同上 |
| Tab | 浏览器焦点切换 | 编辑器内上下文感知；段落上下文下回退为焦点切换 |
| Enter | IME 候选确认 | IME 合成期不触发 Enter 键位 |

## 7.5 Artifacts

```
artifacts/T01-keymap/
├── acceptance-matrix.md
├── screenshots/
├── logs/
│   └── undo-grouping-trace.json
└── performance/
    └── keystroke-latency.json
```

---

# 第 8 章 权威来源登记表

| 章节 | 内容 | 权威来源 | 决策 ID |
|------|------|---------|---------|
| §1.1~§1.6 | 列表 Enter 减少缩进 | doc | E-01=B / Roadmap §2.1 要点 19 |
| §2.1~§2.4 | Tab 上下文感知 | doc | T03-07=C / E-01 补充 |
| §3.1~§3.6 | 撤销逻辑分组 | doc | E-10=B |
| §4.1~§4.6 | 多光标 Ctrl+D | doc | E-06=B |
| §5.1~§5.5 | Keymap 扩展实现 | hybrid（doc + code） | L1-27 D / R-12 |
| §6.1~§6.4 | 33 快捷键一致性 | doc | Spec 03 |
| §7.1~§7.5 | 验收矩阵 | doc | R-20 / X-12 D |

## 8.1 Spec 间契约

| 本 Spec 提供 | 消费方 |
|-------------|--------|
| `ListNotionKeymap` Enter 处理 | Spec 01 §3.3.6~3.3.8 列表元素 |
| `TabContextKeymap` | Spec 01 §9 重块元素 / Spec 16 表格 / Spec 01 §3.1.4 代码块 |
| `CheckpointHistory` 分组规则 | Spec 01 §10 |
| `MultiCursor` 选区模型 | Spec 01 §3（行内 mark 应用）/ Spec 05 FloatingToolbar |
| `KeymapDefinition` 注册接口 | Spec 03 键位总仲裁 / Spec 41 Settings 快捷键 Tab |

## 8.2 向后兼容

- 用户从 v2.0 升级：默认启用 `editor.listEnterBehavior = 'notion'`
- 提供"Typora 经典模式"切换以保留原行为（Settings 项）
- Undo 栈不跨版本迁移（每次打开重建）

---

# 附录 A | 禁止事项（反例）

- ❌ 使用 TipTap 默认 `history` 扩展（必须用 CheckpointHistory）
- ❌ 在 Tab 处理中忽略 IME 合成期状态
- ❌ 多光标实现为"多个独立 editor"（应使用 MultiSelection 单 editor 多 range）
- ❌ Ctrl+D 使用简单字符串匹配（必须全词匹配 + 区分大小写）
- ❌ 列表 Enter 处理绕过 `editor.chain().liftListItem()`（必须走 PM 官方 API）
- ❌ 在 `handleKeyDown` 中直接操作 DOM（应走 Transaction）

---

# 附录 B | 图标

| 功能 | 图标 |
|------|------|
| Undo | `lucide:rotate-ccw` |
| Redo | `lucide:rotate-cw` |
| 多光标 | `lucide:mouse-pointer-2` |
| 列表缩进 | `lucide:indent-increase` |
| 列表减缩 | `lucide:indent-decrease` |
| Tab 焦点 | `lucide:arrow-right-circle` |

---

（本 Spec 完）
