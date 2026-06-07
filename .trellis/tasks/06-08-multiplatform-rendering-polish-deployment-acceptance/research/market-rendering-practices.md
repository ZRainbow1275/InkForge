# Market Rendering Practices Research

## Evidence Sources

### Live Browser Observations

- 135 home screenshot: `C:\Users\HP\Downloads\135-editor-logged-in-home-2026-06-07T20-19-45-968Z.png`
- 135 workbench screenshot: `C:\Users\HP\Downloads\135-editor-workbench-2026-06-07T20-20-43-979Z.png`
- Xiumi home screenshot: `C:\Users\HP\Downloads\xiumi-logged-in-home-2026-06-07T20-21-28-670Z.png`
- Xiumi paper editor screenshot: `C:\Users\HP\Downloads\xiumi-paper-editor-2026-06-07T20-22-19-668Z.png`

No credentials, account security settings, publishing actions, payment flows, or private user content were inspected.

### External Sources

- 135 Editor official homepage: https://www.135editor.com/
- 135 tutorial: "如何导出svg效果并复制到微信后台或135编辑器": https://www.135editor.com/books/chapter/1/410
- 135 SVG insertion tutorial: https://www.135editor.com/geo/gongzhonghaopaiban/1516/
- 135 SVG click transition tutorial: https://www.135editor.com/geo/svgeditor/3125/
- Xiumi homepage: https://xiumi.us/
- WeChat official editor plugin specification: https://developers.weixin.qq.com/doc/subscription/guide/product/plugin_spec.html
- Xiumi Chrome extension listing: https://chromewebstore.google.com/detail/%E7%A7%80%E7%B1%B3%E6%8F%92%E4%BB%B6/fifkoliiibjdpcdfcknjjcpnahhnihid
- Xiumi plugin/tutorial entry observed from app: https://v.xiumius.cn/board/v5/2a5va/468168482
- Xiumi sync tutorial entry observed from app: https://v.xiumius.cn/board/v5/2a5va/14790933
- doocs/md GitHub: https://github.com/doocs/md
- doocs/md online editor: https://md.doocs.org/
- mdnice GitHub summary from Exa: https://github.com/xiaoqiangclub/mdnice
- wechat-formatter/TypeZen Exa result: https://github.com/mspringjade/wechat-formatter
- wechat-formatter-like pipeline examples from Exa: https://github.com/alchaincyf/huasheng_editor
- publish-md-to-wechat Exa result: https://github.com/walk4rever/publish-md-to-wechat
- 微信 SVG copy discussion source found by Grok: https://zhuanlan.zhihu.com/p/512207698
- 小红书 long-form note report found by Grok: https://wap.eastmoney.com/a/202507043448727835.html
- 知乎 Markdown/LaTeX discussion found by Grok: https://www.zhihu.com/question/15048034686/answer/1926256446313600585

### 2026-06-08 Recheck Notes

- Grok Search was used to find current WeChat SVG/Dark Mode/editor-spec sources. Its generated answer included unsafe suggestions such as DOM event handlers and SVG-internal `<style>` assumptions; these were rejected. Only the retrieved official/public URLs were used.
- The WeChat official editor plugin specification is now treated as the highest external rule source for editor-structure risks: fixed width/height, `line-height:0`, transparent image plus SVG overlay, ordinary paragraphs inside `<pre>`, `text-align:start/end`, Dark Mode contrast, and SVG `begin` triggers.
- Exa recheck confirmed current WeChat Markdown tools still converge around sanitize -> theme -> inline CSS -> clipboard, with image/formula/code handling as platform-specific post-processing.
- Exa recheck for XHS confirmed the product route remains text/photo/video/image-page oriented; Markdown-to-image and long-image renderers are legitimate fallbacks, while HTML/SVG body output is not.
- Exa recheck for Zhihu confirmed Markdown/LaTeX/code/table semantics remain more important than preserving HTML styling; unsupported diagrams and complex formulas should fall back to images.

## 135 Editor Lessons

135 is organized around a dense material taxonomy and production workflow:

- Top-level material families: template center, style center, SVG styles, SVG effects, SVG templates, public-account long image, hot topics, marketing calendar.
- Editor-side families: title, body, image-text, guide, layout, festival, industry, small elements, SVG, image library, clipboard, one-click layout, AI tools, preview/share, sync official account.
- Practical SVG categories observed/researched: click expand, click switch, horizontal transition, carousel, counters, animated backgrounds, custom trigger areas.
- Workflow pattern: choose template/component first, then correct global typography and local parameters.

InkForge rule impact:

- The docs/spec should define element families, not only color presets.
- The renderer should separate structural families from visual variants:
  - headings
  - body paragraphs
  - quotes/callouts
  - figures
  - image groups
  - dividers
  - guide/follow/end blocks
  - tables/data cards
  - SVG interactive blocks
  - long image/poster fallbacks
