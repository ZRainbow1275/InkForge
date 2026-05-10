# 41 — Settings 迁移引擎 Spec

> **Spec 编号**: 41
> **层级**: 基础层（Phase 1 — Foundational Guardrails）
> **状态**: Draft v1（0420）
> **依赖**: 无（本 Spec 是所有 Settings / Schema 升级的兜底）
> **下游直接依赖方**: 07-settings-full、10-markdown-authority（schema 版本协同）、17-crash-recovery（迁移失败回路）、20-theme-font-typography、23-sync-provider、24-permission-audit、25-extension-plugin、26-multi-account-profile、33-diagnostic-logging
> **相关决策**: T07-10 D（schema version + 差异预览 + 回滚点 + 废弃提示）、T07-12 C（重置三级 + 回滚点）、X-04 B（迁移脚本 + 进度提示）、R-18（高危自动备份）

---

## 0. 文档定位

本 Spec 定义 InkForge v2.1 的 **Settings schema 版本管理**、**自动迁移引擎**、**差异预览 UI**、**回滚点机制**、**废弃字段提示**、**Zod 集成**、**失败处理与审计**、**测试矩阵**。

- 本 Spec 只覆盖 Settings / 配置类迁移（不覆盖 DB schema 迁移 —— 后者见 17-crash-recovery 或 Part 3a 的 IndexedDB 迁移决策）。
- Settings 的权威 = `settings.json` 文件（Profile 级）+ 主题 / 扩展 / 渠道等子配置文件。
- 本 Spec 与 07-settings 的关系：07 定义 UI / Tab / Registry；本 Spec 定义升级路径。

---

## 目录

1. 迁移需求来源
2. Schema 版本管理
3. Migration 函数约定（v → v+1）
4. 迁移触发时机
5. 差异预览 UI（before/after diff）
6. 回滚点创建与使用
7. 废弃字段标注与提示
8. 验证与 Zod 集成
9. 失败处理与审计
10. 测试矩阵（多版本链条）
11. 验收标准
12. 权威来源登记表

---

## 1. 迁移需求来源

### 1.1 触发场景

| 场景 | 说明 |
|---|---|
| App 版本升级 | 新版增加 / 删除 / 重命名 Settings 字段 |
| 用户导入他人 / 旧版 Settings | 从旧版 Settings 文件导入 |
| 账户间同步 Settings 子集（设备级共享区） | 见 26-multi-account-profile |
| 从云 Sync Provider 拉取远端 Settings | 23-sync-provider（若远端版本落后 / 领先） |

### 1.2 需求来源题目

- **T07-10 D**："需要 schema version + 自动迁移 + 差异预览 + 回滚点"；补充"废弃项必须提示"
- **T07-12 C + 补充**："恢复默认 → 生成回滚点"
- **X-04 B**："迁移脚本 + 进度提示，不依赖隐式自动升级"
- **R-18**（铁律）：高危操作自动版本点

### 1.3 本 Spec 的承诺

1. 任何 schema 变更都有对应 migration 函数，按版本链条串行执行
2. 迁移前用户可见 diff（哪些值将变化 / 哪些字段废弃）
3. 每次迁移自动生成回滚点（`rollback_snapshot_<version>`）
4. 迁移失败 → 自动回滚 + 错误报告 + 进入安全模式选项
5. 所有迁移写 `activity_logs`（R-17）

---

## 2. Schema 版本管理

### 2.1 版本号语义

- 格式：**正整数递增** `1, 2, 3, 4, …`
- 不使用 semver（简化迁移链条 + 避免"主/次/patch"判定）
- `v0` 视为"未版本化"（v2.0 之前）；首次登陆 v2.1 时统一升级到 `v1`

### 2.2 版本存储位置

```
Profile 根目录/
  settings.json        // 用户 Settings
  settings.meta.json   // { schemaVersion: 1, updatedAt, createdAt, history: [...] }
```

以及 IndexedDB 同 Profile 下的 `settings_meta` 表（镜像，方便快速读取）。

