> 版本: v2.1.0-draft
> 阶段: Phase 1（编辑器层）
> 依赖: 01-spec-editor-typora / 10-markdown-authority-spec / 05-toolbar-complete-spec
> 被依赖: 15-export-publish-spec（表格序列化）/ 10-markdown-authority-spec §8
> 来源决策: E-05 D（Tab 导航+拖拽列宽+对齐+横向滚动+双向 pipe 转换）/ T04-13 C
> 权威来源: 混合（0408 增强问卷 E-05 + @tiptap/extension-table 文档）
> 创建日期: 2026-04-21
> 铁律遵循: R-01, R-02, R-05, R-14, R-15

# 52 — Table Extension v2 Spec

## 目录

- §1 背景与目标
- §2 范围与边界
- §3 基础能力（@tiptap/extension-table 集成确认）
- §4 列宽拖拽
- §5 列对齐
- §6 表头行（thead）
- §7 表格标题（caption）
- §8 表格内排序
- §9 行列高亮
- §10 快捷键完整表
- §11 GFM 管道表格序列化（双向往返）
- §12 浮动表格工具栏
- §13 大表格虚拟滚动
- §14 TypeScript 类型定义
- §15 模块架构
- §16 Markdown 往返保真契约
- §17 导出行为
- §18 性能 SLO
- §19 测试矩阵
- §20 验收标准

---

## §1 背景与目标

### 1.1 问题背景

InkForge v2.0 集成了 `@tiptap/extension-table`，提供基础表格能力。
问卷 E-05 D 要求大幅增强：
1. 大表格横向滚动（长表格 overflow 处理）
2. **与 Markdown pipe 语法的双向转换**（Markdown 往返保真）
3. 列宽拖拽
4. 列对齐（左/居中/右）
5. Tab 键导航完整支持

同时，GFM（GitHub Flavored Markdown）标准规定了 `|` 管道表格格式，本 Spec 在此基础上扩展，
并保证 Markdown 往返保真（R-01 要求：Markdown 是唯一权威源）。

### 1.2 目标

1. 完全封装 `@tiptap/extension-table`，在其基础上增加 v2 增强能力。
2. 提供完整的 GFM 管道表格序列化/反序列化，保证内容往返无损。
3. 表格编辑体验达到 Typora 级别（Tab 跳格、Enter 换行、快捷键）。
4. 浮动工具栏支持常见表格操作（增删行/列/对齐/合并）。
5. 大表格（>100 行）通过虚拟滚动保持性能。

---

## §2 范围与边界

### 2.1 本 Spec 覆盖

| 能力 | 来源 |
|---|---|
| 单元格选择 | @tiptap/extension-table（集成，不自研） |
| 行列增删 | @tiptap/extension-table |
| 合并/拆分单元格 | @tiptap/extension-table |
| 列宽拖拽 | v2 新增 |
| 列对齐（4 种） | v2 新增 |
| 表头行（thead）固定 | v2 新增 |
| 表格标题（caption） | v2 新增 |
| 表格内排序 | v2 新增（Preview/Export 模式） |
| 行列高亮（hover） | v2 新增 |
| 快捷键完整表 | v2 补充 |
| GFM 管道表格序列化 | v2 新增（双向往返） |
| 浮动工具栏 | v2 新增 |
| 大表格虚拟滚动 | v2 新增 |

### 2.2 非目标

- Excel 公式、数据透视（不是代码编辑器，E-04 A）
- PDF 导出中的复杂表格样式（P-05 A 不做 PDF）
- 表格与数据库联动（Notion 风格，v2.2+ 候选）
- 列固定（sticky column，v2.2+）
- 表格导入（→ 44-import-wizard-spec）

---

## §3 基础能力（@tiptap/extension-table 集成确认）

### 3.1 集成版本

```json
{
  "@tiptap/extension-table": "^2.x",
  "@tiptap/extension-table-cell": "^2.x",
  "@tiptap/extension-table-header": "^2.x",
  "@tiptap/extension-table-row": "^2.x"
}
```

### 3.2 默认开启的能力

