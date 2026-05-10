> 版本: v2.1.0-draft / 依赖: 10-markdown-authority-spec / 11-content-model-spec / 01-prd-editor / 状态: Draft / 关联决策: T01-01~T01-20, E-01~E-10, M-02~M-08, L1-05, L1-08, L1-10, L1-11, L1-13, L1-36, R-01/R-02/R-05/R-15
> 权威来源: 混合（最新日期决策文档 + 现有代码事实 + 0327 基线）
> 创建日期: 2026-04-21
> 铁律遵循: R-01, R-02, R-04, R-05, R-06, R-14, R-15, R-16, R-17

# 01 — Typora 模式编辑器 Spec（Technical Specification）

## 目录

- §1 架构总览
- §2 目录结构
- §3 核心类型 Schema（TypeScript）
- §4 TipTap Extension 清单
- §5 四模式状态机（Typora / Source / Preview / Export）
- §6 输入规则（Input Rules）
- §7 粘贴规则（Paste Rules）
- §8 ProseMirror 事务中间件
- §9 大文档分片策略
- §10 IME 兼容
- §11 无障碍
- §12 性能优化
- §13 单元测试与 E2E 用例清单
- §14 已知风险与降级路径
- §15 模块间契约
- §16 错误处理
- §17 安全与沙箱
- §18 序列化与反序列化
- §19 命令系统集成
- §20 测试矩阵
- §21 验收标准落地
- §22 调试与诊断

---

## §1 架构总览

### 1.1 核心设计原则

本 Spec 的所有实现决策围绕以下三条原则：

1. **Markdown 是唯一表达权威**（R-01）。TipTap JSON 是运行时态，Markdown 字符串是持久化与跨模块传递的真值源。
2. **Cursor-aware 是 Typora 模式的本质**（T01-01 A）。光标所在块/mark 暴露源码，离开隐藏。
3. **状态全继承是模式切换的硬契约**（L1-11 C + 补充）。选区、撤销栈、滚动、折叠、评论锚点跨模式连续。

### 1.2 架构层次图

```
┌───────────────────────────────────────────────────────────────┐
│                        User Interaction                        │
│  键盘 / 鼠标 / 触控板 / 粘贴 / 拖放 / IME / 语音              │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                  Editor Mode Layer（模式路由器）                │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ Typora   │  │ Source     │  │ Preview    │                 │
│  │ (TipTap) │  │ (CodeMirror│  │ (readonly) │                 │
│  └──────────┘  └────────────┘  └────────────┘                 │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                   Content Authority Layer                      │
│  ┌───────────────┐      ┌─────────────────────────┐          │
│  │ Markdown      │◀────▶│ ProseMirror JSON        │          │
│  │ (Source of    │      │ (Runtime State)         │          │
│  │  Truth)       │      │                         │          │
│  └───────────────┘      └─────────────────────────┘          │
│            │                          │                       │
│            ▼                          ▼                       │
│  ┌───────────────┐      ┌─────────────────────────┐          │
│  │ HTML Cache    │      │ DecorationSet           │          │
│  │ (Runtime      │      │ (Cursor-aware Marks)    │          │
│  │  Persistence) │      │                         │          │
│  └───────────────┘      └─────────────────────────┘          │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                     Persistence Layer                          │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ IndexedDB       │  │ localStorage │  │ Version     │      │
│  │ (primary)       │  │ (emergency)  │  │ Bundle      │      │
│  └─────────────────┘  └──────────────┘  └─────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

### 1.3 技术栈锁定

- **编辑器内核**：TipTap 2.2+ / ProseMirror 1.19+
- **Source 模式**：vue-codemirror 6.1+ / @codemirror/lang-markdown 6.2+（T01-06 A）
- **Markdown 解析/序列化**：自研 md-serializer（基于 remark + 自定义 visitor）
- **数学**：KaTeX 0.16+
- **图表**：Mermaid 10+
- **代码高亮**：Shiki 1.0+（按需加载语言包，G-04 C）
- **持久化**：Dexie 4.0+（IndexedDB 封装）
- **状态管理**：Pinia 2.1+
- **UI 框架**：Vue 3.4+ + Tailwind 3.4+ + radix-vue 1.4+
- **图标**：lucide-vue-next 0.356+
- **Schema 校验**：Zod 3.22+
- **国际化**：vue-i18n 9.9+

**禁止新增**：任何未在上述列表中的编辑器/解析/渲染库。

### 1.4 模块边界

| 模块 | 职责 | 本 Spec 范围 |
|---|---|---|
| Editor Core | TipTap 实例、模式路由、选区/光标 | ✅ 本 Spec |
| Extensions | TipTap extensions（cursor-aware、键盘、输入规则等） | ✅ 本 Spec |
| Source Mode | vue-codemirror 封装、Markdown 高亮 | ✅ 本 Spec |
| Preview Mode | readonly 渲染、滚动同步 | 部分（架构在本 Spec，渲染在 04） |
| Markdown Authority | 双层权威、HTML 缓存 | 10-markdown-authority-spec |
| Rendering Engine | Markdown → HTML、KaTeX、Mermaid、Shiki | 04-rendering-engine-spec |
| Version / Sync | 快照、同步、冲突 | 31 / 23 |
| Search | 全文索引 | 29 |
| Export | 导出到微信/HTML/MD 等 | 15 |

### 1.5 数据流

```
用户输入
   │
   ▼
TipTap Command 触发
   │
   ▼
ProseMirror Transaction 提交
   │
   ├──► Decoration 更新（cursor-aware 重新计算）
   ├──► History 记录
   ├──► ActivityLogger（审计）
   │
   ▼
Transaction Apply → new EditorState
   │
   ▼
View 重新渲染
   │
   ▼
（防抖 1s）
   │
   ▼
Serialize: JSON → Markdown
   │
   ├──► Markdown 写入 article.markdownSource
   ├──► Render: Markdown → HTML → article.htmlCache
   ├──► Hash: sha256(markdown) → article.sourceHash
   │
   ▼
IndexedDB 事务提交
   │
   ▼
Pinia Store 同步（触发 Hub、TabBar 等订阅方更新）
   │
   ▼
ActivityLogger 记录 "article.saved"
```

---

## §2 目录结构

```
src/
├── editor/
│   ├── core/
│   │   ├── index.ts                     # Editor 初始化入口
│   │   ├── EditorCore.vue               # Typora / Source / Preview 路由容器
│   │   ├── EditorContext.ts             # 全局上下文（模式、配置、事件总线）
│   │   ├── EditorState.ts               # 状态序列化/反序列化（跨模式继承）
│   │   ├── modeRouter.ts                # 模式切换逻辑
│   │   └── history.ts                   # 自定义 history（模式检查点）
│   │
│   ├── extensions/
│   │   ├── core/
│   │   │   ├── TyporaMode.ts            # cursor-aware 主扩展（增强 MarkdownHints）
│   │   │   ├── MarkdownHints.ts         # 现有扩展改造（加 cursorAware 模式）
│   │   │   ├── SmartPunctuation.ts      # 智能标点（详见 50-spec）
│   │   │   ├── KeyboardShortcuts.ts     # 完整 keymap（详见 49-spec）
│   │   │   ├── SlashCommands.ts         # 斜杠命令
│   │   │   ├── FloatingToolbar.ts       # 选区浮动工具栏
│   │   │   ├── BlockDragHandle.ts       # 块级拖拽（详见 51-spec）
│   │   │   ├── SourceModeBridge.ts      # Typora↔Source 状态桥
│   │   │   └── PasteCleanser.ts         # 粘贴清洗
│   │   │
│   │   ├── nodes/
│   │   │   ├── HeadingView.ts           # H1~H6 NodeView
│   │   │   ├── BlockquoteView.ts
│   │   │   ├── CodeBlockLowlight.ts     # Shiki 高亮 + 复制 + 行号
│   │   │   ├── TableAdvanced.ts         # 双向 pipe（详见 53-spec）
│   │   │   ├── TaskListView.ts
│   │   │   ├── ImageView.ts             # 图片（详见 52-spec）
│   │   │   ├── MathInlineView.ts        # 行内公式
│   │   │   ├── MathBlockView.ts         # 块级公式
│   │   │   ├── MermaidView.ts           # 不做 inline cursor-aware
│   │   │   ├── FootnoteView.ts          # 脚注（M-02 D）
│   │   │   ├── DetailsView.ts           # 折叠块（M-05 D）
│   │   │   ├── TocMacroView.ts          # [toc] 宏
│   │   │   ├── FrontmatterView.ts       # YAML 头
│   │   │   ├── WikiLinkView.ts          # [[文章名]]
│   │   │   ├── EmojiView.ts             # :name:
│   │   │   └── CitationView.ts          # 三层引用
│   │   │
│   │   └── marks/
│   │       ├── BoldMark.ts
│   │       ├── ItalicMark.ts
│   │       ├── StrikeMark.ts
│   │       ├── CodeMark.ts
│   │       ├── HighlightMark.ts         # ==text== 多色
│   │       ├── LinkMark.ts              # hover tooltip + Ctrl+Click
│   │       ├── SubscriptMark.ts
│   │       └── SuperscriptMark.ts
│   │
│   ├── commands/
│   │   ├── registry.ts                  # 命令注册表
│   │   ├── editCommands.ts              # 编辑命令
│   │   ├── systemCommands.ts            # 系统命令
│   │   ├── aiCommands.ts                # AI 命令（预留）
│   │   └── publishCommands.ts           # 发布命令
│   │
│   ├── serializer/
│   │   ├── mdToJson.ts                  # Markdown → ProseMirror JSON
│   │   ├── jsonToMd.ts                  # ProseMirror JSON → Markdown
│   │   ├── jsonToHtml.ts                # ProseMirror JSON → HTML
│   │   ├── htmlToJson.ts                # 粘贴兜底（B-11 最小清理）
│   │   └── roundtrip.ts                 # 四模式循环保真测试工具
│   │
│   ├── source/
│   │   ├── SourceModeEditor.vue         # vue-codemirror 封装
│   │   ├── markdownLang.ts              # CodeMirror 扩展配置
│   │   └── sourceHistory.ts             # Source 模式独立 history
│   │
│   ├── preview/
│   │   ├── PreviewPane.vue              # Preview 面板
│   │   ├── scrollSync.ts                # 滚动同步（双向）
│   │   └── previewRenderer.ts           # Markdown → HTML
│   │
│   └── utils/
│       ├── cursorAware.ts               # cursor-aware 计算核心
│       ├── decorations.ts               # Decoration 辅助
│       ├── imeGuard.ts                  # IME 组合态守卫
│       ├── largeDocGuard.ts             # 大文档分片
│       ├── clipboard.ts                 # 剪贴板多 MIME
│       └── performance.ts               # 性能测量
│
├── stores/
│   ├── editor.ts                        # Editor Pinia Store
│   ├── editorMode.ts                    # 模式状态
│   └── editorConfig.ts                  # 配置（字体/主题/keymap 等）
│
└── db/
    └── schema.ts                        # articles 表 + 扩展字段
