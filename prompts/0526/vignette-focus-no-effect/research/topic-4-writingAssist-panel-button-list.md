# topic-4: WritingAssistPanel split section 三个按钮的产品角色

## 调查问题

枚举 `WritingAssistPanel.vue` L517-566 的 `assist-section split` 区中三个控件：
- 打字机模式（toggle button）
- 暗角聚焦（toggle button）
- 暗角高度（range slider）
- 光标位置（range slider，typewriter 的子参数）

它们在产品里各自承担什么角色？是独立写作辅助开关，还是 focus mode 子开关？UX 是否一致？

## 调查方法

1. 读 `WritingAssistPanel.vue:517-567`
2. 读各 toggle 的 store handler 副作用
3. 对照 Spec § 1.2 / § 5 / § 6 关于"独立开关"的描述

## 关键发现

### 发现 1：split section 完整 DOM（4 个控件）

`inkforge/src/components/editor/WritingAssistPanel.vue:517-567`
```vue
<div class="assist-section split">
  <button
    type="button"
    class="assist-toggle"
    :class="{ active: typewriterMode }"
    @click="emit('toggleTypewriter')"
  >
    打字机模式
    <span>{{ typewriterMode ? '开启' : '关闭' }}</span>
  </button>
  <button
    type="button"
    class="assist-toggle"
    :class="{ active: vignette.isEnabled }"
    @click="writingAssistStore.setVignetteEnabled(!vignette.isEnabled)"
  >
    暗角聚焦
    <span>{{ vignette.isEnabled ? `${vignette.height}px` : '关闭' }}</span>
  </button>
  <label
    class="assist-range"
    :class="{ disabled: !vignette.isEnabled }"
  >
    <span>暗角高度</span>
    <input
      type="range"
      min="40"
      max="200"
      step="10"
      :disabled="!vignette.isEnabled"
      :value="vignette.height"
      @input="writingAssistStore.setVignetteHeight(Number(($event.target as HTMLInputElement).value))"
    >
  </label>
  <label
    class="assist-range"
    :class="{ disabled: !typewriterMode }"
    :aria-label="`光标位置 ${cursorPositionPercent}%`"
  >
    <span>光标位置 {{ cursorPositionPercent }}%</span>
    <input
      type="range"
      min="0.3"
      max="0.7"
      step="0.05"
      :disabled="!typewriterMode"
      :value="cursorPosition"
      @input="writingAssistStore.setCursorPosition(Number(($event.target as HTMLInputElement).value))"
    >
  </label>
</div>
```

四元素：**toggle / toggle / slider / slider** 两两配对（一个开关 + 一个子参数）。视觉上是 "两组并列的开关 + slider"。

### 发现 2：上方还有一个 "专注" 按钮（不在 split section）

`inkforge/src/components/editor/WritingAssistPanel.vue:358-367`
```vue
<button
  type="button"
  class="assist-focus-btn"
  :class="{ active: isFocusMode }"
  :title="isFocusMode ? '退出专注模式' : '进入专注模式'"
  @click="emit('toggleFocus')"
>
  <Focus :size="15" />
  {{ isFocusMode ? '退出' : '专注' }}
</button>
```

在 panel header（`writing-assist-header` 内），不在 split section。

### 发现 3：三个按钮在 store 副作用上的实际地位

| 按钮 / 控件 | 副作用 | 视觉是否独立生效 |
|---|---|---|
| 专注 (header) | `toggleFocusMode()` → `isFocusMode.value = true` + 应用 FOCUS_MODE_LAYOUT 全屏（顶栏 / 三栏收起 / overlay 激活） | 立即可见 |
| 打字机模式 | `emit('toggleTypewriter')` → `settingsStore.settings.editor.typewriterMode` 切换 → ProseMirror typewriter plugin 监听 | 独立可见（按 spec），但 topic-1 之外另有"打字机无效" bug（同 0526 任务 1）|
| 暗角聚焦 | `writingAssistStore.setVignetteEnabled(...)` → store 字段切换 + localStorage persist | **不独立可见**（受 focus-vignette CSS 父类约束，topic-1 已证）|
| 暗角高度 | `writingAssistStore.setVignetteHeight(...)` → store 字段 + persist | **不独立可见**（同上）|
| 光标位置 | `writingAssistStore.setCursorPosition(...)` → store 字段 + persist | 仅在 typewriter 激活时影响光标对齐位置 |

