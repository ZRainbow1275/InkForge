# 06 - 本地账户管理与认证规范

> 文档类型: Spec
> 阶段: Phase 4（文件管理、数据与多账户）
> 依赖: 26-multi-account-profile-spec, 23-sync-provider-spec, 24-permission-audit-spec, 17-crash-recovery-spec, 29-data-integrity-spec, 41-settings-migration-spec
> 来源问卷题号: T06-01 ~ T06-12, L1-02, L1-23, L1-24, L1-33, L1-34, L1-53, L1-55, L1-56
> 权威来源: 本 Spec 各条目在"权威来源表"章节逐条标记
> 创建日期: 2026-04-20
> 最后更新: 2026-04-29

---

## 一、背景与目标

### 1.1 背景

0327 版 `06-account-auth-spec.md` 仅规划了"本地账户 + 简单切换"，未处理：多账户并行、整页 reload、Profile 隔离粒度、首启分流、Windows Hello、高危操作二次认证、软删除恢复窗口、跨账户共享区。0420 问卷把 T06 全部拉到 Chrome Profile 级隔离 + 并行多窗口 + 高级认证的高度。用户明确：**5~10 人 + 管理员 + 非作者角色**虽然是"远期"，但**本轮就要打好底座**（L1-02 补充）。

### 1.2 本 Spec 目标

1. 建立**Chrome Profile 级**账户隔离：每账户独立 IndexedDB + 文件根目录 + 密钥 + 命令记录 + 版本历史 + 审计日志。
2. 支持**多窗口并行**：一个账户一个窗口，多窗口互不干扰（与 L1-53 C 跨窗口标签拖拽衔接）。
3. **首启分流**：创建正式账户 / 导入已有数据（拒绝匿名）。
4. **账户切换 = 整页 reload**，切换前 autosave 预检。
5. **本地密码 + Windows Hello 双轨**，高危操作强制二次认证。
6. **软删除 7 天**整包恢复。
7. **跨账户共享区**（模板 / 导出预设 / AI 配置）放设备级。
8. **资源级权限模型**（文档 / 文件夹 / 评论 / 版本 / 发布）绑多账户/多 Profile。

### 1.3 产品铁律映射

| 铁律 | 落地条款 |
|------|---------|
| 铁律 4（纸张气质不破坏） | §2 AccountWelcome 保持 Ethereal 风格 |
| 铁律 9（冲突由用户解决 + 审计） | §11 高危操作审计 |
| 铁律 10（账户 = Profile，多并行） | §1、§7 |
| 铁律 15（性能 SLO） | 切换 reload ≤ 3s |

---

## 二、范围与边界

### 2.1 本轮进入 scope

- Profile 模型（§1）
- AccountWelcome 页面（§2）
- 账户创建向导（§3）
- 头像上传裁剪（§4）
- 账户软删除 + 恢复（§5）
- 账户切换 + autosave 预检（§6）
- 多账户并行多窗口（§7）
- 首启分流（§8）
- 本地密码认证（§9）
- Windows Hello 集成（§10）
- 高危操作清单 + 二次认证（§11）
- 跨账户共享区（§12）
- 资源级权限模型接入点（§13）
- Hub 头像气泡菜单（§14）
- 远程同步占位（§15）

### 2.2 不进入

- 匿名模式（T06-08 补充"拒绝匿名"）
- 真实云端账号注册 / 登录（v2.1 纯本地）
- 跨账户真实共享数据开启（T06-11 A）
- 组织 / 团队角色（远期）
- 人脸识别 / 指纹（macOS TouchID v2.2 候选，Linux 无统一方案）
- 自动更新强推（L1-56 B 只通知）

### 2.3 延后

- 云端 Profile 同步（v2.2+）
- 多人协作共享账户（L1-01 B 远期）
- 权限模型 ReBAC 深度（L1-33 D，本轮仅资源级）

---

## 三、详细规范 / 需求条目

## §1 Profile 模型（每账户独立 DB + 文件根）

### 1.1 核心模型