```

---

## §3 核心类型 Schema（TypeScript）

### 3.1 EditorConfig

```typescript
// src/editor/core/EditorContext.ts

import { z } from 'zod'

/**
 * EditorConfig — 编辑器全局配置
 * 由 Settings 持久化、Pinia Store 响应式同步。
 */
export const EditorConfigSchema = z.object({
  // 模式
  defaultMode: z.enum(['typora', 'source', 'preview']).default('typora'),
  rememberModePerDocument: z.boolean().default(true),

  // 自动保存
  autoSaveEnabled: z.boolean().default(true),
  autoSaveDebounceMs: z.number().min(500).max(10000).default(1000),
  autoSaveRetryCount: z.number().min(0).max(3).default(1),

  // 自动版本
  autoVersionEnabled: z.boolean().default(true),
  autoVersionTrigger: z.enum(['editComplete', 'interval']).default('editComplete'),

  // Cursor-aware
  cursorAwareInline: z.boolean().default(true),
  cursorAwareBlock: z.boolean().default(true),

  // 浮动工具栏 & 斜杠
  floatingToolbarEnabled: z.boolean().default(true),
  slashCommandsEnabled: z.boolean().default(true),

  // 智能标点
  smartPunctuation: z.object({
    chineseQuotes: z.boolean().default(true),
    chineseDash: z.boolean().default(true),
    chineseEllipsis: z.boolean().default(true),
    chineseBookTitle: z.boolean().default(true),
    englishSmartQuotes: z.boolean().default(true),
    englishEmDash: z.boolean().default(true),
    englishEnDash: z.boolean().default(true),
    englishEllipsis: z.boolean().default(true),
    panguSpacing: z.boolean().default(true),
    autoPair: z.boolean().default(true),
  }).default({}),

  // 视图
  paperWidth: z.enum(['s', 'm', 'l', 'xl']).default('m'),
  statusBarVisible: z.boolean().default(true),
  focusModeEnabled: z.boolean().default(false),
  focusModeTypewriter: z.boolean().default(false),

  // 字体
  contentFontFamily: z.string().default('system-ui'),
  contentFontFamilyCJK: z.string().default('system-ui'),
  contentFontSize: z.number().min(12).max(32).default(16),
  contentLineHeight: z.number().min(1.2).max(2.4).default(1.7),

  // 主题
  editorContentTheme: z.string().default('default-content'),
  appChromeTheme: z.string().default('default-ui'),
  writingAmbience: z.boolean().default(false),

  // 扩展
  enabledExtensions: z.array(z.string()).default([
    'typoraMode', 'markdownHints', 'smartPunctuation', 'keyboardShortcuts',
    'slashCommands', 'floatingToolbar', 'blockDragHandle',
    'codeBlockLowlight', 'mathInline', 'mathBlock', 'mermaid',
    'tableAdvanced', 'taskList', 'footnote', 'details', 'tocMacro',
    'highlight', 'wikiLink', 'emoji', 'frontmatter', 'citation',
  ]),

  // 性能
  largeDocThresholdChars: z.number().default(50000),
  largeDocThresholdBlocks: z.number().default(500),
})

export type EditorConfig = z.infer<typeof EditorConfigSchema>
```

### 3.2 EditorState（跨模式继承）

```typescript
// src/editor/core/EditorState.ts

/**
 * EditorMode — 编辑模式枚举
 */
export type EditorMode = 'typora' | 'source' | 'preview'

/**
 * CrossModeState — 跨模式共享状态
 * 模式切换时必须序列化，写入新模式。
 */
export interface CrossModeState {
  /**
   * 当前 Markdown 真值（唯一权威）
   * 模式切换前必须先序列化到此字段
   */
  markdownSource: string

  /**
   * 选区（字符偏移；模式切换时重映射）
   */
  selection: {
    anchor: number           // 字符偏移（Markdown 字符串）
    head: number
  }

  /**
   * 滚动位置（按段落锚点记录）
   */
  scroll: {
    blockIndex: number       // 段落索引
    offsetRatio: number      // 段落内相对位置（0~1）
  }

  /**
   * 折叠状态（按段落索引）
   */
  folded: number[]           // 段落索引数组

  /**
   * 版本点（active version id）
   */
  activeVersionId: string | null

  /**
   * 评论锚点（字符偏移）
   */
  commentAnchors: Array<{
    commentId: string
    from: number             // 字符偏移
    to: number
  }>

  /**
   * 搜索 term（持续到模式切换）
   */
  searchTerm: string | null
}

/**
 * ModeCheckpoint — 模式切换检查点（T01-14 C）
 * 每次切换模式保存当前模式的 history snapshot
 */
export interface ModeCheckpoint {
  mode: EditorMode
  timestamp: number
  historySnapshot: unknown   // 模式特定的 history（TipTap.history.getSnapshot 或 CodeMirror.undo.snapshot）
}

/**
 * EditorSession — 单个文档的编辑器会话
 */
export interface EditorSession {
  articleId: string
  currentMode: EditorMode
  crossModeState: CrossModeState
  checkpoints: ModeCheckpoint[]
  largeDocMode: boolean
  createdAt: number
  updatedAt: number
}
```

### 3.3 NodeAttrs & MarkAttrs

```typescript
// src/editor/extensions/nodes/types.ts

/**
 * 所有 NodeView 共享的基础属性
 */
export interface BaseNodeAttrs {
  nodeId?: string            // 唯一节点 ID（拖拽/评论锚点用）
  sourceLine?: number        // 对应 Markdown 源码行号（调试用）
}

/**
 * HeadingNodeAttrs
 */
export interface HeadingNodeAttrs extends BaseNodeAttrs {
  level: 1 | 2 | 3 | 4 | 5 | 6
  anchorId?: string          // 用于 TOC 跳转
}

/**
 * CodeBlockNodeAttrs
 */
export interface CodeBlockNodeAttrs extends BaseNodeAttrs {
  language: string           // 'typescript' | 'python' | ...
  showLineNumbers: boolean
  highlightLines?: number[]
}

/**
 * MathBlockNodeAttrs
 */
export interface MathBlockNodeAttrs extends BaseNodeAttrs {
  formula: string            // LaTeX 源码
  equationNumber?: number    // 公式编号（M-08 D）
  label?: string             // 交叉引用标签
}

/**
 * ImageNodeAttrs
 */
export interface ImageNodeAttrs extends BaseNodeAttrs {
  src: string
  alt: string
  title: string | null
  caption: string | null     // Figure caption（E-09 D）
  width: number | null
  align: 'left' | 'center' | 'right'
  galleryId: string | null
}

/**
 * FootnoteNodeAttrs
 */
export interface FootnoteNodeAttrs extends BaseNodeAttrs {
  footnoteId: string         // [^1] 的 "1"
  content: string            // 脚注内容（Markdown）
}

/**
 * HighlightMarkAttrs
 */
export interface HighlightMarkAttrs {
  color: string              // '#FFEB3B' | 'var(--hl-yellow)' 等
}

/**
 * LinkMarkAttrs
 */
export interface LinkMarkAttrs {
  href: string
  title: string | null
  isWikiLink: boolean        // [[文章名]] 为 true
}

/**
 * CitationMarkAttrs
 */
export interface CitationMarkAttrs {
  layer: 'factual' | 'inferred' | 'authored'
  sourceUrl: string | null
  sourceTitle: string | null
  timestamp: number
}
```

### 3.4 InputRule & PasteRule

```typescript
// src/editor/extensions/core/types.ts

/**
 * InputRule — 输入规则
 * 当用户键入触发正则时自动转换
 */
export interface InputRule {
  id: string
  pattern: RegExp
  handler: (args: {
    match: RegExpMatchArray
    state: EditorState
    tr: Transaction
    range: { from: number; to: number }
  }) => Transaction | null
  description: string        // 用于帮助系统显示
  disabledInNodes?: string[] // 在哪些节点内禁用（如 codeBlock）
}

/**
 * PasteRule — 粘贴规则
 */
export interface PasteRule {
  id: string
  source: PasteSource        // 'plain' | 'html' | 'markdown' | 'image'
  handler: (args: {
    content: string | File
    state: EditorState
    tr: Transaction
  }) => Transaction | null
}

