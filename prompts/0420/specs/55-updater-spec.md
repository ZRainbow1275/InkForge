# Spec 55 — Tauri Updater（仅通知不强推）

> **Spec ID**: 55  
> **范围**: Tauri Updater 集成；最保守策略——仅检查与通知，不下载、不强制安装；可跳过版本；企业离线禁用。  
> **关联**: L1-56 B, 00-task-roadmap §3（55 条目）  
> **落点**: `TauriUpdater` Spec 极简版。

---

## 1. 设计原则（尊重用户控制权）

L1-56 用户选择 **B**："仅检查通知"。明确拒绝：

- **不自动下载更新包**
- **不后台预安装 / 下次启动强制安装**
- **不做"必须更新才能使用"的强制升级**

核心原则：

1. **透明**：用户随时能看到"当前版本" + "可用版本"。
2. **可控**：下载和安装全部由用户主动触发。
3. **可静默**：企业 / 离线场景完全禁用检查。
4. **不打扰**：检查失败不弹错，静默落 ActivityLog。
5. **可追溯**：每次检查 / 跳过 / 下载写审计日志。

---

## 2. Tauri Updater API 集成

### 2.1 依赖

- `@tauri-apps/plugin-updater`（Tauri 2.x 官方）
- 配置位于 `src-tauri/tauri.conf.json`:

```jsonc
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://releases.inkforge.app/{{target}}/{{arch}}/{{current_version}}"],
      "dialog": false,            // 我们自建 UI，不用内置 dialog
      "pubkey": "<minisign pubkey>",
      "windows": { "installMode": "passive" }  // 用户启动安装时传入
    }
  }
}
```

### 2.2 服务层封装

`src/services/updater/index.ts`：

```ts
export interface UpdateInfo {
  version: string            // SemVer
  releasedAt: number
  notes: string              // markdown
  size: number
  signatureOk: boolean
}

interface UpdaterService {
  checkOnStartup(): Promise<void>
  checkNow(): Promise<UpdateInfo | null>
  skip(version: string): Promise<void>
  openReleasePage(version: string): Promise<void>
  isDisabled(): Promise<boolean>   // 企业策略
  startDownloadManually(): Promise<void>   // v2.2 候选；v2.1 仅打开官网
}
```

签名校验失败必须 **不可见地忽略该更新**，同时写 `updater.signature.fail`（level=error, module=dev/updater）。

---

## 3. 版本检查流程

### 3.1 启动检查

- 应用启动完成（Editor 首屏 ready）后 **延迟 30s** 触发 `checkOnStartup()`。
- 目的：不抢首屏资源（X-05 Lighthouse）、不打扰首次使用。
- 网络不可达 → 静默失败 + ActivityLog info。

### 3.2 定时检查

- 每 **6 小时** 一次（使用 `setInterval` + 失焦时暂停）。
- 若系统休眠或 WebView 被挂起，恢复后补一次。
- 若上次检查 <30min，跳过（防抖）。

### 3.3 手动检查

- Settings > About > 「检查更新」按钮
- Command Palette: `Updater: Check for Updates`
- 手动检查不受 6h 节流限制

### 3.4 检查结果处理

```
checkNow()
 → Tauri Updater API 返回 { available, version, notes, signature }
 → 签名校验
 → 对比 skipped_versions 表
 → 对比当前版本
 → if available && !skipped && version > current:
     emit 'updater:available' → UI 层接收
   else:
     emit 'updater:none'
```

---

## 4. 通知 UI（Toast + Settings About）

### 4.1 Toast 提示

- **首次发现可用版本**：
  - 通过 Sonner（N-06）显示 `info` 级 Toast，持久化（用户显式关闭）。
  - 文案：「InkForge v{version} 已发布，查看更新日志」
  - 按钮：「查看详情」「稍后再说」「跳过此版本」
- 每个版本号只弹一次（localStorage 记录 `inkforge.updater.notified.<version>`）。
- 会话内再次检测到同版本不再弹 Toast。

### 4.2 Settings > About 提示

- Settings 根面板左下 "关于" 区域显示：
  - 「当前版本 v2.1.0」
  - 「已安装时间：2026-04-10」
  - 「最新版本：v2.1.1（2026-04-18 发布）」徽章
  - 「检查更新」按钮
- 有新版本时徽章标橙；无新版本时显示 「已是最新」。

### 4.3 无徽章轰炸策略

