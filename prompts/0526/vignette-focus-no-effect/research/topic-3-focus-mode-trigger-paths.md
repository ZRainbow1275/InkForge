# topic-3: 所有触发 isFocusMode = true 的路径

## 调查问题

- 哪些代码路径会让 `isFocusMode.value = true`？
- F11 / 顶栏专注按钮 / 命令面板 / 写作辅助面板"专注"按钮 是否都有效？
- 用户切 vignette 按钮时是否自动 `enterFocusMode()`？目前无；Spec 是否要求联动？

## 调查方法

1. Grep `isFocusMode.value = true | enterFocusMode | toggleFocusMode | focus-mode` 全仓库
2. 读所有触发点的 handler
3. 对照 Spec § 4.1 触发方式表

## 关键发现

### 发现 1：`isFocusMode.value = true` 的唯一直接赋值在 enterFocusMode()

`inkforge/src/views/WorkstationView.vue:965-978`
```ts
function enterFocusMode(): void {
  if (isFocusMode.value) {
    return
  }

  focusModeRestoreLayout.value = createCurrentModeLayout()
  writingAssistStore.enterFocusMode(
    currentDocumentWordCount.value,
    writingGoalProgress.value.dailyPercent ?? 0,
  )
  showFocusSummary.value = false
  isFocusMode.value = true
  applyModeLayout(FOCUS_MODE_LAYOUT)
}
```

仅此一处赋 `true`。所有"进入专注模式"的入口都最终走这里。

### 发现 2：toggleFocusMode 是顶层 toggle 入口

`inkforge/src/views/WorkstationView.vue:1562-1569`
```ts
function toggleFocusMode() {
  if (isFocusMode.value) {
    exitFocusMode()
    return
  }

  enterFocusMode()
}
```

### 发现 3：四条 toggle 触发路径

#### 路径 A — F11 快捷键（默认）

`inkforge/src/views/WorkstationView.vue:1662, 1697-1701`
```ts
const focusBinding = getShortcutBinding('focusMode', 'F11')
...
if (matchesShortcut(e, focusBinding)) {
    e.preventDefault()
    toggleFocusMode()
    return
}
```

可被用户在 Settings > Keyboard 重绑。

#### 路径 B — 顶栏 icon-btn 专注按钮

`inkforge/src/views/WorkstationView.vue:2103-2108`
```vue
<button
  class="icon-btn"
  :class="{ active: isFocusMode }"
  :title="isFocusMode ? '退出专注模式 (F11)' : '进入专注模式 (F11)'"
  @click="toggleFocusMode"
>
```

顶栏 header 区按钮，与 F11 等价。

#### 路径 C — 命令面板 view.toggleFocusMode

`inkforge/src/services/command/builtin.ts:221-231`（grep 结果）
```ts
{
  id: 'view.toggleFocusMode',
  ...
  handler: () => requireWorkstationBridge(deps).actions.toggleFocusMode(),
}
```

`inkforge/src/views/WorkstationView.vue:1935-1944`
```ts
toggleFocusMode,
```
通过 `commandWorkstationBridge` 暴露给命令面板。

#### 路径 D — 写作辅助面板顶部"专注"按钮

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

通过 `emit('toggleFocus')` → `WorkstationView.vue:3225` `@toggle-focus="toggleFocusMode"` 串到顶层 toggle。

### 发现 4：第五条 — 布局预设 applyLayoutPreset 也会 enterFocusMode

`inkforge/src/views/WorkstationView.vue:899-902`
```ts
if (preset.focusMode) {
  enterFocusMode()
  return
}
```

某些 layout preset（如"专注写作"预设）会触发 focus mode。

### 发现 5：vignette toggle 不联动 enterFocusMode

`inkforge/src/components/editor/WritingAssistPanel.vue:527-535`
```vue
<button
  type="button"
  class="assist-toggle"
  :class="{ active: vignette.isEnabled }"
  @click="writingAssistStore.setVignetteEnabled(!vignette.isEnabled)"
>
  暗角聚焦
  <span>{{ vignette.isEnabled ? `${vignette.height}px` : '关闭' }}</span>
</button>
```

`writingAssistStore.setVignetteEnabled` 在 store 内（`inkforge/src/stores/writingAssist.ts:333-336`）：
```ts
function setVignetteEnabled(isEnabled: boolean): void {
  vignette.value = { ...vignette.value, isEnabled }
  persistSettings()
}
```

**纯 store 字段 mutate，无任何 focus mode 联动副作用**。slider 的 `setVignetteHeight`（L338-344）同样无副作用。

### 发现 6：Spec § 4.1 触发方式表

`prompts/0420/specs/21-focus-writing-assist-spec.md:245-250`
```
| 方式 | 动作 |
|------|------|
| `F11` | 进入/退出专注模式（Toggle） |
| 工具栏按钮 | `Focus` 图标（`Maximize2`），点击进入 |
| 命令面板 | 搜索"专注模式" → 执行 |
| 快捷键（可自定义） | 默认 `F11`，用户可在 Settings > Keyboard 重绑定 |
```

Spec 列出四个触发面 — F11、工具栏、命令面板、自定义快捷键。**不含 "切 vignette 时联动 enterFocusMode"**。Spec § 6.3 也写明 vignette 是与 focus 正交的开关（topic-2 已证）。

## 路径汇总表

| # | 触发面 | 位置 | 实现 |
|---|--------|------|------|
| A | F11 快捷键 | `WorkstationView.vue:1697-1701` | `toggleFocusMode()` |
| B | 顶栏 icon-btn | `WorkstationView.vue:2103-2108` | `@click="toggleFocusMode"` |
| C | 命令面板 view.toggleFocusMode | `services/command/builtin.ts:221-231` | bridge → `toggleFocusMode()` |
| D | 写作辅助面板顶部"专注"按钮 | `WritingAssistPanel.vue:358-367` | emit → `toggleFocusMode()` |
| E | 布局预设（preset.focusMode=true） | `WorkstationView.vue:893-902` | `enterFocusMode()` |
| — | 切 vignette 按钮 | — | **不触发 focus mode**（仅 store mutate） |
| — | 拖 vignette slider | — | **不触发 focus mode**（仅 store mutate） |
| — | 切 typewriter 按钮 | — | **不触发 focus mode**（独立可见） |

## 结论

**vignette 触发面与 focus 触发面在代码层完全独立，Spec 也没要求联动。** 所以"切 vignette 时自动进 focus mode"是一种 UX 妥协方案，但 Spec 没要求。

更符合 Spec 的方向是反过来 — **让 vignette 视觉脱离对 focus-mode 父类的依赖**（详见 topic-1 / topic-2 的修复建议）。

但如果选了"按钮自动联动 enterFocusMode"作为速修方案，要注意：

1. `enterFocusMode()` 有副作用：会保存 layout 快照、调用 `writingAssistStore.enterFocusMode()` 记录 wordCount 起点、应用 `FOCUS_MODE_LAYOUT`（清空面板）— 用户只想要个暗角，就把三栏面板全收了，非常激进
2. 用户认知里 "暗角聚焦" 和 "进入专注模式" 是两件事 — 联动会让按钮变成"伪暗角，实为专注模式"

所以推荐：**不联动，改 CSS 让 vignette 独立生效**。

## 对修复的指导意义

- 不要往"vignette 切换时 enterFocusMode" 方向走（spec 不允许，UX 也突兀）
- 应当让 vignette 的 CSS 路径与 focus mode 平级，二者各管各的视觉
- 写作辅助面板的"专注"按钮（路径 D）应当继续保持作为 focus mode 入口，不应混淆为 vignette 按钮的备份