### 发现 4：UX 一致性比对

| 维度 | 打字机模式 | 暗角聚焦 |
|---|---|---|
| 在面板的位置 | split section 左格 | split section 右格 |
| label 文字 | "打字机模式" | "暗角聚焦" |
| 状态显示 | "开启 / 关闭" | "80px / 关闭" |
| active class | `vignette.isEnabled` truthy | `typewriterMode` truthy |
| 子参数 slider | 光标位置（30%~70%）| 暗角高度（40~200px） |
| 子参数 disabled 联动 | `:disabled="!typewriterMode"` | `:disabled="!vignette.isEnabled"` |
| 是否独立生效 | **是**（理论） | **否**（需 focus mode）|

**UX 强暗示**：两个按钮在同一 split section、采用相同的 toggle 视觉、同样有子参数 slider — 用户合理推断"它们地位对等、行为也对等"。

但实际行为**严重不对等**：打字机模式可在普通编辑下独立切换并看到效果（按 spec），vignette 必须先按 F11 进 focus mode 才看得到。

### 发现 5：spec 在 panel UI 角色上是模糊的

`prompts/0420/specs/21-focus-writing-assist-spec.md` 中：
- § 5.3 打字机模式配置入口："Settings > Editor > 打字机模式（Switch）。也可在 WritingStatsPanel 或 FocusModeShell 内通过快捷开关切换。" — **写作辅助面板有快捷开关，独立于 focus mode**
- § 6.3 渐晕配置入口："Settings > Appearance > 渐晕效果（Switch）。专注模式下可单独控制（FocusModeShell 内有渐晕开关）。" — **写作辅助面板未明文列为入口**，但 FocusModeShell 内有冗余开关

按 Spec 严格读，vignette 在写作辅助面板 split section 出现，**本身就是 spec 未规定的扩展**。但出现后采用的视觉与"打字机模式"一致，违反了 spec § 1.2 "独立开关，可任意组合" 的精神。

## 结论

**这是 UX inconsistency（同 section 内两个并列按钮规则不一），不是有意为之。**

证据：

1. split section UI 把两个按钮置于对等地位（同尺寸、同视觉、同子 slider 结构）
2. store 层副作用对称（都是 mutate + persist，都没有 focus mode 联动）
3. spec 层声明二者都是"独立开关"
4. **但只有 vignette 的视觉层（CSS）违反了独立性**（topic-1 已证）

所以这是 **CSS 实现 bug，不是 UX 设计意图**。如果是有意 focus-only，应当：
- vignette 按钮放在 `assist-focus-btn` 同一行作为子开关
- 或加 "需进入专注模式" 副标
- 或在 isFocusMode === false 时 disable

当前代码三者都没做，证明这是无意的耦合。

## 对修复的指导意义

修复目标：恢复 UX 一致性（暗角聚焦像打字机模式一样独立生效）。

最小化修复方案：

1. 改 `WorkstationView.vue:1968` 的 class binding：
   ```vue
   'focus-vignette': writingAssistStore.vignette.isEnabled,
   ```
   （删 `isFocusMode &&` 前缀）

2. 改 `WorkstationView.vue:5469` 的 selector：
   ```css
   .focus-vignette .focus-overlay {
     opacity: 1;
     background: linear-gradient(...) , radial-gradient(...);
   }
   ```
   （删 `.focus-mode` 父类，并合并 opacity:1）

3. 不需要改 store、不需要改 panel 模板、不需要改触发路径

这样 vignette 切换/拖动后立即可见，与打字机模式行为一致，符合 spec § 1.2 "独立开关" 声明。
