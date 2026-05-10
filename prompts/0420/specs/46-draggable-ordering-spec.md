---
id: 46-draggable-ordering-spec
title: BlockDragHandle — 块级拖拽排序规范
version: 1.0.0
status: draft
created: 2026-04-21
source_decisions:
  - E-03=D（块级 + 列表项拖拽 + 蓝色插入线 + 视觉"带文本走"）
  - S-02=A（FileManager 文章/分类拖拽排序，order 字段）
related_specs:
  - 38-toc-system-spec.md
  - 35-split-view-spec.md
---

# BlockDragHandle — 块级拖拽排序规范

## 1. 概述与设计意图

块级拖拽排序（BlockDragHandle）允许用户通过拖拽方式重新排列文档中的块级节点（段落、标题、列表、代码块、表格、引用块、Callout 等）。

核心 UX 要求（来自 E-03=D 补充）：

> "拖拽视觉设计应当是带着文本走的感觉"

这意味着拖拽期间被拖拽的块内容（文本）应**可见地跟随鼠标**，而非仅显示空白占位符。效果类似 Notion 的"真实内容虚影跟随"而非 HTML5 默认的透明截图。

设计哲学：**拖拽是结构操作，必须有充分的视觉反馈和撤销保障**。用户应能清楚看到"将要把哪个块移到哪里"，以及"操作是否可以撤销"。

---

## 2. 可拖拽的块级节点类型

| 节点类型 | TipTap 节点名 | 可拖拽 | 备注 |
|---------|-------------|--------|------|
| 段落 | `paragraph` | 是 | 最基础的可拖拽单元 |
| 标题 H1~H6 | `heading` | 是 | 拖拽含其关联内容（见第 5 节） |
| 无序列表 | `bulletList` | 是 | 整体列表可拖拽 |
| 有序列表 | `orderedList` | 是 | 整体列表可拖拽 |
| 列表项 | `listItem` | 是 | 列表内部项拖拽（见第 6 节） |
| 代码块 | `codeBlock` | 是 | |
| 表格 | `table` | 是 | 整体表格拖拽 |
| 引用块 | `blockquote` | 是 | |
| 图片 | `image` | 是 | |
| 水平分割线 | `horizontalRule` | 是 | |
| TOC 宏节点 | `tocMacro` | 是 | atom 节点，整体移动 |
| 数学公式块 | `mathBlock` | 是 | |

不可拖拽的节点：任何行内节点（`text`、`bold`、`link` 等）。

---

## 3. 拖拽柄（Drag Handle）

### 3.1 视觉规格

| 属性 | 值 |
|------|----|
| 图标 | `GripVertical`（lucide-vue-next），16px × 16px |
| 颜色 | `var(--color-text-quaternary)`，hover 时 `var(--color-text-secondary)` |
| 位置 | 块级节点左侧边缘外 -24px（相对节点左边界） |
| 触发区域 | 实际可点击区域 24px × 24px（图标比点击区小，增大易用性） |

### 3.2 显示/隐藏时机

| 状态 | 延迟 | 行为 |
|------|------|------|
| 鼠标移入块区域 | 200ms 延迟 | 拖拽柄淡入（`opacity 0 → 1`，150ms ease） |
| 鼠标移出块区域 | 400ms 延迟 | 拖拽柄淡出（`opacity 1 → 0`，200ms ease） |
| 拖拽进行中 | 即时 | 全局禁用所有 hover 触发（避免其他柄闪烁） |
| 编辑器失焦 | 即时 | 所有拖拽柄立即隐藏 |

延迟的目的：用户鼠标经过时不频繁闪烁，悬停意图明确后才显示。

### 3.3 拖拽柄实现方式

拖拽柄通过 TipTap 的 NodeView 插件注入，使用 `Decoration` API 在每个块级节点外部渲染一个浮动 DOM 元素：

