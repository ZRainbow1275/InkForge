# 0420 Wave 1 Current Truth

## Scope
- 本增补用于校正 `prompts/0420` 在 `2026-04-22` 这一轮实现后的当前真相。
- 它不替代原有 PRD / spec，而是为已经发生漂移的 editor/settings/workstation/hub 写作目标口径提供一份可执行补充。

## Editor
- 当前已真实落地的是 `Typora` / `Source` / `Preview` 三模式主链，不再是“仅有 Typora 设想、Source 尚未接线”的状态。
- `EditorPanel.vue` 继续承担 TipTap 主编辑器，但在写入链上已经把内容归一为 Markdown。
- `TyporaMode.ts` 负责 active line / decoration / HTML <-> Markdown 兼容转换，旧 HTML 记录仍可读取，但新的运行时真相以 Markdown 为权威。
- `EditorStatusBar.vue` 已具备模式切换、同步状态、保存状态、渲染耗时、基础统计；当工作站处于 `Preview` 模式时，会改用 fallback Markdown/HTML 统计并隐藏行列号，不再依赖 TipTap 实例。
- `EditorStatusBar.vue` 左侧已新增文稿状态 badge，当前运行时只识别 `draft / new / read / processed`，并通过 `open-document-status` 事件把点击交给 `WorkstationView.vue`。
- `MarkdownEditor.vue` / `CssEditor.vue` 当前继续沿用 `vue-codemirror`，但扩展值已按非深响应式方式传递；`EditorPanel.vue` 也已把 Source 面板从初始隐藏挂载改成按模式条件挂载，避免默认进入工作站时提前初始化 Source 编辑器。
- `MarkdownEditor.vue` 现已在外部文档切换时重建 CodeMirror 实例，清除错误的 undo 基线，避免 `Source` 模式下 `Ctrl+Z` 把整篇内容回退到 `# 开始写作...` 占位稿。
- `Preview` 模式现已是独立只读渲染层：进入前会先 flush 当前编辑内容，主区卸载 `EditorPanel`，改为纸张式 `MarkdownPreview` 壳层，不再把 TipTap 继续留在页面上“假只读”。

## Settings
- `stores/settings.ts` 已经是 settings 主链的单一真相源，包含 `editorMode`、`editorWidth`、feature flags、proxy、快捷键定义与 reset 能力。
- `stores/settings.ts` 已新增根级 `writingGoal` 配置，包含 `documentTarget / dailyTarget / weeklyTarget` 三层真实目标值，并在 schema 兼容旧数据与空值归一化。
- `SettingsView.vue` 当前仍保持 7 个 tab，但编辑器模式、版心宽度、快捷键搜索/分组/录制/重置、feature flags 与 proxy 预览都已进入真实 UI 链路。
- 编辑器设置中已新增 `Preview` 默认模式选项；快捷键默认值也已真实迁移为 `togglePreview = Ctrl+Shift+V`、`toggleEditorMode = Ctrl+\\`、`clearFormat = Ctrl+Alt+\\`，并对旧本地默认值做了兼容迁移。
- 写作目标当前没有新增独立 `Writing` tab；它被收口在 `Editor` tab 内，通过 `writing-goal-section` 暴露，并支持 `/settings?tab=editor&section=writing-goal` 直达。
- 本轮没有新增 `Advanced` 等额外 tab；feature flags / proxy 采用增强现有结构而非扩 tab 的方式落地。

