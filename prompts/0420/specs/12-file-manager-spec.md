> 版本: v2.1 | 状态: Draft | 关联决策: N-01, N-02, N-03, N-04, N-06, F-01~F-08 | 依赖 Spec: 11-document-lifecycle-spec.md, 29-search-engine-spec.md, 47-tag-system-spec.md, 31-version-bundle-spec.md

# Spec 12 — 文件管理器（FileManager）

---

## 目录

1. 概述与设计目标
2. 架构总览
3. TypeScript 类型系统
4. 视图模式
5. 节点 CRUD
6. 排序系统
7. 过滤系统
8. 多选与批量操作
9. 虚拟滚动
10. 折叠状态持久化
11. Context Menu
12. 图标系统
13. 空态设计
14. 智能文件夹（SmartFolder）
15. 回收站集成
16. 归档视图集成
17. Store 定义
18. Repository 定义
19. 键盘交互规范
20. 测试矩阵

---

## 1. 概述与设计目标

文件管理器（FileManager）是 InkForge 主界面左侧 Sidebar 的核心组件，承载文档与文件夹的全部组织能力。它是用户与文档库交互的主入口，也是文档生命周期状态（DocumentStatus）、标签、SmartFolder 等系统的可视化载体。

### 1.1 核心职责

- 展示文档/文件夹树形结构，支持多视图切换
- 提供完整的节点 CRUD 能力（新建/重命名/移动/删除）
- 集成文档状态机（DocumentStatus），状态在列表项实时呈现
- 提供强大的排序与过滤能力，支持持久化为 SmartFolder
- 支持多选与批量操作（覆盖全生命周期动作）
- 在 1000+ 节点规模下通过虚拟滚动保证流畅

### 1.2 设计约束

- 不破坏纸张式写作气质（铁律 4，L1-12 B）
- 状态展示必须一致（文件管理器、Hub 卡片、TabBar 三处联动，决策 N-05）
- 所有危险操作必须经过二次确认（L1-40 C 防呆）
- 软删除而非硬删除（L1-42 D，文档落入回收站）
- 图标必须使用 lucide-vue-next，不使用 emoji

### 1.3 设计借鉴

- Typora / iA Writer：侧边栏简洁克制
- VS Code：树形结构、键盘导航、Context Menu 模式
- Linear：状态筛选面板
- Notion：拖拽交互视觉反馈

---

## 2. 架构总览

```
FileManagerView (src/views/FileManagerView.vue)
├── FileManagerToolbar          — 顶部：新建按钮、视图切换、搜索框
├── SmartFolderSection          — SmartFolder 列表（Favorites / Pinned / Recent）
├── FileTreeSection             — 树形/文件夹/平铺/最近视图
│   ├── VirtualScrollContainer  — useVirtualScroll 钩子
│   ├── FileNode                — 文档节点（含状态 badge / dirty dot）
│   └── FolderNode              — 文件夹节点（折叠/展开）
├── BulkActionBar               — 多选模式底部工具栏
└── ContextMenuPortal           — 右键菜单（teleport 到 body）
```

**数据流**：
```
useFileManagerStore ──reads──> FileManagerRepository
useFileManagerStore ──updates──> IndexedDB (via StorageService)
FileManagerView ──watches──> useFileManagerStore.tree
FileManagerView ──dispatches──> useFileManagerStore.actions
```

---

## 3. TypeScript 类型系统

```typescript
// src/types/file-manager.ts

/** 文档在文件管理器中的显示状态 */
export type DocumentStatus =
  | 'draft'
  | 'writing'
  | 'review'
  | 'ready_to_publish'
  | 'published'
  | 'archived';

/** 排序维度 */
export type SortField =
  | 'name'
  | 'updatedAt'
  | 'createdAt'
  | 'size'
  | 'status';

/** 排序方向 */
export type SortDirection = 'asc' | 'desc';

/** 每个文件夹独立的排序配置 */
export interface SortConfig {
  field: SortField;
  direction: SortDirection;
  /** 文件夹在文档前还是混排 */
  foldersFirst: boolean;
}

/** 过滤配置 */
export interface FilterConfig {
  query: string;
  statuses: DocumentStatus[];
  tagIds: string[];
  /** 文件类型过滤 */
  types: FileNodeType[];
  /** 是否显示归档文档 */
  includeArchived: boolean;
}

/** 文件夹节点类型 */
export type FileNodeType = 'folder' | 'document';

/** 基础节点接口 */
export interface BaseNode {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** 文档节点 */
export interface FileNode extends BaseNode {
  type: 'document';
  status: DocumentStatus;
  wordCount: number;
  tagIds: string[];
  isDirty: boolean;
  excerpt?: string;
  coverUrl?: string;
}

/** 文件夹节点 */
export interface FolderNode extends BaseNode {
  type: 'folder';
  childCount: number;
  isExpanded: boolean;
  sortConfig: SortConfig;
}

/** 树节点（联合类型） */
export type TreeNode = FileNode | FolderNode;

/** 虚拟化列表项（带层级信息） */
export interface VirtualTreeItem {
  node: TreeNode;
  depth: number;
  isVisible: boolean;
  index: number;
}

/** Context Menu 动作 */
export interface ContextMenuAction {
  id: string;
  label: string;
  icon: string;
  /** 键盘快捷键提示（仅显示） */
  shortcut?: string;
  dividerBefore?: boolean;
  disabled?: boolean;
  danger?: boolean;
  handler: (nodeIds: string[]) => void | Promise<void>;
}

/** 批量操作类型 */
export type BulkActionType =
  | 'move'
  | 'delete'
  | 'addTag'
  | 'removeTag'
  | 'changeStatus'
  | 'archive'
  | 'export'
  | 'restore';

/** 批量操作结果 */
export interface BulkActionResult {
  success: string[];
  failed: Array<{ id: string; reason: string }>;
}

/** SmartFolder（虚拟分类）模型 */
export interface SmartFolder {
  id: string;
  name: string;
  query: string;
  order: number;
  icon?: string;
  isSystem: boolean;
  userId: string;
  createdAt: string;
}

/** 视图模式 */
export type ViewMode = 'tree' | 'folder' | 'flat' | 'recent';

/** 文件管理器完整状态 */
export interface FileManagerState {
  viewMode: ViewMode;
  tree: TreeNode[];
  selectedIds: string[];
  expandedIds: Set<string>;
  sortConfigs: Map<string | 'root', SortConfig>;
  filterConfig: FilterConfig;
  activeContextNodeId: string | null;
  isBulkMode: boolean;
  isLoading: boolean;
}
```

