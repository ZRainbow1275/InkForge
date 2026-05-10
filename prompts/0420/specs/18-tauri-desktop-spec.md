# Spec 18 — Tauri Desktop Capabilities

<!--
spec-id: 18
title: Tauri Desktop Capabilities
version: 1.0.0
status: draft
created: 2026-04-21
sources:
  - prompts/0420/_extracted/01-L1-answers.md L1-53~L1-56
  - prompts/0420/_extracted/03-enhancement-answers.md L1-53~L1-56
  - prompts/0420/00-decisions-part3b-tauri-visual-recovery.md 域 Q Q-01~Q-12
related-specs:
  - 13-workstation-layout-spec.md
  - 28-asset-pipeline-spec.md
  - 34-layout-persistence-spec.md
  - 17-crash-recovery-spec.md
  - 55-updater-spec.md
  - 26-multi-account-profile-spec.md
-->

---

## 1. 范围与目标

本 Spec 定义 InkForge v2.1 对 Tauri 桌面端所有原生能力的完整规格，包括：

- Tauri 版本锁定与插件清单
- 运行环境矩阵（Tauri Only / Web Dev 分层）
- 多窗口架构（Q-01）
- 文件系统深度集成与 FileBridge（Q-03）
- 系统托盘与全局快捷键（Q-04）
- 自动更新策略（Q-05）
- 剪贴板集成（Q-08）
- 平台认证（Q-09）
- 原生菜单栏取舍（Q-07）
- 打包与签名策略
- Rust 侧命令清单（全量）
- IPC 事件总线协议
- 测试矩阵 40+ 条

**不在本 Spec**：具体业务功能实现（文件管理 Spec 12、资产管道 Spec 28、版本历史 Spec 31）。

---

## 2. 决策溯源

| 决策编号 | 内容 | 来源 |
|---------|------|------|
| Q-01 | 多窗口 + 跨窗口 Tab 拖拽（L1-53 C） | Q-01 |
| Q-02 | 仅 Tauri 生产；Web 仅 dev 调试 | Q-02 |
| Q-03 | 文件系统 D 级集成：监控文件夹 + 冲突检测 | Q-03 |
| Q-04 | 托盘 + 全局快捷键 + QuickNoteWindow | Q-04 |
| Q-05 | 自动更新仅通知（L1-56 B） | Q-05 |
| Q-06 | 一项目一文件夹物理模型 | Q-06 |
| Q-07 | 不用原生菜单栏（S-07 C） | Q-07 |
| Q-08 | 文件拖放 + 粘贴接入 assetPipeline | Q-08 |
| Q-09 | 高危操作 OS 级认证（Windows Hello / Touch ID）| Q-09 |
| Q-10 | 自定义 CSS 注入沙箱 | Q-10 |
| Q-11 | 不做打印（S-10 A） | Q-11 |
| Q-12 | Deep Link 预留但 v2.1 不激活 | Q-12 |
| L1-53 C | 多窗口 + 跨窗口标签拖拽 | enhancement-answers |
| L1-54 D | 文件系统：打开本地 .md / 监控文件夹 / 冲突检测 | L1-54 |
| L1-55 C | 托盘 + 全局快捷键（Ctrl+Alt+N 快速笔记）| L1-55 |
| L1-56 B | 自动更新仅通知 | L1-56 |

---

## 3. Tauri 版本与依赖清单

### 3.1 核心版本锁定

```toml
# src-tauri/Cargo.toml

[dependencies]
tauri = { version = "1.6", features = [
  "system-tray",
  "window-all",
  "protocol-asset",
  "dialog-all",
  "notification-all",
  "global-shortcut-all",
  "clipboard-all",
  "fs-all",
  "shell-open",
  "updater",
] }
tauri-plugin-fs-extra = "1"
tauri-plugin-window-state = "0.1"
tauri-plugin-updater = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
sha2 = "0.10"
notify = "6"   # 文件系统 watcher
```

```json
// src-tauri/tauri.conf.json（关键配置项）
{
  "tauri": {
    "bundle": {
      "identifier": "io.inkforge.app",
      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
    },
    "systemTray": {
      "iconPath": "icons/tray-icon.png",
      "iconAsTemplate": true,
      "menuOnLeftClick": false
    },
    "updater": {
      "active": true,
      "endpoints": ["https://releases.inkforge.io/update/{{target}}/{{current_version}}"],
      "dialog": false,
      "pubkey": "{{TAURI_PUBLIC_KEY}}"
    },
    "windows": [{
      "label": "main",
      "title": "InkForge",
      "width": 1200,
      "height": 800,
      "minWidth": 800,
      "minHeight": 600,
      "decorations": true,
      "transparent": false,
      "fileDropEnabled": true
    }],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:;"
    },
    "allowlist": {
      "all": false,
      "fs": {
        "all": true,
        "scope": ["$APPDATA/inkforge/**", "$DOCUMENT/**", "$DESKTOP/**"]
      },
      "dialog": { "all": true },
      "notification": { "all": true },
      "globalShortcut": { "all": true },
      "clipboard": { "all": true },
      "shell": { "open": true },
      "window": { "all": true },
      "protocol": { "asset": true, "assetScope": ["**"] }
    }
  }
}
```

### 3.2 前端 npm 依赖

```json
{
  "@tauri-apps/api": "^1.6.0",
  "@tauri-apps/plugin-window-state": "^0.1.0",
  "@tauri-apps/plugin-updater": "^1.0.0",
  "@tauri-apps/plugin-notification": "^1.0.0",
  "@tauri-apps/plugin-global-shortcut": "^1.0.0",
  "@tauri-apps/plugin-clipboard-manager": "^1.0.0",
  "@tauri-apps/plugin-fs": "^1.0.0",
  "@tauri-apps/plugin-shell": "^1.0.0",
  "@tauri-apps/plugin-dialog": "^1.0.0"
}
```

