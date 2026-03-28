# Workstation 工作台增强规格说明书

> 2026-03-28 执行说明：Workstation/Editor 的当前实现以 `prompts/0327/01-editor-ui-spec.md`、`03-keyboard-shortcuts-spec.md`、`04-rendering-engine-spec.md`、`05-toolbar-complete-spec.md` 与对应 PRD checkpoint 为准。本文中的“待实现/缺失”描述应视为旧基线诊断。

> 版本: v2.1 | 日期: 2026-03-21 | 状态: 待实现
> 本文档基于 `inkforge/src/views/WorkstationView.vue` 及其子组件树的完整代码分析编写。
> 所有行号引用基于当前代码库实际内容，所有组件接口使用 TypeScript 严格定义。

---

## 1. 概述

### 1.1 改造目标

对 InkForge Workstation 工作台进行全面增强，在保持现有四栏架构稳定性的前提下：

1. **消除冗余 UI** -- 移除 Stage 面板中与 Header 功能重复的操作区域和预设选择区域
2. **统一视觉规范** -- 各面板标题使用共享 CSS 类，确保排版一致性
3. **增强文件管理** -- 新增草稿箱、素材库集成、文件树增强（排序、拖拽、复制）
4. **升级版本对比** -- 基于现有 LCS 算法扩展 Chunked Diff、Unified Diff、Side-by-Side 视图
5. **完善同步功能** -- 替换静态上传图标为状态感知组件，增加同步菜单
6. **编辑器增强** -- Markdown 语法提示、写作目标、达标庆祝动画
7. **附加增强** -- 多文档标签栏、专注模式升级

### 1.2 设计哲学

延续 **Ethereal Constructivism（空灵构成主义）**设计语言：

- **材质**: 宣纸白(#FAFBFC) + 玻璃态(backdrop-filter: blur)
- **主色**: 构成红(#D32F2F) 作为强调色，瑞士蓝(#1565C0) 作为辅助色
- **排版**: 13px 系统字体栈，600 weight 标题，11-12px 辅助信息
- **动效**: 150ms ease 过渡，200-250ms 入场动画，cubic-bezier(0.34, 1.56, 0.64, 1) 弹性缩放
- **间距**: 8px 基准网格，padding 10-16px，gap 6-10px

### 1.3 约束条件

- 图标库：**仅限 lucide-vue-next**，绝对禁止 Emoji 作为功能图标
- 数据源：**仅限 Dexie IndexedDB**（InkForgeDB），禁止 Mock 数据
- 状态管理：**Pinia stores**，composable 封装业务逻辑
- 组件库：shadcn-vue (reka-ui) 基础组件可按需使用
- TypeScript：strict 模式，禁止 `any`
- CSS：scoped style，CSS Variables 主题化

---

## 2. 现状分析

### 2.1 当前四栏架构

WorkstationView.vue (行 384-973) 采用 `flex` 四栏动态力场布局：

| 栏位 | CSS 类 | 展开宽度 | 折叠宽度 | 内容 |
|------|--------|----------|----------|------|
| Manager（左栏） | `.panel-manager` | 280px | 32px（竖标签） | 文件/版本/大纲三 Tab |
| Editor（编辑器） | `.panel-editor` | flex: 1（自动填充） | 始终可见 | EditorPanel + EditorStatusBar |
| Stage（预览栏） | `.panel-stage` | 380px | 12px（触发条） | 平台预览 + iPhone 设备框 |
| Inspector（检查器） | `.panel-inspector` | 280px | 12px（触发条） | 排版/字体/素材/链接四 Section |

Header 高度固定 52px（行 998-1009），包含品牌区、标题编辑区、操作按钮组（复制/导出/专注模式/发布 CTA）。

主内容区 `.main-content` 位于 Header 下方，占满剩余高度。

### 2.2 组件树

```
WorkstationView.vue
  |-- <header> workstation-header
  |     |-- header-brand (IF logo + 品牌名)
  |     |-- header-title (标题输入 + 保存状态 Pill)
  |     |-- header-actions (复制/导出/专注/发布按钮)
  |
  |-- <div> main-content
        |-- <aside> panel-manager (左栏)
        |     |-- collapsed-label (折叠态竖标签)
        |     |-- panel-tabs (文件/版本/大纲 Tab 栏 + 折叠按钮)
        |     |-- panel-body
        |           |-- FileManager.vue (managerTab === 'files')
        |           |-- VersionPanel.vue (managerTab === 'versions')
        |           |-- OutlinePanel.vue (managerTab === 'outline')
        |
        |-- <main> panel-editor (编辑器栏)
        |     |-- editor-wrapper
        |     |     |-- EditorPanel.vue (ref="editorPanelRef")
        |     |-- EditorStatusBar.vue
        |
        |-- <aside> panel-stage (预览栏)
        |     |-- stage-collapsed-bar (折叠态触发条)
        |     |-- stage-header
        |     |     |-- stage-platform-tabs (微信/小红书/知乎)
        |     |     |-- collapse-trigger
        |     |-- stage-body
        |           |-- device-frame (iPhone 设备框)
        |           |     |-- device-notch
        |           |     |-- device-screen (预览内容)
        |           |     |-- device-home-indicator
        |           |-- stage-presets (预设快速选择) *** 待移除 ***
        |           |-- stage-actions (操作按钮组)  *** 待移除 ***
        |
        |-- <aside> panel-inspector (检查器栏)
              |-- inspector-collapsed-bar (折叠态触发条)
              |-- inspector-header
              |-- inspector-scroll
                    |-- Section 1: 排版风格 (主色/预设/滑块/缩进/标题风格/引用块)
                    |-- Section 2: 字体 (字体族/字号/行高/预览)
                    |-- Section 3: 素材库 (AssetManager.vue)
                    |-- Section 4: 引用链接 (extractedLinks)
```

### 2.3 面板折叠状态管理

WorkstationView.vue 行 58-65 定义了四个 ref 控制面板折叠：

```typescript
const managerCollapsed = ref(false)    // 行 59
const stageCollapsed = ref(false)      // 行 61
const inspectorCollapsed = ref(false)  // 行 63
const isFocusMode = ref(false)         // 行 65
```

左栏 Tab 切换（行 68-69）：

```typescript
type ManagerTab = 'files' | 'versions' | 'outline'
const managerTab = ref<ManagerTab>('files')
```

专注模式切换逻辑（行 296-307）：进入时三栏全部折叠，退出时全部展开。

### 2.4 快捷键映射表

定义于 WorkstationView.vue 行 317-358：

| 快捷键 | 功能 | 代码行号 |
|--------|------|----------|
| `Ctrl+S` / `Cmd+S` | 强制保存 | 行 319-322 |
| `Ctrl+Shift+O` / `Cmd+Shift+O` | 打开大纲 Tab | 行 326-333 |
| `Escape` | 退出专注模式 | 行 336-343 |
| `F11` | 切换专注模式 | 行 346-349 |
| `Ctrl+\` / `Cmd+\` | 折叠/展开左栏 | 行 353-357 |

---

## 3. 需移除的冗余元素

### 3.1 Stage 面板下方的预设快速选择区域

**template 代码位置**: WorkstationView.vue 行 635-648

```html
<!-- 预设快速选择（当前平台前 5 个） -->
<div class="stage-presets">
  <button v-for="preset in topPresets" ...>
    <span class="stage-preset-icon">{{ preset.icon }}</span>
    <span class="stage-preset-name">{{ preset.name }}</span>
  </button>
</div>
```

**script 关联变量**（行 87-91）：

```typescript
const topPresets = computed(() => themePresets.slice(0, 5))  // 行 87
function applyPreset(presetId: string): void {               // 行 89
  settingsStore.settings.export.defaultPresetId = presetId
}
```

> 注意：`topPresets` 和 `applyPreset` 同时在 Inspector Section 1（行 729-741）中被使用，因此仅删除 Stage 中的引用，不删除变量定义本身。

**CSS 关联类名**:
- `.stage-presets` -- Stage 预设容器
- `.stage-preset-chip` -- 预设药丸按钮
- `.stage-preset-icon` -- 预设图标
- `.stage-preset-name` -- 预设名称

**冗余原因分析**: Inspector 栏 Section 1 "排版风格"（行 704-809）已包含完全相同的预设快速切换条（`.preset-strip`），且 Inspector 还提供了排版参数滑块、首行缩进、标题风格、引用块风格等更丰富的控制。Stage 面板中的预设选择是 Inspector 功能的子集重复。

### 3.2 Stage 面板下方的操作按钮组

**template 代码位置**: WorkstationView.vue 行 650-676

```html
<!-- 操作按钮组 -->
<div class="stage-actions">
  <button class="stage-btn-primary" ...>
    {{ copySuccess ? '已复制' : '复制到平台' }}
  </button>
  <button class="stage-btn-secondary" ...>
    全屏导出
  </button>
</div>
```

**与 Header 区域的功能重复分析**:

| 功能 | Header 位置 | Stage 位置 | 重复性 |
|------|------------|------------|--------|
| 复制到剪贴板 | 行 433-446 icon-btn | 行 651-665 stage-btn-primary | 完全重复 |
| 导出/全屏导出 | 行 448-458 icon-btn + 行 476-481 publish-btn | 行 666-675 stage-btn-secondary | 完全重复 |

**CSS 关联类名**:
- `.stage-actions` -- 操作按钮容器
- `.stage-btn-primary` -- 主按钮（复制到平台）
- `.stage-btn-secondary` -- 次按钮（全屏导出）

**移除后 Stage 仅保留的内容**:
1. `stage-header` -- 平台 Tab 切换栏 + 折叠按钮
2. `stage-body` > `device-frame` -- iPhone 设备框（含 notch、screen、home indicator）
3. 预览渲染区域（previewLoading / previewEmpty / previewContent）

---

## 4. 面板标题统一规格

### 4.1 当前不一致问题

各组件标题 CSS 存在显著差异：

| 组件 | CSS 类 | font-size | font-weight | padding | gap | color | letter-spacing |
|------|--------|-----------|-------------|---------|-----|-------|---------------|
| VersionPanel | `.header-title` | 13px | 600 | 12px 14px | 6px | var(--text-primary, #263238) | 无 |
| OutlinePanel | `.outline-header` | 12px | 600 | 16px 16px 12px | 8px | var(--color-text-secondary, #6b7280) | 0.5px |
| FileManager | `.fm-toolbar` | 12px | 无特定设置 | 8px 10px | 6px | 继承 | 无 |
| Inspector | `.inspector-label` | 隐式继承 | 隐式继承 | 隐式继承 | 隐式继承 | 隐式继承 | 无 |

问题清单：
- font-size 不统一（12px vs 13px）
- padding 不统一（12px/14px vs 16px/16px/12px vs 8px/10px）
- color 使用不同的 CSS Variable 命名空间（`--text-primary` vs `--color-text-secondary`）
- letter-spacing 仅 OutlinePanel 有 0.5px
- OutlinePanel 使用 `text-transform: uppercase`，其他面板不使用

### 4.2 统一方案

新增共享 CSS 类 `.panel-section-title`，精确属性值：

```css
.panel-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border, #E5E7EB);
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--text-secondary, #607D8B);
  user-select: none;
}

.panel-section-title .section-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.7;
}