| 能力 | 配置参数 |
|---|---|
| 单元格选择（Ctrl+Click 多选） | `cellSelection: true` |
| 列内所有单元格选择 | `lastColumnResizable: true` |
| 表头行 | `HTMLAttributes: { class: 'table-header' }` |
| 调整最后一列 | `resizable: false`（改用自研列宽拖拽） |

### 3.3 Extension 组合

```typescript
// src/extensions/TableV2/index.ts
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { TableColumnResizePlugin } from './columnResize';
import { TableToolbarPlugin } from './toolbar';
import { TableVirtualScrollPlugin } from './virtualScroll';

export const TableV2Extension = Table.configure({
  resizable: false, // 关闭内置 resizable，使用自研
  HTMLAttributes: {
    class: 'inkforge-table',
  },
}).extend({
  addProseMirrorPlugins() {
    return [
      ...this.parent?.(),
      TableColumnResizePlugin(this.editor),
      TableToolbarPlugin(this.editor),
      TableVirtualScrollPlugin(this.editor),
    ];
  },
});

export const TableExtensions = [
  TableV2Extension,
  TableRow,
  TableHeader.extend({ addAttributes() { return { ...this.parent?.(), align: { default: null } }; } }),
  TableCell.extend({ addAttributes() { return { ...this.parent?.(), align: { default: null } }; } }),
];
```

---

## §4 列宽拖拽

### 4.1 实现方式

在每个 `<th>` 和 `<td>` 的右边框上渲染一个透明的拖拽把手（4px 宽），
鼠标按下后通过 `mousemove` 实时更新列宽。

### 4.2 列宽存储

列宽存储在表格节点的 `colgroup` 属性中：

```html
<!-- 渲染输出 -->
<table class="inkforge-table">
  <colgroup>
    <col style="width: 120px">
    <col style="width: 200px">
    <col style="width: 80px">
  </colgroup>
  ...
</table>
```

ProseMirror 节点 attrs：
```typescript
// Table 节点新增属性
colWidths: number[] | null  // [120, 200, 80]，null 表示等宽
```

### 4.3 拖拽实现

```typescript
// src/extensions/TableV2/columnResize.ts
export function TableColumnResizePlugin(editor: Editor): Plugin {
  return new Plugin({
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          const target = event.target as HTMLElement;
          if (!target.classList.contains('col-resize-handle')) return false;

          const colIndex = parseInt(target.dataset.colIndex!);
          const startX = event.clientX;
          const startWidth = getColumnWidth(view, colIndex);

          const onMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startX;
            const newWidth = Math.max(40, startWidth + delta); // 最小列宽 40px
            updateColumnWidth(view, colIndex, newWidth);
          };

          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          return true;
        },
      },
    },
  });
}
```

### 4.4 最小/最大列宽约束

| 约束 | 值 |
|---|---|
| 最小列宽 | 40px |
| 最大列宽 | 容器宽度 - (其他列最小宽度之和) |
| 调整时其他列 | 不联动（独立调整，允许表格总宽超出容器） |
| 超出容器时 | 表格容器启用横向滚动（overflow-x: auto） |

### 4.5 GFM 序列化中的列宽

GFM pipe 表格不支持列宽，序列化为 Markdown 时**丢弃列宽信息**。
反序列化（Markdown → TipTap）时列宽默认为 null（等宽）。

---

## §5 列对齐

### 5.1 对齐类型

| 类型 | 值 | CSS | GFM 语法 |
|---|---|---|---|
| 左对齐 | `'left'` | `text-align: left` | `:---` |
| 居中 | `'center'` | `text-align: center` | `:---:` |
| 右对齐 | `'right'` | `text-align: right` | `---:` |
| 合理分散（默认） | `null` | `text-align: inherit` | `---` |

### 5.2 存储方式

对齐存储在每个 `<th>/<td>` 节点的 `align` attribute：
```typescript
// TableHeader / TableCell 节点新增 attrs
{
  align: {
    default: null,
    parseHTML: (el) => el.style.textAlign || el.getAttribute('align') || null,
    renderHTML: (attrs) => attrs.align ? { style: `text-align: ${attrs.align}` } : {},
  }
}
```

