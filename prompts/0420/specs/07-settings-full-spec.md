# 07 - Settings 全量实装规范

> 文档类型: Spec
> 阶段: Phase 3（UI 外壳）+ Phase 4（数据）+ Phase 5（同步）
> 依赖: 20-theme-font-typography-spec, 23-sync-provider-spec, 24-permission-audit-spec, 25-extension-plugin-spec, 29-data-integrity-spec, 33-diagnostic-logging-spec, 41-settings-migration-spec, 06-spec-account-auth
> 来源问卷题号: T07-01 ~ T07-12, L1-20, L1-23, L1-34, L1-37, L1-38, L1-57 ~ L1-60, L1-56, EX-07
> 权威来源: 本 Spec 各条目在"权威来源表"章节逐条标记
> 创建日期: 2026-04-20
> 最后更新: 2026-04-29

---

## 一、背景与目标

### 1.1 背景

0327 版 `07-settings-full-spec.md` 已经给出了 6 个 Tab 的初步骨架，但远不够：AI Tab 真实接入、Sync Tab 真实落地（Git / WebDAV / 自有服务）、Data Tab 的 IndexedDB Inspector 和自动备份、Advanced Tab 的自定义 CSS/JS + 性能监控 + 网络诊断、Settings 全局搜索、同义词索引、作用域分层、危险项守门、迁移引擎带回滚、三级重置粒度、扩展 SDK 接入。

### 1.2 本 Spec 目标

1. 搭建 **SettingsRegistry** 作为所有设置项的单一注册中心，负责：元数据、默认值、作用域、迁移、重置、搜索索引。
2. 实现 **全局搜索** + 同义词/快捷键名/别名，跨 Tab 跳转 + 高亮 + 上下一个匹配。
3. **即时持久化**（无防抖），但写入通过 transaction + schema version。
4. **作用域分层**：账户级为主（跟随账户导出 / 同步）+ 设备级少量。
5. **Sync Tab** 落地 **Git 主路径** + WebDAV + 自有服务（三 Provider 接口 ready，Git 为主实现）。
6. **Data Tab** 提供导出 / 导入 / 清除 / 统计 / 自动备份 / IndexedDB Inspector。
7. **Advanced Tab** 启用开发者模式 / 日志级别 / 缓存清理 / DB 重置 / 自定义 CSS / 自定义 JS / 性能监控 / 网络诊断。
8. **迁移引擎**：schema version + 差异预览 + 回滚点 + 废弃项提示。
9. **重置三级粒度**：单项 / Tab / 全量；每次重置都生成回滚点。
10. **扩展 SDK 管理面板**：安装 / 卸载 / 权限审查（v2.1 无在线市场，仅本地加载）。
11. **ThemeEngine + FontSystem + Typography 面板**：完整 UI 控制所有视觉参数（细节在 20-theme-font-typography）。
12. **危险项保护**：开发者/高级模式开关。
13. **设置随账户导出**（不单独导出 JSON）。

### 1.3 产品铁律映射

| 铁律 | 落地条款 |
|------|---------|
| 铁律 7（自动保存失败用户可见） | §4 即时持久化失败必须可见 |
| 铁律 8（Sync 必须真实落地） | §12 Sync Tab |
| 铁律 9（冲突由用户解决） | §12 Sync 冲突 UI |
| 铁律 14（三端渲染一致） | §15 CSS 注入不能破坏核心渲染 |
| 铁律 15（性能 SLO） | §2 搜索 ≤ 80ms |

---

## 二、范围与边界

### 2.1 本轮进入 scope

- Settings 信息架构（§1）
- 全局搜索栏 + 同义词（§2）
- SettingsRegistry 中枢（§3）
- 持久化与 schema 版本化（§4）
- 迁移引擎（§5）
- 重置三级粒度（§6）
- 作用域分层（§7）
- Appearance Tab（§8）
- Editor Tab（§9）
- Shortcuts Tab（§10，引用 03）
- AI Tab 占位（§11）
- Sync Tab（§12，Git 主路径 + WebDAV + 自有服务接口）
- Data Tab（§13）
- Advanced Tab + 开发者模式（§14）
- 自定义 CSS / 自定义 JS（§15）
- 危险项保护矩阵（§16）
- 扩展管理 UI（§17）
- Writing（§18：目标 / 氛围）
- Security（§19：账户安全面板跳转 + 本地锁）

### 2.2 不进入

- AI 真实 Provider（T07-01 A 占位）
- 插件在线市场（v2.2+）
- 设置 JSON 单独导出 / 分享链接（T07-07 B）
- 主题市场 / 主题分享（v2.2+）

### 2.3 延后

- 网络诊断的深度检测（基础 ping / DNS / latency 本轮；抓包级诊断推后）
- Sync Provider 冲突三方合并 UI 的复杂 merge 算法（本轮简化：提供双栏 diff + 用户选）

---

## 三、详细规范 / 需求条目

## §1 Settings 信息架构