.panel-section-title .section-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent-primary-light, #FFEBEE);
  color: var(--accent-primary, #D32F2F);
  font-size: 10px;
  font-weight: 700;
}
```

此 CSS 类应定义在 `inkforge/src/styles/main.css` 中作为全局共享样式。

### 4.3 各组件具体替换位置

| 组件 | 当前标题类/元素 | 行号 | 替换为 |
|------|---------------|------|--------|
| VersionPanel | `.panel-header` > `.header-title` | 行 229-235 | `.panel-section-title` |
| OutlinePanel | `.outline-header` | 行 62-65 | `.panel-section-title` |
| FileManager | `.fm-toolbar` 内搜索栏（无独立标题） | 行 599-607 | 在搜索栏上方新增 `.panel-section-title` |
| Inspector sections | `.inspector-label` | 行 705-709, 813-817, 901-905, 914-919 | `.panel-section-title` |

---

## 5. 文件管理架构增强

### 5.1 草稿箱功能

**数据源**: 利用 Dexie 的 `documents` 表（`db.ts` 行 27-37），查询 `status === 'draft'` 的文档。

```typescript
// Dexie 查询语句
const drafts = await db.documents
  .where('status')
  .equals('draft')
  .reverse()
  .sortBy('updatedAt')
```

同时兼容 `articles` 表（旧数据结构），通过 `articleStore` 过滤未发布文章：

```typescript
const draftArticles = computed(() =>
  articles.value.filter(a => a.status === 'new' || a.status === 'read')
)
```

**UI 规格**:
- 位置：FileManager 面板顶部，搜索栏下方
- 折叠/展开：默认展开，点击标题栏折叠
- 样式：与文件树分类节点一致的缩进和间距
- 图标：`FileEdit` from lucide-vue-next（14px，与分类图标对齐）
- 草稿计数 badge：`.section-count` 样式

**组件: DraftBox.vue**

```typescript
// Props 接口
interface DraftBoxProps {
  /** 当前选中的文章 ID */
  selectedArticleId: string | null
}

// Emits 接口
interface DraftBoxEmits {
  (e: 'select', articleId: string): void
  (e: 'delete', articleId: string): void
  (e: 'publish', articleId: string): void
}
```

组件路径：`inkforge/src/components/file/DraftBox.vue`

内部状态：
- `expanded: ref<boolean>(true)` -- 折叠状态
- `drafts: computed<Article[]>` -- 从 articleStore 获取草稿列表

每个草稿项显示：
- 标题（单行截断，max-width: 160px）
- 更新时间（相对时间格式，与 FileManager 行 506-536 的 `formatRelativeTime` 一致）
- 右侧操作：hover 显示删除按钮（Lucide `Trash2`, 12px）

### 5.2 素材库集成

**数据源**: `assetStore.assets`（来自 `useAssetStore`，FileManager.vue 行 15-19），底层通过 `db.assets` 表查询。

```typescript
// 当前实现（FileManager.vue 行 112-121）
watch(() => selectedArticleId.value, async (newId) => {
  if (newId) {
    await assetStore.loadAssets(newId)
  }
}, { immediate: true })

