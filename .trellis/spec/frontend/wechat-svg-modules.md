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
- `StyleProofArtifact.phonePreviewContentVerified === true` is required for
  `phone-preview-readback` and `phone-screenshot`, and phone screenshot proof must also carry
  `exactArtifact:true` on the same screenshot artifact. A scan page, preview entry, setup dialog,
  cover-setting page, or PC backend DOM readback is not phone-side final article content. Keep
  those as blocked/setup evidence until the exact artifact is visible in the phone preview article
  body.
- `StyleProofArtifact.darkModeEnabledVerified === true` is required for `dark-mode-check`, and
  `StyleProofArtifact.coverThumbnailAccepted === true` is required for
  `cover-thumbnail-check`. An ordinary phone screenshot, cover setup page, or draft-settings
  panel can show progress, but it cannot prove the phone preview was inspected with mobile Dark
  Mode enabled or that the platform preview/share/list entry accepted the exact cover thumbnail.
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
- `getPlatformStyleProofExecutionRunbook()` is the executable operator runbook above the
  acceptance audit. It maps each proof requirement to the required channel/action/readback,
  artifact fields such as `ordinaryClipboardPasteVerified` and `phonePreviewContentVerified`,
  redaction boundary, failure signals, and `cannotClaimReason`. It is still a local accounting
  layer: it must not click platforms, create artifacts, sync, upload, publish, or upgrade
  `selectable` / `usable` decisions.
- ExportModal may surface this plan in the style capability cards as proof summaries and gate
  labels. That UI is informational only: it must not change `selectable`, `usable`, `blocked`, or
  `unavailable` decisions, and it must keep local evidence, PC editor proof, phone preview,
  credentialed channel, public host, platform publish, and sensitive-hygiene gates visually
  distinct.
- `getCommittedStyleProofLocalEvidenceManifests()` returns a cloned pack of repo-committed,
  redacted local evidence manifests for the flagship WeChat local/Tauri evidence already stored
  under `prompts/0601/evidence/`. `getCommittedStyleProofLocalEvidenceAuditReport()` runs the
  normal acceptance audit over that pack. These helpers are explicit local-evidence entry points:
  they must not be consumed as default platform proof, and they must not complete phone preview,
  PC editor paste, credentialed sync, public host, scheduled-send, or publish gates.
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
- 2026-06-17 CloakBrowser DOM refresh strengthens that rule with concrete applied evidence:
  a 135 ordinary style click changed the center UEditor iframe from five to six
  `section._135editor` blocks. Nested sections, inline styles, `data-tools`, `data-id`,
  image metadata, third-party image hosts, flex, transforms, rotations, and assistant/editor
  classes may inform InkForge-owned hierarchy and rhythm only; none may be retained in runtime
  output.
- 2026-06-17 135 SVG editor proof remains authoring-structure proof. Trial effects such as
  popup, carousel, fan-carousel/red-packet, and click-move/scale/disappear/expand appeared as
  canvas blocks with image placeholders, hidden controls, parameter panels, and editor SVG icons.
  Translate them into source-owned image-slot manifests, trigger-zone manifests, motion parameter
  schema, block ordering, static-expanded fallback, raster fallback, and mobile-preview gates.
- 2026-06-17 Xiumi SVG-gallery proof showed that a clicked SVG-gallery sample can insert
  image/layer/action cells with zero literal SVG/SMIL in the center document. Do not infer inline
  SVG availability from Xiumi library preview SVG counts. Xiumi `tn-*`, `ng-*`, action/layer,
  flow-canvas, third-party asset host, plugin/copy/sync/export, and line-height-zero authoring
  state must become readable DOM order, image manifests, layout reports, or fallback artifacts.
- 2026-06-17 CloakBrowser refresh adds a stricter evidence split: a library/category/item click
  that changes only the left library or settings panel is `market-template-listing`, not
  `applied-editor-element`. It may update taxonomy and risk labels, but cannot justify a runtime
  rule by itself. A market editor click is `applied-editor-element` only when the central
  editor/canvas/paper changes and the after-state DOM is read. In that 2026-06-17 refresh, 135 SVG
  and 135 ordinary editor clicks met that bar; Xiumi remained a center-unchanged probe.
- 2026-06-18 Xiumi v5 applied-element rerun met the central-change bar for SVG, title, and card
  samples. The SVG category changed the left list from 23 to 43 template items, and clicking the
  first visible SVG sample changed `.tn-editing-panel` by `htmlLength +32007`, `tnComp +15`,
  `tnCell +18`, `contenteditable +1`, `img +3`, and `tnUuid +15`. Title and card samples also
  mutated the center paper (`tnComp +6` / `tnCell +7` and `tnComp +17` / `tnCell +21`
  respectively). These are authoring DOM lessons only: `tn-comp-inst`, `tn-cell-inst`, `tn-uuid`,
  `tn-cell-type`, `opera-tn-ra-*`, `disable-tn-*`, `ng-*`, and `statics.xiumi.us` references are
  residue signals or fallback-manifest inputs, not reusable InkForge source and not WeChat proof.
- 2026-06-18 Xiumi Angular runtime refresh: applied Xiumi SVG/title/card content left the center
  `.tn-editing-panel` with 4905 `ng-*` attributes, 83 `tn-uuid` values, 184 `opera-tn-ra-*`
  bindings, 38 `statics.xiumi.us` references, 99 images, and zero center inline SVG. Treat
  Angular/Vue authoring attributes such as `ng-model`, `ng-include`, `ng-controller`,
  `ng-change`, `ng-hide`, and authoring classes such as `ng-scope`, `ng-binding`, `ng-hide`,
  `ng-pristine`, `ng-valid`, and `ui-sortable` as publish-blocking residue even when a copied
  fragment no longer includes `tn-*` markers.
- 2026-06-18 Xiumi editable-surface refresh: the same applied center panel contained 19
  `contenteditable` text cells. Treat `contenteditable` as an editor runtime surface marker, not
  article semantics. It must be blocked from publishable WeChat/XHS/Zhihu output even when the
  copied fragment has no remaining vendor class, `tn-*`, `ng-*`, or hosted-media marker.
- 2026-06-17 executable manifest contract: `StyleProofArtifact.centralEditorChanged === true`
  is now required for `market-applied-dom-readback`. A library/category/item selection,
  preview-library SVG count change, or settings-panel readback may inform taxonomy, but it must
  remain invalid for `applied-editor-element` until the center editor/canvas/paper visibly changes
  and the after-state DOM/controls are read.
- 2026-06-17 executable manifest contract: `StyleProofArtifact.ordinaryClipboardPasteVerified === true`
  is now required for `pc-editor-paste-event`. A programmatic `ClipboardEvent('paste')` or
  `DataTransfer` readback may remain useful PC-channel diagnostics, but it must stay invalid for
  ordinary user Ctrl+V rich HTML/SVG paste until the authenticated PC editor preserves the exact
  artifact through the normal clipboard path.
- 2026-06-09 runtime gate: the export quality detector now turns that no-copy boundary into
  platform errors. `wechat-market-editor-residue`, `xhs-market-editor-residue`, and
  `zhihu-market-editor-residue` block 135/Xiumi authoring classes, `data-tools`, copied numeric
  market style ids, `tn-*`/`ng-*` authoring attributes, and third-party market image sources.
  Plain prose that merely mentions 135/Xiumi is allowed. This gate is unit-tested and must stay
  separate from WeChat paste/mobile/sync/publish proof labels.
- 2026-06-20 public-source refresh: WeChat's official editor plugin specification is a stronger
  rule source than market tutorials. Keep opacity-hidden images under SVG backgrounds,
  text-bearing `line-height:0`, fixed width/height content containers, `text-align:start/end`,
  ordinary paragraphs in `<pre>`, and SVG animations that only begin on `touchstart` as blockers.
  The official editor JSAPI and public OSS formatter docs are channel/workflow references only:
  their existence does not satisfy InkForge paste, phone preview, Dark Mode, cover thumbnail,
  credentialed sync, scheduled-send, or publish proof. Reject public advice that adds publishable
  `<style>` blocks or media queries inside SVG unless exact artifact evidence later proves it.
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

// utils.ts - WeChat clipboard boundary only; normal preview/export HTML stays raw UTF-8
export function encodeNonAsciiHtmlEntities(html: string): string
export function prepareWechatClipboardHtml(html: string): string
export function prepareWechatClipboardPlainText(html: string): string
export function copyWechatHtmlToClipboard(html: string): Promise<boolean>

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
export type StyleProofAcceptanceAuditStatus =
  | 'completed' | 'missing' | 'invalid' | 'blocked-by-external' | 'unsafe-to-automate'
export interface StyleProofAcceptanceRequirementAudit {
  requirement: StyleProofRequirement
  gate: StyleProofCollectionGate
  status: StyleProofAcceptanceAuditStatus
  issueCount: number
  issueIds: readonly StyleProofManifestIssueId[]
  cannotClaim: boolean
}
export interface PlatformStyleProofAcceptanceAuditReport {
  platform: Platform
  progress: PlatformStyleProofProgressReport
  gates: readonly StyleProofAcceptanceGateAudit[]
  requirements: readonly StyleProofAcceptanceRequirementAudit[]
  cannotClaim: readonly StyleProofAcceptanceRequirementAudit[]
  nextLocalSafeAction: StyleProofAcceptanceNextAction | null
  nextExternalAccountAction: StyleProofAcceptanceNextAction | null
  nextPhoneAction: StyleProofAcceptanceNextAction | null
  nextUnsafeToAutomateAction: StyleProofAcceptanceNextAction | null
}
export function getPlatformStyleProofAcceptanceAuditReport(
  platform: Platform,
  manifests?: readonly StyleProofManifest[],
): PlatformStyleProofAcceptanceAuditReport
export function getStyleProofAcceptanceAuditReport(
  manifests?: readonly StyleProofManifest[],
): StyleProofAcceptanceAuditReport
export type StyleProofArtifactVerificationField =
  | 'artifactFingerprint' | 'artifactRef' | 'exactArtifact'
  | 'ordinaryClipboardPasteVerified' | 'phonePreviewContentVerified'
  | 'darkModeEnabledVerified' | 'coverThumbnailAccepted'
  | 'safeForCommit' | 'hostStatus' // representative; see runtime type for the full union
export type StyleProofExecutionBoundary =
  | 'local-only' | 'market-editor-account' | 'authenticated-pc-editor' | 'phone-preview'
  | 'public-host' | 'credentialed-channel' | 'platform-publish'
export interface StyleProofExecutionArtifactContract {
  requirementId: StyleProofRequirementId
  requiredChannels: readonly StyleProofChannel[]
  requiredActions: readonly StyleProofAction[]
  requiredReadbacks: readonly StyleProofReadback[]
  requiredFields: readonly StyleProofArtifactVerificationField[]
}
export interface StyleProofExecutionRunbookStep {
  platform: Platform
  requirement: StyleProofRequirement
  gate: StyleProofCollectionGate
  status: StyleProofAcceptanceAuditStatus
  boundary: StyleProofExecutionBoundary
  requiredArtifact: StyleProofExecutionArtifactContract
  cannotClaimReason: string | null
  successCriteria: readonly string[]
  failureSignals: readonly string[]
  redactionBoundary: string
}
export function getPlatformStyleProofExecutionRunbook(
  platform: Platform,
  manifests?: readonly StyleProofManifest[],
): PlatformStyleProofExecutionRunbook
export function getStyleProofExecutionRunbook(
  manifests?: readonly StyleProofManifest[],
): StyleProofExecutionRunbook

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
  `StyleProofManifest` evidence for this label must set `centralEditorChanged:true` on the
  `market-applied-dom-readback` artifact; center-unchanged library/listing probes must surface
  `style-proof-manifest-market-editor-not-applied`.