### 2.3 应用程序常量

```ts
// src/services/settings-migration/version.ts
export const CURRENT_SETTINGS_SCHEMA_VERSION = 1; // v2.1 起步
export const MIN_SUPPORTED_SETTINGS_SCHEMA_VERSION = 0; // 至少能升级 v2.0 的 Settings
```

- `CURRENT` 随迭代递增
- `MIN_SUPPORTED` 由每次迭代时的维护窗口决定；低于此版本的 Settings 走"导入向导"而非自动迁移

### 2.4 多配置文件的版本独立性

Settings 不是单一文件，而是一组：

| 文件 | Schema Version 独立? |
|---|---|
| `settings.json`（主 Settings） | 是 |
| `keybindings.json`（快捷键） | 是 |
| `themes/*.json` | 是 |
| `templates/*.md` + `manifest.json` | 是（42-templates） |
| `export-presets/*.json` | 是 |
| `extensions/<id>/config.json` | 是（每个扩展独立） |

每个文件独立管理 `schemaVersion`；迁移引擎按文件类型挑对应的 `migrations/` 子目录。

---

## 3. Migration 函数约定（v → v+1）

### 3.1 函数签名

```ts
// src/services/settings-migration/migrations/settings/v0-to-v1.ts
export interface MigrationContext {
  from: number;
  to: number;
  profileId: string;
  fileKind: 'settings' | 'keybindings' | 'theme' | 'template' | 'exportPreset' | 'extensionConfig';
  logger: MigrationLogger;   // 写 audit
  abortSignal: AbortSignal;  // 用户中断
}

export interface Migration<Input = unknown, Output = unknown> {
  from: number;                     // 源版本
  to: number;                       // 目标版本
  description: string;              // 中文描述（用于 UI）
  apply: (input: Input, ctx: MigrationContext) => Promise<Output>;
  rollback?: (output: Output, ctx: MigrationContext) => Promise<Input>; // 可选：语义回滚（vs 快照回滚）
  deprecations?: DeprecationRecord[]; // 废弃字段清单
}

export interface DeprecationRecord {
  path: string;                     // 如 'editor.legacyMode'
  reason: string;                   // 废弃原因（用户可见）
  replacement?: string;             // 新字段路径
  fallbackValue?: unknown;          // 如果用户在新版无对应字段时的默认值
}
```

### 3.2 示例：`v0 → v1`（从 v2.0 升级）

```ts
import type { Migration } from '../types';
import type { SettingsV0 } from './schema-v0';
import type { SettingsV1 } from './schema-v1';

export const settings_v0_to_v1: Migration<SettingsV0, SettingsV1> = {
  from: 0,
  to: 1,
  description: '从 v2.0 升级到 v2.1：拆分字体设置、引入 ThemeEngine、废弃 legacyMode',
  apply: async (input, ctx) => {
    const output: SettingsV1 = {
      schemaVersion: 1,
      appearance: {
        theme: input.theme ?? 'auto',
        contentTheme: 'default',                // 新增
        uiTheme: 'default',                     // 新增
      },
      editor: {
        paperWidth: input.paperWidth ?? 'regular',
        // legacyMode 废弃 → 若为 true 则提示用户启用专注模式
      },
      font: {
        zh: input.font ?? 'system-ui',          // 重命名：font → font.zh
        en: 'Inter',                            // 新增默认值
      },
      keybindings: {
        ref: 'keybindings.json',                // 新增：拆成独立文件（走另一条迁移链）
      },
      // ... 省略其他字段
    };
    ctx.logger.info(`迁移了 ${Object.keys(input).length} 个字段`);
    return output;
  },
  deprecations: [
    {
      path: 'legacyMode',
      reason: 'v2.1 起弃用 Legacy Mode；请使用专注模式替代',
      replacement: 'editor.focusMode',
      fallbackValue: false,
    },
    {
      path: 'font',
      reason: 'v2.1 起字体拆分为 font.zh / font.en',
      replacement: 'font.zh',
    },
  ],
};
```