export type PasteSource = 'plain' | 'html' | 'markdown' | 'image'
```

### 3.5 CommandRegistry

```typescript
// src/editor/commands/registry.ts

export type CommandCategory = 'edit' | 'system' | 'ai' | 'publish'

export interface Command {
  id: string                 // 'editor.bold' | 'system.save' | 'ai.summarize'
  category: CommandCategory
  title: { 'zh-CN': string; 'en-US': string }
  description: { 'zh-CN': string; 'en-US': string }

  // 触发方式
  keybindings?: Keybinding[]
  slashTrigger?: string       // '/heading-1' | '/table' 等
  toolbar?: ToolbarPlacement
  contextMenu?: ContextMenuPlacement

  // 执行
  execute: (ctx: CommandContext) => Promise<CommandResult>
  canExecute?: (ctx: CommandContext) => boolean

  // 权限与回滚
  requiresConfirm?: boolean
  requiresAuth?: boolean      // 系统级认证（R-18）
  createsVersionPoint?: boolean

  // 审计
  auditKind: string           // 'article.edit' | 'article.save' | ...
}

export interface Keybinding {
  os: 'win' | 'mac' | 'linux' | 'all'
  keys: string                // 'Ctrl+B' | 'Cmd+B' | 'Mod+B'（Mod 自动映射）
  scope: KeybindingScope
}

export type KeybindingScope = 'global' | 'editor' | 'typora' | 'source' | 'preview' | 'hub'

export interface ToolbarPlacement {
  group: 'format' | 'structure' | 'insert' | 'view' | 'history'
  priority: number            // 排序用
}
```

---

## §4 TipTap Extension 清单

> 本章列出 Editor 的所有 TipTap extension，并给出每个的接口签名。**禁止在实现时偏离此清单**。

### 4.1 TyporaMode（核心 cursor-aware 扩展）

```typescript
// src/editor/extensions/core/TyporaMode.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface TyporaModeOptions {
  enabled: boolean
  cursorAwareInline: boolean
  cursorAwareBlock: boolean
  hintClassName: string
  imeGuardEnabled: boolean
}

export const TyporaMode = Extension.create<TyporaModeOptions>({
  name: 'typoraMode',
  addOptions() {
    return {
      enabled: true,
      cursorAwareInline: true,
      cursorAwareBlock: true,
      hintClassName: 'md-syntax-mark',
      imeGuardEnabled: true,
    }
  },
  addProseMirrorPlugins() {
    return [createTyporaModePlugin(this.options)]
  },
})

function createTyporaModePlugin(options: TyporaModeOptions) {
  return new Plugin({
    key: new PluginKey('typoraMode'),
    props: {
      decorations(state) {
        // 1. 若 IME 组合态且 guard 开启，返回空集
        if (options.imeGuardEnabled && isComposing(state)) {
          return DecorationSet.empty
        }
        // 2. 获取光标所在 block
        const activeBlock = getActiveBlock(state.selection)
        // 3. 遍历 doc，生成 Decoration
        return buildDecorations(state.doc, activeBlock, options)
      },
    },
  })
}
```

**核心算法**：

1. 每次 transaction 触发后，调用 `props.decorations(state)` 重新计算
2. 通过 `state.selection.$from.start(1)` 获取顶层 block 的起点
3. 遍历 `state.doc.descendants()`，对每个节点判断是否在活动块内
4. 活动块内：添加 `Decoration.widget()` 显示语法符号（带 `md-syntax-mark` class）
5. 非活动块：不添加 Decoration，保持 TipTap 默认渲染
6. 对行内 mark（bold/italic/code/link），检查 `selection.from`/`selection.to` 是否与 mark 覆盖范围重叠

**CSS**：

```css
.md-syntax-mark {
  color: currentColor;
  opacity: 0.25;
  user-select: none;
  transition: none;      /* T01-03 A: 无动画 */
}
```

### 4.2 MarkdownHints（改造现有）

```typescript
// src/editor/extensions/core/MarkdownHints.ts

export interface MarkdownHintsOptions {
  mode: 'always' | 'cursorAware' | 'off'
  hintClassName: string
}

/**
 * 原有行为：mode='always'（始终显示提示）
 * 新增：mode='cursorAware'（只在光标所在块/mark 显示）
 *        mode='off'（关闭，用于 Source 模式内不需要）
 *
 * 实际上 TyporaMode 已吃掉 cursorAware 逻辑；
 * MarkdownHints 保留作为兼容开关（用户可关掉 Typora 模式回退到"始终显示"）
 */
```

### 4.3 SmartPunctuation（详见 50-spec）

```typescript
// src/editor/extensions/core/SmartPunctuation.ts

export interface SmartPunctuationOptions {
  rules: SmartPunctuationRules
  panguSpacing: boolean
  autoPair: boolean
  disabledInNodes: string[]       // ['codeBlock', 'code', 'mathBlock']
}
```

详见 `50-smart-punctuation-spec.md`。本 Spec 不重复。

### 4.4 KeyboardShortcuts（详见 49-spec）

```typescript
// src/editor/extensions/core/KeyboardShortcuts.ts

export interface KeyboardShortcutsOptions {
  keymap: Keybinding[]
  chordTimeoutMs: number      // 多键和弦超时（如 Ctrl+K Ctrl+S）
  conflictPolicy: 'first-wins' | 'last-wins' | 'prompt'
}
```

详见 `49-editor-keymap-spec.md`。

### 4.5 SlashCommands

```typescript
// src/editor/extensions/core/SlashCommands.ts

export interface SlashCommandsOptions {
  triggerChar: string                 // '/'
  suggestionItems: SlashSuggestion[]
  filterFn: (query: string, items: SlashSuggestion[]) => SlashSuggestion[]
}

export interface SlashSuggestion {
  id: string
  commandId: string                   // 指向 CommandRegistry 的 command id
  title: string
  description: string
  icon: string                        // lucide icon name
  aliases: string[]
  category: 'structure' | 'inline' | 'insert' | 'custom'
}
```

**行为**：
- 用户输入 `/`，弹出命令面板
- 候选：标题（H1~H6）、列表（有序/无序/任务）、代码块、表格、公式（行内/块级）、Mermaid、脚注、Details、TOC、Wikilink、Emoji、Citation
- Esc 关闭；上下箭头选择；Enter 确认
- 不做格式化命令（格式化走浮动工具栏 + 快捷键）

### 4.6 FloatingToolbar

```typescript
// src/editor/extensions/core/FloatingToolbar.ts

export interface FloatingToolbarOptions {
  delayMs: number                     // 150
  placement: 'top' | 'bottom' | 'auto'
  items: FloatingToolbarItem[]
  avoidPlacementOnTablesAndCodeBlocks: boolean
}

export interface FloatingToolbarItem {
  id: string
  commandId: string                   // 指向 CommandRegistry
  icon: string
  isActive: (ctx: Context) => boolean
  isEnabled?: (ctx: Context) => boolean
}
```

**默认 items**：
- 粗体（Ctrl+B）
- 斜体（Ctrl+I）
- 删除线（Ctrl+Shift+X）
- 行内代码（Ctrl+E）
- 链接（Ctrl+K）
- 高亮颜色选择器（Ctrl+Shift+H）
- 清除格式（Ctrl+\\）

**行为**：
- 选区长度 ≥ 1 且稳定 150ms 后浮出
- 位置：选区上方（若空间不足则下方）
- 选区变化立即重新定位（实时跟随）
- 点击外部关闭
- 禁用：在 codeBlock、math、mermaid 内不出现

### 4.7 BlockDragHandle（详见 51-spec）

```typescript
// src/editor/extensions/core/BlockDragHandle.ts

export interface BlockDragHandleOptions {
  dragHandleWidth: number             // 24px
  dragPreviewStyle: 'ghost' | 'virtual-text'
  insertionIndicatorColor: string     // 蓝色
}
```

详见 `51-block-drag-handle-spec.md`。

### 4.8 SourceModeBridge

```typescript
// src/editor/extensions/core/SourceModeBridge.ts

export interface SourceModeBridgeOptions {
  onRequestSwitch: (targetMode: 'source' | 'typora') => Promise<void>
  serializeToMarkdown: (doc: Node) => string
  parseFromMarkdown: (md: string) => Node
}

/**
 * 职责：
 * 1. 在模式切换前后做 JSON↔Markdown 的序列化/反序列化
 * 2. 保证 selection / scroll / folded 的映射
 */
```

### 4.9 PasteCleanser

```typescript
// src/editor/extensions/core/PasteCleanser.ts

export interface PasteCleanserOptions {
  defaultPolicy: 'plain' | 'structured' | 'html'
  whitelist: string[]                  // 源 URL 白名单（保留结构）
  blacklist: string[]                  // 源 URL 黑名单（强制清洗）
  sanitize: SanitizeRule[]
}

export interface SanitizeRule {
  targetTag: string                    // 'script' | 'iframe' | 'object'
  action: 'remove' | 'keep'
}
```

**默认行为**（T01-17 A）：
- 所有外部粘贴默认按纯文本接收
- 识别源（如微软 Word / Google Docs / 网页）：若在白名单，保留结构；否则清洗
- 强制清理：`<script>`、`<iframe>`、`on*` 事件、`javascript:` 协议

### 4.10 CodeBlockLowlight

```typescript
// src/editor/extensions/nodes/CodeBlockLowlight.ts

