> 生成日期: 2026-04-21
> 版本: v2.1.0-draft
> 说明: 本文件为 InkForge v2.1 全部功能模块的验收矩阵总表，供开发完成后逐项核对

# InkForge v2.1 — 验收矩阵总表

---

## 使用说明

- **AC 数量**：各模块关键验收条件（Acceptance Criteria）估算数量，基于对应 Spec 内容
- **测试矩阵条数**：对应 Spec 中测试矩阵（Test Matrix）的用例条数估算
- **验收方式**：Auto = 可机器自动验证；Manual = 需人工测试；E2E = 端对端测试
- **验收状态**：Pending = 待验收；Pass = 已通过；Fail = 未通过；N/A = 不适用

## 2026-04-22 Wave 1 实装注记

- `Typora 模式编辑器`、`设置面板`、`Workstation 布局`、`导出与发布`、`Markdown 权威模型` 相关代码在本轮已有真实增量落地，不再是“纯 spec 未接线”状态。
- `stores/settings.ts`、`SettingsView.vue`、`WorkstationView.vue`、`EditorStatusBar.vue`、`HubView.vue` 现已形成一条真实的写作目标链：`documentTarget / dailyTarget / weeklyTarget` 可配置、可持久化，并能驱动工作台状态栏与 Hub 目标卡。
- `stores/editor.ts` 现已在正文成功持久化后同步回写 `article.rawContent/title` 快照，`HubView.vue` 的最近编辑摘要、按字数排序、首页总字数与写作目标卡不再读取陈旧正文。
- `HubView.vue` 现已在 Hero 内接入真实“继续创作”入口，并在 Recent 卡中补入“未完成”列表；两者都复用当前真实文章集的未完成筛选结果，而不是额外发明 Hub 专属状态。
- `ARTICLE_STATUS` 现已增量补入 `draft`，Hub 的空白创建 / 模板创建会直接落到 `draft`；`stores/editor.ts` 在正文或标题真正持久化回 `article` 快照时，也会把 legacy `new/read` 文稿提升到 `draft`，从而把“继续创作 / 未完成 / 草稿箱”的口径从展示推断收口成真实状态锚点。
- `HubView.vue` 现已把首页总字数、瀑布流字数字段与“按字数”排序统一切到 `computeContentWordCount()` 纯正文口径，不再把 Markdown 标记字符误算进首页统计。
- `HubView.vue` 现已把 Recent / 列表摘要统一切到 `extractContentPreviewText()` 的纯文本投影，不再把 Markdown 标题标记直接显示在 Hub 首页。
- `Preview` 独立只读模式已真实接入 `Workstation` 与 `EditorStatusBar`：进入前先 flush 当前 Markdown 真值，主区卸载 `EditorPanel`，退出时回到上一次非预览模式。
- `EditorPanel.vue` 现已在程序化水合旧正文与 Source 回投 Typora 时统一使用 `setContent(..., true)`，从而恢复 `update` 事件驱动链；这使得从 Hub 打开旧文后，`EditorStatusBar` 的字数/段落/阅读时间不再卡在 `0`。
- `EditorStatusBar.vue` 与 `WorkstationView.vue` 现已形成文稿状态 badge 导航链：点击前会先 flush 当前编辑内容，`draft` 实测跳 `/drafts`，其他兼容态代码上回 Hub；这还不足以视为 `14-statusbar-navigation-spec` 全量完成。
- `WorkstationView.vue` 已新增本地 `modeLayouts` 布局快照：`typora / source / preview` 会分别记忆 `managerCollapsed`、`stageCollapsed`、`inspectorCollapsed`，模式切换与刷新后都会恢复各自布局；其中 `Preview` 默认收起左栏，`Source` 默认保持 Stage 收起。
- `Focus Mode` 现在会在进入前保存当前模式的布局快照，按 `F11` 或 `Esc` 退出时恢复进入前的栏位状态，不再把三栏粗暴重置为“全部展开”。
- `Hub 首页布局` 本轮已从单一新建入口扩展到空白 / 模板 / 导入三入口，并把空白草稿 / 模板创建显性补入 `card-recent` 与 `QuickActionFab`。
- 本轮已补齐一组可复现的真实验证：`pnpm --dir D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit` 通过；Playwright 已验证 `Hub 第二屏模板市场 -> Workstation -> Typora / Source / Preview` 主链、`Typora/Source <-> Preview` 双向切换、`Source -> Preview -> Source` 保持 Source 自己的布局、`Typora` 与 `Source` 布局隔离、Typora 中折叠右栏后进入/退出 `Focus Mode` 可恢复原布局、刷新后 `editorMode + modeLayouts` 可从 `localStorage` 恢复；Settings 中 `Preview` 默认模式与三组快捷键默认值展示也已验证，移动端第二屏仍可渲染。
- Playwright 还已验证 `Workstation` 状态栏右区新增的版心宽度控制与设置入口：左右按钮和 `Ctrl+= / Ctrl+-` 会真实切换 `560 / 680 / 860 / full` 四档版心，设置按钮会跳转到 `/settings?tab=editor`；同时已修复默认键位表中 `Ctrl+Alt+T` 的应用内重复绑定，表格插入默认键位改为 `Ctrl+Alt+Shift+T`。
- Playwright 还已验证 `/settings?tab=editor&section=writing-goal` 深链接、写作目标输入值刷新后保留、以及工作台状态栏目标 pill 跳转回写作目标区；该链路不依赖 mock 数据或临时假状态。
- Playwright 还已验证 `Hub -> 空白开始 -> Workstation(Source) 输入正文 -> Ctrl+S -> 返回 Hub`：字数从 `56` 增长到 `69`、最近编辑摘要更新、`今日写作目标` 从 `2%` 增长到 `3%`，证明正文 authority 已真实贯通到首页统计。
- Playwright 还已验证 Hub Hero 可见“继续创作”、Recent 卡可见“未完成”，点击“继续创作”进入旧文后状态栏显示真实统计（如 `18 字 / 2 段 / 1 分钟`），不再出现“预览区有正文但状态栏仍是 0”的漂移。
- Playwright 还已验证 `Hub -> 空白草稿 -> Workstation -> 返回 Hub` 后，新建文稿状态显示为 `草稿 · 刚才`，Hero 的“继续创作”与 Recent 卡中的“未完成”都会优先命中新建草稿，而不是把它错误标成 `已读`。
- Playwright 还已验证生产预览态（`vite preview` / `127.0.0.1:3006`）从零数据创建第一篇文章后，Hub 首屏会显示 `1 篇文章 / 1 草稿`，说明该 lifecycle 锚点不依赖 dev server HMR。
- `草稿箱` 本轮已从最小真实闭环继续增强为可用管理页：`/drafts` 路由、`DraftsView.vue` 列表视图、Hub 中的“打开草稿箱”入口、草稿箱信号卡内最近 3 篇真实 `draft` 预览与“继续最近草稿 / 查看全部草稿”入口、关键词/分类/标签/活动性筛选、排序方向切换、摘要统计卡，以及从草稿箱重新进入 Workstation 的继续编辑链路。
- Playwright 还已验证 `Hub -> 打开草稿箱 -> /drafts -> 点击草稿卡片 -> Workstation`，说明草稿集中管理页不是静态占位，而是接在真实 `draft` 数据源之上。
- Playwright 还已验证 Hub 首页草稿箱信号卡中的预览项与“继续最近草稿”按钮都会直接进入对应 `Workstation?id=...`，说明首页草稿入口不再只是跳转 `/drafts` 的单一兜底按钮。
- Playwright 还已验证 `/drafts` 中输入不存在的关键词后会进入真实筛选空态，点击“清空筛选”后列表恢复；顶部“继续最近草稿”入口也能直接回到对应 `Workstation?id=...` 页面。
- Playwright 还已验证新建一篇包含 Markdown 标题与正文的文章后，Hub 首页与文章列表都显示 `18 字`，说明首页已按纯正文统计，而不是按 Markdown 源串长度显示伪字数。
- Playwright 还已验证同一篇文章在 Hub Recent 卡与底部列表中的摘要会去除 `#` 等 Markdown 标记，展示为纯文本片段。
- `MarkdownEditor.vue` 本轮已修复外部文档替换污染 undo 历史的问题；现在 `Source` 模式下 `Ctrl+Z` 只会撤销最后输入，不再把正文回退到 `# 开始写作...` 占位稿。
- 本轮已把当前主流程里的模板预设、平台、分类 icon 从 emoji 文本迁移到 `lucide-vue-next` 组件渲染，并通过兼容映射保留旧数据可见性，不删除既有功能；导出与发布链路中的小红书/知乎装饰文案、质量检测 severity 图标、AIPanel 与旧 AppLayout 残留字符图标也已继续收口为纯文本或图标库组件。
- `vite.config.ts` 现已补入 CodeMirror / `vue-codemirror` 的去重与预构建收口配置，用于修复 Vite 预构建导致的多模块实例分裂；这属于本轮真实消除而非规避的运行时 blocker。
- 本矩阵当前仍统一保留 `Pending`，原因不是这些模块完全未做，而是 v2.1 全量验收尚未完成，尤其是统一 GitNexus 影响范围复核、`vitest` 测试面与更大范围的三端回归尚未补齐。
- 当前这台机器上的 GitNexus MCP 仍返回 `fetch failed`，因此本轮只能用 Serena 收口改动范围并以 `typecheck/build/Playwright` 做真实回归；矩阵中的 GitNexus 相关门禁仍视为未完成项。
- 具体代码真相请结合 `prompts/0420/specs/00-wave1-current-truth.md` 一起阅读，避免把 `Pending` 误读为“尚未开始实现”。

---

## 功能模块验收矩阵

### P0 核心模块

| 模块 | 对应 Spec | 核心 AC 数量 | 测试矩阵条数 | 主要验收方式 | 验收状态 |
|------|-----------|-------------|-------------|-------------|---------|
| Typora 模式编辑器 | `01-spec-editor-typora` | 25+ | 40+ | Auto + E2E | Pending |
| Hub 首页布局 | `02-spec-hub-layout` | 15+ | 20+ | Auto + E2E | Pending |
| 渲染引擎核心 | `04-spec-rendering-core` | 18+ | 30+ | Auto + Manual | Pending |
| 键盘快捷键 | `03-keyboard-shortcuts-spec` | 20+ | 35+ | Auto + E2E | Pending |
| 浮动工具栏 | `05-toolbar-complete-spec` | 12+ | 18+ | E2E + Manual | Pending |
| UI 视觉打磨 | `09-spec-ui-polish` | 10+ | 15+ | Manual + Auto | Pending |
| Markdown 权威模型 | `10-markdown-authority-spec` | 15+ | 25+ | Auto | Pending |
| 编辑器键盘映射 | `49-editor-keymap-spec` | 8+ | 12+ | Auto + E2E | Pending |
| 智能标点 | `50-smart-punctuation-spec` | 6+ | 10+ | Auto | Pending |
| Markdown 扩展 | `16-markdown-extensions-spec` | 10+ | 18+ | Auto | Pending |

