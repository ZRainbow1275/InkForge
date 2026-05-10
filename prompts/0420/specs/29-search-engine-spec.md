> 版本: v2.1 | 状态: Draft | 关联决策: F-07, F-03, L1-27, EX-03 | 依赖 Spec: 12-file-manager-spec.md, 47-tag-system-spec.md, 11-document-lifecycle-spec.md

# Spec 29 — 搜索引擎（SearchEngine）

---

## 目录

1. 概述与设计目标
2. 架构总览
3. TypeScript 类型系统
4. 索引方案（MiniSearch）
5. 搜索语法（DSL）
6. 全局搜索（Ctrl+Shift+F）
7. 局部搜索（Ctrl+F）
8. 搜索结果展示
9. 搜索历史
10. 命令面板集成
11. SmartFolder 集成
12. 性能优化策略
13. Store 定义
14. Repository 定义
15. 测试矩阵

---

## 1. 概述与设计目标

搜索引擎是 InkForge 内容检索的核心基础设施，分为两个独立系统：

- **全局搜索**（Ctrl+Shift+F）：跨所有文档的全文检索，支持 DSL 高级语法
- **局部搜索**（Ctrl+F）：在当前文档内高亮 + 替换，实时精确匹配

两个系统共享 DSL 查询解析器，但索引策略和 UI 完全独立。

### 1.1 核心能力

- 基于 MiniSearch 的全文索引（无服务端依赖，纯前端）
- 支持模糊匹配、精确短语、字段过滤、布尔运算符、通配符
- 增量索引（文档保存时 debounce 2s 后 re-index）
- 初始化全量索引在 Web Worker 后台执行，不阻塞 UI
- 局部搜索使用 ProseMirror Decoration 实现实时高亮
- 局部搜索支持正则替换（单个/全部）

### 1.2 产品定位

- **不是 AI 搜索**：v2.1 只做关键词检索，不引入向量搜索或语义理解
- **不是文件系统搜索**：仅搜索 InkForge 管理的文档库（IndexedDB 数据）
- **与命令面板共享底层**：CommandPalette（EX-03）的文档搜索功能复用本 Spec 的 search API

---

## 2. 架构总览

```
SearchEngine
├── IndexService (Web Worker)
│   ├── MiniSearchAdapter       — MiniSearch 实例包装
│   ├── IncrementalIndexer      — 文档保存时触发 re-index
│   └── BulkIndexer             — 首次启动批量索引
│
├── DSLParser                   — 查询字符串 → SearchQuery AST
│   ├── FieldFilter             — status: / tag: / date: / wordCount:
│   ├── BooleanOperator         — AND / OR / NOT（-前缀）
│   └── PhraseMatcher           — 双引号精确短语
│
├── GlobalSearchView (Ctrl+Shift+F)
│   ├── GlobalSearchInput       — 搜索框 + 语法提示
│   ├── ResultList              — 虚拟滚动结果列表
│   │   └── ResultCard          — 文档卡片（标题/路径/摘要/时间）
│   ├── ResultSorter            — 相关性/时间/标题
│   └── SearchHistoryPanel      — 最近 10 条历史
│
└── LocalSearchPanel (Ctrl+F)
    ├── LocalSearchInput        — 搜索框（含选项 Toggle）
    ├── HighlightDecorator      — ProseMirror Decoration 高亮
    ├── NavigationController    — 上/下条导航
    └── ReplaceController       — 单个/全部替换
```

**数据流**：

```
文档保存 ──debounce 2s──> IncrementalIndexer ──postMessage──> Web Worker
                                                                    │
                                                              MiniSearch.update()
                                                                    │
用户搜索 ──DSLParser──> SearchQuery ──postMessage──> Web Worker
                                                          │
                                                    MiniSearch.search()
                                                          │
                                               SearchResult[] ──> useSearchStore
                                                                      │
                                                                 GlobalSearchView
```

---

## 3. TypeScript 类型系统

