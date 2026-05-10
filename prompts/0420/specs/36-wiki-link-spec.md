---
id: 36-wiki-link-spec
title: "Spec 36 | Wiki 双链系统"
version: "2.1.0"
status: approved
authors: ["spec-engineer"]
created: 2026-04-21
depends_on:
  - "_extracted/03-enhancement-answers.md (EX-02)"
  - "_extracted/02c-L2-T07-T08-T09-X-S.md (S 组)"
  - "00-decisions-part3b-tauri-visual-recovery.md"
  - "12-file-manager-spec.md"
---

# Spec 36 | Wiki 双链系统

## 目录

1. 功能概述
2. 语法规范
3. TipTap Extension 设计
4. 输入体验（自动补全）
5. 点击与跳转行为
6. 反向链接（Backlinks）
7. 断链处理
8. 存储与 Markdown 权威兼容
9. 导出行为
10. 数据模型
11. 服务层设计（WikiLinkRepository）
12. Store 设计
13. 性能与索引策略
14. 测试矩阵

---

## 1. 功能概述

Wiki 双链（WikiLink）是 InkForge v2.1 的**文档内跨引用系统**，允许用户在编辑器正文中通过 `[[文档标题]]` 语法快速引用其他文档，并建立双向的引用关系。

### 1.1 核心能力

- **内链语法**：`[[文档标题]]`、`[[文档标题|显示别名]]`、`[[文档标题#段落锚点]]`
- **输入自动补全**：输入 `[[` 后触发 fuzzy 搜索浮窗，实时匹配文档标题
- **双向链接索引**：自动建立并维护"谁引用了谁"的反向索引
- **反向链接面板**：在文档属性面板中展示"被哪些文档引用"
- **断链视觉提示**：目标文档不存在时显示橙色虚线样式

### 1.2 设计原则

- **Markdown 权威不污染**：WikiLink 以 `[[...]]` 原文存储，不转换为 HTML 属性，确保 Markdown 文件在其他编辑器中可读；
- **Typora 气质**：普通点击不跳转（避免误触），Ctrl+Click 才跳转，与 Typora 的 wiki link 行为一致；
- **零延迟体验**：自动补全浮窗响应时间 ≤ 100ms（本地 IndexedDB 查询）；

---

## 2. 语法规范

### 2.1 基本语法

```
[[文档标题]]
```

匹配规则：`[[` 开始，`]]` 结束，中间内容为文档标题。标题区分中英文大小写（与文档 `title` 字段精确匹配），但自动补全阶段不区分大小写。

### 2.2 带别名语法

```
[[文档标题|显示别名]]
```

渲染时只显示"显示别名"，但内部链接目标仍为"文档标题"。导出时根据目标格式决定是否保留别名。

### 2.3 带锚点语法

```
[[文档标题#段落锚点]]
[[文档标题#段落锚点|显示别名]]
```

锚点对应文档中的标题（h1~h6），锚点值为标题的 kebab-case（`# 我的章节` → `#我的章节` 或 `#我的章节`）。锚点跳转在当前版本实现定位到段落，不做平滑滚动（v2.2 候选）。

### 2.4 解析 TypeScript 类型

```typescript
// 文件：src/editor/extensions/wiki-link/parser.ts

export interface WikiLinkToken {
  target: string;         // 文档标题（必须）
  anchor?: string;        // 段落锚点（可选）
  alias?: string;         // 显示别名（可选）
  raw: string;            // 原始文本，如 "[[标题|别名]]"
}

export function parseWikiLink(text: string): WikiLinkToken | null {
  // 正则：[[target(#anchor)?(|alias)?]]
  const pattern = /^\[\[([^\]|#]+?)(?:#([^\]|]+?))?(?:\|([^\]]+?))?\]\]$/;
  const match = text.match(pattern);
  if (!match) return null;
  return {
    target: match[1].trim(),
    anchor: match[2]?.trim(),
    alias: match[3]?.trim(),
    raw: text,
  };
}
```

### 2.5 不支持的语法（v2.1 边界）

- 嵌套双链（`[[A [[B]]]]`）：不支持，以第一个 `]]` 结束；
- 相对路径链接（`[[../其他/文档]]`）：不支持，仅匹配标题；
- 文档 ID 直接引用（`[[article-uuid]]`）：内部存储用 ID，但语法层只暴露标题；

---

