# Spec 24 — 权限控制与审计日志系统

| 字段 | 值 |
|---|---|
| Spec ID | 24 |
| 标题 | 权限控制与审计日志系统 |
| 状态 | 草稿 |
| 优先级 | P0 |
| 关联决策 | L1-33(C) / L1-34(A+B+C + "全范围") / L1-40(C) |
| 关联 Spec | 06-account-auth-spec / 23-sync-provider-spec / 26-multi-account-profile-spec |
| 作者 | InkForge Spec Engineer |
| 创建日期 | 2026-04-20 |

---

## 1. 背景与决策依据

### 1.1 铁律来源

- **L1-33 C**：资源级权限——文档 / 文件夹 / 评论 / 版本 / 发布动作均可授权，与多 Profile 绑定设计。
- **L1-34 全范围审计**：A+B+C 等同全范围——安全 / 编辑生命周期 / 审阅权限 / AI 命令全部留痕；保留期 3 个月；可导出；用户本身可查看。
- **L1-40 C 级防呆**：高危操作（删除/恢复/导入/导出/切账户/批量命令）均要二次确认或自动备份。

### 1.2 v2.1 角色模型

当前版本为单用户 Owner 模式，权限系统为远期多用户预留骨架：

| 角色 | v2.1 实现 | 远期预留 |
|---|---|---|
| Owner | 完整实现，所有权限 | 不变 |
| Collaborator | 接口定义，无真实用户 | v2.x 补充 |
| Viewer | 接口定义，无真实用户 | v2.x 补充 |

---

## 2. 权限模型

### 2.1 资源级权限标记

```typescript
// src/services/permissions/types.ts

export type ResourceKind = 'document' | 'folder' | 'comment' | 'version' | 'publish';

export type PermissionLevel =
  | 'private'           // 仅 Owner 可访问
  | 'shared-read'       // 拥有链接者可只读
  | 'shared-comment'    // 拥有链接者可只读 + 评论
  | 'shared-edit';      // 拥有链接者可编辑

export interface ResourcePermission {
  resourceId: string;
  resourceKind: ResourceKind;
  profileId: string;         // 所属 Profile（Owner）
  level: PermissionLevel;
  shareLinks: ShareLink[];
  updatedAt: number;
}

export interface ShareLink {
  id: string;               // nanoid(8)
  code: string;             // 短码，用于 URL
  level: Exclude<PermissionLevel, 'private'>;
  expiresAt: number | null; // null = 永久
  passwordHash: string | null; // bcrypt hash，null = 无密码
  createdAt: number;
  accessCount: number;
  lastAccessAt?: number;
}
```

### 2.2 PermissionBroker

所有需要访问受控资源的操作必须通过 `PermissionBroker`：

```typescript
// src/services/permissions/broker.ts

export class PermissionBroker {
  /**
   * 检查当前 Profile 是否对目标资源持有所需权限级别
   */
  async check(
    profileId: string,
    resourceId: string,
    resourceKind: ResourceKind,
    requiredLevel: PermissionLevel
  ): Promise<PermissionCheckResult> { ... }

  /**
   * 验证共享链接访问权限（密码/有效期）
   */
  async verifyShareLink(
    code: string,
    password?: string
  ): Promise<ShareLinkVerifyResult> { ... }

  /**
   * 为 KnowledgeSourceAdapter 提供文件系统访问权限检查
   * 首次访问新目录时弹系统权限对话框
   */
  async checkFsAccess(
    targetPath: string,
    mode: 'read' | 'write'
  ): Promise<boolean> { ... }

  /**
   * 为 URL Fetch Adapter 检查域名白名单
   * 首次命中新域名需用户确认
   */
  async checkNetworkAccess(url: string): Promise<boolean> { ... }
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
}
```

### 2.3 共享链接生成规格

**生成规则**：
- 短码：`nanoid(8)`，使用字母数字字符集（无歧义字符：去掉 `0/O/1/I/l`）
- URL 格式：`inkforge://share/{code}` 或 Web 版 `https://app.inkforge.io/share/{code}`

**过期选项**：
| 选项 | 有效期 |
|---|---|
| 1 小时 | `Date.now() + 3_600_000` |
| 24 小时 | `Date.now() + 86_400_000` |
| 7 天 | `Date.now() + 604_800_000` |
| 永久 | `null` |

