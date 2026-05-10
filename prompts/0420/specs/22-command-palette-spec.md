> 版本: v2.1 | 状态: Draft | 关联决策: L1-27 D / L1-28(推断 D) / L1-29 A / EX-03 / X-10 | 依赖 Spec: 03-editor-core-spec.md / 07-shortcuts-spec.md / 17-search-engine-spec.md

# 命令面板（Command Palette）技术规格说明

---

## 目录

1. 功能概述与设计哲学
2. 架构总览
3. 命令数据模型
4. CommandRegistry（命令注册表）
5. CommandExecutor（命令执行器）
6. FuzzySearchEngine（模糊搜索引擎）
7. 命令分类体系
8. 上下文过滤机制
9. UI 规格
10. 搜索历史与持久化
11. 快速操作面板（空查询状态）
12. 键盘导航规格
13. 动效规格
14. Vue 组件完整接口
15. Pinia Store 完整接口
16. TypeScript 类型全量定义
17. 扩展 API
18. 性能要求
19. 无障碍（a11y）要求
20. 测试矩阵

---

## 1. 功能概述与设计哲学

命令面板是 InkForge v2.1 的统一命令触达中枢，通过单一入口聚合系统内所有可执行动作。设计哲学遵循以下原则：

**统一注册，分类可见**：所有命令统一注册到 CommandRegistry，并按四大类（编辑 / 系统 / AI / 发布）分组展示，保持命令体系的可预测性。

**上下文感知**：面板根据当前光标位置、文档状态、激活的模式自动过滤不相关命令，呈现最相关的结果集。

**键盘第一**：整个交互路径从唤起到执行全程可通过键盘完成，鼠标操作为辅助路径。

**搜索驱动**：用户无需记忆完整命令名称，模糊搜索算法容忍拼写错误和简写。

**可组合工作流**：命令可被串联为工作流模板（L1-27 D），单个命令作为原子操作。

### 1.1 触发入口

| 触发方式 | 作用域 | 说明 |
|----------|--------|------|
| `Ctrl+K`（Windows/Linux）/ `Cmd+K`（macOS） | 全局 | 打开命令面板，搜索范围为全部命令 |
| `Ctrl+Shift+K` | 当前文档 | 打开命令面板，预过滤为文档相关命令 |
| 工具栏"命令"按钮 | 编辑器 | 等同 `Ctrl+K`，供鼠标用户使用 |
| 右键菜单"更多命令..." | 上下文 | 打开命令面板并预设当前上下文过滤 |

### 1.2 与其他命令入口的职责分工

遵循 L1-29 A 决策：

- **快捷键**：给熟练用户直接触发特定命令，命令面板不介入
- **斜杠命令（`/`）**：用于插入和创建内容元素（块级节点）
- **浮动工具栏**：仅处理选区格式化操作
- **命令面板（`Ctrl+K`）**：系统级、文档级、导出级、AI 级命令的统一入口；熟练用户也可以用命令面板替代记忆快捷键

---

## 2. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    CommandPalette UI 层                      │
│  CommandPalette.vue  ←→  useCommandPaletteStore             │
└───────────────────────────────┬─────────────────────────────┘
                                │
               ┌────────────────▼──────────────────┐
               │         CommandExecutor             │
               │  • 权限检查 (L1-28 D 推断)          │
               │  • 高风险确认对话框                  │
               │  • 自动版本点生成 (X-10 C)           │
               │  • 执行审计写入 activity_logger      │
               └───────────┬───────────────────────┘
                           │
          ┌────────────────▼──────────────────────────────┐
          │              CommandRegistry                    │
          │  • 全局命令存储（Map<string, Command>）         │
          │  • 按命令分类索引                               │
          │  • 按上下文标签索引                             │
          │  • 扩展注册 API                                 │
          └───────────┬──────────────────────────────────┘
                      │
        ┌─────────────▼──────────────────────────────────┐
        │           FuzzySearchEngine                      │
        │  • Fuse.js 核心 (threshold 0.3)                  │
        │  • includeMatches: true（高亮匹配字符）           │
        │  • 搜索历史加权                                   │
        │  • 上下文过滤预处理                               │
        └─────────────────────────────────────────────────┘
```

### 2.1 模块职责边界

| 模块 | 职责 | 文件路径 |
|------|------|----------|
| `CommandRegistry` | 命令存储与检索，扩展注册 API | `src/services/command/registry.ts` |
| `CommandExecutor` | 命令执行、权限检查、副作用处理 | `src/services/command/executor.ts` |
| `FuzzySearchEngine` | 模糊搜索、历史加权、结果排序 | `src/services/command/fuzzy-search.ts` |
| `CommandPalette.vue` | UI 渲染、键盘导航、动效 | `src/components/command-palette/CommandPalette.vue` |
| `useCommandPaletteStore` | 状态管理（打开状态、查询、历史） | `src/stores/command-palette.ts` |
| `CommandRegistryLoader` | 内置命令批量注册（分模块） | `src/services/command/loaders/*.ts` |

---

## 3. 命令数据模型

### 3.1 Command 接口

```typescript
interface Command {
  /** 全局唯一标识符，格式: `{namespace}.{action}` */
  id: string;

  /** 面板中显示的命令标题（简洁，不超过 40 字） */
  title: string;

  /** 副标题，展示当前值/状态/说明（可选，不超过 60 字） */
  subtitle?: string;

  /** 搜索关键词别名（同义词、英文缩写等） */
  keywords: string[];

  /** Lucide 图标名称（不引入 import，运行时动态解析） */
  icon: string;

  /** 命令作用域：决定在哪种上下文下可见 */
  scope: CommandScope;

  /** 执行函数，返回 Promise 以支持异步 */
  handler: (context: CommandContext) => Promise<void> | void;

  /** 绑定的快捷键（仅展示用，实际绑定由快捷键系统管理） */
  shortcut?: string;

  /** 命令分组（用于 UI 分组标签行） */
  group: CommandGroup;

  /** 上下文标签列表（用于上下文过滤） */
  contexts: CommandContextTag[];

  /** 是否为高风险命令（触发执行前确认对话框） */
  isDestructive?: boolean;

  /** 命令是否需要生成版本快照点（默认 false） */
  requiresVersionCheckpoint?: boolean;

  /** 命令是否写入审计日志（默认 true，所有改数据命令） */
  auditLogged?: boolean;

  /** 子命令列表（用于二级选择场景，如"导出为" > 选择格式） */
  subcommands?: SubCommand[];

  /** 权限要求（至少满足列表中某一权限才允许执行） */
  requiredPermissions?: Permission[];

  /** 标记命令在无搜索词时是否出现在"常用"快速面板 */
  featured?: boolean;

  /** 命令的版本可用性（默认 v2.1，扩展命令可声明最低版本要求） */
  since?: string;
}
```

### 3.2 SubCommand 接口

```typescript
interface SubCommand {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  handler: (context: CommandContext) => Promise<void> | void;
  isDestructive?: boolean;
}
```

### 3.3 CommandContext 接口

```typescript
interface CommandContext {
  /** 当前激活的文档 ID（可能为 null，如在 Hub 页面） */
  activeDocumentId: string | null;

