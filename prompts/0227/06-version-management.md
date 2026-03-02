# 06 - 版本管理完善 Spec

## 目标
确保版本管理功能完全真实可用，支持创建、切换、对比版本。

## 1. 当前状态分析

### 1.1 已有基础
- `stores/editor.ts` 有 `createVersion()`、`switchVersion()` 方法
- `schemas/article.ts` 有 `VersionSchema` 定义
- 版本存储在 `EditedContent.versions` 数组中
- 有最大版本数限制（VERSION_MANAGEMENT.MAX_VERSIONS_PER_DOCUMENT）

### 1.2 待修复问题
- 版本创建后 UI 反馈不明确
- 版本对比功能缺失
- 自动保存版本功能缺失
- 版本恢复确认机制缺失

## 2. 功能增强

### 2.1 自动版本快照
- 每 5 分钟自动创建版本快照（可在设置中调整间隔）
- 自动版本标签格式：`auto-YYYY-MM-DD-HHmm`
- 手动版本标签格式：`v{n}` 或用户自定义

### 2.2 版本对比
```typescript
// 使用 diff 算法比较两个版本
function compareVersions(v1: Version, v2: Version): DiffResult {
  // 使用简单的文本差异对比
  // 标记新增（绿色）、删除（红色）、修改（黄色）
}
```

### 2.3 版本恢复
- 切换版本前显示确认对话框
- 显示当前版本和目标版本的差异概要
- 支持"恢复但保留当前为新版本"

### 2.4 版本列表 UI 改造
```
┌─ 版本历史 ─────────────────────┐
│  ● v3 (当前)    2 分钟前       │
│  ○ v2           1 小时前       │
│  ○ auto-0227    3 小时前       │
│  ○ v1           昨天           │
│  [+ 保存为新版本]              │
└────────────────────────────────┘
```

## 3. 数据层增强

### 3.1 版本元数据扩展
```typescript
interface Version {
  id: string
  label: string
  title: string
  body: string
  transcript: string
  createdAt: Date
  type: 'manual' | 'auto'  // 新增：手动 vs 自动
  description?: string       // 新增：版本说明
  wordCount: number          // 新增：字数快照
}
```

## 验收标准
- [ ] 可手动创建版本
- [ ] 可切换到历史版本
- [ ] 自动版本快照每 5 分钟保存
- [ ] 版本列表显示时间和类型
- [ ] 切换版本有确认对话框
- [ ] 版本数据持久化到 IndexedDB
- [ ] 无任何 Mock 版本数据
