# Spec 17 — Crash Recovery（崩溃恢复与数据完整性）

> **Spec ID**: 17  
> **范围**: beforeunload 紧急保存、异常退出检测、Recovery Mode 向导、数据完整性 Worker、哈希链、SafeMode 启动、DiagnosticPackage、灾难恢复快照（X-11）、自动保存失败兜底。  
> **关联**: R-01, R-02, R-05, X-11, L1-19, T-01, T-02, T-03, T-07, T-08  
> **下游联动**: 19-autosave-spec, 31-version-bundle-spec, 33-diagnostic-logging-spec, 27-settings-spec

---

## 1. 设计原则（Design Principles）

本 Spec 服务于 InkForge **X-11 用户底线：文章不能丢**。R-01 ~ R-05 整组均为 D 级决策（整份问卷最保守组），落地原则严格遵守：

1. **数据安全 > 一切**  
   - 任何"可能丢数据"的路径必须先生成版本点，不允许直接覆盖。  
   - 任何路径下 `articles.content` 最新内容都必须可恢复。  
2. **纵深防御**  
   - 同时部署 **内存层紧急保存**（localStorage）、**持久层自动保存**（IndexedDB）、**版本历史层**（article_versions）、**备份层**（JSON export）、**灾难层**（SafeMode + Recovery Wizard）。  
3. **零空壳垂直切片（G-14）**  
   - 每个能力必须从 UI 到持久化全链路可运行，禁止只有 UI 没有逻辑。  
4. **证据化验收（X-12 / T-10）**  
   - 每项功能必须有正向 / 失败 / 恢复 / 边界四种样本存于 `artifacts/17/`。  
5. **后台静默**  
   - R-05 补充约束：Worker 校验、定期检测不得挤占主线程或给用户制造卡顿感，CPU > 60% 自动推迟。  
6. **尊重用户控制权**  
   - Recovery Mode / SafeMode 入口清晰、退出顺畅，任何恢复操作前提供预览。

---

## 2. 三层恢复模型（Recovery Model）

三个系统相互正交、独立触发、共用 DiagnosticPackage 出口：

| 层级 | 触发场景 | 主模块 | 数据来源 | 用户感知 |
|------|---------|-------|---------|---------|
| L1 Crash Recovery | 进程崩溃 / 强杀 / 断电 | `services/crash-recovery` | localStorage 紧急保存 + IndexedDB recovery_points | 启动时出现 Recovery Mode 向导 |
| L2 Data Integrity → SafeMode | IndexedDB 哈希校验失败 / 版本链断裂 / 扩展连续出错 | `services/data-integrity` + `services/safe-mode` | article_versions 最近完整版本 | 顶部横幅 + 自动降级 |
| L3 Disaster Recovery Wizard | Dexie 打开失败 / 核心表损坏 | `services/disaster-recovery` | 最近自动备份 / Git 仓库 / 本地 .md | 全屏 Wizard 引导 |

**正交性保证**：

- L1 是"编辑器崩溃"，核心数据库通常健全；
- L2 是"数据损坏但数据库可读"；
- L3 是"数据库自身不可用"；
- 三者共享 ActivityLog + DiagnosticPackage 能力，但逻辑分离、各自可单测。

---

## 3. beforeunload 紧急保存策略

### 3.1 触发窗口

监听 `window.addEventListener('beforeunload', handler, { capture: true })`。Tauri WebView 下同样触发（Tauri 2.x 将窗口关闭映射到 beforeunload）。

### 3.2 写入预算

- **必须在 50ms 内完成**：浏览器对 beforeunload 有隐式预算，超时后会放弃。  
- 使用同步 `localStorage.setItem`（IndexedDB 不适合，异步不保证落盘）。  
- 禁止在 handler 内做序列化计算外的任何操作。

### 3.3 payload 结构

```ts
interface EmergencyPayload {
  schemaVersion: 1
  savedAt: number          // Date.now()
  windowId: string         // 多窗口场景区分
  profileId: string        // 账户 Profile 隔离
  tabs: Array<{
    articleId: string
    title: string
    dirty: boolean
    cursor: { from: number; to: number } | null
    scrollTop: number
  }>
  activeArticle: {
    articleId: string
    content: string        // 前 200KB；超出时只写最近 100KB（由末尾截断）
    contentHash: string    // sha256 前 16 字符
    truncated: boolean
    length: number
  } | null
}
```

