# topic-1: vignette 类只挂在 focus-mode 时硬约束确认

## 调查问题

`focus-vignette` 类是否真的"必须先按 F11 进 focus mode 才挂得上"？
非 focus-mode 状态下用户切换 `暗角聚焦` 按钮 / 拖 `暗角高度` slider 时，DOM/CSS 真值是怎样的？

## 调查方法

1. 读 `WorkstationView.vue` 模板根节点 class binding（L1968）
2. 读 `.focus-overlay` / `.focus-mode .focus-overlay` / `.focus-mode.focus-vignette .focus-overlay` 三段 CSS（L5450-5484）
3. 推演四种状态：`isFocusMode × vignette.isEnabled` 组合时 overlay 的视觉真值

## 关键发现

### 发现 1：`focus-vignette` 类是 isFocusMode 的二次乘积，非独立

`inkforge/src/views/WorkstationView.vue:1968`
```vue
<div
    class="workstation"
    :class="{ 'focus-mode': isFocusMode, 'focus-vignette': isFocusMode && writingAssistStore.vignette.isEnabled, 'split-view-active': isSplitViewActive, [`mode-${editorMode}`]: true }"
    :style="workstationLayoutStyle"
  >
```

注意 `'focus-vignette'` 的 truth 表达式是 `isFocusMode && writingAssistStore.vignette.isEnabled`，**任何一个为 false 都不挂**。这意味着用户在普通编辑（非 focus mode）下点 vignette 按钮，store 状态确实切了，CSS 变量 `--focus-vignette-height` 也写到根 style 上，但 `focus-vignette` 类**永远挂不上**。

### 发现 2：`.focus-overlay` 默认 opacity:0 + pointer-events:none

`inkforge/src/views/WorkstationView.vue:5450-5463`
```css
.focus-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  opacity: 0;
  transition: opacity 0.5s;
  background: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    transparent 0%,
    rgba(0, 0, 0, 0.03) 60%,
    rgba(0, 0, 0, 0.08) 100%
  );
}
```

裸 `.focus-overlay` 元素**始终存在于 DOM**（L1972: `<div class="focus-overlay" />` 无 `v-if`），但 `opacity: 0` 让它默认完全不可见。所以 overlay 节点是常驻挂在 z-index:50 的全屏 fixed 节点，靠 opacity 控可见性。

### 发现 3：opacity:1 只在 `.focus-mode` 范围内激活

`inkforge/src/views/WorkstationView.vue:5465-5467`
```css
.focus-mode .focus-overlay {
  opacity: 1;
}
```

仅当根挂 `focus-mode` 类时 overlay 才透明度 1（淡 radial 渐变可见）。

### 发现 4：linear-gradient 上下渐晕仅在 `.focus-mode.focus-vignette` 双类同时存在时激活

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

这条 selector 用 `.focus-mode.focus-vignette` 复合（两类必须同挂），而上面 L1968 已确定 `focus-vignette` 类**只有在 `isFocusMode === true` 时才可能挂**。

## 状态真值矩阵

| isFocusMode | vignette.isEnabled | `.focus-mode` 类 | `.focus-vignette` 类 | overlay opacity | overlay background | 用户视觉 |
|-------------|--------------------|-----------------|---------------------|-----------------|---------------------|---------|
| false | false | 不挂 | 不挂 | 0 | radial（淡） | **完全空白** |
| false | true | 不挂 | 不挂 | 0 | radial（淡） | **完全空白**（按钮看似无效）|
| true | false | 挂 | 不挂 | 1 | radial（淡 ellipse 暗角） | 极淡的中心高亮 |
| true | true | 挂 | 挂 | 1 | linear (上下暗带) + radial | 上下黑带 + 中心高亮 |

## 结论

**确认：vignette 视觉效果在非 focus mode 下 100% 不可见。**

用户在非 focus mode 下点击"暗角聚焦"按钮，理论上**什么也看不到**：

1. `setVignetteEnabled` 正常 mutate store（按钮 label 从"关闭"切到"80px"）
2. `--focus-vignette-height` CSS 变量正常注入 root style（可在 DevTools 看到）
3. 但 `.focus-vignette` 类未挂 → 复合 selector `.focus-mode.focus-vignette .focus-overlay` 不命中
4. 同样 `.focus-mode .focus-overlay { opacity: 1 }` 也未命中 → overlay 始终 opacity:0
5. 即便 selector 命中也只会写 background，依然要 opacity:1 才可见

这不是 bug，是 CSS 设计严格依赖 `focus-mode` 父类。**没有 F11 进 focus mode 就根本不可能看到任何 vignette 效果**，包括 slider 拖动也只是改 CSS 变量但永远不渲染。

## 对修复的指导意义

修复有三条路径：

1. **改 UI 层认知**：在按钮上加 "（专注模式可见）" 副标 + 在 panel "专注" 按钮未激活时 disable vignette toggle + slider（最小改动，spec-conform）
2. **解耦 CSS 父类约束**：把 `.focus-mode.focus-vignette .focus-overlay` 拆成独立的 `.focus-vignette .focus-overlay { opacity: 1; background: ... }`，并把模板 L1968 改成 `'focus-vignette': writingAssistStore.vignette.isEnabled`（让 vignette 真正独立）
3. **联动激活**：vignette 按钮点击时自动 `enterFocusMode()`（最 UX 友好但语义偏离 spec 描述的"独立开关"）

选哪条取决于 product intent，详见 topic-2。
