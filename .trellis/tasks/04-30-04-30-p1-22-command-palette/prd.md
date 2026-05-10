# P1 Command Palette Baseline PRD

## Source Contract

- Primary spec: `prompts/0420/specs/22-command-palette-spec.md`.
- Acceptance ledger: `prompts/0420/acceptance-matrix.md`.
- Project constraints: no mock data, no Emoji glyphs, no deletion of existing features, and no broad rewrite of the editor command chain.
- Existing conflict: `Ctrl+K` is already the editor link shortcut in `settings.shortcuts.link` and `FloatingToolbar`. This baseline must not break that link workflow.

## Goal

Deliver a compatible command palette baseline that establishes the real architecture named by Spec 22 and wires it to existing InkForge behavior. The baseline must be keyboard-first, context-aware, local-first, and truthful about what is fully implemented versus still pending for the full v2.1 spec.

## Baseline Scope

This task implements:

- `src/types/command-palette.ts` with the command model, groups, scopes, context tags, history entries, search results, and Workstation bridge contracts.
- `src/services/command/registry.ts` with command registration, duplicate rejection, group/context indexes, and extension command prefix/permission checks.
- `src/services/command/executor.ts` with permission checks, context checks, destructive confirmation, optional version checkpoint hooks, and audit callbacks.
- `src/services/command/fuzzy-search.ts` with local in-memory fuzzy search, context filtering, ranking, title match ranges, prefix weighting, and history bonuses.
- `src/services/command/history.ts` with real IndexedDB persistence for command history and favorites, degrading to empty state when IndexedDB is unavailable.
- `src/services/command/builtin.ts` with only real commands that call existing router, article store, Settings query tabs, Publish route, or Workstation actions.
- `src/stores/command-palette.ts` with Pinia state for open/query/active command/results/history/favorites/context/workstation bridge.
- `src/components/command-palette/CommandPalette.vue` with Teleport modal, ARIA dialog/listbox semantics, keyboard navigation, quick panel, command execution, and Lucide icons.
- `App.vue` global shortcuts and root command registration.
- `WorkstationView.vue` context bridge for Focus Mode, Typewriter Mode, editor-mode switching, manager sidebar, preview toggle, and export modal.
- Unit tests for registry, fuzzy matching, context filtering, and history weighting.

## Shortcut Policy

- `Ctrl+Shift+K` opens the command palette in document/editor-filtered mode when the event target is not editable.
- Editable targets keep the existing `Ctrl+Shift+K` code-block shortcut intact.
- `Ctrl+K` / `Cmd+K` opens the command palette only when the event target is not editable.
- Editable targets keep the existing `Ctrl+K` link behavior intact.

## Non-Goals For This Baseline

- No fake AI commands.
- No fake file manager route command when the target route is not present.
- No simulated export success; export opens the real existing modal and fails with a typed error if the document is not ready.
- No full Fuse.js dependency. The baseline uses a typed local fuzzy scorer; a future full-spec pass may replace it if the project chooses the dependency.
- No full workflow-template composition or extension sandbox execution beyond registry validation hooks.
- No destructive document commands until the existing lifecycle trash/archive contracts are fully verified in a later task.

## Acceptance Criteria

- Opening the palette from `Ctrl+Shift+K` works in Workstation chrome, including editor-filtered commands.
- Pressing `Ctrl+Shift+K` inside editable editor content does not steal the existing code-block shortcut.
- Opening the palette from `Ctrl+K` works outside editable targets and does not steal the editor link shortcut inside editable content.
- Search returns real commands from the registry and supports partial/abbreviated matches such as `bld` for `Toggle Bold`.
- Empty query shows real recent/featured/favorite quick sections from IndexedDB-backed state.
- Selecting `New document` creates a real draft through `articleStore.addArticle`, selects it, and routes to Workstation.
- Settings commands route to real Settings tabs through existing query handling.
- Workstation commands execute through a registered bridge and are not shown outside editor context.
- No Emoji glyphs are introduced; component icons come from `lucide-vue-next`.
- Type-check, ESLint, targeted Vitest tests, production build, touched-file `git diff --check`, touched-file Emoji scan, and a Playwright smoke test must pass or have explicit evidence if blocked.