### P1 功能模块

| 模块 | 对应 Spec | 核心 AC 数量 | 测试矩阵条数 | 主要验收方式 | 验收状态 |
|------|-----------|-------------|-------------|-------------|---------|
| 文档生命周期 | `11-document-lifecycle-spec` | 20+ | 30+ | Auto + E2E | Pending |
| 文件管理器 | `12-file-manager-spec` | 15+ | 22+ | E2E + Manual | Pending |
| Workstation 布局 | `13-workstation-layout-spec` | 8+ | 12+ | E2E | Pending |
| 状态栏导航 | `14-statusbar-navigation-spec` | 6+ | 8+ | E2E | Pending |
| 导出与发布 | `15-export-publish-spec` | 12+ | 18+ | Auto + Manual | Pending |
| 主题与排版 | `20-theme-font-typography-spec` | 10+ | 14+ | Manual + Auto | Pending |
| 专注写作辅助 | `21-focus-writing-assist-spec` | 6+ | 8+ | E2E | Pending |
| 命令面板 | `22-command-palette-spec` | 10+ | 16+ | Auto + E2E | Pending |
| 账户认证 | `06-account-auth-spec` | 15+ | 20+ | Auto + Manual | Pending |
| 设置面板 | `07-settings-full-spec` | 20+ | 25+ | E2E | Pending |
| 数据洞察 | `08-data-insights-spec` | 8+ | 12+ | Auto + E2E | Pending |
| FTUE 与帮助 | `19-ftue-help-spec` | 6+ | 8+ | E2E + Manual | Pending |
| 全文搜索 | `29-search-engine-spec` | 12+ | 20+ | Auto + E2E | Pending |
| 回收站 | `30-trash-recycle-spec` | 8+ | 10+ | E2E | Pending |
| 版本快照 | `31-version-bundle-spec` | 10+ | 15+ | Auto + E2E | Pending |
| 批注 Review | `32-comment-review-spec` | 8+ | 12+ | E2E | Pending |
| 分屏视图 | `35-split-view-spec` | 6+ | 8+ | E2E | Pending |
| Wiki 双向链接 | `36-wiki-link-spec` | 8+ | 12+ | Auto + E2E | Pending |
| 代码片段系统 | `37-snippet-system-spec` | 6+ | 10+ | E2E | Pending |
| TOC 目录系统 | `38-toc-system-spec` | 6+ | 8+ | Auto + E2E | Pending |
| 同步滚动 | `39-sync-scroll-spec` | 5+ | 8+ | E2E | Pending |
| 文档模板 | `42-templates-spec` | 8+ | 10+ | E2E | Pending |
| 草稿箱 | `43-drafts-box-spec` | 5+ | 6+ | E2E | Pending |

> 注：`43-drafts-box-spec` 当前已完成列表态真实管理闭环，并补入多维筛选、摘要统计、筛选空态，以及 Hub 首页草稿箱信号卡的最近 draft 预览与继续编辑入口；但完整 spec 中的网格视图、Peek、批量操作、Sidebar 角标、settings 持久化等仍未完成，因此总状态暂不提升为 `Pass`；同时本轮真实数据池只有 `draft`，所以 `/drafts` 的 E2E 仍只覆盖 draft 数据与 draft 路由回流。
> 注：`11-document-lifecycle-spec` 当前只完成 `draft` 增量态落地与 legacy `new/read -> draft` 的兼容回流，完整 6 态 FSM、Scope、回收站、frontmatter/DB 契约仍未完成，因此总状态保持 `Pending`。
> 注：`14-statusbar-navigation-spec` 当前只完成文稿状态 badge 导航、模式切换、同步/保存状态、渲染耗时与光标信息；`ZoomControl / NotificationBell / SettingsEntryBtn` 仍未作为独立状态栏控制项落地，因此总状态保持 `Pending`。
| 标签栏增强 | `45-tabbar-enhancement-spec` | 6+ | 8+ | E2E | Pending |
| 拖拽排序 | `46-draggable-ordering-spec` | 6+ | 8+ | E2E | Pending |
| 标签系统 | `47-tag-system-spec` | 8+ | 12+ | Auto + E2E | Pending |
| 多账户 Profile | `26-multi-account-profile-spec` | 10+ | 14+ | E2E + Manual | Pending |
| 插件扩展 | `25-extension-plugin-spec` | 10+ | 15+ | Auto + Manual | Pending |

### 基础设施模块

| 模块 | 对应 Spec | 核心 AC 数量 | 测试矩阵条数 | 主要验收方式 | 验收状态 |
|------|-----------|-------------|-------------|-------------|---------|
| 崩溃恢复 | `17-crash-recovery-spec` | 10+ | 15+ | Auto + Manual | Pending |
| Tauri 桌面能力 | `18-tauri-desktop-spec` | 12+ | 18+ | Manual + E2E | Pending |
| 同步提供者 | `23-sync-provider-spec` | 12+ | 20+ | Auto + Manual | Pending |
| 权限审计 | `24-permission-audit-spec` | 8+ | 12+ | Auto | Pending |
| 资源管道 | `28-asset-pipeline-spec` | 8+ | 12+ | Auto + E2E | Pending |
| 诊断日志 | `33-diagnostic-logging-spec` | 8+ | 10+ | Auto | Pending |
| 布局持久化 | `34-layout-persistence-spec` | 6+ | 8+ | E2E | Pending |
| 开发者面板 | `40-dev-panel-spec` | 5+ | 6+ | Manual | Pending |
| 设置迁移 | `41-settings-migration-spec` | 8+ | 10+ | Auto | Pending |
| 会话恢复 | `48-session-restore-spec` | 6+ | 8+ | E2E | Pending |
| 自定义 CSS | `54-custom-css-spec` | 5+ | 8+ | Manual + Auto | Pending |
| 自动更新 | `55-updater-spec` | 6+ | 8+ | Manual | Pending |

---

## 全局铁律验收

| 铁律编号 | 内容摘要 | 覆盖 Spec | 验证方法 | 验收状态 |
|----------|----------|-----------|---------|---------|
| R-01 | Markdown 源文件是唯一真值，渲染层不得反向修改 | 10, 01-spec-editor, 04, 15, 16 | 对所有写入路径执行自动化测试：写入→读取→对比哈希 | Pending |
| R-02 | 任何操作链路不得出现无法追溯的数据丢失 | 10, 11, 17, 23, 27 | 模拟断电/崩溃场景，验证 WAL 完整性 | Pending |
| R-03 | 文档状态六态机（目标态）转移规则完整 | 11, 12 | 状态机覆盖率测试，验证全部合法转移路径 | Pending |
| R-04 | Scope 五层模型（Device/Workspace/Folder/Document/Block）层级隔离 | 11, 26 | 跨 Scope 操作越界测试 | Pending |
| R-05 | Frontmatter 变更必须经过 Schema 校验，拒绝非法字段 | 10, 11 | Fuzzing 测试 Frontmatter 解析边界 | Pending |
| R-13 | 渲染产物（HTML/PDF）不得混入编辑状态 | 04, 15 | 渲染后重新解析，对比原始 Markdown，差异为零 | Pending |
| R-14 | AST 变换必须可逆，roundtrip 误差为零 | 10, 04, 01-spec-editor | Markdown→AST→Markdown roundtrip 自动化测试 | Pending |
| R-15 | 输入延迟 0ms 感知，保存 ≤ 1s，导出 ≤ 3min | 27（全局闸门） | CI Lighthouse + 自动化 perf 基准 | Pending |
| R-16 | 数据落盘后才给用户反馈，不允许乐观写入后静默失败 | 11, 17, 23 | 模拟写盘失败，验证用户是否收到正确错误提示 | Pending |
| R-17 | 回收站 30 天软删除，永久删除须二次确认 | 30, 11 | 删除操作 + 30 天倒计时 + 二次确认弹窗 E2E | Pending |
| R-18 | 版本快照策略：每次保存点 + 每日快照 + 手动快照 | 31, 11 | 快照触发时机覆盖测试 | Pending |
| R-21 | 快捷键不与 OS 冲突，自定义键位须经过冲突检测 | 03, 49 | 遍历所有注册快捷键，执行 OS 级冲突检测 | Pending |
| R-22 | 和弦（Chord）快捷键超时 500ms 自动取消，不阻塞输入 | 03, 49 | Chord 超时场景 E2E + 输入延迟测试 | Pending |

---

## 性能 SLO 验收

（依据 `27-performance-slo-spec.md` 定义，以下为核心硬指标）

| 指标 | 目标值 | 降级阈值 | 测量方法 | 对应 Spec | 验收状态 |
|------|--------|---------|---------|-----------|---------|
| 输入延迟（keystroke→DOM） | ≤ 16ms（1 帧）| ≤ 32ms（2 帧，触发 warn） | Chrome DevTools Performance + Playwright trace | 27, 01-spec-editor | Pending |
| 自动保存延迟 | ≤ 1s | ≤ 2s（降级模式） | 自动化计时：keydown → IndexedDB commit 完成 | 27, 17 | Pending |
| 冲突检测延迟 | ≤ 10s | ≤ 30s（降级提示） | 模拟两端并发修改，计时检测 | 27, 23 | Pending |
| 导出（PDF/EPUB）完成时间 | ≤ 3min（50 页文档） | ≤ 5min（降级提示） | 标准测试文档 E2E 计时 | 27, 15 | Pending |
| Hub 首页首屏渲染（FCP） | ≤ 1.5s（冷启动） | ≤ 2.5s（降级） | Lighthouse CI（本地） | 27, 02-spec-hub | Pending |
| 编辑器大文档加载（10 万字） | ≤ 800ms | ≤ 1.5s（分片渲染降级） | 标准大文档加载 E2E 计时 | 27, 01-spec-editor | Pending |
| 全文搜索响应时间（本地） | ≤ 200ms（1 万篇） | ≤ 500ms（异步降级） | 模拟 1 万篇索引，搜索计时 | 27, 29 | Pending |
| Bundle 体积（初始加载） | ≤ 500KB gzip | ≤ 800KB（CI 警告） | webpack-bundle-analyzer + CI 体积门限 | 27 | Pending |
| 内存占用（长时间写作 2h） | ≤ 300MB RSS | ≤ 500MB（触发 GC 提示） | Tauri 进程内存监控 | 27, 01-spec-editor | Pending |
| 崩溃恢复时间（重启到数据还原） | ≤ 5s | ≤ 10s（降级提示） | 模拟崩溃 + 重启计时 | 27, 17, 48 | Pending |

---

## 安全与隐私验收