export interface CodeBlockLowlightOptions {
  theme: { light: string; dark: string } // 'github' / 'github-dark'
  languageLoader: (lang: string) => Promise<void>
  showLineNumbers: boolean
  showCopyButton: boolean
}
```

**行为**：
- 使用 Shiki 做高亮（T04-05 A + B-14）
- 默认主题：`github` / `github-dark`
- 按需加载语言包（G-04 C）
- 光标进入显示围栏 ``` + 语言标签（T01-08 A）
- 离开隐藏

### 4.11 MathInline / MathBlock

```typescript
// src/editor/extensions/nodes/MathInlineView.ts
// src/editor/extensions/nodes/MathBlockView.ts

export interface MathOptions {
  engine: 'katex'
  errorColor: string                   // '#cc0000'
  autoClearErrorOnEdit: boolean        // 修改后错误自清（B-12）
  equationNumbering: boolean           // M-08 D
  crossReferenceEnabled: boolean
}
```

**行为**：
- 完整 WYSIWYG（T04-01 A + T04-02 A）
- 错误即时显示红色，修改后自动消失（B-12）
- 块级公式可编号与交叉引用（M-08 D）

### 4.12 MermaidView

```typescript
// src/editor/extensions/nodes/MermaidView.ts

export interface MermaidOptions {
  theme: string
  renderTarget: 'stage' | 'inline'     // 默认 'stage'（B-13）
  errorDisplay: 'passthrough'          // 错误透传原生信息
}
```

**行为**：
- 编辑器内始终显示 Mermaid 源码（不做 cursor-aware 切换）（B-13）
- 渲染在右侧 Stage 面板
- 错误透传 Mermaid 原生错误

### 4.13 TableAdvanced（详见 53-spec）

```typescript
// src/editor/extensions/nodes/TableAdvanced.ts

export interface TableAdvancedOptions {
  resizable: boolean
  columnAlignable: boolean
  rowMergeable: boolean                // 行合并（v2.1 SHOULD）
  columnMergeable: boolean
  pipeSyntaxRoundTrip: boolean         // 双向 pipe（E-05 D）
  horizontalScrollOnOverflow: boolean
  tabNavigatesCells: boolean
}
```

详见 `53-table-advanced-spec.md`。

### 4.14 TaskListView

```typescript
// src/editor/extensions/nodes/TaskListView.ts

export interface TaskListOptions {
  nested: boolean                       // 允许嵌套
  keepMarker: boolean                   // cursor-aware 时显示 `- [ ] `
}
```

### 4.15 FootnoteView

```typescript
// src/editor/extensions/nodes/FootnoteView.ts

export interface FootnoteOptions {
  tooltipOnHover: boolean               // M-02 D
  bidirectionalJump: boolean
  exportFormat: 'bottom' | 'sidenote'
}
```

### 4.16 DetailsView

```typescript
// src/editor/extensions/nodes/DetailsView.ts

export interface DetailsOptions {
  defaultOpen: boolean
  summaryPlaceholder: string
  serializeAsHTML: boolean              // true → <details><summary> 语法保留
}
```

### 4.17 TocMacroView

```typescript
// src/editor/extensions/nodes/TocMacroView.ts

export interface TocMacroOptions {
  maxDepth: number                      // 1~6
  clickableLinks: boolean
  currentHeadingHighlight: boolean
  exportBehavior: 'user-opt-in' | 'always'
}
```

### 4.18 FrontmatterView

```typescript
// src/editor/extensions/nodes/FrontmatterView.ts

export interface FrontmatterOptions {
  schema: 'inkforge-v1'
  syntaxHighlight: boolean
  autoClose: boolean                    // 输入 `---\n` 自动闭合
}
```

### 4.19 WikiLinkView

```typescript
// src/editor/extensions/nodes/WikiLinkView.ts

export interface WikiLinkOptions {
  triggerChars: '[['
  autoComplete: boolean
  resolvePageById: (name: string) => Promise<string | null>
}
```

### 4.20 EmojiView

```typescript
// src/editor/extensions/nodes/EmojiView.ts

export interface EmojiOptions {
  triggerChar: ':'
  dataSource: 'emojibase'
  recentCount: number                   // 最近使用数
  favoritesPersisted: boolean
}
```

### 4.21 CitationView

```typescript
// src/editor/extensions/nodes/CitationView.ts

export interface CitationOptions {
  layers: readonly ['factual', 'inferred', 'authored']
  defaultLayer: 'authored'
  visibleInExport: boolean              // 导出时可见（R-11）
  visibleInPublish: boolean              // 发布时可隐藏
}
```

### 4.22 HighlightMark

```typescript
// src/editor/extensions/marks/HighlightMark.ts

export interface HighlightOptions {
  multiColor: boolean                   // M-03 D
  colors: HighlightColor[]
  toolbarColorPicker: boolean
}

export interface HighlightColor {
  name: string
  value: string                         // CSS color
}

export const DEFAULT_COLORS: HighlightColor[] = [
  { name: 'yellow', value: 'var(--hl-yellow)' },
  { name: 'green', value: 'var(--hl-green)' },
  { name: 'blue', value: 'var(--hl-blue)' },
  { name: 'red', value: 'var(--hl-red)' },
  { name: 'purple', value: 'var(--hl-purple)' },
]
```

### 4.23 LinkMark

```typescript
// src/editor/extensions/marks/LinkMark.ts

export interface LinkMarkOptions {
  autoLinkDetection: false              // E-08 C 不做自动检测
  tooltipButtons: readonly ['edit', 'copy', 'remove']
  ctrlClickFollow: boolean
  singleClickEntersEdit: boolean
  hoverShowsUrl: boolean
}
```

---

## §5 四模式状态机

### 5.1 状态机定义

```
                    Ctrl+\
  ┌──────────────────────────────────────┐
  │                                       │
  ▼                                       │
Typora ──────────────────────────────► Source
  │       Ctrl+Shift+V / Ctrl+\           │
  │                                       │
  │ Ctrl+Shift+V                          │ Ctrl+Shift+V
  ▼                                       ▼
Preview ◄────────────────────────────► Preview
                (Ctrl+Shift+V 返回)
```

- **Typora**：默认、cursor-aware、ProseMirror
- **Source**：vue-codemirror、纯字符串
- **Preview**：readonly、实时渲染
- **Export**：非模式，是 Dialog（从任一模式 Ctrl+Shift+E 触发）

### 5.2 转换矩阵

| 从 \ 到 | Typora | Source | Preview |
|---|---|---|---|
| Typora | — | Ctrl+\ | Ctrl+Shift+V |
| Source | Ctrl+\ | — | Ctrl+Shift+V |
| Preview | Ctrl+Shift+V（当上一个非预览模式为 `typora`） | Ctrl+Shift+V（当上一个非预览模式为 `source`） | — |

### 5.3 切换序列

```typescript
// src/editor/core/modeRouter.ts

export async function switchMode(
  session: EditorSession,
  target: EditorMode,
  trigger: 'keyboard' | 'toolbar' | 'command'
): Promise<void> {
  const current = session.currentMode
  if (current === target) return

  // 1. 序列化当前模式状态
  const state = await serializeCurrentMode(session)

  // 2. 保存检查点
  const checkpoint: ModeCheckpoint = {
    mode: current,
    timestamp: Date.now(),
    historySnapshot: captureHistorySnapshot(current),
  }
  session.checkpoints.push(checkpoint)

  // 3. 切换模式（UI 过渡 200ms）
  await animateTransition(current, target)

  // 4. 反序列化到目标模式
  await hydrateTargetMode(target, state)

  // 5. Toast 反馈（T01-13 D）
  toast.info({
    title: $t(`editor.modeSwitched.${target}`),
    duration: 1500,
  })

  // 6. StatusBar 指示器变色

  // 7. 写 activity_logs
  await activityLogger.log({
    kind: 'editor.modeSwitch',
    from: current,
    to: target,
    trigger,
    articleId: session.articleId,
  })
}
```

### 5.4 状态继承契约

**Typora → Source**：
- 当前 ProseMirror JSON 序列化为 Markdown
- 选区按字符偏移映射（JSON 位置 → Markdown 位置）
- 滚动位置按"段落索引 + 偏移比"记录，再映射到 Source 行号
- 折叠状态保留（段落索引）
- 撤销栈在 Typora 端保留，Source 端独立起栈，但切换时建立 checkpoint

**Source → Typora**：
- Markdown 字符串解析为 ProseMirror JSON
- 选区按字符偏移逆向映射
- 滚动位置按段落索引逆向
- 折叠状态还原
- 撤销栈独立

**→ Preview**：
- 当前模式先序列化到 Markdown
- Markdown 渲染为 HTML 显示
- 滚动位置按段落锚点同步
- Preview 无编辑，选区记录但不可用

**Preview → Typora/Source**：
- 按 Ctrl+Shift+V 回到上一次非 Preview 模式

### 5.5 切换性能预算

- 模式切换总耗时 ≤ 300ms（R-15 隐含目标）
- 其中：
  - 序列化当前模式：≤ 80ms（长文档 ≤ 150ms）
  - 过渡动画：200ms（UI 层，可并行）
  - 反序列化目标模式：≤ 80ms（长文档 ≤ 150ms）
  - Toast + StatusBar：≤ 20ms

---

## §6 输入规则（Input Rules）

> 共 60 + 条规则。所有规则注册在 `src/editor/extensions/core/InputRules.ts`。

### 6.1 标题（6 条）

| ID | 正则 | 行为 |
|---|---|---|
| heading-h1 | `^#\s$` | 当前段落 → H1 |
| heading-h2 | `^##\s$` | → H2 |
| heading-h3 | `^###\s$` | → H3 |
| heading-h4 | `^####\s$` | → H4 |
| heading-h5 | `^#####\s$` | → H5 |
| heading-h6 | `^######\s$` | → H6 |

