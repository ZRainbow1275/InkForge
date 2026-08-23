# Article Visual Variant System

> Executable contract for `inkforge/src/services/export/visual-variants.ts`.

## 1. Scope

InkForge has one article-rendering architecture:

```text
semantic article content
  + shared typography and component baseline
  + one of seven VisualVariants
  + one of ten ArticleProfiles
  -> existing WeChat, Xiaohongshu, or Zhihu adapter
```

The variant layer is an additive art-direction layer. It must not replace the existing
platform renderers, writing-component registry, preset IDs, user Typography settings,
sanitizers, SVG modules, or quality detectors.

## 2. Closed identifiers

The seven stable `VisualVariantId` values are:

| ID | Product name | Canonical WeChat preset |
|---|---|---|
| `critical-translation` | 典藏译本 | `thesis` |
| `jurisprudence-atlas` | 法理坐标 | `legal` |
| `industry-section` | 产业剖面 | `report` |
| `fact-wire` | 事实通讯 | `commentary` |
| `machine-foundry` | 数字铸场 | `aigc` |
| `knowledge-weave` | 知识经纬 | `notes` |
| `human-margins` | 人文边页 | `life` |

The ten stable `ArticleProfileId` values map as follows:

| Profile | Variant |
|---|---|
| `thesis-translation` | `critical-translation` |
| `legal-study` | `jurisprudence-atlas` |
| `industry-report` | `industry-section` |
| `current-commentary`, `news` | `fact-wire` |
| `aigc`, `software-creation` | `machine-foundry` |
| `study-notes` | `knowledge-weave` |
| `playful`, `life-reflection` | `human-margins` |

Do not add an open-ended string-based template language. New values require source,
mapping, renderer, test, and migration updates in the same change.

## 3. Legacy compatibility

All existing platform preset IDs remain selectable:

- WeChat: 16 IDs;
- Xiaohongshu: 5 IDs;
- Zhihu: 3 IDs.

`resolveVisualVariant(platform, presetId)` is the compatibility boundary. An unknown
ID resolves to the current platform default and returns `fallback: true`; it must not
invent a preset or delete the caller's original value.

`getPlatformPresetForVariant(variantId, platform, profileId?)` resolves design intent
back to an existing platform preset. Profile-specific aliases such as `news`, `code`,
`meme`, and `xhs-fresh` remain available without becoming new variants.

## 4. Rendering contract

`getVisualVariantCSS(platform, presetId, target, variantId?)` returns platform-scoped
CSS for the existing root:

- WeChat: `#nice`;
- Xiaohongshu: `#xhs-note`;
- Zhihu: `#zhihu-answer`.

The function is consumed by the current platform CSS paths:

- `generateThemeCSS()` for WeChat;
- the existing XHS preset and conversion path;
- the existing Zhihu preset and conversion path.

No platform may receive another platform's wrapper or final HTML.

### 4.1 Paragraph-only identity

Every selectable WeChat preset must remain visibly distinct when the article contains only
ordinary paragraphs. Identity must come from structure and rhythm as well as color:

- one preset/profile-owned masthead composition, with flagship decorators adding their
  existing cover and SVG identity;
- paragraph indentation, spacing, type role, and letter spacing;
- H1-H6 hierarchy and section rhythm;
- restrained paper treatment and semantic dividers;
- variant-specific quote, table, code, figure, and component silhouettes.

Ordinary direct-child paragraphs are a continuous reading flow. The final variant CSS
must explicitly reset legacy preset paragraph `padding`, `border`, and `background-color`
to `0`, `0`, and `transparent`. A variant may change indentation, spacing, font role, or
letter spacing, but may not reintroduce a card, rail, color block, or enclosing border on
every ordinary paragraph. Cards are reserved for semantic components.

The variant layer may not reduce the verified narrow-screen line-length baseline.
Explicit user Typography overrides still apply after the variant layer. Any Typography
override that replaces a heading with a neutral light background (`background` or `pill`)
must also write a safe dark foreground; it may not inherit a variant's reverse-white
heading color and produce a light-on-light artifact.

### 4.1.1 Preset-level uniqueness

The acceptance unit is the complete set of 16 selectable WeChat presets, not only the
seven `VisualVariantId` values. All presets share a deliberately small brand invariant:

- the `INKFORGE · <variant identity>` running line;
- the micro-signature `文章值得您享受`;
- the real article metadata, InkForge colophon, safe font fallback, and narrow-screen
  reading baseline.

These anchors must not force shared geometry. The twelve base presets own twelve distinct
masthead composition identifiers. Profiles that resolve to one variant must also diverge
after the masthead in their heading rhythm, writing-component silhouette, and colophon:

- commentary uses an opinion/evidence brief while news uses a newsroom front;
- AIGC uses a model matrix, software creation uses a terminal log, and technology uses an
  engineering circuit board;
- playful uses editorial collage, life reflection uses a quiet letter, and elegant uses an
  archival title page.

The four flagship presets remain distinct through their existing source-owned cover/SVG
decorators and paste-safety contract. `flagship-kiln-paste-safe` is a compatibility design,
not permission to collapse its cover structure into `flagship-kiln`.

Automated uniqueness checks must normalize colors and fixed article text before comparing
masthead/CSS structures. A second check must compare the final converter output after
decorators and inline processing so that a builder-only difference cannot masquerade as a
different delivered preset. These checks prevent accidental structural collisions; the
release `InkForge.exe` visual review remains the aesthetic acceptance gate.

### 4.2 Masthead hooks

`buildReadingTimeHeader()` consumes caller-provided real title/category/song data and the
variant resolved from the selected preset. Missing values are omitted; it must not emit
an unnamed-article, uncategorized, sample-song, fake-author, or fake-source placeholder.
The seven-variant masthead is article identity, not a reading-time decoration: disabling
the reading-time option removes only the minute prompt and must leave the selected masthead,
real title, category, and other supplied identity data intact.

The closed masthead presentation contract is owned by
`getVisualVariantMastheadPresentation()` in `visual-variants.ts`. It supplies the existing
variant product identity plus a short index and editorial strap; user text remains escaped
HTML, not SVG text.

The masthead owns stable CSS hooks including:

- `.ink-article-masthead`;
- `.ink-article-masthead__lead`;
- `.ink-article-masthead__identity`;
- `.ink-article-masthead__title`;
- `.ink-article-masthead__meta`;
- `.ink-article-masthead__details`.

The outer section carries `data-ink-masthead-variant`. The flagship read-bar decorator
must preserve the seven-variant structure and add its existing
`data-ink-block="flagship-readbar"` sentinel instead of replacing the masthead. This keeps
cover, TOC, footer, paste-safe, and idempotency behavior intact. Rerun all flagship
read-bar tests for any masthead markup change.

### 4.2.1 Flagship SVG cover headline

The `1080 × 620` `cover-title` and `cover-grid` modules use the same readability ceiling
without collapsing their independent compositions: headline glyphs are `72` viewBox pixels,
line advance is `92`, each line contains at most nine characters, and the headline remains at
most two lines with the existing ellipsis contract. This keeps the title editorially prominent
on a 390px phone canvas without turning it into a 100px-scale wall of text in the wider WeChat
PC editor.

The full-bleed grid cover and warm-paper title cover must retain their own background, header,
rule, tab, seal, and subtitle geometry. Do not fix wide-editor scaling in a platform adapter or
per-preset override. Any headline-scale change requires the cover overflow tests, release
`InkForge.exe` visual review, and ordinary system-paste readback in the authenticated WeChat PC
editor.

### 4.3 Semantic and component coverage

Each variant must style or safely inherit a visible baseline for H1-H6, paragraphs,
strong/emphasis/deletion, links, lists, blockquotes, tables, code, formulas, diagrams,
figures, captions, dividers, citations, footnotes, and registered writing components.
The article colophon/license and delivery-link rows are also variant surfaces. Every
canonical variant must provide a source-owned, WeChat-safe footer/link treatment that is
visibly attributable to that variant after CSS is inlined; a generic unthemed CC row is not
sufficient.

Variants may change presentation only. Timeline, comparison, statistics, gallery,
citation, song, author/profile, article link, image, and WeChat media data continue to
come from the existing validated writing-component model. Missing required real fields
must not be replaced with sample content.

### 4.4 Application data flow and preview canvas

`ExportModal.vue` and `PublishView.vue` pass the current article's existing real title and
resolved category name to the WeChat options. They must not create a second identity state
or infer profile/variant from free text. `convertToWechatWithStats()` resolves the variant
from the selected existing preset and passes that closed identifier to the masthead.