| 检查项 | 要求 | 覆盖 Spec | 验证方法 | 验收状态 |
|--------|------|-----------|---------|---------|
| 自定义 CSS 沙箱隔离 | 用户 CSS 不得影响 UI 框架层（Tailwind/Vue 组件） | 54 | 注入恶意 CSS，验证 UI 框架样式不变 | Pending |
| 插件沙箱隔离 | 插件 JS 不得访问主进程 API（Tauri invoke 白名单以外） | 25 | 插件越权测试 | Pending |
| 高危操作二次认证 | 永久删除/账户切换/清空数据库须经过二次确认 | 06, 30 | E2E 验证二次确认弹窗不可绕过 | Pending |
| 审计日志完整性 | 所有权限越界操作必须记录到审计日志，不可清除 | 24, 33 | 越权操作后检查审计表记录 | Pending |
| 同步数据哈希校验 | 同步数据接收后必须校验哈希，不匹配触发 critical 日志 | 23, 33 | 篡改同步包哈希，验证错误处理 | Pending |

---

## 无障碍验收（WCAG 2.1 AA）

| 检查项 | 标准 | 覆盖 Spec | 验证方法 | 验收状态 |
|--------|------|-----------|---------|---------|
| 色彩对比度 | AA 级（4.5:1 文本，3:1 大文本） | 09, 20 | axe-core 自动扫描 + 手工检查 | Pending |
| 键盘完全可操作 | 所有功能可纯键盘完成，焦点顺序逻辑 | 03, 09 | 键盘 TAB 遍历 + 焦点顺序自动化测试 | Pending |
| 屏幕阅读器兼容 | ARIA 标签完整，动态内容有 aria-live 区域 | 09, 01-spec-editor | NVDA/VoiceOver 手工测试 | Pending |
| 减少动效（prefers-reduced-motion） | 检测到该偏好时禁用非必要动效 | 09, 20 | 媒体查询自动化测试 | Pending |

---

## 验收完成标准

满足以下全部条件时，认定 InkForge v2.1 通过整体验收：

1. 所有 P0 模块验收状态为 Pass
2. 全部 13 条铁律验收状态为 Pass
3. 全部 10 条性能 SLO 指标达到目标值（不允许停留在降级阈值）
4. 安全与隐私 5 项均为 Pass
5. 无障碍 4 项均为 Pass
6. P1 模块验收状态为 Pass 或有书面记录说明延期原因
7. `gitnexus_detect_changes()` 确认变更范围与预期一致

## 2026-04-30 Spec 10 Baseline 验收注记

`10-markdown-authority-spec` 的 baseline slice 已完成并通过真实验证：Article 权威字段、authority helper、store/repository 写入读取更新、敏感字段加密覆盖、浏览器 SHA-256/htmlCache/frontmatter 自检与 Pinia/Dexie 自检均已落地。

全局矩阵中 Spec 10 与 R-01/R-05/R-14 仍保持 Pending，不在本轮改为 Pass，原因是完整验收还要求 19 元素黄金样本、round-trip fuzz、所有 exporter/search/AI 输入迁移、activity_logs、版本历史 authority bundle、integrity worker、恢复 UI 与性能 SLO。

## 2026-04-30 Spec 11 Baseline 验收注记

`11-document-lifecycle-spec` 的 compatible baseline 已完成：目标六态定义、legacy 兼容、`draft -> writing` 实质内容提升、authority-preserving store update、Hub/Drafts/Workstation/FileManager 状态显示与导航兼容、真实浏览器 Pinia/Dexie 自检均已落地。

全局矩阵中 Spec 11 与 R-02/R-03/R-04/R-16/R-17/R-18 仍保持 Pending，不在本轮改为 Pass，原因是完整验收仍要求 13 表 DB schema、五层 Scope、Windows Hello 守卫、回收站 TTL、版本快照策略、events 审计表、崩溃恢复和完整 E2E。


## 2026-04-30 Spec 12 Baseline 验收注记

`12-file-manager-spec` 的 compatible baseline 已完成：现有 FileManager 保留真实 article/category/asset store 链路，并新增 `tree / flat / recent` 视图、排序字段与方向、生命周期 SmartFolder-style 筛选、全状态 badge、局部 UI 偏好持久化和坏 JSON 防御回退。

本轮真实验证包括：`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 均通过；本地 Vite `/workstation` 浏览器运行时无 console error；通过真实 Pinia store 写入并清理 5 篇不同生命周期状态的 IndexedDB 文章，确认状态计数、筛选、视图切换和偏好持久化生效。

全局矩阵中 Spec 12 与 R-17/R-21 仍保持 Pending，不在本轮改为 Pass，原因是完整验收仍要求 `folder` 面包屑视图、虚拟滚动、多选批量、拖拽排序、SmartFolder Repository/IndexedDB 表、回收站 TTL、归档视图、完整键盘导航、1000 节点性能和对应 E2E。


## 2026-04-30 Spec 13 Baseline 验收注记

`13-workstation-layout-spec` 的 compatible baseline 已完成：Workstation 保留现有四区结构与真实编辑链路，并新增默认/写作/审阅/专注布局预设、面板宽度 CSS 变量、`inkforge.workstation.panelWidths` 防御式偏好持久化，以及预设到现有折叠状态和 focus-mode 的真实联动。

本轮真实验证包括：`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 均通过；本地 Vite `/workstation` 浏览器运行时无 console error；写作预设、审阅预设、专注预设、CSS 变量、localStorage 写入和坏 JSON 回退均已验证。

全局矩阵中 Spec 13 与 R-15/R-21 仍保持 Pending，不在本轮改为 Pass，原因是完整验收仍要求拖拽 ResizeHandle、键盘调整 ResizeHandle、右栏 reference/split-compare、独立 Workstation store、响应式自动折叠、TabBar 拖拽与跨窗口、TOC 拖拽重排、分屏比较、1000 节点/布局性能和 Spec 34 IndexedDB 持久化。


## 2026-04-30 Spec 14 Baseline 验收注记

`14-statusbar-navigation-spec` 的 compatible baseline 已完成：状态栏文档 badge 复用 `src/core/lifecycle`，覆盖目标六态与 legacy 状态，并保留当前 `flushPendingChanges -> draft-like 去 Drafts / 其他回 Hub` 的真实导航合同。

本轮真实验证包括：`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 均通过；本地 Vite `/workstation` 浏览器运行时无 console error；通过真实 Pinia store 写入并清理 6 篇不同生命周期状态的 IndexedDB 文稿，确认状态栏 badge 标签、class 和 title 生效。

全局矩阵中 Spec 14 与 R-02/R-16/R-21 仍保持 Pending，不在本轮改为 Pass，原因是完整验收仍要求状态转换菜单、独立 DocumentStatusBadge、通知铃铛、Sonner Toast 栈、撤销框架、独立 ZoomControl、TabBar 拖拽/固定/悬停预览/中键关闭、dirty 指示、关闭确认和完整 E2E。


## 2026-04-30 Spec 15 Baseline 验收注记

`15-export-publish-spec` 的 compatible baseline 已完成：当前 `ExportModal.vue` 保留三平台真实导出链路，并新增真实预检区、平台原生产物区、native copy/download、剪贴板能力探测、复制进行中/失败反馈、Blob 下载失败反馈，以及“直连发布未配置真实 API 授权”的显性阻断说明。

本轮真实验证包括：`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 均通过；本地 Vite `/workstation` 浏览器运行时无 console error；通过真实 Pinia store 写入并清理 1 篇 IndexedDB 文稿，确认微信公众号、小红书、知乎三平台的预检行、质量检测摘要、直连发布阻断与平台原生产物格式会随平台切换真实更新。

全局矩阵中 Spec 15 与 R-01/R-02/R-13/R-14/R-17/R-18 仍保持 Pending，不在本轮改为 Pass，原因是完整验收仍要求标准 HTML/Markdown 独立平台入口、导出历史 `export_logs`、一键重导出、预设持久化、Worker offloading、资产快照与 base64 内联、五平台 × 19 元素 × 3 样本验收矩阵、Settings > Export 预设管理、自定义渠道配置、真实平台 API 发布和审计日志写入。

## 2026-04-30 Spec 16 Baseline 验收记录

`16-markdown-extensions-spec` 的 compatible baseline 已完成：当前实现新增 `src/services/markdown-ext` 注册表与共享渲染转换层，并将脚注、多色高亮、`[toc]`、`:::details`、emoji shortcode、wikilink、citation 接入 `renderMarkdownWithOptionalEnhancements()`，从而让 Workstation Preview 与导出 HTML 链路复用同一个真实派生产物。该实现不改写 Markdown 源、不伪造 wikilink/citation 解析结果、不新增假发布接口，并按项目禁令将 `:name:` 渲染为 shortcode badge 而非 Unicode Emoji 图标。

本轮真实验证包括：`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 均通过；本地 Vite `/workstation` 通过真实 Pinia store 写入并清理 1 篇 IndexedDB 文稿，确认 Preview 中 `.ink-toc`、`.ink-highlight--green`、`.ink-highlight--custom`、`.ink-footnote-ref`、`.ink-footnotes`、`.ink-details`、`.ink-wikilink--unresolved`、`.ink-citation--factual`、`.ink-cite--unresolved`、`.ink-emoji--shortcode` 全部存在；导出服务函数确认 WeChat 原生产物携带 TOC、脚注和 citation 派生产物且无 Unicode Emoji glyph；浏览器 console error 为 0。

全局矩阵中 Spec 16 只能标记 compatible baseline pass；完整验收仍保留 Pending，原因是完整 Spec 16 还要求 TipTap NodeView、cursor-aware、命令注册、斜杠命令、工具栏入口、快捷键、FormulaBuilderPanel、wikilink 反链索引、citation manager、降级审计、五平台差异矩阵和约 315 条 round-trip/E2E 用例。

## 2026-04-30 Spec 17 Baseline Acceptance Note

`17-crash-recovery-spec` compatible L1 baseline is completed. The implementation adds real emergency payload storage, Dexie `recoveryPoints`, startup recovery detection, editor autosave-failure fallback, and a Workstation recovery banner. It was verified with `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm build`, and a real browser IndexedDB workflow on `http://127.0.0.1:5176/workstation`.

The browser validation created one real temporary article, wrote an emergency localStorage payload with `writeResult.ok === true`, confirmed the recovery banner, restored through the UI, verified both `article.rawContent` and `contents.body` contained the recovered content, verified one consumed `crash-recovery` recovery point, and then cleaned the temporary article, content, recovery point, emergency keys, and crash counters. Browser console errors were 0. The Vite validation server was stopped and port `5176` had no LISTENING process afterward.

The global matrix must treat Spec 17 as baseline-pass only. Full completion remains pending for Recovery Mode wizard, Data Integrity worker, SafeMode shell, DiagnosticPackage zip/redaction, Disaster Recovery Wizard, backup scheduler, VersionHistory recovery bundles, artifacts/17, and full crash-kill E2E coverage.

## 2026-04-30 Spec 18 Baseline Acceptance Note

`18-tauri-desktop-spec` compatible baseline is completed, but the global Spec 18 status remains Pending. The completed slice adds a typed desktop runtime/capability service, explicit non-mocking web fallback, a Pinia desktop snapshot store, Settings > About runtime visibility, Tauri v1 Rust commands for runtime info/window operations/file-manager reveal, Tauri config baseline alignment, and Tauri runtime probing for both `__TAURI__` and `__TAURI_INTERNALS__`.

