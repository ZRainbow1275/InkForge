# Spec 33 — Diagnostic Logging（ActivityLogger + 错误分级 + 导出日志表）

> **Spec ID**: 33  
> **范围**: ActivityLogger（IndexedDB 保留 7 天、按类型分通道）、性能指标采样、全局错误四层分类（提示/可恢复/阻断/数据风险）、全局 errorHandler + Toast 集成、export_logs 表（T08-02）。  
> **关联**: G-13, R-02, X-03, T08-02, T-05, T-06, N-06, L1-34  
> **上游依赖**: 17-crash-recovery-spec（DiagnosticPackage 结构）、24-permission-audit-spec（审计分界）

---

## 1. 日志分层（Log Levels）

采用 5 级模型，命名与 console 对齐，但新增 `critical` 作为最高告警：

| Level | 用途 | 持久化 | Toast 级别 | 诊断包包含 |
|-------|-----|-------|-----------|----------|
| L0 `trace` | 高频开发跟踪（渲染、事件流） | 仅 DevPanel 内存环形缓冲（不落盘） | 不显示 | 否 |
| L1 `info` | 常规业务事件（保存成功、切换文档、命令触发） | IndexedDB，保留 7 天 | 不显示 | 是 |
| L2 `warn` | 可继续运行的异常（降级、重试成功、性能越界一次） | IndexedDB，保留 7 天 | success / info（业务决定） | 是 |
| L3 `error` | 用户可见错误（保存失败、同步失败、扩展出错） | IndexedDB，保留 7 天 | error（持久） | 是 |
| L4 `critical` | 危及数据安全（哈希不匹配、DB 损坏、版本链断裂） | IndexedDB + localStorage fallback，保留 30 天 | error + SafeMode 横幅 | 是 + 优先 |

### 1.1 分层原则

- **L0 永不落盘**：DevPanel 激活时才注入，只占 5MB 环形缓冲。
- **L1~L3 默认保留 7 天**（R-02 D 决策）。
- **L4 升格保留 30 天**：数据风险事件必须足够长以支撑诊断。
- **审计日志（L1-34 D）**走独立表，保留 **3 个月**（T-05 补充），与本 Spec 的 activity_logs 是两张表。详见 §12。

---

## 2. ActivityLogger 架构

### 2.1 IndexedDB `activity_logs` 表 schema

```ts
interface ActivityLogRecord {
  id: string              // uuid v4
  timestamp: number       // Date.now()
  level: 'trace' | 'info' | 'warn' | 'error' | 'critical'
  module: LogModule       // 见 §4 通道
  event: string           // 命名空间 'editor.save.success' | 'sync.push.fail'
  data: Record<string, unknown>   // 脱敏后 payload
  scope: 'profile' | 'window' | 'global'
  profileId: string
  windowId?: string
  sessionId: string       // 启动生成，便于聚合
  correlationId?: string  // 跨模块追踪
  stack?: string          // L3/L4 才写
}
```

索引：`[timestamp]`, `[level+timestamp]`, `[module+timestamp]`, `[correlationId]`, `[profileId+timestamp]`。

### 2.2 写入路径

```
app code → logger.info('module.event', data)
         ↓
    Redactor.redact(data)
         ↓
    BatchQueue.enqueue({...record})
         ↓
    flush every 1s OR 100 items
         ↓
    Dexie.activity_logs.bulkAdd()
         ↓
    EventBus.emit('log:written', record)   (DevPanel 实时订阅)
```

### 2.3 写入约束

- **永不阻塞主线程**（T-05 硬约束）。
- 批量写入：1 秒或 100 条先到。
- Dexie 写入失败 → 降级到 localStorage 缓存，重启后重放到 IndexedDB。
- L4 `critical` 绕过 BatchQueue，立即写入 + 立即同步到 localStorage fallback（以防随后崩溃丢失）。

### 2.4 Logger API