### 1.1 Tab 层级

```
Settings (模态或独立路由 /settings)
├── Search Bar (top, sticky)
│
├── Appearance             ← Theme / Font / Typography / 动画 / 密度 / Focus
├── Editor                 ← Typora / Source / 智能标点 / 拖拽 / 列表 Enter
├── Writing                ← 目标 / 氛围 / StatusBar 字段
├── Shortcuts              ← Keybindings
├── AI                     ← Provider 占位
├── Sync                   ← Git / WebDAV / 自有服务
├── Data                   ← Export / Import / Backup / Stats / IndexedDB Inspector
├── Extensions             ← 安装的扩展
├── Security               ← 密码 / Windows Hello / 高危清单（跳 AccountWelcome）
├── Advanced               ← 开发者模式 / CSS / JS / 性能 / 网络
└── About                  ← 版本 / 更新 / 开源信息
```

### 1.2 视觉

- 左侧 Tab 导航，右侧内容；右侧支持 deeplink 锚点
- 顶部固定 Search Bar + 搜索结果面板
- Tab 右上角 "Reset Tab"（§6）

### 1.3 入口

- Hub 头像气泡菜单 > Preferences
- 快捷键 Ctrl+,
- 命令面板 `system.openSettings`
- deeplink: `inkforge://settings/<tab>/<anchor>`（v2.2+ 兼容）

---

## §2 全局搜索栏 + 同义词索引（T07-05 B + T07-11 C + 补充）

### 2.1 搜索输入

- Ctrl+F 在 Settings 内聚焦搜索框
- 实时过滤 + 高亮匹配

### 2.2 索引字段

每个 Setting 项在 SettingsRegistry 提供：

```ts
interface SettingDefinition {
  id: SettingId                // 'editor.fontSize'
  path: string                 // 'Appearance > Typography > Font Size'
  tab: TabId
  anchor: string               // 'typography-font-size'
  label: string
  description?: string
  keywords: string[]           // ['字号', 'font size', 'text size']
  aliases: string[]            // 别名
  shortcutNames?: string[]     // 关联的快捷键名（若任何 shortcut 使用该设置）
  scope: 'device' | 'account'
  type: 'boolean' | 'number' | 'string' | 'enum' | 'color' | 'object'
  defaultValue: unknown
  enumOptions?: { value; label; description? }[]
  validate?: (v) => boolean | string
  migrate?: Record<number, (old) => unknown>  // schema version → transform
  deprecatedIn?: number        // 标记废弃版本
  deprecatedMessage?: string
  risk?: 'safe' | 'medium' | 'high' | 'data-risk'
  visibleWhen?: () => boolean  // 例：高级项需开发者模式
}
```

### 2.3 搜索算法

- 与命令注册表搜索同源（Fuse.js + 同义词匹配）
- 匹配字段：`label`, `path`, `keywords`, `aliases`, `shortcutNames`
- threshold: `0.35`
- 性能：≤ 80ms 返回

### 2.4 搜索结果 UI

- 结果列表分组：按 Tab
- 点击条目 → 自动切到对应 Tab + 滚动到 anchor + 高亮该设置项 2s
- 键盘导航：上下箭头 + Enter；Ctrl+G / F3 下一个匹配；Shift+Ctrl+G / Shift+F3 上一个

### 2.5 稳定锚点

- 每个 Setting 项渲染时带 `data-setting-id` 属性
- 滚动定位使用 `scrollIntoView({ block: 'center' })`
- v2.2+ 外部文档链接可用 `inkforge://settings/editor/editor-font-size`

---

## §3 设置注册中心（SettingsRegistry）

### 3.1 API

```ts
class SettingsRegistry {
  register(def: SettingDefinition): void
  get(id: SettingId): SettingDefinition | undefined
  list(filter?: { tab?; scope?; includeHidden? }): SettingDefinition[]
  search(query: string): SettingSearchResult[]

  value<T>(id: SettingId, accountId?: AccountId): T
  setValue(id: SettingId, value: unknown, accountId?: AccountId): Promise<void>
  reset(id: SettingId, accountId?: AccountId): Promise<void>
  resetTab(tab: TabId, accountId?: AccountId): Promise<void>
  resetAll(accountId?: AccountId): Promise<void>
}
```

### 3.2 注册时机

- 启动时集中注册所有内置项（`src/settings-registry/builtins/*.ts`）
- 插件注册追加项（`plugin.registerSettings(registry)`）

### 3.3 校验

- `setValue` 内部调用 `validate`；失败抛 `SettingValidationError` + Toast
- 类型不匹配（如给 number 传 string）→ 自动 cast 尝试；失败拒绝写入

### 3.4 读取优先级

```
plugin override (runtime)   ← 最高（插件可临时覆盖）
account-scope stored value
device-scope stored value
default value               ← 最低
```

---

## §4 持久化与 schema 版本化（T07-06 A）

### 4.1 即时持久化