The Workstation inspector is another real rendering surface, not a generic theme mock.
`usePreviewRenderer()` must resolve the masthead from the same selected preset, pass the
current title/category/song, and preserve the masthead when reading time is disabled. The
active preset card, masthead `data-ink-masthead-variant`, visible product name, copied
artifact, Export modal, and Publish center must never describe different variants.

The Export modal keeps all existing controls and all 16 WeChat preset IDs. Each preset card
shows its resolved VisualVariant name and signature, while the rendered artifact is centered
inside a `390px`-wide device canvas (`max-width: 100%` at narrow breakpoints). Browser-only
rendering is not release evidence. On desktop, the control column is capped at `360px` so
the 390px artifact remains the dominant review surface without deleting any control.

### 4.5 Native editor correspondence

The editable ProseMirror canvas and the rendered platform preview are two projections of the
same canonical settings state. `EditorPanel.vue` must consume the existing platform preset,
`resolveVisualVariant()`, profile/persona metadata, and user Typography configuration; it must
not maintain a second theme selector or reproduce the final export renderer inside ProseMirror.

The editing projection must expose stable preset/variant/persona identity on the editor shell and
paper, and use that identity for readable heading, quote, emphasis, divider, and registered
writing-component treatments. Body typography remains controlled by the user's existing
Typography settings. Switching a preset must update the editor projection and preview artifact in
the same application state transition.

Registered writing components are atomic editing nodes. Their editor card must be derived from the
real component source and show the registered label, component ID, available field summary, and
validation state. Invalid source uses an explicit error treatment and `aria-invalid`; missing data
must never be replaced with sample authors, numbers, images, songs, links, or platform metadata.

Acceptance requires a release `InkForge.exe` readback for all sixteen WeChat presets proving that
editor preset ID equals preview preset ID and that the selected component remains both editable and
rendered. Browser-only screenshots do not satisfy this native correspondence gate.

### 4.5.1 Editor authority and sanitized-artifact proof

The release editor experiment must start from one repository-owned, deterministic Markdown corpus,
perform visible toolbar and component-library actions in the packaged Tauri/WebView2 application,
save, reload, and read the persisted Markdown authority before inspecting the final WeChat artifact.
At minimum it must cover paragraph plus H1-H6 conversion, inline semantics, nested/task lists,
tables, code, formula and Mermaid source, footnotes, every currently registered writing component,
and atomic component insert/edit/delete. A passing unit test or Vite page does not replace this gate.

When a Markdown transform emits a raw HTML heading, it must leave a blank-line boundary after the
closing heading tag. Otherwise CommonMark may absorb the following Markdown line into the raw HTML
block and reopen it as literal `**`, `*`, link, or highlight syntax.

Final WeChat proof must follow the delivered sanitizer contract rather than diagnostic editor DOM:

- semantic `mark` is an allowed final tag and must retain a visible inline background;
- external non-WeChat links use the default visible-label plus superscript-reference and
  `引用链接` footnote representation, so retaining the original external `<a>` is not required;
- `data-*` and component classes are diagnostic only and may be removed; each registered component
  is proven by its escaped visible content from the validated registry renderer;
- no assertion may depend on script, event handler, private account data, sample author/media data,
  browser profile state, or a synthetic clipboard event.

### 4.6 Executable rendering-rule catalog

`getWechatRenderingRuleCatalog()` in `services/export/themes.ts` is the read-only customization and
inspection contract for the sixteen real WeChat presets. It derives every row from `themePresets`,
`resolveVisualVariant()`, `ARTICLE_PROFILES`, and the preset's `visualSignature`; callers must not
maintain a second preset-ID list.

Each `WechatRenderingRuleCatalogEntry` records:

- stable preset, persona, variant, and compatible-profile identity;
- the shared brand anchors that may survive without imposing shared geometry;
- six composition zones: masthead, heading rhythm, body flow, semantic blocks,
  components/delivery, and ending;
- `runtimeStructureFingerprint`, derived from the current export CSS plus the preset decorator's
  normalized masthead structure, so color, text, IDs, and numeric values cannot masquerade as
  composition differences;
- `writingComponentIds`, read from the existing writing-component registry on each catalog read;
- platform degradation, WeChat-safe invariants, customization knobs, and locked fields.

