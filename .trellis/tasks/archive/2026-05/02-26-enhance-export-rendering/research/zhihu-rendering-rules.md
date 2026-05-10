# Research: zhihu-rendering-rules

- Query: 知乎文章 Markdown、LaTeX、代码块、表格、HTML 兼容与发布最佳实践。
- Scope: Zhihu native Markdown export and service-layer validation.
- Date: 2026-05-11

## External Findings

- Zhihu article workflows still favor local Markdown authoring plus platform-specific conversion/publishing tools for complex content.
- Standard Markdown headings, lists, links, images, code fences, and tables are broadly usable, but the web editor may require manual adjustment for complex tables or embedded content.
- Code fences should specify a language to preserve syntax highlighting.
- LaTeX should either remain valid `$...$` / `$$...$$` source when the target path preserves formulas, or be converted to a deterministic image/equation placeholder for copy/publish workflows that need rendered equations.
- Complex diagrams such as Mermaid should not leak raw Mermaid source into native output unless explicitly desired; converting to an image hint/placeholding strategy is safer.
- Simple Markdown tables are acceptable; complex tables with nested Markdown or merged cells should be converted or downgraded.

## Repo Mapping

- `inkforge/src/services/export/zhihu-markdown.ts` contains the clean native Markdown output path.
- `inkforge/src/services/export/platform-rules/zhihu.ts` contains deterministic platform transforms:
  - `convertLatexToEquationImg`,
  - `tableToHtmlTable`,
  - `coerceCodeLanguage`,
  - `zhihuMarkdownRulesTransform`.
- `inkforge/src/services/export/zhihu.ts` is an HTML/themed renderer and should not be confused with native Markdown export.
- `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` is preview-fidelity only and must not be counted as live publishing ability.
- `inkforge/src/services/export/quality-detector.ts` should validate Mermaid, unsupported HTML, formula balance, code-fence languages, and table behavior against the real native output.

## Implementation Implications

- Treat `markdownToZhihuClean()` and `convertToNativeFormat(..., 'zhihu')` as the real native export path.
- Ensure options are explicit:
  - preserve LaTeX source when requested,
  - convert LaTeX to deterministic equation placeholders when requested,
  - coerce missing code languages by default,
  - use documented table behavior by default.
- Add/keep tests proving:
  - no unresolved internal placeholders leak,
  - code fences without a language get a default language,
  - code fences with a language remain unchanged,
  - LaTeX inside code fences is protected,
  - inline/block formulas follow the selected mode,
  - tables follow configured behavior,
  - Mermaid/task-list/GFM extensions degrade predictably.

## Sources

- Grok-search result for `知乎 文章 Markdown LaTeX 代码块 表格 编辑器 兼容 最佳实践 2026`, session `9d534babb4ac`.
- Representative URLs returned by the search:
  - https://github.com/niudai/VSCode-Zhihu
  - https://zhuanlan.zhihu.com/p/2026321956346033262
  - https://juejin.cn/post/6909515388665462791

## Caveats

- Zhihu's exact editor internals are not a stable public API. This task should validate deterministic exported artifacts, not claim live editor rendering without browser/API proof.
- Real upload/publish integration is out of scope unless credentials and a live publishing path already exist in the repo.