- `setValue()` 同步写入对应 Store（Pinia）+ 异步写入持久层
- 持久层：
  - 账户级 → IndexedDB `settings` 表（归属当前活跃账户的 DB）
  - 设备级 → `meta/device-settings.json`（Tauri fs）
- 写入失败 → Toast（数据风险级别，G-13 D）

### 4.2 Schema 版本

- 全局 `schemaVersion` 字段记录当前 Settings Schema 版本
- 每次发版若 schema 变更 → 版本号 +1 + 提供 migrate 函数

### 4.3 单写者

- 同一账户多窗口 → 通过 BroadcastChannel 同步变更事件（06-spec §7.3）
- 写入冲突（并发）→ 以最后写入为准，其他窗口 toast "setting updated from another window"

---

## §5 迁移引擎 + 差异预览 + 回滚（T07-10 D + 补充）

### 5.1 触发时机

- 启动时检测 `storedSchemaVersion < currentSchemaVersion` → 进入迁移流程
- 导入账户备份时若备份 schema 更低 → 同样触发

### 5.2 流程

```
Detect version mismatch
        │
        ▼
  Compute affected keys (deprecated / changed / newly required)
        │
        ▼
  Build DiffPreview
  ┌─────────────────────────────────────────────┐
  │  Migration Preview                          │
  │  From schema v7 to v9                       │
  │                                             │
  │  Changed:                                   │
  │    editor.fontSize    16px → 17px (new default)│
  │  Added:                                     │
  │    writing.dailyGoal  (default 1000)        │
  │  Deprecated:                                │
  │    editor.paperWidth  → editor.paper.width  │
  │                                             │
  │  [Show JSON diff]                           │
  │                                             │
  │  [Proceed]  [Cancel]                        │
  └─────────────────────────────────────────────┘
        │
        ▼
  Create RollbackSnapshot → snapshots/<ts>-settings-v<old>.json
        │
        ▼
  Apply migrations in order (v7→v8, v8→v9)
        │
        ▼
  Verify & Toast "Settings migrated successfully (click to undo)"
```

### 5.3 回滚

- 快照保留 30 天或最近 5 个；超出 FIFO 清理
- "Undo"动作直接还原文件 + reload
- 回滚失败 → 安全模式 + 紧急导出

### 5.4 废弃项提示

- `deprecatedIn` 标记的项在 Settings UI 中带 "Deprecated" 徽标
- 设置面板顶部 Banner："You have 3 deprecated settings. [Review]"

---

## §6 重置三级粒度 + 回滚点（T07-12 C + 补充）

### 6.1 粒度

| 操作 | 入口 | 回滚点 | 确认 |
|------|------|-------|-----|
| 单项重置 | 每个 Setting 右侧 "↺" | 是 | 无（显眼 Toast） |
| Tab 重置 | Tab 右上角 "Reset Tab" | 是 | 二次确认 |
| 全量重置 | Advanced 底部 "Reset All Settings" | 是 | 二次确认 + 输入 "RESET" |

### 6.2 回滚点

- 每次重置前保存当前 state 到 `snapshots/<ts>-reset-<scope>.json`
- "Reset preview"可勾选"保留主题"/"保留快捷键"等豁免项

### 6.3 影响项清单

- 所有重置前展示"将受影响的 N 项"列表
- 用户可在列表中取消勾选某些项（即不重置它）

### 6.4 立即持久化

- 重置完成立即落盘（与 §4 一致）

---

## §7 作用域分层（Device / Account）（T07-08 C）

### 7.1 分层原则

| 类型 | 示例 | 存储位置 |
|------|------|---------|
| **Account-scope**（多账户随行） | Editor 字体 / Typography / Writing Goal / AI Config（除密钥） / Smart Folders / 快捷键自定义 | IndexedDB `settings` 表 |
| **Device-scope**（机器相关） | 窗口尺寸 / 最近打开的 Profile / 高级模式开关 / Hardware accel / Language（系统级） | `meta/device-settings.json` |
| **Shared**（跨账户共享） | 模板库 / 导出预设 / AI 配置（共享区，§17 / 06-spec §12） | `shared/` |

### 7.2 覆盖规则

- 同名设置存在于多个作用域时：**Account > Device**
- 在 Settings UI 中每个项带作用域徽标（"per-account" / "per-device"）

### 7.3 迁移旧版（0327 统一 localStorage）

- v2.0 的所有 settings 默认按 account-scope 迁移（每账户独立副本）
- 设备级项手动挪到 device-settings.json

---

## §8 Appearance Tab

### 8.1 Theme 子段

- **Mode**：Auto（跟随系统）/ Light / Dark
- **App UI Theme**：预设 + 自定义（引用 20-theme-font-typography）
- **Editor Content Theme**：独立轨（Ethereal Day / Ethereal Night / iA Classic）
- **Custom Theme Editor**：完整 CSS 变量编辑器
- **Import/Export Theme**：.inkforge-theme.json

### 8.2 Font 子段（引用 L1-57 D + FontSystem Spec）

