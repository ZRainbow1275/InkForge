# Hub 首页布局精修

## 修改文件
1. `inkforge/src/views/HubView.vue` — 主布局
2. `inkforge/src/components/hub/HubHeader.vue` — 头部搜索/新建

## 具体改动

### 改动1: HubHeader 搜索区域可交互
文件: `inkforge/src/components/hub/HubHeader.vue`

当前 Header 中有一块显示 "Ctrl/Cmd+N 新建 Ctrl/Cmd+F 搜索" 的区域，用户反馈不可点击。

要求：
- 将该区域拆分为两个独立的 `<button>` 元素
- 点击 "新建" 部分 → `emit('new-article')`
- 点击 "搜索" 部分 → `emit('search')`
- 按钮样式：透明背景，hover 时 bg-slate-100，圆角，保持当前文字和图标
- 在 HubView.vue 中处理 @search 事件：调用 `document.querySelector('.archive-search-input')?.focus()` 并滚动到文章库 Section

### 改动2: Header 新建按钮降级
文件: `inkforge/src/components/hub/HubHeader.vue`

当前 Header 右上角 "+新建" 按钮是红色实心（bg-red-600 text-white），和 card-recent 的 "空白草稿" 按钮视觉冲突。

要求：改为 ghost/outline 风格：
```css
/* 修改前 */
background: #D32F2F; color: white;
/* 修改后 */
background: transparent;
border: 1px solid #D32F2F;
color: #D32F2F;
```
hover 时: `background: rgba(211, 47, 47, 0.08);`

### 改动3: FAB 按钮缩小
文件: `inkforge/src/views/HubView.vue`

右下角浮动 "+" 按钮当前太大（约56px）。

要求：缩小为 44x44px，图标大小 20px（当前可能是 24px）。

### 改动4: card-recent 底部空白填充
文件: `inkforge/src/views/HubView.vue`

card-recent 区域在 Quick Create 按钮下方有大片空白。

要求：在 Quick Create 的 div 之后，添加最近编辑文章列表：
```html
<div v-if="recentArticles.length > 1" class="mt-3 border-t border-slate-100 pt-3">
  <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Recent</p>
  <div class="space-y-1">
    <button v-for="article in recentArticles.slice(1, 4)" :key="article.id"
      class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-500 hover:bg-slate-50 transition-colors truncate"
      @click="openArticle(article.id)">
      {{ article.title || '未命名文稿' }}
    </button>
  </div>
</div>
```

需要在 script setup 中添加 recentArticles computed（如果不存在）。

### 改动5: Bento Grid 不再裁切
文件: `inkforge/src/views/HubView.vue`

找到 `.bento-container` 的 CSS，将：
- `height: calc(100vh - 160px)` → `min-height: calc(100vh - 160px); height: auto;`
- `grid-template-rows: repeat(3, minmax(0, 1fr))` → `grid-template-rows: auto auto auto;`

## 验收标准
- [ ] 搜索区域可点击且有 hover 效果
- [ ] Header 新建按钮为 outline 风格
- [ ] FAB 44x44
- [ ] card-recent 无大片空白
- [ ] Bento Grid 小屏不裁切
- [ ] 运行 `cd inkforge && npx vue-tsc --noEmit` 零错误
