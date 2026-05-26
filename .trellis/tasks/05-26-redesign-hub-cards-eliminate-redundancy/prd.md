# Redesign Hub Cards — Eliminate Redundancy

## Goal

HubView Bento 区域三张卡片（累计 / 新建作品 / 最近编辑）字段语义重叠：草稿数与连续天数同时出现在两张卡，最近编辑卡内 latestArticle 又重复进未完成列表。重构信息架构，让每个卡片只负责一类语义（数据看板 / 入口 / 任务接续），消除冗余。

## What I already know

### 重复字段定位（HubView.vue）

**累计卡** (`L1232-1267`)
- Hero: `stats.totalArticles` 篇 (L1239-1240)
- Secondary 行: 字数 L1252 / **草稿 L1256** / 完成率 L1260 / **连续 L1264**

**新建作品卡** (`L1269-1369`)
- Eyebrow + 标题 + 描述
- new-metrics: **草稿 L1289-1290** / **连续创作天 L1296-1297**
- Actions: 模板创建 + 导入文档
- import-result-panel (条件)

**最近编辑卡** (`L1492-1655`)
- Recent eyebrow + latestArticle hero (L1541) + 状态 + → 入口
- recent-articles-list (`articles.length > 1`)
- **recent-todo-list** (`todoArticlesForCard`) — 未完成清单，可能含 latestArticle
- recent-create-actions: 空白草稿 + 从模板创建

### 重复实质

1. **草稿数**：累计卡 + 新建卡（同语义，同 store 字段 `stats.draftCount`）
2. **连续天数**：累计卡 + 新建卡（同语义，同字段 `stats.streak`）
3. **未命名文章**：最近编辑 hero (latestArticle) + 未完成列表 (todoArticles 可能包含 latestArticle)

### 卡片设计意图（从 CSS 注释推断）

- `card-stats` (L5317) "累计指标卡（中间，单指标）" — 数据看板
- `card-new` (L5361) "新建作品 — 更高一档" — 创作入口
- `card-recent` (推测) — 最近活动 + 任务接续

设计意图三卡各司其职，但实施时 草稿/连续 同时挂上 累计 + 新建 两卡，违背单一职责。

## Assumptions (temporary)

- User 希望各卡职责单一：累计 = 看板、新建 = 入口、最近 = 任务接续
- 不动卡片网格/布局结构，仅消除字段层重复
- store / lifecycle / `stats.*` computed 逻辑不动

## Open Questions

无（决策已落见下）

## Decision (ADR-lite)

**Context**: 三卡字段重复（草稿/连续 × 2，未命名文章 × 2）

**Decision**: Approach A — 都留累计卡

- 累计卡 (`L1232-1267`) 保持原状（字数 / 草稿 / 完成率 / 连续 4 行）
- 新建卡 (`L1280-1299`) **删 `new-metrics` 整块**（草稿数 + 连续创作天 两项 + 容器 div）
- 最近编辑卡 `todoArticlesForCard` computed 增加 filter：剔除 `latestArticle.id`，避免 hero 与 todo 列表重复

**Consequences**:
- 三卡职责清：累计 = stats dashboard、新建 = 入口、最近 = 任务接续
- 新建卡 actions 上方留白增，需要 CSS 微调（`.card-new` padding 或 hero 区 margin）
- 不动 store / computed / lifecycle 任何逻辑层

## Requirements

1. 累计卡保留 字数 / 草稿 / 完成率 / 连续 4 行不变
2. 新建卡删 `new-metrics` 容器及 2 子项，调整 padding/spacing 不留塌陷
3. `todoArticlesForCard` 排除 `latestArticle`（若存在），保证去重
4. 不退化：stats 计算 / lifecycle 排序 / 模板入口 / 导入流程全保留
5. 视觉不破：三卡高度比例 / 网格布局保持

## Acceptance Criteria (evolving)

- [ ] 草稿 / 连续 字段在三卡中**仅出现 1 次**
- [ ] 未命名文章（latestArticle）不在"未完成"列表里重复出现
- [ ] `npm run typecheck` / `lint` / `test` 全绿
- [ ] HubView 视觉对齐（无空白塌方 / 卡片高度比例不破）
- [ ] User 手测确认 3 卡职责单一、字段无重复

## Out of Scope

- 不改 store / lifecycle / computeContentWordCount 等核心逻辑
- 不动 Bento 网格列宽行高
- 不重写 latestArticle / todoArticlesForCard 数据源
- 不并入 inspector typewriter / vignette / collision 任务

## Technical Notes

- 关键文件：`inkforge/src/views/HubView.vue` 单文件
- 改动面：template 局部 + 可能微调 CSS 占位
- 相关 spec：`prompts/0420/specs/02-spec-hub-layout.md`、`02-prd-hub.md`（待读）
- 同 commit 链：`dev/visual-fixes` 已含 HubView 之前 dirty 改动，本任务沿同分支再叠一层

## Implementation Plan

单 commit / 单文件 PR：

1. **Template**: 删 `card-new` 内 `<div v-if="stats.draftCount > 0 || stats.streak > 0" class="new-metrics" ...>` 整块 (`HubView.vue:1280-1299`)
2. **Computed**: 修 `todoArticlesForCard`（先 grep 定位）— 在排序过滤链加 `.filter(a => a.id !== latestArticle?.id)`
3. **CSS**: 看 `card-new` 视觉是否塌；如需，加 `.new-card-head { margin-bottom: ... }` 或 `.new-desc { margin-bottom: auto }` 让 actions 自然下沉
4. Gates: typecheck / lint / test
5. 手测 user 验收