- 内置开源字体列表（黑体 / 宋体 / 圆体 / 手写 / 衬线 / 无衬线 / 等宽）
- **自定义字体导入**：.ttf / .otf / .woff / .woff2，许可证提示
- **中英文独立配置**：主字体 + fallback chain

### 8.3 Typography 子段（L1-60 D）

- 字号 / 行距 / 段间距 / 缩进 / 字间距
- 标题层级样式（H1~H6 各自可调）
- 引用 / 代码样式
- 预览区实时显示效果

### 8.4 Animation 子段（T09-09 D）

- Level: Full / Standard / Minimal / None
- 类别细分：页面切换 / 悬停 / 编辑显隐 / 图表
- "Auto Reduce on Low Performance" 开关（默认开）

### 8.5 Density 子段（T09-10 B）

- Global Density: Comfortable / Standard / Compact
- 注：Hub/Workstation/Settings 有差异化预设，此处为全局覆盖

### 8.6 Focus 子段

- Focus Mode 快捷键
- 段落淡化强度
- 打字机模式独立开关

---

## §9 Editor Tab

### 9.1 Typora Mode

- Default mode: Typora / Source / Preview
- Smart Punctuation 总开关 + 细分规则矩阵（E-02 D）
- 中英文空格（pangu）开关
- 列表 Enter 行为: 减少缩进 vs 退出列表（E-01 B 默认）

### 9.2 Block

- 代码块默认语言
- 图片双击进入编辑（T01-10 C）
- 表格 Tab 导航开关
- 拖拽排序块（E-03 D）开关

### 9.3 Paste / Clipboard

- HTML 粘贴策略：Plain Text / Preserve Structure / Raw HTML（T01-17 A 默认 Plain）
- 自动本地化远程图片（§15 AssetPipeline 联动）

### 9.4 Word Count 口径

- 口径：纯文本（默认，T08-07 D）/ 含标题 / 含全部
- "含全部"和字数目标显示同步（§18）

### 9.5 Undo

- Grouping：逻辑操作分组（E-10 B 默认）
- 新组间隔时间（ms）

---

## §10 Shortcuts Tab（引用 03-spec）

### 10.1 入口

- 列出所有已注册命令 + 当前快捷键
- 按域分组（edit / system / ai / publish）
- 搜索框支持命令名 / 快捷键键位

### 10.2 操作

- Record（录制）：点击 → 按键 → 保存
- 冲突警告但允许覆盖（T03-04 A）
- Reset Single / Reset Tab / Reset All

### 10.3 Chord（T03-10 D）

- 支持录制多段组合（"Ctrl+K Ctrl+S"）
- ChordHintOverlay 显示当前已按下的序列（03-spec）

---

## §11 AI Tab（T07-01 A 占位）

### 11.1 展示

- 顶部 Banner："AI features will be available in a future release."
- 列出占位字段：
  - Default Provider（disabled dropdown: OpenAI / Anthropic / Ollama / Custom）
  - API Key input（disabled）
  - Model Name（disabled）
  - Temperature（disabled）
- "Enable Mock Provider for Testing"（默认关；用于 E2E 测试）

### 11.2 Mock Provider

- 开启后 ai.* 命令走 mock（05-spec §17.5）
- 不发送任何网络请求

### 11.3 AI Config 共享（L1-23 D 补充）

- "Share AI config across profiles" 开关（默认关）
- 共享范围：不含密钥（密钥始终账户独立）

---

## §12 Sync Tab（Git 主路径 + WebDAV + 自有服务，L1-20 D）

### 12.1 Provider 选择

```
┌─────────────────────────────────────────────┐
│ Sync Provider                               │
│ ┌─────────────────────────────────────────┐ │
│ │ (●) Git (Recommended)                   │ │
│ │ ( ) WebDAV                              │ │
│ │ ( ) Custom Backend (Beta)               │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 12.2 Git Provider（T07-02 D，主路径）

- 配置：
  - Repository URL（SSH / HTTPS）
  - Credentials：SSH Key path / HTTPS token
  - Branch（默认 `main`）
  - Commit identity（name + email）
  - Auto-sync interval（5min / 15min / manual）
- 使用 Tauri + libgit2（`git2` rust crate）或 isomorphic-git
- 目录：`profiles/<accountId>/articles/` 作为仓库根

### 12.3 Git Sync 流程

```
Auto-sync tick (every N min)
        │
        ▼
  Stage all changes in articles/
        │
        ▼
  Commit with message "InkForge autosync <ts>"
        │
        ▼
  Pull --rebase
        │
        ├─ Clean rebase → Push
        └─ Conflict → 写入 SyncConflicts 表 → Toast + 打开冲突 UI
