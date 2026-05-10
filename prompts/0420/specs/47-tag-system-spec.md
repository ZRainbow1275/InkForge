> 版本: v2.1 | 状态: Draft | 关联决策: F-06, L1-43, N-04 | 依赖 Spec: 12-file-manager-spec.md, 29-search-engine-spec.md

# Spec 47 — 标签系统（TagSystem）

---

## 目录

1. 概述与设计目标
2. 架构总览
3. TypeScript 类型系统
4. 标签数据模型
5. 标签 CRUD
6. 文档与标签的多对多关系
7. 标签输入与自动补全
8. 颜色系统
9. 标签浏览器
10. 过滤逻辑（AND/OR）
11. 标签合并操作
12. 标签云可视化
13. Store 定义
14. Repository 定义
15. 测试矩阵

---

## 1. 概述与设计目标

标签系统（TagSystem）为 InkForge 文档提供轻量、灵活的分类能力。与文件夹的层级结构（树形）不同，标签是扁平、多对多的分类维度——一篇文档可属于多个标签，一个标签可聚合跨文件夹的文档。

### 1.1 核心职责

- 提供文档标签的完整 CRUD（创建、读取、更新、删除）
- 支持文档与标签的多对多关联
- 提供标签输入自动补全（MiniSearch 前缀过滤）
- 提供标签浏览器（按标签聚合文档）
- 提供 AND/OR 两种过滤逻辑
- 支持标签合并（多个标签合并为一个）
- 提供标签云可视化（Hub 数据洞察区）

### 1.2 设计约束

- 标签名不允许含空格（使用连字符 `-` 或下划线 `_`，或中文连续字符）
- 标签名长度限制：1~50 字符
- 每篇文档最多 20 个标签
- 颜色必须在预设色板中选择（或用户自定义 HEX）
- 孤儿标签（无文档关联）可保留（不自动清理），用户手动删除

---

## 2. 架构总览

```
TagSystem
├── TagRepository              — 数据访问层
├── useTagStore                — Pinia Store
│
├── TagInput                   — 文档属性面板 / frontmatter 中的标签输入控件
│   ├── TagAutocomplete        — 输入时的候选列表
│   └── TagBadge               — 已选标签的展示/删除
│
├── TagBrowser                 — Sidebar 中的标签浏览器
│   ├── TagList                — 全部标签列表（含频次）
│   ├── TagDocumentList        — 点击标签后展示关联文档
│   └── TagFilterBar           — AND/OR 切换
│
├── TagManagerModal            — 标签管理页（CRUD + 合并）
│   ├── TagEditor              — 编辑标签名和颜色
│   └── TagMergeConfirm        — 合并确认弹窗
│
└── TagCloud                   — Hub 数据洞察区的标签云组件
```

---

## 3. TypeScript 类型系统

```typescript
// src/types/tag.ts

/** 标签实体 */
export interface Tag {
  id: string;
  name: string;
  /** HEX 颜色，如 "#3b82f6" */
  color: string;
  /** 关联文档数量（冗余字段，定期同步） */
  docCount: number;
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

/** 文档-标签关联记录 */
export interface DocTag {
  docId: string;
  tagId: string;
  addedAt: string;
}

/** 标签颜色预设 */
export interface TagColorPreset {
  name: string;
  hex: string;
}

/** 标签过滤逻辑 */
export type TagFilterMode = 'AND' | 'OR';

/** 标签云节点（用于可视化） */
export interface TagCloudNode {
  tag: Tag;
  /** 归一化后的权重（0~1，用于字体大小计算） */
  weight: number;
  fontSize: number;
}

/** 创建标签参数 */
export interface CreateTagParams {
  name: string;
  color: string;
  accountId: string;
}

/** 更新标签参数 */
export interface UpdateTagParams {
  name?: string;
  color?: string;
}

/** 标签合并参数 */
export interface MergeTagsParams {
  /** 被合并的标签 id（将被删除） */
  sourceIds: string[];
  /** 目标标签 id（将保留，接收所有关联） */
  targetId: string;
}

/** 标签排序方式 */
export type TagSortField = 'docCount' | 'name' | 'createdAt';

/** TagStore 状态 */
export interface TagStoreState {
  tags: Tag[];
  selectedTagIds: string[];
  filterMode: TagFilterMode;
  isLoading: boolean;
  searchQuery: string;
  sortField: TagSortField;
  sortDirection: 'asc' | 'desc';
}
```