### 5.3 列级对齐命令

设置整列对齐时，对该列所有 `<th>/<td>` 批量应用：

```typescript
commands: {
  setColumnAlign: (colIndex: number, align: 'left' | 'center' | 'right' | null) =>
    ({ state, dispatch }) => {
      const tr = state.tr;
      // 遍历表格所有行，找到 colIndex 对应的单元格并设置 align
      iterateTableColumn(state, colIndex, (cellPos, cell) => {
        tr.setNodeAttribute(cellPos, 'align', align);
      });
      dispatch?.(tr);
      return true;
    },
}
```

---

## §6 表头行（thead）

### 6.1 定义

表头行（`header-row`）：标记表格第一行为 `<thead>` 元素，
在渲染时使用 `<thead><tr>...</tr></thead>` 包裹，其他行使用 `<tbody>`。

### 6.2 存储方式

Table 节点 attrs：
```typescript
{
  hasHeader: {
    default: true,  // GFM 表格默认有表头
    parseHTML: (el) => el.querySelector('thead') !== null,
  }
}
```

### 6.3 Typora 模式视觉

表头行（`<thead>` 内的行）使用加粗 + 底部边框样式区分：
```css
.inkforge-table thead tr {
  background: var(--color-surface-elevated);
  font-weight: 600;
  border-bottom: 2px solid var(--color-border-strong);
}
```

### 6.4 切换表头命令

```typescript
commands: {
  toggleTableHeader: () => ({ ... }) => {
    // 切换第一行是否为 header（th ↔ td）
    // 同步更新 table.attrs.hasHeader
  }
}
```

---

## §7 表格标题（caption）

### 7.1 定义

表格标题为 `<caption>` HTML 元素，显示在表格上方或下方（由 `captionSide` 控制）。

### 7.2 节点定义

```typescript
// 新增 TableCaption ProseMirror 节点
const TableCaption = Node.create({
  name: 'tableCaption',
  content: 'inline*',
  parseHTML: () => [{ tag: 'caption' }],
  renderHTML: ({ HTMLAttributes }) => ['caption', HTMLAttributes, 0],
  // ...
});
```

### 7.3 存储位置

`<caption>` 作为 `<table>` 的第一个子元素：
```html
<table class="inkforge-table">
  <caption>表格标题文字</caption>
  <colgroup>...</colgroup>
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

### 7.4 GFM 序列化

GFM 不支持 `<caption>`，序列化为 Markdown 时：
- 若存在 caption，在表格上方插入一行斜体文字：`*表格标题文字*`
- 反序列化时不自动识别（需手动添加 caption）

### 7.5 Typora 模式编辑

双击 caption 区域进入编辑模式（光标放入 `tableCaption` 节点）。

---

## §8 表格内排序

### 8.1 适用范围

表格内排序仅在以下场景生效：
- **Preview 模式**（只读渲染）
- **导出模式**（Export Pipeline 处理后）

在 **Typora 模式**下，点击表头只是移动光标，不触发排序。

### 8.2 交互设计

Preview 模式下，`<thead>` 中的 `<th>` 显示排序指示器（↑↓）：
```
| 姓名 ↑ | 年龄 ↕ | 城市 ↕ |
```
- 点击列标题：升序
- 再次点击：降序
- 第三次点击：清除排序（恢复原始顺序）

### 8.3 实现方式

排序为**纯 UI 操作**，不修改 ProseMirror document（Markdown 内容不变）。
通过 Vue 响应式数据在 Preview 模式的渲染层实现：

```typescript
// PreviewTableRenderer.vue
interface SortState {
  colIndex: number | null;
  direction: 'asc' | 'desc' | null;
}