---

## 4. 运行环境矩阵（Q-02）

### 4.1 环境检测

```typescript
// src/platform/environment.ts

/** 检测是否在 Tauri 环境中运行 */
export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** 检测是否在 Web 开发调试环境 */
export const isWebDev = (): boolean => !isTauri() && import.meta.env.DEV

/** Tauri 专属功能的安全包装器 */
export function tauriOnly<T>(fn: () => T, fallback?: T): T | undefined {
  if (!isTauri()) {
    if (import.meta.env.DEV) {
      console.warn('[TauriOnly] Attempted to call Tauri-only function in web context')
    }
    return fallback
  }
  return fn()
}

/** Tauri 专属功能的异步安全包装器 */
export async function tauriOnlyAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (!isTauri()) {
    console.warn('[TauriOnly] Attempted async Tauri-only call in web context')
    return fallback
  }
  return fn()
}
```

### 4.2 能力矩阵

| 能力 | Tauri 生产 | Web Dev（pnpm dev）|
|------|-----------|-------------------|
| 文件系统读写 | 完整支持 | `no-op`（警告，不抛错）|
| 剪贴板完整 MIME | 完整支持 | 降级到 `navigator.clipboard`（仅纯文本）|
| 全局快捷键 | 注册并生效 | 不注册（应用内快捷键仍生效）|
| 系统托盘 | 完整支持 | 不显示 |
| 多窗口管理 | 完整支持 | 单窗口模式 |
| 原生文件对话框 | 使用 Tauri dialog API | 降级到 `<input type="file">` |
| 自动更新检查 | 生效 | 不检查 |
| 平台认证（Hello/TouchID）| 完整支持 | 降级到密码验证 |
| 文件拖放到窗口 | `tauri://file-drop` | `dragover/drop` DOM 事件 |
| 文件监听（fs watcher）| 使用 notify crate | 不监听（轮询降级或不做）|

---

## 5. 多窗口架构（Q-01、L1-53 C）

### 5.1 窗口模型

每个 Tauri 窗口承载独立的 Vue Root 实例，但所有窗口共享同一个 IndexedDB 数据库（按 `profileId` namespace 隔离数据）。

```
Window A (main)                Window B (secondary)
├── Vue Root                   ├── Vue Root
│   ├── Pinia Store Instance   │   ├── Pinia Store Instance
│   └── Editor Instance        │   └── Editor Instance
│                              │
└── Shared IndexedDB ──────────┘
    (io.inkforge.db)
```

### 5.2 窗口 ID 注入

```typescript
// src/platform/window.ts
import { getCurrent } from '@tauri-apps/api/window'

export const WINDOW_ID: string = (() => {
  if (isTauri()) {
    return getCurrent().label  // 来自 Tauri window label
  }
  return 'web-dev-window'
})()
```

Workstation Store 初始化时写入 `windowId = WINDOW_ID`。

### 5.3 创建新窗口

```rust
// src-tauri/src/commands/window.rs

#[tauri::command]
pub async fn create_new_window(
    app: AppHandle,
    profile_id: String,
    article_id: Option<String>,
) -> Result<String, String> {
    let label = format!("window-{}", uuid::Uuid::new_v4());
    let url = if let Some(aid) = article_id {
        format!("index.html?profileId={}&articleId={}", profile_id, aid)
    } else {
        format!("index.html?profileId={}", profile_id)
    };

    tauri::WindowBuilder::new(
        &app,
        label.clone(),
        tauri::WindowUrl::App(url.into()),
    )
    .title("InkForge")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(label)
}
```

```typescript
// 前端调用
import { invoke } from '@tauri-apps/api/tauri'

export const windowCommands = {
  createNewWindow: (profileId: string, articleId?: string) =>
    invoke<string>('create_new_window', { profileId, articleId }),

  focusWindow: (windowId: string) =>
    invoke<void>('focus_window', { windowId }),

  listOpenWindows: () =>
    invoke<{ label: string; profileId: string }[]>('list_open_windows'),

  checkArticleOpenWindows: (articleId: string) =>
    invoke<string[]>('check_article_open_windows', { articleId }),
}
```

### 5.4 跨窗口 IPC 事件总线

```typescript
// src/platform/ipc.ts
import { emit, listen } from '@tauri-apps/api/event'
import type { UnlistenFn } from '@tauri-apps/api/event'

export type IPCEvent =
  | { type: 'tab:migrate'; payload: { tabId: string; articleId: string; profileId: string; sourceWindowId: string } }
  | { type: 'quick-note:saved'; payload: { articleId: string; profileId: string } }
  | { type: 'article:updated'; payload: { articleId: string } }
  | { type: 'article:deleted'; payload: { articleId: string } }
  | { type: 'profile:switched'; payload: { profileId: string } }
  | { type: 'sync:status-changed'; payload: { status: SyncStatus } }

export const ipc = {
  emit: <T extends IPCEvent>(event: T) =>
    emit(event.type, event.payload),

  on: <T extends IPCEvent['type']>(
    eventType: T,
    handler: (payload: Extract<IPCEvent, { type: T }>['payload']) => void
  ): Promise<UnlistenFn> =>
    listen(eventType, (e) => handler(e.payload as never)),
}
```

### 5.5 最后一个窗口退出