### 3.4 localStorage Key 命名规范

- 主 key: `inkforge.emergency.<profileId>.<windowId>`  
- 正常退出标志: `inkforge.lastClosedCleanly.<profileId>.<windowId>` = `"<timestamp>"`  
- 连续崩溃计数: `inkforge.crashCount.<profileId>`（启动前写 +1，成功启动 3s 后清 0）  
- 版本迁移标志: `inkforge.emergency.schemaVersion`  

所有 key 以 `inkforge.` 前缀命名空间隔离，便于 Settings > Advanced > 清理数据按钮统一清理。

### 3.5 降级策略

1. `localStorage` 写失败（配额满 / 隐私模式）→ 改写入 IndexedDB `recovery_points` 表（本次可接受异步，因为通常是 before-close 而非真实崩溃）。  
2. 两者都失败 → 写 ActivityLog error 级 + 下次启动如检测到异常退出直接跳到 L3 Wizard。

---

## 4. 启动检测（Startup Detection）

### 4.1 `inkforge.lastClosedCleanly` 标记

- **写入时机**：正常关闭流程末尾（`App.vue` beforeQuit hook 的最后一步），值为当前时间戳。  
- **读取时机**：启动时 `main.ts` 最早阶段。  
- **判定逻辑**：

```
cleanly = localStorage.getItem('inkforge.lastClosedCleanly.<p>.<w>')
emergency = localStorage.getItem('inkforge.emergency.<p>.<w>')

case (cleanly == null && emergency != null):
  → enter Recovery Mode
case (cleanly != null && emergency != null):
  → emergency 是上次会话"主动崩溃保存"；时间差 >5 分钟视为孤儿，移入 journal 并照常启动
case (cleanly != null && emergency == null):
  → 正常启动
case (cleanly == null && emergency == null):
  → 首次启动或 localStorage 被清；正常启动（标记首启动引导）
```

### 4.2 连续崩溃熔断

若 `inkforge.crashCount` ≥ 3 → 强制进入 SafeMode（见 §11）并提示用户。

### 4.3 多窗口

- 每个窗口独立 `windowId`，启动时扫描所有 `inkforge.emergency.<p>.*`。  
- 任一窗口 emergency 有效且对应 lastClosedCleanly 缺失 → 合并入 Recovery Mode 候选列表。

---

## 5. Recovery Mode UI 状态机

### 5.1 状态

```
Detecting → NoCandidates → (exit, normal launch)
Detecting → HasCandidates → Reviewing → Diffing → Applying → Done
                                     ↘ Skipping → Done
                                     ↘ Aborting → Done
```

### 5.2 状态详解

| 状态 | UI 表现 | 允许操作 | 失败处理 |
|-----|---------|---------|---------|
| Detecting | 全屏骨架屏 | — | 超过 2s 降级为文字列表 |
| HasCandidates | 候选文档列表（最多 10 条） | 点击进入 Reviewing | 无 |
| Reviewing | 候选信息卡：标题、保存时间、预估丢失字数、最近编辑位置 | 四选一（保留 IDB / 保留 localStorage / 三方合并 / 丢弃） | 用户刷新页面保留状态 |
| Diffing | 双栏 diff 视图（IDB vs localStorage） | 滚动查看、切换字符级/行级 diff | 数据不可 diff 时文字提示 |
| Applying | 进度条 + 操作日志 | 无（不可取消） | 失败进入 SafeMode + 写 ActivityLog critical |
| Done | 列表各项标记状态 | 「进入应用」「查看诊断」「导出诊断包」 | — |

### 5.3 路由

- 独立路由 `/recovery-mode`，不可通过正常导航进入。  
- 进入 RecoveryMode 时所有其他路由被拒绝（Router guard）。  
- 退出时清理 `emergency` key 并写入 `lastClosedCleanly`。

### 5.4 Key 操作约束

- 「保留 localStorage」不是直接覆盖，而是：先 dump 当前 IndexedDB 对应文档为版本点 → 然后写入 localStorage 内容 → 再写版本点 → 再保存为 articles.content。  
- 「三方合并」调用 `diff-match-patch` 做 3-way merge，合并结果同样经过版本点路径。  
- 「丢弃」将 emergency payload 移入 `recovery_journal` 表，保留 30 天供审计。

