# WeChat-Safe Inline-SVG Typesetting Modules (`svg-modules`)

> Executable contract for the inline-SVG premium-typesetting system at
> `inkforge/src/services/export/svg-modules/`. Full PRD/SPEC: `prompts/0601/`.

---

## 1. Scope / Trigger

Apply this spec whenever you **author, inject, or modify inline SVG** that is meant to
survive a WeChat 公众号 paste (or flow through the wechat/xhs/zhihu export pipeline).
Cross-layer contract: the SVG is injected mid-pipeline and must survive juice →
`postProcessForWechat` → `enforcePlatformCSS` → `wechatComplianceTransform`.

WeChat publishes **no** official whitelist; the subset below is reverse-engineered from
production tools (see `prompts/0601/research/wechat-svg-capabilities.md`). The key fact:
**WeChat strips `id` and `class` and `<style>` on paste/publish**, so any `id`-referenced
construct breaks.

2026-06 market/official-spec supplement:

- Treat `docs/platform-rendering-rules/market-practices-catalog.md` as the cross-platform
  rule catalog for 135/Xiumi/doocs/md lessons.
- Treat `inkforge/src/services/export/style-catalog.ts` as the executable mirror of the
  user-selectable style matrix. UI/export-report code should consume its typed choices and
  availability evaluator instead of forking doc-only tables.
- User-clickable style UI must pass both catalog gates:
  `evaluateStyleChoiceAvailability()` proves the current evidence floor is satisfied, while
  `getPlatformStyleApplicationReport()` proves the choice maps to an existing InkForge preset
  or export option that actually changes output. Available-but-unmapped choices stay read-only.
- Runtime evidence must also expose proof requirements through
  `getEvidenceProofRequirements()` and `getStyleChoiceProofRequirements()`. These helpers are a
  checklist layer, not an availability shortcut. For example, `pc-editor-paste` requires the exact
  artifact, a safe disposable draft or cleanup path, a real PC paste/channel event, PC DOM readback,
  and sensitive-artifact hygiene; `mobile-preview` separately requires phone readback, phone
  screenshot evidence, Dark Mode inspection, and cover-thumbnail inspection. `published` is
  cross-platform and proves final platform preview/publish inspection only; WeChat phone proof must
  remain a separate `mobile-preview` label.
- `validateStyleProofManifest()` is the executable validator for those proof items. It accepts
  redacted `StyleProofManifest` records, returns `QualityIssue[]`, and verifies requirement
  coverage, exact-artifact continuity, platform/choice consistency, action/channel/readback
  contracts, public image-host proof, XHS/Zhihu manifest proof, and sensitive-artifact hygiene.
  It must not change `evaluateStyleChoiceAvailability()` or `getPlatformStyleApplicationReport()`;
  a blocked/unavailable choice remains blocked even if a manifest is filled out.
- `getStyleProofManifestReport()` is the human/operator-facing companion for the validator. It
  groups issues by required proof item and proof artifact, exposes missing/invalid/satisfied rows,
  and counts sensitive or unsafe-to-commit artifacts. It is safe for diagnostics and evidence
  summaries only; it must not become an availability, selectable, sync, preview, or publish gate.
- `createStyleProofManifestDraft()` is the scaffold entry point for future proof collection. A
  style-choice draft defaults to `scope:'style-choice'` and `artifacts:[]`, so
  `getStyleProofManifestReport()` can enumerate exact missing proof requirements before any
  CloakBrowser/platform action is attempted. It must never fabricate artifact entries.
- `getPlatformStyleProofReadinessReport()` aggregates those empty style-choice drafts for one
  platform. It is the acceptance-readiness matrix for future WeChat/XHS/Zhihu proof collection:
  every row starts from missing proof unless real redacted artifacts are later supplied. It must
  not be treated as renderer success, paste success, mobile preview, sync, or publish proof.
  Platform-specific artifact manifests must be attached by platform/output type, not by generic
  evidence labels: XHS image-page/long-image choices require `xhs-artifact-manifest`, while Zhihu
  image-fallback/upload choices require `public-image-host` plus `zhihu-artifact-manifest`.
  `credentialed-sync` itself is only account/channel response, sync readback, and sensitive-proof
  hygiene.
- `getPlatformStyleProofCollectionPlan()` turns that readiness matrix into an execution plan for
  future proof collection. Each missing or invalid requirement is mapped to a gate:
  `local-evidence`, `market-editor`, `authenticated-pc-editor`, `phone-preview`,
  `credentialed-channel`, `public-host`, `platform-publish`, or `sensitive-hygiene`. The plan
  exposes whether a step mutates a real platform, requires an external account, requires a phone,
  or is safe to automate locally. It is scheduling metadata only; it must not promote blocked
  styles or replace exact CloakBrowser/platform proof.
- `getPlatformStyleProofCollectionQueue()` is the grouped operator view of that plan. It must
  derive from the plan, group only non-empty gates in collection order, expose `nextGate` and
  `nextSafeGate`, and count blocked choices, mutating steps, external-account steps, phone steps,
  and safe-to-automate steps. It is a queue for real proof collection, not an availability or
  publish-success shortcut.
- ExportModal may surface this plan in the style capability cards as proof summaries and gate
  labels. That UI is informational only: it must not change `selectable`, `usable`, `blocked`, or
  `unavailable` decisions, and it must keep local evidence, PC editor proof, phone preview,
  credentialed channel, public host, platform publish, and sensitive-hygiene gates visually
  distinct.
- WeChat official editor guidance adds hard failure modes that must be respected by SVG and
  HTML block authors: no fixed-width/height content containers, no `line-height:0` around
  readable text, no transparent image hidden under an SVG background, no ordinary paragraphs
  in `<pre>`, no `text-align:start/end`, and no SVG animation trigger that only works on
  `touchstart`.
- Dark Mode: SVG text is not recolored by the platform algorithm in the same way as HTML text.
  Text-bearing SVG must either be avoided or include an opaque background plus explicit
  `fill`/`stroke` values with verified contrast. `currentColor` is allowed only when the
  wrapping HTML sets an explicit color and the module has verified contrast in normal and
  mobile Dark Mode. Prefer HTML blocks for reflowing text.
- 2026-06-08 135/Xiumi real-browser learning adds taxonomy, not blanket capability:
  click-reveal, click-show, click-switch, click-zoom, flip, popup, disappear, play/draw,
  slide, carousel, long-press, fade-in, bullet text, region trigger, quiz/game, and
  text-effect patterns are all market categories. InkForge may only implement them as
  source-owned modules after this spec's safe-subset checks and real WeChat verification.
  Xiumi-style actions/layers/free layout map to `layout-and-layer-system`; unsupported
  absolute/free-canvas compositions degrade to raster/long-image with text backup.
- 2026-06-08 follow-up browser learning adds an evidence rule: market SVG effects marked
  "mobile only" or "only supports mobile trigger" remain `mobile-only-risk` even if PC paste
  preserves their SVG. PC editor paste evidence proves sanitizer retention and desktop-editor
  rendering only; it does not prove mobile WeChat rendering, click/SMIL trigger, Dark Mode,
  cover-thumbnail acceptance, sync, scheduled send, or publish.