```ts
interface Logger {
  trace(event: string, data?: object): void
  info(event: string, data?: object): void
  warn(event: string, data?: object): void
  error(event: string, data?: object, err?: Error): void
  critical(event: string, data?: object, err?: Error): void

  withModule(module: LogModule): Logger
  withCorrelation(id: string): Logger
  child(context: object): Logger
}
```

用法：

```ts
const log = useLogger('editor')
log.info('save.success', { articleId, durationMs: 42 })
log.error('save.fail', { articleId }, err)
```

---

## 3. 保留策略（Retention）

### 3.1 定期清理

- **启动后 30s** + **空闲 5min 一次** 由 `requestIdleCallback` 触发清理 Worker。
- 清理规则：
  - L1/L2/L3：`timestamp < now - 7d`
  - L4：`timestamp < now - 30d`
  - 审计（§12）：`timestamp < now - 90d`
- 每轮清理上限 5000 条，分片以免阻塞。

### 3.2 容量兜底

- 单表 > 50MB 时提前触发清理，按 FIFO。
- 单表 > 100MB 时告警：Toast warn + Settings Diagnostics 面板红点。

### 3.3 手动清理

Settings > Advanced > Activity Log > 清理：
- 「按时间范围清理」
- 「按通道清理」
- 「清空全部」（需二次确认 + 自动导出诊断包备份）

---

## 4. 日志类型通道（Modules）

限定 closed set，便于过滤与诊断包聚合：

| Module | 内容 | 示例事件 |
|-------|------|---------|
| `editor` | 编辑器、撤销、保存、扩展 | `editor.input` / `editor.save.success` |
| `sync` | Provider / Git / 冲突 | `sync.push.fail` / `sync.conflict.detected` |
| `account` | 账户切换、登录、Profile | `account.switch` / `account.login.fail` |
| `export` | 导出 / 发布 / 剪贴板 | `export.pdf.start` / `export.pdf.success` |
| `perf` | 性能采样 | `perf.input.slow` / `perf.memory.snapshot` |
| `crash` | 崩溃恢复、DB 损坏 | `crash.recovery.enter` / `crash.integrity.fail` |
| `safemode` | SafeMode 进出 | `safemode.enter` / `safemode.exit` |
| `extension` | TipTap 扩展健康 / 插件 | `ext.auto-disable` / `ext.error` |
| `ai` | AI 改写、命令 | `ai.prompt.run` / `ai.timeout` |
| `ui` | UI 交互 error（非业务） | `ui.shortcut.conflict` |
| `fs` | Tauri 文件系统 | `fs.watcher.event` / `fs.write.fail` |
| `db` | IndexedDB 层 | `db.migration.start` / `db.migration.fail` |
| `dev` | DevPanel 自身 | `dev.panel.open` |

模块列表在代码中作为 `const LOG_MODULES` 冻结，新增需走 spec review。

---

## 5. 性能指标采样（Performance Sampling）

### 5.1 指标清单

| Metric | 采样 | 预算（L1-36 C / T-06） |
|-------|-----|---------------------|
| 首屏可交互 | 启动时一次 | ≤3s |
| 输入延迟 | keydown→DOM 更新，5% 采样 | ≤16ms |
| 自动保存耗时 | 每次保存 | ≤1s |
| 导出耗时 | 每次导出 | ≤3min |
| 冲突检测 | 每次 | ≤10s |
| Hub 切换 | 每次 | ≤1s |
| 内存快照 | 每 5 分钟 `performance.memory` | 无硬预算，记录即可 |
| Lighthouse | CI pipeline | >80 prod / >60 dev |

### 5.2 写入逻辑

```ts
perfLog.record({
  metric: 'editor.input.latency',
  value: 12,                  // ms
  budget: 16,
  exceeded: false,
  context: { articleId, editorStateSize }
})
```

### 5.3 预算破防响应

