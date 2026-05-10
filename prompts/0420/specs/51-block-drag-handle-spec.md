> 版本: v2.1.0-draft
> 阶段: Phase 1（编辑器层）
> 依赖: 01-spec-editor-typora / 10-markdown-authority-spec / 46-draggable-ordering-spec
> 被依赖: 01-spec-editor-typora §4（Extension 清单）
> 来源决策: E-03 D（拖拽视觉"带着文本走"）/ T05-11 D（统一资源管线）
> 权威来源: 混合（0408 增强问卷 E-03 + 竞品分析 Notion/Linear）
> 创建日期: 2026-04-21
> 铁律遵循: R-01, R-02, R-05, R-14, R-15

# 51 — Block Drag Handle Spec

## 目录

- §1 背景与目标
- §2 范围与边界
- §3 设计规格（视觉）
- §4 支持的块类型
- §5 显示与隐藏逻辑
- §6 TipTap Extension 架构
- §7 ProseMirror Plugin（DragPlugin）
- §8 拖拽生命周期
- §9 插入线装饰（DragDropDecoration）
- §10 嵌套列表处理
- §11 键盘替代
- §12 Undo 集成
- §13 性能优化
- §14 无障碍
- §15 TypeScript 类型定义
- §16 模块架构
- §17 Source 模式与 Preview 模式行为
- §18 测试矩阵
- §19 验收标准

---

## §1 背景与目标

### 1.1 问题背景

InkForge v2.0 不提供块级拖拽能力，用户只能通过剪切粘贴重排内容。
问卷 E-03 D 明确要求：
- 完整块级拖拽 + 列表项拖拽
- 视觉设计为"带着文本走"（Notion 风格虚影跟随）
- 蓝色插入线指示放置位置

### 1.2 目标

1. 在光标所在块左侧显示拖拽柄图标（GripVertical，lucide-vue-next）
2. 拖拽柄支持鼠标拖拽将块移动到文档中任意位置
3. 拖拽过程提供"虚影跟随"视觉效果 + 蓝色插入线
4. 拖拽完成后支持 Ctrl+Z 撤销
5. 提供键盘替代（Alt+↑ / Alt+↓）

---

## §2 范围与边界

### 2.1 本 Spec 覆盖

- `BlockDragHandle` TipTap Extension
- ProseMirror DragPlugin（hover 检测、dragstart/dragover/drop/dragend 事件处理）
- `DragDropDecoration`（插入线渲染）
- `BlockDragHandleView.vue`（Vue NodeView wrapper 组件）
- 键盘替代命令

### 2.2 非目标

- 跨文档拖拽（不同 TabBar 文档间）
- 触摸设备拖拽（v2.1 桌面优先）
- 文件/资产拖放到编辑器（→ 28-asset-pipeline-spec）
- 列重排（表格列拖拽 → 52-table-extension-v2-spec）

---

## §3 设计规格（视觉）

### 3.1 拖拽柄外观

| 属性 | 值 |
|---|---|
| 图标 | `GripVertical`（lucide-vue-next） |
| 尺寸 | 16px × 16px |
| 颜色（idle） | `--color-text-quaternary`（约 40% 透明度） |
| 颜色（hover） | `--color-text-secondary`（约 80% 透明度） |
| 颜色（active/拖拽中） | `--color-accent`（主题强调色） |
| 位置 | 块左侧，水平距离 `-28px`，垂直居中对齐块首行 |
| 背景 | 透明；hover 时 `--color-surface-hover`（圆角 4px） |
| 过渡 | `opacity 150ms ease, color 150ms ease` |

### 3.2 拖拽虚影（Ghost）

| 属性 | 值 |
|---|---|
| 样式 | 克隆被拖拽块的 DOM 节点 |
| 透明度 | 0.7 |
| 边框 | `1px dashed --color-accent` |
| 圆角 | 6px |
| 背景 | `--color-surface-overlay`（半透明底色） |
| 跟随鼠标 | 固定偏移 `(8px, 8px)` from cursor |
| 实现方式 | `setDragImage` 使用克隆节点（不使用浏览器默认拖影） |

### 3.3 插入线（Drop Indicator）

| 属性 | 值 |
|---|---|
| 颜色 | `--color-accent`（蓝色） |
| 高度 | 2px |
| 宽度 | 100%（块宽度） |
| 位置 | 目标块的上方或下方（取决于鼠标 Y 位置） |
| 动画 | `opacity 80ms ease-in` |
| 实现 | ProseMirror Decoration（Widget decoration） |