- Treat public claims that WeChat article SVG can rely on `<script>`, `onclick`/`onload`,
  DOM event listeners, class selectors, `<style>`, external CSS, or remote resources as
  conflicting/high-risk input. These constructs are forbidden in InkForge output even if a
  market article demonstrates them in another editor context.
- 2026-06-08 `flagship-amber` ordinary clipboard proof: the exact rich artifact was written to
  the browser clipboard as `text/html` (`data-ink-svg=3`, `svg=35`), but authenticated WeChat
  `.ProseMirror` readback after real `Control+V` was plain text only (`data-ink-svg=0`,
  `svg=0`, no inline styles). The ordinary clipboard channel is therefore `blocked` for amber
  until a separately named channel is proven.
- 2026-06-08 re-login browser probe: `prompts/0601/evidence/market-editor-element-probe-20260608.txt`
  records current WeChat backend, 135 Editor, 135 SVG center, and Xiumi editor visible surfaces.
  It is valid taxonomy/workflow evidence only. It does not upgrade WeChat paste, mobile preview,
  Dark Mode, sync, cover-thumbnail, scheduled-send, or publish availability without exact
  artifact proof in the runtime catalog.
- 2026-06-08 CloakBrowser applied-element rerun in the same evidence file adds a stronger
  market-learning gate. A future SVG/layout rule may cite 135/Xiumi only when the probe clicked
  a concrete style/effect, visually confirmed the central editor/canvas changed, and then read
  DOM/parameter controls. This gate is `applied-editor-element`: it proves authoring structure,
  image slots, layout risks, motion parameters, and insertion risks, but still does not prove
  WeChat mobile rendering, Dark Mode, plugin transfer, sync, scheduled send, or publish. Do not
  use Playwright for this market-editor probing path while the user has required CloakBrowser.
- Applied 135/Xiumi elements are schema inputs, not templates. Do not import `section._135editor`,
  `.tn-*`, private SVG source, Vue/Ant DOM, trial/paid material, copied layout geometry, or third-
  party image CDN dependencies into runtime modules. Convert them into InkForge-owned HTML/SVG
  primitives, manifest fields, fallback states, and validator rules.
- 2026-06-09 runtime gate: the export quality detector now turns that no-copy boundary into
  platform errors. `wechat-market-editor-residue`, `xhs-market-editor-residue`, and
  `zhihu-market-editor-residue` block 135/Xiumi authoring classes, `data-tools`, copied numeric
  market style ids, `tn-*`/`ng-*` authoring attributes, and third-party market image sources.
  Plain prose that merely mentions 135/Xiumi is allowed. This gate is unit-tested and must stay
  separate from WeChat paste/mobile/sync/publish proof labels.
- 2026-06-09 layout-report runtime gate: `wechat-layout-report-required` blocks free positioning,
  z-order layers, background image layers, overflow crop, fixed geometry, manual offsets, negative
  overlap spacing, and invisible/custom hit areas in WeChat output. The issue means the renderer
  must preserve readable DOM order and text fallback, or degrade to raster/long-image with a
  layout report covering visual order, DOM order, crop/overflow, trigger area, and target platform.
  This gate is separate from `wechat-unsupported-css` and is unit-tested with a normal-flow
  negative control.
- Editor-side block insertion is part of the SVG/H5 safety contract. `SlashCommands`,
  `SnippetExpansion`, and future market marker/tool buttons must route block content through
  `inkforge/src/extensions/BlockBoundaryInsertion.ts` so source-owned cards/SVG/H5 placeholders
  are inserted as top-level siblings. Raw `insertContent()` is reserved for inline text or
  commands that intentionally modify the current block.

---

## 2. Signatures

```ts
// svg-modules/wechat-safe.ts
export function checkWechatSafe(svgHtml: string): SafeViolation[]   // [] = safe
export function assertWechatSafe(svgHtml: string): void             // throws on violation

// svg-modules/inject.ts — plugs into existing preset.decorate(html,target)
export function composeSvgDecorate(
  plan: SvgInjectionPlan,
  opts: { primaryColor: string; persona: PresetPersona; accentColor?: string;
          rasterize?: (svg: string, mod: SvgModuleSpec, target: ExportTarget) => string },
): (html: string, target: ExportTarget) => string
export interface SvgInjectionPlan {
  cover?: string; headings?: { level: 1|2|3|4|5|6; module: string }[]
  replaceHr?: string; blockquote?: string; endmark?: string   // values = module ids
}

// svg-modules/index.ts — registry of 26 modules (6 static families + interactive)
export const SVG_MODULES: SvgModuleSpec[]
export function getSvgModule(id: string): SvgModuleSpec | undefined

// svg-modules/raster.ts — xhs/zhihu rasterization (browser/Tauri canvas only)
export function posterViewBox(ratio: '3:4'|'1:1'): { width: number; height: number }
export function rasterizeSvg(svgHtml: string, opts: RasterOptions): Promise<string> // PNG dataURL; throws without DOM

// style-catalog.ts - proof collection scheduling, not platform success
export type StyleProofCollectionGate =
  | 'local-evidence' | 'market-editor' | 'authenticated-pc-editor' | 'phone-preview'
  | 'credentialed-channel' | 'public-host' | 'platform-publish' | 'sensitive-hygiene'
export type StyleProofCollectionStatus = 'missing' | 'invalid'
export interface StyleProofCollectionStep {
  choice: PlatformStyleChoice
  requirement: StyleProofRequirement
  status: StyleProofCollectionStatus
  gate: StyleProofCollectionGate
  order: number
  blockedByCatalog: boolean
  mutatesPlatform: boolean
  requiresExternalAccount: boolean
  requiresPhone: boolean
  safeToAutomate: boolean
  note: string
}
export interface PlatformStyleProofCollectionPlan {
  platform: Platform
  steps: readonly StyleProofCollectionStep[]
  summary: {
    total: number
    localEvidence: number
    marketEditor: number
    authenticatedPcEditor: number
    phonePreview: number
    credentialedChannel: number
    publicHost: number
    platformPublish: number
    sensitiveHygiene: number
    blockedChoices: number
    mutatingSteps: number
    externalAccountSteps: number
    phoneSteps: number
    safeToAutomate: number
  }
}
export interface StyleProofCollectionGateGroup {
  gate: StyleProofCollectionGate
  order: number
  note: string
  steps: readonly StyleProofCollectionStep[]
  choiceIds: readonly string[]
  stepCount: number
  blockedChoiceCount: number
  mutatingSteps: number
  externalAccountSteps: number
  phoneSteps: number
  safeToAutomateSteps: number
}
export interface PlatformStyleProofCollectionQueue {
  platform: Platform
  groups: readonly StyleProofCollectionGateGroup[]
  nextGate: StyleProofCollectionGate | null
  nextSafeGate: StyleProofCollectionGate | null
  summary: {
    totalSteps: number
    totalGates: number
    totalChoices: number
    blockedChoices: number
    safeToAutomateSteps: number
    mutatingSteps: number
    externalAccountSteps: number
    phoneSteps: number
  }
}
export function getPlatformStyleProofCollectionPlan(platform: Platform): PlatformStyleProofCollectionPlan
export function getPlatformStyleProofCollectionQueue(platform: Platform): PlatformStyleProofCollectionQueue

// services/export/types.ts — opt-in toggle (additive, optional)
interface ExportOptions { enableSvgModules?: boolean; svgInjectionPlan?: SvgInjectionPlan }
```

