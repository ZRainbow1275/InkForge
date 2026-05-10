# Spec 25 — 扩展/插件系统（沙箱 + API 边界）

| 字段 | 值 |
|---|---|
| Spec ID | 25 |
| 标题 | 扩展/插件系统（沙箱 + API 边界） |
| 状态 | 草稿 |
| 优先级 | P1 |
| 关联决策 | L1-37(D) / L1-38(C) |
| 关联 Spec | 24-permission-audit-spec / 23-sync-provider-spec |
| 作者 | InkForge Spec Engineer |
| 创建日期 | 2026-04-20 |

---

## 1. 背景与决策依据

### 1.1 铁律来源

- **L1-37 D**：完整插件 SDK——生命周期、权限、事件、UI 注入点全部开放；项目完全开源。
- **L1-38 C**：允许第三方扩展，但必须声明权限并受沙箱限制；定位为"服务于写作的集成"。

### 1.2 设计目标

1. 沙箱隔离：扩展代码运行在 Web Worker 中，无法直接访问 DOM 或主进程。
2. 权限最小化：扩展只能获得用户明确授权的 API 访问权限。
3. 开发友好：清晰的 API 边界 + 热重载支持 + 完整的 TypeScript 类型导出。
4. 防作恶：所有网络请求、存储写入、UI 注入均受权限声明约束。

---

## 2. 架构总览

```
主进程（Vue + Tauri）
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ExtensionHost                                                    │
│  ├── ExtensionRegistry（注册表，管理已安装扩展）                   │
│  ├── PermissionBroker（权限验证）                                 │
│  ├── APIGateway（API 调用路由 + 超时控制）                        │
│  └── UIInjector（工具栏按钮 / 菜单项 / 通知 / Modal）            │
│                          │ postMessage (JSON 序列化)               │
│                          │                                        │
│  ExtensionBridge ◄────── ┼ ──────────────────────────────────    │
│                          │                                        │
└──────────────────────────┼────────────────────────────────────────┘
                           │ Worker Message Channel
┌──────────────────────────┼────────────────────────────────────────┐
│  ExtensionRuntime (Web Worker 沙箱)                               │
│  ├── ExtensionSDK（暴露给扩展代码的 API 代理）                    │
│  ├── 扩展代码（entry.js，由开发者提供）                           │
│  └── 消息序列化 / 反序列化（JSON-only，禁止传递函数或类实例）     │
└───────────────────────────────────────────────────────────────────┘
```

### 2.1 核心组件职责

| 组件 | 位置 | 职责 |
|---|---|---|
| `ExtensionHost` | 主进程 | 管理扩展生命周期、启动/停止 Worker |
| `ExtensionRegistry` | 主进程 | 存储已安装扩展的 manifest 和状态 |
| `ExtensionBridge` | 主进程 | 接收 Worker 消息，路由到对应 API 处理器 |
| `APIGateway` | 主进程 | 权限验证 + 超时控制 + 审计记录 |
| `UIInjector` | 主进程（Vue） | 将扩展注册的 UI 元素注入宿主界面 |
| `ExtensionRuntime` | Web Worker | 运行扩展代码，提供 SDK 代理 |
| `ExtensionSDK` | Web Worker | 将 API 调用序列化为 postMessage |

---

## 3. ExtensionManifest Schema

每个扩展根目录必须包含 `inkforge-plugin.json`：

```typescript
// src/services/extensions/types.ts

export interface ExtensionManifest {
  /** 扩展唯一 ID，格式：{author}.{name}，例如：alice.markdown-counter */
  id: string;

  /** 显示名称 */
  name: string;

  /** 语义版本号，如 1.2.3 */
  version: string;

  /** 作者名或组织名 */
  author: string;

  /** 扩展简介（不超过 200 字符） */
  description: string;

  /** 入口文件路径（相对于 .zip 根目录） */
  entry: string;

  /** 图标文件路径（PNG/SVG，不超过 64x64）*/
  icon?: string;

  /** 主页/文档 URL */
  homepage?: string;

  /** 兼容的 InkForge 版本范围（semver range） */
  inkforgeVersion: string;

  /** 声明的权限列表 */
  permissions: ExtensionPermission[];

  /** 扩展自身配置 schema（JSON Schema 格式，用于 Settings UI 自动生成） */
  configSchema?: Record<string, unknown>;

  /** 默认配置值 */
  defaultConfig?: Record<string, unknown>;
}

export type ExtensionPermission =
  | 'editor:read'       // 读取编辑器内容（getContent / getSelection）
  | 'editor:write'      // 修改编辑器内容（insertText / addMark / addNode）
  | 'storage:read'      // 读取扩展命名空间存储
  | 'storage:write'     // 写入扩展命名空间存储
  | 'network:fetch'     // 发起网络请求（必须在 allowedOrigins 中声明目标域）
  | 'ui:command'        // 注册命令到 CommandRegistry
  | 'ui:toolbar'        // 向工具栏添加按钮
  | 'ui:menu'           // 向菜单添加项目
  | 'theme'             // 读取主题信息 / 监听主题变化
  | 'export';           // 注册导出适配器

export interface ExtensionState {
  manifest: ExtensionManifest;
  enabled: boolean;
  installedAt: number;
  updatedAt: number;
  configSnapshot: Record<string, unknown>;
  grantedPermissions: ExtensionPermission[];  // 用户实际授权的权限（可能少于声明）
  errorCount: number;
  lastErrorAt?: number;
  lastErrorMessage?: string;
}
```

