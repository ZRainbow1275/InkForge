> 生成日期: 2026-04-21
> 版本: v2.1.0-draft
> 说明: 本文件为 specs/ 目录下全部 63 份文档的完整索引表，按优先级分组排列

# InkForge v2.1 — Spec 文件完整索引

---

## 说明

- **文档类型**：PRD = 产品需求文档；Spec = 技术规范；Addendum = 当前真相增补
- **优先级**：P0 = 核心路径，必须首先完成；P1 = 重要功能；Infra = 基础设施层；Incr = 增量功能层
- **状态**：Draft = 草稿；Approved = 已评审；Authoritative = 当前权威技术口径；Living = 随实现推进持续回写的当前真相增补；Implemented = 已实现
- **关联任务**：对应 v2.1 任务追踪编号

## 2026-04-21 当前阅读提示

- 本索引中的 `Draft / Approved` 状态描述的是文档评审状态，不等于“代码尚未实现”。
- `01 / 07 / 10 / 13 / 15` 相关链路在 `0420 Wave 1` 中已经出现真实代码落地，但尚未完成一次覆盖全部 AC 的统一复验。
- 继续开发前，请同时参考 `prompts/0420/specs/00-wave1-current-truth.md`，避免把旧 spec 口径直接当作当前运行事实。
- `00-master-plan.md` 与 `00-task-roadmap.md` 中出现的 `65 / 68` 属于规划阶段计数；当其与当前文件树冲突时，以本索引为准。

---

## Meta / Current Truth

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 00 | `00-wave1-current-truth.md` | Addendum | 2026-04-22 Wave 1 当前真相增补，用于校正 editor/settings/workstation/hub 的运行时口径 | Living | Wave1 | README, acceptance-matrix |

---

## P0 级（核心路径，必须先完成）

### P0-A 编辑器核心

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 01 | `01-prd-editor.md` | PRD | Typora 模式编辑器产品需求，含用户旅程、功能范围、MUST/SHOULD/WON'T 清单 | Draft | T01 | 10, 11 |
| 01 | `01-spec-editor-typora.md` | Spec | 编辑器工程规范，TipTap Extension 清单、四模式状态机、ProseMirror 事务中间件、大文档分片、IME 兼容 | Draft | T01 | 10, 11, 01-prd |
| 49 | `49-editor-keymap-spec.md` | Spec | 编辑器键盘映射，列表 Enter 减少缩进（Notion 风格）、Tab 上下文感知、多光标 Ctrl+D、撤销逻辑分组 | Draft | T01, T03 | 01-spec-editor, 03, 22, 50 |
| 50 | `50-smart-punctuation-spec.md` | Spec | 智能标点自动替换，引号配对、破折号转换、CJK 标点规则 | Draft | T01 | 01-spec-editor, 49 |

### P0-B Hub 首页

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 02 | `02-prd-hub.md` | PRD | Hub 首页产品需求，铁三角布局、最近文档、快速创建 | Draft | T02 | - |
| 02 | `02-spec-hub-layout.md` | Spec | Hub 布局与组件工程规范，路由契约、Store（Pinia）、栅格、动效、可见性规则、测试矩阵 | Approved | T02 | 08, 20, 27 |

### P0-C 渲染引擎

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 04 | `04-prd-rendering.md` | PRD | 渲染引擎产品需求，KaTeX、Mermaid、代码高亮 | Draft | T04 | 10 |
| 04 | `04-spec-rendering-core.md` | Spec | 渲染引擎核心规范，Markdown→AST→平台 adapter 管道，KaTeX WYSIWYG 完整模式，Mermaid Stage 面板，错误处理 | Draft | T04 | 10, 16, 27, 15 |
| 16 | `16-markdown-extensions-spec.md` | Spec | Markdown 扩展语法规范，表格、任务列表、脚注、代码块高亮、数学块 | Draft | T04 | 10 |

### P0-D 键盘与工具栏

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 03 | `03-prd-keyboard.md` | PRD | 键盘快捷键产品需求，快捷键优先级、发现性、自定义 | Draft | T03 | - |
| 03 | `03-keyboard-shortcuts-spec.md` | Spec | 快捷键完整规范，FindReplace、Chord（和弦）快捷键、帮助面板、冲突检测 | Draft | T03 | 22, 26, 37, 49 |
| 03 | `03-spec-keybindings.md` | Spec | 键盘快捷键权威技术规范，含分层架构、全量键位、平台差异、冲突覆盖与帮助面板 | Authoritative | T03 | 01-spec-editor, 07, 14, 22, 37, 49 |
| 05 | `05-toolbar-complete-spec.md` | Spec | 浮动工具栏、右键菜单、斜杠命令（/command）完整规范，含版本点、权限约束 | Draft | T05 | 01-spec-editor, 22, 24, 25, 28 |