```typescript
const BlockDragHandlePlugin = (options: BlockDragHandleOptions) => {
  return new Plugin({
    props: {
      decorations(state) {
        // 遍历文档，为每个顶层块级节点创建 WidgetDecoration
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (isTopLevelBlock(node)) {
            decorations.push(
              Decoration.widget(pos, () => createDragHandle(pos, options), {
                side: -1, // 插入到节点之前
                key: `drag-handle-${pos}`,
              })
            );
          }
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
};
```

---

## 4. 拖拽交互流程

### 4.1 开始拖拽（dragstart）

1. 用户按下拖拽柄
2. 计算被拖拽节点的 ProseMirror 范围（`from`, `to`）
3. 创建拖拽虚影（见第 4.3 节）
4. 设置全局拖拽状态：`dragState.dragging = true`
5. 高亮被拖拽节点（`opacity: 0.4`）

### 4.2 拖拽进行中（dragover）

1. 计算鼠标位置对应的目标插入点（见第 4.4 节）
2. 更新插入指示线位置
3. 更新 `dragState.targetPos`

### 4.3 拖拽虚影（Ghost）

不使用 HTML5 默认截图虚影，而是创建**自定义 Clone 元素**：

```typescript
function createDragGhost(nodeEl: HTMLElement): HTMLElement {
  const ghost = nodeEl.cloneNode(true) as HTMLElement;
  ghost.style.cssText = `
    position: fixed;
    pointer-events: none;
    opacity: 0.85;
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    max-width: ${nodeEl.offsetWidth}px;
    padding: 8px 12px;
    z-index: 9999;
    transform: rotate(1deg);  /* 轻微倾斜增加"提起"感 */
  `;
  document.body.appendChild(ghost);
  return ghost;
}
```

ghost 元素随 `mousemove` 事件更新位置（`ghost.style.left/top = mouseX/Y`），产生"带着文本走"的视觉效果。

虚影文本内容来自被拖拽节点的实际 DOM 内容（`cloneNode(true)`），保留原始文本和基础格式。

### 4.4 插入目标计算

鼠标 Y 坐标与每个块级节点中线对比：

```typescript
function findInsertTarget(
  mouseY: number,
  blocks: Array<{ pos: number; rect: DOMRect }>
): { pos: number; insertBefore: boolean } {
  for (const block of blocks) {
    const midY = block.rect.top + block.rect.height / 2;
    if (mouseY < midY) {
      return { pos: block.pos, insertBefore: true };
    }
  }
  // 所有块的中线都在鼠标上方 → 插入到末尾
  return { pos: blocks[blocks.length - 1].pos + 1, insertBefore: false };
}
```

### 4.5 插入指示线

在目标插入位置渲染 2px 蓝色水平线：

```css
.block-drag-insert-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-brand-primary);
  border-radius: 1px;
  pointer-events: none;
  z-index: 100;
  transition: top 50ms ease;
}
```

指示线在 dragover 期间随鼠标位置平滑移动（50ms 过渡避免跳动感）。

### 4.6 松手（drop）

1. 移除拖拽虚影
2. 移除插入指示线
3. 执行 ProseMirror 事务（见第 4.7 节）
4. 清除全局拖拽状态

### 4.7 ProseMirror 事务

```typescript
function moveBlock(
  editor: Editor,
  fromPos: number,
  toPos: number,
  insertBefore: boolean
): void {
  const { state, dispatch } = editor.view;
  const { tr, doc } = state;

  // 获取源节点范围
  const from = fromPos;
  const to = from + doc.nodeAt(from)!.nodeSize;
  const slice = tr.doc.slice(from, to);

  // 计算调整后的目标位置
  let target = insertBefore ? toPos : toPos + doc.nodeAt(toPos)!.nodeSize;

  // 如果 target > from，需要补偿删除导致的位置偏移
  if (target > to) {
    target -= (to - from);
  }

  tr.delete(from, to);
  tr.insert(target, slice.content);

  // 保留当前选区（或将光标移至拖拽节点新位置）
  dispatch(tr);
}
```

---

## 5. 标题节点拖拽规则

### 5.1 拖拽范围

拖拽标题节点时，移动的是该标题及其**关联内容**（直到下一个同级或更高级标题为止的所有内容）。

