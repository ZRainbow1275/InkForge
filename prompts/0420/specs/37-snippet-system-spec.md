---
id: 37-snippet-system-spec
title: "Spec 37 | 代码片段 / 快捷短语系统（Snippet System）"
version: "2.1.0"
status: approved
authors: ["spec-engineer"]
created: 2026-04-21
depends_on:
  - "_extracted/03-enhancement-answers.md (EX-08)"
  - "_extracted/02c-L2-T07-T08-T09-X-S.md (S 组)"
  - "22-command-palette-spec.md"
  - "03-keyboard-shortcuts-spec.md"
---

# Spec 37 | 代码片段 / 快捷短语系统（Snippet System）

## 目录

1. 功能概述
2. Snippet 分类与数据模型
3. 触发机制
4. Snippet 变量系统
5. 展开执行引擎
6. Snippet 管理 UI
7. 与斜杠命令集成
8. 与命令面板集成
9. 导入 / 导出
10. 作用域过滤
11. 使用统计
12. Repository 设计
13. Store 设计
14. 验收矩阵

---

## 1. 功能概述

Snippet System 是 InkForge v2.1 的**快捷短语与块模板引擎**，允许用户定义触发词（trigger），在编辑器中输入触发词并按 Tab/Enter 后展开为预设文本或块内容。

来源决策：EX-08（v2.1 实现），定义为"类 TextExpander 片段系统，通过 `/` 或快捷键插入"。

### 1.1 核心功能

- **文本 Snippet**：触发词 + Tab/Enter 展开为预设纯文本或 Markdown 格式文本；
- **块级 Snippet**：在斜杠命令面板中出现的用户自定义块模板（段落、表格、代码块等）；
- **Snippet 变量**：`$1`/`$2` 等 Tab Stops，`$CLIPBOARD`/`$DATE`/`$TIME`/`$UUID` 等内置变量；
- **作用域过滤**：Snippet 可全局生效，也可限定在特定标签或当前文档中生效；
- **使用统计**：记录每个 Snippet 的使用次数，按频率排序；

### 1.2 设计原则

- **与 Tab 缩进不冲突**：Tab 展开 Snippet 的优先级高于缩进，但必须有明确的触发词检测；
- **零 UI 侵扰**：展开过程无弹窗确认，直接展开，用户可 Ctrl+Z 撤销；
- **Markdown 兼容**：Snippet 内容以 Markdown 语法编写，展开时经过 TipTap 解析；
- **VSCode 兼容**：Snippet 格式参考 VSCode snippet JSON，方便迁移；

---

## 2. Snippet 分类与数据模型

### 2.1 Snippet 类型

```typescript
export type SnippetType = 'text' | 'block';

// 'text'：纯文本/Markdown 片段，内联展开
// 'block'：块级模板，仅通过斜杠命令插入
```

### 2.2 Snippet 数据模型

```typescript
// 文件：src/db/schema.ts（新增 snippets 表）

export interface Snippet {
  id: string;                         // UUID

  // 基本信息
  name: string;                       // 显示名称（用户可见）
  description?: string;               // 可选描述
  type: SnippetType;                  // 'text' | 'block'

  // 触发方式
  trigger: string;                    // 触发词（文本类型必须；块类型可选）
  triggerCaseSensitive: boolean;      // 触发词是否区分大小写（默认 false）

  // 内容
  content: string;                    // Markdown 格式内容，含变量占位符

  // 变量定义
  variables: SnippetVar[];           // Tab Stops 与内置变量声明

  // 作用域
  scope: SnippetScope;               // 生效范围

  // 元数据
  icon?: string;                      // Lucide 图标名称（用于斜杠命令面板）
  tags: string[];                     // 用户分类标签

  // 统计
  usageCount: number;                 // 累计使用次数

  // 时间戳
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

export interface SnippetVar {
  index?: number;                     // Tab Stop 序号（$1 = 1, $2 = 2, $0 = 最终光标）
  name?: string;                      // 内置变量名（'CLIPBOARD' | 'DATE' | 'TIME' | 'UUID'）
  placeholder?: string;               // 默认值（Tab Stop 有 placeholder 时）
  transform?: string;                 // 可选变换（正则替换，v2.2 候选）
}

export type SnippetScope =
  | { type: 'global' }               // 全局生效
  | { type: 'document' }             // 仅当前文档
  | { type: 'tags'; tags: string[] } // 具有指定标签的文档
```

### 2.3 示例数据

