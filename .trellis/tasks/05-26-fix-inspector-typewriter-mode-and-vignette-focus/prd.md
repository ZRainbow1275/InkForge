# fix: Inspector typewriter mode & vignette focus

## Goal

修 Inspector / WritingAssist 面板里的两个写作辅助功能：「打字机模式」与「暗角聚焦」。User 反馈"功能实现有问题，原本很有趣的功能"。具体症状待 user 描述。

## What I already know

### UI 位置
- `inkforge/src/components/editor/WritingAssistPanel.vue:516-547`
  - 打字机模式 toggle button → emit `toggleTypewriter` → WorkstationView 处理
  - 暗角聚焦 toggle button → `writingAssistStore.setVignetteEnabled(!vignette.isEnabled)`
  - 暗角高度 range input → `writingAssistStore.setVignetteHeight(Number(...))`

### 状态层
- `inkforge/src/stores/writingAssist.ts`
  - `vignette: VignetteConfig { isEnabled, height }`, 默认 `{ isEnabled: false, height: 80 }`
  - `setVignetteEnabled` / `setVignetteHeight` actions（line 320, 325）
  - persist 到 localStorage `inkforge-writing-assist` (line 242)
- `inkforge/src/views/WorkstationView.vue:1012`
  - `toggleTypewriterMode()` 切 `settingsStore.settings.editor.typewriterMode`
  - 绑定到 F9 快捷键（`getShortcutBinding('typewriterMode', 'F9')`）

### 实现层
- `inkforge/src/extensions/TypewriterMode.ts` — TipTap Extension
  - 光标行居中视口（cursorPosition: 0.5 默认）
  - 非活跃段落淡化（dimInactiveParagraphs: true）
  - 使用 ProseMirror Plugin + Decoration + findScrollParent
- 暗角实现层位置待确认（CSS overlay 或 Vue component layered on editor）

### 上下文
- 同 commit 链有 `dev/visual-fixes` 分支视觉相关改动尚未提交（App.vue / HubView.vue / PublishView.vue / ThemesView.vue 等 working tree dirty），可能涉及 vignette / typewriter 样式回归
- 上个 task (freezePrototype) 与本 bug **根因无关**，PR1 不影响写作辅助逻辑

## Symptom (确认)

- F9 切换打字机 + 顶栏专注按钮都能用（mutation/reactive OK）
- **但视觉效果差到不可用：雾蒙蒙一片什么也看不清**

## Root cause（多处叠加）

1. **`TypewriterMode.ts:162`** — `opacity: 0.4` 给所有非活跃段落，几乎不可读（**主犯**）
2. **`WorkstationView.vue:5450-5483`** — `.focus-overlay` 全屏 radial 渐变 + vignette 线性渐变叠加
3. **`WorkstationView.vue:5541-5544`** — `.focus-mode .workstation-header { opacity: 0.3 }`，顶栏几乎消失（需 hover 才能看清）

三者全开时屏幕严重低对比、像"上了一层雾"。

## Decision

仅修主犯：把 `TypewriterMode.ts:162` 的 `opacity: 0.4` 改为 `0.7`。同步更新顶部注释 `(opacity: 0.4)` → `(opacity: 0.7)`。

User 明确：header 0.3 不改；focus overlay 不在投诉范围，本 task 不动。

Full-sweep 自检：grep `opacity: 0.4` 全仓只有 TypewriterMode.ts 是打字机相关，其余 (VersionPanel/HubView/WorkstationView 其他元素) 不同 UI 语义，不同根因，不并入。

## Requirements

- 改 `TypewriterMode.ts:162` style 字符串 opacity 0.4 → 0.7
- 同步改注释行（line 18 + line 66）
- 不改 header / focus overlay / vignette
- 不动 store、Vue 组件、扩展架构

## Acceptance Criteria

- [ ] 打字机模式开启时，非活跃段落 opacity = 0.7（清晰可读）
- [ ] 光标居中滚动、F9 快捷键、设置持久化均保持原状不退化
- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 全绿（不引入新测试，仅确认无回归）
- [ ] 手测：F9 开打字机，非当前段落清晰可见而非"雾蒙蒙"

## Out of Scope

- 不重写 TipTap 扩展架构
- 不动 vignette 的视觉设计（仅修功能不达预期之处）
- 不并入 freezePrototype task

## Technical Notes

- 关键文件：
  - `src/components/editor/WritingAssistPanel.vue:516-547`
  - `src/stores/writingAssist.ts:139,203,242,320-330,579`
  - `src/views/WorkstationView.vue:1012-1015,3224-3226`
  - `src/extensions/TypewriterMode.ts`
- 待定位：暗角 overlay 的 DOM/CSS 实现位置