---

## 4. 标签数据模型

### 4.1 Schema（IndexedDB）

```typescript
// tags 表
interface TagRecord {
  id: string;           // uuid v4
  name: string;         // 标签名（唯一索引，同 accountId 下）
  color: string;        // HEX 颜色
  docCount: number;     // 冗余计数（异步同步）
  accountId: string;    // 账户隔离
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

// doc_tags 关联表
interface DocTagRecord {
  id: string;           // uuid v4
  docId: string;        // 文档 id（外键）
  tagId: string;        // 标签 id（外键）
  addedAt: string;      // ISO 8601
}
```

**索引**：
- `tags.name` + `tags.accountId`：复合唯一索引（防止同名标签）
- `doc_tags.docId`：按文档查标签
- `doc_tags.tagId`：按标签查文档

### 4.2 docCount 同步策略

`docCount` 是冗余字段，用于前端快速展示标签频次，无需实时计算 JOIN：

- 添加标签关联时：`docCount += 1`（事务内原子更新）
- 移除标签关联时：`docCount -= 1`（最小值为 0）
- 文档软删除时：关联的所有 docCount 递减
- 文档永久删除时：关联的所有 docCount 递减，`doc_tags` 记录删除
- 定期一致性校验（每小时）：重新 COUNT 实际关联数，修正 docCount

---

## 5. 标签 CRUD

### 5.1 创建标签

**触发入口**：
- TagInput 中输入新标签名并按 `Enter`（自动创建并关联）
- 标签管理 Modal → "新建标签"按钮

**校验规则**：
- 名称不能为空
- 名称长度 1~50 字符
- 名称不能与已有标签重名（大小写不敏感）
- 名称不允许纯空白字符

**默认颜色**：从预设 12 色循环分配（按已有标签数量取模）。

**创建流程**：
```typescript
async createTag(params: CreateTagParams): Promise<Tag> {
  const existing = await this.findByName(params.name, params.accountId);
  if (existing) throw new TagNameConflictError(params.name);

  const tag: Tag = {
    id: uuid(),
    name: params.name.trim(),
    color: params.color,
    docCount: 0,
    accountId: params.accountId,
    createdAt: now(),
    updatedAt: now(),
  };

  await db.tags.put(tag);
  await activityLogger.log('tag.created', { id: tag.id, name: tag.name });
  return tag;
}
```

### 5.2 编辑标签

**触发入口**：标签管理 Modal → 点击标签项右侧编辑图标（`Pencil`）。

**可编辑字段**：
- 标签名（校验同创建规则）
- 颜色（颜色选择器）

**编辑后影响**：
- 所有引用该标签 id 的位置自动获得新名称/颜色（因为引用 id，不是名称字符串）
- 无需手动更新任何关联记录

### 5.3 删除标签

**删除前检查**：
- 若 `docCount > 0`，弹出确认对话框："此标签关联了 N 个文档，删除后这些文档将失去此标签。"
- 若 `docCount === 0`（孤儿标签），直接删除（无需确认）。

**删除流程**：
```typescript
async deleteTag(id: string): Promise<void> {
  // 清除所有关联
  await db.doc_tags.where('tagId').equals(id).delete();
  // 删除标签本身
  await db.tags.delete(id);
  await activityLogger.log('tag.deleted', { id });
}
```

### 5.4 孤儿标签清理

孤儿标签（`docCount === 0`）在标签管理 Modal 中以浅色样式标注，并在顶部显示"清理孤儿标签（N）"快捷按钮：