---

## §4 支持的块类型

以下节点类型显示拖拽柄：

| 节点类型 | ProseMirror 节点名 | 备注 |
|---|---|---|
| 段落 | `paragraph` | 包括空段落 |
| 标题 H1-H6 | `heading` | `attrs.level` 1-6 |
| 代码块 | `codeBlock` | 包括 fence 代码块 |
| 引用块 | `blockquote` | 整个引用块作为拖拽单元 |
| 无序列表 | `bulletList` | 整个列表作为单元；嵌套见 §10 |
| 有序列表 | `orderedList` | 同上 |
| 任务列表 | `taskList` | 同上 |
| 表格 | `table` | 整个表格作为单元 |
| Callout | `callout` | v2.1 Callout（CSS-only 实现） |
| 数学块 | `mathBlock` | 显示公式块 |
| Mermaid 块 | `mermaidBlock` | 代码块特化 |
| 分割线 | `horizontalRule` | 单行元素 |

以下节点**不显示**拖拽柄（内联元素或特殊处理）：
- `text`、`hardBreak`（内联）
- `image`（有专属图片工具栏处理，→ 53-image-extension-v2-spec）
- `listItem`、`taskItem`（由嵌套规则处理，见 §10）

---

## §5 显示与隐藏逻辑

### 5.1 显示时机

```
1. 鼠标移入某个块节点区域（mouseenter on block DOM）
   → 防抖 200ms → 计算该块对应的拖拽柄位置 → 显示柄
```

### 5.2 隐藏时机

```
1. 鼠标离开块区域（mouseleave）
   → 防抖 400ms → 若未在拖拽中，隐藏柄
2. 拖拽进行中：柄始终显示（对应 source 块）
3. 拖拽结束：400ms 后隐藏
```

### 5.3 Source 模式 / Preview 模式

- **Source 模式**（CodeMirror 渲染器）：不显示拖拽柄
- **Preview 模式**（只读渲染）：不显示拖拽柄
- **Typora 模式**：默认显示

模式检测通过读取 `editorModeStore.currentMode` 实现。

### 5.4 防抖实现

```typescript
import { useDebounceFn } from '@vueuse/core';

const showHandle = useDebounceFn((blockPos: number) => {
  handleVisible.value = true;
  currentBlockPos.value = blockPos;
}, 200);

const hideHandle = useDebounceFn(() => {
  if (!isDragging.value) {
    handleVisible.value = false;
  }
}, 400);
```

---

## §6 TipTap Extension 架构

### 6.1 Extension 定义

```typescript
// src/extensions/BlockDragHandle/index.ts
import { Extension } from '@tiptap/core';
import { BlockDragPlugin } from './blockDragPlugin';
import { BlockHandleRenderer } from './blockHandleRenderer';

export const BlockDragHandle = Extension.create({
  name: 'blockDragHandle',

  addProseMirrorPlugins() {
    return [
      BlockDragPlugin(this.editor),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Alt-ArrowUp': () => this.editor.commands.moveBlockUp(),
      'Alt-ArrowDown': () => this.editor.commands.moveBlockDown(),
    };
  },

  addCommands() {
    return {
      moveBlockUp: () => ({ state, dispatch }) => {
        return moveBlock(state, dispatch, 'up');
      },
      moveBlockDown: () => ({ state, dispatch }) => {
        return moveBlock(state, dispatch, 'down');
      },
    };
  },
});
```

### 6.2 Vue 组件集成

拖拽柄渲染为一个**固定定位的 Vue 组件**（非 NodeView），通过 `BlockHandleRenderer` 控制其位置和可见性：

```typescript
// src/extensions/BlockDragHandle/blockHandleRenderer.ts
export class BlockHandleRenderer {
  private app: App; // Vue App 实例
  private component: ComponentPublicInstance;

  constructor(editorView: EditorView, editor: Editor) {
    // 在编辑器容器外挂载 BlockHandleView 组件
    const container = document.createElement('div');
    container.className = 'block-drag-handle-portal';
    editorView.dom.parentElement!.appendChild(container);

    this.app = createApp(BlockHandleView, {
      onDragStart: (pos: number) => this.handleDragStart(pos),
    });
    this.component = this.app.mount(container);
  }

  updatePosition(dom: HTMLElement, pos: number): void {
    // 计算 dom 元素的 getBoundingClientRect
    // 更新 BlockHandleView 的 position + visible
  }

  destroy(): void {
    this.app.unmount();
  }
}
```

