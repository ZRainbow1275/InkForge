# TOC System Research Notes

## External Current Practice Check
- Grok Search query: `2026 Tiptap ProseMirror table of contents extension headings active scroll navigation best practices`.
- Current-practice findings: Tiptap now has an official TableOfContents extension that exposes anchor data, active/scrolled state, custom `getId`, `onUpdate`, and scroll-parent configuration.
- Applied to InkForge: do not add a new package in this baseline; mirror the stable parts locally with deterministic id generation, reactive state, and real TipTap document parsing.

## Library / API Check
- Context7 checked Tiptap docs for TableOfContents `onUpdate`, custom id generation, anchor data, active/scrolled state, and Vue reactive updates.
- Applied to InkForge: keep a pure parser/service boundary plus Pinia store so future adoption of official `@tiptap/extension-table-of-contents` can replace internals without changing UI state contracts.

## Local Architecture Findings
- `WorkstationView` already has manager tabs `files | versions | outline` and renders `OutlinePanel :editor="outlineEditor"`.
- `OutlinePanel` currently uses `useOutline` and lucide icons, not Emoji.
- `useOutline` currently extracts H2-H4 directly from TipTap docs and builds a nested tree locally.
- `markdown-ext/render.ts` already supports `[toc]` / `[toc depth=3 numbered=true]` and injects heading ids in preview output.

## Baseline Design Decisions
- Introduce `services/toc` as the shared parser/model/service layer rather than rewriting Workstation or replacing Markdown preview.
- Keep `OutlinePanel` component shape and Workstation tab integration stable.
- Preserve `[toc]` behavior; test it as renderer integration rather than replacing the whole markdown extension in the same slice.
- Defer drag reorder, inline atom macro, Settings controls, and export-pipeline TOC injection to avoid broad ProseMirror/schema/export churn.
