> 版本: v2.1 | 状态: Draft | 关联决策: L1-50 B(修订) / L1-51 C / L1-52 A / P-01 / P-02 / T06-08 D | 依赖 Spec: 06-settings-spec.md / 14-account-spec.md

# FTUE 首次使用体验与内置帮助系统技术规格说明

---

## 目录

1. 功能概述与设计哲学
2. FTUE 状态机
3. 首次启动欢迎流程
4. 上下文帮助系统
5. Markdown 速查卡
6. 快捷键卡片
7. 内置帮助文档
8. 帮助搜索
9. 引导重置
10. i18n 国际化
11. Vue 组件完整接口
12. Pinia Store 完整接口
13. TypeScript 类型全量定义
14. 气泡定位算法
15. 性能与存储
16. 无障碍（a11y）要求
17. 测试矩阵

---

## 1. 功能概述与设计哲学

### 1.1 核心设计原则

基于 L1-50 的用户明确反馈："**我讨厌引导，做轻量和欢迎即可，不需要示例文档**"，InkForge v2.1 的 FTUE 遵循以下原则：

**克制、被动、可调出**：用户第一次启动时只看到简洁的欢迎弹窗，不强迫走引导，不自动创建示例内容，所有帮助信息均为被动调出（用户主动触发）。

**全功能即时可见**（L1-52 A）：所有功能从第一天起完全可见，不分阶段发现，不加"New"徽标，不做进度式解锁。

**上下文感知帮助**（L1-51 C）：提供上下文敏感的气泡帮助，帮助信息在用户第一次使用某功能时出现，之后不再重复弹出。

**帮助系统完全独立于 FTUE**：用户跳过欢迎流程后，帮助系统（? 按键、速查卡、快捷键卡）依然随时可访问。

### 1.2 FTUE vs 帮助系统的边界

| 范畴 | FTUE | 帮助系统 |
|------|------|---------|
| 触发时机 | 首次安装后一次性 | 随时可调出 |
| 主要形态 | WelcomeModal | 上下文气泡 / 速查卡 / 快捷键卡 |
| 可重复触发 | 否（除非手动重置） | 是 |
| 内容 | 品牌 + 账户创建 | 功能说明 + 语法速查 + 快捷键 |

---

## 2. FTUE 状态机

### 2.1 状态定义

```typescript
enum FTUEStep {
  /** 尚未开始（全新安装） */
  NotStarted = 'not_started',
  /** 欢迎弹窗已显示 */
  WelcomeShown = 'welcome_shown',
  /** 账户创建/导入步骤 */
  AccountSetup = 'account_setup',
  /** 完成 */
  Completed = 'completed',
  /** 用户明确跳过 */
  Skipped = 'skipped',
}
```

### 2.2 状态转移图

```
NotStarted
    │
    │ (应用首次启动)
    ▼
WelcomeShown
    │
    ├──"开始使用"──▶ AccountSetup
    │                    │
    │                    ├──"创建账户"──▶ Completed
    │                    │
    │                    └──"导入数据"──▶ Completed
    │
    └──"跳过"──▶ Skipped
                    │
                    └──(也会进入 Hub，功能全部可见)
```

状态机强制约束：
- 不存在从 `Completed` 或 `Skipped` 自动回到前面步骤的路径
- `Skipped` 与 `Completed` 的区别只在于"是否完成了账户创建"，对 UI 可见性没有差异
- 手动重置（Settings > 通用 > 重置引导）将 `ftue.step` 重置为 `NotStarted`，下次启动重新触发

### 2.3 持久化

FTUE 状态持久化至 IndexedDB，数据库：`inkforge-settings`，Store：`ftue`。

```typescript
interface FTUEState {
  step: FTUEStep;
  startedAt: number | null;      // Unix timestamp，首次触发时间
  completedAt: number | null;    // Unix timestamp，完成或跳过时间
  onboardingPath: 'create' | 'import' | null;  // 用户选择的路径
}
```

### 2.4 首次启动检测逻辑

```typescript
async function checkFirstRun(): Promise<boolean> {
  const ftueState = await db.ftue.get('state');
  if (!ftueState) return true;
  return ftueState.step === FTUEStep.NotStarted;
}
```

---

## 3. 首次启动欢迎流程

### 3.1 WelcomeModal 设计规格

WelcomeModal 是 FTUE 的唯一视觉入口，在首次启动时自动展示。

**尺寸**：480px 宽，自适应高度，垂直居中于屏幕

**结构**：
```
┌──────────────────────────────────────┐
│                                      │
│          [InkForge Logo]             │
│                                      │
│       InkForge                       │
│       Markdown-first 深度写作工具    │
│                                      │
│  ┌──────────────────────────────┐   │
│  │     开始使用 InkForge         │   │  ← 主按钮（蓝色强调）
│  └──────────────────────────────┘   │
│                                      │
│         跳过，直接进入              │  ← 次要链接，不是按钮
│                                      │
└──────────────────────────────────────┘
```

**内容要求**：
- 品牌 Logo + 应用名称
- 一句话产品定位（不超过 20 字，中文）
- 不含任何功能介绍、教程链接、视频入口
- 不含 emoji（L1-39 A + T09-13 D）
- 不含示例截图（避免 UI 过时）

### 3.2 FirstRunDispatcher 流程

用户点击"开始使用"后进入 `FirstRunDispatcher`，这是一个内嵌在 WelcomeModal 中的步骤（不跳转页面）：

```
[WelcomeModal Step 1: 欢迎]
         │ 点击"开始使用"
         ▼
[WelcomeModal Step 2: 账户路径选择]

  ┌─────────────────────────────────┐
  │  选择你的起点                   │
  │                                 │
  │  ○  创建新账户                  │  ← 单选卡片
  │     从零开始，创建你的写作空间   │
  │                                 │
  │  ○  导入已有数据                │  ← 单选卡片
  │     从 Markdown 文件夹或备份导入 │
  │                                 │
  │  [继续]                         │
  └─────────────────────────────────┘
```