### 6.3 BlockHandleView 组件

```vue
<!-- src/extensions/BlockDragHandle/BlockHandleView.vue -->
<template>
  <div
    v-if="visible"
    class="block-drag-handle"
    :style="positionStyle"
    draggable="true"
    @mousedown.prevent="onMouseDown"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <GripVertical :size="16" />
  </div>
</template>
```

---

## §7 ProseMirror Plugin（DragPlugin）

### 7.1 Plugin 职责

1. 监听编辑器 DOM 的 `mousemove`/`mouseover` 事件，追踪光标所在块
2. 更新 `BlockHandleRenderer` 的位置
3. 管理 `DragDropDecoration`（插入线）
4. 处理 `dragover`/`drop` 事件

### 7.2 块位置追踪

```typescript
// src/extensions/BlockDragHandle/blockDragPlugin.ts
function getTopLevelBlockAt(view: EditorView, coords: { x: number; y: number }): {
  pos: number;
  node: ProseMirrorNode;
  dom: HTMLElement;
} | null {
  const pos = view.posAtCoords(coords);
  if (!pos) return null;

  let resolved = view.state.doc.resolve(pos.pos);

  // 向上找到顶层块节点（depth = 1）
  while (resolved.depth > 1) {
    resolved = view.state.doc.resolve(resolved.before());
  }

  const nodePos = resolved.before();
  const node = view.state.doc.nodeAt(nodePos);
  if (!node || !isTopLevelBlock(node)) return null;

  const dom = view.nodeDOM(nodePos) as HTMLElement;
  return { pos: nodePos, node, dom };
}

function isTopLevelBlock(node: ProseMirrorNode): boolean {
  return SUPPORTED_BLOCK_TYPES.includes(node.type.name);
}
```

### 7.3 Plugin 状态机

```typescript
interface DragPluginState {
  hoveredBlockPos: number | null;
  draggedBlockPos: number | null;
  dropTargetPos: number | null;
  dropSide: 'before' | 'after' | null;
  decorations: DecorationSet;
}
```

---

## §8 拖拽生命周期

### 8.1 dragstart