---

## 3. Contracts

**WeChat-safe SVG subset** (what every module's `render()` output must satisfy):

| Allowed | Forbidden (FATAL — `checkWechatSafe` flags) |
|---------|---------------------------------------------|
| `<svg viewBox="..." width="100%">` (never fixed-px outer width) | fixed-px outer `<svg width="N">` |
| `<g>`, `<path>`, `<rect>`(rx/ry), `<circle>`, `<text>` (one per visual line) | `<div>` (use `<section>`), `foreignObject` |
| `fill`(hex/rgba), `stroke`, `stroke-width`, `opacity` | `class=`, `<style>`, `var(--…)`, `calc(...)` |
| `transform` as **XML attribute** | `style="transform:…"` (stripped by enforcePlatformCSS) |
| SMIL `<animate>/<set>/<animateTransform>`, `begin∈{click, Ns, id.end+Ns}`, `fill="freeze"`, `restart="never"` | `<defs>/<linearGradient>/<radialGradient>/<clipPath>/<mask>/<filter>/<use>` (id-referenced), `url(#…)`, `xlink:href` |
| `<section>` wrappers; `box-shadow` on the wrapping section style | `begin="touchstart\|mouseover\|…"`, external `<image href>`, `@keyframes`, `<script>` |

- Gradients/glows → use **layered solid shapes with stepped opacity** (NOT SVG gradients).
- Dark themes → bake an opaque background `<rect>` and give every `<text>` an explicit `fill`.
- Every module root carries `data-ink-svg="<moduleId>"` (idempotency sentinel).
- Interactive SVG remains opt-in. If an animation requires user input, do not rely on
  `touchstart` alone; default modules should avoid DOM event handlers entirely. If the module
  cannot be verified in a real WeChat editor/browser path, ship a raster fallback or mark the
  capability `blocked`.
- Automated tests can prove safe structure, idempotency, static fallback, and local/Tauri
  rendering. They do not by themselves prove mobile WeChat click/SMIL behavior. Any public
  claim that an interactive module is usable on WeChat mobile requires phone-preview evidence
  in the task evidence folder.
- Interaction support levels:
  - `static-safe`: pure graphics, seals, dividers, icons, background motifs.
  - `click-safe-candidate`: SMIL click/time sequencing using only the safe subset; requires
    PC editor and mobile proof before it can be presented as available.
  - `mobile-only-risk`: long-press/touch-only effects; default `blocked` with static fallback.
  - `script-or-dom-event`: any script, `on*` attribute, listener, class/style dependency, or
    external resource; always forbidden.
- Do not use SVG as a hidden overlay on top of transparent `<img>` elements. That pattern can
  prevent official-account authors from editing the underlying image after publishing.
- Applied market effect schema:
  - 135 SVG builder image slots such as `封面图`, `元素图`, and `底层片` map to an InkForge
    image-slot manifest with role, required dimensions/ratio, source provenance, upload/local
    availability, and fallback image.
  - Motion parameters such as `动画时长`, `放大时长`, `展开时长`, `元素缩小比例`, and movement
    direction map to typed motion schema. Direction must be an enum, not raw UI text.
  - Expanded-content controls such as `去缝隙`, `上移`, `下移`, `间距`, `复制`, and `删除`
    imply block ordering, spacing, gap-removal, and static-expanded fallback contracts.
  - Xiumi SVG gallery/action samples may have `svg:0` in the applied editor DOM. Treat them as
    image-slot/layer/action artifacts until InkForge owns a safe SVG implementation.
  - Any free-layout/layer/background/hit-area effect must produce a layout report with visual
    order, DOM order, text fallback, crop/overflow status, trigger-area status, and target
    platform.
  - If those constructs remain in WeChat publishable output, `detectQuality()` must report
    `wechat-layout-report-required` rather than silently treating the artifact as exportable.

Selectable interaction matrix:

| Choice id | Support level | Allowed output | Required proof before user-visible availability | Fallback |
|-----------|---------------|----------------|-------------------------------------------------|----------|
| `static-seal-divider` | `static-safe` | solid-fill inline SVG | `unit-tested` + local browser overflow/console probe | plain HTML divider |
| `cover-geometry` | `static-safe` | responsive cover SVG with explicit text fill/background | `unit-tested` + local browser mobile probe | raster cover |
| `click-reveal` | `click-safe-candidate` | SMIL `begin="click"` / time sequencing only | PC WeChat editor paste plus phone preview before/after | expanded static block |
| `carousel-switch` | `click-safe-candidate` | source-owned safe SVG sequence | PC paste plus mobile preview, no script/event/class dependency | image sequence / long image |
| `long-press` | `mobile-only-risk` | none by default | phone preview only; PC evidence cannot promote it | static image |
| `scripted-effect` | `script-or-dom-event` | forbidden | unavailable | no output |

Evidence labels for UI state:

- `doc-only`: cataloged but not executable.
- `applied-editor-element`: a concrete 135/Xiumi style/effect was clicked, visibly applied in
  the central editor/canvas, and DOM/controls were read. This proves market authoring structure
  and rewrite/fallback requirements only; it does not satisfy `unit-tested` or platform proof.
- `authenticated-editor-reachable`: the real WeChat PC article editor is reachable in an
  authenticated browser profile. This proves login/editor access only.
- `pc-editor-dom-readable`: the real WeChat PC editor title/body DOM is readable and visually
  inspected. This proves editor-surface introspection only, not sanitizer retention.
- `unit-tested`: detector/converter tests prove structure only.
- `local-browser`: local Playwright/Tauri/browser rendering proved visibility and no overflow.
- `pc-editor-paste`: authenticated WeChat PC editor accepted and rendered the exact artifact.
- `mobile-preview`: phone preview proved final mobile visibility/interaction/Dark Mode target.
- `credentialed-sync`: real account sync created draft/material, still not publish proof.
- `published`: final platform publish/preview was inspected.
- `blocked` / `unavailable`: show blocker and fallback, never report success.

2026-06-09 CloakBrowser WeChat editor probe:

- `prompts/0601/evidence/wechat-editor-authenticated-readable-20260609.txt` records an
  authenticated WeChat PC editor page in the required `inkforge-0601` profile. The visible title
  and body `.ProseMirror` editors were readable, but the current body contained an existing
  platform audio card, so no paste/readback test was attempted.
- A follow-up read-only CloakBrowser probe observed `#js_add_appmsg` / `data-action="add"` for
  adding another article in the current multi-article draft. It was not clicked: without a
  disposable draft, a verified cleanup path, and exact artifact readiness, this action can mutate
  the real draft structure and cannot satisfy `safe-disposable-draft`.
- This evidence upgrades only `authenticated-editor-reachable` and `pc-editor-dom-readable`.
  These labels rank below `unit-tested`, `local-browser`, `pc-editor-paste`, `mobile-preview`,
  `credentialed-sync`, and `published`; they must not make any style choice selectable or
  publishable by themselves.
- `prompts/0601/evidence/wechat-paste/amber-pc-clipboardevent-readback-20260609.txt` records a
  later CloakBrowser PC editor paste-channel proof for exact `flagship-amber.html`. A
  programmatic `ClipboardEvent('paste')` with `DataTransfer` was handled by the real WeChat
  editor, and DOM readback kept `data-ink-svg=3` plus `svg=35`. This is channel-specific
  `pc-editor-paste` evidence for the PC editor only. It does not overturn the 2026-06-08
  ordinary Ctrl+V blocker, and it does not prove phone preview, SMIL/click behavior on phone,
  Dark Mode, cover-thumbnail acceptance, credentialed sync, scheduled send, or publish.

**Pipeline ordering (why injection works):** `preset.decorate(html, target)` runs in
`wechat.ts` (~:1336) **after** the export DOMPurify (so injected SVG is NOT stripped) and
**before** `postProcessForWechat` / `enforcePlatformCSS` / `wechatComplianceTransform`.
`OPAQUE_TAGS` in `platform-rules/wechat.ts` **must include `'svg'`** so
`applyCjkLatinSpacing` never injects U+202F thin-spaces inside `<text>` (would corrupt glyphs).

**Targets:** `preview`/`wechat` → inline SVG. `xhs`/`zhihu` → rasterized `<img>` (zhihu strips
inline SVG; xhs body is plain-text/poster) via `raster.ts` (`hasDom()`-guarded canvas).

Cross-platform target contract:

- WeChat: inline HTML block + WeChat-safe SVG, then final-output compliance checks.
- Xiaohongshu: plain text plus image/poster/long-image artifacts. Never leak inline SVG or
  WeChat HTML into the publishable body. Any image-page or long-image route must validate
  manifest count, actual file count, cover page, page ordering, configured ratio/dimensions,
  configured format, configured max bytes, configured max page count, and every body reference
  such as `see image N` before it can be reported as exportable. Market values such as
  1080x1440, JPG/PNG, 20MB, and 18 images are current defaults/checklist inputs, not eternal
  hardcoded platform constants.
  Runtime contract: image-page/long-image artifacts use the preflight spec below; it is local
  evidence only, not XHS account upload, sync, preview, or publish proof.
- Zhihu: clean Markdown. Remove WeChat-specific `<section data-ink-block>` and inline SVG
  decorations; preserve semantic Markdown or image fallback. Final Markdown must block local
  paths, `blob:`, `data:`, private-network/localhost URLs, temporary preview URLs, and
  WeChat-only CDN dependencies. Raw diagram fences (`mermaid`, `graphviz`, `dot`, `plantuml`,
  `puml`, `vega`, `vega-lite`, `vegalite`) must be rasterized with alt/caption or marked
  `blocked` / `unavailable`. Residual WeChat wrappers, style/class-dependent HTML, and
  complex tables that cannot stay semantic must be cleaned, simplified, rasterized, or blocked.

### XHS Image Artifact Manifest Preflight

#### 1. Scope / Trigger

Use this contract whenever Xiaohongshu export claims local readiness for image pages, cover
images, carousels, or long-image artifacts. It is mandatory for high-visual-strength XHS output
because the publishable body remains plain text while visual layout lives in generated image
artifacts.

#### 2. Signatures

```ts
export type XhsImageArtifactKind = 'image-page' | 'cover' | 'long-image'
export type XhsImageArtifactFormat = 'jpg' | 'jpeg' | 'png'
export type XhsImageArtifactRatio = '3:4' | '1:1'
export type XhsImageCropStatus = 'ok' | 'warning' | 'overflow' | 'unknown'

export interface XhsImageArtifactPage {
  page: number
  fileName: string
  src: string
  exists?: boolean
  width: number
  height: number
  ratio: XhsImageArtifactRatio
  format: XhsImageArtifactFormat
  bytes?: number
  cover?: boolean
  referencedByBody?: boolean
  cropStatus: XhsImageCropStatus
}

export interface XhsImageArtifactManifest {
  kind: XhsImageArtifactKind
  pages: XhsImageArtifactPage[]
  bodyReferences: number[]
  limits?: {
    maxPages?: number
    maxBytes?: number
    allowedRatios?: readonly XhsImageArtifactRatio[]
    allowedFormats?: readonly XhsImageArtifactFormat[]
  }
}

export function validateXhsImageArtifactManifest(manifest: XhsImageArtifactManifest): QualityIssue[]
```

`convertToNativeFormat(markdown, 'xiaohongshu', { xiaohongshuImageManifest })` may echo the
manifest in `NativeExportResult.artifacts.xiaohongshuImageManifest`. That field means local
preflight only. It must not be displayed or logged as platform upload, preview, sync, or publish
success.

#### 3. Contracts

- Pages are ordered 1..N without gaps or duplicates.
- Exactly one page is the cover, and the cover must be page 1 unless a future real XHS entry
  proves a different cover-selection contract.
- `exists: true` is required before reporting local readiness; missing file proof is blocked.
- `bodyReferences` must reference real pages, and optional `referencedByBody` must match it.
- `ratio` must be in the configured allowed ratio set and match actual `width / height`.
- `format` must be in the configured allowed format set.
- `bytes` must be a positive real value and remain below the configured max bytes.
- `cropStatus='overflow'` is blocked; `warning` and `unknown` remain warnings.

#### 4. Validation & Error Matrix

| Condition | Issue id | Severity |
|-----------|----------|----------|
| no pages or over configured page limit | `xhs-image-manifest-count-mismatch` | error |
| duplicated/gapped page numbers or cover not on page 1 | `xhs-image-manifest-page-order` | error |
| any page lacks `exists: true` | `xhs-image-manifest-missing-file` | error |
| no cover page | `xhs-image-manifest-cover-missing` | error |
| multiple cover pages | `xhs-image-manifest-cover-duplicate` | error |
| body references a missing page or `referencedByBody` disagrees | `xhs-image-manifest-reference-mismatch` | error |
| unsupported ratio or declared ratio does not match dimensions | `xhs-image-manifest-ratio-unsupported` | error |
| unsupported image format | `xhs-image-manifest-format-unsupported` | error |
| missing, zero, or over-limit bytes | `xhs-image-manifest-bytes-limit` | error |
| `cropStatus='overflow'` | `xhs-image-manifest-crop-overflow` | error |
| `cropStatus='warning'` or `'unknown'` | `xhs-image-manifest-crop-overflow` | warning |

#### 5. Good / Base / Bad Cases

- Good: one 1080x1440 PNG page, `ratio='3:4'`, `exists:true`, positive bytes, `cover:true`,
  body reference `[1]`, `referencedByBody:true`, and `cropStatus:'ok'` returns no issues.
- Base: text-only XHS export supplies no manifest. The native text output stays unchanged and no
  artifact success is claimed.
- Bad: duplicate page numbers, missing file proof, duplicate cover, unsupported format,
  mismatched 1:1/3:4 dimensions, invalid references, over-limit bytes, or crop overflow all block
  local artifact readiness.

#### 6. Tests Required

- Unit/regression tests must call `validateXhsImageArtifactManifest()` directly for both bad and
  valid manifests.
- `convertToNativeFormat(..., 'xiaohongshu')` tests must assert that valid manifests appear in
  `artifacts.xiaohongshuImageManifest` and that manifest issue ids merge into `qualityReport`.
- Cross-platform export tests must continue proving that WeChat/Zhihu behavior does not change
  when no XHS manifest is supplied.
- Browser/CloakBrowser evidence may prove local UI visibility and artifact state labels only. It
  never proves XHS upload or publish.

#### 7. Wrong vs Correct

Wrong:

```ts
return { platform: 'xiaohongshu', format: 'text', content, published: true }
```

Correct:

```ts
return {
  platform: 'xiaohongshu',
  format: 'text',
  content,
  qualityReport: withAdditionalQualityIssues(report, manifestIssues),
  artifacts: { xiaohongshuImageManifest },
}
```

The correct shape preserves the plain-text publishing contract and exposes artifact preflight
without pretending to own the account upload/publish boundary.

### Zhihu Image Artifact Manifest Preflight

#### 1. Scope / Trigger

Use this contract whenever Zhihu export claims local readiness for formula images, diagram
images, table images, inline images, covers, or SVG/card image fallbacks. It is a local and
host-readiness preflight only; it is not a Zhihu account upload, editor preview, sync, or publish
proof.

#### 2. Signatures

```ts
export type ZhihuImageArtifactKind = 'inline-image' | 'formula-image' | 'diagram-image' | 'table-image' | 'cover'
export type ZhihuImageArtifactFormat = 'jpg' | 'jpeg' | 'png' | 'gif'
export type ZhihuImageHostStatus = 'platform-hosted' | 'public-https' | 'local-only' | 'missing' | 'blocked'

export interface ZhihuImageArtifact {
  id: string
  kind: ZhihuImageArtifactKind
  sourceSrc: string
  finalSrc: string
  fileName?: string
  exists?: boolean
  uploaded?: boolean
  hostStatus: ZhihuImageHostStatus
  width?: number
  height?: number
  format?: ZhihuImageArtifactFormat
  bytes?: number
  alt: string
  caption?: string
  textFallback?: boolean
  referencedByMarkdown?: boolean
}

export interface ZhihuImageArtifactManifest {
  artifacts: ZhihuImageArtifact[]
  markdownReferences?: string[]
  requirePlatformUpload?: boolean
  allowedFormats?: readonly ZhihuImageArtifactFormat[]
}

export function validateZhihuImageArtifactManifest(
  manifest: ZhihuImageArtifactManifest,
  finalMarkdown?: string,
): QualityIssue[]
```

`convertToNativeFormat(markdown, 'zhihu', { zhihuImageArtifactManifest })` may echo the manifest
in `NativeExportResult.artifacts.zhihuImageArtifactManifest`. That field means local/platform-host
preflight only. It must not be displayed or logged as Zhihu upload, preview, sync, or publish
success.

#### 3. Contracts

- Final Markdown image references must be stable public HTTPS or a real platform-hosted URL.
- `file:`, local paths, `blob:`, `data:`, `http:`, private-network/localhost URLs, temporary
  preview URLs, missing `finalSrc`, and WeChat-only CDN dependencies are blocked.
- `hostStatus='platform-hosted'` requires `uploaded:true`; without real upload proof, keep the
  capability `blocked` / `unavailable`.
- `requirePlatformUpload:true` requires every artifact to be `platform-hosted`.
- Before platform upload, artifacts must prove local file existence with `exists:true` and a
  positive `bytes` value.
- Every artifact needs non-empty `alt`. Formula, diagram, table, and semantic images also need a
  `caption` or `textFallback:true` so rasterization does not erase meaning.
- Formats default to JPG/JPEG/PNG/GIF and can be narrowed or expanded by manifest
  `allowedFormats` only when tests and platform evidence are updated together.
- If `finalMarkdown` or `markdownReferences` are supplied, every Markdown image URL must be in
  the manifest, and `referencedByMarkdown` must match the final Markdown state.

#### 4. Validation & Error Matrix

| Condition | Issue id | Severity |
|-----------|----------|----------|
| no artifacts | `zhihu-image-manifest-empty` | error |
| blocked or missing final host, or non-platform host when platform upload is required | `zhihu-image-manifest-host-blocked` | error |
| platform-hosted artifact lacks `uploaded:true` | `zhihu-image-manifest-upload-missing` | error |
| non-uploaded artifact lacks `exists:true` | `zhihu-image-manifest-missing-file` | error |
| missing alt | `zhihu-image-manifest-alt-missing` | error |
| semantic image lacks caption/text fallback | `zhihu-image-manifest-caption-missing` | error |
| missing or unsupported format | `zhihu-image-manifest-format-unsupported` | error |
| width or height is explicitly zero/negative | `zhihu-image-manifest-dimension-invalid` | error |
| non-uploaded artifact lacks positive bytes | `zhihu-image-manifest-bytes-invalid` | error |
| final Markdown image references and manifest records diverge | `zhihu-image-manifest-reference-mismatch` | error |

#### 5. Good / Base / Bad Cases

- Good: one `diagram-image` artifact with `finalSrc` on `https://picx.zhimg.com/...`,
  `hostStatus:'platform-hosted'`, `uploaded:true`, positive dimensions, `format:'png'`,
  non-empty alt, caption, and `referencedByMarkdown:true` returns no issues and is echoed in
  `artifacts.zhihuImageArtifactManifest`.
- Base: text-only Zhihu export supplies no manifest. Clean Markdown output stays unchanged and
  no image artifact readiness is claimed.
- Bad: `data:` finalSrc, missing platform upload proof, missing local file proof, empty alt,
  semantic fallback without caption/text fallback, unsupported format, zero dimensions, invalid
  bytes, or Markdown reference mismatch all block local artifact readiness.

#### 6. Tests Required

- Unit/regression tests must call `validateZhihuImageArtifactManifest()` directly for both bad
  and valid manifests.
- `convertToNativeFormat(..., 'zhihu')` tests must assert valid manifests appear in
  `artifacts.zhihuImageArtifactManifest` and that manifest issue ids merge into `qualityReport`.
- Cross-platform export tests must continue proving WeChat and XHS behavior does not change when
  no Zhihu manifest is supplied.
- Browser/CloakBrowser evidence may prove local UI visibility and artifact state labels only. It
  never proves Zhihu account upload, preview, sync, or publish.
- The style catalog must surface this proof boundary too. Zhihu choices whose primary or fallback
  output is `image-fallback`, plus `zhihu-public-image-upload-checklist`, must include both
  `public-image-host` and `zhihu-artifact-manifest` in `getStyleChoiceProofRequirements()`.

Platform style parity matrix:

| Source style family | WeChat | Xiaohongshu | Zhihu |
|---------------------|--------|-------------|-------|
| headline/card/body HTML blocks | inline style HTML | plain text summary or image page | Markdown headings/quotes/lists |
| static SVG motifs | inline WeChat-safe SVG | raster image page / removed from body | image fallback / removed from Markdown |
| interactive SVG | opt-in candidate with mobile proof | unavailable; use image/video/long image | unavailable; use image/link/text |
| free layout/layers/backgrounds | safe inline flow or raster fallback | primary as image artifact | image fallback only |
| formulas/diagrams/tables | text/SVG/PNG fallback with WeChat checks | image page/long image or text summary | clean Markdown or public image fallback |

---

## 4. Validation & Error Matrix

| Condition | Result |
|-----------|--------|
| `render()` emits `class=` / `<style>` / `var(` / `calc(` / `<div>` / `foreignObject` | `checkWechatSafe` non-empty → `assertWechatSafe` throws |
| `render()` emits `<defs>/<linearGradient>/<clipPath>/<mask>/<filter>/<use>` or `url(#)` | flagged (id-referenced, WeChat-fragile) |
| outer `<svg width="1080">` (fixed px) | flagged `no-fixed-svg-width`; use `width="100%"` + viewBox |
| SMIL `begin="touchstart"` | flagged `no-bad-smil-trigger`; use `begin="click"` |
| final HTML hides an editable `<img>` with `opacity:0` and overlays an SVG/background image | platform-rule FATAL; do not report as WeChat-safe even if the SVG fragment itself passes |
| final HTML wraps readable text in `line-height:0` or fixed width/height content containers | platform-rule FATAL; use normal flow, responsive widths, and visible line-height |
| final HTML uses ordinary prose inside `<pre>` or `text-align:start/end` | platform-rule FATAL; convert to paragraphs/sections and `left/center/right/justify` |
| `OPAQUE_TAGS` missing `'svg'` | U+202F injected into `<text>` → glyph corruption (regression) |
| `enableSvgModules` undefined/false AND non-flagship preset | NO injection — current behavior preserved (zero regression) |

---

## 5. Good / Base / Bad Cases

- **Good**: flagship preset `decorate = chainDecorators(composeSvgDecorate(plan,{primaryColor,persona}), decorateFlagshipH2/H3/Blockquote/Lists/FooterCard(palette))`; plan is now **graphics-only** `{ cover, replaceHr }` (cover banner + divider stay SVG), and every **text-bearing** node (H2/H3/blockquote/lists/footer) is emitted as an inline-styled HTML color block (see §8); every emitted `<section data-ink-svg>` still passes `checkWechatSafe`.
- **Base**: a static module using only `<rect>/<text>/<circle>` + solid fills + `width="100%"`.
- **Bad**: using `<linearGradient id="g">` + `fill="url(#g)"` (dies — WeChat strips `id`), or `style="transform:rotate(45deg)"` (stripped by `enforcePlatformCSS`), or a horizontal full-width-stripe vessel mark (brand "flag-trap", rejected — see `feedback_logo_flag_trap`).

---

## 6. Tests Required

- `svg-modules/__tests__/wechat-safe.test.ts` — positive/negative for each rule.
- `svg-modules/__tests__/registry.test.ts` — 26 modules, unique ids, every module × 4 persona → `checkWechatSafe()===[]`.
- `svg-modules/__tests__/inject.test.ts` — anchor replacement, **idempotency** (decorate twice = identical), preview inline vs xhs/zhihu rasterize seam.
- `services/export/__tests__/flagship-pipeline-smoke.test.ts` — real `convertToWechatWithStats` end-to-end: each flagship plan's module ids present, every `<section data-ink-svg>` block `checkWechatSafe===[]` AFTER full pipeline, idempotent, non-flagship preset emits **no** `data-ink-svg`/`<svg>`.
- Assertion points: `data-ink-svg` present, outer `<svg>` has `width="100%"`+`viewBox`, zero safe violations, `generatePersonaBaseCSS` still has `min(22em` + `font-size: 17px` (20-22 CJK chars/line lock unchanged).
- Platform leakage tests are required for every new family: XHS output must not contain
  `<svg>`, `<section data-ink-block>`, HTML tags, or raw Markdown control leakage; Zhihu output
  must not contain WeChat decorations or inline CSS dependency.
- XHS negative tests must include image manifest/page-count/reference mismatch, stale cover
  references after reorder/delete, missing image files, unsupported format, oversized artifact,
  configured page-count limit violation, raw Markdown leakage, hashtag overload, long plain-text
  list runs, and overlong plain-text lines. Manifest/page/format mismatches are blockers;
  hashtag, list, and line-length findings are readability warnings because market guidance
  differs by category and account.
- Zhihu negative tests must include blocked image hosts (`file:`, local paths, `blob:`, `data:`,
  localhost/private IPs, temporary preview URLs, and WeChat CDN), missing alt text on fallback
  images, raw diagram fences for Mermaid/Graphviz/DOT/PlantUML/PUML/Vega/Vega-Lite, residual
  HTML after cleanup, invalid Markdown table separators, semantic formula/diagram/table image
  fallbacks without nearby caption/text explanation, unlabeled fenced code blocks when the source
  language is knowable, complex table fallback requirements, and
  `ZhihuImageArtifactManifest` host/upload/file/format/dimension/bytes/reference mismatches.

---

## 7. Wrong vs Correct

### Wrong
```ts
// dies in WeChat: id stripped → gradient ref breaks; class stripped; style-transform stripped
return `<div class="hd"><svg width="1080"><defs><linearGradient id="g">…</linearGradient></defs>
  <rect fill="url(#g)" style="transform:rotate(2deg)"/><text>${title}</text></svg></div>`
```

### Correct
```ts
import { svgSection, rect, textLine } from './primitives'
// width:100% + viewBox, <section> not <div>, solid fill, transform as attribute, sentinel via svgSection
return svgSection({ moduleId: 'header-ribbon', viewBoxW: 1080, viewBoxH: 180,
  body: rect({ x: 0, y: 0, width: 1080, height: 96, fill: palette.accent })
      + textLine({ x: 48, y: 64, text: title, fill: palette.onAccent, fontSize: 44 }) })
// assertWechatSafe(out) passes; survives juice → postProcess → enforcePlatformCSS → compliance
```

---

> **Gotcha**: SVG injection is **opt-in**. Only the 3 flagship presets
> (`flagship-kiln`/`flagship-tempera`/`flagship-amber`) or `ExportOptions.enableSvgModules`
> trigger it. The original 12 wechat + 5 xhs + 3 zhihu presets stay SVG-free. Flagship SVG
> is **brand-color-locked** by design (the `decorate` closure captures the preset's brand
> color; Inspector `primaryColor` override recolors CSS parts only, not the SVG identity).

---

## 8. HTML Block Layer (`svg-modules/html-blocks.ts`) — premium upgrade 2026-06-02

**Why**: SVG `<text>` is single-line, non-reflowing, non-selectable and truncates long CJK
titles; a flagship built purely from thin SVG line-art reads as "plain markdown + green lines"
on a phone. Premium WeChat accounts get their "designed" look from **inline-styled SOLID-color
HTML block containers** on live, reflowing text. WeChat's `postProcessForWechat` (wechat.ts
~:928-963) **KEEPS** inline `color/background-color/background(solid)/border/border-left/
border-radius/padding/margin/box-shadow(non-inset)/font-*/text-align/line-height/letter-spacing/
display:inline-block/vertical-align` and **STRIPS** `class/id/<style>/var()/calc()/gradient/
transform/transition/animation/filter/flex/grid/gap/clip-path/mask/box-shadow-inset/position:fixed`.

