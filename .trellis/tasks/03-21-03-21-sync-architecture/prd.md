# 同步架构实现

## Goal
实现完整的 Local-first + Client-side Encryption 同步系统，支持 WebDAV/S3/REST API 三种 Transport Adapter。

## Priority
P2 — 依赖 data-model-upgrade 和 settings-enterprise 完成

## Requirements

### Transport Adapters
- WebDAV Adapter：PROPFIND/GET/PUT/DELETE
- S3 Adapter：PutObject/GetObject/ListObjects/DeleteObject
- REST API Adapter：POST push/GET pull/POST resolve
- 统一 SyncAdapter 接口

### Encryption Layer
- AES-GCM-256 加密/解密
- PBKDF2 密钥派生（100000 iterations）
- Web Crypto API 原生实现
- 恢复密钥生成

### Sync Engine 增强
- 集成 Transport Adapter 选择
- 变更队列去重合并
- 冲突检测（version vector）
- 自动解决（last-write-wins）+ 手动合并
- 同步日志记录到 sync_logs 表

### 本地保存
- 导出当前文档为 .md / .json
- 浏览器 download API
- 批量导出（ZIP 打包）

## Acceptance Criteria
- [ ] WebDAV Adapter 可连接测试
- [ ] S3 Adapter 可连接测试
- [ ] 加密/解密往返测试通过
- [ ] 本地保存可导出 .md 文件
- [ ] 同步日志正确记录
- [ ] 冲突检测正确标记
- [ ] `pnpm typecheck` 零错误

## Technical Notes
- Spec 参考：`docs/specs/05-sync-architecture.md`
- 新建目录：`services/sync/adapters/`
- 已有基础：`stores/sync.ts`、`services/sync/`（如果存在）