- 主 Hub / Workstation 不显示徽章（保持专注）。
- 仅在 Settings 打开时才显示。
- Toast 提示只在"首次发现"时弹，不会反复打扰。

### 4.4 UI 组件

- `src/components/settings/UpdateCard.vue`
- `src/services/updater/toast-notifier.ts`

---

## 5. 不做自动下载

### 5.1 用户操作流

```
Toast 「查看详情」 → 打开 Settings > About 或独立路由 /updates
  → 「查看更新日志」展示 markdown
  → 「去下载」按钮 → 打开浏览器跳转到 GitHub Release 页面
```

### 5.2 打开外部链接

- 调用 `@tauri-apps/plugin-opener` 打开默认浏览器。
- 禁止在 WebView 内直接下载。
- 打开链接前写 ActivityLog：`updater.open-release` + version。

### 5.3 v2.1 不实现的能力

明确排除以下功能（留待 v2.2 或更晚）：

- 后台下载安装包
- 下次启动自动安装
- 差分更新
- 静默更新

对应在 Settings 面板也不显示这些开关。

---

## 6. 跳过版本（Skip Version）

### 6.1 L1-56 原题选项

L1-56 选项 C / D 引入"跳过版本"。用户选 B，但 B 语义覆盖到 **可选跳过通知**：只跳通知，不阻止手动检查。

v2.1 实现最小版本：
- Toast「跳过此版本」按钮
- Settings 版本详情页「不再提示此版本」

### 6.2 Schema

IndexedDB `updater_skipped` 表：

```ts
interface SkippedVersionRecord {
  version: string    // primary key
  skippedAt: number
  reason?: 'user' | 'auto'
}
```

### 6.3 行为

- `skip(version)` 调用时写表 + 当前 session Toast 关闭。
- 后续检查到同版本仍会在 Settings 展示"已跳过"（但不会弹 Toast）。
- 发现高于被跳过版本的新版本 → 重新弹 Toast（不会被跳过列表阻止）。

### 6.4 清空跳过列表

Settings > About > 「重置跳过记录」按钮。

---

## 7. 更新日志展示（Release Notes）

### 7.1 来源

Tauri Updater 响应包含 `notes`（markdown 字符串）。

### 7.2 展示

- Settings > About > 点击版本徽章 → 弹出 `UpdateDetailsModal.vue`
- Modal 内容：
  - 版本号 / 发布时间 / 大小
  - 签名状态（绿色勾 / 红色叉；若红色禁用"去下载"按钮）
  - Markdown 渲染的 notes（使用项目现有 markdown renderer）
  - 按钮：「去下载」「跳过此版本」「稍后再说」

### 7.3 安全渲染

- Markdown 渲染禁止 HTML / iframe / script（复用 InkForge 的沙盒配置）
- 链接强制 `target=_blank + rel=noopener`
- 图片域名白名单（只允许 releases.inkforge.app / github.com）

---

## 8. 禁用场景（企业离线）

### 8.1 禁用触发

以下任一成立时禁用 Updater：

1. Tauri `tauri.conf.json` 中 `plugins.updater.active=false`（构建时）
2. 环境变量 `INKFORGE_UPDATER=0`（运行时）
3. Settings > About > 「禁用自动检查」开关（用户显式关）
4. 企业配置文件 `config/enterprise.json` 存在且设置 `updater.disabled=true`
5. 检测到离线 >24h（避免反复失败消耗资源）

### 8.2 禁用行为

- `checkOnStartup()` / 定时 / 手动 全部短路返回 `null`
- Settings UI 显示灰色「已由策略禁用」提示
- 不写 error，仅首次写 info `updater.disabled`

### 8.3 手动恢复

- 仅当来源是用户开关 (3) 时可通过 UI 恢复
- 企业策略 / 构建开关需联系管理员

---

## 9. 性能与可靠性

### 9.1 预算

| 路径 | 预算 |
|-----|-----|
| startup check 延迟 | 30s |
| checkNow 网络超时 | 5s |
| 签名校验 | <100ms |
| Toast 抖动 | 同版本不重复 |
| 定时检查 | 6h 一次，窗口失焦时暂停 |

### 9.2 错误处理

按 Spec 33 四层分类：

