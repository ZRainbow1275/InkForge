# InkForge v2.1 企业级增强 — 总体规划

> 2026-03-28 执行说明：`prompts/0327/*.md` 与 `.trellis/tasks/03-27-03-27-editor-hub-settings-full-upgrade/prd.md` 是当前 0327 任务线的权威实现账本。本文保留早期规划背景，但若与 0327 checkpoint 的完成状态冲突，应以后者为准。

**版本**: v2.1.0
**日期**: 2026-03-21
**状态**: In Progress
**基准版本**: v1.0.0 (`6cd4d5f`)

---

## 1. 项目背景

InkForge 是基于 Vue 3 + TipTap + Tauri 的跨平台 Markdown 编辑器，支持微信公众号/小红书/知乎多平台导出。当前 v1.0.0 已完成核心编辑、导出、AI 辅助等功能。本次 v2.1 增强旨在将产品从"功能可用"提升至"企业级体验"。

## 2. 技术栈（不变）

| 层 | 技术 | 版本 |
|----|------|------|
| 框架 | Vue 3 (Composition API) | ^3.5.13 |
| 编辑器 | TipTap | ^2.27.2 |
| 状态管理 | Pinia | ^2.2.8 |
| 样式 | Tailwind CSS | ^3.4.17 |
| 数据库 | Dexie (IndexedDB) | ^4.0.10 |
| 图标 | lucide-vue-next | ^0.468.0 |
| 类型检查 | TypeScript Strict | ~5.6.2 |
| 验证 | Zod | ^4.2.1 |
| 构建 | Vite | ^6.0.3 |
| 桌面端 | Tauri | ^1.6.0 |

## 3. 设计语言（不变）

**Ethereal Constructivism（空灵构成主义）**

| 令牌 | 值 |
|------|-----|
| 主色 (accent) | `#D32F2F` 构成红 |
| 背景 | `#FAFBFC` 宣纸色 |
| 表面 | `#FFFFFF` |
| 主文字 | `#263238` 墨色 |
| 次文字 | `#607D8B` |
| 弱文字 | `#90A4AE` |
| 边框 | `#ECEFF1` |
| 毛玻璃 | `rgba(255,255,255,0.85)` + `backdrop-filter: blur(20px)` |
| 动效曲线 | `cubic-bezier(0.16, 1, 0.3, 1)` |
| 弹性曲线 | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| 字体-标题 | `'Noto Serif SC', serif` |
| 字体-正文 | `system-ui, -apple-system, sans-serif` |
| 字体-代码 | `'JetBrains Mono', 'SF Mono', monospace` |

## 4. 全局约束

| 约束 | 说明 |
|------|------|
| **禁止 Emoji** | 所有图标必须使用 `lucide-vue-next`，包括分类、模板、状态等 |
| **禁止 Mock** | 所有数据必须来自 Pinia Store + Dexie IndexedDB 真实存储 |
| **不改编辑器核心** | TipTap Editor 实例配置和扩展列表不做破坏性变更 |
| **保持路由** | 现有路由路径不变：`/`, `/workstation`, `/publish`, `/settings`, `/themes` |
| **类型安全** | TypeScript Strict Mode，禁止 `any`，新代码必须 Zod 验证边界输入 |
| **无外部图表库** | 热力图/趋势图/环形图均用纯 SVG 实现 |
| **增量改造** | 在现有代码基础上增强，不做大规模重构 |

## 5. 改造模块总览

### 5.1 三大模块

| 模块 | Spec 文档 | 改动范围 | 优先级 |
|------|----------|---------|--------|
| **Hub 首页重设计** | `01-hub-redesign-spec.md` | HubView.vue + 8个新组件 | P1 |
| **Workstation 增强** | `02-workstation-spec.md` | WorkstationView.vue + 11个新/改组件 | P1 |
| **Settings 企业级** | `03-settings-enterprise-spec.md` | SettingsView.vue + stores + 3个新Tab | P2 |

### 5.2 基础设施模块

| 模块 | Spec 文档 | 改动范围 | 优先级 |
|------|----------|---------|--------|
| **数据模型演进** | `04-data-model-evolution.md` | db.ts v4升级 + 4张新表 | P1 (前置) |
| **同步架构** | `05-sync-architecture.md` | sync store + transport adapters + encryption | P2 |

### 5.3 Codex CLI 任务分解

| 文档 | 用途 |
|------|------|
| `06-codex-tasks.md` | Codex CLI 可直接执行的任务清单，含优先级和依赖关系 |

## 6. 依赖关系图

```
04-data-model-evolution (P1 前置)
    ├── 01-hub-redesign (P1)
    └── 02-workstation (P1)
         ↓
03-settings-enterprise (P2)
         ↓
05-sync-architecture (P2)
```