### 3.1 Manifest 验证规则

安装时必须验证：
- `id` 格式：`/^[a-z0-9-]+\.[a-z0-9-]+$/`（全小写，点分隔）
- `version` 格式：合法 semver
- `entry` 文件存在于 .zip 内
- `permissions` 仅包含 `ExtensionPermission` 枚举值（无效权限直接拒绝安装）
- `inkforgeVersion` 与当前版本兼容
- `id` 在已安装扩展中唯一（若冲突则询问覆盖或重命名）

---

## 4. 权限清单（细粒度）

### 4.1 权限含义与限制

| 权限 | 允许操作 | 禁止操作 | 用户授权说明 |
|---|---|---|---|
| `editor:read` | getContent / getSelection / getCursorPosition | 任何写操作 | "读取您正在编辑的文档内容" |
| `editor:write` | insertText / addMark / addNode / setContent（受限） | 删除整个文档 / 修改版本历史 | "修改您正在编辑的文档内容" |
| `storage:read` | 读取该扩展命名空间下的键值 | 读取其他扩展的存储 / 读取用户文档 | "读取此扩展的本地数据" |
| `storage:write` | 写入该扩展命名空间下的键值 | 写入超出命名空间 / 写入用户文档 | "保存此扩展的本地设置和数据" |
| `network:fetch` | 向 allowedOrigins 声明的域发起 HTTP 请求 | 访问未声明的域 / 访问 file:// | "连接网络获取数据（域：xxx.com）" |
| `ui:command` | 在 CommandRegistry 注册 / 注销命令 | 覆盖已有命令 / 修改其他扩展的命令 | "在命令面板中添加自定义命令" |
| `ui:toolbar` | 在浮动工具栏添加按钮 | 移除 / 修改现有按钮 | "在工具栏添加自定义按钮" |
| `ui:menu` | 在右键菜单或应用菜单添加项目 | 修改现有菜单结构 | "在菜单中添加自定义选项" |
| `theme` | getTheme / onThemeChange 回调 | 修改全局主题 | "读取当前主题以适配样式" |
| `export` | 注册新的导出格式适配器 | 修改现有导出适配器 | "添加新的文档导出格式" |

### 4.2 `network:fetch` 的额外限制

声明 `network:fetch` 的扩展必须在 manifest 中附加 `allowedOrigins` 字段：

```json
{
  "permissions": ["network:fetch"],
  "networkPolicy": {
    "allowedOrigins": ["https://api.example.com", "https://cdn.example.org"],
    "maxRequestsPerMinute": 60,
    "maxResponseSizeBytes": 10485760
  }
}
```

运行时 APIGateway 在每次 `fetch` 调用前验证目标 URL 是否在白名单内。

---

## 5. ExtensionAPI 接口（宿主暴露给沙箱）

### 5.1 完整 API 定义