```typescript
async cleanupOrphanTags(accountId: string): Promise<number> {
  const orphans = await db.tags.where('accountId').equals(accountId)
    .filter(t => t.docCount === 0).toArray();
  await db.tags.bulkDelete(orphans.map(t => t.id));
  return orphans.length;
}
```

---

## 6. 文档与标签的多对多关系

### 6.1 在文档中管理标签

文档属性面板（`DocumentPropertyPanel`，Spec F-06 C）和编辑器 frontmatter 区域均可操作标签。

**添加标签**：
```typescript
async addTagToDoc(docId: string, tagId: string): Promise<void> {
  const existing = await db.doc_tags.where({ docId, tagId }).first();
  if (existing) return; // 幂等

  await db.transaction('rw', [db.doc_tags, db.tags], async () => {
    await db.doc_tags.put({ id: uuid(), docId, tagId, addedAt: now() });
    await db.tags.where('id').equals(tagId).modify(t => { t.docCount += 1; });
  });
}
```

**移除标签**：
```typescript
async removeTagFromDoc(docId: string, tagId: string): Promise<void> {
  await db.transaction('rw', [db.doc_tags, db.tags], async () => {
    await db.doc_tags.where({ docId, tagId }).delete();
    await db.tags.where('id').equals(tagId).modify(t => {
      t.docCount = Math.max(0, t.docCount - 1);
    });
  });
}
```

### 6.2 每篇文档最多 20 个标签

```typescript
async addTagToDoc(docId: string, tagId: string): Promise<void> {
  const currentCount = await db.doc_tags.where('docId').equals(docId).count();
  if (currentCount >= 20) {
    throw new TagLimitExceededError('每篇文档最多添加 20 个标签');
  }
  // ...
}
```

### 6.3 `#tag` 行内语法（可选，F-06 补充）

用户可在文档正文中输入 `#标签名` 来隐式添加标签（参考 Bear/Notion Tag 体验）：

- 编辑器扩展监听 `#` 字符后跟非空白内容，触发标签自动补全
- 用户确认后：在正文插入 `#标签名`（作为普通文本渲染），同时在 `doc_tags` 中创建关联
- 删除正文中的 `#标签名` 时，对应关联也自动移除（通过编辑器扩展的 NodeView 监听）

**注意**：此功能标记为可选（F-06 补充），v2.1 初版可延后实现。

---

## 7. 标签输入与自动补全

### 7.1 TagInput 组件

```vue
<!-- src/components/tag/TagInput.vue -->
<template>
  <div class="tag-input" :class="{ 'is-active': isOpen }">
    <!-- 已选标签 -->
    <TagBadge
      v-for="tag in selectedTags"
      :key="tag.id"
      :tag="tag"
      removable
      @remove="removeTag(tag.id)"
    />
    <!-- 输入框 -->
    <input
      ref="inputRef"
      v-model="inputValue"
      type="text"
      :placeholder="selectedTags.length === 0 ? '添加标签...' : ''"
      :disabled="selectedTags.length >= 20"
      @focus="openAutocomplete"
      @blur="closeAutocomplete"
      @keydown="handleKeydown"
    />
    <!-- 自动补全候选列表 -->
    <TagAutocomplete
      v-if="isOpen && inputValue"
      :candidates="candidates"
      :query="inputValue"
      @select="selectTag"
      @create="createAndSelect"
    />
  </div>
</template>
```

### 7.2 自动补全逻辑（TagAutocomplete）

```typescript
// src/composables/useTagAutocomplete.ts

export function useTagAutocomplete(inputValue: Ref<string>) {
  const tagStore = useTagStore();

  const candidates = computed(() => {
    if (!inputValue.value) return [];

    const query = inputValue.value.toLowerCase().trim();
    return tagStore.tags
      .filter(tag =>
        tag.name.toLowerCase().startsWith(query) ||
        tag.name.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        // 前缀匹配优先
        const aStartsWith = a.name.toLowerCase().startsWith(query);
        const bStartsWith = b.name.toLowerCase().startsWith(query);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        // 使用频次降序
        return b.docCount - a.docCount;
      })
      .slice(0, 8);
  });

  return { candidates };
}
```