**密码保护**：
- 用户输入明文密码 → `bcrypt(password, saltRounds=12)` → 存 `passwordHash`
- 访问时输入密码 → `bcrypt.compare(input, hash)` → 验证

**访问时验证流程**：
```
1. 解析短码 → 查询 share_links 表
2. 若不存在 → 返回"链接无效"
3. 若 expiresAt !== null && Date.now() > expiresAt → 返回"链接已过期"
4. 若 passwordHash !== null → 显示密码输入框
5. 密码验证通过 → 允许访问
6. 记录 accessCount++，lastAccessAt = Date.now()
7. 写入审计日志 document.shared_access
```

---

## 3. 审计日志系统

### 3.1 审计条目 Schema

```typescript
// src/services/audit/types.ts

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AuditAction =
  // 文档生命周期（L1-34 B）
  | 'document.create'
  | 'document.read'
  | 'document.update'
  | 'document.delete'
  | 'document.restore'
  | 'document.export'
  | 'document.import'
  | 'document.share'
  | 'document.shared_access'
  | 'document.publish'
  | 'document.version.create'
  | 'document.version.restore'
  // 评论与审阅（L1-34 C）
  | 'comment.create'
  | 'comment.resolve'
  | 'comment.delete'
  | 'review.approve'
  | 'review.request_changes'
  // 账户与安全（L1-34 A）
  | 'account.create'
  | 'account.delete'
  | 'account.switch'
  | 'account.export'
  | 'account.import'
  | 'account.settings_change'
  // 同步（对齐 Spec 23）
  | 'sync.push'
  | 'sync.pull'
  | 'sync.conflict.resolve'
  | 'sync.conflict.deferred'
  // 权限
  | 'permission.grant'
  | 'permission.revoke'
  | 'permission.share_link.create'
  | 'permission.share_link.revoke'
  // AI 与命令系统（L1-34 全范围）
  | 'ai.apply'
  | 'ai.reject'
  | 'command.execute'
  | 'command.batch_execute'
  // 知识摄取（决策 H-04）
  | 'knowledge.fetch'
  | 'knowledge.cite'
  | 'knowledge.refresh'
  // 系统危险操作
  | 'system.db_reset'
  | 'system.cache_clear'
  | 'system.custom_css_inject'
  | 'system.plugin_install'
  | 'system.plugin_uninstall';

export interface AuditEntry {
  id: string;                    // nanoid
  action: AuditAction;
  actorId: string;               // profileId
  profileId: string;             // 所属 Profile（可能与 actorId 不同，未来多用户）
  docId?: string;                // 涉及的文档（可选）
  resourceId?: string;           // 涉及的资源 ID（可选）
  resourceKind?: ResourceKind;
  timestamp: number;             // Unix timestamp (ms)
  ip?: string;                   // 本地场景可省，远期网络访问时记录
  severity: AuditSeverity;
  payload: Record<string, unknown>; // 操作特定数据（diff 摘要/导出参数/冲突策略等）
  sessionId?: string;            // 会话 ID（用于关联同一操作的多条日志）
}
```

### 3.2 AuditLogger 实现

```typescript
// src/services/audit/logger.ts

export class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) AuditLogger.instance = new AuditLogger();
    return AuditLogger.instance;
  }

  async log(
    action: AuditAction,
    options: {
      actorId: string;
      profileId: string;
      docId?: string;
      resourceId?: string;
      resourceKind?: ResourceKind;
      severity?: AuditSeverity;
      payload?: Record<string, unknown>;
      sessionId?: string;
    }
  ): Promise<void> {
    const entry: AuditEntry = {
      id: nanoid(),
      action,
      actorId: options.actorId,
      profileId: options.profileId,
      docId: options.docId,
      resourceId: options.resourceId,
      resourceKind: options.resourceKind,
      timestamp: Date.now(),
      severity: options.severity ?? 'info',
      payload: options.payload ?? {},
      sessionId: options.sessionId,
    };

    await this.persist(entry);

    // 触发事件，供实时 UI 更新
    auditEventBus.emit('entry', entry);
  }

  private async persist(entry: AuditEntry): Promise<void> {
    await db.audit_logs.add(entry);
  }
}

// 全局单例快捷访问
export const auditLog = AuditLogger.getInstance().log.bind(AuditLogger.getInstance());
```

### 3.3 强制审计的注入点

