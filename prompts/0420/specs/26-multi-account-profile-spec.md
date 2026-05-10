# Spec 26 — 多账户与工作区完全隔离（Profile 系统）

| 字段 | 值 |
|---|---|
| Spec ID | 26 |
| 标题 | 多账户与工作区完全隔离（Profile 系统） |
| 状态 | 草稿 |
| 优先级 | P0 |
| 关联决策 | L1-23(D) / L1-24(D) / L1-35(C) |
| 关联 Spec | 06-account-auth-spec / 23-sync-provider-spec / 24-permission-audit-spec |
| 作者 | InkForge Spec Engineer |
| 创建日期 | 2026-04-20 |

---

## 1. 背景与决策依据

### 1.1 铁律来源

- **铁律 10（L1-23 D + L1-24 D）**：每个账户独立数据库 + 文件根（硬隔离）；支持多窗口并行打开；允许跨账户共享模板/导出预设/AI 配置。
- **L1-35 C 补充**：账户数上限 50+；多账户是单人多工作区场景，非团队协作。
- **L1-24 D 补充**：支持多账户并行打开，等同切换 Profile，不必自动关闭文档。

### 1.2 核心设计决策

1. **完全硬隔离**：Profile A 的文档、版本历史、标签、评论、同步状态、密钥绝对不可访问 Profile B 的数据。
2. **共享区**：模板、导出预设、AI 配置存放在全局共享区（不属于任何 Profile）。
3. **多窗口并行**：通过 Tauri 多 WebviewWindow 实现，每个窗口绑定一个 Profile。
4. **Profile 切换不关文档**：切换不等于关闭，当前窗口不强制关闭已打开文档。

---

## 2. Profile 数据模型

```typescript
// src/services/profile/types.ts

export interface Profile {
  /** 全局唯一 ID，nanoid(21) */
  id: string;

  /** 显示名称（用户自定义，例如"工作"/"创作"/"学习"） */
  name: string;

  /**
   * 头像类型：lucide 人像图标名（禁止 emoji）
   * 允许的图标范围：User / UserCircle / UserSquare / Contact / Badge / PersonStanding
   * 及其他 lucide 人像相关图标
   */
  avatarIcon: string;

  /** 强调色（用于 Hub 顶部 Profile 指示器，hex 格式） */
  colorAccent: string;

  /**
   * 文件根目录（绝对路径）
   * 存放文章 HTML 文件 / 附件 / Git 仓库的本地目录
   * 必须通过 Tauri dialog.open 选择
   */
  fileRoot: string;

  /**
   * IndexedDB 数据库名称空间
   * 格式：inkforge-{id}
   * 每个 Profile 独占一个 IndexedDB 数据库
   */
  dbNamespace: string;

  /** 创建时间 */
  createdAt: number;

  /** 最后激活时间（用于排序和默认选择） */
  lastActiveAt: number;

  /** 软删除标记（删除后缓冲 7 天） */
  deletedAt?: number;

  /** Profile 级同步配置（可选，不配置则不同步） */
  syncConfig?: ProfileSyncConfig;

  /** Profile 级设置覆盖（覆盖设备级默认设置） */
  settingsOverride?: Partial<ProfileSettings>;
}

export interface ProfileSyncConfig {
  providerId: string;
  enabled: boolean;
  lastSyncAt?: number;
}

export interface ProfileSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: string;
  paperWidth: 'narrow' | 'standard' | 'wide' | 'fullwidth';
  toolbarMode: 'simple' | 'full';
  editorMode: 'typora' | 'source' | 'preview';
  // ... 其他按账户隔离的设置项（T07-08 C）
}

/** 全局共享区（不属于任何 Profile） */
export interface SharedArea {
  templates: SharedTemplate[];
  exportPresets: SharedExportPreset[];
  aiConfig: SharedAIConfig;
}

export interface SharedTemplate {
  id: string;
  name: string;
  content: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface SharedExportPreset {
  id: string;
  name: string;
  platform: string;
  options: Record<string, unknown>;
}

export interface SharedAIConfig {
  provider: string;       // 当前版本：UI 占位（T07-01 A）
  endpoint?: string;
  // ... 未来 AI 配置字段
}
```

---

## 3. 隔离策略

### 3.1 IndexedDB 数据库隔离

每个 Profile 拥有独立的 IndexedDB 数据库，命名为 `inkforge-{profileId}`。

