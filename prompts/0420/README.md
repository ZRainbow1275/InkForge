> 生成日期: 2026-04-21
> 版本: v2.1.0-draft
> 维护者: InkForge Spec 工程组

# InkForge v2.1 开发文档总览

本目录包含 InkForge v2.1 全部开发文档，涵盖产品需求（PRD）、技术规范（Spec）、架构决策记录（ADR）和验收矩阵。所有文档均以 Markdown 格式编写，遵循统一的命名和分级约定。

---

## 文档结构说明

### 根目录文件

| 文件名 | 说明 |
|--------|------|
| `README.md` | 本文件，开发文档总览与导航 |
| `specs-index.md` | 全部 Spec 文件的完整索引表，含编号、分级、状态和关联任务 |
| `acceptance-matrix.md` | 验收矩阵总表，含功能模块 AC 数量、性能 SLO、铁律覆盖情况 |

### specs/ 子目录

`specs/` 目录存放全部 PRD、技术规范与当前真相增补文件，截至 `2026-04-22` 共 63 份文档（含 PRD、Spec、Addendum 三种类型）。命名规则如下：

- `00-wave1-current-truth.md` — 当前真相增补（Addendum），用于校正已发生漂移的运行时实现口径，不替代原始 PRD / Spec
- `NN-prd-*.md` — 产品需求文档（Product Requirements Document），描述产品目标和用户价值
- `NN-spec-*.md` 或 `NN-*-spec.md` — 技术规范（Technical Specification），描述工程实现契约
- 编号 01~09 为核心层（P0 级别），10~30 为基础设施和工具链（P0/P1 混合），31+ 为增量功能和系统层

> 读取原则：`00-master-plan.md` 与 `00-task-roadmap.md` 中保留的 `65 / 68` 计数属于规划期口径；当前目录清册、实际文件名和运行时补丁请以本 README、`specs-index.md` 与 `specs/00-wave1-current-truth.md` 为准。

---

## 快速导航表

### P0 编辑器核心（优先级最高，必须首先完成）

| 编号 | 文件 | 类型 | 简述 |
|------|------|------|------|
| 01 | `01-prd-editor.md` | PRD | Typora 模式编辑器产品需求 |
| 01 | `01-spec-editor-typora.md` | Spec | 编辑器工程规范，含 TipTap Extension 清单、四模式状态机、ProseMirror 事务 |
| 03 | `03-prd-keyboard.md` | PRD | 键盘快捷键产品需求 |
| 03 | `03-keyboard-shortcuts-spec.md` | Spec | 快捷键、FindReplace、Chord、帮助面板 |
| 05 | `05-toolbar-complete-spec.md` | Spec | 浮动工具栏、右键菜单、斜杠命令完整规范 |
| 49 | `49-editor-keymap-spec.md` | Spec | 编辑器键盘映射（列表缩进、Tab 上下文感知、多光标） |
| 50 | `50-smart-punctuation-spec.md` | Spec | 智能标点自动替换规范 |

### P0 Hub 首页

| 编号 | 文件 | 类型 | 简述 |
|------|------|------|------|
| 02 | `02-prd-hub.md` | PRD | Hub 首页产品需求 |
| 02 | `02-spec-hub-layout.md` | Spec | Hub 布局组件工程规范，含路由、Store、动效、测试矩阵 |

### P0 渲染引擎

| 编号 | 文件 | 类型 | 简述 |
|------|------|------|------|
| 04 | `04-prd-rendering.md` | PRD | 渲染引擎产品需求 |
| 04 | `04-spec-rendering-core.md` | Spec | 渲染引擎核心，含 KaTeX WYSIWYG、Mermaid Stage、AST 管道 |
| 10 | `10-markdown-authority-spec.md` | Spec | Markdown 权威模型，所有内容模块的基础 Spec |
| 16 | `16-markdown-extensions-spec.md` | Spec | Markdown 扩展语法（表格、任务列表、脚注等） |

### P0 UI 外壳

| 编号 | 文件 | 类型 | 简述 |
|------|------|------|------|
| 09 | `09-prd-ui-polish.md` | PRD | UI 打磨产品需求 |
| 09 | `09-spec-ui-polish.md` | Spec | UI 视觉一致性、动效、无障碍规范 |
| 13 | `13-workstation-layout-spec.md` | Spec | Workstation 工作区三栏布局规范 |
| 14 | `14-statusbar-navigation-spec.md` | Spec | 状态栏与导航栏规范 |
| 20 | `20-theme-font-typography-spec.md` | Spec | 主题、字体、排版系统 |

### P1 工具链与功能