```
<appDataDir>/
├── profiles/
│   ├── <accountId>/
│   │   ├── profile.json              # 元数据（名称、头像、创建时间、最后访问）
│   │   ├── db/                       # IndexedDB 文件（通过 Tauri fs 挂载）
│   │   │   └── inkforge.db           # Dexie 导出 / 快照，运行时用浏览器 IndexedDB
│   │   ├── articles/                 # 文章 Markdown 镜像（Git 同步源）
│   │   │   ├── <articleId>.md
│   │   │   └── assets/
│   │   ├── versions/                 # 版本历史存档
│   │   ├── backups/                  # 自动备份（T07-03 B）
│   │   ├── keys/                     # 本地加密密钥（PBKDF2 衍生）
│   │   └── logs/                     # 审计日志分片
│   └── <accountId>.deleted/          # 软删除快照（7 天）
├── shared/                           # 跨账户共享区（§12）
│   ├── templates/
│   ├── export-presets/
│   └── ai-configs/
├── tmp/
└── meta/
    ├── profiles-registry.json        # 账户列表总表
    ├── device-settings.json          # 设备级设置（T07-08 C）
    └── last-active-profile.json
```

### 1.2 Profile 模型接口

```ts
interface ProfileMetadata {
  id: AccountId                      // ulid
  name: string                       // 用户可见名
  avatar?: string                    // 相对路径
  createdAt: number
  lastActiveAt: number
  authMethod: 'none' | 'password' | 'platform' | 'password+platform'
  deletedAt?: number                 // 软删除时间戳
  expiresAt?: number                 // 软删除 + 7 天
  storageBytes?: number              // 由后台任务更新
  color?: string                     // 头像背景色（无头像时）
  preferences: {
    locale: 'zh-CN' | 'en-US'
    theme?: string
  }
}

interface ProfileRegistry {
  list(): ProfileMetadata[]
  get(id: AccountId): ProfileMetadata | undefined
  create(init: ProfileInit): ProfileMetadata
  update(id: AccountId, patch: Partial<ProfileMetadata>): void
  softDelete(id: AccountId): void
  restore(id: AccountId): void
  purge(id: AccountId): void          // 永久删除
}
```

### 1.3 IndexedDB 隔离

- Dexie 实例名动态拼接：`inkforge-<accountId>`
- `openDb(accountId)` 返回独立实例；每个账户有独立 schema version（但共用代码路径）
- 切换账户时销毁当前 Dexie → 切断响应式链路 → 走 reload（§6）

### 1.4 文件根隔离

- 所有资产 / 文章镜像 / 备份写入 `profiles/<accountId>/` 下
- Git 同步（T07-02 D）使用 `profiles/<accountId>/articles/` 作为仓库根

### 1.5 密钥隔离

- 每账户独立 `encryptionKey`（AES-GCM 256）
- 从本地密码 PBKDF2 衍生；若未设密码，则使用设备随机 key（`keys/device-key.bin`）
- Windows Hello / Platform Auth 只负责解锁密钥，不直接存储密码

---

## §2 AccountWelcome 页面（可选）

### 2.1 定位（T06-02 A）

- **非强制引导**。从 Hub 头像气泡菜单（§14）进入，路径 `/account`
- 展示当前账户信息 + 账户管理操作 + 远程同步占位（§15）

### 2.2 布局

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Hub                                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│       ┌───────┐                                          │
│       │ Avatar│     ZRainbow1275                         │
│       └───────┘     Signed in locally · 1.2 GB           │
│       [Change]      [Rename] [Edit Avatar]               │
│                                                          │
│   ── Security ─────────────────────────────────────      │
│   [x] Local password                    [Change]         │
│   [ ] Windows Hello                     [Enable]         │
│   High-risk operations require re-auth  [Manage]         │
│                                                          │
│   ── Storage ──────────────────────────────────────      │
│   Articles: 1,023 (904 MB)                               │
│   Drafts: 17 (2 MB)                                      │
│   Archived: 89 (210 MB)                                  │
│   Assets: 382 (95 MB)                                    │
│                                                          │
│   ── Profiles ─────────────────────────────────────      │
│   [Switch Profile] [Create New] [Import Data]            │
│                                                          │
│   ── Remote Sync (Coming Soon) ────────────────────      │
│   [Configure Sync] (disabled)                            │
│                                                          │
│   ── Danger Zone ──────────────────────────────────      │
│   [Delete This Profile]                                  │
└──────────────────────────────────────────────────────────┘
```

### 2.3 职责

- 展示 + 调整当前账户资料
- 跳转各子面板（密码设置、Windows Hello、存储详情、切换 Profile）
- **不承担首启引导**（首启走 §8）

---

## §3 账户创建向导

### 3.1 步骤

```
Step 1 Basic      → Name + Avatar (optional)
Step 2 Security   → Set password? Enable Windows Hello?
Step 3 Preferences→ Locale + Theme + Writing Mode
Step 4 Review     → 创建
```

### 3.2 表单约束

- Name：1 ~ 40 字符，不允许文件系统非法字符（` / \ : * ? " < > | `）
- 头像可跳过（使用 color + initial 兜底）
- 密码：8 字符起，强度指示器（entropy）
- 每步可"跳过"（密码 / Windows Hello 均可省略）