例如：拖拽 H2 时，移动 H2 + 其下所有段落、H3、代码块，直到下一个 H2 或 H1 之前。

```typescript
function getHeadingSectionRange(doc: ProseMirrorNode, headingPos: number): { from: number; to: number } {
  const heading = doc.nodeAt(headingPos)!;
  const headingLevel = heading.attrs.level as number;
  let pos = headingPos + heading.nodeSize;

  while (pos < doc.content.size) {
    const node = doc.nodeAt(pos);
    if (!node) break;
    if (node.type.name === 'heading' && node.attrs.level <= headingLevel) break;
    pos += node.nodeSize;
  }

  return { from: headingPos, to: pos };
}
```

### 5.2 标题拖拽限制

- H1 只能在 H1 之间拖拽（顶层排序）
- H2 只能在同一 H1 章节内的 H2 之间拖拽
- 不允许将 H2 拖出其所属 H1 章节（破坏文档层级结构）
- 违反限制时插入线不显示，松手无效果，Toast 提示："标题只能在同级章节内移动"

---

## 6. 列表项拖拽

### 6.1 列表内排序

列表项（`listItem`）可在同一列表内拖拽重排：

- 拖拽柄出现在每个 `listItem` 的左侧
- 插入线显示在列表项之间
- 执行 ProseMirror 事务移动 `listItem` 节点

### 6.2 跨列表限制

不允许跨列表拖拽（例如从一个 `bulletList` 拖到另一个 `bulletList`）。违反时：松手无效，Toast 提示："列表项只能在同一列表内移动"。

### 6.3 嵌套列表规则

嵌套列表项只能在其所在层级内拖拽，不允许改变嵌套深度（改变嵌套深度请使用 Tab / Shift+Tab）。

---

## 7. 键盘替代操作

无法使用鼠标时，提供键盘方式移动当前光标所在块：

| 快捷键 | 行为 |
|--------|------|
| `Alt+↑` | 将当前块上移一个位置（与上方块交换） |
| `Alt+↓` | 将当前块下移一个位置（与下方块交换） |
| `Alt+Shift+↑` | 将当前块移至章节顶部（标题内） |
| `Alt+Shift+↓` | 将当前块移至章节底部（标题内） |

键盘移动同样执行 ProseMirror 事务，可撤销，光标跟随移动后的节点位置。

---

## 8. 撤销支持

拖拽重排后的 ProseMirror 事务自动加入撤销历史，`Ctrl+Z` 可完整撤销：

- 被移动的块恢复到原始位置
- 光标恢复到移动前位置

拖拽操作生成单一事务（一次 `dispatch`），撤销为原子操作（不会分步撤销内部计算过程）。

---

## 9. Markdown 输出保真

### 9.1 Round-trip 保证

拖拽重排后，文档中块级节点的 ProseMirror 节点顺序发生变化。TipTap 的 Markdown 序列化器（`Serializer`）按节点顺序输出 Markdown，因此拖拽重排后的 Markdown 源码行序与文档显示顺序一致。

### 9.2 验证要求

验收时需提供：

1. 拖拽前 Markdown 源码截图
2. 拖拽后 Markdown 源码截图
3. 两份内容对比（段落顺序变化与 UI 一致）

---

## 10. 性能要求

| 指标 | 要求 |
|------|------|
| 拖拽柄出现延迟 | 200ms（不阻塞主线程） |
| 拖拽虚影 mousemove 更新 | < 4ms/帧（requestAnimationFrame 节流） |
| 插入目标计算 | < 2ms（缓存块位置列表） |
| ProseMirror 事务执行 | < 16ms（确保不丢帧） |
| 大文档（200 个块）拖拽 | FPS ≥ 60 |

### 10.1 块位置缓存

dragover 期间频繁计算每个块的 `getBoundingClientRect()`。优化：在 dragstart 时预计算所有块位置并缓存，仅在 dragover 期间使用缓存值（不实时读取 DOM）。

---

## 11. 错误处理