---

## 4. 视图模式

### 4.1 四种视图模式

| 模式 | 描述 | 快捷键 |
|------|------|--------|
| `tree` | 树形（默认），展示完整层级结构 | Ctrl+1 |
| `folder` | 文件夹视图，点击文件夹进入，面包屑导航 | Ctrl+2 |
| `flat` | 平铺，显示所有文档（不含文件夹层级） | Ctrl+3 |
| `recent` | 最近，按修改时间倒序展示 | Ctrl+4 |

视图切换按钮位于 FileManagerToolbar 右侧，使用 icon 表示（lucide-vue-next：`TreePine / Folder / LayoutList / Clock`）。

### 4.2 树形视图（默认）

```
InkForge/                         [FolderOpen icon]
  技术博客/                         [FolderOpen icon]
    Vue3 性能优化.md    [writing]   [FilePen icon]
    TipTap 集成.md     [draft]     [FileText icon]
  随笔/                             [Folder icon]
  未归类文档.md         [draft]     [FileText icon]
```

- 缩进每级 16px
- 折叠/展开箭头（`ChevronRight` / `ChevronDown`）位于文件夹名左侧
- 节点高度固定 36px（虚拟滚动依赖此固定高度）

### 4.3 文件夹视图

- 当前文件夹内容列表（含子文件夹 + 文档）
- 顶部 `FolderBreadcrumb` 显示路径（最多 3 级，超出折叠为 `...`）
- 双击文件夹进入，点击面包屑返回

### 4.4 平铺视图

- 显示全部文档（过滤已归档），按当前排序配置展示
- 无层级缩进，文件夹路径以灰色小字显示于文档名下方
- 适合在大量文档中快速浏览

### 4.5 最近视图

- 固定按 `updatedAt` 倒序排列，不允许手动排序
- 显示 "今天 / 昨天 / 本周 / 更早" 日期分组标题
- 最多展示最近 100 条（更多点击"查看全部"进入平铺视图）

---

## 5. 节点 CRUD

### 5.1 新建文档

**触发入口**：
- `Ctrl+N`：在当前选中文件夹下新建文档
- Sidebar 顶部 `+` 按钮（下拉选择"新建文档 / 新建文件夹"）
- 文件夹节点右键菜单 → "新建文档"

**交互流程**：
1. 在目标位置插入临时节点，节点名称处于编辑态（input 自动聚焦）
2. 用户输入名称，按 `Enter` 确认，按 `Escape` 取消
3. 确认后调用 `FileManagerRepository.createDocument()`，新文档默认状态为 `draft`
4. 创建成功后立即在编辑器中打开该文档

**默认命名规则**：
- 文档：`未命名文档` → 若已存在则 `未命名文档 (2)`
- 文件夹：`新建文件夹` → 若已存在则 `新建文件夹 (2)`

### 5.2 新建文件夹

**触发入口**：
- `Ctrl+Shift+N`：在当前选中文件夹下新建文件夹
- Sidebar 顶部 `+` 按钮 → "新建文件夹"
- 文件夹节点右键菜单 → "新建子文件夹"

**交互流程**：与新建文档相同，节点类型为 `folder`，内联重命名。

### 5.3 重命名

**触发入口**：
- 双击节点名称文本
- 选中节点后按 `F2`
- 右键菜单 → "重命名"

**交互细节**：
- 节点名变为行内 `<input>`，全选当前名称
- `Enter` 确认，`Escape` 取消
- 名称合法性验证：
  - 不能为空
  - 不能含 `/` `\` `:` `*` `?` `"` `<` `>` `|`
  - 同级同名时提示冲突并阻止保存

### 5.4 移动

**方式一：拖拽**

- 拖动节点时，节点跟随鼠标移动（显示半透明"幽灵"副本）
- 有效放置目标（文件夹）高亮显示蓝色边框
- 跨文件夹放置：插入目标文件夹，自动展开目标文件夹
- 同文件夹内排序：在节点间显示蓝色插入线，松手后调整 `order`
- 拖拽到 SmartFolder 无效（SmartFolder 是虚拟分类，无物理路径）

