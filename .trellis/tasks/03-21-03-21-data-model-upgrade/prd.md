# IndexedDB v4 数据模型升级

## Goal
将 Dexie IndexedDB 从 v3 升级到 v4，新增 accounts/sync_logs/settings_profiles/activity_logs 四张表，扩展 documents 表字段，为 Hub/Workstation/Settings 三大模块的增强提供数据基础。

## Priority
P0 — 所有其他任务的前置依赖

## Requirements
- Document 接口新增 syncStatus/syncedAt/remoteVersion/accountId 字段
- 新建 Account/SyncLog/SettingsProfile/ActivityLog 四个接口
- Dexie version(4) 表声明和索引
- 四张新表的完整 CRUD 函数
- Activity Logger 中间件（自动记录增删改操作）
- getDatabaseSize() 存储统计函数

## Acceptance Criteria
- [ ] `pnpm typecheck` 零错误
- [ ] 现有 v3 数据无损迁移到 v4
- [ ] 四张新表均可正常 CRUD
- [ ] Document 表新字段有合理默认值
- [ ] 活动记录中间件可被 Store 层调用

## Technical Notes
- Spec 参考：`docs/specs/04-data-model-evolution.md`
- 主要修改文件：`inkforge/src/utils/db.ts`
- 新建文件：`inkforge/src/utils/activity-logger.ts`
- 使用 Zod 验证新表输入边界
- 保持现有 CRUD 函数签名不变（向后兼容）