---

## 6. 预估丢失范围（Lost Scope Estimation）

Recovery Mode 卡片必须显示：

| 指标 | 计算方式 | 显示格式 |
|-----|---------|---------|
| 丢失字数预估 | `|localStorage.length - IndexedDB.articles.content.length|` | `约 128 字` |
| 时间跨度 | `localStorage.savedAt - IndexedDB.articles.updatedAt` | `12 分钟` |
| 最近编辑文档 | 按 `tabs[].dirty=true` 排序取前 3 个 | 列表 |
| 截断警告 | `truncated=true` 时标红 | `仅保留最近 100KB` |

---

## 7. 与 VersionHistory 联动

### 7.1 恢复点 = 版本节点

每次 Recovery 操作（保留 IDB / localStorage / 三方合并）都必须在 `article_versions` 表中写入一个 **Recovery 类型版本**：

```ts
interface RecoveryVersion extends DocumentVersionBundle {
  source: 'crash-recovery' | 'safe-mode' | 'disaster-wizard'
  meta: {
    originalHash: string
    restoredFrom: 'idb' | 'localStorage' | 'merge' | 'backup'
    recoveryTimestamp: number
    diagnosticPackageRef?: string
  }
}
```

### 7.2 版本视图呈现

- VersionHistory 面板中 Recovery 版本用 `shield` 图标标识。  
- 版本列表按时间倒序；点击可预览、恢复。  
- Recovery 版本的内容永不被 GC（即便超出 L1-40 的保留策略）。

### 7.3 联动接口

`services/version-bundle` 暴露：

```ts
recordRecoveryCheckpoint(articleId: string, payload: RecoveryPayload): Promise<VersionId>
loadForRecovery(articleId: string, before: number): Promise<DocumentVersionBundle | null>
```

禁止从 crash-recovery 直接写 `article_versions` 表，必须走 version-bundle 服务层。

---

## 8. 数据完整性校验（Data Integrity）

### 8.1 两种检查节奏

| 节奏 | 时机 | 范围 | 预算 |
|-----|-----|-----|-----|
| 启动基础 | 每次应用启动，延后 2s 避免抢首屏 | 10% 抽样 articles + 5% 抽样 article_versions + assets FK | <200ms 主线程 |
| 后台定期 | 每 15 分钟；<1000 文档全量，>1000 分片（每次 200 条） | 全量哈希 + 引用计数 + 版本链 | 主线程占用 <50ms/100ms，使用 `requestIdleCallback` |

### 8.2 校验维度

1. **哈希匹配**：`articles.contentHash` vs `sha256(articles.content)`。  
2. **引用计数**：`assets.refCount` vs SQL `COUNT(*) OVER articles JOIN asset_refs`。  
3. **版本链完整性**：`article_versions.prevHash` 形成的链从首版本到最新无断裂。  
4. **索引一致性**：Dexie secondary index 与实际字段值一致（抽样）。

### 8.3 异常处理决策表

| 发现问题 | 是否进 SafeMode | 自动修复动作 | Toast |
|---------|---------------|------------|------|
| hash 不匹配 + 可从 article_versions 恢复 | 是 | 自动以最近完整版本恢复 + 写 ActivityLog critical | warning：已进入安全模式 |
| hash 字段丢失但内容完好 | 否 | 重建 hash + 写 ActivityLog warn | 无 |
| 引用计数不一致 | 否 | 重建计数 + 写 ActivityLog info | 无 |
| 版本链断裂 | 是 | 不自动修复，标记损坏版本 + 锁定写入 + 生成 DiagnosticPackage 提示 | error：检测到版本历史异常 |
| 索引不一致 | 否 | 重建受影响索引 | info |

---

## 9. 哈希链结构（Hash Chain）

### 9.1 目的

让 `article_versions` 形成防篡改链，便于 §8 的版本链完整性校验。

### 9.2 Schema

```ts
interface ArticleVersionRecord {
  id: string             // uuid
  articleId: string
  seq: number            // 自增
  createdAt: number
  content: string        // 全量或 diff（由 L1-17 决定）
  contentHash: string    // sha256(content)
  prevHash: string | null  // 上一条 contentHash；首版本为 null
  source: 'autosave' | 'manual' | 'recovery' | 'safe-mode' | 'disaster' | 'diff-resolution'
  meta: Record<string, unknown>
}
```

