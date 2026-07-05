# Hook Guidelines

> How hooks are used in this project.

---

## Overview

Inkforge uses Vue composables, not React hooks. Composables live in
`inkforge/src/composables/`, are named `use*`, and encapsulate reusable
reactive logic, timers, browser APIs, and view-specific service orchestration.

---

## Custom Hook Patterns

- Export a typed function named `useX(...)`.
- Define input and return interfaces when the composable has more than a trivial
  surface.
- Accept `Ref<T>` inputs when the caller owns the reactive source.
- Return refs/computed values and methods; do not return untyped bags.
- Clean up timers, animation frames, or event listeners in `onUnmounted`.

Example: `usePreviewRenderer()` accepts typed refs/options, owns debounce and
`requestAnimationFrame` state, and returns `previewHtml`, `previewLoading`,
`lastRenderTime`, and `previewMeta`.

---

## Data Fetching

- There is no React Query/SWR equivalent in this app.
- Persistent data access generally flows through Pinia stores and service
  repositories.
- Composables may dynamically import service modules for UI-side async work, as
  `usePreviewRenderer()` does for platform export rendering.
- Keep async state explicit: loading refs, error refs, and stale-result guards
  where needed.

---

## Naming Conventions

- File names and exports start with `use`: `usePreviewRenderer.ts`,
  `useTextStats.ts`, `useSyncScroll.ts`.
- Return types should be named `XReturn`; option types should be named
  `XOptions`.
- Internal helper functions should describe the UI concern, such as
  `getDebounceDelay()` or `renderPreview()`.

---

## Common Mistakes

- Do not leave timers or `requestAnimationFrame` callbacks active after unmount.
- Do not hide service failures by silently returning stale UI output.
- Do not put durable business validation in a composable when a service or store
  owns the rule.
- Do not create global mutable singletons inside composables unless the feature
  explicitly needs shared process state.

---

## 2026-07-05 executable examples and anti-patterns

### Real code examples from the current tree

```ts
// inkforge/src/composables/useSyncScroll.ts
export interface UseSyncScrollOptions {
  enabled: Ref<boolean> | ComputedRef<boolean>
  active: Ref<boolean> | ComputedRef<boolean>
  leftScrollElement: () => HTMLElement | null
  rightScrollElement: () => HTMLElement | null
}
```

```ts
// inkforge/src/composables/useSyncScroll.ts
export interface UseSyncScrollReturn {
  anchorCount: Readonly<Ref<number>>
  rebuildAnchors: () => void
  scheduleRebuild: (delayMs?: number) => void
  dispose: () => void
}
```

### Anti-patterns

```ts
// Bad: listener without cleanup.
export function useWindowProbe() {
  window.addEventListener('resize', () => console.log(window.innerWidth))
}

// Good: expose dispose and register teardown.
export function useWindowProbe() {
  const onResize = () => undefined
  window.addEventListener('resize', onResize)
  const dispose = () => window.removeEventListener('resize', onResize)
  onBeforeUnmount(dispose)
  return { dispose }
}
```

Composables that allocate listeners, observers, timers, or animation frames must expose or register cleanup and guard browser-only APIs for tests/builds.