**方式二：剪切/粘贴**

- `Ctrl+X`：剪切选中节点（进入"移动模式"，节点呈灰色）
- `Ctrl+V`（焦点在目标文件夹时）：粘贴，执行移动
- `Escape`：取消剪切模式

**方式三：右键菜单 → "移动到"**

- 打开文件夹选择器 Modal，树形选择目标文件夹
- 确认后执行移动

### 5.5 删除（软删除至回收站）

**触发入口**：
- `Delete` 或 `Backspace`（节点已选中）
- 右键菜单 → "移入回收站"

**确认流程**（L1-40 C 防呆）：
1. 弹出确认对话框
2. 对话框显示：节点名 + 影响说明（"此文档将被移入回收站，30 天后自动删除"）
3. 用户点击"移入回收站"后，调用软删除逻辑
4. 操作成功后显示 Sonner Toast（含"撤销"按钮，10 秒内可撤销）

**文件夹删除**：若文件夹非空，提示"该文件夹包含 N 个文档，全部移入回收站"。

---

## 6. 排序系统

### 6.1 每文件夹独立排序

每个文件夹（包含根目录）维护独立的 `SortConfig`。排序配置持久化在 `useFileManagerStore.sortConfigs`（Map 结构，key 为 folderId）。

### 6.2 排序维度

| 字段 | 说明 | 默认 |
|------|------|------|
| `updatedAt` | 修改时间（最近修改优先） | 是（降序） |
| `name` | 文档名字母/拼音排序 | — |
| `createdAt` | 创建时间 | — |
| `size` | 字数大小（word count） | — |
| `status` | 按状态机顺序（draft < writing < review < ... < archived） | — |

### 6.3 文件夹置顶选项

`SortConfig.foldersFirst`：当为 `true` 时，文件夹始终显示在文档上方（VS Code 默认行为）。默认 `true`，用户可关闭。

### 6.4 排序 UI

文件夹节点 header 右侧的 `...` 菜单中提供 "排序方式" 子菜单：

```
排序方式
  ● 修改时间 (默认)
    名称
    创建时间
    大小
    状态
  ----------
  ☑ 文件夹置顶
  ----------
    升序
  ● 降序
```

---

## 7. 过滤系统

### 7.1 顶部搜索框

- 位于 FileManagerToolbar 正中
- `debounce: 200ms`（用户停止输入 200ms 后触发过滤）
- 过滤范围：文档名（fuzzy match）
- 过滤结果实时更新，不折叠文件夹结构（匹配项高亮，非匹配项降低透明度）
- 搜索框为空时恢复完整树

### 7.2 高级过滤面板

点击搜索框右侧 `SlidersHorizontal` 图标打开高级过滤面板（下拉浮层）：

**过滤维度**：

| 维度 | UI 组件 | 说明 |
|------|---------|------|
| 文档状态 | 多选 CheckboxGroup | draft / writing / review / ready_to_publish / published |
| 标签 | TagSelector（带搜索） | 多选，AND 交集 |
| 文件类型 | ToggleGroup | 文档 / 文件夹 |
| 包含归档 | Switch | 默认关闭 |

**过滤逻辑**：各维度之间 AND 交集（状态 AND 标签 AND 类型）；同一维度内多选为 OR 并集。

### 7.3 将过滤条件保存为 SmartFolder

高级过滤面板底部"保存为智能文件夹"按钮：

1. 弹出 SmartFolderNameInput 输入名称
2. 将当前 `FilterConfig` 序列化为 DSL query 字符串（见第 14 章）
3. 持久化到 `smart_folders` 表
4. SmartFolder 立即出现在左侧导航的"智能文件夹"区

---

## 8. 多选与批量操作

### 8.1 进入多选模式

**方式一：Ctrl+Click**
- 按住 Ctrl 逐个点击节点，加入选择集

**方式二：Shift+Click**
- 点击首项，再 Shift+Click 末项，选中范围内所有节点（顺序按当前视图排列）

**方式三：Checkbox 模式（长按激活）**
- 长按（500ms）任意节点，进入"Checkbox 模式"
- 所有节点左侧显示 Checkbox
- 再次进入树形模式（点击任意空白区域 / 按 `Escape`）退出 Checkbox 模式

**模式标识**：进入多选后，FileManagerToolbar 显示"已选 N 项"计数，原"视图切换"按钮隐藏，改为"取消选择"按钮。

### 8.2 批量操作工具栏（BulkActionBar）

多选激活后，Sidebar 底部固定显示 `BulkActionBar`：

```
[批量移动] [批量标签] [批量状态] [批量归档] [批量导出] [移入回收站]
```

每个操作按钮含 icon + 文字，空间不足时折叠为 `...` 菜单。

### 8.3 批量操作详细规范

**批量移动**：
- 打开文件夹选择器 Modal
- 确认后依次移动，失败项单独记录，不中断其他项
- 完成后 Toast："已移动 N 个文档，M 个失败"

**批量删除（移入回收站）**：
- 确认对话框显示："将 N 个文档移入回收站，30 天后自动删除"
- 含前 3 条文档名预览
- 确认后批量软删除

