# PRD — Focus mode 顶栏按钮重叠

## 症状

进入专注模式 (F11 / 顶栏按钮 / 命令面板) 后，右上 `.focus-exit-btn`（"退出专注 Esc"）与顶栏 actions（4 icon + 4 mode tab + publish）**物理像素重叠**。z-index:120 高于 header 但视觉双层渲染，文字相互覆盖。

## Root cause

- `.focus-exit-btn` (`WorkstationView.vue:5486-5519`): `position:fixed; top:18; right:20; z-index:120`
- 顶栏 actions 在同区域：top:8-44 × right:16-500
- focus mode 仅给 `.workstation-header` 加 0.3 opacity dim，**未隐藏物理元素**
- spec 21 §4.2 本要求 ToolBar 完全隐藏，但用户铁律 "header 0.3 dim 不改"

## Decision（user 选 A）

**focus mode 下隐藏 header 内 actions / layout-presets / publish-btn，保留 header 自身（含 0.3 dim）+ exit-btn 独占右上区。**

铁律 + spec 折中：header 框架在（保留 0.3 dim 痕迹），具体按钮物理移走。

## Files Touched

1. `inkforge/src/views/WorkstationView.vue`
   - L5541-5548 区块保留 `.focus-mode .workstation-header { opacity: 0.3 }`（铁律）
   - 新增 CSS（紧贴 5548 之后）：
     ```css
     .focus-mode .workstation-header .header-actions,
     .focus-mode .workstation-header .layout-presets,
     .focus-mode .workstation-header .publish-btn {
       display: none;
     }
     ```
   - 检查类名匹配：grep .header-actions / .layout-presets / .publish-btn 实际 class 命名（research/topic-2 已 ✓ 三者均存在）

2. Mobile media query (L4013-4068) 同步处理：
   - 同样 selector 在窄屏断点内也隐藏
   - 或全局 `.focus-mode` selector 已能覆盖 → 无需重复（推荐 single source of truth）

## Acceptance Criteria

- [ ] focus mode 下顶栏只剩 0.3 dim 痕迹的 logo / 标题区，无 4 icon / 4 mode tab / publish 按钮
- [ ] 右上 `.focus-exit-btn` 独占该区，无任何文字 / 按钮与之重叠
- [ ] 退出 focus mode 后 header actions 全部恢复，无回归
- [ ] 窄屏 (max-width 900px) 同样无重叠
- [ ] hover header 区时 header dim 恢复仍可见（铁律）
- [ ] `npm run typecheck` / `lint` / `test` 全绿
- [ ] 手测：F11 进 focus mode → 看不到 publish / mode tabs / icon-btn；按 Esc 出来全恢复

## Out of Scope

- 不删 `.focus-mode .workstation-header { opacity: 0.3 }`（用户铁律）
- 不移动 exit-btn 位置
- 不改 z-index
- 不引入新 floating action button
- 不修 spec 21 §4.2 与铁律的根本冲突（折中保留）
- 不并入 typewriter / vignette 问题

## Risks

- focus mode 下用户想发布 / 切布局 → 必须先 Esc 退出。User 已知 (option A Cons 说明)。
- 深色主题下 dim 区残留视觉是否合适 → 不在本次范围

## 实施顺序

1. 确认 .header-actions / .layout-presets / .publish-btn class 名实际（grep template + 已有 CSS）
2. 写新 CSS 块
3. 手测 focus 进/出
4. 窄屏断点检查
5. gates