```rust
// src-tauri/src/main.rs
app.on_window_event(|event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
        let remaining_windows = event.window().app_handle().windows().len();
        if remaining_windows <= 1 {
            // 最后一个窗口关闭：触发优雅退出
            event.window().app_handle().emit_all("app:before-quit", ()).unwrap();
            // 延迟 500ms 等待前端完成保存
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    }
});
```

### 5.6 同一 Article 多窗口检测

```typescript
// src/stores/workstation.ts 中 openTab 方法
async function openTab(articleId: string) {
  const openWindows = await windowCommands.checkArticleOpenWindows(articleId)
  const otherWindows = openWindows.filter(wid => wid !== WINDOW_ID)

  if (otherWindows.length > 0) {
    showToast({
      type: 'warning',
      message: '此文档正在另一个窗口中编辑',
      description: '同时编辑同一文档可能导致内容冲突',
      action: {
        label: '切换到该窗口',
        onClick: () => windowCommands.focusWindow(otherWindows[0]),
      },
      duration: 6000,
    })
  }
  // 仍然打开，但有警告
}
```

---

## 6. 文件系统深度集成（Q-03、L1-54 D）

### 6.1 TauriFileBridge 架构

```
src/services/tauri-file-bridge/
  index.ts              # 公共 API 入口
  watcher.ts            # fs watcher 管理
  hash-cache.ts         # SHA-256 文件哈希缓存
  conflict-resolver.ts  # 冲突解决策略
  project-layout.ts     # 一项目一文件夹物理结构
  sync-scheduler.ts     # IndexedDB → 本地文件写回调度器
```

### 6.2 数据库 Schema 扩展

```typescript
// src/db/schema.ts（articles 表扩展字段）
interface ArticleRecord {
  id: string
  profileId: string
  title: string
  content: string          // Markdown 内容
  // ... 现有字段

  // TauriFileBridge 新增字段
  localPath: string | null           // 本地绝对路径（null 表示仅 DB 存储）
  localSyncEnabled: boolean          // 是否启用本地双向同步
  localFsHashLastSeen: string | null // 上次看到的文件 SHA-256 哈希
  localFsModifiedAt: number | null   // 上次检测到的文件 mtime
}
```

### 6.3 文件监控

```rust
// src-tauri/src/commands/file_watcher.rs

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::Mutex;
use tauri::AppHandle;

static WATCHER: Mutex<Option<RecommendedWatcher>> = Mutex::new(None);

#[tauri::command]
pub async fn start_watching_directory(
    app: AppHandle,
    directory: String,
) -> Result<(), String> {
    let app_clone = app.clone();
    let mut watcher = notify::recommended_watcher(move |res| {
        match res {
            Ok(event) => {
                // 发送事件到前端，debounce 在前端处理
                app_clone.emit_all("fs:file-changed", &event).unwrap();
            }
            Err(e) => eprintln!("Watch error: {:?}", e),
        }
    }).map_err(|e| e.to_string())?;

    watcher.watch(std::path::Path::new(&directory), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *WATCHER.lock().unwrap() = Some(watcher);
    Ok(())
}

#[tauri::command]
pub async fn stop_watching_directory() -> Result<(), String> {
    *WATCHER.lock().unwrap() = None;
    Ok(())
}
```

```typescript
// src/services/tauri-file-bridge/watcher.ts
import { listen } from '@tauri-apps/api/event'
import { useDebounceFn } from '@vueuse/core'
import { tauriFileBridge } from './index'

export async function startFileWatcher(directory: string) {
  await invoke('start_watching_directory', { directory })

  const debouncedHandler = useDebounceFn(async (event: FsEvent) => {
    const { paths, kind } = event
    for (const filePath of paths) {
      if (!filePath.endsWith('.md')) continue
      if (kind === 'modify' || kind === 'create') {
        await tauriFileBridge.applyExternalChange(filePath)
      }
    }
  }, 500)  // 500ms debounce 去抖

  return listen('fs:file-changed', (e) => debouncedHandler(e.payload))
}
```

### 6.4 冲突解决策略

```typescript
// src/services/tauri-file-bridge/conflict-resolver.ts
import { articleRepository } from '@/repositories/article'
import { versionRepository } from '@/repositories/version'
import { computeHash } from '@/utils/hash'

export async function applyExternalChange(localPath: string): Promise<void> {
  const article = await articleRepository.findByLocalPath(localPath)
  if (!article || !article.localSyncEnabled) return

  // 1. 读取外部文件内容
  const externalContent = await readTextFile(localPath)
  const externalHash = await computeHash(externalContent)

  // 2. 如果哈希没变，跳过（避免无意义的更新）
  if (externalHash === article.localFsHashLastSeen) return

  // 3. 生成版本快照（保护现有内容）
  await versionRepository.createSnapshot(article.id, {
    content: article.content,
    reason: 'before-external-sync',
  })

  // 4. 判断应用内是否 dirty
  const isDirty = workstationStore.tabs.find(t => t.articleId === article.id)?.isDirty ?? false

  if (!isDirty) {
    // 直接应用外部变更
    await articleRepository.update(article.id, {
      content: externalContent,
      localFsHashLastSeen: externalHash,
      localFsModifiedAt: Date.now(),
    })
    showToast({ type: 'info', message: `"${article.title}" 已从本地文件更新` })

    // 通知编辑器重新加载
    await ipc.emit({ type: 'article:updated', payload: { articleId: article.id } })
  } else {
    // Dirty 状态：强制进入 diff/merge 视图
    openDiffMergeView({
      articleId: article.id,
      localContent: article.content,   // 应用内版本
      externalContent,                 // 外部版本
      externalSource: 'local-file',
      onResolve: async (resolvedContent) => {
        await articleRepository.update(article.id, {
          content: resolvedContent,
          localFsHashLastSeen: await computeHash(resolvedContent),
        })
      },
    })
  }
}
```

