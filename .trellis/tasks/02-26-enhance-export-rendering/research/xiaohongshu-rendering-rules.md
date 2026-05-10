# Research: xiaohongshu-rendering-rules

- Query: 小红书笔记发布、标题、话题标签、图片比例、Markdown 转文本、平台友好排版。
- Scope: Xiaohongshu native text export and service-layer validation.
- Date: 2026-05-11

## External Findings

- 2026-era public guidance consistently treats Xiaohongshu publishing as text-first plus image-first, not HTML-first.
- Titles should stay short. The practical product limit for this task remains 20 characters, with 10-18 characters preferred and 25 characters as an outer editorial warning rather than the service default.
- Hashtags should be limited and relevant. A service default of 3-6 tags is safer than unlimited tag injection; overusing unrelated tags is a quality defect.
- Image guidance should prefer a vertical 3:4 composition. Common recommended sizes are 1080x1440 or similar 3:4 assets, with 1:1 acceptable for some multi-image/product cases.
- Markdown syntax should not leak to final native text. Headings, lists, links, tables, code blocks, images, LaTeX, footnotes, and citations need readable text downgrades.
- Output should keep paragraphs short, with the opening lines carrying the value proposition.
- Emoji can improve scanning, but high emoji/decorative-marker density reads as spam and should be validated.

## Repo Mapping

- `inkforge/src/services/export/xiaohongshu-text.ts` already contains a native text engine with:
  - heading/list/link/table/code/image/LaTeX conversions,
  - title/body split,
  - emoji style presets,
  - hashtag collection,
  - paragraph splitting,
  - image hints,
  - over-limit detection.
- `inkforge/src/services/export/platform-rules/xiaohongshu.ts` already contains deterministic helpers for:
  - `splitTitleAndBody`,
  - `tightenParagraphs`,
  - `appendHashtagsToBody`,
  - `composeHashtagMix`,
  - `buildImagePlaceholder`,
  - `xhsTextRulesTransform`.
- `inkforge/src/services/export/quality-detector.ts` contains Xiaohongshu checks, but the audit must verify whether all checks match the native text engine and whether decorative/emoji density is enforced on real output.
- `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` is preview-fidelity only. It can help local preview but must not count as real publishing ability.
- `inkforge/src/services/export/image-pipeline/uploaders/xiaohongshu-stub.ts` is a platform upload stub if present; it must not be counted as real capability.

## Implementation Implications

- Treat `markdownToXiaohongshuText()` and `convertToNativeFormat(..., 'xiaohongshu')` as the real service output.
- Treat HTML-oriented `convertToXiaohongshu()` as a preview/theme renderer unless product docs explicitly say otherwise.
- Add/keep tests proving native output:
  - has no raw HTML tags,
  - has no raw Markdown heading/bold/table syntax leakage,
  - splits title at 20 characters while preserving overflow in body,
  - caps/normalizes hashtags,
  - emits 3:4 image hints,
  - degrades tables/code/links/formulas/citations into readable plain text,
  - flags or reduces excessive decorative markers.

## Sources

- Grok-search result for `小红书 笔记 发布 标题 字数 话题标签 图片比例 Markdown 转文本 最佳实践 2026`, session `62ff1eb863d0`.
- Representative URLs returned by the search:
  - https://zhuanlan.zhihu.com/p/1991105890716247188
  - https://www.qcuremarketing.com/post/%E5%B0%8F%E7%B4%85%E6%9B%B8%E7%87%9F%E9%81%8B2026-xiaohongshu-guide
  - https://help.reditorapp.com/guide/advanced/markdown/intro.html
  - https://github.com/NowhereMan-in-Galaxy/xiaohongshu-text-layout

## Caveats

- Xiaohongshu official limits can be difficult to verify from a single public developer document; for this task, tests should encode conservative product rules rather than claim live-platform API validation.
- Real image upload/publishing is out of scope unless credentials and real API endpoints exist in the repo.