### 6.2 列表（4 条）

| ID | 正则 | 行为 |
|---|---|---|
| bullet-list | `^[-*+]\s$` | → 无序列表项 |
| ordered-list | `^\d+\.\s$` | → 有序列表项 |
| task-list | `^-\s\[[ x]\]\s$` | → 任务列表项 |
| nested-list | `Tab` on list | 缩进 |

### 6.3 引用块（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| blockquote | `^>\s$` | → 引用块 |

### 6.4 代码块（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| fenced-code | ```` ^```([a-z]+)?\s$ ```` | → 代码块（指定语言） |

### 6.5 行内格式（8 条）

| ID | 正则 | 行为 |
|---|---|---|
| bold-star | `\*\*([^*]+)\*\*\s$` | 匹配段变 bold |
| bold-under | `__([^_]+)__\s$` | → bold |
| italic-star | `\*([^*]+)\*\s$` | → italic |
| italic-under | `_([^_]+)_\s$` | → italic |
| strike | `~~([^~]+)~~\s$` | → strike |
| code-inline | `` `([^`]+)`\s$ `` | → inline code |
| highlight | `==([^=]+)==\s$` | → highlight |
| link | `\[([^\]]+)\]\(([^)]+)\)\s$` | → link |

### 6.6 图片（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| image | `!\[([^\]]*)\]\(([^)]+)\)\s$` | 插入 image node |

### 6.7 公式（2 条）

| ID | 正则 | 行为 |
|---|---|---|
| math-inline | `\$([^$]+)\$\s$` | → 行内公式 |
| math-block | `^\$\$\s$` | → 块级公式（新段落） |

### 6.8 水平分割线（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| hr | `^---\s$` | → `<hr>` |

### 6.9 表格（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| table | `^\|([^|]+\|)+\s$` | → 表格（根据列数） |

### 6.10 脚注（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| footnote-ref | `\[\^(\d+)\]\s$` | → 脚注引用 |

### 6.11 TOC（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| toc | `^\[toc\]\s$` | → TOC 宏 |

### 6.12 Details（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| details | `^<details>$` | → details 节点 |

### 6.13 Wikilink（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| wikilink | `\[\[([^\]]+)\]\]\s$` | → wikilink |

### 6.14 Emoji（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| emoji | `:([a-z_]+):\s$` | → emoji |

### 6.15 FrontMatter（1 条）

| ID | 正则 | 行为 |
|---|---|---|
| frontmatter | `^---\n$` （文档首行） | → frontmatter node + 自动闭合 |

### 6.16 智能标点（详见 50-spec）

见 `50-smart-punctuation-spec.md`，共 20+ 条规则（引号、破折号、省略号、书名号、中英文空格等）。

### 6.17 上标下标（2 条）

| ID | 正则 | 行为 |
|---|---|---|
| superscript | `\^([^^]+)\^\s$` | → 上标 |
| subscript | `~([^~]+)~\s$` | → 下标 |

### 6.18 Callout（v2.1 不启用，但规则预留）

| ID | 正则 | 行为 |
|---|---|---|
| callout-note | `^>\s\[!note\]\s$` | （v2.1 noop，v2.2+ → callout） |

---

## §7 粘贴规则（Paste Rules）

### 7.1 分流策略

```typescript
// src/editor/extensions/core/PasteCleanser.ts

export async function handlePaste(event: ClipboardEvent): Promise<void> {
  const types = event.clipboardData?.types ?? []

  // 优先级：Markdown > HTML > Plain > Image
  if (types.includes('text/markdown')) {
    return handleMarkdownPaste(event)
  } else if (types.includes('text/html')) {
    return handleHtmlPaste(event)
  } else if (types.includes('text/plain')) {
    return handlePlainPaste(event)
  } else if (types.some(t => t.startsWith('image/'))) {
    return handleImagePaste(event)
  }
}
```

### 7.2 Markdown 粘贴

- 直接以 `md-parser` 解析为 ProseMirror JSON
- 合并到当前选区
- 无需清洗

### 7.3 HTML 粘贴（T01-17 A + 补充白/黑名单）

```typescript
function handleHtmlPaste(event: ClipboardEvent): void {
  const html = event.clipboardData!.getData('text/html')
  const source = detectSource(html)            // 'word' | 'google-docs' | 'web' | 'unknown'

  if (isBlacklisted(source)) {
    // 强制纯文本
    insertText(extractPlainText(html))
    return
  }

  if (isWhitelisted(source)) {
    // 保留结构（清洗后）
    const cleanedHtml = sanitize(html)
    const json = htmlToJson(cleanedHtml)
    insertNode(json)
    return
  }

  // 默认：按 T01-17 A 转纯文本并尝试 Markdown 识别
  const md = htmlToMarkdown(html)
  insertMarkdown(md)
}
```

### 7.4 Plain Text 粘贴

- 检测是否像 Markdown（含 `#` / `**` / `---`）
- 若像 Markdown，解析为 JSON
- 否则作为纯文本插入

### 7.5 Image 粘贴

- 图片转 Blob
- 上传到 AssetStore（一项目一文件夹）
- 插入 `<img>` 节点引用

### 7.6 来源检测

```typescript
function detectSource(html: string): PasteSource {
  if (html.includes('data-office') || html.includes('mso-')) return 'word'
  if (html.includes('docs.google.com')) return 'google-docs'
  if (html.includes('notion.so')) return 'notion'
  if (html.includes('wechatpub')) return 'wechat'
  if (html.includes('<html') || html.includes('<body')) return 'web'
  return 'unknown'
}

const WHITELIST: PasteSource[] = ['word', 'google-docs']
const BLACKLIST: PasteSource[] = []
```

### 7.7 安全清理规则

- 始终移除：`<script>`、`<iframe>`、`<object>`、`<embed>`、`<form>`、`<input>`
- 始终移除：`on*` 内联事件
- 始终移除：`javascript:` / `data:` 协议（图片除外）
- 保留：`<a>` / `<p>` / `<h1>~<h6>` / `<ul>` / `<ol>` / `<li>` / `<strong>` / `<em>` / `<code>` / `<pre>` / `<img>` / `<blockquote>` / `<br>` / `<hr>` / `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<td>` / `<th>`

---

## §8 ProseMirror 事务中间件

### 8.1 中间件链

```typescript
// src/editor/core/transactionPipeline.ts

export const transactionPipeline: TransactionMiddleware[] = [
  imeGuardMiddleware,             // IME 组合态守卫
  wordCountMiddleware,            // 字数统计
  performanceGuardMiddleware,     // 性能监控
  securityGuardMiddleware,        // 防止恶意脚本
  autoSaveTriggerMiddleware,      // 触发自动保存
  auditMiddleware,                // 审计日志
  versionTriggerMiddleware,       // 触发版本快照
]
```

### 8.2 imeGuardMiddleware

```typescript
function imeGuardMiddleware(tr: Transaction, state: EditorState): Transaction {
  if (state.composing) {
    // 组合态下暂停 cursor-aware Decoration 更新
    tr.setMeta('suspendDecorations', true)
  }
  return tr
}
```

### 8.3 wordCountMiddleware

```typescript
function wordCountMiddleware(tr: Transaction, state: EditorState): Transaction {
  if (!tr.docChanged) return tr
  const stats = computeStats(tr.doc)
  editorStatsStore.update(stats)
  return tr
}
```

### 8.4 performanceGuardMiddleware

```typescript
function performanceGuardMiddleware(tr: Transaction, state: EditorState): Transaction {
  const start = performance.now()
  // 监控 transaction 耗时，超阈值记录
  setTimeout(() => {
    const elapsed = performance.now() - start
    if (elapsed > 16) {
      performanceLogger.warn({ kind: 'slowTransaction', elapsed })
    }
  }, 0)
  return tr
}
```

### 8.5 securityGuardMiddleware

```typescript
function securityGuardMiddleware(tr: Transaction, state: EditorState): Transaction {
  // 扫描新插入的节点，禁用 <script> 等
  if (!tr.docChanged) return tr
  const suspicious = scanSuspiciousNodes(tr.doc)
  if (suspicious.length > 0) {
    tr = removeSuspiciousNodes(tr, suspicious)
  }
  return tr
}
```

### 8.6 autoSaveTriggerMiddleware

```typescript
function autoSaveTriggerMiddleware(tr: Transaction, state: EditorState): Transaction {
  if (!tr.docChanged) return tr
  debouncedAutoSave()            // 1s 防抖
  return tr
}
```

### 8.7 auditMiddleware

```typescript
function auditMiddleware(tr: Transaction, state: EditorState): Transaction {
  if (tr.getMeta('audited')) return tr
  activityLogger.logEditAction({
    kind: 'editor.edit',
    articleId: state.articleId,
    timestamp: Date.now(),
    delta: computeDelta(tr),
  })
  tr.setMeta('audited', true)
  return tr
}
```

### 8.8 versionTriggerMiddleware

```typescript
function versionTriggerMiddleware(tr: Transaction, state: EditorState): Transaction {
  if (!tr.docChanged) return tr
  editCompletionDetector.onEdit(tr)    // 触发"修改完成"检测
  // 若 editCompletionDetector 检测到一段完整的修改，触发版本快照
  return tr
}
```

---

## §9 大文档分片策略

### 9.1 激活条件（L1-35 + L1-36）

当文档满足以下任一条件时，激活大文档模式：
- 字符数 ≥ 50,000
- 段落数 ≥ 500
- 图片数 ≥ 200
- 用户手动开启

### 9.2 降级措施