The catalog is descriptive. It must never contain executable HTML/CSS templates, render a document,
be written back to Settings, or replace the preset/decorator/converter chain. Inspector, docs,
fingerprint, and acceptance-report consumers may read it; delivered HTML still comes only from the
existing platform converter.

To add or customize a preset:

1. implement the composition in the existing preset/variant/decorator path and keep a stable ID;
2. supply complete source-owned `visualSignature` metadata, including masthead, delivery, and ending;
3. map a profile only through the existing closed resolver where product intent requires it;
4. pass catalog coverage, real-converter structure, runtime six-zone pairwise distinction,
   dynamic writing-component registry coverage, semantic/component coverage, sanitizer/SVG,
   platform isolation, release WebView2 visual review, and WeChat PC ordinary-paste gates;
5. never provide sample authors, media IDs, account data, sources, images, numbers, or links for
   missing real fields.

Adding a runtime JSON theme loader, a free-form template DSL, a second renderer, or a second component
registry is not an extension of this contract.

## 5. WeChat-safe subset

Variant identity must survive conversion to inline styles. Do not depend on:

- pseudo-elements;
- `position`-based article layout;
- flex/grid layout;
- gradients, filters, masks, CSS variables, or `calc()`;
- external style sheets, scripts, event handlers, or vendor editor residue;
- long text inside SVG.

User-controlled color overrides cross a CSS trust boundary. Accept only a trimmed
six-digit HEX value (`#[0-9a-fA-F]{6}`); invalid overrides must preserve the selected
preset color, while an invalid direct WeChat preset color must use a safe fixed fallback.
Apply the same normalizer in the unified converter and every direct platform converter
because HTML sanitization before later `<style>` generation does not protect CSS
interpolation.

Export-only custom CSS is a second trust boundary. The export and Workstation preview
paths must reuse the same normalizer and remove declarations containing
`url(...)`, including HTTPS URLs, before the inline pass; remote fonts, images, tracking
pixels, and other network resources must not enter the final WeChat artifact through
historical custom CSS.

Use normal flow, solid colors, borders, padding, margins, safe font properties, and the
existing source-owned SVG/HTML modules. Market editors such as 135 and Xiumi provide
taxonomy and workflow evidence only; their DOM, assets, classes, IDs, and templates
must never enter InkForge output.

## 6. Verification

The minimum automated gate is:

```bash
pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism
pnpm -C inkforge exec eslint <exact changed files> --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
pnpm -C inkforge style-proof:application-preflight
```

Required assertions:

- 7/7 variants, 10/10 profiles, and 24/24 legacy IDs are covered;
- all twelve base WeChat presets have unique masthead compositions and color-normalized
  preset/profile output;
- the executable rule catalog contains exactly the current sixteen WeChat preset IDs, with no
  duplicate or unknown row, and every row has all six non-empty composition zones;
- every pair of rule rows differs in at least three non-colour composition zones, while the catalog
  contains no HTML/CSS/template payload;
- all sixteen final WeChat artifacts have unique post-decorator structural fingerprints;
- commentary/news, AIGC/software/technology, and playful/life/elegant retain distinct H3,
  writing-component, and colophon treatments beyond their mastheads;
- real article titles and category names reach both Export and Publish; missing identity data
  creates no placeholder;
- the Workstation selected preset and visible masthead resolve to the same variant and article
  identity;
- disabling reading time removes only the minute prompt and preserves the selected masthead;
- direct ordinary paragraphs are explicitly reset to a continuous transparent/borderless flow;
- all selectable presets retain complete semantic content;
- every user Typography control still changes the real WeChat artifact;
- neutral light heading overrides remain readable in every selectable WeChat preset;
- writing components remain themed and free of unsupported layout;
- all seven variants have distinct inlined article-colophon/license and delivery-link rules;
- custom CSS cannot carry either active-content or ordinary remote `url(...)` declarations;
- application preflight reports zero SVG safety, sentinel, slot, surface, option, and
  style-sample issues.

Final visual acceptance must use the real Tauri/WebView2 `InkForge.exe`. A Vite page or
browser screenshot is diagnostic evidence only. Xiaohongshu and Zhihu publication is
operator-owned for the current round. WeChat phone preview, Dark Mode, cover thumbnail,
credentialed sync, scheduled send, and publication require separate external proof.