const sortState = ref<SortState>({ colIndex: null, direction: null });
const sortedRows = computed(() => {
  if (sortState.value.colIndex === null) return props.rows;
  return [...props.rows].sort((a, b) => {
    const aVal = a[sortState.value.colIndex!];
    const bVal = b[sortState.value.colIndex!];
    // 智能排序：数字 → 数值比较，其他 → 字符串比较
    const numA = parseFloat(aVal);
    const numB = parseFloat(bVal);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortState.value.direction === 'asc' ? numA - numB : numB - numA;
    }
    return sortState.value.direction === 'asc'
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });
});
```

---

## §9 行列高亮

### 9.1 实现方式

**纯 CSS + JavaScript 事件**，不修改 ProseMirror 状态：

```typescript
// src/extensions/TableV2/tableHighlight.ts
export function attachTableHighlight(tableEl: HTMLElement): () => void {
  let currentRow: HTMLElement | null = null;
  let currentColIndex = -1;

  function highlightCell(cell: HTMLElement): void {
    const row = cell.parentElement as HTMLElement;
    const colIndex = Array.from(row.children).indexOf(cell);

    // 行高亮：移除旧行高亮，添加新行高亮
    currentRow?.classList.remove('row-highlighted');
    row.classList.add('row-highlighted');
    currentRow = row;

    // 列高亮：遍历所有行，高亮同列单元格
    if (colIndex !== currentColIndex) {
      tableEl.querySelectorAll('.col-highlighted').forEach(el => el.classList.remove('col-highlighted'));
      tableEl.querySelectorAll(`tr > *:nth-child(${colIndex + 1})`).forEach(el => el.classList.add('col-highlighted'));
      currentColIndex = colIndex;
    }
  }

  const handler = (e: MouseEvent) => {
    const cell = (e.target as HTMLElement).closest('td, th') as HTMLElement;
    if (cell && tableEl.contains(cell)) {
      highlightCell(cell);
    }
  };

  tableEl.addEventListener('mouseover', handler);
  return () => tableEl.removeEventListener('mouseover', handler);
}
```

### 9.2 高亮样式

```css
.inkforge-table tr.row-highlighted > td,
.inkforge-table tr.row-highlighted > th {
  background: rgba(var(--color-accent-rgb), 0.06);
}

.inkforge-table td.col-highlighted,
.inkforge-table th.col-highlighted {
  background: rgba(var(--color-accent-rgb), 0.06);
}

