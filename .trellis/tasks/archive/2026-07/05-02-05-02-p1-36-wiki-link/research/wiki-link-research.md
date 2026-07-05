# Wiki Link Research Notes

## External Current Practice Check
- Grok Search query: `Markdown wiki links backlinks local-first note app implementation best practices parser broken links indexing`.
- Relevant findings: keep Markdown/plain text as source of truth; build a derived directed-link index for backlinks; incrementally rebuild on document changes; detect broken links during indexing; style unresolved links distinctly; prefer AST/Markdown-aware parsing over fragile global replacement, but a bounded parser is acceptable for a baseline if it skips code fences and inline code.
- Applied to InkForge: keep `[[...]]` in article content, add derived IndexedDB `backlinks`, and make the parser ignore fenced/inline code. Do not seed demo notes.

## Local Architecture Findings
- `renderInkforgeMarkdownExtensions()` already contains an unresolved WikiLink replacement hook and sanitizer allow-list already includes `data-wikilink-*` attributes.
- `ArticleStore` uses `articleRepository` for real create/update/delete and already tracks audit/sync. WikiLink indexing should be a side effect after repository writes, with errors logged but not allowed to corrupt saved articles.
- `ArticleRepositoryImpl` decrypts articles through repository methods, so the WikiLink service should read articles through `articleRepository`, not raw `db.articles`, except tests can stub table access.
- Dexie v16 is already used for `layoutStates`; Spec 36 requires a separate derived backlink index, so v17 is additive.

## Baseline Design Decisions
- Parser: pure TypeScript module in `services/wiki-link/parser.ts` with token and extraction utilities.
- Data: `BacklinkRecord` in `services/wiki-link/types.ts`; table added to `utils/db.ts` as v17.
- Service: `WikiLinkService` composes article repository and backlink repository; singleton export keeps ArticleStore hooks simple.
- Store: `stores/wikiLink.ts` wraps service state for future UI panels.
- Rendering: reuse parser in markdown extension render path so syntax support is centralized.