**批量打标签**：
- 弹出标签选择器（已有标签 + 新建标签）
- 支持"添加"和"移除"两种操作

**批量导出**：
- 弹出导出格式选择（Markdown / HTML / 微信）
- 打包为 zip 文件（Tauri fs API），下载到本地

**批量状态变更**：
- 弹出状态选择器（显示当前允许的状态迁移目标，FSM 合法性校验）
- 非法迁移项自动跳过并在结果报告中说明

**批量归档**：
- 确认对话框："将 N 个文档移入归档？归档文档不参与统计。"
- 批量更新 status 为 `archived`

**操作结果报告**（BulkResultReport）：
```
批量归档完成
  成功：12 个文档
  跳过：3 个文档（原因：状态不符）
  失败：0 个文档
[查看详情] [关闭]
```

---

## 9. 虚拟滚动

### 9.1 必要性

文档库可能包含 1000+ 节点。全量 DOM 渲染在低端设备上会导致明显卡顿（首屏 > 500ms）。虚拟滚动将 DOM 节点数量固定在可视区域 + 缓冲区内（约 30~50 个），无论总节点数多少，性能表现一致。

### 9.2 useVirtualScroll 钩子

```typescript
// src/composables/useVirtualScroll.ts

interface UseVirtualScrollOptions {
  /** 每个节点固定高度（px） */
  itemHeight: number;
  /** 可视区域高度，响应式 */
  containerHeight: Ref<number>;
  /** 上下缓冲区节点数 */
  overscan: number;
}

interface UseVirtualScrollReturn<T> {
  /** 当前应渲染的节点切片 */
  visibleItems: ComputedRef<Array<{ item: T; index: number; offsetTop: number }>>;
  /** 虚拟容器总高度（撑开滚动条） */
  totalHeight: ComputedRef<number>;
  /** 绑定到滚动容器的 onScroll 处理器 */
  onScroll: (e: Event) => void;
  /** 滚动到指定节点（通过 index） */
  scrollToIndex: (index: number) => void;
}

function useVirtualScroll<T>(
  items: Ref<T[]>,
  options: UseVirtualScrollOptions
): UseVirtualScrollReturn<T>
```

**固定参数**：
- `itemHeight: 36` px（文件管理器节点高度）
- `overscan: 5`（可视区上下各缓冲 5 个节点）

### 9.3 树形结构扁平化

树形结构（嵌套 TreeNode[]）在渲染前须扁平化为线性数组（`VirtualTreeItem[]`），根据 `expandedIds` 过滤不可见节点：

```typescript
function flattenTree(
  nodes: TreeNode[],
  expandedIds: Set<string>,
  depth = 0
): VirtualTreeItem[]
```

扁平化结果缓存为 computed，expandedIds 或 tree 变化时自动重算。

### 9.4 性能约束

- 1000 节点下，树形展开/折叠响应 < 16ms（即一帧内完成）
- 拖动排序时禁用虚拟滚动的重算（使用临时静态快照），拖动结束后恢复
- 过滤计算在 Web Worker 中执行（节点 > 500 时）

---

## 10. 折叠状态持久化

### 10.1 持久化策略

每个文件夹的折叠/展开状态（`expandedIds: Set<string>`）持久化到 IndexedDB，key 为 `filemanager:expandedIds:{accountId}`。

- 应用启动时从 IndexedDB 恢复
- 状态变更时 debounce 1s 后写入（避免频繁 IO）
- 若文件夹被删除，其 expandedIds 记录自动清理

### 10.2 默认展开规则

- 首次使用（无持久化数据）：展开第一层文件夹，收起更深层级
- 新建文件夹时：自动展开父文件夹，新文件夹默认展开
- 重命名后：保持当前展开状态

---

## 11. Context Menu（右键菜单）

### 11.1 触发方式

- 鼠标右键点击节点
- 选中节点后按键盘 `Menu` 键
- 长按（移动设备，500ms）

右键时若节点未被选中，则先选中该节点（清空其他选择），然后打开菜单。

若多选状态下右键，菜单显示批量操作选项。

### 11.2 文档节点 Context Menu（单选）

共 27 个菜单项，按分组排列：

**打开**（4 项）：
1. 打开（Enter）
2. 在新标签页打开（Ctrl+Enter）
3. 在新窗口打开（Ctrl+Shift+Enter）
4. 在分屏视图打开

**编辑**（4 项，divider 前）：
5. 重命名（F2）
6. 复制文档名
7. 复制路径（相对路径）
8. 复制绝对路径

**组织**（6 项）：
9. 移动到...
10. 复制到...
11. 在此处创建副本
12. 加入收藏（SmartFolder: favorites）
13. 固定到 Hub（SmartFolder: pinned）
14. 从收藏移除（若已收藏则显示此项）

**状态**（7 项）：
15. 标记为草稿
16. 标记为写作中
17. 标记为待审阅
18. 标记为待发布
19. 标记为已发布
20. 移入归档
21. 从归档恢复

**版本**（2 项）：
22. 查看版本历史
23. 创建版本快照

**导出**（2 项）：
24. 导出为 Markdown
25. 导出为 HTML

**高危操作**（2 项，红色文字 + divider 前）：
26. 查看属性（弹出 DocumentPropertyPanel）
27. 移入回收站（Delete）

### 11.3 文件夹节点 Context Menu（单选）

