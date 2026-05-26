# topic-1: exit-focus-button-location

## 调查问题

精确定位 "退出专注 Esc" 按钮的 DOM 结构、父容器层级、定位策略与 CSS 数值。

## 调查方法

- `Grep` "退出专注 / exit-focus / focus-exit" in `WorkstationView.vue`
- 阅读 template 1965-2210 与 CSS 5440-5550

## 关键发现

### DOM 结构（template）

`inkforge/src/views/WorkstationView.vue:1965-1985`

```vue
<template>
  <div
    class="workstation"
    :class="{ 'focus-mode': isFocusMode, 'focus-vignette': isFocusMode && writingAssistStore.vignette.isEnabled, 'split-view-active': isSplitViewActive, [`mode-${editorMode}`]: true }"
    :style="workstationLayoutStyle"
  >
    <!-- Focus Overlay (专注模式暗角) -->
    <div class="focus-overlay" />

    <button
      v-if="isFocusMode"
      class="focus-exit-btn"
      title="退出专注模式 (Esc)"
      @click="toggleFocusMode"
    >
      <span>退出专注</span>
      <span class="focus-exit-shortcut">Esc</span>
    </button>

    <!-- ━━━ Header (52px, 对齐原型) ━━━ -->
    <header class="workstation-header">
      ...
    </header>
```

要点：
- `<button class="focus-exit-btn">` 是 `.workstation` 根 div 的**直接子节点**，与 `<header class="workstation-header">` **同级**。
- 仅当 `isFocusMode === true` 时由 `v-if` 渲染。
- 文本由两个 `<span>` 组成：`退出专注` + `Esc`（class `focus-exit-shortcut`）。
- 与 `.focus-overlay` (`<div class="focus-overlay" />` L1972) 同级且紧邻。

### CSS 样式

`inkforge/src/views/WorkstationView.vue:5486-5519`

```css
.focus-exit-btn {
  position: fixed;        /* 关键：脱离正常文档流，相对视口定位 */
  top: 18px;
  right: 20px;
  z-index: 120;           /* 高于 .workstation-header (z-index: 10) */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(38, 50, 56, 0.18);   /* 半透明深灰，截图中红色环并不出自此处 */
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  opacity: 0.3;           /* 默认 0.3 透明 */
  backdrop-filter: blur(10px);
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.focus-exit-btn:hover {
  opacity: 0.8;
  transform: translateY(-1px);
  background: rgba(38, 50, 56, 0.32);
}

.focus-exit-shortcut {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
}
```

### 关联元素

`focus-overlay` 是覆盖全屏的全局蒙层（`position: fixed; inset: 0; z-index: 50`），在 focus mode 下整体提升 opacity；它与 exit-btn 不重叠在 z 轴上（exit-btn 的 120 > overlay 的 50）。

## 结论

| 属性 | 值 |
|---|---|
| 定位策略 | `position: fixed` 相对视口 |
| 锚点 | `top: 18px; right: 20px` |
| 渲染层 | `z-index: 120`（远高于 header 10） |
| 父元素 | `.workstation` 根 div，**不在** header 内 |
| 显隐 | `v-if="isFocusMode"` 完全卸载 |
| 默认状态 | `opacity: 0.3`，hover 提升到 `0.8` |

按钮**已经**主动避开顶栏（z-index 120 vs 10），但它定位在 **`top: 18px, right: 20px`**，正好落在 `.workstation-header` (height: 52px, 从顶 0 开始) 的右上角范围内。**视觉上它压在顶栏 right side 的按钮（publish-btn / split-view icon-btn / focus mode icon-btn / layout-presets 末端）之上**，即使 z 轴高于 header，它仍占据同一屏幕像素区域，造成"两个文字图层叠加"。

## 对修复的指导意义

- exit-btn 的物理位置 (top:18, right:20) 与顶栏 right side 的 publish-btn 中心位置（顶栏 height 52 → vertical center ~26px，right padding 16px，publish-btn padding-right 18px → publish-btn 右沿约 right:16, 横向占约 60-80px）**完全重叠**。
- z-index 高没用——视觉上仍然双层渲染。
- 任何修复方向需要 **改 top/right 数值** / **换浮层位置** / **focus mode 下隐藏顶栏右侧按钮** 三选一（或组合）。