### 9.3 链生成规则

- 首版本 `prevHash = null`。  
- 第 N 版本 `prevHash = versions[N-1].contentHash`。  
- Recovery 类型版本继续延续链（`prevHash` 指向当前 latest）。

### 9.4 校验算法（伪代码）

```
for article in articles:
  versions = article_versions.where(articleId).orderBy(seq).toArray()
  let expected = null
  for v in versions:
    if v.prevHash !== expected: mark_broken(v)
    expected = v.contentHash
```

### 9.5 损坏处理

链断裂 → §8 异常处理流程；SafeMode 触发后仍允许读取断裂前版本，但写入锁定至用户显式确认。

---

## 10. 校验失败进入 SafeMode

参考 T-03 落地规则：

触发条件：
1. §8 检测到 hash 不匹配或版本链断裂；
2. 启动崩溃计数 ≥ 3（§4.2）；
3. 用户按住 `Shift` 启动（Tauri 通过 argv 检测 `--safe`）。

SafeMode 下禁用（与 Spec 27 `safe-mode` 共享清单）：
- 自定义 CSS / JS（Q-10）
- 非核心 TipTap 扩展（保留 Text / Paragraph / Heading / List / Link）
- 动画降级至 `none` 级（R-06）
- 文件系统 watcher（Q-03）
- 第三方插件（L1-37/38）
- 同步 Provider（L1-22）
- AI Adapter

SafeMode 顶部横幅（`<SafeModeBanner />`）：
- 左：shield-alert 图标 + "已进入安全模式"
- 中：摘要（来源、触发时间）
- 右：「查看问题」「导出诊断包」「退出安全模式」

SafeMode 仍允许编辑但每次保存强制创建版本点（X-11 底线）。

---

## 11. SafeMode 启动流程

```
bootstrap()
  ↓
readArgv() → hasSafeFlag?
  ↓                     ↘
启动完整性 scan         直接进入 SafeMode
  ↓
完整性 OK？
  ↓ 是                   ↓ 否
crashCount 清 0          进 SafeMode
启动常规 App              应用最小 App Shell
  ↓                      ↓
wait 3s 后               DiagnosticPackage 预生成
clearCrashCount         启动 Recovery Wizard 入口按钮
```

关键代码位：
- `src/main.ts`：启动入口，最早 detect
- `src/services/safe-mode/bootstrap.ts`：编排器
- `src/services/safe-mode/registry.ts`：禁用清单
- `src/views/SafeModeShell.vue`：独立 shell

---

## 12. 诊断包结构（DiagnosticPackage）

### 12.1 格式

`.zip` 文件，内含：

```
diagnostic-<profileId>-<timestamp>.zip
├── manifest.json            # 版本 / 时间戳 / 脱敏状态
├── environment.json         # OS / Tauri / WebView / Node 版本 / UA
├── logs/
│   ├── activity-7d.jsonl    # 最近 7 天 ActivityLog
│   ├── errors.jsonl         # 最近 50 条 error / critical
│   └── perf.jsonl           # 最近 1 天性能采样
├── crash/
│   ├── last-stack.txt       # 最近一次 errorHandler 捕获
│   ├── crash-history.json   # crashCount / lastClosedCleanly / emergency
│   └── recovery-log.json    # Recovery Mode 选择链路
├── db/
│   ├── schema.json          # 表结构
│   ├── meta.json            # schemaVersion / counts / sizes
│   └── integrity-report.json # §8 最近一次结果
├── settings/
│   ├── settings-redacted.json  # 脱敏后的用户设置
│   └── extension-health.json
└── user-action-recent.json   # 最近 N 个用户操作
```

### 12.2 Manifest

```jsonc
{
  "schemaVersion": 1,
  "generatedAt": 1713571200000,
  "profileId": "<uuid>",
  "appVersion": "2.1.0",
  "tauriVersion": "2.x",
  "os": "windows-11",
  "mode": "normal | recovery | safe",
  "redaction": {
    "level": "default",
    "removedKeys": ["accessToken", "refreshToken", "providerApiKey", "userEmail"]
  }
}
```

### 12.3 最近 N 个用户操作

N 默认 100，受 `inkforge.diagnostic.actionWindow` 配置调控。写入 `user-action-recent.json`，字段包含：timestamp / type / target / outcome。