**Architecture split**: SVG (`svgSection`) only for pure-graphic motifs (cover banner, dividers,
decorative quote glyph, callout icons, vessel mark). **HTML blocks** for all text-bearing nodes.

```ts
// svg-modules/html-blocks.ts — factory decorators, chained AFTER composeSvgDecorate
decorateFlagshipH2(palette, { variant: 'kiln'|'tempera'|'amber' })  // kiln=solid filled bar; tempera=01 number-chip + bottom accent rule; amber=left bar + "PART 0N" kicker. <h2>→<section><p>. counter resets per call.
decorateFlagshipH3(palette)        // <h3>→ left accent bar + tint plate (quieter than H2)
decorateFlagshipBlockquote(palette)// <blockquote>→ tinted QUOTE CARD (border-left + bg tint + big quote glyph + attribution); or CALLOUT box (icon + label) when first line matches 提示|注意|重点|警告|要点|Note|Tip|Warning. PRESERVES inner HTML (does NOT flatten to text).
decorateFlagshipLists(palette)     // <ul>→ accent square markers; <ol>→ accent circular number chips (reset per <ol>)
decorateFlagshipFooterCard(palette,{brand:'墨铸 · InkForge',tagline:'成为作者吧'}) // appended once: paperWarm card + vessel mark + brand + tagline + accent rule + 全文完
```