```typescript
// src/db/index.ts

export class ProfileDatabase extends Dexie {
  // 文档相关
  articles!: Table<Article>;
  article_versions!: Table<ArticleVersion>;
  attachments!: Table<Attachment>;

  // 组织结构
  folders!: Table<Folder>;
  tags!: Table<Tag>;

  // 功能
  comments!: Table<Comment>;
  citations!: Table<Citation>;
  editor_sessions!: Table<EditorSession>;

  // 同步
  sync_logs!: Table<SyncLog>;
  sync_conflicts!: Table<ConflictRecord>;
  sync_outbox!: Table<SyncOutboxEntry>;
  sync_configs!: Table<SyncConfig>;

  // 审计
  audit_logs!: Table<AuditEntry>;

  // 扩展
  extensions!: Table<ExtensionRecord>;
  extension_storage!: Table<ExtensionStorageEntry>;

  constructor(profileId: string) {
    super(`inkforge-${profileId}`);
    this.version(1).stores({
      articles: 'id, folderId, createdAt, updatedAt, status',
      article_versions: 'id, articleId, createdAt',
      // ... 完整 schema 定义
    });
  }
}

/** 全局数据库管理器（跨 Profile） */
export class GlobalDatabaseManager {
  private instances: Map<string, ProfileDatabase> = new Map();

  getDatabase(profileId: string): ProfileDatabase {
    if (!this.instances.has(profileId)) {
      this.instances.set(profileId, new ProfileDatabase(profileId));
    }
    return this.instances.get(profileId)!;
  }

  async closeDatabase(profileId: string): Promise<void> {
    const db = this.instances.get(profileId);
    if (db) {
      db.close();
      this.instances.delete(profileId);
    }
  }

  /** 获取共享区数据库（存储模板/导出预设/AI 配置） */
  getSharedDatabase(): SharedAreaDatabase {
    // 固定名称：inkforge-shared
    return SharedAreaDatabase.getInstance();
  }
}
```

### 3.2 文件系统隔离

每个 Profile 的 `fileRoot` 通过 Tauri fs scope 限制：

```rust
// src-tauri/src/commands/profile.rs

#[tauri::command]
pub async fn set_profile_fs_scope(app: AppHandle, profile_id: String, file_root: String) -> Result<(), String> {
    // 在 Tauri 运行时为此 WebviewWindow 添加 file_root 到 fs scope
    // 仅允许访问该 Profile 的 fileRoot 目录
    app.fs_scope().allow_directory(&file_root, true)?;
    Ok(())
}
```

### 3.3 共享区存储

```typescript
// src/db/shared.ts

class SharedAreaDatabase extends Dexie {
  templates!: Table<SharedTemplate>;
  export_presets!: Table<SharedExportPreset>;
  ai_configs!: Table<SharedAIConfig>;

  constructor() {
    super('inkforge-shared');
    this.version(1).stores({
      templates: 'id, name, createdAt',
      export_presets: 'id, platform',
      ai_configs: 'id',
    });
  }

  private static _instance: SharedAreaDatabase | null = null;
  static getInstance(): SharedAreaDatabase {
    if (!SharedAreaDatabase._instance) {
      SharedAreaDatabase._instance = new SharedAreaDatabase();
    }
    return SharedAreaDatabase._instance;
  }
}
```

---

## 4. Profile 创建向导（4 步流程）

### 4.1 向导状态机

```
步骤 1：名称 + 强调色
    │ 下一步
步骤 2：头像选择
    │ 下一步
步骤 3：文件根目录选择
    │ 下一步
步骤 4：完成确认
    │ 创建
 完成，进入新 Profile
```

### 4.2 步骤 1：基本信息

```
┌──────────────────────────────────────────────────────┐
│  创建新工作区                              [1 / 4]    │
│                                                      │
│  工作区名称                                          │
│  [                    ]  示例：工作、个人创作         │
│                                                      │
│  强调色                                              │
│  [●] [●] [●] [●] [●] [●] [●] [●]  自定义            │
│   蓝  紫  绿  橙  红  青  金  灰                     │
│                                                      │
│  [取消]                             [下一步 →]       │
└──────────────────────────────────────────────────────┘
```

**验证规则**：
- 名称不为空，长度 1-50 字符
- 名称在现有 Profile 中唯一（不区分大小写）
- 强调色必须选择（默认选中第一个蓝色）

### 4.3 步骤 2：头像选择

```
┌──────────────────────────────────────────────────────┐
│  选择工作区头像                            [2 / 4]    │
│                                                      │
│  [预览区：显示选中强调色 + 头像图标的圆形]             │
│                                                      │
│  可选图标（lucide 人像系列）：                        │
│  [User] [UserCircle] [UserSquare] [Contact]          │
│  [Badge] [PersonStanding] [UserCheck] [UserCog]      │
│  （共 12 个选项）                                    │
│                                                      │
│  [← 上一步]                        [下一步 →]        │
└──────────────────────────────────────────────────────┘
```