### 3.3 链式注册

```ts
// src/services/settings-migration/registry.ts
export const MIGRATIONS: Record<FileKind, Migration[]> = {
  settings: [
    settings_v0_to_v1,
    // settings_v1_to_v2 在 v2.2 添加
  ],
  keybindings: [
    keybindings_v0_to_v1,
  ],
  theme: [],
  template: [],
  exportPreset: [],
  extensionConfig: [],
};
```

### 3.4 链条执行

`SettingsMigrator.migrate(input, targetVersion)` 从 `input.schemaVersion` 开始，按 MIGRATIONS 排序执行每一步，直到达到 `targetVersion`。

```ts
async migrate(input: unknown, kind: FileKind, target: number): Promise<unknown> {
  let current = input;
  let currentVersion = this.detectVersion(current);
  while (currentVersion < target) {
    const next = MIGRATIONS[kind].find(m => m.from === currentVersion);
    if (!next) throw new UnreachableVersionError(currentVersion, target);
    current = await next.apply(current, ctx);
    currentVersion = next.to;
  }
  return current;
}
```

### 3.5 可逆性

- `apply` 必须保证幂等（多次执行产出相同结果）
- `rollback` 是**可选**的语义回滚；大多数情况通过**快照回滚**（见 §6）即可
- 少数破坏性变更（如删除字段后无法重建原语义）必须在 Spec 中显式标记 `nonReversibleSemantically: true`

---

## 4. 迁移触发时机

### 4.1 启动期

- App 启动 → 加载 Settings → 检查 `schemaVersion`
- 若低于 `CURRENT` → 打开 **MigrationModal**（见 §5）
- 低于 `MIN_SUPPORTED` → 打开 **ImportWizard**（44-import-wizard 路径），不自动迁移

### 4.2 导入期

- 用户"从文件导入 Settings"（07-settings 的 Data Tab） → 走一次迁移
- 导入的文件版本可能**高于**当前 App → 报错"请升级 App"

### 4.3 同步期（远端 Settings）

- 23-sync-provider 拉取到的 Settings 若版本低 → 触发迁移 + 冲突解决
- 远端高于本地 → 提示用户"远端 Settings 版本更高，请升级 App"

### 4.4 自动时机总览

| 时机 | 是否自动 | 是否需要用户确认 |
|---|---|---|
| App 启动检测到旧版 | 自动显示 Modal | 需要点击"开始迁移" |
| 导入他人 Settings 文件 | 显示 Modal | 需要点击"确认导入" |
| 远端 Sync 拉到旧版 | 显示 Modal + 冲突 UI | 需要确认合并方式 |
| Settings 重置（T07-12 C） | 自动创建回滚点，无需 Modal | 重置本身已需二次确认 |
| 扩展安装 / 升级 | 每扩展独立 Modal | 每次安装时确认 |

### 4.5 后台静默迁移禁令

**禁止**无 UI 提示的静默迁移。即使结果相同，用户也必须看到：
- 我的配置版本
- 目标版本
- 将变化的字段 diff
- 回滚点位置

---

## 5. 差异预览 UI（before/after diff）

### 5.1 MigrationModal 组件

位置：`src/components/settings/MigrationModal.vue`

### 5.2 信息架构

```
┌─────────────────────────────────────────────────┐
│ [Icon: HardDriveDownload] Settings 升级          │
├─────────────────────────────────────────────────┤
│ 您的 Settings 是 v0（InkForge v2.0），          │
│ 当前 App 需要 v1（v2.1）。                       │
│                                                   │
│ 将执行以下迁移：                                  │
│ ─ v0 → v1：拆分字体设置、引入 ThemeEngine、     │
│            废弃 legacyMode                        │
│                                                   │
│ 【预计受影响字段】6 个                            │
│ 【废弃字段】1 个（将弹 DeprecationBanner）        │
│ 【新增字段】3 个（使用默认值）                    │
│                                                   │
│ [按钮: 查看详细 diff] [按钮: 开始迁移] [取消]     │
├─────────────────────────────────────────────────┤
│ 回滚点将自动生成在：                              │
│ <Profile>/.rollback/settings-v0-to-v1-20260420/  │
└─────────────────────────────────────────────────┘
```