**候选列表 UI**：
- 最多显示 8 条
- 每条显示：彩色圆点 + 标签名 + 文档数量（灰色小字）
- 末项固定显示"创建标签「xxx」"（若 xxx 与已有标签名完全不同）
- 键盘导航：`ArrowUp/Down` 移动，`Enter` 选择，`Escape` 关闭

### 7.3 键盘交互

| 键 | 行为 |
|----|------|
| `Enter` | 确认选中的候选项（或若候选为空，直接创建并选中） |
| `Backspace`（输入框为空时） | 删除最后一个已选标签 |
| `ArrowDown` / `ArrowUp` | 导航候选列表 |
| `Escape` | 关闭候选列表，保留输入内容 |
| `,` 或 ` `（空格）| 若有精确匹配则确认，否则显示"无完全匹配"提示 |

---

## 8. 颜色系统

### 8.1 预设 12 色

```typescript
export const TAG_COLOR_PRESETS: TagColorPreset[] = [
  { name: '灰', hex: '#6b7280' },
  { name: '红', hex: '#ef4444' },
  { name: '橙', hex: '#f97316' },
  { name: '黄', hex: '#eab308' },
  { name: '绿', hex: '#22c55e' },
  { name: '青', hex: '#06b6d4' },
  { name: '蓝', hex: '#3b82f6' },
  { name: '靛', hex: '#6366f1' },
  { name: '紫', hex: '#a855f7' },
  { name: '粉', hex: '#ec4899' },
  { name: '棕', hex: '#92400e' },
  { name: '石板', hex: '#475569' },
];
```

### 8.2 颜色选择器（TagColorPicker）

```
┌─────────────────────────────────────┐
│  预设颜色                            │
│  ● ● ● ● ● ● ● ● ● ● ● ●           │
│  (12个圆形色块，单击选中)            │
│                                     │
│  自定义颜色                          │
│  [#3b82f6] [色彩预览方块]            │
└─────────────────────────────────────┘
```

**HEX 输入校验**：
- 必须匹配 `/^#[0-9A-Fa-f]{6}$/`
- 不合法时输入框边框变红，不保存

### 8.3 标签颜色在 UI 中的应用

标签颜色用于：
- `TagBadge`：背景色（20% 透明度）+ 文字色（原色）
- `TagCloud`：字体颜色
- `TagList`：左侧彩色圆点
- 过滤面板中的 checkbox 颜色

---

## 9. 标签浏览器（TagBrowser）

### 9.1 入口位置

标签浏览器作为左侧 Sidebar 的一个 Tab（与文件管理器、版本历史并列），由 `SidebarTabBar` 控制切换。

或作为独立页面（`/tags`），取决于空间布局设计（由 WorkstationLayout Spec 最终决定）。

### 9.2 UI 布局

```
┌─────────────────────────────────────┐
│ [搜索框: 搜索标签...]  [排序 ▼]      │
│                                     │
│ 过滤逻辑: [AND] [OR]                │
│                                     │
│ 所有标签 (42)                        │
│ ──────────────────────────────────  │
│ ● 技术        23 个文档   [编辑]    │
│ ● Vue3        18 个文档   [编辑]    │
│ ● 随笔         7 个文档   [编辑]    │
│ ● 未归类       2 个文档   [编辑]    │
│ ...                                 │
│                                     │
│ [清理孤儿标签 (3)]                   │
└─────────────────────────────────────┘
```

### 9.3 点击标签查看文档

点击标签项（非编辑图标）：
- 该标签进入"已选"状态（蓝色边框）
- 右侧内容区或弹层展示关联文档列表（与文件管理器平铺视图相同样式）
- 支持多标签叠加选择（受 AND/OR 过滤模式影响）

### 9.4 排序选项

| 排序 | 说明 |
|------|------|
| 使用频次（默认） | `docCount` 降序 |
| 名称 | 字母/拼音升序 |
| 创建时间 | `createdAt` 降序 |

