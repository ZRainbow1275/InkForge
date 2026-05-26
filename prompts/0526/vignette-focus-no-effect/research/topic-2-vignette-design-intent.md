# topic-2: vignette 产品设计意图（独立开关 vs 专注模式附属）

## 调查问题

vignette 在原始 spec / 设计文档里到底是：
- A) 专注模式专属增强（focus-only）
- B) 独立写作辅助，普通模式也该看到
- C) 配置在 Settings > Appearance（与编辑器面板/写作面板正交）

当前实现是 spec-conform 但反人类，还是实现脱离 spec？

## 调查方法

1. 全文读 `prompts/0420/specs/21-focus-writing-assist-spec.md`（v2.1 写作辅助 Spec）
2. grep prompts/ 全量找 vignette/渐晕/暗角 提及
3. 对照 Spec 的"各功能独立状态"声明与"渐晕效果"章节

## 关键发现

### 发现 1：Spec 明文写"各功能独立开关，可任意组合"

`prompts/0420/specs/21-focus-writing-assist-spec.md:47-56`
```
### 1.2 各功能独立状态

专注模式、打字机模式、渐晕效果、目标字数、番茄钟、环境音均为**独立开关**，可任意组合：

FocusMode ────────────────── 独立开关（F11 或工具栏按钮）
TypewriterMode ─────────────── 独立开关（Settings > Editor）
Vignette ───────────────────── 独立开关（FocusMode 附属选项）
WordGoal ───────────────────── 双层目标（单文档 + 每日/每周）
Pomodoro ───────────────────── 独立开关（Settings > Writing）
AmbientSound ───────────────── 独立开关（Writing 面板）
```

**这里有自相矛盾**：标题说"独立开关，可任意组合"，但 Vignette 一行又括注"**FocusMode 附属选项**"。说明 Spec 作者自己也在两种意图之间摇摆。

### 发现 2：Spec § 6 渐晕章节明确说"专注模式下可单独控制"

`prompts/0420/specs/21-focus-writing-assist-spec.md:474-510`
```
## 6. 渐晕效果（Vignette）

### 6.1 效果描述

编辑区上下各 80px 半透明渐变遮罩，使视觉焦点集中在光标附近的内容，
非焦点区域（顶部和底部）自然淡出。

### 6.2 实现（CSS mask-image）

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
  ...
}

### 6.3 配置

- 开关：Settings > Appearance > 渐晕效果（Switch）
- 可自定义渐晕高度（Slider，范围 40px~200px，默认 80px）
- 专注模式下可单独控制（FocusModeShell 内有渐晕开关）
```

**关键信号**：
- Spec § 6.2 选择器是 `.editor-container.vignette-enabled` — **直接挂在编辑容器上**，**与 focus-mode 完全无关**
- Spec § 6.2 用 `mask-image` 实现，不是 overlay div + background-gradient
- Spec § 6.3 第一个开关入口是 "Settings > Appearance > 渐晕效果"，**不是写作辅助面板的快捷开关**
- "专注模式下可单独控制（FocusModeShell 内有渐晕开关）" 说明 vignette 在 focus mode 内只是**有冗余入口**，并非 focus 限定

### 发现 3：Spec § 4.3 列出"专注模式保留 UI"，未把 vignette 列为依赖项

`prompts/0420/specs/21-focus-writing-assist-spec.md:262-275` 中保留的 UI 元素列表只有：编辑区 / 极简 StatusBar / 退出按钮 / 快捷键 / 斜杠命令 / 浮动工具栏 / Toast / 自动保存 / FocusSessionSummary。**没有 vignette。** 反过来 § 4.2 "进入专注模式时隐藏的 UI" 也没把 vignette overlay 放进来。说明 Spec 把 vignette 当成与 focus mode 正交的 layer。

### 发现 4：当前实现走的是"overlay div + .focus-mode 父类锚定"，与 Spec § 6.2 不同

实际实现（详见 topic-1）：
- 用 `<div class="focus-overlay" />` 全屏 fixed 层
- 用 `.focus-mode.focus-vignette .focus-overlay` 复合 selector
- 用 `linear-gradient` + `radial-gradient` 双层 background
- 完全没有 Spec § 6.2 所指的 `mask-image` 方案，也没有 `.editor-container.vignette-enabled` 类

实现把 vignette 视觉**强绑定在 focus mode 父类上**，导致非 focus 下 100% 不可见。

### 发现 5：Spec § 4.3 加粗强调"专注模式是视觉层的极简，不是功能层的阉割"

`prompts/0420/specs/21-focus-writing-assist-spec.md:36-37`
```
- 专注模式是**视觉层的极简**，不是**功能层的阉割**
- 所有快捷键、斜杠命令、自动保存、错误通知在专注模式下全部保持正常工作
```

这一原则同样可以反向应用：**普通模式（非 focus）也不该把写作辅助功能阉割**。vignette 作为写作辅助开关，不应当被"必须先进 focus mode"二次门禁。

### 发现 6：0227 早期 spec 没提 vignette

`prompts/0227/10-writing-assistant.md` 全文不含 vignette / 渐晕 / 暗角，说明 vignette 是 0420 v2.1 阶段才引入的概念，源头只有这一份 spec。

## 结论

**当前实现脱离 Spec，方向偏向 A（focus-only），但 Spec 实际意图更接近 B（独立开关，与 focus 正交，focus 内有冗余入口）。**

证据链：

1. Spec § 1.2 标题强调"独立开关，可任意组合"
2. Spec § 6.2 实现用 `.editor-container.vignette-enabled`（编辑容器锚），不依赖 focus 类
3. Spec § 6.3 主入口是 Settings > Appearance，focus mode 内只是冗余入口
4. Spec § 4 没把 vignette 算进 focus-only 的 UI 列表
5. Spec § 1.2 括注 "FocusMode 附属选项" 是矛盾点 — 解读为**配置 UI 在 focus mode 内有露出**，而非**视觉效果只在 focus mode 下生效**

当前实现：
- 把 vignette 视觉**绑死在 focus-mode 父类**（topic-1 已证）
- 写作辅助面板把"暗角聚焦"按钮放在与"打字机模式"同一 split 区，UI 暗示二者地位对等
- 但打字机模式独立生效（不依赖 focus），vignette 不独立生效 — 这是 **UX inconsistency**

**用户认知反人类的根因**：按钮就在面板上、label 也切换了"开启/关闭"，但屏幕完全没变化 — 这违反了 visual feedback 第一原则。
按 Spec 意图，应该让 vignette 真的独立生效（普通编辑下也看到上下暗带）。slider 也应当 always-on 可调（前提是开关已开）。

## 对修复的指导意义

推荐路径（与 Spec 一致）：

1. **解耦 CSS 父类约束**：把 `.focus-mode.focus-vignette .focus-overlay` 改成 `.focus-vignette .focus-overlay`（删 `.focus-mode` 前置），并把 `opacity:1` 移到 `.focus-vignette` 范围内 — 让 vignette 在任意模式下都激活
2. **模板 class binding 解耦**：`WorkstationView.vue:1968` 的 `'focus-vignette': isFocusMode && writingAssistStore.vignette.isEnabled` 去掉 `isFocusMode &&` 前缀
3. **（可选）按 Spec § 6.2 重做实现**：用 `mask-image` 挂在 `.editor-container` 上，而非 fullscreen overlay div — 但这是更大改动，可作为后续重构
4. **（可选）补 Settings > Appearance 入口**：写作辅助面板按钮保留作为快捷开关

按 spec 意图，slider 应当 always-on（前提是 toggle 已开）；按钮也应当 always 有效。