### 3.3 数据落地

- 在 `profiles-registry.json` 追加新条目
- 初始化 `profiles/<accountId>/` 目录结构
- 立即切换到新账户（整页 reload）

### 3.4 失败回滚

- 任何一步出错 → 清理已创建的目录 + 回滚 registry
- 失败原因 Toast + 日志

---

## §4 头像上传 + 裁剪（T06-03 B）

### 4.1 流程

```
Select File → Read As DataURL → Open AvatarCropperDialog
→ 用户拖拽 / 缩放选区 → Confirm → Canvas 输出 200×200 png
→ 写入 profiles/<accountId>/avatar.png → Update profile.json
```

### 4.2 AvatarCropperDialog

- 圆形选区框（视觉）但输出方形（200×200 PNG）
- 支持拖拽 + 缩放（滚轮 / 滑块）
- 显示比例预览（小头像 / 大头像）
- Esc 取消

### 4.3 限制

- 输入格式：PNG / JPG / WEBP
- 单文件 ≤ 5 MB
- 超出 → 友好拒绝 + 提示

---

## §5 账户软删除 + 恢复（T06-10 B）

### 5.1 删除流程（T06-04 B）

```
AccountWelcome → Delete → 第一次确认（Warn + 列出数据量）
→ 第二次确认（输入账户名精确匹配）
→ softDelete(accountId)
→ Move profiles/<accountId>/ → profiles/<accountId>.deleted/
→ 记录 expiresAt = now + 7d
→ registry.update
→ 切换到其他账户（若有）或进入首启 Dispatcher
```

### 5.2 恢复流程

- AccountWelcome > "Switch Profile" 面板含 "Deleted (7d)" 分组
- 点击恢复 → Move 目录回原位 + registry 恢复
- 同名冲突 → 自动重命名 `<name> (Restored)`

### 5.3 永久删除

- 到期 GC：后台任务每日检查 `expiresAt < now` → 永久删除
- 用户亦可在"Deleted (7d)"列表手动"Permanently Delete"（需高危二次认证）

### 5.4 数据完整性

- 软删除必须原子（要么成功全移，要么 revert）
- Move 失败 → 回滚 + Toast + 审计

---

## §6 账户切换流程（T06-05 C + T06-12 A）

### 6.1 预检步骤

```
User clicks "Switch to <Other>"
         │
         ▼
  Check dirty state (any unsaved tab?)
         │
         ├─ Yes → Trigger autosave
         │         │
         │         ├─ Success → proceed
         │         └─ Fail    → BLOCK 切换 + Toast + 打开错误详情
         │
         └─ No  → proceed
         │
         ▼
  Save UI state snapshot (window layout, open tabs)
         │
         ▼
  Update last-active-profile.json
         │
         ▼
  window.location.reload()  ← 整页重载
         │
         ▼
  Boot → Detect active profile → Initialize Stores
```

### 6.2 自动保存失败的行为

- 保存失败视为"数据风险错误"（G-13 D）
- **必须阻止切换**（T06-12 补充）
- UI：顶部 Banner 显示"Cannot switch: autosave failed on article X"
- 引导用户：查看失败详情 / 手动导出紧急副本（L1-19 D）

### 6.3 reload 性能目标

- 自动保存 → reload → 新账户 Hub 可交互 ≤ 3s（含 DB 初始化 + 迁移检查）
- 超过 → Splash 界面显示进度

### 6.4 切换命令

- 命令 id：`system.switchAccount`
- risk: `high`，requiresConfirm: true（仅在有多个账户时）
- 审计记录：`{ from: <oldId>, to: <newId>, autosaveOk: true }`

---

## §7 多账户并行（多窗口）

### 7.1 原则（L1-24 D）

- 支持多窗口同时打开不同账户（类 VSCode "File > New Window"）
- 同一账户最多 **1 个主窗口** + N 个子窗口（QuickNote / SplitView）
- 跨窗口标签拖拽（L1-53 C）在 TauriMultiWindow Spec 处理，本 Spec 仅确保数据层可支撑

### 7.2 进程模型

- Tauri 多 Window 使用同一 backend process，前端各自独立 WebView
- 各 Window 启动参数带 `--profile=<accountId>`
- 同账户多个 Window 的 IndexedDB 是共享的（同一 origin），需要处理跨窗口写入同步（BroadcastChannel）

