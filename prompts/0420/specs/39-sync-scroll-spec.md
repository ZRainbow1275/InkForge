---
id: 39-sync-scroll-spec
title: SyncScroll — 分栏同步滚动规范
version: 1.0.0
status: baseline-implemented
created: 2026-04-21
source_decisions:
  - W-04=D（双向同步滚动 + 可临时解除）
  - W-06=D（分屏参考，Preview 模式下默认同步）
related_specs:
  - 35-split-view-spec.md
  - 38-toc-system-spec.md
---

# SyncScroll — 分栏同步滚动规范

## 1. 概述与设计意图

分栏同步滚动（SyncScroll）在编辑器左栏与右栏 Preview 之间建立双向滚动联动。核心挑战是：

- 左侧 Markdown/TipTap 内容与右侧 HTML 渲染内容**高度不一致**（标题、图片、代码块等渲染高度不同）
- 必须保证滚动联动的**语义准确性**（读者看到"相同的内容段落"），而非简单的像素比例映射
- 大文档（50k+ 字）下必须保持**流畅性**（60fps），不阻塞主线程

为此，采用**段落锚点策略**而非像素比例策略。

---

## 2. 核心算法：段落锚点策略

### 2.1 锚点定义

锚点（Anchor）是文档中语义明确的位置标记，首选使用 **heading 节点**，次选使用**块级节点边界**：

```typescript
interface ScrollAnchor {
  id: string;           // DOM id（与 TOCStore 的 domId 对应）
  pos: number;          // ProseMirror 文档位置
  leftDomEl: Element;   // 左栏对应 DOM 元素
  rightDomEl: Element;  // 右栏对应 DOM 元素（渲染结果）
}
```

锚点列表由 `AnchorRegistry` 维护，在文档更新（debounce 300ms）后重新构建。

### 2.2 锚点收集

```typescript
class AnchorRegistry {
  private anchors: ScrollAnchor[] = [];

  rebuild(editor: Editor, previewContainer: HTMLElement): void {
    this.anchors = [];
    // 遍历 TipTap 文档，找所有 heading 节点
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const domId = generateHeadingId(node.textContent, pos);
        const leftEl = editor.view.nodeDOM(pos) as Element;
        const rightEl = previewContainer.querySelector(`#${domId}`);
        if (leftEl && rightEl) {
          this.anchors.push({ id: domId, pos, leftDomEl: leftEl, rightDomEl: rightEl });
        }
      }
    });
  }

  findNearestAbove(scrollTop: number, container: HTMLElement, side: 'left' | 'right'): ScrollAnchor | null {
    // 找最近的在 scrollTop 以上的锚点
    const containerTop = container.getBoundingClientRect().top;
    let best: ScrollAnchor | null = null;
    for (const anchor of this.anchors) {
      const el = side === 'left' ? anchor.leftDomEl : anchor.rightDomEl;
      const elTop = el.getBoundingClientRect().top - containerTop + container.scrollTop;
      if (elTop <= scrollTop + 1) { // +1 px 容差
        best = anchor;
      }
    }
    return best;
  }
}
```

### 2.3 滚动同步逻辑（左 → 右）

```typescript
function syncLeftToRight(
  leftContainer: HTMLElement,
  rightContainer: HTMLElement,
  registry: AnchorRegistry
): void {
  const scrollTop = leftContainer.scrollTop;
  const scrollHeight = leftContainer.scrollHeight - leftContainer.clientHeight;

  // 边界：文档头
  if (scrollTop <= 0) {
    rightContainer.scrollTop = 0;
    return;
  }
  // 边界：文档尾
  if (scrollTop >= scrollHeight - 2) {
    rightContainer.scrollTop = rightContainer.scrollHeight - rightContainer.clientHeight;
    return;
  }

  // 找最近锚点
  const anchor = registry.findNearestAbove(scrollTop, leftContainer, 'left');
  if (!anchor) {
    // 无锚点：退化为比例映射
    const ratio = scrollTop / scrollHeight;
    rightContainer.scrollTop = ratio * (rightContainer.scrollHeight - rightContainer.clientHeight);
    return;
  }

  // 计算锚点在左栏的偏移
  const anchorLeftTop = getElementScrollOffset(anchor.leftDomEl, leftContainer);
  const distFromAnchor = scrollTop - anchorLeftTop;

  // 找下一个锚点
  const nextAnchor = registry.findNextAnchor(anchor, 'left');
  if (nextAnchor) {
    // 在两锚点间线性插值
    const leftSection = getElementScrollOffset(nextAnchor.leftDomEl, leftContainer) - anchorLeftTop;
    const rightSection = getElementScrollOffset(nextAnchor.rightDomEl, rightContainer)
                         - getElementScrollOffset(anchor.rightDomEl, rightContainer);
    const progress = leftSection > 0 ? distFromAnchor / leftSection : 0;
    const targetRightTop = getElementScrollOffset(anchor.rightDomEl, rightContainer) + progress * rightSection;
    rightContainer.scrollTop = targetRightTop;
  } else {
    // 最后一个锚点后：比例填充尾部
    const anchorRightTop = getElementScrollOffset(anchor.rightDomEl, rightContainer);
    const leftRemain = scrollHeight - anchorLeftTop;
    const rightRemain = rightContainer.scrollHeight - rightContainer.clientHeight - anchorRightTop;
    const progress = leftRemain > 0 ? distFromAnchor / leftRemain : 0;
    rightContainer.scrollTop = anchorRightTop + progress * rightRemain;
  }
}
```

### 2.4 双向同步（右 → 左）

右侧滚动同步到左侧采用对称逻辑（`syncRightToLeft`），以右侧锚点为基准，反向映射到左侧位置。

---

## 3. 防循环机制

双向同步存在循环触发风险（左滚触发右滚，右滚再触发左滚）。使用 flag 防循环：

```typescript
class SyncScrollController {
  private isSyncingLeft = false;
  private isSyncingRight = false;

