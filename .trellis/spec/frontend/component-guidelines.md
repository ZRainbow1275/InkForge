# Component Guidelines

> How components are built in this project.

---

## Overview

Inkforge components use Vue 3 single-file components with `<script setup
lang="ts">`. Components should be thin UI surfaces over typed props/emits,
Pinia stores, composables, and service modules. Business validation and durable
data rules belong in services/stores, not in component templates.

---

## Component Structure

- Use `<script setup lang="ts">` first, then `<template>`, then `<style scoped>`
  when local styles are needed.
- Import icons from `lucide-vue-next`; do not use emoji as UI icons.
- Keep derived UI data in `computed(...)`; keep mutable local UI state in
  `ref(...)`.
- Name event handlers with verbs such as `createTag`, `handleEnter`,
  `updateQuery`.
- Use service/store calls for side effects. Components emit user intent upward
  or call a store action; they should not duplicate repository logic.

---

## Props Conventions

Use typed props and emits.

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: Tag[]
  suggestions: Tag[]
  disabled?: boolean
  placeholder?: string
}>(), {
  disabled: false,
  placeholder: 'Add tag or search existing tags',
})

const emit = defineEmits<{
  add: [tag: Tag]
  create: [name: string, color: string]
  remove: [tag: Tag]
  search: [query: string]
}>()
</script>
```

- Prefer explicit prop interfaces when the prop surface grows.
- Use `withDefaults` for optional props with stable defaults.
- Emits should carry typed payloads instead of untyped event objects.

---

## Styling Patterns

- Component-local styles use `<style scoped>`.
- Global design primitives live under `src/styles/**`.
- Layouts commonly use CSS grid/flex with explicit `min-width: 0` when content
  may shrink inside panels.
- UI state should be represented with classes, attributes, or CSS custom
  properties that the component owns.
- Avoid one-off visual systems that fight the existing design-system CSS.

---

## Accessibility

- Buttons must use `type="button"` unless they intentionally submit a form.
- Icon-only or ambiguous controls need accessible text, title, or aria labels.
- Form controls should use real `input`, `select`, and `button` elements when
  possible.
- Keyboard affordances already present in a component must be preserved, for
  example `@keydown.enter.prevent`.
- Clickable chart bars, category cards, article cards, and similar visual
  surfaces must be native `button` or `a` controls. Preserve the visual design
  with local CSS instead of recreating keyboard semantics on `div`/`span`.
- Menu triggers must be mounted, named, and expose `aria-haspopup`,
  `aria-expanded`, and `aria-controls`. When Enter or Space opens a menu and
  focus moves to its first item, consume that opening event so the same native
  activation cannot execute the newly focused item.

---

## Common Mistakes

- Do not leave unused imports or computed values. Existing repo-wide gates are
  currently blocked by unused symbols in Hub/insights files; new components must
  not add more.
- Do not inject mock IndexedDB/localStorage rows for proof. Browser smoke should
  exercise real UI actions and inspect storage read-only.
- Insight empty states must not invent tags, trends, counts, or other
  product-looking rows. Render only store/caller data plus a truthful empty-state
  explanation.
- Do not put service contracts or Zod validation rules only in components.
- Do not use emoji icons; use the installed icon library.
- Do not synchronously cancel a focus-sensitive recorder solely because one
  `blur` event fired after its focused DOM changed. Tauri/WebView2 may emit a
  transient blur/refocus pair; defer one animation frame and confirm
  `document.activeElement` actually left the trigger while preserving normal
  focus-loss and unmount cleanup.
- Desktop keyboard acceptance must click the visible trigger, send the real key
  chord, and inspect the production store/persistence boundary. Programmatic
  `focus()` or direct settings mutation cannot prove the native recorder works.
- Stateful Tauri/WebView2 E2E must fail closed unless the harness verifies the
  launched app is using the native driver-owned temporary
  `%TEMP%/scoped_dir*/EBWebView` data root. Stop the driver before deleting only
  that verified scoped directory; never reuse or clean the production profile.
- Tauri apps with both splash and main WebViews must select the surviving main
  application handle before spec-level hooks run; identify it by an application
  invariant such as `.ink-titlebar`, use a bounded wait, and fail closed when it
  cannot be found.
- A custom-protocol Tauri E2E run uses bundled `dist` assets. After frontend
  changes, rebuild both the production frontend and the debug binary before
  setting `INKFORGE_E2E_SKIP_TAURI_BUILD=1`; Vite/HMR evidence alone does not
  refresh the bundled desktop assets.

---

## 2026-07-05 executable examples and anti-patterns

### Real code examples from the current tree

```vue
<!-- inkforge/src/components/editor/EditorStatusBar.vue -->
<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import type { ArticleStatus } from '@/types'
import type { EditorMode } from '@/extensions/TyporaMode'

