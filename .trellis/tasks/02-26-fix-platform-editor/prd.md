# Fix Platform Types and Editor Components - 4 TypeScript Errors

## Goal
修复 platform.ts 的 `__TAURI__` 声明冲突和编辑器组件的类型不匹配问题。

## Error List

### C1-C2: platform.ts:93 — `__TAURI__` declaration conflicts
- Root cause: `declare global { interface Window { __TAURI__?: ... } }` conflicts with existing declaration in `@tauri-apps/api` or `vite-env.d.ts`
- Two declarations have different type structures
- Fix: Remove custom declaration, use type-safe wrapper with proper typing, or create unified `tauri.d.ts`

### D1: EditorPanel.vue:81 — `Extension<any,any>` not assignable to `AnyExtension`
- Root cause: `@tiptap/core` Extension type vs `useEditor` expected `AnyExtension` type version mismatch
- Fix: Add type assertion `as AnyExtension` to `WeChatFormat` extension

### D2: MarkdownEditor.vue:69 — `ready` event callback signature mismatch
- Root cause: `vue-codemirror` `@ready` event expects `(payload: { view: EditorView; state: EditorState; container: HTMLDivElement }) => any`
- Component emit only declares `(payload: { view: EditorView }) => void`
- Fix: Expand `handleReady` and emit signature to include full callback parameters

## Acceptance Criteria
- [ ] `npx vue-tsc --noEmit 2>&1 | grep -E "(platform|EditorPanel|MarkdownEditor)"` returns zero output
- [ ] No new `any` types introduced
- [ ] Tauri platform detection still works
- [ ] Editor components render correctly

## Technical Notes
- Files: `inkforge/src/utils/platform.ts`, `inkforge/src/components/editor/EditorPanel.vue`, `inkforge/src/components/editor/MarkdownEditor.vue`
- Related: `inkforge/src/vite-env.d.ts`, `inkforge/src/extensions/WeChatFormat.ts`
