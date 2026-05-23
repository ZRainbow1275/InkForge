# WeChat Official Account Rendering Rules Refresh

Date: 2026-05-12
Scope: WeChat Official Account pasteable HTML export.

## Sources Checked

- Grok-search session `a78a2b319d59`: "微信公众号 Markdown 转 HTML 复制到公众号编辑器 CSS 内联 class style 图片宽度 公式 LaTeX 最佳实践 2026 doocs md wxmp".
- Representative source links:
  - https://github.com/doocs/md
  - https://md.doocs.org/
  - https://mapoet.github.io/posts/2025/11/md2wechat-intro
  - https://cloud.tencent.com/developer/article/1902464
  - https://cloud.tencent.com/developer/article/2113796

## Practical Rules

- Final artifact should be pasteable HTML, not raw Markdown.
- Styling must be inline on elements. Do not rely on `<style>` tags, external CSS, class selectors, CSS variables, JavaScript, or platform-preserved complex CSS.
- Code highlighting must be converted from token classes to inline styles before classes are stripped.
- External links should be converted to readable references/footnotes when the platform cannot preserve open third-party links reliably.
- Images need `max-width:100%` and `height:auto`; when the local exporter knows a hard pixel limit, it should enforce it in output rather than only warn.
- Formula rendering for WeChat cannot depend on KaTeX CSS/classes. Mainstream tools either render formulas to static images/SVG and upload/use stable image URLs, or degrade to readable text if a real image/material pipeline is unavailable.
- Mermaid/SVG/complex generated visuals should be static images or explicit readable fallbacks. A live material upload flow must not be claimed unless the repo has credentials/API contracts and verified upload behavior.

## Mapping To Inkforge

- `inkforge/src/services/export/wechat.ts` is the real pasteable HTML output path.
- `inkforge/src/services/export/platform-rules/wechat.ts` is the deterministic rule helper layer.
- `inkforge/src/services/export/quality-detector.ts` should report WeChat risks, but warnings alone are not enough for enforceable output constraints.
- `inkforge/src/services/export/image-pipeline/uploaders/wechat-stub.ts` is an explicit unsupported integration boundary, not real material-library upload.

## Acceptance Implications

- Keep final WeChat output free of `<style>`, `class=`, `javascript:`, unresolved `var(...)`, and unsupported paired tags.
- Assert formula output does not contain `katex`/`katex-html` class-dependent markup.
- Assert image width is clamped in final output.
- Assert missing upload integration throws a typed unsupported error, not fake success.

## Caveats

- I did not find a stable official public WeChat article-editor HTML/CSS whitelist that is complete enough to encode directly. The repo should therefore encode conservative, test-backed behavior based on observed platform practice and mainstream WeChat Markdown tooling.
