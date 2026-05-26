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

## Out of Scope (Phase 1)

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

---

# Phase 2 — Typewriter 升级 (A+B+C+D)

## Phase 2 Goal

User 评价 Phase 1 后："这个打字机模式到底有什么用 / 平平无奇"。把"光标居中 + 整段淡化"升级为"沉浸式聚焦写作"。User 决策：**都做**（A+B+C+D 全上一个 PR）。

## Phase 2 Enhancements

### A. 分级淡化 (Tiered Dimming)

替换 Phase 1 的"非活跃段落统一 0.7"为**距离衰减**：

| 段落位置 | opacity |
|---------|---------|
| 当前段落 | 1.0 |
| 上/下相邻段落 (±1) | 0.85 |
| 更远段落 (≥±2) | 0.5 |

**实现**：`TypewriterMode.ts` 插件 2 内部计算 `activeBlockIndex`，遍历 doc 时按 `Math.abs(blockIndex - activeIndex)` 分桶；emit 三种 Decoration class（`typewriter-dim-near` / `typewriter-dim-far`）；保留 `class: 'typewriter-dimmed'` 兼容样式钩子但 inline style 走 class CSS（移除 inline `opacity` 字符串，统一改为 CSS class 控制）。

### B. 句子级聚焦 (Sentence-level Focus)

当前段落内部再细分：

| 句子位置 | opacity |
|---------|---------|
| 光标所在句 | 1.0 |
| 同段其他句 | 0.75 |

**实现**：在插件 2 处理"活跃块"时，用 `Decoration.inline` 切句。
- 中英文句末标点切分：`/[.!?。！？；;]+\s*/g` + 段尾 fallback
- 找 cursor offset 落入哪个句子区间，其它句子 inline-dim
- 不切句失败时降级到"整段 1.0"（无 B 效果，A 仍生效）

### C. 光标位置滑块 (Cursor Position Slider)

Inspector 写作辅助面板新增"光标位置"滑块：

- range 0.3 ~ 0.7, step 0.05, 默认 0.5
- Label 实时显示百分比（"光标位置 50%"），并 ARIA-friendly
- 禁用条件：`typewriterMode` 关闭时灰显
- 持久化：进 `writingAssist` store, key `cursorPosition`, schema 限 `0.3 ~ 0.7`
- 联动：`EditorPanel.vue` watcher 同步 `tw.options.cursorPosition` 实时到 ProseMirror 插件 → 下一次光标移动即生效

### D. 呼吸光标 + 段落侧栏 (Breathing Cursor + Block Side Bar)

**D1. 呼吸光标**
- 编辑器闲置 >1.2s 时，ProseMirror caret 添加 `breathing` class
- CSS animation：`@keyframes typewriter-cursor-breathe` 1.6s ease-in-out infinite，opacity 0.4→1
- 用户击键/移动光标立刻清掉 class
- 实现：插件 1 view().update 里 timer reset；caret 直接选 `.ProseMirror-cursor`（chrome / firefox 不一致时 fallback 给 active block ::before 一个伪光标元素）→ 简化方案: 给 editor root 加 `data-typewriter-idle="true"` 属性, CSS 选择器配合 `.ProseMirror-focused::after` 自定义闪烁

**D2. 段落侧栏**
- 当前活跃段落左侧加 2px 主题色竖条（CSS `border-left` 或 `::before`）
- Decoration.node class `typewriter-block-active`
- 平滑出入：transition `border-color 0.25s ease`

## Phase 2 Files Touched

1. `src/extensions/TypewriterMode.ts` — 主战场
   - DEFAULT_OPTIONS 加 `cursorPosition` 默认 0.5（已有，但当前未被 store 联动）
   - 插件 2 重写 decorations(): 分级 + 句子级 + active block class
   - 插件 1 view().update 增加 idle timer / data attr 设置
2. `src/stores/writingAssist.ts`
   - 加 `cursorPosition: ref<number>(persisted.cursorPosition)`
   - PersistedWritingAssistSchema 加 `cursorPosition: z.number().min(0.3).max(0.7).default(0.5)`
   - action `setCursorPosition(value: number)`
   - return 暴露 `cursorPosition`, `setCursorPosition`
3. `src/components/editor/WritingAssistPanel.vue`
   - 现有"打字机模式"按钮下方加 range slider（与暗角高度块对称）
   - storeToRefs 加 `cursorPosition`
   - emit prop or store-direct 写入（首选 store-direct，与暗角一致）