共 15 个菜单项：

1. 打开
2. 新建文档
3. 新建子文件夹
4. 重命名（F2）
5. 复制路径
6. 移动到...
7. 复制到...
8. 折叠所有子文件夹
9. 展开所有子文件夹
10. 排序方式...（子菜单）
11. 批量导出文件夹内所有文档
12. 查看文件夹属性（含文档数量/总字数）
13. 加入收藏
14. 移入归档（整个文件夹）
15. 移入回收站（整个文件夹，含子文档，危险操作，红色）

### 11.4 多选 Context Menu

1. 打开所有（至多 10 个，超出提示）
2. 批量移动到...
3. 批量复制到...
4. 批量打标签...
5. 批量导出...
6. 批量状态变更...
7. 批量归档
8. 移入回收站（N 个文档）

### 11.5 Context Menu 实现规范

- 使用 `teleport` 将菜单渲染到 `body`，避免 overflow:hidden 裁剪
- 菜单位置自动计算，确保不超出视口边界
- 菜单宽度 220px，最大高度 80vh，超出滚动
- 键盘导航：`ArrowUp` / `ArrowDown` 导航，`Enter` 触发，`Escape` 关闭
- 子菜单：hover 200ms 后展开，鼠标移出 300ms 后折叠

---

## 12. 图标系统

所有图标使用 lucide-vue-next，尺寸统一 16x16px，颜色跟随文本色（`currentColor`）。

| 节点类型/状态 | 图标组件 | 颜色 |
|--------------|---------|------|
| 文档（草稿） | `FileText` | `var(--text-muted)` |
| 文档（写作中） | `FilePen` | `var(--accent-blue)` |
| 文档（待审阅） | `FileSearch` | `var(--accent-orange)` |
| 文档（待发布） | `FileCheck` | `var(--accent-purple)` |
| 文档（已发布） | `FileCheck` | `var(--accent-green)` |
| 文档（归档） | `FileArchive` | `var(--text-disabled)` |
| 文件夹（收起） | `Folder` | `var(--accent-yellow)` |
| 文件夹（展开） | `FolderOpen` | `var(--accent-yellow)` |
| SmartFolder | `FolderSearch` | `var(--accent-blue)` |
| 收藏夹 | `Star` | `var(--accent-yellow)` |
| 固定到 Hub | `Pin` | `var(--accent-red)` |

### 12.1 状态徽标（StatusBadge）

每个文档节点右侧显示状态徽标（`<StatusBadge>`），样式为圆角小标签：

```
draft      → 灰色背景，"草稿"
writing    → 蓝色背景，"写作中"
review     → 橙色背景，"审阅"
ready      → 紫色背景，"待发布"
published  → 绿色背景，"已发布"
archived   → 灰色背景虚线边框，"归档"
```

StatusBadge 在节点行宽不足时自动收起为彩色圆点（6px）。

### 12.2 脏状态指示（DirtyDot）

未保存文档在节点名左侧显示实心圆点（`DirtyDot`）：
- 大小：6px
- 颜色：`var(--accent-blue)`
- 只在文档被修改且未保存时显示
- 自动保存成功后消失

---

## 13. 空态设计

### 13.1 空文档库（首次使用或全部移入回收站后）

- 中央插画：线条风格"空页面"插画（SVG，非 emoji）
- 主标题："开始你的第一篇文章"
- 副标题："InkForge 是你的写作空间，随时开始"
- 按钮：`<Button variant="primary">新建文档</Button>`

### 13.2 搜索/过滤无结果

- 插画：放大镜空搜索图
- 主标题："没有找到匹配的文档"
- 副标题：展示当前过滤条件（"搜索：xxx，状态：草稿"）
- 按钮："清除过滤条件"

### 13.3 归档视图为空

- 主标题："归档区为空"
- 副标题："归档的文档会出现在这里，不参与统计"

### 13.4 回收站为空

- 主标题："回收站为空"
- 副标题："移入回收站的文档将在 30 天后自动删除"

---

## 14. 智能文件夹（SmartFolder）

### 14.1 系统内置 SmartFolder

系统自动创建以下 SmartFolder（不可删除，不可修改 query）：

| id | name | query | icon |
|----|------|-------|------|
| `sys:favorites` | 收藏 | `isFavorited:true` | `Star` |
| `sys:pinned` | 固定到 Hub | `isPinned:true` | `Pin` |
| `sys:recent-7d` | 最近 7 天 | `updatedAt:last-7d` | `Clock` |
| `sys:drafts` | 全部草稿 | `status:draft` | `FilePen` |
| `sys:archived` | 归档 | `status:archived` | `FileArchive` |

### 14.2 用户自定义 SmartFolder

**DSL 语法**（与 F-07 SearchEngine 共用 query parser）：

```
status:draft|writing|review|ready_to_publish|published|archived
tag:<name>
category:<folder-path>
wordCount:>3000
wordCount:<500
wordCount:1000..5000
createdAt:>2026-01-01
updatedAt:last-7d
updatedAt:last-30d
```

多个条件之间默认 AND 交集：
```
status:writing wordCount:>1000 tag:技术
```

**创建入口**：
- 高级过滤面板 → "保存为智能文件夹"
- 左侧 SmartFolder 区域顶部 `+` 按钮 → 手动输入 DSL