```typescript
// 示例 1：文本片段（日期模板）
const dateSnippet: Snippet = {
  id: 'uuid-1',
  name: '日期戳',
  description: '插入当前日期',
  type: 'text',
  trigger: '/date',
  triggerCaseSensitive: false,
  content: '$DATE 写于 $TIME\n\n$1',
  variables: [
    { name: 'DATE' },
    { name: 'TIME' },
    { index: 1, placeholder: '开始写作...' },
  ],
  scope: { type: 'global' },
  icon: 'calendar',
  tags: ['时间'],
  usageCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// 示例 2：块模板（会议记录）
const meetingSnippet: Snippet = {
  id: 'uuid-2',
  name: '会议记录',
  description: '快速创建会议记录模板',
  type: 'block',
  trigger: '/meeting',
  triggerCaseSensitive: false,
  content: `## 会议记录 $DATE

**参与者**：$1

**议程**：

$2

**决议**：

$3

**下次行动**：

$0`,
  variables: [
    { name: 'DATE' },
    { index: 1, placeholder: '与会人员名单' },
    { index: 2, placeholder: '讨论议题' },
    { index: 3, placeholder: '达成的决议' },
    { index: 0 },
  ],
  scope: { type: 'global' },
  icon: 'users',
  tags: ['工作', '会议'],
  usageCount: 12,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

### 2.4 IndexedDB 表定义

```typescript
// Dexie 表定义
db.version(X).stores({
  snippets: '++id, trigger, type, scope.type, usageCount, createdAt, updatedAt, lastUsedAt',
});

// 索引说明：
// trigger：快速查找触发词
// type：按类型过滤（'text' | 'block'）
// usageCount：按使用频率排序
```

---

## 3. 触发机制

### 3.1 文本 Snippet 触发流程

```
用户输入触发词（如 "/date"）
    ↓
按 Tab 键（或 Enter，可配置）
    ↓
SnippetMatcher 检测：光标前文本是否匹配任一触发词？
    ↓
  匹配成功 → 删除触发词 → 展开 Snippet
  无匹配   → 执行默认 Tab 行为（缩进 / 列表）
```

### 3.2 Tab 优先级规则

Tab 键的行为优先级（从高到低）：

1. **Snippet Tab Stop 导航**（已展开 Snippet 中跳转 $1 → $2 → $0）；
2. **Snippet 触发展开**（检测到触发词时）；
3. **列表缩进**（光标在列表项行首时）；
4. **默认 Tab 缩进**（否则）；

关键实现：

```typescript
// 文件：src/editor/extensions/snippet/SnippetKeymap.ts

import { keymap } from 'prosemirror-keymap';
import { type Editor } from '@tiptap/core';

export function createSnippetKeymap(snippetEngine: SnippetEngine) {
  return keymap({
    Tab: (state, dispatch) => {
      // 优先级 1：Tab Stop 导航
      if (snippetEngine.isInSnippetSession()) {
        return snippetEngine.nextTabStop(state, dispatch);
      }
      // 优先级 2：Snippet 触发
      if (snippetEngine.tryTrigger(state, dispatch)) {
        return true;
      }
      // 优先级 3+：交给其他插件处理
      return false;
    },
    'Shift-Tab': (state, dispatch) => {
      // 反向 Tab Stop 导航
      if (snippetEngine.isInSnippetSession()) {
        return snippetEngine.prevTabStop(state, dispatch);
      }
      return false;
    },
    Escape: (state, dispatch) => {
      // 退出 Snippet 会话
      if (snippetEngine.isInSnippetSession()) {
        snippetEngine.exitSession();
        return true;
      }
      return false;
    },
  });
}
```

### 3.3 触发词匹配逻辑

```typescript
// 文件：src/editor/extensions/snippet/SnippetMatcher.ts

export class SnippetMatcher {
  private triggers: Map<string, Snippet>; // trigger -> Snippet

  constructor(snippets: Snippet[]) {
    this.triggers = new Map();
    for (const s of snippets) {
      const key = s.triggerCaseSensitive ? s.trigger : s.trigger.toLowerCase();
      this.triggers.set(key, s);
    }
  }