### 9.5 标签搜索框

- debounce 200ms
- 模糊匹配标签名（前缀优先）
- 搜索中高亮匹配部分

---

## 10. 过滤逻辑（AND/OR）

### 10.1 AND 模式（默认）

选中的多个标签取**交集**：文档必须同时含有所有选中标签。

```typescript
function filterByTagsAnd(docs: FileNode[], selectedTagIds: string[]): FileNode[] {
  if (selectedTagIds.length === 0) return docs;
  return docs.filter(doc =>
    selectedTagIds.every(tagId => doc.tagIds.includes(tagId))
  );
}
```

**UI 提示**：AND 模式下，标签之间显示"且"字样（小写灰字）。

### 10.2 OR 模式

选中的多个标签取**并集**：文档含有任意一个选中标签即可。

```typescript
function filterByTagsOr(docs: FileNode[], selectedTagIds: string[]): FileNode[] {
  if (selectedTagIds.length === 0) return docs;
  return docs.filter(doc =>
    selectedTagIds.some(tagId => doc.tagIds.includes(tagId))
  );
}
```

**UI 提示**：OR 模式下，标签之间显示"或"字样。

### 10.3 模式切换

TagBrowser 顶部 ToggleGroup：`[AND] [OR]`。当前模式以主题色高亮。模式切换后，文档列表立即更新。

模式选择持久化到 `useTagStore.filterMode`（不持久化到 IndexedDB，仅 session 级别）。

---

## 11. 标签合并操作

### 11.1 触发方式

- 拖拽一个标签到另一个标签（TagBrowser 中拖拽）
- 标签管理 Modal → 选中多个标签 → "合并为..."按钮

### 11.2 合并流程

```
用户拖拽 标签A → 标签B
         │
         ▼
  MergeConfirmDialog
  "将「标签A」合并到「标签B」？"
  "标签A 的 N 个文档将自动归入「标签B」，标签A 将被删除。"
  [取消] [确认合并]
         │
         ▼
  TagRepository.mergeTags({
    sourceIds: ['tagA-id'],
    targetId: 'tagB-id'
  })
```

### 11.3 合并实现

```typescript
async mergeTags(params: MergeTagsParams): Promise<void> {
  await db.transaction('rw', [db.tags, db.doc_tags], async () => {
    for (const sourceId of params.sourceIds) {
      // 将 source 的所有 doc_tags 重定向到 target
      const docsWithSource = await db.doc_tags
        .where('tagId').equals(sourceId).toArray();

      for (const docTag of docsWithSource) {
        // 避免重复关联
        const alreadyLinked = await db.doc_tags
          .where({ docId: docTag.docId, tagId: params.targetId }).first();
        if (!alreadyLinked) {
          await db.doc_tags.put({
            id: uuid(),
            docId: docTag.docId,
            tagId: params.targetId,
            addedAt: now(),
          });
        }
        await db.doc_tags.delete(docTag.id);
      }

      // 删除 source 标签
      await db.tags.delete(sourceId);
    }

    // 重新计算 target 的 docCount
    const newCount = await db.doc_tags.where('tagId').equals(params.targetId).count();
    await db.tags.update(params.targetId, { docCount: newCount, updatedAt: now() });
  });

  await activityLogger.log('tag.merged', {
    sourceIds: params.sourceIds,
    targetId: params.targetId,
  });
}
```

### 11.4 合并后的一致性

合并操作在单个 IndexedDB 事务中完成，保证原子性。合并结束后：
- source 标签从所有视图中消失
- target 标签 docCount 更新
- 文档的标签列表实时更新

---

## 12. 标签云可视化（TagCloud）

### 12.1 位置

Hub 数据洞察区（`src/components/hub/TagCloud.vue`），在"数据洞察"卡片中。

### 12.2 字体大小计算