---

## 13. 诊断包导出入口

| 入口 | 位置 | 快捷键 | 上下文 |
|-----|-----|-------|-------|
| Settings > Advanced > Diagnostics | 主设置面板 | 无 | 正常运行 |
| Recovery Mode → Done 页面 | 恢复向导 | 无 | 恢复完成后 |
| SafeMode Banner 按钮 | 顶部横幅 | 无 | SafeMode |
| Disaster Recovery Wizard Step 4 | 全屏向导 | 无 | 灾难恢复 |
| Command Palette: `Export Diagnostic Package` | Palette | `Ctrl+Shift+F12` | 任意状态 |

导出流程：
1. 准备阶段：确认脱敏级别（默认 / 最小 / 原始）
2. 生成阶段：Worker 线程并行收集
3. 打包阶段：`jszip` 压缩
4. 落盘阶段：Tauri `save dialog` 选位置
5. 写 ActivityLog + 提供 Open Folder 按钮

---

## 14. 灾难恢复快照（Disaster Snapshot，X-11）

### 14.1 定义

Disaster Snapshot 是 InkForge 的最后防线：当 Dexie 打开失败或核心表不可读时，最后一张"无论如何都能吐出 JSON"的磁盘快照。

### 14.2 生成策略

1. **每日一次全量**：启动后 30s + 空闲时生成，存于 Tauri AppData 下 `backups/daily/<date>.json`。
2. **每次迁移前强制全量**：T-09 约束，保留最近 3 份。
3. **每次 Recovery / SafeMode 前增量**：仅 dump 当前文档的前后状态。

### 14.3 文件结构

```
backups/
├── daily/
│   ├── 2026-04-18.json
│   ├── 2026-04-19.json
│   └── 2026-04-20.json
├── migration/
│   └── before-v2.1.0.json
└── recovery/
    └── <timestamp>.json.bak
```

### 14.4 `recovery/<timestamp>.json.bak`

在 Recovery Wizard（§15）启动修复前生成，用于回滚。保留 7 天。

### 14.5 用户可见界面

Settings > Advanced > Backups：列表展示 / 导入 / 删除 / 手动触发全量备份。

---

## 15. 自动保存失败的应急导出（L1-19 D 补充）

### 15.1 失败判定

连续 2 次（1 次立即重试）保存写入 Dexie 失败视为真实失败。

### 15.2 UI 响应

- Toast red 级 + persist：不可自动消失
- StatusBar 保存状态变红，点击弹出 `AutosaveFailedPanel`
- TabBar 对应 Tab 角标变 `warning`
- 失败态持续 >5 分钟 → 窗口标题前缀 `warning `

### 15.3 `AutosaveFailedPanel`

含三个区块：

1. **错误详情**：最近一次错误堆栈 + 失败时间 + Dexie 错误码
2. **恢复点**：`recovery_points` 表中对应 articleId 的最近 5 条
3. **紧急导出按钮**：将当前内存态 editor 内容导出为 `.md` 文件（Tauri save dialog），命名 `<title>-recovery-<timestamp>.md`

### 15.4 恢复点表

```ts
interface RecoveryPointRecord {
  id: string
  articleId: string
  createdAt: number
  content: string
  contentHash: string
  trigger: 'autosave-failure' | 'crash-recovery' | 'disaster' | 'manual'
  consumed: boolean
}
```

保留策略：每文档最多 20 条；超过用 LRU 清理；consumed=true 的保留 24 小时后清理。

---

## 16. 性能约束（Performance）

| 路径 | 预算 | 监控 |
|-----|------|-----|
| beforeunload 写入 | ≤50ms（必须） | 超时降级为只写 100KB |
| 启动完整性检查 | ≤200ms 主线程 | 超出推迟到 idle |
| 定期 Worker 校验 | 不占主线程 >50ms / 100ms | CPU > 60% 自动推迟下一周期 |
| Recovery Mode 首屏 | ≤3s | 骨架屏 2s 后降级文字 |
| DiagnosticPackage 生成 | ≤10s | 进度条 + 可取消 |
| 快照导出（全量 <1000 文档） | ≤5s | 空闲时生成 |

所有路径必须写入 `performance-monitor` 采样（T-06）。

---

## 17. 与同步 Provider 联动