  /** 当前编辑器光标位置信息 */
  cursorContext: CursorContext | null;

  /** 当前选区（有文本选中时非 null） */
  selection: EditorSelection | null;

  /** 当前编辑器模式 */
  editorMode: 'typora' | 'source' | 'preview' | null;

  /** 当前页面路由 */
  currentRoute: string;

  /** 触发来源 */
  triggerSource: 'keyboard' | 'toolbar' | 'context-menu';
}
```

### 3.4 CursorContext 接口

```typescript
interface CursorContext {
  /** 光标所在块类型 */
  blockType: 'paragraph' | 'heading' | 'codeBlock' | 'table' |
             'tableCell' | 'image' | 'mathBlock' | 'detailsBlock' |
             'listItem' | 'blockquote' | 'footnote';

  /** 光标是否在代码块内 */
  inCodeBlock: boolean;

  /** 光标是否在表格内 */
  inTable: boolean;

  /** 光标所在标题级别（1-6，非标题则为 null） */
  headingLevel: number | null;

  /** 是否有文本选中 */
  hasSelection: boolean;
}
```

---

## 4. CommandRegistry（命令注册表）

### 4.1 类定义

```typescript
class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private byGroup: Map<CommandGroup, Command[]> = new Map();
  private byContext: Map<CommandContextTag, Command[]> = new Map();

  /**
   * 注册单个命令
   * @throws {DuplicateCommandError} 若 id 已存在且非强制覆盖
   */
  register(command: Command, options?: RegisterOptions): void;

  /**
   * 批量注册命令（分模块加载时使用）
   */
  registerBatch(commands: Command[]): void;

  /**
   * 注销命令（扩展卸载时调用）
   */
  unregister(id: string): void;

  /**
   * 按 id 查找命令
   */
  get(id: string): Command | undefined;

  /**
   * 按分组获取全部命令
   */
  getByGroup(group: CommandGroup): Command[];

  /**
   * 按上下文标签过滤命令
   */
  filterByContext(tags: CommandContextTag[]): Command[];

  /**
   * 获取所有命令（供搜索引擎使用）
   */
  getAll(): Command[];

  /**
   * 扩展专用注册 API（含权限声明校验）
   */
  registerExtension(
    extensionId: string,
    commands: Command[],
    manifest: ExtensionManifest
  ): RegisterResult;
}

interface RegisterOptions {
  /** 强制覆盖已有同 id 命令（默认 false） */
  overwrite?: boolean;
  /** 注册来源标识（内置 / 扩展 id） */
  source?: string;
}
```

### 4.2 命令 id 命名规范

| 命名空间 | 示例 id | 说明 |
|----------|---------|------|
| `editor.*` | `editor.toggleBold` | 编辑器命令（格式化、插入元素） |
| `hub.*` | `hub.createDocument` | Hub 相关命令 |
| `document.*` | `document.rename` | 文档生命周期命令 |
| `export.*` | `export.toHtml` | 导出命令 |
| `publish.*` | `publish.toWeChat` | 发布命令 |
| `settings.*` | `settings.openAppearance` | 设置面板命令 |
| `view.*` | `view.toggleFocusMode` | 视图切换命令 |
| `ai.*` | `ai.improveWriting` | AI 命令（v2.1 占位） |
| `ext.{extensionId}.*` | `ext.myPlugin.doSomething` | 扩展命令 |

---

## 5. CommandExecutor（命令执行器）

### 5.1 执行流程

```
用户选择命令
       │
       ▼
权限检查 (requiredPermissions)
       │
       ├─ 权限不足 → 显示"权限不足"Toast，中止
       │
       ▼
高风险确认 (isDestructive)
       │
       ├─ 用户取消 → 中止，无副作用
       │
       ▼
版本快照 (requiresVersionCheckpoint)
       │
       ├─ 创建版本快照点（异步，不阻塞执行）
       │
       ▼
执行 handler(context)
       │
       ├─ 成功 → 写入审计日志 (auditLogged)
       │         → 更新命令使用计数（历史权重）
       │         → 关闭命令面板
       │
       └─ 异常 → 写入审计日志（含错误信息）
                → 显示错误 Toast（可撤销类操作附撤销按钮）
                → 不重试（除非命令 handler 内部实现重试）
```

### 5.2 类定义

```typescript
class CommandExecutor {
  constructor(
    private registry: CommandRegistry,
    private store: ReturnType<typeof useCommandPaletteStore>,
    private activityLogger: ActivityLogger,
    private versionManager: VersionManager
  ) {}

  /**
   * 执行命令，含完整生命周期处理
   */
  async execute(commandId: string, context: CommandContext): Promise<ExecuteResult>;

  /**
   * 校验命令在当前上下文是否可执行
   */
  canExecute(commandId: string, context: CommandContext): CanExecuteResult;

  /**
   * 展示高风险命令确认对话框
   */
  private async confirmDestructive(command: Command): Promise<boolean>;
}

interface ExecuteResult {
  success: boolean;
  commandId: string;
  error?: Error;
  /** 是否创建了版本快照 */
  versionCheckpointCreated: boolean;
  /** 是否写入了审计日志 */
  auditLogged: boolean;
}

interface CanExecuteResult {
  canExecute: boolean;
  reason?: 'permission_denied' | 'context_mismatch' | 'command_not_found';
}
```

---

## 6. FuzzySearchEngine（模糊搜索引擎）

### 6.1 Fuse.js 配置

```typescript
const fuseOptions: Fuse.IFuseOptions<Command> = {
  threshold: 0.3,          // 匹配容忍度：0 = 完全匹配, 1 = 匹配所有
  includeMatches: true,     // 返回匹配字符位置（用于高亮渲染）
  includeScore: true,       // 返回相关度分数（用于排序）
  ignoreLocation: true,     // 不考虑匹配位置（命令名中任意位置匹配）
  minMatchCharLength: 1,    // 最少 1 字符触发匹配
  keys: [
    { name: 'title', weight: 2.0 },       // 命令标题权重最高
    { name: 'keywords', weight: 1.5 },    // 关键词别名次之
    { name: 'subtitle', weight: 0.8 },    // 副标题权重最低
    { name: 'group', weight: 0.5 },       // 分组名
  ],
};
```

### 6.2 搜索结果排序算法

1. **上下文过滤**：先过滤与当前上下文不匹配的命令
2. **Fuse.js 模糊搜索**：对过滤后的命令集运行搜索
3. **历史加权**：最近使用过的命令在相同 score 时优先排序
4. **精确前缀加权**：title 以搜索词开头的命令排名更靠前
5. **分组稳定排序**：同一分组内命令保持注册顺序

```typescript
function sortResults(
  fuseResults: Fuse.FuseResult<Command>[],
  query: string,
  history: CommandHistoryEntry[]
): SortedResult[] {
  return fuseResults
    .map(result => ({
      ...result,
      // 历史加权分：最近 5 条命令加 0.3，最近 20 条加 0.1
      historyBonus: calculateHistoryBonus(result.item.id, history),
      // 前缀加权分
      prefixBonus: result.item.title.toLowerCase().startsWith(query.toLowerCase()) ? 0.2 : 0,
    }))
    .sort((a, b) => {
      // Fuse score 越小越好（0 = 完美匹配）
      const scoreA = (a.score ?? 1) - a.historyBonus - a.prefixBonus;
      const scoreB = (b.score ?? 1) - b.historyBonus - b.prefixBonus;
      return scoreA - scoreB;
    })
    .slice(0, 12); // 最多显示 12 条结果
}
```

### 6.3 搜索引擎类定义

```typescript
class FuzzySearchEngine {
  private fuse: Fuse<Command>;
  private indexedCommands: Command[] = [];