**路径 A：创建新账户**
- 展示账户创建表单（用户名 / 可选头像）
- 创建成功后写入 `ftue.step = Completed`，`ftue.onboardingPath = 'create'`
- 跳转到 Hub（空状态，正常 UI，无任何引导覆盖层）

**路径 B：导入已有数据**
- 打开文件/文件夹选择器（Tauri 文件对话框）
- 执行导入任务（后台），完成后写入 `ftue.step = Completed`，`ftue.onboardingPath = 'import'`
- 跳转到 Hub（显示导入的文档）

**跳过路径**：
- 直接写入 `ftue.step = Skipped`
- 跳转到 Hub（空状态）
- 跳过后应用正常可用，所有功能全部开放

### 3.3 硬性禁止事项

- **禁止**：自动创建示例文章、示例分类、示例模板（L1-50 补充）
- **禁止**：匿名模式入口（T06-08 补充"拒绝匿名"）
- **禁止**：多步骤分页引导（step-by-step tutorial）
- **禁止**：强制观看视频或文档
- **禁止**：给任何功能加"New"徽标（L1-52 A）
- **禁止**：Coach Mark 或 Spotlight 遮罩覆盖 UI

### 3.4 空状态 Hub 设计

FTUE 完成后，Hub 在没有文档时显示空状态（而非引导步骤）：

```
┌────────────────────────────────────────┐
│                                        │
│          [纸张图标，线框风格]           │
│                                        │
│       从第一篇文章开始                  │
│                                        │
│  ┌────────────────┐                    │
│  │   新建文档     │                    │  ← 唯一的操作入口
│  └────────────────┘                    │
│                                        │
│  或拖拽 Markdown 文件到这里            │  ← 次要提示
│                                        │
└────────────────────────────────────────┘
```

---

## 4. 上下文帮助系统

### 4.1 设计概述

上下文帮助系统在用户**第一次**与某个功能区域交互时，通过气泡（Tooltip/Popover）提供简短说明。气泡会记录"已读"状态，不再重复弹出。

### 4.2 上下文帮助触发条件

每个可触发帮助气泡的功能区域有唯一的 `helpKey`。触发逻辑：

```typescript
async function shouldShowContextHelp(helpKey: HelpKey): Promise<boolean> {
  const seenKeys = await db.ftue.get('seenHelpKeys') ?? [];
  return !seenKeys.includes(helpKey);
}

async function markHelpAsSeen(helpKey: HelpKey): Promise<void> {
  const seenKeys = await db.ftue.get('seenHelpKeys') ?? [];
  if (!seenKeys.includes(helpKey)) {
    await db.ftue.put('seenHelpKeys', [...seenKeys, helpKey]);
  }
}
```

### 4.3 HelpKey 枚举

```typescript
enum HelpKey {
  /** Hub 页面首次访问 */
  HubWelcome = 'hub.welcome',
  /** 文件管理器首次打开 */
  FileManagerIntro = 'file-manager.intro',
  /** 斜杠命令首次使用 */
  SlashCommandIntro = 'slash-command.intro',
  /** 浮动工具栏首次出现 */
  FloatingToolbarIntro = 'floating-toolbar.intro',
  /** 专注模式首次激活 */
  FocusModeIntro = 'focus-mode.intro',
  /** 版本历史首次打开 */
  VersionHistoryIntro = 'version-history.intro',
  /** 导出功能首次使用 */
  ExportIntro = 'export.intro',
  /** 发布功能首次使用 */
  PublishIntro = 'publish.intro',
  /** 命令面板首次打开 */
  CommandPaletteIntro = 'command-palette.intro',
  /** 回收站首次访问 */
  TrashIntro = 'trash.intro',
  /** 模板选择首次使用 */
  TemplatesIntro = 'templates.intro',
  /** 草稿箱首次访问 */
  DraftsIntro = 'drafts.intro',
  /** 快速笔记功能首次触发 */
  QuickNoteIntro = 'quick-note.intro',
  /** StatusBar 首次交互 */
  StatusBarIntro = 'status-bar.intro',
  /** 写作目标首次设置 */
  WritingGoalIntro = 'writing-goal.intro',
}
```

### 4.4 上下文帮助气泡规格

**气泡组件**：`ContextHelpBubble.vue`

**内容结构**：
```
┌──────────────────────────────────┐
│ [功能图标]  功能名称              │  ← 标题行
│                                  │
│  简短说明文字（不超过 60 字）      │  ← 说明
│                                  │
│  [了解更多]              [知道了] │  ← 操作按钮
└──────────────────────────────────┘
```

**行为规格**：
- 气泡出现时带淡入动效（`opacity: 0 → 1`，120ms ease-out）
- 点击"知道了"：气泡消失，`markHelpAsSeen(helpKey)` 被调用
- 点击"了解更多"：打开对应帮助文档页面（`/help/zh/{topic}`），同时标记已读
- 点击气泡外部区域：气泡**不**自动消失（防止误触关闭）
- 按 `Esc` 键：气泡消失并标记已读
- 气泡最多同时显示 1 个（不堆叠）

**气泡定位**：使用 Floating UI 库（见第 14 节），确保气泡不超出视口。

---

## 5. Markdown 速查卡

### 5.1 触发方式

| 触发方式 | 说明 |
|----------|------|
| `Ctrl+/` | 全局快捷键，任何页面打开速查卡 |
| StatusBar "?" 图标 | 在编辑器界面点击 |
| 命令面板 `help.openCheatsheet` | 通过命令面板打开 |
| 上下文帮助气泡"了解更多"链接 | 进入相关章节 |

