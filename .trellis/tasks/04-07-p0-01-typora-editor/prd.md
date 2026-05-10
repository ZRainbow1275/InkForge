# Typora 模式编辑器 + 双模式切换

## 规格参考
- `prompts/0327/01-editor-ui-spec.md`
- `prompts/0420/specs/01-spec-editor-typora.md`
- `prompts/0420/specs/01-prd-editor.md`
- `prompts/0420/specs/00-wave1-current-truth.md`

## Goal
在不重构现有 `Workstation` 四栏架构、不删除任何既有模块的前提下，完成 `p0-01` 这一条任务包本身要求的编辑器主链交付：
- `Typora / Source / Preview` 三模式运行时可用
- `editorMode / editorWidth` 进入 settings 单一真相源并参与持久化
- 状态栏具备模式切换、版心控制、同步/保存状态展示和设置入口
- 现有 `Focus Mode`、`Workstation` 布局和 `Hub -> /workstation?id=` 入口继续兼容

## 2026-04-23 当前实现真相
- `inkforge/src/extensions/TyporaMode.ts` 已真实存在，并承担 active line 元数据、Markdown token 暴露、HTML <-> Markdown 兼容转换与正文归一化辅助职责。
- `inkforge/src/components/editor/EditorPanel.vue` 已形成真实的 `Typora` 主编辑器 + `Source` 面板双态结构；正文写回时以 Markdown 作为持久化主格式。
- `inkforge/src/views/WorkstationView.vue` 已真实消费 `editorMode`、`editorWidth`、`lastNonPreviewMode` 与 `modeLayouts`，并把 `Preview` 做成独立只读壳层，而不是把 TipTap 留在页面上假只读。
- `inkforge/src/components/editor/EditorStatusBar.vue` 已具备模式切换按钮、版心前后切换、同步状态、保存状态、设置入口与基础统计。
- `inkforge/src/stores/settings.ts` 已把 `editorMode` 扩展为 `typora | source | preview`，并把 `editorWidth` 扩展为 `narrow | medium | wide | full`。
- `inkforge/src/views/SettingsView.vue` 已在 `Editor` tab 中真实暴露三种编辑模式和四档版心，不再只是 spec 占位。
- `inkforge/src/stores/editor.ts` 已在加载、创建、更新和版本切换边界继续做 Markdown 归一化，避免旧 HTML 正文直接在运行时链路中扩散。
- `Hub -> /workstation?id=<articleId>` 的深链已补齐，说明这条 bundle 的运行时入口不是孤立页面。

## Bundle 收口边界
本任务关闭的是 `p0-01 typora-editor` 任务包，不是整个 0420 编辑器工程的完全结束。以下内容虽与大 spec 相关，但不再阻塞本 bundle 关闭：
- authority model 中更深的 `markdownSource / htmlCache / sourceHash` 分层
- 更完整的 selection/history/comment anchors 跨模式契约
- 更广泛的 IME 守卫、快捷键体系、查找替换、独立 `KeyboardShortcuts.ts`
- GitNexus `impact / detect_changes` 自动分析。当前机器仍是外部工具阻塞，不作为 bundle 无法关闭的理由

## Acceptance Criteria
- [x] `Typora / Source / Preview` 三模式在真实运行时可切换，不破坏现有 `Workstation` 主流程。
- [x] `settings.editor.editorMode` 与 `settings.editor.editorWidth` 已进入 `stores/settings.ts` 的 schema 与默认值。
- [x] `SettingsView.vue` 的 `Editor` tab 已真实展示三种编辑模式与四档版心选项。
- [x] `EditorStatusBar.vue` 已具备模式按钮、版心控制、同步状态、保存状态和设置入口。
- [x] `WorkstationView.vue` 已在 `Preview` 模式下切到独立只读壳层，并持久化 `lastNonPreviewMode` / `modeLayouts`。
- [x] `Focus Mode` 仍能在当前架构内进入和退出，不删除任何原有面板。
- [x] `stores/editor.ts` 与 `TyporaMode.ts` 已共同维持正文向 Markdown 收口的运行时边界。
- [x] `pnpm -C D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit` 通过。
- [x] `pnpm -C D:/Desktop/Inkforge/inkforge build` 通过。
- [x] Playwright 真实验证 `Settings` 与 `Workstation` 主链无新增 console error。

## Validation

### 类型与构建
- `pnpm -C D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit`
- `pnpm -C D:/Desktop/Inkforge/inkforge build`

### Playwright 真实回归
- `http://127.0.0.1:3006/settings?tab=editor`
  - 已真实看到 `Typora / Source / Preview` 三种模式选项
  - 已真实看到 `窄 / 中 / 宽 / 全宽` 四档版心
  - 快捷键页真实显示 `38` 项、`0` 冲突项
- `http://127.0.0.1:3006/workstation`
  - 已真实以本地持久化的 `Preview` 默认模式打开
  - 已真实从状态栏切到 `Typora`
  - 已真实从状态栏切到 `Source`
  - 已真实通过状态栏把版心从 `宽版心` 切到 `全宽`
  - 已真实通过状态栏设置按钮回到 `/settings?tab=editor`
  - 上述链路均未出现新增 console error

## 收口结论
`p0-01` 的 bundle scope 已真实完成，当前遗留的是更大的 0420 后续工程，不再是这条任务包本身的未完成项。因此本任务在 `2026-04-23` 收口为 `completed`。

## Out-of-Bundle Follow-ups
- authority model 深层字段与完整 round-trip 合同继续留给更大的 editor / rendering / migration 任务包
- `KeyboardShortcuts.ts`、IME 守卫、查找替换等更完整编辑器能力继续留给 `p0-03` 等后续 bundle
- GitNexus MCP 当前仍是 `fetch failed`，待外部环境恢复后再补自动 blast-radius 证据