```typescript
function handleDragStart(view: EditorView, event: DragEvent, blockPos: number): void {
  const node = view.state.doc.nodeAt(blockPos);
  if (!node) return;

  // 1. 序列化被拖拽节点为 JSON
  const nodeJSON = node.toJSON();
  event.dataTransfer!.setData('application/inkforge-block', JSON.stringify({
    pos: blockPos,
    node: nodeJSON,
  }));
  event.dataTransfer!.effectAllowed = 'move';

  // 2. 创建虚影节点
  const ghost = createGhostElement(view.nodeDOM(blockPos) as HTMLElement);
  document.body.appendChild(ghost);
  event.dataTransfer!.setDragImage(ghost, 8, 8);
  // ghost 在 dragend 清理

  // 3. 标记拖拽开始
  isDragging.value = true;
  draggedBlockPos.value = blockPos;
}

function createGhostElement(dom: HTMLElement): HTMLElement {
  const ghost = dom.cloneNode(true) as HTMLElement;
  ghost.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    opacity: 0.7;
    border: 1px dashed var(--color-accent);
    border-radius: 6px;
    background: var(--color-surface-overlay);
    max-width: ${dom.offsetWidth}px;
    pointer-events: none;
  `;
  return ghost;
}
```

### 8.2 dragover

```typescript
function handleDragOver(view: EditorView, event: DragEvent): boolean {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';

  const coords = { x: event.clientX, y: event.clientY };
  const target = getTopLevelBlockAt(view, coords);
  if (!target) return false;

  // 确定插入位置：鼠标在块上半部分 → before，下半部分 → after
  const rect = target.dom.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const side = event.clientY < midY ? 'before' : 'after';

  // 更新装饰（插入线）
  updateDropDecoration(view, target.pos, side);
  return true;
}
```

### 8.3 drop

```typescript
function handleDrop(view: EditorView, event: DragEvent): boolean {
  event.preventDefault();

  const data = event.dataTransfer!.getData('application/inkforge-block');
  if (!data) return false;

  const { pos: sourcePos, node: nodeJSON } = JSON.parse(data);
  const targetInfo = currentDropTarget; // 来自 dragover 状态

  if (!targetInfo) return false;

  const { state } = view;
  const tr = state.tr;

  // 1. 解析节点 JSON
  const sourceNode = state.doc.nodeAt(sourcePos);
  if (!sourceNode) return false;

  // 2. 计算插入位置
  const insertPos = targetInfo.side === 'before'
    ? targetInfo.pos
    : targetInfo.pos + state.doc.nodeAt(targetInfo.pos)!.nodeSize;

  // 3. 调整：如果插入位置在 source 后面，删除后位置偏移
  const deleteFirst = insertPos > sourcePos;

  if (deleteFirst) {
    tr.delete(sourcePos, sourcePos + sourceNode.nodeSize);
    const adjustedInsertPos = insertPos - sourceNode.nodeSize;
    tr.insert(adjustedInsertPos, sourceNode);
  } else {
    tr.insert(insertPos, sourceNode);
    tr.delete(sourcePos + sourceNode.nodeSize, sourcePos + sourceNode.nodeSize * 2);
  }

  // 4. 标记为可撤销（history group）
  tr.setMeta('addToHistory', true);

  view.dispatch(tr);
  return true;
}
```

### 8.4 dragend

```typescript
function handleDragEnd(view: EditorView): void {
  // 清理虚影
  ghostElement?.remove();
  ghostElement = null;

  // 清理装饰
  clearDropDecoration(view);

  // 重置状态
  isDragging.value = false;
  draggedBlockPos.value = null;
  dropTargetPos.value = null;
}
```

---

## §9 插入线装饰（DragDropDecoration）

### 9.1 实现方式

使用 ProseMirror `Decoration.widget`，在目标块的前/后插入一个 2px 高的蓝色线条：

```typescript
function createDropDecoration(pos: number, side: 'before' | 'after'): Decoration {
  const insertPos = side === 'before' ? pos : pos; // 由 drop 逻辑确定最终位置
  const widgetPos = side === 'before' ? pos : pos + 1;

  const div = document.createElement('div');
  div.className = 'drag-drop-indicator';
  div.style.cssText = `
    height: 2px;
    background: var(--color-accent);
    border-radius: 1px;
    margin: -1px 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 80ms ease-in;
  `;
  // 触发动画
  requestAnimationFrame(() => { div.style.opacity = '1'; });

  return Decoration.widget(widgetPos, div, { side: side === 'before' ? -1 : 1 });
}
```

### 9.2 装饰更新

每次 dragover 触发时：
1. 清除旧装饰
2. 计算新的目标位置和 side
3. 创建新装饰并通过 `pluginState.decorations = DecorationSet.create(...)` 更新

---

## §10 嵌套列表处理

### 10.1 列表项 vs 列表整体

| 触发位置 | 拖拽单元 |
|---|---|
| 列表项（`listItem`/`taskItem`）上的拖拽柄 | 该**列表项**（可能含子项） |
| 整个列表（`bulletList`/`orderedList`/`taskList`）外侧 | 整个**列表**（所有项） |

区分方式：
- `listItem` 的拖拽柄显示在列表项行首（相对于列表项的左侧，不是整个文档左侧）
- 整个列表的拖拽柄显示在列表最外层左侧

### 10.2 列表项拖拽后处理

列表项拖拽到其他位置时：
- 拖到另一个列表项的 before/after → 在同一列表中重排
- 拖到非列表块 → 将列表项"解包"为独立段落，在目标位置插入

### 10.3 嵌套深度

仅支持拖拽顶层（depth=1）节点和一级列表项（depth=2）。
更深层的嵌套列表项不显示拖拽柄（避免过于复杂的交互）。

---

## §11 键盘替代

### 11.1 快捷键

| 快捷键 | 动作 |
|---|---|
| `Alt+ArrowUp` | 将当前块向上移动一个块位置 |
| `Alt+ArrowDown` | 将当前块向下移动一个块位置 |

### 11.2 移动块命令实现

```typescript
function moveBlock(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
  direction: 'up' | 'down'
): boolean {
  const { selection } = state;
  const { $from } = selection;

  // 找到当前顶层块
  const blockPos = $from.before(1);
  const blockNode = state.doc.nodeAt(blockPos);
  if (!blockNode) return false;

  const blockEnd = blockPos + blockNode.nodeSize;

  if (direction === 'up') {
    // 找到上一个块
    if (blockPos === 0) return false;
    const prevBlockPos = state.doc.resolve(blockPos - 1).before(1);
    const prevBlockNode = state.doc.nodeAt(prevBlockPos);
    if (!prevBlockNode) return false;

    if (dispatch) {
      const tr = state.tr;
      // 交换两个块
      const currentContent = blockNode.copy(blockNode.content);
      const prevContent = prevBlockNode.copy(prevBlockNode.content);
      tr.replaceWith(prevBlockPos, blockEnd, [currentContent, prevContent]);
      tr.setMeta('addToHistory', true);
      dispatch(tr);
    }
    return true;
  }

  // direction === 'down': 对称处理
  const nextPos = blockEnd;
  if (nextPos >= state.doc.content.size) return false;
  const nextBlockNode = state.doc.nodeAt(nextPos);
  if (!nextBlockNode) return false;

  if (dispatch) {
    const tr = state.tr;
    const currentContent = blockNode.copy(blockNode.content);
    const nextContent = nextBlockNode.copy(nextBlockNode.content);
    tr.replaceWith(blockPos, nextPos + nextBlockNode.nodeSize, [nextContent, currentContent]);
    tr.setMeta('addToHistory', true);
    dispatch(tr);
  }
  return true;
}
```

---

## §12 Undo 集成

### 12.1 原则

所有拖拽/键盘移动操作的 ProseMirror Transaction 设置：
```typescript
tr.setMeta('addToHistory', true);
```

TipTap 的 History 扩展（基于 `prosemirror-history`）会将此 Transaction 纳入撤销栈。
一次完整的拖拽（dragstart → drop）产生**一个撤销步骤**。

### 12.2 撤销后的状态

撤销后：
- 被拖拽的块回到原位
- 拖拽目标位置的块恢复原排序
- 光标位置恢复到操作前位置

---

## §13 性能优化

### 13.1 大文档节点位置缓存

当文档节点数 > 500 时，启用节点位置缓存：

```typescript
class BlockPositionCache {
  private cache = new Map<number, { pos: number; node: ProseMirrorNode; dom: HTMLElement }>();
  private lastDocVersion = -1;

