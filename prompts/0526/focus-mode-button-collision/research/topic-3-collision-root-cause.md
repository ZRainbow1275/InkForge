# topic-3: collision-root-cause

## 调查问题

综合 topic-1（exit-btn 定位）+ topic-2（顶栏布局），找出"退出专注 Esc"与顶栏发布按钮 / 模式 tabs 重叠的根因。

## 调查方法

把 topic-1 / topic-2 的 px 数值拉齐放在同一坐标系下推算。

## 关键发现

### 坐标对照表（视口右上角）

| 元素 | top (px) | right (px) | 宽度 (px, 含内容) | 高度 (px) | z-index |
|---|---|---|---|---|---|
| `.workstation-header` | 0 | 0（贴满） | viewport | 52 | 10 |
| `.workstation-header` 右侧 padding | — | 16 | — | — | — |
| `.publish-btn` 右沿 | header 内 vert-center | 16 | ~80 | ~34 | (header 内) |
| `.icon-btn` (split view, focus toggle 等) | header 内 vert-center | 16 + 80 + 8gap | 34 | 34 | (header 内) |
| `.layout-presets` 右沿 | header 内 vert-center | 16 + 80 + 8 + 34 + 8 = 146 | ~200 (4tab) | 36 | (header 内) |
| `.focus-exit-btn` | **18** | **20** | ~110-130 (含 Esc shortcut) | ~32-34 | **120** |

**关键碰撞**：

- `.focus-exit-btn` 占据屏幕 `top: 18-50px` × `right: 20-150px`
- `.publish-btn` 占据屏幕 `top: ~9-43px` (header height 52, vertical-center 26 ± 17) × `right: 16-96px`
- `.icon-btn` (split, focus toggle, export, copy) 序列占据更靠左但同 top 行
- `.layout-presets` 在更靠左位置

**结论**：`.focus-exit-btn` (right 20-150) **完全覆盖** `.publish-btn` (right 16-96) 与至少一个相邻 icon-btn 的物理位置。

### 截图证据对照

用户截图描述顶栏右段同时显示：
1. 一组淡色 icon（复制 / 导出 / 专注切换 / 布局预设 4tab / split / 发布"发布"）— 来自 header opacity 0.3
2. 红色"退出专注 Esc" 边框图标 — 来自 `.focus-exit-btn`（其 background `rgba(38,50,56,0.18)` 半透明深灰，截图所见红色是 `.publish-btn` 的 `background: #D32F2F` 透过 0.3 dim 在 exit-btn 半透明背景背后透出）

两者**像素级重叠**，且 exit-btn 半透明 → 后面的红色 publish-btn 通过 alpha 透出 → 视觉上变成"红色环包白字" 的混合效果。

### 屏宽影响

- header `.header-brand` 固定，`.header-title` flex:1 撑开，`.header-actions` flex-shrink: 0 始终保留全部按钮宽度。
- 不论 inspector 折叠与否，`.workstation-header` 永远跨视口全宽，`.header-actions` 永远靠 `padding-right: 16px` 边界。
- 因此**任何屏宽下重叠都存在**——窄屏 (`max-width: 900px`) 会更糟，因为 header 改为 flex-wrap，actions 占满第二行，但 exit-btn 仍 fixed 在视口 top:18 right:20，可能压在 actions 第二行或 title 行上。

### 不是什么的问题

- **z-index 没错**：exit-btn 120 vs header 10，exit-btn 确实显示在最上层。
- **opacity 0.3 dim 不是根因**：去掉 dim 也只是让 header 按钮变实色，仍然像素重叠。
- **不是缺少 reserve 区**：header 是 flex 布局，并未给 exit-btn 预留任何 padding-right。

### 根因表述

**根因**：`.focus-exit-btn` (position:fixed, top:18, right:20) 与 `.workstation-header` 的 `.header-actions` 区（顶栏右上 16-500px 范围）**占据同一物理像素区**。

具体二级原因：
1. exit-btn 用 fixed 定位脱离了文档流，没人通知它"顶栏右上有 480px 的按钮组"。
2. focus mode 下顶栏**未隐藏任何按钮**（spec 21 §4.2 要求隐藏 ToolBar，但当前实现仅用 opacity 0.3 dim，未做 display:none）。
3. exit-btn 自身的 top:18 right:20 设计是基于"header 在 focus 下消失"的假设——但 header 没消失。

## 对修复的指导意义

修复必须打破**像素级重叠**这一物理事实。可选路径（无优劣排序，仅枚举）：

A. **隐藏顶栏右段** in focus mode（贴合 spec 21 §4.2 设计意图）：`.focus-mode .header-actions { display: none }` 或细化到 `.focus-mode .header-actions > *:not(.focus-exit-equivalent) { display: none }`。

B. **移动 exit-btn 到不冲突位置**：顶部中央 (`top:18; left:50%; transform:translateX(-50%)`)、底部右下、底部中央 等。

C. **header 在 focus mode 完全隐藏 / collapse**（spec 4.2 ToolBar 隐藏 = translateY(-100%) 的处理方式）：`.focus-mode .workstation-header { transform: translateY(-100%); opacity: 0 }`。这条会改"header 0.3 不改"的用户铁律。

D. **保留所有现状 + reserve 一段 padding**：`.focus-mode .header-actions { padding-right: 160px }` — 物理腾出 exit-btn 空间。最不优雅但最不破坏现有交互。

参见 topic-5 详细 pros/cons。