  constructor(private history: CommandHistory) {}

  /**
   * 重建搜索索引（命令注册后调用）
   */
  rebuildIndex(commands: Command[]): void;

  /**
   * 执行搜索，返回排序后的结果
   * @param query - 搜索词（可为空字符串）
   * @param context - 当前上下文（用于过滤）
   * @returns 最多 12 条排序结果
   */
  search(query: string, context: CommandContext): SearchResult[];

  /**
   * 仅执行上下文过滤（无搜索词时返回快速操作列表）
   */
  filterByContext(context: CommandContext): Command[];
}

interface SearchResult {
  command: Command;
  /** 模糊搜索分数（越小越好） */
  score: number;
  /** 各字段的匹配区间（用于高亮渲染） */
  matches: Fuse.FuseResultMatch[];
}
```

---

## 7. 命令分类体系

### 7.1 CommandGroup 枚举

```typescript
enum CommandGroup {
  /** 编辑器命令：格式化、插入、选择 */
  Editor = 'editor',
  /** 文档命令：新建、重命名、状态变更、属性 */
  Document = 'document',
  /** Hub 命令：导航、视图切换、收藏 */
  Hub = 'hub',
  /** 导出命令：各种格式导出、剪贴板 */
  Export = 'export',
  /** 发布命令：发布到各平台渠道 */
  Publish = 'publish',
  /** 视图命令：专注模式、分屏、布局 */
  View = 'view',
  /** Settings 命令：打开各设置页面 */
  Settings = 'settings',
  /** AI 命令：写作辅助、内容生成（v2.1 占位） */
  AI = 'ai',
  /** 扩展命令：由已安装扩展注册 */
  Extension = 'extension',
}
```

### 7.2 内置命令清单（完整列表）

#### 编辑器命令（group: Editor）

| id | title | icon | shortcut | contexts |
|----|-------|------|----------|----------|
| `editor.toggleBold` | 加粗 | `Bold` | `Ctrl+B` | `['editor']` |
| `editor.toggleItalic` | 斜体 | `Italic` | `Ctrl+I` | `['editor']` |
| `editor.toggleStrikethrough` | 删除线 | `Strikethrough` | `Ctrl+Shift+S` | `['editor']` |
| `editor.toggleCode` | 行内代码 | `Code` | `` Ctrl+` `` | `['editor']` |
| `editor.toggleHighlight` | 高亮标记 | `Highlighter` | `Ctrl+Shift+H` | `['editor']` |
| `editor.insertCodeBlock` | 插入代码块 | `SquareCode` | `Ctrl+Alt+C` | `['editor']` |
| `editor.insertTable` | 插入表格 | `Table` | `Ctrl+Alt+Shift+T` | `['editor']` |
| `editor.insertImage` | 插入图片 | `Image` | `Ctrl+Alt+I` | `['editor']` |
| `editor.insertHorizontalRule` | 插入分割线 | `Minus` | — | `['editor']` |
| `editor.insertMathBlock` | 插入数学公式 | `Sigma` | `Ctrl+Alt+M` | `['editor']` |
| `editor.toggleHeading1` | 一级标题 | `Heading1` | `Ctrl+1` | `['editor']` |
| `editor.toggleHeading2` | 二级标题 | `Heading2` | `Ctrl+2` | `['editor']` |
| `editor.toggleHeading3` | 三级标题 | `Heading3` | `Ctrl+3` | `['editor']` |
| `editor.toggleBulletList` | 无序列表 | `List` | `Ctrl+Shift+8` | `['editor']` |
| `editor.toggleOrderedList` | 有序列表 | `ListOrdered` | `Ctrl+Shift+7` | `['editor']` |
| `editor.toggleTaskList` | 任务列表 | `ListChecks` | `Ctrl+Shift+9` | `['editor']` |
| `editor.toggleBlockquote` | 引用块 | `Quote` | `Ctrl+Shift+>` | `['editor']` |
| `editor.insertFootnote` | 插入脚注 | `Footnote` | — | `['editor']` |
| `editor.insertDetails` | 插入折叠块 | `ChevronDown` | — | `['editor']` |
| `editor.undo` | 撤销 | `Undo` | `Ctrl+Z` | `['editor']` |
| `editor.redo` | 重做 | `Redo` | `Ctrl+Y` | `['editor']` |
| `editor.selectAll` | 全选 | `SelectAll` | `Ctrl+A` | `['editor']` |
| `editor.findReplace` | 查找与替换 | `Search` | `Ctrl+H` | `['editor']` |
| `editor.insertWikiLink` | 插入内链 | `Link2` | `[[` | `['editor']` |
| `editor.insertSnippet` | 插入片段 | `Puzzle` | — | `['editor']` |
| `editor.insertTOC` | 插入目录 | `BookOpen` | — | `['editor']` |
| `editor.convertToTable` | 转换为表格 | `Table` | — | `['editor', 'selection']` |
| `editor.sortList` | 排序列表 | `ArrowUpDown` | — | `['editor', 'listContext']` |

#### 文档命令（group: Document）

| id | title | icon | shortcut | contexts | isDestructive |
|----|-------|------|----------|----------|---------------|
| `document.create` | 新建文档 | `FilePlus` | `Ctrl+N` | `['global']` | false |
| `document.rename` | 重命名文档 | `Pencil` | `F2` | `['document']` | false |
| `document.duplicate` | 复制文档 | `Copy` | — | `['document']` | false |
| `document.moveToTrash` | 移入回收站 | `Trash2` | `Ctrl+Del` | `['document']` | true |
| `document.archive` | 归档文档 | `Archive` | — | `['document']` | false |
| `document.changeStatus` | 更改文档状态 | `GitBranch` | — | `['document']` | false |
| `document.openProperties` | 打开文档属性 | `Info` | `Ctrl+Shift+I` | `['document']` | false |
| `document.openVersionHistory` | 打开版本历史 | `History` | `Ctrl+Shift+V` | `['document']` | false |
| `document.saveVersion` | 保存版本快照 | `Save` | `Ctrl+Shift+S` | `['document']` | false |
| `document.copyLink` | 复制文档链接 | `Link` | — | `['document']` | false |
| `document.pin` | 固定到 Hub | `Pin` | — | `['document']` | false |
| `document.favorite` | 收藏文档 | `Star` | — | `['document']` | false |
| `document.openInNewWindow` | 在新窗口打开 | `ExternalLink` | — | `['document']` | false |