### 5.3 详细 diff 展开

- 逐行显示 `before → after`，像 Git diff
- 字段路径用 `a.b.c` 表示
- 废弃字段用删除线 + 红色标签"废弃"
- 新增字段用加号 + 蓝色标签"新增"
- 变更字段用 `→` 箭头

示例：

```
 appearance.theme: "dark" → "dark"        (unchanged)
+appearance.contentTheme: undefined → "default"  (新增)
+appearance.uiTheme: undefined → "default"       (新增)
-legacyMode: true → [废弃]                (替代: editor.focusMode)
 font: "system-ui" → font.zh: "system-ui" (重命名)
+font.en: undefined → "Inter"             (新增)
```

### 5.4 图标与风格

- 使用 `lucide-vue-next` 图标（禁 emoji）
- 图标选用：`HardDriveDownload`、`ArrowRight`、`Trash2`、`PlusCircle`、`Info`、`AlertTriangle`
- 遵循 09-ui-polish 的设计语汇

### 5.5 进度 Modal

实际执行迁移时（可能耗时 > 1s），切到 **MigrationProgressModal**：

- 进度条（基于 migration 函数内部的 logger 推送）
- 当前步骤描述
- "中断"按钮（触发 abort → 进入 §9 失败处理）

### 5.6 完成后的 Summary

迁移成功后显示：
- 升级结果：`v0 → v1 完成`
- 执行时长
- 回滚点位置 + "保留 / 丢弃"按钮（默认保留 30 天）
- 废弃字段提示（引向 DeprecationBanner，见 §7）
- 操作按钮：`查看迁移日志` / `继续使用`

---

## 6. 回滚点创建与使用

### 6.1 回滚点定义

迁移前的 Settings 完整快照 + 元数据。

### 6.2 存储路径

```
<Profile>/.rollback/
  settings-v0-to-v1-20260420T103000/
    settings.json        // 迁移前的完整文件
    metadata.json        // { from, to, createdAt, reason, migrationLogs }
    checksum.txt         // sha256 of settings.json
```

IndexedDB 镜像：`rollback_snapshots` 表

### 6.3 触发创建

| 触发 | 说明 |
|---|---|
| 每次迁移前 | `rollback_snapshots` 写一行 |
| T07-12 C 的 Tab / 全量重置前 | 同样创建回滚点 |
| T07-10 D 补充的"导入前"自动回滚点 | Settings 导入前 |
| 手动回滚点 | 用户可在 Settings > Data > Rollback Points 手动创建 |

### 6.4 回滚操作

```
Settings > Data > Rollback Points
  ├─ settings-v0-to-v1-20260420T103000（v0 → v1）
  │    ├─ [恢复到此]
  │    ├─ [查看差异]
  │    ├─ [导出为文件]
  │    └─ [删除]
  ├─ settings-reset-tab-editor-20260421T180000
  └─ ...
```

### 6.5 保留策略

- 默认保留 30 天
- 用户可在 Settings 中配置（最短 7 天 / 最长 永久）
- 达到保留期自动清理（写 audit）
- 用户可"固定"某个回滚点不被清理

### 6.6 容量预警

- `rollback_snapshots` 目录总容量 > 500MB 时警告
- 提供"保留最近 N 个"批量清理入口

### 6.7 回滚验证

- 恢复到回滚点后必须再次通过 Zod 校验
- 如果当前 App 已升级到更高版本（如 v2），回滚到 v0 会导致不可用 → 系统提示"回滚到 v0 将使部分 v2 功能不可用，是否继续？"

---

## 7. 废弃字段标注与提示

### 7.1 Deprecation 元数据

在 Migration 的 `deprecations` 数组中声明（§3.1）。

### 7.2 DeprecationBanner 组件

迁移完成后，若有 `deprecations`：

