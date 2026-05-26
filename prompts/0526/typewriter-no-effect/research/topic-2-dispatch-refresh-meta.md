# topic-2: `TYPORA_MODE_REFRESH_META` dispatch 是否能让 Plugin 2 decorations() 重新执行

## 调查问题

`bodyEditor.value.view.dispatch(bodyEditor.value.state.tr.setMeta(TYPORA_MODE_REFRESH_META, Date.now()))` 之后，TypewriterMode 的 Plugin 2（typewriterDim）的 `props.decorations(state)` 函数会被重新调用吗？还是说这个 meta 只对 TyporaMode 这个扩展的 plugin state 起作用？

## 调查方法

- `Grep TYPORA_MODE_REFRESH_META`
- 读 `inkforge/src/extensions/TyporaMode.ts`（meta 常量声明与用法）
- 读 `inkforge/node_modules/.pnpm/prosemirror-view@1.41.6/node_modules/prosemirror-view/dist/index.js`：`updateState` / `updateStateInner` / `viewDecorations` 流程

## 关键发现

### 1. `TYPORA_MODE_REFRESH_META` 的常量定义只服务 TyporaMode

`inkforge/src/extensions/TyporaMode.ts:12`:

```ts
export const TYPORA_MODE_REFRESH_META = 'typoraModeRefresh'
```

只在 TyporaMode 自己的 `state.apply` 里被 consume（line 609-615）：

```ts
state: {
  init(_, state) { return computeActiveLine(state) },
  apply(transaction, value, _oldState, newState) {
    if (!transaction.docChanged && !transaction.selectionSet && !transaction.getMeta(TYPORA_MODE_REFRESH_META)) {
      return value
    }
    return computeActiveLine(newState)
  },
}
```

TypewriterMode（不同扩展）里的 plugin 不读这个 meta 字段。

### 2. 但 PluginView.update() / props.decorations 是 **每次 view.updateState 都跑**

`prosemirror-view/dist/index.js:5448-5474`（`updateStateInner`）:

```js
updateState(state) {
    this.updateStateInner(state, this._props);
}
updateStateInner(state, prevProps) {
    ...
    this.state = state;
    let pluginsChanged = ...
    ...
    let innerDeco = viewDecorations(this), outerDeco = computeDocDeco(this);
    let updateDoc = redraw || !this.docView.matchesNode(state.doc, outerDeco, innerDeco);
    ...
}
```

`viewDecorations` 实现（line 4532-4542）:

```js
function viewDecorations(view) {
    let found = [];
    view.someProp("decorations", f => {
        let result = f(view.state);
        if (result && result != empty)
            found.push(result);
    });
    ...
    return DecorationGroup.from(found);
}
```

每次 `view.dispatch(tr)` 都会触发 `view.updateState(newState)` → `viewDecorations(view)` → 遍历所有 plugin 的 `props.decorations(state)` 调用一遍。

### 3. dispatch 一个 setMeta-only 的 tr 同样会触发 updateState

`view.dispatch(tr)` 内部：

- 调用 `state.apply(tr)` 得到 new state
- 调用 `view.updateState(newState)`
- 即便 tr 不改 doc / 不改 selection，只要 dispatch 了，就会走 updateState
- 但 plugin state 的 `apply` 看到 `transaction.docChanged === false && transaction.selectionSet === false` 时如果不 consume meta 可能选择返回原值（如 TyporaMode 做的那样）

### 4. `props.decorations(state)` 与 plugin state 无关

`view.someProp("decorations", ...)` 直接从 plugin **props** 上读 decorations 函数，不需要 plugin state 改变。只要 plugin 注册了 `props.decorations`，每次 updateState 都会调用，传入的是 **新 state**。

### 5. TypewriterMode Plugin 2 props.decorations 不依赖 plugin state

`inkforge/src/extensions/TypewriterMode.ts:258-323`:

```ts
new Plugin({
    key: new PluginKey('typewriterDim'),
    props: {
        decorations(state): any {
            if (!extensionOptions.enabled || !extensionOptions.dimInactiveParagraphs) {
                return DecorationSet.empty
            }
            ...
            return DecorationSet.create(doc, decorations)
        },
    },
}),
```

它读的是 `extensionOptions`（外层闭包，topic-1 已证明实时反映 mutation）和 `state` 参数（每次 dispatch 后的最新 state）。

### 6. 但 DOM 是否真的更新还要看 docView.matchesNode

`prosemirror-view/dist/index.js:5477`:

```js
let updateDoc = redraw || !this.docView.matchesNode(state.doc, outerDeco, innerDeco);
```

只有当新 DecorationSet 与旧的不 eq 时，docView 才会重绘。TypewriterMode 每次返回一个新的 `DecorationSet.create(...)`，里面装的 Decoration 对象都是新构造的（line 281-318 都是 `Decoration.node(...) / Decoration.inline(...)`），不会与旧的 eq——所以会重绘。

## 结论

**dispatch refresh meta 后 Plugin 2 decorations(state) 一定会被重新调用一次，且新的 DecorationSet 会触发 docView 重绘**。

dispatch 这一步在 EditorPanel.vue:525 已经执行了。所以这条链路在原理上是通的。

## 对修复的指导意义

1. "dispatch 不触发重绘" 这条假设可以排除。
2. 真正可能的失败点位移到：
   - **a. watcher 没真正触发**（开打字机时 settings 变化但 deep-watch 漏掉某些路径，例如非自身整体替换）
   - **b. Plugin 2 decorations() 跑了但 class 没真正应用到 DOM**（topic-3 调查）
   - **c. class 进了 DOM 但 CSS 没起作用**（topic-5 调查）
   - **d. HMR 让 Editor 实例还挂着旧版本扩展（dev 模式特有）**（topic-4 调查）
3. 建议在最终修复前：先在 Tauri devtools console 打 `bodyEditor.extensionManager.extensions.find(e=>e.name==='typewriterMode').options` 看 enabled 实际值，再在 plugin 2 decorations 函数顶部加一句 `console.debug('typewriterDim deco', extensionOptions.enabled)` 看是否被调用 + enabled 实际值。这是诊断的下一步。
