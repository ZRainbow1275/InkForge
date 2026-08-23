# Platform Rendering Rules Refresh — 2026-07

## Evidence hierarchy

Use sources in this order when rules conflict:

1. Current official platform documentation or an official validation/API response.
2. Readback from a real current editor after the element/artifact has actually been applied.
3. Primary source code and documentation for a maintained platform client/converter.
4. Market-editor observation used only as design taxonomy.
5. Third-party advice used only as a hypothesis until independently verified.

Search snippets, marketing claims, and “algorithm boost” folklore are not platform contracts.

## WeChat Official Account

### Current official evidence

Official editor plugin specification retrieved 2026-07-22:

- Provides `POST http://mp.weixin.qq.com/article-bin/verify_article_structure` for validating an article HTML structure. The runtime must treat an unavailable official validator as an external gate, not silently pass it.
- Prohibits an invisible `img` (`opacity:0`) hidden beneath an SVG/background-image composition because the real image can no longer be edited in the official editor.
- Rejects transparent caret styling, text containers with `line-height:0`, fixed-width/fixed-height content containers, `text-align:start/end`, and ordinary prose inside `pre`.
- Interactive SVG that uses only `begin="touchstart"` fails on PC. A candidate must cover both triggers (`begin="touchstart; click"`) and still needs real PC/mobile proof.
- The same HTML tag must not nest more than 15 levels. `span[leaf]` cannot contain block nodes, and `section[nodeleaf]` accepts only the official allowed component/image shape.
- Recommends the official default font stack instead of custom `font-family` values because custom fonts break editor/reader consistency.
- Dark Mode guidance requires moderate contrast and correct DOM nesting; gradients behind text may be flattened or changed. SVG is not automatically recolored, so use explicit contrast/background or `stroke="currentColor"` / `fill="currentColor"` where semantically valid.
- `data-no-dark` applies only to the current node; inline-styled descendants are still processed.
- `!important` must not be used because it blocks platform public styles and Dark Mode overrides.

Official draft-add API retrieved 2026-07-22, page updated 2026-07-14:

- Draft creation is a credentialed server-side operation, not a frontend action.
- Title is at most 32 characters, author 16, digest 120.
- Content accepts HTML, strips JavaScript, and states fewer than 20,000 characters / under 1 MB. The same current field description also contains a contradictory “2kb” phrase; InkForge must not bake that phrase into a permanent client constant. Enforce the consistent documented limits, preflight bytes/chars, and surface the real API response.
- Body image URLs must come from the official article-image upload API; external image URLs are filtered.
- A normal article cover uses a permanent `thumb_media_id`; crop data supports 2.35:1 and 1:1. Cover acceptance is separate from body HTML acceptance.

### InkForge contract derived from official evidence

- Final WeChat body remains flow-based inline-style HTML with an explicitly validated source-owned SVG subset.
- Run local quality detection first; where configured, call the official structure validator as an external preflight and preserve its per-element failures.
- Do not encode a guessed exhaustive HTML/CSS/SVG whitelist. Official validation, exact artifact readback, PC paste, phone preview, Dark Mode, cover crop/thumbnail, and publish are independent gates.
- Market-editor SVG/H5 structures are taxonomy only. Rebuild them as InkForge-owned HTML/SVG/image manifests; never copy authoring DOM, private template geometry, membership assets, CDN dependencies, or credentials.

## Xiaohongshu

### Current official public evidence

The official Community Rules retrieved 2026-07-22 are dated 2021-12-17. They establish content and delivery constraints, not a technical editor whitelist:

- No title bait, image/text mismatch, false experience, excessive official marketing language, or unrelated product claims.
- No off-platform contact information, URL/QR-code/watermark diversion.
- No batch, high-frequency, machine-mode publishing or scripts that simulate engagement.
- Copyright and other third-party rights must be respected.

The public creator publish URL exposes only an authentication shell without logged-in editor details. No stable official public page was found that defines title length, image count, image dimensions, file-size limits, or an HTML/CSS/SVG body whitelist for the current creator editor.

### InkForge contract

- XHS output is platform-native plain text plus raster image pages/cover/long image. It is not HTML, inline CSS, raw Markdown, or inline SVG.
- SVG/H5/complex rich cards must be rasterized into real PNG/JPEG artifacts before XHS export.
- Image count, ratio, dimensions, format, and byte ceilings are configurable market defaults and preflight values, not permanent “official” facts. The UI must display their source/status.
- The export manifest must prove page order, dimensions, bytes, file existence, and text/body references. It does not prove authenticated upload or publication.
- The user will perform XHS editor/upload/publish acceptance manually; InkForge must provide an exact artifact folder and checklist without reporting success itself.