**规则**：
- 禁止使用 emoji（T09-13 铁律，严禁 emoji）
- 仅限 lucide-vue-next 的人像相关图标
- 默认选中 `User` 图标

### 4.4 步骤 3：文件根目录

```
┌──────────────────────────────────────────────────────┐
│  选择文件存储目录                          [3 / 4]    │
│                                                      │
│  当前选择：[未选择]                                  │
│            [浏览并选择目录...]                       │
│                                                      │
│  说明：                                              │
│  - 该目录将存储您的文章文件和附件                    │
│  - 不同工作区必须使用不同目录                        │
│  - 如使用 Git 同步，此目录将初始化为 Git 仓库        │
│                                                      │
│  [← 上一步]                        [下一步 →]        │
└──────────────────────────────────────────────────────┘
```

**验证规则**：
- 必须通过 Tauri `dialog.open({ directory: true })` 选择（不允许手动输入路径）
- 选择的目录不能与其他 Profile 的 `fileRoot` 相同
- 选择的目录不能是其他 Profile `fileRoot` 的父目录或子目录（防止嵌套）
- 检查目录读写权限

### 4.5 步骤 4：完成确认

```
┌──────────────────────────────────────────────────────┐
│  确认工作区信息                            [4 / 4]    │
│                                                      │
│  [头像预览（圆形，强调色背景，图标白色）]             │
│                                                      │
│  名称：工作                                          │
│  头像：User 图标                                     │
│  强调色：#3B82F6（蓝色）                             │
│  存储目录：C:/Users/xxx/Documents/InkForge/Work      │
│                                                      │
│  创建后将立即切换到此工作区                          │
│                                                      │
│  [← 上一步]                            [创建工作区]  │
└──────────────────────────────────────────────────────┘
```

**创建流程**：
```
1. 生成 profileId = nanoid(21)
2. 设置 dbNamespace = `inkforge-${profileId}`
3. 初始化 ProfileDatabase（创建 IndexedDB 数据库，执行 schema 初始化）
4. 写入 ProfileDirectory（全局 Profile 注册表，存在设备级存储）
5. 调用 set_profile_fs_scope（设置 Tauri 文件权限）
6. 若配置了 Git 同步，初始化 Git 仓库（git init）
7. 写入审计日志：account.create
8. 切换到新 Profile（ProfileStore.switchProfile）
9. 关闭向导 Modal
```

---

## 5. Profile 切换

### 5.1 切换触发点

| 触发位置 | 方式 |
|---|---|
| Hub 右上角 Profile 下拉菜单 | 点击其他 Profile 名称 |
| 全局快捷键 `Ctrl+Shift+P` | 打开 Profile 切换器 Modal |
| Tauri 多窗口 | 新窗口默认使用选定的 Profile |

### 5.2 切换流程（同窗口）

```typescript
// src/services/profile/switcher.ts

export async function switchProfile(targetProfileId: string): Promise<void> {
  const profileStore = useProfileStore();

  // 1. 检查是否有未保存文档（不强制关闭，但提示）
  const unsavedDocs = await getUnsavedDocuments(profileStore.activeProfileId);
  if (unsavedDocs.length > 0) {
    const confirmed = await showUnsavedWarning(unsavedDocs);
    if (!confirmed) return;
    // 对未保存文档：强制保存到当前 Profile
    await forceSaveAll(unsavedDocs);
  }

  // 2. 标记切换中（防止并发切换）
  profileStore.setSwitching(true);

  try {
    // 3. 关闭当前 Profile 的数据库连接（不销毁，保持可快速恢复）
    // 注意：不强制关闭所有打开的文档标签页

    // 4. 初始化目标 Profile 的数据库（若未打开）
    await dbManager.getDatabase(targetProfileId);

    // 5. 更新 Tauri fs scope
    await invoke('set_profile_fs_scope', {
      profileId: targetProfileId,
      fileRoot: profiles[targetProfileId].fileRoot,
    });

    // 6. 更新 ProfileStore
    profileStore.setActiveProfile(targetProfileId);

    // 7. 重新初始化所有 Profile 级 Store
    await reinitializeProfileStores(targetProfileId);

    // 8. 更新 lastActiveAt
    await profileStore.updateLastActive(targetProfileId);

    // 9. 写入审计日志
    await auditLog('account.switch', {
      actorId: profileStore.previousProfileId!,
      profileId: targetProfileId,
      payload: { from: profileStore.previousProfileId, to: targetProfileId },
    });
  } finally {
    profileStore.setSwitching(false);
  }
}
```

### 5.3 Profile 切换器 Modal（Ctrl+Shift+P）