### 5.2 速查卡内容结构

速查卡以抽屉（Drawer）形式从右侧滑入，宽度 360px，不覆盖编辑区（与编辑区并列）。

**内容章节**（固定顺序）：

```
标题语法（H1 ~ H6）
文字格式（加粗/斜体/删除线/行内代码/高亮）
链接与图片（[文字](url) / ![alt](url)）
列表（无序/有序/任务列表）
引用块（>）
代码块（``` lang）
表格（pipe 语法）
数学公式（$ ... $ / $$ ... $$）
脚注（[^1]）
折叠块（<details>）
内链（[[文章名]]）
目录宏（[toc]）
Frontmatter（--- yaml ---）
InkForge 专属语法（高亮颜色等）
快捷键速查（链接到快捷键卡片）
```

### 5.3 速查卡组件接口

```typescript
// MarkdownCheatsheet.vue

interface MarkdownCheatsheetProps {
  /** 初始展开的章节（可选，如从帮助气泡跳转时预定位） */
  initialSection?: CheatsheetSection;
}

interface MarkdownCheatsheetEmits {
  (event: 'close'): void;
  (event: 'navigate-to-docs', topic: string): void;
}

enum CheatsheetSection {
  Headings = 'headings',
  Formatting = 'formatting',
  LinksImages = 'links-images',
  Lists = 'lists',
  Blockquote = 'blockquote',
  CodeBlocks = 'code-blocks',
  Tables = 'tables',
  Math = 'math',
  Footnotes = 'footnotes',
  Details = 'details',
  WikiLinks = 'wiki-links',
  TOC = 'toc',
  Frontmatter = 'frontmatter',
  InkForgeExtensions = 'inkforge-extensions',
}
```

### 5.4 速查卡语法示例展示格式

每个语法条目包含三部分：
1. **语法**：Markdown 源码（代码块风格，等宽字体）
2. **效果**：渲染后的效果（通过 InkForge 渲染引擎实时渲染）
3. **说明**：一行简短文字说明（不超过 30 字）

示例展示组件：`SyntaxExample.vue`，Props：
```typescript
interface SyntaxExampleProps {
  markdown: string;    // Markdown 源码
  description: string; // 说明文字
}
```

---

## 6. 快捷键卡片

### 6.1 触发方式

| 触发方式 | 说明 |
|----------|------|
| `Ctrl+Shift+/` | 全局快捷键 |
| Settings > 快捷键 页面入口 | 在设置中查看 |
| 速查卡底部"查看快捷键" | 从速查卡跳转 |
| 命令面板 `help.openKeyboardShortcuts` | 通过命令面板 |

### 6.2 快捷键分组

快捷键卡片以模态对话框形式展示，按功能分组，支持在分组 Tab 之间切换：

| 分组 Tab | 覆盖范围 |
|----------|---------|
| 编辑器 | 格式化、插入、选择、光标移动 |
| 文档 | 新建、保存、重命名、状态变更 |
| 视图 | 专注模式、预览、侧边栏、模式切换 |
| 导航 | Hub、文件管理器、搜索、标签页 |
| 命令 | 命令面板、斜杠命令、快速笔记 |
| 系统 | 设置、账户、撤销/重做 |

### 6.3 快捷键数据结构

```typescript
interface KeyboardShortcut {
  /** 快捷键描述 */
  description: string;
  /** Windows/Linux 快捷键 */
  windows: string;
  /** macOS 快捷键 */
  mac: string;
  /** 所属分组 */
  group: ShortcutGroup;
  /** 是否可被用户自定义 */
  customizable: boolean;
}

