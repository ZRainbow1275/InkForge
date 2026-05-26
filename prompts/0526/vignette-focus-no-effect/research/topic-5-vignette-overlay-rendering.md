# topic-5: vignette overlay 渲染真值（即使 focus mode 也可能看不见？）

## 调查问题

即便用户按 F11 进入 focus mode 后切 vignette，渲染出来的视觉真的对吗？
- `.focus-overlay` 的 z-index、pointer-events、是否会被编辑器面板遮挡
- linear-gradient 公式 `transparent var(--focus-vignette-height), transparent calc(100% - var(--focus-vignette-height))` 这语义对吗？
- `--focus-vignette-height` 是否真正注入到 DOM？

## 调查方法

1. 完整读 `.focus-overlay` / `.focus-mode .focus-overlay` / `.focus-mode.focus-vignette .focus-overlay` 三段
2. 读 `--focus-vignette-height` 注入位置
3. 模拟 gradient 公式输出（数学层面）
4. 检查 overlay 在 DOM 树位置 / z-index 与编辑器层叠关系

## 关键发现

### 发现 1：--focus-vignette-height 在 root style 注入，确认 reactive

`inkforge/src/views/WorkstationView.vue:1953-1962`
```ts
const workstationLayoutStyle = computed<Record<string, string>>(() => ({
  '--workstation-manager-width': `${panelWidths.value.manager}px`,
  '--workstation-stage-width': `${panelWidths.value.stage}px`,
  '--workstation-inspector-width': `${panelWidths.value.inspector}px`,
  '--focus-vignette-height': `${writingAssistStore.vignette.height}px`,
  '--split-left-ratio': `${splitViewRatio.value}`,
  '--split-right-ratio': `${1 - splitViewRatio.value}`,
  '--split-left-font-size': `${splitViewLeftFontScale.value}px`,
  '--split-right-font-size': `${splitViewRightFontScale.value}px`,
}))
```

`inkforge/src/views/WorkstationView.vue:1965-1970`
```vue
<div
  class="workstation"
  :class="{ 'focus-mode': isFocusMode, 'focus-vignette': ..., ... }"
  :style="workstationLayoutStyle"
>
```

CSS 变量挂在 `.workstation` 元素上，子元素能继承。`.focus-overlay` 是 `.workstation` 的子元素（L1972），可继承到变量。slider 拖动会触发 store 字段 → computed 重新评估 → style 写回 DOM，是 reactive 的。

### 发现 2：linear-gradient 数学公式分析

`inkforge/src/views/WorkstationView.vue:5469-5484`
```css
.focus-mode.focus-vignette .focus-overlay {
  background:
    linear-gradient(
      to bottom,
      rgba(38, 50, 56, 0.14) 0,
      transparent var(--focus-vignette-height),
      transparent calc(100% - var(--focus-vignette-height)),
      rgba(38, 50, 56, 0.14) 100%
    ),
    radial-gradient(
      ellipse 80% 60% at 50% 50%,
      transparent 0%,
      rgba(0, 0, 0, 0.03) 60%,
      rgba(0, 0, 0, 0.08) 100%
    );
}
```

设 viewport 高 H = 900px, `--focus-vignette-height` = 80px：

| stop 位置 | 颜色 | 含义 |
|---|---|---|
| 0px | `rgba(38, 50, 56, 0.14)` | 顶端 14% 不透明 slate |
| 80px | `transparent` | 80px 处完全透明 → 顶部 0~80px 渐变带 |
| 820px (100%-80px) | `transparent` | 中间大段透明 |
| 900px | `rgba(38, 50, 56, 0.14)` | 底端 14% 不透明 slate → 底部 820~900px 渐变带 |

**结论：公式正确。** 上下各 80px 渐变成 slate，中间透明。视觉效果是"上下各一条淡淡的暗带"（不是黑边，颜色是 #263238 也就是 Material Design slate-grey）。

注意 14% 不透明度 + slate-grey 在白色背景下视觉非常淡 — 这是 iA Writer 哲学的"克制"。**用户在 200% 缩放或浅色主题下可能感受不到差异**（但确实有渲染）。

### 发现 3：z-index: 50 与编辑器层叠关系

`inkforge/src/views/WorkstationView.vue:5450-5463`
```css
.focus-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  opacity: 0;
  ...
}
```

`position: fixed; inset: 0` 全屏覆盖，`z-index: 50`。需要确认编辑器面板 / 顶栏 / 写作辅助面板的 z-index 是否高于 50。

`inkforge/src/views/WorkstationView.vue:5486-5505`（focus-exit-btn）
```css
.focus-exit-btn {
  ...
  z-index: 120;
  ...
}
```

退出专注按钮 z-index 120，高于 overlay 50 — 合理（退出按钮要在 overlay 上面可点）。

`pointer-events: none` 让 overlay 不吸走点击事件（点击穿透到下方编辑器），合理。

### 发现 4：focus mode 下三栏 width=0，编辑区独占 viewport

