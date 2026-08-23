# Hub 首页布局精修

## 背景
当前 HubView.vue 存在以下 4 个问题需要修复。

## 改动清单

### 改动1: Header 快捷键区域变为可点击按钮

在 `inkforge/src/views/HubView.vue` 找到 header 区域显示 "Ctrl+N 新建" 和 "Ctrl+F 搜索" 的快捷键提示区域（class 可能是 `header-shortcuts` 或类似名称）。

修改：把静态文字区域改为两个独立可点击的 `<button>` 元素：
- 新建按钮：`@click="startNewProject"` 或 `@click="handleNewArticle"`
- 搜索按钮：`@click="handleSearchShortcut"`

添加 `handleSearchShortcut` 函数（如果不存在）：
```typescript
function handleSearchShortcut(): void {
  const section = document.querySelector('.filter-bar, .article-filter, input[placeholder*="搜索"]')
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      const input = section instanceof HTMLInputElement ? section : section.querySelector('input') as HTMLInputElement | null
      input?.focus()
    }, 400)
  }
}
```

按钮保持原外观，添加 `cursor-pointer` 和 hover 背景。

### 改动2: Header 新建按钮降级为 ghost 风格

在 HubView.vue header 右上角找到红色实心的 "+新建" 按钮。将其样式改为 outline/ghost：
- 删除红色背景
- 添加 `border: 1px solid #D32F2F; color: #D32F2F; background: transparent`
- hover: `background: rgba(211,47,47,0.08)`

### 改动3: QuickActionFab 缩小为 44x44

在 HubView.vue 找到右下角固定定位的浮动 "+" 按钮（QuickActionFab 组件或内联 button）。
将其 width/height 从当前值改为 44px，图标 20px。

### 改动4: card-recent 底部填充最近文章列表

在 HubView.vue 找到 `card-recent` 区域内的 Quick Create 按钮 div。在其**之后**添加最近文章列表：

```html
<div v-if="recentArticlesForCard.length > 0" class="mt-3 border-t border-slate-100 pt-3">
  <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Recent</p>
  <div class="space-y-1">
    <button
      v-for="article in recentArticlesForCard"
      :key="article.id"
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-500 hover:bg-slate-50 transition-colors truncate"
      @click.stop="handleArticleClick(article.id)"
    >
      {{ article.title || '未命名文稿' }}
    </button>
  </div>
</div>
```

添加 computed（如果不存在）：
```typescript
const recentArticlesForCard = computed(() => {
  return [...(articles.value || [])]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(1, 4)
})
```

点击调用现有的 `handleArticleClick(id)` 或 `router.push('/workstation?article=' + id)` 或类似跳转方法。

### 改动5: Bento Grid 不裁切

在 HubView.vue `<style>` 中找到 `.bento-container`。
- 将 `height: calc(100vh - ...)` 改为 `min-height: calc(100vh - 160px); height: auto;`
- 将 `grid-template-rows: repeat(3, ...)` 或 `repeat(3, minmax(0, 1fr))` 改为 `grid-template-rows: auto auto auto;`

## 验收
- `cd inkforge && npx vue-tsc --noEmit` 零错误
- 搜索按钮可点击
- 新建按钮为 ghost 风格
- FAB 为 44x44
- card-recent 底部有文章列表