### P0-E UI 外壳

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 09 | `09-prd-ui-polish.md` | PRD | UI 打磨产品需求，视觉一致性、动效标准 | Draft | T09 | - |
| 09 | `09-spec-ui-polish.md` | Spec | UI 视觉规范，组件一致性 Token、动效曲线、无障碍 WCAG 2.1 AA | Draft | T09 | 20 |

### P0-F Markdown 权威模型（全局基础）

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 10 | `10-markdown-authority-spec.md` | Spec | Markdown 权威模型，双层权威（源文件 + Schema），R-01/R-02/R-13/R-14 铁律实现，所有内容模块的基础 Spec | Draft | T01, T04 | 无（根节点） |

---

## P1 级（重要功能，P0 完成后进行）

### P1-A 文档管理与生命周期

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 11 | `11-document-lifecycle-spec.md` | Spec | 文档生命周期 FSM（六状态）、Scope 五层模型、Frontmatter 契约、IndexedDB Schema | Draft | T02, T11 | 10 |
| 12 | `12-file-manager-spec.md` | Spec | 文件管理器，树视图与列表视图、CRUD 操作、多维排序、过滤系统、TypeScript 类型 | Draft | T02 | 11, 29, 47, 31 |
| 30 | `30-trash-recycle-spec.md` | Spec | 回收站，30 天软删除保护期，批量恢复，永久删除二次确认 | Draft | T11 | 11 |
| 31 | `31-version-bundle-spec.md` | Spec | 版本快照（快速保存点）、历史记录浏览、版本 diff、还原 | Draft | T11 | 10, 11 |
| 43 | `43-drafts-box-spec.md` | Spec | 草稿箱，未完成文档暂存，草稿与正式文档分区 | Draft | T11 | 11 |

### P1-B 工具链

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 06 | `06-account-auth-spec.md` | Spec | 本地账户管理与认证，多账户 Chrome Profile 级隔离、并行多窗口、Windows Hello、高危操作二次认证 | Draft | T06 | 26, 23, 24, 17, 41 |
| 07 | `07-settings-full-spec.md` | Spec | 设置面板完整规范，所有 Tab 页（通用、编辑器、快捷键、账户、同步、关于）的字段清单 | Draft | T07 | - |
| 08 | `08-data-insights-spec.md` | Spec | 数据洞察，写作统计（字数、时长、字符频率）、周/月报表、导出 CSV | Draft | T08 | - |
| 15 | `15-export-publish-spec.md` | Spec | 导出与发布，PDF、HTML、EPUB、Docx 导出管道，模板化导出 | Draft | T15 | 04, 10 |
| 19 | `19-ftue-help-spec.md` | Spec | 首次用户体验（FTUE），新用户引导流程，内置帮助中心，快捷键速查卡 | Draft | T19 | 03 |
| 21 | `21-focus-writing-assist-spec.md` | Spec | 专注写作辅助，禅模式（全屏无干扰）、写作目标追踪、完成动效 | Draft | T21 | 01-spec-editor |
| 22 | `22-command-palette-spec.md` | Spec | 命令面板，CommandRegistry、CommandExecutor、FuzzySearchEngine、命令分类体系 | Draft | T22 | - |
| 29 | `29-search-engine-spec.md` | Spec | 全文搜索引擎，IndexedDB 全文索引，搜索结果高亮，过滤器（标签、日期、类型） | Draft | T29 | 11, 47 |
| 38 | `38-toc-system-spec.md` | Spec | 目录系统，实时 TOC 生成（从 Markdown Heading 解析），高亮当前章节，点击跳转 | Draft | T38 | 01-spec-editor |
| 44 | `44-import-wizard-spec.md` | Spec | 导入向导，覆盖格式检测、五步导入流程、ImportJobQueue、图片提取与冲突处理 | Draft | T44 | 10, 12, 18, 28 |
| 47 | `47-tag-system-spec.md` | Spec | 标签系统，多级标签树、自动补全、标签统计视图 | Draft | T47 | 11, 12 |

