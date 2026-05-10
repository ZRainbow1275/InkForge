# P1 Wiki Link Baseline PRD

## Source Of Truth
- Primary spec: `prompts/0420/specs/36-wiki-link-spec.md`.
- Related specs: `10-markdown-authority-spec.md`, `12-file-manager-spec.md`, `34-layout-persistence-spec.md`, `39-sync-scroll-spec.md`.
- Current project constraints: no mock/demo wiki data, no Emoji icons, no removal of current editor/preview/export behaviors, additive schema migration only.

## Baseline Goal
Deliver a real local-first WikiLink vertical slice for `[[Article Title]]`, `[[Article Title|Alias]]`, and `[[Article Title#Anchor|Alias]]` that preserves Markdown source while indexing backlinks in IndexedDB and exposing typed service/store APIs.

## In Scope
- Add an additive Dexie v17 `backlinks` table and typed `BacklinkRecord` model.
- Add a pure WikiLink parser/extractor that ignores fenced code and inline code, supports target/anchor/alias, computes context snippets, and rejects empty/nested invalid tokens.
- Add repository/service APIs for rebuilding backlinks for one article, rebuilding all backlinks, title search, resolved/broken link detection, delete cleanup, and backlinks query.
- Add Pinia `useWikiLinkStore` with loading/error/current backlink state and service-backed actions.
- Hook `useArticleStore` create/update/delete paths so real article lifecycle updates the backlink index.
- Reuse the existing Markdown extension renderer to render `[[...]]` syntax as `.ink-wikilink` anchors with target/anchor metadata, no Emoji icons, and no fake target documents.
- Add unit tests covering parser, repository/service/store behavior, migration/index rows, broken links, title rename re-resolution, deletion cleanup, and renderer compatibility.
- Run real typecheck/lint/tests/build and a browser IndexedDB smoke.

## Out Of Scope For This Baseline
- Full TipTap atom NodeView and suggestion popup UI.
- Broken-link create confirmation modal.
- Graph view and backlinks side panel UI.
- Anchor scroll positioning beyond storing anchor metadata.
- Large-vault worker indexing and 50k article benchmarks.

## Acceptance Criteria
- Markdown authority remains `[[...]]`; saving/indexing must not rewrite article body.
- Backlinks are derived local indexes and must be safe to rebuild; sync providers must not treat them as authoritative content.
- A source article linking to an existing target article creates a resolved backlink row with target article id.
- A source article linking to a missing target title creates a broken/unresolved row with preserved target title and context.
- Renaming/creating target articles can rebuild affected rows and resolve previously broken links by title.
- Deleting/trashing an article removes backlinks where it is the source or target.
- Search suggestions use real articles from repository state, no seeded rows.
- Tests and browser smoke must use real service logic; no mock product behavior.