- 单次越界 → 仅写 `perf` 通道（level=warn）。
- 同类指标连续 5 次 / 分钟越界 → Toast warn + 触发 R-06 动画自动降级 + 写 `perf.budget.exceeded`（level=error）。
- 内存占用持续增长（斜率）→ 建议用户重启，写 `perf.memory.leak-suspect`（level=warn）。

### 5.4 与性能监控面板联动

- Settings > Advanced > Performance 面板读取最近 24h 的 `perf` 通道数据。
- DevPanel > Performance Tab 读取实时 60s 环形缓冲。

---

## 6. 四层错误分类（Error Classification）

### 6.1 分层定义（G-13 D + N-06 D）

| 层级 | 名称 | 含义 | Toast 表现 | 是否阻塞 | 示例 |
|-----|-----|-----|-----------|---------|------|
| E1 | `toast` | 提示型，用户操作结果反馈 | 轻量 toast（自动消失 3s） | 否 | 复制成功 / 链接无效 |
| E2 | `recoverable` | 可恢复错误，自动重试可能成功 | warn toast（自动 5s），含「重试」 | 否 | 网络暂时不可达 |
| E3 | `blocking` | 阻断当前操作，用户需决策 | error toast（persist），含「查看详情」 | 是 | 导出失败 / 登录失败 |
| E4 | `data-risk` | 危及数据安全 | error toast（persist）+ 横幅 + SafeMode 按钮 | 是 | hash 不匹配 / 保存失败 |

### 6.2 分级决策

`services/error-handler/classifier.ts` 对每个错误输出 `classification: ErrorLevel`。决策逻辑：

1. 若为 `CrashRelated | IntegrityError | PersistenceFailure` → E4
2. 若 `code in BlockingCodes` → E3
3. 若 `retryable === true` → E2
4. 否则 → E1

### 6.3 Toast 设计（N-06）

- 集成 Sonner（N-06）
- 颜色映射：info / success / warn / error
- E4 使用"红底 + shield-alert 图标 + 持久 + 额外按钮「进入安全模式」"
- 所有 E2+ Toast 支持「撤销」（若业务提供 undo 能力）

---

## 7. 全局 errorHandler 注册与分发

### 7.1 注册点

- `app.config.errorHandler`（Vue 全局）
- `window.addEventListener('error', ...)` 原生错误
- `window.addEventListener('unhandledrejection', ...)` Promise
- TipTap 扩展包装器（`extension-health` 捕获）
- Tauri IPC 失败回调

### 7.2 分发流程

```
err → normalize(err) → {message, stack, code, context}
     → classifier.classify() → level
     → redactor.redact(context)
     → logger.error/critical(...)     // level=error/critical
     → toastRouter.emit(level, msg)
     → if level=E4: safeModeCandidate.register(err)
     → if count[sameSignature] >=3 in 1min: extensionHealth.autoDisable(source)
```

### 7.3 去重

相同 signature（hash(code + stack 前 3 行)）在 10s 内合并，只显示一次 Toast，但日志仍每次写入（带 `repeat` 字段）。

### 7.4 泄漏防护

错误对象本身不直接写入 `data`；只摘出 `{message, stack, code, name}`，避免循环引用 / 巨大 context。

---

## 8. Toast 集成（N-06 Sonner + 撤销）

### 8.1 契约

`services/toast/index.ts` 暴露：

```ts
toast.info(msg, opts?)
toast.success(msg, opts?)
toast.warn(msg, opts?)
toast.error(msg, opts?)

opts = {
  duration?: number | 'persist'
  action?: { label, onClick }
  undo?: () => Promise<void>
  id?: string
  icon?: LucideIconName
}
```

### 8.2 4 种级别映射（G-13 D）

| Toast 方法 | level | icon | color |
|-----------|-------|------|-------|
| info | L1 info | info | muted |
| success | L1 info | check-circle | success |
| warn | L2 warn | alert-triangle | warn |
| error | L3/L4 error/critical | x-octagon / shield-alert | error |