#### Hub 命令（group: Hub）

| id | title | icon | shortcut | contexts |
|----|-------|------|----------|----------|
| `hub.goToHub` | 返回 Hub 首页 | `Home` | `Ctrl+Shift+H` | `['global']` |
| `hub.openFileManager` | 打开文件管理 | `FolderOpen` | `Ctrl+Shift+F` | `['global']` |
| `hub.openTrash` | 打开回收站 | `Trash` | — | `['global']` |
| `hub.openArchive` | 打开归档视图 | `Archive` | — | `['global']` |
| `hub.createSmartFolder` | 新建智能文件夹 | `FolderSearch` | — | `['global']` |
| `hub.globalSearch` | 全局搜索 | `Search` | `Ctrl+F` | `['global']` |
| `hub.openQuickNote` | 快速笔记 | `Zap` | `Ctrl+Alt+N` | `['global']` |

#### 导出命令（group: Export）

| id | title | icon | shortcut | contexts |
|----|-------|------|----------|----------|
| `export.toHtml` | 导出为 HTML | `FileCode` | — | `['document']` |
| `export.toMarkdown` | 导出为 Markdown | `FileText` | — | `['document']` |
| `export.copyAsHtml` | 复制为 HTML | `Clipboard` | — | `['document']` |
| `export.copyAsMarkdown` | 复制为 Markdown | `Clipboard` | — | `['document']` |
| `export.copyAsPlainText` | 复制为纯文本 | `Clipboard` | — | `['document']` |
| `export.openExportHistory` | 查看导出历史 | `History` | — | `['document']` |

#### 发布命令（group: Publish）

| id | title | icon | shortcut | contexts |
|----|-------|------|----------|----------|
| `publish.toWeChat` | 发布到微信公众号 | `Send` | — | `['document']` |
| `publish.toZhihu` | 发布到知乎 | `Send` | — | `['document']` |
| `publish.toRedbook` | 发布到小红书 | `Send` | — | `['document']` |
| `publish.previewPublish` | 预览发布效果 | `Eye` | — | `['document']` |
| `publish.openPublishHistory` | 查看发布历史 | `History` | — | `['document']` |

#### 视图命令（group: View）

| id | title | icon | shortcut | contexts |
|----|-------|------|----------|----------|
| `view.toggleFocusMode` | 切换专注模式 | `Focus` | `Ctrl+Shift+F` | `['global']` |
| `view.toggleSidebar` | 切换侧边栏 | `PanelLeft` | `Ctrl+[` | `['global']` |
| `view.toggleStatusBar` | 切换状态栏 | `Minus` | — | `['global']` |
| `view.togglePreview` | 切换预览面板 | `SplitSquareHorizontal` | `Ctrl+Shift+P` | `['editor']` |
| `view.splitView` | 打开分屏参考 | `Columns` | — | `['editor']` |
| `view.maximizeEditor` | 最大化编辑区 | `Maximize2` | `Ctrl+Shift+M` | `['editor']` |
| `view.switchToTyporaMode` | 切换为排版模式 | `Type` | `Ctrl+\` | `['editor']` |
| `view.switchToSourceMode` | 切换为源码模式 | `Code2` | `Ctrl+\` | `['editor']` |
| `view.switchToPreviewMode` | 切换为预览模式 | `Eye` | `Ctrl+\` | `['editor']` |
| `view.increasePaperWidth` | 增加纸张宽度 | `Expand` | — | `['editor']` |
| `view.decreasePaperWidth` | 减少纸张宽度 | `Shrink` | — | `['editor']` |

#### Settings 命令（group: Settings）

| id | title | icon | shortcut | contexts |
|----|-------|------|----------|----------|
| `settings.open` | 打开设置 | `Settings` | `Ctrl+,` | `['global']` |
| `settings.openAppearance` | 外观设置 | `Palette` | — | `['global']` |
| `settings.openEditor` | 编辑器设置 | `FileEdit` | — | `['global']` |
| `settings.openKeyboard` | 快捷键设置 | `Keyboard` | — | `['global']` |
| `settings.openSync` | 同步设置 | `RefreshCw` | — | `['global']` |
| `settings.openPublishing` | 发布设置 | `Globe` | — | `['global']` |
| `settings.openTemplates` | 模板管理 | `LayoutTemplate` | — | `['global']` |
| `settings.openExtensions` | 扩展管理 | `Puzzle` | — | `['global']` |
| `settings.resetFTUE` | 重置引导流程 | `RotateCcw` | — | `['global']` |
| `settings.openAbout` | 关于 InkForge | `Info` | — | `['global']` |

---

## 8. 上下文过滤机制

### 8.1 CommandContextTag 枚举

```typescript
enum CommandContextTag {
  /** 任何位置均可使用 */
  Global = 'global',
  /** 当前有文档打开 */
  Document = 'document',
  /** 光标在编辑器内 */
  Editor = 'editor',
  /** 有文本选中 */
  Selection = 'selection',
  /** 光标在代码块内 */
  CodeBlockContext = 'codeBlockContext',
  /** 光标在表格内 */
  TableContext = 'tableContext',
  /** 光标在列表项内 */
  ListContext = 'listContext',
  /** 光标在图片节点 */
  ImageContext = 'imageContext',
  /** 光标在数学公式块 */
  MathContext = 'mathContext',
  /** 当前在 Hub 页面 */
  HubPage = 'hubPage',
  /** 当前在文件管理器 */
  FileManagerPage = 'fileManagerPage',
  /** 当前在设置页面 */
  SettingsPage = 'settingsPage',
}
```

### 8.2 上下文匹配规则

命令的 `contexts` 数组与当前活动上下文标签取交集：

```typescript
function isCommandVisible(command: Command, activeContexts: CommandContextTag[]): boolean {
  // Global 命令始终可见
  if (command.contexts.includes(CommandContextTag.Global)) return true;

  // 命令的上下文标签与当前活动标签有交集则可见
  return command.contexts.some(ctx => activeContexts.includes(ctx));
}
```

### 8.3 上下文标签激活规则

| 当前状态 | 激活的上下文标签 |
|----------|----------------|
| 任何页面 | `Global` |
| 文档已打开 | `Global`, `Document` |
| 编辑器获得焦点 | `Global`, `Document`, `Editor` |
| 编辑器有选区 | `Global`, `Document`, `Editor`, `Selection` |
| 光标在代码块 | `..., Editor, CodeBlockContext` |
| 光标在表格 | `..., Editor, TableContext` |
| 光标在列表 | `..., Editor, ListContext` |
| 光标在图片 | `..., Editor, ImageContext` |
| 光标在公式块 | `..., Editor, MathContext` |
| 在 Hub 页面 | `Global`, `HubPage` |
| 在文件管理器 | `Global`, `FileManagerPage` |
| 在设置页面 | `Global`, `SettingsPage` |

### 8.4 上下文过滤优先级

光标在代码块内时，以下命令类别会被隐藏：
- 所有格式化命令（Bold、Italic、Heading 等）
- 插入命令（插入表格、图片、公式块等）
- 保留：搜索、导出、设置、视图切换命令

光标在表格内时，以下命令可见：
- 表格相关命令（排序、添加行列等）
- 通用命令（导出、设置等）
- 隐藏：插入代码块、插入表格等同类命令

---

## 9. UI 规格

### 9.1 布局规格

```
┌────────────────────────────────────────────────────────┐  ← overlay 背景（rgba(0,0,0,0.4)，blur 4px）
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [搜索图标]  搜索命令...                  [Esc]  │  │  ← 搜索输入框区，高 52px
│  ├──────────────────────────────────────────────────┤  │
│  │ 分组标签行：编辑器命令                            │  │  ← 分组标签行，高 28px，灰色小字
│  ├──────────────────────────────────────────────────┤  │
│  │ [图标]  命令标题            副标题       [快捷键] │  │  ← 命令项，高 48px
│  │ [图标]  命令标题（匹配高亮） 副标题       [快捷键] │  │
│  │ [图标]  命令标题                         [快捷键] │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 分组标签行：文档命令                              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ [图标]  命令标题                         [快捷键] │  │
│  │                    ...                            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 9.2 尺寸规格