## Hub
- `HubView.vue` 现已补入 `QuickActionFab` 的三入口链路：新建空白文档、从模板创建、导入文档。
- Hub 层新增 `Ctrl/Cmd+N`、`Ctrl/Cmd+Shift+N`、`Ctrl/Cmd+O` 和 `Ctrl/Cmd+F` 的本地快捷操作映射，用于空白新建、模板创建、导入与搜索聚焦。
- `TemplatePicker.vue` 与 `src/data/templates.ts` 已从 emoji 图标切换为已有图标库映射，模板创建后会直接生成真实文章并跳入 Workstation。
- `HubView.vue` 现已接入 `useSettingsStore` 与 `computeWritingWindowStats()`：当存在 `dailyTarget / weeklyTarget` 时，Workflow Progress 与 Quick Actions 信号会优先展示写作目标进度；若未配置写作目标，则回退到原有文章整理进度。
- `stores/editor.ts` 现已在加载已有内容、创建内容、更新正文、切换版本这些成功持久化边界同步回写 `article.rawContent/title` 快照，因此 Hub 的最近编辑摘要、按字数排序、Workflow Progress 与写作目标卡不会再停留在旧正文。
- `stores/article.ts`、`stores/editor.ts` 与 `HubView.vue` 现已形成一条增量 lifecycle 真值链：Hub 的空白创建 / 模板创建会显式写入 `status='draft'`，而编辑器在正文或标题真正持久化回 `article` 快照时，会把旧 `new/read` 文章提升为 `draft`，从而把“继续创作 / 未完成 / 草稿箱”从伪展示口径收口成真实状态锚点。
- 当前文章状态枚举仍是 `draft / new / read / processed` 四态兼容模型；`11-document-lifecycle-spec` 中的六态 FSM 仍属于目标设计，不应反向当作当前代码合同。
- `router/index.ts` 与 `views/DraftsView.vue` 现已补入独立 `/drafts` 路由，作为当前 `draft` 状态文稿的集中管理页；它直接复用现有 `articleStore`，不新建平行草稿 store。
- `HubView.vue` 当前已把“打开草稿箱”接入 `Quick Actions`，同时把“草稿箱”信号卡继续增强为真实预览入口：卡内会展示最近 3 篇真实 `draft` 的标题、相对更新时间与字数，并提供“继续最近草稿 / 查看全部草稿”两条直达链路，首页不再只有计数没有落点。
- `DraftsView.vue` 当前已在既有列表闭环上继续增强：除标题、摘要、更新时间、字数与分类外，还补入了关键词/分类/标签/活动性筛选、排序方向切换、摘要统计卡、30 天未更新提示、筛选空态与“清空筛选”收口，点击后仍通过既有 `/workstation?id=` 深链继续编辑。
- `/drafts` 当前严格只展示真实 `draft` 状态，不把 legacy `new/read` 混入列表；旧文稿仍通过首页“继续创作”兼容链路继续打开。
- `HubView.vue` 当前可见的总字数、文章瀑布流字数字段和“按字数”排序，现已统一改用 `computeContentWordCount()` 的纯正文口径，不再直接读取 Markdown 字符串长度。
- `HubView.vue` 的 Recent / 列表摘要现已通过 `extractContentPreviewText()` 做展示层纯文本投影；Markdown 真值仍保留在存储层，但首页不再把 `#`、列表符号、强调标记直接暴露给用户。
- Hero 现已在既有 `HubView.vue` 卡片框架内接入真实的“继续创作”入口：当前候选集仍保持 `status !== 'processed'` 的兼容边界，但排序会把 `draft` 放在最高优先级，其次兼容旧 `new/read` 文稿；若没有候选，则退化为“开始新文章”。
- `card-recent` 现已补入“未完成”列表，直接复用与 Hero 相同的未完成候选集并展示前 4 条；它和 Hero 一样优先显示 `draft`，同时兼容旧 `new/read` 文稿，点击条目会走既有 `openArticle(article.id)` 深链返回 Workstation，而不是新增第二套待办跳板。
- 第二屏现已真实渲染 8 个模板市场入口与 Quick Actions 聚合区；模板按钮直接复用现有 `handleTemplateSelect` 真链路，而不是新增空壳跳板。
- `card-recent` 底部现已显性补入“空白草稿 / 从模板创建”两个快速入口，Hub 不再只把创建能力藏在 Header/FAB 中。
- `QuickActionFab` 与 Header“快速创建”按钮已改为同一组 menu-button 语义，补入 `aria-expanded` / `aria-controls` / `aria-haspopup="menu"`、Esc 关闭、Arrow/Home/End 焦点移动与焦点回收。
- `InspirationCard` 已从旧的深色纹理卡收口为白底左红边的极简版式，保留 AI / 本地双来源逻辑，但视觉口径已更接近 0420 的 Hub 重设计要求。
- 原 `card-new` 没有被直接删除，而是按“不得删除现有模块”的约束重收口为“创作工具”卡：展示草稿/素材/连续创作天，并提供模板创建与导入文档两条真实操作链。
- Hub 小屏布局已针对真实浏览器截图做过一次响应式回修：Header 操作区允许换行、快捷键按钮在移动端压缩、`快速创建` 不再竖排，FAB 对首屏统计卡的遮挡也已减轻。
- Hero 在零数据时现已补入首屏 CTA，引导用户直接从空白或模板开始，不再只显示空柱状图和被动统计。