- `authenticated-editor-reachable`: the real WeChat PC article editor is reachable in an
  authenticated browser profile. This proves login/editor access only.
- `pc-editor-dom-readable`: the real WeChat PC editor title/body DOM is readable and visually
  inspected. This proves editor-surface introspection only, not sanitizer retention.
- Authenticated backend dashboard reachability is weaker than both labels above. A redacted
  dashboard readback can confirm the Official Account backend session is alive, but it must not
  satisfy `authenticated-editor-reachable`, `pc-editor-dom-readable`, `pc-editor-paste`,
  `safe-disposable-draft`, `credentialed-sync`, or `published`.
- `unit-tested`: detector/converter tests prove structure only.
- `local-browser`: local Playwright/Tauri/browser rendering proved visibility and no overflow.
- `pc-editor-paste`: authenticated WeChat PC editor accepted and rendered the exact artifact
  through ordinary user Ctrl+V rich HTML/SVG paste; it requires
  `ordinaryClipboardPasteVerified:true`.
- `mobile-preview`: phone preview proved final mobile visibility/interaction/Dark Mode target.
  `phone-preview-readback` requires `phonePreviewContentVerified:true`; `phone-screenshot`
  additionally requires same-artifact `exactArtifact:true`; Dark Mode and cover-thumbnail checks
  remain separate proof rows and cannot substitute for the final article-body readback.
  `dark-mode-check` requires `darkModeEnabledVerified:true`; `cover-thumbnail-check` requires
  `coverThumbnailAccepted:true`.
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
export interface XhsRasterArtifactManifestOptions {
  kind?: XhsImageArtifactKind
  page?: number
  fileName: string
  src: string
  dataUrl?: string
  width?: number
  height?: number
  ratio?: XhsImageArtifactRatio
  format?: XhsImageArtifactFormat
  bytes?: number
  exists?: boolean
  cover?: boolean
  referencedByBody?: boolean
  bodyReferences?: readonly number[]
  cropStatus: XhsImageCropStatus
  limits?: XhsImageArtifactLimits
}
export interface XhsRasterArtifactManifestPackOptions {
  kind?: XhsImageArtifactKind
  artifacts: readonly XhsRasterArtifactManifestOptions[]
  coverPage?: number
  bodyReferences?: readonly number[]
  limits?: XhsImageArtifactLimits
}
export function getDataUrlByteLength(dataUrl: string): number | null
export function inferXhsImageArtifactFormat(input: {
  mime?: string
  fileName?: string
  src?: string
}): XhsImageArtifactFormat | null
export function inferXhsImageArtifactRatio(width: number, height: number): XhsImageArtifactRatio | null
export function createXhsImageArtifactManifestFromRaster(
  options: XhsRasterArtifactManifestOptions,
): XhsImageArtifactManifest
export function createXhsImageArtifactManifestFromRasterArtifacts(
  options: XhsRasterArtifactManifestPackOptions,
): XhsImageArtifactManifest
```

`convertToNativeFormat(markdown, 'xiaohongshu', { xiaohongshuImageManifest })` may echo the
manifest in `NativeExportResult.artifacts.xiaohongshuImageManifest`. That field means local
preflight only. It must not be displayed or logged as platform upload, preview, sync, or publish
success.

`createXhsImageArtifactManifestFromRaster()` is the preferred bridge from a real browser/Tauri
raster output to the manifest validator. It may compute byte length from a PNG/JPEG data URL or
accept explicit local file metadata, but it must still pass `validateXhsImageArtifactManifest()`
before any UI or export report marks the artifact locally ready. Missing dimensions, unsupported
ratio/format, missing bytes, missing file existence, or crop uncertainty must stay as thrown errors
or validator issues, not fabricated success.

`createXhsImageArtifactManifestFromRasterArtifacts()` is the multi-page bridge for carousel and
long-image/page packs. It reuses the single-page raster bridge for each real artifact, sorts pages
deterministically, defaults cover to page 1, derives body references from pages whose
`referencedByBody` is not false, and still delegates page continuity, duplicate pages, cover
uniqueness, reference mismatch, file proof, ratio, format, bytes, and crop checks to
`validateXhsImageArtifactManifest()`. It does not upload images or prove XHS platform preview.

Any `StyleProofManifest` artifact that satisfies `xhs-artifact-manifest` must set
`artifactManifestValidated:true` only after `validateXhsImageArtifactManifest()` returns no issues
for the exact redacted manifest being referenced. A manifest-shaped proof row without this flag is
invalid local evidence and must not be treated as XHS upload, platform preview, or publish proof.

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
- Unit tests must cover `createXhsImageArtifactManifestFromRaster()` for data URL and explicit
  file-metadata paths, and must prove bad or incomplete raster metadata is rejected instead of
  producing a fake pass.
- Unit tests must cover `createXhsImageArtifactManifestFromRasterArtifacts()` for multi-page
  carousel packs, deterministic page ordering, derived body references, and validator-caught
  duplicate or mismatched page references.
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

export interface ZhihuImageArtifactManifestItemInput {
  id: string
  kind: ZhihuImageArtifactKind
  sourceSrc: string
  finalSrc: string
  fileName?: string
  exists?: boolean
  uploaded?: boolean
  hostStatus?: ZhihuImageHostStatus
  width?: number
  height?: number
  format?: ZhihuImageArtifactFormat
  bytes?: number
  alt: string
  caption?: string
  textFallback?: boolean
  referencedByMarkdown?: boolean
}

export interface ZhihuImageArtifactManifestOptions {
  artifacts: readonly ZhihuImageArtifactManifestItemInput[]
  markdownReferences?: readonly string[]
  requirePlatformUpload?: boolean
  allowedFormats?: readonly ZhihuImageArtifactFormat[]
}

export function validateZhihuImageArtifactManifest(
  manifest: ZhihuImageArtifactManifest,
  finalMarkdown?: string,
): QualityIssue[]
export function inferZhihuImageArtifactFormat(input: {
  mime?: string
  fileName?: string
  src?: string
}): ZhihuImageArtifactFormat | null
export function inferZhihuImageHostStatus(src: string): ZhihuImageHostStatus
export function createZhihuImageArtifactManifest(
  options: ZhihuImageArtifactManifestOptions,
): ZhihuImageArtifactManifest
```

`convertToNativeFormat(markdown, 'zhihu', { zhihuImageArtifactManifest })` may echo the manifest
in `NativeExportResult.artifacts.zhihuImageArtifactManifest`. That field means local/platform-host
preflight only. It must not be displayed or logged as Zhihu upload, preview, sync, or publish
success.

`createZhihuImageArtifactManifest()` is the preferred bridge from real fallback/public-host
metadata to the Zhihu image artifact validator. It infers final image format and host status, derives
Markdown references when the caller does not supply them, and fails closed: a caller cannot mark a
local/blob/data/http/private/WeChat-CDN URL as `public-https`, cannot mark a public URL as uploaded
platform proof, and cannot satisfy `requirePlatformUpload:true` without explicit
`uploaded:true` plus a recognized platform-hosted final URL. For local/public-HTTPS fallback
records it requires `exists:true`, positive `bytes`, non-empty `alt`, and semantic `caption` or
`textFallback:true`; the returned manifest must still pass `validateZhihuImageArtifactManifest()`.

Any `StyleProofManifest` artifact that satisfies `zhihu-artifact-manifest` must set
`artifactManifestValidated:true` only after `validateZhihuImageArtifactManifest()` returns no
issues for the exact redacted manifest being referenced. This is a local/preflight validator flag;
it does not satisfy Zhihu account upload, editor preview, public article rendering, sync, scheduled
publish, or publish success.

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
- Unit tests must cover `inferZhihuImageArtifactFormat()`, `inferZhihuImageHostStatus()`, and
  `createZhihuImageArtifactManifest()` for public-HTTPS fallback, explicit platform upload proof,
  and rejected fake host/upload metadata.
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
- A PC `ClipboardEvent`/`DataTransfer` readback can count only as channel-specific diagnostics.
  It must not satisfy ordinary `pc-editor-paste-event` unless
  `ordinaryClipboardPasteVerified:true`, and it must not satisfy `safe-disposable-draft`; draft
  safety requires an explicit safe-draft artifact, not an inferred paste/readback artifact.
- Windows CF_HTML preparation, including `inkforge/scripts/set-windows-html-clipboard.ps1`
  `-DryRun`, is local tool readiness only. It must not set `ordinaryClipboardPasteVerified:true`
  until the exact artifact is written to the OS clipboard, inserted by ordinary Ctrl+V into an
  authenticated WeChat PC editor, read back from the editor DOM, and cleaned up through a verified
  disposable draft path.
- A local CloakBrowser OS-keyboard probe that only produces `keydown` events such as
  `key:"Unidentified"` without a `paste` event, `input` event, inserted sentinel, and editor DOM
  readback is negative tooling evidence. It must not be treated as ordinary Ctrl+V proof, and it
  must not trigger a live WeChat paste attempt without a reliable keyboard channel or an explicitly
  separated operator-driven proof path.
- A local CloakBrowser OS-keyboard probe that uses `keybd_event` plus calibrated OS click and
  produces trusted local `Ctrl+V`, `paste`, `beforeinput`, and `input` events is local tooling
  readiness only. Even when a real CF_HTML flagship artifact preserves inline SVG in a controlled
  local `contenteditable`, it must not satisfy `pc-editor-paste-event` until the same exact artifact
  is pasted into an authenticated WeChat PC editor through a disposable draft, read back from the
  editor DOM, and cleaned up with absence/rollback proof.
- 2026-06-18 live WeChat Amber exception: `wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt`
  proves that exact `flagship-amber.html` was written as Windows CF_HTML, inserted into an
  authenticated WeChat PC editor through ordinary OS Ctrl+V via `keybd_event`, read back from the PC
  editor DOM with `svgCount=35`, `dataInkSvgCount=3`, and `dataInkBlockCount=23`, then deleted from
  the deterministic disposable draft with stable and post-reload title-absence checks. This may
  satisfy `pc-editor-paste-event` and `safe-disposable-draft` only for a redacted manifest bound to
  that exact Amber fingerprint. It must not be generalized to Kiln/Tempera, phone preview, mobile
  Dark Mode, mobile SMIL/click behavior, cover thumbnail acceptance, credentialed sync, scheduled
  send, or publish success.
- 2026-06-18 live WeChat Kiln negative proof:
  `wechat-kiln-ordinary-ctrlv-plain-text-cleanup-20260618.txt` records that exact
  `flagship-kiln.html` was written as Windows CF_HTML and inserted into authenticated WeChat PC
  editors through ordinary OS Ctrl+V via `keybd_event`, but both type=10 and type=77 readbacks were
  plain text only (`svgCount=0`, `dataInkSvgCount=0`, `dataInkBlockCount=0`). The failed
  disposable drafts were cleaned up and post-cleanup readback found no current-run Kiln marker,
  failed title, recent draft, or local path residue. This is negative proof and must not satisfy
  `pc-editor-paste-event`, `safe-disposable-draft`, or `ordinaryClipboardPasteVerified:true`.