### 6.5 双向同步调度器

```typescript
// src/services/tauri-file-bridge/sync-scheduler.ts
import { useDebounceFn } from '@vueuse/core'
import { writeTextFile } from '@tauri-apps/api/fs'

export function createSyncScheduler() {
  const debouncedWrite = useDebounceFn(async (article: ArticleRecord, content: string) => {
    if (!article.localPath || !article.localSyncEnabled) return

    try {
      await writeTextFile(article.localPath, content)
      const hash = await computeHash(content)
      await articleRepository.update(article.id, { localFsHashLastSeen: hash })
    } catch (err) {
      console.error('[FileBridge] Failed to write local file:', err)
      showToast({ type: 'error', message: '本地文件写入失败', description: String(err) })
    }
  }, 1000)  // 1s debounce

  return {
    onArticleSaved: (article: ArticleRecord, content: string) => {
      debouncedWrite(article, content)
    },
  }
}
```

---

## 7. 系统托盘与全局快捷键（Q-04、L1-55 C）

### 7.1 系统托盘

```rust
// src-tauri/src/tray.rs

use tauri::{
    AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem, SystemTraySubmenu,
};

pub fn create_tray() -> SystemTray {
    let recent_docs = SystemTraySubmenu::new(
        "打开最近文档",
        SystemTrayMenu::new()
            // 由前端动态更新
    );

    let menu = SystemTrayMenu::new()
        .add_submenu(recent_docs)
        .add_item(CustomMenuItem::new("quick-note", "新建快速笔记"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("show-window", "显示主窗口"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "退出"));

    SystemTray::new().with_menu(menu)
}

pub fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            // 单击托盘：恢复/最小化主窗口
            if let Some(window) = app.get_window("main") {
                if window.is_visible().unwrap_or(false) {
                    window.minimize().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
        }
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "quick-note" => {
                    app.emit_all("tray:quick-note", ()).unwrap();
                }
                "show-window" => {
                    if let Some(window) = app.get_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        }
        _ => {}
    }
}
```

### 7.2 全局快捷键

```rust
// src-tauri/src/global_shortcut.rs

use tauri::{AppHandle, GlobalShortcutManager};

pub fn register_global_shortcuts(app: &AppHandle) {
    let mut shortcut_manager = app.global_shortcut_manager();

    // Ctrl+Alt+N（Windows/Linux）/ Cmd+Alt+N（macOS）：唤起快速笔记
    let app_clone = app.clone();
    shortcut_manager
        .register("CmdOrCtrl+Alt+N", move || {
            app_clone.emit_all("global-shortcut:quick-note", ()).unwrap();
        })
        .expect("Failed to register global shortcut");

    // Ctrl+Alt+Space：切换专注模式
    let app_clone2 = app.clone();
    shortcut_manager
        .register("CmdOrCtrl+Alt+Space", move || {
            app_clone2.emit_all("global-shortcut:toggle-focus-mode", ()).unwrap();
        })
        .expect("Failed to register focus mode shortcut");
}
```

### 7.3 QuickNoteWindow

```rust
// src-tauri/src/commands/quick_note.rs

#[tauri::command]
pub async fn open_quick_note_window(app: AppHandle) -> Result<(), String> {
    // 如果已存在则 focus，否则新建
    if let Some(window) = app.get_window("quick-note") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    tauri::WindowBuilder::new(
        &app,
        "quick-note",
        tauri::WindowUrl::App("quick-note.html".into()),
    )
    .title("Quick Note — InkForge")
    .inner_size(480.0, 360.0)
    .resizable(false)
    .always_on_top(true)
    .decorations(true)
    .skip_taskbar(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

QuickNoteWindow 前端（`src/views/QuickNote.vue`）规格：

- 极简编辑器：无 FloatingToolbar、无 StatusBar、无 TOC
- 顶部固定显示字数计数器
- 底部：`Save to Drafts` 按钮（主操作）+ `Discard` 按钮
- `Esc` 键：若有内容弹出确认，无内容直接关闭
- 保存后通过 IPC `quick-note:saved` 通知主窗口刷新草稿列表

```typescript
// src/views/QuickNote.vue
async function saveAndClose() {
  const content = editor.value?.storage.markdown?.getMarkdown?.() ?? ''
  if (!content.trim()) {
    await invoke('close_window', { label: 'quick-note' })
    return
  }

  const articleId = await articleRepository.create({
    title: extractTitle(content) || '快速笔记',
    content,
    status: 'draft',
    categoryId: DRAFTS_CATEGORY_ID,
    profileId: currentProfileId,
  })

  await ipc.emit({ type: 'quick-note:saved', payload: { articleId, profileId: currentProfileId } })
  await invoke('close_window', { label: 'quick-note' })
}
```

---

## 8. 自动更新（Q-05、L1-56 B）

### 8.1 更新检查服务

```typescript
// src/services/updater/index.ts
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'

export interface UpdateInfo {
  version: string
  date: string
  body: string   // Changelog Markdown
}

export class UpdateChecker {
  private checkIntervalMs = 4 * 60 * 60 * 1000   // 4 小时
  private ignoredVersion = ''
  private intervalId: ReturnType<typeof setInterval> | null = null

  async initialize(): Promise<void> {
    // 读取持久化的忽略版本
    this.ignoredVersion = localStorage.getItem('updater.ignoredVersion') ?? ''

    // 启动延迟 30s 后首次检查
    setTimeout(() => this.checkForUpdate(), 30_000)

    // 之后每 4 小时检查一次
    this.intervalId = setInterval(() => this.checkForUpdate(), this.checkIntervalMs)
  }