```typescript
// src/types/search.ts

/** 搜索字段 */
export type SearchField = 'title' | 'content' | 'tags' | 'author' | 'status';

/** 布尔运算符类型 */
export type BooleanOp = 'AND' | 'OR' | 'NOT';

/** 字段过滤条件 */
export interface FieldFilter {
  field: SearchField | 'wordCount' | 'createdAt' | 'updatedAt';
  operator: '=' | '>' | '<' | '>=' | '<=' | 'in' | 'prefix';
  value: string | number | string[];
}

/** 解析后的搜索查询 AST */
export interface SearchQuery {
  /** 自由文本关键词（模糊匹配） */
  terms: string[];
  /** 精确短语（双引号内容） */
  phrases: string[];
  /** 字段过滤器列表 */
  filters: FieldFilter[];
  /** 顶层布尔运算符（默认 AND） */
  rootOp: BooleanOp;
  /** 原始查询字符串 */
  raw: string;
}

/** 搜索结果单项 */
export interface SearchResult {
  id: string;
  score: number;
  title: string;
  path: string;
  excerpt: string;
  /** 摘要内高亮词汇的起止位置 */
  highlights: Array<{ start: number; end: number }>;
  status: DocumentStatus;
  updatedAt: string;
  wordCount: number;
  tagIds: string[];
  isArchived: boolean;
}

/** 搜索请求 */
export interface SearchRequest {
  query: string;
  /** 已解析的 AST（可选，绕过重复解析） */
  parsed?: SearchQuery;
  /** 最大返回数量 */
  limit?: number;
  /** 偏移量（分页） */
  offset?: number;
  /** 排序方式 */
  sort?: 'relevance' | 'updatedAt' | 'title';
  /** 是否包含归档文档 */
  includeArchived?: boolean;
}

/** 搜索响应 */
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  took: number;
  query: SearchQuery;
}

/** 局部搜索匹配项 */
export interface LocalMatch {
  from: number;
  to: number;
  /** 是否为当前高亮项 */
  active: boolean;
}

/** 局部搜索状态 */
export interface LocalSearchState {
  query: string;
  matches: LocalMatch[];
  currentIndex: number;
  options: LocalSearchOptions;
}

/** 局部搜索选项 */
export interface LocalSearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

/** 搜索历史条目 */
export interface SearchHistoryItem {
  query: string;
  timestamp: string;
  resultCount: number;
}

/** MiniSearch 文档索引记录 */
export interface IndexedDocument {
  id: string;
  title: string;
  content: string;
  tags: string;
  author: string;
  status: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. 索引方案（MiniSearch）

### 4.1 选型理由

| 方案 | 体积 | WebAssembly | 索引质量 | 中文支持 |
|------|------|-------------|----------|---------|
| MiniSearch | ~7KB gzip | 不需要 | 前缀模糊匹配，BM25-like 评分 | 需分词预处理 |
| Fuse.js | ~8KB gzip | 不需要 | Bitap 算法，适合短文本 | 有限 |
| FlexSearch | ~6KB gzip | 不需要 | 倒排索引，速度最快 | 需配置 |
| Lunr.js | ~29KB gzip | 不需要 | 成熟但较重 | 插件支持 |

选择 MiniSearch 的理由：
- 支持 `prefix: true`（前缀自动补全）
- 支持 `boost` 字段权重（title 权重 > tags > content）
- 支持 `filter` 函数（结合字段过滤器）
- 增量更新 API（`add / remove / update` 单条操作）
- 不依赖 WebAssembly，兼容性好

### 4.2 MiniSearch 配置

```typescript
// src/services/search/MiniSearchAdapter.ts
import MiniSearch from 'minisearch';

const SEARCH_OPTIONS = {
  fields: ['title', 'content', 'tags', 'author'],
  storeFields: ['id', 'title', 'status', 'wordCount', 'updatedAt', 'tagIds', 'path'],
  searchOptions: {
    boost: {
      title: 3,
      tags: 2,
      author: 1.5,
      content: 1,
    },
    prefix: true,
    fuzzy: 0.2,
    combineWith: 'AND',
  },
  extractField: (doc: IndexedDocument, field: string) => {
    if (field === 'content') {
      return stripMarkdown(doc.content);
    }
    return String((doc as Record<string, unknown>)[field] ?? '');
  },
  tokenize: (text: string, _fieldName?: string) => {
    return tokenizeText(text);
  },
  processTerm: (term: string, _fieldName?: string) => {
    return term.toLowerCase();
  },
};

