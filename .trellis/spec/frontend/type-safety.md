# Type Safety

> Type safety patterns in this project.

---

## Overview

<!--
Document your project's type safety conventions here.

Questions to answer:
- What type system do you use?
- How are types organized?
- What validation library do you use?
- How do you handle type inference?
-->

(To be filled by the team)

---

## Type Organization

<!-- Where types are defined, shared types vs local types -->

(To be filled by the team)

---

## Validation

<!-- Runtime validation patterns (Zod, Yup, io-ts, etc.) -->

(To be filled by the team)

---

## Common Patterns

<!-- Type utilities, generics, type guards -->

(To be filled by the team)

---

## Forbidden Patterns

<!-- any, type assertions, etc. -->

(To be filled by the team)

## Workstation TabBar Types

- Workstation tab state must use explicit exported types from src/stores/workstationTabs.ts: WorkstationTab, WorkstationClosedTab, WorkstationTabDocType, and WorkstationTabSaveState.
- WorkstationTab.id and WorkstationTab.articleId must be non-empty strings and represent the same real article id in the baseline.
- Persisted sessionStorage payloads must be parsed through the store schema before use; corrupt payloads are removed instead of repaired with guessed data.
- Component props must receive typed tab items; do not pass untyped records or any-shaped tab payloads into WorkstationTabBar.
- Save-state rendering is a narrow union: clean, saving, error. Do not add dirty or conflict state until a durable source of truth exists.
## BlockDragHandle Types

- Drag/drop code must use explicit local types: `BlockInfo`, `DropTarget`, `BlockDropSide`, `BlockMoveDirection`, `BlockDragPluginMeta`, and `MoveBlockResult`.
- Supported nodes must be gated by `isSupportedDraggableBlock(node)` before calling `view.nodeDOM(pos)` or creating move transactions.
- `createMoveTopLevelBlockTransaction()` returns `null` for invalid moves; callers must branch on null instead of asserting a transaction exists.
- `enabled` is a function in `BlockDragHandleOptions` so EditorPanel can read current Source/Typora state without recreating the extension.
- Do not introduce `any` for ProseMirror state or DOM event payloads. Use `EditorState`, `Transaction`, `EditorView`, `DragEvent`, and typed helper results.
## Tag System Types

- Tag system code must use the explicit types exported from `src/services/tag-system/types.ts`: `TagRecord`, `DocTagRecord`, `Tag`, `DocTag`, `TagFilterMode`, `TagSortMode`, `TagColorPreset`, `TagRepositoryErrorCode`, `TagRepositoryError`, and repository parameter/result types.
- Tag names are validated at repository boundaries: trimmed name length is 1-50 characters, whitespace inside the name is rejected, and duplicate normalized names are rejected case-insensitively per account.
- Tag colors must be strict HEX values. Components may choose from `TAG_COLOR_PRESETS`, but repository validation remains authoritative.
- `docTags` relation ids, compound keys, and count repair helpers must stay typed as strings/numbers. Do not introduce `any` for Dexie records or browser smoke evidence.
- `Article.tags` is a `string[]` compatibility mirror. Do not treat it as the source relation type or bypass `DocTagRecord`.
- Layout persistence manager tabs include `tags`; `LayoutManagerTab` and `ManagerTab` must remain synchronized when adding or removing Workstation manager tabs.

## SessionRestore Types

- Session restore tab snapshots must use `SerializedTab` from `src/services/layout-persistence/types.ts`; do not introduce any-shaped tab payloads or duplicate local schemas in components.
- `SerializedTab.id` and `SerializedTab.articleId` must be non-empty strings. In the current Workstation baseline they both resolve to the real article id.
- `useWorkstationTabsStore.serializeForLayout()` is the only tab-store API that exports durable layout tabs; components should not manually map private tab internals into Dexie records.
- `useWorkstationTabsStore.restoreFromLayout()` accepts only validated `SerializedTab` records. Missing article filtering belongs to `LayoutPersistenceService.validateSerializedTabs()` before store hydration.
- `LayoutStatePatch.openTabs`, `tabOrder`, `activeTabId`, and `activeArticleId` must remain synchronized in type and meaning. When adding a new Workstation tab field, decide explicitly whether it belongs in `SerializedTab` or remains sessionStorage-only metadata.
- Lifecycle flush handlers must catch unknown errors and convert them to logged messages; do not leak untyped rejected promises from page lifecycle events.