```
┌──────────────────────────────────────────────────────────┐
│  [搜索工作区...]                                [X]      │
├──────────────────────────────────────────────────────────┤
│  当前工作区                                              │
│  [●蓝] 工作                           最后活跃：刚刚    │
│                                                          │
│  其他工作区                                              │
│  [●紫] 个人创作                   最后活跃：2小时前     │
│  [●绿] 学习笔记                   最后活跃：昨天        │
│  [●橙] 副业项目                   最后活跃：3天前       │
├──────────────────────────────────────────────────────────┤
│  [在新窗口中打开选中工作区]      [管理工作区]  [新建]   │
└──────────────────────────────────────────────────────────┘
```

**交互规则**：
- 上下箭头导航 + Enter 切换（键盘优先）
- 当前活跃 Profile 显示在顶部，不可点击切换
- 支持按名称搜索过滤（模糊匹配）
- "在新窗口中打开"触发多窗口模式

---

## 6. 多窗口并行打开

### 6.1 Tauri 多窗口实现

```rust
// src-tauri/src/commands/window.rs

#[tauri::command]
pub async fn open_profile_window(app: AppHandle, profile_id: String, profile_name: String) -> Result<(), String> {
    let window_label = format!("profile-{}", &profile_id[..8]);

    let window = WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::App(format!("/?profileId={}", profile_id).into()),
    )
    .title(format!("InkForge — {}", profile_name))
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    // 设置此窗口的 fs scope 为目标 Profile 的 fileRoot
    // ...

    Ok(())
}

#[tauri::command]
pub async fn list_open_profile_windows(app: AppHandle) -> Vec<String> {
    app.webview_windows()
        .keys()
        .filter(|k| k.starts_with("profile-"))
        .cloned()
        .collect()
}
```

### 6.2 前端多窗口协调

```typescript
// src/services/profile/windowManager.ts

export class ProfileWindowManager {
  /**
   * 在新窗口打开指定 Profile
   */
  async openInNewWindow(profileId: string): Promise<void> {
    const profile = useProfileStore().getById(profileId);
    if (!profile) throw new Error(`Profile ${profileId} not found`);

    // 检查是否已有该 Profile 的窗口
    const existingWindows = await invoke<string[]>('list_open_profile_windows');
    const windowLabel = `profile-${profileId.slice(0, 8)}`;
    if (existingWindows.includes(windowLabel)) {
      // 聚焦到已有窗口
      await invoke('focus_window', { label: windowLabel });
      return;
    }

    await invoke('open_profile_window', {
      profileId,
      profileName: profile.name,
    });
  }

  /**
   * 获取当前窗口的 Profile ID（通过 URL 参数）
   */
  getCurrentProfileId(): string | null {
    const url = new URL(window.location.href);
    return url.searchParams.get('profileId');
  }
}
```

---

## 7. Profile 导出

### 7.1 导出内容

```
inkforge-profile-{name}-{timestamp}.zip
├── manifest.json           # 导出 manifest（版本、profileId、导出时间）
├── settings.json           # Profile 级设置
├── docs/
│   ├── {docId}.html       # 文章内容
│   └── {docId}.meta.json  # 文章元数据
├── versions/
│   └── {docId}/
│       └── {versionId}.diff  # 版本历史 diff
├── attachments/
│   └── {attachmentId}{ext}
├── audit_logs.json         # 审计日志（可选，用户选择是否包含）
└── tags.json               # 标签数据
```

注意：同步配置中的凭据（密码/Token）**不导出**，仅导出 Provider 类型和 endpoint。

### 7.2 导出流程

```typescript
// src/services/profile/exporter.ts

export async function exportProfile(
  profileId: string,
  options: ProfileExportOptions
): Promise<void> {
  // 1. 高危操作确认（DangerConfirmDialog）
  const confirmed = await showExportConfirm(profileId);
  if (!confirmed) return;

  // 2. 显示进度 Modal
  const progress = useExportProgressStore();
  progress.start('正在导出工作区...');

  const db = dbManager.getDatabase(profileId);

  // 3. 收集数据
  progress.update('收集文章...', 10);
  const articles = await db.articles.toArray();

  progress.update('收集版本历史...', 30);
  const versions = await db.article_versions.toArray();

  progress.update('收集附件...', 50);
  const attachments = await db.attachments.toArray();

  // 4. 组装 zip
  progress.update('打包文件...', 70);
  const zip = new JSZip();
  // ... 填充 zip

  // 5. 选择保存路径
  const savePath = await dialog.save({
    filters: [{ name: 'InkForge Profile', extensions: ['zip'] }],
    defaultPath: `inkforge-profile-${profile.name}-${Date.now()}.zip`,
  });

  if (!savePath) { progress.cancel(); return; }

  // 6. 写入文件
  progress.update('保存文件...', 90);
  const buffer = await zip.generateAsync({ type: 'uint8array' });
  await fs.writeBinaryFile(savePath, buffer);

  progress.finish('导出完成');

  // 7. 审计日志
  await auditLog('account.export', {
    actorId: profileId,
    profileId,
    payload: { articleCount: articles.length, path: savePath },
  });
}

export interface ProfileExportOptions {
  includeAuditLogs: boolean;
  includeVersionHistory: boolean;
}
```