export const miniSearch = new MiniSearch<IndexedDocument>(SEARCH_OPTIONS);
```

### 4.3 中文分词处理

MiniSearch 默认按空格分词，不支持中文。使用简单的 CJK 字符分割策略：

```typescript
function tokenizeText(text: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (const char of text) {
    const code = char.charCodeAt(0);
    const isCJK = (code >= 0x4e00 && code <= 0x9fff)
      || (code >= 0x3400 && code <= 0x4dbf)
      || (code >= 0xf900 && code <= 0xfaff);

    if (isCJK) {
      if (current) {
        tokens.push(...current.trim().split(/\s+/).filter(Boolean));
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(...current.trim().split(/\s+/).filter(Boolean));
  }

  return tokens.filter(t => t.length > 0);
}
```

**局限性说明**：单字切分会导致"苹果"分为"苹"和"果"，精确短语仍走 phrase 匹配。v2.2 可考虑引入 jieba-wasm 分词。

### 4.4 Markdown 内容预处理

索引前剥除 Markdown 标记，减少噪音：

```typescript
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')      // 代码块
    .replace(/`[^`]*`/g, '')             // 行内代码
    .replace(/!\[.*?\]\(.*?\)/g, '')     // 图片
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // 链接（保留文本）
    .replace(/#+\s/g, '')                // 标题标记
    .replace(/[*_~`>#\-=|]/g, ' ')      // 其他标记
    .replace(/\s+/g, ' ')
    .trim();
}
```

### 4.5 增量索引

文档保存时触发增量 re-index（debounce 2s）：

```typescript
// src/services/search/IncrementalIndexer.ts

export class IncrementalIndexer {
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  scheduleReindex(doc: IndexedDocument): void {
    if (this.pending.has(doc.id)) {
      clearTimeout(this.pending.get(doc.id)!);
    }

    const timer = setTimeout(() => {
      this.pending.delete(doc.id);
      searchWorker.postMessage({ type: 'UPDATE', doc });
    }, 2000);

    this.pending.set(doc.id, timer);
  }

  scheduleRemove(docId: string): void {
    searchWorker.postMessage({ type: 'REMOVE', id: docId });
  }
}
```

### 4.6 初始化批量索引

首次启动（或索引数据丢失时）在 Web Worker 中批量索引：

```typescript
// src/workers/search-index.worker.ts

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'BULK_INDEX':
      // 分批处理，每批 50 条，避免长任务阻塞
      for (let i = 0; i < payload.docs.length; i += 50) {
        const batch = payload.docs.slice(i, i + 50);
        miniSearch.addAll(batch);
        self.postMessage({ type: 'PROGRESS', current: i + batch.length, total: payload.docs.length });
      }
      self.postMessage({ type: 'BULK_INDEX_DONE' });
      break;

    case 'SEARCH':
      const results = miniSearch.search(payload.query, payload.options);
      self.postMessage({ type: 'SEARCH_RESULT', results, requestId: payload.requestId });
      break;

    case 'UPDATE':
      if (miniSearch.has(payload.doc.id)) {
        miniSearch.replace(payload.doc);
      } else {
        miniSearch.add(payload.doc);
      }
      break;

    case 'REMOVE':
      if (miniSearch.has(payload.id)) {
        miniSearch.remove({ id: payload.id } as IndexedDocument);
      }
      break;
  }
};
```

**进度反馈**：批量索引期间，左下角显示轻量进度条（不阻塞操作），完成后消失。

---

## 5. 搜索语法（DSL）

### 5.1 基本语法表

| 语法 | 示例 | 说明 |
|------|------|------|
| 普通关键词 | `Vue3 组件` | 模糊匹配，多词 AND |
| 精确短语 | `"Vue3 组件化"` | 双引号包裹，精确匹配 |
| 字段过滤 | `title:Vue3` | 仅搜索标题字段 |
| 标签过滤 | `tag:技术` | 含标签"技术"的文档 |
| 状态过滤 | `status:draft` | 状态为草稿的文档 |
| 字数过滤 | `wordCount:>3000` | 字数大于 3000 |
| 日期过滤 | `date:>2026-01-01` | 修改时间晚于指定日期 |
| 布尔 AND | `Vue3 组件` | 多词之间默认 AND |
| 布尔 OR | `Vue3 \| React` | 管道符分隔（\| 或空格+OR+空格） |
| 布尔 NOT | `-草稿` 或 `-status:draft` | 减号前缀 |
| 通配符 | `auto*` | 前缀匹配（MiniSearch prefix=true） |
| 组合 | `title:Vue3 status:writing tag:技术` | 多个字段过滤器组合 |

### 5.2 字段过滤操作符

| 操作符 | 适用字段 | 示例 |
|--------|---------|------|
| `:` | 字符串字段 | `status:draft` |
| `:>` | 数值/日期字段 | `wordCount:>1000` / `date:>2026-01` |
| `:<` | 数值/日期字段 | `wordCount:<500` |
| `:>=` / `:<=` | 数值字段 | `wordCount:>=500` |
| `:..(范围)` | 数值字段 | `wordCount:1000..5000` |
| `:\|`（多值） | 状态字段 | `status:draft\|writing` |

### 5.3 特殊关键词

```
status:draft|writing|review|ready_to_publish|published|archived
date:today
date:last-7d
date:last-30d
date:this-week
date:this-month
```

### 5.4 DSL 解析器实现

```typescript
// src/services/search/DSLParser.ts