**Contracts** (enforced by `__tests__/html-blocks.test.ts`):
- Idempotent via `data-ink-block="<id>"` sentinel (run twice == once); per-document counters
  (H2 index, OL numbers) reset **inside** the returned closure, not at factory scope.
- Inline styles only — NO `class`-dependent styling, gradient, `transform:` (NOTE: `text-transform:`
  is allowed), flex/grid, `position:absolute`, `box-shadow ...inset`. Inline `<svg>` icons/marks use
  the WeChat-safe subset (§3): solid fills + opacity, no defs/gradient/`url(#)`/`<use>`.
- NO emoji as icons — inline SVG `<path>` or Unicode geometric punctuation only.
- Run for **both** `preview` and `wechat` targets (inline HTML is WYSIWYG; do NOT skip preview).
- Auto-contrast text on solid fills via `pickOnAccent` = white unless white-on-accent contrast
  < `AA_LARGE (3.0)` → ink. (kiln/tempera→white, amber→ink.)

**Per-preset differentiation** (not just recolor): kiln = boldest solid filled bars (creative);
tempera = number-chip + hairline-rule, calm (academic); amber = left-bar + uppercase "PART" kicker,
structured (business). Each has its own cover kicker chip (专栏/深读/洞察).

**Real-WeChat survival (verified 2026-06-02)**: pasted regenerated `flagship-tempera.html` into the
live mp.weixin.qq.com ProseMirror editor → 5 inline `<svg>`, 18 inline background blocks, 3
border-left accents, 19 border-radius, footer brand, quote cards, number chips ALL survived the
paste sanitizer and render in the PC editor. Evidence: `prompts/0601/evidence/premium-upgrade/`.
Self-feedback loop: render real `markdownToWechat` artifact at 393px viewport (Playwright) → 20-22
CJK chars/line confirmed; faithful to the user's real phone screenshots. This is historical PC
editor paste evidence only. It is not current 2026-06-08 authenticated editor proof, mobile WeChat
preview proof, Dark Mode proof, cover-thumbnail proof, sync proof, or publish proof; see
`prompts/0601/evidence/platform-gate-matrix-20260608.md`.