enum ShortcutGroup {
  Editor = 'editor',
  Document = 'document',
  View = 'view',
  Navigation = 'navigation',
  Command = 'command',
  System = 'system',
}
```

### 6.4 完整快捷键列表（部分）

| 描述 | Windows/Linux | macOS | 分组 |
|------|--------------|-------|------|
| 加粗 | `Ctrl+B` | `Cmd+B` | Editor |
| 斜体 | `Ctrl+I` | `Cmd+I` | Editor |
| 删除线 | `Ctrl+Shift+S` | `Cmd+Shift+S` | Editor |
| 行内代码 | `` Ctrl+` `` | `` Cmd+` `` | Editor |
| 高亮 | `Ctrl+Shift+H` | `Cmd+Shift+H` | Editor |
| 插入链接 | `Ctrl+K` | `Cmd+K`（冲突注意：命令面板也用此键） | Editor |
| 新建文档 | `Ctrl+N` | `Cmd+N` | Document |
| 保存 | `Ctrl+S` | `Cmd+S` | Document |
| 版本快照 | `Ctrl+Shift+S` | `Cmd+Shift+S` | Document |
| 打开命令面板 | `Ctrl+K` | `Cmd+K` | Command |
| 打开速查卡 | `Ctrl+/` | `Cmd+/` | Command |
| 打开快捷键卡 | `Ctrl+Shift+/` | `Cmd+Shift+/` | System |
| 切换专注模式 | `Ctrl+Shift+F` | `Cmd+Shift+F` | View |
| 切换预览面板 | `Ctrl+Shift+P` | `Cmd+Shift+P` | View |
| 切换侧边栏 | `Ctrl+[` | `Cmd+[` | View |
| 切换编辑模式 | `Ctrl+\` | `Cmd+\` | View |
| 返回 Hub | `Ctrl+Shift+H` | `Cmd+Shift+H` | Navigation |
| 全局搜索 | `Ctrl+F` | `Cmd+F` | Navigation |
| 快速笔记 | `Ctrl+Alt+N` | `Ctrl+Opt+N` | Command |
| 打开设置 | `Ctrl+,` | `Cmd+,` | System |
| 撤销 | `Ctrl+Z` | `Cmd+Z` | Editor |
| 重做 | `Ctrl+Y` / `Ctrl+Shift+Z` | `Cmd+Shift+Z` | Editor |
| 关闭标签页 | `Ctrl+W` | `Cmd+W` | Navigation |
| 在新窗口打开 | `Ctrl+Shift+N` | `Cmd+Shift+N` | Navigation |
| 文档属性 | `Ctrl+Shift+I` | `Cmd+Shift+I` | Document |
| 版本历史 | `Ctrl+Shift+V` | `Cmd+Shift+V` | Document |

### 6.5 快捷键卡片组件接口

```typescript
// KeyboardShortcutsCard.vue

interface KeyboardShortcutsCardProps {
  /** 初始激活的分组 Tab */
  initialGroup?: ShortcutGroup;
}

interface KeyboardShortcutsCardEmits {
  (event: 'close'): void;
  (event: 'navigate-to-settings'): void; // 跳转到快捷键设置
}

interface KeyboardShortcutsCardExpose {
  /** 程序化跳转到指定分组 */
  scrollToGroup(group: ShortcutGroup): void;
}
```

---

## 7. 内置帮助文档

### 7.1 设计决策

基于 L1-51 C（速查卡 + 上下文气泡），InkForge v2.1 **不**做完整内置帮助文档（L1-51 未选 D）。但需提供基础的"话题文档"供上下文帮助气泡的"了解更多"链接跳转。

### 7.2 帮助话题文档

帮助话题文档采用 Markdown 格式，由 InkForge 渲染引擎渲染展示（非 Web 外链）。

文件路径：`src/assets/help/zh/`（中文），`src/assets/help/en/`（英文）

**话题文档列表**（v2.1 必须提供）：

| 文件名 | 话题 | 关联 HelpKey |
|--------|------|-------------|
| `getting-started.md` | 快速入门 | `HubWelcome` |
| `markdown-basics.md` | Markdown 基础语法 | `SlashCommandIntro` |
| `typora-mode.md` | 排版模式说明 | `FloatingToolbarIntro` |
| `focus-mode.md` | 专注模式 | `FocusModeIntro` |
| `version-history.md` | 版本历史与恢复 | `VersionHistoryIntro` |
| `export.md` | 导出说明 | `ExportIntro` |
| `publish.md` | 发布到平台 | `PublishIntro` |
| `command-palette.md` | 命令面板使用 | `CommandPaletteIntro` |
| `templates.md` | 文档模板 | `TemplatesIntro` |
| `drafts.md` | 草稿箱 | `DraftsIntro` |

### 7.3 帮助文档展示组件

```typescript
// HelpDocViewer.vue

interface HelpDocViewerProps {
  /** 话题文档文件名（不含路径和扩展名） */
  topic: string;
  /** 是否以模态形式展示（否则作为全页展示） */
  modal?: boolean;
}

interface HelpDocViewerEmits {
  (event: 'close'): void;
  (event: 'navigate', topic: string): void;
}
```

---

## 8. 帮助搜索

### 8.1 搜索范围

帮助搜索（由 MiniSearch 驱动）覆盖：
- Markdown 速查卡所有条目（语法名称 + 说明）
- 快捷键卡片所有条目（描述 + 分组名）
- 话题文档标题和段落（分词后索引）

### 8.2 MiniSearch 配置

```typescript
import MiniSearch from 'minisearch';

const helpSearchIndex = new MiniSearch<HelpSearchEntry>({
  fields: ['title', 'content', 'tags'],
  storeFields: ['title', 'type', 'topic', 'anchor'],
  searchOptions: {
    boost: { title: 2 },
    fuzzy: 0.2,
    prefix: true,
  },
});

interface HelpSearchEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: 'cheatsheet' | 'shortcut' | 'doc';
  topic?: string;    // 话题文档文件名（type === 'doc' 时）
  anchor?: string;   // 锚点 id（话题文档章节）
}
```

### 8.3 搜索结果展示

帮助搜索在速查卡抽屉顶部提供搜索框（`placeholder="搜索帮助内容..."`），实时过滤（防抖 150ms）：

- 结果按类型分组：语法速查 / 快捷键 / 文档
- 最多显示 15 条结果
- 匹配词高亮（与命令面板高亮渲染逻辑复用）
- 点击结果：若是速查卡条目则滚动到对应章节；若是文档则打开 `HelpDocViewer`

---

## 9. 引导重置

### 9.1 重置入口

重置 FTUE 引导的入口位于：**Settings > 通用 > 重置引导**

此操作含义：
1. 将 `ftue.step` 重置为 `NotStarted`
2. 清空 `ftue.seenHelpKeys`（所有上下文气泡重新触发）
3. **不**删除用户数据（文档、账户、设置保持不变）
4. **不**重置快捷键自定义
5. 下次打开应用时，WelcomeModal 重新出现

### 9.2 重置确认对话框

符合 L1-40 C 防呆规则，重置前需二次确认：

```
┌──────────────────────────────────────────┐
│  重置引导流程                             │
│                                          │
│  此操作将：                              │
│  · 重新显示欢迎弹窗（下次启动时）         │
│  · 重置所有上下文帮助气泡的已读状态       │
│                                          │
│  你的文档和设置不会受影响。               │
│                                          │
│  [取消]                   [确认重置]      │
└──────────────────────────────────────────┘
```

### 9.3 重置审计日志

重置操作写入 activity_logger：

```typescript
await activityLogger.log({
  event: 'ftue.reset',
  source: 'settings',
  metadata: { previousStep: ftueState.step },
});
```

---

## 10. i18n 国际化

### 10.1 支持语言

| 语言代码 | 语言名称 | 状态 |
|---------|---------|------|
| `zh-CN` | 简体中文 | v2.1 必须完整 |
| `en-US` | English | v2.1 必须完整 |

### 10.2 文案文件结构

```
src/i18n/
├── zh-CN/
│   ├── ftue.json        # FTUE 相关文案
│   ├── help.json        # 帮助系统文案
│   └── cheatsheet.json  # 速查卡语法说明
└── en-US/
    ├── ftue.json
    ├── help.json
    └── cheatsheet.json
```

### 10.3 关键文案键

```json
// zh-CN/ftue.json
{
  "welcome.title": "InkForge",
  "welcome.tagline": "Markdown-first 深度写作工具",
  "welcome.startButton": "开始使用",
  "welcome.skipLink": "跳过，直接进入",
  "accountSetup.title": "选择你的起点",
  "accountSetup.createOption": "创建新账户",
  "accountSetup.createDesc": "从零开始，创建你的写作空间",
  "accountSetup.importOption": "导入已有数据",
  "accountSetup.importDesc": "从 Markdown 文件夹或备份导入",
  "accountSetup.continueButton": "继续",
  "emptyHub.title": "从第一篇文章开始",
  "emptyHub.createButton": "新建文档",
  "emptyHub.dropHint": "或拖拽 Markdown 文件到这里",
  "reset.title": "重置引导流程",
  "reset.description": "此操作将重新显示欢迎弹窗并重置上下文帮助。你的文档和设置不会受影响。",
  "reset.confirm": "确认重置",
  "reset.cancel": "取消"
}
```

### 10.4 帮助文档 i18n

话题文档按语言存放，根据当前语言设置加载对应文件：

```typescript
async function loadHelpDoc(topic: string, locale: string): Promise<string> {
  const lang = locale.startsWith('zh') ? 'zh' : 'en';
  try {
    const module = await import(`../assets/help/${lang}/${topic}.md?raw`);
    return module.default;
  } catch {
    // 降级到英文
    const fallback = await import(`../assets/help/en/${topic}.md?raw`);
    return fallback.default;
  }
}
```

---

## 11. Vue 组件完整接口

### 11.1 WelcomeModal.vue

```typescript
interface WelcomeModalProps {
  // 无外部 Props，通过 Store 驱动
}

interface WelcomeModalEmits {
  (event: 'complete', path: 'create' | 'import'): void;
  (event: 'skip'): void;
}

interface WelcomeModalExpose {
  /** 程序化显示弹窗（用于重置后重新触发） */
  show(): void;
  /** 程序化关闭 */
  hide(): void;
}
```

### 11.2 FirstRunDispatcher.vue

```typescript
interface FirstRunDispatcherProps {
  /** 当前步骤（内嵌于 WelcomeModal 中） */
  step: 'path-select' | 'create-account' | 'import-data';
}

interface FirstRunDispatcherEmits {
  (event: 'path-selected', path: 'create' | 'import'): void;
  (event: 'complete'): void;
  (event: 'back'): void;
}
```

### 11.3 ContextHelpBubble.vue

```typescript
interface ContextHelpBubbleProps {
  /** 帮助键，决定显示内容 */
  helpKey: HelpKey;
  /** 气泡箭头指向的目标元素引用 */
  target: HTMLElement | null;
  /** 气泡相对于目标的位置偏好 */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** 是否立即显示（跳过首次触发检查，用于测试） */
  forceShow?: boolean;
}

interface ContextHelpBubbleEmits {
  (event: 'dismiss', helpKey: HelpKey): void;
  (event: 'learn-more', helpKey: HelpKey): void;
}

interface ContextHelpBubbleExpose {
  /** 检查是否应显示（异步，读 IndexedDB） */
  checkAndShow(): Promise<void>;
  /** 强制隐藏 */
  hide(): void;
}
```

### 11.4 MarkdownCheatsheet.vue

```typescript
interface MarkdownCheatsheetProps {
  initialSection?: CheatsheetSection;
}

interface MarkdownCheatsheetEmits {
  (event: 'close'): void;
  (event: 'navigate-to-docs', topic: string): void;
}

interface MarkdownCheatsheetExpose {
  scrollToSection(section: CheatsheetSection): void;
  focusSearch(): void;
}
```

### 11.5 KeyboardShortcutsCard.vue

```typescript
interface KeyboardShortcutsCardProps {
  initialGroup?: ShortcutGroup;
}

interface KeyboardShortcutsCardEmits {
  (event: 'close'): void;
  (event: 'go-to-settings'): void;
}

interface KeyboardShortcutsCardExpose {
  scrollToGroup(group: ShortcutGroup): void;
}
```

### 11.6 HelpDocViewer.vue

```typescript
interface HelpDocViewerProps {
  topic: string;
  modal?: boolean;
  initialAnchor?: string;
}

interface HelpDocViewerEmits {
  (event: 'close'): void;
  (event: 'navigate', topic: string): void;
}
```

---

## 12. Pinia Store 完整接口

```typescript
// src/stores/ftue.ts

interface FTUEStoreState {
  /** FTUE 当前步骤 */
  step: FTUEStep;
  /** 是否正在显示 WelcomeModal */
  isWelcomeVisible: boolean;
  /** 已读帮助气泡键列表 */
  seenHelpKeys: HelpKey[];
  /** 用户收藏的命令 */
  favorites: string[];
  /** FTUE 初始化是否完成（从 IndexedDB 加载完成） */
  initialized: boolean;
  /** 首次运行记录时间 */
  startedAt: number | null;
  completedAt: number | null;
  onboardingPath: 'create' | 'import' | null;
  /** 速查卡是否打开 */
  isCheatsheetOpen: boolean;
  /** 初始打开的章节（从气泡跳转时） */
  cheatsheetInitialSection: CheatsheetSection | null;
  /** 快捷键卡片是否打开 */
  isShortcutsCardOpen: boolean;
  shortcutsInitialGroup: ShortcutGroup | null;
}

interface FTUEStoreActions {
  /** 从 IndexedDB 初始化 FTUE 状态 */
  initialize(): Promise<void>;
  /** 标记欢迎弹窗已显示 */
  markWelcomeShown(): Promise<void>;
  /** 完成引导（含路径记录） */
  complete(path: 'create' | 'import'): Promise<void>;
  /** 跳过引导 */
  skip(): Promise<void>;
  /** 重置 FTUE（Settings > 重置） */
  reset(): Promise<void>;
  /** 检查是否应显示某个帮助气泡 */
  shouldShowHelp(key: HelpKey): Promise<boolean>;
  /** 标记帮助气泡已读 */
  markHelpSeen(key: HelpKey): Promise<void>;
  /** 打开速查卡 */
  openCheatsheet(section?: CheatsheetSection): void;
  /** 关闭速查卡 */
  closeCheatsheet(): void;
  /** 打开快捷键卡片 */
  openShortcutsCard(group?: ShortcutGroup): void;
  /** 关闭快捷键卡片 */
  closeShortcutsCard(): void;
}

interface FTUEStoreGetters {
  /** 是否需要显示 WelcomeModal */
  needsWelcome: (state: FTUEStoreState) => boolean;
  /** FTUE 是否已完成（含跳过） */
  isDone: (state: FTUEStoreState) => boolean;
  /** 某个帮助键是否已读（同步检查内存状态） */
  isHelpSeen: (state: FTUEStoreState) => (key: HelpKey) => boolean;
}
```

---

## 13. TypeScript 类型全量定义

```typescript
// src/types/ftue.ts

export enum FTUEStep {
  NotStarted = 'not_started',
  WelcomeShown = 'welcome_shown',
  AccountSetup = 'account_setup',
  Completed = 'completed',
  Skipped = 'skipped',
}

export enum HelpKey {
  HubWelcome = 'hub.welcome',
  FileManagerIntro = 'file-manager.intro',
  SlashCommandIntro = 'slash-command.intro',
  FloatingToolbarIntro = 'floating-toolbar.intro',
  FocusModeIntro = 'focus-mode.intro',
  VersionHistoryIntro = 'version-history.intro',
  ExportIntro = 'export.intro',
  PublishIntro = 'publish.intro',
  CommandPaletteIntro = 'command-palette.intro',
  TrashIntro = 'trash.intro',
  TemplatesIntro = 'templates.intro',
  DraftsIntro = 'drafts.intro',
  QuickNoteIntro = 'quick-note.intro',
  StatusBarIntro = 'status-bar.intro',
  WritingGoalIntro = 'writing-goal.intro',
}

export enum CheatsheetSection {
  Headings = 'headings',
  Formatting = 'formatting',
  LinksImages = 'links-images',
  Lists = 'lists',
  Blockquote = 'blockquote',
  CodeBlocks = 'code-blocks',
  Tables = 'tables',
  Math = 'math',
  Footnotes = 'footnotes',
  Details = 'details',
  WikiLinks = 'wiki-links',
  TOC = 'toc',
  Frontmatter = 'frontmatter',
  InkForgeExtensions = 'inkforge-extensions',
}

export enum ShortcutGroup {
  Editor = 'editor',
  Document = 'document',
  View = 'view',
  Navigation = 'navigation',
  Command = 'command',
  System = 'system',
}

export interface KeyboardShortcut {
  description: string;
  windows: string;
  mac: string;
  group: ShortcutGroup;
  customizable: boolean;
}

export interface HelpSearchEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: 'cheatsheet' | 'shortcut' | 'doc';
  topic?: string;
  anchor?: string;
}

