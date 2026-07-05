# P1 Markdown Extensions Baseline

## Scope

Implement the `prompts/0420/specs/16-markdown-extensions-spec.md` compatible baseline without rewriting the editor architecture or deleting existing behavior.

This baseline is intentionally a rendering/export vertical slice:

- Preserve Markdown as the authority source. Extension rendering is derived output only and must not rewrite article content or IndexedDB records.
- Register the implemented extension contracts under `src/services/markdown-ext/registry.ts`.
- Feed the existing preview/export path through one shared extension transform so Workstation Preview and ExportModal stay consistent.
- Keep all platform-specific publishing claims honest. This task does not add fake direct-publish APIs.
- Respect the project-wide no-Emoji-icon rule. The Emoji shortcode extension renders safe shortcode text, not real Unicode emoji glyphs.

## Baseline Features

- Footnotes: parse `[^id]` references and `[^id]: content` definitions, render references and an endnotes section, preserve source Markdown.
- Highlight: parse `==text==` and `==color:<name|hex> text==`, render safe `mark` nodes with whitelisted color classes or sanitized custom hex metadata.
- TOC macro: parse one `[toc]` line with optional `depth` and `numbered`, collect document headings, inject heading ids, and render a nav tree.
- Details: support native `<details>` pass-through and `:::details Summary ... :::` container rendering.
- Emoji shortcode: parse known `:name:` shortcodes into safe text badges while leaving unknown names untouched.
- Wikilink: parse `[[title]]`, `[[title|alias]]`, and `[[title#heading]]` into unresolved internal-link anchors with data metadata, without pretending target documents exist.
- Citation: parse inline `{cite: id}` and blockquote source metadata into explicit unresolved citation/source markup.
- Math and Mermaid keep using the existing optional renderer path.

## Non-goals

- No new TipTap NodeViews, command registry mutations, slash command additions, FormulaBuilderPanel, backlink index, citation source manager, export log table, or platform publish APIs in this baseline.
- No fake resolved Wikilinks or citation sources. Resolution requires real article/frontmatter indexes and is outside this baseline.
- No mock data and no seeded demo documents.

## Verification Plan

- Run `pnpm exec vue-tsc --noEmit`.
- Run `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`.
- Run `pnpm build`.
- Start Vite on `127.0.0.1:5176`, create a real temporary article through the real Pinia store/IndexedDB path, verify Workstation preview and ExportModal output, then delete the article.
- Scan touched code/docs for literal Emoji pictographs and escaped quote pollution.

## Completion Boundary

This task may be marked completed only after code, verification evidence, task metadata, this PRD, the Spec 16 note, and `prompts/0420/acceptance-matrix.md` are updated to reflect the actual baseline. Full Spec 16 remains broader than this baseline and must not be falsely marked as fully complete.