  update(view: EditorView): void {
    if (view.state.doc.version === this.lastDocVersion) return;
    this.cache.clear();

    // 遍历顶层节点重建缓存
    view.state.doc.forEach((node, offset) => {
      this.cache.set(offset, {
        pos: offset,
        node,
        dom: view.nodeDOM(offset) as HTMLElement,
      });
    });

    this.lastDocVersion = view.state.doc.version;
  }

  getNearestBlock(y: number): { pos: number; dom: HTMLElement } | null {
    // 通过 Y 坐标快速查找块（二分搜索）
    // ...
  }
}
```

### 13.2 mousemove 限速

30fps 限速（约 33ms）更新拖拽柄位置：

```typescript
import { useThrottleFn } from '@vueuse/core';

const updateHandle = useThrottleFn((event: MouseEvent) => {
  const block = getTopLevelBlockAt(view, { x: event.clientX, y: event.clientY });
  if (block) {
    handleRenderer.updatePosition(block.dom, block.pos);
  }
}, 33); // ~30fps
```

### 13.3 dragover 节流

dragover 事件触发频率极高，使用 requestAnimationFrame 节流：

```typescript
let rafPending = false;
function handleDragOverThrottled(event: DragEvent): void {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    handleDragOver(view, event);
    rafPending = false;
  });
}
```

---

## §14 无障碍

### 14.1 ARIA

```html
<div
  class="block-drag-handle"
  role="button"
  aria-label="拖拽移动此块"
  aria-pressed="false"
  tabindex="-1"
>
```

拖拽柄通过 `tabindex="-1"` 排除在 Tab 焦点序列外（键盘用户使用 Alt+↑/↓ 替代）。

### 14.2 屏幕阅读器提示

键盘移动命令执行后：
- 发布 `aria-live="polite"` 区域更新：`"块已向上移动"` / `"块已向下移动"`

---

## §15 TypeScript 类型定义

```typescript
// src/extensions/BlockDragHandle/types.ts

export interface BlockInfo {
  pos: number;
  node: ProseMirrorNode;
  dom: HTMLElement;
}

export interface DropTarget {
  pos: number;
  side: 'before' | 'after';
  dom: HTMLElement;
}

export interface DragState {
  isDragging: boolean;
  sourcePos: number | null;
  dropTarget: DropTarget | null;
  ghostElement: HTMLElement | null;
}