### 8.3 持久化规则

- E1 默认 3s
- E2 默认 5s
- E3 默认 persist（有显式关闭按钮）
- E4 永不自动消失，只有用户显式关闭或进 SafeMode

### 8.4 撤销

- 任何写操作的 Toast（删除、归档、批量）必须提供 `undo`。
- 撤销成功后 Toast 置换为 `info`「操作已撤销」。
- 撤销窗口默认 5s；删除回收站走 F-01 D 的 30 天窗口而非 Toast。

---

## 9. 诊断包构建联动

### 9.1 与 Spec 17 的职责分界

- Spec 17 定义 `DiagnosticPackage` 的 zip 结构、manifest、脱敏级别。
- Spec 33 定义其中日志文件的**收集逻辑**和**格式**。

### 9.2 日志收集逻辑

DiagnosticPackage 构建时，从 `activity_logs` 读取：

- `logs/activity-7d.jsonl`：最近 7 天 level ≥ info，全量导出
- `logs/errors.jsonl`：level ≥ error，最近 50 条
- `logs/perf.jsonl`：module = perf，最近 1 天
- `logs/critical-30d.jsonl`：level=critical，最近 30 天

格式均为 **JSON Lines**（每行一个对象），便于 grep 与分片加载。

### 9.3 脱敏规则（见 §11）

所有日志进入诊断包前再次通过 `Redactor.redactAll()` 二次过滤（因原始数据已脱敏但仍可能有漏网）。

### 9.4 最近错误堆栈 5 条

`crash/last-errors.json`：最近 5 条 L3/L4，完整 stack trace。

---

## 10. `export_logs` 表（T08-02）

独立于 `activity_logs`，专门记录导出 / 发布行为，便于 Publish/Export 历史视图直接查询。

### 10.1 Schema

```ts
interface ExportLogRecord {
  id: string
  timestamp: number
  articleId: string
  articleTitleSnapshot: string
  type: 'export' | 'publish' | 'clipboard'
  platform: 'markdown' | 'pdf' | 'html' | 'docx' | 'image' | '<channel>'
  params: Record<string, unknown>   // 尺寸、语法糖、模板 id
  durationMs: number
  outputSizeBytes?: number
  sourceAppVersion: string
  sourceArticleVersion: string        // version-bundle id
  outcome: 'success' | 'fail' | 'cancelled'
  error?: { code: string; message: string }
  diagnosticPackageId?: string         // 失败时自动生成关联的诊断包 id
}
```

索引：`[timestamp]`, `[articleId+timestamp]`, `[type+platform+timestamp]`。

### 10.2 写入路径

- 由 Spec 36 / 37 / 44（导出 / 发布 / 剪贴板）在流程末尾统一调用 `exportLogger.record(...)`。
- 失败时同步写 `activity_logs`（level=error, module=export）+ `export_logs`。

### 10.3 保留策略

永不自动清理（P-02 D 需求：完整历史）。容量 > 100MB 时提示用户手动归档或清理。

### 10.4 查看面板

`Settings > Advanced > Export History`：
- 表格视图：时间 / 标题 / 平台 / 参数 / 耗时 / 大小 / 状态
- 过滤器：类型 / 平台 / 时间范围 / 状态
- 行内操作：「重新导出」「查看参数」「打开文件夹」「下载诊断包」（失败记录）

---

## 11. 审计日志区别（与 Spec 24）

### 11.1 分界

| 维度 | ActivityLogger（本 Spec） | 审计日志（Spec 24） |
|-----|-------------------------|-------------------|
| 表 | `activity_logs` | `audit_logs` |
| 保留 | 7 天（L1/L2/L3）/ 30 天（L4） | 3 个月 |
| 目的 | 诊断 / 性能 / 错误 | 合规 / 安全 / 行为追溯 |
| 覆盖 | 全部 | 安全 / 编辑 / 审阅 / AI 命令 |
| 可导出 | 诊断包 | CSV / JSON 明细 |
| 删除策略 | 允许手动清空 | 仅允许归档，不可直接删除 |