  // 检查光标前的文本是否为触发词
  match(textBefore: string): Snippet | null {
    // 取光标前最后 N 个字符（N = 最长触发词长度）
    const maxLen = Math.max(...Array.from(this.triggers.keys()).map((k) => k.length));
    const candidate = textBefore.slice(-maxLen);

    for (const [trigger, snippet] of this.triggers) {
      if (candidate.endsWith(trigger)) {
        // 确认触发词前面是行首或空白字符
        const prefix = candidate.slice(0, candidate.length - trigger.length);
        if (prefix === '' || /\s$/.test(prefix)) {
          return snippet;
        }
      }
    }
    return null;
  }
}
```

---

## 4. Snippet 变量系统

### 4.1 内置变量

| 变量 | 含义 | 示例输出 |
|---|---|---|
| `$DATE` | 当前日期（YYYY-MM-DD） | `2026-04-21` |
| `$TIME` | 当前时间（HH:mm） | `14:30` |
| `$DATETIME` | 日期 + 时间 | `2026-04-21 14:30` |
| `$UUID` | 随机 UUID v4 | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `$CLIPBOARD` | 剪贴板纯文本内容 | （当前剪贴板文字）|
| `$TITLE` | 当前文章标题 | `我的文章` |
| `$AUTHOR` | 当前账户名 | `ZRainbow` |
| `$CURSOR` | 最终光标位置（等同 $0） | — |

### 4.2 Tab Stops（光标跳转点）

```
$1, $2, $3, ...  定义跳转顺序
$0               最终光标位置（最后一个 Tab）
${1:默认值}       带默认文字的 Tab Stop
${1|选项A,选项B|} 下拉选择（v2.2 候选）
```

示例：

```markdown
## $1{文章标题}

作者：$AUTHOR | 日期：$DATE

$2{在这里开始写作...}

$0
```

展开后，光标跳转顺序：`$1`（文章标题）→ `$2`（正文区）→ `$0`（末尾）。

### 4.3 变量解析引擎

```typescript
// 文件：src/services/snippet/SnippetVariableResolver.ts

export interface ResolvedSnippet {
  content: string;                  // 变量替换后的内容（Tab Stops 保留标记）
  tabStops: TabStop[];             // Tab Stop 位置列表（按 index 升序）
}

export interface TabStop {
  index: number;                    // 0, 1, 2, ...（0 是最后一个）
  from: number;                     // 在展开内容中的起始位置
  to: number;                       // 结束位置
  placeholder: string;              // 默认文字（可能为空）
}

export class SnippetVariableResolver {
  async resolve(snippet: Snippet, context: SnippetContext): Promise<ResolvedSnippet> {
    let content = snippet.content;

    // 1. 替换内置变量
    content = this.resolveBuiltins(content, context);

    // 2. 解析 Tab Stops，记录位置
    const tabStops = this.extractTabStops(content);

    // 3. 将 Tab Stop 占位符替换为默认值
    content = this.applyDefaults(content, tabStops);

    return { content, tabStops };
  }