```
┌─────────────────────────────────────────────────┐
│ [Icon: AlertTriangle] 有 1 项配置已废弃         │
├─────────────────────────────────────────────────┤
│ legacyMode                                        │
│   原因：v2.1 起弃用 Legacy Mode                  │
│   建议：使用专注模式（editor.focusMode）替代      │
│   当前值：true → 默认值 false                    │
│                                                   │
│ [按钮: 前往 Settings 手动配置] [按钮: 知道了]     │
└─────────────────────────────────────────────────┘
```

### 7.3 入口位置

- Migration Summary 完成后立即显示
- 可被 dismiss，但在 Settings > Advanced > Deprecation 常驻（直到用户显式处理）
- 持久化到 `settings.meta.json` 的 `pendingDeprecations` 数组

### 7.4 提示消失条件

- 用户在对应字段做了显式操作（如切到替代字段并保存）
- 或用户点击"知道了"并选择"不再提醒"

### 7.5 多轮累积

多轮迁移可能累积多条废弃项 → 合并显示（按版本号分组）。

### 7.6 i18n

- 废弃提示文案支持中英双语（G-07 D）
- `DeprecationRecord.reason` / `replacement` 必须是 i18n key 而非裸字符串

---

## 8. 验证与 Zod 集成

### 8.1 每版本有独立 Schema

```
src/services/settings-migration/migrations/settings/
  schema-v0.ts        // SettingsV0 + ZodV0
  schema-v1.ts        // SettingsV1 + ZodV1
  v0-to-v1.ts
```

### 8.2 Zod 在迁移中的三个角色

| 角色 | 时机 |
|---|---|
| **输入校验** | 迁移开始前校验 `input` 合规（当前版本的 schema） |
| **输出校验** | 迁移完成后校验 `output` 合规（目标版本的 schema） |
| **运行时校验** | App 加载 Settings 时校验（独立于迁移） |

### 8.3 Zod 失败处理

- 输入校验失败 → 迁移**不启动**；提示用户"Settings 文件损坏"；走 §9 的恢复路径
- 输出校验失败 → 视为迁移 bug；回滚到 rollback snapshot + 上报错误（不应发生，出现即红色 P0）
- 运行时校验失败 → 尝试自动修复（字段缺失用默认值补）；无法修复则提示

### 8.4 Zod Schema 演化约束

- 新增可选字段 → Major-compatible
- 删除字段 → 必须在 `deprecations` 声明 + 有替代或 fallback
- 重命名字段 → `deprecations.replacement` 指向新路径
- 改变类型 → 必须在 migration 中转换
- 扩大枚举值 → 需要默认值兜底

---

## 9. 失败处理与审计

### 9.1 失败类型

| 类型 | 说明 | 处理 |
|---|---|---|
| **ParseFailure** | YAML / JSON 语法错误 | 尝试从 meta 恢复 + 提示用户手动编辑 |
| **ZodInputValidationFailure** | 输入不符合源版本 schema | 提示修复 + 走"导入向导"路径 |
| **MigrationFunctionThrown** | `apply()` 抛异常 | 回滚快照 + 上报 + 停止后续 |
| **ZodOutputValidationFailure** | 输出不符合目标 schema | 回滚快照 + P0 bug 上报 |
| **Aborted** | 用户中断 | 回滚快照 + 提示"下次启动再试" |
| **StorageFailure** | 文件写入失败（磁盘满 / 权限） | 回滚快照 + 提示修复磁盘 + 进入安全模式 |

### 9.2 失败 UI

```
┌─────────────────────────────────────────────────┐
│ [Icon: XCircle, color: brand-red] 迁移失败       │
├─────────────────────────────────────────────────┤
│ v0 → v1 迁移失败                                 │
│ 错误类型：MigrationFunctionThrown                │
│ 错误信息：Cannot read property 'font' of null    │
│                                                   │
│ 回滚状态：已成功回滚到迁移前状态                  │
│ 回滚点：.rollback/settings-v0-to-v1-20260420/    │
│                                                   │
│ [按钮: 查看完整日志] [按钮: 进入安全模式]        │
│ [按钮: 导出诊断包] [按钮: 稍后再试]               │
└─────────────────────────────────────────────────┘
```