- 2026-06-19 live WeChat Kiln entity-safe negative proof:
  `wechat-kiln-entity-ordinary-ctrlv-editor-return-cleanup-20260619.txt` records that exact
  `flagship-kiln.html` was transformed with the WeChat clipboard non-ASCII entity rule and written
  as Windows CF_HTML (`sourceSha256=90581eec1c3cb2805ddc235b8d41725795bfeaf2fc3628c707d485201af0d531`,
  `entitySha256=d099275aadb399a7b63792d3fb0c826c66b7bb02aba50d67820fb9b0fa23d335`,
  `svgCount=35`, `dataInkSvgCount=3`, `dataInkBlockCount=23`). The authenticated editor surface was
  reachable before paste setup, and Win32 `keybd_event` ordinary Ctrl+V was sent with the foreground
  window stable. The post-paste readback returned to the draft-list route with no editor
  ProseMirror body, no paste/input/mutation counter state, no deterministic proof title, and no
  `data-ink-svg` / `data-ink-block` marker visible. The current-run untitled draft was identified,
  deleted, and confirmed absent after reload. This is editor-return/no-rich-readback negative proof:
  it must not satisfy `pc-editor-paste-event`, `safe-disposable-draft`,
  `ordinaryClipboardPasteVerified:true`, `pasteInputEventVerified:true`,
  `editorBodyMutationVerified:true`, or `mojibakeFreeVerified:true`, and it must not weaken or
  contradict the Tempera entity-safe success proof.
- 2026-06-18 Kiln paste-safe candidate:
  `flagship-kiln-paste-safe` and `wechat-flagship-kiln-paste-safe` are additive candidates created
  after the exact `flagship-kiln.html` ordinary Ctrl+V negative proof. They preserve the original
  `flagship-kiln` preset, `cover-grid` module, Kiln palette, creative persona, Forge divider, and
  flagship HTML block chain, but use `cover-title` as the first SVG module because that first-block
  shape has a stronger WeChat paste precedent in the Amber proof. The candidate's local CF_HTML /
  `keybd_event` CloakBrowser contenteditable probe preserved `svgCount=35`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, `sectionNice=true`, and first module `cover-title`. This is local
  candidate evidence only: it may satisfy local/browser artifact readiness rows, but it must not
  satisfy `pc-editor-paste-event`, `safe-disposable-draft`, `ordinaryClipboardPasteVerified:true`,
  phone preview, Dark Mode, cover thumbnail, sync, schedule, publish, or any XHS/Zhihu external
  gate until an exact WeChat disposable-draft proof is collected for that candidate artifact.
- 2026-06-18 WeChat Kiln paste-safe tab-mismatch negative proof:
  `wechat-kiln-paste-safe-wechat-ctrlv-tab-mismatch-cleanup-20260618.txt` records that the exact
  `flagship-kiln-paste-safe.html` CF_HTML artifact was used in authenticated WeChat PC editor
  attempts, but the intended deterministic-title DOM target stayed unchanged and a later OS
  foreground paste hit a different WeChat editor tab. The wrong-tab content had large InkForge
  SVG/block counts but also thousands of replacement/mojibake characters, so it is invalid as
  proof. The current-run residue was identified by content fingerprint, deleted through WeChat with
  `ret=0`, and post-delete checks found zero deterministic-title, deleted-candidate, or recent
  empty/default-title InkForge-like residue matches. This must not satisfy
  `pc-editor-paste-event`, `safe-disposable-draft`, or `ordinaryClipboardPasteVerified:true`.
  Future ordinary paste proof must prove visible OS foreground tab and CloakBrowser DOM readback
  target identity before sending Ctrl+V, and must reject mojibake-damaged rich body readbacks.
- 2026-06-18 WeChat Kiln paste-safe single-tab no-paste proof:
  `wechat-kiln-paste-safe-wechat-ctrlv-single-tab-nopaste-20260618.txt` records a stricter retry
  after tab cleanup. In a same-tab authenticated WeChat editor, the page was visible, focused, and
  the body ProseMirror was active. CloakBrowser body click succeeded. `SendKeys("^v")` and
  `keybd_event` through the no-click foreground helper both left the body unchanged
  (`bodyTextLength=8`, `svgCount=0`). This must not satisfy `pc-editor-paste-event`; foreground
  window match, body focus, and key event counts are insufficient without an actual paste/input
  event or same-editor body DOM change.
- 2026-06-19 WeChat Tempera input-bridge-blocked proof:
  `wechat-tempera-ordinary-ctrlv-input-bridge-blocked-20260619.txt` records that exact Tempera
  CF_HTML reached the Windows clipboard, but `keybd_event`, `SendInput`, absolute body-coordinate
  clicks, and `WScript.Shell.AppActivate + SendKeys` did not produce page `keydown`, `paste`,
  `beforeinput`, `input`, or same-editor body DOM mutation. This is an input bridge failure, not
  WeChat sanitizer acceptance or rejection, and it must keep `pc-editor-paste-event`,
  `ordinaryClipboardPasteVerified:true`, and `safe-disposable-draft` invalid.
- 2026-06-19 WeChat Tempera same-tab mojibake cleanup proof:
  `wechat-tempera-ordinary-ctrlv-mojibake-cleanup-20260619.txt` records the follow-up after
  visual tab alignment and DPI coordinate calibration. The exact Tempera artifact reached the
  same visible WeChat PC editor through ordinary OS Ctrl+V and preserved `svgCount=35`,
  `dataInkSvgCount=3`, and `dataInkBlockCount=23`, but text readback had
  `replacementCharCount=1118` and `mojibakeHintCount=1118`. The deterministic draft was deleted
  with session-bound credentialed `operate_appmsg` returning `base_resp.ret=0`, and two post-delete reload
  readbacks found zero title/content/app-id matches. This proves reachability, rich-structure
  survival, and cleanup only; it must keep `pc-editor-paste-event` invalid until mojibake-free
  readback is also proven.