| 场景 | 处理方式 |
|------|---------|
| ProseMirror 事务执行失败 | Toast 提示"移动失败，请重试"，虚影消失，无 DOM 变化 |
| 标题跨级拖拽 | 松手无效，Toast 提示限制原因 |
| 列表项跨列表拖拽 | 松手无效，Toast 提示限制原因 |
| 拖拽中按 Escape | 取消拖拽，虚影消失，恢复原状（通过 dragcancel 事件处理） |
| 拖拽到编辑器外松手 | dragend 事件处理，清理状态，无效果 |

---

## 12. 与其他系统集成

### 12.1 TOCSystem（38-toc-system-spec）

拖拽标题节点后，`HeadingParser` 在 300ms 内重新解析，`TOCSidebarPanel` 更新树状结构。

拖拽期间 TOC 高亮跟随左栏滚动位置，不受拖拽干扰。

### 12.2 SyncScroll（39-sync-scroll-spec）

拖拽完成后，`AnchorRegistry` 因文档结构变化而重建（debounce 300ms），SyncScroll 恢复正常同步。

拖拽期间 SyncScroll 暂停（`paused=true`），避免拖拽 DOM 变化触发误同步。

### 12.3 VersionHistory（版本历史）

拖拽重排是文档内容操作，加入版本历史（自动保存触发）。不单独生成版本点（非批量命令，使用普通自动保存即可）。

---

## 13. 组件文件结构

```
src/editor/extensions/
├── block-drag-handle/
│   ├── BlockDragHandleExtension.ts   # TipTap 扩展入口
│   ├── BlockDragHandlePlugin.ts      # ProseMirror 插件（Decoration 注入）
│   ├── DragHandle.vue                # 拖拽柄 Vue 组件
│   ├── DragGhost.ts                  # 虚影创建与更新
│   ├── InsertLine.vue                # 插入指示线
│   ├── DragState.ts                  # 全局拖拽状态管理
│   └── block-move.ts                 # ProseMirror 事务：移动块

src/composables/
└── useBlockKeyboardMove.ts           # Alt+↑/↓ 键盘快捷键逻辑
```

---

## 14. 测试矩阵

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 1 | 鼠标悬停段落 200ms | 拖拽柄淡入出现 | P0 |
| 2 | 鼠标离开段落 400ms | 拖拽柄淡出消失 | P1 |
| 3 | 拖拽段落到另一段落上方 | 虚影跟随鼠标，插入线出现 | P0 |
| 4 | 松手后段落顺序变化 | 文档内容重排，Ctrl+Z 可撤销 | P0 |
| 5 | 撤销拖拽重排 | 段落恢复原位，光标恢复 | P0 |
| 6 | 拖拽期间按 Escape | 取消拖拽，无文档变化 | P1 |
| 7 | 拖拽 H2 标题 | 移动 H2 + 其下所有内容 | P0 |
| 8 | 拖拽 H2 跨 H1 边界 | 拒绝操作，Toast 提示 | P0 |
| 9 | 列表项在列表内拖拽 | 列表内顺序变化，Ctrl+Z 可撤销 | P0 |
| 10 | 列表项跨列表拖拽 | 拒绝操作，Toast 提示 | P0 |
| 11 | Alt+↑ 移动当前块 | 块上移，等同于拖拽 | P1 |
| 12 | Alt+↓ 移动当前块 | 块下移，等同于拖拽 | P1 |
| 13 | 拖拽代码块 | 整体移动，内容不损坏 | P0 |
| 14 | 拖拽表格 | 整体移动，表格结构不损坏 | P0 |
| 15 | 拖拽 [TOC] 宏节点 | 整体移动（atom 节点） | P1 |
| 16 | 拖拽图片节点 | 整体移动 | P0 |
| 17 | 拖拽后 Markdown 序列化 | 源码顺序与 UI 顺序一致 | P0 |
| 18 | 200 个块文档拖拽 FPS | ≥ 60fps（性能测试） | P1 |
| 19 | 暗色模式拖拽虚影样式 | 虚影背景色使用 CSS token | P1 |
| 20 | 分栏状态下拖拽 | 仅作用于左栏（主编辑区），右栏不受影响 | P1 |