```typescript
// src/services/extensions/sdk-types.ts
// 此文件同时发布为 SDK 类型包供扩展开发者使用

export interface InkForgeExtensionAPI {
  editor: EditorAPI;
  storage: StorageAPI;
  command: CommandAPI;
  ui: UIAPI;
  export: ExportAPI;
  theme: ThemeAPI;
  lifecycle: LifecycleAPI;
}

// ─────────── Editor API ───────────
export interface EditorAPI {
  /** 获取当前文档完整 HTML 内容（需要 editor:read） */
  getContent(): Promise<string>;

  /** 获取当前文档 Markdown 内容（需要 editor:read） */
  getMarkdown(): Promise<string>;

  /** 获取当前选区文本（需要 editor:read） */
  getSelection(): Promise<{ text: string; from: number; to: number } | null>;

  /** 获取当前光标位置（需要 editor:read） */
  getCursorPosition(): Promise<number>;

  /** 在光标位置插入文本（需要 editor:write） */
  insertText(text: string): Promise<void>;

  /** 对选区添加格式标记（需要 editor:write） */
  addMark(markType: string, attrs?: Record<string, unknown>): Promise<void>;

  /** 插入自定义节点（需要 editor:write，节点类型须在 manifest 中声明） */
  addNode(nodeType: string, attrs?: Record<string, unknown>, content?: string): Promise<void>;

  /** 监听编辑器内容变化（需要 editor:read） */
  onContentChange(callback: (content: string) => void): () => void;

  /** 监听选区变化（需要 editor:read） */
  onSelectionChange(callback: (selection: { from: number; to: number } | null) => void): () => void;
}

// ─────────── Storage API ───────────
export interface StorageAPI {
  /** 读取键值（需要 storage:read，自动限定在扩展命名空间） */
  get<T = unknown>(key: string): Promise<T | undefined>;

  /** 写入键值（需要 storage:write） */
  set<T = unknown>(key: string, value: T): Promise<void>;

  /** 删除键（需要 storage:write） */
  delete(key: string): Promise<void>;

  /** 列出所有键（需要 storage:read，只列出本扩展的键） */
  list(prefix?: string): Promise<string[]>;

  /** 清空本扩展所有存储（需要 storage:write） */
  clear(): Promise<void>;
}

// ─────────── Command API ───────────
export interface CommandSpec {
  id: string;             // 扩展内唯一，最终 ID 会加前缀：{extId}.{id}
  label: string;
  icon?: string;          // lucide 图标名
  shortcut?: string;
  description?: string;
  handler(): Promise<void>;
}

export interface CommandAPI {
  /** 注册命令（需要 ui:command） */
  register(command: CommandSpec): Promise<void>;

  /** 注销命令（需要 ui:command） */
  unregister(id: string): Promise<void>;
}

// ─────────── UI API ───────────
export interface ToolbarButtonSpec {
  id: string;
  label: string;
  icon: string;           // lucide 图标名
  tooltip?: string;
  onClick(): Promise<void>;
  isActive?(): Promise<boolean>;
  isDisabled?(): Promise<boolean>;
}

export interface MenuItemSpec {
  id: string;
  label: string;
  icon?: string;
  target: 'context-menu' | 'editor-menu';
  position?: 'top' | 'bottom';
  onClick(): Promise<void>;
}

export interface NotificationSpec {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  durationMs?: number;
}

export interface UIAPI {
  /** 向浮动工具栏添加按钮（需要 ui:toolbar） */
  addToolbarButton(spec: ToolbarButtonSpec): Promise<() => void>;

  /** 向菜单添加项目（需要 ui:menu） */
  addMenuItem(spec: MenuItemSpec): Promise<() => void>;

  /** 显示通知 Toast（无需权限，但有频率限制：每分钟最多 10 次） */
  showNotification(spec: NotificationSpec): Promise<void>;

  /**
   * 打开扩展 Modal（无需权限，但 content 只能是扩展自己的 HTML 字符串，
   * 渲染在 sandboxed iframe 中）
   */
  openModal(options: {
    title: string;
    contentHtml: string;
    width?: number;
    height?: number;
  }): Promise<void>;
}

// ─────────── Export API ───────────
export interface ExportAdapterSpec {
  /** 适配器 ID（最终 ID 加前缀：{extId}.{id}） */
  id: string;
  label: string;
  description?: string;
  fileExtension: string;
  mimeType: string;
  handler(content: string, options: Record<string, unknown>): Promise<string | Uint8Array>;
}

export interface ExportAPI {
  /** 注册导出格式适配器（需要 export） */
  registerAdapter(spec: ExportAdapterSpec): Promise<void>;
}

// ─────────── Theme API ───────────
export interface ThemeInfo {
  mode: 'light' | 'dark';
  primaryColor: string;
  fontFamily: string;
  fontSize: number;
}

export interface ThemeAPI {
  /** 获取当前主题信息（需要 theme） */
  getTheme(): Promise<ThemeInfo>;

  /** 监听主题变化（需要 theme） */
  onThemeChange(callback: (theme: ThemeInfo) => void): () => void;
}

// ─────────── Lifecycle API ───────────
export interface LifecycleAPI {
  /** 获取扩展自身 ID */
  getExtensionId(): string;

  /** 获取扩展版本 */
  getVersion(): string;

  /** 记录日志（输出到 ExtensionHost 的日志收集器，在开发者面板可见） */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void;

  /** 获取扩展配置（用户在 Settings 中配置的值） */
  getConfig<T = Record<string, unknown>>(): Promise<T>;

  /** 监听配置变化 */
  onConfigChange<T = Record<string, unknown>>(callback: (config: T) => void): () => void;
}
```

---

## 6. 沙箱机制

### 6.1 Worker 沙箱约束

| 约束项 | 实现方式 | 说明 |
|---|---|---|
| 无 DOM 访问 | Web Worker 天然限制 | Worker 内无 document / window |
| 无主进程内存访问 | postMessage 序列化 | 所有数据通过 JSON 传递 |
| 禁止传递函数 | 序列化验证 | 发送函数或循环引用时抛出错误 |
| API 调用超时 | APIGateway 5s 超时 | 超时后 reject + 记录错误 |
| 网络请求限制 | `allowedOrigins` 白名单 + 频率限制 | 非白名单域直接拒绝 |
| 存储命名空间隔离 | 自动加前缀 `ext:{extId}:` | 扩展只能访问自己的键 |
| `eval` 禁止 | Worker CSP | 不允许动态代码执行 |

### 6.2 消息协议

主进程与 Worker 之间的消息格式：

```typescript
// 请求（Worker → 主进程）
interface ExtensionRequest {
  requestId: string;      // nanoid，用于响应匹配
  extensionId: string;
  api: string;            // 如 "editor.getContent"
  method: string;
  params: unknown[];
}

// 响应（主进程 → Worker）
interface ExtensionResponse {
  requestId: string;
  success: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

// 推送事件（主进程 → Worker，用于监听器回调）
interface ExtensionEvent {
  eventId: string;
  extensionId: string;
  eventName: string;
  payload: unknown;
}
```