- 2026-06-19 WeChat Tempera entity-safe ordinary Ctrl+V proof:
  `wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt` records the same source artifact
  transformed only by non-ASCII decimal HTML entities before Windows CF_HTML write. Source SHA-256
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585` became entity-safe SHA-256
  `f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`; non-ASCII characters
  dropped from `944` to `0` while `svgCount=35`, `dataInkSvgCount=3`, and `dataInkBlockCount=23`
  stayed unchanged. Ordinary OS Ctrl+V into the authenticated WeChat PC editor then read back
  `replacementCharCount=0`, `mojibakeHintCount=0`, `literalEntityTextCount=0`, and
  `htmlEntityCount=0`, and cleanup was verified by two post-delete reloads. Product code may use
  this as a WeChat clipboard-boundary rule through `prepareWechatClipboardHtml()`, but it must not
  rewrite normal preview/export HTML or claim raw UTF-8 direct paste success.
- 2026-06-19 WeChat draftbox create-menu readback:
  `wechat-draftbox-create-menu-readback-20260619.txt` records that the authenticated backend home
  route can reach draftbox only through the backend DOM menu link with active session context; a
  bare `/cgi-bin/appmsg` navigation can fall to a relogin prompt. The draftbox toolbar exposes a
  visible create menu and an article item, but that is only create-menu reachability. It must not
  satisfy `safe-disposable-draft`, `authenticated-editor-url`, `pc-editor-dom-readback`, or
  `pc-editor-paste-event` until a same-session article editor is opened, a deterministic disposable
  draft is created, the exact artifact is pasted/read back, and cleanup is verified.
- 2026-06-19 WeChat draftbox article-menu blocked proof:
  `wechat-draftbox-article-menu-click-blocked-20260619.txt` records that the authenticated
  draftbox create menu can expose an article item, but DOM click, CloakBrowser selector clicks,
  calibrated OS mouse clicks, and a diagnostic in-page pointer/mouse event sequence did not open an
  article editor. The selector clicks were blocked by element-stability failures; the diagnostic DOM
  event sequence is not trusted user proof. The readback stayed on `/cgi-bin/appmsg`, editor shell
  selectors and article-body contenteditable nodes stayed absent, and the deterministic disposable
  sentinel stayed absent. This must not satisfy `authenticated-editor-url`,
  `pc-editor-dom-readback`, `safe-disposable-draft`, `pc-editor-paste-event`,
  `ordinaryClipboardPasteVerified:true`, or `cleanupPathVerified:true`.
- 2026-06-19 WeChat OS-click calibration abort:
  `wechat-os-click-calibration-abort-20260619.txt` records that Win32 `mouse_event` / `SendInput`
  targeting was not safely bound to the intended create-button DOM target. The candidate point hit a
  Chromium render window and the intended page coordinate matched the visible create button, but the
  menu did not open; CSS hover diagnostics showed intersection with a draft-card region. The hover
  text was private and must not be committed. Further OS-coordinate article-creation clicks must
  abort until actual cursor-path identity to the exact DOM target is demonstrated without
  intersecting account content. This must not satisfy authenticated editor, PC DOM, safe draft, paste,
  or cleanup proof rows.
- 2026-06-19 WeChat create-entry CloakBrowser stability block:
  `wechat-create-entry-cloakbrowser-stability-blocked-20260619.txt` records that the authenticated
  `/cgi-bin/appmsg` page exposed a visible new-creation control and hidden dropdown DOM entries, but
  CloakBrowser selector clicks against the button, operation group, and default span all failed the
  element-stability gate. Geometry samples kept the button center stable, while the real dropdown
  menu stayed `display:none` with zero-size menu item rects. Hidden dropdown DOM text, a visible
  create button, or a CloakBrowser click-stability failure must not satisfy article editor target,
  PC DOM, safe draft, paste, or cleanup proof rows.
- 2026-06-19 WeChat existing-draft editor entry block:
  `wechat-existing-draft-edit-entry-blocked-20260619.txt` records that CloakBrowser could click a
  visible existing draft title link, but the page stayed on `/cgi-bin/appmsg` and editor shell
  selectors, article-body contenteditable nodes, iframe nodes, and textarea nodes stayed absent.
  The first visible edit action had stable geometry but was hidden by computed visibility, and
  CloakBrowser selector click failed the element-stability gate. Existing draft title links,
  hover/action DOM, or hidden edit affordances must not satisfy article editor target proof unless
  the same session actually opens the editor and reads back editor DOM.
- `authenticated-editor-url` requires `authenticatedSessionVerified:true` and
  `platformEditorTargetVerified:true` on the platform-editor proof artifact. A login, re-login,
  expired-session, scan-entry, dashboard, draftbox, create-menu, or other authenticated shell page
  must remain invalid even if it was opened through the WeChat backend URL path.
- `pc-editor-dom-readback` requires `authenticatedSessionVerified:true`,
  `platformEditorTargetVerified:true`, `platformEditorSurfaceVerified:true`, and
  `platformEditorDomVerified:true` on a platform-editor DOM/visual-DOM artifact. Generic DOM
  readback from a login page, shell page, blocked page, draftbox/menu page, expired session,
  title field, hidden iframe, route-discovery probe, or list-card shell must not satisfy PC editor
  DOM proof.
- The `authenticated-pc-editor` collection plan/queue note must mention
  `authenticatedSessionVerified:true`, `platformEditorTargetVerified:true`,
  `platformEditorSurfaceVerified:true`, and `platformEditorDomVerified:true` so
  ExportModal/operator workflows collect the same proof flags enforced by
  `validateStyleProofManifest()`.
- `safe-disposable-draft` requires `action:'safe-disposable-draft'`, `channel:'platform-editor'`,
  `disposableDraft:true`, and `cleanupPathVerified:true` on the same proof artifact. A disposable
  draft without a verified cleanup, deletion, or rollback path is still unsafe for platform
  mutation.
- Draftbox delete/edit/publish action taxonomy, visible delete confirmation text, and cancel
  controls are cleanup affordances only. They must not set `cleanupPathVerified:true` until the same
  explicitly disposable draft is created or opened for mutation, cleaned up by deletion or rollback,
  and read back from the draftbox/editor state with the redacted sentinel absent or reverted.
- `cover-thumbnail-check` requires `channel:'phone-preview'`.
- `dark-mode-check` requires `channel:'phone-preview'` plus `darkModeEnabledVerified:true` on the
  same proof artifact; a generic phone screenshot remains invalid until the mobile Dark Mode state
  is explicitly verified.
- `cover-thumbnail-check` also requires `coverThumbnailAccepted:true` on the same proof artifact;
  a cover crop/setup page remains invalid until the platform preview/share/list entry shows the
  exact accepted thumbnail.
- `credentialed-channel-response` and `sync-readback` require `channel:'credentialed-channel'`
  plus `externalAccountAuthenticated:true` on the same proof artifact.
- `published-url-or-platform-preview` requires `channel:'public-web'` or
  `channel:'credentialed-channel'`, `action:'published-preview'`, an accepted published/platform
  readback, `externalAccountAuthenticated:true`, and `exactArtifact:true` on the same proof
  artifact. A phone-preview readback is mobile preview proof only and must not satisfy the
  platform-publish row.
- Progress reports must surface these failures as invalid authenticated-PC, phone-preview,
  credentialed-channel, or platform-publish gates and must not increase `proofSatisfiedChoices`.

Required tests:
- A manifest that tries to satisfy safe draft with a PC paste/ClipboardEvent artifact must keep
  `safe-disposable-draft` invalid.
- A manifest that tries to satisfy ordinary PC paste with a programmatic ClipboardEvent artifact
  must keep `pc-editor-paste-event` invalid and surface
  `style-proof-manifest-ordinary-paste-not-verified`.
- A manifest that cites CF_HTML dry-run metadata without a real OS Ctrl+V editor DOM readback must
  keep `pc-editor-paste-event` missing or invalid; local clipboard preparation is not platform
  paste proof.
- A manifest that cites a local OS keyboard probe with no `paste` / `input` event and no inserted
  sentinel must keep `pc-editor-paste-event` missing or invalid; accepted Win32 input counts and
  foreground-window evidence are not sufficient.
- A manifest that cites local `keybd_event` / CF_HTML success on a controlled local page must still
  keep WeChat `pc-editor-paste-event` missing or invalid unless it also includes authenticated
  platform-editor paste/readback proof for the exact artifact and ordinary channel.
- `flagship-kiln-paste-safe` must render through the same flagship pipeline as the other flagship
  presets, using `cover-title` and `divider-forge` while leaving original `flagship-kiln` on
  `cover-grid`. Its style choice must map to the real `flagship-kiln-paste-safe` preset and remain
  selectable only as a local/browser candidate until exact WeChat disposable-draft proof exists.
- A WeChat platform-editor paste artifact must prove that the visible OS foreground editor tab and
  the DOM readback target are the same editor. Multi-tab foreground/DOM mismatch, hidden-tab
  readback, or same-window wrong-tab paste must keep `pc-editor-paste-event` invalid even if a
  different tab receives content.
- A platform-editor paste artifact with mojibake/replacement-character damage, duplicated source
  artifact counts, or titleless wrong-tab insertion must keep `pc-editor-paste-event` invalid and
  must require cleanup evidence before it can be cited as a safe failed attempt.
- A same-tab platform-editor retry with focused body editor and OS key event counts but no
  paste/input event and no body DOM mutation must keep `pc-editor-paste-event` invalid.
- A platform-editor retry where OS input helpers report foreground activation or sent key counts,
  but the CloakBrowser page records no key, paste/input, or body mutation, must be classified as
  input-bridge-blocked and cannot be used to infer platform sanitizer behavior.
- A same-tab retry that preserves SVG/data-ink structure but reports any replacement/mojibake
  characters must keep `pc-editor-paste-event` invalid, even if cleanup succeeds.
- A same-tab retry that succeeds only after WeChat clipboard entity preparation may satisfy the
  PC paste row for that transformed clipboard payload if exact-artifact derivation, ordinary
  paste, same-editor target, mojibake-free readback, and cleanup are all proven. It must remain
  distinct from raw UTF-8 artifact acceptance and from all phone/sync/publish rows.
- `pc-editor-paste-event` requires one same `platform-editor` / `pc-paste` artifact to bind the
  full ordinary paste contract: `artifactFingerprint`, `exactArtifact:true`,
  `authenticatedSessionVerified:true`, `platformEditorTargetVerified:true`,
  `platformEditorSurfaceVerified:true`, `platformEditorDomVerified:true`,
  `ordinaryClipboardPasteVerified:true`, `sameEditorTabVerified:true`,
  `pasteInputEventVerified:true`, `editorBodyMutationVerified:true`, `mojibakeFreeVerified:true`,
  and `safeForCommit:true`.
- Paste flags split across multiple artifacts must keep `pc-editor-paste-event` invalid and surface
  `style-proof-manifest-paste-proof-not-bound`.
- A pc-paste artifact with strong paste flags but without same-artifact exact export binding,
  authenticated-session proof, post-paste editor DOM readback, or safe-for-commit proof must keep
  `pc-editor-paste-event` invalid and surface the corresponding manifest issue.
- A manifest that records `disposableDraft:true` without `cleanupPathVerified:true` must keep
  `safe-disposable-draft` invalid and surface `style-proof-manifest-cleanup-path-missing`.
- A manifest that cites draftbox delete/edit/publish affordances without same-draft cleanup and
  post-cleanup readback must keep `safe-disposable-draft` missing or invalid.
- A manifest that cites draftbox create-menu or article-menu visibility, selector-click attempts,
  calibrated OS mouse clicks, or untrusted in-page pointer/mouse events without same-session editor
  DOM readback must keep `authenticated-editor-url`, `pc-editor-dom-readback`,
  `safe-disposable-draft`, and `pc-editor-paste-event` missing or invalid, and surface
  `style-proof-manifest-platform-editor-target-not-verified` once it claims authenticated editor,
  PC DOM, or paste proof from that non-editor target.
- A manifest that cites hidden WeChat create-entry dropdown DOM text or CloakBrowser
  element-stability failures without an actually visible dropdown item and same-session article
  editor readback must keep `authenticated-editor-url`, `pc-editor-dom-readback`,
  `safe-disposable-draft`, and `pc-editor-paste-event` missing or invalid.
- A manifest that cites an existing draft title click, hover action row, or hidden edit affordance
  without a same-session editor transition and editor DOM readback must keep
  `authenticated-editor-url`, `pc-editor-dom-readback`, `safe-disposable-draft`, and
  `pc-editor-paste-event` missing or invalid.
- A manifest that cites OS-coordinate calibration, Win32 render-window hit testing, or hover-chain
  diagnostics must keep WeChat editor, paste, safe-draft, and cleanup rows missing or invalid unless
  the same artifact also proves exact DOM target identity, trusted editor opening, deterministic
  disposable draft handling, and post-cleanup absence. OS cursor/window hit tests alone must not
  set `platformEditorTargetVerified:true`.
- A manifest that cites a login/re-login/expired-session page as authenticated editor reachability
  must keep `authenticated-editor-url` invalid and surface
  `style-proof-manifest-authenticated-session-not-verified`.
- A manifest that cites generic DOM readback without explicit authenticated session and editor-node
  verification must keep `pc-editor-dom-readback` invalid and surface
  `style-proof-manifest-platform-editor-dom-not-verified`.
- PC DOM, authenticated editor, and local browser artifacts must keep phone preview,
  credentialed sync, and publish requirements invalid.
- The matching `getPlatformStyleProofProgressReport()` gate rows must remain invalid, not
  satisfied or missing.

## 13. Style Proof Acceptance Audit Report

`getPlatformStyleProofAcceptanceAuditReport(platform, manifests)` and
`getStyleProofAcceptanceAuditReport(manifests)` are the final local audit layer above manifest
pack/progress reports. They classify every open proof gate as `completed`, `missing`, `invalid`,
`blocked-by-external`, or `unsafe-to-automate`.

Contracts:
- The audit report must consume existing `StyleProofManifest` records only. It must not fabricate
  artifacts, mark a draft safe, click a platform button, open a phone preview, sync, upload, or
  publish anything.
- The audit must reuse `getPlatformStyleProofProgressReport()` and
  `getStyleProofManifestPackReport()` so platform isolation, duplicate artifact id checks,
  fingerprint mismatch checks, and blocked-choice invalidation remain identical to the lower
  proof reports.
- Gate-level audit rows must preserve lower-level invalid proof. If the underlying progress gate
  has any invalid requirement row, the acceptance gate status is `invalid` before it can be
  presented as `blocked-by-external` or `unsafe-to-automate`. Missing, unattempted external gates
  still keep their external/manual status.
- Safe local gaps are only `local-evidence` and `sensitive-hygiene`. Authenticated PC editor,
  credentialed-channel, and platform-publish gates are `unsafe-to-automate` until a human/operator
  intentionally executes that real account action with a safe disposable draft and verified cleanup
  path bound to the same proof artifact.
- Phone preview, Dark Mode, cover thumbnail, and phone-side SMIL/click proof are
  `blocked-by-external` until actual phone-preview readback exists. PC DOM, local browser, and
  ClipboardEvent readback must not complete those rows.
- Public image host proof is `blocked-by-external` unless a real public HTTPS or platform-hosted
  artifact is supplied. Zhihu/XHS local manifests must not be interpreted as account upload or
  publish proof.
- `cannotClaim` rows are the operator-facing list of proof claims that must not be made in docs,
  UI, or release notes. They must include ordinary Ctrl+V rich HTML, phone preview, Dark Mode,
  cover thumbnail, credentialed sync, public host, and publish rows whenever those requirements are
  absent or invalid.
- Each acceptance requirement row must expose both `issueCount` and sorted `issueIds` so the
  operator can distinguish missing proof from concrete invalid proof such as
  `style-proof-manifest-authenticated-session-not-verified` or
  `style-proof-manifest-platform-editor-dom-not-verified`. `issueIds` must be collected through the
  manifest/progress reports and must not invent new reasons outside `StyleProofManifestIssueId`.
- Requirement rows carrying `style-proof-manifest-external-account-auth-missing` must be
  `invalid` in the acceptance audit. A credentialed-channel, public URL, or platform-preview row
  without positive account-authenticated readback is concrete invalid proof, not merely an
  `unsafe-to-automate` task waiting for an operator.
- Requirement rows carrying `style-proof-manifest-market-editor-not-applied` must be `invalid` in
  the acceptance audit. A 135/Xiumi library click or SVG/style selection that does not change the
  central editor/canvas is concrete invalid applied-element proof, not a generic
  `blocked-by-external` market-editor task.
- Requirement rows carrying `style-proof-manifest-disposable-draft-missing` or
  `style-proof-manifest-cleanup-path-missing` must be `invalid` in the acceptance audit. Missing
  safe-draft proof remains an authenticated-PC-editor manual gate, but a submitted safe-draft row
  without disposable draft identity or cleanup/rollback verification is concrete invalid proof.
- Requirement rows carrying PC paste-specific issues must be `invalid` in the acceptance audit:
  `style-proof-manifest-authenticated-session-not-verified`,
  `style-proof-manifest-platform-editor-target-not-verified`,
  `style-proof-manifest-platform-editor-surface-not-verified`,
  `style-proof-manifest-platform-editor-dom-not-verified`,
  `style-proof-manifest-ordinary-paste-not-verified`,
  `style-proof-manifest-paste-editor-tab-not-verified`,
  `style-proof-manifest-paste-input-not-verified`,
  `style-proof-manifest-editor-body-not-mutated`,
  `style-proof-manifest-paste-mojibake-not-ruled-out`, and
  `style-proof-manifest-paste-proof-not-bound`. Missing PC paste proof remains a manual
  authenticated-PC-editor gate, but submitted weak or programmatic paste proof is concrete invalid
  proof.
- ExportModal may surface the acceptance audit beside the existing collection queue. This UI must
  be read-only: it can show `cannotClaim` counts, per-choice blocked claims, and next safe/phone/
  external/manual action labels, but it must not change style `selectable`, `usable`, `blocked`, or
  `unavailable` decisions.
- Per-choice acceptance labels must remain compact and wrap inside the 400px control column. The
  UI must not use emoji icons and must not hide phone, credentialed sync, public host, or publish
  gaps behind a generic "ready" status.

Required tests:
- A local/unit WeChat manifest must not complete PC paste, phone preview, Dark Mode, cover,
  credentialed sync, or publish proof rows.
- A weak WeChat PC DOM/ClipboardEvent-style manifest must leave phone preview and publish proof
  unclaimable.
- A login/re-login/expired-session WeChat manifest must keep authenticated editor and PC DOM rows
  unclaimable and surface the concrete session/editor DOM issue ids in those `cannotClaim` rows.
- A market-editor manifest bound to a real choice and carrying `centralEditorChanged:false` must
  keep `market-applied-dom-readback` invalid in both the manifest report and the acceptance audit.
- A PC paste manifest with an otherwise complete safe-disposable-draft row but no
  `cleanupPathVerified:true` must keep `safe-disposable-draft` invalid in both the manifest report
  and the acceptance audit.
- A PC paste manifest whose `pc-paste` row is otherwise exact/authenticated/body-bound but has
  `ordinaryClipboardPasteVerified:false` must keep `pc-editor-paste-event` invalid in both the
  manifest report and the acceptance audit.
- A PC paste manifest whose `pc-paste` row is otherwise exact, ordinary-paste, same-tab,
  input/mutation, mojibake-free, and safe-for-commit but misses one of
  `authenticatedSessionVerified`, `platformEditorTargetVerified`,
  `platformEditorSurfaceVerified`, or `platformEditorDomVerified` must keep
  `pc-editor-paste-event` invalid in the requirement-level acceptance audit. The same issue ids
  remain manual-gate signals when they belong to `authenticated-editor-url` or
  `pc-editor-dom-readback`.
- A multi-platform audit must keep WeChat, Xiaohongshu, and Zhihu manifest progress isolated while
  surfacing XHS publish and Zhihu public-host/artifact-manifest gaps.
- The real ExportModal e2e must show the acceptance audit summary, a preflight row, and per-card
  `cannotClaim` labels without changing the existing style capability counts.

## 14. Style Proof Execution Runbook

`getPlatformStyleProofExecutionRunbook(platform, manifests)` and
`getStyleProofExecutionRunbook(manifests)` are the operator-facing execution layer above the
acceptance audit. They are intended for preflight UI, evidence checklists, and deployment
acceptance reports that need to know exactly which real proof must still be collected.

Contracts:
- The runbook must be derived from `getPlatformStyleProofAcceptanceAuditReport()` and
  `getStyleProofManifestPackReport()`. It must not fork platform isolation, duplicate artifact id
  detection, fingerprint mismatch handling, blocked-choice invalidation, or acceptance status
  classification.
- Every `StyleProofRequirementId` must have one `StyleProofExecutionArtifactContract` describing
  allowed `StyleProofChannel`, `StyleProofAction`, `StyleProofReadback`, required artifact fields,
  forbidden sensitive fields when applicable, and accepted host statuses for public-host proof.
- WeChat ordinary PC paste proof requires the same `platform-editor` / `pc-paste` artifact to carry
  `artifactFingerprint`, `exactArtifact`, `authenticatedSessionVerified`,
  `platformEditorTargetVerified`, `platformEditorSurfaceVerified`, `platformEditorDomVerified`,
  `ordinaryClipboardPasteVerified`, `sameEditorTabVerified`, `pasteInputEventVerified`,
  `editorBodyMutationVerified`, `mojibakeFreeVerified`, and `safeForCommit`.
- Programmatic ClipboardEvent, local OS key probes, local contenteditable CF_HTML checks, wrong-tab
  readbacks, no-input/no-mutation rows, mojibake-damaged rows, and split-flag proof rows are
  concrete invalid PC paste proof once submitted. Their requirement-level acceptance audit rows
  must stay `invalid`; they cannot be softened to generic `unsafe-to-automate` merely because the
  authenticated PC editor gate is manual.
- WeChat editor target identity must be verified against the authenticated `media/appmsg_edit_v2`
  editor surface, not inferred from article-list controls or static bundle routes. Current
  CloakBrowser readback shows the main article body as a ProseMirror `contenteditable=true` node
  inside WeChat's `mock-iframe` / `mock-iframe-document` / `mock-iframe-body` wrapper chain, with
  `js_ueditor` / `js_editor` / `rich_media_content` signals. PC paste proof must target that main
  body ProseMirror surface, set `platformEditorSurfaceVerified:true`, and then read back
  same-surface mutation. A hidden native iframe, title ProseMirror, list-card edit button, editor
  route discovery, `cloak_fill`, or local ClipboardEvent-style injection must not satisfy ordinary
  Ctrl+V proof.
- 2026-06-19 post-reboot CloakBrowser revalidation reached the authenticated WeChat backend home
  surface and then the official new-article editor route shape with login/scan state absent. The
  editor readback found 3 contenteditable nodes, 2 textareas, 53 inputs, 1 iframe, 9 SVG nodes,
  99 editor-candidate selectors, 104 title-candidate selectors, 46 cover candidates, 1 visible
  preview control, 2 visible save controls, and 1 visible publish control. This is editor-surface
  reachability evidence only: a future proof manifest still must bind the exact InkForge artifact
  to the main body ProseMirror surface before it can satisfy PC paste, DOM mutation, safe-draft,
  phone-preview, sync, scheduled-send, platform-preview, or publish gates.
- PC editor DOM readback uses the same body-surface identity gate. A DOM proof that only finds
  route shape, editor shell selectors, title ProseMirror, hidden native iframes, or generic
  contenteditable counts must stay invalid until the main body editing surface itself is identified
  and read back with `platformEditorSurfaceVerified:true`.
- 2026-06-20 preview-entry precondition attempt adds a concrete failure mode: after a wrong-surface
  ordinary paste attempt, the title ProseMirror can expand enough to look like a large editor while
  the real body ProseMirror remains placeholder-only. Post-paste readback must therefore re-identify
  the main body surface by title/body role, DOM order, placeholder state, and body-level paste/input/
  mutation counters; width/height alone is not sufficient. A title-surface plain-text payload with
  body paste/input/mutation count 0 must keep `pc-editor-paste-event`, phone preview, Dark Mode,
  cover-thumbnail, and publish rows invalid.
- `safe-disposable-draft` proof requires `disposableDraft:true` and
  `cleanupPathVerified:true` on the same platform-editor proof row. Rows that prove only a draft
  exists, only a delete affordance exists, or split draft/cleanup flags across artifacts must emit
  `style-proof-manifest-disposable-draft-missing`,
  `style-proof-manifest-cleanup-path-missing`, or `style-proof-manifest-proof-not-bound` and keep
  requirement-level acceptance audit `invalid` instead of downgrading the row to generic
  `unsafe-to-automate`.
- Generic `exact-artifact` proof requires `exactArtifact:true` and a non-empty
  `artifactFingerprint` on the same proof row. A bare boolean flag is not enough to bind evidence
  to the exported InkForge artifact under review.
- Phone preview, phone screenshot, Dark Mode, and cover thumbnail rows must require phone-preview
  artifacts and must keep `phonePreviewContentVerified`, `darkModeEnabledVerified`, and
  `coverThumbnailAccepted` separate. These rows must also bind the same proof artifact to
  `exactArtifact:true` when the contract lists exact-artifact proof. PC DOM, local browser
  screenshots, scan pages, setup dialogs, or unbound phone readbacks cannot complete them.
- `phone-screenshot` must require `action:'phone-preview'`, `readback:'screenshot'`,
  `phonePreviewContentVerified:true`, and `exactArtifact:true` on the same screenshot artifact. A
  setup screenshot, scan-entry screenshot, PC preview shell, or relogin page is not a phone
  screenshot proof for final article content.
- `dark-mode-check` must require `darkModeEnabledVerified:true` and
  `phonePreviewContentVerified:true` on phone-preview evidence, plus `exactArtifact:true` on the
  same proof artifact. A Dark Mode setting page, PC preview shell, or generic screenshot cannot
  prove mobile Dark Mode for the exact article body.
- `dark-mode-check` must keep `phonePreviewContentVerified:true` and
  `darkModeEnabledVerified:true` bound to the same Dark Mode proof row. Splitting phone article
  content across one artifact and mobile Dark Mode state across another artifact must emit
  `style-proof-manifest-dark-mode-not-verified`, keep manifest status `invalid`, and keep the
  requirement-level acceptance audit `invalid` instead of downgrading the row to generic
  `blocked-by-external`.
- `StyleProofArtifact.phonePreviewBlocked?: boolean` and
  `StyleProofAction:'phone-preview-entry-readback'` are explicit blocker markers. They must emit
  `style-proof-manifest-phone-preview-blocked`, keep the matching requirement invalid, and make
  acceptance audit requirement rows `invalid` instead of `blocked-by-external`.
- Credentialed sync and platform publish rows remain `unsafe-to-automate` until a human/operator
  performs the real mutating account action and provides readback for the same artifact.
- `credentialed-channel-response` and `sync-readback` must require `exactArtifact:true` in addition
  to `externalAccountAuthenticated:true`, `artifactFingerprint`, and `safeForCommit:true`. A
  successful account response, upload response, draft id, material id, or sync readback for a
  different artifact must emit `style-proof-manifest-exact-artifact-missing` and remain invalid.
- `scheduled-send-readback` is a distinct `platform-publish` requirement under `published`
  evidence. It must require `StyleProofAction:'scheduled-send'`,
  `StyleProofReadback:'scheduled-send-state'` (or a DOM/API/visual readback of the same send state),
  `externalAccountAuthenticated:true`, `exactArtifact:true`, `scheduledSendVerified:true`,
  `artifactFingerprint`, and `safeForCommit:true`. Credentialed sync responses, editor previews,
  draft creation, public preview URLs, or published-preview rows must not satisfy this requirement.
- Any execution contract row that lists `safeForCommit` in `requiredFields` must enforce
  `safeForCommit:true` on a matching action/channel proof row in
  `validateStyleProofManifest()`. This is a validator contract, not only runbook copy. It applies
  across local evidence, market-editor evidence, authenticated PC editor evidence, phone-preview
  evidence, credentialed-channel evidence, public-host evidence, platform-publish evidence, and
  sensitive-hygiene rows. Matching proof rows without same-row `safeForCommit:true` must emit
  `style-proof-manifest-safe-commit-not-verified` and keep requirement-level acceptance audit
  `invalid`.
- Any execution contract row that lists `artifactFingerprint` in `requiredFields` must enforce a
  non-empty same-row `artifactFingerprint` on a matching action/channel proof row in
  `validateStyleProofManifest()`. `exactArtifact:true` is not enough without this traceability
  field. Missing fingerprints must emit `style-proof-manifest-exact-artifact-missing` and keep
  requirement-level acceptance audit `invalid`.
- Any execution contract row that lists `exactArtifact` in `requiredFields` must enforce
  `exactArtifact:true` on a matching action/channel proof row in
  `validateStyleProofManifest()`. This common validator only fills the shared same-row binding gap
  and skips duplicate exact-artifact issues emitted by specialized validators. Matching proof rows
  with fingerprints and business-specific flags but without same-row `exactArtifact:true` must emit
  `style-proof-manifest-exact-artifact-missing` and keep requirement-level acceptance audit
  `invalid`.
- `requiredChannels` and `requiredActions` are executable contract data. If a manifest provides
  artifacts for a requirement but none of those artifacts match that requirement's action/channel
  contract, `validateStyleProofManifest()` must emit
  `style-proof-manifest-contract-action-channel-mismatch` and keep requirement-level acceptance
  audit `invalid`. This catches rows that carry the right `requirementId` but come from the wrong
  proof channel, such as platform-editor hygiene rows trying to satisfy local hygiene contracts.
- Contract rows must stay synchronized with existing specialized validators. For example,
  `local-browser-rendering` accepts both `local-browser` and `tauri-webview` because committed
  local WebView2 evidence uses `tauri-webview`; `no-proprietary-template-source` accepts both
  `local-artifact` and `market-editor` source-hygiene rows.
- `requiredReadbacks` is executable contract data, not only runbook copy. If a proof row matches a
  contract's channel/action/accepted-host boundary but its `readback` is outside that contract's
  `requiredReadbacks`, `validateStyleProofManifest()` must emit
  `style-proof-manifest-readback-missing`. The shared required-field helpers must only accept
  proof rows whose channel, action, host status when applicable, and readback all match the same
  execution contract, so fields from a different readback cannot backfill `safeForCommit`,
  `artifactFingerprint`, or `exactArtifact`.
- `requiredFields` must be satisfiable on one matching proof row. If every required field exists
  somewhere among rows matching the same channel/action/host/readback contract, but no single row
  carries all required fields, `validateStyleProofManifest()` must emit
  `style-proof-manifest-proof-not-bound` and keep requirement-level acceptance audit `invalid`.
  This catches split-proof rows without duplicating ordinary missing-field issues.
- `forbiddenFields` is also executable contract data. If a proof row matches a contract's
  channel/action/host/readback boundary and sets a forbidden field, `validateStyleProofManifest()`
  must emit a requirement-level issue. `sensitive` forbidden-field violations use
  `style-proof-manifest-sensitive-artifact`; other forbidden fields use
  `style-proof-manifest-forbidden-field-present`. The generic helper must keep
  `no-proprietary-template-source` and `no-sensitive-artifact` invalid when matching hygiene rows
  carry sensitive material, and it must not rely only on artifact-level hygiene issues.
- When a requirement-specific validator accepts a family such as DOM-or-visual readback or
  phone-preview visual fallback, the matching `STYLE_PROOF_EXECUTION_ARTIFACT_CONTRACTS` row must
  list those accepted `requiredReadbacks`. Do not narrow the common contract helper in a way that
  rejects an intentionally accepted validator path, and do not broaden the validator without
  updating the contract row and regression tests.
- Public-host proof must expose accepted host statuses: `public-https` and `platform-hosted`.
  It must also attach a non-empty `artifactRef` to the redacted public-host or platform-host
  report that was verified and mark the same proof row `safeForCommit:true`. Local, private, data,
  blob, localhost, WeChat-only, temporary preview, unsafe-for-commit, or untraceable
  host-status-only rows remain invalid in both manifest report and acceptance audit.
- XHS and Zhihu artifact-manifest proof must require `artifactManifestValidated:true` in addition
  to `artifactRef` and `safeForCommit`. `artifactRef`, `artifactManifestValidated:true`, and
  `safeForCommit:true` must appear on the same artifact-manifest validation row. The validator flag
  is set only when the matching `validateXhsImageArtifactManifest()` or
  `validateZhihuImageArtifactManifest()` call returns no issues for the exact redacted manifest.
  The execution runbook's next action, success criteria, and failure signals must name the matching
  validator so operator checklists cannot treat a manifest-shaped row as validator-passed proof.
  Manifest-shaped rows without the validator-passed flag, or rows that split report reference and
  validator pass across different artifacts, remain invalid in both manifest report and acceptance
  audit.
- XHS/Zhihu artifact-manifest rows without a non-empty `artifactRef` must surface
  `style-proof-manifest-artifact-ref-missing` and stay invalid, because the proof cannot be traced
  to the redacted manifest report that was validated.
- Public-host rows without a non-empty `artifactRef` must also surface
  `style-proof-manifest-artifact-ref-missing` and keep both the manifest requirement and acceptance
  requirement row invalid.
- A CloakBrowser readback that reaches the Xiaohongshu creator login route or the Zhihu sign-in
  route must keep account upload, editor preview, platform preview, public article rendering, and
  publish rows missing or unclaimable. Login forms, verification-code inputs, password fields,
  social-login buttons, or redirect query keys are external-account blockers, not platform proof.
- A CloakBrowser readback that reaches a WeChat login or relogin state from `/cgi-bin/appmsg` is
  also blocker evidence only. Zero editor-surface counts for `.ProseMirror`, contenteditable
  article body, iframe, and textarea nodes must keep authenticated editor URL, PC editor DOM,
  ordinary paste, phone preview, sync, scheduled-send, platform preview, and publish rows
  unclaimable.
- The executable manifest fields for this boundary are
  `StyleProofArtifact.externalAccountAuthenticated?: boolean` and
  `StyleProofArtifact.externalAccountLoginBlocked?: boolean`. Credentialed-channel and platform-
  publish runbook rows must expose `externalAccountAuthenticated` as a required field, and the
  validator must require `externalAccountAuthenticated:true` for
  `credentialed-channel-response`, `sync-readback`, `scheduled-send-readback`, and
  `published-url-or-platform-preview`. All four rows must also require `exactArtifact:true`,
  because a sync response, draft/material readback, send state, public URL, or platform preview for
  a different article cannot prove the current exported artifact.
- A manifest artifact with `externalAccountLoginBlocked:true`,
  `externalAccountAuthenticated:false`, or action `external-account-login-readback` must emit
  `style-proof-manifest-external-account-login-blocked`. Such an artifact can never satisfy XHS
  upload/platform preview/publish proof, Zhihu public-host proof, Zhihu artifact-manifest proof,
  or any platform publish row. Requirement-level acceptance audit rows carrying this issue must
  be `invalid`, while ordinary missing external gates may remain `blocked-by-external` or
  `unsafe-to-automate`.
- A credentialed-channel or platform-publish shaped artifact that omits positive
  `externalAccountAuthenticated:true` must emit
  `style-proof-manifest-external-account-auth-missing`. The row remains invalid even if channel,
  action, readback, and artifact fingerprint otherwise match.
- A credentialed-channel artifact that proves account authentication but omits
  `exactArtifact:true` must emit `style-proof-manifest-exact-artifact-missing` for
  `credentialed-channel-response` or `sync-readback`.
- A scheduled-send-shaped artifact that omits `scheduledSendVerified:true` on the exact
  authenticated artifact must emit `style-proof-manifest-scheduled-send-not-verified`. Requirement
  rows carrying this issue must be `invalid` in the acceptance audit, because a same-account,
  exact-artifact schedule response without real send/schedule-state readback is failed proof rather
  than an `unsafe-to-automate` placeholder.
- Each open step must expose `cannotClaimReason`, `nextOperatorAction`, `successCriteria`,
  `failureSignals`, and `redactionBoundary`. These strings are checklist text only; they must not
  promote a style, create proof, or suppress validator issues.
- Phone-preview runbook `failureSignals` must explicitly reject scan entries, setup dialogs, PC
  preview shells, relogin pages, generic QR screens, local browser screenshots, and PC DOM as final
  phone article proof. Dark Mode rows must additionally reject settings pages and generic phone
  screenshots that do not show the exact article body with mobile Dark Mode enabled. Cover-thumbnail
  rows must additionally reject cover crop panels, cover-setting screens, and upload dialogs unless
  the exact cover thumbnail is accepted in a phone share, preview entry, or platform list entry.
- Scheduled-send runbook `failureSignals` must reject credentialed sync responses, editor previews,
  draft creation, and public preview URLs as proof of send/scheduled-send state.
- Credentialed-channel runbook `failureSignals` must reject account responses, upload responses,
  draft ids, or material readbacks for a different artifact as proof of current-artifact sync.
- ExportModal may surface the runbook through style capability summary text, acceptance preflight
  text, per-choice execution summaries, and artifact-contract labels. This UI is informational
  only: it must not fork acceptance logic, create artifacts, alter `selectable`, `usable`,
  `blocked`, or `unavailable`, or blur local, phone, public-host, credentialed, and publish gates.
- Per-choice runbook labels must wrap inside the 400px control column. Long required artifact-field
  names such as `phonePreviewContentVerified` and `ordinaryClipboardPasteVerified` must not shrink
  the preview column, trigger horizontal overflow, or hide the article body used by real e2e
  probes.
- Redaction boundaries must keep browser profiles, cookies, tokens, QR codes, HAR files, account
  screenshots, local credential paths, and raw platform responses out of committed evidence.

Required tests:
- Committed local WeChat evidence must produce a runbook where PC paste is `unsafe-to-automate`,
  phone preview is `blocked-by-external`, and Dark Mode / cover thumbnail require their dedicated
  artifact flags.
- The runbook must expose the exact required fields for ordinary PC paste and phone preview.
- The runbook must expose `exactArtifact` as a required field for `credentialed-channel-response`
  and `sync-readback`, and regression tests must keep authenticated-but-unbound sync proof invalid.
- The runbook must expose explicit failure-signal text for scan/setup/PC-preview-shell/relogin/QR
  blockers, Dark Mode settings-page blockers, and cover crop/setup blockers so operator checklists
  cannot treat those artifacts as phone preview, Dark Mode, or cover-thumbnail proof.
- The runbook must expose `artifactManifestValidated` for XHS/Zhihu artifact-manifest rows, and
  validator-shaped rows missing that flag must keep the requirement invalid.
- A validator-passed artifact-manifest row missing `artifactRef` must also remain invalid.
- Splitting `artifactRef`, `artifactManifestValidated:true`, and `safeForCommit:true` across
  multiple XHS/Zhihu artifact-manifest rows must remain invalid; one same proof row must carry all
  required fields.
- A public-host row with accepted `hostStatus` but no `artifactRef` must remain invalid and must
  not be downgraded to generic `blocked-by-external` in the requirement-level acceptance audit.
- A public-host row with accepted `hostStatus` and `artifactRef` but no same-row
  `safeForCommit:true` must remain invalid through
  `style-proof-manifest-safe-commit-not-verified` and must not be downgraded to generic
  `blocked-by-external` in the requirement-level acceptance audit.
- A multi-platform runbook must keep XHS proof out of WeChat, keep XHS publish as
  `unsafe-to-automate`, and keep Zhihu public-host proof `blocked-by-external` with public host
  contract fields.
- XHS/Zhihu login-route or sign-in-route readback manifests must keep account upload, public-host,
  artifact-manifest, platform preview, and publish requirements invalid/cannot-claim through
  `style-proof-manifest-external-account-login-blocked`.
- Single-factor regressions must prove each explicit external-account blocker works independently:
  `externalAccountLoginBlocked:true`, `externalAccountAuthenticated:false`, and
  `action:'external-account-login-readback'`.
- Credentialed sync and published/platform-preview rows missing
  `externalAccountAuthenticated:true` must be invalid through
  `style-proof-manifest-external-account-auth-missing`; `phone-preview` artifacts must not satisfy
  `published-url-or-platform-preview`.
- Published/platform-preview rows missing `exactArtifact:true` must be invalid through
  `style-proof-manifest-exact-artifact-missing`, and the requirement-level acceptance audit must
  report `invalid`.
- A platform-publish gate containing an invalid scheduled-send requirement must itself report
  `invalid`; it must not hide the concrete failed proof behind `unsafe-to-automate`.
- Generic exact-artifact rows with `exactArtifact:true` but no non-empty `artifactFingerprint`
  must also be invalid through `style-proof-manifest-exact-artifact-missing`, and the
  requirement-level acceptance audit must report `invalid`.
- Matching unit-test, authenticated-editor, and phone-preview proof rows missing same-row
  `safeForCommit:true` must be invalid through `style-proof-manifest-safe-commit-not-verified`.
  Regression tests must cover at least one local-evidence row, one authenticated-PC-editor row, and
  one phone-preview row so future changes cannot quietly move `safeForCommit` back to runbook-only
  text.
- Matching phone, credentialed-channel, scheduled-send, and published-preview proof rows missing a
  non-empty same-row `artifactFingerprint` must be invalid through
  `style-proof-manifest-exact-artifact-missing`. Regression tests must keep `exactArtifact:true`
  without a fingerprint invalid so future changes cannot treat untraceable exact-artifact flags as
  proof.
- Matching phone, credentialed-channel, scheduled-send, and published-preview proof rows with a
  fingerprint and their business-specific verification flags but missing same-row
  `exactArtifact:true` must remain invalid through `style-proof-manifest-exact-artifact-missing`.
  Regression tests must keep those rows invalid so future changes cannot satisfy exact-artifact
  contracts with only channel/action/readback and fingerprint data.
- Same channel/action proof rows with the wrong readback must not satisfy shared required-field
  checks. Regression tests must keep a `phone-screenshot` proof invalid when the screenshot row
  lacks `artifactFingerprint` or `safeForCommit` and those fields appear only on a same-channel /
  same-action `phone` readback row.
- A concrete phone/public-host/credentialed/publish proof row with the expected action and channel
  but the wrong readback must keep the requirement-level acceptance audit `invalid` through
  `style-proof-manifest-readback-missing`. Authenticated-PC-editor reachability rows remain the
  exception: their wrong-readback status stays `unsafe-to-automate` because the operator still has
  to open and inspect the real editor surface.
- Same channel/action/readback proof rows must not split required fields across artifacts.
  Regression tests must keep `phone-screenshot` invalid when one screenshot row carries
  `phonePreviewContentVerified:true` and `exactArtifact:true`, while another matching screenshot
  row carries only `artifactFingerprint` and `safeForCommit`.
- Matching hygiene proof rows must not set forbidden fields. Regression tests must keep
  `no-proprietary-template-source` and `no-sensitive-artifact` invalid when a matching
  `hygiene-log` row carries `sensitive:true`; both the artifact-level hygiene issue and the
  requirement-level contract issue must be visible.
- Requirement artifacts with mismatched action/channel must not satisfy the execution contract.
  Regression tests must keep `no-proprietary-template-source` and `no-sensitive-artifact` invalid
  when their `hygiene-log` rows are recorded on `platform-editor` instead of the required local or
  market-editor hygiene channels. Weak PC editor rows attached to phone or publish requirements
  must also stay invalid instead of falling back to external-gate status.
- Proof fields must not backfill across requirement ownership. A proof artifact assigned to one
  `requirementId` must not satisfy the same-row field contract for another requirement, even when
  action/channel/readback values overlap. Regression tests must keep `pc-editor-paste-event`
  invalid when complete PC paste flags are recorded on an artifact assigned to
  `authenticated-editor-url` while the actual `pc-editor-paste-event` row lacks paste proof flags.
- Authenticated editor proof rows with expected action/channel but unsupported readback must emit
  `style-proof-manifest-readback-missing`. Requirement-level manifest status must be `invalid`,
  while acceptance audit may still classify the broader authenticated PC editor gate as
  `unsafe-to-automate` and must retain the concrete issue id.
- Dark Mode proof split across two matching `dark-mode-check` rows, one carrying
  `phonePreviewContentVerified:true` and the other carrying `darkModeEnabledVerified:true`, must
  remain invalid through `style-proof-manifest-dark-mode-not-verified`. Regression tests must
  assert both manifest requirement status and acceptance requirement status stay `invalid`.
- Phone preview, phone screenshot, Dark Mode, and cover-thumbnail rows missing same-artifact
  `exactArtifact:true` must also be invalid through
  `style-proof-manifest-exact-artifact-missing`, even when a separate local exact-artifact proof
  exists for the manifest.
- WeChat phone preview blocker manifests must prove that scan/setup/PC-preview-shell/cover-setting
  rows cannot satisfy `phone-preview-readback`, `phone-screenshot`, `dark-mode-check`, or
  `cover-thumbnail-check`, even when those rows carry a screenshot or a positive-looking Dark Mode
  / cover flag.
- The real ExportModal e2e must show the runbook summary, acceptance preflight totals, and per-card
  artifact-contract labels for WeChat, Xiaohongshu, and Zhihu while preserving existing style
  capability counts.
- The same e2e must prove long runbook labels do not collapse the preview body: the `#nice` probe
  must stay in the mobile-comfortable width range and preserve the expected chars-per-line target.
