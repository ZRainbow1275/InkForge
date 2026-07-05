# 0420 Spec Driven Delivery Wave 1

## Goal
基于 `prompts/0420` 的总控文档与现有 `04-07` 核心任务线，完成一轮真实、可验证、无 mock 的前端增强交付。当前波次以编辑器主链和设置主链为核心，确保 `0420` 约束开始落到现有代码，而不是停留在文档层。

## Requirements
- 保持现有 Inkforge 设计语言、组件框架、路由结构和功能集合，不删除任何现有功能、模块或组件。
- 以 `04-07-p0-01-typora-editor` 与 `04-07-p1-07-settings-fullimpl` 为本轮实现主线，同时受 `prompts/0420` 的总控原则、验收矩阵和新增约束约束。
- 编辑器链至少覆盖：Typora/Source 模式切换、状态栏模式与保存/同步状态展示、编辑器宽度持久化、Workstation 对模式和专注模式的联动适配。
- 设置链至少覆盖：`editorMode` / `editorWidth` schema 持久化、快捷键分组与编辑组件化、feature flags 基础设施、代理配置基础设施。
- 写作目标链至少覆盖：`documentTarget / dailyTarget / weeklyTarget` 的真实持久化、`Settings -> Editor` 入口、`Workstation` 状态栏进度展示，以及 `Hub` 首页目标进度回显。
- 所有实现必须使用真实 store、真实本地持久化、真实组件联动，不允许用 mock 数据或空壳 UI 占位。
- 所有新 UI 禁止 emoji，图标仅使用已安装图标库或现有 SVG 风格。
- 本轮结束前必须同步更新与本轮实现直接相关的 docs/spec/task 文档，使其反映当前真实状态。

## Acceptance Criteria
- [x] `inkforge/src` 中形成可运行的 Typora/Source 双模式主链，且不破坏现有 Workstation 主流程。
- [x] `stores/settings.ts` 新增并持久化 `editorMode`、`editorWidth` 及本轮需要的 settings 字段。
- [x] `SettingsView.vue` 的快捷键与编辑器设置链路具备真实交互，不再只是“有 UI 无功能”。
- [x] 写作目标已形成 `Settings -> Workstation -> Hub` 的真实联动链路，并支持从状态栏返回设置目标区。
- [x] `Preview` 独立只读模式已接入 `Workstation` / `EditorStatusBar` / `Settings` 主链，并完成真实浏览器回归。
- [x] `Workstation` 状态栏文稿状态 badge 已形成真实导航链：`draft` 打开 `/drafts`，其他兼容态回 Hub，且跳转前会先 flush 当前编辑内容。
- [x] `Hub` 草稿箱信号卡已展示最近 3 篇真实 `draft` 预览，并支持“继续最近草稿 / 查看全部草稿”两条真实入口。
- [x] 本轮新增组件与扩展无 emoji、无 mock、无删除现有功能。
- [x] `pnpm -C inkforge exec vue-tsc --noEmit` 通过，或明确记录前置环境/依赖阻塞。
- [x] 相关 spec/task 文档已同步更新到“本轮真实实现状态”。
- [x] 当前机器上的 `gitnexus_detect_changes()` 仍返回 `fetch failed`，因此本轮以手工 scope 控制 + `vue-tsc` + `vite build` + Playwright 真实回归完成收口；自动影响分析保留为 GitNexus 恢复后的补充项，但不再阻塞 wave1 关闭。

