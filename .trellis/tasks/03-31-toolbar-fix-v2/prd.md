# FloatingToolbar 定位修复 + Typora 集成

## 背景
EditorPanel.vue 已重写为手动 `new Editor({ element })` 方式。FloatingToolbar 在 Typora 模式下不弹出，且定位不稳定。

## 改动清单

### 改动1: 确认 EditorPanel.vue 中 FloatingToolbar 已挂载

读取 `inkforge/src/components/editor/EditorPanel.vue`。

确认 template 中有：
```html
<FloatingToolbar v-if="editorMode === 'typora'" :editor="bodyEditor ?? undefined" />
```

如果没有，添加它（在 `.editor-paper` div 内部，editor DOM 元素之后）。

确认 script 中有 `import FloatingToolbar from './FloatingToolbar.vue'`。

`bodyEditor` 应该是 `shallowRef<Editor | null>(null)`，在 `onMounted` 中赋值。

### 改动2: FloatingToolbar.vue 定位逻辑重写

读取 `inkforge/src/components/editor/FloatingToolbar.vue`。

将 `updateToolbar()` 函数改为使用 `window.getSelection()` + `getBoundingClientRect()`：

```typescript
function updateToolbar(): void {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
    visible.value = false
    return
  }
  const range = sel.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    visible.value = false
    return
  }
  const TOOLBAR_HEIGHT = 44
  const GAP = 12
  let top: number
  if (rect.top > TOOLBAR_HEIGHT + GAP + 10) {
    top = rect.top - TOOLBAR_HEIGHT - GAP
  } else {
    top = rect.bottom + GAP
  }
  const centerX = rect.left + rect.width / 2
  const clampedX = Math.max(60, Math.min(centerX, window.innerWidth - 60))
  toolbarStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${clampedX}px`,
    transform: 'translateX(-50%)'
  }
  visible.value = true
}
```

将 toolbar 根元素的 style 绑定改为 `:style="toolbarStyle"`。

确保 `toolbarStyle` 的类型是 `Record<string, string>` 而不是 `{ top: string; left: string }`，因为现在包含更多属性。

### 改动3: 事件监听器更新

在 `attachListeners` 函数中，确保监听的是 editor 的 `selectionUpdate` 事件（TipTap）或直接监听 document 的 `selectionchange` 事件：

```typescript
function onSelectionChange(): void {
  // 只在 editor 有焦点时处理
  if (!props.editor?.isFocused) {
    visible.value = false
    return
  }
  updateToolbar()
}
```

在 `attachListeners` 中：
```typescript
document.addEventListener('selectionchange', onSelectionChange)
```

在 `detachListeners` 中：
```typescript
document.removeEventListener('selectionchange', onSelectionChange)
```

### 改动4: 移除全局 CSS 冲突

读取 `inkforge/src/styles/design-system.css`。

搜索是否有 `.floating-toolbar` 全局样式。若有，删除或注释掉，避免覆盖 scoped 样式。

### 改动5: 确认 toolbar-sep 样式

在 FloatingToolbar.vue 的 `<style scoped>` 中确认有：
```css
.toolbar-sep {
  width: 1px;
  height: 18px;
  background: #e2e8f0;
  align-self: center;
  flex-shrink: 0;
  margin: 0 2px;
}
```

## 验收
- `cd inkforge && npx vue-tsc --noEmit` 零错误
- Typora 模式选中文本后 FloatingToolbar 出现
- Source 模式无 FloatingToolbar（v-if 控制）
- 工具栏定位 position: fixed，在选区上方
- 分隔符正常显示
