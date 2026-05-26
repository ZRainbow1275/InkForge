# PRD — 打字机模式全程无效

## 症状

User 手测 Phase 2 升级（dim/sentence/sidebar/slider 全套已实施未 commit）后：

> "打字机全程无用 — 也不滚动也没有段落高亮，基本上开没开没有区别"

代码层 typecheck/lint/test 全绿。所以 **运行时**问题。

## Research 结论汇总

研究目录：`prompts/0526/typewriter-no-effect/research/`

| Topic | 一句话结论 |
|---|---|
| 1 extension-lifecycle | `tw.options` mutation **同一引用**实时生效，路径 OK |
| 2 dispatch-refresh-meta | ProseMirror `view.dispatch(tr)` → 自动重跑 `decorations(state)`，路径 OK |
| 3 decoration-class-applied | Paragraph 用默认 `<p>` 无 NodeView，class 一定挂进 DOM，路径 OK |
| 4 vite-hmr-tiptap | **最可能真凶**：TypewriterMode.ts 无 `import.meta.hot.accept`，Editor 一次性 new + 早退，旧 plugin 闭包残留 |
| 5 css-load-and-cascade | CSS 加载 OK，`--color-primary` **存在**（implementer 没错），class 不被裁。CSS 不是根因 |
| 6 paragraph-rendering | `findActiveBlockIndex` 只看 doc **顶层**，光标在 `<li>` 时 sidebar 挂 `<ul>` 不挂 `<li>`（次要 UX 落差，非"全程无用"） |

## Root cause hypothesis

**P0**: Vite HMR 残留 → user 还在跑旧 plugin 闭包

**P1 (备选)**: 真有未发现的代码 bug — 但 6 个 topic 都说路径理论上通的。需要诊断数据确认。

## Decision

**两步走，先诊断后修复**：

### Phase A — 加诊断 + 用户重跑 Tauri

不改业务逻辑，只加 dev-only 诊断：

1. `TypewriterMode.ts` plugin 2 `decorations()` 顶部加 dev-only `console.debug('[typewriter] decorations call', { enabled, dimInactive, decorationCount })` —— 仅 `import.meta.env.DEV` 下执行
2. `EditorPanel.vue` 在 `bodyEditor.value` 创建成功后挂 `;(window as any).__inkforgeEditor = bodyEditor.value`（仅 DEV）
3. 用户操作：
   - **硬重启 Tauri dev**（关掉 Tauri 窗口 + 杀 vite 进程 + 重 `npm run tauri:dev`）
   - 打开 devtools console
   - 输入 `__inkforgeEditor.extensionManager.extensions.find(e=>e.name==='typewriterMode').options`
   - F9 切换 → 观察 console.debug 是否打印 + options 是否变化
4. 三种可能结果对应不同分支：
   - **A1**: debug 打印 + enabled=true + decorationCount > 0 → CSS 层未应用 → 检查 class 是否到 `<p>`；可能是 inline style 残留覆盖 / 主题特定 selector 反向覆盖
   - **A2**: debug 打印 + enabled=false → 反应性断 → settings watcher 没生效
   - **A3**: debug 不打印 → plugin 不在跑 → 扩展注册失败 / Editor 实例不是预期版本

### Phase B — 根据诊断结果定向修复

基于 A1/A2/A3 分支做对应修复。每个分支预先写好"如果……则……"：

- **若 A1**：grep 任何给 `.ProseMirror p` / `<p>` 的 inline style 或更高 specificity 选择器；检查 Tauri webview 是否禁用 transition / opacity；考虑提升 `.typewriter-dim-near / -far` 选择器特异度（如 `.ProseMirror.ProseMirror p.typewriter-dim-near { ... }` 增强）；若仍不见 → 直接给装饰回退到 inline `style: 'opacity: 0.5'`（Phase 1 已验证此路径有效）
- **若 A2**：检查 `EditorPanel.vue:506` 的 deep watch 是否真触发，可能 settings 对象引用未变 → 改 watch source 为 `() => settingsStore.settings.editor.typewriterMode` 单值
- **若 A3**：检查 Editor extensionManager 是否真包含 typewriterMode；可能 SmartPunctuation/TyporaMode 等其它扩展 throw 导致后续扩展未加载

### Phase C — 附加修复 findActiveBlockIndex 嵌套块

无论 A 分支结论，修 `findActiveBlockIndex` 处理嵌套：
- 用 `state.selection.$from.start(1)` 找到 depth=1 的祖先块（即 `<ul>`），但用 `$from.parent` 真实段落
- 或：递归 doc 找到包含 cursor 的"最贴近 paragraph-level"块（codeBlock / listItem / paragraph / heading）
- 让 sidebar 挂到 `<li>` 而非 `<ul>`，更符合用户体感

## Files Touched

### Phase A
1. `inkforge/src/extensions/TypewriterMode.ts` — plugin 2 decorations 顶部加 dev-only debug log
2. `inkforge/src/components/editor/EditorPanel.vue` — 暴露 `__inkforgeEditor` (DEV only)

### Phase B（根据诊断结果，最坏情况）
3. `inkforge/src/extensions/TypewriterMode.ts` — Decoration 用 inline style 兜底（与 Phase 1 一致路径）
4. `inkforge/src/components/editor/EditorPanel.vue` — watcher source 收窄

### Phase C（必做）
5. `inkforge/src/extensions/TypewriterMode.ts` — `findActiveBlockIndex` 改为找最贴近 paragraph 的块

## Acceptance Criteria

- [ ] Phase A 诊断：user 在 Tauri devtools 看到 `[typewriter] decorations call` 打印 + options 反应正确
- [ ] Phase B 修复：F9 后**视觉上看得到**：
  - 当前段更亮，相邻段 0.85，远端 0.5
  - 当前段左侧 2px 主题色竖条
  - 光标移动滚动到视口指定垂直位置（cursorPosition 滑块生效）
- [ ] Phase C：光标在 `<li>` 内时 sidebar 挂在 `<li>` 而非 `<ul>` 父节点
- [ ] `npm run typecheck` / `lint` / `test` 全绿
- [ ] dev-only debug 不污染 production build（`import.meta.env.DEV` guard）

## Out of Scope

- 不实现 IME composition 暂停呼吸（Phase 2 PRD 已标 OOS）
- 不优化插件 2 大文档 fast-path
- 不并入 vignette / collision

## Risks

- 诊断阶段需用户配合输出 console 信息回报 → 可能多轮交互
- 兜底用 inline style 失去 CSS class 维护性 → 但优先保证功能可用，CSS class 维护性留下次
- HMR fix 需要用户硬重启 Tauri — 不可绕过

## 实施顺序

1. **先 Phase A**：实施诊断埋点
2. user 硬重启 Tauri + 报告 console 结果
3. 根据结果走 Phase B 对应分支
4. Phase C 修嵌套块（与 B 并行做也行）
5. 删除诊断 console.debug（提交前清理或保留 DEV-only）
6. gates + 手测