- The responsive `max-width: 980px` branch must reset the fixed desktop control-column max-width so
  narrow single-column layouts are not capped at 400px.

## 15. Committed Local Evidence Manifest Pack

`getCommittedStyleProofLocalEvidenceManifests()` is a narrow bridge from committed, redacted repo
evidence into the normal `StyleProofManifest` validator/progress/audit pipeline. It exists so local
unit/e2e/hygiene proof can be accounted for consistently without pretending that external platform
gates have been completed.

Contracts:
- The helper may reference only repository-safe evidence paths, currently
  `prompts/0601/evidence/style-proof-acceptance-ui-20260617.txt`,
  `prompts/0601/evidence/style-proof-committed-local-evidence-20260617.txt`, the tracked
  `prompts/0601/evidence/e2e/flagship-*.png` screenshots,
  `prompts/0601/evidence/xhs-raster/README.md`,
  `prompts/0601/evidence/xhs-raster/xhs-raster-cover-grid-browser-2026-06-08-2026-06-07T23-38-29-127Z.png`,
  and `prompts/0601/evidence/xhs-image-manifest-gate-20260609.txt`.
- Returned manifests must be cloned before leaving the helper so callers cannot mutate the internal
  committed-evidence table.
- The helper may satisfy local `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`,
  `xhs-artifact-manifest`, and `no-sensitive-artifact` rows for the referenced exact artifacts.
