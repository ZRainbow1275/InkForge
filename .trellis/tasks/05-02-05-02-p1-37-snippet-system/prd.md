# P1 Snippet System Baseline PRD

## Source Of Truth
- Primary spec: `prompts/0420/specs/37-snippet-system-spec.md`.
- Related specs: `22-command-palette-spec.md`, `03-keyboard-shortcuts-spec.md`, `10-markdown-authority-spec.md`, and existing editor/slash-command implementation.
- Current project constraints: no mock/demo snippets, no Emoji icons, no removal of current editor, slash-command, command-palette, shortcut, or Markdown authority behavior.

## Baseline Goal
Deliver a real local-first Snippet vertical slice that persists user-defined snippets in IndexedDB, expands text snippets through the existing TipTap editor on an explicit trigger plus Tab, resolves built-in variables and tab-stop placeholders, exposes typed repository/service/store APIs, and can be verified without seeded product data.

## In Scope
- Add an additive Dexie v18 `snippets` table and typed `SnippetRecord` model.
- Add snippet parsing/resolution utilities for VS Code/TextMate compatible bodies: `$1`, `$0`, `${1:placeholder}`, `$DATE`, `$TIME`, `$DATETIME`, `$UUID`, `$CLIPBOARD`, `$TITLE`, `$AUTHOR`, and `$SELECTED_TEXT`.
- Add trigger matching with case-sensitive and case-insensitive behavior and word-boundary protection.
- Add repository/service APIs for create, update, delete, list, search, scope filtering, usage accounting, InkForge JSON export/import, and VS Code snippet import normalization.
- Add Pinia `useSnippetStore` with real loading/error/search/expand/create/update/delete/import/export state.
- Add a TipTap extension that uses the real store snapshot to expand a text snippet when the cursor is after a matching trigger and the user presses Tab.
- Integrate the extension into `EditorPanel` without changing existing slash-command, toolbar, source-mode, autosave, or preview behavior.
- Add unit tests covering schemas, resolver, matcher, repository/service/store behavior, import/export, and extension expansion behavior where practical.
- Run real typecheck/lint/tests/build and browser IndexedDB smoke.

## Out Of Scope For This Baseline
- Full Settings Snippet manager UI.
- Slash-command menu UI injection for block snippets.
- Command palette dynamic per-snippet command registration.
- Full interactive mirrored tab-stop session navigation after insertion.
- Conflict resolution modal for import collisions.
- Multi-cursor support, transformation syntax, and 50k snippet benchmark.

## Acceptance Criteria
- No snippets are seeded for product UI; empty storage means empty snippet list.
- Snippet records are durable local-first rows in IndexedDB and safe to export/import.
- Text snippets expand only when a real persisted text snippet trigger matches the cursor prefix and Tab is pressed.
- Trigger matching respects `triggerCaseSensitive` and does not hijack normal Tab behavior without a clear trigger.
- Markdown source remains user-authored content; snippet expansion inserts resolved content but does not rewrite unrelated article state.
- Built-in variables resolve from real runtime context or explicit empty fallback; UUID uses real browser/crypto UUID generation.
- Usage count and `lastUsedAt` update only after a real expansion or explicit usage recording.
- Tests and browser smoke must use real service/store logic; no mock product behavior or fake snippet rows in app startup.
