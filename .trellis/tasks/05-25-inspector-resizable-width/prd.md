# inspector-resizable-width

## Goal

让用户通过拖拽 Inspector 左侧边缘调整其宽度，替代当前仅靠 layout preset 切换的静态宽度方案。Inspector 宽度基础设施（panelWidths ref / clamp / localStorage 持久化）已存在，仅缺交互层（drag handle + pointer events）。

## What I Already Know

- panelWidths ref: `WorkstationView.vue:457` → `{ manager, stage, inspector }`, 持久化到 localStorage
- inspector limits: `WorkstationView.vue:165` → `{ default: 260, min: 240, max: 460 }`
- CSS 变量驱动: `--workstation-inspector-width` (line 1911) → applied to inspector column (lines 3940, 4192-4193)
- 已有参考实现: split-view divider drag (lines 790-846) → pointer capture + body class + ratio update
- layout preset "审阅" 已把 inspector 设到 400px，证明 CSS 渲染正确
- Inspector 可折叠 (inspectorCollapsed) → drag handle 应仅在展开时可见

## Requirements

1. 在 Inspector 左侧边缘添加 **4px 竖向 drag handle**（cursor: col-resize）。
2. 拖拽时实时更新 `panelWidths.value.inspector`（clamp 到 240-460）。
3. 释放后持久化到 localStorage（调用现有 `writePanelWidthsPreference`）。
4. 拖拽时 body 加 `split-view-resizing` class（复用现有 cursor override pattern）。
5. Inspector 折叠时 handle 不渲染。
6. 双击 handle 重置到 default 260px。
7. **不改 manager / stage / split-view 现有拖拽**。不动 panelWidths 数据结构。不动 layout preset 机制（preset 可覆盖手动宽度）。

## Acceptance Criteria

- [ ] 拖拽 Inspector 左侧缘 → 宽度跟随鼠标，clamp 240-460。
- [ ] 释放后刷新页面 → 宽度持久化。
- [ ] 双击 handle → 宽度归 260。
- [ ] Inspector 折叠 → handle 不可见。
- [ ] manager / stage 拖拽 / split-view 不受影响。
- [ ] pnpm typecheck + lint 绿。
- [ ] 仅改 WorkstationView.vue（template 加 handle + script 加 3 handler + style 加 handle CSS）。

## Technical Approach

复制 split-view divider 模式：
- `startInspectorDrag(event: PointerEvent)` → capture, add body class
- `handleInspectorDragMove(event: PointerEvent)` → 算 inspector = containerRight - clientX, clamp, assign
- `stopInspectorDrag()` → persist, remove class
- 双击: `resetInspectorWidth()` → panelWidths.value.inspector = 260

Template: `<div class="inspector-resize-handle" @pointerdown="startInspectorDrag" @dblclick="resetInspectorWidth" />`
CSS: 绝对定位在 inspector column 左侧 -2px, width 4px, height 100%, cursor col-resize, z-index > inspector content.

## Out of Scope

- manager 左侧 resize handle
- stage 左/右 resize handle
- 最小/最大宽度约束修改
- 移动端适配

## Technical Notes

- Inspector column selector: `.inspector` (lines 4185+)
- `panelWidths` write fn: `writePanelWidthsPreference` (line 338+)
- body class pattern: `split-view-resizing` (lines 803, 815, 3905)
