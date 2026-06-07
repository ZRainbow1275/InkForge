# Zhihu Markdown Rendering Rules Refresh

Date: 2026-05-12
Scope: Zhihu Markdown-compatible native export.

## Sources Checked

- Grok-search session `1ecb6f01e955`: "知乎文章 Markdown LaTeX 代码块 表格 HTML 兼容 发布工具 最佳实践 2026".
- Representative source links:
  - https://github.com/niudai/VSCode-Zhihu
  - https://marketplace.visualstudio.com/items?itemName=niudai.vscode-zhihu
  - https://blog.openacid.com/toolkit/md2zhihu/
  - https://www.zhishijingsai.com/2023/09/Markdown%E6%96%87%E7%AB%A0%E5%8F%91%E5%B8%83%E5%88%B0%E7%9F%A5%E4%B9%8E/
  - https://cloud.tencent.com/developer/article/2665113

## Practical Rules

- Final native artifact should remain Markdown-compatible instead of relying on complex HTML styling.
- Code fences should have a language where possible; missing language labels should be coerced deterministically.
- LaTeX should either remain valid `$...$` / `$$...$$` source in preserve mode, or be converted to deterministic equation placeholders when that mode is selected.
- Markdown tables are broadly usable; complex tables should be converted or downgraded deterministically according to configured behavior.
- Mermaid/diagram blocks should not leak raw source into final publishable output unless explicitly configured; image hints/placeholders are safer.
- HTML compatibility is limited and should not be a primary mechanism for native Zhihu output.

## Mapping To Inkforge

- `inkforge/src/services/export/zhihu-markdown.ts` is the real native Markdown output path.
- `inkforge/src/services/export/platform-rules/zhihu.ts` is the deterministic helper layer.
- `inkforge/src/services/export/zhihu.ts` is an HTML/themed renderer and must not be treated as native Markdown publishability.
- `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts` is preview-only.
- `inkforge/src/services/export/image-pipeline/uploaders/zhihu-stub.ts` is an explicit unsupported upload boundary.

## Acceptance Implications

- Assert missing code languages are filled without changing already explicit languages.
- Assert LaTeX inside code fences is protected.
- Assert formulas follow selected preserve/placeholder mode.
- Assert table handling is deterministic.
- Assert Mermaid/task/GFM extensions degrade predictably.

## Caveats

- Zhihu editor internals are not a stable public API. Inkforge should verify deterministic exported artifacts and avoid claiming real publish/editor rendering without an authenticated publishing path.