  private resolveBuiltins(content: string, ctx: SnippetContext): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return content
      .replace(/\$DATE/g, `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
      .replace(/\$TIME/g, `${pad(now.getHours())}:${pad(now.getMinutes())}`)
      .replace(/\$DATETIME/g, `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`)
      .replace(/\$UUID/g, crypto.randomUUID())
      .replace(/\$CLIPBOARD/g, ctx.clipboard ?? '')
      .replace(/\$TITLE/g, ctx.articleTitle ?? '')
      .replace(/\$AUTHOR/g, ctx.authorName ?? '');
  }

  private extractTabStops(content: string): TabStop[] {
    const tabStops: TabStop[] = [];
    // 匹配 $N 和 ${N:placeholder}
    const pattern = /\$(\d+)|\$\{(\d+):([^}]*)\}/g;
    let match: RegExpExecArray | null;
    let offset = 0;

    while ((match = pattern.exec(content)) !== null) {
      const index = parseInt(match[1] ?? match[2]);
      const placeholder = match[3] ?? '';
      tabStops.push({
        index,
        from: match.index - offset,
        to: match.index + match[0].length - offset,
        placeholder,
      });
    }

    // 按 index 排序，$0 放最后
    return tabStops.sort((a, b) => {
      if (a.index === 0) return 1;
      if (b.index === 0) return -1;
      return a.index - b.index;
    });
  }

  private applyDefaults(content: string, tabStops: TabStop[]): string {
    // 从后往前替换，保持位置正确
    let result = content;
    for (let i = tabStops.length - 1; i >= 0; i--) {
      const ts = tabStops[i];
      result = result.slice(0, ts.from) + ts.placeholder + result.slice(ts.to);
    }
    return result;
  }
}
```

### 4.4 Snippet 会话（Tab Stop 导航）

```typescript
// 文件：src/editor/extensions/snippet/SnippetSession.ts

export class SnippetSession {
  private tabStops: TabStop[];
  private currentIndex: number = 0;
  private insertedAt: number;        // 展开起始位置（ProseMirror 位置）

  constructor(tabStops: TabStop[], insertedAt: number) {
    this.tabStops = tabStops;
    this.insertedAt = insertedAt;
  }

  get isActive(): boolean {
    return this.currentIndex < this.tabStops.length;
  }

  // 移动到下一个 Tab Stop，返回需要选中的范围
  next(): { from: number; to: number; placeholder: string } | null {
    if (!this.isActive) return null;
    const ts = this.tabStops[this.currentIndex];
    this.currentIndex++;
    return {
      from: this.insertedAt + ts.from,
      to: this.insertedAt + ts.to,
      placeholder: ts.placeholder,
    };
  }

  prev(): { from: number; to: number; placeholder: string } | null {
    if (this.currentIndex <= 1) return null;
    this.currentIndex -= 2;
    return this.next();
  }

  exit(): void {
    this.currentIndex = this.tabStops.length;
  }
}
```

---

## 5. 展开执行引擎

```typescript
// 文件：src/editor/extensions/snippet/SnippetEngine.ts

import { Editor } from '@tiptap/core';

export class SnippetEngine {
  private editor: Editor;
  private matcher: SnippetMatcher;
  private resolver: SnippetVariableResolver;
  private session: SnippetSession | null = null;

  constructor(editor: Editor, snippets: Snippet[]) {
    this.editor = editor;
    this.matcher = new SnippetMatcher(snippets);
    this.resolver = new SnippetVariableResolver();
  }

  isInSnippetSession(): boolean {
    return this.session?.isActive ?? false;
  }

  // 尝试触发 Snippet（Tab 键处理程序调用）
  tryTrigger(state: EditorState, dispatch: Dispatch | null): boolean {
    const { $from } = state.selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset);
    const snippet = this.matcher.match(textBefore);

    if (!snippet || !dispatch) return false;

    // 计算触发词范围
    const triggerLength = snippet.trigger.length;
    const from = $from.pos - triggerLength;
    const to = $from.pos;

    // 异步展开（需要 clipboard，可能异步）
    this.expand(snippet, from, to);
    return true;
  }

  private async expand(snippet: Snippet, from: number, to: number): Promise<void> {
    // 读取上下文
    const clipboard = await this.readClipboard();
    const context: SnippetContext = {
      clipboard,
      articleTitle: this.getCurrentArticleTitle(),
      authorName: this.getAuthorName(),
    };

    // 解析变量
    const resolved = await this.resolver.resolve(snippet, context);

    // 将 Markdown 转换为 ProseMirror 节点
    const nodes = this.editor.schema.nodeFromJSON(
      await markdownToJson(resolved.content)
    );

    // 事务：删除触发词，插入展开内容
    const tr = this.editor.state.tr;
    tr.delete(from, to);
    tr.insert(from, nodes);

    this.editor.view.dispatch(tr);

    // 建立 Snippet 会话
    if (resolved.tabStops.length > 0) {
      this.session = new SnippetSession(resolved.tabStops, from);
      this.jumpToFirstTabStop();
    }

    // 更新使用统计
    snippetStore.incrementUsage(snippet.id);
  }

  nextTabStop(state: EditorState, dispatch: Dispatch | null): boolean {
    const range = this.session?.next();
    if (!range || !dispatch) return false;
    const tr = state.tr.setSelection(
      TextSelection.create(state.doc, range.from, range.to)
    );
    dispatch(tr);
    return true;
  }

  prevTabStop(state: EditorState, dispatch: Dispatch | null): boolean {
    const range = this.session?.prev();
    if (!range || !dispatch) return false;
    const tr = state.tr.setSelection(
      TextSelection.create(state.doc, range.from, range.to)
    );
    dispatch(tr);
    return true;
  }

  exitSession(): void {
    this.session?.exit();
    this.session = null;
  }

  private jumpToFirstTabStop(): void {
    const range = this.session?.next();
    if (!range) return;
    const { state, dispatch } = this.editor.view;
    const tr = state.tr.setSelection(
      TextSelection.create(state.doc, range.from, range.to)
    );
    dispatch(tr);
  }

  private async readClipboard(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  }

  private getCurrentArticleTitle(): string {
    return useArticleStore().currentArticle?.title ?? '';
  }

  private getAuthorName(): string {
    return useAccountStore().currentAccount?.name ?? '';
  }
}
```

---

## 6. Snippet 管理 UI

### 6.1 入口

Settings > 代码片段（Snippets）

### 6.2 列表视图

```typescript
// 文件：src/views/settings/SnippetsSettingsTab.vue

// 布局：
// 左侧：Snippet 列表（含搜索框）
// 右侧：编辑面板
//
// 列表项显示：
// - 图标（Lucide）+ 名称 + 触发词
// - 使用次数徽章
// - 类型标签（text/block）
// - 操作：编辑、复制、删除
//
// 排序选项：
// - 最近使用（默认）
// - 使用频率
// - 名称字母序
// - 创建时间
//
// 搜索：名称 + 触发词 + 描述 模糊搜索
```

### 6.3 新建 / 编辑 Snippet

```typescript
// 文件：src/views/settings/SnippetEditor.vue

// 字段：
// - 名称（必填，文本输入）
// - 描述（可选，文本输入）
// - 类型（text/block，Radio）
// - 触发词（必填，文本输入；块类型可选）
// - 图标（Lucide 图标选择器，可选）
// - 标签（多标签输入）
// - 作用域（Radio: 全局/当前文档/按标签）
//   - 按标签时显示标签多选
// - 内容（Textarea，支持 Markdown + 变量语法高亮）
// - 变量列表（自动从内容中解析并展示）
//
// 操作：
// - 实时预览（右侧显示展开效果）
// - 保存
// - 取消
```

### 6.4 内容编辑器

Snippet 内容使用 `<textarea>` 编辑（非 TipTap），支持语法高亮（CodeMirror 6 精简版）：

```typescript
// 语法高亮规则：
// $DATE / $TIME / $UUID / $CLIPBOARD / $TITLE / $AUTHOR -> 蓝色
// $1 / $2 / ${1:placeholder} -> 橙色
// ## 标题 -> 灰色加粗
// 其余 Markdown 基础语法 -> 轻量高亮
```

### 6.5 实时预览

编辑内容时，右侧实时渲染展开效果（使用虚拟上下文：`$DATE` 替换为当前日期，`$CLIPBOARD` 替换为"[剪贴板内容]"）。

---

## 7. 与斜杠命令集成

### 7.1 用户 Snippet 在斜杠命令中的位置

斜杠命令面板按分组展示，用户 Snippet 出现在 `/user` 分组：

```typescript
// 文件：src/editor/extensions/slash-command/groups.ts

const slashCommandGroups = [
  { id: 'basic',    label: '基础',   commands: [...basicCommands] },
  { id: 'insert',   label: '插入',   commands: [...insertCommands] },
  { id: 'user',     label: '我的片段', commands: [] }, // 动态填充
  { id: 'advanced', label: '高级',   commands: [...advancedCommands] },
];
```

### 7.2 Snippet -> 斜杠命令映射

块级（type = 'block'）和全局文本（type = 'text'）Snippet 均注册到斜杠命令：

```typescript
// 文件：src/editor/extensions/slash-command/SnippetCommandAdapter.ts

export function snippetToSlashCommand(snippet: Snippet): SlashCommand {
  return {
    id: `snippet:${snippet.id}`,
    title: snippet.name,
    description: snippet.description ?? `触发词：${snippet.trigger}`,
    icon: snippet.icon ?? 'file-text',    // Lucide 图标名
    group: 'user',
    keywords: [snippet.trigger, snippet.name, ...(snippet.tags ?? [])],
    execute: (editor: Editor) => {
      snippetEngine.expandById(snippet.id, editor);
    },
  };
}
```

### 7.3 Snippet 在斜杠命令中的搜索

斜杠命令的 fuzzy 搜索同时匹配 Snippet 的名称、触发词和标签：

```typescript
// 搜索时，Snippet 的 keywords 字段包含触发词，优先展示使用频率高的
```

---

## 8. 与命令面板集成

用户可在命令面板（`Cmd+K` / `Ctrl+K`）中搜索并插入 Snippet：

```typescript
// 命令注册示例
commandRegistry.register({
  id: `snippet:${snippet.id}`,
  label: `插入片段：${snippet.name}`,
  category: 'snippet',
  shortcut: undefined,
  execute: () => snippetEngine.expandById(snippet.id),
  isVisible: () => true,
  keywords: ['snippet', '片段', snippet.trigger, snippet.name],
});
```

---

## 9. 导入 / 导出

### 9.1 InkForge 格式导出

```typescript
// 文件：src/services/snippet/SnippetExporter.ts

export interface SnippetExportBundle {
  version: '2.1';
  exportedAt: number;
  snippets: Snippet[];
}

export async function exportSnippets(ids?: string[]): Promise<SnippetExportBundle> {
  const snippets = ids
    ? await snippetRepo.getByIds(ids)
    : await snippetRepo.getAll();
  return { version: '2.1', exportedAt: Date.now(), snippets };
}
```

导出文件名：`inkforge-snippets-${YYYY-MM-DD}.json`

### 9.2 VSCode Snippet 格式兼容

支持导入 VSCode `.json` 格式的 snippet 文件：

```typescript
// VSCode snippet 格式示例
{
  "Date Stamp": {
    "prefix": "date",
    "body": ["$CURRENT_DATE $CURRENT_TIME", "$1"],
    "description": "Insert current date"
  }
}
```

```typescript
// 文件：src/services/snippet/VscodeSnippetImporter.ts

export function importFromVscode(vscodeJson: Record<string, VscodeSnippet>): Snippet[] {
  return Object.entries(vscodeJson).map(([name, def]) => ({
    id: crypto.randomUUID(),
    name: name,
    description: def.description,
    type: 'text',
    trigger: def.prefix,
    triggerCaseSensitive: false,
    // VSCode body 数组 -> 多行字符串
    content: Array.isArray(def.body) ? def.body.join('\n') : def.body,
    variables: [],    // VSCode 变量格式不同，暂不转换
    scope: { type: 'global' },
    icon: 'file-text',
    tags: ['imported-vscode'],
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
}
```

### 9.3 导入冲突处理

导入时，若已存在相同触发词的 Snippet，提示用户选择：

| 选项 | 行为 |
|---|---|
| 覆盖 | 替换现有 Snippet |
| 重命名触发词 | 用户手动修改导入项的触发词 |
| 跳过 | 保留原有，丢弃导入项 |
| 全部覆盖 | 批量覆盖（危险操作，需确认）|

---

## 10. 作用域过滤

### 10.1 作用域定义

```typescript
// 三种作用域

// 全局（默认）：所有文档中生效
const globalScope: SnippetScope = { type: 'global' };

// 当前文档：仅在编辑器当前打开的文档中生效
const documentScope: SnippetScope = { type: 'document' };

// 按标签：仅在具有指定标签的文档中生效
const tagScope: SnippetScope = { type: 'tags', tags: ['技术', '教程'] };
```

### 10.2 作用域过滤实现

```typescript
// 文件：src/services/snippet/SnippetScopeFilter.ts

export class SnippetScopeFilter {
  filter(snippets: Snippet[], context: ScopeContext): Snippet[] {
    return snippets.filter((s) => this.matches(s.scope, context));
  }

  private matches(scope: SnippetScope, ctx: ScopeContext): boolean {
    switch (scope.type) {
      case 'global':
        return true;
      case 'document':
        return ctx.articleId === ctx.currentArticleId;
      case 'tags':
        return scope.tags.some((tag) => ctx.currentArticleTags.includes(tag));
    }
  }
}

interface ScopeContext {
  currentArticleId: string;
  currentArticleTags: string[];
  articleId?: string;  // 用于 document scope
}
```

### 10.3 作用域实时更新

当用户切换文章时，SnippetEngine 重新计算有效 Snippet 列表并更新 SnippetMatcher：

```typescript
// 监听文章切换事件
articleStore.$subscribe((mutation) => {
  if (mutation.type === 'ARTICLE_SWITCHED') {
    snippetEngine.refreshScope(mutation.newArticleId, mutation.newArticleTags);
  }
});
```

---

## 11. 使用统计

### 11.1 统计字段

```typescript
// 在 Snippet 数据模型中（见 §2.2）
usageCount: number;   // 累计使用次数
lastUsedAt?: number;  // 最后使用时间戳
```

### 11.2 统计更新

每次 Snippet 展开成功后，异步更新统计：

```typescript
// 文件：src/stores/snippet.ts（局部）

async function incrementUsage(snippetId: string): Promise<void> {
  await snippetRepo.update(snippetId, (s) => ({
    ...s,
    usageCount: s.usageCount + 1,
    lastUsedAt: Date.now(),
  }));
}
```

### 11.3 统计展示

- Settings > 代码片段：列表项右侧显示使用次数徽章（`{N} 次`）；
- 默认排序为"最近使用"（`lastUsedAt` 降序）；
- 可切换为"使用频率"（`usageCount` 降序）；

---

## 12. Repository 设计

```typescript
// 文件：src/services/snippet/SnippetRepository.ts

export class SnippetRepository {
  private db: InkForgeDB;

  constructor(db: InkForgeDB) {
    this.db = db;
  }

  async getAll(): Promise<Snippet[]> {
    return this.db.snippets.orderBy('lastUsedAt').reverse().toArray();
  }

  async getById(id: string): Promise<Snippet | undefined> {
    return this.db.snippets.get(id);
  }

  async getByIds(ids: string[]): Promise<Snippet[]> {
    return this.db.snippets.where('id').anyOf(ids).toArray();
  }

  async getByType(type: SnippetType): Promise<Snippet[]> {
    return this.db.snippets.where('type').equals(type).toArray();
  }

  // 获取在当前上下文有效的所有 Snippet（已过滤作用域）
  async getEffective(context: ScopeContext): Promise<Snippet[]> {
    const all = await this.getAll();
    return new SnippetScopeFilter().filter(all, context);
  }

  async create(data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Snippet> {
    const snippet: Snippet = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.db.snippets.add(snippet);
    return snippet;
  }

  async update(id: string, updater: (s: Snippet) => Partial<Snippet>): Promise<void> {
    const existing = await this.db.snippets.get(id);
    if (!existing) throw new Error(`Snippet ${id} not found`);
    const updates = updater(existing);
    await this.db.snippets.update(id, { ...updates, updatedAt: Date.now() });
  }

  async delete(id: string): Promise<void> {
    await this.db.snippets.delete(id);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await this.db.snippets.where('id').anyOf(ids).delete();
  }

  async search(query: string): Promise<Snippet[]> {
    const all = await this.getAll();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.trigger.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
}
```

---

## 13. Store 设计

```typescript
// 文件：src/stores/snippet.ts

import { defineStore } from 'pinia';

export const useSnippetStore = defineStore('snippet', () => {
  const repo = ref<SnippetRepository | null>(null);
  const snippets = ref<Snippet[]>([]);
  const isLoaded = ref(false);

  async function initialize(db: InkForgeDB): Promise<void> {
    repo.value = new SnippetRepository(db);
    await reload();
  }

  async function reload(): Promise<void> {
    if (!repo.value) return;
    snippets.value = await repo.value.getAll();
    isLoaded.value = true;
  }

  async function create(data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Snippet> {
    const s = await repo.value!.create(data);
    snippets.value.unshift(s);
    return s;
  }

  async function update(id: string, updates: Partial<Snippet>): Promise<void> {
    await repo.value!.update(id, () => updates);
    const idx = snippets.value.findIndex((s) => s.id === id);
    if (idx >= 0) {
      snippets.value[idx] = { ...snippets.value[idx], ...updates, updatedAt: Date.now() };
    }
  }

  async function remove(id: string): Promise<void> {
    await repo.value!.delete(id);
    snippets.value = snippets.value.filter((s) => s.id !== id);
  }

  async function incrementUsage(id: string): Promise<void> {
    await repo.value!.update(id, (s) => ({
      usageCount: s.usageCount + 1,
      lastUsedAt: Date.now(),
    }));
    const s = snippets.value.find((s) => s.id === id);
    if (s) {
      s.usageCount += 1;
      s.lastUsedAt = Date.now();
    }
  }

  async function importSnippets(bundle: SnippetExportBundle): Promise<void> {
    for (const s of bundle.snippets) {
      const existing = snippets.value.find((e) => e.trigger === s.trigger);
      if (!existing) {
        await create({ ...s, id: undefined as never });
      }
      // 冲突交由 UI 层处理（弹出冲突解决对话框）
    }
  }

  async function exportAll(): Promise<SnippetExportBundle> {
    return exportSnippets();
  }

  const byType = computed(() => ({
    text: snippets.value.filter((s) => s.type === 'text'),
    block: snippets.value.filter((s) => s.type === 'block'),
  }));

  const sortedByUsage = computed(() =>
    [...snippets.value].sort((a, b) => b.usageCount - a.usageCount)
  );

  return {
    snippets,
    isLoaded,
    byType,
    sortedByUsage,
    initialize,
    reload,
    create,
    update,
    remove,
    incrementUsage,
    importSnippets,
    exportAll,
  };
});
```

---

## 14. 验收矩阵

| # | 测试场景 | 输入/操作 | 预期结果 |
|---|---|---|---|
| T-01 | 文本 Snippet 基本触发 | 输入触发词 + Tab | 触发词删除，内容展开 |
| T-02 | 含内置变量展开 | Snippet 含 `$DATE`，触发 | 展开后 `$DATE` 替换为当前日期 |
| T-03 | `$TIME` 变量 | Snippet 含 `$TIME` | 展开后显示当前时间 HH:mm |
| T-04 | `$UUID` 变量 | Snippet 含 `$UUID` | 展开后为有效 UUID v4 |
| T-05 | `$CLIPBOARD` 变量 | 剪贴板有文字，触发 | 展开后包含剪贴板内容 |
| T-06 | Tab Stop `$1` 定位 | Snippet 含 `$1` | 展开后光标选中 $1 位置 |
| T-07 | Tab Stop 跳转 `$1 -> $2 -> $0` | 连按 Tab | 光标依次跳转 |
| T-08 | Shift+Tab 反向跳转 | 在 $2 按 Shift+Tab | 光标跳回 $1 |
| T-09 | `$0` 最终光标 | Tab 到 $0 | 光标移至 $0，Snippet 会话结束 |
| T-10 | Tab Stop 带 placeholder | `${1:默认值}` | 展开后选中"默认值"文字 |
| T-11 | Escape 退出会话 | 在 Snippet 会话中按 Esc | 会话结束，光标留在当前位置 |
| T-12 | Tab 不触发优先级 | 无触发词时按 Tab | 执行列表缩进或默认 Tab |
| T-13 | 块级 Snippet 通过斜杠命令插入 | `/user` 组选择 Snippet | 内容展开为块 |
| T-14 | 命令面板搜索 Snippet | Ctrl+K，搜索片段名 | 命令面板显示对应片段 |
| T-15 | 新建 Snippet | Settings > 代码片段 > 新建 | 可保存并在编辑器中使用 |
| T-16 | 编辑 Snippet | 修改触发词并保存 | 新触发词生效，旧触发词失效 |
| T-17 | 删除 Snippet | Settings 中删除 | 编辑器中不再响应 |
| T-18 | 使用次数统计 | 触发 Snippet 5 次 | usageCount = 5 |
| T-19 | 按使用频率排序 | 切换排序 | 高频 Snippet 排前 |
| T-20 | 全局作用域 | 全局 Snippet，切换文章 | 任意文章均有效 |
| T-21 | 文档作用域 | 文档 Snippet，切换文章 | 仅限原文章有效 |
| T-22 | 标签作用域 | tags=['技术'] Snippet | 仅标签含"技术"的文档有效 |
| T-23 | 导出为 JSON | 导出全部 Snippet | 生成合法 JSON 文件 |
| T-24 | 导入 InkForge JSON | 导入上述 JSON | Snippet 正确还原 |
| T-25 | 导入 VSCode 格式 | 导入 VSCode .json | 触发词和内容正确映射 |
| T-26 | 导入触发词冲突 | 导入与现有同触发词的 Snippet | 弹出冲突解决对话框 |
| T-27 | 区分大小写触发词 | `triggerCaseSensitive=true` | `/Date` 不触发 `/date` Snippet |
| T-28 | 撤销展开 | 展开后 Ctrl+Z | 内容恢复为触发词（或完全撤销）|

---

## 2026-05-02 Baseline Implementation Note

Baseline status: Pass for the compatible local-first Snippet System baseline; full Spec 37 remains partially pending.

Implemented baseline coverage:

- Dexie schema v18 adds the additive `snippets` table with typed `SnippetRecord` rows and preserves all existing stores, including v17 `backlinks` and v16 `layoutStates`.
- `services/snippet/*` implements runtime Zod schemas, VS Code/TextMate-style resolver support for `$1`, `${1:placeholder}`, `$0`, `$DATE`, `$TIME`, `$DATETIME`, `$UUID`, `$CLIPBOARD`, `$TITLE`, `$AUTHOR`, and `$SELECTED_TEXT`.
- Trigger matching supports case-sensitive and case-insensitive text snippets, word-boundary protection, longest-trigger priority, usage-count tie breaking, and no normal Tab hijack without a clear trigger.
- `SnippetRepository` and `SnippetService` provide create, update, delete, list, search, scope filtering, usage accounting, InkForge JSON export/import, and VS Code snippet JSON normalization.
- `useSnippetStore` exposes service-backed snippet list, search results, loading/saving flags, error state, last action, create/update/delete/expand/usage/import/export actions, and computed counts.
- `SnippetExpansion` is registered additively in `EditorPanel` and expands persisted text snippets on explicit trigger plus Tab using the real store snapshot and runtime context. Existing source mode, slash commands, command palette, autosave, image handling, and Markdown authority behavior are not replaced.
- No snippets are seeded during application startup. Tests create isolated fixture rows only inside test-owned tables or browser smoke cleanup.

Validation evidence:

- `pnpm exec vitest run src/services/snippet/snippet.test.ts`: 1 file, 11 tests passed.
- `pnpm exec vitest run src/services/wiki-link/wiki-link.test.ts src/services/snippet/snippet.test.ts`: 2 files, 21 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 17 files and 123 tests passed.
- `pnpm build`: passed with existing non-blocking Vite dynamic/static import and chunk-size warnings only.
- Playwright browser smoke on `http://127.0.0.1:5183/workstation`: dynamic imported real snippet and db modules, verified `db.verno === 18`, verified `snippets` table and trigger/scope indexes, preserved `backlinks`, performed real IndexedDB snippet put/get/delete round-trip, verified resolver and matcher output, and observed zero console errors.
- Dev server cleanup: Vite session stopped; port 5183 had no listening process after cleanup, only transient `TIME_WAIT` entries.
- GitNexus impact/detect_changes attempted during this implementation line but MetaMCP returned `Transport closed`; this is recorded as unavailable rather than passed.

Pending for full Spec 37 pass:

- Full Settings snippet manager UI.
- Slash-command block snippet injection and command-palette dynamic snippet commands.
- Interactive mirrored tab-stop session navigation, Shift+Tab reverse navigation, Escape session exit, and transform syntax.
- Import conflict-resolution modal, multi-cursor support, 50k snippet benchmark, full E2E/a11y matrix, and packaged Tauri validation.