| 编号 | 文件 | 类型 | 简述 |
|------|------|------|------|
| 06 | `06-account-auth-spec.md` | Spec | 本地账户管理与认证（多账户、Chrome Profile 级隔离） |
| 07 | `07-settings-full-spec.md` | Spec | 设置面板完整规范（全部 Tab） |
| 08 | `08-data-insights-spec.md` | Spec | 数据洞察与写作统计 |
| 11 | `11-document-lifecycle-spec.md` | Spec | 文档生命周期 FSM、Scope 五层模型、Frontmatter 契约 |
| 12 | `12-file-manager-spec.md` | Spec | 文件管理器，含树视图、CRUD、排序、过滤 |
| 15 | `15-export-publish-spec.md` | Spec | 导出与发布（PDF、HTML、EPUB 等） |
| 19 | `19-ftue-help-spec.md` | Spec | 首次用户体验（FTUE）与帮助中心 |
| 21 | `21-focus-writing-assist-spec.md` | Spec | 专注写作辅助（禅模式、目标追踪） |
| 22 | `22-command-palette-spec.md` | Spec | 命令面板（模糊搜索、CommandRegistry） |
| 29 | `29-search-engine-spec.md` | Spec | 全文搜索引擎 |
| 38 | `38-toc-system-spec.md` | Spec | 目录系统（TOC 实时生成、同步滚动） |
| 47 | `47-tag-system-spec.md` | Spec | 标签系统 |

### 基础设施层

| 编号 | 文件 | 类型 | 简述 |
|------|------|------|------|
| 17 | `17-crash-recovery-spec.md` | Spec | 崩溃恢复与数据保护 |
| 18 | `18-tauri-desktop-spec.md` | Spec | Tauri 桌面能力（窗口管理、系统集成、原生 API） |
| 23 | `23-sync-provider-spec.md` | Spec | 同步提供者接口（多端同步、冲突处理） |
| 24 | `24-permission-audit-spec.md` | Spec | 权限模型与审计日志 |
| 27 | `27-performance-slo-spec.md` | Spec | 性能 SLO 硬指标（所有模块验收闸门） |
| 28 | `28-asset-pipeline-spec.md` | Spec | 资源管道（图片、附件上传与存储） |
| 33 | `33-diagnostic-logging-spec.md` | Spec | 诊断日志（ActivityLogger、错误分级、导出） |
| 34 | `34-layout-persistence-spec.md` | Spec | 布局持久化（窗口状态、面板开合状态） |
| 40 | `40-dev-panel-spec.md` | Spec | 开发者面板（性能监控、日志查看） |
| 41 | `41-settings-migration-spec.md` | Spec | 设置迁移方案（跨版本数据升级） |
| 48 | `48-session-restore-spec.md` | Spec | 会话恢复（崩溃后标签页和滚动位置还原） |
| 54 | `54-custom-css-spec.md` | Spec | 自定义 CSS 沙箱注入 |
| 55 | `55-updater-spec.md` | Spec | 应用内自动更新（Tauri updater） |

### 增量功能层

| 编号 | 文件 | 类型 | 简述 |
|------|------|------|------|
| 25 | `25-extension-plugin-spec.md` | Spec | 插件扩展系统 |
| 26 | `26-multi-account-profile-spec.md` | Spec | 多账户 Profile 管理 |
| 30 | `30-trash-recycle-spec.md` | Spec | 回收站（30 天软删除） |
| 31 | `31-version-bundle-spec.md` | Spec | 版本快照与历史记录 |
| 32 | `32-comment-review-spec.md` | Spec | 批注与 Review 功能 |
| 35 | `35-split-view-spec.md` | Spec | 分屏视图 |
| 36 | `36-wiki-link-spec.md` | Spec | Wiki 双向链接（[[link]] 语法） |
| 37 | `37-snippet-system-spec.md` | Spec | 代码片段系统 |
| 39 | `39-sync-scroll-spec.md` | Spec | 源码与预览同步滚动 |
| 42 | `42-templates-spec.md` | Spec | 文档模板系统 |
| 43 | `43-drafts-box-spec.md` | Spec | 草稿箱 |
| 45 | `45-tabbar-enhancement-spec.md` | Spec | 标签栏增强（固定、滚动、右键菜单） |
| 46 | `46-draggable-ordering-spec.md` | Spec | 拖拽排序（文档树、标签栏） |

---

## 阅读顺序建议（新开发者入门路径）

### 第一阶段：理解产品愿景（2 小时）

新开发者应首先阅读以下文件，建立对产品整体目标的理解：

1. `01-prd-editor.md` — 了解核心产品理念：Typora 模式所见即所得编辑器
2. `02-prd-hub.md` — 了解 Hub 首页和文档管理的产品目标
3. `04-prd-rendering.md` — 了解渲染引擎的产品需求

### 第二阶段：掌握架构基础（3 小时）