### 11.2 联动

- 某些事件同时写两表（如 account.switch / article.delete）。
- 审计写入调用 `auditLogger.record(...)`，内部同步写 activity_logs（level=info，module=account/editor）。
- 审计自身严格，不走 BatchQueue（每条立即 commit）。

---

## 12. 脱敏规则（Redaction）

### 12.1 白名单式序列化

所有进入日志 `data` 字段的对象必须先经 `Redactor.redact(obj, schema?)`。

策略：
- **白名单字段**按模块 schema 声明（如 editor 模块允许 articleId/durationMs/wordCount，不允许 content）。
- **黑名单字段**任意模块均禁止：`password`, `token`, `accessToken`, `refreshToken`, `apiKey`, `providerApiKey`, `authorization`, `cookie`, `userEmail`, `phoneNumber`, `realName`。
- 未声明 schema 的字段：走通用规则（仅允许基础类型、长度 <256 char），超出截断并标 `[redacted:len]`。

### 12.2 深度处理

- 对象深度 > 5 → 截断并标 `[truncated:depth]`。
- 数组长度 > 100 → 保留前 50 + 后 10，中间标 `[omitted:N]`。

### 12.3 密钥检测兜底

正则扫描 `/^(sk|pk|ghp|glpat|xoxb|AIza|AKIA)[A-Za-z0-9_-]{20,}$/`，命中立即替换为 `[redacted:secret]` 并写入 `redaction_hits` 统计（用于验收覆盖率指标）。

### 12.4 覆盖率验收

- AC-33-05：向所有 API 注入含密码 / token 的对象，100% 被脱敏。
- CI gate：新增字段未在白名单声明 → lint 失败。

---

## 13. 性能与容量（Constraints）

| 约束 | 预算 | 监控 |
|-----|------|-----|
| logger 同步调用开销 | <0.1ms | Benchmark |
| BatchQueue flush | <20ms | Benchmark |
| 单表 activity_logs | <50MB（默认）/ 100MB（告警） | 定期扫描 |
| 清理 Worker 单轮 | <50ms 主线程 | RequestIdleCallback |
| L4 立写路径 | <50ms | Benchmark |
| 脱敏计算 | 深度≤5 + 长度≤256，摊销 <0.2ms | Benchmark |
| 诊断包生成 | ≤10s | Spec 17 覆盖 |

---

## 14. 测试矩阵（正向 / 失败 / 恢复 / 边界）

### 14.1 单元（Vitest）

| 项目 | 正向 | 失败 | 恢复 | 边界 |
|-----|-----|-----|-----|-----|
| Logger batch flush | 1s / 100 条触发 | Dexie 写失败 | 降级 localStorage 重放 | 单次 500 条 |
| Level 路由 | 各级正确路由 | 非法 level 拒绝 | — | critical 立写 |
| 模块白名单 | 合法 module 通过 | 非法 module 报 TS error | — | — |
| 分类器 | 各级别命中 | 未知 code 默认 E3 | — | 嵌套 cause |
| 脱敏 | 黑名单脱敏 | 密钥正则命中 | — | 深度 10 对象 |
| Retention 清理 | 按天数过期 | 清理失败不抛 | 下轮补清 | 50K 条清理时间 |
| export_logs | 记录成功 | 失败记录 | — | 大 params 截断 |
| Toast 去重 | 10s 内同 signature 合并 | — | — | 超时后分开 |

### 14.2 Playwright E2E