### 9.3 安全模式入口

失败后用户可选择进入 **SafeMode**（17-crash-recovery）：

- 核心功能可用（打开 / 编辑 / 保存）
- 禁用扩展
- Settings 使用 App 默认值（内存态，不持久化）
- 给用户时间导出数据 / 修复 Settings 文件

### 9.4 Audit 事件

所有迁移相关事件写 `activity_logs`（R-17）：

| kind | payload |
|---|---|
| `settings.migration.start` | `{ from, to, fileKind, profileId }` |
| `settings.migration.step` | `{ migrationId, from, to, durationMs }` |
| `settings.migration.success` | `{ from, to, deprecations[] }` |
| `settings.migration.failure` | `{ from, to, errorType, errorMessage, rollbackSnapshotId }` |
| `settings.migration.rollback` | `{ snapshotId, reason }` |
| `settings.migration.abort` | `{ from, to, progressPct }` |

### 9.5 诊断包导出

用户可在失败 UI 中一键导出诊断包（见 33-diagnostic-logging），含：
- 当前 Settings 文件
- 目标版本期望 schema
- 迁移日志
- 环境信息（OS / App 版本 / Profile 数）

不包含正文（保护用户内容）。

### 9.6 错误分级（配合 G-13 D）

| 错误分级 | 场景 | 行为 |
|---|---|---|
| 提示 | 单个废弃字段自动使用默认 | Banner |
| 可恢复 | 单次迁移函数失败但可回滚 | §9.2 Modal + 安全模式选项 |
| 阻断 | 回滚失败 + 数据不可读 | 强制安全模式 + 诊断包 + "文章抢救"按钮 |
| 数据风险 | Zod 输出校验失败 | 等同阻断 + P0 上报 |

---

## 10. 测试矩阵（多版本链条）

### 10.1 单迁移测试

每个 migration 函数必须有独立 Vitest：

```
tests/migrations/settings/v0-to-v1.spec.ts
  ├─ 正向样本（典型 v0 配置 → 预期 v1）
  ├─ 边界样本（字段缺失 / null / 嵌套异常）
  ├─ 空输入（完全空 Settings）
  ├─ 完整输入（所有字段均填写）
  ├─ 废弃字段处理
  └─ 幂等性（多次执行产出相同结果）
```

### 10.2 链条测试

模拟多版本链条（v0 → v1 → v2 → v3）：

```
tests/migrations/chain.spec.ts
  ├─ v0 直升 v3（链条正向）
  ├─ 中断点：v1 失败时回滚到 v0
  ├─ 中断点：v2 失败时回滚到 v0（不停在 v1）
  └─ v1 起步直升 v3
```

### 10.3 Zod 校验测试

对每个 schema 版本：
- 合法样本 100 条
- 非法样本 50 条（缺字段 / 错类型 / 未知字段）
- 边界（极长字符串 / 嵌套层数极深）

### 10.4 UI E2E 测试

Playwright：
- 启动 App 模拟旧版 Settings → MigrationModal 出现 → 确认 → 成功
- 迁移中点击中断 → 回滚成功 + SafeMode 提示
- 迁移成功 → DeprecationBanner 出现 → dismiss 持久化
- 手动恢复回滚点 → Settings 回到旧值

### 10.5 性能测试

- 单次迁移 < 500ms（小 Settings）
- 链条迁移（v0 → v3，3 步）< 2s
- 回滚快照创建 < 100ms
- 诊断包导出 < 3s

### 10.6 回滚正确性测试

- 迁移后立即恢复回滚点 → Settings 应字段级别完全一致（sha256 匹配）
- 跨版本回滚（从 v3 回到 v0）→ 提示用户确认 + 警告

### 10.7 测试 Fixture 目录