在阅读具体功能 Spec 之前，必须先掌握基础层文档：

4. `10-markdown-authority-spec.md` — **最重要的基础 Spec**，定义 Markdown 权威模型，所有内容 Spec 的基础
5. `11-document-lifecycle-spec.md` — 文档生命周期 FSM，理解文档状态和 Scope 层级模型
6. `27-performance-slo-spec.md` — 性能 SLO 硬指标，所有模块验收的闸门

### 第三阶段：核心功能 Spec（按任务顺序）

7. `01-spec-editor-typora.md` — 编辑器实现核心，含 TipTap Extension 和四模式状态机
8. `02-spec-hub-layout.md` — Hub 布局工程规范
9. `04-spec-rendering-core.md` — 渲染引擎实现

### 第四阶段：配套工具与基础设施

10. `03-keyboard-shortcuts-spec.md` — 键盘快捷键系统
11. `05-toolbar-complete-spec.md` — 工具栏和斜杠命令
12. `18-tauri-desktop-spec.md` — Tauri 桌面集成能力

### 第五阶段：增量功能（按需选读）

其余 Spec 按照实际负责的任务模块选择阅读，参考 `specs-index.md` 中的关联任务列。

---

## 核心设计原则摘要（10 条铁律）

以下铁律贯穿所有 Spec，任何实现决策均不得违反：

| 铁律编号 | 内容概要 | 涉及 Spec |
|----------|----------|-----------|
| R-01 | Markdown 权威性：源文件是唯一真值，任何渲染层不得反向修改源文件 | 全部内容相关 Spec |
| R-02 | 数据完整性：任何操作链路不得出现无法追溯的数据丢失 | 10, 11, 17, 23, 27 |
| R-03 | 文档状态六态机：Draft、Active、Archived、Deleted、Conflicted、Syncing | 11, 12 |
| R-04 | Scope 五层模型：Device / Workspace / Folder / Document / Block | 11, 26 |
| R-05 | Frontmatter 作为合同：frontmatter 字段变更必须经过 Schema 校验 | 10, 11 |
| R-13 | 渲染与编辑隔离：渲染产物（HTML/PDF）不得混入编辑状态 | 04, 15 |
| R-15 | 性能 SLO 硬指标：输入延迟 0ms 感知、保存 ≤ 1s、导出 ≤ 3min | 27（全局闸门） |
| R-16 | 文章不能丢：任何操作均须在数据落盘后再给用户反馈 | 11, 17, 23 |
| R-17 | 回收站 30 天软删除：永久删除前必须经过 30 天保护期 | 30, 11 |
| R-21 | 快捷键不与 OS 冲突：所有自定义快捷键必须经过系统级冲突检测 | 03, 49 |

---

## 技术栈速查

| 层 | 技术 | 版本要求 | 说明 |
|----|------|---------|------|
| 前端框架 | Vue 3 | ^3.4 | Composition API + `<script setup>` |
| 编辑器内核 | TipTap 2 | ^2.4 | 基于 ProseMirror，Typora 模式核心 |
| 状态管理 | Pinia | ^2.1 | 替代 Vuex，Store 定义见各功能 Spec |
| 本地数据库 | Dexie (IndexedDB) | ^3.2 | 文档、历史记录、日志持久化 |
| 样式系统 | Tailwind CSS | ^3.4 | 原子类，禁止行内 style |
| 桌面容器 | Tauri | ^1.5 或 ^2.x | 原生 API、文件系统、自动更新 |
| 后端（可选） | Hono | ^4.x | 轻量 API，同步服务端 |
| 数学渲染 | KaTeX | ^0.16 | WYSIWYG 数学公式 |
| 图表渲染 | Mermaid | ^10.x | 流程图、时序图 Stage 面板 |
| 类型检查 | TypeScript | Strict Mode | 禁止 `any`，强类型要求 |

---

## 版本与分支说明

| 分支 | 说明 |
|------|------|
| `main` | 稳定基线，v2.0 产品 |
| `dev/visual-fixes` | 当前活跃开发分支，视觉修复和 v2.1 预备工作 |
| `v2.1-*`（规划中） | v2.1 功能开发，将从 `main` 重新切出 |

### 版本里程碑

- **v2.0**：基础编辑器 + Hub 首页 + 本地存储，已发布
- **v2.1（当前规划）**：全面重写编辑器内核，完整工具链，性能 SLO 闸门，Tauri 深度集成

### Spec 状态定义

| 状态 | 含义 |
|------|------|
| Draft | 初稿，内容可能变动 |
| Approved | 已评审通过，可以进入实现阶段 |
| Implemented | 已完成实现并通过验收 |

---

## 文档贡献规范

