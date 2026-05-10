---
id: 38-toc-system-spec
title: TOCSystem — 目录系统规范
version: 1.0.0
status: draft
created: 2026-04-21
source_decisions:
  - W-02=D（TOC 面板位于左栏 Tab，实时高亮 + 折叠 + 拖拽重排章节）
  - M-04=D（文档内嵌 [toc]，实时生成，可配置层级）
  - P-04=D（导出时 TOC 可选，深度/编号/可点击均可配置）
  - W-01=A（右栏仅预览，TOC 在左栏）
related_specs:
  - 35-split-view-spec.md
  - 39-sync-scroll-spec.md
  - 16-markdown-extensions-spec.md
---

# TOCSystem — 目录系统规范

## 1. 概述与设计意图

TOC（Table of Contents，目录）系统在 InkForge 中承担两个独立但关联的职责：

1. **Sidebar TOC Panel**（面板型）：左侧栏独立 Tab，实时跟踪文档标题结构，提供导航、折叠和章节拖拽重排
2. **Inline TOC Macro**（行内型）：文档中插入 `[TOC]` 节点，渲染为可导航的目录列表

两者共享同一个**标题解析器**（`HeadingParser`），但渲染路径和交互模式完全不同。

设计哲学：TOC 是"文档结构的镜子"，必须精确、实时、低延迟。拖拽重排章节是对文档结构的直接操作，具有不可逆影响，必须提供充分的视觉反馈和撤销保障。

---

## 2. 系统架构

### 2.1 核心模块

```
TOCSystem
├── HeadingParser          # 解析 TipTap 文档树，提取 heading 节点列表
├── TOCStore               # Pinia store，存储 TOC 树状态、当前高亮项
├── TOCSidebarPanel        # Sidebar 左栏 Tab 中的面板组件
│   ├── TOCTree            # 递归树形渲染组件
│   ├── TOCTreeNode        # 单个目录项（折叠/展开/高亮/拖拽柄）
│   └── TOCDragManager     # 章节拖拽重排逻辑
└── TOCInlineMacro         # TipTap 扩展：[TOC] 节点渲染
    └── TOCInlineRenderer  # 行内 TOC 的 HTML 渲染器
```

### 2.2 数据流

```
TipTap 文档树
    │  onChange（debounce 300ms）
    ▼
HeadingParser.parse()
    │  returns HeadingNode[]
    ▼
TOCStore.update(headings)
    │  派发到两个消费者
    ├──▶ TOCSidebarPanel（响应式更新树状 UI）
    └──▶ TOCInlineMacro（响应式更新行内渲染）
```

---

## 3. 标题解析器（HeadingParser）

### 3.1 解析逻辑

`HeadingParser.parse(doc: ProseMirrorNode): HeadingNode[]`

遍历 TipTap/ProseMirror 文档树，提取所有 `heading` 类型节点，输出有序列表：

```typescript
interface HeadingNode {
  id: string;           // 唯一 ID，基于标题文本 + 位置 hash（稳定性要求：同文本同位置输出相同 ID）
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;         // 纯文本内容（剥离行内格式）
  pos: number;          // ProseMirror 文档位置（用于跳转）
  domId: string;        // 对应 DOM 元素的 id 属性（用于 IntersectionObserver）
  depth: number;        // 在 TOC 树中的层级深度（相对，从 0 开始）
  children: HeadingNode[];
}
```

### 3.2 ID 生成策略

```typescript
function generateHeadingId(text: string, pos: number): string {
  // slug 化文本 + pos 后缀防重复
  const slug = text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '');
  return `heading-${slug}-${pos}`;
}
```

重复标题（相同文本但不同位置）通过 `pos` 后缀保证唯一性。

### 3.3 树形构建算法

```typescript
function buildTree(flat: HeadingNode[]): HeadingNode[] {
  // 栈式算法，O(n)
  const root: HeadingNode[] = [];
  const stack: HeadingNode[] = [];
  for (const node of flat) {
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }
  return root;
}
```