### 7.3 跨窗口状态同步

- `BroadcastChannel('inkforge-account-<accountId>')` 广播：
  - 文档保存事件
  - 设置变更事件
  - 命令审计事件
  - 退出 / 删除账户
- 各 Window 订阅 → 自动 refresh Store

### 7.4 窗口管理

- "New Window"（快捷键 Ctrl+Shift+N，待定）→ 新窗口同账户
- "New Window (Other Profile)" → 选择账户打开
- 窗口标题：`<DirtyMark><Title> — <ProfileName>`

---

## §8 首启分流 Dispatcher（T06-08 D + 拒绝匿名）

### 8.1 入口条件

- `meta/profiles-registry.json` 不存在 或 无活跃账户
- → 渲染 `<FirstRunDispatcher>` 替代正常路由

### 8.2 布局

```
┌───────────────────────────────────────────┐
│            Welcome to InkForge            │
│   Markdown-first deep writing workbench   │
│                                           │
│    [ Create New Profile → ]               │
│    [ Import From Backup... ]              │
│                                           │
│    (Anonymous mode intentionally absent)  │
└───────────────────────────────────────────┘
```

### 8.3 Create New Profile

- 跳转 §3 创建向导

### 8.4 Import From Backup

- 支持导入格式：
  - `.inkforge-profile.zip`（官方导出包，含 profile.json + db 导出 + 资产）
  - `.zip` 包含 `articles/*.md`（宽松导入，用户可选分类）
- 走 Import Wizard（来自 S-13 D，具体在 12-file-manager-spec）
- 导入完成即创建新 Profile 并切换到它

### 8.5 拒绝匿名

- 用户明确否决（补充"拒绝匿名模式"）
- 不出现 "Skip / Continue Without Account" 按钮

---

## §9 本地密码认证

### 9.1 设置密码

- AccountWelcome > Security > Local Password > Change
- 弹窗要求输入：当前密码（若已设）→ 新密码 → 确认
- 密码强度计算：`zxcvbn`（与 Dropbox 对齐），最低 score 2

### 9.2 密码存储

- **绝不明文存储**
- 派生密钥：`PBKDF2(password, salt=32B, iter=310000, hash=SHA-256, outputLen=32B)`
- 存 `keys/auth.json`:
  ```json
  {
    "scheme": "pbkdf2-sha256",
    "salt": "<base64>",
    "iter": 310000,
    "verifier": "<base64 SHA256(derivedKey || 'inkforge-verify')>"
  }
  ```
- 验证时计算 verifier 比对，相等才解锁

### 9.3 解锁时机

- App 启动 / 账户切换时，若账户 `authMethod` 含 password → 显示密码输入页
- 解锁失败 3 次 → 禁用 60s + 提示
- 解锁成功 → 派生密钥存内存（SessionKey），不持久化

### 9.4 重置密码

- 忘记密码 → 只能通过"重置账户"路径
- 警告：重置会擦除加密的敏感数据（如有）；文章正文本身可通过导出包找回

---

## §10 Windows Hello 集成

### 10.1 依赖

- Tauri plugin: 自研 `tauri-plugin-platform-auth`（v2.1 实现 Windows 支持；macOS / Linux 占位）
- 底层调用：Windows Hello WinRT API（`UserConsentVerifier`）

### 10.2 开启流程

```
User → AccountWelcome > Security > Windows Hello > Enable
→ 调用 UserConsentVerifier.CheckAvailability()
  ├─ NotAvailable → Toast "Windows Hello not configured" + 引导去系统设置
  └─ Available → 调用 RequestVerificationAsync()
    ├─ Verified → 生成 platform-key（32B 随机）存 keys/platform.json
    │           → authMethod 加 'platform'
    └─ Cancelled / Failed → Toast + 保留原状态
```

### 10.3 解锁流程

- 账户 `authMethod` 含 `platform` → 启动 / 切换时优先显示"Verify with Windows Hello"
- Verify 成功 → 解密 platform-key → 解锁 SessionKey
- 用户可选"Use password instead"降级

### 10.4 双重（password + platform）

- `authMethod === 'password+platform'` → 优先 platform；可切 password；两者满足其一即可

### 10.5 跨平台

- macOS：v2.2+ 集成 TouchID（`LocalAuthentication.framework`）
- Linux：无统一方案，仅 password
- v2.1 UI 根据平台隐藏不支持项

---

## §11 高危操作清单与二次认证

### 11.1 高危操作清单（T06-09 补充）