export class DSLParser {
  parse(raw: string): SearchQuery {
    const tokens = this.tokenize(raw);
    const terms: string[] = [];
    const phrases: string[] = [];
    const filters: FieldFilter[] = [];

    for (const token of tokens) {
      if (token.startsWith('"') && token.endsWith('"')) {
        phrases.push(token.slice(1, -1));
      } else if (this.isFieldFilter(token)) {
        filters.push(this.parseFieldFilter(token));
      } else if (token.startsWith('-') && token.length > 1) {
        filters.push({ field: 'content', operator: '=', value: `NOT:${token.slice(1)}` });
      } else {
        terms.push(token);
      }
    }

    return { terms, phrases, filters, rootOp: 'AND', raw };
  }

  private tokenize(raw: string): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < raw.length) {
      if (raw[i] === '"') {
        const end = raw.indexOf('"', i + 1);
        if (end !== -1) {
          result.push(raw.slice(i, end + 1));
          i = end + 1;
        } else {
          i++;
        }
      } else if (raw[i] === ' ') {
        i++;
      } else {
        const end = raw.indexOf(' ', i);
        result.push(end === -1 ? raw.slice(i) : raw.slice(i, end));
        i = end === -1 ? raw.length : end;
      }
    }

    return result.filter(Boolean);
  }

  private isFieldFilter(token: string): boolean {
    return /^[a-zA-Z]+:.+/.test(token);
  }

  private parseFieldFilter(token: string): FieldFilter {
    const colonIndex = token.indexOf(':');
    const field = token.slice(0, colonIndex) as SearchField;
    const rest = token.slice(colonIndex + 1);

    if (rest.includes('..')) {
      const [min, max] = rest.split('..').map(Number);
      return { field, operator: 'in', value: [String(min), String(max)] };
    } else if (rest.startsWith('>=')) {
      return { field, operator: '>=', value: rest.slice(2) };
    } else if (rest.startsWith('<=')) {
      return { field, operator: '<=', value: rest.slice(2) };
    } else if (rest.startsWith('>')) {
      return { field, operator: '>', value: rest.slice(1) };
    } else if (rest.startsWith('<')) {
      return { field, operator: '<', value: rest.slice(1) };
    } else if (rest.includes('|')) {
      return { field, operator: 'in', value: rest.split('|') };
    } else {
      return { field, operator: '=', value: rest };
    }
  }
}
```

### 5.5 DSL 搜索框提示

全局搜索框下方显示 DSL 语法提示（collapsible），当用户输入 `:` 时自动展开字段提示：

```
可用字段：title: tag: status: wordCount: date:
示例：title:Vue3 status:writing wordCount:>1000
```

---

## 6. 全局搜索（Ctrl+Shift+F）

### 6.1 触发与关闭

| 触发方式 | 行为 |
|---------|------|
| `Ctrl+Shift+F` | 打开全局搜索弹层 |
| `Escape` | 关闭（若搜索框无内容）或清空（若有内容） |
| 点击结果外区域 | 关闭 |
| 打开文档后 | 关闭弹层，跳转到文档 |

### 6.2 UI 布局

```
┌─────────────────────────────────────────────────────────────┐
│  [搜索图标] [搜索框 placeholder: 搜索文档... DSL 支持]   [×] │
├─────────────────────────────────────────────────────────────┤
│  排序: [相关性 ▼] [修改时间] [标题]     共 N 条结果         │
├─────────────────────────────────────────────────────────────┤
│  结果列表（虚拟滚动，每页 20 条）                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [FilePen] 文档标题                    [writing] 2h前 │   │
│  │ 文档/文件夹/路径                               1234字 │   │
│  │ ...匹配的上下文 <mark>关键词</mark> 摘要...         │   │
│  └──────────────────────────────────────────────────────┘   │
│  [更多结果...]                                              │
├─────────────────────────────────────────────────────────────┤
│  最近搜索：Vue3 · TipTap · 性能优化                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 搜索体验细节

**实时搜索**：
- 用户停止输入 150ms 后自动触发搜索（debounce 150ms）
- 输入时显示 loading spinner（轻量，仅圈）
- 结果列表平滑更新（不清空再插入，使用 transition）

**空结果处理**：
- 无结果：插画 + "没有找到匹配的文档" + "尝试: 简化查询 / 使用 DSL 过滤"
- 空查询：显示最近文档（最多 5 条）+ 搜索历史

**搜索范围**：
- 默认不包含归档文档
- 页面底部"包含归档文档"Toggle（记住用户选择）

**键盘导航**：
- `ArrowDown` / `ArrowUp`：在结果列表中移动焦点
- `Enter`：打开当前高亮结果
- `Ctrl+Enter`：在新标签页打开
- `Tab`：在搜索框和结果列表间切换焦点

---

## 7. 局部搜索（Ctrl+F）

### 7.1 触发与关闭

