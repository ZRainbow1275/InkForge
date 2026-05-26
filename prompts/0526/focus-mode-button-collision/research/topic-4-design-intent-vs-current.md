# topic-4: design-intent-vs-current

## 调查问题

调查 focus mode 顶栏的原始设计 spec，对比当前实现，识别"design intent vs current implementation"的偏离点。

## 调查方法

阅读：
- `prompts/0420/specs/21-focus-writing-assist-spec.md`（专注模式核心 spec）
- `prompts/0420/specs/13-workstation-layout-spec.md`（Workstation 布局，含 focus preset 定义）

## 关键发现

### Spec 21 §4.2 进入专注模式时**应隐藏**的 UI

`prompts/0420/specs/21-focus-writing-assist-spec.md:253-261`

| UI 元素 | 隐藏方式 | 备注 |
|---------|---------|------|
| Sidebar（文件管理器 / TOC / 版本历史） | `display: none` + transition | — |
| TabBar | `height: 0` + `overflow: hidden` | — |
| Hub 导航链接 | `display: none` | — |
| **ToolBar（顶部工具栏）** | **`opacity: 0` + `translateY(-100%)`** | **200ms ease-out** |
| StatusBar | 默认保留，可通过 N-01 补充开关单独关闭 | — |

→ **设计 intent: 顶部工具栏在专注模式下应完全隐藏（opacity 0 + translateY -100%），不仅是 dim**。

### Spec 21 §4.3 保留的 UI 元素

`prompts/0420/specs/21-focus-writing-assist-spec.md:263-275`

| 保留元素 | 设计描述 |
|---|---|
| 编辑区 | 核心，居中展示 |
| 极简 StatusBar | 显示字数/目标进度（可通过 N-01 开关隐藏） |
| **退出按钮（Esc 提示）** | **右上角固定位置的 `Minimize2` 图标，hover 才显示（不干扰沉浸）** |
| 快捷键 | 所有快捷键正常工作 |
| 斜杠命令弹层 | 正常弹出 |
| 浮动工具栏 | 正常显示 |
| Toast 通知 | 正常显示 |
| 自动保存 | 正常工作 |
| FocusSessionSummary | 退出时展示 |

→ 退出按钮 spec 要求：**右上角固定位置 + Minimize2 图标 + hover 才显示**。

### Spec 21 §4.4 编辑区居中布局

`prompts/0420/specs/21-focus-writing-assist-spec.md:280-296`

```css
.focus-mode-shell {
  position: fixed;
  inset: 0;
  background: var(--paper-bg);
  z-index: var(--z-focus-mode);
}
.focus-mode-shell .editor-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 60px 40px;
  height: 100%;
  overflow-y: auto;
}
```

→ Spec 期望的是**全屏 paper bg shell**，编辑区 800px 居中。当前实现保留了 header / panel 网格，只是把侧栏 width 设为 0，没有"全屏 paper shell"。

### Spec 13 Focus Preset 定义

`prompts/0420/specs/13-workstation-layout-spec.md:554-563`

```typescript
focus: {
  id: 'focus',
  label: 'Focus',
  sidebarOpen: false,
  rightPanelOpen: false,
  sidebarWidth: 240,
  rightPanelWidth: 280,
  rightPanelMode: 'preview',
  editorMaximized: true,        // <<< 编辑器最大化
},
```

`prompts/0420/specs/13-workstation-layout-spec.md:410-411`

> `editorMaximized=false, focusModeActive=true`: iA Writer 专注模式：段落高亮 + 打字机模式，**侧栏仍存在但弱化**
>
> `editorMaximized=true, focusModeActive=true`: 完全沉浸：**无侧栏、无 TabBar（仅保留快捷键入口），全屏写作**

→ Spec 区分了两种状态：focus only / focus + maximize。当前用户路径（F11 进入 focus）应该是 **focus + maximize = 完全沉浸**，spec 描述"**无 TabBar**"（TabBar 是顶部工具栏的一种，但 InkForge 实际是 `.workstation-header`）。

### 当前实现状态

`inkforge/src/views/WorkstationView.vue:5541-5548`

```css
.focus-mode .workstation-header {
  opacity: 0.3;
  transition: opacity 0.3s;
}
.focus-mode .workstation-header:hover {
  opacity: 1;
}
```

→ 当前实现：**header 仅 dim 至 0.3，未隐藏、未移除按钮**。

`inkforge/src/views/WorkstationView.vue:5525-5539`：

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

→ 侧栏（manager/stage/inspector）正确收起，符合 spec。

### 偏离清单

| Spec 要求 | 当前实现 | 是否偏离 |
|---|---|---|
| ToolBar opacity 0 + translateY(-100%) | header opacity 0.3 + 全保留 | **偏离**（visually 仍可见，且全部按钮在原位） |
| 退出按钮 `Minimize2` icon | 文本"退出专注 + Esc shortcut chip" | 偏离（spec 是图标，当前是文字标签） |
| 退出按钮 hover 才显示 | 默认 opacity 0.3 可见，hover 升到 0.8 | 部分偏离（已经 dim 但默认可见） |
| 全屏 paper shell（focus-mode-shell） | 保留 grid 布局 + 三栏 width 0 + header 仍在 | 部分偏离 |
| 侧栏隐藏 | 三栏 width 0 | 符合 |
| 编辑区居中 800px | 通过 grid + width 控制 | 大致符合 |

### 用户铁律提示（来自任务 prompt）

> user 上次明确 "header 0.3 不改"

→ 这条用户口头约束**与 spec 21 §4.2 直接冲突**：spec 想完全隐藏 ToolBar，用户想保持 0.3 dim。当前实现保留 0.3，意味着工程实现遵从了用户铁律而非 spec。

## 对修复的指导意义

- 当前实现并非"完美贴合 spec"，而是为了满足用户"header 0.3 不改"约束 → 与 spec §4.2 冲突 → 副作用就是 exit-btn 与顶栏按钮重叠。
- 修复需要在三方间权衡：
  1. **用户铁律**：header 保留 0.3 dim 状态，不改。
  2. **Spec §4.2 设计**：ToolBar 应隐藏。
  3. **物理重叠**：必须解决。

- 可行的折中：保留 header 0.3 dim（满足铁律 1），但**隐藏 `.header-actions` 内全部按钮**（折中满足 2 的精神，因为 spec 要求 ToolBar 隐藏，而 header 的按钮区就是 ToolBar）。
- 或者**移动 exit-btn 不与 header 重叠**——把退出按钮放到顶部中央 / 底部 / 编辑区右上，让 header 0.3 dim 状态保留不变。这条最贴合用户铁律但偏离 spec "右上角固定位置"的指引。
- Spec 表述"右上角固定位置"已被当前实现继承（top:18, right:20），但 spec 假设的前提是"toolbar 已隐藏"——前提不成立的情况下"右上角"的位置就会撞车。
