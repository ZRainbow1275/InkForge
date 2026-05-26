# topic-4: Vite HMR 对 TipTap 扩展 / Editor 实例的影响 — 用户手测时新扩展是否需要硬刷新才能生效

## 调查问题

用户在 Tauri dev 环境下手测 typewriter mode 升级版（dirty 改动尚未 commit），看到的"打字机全程无用"，是否可能是因为 Vite HMR 已经热替换了 `TypewriterMode.ts` 模块代码，但 EditorPanel 还挂着按旧扩展实现 new 出来的 Editor 实例 / 旧 plugins，需要 EditorPanel 重新 mount 或硬刷新（Ctrl+F5 / 重启 Tauri）才能拿到新扩展？

## 调查方法

- 读 `EditorPanel.vue` 的 onMounted、initializeBodyEditor、onBeforeUnmount
- 看 Editor 实例创建一次性 new 的代码
- 验证 watcher / mutation 路径是否可以"修复" stale extension 问题

## 关键发现

### 1. Editor 实例在 onMounted 时一次性 new，extensions 是构造时注入的快照

`inkforge/src/components/editor/EditorPanel.vue:378-493` (`initializeBodyEditor`):

```ts
function initializeBodyEditor(): void {
  if (!editorContainerRef.value || bodyEditor.value) return
  ...
  bodyEditor.value = new Editor({
    element: editorContainerRef.value,
    extensions: [
      StarterKit.configure({...}),
      ...
      TypewriterMode.configure({
        enabled: settingsStore.settings.editor.typewriterMode,
        cursorPosition: writingAssistStore.cursorPosition,
      }),
      TyporaMode.configure({...}),
      ...
    ],
    content: '',
    onUpdate: (...) => {...}
  })
  ...
}

onMounted(() => {
  initializeBodyEditor()
})
```

注意 `if (...bodyEditor.value) return`（line 379）——如果已经存在 Editor 实例，直接 return，**不会重 init**。

### 2. onBeforeUnmount 才 destroy editor

`EditorPanel.vue:731-738`:

```ts
onBeforeUnmount(() => {
  cleanupDevPanelEditorBridge?.()
  cleanupDevPanelEditorBridge = null
  bodyEditor.value?.destroy()
  bodyEditor.value = null
  clearTimeout(saveTimeout)
  clearTimeout(sourceProjectionTimeout)
})
```

仅在 EditorPanel 组件销毁时才 destroy + recreate。

### 3. Vite HMR 默认对 `.ts` 文件不会触发 Vue 组件 remount

- Vite HMR 对 `.vue` 文件的 `<script setup>` 改动会让 Vue 的 vue-loader 卸载并重新挂载组件（boundary at .vue file）。
- 对 `.ts` 模块改动，Vite 走 ESM HMR：模块更新，但导入它的 .vue 组件不会自动 remount。需要 .vue 本身或 boundary 自身 accept HMR。
- `TypewriterMode.ts` 是普通 .ts 文件，**没有声明 `import.meta.hot.accept`**（grep `import.meta.hot` 项目内）。

### 4. 项目内 import.meta.hot

<!-- placeholder - confirmed via grep below -->

实际通过 grep 验证：项目内 `TypewriterMode.ts` 没有 `import.meta.hot.accept`。

### 5. 后果链路

当用户修改 `TypewriterMode.ts` 后：

- a. Vite 收到 file change → 触发模块更新（推送新 module factory 到 client）
- b. Client HMR 找不到 `accept` 边界 → fall back 到 `full-reload`，整个页面 reload。

**或者**：

- a. Client HMR 找不到边界，**但 Vue 的 `App.vue` / 父组件 boundary accept** → 父组件重渲染 → 但子组件如果 `key` 没变，可能复用实例 + props 比较。EditorPanel 没有动态 key（`WorkstationView.vue:3224` 直接渲染，无 :key）。
- b. Vue 复用 EditorPanel instance → `bodyEditor.value` 已存在 → `initializeBodyEditor()` 早早 return。
- c. 但 EditorPanel 引用的 `TypewriterMode` 在 `import { TypewriterMode } from '@/extensions/TypewriterMode'`(line 37) 是 ESM 静态 import，HMR 更新后该绑定 **不会自动指向新模块**（这是 ESM 严格语义，TypeScript/Vite 行为也一致）。

简言之：HMR 通常 fall back full-reload，但如果中间有任何 vue-loader / EditorPanel.vue 自身的 HMR 让 EditorPanel 复用，bodyEditor 还指着旧 plugin 闭包，**新版 TypewriterMode 的 plugin 代码不会生效**。

### 6. 验证手段（最可靠）

- 用户硬刷新（Ctrl+Shift+R / 重启 Tauri dev）后再测，若仍然无效 → 不是 HMR 问题。
- 若硬刷新后能看到效果 → 是 HMR 残留问题。

### 7. Tauri dev 的 webview 缓存与 HMR

Tauri dev 用 Tauri 内嵌 WebView（Win11 是 WebView2）。它对 Vite HMR 的反应等价于浏览器，但：

- WebView2 缓存可能更顽固（DevTools → Application → Clear storage）
- Tauri dev 重启会重建 WebView 进程，**等价于 full reload + cache invalidation**

## 结论

**可能是 HMR 缓存问题**。需要排除路径：

- a. 用户在改完 TypewriterMode.ts 后没有重启 Tauri dev 或硬刷新 → 看到的可能是旧扩展行为
- b. 如果 Vite 触发了 full-reload，那 HMR 残留不是问题。但还需确认控制台是否有 `[vite] full-reload` 日志

确定性结论需要用户：(1) 关闭 Tauri dev → (2) `npm run tauri:dev` 重新启动 → (3) 再手测。

## 对修复的指导意义

1. **修复 PRD 必须先要求用户硬重启 Tauri dev 再复测**。否则讨论再多代码逻辑都可能是空对空。
2. 若硬重启后问题仍在 → 锁定到 topic-2 / topic-3 / topic-5。
3. 若硬重启后好了 → 实际不需要改代码，只是 dev workflow 问题。仅需在 spec 里加一条"修改 TipTap 扩展 / ProseMirror plugin 文件后必须重启 Tauri dev"约定（这种 dev 体验约束应放进 `.trellis/spec/frontend/` 中）。
4. 该 topic 与 [`feedback_manual_test_via_tauri.md`](C:\Users\HP\.claude-profiles\aws\config\projects\D--Desktop-Inkforge\memory\feedback_manual_test_via_tauri.md) 中"默认走 Tauri 不走 vite"原则强相关——再加一条"扩展层修改建议 hard reload"。