const props = defineProps<{
  editor?: Editor
  lastRenderTime?: number
  editorMode: EditorMode
  articleStatus?: ArticleStatus | null
}>()
</script>
```

```vue
<!-- inkforge/src/components/editor/EditorStatusBar.vue -->
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'set-mode', value: EditorMode): void
  (e: 'open-editor-settings'): void
}>()
</script>
```

### Anti-patterns

```vue
<script setup lang="ts">
// Bad: untyped payload and Emoji icon leak into UI.
const emit = defineEmits(['change'])
const icon = 'sparkles'

// Good: typed emit plus installed icon component.
import { FileText } from 'lucide-vue-next'
const typedEmit = defineEmits<{ (e: 'set-mode', value: EditorMode): void }>()
</script>
```

Do not use Emoji as UI icons. Use installed icon libraries such as `lucide-vue-next`. Do not emit untyped payloads or hide store-owned state inside leaf components.


## Native SVG Asset Component Contract

Asset UI is a cross-layer surface, not a gallery-only component.

- AssetUploader.vue must send the real selected File into the production asset pipeline and expose pending, success, duplicate, and typed rejection states. It must not create sample assets or claim success before persistence finishes.
- AssetManager.vue must treat the latest asynchronous list request as authoritative. Search, tag, owner, and lifecycle filters may not silently impose a fixed result cap.
- Visual editor mode inserts the persisted image/SVG through the Tiptap image node. Source mode appends the shared Markdown image serialization; it must not inject derived HTML into Markdown authority.
- Binary deletion is reference-aware: deleting one article reference must not remove a shared binary. The final reference may remove the record and revoke any cached object URL.
- Blob URLs are bounded runtime resources. Cache replacement, final-reference deletion, and store teardown must revoke URLs; components must not retain unbounded per-render URLs.
- Unsupported MIME insertion must produce visible feedback and create no editor image node.
- Native E2E must normalize the borderless Tauri host through production window controls. Do not use WebDriver-only maximizeWindow() or setWindowSize() when that can resize the WebView independently of its host.
- Native E2E must compare the real host rectangle with `window.innerWidth` / `window.innerHeight` and fail closed when either absolute axis gap exceeds 8 px. The bounded allowance exists only for DPI rounding/native border variance; a merely large host window is not proof that the WebView filled it.
- Native E2E must use the dedicated `inkforge_e2e_*_v3` OS-credential namespace, verify that the real key was created, and delete it through the real Tauri command after every session. WebView2-profile cleanup alone does not isolate Windows Credential Manager.

### Required checks

- Unit: deduplication, ownership migration, shared-reference deletion, latest-request-wins, URL revocation, and source Markdown serialization.
- Native integration: real SVG file input, Blob decode under CSP, visual insertion, source insertion, reload readback, duplicate reuse, final deletion, and a real unsupported file.
- Visual: host and WebView bounds remain aligned; the application must not appear as a resized WebView surrounded by a black native surface. The acceptance log must include redacted host/client dimensions and no runtime path. A deterministic Node regression must accept the 8 px boundary and reject positive or negative 9 px drift before real WebView2 proof runs.