  onLeftScroll(): void {
    if (this.isSyncingRight) return; // 正在右→左同步，忽略
    this.isSyncingLeft = true;
    requestAnimationFrame(() => {
      syncLeftToRight(this.leftEl, this.rightEl, this.registry);
      // 16ms 后清除 flag（确保右侧 scroll 事件已触发）
      setTimeout(() => { this.isSyncingLeft = false; }, 16);
    });
  }

  onRightScroll(): void {
    if (this.isSyncingLeft) return; // 正在左→右同步，忽略
    this.isSyncingRight = true;
    requestAnimationFrame(() => {
      syncRightToLeft(this.leftEl, this.rightEl, this.registry);
      setTimeout(() => { this.isSyncingRight = false; }, 16);
    });
  }
}
```

### 3.1 无限循环检测

若检测到循环（连续 5 次交替触发，时间窗口 100ms 内），自动禁用同步滚动并 Toast 警告：

```typescript
function detectScrollLoop(history: number[], now: number): boolean {
  if (history.length < 5) return false;
  const span = now - history[0];
  return span < 100; // 100ms 内 5 次
}
```

---

## 4. 防抖与帧率控制

### 4.1 防抖策略

scroll 事件触发频率极高（每像素一次）。使用 `requestAnimationFrame` 节流：

```typescript
let rafId: number | null = null;

function onScroll(): void {
  if (rafId !== null) return; // 已有待执行的 RAF，忽略
  rafId = requestAnimationFrame(() => {
    performSync();
    rafId = null;
  });
}
```

等效于：每帧最多同步一次（16.67ms，60fps），避免频繁计算拖慢主线程。

### 4.2 滚动结束检测

滚动结束后（200ms 无新 scroll 事件），执行一次**精确对齐**（忽略防抖，确保最终位置准确）：

```typescript
let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;

function onScroll(): void {
  if (scrollEndTimer) clearTimeout(scrollEndTimer);
  scrollEndTimer = setTimeout(() => {
    performSync(); // 精确对齐
  }, 200);
  // ... RAF 节流
}
```

---

## 5. 图片懒加载兼容

### 5.1 问题描述

右栏 Preview 中图片懒加载时，图片尺寸未知（默认高度 0 或占位高度），导致锚点偏移计算错误。

### 5.2 解决方案

使用 `ResizeObserver` 监听右栏中所有图片元素，一旦尺寸变化触发锚点注册表重建：

```typescript
const imageObserver = new ResizeObserver(() => {
  // 节流：300ms 内只重建一次
  debouncedRebuildAnchors();
});