```

### 12.4 冲突 UI（L1-22 D + 补充）

- 冲突文件列表（articles/ 下的 .md）
- 点击 → 打开双栏 diff
  - 左：本地版本
  - 右：远端版本
  - 按行选择保留 / 替换 / 合并
- 用户保存 → 本地写入 + 标记 conflict resolved
- 所有解决事件写审计

### 12.5 WebDAV Provider（L1-20 D 副路径）

- 上传 `.inkforge-profile.zip` 到 WebDAV 路径（定期全量，简化）
- 下载覆盖冲突时 → 弹确认
- v2.1 最小可用

### 12.6 Custom Backend（MVP）

- REST endpoint 接口规范（POST /sync/upload, GET /sync/download, POST /sync/conflict-resolve）
- UI 配置 base URL + token
- v2.1 只提供接口 + mock 实现作为骨架

### 12.7 冲突检测 SLO

- 冲突检测 ≤ 10s（L1-36 C）
- 超时进入 Offline 模式 + banner

---

## §13 Data Tab（T07-03 B + C）

### 13.1 Export

- **Export Current Profile**：打包为 `.inkforge-profile.zip`，包含：
  - `profile.json`
  - `db.json`（IndexedDB 内容）
  - `articles/`（Markdown 镜像）
  - `assets/`
  - `settings.json`（T07-07 B：设置随账户）
- **Export Single Article**：MD / HTML / Zhihu / 微信 / 小红书（走 PublishAdapter）

### 13.2 Import

- 支持 `.inkforge-profile.zip` / 子选项（单文章 .md / .docx）
- 走 ImportWizard（12-file-manager-spec）

### 13.3 Clear

- **Clear cache**：清编译缓存 / 临时图片（低风险）
- **Clear current profile data**（高危）：清空文章 / 版本 / 日志，保留 profile metadata
- **Full reset**：走 Advanced DB Reset（§14）

### 13.4 Stats

- Storage Breakdown:
  - Articles (active / archived / trashed)
  - Assets (total / orphan)
  - Versions
  - Logs
  - Cache
- 与 08-spec Data Insights 共享数据源

### 13.5 Auto Backup（T07-03 B）

- 开关 + 频率（每 6h / 每天 / 每周）
- 目录：`profiles/<accountId>/backups/<ts>.inkforge-profile.zip`
- 保留策略：最近 N 个（默认 7 个）或按时间（默认 30 天）

### 13.6 IndexedDB Inspector（T07-03 C）

- 启用需开发者模式
- 只读界面展示每个 table 的 schema 和前 100 行
- 支持导出单 table 为 CSV / JSON
- 不允许直接编辑（太危险）

---

## §14 Advanced Tab + 开发者模式（T07-04 B + C）

### 14.1 Developer Mode Toggle

- 顶部开关："Enable Developer Mode"
- 开启后展示危险项（DB Reset / Custom JS / Inspector）

### 14.2 Developer Tools

- **Log Level**：Trace / Debug / Info / Warn / Error
- **Open Log Folder**
- **Export Diagnostic Package**（R-02 D）
- **Cache Cleanup**：旧版本 snapshot / 孤儿缓存
- **Database Reset**（高危，requiresReauth + "RESET" 输入）

### 14.3 Performance Monitor

- 打开子面板（DevPanel, R-03 D）
- 实时图表：FPS / 输入延迟 / 保存耗时 / 内存
- 可导出 10min 性能 trace

### 14.4 Network Diagnostic

- 基础项：ping sync endpoint / DNS lookup / latency
- 显示最近 N 条网络请求（ExtensionSDK 里允许扩展可见的）
- 不做深度抓包

### 14.5 Custom CSS（§15）

### 14.6 Custom JS（§15）

### 14.7 Experiments（feature flags）

- 实验性功能开关列表（每个功能可在此关闭）

---

## §15 自定义 CSS / 自定义 JS（EX-07 + L1-37 D）

### 15.1 Custom CSS

- 编辑器：Monaco（或 CodeMirror CSS 语法）
- 作用域选择：
  - All App
  - Editor Content Only
  - Preview Only
  - Settings Only（不推荐）
- Live preview 即时生效
- 错误警告（parse error 行高亮）
- 保存 → 写入 `settings.customCss`（账户级）

### 15.2 Custom JS（L1-37 D + L1-38 C）

- 更严格：
  - **沙箱执行**：`<iframe sandbox>` 隔离，限制 DOM 访问范围
  - **权限声明**：用户保存前必须勾选它能访问的能力（文档读取 / 文档写入 / 资产访问 / 发布 / 等）
  - **只能在 Developer Mode 下启用**
  - 开启前警告："Custom JS can break your app. Proceed with caution."
- 错误处理：失败时自动禁用该脚本 + Toast

### 15.3 不破坏核心渲染

- Custom CSS 不能覆盖关键渲染类（编辑器 ProseMirror 核心 class 加 `!important` 锁定）
- 每次启动验证关键类是否被覆盖 → 通过 ComputedStyle 比对兜底

---

## §16 危险项保护矩阵（T07-09 C）

### 16.1 保护等级

| 项 | 保护策略 |
|----|---------|
| DB Reset | 开发者模式 + 高危二次认证 + 输入 "RESET" + 自动导出当前数据 |
| Purge Trash | 高危二次认证 |
| Disable Auto Backup | 警告 Toast（不阻止） |
| Custom JS | 开发者模式 + 权限声明 |
| Import Profile Overwrite | 提醒备份当前 + 二次确认 |
| Share AI Config | 警告（不含密钥）+ 确认 |

### 16.2 Banner 警示

- 开发者模式开启时，Settings 顶部显示橙色 Banner："Developer Mode is ON. Some risky settings are unlocked."

---

## §17 扩展管理 UI（L1-37 D + L1-38 C）

### 17.1 安装

- 本地 `.inkforge-plugin.zip` 导入
- 解压到 `profiles/<accountId>/extensions/<pluginId>/`（或 shared/extensions 共享）
- 读取 `plugin.json` 清单（权限声明）
- 用户审批清单 → 启用

### 17.2 管理

- 列表：plugin 名 / 版本 / 权限徽标 / 启用开关
- 右侧面板：
  - README
  - 权限详情
  - 审计日志（该插件执行过的命令）
  - "Disable" / "Uninstall" 按钮

### 17.3 沙箱 & 权限

- 由 25-extension-plugin-spec 定义细节
- 本 Spec 仅提供 UI 入口

---

## §18 Writing Tab

### 18.1 Goals

- Daily word goal
- Weekly word goal
- 单文档目标开关（全局默认）
- 完成动画开关
- 完成奖励（徽章显示）

### 18.2 Ambience（L1-49 B+C）

- "Quiet UI" 开关（与 Focus Mode 独立）
- Writing Mode Theme 选择（引用 §8.1 Editor Content Theme）
- 环境音 / 番茄钟：**不做**（L1-49 未选 D）

### 18.3 StatusBar

- 字段开关矩阵（字数 / 字符数 / 段落 / 阅读时长 / 纸张宽度 / 目标进度 / 选中统计 / 模式 / 保存状态）
- Global Hide 开关
- 显示字数口径选择器

### 18.4 Session Summary

- 退出 Focus Mode 时是否显示 Summary
- Summary 内容项选择（字数增量 / 时长 / 目标变化）

---

## §19 Security Tab

- 跳转 AccountWelcome 的 Security 区（§06-spec §2）
- 额外展示：
  - Lock now 按钮（清 SessionKey）
  - Cache reauth for 5 min 开关
  - "View high-risk actions" 清单（可视化）

---

## §20 About Tab

- 版本号 / Build Hash / Tauri / Node / Rust 版本
- 开源许可列表
- 更新检查（L1-56 B）：Check for Updates 按钮
- "What's New" 链接本地 Markdown 日志
- 反馈入口 + 诊断包导出

---

## 四、数据模型变更

```ts
// IndexedDB: settings 表
interface SettingsEntry {
  id: SettingId                 // primary key
  value: unknown
  scope: 'account' | 'device'   // 冗余字段便于过滤
  updatedAt: number
  schemaVersion: number
}