```typescript
function computeTagCloudNodes(tags: Tag[]): TagCloudNode[] {
  if (tags.length === 0) return [];

  const maxCount = Math.max(...tags.map(t => t.docCount));
  const minCount = Math.min(...tags.map(t => t.docCount));

  const MIN_FONT = 12; // px
  const MAX_FONT = 28; // px

  return tags.map(tag => {
    const weight = maxCount === minCount
      ? 0.5
      : (tag.docCount - minCount) / (maxCount - minCount);
    const fontSize = MIN_FONT + weight * (MAX_FONT - MIN_FONT);
    return { tag, weight, fontSize };
  });
}
```

### 12.3 布局算法

标签云使用简单的流式布局（`flex-wrap: wrap`），按 `docCount` 降序排列。字体大小按频次比例线性插值（MIN 12px ~ MAX 28px）。

### 12.4 交互

- 鼠标 hover：标签底部显示文档数量 tooltip
- 点击：跳转到标签浏览器并自动选中该标签

### 12.5 最大展示数量

标签云最多展示前 50 个高频标签，避免视觉混乱。点击"查看全部"跳转到标签管理页。

---

## 13. Store 定义

```typescript
// src/stores/useTagStore.ts
import { defineStore } from 'pinia';

export const useTagStore = defineStore('tag', {
  state: (): TagStoreState => ({
    tags: [],
    selectedTagIds: [],
    filterMode: 'AND',
    isLoading: false,
    searchQuery: '',
    sortField: 'docCount',
    sortDirection: 'desc',
  }),

  getters: {
    /** 按搜索和排序过滤后的标签列表 */
    filteredTags(state): Tag[] {
      let list = state.tags;

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        list = list.filter(t => t.name.toLowerCase().includes(q));
      }

      return [...list].sort((a, b) => {
        const dir = state.sortDirection === 'asc' ? 1 : -1;
        if (state.sortField === 'name') {
          return a.name.localeCompare(b.name, 'zh-CN') * dir;
        }
        if (state.sortField === 'docCount') {
          return (a.docCount - b.docCount) * dir;
        }
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      });
    },

    /** 孤儿标签 */
    orphanTags(state): Tag[] {
      return state.tags.filter(t => t.docCount === 0);
    },

    /** 标签云节点 */
    tagCloudNodes(state): TagCloudNode[] {
      const top50 = [...state.tags]
        .sort((a, b) => b.docCount - a.docCount)
        .slice(0, 50);
      return computeTagCloudNodes(top50);
    },

    /** 按 id 查找标签 */
    getTagById: (state) => (id: string): Tag | undefined => {
      return state.tags.find(t => t.id === id);
    },
  },

  actions: {
    /** 加载所有标签 */
    async loadTags(accountId: string): Promise<void>,

    /** 创建标签 */
    async createTag(params: CreateTagParams): Promise<Tag>,

    /** 更新标签 */
    async updateTag(id: string, params: UpdateTagParams): Promise<void>,

    /** 删除标签 */
    async deleteTag(id: string): Promise<void>,

    /** 合并标签 */
    async mergeTags(params: MergeTagsParams): Promise<void>,

    /** 清理孤儿标签 */
    async cleanupOrphans(): Promise<number>,

    /** 切换选中标签（浏览器模式） */
    toggleSelectTag(id: string): void,

    /** 切换过滤模式 */
    setFilterMode(mode: TagFilterMode): void,

    /** 更新搜索词 */
    setSearchQuery(query: string): void,

    /** 更新排序 */
    setSort(field: TagSortField, direction: 'asc' | 'desc'): void,

    /** 在文档中添加标签 */
    async addTagToDoc(docId: string, tagId: string): Promise<void>,

    /** 在文档中移除标签 */
    async removeTagFromDoc(docId: string, tagId: string): Promise<void>,

    /** 获取文档的全部标签 */
    async getDocTags(docId: string): Promise<Tag[]>,
  },
});
```

---

## 14. Repository 定义