previewContainer.querySelectorAll('img').forEach(img => {
  imageObserver.observe(img);
});
```

重建期间（异步）暂停同步滚动（设置 `paused` flag），重建完成后恢复。

### 5.3 图片高度估算

重建完成前，若必须滚动同步，对未加载图片使用**估算高度**（默认 200px，或图片 `data-height` 属性值）。

---

## 6. 大文档性能优化（50k+ 字）

### 6.1 问题描述

50k 字以上文档锚点数量可能超过 100 个，同时左右栏 DOM 节点数量大，`getBoundingClientRect()` 调用昂贵。

### 6.2 虚拟高度映射

对大文档（锚点 > 50 个），预计算所有锚点的滚动偏移量，缓存为数组：

```typescript
interface AnchorOffset {
  id: string;
  leftOffset: number;   // 相对左栏滚动容器顶部的偏移（像素）
  rightOffset: number;  // 相对右栏滚动容器顶部的偏移（像素）
}

// 预计算（文档更新时或布局变化时重算）
function precomputeOffsets(
  anchors: ScrollAnchor[],
  leftContainer: HTMLElement,
  rightContainer: HTMLElement
): AnchorOffset[] {
  return anchors.map(a => ({
    id: a.id,
    leftOffset: getElementScrollOffset(a.leftDomEl, leftContainer),
    rightOffset: getElementScrollOffset(a.rightDomEl, rightContainer),
  }));
}
```

同步时使用缓存偏移量（O(log n) 二分查找），避免实时 DOM 查询。

缓存失效时机：文档内容更新、布局变化（窗口 resize、面板宽度调整）。

### 6.3 Web Worker 不适用

同步滚动必须在主线程完成（依赖 DOM 位置查询），因此不使用 Worker。通过 RAF 节流保证主线程不阻塞。

---

## 7. 同步滚动开关

### 7.1 开关位置

右栏工具栏的同步滚动图标（`Link` / `LinkOff`，lucide-vue-next）：

- 开启：`Link` 图标，tooltip "点击暂停同步滚动"
- 关闭：`LinkOff` 图标，tooltip "点击开启同步滚动"

### 7.2 开关行为

- 关闭时：移除 scroll 事件监听器，双侧完全独立滚动
- 开启时：重新注册监听，触发一次从左侧到右侧的单次同步（对齐当前位置）

### 7.3 状态持久化

`layoutSplitView.syncScrollEnabled` 持久化（见 35-split-view-spec.md），账户级。

---

## 8. 与 TOCSystem 集成

SyncScroll 使用 TOCStore 提供的锚点数据（`HeadingNode.domId`），避免重复解析：

```typescript
// AnchorRegistry 初始化时直接读取 TOCStore
const anchors = tocStore.headings.map(h => ({
  id: h.domId,
  pos: h.pos,
  leftDomEl: document.getElementById(`editor-${h.domId}`),
  rightDomEl: previewContainer.querySelector(`#${h.domId}`),
}));
```

TOCStore 更新时，AnchorRegistry 同步重建（响应式依赖）。

---

## 9. 文件结构

```
src/services/sync-scroll/
├── SyncScrollController.ts      # 主控制器（双向绑定、flag 管理）
├── AnchorRegistry.ts            # 锚点注册表（构建、查找、预计算）
├── scroll-algorithms.ts         # syncLeftToRight / syncRightToLeft 纯函数
├── loop-detector.ts             # 循环检测器
└── image-observer.ts            # 图片懒加载监听器