Real verification completed: `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm build`, and `cargo check` all passed. Playwright verified `/settings?tab=about` in real browser web runtime with `Desktop Runtime`, `Web Runtime`, `Application Info: degraded`, `Window Management: unavailable`, and `native desktop APIs are not mocked`, with 0 console errors. The temporary Vite server on port `5176` was stopped and no LISTENING process remained. `git diff --check` passed for P1-18 touched files with only CRLF conversion notices, and touched-file Emoji presentation scan passed.

Full Spec 18 remains Pending for watcher/conflict resolution, tray, global shortcuts, QuickNoteWindow, updater, platform auth, rich clipboard, window-state persistence, signing/packaging CI, multi-window drag/tab behavior, and the full native/manual/E2E matrix.

## 2026-04-30 Spec 19 Baseline Acceptance Note

Baseline status: Pass for the compatible FTUE/help baseline; full Spec 19 remains partially pending.

Accepted baseline coverage:
- First-run WelcomeModal appears from real Dexie FTUE state and persists skip/completion state.
- No sample documents, mock records, or simulated success states are created by FTUE.
- Help Center is available through a fixed App trigger and `Ctrl+/`.
- Markdown cheatsheet, topic help, search, and shortcut cards render from real local configuration.
- Settings > About can reset only FTUE/help state and re-display the welcome flow.
- Existing content, account, asset, export, and settings data stores are not deleted or migrated by reset.

Validation evidence:
- Type-check, ESLint, production build, Chromium smoke test, touched-file `git diff --check`, and touched-file emoji scan passed on 2026-04-30.

Pending for full Spec 19 pass:
- ContextHelpBubble implementation and full positioning rules.
- Complete multilingual help documents.
- Full accessibility/test matrix from Spec 19 section 17.
- Optional activity log event once the project has a concrete activity logger persistence contract.

## 2026-04-30 Spec 20 Baseline Acceptance Note

Baseline status: Pass for the compatible visual-system baseline; full Spec 20 remains partially pending.

Accepted baseline coverage:
- Existing Appearance settings now feed a centralized visual-system token service instead of scattered root CSS writes.
- Root `documentElement` receives real CSS custom properties for app chrome, paper surface, font stacks, and typography details.
- Settings > Appearance exposes real typography presets and visual-system diagnostics.
- Applying a preset writes real local settings and updates `--typography-paragraph-spacing`, `--font-size-body`, `--line-height-body`, and `--typography-text-indent`.
- Font selection updates `--font-body` from the existing `FONT_STACKS` source of truth.
- `.inkforge-theme` hooks exist for future ThemeEngine adoption without replacing current editor/export flows.
- No mock theme package, fake font import, simulated license scan, sample data, or Emoji icon was introduced.

Validation evidence:
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm build` passed with only the existing Vite chunk-size warning.
- Chromium smoke test on `http://127.0.0.1:5178/settings?tab=appearance` confirmed panel visibility, preset token update, font token update, and zero console errors after clearing prior dev-server logs.

Pending for full Spec 20 pass:
- Full `.inkforge-theme` import/export package flow.
- User font import and license detection.
- Complete theme editor and built-in theme library.
- WritingAmbience modes and full FocusMode/StatusBar integration.
- Full section 34 acceptance matrix including visual regression, accessibility, and performance checks.

## 2026-04-30 Spec 21 Baseline Acceptance Note

Baseline status: Pass for the compatible Focus Writing Assist baseline; full Spec 21 remains partially pending.

Accepted baseline coverage:
- `04-30-04-30-p1-21-focus-writing-assist` now has a task PRD plus real `implement.jsonl` / `check.jsonl` context entries instead of seed-only task metadata.
- `src/stores/writingAssist.ts` adds a typed Pinia state layer for FocusMode session metadata, Vignette preferences, Pomodoro state, AmbientSound state, WPM sampling, and last `FocusSessionSummary`.
- Workstation Focus Mode now records start time, start word count, and daily goal progress before entering; exit computes a real summary with duration, net words added, and before/after progress.
- `WritingAssistPanel.vue` is wired into the existing inspector with real document/today/week word counts, WPM, goal progress, typewriter toggle, vignette controls, Pomodoro controls, and ambient sound controls.
- Ambient sound uses a real browser Web Audio generator service with rain/cafe/white-noise/nature profiles. It does not pretend that missing packaged audio assets exist, and playback errors surface as typed state.
- Existing `settings.writingGoal` and `settings.editor.typewriterMode` remain the source of truth for goals and Typewriter Mode, avoiding a conflicting second goal store.
- Focus Mode remains visual-only: the existing Workstation keyboard handler keeps `Ctrl+S`, Escape handling, editor mode shortcuts, and Typewriter shortcut behavior active.
- No mock records, sample documents, fake timers, simulated audio success, or Emoji glyphs were introduced.

Validation evidence:
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run src/services/writing-assist/stats.test.ts` passed with 1 test file and 4 tests.
- `pnpm build` passed with the existing Vite chunk-size warning.
- Touched-file `git diff --check` passed with only Windows CRLF conversion warnings.
- Touched-file Emoji presentation scan passed for the new writing-assist files, `WorkstationView.vue`, and updated Spec 21 docs.
- Production preview smoke test on `http://127.0.0.1:5179/workstation` confirmed the real FTUE overlay, Writing Assist panel visibility, Focus enter/exit, `FocusSessionSummary` display, Pomodoro Start countdown state, and zero browser console errors; the preview server was stopped and port `5179` was clear afterward.
- The project test script was made executable by adding the missing `vitest` dev dependency, matching the existing `package.json` test script intent.

Pending for full Spec 21 pass:
- Full Tauri desktop notifications for Pomodoro phase completion.
- Dedicated `Settings > Writing` tab and complete settings migration from the current Editor-tab baseline.
- Full command palette integration for Focus Mode and writing-assist commands.
- Complete Tauri packaged ambient audio assets if the product chooses asset-backed playback over generated Web Audio.
- Full E2E validation for slash command/floating toolbar behavior while Focus Mode is active.
- Full section 14 integration matrix including long-running Pomodoro timing, browser audio permission prompts, and visual regression coverage.

## 2026-04-30 Spec 22 Baseline Acceptance Note

Baseline status: Pass for the compatible Command Palette baseline; full Spec 22 remains partially pending.

Accepted baseline coverage:
- `src/types/command-palette.ts` defines the command model, groups, scopes, context tags, history, result, permission, and Workstation bridge contracts.
- `src/services/command/registry.ts` supports duplicate-safe registration, group/context retrieval, global visibility, and extension prefix/permission validation.
- `src/services/command/executor.ts` enforces permissions, context visibility, destructive confirmation hooks, version-checkpoint hooks, and audit callbacks.
- `src/services/command/fuzzy-search.ts` provides local typed search without adding a dependency, including exact/prefix/includes/acronym/subsequence scoring and history bonuses.
- `src/services/command/history.ts` persists history and favorites in real IndexedDB, with best-effort degradation when storage is unavailable.
- `src/services/command/builtin.ts` registers only real commands mapped to existing router/store/Workstation behavior.
- `src/stores/command-palette.ts` owns open/query/active/result/history/favorite/context state and guards async history-load races.
- `src/components/command-palette/CommandPalette.vue` renders the Teleport dialog with keyboard navigation, quick sections, Lucide icons, ARIA dialog/combobox/listbox/option semantics, and no Emoji glyphs.
- App global shortcuts and Workstation bridge are wired without deleting existing link or code-block editor shortcuts.
- Pure Web production preview no longer enables the Tauri-only encrypted Repository path before a Web password unlock UI exists, restoring real article creation in preview without mocking native desktop success.

Validation evidence:
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec vitest run src/services/command/fuzzy-search.test.ts` passed with 1 test file and 6 tests.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm build` passed; the remaining Vite dynamic/static import and chunk-size warnings are pre-existing non-blocking warnings.
- Production preview smoke on `http://127.0.0.1:5180/` verified real IndexedDB draft creation, Workstation route selection, Focus Mode, export modal, editor shortcut protection, Settings Appearance routing, Recent history persistence, and zero console errors.

Pending for full Spec 22 pass:
- Workflow template composition and command chaining UI.
- Full extension sandbox execution and ActivityLogger persistence integration.
- Full AI command set after the AI service contracts are complete.
- Destructive document lifecycle commands after trash/archive/TTL contracts are fully verified.
- Fuse.js or worker-backed search for large command sets if the product chooses that dependency.
- Toolbar and context-menu command-palette entry points.
- Complete accessibility, performance, and extension E2E coverage for all 35 test-matrix rows.

## 2026-05-01 Spec 23 Baseline Acceptance Note

Baseline status: Pass for the compatible SyncProvider baseline; full Spec 23 remains partially pending.

Accepted baseline coverage:
- `SyncProvider`, `SyncConfig`, credential, payload, pull result, conflict, log, status, and resolve strategy contracts are implemented in `src/services/sync/provider.ts`.
- Vector clock helpers are implemented and tested for equal, before, after, concurrent, increment, and merge behavior.
- WebDAV, Git, and SelfHosted provider classes call real `fetch` or Tauri invoke boundaries and fail explicitly when runtime or endpoint capabilities are unavailable.
- Dexie now has real `syncOutbox`, `syncLogs`, and `syncConflicts` tables through schema version 7.
- Article create/update/delete operations enqueue sync dirty records after local persistence succeeds.
- `SyncEngine` preserves pending changes and reports `paused` / failure when no provider is configured. It no longer clears pending changes as a local fake success path.
- `useSyncStore` exposes provider id, pending count, conflict count, last sync time, status text, and manual sync result for UI use.
- Settings now has a Sync tab and searchable registry entries that show real provider state, pending queue, conflict count, last sync timestamp, and manual sync feedback.
- Basic/Digest saved hashes are not transmitted as runtime secrets; Git remote validation rejects `file://` and insecure `http://`.
- No mock provider, simulated remote ack, sample sync data, fake success state, deleted existing module, or Emoji glyph was introduced in product code.

Validation evidence:
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec vitest run src/services/sync/sync-provider.test.ts` passed with 1 test file and 7 tests.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed. The ordinary build command hit a Node heap OOM on this constrained machine after transforming 4579 modules; the one-process high-heap rerun completed successfully. Existing Vite dynamic/static import and chunk-size warnings remain.
- `git diff --check` passed for touched sync/settings files with only Windows CRLF conversion warnings.
- Touched-file Emoji scan passed for the SyncProvider baseline files, docs, and Trellis task files.
- Production preview smoke on `http://127.0.0.1:5181/settings?tab=sync` verified query-route tab selection, Sync tab visibility, no-provider manual sync failure, `paused` state, one visible `同步提供者未配置` error, and no fake remote success. The preview server was stopped afterward; no `LISTEN` remained on port `5181`.