### 6.3 超时控制

```typescript
// src/services/extensions/apiGateway.ts

const API_TIMEOUT_MS = 5000;

async function callExtensionAPI(
  extensionId: string,
  api: string,
  method: string,
  params: unknown[]
): Promise<unknown> {
  // 1. 权限验证
  const permission = API_PERMISSION_MAP[`${api}.${method}`];
  if (permission && !hasPermission(extensionId, permission)) {
    throw new ExtensionPermissionError(`${api}.${method} requires ${permission}`);
  }

  // 2. 执行调用，超时控制
  return Promise.race([
    executeAPI(extensionId, api, method, params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new ExtensionTimeoutError(`API call timed out: ${api}.${method}`)), API_TIMEOUT_MS)
    ),
  ]);
}
```

---

## 7. ExtensionHost 生命周期

### 7.1 扩展生命周期状态机

```
installed
    │
  enable
    │
    ▼
loading ──error──► error
    │
  ready
    │
    ▼
 active ──error──► error（错误计数，超过 5 次自动禁用）
    │
  disable
    │
    ▼
disabled
    │
  uninstall
    │
    ▼
(removed)
```

### 7.2 生命周期事件

扩展 entry 文件的标准结构：

```javascript
// 扩展 entry.js 示例

export function onActivate(api) {
  // 扩展激活时调用
  // api = InkForgeExtensionAPI 实例
}

export function onDeactivate() {
  // 扩展停用时调用（清理资源、移除监听器）
}

export function onConfigChange(newConfig) {
  // 用户修改扩展配置时调用
}
```

### 7.3 错误隔离

```typescript
// src/services/extensions/host.ts

class ExtensionHost {
  private workers: Map<string, Worker> = new Map();
  private errorCounts: Map<string, number> = new Map();

  private handleWorkerError(extensionId: string, error: ErrorEvent): void {
    const count = (this.errorCounts.get(extensionId) ?? 0) + 1;
    this.errorCounts.set(extensionId, count);

    // 记录错误日志
    useExtensionStore().recordError(extensionId, error.message);

    // 错误次数超过 5 次，自动禁用
    if (count >= 5) {
      this.disable(extensionId);
      // 通知用户
      useToastStore().show({
        type: 'warning',
        message: `扩展 "${extensionId}" 因多次错误已被自动禁用`,
        action: { label: '查看详情', handler: () => openExtensionDetail(extensionId) },
      });
    }
  }
}
```

---

## 8. 扩展商店 UI

### 8.1 商店主页布局

```
Settings > 扩展
├── 顶部搜索栏：[搜索扩展名 / 功能关键词]
├── 分类过滤：全部 / 写作辅助 / 导出格式 / 主题 / 知识源 / 发布平台
├── 排序：最新 / 最受欢迎 / 评分最高
│
├── 已安装扩展（置顶区域）
│   └── ExtensionCard × N
│       ├── [图标] 名称  作者
│       ├── 简介（truncate 2行）
│       ├── 版本 / 安装日期
│       ├── 状态指示（启用/禁用/错误）
│       └── [设置] [禁用/启用] [卸载]
│
└── 扩展库（v2.1 仅本地安装，远期接入在线商店）
    └── 说明文案："从本地安装 .zip 文件"
        [选择文件安装] 按钮 / 拖拽区
```

### 8.2 ExtensionCard 组件规格

```typescript
// src/components/extensions/ExtensionCard.vue

interface ExtensionCardProps {
  extensionId: string;
  manifest: ExtensionManifest;
  state: ExtensionState;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
  onOpenSettings: () => void;
  onViewDetail: () => void;
}
```

**卡片操作**：

| 操作 | 触发条件 | 防呆措施 |
|---|---|---|
| 启用 | state.enabled = false | 无 |
| 禁用 | state.enabled = true | 弹确认："禁用后扩展将停止工作" |
| 卸载 | 任何状态 | 弹 DangerConfirmDialog（click 模式）|
| 查看详情 | 点击卡片 | 打开详情侧边板 |

### 8.3 扩展详情侧边板

```
┌─────────────────────────────────────────────────────────┐
│  [图标] 名称（版本）                       [X 关闭]     │
│  作者：xxx   主页链接                                    │
├─────────────────────────────────────────────────────────┤
│  描述                                                    │
│  [完整描述文本]                                          │
├─────────────────────────────────────────────────────────┤
│  权限                                                    │
│  [editor:read] 读取文档内容                             │
│  [editor:write] 修改文档内容                            │
│  [network:fetch] 连接网络（api.example.com）            │
├─────────────────────────────────────────────────────────┤
│  配置（基于 configSchema 自动生成表单）                  │
│  [配置项 1] ...                                         │
│  [配置项 2] ...                                         │
│  [保存配置]                                             │
├─────────────────────────────────────────────────────────┤
│  错误日志（最近 20 条）                                  │
│  [时间] [级别] [消息]                                   │
├─────────────────────────────────────────────────────────┤
│  [启用/禁用] [卸载] [报告问题]                           │
└─────────────────────────────────────────────────────────┘
```