---

## 8. Profile 导入

### 8.1 导入验证

```typescript
// src/services/profile/importer.ts

interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest: ProfileExportManifest | null;
}

async function validateImportZip(zipBuffer: Uint8Array): Promise<ImportValidationResult> {
  const zip = await JSZip.loadAsync(zipBuffer);

  // 必须包含 manifest.json
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    return { valid: false, errors: ['缺少 manifest.json'], warnings: [], manifest: null };
  }

  const manifest: ProfileExportManifest = JSON.parse(await manifestFile.async('text'));

  const errors: string[] = [];
  const warnings: string[] = [];

  // 版本兼容性检查
  if (!isCompatibleVersion(manifest.exportVersion)) {
    errors.push(`不兼容的导出版本：${manifest.exportVersion}`);
  }

  // ID 冲突检测
  const existingProfiles = useProfileStore().profiles;
  if (existingProfiles.some(p => p.id === manifest.profileId)) {
    warnings.push(`工作区 ID "${manifest.profileId}" 已存在，导入后将生成新 ID`);
  }

  return { valid: errors.length === 0, errors, warnings, manifest };
}
```

### 8.2 导入向导

```
步骤 1：选择 .zip 文件
步骤 2：验证结果展示（错误/警告/预览）
步骤 3：冲突处理（重命名 / 覆盖 / 取消）
步骤 4：选择目标文件根目录（新的 fileRoot）
步骤 5：导入进度
步骤 6：完成
```

冲突处理规则：
- Profile ID 冲突 → 自动生成新 ID（不覆盖已有 Profile）
- Profile 名称冲突 → 提示用户重命名，默认在末尾加 `(2)`
- 文章 ID 冲突（相同 docId）→ 询问：跳过 / 重命名 / 覆盖

---

## 9. Profile 删除

### 9.1 两步确认与软删除

```
第一步（立即执行）：
- 显示 DangerConfirmDialog（type 模式，需输入 Profile 名称）
- 确认后：设置 profile.deletedAt = Date.now()（软删除）
- Profile 从正常列表隐藏（但在"已删除"区域可见 7 天）
- 写入审计日志：account.delete（severity: critical）

第二步（7 天后）：
- 调度器检查 deletedAt > 7 天的 Profile
- 执行彻底清除：
  - 删除 IndexedDB 数据库（indexedDB.deleteDatabase(`inkforge-{profileId}`)）
  - 询问用户是否删除 fileRoot 目录（不自动删除文件系统内容）
  - 从 ProfileDirectory 中彻底移除
  - 清理所有关联的 Keyring 条目
```

### 9.2 软删除缓冲期 UI

在 Profile 切换器底部显示"已删除的工作区"折叠区：

```
已删除的工作区（7 天内可恢复）
  [●红] 旧工作区名称    将于 N 天后彻底删除  [恢复] [立即彻底删除]
```

---

## 10. Store 定义

