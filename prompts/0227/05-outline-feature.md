# 05 - 大纲功能设计 Spec

## 目标
创建一个实时大纲编辑窗口，让作者和 AI 在撰文时可以随时查看和编辑大纲，并根据大纲实时写作。

## 1. 大纲面板组件

### 1.1 OutlinePanel.vue
位置：编辑器右侧或左侧的可折叠面板

功能：
- 从 TipTap 编辑器实时提取 H2/H3/H4 节点
- 树状结构显示
- 点击大纲项跳转到编辑器对应位置
- 拖拽重排大纲项（同步调整编辑器中的内容顺序）
- 大纲项右键菜单：删除、AI 扩写、移动

### 1.2 大纲数据结构
```typescript
interface OutlineItem {
  id: string        // ProseMirror node ID
  level: 2 | 3 | 4
  text: string
  position: number  // 在文档中的位置
  children: OutlineItem[]
}
```

### 1.3 实时同步机制
- 监听 TipTap 编辑器的 `onUpdate` 事件
- 使用防抖（300ms）重新提取大纲
- 编辑器内容变化 → 大纲自动更新
- 大纲拖拽重排 → 编辑器内容自动重排

### 1.4 AI 大纲生成
- 输入主题/关键词 → AI 生成大纲
- 大纲生成后插入编辑器
- 支持"继续扩展"某个大纲节点

## 2. 交互设计

### 2.1 面板样式
- 宽度：240px
- 背景：半透明毛玻璃
- 大纲项：缩进式层级，H2/H3/H4 不同字号
- 当前编辑位置高亮

### 2.2 快捷键
- `Cmd+Shift+O`：切换大纲面板
- 大纲面板中方向键导航
- Enter 跳转到对应位置

## 3. 与编辑器集成

### 3.1 提取大纲
```typescript
function extractOutline(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      items.push({
        id: node.attrs.id || `heading-${pos}`,
        level: node.attrs.level,
        text: node.textContent,
        position: pos,
        children: []
      })
    }
  })
  return buildTree(items)
}
```

### 3.2 跳转定位
```typescript
function scrollToHeading(editor: Editor, position: number) {
  editor.chain().focus().setTextSelection(position).scrollIntoView().run()
}
```

## 验收标准
- [ ] 大纲面板实时显示文章结构
- [ ] 点击大纲项跳转到编辑器对应位置
- [ ] AI 可生成大纲并插入编辑器
- [ ] 大纲支持拖拽重排
- [ ] 当前编辑位置在大纲中高亮