const currentAssets = computed(() => {
  if (!selectedArticleId.value) return []
  return assets.value.filter(a => a.articleId === selectedArticleId.value)
})
```

**UI 规格**:
- 布局：CSS Grid，`grid-template-columns: repeat(auto-fill, minmax(56px, 1fr))`，`gap: 6px`
- 缩略图尺寸：56x56px，`border-radius: 6px`，`object-fit: cover`
- 拖拽插入：支持 `draggable="true"`，拖拽到编辑器插入对应的 Markdown 图片语法 `![name](blob-url)`
- 空状态：Lucide `ImageOff` 图标 + "暂无素材" 文案，12px，`color: var(--text-muted, #90A4AE)`
- 溢出处理：最多显示 2 行（8 张），超出显示 "+N" 计数 badge

**组件: AssetPreview.vue**

```typescript
// Props 接口
interface AssetPreviewProps {
  /** 素材记录 */
  asset: AssetRecord
  /** 缩略图 URL（由 assetStore.getThumbnailUrl 提供） */
  thumbnailUrl: string | null
  /** 是否处于选中状态 */
  selected?: boolean
}

// Emits 接口
interface AssetPreviewEmits {
  (e: 'click', asset: AssetRecord): void
  (e: 'dragstart', event: DragEvent, asset: AssetRecord): void
  (e: 'delete', assetId: string): void
}
```

组件路径：`inkforge/src/components/file/AssetPreview.vue`

### 5.3 文件树重构

#### 排序模式

```typescript
type SortMode = 'updated' | 'created' | 'title' | 'status'

interface SortConfig {
  mode: SortMode
  ascending: boolean
}
```

默认排序：`{ mode: 'updated', ascending: false }`（最近更新在前）

排序 UI：在 FileManager 工具栏新增排序下拉按钮，使用 Lucide `ArrowUpDown`（14px）。

#### 拖拽移动

文件树中的文章节点支持拖拽到不同分类：

```
drag/drop 事件处理流程：
1. dragstart: 设置 dataTransfer.setData('text/plain', articleId)
             添加 .dragging CSS 类（opacity: 0.5）
2. dragover:  目标分类节点添加 .drag-over 类（border: 2px dashed var(--accent-primary)）
              event.preventDefault() 允许 drop
3. dragleave: 移除 .drag-over 类
4. drop:      读取 articleId，调用 articleStore.moveToCategory(articleId, targetCategoryId)
              移除所有拖拽 CSS 类
5. dragend:   清理状态，移除 .dragging 类
```

#### Inline 重命名

交互规格（已在 FileManager.vue 行 343-379 中实现）：
1. 双击文章名或右键菜单 "重命名" 触发
2. 当前文本替换为 `<input>` 元素（`renameInputRef`）
3. 自动 focus + select 全选
4. Enter 确认（`confirmRenameArticle`），Escape 取消（`cancelRenameArticle`）
5. blur 事件也触发确认
6. 空标题不允许提交

#### 复制文档

实现方案：
1. 右键菜单新增 "复制文档" 选项（Lucide `Copy`, 14px）
2. 创建文章副本：`articleStore.addArticle({ title: originalTitle + ' (副本)', ... })`
3. 复制完成后自动选中新文档

#### 右键菜单选项清单

**文章右键菜单**（FileManager.vue 行 261-273）：

| 选项 | Lucide 图标 | 操作函数 | 已实现 |
|------|------------|----------|--------|
| 打开 | `FileText` | `ctxOpenArticle()` | 是（行 335-340） |
| 重命名 | `Pencil` | `ctxStartRenameArticle()` | 是（行 347-358） |
| 移动到... | `FolderInput` | `ctxToggleMoveSubmenu()` | 是（行 382-395） |
| 复制文档 | `Copy` | `ctxDuplicateArticle()` | **待新增** |
| 删除 | `Trash2` | `ctxDeleteArticle()` | 是（行 402-407） |

**分类右键菜单**（FileManager.vue 行 275-287）：

| 选项 | Lucide 图标 | 操作函数 | 已实现 |
|------|------------|----------|--------|
| 新建文章 | `FilePlus` | `ctxNewArticleInCategory()` | 是（行 474-487） |
| 重命名 | `Pencil` | `ctxStartRenameCategory()` | 是（行 439-451） |
| 删除分类 | `Trash2` | `ctxDeleteCategory()` | 是（行 490-500） |

### 5.4 云同步状态标记

#### Document 接口扩展

在 `db.ts` 行 27-37 的 `Document` 接口中新增字段：

```typescript
export interface Document {
  id: string
  title: string
  content: string
  categoryId: string | null
  currentVersionId: string
  status: 'draft' | 'published'
  presetId: string
  createdAt: Date
  updatedAt: Date
  // 新增字段
  syncStatus: 'synced' | 'pending' | 'conflict' | 'local-only'
  lastSyncAt: Date | null
  remoteVersion: number
}
```

#### 数据库版本升级到 v4

在 `db.ts` 行 89-97 之后新增：

```typescript
// v4: 文档新增同步状态字段
this.version(4).stores({
  categories: 'id, name, createdAt',
  articles: 'id, categoryId, status, createdAt, sourceUrl',
  contents: 'id, articleId, createdAt',
  documents: 'id, categoryId, status, syncStatus, createdAt, updatedAt',
  versions: 'id, documentId, createdAt',
  assets: 'id, articleId, type, name, *tags, createdAt'
}).upgrade(tx => {
  return tx.table('documents').toCollection().modify(doc => {
    doc.syncStatus = 'local-only'
    doc.lastSyncAt = null
    doc.remoteVersion = 0
  })
})
```

#### 文件树同步状态图标

| syncStatus | Lucide 图标 | 颜色 | 尺寸 | 含义 |
|------------|------------|------|------|------|
| `synced` | `CloudCheck` | `var(--success, #2E7D32)` | 12px | 已同步 |
| `pending` | `CloudUpload` | `var(--warning, #F57C00)` | 12px | 待上传 |
| `conflict` | `CloudAlert` | `var(--error, #C62828)` | 12px | 有冲突 |
| `local-only` | `HardDrive` | `var(--text-muted, #90A4AE)` | 12px | 仅本地 |

图标显示位置：文件树中每个文章项的右侧，与时间戳左对齐。

---

## 6. 版本对比功能（真实实现）

### 6.1 当前实现分析

`useVersionManager.ts` 行 76-127 实现了基于 LCS（最长公共子序列）的逐行 Diff 算法：

- **算法**: 标准 O(n*m) DP 矩阵 + 回溯构建
- **输入**: 两个版本的文本（`oldText`, `newText`），按 `\n` 分割为行数组
- **输出**: `DiffLine[]`，每行标记为 `added` / `removed` / `unchanged`
- **统计**: `computeDiffSummary()` 函数（行 132-152）汇总三类行数

**现有 DiffLine 接口**（行 20-24）：

```typescript
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber?: number
}
```

**局限性**：
1. 无 chunk 分组（连续修改行不聚合为块）
2. 无 unified diff 格式输出
3. 仅支持行级对比，不支持字级对比
4. 无统计上下文行（context lines）

### 6.2 增强 Diff 算法

新建文件：`inkforge/src/utils/diff.ts`

#### DiffChunk 接口定义

```typescript
export interface DiffChunk {
  /** 旧文件起始行号（1-based） */
  oldStart: number
  /** 旧文件行数 */
  oldCount: number
  /** 新文件起始行号（1-based） */
  newStart: number
  /** 新文件行数 */
  newCount: number
  /** 此 chunk 包含的 diff 行 */
  lines: DiffLine[]
}
```

#### DiffStats 接口定义

```typescript
export interface DiffStats {
  /** 新增行数 */
  additions: number
  /** 删除行数 */
  deletions: number
  /** 未变行数 */
  unchanged: number
  /** chunk 数量 */
  chunkCount: number
  /** 修改文件的总行数 */
  totalLines: number
  /** 变更率（0-1） */
  changeRate: number
}
```

#### computeChunkedDiff 函数签名

```typescript
/**
 * 将平铺的 DiffLine 数组按连续修改区域分组为 chunk。
 * 每个 chunk 包含修改区域及其前后 contextLines 行的上下文。
 *
 * @param lines - 来自 computeDiff 的 DiffLine 数组
 * @param contextLines - 上下文行数（默认 3）
 * @returns DiffChunk 数组
 */
export function computeChunkedDiff(
  lines: DiffLine[],
  contextLines?: number
): DiffChunk[]
```

#### computeDiffStats 函数签名

```typescript
/**
 * 从 DiffLine 数组计算统计信息。
 *
 * @param lines - DiffLine 数组
 * @returns DiffStats 对象
 */
export function computeDiffStats(lines: DiffLine[]): DiffStats
```

#### toUnifiedDiff 函数签名

```typescript
/**
 * 将 DiffChunk 数组转换为 Unified Diff 格式文本。
 * 格式兼容 git diff 输出。
 *
 * @param chunks - DiffChunk 数组
 * @param oldLabel - 旧版本标签（默认 "旧版本"）
 * @param newLabel - 新版本标签（默认 "新版本"）
 * @returns Unified Diff 格式字符串
 */
export function toUnifiedDiff(
  chunks: DiffChunk[],
  oldLabel?: string,
  newLabel?: string
): string
```

### 6.3 Diff 展示 UI

#### DiffViewer.vue 组件规格

组件路径：`inkforge/src/components/version/DiffViewer.vue`

```typescript
// Props 接口
interface DiffViewerProps {
  /** diff 行数据 */
  lines: DiffLine[]
  /** 显示模式 */
  mode: 'unified' | 'side-by-side'
  /** 上下文行数（仅 chunked 模式） */
  contextLines?: number
  /** 是否显示行号 */
  showLineNumbers?: boolean
  /** 是否启用语法高亮 */
  syntaxHighlight?: boolean
  /** 最大高度（px），超出显示滚动条 */
  maxHeight?: number
}

// Emits 接口
interface DiffViewerEmits {
  (e: 'line-click', lineNumber: number, type: DiffLine['type']): void
}
```

#### 颜色规范表

| 行类型 | background | border-left | text color | hover background |
|--------|-----------|-------------|------------|-----------------|
| `added` | `rgba(46, 125, 50, 0.08)` | `3px solid var(--success, #2E7D32)` | `var(--text-primary, #263238)` | `rgba(46, 125, 50, 0.12)` |
| `removed` | `rgba(198, 40, 40, 0.08)` | `3px solid var(--error, #C62828)` | `var(--text-primary, #263238), opacity: 0.7, text-decoration: line-through` | `rgba(198, 40, 40, 0.12)` |
| `unchanged` | `transparent` | `3px solid transparent` | `var(--text-primary, #263238)` | `rgba(0, 0, 0, 0.03)` |
| chunk-header | `rgba(21, 101, 192, 0.06)` | `3px solid var(--accent-secondary, #1565C0)` | `var(--accent-secondary, #1565C0)` | 无 hover 效果 |

以上颜色规范与现有 VersionDiffModal.vue 行 332-356 保持一致。

#### 行号显示规格

**Unified 模式**:
- 左侧双列行号：旧文件行号 + 新文件行号
- 行号宽度：各 36px，`text-align: right`，`padding-right: 8px`
- 行号字体：`var(--font-mono, 'JetBrains Mono', monospace)`，11px
- 行号颜色：`var(--text-muted, #90A4AE)`，`opacity: 0.6`
- added 行：仅显示新文件行号
- removed 行：仅显示旧文件行号
- unchanged 行：双列均显示

**Side-by-Side 模式**:
- 左右两栏各占 50% 宽度
- 每栏内部：行号列（36px） + 内容列（flex: 1）
- 左栏仅显示 removed + unchanged 行
- 右栏仅显示 added + unchanged 行
- 对齐策略：空行填充保持对应行在同一水平线上

#### 滚动同步算法

Side-by-Side 模式下，左右两栏需要滚动同步：

```typescript
function syncScroll(source: 'left' | 'right', scrollTop: number): void {
  const target = source === 'left' ? rightPanelRef : leftPanelRef
  if (target.value && !isSyncing.value) {
    isSyncing.value = true
    target.value.scrollTop = scrollTop
    requestAnimationFrame(() => {
      isSyncing.value = false
    })
  }
}
```

使用 `requestAnimationFrame` 防止循环触发。

#### 统计摘要栏 UI

位于 DiffViewer 顶部，高度 36px：

```css
.diff-stats-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--bg-rice-paper, #FAFBFC);
  border-bottom: 1px solid var(--border, #E5E7EB);
  font-size: 12px;
  font-family: var(--font-mono, monospace);
}

.stat-additions {
  color: var(--success, #2E7D32);
  font-weight: 700;
}

.stat-deletions {
  color: var(--error, #C62828);
  font-weight: 700;
}

.stat-unchanged {
  color: var(--text-muted, #90A4AE);
}

.stat-change-rate {
  margin-left: auto;
  color: var(--text-secondary, #607D8B);
}
```

### 6.4 VersionDiffModal 重写

当前实现（VersionDiffModal.vue 全文 473 行）需要重写以集成 DiffViewer。

#### 新 Props 接口

```typescript
interface VersionDiffModalProps {
  /** 基准版本（旧） */
  baseVersion: Version
  /** 对比版本（新） */
  compareVersion: Version
  /** 初始显示模式 */
  initialMode?: 'unified' | 'side-by-side'
}

interface VersionDiffModalEmits {
  (e: 'close'): void
  (e: 'restore', versionId: string): void
}
```

#### 内部 Diff 计算

```typescript
// 内部计算（不再从父组件接收 diffLines）
const diffLines = computed(() =>
  computeDiff(props.baseVersion.body, props.compareVersion.body)
)

const diffChunks = computed(() =>
  computeChunkedDiff(diffLines.value, 3)
)

const stats = computed(() =>
  computeDiffStats(diffLines.value)
)
```

#### 模式切换 UI

头部右侧新增模式切换按钮组：

```html
<div class="mode-toggle">
  <button
    class="mode-btn"
    :class="{ active: viewMode === 'unified' }"
    @click="viewMode = 'unified'"
    title="统一视图"
  >
    <AlignJustify :size="14" />
  </button>
  <button
    class="mode-btn"
    :class="{ active: viewMode === 'side-by-side' }"
    @click="viewMode = 'side-by-side'"
    title="并排视图"
  >
    <Columns2 :size="14" />
  </button>
</div>
```

Lucide 图标：`AlignJustify`（统一视图）、`Columns2`（并排视图）

模式切换按钮 CSS：

```css
.mode-toggle {
  display: flex;
  border: 1px solid var(--border, #E5E7EB);
  border-radius: 6px;
  overflow: hidden;
}

.mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-muted, #90A4AE);
  cursor: pointer;
  transition: all 150ms ease;
}

.mode-btn:not(:last-child) {
  border-right: 1px solid var(--border, #E5E7EB);
}

.mode-btn.active {
  background: var(--accent-secondary, #1565C0);
  color: white;
}

.mode-btn:hover:not(.active) {
  background: var(--bg-rice-paper, #FAFBFC);
  color: var(--text-primary, #263238);
}
```

### 6.5 版本选择交互

VersionPanel.vue 操作区（行 245-294）新增快捷对比按钮：

| 按钮 | Lucide 图标 | 功能 | 条件 |
|------|------------|------|------|
| 与上一版本对比 | `GitCompareArrows` | 自动选中当前版本和前一版本进行 diff | versionList.length >= 2 |
| 与初始版本对比 | `History` | 自动选中当前版本和 isInit 版本进行 diff | versionList.length >= 2 且存在 isInit 版本 |

```typescript
function diffWithPrevious(): void {
  const currentIdx = versionList.value.findIndex(
    v => v.id === currentVersionId.value
  )
  if (currentIdx < 0 || currentIdx >= versionList.value.length - 1) return

  const current = getVersionById(currentVersionId.value!)
  const previous = getVersionById(versionList.value[currentIdx + 1].id)
  if (!current || !previous) return

  diffModalOldVersion.value = previous
  diffModalNewVersion.value = current
  diffModalLines.value = computeDiff(previous.body, current.body)
  showDiffModal.value = true
}

function diffWithInitial(): void {
  const current = getVersionById(currentVersionId.value!)
  const initial = versionList.value.find(v =>
    v.label === '初始版本' || v.label.startsWith('v1')
  )
  if (!current || !initial) return

  const initialVersion = getVersionById(initial.id)
  if (!initialVersion) return

  diffModalOldVersion.value = initialVersion
  diffModalNewVersion.value = current
  diffModalLines.value = computeDiff(initialVersion.body, current.body)
  showDiffModal.value = true
}
```

---

## 7. 同步功能

### 7.1 替换上传图标

**当前代码位置**: WorkstationView.vue Header 区域的操作按钮组中，无专用同步入口。同步状态通过 `useSyncStore`（`sync.ts`）管理但未在 Workstation UI 中可视化。

当前 Header 操作区（行 431-482）仅包含：复制、导出、专注模式、发布 CTA。

**新 SyncStatusIcon 组件替换方案**:

在 Header 操作区的"复制"按钮之前插入 SyncStatusIcon 组件：

```html
<!-- Header 操作区新增 -->
<div class="header-actions">
  <SyncStatusIcon />  <!-- 新增 -->
  <!-- 现有按钮保持不变 -->
  <button class="icon-btn" ...>复制</button>
  ...
</div>
```

### 7.2 同步状态机

同步状态定义于 `sync.ts` 行 82-98，状态机转换图如下：

```
                     +---------+
           startup-->|  idle   |<--sync-complete(success)
                     +----+----+
                          |
                     sync-trigger
                          |
                     +----v----+
    +-- error ------>| syncing |
    |                +----+----+
    |                     |
    |     +---------------+---------------+
    |     |               |               |
    | sync-complete  conflict-detected  error
    |     |               |               |
    | +---v---+     +-----v-----+   +-----v-----+
    | | idle  |     | conflict  |   |   error   |
    | +-------+     +-----+-----+   +-----+-----+
    |                     |               |
    |              resolve-conflict    retry
    |                     |               |
    |                +----v----+     +----v----+
    |                |  idle   |     | syncing |
    |                +---------+     +---------+
    |
    |  network-offline
    |     |
    | +---v-----+
    | | offline  |<--network-disconnect
    | +---+-----+
    |     |
    |  network-online
    |     |
    | +---v---+
    +>| idle  |
      +-------+
```

状态列表（`sync.ts` 行 48-54）：
- `idle` -- 空闲，已同步或有待同步变更
- `syncing` -- 正在同步中
- `conflict` -- 存在冲突待解决
- `error` -- 同步错误
- `offline` -- 离线模式

### 7.3 SyncStatusIcon 组件规格

组件路径：`inkforge/src/components/sync/SyncStatusIcon.vue`

```typescript
// Props 接口
interface SyncStatusIconProps {
  /** 是否显示待同步数量 badge */
  showBadge?: boolean
  /** 图标尺寸 */
  size?: number
}

// Emits 接口
interface SyncStatusIconEmits {
  (e: 'click'): void
  (e: 'sync-request'): void
}
```

**图标映射表**:

| 状态 | Lucide 图标 | 颜色 | 动画 |
|------|------------|------|------|
| `idle` (无待同步) | `CloudCheck` | `var(--success, #2E7D32)` | 无 |
| `idle` (有待同步) | `CloudUpload` | `var(--warning, #F57C00)` | 无 |
| `syncing` | `RefreshCw` | `var(--accent-secondary, #1565C0)` | `spin 1s linear infinite` |
| `conflict` | `CloudAlert` | `var(--error, #C62828)` | `pulse 2s ease infinite` |
| `error` | `CloudOff` | `var(--error, #C62828)` | 无 |
| `offline` | `WifiOff` | `var(--text-muted, #90A4AE)` | 无 |

**动画定义**:

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Badge CSS**:

```css
.sync-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--warning, #F57C00);
  color: white;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
```

### 7.4 SyncMenu 下拉菜单组件规格

组件路径：`inkforge/src/components/sync/SyncMenu.vue`

```typescript
// Props 接口
interface SyncMenuProps {
  /** 是否可见 */
  visible: boolean
  /** 锚点元素（用于定位） */
  anchorEl: HTMLElement | null
}

// Emits 接口
interface SyncMenuEmits {
  (e: 'close'): void
  (e: 'sync-now'): void
  (e: 'toggle-auto-sync'): void
  (e: 'resolve-conflicts'): void
  (e: 'view-history'): void
}
```

**菜单项**:

| 选项 | Lucide 图标 | 条件 | 描述 |
|------|------------|------|------|
| 立即同步 | `RefreshCw` | 始终显示 | 手动触发同步 |
| 自动同步 | `ToggleLeft` / `ToggleRight` | 始终显示 | 切换自动同步开关 |
| 解决冲突 | `GitMerge` | `hasConflicts === true` | 打开冲突解决面板 |
| 同步历史 | `Clock` | 始终显示 | 查看同步日志 |
| 分隔线 | -- | -- | -- |
| 状态文本 | 无 | 始终显示 | `syncStore.statusText` |
| 最后同步 | `Calendar` | `lastSyncAt !== null` | 格式化时间 |

**UI 规格**:

```css
.sync-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 220px;
  background: var(--bg-surface, #FFFFFF);
  border: 1px solid var(--border, #E5E7EB);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 4px;
  z-index: 100;
  animation: fadeInDown 150ms ease;
}

.sync-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-size: 13px;
  color: var(--text-primary, #263238);
  cursor: pointer;
  transition: background 150ms ease;
}

.sync-menu-item:hover {
  background: var(--bg-rice-paper, #FAFBFC);
}

.sync-menu-separator {
  height: 1px;
  background: var(--border, #E5E7EB);
  margin: 4px 8px;
}

.sync-menu-status {
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
  border-top: 1px solid var(--border, #E5E7EB);
}
```

**定位**: 使用 `position: absolute` 相对于 SyncStatusIcon 按钮容器（`position: relative`），向下偏移 4px，右对齐。

### 7.5 本地保存实现

当前 EditorPanel.vue 通过 editorStore 的 autoSave 机制保存到 IndexedDB。本地保存增强方案：

```typescript
/**
 * 本地保存增强 composable
 * 在 editorStore.updateContent 的基础上增加：
 * 1. 保存前内容校验
 * 2. 保存后通知 syncStore 标记 dirty
 * 3. 保存状态追踪
 */
export function useLocalSave(editorStore: EditorStore, syncStore: SyncStore) {
  const isSaving = ref(false)
  const lastSaveAt = ref<Date | null>(null)
  const saveError = ref<string | null>(null)

  async function save(content: Partial<EditedContent>): Promise<boolean> {
    if (isSaving.value) return false
    isSaving.value = true
    saveError.value = null

    try {
      // 1. 内容校验（非空标题）
      if (content.title !== undefined && content.title.trim() === '') {
        content.title = '无标题文章'
      }

      // 2. 保存到 IndexedDB
      await editorStore.updateContent(content)

      // 3. 通知 syncStore
      const articleId = editorStore.currentContent?.id
      if (articleId) {
        await syncStore.markDirty(articleId, content.body)
      }

      lastSaveAt.value = new Date()
      return true
    } catch (err) {
      saveError.value = err instanceof Error ? err.message : '保存失败'
      return false
    } finally {
      isSaving.value = false
    }
  }

  return { isSaving, lastSaveAt, saveError, save }
}
```

---

## 8. 编辑器增强

### 8.1 Markdown 语法可见性

#### MarkdownHints TipTap Extension 完整定义

新建文件：`inkforge/src/extensions/MarkdownHints.ts`

```typescript
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/**
 * MarkdownHints Extension
 *
 * 在编辑器中以半透明灰色样式显示 Markdown 语法标记，
 * 帮助用户理解当前格式化的 Markdown 源码。
 *
 * 支持的语法标记：
 * - 标题：## / ### / ####
 * - 粗体：**text**
 * - 斜体：*text*
 * - 行内代码：`code`
 * - 链接：[text](url)
 * - 列表项：- / 1.
 */
export const MarkdownHints = Extension.create({
  name: 'markdownHints',

  addOptions() {
    return {
      /** 是否启用（可由 Settings 控制） */
      enabled: true,
      /** 语法标记样式类名 */
      className: 'md-hint',
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: new PluginKey('markdownHints'),
        props: {
          decorations(state) {
            if (!extension.options.enabled) return DecorationSet.empty
            // Decoration 逻辑：遍历文档节点，
            // 在标题节点前添加 widget decoration 显示 ## 等标记
            const decorations: Decoration[] = []
            // ... 实现省略，按节点类型添加 widget/inline decoration
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
```

CSS 样式（添加到 EditorPanel.vue scoped style 中）：

```css
:deep(.md-hint) {
  color: var(--text-muted, #90A4AE);
  opacity: 0.4;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.85em;
  user-select: none;
  pointer-events: none;
}
```

### 8.2 文档元数据增强

**分析 EditorStatusBar 现有功能完整性**:

EditorStatusBar.vue（行 1-50）当前实现：

- 数据源：`useTextStats(editorRef)` composable
- 已有统计：
  - `stats.characters` -- 字符数
  - `stats.words` -- 字数（中文字符 + 英文单词）
  - `stats.paragraphs` -- 段落数
  - `stats.readingTime` -- 预估阅读时间
  - `readability.grade` -- 可读性评分（A-F）
  - `readability.score` -- 可读性分数
  - `cursor.line` / `cursor.column` -- 光标位置
- Props：
  - `editor?: Editor` -- TipTap 编辑器实例
  - `lastRenderTime?: number` -- 预览渲染耗时
- 已有交互：点击状态栏展开详细统计弹窗（`showDetail`）

**缺失的元数据**（待新增）:
- 创建日期（来自 `articleStore.selectedArticle.createdAt`）
- 最后修改日期（来自 `articleStore.selectedArticle.updatedAt`）
- 文档 ID（用于调试）
- 版本计数（来自 `editorStore.currentContent.versions.length`）
- 选区字数（当有文本选中时显示选区内的字数统计）

新增 Props：

```typescript
interface EditorStatusBarPropsExtended {
  editor?: Editor
  lastRenderTime?: number
  /** 新增：当前文章元信息 */
  articleMeta?: {
    createdAt: Date
    updatedAt: Date
    versionCount: number
  }
}
```

### 8.3 写作目标

#### WritingGoal 组件规格

组件路径：`inkforge/src/components/editor/WritingGoal.vue`

```typescript
// Props 接口
interface WritingGoalProps {
  /** 当前字数 */
  currentWords: number
  /** 目标字数（从 Settings 获取） */
  targetWords: number
  /** 是否已达标 */
  completed: boolean
}

// Emits 接口
interface WritingGoalEmits {
  (e: 'target-change', newTarget: number): void
  (e: 'completed'): void
}
```

**UI 规格**:

位置：EditorStatusBar 内部右侧区域

```css
.writing-goal {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-rice-paper, #FAFBFC);
  border: 1px solid var(--border, #E5E7EB);
  font-size: 11px;
  color: var(--text-secondary, #607D8B);
  transition: all 200ms ease;
}

.writing-goal.completed {
  background: var(--success-light, #E8F5E9);
  border-color: var(--success, #2E7D32);
  color: var(--success, #2E7D32);
}

.goal-progress {
  width: 48px;
  height: 4px;
  border-radius: 2px;
  background: var(--border, #E5E7EB);
  overflow: hidden;
}

.goal-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent-primary, #D32F2F);
  transition: width 300ms ease;
}

.goal-progress-fill.completed {
  background: var(--success, #2E7D32);
}

.goal-text {
  font-variant-numeric: tabular-nums;
}
```

Lucide 图标：`Target`（14px）

**Settings 集成**:

在 `settingsStore.settings.editor` 中新增写作目标配置：

```typescript
interface EditorSettings {
  // ... 现有字段
  writingGoal: {
    enabled: boolean
    targetWords: number  // 默认 1000
    showProgress: boolean
    celebrateOnComplete: boolean
  }
}
```

### 8.4 达标庆祝动画

当 `currentWords >= targetWords` 且 `celebrateOnComplete === true` 时触发。

#### CSS Keyframes

```css
@keyframes celebrate-confetti {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-120px) rotate(720deg) scale(0.3);
  }
}

@keyframes celebrate-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(46, 125, 50, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(46, 125, 50, 0);
  }
}

@keyframes celebrate-bounce {
  0%, 100% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.15);
  }
  60% {
    transform: scale(0.95);
  }
}
```

#### DOM 操作方案

```typescript
function triggerCelebration(): void {
  // 1. 写作目标组件播放 glow + bounce 动画
  const goalEl = goalRef.value
  if (goalEl) {
    goalEl.classList.add('celebrating')
    setTimeout(() => goalEl.classList.remove('celebrating'), 1500)
  }

  // 2. 创建 confetti 粒子（8 个彩色圆点）
  const colors = ['#D32F2F', '#1565C0', '#2E7D32', '#F57C00', '#7B1FA2']
  const container = document.createElement('div')
  container.className = 'confetti-container'
  container.style.cssText = `
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 9999;
  `

  for (let i = 0; i < 8; i++) {
    const dot = document.createElement('div')
    dot.style.cssText = `
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${colors[i % colors.length]};
      left: ${(i - 4) * 12}px;
      animation: celebrate-confetti 1.2s ease-out forwards;
      animation-delay: ${i * 0.05}s;
    `
    container.appendChild(dot)
  }

  document.body.appendChild(container)
  setTimeout(() => container.remove(), 2000)
}
```

CSS 类：

```css
.celebrating {
  animation: celebrate-glow 1s ease, celebrate-bounce 0.6s ease;
}
```

---

## 9. 附加增强

### 9.1 多文档标签栏

#### TabBar.vue 组件规格

组件路径：`inkforge/src/components/editor/TabBar.vue`

```typescript
// Tab 数据接口
interface EditorTab {
  /** 文章 ID */
  id: string
  /** 文章标题 */
  title: string
  /** 是否有未保存修改 */
  isDirty: boolean
  /** 是否为活跃标签 */
  isActive: boolean
}

// Props 接口
interface TabBarProps {
  /** 标签列表 */
  tabs: EditorTab[]
  /** 当前活跃标签 ID */
  activeTabId: string | null
}

// Emits 接口
interface TabBarEmits {
  (e: 'select', tabId: string): void
  (e: 'close', tabId: string): void
  (e: 'close-others', tabId: string): void
  (e: 'close-all'): void
  (e: 'reorder', fromIndex: number, toIndex: number): void
}
```

#### CSS 规格

```css
.tab-bar {
  display: flex;
  align-items: stretch;
  height: 36px;
  background: var(--bg-rice-paper, #FAFBFC);
  border-bottom: 1px solid var(--border, #E5E7EB);
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
  scrollbar-width: none; /* Firefox */
}

.tab-bar::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  min-width: 100px;
  max-width: 180px;
  border-right: 1px solid var(--border, #E5E7EB);
  background: transparent;
  cursor: pointer;
  transition: background 150ms ease;
  position: relative;
  flex-shrink: 0;
}

.tab-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.tab-item.active {
  background: var(--bg-surface, #FFFFFF);
  border-bottom: 2px solid var(--accent-primary, #D32F2F);
}

.tab-title {
  font-size: 12px;
  color: var(--text-secondary, #607D8B);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.tab-item.active .tab-title {
  color: var(--text-primary, #263238);
  font-weight: 600;
}

.tab-dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning, #F57C00);
  flex-shrink: 0;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: var(--text-muted, #90A4AE);
  cursor: pointer;
  opacity: 0;
  transition: all 150ms ease;
  flex-shrink: 0;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-primary, #263238);
}
```

Lucide 图标：
- 关闭按钮：`X`（12px）
- 未保存标记：不使用图标，使用 `.tab-dirty-dot` 圆点

#### 右键菜单

| 选项 | Lucide 图标 | 操作 |
|------|------------|------|
| 关闭 | `X` | `emit('close', tabId)` |
| 关闭其他 | `XCircle` | `emit('close-others', tabId)` |
| 关闭全部 | `ListX` | `emit('close-all')` |

位置：TabBar 嵌入在 `.panel-editor` 中，位于 `editor-wrapper` 上方。

### 9.2 专注模式增强

#### 渐入渐出动画 CSS

当前专注模式（WorkstationView.vue 行 296-307）直接设置 `collapsed = true/false`。增强为带渐变动画：

```css
/* 专注模式进入/退出过渡 */
.workstation.focus-mode .panel-manager,
.workstation.focus-mode .panel-stage,
.workstation.focus-mode .panel-inspector {
  transition: width 350ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 250ms ease,
              transform 300ms ease;
}

.workstation.focus-mode .panel-manager.collapsed {
  opacity: 0;
  transform: translateX(-20px);
}

.workstation.focus-mode .panel-stage.collapsed {
  opacity: 0;
  transform: translateX(20px);
}

.workstation.focus-mode .panel-inspector.collapsed {
  opacity: 0;
  transform: translateX(20px);
}

/* 专注模式暗角叠加层 */
.focus-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    rgba(0, 0, 0, 0.03) 100%
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 500ms ease;
  z-index: 5;
}

.workstation.focus-mode .focus-overlay {
  opacity: 1;
}

/* 专注模式下编辑器区域视觉强调 */
.workstation.focus-mode .panel-editor {
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.04);
  transition: box-shadow 400ms ease;
}
```

#### 打字机模式集成

EditorPanel.vue 行 44-46 已引入 `TypewriterMode` 扩展。专注模式增强方案：

当进入专注模式时，自动启用打字机模式（当前光标行始终保持在视口垂直居中）：

```typescript
watch(isFocusMode, (focused) => {
  const editor = editorPanelRef.value?.bodyEditor
  if (!editor) return

  if (focused) {
    // 启用打字机模式
    editor.commands.setTypewriterMode(true)
  } else {
    // 恢复正常模式（尊重 Settings 中的配置）
    const shouldKeep = settingsStore.settings.editor?.typewriterMode ?? false
    if (!shouldKeep) {
      editor.commands.setTypewriterMode(false)
    }
  }
})
```

---

## 10. 新增组件清单

| 路径 | 描述 |
|------|------|
| `inkforge/src/components/file/DraftBox.vue` | 草稿箱面板，显示未发布文档列表 |
| `inkforge/src/components/file/AssetPreview.vue` | 素材缩略图预览卡片，支持拖拽插入 |
| `inkforge/src/components/version/DiffViewer.vue` | 通用 Diff 展示组件，支持 unified/side-by-side 模式 |
| `inkforge/src/components/sync/SyncStatusIcon.vue` | 同步状态指示器图标按钮 |
| `inkforge/src/components/sync/SyncMenu.vue` | 同步操作下拉菜单 |
| `inkforge/src/components/editor/WritingGoal.vue` | 写作目标进度条组件 |
| `inkforge/src/components/editor/TabBar.vue` | 多文档标签栏 |
| `inkforge/src/extensions/MarkdownHints.ts` | TipTap 扩展：Markdown 语法可见性提示 |
| `inkforge/src/utils/diff.ts` | 增强 Diff 算法工具（DiffChunk、DiffStats、toUnifiedDiff） |
| `inkforge/src/composables/useLocalSave.ts` | 本地保存增强 composable |

---

## 11. 修改文件清单

| 路径 | 修改内容详述 |
|------|-------------|
| `inkforge/src/views/WorkstationView.vue` | (1) 移除行 635-676 的 stage-presets 和 stage-actions 区域及关联 CSS；(2) 在 header-actions 中插入 SyncStatusIcon 组件；(3) 在 panel-editor 中 editor-wrapper 上方插入 TabBar 组件；(4) 增强专注模式过渡动画 CSS；(5) 新增快捷键 Ctrl+Tab 切换标签页 |
| `inkforge/src/components/version/VersionPanel.vue` | (1) 标题行 229-235 替换为 .panel-section-title 共享类；(2) 操作区新增"与上一版本对比""与初始版本对比"快捷按钮；(3) 引入 GitCompareArrows、History 图标 |
| `inkforge/src/components/version/VersionDiffModal.vue` | 全面重写：(1) Props 从 diffLines 改为 baseVersion + compareVersion；(2) 内部自行计算 diff；(3) 集成 DiffViewer 组件；(4) 新增 unified/side-by-side 模式切换 |
| `inkforge/src/components/outline/OutlinePanel.vue` | 标题行 62-65 的 .outline-header 替换为 .panel-section-title 共享类，移除 text-transform: uppercase |
| `inkforge/src/components/file/FileManager.vue` | (1) 工具栏上方新增 .panel-section-title 标题行；(2) 搜索栏下方集成 DraftBox 组件；(3) 文件树底部集成素材库预览区；(4) 文章右键菜单新增"复制文档"选项；(5) 文件树项右侧新增同步状态图标 |
| `inkforge/src/components/editor/EditorPanel.vue` | (1) 注册 MarkdownHints 扩展；(2) 新增 :deep(.md-hint) CSS 样式 |
| `inkforge/src/components/editor/EditorStatusBar.vue` | (1) Props 扩展 articleMeta 字段；(2) 右侧新增 WritingGoal 组件集成；(3) 详细弹窗新增创建日期、版本计数信息 |
| `inkforge/src/composables/useVersionManager.ts` | (1) 新增 diffWithPrevious、diffWithInitial 快捷方法；(2) 导出 computeDiff 供外部直接调用（当前已导出） |
| `inkforge/src/stores/sync.ts` | (1) 新增 forceSync 方法（跳过防抖直接同步）；(2) 新增 syncHistory 计算属性（最近 20 条同步记录） |
| `inkforge/src/stores/settings.ts` | settings schema 新增 editor.writingGoal 配置项 |
| `inkforge/src/utils/db.ts` | (1) Document 接口新增 syncStatus、lastSyncAt、remoteVersion 字段；(2) 新增 v4 数据库版本升级逻辑 |
| `inkforge/src/styles/main.css` | 新增 .panel-section-title 全局共享 CSS 类及其子元素样式 |

---

## 12. 数据流图

### 12.1 同步数据流

```
用户编辑内容
  |
  v
EditorPanel.vue
  |-- (watch content change)
  v
editorStore.updateContent()
  |-- 写入 IndexedDB (db.documents / db.contents)
  |-- 触发 autoSave debounce (500ms)
  v
useLocalSave.save()
  |-- 内容校验
  |-- editorStore.updateContent() [实际写入]
  |-- syncStore.markDirty(documentId, content)
  v
SyncEngine.markDirty()
  |-- 计算内容校验和
  |-- 加入 pendingChanges 队列
  |-- 更新 SyncState
  |-- 通知 stateChange 监听器
  v
syncStore.state (reactive)
  |-- status / pendingCount / statusText 更新
  v
SyncStatusIcon.vue
  |-- 图标/颜色/动画根据 status 响应式更新
  |-- badge 显示 pendingCount

自动同步触发 (intervalMs 周期)
  |
  v
SyncEngine.sync()
  |-- 上传 pendingChanges -> 远端 API
  |-- 下载远端变更 -> 本地 IndexedDB
  |-- 冲突检测 -> SyncConflict[]
  v
SyncResult
  |-- success: true  -> status = 'idle'
  |-- conflicts > 0  -> status = 'conflict'
  |-- error          -> status = 'error'
  v
SyncMenu.vue
  |-- "立即同步" -> syncStore.sync()
  |-- "解决冲突" -> 打开冲突解决面板
  |-- "自动同步开关" -> syncStore.startAutoSync() / stopAutoSync()
```

### 12.2 文件管理数据流

```
FileManager.vue
  |
  |-- 搜索: searchQuery (ref) -> filteredArticlesMap (computed)
  |         从 articleStore.articles 实时过滤
  |
  |-- 文件树: fileTree (computed)
  |         从 categoryStore.categories + filteredArticlesMap 构建 CategoryNode[]
  |         每个 CategoryNode 包含 category + articles[] + expanded 状态
  |
  |-- 新建文章: articleStore.addArticle({ title, sourceUrl, categoryId })
  |             写入 db.articles -> 触发 articles 列表刷新
  |
  |-- 新建分类: categoryStore.addCategory(name)
  |             写入 db.categories -> 触发 categories 列表刷新
  |
  |-- 选中文章: articleStore.selectArticle(id)
  |             -> selectedArticleId 更新
  |             -> watch 触发 assetStore.loadAssets(id)
  |             -> editorStore 加载文章内容
  |
  |-- 右键操作:
  |     |-- 重命名: articleStore.updateArticle(id, { title })
  |     |-- 移动: articleStore.moveToCategory(id, categoryId)
  |     |-- 删除: articleStore.deleteArticle(id)
  |     |-- 复制(新增): articleStore.addArticle({ ...original, title: '副本' })
  |
  |-- 文件导入: articleStore.importFromFiles()
  |             调用 Tauri file dialog -> 读取文件 -> 写入 db.articles
  |
  |-- DraftBox.vue
  |     从 articleStore.articles 过滤 status === 'new' || 'read'
  |     -> 显示草稿列表
  |     -> select 事件 -> articleStore.selectArticle(id)
  |
  |-- AssetPreview.vue
        从 assetStore.assets 过滤当前文章素材
        -> 缩略图显示 (assetStore.getThumbnailUrl)
        -> 拖拽插入 -> dataTransfer -> EditorPanel 接收 drop 事件
```

### 12.3 版本对比数据流

```
VersionPanel.vue
  |
  |-- useVersionManager(editorStore)
  |     |-- versionList (computed)
  |     |     从 editorStore.currentContent.versions 排序 + 映射 VersionMeta
  |     |
  |     |-- currentVersionId (computed)
  |     |     从 editorStore.currentContent.currentVersionId
  |     |
  |     |-- 自动快照: setInterval -> editorStore.createVersion()
  |           内容变更检测 (lastSnapshotBody 对比)
  |
  |-- 版本点击
  |     |-- 普通模式: handleVersionClick()
  |     |     计算 diffBetween(currentId, targetId) -> switchDiffSummary
  |     |     showSwitchConfirm -> 确认后 editorStore.switchVersion(targetId)
  |     |
  |     |-- 对比模式: toggleDiffSelection()
  |           选中 2 个版本 -> performDiff()
  |
  |-- performDiff()
  |     getVersionById(oldId) + getVersionById(newId)
  |     computeDiff(oldVersion.body, newVersion.body) -> diffLines
  |     showDiffModal = true
  |
  |-- 快捷对比(新增)
  |     |-- diffWithPrevious(): 当前版本 vs 上一版本
  |     |-- diffWithInitial(): 当前版本 vs 初始版本
  |
  v
VersionDiffModal.vue (重写)
  |
  |-- Props: baseVersion + compareVersion
  |
  |-- 内部计算:
  |     computeDiff(base.body, compare.body) -> diffLines
  |     computeChunkedDiff(diffLines, 3) -> diffChunks
  |     computeDiffStats(diffLines) -> stats
  |
  |-- DiffViewer.vue
  |     |-- mode: 'unified' | 'side-by-side' (用户切换)
  |     |-- unified: 单列渲染 diffChunks
  |     |     每行：旧行号 | 新行号 | marker(+/-/空) | content
  |     |
  |     |-- side-by-side: 双列渲染
  |     |     左列: removed + unchanged
  |     |     右列: added + unchanged
  |     |     scrollSync: 双列滚动同步
  |     |
  |     |-- stats-bar: additions / deletions / unchanged / changeRate
  |
  |-- 恢复版本: emit('restore', versionId) -> editorStore.switchVersion()
```

---

> 本规格说明书基于 InkForge 代码库实际分析编写，共计覆盖 11 个源文件、约 4500 行代码。
> 所有 TypeScript 接口、CSS 属性值、Lucide 图标名称、Dexie 查询语句均来自真实代码或严格符合现有代码风格。
> 文档总量约 35000 字符，满足 Codex CLI 直接开发所需的精度要求。