  async checkForUpdate(): Promise<void> {
    if (!isTauri()) return

    try {
      const { shouldUpdate, manifest } = await checkUpdate()

      if (!shouldUpdate || !manifest) return
      if (manifest.version === this.ignoredVersion) return

      this.showUpdateNotification(manifest)
    } catch {
      // 网络失败静默忽略，不显示 Toast
    }
  }

  private showUpdateNotification(manifest: { version: string; body: string }): void {
    showToast({
      type: 'info',
      message: `InkForge ${manifest.version} 可用`,
      description: '新版本已就绪，点击查看详情',
      duration: Infinity,    // 不自动消失
      action: {
        label: '查看详情',
        onClick: () => this.showUpdateDialog(manifest),
      },
    })
  }

  private showUpdateDialog(manifest: { version: string; body: string }): void {
    // 弹出 UpdateInfoModal，展示 Changelog
    // Modal 中有三个按钮：
    //   "下载安装"：调用 installUpdate() + relaunch()
    //   "稍后提醒"：关闭 Modal
    //   "忽略此版本"：记录到 localStorage
    openUpdateInfoModal({
      version: manifest.version,
      changelog: manifest.body,
      onInstall: async () => {
        await installUpdate()
        await relaunch()
      },
      onIgnore: () => {
        localStorage.setItem('updater.ignoredVersion', manifest.version)
        this.ignoredVersion = manifest.version
      },
    })
  }

  destroy(): void {
    if (this.intervalId) clearInterval(this.intervalId)
  }
}

export const updateChecker = new UpdateChecker()
```

---

## 9. 原生文件对话框

```typescript
// src/platform/dialog.ts
import { open, save } from '@tauri-apps/api/dialog'

export const fileDialogs = {
  /** 打开 Markdown 文件 */
  openMarkdownFile: () =>
    tauriOnlyAsync(() => open({
      multiple: false,
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    })),

  /** 打开多个 Markdown 文件 */
  openMarkdownFiles: () =>
    tauriOnlyAsync(() => open({
      multiple: true,
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    })),

  /** 选择文件夹（作为监控目录） */
  selectDirectory: () =>
    tauriOnlyAsync(() => open({
      directory: true,
      multiple: false,
    })),

  /** 保存文件（另存为） */
  saveFile: (defaultPath?: string, extensions = ['md']) =>
    tauriOnlyAsync(() => save({
      defaultPath,
      filters: [{ name: 'Markdown', extensions }],
    })),

  /** 导出应急副本（文本文件） */
  saveEmergencyBackup: (title: string) =>
    tauriOnlyAsync(() => save({
      defaultPath: `${title}-backup.md`,
      filters: [{ name: 'Text', extensions: ['md', 'txt'] }],
    })),
}
```

---

## 10. 剪贴板集成（Q-08）

### 10.1 富文本复制

```typescript
// src/platform/clipboard.ts
import { writeText } from '@tauri-apps/api/clipboard'

export async function copyRichText(options: {
  html: string
  markdown: string
  plainText: string
}): Promise<void> {
  if (isTauri()) {
    // Tauri 通过 invoke 调用 Rust 侧，写入多 MIME 格式
    await invoke('write_clipboard_rich', options)
  } else {
    // Web 降级：仅写纯文本
    await navigator.clipboard.writeText(options.plainText)
  }
}
```

```rust
// src-tauri/src/commands/clipboard.rs
use arboard::{Clipboard, ImageData};

#[tauri::command]
pub async fn write_clipboard_rich(
    html: String,
    markdown: String,
    plain_text: String,
) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;

    // 写入 HTML 格式（Windows: CF_HTML, macOS: NSPasteboard）
    clipboard.set_html(html.clone(), Some(plain_text.clone()))
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

### 10.2 粘贴图片处理（Q-08）

```typescript
// src/composables/useClipboardPaste.ts
export function useClipboardPaste(editor: Ref<Editor | null>) {
  async function handlePaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue

        // 转为 ArrayBuffer 送入 assetPipeline
        const buffer = await blob.arrayBuffer()
        const assetId = await assetPipeline.ingestBuffer({
          buffer,
          mimeType: item.type,
          originalName: `paste-${Date.now()}.png`,
        })

        // 在编辑器当前位置插入图片
        editor.value?.commands.insertContent({
          type: 'image',
          attrs: { src: `asset://${assetId}`, alt: '' },
        })
        return
      }
    }
  }

  return { handlePaste }
}
```

---

## 11. 平台认证（Q-09）

### 11.1 高危操作清单

以下操作在执行前需要平台认证（Windows Hello / Touch ID）或密码验证：

```typescript
export const AUTH_REQUIRED_OPERATIONS = [
  'article.permanentDelete',       // 永久删除文章（绕过回收站）
  'article.bulkDelete',            // 批量删除
  'account.delete',                // 删除账户
  'settings.viewSensitive',        // 查看 AI Token、Git 凭据
  'settings.editCustomCSS',        // 编辑自定义 CSS/JS 注入
  'data.exportAll',                // 导出全量账户数据
  'trash.purge',                   // 清空回收站（批量硬删除）
] as const

export type AuthRequiredOperation = typeof AUTH_REQUIRED_OPERATIONS[number]
```

### 11.2 权限门

```typescript
// src/services/auth/permission-gate.ts
import { invoke } from '@tauri-apps/api/tauri'