| 场景 | 步骤 | 预期 |
|-----|-----|-----|
| 导出 PDF 记录 | 触发导出 → 完成 | export_logs 新增 1 条 outcome=success |
| 导出失败 | 注入 fail → 触发 | export_logs outcome=fail + diagnostic 关联 |
| Toast 撤销 | 删除 → 点击撤销 | 删除回滚，日志新增 undo 记录 |
| 保存失败 Toast | 拦截 Dexie → 触发保存 | error Toast persist + StatusBar 红 |
| 进入 SafeMode Toast | 触发 integrity 失败 | E4 Toast + SafeMode 横幅 |
| DevPanel 订阅 | 打开 DevPanel Events | 实时流可见新日志 |
| 诊断包 | Settings 导出 | zip 含 activity-7d.jsonl |

### 14.3 artifacts/33

```
artifacts/33/
├── positive/
│   ├── logger-batch.json
│   ├── export-log-success.json
│   └── toast-success.png
├── failure/
│   ├── dexie-write-fail.log
│   ├── export-fail.json
│   └── toast-error.png
├── recovery/
│   ├── localStorage-replay.log
│   └── retention-rescue.log
└── boundary/
    ├── 50k-cleanup-perf.json
    ├── redaction-coverage.json
    └── toast-dedup-stress.json
```

---

## 15. 验收矩阵 + 权威来源登记表

### 15.1 验收矩阵

| 编号 | 验收点 | 自动化 | 证据 |
|-----|-------|-------|-----|
| AC-33-01 | 5 级日志正确落盘 | Vitest | unit |
| AC-33-02 | BatchQueue 1s/100 条刷新 | Vitest | unit |
| AC-33-03 | L4 立写 + localStorage fallback | Vitest | unit |
| AC-33-04 | 13 个模块白名单受控 | TS 编译 + Vitest | unit |
| AC-33-05 | 脱敏覆盖率 100% | Vitest | redaction-coverage.json |
| AC-33-06 | 7 天 / 30 天 retention 正确 | Vitest + Cron | boundary |
| AC-33-07 | 4 层错误分类全路径 | Vitest | unit |
| AC-33-08 | errorHandler 全注册点 | Vitest | unit |
| AC-33-09 | Toast 4 级显示 + 去重 | E2E | positive |
| AC-33-10 | Toast 撤销 | E2E | positive |
| AC-33-11 | 性能采样 + 预算越界触发 | E2E | boundary |
| AC-33-12 | export_logs 成功/失败记录 | E2E | positive+failure |
| AC-33-13 | 诊断包日志完整 | E2E | Spec 17 联动 |
| AC-33-14 | DevPanel 事件流订阅 | E2E | positive |
| AC-33-15 | 主线程占用 <50ms | Benchmark | boundary |

### 15.2 权威来源登记表

| 编号 | 字段 / 结论 | 来源 | 位置 |
|-----|-----------|-----|-----|
| S-33-01 | IndexedDB 7 天保留 | R-02 D | 03-enhancement R-02 |
| S-33-02 | 性能指标采样（首屏/输入/保存） | R-02 D | 03-enhancement R-02 |
| S-33-03 | 诊断包导出（日志+环境+堆栈） | R-02 D | 03-enhancement R-02 |
| S-33-04 | 4 级错误分级 | G-13 D | part3b §G-13 |
| S-33-05 | 全局 errorHandler | X-03 A | part3b §T-03 |
| S-33-06 | Toast Sonner 4 级 + 撤销 | N-06 | 03-enhancement N-06 |
| S-33-07 | 审计 3 个月保留 | L1-34 D 补充 / T-05 | part3b §T-05 |
| S-33-08 | activity_logs 表 schema | T-05 | part3b §T-05 |
| S-33-09 | 白名单式序列化脱敏 | T-05 硬约束 | part3b §T-05 |
| S-33-10 | 永不阻塞主线程 + 批量 | T-05 硬约束 | part3b §T-05 |
| S-33-11 | 性能 SLO 硬指标 | L1-36 C + T-06 | part3b §T-06 |
| S-33-12 | Lighthouse CI >80 | X-05 C | part3b §T-06 |
| S-33-13 | export_logs 表 | T08-02 | 00-task-roadmap §3 33 行 |
| S-33-14 | 证据化四样本 | T-10 / G-14 | part3b §T-10 |
| S-33-15 | DiagnosticPackage 组成 | T-05 + Spec 17 | 17-crash-recovery-spec §12 |

