# 模块 D：编辑器组件修复方案

## 错误清单

### D1: EditorPanel.vue:81 — `Extension<any,any>` 不可赋值给 `AnyExtension`
- **根因**: `@tiptap/core` 的 `Extension` 类型与 `useEditor` 期望的 `AnyExtension` 类型存在版本差异。`WeChatFormat` 自定义扩展的返回类型不匹配。
- **修复**: 对 `WeChatFormat` 扩展添加类型断言 `as AnyExtension`

### D2: MarkdownEditor.vue:69 — `ready` 事件回调签名不匹配
- **根因**: `vue-codemirror` 的 `@ready` 事件回调期望 `(payload: { view: EditorView; state: EditorState; container: HTMLDivElement }) => any`，但组件 emit 只声明了 `(payload: { view: EditorView }) => void`。
- **修复**: 扩展 `handleReady` 和 emit 的签名以包含完整的回调参数

## 验证

```bash
npx vue-tsc --noEmit 2>&1 | grep -E "(EditorPanel|MarkdownEditor)"
# 期望：零输出
```