**执行顺序**:
1. 数据模型升级 (04) — 所有模块的前置
2. Hub 首页 (01) + Workstation (02) — 可并行
3. Settings (03) — 在 Hub/Workstation 验收后推进
4. 同步架构 (05) — 在 Settings 凭据配置与主密钥解锁链路稳定后验收

**说明**:
- Sync runtime 验收依赖 Settings 侧的同步凭据配置、主密钥初始化/解锁与恢复流程；不再视为可与 Settings 并行且互不耦合的独立阶段。

## 7. 新增组件总清单

### Hub 模块 (8个新组件)
| 组件 | 路径 |
|------|------|
| SectionScrollContainer | `components/hub/SectionScrollContainer.vue` |
| DayDetailPopover | `components/hub/DayDetailPopover.vue` |
| TemplateMarketCard | `components/hub/TemplateMarketCard.vue` |
| ContributionHeatmap | `components/hub/ContributionHeatmap.vue` |
| WordCountTrend | `components/hub/WordCountTrend.vue` |
| CategoryDistribution | `components/hub/CategoryDistribution.vue` |
| ArticleWaterfall | `components/hub/ArticleWaterfall.vue` |
| ArticleCard | `components/hub/ArticleCard.vue` |

### Workstation 模块 (11个新/改组件)
| 组件 | 路径 | 操作 |
|------|------|------|
| DraftBox | `components/file/DraftBox.vue` | 新建 |
| AssetPreview | `components/file/AssetPreview.vue` | 新建 |
| FileTree | `components/file/FileTree.vue` | 新建 |
| DiffViewer | `components/version/DiffViewer.vue` | 新建 |
| TabBar | `components/editor/TabBar.vue` | 新建 |
| WritingGoal | `components/editor/WritingGoal.vue` | 新建 |
| SyncMenu | `components/sync/SyncMenu.vue` | 新建 |
| SyncStatusIcon | `components/sync/SyncStatusIcon.vue` | 新建 |
| MarkdownHints.ts | `extensions/MarkdownHints.ts` | 新建 |
| diff.ts | `utils/diff.ts` | 新建 |
| VersionDiffModal | `components/version/VersionDiffModal.vue` | 重写 |

### Settings 模块 (新增Tab/组件)
| 组件 | 路径 | 操作 |
|------|------|------|
| AccountTab | SettingsView.vue 内 | 新增 section |
| SyncTab | SettingsView.vue 内 | 新增 section |
| AdvancedTab | SettingsView.vue 内 | 新增 section |
| SettingsSearch | SettingsView.vue 内 | 新增搜索功能 |

## 8. 数据模型变更摘要

### 新增表 (Dexie v4)
| 表名 | 主要字段 | 用途 |
|------|---------|------|
| `accounts` | id, name, email, avatar, bio | 本地账户 |
| `sync_logs` | id, action, documentId, status | 同步日志 |
| `settings_profiles` | id, name, settings(JSON) | 设置Profile |
| `activity_logs` | id, action, targetType, targetId | 活动记录 |

### 现有表扩展
| 表 | 新增字段 | 说明 |
|----|---------|------|
| `documents` | syncStatus, syncedAt, remoteVersion, accountId | 同步状态追踪 |

## 9. Spec 文档列表

| 文件 | 大小 | 描述 |
|------|------|------|
| `docs/specs/00-master-plan.md` | 本文档 | 总体规划和架构约束 |
| `docs/specs/01-hub-redesign-spec.md` | ~56K chars | Hub 首页完整改造规格 |
| `docs/specs/02-workstation-spec.md` | ~56K chars | Workstation 完整增强规格 |
| `docs/specs/03-settings-enterprise-spec.md` | ~24K chars | Settings 企业级改造规格 |
| `docs/specs/04-data-model-evolution.md` | ~13K chars | 数据模型演进规格 |
| `docs/specs/05-sync-architecture.md` | ~21K chars | 同步架构设计规格 |
| `docs/specs/06-codex-tasks.md` | ~15K chars | Codex CLI 任务清单 |

## 10. 质量标准

### 代码质量
- TypeScript Strict Mode 零错误
- ESLint 零警告
- 所有新组件必须有完整的 Props/Emits TypeScript 接口定义
- 边界输入使用 Zod Schema 验证
- 错误处理使用 `services/error.ts` 的 `logger`

### UI/UX 质量
- 所有交互必须有视觉反馈（hover/active/loading 状态）
- 动画时长 150-300ms，使用项目定义的 easing 曲线
- 响应式支持：1440px / 1024px / 768px / 375px 断点
- 键盘可访问性：Tab 导航 + Enter/Space 激活 + Escape 关闭

### 数据质量
- 零 Mock 数据，所有展示内容来自 IndexedDB
- 空状态必须有优雅的 Empty State UI
- 数据操作使用 Dexie 事务确保原子性
- 大量数据场景使用虚拟滚动或分页

---

*本文档为 InkForge v2.1 改造的顶层规划，具体实现细节请参考各 Spec 子文档。*