| 命令 | 说明 | 认证级别 |
|------|------|---------|
| `system.deleteAccount` | 删除本账户 | Password OR Platform |
| `system.purgeAccount` | 永久删除软删除账户 | Password + Platform 任一 + 额外输入账户名 |
| `article.delete` (软) | 删除文章进回收站 | 无（回收站可恢复） |
| `article.purge` (永久) | 永久删除文章 | Password OR Platform |
| `trash.clear` | 清空回收站 | Password OR Platform |
| `system.exportAll` | 导出全量数据 | Password OR Platform |
| `system.resetDatabase` | 重置数据库 | Password + Platform 任一 + "RESET" 输入 |
| `settings.viewSensitive` | 查看敏感设置（如密钥路径） | Password OR Platform |
| `plugin.install` | 安装扩展（声明权限敏感） | Password OR Platform |

### 11.2 二次认证 UI

- ExecutionPipeline Step 1（05-spec §1.5）拦截 → 弹 `<ReauthDialog>`
- 优先级：Platform > Password
- 失败 3 次 → 禁用 300s + 审计

### 11.3 Session 缓存

- 重认证成功后，**不缓存**（每次高危操作单独验证）
- 用户反馈麻烦 → Settings > Security > "Cache re-auth for 5 min"（默认关）

### 11.4 审计

- 所有高危操作尝试（成功 / 失败 / 取消）写审计日志
- payload: `{ commandId, method: 'platform'|'password', result, durationMs }`

---

## §12 跨账户共享区（设备级）

### 12.1 共享对象（L1-23 D 补充）

| 对象 | 位置 | 共享策略 |
|------|------|---------|
| 模板 | `shared/templates/` | 所有账户可读写 |
| 导出预设 | `shared/export-presets/` | 所有账户可读写 |
| AI 配置 | `shared/ai-configs/` | 仅配置文件；API key 各账户独立（因密钥加密） |

### 12.2 索引

- `shared/registry.json` 列出所有共享对象的 id / 名称 / 类型 / 修改时间
- 各账户 Store 启动时拉取共享索引

### 12.3 并发写

- 同时多个窗口写入 → 使用 file-level lock（Tauri fs `lockfile`）
- 冲突 → 最后写入覆盖 + 审计；文件极小不需要三方合并

### 12.4 v2.1 禁用真共享（T06-11 A）

- 虽然 `shared/` 目录已建立，但 UI 上**不暴露"共享到所有账户"开关**
- 模板 / 导出预设 / AI 配置默认仍是账户级
- `shared/` 仅作为架构预留，远期版本打开开关即可启用

---

## §13 资源级权限模型（L1-33 C）

### 13.1 模型（接入点）

```ts
interface Permission {
  subject: AccountId           // 谁
  resource:
    | { type: 'document'; id: string }
    | { type: 'folder'; id: string }
    | { type: 'comment'; id: string }
    | { type: 'version'; articleId: string; versionId: string }
    | { type: 'publish'; adapter: string }
  action: 'read' | 'write' | 'delete' | 'publish' | 'share' | 'comment'
  scope: 'self' | 'shared'     // 本账户内部 or 跨账户共享（v2.1 仅 self）
  grantedBy?: AccountId
  grantedAt: number
}
```

### 13.2 默认策略

- **本账户 subject** 对自己 profile 内所有资源默认拥有全部 action
- 共享区对象（§12）默认 read/write；delete 仅对象所有者可行
- v2.1 不开启跨账户共享 → `scope: 'shared'` 相关判定都返回 false

### 13.3 扩展点

- 由 24-permission-audit-spec 定义完整 RBAC；本 Spec 仅暴露接口 `permissionService.check(subject, resource, action)`
- 远期（v2.2+）追加 ReBAC / 多人角色时，本 Spec 的 Profile 模型不需要变

---

## §14 Hub 头像气泡菜单（T06-07 B）

### 14.1 布局

```
Hub Header  → Click Avatar  → Pop up

┌────────────────────────┐
│ [Avatar]  ZRainbow1275 │
│           Local · 1.2GB│
├────────────────────────┤
│ → Switch Profile        │
│ → Account Settings      │
│ → Preferences...        │
│ → Lock (when password)  │
│ → Sign Out (reload)     │
├────────────────────────┤
│ Other Profiles          │
│   · Profile B           │
│   · Profile C           │
│ + Create New Profile    │
└────────────────────────┘
```

### 14.2 行为

- Switch Profile → §6 切换流程
- Account Settings → 跳 AccountWelcome
- Preferences → 跳 Settings 对应 Tab
- Lock → 清空 SessionKey，跳密码解锁页（仅在 password 已配置时显示）
- Sign Out → 清 last-active + reload 到 §8 Dispatcher