4. `src/components/editor/EditorPanel.vue`
   - L411-413: `TypewriterMode.configure({ enabled, cursorPosition })` 初值
   - L502-521 watcher：除 enabled，再同步 `tw.options.cursorPosition = writingAssistStore.cursorPosition`
   - watcher 必须监听 writingAssistStore（不是 settingsStore），新增 watch source 或合并
5. **新文件** `src/extensions/TypewriterMode.css` 或加进现有全局 editor CSS
   - `.typewriter-dim-near { opacity: 0.85; transition: opacity 0.3s ease; }`
   - `.typewriter-dim-far  { opacity: 0.5;  transition: opacity 0.3s ease; }`
   - `.typewriter-sentence-dim { opacity: 0.75; transition: opacity 0.25s ease; }`
   - `.typewriter-block-active { position: relative; }`
   - `.typewriter-block-active::before { content: ''; position: absolute; left: -10px; top: 0; bottom: 0; width: 2px; background: var(--color-primary, currentColor); transition: opacity 0.25s ease; }`
   - `.ProseMirror[data-typewriter-idle="true"] .ProseMirror-cursor, ...` 呼吸动画
   - 决策：直接进 `src/assets/styles/editor.css` 或对应已有的全局 editor 样式表（避免新增 import 链）→ 待 implementer 定位

## Phase 2 Acceptance Criteria

- [ ] 打开 typewriter mode 后：
  - [ ] 当前段落 opacity = 1, 相邻段落 = 0.85, 更远 = 0.5（视觉可辨）
  - [ ] 当前段落内当前句 opacity = 1, 其他句 ≈ 0.75
  - [ ] 当前段落左侧出现 2px 主题色竖条
  - [ ] 编辑器闲置 >1.2s 光标开始呼吸（≥3 个肉眼可见 pulse 周期）
- [ ] Inspector 面板出现"光标位置"滑块：拖动后下次光标移动滚动停靠位置随之改变；F5 重启 / 关 typewriter 后再开仍记得位置
- [ ] cursorPosition 越界值（< 0.3 / > 0.7）被 store schema 拒绝并回退默认 0.5
- [ ] 关 typewriter 后所有装饰消失、呼吸停止、侧栏隐藏
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 不引入新 warning
- [ ] `npm run test` 全绿；新增至少 1 个 vitest case 验证 `setCursorPosition` clamp + persist
- [ ] 手测 Tauri 三平台预览不受打字机扩展影响（导出 / 切渲染照常工作）

## Phase 2 Risks

- **插件 2 重算频率**：每次 selection change 都跑 doc.forEach + 句切分。若文档极长（>1000 段），可能掉帧。
  - Mitigation: 用 `state.doc.childCount` 当 fast path，对 ≥ ±3 段直接 0.5 不再细分；句切分只跑活跃块。
- **句切分对代码块 / 列表的语义偏差**：代码块内不应被句号切。
  - Mitigation: 跳过 `node.type.name === 'codeBlock'` / `'listItem'` 子树，整体当作"非活跃块"或整体 1.0。
- **CSS 主题色变量**：`--color-primary` 是否全主题都有？若无，回退到 `currentColor` 不会太突兀。
  - Mitigation: 先 grep 主题文件确认变量名再下手。
- **D1 呼吸 + ProseMirror 原生光标**：浏览器各异；data-attr 改父 + CSS 才稳。

## Phase 2 Out of Scope

- 不重写句切分为 AST tokenizer（用正则 + 标点足够）
- 不做"段落 ID 化稳定 key"优化（依赖 doc.forEach 顺序即可）
- 不做"输入法 IME composition 中暂停呼吸"（小概率体感差，下次迭代）
- 不动 vignette 视觉
- 不并入 freezePrototype task

## Phase 2 Implementation Order

1. store: 加 cursorPosition + schema + action + persist
2. WritingAssistPanel: slider + storeToRefs
3. EditorPanel: configure 初值 + watcher 同步 cursorPosition
4. TypewriterMode.ts: 重写插件 2 (分级 + 句切 + active class) + 插件 1 idle timer
5. CSS: 加 dim / active / breathe 三组 class
6. vitest: store action clamp + persist 用例
7. 手测 + typecheck + lint + test

每个步骤独立可回滚。完成后 single commit PR2。
