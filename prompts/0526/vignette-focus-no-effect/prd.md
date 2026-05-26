# PRD — 暗角聚焦切换无效

## 症状

用户切 Inspector 写作辅助面板"暗角聚焦"按钮 / 拖暗角高度 slider，**无任何视觉变化**。Pinia mutation OK，button label 切换正确。

## Root cause

`inkforge/src/views/WorkstationView.vue:1968`

```vue
:class="{
  'focus-mode': isFocusMode,
  'focus-vignette': isFocusMode && writingAssistStore.vignette.isEnabled,
  ...
}"
```

`focus-vignette` class 必须 **`isFocusMode === true` 且 `vignette.isEnabled === true`** 才挂上。用户未进 focus mode → 切 vignette toggle 视觉无效。

Spec `prompts/0420/specs/21-focus-writing-assist-spec.md` §1.2 + §6.2 明文 vignette 独立开关与 focus mode 解耦，使用 selector `.editor-container.vignette-enabled`。当前实现 **脱离 spec**，是 bug。

## Decision

**解耦 vignette 与 focus mode**：vignette toggle 独立生效，不要求 focus mode。
**缩小 overlay 作用域**：当前 `.focus-overlay` 是 `position:fixed; inset:0` 全屏，解耦后会盖到三栏面板。需要把 vignette overlay 锚定到 `.panel-stage` 或 `.editor-container`，只在编辑区出现，避免遮挡 Manager / Inspector。

保留 focus mode 自身的 `.focus-overlay` 全屏 radial 效果（spec 内 focus mode 自己的效果，与 vignette 解耦）。

## Files Touched

1. `inkforge/src/views/WorkstationView.vue`
   - L1968 class binding: `'focus-vignette': writingAssistStore.vignette.isEnabled`（删 `isFocusMode &&`）
   - L1972 vignette overlay：复用 `.focus-overlay` 或新增 `.vignette-overlay` 元素挂在 `.panel-stage` 内
   - L5469 selector: `.focus-vignette .vignette-overlay`（删 `.focus-mode` 前缀）；将 opacity:1 显式列出
   - 视觉范围：vignette 锚定 `.panel-stage` 上下边而非视口顶底，避免与 status bar / header 重叠
   - `--focus-vignette-height` CSS var 保持

2. （可选，若 overlay 解耦影响 focus mode 渐变叠加）拆分两段：
   - `.focus-mode .focus-overlay` 仍保留 focus 自身的 radial
   - `.focus-vignette .vignette-overlay`（新元素）作 vignette 线性渐变

## Acceptance Criteria

- [ ] 不进 focus mode 直接切"暗角聚焦"按钮，**编辑区上下出现可视暗带渐变**
- [ ] 拖暗角高度 slider 数值变化时暗带高度同步
- [ ] focus mode 与 vignette 可任意组合（4 种状态视觉真值矩阵全对，参见 `research/topic-1`）
- [ ] vignette overlay 只覆盖 `.panel-stage` / 编辑区，不遮三栏面板 / 顶栏 / 状态栏
- [ ] focus mode 自己的 radial 渐变效果保留不变（user 之前明确 focus overlay 不动）
- [ ] `npm run typecheck` / `lint` / `test` 全绿
- [ ] 手测：浅色 + 深色主题下暗带均可见

## Out of Scope

- 不引入新 mask-image 实现（spec §6.3 推荐但当前 overlay 已存在，先解耦绑定问题）
- 不动 vignette store / panel UI（按钮 / slider 已 OK）
- 不动 focus mode 触发路径
- 不并入 typewriter / collision 问题

## Risks

- 解耦后非 focus mode 下出现暗带，可能与三栏布局视觉冲突 → mitigation: overlay 锚定 `.panel-stage`
- 深色主题暗带太弱（research/topic-5 提到 14% slate-grey）→ 不在本次范围；用户验收后另立任务

## 实施顺序

1. 改 class binding（删 `isFocusMode &&`）
2. overlay DOM 锚点迁移（评估 .focus-overlay 是否一分为二，还是给 `.focus-vignette` 增一个独立元素）
3. CSS selector 清理（删 `.focus-mode` 父类）
4. 手测 4 状态矩阵
5. gates