## Workstation
- 当前工作台真实布局仍是既有的 `Manager | Editor | Stage | Inspector` 结构，不是 0420 新 layout spec 中那套完整重构版。
- `WorkstationView.vue` 已消费 `editorMode` / `editorWidth`，并把保存状态、同步状态、渲染耗时接给状态栏。
- `WorkstationView.vue` 现已接入 `computeContentWordCount()` 与 `computeWritingWindowStats()`：状态栏中区会显示 `文稿 / 今日` 两个目标 pill，分别对应当前文稿与当日累计进度。
- 工作台目标统计对当前选中文章采用“持久化文章 + 当前编辑态覆盖”的双层口径：`Hub` 仍读取真实文章存量窗口，`Workstation` 则会用当前 `normalizedBody` 覆盖活动文章的 `rawContent`，确保未离页时状态栏进度即时刷新。
- `WorkstationView.vue` 当前把文稿状态 badge 定义为导航锚点而非状态切换器：`draft` 跳 `/drafts`，`new/read/processed` 代码上回 `Hub`。
- 状态 badge 路由前会先 best-effort `flushPendingChanges()`；本轮浏览器内探针已拿到 `called=1 / resolved=1 / rejected=0` 的真实运行时证据。
- 状态栏右区当前真实存在的是模式切换、同步状态、保存状态、渲染耗时和光标位置；独立 `ZoomControl / NotificationBell / SettingsEntryBtn` 仍未落地。
- 本轮继续收口快捷键读取和 `source` 模式行为，避免 Source 内部预览与外层 Stage 形成双预览冲突；`Hub -> 模板市场 -> Workstation` 默认进入与 `Typora <-> Source` 来回切换都已在真实浏览器里跑通，不再触发 `VueCodemirror` 的运行时崩溃。
- `WorkstationView.vue` 已新增 `lastNonPreviewMode` 持久化；进入 `Preview` 时会先调用 `editorPanelRef.flushPendingChanges()`，退出 `Preview` 时会回到上一次的非预览模式，而不是一律退回 `Typora`。
- `Preview` 模式下，主区会显示独立的 `preview-mode-shell`，`EditorPanel` 被真实卸载；右侧 Stage 预览栏不会重复出现额外预览实例，只保留与既有布局兼容的 Inspector 区。
- `WorkstationView.vue` 已新增本地 `modeLayouts` 布局快照：`typora / source / preview` 会分别记忆 `managerCollapsed`、`stageCollapsed`、`inspectorCollapsed` 三个面板状态；模式切换与刷新后都会恢复各自布局，其中 `Preview` 默认收起左栏，`Source` 默认保持 Stage 收起。
- `Focus Mode` 进入前会保存当前模式的布局快照，按 `F11` 或 `Esc` 退出时恢复该模式先前布局；它不再把三栏状态粗暴重置为“全部展开”。
- `EditorPanel.vue` 在从 store 水合旧正文、以及从 Source 投影 Markdown 回写 Typora 时，现已统一改用 `bodyEditor.commands.setContent(..., true)`；这会恢复 TipTap `update` 事件，从而让 `useTextStats` 和 `EditorStatusBar` 的字数 / 段落 / 阅读时间统计在程序化灌入正文后仍按真实内容刷新，而不是卡在初始化值。
- `HubView.vue -> /workstation?id=<articleId>` 的深链接选中文章链路现已补齐，工作站会在文章列表可用后按 query 中的 id 安全选中目标文章。
- `WorkstationView.vue`、`ExportModal.vue`、`FileManager.vue`、`CategoryPanel.vue`、`AddCategoryModal.vue`、`PreviewPanel.vue` 当前已把模板预设、平台、分类的可见 icon 渲染统一切到 `lucide-vue-next`，不再直接输出 emoji 图标。
- `AIPanel.vue` 与旧 `AppLayout.vue` 中残留的标题 emoji 也已在本轮收口为 `lucide-vue-next` 图标或纯文本，不再混用字符图标。
- `src/utils/iconography.ts` 已成为本轮 icon 兼容层：新写入数据使用稳定 key，旧分类/旧导出预设中的 emoji 值仍可通过映射继续显示为同等语义的图标组件。

## Editor Store
- `stores/editor.ts` 已在加载已有内容、创建内容、更新正文、创建版本、切换版本这些边界补入 Markdown 归一化逻辑。
- 运行时内存态与回写持久化态都优先收口到 Markdown；legacy HTML 记录在边界被兼容转换后再继续流转。

