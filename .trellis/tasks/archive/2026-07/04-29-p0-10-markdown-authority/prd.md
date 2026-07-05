# P0 Markdown Authority Model

## 规格参考
- `prompts/0420/specs/10-markdown-authority-spec.md`
- `prompts/0420/specs/00-wave1-current-truth.md`
- `prompts/0420/acceptance-matrix.md`

## 背景
0420 Wave 1 已经把 `EditedContent.body -> article.rawContent` 的真实快照链路打通，但 `10-markdown-authority-spec` 明确指出 `markdownSource / htmlCache / sourceHash / cacheVersion` 分层权威模型尚未落地。当前任务只做可运行、可验证、兼容现有编辑体验的 baseline，不做破坏性数据迁移，也不删除旧字段。

## 目标
1. 在 Article 模型中补齐 Markdown 权威字段: `markdownSource`, `htmlCache`, `sourceHash`, `cacheVersion`, `cacheGeneratedAt`。
2. 新增 `src/core/authority/` 模块，提供 hash、frontmatter、cache、article authority 字段生成与校验入口。
3. 所有 article 新建和 `rawContent/title/status/tags/categoryId` 更新路径都真实生成权威字段。
4. 保留 `rawContent` 和 `EditedContent.body` 作为现有 UI 兼容层，避免把 YAML frontmatter 暴露给当前编辑器正文。
5. 将敏感正文字段加密覆盖扩展到 `markdownSource` 与 `htmlCache`。
6. 补齐可自动运行的真实测试/验证脚本，不使用 mock 数据、不伪造通过。

## 非目标
- 不重写 TipTap/Markdown 全量 round-trip serializer。
- 不一次性切换全部 exporter 到 `markdownSource`。
- 不引入新的 YAML 第三方库。
- 不做破坏性 IndexedDB 清库或字段删除。

## Acceptance Criteria
- [x] 新增 authority 模块可生成 SHA-256 `sourceHash`，并能校验 `markdownSource` 一致性。
- [x] 无 frontmatter 的正文能生成默认 YAML frontmatter + body 的 `markdownSource`，同时 `rawContent` 仍保持 body-only。
- [x] 新建文章、导入文章、草稿创建、编辑保存回写都会同步权威字段。
- [x] 更新 title/status/tags/categoryId/rawContent 时 frontmatter 镜像会随真实字段更新。
- [x] `markdownSource` 与 `htmlCache` 被列入敏感字段加密范围。
- [x] `pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 通过。
- [x] authority 自检脚本通过真实函数样本，且不依赖 mock 数据。

## 2026-04-29 Implementation Plan
1. 建立 `src/core/authority/`，实现 hash、frontmatter、cache、article 字段生成与 integrity 校验。
2. 扩展 `ArticleSchema` / DTO 兼容字段，更新 `articleStore` 的 create/update/load 修复路径。
3. 扩展敏感字段列表。
4. 添加 repo 内脚本或测试样本执行真实 authority 验证。
5. 回写 `10-markdown-authority-spec` 与 task 状态。

## 2026-04-30 Completion Note

完成 P0-10 baseline slice。实现范围包括 Article 权威字段扩展、`src/core/authority/` 模块、frontmatter mirror、SHA-256 sourceHash、marked + sanitizer htmlCache、article store 新建/导入/更新/分类移动同步、loadArticles legacy repair、`markdownSource/htmlCache` 敏感字段加密覆盖，以及分类查询解密补齐。

真实验证结果：

- `pnpm exec vue-tsc --noEmit` 通过。
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` 通过。
- `pnpm build` 通过，仅保留既有 chunk size warning。
- 浏览器 runtime authority pure-function 自检通过：`AUTHORITY_BROWSER_SELF_CHECK_OK`。
- 浏览器 Pinia + Dexie repository 写入/更新/读取/删除自检通过：`AUTHORITY_STORE_REPOSITORY_SELF_CHECK_OK`，测试文章已清理。
- P0-10 目标代码与文档扫描通过：`P0_10_CODE_AND_DOCS_CLEAN_OK`。

已知边界：Node SSR loader 不是本 baseline 的验收环境，因为当前 sanitizer 依赖浏览器 DOMPurify 运行形态；完整 round-trip fuzz、全部 exporter 改用 `markdownSource`、activity_logs、版本历史 authority bundle、integrity worker 与 stale cache 标志仍属于后续 0420 spec 项，不在本 baseline 完成声明内。