- The helper must not claim `pc-editor-paste`, `safe-disposable-draft`, `pc-editor-dom-readback`,
  `phone-preview-readback`, `phone-screenshot`, `dark-mode-check`, `cover-thumbnail-check`,
  `credentialed-channel-response`, `sync-readback`, `public-image-host`, or
  `published-url-or-platform-preview`.
- `wechat-flagship-amber` may appear in the local evidence pack because its WebView2 screenshot is
  committed evidence, but it must remain `blocked`/`invalid` until the ordinary Ctrl+V/mobile/publish
  blockers are resolved by separate exact-channel proof.
- `getCommittedStyleProofLocalEvidenceAuditReport()` is only shorthand for running the existing
  audit over those manifests. It must keep `cannotClaim` rows and next phone/manual gate actions
  visible.
- XHS committed local evidence may satisfy only the chosen image artifact's local browser/raster
  and manifest-validation rows, and its `xhs-artifact-manifest` artifact must set
  `artifactManifestValidated:true` only for the committed validator-passed report. It must leave
  XHS account upload, platform preview, and publish rows unclaimable.
- Zhihu image fallback choices must not enter the committed local pack until public HTTPS or
  platform-host image proof is available. A local manifest validator log alone is insufficient for
  the `public-image-host` gate.
- `getCommittedStyleProofWechatPcEvidenceManifests()` is the separate bridge for committed,
  redacted WeChat PC editor proof. It must not be merged into the local evidence helper because the
  PC paste artifact fingerprint is the exact exported HTML SHA, while local evidence rows may refer
  to Tauri/WebView screenshots or raster outputs.
