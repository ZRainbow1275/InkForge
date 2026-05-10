# Snippet System Research Notes

## External Current Practice Check
- Grok Search query: `Implementation best practices editor snippet system variables tab stops local-first Markdown`.
- Current-practice findings: use VS Code/TextMate style snippet records (`prefix`, `body`, `description`, optional scope), support numbered tab stops and placeholders, resolve date/time/UUID/clipboard/editor-state variables locally, keep parsing lightweight, and store snippets in local files or local databases for offline/privacy.
- Applied to InkForge: baseline stores snippets in IndexedDB, normalizes VS Code snippet JSON on import, implements `$1`/`${1:default}`/`$0` plus built-ins, and avoids cloud dependencies.

## Library / API Check
- Context7 checked Tiptap docs for `editor.commands.insertContent`, custom extensions, keyboard shortcuts, `deleteRange`, and `setTextSelection` style command flows.
- Applied to InkForge: implement a small TipTap extension around Tab key handling and existing `EditorPanel` extension list instead of replacing the editor or slash-command system.

## Local Architecture Findings
- `EditorPanel.vue` creates the TipTap `Editor` directly and already configures existing extensions such as `KeyboardShortcuts`, `SlashCommands`, `TyporaMode`, asset handling, and Markdown authority projection.
- `SlashCommands.ts` owns slash menu behavior and should not be refactored in this baseline.
- `src/services/command/*` and `types/command-palette.ts` already implement the command palette. Per-snippet command registration is deferred to avoid broad registry churn.
- Dexie schema currently reaches v17 after WikiLink; snippets should use v18 additively.

## Baseline Design Decisions
- Data: `SnippetRecord` in `services/snippet/types.ts`; table added to `utils/db.ts` as v18.
- Parser/resolver: pure functions in `services/snippet/resolver.ts` and `matcher.ts` so tests can verify behavior without editor runtime.
- Service/store: `SnippetService` composes repository, resolver, scope filter, import/export, and usage accounting; `useSnippetStore` wraps state for future UI.
- Editor integration: `SnippetExpansion` extension receives store snapshots and async expand callbacks from `EditorPanel`; Tab expansion only activates when a matching trigger is immediately before the cursor.