1. 每份新 Spec 必须在顶部声明：文档编号、版本、创建日期、依赖 Spec、被依赖 Spec、铁律遵循
2. PRD 和 Spec 分开维护，PRD 描述"做什么"，Spec 描述"怎么做"
3. Spec 中的验收标准（AC）必须可机器验证，禁止模糊表述
4. 性能指标必须引用 `27-performance-slo-spec.md` 中定义的 SLO，不得自行定义
5. 所有新功能 Spec 上线前须通过 `acceptance-matrix.md` 中对应条目的验收

---

## 常见问题速查

### 问题 1：我需要修改编辑器的粘贴行为，应该看哪份 Spec？

首先看 `01-spec-editor-typora.md`（§7 粘贴规则 Paste Rules），再看 `10-markdown-authority-spec.md`（了解 Markdown 权威模型约束），最后确认粘贴内容是否涉及图片（查 `28-asset-pipeline-spec.md`）。

### 问题 2：我需要新增一个快捷键，流程是什么？

1. 在 `03-keyboard-shortcuts-spec.md` 中查找快捷键注册规范
2. 确认新键位不与 OS 及现有键位冲突（R-21 铁律）
3. 通过 `49-editor-keymap-spec.md` 中的 CommandRegistry 注册
4. 在 `07-settings-full-spec.md` Shortcuts Tab 中添加用户可见条目

### 问题 3：我需要添加新的文档状态，影响哪些 Spec？

文档状态由 `11-document-lifecycle-spec.md`（§3 六态 FSM）定义。任何状态变更会影响：`12-file-manager-spec`（文件树显示）、`30-trash-recycle-spec`（回收站流转）、`31-version-bundle-spec`（版本快照触发时机）、`23-sync-provider-spec`（同步状态映射）。

### 问题 4：性能指标超标了怎么办？

查 `27-performance-slo-spec.md` 的能力分级（critical/durable/deferrable）和自动降级策略，按对应策略实现降级模式，并在 `33-diagnostic-logging-spec.md` 中记录越界事件。

### 问题 5：Tauri 原生 API 调用应该在哪里声明？

所有 Tauri invoke 命令必须在 `18-tauri-desktop-spec.md` 的"命令白名单"章节中注册，并在 `24-permission-audit-spec.md` 中声明权限级别。

---

## Spec 编号分配规则

编号体系设计如下：

| 编号范围 | 用途 |
|----------|------|
| 01~09 | P0 核心功能（编辑器、Hub、渲染、键盘、UI 外壳） |
| 10~19 | 文档模型与生命周期基础层（Markdown 权威、生命周期、文件管理、导出、桌面） |
| 20~29 | 工具链与平台层（主题、专注、命令、同步、权限、扩展、多账户、性能、资源） |
| 30~39 | 扩展功能（回收站、版本、批注、搜索、Wiki、Snippet、TOC、同步滚动、布局） |
| 40~49 | 工程基础设施（DevPanel、迁移、模板、草稿、标签栏、拖拽、标签、恢复、Keymap） |
| 50~59 | 增量特性（标点、自定义 CSS、更新器等） |

编号不连续属正常情况，预留空间供后续扩展。

---

## 索引文件维护说明

本目录下三份索引文件须同步维护：

| 文件 | 更新时机 |
|------|---------|
| `README.md` | 新增功能域、修改技术栈、调整阅读路径时 |
| `specs-index.md` | 新增/删除/重命名任何 Spec 文件时 |
| `acceptance-matrix.md` | 模块验收通过（改状态为 Pass）或新增 AC 时 |

三份文件均无需频繁更新，仅在里程碑节点（Spec 评审完成、功能验收完成）时同步更新即可。

---

## 开发阶段计划

InkForge v2.1 开发分为以下几个阶段推进：

| 阶段 | 内容 | 对应 Spec 分组 |
|------|------|--------------|
| Phase 0 | 基础层建设（Markdown 权威模型、文档生命周期、性能 SLO 定义） | 10, 11, 27 |
| Phase 1 | P0 核心路径（编辑器、Hub、渲染引擎、键盘、工具栏） | 01, 02, 04, 03, 05, 09 |
| Phase 2 | P1 文档管理与工具链（文件管理、导出、账户、设置、搜索） | 12, 15, 06, 07, 29 |
| Phase 3 | 基础设施层（崩溃恢复、Tauri、同步、权限、布局持久化） | 17, 18, 23, 24, 34 |
| Phase 4 | 增量功能（Wiki 链接、版本历史、回收站、模板、片段） | 31, 30, 36, 42, 37 |
| Phase 5 | 系统层（日志诊断、开发者面板、迁移、更新器） | 33, 40, 41, 55 |

各阶段完成后须更新 `acceptance-matrix.md` 中对应模块的验收状态。
