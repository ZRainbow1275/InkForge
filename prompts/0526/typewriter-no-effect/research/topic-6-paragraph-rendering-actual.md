# topic-6: InkForge 实际渲染的段落 DOM 结构 — 是 `<p>` 还是自定义？哪些块会被 NodeView 接管？

## 调查问题

用户手测打字机模式时，编辑器里的实际文本段落最终在 DOM 中是用什么元素渲染？是普通 `<p>` 吗？是否有 InkForge 自定义 Paragraph extension 把它换成其他元素？哪些块类型（codeBlock、image、taskList 等）会被 Vue NodeView 接管？

这关系到：

- Decoration.node 的 class 能不能挂到段落外层
- "段落 ≠ 顶层块" 的情况是否存在
- 列表项等嵌套块在打字机分级淡化算法下被怎样标记

## 调查方法

- Grep `addNodeView` / `Paragraph.extend` / `customParagraph` 整个 inkforge/src
- 读 EditorPanel.vue 的 extensions 数组
- 读 TypewriterMode 的 `findActiveBlockIndex` 与 `SKIP_SENTENCE_SPLIT_TYPES`

## 关键发现

### 1. Paragraph 用 StarterKit 默认实现，无自定义 NodeView

`EditorPanel.vue:387-393`:

```ts
StarterKit.configure({
  heading: { levels: [1, 2, 3, 4] },
  codeBlock: false,
  dropcursor: false,
  listItem: false,
}),
```

StarterKit 默认包含 `@tiptap/extension-paragraph`。它在 schema 中的 `toDOM` 是 `() => ['p', 0]`。**渲染输出就是 `<p>...</p>`，无 NodeView**。

`Grep 'Paragraph.extend|customParagraph|paragraph.*NodeView'` 项目内 → 无匹配。**没有任何 Paragraph 扩展定制**。

### 2. 整个项目用 NodeView 的扩展只有 2 个

`Grep addNodeView`:

```
inkforge\src\extensions\AssetImage.ts:96    addNodeView() { return VueNodeViewRenderer(AssetImageNodeView) }
inkforge\src\extensions\RichCodeBlock.ts:6  addNodeView() { ... }
```

- **AssetImage**: image node。但项目实际用的是 `ImageV2Extension`（EditorPanel.vue:439）而不是 AssetImage。需要看 ImageV2 是否也有 NodeView。
- **RichCodeBlock**: codeBlock node。

### 3. ImageV2 / DetailsBlock 是否有 NodeView？

需要确认。基于 grep 的硬数据，addNodeView 在项目源码中只出现在 AssetImage.ts 和 RichCodeBlock.ts 这两个文件。如果 ImageV2 内部模块还有 addNodeView 则会被 grep 命中——除非它在子目录 ImageV2/。

实际 EditorPanel.vue 装载的扩展列表（line 386-469）涉及块级节点的有：

- `StarterKit`（含 paragraph、heading、blockquote、bulletList、orderedList、horizontalRule，无 codeBlock 因为禁了）
- `InkforgeListItem`（listItem，无 NodeView 覆盖）
- `Placeholder` (装饰，无节点)
- `WeChatFormat` (mark/装饰)
- `TyporaMode` / `TypewriterMode` (装饰)
- `TableV2Extensions` (Table 系列)
- `TaskList`、`InkforgeTaskItem`
- `RichCodeBlock`（codeBlock with NodeView）
- `DetailsBlock`
- `ImageV2Extension`
- `Highlight` / `TextAlign` / `TextStyle` / `Color` （都是 mark / attr）
- `Subscript` / `Superscript`
- `Dropcursor`
- `SlashCommands`、`SnippetExpansion`、`SmartPunctuation`、`KeyboardShortcuts`、`EditorKeymap`、`BlockDragHandle`、`CitationMarks` （都是辅助 plugin / mark）

### 4. TypewriterMode.findActiveBlockIndex 只看 doc 顶层块

`TypewriterMode.ts:78-88`:

```ts
function findActiveBlockIndex(doc: ProseMirrorNode, selectionFrom: number): number {
    let activeIndex = -1
    doc.forEach((node, offset, index) => {
        const start = offset
        const end = offset + node.nodeSize
        if (selectionFrom >= start && selectionFrom <= end) {
            activeIndex = index
        }
    })
    return activeIndex
}
```

`doc.forEach` 遍历的是 doc 节点的 **直接子节点**（i.e. 顶层块）。所以：