## Zhihu

### Official public evidence

The official Creator Manual retrieved 2026-07-22 distinguishes answers, articles/columns, thoughts, and video. It recommends content that is substantial, opinionated, trustworthy, and reader-oriented; specifically, clear structure, concise language, clear images, and attractive layout. It warns against mismatched title/content, marketing diversion, plagiarism, and unsuitable images.

The manual does not publish a stable technical Markdown/HTML/CSS/SVG whitelist for the current article editor.

### Primary tool-source evidence (not official platform policy)

`niudai/VSCode-Zhihu` documents:

- Markdown authoring and preview.
- Inline/block LaTeX syntax.
- Language-labelled fenced code for highlighting.
- Mermaid conversion to PNG.
- Markdown table handling.
- Image upload to Zhihu-hosted URLs.
- A warning that most embedded HTML, including tables, is filtered by the service.

`drmingdrmer/md2zhihu` documents:

- Producing a single-file Markdown artifact without local asset dependencies.
- Uploading referenced assets to a public repository/host.
- Converting LaTeX, Mermaid, and Graphviz to images where needed.
- Simplifying Markdown inside table cells because Zhihu import does not preserve it reliably.

These repositories are implementation precedents, not official promises; every compatibility rule remains subject to current editor/manual verification.

### InkForge contract

- Zhihu's default artifact is semantic clean Markdown. Do not carry WeChat wrappers, inline styles, inline SVG, or market-editor DOM into it.
- Preserve headings, paragraphs, lists, quotes, links, fenced code with language, and simple Markdown tables.
- Formula support requires current editor preview; if unsupported, use an image fallback with alt/caption.
- Mermaid/Graphviz/PlantUML/Vega and complex tables require raster fallback plus explanatory text.
- Final images require public HTTPS or real platform upload URLs. Local paths, `blob:`, `data:`, localhost/private URLs, temporary preview URLs, and WeChat CDN dependencies block publishable status.
- The user will perform Zhihu editor/upload/publish acceptance manually; local output can prove only clean Markdown and artifact-manifest correctness.

## Cross-platform UI implications

1. Platform selection must switch renderer, native artifact type, style catalog, and quality report together.
2. A WeChat persona cannot be relabelled as an XHS or Zhihu style. Shared semantic tokens may exist, but every platform maps them to its own artifact family.
3. Advanced parameters show only controls the selected platform can apply. Unsupported values display a defined fallback or blocker, never a no-op slider.
4. Diagnostics and proof gates remain accessible in a dedicated drawer/report, not in the primary style-selection path.
5. “Exported” means an exact local artifact exists. “Published” requires real platform evidence and is never inferred from local rendering.

## Required docs/spec updates during implementation

- Refresh `docs/platform-rendering-rules/wechat-rules.md` with the official validator, current font/Dark Mode rules, and the 2026-07-14 draft fields/source conflict.
- Add the official Community Rules source and public-technical-gap boundary to `xiaohongshu-rules.md`; remove any unverified fixed limit presented as official.
- Add the official Creator Manual source and clearly label VSCode-Zhihu/md2zhihu as tool-source evidence in `zhihu-rules.md`.
- Update `.trellis/spec/frontend/wechat-svg-modules.md` only when executable rules/tests are changed.
- Keep the runtime `style-catalog.ts` as the executable choice/proof authority; prose tables must not create a second availability source.

## Sources retrieved 2026-07-22

- WeChat official editor plugin specification: `https://developers.weixin.qq.com/doc/subscription/guide/product/plugin_spec.html`
- WeChat official draft-add API: `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html`
- Xiaohongshu official Community Rules: `https://agree.xiaohongshu.com/h5/terms/ZXXY20221213003/-1`
- Xiaohongshu creator publish shell: `https://creator.xiaohongshu.com/publish`
- Zhihu official Creator Manual: `https://www.zhihu.com/knowledge-plan/manual`
- VSCode-Zhihu primary repository README: `https://github.com/niudai/VSCode-Zhihu`
- md2zhihu primary repository README: `https://github.com/drmingdrmer/md2zhihu`