---

## 15. 验收标准

- [ ] 所有 P0 测试矩阵项通过，附视频证据（展示虚影跟随效果）
- [ ] 标题拖拽章节整体移动验证（附前后 Markdown 对比截图）
- [ ] 列表项拖拽验证（附操作视频）
- [ ] Ctrl+Z 撤销验证（附视频）
- [ ] 200 块文档性能测试（FPS 截图）
- [ ] 暗色模式截图无硬编码色值

---

*本文档生成于 2026-04-21，依据 E-03=D 决策及 InkForge Ethereal Constructivism 设计语汇。*

---

## 16. 国际化（i18n）文本 key

| Key | 中文值 |
|-----|--------|
| `blockDrag.headingCrossLevel` | 标题只能在同级章节内移动 |
| `blockDrag.listCrossContainer` | 列表项只能在同一列表内移动 |
| `blockDrag.moveFailed` | 移动失败，请重试 |

---

## 17. FileManager 拖拽排序（S-02=A）

本规范同时覆盖 S-02 要求的 FileManager 文章/分类拖拽排序。

### 17.1 排序目标

FileManager 支持拖拽排序的对象：

| 对象类型 | 排序范围 |
|---------|---------|
| 文章（article） | 同一分类下的文章列表内排序 |
| 分类（category） | 同级分类列表内排序 |

不支持：文章拖出分类（跨分类移动通过右键菜单完成）。

### 17.2 order 字段

数据库 `articles` 和 `categories` 表均新增 `order: number` 字段（浮点数，支持在两项之间插入不需重写全部 order 值）：

```typescript
// 在 item1(order=1.0) 和 item2(order=2.0) 之间插入：
const newOrder = (item1.order + item2.order) / 2; // = 1.5
```

若精度不足（order 差值 < 0.001），触发一次全量重编号（将 order 从 1.0 开始以 1.0 步长重写所有项）。

### 17.3 FileManager 拖拽实现

使用 `@vueuse/integrations/useDraggable` 或 `vue-draggable-next`（依赖 sortablejs）。

拖拽结束后：
1. 计算新 order 值
2. 更新 IndexedDB 对应记录
3. 触发 `fileManagerStore.reorderItem(id, newOrder)`

### 17.4 FileManager 插入线规格

与编辑器内块级拖拽一致：2px 品牌色水平线，出现在目标位置上方或下方。

---

## 18. 拖拽系统的 TypeScript 类型定义

```typescript
// 拖拽目标类型
type DragTargetType = 'block' | 'listItem' | 'fileManagerItem';

// 拖拽状态（全局单例，同一时刻只有一个拖拽进行）
interface BlockDragState {
  isDragging: boolean;
  targetType: DragTargetType | null;
  sourcePos: number | null;          // 编辑器内：ProseMirror 节点位置
  sourceId: string | null;           // FileManager：文章/分类 ID
  ghostEl: HTMLElement | null;       // 虚影 DOM 元素
  insertLineEl: HTMLElement | null;  // 插入线 DOM 元素
  targetPos: number | null;          // 当前目标位置
  insertBefore: boolean;             // 插入到目标之前或之后
}

// 可拖拽块描述符
interface DraggableBlock {
  pos: number;           // ProseMirror 文档位置
  nodeType: string;      // 节点类型名
  rect: DOMRect;         // 块的 DOM 边界
}
```

---

## 19. 实现优先级

### Phase 1（核心功能）

- 段落、标题的拖拽柄出现/消失
- 拖拽虚影（clone ghost）
- 水平插入指示线
- 段落排序（ProseMirror 事务）
- Alt+↑/↓ 键盘替代

### Phase 2（完整功能）

- 标题章节整体拖拽（含 heading section range）
- 列表项内部排序
- 代码块、表格、引用块、图片的拖拽柄
- FileManager 文章/分类拖拽排序

### Phase 3（细化）