---

## §15 远程同步占位（T06-06 A）

### 15.1 展示

- AccountWelcome > Remote Sync 区显示：
  - 图标 + "Coming Soon"
  - "Configure Sync" 按钮 disabled
  - Tooltip："Remote sync will be available in a future release. Local Git sync is available in Settings > Sync."
- 同时提供"现在可用的替代方案"链接跳 Settings > Sync（Git 同步，T07-02 D）

### 15.2 数据

- `profile.remoteSync` 字段预留（可选），当前不使用
- 后续版本启用时不需要迁移

---

## 四、数据模型变更

```ts
// profiles-registry.json 结构
interface ProfilesRegistry {
  version: 1
  activeAccountId: AccountId | null
  profiles: ProfileMetadata[]
}

// profile.json
interface Profile {
  id: AccountId
  name: string
  avatar?: string
  createdAt: number
  lastActiveAt: number
  authMethod: 'none' | 'password' | 'platform' | 'password+platform'
  preferences: {
    locale: 'zh-CN' | 'en-US'
    theme?: string
  }
  security: {
    failedAttempts: number
    lockedUntil?: number
    lastAuthAt?: number
  }
  remoteSync?: { /* reserved */ }
}

// IndexedDB (per account)
interface IndexedDbSchema {
  articles: Article[]
  articleVersions: ArticleVersion[]
  tags: Tag[]
  categories: Category[]
  smartFolders: SmartFolder[]
  commandUsageStats: CommandUsageStats[]
  assetsIndex: AssetIndex[]  // assets filePath 相对 profile 根
  activityLogs: ActivityLog[]
  aiSuggestions: AISuggestion[]
  metricsCache: MetricsCacheEntry[]
  settings: SettingsEntry[]  // 账户级设置
}
```

---

## 五、接口与落地目录

```
src-tauri/src/
├── profile_fs.rs                 # 目录创建/删除/原子 move
├── platform_auth.rs              # Windows Hello 封装
└── quick_note.rs                 # §7 联动

src/
├── stores/
│   ├── profile.ts
│   └── auth.ts
├── services/
│   ├── profile/
│   │   ├── registry.ts
│   │   ├── create-profile.ts
│   │   ├── delete-profile.ts
│   │   ├── switch-profile.ts
│   │   └── purge-scheduler.ts
│   ├── auth/
│   │   ├── password.ts
│   │   ├── platform.ts
│   │   ├── session-key.ts
│   │   └── reauth-gate.ts
│   ├── crypto/
│   │   └── pbkdf2.ts
│   ├── broadcast/
│   │   └── account-channel.ts
│   └── permissions/
│       └── resource-check.ts
├── views/
│   ├── AccountWelcome.vue
│   ├── FirstRunDispatcher.vue
│   └── AccountCreateWizard.vue
└── components/
    ├── account/
    │   ├── AvatarCropperDialog.vue
    │   ├── DeleteAccountDialog.vue
    │   ├── ReauthDialog.vue
    │   ├── PasswordSetupDialog.vue
    │   ├── PlatformAuthSetup.vue
    │   ├── ProfileSwitcher.vue
    │   └── DangerZone.vue
    └── hub/
        └── HeaderAvatarMenu.vue
```

---

## 六、关键流程时序图

### 6.1 切换账户（成功路径）

```
User           Hub           AccountSwitcher   Editor           AutosaveSvc        Window
 │  click "→"  │                  │              │                    │                │
 │────────────>│                  │              │                    │                │
 │             │   switch(id)     │              │                    │                │
 │             │─────────────────>│              │                    │                │
 │             │                  │ hasDirty?    │                    │                │
 │             │                  │─────────────>│                    │                │
 │             │                  │   true       │                    │                │
 │             │                  │<─────────────│                    │                │
 │             │                  │ flushNow()                          │                │
 │             │                  │───────────────────────────────────>│                │
 │             │                  │                            ok       │                │
 │             │                  │<───────────────────────────────────│                │
 │             │                  │ updateLastActive(id)                                │
 │             │                  │ window.location.reload()─────────────────────────> │
```

### 6.2 高危操作二次认证

```
User      ExecutionPipeline       ReauthGate      PlatformAuth
 │ click   │                         │                 │
 │────────>│                         │                 │
 │         │ check command.risk='high'                 │
 │         │ ─────────────────────────────────────────>│ (if platform enabled)
 │         │                         │                 │ UserConsentVerifier.Request
 │         │                         │                 │ yes
 │         │ <────────────────────────────────────────│
 │         │ proceed to handler                        │
```