### P1-C 布局与视图

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 13 | `13-workstation-layout-spec.md` | Spec | Workstation 三栏布局，左侧边栏（文件树）、中央编辑区、右侧面板，响应式断点 | Draft | T13 | 18 |
| 14 | `14-statusbar-navigation-spec.md` | Spec | 状态栏与导航栏，字数统计、文档状态指示、光标位置、面板切换入口 | Draft | T14 | 01-spec-editor |
| 20 | `20-theme-font-typography-spec.md` | Spec | 主题系统（亮色/暗色/自定义）、字体设置、排版 Token，CSS 变量定义 | Draft | T20 | - |
| 35 | `35-split-view-spec.md` | Spec | 分屏视图（编辑+预览左右分屏），分屏比例记忆，同步滚动接口 | Draft | T35 | 39 |
| 39 | `39-sync-scroll-spec.md` | Spec | 源码与预览同步滚动，基于 ProseMirror 位置映射的精确同步算法 | Draft | T39 | 01-spec-editor, 04 |
| 45 | `45-tabbar-enhancement-spec.md` | Spec | 标签栏增强，标签固定（Pin）、溢出滚动、右键上下文菜单、拖拽排序 | Draft | T45 | 46 |
| 46 | `46-draggable-ordering-spec.md` | Spec | 拖拽排序系统，文档树节点拖拽、标签栏拖拽，基于 dnd-kit 实现规范 | Draft | T46 | - |

---

## 基础设施层（Infrastructure）

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 17 | `17-crash-recovery-spec.md` | Spec | 崩溃恢复，DiagnosticPackage 结构，自动保存心跳（≤1s），崩溃后数据还原流程 | Draft | T17 | 11, 27 |
| 18 | `18-tauri-desktop-spec.md` | Spec | Tauri 桌面能力，窗口管理、原生菜单、文件系统 API、系统通知、自动更新 Hook | Draft | T18 | 13, 28, 34, 55 |
| 23 | `23-sync-provider-spec.md` | Spec | 同步提供者接口，多端同步协议，冲突检测（≤10s），离线队列，增量同步 | Draft | T23 | 10, 11, 27 |
| 24 | `24-permission-audit-spec.md` | Spec | 权限模型与审计日志，操作权限矩阵，审计日志格式，权限越界告警 | Draft | T24 | 06 |
| 27 | `27-performance-slo-spec.md` | Spec | 性能 SLO 硬指标定义，能力分级（critical/durable/deferrable），自动降级策略，Bundle 预算，CI Lighthouse 门槛 | Draft | 全局 | 无（被所有模块引用） |
| 28 | `28-asset-pipeline-spec.md` | Spec | 资源管道，图片/附件上传、本地缓存、云端同步、哈希校验，资源引用路径规范 | Draft | T28 | 23 |
| 33 | `33-diagnostic-logging-spec.md` | Spec | 诊断日志系统，ActivityLogger（IndexedDB 7 天），5 级日志模型，全局 errorHandler，export_logs 表 | Draft | T33 | 17, 24 |
| 34 | `34-layout-persistence-spec.md` | Spec | 布局持久化，窗口位置/尺寸、面板开合状态、分屏比例持久化到 Tauri Store | Draft | T34 | 18 |
| 40 | `40-dev-panel-spec.md` | Spec | 开发者面板，性能监控实时曲线、日志查看器、Store 状态检查器、Tauri 命令测试 | Draft | T40 | 33, 27 |
| 41 | `41-settings-migration-spec.md` | Spec | 设置迁移方案，版本号驱动的迁移脚本机制，迁移失败回滚，Dexie 版本迁移 API | Draft | T41 | 07 |
| 48 | `48-session-restore-spec.md` | Spec | 会话恢复，崩溃后或重启后标签页列表、滚动位置、光标位置的完整还原 | Draft | T48 | 17, 34 |
| 54 | `54-custom-css-spec.md` | Spec | 自定义 CSS 沙箱，用户 CSS 注入到文档渲染区，隔离层防止破坏 UI 框架 | Draft | T54 | 20 |
| 55 | `55-updater-spec.md` | Spec | 应用内自动更新，Tauri updater 集成，后台检查/下载，强制更新策略，更新日志展示 | Draft | T55 | 18 |

---

## 增量功能层（Incremental Features）