**SmartFolder UI 位置**：

位于左侧 Sidebar 的 "智能文件夹" 区域（在文件树上方），可折叠。

### 14.3 SmartFolder 与收藏的统一

`isFavorited:true` 实际上是 `smart_folder_members` 表中 `folderId = 'sys:favorites'` 的查询。`articles` 表不增加 `isFavorited` 布尔字段，避免数据冗余。

---

## 15. 回收站集成

### 15.1 在 FileManager 中的入口

- 左侧 Sidebar 最底部固定显示"回收站"图标项（`Trash2` icon）
- 显示当前回收站文档数量徽标（若为 0 不显示）
- 点击打开回收站视图（`/trash` 路由）

### 15.2 回收站视图

- 文档列表（含删除时间、剩余天数倒计时）
- 每项右侧操作：恢复 / 永久删除
- 顶部"清空回收站"按钮（批量永久删除，二次确认）

### 15.3 软删除→回收站的一致性

删除操作一律走软删除：

```typescript
// FileManagerRepository
async trashDocument(id: string): Promise<void> {
  await db.articles.update(id, {
    deletedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  await activityLogger.log('article.trashed', { id });
}
```

主列表自动过滤 `deletedAt != null` 的文档。

---

## 16. 归档视图集成

### 16.1 视图切换

FileManager 顶部 Tab 切换（或 Toolbar 中的 ArchiveButton）：

```
[文档库] [归档]
```

### 16.2 归档视图规则

- 显示所有 `status === 'archived'` 的文档
- 排序、过滤功能与主视图相同
- 批量操作：批量恢复 / 批量导出 / 批量永久归档（保持归档）
- 归档文档标注"归档"badge，并以低对比度样式显示

### 16.3 从归档恢复

恢复到 `draft` 状态（归档恢复后默认为草稿，由用户决定后续状态迁移）：

```typescript
async restoreFromArchive(id: string): Promise<void> {
  const isValid = DocumentFSM.canTransition('archived', 'draft');
  if (!isValid) throw new Error('FSM: invalid transition archived -> draft');
  await db.articles.update(id, { status: 'draft', statusChangedAt: new Date().toISOString() });
  await activityLogger.log('article.restored_from_archive', { id });
}
```

---

## 17. Store 定义

```typescript
// src/stores/useFileManagerStore.ts
import { defineStore } from 'pinia';

export const useFileManagerStore = defineStore('fileManager', {
  state: (): FileManagerState => ({
    viewMode: 'tree',
    tree: [],
    selectedIds: [],
    expandedIds: new Set<string>(),
    sortConfigs: new Map([['root', { field: 'updatedAt', direction: 'desc', foldersFirst: true }]]),
    filterConfig: {
      query: '',
      statuses: [],
      tagIds: [],
      types: [],
      includeArchived: false,
    },
    activeContextNodeId: null,
    isBulkMode: false,
    isLoading: false,
  }),

  getters: {
    /** 过滤 + 排序后的可见节点（已扁平化，供虚拟滚动使用） */
    visibleItems(state): VirtualTreeItem[] {
      return computeVisibleItems(state.tree, state.expandedIds, state.filterConfig, state.sortConfigs);
    },

    /** 已选节点的完整数据 */
    selectedNodes(state): TreeNode[] {
      return state.tree.flat().filter(n => state.selectedIds.includes(n.id));
    },

    /** 是否处于多选状态 */
    isMultiSelect(state): boolean {
      return state.selectedIds.length > 1;
    },
  },

  actions: {
    /** 切换视图模式 */
    setViewMode(mode: ViewMode): void,

    /** 选中单个节点（清空其他选择） */
    selectNode(id: string): void,

    /** 切换节点选中状态（多选模式） */
    toggleSelectNode(id: string): void,

    /** 范围选择 */
    rangeSelectTo(id: string): void,

    /** 进入/退出 Bulk 模式 */
    setBulkMode(enabled: boolean): void,

    /** 切换文件夹折叠状态 */
    toggleExpand(folderId: string): void,

    /** 展开全部 */
    expandAll(): void,

    /** 折叠全部 */
    collapseAll(): void,

    /** 更新排序配置 */
    updateSortConfig(folderId: string | 'root', config: Partial<SortConfig>): void,

    /** 更新过滤配置 */
    updateFilterConfig(config: Partial<FilterConfig>): void,

    /** 重置过滤 */
    clearFilter(): void,

    /** 加载文件树 */
    async loadTree(): Promise<void>,

    /** 创建文档 */
    async createDocument(parentId: string | null, name: string): Promise<string>,

    /** 创建文件夹 */
    async createFolder(parentId: string | null, name: string): Promise<string>,

    /** 重命名节点 */
    async renameNode(id: string, name: string): Promise<void>,

    /** 移动节点 */
    async moveNode(id: string, targetParentId: string | null, targetOrder: number): Promise<void>,

    /** 软删除（移入回收站） */
    async trashNode(id: string): Promise<void>,

    /** 批量操作 */
    async bulkAction(type: BulkActionType, ids: string[], payload?: unknown): Promise<BulkActionResult>,

    /** 持久化展开状态到 IndexedDB */
    async persistExpandedIds(): Promise<void>,
  },
});
```

---

## 18. Repository 定义