```typescript
// src/stores/profile.ts

interface ProfileRecord {
  profile: Profile;
  isActive: boolean;
}

interface ProfileStoreState {
  profiles: Profile[];
  activeProfileId: string | null;
  previousProfileId: string | null;
  switching: boolean;
  creatingWizardStep: number;  // 0 = 未开启，1-4 = 向导步骤
  wizardDraft: Partial<Profile>;
}

export const useProfileStore = defineStore('profile', {
  state: (): ProfileStoreState => ({
    profiles: [],
    activeProfileId: null,
    previousProfileId: null,
    switching: false,
    creatingWizardStep: 0,
    wizardDraft: {},
  }),

  getters: {
    activeProfile: (state): Profile | undefined =>
      state.profiles.find(p => p.id === state.activeProfileId),

    sortedProfiles: (state): Profile[] =>
      [...state.profiles]
        .filter(p => !p.deletedAt)
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt),

    deletedProfiles: (state): Profile[] =>
      state.profiles.filter(p => p.deletedAt && Date.now() - p.deletedAt < 7 * 86_400_000),

    getById: (state) => (id: string) =>
      state.profiles.find(p => p.id === id),

    profileCount: (state): number =>
      state.profiles.filter(p => !p.deletedAt).length,
  },

  actions: {
    async loadProfiles(): Promise<void> {
      const repo = new ProfileRepository();
      this.profiles = await repo.getAll();
      // 恢复上次活跃的 Profile
      const lastActive = localStorage.getItem('inkforge-last-active-profile');
      if (lastActive && this.profiles.some(p => p.id === lastActive && !p.deletedAt)) {
        this.activeProfileId = lastActive;
      } else if (this.profiles.length > 0) {
        const latest = this.sortedProfiles[0];
        this.activeProfileId = latest?.id ?? null;
      }
    },

    async createProfile(draft: Omit<Profile, 'id' | 'dbNamespace' | 'createdAt' | 'lastActiveAt'>): Promise<Profile> {
      const id = nanoid(21);
      const profile: Profile = {
        ...draft,
        id,
        dbNamespace: `inkforge-${id}`,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      this.profiles.push(profile);
      await new ProfileRepository().save(profile);
      return profile;
    },

    setActiveProfile(id: string): void {
      this.previousProfileId = this.activeProfileId;
      this.activeProfileId = id;
      localStorage.setItem('inkforge-last-active-profile', id);
    },

    setSwitching(value: boolean): void {
      this.switching = value;
    },

    async updateLastActive(id: string): Promise<void> {
      const profile = this.profiles.find(p => p.id === id);
      if (profile) {
        profile.lastActiveAt = Date.now();
        await new ProfileRepository().update(id, { lastActiveAt: profile.lastActiveAt });
      }
    },

    async softDelete(id: string): Promise<void> {
      const profile = this.profiles.find(p => p.id === id);
      if (profile) {
        profile.deletedAt = Date.now();
        await new ProfileRepository().update(id, { deletedAt: profile.deletedAt });
      }
    },

    async restore(id: string): Promise<void> {
      const profile = this.profiles.find(p => p.id === id);
      if (profile) {
        delete profile.deletedAt;
        await new ProfileRepository().update(id, { deletedAt: undefined });
      }
    },
  },
});
```

---

## 11. Repository 定义

```typescript
// src/repositories/ProfileRepository.ts

/**
 * Profile 注册表存储在设备级（不属于任何 Profile 的 IndexedDB）
 * 使用独立的 IndexedDB 数据库：inkforge-profiles
 */
export class ProfileRepository {
  private db: ProfileDirectoryDB;

  constructor() {
    this.db = ProfileDirectoryDB.getInstance();
  }

  async getAll(): Promise<Profile[]> {
    return this.db.profiles.toArray();
  }

  async getById(id: string): Promise<Profile | undefined> {
    return this.db.profiles.get(id);
  }

  async save(profile: Profile): Promise<void> {
    await this.db.profiles.put(profile);
  }

  async update(id: string, partial: Partial<Profile>): Promise<void> {
    await this.db.profiles.update(id, partial);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.profiles.delete(id);
  }
}

class ProfileDirectoryDB extends Dexie {
  profiles!: Table<Profile>;

  constructor() {
    super('inkforge-profiles');
    this.version(1).stores({
      profiles: 'id, name, lastActiveAt, deletedAt',
    });
  }

  private static _instance: ProfileDirectoryDB | null = null;
  static getInstance(): ProfileDirectoryDB {
    if (!ProfileDirectoryDB._instance) {
      ProfileDirectoryDB._instance = new ProfileDirectoryDB();
    }
    return ProfileDirectoryDB._instance;
  }
}
```

---

## 12. Hub Profile 指示器

### 12.1 Hub 右上角 Profile 下拉

```
┌─────────────────────────────────────┐
│  [蓝色圆形头像图标] 工作  ▼         │
└─────────────────────────────────────┘
（点击展开）
┌─────────────────────────────────────────────────┐
│  [蓝圆] 工作                    当前         yes │
│  [紫圆] 个人创作                    2 小时前    │
│  [绿圆] 学习笔记                    昨天        │
│  ─────────────────────────────────────────────  │
│  [在新窗口中打开...]                             │
│  [管理工作区]                                    │
│  [新建工作区]                                    │
└─────────────────────────────────────────────────┘
```

### 12.2 多窗口时的窗口标题

Tauri 窗口标题格式：`InkForge — {profileName}`

当多个窗口打开时，用户可通过窗口标题区分（操作系统任务栏可见）。

---

## 13. 性能约束

| 指标 | 目标值 | 说明 |
|---|---|---|
| Profile 切换延迟 | ≤ 500ms | 从点击切换到新 Profile 数据加载完成 |
| Profile 列表加载 | ≤ 100ms | 50 个 Profile 的注册表查询 |
| Profile 创建向导 | ≤ 2s | 从点击"创建工作区"到 Profile 可用 |
| 导出（5000 篇文章） | ≤ 3min（L1-36 铁律） | 含压缩时间 |
| 导入（5000 篇文章） | ≤ 5min | 含解压和 DB 写入 |
| 多窗口启动延迟 | ≤ 2s | 新 Tauri 窗口从启动到可交互 |