// meta/device-settings.json
interface DeviceSettings {
  schemaVersion: number
  values: Record<SettingId, unknown>
}

// Migration snapshots
// profiles/<accountId>/snapshots/<ts>-settings-v<old>.json
interface SettingsSnapshot {
  ts: number
  reason: 'migration' | 'reset-item' | 'reset-tab' | 'reset-all' | 'user'
  fromVersion: number
  toVersion?: number
  changedKeys: SettingId[]
  values: Record<SettingId, unknown>
}
```

---

## 五、接口与落地目录

```
src/
├── services/
│   ├── settings-registry/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── builtins/
│   │   │   ├── appearance.ts
│   │   │   ├── editor.ts
│   │   │   ├── writing.ts
│   │   │   ├── shortcuts.ts
│   │   │   ├── ai.ts
│   │   │   ├── sync.ts
│   │   │   ├── data.ts
│   │   │   ├── extensions.ts
│   │   │   ├── security.ts
│   │   │   └── advanced.ts
│   │   └── persist.ts
│   ├── settings-migration/
│   │   ├── migrator.ts
│   │   ├── schema-differ.ts
│   │   └── rollback-snapshot.ts
│   ├── git-sync/
│   │   ├── provider.ts
│   │   ├── commit.ts
│   │   ├── pull-rebase.ts
│   │   └── conflict-resolver.ts
│   ├── webdav-sync/
│   │   └── provider.ts
│   ├── custom-backend-sync/
│   │   └── provider.ts
│   └── auto-backup/
│       └── scheduler.ts
├── stores/
│   ├── settings.ts
│   └── device-settings.ts
├── views/
│   ├── SettingsView.vue
│   └── settings/
│       ├── AppearanceTab.vue
│       ├── EditorTab.vue
│       ├── WritingTab.vue
│       ├── ShortcutsTab.vue
│       ├── AITab.vue
│       ├── SyncTab.vue
│       ├── DataTab.vue
│       ├── ExtensionsTab.vue
│       ├── SecurityTab.vue
│       ├── AdvancedTab.vue
│       └── AboutTab.vue
├── components/
│   ├── settings/
│   │   ├── SettingsSearchBar.vue
│   │   ├── SettingsSearchResults.vue
│   │   ├── SettingItem.vue
│   │   ├── SettingResetButton.vue
│   │   ├── MigrationPreviewDialog.vue
│   │   ├── ResetTabDialog.vue
│   │   └── DangerousSettingGuard.vue
│   └── dev/
│       ├── IndexedDBInspector.vue
│       ├── PerformanceMonitor.vue
│       └── NetworkDiagnostic.vue
└── workers/
    └── settings-search.worker.ts
