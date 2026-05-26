# topic-1: TipTap Extension `this.options` 引用语义 与 mutation 是否实时生效

## 调查问题

`tw.options.enabled = ...`（直接 mutate `extensionManager.extensions[i].options`）是否真的能让 `TypewriterMode.addProseMirrorPlugins()` 里通过 `const extensionOptions = this.options` 捕获的闭包变量同步看到新值？还是必须 `editor.unregisterPlugin / registerPlugin` 重 init 扩展？

## 调查方法

- 读 `inkforge/node_modules/.pnpm/@tiptap+core@2.27.2_@tiptap+pm@2.27.2/node_modules/@tiptap/core/dist/index.js`
- 关注 `Extension.configure`、`ExtensionManager.plugins`、`addProseMirrorPlugins` 的调用 context
- 与项目代码 `inkforge/src/extensions/TypewriterMode.ts:160-166` 比对

## 关键发现

### 1. `Extension.create<T>()` 内 `this.options` 是 Extension 实例的字段

`@tiptap/core/dist/index.js:855-864`（Mark 类，Node 与 Extension 同构）:

```js
this.options = this.config.defaultOptions;
if (this.config.addOptions) {
    this.options = callOrReturn(getExtensionField(this, 'addOptions', {
        name: this.name,
    }));
}
this.storage = callOrReturn(getExtensionField(this, 'addStorage', {
    name: this.name,
    options: this.options,
})) || {};
```

`this.options` 是 Extension 实例上挂的一个 **对象引用**。在 `addOptions()` 执行后被赋值，之后 Extension 生命周期内是同一个对象引用（除非显式重赋值）。

### 2. `configure(options)` 不是 mutate 而是 **new 一个 child extension**（关键差异）

`@tiptap/core/dist/index.js:869-883`:

```js
configure(options = {}) {
    // return a new instance so we can use the same extension
    // with different calls of `configure`
    const extension = this.extend({
        ...this.config,
        addOptions: () => {
            return mergeDeep(this.options, options);
        },
    });
    extension.name = this.name;
    extension.parent = this.parent;
    return extension;
}
```

注意 `mergeDeep(this.options, options)` — mergeDeep 是 **写入并返回 this.options**（即 mutate 父实例的 options，然后新 extend 时 child 的 `addOptions()` 再次返回那个对象）。但 `new Mark(extendedConfig)` 在 extend 时又会调用 `extension.options = callOrReturn(getExtensionField(extension, 'addOptions', ...))`（行 892-894），所以 child extension 拿到的是 `mergeDeep` 的返回值 = 与父 extension 共享的同一对象引用。

`Editor` 拿到的是 `TypewriterMode.configure({...})` 返回的 child extension。

### 3. `addProseMirrorPlugins()` 被调用时 context 里的 `options` 与 extension 实例 options 是 **同一引用**

`@tiptap/core/dist/index.js:1267-1303`（ExtensionManager `get plugins()`）:

```js
const allPlugins = extensions
    .map(extension => {
        const context = {
            name: extension.name,
            options: extension.options,   // ← 这是引用拷贝，但指向同一对象
            storage: extension.storage,
            editor,
            type: getSchemaTypeByName(extension.name, this.schema),
        };
        ...
        const addProseMirrorPlugins = getExtensionField(extension, 'addProseMirrorPlugins', context);
        if (addProseMirrorPlugins) {
            const proseMirrorPlugins = addProseMirrorPlugins();
            plugins.push(...proseMirrorPlugins);
        }
        ...
```

在 `TypewriterMode.ts:161`：

```ts
addProseMirrorPlugins() {
    const extensionOptions = this.options   // this === context
    return [
        new Plugin({ ... view(...) { ... if (!extensionOptions.enabled) ... } ... }),
        new Plugin({ ... props: { decorations(state) { if (!extensionOptions.enabled || !extensionOptions.dimInactiveParagraphs) return DecorationSet.empty ... } } })
    ]
}
```

`this.options` 是 context.options，与 `extension.options` 是 **同一对象引用**。`extensionOptions` 是该对象的指针。

### 4. EditorPanel 直接 mutate 走的是 `extensionManager.extensions[i].options.X = ...`

`inkforge/src/components/editor/EditorPanel.vue:510-525`:

```ts
const exts = bodyEditor.value.extensionManager.extensions as TyporaExtensionRecord[]
const tw = exts.find(e => e.name === 'typewriterMode')
if (tw) {
    tw.options.enabled = editorSettings.typewriterMode
    tw.options.cursorPosition = writingAssistStore.cursorPosition
}
...
bodyEditor.value.view.dispatch(bodyEditor.value.state.tr.setMeta(TYPORA_MODE_REFRESH_META, Date.now()))
```

`tw.options` 即 `extension.options`。改这个对象的字段就是改 `extensionOptions` 闭包引用的对象的字段。

### 5. 结论：mutation 立刻在闭包内可见

闭包 `extensionOptions` 指向的对象 === `extension.options` 对象 === EditorPanel `tw.options` 对象。三个名字、一个对象。任何 `tw.options.enabled = true` 都会在下一次 plugin update / decorations 调用时被读到。

## 结论

**mutation 实时生效**。无需重新 `register/unregister` 扩展、无需 reInit Editor。这条路径在原理上是通的——只要后续触发了 plugin 的 update 或 decorations() 重新调用。

## 对修复的指导意义

1. "extension options mutation 不生效"这条假设可以排除。问题不在这一层。
2. 真正需要追问的是：mutate 完成 + dispatch refresh meta 之后，plugin 2 `decorations(state)` 是否真的被重新调用，以及 Decoration class 是否真的进了 DOM。这两点是下面 topic-2 / topic-3 的范围。
3. 若 cursorPosition 改了 enabled 没动，第二个 watcher `watch(writingAssistStore.cursorPosition)` 没有 dispatch refresh meta，是 **故意的**（注释 line 531-532），因为它只影响下一次滚动计算，不影响装饰。这点与该问题无关。