```typescript
// src/repositories/TagRepository.ts

interface TagRepository {
  /** 获取账户所有标签 */
  listTags(accountId: string): Promise<Tag[]>;

  /** 按 id 获取单个标签 */
  getTag(id: string): Promise<Tag | undefined>;

  /** 按名称查找标签（用于去重校验） */
  findByName(name: string, accountId: string): Promise<Tag | undefined>;

  /** 创建标签 */
  createTag(params: CreateTagParams): Promise<Tag>;

  /** 更新标签 */
  updateTag(id: string, params: UpdateTagParams): Promise<void>;

  /** 删除标签（含清理关联） */
  deleteTag(id: string): Promise<void>;

  /** 合并标签（原子操作） */
  mergeTags(params: MergeTagsParams): Promise<void>;

  /** 清理孤儿标签 */
  cleanupOrphans(accountId: string): Promise<number>;

  /** 获取文档的标签列表 */
  getDocTags(docId: string): Promise<Tag[]>;

  /** 为文档添加标签 */
  addTagToDoc(docId: string, tagId: string): Promise<void>;

  /** 从文档移除标签 */
  removeTagFromDoc(docId: string, tagId: string): Promise<void>;

  /** 批量为多个文档添加同一标签 */
  bulkAddTagToDoc(docIds: string[], tagId: string): Promise<void>;

  /** 批量从多个文档移除同一标签 */
  bulkRemoveTagFromDoc(docIds: string[], tagId: string): Promise<void>;

  /** 获取标签关联的文档列表 */
  getDocsWithTag(tagId: string): Promise<string[]>;

  /** 重新计算 docCount（一致性修复） */
  recalculateDocCount(tagId: string): Promise<number>;

  /** 批量重算所有标签 docCount */
  recalculateAllDocCounts(accountId: string): Promise<void>;
}
```

---

## 15. 测试矩阵

### 15.1 单元测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 1 | `createTag` 名称空字符串校验失败 | 抛出 `TagValidationError` |
| 2 | `createTag` 重名标签校验失败 | 抛出 `TagNameConflictError` |
| 3 | `createTag` 名称 51 字符校验失败 | 抛出长度错误 |
| 4 | `addTagToDoc` 幂等性：重复添加不报错 | 不创建重复 doc_tags 记录 |
| 5 | `addTagToDoc` 第 21 个标签报错 | 抛出 `TagLimitExceededError` |
| 6 | `removeTagFromDoc` 后 docCount 正确递减 | docCount -= 1，不低于 0 |
| 7 | `filterByTagsAnd` 多标签交集 | 仅返回含全部选中标签的文档 |
| 8 | `filterByTagsOr` 多标签并集 | 返回含任意选中标签的文档 |
| 9 | `computeTagCloudNodes` weight 归一化 | 最高频标签 weight=1，最低频 weight=0 |
| 10 | `computeTagCloudNodes` 单标签时 weight=0.5 | 边界情况处理 |
| 11 | `mergeTags` 避免重复关联 | source 文档与 target 已关联时不创建重复记录 |
| 12 | `cleanupOrphans` 只清理 docCount=0 的标签 | docCount>0 的标签保留 |
| 13 | HEX 颜色校验 `#GGGGGG` 失败 | 校验器返回 false |
| 14 | HEX 颜色校验 `#3b82f6` 通过 | 校验器返回 true |
| 15 | `recalculateDocCount` 修正冗余字段 | 实际 COUNT 与字段值一致 |

### 15.2 集成测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 16 | 创建标签并关联文档，TagBrowser 实时显示 docCount | docCount = 1 |
| 17 | 软删除文档后，关联标签 docCount 递减 | docCount -= 1 |
| 18 | 合并标签后，source 标签从 TagBrowser 消失 | target 标签 docCount 正确 |
| 19 | 合并两个均关联同一文档的标签，不产生重复 doc_tags | `doc_tags` 中该 docId 只有一条 targetId 记录 |
| 20 | TagCloud 显示前 50 个高频标签（共 100 个标签时） | TagCloud 最多 50 个节点 |

---

*本 Spec 由 InkForge v2.1 Spec 工程师生成，基于 F-06、L1-43、N-04 决策综合制定。*