```

---

## 六、关键流程时序

### 6.1 修改一项即时持久化

```
User toggles setting
        │ watchers emit
        ▼
  SettingsStore.set(id, val)
        │ optimistic reactive update
        ▼
  Persist to IndexedDB (account) or fs (device)
        │
        ├─ OK   → noop
        └─ Fail → Toast (data-risk) + retry queue + open detail
        │
        ▼
  BroadcastChannel.emit('settings-changed', { id, val })
```

### 6.2 迁移 + 回滚

```
Boot → Detect v7 → v9
     → Show MigrationPreviewDialog
     → User clicks Proceed
     → RollbackSnapshot save
     → Apply v7→v8, v8→v9
     → Verify OK → Settings ready
        │
        └─ User clicks "Undo" in toast
           → Restore snapshot → reload
```

---

## 七、验收矩阵

### 正向样本

1. Ctrl+, 打开 Settings → Ctrl+F 搜"字号" → 自动切到 Appearance Tab → 高亮 fontSize
2. 修改 fontSize → 编辑器立即 reflect → 关闭重开仍保留
3. Git Sync 配置 repo URL + SSH key → autosync 成功 commit + push
4. Git Sync 冲突 → 打开双栏 diff → 用户选择保留本地 → 合并成功
5. 全量重置 → 输入 "RESET" + Platform Auth → 重置成功 + 生成回滚点
6. 回滚点 30 天内 → 一键 Undo → 所有设置恢复
7. 开启 Developer Mode → Advanced 区域出现 DB Reset + Custom JS
8. Custom CSS 写 `body { font-family: "Custom" }` → 编辑器字体立刻变化
9. Import Profile `.zip` → 正确恢复所有设置 + 文章 + 资产
10. 多账户共享 AI 配置开关打开 → 切换账户后配置沿用（密钥仍独立）

### 失败样本

11. 设置值超出 validate 范围 → 拒绝写入 + Toast 解释
12. Git push 网络错误 → Toast + 重试 + 保留本地 commit
13. Custom JS 沙箱抛异常 → 自动禁用 + Toast
14. Migration 失败 → 自动回滚 + 进入 SafeMode
15. Auto Backup 磁盘空间不足 → Toast（数据风险） + 暂停备份

### 恢复样本

16. 迁移过程中断电 → 下次启动检查 → 自动回滚到 snapshot
17. 误删 Custom CSS → 从 rollback snapshot 还原
18. Git 仓库 corrupted → 进入只读模式 + 引导重新克隆

### 边界样本

19. 搜索查询 200 字符 → 截断 + 警告
20. 同一设置被多个窗口同时修改 → 最后写入 + Broadcast 通知
21. 设置项被插件额外覆盖 → UI 显示"overridden by Plugin X"徽标
22. 导入包 schemaVersion < current → 触发 Migration
23. Settings Registry 注册冲突 id → 启动报错
24. 打开 Inspector 查看 table > 100 行 → 自动分页 + 限流

---

## 八、权威来源表

| 条目 | 权威来源 | 注释 |
|------|---------|------|
| AI Tab 占位 | 文档（T07-01 A） | 沿用 |
| Sync Git 主路径 | 文档（T07-02 D） | 新增 |
| WebDAV + 自有服务 | 文档（L1-20 D） | 新增 |
| Data Tab 全集 | 文档（T07-03 B+C） | 升级 |
| Advanced Tab 全集 | 文档（T07-04 B+C） | 升级 |
| 全局搜索 | 文档（T07-05 B + T07-11 C + 补充） | 新增 |
| 即时持久化 | 文档（T07-06 A） | 沿用 |
| 设置不独立导出 | 文档（T07-07 B） | 新增 |
| 作用域分层 | 文档（T07-08 C） | 新增 |
| 危险项保护 | 文档（T07-09 C） | 新增 |
| 迁移完整四件套 | 文档（T07-10 D + 补充） | 新增 |
| 重置三级粒度 | 文档（T07-12 C + 补充） | 新增 |
| 扩展 SDK | 文档（L1-37 D + L1-38 C） | 新增 |
| 字体 / 主题 / Typography | 文档（L1-57/58/59/60 D） | 新增 |
| 自定义 CSS 注入 | 文档（EX-07） | 新增 |
| 自定义 JS 沙箱 | 文档（L1-37 D + L1-38 C） | 新增 |
| 更新仅通知 | 文档（L1-56 B） | 沿用 |
| 90 天审计 | 文档（L1-34 补充） | 新增 |

---

## 九、与其他 Spec 的依赖关系

- **03-spec-keyboard-shortcuts**: Shortcuts Tab 的快捷键录制 UI
- **05-spec-toolbar-contextmenu-slash**: Settings 命令注册（system.openSettings 等）
- **06-spec-account-auth**: 账户 Security 面板、Autosave 预检、高危二次认证
- **08-spec-insights-charts**: Data Tab Stats 复用 metrics
- **11-document-lifecycle-spec**: Archive 不计统计
- **17-crash-recovery-spec**: SafeMode 入口
- **20-theme-font-typography**: Appearance Tab 深度依赖
- **22-command-palette-spec**: 命令面板调用设置搜索
- **23-sync-provider-spec**: Sync Tab Provider 接口
- **24-permission-audit-spec**: 审计查询面板 + 90 天保留
- **25-extension-plugin-spec**: Extensions Tab
- **29-data-integrity-spec**: 启动校验 Settings schema
- **33-diagnostic-logging-spec**: 日志级别 / 诊断包
- **41-settings-migration-spec**: 本 Spec §5 的独立子文档

---

## 十、性能与降级

| 指标 | 目标 | 降级 |
|------|------|------|
| 打开 Settings | ≤ 500ms | Skeleton（不违反 T09-11 A，用文字占位） |
| 搜索 | ≤ 80ms | Worker 索引 |
| 切 Tab | ≤ 100ms | 懒加载 Tab 内容 |
| 设置写盘（小对象） | ≤ 50ms | 异步 queue |
| 全量导出 1GB | ≤ 60s | 进度条 + 后台 zip |
| Git autosync 一次 | ≤ 10s | 进度 + 超时降级 offline |
| IndexedDB Inspector 查询 | ≤ 200ms | 分页 |

---

## 十一、风险与缓解

| 风险 | 级别 | 缓解 |
|------|------|------|
| 迁移失败导致设置全丢 | **高** | 强制回滚点 + SafeMode + 手动导入备份 |
| Git 同步冲突复杂 | 高 | 双栏 diff + 最终用户决策 + 审计 |
| Custom JS 越权 / 破坏应用 | 高 | 沙箱 + 权限声明 + 开发者模式门槛 |
| 全局搜索命中过多 | 中 | threshold + 同义词辅助 + 限 50 条 |
| 多窗口并发写同一设置 | 中 | BroadcastChannel + 最后写入 + 用户反馈 |
| 插件注册冲突 | 中 | 冲突只禁涉事插件 |
| WebDAV 大文件超时 | 中 | 分片 + 断点续传（v2.2 优化，本轮简单全量） |

---

（完）

---

## 2026-04-29 Implementation Ledger

Current implementation status for this spec slice:

- The current product implementation intentionally preserves the existing seven-tab Settings information architecture instead of introducing the broader future eleven-tab layout from this planning spec. Sync, Extensions, and Security remain related future surfaces or folded capabilities where the current product already has a real integration point.
- SettingsRegistry is implemented in the Settings store and is consumed by SettingsView for global search, aliases, tab routing, anchor scrolling, scope metadata, and reset grouping.
- Schema versioning is active at version 2. Migration rollback snapshots are stored under advanced settings and exposed in the About panel for restore.
- Reset granularity now covers full reset, shortcut reset, individual shortcut reset, current-tab reset, and manual rollback-point creation. Reset operations create rollback snapshots.
- Export settings now include custom CSS and export history. Preview copy uses the real platform conversion service and clipboard path, not placeholder output.
- AI settings now include systemPrompt and lastConnectionAt. Successful connection tests update the persisted timestamp.
- Data and About diagnostics use real browser/runtime APIs: StorageManager, localStorage, Dexie table counts, Cache Storage, Service Worker state, and performance/runtime data.
- Shortcut coverage is 38 definitions across five groups, exceeding the 33-entry baseline. ShortcutInput remains the recording and conflict-detection component.
- Pictographic checkbox glyphs were removed from export task-list rendering and replaced with CSS-only inline boxes to satisfy the no-Emoji icon rule.
- Full validation passed: ESLint quiet, vue-tsc, production build, Settings SFC compile, diff whitespace check, and touched-file Emoji scan.

Open follow-up outside this completed slice:

- Deep Git/WebDAV/self-hosted Sync provider UI and conflict merge remains governed by 23-sync-provider-spec.
- Extension SDK management remains governed by 25-extension-plugin-spec.
- Dedicated account security and local lock flows remain governed by 06-spec-account-auth and 24-permission-audit-spec.
- Bundle chunk-size optimization remains a separate performance/build task because current build succeeds with only Vite's warning.

（完）