| 情况 | level | 写入 | Toast |
|-----|------|------|------|
| 网络不可达 | info | activity_logs | 无 |
| 端点 4xx/5xx | warn | activity_logs | 无 |
| 签名校验失败 | error | activity_logs（critical 可选） | 无（安全考虑） |
| 用户主动检查返回成功 | info | activity_logs | success 轻量提示 |
| 用户主动检查失败 | warn | activity_logs | warn toast |

### 9.3 审计

所有用户可感知事件进入 audit_logs（Spec 24）：
- `updater.user-check`
- `updater.skip-version`
- `updater.open-release`
- `updater.toggle-disabled`

---

## 10. 测试矩阵

### 10.1 单元（Vitest）

| 项目 | 正向 | 失败 | 恢复 | 边界 |
|-----|-----|-----|-----|-----|
| checkOnStartup 延迟 | 30s 触发 | 窗口失焦暂停 | 恢复后补一次 | 无网络 |
| 节流 | 6h 一次 | 30min 内第二次跳过 | 手动检查无视节流 | 手动多次 |
| skip 写表 | 写入成功 | Dexie 失败降级 localStorage | 重启后读取 | 重复 skip 同版本 |
| 签名校验 | pass | fail 则忽略更新 | 不弹 Toast | pubkey 缺失 |
| Toast 去重 | 首次 1 次 | 同会话不再弹 | 新版本重置 | 高于被跳过版本 |
| 禁用判定 | 五种触发 | 任一成立即短路 | 取消开关恢复 | 企业策略不可恢复 |

### 10.2 E2E

| 场景 | 步骤 | 预期 |
|-----|-----|-----|
| 启动发现更新 | mock endpoint 返回新版本 → 启动 | 30s 后 Toast 弹出 |
| 跳过版本 | 点击「跳过此版本」 | 同 session 不再弹 |
| 手动检查 | Settings About 「检查更新」 | 立即返回最新版本 |
| 打开 release 页 | 点击「去下载」 | 默认浏览器打开 |
| 禁用开关 | 关闭 Settings 开关 | 所有检查停止 |
| 签名失败 | mock 错误签名 | 不弹 Toast，ActivityLog 记录 |
| 企业策略 | 放置 enterprise.json | UI 显示「已由策略禁用」 |

### 10.3 artifacts/55

```
artifacts/55/
├── positive/
│   ├── startup-toast.png
│   ├── settings-about.png
│   └── release-notes-modal.png
├── failure/
│   ├── signature-fail.log
│   └── offline-silent.log
├── recovery/
│   └── disabled-to-enabled.png
└── boundary/
    ├── throttle-30min.json
    └── skip-across-versions.json
```

---

## 11. 验收矩阵 + 权威来源登记表

### 11.1 验收矩阵

| 编号 | 验收点 | 自动化 | 证据 |
|-----|-------|-------|-----|
| AC-55-01 | 启动 30s 后自动检查 | E2E | positive |
| AC-55-02 | 6h 节流 + 30min 防抖 | Vitest | boundary |
| AC-55-03 | 手动检查无视节流 | E2E | positive |
| AC-55-04 | 不自动下载 / 不强制安装 | Code review + 单测 | unit |
| AC-55-05 | 跳过版本写表 | Vitest | unit |
| AC-55-06 | 签名失败静默忽略 | Vitest | failure |
| AC-55-07 | Toast 去重（同 session 同版本） | E2E | positive |
| AC-55-08 | Settings About 正确展示 | E2E | positive |
| AC-55-09 | 打开 release 页走默认浏览器 | E2E | positive |
| AC-55-10 | 五种禁用路径全覆盖 | Vitest + E2E | boundary |
| AC-55-11 | 审计 & ActivityLog 全事件 | Vitest | unit |

### 11.2 权威来源登记表

| 编号 | 字段 / 结论 | 来源 | 位置 |
|-----|-----------|-----|-----|
| S-55-01 | 选择 B「仅检查通知」 | L1-56 B | 03-enhancement L1-56 |
| S-55-02 | 落点极简 Updater | L1-56 落点建议 | 03-enhancement L1-56 |
| S-55-03 | 不自动下载 / 不强制 | L1-56 决策含义 | 03-enhancement L1-56 |
| S-55-04 | 跳过版本留 v2.2 候选 | 任务说明 55-updater 文档 1 | 任务消息 |
| S-55-05 | 企业离线禁用 | 任务说明 55-updater §8 | 任务消息 |
| S-55-06 | Toast 走 Sonner | N-06 + Spec 33 §8 | 33-diagnostic-logging |
| S-55-07 | 审计写 Spec 24 | 24-permission-audit | 00-task-roadmap |
| S-55-08 | Lighthouse 首屏 | X-05 C | part3b §T-06 |
| S-55-09 | 签名校验失败不弹 | 安全原则 | 本 Spec §2.2 |
| S-55-10 | 全 artifacts/55 | T-10 / G-14 证据化 | part3b §T-10 |