- The current WeChat PC committed pack may include `wechat-flagship-amber` evidence from
  `wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt` and `wechat-flagship-tempera`
  entity-safe evidence from `wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt`. It may
  satisfy `authenticated-editor-url`, `pc-editor-dom-readback`, `exact-artifact`,
  `safe-disposable-draft`, `pc-editor-paste-event`, and `no-sensitive-artifact` for the exact
  committed PC payload fingerprints only.
- The WeChat PC committed pack must keep Amber blocked/invalid and Tempera missing at style-choice
  level until mobile preview, Dark Mode, cover thumbnail, sync, scheduled-send, public
  URL/platform preview, and publish proof exists. It must not generalize Amber PC proof or Tempera
  entity-safe PC proof to raw UTF-8 Tempera direct paste, Kiln, phone, sync, or publish rows.
- Negative Kiln PC attempts, including the raw plain-text proof and the 2026-06-19 entity-safe
  editor-return/no-rich-readback proof, must stay out of
  `getCommittedStyleProofWechatPcEvidenceManifests()`. They are evidence for blocked claims and
  future troubleshooting only, not success manifests for PC paste rows.
- `getCommittedStyleProofWechatPcEvidenceAuditReport()` is only shorthand for auditing that
  committed WeChat PC pack. It must keep cannot-claim rows visible.

Required tests:
- The committed pack returns three WeChat flagship manifests plus the XHS cover-carousel local
  manifest, all as safe committed artifacts, with no duplicate artifact ids and no
  sensitive/unsafe commit issues.
- The pack report has `validManifestCount:0` because external proof is intentionally absent and
  amber is still blocked; this is expected and must not be relaxed.
- Kiln and Tempera local/sensitive gates are satisfied, while PC editor paste, phone preview, Dark
  Mode, cover, sync, and publish rows stay missing/unclaimable.
- Amber remains blocked/invalid even with local WebView2 evidence.
- The XHS cover-carousel manifest satisfies local evidence, sensitive hygiene, and
  `xhs-artifact-manifest` with same-row `artifactRef`, `artifactManifestValidated:true`, and
  `safeForCommit:true`, while
  `published-url-or-platform-preview` remains missing and unsafe-to-automate.
- The committed WeChat PC pack returns cloned Amber and Tempera manifests. Amber artifacts point
  to the redacted Amber PC evidence file with fingerprint
  `sha256:09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d`; Tempera artifacts
  point to the redacted entity-safe PC evidence file with fingerprint
  `sha256:f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`.