## 9. Flagship Editorial System — R1→R3 evolution (2026-06-02)

The §8 layer was refined over 3 rounds after the user judged it still "too plain / same as
135编辑器" twice. Design specs: `.trellis/tasks/06-01-multiplatform-render-svg/research/impl-{bold-magazine-direction,brand-system-round2,constructivist-structure-round3}.md`.

**R1 — Bold Magazine.** Added `SvgPalette.accentDeep` = `deriveSvgPalette` darkens accent (blend
toward black, step 0.04) until white text CR ≥ 4.5, so **full-bleed white-reversed blocks always
legible** (kiln `#bf5037`/4.75, tempera `#3b7a6b`/5.02 unchanged, amber `#8b6f3e`/4.73). H2 → full-
bleed `accentDeep` block + giant reversed number. Covers → top full-bleed accent band masthead
(`renderCoverTitle`) / full-color cover (`renderCoverGrid`, kiln). Title fontSize 100, weight 800,
≥9 CJK/line, 2 lines, **no truncation guard** (17-char sample fits 18 cap).

**R2 — 墨铸 brand system.** NEW `renderSeal({cx,cy,size,fill,textColor,font,chars=['墨','铸']})` in
`primitives.ts` — 篆刻方印 (rounded-square fill + inset white border + vertical 2-char 印文). Used:
cover bottom-right + footer colophon. Cover masthead nameplate: 「kicker · · · 墨铸 / MOZHU PRESS ·
SERIAL」 + double hairline rule. NEW `decorateFlagshipLede(palette)` (chain FIRST) — opening
paragraph first char → cast versal (accentDeep square, reversed white); targets first `<p>` that is
**outside any `<blockquote>` range**, text ≥24 chars, not matching `/阅读|分钟|全文.*字/` (skips the
reading-meta). `dividers.ts` divider-{diamond,grid,forge} bolded + brand motif. Footer → colophon
(double rule + 全文完 + seal stamp). Flagship `#nice strong` highlight rgba 0.12→0.18 + `border-bottom`.