export interface ContextHelpContent {
  key: HelpKey;
  title: string;
  description: string;
  learnMoreTopic?: string;  // 关联话题文档名
  learnMoreAnchor?: string; // 话题文档内锚点
}

// 帮助内容注册表（静态数据）
export const HELP_CONTENT: Record<HelpKey, ContextHelpContent> = {
  [HelpKey.HubWelcome]: {
    key: HelpKey.HubWelcome,
    title: 'Hub 概览',
    description: 'Hub 是你的写作指挥中心，展示最近文档、目标进度和快速入口。',
    learnMoreTopic: 'getting-started',
  },
  [HelpKey.SlashCommandIntro]: {
    key: HelpKey.SlashCommandIntro,
    title: '斜杠命令',
    description: '在任意位置输入 / 唤起斜杠菜单，快速插入标题、列表、表格等内容块。',
    learnMoreTopic: 'markdown-basics',
  },
  [HelpKey.FloatingToolbarIntro]: {
    key: HelpKey.FloatingToolbarIntro,
    title: '浮动工具栏',
    description: '选中文字后出现浮动工具栏，可快速设置格式。',
    learnMoreTopic: 'typora-mode',
  },
  [HelpKey.CommandPaletteIntro]: {
    key: HelpKey.CommandPaletteIntro,
    title: '命令面板',
    description: '按 Ctrl+K 打开命令面板，搜索并执行任意命令。',
    learnMoreTopic: 'command-palette',
  },
  [HelpKey.FocusModeIntro]: {
    key: HelpKey.FocusModeIntro,
    title: '专注模式',
    description: '专注模式隐藏非必要 UI，让你全心投入写作。退出时显示本次写作成果。',
    learnMoreTopic: 'focus-mode',
  },
  [HelpKey.VersionHistoryIntro]: {
    key: HelpKey.VersionHistoryIntro,
    title: '版本历史',
    description: 'InkForge 自动保存版本快照。在此对比不同版本，选择性恢复内容。',
    learnMoreTopic: 'version-history',
  },
  [HelpKey.ExportIntro]: {
    key: HelpKey.ExportIntro,
    title: '导出文档',
    description: '将文档导出为 HTML 或 Markdown，或复制为特定格式粘贴到其他平台。',
    learnMoreTopic: 'export',
  },
  [HelpKey.PublishIntro]: {
    key: HelpKey.PublishIntro,
    title: '发布到平台',
    description: '直接发布到微信公众号、知乎、小红书，各平台独立适配样式。',
    learnMoreTopic: 'publish',
  },
  [HelpKey.TrashIntro]: {
    key: HelpKey.TrashIntro,
    title: '回收站',
    description: '删除的文档在回收站保留 30 天，可随时还原。超期后自动彻底删除。',
    learnMoreTopic: 'getting-started',
  },
  [HelpKey.TemplatesIntro]: {
    key: HelpKey.TemplatesIntro,
    title: '文档模板',
    description: '从内置模板或你保存的自定义模板开始写作，提高创作效率。',
    learnMoreTopic: 'templates',
  },
  [HelpKey.DraftsIntro]: {
    key: HelpKey.DraftsIntro,
    title: '草稿箱',
    description: '草稿箱集中管理所有未发布的文档，支持批量操作和快速预览。',
    learnMoreTopic: 'drafts',
  },
  [HelpKey.QuickNoteIntro]: {
    key: HelpKey.QuickNoteIntro,
    title: '快速笔记',
    description: '按 Ctrl+Alt+N 随时打开快速笔记窗口，想法自动保存为草稿。',
  },
  [HelpKey.StatusBarIntro]: {
    key: HelpKey.StatusBarIntro,
    title: '状态栏',
    description: '状态栏显示字数、阅读时长和写作目标进度，点击各区域可交互。',
  },
  [HelpKey.WritingGoalIntro]: {
    key: HelpKey.WritingGoalIntro,
    title: '写作目标',
    description: '设置每日或每周字数目标，完成时获得成就动画激励。',
  },
  [HelpKey.FileManagerIntro]: {
    key: HelpKey.FileManagerIntro,
    title: '文件管理',
    description: '使用分类、标签、状态过滤组织文档，支持自定义智能文件夹。',
    learnMoreTopic: 'getting-started',
  },
};
```

---

## 14. 气泡定位算法

上下文帮助气泡使用 Floating UI 库进行定位，确保气泡不超出视口，并带有指向目标元素的箭头。

### 14.1 Floating UI 配置

```typescript
import {
  computePosition,
  autoPlacement,
  offset,
  shift,
  arrow,
  flip,
} from '@floating-ui/dom';