## Implementation Update
- `EditorPanel.vue`、`EditorStatusBar.vue`、`WorkstationView.vue`、`extensions/TyporaMode.ts` 已形成真实的 `Typora/Source` 双模式链路。
- `extensions/TyporaMode.ts`、`stores/settings.ts`、`EditorStatusBar.vue`、`WorkstationView.vue` 现已把 `EditorMode` 扩展为 `typora | source | preview`，并补齐 `Preview` 独立只读模式的状态切换、返回上一个模式与快捷键接线。
- `EditorPanel.vue` 已把 Source 面板改为按模式条件挂载，避免默认进入工作站时隐藏挂载 `MarkdownEditor` 并提前初始化 `vue-codemirror`。
- `currentContent.body` 的运行时权威格式已按 Markdown 收口；对既有 HTML 记录继续通过 `TyporaMode` 中的兼容转换做归一化读取。
- `stores/editor.ts` 现已在加载已有内容、创建内容、更新正文、切换版本这些成功持久化边界同步回写 `article.rawContent/title` 快照；`HubView.vue` 的摘要、字数排序、Workflow Progress 与写作目标卡不再落后于 Workstation 已保存正文。
- `stores/article.ts`、`stores/editor.ts` 与 `HubView.vue` 现已形成一条增量 lifecycle 真值链：Hub 的空白创建 / 模板创建会显式写入 `status='draft'`，而编辑器在正文或标题真正持久化回 `article` 快照时，会把 legacy `new/read` 文章提升为 `draft`。
- `HubView.vue` 现已在既有 Hero 卡内接入真实“继续创作”入口，并在 Recent 卡中补入“未完成”列表；当前未完成集合仍兼容 `status !== 'processed'` 的旧边界，但排序已改为优先 `draft`，其次兼容旧 `new/read` 文稿，不额外引入第二套 Hub 状态机。
- `HubView.vue` 现已把首页总字数、文章列表字数字段与“按字数”排序统一切到 `computeContentWordCount()`，修复了首页仍按 Markdown 源串长度统计字数的口径漂移。
- `HubView.vue` 现已把 Recent / 列表摘要统一切到 `extractContentPreviewText()` 纯文本投影，修复了首页直接泄露 Markdown 标题标记的展示问题。
- `stores/settings.ts` 已扩展 `editorMode`、`editorWidth`、feature flags、proxy、快捷键定义与 reset 能力，作为本轮 settings 单一真相源。
- `stores/settings.ts` 已新增根级 `writingGoal`，并通过 schema 兼容旧值、空值和非法输入；`SettingsView.vue` 在 `Editor` tab 内新增写作目标 section，而不是额外扩出一个新 tab。
- `stores/settings.ts` 已为旧默认快捷键补入兼容迁移：`togglePreview = Ctrl+Shift+V`、`toggleEditorMode = Ctrl+\\`、`clearFormat = Ctrl+Alt+\\`。
- `stores/settings.ts` 已继续修正 0420 默认键位表中的应用内冲突：`setTyporaMode` 保持 `Ctrl+Alt+T`，而 `table` 改为 `Ctrl+Alt+Shift+T`；旧本地 `table=Ctrl+Alt+T` / `Cmd+Alt+T` 也会在迁移时自动提升为带 `Shift` 的新绑定。
- `SettingsView.vue` 已接通编辑模式、版心宽度、快捷键搜索/分组/录制/重置、feature flags 与 proxy 预览链路，并真实显示 `Preview` 默认模式选项及新的快捷键默认值。
- `EditorStatusBar.vue`、`WorkstationView.vue`、`HubView.vue` 已用真实文章内容窗口统计接通写作目标：工作台优先叠加当前编辑态的实时进度，Hub 读取持久化文章窗口并提供“调整目标”入口。
- `EditorStatusBar.vue` 当前已在左侧真实渲染文稿状态 badge，并通过 `open-document-status` 事件把点击路由到 `WorkstationView.vue`；当前运行时语义是导航入口而不是状态切换菜单。
- `WorkstationView.vue` 仍保留既有 `Manager | Editor | Stage | Inspector` 与 `Focus Mode` 结构，不做大重构；本轮只在现有框架内继续收口模式切换、快捷键和布局恢复行为。
- `WorkstationView.vue` 已新增 `lastNonPreviewMode` 持久化；进入 `Preview` 时会先调用 `editorPanelRef.flushPendingChanges()`，主区改为只读 `MarkdownPreview` 壳层，退出时返回上一次非预览模式。
- `WorkstationView.vue` 当前已把文稿状态 badge 路由规则收口为：`draft -> Drafts`，`new/read/processed -> Hub`；这条链使用现有 `articleStore` 与既有路由，不额外引入第二套状态流转器。
- `WorkstationView.vue` 已新增本地 `modeLayouts` 布局快照与 `switchEditorMode()` 收口逻辑：`typora / source / preview` 会分别记忆 `managerCollapsed`、`stageCollapsed`、`inspectorCollapsed`，切换前先保存当前模式布局，切换后恢复目标模式布局，刷新后也会从 `localStorage` 还原。
- `Preview` 默认布局现已明确为左栏收起、Stage 收起；`Source` 默认保持 Stage 收起，但不会继承 `Typora` 的三栏状态。
- `Focus Mode` 进入前会保存当前模式布局到恢复快照，按 `F11` 或 `Esc` 退出时恢复进入前的栏位状态，而不是把三栏统一重置为展开。
- `MarkdownEditor.vue` 已修复外部文档替换污染 undo 历史的问题，`Source` 模式下 `Ctrl+Z` 不再整篇回退到占位稿。
- `EditorPanel.vue` 现已把程序化 `setContent()` 的 `emitUpdate` 参数恢复为 `true`；旧文从 Hub 回流到 Workstation、以及 Source 向 Typora 回投时，`useTextStats` / `EditorStatusBar` 会按真实正文刷新统计，不再出现 `0 字 / 0 段` 假值。
- `src/utils/iconography.ts` 已补入导出预设 / 平台 / 分类 icon 的兼容映射层，新数据使用稳定 key，旧 emoji 数据继续可读。
- `WorkstationView.vue`、`ExportModal.vue`、`FileManager.vue`、`CategoryPanel.vue`、`AddCategoryModal.vue`、`PreviewPanel.vue` 已把当前可见 icon 渲染切换为 `lucide-vue-next` 组件，清理主流程里的 emoji 图标。
- `AIPanel.vue`、旧 `AppLayout.vue`、`services/export/xiaohongshu.ts`、`services/export/xiaohongshu-text.ts`、`services/export/zhihu-markdown.ts`、`services/export/quality-detector.ts` 已继续清理导出/发布链和残留面板中的 emoji 文案与 severity 符号，改为纯文本层次或图标库组件。
- `vite.config.ts` 已补入 CodeMirror / `vue-codemirror` 的 dedupe 与 optimizeDeps 收口配置，修复 Vite 预构建下 `@codemirror/view` 被拆成两条模块链后导致的运行时 `instanceof` 失效。
- Playwright 已真实验证 `Hub 第二屏模板市场 -> 创建模板 -> Workstation -> Typora / Source / Preview 切换` 主链，以及 `Workstation -> 全屏导出 ExportModal` 的图标渲染与小红书/知乎导出预览链路，无新的 console error。
- Playwright 已真实验证 `Settings -> 编辑器 -> Preview 默认模式` 与快捷键默认值展示；当本地 `editorMode=preview` 时，重新进入 Workstation 会直接以 `Preview` 模式加载。
- Playwright 已真实验证 `/settings?tab=editor&section=writing-goal` 深链接、三项写作目标的持久化刷新，以及工作台状态栏目标 pill 返回设置目标区的路由链。
- Playwright 已真实验证 `Source` 模式下输入字符后执行 `Ctrl+Z`，只撤销最后输入，不再回退到 `# 开始写作...`。
- Playwright 已真实验证 `Source -> Preview -> Source` 会恢复 Source 自己保存的布局，`Typora` 与 `Source` 布局彼此隔离，Typora 中折叠右栏后进入/退出 `Focus Mode` 能恢复进入前布局，刷新后 `editorMode + modeLayouts` 也会从 `localStorage` 恢复。
- Playwright 已真实验证 `Workstation` 状态栏右区的版心宽度按钮、`Ctrl+= / Ctrl+-`、设置入口按钮，以及 `Ctrl+Alt+T / S / P`、`Ctrl+\\ / Ctrl+Shift+\\ / Ctrl+Shift+V` 这组模式切换快捷键在生产预览态下都可真实生效。
- Playwright 已真实验证 `Hub -> 空白开始 -> Workstation(Source) 输入真实 Markdown -> Ctrl+S -> 返回 Hub`：最近编辑摘要、首页总字数与 `今日写作目标 / 写作目标` 百分比都会随保存后的正文同步更新，修复了原先 `0 字 / 0%` 的真实漂移。
- Playwright 已真实验证 `Hub` Hero 中的“继续创作”和 Recent 卡中的“未完成”列表都可见；点击“继续创作”进入旧文后，状态栏会显示真实统计（例如 `18 字 / 2 段 / 1 分钟`），不再卡在初始化值。
- Playwright 已真实验证 `Hub -> 空白草稿 -> Workstation -> 返回 Hub` 后，新建本地文稿会稳定显示为 `草稿 · 刚才`，Hero 的“继续创作”与 Recent 卡中的“未完成”也都会优先命中新建草稿，而不是把它误标成 `已读`。
- Playwright 已真实验证生产预览态（`vite preview` / `127.0.0.1:3006`）从零数据创建第一篇文章后，Hub 首屏会显示 `1 篇文章 / 1 草稿`，说明该 lifecycle 锚点不依赖 dev server HMR。
- `router/index.ts`、`views/DraftsView.vue` 与 `HubView.vue` 本轮已新增草稿箱最小闭环：独立 `/drafts` 路由、基于现有 `articleStore` 的真实草稿列表页，以及 Hub 中的“打开草稿箱 / 查看全部草稿”入口。
- `HubView.vue` 当前已把“草稿箱”信号卡继续增强为真实预览入口：显示最近 3 篇真实 `draft` 的标题、相对更新时间和字数，并提供“继续最近草稿 / 查看全部草稿”两条链路；数据源严格限定为 `status === 'draft'`。
- `DraftsView.vue` 当前只承接真实 `draft` 状态文稿，不引入新的 `useDraftsStore`；列表视图已补到可用管理页级别，包含标题、摘要、更新时间、字数、分类、关键词搜索、分类/标签/活动性筛选、排序方向切换、摘要统计卡、30 天未更新提示以及重新打开到 `Workstation` 的主链。
- Playwright 已真实验证 `Hub -> 打开草稿箱 -> /drafts -> 点击草稿卡片 -> Workstation`，说明这条新链路在生产预览态下可以端到端跑通。
- Playwright 已真实验证 Hub 首页草稿箱信号卡中的预览项与“继续最近草稿”按钮，都会直接进入对应 `Workstation?id=...` 编辑页，且浏览器控制台无新增 error。
- Playwright 已真实验证 `/drafts` 中输入不存在的关键词后会进入真实筛选空态，点击“清空筛选”后草稿列表恢复；顶部“继续最近草稿”入口也会直接回到对应 `Workstation?id=...` 编辑页。
- Playwright 已真实验证 `Hub -> 继续创作 -> Workstation -> 点击文稿状态 badge -> /drafts`；浏览器内探针同时证明点击前 `flushPendingChanges()` 的真实结果为 `called=1 / resolved=1 / rejected=0`。
- Playwright 已真实验证在本地新建一篇包含 Markdown 标题与正文的文章后，Hub 首页与文章列表均显示 `18 字`，说明首页字数已改为纯正文口径，不再直接累计 Markdown 标记字符。
- Playwright 已真实验证同一篇文章在 Hub Recent 卡与底部列表中的摘要已被纯文本化，显示为 `旧文回流验证 这是一篇被重新编辑的旧文。`，而不是原始 `# 标题` Markdown 源串。