| 属性 | 值 | 说明 |
|------|-----|------|
| 面板宽度 | 640px | 固定宽度 |
| 面板最大高度 | 480px | 超出时内部滚动 |
| 面板圆角 | 12px | |
| 搜索框高度 | 52px | |
| 命令项高度 | 48px | |
| 分组标签行高度 | 28px | |
| 面板距屏幕顶部 | 15vh | 视口高度的 15% |
| 左右内边距 | 12px | |
| 图标大小 | 16px | Lucide 图标 |
| 最多显示条数 | 12 | 超出时滚动 |

### 9.3 颜色规格

| 元素 | 亮色模式 | 暗色模式 |
|------|---------|---------|
| 面板背景 | `var(--color-bg-elevated)` | `var(--color-bg-elevated)` |
| overlay 背景 | `rgba(0, 0, 0, 0.40)` | `rgba(0, 0, 0, 0.60)` |
| 搜索框边框 | `var(--color-border)` | `var(--color-border)` |
| 命令项悬停/选中 | `var(--color-bg-hover)` | `var(--color-bg-hover)` |
| 匹配高亮字符 | `var(--color-accent)` + `font-weight: 700` | 同上 |
| 分组标签文字 | `var(--color-text-tertiary)` | 同上 |
| 快捷键标签 | `var(--color-bg-muted)` 背景，`var(--color-text-secondary)` 文字 | 同上 |
| 危险命令图标/文字 | `var(--color-error)` | 同上 |

### 9.4 匹配字符高亮渲染

利用 Fuse.js `includeMatches` 返回的区间数组，对命令 title 进行字符级高亮：

```typescript
function renderHighlightedTitle(title: string, matches: Fuse.FuseResultMatch[]): string {
  // 从 matches 中提取 title 字段的匹配区间
  const titleMatch = matches.find(m => m.key === 'title');
  if (!titleMatch) return escapeHtml(title);

  const ranges = titleMatch.indices;
  let result = '';
  let lastIndex = 0;

  for (const [start, end] of ranges) {
    result += escapeHtml(title.slice(lastIndex, start));
    result += `<mark class="cp-highlight">${escapeHtml(title.slice(start, end + 1))}</mark>`;
    lastIndex = end + 1;
  }
  result += escapeHtml(title.slice(lastIndex));
  return result;
}
```

```css
.cp-highlight {
  background: transparent;
  color: var(--color-accent);
  font-weight: 700;
}
```

---

## 10. 搜索历史与持久化

### 10.1 历史数据模型

```typescript
interface CommandHistoryEntry {
  commandId: string;
  executedAt: number; // Unix timestamp (ms)
  query: string;      // 触发时的搜索词（用于分析）
}

interface CommandHistory {
  entries: CommandHistoryEntry[];
  maxSize: 20; // 最多保留 20 条
}
```

### 10.2 持久化策略

- **存储位置**：IndexedDB，数据库名 `inkforge-command-palette`，Store 名 `history`
- **每次执行成功后**：将本次执行记录写入历史，若超过 20 条则删除最旧一条
- **读取时机**：命令面板打开时从 IndexedDB 读取（异步，不阻塞面板打开）
- **隐私保护**：历史仅存储 `commandId`，不存储文档内容或敏感信息
- **清除入口**：Settings > 通用 > 清除命令历史（含确认对话框）

### 10.3 历史加权算法

```typescript
function calculateHistoryBonus(commandId: string, history: CommandHistoryEntry[]): number {
  const recentEntries = history.slice(-20); // 最近 20 条
  const idx = recentEntries.findLastIndex(e => e.commandId === commandId);
  if (idx === -1) return 0;

  const recencyScore = (idx + 1) / recentEntries.length; // 越近越高
  if (idx >= recentEntries.length - 5) return 0.3;  // 最近 5 条：+0.3
  if (idx >= recentEntries.length - 20) return 0.1; // 最近 20 条：+0.1
  return 0;
}
```

---

## 11. 快速操作面板（空查询状态）

当用户打开命令面板但尚未输入任何查询词时，显示"快速操作面板"，分三个区域展示：

### 11.1 区域结构

```
┌─────────────────────────────────────┐
│  [搜索图标]  搜索命令...     [Esc]   │
├─────────────────────────────────────┤
│  最近使用                           │  ← 最近执行的 5 条命令（历史记录）
│  [命令项] ...                       │
├─────────────────────────────────────┤
│  常用命令                           │  ← `featured: true` 的命令（最多 5 条）
│  [命令项] ...                       │
├─────────────────────────────────────┤
│  收藏命令                           │  ← 用户手动收藏的命令（可选，最多 5 条）
│  [命令项] ...                       │
└─────────────────────────────────────┘
```

### 11.2 区域显示规则