- TOCMacro 原子节点拖拽
- 拖拽至编辑器边界时的自动滚动
- 拖拽嵌套列表项（深度规则）
- 大文档（200 块）性能优化（块位置缓存）

---

## 20. 补充测试矩阵（Phase 2/3）

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 21 | 拖拽段落到文档最顶部 | 段落成为第一个节点 | P1 |
| 22 | 拖拽段落到文档最底部 | 段落成为最后一个节点 | P1 |
| 23 | 含图片的段落拖拽 | 段落 + 图片整体移动，图片不丢失 | P1 |
| 24 | 引用块内的段落拖拽 | 引用块内顺序变化（不跨出引用块） | P2 |
| 25 | FileManager 文章拖拽排序 | order 字段更新，列表顺序刷新 | P1 |
| 26 | FileManager 分类拖拽排序 | 分类 order 更新，导航树顺序刷新 | P1 |
| 27 | order 精度不足时重编号 | 全量重编号执行，无用户感知（后台） | P2 |
| 28 | 拖拽到编辑器底部边界 | 编辑器自动向下滚动 | P2 |
| 29 | 拖拽期间触发自动保存 | 自动保存等待拖拽结束后执行（不并发） | P1 |
| 30 | 从 FileManager 拖到编辑器 | 不支持（两个拖拽系统独立，不交叉） | P1 |

---

## 21. 已知约束与技术债务

### 21.1 自定义虚影与 HTML5 dataTransfer 兼容性

使用自定义 Clone Ghost（非 HTML5 setDragImage）时，必须调用 `event.dataTransfer.setDragImage(transparentImg, 0, 0)` 抑制系统默认截图虚影：

```typescript
const transparentImg = new Image();
transparentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
event.dataTransfer.setDragImage(transparentImg, 0, 0);
```

此技术在 Chrome / Edge / Firefox 上均测试通过，Safari 需额外处理（Safari 不支持完全透明的 setDragImage，可用 opacity=0.01 的微透明图片）。

### 21.2 ProseMirror 大型事务性能

移动标题章节时（headingSectionRange 可能包含数百个节点），ProseMirror 事务会触发整个文档的重新渲染。对于 50k 字以上的文档，此操作可能造成 30~50ms 的 jank。

优化方向（v2.2）：使用 `tr.replaceRangeWith` 替代 `delete + insert` 组合，减少 DOM 操作次数。

### 21.3 列表项嵌套拖拽的 UX 模糊性

当前规范禁止跨层级拖拽改变嵌套深度（改变深度必须用 Tab/Shift+Tab）。这与某些用户预期（Notion 风格：拖拽可改变嵌套级别）不同。

若用户反馈强烈，v2.2 可考虑支持跨层级拖拽：鼠标 X 位置决定嵌套深度，Y 位置决定排序位置（参考 Notion 实现）。

---

## 22. 自动滚动（边界拖拽）

### 22.1 触发条件

拖拽时，若鼠标接近编辑器滚动容器的顶部或底部边界（距边缘 60px 内），触发自动滚动：

```typescript
function startAutoScroll(mouseY: number, container: HTMLElement): void {
  const rect = container.getBoundingClientRect();
  const nearTop = mouseY - rect.top < 60;
  const nearBottom = rect.bottom - mouseY < 60;

  if (nearTop) {
    container.scrollTop -= 8; // 每帧向上 8px
  } else if (nearBottom) {
    container.scrollTop += 8; // 每帧向下 8px
  }
}
```

自动滚动通过 `requestAnimationFrame` 循环执行，直到鼠标离开边界区域或拖拽结束。

### 22.2 速度调整

距边界越近，滚动速度越快（线性映射，最近 10px 时 ×3 速度，60px 处 ×1 速度）。

---

## 23. 与 CommandPalette（EX-03）的集成

块级移动操作注册为命令：

| 命令 ID | 名称 |
|---------|------|
| `block.moveUp` | 上移当前块 |
| `block.moveDown` | 下移当前块 |
| `block.moveToSectionTop` | 移至章节顶部 |
| `block.moveToSectionBottom` | 移至章节底部 |
