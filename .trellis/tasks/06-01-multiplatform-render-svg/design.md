# Technical Design — SVG R5 Element Library Slice

## Scope

This design covers the current R5 implementation slice for `06-01-multiplatform-render-svg`.
It is additive and keeps the existing export pipeline, flagship presets, and prior SVG module
families intact.

Primary files:

- `inkforge/src/services/export/svg-modules/primitives.ts`
- `inkforge/src/services/export/svg-modules/wechat-safe.ts`
- `inkforge/src/services/export/svg-modules/interactive.ts`
- `inkforge/src/services/export/svg-modules/dividers.ts`
- `inkforge/src/services/export/svg-modules/html-blocks.ts`
- `inkforge/src/services/export/themes.ts`
- `inkforge/src/services/export/svg-modules/__tests__/**`
- `prompts/0601/evidence/wechat-paste/flagship-*.html`

## Architecture Boundary

The implementation remains inside the existing `svg-modules` and preset decoration system:

Markdown/export HTML -> existing WeChat conversion -> `preset.decorate(html, target)` ->
`composeSvgDecorate` plus flagship HTML block decorators -> WeChat post-processing and
quality checks.

No parallel renderer is introduced. R5 only adds module renderers and decorator functions
that are opt-in through flagship presets and marker paragraphs.

## Decisions

### SMIL Base

`smilAnimate`, `smilAnimateTransform`, and `smilSet` accept an optional `id` attribute so
safe SMIL chains can use `begin="seqA.end+1.2s"`. This is limited to SMIL synchronization;
the WeChat-safe rules still forbid id-referenced paint-server constructs such as
`url(#gradient)`, `<defs>`, `<clipPath>`, `<mask>`, `<filter>`, `<use>`, and `<symbol>`.

### Interactive Stretch Module

`i-stretch` is a click-reveal SVG module:

- `motion=true`: full content is present, covered by an opaque layer that fades out on
  `begin="click"` with `fill="freeze"` and `restart="never"`.
- `motion=false`: content is fully expanded, with no cover and no `<animate>`.

It does not pretend to be a real layout-height collapse because WeChat paste HTML cannot
reliably animate surrounding section height. The module is therefore honest: click reveal,
not height collapse.

### Motion Layer

Divider motion is intentionally minimal. Only the central forge motif breathes through
an opacity SMIL loop when `theme.allowMotion` is true. Static output remains SVG-safe and
motion-free.

### Marker HTML Blocks

R5 adds plain-text marker paragraphs consumed by `html-blocks.ts`:

- `[横幅] text`
- `[对比] left title | left body || right title | right body`
- `[时间线] title | body || ...`
- `[相册] card title | card body || ...`
- `[出处] quote | source`
- `[折叠] title | body`

Markers are parsed from paragraph text and escaped before rendering. They do not preserve
raw HTML inside marker fields. Every output is idempotent by `data-ink-block` or
`data-ink-svg` sentinel.

### Platform Contract

- WeChat/preview: render inline HTML blocks and WeChat-safe SVG.
- Xiaohongshu/Zhihu: no new rich-text publishable body contract is created by this slice.
  Downstream platform conversion must keep stripping WeChat-specific decoration per the
  platform rules documented in the 06-08 closeout.

## Compatibility

- No feature is removed.
- Non-flagship presets must remain behaviorally unchanged.
- UI icons are not introduced; SVG paths/geometric marks are used only inside generated
  export markup.
- The implementation avoids `<style>`, class selectors, CSS variables, calc, flex/grid
  dependency, paint-server SVG ids, external images inside SVG, and event-handler attributes.

## Risks

- `smilAnimate` is shared across multiple renderers. GitNexus impact for this symbol is
  MEDIUM, so the slice requires full `svg-modules` tests plus broader export tests.
- Marker parsing is plain-text only. This is deliberate, but it means authors should not
  use raw HTML inside marker fields.
- Real WeChat mobile animation behavior still requires live editor/mobile verification
  when publishing evidence is refreshed. Static safety is verified by `checkWechatSafe`.

## Rollback Shape

The slice can be rolled back file-by-file:

- Remove `i-stretch` and chain IDs from `interactive.ts` plus tests.
- Remove marker decorators and their theme wiring.
- Restore evidence HTML artifacts.

Because all additions are opt-in and sentinel-protected, rollback does not require changing
the core export pipeline.