| 触发方式 | 行为 |
|---------|------|
| `Ctrl+F` | 打开局部搜索面板 |
| `Escape` | 关闭并移除所有高亮 |
| `Ctrl+H` | 打开局部搜索并激活替换模式 |

### 7.2 UI 布局

局部搜索面板浮动于编辑器顶部右侧，不遮挡内容：

```
┌────────────────────────────────────────────────────────┐
│ [搜索框]  [Aa区分大小写] [W全字匹配] [.*正则] 3/12 [×] │
│ [替换框]                         [替换] [替换全部]      │
└────────────────────────────────────────────────────────┘
```

- 搜索框：实时搜索（无 debounce，逐字触发）
- 计数器：`当前/总数`（如 3/12），实时更新
- 替换行：默认折叠，`Ctrl+H` 或点击展开图标展开

### 7.3 高亮实现（ProseMirror Decoration）

```typescript
// src/editor/plugins/local-search-plugin.ts
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const localSearchPluginKey = new PluginKey('localSearch');

export function createLocalSearchPlugin(): Plugin {
  return new Plugin({
    key: localSearchPluginKey,

    state: {
      init() {
        return DecorationSet.empty;
      },

      apply(tr, decorations) {
        const meta = tr.getMeta(localSearchPluginKey) as LocalSearchState | undefined;
        if (!meta) return decorations.map(tr.mapping, tr.doc);

        if (!meta.query) return DecorationSet.empty;

        const decos: Decoration[] = [];
        const matches = findAllMatches(tr.doc, meta.query, meta.options);

        matches.forEach((match, i) => {
          decos.push(
            Decoration.inline(match.from, match.to, {
              class: i === meta.currentIndex ? 'search-highlight-active' : 'search-highlight',
            })
          );
        });

        return DecorationSet.create(tr.doc, decos);
      },
    },

    props: {
      decorations(state) {
        return localSearchPluginKey.getState(state);
      },
    },
  });
}
```

**样式定义**：
```css
/* src/styles/local-search.css */
.search-highlight {
  background-color: var(--search-highlight-bg, #ffeb3b40);
  border-radius: 2px;
}

.search-highlight-active {
  background-color: var(--search-highlight-active-bg, #ff980080);
  border-radius: 2px;
  outline: 1px solid var(--accent-orange);
}
```

### 7.4 导航

- `Ctrl+G` / `Enter`（搜索框内）：跳转到下一个匹配项（循环）
- `Ctrl+Shift+G` / `Shift+Enter`：跳转到上一个匹配项
- 每次导航后：滚动使当前匹配项可见（`scrollIntoView`），计数器更新

### 7.5 替换功能

**单个替换**（`Replace` 按钮 / `Ctrl+H` 后 `Enter`）：
1. 替换当前高亮项
2. 自动跳转到下一个匹配项
3. 通过 ProseMirror transaction 执行替换（保证在撤销历史中）

**全部替换**（`Replace All` 按钮）：
1. 确认对话框："将所有 N 处替换为 [替换文本]？"
2. 构造单个 transaction，批量替换（原子操作，可整体撤销）
3. Toast："已替换 N 处"

**正则替换**：
- 启用 `.*` Toggle 后，搜索框接受正则表达式
- 替换框支持反向引用（`$1`, `$2`）
- 正则无效时，搜索框边框变红并提示"正则表达式语法错误"

### 7.6 选项 Toggle

| 选项 | 图标 | 快捷键 | 默认 |
|------|------|--------|------|
| 区分大小写 | `Aa` | `Alt+C` | 关 |
| 全字匹配 | `W` | `Alt+W` | 关 |
| 正则模式 | `.*` | `Alt+R` | 关 |

选项状态持久化到 `localStorage`（跨文档保持，应用级别）。

---

## 8. 搜索结果展示

### 8.1 结果卡片（ResultCard）

```vue
<template>
  <div class="result-card" :class="{ 'is-archived': result.isArchived }">
    <div class="result-card__header">
      <component :is="statusIcon" class="result-card__icon" />
      <span class="result-card__title" v-html="highlightedTitle" />
      <StatusBadge :status="result.status" size="sm" />
      <span class="result-card__time">{{ relativeTime }}</span>
    </div>
    <div class="result-card__path">{{ result.path }}</div>
    <div class="result-card__excerpt" v-html="result.excerpt" />
    <div class="result-card__meta">
      <span>{{ result.wordCount }} 字</span>
      <TagList :tagIds="result.tagIds" size="xs" :max="3" />
    </div>
  </div>
</template>
```

**摘要高亮规则**：
- 摘要取匹配词前后各 50 字符的上下文（共约 100 字符）
- 高亮使用 `<mark>` 标签，样式为主题色背景（`var(--accent-yellow)`）
- 摘要超出时用 `...` 省略，确保关键词可见

