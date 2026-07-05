# Directory Structure

> How frontend code is organized in this project.

---

## Overview

The runnable Inkforge frontend lives in the nested package `inkforge/`. The
root repository contains Trellis, docs, and tooling; do not assume root-level
`src/` is the app. The frontend is a Vue 3 + Vite + Pinia app with feature
components, composables, stores, service modules, Tiptap extensions, and
Dexie-backed local persistence.

---

## Directory Layout

```
inkforge/src/
├── views/           # Route-level screens: Hub, Workstation, Publish, Settings
├── components/      # Feature and shared Vue components
├── composables/     # Vue composables named use*
├── stores/          # Pinia setup stores
├── services/        # Business logic, repositories, providers, export engines
├── schemas/         # Zod schemas and DTO contracts
├── extensions/      # Tiptap extensions and extension tests
├── router/          # vue-router configuration
├── styles/          # Global CSS and design-system styles
├── utils/           # Cross-cutting utilities, Dexie db, crypto helpers
├── core/            # Domain authority/lifecycle helpers
└── types/           # Shared type exports
```

---

## Module Organization

- Route shells belong in `src/views/**`.
- Feature UI belongs in `src/components/<feature>/**`.
- Stateful UI/business orchestration belongs in `src/stores/<feature>.ts`.
- Reusable Vue logic belongs in `src/composables/use*.ts`.
- Durable business rules, repositories, validators, and provider calls belong in
  `src/services/<feature>/**`, not directly inside Vue components.
- Editor behavior belongs in `src/extensions/**` when it is a Tiptap/ProseMirror
  concern.
- Tests live beside the thing they verify: `*.test.ts` or local `__tests__/`.

---

## Naming Conventions

- Vue components use PascalCase filenames: `TagInput.vue`,
  `WorkstationTabBar.vue`, `EditorPanel.vue`.
- Views end in `View.vue`: `HubView.vue`, `WorkstationView.vue`.
- Composables start with `use`: `usePreviewRenderer.ts`, `useTextStats.ts`.
- Pinia stores export `useXStore` from a feature file:
  `stores/article.ts`, `stores/sync.ts`, `stores/workstationTabs.ts`.
- Service feature folders use kebab-case: `tag-system`, `activity-logger`,
  `layout-persistence`.
- Prefer `@/` absolute imports for app modules.

---

## Examples

- `src/views/WorkstationView.vue` coordinates the main editing workspace.
- `src/components/tag-system/TagInput.vue` is a typed component with
  `withDefaults(defineProps<...>())`, typed emits, icon imports, and scoped CSS.
- `src/composables/usePreviewRenderer.ts` encapsulates reactive rendering state,
  timers, cleanup, and platform-specific dynamic imports.
- `src/stores/article.ts` shows store orchestration across repositories, audit,
  sync dirty tracking, and derived state.

---

## 2026-07-05 executable examples and anti-patterns

### Real code examples from the current tree

```ts
// inkforge/src/stores/settings.ts
import { defineStore } from 'pinia'
import { z } from 'zod'
import { createActivityLogger } from '@/services/activity-logger'
```

```ts
// inkforge/src/composables/useSyncScroll.ts
import type { ComputedRef, Ref } from 'vue'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/core'
```

### Anti-patterns

```ts
// Bad: a view imports a private component implementation detail.
import { privateHelper } from '@/components/editor/internal/private-helper'

// Good: a view uses public store/service/composable contracts.
import { useSettingsStore } from '@/stores/settings'
```

Views coordinate state and shell layout; components stay reusable; composables own browser lifecycle; services own persistence, parser, export, and security boundaries.
