# P1 Document Lifecycle Baseline

## 规格参考
- `prompts/0420/specs/11-document-lifecycle-spec.md`
- `prompts/0420/specs/10-markdown-authority-spec.md`
- `prompts/0420/specs/00-wave1-current-truth.md`
- `prompts/0420/acceptance-matrix.md`

## 背景
`11-document-lifecycle-spec` 是 `10-markdown-authority-spec` 之后的第二层基础合同。当前真实代码只稳定消费 `draft / new / read / processed` 四态兼容模型；完整六态 `draft / writing / under_review / ready_to_publish / published / archived`、Scope 五层、回收站、版本、事件日志等仍未全量落地。本任务做兼容式 baseline：新增 lifecycle core 与真实 store/repository 接线，逐步把状态迁移收口到受控 FSM，不破坏现有 Hub / Drafts / Workstation 链路。

## 目标
1. 新增 `src/core/lifecycle/` 模块，集中定义目标六态、legacy 四态兼容、状态投影、守卫与 transition 结果类型。
2. 扩展 `ArticleStatusSchema`，在保留 `new/read/processed` legacy 值可读的同时支持目标六态。
3. 为现有文章新建、编辑保存、选中、发布/归档相关状态变更提供统一 lifecycle helper，不再把状态字符串散落在 store 中。
4. `rawContent/markdownSource` 达到实质内容门槛时，可从 `draft` 自动提升到 `writing`；legacy `new/read` 仍按 current-truth 兼容，不强制迁移造成 UI 破坏。
5. frontmatter mirror 与 authority 写入继续保持一致，状态更新必须同步 `markdownSource` frontmatter。
6. 更新 Hub/Drafts/Workstation 对新增 lifecycle 目标态的显示与筛选兼容，不删除已有 `draft` 草稿箱入口。
7. 完成真实 type/lint/build 与浏览器 store/repository 状态迁移自检。

## 非目标
- 不一次性创建 13 张 IndexedDB 新表。
- 不实现完整 Scope 五层、多 workspace、多 account IDB 分库。
- 不实现 Windows Hello、回收站 30 天 TTL、版本 999 上限、审计事件表的全量链路。
- 不把所有现有文章强制迁移到六态，避免破坏已有数据。

## Acceptance Criteria
- [x] lifecycle core 模块提供六态定义、legacy 兼容判定、显示文案、状态投影、守卫与 transition helper。
- [x] `ArticleStatusSchema` 能解析目标六态与 legacy 四态，现有 legacy 文章不会丢失或无法读取。
- [x] `addArticle` / `addArticleFromUrl` / 文件导入间接创建仍可真实写入文章，并写入可被 lifecycle helper 识别的状态。
- [x] `updateArticle(rawContent/title/status/tags)` 继续同步 authority 字段，且 `draft` 达到实质内容门槛时可提升为 `writing`。
- [x] Hub / Drafts / Workstation 对 `writing / under_review / ready_to_publish / published / archived` 至少具备非空显示文案与不崩溃回退。
- [x] `pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 通过。
- [x] 浏览器 Pinia + Dexie lifecycle 自检通过，测试文章创建、状态迁移、authority 校验、删除清理均真实执行。

## 2026-04-30 Implementation Plan
1. 建立 `src/core/lifecycle/`，封装状态常量、legacy 兼容、guard、transition projection。
2. 扩展 schema/常量引用，保持现有 `ARTICLE_STATUS` API 不破坏。
3. 接入 article store 的创建、选中、更新、分类移动路径，确保 authority mirror 同步。
4. 审查 Hub/Drafts/Workstation 的状态文案和筛选逻辑，补齐目标态兼容。
5. 运行静态检查、build、浏览器真实 store/repository 自检。
6. 回写 `11-document-lifecycle-spec`、`acceptance-matrix` 与 task 状态。

## 2026-04-30 Completion Note

完成 `11-document-lifecycle-spec` compatible baseline。新增 `src/core/lifecycle/`，把六态目标模型、legacy 状态兼容、草稿箱判定、完成态判定、状态文案、状态 CSS 归类、内容实质守卫与 `draft -> writing` 自动提升收口为单一 helper；`ArticleStatusSchema` 与 authority frontmatter status schema 已同步扩展。

真实写入链路已接入：`stores/article.ts` 在 `rawContent/title/status/tags` 更新时使用 lifecycle helper 计算状态，并继续通过 P0-10 authority helper 同步 `markdownSource/sourceHash/htmlCache/frontmatter.status`。Hub、Drafts、Workstation 与 FileManager 已补齐新增状态的显示、筛选与导航兼容。

验证结果：

- `pnpm exec vue-tsc --noEmit` 通过。
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` 通过。
- `pnpm build` 通过，仅保留既有大 chunk warning。
- 浏览器 Pinia + Dexie repository 自检通过：`LIFECYCLE_STORE_REPOSITORY_SELF_CHECK_OK`，覆盖短草稿保持 `draft`、长正文自动提升 `writing`、显式 `ready_to_publish` 写入、authority 校验和测试文章删除清理。
- 目标代码与文档扫描通过：`P1_11_CODE_AND_DOCS_CLEAN_OK`。

边界说明：本轮不宣称完成 13 张 IndexedDB 表、Scope 五层、多账号/多 workspace 分库、Windows Hello 守卫、回收站 TTL、版本 999 上限、events 审计表与全部副作用。
