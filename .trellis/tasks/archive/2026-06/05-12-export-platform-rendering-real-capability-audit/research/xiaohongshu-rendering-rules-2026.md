# Xiaohongshu Native Text Rendering Rules Refresh

Date: 2026-05-12
Scope: Xiaohongshu publishable plain text export.

## Sources Checked

- Grok-search session `3eb023bb791d`: "小红书笔记 发布 标题字数 话题标签 数量 图片比例 3:4 Markdown 转纯文本 排版 最佳实践 2026".
- Representative source links:
  - https://huasheng.ai/insights/xiaohongshu-best-practices/
  - https://www.seoforchina.com/platforms/xiaohongshu-seo/
  - https://github.com/NowhereMan-in-Galaxy/xiaohongshu-text-layout
  - https://focalflow.app/blog/xiaohongshu-image-guide-2026/
  - https://appinchina.co/blog/the-complete-guide-to-rednote-xiaohongshu-marketing-in-china/

## Practical Rules

- Final publishable artifact should be plain text, not HTML and not raw Markdown.
- Short, scannable titles are preferred. A 20-character service split is conservative and compatible with existing repo rules.
- Hashtags should be relevant and limited. A default of 3-6 tags is safer than unlimited tag injection; excessive unrelated tags should be treated as a quality issue.
- Image guidance should prefer vertical 3:4 assets, commonly 1080x1440, with 1:1 acceptable in some cases but not the default guidance.
- Paragraphs should be short and easy to scan. Markdown headings/lists/code/tables/formulas/citations should downgrade to readable plain text.
- Decorative markers can help scanning, but high density should be validated to avoid spam-like output.

## Mapping To Inkforge

- `inkforge/src/services/export/xiaohongshu-text.ts` is the real native text output path.
- `inkforge/src/services/export/platform-rules/xiaohongshu.ts` is the deterministic helper layer.
- `inkforge/src/services/export/xiaohongshu.ts` is a themed HTML renderer and must not be counted as the native Xiaohongshu artifact.
- `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` is preview-only by name and behavior.
- `inkforge/src/services/export/image-pipeline/uploaders/xhs-stub.ts` is an explicit unsupported upload boundary.

## Acceptance Implications

- Assert native output has no raw HTML tags.
- Assert native output does not leak Markdown heading/table/bold syntax as the publishable artifact.
- Assert title/body split and hashtag limits are deterministic.
- Assert image hints include 3:4 guidance.
- Assert complex blocks degrade to readable plain text.

## Caveats

- Public Xiaohongshu guidance is heavily SEO/creator-practice oriented rather than a precise developer API contract. Inkforge should encode conservative output rules and avoid claiming live-platform validation without a real API/browser publishing path.