### 15.3 上下游关联

- **上游**：17-crash-recovery（DiagnosticPackage 出口与触发点）、24-permission-audit（审计写入联动）
- **下游**：40-dev-panel（Event Stream Tab 订阅 logger 流、IndexedDB Inspector 查看 activity_logs 表）、36/37/44（导出 / 发布 / 剪贴板写 export_logs）
- **平行**：20-theme-engine / 04-toast-provider（Toast UI 实现）

---

## 16. 目录落地

```
src/services/activity-logger/
├── logger.ts
├── batch-queue.ts
├── retention.ts
├── modules.ts
├── schema.ts
└── index.ts

src/services/error-handler/
├── classifier.ts
├── handler.ts
├── normalizer.ts
├── dedup.ts
└── index.ts

src/services/redactor/
├── rules.ts
├── schemas/
│   ├── editor.ts
│   ├── sync.ts
│   └── ...
└── index.ts

src/services/toast/
└── index.ts (集成 Sonner)

src/services/perf-monitor/
├── sampler.ts
├── budget.ts
└── index.ts

src/services/export-logger/
└── index.ts

src/views/settings/
├── ActivityLogViewer.vue
├── ExportHistoryPanel.vue
└── PerformancePanel.vue

src/db/schema.ts     # activity_logs / export_logs 表
```

---

**Spec 33 完**

## 2026-05-02 Baseline Implementation Note

Baseline status: Pass for the local-first Diagnostic Logging baseline; full Spec 33 remains partially pending for UI/Toast/DevPanel integrations.

Implemented coverage:

- `src/utils/db.ts` schema v15 adds `activityLogs` and `exportLogs` stores without deleting or replacing existing object stores.
- `src/services/activity-logger/*` implements typed schemas, pre-persistence redaction, four-category error classification, memory-only trace buffering, batched IndexedDB flush, critical immediate write, localStorage fallback/replay, retention cleanup, export-log records, and JSONL export.
- `src/stores/diagnostics.ts` exposes service-backed logs, export logs, summary, loading/mutation/flush flags, replay, cleanup, and export actions.
- Activity logs stay separate from `auditLogs`; this baseline does not merge compliance audit ledgers with diagnostic activity evidence.
- Sensitive fields including passwords, tokens, cookies, authorization headers, raw content, cached HTML, markdown source, content, and body are redacted before queueing or persistence.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-33-diagnostic-logging` passed before implementation.
- `pnpm exec vitest run src/services/activity-logger/activity-logger.test.ts` passed with 9 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 14 files and 94 tests.
- `pnpm build` passed with only existing non-blocking Vite dynamic/static import and chunk-size warnings.
- Playwright browser smoke against `http://127.0.0.1:5183/settings?tab=about` verified real IndexedDB v15, trace memory-only behavior, 3 batched persisted records, critical persisted record, localStorage fallback creation and replay cleanup, token/header/cookie redaction, JSONL export, export log persistence, retention cleanup, post-smoke DB cleanup, and zero console errors.
- Ports `5183` and `5184` were verified closed after smoke.

Pending for full Spec 33 pass:

- Global errorHandler and Toast/SafeMode visual integration.
- Settings ActivityLogViewer and ExportHistoryPanel UI.
- DevPanel live event stream subscription.
- Diagnostic zip/package assembly and server telemetry upload.
- Startup/idle retention worker, storage quota meter, 50K log benchmark, and full E2E/a11y matrix.