---

## 9. 本地安装流程

### 9.1 从 .zip 文件安装

```
1. 用户点击 [选择文件安装] 或拖拽 .zip 到目标区域
2. 读取 .zip 文件（Tauri fs API）
3. 解压并查找 inkforge-plugin.json
   └── 未找到 → Toast 错误："这不是有效的 InkForge 扩展"
4. 解析并验证 manifest
   └── 验证失败 → 显示具体错误（如"版本号格式无效"）
5. 检查 inkforgeVersion 兼容性
   └── 不兼容 → 警告弹框，询问是否继续
6. 检查 ID 冲突
   └── 已存在同 ID → 弹框："已安装同名扩展 v{旧版}，是否升级到 v{新版}？"
7. 显示权限授权弹框（Section 9.2）
   └── 用户拒绝任何必须权限 → 中止安装
8. 将解压内容复制到 `{appData}/extensions/{extId}/`
9. 写入 IndexedDB extensions 表
10. 调用 ExtensionHost.install(extensionId)
11. 显示成功 Toast："扩展已安装：{name}"
12. 写入审计日志：system.plugin_install
```

### 9.2 权限授权弹框

```
┌────────────────────────────────────────────────────────────────┐
│  "Markdown Counter" 请求以下权限                               │
├────────────────────────────────────────────────────────────────┤
│  [文档图标] 读取您正在编辑的文档内容                           │
│             此权限用于统计字数和段落数                         │
│                                                                │
│  [网络图标] 连接网络（api.wordcount.io）                      │
│             此权限用于上传统计数据到云端（可选功能）           │
├────────────────────────────────────────────────────────────────┤
│  [此扩展完全开源，代码可在 github.com/alice/md-counter 查看]  │
├────────────────────────────────────────────────────────────────┤
│  [拒绝安装]                              [允许并安装]          │
└────────────────────────────────────────────────────────────────┘
```

**规则**：
- 每个权限单独列出，附带扩展开发者提供的说明（来自 manifest `permissionDescriptions`）
- 若 manifest 未提供说明，使用默认描述
- 不允许"部分授权"（全部接受或拒绝）——v2.1 设计，未来可细化
- 安装后授权记录在 `state.grantedPermissions` 中持久化

---

## 10. 热重载（开发模式）

仅在 Settings > 高级 > 开发者模式开启时可用。

### 10.1 热重载触发机制

```typescript
// src/services/extensions/devReload.ts

export class ExtensionDevReloader {
  private watchers: Map<string, FSWatcher> = new Map();

  async watch(extensionId: string, entryPath: string): Promise<void> {
    const watcher = watch(entryPath, { persistent: true });
    watcher.on('change', async () => {
      console.log(`[ExtensionDevReloader] ${extensionId} changed, reloading...`);
      await extensionHost.disable(extensionId);
      await extensionHost.enable(extensionId);
      useToastStore().show({
        type: 'info',
        message: `扩展 "${extensionId}" 已热重载`,
      });
    });
    this.watchers.set(extensionId, watcher);
  }

  async unwatch(extensionId: string): Promise<void> {
    const watcher = this.watchers.get(extensionId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(extensionId);
    }
  }
}
```

---

## 11. 扩展状态持久化

### 11.1 IndexedDB 表结构

```typescript
// src/db/schema.ts (新增)

interface ExtensionRecord {
  id: string;                      // 扩展 ID
  profileId: string;               // 所属 Profile（每个 Profile 独立管理扩展列表）
  manifest: ExtensionManifest;     // 完整 manifest
  enabled: boolean;
  installedAt: number;
  updatedAt: number;
  configSnapshot: Record<string, unknown>;  // 用户配置的当前值
  grantedPermissions: ExtensionPermission[];
  errorCount: number;
  lastErrorAt?: number;
  lastErrorMessage?: string;
}

// 表名：extensions
// 主键：[id+profileId]
// 索引：profileId, enabled
```

### 11.2 扩展存储命名空间

扩展 StorageAPI 使用 IndexedDB 单独的 `extension_storage` 表：

```typescript
interface ExtensionStorageEntry {
  key: string;     // 格式：ext:{extId}:{userKey}
  value: string;   // JSON 序列化后的值
  updatedAt: number;
}

// 表名：extension_storage
// 主键：key
// 索引：key（前缀查询用于 list() 操作）
```

---

## 12. Store 定义

