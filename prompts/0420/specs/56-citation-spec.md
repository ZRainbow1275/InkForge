> 版本: v2.1.0-draft
> 阶段: Phase 2（内容扩展层）
> 依赖: 01-spec-editor-typora / 10-markdown-authority-spec / 16-markdown-extensions-spec / 15-export-publish-spec
> 被依赖: 15-export-publish-spec（导出时嵌入参考文献）/ 10-markdown-authority-spec §9
> 来源决策: M-02 D（脚注完整：语法+悬停+双向跳转+导出）/ EX-10（引用来源标注）
> 权威来源: 混合（0408 增强问卷 M-02 D + EX-10 + Pandoc 脚注规范 + CSL 标准）
> 创建日期: 2026-04-21
> 铁律遵循: R-01, R-02, R-05, R-14, R-15

# 56 — Citation Spec（引用/参考文献系统）

## 目录

- §1 背景与目标
- §2 范围与边界
- §3 系统架构总览（双模式）
- §4 简单脚注模式（FootnoteExtension）
- §5 脚注编号与排序
- §6 脚注面板（FootnotePanel）
- §7 交叉引用（同一脚注多次引用）
- §8 Typora 模式：脚注内联预览
- §9 学术引用模式（CitationExtension）
- §10 BibTeX 文件关联
- §11 引用语法
- §12 引用自动补全
- §13 CSL 格式支持
- §14 参考文献列表自动生成（BibliographyNode）
- §15 导出集成
- §16 CitationRepository
- §17 TipTap Extension 清单
- §18 TypeScript 类型定义
- §19 模块架构
- §20 测试矩阵
- §21 验收标准

---

## §1 背景与目标

### 1.1 问题背景

InkForge v2.0 没有脚注或引用支持。

来源决策：
- M-02 D：完整脚注：语法渲染 + 悬停预览 + 双向跳转 + 导出正确
- EX-10（v2.1 实现）：引用块关联外部来源 URL，保持引用链可追溯

问卷 M-08 D 对 KaTeX 做了公式面板 + 编号 + 交叉引用，
本 Spec 的学术引用模式是对该需求的内容引用侧的对称扩展。

### 1.2 目标

1. 提供基础脚注功能（Pandoc `[^1]` 语法），与 Markdown 权威模型完全兼容。
2. 提供可选的学术引用模式（BibTeX/CSL 风格），面向学术写作用户。
3. 两种模式可在同一文档共存（基础脚注不受学术模式影响）。
4. 脚注/引用在导出时正确渲染（各平台有降级策略）。

---

## §2 范围与边界

### 2.1 本 Spec 覆盖

| 能力 | 模式 |
|---|---|
| `[^1]` 脚注标记渲染 | 简单脚注 |
| 脚注定义（文档底部） | 简单脚注 |
| 脚注编号自动排序 | 简单脚注 |
| 脚注面板（底部/右侧） | 简单脚注 |
| 交叉引用（多次引用同一脚注） | 简单脚注 |
| Typora 模式气泡预览 | 简单脚注 |
| `[@authorYear]` 引用语法 | 学术引用 |
| `.bib` 文件关联 | 学术引用 |
| 引用自动补全 | 学术引用 |
| CSL 格式化（APA/MLA/Chicago/GB/T） | 学术引用 |
| 参考文献列表自动生成 | 学术引用 |
| 导出嵌入参考文献 | 学术引用 |

### 2.2 非目标（v2.1 明确不做）

- Zotero/Mendeley 直接集成（v2.2+ 候选）
- 联网查询 DOI / CrossRef（v2.2+）
- 协同审阅批注（→ 32-comment-review-spec）
- 引用样式编辑器（只做预设 4 种 CSL）
- EPUB 脚注（不做电子书导出）

---

## §3 系统架构总览（双模式）

### 3.1 模式关系

```
引用系统
├── 简单脚注模式（始终可用）
│   ├── FootnoteMarkExtension    # [^1] 标记
│   ├── FootnoteDefinitionNode   # 脚注内容定义
│   ├── FootnotePanel.vue        # 脚注面板
│   └── FootnoteTooltip.vue      # Typora 气泡预览
│
└── 学术引用模式（Settings 开启）
    ├── CitationMarkExtension    # [@key] 标记
    ├── BibliographyNode         # 参考文献列表节点
    ├── CitationRepository       # BibTeX 文件管理
    ├── CSLFormatter             # 格式化引用
    └── CitationAutocomplete     # 输入提示
```

### 3.2 共存策略

同一文档内，脚注 `[^1]` 和学术引用 `[@smith2023]` 可以共存：
- 脚注使用阿拉伯数字上标（¹²³）
- 学术引用使用 CSL 格式化的内联引用（如 `(Smith, 2023)`）
- 文档底部：脚注内容在前，参考文献列表在后（若两者都存在）

---

## §4 简单脚注模式（FootnoteExtension）

### 4.1 语法规范

遵循 Pandoc 脚注扩展（也是 Typora 的脚注语法）：