- The committed WeChat PC pack must satisfy Amber and Tempera authenticated editor, PC DOM, exact
  artifact, safe disposable draft, ordinary PC paste, and hygiene rows while leaving phone preview,
  Dark Mode, cover thumbnail, scheduled-send, and publish rows missing/cannot-claim.

## 16. Market Editor DOM/CSS Learning Contract - 2026-06-18

CloakBrowser sampling of Xiumi and 135 is permitted only as rule extraction. It must not become
reusable source or implicit platform proof.

Contracts:
- Applied market evidence requires click -> central editor/canvas DOM change -> redacted DOM
  summary. List previews alone are not enough to describe the applied rendering contract.
- 135/Xiumi source snippets, vendor classes, vendor data ids, hosted media URLs, account state,
  local runtime directories, credential material, HAR files, QR artifacts, and paid/member assets
  must never enter InkForge source, committed evidence, generated output, or release notes.
- 135 ordinary output residue (`_135editor`, `135brush`, `135bg`, `data-tools`, market `data-id`)
  and Xiumi authoring residue (`tn-*`, `tn-comp-role`, `tn-bind-comp-tpl-id`, `opera-tn-ra-*`,
  `disable-tn-*`) are quality-detector blockers for InkForge publishable output.
- 135 applied ordinary styles can leak text-slot metadata even if wrapper classes are removed.
  `data-brushtype`, `autonum[data-num]`, and library `style_id/style_name/style_price` metadata
  must fail as market editor residue across WeChat, Xiaohongshu, and Zhihu.
- 135 SVG builder canvas blocks are authoring DOM, not publishable output. Known effect
  `data-name` values such as `multiselectpopup`, `carouselslide`,
  `slidesectorclickredpacket`, `clickelementscaleimagesspread`, and
  `coverclickmovewithspread`, plus canvas placeholders such as `app-content-canvas`,
  `block-img__content`, `block-img__default`, `edit-placeholder`, and `placeholder__name`, must
  fail as market editor residue across WeChat, Xiaohongshu, and Zhihu.
- 2026-06-19 CloakBrowser applied-rule refresh: a 135 ordinary style click that changes only the
  center editor with an empty `section._135editor` placeholder is not enough to learn an applied
  style rule. Treat it as insertion-risk evidence until the inserted block has meaningful
  `data-tools` / `data-id` / text / SVG / image structure and the center iframe delta is read.
- 2026-06-19 135 SVG editor trigger-canvas evidence: free-trial effects selected without third-
  party material can expose a tall trigger canvas, trigger-hot-area prompts, `app-content-canvas`,
  `block-img__content`, and Vue/Ant editor wrappers such as `ant-tooltip-open`. These are schema
  inputs for InkForge-owned trigger-zone manifests, expanded-content models, direction controls,
  and mobile-preview gates only. They must fail as market editor residue if copied into WeChat,
  Xiaohongshu, or Zhihu publishable output.
- 2026-06-19 135 SVG editor material-included evidence: a selected `coverclickmovewithspread`
  free-trial block rendered the center canvas as zero-font/zero-line-height `section` wrappers
  containing a background-only `svg` with `viewBox="0 0 1080 1920"`, `width:100%`,
  `background-size:100.1% 100.1%`, `margin-top:-1px`, `vertical-align:top`,
  `pointer-events:none`, and no inline SVG children. The editable trigger was a separate
  absolute overlay with percentage `inset` values and `z-index`, while the right panel exposed
  structured parameters for cover image, move direction, animation seconds, and expanded content.
  InkForge may reuse the pattern as typed background media plus hotspot/expanded-content schema,
  but not as direct platform proof or copied vendor DOM.
- 135 ordinary style insertion depends on a live UEditor insertion range. A style list click that
  does not mutate the central editor iframe is only a listing/selection probe; applied evidence
  requires central editor DOM counts or HTML/text length to change and the inserted block to be
  read back.
- Acceptance audit must preserve that same boundary: `centralEditorChanged:false` rows for
  `market-applied-dom-readback` emit `style-proof-manifest-market-editor-not-applied` and stay
  `invalid`, even though the broader market-editor gate normally requires an external account.
- Xiumi SVG category previews can contain `svg`, `animateTransform`, and `foreignObject`, but the
  applied center canvas may materialize as image cells and authoring layers. Therefore Xiumi SVG
  evidence maps to interactive manifests and fallback artifacts, not direct inline-SVG availability.
- 2026-06-19 Xiumi SVG carousel/flow-canvas evidence: clicked SVG samples may mutate the center
  `.tn-editing-panel` as authoring cells with no literal inline SVG. Residues such as
  `tn-svg-animation-carousel`, `tn-child-orientation="flow-canvas"`,
  `tn-child-orientation-flow-canvas`, `tn-group-usage-flow-canvas`, `tn-animate`,
  `tn-yzk-font-*`, `tn-placeholder`, `opera-tn-ra-*`, Angular `ng-*`, and `ui-sortable` must stay
  publish-blocking market-editor residue. Convert them into image manifests, motion/action schema,
  readable DOM order, and static/raster/long-image fallback plans.
- 2026-06-19 Xiumi SVG category insertion evidence: a visible SVG list item labeled as image
  carousel/scrolling with a 1080-ratio hint inserted into the center editor as nested `article`,
  page, layer, `tn-cell-type=group/image/text/container`, `tn-child-position=absolute/static`,
  `tn-child-orientation=flow-canvas/fixed`, `contenteditable` text, and `raw-image` cells rather
  than literal inline SVG in the active authoring DOM. Treat Xiumi labels such as component type,
  behavior, interaction channel, and image ratio as catalog metadata for InkForge-owned renderers;
  never treat the authoring DOM shape as WeChat paste proof.
- 135 SVG effects map to typed image slots, hot zones, motion schema, trigger type, and fallback
  plans. Tall `viewBox=0 0 1080 1920`, `background-size:100.1% 100.1%`, and `margin-top:-1px` are
  layout-report heuristics only.
- Ordinary title/card styles from 135/Xiumi may influence InkForge modules only through
  source-owned renderers: title, card, quote, callout, timeline, QA, image frame, gallery, fallback
  poster, and long-image.
- WeChat output still must pass `convertToWechatWithStats`, `checkWechatSafe`, style catalog
  availability/application gates, market residue detection, and style proof manifest gates.
- Xiaohongshu output must use plain text or manifest-backed image pages/posters/long images. Zhihu
  output must use semantic Markdown or public-host image fallback with alt/caption.
- Touch-only or mobile-only market effects remain blocked until exact phone-preview proof exists
  for the InkForge artifact.

Required tests/checks:
- Market-rule additions must add no dependency on vendor class names, vendor hosted media, or
  authenticated editor DOM.
- Any future detector/parser rule must fail fast on `_135editor`, `135brush`, `135bg`,
  `data-tools`, market `data-id`, `data-brushtype`, `autonum[data-num]`,
  `style_id/style_name/style_price`, known 135 SVG builder `data-name` values,
  `app-content-canvas`, `block-img__content`, `block-img__default`, `edit-placeholder`,
  `placeholder__name`, `ant-tooltip-open`, `tn-*`, `tn-svg-animation-*`,
  `tn-child-orientation="flow-canvas"`, `tn-child-orientation-flow-canvas`,
  `tn-group-usage-flow-canvas`, `tn-yzk-font-*`, `tn-placeholder`, `tn-comp-role`,
  `tn-bind-comp-tpl-id`, `opera-tn-ra-*`, and `disable-tn-*` in publishable output.
- CSS `url(...)` references to 135/Xiumi hosted media must fail as market editor residue, including
  background-image layers that do not use `<img>`/`<image>` tags.
- Every platform style choice must expose the matching market-residue quality issue in
  `detectorBlockers`: `wechat-market-editor-residue`, `xhs-market-editor-residue`, or
  `zhihu-market-editor-residue`.
- Style proof reports must not mark Xiumi/135-inspired mobile/touch interactions complete from PC
  DOM evidence alone.

## 17. OSS Converter Source Contract - 2026-06-18

Public converter repositories such as doocs/md, mdnice/markdown-nice, and RedBookCards are
acceptable rule sources, but only as architecture and degradation evidence.

Contracts:
- WeChat converter-style output must keep the current InkForge pipeline discipline: source-owned
  theme/render rules, export-fragment CSS collection, `juice` inlining, platform cleanup,
  `checkWechatSafe`, quality detection, style catalog gates, and style proof manifests.
- Theme injection or custom CSS editing is an authoring state, not publishable proof. The copied
  WeChat artifact must contain inline, fragment-matching styles and must be verified separately from
  preview CSS.
- WeChat image width/height must be normalized into inline style data when the export path depends
  on stable pasted dimensions.
- SVG-derived math/diagram output needs explicit compatibility shims or fallback artifacts.
  WeChat inline SVG availability remains exact-artifact and channel-bound; Zhihu and Xiaohongshu
  must not inherit WeChat inline-SVG claims.
- Xiaohongshu visual styles must resolve to real image pages, posters, carousel pages, or long
  images with manifest-backed dimensions, file existence, format, count, cover/crop, and reference
  consistency.
- Zhihu visual styles must resolve to semantic Markdown or public-host image fallback with
  alt/caption and URL safety checks.
- Local clipboard/export success from OSS converter patterns must not satisfy authenticated PC
  paste, safe disposable draft, phone preview, Dark Mode, cover thumbnail, credentialed sync,
  public-host acceptance, platform upload, scheduled send, or publish requirements.

Required checks:
- Future renderer changes inspired by OSS converters must add negative tests proving copied
  third-party wrappers, WeChat-only HTML, local/private image URLs, and unresolved diagram/formula
  artifacts cannot cross into the wrong platform.
- Documentation that cites OSS converters must distinguish source-backed rules from platform proof
  and must name the remaining external gates explicitly.

## 18. WeChat Live Editor Readback Contract - 2026-06-20

Authenticated WeChat editor reachability is useful precondition evidence, but it is not fidelity
proof by itself.

Contracts:
- Live editor readback evidence must store only sanitized route shapes, DOM counts, boolean control
  presence, and redacted artifact references. It must not store account strings, draft titles,
  appmsg ids, credential query values, full platform URLs, local runtime directories, transient
  visual file names, cookies, QR artifacts, or raw article content.
- Existing-draft editor readback can satisfy only `authenticated-editor-url` and readonly
  `pc-editor-dom-readback` preconditions when the editor route is reached through the authenticated
  platform session and login/QR state is absent.
- A visible `.ProseMirror` body with inline SVG/section/style counts proves that WeChat can expose
  a rich body DOM for that existing draft, but it does not prove that the current InkForge artifact
  was pasted, preserved, cleaned up, previewed, synced, or published.
- Replacement-glyph/mojibake readback is a hard visual badcase. Any live WeChat editor evidence
  with substantial U+FFFD/replacement-character counts must remain negative fidelity evidence and
  must not satisfy exact-artifact, PC paste, phone preview, Dark Mode, cover thumbnail,
  credentialed sync, scheduled-send, platform-preview, public-rendering, or publish rows.
- Transient visual screenshots may be used for operator-side diagnosis only when needed. They must
  be deleted before commit unless explicitly redacted and intentionally added as evidence.

Required checks:
- Future manifest or audit rows that cite live editor readback must bind the same artifact,
  channel, action, accepted readback, exact artifact flag, artifact fingerprint, and safe-for-commit
  proof on the same row before satisfying paste or downstream proof gates.
- Badcase editor readbacks with replacement-glyph/mojibake evidence must remain cannot-claim rows
  for style success even if the route, toolbar, and main body DOM are reachable.