以下位置必须调用 `auditLog`（代码审查强制检查项）：

| 调用位置 | 对应 Action | 级别 |
|---|---|---|
| `DocumentService.deleteDocument()` | `document.delete` | warning |
| `DocumentService.restoreVersion()` | `document.version.restore` | warning |
| `DocumentService.exportDocument()` | `document.export` | info |
| `DocumentService.importDocument()` | `document.import` | info |
| `PublishService.publish()` | `document.publish` | info |
| `ShareService.createShareLink()` | `permission.share_link.create` | info |
| `SyncProvider.resolveConflict()` | `sync.conflict.resolve` | warning |
| `ProfileService.switchProfile()` | `account.switch` | info |
| `ProfileService.deleteProfile()` | `account.delete` | critical |
| `CommandBus.execute(writesContent=true)` | `command.execute` | info |
| `AIService.applyDiff()` | `ai.apply` | info |
| `SettingsService.resetToDefault()` | `account.settings_change` | warning |
| `AdvancedSettingsTab: dbReset` | `system.db_reset` | critical |
| `AdvancedSettingsTab: cssClear` | `system.custom_css_inject` | warning |
| `ExtensionService.install()` | `system.plugin_install` | warning |
| `KnowledgeAdapter.fetch()` | `knowledge.fetch` | info |

---

## 4. 审计日志 IndexedDB 存储

### 4.1 表结构

```typescript
// src/db/schema.ts

interface AuditLogEntry extends AuditEntry {
  // 所有 AuditEntry 字段 + 以下索引字段
  // Dexie 索引：profileId, action, timestamp, docId, severity
}

// 表名：audit_logs
// 主键：id
// 复合索引：[profileId+timestamp], [profileId+action], [profileId+docId]
```

### 4.2 加密选项

Settings > 高级 > 审计日志加密（可选）：
- 算法：AES-256-GCM
- 密钥派生：PBKDF2(userPassword, salt, 100_000 iterations)
- 加密范围：仅 `payload` 字段（`action` / `timestamp` / `severity` 不加密，便于索引）
- 默认关闭（本地单用户场景加密收益有限，但提供选项）

### 4.3 保留策略（L1-34 硬指标：3 个月）

```typescript
// src/services/audit/cleanup.ts

export class AuditCleanupService {
  private readonly RETENTION_DAYS = 90; // 3 个月

  /**
   * 清理超期日志，每次应用启动时触发（异步，不阻塞启动）
   */
  async cleanup(profileId: string): Promise<{ deleted: number }> {
    const cutoff = Date.now() - this.RETENTION_DAYS * 86_400_000;

    const count = await db.audit_logs
      .where('[profileId+timestamp]')
      .between([profileId, 0], [profileId, cutoff])
      .count();

    await db.audit_logs
      .where('[profileId+timestamp]')
      .between([profileId, 0], [profileId, cutoff])
      .delete();

    return { deleted: count };
  }

  /**
   * 计算当前审计日志占用空间（估算）
   */
  async estimateSize(profileId: string): Promise<number> {
    const entries = await db.audit_logs
      .where('profileId').equals(profileId)
      .count();
    return entries * 512; // 平均每条约 512 字节
  }
}
```

---

## 5. 审计日志查询 UI

### 5.1 页面位置

Settings > 审计日志（独立 Tab）

### 5.2 查询界面布局

```
Settings > 审计日志
┌─────────────────────────────────────────────────────────────────┐
│  [时间范围选择器]  [操作类型多选]  [严重级别]  [文档 ID 输入]  │
│  [搜索框：支持 action/actorId/docId 关键词]    [导出 CSV] [导出 JSON] │
├─────────────────────────────────────────────────────────────────┤
│  时间         │  操作              │  文档     │  级别   │  详情 │
├─────────────────────────────────────────────────────────────────┤
│  2026-04-20  │  document.delete   │  doc_xxx  │  警告   │  [v]  │
│  10:32:15    │                    │  我的笔记  │         │       │
│  2026-04-20  │  sync.conflict.res │  doc_yyy  │  警告   │  [v]  │
│  10:30:00    │  olve              │  文章标题  │         │       │
├─────────────────────────────────────────────────────────────────┤
│  共 N 条记录 · 第 1 页 / M 页          [上一页] [下一页]        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 展开详情（点击 [v]）

```
▼ document.delete
  操作者 Profile：ZRainbow1275-工作区1
  时间：2026-04-20 10:32:15.312
  文档 ID：doc_abc123
  文档标题：我的深度笔记
  严重级别：警告
  详细数据：
  {
    "hadVersionHistory": true,
    "versionCount": 12,
    "softDeleteUntil": "2026-04-27T10:32:15Z",
    "triggeredBy": "command.system.document.delete"
  }