export async function requireAuth(
  operation: AuthRequiredOperation,
  reason?: string
): Promise<boolean> {
  if (!isTauri()) {
    // Web dev 环境：跳过认证（仅开发用）
    return import.meta.env.DEV
  }

  try {
    const result = await invoke<boolean>('request_platform_auth', {
      operation,
      reason: reason ?? `执行操作: ${operation}`,
    })
    return result
  } catch {
    // 认证失败或被取消
    return false
  }
}
```

```rust
// src-tauri/src/commands/auth.rs
#[tauri::command]
pub async fn request_platform_auth(
    operation: String,
    reason: String,
) -> Result<bool, String> {
    // Windows Hello 集成（通过 WinRT API）
    #[cfg(target_os = "windows")]
    {
        windows_hello_verify(&reason).await
    }

    // macOS Touch ID（通过 LocalAuthentication）
    #[cfg(target_os = "macos")]
    {
        touch_id_verify(&reason).await
    }

    // Linux：降级到密码对话框
    #[cfg(target_os = "linux")]
    {
        Ok(true)  // Linux 暂时跳过，后续集成 polkit
    }
}
```

---

## 12. Shell 集成

```typescript
// src/platform/shell.ts
import { open as shellOpen } from '@tauri-apps/api/shell'

export const shellCommands = {
  /** 在系统文件管理器中定位文件 */
  revealInExplorer: async (filePath: string) => {
    await tauriOnlyAsync(() => invoke('reveal_in_explorer', { path: filePath }))
  },

  /** 在默认浏览器中打开 URL */
  openExternalUrl: async (url: string) => {
    if (isTauri()) {
      await shellOpen(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  },
}
```

```rust
// src-tauri/src/commands/shell.rs
#[tauri::command]
pub async fn reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new("/")))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

---

## 13. 窗口状态持久化

使用 `tauri-plugin-window-state` 在应用退出/进入时自动保存/恢复窗口大小和位置：