## EditorKeymap Types

- Editor structural key handling must use explicit exported types from `src/extensions/EditorKeymap.ts`: `ListEnterBehavior`, `EditorKeymapContextKind`, `EditorKeymapListAction`, `EditorKeymapContext`, `EditorKeymapKeyboardEvent`, `EditorKeymapRuntimeOptions`, and `EditorKeymapOptions`.
- `ListEnterBehavior` is the narrow union `notion | typora`; the Settings schema is the source of truth for the persisted `editor.listEnterBehavior` value.
- ProseMirror inputs must remain strongly typed as `EditorState`, `Transaction`, `ResolvedPos`, `NodeType`, `EditorView`, and `KeyboardEvent`. Do not introduce `any` for editor state, transaction, or DOM-keyboard payloads.
- List actions are a narrow union: `sink`, `lift`, `split`. When adding a structural action, update the union, metadata mapping, tests, and browser smoke expectations together.
- EditorPanel hydration echo guards must compare real article ids and normalized Markdown strings. Do not use untyped flags or localStorage sentinels to distinguish local persistence echoes from external content changes.

## SmartPunctuation Types

- Smart punctuation rule metadata must be centralized in `src/services/smart-punctuation.ts`; Settings, SettingsView, tests, and the TipTap extension should consume the same `SmartPunctuationRuleId`, `SmartPunctuationRuleDefinition`, and `SmartPunctuationRuleSettings` contracts.
- `editor.smartPunctuation` remains the master boolean, while `editor.smartPunctuationRules` is the typed per-rule matrix. Do not add ad-hoc string keys outside `SMART_PUNCTUATION_RULE_IDS`.
- `SmartPunctuation` ProseMirror code must use explicit `EditorState`, `Transaction`, `ResolvedPos`, and `EditorView` types. Do not introduce `any` for editor state, mark, node, or dispatch payloads.
- Smart punctuation transaction metadata is the stable test/diagnostic boundary: `SMART_PUNCTUATION_META` stores the rule id and `undoGroup` stores `smart-punct`.
- Settings migrations must normalize missing or partial smart-punctuation rule payloads through `normalizeSmartPunctuationRuleSettings()` rather than trusting imported JSON.

## TableV2 Types

- TableV2 alignment must use the exported `ColumnAlign` union from `src/extensions/TableV2/types.ts`: `left`, `center`, `right`, or `null`. Do not introduce free-form alignment strings.
- TableV2 command helpers must use explicit ProseMirror types: `EditorState`, `Transaction`, `TextSelection`, `FindNodeResult`, `TableMap`, and `ProseMirrorNode`.
- `createSetColumnAlignTransaction()` returns `null` outside tables; callers must branch on null and must not assert that a table exists.
- Cell/header alignment parsing must normalize unknown DOM values to `null` and render no inline style for default alignment.
- GFM table parser/serializer payloads must use `PipeTable` and `SerializePipeTableOptions`; do not pass any-shaped rows or unvalidated delimiter strings through the table utility boundary.

## ImageV2 Types

- ImageV2 attrs must use the exported contracts from `src/extensions/ImageV2/types.ts`: `ImageAlign`, `ImageV2Attrs`, `MarkdownImage`, and `SerializeMarkdownImageOptions`.
- `ImageAlign` is the narrow union `left | center | right | float-left | float-right`. All DOM, Markdown, and editor attrs must pass through `normalizeImageAlign()` before persistence or rendering.
- `ImageAttributeValue` is the only accepted generic render-attribute value type for image attrs. Do not introduce `any` or free-form records when rendering `data-asset-id`, `data-natural-width`, `data-natural-height`, `data-align`, `data-caption`, or `data-link`.
- `InsertedImageAsset` must carry optional `naturalWidth`, `naturalHeight`, and `link` fields in addition to the stable `assetId/src/alt/title/width/height` payload so button, paste, drop, and replace flows share one typed boundary.
- `normalizeImageLink()` is the boundary for image link attrs and Markdown linked-image serialization. Only `http:`, `https:`, `mailto:`, and browser-resolvable relative links are allowed; active content protocols must become `null`.
- Manual Vue NodeView compatibility in `EditorPanel.vue` must stay typed through a narrow `ManualVueNodeViewEditor` intersection instead of any-shaped editor mutation.


## CustomCSS Types