```typescript
// src/stores/extension.ts

interface ExtensionStoreState {
  extensions: ExtensionRecord[];
  activeExtensions: string[];   // 当前已启用的扩展 ID 列表
  loading: boolean;
  installing: boolean;
  currentInstallingId?: string;
}

export const useExtensionStore = defineStore('extension', {
  state: (): ExtensionStoreState => ({
    extensions: [],
    activeExtensions: [],
    loading: false,
    installing: false,
  }),

  getters: {
    enabledExtensions: (state) =>
      state.extensions.filter(e => e.enabled),

    getById: (state) => (id: string) =>
      state.extensions.find(e => e.id === id),

    erroredExtensions: (state) =>
      state.extensions.filter(e => e.errorCount >= 5),
  },

  actions: {
    async loadExtensions(profileId: string): Promise<void> {
      this.loading = true;
      const repo = new ExtensionRepository();
      this.extensions = await repo.getByProfile(profileId);
      this.activeExtensions = this.extensions
        .filter(e => e.enabled)
        .map(e => e.id);
      this.loading = false;
    },

    async install(record: ExtensionRecord): Promise<void> {
      this.extensions.push(record);
    },

    async toggle(id: string, enabled: boolean): Promise<void> {
      const ext = this.extensions.find(e => e.id === id);
      if (ext) ext.enabled = enabled;
      if (enabled) {
        this.activeExtensions.push(id);
      } else {
        this.activeExtensions = this.activeExtensions.filter(i => i !== id);
      }
    },

    async uninstall(id: string): Promise<void> {
      this.extensions = this.extensions.filter(e => e.id !== id);
      this.activeExtensions = this.activeExtensions.filter(i => i !== id);
    },

    recordError(id: string, message: string): void {
      const ext = this.extensions.find(e => e.id === id);
      if (ext) {
        ext.errorCount++;
        ext.lastErrorAt = Date.now();
        ext.lastErrorMessage = message;
      }
    },
  },
});
```

---

## 13. Repository 定义

```typescript
// src/repositories/ExtensionRepository.ts

export class ExtensionRepository {
  async getByProfile(profileId: string): Promise<ExtensionRecord[]> {
    return db.extensions.where('profileId').equals(profileId).toArray();
  }

  async save(record: ExtensionRecord): Promise<void> {
    await db.extensions.put(record);
  }

  async delete(id: string, profileId: string): Promise<void> {
    await db.extensions.where('[id+profileId]').equals([id, profileId]).delete();
  }

  async updateConfig(id: string, profileId: string, config: Record<string, unknown>): Promise<void> {
    await db.extensions.update([id, profileId], { configSnapshot: config, updatedAt: Date.now() });
  }

  async updateEnabled(id: string, profileId: string, enabled: boolean): Promise<void> {
    await db.extensions.update([id, profileId], { enabled, updatedAt: Date.now() });
  }

  // 扩展存储
  async storageGet(extId: string, key: string): Promise<unknown | undefined> {
    const fullKey = `ext:${extId}:${key}`;
    const entry = await db.extension_storage.get(fullKey);
    return entry ? JSON.parse(entry.value) : undefined;
  }

  async storageSet(extId: string, key: string, value: unknown): Promise<void> {
    const fullKey = `ext:${extId}:${key}`;
    await db.extension_storage.put({
      key: fullKey,
      value: JSON.stringify(value),
      updatedAt: Date.now(),
    });
  }

  async storageDelete(extId: string, key: string): Promise<void> {
    await db.extension_storage.delete(`ext:${extId}:${key}`);
  }

  async storageList(extId: string, prefix?: string): Promise<string[]> {
    const fullPrefix = `ext:${extId}:${prefix ?? ''}`;
    const keys = await db.extension_storage
      .where('key').startsWith(fullPrefix)
      .keys() as string[];
    return keys.map(k => k.replace(`ext:${extId}:`, ''));
  }

  async storageClear(extId: string): Promise<void> {
    const fullPrefix = `ext:${extId}:`;
    const keys = await db.extension_storage
      .where('key').startsWith(fullPrefix)
      .primaryKeys();
    await db.extension_storage.bulkDelete(keys);
  }
}
```

---

## 14. 安全约束总结

1. 扩展代码运行在 Web Worker 中，无法访问 DOM、主进程内存、Tauri API。
2. 所有 API 调用通过 postMessage JSON 序列化，禁止传递函数、类实例、Proxy 对象。
3. `network:fetch` 请求必须经过 APIGateway 的域名白名单验证，不可绕过。
4. 扩展存储通过命名空间前缀隔离，扩展 A 不可读写扩展 B 的数据。
5. 扩展注册的命令 ID 自动加 `{extId}.` 前缀，防止命名冲突。
6. 连续 5 次错误自动禁用扩展，防止异常扩展拖累主进程。
7. 所有安装/卸载操作写入审计日志（Spec 24）。
8. v2.1 不实现扩展签名验证（L1-38 C 不走 D 的重流程），但在 manifest 中预留 `signature` 字段。
9. 扩展 Modal 的 contentHtml 在 sandboxed iframe 中渲染（无脚本执行权限）。
10. 扩展日志仅在开发者模式下可见，不暴露给生产用户。

---

## 15. 性能约束

| 指标 | 目标值 | 说明 |
|---|---|---|
| 扩展启动延迟（单个） | ≤ 500ms | Worker 创建 + 扩展 onActivate 调用 |
| API 调用超时 | 5s | 所有扩展 API 调用均受此约束 |
| 扩展 UI 注入延迟 | ≤ 100ms | 工具栏按钮/菜单项添加后 100ms 内可见 |
| 存储读写 | ≤ 20ms | 单键操作 |
| 热重载延迟 | ≤ 1s | 文件变更到新版本 active |

---

## 16. 测试矩阵（≥ 30 条）