| 编号 | 文件名 | 文档类型 | 简述 | 状态 | 关联任务 | 依赖 Spec |
|------|--------|---------|------|------|----------|-----------|
| 25 | `25-extension-plugin-spec.md` | Spec | 插件扩展系统，插件注册接口、沙箱隔离、插件市场接入、能力声明模型 | Draft | T25 | 05, 22 |
| 26 | `26-multi-account-profile-spec.md` | Spec | 多账户 Profile 管理，Profile 切换、数据隔离边界、共享区（跨账户可见） | Draft | T06 | 06 |
| 32 | `32-comment-review-spec.md` | Spec | 批注与 Review，行内批注（Annotation）、批注线程、Review 状态机 | Draft | T32 | 01-spec-editor, 11 |
| 36 | `36-wiki-link-spec.md` | Spec | Wiki 双向链接，`[[link]]` 语法解析、反向链接面板、孤立文档检测 | Draft | T36 | 10, 11, 29 |
| 37 | `37-snippet-system-spec.md` | Spec | 代码片段系统，自定义 Snippet 库、触发词扩展、变量插值 | Draft | T37 | 01-spec-editor, 03 |
| 42 | `42-templates-spec.md` | Spec | 文档模板系统，内置模板库（日记、周报、项目计划）、自定义模板创建与导入 | Draft | T42 | 11, 10 |
| 51 | `51-block-drag-handle-spec.md` | Spec | 块级拖拽柄，含虚影跟随、插入线与 Alt+↑/↓ 键盘替代路径 | Draft | T51 | 01-spec-editor, 10, 46 |
| 52 | `52-table-extension-v2-spec.md` | Spec | 表格增强 v2，含列宽拖拽、对齐、GFM pipe 往返与大表格优化 | Draft | T52 | 01-spec-editor, 05, 10 |
| 53 | `53-image-extension-v2-spec.md` | Spec | 图片增强 v2，含 figure/caption、resize、对齐、asset:// 与 AssetPipeline 集成 | Draft | T53 | 01-spec-editor, 05, 10, 28 |
| 56 | `56-citation-spec.md` | Spec | 引用/参考文献系统，含脚注、学术引用、BibTeX/CSL 与导出集成 | Draft | T56 | 01-spec-editor, 10, 15, 16 |

---

## PRD 文件汇总（按编号）

| 编号 | 文件名 | 对应 Spec | 简述 |
|------|--------|-----------|------|
| 01 | `01-prd-editor.md` | `01-spec-editor-typora.md` | Typora 模式编辑器产品需求 |
| 02 | `02-prd-hub.md` | `02-spec-hub-layout.md` | Hub 首页产品需求 |
| 03 | `03-prd-keyboard.md` | `03-spec-keybindings.md` | 键盘快捷键产品需求 |
| 04 | `04-prd-rendering.md` | `04-spec-rendering-core.md` | 渲染引擎产品需求 |
| 09 | `09-prd-ui-polish.md` | `09-spec-ui-polish.md` | UI 打磨产品需求 |

---

## 依赖关系图（关键节点）

下表列出 Spec 间的关键依赖关系（仅列举直接依赖的核心节点）：

| Spec | 直接被以下 Spec 依赖 |
|------|---------------------|
| `10-markdown-authority-spec` | 01-spec-editor, 04-spec-rendering-core, 11, 15, 16, 23, 29, 31, 36, 42 |
| `11-document-lifecycle-spec` | 12, 15, 17, 19, 25, 29, 30, 31, 36, 42, 45 |
| `27-performance-slo-spec` | 01-spec-editor, 02-spec-hub, 04-spec-rendering-core, 08, 09, 15, 17, 23, 29, 31, 40 |
| `01-spec-editor-typora` | 03, 05, 21, 32, 37, 38, 39, 49, 50 |
| `17-crash-recovery-spec` | 33, 48 |
| `18-tauri-desktop-spec` | 13, 34, 48, 55 |

---

## Spec 总数统计

| 分类 | 数量 |
|------|------|
| Current-truth / Addendum | 1 |
| P0 核心路径（Spec） | 11 |
| P0 配套 PRD | 5 |
| P1 重要功能 | 23 |
| 基础设施层 | 13 |
| 增量功能层 | 10 |
| **合计** | **63** |

---

## Spec 状态说明

| 状态值 | 含义 | 是否可进入实现阶段 |
|--------|------|-----------------|
| Draft | 初稿，内容仍可能调整，未经评审 | 否，需先评审通过 |
| Approved | 评审通过，工程团队可以开始实现 | 是 |
| Authoritative | 当前权威技术口径，供实施和后续文档合并参考 | 是，但仍需结合 current-truth 判断真实落地 |
| Living | 当前真相增补，随着实现推进持续回写 | N/A（用于校正当前事实） |
| Implemented | 已完成实现并通过全部 AC 验收 | N/A（已完成） |
| Deprecated | 已废弃，被更新的 Spec 取代 | 否 |

