# PRD: P1 Citation Baseline

## Purpose

Implement the `prompts/0420` Spec 56 citation baseline as a real, local-first Markdown capability. The work must preserve Inkforge's current Markdown-authority philosophy: Markdown remains the source of truth, rendered HTML is derived, and exporters must not write back into document state.

## Sources Of Truth

- `prompts/0420/specs/56-citation-spec.md`
- `prompts/0420/specs/01-spec-editor-typora.md`
- `prompts/0420/specs/10-markdown-authority-spec.md`
- `prompts/0420/specs/15-export-publish-spec.md`
- `prompts/0420/specs/16-markdown-extensions-spec.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/type-safety.md`

## Current Runtime Facts

- Preview rendering already enters `renderMarkdownWithOptionalEnhancements()` and `renderInkforgeMarkdownExtensions()`.
- Typora editor hydration currently uses `renderMarkdownToHtml()` from `src/extensions/TyporaMode.ts`; it must render citation HTML without making HTML the authority.
- HTML-to-Markdown serialization currently turns generic `<sup>` into superscript Markdown and would lose `[^id]` footnote syntax unless citation-specific HTML is handled first.
- `markdown-ext/registry.ts` already registers `inkforge.footnote` and `inkforge.citation`, but the citation entry currently describes legacy `{cite: id}`/source block behavior rather than Spec 56 academic `[@key]` behavior.
- Exporters already derive from Markdown and pass through the optional renderer for HTML paths; native text/Markdown paths need explicit platform degradation where they bypass HTML.

## In Scope

1. Footnote baseline:
   - Parse Pandoc/Typora-style `[^id]` references and `[^id]: definition` definitions.
   - Preserve Markdown source syntax through Source, Typora hydration, Preview, serialization, and export paths.
   - Number footnotes by first reference order, not definition order or identifier value.
   - Support repeated references to the same footnote with shared numbering and multiple back links.
   - Support indented multiline definitions without consuming non-indented body text.
   - Render missing definitions as explicit diagnostic HTML instead of inventing content.

2. Academic citation baseline:
   - Parse `[@key]`, `[@a; @b]`, `[@key, p. 42]`, and `[-@key]` clusters.
   - Provide a real local BibTeX parser for `@type{key, field = {value}}` and quoted values, including nested braces.
   - Provide deterministic CSL-style formatters for `apa`, `mla`, `chicago-author-date`, and `gb-t-7714-2015` without claiming full CSL processor compliance unless a real CSL processor dependency is added and wired.
   - Render unresolved citations honestly when no real BibTeX entry is available.
   - Generate bibliography HTML from used keys when real BibTeX entries are supplied to the renderer/service.

3. Export integration:
   - HTML/preview paths keep semantic footnote/citation HTML after sanitizer allow-list updates.
   - WeChat HTML degrades footnote/citation anchors into platform-safe inline/endnote structures through the existing sanitized HTML pipeline.
   - Xiaohongshu text export expands footnotes/citations into readable inline text instead of leaking raw control syntax.
   - Zhihu Markdown export preserves valid Markdown citation/footnote syntax where the target can handle it and removes only unsupported platform-specific HTML.

4. Quality/documentation:
   - Add targeted tests for parser, formatter, Markdown renderer, Typora serializer, and native export degradation.
   - Update Spec 56 and Trellis frontend specs with implementation truth and limitations.

## Out Of Scope

- Zotero or Mendeley integration.
- DOI, CrossRef, or any network lookup.
- EPUB footnotes.
- User-authored citation style editor.
- Fake signed updater/citation endpoints, fake `.bib` files, fake repository success states, or mock runtime data.

## Non-Mock Data Policy

Unit tests may use deterministic Markdown/BibTeX input strings as executable fixtures. Runtime behavior must not seed fake document rows, fake `.bib` file paths, fake remote lookups, or fake style processor responses. Missing real bibliography data must render as unresolved, not as fabricated author/year metadata.

## Acceptance Criteria

- `[^1]` and named footnotes render in Preview and Typora hydration as footnote references while serializing back to the original `[^id]`/`[^id]: content` syntax.
- Repeated footnote references share the same displayed number and the footnote definition renders multiple return links.
- Multiline footnote definitions survive parse/render/serialize round-trip.
- `[@smith2023]` and multi-key citation clusters parse into typed citation structures and render as unresolved if no real BibTeX entry exists.
- Real BibTeX content parsed by the local parser can format inline citations and bibliography entries for the four preset styles.
- Native Xiaohongshu export does not leak raw footnote definitions or unresolved citation control syntax into end-user copy.
- Sanitized preview/export HTML preserves only the needed safe citation/footnote attributes.
- Targeted tests, type-check, lint, full Vitest, and production build pass or any blocker is recorded with exact command/error evidence.

## Verification Plan

1. `python ./.trellis/scripts/task.py validate .trellis/tasks/05-03-p1-56-citation`
2. `pnpm -C inkforge exec vitest run src/services/citation/citation.test.ts src/services/markdown-ext/citation-render.test.ts src/extensions/TyporaMode.citation.test.ts src/services/export/citation-export.test.ts`
3. `pnpm -C inkforge exec vue-tsc --noEmit`
4. `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`
5. `pnpm -C inkforge vitest run`
6. `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
7. Browser smoke against a real local Workstation article when the dev server is available.