| 编号 | 类型 | 测试场景 | 预期结果 |
|---|---|---|---|
| T-01 | 单元 | manifest 解析：合法 manifest 通过验证 | 无错误 |
| T-02 | 单元 | manifest 验证：无效 id 格式拒绝 | 抛出 ValidationError |
| T-03 | 单元 | manifest 验证：无效权限名拒绝 | 抛出 ValidationError |
| T-04 | 单元 | manifest 验证：inkforgeVersion 不兼容 | 返回兼容性警告 |
| T-05 | 单元 | 消息序列化：函数传递被拒绝 | 抛出 SerializationError |
| T-06 | 单元 | 消息序列化：循环引用被拒绝 | 抛出 SerializationError |
| T-07 | 单元 | API 超时：5s 未响应 reject | Promise reject 含 ExtensionTimeoutError |
| T-08 | 单元 | 权限检查：未授权 editor:write 调用失败 | 抛出 ExtensionPermissionError |
| T-09 | 单元 | 存储命名空间：扩展 A 无法读取扩展 B 的键 | 返回 undefined |
| T-10 | 单元 | 命令 ID 前缀：注册命令自动加扩展前缀 | 实际 ID = {extId}.{commandId} |
| T-11 | 单元 | network:fetch 白名单：非白名单域被拒绝 | 抛出 NetworkPermissionError |
| T-12 | 单元 | network:fetch 频率限制：超出限制报错 | 抛出 RateLimitError |
| T-13 | 单元 | 错误计数：5 次错误触发自动禁用 | state.enabled = false |
| T-14 | 集成 | 从 .zip 安装：正确 manifest 安装成功 | extensions 表存在记录 |
| T-15 | 集成 | 从 .zip 安装：缺少 inkforge-plugin.json 失败 | Toast 显示错误提示 |
| T-16 | 集成 | 从 .zip 安装：ID 冲突弹更新确认 | 弹框询问升级 |
| T-17 | 集成 | 权限授权弹框：用户确认后安装成功 | grantedPermissions 写入 |
| T-18 | 集成 | Worker 启动：onActivate 调用 | 扩展状态变为 active |
| T-19 | 集成 | Worker 停用：onDeactivate 调用 | 扩展状态变为 disabled |
| T-20 | 集成 | Editor API：getContent 返回 HTML | 内容与编辑器一致 |
| T-21 | 集成 | Editor API：insertText 在光标位置插入 | 文档内容更新 |
| T-22 | 集成 | Storage API：set + get 往返一致 | 读写内容相同 |
| T-23 | 集成 | Storage API：clear 清空所有键 | list() 返回空数组 |
| T-24 | 集成 | Command API：注册命令在 Palette 可搜索 | 命令出现在 Command Palette 结果中 |
| T-25 | 集成 | UI API：addToolbarButton 按钮出现在工具栏 | 工具栏可见新按钮 |
| T-26 | 集成 | UI API：showNotification 触发 Toast | Toast 显示正确消息 |
| T-27 | 集成 | Theme API：getTheme 返回当前主题信息 | 主题 mode 与应用一致 |
| T-28 | 集成 | Export API：注册适配器出现在导出选项 | 导出对话框列出新格式 |
| T-29 | E2E | 热重载：修改 entry.js 后 1s 内重载 | 新版本行为生效 |
| T-30 | E2E | 卸载扩展：完整清理 Worker / DB / 存储 | extensions 表无记录，UI 无残留 |
| T-31 | E2E | 审计日志：安装扩展写入 system.plugin_install | 审计日志可查询 |
| T-32 | E2E | 审计日志：卸载扩展写入 system.plugin_uninstall | 审计日志可查询 |
| T-33 | 性能 | 单扩展启动延迟 | ≤ 500ms |
| T-34 | 性能 | 10 个扩展同时启动 | ≤ 3s 总计 |

---

## 17. 扩展版本兼容性与升级策略

### 17.1 版本兼容性检查

在安装和每次 InkForge 升级后，ExtensionHost 会对已安装扩展进行版本兼容性检查：

```typescript
// src/services/extensions/compatibilityChecker.ts

export function checkCompatibility(
  manifest: ExtensionManifest,
  inkforgeVersion: string
): CompatibilityResult {
  const range = manifest.inkforgeVersion;

  if (!semver.satisfies(inkforgeVersion, range)) {
    return {
      compatible: false,
      reason: `扩展要求 InkForge ${range}，当前版本 ${inkforgeVersion}`,
      action: 'disable',
    };
  }

  return { compatible: true };
}

export interface CompatibilityResult {
  compatible: boolean;
  reason?: string;
  action?: 'disable' | 'warn';
}
```

### 17.2 扩展升级流程

当用户安装同 ID 的更新版本时：

```
1. 解析新 manifest，与已安装版本比较
2. 展示变更摘要：
   - 版本：1.0.0 → 1.1.0
   - 新增权限（若有）：需要用户重新确认
   - 移除权限（若有）：自动更新 grantedPermissions
3. 若新增权限：显示权限授权弹框（同首次安装流程）
4. 确认后：停止旧 Worker → 替换文件 → 启动新 Worker
5. 配置迁移：检查 configSchema 变化，运行 migration 函数（若 manifest 提供）
6. 写入审计日志：system.plugin_install（含 from_version / to_version）
```