`inkforge/src/views/WorkstationView.vue:5525-5532`
```css
.focus-mode .panel-manager,
.focus-mode .panel-stage,
.focus-mode .panel-inspector {
  width: 0;
  min-width: 0;
  border-width: 0;
  overflow: hidden;
}
```

focus mode 下三栏宽度 0，编辑区占满整个 workstation 横向空间。overlay 在 fixed inset:0 顶部 / 底部 80px 暗带就会盖在编辑区顶部 / 底部 — 视觉上**确实是上下暗带**。

### 发现 5：非 focus mode 下三栏不被收起，overlay 真的盖到哪里？

注意 `.focus-overlay` 是 `position: fixed; inset: 0` — 它**始终覆盖整个 viewport，不管模式**。这意味着即使非 focus mode（三栏全部展开），overlay 仍然是覆盖在所有面板 + 顶栏 + 编辑区之上的全屏层。

如果 topic-2 / topic-4 推荐的"删 `.focus-mode` 父类约束" 落地，意味着用户在普通编辑下切 vignette → overlay 显示，**会同时盖到左右两侧面板的顶端与底端 80px 区域**。这可能看起来很怪（左侧文件管理器顶部出现暗带）。

> 这一点是修复时需要注意的副作用，可能要把 `.focus-overlay` 改成 `position: absolute` 锚定在编辑区容器上（如 spec § 6.2 用 `.editor-container.vignette-enabled`），或只在编辑区域 wrap 一层 vignette overlay。

### 发现 6：spec § 6.2 的实现路径完全不同

`prompts/0420/specs/21-focus-writing-assist-spec.md:482-503`
```css
.editor-container.vignette-enabled {
  --vignette-height: 80px;

  mask-image:
    linear-gradient(
      to bottom,
      transparent 0,
      black var(--vignette-height),
      black calc(100% - var(--vignette-height)),
      transparent 100%
    );
  -webkit-mask-image: ...;
}
```

Spec 用 `mask-image` 锚定在 `.editor-container` — 这种方式：
- 不需要 overlay div
- 视觉上是把编辑区上下两端 fade 到 0（透明），让内容自身淡出
- 不是叠一层 slate-grey，而是擦除内容（mask）

当前实现是叠 14% slate-grey 暗带（visual darkening），spec 是淡出内容（mask fade）。两种视觉效果不同：

| 维度 | 当前实现（overlay slate-grey） | Spec § 6.2（mask fade） |
|---|---|---|
| 顶端视觉 | 浅 slate 暗带（背景看起来变深）| 内容 fade 到透明（背景色透出）|
| 易感知度 | 14% slate 在浅色主题非常淡 | mask 直接 fade，content 消失，更明显 |
| 对暗色主题 | 反向：在暗背景上加深色暗带，几乎看不见 | mask 始终生效（不靠颜色）|

**当前实现在深色主题下 vignette 视觉很可能更看不见**（即便 focus mode 激活），因为 slate-grey 14% 在暗背景上没有对比度。

## 结论

**linear-gradient 公式正确，z-index 与 pointer-events 合理，CSS 变量注入也工作。但 vignette 视觉本身设计极其克制 + 当前实现选择了 background-overlay 而非 mask-image，在浅色主题下不明显，在深色主题下几乎不可见。**

具体真值：

1. CSS 变量 `--focus-vignette-height` 正常注入并 reactive — slider 拖动会让 stop 位置变化
2. gradient 公式正确（顶/底 0~80px 渐变 slate，中间透明）
3. overlay 是 fullscreen fixed，z-index 50，pointer-events:none — 不阻挡交互
4. **但**：颜色是 14% slate-grey，对浅色背景对比度低，对暗色背景几乎看不见
5. **额外 bug 风险**：如果将来解耦 `.focus-mode` 父类后，overlay 会盖到所有面板顶/底，可能视觉怪异
6. **更大的偏差**：当前实现与 Spec § 6.2 完全是两种方案（background vs mask-image）

## 对修复的指导意义

**单纯 P0 修复（让按钮有反馈）**：
- 解耦 `.focus-mode` 父类约束（topic-1 / topic-4 已给具体改动）即可让 vignette 在任意模式可见
- 此时用户至少能看到"切按钮 → 顶/底出现淡 slate 暗带"，按钮 label 变化与视觉对应

**P1 增强（让视觉更明显）**：
- 把 14% 提到 22~28%，或加深颜色到 rgba(0,0,0,0.18) 类似
- 或按 Spec § 6.2 重做：用 `mask-image` 挂在 `.editor-container` 上（更彻底，但是大改）
- 在深色主题下用浅色 mask（symmetric vignette），单 background 方案需要 theme-aware tint

**P2 副作用防护**：
- 解耦 focus-mode 父类后，verify overlay 不会盖到 manager / inspector 面板的顶/底带；如盖到可能需要把 vignette 渲染范围缩到 stage panel 或 editor 容器
- 替代方案：把 `.focus-overlay` 移到 `.panel-stage` 内部，作为 absolute overlay 而非 fixed fullscreen

修复优先级建议：**先做 P0**（最小改动让按钮生效），再排队 P1 / P2 作为视觉打磨。
