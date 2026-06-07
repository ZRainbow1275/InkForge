# doocs/md Format Insert Style Reference - 2026-05-16

## Scope

This note records the capability model borrowed from `doocs/md` for the current
Inkforge WeChat rendering slice. It is not a source-code copy plan.

## Current Reference

Public project:

- GitHub: `https://github.com/doocs/md`
- Online editor: `https://md.doocs.org/`

DeepWiki review of `doocs/md` on 2026-05-16 maps the editor header into three
useful product groups:

- Format: bold, italic, strikethrough, link, inline code, heading/list controls,
  external-link-to-citation, word count and reading time.
- Insert/Edit: image upload, table insertion, copy and paste workflows.
- Style: theme, font family, font size, primary color, code block theme, image
  caption format, custom color/CSS, Mac code block mode, reset.

## Inkforge Mapping

Inkforge already has part of the Format and Insert surface in the editor:

- `FloatingToolbar.vue` covers bold, italic, underline, strikethrough, inline
  code, headings, blockquote, lists, alignment, link, code block, horizontal
  rule, table, highlight, text color, superscript and subscript.
- `EditorPanel.vue` already owns the real image asset upload path through
  `requestImageFileInsert()` and the Asset Pipeline.

The missing piece for this slice is the WeChat export Style surface:

- Font family override.
- Font size override.
- Primary color swatches.
- Code theme and Mac code block controls grouped as visual styling rather than
  a generic technical option block.
- Format options separated from visual style options.

## This Slice

Implemented as a narrow, verifiable slice:

- Add typed WeChat style controls to `ExportOptions`.
- Apply those controls inside `convertToWechatWithStats()` by cloning the
  selected preset and never mutating global presets.
- Polish the baseline WeChat CSS so headings, blockquotes, images, figures,
  tables, and code blocks render with stronger visual hierarchy.
- Add a real image insert button to the existing editor floating toolbar, wired
  to the existing Asset Pipeline image insertion function.
- Keep backend-only WeChat components such as mini-program cards, voting,
  video account cards, and official-account cards out of fake HTML generation.

## Deferred

- A full doocs/md-style fixed editor header with dropdown menus.
- Custom CSS editing inside ExportModal. Inkforge already has separate custom
  CSS surfaces; merging them into the WeChat exporter requires a separate
  sandbox and UX pass.
- Automatic insertion of WeChat backend-native components. These remain publish
  checklist items unless WeChat exposes a stable API contract for them.