### 8.2 排序选项

| 排序 | 说明 |
|------|------|
| 相关性（默认） | MiniSearch score 降序 |
| 修改时间 | `updatedAt` 降序 |
| 标题 | 标题字母/拼音升序 |

排序切换无需重新搜索（在 store 中重排已有结果）。

### 8.3 虚拟滚动

- 每页 20 条结果
- 滚动到底部自动加载下 20 条（内部分页，不刷新索引）
- 总数超过 1000 条时显示"仅展示前 1000 条最相关结果"

### 8.4 归档文档标识

归档文档在结果列表中以低对比度样式展示（`opacity: 0.6`），并在左侧显示 `[归档]` 灰色 badge。

---

## 9. 搜索历史

### 9.1 历史存储

- 最近 10 条搜索历史
- 持久化到 IndexedDB（`search:history:{accountId}`）
- 仅记录有结果的搜索（`resultCount > 0`）
- 相同查询字符串不重复记录（移至最新位置）

### 9.2 历史 UI

全局搜索框为空时，显示历史列表：

```
最近搜索
  • Vue3 组件化 (12 条)        [×删除]
  • status:writing wordCount:>2000 (3 条)   [×删除]
  • "性能优化" tag:技术 (8 条)  [×删除]
```

- 点击历史项：填入搜索框并立即执行搜索
- 点击 `×`：删除该条历史
- 底部"清除全部历史"链接

### 9.3 历史数据结构

```typescript
interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}
```

---

## 10. 命令面板集成

CommandPalette（EX-03）的文档搜索功能直接调用 `SearchRepository.search()`，无需独立索引：

```typescript
// CommandPalette 文档搜索
const docResults = await searchRepository.search({
  query: commandPaletteInput,
  limit: 5,
  sort: 'relevance',
});
```

CommandPalette 显示前 5 条文档结果，点击直接打开文档（不打开全局搜索弹层）。

---

## 11. SmartFolder 集成

SmartFolder 的 query 字符串与 DSL 搜索语法完全相同，共用 `DSLParser`：

```typescript
// src/repositories/SmartFolderRepository.ts

async resolve(smartFolder: SmartFolder): Promise<FileNode[]> {
  const parsed = dslParser.parse(smartFolder.query);
  const results = await searchRepository.search({
    query: smartFolder.query,
    parsed,
    limit: 1000,
    includeArchived: smartFolder.query.includes('status:archived'),
  });
  return results.results.map(mapSearchResultToFileNode);
}
```

SmartFolder 解析结果实时响应（每次进入 SmartFolder 视图时重新执行查询，不缓存）。

---

## 12. 性能优化策略

### 12.1 Web Worker 隔离

所有 MiniSearch 操作在独立 Web Worker 中执行，主线程不阻塞：

- `BULK_INDEX`：首次启动时批量构建索引
- `SEARCH`：查询执行，返回结果通过 postMessage 传回
- `UPDATE` / `REMOVE`：增量更新

### 12.2 搜索 Debounce

| 场景 | Debounce | 说明 |
|------|---------|------|
| 全局搜索输入 | 150ms | 快速响应，避免每字查询 |
| 局部搜索输入 | 0ms（即时） | 逐字高亮，直接计算 |
| 增量索引触发 | 2000ms | 保存后等待 2s 再 re-index |

### 12.3 结果缓存

相同查询字符串的结果缓存 30s（内存 LRU Cache，最多 20 条）：

```typescript
const cache = new LRUCache<string, SearchResponse>({ max: 20, ttl: 30_000 });

async search(req: SearchRequest): Promise<SearchResponse> {
  const cacheKey = JSON.stringify(req);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = await this.executeSearch(req);
  cache.set(cacheKey, result);
  return result;
}
```

### 12.4 索引大小控制

- `content` 字段只索引前 50,000 字符（超长文档截断）
- 索引记录删除文档（软删除和归档文档仍保留在索引中，靠 filter 函数排除）
- 可选：周期性压缩索引（每 7 天重建一次，避免旧数据积累）

### 12.5 性能目标

| 指标 | 目标 |
|------|------|
| 全局搜索响应（<500 文档） | < 50ms |
| 全局搜索响应（1000 文档） | < 200ms |
| 局部搜索高亮（10 万字文档） | < 100ms |
| 批量索引（500 文档） | < 5s（Worker 后台，不阻塞 UI） |
| 增量索引单文档 | < 20ms |

---

## 13. Store 定义