- 顶层 `<p>` paragraph → 直接被 index 0,1,2... 标记
- `<ul>` bulletList → 它本身是一个顶层块（index N），里面的 `<li>` paragraph 不是顶层
- 当 selection 在 `<li>` 段落内时，selectionFrom 在 `<ul>` 范围内 → activeIndex = N（指向 `<ul>` 整个）

### 5. 这意味着光标在列表项内时，整个 list 被加 `typewriter-block-active` class

具体行为：

`TypewriterMode.ts:274-321` decoration loop：

```ts
doc.forEach((node, offset, index) => {
    const nodeStart = offset
    const nodeEnd = offset + node.nodeSize
    const distance = activeBlockIndex < 0 ? 999 : Math.abs(index - activeBlockIndex)

    if (distance === 0) {
        decorations.push(
            Decoration.node(nodeStart, nodeEnd, { class: 'typewriter-block-active' }),
        )
        ...
    } else if (distance === 1) {
        decorations.push(
            Decoration.node(nodeStart, nodeEnd, { class: 'typewriter-dimmed typewriter-dim-near' }),
        )
    } else {
        decorations.push(
            Decoration.node(nodeStart, nodeEnd, { class: 'typewriter-dimmed typewriter-dim-far' }),
        )
    }
})
```

所以 `.typewriter-block-active` 的红色侧栏 ::before 出现在顶层 `<ul>` / `<p>` / `<h2>` / `<blockquote>` 的左边，而不是在用户实际焦点 `<li>` 的左边。如果用户测试时光标在列表里，**视觉上感觉很奇怪但有效果**——大概不是"全程无用"。

### 6. 测试场景判断

User 说"打字机全程无用 — 也不滚动也没有段落高亮"。这是非常明确的描述：

- 不滚动 → Plugin 1 update() 没跑 OR `extensionOptions.enabled = false`
- 没有段落高亮 → Plugin 2 decorations() 没跑 OR class 没进 DOM

两个 plugin 同时哑火。要么是：

- (a) `extensionOptions.enabled` 实际仍为 false（topic-1 已证明 mutation 应该 OK——但要复测）
- (b) HMR 让 Editor 还挂着旧扩展（旧扩展不支持 cursorPosition）（topic-4）
- (c) Plugin 没注册成功（极端情况，编译错误吞掉？— typecheck/lint/test 全绿，排除）

### 7. ProseMirror 渲染 codeBlock / image / details 时 outer DOM

- RichCodeBlock（NodeView）：Vue NodeView 包装的 `<NodeViewWrapper>` 作为根 DOM 元素。outerDeco 的 class 会通过 tiptap 写到这个 wrapper 上。Decoration.node 的 class 应正常注入。
- DetailsBlock：根据扩展实现而定（未深入读），但用户不太可能在 details 块里测打字机。
- ImageV2: 如果用 VueNodeViewRenderer 注入 NodeView，行为同上。

但 **paragraph 本身完全是默认 `<p>` 渲染**，与 NodeView 无关。

## 结论

实际段落 DOM 是普通 `<p>`，Decoration.node 的 class 可以无障碍写到外层 `<p class="typewriter-block-active">`。打字机的核心场景（光标在 `<p>` 里）行为是确定的。

**测试盲点**：如果用户测试时光标停在列表项 `<li>` 内，看到的 `.typewriter-block-active` 会出现在父级 `<ul>` 而非 `<li>` ——但即使这样也应该看到侧栏，不应该是"全程无用"。

唯一能解释"全程无用"的合理推断：

- **Plugin 1 + Plugin 2 同时没跑** = extensionOptions.enabled 在闭包内仍是 false
- 最大概率：HMR 残留导致 Editor 持有旧扩展实例（topic-4）

## 对修复的指导意义

1. **顶层块概念**与用户认知（"光标所在段落 = 我编辑的 `<p>`"）不一致。这是 UX 缺陷：当光标在列表 / 表格 / 代码块里时，红色侧栏出现在父块外侧，可能让人困惑。修 PRD 可以考虑：
   - 是否要把"活跃块"算法改成最深 block 节点（resolve $from 找最深的 block）—— 但这是 nice-to-have，不属于"全程无用"的修复路径
2. **修复 PRD 必须包含一个空白测试用例 procedure**：让用户在一个全是 `<p>` 段落的空白文档里测打字机。如果连这都看不到效果，立刻锁定到 plugin 没运行，而不是 UX 期望落差。
3. "全程无用" 这个症状最可能是 HMR 让 Editor 挂着旧 plugin（topic-4 主线）。修复 PRD 第 1 步：要求用户重启 Tauri dev 复测；第 2 步：加 dev-only 诊断 console.log；第 3 步：根据 console 输出再决定改哪一层。