async function positionHelpBubble(
  target: HTMLElement,
  bubble: HTMLElement,
  arrowEl: HTMLElement,
  placement: 'top' | 'bottom' | 'left' | 'right' | 'auto' = 'auto'
): Promise<void> {
  const middleware = [
    offset(12),           // 气泡与目标之间 12px 间距
    placement === 'auto'
      ? autoPlacement()   // 自动选择最优位置
      : flip(),           // 手动指定时，空间不足则翻转
    shift({ padding: 16 }), // 避免超出视口边缘
    arrow({ element: arrowEl }),
  ];

  const { x, y, placement: computedPlacement, middlewareData } = await computePosition(
    target,
    bubble,
    {
      placement: placement === 'auto' ? 'bottom' : placement,
      middleware,
    }
  );

  // 应用位置
  Object.assign(bubble.style, {
    left: `${x}px`,
    top: `${y}px`,
    position: 'fixed',
  });

  // 应用箭头位置
  if (middlewareData.arrow) {
    const { x: arrowX, y: arrowY } = middlewareData.arrow;
    const staticSide = {
      top: 'bottom', right: 'left', bottom: 'top', left: 'right',
    }[computedPlacement.split('-')[0]] ?? 'bottom';

    Object.assign(arrowEl.style, {
      left: arrowX != null ? `${arrowX}px` : '',
      top: arrowY != null ? `${arrowY}px` : '',
      right: '',
      bottom: '',
      [staticSide]: '-4px',
    });
  }
}
```

### 14.2 气泡更新策略

- 目标元素滚动时，使用 `autoUpdate` 实时更新气泡位置
- 窗口 resize 时重新计算
- 气泡关闭时调用 `cleanup()` 停止自动更新

---

## 15. 性能与存储

### 15.1 存储占用

| 数据 | 存储位置 | 预估大小 |
|------|---------|---------|
| FTUE 状态 | IndexedDB `inkforge-settings/ftue` | < 1 KB |
| 已读帮助键列表 | IndexedDB `inkforge-settings/ftue` | < 1 KB |
| 话题文档（全部） | 应用 bundle（内置） | ~80 KB（Markdown 源文件） |
| 速查卡文案 | i18n bundle | ~20 KB |
| MiniSearch 索引 | 内存（运行时构建） | ~500 KB |

### 15.2 性能要求

| 指标 | 目标 |
|------|------|
| WelcomeModal 渲染延迟 | ≤ 100ms（首次渲染） |
| 帮助气泡出现延迟 | ≤ 50ms（含定位计算） |
| 速查卡打开延迟 | ≤ 150ms（含渲染所有章节） |
| 帮助搜索响应 | ≤ 50ms（150ms 防抖后） |
| IndexedDB 读取（ftue 状态） | ≤ 20ms |

---

## 16. 无障碍（a11y）要求

- `WelcomeModal`：`role="dialog"` + `aria-modal="true"` + `aria-labelledby` 指向标题
- `ContextHelpBubble`：`role="tooltip"` 或 `role="dialog"`（取决于是否可交互）
- `MarkdownCheatsheet`：侧边抽屉使用 `role="complementary"` + `aria-label`
- `KeyboardShortcutsCard`：`role="dialog"` + 分组 Tab 使用 `role="tablist"` / `role="tab"`
- 焦点管理：模态对话框打开时焦点移入，关闭时返回触发元素
- 气泡定位保证不遮挡 Escape 键焦点区域
- 所有交互元素有 `:focus-visible` 样式
- 色彩对比度：说明文字与背景对比度 ≥ 4.5:1（WCAG AA）

---

## 17. 测试矩阵

| # | 测试类型 | 测试描述 | 预期结果 |
|---|----------|----------|----------|
| 1 | 单元 | 全新安装后 `ftue.step` 为 `NotStarted` | IndexedDB 无记录时返回 `NotStarted` |
| 2 | 单元 | `shouldShowHelp(HelpKey.HubWelcome)` 首次调用 | 返回 true（IndexedDB 无记录） |
| 3 | 单元 | `markHelpSeen` 后再次调用 `shouldShowHelp` | 返回 false |
| 4 | 单元 | `ftueStore.reset()` 重置所有状态 | `step → NotStarted`，`seenHelpKeys → []` |
| 5 | 单元 | `positionHelpBubble` 目标在底部视口外 | 气泡自动出现在目标上方 |
| 6 | 集成 | 首次启动自动显示 WelcomeModal | `isWelcomeVisible === true`，DOM 渲染 |
| 7 | 集成 | WelcomeModal "跳过" 点击 | `ftue.step → Skipped`，跳转到 Hub |
| 8 | 集成 | WelcomeModal "开始使用" → "创建账户" 完成 | `ftue.step → Completed`，`onboardingPath → 'create'` |
| 9 | 集成 | 非首次启动不显示 WelcomeModal | `isWelcomeVisible === false` |
| 10 | 集成 | Hub 空状态正确显示（无示例文档） | 只有"新建文档"按钮，无预置内容 |
| 11 | 集成 | 首次进入 Hub，HubWelcome 气泡出现 | `ContextHelpBubble` 渲染 |
| 12 | 集成 | 气泡"知道了"点击后消失，不再出现 | `seenHelpKeys` 包含该键，刷新后气泡不再出现 |
| 13 | 集成 | `Ctrl+/` 打开速查卡 | `isCheatsheetOpen === true`，抽屉 DOM 渲染 |
| 14 | 集成 | 速查卡章节 Tab 切换正常 | 内容区域滚动到对应章节 |
| 15 | 集成 | 速查卡语法示例实时渲染 | Markdown 渲染结果在"效果"区域显示 |
| 16 | 集成 | `Ctrl+Shift+/` 打开快捷键卡片 | `isShortcutsCardOpen === true` |
| 17 | 集成 | 快捷键卡片分组 Tab 切换 | 对应分组命令列表显示 |
| 18 | 集成 | 帮助搜索输入"加粗" | 速查卡中"文字格式-加粗"和快捷键"Ctrl+B"都出现在结果 |
| 19 | 集成 | 帮助搜索结果点击话题文档条目 | HelpDocViewer 打开对应 topic |
| 20 | 集成 | Settings > 重置引导 确认 | `ftue.step → NotStarted`，下次启动弹 WelcomeModal |
| 21 | 集成 | 重置引导写入 activity_logger | 审计日志含 `event: 'ftue.reset'` |
| 22 | 集成 | 语言切换为 en-US | 速查卡、快捷键卡、气泡全部英文显示 |
| 23 | 集成 | 话题文档中文不存在时降级英文 | 英文版文档正常加载 |
| 24 | 无障碍 | WelcomeModal 可通过键盘完成全程 | Tab/Enter/Esc 完整可操作 |
| 25 | 无障碍 | 气泡"Esc"关闭并标记已读 | `seenHelpKeys` 更新，焦点返回 |

---

*本文档覆盖 FTUE 状态机、WelcomeModal、上下文帮助气泡、Markdown 速查卡、快捷键卡片、帮助文档、帮助搜索、重置入口及全量 TypeScript 类型定义，共计约 830 行，版本 v2.1 Draft。*

---

## 18. 2026-04-30 Compatible Baseline Implementation Note

Status: compatible baseline implemented, not full Spec 19 closure.

Implemented:
- Added real IndexedDB persistence through Dexie `InkForgeDB` schema v6 with `ftue: 'id, kind, step, helpKey, updatedAt, seenAt'` while preserving all v1-v5 stores.
- Added typed FTUE service and Pinia store for `not_started`, `welcome_shown`, `completed`, and `skipped` state transitions.
- Added lightweight `WelcomeModal` shown once on first local run. It never creates sample documents, accounts, assets, or mocked records.
- Added global Help Center with Markdown cheatsheet, topic documents, search, and shortcut cards derived from current `settings.shortcuts`, `SHORTCUT_GROUPS`, and `SHORTCUT_DEFINITIONS`.
- Added App-level fixed help trigger and `Ctrl+/` global help shortcut, with editable-target protection.
- Added Settings > About > first-run/help panel with reset action. Reset clears only FTUE/help records and leaves articles, assets, accounts, export history, and settings intact.
- Fixed the existing Settings confirmation flow so successful async confirm actions close the dialog after completion.

Verified:
- `pnpm exec vue-tsc --noEmit`
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`
- `pnpm build`
- Real Chromium smoke test on `http://127.0.0.1:5177/`: first-run modal, skip persistence, Help Center open/search, `Ctrl+/`, Settings reset, and zero console errors.
- Emoji presentation scan over touched files passed.
- `git diff --check` over touched files passed with only existing Windows CRLF conversion warnings.

Deferred full Spec 19 items:
- Floating contextual help bubbles and positioning algorithm.
- Full i18n help catalog and fallback viewer.
- Rich live Markdown rendering inside cheatsheet examples.
- Dedicated activity logger event for `ftue.reset` if/when an activity logger contract exists.
- Exhaustive a11y/unit/integration matrix for every row in section 17.