| 能力 | 常规模式 | 大文档模式 |
|---|---|---|
| 虚拟滚动 | 关闭 | 打开（仅视口 + 5 段缓冲） |
| 语法高亮 | 全量同步 | 视口内同步，其他段空闲时段计算 |
| cursor-aware Decoration | 全量 | 仅光标附近 5 段 |
| 自动保存防抖 | 1s | 3s |
| Spell check | 开 | 关 |
| Mermaid 自动渲染 | 开 | 手动触发（点击渲染） |
| 预览实时更新 | 每 keystroke | 300ms 节流 |

### 9.3 实现

```typescript
// src/editor/utils/largeDocGuard.ts

export class LargeDocGuard {
  private threshold = { chars: 50000, blocks: 500 }
  private active = ref(false)

  evaluate(doc: Node): void {
    const stats = computeStats(doc)
    const shouldActivate = stats.chars >= this.threshold.chars
      || stats.blocks >= this.threshold.blocks
    if (shouldActivate !== this.active.value) {
      this.active.value = shouldActivate
      this.notifyUser()
    }
  }

  private notifyUser(): void {
    toast.info({
      title: $t('editor.largeDocModeActivated'),
      duration: 3000,
    })
  }
}
```

---

## §10 IME 兼容

### 10.1 问题

中文、日文、韩文输入法在组合（composition）期间，每个按键可能触发多个 transaction，若 cursor-aware Decoration 实时重算，会导致：
- 候选词跳字
- 光标位置漂移
- 输入卡顿

### 10.2 守卫策略（T01-16 C 不冻结但需测试）

虽然 T01-16 选项 C 不做特殊冻结，但为避免回归，本 Spec 采取**折中方案**：
- `compositionstart` 事件触发：暂停 cursor-aware Decoration 重算
- `compositionend` 事件触发：立即重算

```typescript
// src/editor/utils/imeGuard.ts

export function useImeGuard(editor: Editor): void {
  let composing = false
  editor.view.dom.addEventListener('compositionstart', () => {
    composing = true
    editor.view.setProps({ editable: () => true })  // 仍允许输入
  })
  editor.view.dom.addEventListener('compositionend', () => {
    composing = false
    // 触发一次 force re-render
    editor.view.updateState(editor.view.state)
  })
}
```

### 10.3 测试覆盖（必过）

- 中文拼音输入 20 个字符（含删除/重选候选词）
- 日文假名输入
- 韩文输入
- 切换多个候选词
- 长组合（如 10 字以上一次性 commit）
- 组合过程中切换模式（Ctrl+\ 应等待 composition 结束）

---

## §11 无障碍

v2.1 不做 WCAG AA 专项（G-09 A），但必须：

### 11.1 键盘可达

- 所有 UI 按钮 tabindex
- 浮动工具栏 role=toolbar + 箭头键导航
- 斜杠命令面板 role=listbox
- 模式切换 Ctrl+\ / Ctrl+Shift+V 全局可用

### 11.2 ARIA 属性

| 元素 | role | 说明 |
|---|---|---|
| 编辑器 | textbox | aria-multiline=true |
| 浮动工具栏 | toolbar | aria-label="格式化工具栏" |
| 斜杠面板 | listbox | aria-label="命令面板" |
| 状态栏 | status | aria-live=polite |
| 模式指示器 | status | aria-live=polite |
| 保存指示器 | status | aria-live=polite |
| Mermaid 错误 | alert | aria-live=assertive |

### 11.3 不做

- 屏幕阅读器专项优化
- 高对比度主题
- 键盘放大支持

---

## §12 性能优化

### 12.1 关键路径

1. **字符输入**：必须 < 16ms 单次 frame
2. **模式切换**：总耗时 ≤ 300ms
3. **自动保存**：≤ 1s
4. **大文档打开**：≤ 3s

### 12.2 优化点

- **Decoration 缓存**：不变部分复用（按段落签名）
- **Transaction 批量提交**：多个连续 transaction 合并
- **Virtual scroll**：大文档只渲染视口
- **Web Worker**：Markdown 解析/序列化放 worker
- **Shiki 语言按需**：首次使用才加载
- **KaTeX 按需**：首次公式才加载
- **Mermaid 按需**：首次 Mermaid 才加载
- **Lazy component**：FloatingToolbar、SlashMenu、BlockDragHandle 懒加载

### 12.3 Benchmarks（CI 强制跑）

| Benchmark | 目标 |
|---|---|
| 10k 字符文档开启 | ≤ 500ms |
| 100k 字符文档开启 | ≤ 1.5s |
| 900k 字符文档开启 | ≤ 3s |
| 10k 字符输入 1000 次 | 总耗时 < 16s（单次 < 16ms） |
| 模式切换（10k 文档） | ≤ 200ms |
| 模式切换（900k 文档） | ≤ 500ms |

---

## §13 单元测试与 E2E 用例清单

> 目标 50+ 用例。分层：Vitest 单元 + Playwright E2E。

### 13.1 Vitest 单元测试（25 条）

| # | 测试 | 覆盖 |
|---|---|---|
| U1 | cursorAware.ts getActiveBlock | cursor-aware 核心 |
| U2 | cursorAware.ts buildDecorations | Decoration 生成 |
| U3 | mdToJson h1~h6 | 序列化 |
| U4 | mdToJson lists | 序列化 |
| U5 | mdToJson tables | 序列化 |
| U6 | mdToJson math | 序列化 |
| U7 | mdToJson mermaid | 序列化 |
| U8 | jsonToMd h1~h6 | 反序列化 |
| U9 | jsonToMd tables roundtrip | round-trip |
| U10 | jsonToMd footnote | 序列化 |
| U11 | inputRules heading | 输入规则 |
| U12 | inputRules list | 输入规则 |
| U13 | inputRules math | 输入规则 |
| U14 | inputRules frontmatter | 输入规则 |
| U15 | pasteRules markdown | 粘贴 |
| U16 | pasteRules html sanitize | 粘贴 |
| U17 | pasteRules image upload | 粘贴 |
| U18 | modeRouter switch Typora→Source | 模式切换 |
| U19 | modeRouter switch Source→Preview | 模式切换 |
| U20 | modeRouter checkpoint restore | 检查点 |
| U21 | LargeDocGuard activation | 大文档 |
| U22 | imeGuard composition | IME |
| U23 | commandRegistry execute | 命令 |
| U24 | commandRegistry keybinding conflict | 命令 |
| U25 | roundtrip fuzz 100 random docs | round-trip |

### 13.2 Playwright E2E（30+ 条）

| # | 测试 | 覆盖 |
|---|---|---|
| E1 | Typora h1 cursor-aware 显隐 | AC-T1 |
| E2 | Typora 19 元素全覆盖 | AC-T3~T20 |
| E3 | Typora 嵌套 mark 分层 | AC-T15 |
| E4 | Source 模式切换 | AC-S1 |
| E5 | Source 模式显示完整 Markdown | AC-S2 |
| E6 | Source 修改回 Typora 可见 | AC-S3 |
| E7 | Source 撤销栈独立 | AC-S5 |
| E8 | Source 搜索 Ctrl+F | AC-S6 |
| E9 | Source 折叠 | AC-S7 |
| E10 | Source→Typora 滚动继承 | AC-S8 |
| E11 | Source→Typora 选区继承 | AC-S9 |
| E12 | Source 900k 字符性能 | AC-S10 |
| E13 | Preview 进入 | AC-P1 |
| E14 | Preview 实时跟随 | AC-P2 |
| E15 | Preview 滚动同步 | AC-P3 |
| E16 | 三模式状态全继承 | AC-M1 |
| E17 | 检查点撤销 | AC-M2 |
| E18 | 过渡 + Toast | AC-M3 |
| E19 | 崩溃恢复保留模式 | AC-M4 |
| E20 | 多 Tab 独立模式 | AC-M5 |
| E21 | 自动保存 1s | AC-A1 |
| E22 | 保存失败重试 | AC-A2 |
| E23 | 保存失败可见 | AC-A3 |
| E24 | 版本触发 | AC-A4 |
| E25 | 命名版本 | AC-A5 |
| E26 | 脚注双向跳转 | AC-X1 |
| E27 | details 折叠 | AC-X2 |
| E28 | TOC 实时 | AC-X3 |
| E29 | KaTeX 错误自清 | AC-X4 |
| E30 | Mermaid Stage | AC-X5 |
| E31 | Wikilink 自动完成 | AC-X6 |
| E32 | Emoji 自动完成 | AC-X7 |
| E33 | FrontMatter 闭合 | AC-X8 |
| E34 | Citation 三层 | AC-X9 |
| E35 | Highlight 多色 | AC-X10 |
| E36 | 30 快捷键全覆盖 | AC-C1 |
| E37 | 斜杠面板 | AC-C2 |
| E38 | 浮动工具栏 150ms | AC-C3 |
| E39 | 右键菜单 | AC-C4 |

### 13.3 Round-trip Fuzz（必过）

- 100 个随机生成的 Markdown 文档
- 每个经过 Typora→Source→Preview→Export→Markdown 四态循环
- 断言：回到 Markdown 时字符级等价（忽略可忽略空白）
- 发现不等价：立即失败 CI

---

## §14 已知风险与降级路径

| 风险 | 等级 | 降级 |
|---|---|---|
| IME 跳字 | 中 | imeGuard 暂停 cursor-aware |
| 大文档性能不达标 | 中 | LargeDocGuard 激活 |
| KaTeX 加载失败 | 低 | 显示原始 LaTeX + 错误提示 |
| Mermaid 加载失败 | 低 | 显示原始 Mermaid 源码 |
| Shiki 语言包加载失败 | 低 | 降级到纯文本显示 |
| vue-codemirror 集成异常 | 中 | fallback 到 textarea + 基本高亮 |
| 扩展崩溃 | 中 | ExtensionHealth 自动禁用该扩展 |
| Markdown 序列化不一致 | 高 | round-trip 测试阻止合并 |
| 模式切换状态丢失 | 高 | 回滚切换 + 告警 |
| Tauri IPC 延迟 | 低 | 所有 Tauri 调用 async + timeout |