```

### 5.4 过滤器规格

| 过滤项 | 类型 | 说明 |
|---|---|---|
| 时间范围 | 日期范围选择器 | 默认过去 7 天，最大 90 天 |
| 操作类型 | 多选下拉（按 domain 分组） | document.* / account.* / sync.* / ai.* / system.* |
| 严重级别 | 多选（info/warning/error/critical） | 默认全选 |
| 文档 ID | 文本输入，精确匹配 | 可粘贴 docId |
| 搜索关键词 | 全文搜索（IndexedDB 扫描） | 搜索 action + payload JSON 字符串 |

---

## 6. 审计日志导出

### 6.1 CSV 导出

列顺序：`时间戳（ISO 8601） / 操作 / 操作者 Profile / 文档标题 / 文档 ID / 严重级别 / 详情（JSON 字符串）`

文件名格式：`inkforge-audit-{profileId}-{from}-{to}.csv`

**CSV 示例**：
```csv
timestamp,action,actor_profile,doc_title,doc_id,severity,payload
2026-04-20T10:32:15.312Z,document.delete,ZRainbow1275,我的深度笔记,doc_abc123,warning,"{""hadVersionHistory"":true}"
2026-04-20T10:30:00.000Z,sync.conflict.resolve,ZRainbow1275,技术文章,doc_xyz789,warning,"{""strategy"":""accept-local""}"
```

### 6.2 JSON 导出

文件名格式：`inkforge-audit-{profileId}-{from}-{to}.json`

```json
{
  "exportedAt": "2026-04-20T11:00:00.000Z",
  "profileId": "prof_abc123",
  "range": { "from": "2026-03-21", "to": "2026-04-20" },
  "totalCount": 1423,
  "entries": [
    {
      "id": "audit_entry_1",
      "action": "document.delete",
      "actorId": "prof_abc123",
      "profileId": "prof_abc123",
      "docId": "doc_abc123",
      "timestamp": 1713609135312,
      "severity": "warning",
      "payload": { "hadVersionHistory": true, "versionCount": 12 }
    }
  ]
}
```

### 6.3 导出流程

```
1. 用户点击 [导出 CSV / JSON]
2. 确认当前过滤条件（若有过滤则仅导出过滤结果，否则导出全量）
3. 弹 Toast："正在准备导出..."
4. 查询 IndexedDB → 序列化
5. 调用 Tauri `dialog.save()` 选择保存路径
6. 写入文件 → Toast 成功提示（含文件路径）
7. 写入审计日志：action = document.export（payload 中记录导出记录数）
```

---

## 7. 高危操作防呆规格（L1-40 C 级防呆）

### 7.1 高危操作清单

| 操作 | 防呆措施 | 是否需要 systemAuth |
|---|---|---|
| 删除文档（软删除） | 二次确认弹框 + 说明软删除缓冲期 | 否 |
| 彻底删除文档（过缓冲期） | 输入文档标题确认 | 否 |
| 删除 Profile | 输入 Profile 名称确认 + 自动备份 | 是 |
| 清除缓存 | 二次确认弹框 | 否 |
| 数据库重置 | 输入"RESET"确认 + 自动备份 | 是 |
| 导出全量数据 | 二次确认弹框 | 否 |
| 恢复历史版本 | 打开 diff 视图，用户选择性应用 | 否 |
| 切换 Profile | 提示当前未保存文档 | 否 |
| 安装插件 | 显示权限清单 + 确认 | 否 |
| 注入自定义 CSS | 警告"自定义 CSS 可能影响应用稳定性" + 确认 | 否 |

### 7.2 DangerConfirmDialog 组件规格

```typescript
// src/components/common/DangerConfirmDialog.vue