---

## 七、验收矩阵

### 正向样本

1. 全新安装 → 首启 Dispatcher 显示 "Create New" + "Import From Backup"，无匿名选项
2. 创建账户 → 完成 4 步向导 → 直接进入 Hub（无示例文档）
3. 账户 A 打开窗口 1，账户 B 打开窗口 2，两者互不干扰
4. 账户 A 保存文章 → 账户 A 的另一个窗口自动看到更新（BroadcastChannel）
5. 开启 Windows Hello → 锁定 → Windows Hello 解锁 → 正确进入
6. 头像上传 5MB PNG → 裁剪 → 保存为 200×200 png → 头像显示正确

### 失败样本

7. 切换账户时正在编辑 + autosave 服务异常 → 切换被阻止，顶部 Banner 显示原因
8. 密码连续错误 3 次 → 禁用 60s，继续尝试提示倒计时
9. 高危 `system.resetDatabase` → 要求输入 "RESET" + 通过 Platform Auth，任一失败则中止
10. 删除账户第二次确认输入错误账户名 → 拒绝继续
11. 导入包格式错误 → 详细错误 Toast + 建议

### 恢复样本

12. 软删除账户 2 天后 → 恢复 → 数据 100% 完整
13. 软删除账户 8 天后 → GC 已清理 → 不可恢复 + 解释
14. Windows Hello 失败但 password 已配置 → 降级 password 成功进入
15. 多窗口同时写共享模板 → 最后写入覆盖 + 审计两条记录

### 边界样本

16. 账户名含 Unicode 特殊字符（空格 / emoji）→ 允许但写入文件系统时做安全转义
17. 创建第 51 个账户（L1-35 上限 50+）→ 警告但允许创建
18. Windows 不支持 Hello（老版本）→ UI 隐藏开关 + Tooltip 解释
19. macOS 平台 → Windows Hello 开关自动隐藏，显示"Not available on macOS"
20. 账户软删除中途 reload 被杀进程 → 下次启动完整性检查 → 自动回滚未完成的 softDelete

---

## 八、权威来源表

| 条目 | 权威来源 | 注释 |
|------|---------|------|
| 完全 Profile 隔离 | 文档（T06-01 A + L1-23 D） | 新增 |
| 整页 reload 切换 | 文档（T06-05 C） | 新增 |
| 多账户并行 | 文档（L1-24 D） | 新增 |
| 头像双重裁剪 | 文档（T06-03 B） | 升级 |
| 删除双重确认 + 输入账户名 | 文档（T06-04 B） | 新增 |
| 软删除 7 天 | 文档（T06-10 B） | 新增 |
| 首启分流拒绝匿名 | 文档（T06-08 D + 补充） | 新增 |
| 本地密码 + Windows Hello 双轨 | 文档（T06-09 D + 补充） | 新增 |
| 高危二次认证清单 | 文档（L1-34 全范围 + T06-09 补充） | 新增 |
| 跨账户共享区 | 文档（L1-23 D 补充） | 新增（禁用真共享） |
| 资源级权限 | 文档（L1-33 C） | 新增（接入点） |
| Hub 头像气泡菜单 | 文档（T06-07 B） | 沿用 |
| 远程同步占位 disabled | 文档（T06-06 A） | 沿用 |
| Autosave 失败禁止切换 | 文档（T06-12 A + 补充） | 新增 |
| 默认归档不计统计 | 文档（L1-44 D） | 跨引用 |

---

## 九、与其他 Spec 的依赖关系

- **05-spec-toolbar-contextmenu-slash**: 高危命令二次认证 / 命令注册
- **07-spec-settings-tabs**: Security 面板、Sync Tab、Data Tab 的账户级作用域
- **11-document-lifecycle-spec**: 软删除与账户软删除策略协调
- **12-file-manager-spec**: Import 向导整合
- **17-crash-recovery-spec**: Autosave 预检使用恢复子系统接口
- **20-theme-font-typography**: 账户级主题选择
- **22-command-palette-spec**: 账户切换 / 锁定 / 退出等命令
- **23-sync-provider-spec**: Git 仓库根路径 = Profile articles 目录
- **24-permission-audit-spec**: 权限模型 + 审计日志
- **26-multi-account-profile-spec**: 深度 Profile 细节（本 Spec 抽象出的底层）
- **29-data-integrity-spec**: 启动时校验 Profile 目录结构
- **41-settings-migration-spec**: 账户级设置迁移