---

## 14. 测试矩阵（≥ 30 条）

| 编号 | 类型 | 测试场景 | 预期结果 |
|---|---|---|---|
| T-01 | 单元 | Profile ID 生成：nanoid(21) 唯一性 | 1000 次生成无重复 |
| T-02 | 单元 | dbNamespace 格式：`inkforge-{id}` | 符合命名规则 |
| T-03 | 单元 | ProfileStore.sortedProfiles 排序 | 按 lastActiveAt 降序 |
| T-04 | 单元 | ProfileStore.deletedProfiles 过滤 | 只返回 7 天内软删除 |
| T-05 | 单元 | 向导步骤 1：名称重复验证 | 返回错误提示 |
| T-06 | 单元 | 向导步骤 3：目录嵌套检测 | 嵌套路径被拒绝 |
| T-07 | 单元 | 向导步骤 3：目录与已有 Profile 重叠 | 被拒绝并提示 |
| T-08 | 集成 | 创建 Profile：IndexedDB 数据库初始化 | `inkforge-{id}` 数据库存在 |
| T-09 | 集成 | 创建 Profile：写入 ProfileDirectory | profiles 表存在新记录 |
| T-10 | 集成 | 创建 Profile：审计日志写入 | `account.create` 条目存在 |
| T-11 | 集成 | Profile 切换：activeProfileId 更新 | Store 中 activeProfileId 正确 |
| T-12 | 集成 | Profile 切换：lastActiveAt 更新 | Profile 记录 lastActiveAt 刷新 |
| T-13 | 集成 | Profile 切换：审计日志写入 | `account.switch` 条目存在 |
| T-14 | 集成 | 数据隔离：Profile A 数据不可在 Profile B 访问 | 查询返回空 |
| T-15 | 集成 | 共享区：模板在 Profile A 创建后 Profile B 可见 | 模板存在 |
| T-16 | 集成 | 软删除：Profile 不出现在正常列表 | sortedProfiles 不含已删除 |
| T-17 | 集成 | 软删除：7 天内可恢复 | restore 后 deletedAt 清空 |
| T-18 | 集成 | 导出：zip 文件包含 manifest.json | 文件内容可解析 |
| T-19 | 集成 | 导出：凭据不包含在 zip 中 | zip 不含密码/Token 字段 |
| T-20 | 集成 | 导出审计日志写入 | `account.export` 条目存在 |
| T-21 | 集成 | 导入：合法 zip 通过验证 | valid = true |
| T-22 | 集成 | 导入：缺少 manifest.json 失败 | valid = false，错误提示 |
| T-23 | 集成 | 导入：版本不兼容返回错误 | 错误提示版本信息 |
| T-24 | 集成 | 导入：ID 冲突生成新 ID | 新 Profile ID 不同于原 ID |
| T-25 | E2E | 向导全流程：4 步创建 Profile 成功 | Profile 存在，切换到新 Profile |
| T-26 | E2E | Ctrl+Shift+P 打开 Profile 切换器 | Modal 出现，列出所有 Profile |
| T-27 | E2E | Profile 下拉切换：同窗口切换 Profile | activeProfileId 变更，数据刷新 |
| T-28 | E2E | 删除确认：输入名称后确认按钮可用 | 按钮 enabled |
| T-29 | E2E | 软删除缓冲：删除后 7 天内可见恢复入口 | 删除区域可见 |
| T-30 | E2E | 多窗口：在新窗口打开不同 Profile | 两个窗口显示不同 Profile 内容 |
| T-31 | E2E | 多窗口：相同 Profile 不重复开新窗口，聚焦已有 | 已有窗口获得焦点 |
| T-32 | 性能 | 切换延迟（含 50 篇文章的 Profile） | ≤ 500ms |

---

## 15. 落地文件索引

| 文件路径 | 说明 |
|---|---|
| `src/services/profile/types.ts` | Profile 核心类型定义 |
| `src/services/profile/switcher.ts` | Profile 切换服务 |
| `src/services/profile/windowManager.ts` | 多窗口管理 |
| `src/services/profile/exporter.ts` | 导出服务 |
| `src/services/profile/importer.ts` | 导入服务（含验证） |
| `src/repositories/ProfileRepository.ts` | Profile 注册表数据访问 |
| `src/db/index.ts` | ProfileDatabase + GlobalDatabaseManager |
| `src/db/shared.ts` | SharedAreaDatabase |
| `src/stores/profile.ts` | Pinia Store |
| `src/components/profile/ProfileSwitcher.vue` | Profile 切换器 Modal |
| `src/components/profile/ProfileDropdown.vue` | Hub 右上角下拉 |
| `src/components/profile/ProfileAvatar.vue` | 头像组件 |
| `src/components/profile/CreateProfileWizard.vue` | 创建向导 Modal |
| `src/components/profile/ExportProgressModal.vue` | 导出进度 Modal |
| `src/components/profile/ImportWizard.vue` | 导入向导 |
| `src-tauri/src/commands/profile.rs` | Tauri fs scope 命令 |
| `src-tauri/src/commands/window.rs` | Tauri 多窗口命令 |