---

## §15 模块间契约

### 15.1 Editor → Hub

Editor 通过 Pinia Store 暴露：
- `editorStatsStore`：当前文档字数、段落数、会话时长、目标进度
- `editorDirtyStore`：有修改未保存

Hub 订阅这两个 Store 更新卡片。

### 15.2 Editor → Version

Editor 调用：
```typescript
versionService.createSnapshot({
  articleId,
  markdown: getCurrentMarkdown(),
  trigger: 'auto' | 'manual' | 'milestone',
  label?: string,
})
```

### 15.3 Editor → Sync

Editor 在每次成功保存后触发：
```typescript
syncOrchestrator.notifyChange({ articleId, markdownHash })
```

### 15.4 Editor → Search

Editor 在每次成功保存后触发：
```typescript
searchIndexer.updateDoc({ articleId, markdown, frontmatter })
```

### 15.5 Editor → Export

Editor 提供获取当前 Markdown 的 API：
```typescript
export async function getMarkdownForExport(articleId: string): Promise<string>
```

### 15.6 Markdown Authority → Editor

Editor 读取：
```typescript
articleService.load(articleId): Promise<Article & { markdown, htmlCache, sourceHash }>
```

Editor 写入：
```typescript
articleService.save({
  articleId,
  markdownSource,
  htmlCache,
  sourceHash,
  cacheVersion,
})
```

### 15.7 Theme → Editor

Editor 订阅：
- `editorContentTheme`（CSS 变量注入 `<style>`）
- `appChromeTheme`（Layout 层）

---

## §16 错误处理

### 16.1 错误分级（G-13 D）

| 等级 | 示例 | UI | 日志 | 备份 | 阻断 |
|---|---|---|---|---|---|
| 提示 | 输入规则匹配成功 | 无 | debug | 无 | 无 |
| 可恢复 | 首次保存失败 | Toast | info | 无 | 无 |
| 阻断 | 扩展初始化失败 | 模态对话 | warn | 无 | 有 |
| 数据风险 | 保存失败重试后仍失败 | Toast + StatusBar 红点 + 日志入口 | error | 有（beforeunload localStorage） | 有（阻止继续编辑直到处理） |

### 16.2 ErrorBoundary（R-04 D）

```typescript
// src/editor/core/EditorErrorBoundary.vue

<script setup lang="ts">
const error = ref<Error | null>(null)
function handleError(e: Error, info: string) {
  error.value = e
  activityLogger.log({ kind: 'editor.errorBoundary', error: e, info })
  extensionHealth.markUnhealthy(info)
}
</script>

<template>
  <ErrorBoundary @error="handleError">
    <template #fallback>
      <EditorSafeMode :error="error" @retry="retry" />
    </template>
    <slot />
  </ErrorBoundary>
</template>
```

### 16.3 ExtensionHealth

```typescript
// src/editor/core/ExtensionHealth.ts

export class ExtensionHealth {
  private errors = new Map<string, number>()
  private disabled = new Set<string>()

  recordError(extensionName: string): void {
    const count = (this.errors.get(extensionName) ?? 0) + 1
    this.errors.set(extensionName, count)
    if (count >= 3) this.autoDisable(extensionName)
  }

  private autoDisable(extensionName: string): void {
    this.disabled.add(extensionName)
    toast.warning({
      title: $t('editor.extensionDisabled', { name: extensionName }),
    })
    activityLogger.log({ kind: 'editor.extensionDisabled', extensionName })
  }

  isDisabled(extensionName: string): boolean {
    return this.disabled.has(extensionName)
  }
}
```

---

## §17 安全与沙箱

### 17.1 用户内容安全

- 最小清理规则（B-11）：`<script>` / `on*` / `javascript:` / `<iframe>`
- 图片 src 必须符合：http(s)、相对路径、`inkforge://asset/`
- 链接 href 必须符合：http(s)、mailto、相对路径
- 禁止 `<meta>` 注入

### 17.2 自定义 CSS 沙箱（EX-07）

详见 `54-custom-css-spec.md`。纲要：
- 用户 CSS 注入 shadow root 或 CSS isolation
- 禁止 `@import` 外部
- 禁止 `background-image: url()` 指向外部
- 运行时校验，异常时自动禁用

### 17.3 扩展沙箱（R-19）

详见 SDK Spec（Part 2）。纲要：
- 扩展必须声明权限（clipboard / fs / network / ui-inject 等）
- 运行时 ExtensionHealth 监控
- 出错自动禁用

---

## §18 序列化与反序列化

### 18.1 Markdown ↔ ProseMirror JSON

```typescript
// src/editor/serializer/mdToJson.ts

export async function markdownToJson(md: string): Promise<ProseMirrorNode> {
  const ast = await remark().parse(md)
  return astToProseMirror(ast)
}

// src/editor/serializer/jsonToMd.ts

export function jsonToMarkdown(doc: ProseMirrorNode): string {
  return proseMirrorToMd(doc)
}
```

### 18.2 关键转换点

| ProseMirror 节点 | Markdown |
|---|---|
| heading.level=1 | `# ...` |
| blockquote | `> ...` |
| bulletList.listItem | `- ...` |
| orderedList.listItem | `1. ...` |
| taskList.taskItem(checked) | `- [x] ...` |
| codeBlock | ```` ```lang\n...\n``` ```` |
| table | `| a | b |\n|---|---|` |
| mathInline | `$...$` |
| mathBlock | `$$\n...\n$$` |
| mermaid | ```` ```mermaid\n...\n``` ```` |
| footnote | `[^1]` + `[^1]: ...` |
| details | `<details><summary>...</summary>...</details>` |
| toc | `[toc]` |
| wikilink | `[[name]]` |
| emoji | `:name:` |
| frontmatter | `---\n...\n---\n` |
| highlight | `==...==` |
| image | `![alt](src "title")` + sidecar（caption/align/width） |
| citation | `<ink:cite layer="factual" src="...">text</ink:cite>` |

### 18.3 Round-trip 守卫

```typescript
// src/editor/serializer/roundtrip.ts

export async function assertRoundtrip(md: string): Promise<void> {
  const json = await markdownToJson(md)
  const md2 = jsonToMarkdown(json)
  if (normalizeWhitespace(md) !== normalizeWhitespace(md2)) {
    throw new RoundtripError({ expected: md, actual: md2 })
  }
}
```

---

## §19 命令系统集成

### 19.1 命令注册

```typescript
// src/editor/commands/registry.ts

export class CommandRegistry {
  private commands = new Map<string, Command>()

  register(cmd: Command): void {
    if (this.commands.has(cmd.id)) {
      throw new Error(`Command id conflict: ${cmd.id}`)
    }
    this.commands.set(cmd.id, cmd)
  }

  execute(id: string, ctx: CommandContext): Promise<CommandResult> {
    const cmd = this.commands.get(id)
    if (!cmd) throw new Error(`Command not found: ${id}`)
    if (cmd.canExecute && !cmd.canExecute(ctx)) {
      return Promise.resolve({ success: false, reason: 'not-executable' })
    }
    return cmd.execute(ctx)
  }

  findByKeybinding(keys: string, scope: KeybindingScope): Command | null {
    // 实现冲突策略
  }
}
```

### 19.2 编辑命令（L1-27 D 的"编辑命令"类别）

| ID | 默认 Keybinding |
|---|---|
| editor.bold | Ctrl+B |
| editor.italic | Ctrl+I |
| editor.strike | Ctrl+Shift+X |
| editor.code | Ctrl+E |
| editor.link | Ctrl+K |
| editor.highlight | Ctrl+Shift+H |
| editor.clearFormat | Ctrl+\\ |
| editor.heading1~6 | Ctrl+Alt+1~6 |
| editor.bulletList | Ctrl+Shift+8 |
| editor.orderedList | Ctrl+Shift+7 |
| editor.taskList | Ctrl+Shift+9 |
| editor.blockquote | Ctrl+Shift+B |
| editor.codeBlock | Ctrl+Shift+C |
| editor.math.inline | Alt+Shift+E |
| editor.math.block | Alt+Shift+M |
| editor.table | Ctrl+Alt+Shift+T |
| editor.image | Ctrl+Alt+I |
| editor.footnote | Alt+Shift+F |
| editor.details | Alt+Shift+D |
| editor.toc | Alt+Shift+O |
| editor.wikilink | Ctrl+Shift+L |
| editor.emoji | Ctrl+Shift+; |
| editor.citation | Alt+Shift+C |

### 19.3 系统命令（片段）

| ID | 默认 Keybinding |
|---|---|
| system.save | Ctrl+S |
| system.saveNamed | Ctrl+Shift+S |
| system.switchMode | Ctrl+\\ |
| system.togglePreview | Ctrl+Shift+V |
| system.focusMode | F11 |
| system.commandPalette | Ctrl+P |
| system.find | Ctrl+F |
| system.replace | Ctrl+H |
| system.export | Ctrl+Shift+E |
| system.paperWidth.toggle | Ctrl+= |
| system.newArticle | Ctrl+N |

### 19.4 发布命令（片段）

| ID | 默认 Keybinding |
|---|---|
| publish.wechat | — |
| publish.zhihu | — |
| publish.redbook | — |
| publish.html | — |
| publish.markdown | — |