---

## 12. 目录落地

```
src/services/updater/
├── index.ts
├── check-scheduler.ts
├── toast-notifier.ts
├── skip-store.ts
├── policy.ts           # 企业禁用判定
└── release-notes.ts

src/components/settings/
├── UpdateCard.vue
└── UpdateDetailsModal.vue

src/db/schema.ts       # 新增 updater_skipped 表

src-tauri/tauri.conf.json  # updater plugin 配置
```

---

## 13. 2026-05-03 Baseline Implementation Note

Baseline status: Pass for the Tauri 1 compatible check-and-notify updater baseline. The implementation remains intentionally disabled for real desktop update checks until a signed endpoint and pubkey are supplied; web dev proves the typed disabled/unavailable path instead of mocking native success.

Implemented coverage:

- `inkforge/src/services/updater/*` implements typed updater contracts, SemVer comparison, Tauri 1 `checkUpdate()` adapter, policy evaluation, skip-version persistence, release-note sanitization, ActivityLog writes, and audit writes.
- The adapter dynamically imports `@tauri-apps/api/updater` and calls `checkUpdate()` only. It does not call `installUpdate()`, `downloadAndInstall()`, `download()`, `install()`, or `relaunch()`.
- `inkforge/src/utils/db.ts` schema v20 adds the durable `updaterSkipped` table without removing existing object stores.
- `inkforge/src/stores/settings.ts` adds `advanced.updater` for auto-check preference, last check timestamps, last successful check timestamp, latest update snapshot, notified versions, disabled reason, and last error.
- `inkforge/src/stores/updater.ts` schedules startup checks after the app is mounted, starts conservative 6h interval checks, pauses while hidden, resumes once on visible or online events, keeps background failures silent, persists notification de-dupe through settings plus `inkforge.updater.notified.<version>`, and exposes manual UI actions.
- `Settings > About` renders `UpdateCard.vue` additively before existing desktop diagnostics; global `UpdateToast.vue` and `UpdateDetailsModal.vue` are mounted at app root.
- Command Palette registers `updater.checkUpdates` as `Updater: Check for Updates`; the handler performs a real manual check and navigates to `Settings > About` with `section=updater`.

Validation evidence:

- Official Tauri docs were rechecked on 2026-05-03 with Context7 and Grok Search: Tauri 1 separates `checkUpdate()` from `installUpdate()`, while Tauri 2 `@tauri-apps/plugin-updater` uses `check()` plus explicit `downloadAndInstall()` / `download()` / `install()` / `relaunch()` paths.
- `pnpm exec vitest run src/services/updater/updater.test.ts` passed: 1 file, 12 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm vitest run` passed: 36 files, 267 tests.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed; only existing Vite dynamic/static import and large chunk warnings remain.
- No updater-scope forbidden install/download/relaunch calls were found by targeted scan.
- Browser smoke on `http://127.0.0.1:3005/settings?tab=about&section=updater` verified the real Settings card, web-dev typed `build-config` disabled state, no update toast, and no console errors.
- Browser smoke opened Command Palette, filtered `Updater`, executed `Updater: Check for Updates`, and verified the route stayed on `Settings > About` updater section with manual disabled feedback.
- Read-only IndexedDB smoke verified one `updater.user-check` audit entry with outcome `info`, two `updater.disabled` ActivityLog entries for startup/manual checks, and `updaterSkipped` count 0.
- Screenshot artifact captured at `artifacts/55/spec55-updater-settings-smoke-2026-05-03T08-48-11-021Z.png`.

Pending for a full native-release updater pass:

- Real signed Tauri updater endpoint, minisign pubkey, and release artifact hosting are still absent. Do not flip the updater to active or claim native update availability until release signing is configured.
- Packaged Tauri runtime validation remains pending because the current slice intentionally avoids Tauri major migration and does not invent release metadata.
- Full toast-positive and skip-positive native update E2E require a real signed release manifest; web/dev evidence must remain limited to disabled/unavailable behavior.

---

**Spec 55 完**