export interface BlockDragHandleOptions {
  /** 拖拽柄渲染延迟（ms），默认 200 */
  showDelay: number;
  /** 拖拽柄隐藏延迟（ms），默认 400 */
  hideDelay: number;
  /** 启用节点位置缓存的节点数阈值，默认 500 */
  cacheThreshold: number;
  /** 是否在嵌套列表项上显示独立拖拽柄，默认 true */
  enableListItemHandle: boolean;
}
```

---

## §16 模块架构

```
src/extensions/BlockDragHandle/
├── index.ts                    # TipTap Extension 定义
├── blockDragPlugin.ts          # ProseMirror Plugin
├── blockHandleRenderer.ts      # Vue 组件挂载管理
├── blockPositionCache.ts       # 节点位置缓存
├── decorations.ts              # DragDropDecoration
├── moveBlock.ts                # 移动块命令（键盘替代）
├── types.ts                    # TypeScript 类型
├── BlockHandleView.vue         # 拖拽柄 Vue 组件
└── __tests__/
    ├── blockDragPlugin.test.ts
    ├── moveBlock.test.ts
    └── decorations.test.ts
```

---

## §17 Source 模式与 Preview 模式行为

### 17.1 Source 模式

Source 模式使用 CodeMirror 渲染器，ProseMirror 编辑器隐藏。
BlockDragHandle 的 ProseMirror Plugin 仍处于运行状态，但：
- `BlockHandleRenderer` 检测到 `editorModeStore.currentMode === 'source'` 时设置 `visible = false`
- 不触发 dragstart

### 17.2 Preview 模式

Preview 模式为只读渲染，不运行 TipTap 编辑器。
BlockDragHandle Extension 不激活。

### 17.3 模式切换时的清理

切换模式时：
- 若拖拽正在进行，立即取消（触发 dragend 清理逻辑）
- 隐藏拖拽柄
- 清除所有装饰

---

## §18 测试矩阵

| # | 测试场景 | 期望结果 |
|---|---|---|
| T01 | 鼠标移到段落上 200ms 后 | 拖拽柄出现在段落左侧 |
| T02 | 鼠标离开段落 400ms 后 | 拖拽柄消失 |
| T03 | 拖拽段落到另一段落之前 | 段落位置交换，蓝线消失 |
| T04 | 拖拽段落到另一段落之后 | 段落位置交换 |
| T05 | 拖拽 H1 标题到文档末尾 | 标题移到末尾 |
| T06 | 拖拽代码块到引用块前 | 位置正确移动 |
| T07 | 拖拽后 Ctrl+Z | 块回到原位 |
| T08 | 拖拽中途按 Escape | 取消拖拽，块不移动 |
| T09 | Alt+ArrowUp 移动当前块 | 块与上一块交换 |
| T10 | Alt+ArrowDown 移动当前块 | 块与下一块交换 |
| T11 | 文档第一块 Alt+ArrowUp | 无响应（不越界） |
| T12 | 文档最后块 Alt+ArrowDown | 无响应（不越界） |
| T13 | 列表项拖拽到同列表另一位置 | 列表项在列表内重排 |
| T14 | 列表项拖拽到列表外 | 列表项解包为段落 |
| T15 | 整个列表拖拽 | 整个列表（含所有项）移动 |
| T16 | Source 模式下鼠标移到块上 | 拖拽柄不显示 |
| T17 | Preview 模式下 | 拖拽柄不显示 |
| T18 | 1000 节点文档拖拽 | 30fps 以上，无卡顿 |
| T19 | 拖拽时虚影跟随鼠标 | 克隆节点显示，偏移 (8,8) |
| T20 | 拖拽柄 hover 样式 | 颜色变深，背景圆角出现 |

---

## §19 验收标准

1. 所有支持块类型均在光标悬停时显示拖拽柄，位置正确（左侧 -28px，垂直居中）。
2. 拖拽成功后块位置正确更新，原位置清空。
3. 蓝色插入线在拖拽过程中准确指示放置位置。
4. 拖拽后 Ctrl+Z 可完整撤销，恢复原排序。
5. Alt+↑/↓ 可将当前块上下移动，效果与拖拽一致。
6. Source 模式和 Preview 模式下不显示拖拽柄。
7. 1000 节点文档拖拽流畅，无明显卡顿（30fps 以上）。