```typescript
// src/repositories/FileManagerRepository.ts

interface FileManagerRepository {
  /** 获取完整文件树 */
  listTree(accountId: string): Promise<TreeNode[]>;

  /** 获取单层内容（文件夹视图模式） */
  listFolder(folderId: string | null): Promise<TreeNode[]>;

  /** 创建文档 */
  createDocument(params: {
    name: string;
    parentId: string | null;
    accountId: string;
  }): Promise<FileNode>;

  /** 创建文件夹 */
  createFolder(params: {
    name: string;
    parentId: string | null;
    accountId: string;
  }): Promise<FolderNode>;

  /** 重命名节点 */
  renameNode(id: string, name: string): Promise<void>;

  /** 移动节点（变更父级 + order） */
  moveNode(id: string, targetParentId: string | null, targetOrder: number): Promise<void>;

  /** 软删除（写入 deletedAt + expiresAt） */
  trashDocument(id: string): Promise<void>;

  /** 软删除文件夹（递归软删除所有子文档） */
  trashFolder(id: string): Promise<{ trashedCount: number }>;

  /** 归档文档 */
  archiveDocument(id: string): Promise<void>;

  /** 从归档恢复 */
  restoreFromArchive(id: string): Promise<void>;

  /** 从回收站恢复 */
  restoreFromTrash(id: string): Promise<void>;

  /** 永久删除（仅在回收站内） */
  purgeDocument(id: string): Promise<void>;

  /** 批量操作包装 */
  bulkMove(ids: string[], targetParentId: string | null): Promise<BulkActionResult>;
  bulkTrash(ids: string[]): Promise<BulkActionResult>;
  bulkArchive(ids: string[]): Promise<BulkActionResult>;
  bulkChangeStatus(ids: string[], status: DocumentStatus): Promise<BulkActionResult>;
  bulkAddTag(ids: string[], tagId: string): Promise<BulkActionResult>;
  bulkRemoveTag(ids: string[], tagId: string): Promise<BulkActionResult>;

  /** SmartFolder 操作 */
  listSmartFolders(accountId: string): Promise<SmartFolder[]>;
  createSmartFolder(params: { name: string; query: string; accountId: string }): Promise<SmartFolder>;
  updateSmartFolder(id: string, params: Partial<Pick<SmartFolder, 'name' | 'query' | 'order'>>): Promise<void>;
  deleteSmartFolder(id: string): Promise<void>;
  resolveSmartFolder(query: string, accountId: string): Promise<FileNode[]>;
}
```

---

## 19. 键盘交互规范

| 快捷键 | 作用域 | 行为 |
|--------|--------|------|
| `ArrowUp` / `ArrowDown` | 文件树 | 移动焦点到上/下节点 |
| `ArrowRight` | 文件夹节点 | 展开（若已展开则移动到第一个子节点） |
| `ArrowLeft` | 节点 | 收起（文件夹）或移动到父节点（文档） |
| `Enter` | 文档节点 | 打开文档 |
| `Enter` | 文件夹节点 | 展开/收起 |
| `F2` | 任意节点 | 重命名 |
| `Delete` / `Backspace` | 选中节点 | 移入回收站（含确认） |
| `Ctrl+C` | 选中节点 | 复制节点引用 |
| `Ctrl+X` | 选中节点 | 剪切（移动模式） |
| `Ctrl+V` | 文件夹获得焦点时 | 粘贴（执行移动） |
| `Ctrl+A` | 文件树 | 全选当前层节点 |
| `Ctrl+N` | 全局 | 新建文档 |
| `Ctrl+Shift+N` | 全局 | 新建文件夹 |
| `Ctrl+1/2/3/4` | 全局 | 切换视图模式 |
| `Escape` | 多选/剪切模式 | 取消多选或剪切状态 |
| `Menu` | 选中节点 | 打开 Context Menu |

---

## 20. 测试矩阵

### 20.1 单元测试

| # | 测试项 | 测试类型 | 期望行为 |
|---|--------|----------|----------|
| 1 | `flattenTree` 正确处理展开/折叠状态 | Unit | 折叠的文件夹子节点不出现在结果中 |
| 2 | `flattenTree` 处理空树 | Unit | 返回空数组 |
| 3 | `useVirtualScroll` 返回正确的 visibleItems 切片 | Unit | overscan 5，containerHeight 400px，itemHeight 36px，应渲染约 16 个节点 |
| 4 | SortConfig 按 `updatedAt` 降序排列文档 | Unit | 最新文档排第一 |
| 5 | SortConfig `foldersFirst=true` 时文件夹在文档前 | Unit | 文件夹节点数组下标均小于文档节点 |
| 6 | FilterConfig statuses 过滤正确 | Unit | 只返回符合状态的文档 |
| 7 | FilterConfig tagIds AND 交集过滤 | Unit | 文档必须同时含全部选中标签 |
| 8 | FilterConfig query 模糊匹配文档名 | Unit | "vue" 能匹配 "Vue 性能优化" |
| 9 | FilterConfig `includeArchived=false` 过滤归档文档 | Unit | 归档文档不在结果中 |
| 10 | `computeVisibleItems` 组合排序+过滤正确 | Unit | 过滤后的结果按排序规则排列 |
| 11 | 软删除后文档从主列表消失 | Unit | `deletedAt` 写入，`listTree` 不返回该文档 |
| 12 | 软删除文件夹递归软删除子文档 | Unit | 3 层嵌套的文件夹，子文档全部标记 deletedAt |
| 13 | 重命名同名文档时返回冲突错误 | Unit | 抛出 `NameConflictError` |
| 14 | 重命名含非法字符时校验失败 | Unit | 名称含 `/` 时校验不通过 |
| 15 | 批量操作结果报告包含成功/失败分类 | Unit | `BulkActionResult.failed` 包含失败项 |

