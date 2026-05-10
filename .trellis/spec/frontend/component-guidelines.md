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

---

## Common Mistakes

- Do not leave unused imports or computed values. Existing repo-wide gates are
  currently blocked by unused symbols in Hub/insights files; new components must
  not add more.
- Do not inject mock IndexedDB/localStorage rows for proof. Browser smoke should
  exercise real UI actions and inspect storage read-only.
- Do not put service contracts or Zod validation rules only in components.
- Do not use emoji icons; use the installed icon library.
