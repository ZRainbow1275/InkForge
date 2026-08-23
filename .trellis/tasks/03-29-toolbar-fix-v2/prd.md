# FloatingToolbar 定位修复 + Typora 集成

## 修改文件
1. `inkforge/src/components/editor/FloatingToolbar.vue` — 工具栏定位和CSS
2. `inkforge/src/components/editor/EditorPanel.vue` — 集成检查
3. `inkforge/src/styles/design-system.css` — 检查全局CSS冲突
4. `inkforge/src/styles/main.css` — 检查全局CSS冲突

## 具体改动

### 改动1: 确保 FloatingToolbar 在 EditorPanel 中正确集成
文件: `inkforge/src/components/editor/EditorPanel.vue`

检查 template：
1. 确认 `<FloatingToolbar :editor="bodyEditor" />` 存在于 `.editor-paper` 容器内
2. 确认 `.editor-paper` 容器有 `position: relative`（FloatingToolbar absolute 定位需要）
3. 确认 `.editor-paper` 没有 `overflow: hidden`（会裁切工具栏）
4. 如果 FloatingToolbar 不在 .editor-paper 内，移进去

### 改动2: 修复 FloatingToolbar 定位逻辑
文件: `inkforge/src/components/editor/FloatingToolbar.vue`

检查 `updateToolbar()` 函数：
1. 确保正确获取 selection 的 DOM rect：`window.getSelection()?.getRangeAt(0).getBoundingClientRect()`
2. 定位计算应基于 `.editor-paper` 容器（非 viewport）：
```javascript
const paperEl = toolbarEl.value?.closest('.editor-paper') || toolbarEl.value?.parentElement
const paperRect = paperEl?.getBoundingClientRect()
// top = selectionRect.top - paperRect.top - toolbarHeight - 12
// left = selectionRect.left - paperRect.left + selectionRect.width / 2
```
3. 如果 top < 0（上方空间不够），翻转到下方：`top = selectionRect.bottom - paperRect.top + 12`

### 改动3: 检查并移除全局 CSS 冲突
文件: `inkforge/src/styles/design-system.css` 和 `inkforge/src/styles/main.css`

搜索 `.floating-toolbar` 或 `.ft-` 开头的全局样式。如果有：
- 全局样式会覆盖 scoped CSS 中的 .floating-toolbar
- 删除全局样式，让 scoped CSS 生效

### 改动4: 确保 toolbar-sep 分隔符正常显示
文件: `inkforge/src/components/editor/FloatingToolbar.vue`

确认 `.toolbar-sep` 样式：
```css
.toolbar-sep {
  width: 1px;
  height: 16px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 4px;
  flex-shrink: 0;
}
```
确认没有被 `display: none` 或其他条件隐藏。

### 改动5: 确保 Source 模式不显示 FloatingToolbar
文件: `inkforge/src/components/editor/EditorPanel.vue` 或 WorkstationView.vue

FloatingToolbar 仅在 TipTap editor 存在时渲染。检查 editorMode 条件。

## 验收标准
- [ ] Typora 模式选中文本后工具栏弹出
- [ ] 工具栏定位在选区上方，空间不够时翻转到下方
- [ ] .toolbar-sep 分隔符正常显示
- [ ] 无全局 CSS 冲突
- [ ] Source 模式无 FloatingToolbar
- [ ] 运行 `cd inkforge && npx vue-tsc --noEmit` 零错误