- Quality checks should explain whether a family is paste-safe HTML, WeChat-safe SVG, image-only, or requires manual official-account backend insertion.

## Xiumi Lessons

Xiumi is more component-editor oriented:

- Product layers: graphic article, H5, image design.
- Export layers: official-account sync, Weibo draft, plugin copy, copy/paste fallback, long image/PDF/video.
- Component layers: SVG gallery, free layout, carousel, click expand, path animation, lottery, transition, trigger area, click switch/popup/play, image/video/music/card components.
- Formatting layers: font, line spacing, letter spacing, page margins, shadow, border, background, position, layer order, animation, dark-mode highlight preservation.

InkForge rule impact:

- WeChat rules need an explicit "interactive SVG" class, separate from static decoration.
- Complex interactions should be opt-in and test-gated, not default output.
- XHS and deployment workflows need a long-image/poster route as first-class fallback.
- Rich components that require official-account backend capabilities must be represented as a publish checklist or real API boundary, never as fake HTML.

## doocs/md and OSS Lessons

DeepWiki/doocs summary and mdDocs results point to the canonical WeChat Markdown pipeline:

1. Parse Markdown and front matter.
2. Render with custom renderer/theme.
3. Render math/code/diagrams with platform-aware handling.
4. Sanitize output.
5. Inline CSS using `juice` or equivalent.
6. Modify HTML structure for WeChat compatibility.
7. Normalize images.
8. Copy processed HTML to clipboard or export.

Additional OSS patterns:

- `mdnice` emphasizes platform functions such as WeChat and Zhihu output with themes/code themes/image upload strategies.
- `publish-md-to-wechat` emphasizes AST rendering, image upload to WeChat CDN, cover generation, dry-run local preview, and style replication from computed styles.
- `wechat-formatter`/TypeZen-like projects emphasize many templates, AI structure cleanup, custom theme color, and one-click copy.

InkForge rule impact:

- InkForge already has the right dependency class: `marked`, DOMPurify, `juice`, highlight.js, KaTeX, Mermaid, Vue, Tauri.
- The next improvement is not adding a second renderer. It is hardening final-output contracts and broadening reusable element families.
- Copy/export checks must run after final post-processing, not only on preview HTML.

## Platform Contract Matrix

| Platform | Primary artifact | Richness allowed | Default downgrade | Hard blockers |
| --- | --- | --- | --- | --- |
| WeChat Official Account | Inline-style HTML + safe SVG/HTML blocks | Highest | SVG/image fallback, manual backend component checklist | script/event handlers, class-dependent CSS, unresolved vars, unsupported layout, fake backend components |
| Xiaohongshu | Plain text + images/poster/long image | Low in body, high via images | Convert tables/code/formula/SVG to text summary or image | raw HTML, raw Markdown leakage, fake rich text |
| Zhihu | Clean Markdown | Medium/high for Markdown semantics | Strip WeChat HTML/SVG; preserve code/table/formula or image fallback | WeChat decorations, inline CSS dependency, fake unsupported widgets |

## WeChat SVG/HTML Rule Split

Important distinction:

- HTML block styles can survive as inline `style` when they are within WeChat-supported CSS properties.
- SVG internals are safer when using presentation attributes (`fill`, `stroke`, `stroke-width`, `opacity`, `font-size`, `text-anchor`, `viewBox`, geometry attributes) instead of CSS classes or `<style>`.

Therefore InkForge rules should say:

- For HTML text-bearing premium blocks: use inline solid color, border, spacing, radius, typography, and simple shadows within allowed list.
- For SVG graphic modules: use WeChat-safe SVG subset with presentation attributes, no `id`/`class` dependency, no `<defs>`/gradient/clip/mask/filter/use/url references, no external images/scripts.
- For interactive SVG: opt-in, test in real WeChat/editor, and provide rasterized fallback for non-WeChat targets.

## Recommended Rule Catalog Additions

- Market-inspired element groups:
  - `headline-system`: H1/H2/H3, numbered title, side-rule title, image title, vertical title.
  - `body-system`: paragraph, lede, reading bar, summary card, section intro.
  - `card-system`: quote, callout, data card, comparison card, timeline card, checklist card.
  - `figure-system`: image frame, caption, multi-image grid, long-image segment.
  - `guide-system`: follow, share, read-original, endmark, QR placeholder.
  - `interactive-system`: carousel, click expand, switch, popup, path animation, region trigger.
  - `fallback-system`: poster, long image, PNG formula/chart/table, platform checklist.
- Each group needs:
  - allowed platforms
  - output artifact type
  - safety validator
  - preview contract
  - tests
  - blocked/unavailable behavior

## Open Verification Needs

- Re-run current InkForge app and verify the latest `prompts/0601` flagship output still renders after any new changes.
- If code changes touch WeChat SVG/text blocks, repeat real WeChat paste check or clearly mark it as pending account/backend verification.
- XHS and Zhihu live editor checks require platform accounts and should not be faked; local tests can only prove artifact type and leakage rules.
