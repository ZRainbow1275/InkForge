# 03-27 Editor Hub Settings Full Upgrade

> 2026-03-28 executable checkpoint: the authoritative implementation status for this task is the combination of `prompts/0327/*.md`, this PRD, and the live code under `inkforge/src`. Earlier gap-analysis wording in older `docs/specs/*.md` files should be treated as historical baseline unless explicitly re-stated here.

## Goal
Implement the 2026-03-27 spec set under `prompts/0327/` for the InkForge frontend in a spec-first, incremental way, preserving the existing editor paper aesthetic while completing editor, hub, settings, account, rendering, insights, and UI polish requirements.

## Scope
- Frontend app only: `D:\Desktop\Inkforge\inkforge`
- Primary source of truth: `prompts/0327/*.md`
- Supporting references: `docs/specs/*.md`, `.trellis/spec/frontend/*`, `.trellis/spec/guides/*`

## Constraints
- Do not change the core editor paper styling or the established red/ink/slate palette.
- Do not use emoji in any source file.
- Do not use mock data; use real Pinia stores and IndexedDB-backed data only.
- Keep changes incremental within the existing file structure and component hierarchy.
- Keep Vue 3 `<script setup lang="ts">`, Pinia, TipTap, Dexie, Tailwind, shadcn-vue, Zod, and lucide-vue-next.
- Do not create `EditorToolbar.vue`.
- All changes must pass `pnpm build` and `pnpm typecheck`.

## Requirements

### Phase 1
- Add Typora/source dual editor mode, settings persistence, width presets, and workstation switching.
- Complete keyboard shortcuts coverage and settings exposure.
- Add rendering and writing enhancements including context menu, find/replace, image drop/paste, and richer lowlight coverage.
- Repair the Hub section-1 composition to match the 0327 layout spec.

### Phase 2
- Complete FloatingToolbar/SlashCommand/ContextMenu capability coverage without introducing a fixed toolbar.
- Add local account management view, router entry, and store support.
- Fully implement settings coverage for editor/account/sync/advanced and shortcut grouping.
- Expand data insights with SVG-based charts backed by real data.

### Phase 3
- Polish overflow handling, dark mode consistency, transitions, and reduced-motion behavior.

## Acceptance Criteria
- [x] `prompts/0327/01` through `09` are implemented or explicitly reconciled with existing code where already complete.
- [x] All new UI uses lucide icons only and contains no emoji characters.
- [x] No feature depends on mock data or placeholder stores.
- [x] Dual editor modes, shortcut groups, context menu, find/replace, and account entry work inside the current workstation architecture.
- [x] Hub layout, settings coverage, and data insights align with the 0327 specs.
- [x] Docs/specs are updated to reflect the final executable contracts and implementation reality.
- [x] `cd inkforge && pnpm build`
- [x] `cd inkforge && pnpm typecheck`

## Progress Snapshot

### Verified on 2026-03-28
- `pnpm -C inkforge typecheck` passes.
- `pnpm -C inkforge build` passes.
- Repository-wide source scan for emoji/pictograph characters over `inkforge/src` passes with no hits using a widened Unicode pattern.
- Dual editor mode (`typora` / `source`) persists through `settingsStore.settings.editor.editorMode` and switches `WorkstationView.vue` between single-column paper editing and source+preview split mode.
- FloatingToolbar, SlashCommandMenu, EditorContextMenu, and FindReplace are all wired into the live editor flow without introducing `EditorToolbar.vue`.
- FloatingToolbar boundary handling is implemented in `FloatingToolbar.vue` through `preferredTop`/`fallbackTop` vertical flipping, left-right clamping, and `ResizeObserver`-driven compact reflow.
- Hub Section 3 renders 9 real insight cards backed by Pinia/Dexie data, with `ExportFrequency` as the ninth card per `prompts/0327/08-data-insights-spec.md`.

### Landed in this implementation slice
- Editor mode persistence, width presets, Typora/source switching, and workstation layout branching are implemented and type-safe.
- Keyboard shortcuts now cover the expanded 33-action matrix and flow into FloatingToolbar titles, context menu shortcuts, and Settings shortcut groups.
- Editor discovery flows are complete through FloatingToolbar, SlashCommandMenu, EditorContextMenu, and KeyboardShortcuts without adding a fixed toolbar.
- `SlashCommands.ts` and `SlashCommandMenu.vue` expose 20+ grouped commands with executable actions for headings, lists, blocks, inserts, and tools.
- `EditorPanel.vue` integrates right-click context menu actions, find/replace, drag-and-drop image upload, paste-image fallback handling, and source-mode bridging.
- Find/replace is intentionally implemented without a standalone `FindReplacePlugin.ts`; match collection, selection navigation, and replacement transactions live in `EditorPanel.vue`, while `FindReplace.vue` remains the UI shell. The spec has been reconciled to this executable design.
- Hub Section 1 now uses `WritingFlowCard` as the hero, merges quick-create into the recent-articles card, and simplifies `InspirationCard` to the intended light-weight style.
- Hub Section 3 now renders 9 insight cards: `ContributionHeatmap`, `ProductivityInsights`, `WordCountTrend`, `WordDistribution`, `CategoryDistribution`, `WritingTimeline`, `TagCloud`, `RecentActivity`, and `ExportFrequency`.
- `RecentActivity.vue` and `ExportFrequency.vue` refresh from real Dexie activity-log events via `inkforge:activity-log-updated` with polling fallback.
- `AccountWelcome.vue`, router `/account`, `HubHeader.vue`, and `stores/account.ts` now provide local account creation, switching, profile editing, and settings/account synchronization.
- `App.vue`, `router/index.ts`, and `styles/main.css` now propagate route transitions, theme attributes, reduced-motion attributes, truncation utilities, dark-mode variables, shared card tokens, and insight card tokens.
- Export pipelines were normalized to remove emoji characters from source and emitted marker defaults; related quality-detection text and checkbox rendering stay behaviorally consistent.

### Remaining scope after this checkpoint
- No open functional scope remains inside the 2026-03-27 frontend task bundle. Residual observations are limited to non-blocking build warnings from cycle-avoidance dynamic imports in `stores/ai.ts` / `stores/category.ts` and large chunks from the editor-heavy workstation bundle.

## Technical Notes
- Prefer reusing existing stores, editor services, and hub/data components before adding new abstractions.
- Keep documentation updates aligned with `.trellis/spec/` and `docs/specs/`.
- Minimize redundant builds; use targeted checks during implementation and full verification at phase boundaries.
