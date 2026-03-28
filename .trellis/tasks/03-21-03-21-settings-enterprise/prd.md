# Settings 企业级设置中心

## Goal
将 7-Tab 设置页面升级为 10-Tab 企业级设置中心，新增 Account/Sync/Advanced 三个 Tab，使所有现有设置真正生效。

## Priority
P2 — 依赖 data-model-upgrade 和 workstation-enhance 完成

## Requirements

### 使现有设置生效
- Appearance：theme 切换实际应用 CSS class
- Editor：autoSave 定时器真正工作
- AI：provider 切换重新初始化客户端，连接测试按钮
- Data：存储使用量显示（navigator.storage.estimate）

### Account Tab（新增）
- 本地账户 Profile（名称/邮箱/头像/简介）
- 头像上传（Blob 存储到 IndexedDB accounts 表）
- 数据导出（GDPR 风格 JSON 导出）
- OAuth 占位（标注"即将推出"）

### Sync Tab（新增）
- 同步目标配置（WebDAV/S3/REST API）
- 同步策略（自动/手动/间隔/冲突策略）
- 同步状态 Dashboard
- 加密设置（AES-GCM-256）

### Advanced Tab（新增）
- 开发者选项（日志级别/性能指标）
- 实验性功能开关（Feature Flags）
- 数据迁移（导入 Notion/Obsidian .md 文件）
- 设置 Profile 系统

### Settings 搜索
- 顶部搜索栏，实时过滤设置项
- 匹配项高亮 + 自动切换 Tab

## Acceptance Criteria
- [ ] 10 个 Tab 均可进入且内容完整
- [ ] theme/accentColor/fontSize 等外观设置实时生效
- [ ] autoSave 定时器按设定间隔执行
- [ ] AI 连接测试按钮可发送测试请求
- [ ] 账户 Profile 可创建/编辑/保存
- [ ] 搜索功能可过滤并定位设置项
- [ ] Zod Schema 覆盖所有新增设置字段
- [ ] `pnpm typecheck` 零错误

## Technical Notes
- Spec 参考：`docs/specs/03-settings-enterprise-spec.md`
- 主要修改：SettingsView.vue + stores/settings.ts
- 新增 Zod Schema：AccountSchema, SyncSchema, AdvancedSchema