```typescript
// src/stores/useSearchStore.ts
import { defineStore } from 'pinia';

interface GlobalSearchState {
  query: string;
  results: SearchResult[];
  total: number;
  isLoading: boolean;
  sort: 'relevance' | 'updatedAt' | 'title';
  includeArchived: boolean;
  history: SearchHistoryItem[];
  isOpen: boolean;
}

interface LocalSearchState {
  query: string;
  matches: LocalMatch[];
  currentIndex: number;
  options: LocalSearchOptions;
  isOpen: boolean;
  isReplaceMode: boolean;
  replaceQuery: string;
}

export const useSearchStore = defineStore('search', {
  state: () => ({
    global: {
      query: '',
      results: [] as SearchResult[],
      total: 0,
      isLoading: false,
      sort: 'relevance' as const,
      includeArchived: false,
      history: [] as SearchHistoryItem[],
      isOpen: false,
    } satisfies GlobalSearchState,

    local: {
      query: '',
      matches: [] as LocalMatch[],
      currentIndex: 0,
      options: { caseSensitive: false, wholeWord: false, regex: false },
      isOpen: false,
      isReplaceMode: false,
      replaceQuery: '',
    } satisfies LocalSearchState,

    /** 索引状态 */
    indexStatus: {
      isInitialized: false,
      isIndexing: false,
      progress: 0,
      total: 0,
      lastIndexedAt: null as string | null,
    },
  }),

  actions: {
    /** 打开/关闭全局搜索 */
    openGlobalSearch(): void,
    closeGlobalSearch(): void,

    /** 执行全局搜索 */
    async search(query: string): Promise<void>,

    /** 更新排序 */
    setSort(sort: 'relevance' | 'updatedAt' | 'title'): void,

    /** 清除历史 */
    clearHistory(): void,
    removeHistoryItem(query: string): void,

    /** 打开/关闭局部搜索 */
    openLocalSearch(replaceMode?: boolean): void,
    closeLocalSearch(): void,

    /** 更新局部搜索查询 */
    setLocalQuery(query: string): void,

    /** 局部搜索导航 */
    goToNextMatch(): void,
    goToPreviousMatch(): void,

    /** 替换操作 */
    replaceCurrent(replacement: string): void,
    replaceAll(replacement: string): Promise<number>,

    /** 触发增量 re-index */
    scheduleReindex(docId: string): void,

    /** 初始化索引 */
    async initializeIndex(): Promise<void>,
  },
});
```

---

## 14. Repository 定义

```typescript
// src/repositories/SearchRepository.ts

interface SearchRepository {
  /** 全文搜索 */
  search(req: SearchRequest): Promise<SearchResponse>;

  /** 当前文档局部搜索（返回所有匹配的字符位置） */
  searchInDoc(docContent: string, query: string, options: LocalSearchOptions): LocalMatch[];

  /** 替换操作（返回新内容） */
  replaceInDoc(
    docContent: string,
    query: string,
    replacement: string,
    options: LocalSearchOptions & { all: boolean }
  ): { content: string; count: number };

  /** 构建/更新索引 */
  buildIndex(docs: IndexedDocument[]): Promise<void>;
  updateIndex(doc: IndexedDocument): Promise<void>;
  removeFromIndex(docId: string): Promise<void>;

  /** 搜索历史 CRUD */
  getHistory(accountId: string): Promise<SearchHistoryItem[]>;
  addHistory(item: Omit<SearchHistoryItem, 'id'>): Promise<void>;
  removeHistory(query: string, accountId: string): Promise<void>;
  clearHistory(accountId: string): Promise<void>;

  /** 获取搜索引擎状态 */
  getIndexStatus(): Promise<{
    isInitialized: boolean;
    documentCount: number;
    lastIndexedAt: string | null;
  }>;
}
```

---

## 15. 测试矩阵