Pending for full Spec 23 pass:
- Real WebDAV server credential onboarding, live push/pull, auth failure, quota failure, and conflict tests.
- Tauri Rust Git command implementation and packaged HTTPS/SSH remote validation.
- SelfHosted server implementation and API contract tests against a real server.
- Conflict resolve modal, conflict banner, and ActivityLogger audit persistence.
- Offline queue flush, retry backoff, permanent failure UX, and network restore validation.
- Secure keyring-based runtime secret flow for Basic/Digest/SSH credentials.
- Full 39-row test matrix and performance SLO validation.

## 2026-05-01 Spec 24 Baseline Acceptance Note

Baseline status: Pass for the compatible Permission Audit baseline; full Spec 24 remains partially pending.

Accepted baseline coverage:
- `src/services/audit/*` implements typed audit actions, Zod input validation, sensitive payload sanitization, stable hash source generation, prevHash/entryHash integrity chaining, repository query/export/cleanup, fallback evidence, and event-bus updates.
- `src/services/permissions/*` implements resource permission records, share link metadata, crypto-backed short codes, share URL generation, `PermissionBroker` owner grant/revoke/check/share-link/network/fs boundaries, and fail-closed password-protected share links when bcrypt is not available.
- Dexie schema v8 adds `auditLogs` and `resourcePermissions` while preserving all prior tables.
- `useAuditStore` powers Settings audit query/filter/export/integrity UI and now uses an open-ended upper time bound so newly written local audit records are visible after refresh.
- Settings includes an Audit tab with real record counts, integrity status, filters, CSV/JSON export, and details list.
- Article, SyncEngine, Account, Settings high-risk actions, and Command Palette now write real audit records at existing business boundaries.
- Product code does not introduce mock audit records, fake permission grants, simulated remote success, plaintext token logging, or Emoji glyph icons.

Validation evidence:
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec vitest run src/services/audit/audit.test.ts src/services/permissions/permissions.test.ts` passed with 2 test files and 16 tests.
- `pnpm exec vitest run` passed with 5 test files and 33 tests.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed; existing `category/article` dynamic/static import and chunk-size warnings remain non-blocking.
- Touched-file emoji scan passed with no Emoji glyph findings.
- `git diff --check -- <Spec 24 touched files>` passed.
- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-01-05-01-p1-24-permission-audit` passed.
- Production preview smoke on `http://127.0.0.1:5182/settings?tab=audit` verified Audit tab routing, real IndexedDB v8 object stores, one UI-generated `account.settings_change` audit record with hash-chain fields, visible record count 1 after refresh, integrity status `valid`, verified-message text for 1 entry, and zero browser console errors. The preview server was stopped and port 5182 was clear afterward.
- Hardening re-smoke on `http://127.0.0.1:5182/settings?tab=audit` verified the active `data-settings-tab="audit"` panel, real empty-ledger count 0, visible `auditLogs/resourcePermissions` runtime stats, zero browser console errors, and no remaining LISTENING process on port 5182 after shutdown.

Reviewer-hardening evidence added after the baseline smoke:
- `private` checks are owner-only and no longer inherit broad `view` semantics.
- Share-link creation requires an existing owner permission record and never creates ownership implicitly.
- Invalid, revoked/inactive, expired, and password-verifier-unavailable share-link attempts write denied audit evidence.
- IndexedDB audit append failure writes fallback evidence but returns `null`, so UI/event bus does not claim durable success.
- Integrity verification accepts retained-chain anchors after retention cleanup while still validating each retained record hash and adjacency.
- Article and Command Palette audit records resolve the active account profile instead of hardcoding the default profile.

Pending for full Spec 24 pass:
- Real bcrypt or equivalent password verification for password-protected share links.
- Full componentized `DangerConfirmDialog` and all high-risk operation migrations.
- Complete Comment / Review / Publish / AI / Knowledge / Plugin audit injection and integration verification.
- Remote WORM / SIEM / logically separate audit sink, monitoring, and alerting.
- Full 25+ row test matrix, 10000-write performance test, 1000-row filtered query performance test, and complete E2E export-file validation.

## 2026-05-01 Spec 25 Baseline Acceptance Note

Baseline status: Pass for the compatible Extension Plugin baseline; full Spec 25 remains partially pending.

Accepted baseline coverage:
- `src/services/extensions/types.ts` defines strict local manifest, permission, sandbox, lifecycle record, and profile-scoped storage contracts.
- `src/services/extensions/manifest.ts` validates local `inkforge-plugin.json` data with Zod, rejects unsafe IDs, parent-directory entry paths, duplicate permissions, wildcard origins, and `network:fetch` without an allowlist.
- `src/services/extensions/repository.ts` persists extension records and JSON-serializable extension storage through Dexie schema v9 with `extensions` and `extensionStorage` tables.
- `src/services/extensions/host.ts` installs local manifests, writes plugin lifecycle audit records, blocks runtime activation until a real Worker sandbox/message protocol exists, and gates command contribution through `CommandRegistry.registerExtension()`.
- `src/stores/extensions.ts` exposes installed/enabled/blocked/error state, install/enable/disable/uninstall actions, and storage helpers for Settings UI.
- Settings now includes an Extensions tab with real manifest file/text import, local registry counts, permission chips, command permissions, fail-closed runtime error display, refresh, enable, disable, and uninstall actions.
- `src/types/command-palette.ts` now exports `COMMAND_PERMISSION_VALUES` so extension manifest validation and command registry permission checks share one command-permission enum.
- Product code does not introduce fake marketplace data, mock extension packages, simulated Worker success, wildcard network grants, signature claims, arbitrary JS execution, or Emoji glyph icons.

Validation evidence:
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec vitest run src/services/extensions/extensions.test.ts src/services/command/fuzzy-search.test.ts` passed with 2 test files and 12 tests.
- `pnpm exec vitest run` passed with 6 test files and 39 tests.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed; existing dynamic/static import and chunk-size warnings remain non-blocking.
- Production preview smoke on `http://127.0.0.1:5182/settings?tab=extensions` verified active Extensions tab rendering, real Dexie v9 `extensions/extensionStorage` stats, installation of a real local manifest, installed count 1, enable action blocked with `extension-runtime-unavailable`, zero console errors, and clean port shutdown afterward.

Pending for full Spec 25 pass:
- Real Web Worker runtime, JSON postMessage bridge, API gateway, timeout/error isolation, and SDK proxy execution.
- Plugin package unzip/copy, signature verification, upgrade confirmation, version compatibility checker, config migration, and hot reload.
- UI injector for toolbar/menu/modal/notification contributions after sandboxed runtime exists.
- Online marketplace/catalog and remote extension distribution only after real network, signing, and trust model are implemented.
- Full 34-row test matrix, multi-extension startup SLO validation, packaged Tauri runtime validation, and E2E command palette registration with real sandboxed extension commands.



## 2026-05-02 Spec 26 Baseline Acceptance Note

Baseline status: Pass for the compatible Multi Account Profile baseline; full Spec 26 remains partially pending.

Accepted baseline coverage:
- `src/services/profile/*` implements strict Profile schemas, id generation, file-root overlap validation, per-profile Dexie database metadata initialization, repository lifecycle, and exported service contracts.
- `src/stores/profile.ts` exposes Profile registry state and real lifecycle actions for UI use.
- `src/utils/db.ts` schema v10 adds Profile registry and shared Profile area tables without removing any prior table.
- `src/stores/account.ts` mirrors current local account lifecycle into Profile registry, preserving the existing `/account` surface and account store.
- `src/views/SettingsView.vue` adds a `工作区` Tab with real registry counts, active Profile, DB namespace, create/switch/soft-delete/restore controls, and honest native-boundary messaging.
- `src/services/audit/types.ts` adds `account.restore`; Profile create/switch/delete/restore lifecycle actions write audit evidence.
- No mock Profile data, fake Tauri file root, fake multi-window success, destructive content migration, fake shared templates, fake import/export result, or Emoji glyph icon was introduced.

Validation evidence:
- `pnpm exec vitest run src/services/profile/profile.test.ts` passed with 7 tests.
- `pnpm exec vitest run` passed with 7 files and 46 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed with only existing non-blocking Vite warnings.
- Production preview smoke verified `/settings?tab=profiles`, real IndexedDB v10 stores, default Profile initialization, creation of a second real Profile, independent `inkforge-{profileId}` database creation, native-boundary messaging, zero console errors, and stopped preview port `5182` cleanly.

Pending for full Spec 26 pass:
- Real Tauri file-root and multi-window command implementation.
- Safe document/content migration into per-profile databases.
- Full import/export wizard and irreversible purge flow.
- Full Profile switcher command/modal, 50+ Profile performance SLO, packaged desktop E2E, and all remaining test-matrix rows.

## 2026-05-02 Spec 27 Baseline Acceptance Note

Baseline status: Pass for the compatible local Performance SLO baseline; full Spec 27 remains partially pending.

Accepted baseline coverage:

- `src/services/performance/*` defines real SLO thresholds, support-state contracts, browser collector probes, bounded repository persistence, and degradation event recording.
- `src/utils/db.ts` schema v11 adds `performanceSamples` and `performanceDegradationEvents` without deleting or replacing any existing table.
- `src/services/audit/types.ts` adds `system.performance_degradation`; warn/breach samples can write sanitized audit evidence without blocking the collector.
- `src/stores/performance.ts` exposes local SLO summary, samples, events, support matrix, reduced-motion state, loading/error state, and collection controls.
- `src/views/SettingsView.vue` shows the Performance SLO ledger inside the existing About performance area and respects the existing `performance-metrics` feature flag.
- The baseline stores only summarized metric values, thresholds, timestamps, route/context, support metadata, and audit references; it does not store document content, secrets, or fake telemetry.

Validation evidence:

- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec vitest run src/services/performance/performance.test.ts` passed with 5 tests.
- `pnpm exec vitest run` passed with 8 files and 51 tests.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed with only existing non-blocking Vite warnings.
- Production preview smoke verified `/settings?tab=about`, enabled `performance-metrics`, rendered `about.performanceSlo`, created real IndexedDB `performanceSamples` and `performanceDegradationEvents` stores, wrote 10 samples and 4 degradation events, reported zero console errors, and stopped preview port `5182` cleanly.

Pending for full Spec 27 pass:

- Lighthouse Performance > 80 CI evidence.
- 900k-word input and export stress matrices.
- Autosave, conflict detection, search, bundle, and long-session memory gates for the owning feature modules.
- Native packaged Tauri CPU/battery/process-memory and desktop degradation validation.

## 2026-05-02 Spec 28 Baseline Acceptance Note

Baseline status: Pass for the compatible local Asset Pipeline baseline; full Spec 28 remains partially pending.

Accepted baseline coverage:

- `src/services/asset-pipeline/*` implements real Web Crypto SHA-256 hashing, MIME classification, file/blob/url ingest, Dexie repository access, object URL cache cleanup, reference tracking, orphan cleanup, and export snapshot resolution.
- `src/utils/db.ts` schema v12 adds `assetRefs` and asset metadata indexes while preserving the existing `assets` table and Blob fields.
- `src/stores/asset.ts` preserves the existing public API and routes uploads through the new pipeline without deleting current editor integration points.
- Same-content assets dedupe by content hash, and reference rows update `refCount` from real persisted refs.
- Orphan cleanup respects the 24-hour grace period and removes only expired zero-ref assets.
- Inline export snapshots are generated from stored Blobs on demand and are not persisted as DB metadata.
- External URL ingest fails honestly when fetch fails and does not fabricate cached assets.
- No mock asset records, fake cache hits, fake Tauri mirror state, document-content metadata, or Emoji glyphs were introduced.

Validation evidence:

- `pnpm exec vitest run src/services/asset-pipeline/asset-pipeline.test.ts` passed with 7 tests.
- `pnpm exec vitest run` passed with 9 files and 58 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed with only existing non-blocking Vite warnings.
- Browser smoke verified real Blob ingest, dedupe, inline snapshot, orphan grace/purge, IndexedDB version 120, `assetRefs` store, zero console errors, and clean port shutdown.

Pending for full Spec 28 pass:

- Tauri filesystem mirror and packaged desktop validation.
- Full image viewer, lazy-loading node view, and ProseMirror transaction-level ref tracker.
- External image proxy/cache and cache hit accounting.
- Asset Manager UI, orphan list UI, DataInsights storage chart, and full 2000+ asset benchmark matrix.

## 2026-05-02 Spec 29 Baseline Acceptance Note

`29-search-engine-spec` compatible baseline is completed for the local-first service/store layer. The implementation now has a real MiniSearch-backed SearchEngine, CJK tokenization, DSL filters, history persistence, incremental indexing, excerpts, highlight ranges, a Pinia search store, unit coverage, production build validation, and a real browser module smoke.

The global matrix should mark only the service/store compatible baseline as Pass. Full UI-level AC remains Pending for GlobalSearchView, Ctrl+Shift+F wiring, local Find/Replace decorations, Web Worker indexing, SmartFolder UI migration, CommandPalette document-result rendering, and non-article resource search coverage.

## 2026-05-02 Spec 30 Baseline Acceptance Note

Baseline status: Pass for the compatible local-first Trash Recycle baseline; full Spec 30 remains partially pending.

Accepted baseline coverage:

- `src/schemas/article.ts` adds `trashed` plus soft-delete metadata fields on Article.
- `src/utils/db.ts` schema v13 adds article trash indexes without deleting or replacing existing object stores.
- `src/services/trash/*` implements repository-backed list, moveToTrash, restore, purge, empty, purgeExpired, and summary operations.
- `src/stores/trash.ts` exposes real trash state and actions, with no seeded trash rows or fake restore success.
- `useArticleStore.deleteArticle()` now performs soft delete by default while preserving audit, sync dirty tracking, category-count decrement, and selected article cleanup.
- Normal ArticleRepository reads and SearchEngine indexing exclude `trashed` by default.
- Permanent purge is fail-closed for non-trashed articles and deletes related `contents` rows together with the article row.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-30-trash-recycle` passed.
- `pnpm exec vitest run src/services/trash/trash.test.ts` passed with 6 tests.
- `pnpm exec vitest run src/services/search/search-engine.test.ts` passed with 8 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 11 files and 71 tests.
- `pnpm build` passed with only existing non-blocking Vite warnings.
- Browser smoke verified real IndexedDB v13 trash lifecycle: move to trash, normal-list exclusion, trash list inclusion, search exclusion, restore to draft, purge article/content, and zero console errors.

Pending for full Spec 30 pass:

- Dedicated TrashBin UI route/page, read-only preview, batch operations, and confirmation dialogs.
- Tauri scheduled purge job and packaged desktop validation.
- Asset orphan cleanup integration, DataInsights storage chart integration, trash-internal search UI, and full E2E/a11y matrix.

## 2026-05-02 Spec 31 Baseline Acceptance Note

Baseline status: Pass for the compatible local-first Version Bundle baseline; full Spec 31 remains partially pending.

Accepted baseline coverage:

- `src/schemas/article.ts` extends `Version` metadata without breaking existing embedded version rows.
- `src/services/version-bundle/*` implements real repository-backed snapshot, diff, milestone, cleanup, export, and restore-proposal behavior over persisted `EditedContent.versions` data.
- `src/stores/versionBundle.ts` provides the UI-facing state contract for loading, mutation, errors, restore proposals, exports, counts, and milestone state without seeded or mocked rows.
- `useEditorStore.createContent()` creates an initial metadata-rich version snapshot, and `useEditorStore.createVersion()` remains backward compatible while accepting a typed trigger.
- `useVersionManager.performAutoSnapshot()` now records interval-triggered autosnapshots through the existing editor store path.
- Safe restore proposal does not mutate the current body until a future UI explicitly applies it.
- Milestone/current/last-version deletion is rejected, and cleanup retains milestones plus the current version.

Validation evidence:

- `pnpm exec vitest run src/services/version-bundle/version-bundle.test.ts` passed with 6 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 12 files and 78 tests.
- `pnpm build` passed with only existing non-blocking Vite warnings.
- Browser smoke verified real IndexedDB v13 VersionBundle behavior: unchanged content skipped, changed content created with metadata, milestone retained by cleanup, restore proposal did not mutate body, Markdown export included frontmatter, cleanup removed the smoke record, runtime errors were empty, and the dev-server port was closed afterward.

Pending for full Spec 31 pass:

- Full `VersionPanel` timeline and diff/merge UI.
- Export download UI, restore-confirmation workflow, and keyboard navigation.
- Tauri native lifecycle triggers for before-close, mode-switch, and crash-recovery checkpoints.
- Normalized version table, integrity checker, 2000+ version benchmark, full E2E, a11y, and packaged desktop validation.

## 2026-05-02 Spec 32 Baseline Acceptance Note

Baseline status: Pass for the compatible local-first Comment Review baseline; full Spec 32 remains partially pending.

Accepted baseline coverage:

- Dexie schema v14 adds `comments`, `marginNotes`, and `trackChanges` stores additively.
- `src/services/comment-review/*` implements real persisted comment, reply, margin note, track-change, audit, mention, Markdown, and anchor-drift logic.
- `useCommentReviewStore` exposes service-backed UI state and never seeds placeholder review rows.
- Anchor drift is represented honestly as `exact`, `drifted`, or `invalid`; invalid anchors are not silently treated as valid.
- Review events use existing audit actions: `comment.create`, `comment.resolve`, `comment.delete`, `review.approve`, and `review.request_changes`.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-32-comment-review` passed.
- `pnpm exec vitest run src/services/comment-review/comment-review.test.ts` passed with 7 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 13 files and 85 tests.
- `pnpm build` passed with only existing non-blocking Vite warnings.
- Browser smoke verified real IndexedDB v14 persistence and cleanup for comments, replies, margin notes, track changes, audit rows, anchor drift, Markdown rendering, and track-change application with zero console errors.

Pending for full Spec 32 pass:

- Live editor decorations, review sidebar UI, selected-text creation flows, Track Changes plugin visuals, margin-note tooltip, PDF side-note export, full E2E/a11y, and performance benchmarks.

## 2026-05-02 Spec 33 Baseline Acceptance Note

Baseline status: Pass for the compatible local-first Diagnostic Logging baseline; full Spec 33 remains partially pending.

Accepted baseline coverage:

- Dexie schema v15 adds `activityLogs` and `exportLogs` with query indexes for level/module/profile/time and export outcome/time.
- ActivityLogger persists L1-L3 logs through batched IndexedDB writes and keeps L0 trace records in a memory ring buffer only.
- L4 critical logs write immediately and create replayable localStorage fallback evidence.
- Redaction runs before queueing, persistence, fallback, export-log metadata, and JSONL output.
- Retention cleanup removes normal logs older than 7 days and critical logs older than 30 days.
- Export-log records persist success/failure evidence with diagnostic link fields and redacted metadata.
- Diagnostics Pinia store exposes real async load, flush, cleanup, fallback replay, export log, and JSONL actions with loading/error state.

Acceptance evidence:

- Unit: `pnpm exec vitest run src/services/activity-logger/activity-logger.test.ts` passed with 9 tests.
- Project: `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `pnpm exec vitest run`, and `pnpm build` passed.
- Browser: Playwright smoke verified real IndexedDB v15 writes/query/cleanup/fallback/exportLog and zero console errors.

Deferred acceptance items:

- Toast presentation, SafeMode banner, global error handler wiring, Settings ActivityLogViewer, DevPanel event stream, DiagnosticPackage zip, and performance benchmark artifacts.

## 2026-05-02 Spec 34 Baseline Acceptance Note

Baseline status: Pass for the compatible local-first Layout Persistence baseline; full Spec 34 remains partially pending.

Accepted baseline coverage:

- Dexie schema v16 adds `layoutStates` with profile/window indexes and no destructive migration.
- `LayoutPersistenceService` provides real IndexedDB-backed initialize/load/save/clear/debounced-save/cleanup/migration/tab-validation operations.
- `useLayoutPersistenceStore` wraps the service with explicit loading, saving, error, current record, and last-action state.
- `WorkstationView` persists and restores existing layout concepts without removing localStorage fallbacks: manager/stage/inspector collapsed state, manager tab, editor mode, editor width, panel widths, active article id, and per-mode layouts.
- `layoutStates` is marked local-only through `SYNC_EXCLUDED_LAYOUT_TABLES` and is not introduced into sync providers.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-34-layout-persistence` passed before implementation and will remain the task context gate.
- `pnpm exec vitest run src/services/layout-persistence/layout-persistence.test.ts` passed with 8 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 15 files and 102 tests.
- `pnpm build` passed with existing non-blocking Vite warnings only.
- Browser smoke verified `db.verno === 16`, real `layoutStates` writes, profile/window isolation, clamp behavior, migration persistence, stale cleanup, tab validation, sync exclusion, zero console errors, smoke-row cleanup, and closed dev-server ports.

Pending for full Spec 34 pass:

- Native Tauri window size/position restore, monitor bounds validation, and restart E2E.
- Real drag-resize persistence E2E and restart replay.
- Settings/DevPanel clear-layout control and richer operational diagnostics.
- First-class editor tab restoration after Workstation tab state becomes a product feature rather than a compatibility placeholder.

## 2026-05-02 Spec 35 Baseline Acceptance Note

Baseline status: Pass for the compatible local-first SplitView Phase 1 baseline; full Spec 35 remains partially pending.

Accepted baseline coverage:

- `WorkstationView` integrates SplitView into the existing editor panel without deleting stage preview, manager/sidebar, inspector, Preview mode, or localStorage compatibility paths.
- SplitView toggle is available through `Ctrl+Shift+E`, the Workstation header control, and `view.toggleSplitView` command-palette action.
- `toggleSidebar` default is migrated to `Ctrl+Shift+B` when old settings still bind it to `Ctrl+Shift+E`, preventing shortcut conflict with SplitView.
- SplitView preview uses existing `MarkdownPreview` and current `normalizedBody` real editor state; no mock document is seeded.
- Splitter implements pointer drag, double-click reset, keyboard adjustment, ARIA separator attributes, ratio clamp, and responsive disablement.
- SplitView fields persist in the existing local-only `layoutStates` record and are normalized/migrated through the layout persistence service.
- Sync-scroll baseline uses percentage scroll with loop prevention and an explicit toggle; anchor-level sync is deferred to the full SyncScroll phase.
- `CommandPalette` registers `Columns2` from `lucide-vue-next`, avoiding Emoji fallback icons.

Validation evidence:

- python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-35-split-view: passed before final code/doc closeout and will be re-run after docs.
- pnpm exec vitest run src/services/layout-persistence/layout-persistence.test.ts: 1 file, 8 tests passed.
- pnpm exec vue-tsc --noEmit: passed.
- pnpm exec eslint src --ext .ts,.tsx,.vue --quiet: passed.
- pnpm exec vitest run: 15 files, 102 tests passed.
- pnpm build: passed with existing non-blocking Vite dynamic/static import and chunk-size warnings.
- Playwright browser smoke on http://127.0.0.1:5183/workstation: Ctrl+Shift+E opened SplitView; separator ArrowRight changed aria-valuenow 50 -> 52; IndexedDB InkForgeDB layoutStates stored splitViewEnabled=true and splitViewRatio=0.52; 800px viewport disabled right split pane; Ctrl+Alt+P Preview mode removed split pane; console errors=0.
- Dev server cleanup: stopped node PID 6124; ports 5183 and 5184 not listening.
- git diff --check on touched code files: passed.
- BOM/emoji scan on touched code files: passed.
- GitNexus impact/detect_changes attempted but unavailable: Transport closed.

Pending for full Spec 35 pass:

- Reference and Compare right-pane modes.
- Precise anchor/block sync-scroll and heading synchronization.
- Native multi-window / Tauri packaged lifecycle verification.
- Full keyboard, screen-reader, and visual regression E2E matrix across all SplitView modes.

## 2026-05-02 Spec 36 Baseline Acceptance Note

Baseline status: Pass for the compatible local-first WikiLink baseline; full Spec 36 remains partially pending.

Accepted baseline coverage:

- Dexie schema v17 adds the derived `backlinks` local index additively; existing content, layout, audit, sync, asset, version, comment, and diagnostic stores remain intact.
- `services/wiki-link/*` implements real typed parser, extractor, backlink repository, rebuild/search service, and singleton API exports.
- `useWikiLinkStore` exposes service-backed backlink, broken-link, article-search, rebuild, cleanup, loading, indexing, and error state without mock rows.
- `useArticleStore` runs backlink indexing after real repository create/update writes and cleans derived links after real trash-delete lifecycle operations.
- Markdown preview rendering keeps the saved source as `[[...]]` while rendering `.ink-wikilink` anchors with target/anchor metadata.
- Parser and renderer skip fenced code, inline code, and `![[embed]]` syntax.
- Broken links persist as unresolved `BacklinkRecord` rows with target title, alias, anchor, raw source, and context; creating/renaming targets can resolve rows through rebuild.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-36-wiki-link`: will be run after this documentation closeout.
- `pnpm exec vitest run src/services/wiki-link/wiki-link.test.ts`: 1 file, 10 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 16 files and 112 tests passed.
- `pnpm build`: passed with existing non-blocking Vite warnings only.
- Browser smoke verified real parser/renderer/Dexie behavior on `http://127.0.0.1:5183/workstation`: `db.verno === 17`, `backlinks` table and indexes exist, IndexedDB row round-trip succeeded, renderer preserved embeds and inline code, and console errors were zero.
- Dev server cleanup: stopped the Vite node process on port 5183; ports 5183/5184 had no listening process after cleanup.
- GitNexus impact/detect_changes attempted but unavailable: `Transport closed`.

Pending for full Spec 36 pass:

- TipTap atom node, input rule, suggestion popup, Ctrl-click navigation, and broken-link create modal.
- Backlinks panel, graph visualization, anchor scroll positioning, and richer resolved/broken visual states inside the editor.
- Large-vault worker indexing, 50k article benchmark, full E2E/a11y matrix, and packaged Tauri validation.


## 2026-05-02 Spec 37 Baseline Acceptance Note

Baseline status: Pass for the compatible local-first Snippet System baseline; full Spec 37 remains partially pending.

Accepted baseline coverage:

- Dexie schema v18 adds `snippets` additively and keeps existing v17 `backlinks` and all prior stores intact.
- `services/snippet/*` provides real typed schema validation, snippet resolution, trigger matching, persistence repository, business service, import/export, and VS Code snippet normalization.
- `useSnippetStore` wraps real service actions with loading/saving/error/last-action state and computed snippet counts.
- `SnippetExpansion` is connected to the existing TipTap editor in `EditorPanel` and expands only real persisted text snippets on trigger plus Tab.
- Normal Tab behavior is preserved when no matching trigger is immediately before the cursor.
- Runtime context resolves title, author fallback, selected text, clipboard fallback, date/time, and UUID without mock product rows.
- No product startup seeds demo snippets or placeholder snippet data.

Validation evidence:

- `pnpm exec vitest run src/services/snippet/snippet.test.ts`: 1 file, 11 tests passed.
- `pnpm exec vitest run src/services/wiki-link/wiki-link.test.ts src/services/snippet/snippet.test.ts`: 2 files, 21 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 17 files and 123 tests passed.
- `pnpm build`: passed with existing non-blocking Vite warnings only.
- Browser smoke verified real IndexedDB `snippets` table/indexes, `db.verno === 18`, backlink preservation, snippet row round-trip, resolver/matcher output, zero console errors, and dev-server cleanup.
- GitNexus impact/detect_changes attempted but unavailable: `Transport closed`.

Pending for full Spec 37 pass:

- Full Settings manager, slash block insertion, dynamic command palette snippet entries, conflict-resolution modal, mirrored tab-stop navigation, transforms, multi-cursor support, large library benchmark, full E2E/a11y coverage, and packaged Tauri verification.

## 2026-05-02 Spec 38 Baseline Acceptance Note

Baseline status: Pass for the compatible TOC System parser/store/sidebar baseline; full Spec 38 remains partially pending.

Accepted baseline coverage:

- Shared `services/toc/*` parser/service supports Markdown and TipTap document heading extraction with H1-H6, deterministic ids, tree building, depth filtering, and numbering.
- `useTocStore` centralizes real TOC heading state, active heading id, collapsed ids, options, errors, and update summaries.
- Existing Workstation outline tab remains present and now uses `useTocStore` through `useOutline`.
- `OutlinePanel` renders recursive heading nodes with installed lucide icons and no Emoji glyphs.
- Existing `[toc]` markdown preview macro remains source-preserving and anchor-compatible.
- Empty documents result in an empty TOC state without seeded sample headings.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-38-toc-system`: passed.
- `pnpm exec vitest run src/services/toc/toc.test.ts`: 1 file, 6 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- target eslint for TOC/outline files: passed.
- `pnpm exec vitest run`: 18 files and 129 tests passed.
- `pnpm build`: passed with existing non-blocking Vite warnings only.
- Browser smoke verified real TOC parser/store/renderer modules on Workstation, `[toc]` anchors, zero console errors, and dev-server cleanup.

Pending for full Spec 38 pass:

- Drag reorder, inline TOC atom node, slash/command-palette insertion, export TOC injection, Settings UI, scroll-spy/virtualization, full E2E/a11y, and packaged Tauri validation.

## 2026-05-02 Spec 39 Baseline Acceptance Note

Baseline status: Pass for the compatible SplitView SyncScroll baseline; full Spec 39 remains partially pending.

Accepted baseline coverage:

- `services/sync-scroll/*` implements typed heading-anchor offset mapping, ratio fallback, bidirectional interpolation, loop detection, immediate programmatic scroll assignment, and resize/image rebuild observer helpers.
- `useSyncScroll` manages real DOM listener lifecycle, RAF throttling, rebuild scheduling, one-shot re-alignment after re-enable, and cleanup on component unmount.
- Workstation SplitView now syncs the real `EditorPanel` scroll container to the real split preview content container instead of syncing non-scrolling wrappers.
- Sync anchors are derived from the existing TOC store and rendered Markdown heading ids; no fake headings or seeded preview data are introduced.
- Existing SplitView toggle, resize divider, responsive fallback, persisted `splitViewSyncScroll`, Preview mode, manager/sidebar, and MarkdownPreview rendering remain intact.
- Sync toggle exposes switch semantics through `role="switch"` and `aria-checked` while continuing to use inline SVG/Lucide-compatible non-Emoji icons.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-39-sync-scroll`: passed after context correction, 9 implement entries and 11 check entries.
- `pnpm exec vitest run src/services/sync-scroll/sync-scroll.test.ts`: 1 file, 8 tests passed.
- `pnpm exec vitest run src/services/sync-scroll/sync-scroll.test.ts src/services/toc/toc.test.ts`: 2 files, 14 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 19 files and 137 tests passed.
- GitNexus impact/detect_changes, DeepWiki, and Exa were attempted but unavailable with `Transport closed`.

Pending for full Spec 39 pass:

- Paragraph-level secondary anchors, full large-document FPS benchmark, loop-detected toast/i18n UX, iframe preview support, VersionHistory/diff policy, full browser E2E/a11y matrix, and packaged Tauri verification.

## 2026-05-02 Spec 40 Baseline Acceptance Note

Baseline status: Pass for the compatible DevPanel baseline; full Spec 40 remains Pending for the full writeback, packaged native, benchmark, and artifact matrix.

Accepted baseline coverage:
- Production-retained DevPanel is lazy-loaded from App root and is not mounted on normal startup.
- Persistent Developer Mode, startup query activation, Ctrl+Shift+D triple-press session activation, and Command Palette toggle are wired to real stores and router state.
- Seven fixed tabs render from real local sources: TipTap, ProseMirror, Pinia, ActivityLogger/event bus, Performance SLO, Dexie IndexedDB, fetch/Tauri diagnostics.
- Store primitive patching requires explicit confirmation and writes ActivityLogger evidence.
- IndexedDB baseline is read-only and sanitized; sensitive tables are marked read-only.
- Network diagnostics redact URL secrets and avoid body capture.
- No mock data, sample diagnostics, simulated success state, or emoji glyph icon was introduced.

Validation evidence:
- Targeted DevPanel tests: `pnpm exec vitest run src/services/dev-tools/dev-tools.test.ts` passed with 7 tests.
- `pnpm exec vue-tsc --noEmit`, full `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, full `pnpm exec vitest run`, and `pnpm build` passed.
- Browser smoke verified normal startup no DevPanel mount/chunk, forced startup DevPanel with seven tabs, redacted Network capture, Settings Developer Mode section, and final console error count 0.

Known pending scope:
- IDB mutation actions, floating panel, PM diff/decorations, full IPC blanket interception, packaged Tauri/E2E artifacts, and formal CPU/memory benchmark remain outside this baseline.

## 2026-05-02 Spec 41 Baseline Acceptance Note

Baseline status: Pass for the in-app Settings migration baseline; full Spec 41 remains Pending for packaged native rollback directories, multi-file migration families, full ImportWizard routing, progress modal, SafeMode UI, and complete audit/e2e/performance matrices.

Accepted baseline coverage:

- Versioned Settings migration service detects unversioned, current, unsupported, and future schema versions.
- v0/v1/v2 legacy transforms normalize root `theme`, `font`, `paperWidth`, `legacyMode`, `shortcuts.zoomIn`, `shortcuts.zoomOut`, and `advanced.devtoolsEnabled` into current Settings shape.
- Migration preview produces semantic diff rows and deprecation metadata before Settings import overwrites current state.
- Settings import validates through Zod `safeParse`, rejects invalid output/future versions/parse failures, and creates a rollback point before successful apply.
- Rollback snapshot creation/restoration remains bounded to the existing 10 snapshot retention model.
- Settings About renders current schema version, snapshot count, latest preview summary, deprecated paths, diff excerpt, and restore-latest action from real store state.
- No mock settings, fake migration success, sample rollback rows, or emoji glyph icons were introduced.

Validation evidence:

- Targeted Settings migration tests: `pnpm exec vitest run src/services/settings-migration/settings-migration.test.ts` passed with 6 tests.
- `pnpm exec vue-tsc --noEmit`, full `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, full `pnpm exec vitest run`, and `pnpm build` passed.
- Browser smoke verified `/settings?tab=about` renders the Schema and rollback section with schema v3/current 3 and zero post-clear console errors.
- `git diff --check` passed for touched Spec 41 files with only existing CRLF conversion warnings.

Known pending scope:

- Dedicated `MigrationModal`, `MigrationProgressModal`, SafeMode handoff, diagnostic package export, per-file-kind migration registry, rollback directory/checksum export, cross-profile/cloud sync migration, and full Playwright e2e remain outside this baseline and should be completed by follow-up specs 44/48/55 and future native packaging work.

## 2026-05-02 Spec 42 Baseline Acceptance Note

Baseline status: Pass for the compatible Markdown template variable baseline; full Spec 42 remains Pending for user template management, import/export, inline command integrations, and complete a11y/e2e coverage.

Accepted baseline coverage:

- Template variable runtime is implemented in `src/services/template/` with typed variable metadata, date formatting, UUID generation, author/week auto variables, cursor marker removal, user-input extraction, and malformed brace validation.
- Hub template selection now renders template content before using the existing `articleStore.addArticle` draft creation path, so selected templates no longer pass raw Markdown directly into drafts.
- Existing built-in templates, existing template picker, Hub template-market entry points, article lifecycle behavior, and routing are preserved.
- No mock templates, seeded fake documents, simulated creation success, deleted modules, or emoji glyph icons were introduced.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-42-templates`: passed after correcting the document lifecycle spec path to `11-document-lifecycle-spec.md`.
- Targeted template tests: `pnpm exec vitest run src/services/template/variable-engine.test.ts` passed with 4 tests.
- `pnpm exec vue-tsc --noEmit`, targeted lint, full `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, full `pnpm exec vitest run`, and `pnpm build` passed.
- Browser smoke verified real template-market creation of a Workstation draft, visible rendered content, no `{{...}}` placeholders, and zero console errors.
- BOM scan, emoji scan, and `git diff --check` passed for touched baseline files; only existing CRLF conversion warnings were reported.

Known pending scope:

- Built-in template normalization to the full Spec 42 standard set, user-template IndexedDB repository, import/export workflow, variable-fill UI, slash-command and command-palette integration, editor cursor placement from `cursorOffset`, extension registration API, full e2e/a11y/performance matrices, and packaged Tauri validation remain outside this baseline.
## 2026-05-02 Spec 43 Baseline Acceptance Note

Baseline status: Pass for the compatible Drafts Box batch-management baseline; full Spec 43 remains Pending for quick notes, command integrations, settings-backed preferences, and dedicated draft store abstraction.

Accepted baseline coverage:

- `/drafts` keeps using real local `articleStore` data and the existing `isDraftBoxStatus` lifecycle boundary.
- Drafts Box now supports list/grid view mode switching, active real-content preview, selectable drafts, select-all-visible behavior, batch archive, batch ready-to-publish, and one-step undo for the latest batch status change.
- Batch actions call `articleStore.updateArticle()` and therefore persist through the existing repository/lifecycle path rather than simulating list removal.
- The undo toolbar remains visible even when the last selected draft leaves the Drafts Box list, so the last-item archive edge case remains recoverable.
- Existing Hub/Workstation/Drafts routing, blank draft creation, filters, sorting, empty states, stale/recent signals, and legacy `new/read` notice remain intact.
- No mock drafts, seeded fake data, simulated success state, deleted components, or emoji glyph icons were introduced.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-43-drafts-box`: passed.
- `pnpm exec vue-tsc --noEmit`, targeted DraftsView lint, full `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, full `pnpm exec vitest run`, and `pnpm build` passed.
- Browser smoke created/used a real local draft, verified grid toggle, selection, batch archive, empty-list undo visibility, undo restore, preview panel, and console error count 0.
- BOM scan, emoji scan, and `git diff --check` passed for touched Drafts Box files.

Known pending scope:

- Dedicated `useDraftsStore`, quick-note source marking, command palette entry, Sidebar draft badge, long-press TabBar creation, persistent `settings.drafts.*`, richer range filters, batch publish workflow handoff, full keyboard/a11y matrix, and packaged Tauri verification remain pending.
## 2026-05-02 Spec 44 Baseline Acceptance Note

Baseline status: Pass for the existing file-picker Import Wizard compatible detection baseline after verification. Full Spec 44 remains Pending for the dedicated wizard component tree, converter registry, background queue, conflict resolver, asset pipeline handoff for converted attachments, drag/drop entry points, and complete e2e/a11y/performance matrices.

Accepted baseline coverage:

- Real file import still flows through `articleStore.importFromFiles()` -> `importFilesService()` -> repository-backed article creation for supported Markdown/HTML/TXT files.
- Format detection is now explicit and typed, with supported metadata for Markdown/HTML/TXT and unsupported metadata for DOCX/ZIP/JSON/Bear/unknown formats.
- Unsupported formats are accumulated as real import errors and are no longer silently imported as plain text.
- Oversize files remain skipped before parsing and the skipped count is carried through `FileImportResult` to Hub and FileManager UI.
- Hub renders the latest real import result after every import attempt, including no-write/cancel, success, failure, oversize skipped, and error preview states.
- FileManager's import toast stays compatible with the extended result model and surfaces oversize-only attempts instead of hiding them.
- Existing Hub/Quick Action/FileManager entry points, file picker service, article creation, sync-dirty tracking, audit logging for successful imports, and lifecycle behavior remain intact.
- No mock import data, fake converters, simulated success states, deleted components, or emoji glyph icons were introduced.

Validation evidence:

- Targeted format-detection tests passed with 4 tests.
- `pnpm exec vue-tsc --noEmit` passed after synchronizing FileManager with the extended import result model.
- Targeted lint for `src/services/file-import`, `src/stores/article.ts`, `src/views/HubView.vue`, and `src/components/file/FileManager.vue` passed.
- Full lint, full tests, build, browser smoke, BOM scan, emoji scan, Trellis validation, `git diff --check`, and untracked-file whitespace scan passed in the final closeout.

Known pending scope:

- `ImportWizard.vue` and step components, DOCX via mammoth, ZIP workspace scanning, Notion/Obsidian/Roam/Bear converters, import job queue persistence, conflict-resolution policies, full asset extraction handoff, downloadable error log, and packaged Tauri drag/drop/file-system validation remain outside this baseline.

## 2026-05-03 Spec 56 Baseline Acceptance Note

Baseline status: Pass for the compatible Citation/Footnote baseline; full Spec 56 remains Pending for full citeproc integration, citation autocomplete UI, right-side footnote editing panel, hover tooltip UI, file watching, bibliography NodeView authoring UI, and complete packaged Tauri/manual matrices.

Accepted baseline coverage:

- `src/services/citation/*` implements real local BibTeX parsing, footnote extraction, Pandoc-style citation cluster parsing, deterministic formatting, typed repository file-loader boundaries, and native export degradation helpers.
- Footnotes support `[^id]` references, `[^id]: definition` definitions, first-reference numbering, repeated references, multiple back links, missing-definition diagnostics, and indented multiline definitions without consuming following body text.
- Academic citations support `[@key]`, `[@a; @b]`, `[@key, p. 42]`, and `[-@key]`; unresolved citations remain explicit and do not fabricate author/year metadata.
- Real BibTeX entries can format inline citations and bibliography entries for `apa`, `mla`, `chicago-author-date`, and `gb-t-7714-2015` as deterministic local CSL-style output. This baseline does not claim full CSL processor compliance.
- `renderMarkdownWithOptionalEnhancements()` now feeds Preview, Typora hydration, authority HTML cache, and HTML export-derived paths through one citation/footnote-aware renderer.
- Typora serializer preserves `.ink-footnote-ref`, `.ink-academic-citation`, `.ink-footnotes`, and Tiptap-normalized `h2.ink-footnotes__title + ol > li[data-footnote-id]` as Markdown authority syntax.
- Preview sanitizer preserves only the safe `data-*` attributes needed by footnotes/citations; Xiaohongshu native text export expands citations/footnotes instead of leaking raw control syntax.
- Existing EditorPanel, MarkdownPreview, Markdown authority, export services, and no-Emoji/no-mock constraints remain intact.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-03-p1-56-citation`: passed with 7 implement entries and 6 check entries.
- Targeted citation tests passed: `pnpm -C inkforge exec vitest run src/services/citation/citation.test.ts src/services/markdown-ext/citation-render.test.ts src/extensions/TyporaMode.citation.test.ts src/services/export/citation-export.test.ts` with 4 files and 17 tests.
- `pnpm -C inkforge exec vue-tsc --noEmit`: passed.
- `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- Full tests passed: `pnpm -C inkforge exec vitest run` with 40 files and 284 tests.
- Production build passed: `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`; only existing Vite warnings remained for dynamic/static imports and chunks larger than 500 kB.
- Browser smoke used a real local Workstation article on `http://127.0.0.1:3005/`: Source-mode Markdown input produced 2 `.ink-footnote-ref`, 2 `.ink-footnote-back`, 1 `.ink-academic-citation--unresolved`, preserved `[^note]: Real footnote content.` after Typora round-trip, had no escaped `\\[` syntax, and had zero console errors.
- `git diff --check` passed for touched citation/task/spec files with only Windows CRLF conversion notices.

Known pending scope:

- Full citeproc/CSL XML runtime, Zotero/Mendeley/DOI/CrossRef/network lookup, `.bib` file watching, citation autocomplete, citation manager UI, right-side footnote panel, hover tooltip, bibliography NodeView insertion UI, platform-specific WeChat/Zhihu manual paste matrices, packaged Tauri filesystem smoke, and complete E2E/a11y/performance coverage remain outside this baseline.