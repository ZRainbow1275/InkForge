# P1 Split View Baseline PRD

## Source Of Truth

- Primary spec: `prompts/0420/specs/35-split-view-spec.md`.
- Related specs: `34-layout-persistence-spec.md`, `39-sync-scroll-spec.md`, `45-tabbar-enhancement-spec.md`, `48-session-restore-spec.md`.
- Existing implementation surface: `inkforge/src/views/WorkstationView.vue`, `inkforge/src/services/layout-persistence/*`, `inkforge/src/stores/layoutPersistence.ts`, `inkforge/src/stores/settings.ts`, `inkforge/src/services/command/builtin.ts`, `inkforge/src/types/command-palette.ts`.

## Baseline Goal

Deliver Spec 35 Phase 1 as a real vertical slice inside the current Workstation design without deleting existing panels, editor modes, preview mode, manager/sidebar functionality, or localStorage fallbacks.

## Phase 1 Scope

- Add a real SplitView state model to the existing layout persistence record: enabled state, split ratio, sync-scroll enabled state, and left/right font scale fields.
- Add `toggleSplitView` shortcut and command-palette action. Spec 35 owns `Ctrl+Shift+E`; the existing sidebar toggle must remain available through a non-conflicting binding and command.
- Render a right-side split preview pane next to the existing editor when SplitView is active and the global editor mode is not `preview`.
- Keep Preview mode read-only and backed by current `MarkdownPreview`/rendered markdown flow. No placeholder preview data.
- Add a draggable, double-click-reset, keyboard-accessible separator with ARIA `separator`, ratio clamp `0.2..0.8`, and minimum pane behavior.
- Disable/auto-close SplitView below the responsive threshold (baseline: 900px) and persist the disabled state honestly.
- Add a sync-scroll toggle and basic percentage-based sync with loop prevention. This is a Phase 1 fallback that must be documented as pending anchor-map precision.
- Persist changes through the real layout persistence store and keep current localStorage fallbacks intact.

## Out Of Scope For This Baseline

- Reference document picker.
- Split Compare with a second editable TipTap instance.
- Tauri multi-window split state sync.
- Full block/anchor scroll-map implementation.
- Native new-window preview button.

## Acceptance Criteria

- `pnpm exec vitest run src/services/layout-persistence/layout-persistence.test.ts` passes and covers split fields/migration.
- `pnpm exec vue-tsc --noEmit` passes.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passes.
- `pnpm exec vitest run` passes.
- `pnpm build` passes with no new blocking warnings.
- Browser smoke proves Workstation can persist and restore split-view fields in real IndexedDB v16, and the split preview appears without console errors.
- Docs/specs are updated with current truth and pending full-spec items.

## No Mock Rule

All SplitView behavior must use the real editor content, real `MarkdownPreview`, real settings/command stores, and real IndexedDB-backed layout persistence. Test fixtures may exercise deterministic logic but product code must not seed fake documents or fake layout rows.