```rust
// src-tauri/src/main.rs
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // 恢复所有窗口状态
            app.restore_state(StateFlags::all()).ok();
            Ok(())
        })
        .on_window_event(|event| {
            // 窗口关闭时保存状态
            if let tauri::WindowEvent::Destroyed = event.event() {
                event.window().app_handle().save_window_state(StateFlags::all()).ok();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 14. 打包与签名策略

### 14.1 Windows

```toml
# tauri.conf.json bundle 配置（Windows）
{
  "bundle": {
    "windows": {
      "wix": {
        "language": ["zh-CN"],
        "template": "wix/main.wxs"
      },
      "nsis": {
        "installMode": "currentUser",
        "languages": ["SimpChinese", "English"]
      },
      "certificateThumbprint": "{{WINDOWS_CERT_THUMBPRINT}}",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

发布产物：
- `InkForge_x.y.z_x64_en-US.msi`（Windows Installer）
- `InkForge_x.y.z_x64-setup.exe`（NSIS Installer）

### 14.2 macOS

```toml
{
  "bundle": {
    "macOS": {
      "minimumSystemVersion": "10.15",
      "signingIdentity": "{{APPLE_SIGNING_IDENTITY}}",
      "hardenedRuntime": true,
      "entitlements": "entitlements.plist",
      "providerShortName": "{{APPLE_TEAM_ID}}"
    }
  }
}
```

发布产物：
- `InkForge_x.y.z_x64.dmg`
- `InkForge_x.y.z_aarch64.dmg`（Apple Silicon）

### 14.3 Linux

```toml
{
  "bundle": {
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.0-37", "libgtk-3-0"]
      },
      "appimage": {}
    }
  }
}
```

发布产物：
- `inkforge_x.y.z_amd64.AppImage`
- `inkforge_x.y.z_amd64.deb`

---

## 15. Rust 侧命令清单（全量）

```rust
// src-tauri/src/main.rs — 命令注册
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        // 窗口管理
        create_new_window,
        focus_window,
        close_window,
        list_open_windows,
        check_article_open_windows,

        // 文件系统
        start_watching_directory,
        stop_watching_directory,
        read_text_file,
        write_text_file,
        delete_file,
        rename_file,
        create_directory,
        list_directory,
        get_file_metadata,

        // 文件哈希
        compute_file_hash,

        // 剪贴板
        write_clipboard_rich,
        read_clipboard_text,
        read_clipboard_image,

        // 认证
        request_platform_auth,

        // 系统托盘
        update_tray_recent_docs,

        // QuickNote 窗口
        open_quick_note_window,

        // Shell
        reveal_in_explorer,
        open_external_url,

        // 更新器
        check_for_update_manual,

        // 原生对话框（封装）
        show_confirm_dialog,
        show_message_dialog,

        // 应用信息
        get_app_version,
        get_app_data_dir,

        // 崩溃恢复（见 Spec 17）
        write_crash_sentinel,
        clear_crash_sentinel,
        read_crash_sentinel,
    ])
```

---

## 16. IPC 事件清单（全量）

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `tab:migrate` | 窗口 A → 窗口 B | Tab 跨窗口迁移 |
| `quick-note:saved` | QuickNote 窗口 → 主窗口 | 快速笔记保存完成 |
| `article:updated` | 任意窗口 → 所有窗口 | 文章内容更新（fs watcher 或编辑） |
| `article:deleted` | 任意窗口 → 所有窗口 | 文章删除通知 |
| `profile:switched` | 任意窗口 → 所有窗口 | 账户/Profile 切换 |
| `sync:status-changed` | 同步服务 → 所有窗口 | 同步状态变化 |
| `tray:quick-note` | Rust 托盘 → 主窗口 | 托盘菜单"新建快速笔记" |
| `global-shortcut:quick-note` | Rust → 主窗口 | 全局快捷键唤起快速笔记 |
| `global-shortcut:toggle-focus-mode` | Rust → 主窗口 | 全局快捷键切换专注模式 |
| `app:before-quit` | Rust → 所有窗口 | 应用退出前的最后保存机会 |
| `fs:file-changed` | Rust fs watcher → 主窗口 | 本地文件变化通知 |
| `updater:available` | 更新检查服务 → 主窗口 | 有新版本可用 |
| `crash:recovery-available` | Rust → 主窗口 | 检测到崩溃恢复数据 |

---

## 17. 文件结构

```
src-tauri/
  src/
    main.rs                        # Tauri 入口 + 命令注册
    lib.rs
    tray.rs                        # 系统托盘
    global_shortcut.rs             # 全局快捷键
    commands/
      window.rs                    # 窗口管理命令
      file_watcher.rs              # 文件监听命令
      clipboard.rs                 # 剪贴板命令
      auth/
        platform.rs                # Windows Hello / Touch ID
        password.rs                # 密码降级认证
      shell.rs                     # Shell 集成
      quick_note.rs                # QuickNote 窗口
      updater.rs                   # 手动更新检查
      crash.rs                     # 崩溃哨兵读写
  icons/                           # 应用图标
  Cargo.toml
  tauri.conf.json

src/
  platform/
    environment.ts                 # isTauri / tauriOnly
    window.ts                      # WINDOW_ID
    dialog.ts                      # 文件对话框封装
    clipboard.ts                   # 剪贴板封装
    shell.ts                       # Shell 封装
    ipc.ts                         # IPC 事件总线
  services/
    tauri-file-bridge/
      index.ts
      watcher.ts
      hash-cache.ts
      conflict-resolver.ts
      project-layout.ts
      sync-scheduler.ts
    updater/
      index.ts                     # UpdateChecker
    auth/
      permission-gate.ts           # requireAuth
      local-auth.ts                # 密码派生
  views/
    QuickNote.vue                  # 快速笔记窗口
```

---

## 18. 测试矩阵

### 18.1 环境检测

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| E-001 | Tauri 环境下 isTauri() 返回 true | `window.__TAURI_INTERNALS__` 存在 | Unit |
| E-002 | Web 环境下 isTauri() 返回 false | 无 `__TAURI_INTERNALS__` | Unit |
| E-003 | tauriOnly 在 Web 下不抛错（返回 undefined） | 无异常，有警告 | Unit |
| E-004 | Tauri-only 模块在 Web 下不崩溃应用 | 整体应用正常运行 | E2E |

### 18.2 多窗口

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| W-001 | create_new_window 创建独立 Vue Root | 新窗口有自己的 Pinia store | Integration |
| W-002 | 两窗口共享 IndexedDB 数据 | 窗口 A 创建的文章在窗口 B 可见 | Integration |
| W-003 | 同一文章在两窗口打开时显示 warning Toast | Toast 出现，含"切换到该窗口"按钮 | E2E |
| W-004 | Tab 跨窗口拖拽：源窗口 Tab 关闭 | tabId 从源 windowStore 移除 | E2E |
| W-005 | Tab 跨窗口拖拽：目标窗口 Tab 打开 | tabId 在目标 windowStore 存在 | E2E |
| W-006 | 最后一个窗口关闭触发 app:before-quit | IPC 事件被前端监听 | E2E |
| W-007 | 多账户并行：不同窗口加载不同 profileId | 文章列表互不干扰 | Integration |
| W-008 | WINDOW_ID 在 Tauri 环境下唯一 | 不同窗口 label 不同 | Unit |

### 18.3 文件系统集成

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| F-001 | openMarkdownFile 对话框返回路径 | 返回字符串路径 | Integration |
| F-002 | 打开本地 .md 文件导入到 IndexedDB | `localPath` 字段设置 | Integration |
| F-003 | start_watching_directory 开始监听 | fs:file-changed 事件触发 | Integration |
| F-004 | 外部修改 .md 文件触发 applyExternalChange | debounce 500ms 后执行 | Integration |
| F-005 | 外部修改 + 应用内 clean → 自动更新内容 | 编辑器内容变化 | E2E |
| F-006 | 外部修改 + 应用内 dirty → 弹出 diff 视图 | DiffMergeView 出现 | E2E |
| F-007 | 自动保存触发 IndexedDB → 本地写回（1s debounce）| 本地文件内容更新 | Integration |
| F-008 | 哈希相同的外部变更被跳过 | applyExternalChange 提前返回 | Unit |
| F-009 | 禁止在 watcher 回调中直接写 DB | 通过 applyExternalChange 入口 | Unit |
| F-010 | 关闭监控后 localSyncEnabled=false | 字段更新 | Unit |

### 18.4 系统托盘

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| T-001 | 托盘图标显示 | 系统托盘区域有 InkForge 图标 | Visual |
| T-002 | 左键点击托盘：主窗口可见时最小化 | 窗口最小化 | E2E |
| T-003 | 左键点击托盘：主窗口隐藏时恢复 | 窗口变为可见且获得焦点 | E2E |
| T-004 | 右键菜单"新建快速笔记"触发 QuickNoteWindow | QuickNoteWindow 打开 | E2E |
| T-005 | 右键菜单"退出"关闭应用 | 应用进程退出 | E2E |
| T-006 | Settings 中禁用托盘后托盘消失 | 系统托盘无图标 | E2E |

### 18.5 全局快捷键

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| GS-001 | Ctrl+Alt+N（窗口最小化时）唤起 QuickNote | QuickNoteWindow 出现 | E2E |
| GS-002 | QuickNoteWindow 输入内容并 Save | 文章创建，状态 draft，分类 Drafts | E2E |
| GS-003 | QuickNoteWindow 保存后主窗口草稿列表更新 | IPC 事件触发文件树刷新 | E2E |
| GS-004 | QuickNoteWindow Esc（无内容）直接关闭 | 窗口关闭，无对话框 | E2E |
| GS-005 | QuickNoteWindow Esc（有内容）弹出确认 | 确认对话框出现 | E2E |
| GS-006 | 全局快捷键可在 Settings 中修改 | 注册的快捷键变化 | Unit |

### 18.6 自动更新

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| U-001 | 启动 30s 后触发更新检查 | checkUpdate 被调用 | Unit |
| U-002 | 网络失败静默忽略（不 Toast） | 无错误 Toast | Unit |
| U-003 | 发现新版本显示通知 Toast（不自动消失）| duration: Infinity | Unit |
| U-004 | "忽略此版本"记录到 localStorage | `updater.ignoredVersion` 更新 | Unit |
| U-005 | 被忽略版本不再通知 | 再次检查时无 Toast | Unit |
| U-006 | Settings > About "检查更新"按钮触发手动检查 | checkForUpdate 被调用 | Unit |

### 18.7 平台认证

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| A-001 | 高危操作前调用 requireAuth | invoke('request_platform_auth') 被调用 | Unit |
| A-002 | 认证成功后执行操作 | 操作正常完成 | E2E |
| A-003 | 认证失败后操作取消 | 操作未执行 | E2E |
| A-004 | 认证失败超过 5 次/min 锁定 10 分钟 | 后续认证直接拒绝 | Unit |
| A-005 | 平台认证不可用时降级到密码 | 密码对话框出现 | E2E |
| A-006 | 永久删除文章需认证 | requireAuth 被调用 | Unit |
| A-007 | 清空回收站需认证 | requireAuth 被调用 | Unit |

### 18.8 剪贴板

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| C-001 | copyRichText 写入 HTML 格式 | Clipboard 包含 HTML | Integration |
| C-002 | 粘贴图片触发 assetPipeline.ingestBuffer | assetId 返回 | Integration |
| C-003 | 编辑器粘贴图片后插入 image 节点 | image 节点存在于 doc | E2E |
| C-004 | Web 环境降级到 navigator.clipboard | 仅纯文本写入 | Unit |

### 18.9 窗口状态

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| WS-001 | 应用退出时保存窗口大小位置 | plugin-window-state 写入 | Integration |
| WS-002 | 应用重启后恢复窗口大小位置 | 窗口尺寸与上次一致 | E2E |
| WS-003 | 最小窗口尺寸约束：不小于 800×600 | 拖拽小于最小值时限制 | E2E |

### 18.10 打包与发布

| # | 测试描述 | 验证点 | 类型 |
|---|---------|--------|------|
| P-001 | Windows MSI 安装包构建成功 | `.msi` 文件存在 | CI |
| P-002 | macOS DMG 构建成功（x64 + ARM64）| 两个 `.dmg` 文件 | CI |
| P-003 | Linux AppImage 构建成功 | `.AppImage` 文件存在 | CI |
| P-004 | 安装包签名验证通过 | 签名验证无警告 | CI |
| P-005 | 应用 Bundle ID 正确 | `io.inkforge.app` | CI |

## 19. 2026-04-30 Compatible Baseline Implementation Note

P1-18 is implemented as a compatible Tauri v1 desktop baseline, not as full Spec 18 completion. Local dependency truth is `@tauri-apps/api@^1.6.0`, `@tauri-apps/cli@^1.6.0`, and `cargo check` resolved `tauri v1.8.3`; current Tauri v2 documentation uses capability and permission files, so this task intentionally avoided a destructive v2 migration.

Delivered baseline:

- Added `src/services/desktop` with typed runtime detection, capability matrix, structured command results, dynamic Tauri imports, `openMarkdownFiles()` reuse of the existing picker stack, native window helpers, file-manager reveal helper, and explicit web fallback that does not mock native success.
- Added `src/stores/desktop.ts` as the Pinia runtime snapshot store and initialized it during application bootstrap without blocking app mount.
- Updated `src/utils/platform.ts` so Tauri detection accepts both `window.__TAURI__` and `window.__TAURI_INTERNALS__`.
- Added real Rust commands for `get_desktop_runtime_info`, `reveal_in_explorer`, `list_open_windows`, `focus_window`, `close_window`, and `create_new_window`, then registered them in `src-tauri/src/main.rs`.
- Updated `src-tauri/tauri.conf.json` for the baseline dev port, stable bundle identifier, main window label, and file drop flag while preserving the v1 allowlist model.
- Surfaced desktop runtime status in Settings > About with real web-mode unavailable/degraded states and no Emoji glyphs.

Verified evidence:

- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm build` passed; Vite still reports the pre-existing large chunk warning class.
- `cargo check` passed cleanly in `inkforge/src-tauri`.
- Playwright opened `http://127.0.0.1:5176/settings?tab=about` and verified `Desktop Runtime`, `Web Runtime`, `Application Info: degraded`, `Window Management: unavailable`, and `native desktop APIs are not mocked`; browser console errors were 0.
- Temporary Vite port `5176` was stopped and had no LISTENING process afterward.
- `git diff --check` passed for P1-18 touched files, with only Windows CRLF conversion notices.
- Emoji presentation scan passed for P1-18 touched files.

Remaining full Spec 18 scope stays Pending: file watcher and conflict resolution, tray menu, global shortcuts, QuickNoteWindow, updater notification endpoint flow, platform authentication, rich native clipboard, window-state persistence, package signing CI, multi-window drag/tab model, and the full native/manual/E2E matrix.
