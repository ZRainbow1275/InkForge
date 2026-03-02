# 07 - 文件管理器真实化 Spec

## 目标
将 Mock 的文件管理器替换为基于 IndexedDB 的真实文件浏览和管理系统。

## 1. 当前问题

### 1.1 WorkstationView Manager 面板
- "文件内容"Tab 显示的是硬编码的文件列表
- assets 显示的不是真实的素材
- 文件操作（新建、重命名、删除）无实际效果

## 2. 文件管理器改造

### 2.1 文件树结构
从 IndexedDB 的 articles 表构建文件树：
```
📂 科技（分类）
├── 📄 2024 AI 趋势报告.md
├── 📄 深度学习实践指南.md
└── 📂 assets/
    ├── 🖼 cover.png
    └── 🖼 diagram.svg
📂 生活（分类）
├── 📄 读书笔记.md
└── 📂 assets/
📄 未分类/
└── 📄 草稿.md
```

### 2.2 数据源
- 文件列表：`articleStore.articles`（按 categoryId 分组）
- 素材列表：`assetStore.assets`（按 articleId 分组）
- 分类列表：`categoryStore.categories`

### 2.3 文件操作
| 操作 | 实现 |
|------|------|
| 新建文章 | `articleStore.addArticle()` |
| 重命名 | `articleStore.updateArticle(id, { title })` |
| 删除 | `articleStore.deleteArticle(id)` |
| 移动到分类 | `articleStore.moveToCategory(id, categoryId)` |
| 查看素材 | 展开显示 `assetStore.assets` |
| 上传素材 | `assetStore.uploadAsset()` |

### 2.4 文件管理器组件
```vue
<!-- components/file/FileManager.vue -->
<template>
  <div class="file-manager">
    <div class="file-header">
      <h3>文件</h3>
      <button @click="createNewArticle">+ 新建</button>
    </div>

    <!-- 分类分组 -->
    <div v-for="category in categorizedFiles" :key="category.id" class="file-group">
      <div class="group-header" @click="toggleGroup(category.id)">
        <ChevronRight :class="{ expanded: expandedGroups.has(category.id) }" />
        <Folder />
        <span>{{ category.name }}</span>
        <span class="count">{{ category.files.length }}</span>
      </div>
      <div v-show="expandedGroups.has(category.id)" class="group-content">
        <div
          v-for="file in category.files"
          :key="file.id"
          class="file-item"
          :class="{ active: file.id === selectedId }"
          @click="selectFile(file.id)"
          @contextmenu.prevent="showContextMenu($event, file)"
        >
          <FileText />
          <span class="file-name">{{ file.title }}</span>
          <span class="file-meta">{{ formatDate(file.updatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 2.5 版本标签页
"版本"Tab 显示当前文章的版本历史（从 editorStore.currentContent.versions 读取）

## 3. 右键菜单

### 3.1 文章右键菜单
- 打开
- 重命名
- 移动到分类 → （子菜单列出所有分类）
- 复制
- 删除
- 导出为 Markdown

### 3.2 分类右键菜单
- 重命名
- 删除（需确认，自动将文章移到"未分类"）
- 新建文章

## 验收标准
- [ ] 文件管理器显示真实的文章列表
- [ ] 按分类分组显示
- [ ] 可新建、重命名、删除文章
- [ ] 可在分类间移动文章
- [ ] assets 区域显示真实上传的素材
- [ ] 右键菜单功能完整
- [ ] 无任何 Mock 文件数据