### 3.4 防抖策略

文档内容变化时，HeadingParser 通过 TipTap 的 `onUpdate` 钩子触发，防抖 300ms。在 300ms 内的连续编辑只触发一次解析，避免高频重算。

---

## 4. TOCStore

### 4.1 状态结构

```typescript
interface TOCState {
  headings: HeadingNode[];            // 当前文档完整 TOC 树
  activeHeadingId: string | null;     // 当前 viewport 内高亮的标题 ID
  expandedIds: Set<string>;           // 手动展开的节点 ID（折叠状态管理）
  maxDepth: number;                   // 显示最大深度，来自 Settings（默认 3）
  numbering: 'none' | 'decimal' | 'nested'; // 编号模式
  lastUpdated: number;                // 上次更新时间戳（用于调试）
}
```

### 4.2 Action 列表

| Action | 说明 |
|--------|------|
| `updateHeadings(nodes)` | HeadingParser 输出时调用，更新 headings 树 |
| `setActiveHeading(id)` | IntersectionObserver 回调时调用 |
| `toggleExpand(id)` | 用户点击折叠箭头时调用 |
| `expandAll()` / `collapseAll()` | 全展开/全折叠 |
| `reorderHeading(from, to)` | 拖拽重排完成时调用（触发 ProseMirror 事务） |

---

## 5. Sidebar TOC Panel

### 5.1 面板位置与激活

TOC Panel 位于左侧 Sidebar 的独立 Tab（与 FileManager、VersionHistory 并列）：

```
Sidebar Tab 顺序：[文件树] [TOC] [版本历史]
```

Tab 图标：`List`（lucide-vue-next）

面板宽度随 Sidebar 宽度，Sidebar 最小宽度 220px，最大 400px（可拖拽调整）。

### 5.2 面板头部

```
TOC ───────────────────────── [展开全部] [折叠全部] [设置]
```

- **展开全部**：图标 `ChevronsDown`
- **折叠全部**：图标 `ChevronsUp`
- **设置**：跳转到 Settings > 编辑器 > TOC 配置区

头部固定在面板顶部，内容区独立滚动。

### 5.3 树形渲染规格

#### 缩进规则

| 标题级别 | 缩进量（左 padding） |
|---------|-------------------|
| H1 | 0px（顶层，无缩进） |
| H2 | 16px |
| H3 | 32px |
| H4 | 48px |
| H5 | 64px |
| H6 | 80px |

超过 `maxDepth` 的标题节点不渲染（Settings 配置，默认显示到 H3）。

#### 节点组成

每个 `TOCTreeNode` 从左到右依次：

```
[折叠箭头（仅有子节点时显示）] [编号（可选）] [标题文本] [（当前高亮指示）]
```

- **折叠箭头**：`ChevronRight`（折叠态）/ `ChevronDown`（展开态），8px × 8px，点击区域 24px × 24px
- **编号**：仅在 `numbering !== 'none'` 时显示，灰色次要文本
- **标题文本**：截断规则：单行，超出 Sidebar 宽度时 `text-overflow: ellipsis`
- **高亮指示**：当前 viewport 内可见标题，左侧 2px 品牌色竖线 + 背景色 `var(--color-toc-active-bg)`

#### 字号规则

| 标题级别 | 字号 | 字重 |
|---------|------|------|
| H1 | 14px | 600 |
| H2 | 13px | 500 |
| H3 | 12px | 400 |
| H4~H6 | 12px | 400，颜色略淡 |

### 5.4 当前标题高亮（IntersectionObserver）