/* 行列交叉单元格 */
.inkforge-table tr.row-highlighted > td.col-highlighted,
.inkforge-table tr.row-highlighted > th.col-highlighted {
  background: rgba(var(--color-accent-rgb), 0.12);
}
```

---

## §10 快捷键完整表

| 快捷键 | 场景 | 动作 |
|---|---|---|
| `Tab` | 单元格内 | 移动到下一个单元格；最后一格 Tab 新建行 |
| `Shift+Tab` | 单元格内 | 移动到上一个单元格 |
| `Enter` | 单元格内 | 在单元格内换行（`<br>`） |
| `Shift+Enter` | 单元格内 | 移动到下一行同列（不换行） |
| `Ctrl+Enter` | 单元格内 | 在表格后插入新段落，跳出表格 |
| `Ctrl+Shift+I` | 表格内 | 在当前行上方插入行 |
| `Ctrl+Shift+K` | 表格内 | 在当前行下方插入行 |
| `Ctrl+Shift+Delete` | 表格内 | 删除当前行 |
| `Ctrl+Shift+]` | 表格内 | 在当前列右侧插入列 |
| `Ctrl+Shift+[` | 表格内 | 在当前列左侧插入列 |
| `Ctrl+Alt+Delete` | 表格内 | 删除当前列 |
| `Ctrl+Shift+M` | 选中单元格区域 | 合并选中单元格 |
| `Ctrl+Shift+Alt+M` | 合并单元格内 | 拆分单元格 |
| `Backspace` | 单元格为空且为第一列 | 删除该行（如果整行都为空） |

### 10.1 Tab 换行行为

最后一个单元格（最后一行最右列）按 Tab：
- 在表格末尾追加一个新行
- 光标移到新行第一列

```typescript
// 在 Extension.addKeyboardShortcuts 中处理
Tab: () => {
  if (isLastCell(this.editor)) {
    return this.editor.commands.addRowAfter();
  }
  return this.editor.commands.goToNextCell();
},
```

---

## §11 GFM 管道表格序列化（双向往返）

### 11.1 GFM 表格格式

```markdown
| 姓名   | 年龄 | 城市   |
|--------|------|--------|
| 张三   | 28   | 北京   |
| 李四   | 35   | 上海   |
```

对齐标记：
```markdown
| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
```

### 11.2 序列化（TipTap → Markdown）

```typescript
// src/extensions/TableV2/tableSerializer.ts
export function serializeTable(node: ProseMirrorNode): string {
  const rows: string[][] = [];
  const aligns: Array<'left' | 'center' | 'right' | null> = [];

  // 遍历行
  node.forEach((row) => {
    const cells: string[] = [];
    row.forEach((cell, _, i) => {
      if (rows.length === 0 && aligns.length <= i) {
        aligns.push(cell.attrs.align ?? null);
      }
      // 递归序列化单元格内容（支持内联 Markdown）
      cells.push(serializeInlineContent(cell.content));
    });
    rows.push(cells);
  });

  if (rows.length === 0) return '';

  // 计算每列最大宽度（对齐美化，可选）
  const colWidths = rows[0].map((_, ci) =>
    Math.max(...rows.map((r) => r[ci]?.length ?? 0), 3)
  );

  // 生成头部
  const header = '| ' + rows[0].map((cell, i) => cell.padEnd(colWidths[i])).join(' | ') + ' |';

  // 生成对齐行
  const separator = '| ' + aligns.map((align, i) => {
    const dashes = '-'.repeat(Math.max(3, colWidths[i]));
    switch (align) {
      case 'left':   return ':' + dashes.slice(1);
      case 'center': return ':' + dashes.slice(1, -1) + ':';
      case 'right':  return dashes.slice(0, -1) + ':';
      default:       return dashes;
    }
  }).join(' | ') + ' |';

  // 生成数据行
  const dataRows = rows.slice(1).map(
    (row) => '| ' + row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ') + ' |'
  );

  // caption 处理
  const caption = node.attrs.caption
    ? `*${node.attrs.caption}*\n\n`
    : '';

  return caption + [header, separator, ...dataRows].join('\n');
}
```

### 11.3 反序列化（Markdown → TipTap）

使用 `remark-gfm` + 自定义 inputRule：

```typescript
// InputRule: 检测管道表格输入
addInputRules() {
  return [
    // 当用户粘贴或输入完整的 pipe 表格格式时，自动转为 Table 节点
    new InputRule({
      find: /^\|(.+\|)+\n\|[-:| ]+\|\n(\|(.+\|)+\n)*$/m,
      handler: ({ state, match, range }) => {
        const tableMarkdown = match[0];
        const tableNode = parsePipeTable(tableMarkdown, state.schema);
        if (!tableNode) return null;
        const tr = state.tr.replaceWith(range.from, range.to, tableNode);
        return tr;
      },
    }),
  ];
}
```

`parsePipeTable` 函数：
```typescript
export function parsePipeTable(markdown: string, schema: Schema): ProseMirrorNode | null {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return null;

  // 解析表头行
  const headerCells = parseTableRow(lines[0]);

  // 解析对齐行
  const aligns = parseAlignRow(lines[1]);
  if (!aligns) return null;

  // 解析数据行
  const dataRows = lines.slice(2).map(parseTableRow);

  // 构建 ProseMirror 节点
  return buildTableNode(schema, headerCells, aligns, dataRows);
}
```

### 11.4 特殊字符转义

管道符 `|` 在单元格内需要转义为 `\|`：
```typescript
function escapePipeInCell(text: string): string {
  return text.replace(/\|/g, '\\|');
}

function unescapePipeInCell(text: string): string {
  return text.replace(/\\\|/g, '|');
}
```

### 11.5 往返保真契约

GFM 管道表格往返保真级别：

| 内容类型 | 往返保真 | 说明 |
|---|---|---|
| 纯文本单元格 | 完整 | 内容精确还原 |
| 内联格式（**粗体**、*斜体*、`代码`） | 完整 | 内联 Markdown 保留 |
| 对齐（左/居中/右） | 完整 | `:---:` 等语法 |
| 表头行（`<thead>`） | 完整 | 第一行自动识别为表头 |
| 列宽 | 不保真 | GFM 不支持，丢弃 |
| 合并单元格（colspan/rowspan） | 不保真 | GFM 不支持，扁平化 |
| 表格标题（caption） | 近似 | 转为 `*斜体文字*` |
| 单元格内换行 | 近似 | 换行转为 `<br>` 再序列化 |

---

## §12 浮动表格工具栏

### 12.1 触发条件

- 光标在表格内（任意单元格）：显示工具栏
- 有单元格选择区域（CellSelection）：工具栏显示合并操作

### 12.2 工具栏位置

定位在表格 DOM 节点的**上方居中**：
- 距离表格顶部 8px 以上
- 水平居中于表格
- z-index 高于正文工具栏

若表格紧贴视口顶部，工具栏改为显示在表格下方。

### 12.3 工具栏内容

```
[插入列左 ←] [插入列右 →] [删除列 ✕] | [插入行上 ↑] [插入行下 ↓] [删除行 ✕]
| [对齐 ← ↔ →] | [合并] [拆分] | [表头 ⊞] | [Caption] | [删除表格]
```

详细按钮列表：

| 按钮 | 图标（lucide） | 命令 | 快捷键 |
|---|---|---|---|
| 插入列（左） | `ArrowLeftFromLine` | `addColumnBefore` | `Ctrl+Shift+[` |
| 插入列（右） | `ArrowRightFromLine` | `addColumnAfter` | `Ctrl+Shift+]` |
| 删除列 | `Columns2` + `Minus` | `deleteColumn` | `Ctrl+Alt+Del` |
| 插入行（上） | `ArrowUpFromLine` | `addRowBefore` | `Ctrl+Shift+I` |
| 插入行（下） | `ArrowDownFromLine` | `addRowAfter` | `Ctrl+Shift+K` |
| 删除行 | `Rows2` + `Minus` | `deleteRow` | `Ctrl+Shift+Del` |
| 左对齐 | `AlignLeft` | `setColumnAlign('left')` | — |
| 居中对齐 | `AlignCenter` | `setColumnAlign('center')` | — |
| 右对齐 | `AlignRight` | `setColumnAlign('right')` | — |
| 合并单元格 | `Merge` | `mergeCells` | `Ctrl+Shift+M` |
| 拆分单元格 | `Split` | `splitCell` | `Ctrl+Shift+Alt+M` |
| 切换表头 | `Table` | `toggleHeaderRow` | — |
| 添加/编辑 Caption | `Type` | `toggleTableCaption` | — |
| 删除整个表格 | `Trash2` | `deleteTable` | — |

### 12.4 组件实现

```vue
<!-- src/extensions/TableV2/TableToolbar.vue -->
<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="table-floating-toolbar"
      :style="toolbarStyle"
    >
      <!-- 工具按钮组 -->
    </div>
  </Teleport>
</template>
```

---

## §13 大表格虚拟滚动

### 13.1 触发条件

- 表格行数 > 100 行：启用纵向虚拟滚动
- 表格列数超出容器宽度：启用横向滚动（CSS `overflow-x: auto`，无需虚拟化）

### 13.2 纵向虚拟滚动

使用 `@tanstack/vue-virtual`（vue-virtual）实现：

```typescript
// src/extensions/TableV2/TableVirtualScroll.vue
import { useVirtualizer } from '@tanstack/vue-virtual';

const parentRef = ref<HTMLElement>();
const rowCount = computed(() => props.rows.length);
const rowVirtualizer = useVirtualizer({
  count: rowCount,
  getScrollElement: () => parentRef.value!,
  estimateSize: () => 40, // 默认行高 40px
  overscan: 5,            // 预渲染上下各 5 行
});
```

### 13.3 虚拟滚动触发阈值

| 行数 | 虚拟滚动 |
|---|---|
| ≤ 100 | 不启用，全量渲染 |
| 101-500 | 启用，容器高度 400px |
| 501-2000 | 启用，容器高度 600px |
| > 2000 | 启用，容器高度 600px + 警告 Toast "大表格可能影响性能" |

### 13.4 横向滚动

```css
.inkforge-table-wrapper {
  overflow-x: auto;
  /* 滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.inkforge-table-wrapper::-webkit-scrollbar {
  height: 6px;
}
```

---

## §14 TypeScript 类型定义

```typescript
// src/extensions/TableV2/types.ts

export type ColumnAlign = 'left' | 'center' | 'right' | null;

export interface TableAttrs {
  colWidths: number[] | null;
  hasHeader: boolean;
  caption: string | null;
  captionSide: 'top' | 'bottom';
}

export interface CellAttrs {
  colspan: number;
  rowspan: number;
  colwidth: number[] | null;
  align: ColumnAlign;
  background: string | null;  // v2.2+ 候选，暂 null
}

export type TableCommand =
  | 'addColumnBefore'
  | 'addColumnAfter'
  | 'deleteColumn'
  | 'addRowBefore'
  | 'addRowAfter'
  | 'deleteRow'
  | 'mergeCells'
  | 'splitCell'
  | 'toggleHeaderRow'
  | 'toggleHeaderColumn'
  | 'deleteTable'
  | 'setColumnAlign'
  | 'goToNextCell'
  | 'goToPreviousCell';

export interface TableToolbarState {
  visible: boolean;
  position: { top: number; left: number };
  hasCellSelection: boolean;
  currentColAlign: ColumnAlign;
  isHeaderRow: boolean;
  hasCaption: boolean;
}

export interface SortState {
  colIndex: number | null;
  direction: 'asc' | 'desc' | null;
}

export interface VirtualScrollConfig {
  enabled: boolean;
  containerHeight: number;
  estimatedRowHeight: number;
  overscan: number;
}
```

---

## §15 模块架构

```
src/extensions/TableV2/
├── index.ts                    # Extension 导出
├── types.ts                    # 类型定义
├── tableAttrs.ts               # Table/Cell attrs 定义
├── columnResize.ts             # 列宽拖拽 Plugin
├── tableHighlight.ts           # 行列高亮
├── tableSerializer.ts          # GFM 管道表格序列化
├── tableParser.ts              # GFM 管道表格解析
├── tableKeymap.ts              # 快捷键扩展
├── tableSorter.ts              # 表格内排序（Preview 模式）
├── toolbar/
│   ├── TableToolbarPlugin.ts   # 浮动工具栏 Plugin
│   └── TableToolbar.vue        # 工具栏 Vue 组件
├── virtualScroll/
│   ├── TableVirtualScrollPlugin.ts
│   └── TableVirtualBody.vue   # 虚拟滚动 tbody
└── __tests__/
    ├── tableSerializer.test.ts
    ├── tableParser.test.ts
    ├── columnResize.test.ts
    ├── tableKeymap.test.ts
    └── tableSorter.test.ts
```

---

## §16 Markdown 往返保真契约

按照 10-markdown-authority-spec §7 的要求，Table Extension v2 的往返保真：

### 16.1 完整保真（Lossless）

- 纯文本单元格内容
- 列对齐方向（left/center/right）
- 行数和列数
- 单元格内内联格式（粗体/斜体/代码/链接）

### 16.2 近似保真（Lossy with warning）

- 列宽（GFM 不支持，丢弃）→ 序列化时不丢失内容，仅丢失样式
- 合并单元格（GFM 不支持）→ 序列化时扁平化（colspan 内容合并到第一格）

### 16.3 降级行为

- 含合并单元格的表格序列化为 GFM 时：
  - 发出 console.warn + 用户可见 Toast 警告
  - 输出**部分正确**的 GFM 表格（合并单元格展开为多个独立单元格）

---

## §17 导出行为

| 导出目标 | 表格处理 |
|---|---|
| Markdown | GFM 管道表格格式（§11） |
| HTML | 保留完整 `<table>` + `<colgroup>` + `<thead>/<tbody>` + CSS |
| 微信公众号 | 内联 style，移除 `<caption>`，列宽转为百分比 |
| 知乎 | 与微信类似，使用知乎支持的 HTML 结构 |
| 小红书 | 表格转为纯文本（小红书不支持 HTML 表格），用「」分隔 |

具体导出规则由 15-export-publish-spec 的各平台 exporter 负责。本 Spec 只约定：
1. 序列化管道提供 `serializeTable(node, format)` 接口
2. 各 exporter 调用时传入目标格式

---

## §18 性能 SLO

| 场景 | 目标 |
|---|---|
| 列宽拖拽响应 | < 16ms（60fps） |
| 行列高亮切换 | < 16ms |
| 表格内排序（50 行） | < 100ms |
| 表格内排序（1000 行） | < 500ms |
| GFM 序列化（100 行 × 10 列） | < 50ms |
| GFM 解析（100 行 × 10 列） | < 50ms |
| 虚拟滚动渲染（1000 行） | < 16ms 每帧 |

---

## §19 测试矩阵

| # | 测试场景 | 期望结果 |
|---|---|---|
| T01 | Tab 键从一个单元格跳到下一个 | 光标在下一单元格 |
| T02 | 最后一格 Tab | 新增一行，光标在新行第一格 |
| T03 | Shift+Tab 向前跳格 | 光标在上一单元格 |
| T04 | Enter 键在单元格内换行 | `<br>` 插入，不跳行 |
| T05 | Ctrl+Enter 跳出表格 | 表格后插入段落 |
| T06 | 拖拽列分隔线调整列宽 | colgroup 更新，单元格宽度变化 |
| T07 | 最小列宽限制（40px） | 拖拽不低于 40px |
| T08 | 列宽超出容器 | 表格横向滚动出现 |
| T09 | 设置列左对齐 | 该列所有格 text-align: left |
| T10 | 设置列居中 | `:---:` 在 GFM 序列化中 |
| T11 | 设置列右对齐 | `---:` 在 GFM 序列化中 |
| T12 | 切换表头行 | `<thead>` 出现/消失 |
| T13 | 添加表格标题 | `<caption>` 渲染在表格上方 |
| T14 | Preview 模式点击表头列 | 行按该列排序 |
| T15 | Preview 模式再次点击同列 | 反向排序 |
| T16 | Preview 模式第三次点击同列 | 清除排序 |
| T17 | 鼠标 hover 单元格 | 整行 + 整列高亮 |
| T18 | 浮动工具栏：插入行 | 新行插入，光标在新行 |
| T19 | 浮动工具栏：删除列 | 列删除，列数减少 |
| T20 | 浮动工具栏：合并单元格 | CellSelection 范围合并 |
| T21 | 浮动工具栏：拆分单元格 | colspan=2 拆为两格 |
| T22 | GFM 管道表格序列化（含对齐） | 输出 `:---:` 等语法正确 |
| T23 | GFM 管道表格解析 | 正确识别表头/对齐/数据行 |
| T24 | 单元格内含 `|` 字符 | 序列化为 `\|`，解析还原 |
| T25 | 100 行表格渲染 | 全量渲染，< 200ms |
| T26 | 101 行表格 | 虚拟滚动启用，容器 400px 高 |
| T27 | 500 行表格滚动 | 帧率 ≥ 30fps |
| T28 | 合并单元格表格序列化 | 警告 Toast + 内容不丢失 |
| T29 | Ctrl+Z 撤销表格操作 | 所有表格操作可撤销 |
| T30 | 空表格（1 行 1 列） | 可正常创建和序列化 |

---

## §20 验收标准

1. `@tiptap/extension-table` 所有基础能力（单元格选择、行列增删、合并拆分）在 v2 中完整保留。
2. 列宽拖拽流畅（60fps），最小列宽 40px 约束生效。
3. 列对齐在 GFM 序列化时正确输出 `:---`/`:---:`/`---:` 语法。
4. GFM 管道表格可粘贴进编辑器并正确解析为 Table 节点。
5. Tab/Shift+Tab/Enter/Ctrl+Enter 快捷键行为符合 §10 规范。
6. 浮动工具栏在表格内任意位置显示，所有按钮功能正常。
7. 100 行以上表格启用虚拟滚动，滚动流畅（30fps 以上）。
8. Preview 模式下点击列头排序功能正常，不修改 Markdown 内容。