### 19.5 AI 命令（预留）

| ID | 默认 Keybinding |
|---|---|
| ai.summarize | — |
| ai.translate | — |
| ai.polish | — |
| ai.expand | — |

---

## §20 测试矩阵

| 维度 | 覆盖项 | 工具 |
|---|---|---|
| 19 元素 × 3 模式 | 57 项 | Playwright |
| 60+ 输入规则 | 60 项 | Vitest |
| 30+ 粘贴规则 | 30 项 | Vitest |
| Round-trip fuzz | 100 个随机文档 | Vitest |
| 性能 Benchmark | 10k/100k/900k 文档 | Playwright perf |
| IME | 中/日/韩 | Playwright |
| 崩溃恢复 | beforeunload | Playwright |
| 模式切换状态继承 | 选区/滚动/折叠/检查点 | Playwright |
| 扩展健康 | 3 次错误后禁用 | Vitest |
| 键盘冲突 | 100+ 快捷键 | Vitest |

---

## §21 验收标准落地

每个 AC 对应的实现位置：

| AC | 实现模块 |
|---|---|
| AC-T1~T20 | `TyporaMode.ts` + 各 NodeView + Mark |
| AC-S1~S10 | `SourceModeEditor.vue` + `modeRouter.ts` |
| AC-P1~P5 | `PreviewPane.vue` + `scrollSync.ts` |
| AC-M1~M5 | `modeRouter.ts` + `EditorState.ts` |
| AC-A1~A5 | `autoSaveTriggerMiddleware` + `versionTriggerMiddleware` |
| AC-X1~X10 | 各 NodeView（`FootnoteView` / `DetailsView` / `TocMacroView` / ... ） |
| AC-C1~C4 | `KeyboardShortcuts.ts` / `SlashCommands.ts` / `FloatingToolbar.ts` / Context Menu |

---

## §22 调试与诊断

### 22.1 Dev Panel（R-03 D）

见 `40-dev-panel-spec.md`。本 Spec 暴露：
- `window.__inkforgeDebug.editor`：当前 Editor 实例
- `window.__inkforgeDebug.mode`：当前模式
- `window.__inkforgeDebug.json()`：获取当前 ProseMirror JSON
- `window.__inkforgeDebug.markdown()`：获取当前 Markdown
- `window.__inkforgeDebug.html()`：获取当前 HTML

### 22.2 Performance Monitoring

所有 transaction 耗时 > 16ms 自动记录到 `diagnostic/performance.log`。

### 22.3 Extension Health Dashboard

Settings > Advanced > Extension Health 显示每个扩展的：
- 加载状态
- 错误计数
- 最近错误信息
- 手动禁用/启用

---

## §23 序列化细节（补充）

### 23.1 Markdown 规范

InkForge 使用 CommonMark + GFM + InkForge 扩展：
- CommonMark 0.30
- GFM（表格、任务列表、删除线、URL autolink——但 InkForge 禁用 autolink）
- InkForge 扩展：高亮、脚注、TOC 宏、Wikilink、Emoji、Citation

### 23.2 不一致处理

当 Markdown 本身有歧义时（如列表项缩进），以 **最近的 CommonMark 标准解释** 为准。

### 23.3 可移植性标记

导出为"标准 Markdown"时：
- 高亮 `==text==` → HTML `<mark>text</mark>` 或降级为纯文本
- TOC `[toc]` → 转换为静态 Markdown 目录
- Wikilink `[[name]]` → 普通链接（或保留，取决于 preset）
- Citation → 转换为 Markdown 注释或 HTML span
- FrontMatter → 保留（Jekyll 兼容）

---

## §24 Source 模式详细

### 24.1 vue-codemirror 集成

```vue
<!-- src/editor/source/SourceModeEditor.vue -->
<script setup lang="ts">
import { Codemirror } from 'vue-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'

const props = defineProps<{
  modelValue: string
  readonly?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'selectionChange': [sel: { from: number; to: number }]
  'scrollChange': [top: number]
}>()

const extensions = [
  markdown(),
  EditorView.lineWrapping,
  EditorState.tabSize.of(2),
  // ... 更多扩展
]
</script>

<template>
  <Codemirror
    :model-value="modelValue"
    :extensions="extensions"
    :style="{ height: '100%', width: '100%' }"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
```

### 24.2 Source 模式的特性

- 行号（默认开启，可关）
- 代码折叠（标题层级 + 代码块）
- 软换行（默认开启）
- Tab 缩进（默认 2 空格）
- 语法高亮（Markdown）
- 搜索替换（CodeMirror 原生）
- 撤销栈（CodeMirror 原生）

### 24.3 与 Typora 模式的桥接

见 `SourceModeBridge.ts` 的实现（§4.8）。

---

## §25 Preview 模式详细

### 25.1 实现

```vue
<!-- src/editor/preview/PreviewPane.vue -->
<script setup lang="ts">
const props = defineProps<{ markdown: string }>()
const html = computedAsync(async () => {
  return await renderMarkdown(props.markdown)
}, '')
</script>

<template>
  <div class="preview-pane" v-html="html" />
</template>
```

### 25.2 实时更新

每次 `markdown` prop 变化，即刻重渲染（不做防抖）（T04-09 A）。

### 25.3 滚动同步

见 `scrollSync.ts`（W-04 D）。

### 25.4 主题独立

Preview 主题可独立于编辑器（L1-58 D）。

---

## §26 Focus Mode 详细

### 26.1 激活

- Settings 开关
- F11 快捷键
- StatusBar 按钮

### 26.2 视觉效果（L1-46 D）

- 隐藏左栏 / 右栏 / TabBar
- 当前段落 opacity 1.0，其他段落 opacity 0.3
- 可叠加：打字机模式（当前行固定在视口中央）

### 26.3 保留功能

- 所有快捷键仍可用
- 斜杠命令仍可用
- 保存仍可用
- StatusBar 可整体隐藏但全局快捷键可调出临时显示

### 26.4 退出

- 退出后弹出"写作成果概要"（L1-46 D）：本次会话字数、时长、新生成的段落数

---

## §27 Paper Width（L1-60 D 配合 T01-11 C）

### 27.1 4 档

| 档位 | 宽度 | 适用 |
|---|---|---|
| S | 640px | 窄屏 / 专注 |
| M | 800px | 默认 |
| L | 960px | 宽屏 |
| XL | 1200px | 超宽屏 |

### 27.2 切换

- Ctrl+= 循环切换（S → M → L → XL → S）
- StatusBar 显示当前档位
- Settings 可手动选

### 27.3 动画

200ms 过渡（非必需但推荐）。

---

## §28 StatusBar（N-01 C + L1-48 B）

### 28.1 展示项（默认开启）

| 项 | 说明 |
|---|---|
| 模式指示器 | Typora / Source / Preview |
| 字数 | 总字符数（不含空格） |
| 字符数 | 总字符数（含空格） |
| 段落数 | 顶层段落数 |
| 阅读时长 | 按 400 字/分钟 |
| 保存状态 | 已保存 / 保存中 / 失败 |
| 纸张宽度 | S/M/L/XL |
| 目标进度 | 单文档目标百分比（若开启）|

### 28.2 不展示（L1-48 B）

- 行号 / 列号
- 打字速度
- 会话字数增量

### 28.3 可整体隐藏

右键 StatusBar → 隐藏；F12 显示（可配）。

---

## §29 Typography 面板（L1-60 D）

详见 `20-theme-font-typography-spec.md`。纲要：
- 字号（12~32px）
- 行距（1.2~2.4）
- 段间距
- 缩进
- 字间距
- 标题样式（H1~H6 各自字号/颜色/字重）
- 引用样式
- 代码样式

---

## §30 技术债清单

> 本 Spec 明确指出的技术债，不在 v2.1 修复但需归档。

| # | 债务 | 优先级 |
|---|---|---|
| D1 | vue-codemirror bundle 体积大（~500KB gzipped） | P2 |
| D2 | cursor-aware Decoration 每次 transaction 全量重算（大文档需优化） | P2 |
| D3 | Mermaid 大图渲染慢（需 Web Worker） | P2 |
| D4 | Shiki 主题硬编码 github/github-dark | P2 |
| D5 | 块级拖拽与 virtual scroll 结合未充分测试 | P1 |
| D6 | IME 组合态下 cursor-aware 暂停逻辑需真实场景验证 | P1 |
| D7 | 多语言 keybinding（如 Mac Cmd / Linux Super）冲突检测不全 | P1 |
| D8 | 自定义 CSS 注入可能覆盖 InkForge 内部样式 | P1 |

---

## §31 术语表

- **Transaction**：ProseMirror 的状态变更单位
- **Decoration**：ProseMirror 的装饰器（widget/inline/node）
- **NodeView**：自定义节点视图（Vue 组件）
- **Mark**：行内标记（bold/italic 等）
- **Schema**：ProseMirror 的节点/标记定义
- **EditorState**：ProseMirror 的只读状态
- **EditorView**：ProseMirror 的视图（DOM 侧）
- **Remark**：Markdown 解析器（unified 生态）
- **Shiki**：代码高亮器（基于 TextMate 语法）
- **KaTeX**：数学公式渲染器
- **Mermaid**：图表 DSL 渲染器
- **CommonMark**：Markdown 标准
- **GFM**：GitHub Flavored Markdown
- **Cursor-aware**：光标感知（Typora 核心）

---

## §32 变更记录

| 日期 | 版本 | 内容 |
|---|---|---|
| 2026-04-21 | v2.1.0-draft | 初始化（§1~§32） |

---

（Spec 结束）