- **最近使用**：从 IndexedDB 历史读取，按时间倒序，最多 5 条
- **常用命令**：从注册表中取 `featured: true` 的命令，按 CommandGroup 顺序排列
- **收藏命令**：用户可在命令项上右键"收藏此命令"，存储至 IndexedDB
- 若某个区域为空，则该区域标题行也不显示
- 总条数不超过 12 条

---

## 12. 键盘导航规格

| 按键 | 行为 |
|------|------|
| `Ctrl+K` / `Cmd+K` | 打开命令面板 |
| `Esc` | 关闭命令面板 |
| `↑` / `↓` | 在结果列表中移动焦点 |
| `Enter` | 执行当前焦点命令 |
| `Tab` | 若命令有子命令，展开子命令列表；否则执行命令 |
| `Shift+Tab` | 返回上一级（子命令 → 主命令列表） |
| `Home` | 跳到结果列表第一条 |
| `End` | 跳到结果列表最后一条 |
| `Ctrl+Enter` | 强制执行（跳过高风险命令确认弹窗，仅开发模式） |
| 任意可打印字符 | 聚焦搜索输入框并追加字符 |
| `Backspace` | 若搜索框非空则退格；若为空则清空当前过滤器 |

### 12.1 键盘焦点管理

- 面板打开时，焦点自动移到搜索输入框
- `↓` 键从搜索框移到第一个结果项
- `↑` 键从第一个结果项移回搜索框
- 面板关闭时，焦点返回到打开前的元素（`previouslyFocusedElement`）

---

## 13. 动效规格

### 13.1 面板打开动效

```css
/* overlay 淡入：80ms ease-out */
.cp-overlay-enter-active { transition: opacity 80ms ease-out; }
.cp-overlay-enter-from  { opacity: 0; }
.cp-overlay-enter-to    { opacity: 1; }

/* 面板：80ms ease-out + translateY(-8px → 0) */
.cp-panel-enter-active { transition: opacity 80ms ease-out, transform 80ms ease-out; }
.cp-panel-enter-from  { opacity: 0; transform: translateY(-8px); }
.cp-panel-enter-to    { opacity: 1; transform: translateY(0); }
```

### 13.2 结果列表 stagger 动效

```css
/* 每条结果项 stagger 20ms */
.cp-result-enter-active {
  transition: opacity 60ms ease-out, transform 60ms ease-out;
}
.cp-result-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
```

```typescript
// Vue Transition Group 的 stagger 延迟计算
function getStaggerDelay(index: number): string {
  return `${Math.min(index * 20, 200)}ms`; // 最多延迟 200ms（防止列表过长时卡顿感）
}
```

### 13.3 面板关闭动效

```css
.cp-overlay-leave-active { transition: opacity 60ms ease-in; }
.cp-overlay-leave-to    { opacity: 0; }

.cp-panel-leave-active  { transition: opacity 60ms ease-in, transform 60ms ease-in; }
.cp-panel-leave-to      { opacity: 0; transform: translateY(-4px); }
```

### 13.4 专注模式下动效规则

在专注模式（FocusMode 激活）下，上述所有动效持续时间减半（Writing Mode 尊重 iA Writer 哲学，减少视觉噪音）。

---

## 14. Vue 组件完整接口

### 14.1 CommandPalette.vue

```typescript
// Props
interface CommandPaletteProps {
  // 命令面板无外部 Props，全部通过 Store 驱动
}

// Emits
interface CommandPaletteEmits {
  // 命令执行成功（供父组件做额外处理，如 Analytics）
  (event: 'command-executed', commandId: string): void;
  // 面板关闭
  (event: 'close'): void;
}

// Expose（供父组件调用）
interface CommandPaletteExpose {
  /** 程序化打开命令面板 */
  open(options?: OpenOptions): void;
  /** 程序化关闭命令面板 */
  close(): void;
  /** 设置搜索词（用于程序化搜索） */
  setQuery(query: string): void;
}

interface OpenOptions {
  /** 初始搜索词 */
  initialQuery?: string;
  /** 预设上下文过滤器 */
  contextFilter?: CommandContextTag[];
}
```

### 14.2 CommandPaletteItem.vue

```typescript
// Props
interface CommandPaletteItemProps {
  command: Command;
  /** Fuse.js 返回的匹配区间（用于高亮渲染） */
  matches: Fuse.FuseResultMatch[];
  /** 是否为当前焦点项 */
  isActive: boolean;
  /** 在列表中的索引（用于 stagger 动效） */
  index: number;
}

// Emits
interface CommandPaletteItemEmits {
  (event: 'select', commandId: string): void;
  (event: 'focus', commandId: string): void;
  (event: 'favorite', commandId: string): void;
}
```

### 14.3 CommandPaletteGroupLabel.vue

```typescript
// Props
interface CommandPaletteGroupLabelProps {
  group: CommandGroup;
  /** 该分组下的命令数量 */
  count: number;
}
```

---

## 15. Pinia Store 完整接口

```typescript
// src/stores/command-palette.ts

interface CommandPaletteState {
  /** 面板是否打开 */
  isOpen: boolean;
  /** 当前搜索词 */
  query: string;
  /** 当前焦点项的 commandId */
  activeCommandId: string | null;
  /** 搜索结果列表 */
  results: SearchResult[];
  /** 是否正在搜索（异步场景） */
  isLoading: boolean;
  /** 命令执行历史（最近 20 条） */
  history: CommandHistoryEntry[];
  /** 用户收藏的命令 id 列表 */
  favorites: string[];
  /** 当前展开的子命令 id（若有） */
  expandedSubcommandParent: string | null;
}

interface CommandPaletteActions {
  /** 打开命令面板 */
  open(options?: OpenOptions): void;
  /** 关闭命令面板 */
  close(): void;
  /** 更新搜索词（触发重新搜索） */
  setQuery(query: string): void;
  /** 移动焦点 */
  moveFocus(direction: 'up' | 'down'): void;
  /** 执行当前焦点命令 */
  executeActive(context: CommandContext): Promise<void>;
  /** 执行指定命令 */
  executeCommand(commandId: string, context: CommandContext): Promise<void>;
  /** 加载历史记录（从 IndexedDB） */
  loadHistory(): Promise<void>;
  /** 收藏/取消收藏命令 */
  toggleFavorite(commandId: string): void;
  /** 清除历史记录 */
  clearHistory(): Promise<void>;
}

interface CommandPaletteGetters {
  /** 当前焦点命令对象 */
  activeCommand: (state: CommandPaletteState) => Command | null;
  /** 按分组聚合的结果（用于 UI 分组渲染） */
  groupedResults: (state: CommandPaletteState) => GroupedResults;
  /** 是否显示快速操作面板（无搜索词） */
  showQuickPanel: (state: CommandPaletteState) => boolean;
}

type GroupedResults = {
  group: CommandGroup;
  label: string;
  commands: SearchResult[];
}[];
```

---

## 16. TypeScript 类型全量定义

