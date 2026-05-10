# P1 Workstation Layout Baseline PRD

## Context

This task continues `prompts/0420` after Spec 12 FileManager baseline. The source of truth is `prompts/0420/specs/13-workstation-layout-spec.md`, with persistence boundaries from `prompts/0420/specs/34-layout-persistence-spec.md`.

The existing `inkforge/src/views/WorkstationView.vue` already implements a real four-zone workstation shell, mode-specific layout memory for Typora/Source/Preview, focus mode, panel collapse controls, preview stage, inspector, status bar, and real editor/store integration. This task must preserve that structure and avoid replacing it with a new store or shell.

## Goals

1. Add a compatible layout preset baseline to the existing Workstation header.
2. Keep presets real and stateful: applying a preset must update existing collapse refs and panel width CSS variables.
3. Add typed panel width state with defensive localStorage persistence.
4. Drive manager/stage/inspector panel widths through CSS variables instead of hard-coded width literals.
5. Preserve existing per-editor-mode layout memory and focus mode behavior.
6. Validate with type-check, lint, build, and browser runtime checks. No mock data.

## Non-Goals For This Baseline

1. Full drag ResizeHandle implementation is not completed in this slice.
2. A new `useWorkstationStore` is not introduced in this slice.
3. Right-panel reference/split-compare modes are not completed in this slice.
4. Tab drag ordering, cross-window tab migration, and multi-window support are not completed in this slice.
5. Responsive auto-collapse and full Spec 34 IndexedDB persistence are not completed in this slice.

## Acceptance Criteria

1. Existing Workstation editor, FileManager, Stage, Inspector, StatusBar, export, and focus controls remain available.
2. Header exposes layout presets without emoji icons.
3. Default preset restores manager/stage/inspector expanded states and baseline widths.
4. Writing preset keeps the manager available while collapsing the preview stage for writing focus.
5. Review preset expands all panels and widens the inspector for review/export controls.
6. Focus preset reuses the existing focus mode instead of inventing a parallel focus state.
7. Panel widths are exposed as CSS variables on `.workstation`.
8. Persisted panel-width JSON is parsed defensively and illegal values fall back to defaults.
9. Preset application updates `inkforge.workstation.panelWidths` in localStorage.
10. `pnpm exec vue-tsc --noEmit` passes in `inkforge/`.
11. `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passes in `inkforge/`.
12. `pnpm build` passes in `inkforge/`, except for known chunk-size warnings.
13. Browser runtime validation confirms preset controls render, update DOM classes/styles, persist widths, survive bad JSON, and produce no console errors.
14. `prompts/0420/specs/13-workstation-layout-spec.md` and `prompts/0420/acceptance-matrix.md` are updated to record baseline truth without marking full spec completion.

## Completion Evidence

- `pnpm exec vue-tsc --noEmit` passed in `inkforge/`.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed in `inkforge/`.
- `pnpm build` passed in `inkforge/`; only the pre-existing Vite chunk-size warning remains.
- Browser runtime validation opened `http://127.0.0.1:5176/workstation` and confirmed the layout preset controls render with no console errors.
- Runtime validation confirmed writing/review/focus presets update panel collapsed classes, CSS variables, and `inkforge.workstation.panelWidths` localStorage.
- Runtime validation confirmed invalid panel-width JSON falls back without crashing.
