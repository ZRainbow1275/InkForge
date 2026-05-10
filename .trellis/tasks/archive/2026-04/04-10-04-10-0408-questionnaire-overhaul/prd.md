# 0408 requirements questionnaire overhaul

## Goal

将 `prompts/0408/requirements-questionnaire.md` 从“直接进入 Task 实现细节”的单层问卷，重构为“前置总纲 + Task 级实现细问”的双层问卷，确保后续 PRD / Spec 编写建立在明确的产品边界、内容权威模型、同步恢复策略、权限审计和导出一致性之上。

## Requirements

- 保留 `prompts/0327/*` 作为主要约束来源，不偏离既有设计语言与技术框架
- 保留现有 0408 问卷的高价值 Task 级问题
- 在问卷前部新增详细的 Layer 1 前置总纲问卷
- 明确当前代码现实与 0327 文档之间的漂移，避免需求建立在错误前提上
- 为每个 Task 增加当前现状、依赖前提和目标说明
- 问卷必须可填写、足够细、可直接作为后续 PRD / Spec 的输入

## Acceptance Criteria

- [ ] 文档明确分为第一层总纲问卷与第二层 Task 级问卷
- [ ] 问卷包含 Markdown 权威模型、评论审阅、历史恢复、同步冲突、多账户隔离、知识增强、命令系统、导出一致性、权限审计、性能规模等上位问题
- [ ] 保留并上下文化原有 Task 01 ~ Task 09、跨任务依赖与补充需求
- [ ] 文档中写清已核验事实与填写说明
- [ ] 该文档可直接交给用户填写，并可据此继续编制 PRD / Spec

## Technical Notes

- 当前活跃前端落点是 `inkforge/`
- 当前代码更接近 `TipTap HTML` 持久化，而非 Markdown 唯一权威源
- `SettingsView.vue` 当前实际为 7 个 Tab
- 评论审阅、多账户完整主路径在当前代码中尚未成熟落地