```
tests/migrations/fixtures/
  settings/
    v0/
      minimal.json
      full.json
      corrupt.json
      legacy-mode-enabled.json
    v1/
      expected-from-v0-minimal.json
      expected-from-v0-full.json
```

---

## 11. 验收标准

### 11.1 功能验收

| ID | 验证项 | 方法 |
|---|---|---|
| M-A1 | 从 v2.0 Settings 升级到 v2.1 成功 | Playwright E2E |
| M-A2 | 迁移 Modal 显示正确的 diff | Playwright UI 快照 |
| M-A3 | 回滚点自动创建且可恢复 | 单测 + E2E |
| M-A4 | 废弃字段有 Banner 提示 | 单测 + Playwright |
| M-A5 | Zod 失败时进入安全模式 | E2E |
| M-A6 | 迁移失败不损坏原 Settings | 单测（模拟 throw） |
| M-A7 | 所有迁移事件写 activity_logs | 单测（读 IndexedDB） |
| M-A8 | 诊断包可导出且无正文泄漏 | 单测 |
| M-A9 | T07-12 C 重置前自动生成回滚点 | E2E |
| M-A10 | 多文件类型（settings / keybindings / theme）独立迁移 | 单测 + E2E |

### 11.2 文档验收

- 每次 App 版本发布附带**迁移 Changelog**（`prompts/0420/specs/migrations-changelog.md`，由每次迭代维护）
- Changelog 必须列出：
  - 版本号 from / to
  - 改动概要
  - 废弃字段 + 替代方案
  - 回滚说明

### 11.3 性能验收（对齐 27-performance-slo）

| ID | 指标 | 阈值 |
|---|---|---|
| M-P1 | 单迁移执行时间 | < 500ms |
| M-P2 | 链条迁移（3 步） | < 2s |
| M-P3 | MigrationModal 首次展示耗时 | < 200ms |
| M-P4 | 回滚快照创建耗时 | < 100ms |

### 11.4 可靠性验收

- 模拟 100 次随机中断 → 100% 回滚成功
- 模拟磁盘满 → 优雅报错 + 原文件未损坏
- 模拟并发（启动期多 Profile 同时迁移） → 互不干扰

### 11.5 UI / 设计验收

- MigrationModal 符合 09-ui-polish 设计语汇
- 仅使用 `lucide-vue-next` 图标（M-A11：grep 检查无 emoji）
- 中英文 i18n 完整（G-07 D）
- 所有高危按钮（"重置"、"恢复回滚点"）遵循 A-07 防呆（二次确认）

---

## 12. 权威来源登记表

| 本 Spec 章节 | 引用问卷题号 / 决策编号 | 说明 |
|---|---|---|
| §1 需求来源 | T07-10 D + 补充, T07-12 C + 补充, X-04 B, R-18 | 迁移四大触发场景 |
| §2 Schema 版本管理 | T07-10 D, X-04 B | 整数递增 + meta 文件 |
| §3 Migration 函数约定 | T07-10 D（"自动迁移"）, T07-10 D 补充（废弃提示） | apply + rollback + deprecations |
| §4 迁移触发时机 | X-04 B（显式迁移）, 23-sync-provider, 26-multi-account-profile | 启动 / 导入 / 同步 |
| §5 差异预览 UI | T07-10 D（"差异预览"） | MigrationModal + diff |
| §6 回滚点 | T07-10 D（"回滚点"）, T07-12 C + 补充 | rollback_snapshots |
| §7 废弃字段 | T07-10 D 补充（"新版废弃字段提示"） | DeprecationBanner |
| §8 Zod 集成 | A-14（G-01 C + G-02 C 基础设施） | Schema per version |
| §9 失败处理 | R-18 + G-13 D（错误四层） + R-16 | SafeMode + Audit + 诊断包 |
| §10 测试矩阵 | G-01 C + G-02 C + G-14 D + R-20 | Vitest + Playwright + Fixture |
| §11 验收标准 | X-12 D + R-20 + 27-performance-slo | 功能 / 文档 / 性能 / 可靠性 / UI |