**R3 — Constructivist structure (current).** H2/H3/quote/lists rebuilt with the brand grid×diamond
geometry (recurring motif = "formed" identity, not generic colored bars). Inline-`<svg>` motif
helpers in `html-blocks.ts`: `gridNumberSvg` (white-stroked square + registration tick + reversed
number), `gridSquareMark` (2×2 grid: stroke + cross + filled top-left cell), `diagonalCornerSvg`
(filled triangle + inset white square), `diamondTerminalSvg`, `diamondMarkerSvg`. New forms:
- **H2** = full-bleed `accentDeep` block (kept bold) + **方格铸号** gridNumber + reversed heading +
  **方格 rhythm baseline** (border-top rule + 3 filled/outline squares). Unified across presets (hue only).
- **H3** = `gridSquareMark` anchor + ink heading + bottom hairline (dropped the tint plate).
- **Blockquote QUOTE branch** = asymmetric constructivist block: 7px left accent bar + `diagonalCornerSvg`
  top-left + larger quote text + `diamondTerminalSvg` end-mark (dropped the symmetric tinted card + 66 glyph).
  **CALLOUT branch unchanged.**
- **Lists**: UL → `diamondMarkerSvg`; OL chip → square (`border-radius:3px`) cast-number, not circle.

**Verification (2026-06-02, R3)**: 869/869 export tests, vue-tsc + eslint clean. Real-WeChat paste
recheck of `flagship-tempera.html` into live mp.weixin.qq.com editor → **14 inline `<svg>`, 11
background blocks, 2 seals (墨/铸 ×2 each), MOZHU PRESS masthead, versal, 全文完 colophon, grid-numbers,
diamonds ALL survived** the sanitizer and render; 0 gradient/var()/real-transform. Evidence:
`prompts/0601/evidence/tune-0602/` (t3-seg1-4 @393px + realwechat-r3-editor-*). This remains
historical PC editor paste evidence only; it must not be cited as mobile, Dark Mode, cover,
sync, scheduled-send, or publish proof.