### 17.3 扩展配置迁移

manifest 可提供可选的配置迁移函数声明（通过 entry 文件导出）：

```javascript
// 扩展 entry.js 中的可选导出
export function migrateConfig(oldConfig, fromVersion, toVersion) {
  // 返回新的配置对象
  if (fromVersion === '1.0.0' && toVersion === '1.1.0') {
    return {
      ...oldConfig,
      newField: oldConfig.legacyField ?? 'default',
    };
  }
  return oldConfig;
}
```

---

## 18. 落地文件索引

| 文件路径 | 说明 |
|---|---|
| `src/services/extensions/types.ts` | 核心类型定义（Manifest / Permission / State） |
| `src/services/extensions/sdk-types.ts` | ExtensionAPI 接口定义（同时作为 SDK 类型包） |
| `src/services/extensions/host.ts` | ExtensionHost 主进程管理器 |
| `src/services/extensions/bridge.ts` | ExtensionBridge 消息路由 |
| `src/services/extensions/apiGateway.ts` | API 权限验证 + 超时控制 |
| `src/services/extensions/uiInjector.ts` | UI 元素注入器 |
| `src/services/extensions/devReload.ts` | 热重载服务（开发模式） |
| `src/services/extensions/installer.ts` | 从 .zip 安装流程 |
| `src/services/extensions/compatibilityChecker.ts` | 版本兼容性检查 |
| `src/services/extensions/runtime/worker.ts` | Web Worker 入口（ExtensionRuntime） |
| `src/services/extensions/runtime/sdk.ts` | ExtensionSDK 代理实现 |
| `src/repositories/ExtensionRepository.ts` | 数据访问层 |
| `src/stores/extension.ts` | Pinia Store |
| `src/components/extensions/ExtensionCard.vue` | 扩展卡片组件 |
| `src/components/extensions/ExtensionDetail.vue` | 扩展详情侧边板 |
| `src/components/extensions/PermissionGrantDialog.vue` | 权限授权弹框 |
| `src/components/extensions/UpgradeConfirmDialog.vue` | 升级确认弹框 |
| `src/views/settings/ExtensionsTab.vue` | Settings > 扩展 Tab |

---

## 19. 2026-05-01 基线实现记录

### 19.1 已落地范围

- 已在 `inkforge/src/services/extensions/` 增加真实本地扩展基线：严格 Zod manifest 校验、权限声明、网络 origin allowlist、命令权限声明、生命周期 host、Dexie repository、profile-scoped extension storage。
- 已在 `InkForgeDB` schema v9 增加 `extensions` 与 `extensionStorage` 表，保留既有文章、审计、权限、同步、账户、FTUE 和素材表，不迁移或删除现有数据。
- 已接入 Spec 24 审计链路：本地 manifest 安装写 `system.plugin_install`，启用失败写 `system.plugin_enable`，停用写 `system.plugin_disable`，卸载写 `system.plugin_uninstall`。
- 已接入既有 `CommandRegistry.registerExtension()`，扩展命令必须满足 `ext.{extensionId}.` 前缀、扩展 granted permission `ui:command`、以及 manifest `commandPermissions` 三重门禁。
- 已在 Settings 增加“扩展插件”Tab，可导入或粘贴真实 `inkforge-plugin.json`，展示 installed/enabled/blocked/error 计数、权限、命令权限、错误、阻断原因，并支持刷新、启用、停用、卸载。

### 19.2 安全边界

- 当前基线不执行任意第三方 JS，不复制扩展包，不伪造在线市场、签名校验、热重载或 Worker runtime 成功。
- `ExtensionHost.hasRuntimeSandbox()` 当前返回 `false`，启用扩展会 fail-closed，持久化 `blocked` 状态和 `extension-runtime-unavailable` 证据。
- `network:fetch` 必须声明至少一个精确 `http(s)` origin，禁止 wildcard；非 localhost 的 `http` origin 会被拒绝。
- 扩展 storage 仅接受 JSON-serializable 值，key 受正则和长度限制，并以 `profileId + extensionId + key` 命名空间隔离。

### 19.3 验收证据

- `pnpm exec vitest run src/services/extensions/extensions.test.ts src/services/command/fuzzy-search.test.ts` 通过：2 files / 12 tests。
- `pnpm exec vitest run` 通过：6 files / 39 tests。
- `pnpm exec vue-tsc --noEmit` 通过。
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` 通过。
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` 通过；仅保留既有动态/静态 import 与大 chunk 警告。
- Production preview smoke：`/settings?tab=extensions` active tab display 为 `block`，安装真实本地 manifest 后 `extensions` 计数变为 1，启用动作真实 fail-closed 为 `blocked`，页面显示 `extension-runtime-unavailable`，console error 为 0。

### 19.4 后续完整实现缺口

- Web Worker runtime、postMessage bridge、API gateway、UI injector、插件包 unzip/copy、签名校验、热重载、升级确认与在线 marketplace 仍属于后续完整切片；本轮没有用 mock 或模拟成功替代这些能力。