### 15.1 单元测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 1 | `DSLParser.parse` 普通关键词 | terms 数组包含关键词 |
| 2 | `DSLParser.parse` 精确短语（双引号） | phrases 包含短语内容 |
| 3 | `DSLParser.parse` `title:Vue3` 字段过滤 | filters 包含 field=title, value=Vue3 |
| 4 | `DSLParser.parse` `status:draft\|writing` 多值 | filters operator='in', value=['draft','writing'] |
| 5 | `DSLParser.parse` `wordCount:>1000` 数值比较 | filters operator='>', value='1000' |
| 6 | `DSLParser.parse` `wordCount:1000..5000` 范围 | filters operator='in', value=['1000','5000'] |
| 7 | `DSLParser.parse` `-草稿` NOT 过滤 | filters 包含 NOT 标记 |
| 8 | `DSLParser.parse` `date:last-7d` 相对日期 | 正确解析为日期范围过滤 |
| 9 | `tokenizeText` 中文单字切分 | "苹果" → ["苹","果"] |
| 10 | `tokenizeText` 中英混合 | "Vue3组件" → ["Vue3","组","件"] |
| 11 | `stripMarkdown` 移除代码块 | `` ```code``` `` 不出现在结果中 |
| 12 | `stripMarkdown` 保留链接文本 | `[点击](url)` → "点击" |
| 13 | `searchInDoc` 精确匹配 | 返回所有匹配位置，无误报 |
| 14 | `searchInDoc` 区分大小写选项生效 | caseSensitive=true 时 "Vue" 不匹配 "vue" |
| 15 | `searchInDoc` 全字匹配选项生效 | wholeWord=true 时 "is" 不匹配 "this" |
| 16 | `searchInDoc` 正则匹配 | `\d+` 匹配所有数字串 |
| 17 | `replaceInDoc` 单次替换后当前索引后移 | 替换后 currentIndex 仍指向下一个匹配 |
| 18 | `replaceInDoc` 全部替换返回正确 count | 替换 5 处返回 count=5 |
| 19 | LRU 缓存命中相同查询 | 第二次查询不触发 Worker 消息 |
| 20 | 增量索引 debounce 2s 后触发 | 2s 内多次调用只触发一次 Worker 消息 |

### 15.2 集成测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 21 | 全量索引 100 文档后可搜索到内容 | 搜索关键词可命中已索引文档 |
| 22 | 文档保存后 2.1s 搜索到更新内容 | 增量 re-index 成功 |
| 23 | 归档文档默认不出现在搜索结果 | `includeArchived=false` 时过滤归档 |
| 24 | 归档文档在 `includeArchived=true` 时出现 | 带 [归档] 标识 |
| 25 | 软删除文档从索引中移除 | `removeFromIndex` 被调用，不再出现在结果中 |
| 26 | SmartFolder 查询结果与对应 DSL 搜索结果一致 | 同一 query 两种方式结果集相同 |
| 27 | 搜索历史正确记录（有结果才记录） | 0 条结果的搜索不进入历史 |
| 28 | 相同查询字符串不重复记录历史 | 移至最新位置 |
| 29 | 局部搜索高亮随编辑实时更新 | 文档内容变化后高亮位置自动调整 |
| 30 | 全部替换操作可整体撤销（单个 transaction） | Ctrl+Z 一次撤销全部替换 |

---

*本 Spec 由 InkForge v2.1 Spec 工程师生成，基于 F-07 D、F-03 D、L1-27 D、EX-03 决策综合制定。*

## 2026-05-02 Implementation Ledger: Local SearchEngine Baseline

This slice completed a real local-first SearchEngine baseline without mock rows or simulated success.

Completed baseline:

- Added the production dependency `minisearch@7.2.0` and implemented `src/services/search` around the real MiniSearch API.
- Added typed SearchEngine contracts for indexed documents, parsed query AST, field filters, result highlights, search responses, and history entries.
- Implemented deterministic CJK-aware tokenization with Latin token splitting, CJK unigrams, and adjacent CJK bigrams.
- Implemented Markdown/HTML stripping before indexing so search reads the same Markdown authority content that editor/export flows use.
- Implemented DSL parsing for terms, exact phrases, negated terms, OR/AND root markers, tag/status/author/source/category/title/content filters, date filters, and wordCount comparisons.
- Implemented full rebuild, incremental replace, incremental discard, archived exclusion by default, includeArchived override, relevance/updatedAt/title sorting, pagination, excerpts, and highlight ranges.
- Added `useSearchStore` with real ArticleRepository rebuild, incremental `indexArticle`, `removeArticle`, `clearIndex`, `search`, persisted history, error state, and indexing/searching state.
- Added unit coverage for indexing, DSL parsing, CJK search, phrase/filter behavior, archive inclusion, incremental updates, filter-only queries, and bounded history persistence.
- Verified in a real browser module smoke through Vite: SearchEngine imported from `/src/services/search/index.ts`, indexed real Article-shaped data, returned non-archived and archived result sets, produced a highlight, and persisted history in the real runtime path.

Verified commands:

- `pnpm exec vitest run src/services/search/search-engine.test.ts`
- `pnpm exec vue-tsc --noEmit`
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`
- `pnpm exec vitest run`
- `pnpm build`
- Browser module smoke on `http://127.0.0.1:5183/settings?tab=about` with console errors equal to 0.

Pending full-spec scope not claimed by this baseline:

- Full Ctrl+Shift+F GlobalSearchView UI.
- Ctrl+F local ProseMirror Find/Replace decorations.
- Web Worker index adapter.
- SmartFolder UI and saved query migration.
- CommandPalette visual document-result rendering.
- Search coverage for comments, templates, export logs, version bundles, and assets.
- Large-corpus benchmark and virtualization validation.