## 10. Style Proof Progress Report

`getPlatformStyleProofProgressReport(platform, manifests)` is the service boundary for aggregating
real redacted `StyleProofManifest` evidence into platform, style-choice, and collection-gate
progress rows.

Contracts:
- The function accepts only caller-supplied manifests. It may merge existing artifacts for the same
  platform and style choice, but it must not create proof artifacts.
- Manifests whose platform or `choiceId` does not belong to the requested platform are excluded and
  counted in `ignoredManifestCount`; evidence must not leak between WeChat, Xiaohongshu, and Zhihu.
- Every choice is evaluated in `style-choice` scope by reusing `getStyleProofManifestReport()`.
  Missing, invalid, satisfied, accepted, sensitive, and unsafe commit states therefore stay aligned
  with the manifest validator.
- Gate progress must use the same ordered gate map as
  `getPlatformStyleProofCollectionPlan()` and `getPlatformStyleProofCollectionQueue()`.
  Local and hygiene gates may be reported as safe to automate; authenticated editor, phone,
  credentialed, public host, and publish gates must stay separate.
- `blockedByCatalog` choices stay visible in the progress report, but progress must never promote
  `blocked` or `unavailable` choices to usable/selectable/publishable.
- This report is a local proof accounting API. It is not a paste, phone preview, sync, scheduled
  send, upload, public host, or publish success signal.

Required tests:
- A redacted manifest with valid unit/local/hygiene artifacts must increase satisfied counts while
  leaving stronger PC, phone, and publish gates missing.
- Invalid or unsafe artifacts must count at both choice and gate level.
- Blocked WeChat flagship choices must remain blocked even when a manifest exists.
- Cross-platform manifests must be ignored for the requested platform.

## 11. Style Proof Manifest Pack Report

`getStyleProofManifestPackReport(manifests)` is the multi-platform intake boundary for a batch of
redacted style proof manifests.

Contracts:
- The pack report must call `getPlatformStyleProofProgressReport()` separately for WeChat,
  Xiaohongshu, and Zhihu. Cross-platform manifests must appear only as ignored inputs for the
  non-target platform reports.
- The pack report must reuse `validateStyleProofManifest()` for per-manifest issues, then add
  pack-level issues for unknown choices, platform/choice mismatch, and duplicate artifact ids.
- Duplicate artifact ids are errors because gate and hygiene reports must point to exactly one proof
  record.
- Multiple artifact fingerprints for the same platform and style choice are errors. Progress must
  not merge local, phone, credentialed, or publish proof artifacts from different exported artifacts
  into one satisfied gate state.
- Manifests without a style `choiceId` can remain valid evidence-label manifests, but they are not
  usable for style-choice progress and must not be silently applied to every choice.
- `blocked` and `unavailable` catalog choices must force an invalid progress state even when every
  proof requirement has an artifact. Progress can document collected evidence for those choices, but
  it must not count them as proof-satisfied choices.
- The pack report is still local proof accounting. It must not report paste, phone preview, sync,
  upload, public host acceptance, scheduled send, or publish success.

Required tests:
- A pack containing WeChat and Zhihu manifests with the same artifact id must report a duplicate id.
- Unknown style choices must be reported at pack level and by manifest validation.
- Same-choice fingerprint mismatch must be reported by both platform progress and pack reports.
- A fully evidenced blocked choice must remain invalid and must not increase `proofSatisfiedChoices`.
- WeChat, Xiaohongshu, and Zhihu platform reports must keep `choicesWithManifest` and
  `ignoredManifestCount` isolated.

## 12. Strong Proof Gate Negative Regression

Strong platform gates must fail closed when a manifest tries to reuse weaker evidence.

Contracts:
- `authenticated-editor-reachable` and `pc-editor-dom-readable` prove only reachability/readability
  of the PC editor. They must not satisfy phone preview, credentialed sync, publish, or safe draft
  requirements.
- `local-browser` proves local browser/Tauri rendering only. It must not satisfy phone screenshot,
  cover thumbnail, credentialed sync, or published/platform-preview requirements.
- A PC `ClipboardEvent`/`DataTransfer` readback can count only as channel-specific
  `pc-editor-paste` evidence. It must not satisfy `safe-disposable-draft`; draft safety requires
  an explicit safe-draft artifact, not an inferred paste/readback artifact.
- `safe-disposable-draft` requires `action:'safe-disposable-draft'`, `channel:'platform-editor'`,
  and `disposableDraft:true`.
- `cover-thumbnail-check` requires `channel:'phone-preview'`.
- `sync-readback` requires `channel:'credentialed-channel'`.
- `published-url-or-platform-preview` requires `channel:'public-web'` or `channel:'phone-preview'`.
- Progress reports must surface these failures as invalid authenticated-PC, phone-preview,
  credentialed-channel, or platform-publish gates and must not increase `proofSatisfiedChoices`.

Required tests:
- A manifest that tries to satisfy safe draft with a PC paste/ClipboardEvent artifact must keep
  `safe-disposable-draft` invalid.
- PC DOM, authenticated editor, and local browser artifacts must keep phone preview,
  credentialed sync, and publish requirements invalid.
- The matching `getPlatformStyleProofProgressReport()` gate rows must remain invalid, not
  satisfied or missing.