## Publish
- `PublishView.vue` 现已在进入 `marked()` 前先把 legacy HTML 输入归一为 Markdown，再生成发布 HTML，减少正文格式歧义。
- 发布链继续保留 `DOMPurify` 防线，并移除了页面内残留的 emoji 图标占位。
- 小红书 HTML / 纯文本导出与知乎 Markdown 导出链路中的标题装饰、列表标记、任务列表替代文案、质量检测 severity 图标都已收口到纯文本层次或 `lucide-vue-next`，不再在导出 UI 中输出 `✨ / 🌿 / ⚠️ / 💡` 之类 emoji 装饰。

## Validation Notes
- `pnpm --dir D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit` 已在本轮修复后再次通过。
- Playwright 已真实验证 `/settings?tab=editor&section=writing-goal` 可直接进入设置页的编辑器分区并定位到写作目标区；三项目标值刷新后仍保留，说明 query 状态和本地持久化已打通。
- Playwright 已真实验证 `Workstation` 状态栏目标 pill 会跳转到 `/settings?tab=editor&section=writing-goal`，`Source` 模式下输入真实 Markdown 后，状态栏中的当前文稿 / 今日进度会立即按纯文本口径刷新。
- Playwright 已真实验证 `Hub` 首页在存在写作目标配置时，会显示目标进度卡与“调整目标”入口；当前首页口径读取的是已持久化文章窗口统计，不会把仅停留在工作台内存态、尚未回写的正文误当成 Hub 已落盘结果，但已落盘正文现在会即时同步到 Hub 快照。
- Playwright 已真实验证 `Hub -> 空白开始 -> Workstation(Source) 输入真实 Markdown -> Ctrl+S/返回 Hub`：最近编辑摘要、首页字数、`今日写作目标` 与 `写作目标` 百分比都会随保存后的正文一起更新，原先停留在 `0 字 / 0%` 的漂移已消失。
- Playwright 已真实验证 Hub Hero 区可见“继续创作”，Recent 卡内可见“未完成”列表；两处都基于同一批真实文章状态派生，不依赖额外 mock 状态。
- Playwright 已真实验证 `Hub -> 空白草稿 -> Workstation -> 返回 Hub`：新建本地文稿不会再被 `selectArticle()` 误提升成 `已读`，Hero、Recent 卡与瀑布流都会显示 `草稿 · 刚才`，且 Hero 的“继续创作”会优先命中新建草稿。
- Playwright 已真实验证在生产预览态（`vite preview` / `http://127.0.0.1:3006/`）从零数据创建第一篇文章后，Hub 首屏显示 `1 篇文章 / 1 草稿`，证明该 lifecycle 锚点不依赖 dev server HMR。
- Playwright 已真实验证 `Hub -> 打开草稿箱 -> /drafts`：新页会列出刚创建的真实 `draft` 文稿，并显示 `刚才 / 0 字 / 最后更新日期` 等真实字段，而不是空壳占位。
- Playwright 已真实验证 Hub 首页“草稿箱”信号卡会渲染最近 3 篇真实 `draft` 预览；点击卡内任一预览项或“继续最近草稿”按钮后，会直接进入对应 `Workstation?id=...` 编辑页，且浏览器控制台无新增 error。
- Playwright 已真实验证从 `/drafts` 点击草稿卡片后，会重新进入既有 Workstation 编辑页，说明“创建草稿 -> 集中管理 -> 继续编辑”主链已经闭环。
- Playwright 已真实验证 `/drafts` 页内新增的筛选交互：输入一个不存在的关键词后会进入“当前筛选条件下没有匹配草稿”的真实空态，点击“清空筛选”后原始草稿列表会恢复。
- Playwright 已真实验证 `/drafts` 顶部新增的“继续最近草稿”入口，会直接回到对应 `Workstation?id=...` 编辑页，而不是停留在静态按钮展示。
- Playwright 已真实验证 `Hub -> 继续创作 -> Workstation -> 点击文稿状态 badge -> /drafts`；当前真实数据池仅覆盖 `draft` 分支，因此非 `draft` 的 Hub 回退分支仍只有代码真相，没有浏览器样本。
- Playwright 已真实验证 `Hub -> 继续创作 -> Workstation(旧文)`：旧文正文会被真实灌入 Typora，状态栏从原先错误的 `0 字 / 0 段` 恢复为真实统计（例如 `18 字 / 2 段 / 1 分钟`），且页面无新增 console error。
- Playwright 已真实验证在本地新建一篇仅含 Markdown 标题与正文的文章后，Hub 首页总字数、Recent 卡摘要区与底部文章列表都显示 `18 字`，证明首页字数已按纯正文口径统计，而不是按 `#`、空行等 Markdown 源串长度累加。
- Playwright 已真实验证同一篇文章在 Hub Recent 卡和底部列表中的摘要显示为 `旧文回流验证 这是一篇被重新编辑的旧文。`，不再直接显示 `# 旧文回流验证` 这类 Markdown 源串标记。
- Playwright 桌面链路已真实验证：`Hub 第二屏模板市场 -> 创建模板 -> 进入 Workstation -> Typora / Source 双模式切换` 全程无新的 console error。
- Playwright 桌面链路已追加验证：`Typora -> Preview -> Ctrl+Shift+V -> Typora`、`Source -> Preview -> Ctrl+Shift+V -> Source`、`Preview -> 返回编辑` 全部可用；`Preview` 模式下 `EditorPanel` 不再挂载，状态栏行列号会按预期隐藏。
- Playwright 桌面链路已追加验证：`Source` 中手动折叠左栏后切到 `Preview` 再切回 `Source`，原 `Source` 布局会被恢复；切到 `Typora` 后仍恢复 `Typora` 自己的布局，而不是继承 `Source` 的折叠状态。
- Playwright 桌面链路已追加验证：在 `Typora` 中折叠右栏后进入 `Focus Mode`，再按 `Esc` 退出时，`Typora` 先前的右栏折叠状态会恢复，不再被重置。
- Playwright 桌面链路已追加验证：刷新后重新进入 Workstation，当前 `editorMode` 与对应 `modeLayouts` 会从 `localStorage` 恢复；刷新后的 `Typora` 和 `Source` 布局状态与刷新前一致。
- Playwright 桌面链路已追加验证：在 `Source` 模式末尾输入字符后执行 `Ctrl+Z`，现只撤销最后输入，不再把文档回退到 `# 开始写作...` 占位稿。
- Playwright 桌面链路已追加验证：`/settings` 中编辑器设置已显示 `Preview` 选项，快捷键默认值真实显示为 `Ctrl+Shift+V`、`Ctrl+\\`、`Ctrl+Alt+\\`；当本地 `editorMode=preview` 时，重新进入 Workstation 会直接以 `Preview` 模式加载。
- Playwright 桌面链路已追加验证：`Workstation` 状态栏右区的版心控件可通过按钮与 `Ctrl+= / Ctrl+-` 在四档宽度间真实循环，设置按钮会跳转到 `/settings?tab=editor`，`Ctrl+Alt+T / S / P` 与 `Ctrl+\\ / Ctrl+Shift+\\ / Ctrl+Shift+V` 的模式切换链路全部生效。
- `stores/settings.ts` 已把 `table` 默认键位从与 `setTyporaMode` 冲突的 `Ctrl+Alt+T` 修正为 `Ctrl+Alt+Shift+T`，并在迁移逻辑中自动把旧本地配置提升级别，避免设置页继续出现应用内默认冲突。
- Playwright 桌面链路已追加验证：`Workstation -> 全屏导出 ExportModal` 可正常打开，平台切换条 / 预设卡 / 文件树分类、质量检测图标与小红书/知乎导出预览均已不再显示 emoji；当前 `document.body.innerText` 的符号扫描只剩 thesis 主题的 `★` 装饰字符。
- Playwright 移动端（iPhone 13 口径）已真实验证 Hub 第二屏与 Quick Actions 区块仍可完整渲染，当前截图留存在 `C:\Users\HP\Downloads\inkforge-hub-mobile-post-codemirror-fix-2026-04-21T16-24-18-310Z.png`。
- `vite.config.ts` 已补入 CodeMirror / `vue-codemirror` 的 dedupe 与 optimizeDeps 配置，用于消除 Vite 预构建导致的多实例模块链分裂；这是本轮 `Unrecognized extension value in extension set` 崩溃的已确认根因修复点。
- 当前这台机器上的 GitNexus MCP 仍返回 `fetch failed`，因此本轮没有拿到自动 `impact/detect_changes` 结果；实际 blast radius 只能用 Serena 定位目标文件、手工控制改动面，再配合 `typecheck/build/Playwright` 做真实回归。
- `vitest` 目前仍不是嵌套应用中的可用依赖，不能把“测试通过”当作本轮已完成事实。

## Follow-up
- 如果下一轮继续按 `0420` 推进，应优先补 authority model 分层、workstation layout 抽象与文档索引回写。
- 如果下一轮以稳定性为先，应先把现有 `settings.shortcuts` 与 `WorkstationView` 行为映射全部收口，再补小屏状态栏裁剪、平板断点回归，以及 Publish/Preview 共享渲染管线的统一验证。