```typescript
// src/types/command-palette.ts

export enum CommandGroup {
  Editor = 'editor',
  Document = 'document',
  Hub = 'hub',
  Export = 'export',
  Publish = 'publish',
  View = 'view',
  Settings = 'settings',
  AI = 'ai',
  Extension = 'extension',
}

export enum CommandScope {
  /** 任何位置可执行 */
  Global = 'global',
  /** 需要打开的文档 */
  Document = 'document',
  /** 需要编辑器焦点 */
  Editor = 'editor',
  /** 仅 Hub 页面 */
  Hub = 'hub',
}

export enum CommandContextTag {
  Global = 'global',
  Document = 'document',
  Editor = 'editor',
  Selection = 'selection',
  CodeBlockContext = 'codeBlockContext',
  TableContext = 'tableContext',
  ListContext = 'listContext',
  ImageContext = 'imageContext',
  MathContext = 'mathContext',
  HubPage = 'hubPage',
  FileManagerPage = 'fileManagerPage',
  SettingsPage = 'settingsPage',
}

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  keywords: string[];
  icon: string;
  scope: CommandScope;
  handler: (context: CommandContext) => Promise<void> | void;
  shortcut?: string;
  group: CommandGroup;
  contexts: CommandContextTag[];
  isDestructive?: boolean;
  requiresVersionCheckpoint?: boolean;
  auditLogged?: boolean;
  subcommands?: SubCommand[];
  requiredPermissions?: Permission[];
  featured?: boolean;
  since?: string;
}

export interface SubCommand {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  handler: (context: CommandContext) => Promise<void> | void;
  isDestructive?: boolean;
}

export interface CommandContext {
  activeDocumentId: string | null;
  cursorContext: CursorContext | null;
  selection: EditorSelection | null;
  editorMode: 'typora' | 'source' | 'preview' | null;
  currentRoute: string;
  triggerSource: 'keyboard' | 'toolbar' | 'context-menu';
}

export interface CursorContext {
  blockType: 'paragraph' | 'heading' | 'codeBlock' | 'table' |
             'tableCell' | 'image' | 'mathBlock' | 'detailsBlock' |
             'listItem' | 'blockquote' | 'footnote';
  inCodeBlock: boolean;
  inTable: boolean;
  headingLevel: number | null;
  hasSelection: boolean;
}

export interface EditorSelection {
  from: number;
  to: number;
  text: string;
}

export interface SearchResult {
  command: Command;
  score: number;
  matches: Fuse.FuseResultMatch[];
}

export interface CommandHistoryEntry {
  commandId: string;
  executedAt: number;
  query: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  permissions: Permission[];
  sandboxLevel: 'strict' | 'standard';
}

export interface RegisterResult {
  registered: string[];
  rejected: { id: string; reason: string }[];
}

export type Permission =
  | 'document.read'
  | 'document.write'
  | 'document.delete'
  | 'settings.read'
  | 'settings.write'
  | 'export.execute'
  | 'publish.execute'
  | 'network.request';

export class DuplicateCommandError extends Error {
  constructor(commandId: string) {
    super(`Command with id "${commandId}" is already registered`);
    this.name = 'DuplicateCommandError';
  }
}

export class PermissionDeniedError extends Error {
  constructor(commandId: string, permission: Permission) {
    super(`Command "${commandId}" requires permission "${permission}"`);
    this.name = 'PermissionDeniedError';
  }
}
```

---

## 17. 扩展 API

扩展通过 `CommandRegistry.registerExtension` 注册命令，需在 ExtensionManifest 中声明所需权限。

### 17.1 注册示例

```typescript
// 扩展 manifest 声明
const myExtensionManifest: ExtensionManifest = {
  id: 'my-awesome-plugin',
  name: 'My Awesome Plugin',
  version: '1.0.0',
  permissions: ['document.read', 'export.execute'],
  sandboxLevel: 'standard',
};

// 扩展命令定义
const myCommands: Command[] = [
  {
    id: 'ext.my-awesome-plugin.doSomething',
    title: '执行我的操作',
    subtitle: 'My Awesome Plugin',
    keywords: ['my', 'awesome', 'plugin'],
    icon: 'Sparkles',
    scope: CommandScope.Document,
    group: CommandGroup.Extension,
    contexts: [CommandContextTag.Document],
    auditLogged: true,
    handler: async (ctx) => {
      // 扩展逻辑
    },
  },
];

// 注册
const result = registry.registerExtension(
  'my-awesome-plugin',
  myCommands,
  myExtensionManifest
);
```

### 17.2 扩展命令限制

- 扩展命令的 `id` 必须以 `ext.{extensionId}.` 开头
- 扩展命令只能访问其 manifest 中声明的权限
- 扩展命令执行在沙箱环境中，无法直接访问 DOM（通过 InkForge API 代理）
- 扩展卸载时，`registry.unregisterExtensionCommands(extensionId)` 自动清理

### 17.3 扩展命令审计

所有扩展命令执行均强制写入 `activity_logger`，且来源标记为 `source: 'extension:{extensionId}'`，符合 L1-34 全范围审计铁律。

---

## 18. 性能要求

| 指标 | 目标 | 降级策略 |
|------|------|---------|
| 面板打开延迟（从快捷键到可见） | ≤ 60ms | 超过 100ms 时显示 spinner |
| 搜索响应延迟（输入到结果更新） | ≤ 30ms | 异步搜索时显示加载态 |
| 搜索索引构建时间（启动时） | ≤ 200ms | 延迟到空闲时重建 |
| 最大注册命令数 | 500 条 | 超过 200 条时启用 Web Worker 搜索 |
| IndexedDB 历史读取 | ≤ 50ms | 读取失败时降级为内存空历史 |

### 18.1 搜索优化策略

- 命令注册完成后立即构建 Fuse.js 索引（异步，不阻塞启动）
- 索引存储在内存中，面板打开时直接使用无需重建
- 搜索添加 16ms 防抖（requestAnimationFrame 级别），避免高频输入时重复搜索
- 超过 200 条命令时将搜索移至 Web Worker 执行

---

## 19. 无障碍（a11y）要求

- 面板容器使用 `role="dialog"` + `aria-label="命令面板"` + `aria-modal="true"`
- 搜索输入框：`role="combobox"` + `aria-expanded` + `aria-activedescendant`（指向当前焦点项）
- 结果列表：`role="listbox"` + `aria-label="搜索结果"`
- 每个结果项：`role="option"` + `aria-selected`
- 分组标签行：`role="group"` + `aria-label="{分组名}"`
- 面板打开时焦点自动移入，关闭时焦点返回触发元素
- 支持系统级高对比度模式（通过 `prefers-contrast: high` CSS 媒体查询）
- 快捷键标签不参与焦点链（`tabindex="-1"`）

---

## 20. 测试矩阵