interface DangerConfirmProps {
  title: string;
  description: string;                  // 操作后果详细说明
  confirmationType: 'click' | 'type';   // 点击确认 / 输入文字确认
  confirmationText?: string;            // 输入确认时的目标文字
  primaryAction: string;                // 确认按钮文案（如"永久删除"）
  cancelAction?: string;                // 取消按钮文案
  autoCloseMs?: number;                 // 超时自动取消（毫秒）
  severity: 'warning' | 'danger';       // 影响按钮颜色
}
```

**交互规则**：
- `type` 模式：输入框未正确填写时确认按钮 disabled
- `autoCloseMs` 倒计时：按钮显示"N 秒后自动取消"，倒计时结束自动关闭
- 确认后立即 disabled 避免重复点击
- Escape 键关闭视为取消

---

## 8. Repository 定义

```typescript
// src/repositories/AuditRepository.ts

export class AuditRepository {
  /**
   * 写入审计条目（禁止在此抛出异常——审计失败不得影响主流程）
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await db.audit_logs.add(entry);
    } catch (err) {
      console.error('[AuditRepository] Failed to persist audit entry:', err);
      // 降级：写入 localStorage 作为临时备份
      this.fallbackLog(entry);
    }
  }

  /**
   * 查询审计日志
   */
  async query(params: AuditQueryParams): Promise<AuditQueryResult> {
    let collection = db.audit_logs.where('profileId').equals(params.profileId);

    if (params.from) {
      collection = collection.and(e => e.timestamp >= params.from!);
    }
    if (params.to) {
      collection = collection.and(e => e.timestamp <= params.to!);
    }
    if (params.actions?.length) {
      collection = collection.and(e => params.actions!.includes(e.action));
    }
    if (params.severities?.length) {
      collection = collection.and(e => params.severities!.includes(e.severity));
    }
    if (params.docId) {
      collection = collection.and(e => e.docId === params.docId);
    }
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      collection = collection.and(e =>
        e.action.includes(kw) ||
        JSON.stringify(e.payload).toLowerCase().includes(kw)
      );
    }

    const total = await collection.count();
    const entries = await collection
      .reverse()
      .offset(params.offset ?? 0)
      .limit(params.limit ?? 50)
      .toArray();

    return { entries, total };
  }

  /**
   * 导出为 CSV 字符串
   */
  async exportCSV(params: AuditQueryParams): Promise<string> {
    const { entries } = await this.query({ ...params, limit: 100_000 });
    const header = 'timestamp,action,actor_profile,doc_title,doc_id,severity,payload\n';
    const rows = entries.map(e =>
      [
        new Date(e.timestamp).toISOString(),
        e.action,
        e.actorId,
        e.docId ?? '',
        e.severity,
        JSON.stringify(e.payload).replace(/"/g, '""'),
      ]
        .map(v => `"${v}"`)
        .join(',')
    );
    return header + rows.join('\n');
  }

  /**
   * 清理超期记录
   */
  async cleanup(profileId: string, retentionDays = 90): Promise<number> {
    const cutoff = Date.now() - retentionDays * 86_400_000;
    const keys = await db.audit_logs
      .where('[profileId+timestamp]')
      .between([profileId, 0], [profileId, cutoff])
      .primaryKeys();
    await db.audit_logs.bulkDelete(keys);
    return keys.length;
  }

  private fallbackLog(entry: AuditEntry): void {
    const key = `inkforge-audit-fallback-${Date.now()}`;
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch { /* 忽略 localStorage 满的情况 */ }
  }
}

export interface AuditQueryParams {
  profileId: string;
  from?: number;
  to?: number;
  actions?: AuditAction[];
  severities?: AuditSeverity[];
  docId?: string;
  keyword?: string;
  offset?: number;
  limit?: number;
}

export interface AuditQueryResult {
  entries: AuditEntry[];
  total: number;
}
```

---

## 9. Store 定义

```typescript
// src/stores/audit.ts

interface AuditStoreState {
  recentEntries: AuditEntry[];  // 最近 50 条（用于实时展示）
  totalCount: number;
  isLoading: boolean;
  queryParams: AuditQueryParams;
}