### 17.1 原则

同步失败不得污染本地数据，必须能走 Recovery 路径。

### 17.2 决策表

| Provider 状态 | Recovery 响应 |
|-------------|--------------|
| 正常但本地崩溃 | Recovery 恢复本地 → 下次启动 Provider 同步最新状态 |
| Provider 无响应 | Recovery 不等待 Provider，先恢复本地，Provider 事件延后 |
| Provider 三方冲突 | 进入 L1-22 冲突解决流，但冲突前先走 Recovery 得到 local 完整态 |
| Provider 数据损坏 | 标记该 Provider 为不可用 + 进入 SafeMode 同步层 |

### 17.3 禁止

- Recovery 过程中不允许触发任何同步推拉请求。
- SafeMode 强制禁用 Provider（同步层开关 off）。

---

## 18. 审计日志（ActivityLog）集成

所有 L1 / L2 / L3 路径必须写审计日志：

| 事件 | level | module | event |
|-----|-------|-------|-------|
| 进入 Recovery Mode | warn | crash-recovery | `recovery.enter` |
| 用户选择版本 | info | crash-recovery | `recovery.choose` |
| 哈希失败 | error | data-integrity | `integrity.hash-mismatch` |
| 版本链断裂 | critical | data-integrity | `integrity.chain-broken` |
| 进入 SafeMode | warn | safe-mode | `safemode.enter` |
| 退出 SafeMode | info | safe-mode | `safemode.exit` |
| 自动禁用扩展 | warn | extension-health | `ext.auto-disable` |
| 生成 DiagnosticPackage | info | diagnostic | `diag.export` |
| 灾难 Wizard 启动 | critical | disaster-recovery | `disaster.wizard.enter` |
| 快照生成 | info | backup | `backup.snapshot` |
| 自动保存失败 | error | autosave | `autosave.fail` |

详见 Spec 33 ActivityLogger。

---

## 19. 测试矩阵（正向 / 失败 / 恢复 / 边界）

### 19.1 单元测试（Vitest）

| 模块 | 正向 | 失败 | 恢复 | 边界 |
|-----|-----|------|------|------|
| beforeunload 序列化 | 写入 <50ms | localStorage 满 → 降级 | 读取解析 | 200KB 截断 |
| lastClosedCleanly 判定 | 正常启动 | cleanly 缺 emergency 有 | Recovery 流 | 时间漂移 |
| 哈希链校验 | 完整链 pass | prevHash 不匹配 | 自动恢复 | 首版本 null |
| Recovery 版本点 | 写入成功 | version-bundle 拒写 | 回滚 dump | 并发写 |
| 完整性 Worker | 抽样命中 | CPU 高推迟 | 修复引用计数 | >1000 文档分片 |
| DiagnosticPackage | 导出成功 | 打包失败 | 重试 | 脱敏覆盖率 100% |

### 19.2 Playwright E2E

| 场景 | 步骤 | 预期 |
|-----|-----|------|
| 强杀进程 | 写入内容 → `taskkill /F` → 重启 | Recovery Mode 显示候选，恢复后内容一致 |
| 断电模拟 | DevTools offline + 模拟崩溃信号 | 同上 |
| IndexedDB 损坏 | 注入损坏的 meta 表 → 启动 | Disaster Wizard 启动，快照可恢复 |
| 版本链断裂 | 手动改 article_versions.prevHash | SafeMode 横幅出现 |
| 自动保存失败 | 拦截 Dexie put → 抛错 | StatusBar 变红，紧急导出按钮可用 |
| 连续崩溃 3 次 | 模拟 3 次启动崩溃 | 自动进 SafeMode |
| 诊断包脱敏 | 写入包含密码的设置 → 导出 | zip 中 settings-redacted 不含密码 |

### 19.3 artifacts 目录

```
artifacts/17/
├── positive/
│   ├── normal-startup.png
│   ├── recovery-success.png
│   └── diagnostic-success.zip
├── failure/
│   ├── idb-corruption.png
│   └── autosave-fail.log
├── recovery/
│   ├── recovery-before-after.png
│   └── chain-repair.json
└── boundary/
    ├── 200kb-truncation.json
    ├── 1000-docs-perf.json
    └── crashcount-3.log
```

---

## 20. 验收标准 + 权威来源登记表

### 20.1 验收矩阵