---

## 十、性能与降级

| 指标 | 目标 | 降级 |
|------|------|------|
| 账户切换（autosave OK） | ≤ 3s | Splash 页 + 进度 |
| 账户切换（含迁移） | ≤ 10s | 进度条 + 可取消 |
| Windows Hello 验证 | 系统耗时，不阻塞 UI | 超时 15s → 降级密码 |
| 软删除 1GB profile | ≤ 5s（Move 操作） | 后台任务 + 进度 |
| 恢复软删除 | ≤ 5s | 同上 |
| 永久删除 1GB profile | ≤ 10s | 后台 GC + 进度 |
| 头像裁剪 | ≤ 300ms | Canvas Worker |

---

## 十一、风险与缓解

| 风险 | 级别 | 缓解 |
|------|------|------|
| 切换 reload 后 Store 初始化失败 | **高** | 兜底重定向到 SafeMode + 提供紧急导出 |
| 软删除过程断电 → 半状态 | 高 | 原子 rename + 启动完整性校验 + 自动回滚 |
| 密码丢失用户抱怨 | 中 | UI 明确告知重置会清加密数据；提供导出入口 |
| Windows Hello 平台不可用 | 中 | 降级 password + UI Tooltip 明确原因 |
| 多窗口 IndexedDB 跨窗口竞态 | 中 | BroadcastChannel + 乐观锁 + 冲突以最后写入为准 |
| 跨账户共享区被滥用 | 低 | v2.1 不暴露开关，架构预留 |

---

（完）

---

## Implementation Note - 2026-04-25 - P1-06 Local Slice

### 已实现范围
本轮按 `04-07-p1-06-account-management` PRD 完成本地账户管理垂直切片，范围限定为纯 Local-First 账户资料与 UI 入口，不提前伪造远程认证、Windows Hello 或本地密码能力。

落地文件：
- `inkforge/src/utils/db.ts`: 新增 Dexie v4 `accounts` 表与 `AccountRecord`。
- `inkforge/src/stores/account.ts`: 新增本地账户 Pinia store，包含账户初始化、列表、切换、创建、资料更新、头像裁剪入库、GDPR JSON 导出、软删除/默认账户重置。
- `inkforge/src/views/AccountWelcome.vue`: 新增 `/account` 页面，提供资料卡片、编辑表单、多账户列表、创建表单、头像上传、导出、安全/同步禁用占位。
- `inkforge/src/router/index.ts`: 注册 `/account` 路由。
- `inkforge/src/views/HubView.vue`: Hub 顶部头像入口改为本地账户按钮，移除远程 DiceBear 静态头像依赖。
- `inkforge/src/views/SettingsView.vue`: Settings 底部新增本地账户与安全快捷卡片。

### 与完整 0420 Spec 的边界
- 已完成 PRD 要求的本地账户表、账户 UI、多账户切换、头像裁剪、导出与 Hub/Settings 入口。
- Chrome Profile 级物理隔离、每账户独立 IndexedDB、Windows Hello、本地密码、高危二次认证、跨账户共享区、资源级权限模型仍属于后续安全/多 Profile 切片；当前 UI 明确 disabled，不模拟完成状态。
- 当前数据仍沿用既有单库 `InkForgeDB`，本轮只增加 `accounts` 表作为 profile 底座，不迁移文章/素材归属，避免破坏既有数据。

### 验证记录
- Targeted account checks passed: TypeScript transpile + Vue template compile + 8 项结构断言。
- 正式 `vue-tsc` 与 `vite build` 仍被本机 `node_modules`/ACL 阻塞，错误为 `entities exports is not defined` 与 `vite/bin/vite.js EPERM`，因此本切片暂不标 completed。


## 2026-04-29 Completion Ledger

- 已完成 P1-06 local-first 账户入口基线：`/account` 页面、本地账户创建/切换、Zod 校验、头像裁剪入库、GDPR JSON 导出、Hub 头像入口、Settings 账户快捷卡片。
- 已验证当前实现不接入远程认证，不使用远程 DiceBear 头像，不引入 mock 账户；安全与同步能力以 disabled/即将推出状态呈现。
- 验证通过 `P1_06_STATIC_OK`、`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build`。构建仅出现既有 chunk size warning。
- 边界声明：本 ledger 不表示 0420 本文提出的 Chrome Profile 级硬隔离、每账户独立数据库、多窗口并行、Windows Hello、本地密码、高危操作二次认证和权限审计均已完成；这些仍属于后续 Profile/security 切片。