---

## 附录 A：Settings 文件版本判定算法

```ts
function detectSchemaVersion(file: unknown): number {
  if (typeof file !== 'object' || file === null) throw new ParseFailureError();
  const meta = (file as any).__meta;
  if (meta?.schemaVersion != null) return meta.schemaVersion;
  // 兜底：若无 meta，视为 v0（v2.0 没有 meta 字段）
  return 0;
}
```

## 附录 B：Deprecation 长期清理

每版本 App 保留 `MIN_SUPPORTED_SETTINGS_SCHEMA_VERSION` 个版本的 `deprecations` 记录，超出部分清理（避免 pendingDeprecations 膨胀）。

## 附录 C：Extension Config Migration

每个扩展（25-extension-plugin）负责自己的 migration，但必须遵守本 Spec 的接口（`apply / rollback / deprecations`）。扩展 SDK 提供 `registerMigration(fileKind, migration)` API。

## 附录 D：Rollback 点导出 / 导入

用户可导出单个 rollback 点为 JSON 文件分发给其他账户。导入时走"手动导入 Rollback"入口 + Zod 校验 + 版本兼容性检查。

## 附录 E：与 DB Schema Migration 的关系

| 维度 | Settings Migration（本 Spec） | DB Schema Migration（17-crash-recovery / Part 3a） |
|---|---|---|
| 作用对象 | 配置文件 | IndexedDB schema |
| 触发 | Settings 变更 | DB 结构变更（new store / index） |
| 回滚 | 快照文件 | 单独的 DB 迁移脚本逆向 |
| UI | MigrationModal | 独立的 DBMigrationModal |
| 两者独立编排 | 是 | 启动期 DB migration 先跑 → 再跑 Settings migration |

---

## 文档状态

- 草案版本：v1（Phase 1 Batch A 产出）
- 冻结里程碑：Phase 2 启动前 Schema 定义冻结；Migration 函数按迭代新增，Spec 主体冻结不再调整
- 更新触发：新增 fileKind、新增 deprecation 类型、新增失败类型

## 2026-05-02 Baseline Implementation Note

Baseline status: Implemented as an in-app Settings migration baseline for the current Pinia/localStorage Settings store. The full future ImportWizard, packaged native rollback directory, multi-file theme/template migration UI, and long-running progress modal remain pending for their downstream specs.

Implemented coverage:

- Added `src/services/settings-migration/` with version detection, v0/v1/v2-to-current transforms, migration step metadata, deprecation records, semantic diff generation, summary helpers, and bounded rollback snapshot helpers.
- Integrated the migration engine into `useSettingsStore` without replacing existing export/import/reset APIs.
- `importSettings()` now previews unknown JSON, rejects parse/future/unsupported/invalid output failures, creates a rollback point before successful apply, normalizes through the existing Settings schema candidate builder, validates with Zod `safeParse`, updates `lastMigrationPreview`, and writes ActivityLogger evidence.
- Settings About now displays current schema, rollback snapshot count, the latest migration preview summary, deprecated paths, a bounded diff excerpt, and a restore-latest rollback action using real store state.
- Existing full, tab, shortcut, and manual reset rollback behavior is preserved and continues to retain at most 10 snapshots.

Validation evidence:

- `pnpm exec vitest run src/services/settings-migration/settings-migration.test.ts`: 1 file, 6 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 21 files, 150 tests passed.
- `pnpm build`: passed with existing Vite dynamic/static import and large chunk warnings.
- Browser smoke on `http://127.0.0.1:3005/settings?tab=about`: Settings migration section rendered current schema and rollback state; after clearing initial Vite HMR websocket noise, console error count stayed 0.
- Code BOM scan and emoji glyph scan passed for touched Settings migration code/UI files.

MCP note: Serena, GitNexus, ABCoder, and DeepWiki were attempted in this continuation but returned `Transport closed`, so this implementation records the attempted-but-unavailable state and relies on the real local validation matrix above instead of claiming graph impact analysis passed.