| 编号 | 验收点 | 自动化 | 证据 |
|-----|-------|-------|-----|
| AC-17-01 | beforeunload 紧急保存 <50ms | Vitest + Playwright | positive/beforeunload-timing.json |
| AC-17-02 | 异常退出 → Recovery Mode | E2E | positive/recovery-success.png |
| AC-17-03 | lastClosedCleanly 判定四象限 | Vitest | unit coverage report |
| AC-17-04 | Recovery Mode 四种选择全路径 | E2E + 单测 | recovery/* |
| AC-17-05 | 预估丢失字数准确（误差 ≤5%） | Vitest | unit |
| AC-17-06 | 版本点永不直接覆盖 | Vitest（mock version-bundle） | unit |
| AC-17-07 | 启动完整性 ≤200ms 主线程 | Benchmark | boundary/startup-perf.json |
| AC-17-08 | Worker 校验不阻塞主线程 | Benchmark | boundary/worker-idle.json |
| AC-17-09 | 哈希失败 → 自动恢复 + SafeMode | E2E | failure + recovery |
| AC-17-10 | 版本链断裂检测 100% | Vitest | unit |
| AC-17-11 | SafeMode 禁用清单全覆盖 | Vitest + 快照 | safe-mode.snapshot.json |
| AC-17-12 | 连续崩溃 3 次 → SafeMode | E2E | boundary/crashcount-3 |
| AC-17-13 | DiagnosticPackage 脱敏 100% | Vitest | redaction-report.json |
| AC-17-14 | 灾难 Wizard 四步闭环 | E2E | disaster.gif |
| AC-17-15 | 自动保存失败可紧急导出 | E2E | failure/autosave-fail.md |
| AC-17-16 | 每日快照生成 | Cron 触发 | backup-daily.zip |
| AC-17-17 | 迁移前强制快照 | E2E | migration backup |
| AC-17-18 | Provider 失败不污染本地 | 单测 mock | provider-fail.json |
| AC-17-19 | ActivityLog 事件全覆盖 | Vitest | log-events.snapshot |
| AC-17-20 | 所有 artifacts/17 齐全 | CI 检查 | 自动 |

### 20.2 权威来源登记表

| 编号 | 字段 / 结论 | 来源 | 位置 |
|-----|------------|-----|-----|
| S-17-01 | beforeunload <50ms + 200KB | T-01 硬约束 | part3b §T-01 |
| S-17-02 | 正常退出标志 + emergency 双标志 | T-01 异常退出检测 | part3b §T-01 |
| S-17-03 | Recovery Mode 四选一 | T-01 UI | part3b §T-01 |
| S-17-04 | 自动保存失败完全可见 | L1-19 D | 03-enhancement-answers.md L1-19 |
| S-17-05 | 紧急导出 .md 按钮 | T-01 L1-19 补充 | part3b §T-01 |
| S-17-06 | 哈希校验 + 引用计数 + 版本链 | T-02 | part3b §T-02 |
| S-17-07 | 后台静默 / <50ms/100ms | T-02 硬约束 + R-05 补充 | 03-enhancement R-05 |
| S-17-08 | SafeMode 扩展清单 | T-03 | part3b §T-03 |
| S-17-09 | 连续崩溃 3 次 SafeMode | T-03 | part3b §T-03 |
| S-17-10 | DiagnosticPackage 组成 | T-05 | part3b §T-05 |
| S-17-11 | 灾难 Wizard 四步 | T-08 | part3b §T-08 |
| S-17-12 | 迁移前强制快照 | T-09 | part3b §T-09 |
| S-17-13 | 证据化验收 4 样本 | T-10 / X-12 D | part3b §T-10 |
| S-17-14 | 文章不能丢底线 | X-11 C | 03-enhancement X 组 |
| S-17-15 | Recovery 版本用 version-bundle | L1-17/18 | 03-enhancement |
| S-17-16 | 每日快照 + 迁移快照 + Recovery 快照 | T-08 + T-09 | part3b |
| S-17-17 | Recovery Mode 禁用自定义 CSS/JS | T-01 硬约束 | part3b §T-01 |
| S-17-18 | Profile 独立隔离 | 00-task-roadmap Phase H5 | 00-task-roadmap §7 |
| S-17-19 | 全局 errorHandler | T-03 | part3b §T-03 |
| S-17-20 | ActivityLog 3 个月保留 | T-05 | part3b §T-05 |

### 20.3 上游/下游 Spec 关联

- **上游**：19-autosave-spec（T-07 落地）、31-version-bundle-spec（版本点统一入口）
- **下游**：27-safe-mode-spec（SafeMode 禁用清单）、33-diagnostic-logging-spec（ActivityLog + DiagnosticPackage 实现）、40-dev-panel-spec（DevPanel 出口）
- **跨域**：26-multi-account-profile（Profile 隔离）、48-session-restore（Tab 状态）、32-comment-review（同步冲突解决链路）

---

## 21. 附：目录 & 文件落地

```
src/services/crash-recovery/
├── bootstrap.ts
├── emergency-save.ts
├── recovery-mode.ts
├── estimator.ts
├── safe-mode-bridge.ts
└── index.ts

src/services/data-integrity/
├── hash-check.ts
├── ref-count-check.ts
├── chain-check.ts
├── worker-orchestrator.ts
└── index.ts

src/services/safe-mode/
├── bootstrap.ts
├── registry.ts
└── banner.ts

src/services/disaster-recovery/
├── dexie-probe.ts
├── wizard-steps.ts
└── backup-source.ts

src/services/diagnostic-package/
├── collectors/
├── redactor.ts
├── packager.ts
└── index.ts

src/workers/integrity-worker.ts

src/views/
├── RecoveryMode.vue
├── SafeModeShell.vue
├── RecoveryWizard.vue
└── settings/
    ├── DataHealthPanel.vue
    ├── DiagnosticsPanel.vue
    └── BackupsPanel.vue

src/db/schema.ts           # 新增 recovery_points / recovery_journal / backups 表
```

---

**Spec 17 完**

---

## 2026-04-30 Baseline Implementation Note

The compatible L1 crash-recovery baseline is implemented for the current InkForge frontend without claiming full Spec 17 completion.

Implemented and verified:

- `src/services/crash-recovery` now owns typed emergency payload contracts, profile/window scoped localStorage keys, crash counters, clean shutdown markers, SHA-256 content hashes, content truncation metadata, emergency payload parsing, and recovery point helpers.
- `src/utils/db.ts` adds a non-destructive Dexie v5 `recoveryPoints` table with indexes for `id`, `articleId`, `createdAt`, `trigger`, `consumed`, and `sourceEmergencyKey`.
- `src/main.ts` initializes crash-recovery startup state and wires precomputed emergency snapshots to `beforeunload`, `visibilitychange`, and `pagehide` so browser lifecycle saves do not depend on async work inside `beforeunload`.
- `src/stores/editor.ts` writes a real `autosave-failure` recovery point and emergency payload when editor persistence fails, then preserves the existing error-state behavior.
- `src/stores/crashRecovery.ts` detects recoverable emergency payloads, restores selected content into real `contents` and `articles` records, writes and consumes a `crash-recovery` recovery point, and clears only the selected emergency key.
- `src/views/WorkstationView.vue` exposes a no-Emoji recovery banner with restore and ignore actions backed by the real recovery store.

Verification evidence:

- `pnpm exec vue-tsc --noEmit`: pass.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: pass.
- `pnpm build`: pass, with only the existing large chunk warning.
- Browser validation on `http://127.0.0.1:5176/workstation`: pass. A real Pinia/IndexedDB article was created; an emergency payload was written to localStorage with `writeResult.ok === true` and about `0.1ms` duration; the Workstation recovery banner appeared; restoring through the UI updated both `article.rawContent` and `contents.body`, wrote one consumed `crash-recovery` recovery point, cleared the emergency key, and left no validation article/content/recovery/localStorage residue after cleanup.
- Browser console errors during validation: 0.
- Port cleanup: Vite PID was stopped; `5176` had no LISTENING process afterward, only TIME_WAIT entries.

Still pending for full Spec 17:

- Full Recovery Mode wizard with all four choices.
- Data Integrity worker, hash-chain verification and repair, and automatic SafeMode shell.
- DiagnosticPackage zip export and redaction coverage.
- Disaster Recovery Wizard and filesystem backup scheduler.
- VersionHistory recovery bundle integration and immutable recovery versions.
- Full artifacts/17 matrix and cross-browser crash-kill E2E suite.