- CustomCSS settings must use the exported contracts from `src/services/custom-css/types.ts`: `CustomCssSettings`, `CustomCssIssue`, `CustomCssSandboxResult`, `CustomCssErrorLogEntry`, `CustomCssSuspendedReason`, and `CustomCssSnippet`.
- `advanced.customCss` is the persisted runtime branch. Its canonical fields are `enabled`, `draft`, `published`, `confirmedAt`, `suspendedReason`, `lastAppliedAt`, and `errorLog`; do not store compiled scoped CSS in settings.
- `settings.export.customCss` remains the export-only branch. Do not reuse it as the runtime CustomCSS source and do not migrate it into `advanced.customCss` without an explicit import flow.
- CSS storage limits are executable contracts: source CSS is capped by `CUSTOM_CSS_MAX_LENGTH`, rule count by `CUSTOM_CSS_MAX_RULES`, data images by `CUSTOM_CSS_MAX_DATA_IMAGE_BYTES`, and recent error logs by the Settings Zod schema limit.
- Sandbox and runtime functions must return typed status/results instead of throwing across UI boundaries. UI callers should surface `CustomCssIssue` diagnostics and preserve the previous successful style on parse or sandbox rejection.
- Suspension reasons must remain a narrow union from `CUSTOM_CSS_SUSPENDED_REASONS`; adding a new reason requires updating settings schema, runtime handling, UI status text, and tests together.
- Do not introduce `any` or free-form records for CSS diagnostics, runtime results, import/export payloads, or browser smoke evidence. Use typed helpers such as `sandboxCustomCss()`, `applyCustomCssRuntime()`, `appendCustomCssErrorLog()`, and `shouldSuspendForCustomCssErrors()`.

## TauriUpdater Types

- Updater service and store code must consume the exported contracts from `src/services/updater/types.ts`: `UpdateInfo`, `UpdaterSettings`, `UpdaterCheckResult`, `UpdaterStatus`, `UpdaterDisabledReason`, `SkippedVersionRecord`, `UpdaterAdapter`, and `UpdaterSkipStore`.
- Check sources are limited to `startup | interval | resume | manual`. Adding another source requires updating `UPDATER_CHECK_SOURCE_VALUES`, service logging, audit payloads, tests, and browser smoke expectations together.
- Disabled reasons are limited to `user-setting | enterprise-policy | env | offline | runtime-unavailable | build-config`. UI code must surface these typed reasons instead of comparing free-form messages.
- The Tauri adapter result is a narrow union: `available | none | unavailable | signature-failed | failed`. UI and store callers must branch on the union and must not throw raw adapter errors into components.
- `advanced.updater` in Settings is the persisted status branch. It stores user auto-check preference, check timestamps, latest known update, disabled reason, last error, and notification de-dupe versions; skip records belong in `updaterSkipped`, not inside Settings.
- Release notes must remain plain markdown at the service boundary and rendered HTML only after `renderReleaseNotesMarkdown()`. Components must not assign unsanitized adapter `body` / `notes` directly into the DOM.
- Do not introduce `any` or free-form records for updater policy input, adapter payloads, skip records, audit payloads, or browser smoke evidence. Use explicit structural adapters and typed fallback storage helpers.

## CitationBaseline Types

- Citation services must consume the exported contracts from `src/services/citation/types.ts`: `BibEntry`, `CitationCluster`, `CitationReference`, `CitationStyleId`, `FormattedCitation`, `FormattedBibliographyEntry`, `FootnoteDefinition`, `FootnoteRenderState`, and repository result types.
- Unresolved citations are explicit typed outcomes. Do not represent them as fake `BibEntry` objects, fake bibliography rows, or free-form display strings without `unresolvedKeys` evidence.
- `CitationRepository` file access must cross a typed loader boundary. Web/runtime-unavailable failures must return typed unavailable/read errors instead of throwing raw adapter errors into renderer or component code.
- DOM serialization must use typed `HTMLElement` guards before reading `dataset`, `classList`, or `tagName`. Do not introduce `any` casts for ProseMirror, DOMParser, citation marks, or footnote list items.
- Platform degradation helpers must return strings produced from parsed citation/footnote structures, not regex-only lossy payloads that bypass parser validation.
- Do not introduce `any` or free-form records for BibTeX parser output, citation formatter payloads, Markdown renderer options, sanitizer allow-list additions, export degradation evidence, or browser smoke evidence.