### 20.2 集成测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 16 | 新建文档后立即出现在树中并处于编辑状态 | 内联重命名 input 自动聚焦 |
| 17 | 拖拽文档到不同文件夹，父级 id 正确更新 | `moveNode` 调用正确参数 |
| 18 | 多选后批量移动，全部文档目标 parentId 更新 | `bulkMove` 成功 |
| 19 | 批量状态变更时 FSM 非法项被跳过 | `archived` 文档不能直接变为 `published` |
| 20 | SmartFolder 查询结果实时响应文档状态变化 | 文档变为 `archived` 后从 `sys:drafts` 中消失 |
| 21 | 收藏文档后出现在 `sys:favorites` SmartFolder | 成员关系写入 `smart_folder_members` |
| 22 | FilterConfig 保存为 SmartFolder 后查询一致 | 同样的条件，过滤结果与 SmartFolder 结果相同 |
| 23 | 归档文档不出现在主视图，但可被全局搜索命中 | SearchRepository.search 返回归档文档 |
| 24 | 回收站文档在 30 天后被 GC Service 清理 | GCService.run() 后文档从 DB 中删除 |
| 25 | 展开状态持久化并在应用重启后恢复 | IndexedDB 读取后 expandedIds 与关闭前一致 |

### 20.3 端到端测试（E2E）

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 26 | 创建文件夹 → 在其中创建文档 → 双击打开 | 编辑器打开正确文档 |
| 27 | 右键菜单"移入回收站"→ 确认对话框 → 确认 → Toast 出现 | 文档从列表消失，Toast "已移入回收站" |
| 28 | 软删除后 Toast "撤销" 点击 → 文档恢复 | 文档重新出现在列表 |
| 29 | F2 重命名 → 输入新名称 → Enter | 文档名更新，文件树反映 |
| 30 | Ctrl+Click 多选 3 个文档 → BulkActionBar 出现 | 显示"已选 3 项" |
| 31 | 1000 个文档的树形视图滚动流畅 | 帧率不低于 60fps，DOM 节点数 < 60 |
| 32 | 视图模式切换（树形→平铺→最近）状态保持 | 选中文档在切换后仍为选中态 |
| 33 | 拖拽文档到不同文件夹，拖拽幽灵跟随鼠标 | 视觉幽灵效果正常，放置后位置正确 |
| 34 | 高级过滤"状态:写作中"→ 仅 writing 文档可见 | 其他状态文档不显示 |
| 35 | 保存过滤为 SmartFolder → 切换到 SmartFolder → 结果一致 | SmartFolder 查询结果与过滤结果相同 |

---

## 2026-04-30 Baseline 实装记录

本轮已完成 `FileManager.vue` 的 compatible baseline，不声明 Spec 12 全量完成：

- 已基于现有 `articleStore`、`categoryStore`、`assetStore` 保留真实数据链路，没有引入 mock 数据、并行空壳 store 或替代组件。
- 已在现有顶部工具栏补入 `tree / flat / recent` 三种可运行视图；`recent` 固定按 `updatedAt` 降序展示，避免与用户手动排序方向冲突。
- 已补入 `updatedAt / createdAt / title / status` 排序字段和升降序控制，树形与平铺视图共享同一真实文章列表排序结果。
- 已补入生命周期感知的 SmartFolder-style 状态筛选：全部、草稿/写作、审阅、待发布、完成；计数直接从真实 `articles` 状态派生。
- 已把文档状态 badge 从 legacy `new` 单态扩展为所有生命周期状态显示，并继续复用 `src/core/lifecycle` 的 label/class 口径。
- 已把视图模式、排序字段、排序方向、状态筛选和文件夹展开状态持久化到 `localStorage` 键 `inkforge:file-manager:prefs:v1`，并对坏 JSON / 非法枚举值做防御式回退。
- 已修复平铺/最近视图下 `node.expanded` 与 `expandedMap` 不一致导致文章列表不可见的风险。
- 已通过真实浏览器验证：本地 Vite 打开 `/workstation`，通过真实 Pinia store 写入并清理 5 篇不同生命周期状态的 IndexedDB 文章，确认 SmartFolder 计数、状态筛选、视图切换、偏好持久化、坏 JSON 回退和 console error 均正常。

仍未在本 baseline 覆盖的完整 Spec 12 项：`folder` 面包屑视图、虚拟滚动、多选批量操作、拖拽排序、SmartFolder Repository/IndexedDB 表、回收站 TTL、归档视图、完整键盘导航和 1000 节点性能验收。这些仍保持 Pending，等待对应后续 slice 或依赖 spec 落地。

---

*本 Spec 由 InkForge v2.1 Spec 工程师生成，基于 F-01~F-08、L1-41~L1-44、决策 N-01~N-06 综合制定。*
