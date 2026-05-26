# topic-3: Decoration.node(class) 是否真把 class 写到 `<p>` 段落 DOM 上？是否被自定义 NodeView 阻断？

## 调查问题

`Decoration.node(from, to, { class: 'typewriter-block-active' })` 在 InkForge 当前 TipTap 实例下，是否真的把 `class` 加到段落 DOM 元素的外层 element 上？是否存在 InkForge 自定义的 paragraph NodeView 把 decoration 阻挡掉？

## 调查方法

- 读 `inkforge/node_modules/.pnpm/prosemirror-view@1.41.6/node_modules/prosemirror-view/dist/index.js` Decoration / NodeType 部分
- Grep `addNodeView` 整个 inkforge/src
- Grep `Paragraph.extend` / `customParagraph` / paragraph nodeView

## 关键发现

### 1. ProseMirror Decoration.node 由 NodeType wrap 实现

`prosemirror-view/dist/index.js:3915-3938`:

```js
class NodeType {
    constructor(attrs, spec) {
        this.attrs = attrs;
        this.spec = spec || noSpec;
    }
    valid(node, span) {
        let { index, offset } = node.content.findIndex(span.from), child;
        return offset == span.from && !(child = node.child(index)).isText && offset + child.nodeSize == span.to;
    }
    ...
}
```

`Decoration.node(from, to, attrs)`（line 4008-4010）:

```js
static node(from, to, attrs, spec) {
    return new Decoration(from, to, new NodeType(attrs, spec));
}
```

NodeType decoration 在 docView 渲染时把 `attrs`（包含 `class`、`style`、`data-*` 等）应用到 **该 node 对应的 outer DOM element**。

### 2. 应用规则：与 ProseMirror 默认 nodeView 配合时，class 加到段落 `<p>` 外层 element

ProseMirror 内部 `NodeViewDesc.setSelection / readDOM` 等会处理 outerDeco。对于一个普通 `<p>` 段落 node，渲染输出是 `<p>...</p>`。NodeType decoration 的 `class` attr 会与节点本身的 attrs 合并写入 `<p class="typewriter-block-active">`。

参考：[ProseMirror Decoration.node docs](https://prosemirror.net/docs/ref/#view.Decoration^node):

> Creates a node decoration. from and to should point precisely before and after a node in the document. That node, and only that node, will receive the given attributes.

### 3. InkForge 项目里有 NodeView 的扩展（仅 2 个，且都不是 paragraph）

`Grep addNodeView` 结果（精确匹配项目源码）:

```
inkforge\src\extensions\AssetImage.ts:96:  addNodeView() {
inkforge\src\extensions\RichCodeBlock.ts:6:  addNodeView() {
```

- **AssetImage.ts** — extend `@tiptap/extension-image`，给 `image` node 加 Vue NodeView。但 image 是 atom inline-block，不参与段落级 decoration。
- **RichCodeBlock.ts** — codeBlock node 用 Vue NodeView。

注意：`TypewriterMode.ts:45` 有 `SKIP_SENTENCE_SPLIT_TYPES` 包含 `codeBlock`，所以代码块本身不会被句子级 decoration 影响，但它仍然可能被 `typewriter-dim-near` / `typewriter-dim-far` 段落级 class 标记（如果它作为 doc 顶层块）—— 这部分需要看 Vue NodeView 是否会接受 outerDeco class。但与段落 `<p>` 的核心场景不同，不影响主要功能。

### 4. **段落 `<p>` 没有自定义 NodeView**

`Grep 'Paragraph.extend|customParagraph|paragraph.*addNodeView'` → 无匹配。

只有：

- `EditorPanel.vue:387` 用 `StarterKit`（默认 Paragraph 扩展、默认 `<p>` 渲染）
- 自定义 `InkforgeListItem`（line 91）扩展 list-item 加 footnoteId attribute——不影响 `<p>` 自身

结论：段落 `<p>` 走 ProseMirror 默认渲染（`toDOM: () => ['p', 0]`），完全接受 Decoration.node 的 class 注入。

### 5. 但 dimNear / dimFar / blockActive 的 attrs 包含 `opacity` 吗？

`TypewriterMode.ts:282-316` decoration 的 attrs 只有 `class`：

```ts
Decoration.node(nodeStart, nodeEnd, {
    class: 'typewriter-block-active',
}),
...
Decoration.node(nodeStart, nodeEnd, {
    class: 'typewriter-dimmed typewriter-dim-near',
}),
...
Decoration.node(nodeStart, nodeEnd, {
    class: 'typewriter-dimmed typewriter-dim-far',
}),
```

`class` 会与 `<p>` 本身的 class（无）合并，输出 `<p class="typewriter-dimmed typewriter-dim-near">`。

### 6. Vue NodeView 接管的 codeBlock 是否吃 outerDeco？

RichCodeBlock NodeView（`@tiptap/vue-3` 的 VueNodeViewRenderer）由 tiptap 包装实现，会把 outerDeco 写到 NodeView 根元素上（标准 prosemirror 行为）。这里不展开，因为题目主要在 `<p>`。

## 结论

**class 一定会被写到 `<p>` 外层 element 上**。Decoration.node 行为在当前栈下未被任何 InkForge 自定义阻断。

### 验证方法（用户手测时可在 Tauri devtools console 跑）

```js
// 打开打字机模式之后，在 console 跑：
document.querySelectorAll('.typewriter-block-active, .typewriter-dim-near, .typewriter-dim-far').forEach(el => console.log(el.outerHTML.slice(0, 120)))
// 若返回空数组，则 plugin 2 decorations 没真正生效 → 看 topic-2
// 若返回有元素，则 class 进 DOM 但样式没生效 → 看 topic-5
```

## 对修复的指导意义

1. "decoration class 没进 DOM" 这条假设大概率不成立（除非 plugin 2 自身没运行，这是 topic-2 的范畴）。
2. 修复 PRD 必须包含一个 **运行时可观测的诊断步骤**：在 plugin 2 decorations 函数顶部加 dev-only `console.debug`，在 onMounted 暴露 `__inkforge.editor` 引用（项目已经有 `dev-tools.ts` 注册 active editor，可直接用），让用户能在 devtools 一行命令查出实际 class 是否进 DOM。
3. 若 user 实际看到 `.typewriter-block-active` 元素存在但没看到红色侧栏 / 没看到淡化，问题在 CSS / 主题色变量（topic-5）。若元素不存在，问题在 plugin 2 没跑（topic-2 / topic-4）。
