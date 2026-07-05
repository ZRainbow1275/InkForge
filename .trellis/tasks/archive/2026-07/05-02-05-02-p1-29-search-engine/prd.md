# P1 Search Engine Baseline PRD

## Source Of Truth

- Primary spec: prompts/0420/specs/29-search-engine-spec.md
- Dependency specs: prompts/0420/specs/11-document-lifecycle-spec.md, prompts/0420/specs/12-file-manager-spec.md, prompts/0420/specs/22-command-palette-spec.md, prompts/0420/specs/27-performance-slo-spec.md, prompts/0420/specs/47-tag-system-spec.md
- Current implementation boundary: InkForge is a local-first Vue/Pinia/Dexie app under inkforge/.

## Goal

Deliver a real local-first SearchEngine baseline for InkForge documents. This slice must replace ad hoc title-only filtering with a reusable service and store that can index real article data from the existing repository, parse useful query syntax, return ranked excerpts with highlight ranges, persist recent searches, and expose a clean API for future Global Search UI, SmartFolder, and CommandPalette integration.

## Non-Negotiables

- No mock data, no fake search success, no placeholder search rows.
- Search results must come from real Article records supplied by the repository or caller.
- Do not delete or break existing Hub/FileManager/Drafts local filters.
- Do not introduce Emoji glyphs; iconography remains an existing UI concern.
- Keep implementation local-first and browser-compatible.
- Do not claim Web Worker or full Ctrl+Shift+F UI completion unless implemented and verified.

## Baseline Scope

1. Add a typed SearchEngine service around MiniSearch.
2. Build indexed documents from real Article records.
3. Support CJK tokenization, markdown/html stripping, title/content/tag/source/status fields, relevance sorting, updatedAt/title sorting, pagination, and archived inclusion control.
4. Support DSL filters for tag, status, author, source, created/updated dates, wordCount comparisons, exact phrases, boolean root operator, and negated terms.
5. Generate contextual excerpts and highlight ranges from real text.
6. Add a Pinia search store with rebuild, search, indexArticle, removeArticle, clear, and persisted history actions.
7. Add real unit tests covering indexing, DSL parsing, filters, phrase search, CJK search, history persistence, and incremental updates.
8. Update docs/spec ledgers with exact completed and pending boundaries.

## Out Of Scope For This Slice

- Full GlobalSearchView UI and Ctrl+Shift+F modal.
- ProseMirror local Find/Replace decorations.
- Web Worker indexing.
- SmartFolder UI migration.
- CommandPalette UI result rendering for document search.
- Searching comments/templates/export logs/version bundles/assets beyond Article fields.

## Acceptance Criteria

- Search service can index real Article-like data and return ranked SearchResult objects with id, score, title, path, excerpt, highlights, status, updatedAt, wordCount, tags, and archived flag.
- Query parser handles free terms, quoted phrases, negation, OR marker, and field filters without throwing on malformed user input.
- Store history persists through the provided storage boundary and caps at 10 recent entries.
- Incremental replace/remove updates change future search results without rebuilding everything.
- Empty query returns an empty result set rather than pretending all documents match.
- Unsupported or malformed filters are ignored safely and do not crash search.
- Targeted Vitest, full Vitest, type-check, lint, Trellis validation, and touched-file scan pass.