## 3. TipTap Extension 设计

### 3.1 节点类型定义

```typescript
// 文件：src/editor/extensions/wiki-link/WikiLinkExtension.ts

import { Node, mergeAttributes } from '@tiptap/core';

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  onResolve?: (target: string) => Promise<string | null>; // 返回 article id 或 null（断链）
}

export const WikiLinkNode = Node.create<WikiLinkOptions>({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,         // 不可编辑内部，作为整体删除

  addAttributes() {
    return {
      target: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-target'),
        renderHTML: (attrs) => ({ 'data-target': attrs.target }),
      },
      anchor: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-anchor') || null,
        renderHTML: (attrs) => attrs.anchor ? { 'data-anchor': attrs.anchor } : {},
      },
      alias: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-alias') || null,
        renderHTML: (attrs) => attrs.alias ? { 'data-alias': attrs.alias } : {},
      },
      resolved: {
        // 是否找到目标文档（动态属性，不持久化到 HTML）
        default: true,
      },
      articleId: {
        // 解析出的 article id（动态属性，不持久化）
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-wiki-link': true },
        HTMLAttributes,
        {
          class: node.attrs.resolved
            ? 'wiki-link wiki-link--resolved'
            : 'wiki-link wiki-link--broken',
        }
      ),
      node.attrs.alias || node.attrs.target,
    ];
  },

  addKeyboardShortcuts() {
    // Ctrl+Click 由 NodeView 处理，这里不需要
    return {};
  },
});
```

### 3.2 NodeView（渲染层）

```typescript
// 文件：src/editor/extensions/wiki-link/WikiLinkNodeView.vue

<template>
  <span
    :class="[
      'wiki-link',
      resolved ? 'wiki-link--resolved' : 'wiki-link--broken'
    ]"
    :title="resolved ? `跳转到：${target}` : `文档不存在：${target}`"
    @click.exact="handleClick"
    @click.ctrl="handleCtrlClick"
    @click.meta="handleCtrlClick"
  >
    {{ displayText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useArticleNavigator } from '@/composables/useArticleNavigator';

const props = defineProps<{
  target: string;
  anchor?: string;
  alias?: string;
  resolved: boolean;
  articleId?: string;
}>();

const displayText = computed(() =>
  props.alias || (props.anchor ? `${props.target}#${props.anchor}` : props.target)
);

const { navigateTo, openCreateWithTitle } = useArticleNavigator();

function handleClick(e: MouseEvent) {
  // Typora 气质：普通点击不跳转（避免误触正文）
  // 仅在预览模式下直接点击跳转
  if (isPreviewMode()) {
    handleCtrlClick(e);
  }
}

function handleCtrlClick(e: MouseEvent) {
  e.preventDefault();
  if (props.resolved && props.articleId) {
    navigateTo(props.articleId, props.anchor);
  } else {
    // 断链：提示创建
    openCreateWithTitle(props.target);
  }
}
</script>
```

### 3.3 CSS 样式

```css
/* 文件：src/styles/components/wiki-link.css */

.wiki-link {
  display: inline;
  border-radius: var(--radius-sm);
  padding: 0 2px;
  cursor: pointer;
  font-weight: var(--font-weight-regular);
  transition: background var(--duration-micro) var(--ease-out),
              color var(--duration-micro) var(--ease-out);
  user-select: none; /* atom 节点不可文字选中 */
}

/* 已解析的链接：蓝色风格 */
.wiki-link--resolved {
  color: var(--paper-link);
  text-decoration: underline;
  text-decoration-style: solid;
  text-underline-offset: 2px;
}
.wiki-link--resolved:hover {
  background: rgba(var(--paper-link-rgb), 0.08);
}

/* 断链：橙色虚线 */
.wiki-link--broken {
  color: var(--color-warning);
  text-decoration: underline;
  text-decoration-style: dashed;
  text-underline-offset: 2px;
}
.wiki-link--broken:hover {
  background: var(--color-warning-subtle);
}
```

### 3.4 输入规则（InputRule）

```typescript
// 文件：src/editor/extensions/wiki-link/input-rule.ts

import { InputRule } from '@tiptap/core';