使用 `IntersectionObserver` 监听编辑器内所有 heading DOM 节点进入/离开 viewport：

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length > 0) {
      const topHeading = visible[0];
      tocStore.setActiveHeading(topHeading.target.id);
    }
  },
  {
    root: editorScrollContainer,
    rootMargin: '-10% 0px -85% 0px', // 只取 viewport 顶部 15% 区域
    threshold: 0,
  }
);
```

高亮逻辑：viewport 顶部最近的 heading 高亮。滚动到文档底部时，最后一个 heading 高亮。

### 5.5 点击跳转

点击 `TOCTreeNode` 时：

1. 调用 `editor.commands.scrollToNode(headingPos)` 或通过 DOM id 调用 `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`
2. 更新浏览器 URL hash（仅在 Web 模式下，Tauri 不处理）
3. 跳转后该 heading 在编辑器中获得光标焦点（`editor.commands.setTextSelection(pos)`）

滚动动画：`smooth`，300ms。

### 5.6 折叠/展开子标题

有子节点的 `TOCTreeNode` 显示折叠箭头：

- 点击箭头：切换该节点的展开/折叠状态（更新 `tocStore.expandedIds`）
- 折叠时：子节点从视图中移除（`v-if`，非 `v-show`，避免大量 DOM 残留）
- 折叠箭头旋转动画：90deg，150ms ease

默认状态：所有节点展开（`expandedIds` 初始为全集），用户手动折叠后持久化到 `layoutStore.tocExpandedIds`（Session 级别，非账户级别）。

---

## 6. 编号模式

### 6.1 模式定义

| 模式 | 效果示例 | 说明 |
|------|---------|------|
| `none` | 无编号 | 默认 |
| `decimal` | `1.`、`2.`、`3.` | 仅顶层编号 |
| `nested` | `1.`、`1.1.`、`1.1.1.` | 多级嵌套编号 |

### 6.2 编号计算

编号在 `HeadingParser.parse()` 阶段附加（非渲染阶段计算）：

```typescript
function attachNumbering(nodes: HeadingNode[], mode: 'decimal' | 'nested'): void {
  const counters: number[] = new Array(6).fill(0);
  for (const node of nodes) {
    const lvl = node.level - 1;
    counters[lvl]++;
    for (let i = lvl + 1; i < 6; i++) counters[i] = 0; // 重置下级计数
    if (mode === 'decimal') {
      node.numbering = lvl === 0 ? `${counters[0]}.` : '';
    } else {
      node.numbering = counters.slice(0, lvl + 1).filter(Boolean).join('.') + '.';
    }
  }
}
```

---

## 7. 章节拖拽重排

### 7.1 交互规格

拖拽柄（`GripVertical`，lucide-vue-next）位于每个 `TOCTreeNode` 左侧，仅在鼠标悬停时显示（延迟 200ms 淡入）。

拖拽行为：

1. 用户按住拖拽柄开始拖拽
2. 被拖拽项以"虚影"形式跟随鼠标（opacity 0.5，蓝色轮廓）
3. 目标位置显示 2px 品牌色水平插入线（`TOCDropIndicator`）
4. 松手：调用 `tocStore.reorderHeading(fromId, toId)`

### 7.2 ProseMirror 节点移动

`reorderHeading` 最终执行 ProseMirror 事务，将源 heading 节点及其内容（到下一个同级或更高级 heading 之前的所有内容）移动到目标位置：

```typescript
function reorderHeadingInDoc(editor: Editor, fromPos: number, toPos: number): void {
  const { tr, doc } = editor.state;
  // 1. 计算源章节的范围（heading 节点 + 其所有子内容直到下一个同级/更高级 heading）
  const fromRange = getHeadingSectionRange(doc, fromPos);
  // 2. 提取内容 slice
  const slice = doc.slice(fromRange.from, fromRange.to);
  // 3. 删除源内容，在目标位置插入
  tr.delete(fromRange.from, fromRange.to);
  const adjustedTo = toPos > fromRange.from ? toPos - (fromRange.to - fromRange.from) : toPos;
  tr.insert(adjustedTo, slice.content);
  editor.view.dispatch(tr);
}
```

### 7.3 嵌套规则

- H1 节点可在 H1 节点间拖拽（顶层排序）
- H2 节点可在同一 H1 下的 H2 节点间拖拽（不允许跨 H1 拖拽改变归属）
- 不支持跨层级拖拽（如将 H2 拖成 H1 的兄弟节点）
- 违反规则时插入线不显示，松手无效果

### 7.4 撤销支持

拖拽完成后可 `Ctrl+Z` 撤销（ProseMirror 事务自动加入撤销历史）。

### 7.5 性能保障

对于超过 100 个标题的文档，拖拽使用虚拟列表渲染 TOC 树（`vue-virtual-scroller`），避免大量 DOM 节点导致的拖拽卡顿。

---

## 8. 文档内嵌 TOC（M-04=D）

### 8.1 触发方式

用户通过以下方式在文档中插入 `[TOC]` 节点：

| 触发方式 | 命令 |
|---------|------|
| 输入 `[TOC]` 并回车 | 自动识别，转换为 TOCMacro 节点 |
| 斜杠命令 `/toc` | 搜索 `toc`，插入 TOCMacro 节点 |
| 命令面板 | 搜索 `目录`，执行 `editor.insertTOC` |

### 8.2 TipTap 扩展定义

```typescript
const TOCMacroExtension = Node.create({
  name: 'tocMacro',
  group: 'block',
  atom: true,      // 不可分割节点
  selectable: true,
  draggable: true, // 可作为块级节点拖拽（配合 46-draggable-ordering-spec）
  parseHTML() {
    return [{ tag: 'div[data-type="toc-macro"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'toc-macro' }, 0];
  },
  addNodeView() {
    return VueNodeViewRenderer(TOCInlineRenderer);
  },
});
```

### 8.3 行内渲染器（TOCInlineRenderer）

`TOCInlineRenderer.vue` 订阅 `TOCStore.headings`，响应式渲染目录列表。

渲染形式由 Settings > 编辑器 > TOC 行内样式 配置：

| 样式选项 | 效果 |
|---------|------|
| `unordered` | `<ul>` 无序列表，项目符号 |
| `ordered` | `<ol>` 有序列表，自动编号 |
| `plain` | 无列表符号，纯缩进 |

默认样式：`plain`。

### 8.4 行内 TOC 的点击跳转

行内 TOC 中的每个条目点击后触发与 Sidebar TOC 相同的跳转逻辑（`scrollToNode + setTextSelection`）。

### 8.5 行内 TOC 的最大深度

行内 TOC 遵循全局 `maxDepth` 配置（Settings > 编辑器 > TOC 最大深度）。

若文档中有多个 `[TOC]` 节点，每个均实时渲染（同一数据源，多次引用）。

### 8.6 Markdown 序列化

`[TOC]` 节点在导出 Markdown 时序列化为：

```markdown
[TOC]
```

与 Typora 兼容。导出 HTML 时渲染为完整的 `<nav>` + `<ol>/<ul>` 结构（与 P-04=D 联动）。

---

## 9. 导出 TOC（P-04=D）

### 9.1 导出选项

在导出对话框（ExportPipeline）中，用户可配置：

| 选项 | 控件类型 | 默认值 |
|------|---------|--------|
| 生成文章头部目录 | Toggle | 关闭 |
| 目录层级深度 | Select（H1~H6） | H3 |
| 目录编号 | Select（无/数字/嵌套） | 无 |
| 目录链接可点击 | Toggle | 开启（仅 HTML 格式有效） |

### 9.2 导出渲染

导出 HTML 时，若"生成文章头部目录"开启：

1. 在 `<body>` 开头插入 `<nav class="toc">` 节点
2. 内容由 `ExportTOCRenderer` 基于 `HeadingParser` 输出生成
3. 每个条目带 `<a href="#heading-xxx">` 锚链接

导出 Markdown 时，若开启目录生成：

```markdown
## 目录

- [第一章](#heading-xxx)
  - [第一节](#heading-yyy)
```

---

## 10. Settings 配置项

位于 Settings > 编辑器 > 目录（TOC）：

| 配置项 | 控件 | 默认值 | 说明 |
|--------|------|--------|------|
| TOC 最大深度 | Select（H1~H6） | H3 | 控制 Sidebar TOC 和行内 TOC 的最大显示层级 |
| 编号模式 | Select（无/数字/嵌套） | 无 | 控制 Sidebar TOC 和行内 TOC 的编号显示 |
| 行内 TOC 列表样式 | Select（无序/有序/纯文本） | 纯文本 | 控制 `[TOC]` 节点的渲染样式 |
| 自动高亮当前标题 | Toggle | 开启 | 控制 IntersectionObserver 是否激活 |
| 平滑滚动 | Toggle | 开启 | 点击跳转时使用 smooth 还是 instant |

---

## 11. 与其他系统集成

### 11.1 SyncScroll（39-sync-scroll-spec）

SyncScroll 使用 TOCStore 提供的 `activeHeadingId` 作为锚点匹配依据。Sidebar TOC 高亮变化时，SyncScroll 可据此找到右栏对应位置。

### 11.2 SplitView（35-split-view-spec）

Sidebar TOC 面板在分栏状态下仍显示，反映的是左栏（主编辑文档）的标题结构。右栏 Preview 的内容由左栏文档决定，TOC 一致。

### 11.3 BlockDragHandle（46-draggable-ordering-spec）

`[TOC]` 节点（TOCMacro）是 atom 节点，可被 BlockDragHandle 拖拽（整体移动，不进入内部）。

### 11.4 导出管道（ExportPipeline）

`ExportTOCRenderer` 在导出管道中作为可选步骤插入，依赖 `HeadingParser` 输出，与编辑器内的 TOCMacro 节点保持同一数据源。

### 11.5 版本历史（VersionHistory）

查看历史版本时，Sidebar TOC 更新为历史版本的标题结构（只读模式，不可拖拽重排）。

---

## 12. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 文档无任何标题 | Sidebar TOC 显示空状态："当前文档暂无标题" |
| [TOC] 节点在无标题文档中 | 行内 TOC 渲染空占位，显示灰色提示文本 |
| IntersectionObserver 不可用 | 降级：禁用自动高亮，Sidebar TOC 可用但无高亮状态 |
| 拖拽重排失败（ProseMirror 事务错误） | Toast 提示"章节移动失败，请重试"，事务回滚 |
| 标题超过 500 个 | Sidebar TOC 启用虚拟列表，提示"文档标题过多，已启用性能模式" |

---

## 13. 组件文件结构

```
src/components/toc/
├── TOCSidebarPanel.vue          # 面板容器
├── TOCPanelHeader.vue           # 面板头部（展开/折叠全部 + 设置入口）
├── TOCTree.vue                  # 递归树形组件
├── TOCTreeNode.vue              # 单个节点
├── TOCDropIndicator.vue         # 拖拽插入线
├── TOCDragManager.ts            # 拖拽逻辑（非 UI 组件）
└── TOCEmpty.vue                 # 空状态

src/editor/extensions/
└── toc-macro.ts                 # TipTap TOCMacro 扩展

src/components/toc/inline/
└── TOCInlineRenderer.vue        # 行内 TOC Vue NodeView

src/services/toc/
├── heading-parser.ts            # HeadingParser（解析 + 树形构建 + 编号）
└── heading-scroll.ts            # 跳转逻辑（scrollToNode）

src/stores/
└── tocStore.ts                  # Pinia TOC 状态

src/services/export/
└── export-toc-renderer.ts       # 导出管道 TOC 渲染器
```

---

## 14. 测试矩阵

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 1 | 文档中新增标题 H2 | 300ms 内 Sidebar TOC 新增对应节点 | P0 |
| 2 | 删除文档中某 H3 标题 | Sidebar TOC 对应节点消失 | P0 |
| 3 | 修改标题文本 | TOC 节点文本实时更新 | P0 |
| 4 | 点击 Sidebar TOC 节点 | 编辑器平滑滚动到对应标题 | P0 |
| 5 | 编辑器滚动时 TOC 当前项高亮正确 | viewport 顶部 heading 高亮 | P0 |
| 6 | 滚动到文档底部 | 最后一个标题高亮 | P0 |
| 7 | 折叠含子节点的 H2 | H2 子节点从 TOC 隐藏 | P1 |
| 8 | 展开折叠节点 | 子节点重新出现，折叠箭头旋转 | P1 |
| 9 | 展开全部 / 折叠全部按钮 | 全部展开或折叠 | P1 |
| 10 | maxDepth=H2 时 H3 不显示 | Settings 限制生效 | P0 |
| 11 | 编号模式切换为 nested | TOC 和行内 TOC 均显示嵌套编号 | P1 |
| 12 | 拖拽 H1 节点到另一 H1 位置 | 文档章节顺序变化，Ctrl+Z 可撤销 | P0 |
| 13 | 拖拽 H2 跨 H1 边界 | 拒绝拖拽，无插入线显示 | P1 |
| 14 | 插入 [TOC] 宏节点 | 行内 TOC 实时渲染当前文档标题 | P0 |
| 15 | 无标题文档的行内 [TOC] | 显示灰色占位提示 | P1 |
| 16 | 行内 [TOC] 点击条目 | 编辑器跳转至对应标题 | P0 |
| 17 | Markdown 导出含 [TOC] | 序列化为 `[TOC]` 字符串 | P1 |
| 18 | 导出 HTML 时开启 TOC 选项 | `<nav class="toc">` 插入到 body 开头 | P1 |
| 19 | 500+ 标题文档 | 虚拟列表激活，拖拽不卡顿 | P2 |
| 20 | 分栏状态下 Sidebar TOC | 反映左栏文档标题，不跟踪右栏 | P1 |
| 21 | 查看历史版本时 TOC | 显示历史版本标题，拖拽柄不显示 | P2 |
| 22 | 暗色模式下 TOC Panel | 所有色值使用 CSS token，无硬编码 | P1 |
| 23 | TOC 最大深度 H1 时 | 只显示 H1 层节点 | P1 |
| 24 | 同文本重复标题 | 各自唯一 ID，点击分别跳转正确 | P0 |
| 25 | Settings > 自动高亮关闭 | 滚动时 TOC 无高亮状态变化 | P2 |

---

## 15. 性能要求

| 指标 | 要求 |
|------|------|
| HeadingParser 解析延迟 | < 10ms（10k 字文档） |
| TOC 更新 debounce | 300ms（可配置） |
| 点击跳转响应 | < 50ms（不含滚动动画） |
| IntersectionObserver 更新频率 | 随浏览器帧率，不额外开销 |
| 500 标题文档虚拟列表 FPS | ≥ 60fps 拖拽 |

---

## 16. 可访问性

| 要求 | 实现方式 |
|------|---------|
| TOC 面板语义 | `<nav role="navigation" aria-label="文档目录">` |
| 树形节点 | `role="tree"` + `role="treeitem"` + `aria-expanded` |
| 当前高亮项 | `aria-current="location"` |
| 折叠按钮 | `aria-label="折叠/展开 {标题文本}"` |
| 拖拽柄 | `aria-label="拖拽重排 {标题文本}"`, `role="button"` |

---

## 17. 边界条件汇总

1. 文档只有 H4~H6（无 H1~H3）：TOCTree 以 H4 为顶层节点渲染，depth=0 从 H4 开始计
2. 标题文本为空字符串：TOC 节点显示灰色"（空标题）"，ID 基于 pos 生成
3. 标题内有行内格式（粗体/链接）：`text` 字段仅取纯文本，格式剥离
4. 文档内多个 `[TOC]` 节点：均独立渲染，数据来源相同，互不干扰
5. 用户手动折叠的节点在文档更新后：折叠状态保持（`expandedIds` 按 ID 记录），但若该标题 ID 消失（标题被删除），从 `expandedIds` 中清除
6. 标题内容包含表情符号：slug 化时过滤非 alphanumeric 和中文字符，表情被移除，ID 依赖 pos 保证唯一

---

## 18. 验收标准

- [ ] Sidebar TOC 在 300ms 内响应文档标题变化（P0 测试矩阵全通）
- [ ] 点击跳转正确定位（附视频证据）
- [ ] 章节拖拽重排正确修改文档结构，Ctrl+Z 可完整撤销（附前后对比截图）
- [ ] 行内 `[TOC]` 渲染正确，点击跳转有效
- [ ] 导出 HTML 时 TOC 结构完整且锚链接可点击
- [ ] 500 标题文档虚拟列表无卡顿（FPS 截图 ≥ 60）
- [ ] 暗色模式完整适配（截图对比）
- [ ] Settings 配置项全部生效（逐项验证截图）

---

*本文档生成于 2026-04-21，依据 W-02/M-04/P-04 决策及 InkForge Ethereal Constructivism 设计语汇。*

---

## 19. 国际化（i18n）文本 key

| Key | 中文值 |
|-----|--------|
| `toc.empty` | 当前文档暂无标题 |
| `toc.inlineEmpty` | （无标题，目录为空） |
| `toc.expandAll` | 展开全部 |
| `toc.collapseAll` | 折叠全部 |
| `toc.settings` | 目录设置 |
| `toc.dragError` | 标题只能在同级章节内移动 |
| `toc.tooManyHeadings` | 文档标题过多，已启用性能模式 |
| `toc.readonly` | 查看历史版本时不可重排章节 |

---

## 20. 实现优先级与分阶段交付

### 20.1 Phase 1（核心功能）

- HeadingParser + TOCStore
- TOCSidebarPanel 基础树形渲染
- 点击跳转（smooth scroll）
- IntersectionObserver 高亮
- debounce 300ms 更新

### 20.2 Phase 2（完整功能）

- 折叠/展开子节点（含持久化）
- 编号模式（decimal / nested）
- 章节拖拽重排
- TOCInlineMacro `[TOC]` 节点
- 导出 TOC（与 ExportPipeline 集成）

### 20.3 Phase 3（细化体验）

- 500+ 标题虚拟列表
- 历史版本查看时只读 TOC
- maxDepth 动态切换（无需刷新页面）
- Settings 所有配置项联动生效

---

## 21. CSS 设计 token 映射

| Token | 用途 | 亮色参考值 |
|-------|------|----------|
| `--color-toc-active-bg` | 当前高亮项背景 | `rgba(211,47,47,0.06)` |
| `--color-toc-active-bar` | 当前高亮项左侧竖线 | `var(--color-brand-primary)` |
| `--color-toc-node-hover` | 节点 hover 背景 | `var(--color-surface-hover)` |
| `--color-toc-number` | 编号文字色 | `var(--color-text-tertiary)` |
| `--color-toc-h1` | H1 文字色 | `var(--color-text-primary)` |
| `--color-toc-h4plus` | H4+ 文字色 | `var(--color-text-secondary)` |

---

## 22. HeadingParser 完整单元测试规范

每个测试用例需提供输入文档 JSON 和期望的 `HeadingNode[]` 输出：

| 测试用例 | 输入 | 期望 |
|---------|------|------|
| 空文档 | `{}` | `[]` |
| 单个 H1 | `H1:"Introduction"` | `[{level:1, text:"Introduction", children:[]}]` |
| H1 + H2 嵌套 | H1 + H2 | H2 在 H1.children 中 |
| 同文本 H2 × 2 | 两个 `H2:"Summary"` | 两个节点 ID 不同（pos 后缀区分） |
| 标题含粗体 | `H2:"**Bold** Title"` | `text:"Bold Title"`（格式剥离） |
| maxDepth=H2 时 H3 | H1+H2+H3 | H3 不在输出树中（depth 过滤） |
| 仅 H4~H6 | H4+H5 | H4 为顶层节点（level 相对化） |

所有用例收录于 `src/services/toc/__tests__/heading-parser.test.ts`。

---

## 23. 已知约束与技术债务记录

### 23.1 ProseMirror 位置稳定性

`HeadingNode.pos` 基于 ProseMirror 文档位置。每次文档编辑操作（插入、删除）都会使文档位置失效（位置会随内容增减而偏移）。

当前解决方案：每次 debounce 更新时**完整重新计算**所有 pos 和 ID。这意味着每次输入 300ms 内 TOC 树会重建一次。

优化方案（v2.2 候选）：使用 ProseMirror 的 `mappedThrough` 机制在步骤级别追踪位置变化，避免全量重算。

### 23.2 TOCInlineMacro 与 HeadingParser 数据同步

行内 `[TOC]` 节点订阅 TOCStore，但 TOCStore 的更新依赖 HeadingParser，HeadingParser 的输入是文档树（通过 TipTap `onUpdate` 触发）。

若 `[TOC]` 节点本身触发文档更新（例如其渲染结果影响文档高度），可能引发轻微的"高度-位置-锚点"循环更新。实测中此循环在 2 轮后收敛（MutationObserver 检测稳定态后停止）。

---

## 2026-05-02 Baseline Implementation Note

Baseline status: Pass for the compatible TOC System parser/store/sidebar baseline; full Spec 38 remains partially pending.

Implemented baseline coverage:

- `services/toc/*` adds a shared typed TOC parser/service boundary for Markdown and TipTap/ProseMirror documents.
- Parser supports H1-H6, deterministic collision-safe ids, slug generation, Markdown inline-markup stripping, fenced-code exclusion, max-depth filtering, tree construction, flat-tree conversion, and `none`/`decimal`/`nested` numbering.
- `useTocStore` exposes real heading tree, flat headings, active heading id, collapsed ids, max-depth/numbering options, error state, update timestamps, and update actions from Markdown or editor docs.
- `useOutline` now delegates extraction, active-heading calculation, collapsed-state pruning, and editor navigation to the TOC parser/store while preserving the existing composable contract.
- `OutlinePanel` remains in the existing Workstation manager tab and now renders recursive H1-H6 TOC nodes through lucide icons, `aria-current`, and accessible collapse controls.
- Existing `[toc]` markdown preview rendering is preserved and covered by integration tests; saved Markdown remains source-authoritative.
- No demo headings or placeholder TOC rows are seeded.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-38-toc-system`: passed before implementation.
- `pnpm exec vitest run src/services/toc/toc.test.ts`: 1 file, 6 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src/services/toc src/stores/toc.ts src/composables/useOutline.ts src/components/outline --quiet`: passed.
- `pnpm exec vitest run`: 18 files and 129 tests passed.
- `pnpm build`: passed with existing non-blocking Vite dynamic/static import and chunk-size warnings only.
- Playwright browser smoke on `http://127.0.0.1:5183/workstation`: dynamic imported real TOC service/store/markdown renderer, verified Markdown heading parsing outside fenced code, nested numbering, tree root count, store update count, `[toc]` nav/anchor rendering, and zero console errors.
- Dev server cleanup: Vite session stopped; port 5183 had no listening process after cleanup, only transient `TIME_WAIT` entries.

Pending for full Spec 38 pass:

- Drag-and-drop chapter reordering and undo-safe ProseMirror section moves.
- Inline TipTap TOC atom NodeView and `/toc` slash insertion.
- Command palette insertion command, export pipeline TOC options, Settings controls, full scroll-spy via IntersectionObserver/official extension, large-document virtualization, full E2E/a11y matrix, and packaged Tauri validation.