| # | 测试类型 | 测试描述 | 预期结果 |
|---|----------|----------|----------|
| 1 | 单元 | `CommandRegistry.register()` 注册新命令 | 命令存储到 Map，byGroup 和 byContext 索引更新 |
| 2 | 单元 | `CommandRegistry.register()` 注册重复 id | 抛出 `DuplicateCommandError` |
| 3 | 单元 | `FuzzySearchEngine.search("bold")` | 返回 `editor.toggleBold` 作为第一条结果 |
| 4 | 单元 | `FuzzySearchEngine.search("bld")` | 模糊匹配返回 `editor.toggleBold`（typo 容忍） |
| 5 | 单元 | `FuzzySearchEngine.search("")` 空查询 | 返回空列表（由快速面板处理） |
| 6 | 单元 | 上下文过滤：光标在代码块，格式化命令不可见 | isCommandVisible 返回 false |
| 7 | 单元 | 上下文过滤：全局命令在任何上下文可见 | isCommandVisible 始终返回 true |
| 8 | 单元 | 历史加权：最近 5 条命令排名提升 | 相同 score 时历史命令排序靠前 |
| 9 | 单元 | `calculateHistoryBonus` 对最近 5 条返回 0.3 | bonus = 0.3 |
| 10 | 单元 | `CommandExecutor.canExecute` 权限不足 | 返回 `{ canExecute: false, reason: 'permission_denied' }` |
| 11 | 单元 | 高风险命令执行前显示确认对话框 | `confirmDestructive` 被调用 |
| 12 | 单元 | 用户取消高风险命令确认 | handler 不执行，面板不关闭 |
| 13 | 单元 | `requiresVersionCheckpoint: true` 命令执行 | VersionManager.createCheckpoint 被调用 |
| 14 | 单元 | `auditLogged: true` 命令执行成功 | ActivityLogger.log 被调用，含 commandId |
| 15 | 单元 | 命令执行抛出异常 | ActivityLogger.log 被调用含错误；Toast 显示错误 |
| 16 | 集成 | 快捷键 `Ctrl+K` 打开命令面板 | Store `isOpen` 变为 true，面板 DOM 渲染 |
| 17 | 集成 | `Esc` 键关闭命令面板 | Store `isOpen` 变为 false，面板 DOM 卸载 |
| 18 | 集成 | 键盘 `↓` 从搜索框移到第一个结果 | 第一个结果项获得焦点 |
| 19 | 集成 | 键盘 `↑` 从第一个结果移回搜索框 | 搜索框重新获得焦点 |
| 20 | 集成 | 键盘 `Enter` 执行当前焦点命令 | handler 被调用，面板关闭 |
| 21 | 集成 | `Tab` 键展开有子命令的命令 | 子命令列表展示 |
| 22 | 集成 | 输入搜索词后结果在 30ms 内更新 | 性能计时验证 ≤ 30ms |
| 23 | 集成 | 面板打开动效在 80ms 内完成 | CSS transition 时长验证 |
| 24 | 集成 | 搜索历史写入 IndexedDB | 执行命令后 IndexedDB 有新记录 |
| 25 | 集成 | 面板重新打开时从 IndexedDB 读取历史 | 历史区域显示上次执行的命令 |
| 26 | 集成 | 无搜索词时显示快速操作面板 | 最近/常用/收藏三个区域渲染 |
| 27 | 集成 | 扩展注册命令出现在命令面板 | 扩展命令在 Extension 分组可见 |
| 28 | 集成 | 扩展卸载后命令从面板消失 | unregisterExtensionCommands 后命令不可见 |
| 29 | 集成 | 扩展命令超出声明权限范围 | registerExtension 返回 rejected 列表 |
| 30 | 无障碍 | 屏幕阅读器宣读命令项和当前焦点 | role/aria 属性正确，VoiceOver 可操作 |
| 31 | 无障碍 | 面板关闭后焦点返回触发元素 | `previouslyFocusedElement.focus()` 被调用 |
| 32 | 性能 | 注册 500 条命令后搜索延迟 | 仍满足 ≤ 30ms 要求 |
| 33 | 性能 | 搜索索引构建时间 | ≤ 200ms（通过 performance.mark 验证） |
| 34 | 错误处理 | IndexedDB 读取失败 | 降级为空历史，面板正常工作 |
| 35 | 错误处理 | 命令 handler 内部 throw | Toast 显示错误，面板不崩溃 |

---

*本文档覆盖 CommandPalette 从架构、数据模型、注册 API、执行器、搜索引擎到 UI 规格、组件接口、Store 接口的完整技术规格，共计约 950 行，版本 v2.1 Draft。*

## 21. 2026-04-30 Compatible Baseline Implementation Note

Baseline status: the compatible Command Palette baseline is implemented and validated. Full Spec 22 remains partially pending because workflow composition, extension sandbox execution, full AI command coverage, destructive lifecycle commands, Web Worker search at scale, complete activity logger persistence, and the full 35-case matrix are outside this baseline slice.

Implemented baseline coverage:

- Added typed command-palette contracts, including command groups, scopes, context tags, permissions, search results, history entries, errors, and the Workstation bridge.
- Added `CommandRegistry`, `CommandExecutor`, local `FuzzySearchEngine`, IndexedDB-backed `CommandPalettePersistence`, built-in command registration, Pinia store state, and the Teleport-based `CommandPalette.vue` UI.
- Registered only real commands that route to existing Hub, Drafts, Settings, Publish, Article Store, or Workstation bridge behavior. No fake AI command, fake file-manager command, destructive command, simulated export success, or sample document command was added.
- Wired App-level command registration and route/document context synchronization.
- Wired Workstation bridge actions for Focus Mode, Typewriter Mode, editor mode switching, manager sidebar, preview mode, and the existing export modal.
- Preserved existing editor shortcuts: `Ctrl+K` and `Ctrl+Shift+K` are ignored when the target is native editable, `role="textbox"`, or inside `contenteditable="true"`, so link and code-block shortcuts keep their editor behavior.
- Kept the `Ctrl+Shift+K` document/editor filtered command-palette entry from non-editable Workstation chrome.
- Fixed Web preview encryption parity: pure Web production preview no longer enables the Tauri-only master-key encryption path before the Web password unlock UI exists; Tauri production runtime still enables encryption through runtime detection.
- Fixed a command history race by versioning async persistence loads and merging saved history from IndexedDB before writing, so quick execution after opening the palette is not overwritten by a stale load.

Validation evidence:

- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec vitest run src/services/command/fuzzy-search.test.ts` passed with 1 test file and 6 tests.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm build` passed after stopping the old preview process; the only remaining warnings were the existing Vite dynamic/static import and chunk-size warnings.
- Production preview smoke on `http://127.0.0.1:5180/` verified `Ctrl+K`, `Ctrl+Shift+K`, real `New document` creation through IndexedDB, Workstation route selection, Focus Mode command execution, real export modal opening, editor-content shortcut protection, Settings Appearance routing, Recent history persistence, and zero browser console errors.