注意：截至 2026-04-22，`specs/` 目录当前没有任何文件显式标记为 `Implemented`；这不等于相关代码完全未实现。运行时落地请结合 `00-wave1-current-truth.md` 与 `acceptance-matrix.md` 一起阅读。

---

## 快速查找：按关键词定位 Spec

| 关键词 | 目标 Spec |
|--------|-----------|
| TipTap、ProseMirror、Extension | `01-spec-editor-typora` |
| KaTeX、数学公式、WYSIWYG 公式 | `04-spec-rendering-core` |
| Mermaid、流程图 | `04-spec-rendering-core` |
| 快捷键、Chord、FindReplace、Keybindings | `03-spec-keybindings`、`03-keyboard-shortcuts-spec` |
| 斜杠命令、/command、slash | `05-toolbar-complete-spec` |
| 浮动工具栏、FloatingToolbar | `05-toolbar-complete-spec` |
| Hub、首页、铁三角 | `02-spec-hub-layout` |
| 导入、ImportWizard、Notion、Obsidian | `44-import-wizard-spec` |
| Frontmatter、YAML、元数据 | `10-markdown-authority-spec`、`11-document-lifecycle-spec` |
| 六态机、文档状态 | `11-document-lifecycle-spec` |
| Scope、工作区、命名空间 | `11-document-lifecycle-spec`、`26-multi-account-profile-spec` |
| IndexedDB、Dexie | `11-document-lifecycle-spec`、`33-diagnostic-logging-spec`、`41-settings-migration-spec` |
| 自动保存、心跳保存 | `17-crash-recovery-spec`、`27-performance-slo-spec` |
| 崩溃恢复、DiagnosticPackage | `17-crash-recovery-spec`、`48-session-restore-spec` |
| Tauri、invoke、原生 API | `18-tauri-desktop-spec` |
| 同步、冲突检测、多端 | `23-sync-provider-spec` |
| 权限、审计日志 | `24-permission-audit-spec` |
| 插件、扩展、沙箱 | `25-extension-plugin-spec` |
| 多账户、Profile、切换 | `06-account-auth-spec`、`26-multi-account-profile-spec` |
| SLO、性能指标、Lighthouse | `27-performance-slo-spec` |
| 图片上传、附件、资源 | `28-asset-pipeline-spec` |
| 全文搜索、FTS | `29-search-engine-spec` |
| 回收站、软删除 | `30-trash-recycle-spec` |
| 版本历史、快照、diff | `31-version-bundle-spec` |
| Wiki 链接、反向链接、`[[` | `36-wiki-link-spec` |
| Snippet、代码片段、触发词 | `37-snippet-system-spec` |
| TOC、目录、大纲 | `38-toc-system-spec` |
| 同步滚动、源码预览 | `39-sync-scroll-spec` |
| DevPanel、开发者面板 | `40-dev-panel-spec` |
| 设置迁移、数据库升级 | `41-settings-migration-spec` |
| 模板、文档模板 | `42-templates-spec` |
| 草稿、草稿箱 | `43-drafts-box-spec` |
| 块级拖拽、Drag Handle、GripVertical | `51-block-drag-handle-spec` |
| 表格增强、列宽拖拽、pipe table | `52-table-extension-v2-spec` |
| 图片调整、Caption、asset:// | `53-image-extension-v2-spec` |
| 标签栏、Tab、Pin | `45-tabbar-enhancement-spec` |
| 拖拽、dnd-kit | `46-draggable-ordering-spec` |
| 标签、Tag、分类 | `47-tag-system-spec` |
| 会话恢复、重启还原 | `48-session-restore-spec` |
| 列表缩进、多光标、Ctrl+D | `49-editor-keymap-spec` |
| 智能引号、标点替换 | `50-smart-punctuation-spec` |
| 自定义 CSS、用户样式 | `54-custom-css-spec` |
| 自动更新、updater | `55-updater-spec` |
| 脚注、Citation、BibTeX、CSL | `56-citation-spec` |
| 主题、暗色、字体 | `20-theme-font-typography-spec` |
| 无障碍、ARIA、WCAG | `09-spec-ui-polish` |
| 日志、ActivityLogger | `33-diagnostic-logging-spec` |
| 分屏、Split View | `35-split-view-spec` |
| 命令面板、Cmd+K | `22-command-palette-spec` |
| 导出、PDF、EPUB | `15-export-publish-spec` |
| FTUE、新用户引导 | `19-ftue-help-spec` |
| 专注模式、禅模式 | `21-focus-writing-assist-spec` |
| 批注、Review、评论 | `32-comment-review-spec` |
| 布局持久化、窗口状态 | `34-layout-persistence-spec` |