src/composables/
└── useSyncScroll.ts             # Vue 组合式函数（生命周期管理）
```

---

## 10. 测试矩阵

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 1 | 左栏向下滚动 100px | 右栏滚动到语义对应位置（不是 100px） | P0 |
| 2 | 左栏滚动到文档顶部 | 右栏也定位到顶部 | P0 |
| 3 | 左栏滚动到文档底部 | 右栏也定位到底部 | P0 |
| 4 | 右栏向下滚动 | 左栏反向同步（双向验证） | P0 |
| 5 | 同步滚动开关关闭 | 左右独立，不联动 | P0 |
| 6 | 关闭后重新开启 | 触发单次对齐，之后恢复联动 | P1 |
| 7 | 文档更新（新增标题） | 300ms 后锚点重建，同步仍正确 | P0 |
| 8 | 含未加载图片时左栏滚动 | 不因图片高度未知崩溃，使用估算高度 | P1 |
| 9 | 图片加载完成后 | 锚点重建，同步精度提升 | P1 |
| 10 | 50k 字文档（100+ 锚点）滚动 | FPS ≥ 60，无卡顿 | P0 |
| 11 | 快速连续滚动（鼠标滚轮疾速） | RAF 节流生效，不丢帧 | P0 |
| 12 | 触发循环检测场景 | 自动禁用，Toast 警告 | P1 |
| 13 | 分栏关闭后重新打开 | 同步滚动状态根据持久化设置恢复 | P1 |
| 14 | 无标题文档（无锚点） | 退化为像素比例映射，不崩溃 | P1 |
| 15 | 窗口 resize 后 | 预计算偏移量重建，同步仍正确 | P1 |

---

## 11. 性能要求

| 指标 | 要求 |
|------|------|
| 单次同步计算时间 | < 2ms（预计算缓存路径） |
| scroll 事件响应 | 通过 RAF 节流，每帧最多一次 |
| 50k 字锚点重建时间 | < 50ms（可接受一次 jank） |
| 循环检测开销 | < 0.1ms（固定大小环形缓冲区） |

---

## 12. 边界条件汇总

1. 左右栏高度差极大（左栏 1000px 内容，右栏 5000px 渲染）：算法通过锚点间插值处理，不依赖总高度比
2. 文档内容全为代码块（无 heading）：退化为像素比例映射
3. 两个锚点位置重合（heading 紧邻）：插值区间为 0，直接定位到锚点位置
4. SyncScroll 在 iframe 内运行（某些预览实现）：需 postMessage 通信，当前规范假设同域 DOM
5. 快速切换 Tab 时同步滚动状态：每次 Tab 切换重新初始化 SyncScrollController，避免跨文档状态污染

---

*本文档生成于 2026-04-21，依据 W-04=D 决策。*

---

## 13. CSS 与视觉层面的注意事项

### 13.1 scroll-behavior 干扰

若父容器设置了 `scroll-behavior: smooth`，通过 `scrollTop =` 直接赋值时仍会触发平滑过渡，导致同步滚动期间出现延迟感。

解决方式：在 SyncScrollController 执行同步赋值前，临时将容器 `scroll-behavior` 设为 `auto`，赋值后恢复：

```typescript
function setScrollTopImmediate(el: HTMLElement, value: number): void {
  const prev = el.style.scrollBehavior;
  el.style.scrollBehavior = 'auto';
  el.scrollTop = value;
  el.style.scrollBehavior = prev;
}
```

### 13.2 transform 导致的 getBoundingClientRect 偏差

若编辑器容器有 CSS `transform`（如缩放动画），`getBoundingClientRect()` 返回的坐标会包含 transform 影响，但 `scrollTop` 不受影响，导致偏移计算错误。

解决方式：在预计算锚点偏移时，使用 `offsetTop` 沿父链累加（避免 getBoundingClientRect），或在 transform 动画期间暂停 SyncScroll。

---

## 14. 与 VersionHistory 的集成

### 14.1 查看历史版本时的行为

用户在 VersionHistory 面板点击查看历史版本时，右栏 Preview 切换为历史版本内容。此时：

- 左栏为当前版本（可编辑），右栏为历史版本（只读）
- SyncScroll 仍可用（锚点基于左栏当前版本的 heading 定位）
- 若历史版本与当前版本 heading 结构差异大，锚点匹配降级为像素比例

### 14.2 版本 Diff 视图下的同步滚动

若右栏显示 Diff 视图（当前版本 vs 历史版本的逐行对比），SyncScroll 自动禁用（Diff 视图有自己的跳转逻辑，与同步滚动不兼容）。右栏工具栏的同步滚动图标灰化并附 tooltip："Diff 视图不支持同步滚动"。

---

## 15. 可访问性

| 要求 | 实现方式 |
|------|---------|
| 同步滚动开关 | `role="switch"`, `aria-checked`, `aria-label="同步滚动"` |
| 滚动行为通知 | `aria-live="off"`（滚动类操作不适合 live 区域播报，避免噪音） |
| 键盘操作同步 | `PageUp`/`PageDown` 在左栏触发时，右栏同步更新 |

### 15.1 键盘滚动同步

左栏获得焦点时，`PageUp`/`PageDown`/`Home`/`End` 键触发的滚动同样通过 SyncScrollController 同步到右栏（scroll 事件会在这些键操作后触发，由现有 RAF 节流处理）。

---

## 16. 实现优先级

### Phase 1（核心，必须随 SplitView 一起交付）

- AnchorRegistry 基础版（仅使用 heading 锚点）
- syncLeftToRight 和 syncRightToLeft 基础算法
- RAF 节流
- 防循环 flag

### Phase 2（完整功能）

- 大文档预计算偏移量缓存
- 图片懒加载兼容（ResizeObserver）
- 循环检测自动禁用

### Phase 3（优化）

- TOCStore 锚点共享（避免重复 DOM 查询）
- `scroll-behavior` 干扰修复
- 性能 benchmark（50k 字文档 FPS 报告）

---

## 17. 国际化（i18n）文本 key

| Key | 中文值 |
|-----|--------|
| `syncScroll.loopDetected` | 同步滚动检测到异常，已自动暂停 |
| `syncScroll.enable` | 开启同步滚动 |
| `syncScroll.disable` | 暂停同步滚动 |

---

## 18. 已知约束与技术债务

### 18.1 iframe 预览不支持

若右栏 PreviewRenderer 改为 iframe 实现（某些安全沙箱要求），SyncScroll 无法直接读取 iframe 内的 DOM 位置，需要通过 `postMessage` 传递锚点偏移量。当前规范假设同域 DOM，iframe 支持标记为 v2.2 候选。

### 18.2 heading 稀疏文档的退化质量

若文档有大量无 heading 的内容（例如长段落、大量代码块），锚点稀疏，段落间的像素比例退化准确性差。

改善方案：在无 heading 区域使用**段落节点**（`paragraph`）作为次级锚点，增加锚点密度。此优化需要修改 AnchorRegistry 的构建逻辑，标记为 v2.2 优化项。

### 18.3 MathJax / KaTeX 渲染高度

公式渲染（KaTeX）在首次渲染时高度可能发生变化（从行内换为块级），与图片懒加载问题类似，需要 ResizeObserver 监听并触发锚点重建。

---

## 2026-05-02 Baseline Implementation Note

Baseline status: implemented for the compatible Workstation SplitView SyncScroll vertical slice; full Spec 39 remains partially pending.

Implemented baseline:

- `src/services/sync-scroll/*` adds typed anchor offsets, DOM offset helpers, anchor registry, bidirectional interpolation algorithms, loop detection, immediate `scrollTop` assignment, and ResizeObserver-backed rebuild scheduling.
- `src/composables/useSyncScroll.ts` owns real listener lifecycle, RAF throttling, anchor rebuild scheduling, observer cleanup, bidirectional loop prevention, and one-shot left-to-right alignment after re-enable.
- `WorkstationView` now wires SplitView sync to the real `EditorPanel` scroll element and the real split preview content scroll element instead of relying on the previous wrapper-level percentage-only sync.
- `EditorPanel` exposes `getEditorScrollElement()` so Workstation can bind to the actual `.editor-scroll` container without DOM guessing.
- Sync anchors are refreshed from `useTocStore.updateFromEditor(editor)` and matched to rendered Markdown heading ids from the existing `MarkdownPreview` output.
- The persisted `splitViewSyncScroll` opt-out remains intact; when disabled, no sync listener path performs target scrolling.
- The right preview CSS now makes `.split-preview-content` the single scroll owner for SplitView and lets nested `MarkdownPreview` render as non-nested scroll content.

Validation evidence:

- `pnpm exec vitest run src/services/sync-scroll/sync-scroll.test.ts`: 1 file, 8 tests passed.
- `pnpm exec vitest run src/services/sync-scroll/sync-scroll.test.ts src/services/toc/toc.test.ts`: 2 files, 14 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 19 files and 137 tests passed.

Pending for full Spec 39 pass:

- Paragraph-level fallback anchors for heading-sparse long documents.
- Full 50k-character FPS benchmark and offset-cache performance report.
- User-facing loop-detected toast/i18n copy.
- iframe preview `postMessage` bridge.
- VersionHistory historical-preview and diff-view-specific SyncScroll policy.
- Full Playwright E2E, a11y pass, and packaged Tauri validation.

GitNexus/DeepWiki/Exa caveat:

- GitNexus impact, DeepWiki, and Exa were attempted during this baseline but returned `Transport closed`; local typecheck/lint/tests/build/browser smoke are used as the executable verification path for this task.