## Out-of-Wave Follow-ups
- 以下事项属于更大 0420 体系或当前工具环境的后续项，不阻塞本 wave1 任务关闭：
- `prompts/0420/specs/13-workstation-layout-spec.md` 中更大规模的工作台抽象重构仍未整体落地；本轮完成的是在现有四栏结构内补齐 `Preview`、`modeLayouts` 和 `Focus Mode` 恢复链，而不是把整套 layout store / 预设系统一次性重写。
- authority model 中的 `markdownSource/htmlCache/sourceHash` 分层仍未全部完成；本轮只把运行时 Markdown 真值链继续收口到当前主流程。
- `14-statusbar-navigation-spec` 中设想的独立 `ZoomControl / NotificationBell / SettingsEntryBtn` 仍未作为真实状态栏控制项落地；本轮交付的是文稿状态 badge 导航与当前右区已存在字段的真值回写。
- 文稿状态 badge 的非 `draft` 分支当前只有代码真相，没有浏览器样本；原因是本轮真实数据池里只有 `draft` 文稿，因此不能把“非 draft 点击后回 Hub”写成已完成的端到端回归。
- 当前这台机器上的 GitNexus MCP 仍返回 `fetch failed`，因此本轮没有拿到自动 `impact/detect_changes` 结果；实际 blast radius 只能用 Serena 定位目标文件、手工控制改动面，再配合 `typecheck/build/Playwright` 做真实回归。
- 当前环境的 `vitest` 仍未在嵌套应用依赖中可用，本轮不能伪造单测通过，只能以类型检查和真实链路联调为主。

## Technical Notes
- 总控文档：`prompts/0420/README.md`、`prompts/0420/00-master-plan.md`、`prompts/0420/00-task-roadmap.md`、`prompts/0420/acceptance-matrix.md`
- 子任务文档：`.trellis/tasks/04-07-p0-01-typora-editor/prd.md`、`.trellis/tasks/04-07-p1-07-settings-fullimpl/prd.md`
- 重点代码入口：`inkforge/src/components/editor/EditorPanel.vue`、`inkforge/src/components/editor/EditorStatusBar.vue`、`inkforge/src/views/WorkstationView.vue`、`inkforge/src/views/SettingsView.vue`、`inkforge/src/stores/settings.ts`
- 外部实践参考：Tiptap custom extension / ProseMirror plugin / selection update 模式，以及 `vue-codemirror` 的受控编辑器模式