export const useAuditStore = defineStore('audit', {
  state: (): AuditStoreState => ({
    recentEntries: [],
    totalCount: 0,
    isLoading: false,
    queryParams: {
      profileId: '',
      limit: 50,
      offset: 0,
    },
  }),

  actions: {
    async fetchEntries() {
      this.isLoading = true;
      const repo = new AuditRepository();
      const result = await repo.query(this.queryParams);
      this.recentEntries = result.entries;
      this.totalCount = result.total;
      this.isLoading = false;
    },

    appendEntry(entry: AuditEntry) {
      this.recentEntries.unshift(entry);
      this.totalCount++;
      if (this.recentEntries.length > 50) this.recentEntries.pop();
    },
  },
});
```

---

## 10. 性能约束

| 指标 | 目标值 |
|---|---|
| 单条日志写入延迟 | ≤ 5ms（不阻塞主流程） |
| 查询 1000 条记录 | ≤ 200ms |
| 导出 10000 条（CSV） | ≤ 3s |
| 清理超期记录（全量） | ≤ 1s（后台异步，不阻塞启动） |

---

## 11. 测试矩阵（≥ 25 条）

| 编号 | 类型 | 测试场景 | 预期结果 |
|---|---|---|---|
| T-01 | 单元 | `AuditLogger.log` 写入 IndexedDB | 条目存在，字段完整 |
| T-02 | 单元 | `AuditLogger.log` 写入失败时降级到 localStorage | localStorage 存在 fallback 条目 |
| T-03 | 单元 | `AuditRepository.query` 时间范围过滤 | 只返回 from-to 区间内的条目 |
| T-04 | 单元 | `AuditRepository.query` 操作类型多选过滤 | 只返回选中类型 |
| T-05 | 单元 | `AuditRepository.query` 关键词搜索 | 匹配 action 或 payload 字符串 |
| T-06 | 单元 | `AuditRepository.cleanup` 90 天以上删除 | 超期条目不存在 |
| T-07 | 单元 | `AuditRepository.exportCSV` CSV 格式正确 | 首行为列头，每行列数一致 |
| T-08 | 单元 | `ShareLink` 短码唯一性（1000 次生成无重复） | 所有短码唯一 |
| T-09 | 单元 | `bcrypt.compare` 密码验证正确/错误场景 | 正确返回 true，错误返回 false |
| T-10 | 单元 | 共享链接过期判断：expiresAt 过期 | verifyShareLink 返回 expired |
| T-11 | 单元 | `DangerConfirmDialog` type 模式：输入不匹配时按钮 disabled | 按钮为 disabled 状态 |
| T-12 | 单元 | `DangerConfirmDialog` autoCloseMs 倒计时触发关闭 | N ms 后 onCancel 被调用 |
| T-13 | 集成 | 删除文档后写入 `document.delete` 审计条目 | 审计日志可查询到该条目 |
| T-14 | 集成 | 恢复版本后写入 `document.version.restore` | 审计日志包含 version 相关字段 |
| T-15 | 集成 | AI 应用后写入 `ai.apply` 含 diff_summary | payload 中存在 diff_summary |
| T-16 | 集成 | 同步冲突解决后写入 `sync.conflict.resolve` | 包含 strategy 字段 |
| T-17 | 集成 | 插件安装后写入 `system.plugin_install` | 包含 pluginId 和 permissions |
| T-18 | 集成 | PermissionBroker 检查共享链接密码正确 | 返回 granted = true |
| T-19 | 集成 | PermissionBroker 检查共享链接密码错误 | 返回 granted = false |
| T-20 | E2E | 审计日志 UI：时间范围过滤后显示正确条数 | 列表条数 = 查询结果 |
| T-21 | E2E | 审计日志 UI：导出 CSV 文件内容正确 | 第一行为列头，数据行可解析 |
| T-22 | E2E | 审计日志 UI：导出 JSON 文件结构完整 | entries 数组存在，totalCount 正确 |
| T-23 | E2E | 高危操作（删除文档）二次确认弹框流程 | 输入文档标题后确认按钮可点击 |
| T-24 | E2E | 高危操作取消：Escape 关闭不执行删除 | 文档仍然存在 |
| T-25 | E2E | 应用启动时自动清理超期审计日志 | 90 天前的条目不存在 |
| T-26 | 性能 | 10000 条写入耗时 | ≤ 5s 总计 |
| T-27 | 性能 | 查询 1000 条含过滤 | ≤ 200ms |

---

## 12. 落地文件索引

| 文件路径 | 说明 |
|---|---|
| `src/services/permissions/types.ts` | 权限类型定义 |
| `src/services/permissions/broker.ts` | PermissionBroker 实现 |
| `src/services/permissions/shareLink.ts` | 共享链接生成与验证 |
| `src/services/audit/types.ts` | 审计日志类型定义 |
| `src/services/audit/logger.ts` | AuditLogger 单例 |
| `src/services/audit/cleanup.ts` | 超期清理服务 |
| `src/repositories/AuditRepository.ts` | 数据访问层 |
| `src/stores/audit.ts` | Pinia Store |
| `src/components/common/DangerConfirmDialog.vue` | 高危确认弹框 |
| `src/views/settings/AuditLogTab.vue` | Settings > 审计日志 Tab |
| `src/components/audit/AuditLogList.vue` | 审计日志列表 |
| `src/components/audit/AuditFilters.vue` | 过滤器面板 |

---

## 13. 2026-05-01 Compatible Baseline Implementation Note

本轮已完成 `Spec 24 — 权限控制与审计日志系统` 的 compatible baseline。该 baseline 以现有单用户 Owner / Local-First 架构为边界，不删除既有功能，不引入 mock provider、模拟审计记录或 Emoji glyph，并把权限与审计能力接入当前真实 Dexie / Pinia / Settings / Article / Sync / Account / Command Palette 链路。

### 13.1 已落地范围

- `src/services/audit/*` 已新增审计类型、Zod 输入校验、敏感字段脱敏、稳定序列化、prevHash/entryHash 链式哈希、CSV/JSON 导出、90 天保留期清理、IndexedDB 写入失败时的 localStorage fallback evidence，以及实时 `auditEventBus`。
- `src/services/permissions/*` 已新增资源权限类型、`resourcePermissions` repository、crypto-backed share code、share URL 构造、`PermissionBroker` grant/revoke/check/share-link/network/fs 权限边界。
- `src/utils/db.ts` 已升级到 Dexie schema v8，新增 `auditLogs` 和 `resourcePermissions` 表；旧内容、账户、FTUE、crash recovery、sync 表均保留，不删除旧数据。
- `src/stores/audit.ts` 已新增审计 Pinia store，支持 profile 范围、关键词、action/severity/outcome 过滤、分页、CSV/JSON 导出、完整性校验和 event bus 追加。
- `SettingsView.vue` 已新增第 9 个 Tab：审计日志。该 Tab 展示真实 IndexedDB 记录总数、当前页、完整性状态、过滤器、导出按钮、记录详情与空状态说明。
- Article store 已在创建、URL 导入、文件导入、更新、删除、分类移动等真实文档生命周期事件后写入审计日志。
- SyncEngine 已在 push/pull、无 provider/offline failure、partial failure、冲突解决后写入审计日志，不把未配置 provider 伪装成成功。
- Account store 已在账户创建、切换、设置变更、导出、删除/重置后写入审计日志。
- Command Palette store 已把命令执行审计从 logger-only 扩展为真实 `command.execute` / `command.batch_execute` 审计记录。

### 13.2 无 mock / 无虚假成功决策

- 共享链接短码必须使用 `crypto.getRandomValues`；运行时缺失 WebCrypto 时直接抛错，不回退到 `Math.random`。
- 当前项目没有 bcrypt 依赖，密码保护 share link 在验证时明确拒绝访问并写入 `permission.shared_access` denied 审计，原因是 `password-verification-unavailable`；不得假装完成密码验证。
- Web runtime 的文件系统权限检查不伪造 native dialog 成功，当前显式写入 denied 审计并返回 `false`。
- Network access 只默认允许 same-origin / localhost；其他 origin 必须通过 `grantNetworkOrigin()` 加入本地 allowlist，且 grant/check 都写审计。
- 本地 ledger 只能称为 tamper-evident chain；没有远端 WORM / SIEM / 只追加数据库前，不得宣称 tamper-proof。

### 13.3 本轮发现并修复的问题

- `sanitizeAuditPayload()` 原先先判断 `Blob` 再判断 `File`，会导致文件对象丢失文件名；现已改为先处理 `File`，再处理 `Blob`。
- `useAuditStore.defaultQueryParams()` 原先固定 `to = Date.now()`，Settings 页初始化后新写入的审计记录会因时间上界陈旧而被刷新查询排除；现改为 90 天起点 + 开放上界，保证刷新能看到新记录。
- `PermissionBroker.check(requiredLevel='private')` 已从 ReBAC `view` 语义收紧为 owner-only 语义；private 检查现在只接受资源 Owner Profile 或 owner relation，不再让 viewer/commenter/editor 关系旁路通过。
- `PermissionBroker.createShareLink()` 不再在缺失权限记录时自动 `upsertPermission()`，避免“创建共享链接即自封 Owner”的权限提升；缺失记录或非 owner 调用都会写入 denied 审计并失败。
- `PermissionBroker.verifyShareLink()` 现对无效、非 active、过期和密码验证不可用的共享链接均写入 `permission.shared_access` denied 审计；无效 code 只记录短前缀，不记录完整 secret code。
- `AuditRepository.log()` 在 IndexedDB append 失败时只写 localStorage fallback evidence 并返回 `null`，避免 event bus / UI 把未持久化审计误报为成功记录。
- `AuditRepository.verifyIntegrity()` 支持清理旧日志后的 retained-chain anchor：保留窗口内仍验证每条记录自身 hash 与相邻 retained 记录连续性，但不把已按保留策略清理的旧记录误判为篡改。
- Article / Command Palette 审计已改为当前 account profile 归属；文档删除在内存未命中时会先回查 repository 取证；Settings 运行时缓存清理审计改为真实清理后写 success，失败时写 failure。

### 13.4 验证证据

- `pnpm exec vue-tsc --noEmit` 通过。
- `pnpm exec vitest run src/services/audit/audit.test.ts src/services/permissions/permissions.test.ts` 通过：2 个测试文件，16 条测试。
- `pnpm exec vitest run` 通过：5 个测试文件，33 条测试。
- `src/services/audit/audit.test.ts` 覆盖敏感 payload 脱敏、File/Blob 元信息、长字符串截断、深度限制、稳定序列化、prevHash 链式哈希、篡改检测、IndexedDB append 失败 fallback evidence 且返回 `null`、以及清理旧记录后的 retained-chain anchor 校验。
- `src/services/permissions/permissions.test.ts` 覆盖资源类型/权限级别 Zod 校验、crypto-backed share code、share link 元数据、share URL 规范化、private owner-only、owner relation 通过、share link 缺记录不自动 upsert、非 owner 创建共享链接 denied、无效/过期共享链接 denied 审计且不记录完整 code。
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` 通过。
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` 通过；仅保留既有 `category/article` 动态/静态导入 chunk 提示和大 chunk 提示。
- Touched-file emoji scan 通过，未发现 Emoji glyph。
- `git diff --check -- <Spec 24 touched files>` 通过；Windows `LF will be replaced by CRLF` 提示为现有 Git 换行设置提示，非 whitespace error。
- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-01-05-01-p1-24-permission-audit` 通过。
- Production preview smoke：`http://127.0.0.1:5182/settings?tab=audit` 可进入审计 Tab；真实 IndexedDB `InkForgeDB` version `80` 包含 `auditLogs` / `resourcePermissions`；通过 UI 高危确认写入 1 条 `account.settings_change` 审计记录，记录包含 `entryHash` 和 `prevHash`；刷新后 UI 显示记录总数 1；完整性校验显示 `valid` 且提示已验证 1 条审计链路；浏览器 console error 为 0；preview 进程停止后端口 5182 已关闭。
- Hardening 后复跑 production preview smoke：`http://127.0.0.1:5182/settings?tab=audit` 的 `data-settings-tab="audit"` 为 `display: block`，真实空账本状态显示记录数 0，页面包含 `auditLogs` / `resourcePermissions` 实时统计，浏览器 console error 为 0；preview 进程已停止，端口 5182 无 LISTENING。

### 13.5 仍未视为完整 Spec Pass 的范围

- 还未接入真实 bcrypt 或等效密码验证依赖，因此密码保护 share link 只能 fail-closed。
- 还未实现独立 `DangerConfirmDialog.vue` 组件与所有高危操作的统一组件化接入；当前沿用 `SettingsView` 既有确认弹框模式。
- 还未把 Comment / Review / Publish / AI apply / Knowledge adapter / Plugin install 的全部注入点跑完完整集成测试。
- 还未提供远端 WORM / SIEM / 逻辑隔离审计系统，因此完整日志不可篡改与集中监控仍保留为后续安全增强。
- 还未完成 25+ 全量测试矩阵、10000 条写入性能、1000 条过滤查询性能和完整 E2E 矩阵。

