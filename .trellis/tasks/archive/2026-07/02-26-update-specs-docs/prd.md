# Update Project Specs and Documentation

## Goal
以文档驱动开发，全面更新 `.trellis/spec/` 规范文档和 `docs/` 项目文档，建立企业级开发规范。

## Requirements

### Spec 文档更新（.trellis/spec/）

#### Frontend Guidelines
- `directory-structure.md` - Vue 3 + Composition API 项目结构
- `component-guidelines.md` - Vue SFC 组件规范、Props 约定
- `hook-guidelines.md` - Composables 命名和模式
- `state-management.md` - Pinia store 模式
- `type-safety.md` - TypeScript 严格模式约定
- `quality-guidelines.md` - ESLint、代码审查标准

#### Backend Guidelines (Tauri/Rust)
- `directory-structure.md` - Tauri 后端结构
- `database-guidelines.md` - Dexie.js/IndexedDB 模式
- `error-handling.md` - 错误处理策略
- `quality-guidelines.md` - 代码质量标准
- `logging-guidelines.md` - 日志规范

### Docs 文档更新（docs/）
- 更新 `README.md` - 项目概述
- 更新 `开发规范.md` - 与 spec 保持一致
- 更新 `架构设计.md` - 反映当前架构
- 更新 `文件结构.md` - 反映当前文件结构
- 更新 `功能模块.md` - 反映当前功能状态
- 更新 `重构计划.md` - 反映技术债修复进度

## Acceptance Criteria
- [ ] 所有 spec 文档包含真实代码示例
- [ ] 所有 spec 文档包含反模式说明
- [ ] docs 文档与代码库一致
- [ ] 文档使用中文编写（代码标识符保持英文）

## Technical Notes
- 基于实际代码库分析填充，不是理想化描述
- 每个 spec 文档至少包含 2-3 个真实代码示例
- 完成 bootstrap-guidelines 任务的要求

---

## Closeout evidence - 2026-07-05

This documentation task is closed by current repository verification and targeted spec repair:

- Required frontend spec files exist under `.trellis/spec/frontend/`.
- Required backend spec files exist under `.trellis/spec/backend/`.
- Required docs files exist under `docs/`.
- A verification probe confirmed every required spec now has at least two fenced code examples and an explicit anti-pattern/forbidden-pattern section.
- The examples are based on current project files such as `inkforge/src/stores/settings.ts`, `inkforge/src/composables/useSyncScroll.ts`, `inkforge/src/services/repository.ts`, and `inkforge/src/services/activity-logger/logger.ts`.
- No product source code was changed for this documentation closeout.

Verification commands:

```bash
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
```

Result: exit code `0`.