## 2026-04-29 P1-06 Local Slice Boundary

- P1-06 已提供本地账户资料与 Hub/Settings 入口的可运行底座，但尚未实现本 Spec 要求的 Profile 硬隔离、每账户独立数据库、文件根隔离、多窗口绑定 Profile、导入导出向导和恢复窗口。
- 当前 `accounts` 表是后续 Profile 注册表的前置基础，不迁移既有文章/素材归属，避免破坏现有 Local-First 数据。
- 后续推进本 Spec 时必须从 `P1_06_STATIC_OK` 的账户底座继续演进，而不是重建或删除现有账户 store 与 `/account` 页面。


## 2026-05-02 Baseline Implementation Note

Baseline status: Pass for the compatible Profile registry and per-profile database namespace baseline; full Spec 26 remains partially pending.

Accepted baseline coverage:
- Added strict Profile contracts under `src/services/profile/*`, including Profile id validation, 21-character URL-safe id generation for new Profiles, legacy `local-default` / UUID account id compatibility, lucide icon-name avatar choices, accent colors, file-root status, soft-delete state, sync config, and settings overrides.
- Added Dexie schema v10 in `InkForgeDB` with real `profiles`, `profileSharedTemplates`, `profileSharedExportPresets`, and `profileSharedAIConfigs` tables while preserving all earlier tables.
- Added `ProfileDatabase` and `ProfileDatabaseManager` to initialize separate `inkforge-{profileId}` IndexedDB databases with real metadata records. The baseline proves database namespace isolation without destructively migrating existing articles.
- Added `ProfileRepository` lifecycle operations: mirror default Profile from existing local account, create, switch, soft-delete, restore, list active Profiles, and list recoverable deleted Profiles.
- Existing account lifecycle now mirrors account create/switch/update into the Profile registry without deleting `/account` or rebuilding the account store.
- Added `useProfileStore` with active Profile pointer, sorted active Profiles, deleted recovery list, create/switch/soft-delete/restore actions, and local active Profile persistence.
- Added Settings `工作区` Tab showing real Profile registry state, active Profile id, per-profile DB namespace, file-root status, create/switch/delete/restore controls, and explicit browser/Tauri native-boundary limitations.
- Added audit action `account.restore`; create/switch/delete/restore Profile lifecycle operations write real audit evidence through the audit service.
- Product code does not introduce fake file roots, fake multi-window success, fake import/export zip results, sample Profiles, mock account data, destructive article migration, or Emoji glyph icons.

Validation evidence:
- `pnpm exec vitest run src/services/profile/profile.test.ts` passed with 1 file and 7 tests.
- `pnpm exec vitest run src/services/profile/profile.test.ts src/services/extensions/extensions.test.ts` passed with 2 files and 13 tests.
- `pnpm exec vitest run` passed with 7 files and 46 tests.
- `pnpm exec vue-tsc --noEmit` passed after fixing Settings audit-refresh handler typing.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` passed; existing dynamic/static import and chunk-size warnings remain non-blocking.
- Production preview smoke on `http://127.0.0.1:5182/settings?tab=profiles` verified active Profiles tab rendering, default `local-default` Profile initialization, real `InkForgeDB` v10, real `inkforge-local-default` Profile database, creation of `Smoke Profile 20260502`, active Profile count 2, a new independent `inkforge-{profileId}` database, visible native-boundary unavailable messaging, zero browser console errors, and clean port shutdown afterward.

Pending for full Spec 26 pass:
- Dedicated safe migration of existing articles, versions, assets, comments, citations, sync state, audit logs, and extension storage into per-profile databases with backup and rollback.
- Real Tauri Rust commands for directory picker file-root selection, fs scope binding, multi-window open/focus/list, and per-window Profile binding.
- Full Profile switcher modal and command-palette Profile switching entry.
- Full import/export zip wizard, conflict handling, and credential exclusion verification.
- Post-7-day irreversible purge scheduler, Keyring cleanup, and explicit file-root deletion confirmation.
- Full 30+ row E2E/performance matrix including 50+ Profiles, multi-window behavior, and packaged Tauri validation.