// 完整 [[...]] 输入完成后自动转换为节点
export const wikiLinkInputRule = new InputRule({
  find: /\[\[([^\]|#\n]+?)(?:#([^\]|\n]+?))?(?:\|([^\]\n]+?))?\]\]/,
  handler: ({ state, range, match }) => {
    const [, target, anchor, alias] = match;
    // 触发异步解析，初始 resolved=true 乐观更新，后台校验
    state.tr.replaceWith(
      range.from,
      range.to,
      state.schema.nodes.wikiLink.create({
        target: target.trim(),
        anchor: anchor?.trim() || null,
        alias: alias?.trim() || null,
        resolved: true, // 乐观，后台异步更新
      })
    );
  },
});
```

---

## 4. 输入体验（自动补全）

### 4.1 触发机制

用户输入 `[[` 后，自动补全浮窗弹出。采用 ProseMirror Plugin 监听输入：

```typescript
// 文件：src/editor/extensions/wiki-link/suggestion.ts

import { Suggestion } from '@tiptap/suggestion';
import Fuse from 'fuse.js';

export const wikiLinkSuggestion = Suggestion({
  char: '[[',
  startOfLine: false,
  command: ({ editor, range, props }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: 'wikiLink',
        attrs: {
          target: props.title,
          anchor: props.anchor || null,
          alias: null,
          resolved: props.resolved,
          articleId: props.id,
        },
      })
      .run();
  },
  items: async ({ query }) => {
    return await wikiLinkStore.searchArticles(query);
  },
});
```

### 4.2 Fuzzy 搜索配置

```typescript
// 文件：src/services/wiki-link/article-searcher.ts

import Fuse from 'fuse.js';

interface ArticleSearchItem {
  id: string;
  title: string;
  categoryPath: string;
  status: string;
}

const fuseOptions: Fuse.IFuseOptions<ArticleSearchItem> = {
  keys: [
    { name: 'title', weight: 0.8 },
    { name: 'categoryPath', weight: 0.2 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 1,
};

export class ArticleSearcher {
  private fuse: Fuse<ArticleSearchItem>;

  constructor(items: ArticleSearchItem[]) {
    this.fuse = new Fuse(items, fuseOptions);
  }

  search(query: string): ArticleSearchItem[] {
    if (!query) {
      // 无输入时展示最近打开的 10 篇
      return this.getRecentlyOpened(10);
    }
    return this.fuse.search(query).slice(0, 8).map((r) => r.item);
  }

  private getRecentlyOpened(limit: number): ArticleSearchItem[] {
    // 从 recentArticles store 读取
    return [];
  }
}
```

### 4.3 自动补全浮窗规格

```typescript
// 文件：src/components/editor/WikiLinkSuggestion.vue

// 浮窗位置：使用 Floating UI 计算
// 优先方向：上方（placement="top-start"），溢出时切换到下方
// 宽度：min 240px，max 360px
// 最多显示：8 条结果
// 键盘支持：↑↓ 选择、Enter 确认、Esc 关闭、Tab 同 Enter
```

视觉规格：

```css
.wiki-link-suggestion {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 4px;
  box-shadow: var(--shadow-md);
  z-index: 200;
  min-width: 240px;
  max-width: 360px;
}

.wiki-link-suggestion-item {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.wiki-link-suggestion-item:hover,
.wiki-link-suggestion-item.active {
  background: var(--color-brand-subtle);
}

.wiki-link-suggestion-title {
  font-size: var(--text-base);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}
.wiki-link-suggestion-meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}
.wiki-link-suggestion-empty {
  padding: 12px 10px;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
}
```

---

## 5. 点击与跳转行为

### 5.1 Typora 编辑模式

| 操作 | 行为 |
|---|---|
| 单击 | 无跳转（防止写作误触） |
| Ctrl+Click / Cmd+Click | 跳转到目标文档 |
| 断链 Ctrl+Click | 弹出"是否创建该文档？"确认弹窗 |

### 5.2 预览模式

| 操作 | 行为 |
|---|---|
| 单击（已解析） | 直接跳转 |
| 单击（断链） | Toast 提示"目标文档不存在，点击创建" |

### 5.3 跳转目标选项

Settings > Editor > WikiLink 中可配置跳转方式：

| 选项 | 行为 |
|---|---|
| 当前 Tab 打开（默认） | 替换当前文章，在 TabBar 中更新 Tab |
| 新 Tab 打开 | 在 TabBar 中新增 Tab |

```typescript
// 文件：src/composables/useArticleNavigator.ts

export function useArticleNavigator() {
  const tabStore = useTabStore();
  const settingsStore = useSettingsStore();

  async function navigateTo(articleId: string, anchor?: string) {
    const openMode = settingsStore.editor.wikiLinkOpenMode; // 'current' | 'new-tab'
    if (openMode === 'new-tab') {
      await tabStore.openInNewTab(articleId);
    } else {
      await tabStore.openInCurrentTab(articleId);
    }
    if (anchor) {
      // 等待文档加载后滚动到锚点
      nextTick(() => scrollToAnchor(anchor));
    }
  }

  async function openCreateWithTitle(title: string) {
    // 确认弹窗 -> 创建新文章 -> 跳转
  }

  return { navigateTo, openCreateWithTitle };
}
```

---

## 6. 反向链接（Backlinks）

### 6.1 数据结构

```typescript
// 文件：src/db/schema.ts

// IndexedDB 表：backlinks
export interface BacklinkRecord {
  id: string;           // uuid
  sourceArticleId: string;  // 引用方文章 ID
  targetArticleId: string;  // 被引用方文章 ID（目标）
  targetTitle: string;      // 被引用时的标题（快照，目标重命名后仍保留旧值）
  anchor?: string;          // 锚点（可选）
  context: string;          // 引用所在段落的前后 80 字（用于预览）
  createdAt: number;
  updatedAt: number;
}

// 索引：by-target（按被引用方查询）/ by-source（按引用方查询）
```

### 6.2 BacklinkRepository

```typescript
// 文件：src/services/wiki-link/BacklinkRepository.ts

export class BacklinkRepository {
  private db: InkForgeDB;

  // 扫描文章内容，提取所有 WikiLink，更新 backlinks 表
  async rebuildForArticle(sourceArticleId: string, content: string): Promise<void> {
    const links = extractWikiLinks(content); // 正则提取所有 [[...]]
    const resolvedLinks = await Promise.all(
      links.map(async (link) => {
        const targetArticle = await this.resolveTarget(link.target);
        return {
          sourceArticleId,
          targetArticleId: targetArticle?.id ?? null,
          targetTitle: link.target,
          anchor: link.anchor,
          context: extractContext(content, link.raw),
        };
      })
    );

    // 事务：删除该文章的旧 backlinks，写入新的
    await this.db.transaction('rw', this.db.backlinks, async () => {
      await this.db.backlinks
        .where('sourceArticleId')
        .equals(sourceArticleId)
        .delete();
      const valid = resolvedLinks.filter((l) => l.targetArticleId !== null);
      if (valid.length > 0) {
        await this.db.backlinks.bulkAdd(
          valid.map((l) => ({
            id: crypto.randomUUID(),
            ...l,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }))
        );
      }
    });
  }

  // 查询指向某文章的所有反向链接
  async getBacklinksTo(targetArticleId: string): Promise<BacklinkRecord[]> {
    return this.db.backlinks
      .where('targetArticleId')
      .equals(targetArticleId)
      .toArray();
  }

  // 解析链接目标（标题 -> articleId）
  private async resolveTarget(title: string): Promise<{ id: string } | null> {
    const article = await this.db.articles
      .where('title')
      .equalsIgnoreCase(title)
      .first();
    return article ? { id: article.id } : null;
  }
}

// 提取上下文（引用所在段落前后 80 字）
function extractContext(content: string, raw: string): string {
  const idx = content.indexOf(raw);
  if (idx < 0) return '';
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + raw.length + 40);
  return content.slice(start, end);
}
```

### 6.3 更新时机

- **文档保存时（自动保存成功）**：触发 `backlinksRepo.rebuildForArticle(articleId, content)`；
- **文章标题变更时**：更新所有引用了旧标题的链接节点的 `target` 属性，并重建相关文章的 backlinks；
- **文章删除时**：删除以该文章为 source 或 target 的所有 backlink 记录；

### 6.4 反向链接面板 UI

反向链接在文档属性面板（`F-06 DocumentPropertyPanel`）的"引用"Tab 中显示：

```typescript
// 文件：src/components/document-property/BacklinksPanel.vue

// 展示内容：
// - 引用该文档的文章列表（最多 20 条，超出显示"查看全部"）
// - 每条显示：文章标题 + 引用上下文预览（截断 80 字）
// - 点击引用方文章标题：跳转到该文章（复用 navigateTo）
// - 空状态：显示"暂无文章引用此文档"（无 emoji，纯文字）
```

---

## 7. 断链处理

### 7.1 断链检测

```typescript
// 文件：src/services/wiki-link/BrokenLinkDetector.ts

export class BrokenLinkDetector {
  // 文章加载时，异步解析所有 WikiLink 节点
  async resolveAllLinks(editor: Editor, db: InkForgeDB): Promise<void> {
    const nodes = getWikiLinkNodes(editor); // 遍历 ProseMirror 文档树
    for (const { pos, node } of nodes) {
      const target = node.attrs.target as string;
      const article = await db.articles
        .where('title')
        .equalsIgnoreCase(target)
        .first();
      
      const resolved = !!article;
      const articleId = article?.id ?? null;

      // 更新节点属性（不触发用户可见的编辑，不写入版本历史）
      editor.view.dispatch(
        editor.view.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          resolved,
          articleId,
        })
      );
    }
  }
}
```

### 7.2 断链视觉样式

已在 §3.3 定义：橙色虚线下划线（`text-decoration-style: dashed`），颜色 `--color-warning`。

### 7.3 断链 Tooltip

鼠标悬停在断链节点上显示 Tooltip：

```
文档不存在：[目标标题]
Ctrl+Click 创建该文档
```

### 7.4 断链创建流程

1. 用户 Ctrl+Click 断链节点；
2. 弹出确认对话框："是否创建名为「目标标题」的新文档？"；
3. 确认后：创建文章（title = 目标标题，status = draft）；
4. 跳转到新建文章；
5. 原断链节点异步更新为已解析状态；

---

## 8. 存储与 Markdown 权威兼容

### 8.1 HTML 存储格式

由于 InkForge v2.1 使用 HTML 作为运行时持久化格式（X-06 B），WikiLink 节点存储为：

```html
<span
  data-wiki-link
  data-target="文档标题"
  data-anchor="可选锚点"
  data-alias="可选别名"
>
  显示文字
</span>
```

### 8.2 Markdown 导出格式

导出为 Markdown 时，`WikiLinkSerializer` 将节点还原为 `[[...]]` 原文语法：

```typescript
// 文件：src/services/export/serializers/WikiLinkSerializer.ts

export function serializeWikiLink(node: ProseMirrorNode): string {
  const { target, anchor, alias } = node.attrs;
  let text = target;
  if (anchor) text += `#${anchor}`;
  const raw = `[[${text}${alias ? `|${alias}` : ''}]]`;
  return raw;
}
```

这确保导出的 `.md` 文件中保留 `[[...]]` 语法，在 Obsidian、Logseq 等工具中可识别。

### 8.3 Markdown 导入解析

导入 `.md` 文件时，WikiLink 解析器识别 `[[...]]` 并转换为节点：

```typescript
// 文件：src/services/import/WikiLinkImporter.ts

export function parseMarkdownWikiLinks(markdown: string): string {
  // 将 [[...]] 替换为 <span data-wiki-link ...> 形式，
  // 再经 ProseMirror 解析为节点
  return markdown.replace(
    /\[\[([^\]|#\n]+?)(?:#([^\]|\n]+?))?(?:\|([^\]\n]+?))?\]\]/g,
    (_, target, anchor, alias) => {
      const displayText = alias || (anchor ? `${target}#${anchor}` : target);
      return `<span data-wiki-link data-target="${escapeHtml(target)}"${anchor ? ` data-anchor="${escapeHtml(anchor)}"` : ''}${alias ? ` data-alias="${escapeHtml(alias)}"` : ''}>${escapeHtml(displayText)}</span>`;
    }
  );
}
```

---

## 9. 导出行为

### 9.1 导出为 HTML

WikiLink 节点保留为可点击的 `<a>` 标签（相对路径）：

```html
<!-- 已解析 -->
<a href="./文档标题.html#锚点" class="wiki-link">显示文字</a>

<!-- 断链 -->
<span class="wiki-link wiki-link--broken">显示文字</span>
```

### 9.2 导出为 Markdown

还原为 `[[...]]` 原文（见 §8.2）。

### 9.3 导出为微信公众号 / 小红书

这些平台不支持自定义链接跳转，WikiLink 节点降级为**纯文字**（保留显示文字，去除链接语义）：

```typescript
// PublishAdapter 的 WikiLink 处理
case 'wechat':
case 'xiaohongshu':
  return node.attrs.alias || node.attrs.target; // 仅保留文字
```

### 9.4 导出行为配置

Settings > Export > WikiLink 处理：

| 选项 | 行为 |
|---|---|
| 保留为 `[[...]]` 语法（Markdown 导出默认） | 原文保留 |
| 转换为相对路径链接（HTML 导出默认） | `<a href="...">` |
| 转换为纯文字（发布平台） | 仅保留 displayText |
| 完全删除 | 删除节点 |

---

## 10. 数据模型

### 10.1 articles 表扩展

```typescript
// src/db/schema.ts（扩展）

interface Article {
  // ... 现有字段 ...
  wikiLinkCount?: number;    // 该文章包含的 WikiLink 数量（冗余字段，加速统计）
  backlinkCount?: number;    // 指向该文章的反向链接数量（冗余字段）
}
```

### 10.2 backlinks 表（新增）

```typescript
interface BacklinkRecord {
  id: string;
  sourceArticleId: string;
  targetArticleId: string;
  targetTitle: string;
  anchor?: string;
  context: string;           // 引用上下文，最多 160 字
  createdAt: number;
  updatedAt: number;
}

// Dexie 索引定义
// db.backlinks.compound('sourceArticleId + targetArticleId') 唯一索引
// db.backlinks.index('targetArticleId')
// db.backlinks.index('sourceArticleId')
```

### 10.3 WikiLink 解析缓存

```typescript
// 内存缓存，应用生命周期内维护，关闭清空
interface WikiLinkResolutionCache {
  byTitle: Map<string, string | null>; // title -> articleId (null = 断链)
  byId: Map<string, string>;           // articleId -> title
}
```

---

## 11. 服务层设计（WikiLinkRepository）

```typescript
// 文件：src/services/wiki-link/WikiLinkService.ts

export class WikiLinkService {
  private db: InkForgeDB;
  private backlinksRepo: BacklinkRepository;
  private cache: WikiLinkResolutionCache;
  private searcher: ArticleSearcher;

  constructor(db: InkForgeDB) {
    this.db = db;
    this.backlinksRepo = new BacklinkRepository(db);
    this.cache = { byTitle: new Map(), byId: new Map() };
  }

  // 初始化：从 IndexedDB 加载所有文章标题到内存缓存
  async initialize(): Promise<void> {
    const articles = await this.db.articles.toArray();
    for (const a of articles) {
      this.cache.byTitle.set(a.title.toLowerCase(), a.id);
      this.cache.byId.set(a.id, a.title);
    }
    this.searcher = new ArticleSearcher(
      articles.map((a) => ({ id: a.id, title: a.title, categoryPath: a.categoryPath, status: a.status }))
    );
  }

  // 解析标题 -> articleId（同步，使用缓存）
  resolve(title: string): string | null {
    return this.cache.byTitle.get(title.toLowerCase()) ?? null;
  }

  // 文章搜索（用于自动补全）
  async searchArticles(query: string): Promise<ArticleSearchItem[]> {
    return this.searcher.search(query);
  }

  // 文章保存后更新 backlinks
  async onArticleSaved(articleId: string, content: string): Promise<void> {
    await this.backlinksRepo.rebuildForArticle(articleId, content);
    // 更新冗余计数
    const backlinks = await this.backlinksRepo.getBacklinksTo(articleId);
    await this.db.articles.update(articleId, { backlinkCount: backlinks.length });
  }

  // 文章标题变更后更新缓存和所有引用
  async onArticleTitleChanged(articleId: string, oldTitle: string, newTitle: string): Promise<void> {
    this.cache.byTitle.delete(oldTitle.toLowerCase());
    this.cache.byTitle.set(newTitle.toLowerCase(), articleId);
    this.cache.byId.set(articleId, newTitle);
    // 触发反向链接重建（异步，不阻塞 UI）
    queueMicrotask(() => this.rebuildAffectedSources(articleId));
  }

  // 文章删除后清理 backlinks
  async onArticleDeleted(articleId: string, title: string): Promise<void> {
    this.cache.byTitle.delete(title.toLowerCase());
    this.cache.byId.delete(articleId);
    await this.db.backlinks
      .where('sourceArticleId').equals(articleId)
      .or('targetArticleId').equals(articleId)
      .delete();
  }

  // 获取反向链接列表
  async getBacklinks(articleId: string): Promise<BacklinkRecord[]> {
    return this.backlinksRepo.getBacklinksTo(articleId);
  }

  private async rebuildAffectedSources(targetArticleId: string): Promise<void> {
    const sources = await this.db.backlinks
      .where('targetArticleId')
      .equals(targetArticleId)
      .toArray();
    for (const link of sources) {
      const article = await this.db.articles.get(link.sourceArticleId);
      if (article) {
        await this.backlinksRepo.rebuildForArticle(article.id, article.content);
      }
    }
  }
}
```

---

## 12. Store 设计

```typescript
// 文件：src/stores/wikiLink.ts

import { defineStore } from 'pinia';

export const useWikiLinkStore = defineStore('wikiLink', () => {
  const service = ref<WikiLinkService | null>(null);

  // 初始化（应用启动时调用）
  async function initialize(db: InkForgeDB) {
    service.value = new WikiLinkService(db);
    await service.value.initialize();
  }

  function resolve(title: string): string | null {
    return service.value?.resolve(title) ?? null;
  }

  async function searchArticles(query: string) {
    return service.value?.searchArticles(query) ?? [];
  }

  async function onArticleSaved(articleId: string, content: string) {
    await service.value?.onArticleSaved(articleId, content);
  }

  async function onArticleTitleChanged(articleId: string, oldTitle: string, newTitle: string) {
    await service.value?.onArticleTitleChanged(articleId, oldTitle, newTitle);
  }

  async function onArticleDeleted(articleId: string, title: string) {
    await service.value?.onArticleDeleted(articleId, title);
  }

  async function getBacklinks(articleId: string) {
    return service.value?.getBacklinks(articleId) ?? [];
  }

  return { initialize, resolve, searchArticles, onArticleSaved, onArticleTitleChanged, onArticleDeleted, getBacklinks };
});
```

---

## 13. 性能与索引策略

### 13.1 内存缓存

- 所有文章标题在应用启动时加载到内存 Map（约 50,000 篇文章 × 平均 20 字标题 ≈ 1MB，可接受）；
- 标题变更、新建、删除时实时更新 Map，无需重建；

### 13.2 Fuse.js 索引

- Fuse 索引在 `initialize()` 时一次性构建；
- 文章增删改时重建 Fuse 索引（异步，debounce 2s）；
- 文章超过 50,000 篇时，Fuse 搜索降级为前缀匹配（性能保护）；

### 13.3 Backlinks 重建优化

- 使用 Web Worker 后台处理大文章（> 50,000 字符）的 WikiLink 提取；
- 小文章（≤ 50,000 字符）在主线程 idle 时处理；
- 批量导入时，defer 所有 backlinks 重建到导入完成后统一执行；

### 13.4 解析缓存有效期

- 内存缓存无过期（应用生命周期）；
- 若文章标题来自用户输入（补全），不使用缓存（实时查询）；

---

## 14. 测试矩阵

| # | 测试场景 | 输入 | 预期输出 |
|---|---|---|---|
| T-01 | 基本 WikiLink 输入 | 输入 `[[文档A]]` | 转换为 WikiLink 节点，显示"文档A" |
| T-02 | 带别名 WikiLink | 输入 `[[文档A|查看详情]]` | 节点显示"查看详情" |
| T-03 | 带锚点 WikiLink | 输入 `[[文档A#第一章]]` | 节点存储 anchor="第一章" |
| T-04 | 带别名和锚点 | 输入 `[[文档A#第一章|参见第一章]]` | 全属性正确 |
| T-05 | 自动补全触发 | 输入 `[[` | 浮窗出现，显示最近文章 |
| T-06 | 自动补全 fuzzy 匹配 | 输入 `[[技术文` | 匹配"技术文章入门"等 |
| T-07 | 自动补全选择并插入 | 从补全列表点击文章 | 节点正确插入，浮窗关闭 |
| T-08 | 已解析链接渲染 | 目标文章存在 | 蓝色下划线，无虚线 |
| T-09 | 断链渲染 | 目标文章不存在 | 橙色虚线 |
| T-10 | Typora 模式普通点击 | 单击 WikiLink | 无跳转 |
| T-11 | Typora 模式 Ctrl+Click | Ctrl+Click 已解析链接 | 跳转到目标文章 |
| T-12 | 断链 Ctrl+Click | Ctrl+Click 断链节点 | 出现确认创建弹窗 |
| T-13 | 创建断链文章 | 断链弹窗确认 | 新建文章，节点变为已解析 |
| T-14 | 预览模式单击 | 预览模式下单击链接 | 直接跳转 |
| T-15 | 反向链接显示 | 文章 A 链接文章 B，打开 B | B 的属性面板显示"A"为引用方 |
| T-16 | 保存后更新 backlinks | 编辑 A，保存后 | 反向链接索引更新 |
| T-17 | 标题重命名后链接有效 | 文章 B 重命名 | A 中链接 B 的节点仍有效（重新解析）|
| T-18 | Markdown 导出保留语法 | 含 WikiLink 导出为 .md | 文件中为 `[[...]]` 语法 |
| T-19 | Markdown 导入识别语法 | 导入含 `[[...]]` 的 .md | 正确转换为 WikiLink 节点 |
| T-20 | HTML 导出链接正确 | 导出为 HTML | 已解析链接生成 `<a href>` |
| T-21 | 发布平台降级 | 导出到微信 | WikiLink 降级为纯文字 |
| T-22 | 文章删除清理 backlinks | 删除文章 B | 所有指向 B 的 backlink 记录删除 |
| T-23 | 大量 WikiLink 性能 | 文章含 500 个 WikiLink | 解析时间 < 2s |
| T-24 | 自动补全大库搜索 | 库中 10,000 篇文章 | 补全响应时间 < 100ms |
| T-25 | 锚点跳转 | Ctrl+Click 含锚点链接 | 跳转到文章并定位到段落 |
| T-26 | 重复标题文章 | 存在两篇同名文章 | 自动补全显示两条，分类路径区分 |
| T-27 | 空 WikiLink | 输入 `[[]]` | 不转换为节点（视为无效输入）|
| T-28 | 护眼模式下链接颜色 | 护眼模式开启 | 链接颜色适配为暖色调棕色 |

---

## 2026-05-02 Baseline Implementation Note

Baseline status: Pass for the compatible local-first WikiLink baseline; full Spec 36 remains partially pending.

Implemented baseline coverage:

- Markdown source remains authoritative: article bodies keep `[[...]]` syntax and the preview renderer converts it only at render time.
- Dexie schema v17 adds a derived `backlinks` local index with source, target, resolved, title, and compound time indexes.
- `services/wiki-link/*` provides a pure parser/extractor, typed backlink records, repository operations, service rebuild/search APIs, and singleton exports.
- Parser support covers `[[Title]]`, `[[Title|Alias]]`, and `[[Title#Anchor|Alias]]`; it rejects empty/nested invalid links and skips fenced code, inline code, and embed syntax.
- `useWikiLinkStore` exposes service-backed backlinks, broken links, search results, loading/indexing flags, errors, and rebuild/delete actions without seeded rows.
- `useArticleStore` now refreshes the derived backlink index after real create/update writes, rebuilds all links when a title change or new title can resolve incoming links, and cleans source/target backlink rows on trash delete.
- The Markdown extension renderer reuses the same parser and keeps `![[embed]]` and inline code untouched.

Validation evidence:

- `pnpm exec vitest run src/services/wiki-link/wiki-link.test.ts`: 1 file, 10 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 16 files, 112 tests passed.
- `pnpm build`: passed with existing non-blocking Vite dynamic/static import and chunk-size warnings.
- Browser smoke on `http://127.0.0.1:5183/workstation`: dynamic-imported the real WikiLink parser, renderer, and Dexie module; extracted one valid WikiLink from mixed markdown; rendered `.ink-wikilink`; preserved `![[Asset]]`; skipped inline code; verified Dexie `db.verno === 17`; verified `backlinks` indexes; performed real `backlinks` put/get/delete round-trip; console errors were zero.
- GitNexus impact/detect attempts were unavailable because the MCP transport returned `Transport closed`; validation was covered with real typecheck, lint, unit tests, full test suite, build, browser smoke, and diff hygiene checks.

Pending for full Spec 36 pass:

- TipTap atom NodeView, input rule, and suggestion popup UI.
- Broken-link create confirmation modal and resolved-link navigation behavior.
- Backlinks side panel, graph view, and anchor scroll positioning.
- Worker-backed large-vault indexing, Fuse.js 50k benchmark, and complete E2E/a11y matrix.