**内联引用标记**：
```markdown
这是一段文本[^1]，引用了脚注。
另一段文本[^note]使用命名脚注。
```

**脚注定义**（文档末尾或文档内）：
```markdown
[^1]: 这是脚注内容，可以包含**格式**和 [链接](url)。

[^note]: 命名脚注内容。
    缩进的段落属于同一个脚注。
```

### 4.2 节点类型

```
FootnoteMark (inline mark)       # [^1] 上标标记
FootnoteDefinition (block node)  # [^1]: 内容 定义块
FootnoteGroup (block node)       # 包裹所有脚注定义
```

### 4.3 FootnoteMark 定义

```typescript
// src/extensions/Citation/footnoteMarkExtension.ts
const FootnoteMark = Mark.create({
  name: 'footnoteMark',
  inclusive: false,
  excludes: '_', // 脚注标记排除所有其他 mark

  addAttributes() {
    return {
      id: { default: null },         // 脚注 ID（如 "1"、"note"）
      index: { default: null },      // 渲染顺序索引（从 1 开始）
      refCount: { default: 1 },      // 引用计数（交叉引用时 > 1）
    };
  },

  parseHTML: () => [{ tag: 'sup[data-footnote-id]' }],

  renderHTML: ({ mark, HTMLAttributes }) => [
    'sup',
    {
      ...HTMLAttributes,
      'data-footnote-id': mark.attrs.id,
      class: 'footnote-ref',
      role: 'doc-noteref',
    },
    ['a', { href: `#fn-${mark.attrs.id}` }, String(mark.attrs.index)],
  ],
});
```

### 4.4 FootnoteDefinition 节点

```typescript
const FootnoteDefinition = Node.create({
  name: 'footnoteDefinition',
  group: 'footnoteGroup',
  content: 'paragraph block*',

  addAttributes() {
    return {
      id: { default: null },     // 与 FootnoteMark.id 对应
      index: { default: null },  // 排序索引
    };
  },

  parseHTML: () => [{ tag: 'li[data-footnote-def]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'li',
    { ...HTMLAttributes, id: `fn-${HTMLAttributes.id}`, 'data-footnote-def': '' },
    0,
  ],
});
```

### 4.5 FootnoteGroup 节点

```typescript
const FootnoteGroup = Node.create({
  name: 'footnoteGroup',
  group: 'block',
  content: 'footnoteDefinition+',

  parseHTML: () => [{ tag: 'ol[data-footnote-list]' }],
  renderHTML: () => ['ol', { class: 'footnote-list', 'data-footnote-list': '' }, 0],
});
```

### 4.6 输入规则

```typescript
addInputRules() {
  return [
    // [^id] 触发脚注标记插入
    new InputRule({
      find: /\[\^([\w-]+)\]$/,
      handler: ({ state, match, range }) => {
        const id = match[1];
        const tr = state.tr;
        // 插入 FootnoteMark
        tr.replaceWith(range.from, range.to,
          state.schema.text(match[0], [state.schema.marks.footnoteMark.create({ id })])
        );
        // 如果文档底部没有对应的 FootnoteDefinition，自动创建占位
        ensureFootnoteDefinition(tr, state, id);
        return tr;
      },
    }),
  ];
}
```

---

## §5 脚注编号与排序

### 5.1 排序规则

脚注按**文档中 FootnoteMark 的出现顺序**自动编号（从 1 开始）。
命名脚注（`[^note]`）的编号由其在文档中的位置决定，而非脚注 ID。

### 5.2 排序插件

```typescript
// src/extensions/Citation/footnoteOrderPlugin.ts
const FootnoteOrderPlugin = new Plugin({
  appendTransaction(transactions, oldState, newState) {
    // 检测脚注相关变更
    const hasFootnoteChange = transactions.some(tr =>
      tr.steps.some(step => affectsFootnotes(step))
    );
    if (!hasFootnoteChange) return null;

    // 重新遍历文档，收集所有 FootnoteMark 的出现顺序
    const order: string[] = [];
    newState.doc.descendants((node, pos) => {
      node.marks.forEach(mark => {
        if (mark.type === newState.schema.marks.footnoteMark) {
          const id = mark.attrs.id;
          if (!order.includes(id)) order.push(id);
        }
      });
    });

    // 更新所有 FootnoteMark 和 FootnoteDefinition 的 index
    const tr = newState.tr;
    let changed = false;

    newState.doc.descendants((node, pos) => {
      node.marks.forEach((mark, i) => {
        if (mark.type === newState.schema.marks.footnoteMark) {
          const newIndex = order.indexOf(mark.attrs.id) + 1;
          if (mark.attrs.index !== newIndex) {
            tr.addMark(pos, pos + node.nodeSize,
              mark.type.create({ ...mark.attrs, index: newIndex })
            );
            changed = true;
          }
        }
      });
    });

    return changed ? tr : null;
  },
});
```

### 5.3 编号显示格式

默认：阿拉伯数字上标（¹²³）

CSS：
```css
.footnote-ref sup {
  font-size: 0.75em;
  vertical-align: super;
  line-height: 0;
  color: var(--color-accent);
}

.footnote-ref a {
  text-decoration: none;
  color: inherit;
}

.footnote-ref a:hover {
  text-decoration: underline;
}
```

---

## §6 脚注面板（FootnotePanel）

### 6.1 位置配置

Settings > 编辑器 > 脚注面板位置：
- 选项 A：文档底部（默认）— 脚注定义节点渲染在正文后
- 选项 B：右侧面板 — 固定在 Workstation 右栏（W-01 A 说右栏只做预览，但脚注面板可作为浮层）

v2.1 默认实现选项 A（文档底部）。

### 6.2 底部脚注面板样式

```
───────────────────────────────────────
  1. 第一条脚注内容，支持**格式**。
  
  2. 第二条脚注内容。↑

───────────────────────────────────────
```

分隔线使用 `<hr data-footnote-separator>` 渲染为轻量横线。

### 6.3 脚注面板交互

- 点击脚注编号（面板内）→ 跳转到文档中对应的 FootnoteMark 位置
- 点击 FootnoteMark（正文中）→ 平滑滚动到面板中对应的脚注定义
- 面板脚注定义可直接编辑（Typora 模式下）

### 6.4 实现方式

FootnoteGroup 节点作为普通 ProseMirror 节点渲染在文档底部（position: static）。
当 `Settings.footnotePanelPosition === 'bottom'` 时，这个节点在编辑器内正常流式渲染；
当设置为 `'right'` 时，通过 CSS `position: fixed` 或 Teleport 渲染到右侧。

---

## §7 交叉引用（同一脚注多次引用）

### 7.1 定义

同一脚注 `[^1]` 在文档中多次使用时，所有引用共享同一脚注内容。

### 7.2 渲染规则

多次引用同一脚注时：
- 所有 FootnoteMark 显示相同的编号（如都是 ¹）
- 脚注定义只出现一次（在 FootnoteGroup 中）
- 脚注定义底部显示返回链接：`↑ a b c`（分别跳回各个引用位置）

### 7.3 反向链接渲染

```html
<li id="fn-1" data-footnote-def>
  <p>脚注内容 <a href="#fnref-1-0" aria-label="返回引用 1">↑a</a>
  <a href="#fnref-1-1" aria-label="返回引用 2">b</a></p>
</li>
```

FootnoteMark 的 `id` 包含引用索引：
```html
<sup id="fnref-1-0" data-footnote-id="1">
  <a href="#fn-1">1</a>
</sup>
```

### 7.4 实现细节

`FootnoteOrderPlugin` 在统计引用时同时记录每个 id 的引用次数（refCount）。
FootnoteDefinition 渲染时根据 `refCount` 决定是否渲染多个返回链接。

---

## §8 Typora 模式：脚注内联预览

### 8.1 触发条件

Typora 模式下，光标移到 `FootnoteMark` 范围内时（hover 或 cursor enter）：
- 显示气泡 Tooltip，内容为对应 FootnoteDefinition 的渲染结果
- 气泡定位在 FootnoteMark 上方
- 气泡支持 Markdown 格式（粗体/链接等正确渲染）

### 8.2 实现方式

```typescript
// src/extensions/Citation/footnoteTooltip.ts
const FootnoteTooltipPlugin = new Plugin({
  props: {
    handleDOMEvents: {
      mouseover(view, event) {
        const target = event.target as HTMLElement;
        const ref = target.closest('[data-footnote-id]') as HTMLElement;
        if (!ref) {
          tooltip.hide();
          return false;
        }

        const id = ref.dataset.footnoteId!;
        const content = findFootnoteContent(view.state, id);
        if (content) {
          tooltip.show(content, ref);
        }
        return false;
      },
      mouseout(view, event) {
        tooltip.hide();
        return false;
      },
    },
  },
});
```

### 8.3 气泡样式

```css
.footnote-tooltip {
  position: fixed;
  max-width: 320px;
  background: var(--color-surface-overlay);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.875rem;
  box-shadow: var(--shadow-md);
  z-index: 1000;
  pointer-events: none;
  
  /* 动画 */
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 150ms ease, transform 150ms ease;
}

.footnote-tooltip.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 8.4 悬停防抖

显示延迟 300ms（避免快速移过时抖动），隐藏延迟 100ms。

---

## §9 学术引用模式（CitationExtension）

### 9.1 启用方式

Settings > 编辑器 > 学术模式：开关（默认关闭）。

启用后：
1. `CitationMarkExtension` 激活
2. `BibliographyNode` 激活
3. 引用自动补全激活
4. 文档 frontmatter 可配置 `bibliography:` 字段

### 9.2 学术模式不影响简单脚注

开启学术模式后，`[^1]` 脚注继续正常工作，两者互不干扰。

---

## §10 BibTeX 文件关联

### 10.1 文档级关联

通过 frontmatter 关联 `.bib` 文件：
```yaml
---
title: 我的论文
bibliography: refs.bib
csl: gb-t-7714-2015
---
```

- `bibliography`：`.bib` 文件路径（相对于文档所在目录）
- `csl`：CSL 样式名（预设 4 种之一）

### 10.2 多文件关联

支持多个 `.bib` 文件：
```yaml
bibliography:
  - refs.bib
  - supplementary.bib
```

### 10.3 BibTeX 格式示例

```bibtex
@article{smith2023,
  author  = {Smith, John and Doe, Jane},
  title   = {A Study on Markdown Editors},
  journal = {Journal of Writing Tools},
  year    = {2023},
  volume  = {15},
  pages   = {123--145},
  doi     = {10.1234/jWT.2023.123}
}

@book{jones2022,
  author    = {Jones, Alice},
  title     = {Academic Writing in the Digital Age},
  publisher = {Academic Press},
  year      = {2022}
}
```

### 10.4 BibTeX 解析

使用 `bibtex-js`（npm）或自研简单解析器处理 `.bib` 文件：

```typescript
// src/extensions/Citation/bibtexParser.ts
export interface BibEntry {
  key: string;              // "smith2023"
  type: 'article' | 'book' | 'inproceedings' | 'misc' | string;
  fields: Record<string, string>; // { author, title, year, ... }
}

export function parseBibTeX(content: string): BibEntry[];
```

---

## §11 引用语法

### 11.1 基础语法（Pandoc 兼容）

```markdown
见 Smith 的研究[@smith2023]。

多项引用[@smith2023; @jones2022]。

指定页码[@smith2023, p. 42]。

带前缀[@smith2023, see also]。

仅显示年份（suppress author）[-@smith2023]。
```

### 11.2 渲染结果（APA 格式为例）

| 输入 | 输出 |
|---|---|
| `[@smith2023]` | `(Smith & Doe, 2023)` |
| `[@smith2023, p. 42]` | `(Smith & Doe, 2023, p. 42)` |
| `[@smith2023; @jones2022]` | `(Smith & Doe, 2023; Jones, 2022)` |
| `[-@smith2023]` | `(2023)` |

### 11.3 CitationMark 定义

```typescript
const CitationMark = Mark.create({
  name: 'citation',
  inclusive: false,
  excludes: '',

  addAttributes() {
    return {
      keys: { default: [] as string[] },  // ["smith2023", "jones2022"]
      prefix: { default: '' },
      suffix: { default: '' },
      suppressAuthor: { default: false },
      locator: { default: null },          // "p. 42"
    };
  },

  parseHTML: () => [{ tag: 'cite[data-citation]' }],

  renderHTML: ({ mark, HTMLAttributes }) => [
    'cite',
    {
      ...HTMLAttributes,
      'data-citation': JSON.stringify(mark.attrs.keys),
      class: 'citation-mark',
      contenteditable: 'false',
    },
    // 渲染内容由 CitationRenderer 提供
    mark.attrs.keys.join('; '),
  ],
});
```

### 11.4 输入规则

```typescript
// 当用户输入 [@xxx 时触发
addInputRules() {
  return [
    new InputRule({
      find: /\[@([\w-]+(?:;\s*@[\w-]+)*)(,\s*[^\]]+)?\]$/,
      handler: ({ state, match, range }) => {
        const keys = match[1].split(/;\s*@?/).map(k => k.trim());
        const suffix = match[2] ?? '';
        const tr = state.tr.replaceWith(
          range.from, range.to,
          state.schema.text(match[0], [
            state.schema.marks.citation.create({ keys, suffix }),
          ])
        );
        return tr;
      },
    }),
  ];
}
```

---

## §12 引用自动补全

### 12.1 触发条件

在学术引用模式下，当用户输入 `[@` 时触发自动补全弹窗。

### 12.2 补全数据来源

来自 `CitationRepository.getEntries()`（当前文档关联的所有 `.bib` 文件）。

### 12.3 补全弹窗设计

```
[@                     ← 光标
┌─────────────────────────────────────┐
│ 搜索参考文献...                     │
│─────────────────────────────────────│
│ smith2023  Smith & Doe (2023)       │
│            A Study on Markdown...   │
│─────────────────────────────────────│
│ jones2022  Jones (2022)             │
│            Academic Writing...      │
└─────────────────────────────────────┘
```

- 搜索范围：key / author / title / year
- 搜索算法：模糊匹配（fuzzy，与斜杠命令搜索共用 filter.ts）
- 最多显示 10 条（超过可滚动）
- 键盘：↑↓ 选择，Enter 确认，Esc 关闭

### 12.4 多选支持

弹窗内按 `;` 可继续追加引用（支持 `[@smith2023; @jones2022]` 组合）：
1. 选中 `smith2023` → 插入 `[@smith2023`
2. 输入 `;` → 弹窗再次出现
3. 选中 `jones2022` → 插入 `[@smith2023; @jones2022]`

### 12.5 实现

```typescript
// src/extensions/Citation/CitationAutocomplete.vue
// 基于 TipTap Suggestion 扩展实现

import { Suggestion } from '@tiptap/suggestion';

addProseMirrorPlugins() {
  return [
    Suggestion({
      editor: this.editor,
      char: '[@',
      command: ({ editor, range, props }) => {
        editor.chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'text',
            marks: [{ type: 'citation', attrs: { keys: props.keys } }],
            text: `[@${props.keys.join('; @')}]`,
          })
          .run();
      },
      render: () => ({
        onStart: (props) => { /* 显示补全弹窗 */ },
        onUpdate: (props) => { /* 更新补全列表 */ },
        onKeyDown: (props) => { /* 键盘导航 */ },
        onExit: () => { /* 隐藏弹窗 */ },
      }),
    }),
  ];
}
```

---

## §13 CSL 格式支持

### 13.1 预设格式

| 格式 | 标识符 | 说明 |
|---|---|---|
| APA | `apa` | American Psychological Association 第 7 版 |
| MLA | `mla` | Modern Language Association 第 9 版 |
| Chicago | `chicago-author-date` | Chicago 作者-年份格式 |
| GB/T 7714 | `gb-t-7714-2015` | 中国国家标准（默认） |

### 13.2 CSL 处理器

使用 `citeproc-js`（npm: `citeproc`）处理 CSL 格式化：

```typescript
// src/extensions/Citation/cslFormatter.ts
import CSL from 'citeproc';

export class CSLFormatter {
  private engine: CSL.Engine | null = null;

  async init(
    cslStyleId: string,    // "gb-t-7714-2015"
    localeId: string,      // "zh-CN"
    entries: BibEntry[]
  ): Promise<void> {
    const style = await loadCSLStyle(cslStyleId);
    const locale = await loadCSLLocale(localeId);

    const sys = {
      retrieveLocale: (lang: string) => locale,
      retrieveItem: (id: string) => {
        const entry = entries.find(e => e.key === id);
        return entry ? bibEntryToCSLItem(entry) : null;
      },
    };

    this.engine = new CSL.Engine(sys, style);
  }

  formatCitation(keys: string[], suffix: string, suppressAuthor: boolean): string {
    if (!this.engine) return keys.join('; ');
    // 使用 citeproc-js 格式化内联引用
    return this.engine.makeCitationCluster(
      keys.map(key => ({ id: key, suffix, suppressAuthor }))
    );
  }

  formatBibliography(keys: string[]): string[] {
    if (!this.engine) return [];
    this.engine.updateItems(keys);
    const [params, bibliography] = this.engine.makeBibliography();
    return bibliography;
  }
}
```

### 13.3 BibEntry → CSL Item 转换

```typescript
function bibEntryToCSLItem(entry: BibEntry): Record<string, unknown> {
  const item: Record<string, unknown> = {
    id: entry.key,
    type: bibTypeToCSLType(entry.type),
  };

  if (entry.fields.author) {
    item['author'] = parseAuthors(entry.fields.author);
  }
  if (entry.fields.title) item['title'] = entry.fields.title;
  if (entry.fields.year)  item['issued'] = { 'date-parts': [[parseInt(entry.fields.year)]] };
  if (entry.fields.journal) item['container-title'] = entry.fields.journal;
  if (entry.fields.volume)  item['volume'] = entry.fields.volume;
  if (entry.fields.pages)   item['page'] = entry.fields.pages;
  if (entry.fields.doi)     item['DOI'] = entry.fields.doi;
  if (entry.fields.publisher) item['publisher'] = entry.fields.publisher;

  return item;
}
```

### 13.4 多语言支持

CSL locale 文件按 `Settings.language`（`zh-CN` 或 `en-US`）加载。
GB/T 7714 默认使用 `zh-CN` locale。

---

## §14 参考文献列表自动生成（BibliographyNode）

### 14.1 节点定义

```typescript
const BibliographyNode = Node.create({
  name: 'bibliography',
  group: 'block',
  atom: true,         // 原子节点，内部内容由渲染器管理
  selectable: true,

  parseHTML: () => [{ tag: 'div[data-bibliography]' }],

  renderHTML: ({ HTMLAttributes }) => [
    'div',
    { ...HTMLAttributes, 'data-bibliography': '', class: 'bibliography' },
    0,
  ],
});
```

### 14.2 插入方式

- 斜杠命令：`/参考文献` 或 `/bibliography`
- 自动生成：学术模式下，文档中有 Citation 标记时，向导提示"在文档末尾添加参考文献列表"

### 14.3 渲染机制

BibliographyNode 使用 Vue NodeView 渲染：

```vue
<!-- BibliographyNodeView.vue -->
<template>
  <div class="bibliography-container" contenteditable="false">
    <h2 class="bibliography-title">参考文献</h2>
    <ol class="bibliography-list">
      <li
        v-for="(entry, index) in formattedEntries"
        :key="entry.key"
        :id="`bib-${entry.key}`"
        class="bibliography-entry"
        v-html="entry.formatted"
      />
    </ol>
  </div>
</template>
```

### 14.4 自动更新

当文档中的 Citation 标记变化时，`CitationRepository` 通知 `BibliographyNodeView` 重新计算：
- 只显示文档中实际引用的条目（按引用顺序或字母顺序，取决于 CSL 格式）
- CSLFormatter 重新格式化参考文献列表

### 14.5 参考文献排序

| CSL 格式 | 参考文献排序 |
|---|---|
| APA | 按作者姓氏字母顺序 |
| MLA | 按作者姓氏字母顺序 |
| Chicago | 按作者姓氏字母顺序 |
| GB/T 7714 | 按在文中出现的顺序 |

---

## §15 导出集成

### 15.1 简单脚注导出

| 导出目标 | 脚注处理 |
|---|---|
| Markdown | 保留原始 `[^1]: 内容` 语法（往返保真） |
| HTML | `<sup>`, `<ol class="footnote-list">` 标准 HTML |
| 微信公众号 | 脚注转为行内括号注释 `（¹注释内容）`（微信不支持锚点） |
| 知乎 | 脚注转为文末编号列表 |
| 小红书 | 脚注内容追加到段落末尾（小红书不支持复杂 HTML） |

### 15.2 学术引用导出

| 导出目标 | 引用处理 |
|---|---|
| Markdown | 保留 `[@key]` 语法 + `.bib` 文件引用（Pandoc 可处理） |
| HTML | 格式化的内联引用 + 完整参考文献 HTML |
| 微信公众号 | 内联引用 `(Smith et al., 2023)` + 文末参考文献纯文本列表 |
| 知乎 | 同上 |
| 小红书 | 仅保留内联引用文本，移除参考文献列表 |

### 15.3 导出 Pipeline 钩子

```typescript
// src/services/exporters/footnoteProcessor.ts
export async function processFootnotesForExport(
  doc: ProseMirrorNode,
  format: ExportFormat
): Promise<string> {
  // 根据 format 决定脚注转换策略
  switch (format) {
    case 'markdown':  return serializeFootnotesMarkdown(doc);
    case 'html':      return serializeFootnotesHTML(doc);
    case 'wechat':    return serializeFootnotesInline(doc);
    default:          return serializeFootnotesInline(doc);
  }
}
```

---

## §16 CitationRepository

### 16.1 职责

- 管理当前文档关联的所有 `.bib` 文件
- 缓存解析后的 BibTeX 条目
- 监听 `.bib` 文件变化（Tauri fs.watch）
- 提供 CSLFormatter 实例

### 16.2 接口定义

```typescript
// src/extensions/Citation/citationRepository.ts
export class CitationRepository {
  private entries = new Map<string, BibEntry>(); // key → entry
  private formatter: CSLFormatter | null = null;
  private watchHandles: string[] = [];

  /** 从 frontmatter 加载关联的 .bib 文件 */
  async loadFromDocument(documentPath: string, bibPaths: string[]): Promise<void>;

  /** 获取所有条目 */
  getEntries(): BibEntry[];

  /** 按 key 获取条目 */
  getEntry(key: string): BibEntry | null;

  /** 搜索条目（模糊匹配 key/author/title） */
  search(query: string): BibEntry[];

  /** 格式化内联引用 */
  formatCitation(keys: string[], attrs: CitationMarkAttrs): string;

  /** 格式化参考文献列表 */
  formatBibliography(keys: string[]): string[];

  /** 切换 CSL 格式 */
  async setCSLStyle(style: CSLStyleId): Promise<void>;

  /** 文件变化监听 */
  private onBibFileChanged(path: string): Promise<void>;

  /** 清理资源 */
  destroy(): void;
}
```

### 16.3 文件监听

```typescript
// 监听 .bib 文件变化（Tauri fs.watch）
import { watch } from '@tauri-apps/api/fs';

async function watchBibFile(path: string): Promise<string> {
  const handle = await watch(path, { recursive: false }, (event) => {
    if (event.type === 'Modify') {
      this.reloadBibFile(path);
    }
  });
  return handle;
}
```

---

## §17 TipTap Extension 清单

本 Spec 需要以下 TipTap Extensions：

| Extension | 作用 | 类型 |
|---|---|---|
| `FootnoteMark` | `[^id]` 内联标记 | Mark |
| `FootnoteDefinition` | 脚注内容定义节点 | Node |
| `FootnoteGroup` | 脚注定义容器 | Node |
| `CitationMark` | `[@key]` 内联标记 | Mark |
| `BibliographyNode` | 参考文献列表节点 | Node |
| `FootnoteOrderPlugin` | 脚注自动编号 | ProseMirror Plugin |
| `FootnoteTooltipPlugin` | Typora 气泡预览 | ProseMirror Plugin |
| `CitationAutocomplete` | 引用自动补全 | Suggestion Plugin |

所有 Extension 通过 `CitationExtensionSuite` 统一注册：
```typescript
// src/extensions/Citation/index.ts
export const CitationExtensionSuite = Extension.create({
  name: 'citationSuite',

  addExtensions() {
    const extensions: AnyExtension[] = [
      FootnoteMark,
      FootnoteDefinition,
      FootnoteGroup,
    ];

    if (this.options.academicMode) {
      extensions.push(CitationMark, BibliographyNode, CitationAutocomplete);
    }

    return extensions;
  },
}).configure({
  academicMode: false, // 从 Settings 注入
});
```

---

## §18 TypeScript 类型定义

```typescript
// src/extensions/Citation/types.ts

export type CSLStyleId =
  | 'apa'
  | 'mla'
  | 'chicago-author-date'
  | 'gb-t-7714-2015';

export interface BibEntry {
  key: string;
  type: string;
  fields: Record<string, string>;
}

export interface FootnoteMarkAttrs {
  id: string;
  index: number;
  refCount: number;
}

export interface CitationMarkAttrs {
  keys: string[];
  prefix: string;
  suffix: string;
  suppressAuthor: boolean;
  locator: string | null;
}

export interface FootnoteDefinitionAttrs {
  id: string;
  index: number;
}

export interface CitationRepositoryConfig {
  documentPath: string;
  bibPaths: string[];
  cslStyle: CSLStyleId;
  locale: 'zh-CN' | 'en-US';
}

export interface FormattedBibEntry {
  key: string;
  formatted: string;  // CSL 格式化后的 HTML 字符串
}

export interface FootnotePanelPosition {
  position: 'bottom' | 'right';
}

export interface CitationSuiteOptions {
  academicMode: boolean;
  footnotePanelPosition: FootnotePanelPosition['position'];
  cslStyle: CSLStyleId;
}

export interface AutocompleteItem {
  key: string;
  author: string;
  year: string;
  title: string;
  type: string;
}
```

---

## §19 模块架构

```
src/extensions/Citation/
├── index.ts                        # CitationExtensionSuite 导出
├── types.ts                        # TypeScript 类型
├── footnote/
│   ├── FootnoteMarkExtension.ts    # [^id] Mark
│   ├── FootnoteDefinitionNode.ts   # 脚注定义节点
│   ├── FootnoteGroupNode.ts        # 脚注容器节点
│   ├── footnoteOrderPlugin.ts      # 自动编号 Plugin
│   ├── footnoteTooltipPlugin.ts    # 气泡预览 Plugin
│   └── FootnoteTooltip.vue         # 气泡 UI 组件
├── academic/
│   ├── CitationMarkExtension.ts    # [@key] Mark
│   ├── BibliographyNode.ts         # 参考文献列表节点
│   ├── BibliographyNodeView.vue    # NodeView 组件
│   ├── CitationAutocomplete.ts     # 自动补全（Suggestion）
│   ├── CitationDropdown.vue        # 补全弹窗 UI
│   └── citationInputRules.ts      # [@xxx] 输入规则
├── repository/
│   ├── citationRepository.ts       # CitationRepository 类
│   ├── bibtexParser.ts             # BibTeX 解析
│   └── cslFormatter.ts             # CSL 格式化（citeproc-js 封装）
├── export/
│   ├── footnoteExporter.ts         # 脚注导出处理
│   └── citationExporter.ts         # 学术引用导出处理
└── __tests__/
    ├── footnoteOrder.test.ts
    ├── bibtexParser.test.ts
    ├── cslFormatter.test.ts
    ├── citationAutocomplete.test.ts
    └── export/
        ├── footnoteExporter.test.ts
        └── citationExporter.test.ts
```

---

## §20 测试矩阵

| # | 测试场景 | 期望结果 |
|---|---|---|
| T01 | 输入 `[^1]`，脚注标记插入 | FootnoteMark 创建，上标显示 `1` |
| T02 | 移动脚注标记到前面 | 编号自动重排 |
| T03 | 脚注定义中输入内容 | 内容保存到 FootnoteDefinition |
| T04 | 鼠标悬停脚注标记 | 气泡显示脚注内容（延迟 300ms） |
| T05 | 鼠标离开脚注标记 | 气泡消失（延迟 100ms） |
| T06 | 点击脚注标记 | 平滑滚动到脚注面板对应定义 |
| T07 | 点击脚注面板编号 | 平滑滚动回文档中引用位置 |
| T08 | 同一脚注引用两次（`[^1]` × 2） | 两个上标相同编号，脚注有 `↑a b` 返回链接 |
| T09 | 删除脚注标记 | FootnoteDefinition 保留（手动删除） |
| T10 | Markdown 序列化 | `[^1]` 和 `[^1]: 内容` 正确生成 |
| T11 | 学术模式关闭时输入 `[@` | 无补全弹窗 |
| T12 | 学术模式开启，关联 .bib | CitationRepository 加载条目 |
| T13 | 输入 `[@` | 补全弹窗出现，列出 .bib 条目 |
| T14 | 补全弹窗搜索 "smith" | 只显示匹配条目 |
| T15 | 选择补全条目 | `[@smith2023]` 插入 |
| T16 | 输入 `[@smith2023; @jones2022]` | 两个 key 的 citation mark |
| T17 | APA 格式化 `[@smith2023]` | `(Smith & Doe, 2023)` |
| T18 | GB/T 格式化 `[@smith2023]` | 按 GB/T 7714 格式 |
| T19 | 切换 CSL 格式 | 文档内所有引用实时重新格式化 |
| T20 | 插入参考文献列表节点 | BibliographyNodeView 渲染 |
| T21 | 参考文献按 APA 排序 | 字母顺序 |
| T22 | 参考文献按 GB/T 排序 | 文中出现顺序 |
| T23 | 修改 .bib 文件后 | CitationRepository 自动更新，引用重新格式化 |
| T24 | 学术引用 Markdown 序列化 | `[@key]` 语法保留 |
| T25 | 导出微信：脚注 | 转为行内括号注释 |
| T26 | 导出 HTML：脚注 | 标准 `<sup>` + `<ol>` 结构 |

---

## §21 验收标准

1. `[^1]` 脚注语法可在 Typora 模式输入，上标正确显示，编号按文档位置自动排序。
2. Typora 模式下鼠标悬停脚注标记，气泡 300ms 后显示脚注内容，格式正确。
3. 同一脚注多次引用共享编号，脚注面板显示多个返回链接。
4. 脚注内容在文档底部可编辑，点击脚注/返回链接双向跳转正常。
5. Markdown 序列化保留 `[^id]` 和 `[^id]: content` 语法，往返保真。
6. 学术模式开启后，关联 `.bib` 文件，`[@key]` 输入触发自动补全。
7. 预设 4 种 CSL 格式均可正确格式化内联引用和参考文献列表。
8. 参考文献节点自动跟踪文档中使用的引用，只显示已引用条目。
9. 导出到各平台时，脚注/引用按平台能力正确降级处理。

---

## §22 2026-05-03 实装基线与限制

本节记录当前 P1 Citation Baseline 的真实落地状态，后续实现不得把计划项误读为已经完整完成的运行事实。

### 22.1 已落地的本地优先能力

- `src/services/citation/*` 已提供本地 BibTeX parser、footnote parser、Pandoc-style citation cluster parser、deterministic formatter、repository 读取边界和 export degradation helper。
- Markdown renderer 已支持 `[^id]` / `[^id]: content`，脚注编号按首次引用顺序生成，重复引用共享编号并生成多个 back links，缺失定义渲染为明确 diagnostic。
- Markdown renderer 已支持 `[@key]`、`[@a; @b]`、`[@key, p. 42]`、`[-@key]`，无真实 BibTeX entry 时显示 unresolved，不伪造作者或年份。
- renderer 可在调用方传入真实 BibTeX entries 与 style 时生成内联 citation 和 bibliography section，当前支持 `apa`、`mla`、`chicago-author-date`、`gb-t-7714-2015` 四种 deterministic local CSL-style 输出。
- Typora hydration 走统一 Markdown renderer；`FootnoteReferenceMark`、`AcademicCitationMark` 与现有 `InkforgeListItem` 会保留 citation/footnote 所需的 safe data attributes，serializer 可把原始 renderer HTML 和 Tiptap-normalized footnote section 写回 Markdown authority syntax。
- Preview sanitizer 已放行 citation/footnote 需要的 `data-*` 属性；Xiaohongshu native text export 会展开脚注和 citation，不泄露 raw footnote definitions 或 raw `[@key]` control syntax。

### 22.2 明确未宣称完成的后续项

- 当前未接入 `citeproc` 或 CSL XML runtime，因此只能称为 deterministic local CSL-style baseline，不得宣称 full CSL processor compliance。
- 当前未实现 Zotero/Mendeley/DOI/CrossRef/network lookup，也不会伪造任何远程查询结果。
- 当前未实现完整 `.bib` 文件监听、右侧脚注编辑面板、hover tooltip UI、citation autocomplete UI、BibliographyNode NodeView 自动插入；这些仍是后续增强项。
- Web runtime 无 Tauri fs 时，`CitationRepository` 必须返回 typed unavailable/read error，不能用 fake `.bib` 成功状态替代。

### 22.3 验证门槛

- 必跑目标测试：`pnpm -C inkforge exec vitest run src/services/citation/citation.test.ts src/services/markdown-ext/citation-render.test.ts src/extensions/TyporaMode.citation.test.ts src/services/export/citation-export.test.ts`。
- 必跑全局门槛：`vue-tsc --noEmit`、`eslint --quiet`、full `vitest run`、production `build`。
- UI smoke 必从真实 Source/Workstation article 输入 Markdown，再检查 Preview 与 Typora 的 `.ink-footnote-ref`、`.ink-footnote-back`、`.ink-academic-citation--unresolved`，并确认 console error 为 0。不得用直接填充 `.ProseMirror` 后产生 escaped Markdown 的失败路径作为 renderer 结论。
