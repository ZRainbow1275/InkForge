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
- `StyleProofArtifact.phonePreviewBlocked === true` is blocker-only evidence. It is forbidden on
  matching `phone-preview-readback`, `phone-screenshot`, `dark-mode-check`, and
  `cover-thumbnail-check` success rows; a row that claims the final phone body, screenshot,
  mobile Dark Mode, or cover acceptance while also carrying the blocker flag must stay invalid in
  the manifest report, acceptance audit, and execution runbook.
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
- 2026-06-20 Xiumi SVG-gallery state-wrapper refresh: the active Xiumi v5 paper editor center
  `.tn-editing-panel` for an applied SVG-gallery/game-screen sample exposed
  `tn-image-inst-wrapper`, `tn-quick-input-*`, `tn-page-vessel`, `tn-group-sortable-box`,
  `tn-sortable-pin`, `tn-state-*`, `tn-on-*`, `tn-in-cell-state-active`, `tn-overflow-hidden`,
  and `tn-content-overlap` classes. Treat these as publish-blocking authoring state wrappers,
  even when a copied fragment lacks broad `tn-comp` / `tn-cell` wrappers or hosted media URLs.
  They map to image-slot, editor-state, layout-report, and raster/static fallback contracts only.
- 2026-06-22 post-reboot CloakBrowser SVG material-path refresh: 135 `svgeditor` `免费试用`
  produced a material-inclusion confirmation before the central canvas was populated. The selected
  effect exposed `DIY设计图片 1080 x 1920`, cover-image slots, cover exit direction, animation
  duration fields, expanded-content editing, gap/spacing controls, and expanded-background
  guidance. Map these fields to InkForge-owned image-slot manifests, trigger-zone manifests,
  motion parameter schema, and layout reports. Do not copy the material URL, `svg:135`, effect id,
  Vue/Ant controls, or editor panel DOM into runtime output.
- 2026-06-22 post-reboot Xiumi paper-editor refresh: direct v5 paper-editor entry opened a new
  article and exposed real left categories `标题`, `卡片`, `图片`, `布局`, `SVG`, `组件`. The visible
  cards were nested `tn-tpl-item` / `tn-from-house-paper-cp` /
  `section.tn-comp-pin.tn-comp-style-pin` trees using inline flex, margin, transform, opacity,
  line-height-zero image motifs, and text cells, with no literal center inline SVG in the sampled
  cards. Treat this as section-rhythm/component-tree evidence only; `tn-*`, `ng-*`, template
  renderer state, hosted material references, and authoring bindings remain residue blockers.
- 2026-06-22 applied Xiumi SVG sample refresh: clicking the `SVG` category in the live v5 paper
  editor expanded the library from 23 to 43 template items. Clicking the first visible SVG
  image-gallery sample changed the center `.tn-editing-panel` by roughly 31.9k HTML chars,
  `tn-comp` 21 to 51, `tn-cell` 9 to 27, images 78 to 81, contenteditable cells 1 to 2, while
  center literal SVG remained 0. The applied state exposed `tn-animate`, `tn-link`, `tn-uuid`,
  `opera-tn-ra-*`, `tn-image-presenter raw-image`, `tn-content-overlap`, `ui-sortable`,
  `ui-slider`, Angular runtime attributes, and hosted `statics.xiumi.us` references. Treat this as
  applied-editor-element evidence for source-owned image slots, motion/action schema, layout
  reports, and raster/static fallback only; copied Xiumi authoring DOM remains publish-blocking
  residue.
- 2026-06-17 executable manifest contract: `StyleProofArtifact.centralEditorChanged === true`
  is now required for `market-applied-dom-readback`. A library/category/item selection,
  preview-library SVG count change, or settings-panel readback may inform taxonomy, but it must
  remain invalid for `applied-editor-element` until the center editor/canvas/paper visibly changes
  and the after-state DOM/controls are read.
- 2026-06-20 executable manifest contract: `StyleProofArtifact.marketAppliedContentVerified === true`
  is also required on the same `market-applied-dom-readback` artifact. A changed 135/Xiumi center
  canvas is still invalid when the applied state is listing-only, placeholder-only, no-material, or
  lacks meaningful DOM/controls/slots/visible content. This emits
  `style-proof-manifest-market-editor-placeholder-only` and must remain an invalid local proof row.
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
- 2026-06-22 runtime gate follow-up: newly observed 135 SVG material/parameter panel classes
  (`editor-bar`, `editor-img__block`, `editor-spread__edit`, `editor-background`) and visible
  Xiumi template-card authoring trees (`tn-tpl-item`, `tn-from-house-paper-cp`,
  `section.tn-comp-pin.tn-comp-style-pin`) must trigger market-editor residue in WeChat/XHS/Zhihu
  publishable output. These rows enforce source ownership only and must not be counted as WeChat
  paste, mobile preview, Dark Mode, cover thumbnail, sync, upload, public rendering,
  scheduled-send, or publish proof.
- 2026-06-26 135 SVG material panel child-control follow-up: the same source-specific residue
  label also covers child-only right-panel controls observed in the live editor, including
  `edit-image`, `image__title-bar`, `edit-add-images`, `edit-add-btn`, `edit-add__title`,
  `edit-animate`, `edit-animate__title`, `edit-animate__opt`, and `animate__dur`. These may inform
  InkForge-owned image slot and motion-parameter schemas, but copied controls remain
  publish-blocking residue.
- 2026-06-29 135 ordinary editor action rail follow-up: source-specific right-side action rail
  chrome observed in the live ordinary editor, including `editorslide`,
  `multiedit_agent_main`, `agent_btn`, `import-article`, `copy-editor-html`,
  `quick-save-template`, `save-as-template`, `btn-new-msg`, `large-image-popover`,
  `btn-show-drafts`, `preview-editor`, and `sync_official_accounts`, must trigger
  market-editor residue in WeChat/XHS/Zhihu publishable output. These are editor workflow
  actions, not article semantics, and they must not be counted as copy, preview, sync, upload,
  public rendering, scheduled-send, or publish proof.
- 2026-06-29 135 ordinary applied image-source follow-up: a live free-style insertion that
  succeeded after the center UEditor iframe body selection was restored changed the center editor
  from 5 to 6 top-level children and inserted `data-id="174407"` with 135-hosted images carrying
  both `src` and `_src`. Treat `_src` pointing at 135 material hosts as an explicit
  market-editor residue source, even if broad `_135editor`, `data-tools`, or numeric style ids
  have already been stripped. This proves local residue coverage only, not paste, mobile preview,
  sync, upload, scheduled-send, or publish success.
- 2026-06-29 135 ordinary style-panel navigation follow-up: live left-panel page chrome included
  `style-operate-area`, `style-color-palette`, `style-categories`, `style-sorts`, and
  `news_modal-ys`. These are library navigation / theme-color / sort controls, not article
  semantics. If copied into WeChat/XHS/Zhihu publishable output, they must trigger
  market-editor residue even when style-card operation buttons, UEditor chrome, action rail
  chrome, hosted material URLs, and SVG-builder markers are absent.
- 2026-06-29 135 ordinary full-page navigation follow-up: live full-page chrome included
  `nav-header`, `top-style-tools`, `site-annoucement-list`, `login-menus`,
  `left-operate-menu`, `left-advertises`, `bg-header`, `category-nav`,
  `left_side__menu`, and `ai_subsystem_nav`. These are site header, announcement,
  account menu, product navigation, and left-main-menu controls, not article semantics. If copied
  into WeChat/XHS/Zhihu publishable output, they must trigger market-editor residue even when
  style-panel, style-card, UEditor, action rail, hosted image, and SVG-builder markers are absent.
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
- 2026-06-21 XHS Markdown card slicer contract: `sliceMarkdownToXhsCards()` may convert source
  Markdown headings, manual page breaks, lists, and fenced code blocks into ordered XHS card
  slices; `renderXhsMarkdownCardSliceSvg()` must keep those slices source-owned and SVG-safe; and
  `createXhsMarkdownCardSliceManifestInputs()` must feed the existing XHS raster manifest builder
  instead of inventing a parallel manifest format. The committed
  `xhs-markdown-card-slicer-browser-2026-06-21.json` pack is local proof only: it satisfies local
  raster, exact-artifact, XHS artifact-manifest, and sensitive-hygiene rows, but it must not be
  used as Xiaohongshu account upload, platform preview, public URL acceptance, scheduled-send, or
  publish proof.
- 2026-06-21 Zhihu available clean Markdown evidence contract:
  `zhihu-academic-latex-column` and `zhihu-wechat-adapted` may use committed
  `markdownToZhihuClean()` artifacts as local exact-artifact proof. Academic LaTeX proof covers
  block/inline equation image Markdown, footnotes, and typed code fences; WeChat-adapted proof
  covers removal of `section`, inline SVG, `data-ink-*`, `style`, and `class` residue. These rows
  satisfy only unit-test, exact-artifact, and sensitive-hygiene proof. They must not satisfy
  `public-image-host`, `zhihu-artifact-manifest`, account upload, platform preview,
  scheduled-send, or publish proof without separate redacted platform evidence.

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
  | 'darkModeEnabledVerified' | 'coverThumbnailAccepted' | 'mojibakeFreeVerified'
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
export interface CommittedStyleProofExecutionRunbookReport {
  local: StyleProofExecutionRunbook
  wechatPc: StyleProofExecutionRunbook
  combined: StyleProofExecutionRunbook
}
export function getCommittedStyleProofEvidenceExecutionRunbookReport(): CommittedStyleProofExecutionRunbookReport
export type CommittedStyleProofReleaseGateStatus =
  | 'ready' | 'blocked-by-local-conflict' | 'blocked-by-external' | 'unsafe-to-automate'
export interface CommittedStyleProofReleaseNextOperatorAction {
  platforms: readonly Platform[]
  requirementId?: StyleProofRequirementId
  gate?: StyleProofCollectionGate
  boundary?: StyleProofExecutionBoundary
  action: string
}
export interface CommittedStyleProofReleasePlatformStepCount {
  platform: Platform
  stepCount: number
}
export interface CommittedStyleProofReleaseRequirementStepCount {
  requirementId: StyleProofRequirementId
  stepCount: number
}
export interface CommittedStyleProofReleaseIssueCount {
  issueId: StyleProofManifestIssueId
  count: number
}
export interface CommittedStyleProofReleaseGateBlocker {
  issueCount: number
  platformStepCounts: readonly CommittedStyleProofReleasePlatformStepCount[]
  requirementStepCounts: readonly CommittedStyleProofReleaseRequirementStepCount[]
  issueCounts: readonly CommittedStyleProofReleaseIssueCount[]
  nextOperatorActions: readonly CommittedStyleProofReleaseNextOperatorAction[]
}
export interface CommittedStyleProofReleaseGateReport {
  source: CommittedStyleProofExecutionRunbookReport
  canClaimComplete: boolean
  status: CommittedStyleProofReleaseGateStatus
}
export function getCommittedStyleProofEvidenceReleaseGateReport(): CommittedStyleProofReleaseGateReport

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
  - Xiumi SVG gallery state wrappers such as `tn-image-inst-wrapper`, `tn-page-vessel`,
    `tn-group-sortable-box`, `tn-sortable-pin`, `tn-state-*`, `tn-on-*`, and
    `tn-quick-input-*` are not article semantics. They are editor state/slot/fallback signals and
    must trigger market-editor residue if they appear in publishable output.
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
  `market-applied-dom-readback` artifact and must set `marketAppliedContentVerified:true` only
  after the applied center state exposes meaningful non-placeholder structure. Center-unchanged
  library/listing probes must surface `style-proof-manifest-market-editor-not-applied`; changed
  placeholder/list-only/no-material states must surface
  `style-proof-manifest-market-editor-placeholder-only`.
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
- `externalAccountLoginBlocked:true` is blocker-only evidence. It is forbidden on matching
  `credentialed-channel-response`, `sync-readback`, `scheduled-send-readback`, and
  `published-url-or-platform-preview` success rows; a row that claims authenticated sync,
  scheduled send, public URL, or platform preview while also carrying the blocker flag must stay
  invalid in the manifest report, acceptance audit, and execution runbook.
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
- `successCriteria` and `failureSignals` must describe `requiredFields` with field-level criteria,
  not only raw field names. The raw field names must remain present for traceability, but operator
  text must explain the real-world condition, especially `marketAppliedContentVerified:true` for
  non-placeholder 135/Xiumi applied content, `ordinaryClipboardPasteVerified:true` for the ordinary
  OS Ctrl+V path, `mojibakeFreeVerified:true` for editor fidelity, and
  `artifactManifestValidated:true` for XHS/Zhihu artifact-manifest validators.
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
- A runbook generated from a manifest claiming `applied-editor-element` must expose
  `marketAppliedContentVerified:true` and non-placeholder applied-content criteria in both success
  criteria and failure signals for `market-applied-dom-readback`.
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
- `externalAccountLoginBlocked:true` is also forbidden on otherwise complete matching credentialed
  and publish success rows. The validator must emit `style-proof-manifest-forbidden-field-present`,
  the requirement-level acceptance audit must remain `invalid`, and the execution runbook must
  name `externalAccountLoginBlocked:true` in both success criteria and failure signals.
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
- `phonePreviewBlocked:true` is also forbidden on otherwise complete matching phone success rows.
  The validator must emit `style-proof-manifest-forbidden-field-present`, the requirement-level
  acceptance audit must remain `invalid`, and the execution runbook must name
  `phonePreviewBlocked:true` in both success criteria and failure signals.
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
  PC paste artifact fingerprint is the exact exported HTML SHA or WeChat clipboard payload SHA.
  Local evidence rows may keep Tauri/WebView screenshots or raster outputs as `artifactRef`, but
  WeChat flagship local rows that are reconciled to a proven PC clipboard payload must use that
  same effective artifact fingerprint instead of a screenshot-path fingerprint.
- The current WeChat PC committed pack may include `wechat-flagship-amber` evidence from
  `wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt` and `wechat-flagship-tempera`
  entity-safe evidence from `wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt`. It may
  satisfy `authenticated-editor-url`, `pc-editor-dom-readback`, `exact-artifact`,
  `safe-disposable-draft`, `pc-editor-paste-event`, and `no-sensitive-artifact` for the exact
  committed PC payload fingerprints only.
- The WeChat PC committed pack must keep Amber and Tempera incomplete at style-choice level until
  mobile preview, Dark Mode, cover thumbnail, sync, scheduled-send, public URL/platform preview,
  and publish proof exists. After the 2026-06-21 reconciliation, Amber is no longer
  catalog-blocked, so its committed PC progress is `missing` rather than `invalid`; Tempera also
  remains `missing`. Do not generalize Amber PC proof or Tempera entity-safe PC proof to raw UTF-8
  Tempera direct paste, Kiln, phone, sync, or publish rows.
- Negative Kiln PC attempts, including the raw plain-text proof and the 2026-06-19 entity-safe
  editor-return/no-rich-readback proof, must stay out of
  `getCommittedStyleProofWechatPcEvidenceManifests()`. They are evidence for blocked claims and
  future troubleshooting only, not success manifests for PC paste rows.
- `getCommittedStyleProofWechatPcEvidenceAuditReport()` is only shorthand for auditing that
  committed WeChat PC pack. It must keep cannot-claim rows visible.
- `getCommittedStyleProofEvidenceManifests()` is the combined committed-evidence view for current
  acceptance accounting. It must clone and concatenate the committed local pack plus the committed
  WeChat PC pack without mutating either source helper.
- `getCommittedStyleProofEvidenceAuditReport()` must expose three views: the local committed audit,
  the WeChat PC committed audit, and the combined audit. The combined view is allowed, and expected,
  to expose `style-proof-manifest-pack-fingerprint-mismatch` only when local WebView/browser
  evidence and PC paste evidence for the same choice refer to different effective exact artifact
  fingerprints. When no such split exists, the summary must surface
  `hasExactArtifactFingerprintConflicts:false`; consumers must still keep phone, sync,
  public-host, scheduled-send, and publish rows unclaimable.
- `getCommittedStyleProofLocalEvidenceExecutionRunbook()` and
  `getCommittedStyleProofWechatPcEvidenceExecutionRunbook()` must be shorthand for running the
  existing execution-runbook layer over their matching committed manifest packs. They must not add
  proof rows, mutate manifests, create artifacts, or soften any `cannotClaim` row.
- `getCommittedStyleProofEvidenceExecutionRunbookReport()` must expose the same three-view shape as
  the committed audit report (`local`, `wechatPc`, and `combined`) but with
  `StyleProofExecutionRunbook` payloads. Its summary must surface combined issue count, exact
  artifact fingerprint conflicts, cannot-claim steps, phone-open steps, external-dependency-open
  steps, unsafe-to-automate steps, and mutating-open steps so acceptance dashboards can tell
  operator work from local proof without claiming external completion.
- `getCommittedStyleProofEvidenceReleaseGateReport()` must be the top-level committed-evidence
  claim gate. It may only read from `getCommittedStyleProofEvidenceExecutionRunbookReport()`. It
  must not create proof, mutate manifests, downgrade invalid rows, or infer external success. Its
  `canClaimComplete` value must remain `false` whenever combined evidence has local manifest
  conflicts, cannot-claim rows, phone-open steps, external-dependency-open steps,
  unsafe-to-automate rows, or mutating platform rows. Its blockers must group the current release
  barriers into local conflict, phone preview, external dependency, unsafe-to-automate, and
  mutating-platform buckets. The local-conflict blocker must expose `fingerprintConflicts` for
  same-platform same-choice exact-artifact conflicts so operators can see which choices and
  fingerprints need separate proof collection. Every blocker must also expose
  `issueCount`, `platformStepCounts`, `requirementStepCounts`, and `issueCounts`. `issueIds`
  must be a de-duplicated list for scanning, while `issueCounts` preserves occurrence counts so
  completion reports can say exactly how many missing/blocked rows remain. Step blockers must
  count steps by platform and proof requirement; the local-conflict blocker may leave step-count
  breakdowns empty when it is summarizing manifest issues rather than execution steps. Every
  blocker must also expose
  `nextOperatorActions`, derived from the execution runbook rather than new proof, so the UI can
  show the next real operator action without changing release status. Phone blockers must
  prioritize phone-preview readback; external blockers must prioritize public-host or credentialed
  channel readback; unsafe and mutating blockers must prioritize platform-publish readback. The
  local-conflict blocker must instruct operators to reconcile stale conflicting committed
  fingerprints only when fingerprint mismatches exist; otherwise it must point operators at the
  remaining missing proof rows.
- `ExportModal` may surface this committed-evidence release gate as a read-only preflight row.
  The row must read from `getCommittedStyleProofEvidenceReleaseGateReport()`, show
  `canClaimComplete`, blocker count, `fingerprintConflicts`, and a short `operatorNext` summary,
  and remain blocked while the report is not ready. It must not create proof artifacts, run
  platform actions, or imply phone, sync, public-host, scheduled-send, or publish completion.

Required tests:
- The committed local pack returns three WeChat flagship manifests, XHS clean-text,
  cover-carousel, and cover-hook local manifests, and Zhihu clean-column plus data-table local
  manifests, all as safe committed artifacts, with no duplicate artifact ids and no
  sensitive/unsafe commit issues.
- The pack report has `validManifestCount:0` because external proof is intentionally absent; this
  is expected and must not be relaxed.
- Kiln and Tempera local/sensitive gates are satisfied, while PC editor paste, phone preview, Dark
  Mode, cover, sync, and publish rows stay missing/unclaimable.
- Amber is no longer catalog-blocked after the 2026-06-18 ordinary OS Ctrl+V exact proof, but local
  WebView2 evidence alone still leaves PC/phone/publish rows missing.
- Tempera local committed evidence uses the proven entity-safe WeChat clipboard artifact
  fingerprint from `wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt`, while keeping the
  local Tauri/WebView screenshot as `artifactRef`. This must not be generalized into raw UTF-8
  ordinary paste proof.
- The XHS cover-carousel and cover-hook manifests satisfy local evidence, sensitive hygiene, and
  `xhs-artifact-manifest` with same-row `artifactRef`, `artifactManifestValidated:true`, and
  `safeForCommit:true`, while
  `published-url-or-platform-preview` remains missing and unsafe-to-automate.
- The XHS clean-text manifest may satisfy only `unit-test-coverage`, `exact-artifact`, and
  `no-sensitive-artifact` for the exact source-owned text artifact. It must not claim
  `local-browser-rendering`, `xhs-artifact-manifest`, scheduled-send, platform-preview, public URL,
  or publish proof.
- The Zhihu data-table committed local manifest may satisfy only source-owned clean Markdown local
  rows (`unit-test-coverage`, `local-browser-rendering`, `exact-artifact`, and
  `no-sensitive-artifact`) for the exact redacted table artifact. It must not satisfy
  `zhihu-artifact-manifest`, `public-image-host`, credentialed sync, scheduled-send,
  platform-preview, public article rendering, or publish proof without separate validator,
  public-host, and platform evidence.
- The Zhihu clean-column committed local manifest may satisfy only `unit-test-coverage`,
  `exact-artifact`, and `no-sensitive-artifact` for the exact source-owned clean Markdown
  artifact. It must not claim `local-browser-rendering`, `public-image-host`,
  `zhihu-artifact-manifest`, credentialed sync, scheduled-send, platform-preview, public article
  rendering, or publish proof.
- The committed WeChat PC pack returns cloned Amber and Tempera manifests. Amber artifacts point
  to the redacted Amber PC evidence file with fingerprint
  `sha256:09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d`; Tempera artifacts
  point to the redacted entity-safe PC evidence file with fingerprint
  `sha256:f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`.
- The committed WeChat PC pack must satisfy Amber and Tempera authenticated editor, PC DOM, exact
  artifact, safe disposable draft, ordinary PC paste, and hygiene rows while leaving phone preview,
  Dark Mode, cover thumbnail, scheduled-send, and publish rows missing/cannot-claim.
- The combined committed-evidence audit must return 10 cloned manifests, keep artifact ids unique,
  expose exact-artifact fingerprint conflicts only for still-divergent choice rows, and keep phone
  preview, Dark Mode, cover thumbnail, sync, scheduled-send, and publish/platform-preview rows
  unclaimable. As of the 2026-06-21 Tempera reconciliation, the committed pack has no current
  exact-artifact fingerprint conflicts.
- The combined committed-evidence runbook report must return local / WeChat PC / combined runbook
  views for the same 8-local plus 2-WeChat-PC manifest combined pack, keep exact-artifact
  conflicts visible at summary and issue-list level only when they exist, and keep WeChat phone
  preview blocked-by-external, WeChat scheduled-send and XHS publish unsafe-to-automate, and Zhihu
  public-host blocked-by-external.
- The committed-evidence release gate report must return `canClaimComplete:false` and
  `status:"blocked-by-local-conflict"` for the current committed pack, while still exposing phone,
  external-dependency, unsafe-to-automate, and mutating-platform blockers. It must include
  `phone-preview-readback`, `public-image-host`, `sync-readback`, `scheduled-send-readback`, and
  `published-url-or-platform-preview` in the appropriate blocker rows. Its local-conflict blocker
  must include de-duplicated `issueIds`, occurrence-preserving `issueCounts`, and
  `fingerprintConflicts` only for current unresolved local-vs-PC artifact splits. Phone and
  external blockers must expose `platformStepCounts` and `requirementStepCounts` so the UI and
  completion reports can identify whether remaining work is WeChat phone, credentialed account,
  public-host, scheduled-send, or publish readback. As
  of the 2026-06-21 Amber and Tempera reconciliations, the committed pack currently has
  `hasExactArtifactFingerprintConflicts:false`; the report remains unclaimable because missing
  proof, phone, external dependency, unsafe-to-automate, and mutating-platform rows remain open.
- The ExportModal style capability/preflight surface must show the committed release gate as
  `canClaimComplete=false` with the current blocker and fingerprint-conflict counts for the
  evidence pack. The visual row must use the existing preflight state model and stay `blocked`; it
  is an operator diagnostic, not a publish/sync action.

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
- 2026-06-29 135 ordinary style-library refresh: left style-card operation chrome such as
  `judgeYangShiJurisdiction(...)`, `similarity_recommend_entry`, `material-id` paired with
  `material-type="style"`, and `mappaobug="true"` paired with `data-model="EditorStyle"` must
  also fail as market editor residue. These are source-library controls, not publishable article
  semantics, and they must stay blocked even when `_135editor`, `data-tools`, and
  `style_id/style_name/style_price` have been stripped.
- 2026-06-29 135 ordinary UEditor chrome refresh: normal-editor toolbar and editor shell markers
  such as `edui-toolbar`, `edui-button`, `edui-for-*`, `edui-wx-input`, `edui-editor`,
  `edui-editor-mainbar`, `edui-editor-toolbarbox`, and `edui-editor-iframeholder` must fail as
  market editor residue. These are editor UI controls, not article semantics, and they must stay
  blocked even when ordinary style, left-library, and SVG-builder metadata are absent.
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
- 2026-06-20 executable compatibility fixture: even without `_135editor`, `app-content-canvas`,
  known builder `data-name`, hosted media URLs, or trigger overlay classes, a 135-style
  background-only SVG shell with `font-size:0`, `line-height:0`, `viewBox="0 0 1080 1920"`,
  `background-size:100.1% 100.1%`, `margin-top:-1px`, `vertical-align:top`, and
  `pointer-events:none` must stay blocked by existing platform contracts: WeChat
  `wechat-line-height-zero` + `wechat-layout-report-required`, XHS HTML/SVG leakage, and Zhihu
  inline SVG/HTML/style checks.
- 2026-06-20 135 SVG editor no-material deep pass: a clicked free-trial effect can populate the
  central authoring canvas with multiple effect blocks and a selected interaction block that
  exposes image slots, hidden trigger overlays, percentage hot-area geometry, resize handles,
  trigger-area visibility controls, direction controls, motion-duration fields, expanded-content
  editing, block ordering, spacing, copy/delete, and gap-removal controls. Promote those controls
  only into InkForge-owned manifest fields: `imageSlots`, `triggerZones`, `triggerType`,
  `direction`, `motionDuration`, `expandedContentSlots`, `blockOrdering`, `spacingPolicy`,
  `staticExpandedFallback`, `rasterFallback`, and `mobilePreviewRequired`.
- 2026-06-20 135 SVG editor no-material deep pass residue rule: placeholders and no-material trial
  blocks are schema/risk evidence only. They must not satisfy final visual fidelity, artifact
  paste, phone interaction, or publish proof, and copied authoring markers such as `block-img`,
  `block-img__trigger`, `edit-trigger`, `trigger__ajuster`, `trigger_tip`, `ajuster`,
  `edit-trigger__switch`,
  `placeholder__name`, Vue/Ant wrappers, or builder `data-name` families must remain
  market-editor-residue blockers. Trigger overlay markers are reported by the source-specific
  `135 SVG trigger hot-area overlay residue` label defined in section 117.
- 2026-06-20 135 SVG editor shell refresh: the active free-trial SVG editor page exposed the center
  authoring shell classes `content-canvas`, `content-background`, `content-inner`, `block`,
  `block-inner`, `block-img`, `block-img__inner`, `placeholder__help`, `placeholder__icon`,
  `article-item__inner`, `article-item__label`, and `article-item__del`. Specific editor-shell
  markers such as `block-img__inner`, `placeholder__help/icon`, `article-item__inner/label/del`,
  and `articles_pop` must fail as `135 SVG editor shell residue` if copied into WeChat/XHS/Zhihu
  publishable output.
- 2026-06-20 135 SVG editor layout-control refresh: after a visible free-trial click, the center
  `.content-canvas` can expose authoring-only spacing and title-edit controls such as
  `block-spacing`, `block-gap`, `gap-item-wrapper`, `article-item__editing`,
  `ant-slider-track`, and `ant-slider-handle`. These controls are residue, not reusable layout
  source, and must fail as `135 SVG editor layout control residue` across WeChat, Xiaohongshu, and
  Zhihu publishable output.
- 2026-06-21 135 SVG editor free-trial recheck: a visible CloakBrowser click on a `免费试用`
  effect again populated the center editor with authoring-only structure. The post-click DOM
  contained two `content-canvas` / `content-inner` / `content-background` containers, ten
  `block-img__inner` image-slot shells, ten `placeholder__help` helpers, two
  `block-spacing` / `block-gap` controls, four `gap-item-wrapper` rows, four
  `ant-slider-track` / `ant-slider-handle` controls, and `edit-trigger__switch` /
  `ant-switch-checked` trigger switches. Trigger overlay and switch controls are schema inputs for
  InkForge-owned trigger-zone, image-slot, spacing, fallback, and layout-report models only; they
  must not be copied into publishable output, and the switch controls are covered by section 118.
- 2026-06-22 post-reboot 135 SVG editor recheck: a visible CloakBrowser `免费试用` click plus the
  material-included confirmation again inserted a `coverclickmovewithspread` active block. The
  sampled block used a zero-font/zero-line-height section and a background-only `svg
  viewBox="0 0 1080 1920"` with `background-size:100.1% 100.1%`, `display:inline-block`,
  `margin-top:-1px`, `pointer-events:none`, `svg:135`, `user-select:none`,
  `vertical-align:top`, and `width:100%`. Treat `100.1%` sizing and `-1px` compensation as
  gap-sealing tactics for InkForge-owned image-slot/fallback/layout-report schemas only. Copied
  markers such as `svg:135`, `coverclickmovewithspread`, `edit-trigger`, `trigger__ajuster`,
  `trigger_tip`, `ajuster`, and hosted 135 material URLs must remain market-editor residue.
- 135 ordinary style insertion depends on a live UEditor insertion range. A style list click that
  does not mutate the central editor iframe is only a listing/selection probe; applied evidence
  requires central editor DOM counts or HTML/text length to change and the inserted block to be
  read back.
- 2026-06-20 CloakBrowser ordinary-style refresh confirmed the applied boundary again on the active
  135 ordinary editor: after focusing the UEditor iframe and clicking `#style-173703`, current
  readback reported `bodyChildren=6`, `bodyHtmlLen=25148`, `nodes=186`, `sections=122`,
  `styleAttrs=131`, `dataTools=7`, `dataId=7`, `dataBrushType=18`, `svgs=5`, `images=12`, and
  `style173703=2`. This is a valid applied-editor-element observation, but it only reinforces the
  no-copy rule for `_135editor`, `data-tools`, market `data-id`, `data-brushtype`, inline authoring
  structure, and style-list metadata. It does not require a new runtime rule or satisfy WeChat
  paste, phone, sync, or publish proof.
- Acceptance audit must preserve that same boundary: `centralEditorChanged:false` rows for
  `market-applied-dom-readback` emit `style-proof-manifest-market-editor-not-applied` and stay
  `invalid`, even though the broader market-editor gate normally requires an external account.
- Acceptance audit must also preserve the applied-content boundary:
  `market-applied-dom-readback` rows missing `marketAppliedContentVerified:true` emit
  `style-proof-manifest-market-editor-placeholder-only` and stay `invalid`, even when the central
  canvas changed and the artifact is otherwise safe to commit.
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
- 2026-06-20 Xiumi SVG layer-slot rerun: clicking a visible SVG gallery/scrolling item changed the
  center `.tn-editing-panel` by `htmlLength +31920`, `tnComp +15`, `tnCell +18`, `img +3`, and
  `contenteditable +1`, while center inline SVG stayed `0`. Fine-grained markers such as
  `tn-page-slot`, `tn-layer-slot`, `tn-child-position-absolute/static`,
  `tn-child-orientation-fixed/flow-canvas`, and `raw-image` must remain market-editor residue even
  if broad `tn-comp` / `tn-cell` wrappers or Xiumi CDN URLs are stripped.
- 2026-06-20 Xiumi component-binding refresh: the same active applied center state exposed
  high-volume component binding attributes such as `tn-bind-comp-tpl-id`, `tn-comp-role`,
  `tn-comp`, `tn-comp-pose`, `tn-uuid`, `tn-animate`, `tn-animate-on-self`, `tn-cell-type`,
  `tn-child-position`, `tn-child-orientation`, `tn-page-stage-size`, `tn-page-cache-gatherer`,
  `tn-atom-context`, `tn-link`, and `tn-image-usage`. These attributes are Xiumi authoring/runtime
  bindings. They must fail as source-specific Xiumi component-binding diagnostics, not only as a
  generic `Xiumi tn-* attribute`, when they appear in WeChat/XHS/Zhihu publishable output.
- 2026-06-20 Xiumi SVG taxonomy deep pass: the SVG category exposed families such as basic SVG,
  image carousel, click-expand, path animation, draw/lottery, sliding, transition, branch
  transition, scroll trigger, parallax, click switch, flip/turn page, zoom, click quiz, bullet text,
  click show, click replace image, click open, click disappear, popup, click enlarge, print, jump,
  play, long-press switch, region trigger, click drop, and click-plus-auto. Map these labels to
  InkForge-owned `componentFamily`, `behaviorFamily`, `interactionChannel`, `imageRatio`,
  `fallbackFamily`, and `proofRequirement` metadata, not to copied Xiumi DOM.
- 2026-06-20 Xiumi interactive/non-interactive split: Xiumi labels such as SVG gallery, SVG layout,
  SVG animation, free sliding layout, overlapping layout, gallery scroll, gallery switch,
  transition, slide sequence, fade-in, interactive, non-interactive, and ratios such as 1080x720,
  1080x1440, or 1080x2223 are manifest inputs. Non-interactive or auto-only samples may justify
  static/auto/raster/carousel-page/long-image fallbacks, but they must not satisfy mobile tap,
  swipe, long-press, or publish proof. Plugin/sync/enhanced-mode effects stay behind credentialed
  channel proof.
- 2026-06-21 Xiumi SVG recovery-modal recheck: the live v5 paper editor exposed the SVG taxonomy
  and a readable `.tn-editing-panel`, but a recovery confirmation dialog asked whether to restore a
  previous unsaved draft. Do not automate either recovery choice. A blocked recovery dialog means
  the run is taxonomy/readability evidence only; it is not `market-applied-dom-readback` and must
  not satisfy applied proof until the center editor mutation is safely operator-confirmed and read
  back.
- 2026-06-22 post-reboot Xiumi Studio recheck: the fixed CloakBrowser profile opened Studio v5 but
  stayed on the editor-selection/login surface after clicking `图文排版`. That run is an external
  login-state blocker only. It must not be recorded as Xiumi `applied-editor-element` evidence or
  used to satisfy center-paper mutation, SVG/title/card insertion, WeChat paste, phone-preview,
  sync, platform-preview, or publish proof.
- 2026-06-20 executable fallback-catalog contract: market SVG/H5/rich-layout taxonomy is now
  represented in `PLATFORM_STYLE_CHOICES` as blocked fallback choices instead of hidden prose:
  `wechat-market-svg-h5-fallback-matrix`, `xhs-market-rich-card-fallback`, and
  `zhihu-market-rich-layout-fallback`. These choices let UI/report surfaces show the option family
  and its required fallback path, but `evaluateStyleChoiceAvailability()` must keep them unusable
  until exact InkForge-owned artifacts, phone/public-host/manifest proof, and platform publish proof
  exist. They must have no `StyleChoiceApplication` preset mapping and must retain the platform
  market-residue detector blocker.
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
  `style_id/style_name/style_price`, `judgeYangShiJurisdiction(...)`,
  `similarity_recommend_entry`, 135 `material-id` style-library controls, `mappaobug` /
  `data-model="EditorStyle"`, 135 UEditor `edui-*` toolbar/editor chrome,
  135 ordinary editor action rail chrome such as `editorslide`, `multiedit_agent_main`,
  `agent_btn`, `copy-editor-html`, `quick-save-template`, `save-as-template`,
  `preview-editor`, and `sync_official_accounts`,
  135 style panel navigation chrome such as `style-operate-area`, `style-color-palette`,
  `style-categories`, `style-sorts`, and `news_modal-ys`,
  135 full-page navigation chrome such as `nav-header`, `top-style-tools`,
  `site-annoucement-list`, `login-menus`, `left-operate-menu`, `left-advertises`,
  `bg-header`, `category-nav`, `left_side__menu`, and `ai_subsystem_nav`,
  135 helper iframe chrome such as `ai_polish_box_iframe`, `js_shared_iframe`,
  `svg_editor_iframe`, `ueditor_0`, and `_src="/style-center?...`,
  135 announcement link chrome such as `announcement unread` links and
  `/announcements/view/<id>` hrefs,
  known 135 SVG builder `data-name` values,
  `app-content-canvas`, `block-img__content`, `block-img__default`, `block-img__trigger`,
  `edit-placeholder`, `edit-trigger`, `edit-trigger__switch`, `trigger__ajuster`,
  `trigger_tip`, `ajuster`,
  135 hosted image references in `src`, `_src`, `data-src`, `href`, or `xlink:href`,
  `placeholder__name`, `ant-tooltip-open`, `tn-*`, `tn-svg-animation-*`,
  `tn-child-orientation="flow-canvas"`, `tn-child-orientation-flow-canvas`,
  `tn-group-usage-flow-canvas`, `tn-page-slot`, `tn-layer-slot`,
  `tn-child-position-absolute/static`, `tn-child-orientation-fixed/flow-canvas`, `raw-image`,
  135 SVG editor-shell markers such as `block-img__inner` / `placeholder__help` /
  `article-item__inner`, `tn-yzk-font-*`, `tn-placeholder`, `tn-comp-role`,
  `tn-bind-comp-tpl-id`, component-binding attributes such as `tn-uuid` / `tn-animate` /
  `tn-cell-type` / `tn-child-position`, `opera-tn-ra-*`, and `disable-tn-*` in publishable output.
- CSS `url(...)` references to 135/Xiumi hosted media must fail as market editor residue, including
  background-image layers that do not use `<img>`/`<image>` tags.
- 2026-06-21 CloakBrowser refresh adds two exact residue labels:
  `135 SVG background style marker` for copied 135 inline `svg:135` background-SVG style markers,
  and `Xiumi template renderer pipeline residue` for copied Xiumi template preview/injection
  pipeline markers such as `tplLib.onTemplateClicked`, `tpl2BoxClasses`, `tpl2PresentType`,
  `tn-tpl-pose-fit-box`, `renderer_accelerate`, and `validateImageTypeInHtml`.
- Every platform style choice must expose the matching market-residue quality issue in
  `detectorBlockers`: `wechat-market-editor-residue`, `xhs-market-editor-residue`, or
  `zhihu-market-editor-residue`.
- Market-inspired fallback choices must remain `blocked`, unavailable under each platform's default
  evidence, and unmapped from existing presets until their exact artifact proof is collected.
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
- `pc-editor-dom-readback` proof must carry `mojibakeFreeVerified:true` on the same authenticated
  `platform-editor` / `pc-editor-dom-readback` row that also proves editor target, surface, DOM
  readback, accepted readback type, and safe-for-commit status. Missing or false mojibake clearance
  emits `style-proof-manifest-editor-mojibake-not-ruled-out` and keeps the requirement-level
  acceptance audit `invalid`.
- Transient visual screenshots may be used for operator-side diagnosis only when needed. They must
  be deleted before commit unless explicitly redacted and intentionally added as evidence.

Required checks:
- Future manifest or audit rows that cite live editor readback must bind the same artifact,
  channel, action, accepted readback, exact artifact flag, artifact fingerprint, and safe-for-commit
  proof on the same row before satisfying paste or downstream proof gates.
- Badcase editor readbacks with replacement-glyph/mojibake evidence must remain cannot-claim rows
  for style success even if the route, toolbar, and main body DOM are reachable.
- Regression tests must reject a PC editor DOM row that has authenticated session, target, surface,
  DOM readback, and safe-for-commit flags but lacks `mojibakeFreeVerified:true`; unrelated
  `no-sensitive-artifact` hygiene rows must remain satisfiable in the same evidence-label report.

## 19. External Proof Freshness Contract - 2026-06-20

External proof rows are time-sensitive and must not be treated as reusable forever.

Contracts:
- `StyleProofArtifact.collectedAt` is the timestamp field for external proof collection. It must be
  stored as a redacted parseable timestamp on the same matching proof row as the action, channel,
  readback, exact-artifact, authentication, phone, public-host, or publish flags.
- The default freshness window is 14 days. `StyleProofExecutionArtifactContract.maxFreshnessDays`
  may narrow or widen a specific requirement later, but no current contract should use a longer
  window without an explicit spec update and regression coverage.
- The following requirement contracts require fresh `collectedAt`:
  `market-applied-dom-readback`, `authenticated-editor-url`, `pc-editor-dom-readback`,
  `safe-disposable-draft`, `pc-editor-paste-event`, `phone-preview-readback`,
  `phone-screenshot`, `dark-mode-check`, `cover-thumbnail-check`,
  `credentialed-channel-response`, `sync-readback`, `scheduled-send-readback`,
  `published-url-or-platform-preview`, and `public-image-host`.
- Local-only proof rows do not require `collectedAt`: `catalog-source`,
  `no-proprietary-template-source`, `unit-test-coverage`, `local-browser-rendering`,
  `exact-artifact`, `xhs-artifact-manifest`, `zhihu-artifact-manifest`, and
  `no-sensitive-artifact`.
- Missing timestamps emit `style-proof-manifest-collected-at-missing`; future or unparseable
  timestamps emit `style-proof-manifest-collected-at-invalid`; timestamps older than the accepted
  window emit `style-proof-manifest-proof-stale`.
- These issue ids are acceptance-invalid. Requirement-level acceptance audits must keep the row in
  `cannotClaim` and must not downgrade the gap to ordinary external blocking.
- Committed proof helpers may record real historical collection dates, but must not auto-renew
  those dates on local test runs. A stale committed proof is a release blocker that requires a new
  real evidence collection.

Required checks:
- Regression tests must cover missing, future/invalid, and stale `collectedAt` values on external
  proof rows.
- Positive external proof fixtures that are expected to satisfy a requirement must carry a fresh
  `collectedAt` value on the same row.
- Tests must continue proving that local-only artifact manifests and sensitive-hygiene rows remain
  satisfiable without timestamps.
- Documentation and evidence must state that freshness accounting does not prove phone preview,
  mobile interaction, Dark Mode, cover thumbnail acceptance, sync, scheduled send, public-host
  acceptance, upload, or publish success.

## 20. Execution Runbook Freshness Guidance - 2026-06-21

The execution runbook is the operator-facing bridge from acceptance audit rows to real evidence
collection. It must make freshness blockers visible instead of leaving operators to infer them from
generic invalid-proof messages.

Contracts:
- `StyleProofExecutionRunbookStep` must expose freshness metadata derived from the exact
  `StyleProofExecutionArtifactContract` and the requirement-level acceptance audit:
  `requiresFreshCollectedAt`, `freshnessMaxDays`, and `freshnessIssueIds`.
- `requiresFreshCollectedAt` is true only when the execution artifact contract requires the
  `collectedAt` field. Local-only proof rows must continue to expose `false` and
  `freshnessMaxDays:null`.
- `freshnessIssueIds` is limited to:
  `style-proof-manifest-collected-at-missing`,
  `style-proof-manifest-collected-at-invalid`, and
  `style-proof-manifest-proof-stale`.
- `cannotClaimReason` must name freshness failures before generic external blockers:
  missing `collectedAt`, unparseable/future timestamps, and stale proof each require a distinct
  operator-readable reason.
- `nextOperatorAction` must instruct the operator to recapture the exact external proof and attach
  one matching proof row with `collectedAt` inside the active freshness window. It must not suggest
  reusing stale, future-dated, timestamp-free, or cross-artifact proof.
- `successCriteria` and `failureSignals` must state the active freshness window so UI/report
  consumers can display the rule without reimplementing validator logic.

Required checks:
- Regression tests must assert that external runbook steps expose `requiresFreshCollectedAt:true`,
  `freshnessMaxDays:14`, and empty freshness issues when no freshness issue is present.
- Regression tests must assert that missing, future/invalid, and stale timestamp issues flow into
  `freshnessIssueIds`, specialized `cannotClaimReason`, and recapture-oriented
  `nextOperatorAction`.
- Regression tests must assert that local-only steps such as `exact-artifact` remain
  `requiresFreshCollectedAt:false` with `freshnessMaxDays:null`.
- Documentation must keep the boundary clear: runbook freshness guidance does not prove phone
  preview, mobile interaction, Dark Mode, cover thumbnail acceptance, sync, scheduled send,
  public-host acceptance, upload, or publish success.

## 21. Current Committed Release/Runbook Audit Snapshot - 2026-06-21

The committed-evidence release gate is the source of truth for whether the current redacted proof
pack may be described as complete platform acceptance. Snapshot evidence may record current counts,
but consumers must still read the live report instead of hardcoding the numbers.

Current audited state:
- `getCommittedStyleProofEvidenceReleaseGateReport()` currently returns
  `status:"blocked-by-local-conflict"` and `canClaimComplete:false`.
- The current report exposes five blocker buckets: local conflict, phone preview, external
  dependency, unsafe-to-automate, and mutating platform.
- The combined committed-evidence summary currently exposes 14 manifests, 14 issues, no
  exact-artifact fingerprint conflicts, 34 cannot-claim steps, 4 phone-open steps,
  14 external-dependency-open steps, 13 unsafe-to-automate steps, and 13 mutating-open steps.
- The combined execution runbook currently keeps 34 proof steps open and cannot-claim. This is
  release-accounting state, not proof that local renderer features are absent.
- The WeChat flagship Amber and Tempera combined packs no longer contain local-vs-PC
  exact-artifact fingerprint conflicts. Operators must still collect phone, sync, public-host,
  scheduled-send, platform-preview, and publish proof before any release claim.

Documentation rules:
- Evidence files may include a local API snapshot of current counts when the command and boundary
  are recorded.
- Completion reports must state that this snapshot proves local accounting only.
- The snapshot must not be used as phone preview, mobile interaction, Dark Mode, cover thumbnail,
  sync, scheduled-send, public-host, upload, or publish proof.

## 22. WeChat MP Login-State Blocker - 2026-06-21

WeChat Official Account Platform evidence must distinguish an authenticated editor surface from a
public login entry.

Contracts:
- A visible scan-login panel, account-login form, sign-in route, or public landing page is a
  blocker, not editor proof.
- Login-state evidence may record the URL family, page title, and high-level visible state, but it
  must not commit QR imagery, account identifiers, credential material, browser runtime artifacts,
  raw request payloads, or raw platform responses.
- A login-state blocker must not satisfy `authenticated-editor-url`, `pc-editor-paste-event`,
  `pc-editor-dom-readback`, `phone-preview-readback`, `phone-screenshot`, `dark-mode-check`,
  `cover-thumbnail-check`, `sync-readback`, `scheduled-send-readback`, or
  `published-url-or-platform-preview`.
- The next valid WeChat proof attempt requires a human-completed official login in the visible
  browser, followed by a disposable authenticated editor/draft surface and redacted DOM/visual
  readback.

Required checks:
- Documentation must name login-state pages as blockers, not proof.
- Completion reports must keep this separate from WeChat paste, phone preview, sync,
  scheduled-send, public preview, and publish acceptance.

## 23. ExportModal Style Catalog E2E Count Contract - 2026-06-21

The ExportModal e2e must assert the runtime catalog counts produced by the current
`getPlatformStyleChoices()` catalog. Market fallback choices are intentionally visible at their
current runtime status, not hidden or deleted, so the counts must include them.

Current runtime counts:
- WeChat: 17 total choices, 8 available, 5 blocked, 4 unavailable.
- Xiaohongshu: 8 total choices, 7 available, 0 blocked, 1 unavailable.
- Zhihu: 8 total choices, 4 available, 3 blocked, 1 unavailable.

Contracts:
- `tests/e2e/specs/svg-render.spec.cjs` must assert the current counts visible in the real
  ExportModal style capability summary and preflight row.
- The e2e must keep unproven market fallback choices blocked until real InkForge-owned fallback
  proof, public-host proof, phone proof, or platform readback exists as required by the platform.
  XHS image-page fallback choices may be locally available after exact local raster/manifest proof.
  They may become selectable only when `STYLE_CHOICE_APPLICATIONS` maps them to an existing
  InkForge Xiaohongshu preset or export option that actually changes the current output.
- Updating the e2e count is allowed only after confirming `getPlatformStyleChoices()` and the
  runtime ExportModal agree. Do not delete catalog entries to satisfy stale e2e counts.

## 24. XHS Data Card Local Raster Evidence - 2026-06-21

Contracts:
- `xhs-data-card` local evidence must use the real browser canvas path:
  `sliceMarkdownToXhsCards -> renderXhsMarkdownCardSliceSvg -> renderXhsPosterCard`.
- Evidence must record the exact JSON pack hash, every PNG hash, byte length, 1080 x 1440
  dimensions, `overflow=false`, and `validateXhsImageArtifactManifest() === []`.
- Visual QA must reject packs with overflow warnings, blank pages, cropped content, text overlap,
  unreadable table/slash wrapping, or mixed English/number hard breaks.
- `xhs-data-card` is now a local-browser available catalog choice because the committed pack proves
  the previously missing overflow/readability/manifest blocker. The progress report must keep local
  and sensitive-hygiene gates satisfied while platform-publish remains missing.
- A committed manifest must not make `xhs-data-card` publishable. Selectability is allowed only
  through the real `STYLE_CHOICE_APPLICATIONS` mapping to `xhs-tech` / `科技数码`; release
  completion still requires platform proof.
- Platform upload, mobile/platform preview, public URL acceptance, scheduled send, public article
  rendering, and publish success remain external proof gates.

Required checks:
- Regression tests must include the committed `xhs-data-card` manifest in local and combined
  evidence packs.
- Tests must assert the local raster/manifest rows exist, the catalog row is no longer blocked, and
  release claims remain unavailable through external platform-publish gates.
- Evidence docs must name the visual iterations rejected before the final committed raster pack.

## 25. XHS Long Report Local Raster Evidence - 2026-06-21

Contracts:
- `xhs-long-report` local evidence must use the real browser canvas path:
  `sliceMarkdownToXhsCards -> renderXhsMarkdownCardSliceSvg -> renderXhsPosterCard`.
- Evidence must record the exact JSON pack hash, every PNG hash, byte length, 1080 x 1440
  dimensions, `overflow=false`, body references, crop/reference fields, and
  `validateXhsImageArtifactManifest() === []`.
- Visual QA must reject packs with sparse/weak report coverage, overflow warnings, blank pages,
  cropped content, text overlap, unreadable wrapping, or platform-publish wording that implies
  success without account evidence.
- `xhs-long-report` is now a local-browser available catalog choice because the committed pack proves
  the previously missing crop/file-size/manifest blocker for the local artifact. The progress report
  must keep local and sensitive-hygiene gates satisfied while platform-publish remains missing.
- A committed manifest must not make `xhs-long-report` publishable. Selectability is allowed only
  through the real `STYLE_CHOICE_APPLICATIONS` mapping to `xhs-simple` / `极简高级`; release
  completion still requires platform proof.
- Platform upload, mobile/platform preview, public URL acceptance, scheduled send, public article
  rendering, and publish success remain external proof gates.

Required checks:
- Regression tests must include the committed `xhs-long-report` manifest in local and combined
  evidence packs.
- Tests must assert the local raster/manifest rows exist, the catalog row is no longer blocked, and
  release claims remain unavailable through external platform-publish gates.
- Evidence docs must name the first sparse variant rejection and the final committed raster pack.

## 26. XHS Market Rich Card Fallback Local Raster Evidence - 2026-06-21

Contracts:
- `xhs-market-rich-card-fallback` local evidence must use the real browser canvas path:
  `sliceMarkdownToXhsCards -> renderXhsMarkdownCardSliceSvg -> renderXhsPosterCard`.
- Evidence must record the exact JSON pack hash, every PNG hash, byte length, 1080 x 1440
  dimensions, `overflow=false`, body references, cover marking, crop/reference fields, and
  `validateXhsImageArtifactManifest() === []`.
- The source Markdown must be InkForge-owned fallback guidance. It may encode lessons from market
  editors as rules, but it must not copy 135/Xiumi template source, vendor class names, hosted
  media, cookies, tokens, HAR files, QR artifacts, account screenshots, or browser profile
  material.
- Visual QA must reject packs with overflow warnings, blank pages, cropped content, text overlap,
  unreadable wrapping, vendor residue, or platform-publish wording that implies success without
  account evidence.
- `xhs-market-rich-card-fallback` is now a local-browser available catalog choice because the
  committed pack proves source-owned image-page/manifest materialization for the fallback family.
  The progress report must keep local and sensitive-hygiene gates satisfied while platform-publish
  remains missing.
- A committed manifest must not make `xhs-market-rich-card-fallback` publishable. Selectability is
  allowed only through the real `STYLE_CHOICE_APPLICATIONS` mapping to `xhs-nature` / `自然清新`;
  release completion still requires platform proof.
- Platform upload, mobile/platform preview, public URL acceptance, scheduled send, public article
  rendering, and publish success remain external proof gates.

Required checks:
- Regression tests must include the committed `xhs-market-rich-card-fallback` manifest in local
  and combined evidence packs.
- Tests must assert the local raster/manifest rows exist, the catalog row is no longer blocked, and
  release claims remain unavailable through external platform-publish gates.
- Evidence docs must name the source-owned fallback boundary and the final committed raster pack.

## 27. WeChat Classic Inline Local Unit Evidence - 2026-06-21

Contracts:
- `wechat-classic-inline` committed local evidence may use the real local WeChat export path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('report'), options)`.
- The committed artifact may satisfy `unit-test-coverage`, `exact-artifact`, and
  `no-sensitive-artifact` rows only when the exact HTML hash, byte length, source hash, and
  hygiene checks are recorded.
- The committed manifest must claim only `unit-tested` evidence. It must not claim
  `local-browser`, `pc-editor-paste`, `mobile-preview`, `credentialed-sync`, or `published`.
- If `detectQuality(html, 'wechat')` reports existing classic-pipeline blockers such as
  `wechat-line-height-zero`, `wechat-fixed-container-size`, `wechat-class-id-dependency`, or
  `wechat-layout-report-required`, the evidence must remain local accounting only. Do not describe
  it as render-quality, PC paste, phone preview, or publish proof.
- The source Markdown must be InkForge-owned and must not include 135/Xiumi template source,
  vendor class names, hosted media, cookies, tokens, HAR files, QR artifacts, account screenshots,
  or browser profile material.
- PC editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, and publish success remain
  external proof gates.

Required checks:
- Regression tests must include the committed `wechat-classic-inline` manifest in local and
  combined evidence packs.
- Tests must assert the manifest is unit-only, keeps external WeChat requirements missing, and does
  not change release-gate `canClaimComplete:false`.
- Evidence docs must name the detector blockers and cannot-claim boundary.

## 28. WeChat Quiet Editorial Local Browser Evidence - 2026-06-21

Contracts:
- `wechat-quiet-editorial` committed local evidence may use the real local WeChat export path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-tempera'), options)`.
- The source Markdown must exercise the quiet editorial block family: lede, reading bar,
  quote/pullquote, banner, list marker, citation card, footer, and cover SVG.
- The committed artifact may satisfy `unit-test-coverage`, `local-browser-rendering`,
  `exact-artifact`, and `no-sensitive-artifact` rows only when the exact HTML hash, byte length,
  source hash, local browser DOM readback, width/overflow readback, and hygiene checks are
  recorded.
- The committed manifest may claim only `unit-tested` and `local-browser` evidence. It must not
  claim `pc-editor-paste`, `mobile-preview`, `credentialed-sync`, or `published`.
- If `detectQuality(html, 'wechat')` reports current flagship-pipeline blockers such as
  `wechat-line-height-zero`, `wechat-fixed-container-size`, `wechat-class-id-dependency`, or
  `wechat-layout-report-required`, those blockers must remain cannot-claim boundaries for PC paste,
  phone preview, Dark Mode, cover thumbnail, sync, and publish proof.
- The source Markdown must be InkForge-owned and must not include 135/Xiumi template source,
  vendor class names, hosted media, cookies, tokens, HAR files, QR artifacts, account screenshots,
  or browser profile material.
- PC editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, and publish success remain
  external proof gates.

Required checks:
- Regression tests must include the committed `wechat-quiet-editorial` manifest in local and
  combined evidence packs.
- Tests must assert the manifest is local-browser only, keeps external WeChat requirements missing,
  and does not change release-gate `canClaimComplete:false`.
- Evidence docs must name the DOM/overflow readback, detector blockers, and cannot-claim boundary.

## 29. WeChat Card Rich Local Browser Evidence - 2026-06-22

Contracts:
- `wechat-card-rich` committed local evidence may use the real local WeChat export path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-tempera'), options)`.
- The source Markdown must exercise InkForge-owned rich card marker blocks: `[数据]`,
  `[对比]`, `[时间线]`, `[相册]`, `[出处]`, list markers, reading bar, lede, H2/H3, footer, and
  cover SVG. It must not copy 135/Xiumi template source, vendor class names, hosted media,
  credential/runtime capture artifacts, account-captured images, or local browser runtime material.
- The committed artifact may satisfy `unit-test-coverage`, `local-browser-rendering`,
  `exact-artifact`, and `no-sensitive-artifact` rows only when the exact HTML hash, byte length,
  source hash, independent file verification, local browser DOM readback, 677px clamp readback,
  page-overflow readback, and hygiene checks are recorded.
- An internal gallery/card track may be horizontally scrollable only when the containing block
  remains clamped to the WeChat content width and page-level `bodyOverflowX` is false. Evidence
  must distinguish internal track scroll from page overflow.
- The committed manifest may claim only `unit-tested` and `local-browser` evidence. It must not
  claim `pc-editor-paste`, `mobile-preview`, `credentialed-sync`, or `published`.
- If `detectQuality(html, 'wechat')` reports current flagship-pipeline blockers such as
  `wechat-line-height-zero`, `wechat-fixed-container-size`, `wechat-class-id-dependency`, or
  `wechat-layout-report-required`, those blockers must remain cannot-claim boundaries for PC paste,
  phone preview, Dark Mode, cover thumbnail, sync, and publish proof.
- PC editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, and publish success remain
  external proof gates.

Required checks:
- Regression tests must include the committed `wechat-card-rich` manifest in local and combined
  evidence packs.
- Tests must assert the manifest is local-browser only, keeps external WeChat requirements missing,
  and does not change release-gate `canClaimComplete:false`.
- Evidence docs must name the card/timeline/gallery DOM readback, internal gallery scroll boundary,
  detector blockers, and cannot-claim boundary.

## 30. WeChat Cover Seal Divider Local Browser Evidence - 2026-06-22

Contracts:
- `wechat-cover-seal-divider` committed local evidence may use the real local WeChat export path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-kiln'), options)`.
- The source Markdown must exercise InkForge-owned static SVG cover/seal/divider output:
  `cover-grid`, `divider-forge`, reading bar, H2/H3, callout, lede, list markers, footer, and
  endmark/seal motifs. It must not copy 135/Xiumi template source, vendor class names, hosted
  media, credential/runtime capture artifacts, account-captured images, or local browser runtime
  material.
- The committed artifact may satisfy `unit-test-coverage`, `local-browser-rendering`,
  `exact-artifact`, and `no-sensitive-artifact` rows only when the exact HTML hash, byte length,
  source hash, independent file verification, local browser DOM readback, 677px clamp readback,
  page-overflow readback, SVG safety counts, and hygiene checks are recorded.
- The committed manifest may claim only `unit-tested` and `local-browser` evidence. It must not
  claim `pc-editor-paste`, `mobile-preview`, `credentialed-sync`, or `published`.
- If `detectQuality(html, 'wechat')` reports current flagship-pipeline blockers such as
  `wechat-line-height-zero`, `wechat-fixed-container-size`, `wechat-class-id-dependency`, or
  `wechat-layout-report-required`, those blockers must remain cannot-claim boundaries for PC paste,
  phone preview, Dark Mode, cover thumbnail, sync, and publish proof.
- PC editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, and publish success remain
  external proof gates.

Required checks:
- Regression tests must include the committed `wechat-cover-seal-divider` manifest in local and
  combined evidence packs.
- Tests must assert the manifest is local-browser only, keeps external WeChat requirements missing,
  including `cover-thumbnail-check`, and does not change release-gate `canClaimComplete:false`.
- Evidence docs must name the cover/divider/footer DOM readback, SVG safety counts, detector
  blockers, and cannot-claim boundary.

## 31. WeChat Toolbar Parameter Map Local Browser Evidence - 2026-06-22

Contracts:
- `wechat-toolbar-parameter-map` committed local evidence may use the real local WeChat export
  path: `markdownToWechatWithStats(sourceMarkdown, getDefaultPreset(), options)`.
- The source Markdown must exercise InkForge-owned toolbar-parameter taxonomy through the current
  renderer: font family, font size, primary color, line height, letter spacing, first-line indent,
  content-width clamp, paragraph rhythm, quote, list, table, inline code, and code block output.
- It must not copy 135/Xiumi template source, vendor class names, hosted media, credential/runtime
  capture artifacts, account-captured images, or local browser runtime material.
- Toolbar concepts learned from 135/Xiumi may become renderer options, preset rules, report fields,
  UI taxonomy, or blocked requirements only. They must not bypass `markdownToWechatWithStats`,
  `convertToWechatWithStats`, `postProcessForWechat`, `enforcePlatformCSS`, or
  `wechatComplianceTransform`.
- The committed artifact may satisfy `unit-test-coverage`, `local-browser-rendering`,
  `exact-artifact`, and `no-sensitive-artifact` rows only when the exact HTML hash, byte length,
  source hash, independent file verification, local browser DOM readback, 677px clamp readback,
  page-overflow readback, parameter sentinels, and hygiene checks are recorded.
- The committed manifest may claim only `unit-tested` and `local-browser` evidence. It must not
  claim `pc-editor-paste`, `mobile-preview`, `credentialed-sync`, or `published`.
- If `detectQuality(html, 'wechat')` reports current renderer blockers such as
  `wechat-line-height-zero`, `wechat-fixed-container-size`, `wechat-class-id-dependency`,
  `wechat-unsupported-css`, `wechat-layout-report-required`, or `render-html-table`, those
  blockers must remain cannot-claim boundaries for PC paste, phone preview, Dark Mode, sync,
  scheduled send, platform preview, public rendering, and publish proof.

Required checks:
- Regression tests must include the committed `wechat-toolbar-parameter-map` manifest in local and
  combined evidence packs.
- Tests must assert the manifest is local-browser only, keeps external WeChat requirements missing,
  and does not change release-gate `canClaimComplete:false`.
- Evidence docs must name the typography/parameter DOM readback, no-style/no-class safety counts,
  detector blockers, renderer-boundary rule, and cannot-claim boundary.

## 32. WeChat Kiln Paste-Safe Committed Local Evidence - 2026-06-22

Contracts:
- `wechat-flagship-kiln-paste-safe` committed local evidence may reuse the tracked exact HTML
  artifact `prompts/0601/evidence/wechat-paste/flagship-kiln-paste-safe.html`.
- The artifact must remain generated by the real flagship artifact emitter and must keep the
  paste-safe identity: Kiln palette, `cover-title` first SVG module, `i-stretch`,
  `divider-forge`, and flagship block sentinels.
- The committed manifest may claim only `unit-tested` and `local-browser` evidence. It must not
  claim `pc-editor-paste`, `mobile-preview`, `credentialed-sync`, or `published`.
- Historical WeChat PC attempts for this exact artifact are negative or non-mutating evidence.
  `wechat-kiln-paste-safe-wechat-ctrlv-tab-mismatch-cleanup-20260618.txt` and
  `wechat-kiln-paste-safe-wechat-ctrlv-single-tab-nopaste-20260618.txt` must remain blockers for
  ordinary paste and safe disposable draft proof until a later exact run proves same-editor DOM
  mutation, paste/input event evidence, and cleanup/readback.
- The committed artifact may satisfy `unit-test-coverage`, `local-browser-rendering`,
  `exact-artifact`, and `no-sensitive-artifact` rows only when the exact HTML hash, byte length,
  independent file verification, local browser DOM readback, 677px clamp readback, SVG/block
  sentinel counts, and hygiene checks are recorded.
- If local browser readback reports internal SVG text measurement deltas without page overflow,
  record the observation as local visual evidence. It must not be upgraded to WeChat editor,
  phone, cover thumbnail, sync, or publish proof.

Required checks:
- Regression tests must include the committed `wechat-flagship-kiln-paste-safe` manifest in local
  and combined evidence packs.
- Tests must assert the manifest is local-browser only, keeps PC paste, phone preview, Dark Mode,
  cover thumbnail, and publish requirements missing, and does not change release-gate
  `canClaimComplete:false`.
- Evidence docs must cite the original tracked artifact, negative PC attempts, current local
  browser DOM readback, and cannot-claim boundary.

## 33. Committed Release Blocker Count Readout - 2026-06-22

Contracts:
- `getCommittedStyleProofEvidenceReleaseGateReport()` is still a read-only local accounting API.
  It must not create manifests, mutate platform state, open browsers, sync drafts, upload images,
  schedule sends, publish articles, or change style availability.
- Each `CommittedStyleProofReleaseGateBlocker` must expose both compact identity lists and counted
  rows:
  - `issueIds` is de-duplicated for quick scanning.
  - `issueCounts` preserves occurrence counts for manifest issue ids.
  - `issueCount` is the total blocker issue-row count.
  - `platformStepCounts` counts open execution steps by platform for step-backed blockers.
  - `requirementStepCounts` counts open execution steps by proof requirement for step-backed
    blockers.
- The local-conflict blocker summarizes manifest issues, so it may expose empty
  `platformStepCounts` and `requirementStepCounts`; step-backed blockers must expose both count
  arrays when they contain open steps.
- Local-conflict must not absorb every missing external proof row. A missing requirement belongs
  in local-conflict only when the requirement is local evidence or local manifest hygiene:
  `catalog-source`, `market-applied-dom-readback`, `no-proprietary-template-source`,
  `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`,
  `xhs-artifact-manifest`, or `no-sensitive-artifact`. Missing phone,
  authenticated PC editor, credentialed-channel, public-host, scheduled-send, and publish rows
  must remain in their dedicated step-backed blockers.
- `zhihu-artifact-manifest` is not a pure local release-conflict row when the live runbook points
  to public-host or platform-host image proof. The Zhihu manifest validator may be a local
  preflight API, but its passing evidence depends on a publishable final image host; release
  accounting must keep that gap in public-host / external-dependency blockers instead of
  displaying it as a local artifact chore.
- Aggregate local requirements whose remaining `missing` count is entirely explained by
  blocked catalog choices must not become local requirement-missing conflicts. They stay
  unclaimable through the blocked choice itself or through the appropriate external/public-host
  gate, unless a committed manifest is actively trying to promote a blocked choice.
- Catalog-blocked committed proof rows remain local conflicts because committed artifacts must not
  promote blocked choices.
- Current committed evidence may be documented as a snapshot only. As of the 2026-06-22
  XHS local catalog-open follow-up, the live report remains `canClaimComplete:false` with
  `localManifestCount=20`, `wechatPcManifestCount=2`, `combinedManifestCount=22`,
  `combinedIssueCount=13`, `phoneOpenSteps=4`, `externalDependencyOpenSteps=14`,
  `unsafeToAutomateOpenSteps=13`, `mutatingOpenSteps=13`, four blocker buckets, and no
  local-conflict blocker. The remaining catalog-blocked XHS row is
  `xhs-h5-design-import-boundary`, which has no committed manifest.
- Snapshot counts are not proof. Consumers must read the live report and keep phone preview,
  Dark Mode, cover thumbnail, credentialed sync, public host, scheduled send, platform preview,
  public rendering, and publish rows unclaimable until exact redacted external evidence exists.
- ExportModal's committed proof preflight row must surface these counts read-only. The summary may
  show `issueCount`, `stepCount`, platform step counts, and leading requirement step counts, but
  it must not change the row's `blocked` state while `canClaimComplete:false`, and it must not
  enable publish/sync actions.
- ExportModal must not dump raw service-layer English `nextOperatorActions` into the Chinese UI.
  It should map the release gate action fields (`requirementId`, `boundary`, and blocker kind)
  into compact Chinese operator summaries while preserving the underlying runbook data and blocked
  release state.

Required checks:
- Regression tests must prove `issueIds` is de-duplicated while `issueCounts` preserves any current
  local conflict counts when local conflicts exist.
- Regression tests must prove local-conflict issue counting is narrower than `combinedIssueCount`
  when local conflicts exist, and that the local-conflict blocker disappears when all remaining
  open rows are external phone/account/public-host/publish gates.
- Regression tests must prove blocked-choice-only aggregate local gaps and Zhihu public-host image
  manifest gaps do not appear as missing local artifact requirements in the release blocker.
- Regression tests must prove phone, external-dependency, unsafe-to-automate, and
  mutating-platform blockers expose platform and requirement step counts.
- Evidence docs must include the current report status, manifest counts, blocker counts, and the
  cannot-claim boundary.
- ExportModal verification must use the real UI surface and prove the preflight row displays the
  counted blocker details without claiming phone, sync, public host, scheduled send, or publish
  completion.
- ExportModal narrow-viewport verification must read back the real `发布` modal at mobile width and
  confirm the localized operator summary has no horizontal overflow or clipped blocker counts.

## 34. ExportModal Style Choice Notice Localization - 2026-06-22

Contracts:
- ExportModal style cards are operator-facing UI. Known catalog `blockers` and `reason` strings
  from market-inspired choices must be translated into compact Chinese display copy in the UI
  layer.
- The localization must not mutate `PLATFORM_STYLE_CHOICES`, `StyleChoiceAvailability`,
  `selectable`, `usable`, release-gate reports, execution runbooks, or manifest proof state.
- Unknown future catalog notice strings may fall back to their original text so new upstream
  blockers remain visible instead of being silently hidden.
- Fallback output labels inside style cards must use the Chinese operator prefix `降级：`, not a
  raw English `fallback:` label.
- The style-catalog preflight blocked row must localize the selected action `reason` through the
  same notice mapper used by style cards before rendering.
- Chinese notice rendering must keep market/H5/SVG fallback boundaries explicit:
  mobile-preview proof missing, Dark Mode proof missing, cover-thumbnail proof missing,
  public-host/upload gaps, credentialed sync gaps, plugin-transfer observations, and H5/design
  artifact boundaries are still blockers, not success evidence.

Required checks:
- ExportModal verification must use the real `发布` modal and show that known English blocker
  fragments are absent while their Chinese equivalents are present.
- Narrow-viewport verification must confirm no horizontal overflow or clipped style-card text at
  mobile width.
- Follow-up verification must also check that `fallback：` no longer appears in the visible style
  capability UI and that the Chinese `降级：` label remains readable.
- Documentation must keep the boundary clear: localized copy does not prove phone preview,
  public-host, sync, scheduled-send, platform-preview, upload, or publish success.

## 35. XHS Style Choice Application Mapping - 2026-06-22

Contracts:
- `STYLE_CHOICE_APPLICATIONS` may map a Xiaohongshu style choice only to an existing
  `XiaohongshuPreset` or export option that is already wired through the normal ExportModal
  preview/native pipeline.
- The 2026-06-22 mappings are:
  - `xhs-data-card` -> `xhs-tech` / `科技数码`
  - `xhs-long-report` -> `xhs-simple` / `极简高级`
  - `xhs-market-rich-card-fallback` -> `xhs-nature` / `自然清新`
- These mappings make the local-browser available choices selectable in the UI. They do not change
  style-proof manifests, release-gate reports, upload/sync/publish availability, or the
  `canClaimComplete:false` committed proof boundary.
- An unmapped available choice must still render as read-only/disabled. A mapped choice must select
  the real preset and the style-catalog preflight row must name the selected choice and preset.
- XHS `platform-publish`, public URL acceptance, account upload, platform preview, scheduled send,
  public article rendering, and publish success remain external proof gates even after local
  selection is enabled.

Required checks:
- Unit tests must prove the three choices are selectable and resolve to their exact preset ids.
- Tauri/WebView2 e2e must click the mapped XHS cards in the real ExportModal and read back the
  active preset plus selected style preflight row.
- CloakBrowser narrow-viewport verification must use a real local article and the real `发布`
  modal, confirming the mapped cards are enabled, no horizontal overflow appears, and the release
  gate remains `blocked-by-external`.

## 36. Committed External Proof Checklist - 2026-06-22

Contracts:
- `getCommittedStyleProofExternalProofChecklistReport()` is a read-only checklist API above
  `getCommittedStyleProofEvidenceReleaseGateReport()`. It must not create proof artifacts, mutate
  platform state, open browsers, sync drafts, upload images, schedule sends, publish articles,
  change catalog availability, or change style selection.
- The report must include the source `releaseGate`, mirror `status` and `canClaimComplete`, and
  keep `canClaimComplete:false` while the committed release gate is not `ready`.
- Checklist rows are external proof rows only. They may include authenticated PC editor, phone
  preview, credentialed-channel, public-host, and platform-publish boundaries. They must exclude
  `local-only` local evidence / sensitive-hygiene rows so the operator does not confuse local
  cleanup with phone, account, public host, or publish proof.
- A single open runbook step may belong to multiple blocker groups. For example, a platform
  publish row is part of `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
  The report must expose both `uniqueChecklistRowCount` and `groupRowCount` so overlapping blocker
  memberships remain explicit.
- Each row must preserve its runbook proof contract: platform, requirement id/label, gate,
  boundary, status, issue ids, missing/invalid counts, phone/account/platform mutation flags,
  `cannotClaimReason`, `nextOperatorAction`, required channels/actions/readbacks, required fields,
  forbidden fields, accepted host statuses, freshness max days, success criteria, failure signals,
  and redaction boundary.
- The API is a proof-collection handoff only. It must not be consumed as renderer success, WeChat
  editor paste success, phone preview success, mobile Dark Mode success, cover thumbnail
  acceptance, XHS/Zhihu upload success, scheduled-send success, public URL acceptance, or publish
  success.

Required checks:
- Regression tests must use the current committed manifest pack, not mock manifests, and assert the
  report remains `blocked-by-external` with `canClaimComplete:false`.
- Regression tests must prove current groups are `phone-preview`, `external-dependency`,
  `unsafe-to-automate`, and `mutating-platform`, with no local-conflict group in this snapshot.
- Regression tests must prove all checklist rows are non-local, non-completed, and not safe to
  automate locally.
- Regression tests must prove WeChat phone rows require phone proof and forbid
  `phonePreviewBlocked`; XHS publish rows remain external/unsafe/mutating; and Zhihu public-host
  rows require public HTTPS or platform-hosted image proof.
- Evidence docs must record the checklist counts and the cannot-claim boundary without claiming
  any external gate has been completed.

## 37. ExportModal External Proof Checklist Surface - 2026-06-22

Contracts:
- ExportModal may surface the committed external proof checklist as a read-only operator aid. It
  must consume `getCommittedStyleProofExternalProofChecklistReport()` directly and must not derive
  its own blocker accounting from ad hoc DOM text or duplicated constants.
- The UI surface must not mutate `selectable`, `usable`, style choice availability, release-gate
  state, proof manifests, runbook rows, renderer output, upload/sync/publish actions, or platform
  account state.
- The checklist summary shown in ExportModal must expose the current live counts:
  `uniqueChecklistRowCount`, `groupCount`, `phoneRows`, `externalAccountRows`, `publicHostRows`,
  and `unsafeToAutomateRows`.
- The grouped display must preserve the four checklist groups from the service layer:
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Labels and detail strings must be localized for the operator UI. Known group labels are:
  `手机预览`, `外部依赖`, `需人工`, and `平台变更`. Service-layer English identifiers may remain in
  type names and tests, but not as the primary visible UI labels.
- The release preflight row may include the same checklist summary so the blocked release state is
  auditable in one place. While `canClaimComplete:false`, that row must remain blocked and must
  continue to say phone preview, sync, public-host, scheduled-send, platform-preview, upload,
  public rendering, and publish success are not claimable.
- The surface must not use emoji icons. If future actions are added, use the installed icon system
  and keep the current checklist itself read-only.
- The layout must fit narrow WebView and browser viewports without horizontal page overflow,
  clipped counts, or nested-card visual stacking.

Required checks:
- Unit or E2E coverage must assert the visible checklist count, the no-publish/no-sync success
  warning, and all four group labels and counts.
- Tauri/WebView2 E2E must open the real ExportModal, read the checklist from the actual DOM, and
  keep the existing SVG flagship and 20-22 CJK chars/line assertions passing.
- CloakBrowser visual verification must use a real local article and the real `发布` modal at
  desktop and mobile widths, confirming `document.scrollWidth === document.clientWidth` and no
  checklist group overflows its container.
- Evidence docs must record the readback values and explicitly state that this UI surface is not
  WeChat phone preview, official editor paste, mobile Dark Mode, cover-thumbnail acceptance,
  credentialed sync, XHS/Zhihu upload, public-host acceptance, scheduled-send, platform-preview,
  public rendering, or publish proof.

## 38. Zhihu Clean-Primary Image-Fallback Scope - 2026-06-22

Contracts:
- Zhihu style choices whose `primaryOutput` is `clean-markdown` must not automatically require
  `public-image-host` or `zhihu-artifact-manifest` only because their `fallbackOutput` is
  `image-fallback`.
- Zhihu choices whose `primaryOutput` is `image-fallback`, and the explicit
  `zhihu-public-image-upload-checklist`, must still require both `public-image-host` and
  `zhihu-artifact-manifest`.
- A clean-primary committed manifest may satisfy `unit-test-coverage`, `local-browser-rendering`
  when applicable, `exact-artifact`, and `no-sensitive-artifact` without carrying image fallback
  manifest proof. It still must not claim account upload, public-host acceptance, platform preview,
  scheduled-send, public rendering, or publish proof.
- `zhihu-artifact-manifest` remains a local preflight requirement for image-fallback primary
  choices only. Passing that validator is not public-host proof; `public-image-host` stays external
  until a real public HTTPS or platform-hosted image readback exists.
- Requirement generation must stay platform-isolated: this Zhihu scope change must not remove
  `xhs-artifact-manifest` from Xiaohongshu image-page/long-image choices or weaken WeChat phone,
  paste, sync, or publish gates.

Required checks:
- Unit tests must prove `zhihu-data-table` and `zhihu-clean-column` do not include
  `zhihu-artifact-manifest` or `public-image-host`.
- Unit tests must prove `zhihu-diagram-article` and `zhihu-public-image-upload-checklist` still
  include `zhihu-artifact-manifest`, `public-image-host`, and publish/platform-preview proof.
- Committed local evidence regression must prove clean-primary Zhihu manifests keep local evidence
  satisfied where their local rows exist, while `published-url-or-platform-preview` remains
  missing.
- Release-gate regression must keep `canClaimComplete:false` and external blockers open; this
  scope change reduces local issue noise only and must not close phone, public-host, scheduled-send,
  upload, platform-preview, public-rendering, or publish gates.

## 39. Committed Local Actionability Report - 2026-06-22

Contracts:
- `getCommittedStyleProofLocalActionabilityReport()` is a read-only report above the committed
  release gate and committed external proof checklist. It must not create proof artifacts, mutate
  platform state, open browsers, sync drafts, upload images, schedule sends, publish articles,
  change style availability, or change style selection.
- The report must include the source `releaseGate`, the source `externalChecklist`, mirror
  `status` and `canClaimComplete`, and keep `canClaimComplete:false` while the committed release
  gate is not `ready`.
- Rows are local safe open runbook steps only: `safeToAutomate:true` and `boundary:'local-only'`.
  Phone preview, authenticated PC editor, credentialed channel, public-host, platform-preview,
  scheduled-send, upload, public rendering, and publish rows remain in the external checklist and
  must not be relabeled as local work.
- A local safe row is `catalog-blocked` when the row has no invalid artifact failures, all open
  issue ids are `style-proof-manifest-requirement-missing`, and the remaining missing count is
  fully explained by `blockedChoiceCount`. These rows are not direct local proof chores; they need
  catalog/status reconciliation or later real proof for the blocked choice before local evidence can
  be meaningfully collected.
- A local safe row is `actionable-local` only when it is local-only and safe to automate but is not
  fully explained by catalog-blocked missing choices. Such rows may guide local artifact, test-log,
  manifest, local-browser, or sensitive-hygiene follow-up, but still must not claim external phone,
  account, public-host, scheduled-send, platform-preview, upload, public rendering, or publish
  success.
- The current committed snapshot is a boundary case: `safeLocalOpenRows=11`,
  `actionableLocalRows=0`, `catalogBlockedLocalRows=11`, `externalChecklistRows=18`,
  `externalChecklistGroupRows=44`, and `safeExternalRows=0`.

Required checks:
- Regression tests must use the current committed manifest pack and assert the report remains
  `blocked-by-external` with `canClaimComplete:false`.
- Regression tests must prove current safe local open rows are all `catalog-blocked`, expose no
  `nextLocalActionableRow`, and preserve the first catalog-blocked row for operator handoff.
- Regression tests must prove external proof rows are not moved into the local actionability report:
  the external checklist still reports phone, external account/public-host, unsafe, mutating, and
  zero safe-to-automate external rows.
- Evidence docs must record the live summary counts and the cannot-claim boundary without claiming
  WeChat phone preview, official editor paste, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, public-host acceptance, scheduled-send, platform preview, public rendering,
  Xiaohongshu upload, Zhihu upload, or publish success.

## 40. ExportModal Local Actionability Surface - 2026-06-22

Contracts:
- ExportModal may surface `getCommittedStyleProofLocalActionabilityReport()` as a read-only
  operator summary inside the style capability area. It must not derive local actionability from
  duplicated UI constants, DOM text, style-choice card counts, or preflight string parsing.
- The surface must not mutate release-gate accounting, proof manifests, style catalog
  availability, style selection, renderer output, clipboard output, sync/upload/publish actions,
  platform accounts, or browser/platform state.
- The visible summary must expose the current report counts:
  `actionableLocalRows`, `catalogBlockedLocalRows`, `safeLocalOpenRows`, and
  `externalChecklistRows`.
- The grouped display must keep direct local work and catalog-blocked local rows separate. Known
  labels are `本地可做` for `actionable-local` and `目录阻断` for `catalog-blocked`.
- When `actionableLocalRows=0`, the UI must explicitly warn that catalog-blocked rows and external
  platform rows must not be treated as completed local proof work.
- The committed release preflight row may include the same local actionability summary so the
  blocked release claim can be audited from one row. While `canClaimComplete:false`, that row must
  stay blocked and must continue to say phone preview, sync, public-host, scheduled-send,
  platform-preview, upload, public rendering, and publish success are not claimable.
- The UI must use existing design tokens and installed icon systems only. Do not introduce emoji
  icons, missing CSS variables, nested cards, or marketing-style decorative sections.
- The layout must fit narrow WebView and browser viewports without horizontal page overflow,
  clipped counts, or row text pushing outside its container.

Required checks:
- E2E coverage must open the real ExportModal and assert the local actionability summary, the
  zero-actionable warning, both group labels/counts, and the release preflight row copy.
- Tauri/WebView2 E2E must keep the existing SVG flagship and 20-22 CJK chars/line assertions
  passing after the local actionability surface is added.
- CloakBrowser verification must use a real local article and the real `发布` modal at a narrow
  viewport, confirming `document.scrollWidth === document.clientWidth`, `overflowCount=0`, and the
  local actionability text is visible.
- Evidence docs must record the readback values and explicitly state that this UI surface is not
  WeChat official editor paste, phone preview, mobile interaction, Dark Mode, cover-thumbnail
  acceptance, credentialed sync, public-host acceptance, scheduled-send, platform-preview, public
  rendering, Xiaohongshu upload, Zhihu upload, or publish proof.

## 41. Market Material Panel Residue Gate - 2026-06-22

Contracts:
- `MARKET_EDITOR_RESIDUE_RULES` must block copied 135 SVG material/parameter panel fragments from
  publishable WeChat/XHS/Zhihu output. The covered live-observed class family includes
  `editor-bar`, `editor-bar-inner`, `editor-bar-title`, `editor-img__block`,
  `editor-spread__edit`, `editor-background`, `edit-image`, `image__title-bar`,
  `edit-add-images`, `edit-add-btn`, `edit-add__title`, `edit-animate`,
  `edit-animate__title`, `edit-animate__opt`, and `animate__dur`.
- Visible Xiumi template-card authoring trees must remain residue when copied directly. Covered
  fixture markers include `tn-tpl-item`, `tn-from-house-paper-cp`, and
  `section.tn-comp-pin.tn-comp-style-pin` plus hosted material/image state.
- These rules are local source-ownership guards. They may inform InkForge-owned image slots,
  trigger-zone schema, motion parameters, layout reports, raster/static fallback, and readable DOM
  order. They must not copy third-party template DOM, private material URLs, account artifacts, or
  authoring controls into runtime output.
- Passing these detector tests does not satisfy WeChat official editor paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, public-host
  acceptance, Xiaohongshu/Zhihu upload, scheduled-send, platform-preview, public rendering, or
  publish proof.

Required checks:
- Focused regression must assert `wechat-market-editor-residue`, `xhs-market-editor-residue`, and
  `zhihu-market-editor-residue` include `135 SVG material panel residue` for the 135 material panel
  fixture.
- A reduced child-control fixture must prove source-specific right-panel controls fail without
  relying on parent `editor-bar`, `editor-img`, `editor-course`, known builder `data-name`, hosted
  media, or center-canvas shell markers.
- Focused regression must assert the same three platform issue ids include `Xiumi tn-* authoring
  tree` for the Xiumi visible card-tree fixture.
- Full `platform-export-rendering.test.ts` and serial `src/services/export` tests should be run
  because the detector is shared by all platform quality checks.

## 42. Public Source Refresh Boundary - 2026-06-23

Contracts:
- Public-source refreshes must not mutate renderer output, local proof manifests, style catalog
  availability, style selection, browser state, account state, or any upload/sync/publish path.
- WeChat official editor plugin specification and Dark Mode documentation remain the hard public
  source for article HTML/SVG blockers: opacity-hidden images below SVG backgrounds,
  `line-height:0`, fixed width/height containers, `text-align:start/end`, `touchstart`-only SVG
  triggers, ordinary prose inside `<pre>`, invalid/deep article structure, font-family drift,
  SVG text Dark Mode risk, `data-no-dark` current-node scope, and unsafe `!important`.
- WeChat MP editor JSAPI documentation is credentialed-channel runbook input only. API existence
  must not satisfy PC paste, phone preview, Dark Mode, cover thumbnail, sync, scheduled-send,
  platform preview, public rendering, or publish proof rows.
- WeChat H5 DarkMode guidance may inform H5 artifacts, but article exports still need the stricter
  Official Account article sanitizer and inline-style contract. Do not infer article support for
  scripts, media queries, external CSS, or unsupported CSS variables from H5 docs.
- doocs/md architecture documentation may be cited as an OSS reference for parse -> inline CSS ->
  sanitize -> themed HTML output. It must not introduce a second renderer or be treated as platform
  paste/publish proof.
- Xiaohongshu public creator docs were login-gated in the 2026-06-23 refresh. Third-party image
  size guides are weak references only; XHS upload, platform preview, scheduled send, public
  rendering, and publish proof remain external gates.
- Zhihu public search returned community/open-source references rather than official hard specs.
  Keep clean Markdown and image/public-host gates conservative, and keep account upload, platform
  preview, public rendering, and publish success unclaimable until exact platform proof exists.

Required checks:
- Docs-only source refreshes must at least run `git diff --check` on touched docs/evidence files.
- Commit-boundary review must scan staged diffs for browser state directories, credential material,
  HAR files, QR artifacts, account capture images, and local capture paths before commit.
- GitNexus `detect-changes` must run before commit. For docs-only changes, expected affected
  runtime process count is zero.
- Evidence docs must list the public URLs, source strength, weak-source exclusions, and the
  cannot-claim boundary without asserting any external phone/account/public-host/publish gate is
  complete.

## 43. External Proof Handoff Report - 2026-06-23

Contracts:
- `getCommittedStyleProofExternalHandoffReport()` is a read-only composition above the committed
  release gate, external proof checklist, and local actionability report. It must not create proof
  artifacts, mutate platform state, open browsers, sync drafts, upload images, schedule sends,
  publish articles, change style availability, or change style selection.
- The handoff report must preserve the source `releaseGate`, `externalChecklist`, and
  `localActionability` objects so UI or CLI consumers can inspect authoritative rows instead of
  parsing summary strings.
- `canClaimComplete` must mirror the release gate. The report must keep `canClaimComplete:false`
  while any phone-preview, external-account, public-host, unsafe-to-automate, mutating-platform,
  catalog-blocked, or local-conflict row remains open.
- `canContinueLocally` is true only when the local actionability report has at least one
  `actionable-local` row. Catalog-blocked rows must not be presented as direct local proof chores.
- `requiresOperator`, `requiresPhone`, `requiresExternalAccount`, `requiresPublicHost`,
  `containsUnsafeToAutomateRows`, and `containsMutatingPlatformRows` must derive from structured
  external checklist counts, not duplicated constants or UI text.
- The `next*Row` fields must point to the first structured row for each handoff class:
  local actionable, catalog-blocked, phone, external account, public host, unsafe-to-automate, and
  mutating platform.
- `recommendedNextAction` may surface the next operator action, but it must never imply that Codex
  or a local script may silently perform credentialed, phone, public-host, scheduled-send, or
  publish actions.
- `cannotAutoCompleteReason` must stay explicit when no safe local or safe external row exists,
  and must include why phone/account/public-host/mutating rows remain external proof gates.

Required checks:
- Regression tests must assert the current committed snapshot remains `blocked-by-external` with
  `canClaimComplete:false`, `canContinueLocally:false`, `safeExternalRows=0`,
  `externalHandoffRows=18`, `externalHandoffGroups=4`, `phoneRows=4`,
  `externalAccountRows=13`, `publicHostRows=1`, `unsafeToAutomateRows=13`, and
  `mutatingRows=13`.
- Tests must prove the handoff exposes next phone, external-account, public-host,
  unsafe-to-automate, and mutating-platform rows without changing any row to safe automation.
- Evidence docs must record the live readback and explicitly state that the handoff report does
  not prove WeChat paste, phone preview, Dark Mode, cover thumbnail, sync, upload, scheduled send,
  public-host acceptance, platform preview, public rendering, or publish success.

## 44. ExportModal External Proof Handoff Surface - 2026-06-23

Contracts:
- ExportModal may surface `getCommittedStyleProofExternalHandoffReport()` as a read-only operator
  handoff inside the existing style capability area. It must consume the service report directly
  and must not duplicate release-gate, checklist, or local-actionability accounting constants in
  UI code.
- The surface must not mutate renderer output, style catalog availability, style selection, proof
  manifests, account state, browser state, clipboard output, sync, upload, scheduled-send, public
  rendering, platform preview, or publish behavior.
- The visible summary must expose the current structured handoff counts:
  `externalHandoffRows`, `externalHandoffGroups`, `safeExternalRows`, and `actionableLocalRows`.
- The visible flag grid must preserve the operator categories that block local automation:
  phone rows, external-account rows, public-host rows, unsafe-to-automate rows, and
  mutating-platform rows.
- The surface must explicitly explain that there is no safe local/external automation path when
  `safeExternalRows=0` and `actionableLocalRows=0`. It must not imply that Codex, a local script,
  or a background task can silently collect credentialed, phone, public-host, sync, or publish
  proof.
- The next-row label may point to the first structured phone/account/public-host/unsafe/mutating
  row, but it must remain a handoff label only. Do not render it as a button, direct action, or
  platform automation trigger.
- Labels and details must be localized for the operator UI. Service-layer identifiers may remain
  in type names and tests, but not as the primary visible handoff text.
- The surface must use existing design tokens and installed icon systems only. Do not introduce
  emoji icons, missing CSS variables, nested cards, account capture artifacts, QR artifacts, local
  browser-state details, or runtime capture locations.
- The layout must fit narrow WebView and browser viewports without page-level horizontal overflow,
  clipped counts, or text pushing outside its container.

Required checks:
- E2E coverage must open the real ExportModal and assert the handoff summary, `safeExternalRows=0`,
  `actionableLocalRows=0`, the cannot-auto-complete text, and all five category counts.
- Tauri/WebView2 E2E must keep the existing SVG flagship and 20-22 CJK chars/line assertions
  passing after the handoff surface is added.
- CloakBrowser verification should use a real local article and the real `发布` modal at a narrow
  viewport, confirming `document.scrollWidth === document.clientWidth`, `overflowCount=0`, and the
  handoff text is visible. Runtime screenshots are local inspection only and must not be committed.
- Evidence docs must record the readback values and explicitly state that this UI surface is not
  WeChat official editor paste, phone preview, mobile interaction, Dark Mode, cover-thumbnail
  acceptance, credentialed sync, public-host acceptance, scheduled-send, platform-preview, public
  rendering, Xiaohongshu upload, Zhihu upload, or publish proof.

## 45. Style Proof Manifest Intake Report - 2026-06-23

Contracts:
- `getStyleProofManifestIntakeReport(input)` is the runtime-safe entry point for operator-supplied
  external proof manifest packs. Its input type is `unknown` because real evidence handoff may come
  from JSON files, clipboard text, or local operator tooling before TypeScript has checked shape.
- The intake layer must accept only an array of manifest-like objects, a `{ manifests: [...] }`
  object, or one manifest-like object. All other roots are schema-invalid and must not be passed to
  `validateStyleProofManifest()`, `getStyleProofManifestPackReport()`,
  `getStyleProofAcceptanceAuditReport()`, or `getStyleProofExecutionRunbook()`.
- Every accepted manifest must be sanitized into the existing `StyleProofManifest` shape. Unknown
  fields are dropped and reported as warning-level schema issues; they must not be forwarded to
  semantic validation, release-gate accounting, UI state, or committed evidence packs.
- Required runtime fields are strict: manifest `platform`, `claimedEvidence`, and `artifacts`; and
  artifact `id`, `requirementId`, `kind`, `label`, `channel`, `action`, and `readback`. Enum fields
  must match the existing platform, evidence-label, requirement, artifact-kind, channel, action,
  readback, scope, and host-status contracts.
- A manifest with any schema error must be returned in `rejected` and must contribute no artifacts,
  progress, acceptance status, or runbook steps. This prevents malformed external JSON from
  crashing the existing validator or becoming partial proof.
- Accepted manifests still go through the existing semantic proof validator and pack/audit/runbook
  reports. Intake warnings do not suppress `style-proof-manifest-sensitive-artifact`,
  `style-proof-manifest-unsafe-commit-artifact`, exact-artifact gaps, phone-preview gaps, public-host
  gaps, account gates, or publish gates.
- The report must expose `status`, sanitized `manifests`, `rejected`, `schemaIssues`, `packReport`,
  `acceptanceAudit`, `executionRunbook`, `canClaimComplete`, and summary counts for accepted,
  rejected, schema errors/warnings, semantic issues, artifacts, cannot-claim requirements/steps,
  phone, external dependency, unsafe, mutating, and safe-to-automate open steps.
- `canClaimComplete` may only be true when at least one sanitized manifest exists, there are no
  rejected entries, there are no schema errors, the pack has no semantic issues, and the acceptance
  audit/runbook has zero cannot-claim rows. The current committed project state is expected to keep
  this false because external phone/account/public-host/publish gates remain open.
- The intake report must not read browser profiles, capture screenshots, parse HAR files, open
  CloakBrowser, mutate platform state, create evidence artifacts, sync drafts, upload images,
  schedule sends, publish articles, change style availability, or change style selection.
- `getStyleProofManifestJsonIntakeReport(jsonText)` is the safe JSON-string companion. It must
  parse a non-empty JSON string and then delegate to `getStyleProofManifestIntakeReport()`. Empty
  or malformed JSON must return the same `StyleProofManifestIntakeReport` shape with
  `status:'schema-invalid'`, one root `rejected` row, and `style-proof-manifest-intake-json-invalid`
  in `schemaIssues`; it must not throw to callers or attempt to read files.
- The JSON-string companion must guard oversized payloads before `trim()` and `JSON.parse`.
  Payloads above 2,000,000 characters must return `status:'schema-invalid'` with
  `style-proof-manifest-intake-json-too-large`, zero accepted manifests, and no artifact creation.
- Manifest intake must guard root pack and per-manifest cardinality before detailed parsing.
  Packs above 128 manifests must return `style-proof-manifest-intake-manifest-count-too-large`
  with zero accepted manifests. A manifest above 512 artifacts must be rejected with
  `style-proof-manifest-intake-artifact-count-too-large`; do not truncate and accept partial proof.
- Manifest intake string fields must be concise. Required and optional string fields above 4,096
  characters must return `style-proof-manifest-intake-field-too-large` before semantic validation;
  do not truncate and accept partial proof.

Required checks:
- Regression tests must prove a valid unknown JSON-style manifest pack is sanitized and reaches the
  normal pack/audit/runbook reports without schema issues.
- Regression tests must prove malformed packs do not throw and do not pass partial artifacts to the
  existing semantic validator.
- Regression tests must prove malformed JSON strings return schema-invalid reports instead of
  throwing parse errors.
- Regression tests must prove oversized JSON strings return schema-invalid reports before parsing.
- Regression tests must prove oversized manifest packs and oversized artifact arrays return
  schema-invalid reports before detailed entry parsing.
- Regression tests must prove oversized intake string fields return schema-invalid reports before
  semantic validation.
- Regression tests must prove unknown fields are dropped while sensitive or unsafe accepted
  artifacts still surface through the existing semantic issue ids.
- Evidence docs must record this as a local intake/preflight boundary only and explicitly state that
  it does not prove WeChat official editor paste, phone preview, mobile interaction, Dark Mode,
  cover-thumbnail acceptance, credentialed sync, public-host acceptance, Xiaohongshu/Zhihu upload,
  scheduled-send, platform-preview, public rendering, or publish success.

## 46. WeChat Authenticated Home Readback Boundary - 2026-06-23

Contracts:
- A CloakBrowser read-only WeChat Official Account home/dashboard readback may be recorded as
  authenticated-home session evidence only.
- Home/dashboard reachability must not satisfy `authenticated-editor-reachable`,
  `pc-editor-dom-readable`, `pc-editor-paste`, `phone-preview`, `dark-mode-check`,
  `cover-thumbnail-check`, `credentialed-sync`, `scheduled-send`, `platform-preview`,
  `public-rendering`, or `published`.
- A home/dashboard readback must redact account labels, draft titles, published titles, credential
  material, and local browser details. It must not record account captures, local browser-state
  directories, HAR material, or runtime capture locations.
- The evidence must state whether editor-surface signals were present. If `contenteditableCount=0`
  and `iframeCount=0`, the row is explicitly not a PC editor DOM row.
- The evidence must remain read-only: no draft creation, paste, sync, preview, upload, scheduled
  send, or publish action may be performed as part of home/dashboard readback.

Required checks:
- Evidence docs must state that the check used CloakBrowser only and was read-only.
- Evidence docs must explicitly preserve the cannot-claim boundary for WeChat official editor paste,
  PC editor DOM readback, phone preview, mobile interaction, Dark Mode, cover-thumbnail acceptance,
  credentialed sync, public preview, scheduled send, public rendering, and publish success.
- Commit-boundary review must scan staged diffs for credential material, local browser-state
  details, account captures, HAR material, and runtime capture locations before commit.

## 47. 135/Xiumi Live DOM Rule Extraction - 2026-06-23

Contracts:
- 135 SVG editor and Xiumi Studio live DOM can inform InkForge-owned rendering modules, but vendor
  wrappers, framework attributes, hosted material references, account state, and editor-only classes
  must not become committed proof data or copied output.
- 135-style background SVG modules should be normalized as:
  - an InkForge module wrapper with explicit aspect ratio and zero-gap behavior.
  - a non-interactive visual layer using SVG or raster fallback, `pointer-events:none`,
    no-repeat background, and 100% or 100.1% sizing where a one-pixel seam guard is required.
  - trigger zones stored as normalized percentages, rendered as InkForge-owned overlays or
    WeChat-safe interactive regions.
  - fallback copy and image alternatives that do not depend on vendor data-name strings.
- Xiumi-style SVG cards should be treated as capability-taxonomy and wrapper-pattern input:
  outer section, cell/group wrapper, visual layer, optional metadata/text layer, and behavior labels
  such as carousel, click expand, path animation, slide trigger, parallax, click switch, flip, zoom,
  quiz, marquee, reveal, replace image, open/disappear/popup/enlarge/print/jump/play, long-press,
  area trigger, drop, and click+auto.
- Xiumi library preview SVG counts or a center editor insertion without visible inline SVG must not
  satisfy `market-applied-dom-readback`, `pc-editor-paste`, `phone-preview`, `dark-mode-check`,
  `cover-thumbnail-check`, `credentialed-sync`, `scheduled-send`, `public-rendering`, or
  `published`.
- Vendor class families such as `tn-*`, 135 `data-name`, and Vue/Angular runtime attributes may be
  cited in evidence docs as market residue, but production InkForge output must use existing
  InkForge module names, sanitizers, and compatibility gates.
- The runtime `wechat-market-svg-h5-fallback-matrix` choice may expose the richer 135/Xiumi family
  map, including click show/hide, click switch, slide trigger, text marquee, quiz/game, typed image
  slots, and normalized trigger zones. It must remain `status:'blocked'`, `motion:'mobile-only'`,
  unmapped from `STYLE_CHOICE_APPLICATIONS`, and gated by `mobile-preview` plus publish proof until
  exact InkForge-owned artifacts pass phone, Dark Mode, cover, and public/publish readback.
- The same runtime choice must retain detector blockers for zero-line-height, fixed containers,
  class/id dependency, transparent image under SVG/background layers, unsafe SVG constructs,
  touchstart-only triggers, and `wechat-layout-report-required`. These blockers are compatibility
  accounting for source-owned fallback work, not permission to copy 135/Xiumi DOM.

Required checks:
- Evidence docs must state whether the market sample was library-only, center-editor applied,
  material-included, or blocked.
- Evidence docs must record whether visible inline SVG was found in the center editor after a
  market style click. If not, the sample remains taxonomy/wrapper evidence only.
- The cannot-claim boundary must explicitly exclude WeChat editor paste, phone preview, mobile
  interaction, Dark Mode, cover-thumbnail acceptance, sync, public preview, scheduled send, public
  rendering, account save/export, XHS/Zhihu upload, and publish success.

## 48. WeChat Draft Box Readback Boundary - 2026-06-23

Contracts:
- A CloakBrowser read-only WeChat Official Account draft-box readback may be recorded as
  authenticated backend list reachability only.
- Draft-box reachability must not satisfy `authenticated-editor-reachable`,
  `pc-editor-dom-readable`, `pc-editor-paste`, `exact-artifact`, `safe-disposable-draft`,
  `phone-preview`, `dark-mode-check`, `cover-thumbnail-check`, `credentialed-sync`,
  `scheduled-send`, `platform-preview`, `public-rendering`, or `published`.
- A draft-box readback must record only sanitized endpoint category, visible workflow signals, and
  aggregate DOM counts. It must redact account labels, draft titles, published titles, credential
  query parameters, account images, runtime capture locations, and local browser-state details.
- If `contenteditable=0`, `ProseMirror=0`, and editor links are empty, the readback is explicitly
  not an editor DOM proof row.
- Observing a new-creation control is route-discovery evidence only. It remains non-mutating until
  a separate run explicitly activates a safe disposable draft flow and records the required cleanup
  boundary.
- Existing draft cards must not be treated as disposable proof targets unless a separate run first
  creates or isolates an explicitly safe disposable draft.

Required checks:
- Evidence docs must state that the check used CloakBrowser only and remained read-only.
- Evidence docs must record aggregate DOM counts for the draft-box page.
- Evidence docs must explicitly preserve the cannot-claim boundary for WeChat editor reachability,
  PC editor DOM readback, paste, exact-artifact proof, safe-disposable-draft proof, phone preview,
  mobile interaction, Dark Mode, cover-thumbnail acceptance, credentialed sync, scheduled-send,
  platform-preview, public rendering, and publish success.
- Commit-boundary review must scan staged diffs for credential material, account captures, local
  browser-state details, request archives, and runtime capture locations before commit.

## 49. WeChat New Creation Menu Readback Boundary - 2026-06-23

Contracts:
- A CloakBrowser read-only new-creation dropdown readback may be recorded as route-discovery
  evidence only.
- Opening the dropdown does not satisfy `authenticated-editor-reachable`, `pc-editor-dom-readable`,
  `pc-editor-paste`, `exact-artifact`, `safe-disposable-draft`, `phone-preview`,
  `dark-mode-check`, `cover-thumbnail-check`, `credentialed-sync`, `scheduled-send`,
  `platform-preview`, `public-rendering`, or `published`.
- The menu option labels may be recorded when they are generic workflow labels such as article,
  existing-content selection, sticker/image, video, podcast, or reprint. Account labels, draft
  titles, published titles, credential query parameters, account images, runtime capture locations,
  and local browser-state details must remain redacted.
- A menu option that can create or alter real account state must not be activated by a
  route-discovery slice. It requires a separate safe-disposable-draft run with cleanup evidence.

Required checks:
- Evidence docs must state that no dropdown child option was activated.
- Evidence docs must record aggregate editor-surface counts after the menu opens.
- Evidence docs must preserve the cannot-claim boundary for editor reachability, PC DOM readback,
  paste, exact-artifact proof, safe-disposable-draft proof, phone preview, mobile interaction,
  Dark Mode, cover-thumbnail acceptance, credentialed sync, scheduled-send, platform-preview,
  public rendering, and publish success.

## 50. WeChat Safe Disposable Draft Preflight - 2026-06-23

Contracts:
- A safe disposable draft run requires an unambiguous draft identity before it can satisfy
  `safe-disposable-draft`.
- Generic untitled drafts are not safe cleanup anchors when the draft list already contains
  existing generic untitled labels.
- A read-only route scan that finds no sanitized `href`, `data-url`, or `data-action` for the
  article/create menu option is blocker evidence only. It must not be upgraded into
  `authenticated-editor-reachable` or `pc-editor-dom-readable`.
- A separate article-template route is not the proof target editor route unless it later produces
  the exact article editor DOM for the disposable draft.
- Before activating a menu option that may create or alter real account state, the run must define
  the unique draft marker, expected cleanup selector/path, and post-cleanup readback fields.

Required checks:
- Evidence docs must state whether the create route exposed sanitized action metadata.
- Evidence docs must state whether existing generic untitled draft labels make cleanup ambiguous.
- Evidence docs must explicitly keep `safe-disposable-draft`, editor reachability, PC DOM readback,
  paste, phone preview, credentialed sync, scheduled-send, platform-preview, public rendering, and
  publish success unclaimed when the preflight is blocked.

## 51. Safe Disposable Draft Preflight Blocker Fields - 2026-06-23

### 1. Scope / Trigger

- Trigger: WeChat draft-box and new-creation-menu readbacks can prove route-discovery blockers, but
  they must not be counted as `safe-disposable-draft` proof.
- The code-spec contract applies to redacted `StyleProofManifest` packs, manifest intake, semantic
  validation, acceptance audit, and committed evidence review.
- The fields below are blocker evidence fields only. They record why a proof run stopped before
  creating or mutating a real WeChat article draft.

### 2. Signatures

```typescript
interface StyleProofArtifact {
  createRouteActionMetadataMissing?: boolean
  cleanupTargetAmbiguous?: boolean
}
```

Issue ids:

```typescript
type StyleProofManifestIssueId =
  | 'style-proof-manifest-create-route-action-missing'
  | 'style-proof-manifest-cleanup-target-ambiguous'
```

Affected report entry points:

```typescript
validateStyleProofManifest(manifest)
getStyleProofManifestReport(manifest)
getStyleProofManifestIntakeReport(input)
getStyleProofAcceptanceAuditReport(manifests)
```

### 3. Contracts

- `createRouteActionMetadataMissing:true` means the observed article/create control did not expose a
  sanitized concrete route/action that can be tied to the proof target editor. It invalidates the
  `safe-disposable-draft` row for that manifest.
- `cleanupTargetAmbiguous:true` means the run cannot uniquely identify the draft that would be
  cleaned up. It invalidates the `safe-disposable-draft` row for that manifest.
- Both fields are accepted artifact fields for intake and must not generate schema warnings when
  present as booleans.
- Both fields are semantic blocker indicators. They must appear in semantic issue counts and in the
  acceptance audit `cannotClaim` path when attached to a `safe-disposable-draft` artifact.
- These fields do not satisfy `disposableDraft`, `cleanupPathVerified`, editor reachability, PC DOM,
  paste, phone preview, Dark Mode, cover-thumbnail, sync, scheduled-send, public rendering, or
  publish proof.
- A manifest may include the blocker artifact as `safeForCommit:true` only when the artifact content
  is redacted and contains no account captures, credential material, request archive, runtime
  capture path, local browser-state details, or platform query parameters.

### 4. Validation & Error Matrix

- `createRouteActionMetadataMissing:true` on a `safe-disposable-draft` artifact ->
  `style-proof-manifest-create-route-action-missing`, artifact row invalid, requirement invalid.
- `cleanupTargetAmbiguous:true` on a `safe-disposable-draft` artifact ->
  `style-proof-manifest-cleanup-target-ambiguous`, artifact row invalid, requirement invalid.
- Missing `disposableDraft:true` still emits `style-proof-manifest-disposable-draft-missing`.
- Missing `cleanupPathVerified:true` still emits `style-proof-manifest-cleanup-path-missing`.
- Intake with boolean blocker fields and no unknown fields -> `schemaWarningCount=0`.
- Acceptance audit for the same manifest -> `cannotClaim` includes `safe-disposable-draft`.

### 5. Good/Base/Bad Cases

- Good: a later real disposable-draft run records a unique draft marker, concrete editor route/action,
  `disposableDraft:true`, `cleanupPathVerified:true`, and a post-cleanup readback for the exact
  marker.
- Base: a read-only preflight artifact records `createRouteActionMetadataMissing:true` and
  `cleanupTargetAmbiguous:true`; it is safe blocker evidence but cannot claim completion.
- Bad: route-discovery or dropdown readback is marked as `safe-disposable-draft` without a unique
  draft marker and cleanup readback. The validator must reject it.

### 6. Tests Required

- Regression tests must prove route-discovery preflight blockers are accepted by intake without
  schema warnings.
- Regression tests must prove the same manifest is semantically invalid for
  `safe-disposable-draft`.
- Regression tests must assert both issue ids:
  `style-proof-manifest-create-route-action-missing` and
  `style-proof-manifest-cleanup-target-ambiguous`.
- Regression tests must assert acceptance audit `cannotClaim` still includes
  `safe-disposable-draft`.
- Existing full export regressions, type-check, and production build must pass after adding the
  fields.

### 7. Wrong vs Correct

#### Wrong

```json
{
  "requirementId": "safe-disposable-draft",
  "action": "safe-disposable-draft",
  "readback": "dom",
  "safeForCommit": true
}
```

This omits the blocker reason and can make a menu/readback artifact look like real draft proof.

#### Correct

```json
{
  "requirementId": "safe-disposable-draft",
  "action": "safe-disposable-draft",
  "readback": "dom",
  "createRouteActionMetadataMissing": true,
  "cleanupTargetAmbiguous": true,
  "safeForCommit": true
}
```

This records the preflight stop condition and keeps the proof row unclaimable until a separate
safe disposable draft run proves a concrete editor target and cleanup path.

## 52. Platform Visible Text Redaction Review Gate - 2026-06-23

### 1. Scope / Trigger

- Trigger: authenticated platform pages can expose account labels, existing draft titles, published
  titles, account images, and temporary platform context in ordinary visible text readbacks.
- The code-spec contract applies to `StyleProofManifest` artifacts collected from platform editor,
  phone preview, credentialed channel, public-host, and platform-publish workflows when the artifact
  may contain platform-visible text.
- This is a local evidence hygiene gate. It does not inspect or store the raw visible text; it
  records whether the proof collector has explicitly performed the redaction review.

### 2. Signatures

```typescript
interface StyleProofArtifact {
  redactionReviewRequired?: boolean
  redactionVerified?: boolean
}
```

Issue id:

```typescript
type StyleProofManifestIssueId =
  | 'style-proof-manifest-redaction-review-missing'
```

Affected report entry points:

```typescript
validateStyleProofManifest(manifest)
getStyleProofManifestReport(manifest)
getStyleProofManifestIntakeReport(input)
getStyleProofAcceptanceAuditReport(manifests)
```

### 3. Contracts

- `redactionReviewRequired:true` means the proof artifact came from a surface where account labels,
  draft titles, published titles, account images, temporary platform route context, runtime capture
  locations, or local browser-state details may have been present before summarization.
- `redactionVerified:true` may only be set after committed evidence excludes those platform-visible
  account/draft details and records only sanitized counts, generic workflow labels, hashes, or
  redacted references.
- Intake must accept both boolean fields without schema warnings.
- A proof artifact with `redactionReviewRequired:true` and without `redactionVerified:true` must
  emit `style-proof-manifest-redaction-review-missing`, keep the artifact invalid, and keep the
  corresponding requirement in acceptance-audit `cannotClaim`.
- `safeForCommit:true` is not a substitute for `redactionVerified:true` when the artifact declares
  `redactionReviewRequired:true`.
- The rule must not scan for specific user/account text in committed source. It is a structured
  manifest contract so tests can stay redacted and stable.

### 4. Validation & Error Matrix

- `redactionReviewRequired:true` and `redactionVerified !== true` ->
  `style-proof-manifest-redaction-review-missing`, artifact invalid, requirement invalid.
- `redactionReviewRequired:true` and `redactionVerified:true` -> no redaction-review issue from this
  rule; other semantic proof requirements still apply.
- Unknown or non-boolean redaction fields in intake -> normal intake schema error/warning behavior.
- Missing `redactionReviewRequired` -> no behavior change for existing committed local evidence.

### 5. Good/Base/Bad Cases

- Good: a redacted platform DOM summary records aggregate counts and generic workflow labels, marks
  `redactionReviewRequired:true`, `redactionVerified:true`, and keeps raw account/draft text out of
  committed files.
- Base: a CloakBrowser readback may have seen platform-visible text, so the manifest marks
  `redactionReviewRequired:true` and remains invalid until the redaction review is performed.
- Bad: a platform visible-text readback sets `safeForCommit:true` but omits `redactionVerified:true`;
  the validator must keep it unclaimable.

### 6. Tests Required

- Regression tests must prove the two fields pass intake without schema warnings.
- Regression tests must prove a `redactionReviewRequired:true` artifact without
  `redactionVerified:true` emits `style-proof-manifest-redaction-review-missing`.
- Regression tests must prove the artifact report is invalid and acceptance audit `cannotClaim`
  includes the affected requirement.
- Full export regression, strict type-check, ESLint, and production build must pass.

### 7. Wrong vs Correct

#### Wrong

```json
{
  "requirementId": "authenticated-editor-url",
  "channel": "platform-editor",
  "action": "authenticated-editor-opened",
  "readback": "dom",
  "safeForCommit": true,
  "redactionReviewRequired": true
}
```

This claims commit safety while admitting that platform-visible text still needs review.

#### Correct

```json
{
  "requirementId": "authenticated-editor-url",
  "channel": "platform-editor",
  "action": "authenticated-editor-opened",
  "readback": "dom",
  "safeForCommit": true,
  "redactionReviewRequired": true,
  "redactionVerified": true
}
```

This separates repository commit hygiene from explicit platform visible-text redaction review.

## 53. Public Market Taxonomy and Platform Boundary Review - 2026-06-23

Contracts:
- Public market-editor pages, tutorials, and product descriptions may expand InkForge's style
  capability taxonomy, but they are not platform proof artifacts.
- 135/Xiumi/Yiban/Micro-layout style sources may define capability families such as background SVG,
  click reveal, click switch, carousel, slide trigger, long image, area trigger, text marquee, path
  animation, parallax, quiz/game, card, title, divider, cover, and image-slot manifests.
- InkForge output must reimplement these families with source-owned modules, sanitized style
  fields, normalized trigger zones, explicit fallback copy/images, and existing WeChat safety
  detectors. Vendor DOM, hosted asset URLs, builder class names, data attributes, account state, and
  material ids must not be copied into production output or committed proof.
- Public WeChat-market research can justify richer blocked catalog families, but it must not satisfy
  `market-applied-dom-readback`, `pc-editor-paste`, `phone-preview`, `dark-mode-check`,
  `cover-thumbnail-check`, `credentialed-sync`, `scheduled-send`, `public-rendering`, or
  `published`.
- XHS public research must keep the publishable body conservative: platform-native plain text plus
  image/card artifacts. Markdown-like authoring and rich card tools are input workflows only; HTML,
  arbitrary CSS, raw SVG, and WeChat decorations must remain non-publishable for the XHS body.
- Zhihu public research must keep the publishable body as clean semantic Markdown or platform/public
  image fallbacks. Arbitrary HTML, raw SVG, WeChat interactive wrappers, and unhosted local image
  references remain blocked until public-host or platform-host proof exists.
- Evidence docs must classify each public source as `market-first-party`, `market-community`,
  `platform-community`, or `tool-doc`. Only first-party platform docs or real platform readbacks can
  close platform gates.

Required checks:
- Evidence docs must list source URLs and classify whether each source is first-party market
  material, community material, tool documentation, or platform evidence.
- Evidence docs must explicitly state that public-source taxonomy does not prove live WeChat paste,
  phone preview, XHS/Zhihu upload, public-host acceptance, scheduled send, public rendering, or
  publish success.
- Future code changes that open or map style choices from this taxonomy must keep existing detector
  blockers and add exact artifact, phone, public-host, or platform proof before changing
  availability/selectability.

## 54. Runtime Market SVG/H5 Fallback Matrix Reconciliation - 2026-06-23

Contracts:
- `wechat-market-svg-h5-fallback-matrix` is the executable WeChat catalog row for market-derived
  SVG/H5 capability families.
- The row may list public/observed market families such as background SVG shell, click expand,
  click show/hide, click switch, image carousel, slide trigger, path animation, parallax, long
  press, region trigger, card/title/divider/cover structures, text marquee, quiz/game, typed
  image-slot manifest, normalized trigger-zone manifest, external H5 handoff boundary, and H5
  handoff.
- The row must remain `status:'blocked'`, `motion:'mobile-only'`, and
  `evidenceFloor:'mobile-preview'` until the exact InkForge artifact has phone WeChat readback and
  publish/platform proof.
- The row must not have a `STYLE_CHOICE_APPLICATIONS` mapping while blocked; it is a visible
  fallback checklist, not a selectable WeChat export style.
- External H5 pages, vendor H5 packages, plugin transfer, and sync handoffs are separate
  publish-checklist states. They do not prove Official Account article body rendering.
- Detector blockers must continue to include market residue, unsafe SVG constructs, touch-only
  trigger risk, fixed container risk, transparent image/SVG overlay risk, zero line-height, class/id
  dependency, and layout-report-required gates.

Required checks:
- Regression tests must assert the explicit family names in `contentBlocks`.
- Regression tests must assert the external-H5/plugin/sync blocker text.
- Regression tests must prove availability stays blocked, application mapping stays null, and
  proof requirements still include phone preview and platform/public rendering rows.
- Evidence docs must state that this is local catalog accounting only and does not prove editor
  paste, phone preview, mobile interaction, Dark Mode, cover acceptance, sync, public rendering, or
  publish success.

## 55. WeChat Home New-Creation Route Blocker - 2026-06-23

Contracts:
- A CloakBrowser read-only check on the authenticated WeChat Official Account backend home surface
  may be recorded as backend-home reachability and route-blocker evidence only.
- Home-surface reachability does not satisfy `authenticated-editor-reachable`,
  `pc-editor-dom-readable`, `pc-editor-paste`, `exact-artifact`, `safe-disposable-draft`,
  `phone-preview`, `dark-mode-check`, `cover-thumbnail-check`, `credentialed-sync`,
  `scheduled-send`, `platform-preview`, `public-rendering`, or `published`.
- Generic new-creation menu labels such as article, existing content selection, sticker/image,
  video, reprint, and podcast may be recorded only as generic workflow labels.
- Existing draft titles, published titles, account labels, public article URLs, credential query
  parameters, account images, runtime capture locations, local browser-state details, and browser
  profile paths must remain redacted and uncommitted.
- If the generic new-creation entries expose no sanitized `href`, `data-url`, or `data-action`, the
  run is route-blocker evidence only and must not activate an item that can create or alter account
  state.

Required checks:
- Evidence docs must record aggregate DOM counts and sanitized URL category only.
- Evidence docs must explicitly state that no menu item was activated and no draft was created.
- Evidence docs must preserve the cannot-claim boundary for editor reachability, PC DOM readback,
  paste, exact-artifact proof, safe-disposable-draft proof, phone preview, mobile interaction, Dark
  Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public
  rendering, upload, and publish success.

## 56. Style Proof External Handoff Packet - 2026-06-23

### 1. Scope / Trigger

- Trigger: committed style-proof accounting may identify external gates correctly, but operators
  still need a deterministic handoff artifact that lists what proof is required without implying the
  gates are complete.
- The contract applies to the local report API above
  `getCommittedStyleProofExternalHandoffReport()`.
- The packet and Markdown formatter are reporting-only helpers. They must not create browser
  artifacts, read browser profiles, open platform pages, mutate accounts, upload content, schedule
  sends, or publish.

### 2. Signatures

```typescript
type CommittedStyleProofExternalHandoffNextRowKind =
  | 'phone-preview'
  | 'external-account'
  | 'public-host'
  | 'unsafe-to-automate'
  | 'mutating-platform'

interface CommittedStyleProofExternalHandoffNextRowRef {
  kind: CommittedStyleProofExternalHandoffNextRowKind
  row: CommittedStyleProofExternalProofChecklistRow
}

interface CommittedStyleProofExternalHandoffPacket {
  canClaimComplete: boolean
  status: CommittedStyleProofReleaseGateStatus
  canContinueLocally: boolean
  requiresOperator: boolean
  requiresPhone: boolean
  requiresExternalAccount: boolean
  requiresPublicHost: boolean
  containsUnsafeToAutomateRows: boolean
  containsMutatingPlatformRows: boolean
  recommendedNextAction: string | null
  cannotAutoCompleteReason: string | null
  summary: CommittedStyleProofExternalHandoffReport['summary']
  groups: readonly CommittedStyleProofExternalProofChecklistGroup[]
  rows: readonly CommittedStyleProofExternalProofChecklistRow[]
  nextRowRefs: readonly CommittedStyleProofExternalHandoffNextRowRef[]
  nextRows: readonly CommittedStyleProofExternalProofChecklistRow[]
}

getCommittedStyleProofExternalHandoffPacket(report?)
formatCommittedStyleProofExternalHandoffPacketMarkdown(packet?)
```

### 3. Contracts

- `getCommittedStyleProofExternalHandoffPacket()` must reuse
  `getCommittedStyleProofExternalHandoffReport()` as the source of truth.
- The packet must expose deterministic summary counts, external checklist groups, external rows,
  and the currently recommended next rows without changing release-gate status, catalog
  availability, selector mappings, manifest validation, or acceptance-audit classification.
- The packet must preserve `canClaimComplete=false` and `canContinueLocally=false` when the source
  report still has phone, external-account, public-host, unsafe-to-automate, or mutating-platform
  blockers.
- `formatCommittedStyleProofExternalHandoffPacketMarkdown()` must be deterministic for the same
  packet input and must not add timestamps, runtime paths, profile names, URLs from authenticated
  pages, account labels, draft titles, QR data, request archives, cookies, tokens, or authorization
  headers.
- Markdown rows must include the operator contract fields from the checklist row: required
  channels/actions/readbacks, required fields, forbidden fields, accepted host statuses, freshness,
  redaction boundary, success criteria, failure signals, cannot-claim reason, and next operator
  action.
- The Markdown must explicitly state that local-only checks, unit tests, local browser rendering,
  and catalog availability cannot satisfy phone preview, Dark Mode, cover thumbnail, credentialed
  sync, scheduled send, platform preview, public rendering, upload, or publish proof.

### 4. Required Checks

- Regression tests must prove packet rows stay non-automatable and cannot-claim.
- Regression tests must prove WeChat phone-preview rows, Xiaohongshu platform-publish rows, and
  Zhihu public-host rows are represented.
- Regression tests must prove Markdown determinism and include the cannot-claim boundary.
- Regression tests must scan the Markdown for sensitive fragments such as local profile paths,
  credential/header strings, HAR markers, QR markers, and public platform URL fragments.
- Full export regressions, targeted ESLint, strict type-check, production build, GitNexus
  detect-changes, and staged redaction scan must pass before committing the slice.

## 57. ExportModal External Handoff Packet UI - 2026-06-23

### 1. Scope / Trigger

- Trigger: the deterministic external handoff packet must be reachable from the real local Publish
  modal so operators can copy the pending proof checklist without treating local UI success as
  platform proof.
- The UI contract applies only to `src/components/export/ExportModal.vue` and the local copy helper.
- The UI must not open external platform pages, read browser profiles, create artifacts, mutate
  platform accounts, upload content, schedule sends, or publish.

### 2. Signatures

```typescript
const committedStyleProofExternalHandoffPacket = computed(() =>
  getCommittedStyleProofExternalHandoffPacket(committedStyleProofExternalHandoff.value),
)

const committedStyleProofExternalHandoffMarkdown = computed(() =>
  formatCommittedStyleProofExternalHandoffPacketMarkdown(
    committedStyleProofExternalHandoffPacket.value,
  ),
)

async function handleCopyExternalHandoff(): Promise<void>
```

### 3. Contracts

- ExportModal must consume `getCommittedStyleProofExternalHandoffPacket()` and
  `formatCommittedStyleProofExternalHandoffPacketMarkdown()` instead of re-creating packet rows or
  Markdown in the component.
- The copy action may call the existing local clipboard helper only with the formatted Markdown
  packet. It must not create proof manifests, update release-gate state, or mark external rows as
  complete.
- Success feedback must explicitly say the copied packet is for manual acceptance and does not mean
  platform proof is complete.
- Failure feedback must stay local and permission-oriented. It must not ask the user to expose
  credential material, request archives, QR payloads, browser-state details, account labels, draft
  titles, or public article URLs.
- The button must use the installed icon library and real `<button type="button">` semantics. Emoji
  icons are forbidden.
- The control must remain visible in the 390 px local Publish modal without increasing page
  `scrollWidth` beyond `clientWidth`.

### 4. Validation & Error Matrix

- Clipboard helper returns `true` -> mark only local copy feedback as successful and show the manual
  acceptance boundary message.
- Clipboard helper returns `false` -> show a local permission failure and leave all proof/release
  statuses unchanged.
- External handoff report remains `blocked-by-external` -> the UI may display and copy the packet,
  but must not enable a complete/publish claim.
- Browser smoke detects modal overflow at 390 px -> fix component layout before accepting the slice.

### 5. Good/Base/Bad Cases

- Good: real local Workstation article -> real Publish button -> ExportModal opens -> external
  handoff block and copy button are visible -> DOM handler copies deterministic Markdown -> feedback
  preserves the manual-proof boundary.
- Base: clipboard write is denied by browser policy -> button remains visible -> feedback reports
  local clipboard permission failure -> release status remains blocked.
- Bad: component duplicates checklist rows, silently changes proof status, uses emoji icons, stores
  browser/account/runtime artifacts, or records local clipboard success as platform proof.

### 6. Tests Required

- Targeted ESLint for `ExportModal.vue` must pass without new unused imports, refs, computed values,
  or handlers.
- Strict `vue-tsc --noEmit` must pass.
- Production build must pass with the generated TypeScript build info restored afterward.
- CloakBrowser-only local UI smoke must use a real local Workstation article and the real Publish
  button, then record aggregate DOM/layout counts only.
- The smoke may record DOM handler success for the Vue binding, but must not claim operating-system
  clipboard contents or external platform proof without a separate redacted operator artifact.

### 7. Wrong vs Correct

#### Wrong

```typescript
// Rebuilds proof rows in the component and implies local copy equals completion.
const copied = await navigator.clipboard.writeText(JSON.stringify(localRows))
releaseGate.value = 'completed'
```

#### Correct

```typescript
const packet = getCommittedStyleProofExternalHandoffPacket(report)
const markdown = formatCommittedStyleProofExternalHandoffPacketMarkdown(packet)
const copied = await copyTextToClipboard(markdown)
// Only local copy feedback changes; external proof gates remain blocked until real evidence exists.
```

## 58. Market Editor Applied SVG/H5 DOM Refresh - 2026-06-23

### 1. Scope / Trigger

- Trigger: 135 and Xiumi applied-editor DOM must be converted into InkForge-owned rendering rules
  without copying third-party templates, member assets, authoring metadata, or account state.
- The rule applies when market-editor observations are used to add WeChat/XHS/Zhihu style choices,
  fallback strategies, quality detectors, or documentation.
- Only applied DOM after a visible click in the market editor counts. Listing text, library counts,
  or public marketing pages are taxonomy evidence, not applied rendering evidence.

### 2. Signatures

```typescript
interface MarketAppliedDomRuleEvidence {
  source: '135-svgeditor' | 'xiumi-paper-editor'
  urlCategory: string
  action: 'click-free-trial' | 'click-visible-style-card'
  centerRendered: boolean
  aggregateCounts: Record<string, number>
  observedRuleFamilies: readonly string[]
  unsafeToCopy: readonly string[]
  inkforgeMappings: readonly string[]
  cannotClaim: readonly string[]
}
```

### 3. Contracts

- 135 applied SVG evidence may map only to source-owned wrappers, background-SVG frames,
  image-slot manifests, trigger-zone manifests, motion timing, and fallback policies.
- 135 observed wrappers that clear font size, line height, margins, and padding may inspire
  `safe-zero-wrapper` rules, but third-party class names, ids, data attributes, CDN asset URLs, and
  editor-control markup must remain blocked from final exports.
- Xiumi applied SVG evidence may map only to source-owned taxonomy, nested section layout, action
  schema, readable fallback, image/raster fallback, layout report, and residue detection.
- Xiumi `foreignObject` text is high risk for WeChat article output. Do not mark it generally
  available without exact artifact paste evidence, phone preview evidence, and Dark Mode evidence.
- Xiumi SMIL `animate` rows are high risk for mobile-only behavior. Do not mark click/fade effects
  complete without mobile before/after evidence from the target platform.
- No market-editor applied evidence can satisfy credentialed sync, scheduled send, platform
  preview, public rendering, public-host acceptance, upload, or publish proof.

### 4. Validation & Error Matrix

- `centerRendered=false` -> record taxonomy only; do not create a runtime style rule.
- Market DOM contains `_135editor`, `135brush`, `135bg`, `data-tools`, `tn-*`, `ng-*`, Xiumi static
  asset markup, Xiumi applied SVG content-layer classes (`svg-layout-content`, `root-svg`,
  `rect-content`, `fade-self-animation`), or third-party authoring classes in final output -> emit
  market-editor residue.
- Applied SVG relies on `foreignObject` text -> require readable HTML fallback and Dark Mode proof.
- Applied SVG relies on SMIL `animate` / click or touch behavior -> require phone preview and
  interaction readback before availability.
- Applied layout uses absolute/free positioning, invisible hit areas, cropped backgrounds, or
  custom trigger zones -> require a layout report plus static/raster fallback.

### 5. Good/Base/Bad Cases

- Good: click the 135 free-trial effect, resolve the material prompt, inspect the center canvas,
  record five wrapper/SVG blocks, and map them to source-owned wrapper, image-slot, trigger-zone,
  and timing contracts.
- Good: click Xiumi SVG -> visible SVG card -> inspect the center document, record nested
  `section`/SVG/`foreignObject`/`animate` counts, and map them to fallback plus detector rules.
- Base: the editor shows a taxonomy but no center DOM change. Record categories only.
- Bad: paste 135 or Xiumi template HTML into InkForge output, preserve market authoring metadata, or
  claim WeChat phone/publish success from market-editor DOM.

### 6. Tests Required

- Docs/evidence updates must record aggregate counts and sanitized route categories only.
- Quality detectors must continue blocking 135/Xiumi authoring residues from WeChat, Xiaohongshu,
  and Zhihu outputs.
- Quality detectors must block Xiumi applied SVG content-layer classes even when the surrounding
  `tn-*` wrapper and Xiumi-hosted background have already been stripped.
- New style choices inspired by these observations need unit coverage for availability, fallback,
  cannot-claim gates, and redaction boundaries.
- Browser evidence must use CloakBrowser for market-editor UI exploration and must not commit
  screenshots, account details, draft titles, browser-state locations, or local runtime paths.

### 7. Wrong vs Correct

#### Wrong

```html
<!-- Copies market-editor authoring DOM directly into final WeChat output. -->
<section class="_135editor" data-tools="135编辑器">...</section>
```

#### Correct

```typescript
const ruleFamilies = [
  'safe-zero-wrapper',
  'background-svg-frame',
  'trigger-zone-manifest',
  'static-or-raster-fallback',
] as const
// Market DOM informs the source-owned rule family only; it is never copied as output.
```

## 60. WeChat Official Editor Entry Surface Readback - 2026-06-23

### 1. Scope / Trigger

- Trigger: a CloakBrowser authenticated WeChat editor-entry run reaches the official article editor
  route and can read the editor DOM without inserting article content.
- This evidence may satisfy `authenticated-editor-reachable` and `pc-editor-dom-readable` only when
  the active route category is the official article editor and the editor DOM contains concrete
  title/body surface selectors.
- Standard click blockers and `window.open` tab-handling workarounds must be recorded separately
  from editor proof. Same-tab redirection is acceptable only to keep CloakBrowser attached to the
  official route; it is not a sync, preview, publish, or paste action.

### 2. Required Redacted Fields

- Captured route category: `action=edit`, `type=10`, and `t=media/appmsg_edit_v2`, with credential
  query parameters redacted.
- Final active route category: `appmsg-edit-like`.
- Editor selector counts: `#js_appmsg_editor`, `#ueditor_0`, `.ProseMirror`,
  `.rich_media_content`, contenteditable count, iframe count, textarea count, input count, SVG
  count, and button count.
- Title/body editor signals: visible title ProseMirror placeholder and visible body ProseMirror
  surface.
- Risk controls observed but not clicked: save draft, preview, publish, scheduled send, sync,
  delete, or cleanup controls when present.
- Platform auto-save or word-count text may be recorded as platform state only. It must not be
  promoted to manual save, paste, preview, publish, or cleanup proof.

### 3. Cannot-Claim Boundary

- Editor-entry surface readback does not prove `pc-editor-paste`, `exact-artifact`,
  `safe-disposable-draft`, `phone-preview`, `dark-mode-check`, `cover-thumbnail-check`,
  `credentialed-sync`, `scheduled-send`, `platform-preview`, `public-rendering`, `published`, XHS
  upload, or Zhihu upload.
- A blank editor route with no unique disposable marker and no cleanup path must not satisfy
  `safe-disposable-draft`, even if the platform shows auto-save state.
- A visible publish/preview/save button must be recorded as a route-risk marker only unless that
  control is explicitly exercised in a separately scoped proof run with redacted before/after
  readbacks.

### 4. Tests / Evidence Required

- Evidence docs must state that CloakBrowser was used and that Playwright was not used for the
  platform run.
- Evidence docs must state whether `window.open` was redirected to same-tab navigation.
- Evidence docs must record only sanitized route categories and aggregate selector counts. Raw URLs,
  credential query parameters, account names, draft titles, public URLs, screenshots, local browser
  runtime directories, and account images must not be committed.
- Commit-boundary review must scan staged diffs for credential material and account artifacts.

## 64. Save-Draft No-Card Manifest Field - 2026-06-23

### 1. Scope / Trigger

- Trigger: a live WeChat safe-disposable-draft run attempts save-draft but draftbox readback does
  not expose a unique disposable marker card.
- The validator field is `StyleProofArtifact.saveDraftNoCard?: boolean`.

### 2. Contract

- `saveDraftNoCard:true` is valid only on a redacted artifact whose `requirementId` is
  `safe-disposable-draft`.
- The field means save-draft was attempted but no unique draftbox card existed for cleanup.
- The semantic issue id is `style-proof-manifest-save-draft-no-card`.
- The field is a known boolean artifact field and must not create intake schema warnings.
- Acceptance audit must classify the proof row as invalid, not as an automatable/missing success.

### 3. Cannot-Claim Boundary

- `saveDraftNoCard:true` must keep `safe-disposable-draft`, `disposableDraft:true`, and
  `cleanupPathVerified:true` unclaimed.
- It does not prove ordinary paste, exact artifact retention, phone preview, Dark Mode, mobile
  interaction, cover thumbnail acceptance, credentialed sync, scheduled send, platform preview,
  public rendering, public-host acceptance, upload, or publish success.

### 4. Tests / Evidence Required

- Add or maintain a regression where a safe-disposable-draft artifact with `saveDraftNoCard:true`
  produces `style-proof-manifest-save-draft-no-card`, zero intake schema warnings, invalid
  `safe-disposable-draft`, and an acceptance cannot-claim row.
- Evidence docs must preserve the platform boundary and must not commit raw URLs, credential query
  parameters, account names, private draft titles, screenshots, or local browser runtime
  directories.

## 65. Market Editor DOM Learning Rules - 2026-06-23

### 1. Scope / Trigger

- Trigger: learning 135 editor, Xiumi, or similar market editors to improve InkForge's WeChat/XHS/
  Zhihu style catalog and rendering rules.
- Market-editor inspection may record taxonomy, aggregate DOM counts, class families, layout
  patterns, and public documentation links.
- It must not copy proprietary template source, paid assets, raw image URLs, account data, browser
  profiles, cookies, tokens, screenshots with account content, or unredacted platform routes.

### 2. 135-Derived Rendering Rules

- Keep a first-class taxonomy for `image`, `click`, `carousel`, `slide`, `auto`, `audio-video`,
  `expand`, `long-press`, `layout`, `official-account`, `link-miniprogram`, and other effect
  families.
- Central WeChat canvas rules should use a stable article width, gap-safe blocks, and media wrappers
  that can scale 1080-wide/1080x1920 art to the local preview width.
- Gap-safe wrappers should use `font-size:0`, `line-height:0`, zero margin/padding, and centered
  media sections when exporting image/SVG panels.
- When a visible layer is represented by an SVG or image background, use explicit sizing,
  `display:inline-block`, one-pixel seam protection, and noninteractive `pointer-events:none` for
  decorative layers.

### 3. Xiumi-Derived Rendering Rules

- Keep style families visible to users as `title`, `card`, `image`, `layout`, `SVG`, `component`,
  `hot`, `recommended`, `recent`, and template groups rather than hiding them behind one generic
  preset picker.
- SVG effect vocabulary must include base SVG, image carousel, click expand, path animation,
  lottery, slide, transition, branch transition, slide trigger, parallax, click switch,
  page/flip, zoom, click quiz, text barrage, click show/change/open/disappear/popup/zoom/print/
  jump/play, long-press switch, region trigger, click drop, and click-plus-auto groups when the
  corresponding InkForge modules exist.
- Record reusable capability metadata for each advanced effect: component family, trigger mode,
  motion mode, image ratio, interactive/degradable status, and platform proof requirement.
- Xiumi-like inserted effects may compile into a component tree of `article`, `section`, cells,
  groups, image layers, and text nodes rather than raw `svg`; InkForge must preserve a static
  readable fallback and avoid assuming raw SVG is always present.
- Ratio boxes, flow canvases, `overflow:hidden`, `line-height:0`, `max-width:100%`, percentage image
  sizing, flex rows, and explicit image wrappers are preferred over brittle free-positioned output.

### 4. Cannot-Claim Boundary

- Market-editor DOM learning is taxonomy and rendering-rule evidence only.
- It does not satisfy `marketAppliedContentVerified`, WeChat PC paste, exact artifact retention,
  safe disposable draft cleanup, phone preview, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, platform preview, public rendering, public-host acceptance,
  upload, or publish success.
- Any rule learned from 135/Xiumi must be re-expressed as InkForge-owned implementation or
  documentation. Do not reuse third-party private classes, template markup, paid assets, or raw CDN
  dependencies as committed output.

### 5. Tests / Evidence Required

- Evidence must state that CloakBrowser was used and Playwright was not used.
- Evidence must record sanitized editor routes, aggregate DOM counts, class-family signals, and
  user-facing category labels only.
- If the learning changes renderer output, add focused regression tests proving zero-gap media
  wrappers, static fallbacks, platform-specific degrade behavior, and cannot-claim audit rows.
- Commit-boundary review must scan staged diffs for credential material, local browser paths, raw
  third-party template source, raw URLs, screenshots, QR codes, and account artifacts.

## 66. Market Capability Metadata Catalog - 2026-06-23

### 1. Scope / Trigger

- Trigger: 135/Xiumi/public WeChat editor learning must become executable InkForge-owned catalog
  metadata without changing renderer output or platform proof state.
- `PlatformStyleChoice.marketCapabilities` is optional. Regular choices may omit it; market-derived
  choices use it to expose reusable family/source/trigger/render/proof metadata.
- The metadata is a catalog/reporting surface only. It must not change `status`, `evidenceFloor`,
  `publishEvidence`, `usable`, `selectable`, proof-manifest validation, release-gate accounting, or
  preset mapping.

### 2. Required Fields

- Each `StyleMarketCapability` row records `family`, `label`, `sources`, `triggerMode`,
  `renderPattern`, `output`, `status`, `degradable`, `requiredProof`, and `notes`.
- `imageRatio` is optional and may be used for known market ratios such as 1080x1920, 1080x720, or
  1080x1440.
- Valid statuses are `source-owned`, `fallback-only`, `blocked-until-proof`, and
  `external-handoff`.
- Source values must name broad evidence classes such as `135-svg-editor`, `xiumi-v5-paper`,
  `public-wechat-svg-practice`, `doocs-md`, or `inkforge-owned`; do not store raw vendor URLs,
  private material ids, account data, or proprietary class trees.

### 3. Platform Rules

- WeChat market SVG/H5 families such as background SVG shell, carousel, click expand, click switch,
  path animation, parallax, slide trigger, long press, and region trigger must remain
  `blocked-until-proof` until exact same-artifact mobile/platform proof exists.
- WeChat ratio/image wrappers and title/card layouts may be `fallback-only` metadata when they are
  rewritten as InkForge-owned static/readable wrappers.
- WeChat H5/plugin handoff rows must stay `external-handoff` and require credentialed channel and
  sync/publish proof before any platform claim.
- XHS market richness may map only to source-owned image-page or long-image fallback metadata with
  `xhs-artifact-manifest` proof requirements.
- Zhihu market richness may map only to clean Markdown or public image fallback metadata, and image
  fallback must require public host plus `zhihu-artifact-manifest` proof.

### 4. API Contract

- `getStyleChoiceMarketCapabilities(choiceId)` returns the choice capabilities or an empty readonly
  list for choices without market metadata.
- `getPlatformStyleMarketCapabilityReport(platform)` returns only choices with capabilities, their
  existing application mapping, existing proof requirements, sorted family ids, and status counts.
- These APIs must reuse existing `getPlatformStyleChoices()`, `getStyleChoiceApplication()`, and
  `getStyleChoiceProofRequirements()` instead of forking availability/proof logic.

### 5. Tests / Evidence Required

- Regression tests must prove WeChat market capabilities exist while the WeChat market matrix
  remains unusable and unmapped to a preset application under default local evidence.
- Tests must prove normal non-market choices return an empty capability list.
- Tests must prove XHS and Zhihu fallback metadata still carries platform-specific proof
  requirements and does not bypass upload/public-host/publish gates.
- Evidence docs must state that this is local executable metadata only and does not prove paste,
  phone preview, sync, upload, public rendering, or publish success.

## 67. ExportModal Market Capability UI Surface - 2026-06-23

### 1. Scope / Trigger

- Trigger: `PlatformStyleChoice.marketCapabilities` exists and the user-facing ExportModal style
  catalog needs to expose market-derived richness without changing selection or proof state.
- The UI must consume `getPlatformStyleMarketCapabilityReport(selectedPlatform)` directly.
- The UI must not recompute market capability counts from strings, mutate proof reports, or change
  `selectable` / `application` behavior.

### 2. Display Contract

- A style choice with market metadata may show one summary row:
  `市场能力：<count>；自有 <n>；降级 <n>；待证明 <n>；外部交接 <n>`.
- It may show up to five compact capability chips. Each chip names the capability family, trigger
  mode, and metadata status.
- Non-market choices must not show empty capability text.
- The summary and chips must wrap inside the existing style card width. Horizontal card overflow is
  a UI regression.

### 3. Boundary

- The UI is informational. It must not open unavailable choices, attach a preset application to
  blocked choices, mark phone/external/publish rows complete, or claim market editor proof.
- It must use existing icon/text conventions and no emoji.
- Visual verification should use CloakBrowser, not Playwright, and should record only sanitized DOM
  counts and overflow checks.

### 4. Tests / Evidence Required

- Run `eslint` for `ExportModal.vue`.
- Run `vue-tsc --noEmit`.
- Visually verify WeChat/XHS/Zhihu tabs in CloakBrowser and record style-card counts, market-card
  counts, visible chip labels, and overflow count.
- The real Tauri/WebView2 `svg-render.spec.cjs` e2e should assert the same market capability
  summaries/chips from the actual ExportModal DOM. It must also assert that the WeChat/Zhihu market
  choices remain blocked/disabled where proof is missing and that market rows have zero horizontal
  overflow.
- Build before commit when the template changed.

## 68. WDIO E2E CJS Lint Contract - 2026-06-23

### 1. Scope / Trigger

- Trigger: `tests/e2e/**/*.cjs` uses WDIO, Mocha, Node/CommonJS, and browser globals that are not
  part of the normal `src/**/*.{ts,tsx,vue}` lint surface.
- `inkforge/eslint.config.js` may define a file-scoped override for `tests/e2e/**/*.cjs`.
- The override must not weaken `src` lint rules, Vue lint rules, TypeScript strict rules, or product
  code no-console behavior.

### 2. Contract

- The e2e override should set `sourceType: 'commonjs'` and declare only the WDIO/Mocha/Node/browser
  globals used by the `.cjs` harness as readonly globals.
- It may disable `@typescript-eslint/no-require-imports` for `.cjs` files because the current WDIO
  harness is CommonJS.
- It may disable `@typescript-eslint/no-unused-expressions` for `.cjs` e2e files because Chai's
  fluent assertion style intentionally uses expressions such as `.to.exist`.
- Do not add `expect` as a global when a spec imports `expect` from `chai`; that creates
  `no-redeclare` noise and hides real local bindings.

### 3. Tests / Evidence Required

- Run `pnpm -C inkforge exec eslint 'tests/e2e/**/*.cjs' --quiet`.
- Run `node --check` for changed `.cjs` e2e/config files.
- When the changed e2e spec affects runtime assertions, re-run the targeted real Tauri/WebView2 WDIO
  spec.

## 63. Foreground Input ClickOnly Helper - 2026-06-23

### 1. Scope / Trigger

- Trigger: a live platform proof step needs a real foreground Windows mouse click without sending
  keyboard input.
- `inkforge/scripts/probe-windows-foreground-input.ps1 -Action ClickOnly` is the reusable helper
  path for this case. It replaces one-off PowerShell click snippets in future evidence runs.

### 2. Contract

- `ClickOnly` must keep the existing window matching, restore, optional move, coordinate
  derivation, and optional mouse click behavior.
- `ClickOnly` must not send `Ctrl+V`, `KeyA`, or any other keyboard input.
- `ClickOnly` must report `requestedInputCount=0`, `sentInputCount=0`, and `keybdEventCount=0`.
- Empty input batches must be represented in a PowerShell StrictMode-safe way.

### 3. Cannot-Claim Boundary

- A successful `ClickOnly` helper run proves only local tooling behavior.
- It does not prove platform save, cleanup, paste, phone preview, Dark Mode, mobile interaction,
  cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public
  rendering, upload, or publish success.

### 4. Tests / Evidence Required

- At minimum, verify `ClickOnly -NoClick` against a safe foreground window and require
  `requestedInputCount=0`, `sentInputCount=0`, and `keybdEventCount=0`.
- Evidence docs must not commit raw window titles containing account/private content, browser
  runtime directories, screenshots, credential material, or raw platform URLs.

## 62. WeChat Disposable Save No-Card Boundary - 2026-06-23

### 1. Scope / Trigger

- Trigger: a live WeChat editor run writes deterministic disposable markers and attempts
  save-draft, but the draftbox list does not expose a unique matching card afterward.
- This evidence is negative safe-disposable-draft lifecycle evidence. It must prevent editor-entry
  or title/body marker observations from being promoted into cleanup proof.

### 2. Required Fields

- Editor route category and same-session editor-entry path.
- Disposable title marker and optional body sentinel.
- Save-draft target verification: visible text `保存为草稿`, target type, and whether the click was
  CloakBrowser selector click, DOM event/click, or real OS mouse click.
- Post-save route/readback and draftbox marker counts.
- Delete behavior: explicitly record `no delete action executed` when no unique marker card exists.

### 3. Cannot-Claim Boundary

- `markerCount=0` or multiple/ambiguous marker cards must keep `safe-disposable-draft`,
  `disposableDraft:true`, and `cleanupPathVerified:true` unset.
- A title/body marker that exists only in the editor DOM is not enough. The proof target must appear
  as a unique draftbox card and then be deleted with post-cleanup absence readback.
- If the save-draft button does not produce a visible confirmation or draftbox card, do not infer
  success from editor route persistence, auto-save text, or body word count.
- Negative save/no-card evidence must not prove ordinary paste, exact artifact retention, phone
  preview, Dark Mode, mobile interaction, cover thumbnail acceptance, credentialed sync, scheduled
  send, platform preview, public rendering, public-host acceptance, upload, or publish success.

### 4. Tests / Evidence Required

- Evidence docs must state that no preview, publish, sync, scheduled send, upload, phone preview,
  public rendering, or delete action was clicked unless that action is the explicit scope.
- Evidence docs must redact raw URLs, credential query parameters, account names, private draft
  titles, account images, runtime screenshots, and local browser runtime directories.
- Commit-boundary review must scan staged diffs for credential material and account artifacts.

## 61. WeChat Live OS Ctrl+V No-Input Evidence - 2026-06-23

### 1. Scope / Trigger

- Trigger: a live WeChat editor run prepares an exact CF_HTML artifact and sends foreground
  Windows Ctrl+V, but the editor body does not receive paste/input events and does not mutate.
- This evidence is a negative `pc-editor-paste-event` row. It must be recorded because it prevents
  stale or partial PC-paste claims from being upgraded.
- The evidence may reuse a current editor-entry proof, but it must still bind the artifact
  fingerprint, foreground input method, body readback, and cleanup/safe-draft outcome.

### 2. Required Fields

- Exact artifact path and SHA-256.
- Clipboard format and source counts: HTML bytes, CF_HTML bytes, source SVG count,
  `data-ink-svg` count, and `data-ink-block` count.
- Foreground input attempt summary: method (`keybd_event` or `SendInput`), foreground window
  matched, click/no-click mode, and whether clipboard was preserved.
- Editor body readback after each attempt or final failed attempt: text length, HTML length, SVG
  count, `data-ink-svg` count, `data-ink-block` count, `sectionNice`, active editor class, and
  event-probe counts when a probe is installed.
- Disposable marker and cleanup readback. If no unique marker appears in draftbox, do not delete
  any generic untitled/private draft and keep cleanup unclaimed.

### 3. Cannot-Claim Boundary

- `eventCount=0`, no trusted `paste`, no `beforeinput/input`, or unchanged body HTML must keep
  `ordinaryClipboardPasteVerified:true`, `pasteInputEventVerified:true`, and
  `editorBodyMutationVerified:true` unset.
- A marker that matched in the editor but did not appear as a unique draftbox card must keep
  `safe-disposable-draft` and `cleanupPathVerified:true` unset.
- Negative OS Ctrl+V evidence must not prove phone preview, Dark Mode, mobile interaction, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, upload, or publish success.

### 4. Tests / Evidence Required

- Evidence docs must state that no save, preview, publish, delete, sync, scheduled send, phone,
  upload, or cleanup action was clicked unless that action is the explicit scope.
- Evidence docs must redact raw URLs, credential query parameters, account names, private draft
  titles, account images, runtime screenshots, and local browser runtime directories.
- Commit-boundary review must scan staged diffs for credential material and account artifacts.

## 64. External Handoff Packet Next-Row Dedupe - 2026-06-23

### 1. Scope / Trigger

- Trigger: the committed external handoff packet has five logical next-action categories
  (`phone-preview`, `external-account`, `public-host`, `unsafe-to-automate`, and
  `mutating-platform`), but several categories can point at the same underlying proof row.
- The packet must keep category meaning for operators while avoiding duplicate proof rows in
  machine consumers.

### 2. Contract

- `CommittedStyleProofExternalHandoffPacket.nextRowRefs` is the category-level projection. It must
  contain one ref per available next-action category, preserving the category `kind` and the
  referenced checklist row.
- `CommittedStyleProofExternalHandoffPacket.nextRows` is the unique row projection. It must dedupe
  `nextRowRefs` by checklist row id while preserving first-seen order.
- `formatCommittedStyleProofExternalHandoffPacketMarkdown()` must render `nextRowRefs` in the
  "Next Operator Rows" section with the category label included. The full "Proof Rows" section
  remains sourced from the canonical checklist rows.
- This is a reporting shape change only. It must not change release-gate status, blocker counts,
  proof manifests, artifact templates, style availability, style selectability, renderer output,
  platform account state, browser state, clipboard state, upload, sync, schedule, or publish
  behavior.

### 3. Required Checks

- Regression tests must keep `canClaimComplete:false`, `safeExternalRows=0`, and the current
  external handoff count snapshot while proving `nextRowRefs` has all five categories.
- Regression tests must prove `nextRows` is unique by row id and that every next ref/row remains
  `cannotClaim` and `safeToAutomate:false`.
- Evidence docs must record the runtime readback and explicitly state that the change does not
  prove WeChat paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, public-host acceptance, XHS/Zhihu upload, or publish success.

## 65. Style Proof Release Preflight CLI - 2026-06-23

### 1. Scope / Trigger

- Trigger: local release validation needs a direct command that reads the committed style-proof
  release gate and fails the process while external proof gates remain open.
- The CLI is a deployment-acceptance guard. It is not a proof collector and must not make platform
  actions easier to automate silently.

### 2. Contract

- `pnpm -C inkforge style-proof:release-preflight` must execute a local, read-only script.
- The command must import the committed style-proof release gate and handoff packet directly from
  `src/services/export/style-catalog.ts`, avoiding UI state and application barrel side effects.
- The command must exit `0` only when `canClaimComplete:true`; it must exit `1` while the release
  gate is `blocked-by-local-conflict`, `blocked-by-external`, or `unsafe-to-automate`.
- `--json` must print a compact machine-readable report. Use `pnpm --silent -C inkforge
  style-proof:release-preflight -- --json` when the output needs to be parsed without pnpm's script
  banner.
- The report may include status, blocker kinds, counts, next-row categories, platform ids,
  requirement ids, gates, and boundaries. It must not output artifact references, local browser
  state locations, account labels, raw platform URLs, captures, authentication secrets, QR payloads,
  HAR payloads, or local runtime capture locations.
- The command must not create proof manifests, write evidence files, open browsers, read local
  browser state, write the clipboard, sync drafts, upload images, schedule sends, publish articles,
  or change style availability/selectability.

### 3. Required Checks

- The current command run must return exit code `1` with `status=blocked-by-external`,
  `canClaimComplete=false`, `externalHandoffRows=18`, `safeExternalRows=0`,
  `actionableLocalRows=0`, `nextRowRefs=5`, and `uniqueNextRows=3`.
- The JSON output must parse after stripping a PowerShell pipeline BOM when the shell injects one.
- `--help` must exit `0`.
- Evidence docs must record the expected non-zero release-blocking exit code and state that this
  CLI does not prove WeChat phone preview, PC paste, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, public-host acceptance, XHS/Zhihu
  upload, public rendering, or publish success.

## 69. Style Proof Release Preflight CLI Regression - 2026-06-23

### 1. Scope / Trigger

- Trigger: the release preflight command must be covered by automated regression tests, not only
  by one-off terminal evidence.
- The test must execute the real TypeScript CLI in a child process and inspect stdout/stderr/exit
  code. It must not import private helper functions, stub release reports, or fake a completed
  proof gate.

### 2. Contract

- `scripts/style-proof-release-preflight.test.ts` may invoke the local `tsx` CLI through
  `process.execPath` and `node_modules/tsx/dist/cli.mjs` for deterministic Windows behavior.
- Do not use a Windows `.cmd` wrapper inside the Vitest child process for argument-separator
  behavior. The package script remains the user/operator command, but tests should avoid shell
  forwarding differences around `--`.
- `--json` output must be compact single-line JSON. Pretty-printed output is a contract drift when
  downstream deployment checks parse stdout.
- The JSON regression must prove the current blocked release state:
  `status=blocked-by-external`, `canClaimComplete=false`, `blockerCount=4`,
  `externalHandoffRows=18`, `safeExternalRows=0`, `nextRowRefs=5`, and `uniqueNextRows=3`.
- The help regression must exit `0`.
- Unknown argument regression must exit `2` before printing any release success fields.
- Test output assertions must scan stdout/stderr for local browser state, account/runtime/capture,
  and auth material fragments.

### 3. Required Checks

- Run `pnpm -C inkforge exec vitest run scripts/style-proof-release-preflight.test.ts
  --reporter=default`.
- Run targeted ESLint for `scripts/style-proof-release-preflight.ts` and
  `scripts/style-proof-release-preflight.test.ts`.
- Re-run the local release preflight command and keep the expected `exitCode=1` blocked state in
  evidence.

## 70. 135 SVG Editor Applied DOM Refresh - 2026-06-25

### 1. Scope / Trigger

- Trigger: live market-editor learning must be grounded in applied DOM inside the editor canvas,
  not only catalog thumbnails or marketing descriptions.
- This rule records a CloakBrowser readback from the 135 SVG editor canvas after trial SVG effects
  were present in the central editing area.
- The evidence is market-pattern learning only. It is not WeChat paste proof, phone proof,
  credentialed sync proof, or publish proof.

### 2. Observed Applied DOM Pattern

- Canvas root contained 17 block wrappers. Five were large poster-like SVG blocks; twelve were
  editor placeholder/icon blocks.
- The large poster-like SVG blocks used `viewBox` values in the `0 0 1080 <height>` family and
  inline style flags equivalent to:
  `background-image`, `background-size:100.1% 100.1%`, `display:inline-block`, `width:100%`, and
  vertical alignment.
- Those large SVGs were wrapped by a `section` with `font-size:0`, `line-height:0`,
  zero margin/padding, and centered text alignment. This avoids inter-block whitespace and
  baseline gaps in a narrow WeChat-like column.
- The observed applied canvas had zero `foreignObject`, zero SMIL-like animation nodes, and zero
  `defs`/`clipPath`/`mask`/`filter`/`use`/`symbol` nodes.
- Trigger-hotzone editing was represented by editor-private overlay elements with percentage
  `inset` geometry. These overlays are authoring UI state, not a safe export payload.

### 3. InkForge Rule Translation

- Keep separating export payload from editor-only controls. Do not copy market-editor overlay
  controls into WeChat export HTML.
- For poster-like modules, InkForge may use the same high-level geometry strategy:
  deterministic viewBox, width-100 responsive layout, zero-line-height wrapper, and explicit
  no-gap section wrapper.
- InkForge must not depend on third-party CDN image URLs inside final export proof. If a poster-like
  module requires raster assets, route them through the existing asset/image pipeline and platform
  proof gates.
- Treat the observed no-`foreignObject`, no-`defs`, no-SMIL canvas as a conservative market-safe
  fallback pattern. Interactive InkForge modules may still use the already documented safe subset,
  but any interactive proof remains gated by real mobile/platform evidence.
- When adapting 135-like SVG/H5 ideas, preserve current InkForge stronger vector-first rules:
  no raw editor UI controls in output, no external image dependency unless proof-gated, no hidden
  account/runtime artifacts, and no release claim from market-DOM learning alone.

### 4. Required Checks

- Evidence must record sanitized structural counts only: block count, large SVG count, placeholder
  SVG count, `foreignObject` count, animation-like count, defs-like count, and key wrapper/style
  flags.
- Evidence must not include account labels, raw profile locations, raw platform URLs, screenshots,
  authentication secrets, QR payloads, HAR payloads, or local capture locations.

## 71. Xiumi Applied SVG/Style DOM Refresh - 2026-06-25

### 1. Scope / Trigger

- Trigger: live Xiumi learning must distinguish a real central editor mutation from a category or
  library-listing click.
- This rule records a CloakBrowser readback from the Xiumi v5 paper editor after clicking the SVG
  category, selecting a visible SVG style card preview, and reading the central editor DOM.
- The evidence is market-pattern learning only. It is not WeChat paste proof, phone proof,
  credentialed sync proof, public-host proof, or publish proof.

### 2. Observed Applied DOM Pattern

- Before applying the SVG card, the central `.tn-editing-panel` contained `htmlLength=566067`,
  `tnComp=21`, `tnCell=9`, `img=78`, `svg=0`, one `contenteditable` cell, 4507 `ng-*`
  attributes, 16 `opera-*` attributes, and 16 Xiumi-hosted media references.
- Clicking the left SVG category exposed 43 template items. The visible SVG cards included
  interactive image/gallery/page-turn families, and their library previews could contain inline SVG
  before insertion.
- Clicking the visible SVG card preview changed the central editor to `htmlLength=587422`,
  `tnComp=31`, `tnCell=14`, `img=78`, `svg=18`, `foreignObject=5`, 14 animate-like SVG nodes,
  zero `defs`/`clipPath`/`mask`/`filter`/`use`/`symbol` nodes, two `contenteditable` cells,
  4546 `ng-*` attributes, 26 `opera-*` attributes, and 21 Xiumi-hosted media references.
- The applied component appeared as an `article` / `section` / flow-canvas component tree of roughly
  32k HTML chars, not as a clean paste-ready fragment. It carried wrapper families such as
  `tn-paper-document-root`, `tn-comp-inst`, `tn-comp-pin`, `tn-cell-inst`,
  `tn-child-position-absolute`, `tn-group-sortable-box`, `tn-sortable-pin`, `tn-page-vessel`,
  `tn-group-flow-canvas-for-svg-animation`, `tn-cell-svg-layout`, `ng-scope`, `ng-binding`, and
  `ng-hide`.
- Text was represented through `contenteditable` Xiumi cells with `tn-cell-type`, `tn-link`,
  `tn-animate`, `tn-text`, `ng-class`, and `opera-tn-ra-cell` binding markers.
- Inline style flags included `touch-action`, `user-select`, `position`, `display`, `width`,
  `vertical-align`, `overflow`, `flex-flow`, `justify-content`, `transform`, `background-image`,
  `background-size`, `visibility`, and `pointer-events`.
- The sampled SVG shells used large viewBoxes such as `0 0 1080 1441`, nested 100% sizing shells,
  and a smaller `0 0 539 720` viewBox family. These are geometry inputs only.
- The Title category exposed visible heading-style cards with nested component/cell structures and
  no inline SVG in the sampled first cards. A title-card click while the SVG sequence editor was
  active did not change the center counts, so that observation remains center-unchanged taxonomy
  evidence only.

### 3. InkForge Rule Translation

- Xiumi SVG/H5 effects can combine inline SVG, `foreignObject`, SMIL-like nodes, flow-canvas
  wrappers, editable text cells, runtime bindings, and hosted media references. This is an
  authoring format, not a publishable InkForge source format.
- Do not copy Xiumi `tn-*`, `ng-*`, `opera-*`, `contenteditable`, flow-canvas, component binding,
  hosted media, or preview-card source into runtime modules or exported platform HTML.
- Translate Xiumi-inspired behavior into InkForge-owned contracts:
  deterministic viewBox shells, image-slot manifests, trigger/action manifests, layout reports,
  static-expanded fallback, raster fallback, and market-editor residue blockers.
- The observed `foreignObject` and SMIL-like nodes do not loosen the WeChat-safe subset. They stay
  blocked or fallback-gated unless exact target-platform proof later demonstrates the interaction,
  phone preview, Dark Mode, and final rendering path.
- Keep the existing executable proof boundary: `market-applied-dom-readback` requires central
  editor mutation plus meaningful applied content. Center-unchanged category/title/card/listing
  clicks may update taxonomy only.

### 4. Required Checks

- Evidence must record sanitized structural counts only: category/list counts, central editor
  before/after counts, SVG/`foreignObject`/animation-like counts, wrapper families, and style
  flags.
- Evidence must not include account labels, raw profile locations, raw platform URLs, screenshots,
  authentication secrets, QR payloads, HAR payloads, local capture locations, raw media addresses,
  or copied template source.

## 72. Committed External Blocker Manifests - 2026-06-25

### 1. Scope / Trigger

- Trigger: a real platform check reaches only a login, sign-in, verification, expired-session, or
  other external-account gate after a read-only browser probe.
- The blocker must be recorded as evidence, but it must never be merged into a success proof pack
  or used to upgrade style availability, authenticated editor reachability, PC DOM readback, phone
  preview, sync, scheduled send, public rendering, or publish success.
- `getCommittedStyleProofExternalBlockerManifests()` is the explicit entry point for these
  repo-committed blocker manifests. `getCommittedStyleProofExternalBlockerAuditReport()` runs the
  normal acceptance audit against that blocker-only pack.

### 2. Manifest Contract

- A blocker manifest may carry the same platform and style-choice identity as the intended proof
  target, but every blocked platform row must set `externalAccountLoginBlocked:true` and must not
  set success fields such as `authenticatedSessionVerified:true`,
  `platformEditorTargetVerified:true`, `platformEditorDomVerified:true`,
  `ordinaryClipboardPasteVerified:true`, `phonePreviewContentVerified:true`,
  `externalAccountAuthenticated:true`, `scheduledSendVerified:true`, or
  `coverThumbnailAccepted:true`.
- The blocker pack is intentionally separate from `getCommittedStyleProofEvidenceManifests()`.
  The committed local/PC proof pack must keep its existing snapshot counts unless a separate
  verified success artifact is collected and reviewed.
- The accompanying hygiene artifact may prove only that the committed summary is redacted and safe
  for repository evidence. It does not prove the target platform gate.

### 3. Required Checks

- Regression tests must prove the blocker manifest is invalid, while `no-sensitive-artifact`
  remains satisfied by the hygiene row.
- Regression tests must prove `authenticated-editor-url`, `pc-editor-dom-readback`,
  `exact-artifact`, `safe-disposable-draft`, `pc-editor-paste-event`, `phone-preview-readback`,
  `dark-mode-check`, `cover-thumbnail-check`, `scheduled-send-readback`, and
  `published-url-or-platform-preview` remain unclaimable.
- Regression tests must prove `getCommittedStyleProofEvidenceManifests()` is not expanded by the
  blocker-only API.
- Evidence docs must not include account labels, raw browser state locations, raw platform URLs,
  screenshots, credential material, QR payloads, HAR payloads, or local capture locations.

## 73. 135 Background-Size SVG Shell Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied market-editor HTML/SVG contains a poster-like `section` wrapper with
  `background-size:100.1% 100.1%` and a nearby `svg viewBox="0 0 1080 <height>"` shell.
- This pattern came from applied 135 SVG editor DOM readback. It is useful as a source-owned
  geometry lesson, but it must not be imported into publishable InkForge output as a copied market
  shell.

### 2. Contract

- `detectQuality(..., platform)` must report the pattern as market-editor residue for WeChat,
  Xiaohongshu, and Zhihu, even when `_135editor`, `data-tools`, hosted material URLs, and
  `svg:135` markers are absent.
- WeChat must continue to report the same fragment as a layout-report risk when it also uses
  zero line-height, negative overlap spacing, invisible hit areas, or fixed/free geometry.
- A normal source-owned inline flow block with readable text, ordinary `background-color`, and no
  poster-like SVG shell must not be flagged by this residue rule.

### 3. Required Checks

- Regression tests must assert the residue label `135 SVG background-size shell marker` appears in
  the WeChat, Xiaohongshu, and Zhihu quality reports.
- Regression tests must keep the WeChat layout-report issue for the same fixture.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, or publish success.

## 74. Xiumi Flow-Canvas Animation Wrapper Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML/SVG contains the Xiumi applied-editor
  wrapper class `tn-group-flow-canvas-for-svg-animation`.
- This pattern came from the applied Xiumi SVG/style DOM readback. It is authoring/runtime state
  from the Xiumi flow-canvas animation system, not an InkForge-owned publishable module.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi flow-canvas animation wrapper residue` for
  WeChat, Xiaohongshu, and Zhihu when that wrapper appears in copied publishable output.
- The rule must not rely on broader `tn-cell`, `tn-animate`, `ng-*`, `opera-*`, `contenteditable`,
  hosted-media, or `foreignObject` markers. A reduced fragment that keeps only the wrapper class
  and an otherwise plain inline SVG shell must still fail the market-editor residue gate.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced wrapper-only fixture fails before the rule and passes after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 186. Xiumi Document Selection Shell Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains document selection or
  dock shell markers observed in a live CloakBrowser DOM readback as `multi-comp-select-panel`,
  `tn-fly-away-workaround-ios13`, or `dock-loader`.
- These markers drive Xiumi editor-side multi-component selection, iOS fly-away workaround layout,
  and dock loading behavior. They are not article body DOM and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, schedule, sync, upload, cover thumbnail acceptance, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi document selection shell residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported document
  selection shell markers.
- A reduced fixture containing only `multi-comp-select-panel`, `tn-fly-away-workaround-ios13`,
  and `dock-loader` must fail after paper-root cleanup even when `tn-paper-document-root`,
  `tn-group-usage-normal`, `tn-ground-slot`, `tn-ground-inst`, `tn-cube-inst`,
  `tn-editing-dock`, component authoring tree classes, Angular runtime attributes, hosted media,
  sidebar controls, and operation panels are absent.
- The detector must not block ordinary prose containing selection, shell, dock, loader, iOS, or
  workaround wording by itself; the trigger is the source-specific class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced document-selection-shell fixture fails before implementation
  because no market-editor-residue issue is emitted, then reports
  `Xiumi document selection shell residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi paper document root residue`,
  `Xiumi group ground marker residue`, `Xiumi editing dock residue`, and
  `Xiumi component template binding residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, cover thumbnail
  acceptance, or publish success.

## 187. Xiumi Cover Placeholder Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains cover placeholder or
  cover mask shell markers observed in a live CloakBrowser DOM readback as `cover-imgs`,
  `cover-placeholder`, `cover-mask`, `mask-border`, `play-placeholder`, or
  `second-placeholder`.
- These markers drive Xiumi editor-side cover image slots, overlay masks, placeholder borders,
  and video/play placeholder state. They are not article body DOM and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove cover thumbnail
  acceptance, editor paste, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi cover placeholder residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported cover
  placeholder markers.
- A reduced fixture containing only `cover-imgs`, `cover-placeholder`, `cover-mask`,
  `mask-border`, `play-placeholder`, and `second-placeholder` must fail after cover-menu cleanup
  even when `op-bar-menu`, `cover-menu`, `dropdown-menu`, `op-ce-wx-cover`, `op-ce-video-xm-cover`,
  `svg-cover`, `op-dark-mask`, operation-bar controls, generated-link controls, and platform
  editor chrome are absent.
- The detector must not block ordinary prose containing cover, placeholder, mask, border, play, or
  image wording by itself; the trigger is the source-specific class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced cover-placeholder fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi cover placeholder residue` after the
  detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi WeChat cover control residue`,
  `Xiumi dark mask control residue`, `Xiumi operation bar dropdown residue`, and
  `Xiumi scale panel control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, cover thumbnail
  acceptance, or publish success.

## 188. Xiumi Template Card Hover Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains template card hover or
  feature-match markers observed in a live CloakBrowser DOM readback as `inner-image-box`,
  `lighting-hover`, `comp-feature-matched`, or `large-tpl`.
- These markers drive Xiumi editor-side template card hover chrome and feature-matched template
  list layout. They are not article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This contract is static publishability protection only. It does not prove template rendering,
  editor paste, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi template card hover residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported template card
  hover markers.
- A reduced fixture containing only `inner-image-box`, `lighting-hover`, `comp-feature-matched`,
  and `large-tpl` must fail after visible-card cleanup even when `tn-tpl-*`, `tn-scene-paper`,
  `tn-lighting-box`, `tn-comp-*`, `tn-from-house-*`, template renderer pipeline attributes,
  hosted media, Angular runtime attributes, operation controls, and 135 toolbar markers are absent.
- The detector must not block ordinary prose containing template, hover, feature, card, image, or
  list wording by itself; the trigger is the source-specific class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced template-card-hover fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi template card hover residue` after
  the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component authoring tree residue`,
  `Xiumi template renderer pipeline residue`, `Xiumi template scene marker residue`, and
  `Xiumi source-house authoring residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, cover thumbnail
  acceptance, or publish success.

## 189. Xiumi Layout Form Child Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains layout/form child
  controls observed in a live CloakBrowser DOM readback as `cell-layout-box`, `menuitem-level`,
  `padding-input`, `attr-thin-label`, or `attr-btn`.
- These markers drive Xiumi editor-side layout dropdowns, column/table insertion menus, padding
  inputs, attribute labels, and confirm/reset buttons. They are not article body DOM and must not
  appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi layout form child residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported layout/form
  child markers.
- A reduced fixture containing only `cell-layout-box`, `menuitem-level`, `padding-input`,
  `attr-thin-label`, and `attr-btn` must fail without requiring `layout-box-panel`,
  `form-input-panel`, `op-ce-form-input`, `trigger-props-panel`, `trigger-radio-input`,
  `op-bar-menu`, `op-dock`, generated-link controls, operation loader chrome, hosted media,
  Angular runtime attributes, sidebar controls, or meta panels.
- The detector must not block ordinary prose containing layout, form, padding, menu, attribute,
  layer, button, confirm, reset, or option wording by itself; the trigger is the source-specific
  Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced layout-form-child fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi layout form child residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi layout form panel residue`,
  `Xiumi operation bar dropdown residue`, `Xiumi generated link control residue`, and
  `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 190. Xiumi Text Editing Flyout Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains text editing flyout
  child controls observed in a live CloakBrowser DOM readback as `in-text-cell-editing-op`,
  `cp-op-quick-input-prompt`, `op-text-img-resizing-surface`, `text-bgd-shadow`, or
  `toggle-color-btn`.
- These markers drive Xiumi editor-side in-text floating toolbars, quick-input prompts,
  text-image resizing surfaces, and text color/background/shadow toggles. They are not article body
  DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi text editing flyout residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported text flyout
  child markers.
- A reduced fixture containing only `in-text-cell-editing-op`, `cp-op-quick-input-prompt`,
  `op-text-img-resizing-surface`, `text-bgd-shadow`, and `toggle-color-btn` must fail without
  requiring `op-text-sec`, `font-size`, `font-family`, `text-style`, `font-family-menu`,
  `op-bar-menu`, `op-worker-surface`, operation loader chrome, hosted media, Angular runtime
  attributes, sidebar controls, or meta panels.
- The detector must not block ordinary prose containing text, color, background, shadow, quick
  input, resize, toolbar, font, style, button, or prompt wording by itself; the trigger is the
  source-specific Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced text-editing-flyout fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi text editing flyout residue` after
  the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi text toolbar control residue`,
  `Xiumi font and format control residue`, `Xiumi operation bar dropdown residue`, and
  `Xiumi worker surface crop control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 191. Xiumi Panel Header Control Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains panel-header control
  children observed in a live CloakBrowser DOM readback as `panel-handler`, `panel-placeholder`,
  `panel-close` when paired with `glyphicon`, `hammer-handler`, or `comment-panel-header`.
- These markers drive Xiumi editor-side draggable panel handles, panel placeholder icons, close
  buttons, color-palette drag headers, and comment-panel headers. They are not article body DOM and
  must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi panel header control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `panel-handler`,
  `panel-placeholder`, `hammer-handler`, `comment-panel-header`, or the `glyphicon` +
  `panel-close` class combination.
- A reduced fixture containing only these panel-header child markers must fail without requiring
  `op-cp-paper-comps-assistant`, `tn-paper-aux-comps-tree-assistant`, `tn-comment-panel`,
  `tn-color-palette-panel`, `op-bar-menu`, color-selector controls, operation loader chrome,
  hosted media, Angular runtime attributes, sidebar controls, or meta panels.
- The detector must not block ordinary prose containing panel, header, close, comment, color,
  placeholder, handler, drag, menu, or toolbar wording by itself; the trigger is the
  source-specific class/id marker or the source-specific `glyphicon` + `panel-close` class
  combination.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced panel-header-control fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi panel header control residue` after
  the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi comment toolbar panel residue`,
  `Xiumi paper auxiliary component tree residue`, `Xiumi operation bar dropdown residue`, and
  `Xiumi color selector control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 192. Xiumi Brush Panel Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the text-format brush
  panel child observed in a live CloakBrowser DOM readback as `brush-panel`.
- The marker drives Xiumi editor-side format-list, drag-to-pin, and extracted-format affordances.
  It is not article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable
  output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi brush panel residue` for WeChat, Xiaohongshu,
  and Zhihu when a class or id attribute contains `brush-panel`.
- A reduced fixture containing only `brush-panel` plus inert child image context must fail without
  requiring `text-format-brush`, `op-text-sec`, `in-text-cell-editing-op`, `op-bar-menu`,
  font-format controls, operation loader chrome, hosted media, Angular runtime attributes, sidebar
  controls, or meta panels.
- The detector must not block ordinary prose containing brush, format, list, drag, pin, style, or
  toolbar wording by itself; the trigger is the source-specific `brush-panel` class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced brush-panel fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi brush panel residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi text editing flyout residue`,
  `Xiumi text toolbar control residue`, `Xiumi font and format control residue`, and
  `Xiumi operation bar dropdown residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 207. Xiumi Audio Panel Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side music/video
  or background-audio panel markers observed in a live CloakBrowser DOM readback, such as
  `audios`, `audio-panel`, `audio-src`, `audio-status`, `audio-edit`, `audio-del`, or
  `audio-group`.
- These live nodes belong to the Xiumi audio/video library and page background music controls.
  They are not article body DOM, platform-safe media embeds, or target-platform upload manifests
  and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile media playback, mobile SMIL/click interaction, Dark Mode, cover thumbnail
  acceptance, schedule, sync, upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi audio panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `audios`, `audio-panel`,
  `audio-src`, `audio-status`, `audio-edit`, `audio-del`, or `audio-group`.
- A reduced fixture containing only those audio-panel markers must fail with the exact label even
  when hidden media upload inputs, generated-link controls, account/sync panels, color controls,
  Angular runtime classes, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose or article markup containing audio, music, video,
  panel, source, edit, delete, status, background, or library wording by itself. It must not block
  ordinary `<audio>` elements without one of the Xiumi class/id markers.
- The exact rule must stay distinct from `Xiumi media upload input residue`,
  `Xiumi generated link control residue`, and `Xiumi account sync panel residue` so the media
  library/panel chrome remains attributable to the learned authoring surface.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced audio-panel fixture initially emits no market-editor-residue issue,
  then reports `Xiumi audio panel residue` after the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi media upload input residue`,
  `Xiumi generated link control residue`, and `Xiumi account sync panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile media playback, mobile SMIL/click interaction, credentialed
  sync, public rendering, upload, cover thumbnail acceptance, scheduled send, or publish success.

## 206. Xiumi Theme Color Widget Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side theme color
  widget nodes observed in a live CloakBrowser DOM readback, such as `color-widget`,
  `op-color-text`, `tn-color-palette-dock`, or `tn-color-picker-mask`.
- These live nodes belong to the left-side template/style surface for theme color selection and
  palette docking. They are not article body DOM, platform-safe color semantics, or exported color
  values and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi theme color widget residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `color-widget`, `op-color-text`,
  `tn-color-palette-dock`, or `tn-color-picker-mask`.
- A reduced fixture containing only those theme-color widget markers must fail with the exact label
  even when `tn-color-palette-panel`, `tn-color-palette-panel-mask`, `tnColorPaletteInst`,
  `tnColorPaletteMask`, `tnColorPickerTrigger`, `tnGradientColorPickerTrigger`, color-selector
  controls, operation-bar controls, Angular runtime classes, hosted media, sidebar controls, and
  meta panels are absent.
- The detector must not block ordinary prose or article markup containing theme, color, widget,
  palette, dock, mask, picker, or clear wording by itself.
- The exact rule must stay distinct from `Xiumi color palette panel residue`,
  `Xiumi color picker trigger residue`, and `Xiumi color selector control residue` so the
  left-side theme-color widget remains attributable to the learned authoring surface.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced theme-color widget fixture initially emits no
  market-editor-residue issue, then reports `Xiumi theme color widget residue` after the detector
  update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi color palette panel residue`,
  `Xiumi color picker trigger residue`, and `Xiumi color selector control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 205. Xiumi Color Picker Trigger Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side hidden color
  picker trigger nodes observed in a live CloakBrowser DOM readback, such as
  `tnColorPickerTrigger` or `tnGradientColorPickerTrigger`.
- These live nodes are Xiumi authoring triggers mounted under the editor body for plain and
  gradient color picker popup activation. They are not article body DOM, style semantics, or
  platform-safe color values and must not appear in WeChat, Xiaohongshu, or Zhihu publishable
  output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi color picker trigger residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `tnColorPickerTrigger` or
  `tnGradientColorPickerTrigger`.
- A reduced fixture containing only those trigger ids must fail with the exact label even when
  `tn-color-palette-panel`, `tn-color-palette-panel-mask`, `tnColorPaletteInst`,
  `tnColorPaletteMask`, color-selector controls, operation-bar dropdown controls, panel-header
  controls, Angular runtime classes, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose or article markup containing color, picker, trigger,
  gradient, palette, popup, hidden, or theme wording by itself.
- The exact rule must stay distinct from `Xiumi color palette panel residue` and
  `Xiumi color selector control residue` so hidden body-level triggers remain attributable to the
  learned authoring surface.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced color-picker-trigger fixture initially emits no
  market-editor-residue issue, then reports `Xiumi color picker trigger residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi color palette panel residue` and
  `Xiumi color selector control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 204. Xiumi Media Upload Input Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side hidden media
  upload inputs observed in a live CloakBrowser DOM readback, such as `audioFileUploadInput`,
  `videoFileUploadInput`, `tn-audio-uploader`, or `tn-video-uploader`.
- These live nodes are Xiumi authoring surfaces for selecting audio and video files through hidden
  `type=file` controls. They are not article body DOM, article media embeds, or platform-safe
  upload manifests and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi media upload input residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported hidden media
  upload markers.
- A reduced fixture containing only those media-upload input markers must fail with the exact label
  even when generated-link controls, account/sync panels, color-palette controls, Angular runtime
  attributes, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose or article markup containing audio, video, upload,
  file, input, media, mp3, m4a, mp4, or mov wording by itself.
- The exact rule must stay distinct from `Xiumi generated link control residue` and
  `Xiumi account sync panel residue` so hidden upload controls remain attributable to the learned
  authoring surface.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced hidden media upload fixture initially emits no
  market-editor-residue issue, then reports `Xiumi media upload input residue` after the detector
  update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi generated link control residue` and
  `Xiumi account sync panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 203. Xiumi Color Palette Panel Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side color
  palette floating panel surfaces observed in a live CloakBrowser DOM readback, such as
  `tn-color-palette-panel`, `tn-color-palette-panel-mask`, `tnColorPaletteInst`, or
  `tnColorPaletteMask`.
- These live nodes are Xiumi authoring surfaces for palette storage, palette masking, and color
  picker popup management. They are not article body DOM, style semantics, or platform-safe
  color values and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi color palette panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported color-palette
  panel or mask markers.
- A reduced fixture containing only those color-palette panel markers must fail with the exact
  label even when `color-selector-dropdown`, `op-theme-color-sec`, `text-color-btn`,
  `tn-color-circle`, `tn-color-selector`, operation-bar dropdown controls, panel-header child
  controls, Angular runtime attributes, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose or article markup containing color, palette, panel,
  mask, picker, storage, popup, or theme wording by itself.
- The exact rule must run before `Xiumi color selector control residue` so palette popup residue
  stays distinguishable from normal text color selector controls.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced color-palette fixture initially emits no market-editor-residue
  issue, then reports `Xiumi color palette panel residue` after the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi color selector control residue`,
  `Xiumi operation bar dropdown residue`, and `Xiumi panel header control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 202. Xiumi Component Drag Receiver Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side component
  drag/drop receiver surfaces observed in a live CloakBrowser DOM readback, such as
  `tn-comp-dragging-receiver`, `tn-comp-container-dragging-cancel`,
  `tn-comp-container-dragging-remove`, `tn-comp-moving-canceler`, or `tn-comp-trash-receiver`.
- The live nodes are Xiumi authoring surfaces for drag cancellation, drop-to-remove, and component
  movement. They are not article body DOM, style semantics, or platform-safe SVG/H5 content and
  must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component drag receiver residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the component drag receiver,
  cancel, remove, moving-cancel, or trash receiver markers.
- A reduced fixture containing only those component drag receiver markers must fail with the exact
  label even when `tn-atom-dragging-source`, `tn-atom-dropping-sink`, `on-atom-drop`,
  `tn-header`, `x3-navbar`, `x3-nav-*`, operation buttons, editor prompt banners, UI Bootstrap
  directives, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose or article markup containing component, drag, drop,
  receiver, cancel, remove, move, trash, or surface wording by itself.
- The exact rule must run before the broad `Xiumi component authoring tree residue` and
  `Xiumi tn-* attribute` fallbacks so diagnostics stay attributable to the learned authoring
  surface.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced component-drag fixture initially reports only the broader
  `Xiumi component authoring tree residue` / `Xiumi tn-* attribute` fallbacks, then reports
  `Xiumi component drag receiver residue` after the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi component authoring tree residue`,
  `Xiumi atom drag-drop residue`, and `Xiumi header shell residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 201. Xiumi Header Shell Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the editor-side header
  wrapper observed in a live CloakBrowser DOM readback as `tn-header`.
- The live node is Xiumi top-level editor chrome around the page navigation surface. It is not
  article body DOM, style semantics, or platform-safe SVG/H5 content and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi header shell residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `tn-header`.
- A reduced fixture containing only `tn-header` must fail with the exact header-shell label even
  when `x3-navbar`, `x3-nav-*`, `x3-nav-op-buttons`, `tn-op-btn-group`, operation buttons, editor
  prompt banners, Angular runtime classes, UI Bootstrap directives, hosted media, sidebar controls,
  and meta panels are absent.
- The detector must not block ordinary prose or article markup containing header, navigation,
  transition, brand, path, login, or menu wording by itself. Generic `header` elements and
  `navbar-static-top` classes are not sufficient triggers without the source-specific `tn-header`
  marker.
- The exact rule must run before the broad `Xiumi tn-* attribute` fallback so diagnostics stay
  attributable to the learned source-specific shell.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced header-shell fixture initially reports only the generic
  `Xiumi tn-* attribute` fallback, then reports `Xiumi header shell residue` after the detector
  update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi navigation shell residue`,
  `Xiumi top operation button residue`, and `Angular authoring class` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 200. Xiumi Navigation Shell Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the editor-side top
  navigation shell observed in a live CloakBrowser DOM readback, such as `x3-navbar`,
  `x3-nav-brand`, `x3-nav-path`, or `x3-nav-misc`.
- The live nodes are Xiumi page chrome around brand/path/login navigation. They are not article
  body DOM, style semantics, or platform-safe SVG/H5 content and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi navigation shell residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `x3-navbar`, `x3-nav-brand`,
  `x3-nav-path`, or `x3-nav-misc`.
- A reduced fixture containing only those navigation shell markers must fail without requiring
  `x3-nav-op-buttons`, `tn-op-btn-group`, `op-btn`, `op-more`, editor prompt banners, Angular
  runtime classes, UI Bootstrap directives, hosted media, sidebar controls, or meta panels.
- The detector must not block ordinary prose or article markup containing nav, navbar, path,
  brand, login, breadcrumb, menu, or Xiumi wording by itself. Generic `navbar` and `breadcrumb`
  classes are not sufficient triggers without the source-specific `x3-*` markers.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced navigation-shell fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi navigation shell residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi top operation button residue`,
  `Xiumi editor prompt banner residue`, and `Angular authoring class` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 199. Xiumi Editor Prompt Banner Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side prompt
  banners observed in a live CloakBrowser DOM readback, such as `tn-compatible-prompt` and
  `tn-operate-prompt`.
- The live nodes are Xiumi browser-compatibility and copy/plugin operation prompts. They are not
  article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi editor prompt banner residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `tn-compatible-prompt` or
  `tn-operate-prompt`.
- A reduced fixture containing only those prompt banner markers must fail without requiring
  `tn-working-pallet`, `tn-studio-paper`, `tn-editing-desk`, Angular runtime classes, top operation
  buttons, user profile menus, operation-bar dropdowns, hosted media, sidebar controls, or meta
  panels.
- The detector must not block ordinary prose containing browser, compatibility, copy, plugin,
  operation, prompt, close, sync, or paste wording by itself; the triggers are the source-specific
  prompt banner class/id markers.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced prompt-banner fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi editor prompt banner residue` after
  the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi editing dock residue`,
  `Xiumi top operation button residue`, and `Angular authoring class` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 198. Xiumi User Profile Menu Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the editor-side user
  profile dropdown observed in a live CloakBrowser DOM readback as `usr-info-desc-frame`.
- The live node is Xiumi account profile menu chrome around account settings, invoices, and
  sign-out commands. It is not article body DOM and must not appear in WeChat, Xiaohongshu, or
  Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi user profile menu residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `usr-info-desc-frame`.
- A reduced fixture containing only `usr-info-desc-frame` plus generic dropdown context must fail
  without requiring `wx-user-panel`, `usr-message-box`, `message-box-toggle`,
  top operation buttons, dropdown directives, operation-bar dropdowns, Angular runtime attributes,
  hosted media, sidebar controls, or meta panels.
- The detector must not block ordinary prose containing account, profile, settings, invoice,
  sign out, user, dropdown, or panel wording by itself; the trigger is the source-specific
  `usr-info-desc-frame` class/id marker. Generic child markers such as `sign-out`, `nickname`, and
  `glyphicon` are observed context only and must not become standalone triggers.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced user-profile-menu fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi user profile menu residue` after
  the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi account sync panel residue`,
  `Xiumi message panel residue`, and `Xiumi top operation button residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 197. Xiumi Message Panel Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side message
  notification dropdown controls observed in a live CloakBrowser DOM readback, such as
  `usr-message-box`, `message-box-toggle`, `turn-to-message-setting`, and
  `turn-to-message-list`.
- The live node is Xiumi account/site-message chrome for viewing message count, message settings,
  and all-message lists. It is not article body DOM and must not appear in WeChat, Xiaohongshu, or
  Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi message panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `usr-message-box`,
  `message-box-toggle`, `turn-to-message-setting`, or `turn-to-message-list`.
- A reduced fixture containing only those message-panel markers plus generic dropdown context must
  fail without requiring `wx-user-panel`, `usr-info`, top operation buttons, dropdown directives,
  operation-bar dropdowns, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels.
- The detector must not block ordinary prose containing message, notification, setting, list,
  account, dropdown, or panel wording by itself; the triggers are the source-specific Xiumi
  message-panel class/id markers.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced message-panel fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi message panel residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi account sync panel residue`,
  `Xiumi dropdown directive residue`, and `Xiumi top operation button residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 196. Xiumi Statistics Panel Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the editor-side
  statistics dropdown panel observed in a live CloakBrowser DOM readback as
  `statistics-tool-panel`.
- The live node is a Xiumi page statistics panel for text count, reading time, links, images, and
  library usage. It is not article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi statistics panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `statistics-tool-panel`.
- A reduced fixture containing only `statistics-tool-panel` plus generic dropdown context must
  fail without requiring `content-statistics`, `tn-page-toolbar`, right-toolbar controls,
  account/sync panels, dropdown directives, operation-bar dropdowns, Angular runtime attributes,
  hosted media, sidebar controls, or meta panels.
- The detector must not block ordinary prose containing statistics, count, reading time, link,
  image, library, panel, or dropdown wording by itself; the trigger is the source-specific
  `statistics-tool-panel` class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced statistics-panel fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi statistics panel residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi right toolbar control residue`,
  `Xiumi page toolbar residue`, and `Xiumi account sync panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 195. Xiumi Account Sync Panel Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the editor-side
  authorized account/sync dropdown panel observed in a live CloakBrowser DOM readback as
  `wx-user-panel`.
- The live node is a Xiumi account, authorization, material sync, comment-permission, and preview
  option panel. It is not article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This contract is static publishability protection only. It does not prove editor paste,
  credentialed sync success, phone preview, mobile SMIL/click interaction, Dark Mode, cover
  thumbnail acceptance, schedule, upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi account sync panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `wx-user-panel`.
- A reduced fixture containing only `wx-user-panel` plus generic dropdown context must fail
  without requiring `usr-info`, `user-info-toggle`, dropdown directives, generated-link controls,
  operation-bar dropdowns, account names, platform credentials, Angular runtime attributes, hosted
  media, sidebar controls, or meta panels.
- The detector must not block ordinary prose containing account, authorization, sync, public
  account, comment, preview, user, panel, or dropdown wording by itself; the trigger is the
  source-specific `wx-user-panel` class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced account-sync-panel fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi account sync panel residue` after
  the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi dropdown directive residue`,
  `Xiumi generated link control residue`, and `Xiumi menu pin control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 194. Xiumi Menu Pin Control Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side menu pin
  controls observed in a live CloakBrowser DOM readback as `op-cp-menu-pin` and
  `op-cp-menu-pin-tb`.
- The live nodes are empty operation-menu pin containers under Xiumi's operation loader. They
  drive editor-side floating/pinned operation menu affordances; they are not article body DOM and
  must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi menu pin control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `op-cp-menu-pin` or
  `op-cp-menu-pin-tb`.
- A reduced fixture containing only those pin classes must fail without requiring `op-loader`,
  `op-dock`, operator depot items, attribute context-menu host nodes, attribute-board controls,
  operation-bar dropdowns, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels.
- The detector must not block ordinary prose containing menu, pin, fixed, floating, toolbar, or
  operation wording by itself; the trigger is the source-specific `op-cp-menu-pin*` class/id
  marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced menu-pin fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi menu pin control residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi operation panel loader residue`,
  `Xiumi operator dock control residue`, and `Xiumi attribute context menu host residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 193. Xiumi Attribute Context Menu Host Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editor-side attribute
  context menu host nodes observed in a live CloakBrowser DOM readback as
  `attr-bar-context-menu-host-for-comp-insert`, `attr-bar-context-menu-host-for-comp-modify`, and
  `attr-bar-context-menu-host-for-cell`.
- The live nodes are empty context-menu mount points under Xiumi's attribute-bar host. They drive
  editor-side component insert, component modify, and cell context menus; they are not article
  body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove editor paste, phone
  preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance, schedule, sync,
  upload, public rendering, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi attribute context menu host residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id attribute contains the supported
  `attr-bar-context-menu-host-for-*` variants.
- A reduced fixture containing only those host classes must fail without requiring
  `op-gl-dc-attr-bars`, `op-dc-depot`, `op-dc-hidden`, `cp-role-*`, `ce-type-*`,
  `tn-attribute-board-entry`, `tn-attr-assemble-tabs`, `op-attr-*`, operation-bar dropdowns,
  operator dock controls, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels.
- The detector must not block ordinary prose containing attribute, context, menu, host, component,
  insert, modify, or cell wording by itself; the trigger is the source-specific
  `attr-bar-context-menu-host-for-*` class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced attribute-context-host fixture fails before implementation because
  no market-editor-residue issue is emitted, then reports
  `Xiumi attribute context menu host residue` after the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi operator depot item residue`,
  `Xiumi attribute board control residue`, and `Xiumi operation bar dropdown residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, scheduled send, or publish success.

## 169. Xiumi Operation Bar Input/Separator Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains operation-bar input or
  separator controls observed in a live CloakBrowser DOM readback as `op-bar-input` or
  `op-bar-separator`.
- These markers drive Xiumi editor-side width/height, x/y position, text-decoration, static-size,
  margin, padding, line-height, and operation-panel separator controls. They are not article body
  DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove layout correctness,
  paste, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi operation bar input/separator residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id attribute contains `op-bar-input` or
  `op-bar-separator`.
- A reduced fixture containing only those source-specific operation-bar input/separator markers
  must fail after menu-input cleanup even when operation-bar dropdown controls, menu input/icon
  controls, scale controls, WeChat cover controls, generated-link controls, attribute-board
  controls, operator dock/depot controls, paper auxiliary tree controls, selection overlays,
  worker/crop controls, Angular runtime attributes, hosted media, sidebar controls, and meta
  panels are absent.
- The detector must not block ordinary `input`, `hr`, separator wording, margin/width/height
  wording, readable numeric values, or generic form classes by themselves; the trigger is the
  source-specific Xiumi class/id marker.
- `op-bar-menu-item` remains outside this rule because it overlaps the existing
  `Xiumi operation bar dropdown residue` boundary through `op-bar-menu`.

### 3. Required Checks

- Use TDD to prove the reduced input/separator fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports
  `Xiumi operation bar input/separator residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi menu input/icon control residue` and
  `Xiumi operation bar dropdown residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 170. Xiumi Box Metrics Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains box-metrics controls
  observed in a live CloakBrowser DOM readback as `op-ce-box-metrics`.
- The live box-metrics panel drives editor-side margin, padding, line-height, border style, border
  width, border radius, and related extraction controls. These controls can inform InkForge-owned
  layout-report and parameter-schema decisions, but they are not article body DOM and must not
  appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove layout correctness,
  paste, phone preview, schedule, sync, upload, cover thumbnail acceptance, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi box metrics control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `op-ce-box-metrics`.
- A reduced fixture containing only the source-specific `op-ce-box-metrics` marker must fail after
  operation-bar input/separator cleanup even when operation-bar dropdown controls, menu input/icon
  controls, scale controls, WeChat cover controls, generated-link controls, attribute-board
  controls, operator dock/depot controls, paper auxiliary tree controls, selection overlays,
  worker/crop controls, Angular runtime attributes, hosted media, sidebar controls, and meta
  panels are absent.
- The detector must not block ordinary box, metrics, margin, padding, line-height, border, radius,
  extraction, Xiumi, editor, or template wording by itself; the trigger is the source-specific
  Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced box-metrics fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi box metrics control residue` after
  the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operation bar input/separator residue`,
  `Xiumi operator dock control residue`, and `Xiumi color selector control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, cover thumbnail
  acceptance, or publish success.

## 168. Xiumi Menu Input/Icon Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains menu input or icon
  controls observed in a live CloakBrowser DOM readback as `op-menu-input`, `op-menu-icon`, or
  `op-bar-item-icon`.
- These markers drive Xiumi editor-side font size, line spacing, letter spacing, padding, layout
  menu, style-brush, and table-control surfaces. They are not article body DOM and must not appear
  in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove layout correctness,
  paste, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi menu input/icon control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `op-menu-input`, `op-menu-icon`, or
  `op-bar-item-icon`.
- A reduced fixture containing only those source-specific menu input/icon markers must fail after
  scale-panel cleanup even when operation-bar dropdown controls, scale controls, WeChat cover
  controls, generated-link controls, attribute-board controls, operator dock/depot controls,
  paper auxiliary tree controls, selection overlays, worker/crop controls, Angular runtime
  attributes, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary `input`, `img`, `button`, `dropdown`, menu wording, icon
  wording, or readable shortcut text by itself; the trigger is the source-specific Xiumi
  class/id marker.
- Xiumi `op-bar-item-icon` must not be misreported as `135 SVG editor toolbar residue`. The 135
  `bar-item` toolbar rule must stay anchored to exact class words so Xiumi `op-*` operation icons
  keep their proper source label.

### 3. Required Checks

- Use TDD to prove the reduced menu-input/icon fixture fails before implementation because the
  residue is not reported with the Xiumi label, then reports
  `Xiumi menu input/icon control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi scale panel control residue`,
  `Xiumi operation bar dropdown residue`, and `135 SVG editor toolbar residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 167. Xiumi Scale Panel Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the scale/size control
  observed in a live CloakBrowser DOM readback as `op-ce-scale`.
- The marker drives Xiumi editor-side scale, width, and height controls. It is not article body
  DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove layout correctness,
  paste, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi scale panel control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `op-ce-scale`.
- A reduced fixture containing only `op-ce-scale` must fail after WeChat-cover cleanup even when
  WeChat cover controls, generated-link controls, attribute-board controls, operator dock/depot
  controls, paper auxiliary tree controls, selection overlays, worker/crop controls, toolbar
  controls, Angular runtime attributes, hosted media, sidebar controls, and meta panels are
  absent.
- The detector must not block ordinary prose containing scale, width, height, Xiumi, editor, or
  template wording by itself; the trigger is the source-specific Xiumi class/id marker.

### 3. Required Checks

- Use TDD to prove the reduced scale-panel-only fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi scale panel control residue` after
  the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi WeChat cover control residue` and
  `Xiumi generated link control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 166. Xiumi WeChat Cover Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the WeChat cover
  selection control observed in a live CloakBrowser DOM readback as `op-ce-wx-cover`.
- The marker drives Xiumi editor-side cover selection with text such as "choose a cover from the
  left gallery". It is not article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This contract is static publishability protection only. It does not prove WeChat cover
  thumbnail acceptance, paste, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi WeChat cover control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `op-ce-wx-cover`.
- A reduced fixture containing only `op-ce-wx-cover` plus an inert `op-dark-mask` child must fail
  after generated-link cleanup even when generated-link controls, attribute-board controls,
  operator dock/depot controls, paper auxiliary tree controls, selection overlays, worker/crop
  controls, toolbar controls, Angular runtime attributes, hosted media, sidebar controls, and
  meta panels are absent.
- The detector must not block ordinary prose containing WeChat, cover, gallery, Xiumi, editor, or
  template wording by itself; the trigger is the source-specific Xiumi class/id marker.

### 3. Required Checks

- Use TDD to prove the reduced WeChat-cover-only fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi WeChat cover control residue`
  after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi generated link control residue` and
  `Xiumi attribute board control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat cover thumbnail acceptance, paste, phone preview, credentialed sync, public rendering,
  upload, or publish success.

## 165. Xiumi Generated Link Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains generated-link
  controls observed in a live CloakBrowser DOM readback, including `op-gen-link`,
  `op-cp-background-audio`, and `op-cp-wx-miniprogram-link`.
- These markers drive Xiumi editor-side background music and WeChat mini-program link settings.
  They are not article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable
  output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi generated link control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `op-gen-link`,
  `op-cp-background-audio`, or `op-cp-wx-miniprogram-link`.
- A reduced fixture containing only `op-gen-link` must fail after attribute-board cleanup even
  when attribute-board controls, operator dock/depot controls, paper auxiliary tree controls,
  selection overlays, worker/crop controls, toolbar controls, Angular runtime attributes, hosted
  media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose containing generated, link, background music,
  mini-program, Xiumi, editor, or template wording by itself; the trigger is the source-specific
  Xiumi class/id marker.

### 3. Required Checks

- Use TDD to prove the reduced generated-link-only fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi generated link control residue`
  after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi attribute board control residue`,
  `Xiumi operator dock control residue`, and `Xiumi operator depot item residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 164. Xiumi Attribute Board Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains attribute-board
  markers observed in a live CloakBrowser DOM readback, including `tn-attribute-board-entry`,
  `tn-attr-assemble-tabs`, `op-attr-assemble-*`, and `op-attr-view-attr-assemble-*`.
- These markers drive Xiumi editor-side property controls for margin, border, shadow, formatting,
  text decoration, action/link settings, and related component attributes. They are not article
  body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi attribute board control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `tn-attribute-board-entry`,
  `tn-attr-assemble-tabs`, `op-attr-assemble-*`, or `op-attr-view-attr-assemble-*`.
- A reduced fixture containing only `tn-attribute-board-entry` and `tn-attr-assemble-tabs` must
  fail after operator-depot cleanup even when operator dock/depot classes, `dc-*` depot markers,
  selection overlays, worker/crop controls, paper auxiliary tree controls, toolbar controls,
  Angular runtime attributes, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose containing attribute, board, margin, border, shadow,
  action, link, Xiumi, editor, or template wording by itself; the trigger is the source-specific
  Xiumi class/id marker.

### 3. Required Checks

- Use TDD to prove the reduced attribute-board-only fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi attribute board control residue`
  after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operator dock control residue`,
  `Xiumi operator depot item residue`, `Xiumi selection overlay control residue`, and generic
  `dc-*` depot handling independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 163. Xiumi Page Toolbar Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the page-toolbar
  marker observed in a live CloakBrowser DOM readback, including `tn-page-toolbar` on the
  `tn-menu tn-page-toolbar booklet` toolbar.
- The toolbar surfaces editor-side page statistics and controls such as read time, link count,
  image count, and gallery usage. It is not article body DOM and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- Co-observed generic markers such as `tn-menu`, `booklet`, and `stop-propagation` are not
  standalone triggers for this rule.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi page toolbar residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-page-toolbar` appears in a class or id attribute.
- A reduced fixture containing only `tn-page-toolbar` must fail after comment-toolbar cleanup even
  when right-toolbar controls, comment toolbar/panel controls, paper auxiliary tree controls,
  sidebar/tab controls, Angular runtime attributes, hosted media, operator controls, selection
  overlays, meta panels, and broader page authoring-tree controls are absent.
- The broader `Xiumi page authoring tree residue` rule must exclude `tn-page-toolbar` so page
  toolbar residue receives a precise diagnostic instead of being reported as a generic page
  authoring tree.
- The detector must not block ordinary prose containing page, toolbar, menu, booklet, statistics,
  Xiumi, editor, or template wording by itself; the trigger is the source-specific Xiumi class/id
  marker.

### 3. Required Checks

- Use TDD to prove the reduced page-toolbar-only fixture does not receive the precise
  `Xiumi page toolbar residue` label before implementation and reports that label after the
  detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi comment toolbar panel residue`,
  `Xiumi right toolbar control residue`, `Xiumi paper auxiliary component tree residue`,
  `Xiumi sidebar tab control residue`, and `Xiumi page authoring tree residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 162. Xiumi Comment Toolbar Panel Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains comment toolbar or
  comment panel markers observed in a live CloakBrowser DOM readback, including
  `page-comment-on-toolbar`, `tn-comment-panel`, and `tn-comment-list`.
- These markers drive Xiumi editor-side page comment entry and comment panel state. They are not
  article comments or publishable article DOM and must not appear in WeChat, Xiaohongshu, or
  Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi comment toolbar panel residue` for WeChat,
  Xiaohongshu, and Zhihu when `page-comment-on-toolbar`, `tn-comment-panel`, or
  `tn-comment-list` appears in a class or id attribute.
- A reduced fixture containing only `page-comment-on-toolbar` must fail even when right-toolbar
  controls, paper auxiliary tree controls, sidebar/tab controls, Angular runtime attributes,
  broader `tn-*` classes, hosted media, operator controls, selection overlays, and meta panels are
  absent.
- The detector must not block ordinary prose containing comment, toolbar, panel, page, Xiumi,
  editor, or template wording by itself; the trigger is the source-specific Xiumi class/id marker.
- Generic comment-panel child classes such as `comment-panel-header`, `comment-panel-content`,
  `comment-panel-footer`, `comment-page-list`, `rights`, or `link` are not standalone triggers.

### 3. Required Checks

- Use TDD to prove the reduced comment-toolbar-only fixture fails before implementation and
  reports `Xiumi comment toolbar panel residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi right toolbar control residue`,
  `Xiumi paper auxiliary component tree residue`, `Xiumi sidebar tab control residue`, and generic
  `Xiumi tn-* attribute` handling independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 161. Xiumi Editing Dock Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains editing-dock
  authoring markers observed in a live CloakBrowser DOM readback, including `tn-editing-dock`,
  `tn-editing-show-data`, and `tn-editing-cube-index`.
- These markers appeared on the Xiumi center paper editing surface and bind editor-side dock,
  selected data, and cube index state. They are not article DOM and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi editing dock residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-editing-dock` appears as a class/id marker or when
  `tn-editing-dock`, `tn-editing-show-data`, or `tn-editing-cube-index` appears as an editor
  attribute name.
- A reduced fixture containing only the `tn-editing-dock` class must fail even when atom drag/drop
  markers, component authoring tree classes, broader page/container markers, Angular runtime
  attributes, hosted media, operator controls, selection overlays, sidebar controls, and meta
  panels are absent.
- The detector must not block ordinary prose containing editing, dock, cube, index, show, data,
  Xiumi, editor, or template wording by itself; the trigger is the source-specific Xiumi class/id
  or attribute marker.

### 3. Required Checks

- Use TDD to prove the reduced editing-dock-only fixture fails before implementation and reports
  `Xiumi editing dock residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi atom drag-drop residue`,
  `Xiumi component authoring tree residue`, `Xiumi auxiliary binding metadata residue`, and
  generic `Xiumi tn-* attribute` handling independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 160. Xiumi Atom Drag-Drop Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains atom drag/drop editor
  state markers observed in a live CloakBrowser DOM readback, including
  `tn-atom-dragging-source`, `tn-atom-dropping-sink`, and `on-atom-drop`.
- These markers appeared on page/editor drag source and drop receiver nodes. They are Xiumi
  authoring interaction state, not article DOM, and must not appear in WeChat, Xiaohongshu, or
  Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi atom drag-drop residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-atom-dragging-source`, `tn-atom-dropping-sink`, or
  `on-atom-drop` appears as a class/id or editor attribute.
- A reduced fixture containing only `tn-atom-dragging-source` and `tn-atom-dropping-sink`
  classes must report the precise atom drag/drop label instead of the generic
  `Xiumi tn-* attribute` label.
- The detector must not block ordinary prose containing atom, drag, drop, source, sink, Xiumi,
  editor, or template wording by itself; the trigger is the source-specific Xiumi class/id or
  attribute marker.

### 3. Required Checks

- Use TDD to prove the reduced atom-drag/drop fixture reports only the generic `Xiumi tn-*`
  label before implementation and reports `Xiumi atom drag-drop residue` after the detector
  update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi atom context binding metadata residue`,
  `Xiumi auxiliary binding metadata residue`, and generic `Xiumi tn-* attribute` handling
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 159. Xiumi Editing Frozen-Toggle Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the page editing
  switch class `tn-editing-cell-frozen-toggle-enabled` observed in a live CloakBrowser DOM
  readback after opening the Xiumi paper editor.
- The live node also carried `tn-page-container`, `tn-scrolled-page`, `ng-*`, `tn-atom-*`, and
  page-mode classes, but the frozen-toggle marker must be guarded on its own because cleanup can
  remove broader page/container authoring markers while leaving the editor-side switch state.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi editing frozen-toggle residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-editing-cell-frozen-toggle-enabled` appears in a class or id
  attribute.
- A reduced fixture containing only `tn-editing-cell-frozen-toggle-enabled` must fail even when
  `tn-page-container`, `tn-page-*`, `tn-scrolled-page`, `tn-on-*`, `tn-in-cell-*`, broad Xiumi
  authoring tree classes, Angular `ng-*` attributes, `tn-atom-*` attributes, hosted media,
  operator controls, selection overlays, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose containing editing, frozen, toggle, enabled, active,
  Xiumi, editor, or template wording by itself; the trigger is the source-specific Xiumi class/id
  marker.

### 3. Required Checks

- Use TDD to prove the reduced frozen-toggle-only fixture fails before implementation and reports
  `Xiumi editing frozen-toggle residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi page authoring tree residue`,
  `Xiumi editing state residue`, `Xiumi in-cell active state residue`, and generic
  `Xiumi tn-* attribute` handling independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 158. Xiumi Quick Input Instance Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the quick-input
  component instance class `tn-__quick_input__-inst` observed in a live CloakBrowser DOM
  readback after opening the Xiumi paper editor.
- The same live node can also carry `tn-quick-input-comp`, `tn-from-house-paper-cp`,
  `tn-comp-anim-pin`, `tn-comp-inst`, and `tn-comp`, but the instance class must be guarded on
  its own because cleanup can remove the broader quick-input or source-house wrappers while
  leaving the source-specific instance marker behind.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report the existing `Xiumi quick input residue` label for
  WeChat, Xiaohongshu, and Zhihu when `tn-__quick_input__-inst` appears in a class or id
  attribute.
- A reduced fixture containing only `tn-__quick_input__-inst` must fail even when
  `tn-quick-input-block`, `tn-quick-input-comp`, `tn-from-house-*`, `tn-comp-*`, broad Xiumi
  authoring tree classes, Angular `ng-*` attributes, hosted media, SVG content layers, operator
  controls, selection overlays, sidebar controls, meta panels, and generic Xiumi `tn-*`
  catch-alls are absent.
- The detector must not block ordinary prose containing quick, input, instance, Xiumi, editor, or
  template wording by itself; the trigger is the source-specific Xiumi class/id marker.

### 3. Required Checks

- Use TDD to prove the reduced instance-only fixture fails before implementation and reports
  `Xiumi quick input residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component authoring tree residue`,
  `Xiumi source-house authoring residue`, and generic `Xiumi tn-* attribute` handling
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 157. 135 SVG Builder Effect Data-Name Second Expansion - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains a second batch of
  source-specific `data-name` values observed after clicking the remaining live free-trial SVG
  effects in CloakBrowser.
- Newly learned values are `devicephotos`, `clickopenverticalandretainimg`, `slidecardsexpand`,
  `scrollwithclickchangeimage`, `clickpalywithsacleimageandspread`,
  `clickspreadtrackchangeimage`, `clicktrackchangeimage`,
  `touchmoveshowimagewithleakagecarousel`, `autoshowimagewithleakagecarousel`,
  `clickshowimagewithleakagecarousel`, `marqueeclickpopimage`,
  `clickplaygifwithhorizontalscroll`, `clickslideandclickswitchpop`, `doubleclickimage`,
  `clickscaleremovechangeimgs`, `clickcoverandmoveimages`, `clickchooseonepopup`,
  `clickrotatechangeimgswithtopandbgchange`, and `chooseonefromtwoclickimagewithcallback`.
- These names are 135 builder effect metadata, not author-facing article prose, and must not
  appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report the existing
  `135 SVG builder effect data-name` label for WeChat, Xiaohongshu, and Zhihu when any
  second-batch value appears in a `data-name` attribute.
- A reduced fixture containing only the second-batch `data-name` attributes must fail even when
  `app-content-canvas`, `content-wrapper`, `block-img__content`, `block-img__default`,
  `edit-placeholder`, `placeholder__name`, editor shell wrappers, trigger overlays, layout
  controls, toolbar classes, sidebar/navigation wrappers, material controls, material-panel
  controls, hosted media, Ant switch controls, `svg:135` styles, and `background-size:100.1%`
  background shells are absent.
- The detector must not block ordinary prose containing the English effect words by themselves;
  the trigger is the exact `data-name` metadata attribute.

### 3. Required Checks

- Use TDD to prove the reduced second-batch fixture fails before implementation and reports
  `135 SVG builder effect data-name` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG builder canvas residue` and
  `135 SVG editor shell residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 156. 135 SVG Builder Effect Data-Name Expansion - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains a source-specific
  `data-name` value observed after clicking live free-trial SVG effects and choosing no bundled
  design material in CloakBrowser.
- Newly learned values are `autobounceflipcard`, `multipletouchmovetodismissimgs`,
  `svgscrollswithgruopsslide`, `clickchangecoverwithscroll`, and
  `clickredpakcetwithscroll`.
- These names are 135 builder effect metadata, not author-facing article prose, and must not
  appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report the existing
  `135 SVG builder effect data-name` label for WeChat, Xiaohongshu, and Zhihu when any newly
  learned value appears in a `data-name` attribute.
- A reduced fixture containing only the new `data-name` attributes must fail even when
  `app-content-canvas`, `content-wrapper`, `block-img__content`, `block-img__default`,
  `edit-placeholder`, `placeholder__name`, editor shell wrappers, trigger overlays, layout
  controls, toolbar classes, sidebar/navigation wrappers, material controls, material-panel
  controls, hosted media, Ant switch controls, `svg:135` styles, and `background-size:100.1%`
  background shells are absent.
- The detector must not block ordinary prose containing the English effect words by themselves;
  the trigger is the exact `data-name` metadata attribute.

### 3. Required Checks

- Use TDD to prove the reduced new-effect fixture fails before implementation and reports
  `135 SVG builder effect data-name` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG builder canvas residue` and
  `135 SVG editor shell residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 155. 135 SVG Editor Gap Input Child Control Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains the live gap/spacing input
  child control class `gap_input` without its parent layout wrappers.
- `gap_input` is an editor-side spacing control, not article content, and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report the existing
  `135 SVG editor layout control residue` label for WeChat, Xiaohongshu, and Zhihu when
  `gap_input` appears in class/id attributes.
- A reduced fixture containing only `gap_input` must fail even when `block-spacing`, `block-gap`,
  `gap-item-wrapper`, `article-item__editing`, Ant slider controls, center-canvas ids, shell
  children, trigger overlays, toolbar classes, sidebar/navigation wrappers, material controls,
  material-panel controls, known `data-name` values, hosted media, Ant switch controls, `svg:135`
  styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing gap, spacing, input, editor, or SVG
  wording by itself.

### 3. Required Checks

- Use TDD to prove the reduced `gap_input` fixture fails before implementation and reports
  `135 SVG editor layout control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG editor shell residue`,
  `135 SVG editor toolbar residue`, and `135 SVG builder canvas residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 154. 135 SVG Editor Articles Anchor Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains the center-canvas
  `articles-anchor` wrapper observed in a live CloakBrowser 135 SVG editor DOM readback.
- `articles-anchor` is editor-side article/canvas navigation chrome adjacent to the
  `artilce-list` wrapper. It is not article content and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG editor articles anchor residue` for WeChat,
  Xiaohongshu, and Zhihu when `articles-anchor` appears in class/id attributes.
- A reduced fixture containing only `articles-anchor` plus a generic `article-item` child must
  fail even when `artilce-list`, `article-item__inner/label/del`, `articles_pop`, center-canvas
  ids, shell children, trigger overlays, known `data-name` values, layout controls, toolbar
  classes, sidebar/navigation wrappers, material controls, material-panel controls, hosted media,
  Ant switch controls, `svg:135` styles, and `background-size:100.1%` background shells are
  absent.
- The detector must not block ordinary prose containing article, anchor, list, wrapper, editor, or
  SVG wording by itself, and it must not treat generic `article-item` as a standalone trigger.

### 3. Required Checks

- Use TDD to prove the reduced `articles-anchor` fixture fails before implementation and reports
  `135 SVG editor articles anchor residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG editor article list wrapper residue`,
  `135 SVG editor shell residue`, `135 SVG builder canvas residue`, and
  `135 SVG editor layout control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 153. 135 SVG Editor Article List Wrapper Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains the center-canvas article-list
  wrapper class `artilce-list` observed in a live CloakBrowser 135 SVG editor DOM readback.
- The class name is intentionally the live editor's misspelled wrapper name. It is editor-side
  canvas/list chrome, not article content, and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG editor article list wrapper residue` for
  WeChat, Xiaohongshu, and Zhihu when `artilce-list` appears in class/id attributes.
- A reduced fixture containing only `artilce-list` plus a generic `article-item` child must fail
  even when center-canvas ids, shell children, trigger overlays, known `data-name` values,
  layout controls, toolbar classes, sidebar/navigation wrappers, material controls, material-panel
  controls, hosted media, Ant switch controls, `svg:135` styles, and `background-size:100.1%`
  background shells are absent.
- The detector must not block ordinary prose containing article, list, wrapper, editor, or SVG
  wording by itself, and it must not treat generic `article-item` as a standalone trigger.

### 3. Required Checks

- Use TDD to prove the reduced `artilce-list` fixture fails before implementation and reports
  `135 SVG editor article list wrapper residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG editor shell residue`,
  `135 SVG builder canvas residue`, `135 SVG editor layout control residue`, and
  `135 SVG material list item residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 152. 135 SVG Material Category Helper Asset Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains paired material-category
  helper resource paths observed in a live CloakBrowser 135 SVG editor DOM readback, such as
  `src="img/hot.74ee6ac4.png"` and `src="img/icon-up2.e0ef1973.png"` in the same category/filter
  fragment.
- These relative `img/hot` and `img/icon-up2` resources are editor-side material category badges
  and fold controls, not article content, and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output when they appear as the paired 135 material-category asset family.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material category helper asset residue` for
  WeChat, Xiaohongshu, and Zhihu when the supported `img/hot` and `img/icon-up2` PNG asset paths
  appear as a nearby pair.
- A reduced fixture containing only the paired category helper asset paths must fail even when
  material-category classes, material-filter controls, material-preview asset paths,
  material-action asset paths, material-card classes, sidebar icon assets, sidebar icon/help
  classes, sidebar navigation wrappers, toolbar classes, material search controls, material-panel
  controls, material component paths, purchase controls, list-loader state, shell wrappers, layout
  controls, known 135 `data-name` values, hosted media, trigger overlays, Ant switch controls,
  `svg:135` styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing hot, fold, up, category, helper, icon,
  material, asset, PNG, or editor wording by itself. It must stay anchored to the 135-specific
  nearby pair of relative `img/hot` and `img/icon-up2` PNG paths.

### 3. Required Checks

- Use TDD to prove the reduced material-category helper asset fixture fails before implementation
  and reports `135 SVG material category helper asset residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG material category wrapper residue`,
  `135 SVG material filter control residue`, `135 SVG material preview asset residue`,
  `135 SVG material action asset residue`, and `135 SVG sidebar icon asset residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 151. 135 SVG Material Action Asset Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains paired material-action icon
  resource paths observed in a live CloakBrowser 135 SVG editor DOM readback, such as
  `src="img/message.6ba842d4.svg"` and `src="img/collect.645fe3be.svg"` in the same material
  card fragment.
- These relative `img/message` and `img/collect` resources are editor-side material summary and
  collection action icons, not article content, and must not appear in WeChat, Xiaohongshu, or
  Zhihu publishable output when they appear as the paired 135 material-card asset family.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material action asset residue` for WeChat,
  Xiaohongshu, and Zhihu when the supported `img/message` and `img/collect` SVG asset paths appear
  as a nearby pair.
- A reduced fixture containing only the paired action asset paths must fail even when material-card
  classes, material-preview asset paths, material-category wrappers, material-filter controls,
  sidebar icon assets, sidebar icon/help classes, sidebar navigation wrappers, toolbar classes,
  material search controls, material-panel controls, material component paths, purchase controls,
  list-loader state, shell wrappers, layout controls, known 135 `data-name` values, hosted media,
  trigger overlays, Ant switch controls, `svg:135` styles, and `background-size:100.1%`
  background shells are absent.
- The detector must not block ordinary prose containing message, collect, summary, action, icon,
  material, asset, SVG, or editor wording by itself. It must stay anchored to the 135-specific
  nearby pair of relative `img/message` and `img/collect` SVG paths.

### 3. Required Checks

- Use TDD to prove the reduced material-action asset fixture fails before implementation and
  reports `135 SVG material action asset residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG material list item residue`,
  `135 SVG material preview asset residue`, and `135 SVG sidebar icon asset residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 150. 135 SVG Material Preview Asset Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains material-preview icon resource
  paths observed in a live CloakBrowser 135 SVG editor DOM readback, such as
  `src="img/img-preview-show.0471d3a6.svg"` or
  `src="img/img-preview-hide.bff8f2cc.svg"`.
- These relative `img/img-preview-show|hide` resources are editor-side material preview toggles,
  not article content, and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material preview asset residue` for WeChat,
  Xiaohongshu, and Zhihu when supported material-preview asset paths appear.
- A reduced fixture containing only the preview asset paths must fail even when preview classes,
  material-category wrappers, material-filter controls, sidebar icon assets, sidebar icon/help
  classes, sidebar navigation wrappers, toolbar classes, material search controls, material-panel
  controls, material cards, material component paths, purchase controls, list-loader state, shell
  wrappers, layout controls, known 135 `data-name` values, hosted media, trigger overlays, Ant
  switch controls, `svg:135` styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing preview, image, show, hide, material,
  asset, SVG, or editor wording by itself. It must stay anchored to 135-specific relative
  `img/img-preview-show|hide` SVG paths and must not treat generic SVG images as residue.

### 3. Required Checks

- Use TDD to prove the reduced material-preview asset fixture fails before implementation and
  reports `135 SVG material preview asset residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG material category wrapper residue`,
  `135 SVG material filter control residue`, and `135 SVG sidebar icon asset residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 149. 135 SVG Sidebar Icon Asset Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains sidebar icon resource paths
  observed in a live CloakBrowser 135 SVG editor DOM readback, such as
  `src="img/sidebar-work-active.1e2c6eb1.png"`.
- These relative `img/sidebar-*.png` resources are editor chrome icons, not article content, and
  must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG sidebar icon asset residue` for WeChat,
  Xiaohongshu, and Zhihu when supported `img/sidebar-*.png` asset paths appear.
- A reduced fixture containing only the sidebar icon asset path must fail even when sidebar
  icon/help classes, sidebar navigation wrappers, toolbar classes, material search controls,
  material-panel controls, header/logo/menu chrome, user/header chrome, work-title controls,
  work-tool quick-entry chrome, material cards, material component paths, material purchase
  controls, shell wrappers, layout controls, known 135 `data-name` values, hosted media, trigger
  overlays, Ant switch controls, `svg:135` styles, and `background-size:100.1%` background shells
  are absent.
- The detector must not block ordinary prose containing sidebar, icon, asset, image, help, active,
  work, upload, material, or editor wording by itself. It must stay anchored to 135-specific
  relative `img/sidebar-*.png` paths and must not treat generic data images as residue.

### 3. Required Checks

- Use TDD to prove the reduced sidebar icon asset fixture fails before implementation and reports
  `135 SVG sidebar icon asset residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG sidebar icon/help residue` and
  `135 SVG sidebar navigation residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 148. 135 SVG Sidebar Icon Help Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains left-sidebar icon/help chrome
  observed in a live CloakBrowser 135 SVG editor DOM readback, such as
  `side-tab-menu__icon-box`, `side-tab-menu__icon`, `side-bar-banner-wrap`, or
  `sidebar-help black`.
- These nodes render the 135 SVG editor's sidebar icon, banner, and help affordances. They are
  editor chrome, not article content, and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This contract is static publishability protection only. It does not prove paste, phone preview,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG sidebar icon/help residue` for WeChat,
  Xiaohongshu, and Zhihu when supported sidebar icon/help markers appear.
- A reduced fixture containing only sidebar icon/help chrome must fail even when 135 SVG sidebar
  navigation wrappers, toolbar classes, material search controls, material-panel controls,
  header/logo/menu chrome, user/header chrome, work-title controls, work-tool quick-entry chrome,
  material cards, material component paths, material purchase controls, shell wrappers, layout
  controls, known 135 `data-name` values, hosted media, trigger overlays, Ant switch controls,
  `svg:135` styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing sidebar, icon, help, banner, active, work,
  upload, material, or editor wording by itself. It must stay anchored to 135-specific class names.
- `side-bar-banner-wrap` must not be reported by the older `135 SVG sidebar navigation residue`
  label; the navigation rule must treat `side-bar` as a complete class name.

### 3. Required Checks

- Use TDD to prove the reduced sidebar icon/help fixture fails before implementation and reports
  `135 SVG sidebar icon/help residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG sidebar navigation residue`,
  `135 SVG editor toolbar residue`, and `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 147. 135 SVG Work Tool Quick-Entry Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains work-tool quick-entry chrome
  observed in a live CloakBrowser 135 SVG editor DOM readback, such as `work-tool`,
  `work-tool-signature fixed`, `ant_btn_panel`, `idea-entry-quick`, `entry-popover`, or
  `btn-entry ant-btn`.
- These controls render the 135 SVG editor's quick entry/history/signature operation panel. They
  are editor chrome, not publishable article DOM, and must not appear in WeChat, Xiaohongshu, or
  Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG work tool quick-entry residue` for WeChat,
  Xiaohongshu, and Zhihu when supported work-tool quick-entry class markers appear.
- A reduced fixture containing only work-tool quick-entry controls must fail even when 135 SVG
  editor header/logo/menu chrome, user/header chrome, work-title controls, toolbar classes,
  sidebar/navigation controls, material cards, material component paths, material search controls,
  material purchase controls, material list-loader state, shell wrappers, layout controls,
  material-panel controls, known 135 `data-name` values, hosted media, trigger overlays, Ant
  switch controls, `svg:135` styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing work, tool, entry, history, signature,
  quick, panel, button, or editor wording by itself. It must stay anchored to 135 SVG editor
  markers and must not use generic `entry-list`, `entry-item`, `history`, `button`, or `ant-btn`
  as standalone triggers.

### 3. Required Checks

- Use TDD to prove the reduced work-tool quick-entry fixture fails before implementation and
  reports `135 SVG work tool quick-entry residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG header logo menu residue`,
  `135 SVG user header chrome residue`, `135 SVG work title edit control residue`,
  `135 SVG editor toolbar residue`, `135 SVG sidebar navigation residue`,
  `135 SVG material list item residue`, `135 SVG material component path residue`,
  `135 SVG material search control residue`, `135 SVG material purchase control residue`,
  `135 SVG editor shell residue`, and `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 146. 135 SVG Header Logo Menu Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains header logo/menu chrome
  observed in a live CloakBrowser 135 SVG editor DOM readback, such as `header__logo`,
  `header__link menu` paired with `/svgeditor/`, or the editor logo asset path
  `img/logo_name.*.png`.
- These controls render the 135 SVG editor's brand/home navigation header. They are editor chrome,
  not publishable article DOM, and must not appear in WeChat, Xiaohongshu, or Zhihu publishable
  output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG header logo menu residue` for WeChat,
  Xiaohongshu, and Zhihu when supported header logo/menu class, navigation link, or logo asset
  markers appear.
- A reduced fixture containing only header logo/menu controls must fail even when 135 SVG editor
  user/header chrome, work-title controls, toolbar classes, sidebar/navigation controls, material
  cards, material component paths, material search controls, material purchase controls, material
  list-loader state, shell wrappers, layout controls, material-panel controls, known 135
  `data-name` values, hosted media, trigger overlays, Ant switch controls, `svg:135` styles, and
  `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing header, logo, menu, home, brand, link, or
  editor wording by itself. It must stay anchored to 135 SVG editor markers: `header__logo`,
  `header__link menu` only when tied to `/svgeditor/`, or the `img/logo_name.*.png` asset path.

### 3. Required Checks

- Use TDD to prove the reduced header logo/menu fixture fails before implementation and reports
  `135 SVG header logo menu residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG user header chrome residue`,
  `135 SVG work title edit control residue`, `135 SVG editor toolbar residue`,
  `135 SVG sidebar navigation residue`, `135 SVG material list item residue`,
  `135 SVG material component path residue`, `135 SVG material search control residue`,
  `135 SVG material purchase control residue`, `135 SVG editor shell residue`, and
  `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 145. 135 SVG Work Title Edit Control Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains work-title edit controls
  observed in a live CloakBrowser 135 SVG editor DOM readback, such as `work-title`,
  `work-title__editing`, and `edit-text__input` paired with the live placeholder `作品标题`.
- These controls render the 135 SVG editor's work/article title input. They are editor chrome, not
  publishable article DOM, and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG work title edit control residue` for
  WeChat, Xiaohongshu, and Zhihu when supported work-title class/id markers appear, or when
  `edit-text__input` appears with the live `作品标题` placeholder.
- A reduced fixture containing only work-title edit controls must fail even when 135 SVG editor
  user/header chrome, toolbar classes, sidebar/navigation controls, material cards, material
  component paths, material search controls, material purchase controls, material list-loader
  state, shell wrappers, layout controls, material-panel controls, known 135 `data-name` values,
  hosted media, trigger overlays, Ant switch controls, `svg:135` styles, and
  `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing title, work, edit, input, placeholder,
  `作品标题`, header, or editor wording by itself. It must stay anchored to 135 SVG editor
  work-title control class names.

### 3. Required Checks

- Use TDD to prove the reduced work-title fixture fails before implementation and reports
  `135 SVG work title edit control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG user header chrome residue`,
  `135 SVG editor toolbar residue`, `135 SVG sidebar navigation residue`,
  `135 SVG material list item residue`, `135 SVG material component path residue`,
  `135 SVG material search control residue`, `135 SVG material purchase control residue`,
  `135 SVG editor shell residue`, and `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 144. 135 SVG User Header Chrome Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains top user/header chrome
  observed in a live CloakBrowser 135 SVG editor DOM readback, such as `header-user`,
  `user-info noheader`, `user-info__head`, or `user-info__nickname`.
- These controls render account/profile/editor-mode UI in the 135 SVG editor header. They are not
  article DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG user header chrome residue` for WeChat,
  Xiaohongshu, and Zhihu when supported header/user chrome class or id markers appear.
- A reduced fixture containing only header/user chrome controls must fail even when 135 SVG editor
  toolbar classes, sidebar/navigation controls, material cards, material search controls,
  material purchase controls, material list-loader state, shell wrappers, layout controls,
  material-panel controls, known 135 `data-name` values, hosted media, trigger overlays, Ant
  switch controls, `svg:135` styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing user, avatar, nickname, profile, account,
  personal mode, header, or editor wording by itself. It must stay anchored to 135 SVG editor
  header/user class names and committed fixtures must redact real account text.

### 3. Required Checks

- Use TDD to prove the reduced user/header chrome fixture fails before implementation and reports
  `135 SVG user header chrome residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG editor toolbar residue`,
  `135 SVG sidebar navigation residue`, `135 SVG material list item residue`,
  `135 SVG material component path residue`, `135 SVG material search control residue`,
  `135 SVG material purchase control residue`, `135 SVG editor shell residue`, and
  `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 143. 135 SVG Material Component Path Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains the exact material component
  path attribute `file_path="sidebar/tabs/ItemElement"` observed in live 135 SVG material cards.
- The attribute identifies a 135 SVG editor/sidebar material component source path. It is not
  publishable article metadata for WeChat, Xiaohongshu, or Zhihu and must not survive final output
  even if the surrounding `item-element` card classes, price rows, sidebar wrappers, filters, and
  purchase controls have already been removed.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material component path residue` for
  WeChat, Xiaohongshu, and Zhihu when an element contains the exact
  `file_path="sidebar/tabs/ItemElement"` attribute value.
- A reduced fixture containing only that exact component path must fail even when 135 SVG canvas
  markers, sidebar/navigation controls, material-filter controls, material-category wrappers,
  material-list card controls, material list-loader state, material search controls, material
  purchase controls, toolbar controls, shell wrappers, layout controls, material-panel controls,
  known 135 `data-name` values, hosted media, trigger overlays, Ant switch controls, `svg:135`
  styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing path, sidebar, tab, item, component,
  material, SVG, or editor wording by itself. It must also avoid generic `file_path` detection;
  matching must stay anchored to the exact 135 SVG material component path value.

### 3. Required Checks

- Use TDD to prove the reduced component-path fixture fails before implementation and reports
  `135 SVG material component path residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG material list item residue`,
  `135 SVG sidebar navigation residue`, `135 SVG material filter control residue`,
  `135 SVG material category wrapper residue`, `135 SVG material list loader residue`,
  `135 SVG material search control residue`, `135 SVG material purchase control residue`,
  `135 SVG editor toolbar residue`, `135 SVG editor shell residue`, and
  `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 142. 135 SVG Material Search Control Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains material search child controls
  observed in a live CloakBrowser 135 SVG editor DOM readback, such as `search__wrap`,
  `search-area`, `search-input`, `search__input`, `search-hint`, the placeholder
  `请输入关键词搜索`, and search/help icon markers.
- These controls drive 135's SVG material keyword search and help affordance. They are not article
  DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material search control residue` for
  WeChat, Xiaohongshu, and Zhihu when supported source-specific search child markers appear with
  the live 135 search placeholder or icon context.
- A reduced fixture containing only search child controls must fail even when 135 SVG canvas
  markers, sidebar/navigation controls, material-filter controls, material-category wrappers,
  material-list card controls, material list-loader state, purchase controls, toolbar controls,
  shell wrappers, layout controls, material-panel controls, known 135 `data-name` values, hosted
  media, trigger overlays, Ant switch controls, `svg:135` styles, and `background-size:100.1%`
  background shells are absent.
- The detector must not block ordinary prose containing search, keyword, placeholder, material,
  SVG, help, or icon wording by itself. It must also avoid generic selectors such as
  `search-input` alone, `anticon`, `ant-btn`, and button classes; matching must stay anchored to
  source-specific 135 search child classes plus the live placeholder or icon context.

### 3. Required Checks

- Use TDD to prove the reduced search-control fixture fails before implementation and reports
  `135 SVG material search control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG sidebar navigation residue`,
  `135 SVG material filter control residue`, `135 SVG material list item residue`,
  `135 SVG material list loader residue`, `135 SVG material purchase control residue`,
  `135 SVG editor toolbar residue`, `135 SVG editor shell residue`, and
  `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 141. 135 SVG Material Purchase Control Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains material purchase or discount
  child controls observed in a live CloakBrowser 135 SVG editor DOM readback, such as
  `discount-instructions`, `discount-desc`, and `btn-buy` buttons paired with `ant-btn` and the
  action text `免费试用` / `立即购买`.
- These controls drive 135's SVG material discount labels, free-trial actions, and purchase
  actions. They are not article DOM and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material purchase control residue` for
  WeChat, Xiaohongshu, and Zhihu when supported purchase/discount child markers appear.
- A reduced fixture containing only purchase/discount child controls must fail even when 135 SVG
  canvas markers, sidebar/navigation controls, material-filter controls, material-category
  wrappers, material-list card controls, material list-loader state, toolbar controls, shell
  wrappers, layout controls, material-panel controls, known 135 `data-name` values, hosted media,
  trigger overlays, Ant switch controls, `svg:135` styles, and `background-size:100.1%` background
  shells are absent.
- The detector must not block ordinary prose containing price, buy, purchase, trial, discount,
  material, SVG, button, free, or action wording by itself. It must also avoid generic selectors
  such as `btn`, `ant-btn`, `button`, and `new`; matching must stay anchored to 135-specific
  `discount-*` classes or the `btn-buy` + `ant-btn` + live action-text combination.

### 3. Required Checks

- Use TDD to prove the reduced purchase-control fixture fails before implementation and reports
  `135 SVG material purchase control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG material list loader residue`,
  `135 SVG material list item residue`, `135 SVG material category wrapper residue`,
  `135 SVG material filter control residue`, `135 SVG sidebar navigation residue`,
  `135 SVG editor toolbar residue`, `135 SVG editor shell residue`, and
  `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 140. 135 SVG Material List Loader Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains left material list-loader or
  SVG-list runtime state observed in a live CloakBrowser 135 SVG editor DOM readback, such as
  `issvglist="true"`, `list-loader__inner`, `list-loader__load`,
  `list-loader__loading`, and `list-loader__loading-inner`.
- These controls drive 135's SVG material pagination and loading state. They are not article DOM
  and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material list loader residue` for WeChat,
  Xiaohongshu, and Zhihu when supported list-loader class/id or SVG-list attribute markers appear.
- A reduced fixture containing only material list-loader state must fail even when 135 SVG canvas
  markers, sidebar/navigation controls, material-filter controls, material-category wrappers,
  material-list card controls, toolbar controls, shell wrappers, layout controls, material-panel
  controls, known 135 `data-name` values, hosted media, trigger overlays, Ant switch controls,
  `svg:135` styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing load, loading, list, more, material, or
  SVG wording by itself. It must also avoid generic selectors such as `list-item`, `loading`,
  `black`, `active`, Ant icon classes, and button classes; matching must stay anchored to
  135-specific list-loader class/id names or the `issvglist` attribute.

### 3. Required Checks

- Use TDD to prove the reduced list-loader fixture fails before implementation and reports
  `135 SVG material list loader residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG sidebar navigation residue`,
  `135 SVG material filter control residue`, `135 SVG material category wrapper residue`,
  `135 SVG material list item residue`, `135 SVG editor toolbar residue`,
  `135 SVG editor shell residue`, and `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 139. 135 SVG Material Category Wrapper Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains left material category,
  fold/list wrapper, or SVG-template activity entrance controls observed in a live CloakBrowser
  135 SVG editor DOM readback, such as `tab-special__functions`, `tab-special__tags`,
  `tab-special__tap`, `tab-special__list`, `tab_special_functions`, `tab-menufilter`,
  `filter_category`, `filter-list__fold`, `svgMubanYaoqingEnter`, and `img-preview-hide`.
- These controls drive 135's SVG material-category panel, folded category list, hidden preview
  helper, tab body, and template-campaign entry. They are not article DOM and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material category wrapper residue` for
  WeChat, Xiaohongshu, and Zhihu when supported category/list wrapper class/id markers appear.
- A reduced fixture containing only material category/list wrappers must fail even when 135 SVG
  canvas markers, sidebar/navigation controls, material-filter controls, material-list card
  controls, toolbar controls, shell wrappers, layout controls, material-panel controls, known 135
  `data-name` values, hosted media, trigger overlays, Ant switch controls, `svg:135` styles, and
  `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing category, fold, list, tab, template,
  preview, activity, SVG, item, active, more, or new wording by itself. It must also avoid generic
  selectors such as `item`, `active`, `more`, `new`, `search-input`, and `list-item`; matching
  must stay anchored to 135-specific material category/list wrapper class/id names.

### 3. Required Checks

- Use TDD to prove the reduced material-category fixture fails before implementation and reports
  `135 SVG material category wrapper residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG sidebar navigation residue`,
  `135 SVG material filter control residue`, `135 SVG material list item residue`,
  `135 SVG editor toolbar residue`, `135 SVG editor layout control residue`,
  `135 SVG editor shell residue`, and `135 SVG material panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 138. 135 SVG Material Filter Control Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains left material filter,
  category, tag, or preview controls observed in a live CloakBrowser 135 SVG editor DOM readback,
  such as `menu-filter`, `menu-filter__container`, `menu-filter__group`,
  `menu-level__group`, `menu__warp_btn`, `level_entry`, `svg-types`, `tab-switch_btn`,
  `special-tags__left`, `special-tags__center`, `special-tags__right`,
  `special-tags__cover`, `tab-visible_cat`, `preview-guide`, `usage-history`, and
  `modal-entrance`.
- These controls drive 135's SVG effect category filters, material-type tabs, preview prompts,
  usage history, and modal entrances. They are not article DOM and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material filter control residue` for
  WeChat, Xiaohongshu, and Zhihu when supported material filter/control class/id markers appear.
- A reduced fixture containing only material filter/category controls must fail even when 135 SVG
  canvas markers, sidebar/navigation controls, material-list card controls, toolbar controls,
  shell wrappers, layout controls, material-panel controls, known 135 `data-name` values, hosted
  media, trigger overlays, Ant switch controls, `svg:135` styles, and
  `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing filter, search, category, preview,
  history, modal, all, click, material, SVG, or tag wording by itself. It must also avoid generic
  selectors such as `search-input`, `search-container`, `list-item`, and `new`; matching must stay
  anchored to 135-specific material filter/control class/id names.

### 3. Required Checks

- Use TDD to prove the reduced material-filter fixture fails before implementation and reports
  `135 SVG material filter control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG sidebar navigation residue`,
  `135 SVG material list item residue`, `135 SVG editor toolbar residue`,
  `135 SVG editor layout control residue`, `135 SVG editor shell residue`,
  `135 SVG material panel residue`, and `135 SVG trigger switch control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 137. 135 SVG Material List Item Residue - 2026-06-27

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains left material-list card
  controls observed in a live CloakBrowser 135 SVG editor DOM readback, such as `item-element`,
  `item-element_id`, `item-element__box`, `item-element__help`, `item-content__tag`,
  `item-element__title`, `item-element__price`, `item-line`, `element-price__wrap`,
  `element-actions__wrap`, `item-summary-tag`, and `item-collect-tag`.
- These controls drive 135's SVG effect marketplace cards, free-trial/buy actions, collection
  badges, price rows, and item preview metadata. They are not article DOM and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG material list item residue` for WeChat,
  Xiaohongshu, and Zhihu when supported material-list card class/id markers appear.
- A reduced fixture containing only material-list card controls must fail even when 135 SVG canvas
  markers, sidebar/navigation controls, toolbar controls, shell wrappers, layout controls,
  material-panel controls, known 135 `data-name` values, hosted-media, trigger overlays, Ant
  switch controls, `svg:135` styles, and `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing material, item, card, title, price, buy,
  trial, collect, or action wording by itself. It must stay anchored to 135-specific material-list
  card class/id names.

### 3. Required Checks

- Use TDD to prove the reduced material-list fixture fails before implementation and reports
  `135 SVG material list item residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG sidebar navigation residue`,
  `135 SVG editor toolbar residue`, `135 SVG editor layout control residue`,
  `135 SVG editor shell residue`, `135 SVG material panel residue`, and
  `135 SVG trigger switch control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 136. 135 SVG Sidebar Navigation Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains left sidebar or tab-navigation
  controls observed in a live CloakBrowser 135 SVG editor DOM readback, such as `side-bar`,
  `side-bar-wrap`, `side-bar-menu-wrap`, `side-tab-menu`, `side-tab-menu__content`,
  `side-tab-menu__label`, `side-tab-content`, `side-bar-content-wrap`, and `tab-special`.
- These controls drive 135's SVG effect/template/work/upload/material/clipboard navigation and
  search/tab panes. They are not article DOM and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG sidebar navigation residue` for WeChat,
  Xiaohongshu, and Zhihu when supported sidebar/navigation class/id markers appear.
- A reduced fixture containing only sidebar/navigation controls must fail even when 135 SVG canvas
  markers, toolbar controls, shell wrappers, layout controls, material-panel controls, known 135
  `data-name` values, hosted-media, trigger overlays, Ant switch controls, `svg:135` styles, and
  `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing sidebar, navigation, SVG effect, SVG
  template, work, upload, material, clipboard, search, or tab wording by itself. It must stay
  anchored to 135-specific sidebar/navigation class/id names.
- The detector must treat `side-bar` as a complete class name. Prefix-adjacent controls such as
  `side-bar-banner-wrap` belong to the newer sidebar icon/help residue rule and must not be
  reported under this navigation label.

### 3. Required Checks

- Use TDD to prove the reduced sidebar/navigation fixture fails before implementation and reports
  `135 SVG sidebar navigation residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG editor toolbar residue`,
  `135 SVG editor layout control residue`, `135 SVG editor shell residue`,
  `135 SVG material panel residue`, and `135 SVG trigger switch control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 75. Xiumi Paper Document Root Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor root
  wrapper class `tn-paper-document-root`.
- This pattern came from the applied Xiumi SVG/style DOM readback. It is authoring/runtime state
  from the Xiumi paper editor root tree, not an InkForge-owned publishable article wrapper.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi paper document root residue` for WeChat,
  Xiaohongshu, and Zhihu when that root wrapper appears in copied publishable output.
- The rule must not rely on broader `tn-comp`, `tn-cell`, `ng-*`, `opera-*`, SVG content-layer,
  hosted-media, or `foreignObject` markers. A reduced fragment that keeps only the root wrapper
  class and an otherwise plain section must still fail the market-editor residue gate.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced root-only fixture fails before the rule and passes after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 76. Xiumi Text Cell Class Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor
  text-cell class `tn-text`.
- This pattern came from the applied Xiumi SVG/style DOM readback. It is authoring/runtime state
  from the Xiumi editable text-cell system, not an InkForge-owned text span.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi text cell class residue` for WeChat,
  Xiaohongshu, and Zhihu when that text-cell class appears in copied publishable output.
- The rule must not rely on broader `tn-cell`, `tn-link`, `tn-animate`, `contenteditable`, `ng-*`,
  `opera-*`, hosted-media, SVG content-layer, or `foreignObject` markers. A reduced fragment that
  keeps only the text-cell class and readable text must still fail the market-editor residue gate.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced text-cell-only fixture fails before the rule and passes after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 77. Xiumi Interaction Style Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a style attribute with both
  `touch-action` and `user-select`.
- This style pair came from the applied Xiumi SVG/style DOM readback. It is editor interaction
  layer state, not an InkForge-owned publishable article style.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi interaction style residue` for WeChat,
  Xiaohongshu, and Zhihu when that same-style-attribute pair appears in copied publishable output.
- The rule must require both properties in the same style attribute. It must not rely on broader
  `tn-*`, `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced interaction-style-only fixture fails before the rule and passes
  after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 78. Xiumi UI Slider Control Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi/jQuery-UI editor slider
  control classes such as `ui-slider`, `ui-slider-horizontal`, or `ui-slider-handle`.
- This control family came from the applied Xiumi SVG/style DOM readback. It is an editor
  parameter-control surface, not an InkForge-owned publishable article component.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi UI slider control residue` for WeChat,
  Xiaohongshu, and Zhihu when the slider control class family appears in copied publishable output.
- The rule must match only class/id attributes. It must not rely on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced slider-control-only fixture fails before the rule and passes after
  it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 79. Xiumi Operation Panel Loader Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi editor operation
  panel loader class `op-loader`.
- This class came from the applied Xiumi Angular runtime readback around the
  `OutCompEditOp/OpCarouselTplSet` editor partial. It is editor operation-panel state, not an
  InkForge-owned publishable article wrapper.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi operation panel loader residue` for WeChat,
  Xiaohongshu, and Zhihu when `op-loader` appears in a class/id attribute.
- The rule must match only class/id attributes. It must not rely on broader `tn-*`, `ng-*`,
  Angular runtime classes, `opera-*`, `contenteditable`, hosted-media, SVG content-layer,
  `ui-slider`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced operation-loader-only fixture fails before the rule and passes
  after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 80. Xiumi Sortable Control Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi/jQuery-UI sortable
  control classes such as `ui-sortable` or `ui-sortable-*`.
- This class family came from the applied Xiumi SVG/style DOM readback and market editor state
  catalog. It is an editor drag/sort control surface, not an InkForge-owned publishable article
  component or layout primitive.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi sortable control residue` for WeChat,
  Xiaohongshu, and Zhihu when the sortable control class family appears in copied publishable
  output.
- The rule must match only class/id attributes. It must not rely on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `ui-slider`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- `ui-sortable` must be diagnosed as Xiumi sortable residue instead of the generic Angular
  authoring class label. Generic `ng-*` runtime classes must remain blocked by the Angular
  authoring class rule.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced sortable-control-only fixture reports the generic Angular label
  before the rule split and the precise Xiumi sortable residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep Angular runtime controls blocked by `Angular authoring class` through
  the remaining `ng-*` class family.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 81. Xiumi Content-Overlap State Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor state
  class `tn-content-overlap`.
- This class came from the applied Xiumi SVG sample DOM readback. It is editor overlap/layer state
  from the Xiumi image-gallery/content composition model, not an InkForge-owned article layout
  primitive.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi content-overlap state residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-content-overlap` appears in a class/id attribute.
- The rule must match only class/id attributes. It must not rely on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `ui-slider`,
  `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- `tn-content-overlap` must be diagnosed as content-overlap state residue instead of the generic
  Xiumi gallery state wrapper label. Other gallery state wrappers must remain blocked by
  `Xiumi SVG gallery state wrapper residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced content-overlap-only fixture reports the generic gallery state
  wrapper label before the rule split and the precise content-overlap state residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining gallery state wrapper fixture blocked by
  `Xiumi SVG gallery state wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 82. Xiumi Image Presenter Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor image
  presenter class `tn-image-presenter`.
- This class came from the applied Xiumi SVG sample DOM readback. It is editor image-presentation
  state from the Xiumi image-gallery composition model, not an InkForge-owned publishable image
  component.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi image presenter residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-image-presenter` appears in a class/id attribute.
- The rule must match only class/id attributes. It must not rely on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-child-position-*`, `tn-child-orientation-*`, `tn-content-overlap`, `ui-slider`,
  `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- `tn-image-presenter` must be diagnosed as image presenter residue instead of the generic
  Xiumi `tn-*` authoring tree label. Other `tn-page`, `tn-comp`, `tn-cell`, `tn-from-house`,
  `tn-theme-color-mask`, `tn-tpl`, and `tn-layer` authoring classes must remain blocked by
  `Xiumi tn-* authoring tree`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced image-presenter-only fixture reports the generic `tn-*` authoring
  tree label before the rule split and the precise image presenter residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep broader `tn-*` authoring-tree fixtures blocked by
  `Xiumi tn-* authoring tree`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 83. Xiumi Raw Image Cell Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor image
  cell class `raw-image`.
- This class came from the applied Xiumi SVG sample DOM readback. It is an authoring image-cell
  state emitted by the Xiumi layer/image pipeline, not an InkForge-owned publishable image
  component or class.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi raw image cell residue` for WeChat,
  Xiaohongshu, and Zhihu when `raw-image` appears in a class/id attribute.
- The rule must match only class/id attributes. It must not rely on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `tn-page-slot`, `tn-layer-slot`,
  `tn-child-position-*`, `tn-child-orientation-*`, `tn-image-presenter`, `tn-content-overlap`,
  `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- `raw-image` must be diagnosed as raw image cell residue instead of the generic Xiumi SVG layer
  slot label. `tn-page-slot`, `tn-layer-slot`, `tn-child-position-*`, and
  `tn-child-orientation-*` must remain blocked by `Xiumi SVG layer slot residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced raw-image-only fixture reports the generic layer-slot label before
  the rule split and the precise raw image cell residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep layer-slot fixtures blocked by `Xiumi SVG layer slot residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 84. Xiumi Image Instance Wrapper Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor image
  instance wrapper class `tn-image-inst-wrapper`.
- This wrapper came from the applied Xiumi SVG sample DOM readback. It is editor image-instance
  state from the Xiumi gallery/image-slot system, not an InkForge-owned publishable article
  wrapper.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi image instance wrapper residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-image-inst-wrapper` appears in a class/id attribute.
- The rule must match only class/id attributes. It must not rely on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-image-presenter`, `tn-content-overlap`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- `tn-image-inst-wrapper` must be diagnosed as image instance wrapper residue instead of the
  generic Xiumi gallery state wrapper label. Other gallery state wrappers must remain blocked by
  `Xiumi SVG gallery state wrapper residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced image-instance-wrapper-only fixture reports the generic gallery
  state wrapper label before the rule split and the precise image instance wrapper residue label
  after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining gallery state wrapper fixture blocked by
  `Xiumi SVG gallery state wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 85. Xiumi Overflow-Hidden State Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor
  overflow state class `tn-overflow-hidden`.
- This class came from the applied Xiumi SVG sample DOM readback. It is editor viewport/state
  residue from the Xiumi gallery/image-slot system, not an InkForge-owned publishable article
  class.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi overflow-hidden state residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-overflow-hidden` appears in a class/id attribute.
- The rule must match only the Xiumi-prefixed marker `tn-overflow-hidden`. It must not treat
  ordinary prose or generic CSS `overflow:hidden` as this specific market-editor residue.
- The rule must not rely on broader `tn-*`, `ng-*`, `opera-*`, `contenteditable`, hosted-media,
  SVG content-layer, `raw-image`, `tn-image-presenter`, `tn-content-overlap`,
  `tn-image-inst-wrapper`, `tn-page-vessel`, `tn-group-sortable-box`, `tn-sortable-pin`,
  `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- `tn-overflow-hidden` must be diagnosed as overflow-hidden state residue instead of the generic
  Xiumi gallery state wrapper label. Other gallery state wrappers must remain blocked by
  `Xiumi SVG gallery state wrapper residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced overflow-hidden-only fixture reports the generic gallery state
  wrapper label before the rule split and the precise overflow-hidden state residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining gallery state wrapper fixture blocked by
  `Xiumi SVG gallery state wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 86. Xiumi Page Vessel Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor page
  vessel class `tn-page-vessel`.
- This class came from the applied Xiumi SVG sample DOM readback. It is editor page/container state
  from the Xiumi gallery/image-slot system, not an InkForge-owned publishable article wrapper.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi page vessel residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-page-vessel` appears in a class/id attribute.
- The rule must match only class/id attributes containing the exact marker `tn-page-vessel`.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-group-sortable-box`,
  `tn-sortable-pin`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- `tn-page-vessel` must be diagnosed as page vessel residue instead of the generic Xiumi gallery
  state wrapper label. Existing broader `tn-*` authoring-tree fallback diagnostics may still
  accompany it and must continue blocking publishable output.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced page-vessel-only fixture reports the generic gallery state wrapper
  label before the rule split and the precise page vessel residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining gallery state wrapper fixture blocked by
  `Xiumi SVG gallery state wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 87. Xiumi Group Sortable Box Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor group
  sortable container class `tn-group-sortable-box`.
- This class came from the applied Xiumi SVG sample DOM readback. It is editor grouping and drag
  state from the Xiumi gallery/image-slot system, not an InkForge-owned publishable article
  wrapper.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi group sortable box residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-group-sortable-box` appears in a class/id attribute.
- The rule must match only class/id attributes containing the exact marker `tn-group-sortable-box`.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-sortable-pin`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- `tn-group-sortable-box` must be diagnosed as group sortable box residue instead of the generic
  Xiumi gallery state wrapper label. Other group wrappers such as `tn-group-box-wrapper` and
  `tn-group-fixed-box` must remain blocked by the generic gallery state wrapper rule.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced group-sortable-box-only fixture reports the generic gallery state
  wrapper label before the rule split and the precise group sortable box residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining gallery state wrapper fixture blocked by
  `Xiumi SVG gallery state wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 88. Xiumi Sortable Pin Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor
  sortable position class `tn-sortable-pin`.
- This class came from the applied Xiumi SVG sample DOM readback. It is editor sort/position state
  from the Xiumi gallery/image-slot system, not an InkForge-owned publishable article wrapper.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi sortable pin residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-sortable-pin` appears in a class/id attribute.
- The rule must match only class/id attributes containing the exact marker `tn-sortable-pin`.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`,
  `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- `tn-sortable-pin` must be diagnosed as sortable pin residue instead of the generic Xiumi gallery
  state wrapper label. Other gallery state wrappers must remain blocked by
  `Xiumi SVG gallery state wrapper residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced sortable-pin-only fixture reports the generic gallery state wrapper
  label before the rule split and the precise sortable pin residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining gallery state wrapper fixture blocked by
  `Xiumi SVG gallery state wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 89. Xiumi Quick Input Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor quick
  input classes `tn-quick-input`, `tn-quick-input-block`, or `tn-quick-input-comp`.
- These classes came from the applied Xiumi SVG sample DOM readback. They are editor quick-input
  controls from the Xiumi gallery/image-slot system, not InkForge-owned publishable article
  classes.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi quick input residue` for WeChat,
  Xiaohongshu, and Zhihu when any supported `tn-quick-input*` class appears in a class/id
  attribute.
- The rule must match only class/id attributes containing the exact quick-input family markers.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- `tn-quick-input*` must be diagnosed as quick input residue instead of the generic Xiumi gallery
  state wrapper label. Other gallery state wrappers must remain blocked by
  `Xiumi SVG gallery state wrapper residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced quick-input-only fixture reports the generic gallery state wrapper
  label before the rule split and the precise quick input residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining gallery state wrapper fixture blocked by
  `Xiumi SVG gallery state wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 90. Xiumi State Toggle Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor state
  toggle classes `tn-state-active` or `tn-state-frozen`.
- These classes came from the applied Xiumi SVG sample DOM readback. They are editor selection and
  frozen-state controls from the Xiumi gallery/image-slot system, not InkForge-owned publishable
  article classes.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi state toggle residue` for WeChat,
  Xiaohongshu, and Zhihu when any supported `tn-state-*` toggle appears in a class/id attribute.
- The rule must match only class/id attributes containing the exact state-toggle family markers.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- `tn-state-*` toggles must be diagnosed as state toggle residue instead of the generic Xiumi
  gallery state wrapper label. Other gallery state wrappers must remain blocked by
  `Xiumi SVG gallery state wrapper residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced state-toggle-only fixture reports the generic gallery state wrapper
  label before the rule split and the precise state toggle residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining gallery state wrapper fixture blocked by
  `Xiumi SVG gallery state wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 91. Xiumi Editing State Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi applied-editor editing
  state classes `tn-on-editing`, `tn-on-child-editing`, `tn-on-son-editing`, or
  `tn-on-multi-select`.
- These classes came from the applied Xiumi SVG sample DOM readback. They are editor focus,
  child-editing, and selection state controls from the Xiumi gallery/image-slot system, not
  InkForge-owned publishable article classes.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi editing state residue` for WeChat,
  Xiaohongshu, and Zhihu when any supported `tn-on-*` editing-state marker appears in a class/id
  attribute.
- The rule must match only class/id attributes containing the exact editing-state family markers.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`, `tn-state-*`, `ui-slider`,
  `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- `tn-on-*` editing-state markers must be diagnosed as editing state residue instead of the
  generic Xiumi gallery state wrapper label. Remaining in-cell and group wrappers must stay
  blocked by their own precise residue rules.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced editing-state-only fixture reports the generic gallery state
  wrapper label before the rule split and the precise editing state residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining in-cell and group wrapper fixtures blocked by precise
  Xiumi residue labels.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 92. Xiumi In-Cell Active State Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor
  in-cell active state class `tn-in-cell-state-active`.
- This class came from the applied Xiumi SVG sample DOM readback. It is editor cell selection
  state from the Xiumi gallery/image-slot system, not an InkForge-owned publishable article
  class.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi in-cell active state residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-in-cell-state-active` appears in a class/id attribute.
- The rule must match only class/id attributes containing the exact `tn-in-cell-state-active`
  marker.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`, `tn-state-*`, `tn-on-*`,
  `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- `tn-in-cell-state-active` must be diagnosed as in-cell active state residue instead of the
  generic Xiumi gallery state wrapper label. Remaining group wrappers such as
  `tn-group-box-wrapper` and `tn-group-fixed-box` must stay blocked by
  `Xiumi group box wrapper residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced in-cell-active-only fixture reports the generic gallery state
  wrapper label before the rule split and the precise in-cell active state residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the remaining group wrapper fixture blocked by
  `Xiumi group box wrapper residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 93. Xiumi Group Box Wrapper Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi applied-editor group box
  wrapper classes `tn-group-box-wrapper` or `tn-group-fixed-box`.
- These classes came from the applied Xiumi SVG sample DOM readback. They are editor grouping and
  fixed-box wrappers from the Xiumi gallery/image-slot system, not InkForge-owned publishable
  article wrappers.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi group box wrapper residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-group-box-wrapper` or `tn-group-fixed-box` appears in a class/id
  attribute.
- The rule must match only class/id attributes containing the exact supported group-box wrapper
  markers.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`, `tn-state-*`, `tn-on-*`,
  `tn-in-cell-state-active`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`,
  `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- `tn-group-box-wrapper` and `tn-group-fixed-box` must be diagnosed as group box wrapper residue
  instead of the generic Xiumi gallery state wrapper label. This completes the current
  `tn-*` gallery state-wrapper split; no remaining concrete marker in this family should require
  the old generic `Xiumi SVG gallery state wrapper residue` label.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced group-box-wrapper-only fixture reports the generic gallery state
  wrapper label before the rule split and the precise group box wrapper residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the previous aggregate gallery fixture blocked by the precise
  `Xiumi group box wrapper residue` label.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 94. Xiumi Page Layer Slot Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi applied-editor page/layer
  slot classes `tn-page-slot` or `tn-layer-slot`.
- These classes came from the applied Xiumi SVG sample DOM readback. They are editor page/layer
  slot wrappers from the Xiumi image/layer system, not InkForge-owned publishable article
  wrappers.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi page layer slot residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-page-slot` or `tn-layer-slot` appears in a class/id attribute.
- The rule must match only class/id attributes containing the exact supported page/layer slot
  markers.
- The reduced fixture must not rely on other Xiumi markers such as `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`, `tn-state-*`, `tn-on-*`,
  `tn-in-cell-state-active`, `tn-group-box-wrapper`, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- `tn-page-slot` and `tn-layer-slot` must be diagnosed as page layer slot residue instead of the
  generic Xiumi SVG layer slot label. Child position/orientation wrappers such as
  `tn-child-position-absolute`, `tn-child-position-static`, `tn-child-orientation-fixed`, and
  `tn-child-orientation-flow-canvas` must be handled by the child layer state rule below.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced page/layer-slot-only fixture reports the generic layer slot label
  before the rule split and the precise page layer slot residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the previous aggregate layer-state fixture blocked by
  `Xiumi child layer state residue` through child position/orientation markers.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 95. Xiumi Child Layer State Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi applied-editor child
  layer positioning/orientation classes: `tn-child-position-absolute`,
  `tn-child-position-static`, `tn-child-orientation-fixed`, or
  `tn-child-orientation-flow-canvas`.
- These classes came from the applied Xiumi SVG/image-layer sample DOM readback. They are editor
  layer state metadata used to place child cells inside the Xiumi canvas, not InkForge-owned
  publishable article classes.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi child layer state residue` for WeChat,
  Xiaohongshu, and Zhihu when any supported child position/orientation marker appears in a
  class/id attribute.
- The rule must match only class/id attributes containing the exact supported child layer state
  markers.
- The reduced fixture must not rely on other Xiumi markers such as `tn-page-slot`,
  `tn-layer-slot`, `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG content-layer,
  `raw-image`, `tn-image-presenter`, `tn-content-overlap`, `tn-image-inst-wrapper`,
  `tn-overflow-hidden`, `tn-page-vessel`, `tn-group-sortable-box`, `tn-sortable-pin`,
  `tn-quick-input*`, `tn-state-*`, `tn-on-*`, `tn-in-cell-state-active`,
  `tn-group-box-wrapper`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`,
  `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- `tn-child-position-*` and `tn-child-orientation-*` class markers must be diagnosed as child
  layer state residue instead of the generic `Xiumi SVG layer slot residue` label. This closes the
  current layer-slot split after the page/layer slot rule.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced child-layer-state-only fixture reports the generic layer slot label
  before the rule split and the precise child layer state residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the aggregate child-layer-state plus `raw-image` fixture blocked by
  the precise `Xiumi child layer state residue` label without relying on page/layer slot classes.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 96. Xiumi Placeholder Metadata Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi applied-editor
  placeholder attribute `tn-placeholder`.
- This attribute came from the applied Xiumi SVG carousel/text-cell sample DOM readback. It stores
  editor prompt text such as "click edit"; it is not publishable article copy or InkForge-owned
  semantic metadata.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi placeholder metadata residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-placeholder` appears as an attribute marker.
- The rule must not require `tn-yzk-font-*`, `tn-cell`, flow-canvas, Angular, opera runtime,
  editable surface, hosted media, SVG content-layer, `raw-image`, page/layer slots, or any other
  market-editor marker to fire.
- `tn-placeholder` must be diagnosed as placeholder metadata residue instead of only the generic
  text-authoring label. `tn-yzk-font-*` is covered by `Xiumi yzk font metadata residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced placeholder-only fixture reports only the old
  text-authoring/generic labels before the rule split and the precise placeholder metadata residue
  label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing carousel fixture reporting
  `Xiumi yzk font metadata residue` through `tn-yzk-font-*` after the placeholder split.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 97. Xiumi YZK Font Metadata Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi `tn-yzk-font-*`
  attribute or marker.
- This marker came from the applied Xiumi SVG carousel/text-cell sample DOM readback. It stores
  editor font resource binding state and must not enter InkForge publishable output.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi yzk font metadata residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-yzk-font-*` appears as an attribute marker.
- The rule must not require `tn-placeholder`, `tn-cell`, flow-canvas, Angular, opera runtime,
  editable surface, hosted media, SVG content-layer, `raw-image`, page/layer slots, or any other
  market-editor marker to fire.
- The old generic `Xiumi text authoring metadata` bucket must no longer be required for the
  placeholder/font split. Placeholder and yzk font metadata have separate executable labels.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced yzk-font-only fixture reports only the old text-authoring/generic
  labels before the rule rename and the precise yzk font metadata residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing carousel fixture reporting
  `Xiumi yzk font metadata residue` after the rename.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 98. Xiumi Disabled Control Binding Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi `disable-tn-*`
  attribute.
- This marker came from the applied Xiumi editor runtime sample DOM readback. It represents editor
  control-state gating such as disabling a Xiumi group flex box control, not publishable article
  semantics.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi disabled control binding residue` for WeChat,
  Xiaohongshu, and Zhihu when `disable-tn-*` appears as an attribute marker.
- The rule must not require `opera-tn-ra-*`, `tn-*`, Angular, opera runtime path readbacks,
  editable surface, hosted media, SVG content-layer, `raw-image`, page/layer slots, or any other
  market-editor marker to fire.
- `disable-tn-*` must be diagnosed as disabled control binding residue instead of only the generic
  runtime label. `opera-tn-ra-comp` and `opera-tn-ra-cell` are split into source-specific runtime
  path binding residue labels by section 116.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced disable-only fixture reports only the old runtime/generic labels
  before the rule split and the precise disabled control binding residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing runtime-binding fixture reporting the section 116
  source-specific `opera-tn-ra-*` labels after the split.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 99. Xiumi Component Authoring Tree Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi component authoring
  class such as `tn-comp`, `tn-comp-inst`, `tn-comp-top-level`, `tn-comp-pin`,
  `tn-comp-style-pin`, or other `tn-comp-*` class/id markers.
- These markers came from the applied Xiumi component/canvas DOM readbacks. They are editor
  component tree wrappers, not InkForge-owned publishable article wrappers.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component authoring tree residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-comp` or `tn-comp-*` appears in a class/id attribute.
- The rule must not require `tn-page`, `tn-cell`, `tn-tpl`, hosted media, Angular, opera runtime,
  SVG content-layer, page/layer slots, or any other market-editor marker to fire.
- `tn-comp*` class/id markers must be diagnosed as component authoring tree residue instead of
  only the generic `Xiumi tn-* authoring tree` label. The remaining page/tpl/layer/from-house
  tree markers stay covered by `Xiumi tn-* authoring tree` until split by narrower rules.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-comp-inst` fixture reports the old generic authoring tree label
  before the rule split and the precise component authoring tree residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed 135/Xiumi fixture reporting the precise
  component authoring tree and cell container authoring labels after both splits.
- Regression tests must update Xiumi applied SVG wrapper expectations to the precise component
  authoring tree label when the sample only carries `tn-comp*` authoring classes.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 100. Xiumi Cell Container Authoring Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi cell/container class
  such as `tn-cell`, `tn-cell-inst`, `tn-cell-image`, `tn-cell-text`, `tn-cell-group`, or other
  `tn-cell-*` class/id markers.
- These markers came from the applied Xiumi card, text-cell, image-cell, and SVG gallery DOM
  readbacks. They describe editor-side cell containers, not InkForge-owned publishable article
  structure.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi cell container authoring residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-cell` or `tn-cell-*` appears in a class/id attribute.
- The rule must not require `tn-comp`, `tn-page`, `tn-tpl`, hosted media, Angular, opera runtime,
  SVG content-layer, page/layer slots, or any other market-editor marker to fire.
- The rule must not absorb attribute-only markers such as `tn-cell-type`; those remain covered by
  the component-binding attribute rule.
- `tn-cell*` class/id markers must be diagnosed as cell container authoring residue instead of
  only the generic `Xiumi tn-* authoring tree` label. The broader generic rule remains for
  page/tpl/from-house/theme tree markers that are not yet split.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-cell tn-cell-group` fixture reports the old generic authoring
  tree label before the rule split and the precise cell container authoring residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed 135/Xiumi fixture reporting the precise component
  authoring tree and cell container authoring labels after the split.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 101. Xiumi Layer Authoring Tree Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi layer authoring class
  such as `tn-layer`, `tn-layer-absolute`, or other `tn-layer-*` class/id markers, excluding the
  already split `tn-layer-slot` marker.
- These markers came from the applied Xiumi SVG/H5 layered editor DOM readbacks. They describe
  editor-side layering containers and absolute-positioning authoring state, not InkForge-owned
  publishable article structure.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi layer authoring tree residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-layer` or `tn-layer-*` appears in a class/id attribute.
- The rule must not require `tn-comp`, `tn-cell`, `tn-page`, `tn-tpl`, hosted media, Angular,
  opera runtime, SVG content-layer, page/layer slots, or any other market-editor marker to fire.
- The rule must not absorb `tn-layer-slot`; that marker remains covered by the existing
  `Xiumi page layer slot residue` rule.
- `tn-layer*` class/id markers must be diagnosed as layer authoring tree residue instead of only
  the generic `Xiumi tn-* authoring tree` label. The broader generic rule remains for
  tpl/from-house/theme tree markers that are not yet split.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-layer tn-layer-absolute` fixture reports the old generic
  authoring tree label before the rule split and the precise layer authoring tree residue label
  after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing `tn-page-slot` / `tn-layer-slot` fixture reporting
  `Xiumi page layer slot residue` after the layer split.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 102. Xiumi Page Authoring Tree Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi page authoring class
  such as `tn-page`, `tn-page-root`, or other `tn-page-*` class/id markers, excluding the already
  split `tn-page-slot` and `tn-page-vessel` markers.
- These markers came from the applied Xiumi page/root editor DOM readbacks. They describe
  editor-side page containers and authoring state, not InkForge-owned publishable article
  structure.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi page authoring tree residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-page` or `tn-page-*` appears in a class/id attribute.
- The rule must not require `tn-comp`, `tn-cell`, `tn-layer`, `tn-tpl`, hosted media, Angular,
  opera runtime, SVG content-layer, page/layer slots, or any other market-editor marker to fire.
- The rule must not absorb `tn-page-slot` or `tn-page-vessel`; those markers remain covered by
  `Xiumi page layer slot residue` and `Xiumi page vessel residue` respectively.
- `tn-page*` class/id markers must be diagnosed as page authoring tree residue instead of only
  the generic `Xiumi tn-* authoring tree` label. The broader generic rule remains for
  from-house/theme tree markers that are not yet split.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-page tn-page-root` fixture reports the old generic authoring
  tree label before the rule split and the precise page authoring tree residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing `tn-page-slot` / `tn-layer-slot` fixture reporting
  `Xiumi page layer slot residue` after the page split.
- Regression tests must keep the existing `tn-page-vessel` fixture reporting
  `Xiumi page vessel residue` after the page split.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 103. Xiumi Template Authoring Tree Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi template authoring
  class such as `tn-tpl`, `tn-tpl-card`, or other `tn-tpl-*` class/id markers.
- These markers came from the applied Xiumi template/card editor DOM readbacks. They describe
  editor-side template assembly containers, not InkForge-owned publishable article structure.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi template authoring tree residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-tpl` or `tn-tpl-*` appears in a class/id attribute.
- The rule must not require `tn-comp`, `tn-cell`, `tn-layer`, `tn-page`, hosted media, Angular,
  opera runtime, SVG content-layer, renderer-pipeline attributes, or any other market-editor marker
  to fire.
- The rule must not replace `Xiumi template renderer pipeline residue`; Angular/renderer
  attributes such as `ng-bind-html`, `ng-click`, `ng-switch`, and `tn-tpl-pose-fit-box` remain
  covered by that existing pipeline rule.
- `tn-tpl*` class/id markers must be diagnosed as template authoring tree residue instead of only
  the generic `Xiumi tn-* authoring tree` label. The broader generic rule remains for
  theme tree markers that are not yet split.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-tpl tn-tpl-card` fixture reports the old generic authoring
  tree label before the rule split and the precise template authoring tree residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing template renderer pipeline fixture reporting
  `Xiumi template renderer pipeline residue` after the template authoring tree split.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 104. Xiumi Source-House Authoring Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi source-house class such
  as `tn-from-house`, `tn-from-house-template`, or other `tn-from-house-*` class/id markers.
- These markers represent editor/template-source ownership metadata from Xiumi material insertion,
  not InkForge-owned publishable article structure.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi source-house authoring residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-from-house` or `tn-from-house-*` appears in a class/id
  attribute.
- The rule must not require `tn-comp`, `tn-cell`, `tn-layer`, `tn-page`, `tn-tpl`, hosted media,
  Angular, opera runtime, SVG content-layer, or any other market-editor marker to fire.
- `tn-from-house*` class/id markers must be diagnosed as source-house authoring residue instead of
  only the generic `Xiumi tn-* authoring tree` label.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-from-house tn-from-house-template` fixture reports the old
  generic authoring tree label before the rule split and the precise source-house authoring
  residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 105. Xiumi Theme Color Mask Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains a Xiumi theme color mask class
  such as `tn-theme-color-mask`, `tn-theme-color-mask-active`, or other
  `tn-theme-color-mask-*` class/id markers.
- These markers represent Xiumi editor-side theme color overlay/mask controls, not InkForge-owned
  publishable article styling.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi theme color mask residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-theme-color-mask` or `tn-theme-color-mask-*` appears in a
  class/id attribute.
- The rule must not require `tn-comp`, `tn-cell`, `tn-layer`, `tn-page`, `tn-tpl`,
  `tn-from-house`, hosted media, Angular, opera runtime, SVG content-layer, or any other
  market-editor marker to fire.
- The legacy `Xiumi tn-* authoring tree` active rule is fully decomposed by the component, cell,
  layer, page, template, source-house, and theme-color-mask residue rules. Future new Xiumi
  authoring-tree families must get source-specific labels instead of restoring a broad bucket.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-theme-color-mask tn-theme-color-mask-active` fixture reports
  the old generic authoring tree label before the rule split and the precise theme color mask
  residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the source-house fixture reporting
  `Xiumi source-house authoring residue` after the theme-color-mask split.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 106. Xiumi Component Template Binding Residue - 2026-06-25

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi component-template
  binding attributes such as `tn-bind-comp-tpl-id` or `tn-bind-comp-index`.
- These attributes are Xiumi editor/runtime metadata for binding a selected component instance to
  a template definition or list index. They are not InkForge-owned publishable article semantics.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component template binding residue` for
  WeChat, Xiaohongshu, and Zhihu when `tn-bind-comp-tpl-id` or `tn-bind-comp-index` appears as an
  attribute name.
- A reduced fixture containing only `tn-bind-comp-tpl-id` / `tn-bind-comp-index` must not be
  reported as the broader `Xiumi component binding attribute residue`.
- The broader component-binding attribute rule remains responsible for other editor/runtime
  attributes such as `tn-comp`, `tn-comp-role`, `tn-uuid`, `tn-animate`, `tn-cell-type`,
  `tn-child-position`, `tn-page-stage-size`, `tn-link`, and `tn-image-usage`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-bind-comp-tpl-id` / `tn-bind-comp-index` fixture reports only
  the old broad component-binding label before the split and the precise component-template
  binding residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting
  `Xiumi component binding attribute residue` after `tn-bind-comp-*` moves to a narrower rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 107. Xiumi Component Identity Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi component identity
  attribute `tn-uuid`.
- This attribute identifies an editor-side component instance. It is not InkForge-owned
  publishable article structure and must not remain in WeChat, Xiaohongshu, or Zhihu output.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component identity metadata residue` for
  WeChat, Xiaohongshu, and Zhihu when `tn-uuid` appears as an attribute name.
- A reduced fixture containing only `tn-uuid` must not be reported as the broader
  `Xiumi component binding attribute residue`.
- The broader component-binding attribute rule remains responsible for other editor/runtime
  attributes such as `tn-comp`, `tn-comp-role`, `tn-comp-index`, `tn-comp-pose`, `tn-animate`,
  `tn-cell-type`, `tn-child-position`, `tn-page-stage-size`, `tn-link`, and `tn-image-usage`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-uuid` fixture reports only the old broad component-binding
  label before the split and the precise component-identity metadata residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting
  `Xiumi component binding attribute residue` after `tn-uuid` moves to a narrower rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 108. Xiumi Animation Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi animation binding
  attributes such as `tn-animate` or `tn-animate-on-self`.
- These attributes bind editor-side component/layer animation state. They are not InkForge-owned
  publishable article semantics and are especially risky when copied from SVG/H5 effect editors.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi animation binding metadata residue` for
  WeChat, Xiaohongshu, and Zhihu when `tn-animate` or `tn-animate-on-self` appears as an attribute
  name.
- A reduced fixture containing only `tn-animate` / `tn-animate-on-self` must not be reported as
  the broader `Xiumi component binding attribute residue`.
- The broader component-binding attribute rule remains responsible for other editor/runtime
  attributes such as `tn-comp`, `tn-comp-role`, `tn-comp-index`, `tn-comp-pose`, `tn-cell-type`,
  `tn-child-position`, `tn-page-stage-size`, `tn-link`, and `tn-image-usage`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-animate` / `tn-animate-on-self` fixture reports only the old
  broad component-binding label before the split and the precise animation-binding metadata
  residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting
  `Xiumi component binding attribute residue` after animation binding attributes move to a
  narrower rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 109. Xiumi Link Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi link binding
  attribute `tn-link`.
- This attribute points to editor-side link configuration objects such as `cell.link`. Publishable
  output must contain concrete platform-safe link markup instead of this editor binding metadata.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi link binding metadata residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-link` appears as an attribute name.
- A reduced fixture containing only `tn-link` must not be reported as the broader
  `Xiumi component binding attribute residue`.
- The broader component-binding attribute rule remains responsible for other editor/runtime
  attributes such as `tn-comp`, `tn-comp-role`, `tn-comp-index`, `tn-comp-pose`, `tn-cell-type`,
  `tn-child-position`, `tn-page-stage-size`, and `tn-image-usage`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-link` fixture reports only the old broad component-binding
  label before the split and the precise link-binding metadata residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting
  `Xiumi component binding attribute residue` after `tn-link` moves to a narrower rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 110. Xiumi Image Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi image binding attributes
  such as `tn-image` or `tn-image-usage`.
- These attributes describe editor-side image/material usage configuration. They are distinct from
  publishable `<img src=...>` markup and from already split image wrapper classes such as
  `tn-image-inst-wrapper`, `tn-image-presenter`, or `raw-image`.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi image binding metadata residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-image` or `tn-image-usage` appears as an attribute name.
- A reduced fixture containing only `tn-image` / `tn-image-usage` must not be reported as the
  broader `Xiumi component binding attribute residue`.
- The broader component-binding attribute rule remains responsible for the still-unsplit
  editor/runtime attributes such as `tn-cell`, `tn-cell-type`, `tn-child-position`,
  `tn-child-orientation`, `tn-page-stage-size`, `tn-page-view-box-editor-desktop`,
  `tn-page-cache-gatherer`, and `tn-atom-context`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-image` / `tn-image-usage` fixture reports only the old broad
  component-binding label before the split and the precise image-binding metadata residue label
  after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting
  `Xiumi component binding attribute residue` after image binding attributes move to a narrower
  rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 111. Xiumi Component Structure Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi component-structure
  binding attributes such as `tn-comp`, `tn-comp-role`, `tn-comp-index`, or `tn-comp-pose`.
- These attributes bind editor-side component instances, pose, role, and ordering state. They are
  distinct from publishable component wrapper classes and must not remain in WeChat,
  Xiaohongshu, or Zhihu output.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi component structure binding metadata residue` for WeChat, Xiaohongshu, and Zhihu when
  `tn-comp`, `tn-comp-role`, `tn-comp-index`, or `tn-comp-pose` appears as an attribute name.
- A reduced fixture containing only `tn-comp` / `tn-comp-role` / `tn-comp-index` /
  `tn-comp-pose` must not be reported as the broader
  `Xiumi component binding attribute residue`.
- The broader component-binding attribute rule remains responsible only for the still-unsplit
  editor/runtime attribute `tn-atom-context`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-comp*` binding fixture reports only the old broad
  component-binding label before the split and the precise component-structure metadata residue
  label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting
  `Xiumi component binding attribute residue` after `tn-comp*` binding attributes move to a
  narrower rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 120. Xiumi Operator Dock Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains operator-dock or external
  component-editing controls observed after a live CloakBrowser template click changed the center
  paper, such as `op-dock`, `out-comp-edit-dock`, `out-comp-edit-panel`, `out-comp-op`,
  `op-ce-layout-carousel`, `op-cp-pose`, `op-overlap-board`, `bg-group-edit-container`,
  `cell-group-edit-container`, `cell-group-panel`, `horizontal-layout-tip`,
  `general-option-panel`, `menu-style-input`, or `svg-animation-assistant`.
- These controls are Xiumi authoring UI for selected components, image sets, carousel/SVG action
  parameters, hit-area assistants, and panel state. They may inform InkForge-owned layout reports,
  action schemas, image-slot manifests, and static/raster fallbacks, but they are not publishable
  article DOM for WeChat, Xiaohongshu, or Zhihu.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi operator dock control residue` for WeChat,
  Xiaohongshu, and Zhihu when the supported operator-dock / external-edit-panel markers appear in
  class/id attributes.
- A reduced fixture containing only those operator-control classes must fail even when broad
  `tn-*`, `ng-*`, `opera-tn-*`, `op-loader`, `contenteditable`, hosted media, SVG content-layer,
  `ui-slider`, `ui-sortable`, `touch-action`, and `user-select` markers are absent.
- This rule is additive and source-specific. It must not alter renderer output, style
  availability, selectable actions, release-gate success accounting, clipboard behavior, account
  state, upload, sync, schedule, public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced operator-control fixture fails before implementation and reports
  `Xiumi operator dock control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operation panel loader residue`, `Xiumi UI slider control
  residue`, `Xiumi sortable control residue`, and the existing `tn-*` state wrappers independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 123. Xiumi Operator Depot Item Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains operator-depot/menu item controls
  observed in a live CloakBrowser Xiumi v5 paper-editor readback after a visible template/style
  changed the center paper, such as `op-dc-depot`, `op-dc-hidden`, `op-dc-slot`, `ce-dc`,
  `cp-dc`, `dc-ce-*`, `dc-cp-*`, `dc-multi-cp-*`, `op-gl-dc-attr-bars`, `cp-role-*`,
  `ce-type-*`, or `tn-op-dc-item`.
- These controls are Xiumi authoring UI for operator menu bars and hidden operation-item depots.
  They may describe how the editor exposes margin, background, image, SVG, animation, clipboard,
  and component actions, but they are not publishable article DOM for WeChat, Xiaohongshu, or
  Zhihu.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi operator depot item residue` for WeChat,
  Xiaohongshu, and Zhihu when supported operator-depot class/id markers or `tn-op-dc-item`
  attributes appear.
- A reduced fixture containing only the depot/item children must fail even when `op-dock`,
  `out-comp-*`, `op-loader`, broad `tn-*` trees, broad `ng-*` attributes/classes, `opera-tn-*`,
  `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`,
  and `user-select` markers are absent.
- This rule must stay anchored to Xiumi operation item names and must not match generic `slot`,
  `menu`, `bar`, `dc`, or `cp` words in prose or unrelated HTML.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced operator-depot fixture fails before implementation and reports
  `Xiumi operator depot item residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operator dock control residue`,
  `Xiumi selection overlay control residue`, `Xiumi operation panel loader residue`, and the
  generic `Xiumi tn-* attribute` fallback independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 124. Xiumi Worker Surface Crop Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains worker-surface or crop-control
  classes observed in a live CloakBrowser Xiumi v5 paper-editor readback, such as
  `op-worker-surface`, `op-worker-block-gesture`, `crop-mask`, `crop-box`, or `crop-handle`.
- These controls are Xiumi authoring UI for image crop masks, crop boxes, and gesture-blocking
  work surfaces. They are not article content, style semantics, or platform-safe SVG/HTML.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi worker surface crop control residue` for
  WeChat, Xiaohongshu, and Zhihu when supported worker-surface or crop-control classes appear.
- A reduced fixture containing only the worker/crop controls must fail even when selection-overlay
  wrappers, operator-dock parents, operator depot items, `op-loader`, broad `tn-*` trees, broad
  `ng-*` attributes/classes, `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer,
  `ui-slider`, `ui-sortable`, `touch-action`, and `user-select` markers are absent.
- This rule must stay anchored to Xiumi worker/crop class names and must not match generic
  `bar`, `handle`, `mask`, or `box` words unless the source-specific crop/worker markers are
  present.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced worker-surface/crop fixture fails before implementation and reports
  `Xiumi worker surface crop control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi selection overlay control residue`,
  `Xiumi operator depot item residue`, `Xiumi operator dock control residue`, and
  `Xiumi interaction style residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 171. Xiumi Crop Panel Child Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains crop-panel child
  controls observed in a live CloakBrowser DOM readback as `crop-panel`, `crop-attr-menu`,
  `crop-ratio-item`, or `crop-image`.
- These controls drive editor-side image cropping, crop-ratio selection, cover/article image crop
  menus, and crop preview image surfaces. They are not article body DOM and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove crop correctness,
  paste, phone preview, schedule, sync, upload, cover thumbnail acceptance, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi crop panel child control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported crop-panel
  child markers.
- A reduced fixture containing only `crop-panel`, `crop-attr-menu`, `crop-ratio-item`, and
  `crop-image` must fail after worker-surface cleanup even when `crop-mask`, `crop-box`,
  `crop-handle`, `op-worker-surface`, `op-worker-block-gesture`, selection-overlay controls,
  operator/depot controls, paper auxiliary tree controls, Angular runtime attributes, hosted
  media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary crop, image, panel, ratio, cover, editor, or template
  wording by itself; the trigger is the source-specific class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced crop-panel fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi crop panel child control residue`
  after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi worker surface crop control residue` and
  `Xiumi selection overlay control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, cover thumbnail
  acceptance, or publish success.

## 172. Xiumi Background Attribute Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains background-attribute
  controls observed in live CloakBrowser DOM readbacks as `bg-attr-menu`, `bg-repeat-select`,
  `bg-attach-check`, `ce-op-background`, or `op-cp-bg-bar`.
- These controls drive editor-side background image repeat, attachment, and background operation
  menus. They can inform InkForge-owned background layout reports, but they are not article body
  DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove background rendering,
  paste, phone preview, schedule, sync, upload, cover thumbnail acceptance, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi background attribute control residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported
  background-attribute markers.
- A reduced fixture containing only `bg-attr-menu`, `bg-repeat-select`, `bg-attach-check`,
  `ce-op-background`, or a later cleaned-down `op-cp-bg-bar` child marker must fail after
  crop-panel cleanup even when crop-panel child controls,
  worker-surface crop controls, selection-overlay controls, attribute-board controls,
  operator/depot controls, paper auxiliary tree controls, Angular runtime attributes, hosted
  media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary background CSS, image, repeat, attach, cover, editor, or
  template wording by itself; the trigger is the source-specific class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced background-attribute fixture fails before implementation because
  no market-editor-residue issue is emitted, then reports
  `Xiumi background attribute control residue` after the detector update.
- Use TDD again for later cleaned-down child controls such as `op-cp-bg-bar` instead of relying
  on the parent background fixture to mask coverage gaps.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi attribute board control residue` and
  `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, cover thumbnail
  acceptance, or publish success.

## 173. Xiumi Animation Attribute Panel Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains animation attribute
  panel controls observed in a live CloakBrowser DOM readback as `op-comp-animation-attr-board`,
  `op-attr-view-cp-animation`, `op-attr-view-cp-animation-*`, or `anim-selector-x`.
- These controls drive editor-side animation effect selection, direction, duration, delay, loop
  count, easing, animation extraction, and animation clipboard surfaces. They can inform
  InkForge-owned motion/action schemas, but they are not article body DOM and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi animation attribute panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported animation
  attribute panel markers.
- A reduced fixture containing only `op-comp-animation-attr-board`,
  `op-attr-view-cp-animation`, and `anim-selector-x` must fail after background-attribute cleanup
  even when attribute-board controls, operator-depot controls, operator-dock controls,
  crop/background controls, paper auxiliary tree controls, Angular runtime attributes, hosted
  media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary animation wording, CSS animation properties, SVG
  `<animate>` elements, or motion-related article text by itself; the trigger is the
  source-specific Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced animation-panel fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi animation attribute panel residue`
  after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi attribute board control residue`,
  `Xiumi operator depot item residue`, and `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 174. Xiumi Animation Panel Child Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains animation-panel child
  controls observed in a live CloakBrowser DOM readback as `anim-unit-container`,
  `anim-item-list`, `anim-unit-box`, `anim-clipboard`, `anim-title-bar`, or `anim-content`.
- These controls are the nested editor-side animation list, title, unit, and clipboard surfaces
  below the animation attribute panel. They can inform InkForge-owned motion/action schemas, but
  they are not article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable
  output.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi animation panel child residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains one of the supported animation
  child-control markers.
- A reduced fixture containing only `anim-unit-container`, `anim-item-list`, `anim-title-bar`,
  `anim-unit-box`, and `anim-clipboard` must fail after animation-attribute-panel cleanup even
  when `op-comp-animation-attr-board`, `op-attr-view-cp-animation*`, `anim-selector-x`,
  attribute-board controls, operator-depot controls, operator-dock controls, crop/background
  controls, paper auxiliary tree controls, Angular runtime attributes, hosted media, sidebar
  controls, and meta panels are absent.
- The detector must not block ordinary animation wording, CSS animation properties, SVG
  `<animate>` elements, or motion-related article text by itself; the trigger is the
  source-specific Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced animation-child fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi animation panel child residue` after
  the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi animation attribute panel residue` and
  `Xiumi operator depot item residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 175. Xiumi Attribute Stack Panel Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains attribute stack panel
  controls observed in a live CloakBrowser DOM readback as `tn-attribute-stack-panel-root` or
  `tn-attribute-stack-panel`.
- These controls are editor-side attribute panel containers for the stacked property UI. They can
  inform InkForge-owned style schemas, but they are not article body DOM and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi attribute stack panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `tn-attribute-stack-panel-root` or
  `tn-attribute-stack-panel`.
- A reduced fixture containing only `tn-attribute-stack-panel-root` and
  `tn-attribute-stack-panel` must fail after attribute-board cleanup even when
  `tn-attribute-board-entry`, `tn-attr-assemble-tabs`, `op-attr-*`, generated-link controls,
  operator-depot controls, operator-dock controls, Angular runtime attributes, hosted media,
  sidebar controls, and meta panels are absent.
- The detector must not block ordinary attribute wording, stack wording, panel wording, style
  article text, or non-Xiumi class names by itself; the trigger is the source-specific Xiumi
  `tn-attribute-stack-panel*` marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced attribute-stack fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi attribute stack panel residue` after
  the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi attribute board control residue` and
  `Xiumi generated link control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 176. Xiumi Animate Operation Panel Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the animation
  operation-button panel observed in a live CloakBrowser DOM readback as `animate-op-btn-panel`.
- This control hosts editor-side action extraction controls such as the visible `提取动作` surface.
  It can inform InkForge-owned motion/action schemas, but it is not article body DOM and must not
  appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi animate operation panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `animate-op-btn-panel`.
- A reduced fixture containing only `animate-op-btn-panel` must fail after animation-panel-child
  cleanup even when `anim-unit-*`, `anim-item-list`, `anim-title-bar`,
  `op-comp-animation-attr-board`, `op-attr-view-cp-animation*`, `anim-selector-x`,
  top-operation buttons, paper auxiliary tree controls, Angular runtime attributes, hosted media,
  sidebar controls, and meta panels are absent.
- `animate-op-btn-panel` must not be misclassified as `Xiumi top operation button residue`; the
  top-operation detector must match `op-btn*` as a class/id token rather than as a hyphen-delimited
  substring inside another vendor class.
- The detector must not block ordinary animate/action wording, button wording, panel wording,
  SVG `<animate>` elements, or motion-related article text by itself; the trigger is the
  source-specific Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced animate-operation fixture fails before implementation because it
  reports the broader `Xiumi top operation button residue` label instead of the exact
  `Xiumi animate operation panel residue` label.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi top operation button residue`,
  `Xiumi animation panel child residue`, and `Xiumi animation attribute panel residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 179. Xiumi Animation Style Picker Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains animation style picker
  child controls observed in a live CloakBrowser DOM readback, such as `anim-desc`,
  `anim-expand-bottom`, `anim-icon`, `anim-style`, `anim-styles`, `animate-styles-type`, and
  `animate-general`.
- The live page exposes these markers around editor-side animation effect groups such as text,
  entrance, emphasis, exit, and custom path choices. They are not article body DOM and must not
  appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi animation style picker residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `anim-desc`,
  `anim-expand-bottom`, `anim-icon`, `anim-style`, `anim-styles`, `animate-styles-type`, or
  `animate-general`.
- A reduced fixture containing only those style picker markers must fail after animation-list
  cleanup even when `anim-item-list`, `anim-unit-*`, `anim-title-bar`,
  `op-comp-animation-attr-board`, `op-attr-view-cp-animation*`, `anim-selector-x`,
  `animate-op-btn-panel`, Angular runtime attributes, hosted media, sidebar controls, and meta
  panels are absent.
- A reduced fixture containing only the isolated `anim-expand-bottom` style picker icon child must
  fail after the broader `anim-style`, `anim-styles`, `anim-desc`, `anim-icon`,
  `animate-styles-type`, and `animate-general` parents are absent.
- The detector must not block ordinary animation wording, CSS animation properties,
  SVG `<animate>` elements, or motion-related article text by itself; the trigger is the
  source-specific Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced animation-style-picker fixture and the isolated
  `anim-expand-bottom` fixture fail before implementation because no market-editor-residue issue is
  emitted, then report `Xiumi animation style picker residue` after the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi animation panel child residue`,
  `Xiumi animation attribute panel residue`, and `Xiumi animate operation panel residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 180. Xiumi Basic Style Fragment Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains basic-style fragment
  controls observed in a live CloakBrowser DOM readback as `basic-style-desc`,
  `flow-page-basic-style`, or `fragment-type-flow_page_basic_style`.
- The live page exposes these markers in the editor-side basic format fragment cards whose text
  includes font size, line height, letter spacing, page margins, and set-as-current-format
  affordances. They are not publishable article DOM and must not appear in WeChat, Xiaohongshu, or
  Zhihu output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi basic style fragment residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `basic-style-desc`,
  `flow-page-basic-style`, or `fragment-type-flow_page_basic_style`.
- A reduced fixture containing only those style-fragment markers must fail after template-tree and
  source-house cleanup even when broader `tn-tpl*`, `tn-from-house*`, `tn-theme-color-mask*`,
  Angular runtime attributes, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary prose about basic style, font size, line height, letter
  spacing, or page margins by itself. It must stay anchored to Xiumi-specific class/id names.

### 3. Required Checks

- Use TDD to prove the reduced basic-style-fragment fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi basic style fragment residue` after
  the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi template authoring tree residue`,
  `Xiumi source-house authoring residue`, and `Xiumi theme color mask residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 181. Xiumi WeChat Cover Menu Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains WeChat cover menu or
  cover preview child controls observed in a live CloakBrowser DOM readback, such as a class/id
  value containing both `op-bar-menu` and `cover-menu`, or source-specific cover preview markers
  such as `op-ce-video-xm-cover` and `svg-cover`.
- Co-observed child classes such as `cover-desc` and `cover-imgs` are documented as context but
  must not be standalone triggers. They are too generic outside a source-specific Xiumi cover menu
  or cover preview wrapper.
- This contract is static publishability protection only. It protects exported article bodies from
  copied cover-picker controls; it does not prove WeChat cover thumbnail acceptance, sync, schedule,
  preview, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi WeChat cover control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id value contains both `op-bar-menu` and `cover-menu`, or
  contains `op-ce-wx-cover`, `op-ce-video-xm-cover`, or `svg-cover`.
- A reduced fixture containing only `op-bar-menu cover-menu`, `cover-desc`, `cover-imgs`, and
  `svg-cover` must fail after generated-link, dark-mask, operation-bar, and cover-panel cleanup.
- The generic `Xiumi operation bar dropdown residue` detector must not also report on
  `cover-menu`; cover menus are classified under the more specific WeChat cover-control label.
- The detector must not block ordinary prose about WeChat cover images, gallery picking, cover
  descriptions, or cover image lists by itself. It must stay anchored to source-specific class/id
  names or the exact `op-bar-menu` + `cover-menu` combination.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced cover-menu fixture first fails as only a generic operation-bar
  residue, then reports the precise `Xiumi WeChat cover control residue` label after the detector
  update and operation-bar exclusion.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi WeChat cover control residue`, `Xiumi operation bar
  dropdown residue`, `Xiumi generated link control residue`, and `Xiumi dark mask control residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 182. Xiumi Dropdown Directive Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains Xiumi dropdown
  directive attributes observed in a live CloakBrowser DOM readback, such as `tn-dropdown`,
  `tn-dropdown-menu`, and `tn-dropdown-toggle`.
- These directives drive editor-side menu/dropdown control surfaces. They are distinct from
  Bootstrap `uib-dropdown*` directives and from source-owned article prose about dropdown menus.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi dropdown directive residue` for WeChat,
  Xiaohongshu, and Zhihu when an attribute name is `tn-dropdown`, `tn-dropdown-menu`, or
  `tn-dropdown-toggle`.
- A reduced fixture containing only those `tn-dropdown*` directives must fail after UI Bootstrap
  cleanup and must not fall through to the broader `Xiumi tn-* attribute` diagnostic.
- The detector must not block ordinary dropdown/menu wording or standard HTML `class="dropdown"`
  by itself. The trigger is the source-specific Xiumi `tn-dropdown*` directive name.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced dropdown-directive fixture first reports only `Xiumi tn-* attribute`,
  then reports `Xiumi dropdown directive residue` after the detector update and catch-all
  exclusion.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi UI Bootstrap control directive residue`,
  `Xiumi operation bar dropdown residue`, and `Xiumi tn-* attribute` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 183. Xiumi Template Scene Marker Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains template scene/list
  markers observed in a live CloakBrowser DOM readback, such as `tn-scene-paper` and
  `tn-lighting-box`.
- These class tokens appear in Xiumi template-card lists, format-extraction menu entries, and
  editor projection surfaces. They are not standalone publishable article semantics and must not
  remain after broader `tn-tpl*` and `tn-from-house*` cleanup.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi template scene marker residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id token is `tn-scene-paper` or `tn-lighting-box`.
- A reduced fixture containing only single-token `tn-scene-paper` and `tn-lighting-box` classes
  must fail even when `tn-tpl*`, `tn-from-house*`, renderer-pipeline bindings, broad Angular
  runtime attributes, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary scene, paper, lighting, or box wording by itself. The
  trigger is the source-specific Xiumi `tn-*` class token.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced template-scene fixture first has no market-editor hard-block, then
  reports `Xiumi template scene marker residue` after the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi template authoring tree residue`,
  `Xiumi source-house authoring residue`, `Xiumi basic style fragment residue`, and
  `Xiumi tn-* attribute` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 184. Xiumi Group Ground Marker Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains group/ground/cube
  authoring markers observed in a live CloakBrowser DOM readback, such as
  `tn-group-usage-normal`, `tn-ground-slot`, `tn-ground-inst`, and `tn-cube-inst`.
- These class tokens appear in Xiumi group, page, layer, and cube editing surfaces around cell
  containers, document roots, selected-component panels, and paper/booklet component instances.
  They are not publishable article semantics and must not remain after broader component,
  page/layer, group-box, and template-scene cleanup.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi group ground marker residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id token is one of `tn-group-usage-normal`,
  `tn-ground-slot`, `tn-ground-inst`, or `tn-cube-inst`.
- A reduced fixture containing only those class tokens must fail even when `tn-page*`,
  `tn-layer*`, `tn-comp*`, `tn-tpl*`, `tn-from-house*`, group-box wrappers, renderer-pipeline
  bindings, broad Angular runtime attributes, hosted media, sidebar controls, or meta panels are
  absent.
- The detector must not block ordinary group, ground, cube, page, layer, or cell wording by
  itself. The trigger is the source-specific Xiumi `tn-*` class token.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced group/ground fixture first has no market-editor hard-block, then
  reports `Xiumi group ground marker residue` after the detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi group box wrapper residue`,
  `Xiumi component authoring tree residue`, `Xiumi page authoring tree residue`,
  `Xiumi layer authoring tree residue`, `Xiumi template scene marker residue`, and
  `Xiumi tn-* attribute` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 185. Xiumi Image Enhancement Crop Control Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains image enhancement,
  image popup, or thumbnail crop child controls observed in a live CloakBrowser DOM readback, such
  as `op-cp-image-enhancement`, `op-ce-image-enhancement`, `op-ce-image-popup`,
  `enhance-attr-menu`, and `thumb-crop-img`.
- These class tokens appear around editor-side image batch processing, click-to-zoom,
  blur/brightness/contrast/sharpen settings, image popup sizing, and article thumbnail crop
  panels. They are not article body semantics and must not remain after broader worker-surface,
  crop-panel, cover-control, meta-panel, and operator-dock cleanup.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi image enhancement crop control residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id token is one of
  `op-cp-image-enhancement`, `op-ce-image-enhancement`, `op-ce-image-popup`,
  `enhance-attr-menu`, or `thumb-crop-img`.
- A reduced fixture containing only those child-control tokens must fail even when
  `op-worker-*`, `crop-*`, `cover-menu`, `tn-meta-*`, `op-dock`, `op-loader`, broad `tn-*`,
  broad Angular runtime attributes, hosted media, sidebar controls, or template markers are absent.
- The detector must not block ordinary image, enhancement, popup, crop, zoom, blur, brightness,
  contrast, sharpen, thumbnail, or cover wording by itself. The trigger is the source-specific
  Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced image-enhancement/crop fixture first has no market-editor
  hard-block, then reports `Xiumi image enhancement crop control residue` after the detector
  update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi worker surface crop control residue`,
  `Xiumi crop panel child control residue`, `Xiumi WeChat cover control residue`,
  `Xiumi meta panel control residue`, and `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 178. Xiumi Layout Form Panel Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains layout/form operation
  panel child controls observed in a live CloakBrowser DOM readback, such as `layout-box-panel`,
  `form-input-panel`, `op-ce-form-input`, `trigger-props-panel`, and `trigger-radio-input`.
- The live page exposes these markers around editor-side layout alignment, column insertion,
  required-field, option-list, trigger-property, and form-input settings. They are not article body
  DOM and must not appear in WeChat, Xiaohongshu, or Zhihu publishable output.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi layout form panel residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `layout-box-panel`,
  `form-input-panel`, `op-ce-form-input`, `trigger-props-panel`, or `trigger-radio-input`.
- A reduced fixture containing only those child panel markers must fail after operation-bar cleanup
  even when `op-bar-menu`, `op-loader`, `op-dock`, generated-link controls, Angular runtime
  attributes, hosted media, sidebar controls, and meta panels are absent.
- The detector must not block ordinary layout/form/required/option/trigger wording, radio input
  elements without the Xiumi class marker, or article text by itself; the trigger is the
  source-specific Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced layout-form fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi layout form panel residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi generated link control residue`,
  `Xiumi operation bar dropdown residue`, and `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 177. Xiumi Dark Mask Control Residue - 2026-06-28

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi v5 paper-editor HTML contains the editor operation
  dark-mask surface observed in a live CloakBrowser DOM readback as `op-dark-mask`.
- The live page exposes this marker around editor control panels such as WeChat cover and operation
  overlays. It is not article body DOM and must not appear in WeChat, Xiaohongshu, or Zhihu
  publishable output.
- This contract is static publishability protection only. It does not prove SVG/SMIL/click
  interaction correctness, phone preview, schedule, sync, upload, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi dark mask control residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id attribute contains `op-dark-mask`.
- A reduced fixture containing only `op-dark-mask` must fail after cover-control cleanup even when
  `op-ce-wx-cover`, selection-overlay controls, worker-surface crop controls, generated-link
  controls, operator-dock controls, Angular runtime attributes, hosted media, sidebar controls, and
  meta panels are absent.
- The detector must not block ordinary dark/mask wording, image overlay wording, background CSS, or
  article text by itself; the trigger is the source-specific Xiumi class/id marker.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced dark-mask fixture fails before implementation because no
  market-editor-residue issue is emitted, then reports `Xiumi dark mask control residue` after the
  detector update.
- Regression tests must assert the exact residue label appears in the WeChat, Xiaohongshu, and
  Zhihu quality reports.
- Adjacent regressions must keep `Xiumi WeChat cover control residue`,
  `Xiumi selection overlay control residue`, and `Xiumi worker surface crop control residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile SMIL/click interaction, credentialed sync, public rendering,
  upload, cover thumbnail acceptance, or publish success.

## 125. Xiumi Paper Auxiliary Component Tree Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains paper auxiliary component-tree
  controls observed in a live CloakBrowser Xiumi v5 paper-editor readback, such as
  `tn-paper-aux-comps-tree-assistant`, `tn-paper-aux-comps-tree`, `paper-comps-assistant`,
  `paper-aux-comp-tree`, `aux-tree-node-data`, or `on-paper-aux-tree-node-*`.
- These controls are Xiumi authoring UI for the editor-side component tree and mouse/selection
  callbacks. They are not article content, style semantics, or platform-safe SVG/HTML.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi paper auxiliary component tree residue` for
  WeChat, Xiaohongshu, and Zhihu when supported paper auxiliary tree classes or attributes appear.
- A reduced fixture containing only the paper auxiliary tree controls must fail even when
  selection-overlay wrappers, crop/worker controls, operator-dock parents, operator depot items,
  `op-loader`, broad `tn-*` attributes, broad `ng-*` attributes/classes, `opera-tn-*`,
  `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`,
  `touch-action`, and `user-select` markers are absent.
- This rule must stay anchored to Xiumi paper auxiliary tree names and must not match generic
  `paper`, `tree`, or `assistant` prose unless source-specific auxiliary component-tree markers
  are present.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced paper auxiliary tree fixture fails before implementation and
  reports `Xiumi paper auxiliary component tree residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi worker surface crop control residue`,
  `Xiumi selection overlay control residue`, `Xiumi operator depot item residue`, and
  `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 126. Xiumi Top Operation Button Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains top operation button controls
  observed in a live CloakBrowser Xiumi v5 paper-editor readback, such as `x3-nav-op-buttons`,
  `tn-op-btn-group`, `op-btn`, `op-btn-inset-icon`, `op-btn-inset-desc`, or `op-more`.
- These controls are Xiumi authoring UI for opening, previewing, saving, exporting, syncing, and
  editor menu actions. They are not article content, style semantics, or platform-safe SVG/HTML.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi top operation button residue` for WeChat,
  Xiaohongshu, and Zhihu when supported top-operation button classes appear.
- A reduced fixture containing only the top operation button controls must fail even when broad
  Angular `ng-*` attributes/classes, paper auxiliary tree controls, selection overlays,
  crop/worker controls, operator-dock parents, operator depot items, `op-loader`, broad `tn-*`
  attributes, `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer, `ui-slider`,
  `ui-sortable`, `touch-action`, and `user-select` markers are absent.
- This rule must stay anchored to Xiumi operation-button names and must not match generic
  `button`, `dropdown`, or menu prose unless source-specific `op-btn` / `op-more` markers are
  present.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced top-operation button fixture fails before implementation and
  reports `Xiumi top operation button residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi paper auxiliary component tree residue`,
  `Xiumi worker surface crop control residue`, `Xiumi operator depot item residue`, and
  `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 127. Xiumi UI Bootstrap Control Directive Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains Angular UI Bootstrap directives
  observed in a live CloakBrowser Xiumi v5 paper-editor readback, such as `uib-dropdown`,
  `uib-dropdown-toggle`, `uib-dropdown-menu`, `uib-tooltip`, `tooltip-placement`, or
  `tooltip-popup-delay`.
- These directives drive Xiumi editor dropdowns, tooltips, accordions, tabs, and menu controls.
  They are not article content, style semantics, or platform-safe SVG/HTML.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi UI Bootstrap control directive residue` for
  WeChat, Xiaohongshu, and Zhihu when supported `uib-*` or tooltip control directives appear.
- A reduced fixture containing only UI Bootstrap directives must fail even when top operation
  classes, broad Angular `ng-*` attributes/classes, paper auxiliary tree controls, selection
  overlays, crop/worker controls, operator-dock parents, operator depot items, `op-loader`, broad
  `tn-*` attributes, `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer,
  `ui-slider`, `ui-sortable`, `touch-action`, and `user-select` markers are absent.
- This rule must not match generic `is-open` or `on-toggle` attributes by themselves; those names
  are too broad unless paired with source-specific Xiumi/UI Bootstrap directives.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced UI Bootstrap directive fixture fails before implementation and
  reports `Xiumi UI Bootstrap control directive residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi top operation button residue`,
  `Xiumi paper auxiliary component tree residue`, `Xiumi worker surface crop control residue`, and
  `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 128. Xiumi Operation Bar Dropdown Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains operation-bar dropdown/menu
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, such as
  `op-bar-menu`, `op-bar-btn`, `op-bar-icon`, `shortcut-op-bar-panel`, `spacing-panel`,
  `format-panel`, `size-list-menu`, or `insert-text-op-bar-panel`.
- These nodes drive Xiumi's editor-side command bars, shortcut menus, spacing panels, format
  panels, and text insertion controls. They are not article content, platform-safe SVG/H5
  semantics, or user-authored visual style.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi operation bar dropdown residue` for WeChat,
  Xiaohongshu, and Zhihu when supported operation-bar dropdown/menu class or id markers appear.
- A reduced fixture containing only operation-bar dropdown/menu classes must fail even when broad
  UI Bootstrap directives, top operation classes, broad Angular `ng-*` attributes/classes, paper
  auxiliary tree controls, selection overlays, crop/worker controls, operator-dock parents,
  operator depot items, `op-loader`, broad `tn-*` attributes, `opera-tn-*`, `contenteditable`,
  hosted media, SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`, and `user-select`
  markers are absent.
- This rule must not match generic `dropdown-menu`, `btn`, `btn-group`, `line-spacing`, or
  readable shortcut text by themselves; the detector must stay anchored to Xiumi-specific
  operation-bar class/id markers.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced operation-bar dropdown fixture fails before implementation and
  reports `Xiumi operation bar dropdown residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi UI Bootstrap control directive residue`,
  `Xiumi top operation button residue`, `Xiumi operator depot item residue`, and
  `Xiumi operator dock control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 129. Xiumi Color Selector Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains color-selector controls observed
  in a live CloakBrowser Xiumi v5 paper-editor DOM readback, such as
  `color-selector-dropdown`, `op-theme-color-sec`, `text-color-btn`, `tn-color-circle`,
  `text-shadow-icon`, `text-fill-image-icon`, `tn-color-selector`, `tn-color-selector-x`,
  `hello-color-x`, `on-color-choose`, `on-color-changing`, `on-color-choose-cancel`,
  `support-color-category`, `fetch-color-from-template-panel`, or
  `support-batch-change-color`.
- These nodes drive Xiumi editor color palettes, text color panels, theme-color controls,
  template color extraction, and color-picking callbacks. They are not article content,
  InkForge-owned style primitives, or platform-safe SVG/H5 semantics.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi color selector control residue` for WeChat,
  Xiaohongshu, and Zhihu when supported color-selector class/id markers or source-specific color
  selector attributes appear.
- A reduced fixture containing only color-selector controls must fail even when operation-bar
  dropdown/menu controls, UI Bootstrap directives, top operation classes, broad Angular `ng-*`
  attributes/classes, paper auxiliary tree controls, selection overlays, crop/worker controls,
  operator-dock parents, operator depot items, `op-loader`, broad `tn-*` non-color attributes,
  `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`,
  `touch-action`, and `user-select` markers are absent.
- This rule must not match ordinary text about colors, generic `dropdown-toggle`, generic
  `btn-group`, readable color labels, or regular inline style color declarations by themselves.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced color-selector fixture fails before implementation and reports
  `Xiumi color selector control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operation bar dropdown residue`,
  `Xiumi UI Bootstrap control directive residue`, `Xiumi top operation button residue`, and
  `Xiumi operator depot item residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 130. Xiumi Font And Format Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains font-family, font-size, or basic
  text-format controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, such as
  `tn-global-format-dropdown`, `tn-basic-format-tabset`, `font-family-menu`, `font-family-list`,
  `stc-family-name-yzk-*`, `text-format-brush`, `text-misc`, `size-input`,
  `tn-list-locate-active-item`, `tn-number-input`, `tn-text-input-done`, `skim-value-prev`,
  `skim-value-next`, `skim-change`, or `skim-end`.
- These nodes drive Xiumi editor font-family menus, font-size skimmers, global/basic format tabs,
  and text-format extraction controls. They are not article content, InkForge-owned typography
  primitives, or platform-safe SVG/H5 semantics.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi font and format control residue` for WeChat,
  Xiaohongshu, and Zhihu when supported font/basic-format class/id markers or source-specific
  font-size control attributes appear.
- A reduced fixture containing only font-family/basic-format controls must fail even when
  color-selector controls, operation-bar dropdown/menu controls, UI Bootstrap directives, top
  operation classes, broad Angular `ng-*` attributes/classes, paper auxiliary tree controls,
  selection overlays, crop/worker controls, operator-dock parents, operator depot items,
  `op-loader`, broad non-font `tn-*` attributes, `opera-tn-*`, `contenteditable`, hosted media,
  SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`, and `user-select` markers are
  absent.
- This rule must not match ordinary prose containing font names, generic `font-family`,
  generic `font-size`, generic `btn-group`, regular inline font styles, or readable font labels by
  themselves.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced font/basic-format fixture fails before implementation and reports
  `Xiumi font and format control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi color selector control residue`,
  `Xiumi operation bar dropdown residue`, `Xiumi UI Bootstrap control directive residue`, and
  `Xiumi top operation button residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 131. Xiumi Text Toolbar Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains text-toolbar controls observed in
  a live CloakBrowser Xiumi v5 paper-editor DOM readback where `op-text-sec` appears on the same
  element as a concrete toolbar class such as `font-size`, `font-family`, `text-style`, or
  `text-misc`.
- These nodes drive Xiumi editor text toolbar affordances for font sizing, font-family selection,
  alignment, bold/italic/underline/strike controls, and miscellaneous text insertion controls.
  They are not article content, InkForge-owned typography primitives, or platform-safe SVG/H5
  semantics.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi text toolbar control residue` for WeChat,
  Xiaohongshu, and Zhihu when `op-text-sec` is paired with a supported text-toolbar type class on
  the same class/id value.
- A reduced fixture containing only the paired text-toolbar controls must fail even when
  font-family menus, font-size skimmer attributes, color-selector controls, operation-bar
  dropdown/menu controls, UI Bootstrap directives, top operation classes, broad Angular `ng-*`
  attributes/classes, paper auxiliary tree controls, selection overlays, crop/worker controls,
  operator-dock parents, operator depot items, `op-loader`, broad `tn-*` attributes,
  `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`,
  `touch-action`, and `user-select` markers are absent.
- This rule must not match standalone `op-text-sec`, standalone `font-size`, standalone
  `font-family`, ordinary text about fonts, regular inline font styles, or readable toolbar labels
  by themselves.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule,
  public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced text-toolbar fixture fails before implementation and reports
  `Xiumi text toolbar control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi font and format control residue`,
  `Xiumi color selector control residue`, `Xiumi operation bar dropdown residue`, and
  `Xiumi UI Bootstrap control directive residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 121. Xiumi Selection Overlay Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains selected-component overlay,
  resize, or drag-handle child controls observed after a live CloakBrowser template click changed
  the center paper, such as `full-screen-mask`, `brim-group`, `box-lines`, `box-handles`,
  `hm-recognizer-options`, `hm-pan`, `hm-panstart`, `hm-panend`, `hm-panmove`,
  `stop-propagation`, or `tn-attach-to`.
- These controls are Xiumi authoring UI for selection bounding boxes, resize/rotate handles, and
  gesture routing. They are not publishable article DOM for WeChat, Xiaohongshu, or Zhihu.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi selection overlay control residue` for WeChat,
  Xiaohongshu, and Zhihu when the supported selection-overlay classes or gesture/control
  attributes appear.
- A reduced fixture containing only the selection-overlay child controls must fail even when
  operator-dock parents, `op-loader`, broad `tn-*` trees, broad `ng-*` attributes/classes,
  `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`,
  `touch-action`, and `user-select` markers are absent.
- The rule must avoid generic class names such as `bar`, `line`, `corner`, or `handle` unless they
  are anchored by source-specific selection-overlay wrappers or gesture attributes.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced selection-overlay fixture fails before implementation and reports
  `Xiumi selection overlay control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operator dock control residue`, `Xiumi operation panel
  loader residue`, `Xiumi UI slider control residue`, `Xiumi sortable control residue`, and the
  existing `tn-*` state wrappers independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 242. Xiumi Hammer Pan Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the Hammer gesture directive
  attribute `hm-pan` without the broader selection overlay classes.
- CloakBrowser live DOM refresh on the active Xiumi v5 paper editor counted `hm-pan` on the
  editor surface alongside already-covered `hm-panstart`, `hm-panend`, `hm-panmove`,
  `hm-recognizer-options`, `stop-propagation`, and `tn-attach-to` controls.
- This marker is editor-side gesture routing metadata. It is not publishable article behavior,
  reusable InkForge interaction source, mobile click/drag proof, public-host proof, or
  target-platform proof.
- This rule extends the existing `Xiumi selection overlay control residue` diagnostic. It must
  stay separate from worker-surface crop controls, selection overlay classes, broad `tn-*`
  fallbacks, Angular/Vue authoring attributes, and contenteditable markers.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi selection overlay control residue` for WeChat,
  Xiaohongshu, and Zhihu when `hm-pan` appears as an attribute.
- A reduced fixture containing only `hm-pan` must fail with the precise selection-overlay label
  even when `full-screen-mask`, `brim-group`, `box-lines`, `box-handles`, `hm-panstart`,
  `hm-panend`, `hm-panmove`, `hm-recognizer-options`, `stop-propagation`, `tn-attach-to`,
  `tn-*`, `ng-*`, contenteditable, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary prose about pan, drag, gesture, or Hammer by itself. It
  must stay anchored to the Xiumi/Hammer-style attribute form.

### 3. Required Checks

- Use TDD to prove the reduced `hm-pan` fixture initially emits no `*-market-editor-residue`
  issue, then emits `Xiumi selection overlay control residue` after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent selection-overlay and worker-surface crop regressions must remain green so overlay
  gesture attributes and crop controls stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile gesture fidelity, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, public rendering, upload, scheduled send, or publish success.

## 243. Xiumi Style Binding Metadata Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the style-binding directive
  attribute `tn-style`.
- CloakBrowser live DOM refresh on the active Xiumi v5 paper editor observed `tn-style` on the
  editor surface alongside already-covered component/cell/page binding metadata.
- This marker is editor-side style binding metadata. It is not ordinary publishable inline style,
  reusable InkForge style source, WeChat style fidelity proof, public-host proof, or
  target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  `tn-style`, but a cleaned-down style-binding fragment must receive the precise
  `Xiumi style binding metadata residue` label for actionable diagnostics.
- This rule must stay separate from ordinary HTML `style` attributes, component/cell/page binding
  metadata, image/link/preload binding metadata, and the broad `Xiumi tn-* attribute` fallback.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi style binding metadata residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-style` appears as an attribute.
- A reduced fixture containing only `tn-style` must fail with the precise style-binding label even
  when `tn-comp*`, `tn-cell*`, `tn-page*`, `tn-link`, `tn-image*`, `tn-pre-load-image`,
  Angular runtime attributes/classes, contenteditable, hosted media, sidebar controls, or meta
  panels are absent.
- The detector must not block ordinary inline `style`, style prose, CSS examples, article text,
  or non-Xiumi class names by itself. It must stay anchored to the Xiumi-specific `tn-style`
  directive attribute.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the precise style-binding label is also present.

### 3. Required Checks

- Use TDD to prove the reduced `tn-style` fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports `Xiumi style binding metadata residue` after the
  detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent preload-image and component-structure binding regressions must remain green so style,
  image, and component binding diagnostics stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, style fidelity, mobile Dark Mode, cover thumbnail acceptance,
  credentialed sync, public rendering, upload, scheduled send, or publish success.

## 122. Xiumi Auxiliary Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the auxiliary binding attribute
  `tn-bind-aux-prop`, observed in a live CloakBrowser Xiumi v5 paper-editor sample after entering a
  visible template/style into the center paper.
- The observed center-paper shape/line cell used
  `tn-bind-aux-prop="{ backgroundColor: compAux.bgc1 }"` to bind editor-side auxiliary color state
  into the applied element. This is not publishable article semantics for WeChat, Xiaohongshu, or
  Zhihu.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi auxiliary binding metadata residue` for
  WeChat, Xiaohongshu, and Zhihu when `tn-bind-aux-prop` appears as an attribute name.
- A reduced fixture containing only `tn-bind-aux-prop` plus readable text must report the precise
  auxiliary-binding label instead of relying on the generic `Xiumi tn-* attribute` catch-all.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, public host, or publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-bind-aux-prop` fixture reports only the generic `Xiumi tn-*`
  catch-all before implementation and the precise `Xiumi auxiliary binding metadata residue` label
  after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi atom context binding metadata residue`, decomposed
  component/cell/page binding metadata labels, and the final generic `Xiumi tn-* attribute`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  public rendering, upload, scheduled send, or publish success.

## 119. 135 SVG Editor Base Shell Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor center-shell HTML contains the base authoring
  wrappers observed after a visible free-trial click: `content-canvas` paired with
  `content-background` or `content-inner`, plus shell image wrappers such as `block-inner` or the
  exact `block-img` class.
- These wrappers are 135 SVG editor authoring chrome and image-slot shell state. They may inform
  InkForge-owned image-slot/fallback/layout-report schemas, but they are not publishable article
  DOM for WeChat, Xiaohongshu, or Zhihu.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG editor shell residue` for WeChat,
  Xiaohongshu, and Zhihu when the base shell markers appear in class/id attributes.
- A reduced fixture containing only `content-canvas content-background content-inner`,
  `block-inner`, and exact `block-img` must fail even when `block-img__inner`,
  `placeholder__help/icon`, `article-item__*`, `articles_pop`, `_135editor`,
  `app-content-canvas`, known 135 `data-name`, trigger overlay markers, hosted material, and
  `svg:135` styles are absent.
- The rule remains source-specific. Generic `block` alone is not sufficient for the market-editor
  residue gate.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced base-shell fixture fails before implementation and reports
  `135 SVG editor shell residue` after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent shell regression must keep the older shell fixture with `block-img__inner`,
  `placeholder__help/icon`, and `article-item__*` reporting `135 SVG editor shell residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 118. 135 SVG Trigger Switch Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains Ant Design switch controls used
  by the 135 SVG editor trigger UI, such as `ant-switch`, `ant-switch-checked`,
  `ant-switch-inner`, or `ant-switch-handle`.
- These controls are authoring UI for trigger-area visibility/settings. They are not publishable
  article DOM and must not remain in WeChat, Xiaohongshu, or Zhihu output.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG trigger switch control residue` for WeChat,
  Xiaohongshu, and Zhihu when the Ant switch markers appear in class/id attributes.
- A reduced fixture containing only the Ant switch markers must fail even when trigger overlay
  geometry, `app-content-canvas`, known 135 `data-name`, hosted-media, or material-shell markers are
  absent.
- Existing 135 SVG trigger overlay, builder canvas, and trigger prompt fixtures must continue to
  report their source-specific residue labels.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced Ant switch fixture fails before implementation and reports
  `135 SVG trigger switch control residue` after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regression tests must keep ordinary 135 SVG builder canvas, trigger prompt, and trigger
  overlay fixtures reporting their existing source-specific labels.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 117. 135 SVG Trigger Hot-Area Overlay Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains trigger hot-area overlay
  markers such as `block-img__trigger`, `edit-trigger`, `edit-trigger__switch`,
  `trigger__ajuster`, `trigger_tip`, or direction handle classes such as `ajuster nw`.
- These classes are 135 SVG editor authoring controls for hidden or visible trigger-zone geometry.
  They may inform InkForge-owned trigger-zone manifests and layout reports, but they are not
  publishable article DOM for WeChat, Xiaohongshu, or Zhihu.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG trigger hot-area overlay residue` for WeChat,
  Xiaohongshu, and Zhihu when the trigger overlay markers appear in class/id attributes.
- Child-only residues from the same hot-area editor, including `trigger_tip` labels and
  `ajuster` resize handles, must fail under the same source-specific label even when the parent
  `trigger__ajuster` wrapper was removed.
- A reduced fixture containing trigger overlay markers but no `app-content-canvas`, known 135
  `data-name`, hosted-media, or material-shell markers must not be reported as the broader
  `135 SVG builder canvas residue`.
- Existing 135 SVG builder/canvas fixtures containing `app-content-canvas`, `block-img__content`,
  `block-img__default`, `edit-placeholder`, `placeholder__name`, or `ant-tooltip-open` must still
  report `135 SVG builder canvas residue`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the trigger-overlay fixture reports the old broad canvas label before the split
  and the precise trigger hot-area overlay label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports and that the old broad canvas label is absent for the reduced overlay fixture.
- Adjacent regression tests must keep ordinary 135 SVG builder canvas and trigger prompt fixtures
  reporting `135 SVG builder canvas residue`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 116. Xiumi Runtime Path Binding Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi applied-editor runtime path
  binding attributes `opera-tn-ra-comp` or `opera-tn-ra-cell`.
- These attributes bind editor runtime paths for component and cell state. They are Xiumi editor
  readback schema, not publishable article metadata, and must not remain in WeChat, Xiaohongshu, or
  Zhihu output.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component runtime path binding residue` for
  WeChat, Xiaohongshu, and Zhihu when `opera-tn-ra-comp` appears as an attribute name.
- `detectQuality(..., platform)` must report `Xiumi cell runtime path binding residue` for WeChat,
  Xiaohongshu, and Zhihu when `opera-tn-ra-cell` appears as an attribute name.
- Reduced fixtures containing only `opera-tn-ra-comp` or only `opera-tn-ra-cell` must not be
  reported as the old broad `Xiumi runtime binding attribute`.
- The mixed runtime-binding fixture must report both source-specific labels and must not report the
  old broad `Xiumi runtime binding attribute` bucket.
- The generic `Xiumi tn-* attribute` guard may still report on `opera-tn-ra-*` because `tn-ra-*` is
  a copied Xiumi marker inside the attribute name; this is acceptable as a final catch-all.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `opera-tn-ra-comp` and `opera-tn-ra-cell` fixtures report the old
  broad runtime label before the split and the precise component/cell runtime path labels after it.
- Regression tests must assert the new labels appear in the WeChat, Xiaohongshu, and Zhihu quality
  reports.
- Regression tests must assert the existing mixed runtime-binding fixture no longer reports
  `Xiumi runtime binding attribute`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 115. Xiumi Atom Context Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains the Xiumi atom-context binding
  attribute `tn-atom-context`.
- This attribute binds editor-side atom/component context. It is Xiumi runtime schema, not
  InkForge-owned publishable article metadata, and must not remain in WeChat, Xiaohongshu, or Zhihu
  output.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi atom context binding metadata residue` for
  WeChat, Xiaohongshu, and Zhihu when `tn-atom-context` appears as an attribute name.
- A reduced fixture containing only `tn-atom-context` must not be reported as the broader
  `Xiumi component binding attribute residue`.
- The mixed component-binding fixture must report the decomposed labels, including
  `Xiumi atom context binding metadata residue`, and must not report the old broad
  `Xiumi component binding attribute residue` bucket.
- The old broad component-binding bucket is fully decomposed after this section. The generic
  `Xiumi tn-* attribute` guard remains active as a final catch-all for unexpected Xiumi `tn-*`
  leakage.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-atom-context` fixture reports the old broad component-binding
  label before the split and the precise atom-context metadata residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must assert the existing mixed component-binding fixture no longer reports
  `Xiumi component binding attribute residue` after `tn-atom-context` moves to a narrower rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 114. Xiumi Page Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi page/stage binding
  attributes such as `tn-page-stage-size`, `tn-page-view-box-editor-desktop`, or
  `tn-page-cache-gatherer`.
- These attributes bind editor-side canvas stage, viewBox, and cache/gathering state. They are
  not InkForge-owned publishable article metadata and must not remain in WeChat, Xiaohongshu, or
  Zhihu output.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi page binding metadata residue` for WeChat,
  Xiaohongshu, and Zhihu when any of the supported `tn-page-*` binding attributes appears as an
  attribute name.
- A reduced fixture containing only `tn-page-stage-size` / `tn-page-view-box-editor-desktop` /
  `tn-page-cache-gatherer` must not be reported as the broader
  `Xiumi component binding attribute residue`.
- The old broad component-binding attribute rule is fully decomposed by section 115. The generic
  `Xiumi tn-* attribute` guard remains responsible only as a final catch-all for unexpected Xiumi
  `tn-*` leakage.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-page-*` binding fixture reports only the old broad
  component-binding label before the split and the precise page-binding metadata residue label
  after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting decomposed
  component-binding labels and must not reintroduce `Xiumi component binding attribute residue`
  after section 115 splits `tn-atom-context`.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 113. Xiumi Child Layout Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi child layout binding
  attributes such as `tn-child-position` or `tn-child-orientation`.
- These attributes bind editor-side child layout state. They are distinct from class-level child
  state markers such as `tn-child-position-absolute` and from flow-canvas SVG/H5 risk labels that
  may also fire on `tn-child-orientation="flow-canvas"`.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi child layout binding metadata residue` for
  WeChat, Xiaohongshu, and Zhihu when `tn-child-position` or `tn-child-orientation` appears as an
  attribute name.
- A reduced fixture containing only `tn-child-position` / `tn-child-orientation` must not be
  reported as the broader `Xiumi component binding attribute residue`.
- The existing `Xiumi SVG carousel flow-canvas residue` guard may also report when
  `tn-child-orientation="flow-canvas"` is present; this is allowed and documents a separate
  SVG/H5 interaction risk.
- The broader component-binding attribute rule remains responsible only for the still-unsplit
  editor/runtime attributes such as `tn-page-stage-size`, `tn-page-view-box-editor-desktop`,
  `tn-page-cache-gatherer`, and `tn-atom-context`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-child-position` / `tn-child-orientation` fixture reports only
  the old broad component-binding label before the split and the precise child-layout metadata
  residue label after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting
  `Xiumi component binding attribute residue` after child-layout binding attributes move to a
  narrower rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 112. Xiumi Cell Binding Metadata Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned market-editor HTML contains Xiumi cell binding attributes
  such as `tn-cell` or `tn-cell-type`.
- These attributes bind editor-side cell/content-slot state. They are distinct from publishable
  text/image markup and from already split cell container authoring classes such as `tn-cell` in
  class/id values.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi cell binding metadata residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-cell` or `tn-cell-type` appears as an attribute name.
- A reduced fixture containing only `tn-cell` / `tn-cell-type` must not be reported as the
  broader `Xiumi component binding attribute residue`.
- The broader component-binding attribute rule remains responsible only for the still-unsplit
  editor/runtime attributes such as `tn-child-position`, `tn-child-orientation`,
  `tn-page-stage-size`, `tn-page-view-box-editor-desktop`, `tn-page-cache-gatherer`, and
  `tn-atom-context`.
- The rule is additive. It must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- Use TDD to prove the reduced `tn-cell` / `tn-cell-type` fixture reports only the old broad
  component-binding label before the split and the precise cell-binding metadata residue label
  after it.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Regression tests must keep the existing mixed component-binding fixture reporting
  `Xiumi component binding attribute residue` after `tn-cell*` binding attributes move to a
  narrower rule.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 132. Xiumi Right Toolbar Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains right-side editor toolbar and
  page-assist controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, such as
  `x5-right-toolbar`, `right-toolbar-container`, `right-toolbar-container-normal`,
  `right-toolbar-switch-container`, `right-toolbar-switch`, `right-toolbar-arrow-up`,
  `right-toolbar-arrow-down`, `content-statistics`, `page-assist-on-toolbar`,
  `zooming-selector`, and `tn-viewport-zooming-panel`.
- These controls drive Xiumi editor chrome for page statistics, editing assistant toggles,
  right-side toolbar switching, and zoom controls. They are not article DOM and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi right toolbar control residue` for WeChat,
  Xiaohongshu, and Zhihu when the supported right-toolbar class/id markers appear.
- A reduced fixture containing only right-toolbar controls must fail even when text-toolbar
  controls, font-family menus, color-selector controls, operation-bar controls, UI Bootstrap
  directives, top operation classes, broad Angular `ng-*` attributes/classes, paper auxiliary tree
  controls, selection overlays, crop/worker controls, operator-dock parents, operator depot items,
  `op-loader`, broad non-toolbar `tn-*`, `opera-tn-*`, `contenteditable`, hosted media, SVG
  content-layer, `ui-slider`, `ui-sortable`, `touch-action`, or `user-select` markers are absent.
- The detector must not block ordinary prose containing toolbar, statistics, zoom, assistant, or
  right-side language by itself. It must stay anchored to Xiumi-specific right-toolbar class/id
  names.

### 3. Required Checks

- Use TDD to prove the reduced right-toolbar fixture fails before implementation and reports
  `Xiumi right toolbar control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi text toolbar control residue`,
  `Xiumi font and format control residue`, `Xiumi color selector control residue`, and
  `Xiumi top operation button residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 133. Xiumi Sidebar Tab Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains left sidebar and material/template
  tab chrome observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, such as
  `sidebar-panel`, `sidebar-style-normal`, `x3-tab-item`, and `tn-tab-ctrl-pin`.
- The live DOM also shows adjacent icon classes such as `icon templates`, `icon material-img`,
  `icon fragments`, `icon clipboard`, `icon images`, `icon team-images`, and `icon music`; these
  are documented as context but must not be used as standalone triggers because generic icon class
  names can appear in legitimate article content.
- These controls drive Xiumi's editor-side material library, template categories, clipboard, image
  library, and tab panel navigation. They are not article DOM and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi sidebar tab control residue` for WeChat,
  Xiaohongshu, and Zhihu when supported sidebar/tab class or id markers appear.
- A reduced fixture containing only non-`tn-*` sidebar/tab controls must fail even when right
  toolbar controls, text-toolbar controls, font-family menus, color-selector controls,
  operation-bar controls, UI Bootstrap directives, top operation classes, broad Angular `ng-*`
  attributes/classes, paper auxiliary tree controls, selection overlays, crop/worker controls,
  operator-dock parents, operator depot items, `op-loader`, broad `tn-*`, `opera-tn-*`,
  `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`,
  or `user-select` markers are absent.
- The detector must not block ordinary prose containing sidebar, template, material, image, music,
  clipboard, tab, or icon language by itself. It must stay anchored to Xiumi-specific sidebar/tab
  class/id names.

### 3. Required Checks

- Use TDD to prove the reduced sidebar/tab fixture fails before implementation and reports
  `Xiumi sidebar tab control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi right toolbar control residue`,
  `Xiumi text toolbar control residue`, `Xiumi UI Bootstrap control directive residue`, and
  `Xiumi template authoring tree residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 134. Xiumi Meta Panel Control Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains cover/article metadata panel
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, such as
  `tn-meta-container`, `tn-meta-panel`, and `toggle-green-gray`.
- The live DOM also shows adjacent generic classes such as `top-group`, `meta-group`,
  `toggle-btn`, `toggle-off`, `toggle-on`, and `tn-lighting-box`; these are documented as context
  but must not be used as standalone triggers because generic meta/toggle/image-lighting class
  names can appear in legitimate authored content.
- These controls drive Xiumi's editor-side cover image, music/video enhanced mode, custom title,
  gutter, tag, and image-ratio settings. They are not article DOM and must not appear in WeChat,
  Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi meta panel control residue` for WeChat,
  Xiaohongshu, and Zhihu when supported meta-panel class or id markers appear.
- A reduced fixture containing only `toggle-green-gray` meta-panel controls must fail even when
  sidebar/tab controls, right-toolbar controls, text-toolbar controls, font-family menus,
  color-selector controls, operation-bar controls, UI Bootstrap directives, top operation classes,
  broad Angular `ng-*` attributes/classes, paper auxiliary tree controls, selection overlays,
  crop/worker controls, operator-dock parents, operator depot items, `op-loader`, broad `tn-*`,
  `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`,
  `touch-action`, or `user-select` markers are absent.
- The detector must not block ordinary prose containing cover, music, video, custom title,
  spacing, tag, ratio, metadata, toggle, or image wording by itself. It must stay anchored to
  Xiumi-specific meta-panel class/id names.

### 3. Required Checks

- Use TDD to prove the reduced meta-panel fixture fails before implementation and reports
  `Xiumi meta panel control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi sidebar tab control residue`,
  `Xiumi right toolbar control residue`, `Xiumi text toolbar control residue`, and
  `Xiumi theme color mask residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 135. 135 SVG Editor Toolbar Residue - 2026-06-26

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 SVG editor HTML contains top toolbar controls observed
  in a live CloakBrowser 135 SVG editor DOM readback, such as `editor-toolbar`,
  `editor-toolbar__tool`, `toolbar-tool`, `bar-item`, `bar-item__label`,
  `delete-dropdown_entry`, `tool-dropdown_entry`, and `team_btn`.
- These controls drive 135's editor-side undo/redo, gap removal, layer movement, spacing, copy,
  delete, tool dropdown, and team-mode toolbar. They are not article DOM and must not appear in
  WeChat, Xiaohongshu, or Zhihu publishable output.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 SVG editor toolbar residue` for WeChat,
  Xiaohongshu, and Zhihu when supported toolbar class/id markers appear.
- A reduced fixture containing only toolbar controls must fail even when 135 SVG canvas markers,
  shell wrappers, layout controls, material-panel controls, known 135 `data-name` values,
  hosted-media, trigger overlays, Ant switch controls, `svg:135` styles, and
  `background-size:100.1%` background shells are absent.
- The detector must not block ordinary prose containing toolbar, undo, redo, spacing, copy,
  delete, team, or tool wording by itself. It must stay anchored to 135-specific toolbar class/id
  names.

### 3. Required Checks

- Use TDD to prove the reduced toolbar fixture fails before implementation and reports
  `135 SVG editor toolbar residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `135 SVG editor layout control residue`,
  `135 SVG editor shell residue`, `135 SVG material panel residue`, and
  `135 SVG trigger switch control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, or publish success.

## 208. Xiumi Audio Library Control Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the hidden audio library control
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback:
  `<audio id="audio-library-control" class="bgm-audio ...">`.
- The element lives inside the Xiumi left-side audio/video library panel and is used by the editor
  to preview or control selected background/library music. It is not publishable article audio, a
  platform-safe media embed, an upload manifest, or target-platform proof.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi audio library control residue` for WeChat,
  Xiaohongshu, and Zhihu when an `<audio>` element carries the exact
  `id="audio-library-control"` marker.
- A reduced fixture containing only that `<audio>` id must fail even when Xiumi audio panel
  wrappers, hidden upload inputs, generated-link controls, account/sync panels, Angular runtime
  attributes, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary `<audio>` elements, article prose about audio/music/video,
  `class="bgm-audio"` without the live Xiumi id, or media wording by itself.

### 3. Required Checks

- Use TDD to prove the reduced audio-library-control fixture emits no market-editor residue issue
  before implementation and reports `Xiumi audio library control residue` after the detector
  update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi media upload input residue`, `Xiumi audio panel residue`,
  and `Xiumi generated link control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, media playback, or
  publish success.

## 209. Xiumi Audio Room Tab Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains audio/video library tab controls
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, such as
  `tn-aud-rooms-tab` and `tn-aud-room-item`.
- The live nodes are editor-side tab controls for switching between system music, personal music,
  and personal video rooms. They are not article body DOM, platform-safe media embeds, upload
  manifests, or target-platform playback proof.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi audio room tab residue` for WeChat,
  Xiaohongshu, and Zhihu when supported audio-room tab class/id markers appear.
- A reduced fixture containing only `tn-aud-rooms-tab` / `tn-aud-room-item` must fail even when
  Xiumi audio panel wrappers, hidden upload inputs, hidden audio-library controls, generated-link
  controls, account/sync panels, Angular runtime attributes, hosted media, sidebar controls, or
  meta panels are absent.
- The detector must not block ordinary tab/list markup, ordinary music/video prose, ordinary
  `<audio>` elements, or standard Bootstrap `nav nav-tabs` classes by themselves.

### 3. Required Checks

- Use TDD to prove the reduced audio-room-tab fixture emits no market-editor residue issue before
  implementation and reports `Xiumi audio room tab residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi media upload input residue`,
  `Xiumi audio library control residue`, `Xiumi audio panel residue`, and
  `Xiumi generated link control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, media playback, or
  publish success.

## 210. Xiumi Login Layer Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains login, authorization, or
  preview overlay shells observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, using
  the source-specific `tn-login-layer` class marker.
- The same live shells contained contextual children such as `auth-wnd wx-auth-wnd container`,
  `tt-preview-wnd container`, and login-state text. Those child classes are evidence context only
  and must not become broad standalone triggers because authorization/login/preview wording can
  appear in legitimate article prose.
- These shells are editor/account chrome for authorization management, platform preview dialogs,
  and login state. They are not article body DOM, platform-safe layout, upload manifests, or
  target-platform proof.
- This rule is additive. It must not alter renderer output, style availability, selectable
  actions, release-gate success accounting, clipboard behavior, account state, upload, sync,
  schedule, or publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi login layer residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id value carries `tn-login-layer`.
- A reduced fixture containing only `tn-login-layer` must fail even when account/sync panels,
  audio panel wrappers, audio-room tabs, hidden audio-library controls, hidden upload inputs,
  generated-link controls, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels are absent.
- The detector must not block ordinary authorization, login, preview, account, or popup wording by
  itself. It must stay anchored to the Xiumi-specific `tn-login-layer` marker.

### 3. Required Checks

- Use TDD to prove the reduced login-layer fixture emits only the broad market-editor residue
  classification before implementation and reports `Xiumi login layer residue` after the detector
  update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi account sync panel residue`,
  `Xiumi audio panel residue`, `Xiumi audio room tab residue`,
  `Xiumi audio library control residue`, and `Xiumi generated link control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, media playback, account
  authorization, preview dialog success, or publish success.

## 211. Xiumi Template Entry Block Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains template recommendation or
  entry-block chrome observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, using
  the source-specific `tn-tpl-entry-ex-block` class marker.
- The live nodes were visible around template-library entry areas such as "latest templates" and
  "refresh" affordances. They are not article body DOM, source-owned InkForge layout, or platform
  proof.
- This rule is additive and diagnostic. The broad `Xiumi template authoring tree residue` and
  `Xiumi tn-* attribute` fallbacks may still fire for the same fragment, but the exact
  `Xiumi template entry block residue` label must be present when this marker appears.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi template entry block residue` for WeChat,
  Xiaohongshu, and Zhihu when a class or id value carries `tn-tpl-entry-ex-block`.
- A reduced fixture containing only `tn-tpl-entry-ex-block` must fail even when renderer-pipeline
  attributes, source-house markers, scene markers, template-card hover classes, hosted media,
  Angular runtime attributes, sidebar controls, or meta panels are absent.
- The detector must not block ordinary template, latest, refresh, entry, recommendation, or block
  wording by itself. It must stay anchored to the Xiumi-specific class/id marker.

### 3. Required Checks

- Use TDD to prove the reduced template-entry-block fixture lacks the exact label before
  implementation and reports `Xiumi template entry block residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi template authoring tree residue`,
  `Xiumi template renderer pipeline residue`, `Xiumi template scene marker residue`, and
  `Xiumi source-house authoring residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, template reuse rights,
  public-host acceptance, or publish success.

## 212. Xiumi Component Depot Native Control Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot native/embed
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-audio-card`, `dc-ce-music-card`, `dc-ce-map`, `dc-ce-map-tx`,
  `dc-ce-profile-card`, `dc-ce-redpack-cover`, `dc-ce-svg`, `dc-ce-video-card`,
  `dc-ce-video-link`, `dc-ce-video-tx`, or `dc-ce-video-xm`.
- These markers are editor-side insertable component entries for media, map, profile, red-packet,
  SVG, and video controls. They are not article body DOM, reusable InkForge source, platform-safe
  embeds, media playback proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the native/embed component family must now receive
  the more precise `Xiumi component depot native control residue` label.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot native control residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported `dc-ce-*`
  native/embed component marker.
- A reduced fixture containing only native/embed component markers must fail even when
  `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  attribute-board controls, generated-link controls, audio panels, media upload inputs, Angular
  runtime attributes, hosted media, sidebar controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced
  native/embed component fixture.
- The detector must not block ordinary audio, music, map, profile, red packet, SVG, video, or
  component wording by itself. It must stay anchored to Xiumi-specific `dc-ce-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced native/embed component fixture reports only the broad operator-depot
  label before implementation and reports `Xiumi component depot native control residue` after the
  detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operator depot item residue`,
  `Xiumi operator dock control residue`, and `Xiumi attribute board control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, media playback,
  native/embed component acceptance, public-host acceptance, or publish success.

## 213. Xiumi Component Depot Form Input Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot form/input
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-input-checkbox`, `dc-ce-input-radio`, `dc-ce-input-select`, `dc-ce-input-text`, and
  `dc-ce-input-multi-line-text`.
- These markers are editor-side insertable input controls for form-like interactive components.
  They are not article body DOM, reusable InkForge source, WeChat-safe H5 proof, form submission
  proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the form/input component family must now receive
  the more precise `Xiumi component depot form input residue` label.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot form input residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported
  `dc-ce-input-*` component marker.
- A reduced fixture containing only form/input component markers must fail even when `op-dc-*`,
  `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents, layout/form panels,
  layout/form child controls, attribute-board controls, generated-link controls, Angular runtime
  attributes, hosted media, sidebar controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced
  form/input component fixture.
- The detector must not block ordinary checkbox, radio, select, text input, textarea, form, survey,
  or interaction wording by itself. It must stay anchored to Xiumi-specific `dc-ce-input-*`
  class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced form/input component fixture reports only the broad operator-depot
  label before implementation and reports `Xiumi component depot form input residue` after the
  detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot native control residue`,
  `Xiumi operator depot item residue`, and `Xiumi attribute board control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, H5/form interaction,
  native component acceptance, public-host acceptance, or publish success.

## 214. Xiumi Component Depot Layout Geometry Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot layout/geometry
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-layout-column`, `dc-ce-layout-fixed-aspect-ratio`, `dc-ce-layout-free`,
  `dc-ce-layout-hidden`, `dc-ce-layout-scroll-direction`, `dc-ce-layout-style`,
  `dc-ce-layout-transparent`, `dc-ce-layout-vertical-align`, `dc-ce-auto-align`,
  `dc-ce-frozen`, `dc-ce-height`, `dc-ce-margin`, `dc-ce-spacing`,
  `dc-ce-static-position-size`, and `dc-ce-width`.
- These markers are editor-side controls for free layout, hidden state, column layout, scroll
  direction, fixed aspect ratio, transparency, alignment, width, height, margin, spacing, frozen
  state, and static position/size. They are not article body DOM, reusable InkForge source,
  WeChat-safe free-layout proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the layout/geometry component family must now
  receive the more precise `Xiumi component depot layout geometry residue` label.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot layout geometry residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported layout/geometry
  `dc-ce-*` marker.
- A reduced fixture containing only layout/geometry component markers must fail even when
  `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents, layout/form
  panels, layout/form child controls, attribute-board controls, generated-link controls, Angular
  runtime attributes, hosted media, sidebar controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced
  layout/geometry component fixture.
- The detector must not block ordinary layout, width, height, margin, spacing, alignment, frozen,
  hidden, transparent, column, scroll, or aspect-ratio wording by itself. It must stay anchored to
  Xiumi-specific `dc-ce-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced layout/geometry component fixture reports only the broad
  operator-depot label before implementation and reports
  `Xiumi component depot layout geometry residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot native control residue`,
  `Xiumi component depot form input residue`, `Xiumi operator depot item residue`,
  `Xiumi layout form panel residue`, and `Xiumi layout form child residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, free-layout
  interaction, native component acceptance, public-host acceptance, or publish success.

## 215. Xiumi Component Depot Mobile Viewport Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot mobile viewport
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-mobile-background`, `dc-ce-mobile-group`, `dc-ce-mobile-image`,
  `dc-ce-mobile-text`, and `dc-ce-mobile-unsupport`.
- These markers are editor-side mobile viewport, grouping, image/text preview, or unsupported
  state controls. They are not article body DOM, reusable InkForge source, WeChat phone preview
  proof, H5 proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the mobile viewport component family must now
  receive the more precise `Xiumi component depot mobile viewport residue` label.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot mobile viewport residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported mobile viewport
  `dc-ce-mobile-*` marker.
- A reduced fixture containing only the supported mobile viewport component markers must fail even
  when `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  layout/geometry controls, form/input controls, native/embed controls, attribute-board controls,
  generated-link controls, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced
  mobile viewport component fixture.
- The detector must not block ordinary mobile, background, group, image, text, unsupported,
  viewport, preview, or responsive wording by itself. It must stay anchored to Xiumi-specific
  `dc-ce-mobile-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced mobile viewport component fixture reports only the broad
  operator-depot label before implementation and reports
  `Xiumi component depot mobile viewport residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot native control residue`,
  `Xiumi component depot form input residue`, `Xiumi component depot layout geometry residue`, and
  `Xiumi operator depot item residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, mobile viewport
  acceptance, H5 interaction, public-host acceptance, or publish success.

## 216. Xiumi Component Depot Table Control Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot table controls
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-classic-table-column-width`, `dc-ce-classic-table-grid`,
  `dc-ce-classic-table-merge`, `dc-ce-classic-table-quickly`,
  `dc-ce-classic-table-style`, and `dc-ce-classic-table-width`.
- These markers are editor-side table grid, column width, merge, quick table, style, and width
  controls. They are not article body table DOM, reusable InkForge source, WeChat complex-table
  proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the table control component family must now
  receive the more precise `Xiumi component depot table control residue` label.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot table control residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported classic table
  `dc-ce-classic-table-*` marker.
- A reduced fixture containing only the supported table control component markers must fail even
  when `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  layout/geometry controls, form/input controls, native/embed controls, mobile viewport controls,
  attribute-board controls, generated-link controls, Angular runtime attributes, hosted media,
  sidebar controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced table
  control component fixture.
- The detector must not block ordinary `table`, `thead`, `tbody`, `tr`, `td`, `th`, table width,
  grid, column-width, merge, style, or quick-table wording by itself. It must stay anchored to
  Xiumi-specific `dc-ce-classic-table-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced table control component fixture reports only the broad
  operator-depot label before implementation and reports
  `Xiumi component depot table control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot native control residue`,
  `Xiumi component depot form input residue`, `Xiumi component depot layout geometry residue`,
  `Xiumi component depot mobile viewport residue`, and `Xiumi operator depot item residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, complex-table
  rendering, table merge/width fidelity, public-host acceptance, or publish success.

## 217. Xiumi Component Depot Image Transform Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot image transform
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-crop-image-crop`, `dc-ce-image-animation`, `dc-ce-image-crop`,
  `dc-ce-image-design`, `dc-ce-image-enhancement`, `dc-ce-image-flip`,
  `dc-ce-image-for-layout-datum`, `dc-ce-image-library`, `dc-ce-image-png-size`,
  `dc-ce-image-popup`, `dc-ce-image-replace-color`, `dc-ce-image-src`,
  `dc-ce-image-straw-color`, `dc-ce-image-style-brush`, `dc-ce-image-svg-clip`, and
  `dc-ce-image-to-background`.
- These markers are editor-side image crop, animation, design, enhancement, flip, layout datum,
  library, PNG sizing, popup, color replacement, source, color sampling, style brush, SVG clip,
  and background conversion controls. They are not article body image DOM, reusable InkForge
  source, WeChat image fidelity proof, cover proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback, and `dc-ce-crop-image-crop` also overlapped with
  the crop-panel child detector. The image transform component family must now receive the more
  precise `Xiumi component depot image transform residue` label without double-reporting.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot image transform residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported image transform
  `dc-ce-*` marker.
- A reduced fixture containing only the supported image transform component markers must fail even
  when `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  table controls, layout/geometry controls, form/input controls, native/embed controls,
  mobile viewport controls, crop panels, worker surfaces, hosted media, sidebar controls, or meta
  panels are absent.
- The broad `Xiumi operator depot item residue` detector and the `Xiumi crop panel child control
  residue` detector must not double-report that reduced image transform component fixture.
- The detector must not block ordinary `<img>`, `figure`, image source, crop, animation, SVG clip,
  color, popup, background, PNG size, or picture wording by itself. It must stay anchored to
  Xiumi-specific `dc-ce-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced image transform component fixture reports only broad/overlapping
  residue labels before implementation and reports
  `Xiumi component depot image transform residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot native control residue`,
  `Xiumi component depot form input residue`, `Xiumi component depot layout geometry residue`,
  `Xiumi component depot table control residue`, `Xiumi component depot mobile viewport residue`,
  `Xiumi operator depot item residue`, and `Xiumi crop panel child control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, image crop fidelity,
  SVG clip fidelity, popup image behavior, cover thumbnail acceptance, public-host acceptance, or
  publish success.

## 218. Xiumi Component Depot Typography Control Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot typography
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-font-size-scale`, `dc-ce-paragraph-margin`, `dc-ce-text-all`,
  `dc-ce-text-code`, `dc-ce-text-decoration`, `dc-ce-text-shadow`, and
  `dc-ce-text-shadow-style`.
- These markers are editor-side typography, paragraph spacing, full-text formatting, code text,
  text decoration, and text shadow controls. They are not article body text DOM, reusable InkForge
  source, WeChat typography fidelity proof, code-block proof, upload manifests, or target-platform
  proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the typography component family must now receive
  the more precise `Xiumi component depot typography control residue` label.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi component depot typography control residue` for WeChat, Xiaohongshu, and Zhihu when a
  class or id value carries a supported typography `dc-ce-*` marker.
- A reduced fixture containing only the supported typography component markers must fail even when
  `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  image transform controls, table controls, layout/geometry controls, form/input controls,
  native/embed controls, mobile viewport controls, hosted media, text toolbars, sidebar controls,
  or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced
  typography component fixture.
- The detector must not block ordinary paragraph spacing, code text, text decoration, text shadow,
  font size, or formatting wording by itself. It must stay anchored to Xiumi-specific `dc-ce-*`
  class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced typography component fixture reports only the broad operator-depot
  label before implementation and reports `Xiumi component depot typography control residue`
  after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot native control residue`,
  `Xiumi component depot form input residue`, `Xiumi component depot layout geometry residue`,
  `Xiumi component depot table control residue`, `Xiumi component depot image transform residue`,
  `Xiumi component depot mobile viewport residue`, and `Xiumi operator depot item residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, paragraph spacing
  fidelity, code typography fidelity, text-shadow rendering, Dark Mode, public-host acceptance, or
  publish success.

## 219. Xiumi Component Depot Box Style Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot box/background
  style controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-background`, `dc-ce-box-border`, `dc-ce-box-formats`, `dc-ce-box-metrics`,
  `dc-ce-box-shadow`, and `dc-ce-transparency`.
- These markers are editor-side background, border, box format, box metric, shadow, and
  transparency controls. They are not article body decoration DOM, reusable InkForge source,
  WeChat visual-style fidelity proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the box/background style component family must
  now receive the more precise `Xiumi component depot box style residue` label.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot box style residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported box/background
  style `dc-ce-*` marker.
- A reduced fixture containing only the supported box/background style component markers must fail
  even when `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  image transform controls, typography controls, table controls, layout/geometry controls,
  form/input controls, native/embed controls, mobile viewport controls, hosted media, sidebar
  controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced
  box/background style component fixture.
- The detector must not block ordinary CSS background, border, shadow, opacity, transparency, box
  model, formatting, or visual-style wording by itself. It must stay anchored to Xiumi-specific
  `dc-ce-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced box/background style component fixture reports only the broad
  operator-depot label before implementation and reports `Xiumi component depot box style residue`
  after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot native control residue`,
  `Xiumi component depot form input residue`, `Xiumi component depot layout geometry residue`,
  `Xiumi component depot table control residue`, `Xiumi component depot image transform residue`,
  `Xiumi component depot typography control residue`,
  `Xiumi component depot mobile viewport residue`, and `Xiumi operator depot item residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, visual-style fidelity,
  background rendering, border/shadow fidelity, transparency rendering, Dark Mode, public-host
  acceptance, or publish success.

## 220. Xiumi Component Depot Table Auxiliary Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot table auxiliary
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-table-column-width`, `dc-ce-table-grid`, and `dc-ce-table-style-brush`.
- These markers are editor-side table column width, grid, and style-brush controls. They are not
  article body table DOM, reusable InkForge source, WeChat table fidelity proof, upload manifests,
  or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the non-classic table auxiliary component family
  must now receive the more precise `Xiumi component depot table auxiliary residue` label.
- This rule must stay separate from `Xiumi component depot table control residue`, which covers
  the `dc-ce-classic-table-*` family.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot table auxiliary residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported table auxiliary
  `dc-ce-*` marker.
- A reduced fixture containing only the supported table auxiliary component markers must fail even
  when `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  classic-table controls, image transform controls, box style controls, typography controls,
  layout/geometry controls, form/input controls, native/embed controls, mobile viewport controls,
  hosted media, sidebar controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced table
  auxiliary component fixture.
- The detector must not block ordinary HTML tables, Markdown tables, CSS grid wording, column
  width wording, or style brush wording by itself. It must stay anchored to Xiumi-specific
  `dc-ce-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced table auxiliary component fixture reports only the broad
  operator-depot label before implementation and reports
  `Xiumi component depot table auxiliary residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot table control residue`,
  `Xiumi component depot native control residue`, `Xiumi component depot form input residue`,
  `Xiumi component depot layout geometry residue`,
  `Xiumi component depot image transform residue`, `Xiumi component depot box style residue`,
  `Xiumi component depot typography control residue`,
  `Xiumi component depot mobile viewport residue`, and `Xiumi operator depot item residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, table rendering,
  column-width fidelity, grid fidelity, style-brush fidelity, public-host acceptance, or publish
  success.

## 221. Xiumi Component Depot SVG Animation Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot SVG/animation
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-animation`, `dc-ce-svg-animate`, and `dc-ce-svg-animation`.
- These markers are editor-side animation and SVG effect controls. They are not applied article
  SVG output, reusable InkForge source, WeChat SVG fidelity proof, mobile SMIL/click proof, upload
  manifests, or target-platform proof.
- This rule is additive and diagnostic. `dc-ce-animation` used to fall through the broad
  `Xiumi operator depot item residue` fallback, while `dc-ce-svg-animate` and
  `dc-ce-svg-animation` could be overmatched by the native `dc-ce-svg` detector. The animation
  component family must now receive `Xiumi component depot SVG animation residue` without
  double-reporting native or generic operator-depot labels.
- This rule must not relabel plain `dc-ce-svg`, which remains covered by
  `Xiumi component depot native control residue`.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi component depot SVG animation residue` for
  WeChat, Xiaohongshu, and Zhihu when a class or id value carries a supported SVG/animation
  `dc-ce-*` marker.
- A reduced fixture containing only the supported SVG/animation component markers must fail even
  when plain `dc-ce-svg`, `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`,
  operator-dock parents, animation attribute panels, animation style pickers, native/embed
  controls, image transform controls, box style controls, typography controls, table controls,
  layout/geometry controls, form/input controls, mobile viewport controls, hosted media, sidebar
  controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector and the
  `Xiumi component depot native control residue` detector must not double-report that reduced
  SVG/animation component fixture.
- The detector must not block ordinary CSS animation text, SVG prose, SVG markup, or SMIL-related
  wording by itself. It must stay anchored to Xiumi-specific `dc-ce-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced SVG/animation component fixture reports only broad/native residue
  labels before implementation and reports `Xiumi component depot SVG animation residue` after
  the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot native control residue`,
  `Xiumi component depot form input residue`, `Xiumi component depot table auxiliary residue`,
  `Xiumi component depot image transform residue`, `Xiumi component depot box style residue`,
  `Xiumi component depot typography control residue`, and `Xiumi operator depot item residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, SVG animation fidelity,
  mobile SMIL/click interaction, H5 behavior, public-host acceptance, or publish success.

## 222. Xiumi Component Depot External Edit Link Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component-depot external
  edit/link controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-ce-out-cell-edit` and `dc-ce-play-cp-link`.
- These markers are editor-side external cell editing and component play-link controls. They are
  not article body links, reusable InkForge source, WeChat link fidelity proof, upload manifests,
  or target-platform proof.
- This rule is additive and diagnostic. These markers used to fall through the broad
  `Xiumi operator depot item residue` fallback; the external edit/link component family must now
  receive the more precise `Xiumi component depot external edit link residue` label.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi component depot external edit link residue` for WeChat, Xiaohongshu, and Zhihu when a
  class or id value carries a supported external edit/link `dc-ce-*` marker.
- A reduced fixture containing only the supported external edit/link component markers must fail
  even when `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  generated-link controls, attribute-board controls, native/embed controls, SVG/animation
  controls, image transform controls, box style controls, typography controls, table controls,
  layout/geometry controls, form/input controls, mobile viewport controls, hosted media, sidebar
  controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced
  external edit/link component fixture.
- The detector must not block ordinary article anchors, table-cell text, link wording, edit
  wording, play wording, or component wording by itself. It must stay anchored to Xiumi-specific
  `dc-ce-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced external edit/link component fixture reports only the broad
  operator-depot label before implementation and reports
  `Xiumi component depot external edit link residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi component depot SVG animation residue`,
  `Xiumi component depot native control residue`, `Xiumi component depot form input residue`,
  `Xiumi component depot table auxiliary residue`,
  `Xiumi component depot image transform residue`, `Xiumi component depot box style residue`,
  `Xiumi component depot typography control residue`, and `Xiumi operator depot item residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, link fidelity,
  external component behavior, public-host acceptance, or publish success.

## 223. Xiumi Component Operation Depot Action Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains component operation-depot
  action controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `dc-cp-link`, `dc-cp-copy-to-clipboard`, `dc-cp-wx-miniprogram-link`,
  `dc-cp-out-comp-edit`, `dc-cp-quick-input-prompt`, `dc-cp-replace-template`,
  `dc-cp-rolling-over`, and `dc-cp-zorder`.
- These markers are editor-side component operation menu actions. They are not article body
  links, reusable InkForge source, WeChat link fidelity proof, H5 interaction proof, upload
  manifests, or target-platform proof.
- This rule is additive and diagnostic. These markers previously fell through the broad
  `Xiumi operator depot item residue` fallback; the operation-depot action family must now
  receive the more precise `Xiumi component operation depot action residue` label.
- This rule must stay separate from the `dc-ce-*` component element families. `dc-ce-*` describes
  component element controls, while `dc-cp-*` describes component operation actions around an
  existing component.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi component operation depot action residue` for WeChat, Xiaohongshu, and Zhihu when a
  class or id value carries a supported `dc-cp-*` operation action marker.
- A reduced fixture containing only supported `dc-cp-*` action markers must fail even when
  `op-dc-*`, `ce-dc`, `cp-dc`, `dc-ce-*`, `dc-multi-cp-*`, `tn-op-dc-item`,
  operator-dock parents, generated-link controls, attribute-board controls, native/embed
  controls, SVG/animation controls, image transform controls, box style controls, typography
  controls, table controls, layout/geometry controls, form/input controls, mobile viewport
  controls, hosted media, sidebar controls, or meta panels are absent.
- The broad `Xiumi operator depot item residue` detector must not double-report that reduced
  `dc-cp-*` operation action fixture.
- The detector must not block ordinary article anchors, clipboard prose, mini-program prose,
  replacement wording, rolling-over wording, z-index wording, operation wording, or component
  wording by itself. It must stay anchored to Xiumi-specific `dc-cp-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced `dc-cp-*` operation action fixture reports only the broad
  operator-depot label before implementation and reports
  `Xiumi component operation depot action residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operator depot item residue`,
  `Xiumi component depot external edit link residue`,
  `Xiumi component depot SVG animation residue`,
  `Xiumi component depot native control residue`,
  `Xiumi component depot form input residue`,
  `Xiumi component depot table auxiliary residue`,
  `Xiumi component depot image transform residue`,
  `Xiumi component depot box style residue`, and
  `Xiumi component depot typography control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, link fidelity,
  component action behavior, H5 behavior, public-host acceptance, or publish success.

## 224. Xiumi Operation Panel Component Control Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains operation-panel component
  controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `op-cp-animation`, `op-cp-insert-text`, `op-cp-margin`, `op-cp-margin-tb`,
  `op-cp-save`, `op-cp-scale`, `op-ce-bg-bar`, and `op-ce-profile-card`.
- These markers are editor-side operation panel controls for animation, text insertion, margin,
  save, scale, background bar, and profile-card configuration. They are not article body
  components, reusable InkForge source, WeChat profile-card proof, H5 interaction proof, upload
  manifests, or target-platform proof.
- This rule is additive and diagnostic. These single-token markers previously passed quality
  detection after broader operation-panel cleanup; the operation-panel component-control family
  must now receive the precise `Xiumi operation panel component control residue` label.
- This rule must stay separate from `Xiumi operator dock control residue`, which covers dock and
  external edit panel shells, and from `Xiumi generated link control residue`, which covers
  generated link and selected `op-cp-*` link-specific panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi operation panel component control residue` for WeChat, Xiaohongshu, and Zhihu when a
  class or id value carries a supported `op-cp-*` or `op-ce-*` operation-panel marker.
- A reduced fixture containing only supported operation-panel component-control markers must fail
  even when `op-dock`, `out-comp-*`, `op-ce-layout-*`, `op-cp-pose`,
  `op-cp-paper-comps-assistant`, `op-gen-link`, `op-cp-background-audio`,
  `op-cp-wx-miniprogram-link`, `dc-cp-*`, `dc-ce-*`, `tn-op-dc-item`, paper auxiliary tree
  controls, generated-link controls, attribute-board controls, hosted media, sidebar controls, or
  meta panels are absent.
- The detector must not block ordinary animation wording, insert-text wording, margin CSS, save
  wording, scale wording, background wording, profile-card prose, or article text by itself. It
  must stay anchored to Xiumi-specific `op-cp-*` / `op-ce-*` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced operation-panel component-control fixture emits no
  market-editor-residue issue before implementation and reports
  `Xiumi operation panel component control residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operator dock control residue`,
  `Xiumi generated link control residue`, and
  `Xiumi component operation depot action residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, profile-card fidelity,
  component action behavior, H5 behavior, public-host acceptance, or publish success.

## 225. Xiumi Background Transparency Operation Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains background/transparency
  operation controls observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback,
  including `op-background-sec` and `op-gen-transparency`.
- These markers are editor-side background section and generated transparency controls. They are
  not article body background DOM, reusable InkForge source, WeChat background fidelity proof,
  transparency rendering proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. These single-token markers previously passed quality
  detection after broader background-panel cleanup; the background/transparency operation family
  must now receive the precise `Xiumi background transparency operation residue` label.
- This rule must stay separate from `Xiumi background attribute control residue`, which covers
  background attribute menus and `op-cp-bg-bar` child controls.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi background transparency operation residue` for WeChat, Xiaohongshu, and Zhihu when a
  class or id value carries `op-background-sec` or `op-gen-transparency`.
- A reduced fixture containing only supported background/transparency operation markers must fail
  even when `bg-attr-menu`, `bg-repeat-select`, `bg-attach-check`, `ce-op-background`,
  `op-cp-bg-bar`, crop panels, worker surfaces, operation-panel component controls,
  generated-link controls, attribute-board controls, hosted media, sidebar controls, or meta
  panels are absent.
- The detector must not block ordinary background wording, transparency wording, generated-image
  wording, CSS background properties, CSS opacity properties, or article text by itself. It must
  stay anchored to Xiumi-specific `op-background-sec` / `op-gen-transparency` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced background/transparency operation fixture emits no
  market-editor-residue issue before implementation and reports
  `Xiumi background transparency operation residue` after the detector update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi background attribute control residue` and
  `Xiumi operation panel component control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, background fidelity,
  transparency fidelity, Dark Mode behavior, public-host acceptance, or publish success.

## 226. Xiumi State Loading Utility Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains state/loading utility controls
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `tn-state-transition-animation`, `tn-input-sortable-group`, `tn-bar-btn-active-color`,
  `tn-loading-overlap`, and `tn-top-loading-block`.
- These markers are editor-side transition, sortable input group, toolbar active-color, overlap
  loading, and top-loading utility controls. They are not article body state, reusable InkForge
  source, WeChat loading animation fidelity proof, H5 interaction proof, upload manifests, or
  target-platform proof.
- This rule is additive and diagnostic. These single-token markers previously passed quality
  detection after broader state/loading cleanup; the state/loading utility family must now receive
  the precise `Xiumi state loading utility residue` label.
- This rule must stay separate from `Xiumi quick input residue`, `Xiumi state toggle residue`,
  `Xiumi sortable pin residue`, and `Xiumi group sortable box residue`, which cover adjacent but
  different Xiumi authoring tokens.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi state loading utility residue` for WeChat, Xiaohongshu, and Zhihu when a class or id
  value carries a supported `tn-*` state/loading utility marker.
- A reduced fixture containing only supported state/loading utility markers must fail even when
  `tn-quick-input*`, `tn-state-active`, `tn-state-frozen`, `tn-sortable-pin`,
  `tn-group-sortable-box`, operation-panel controls, component-depot controls, hosted media,
  sidebar controls, or meta panels are absent.
- The detector must not block ordinary state wording, loading wording, transition wording,
  sortable wording, active-color prose, loading UI text, CSS transition properties, CSS animation
  properties, or article text by itself. It must stay anchored to Xiumi-specific
  `tn-state-transition-animation`, `tn-input-sortable-group`, `tn-bar-btn-active-color`,
  `tn-loading-overlap`, or `tn-top-loading-block` class/id markers.

### 3. Required Checks

- Use TDD to prove the reduced state/loading utility fixture emits no market-editor-residue issue
  before implementation and reports `Xiumi state loading utility residue` after the detector
  update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi quick input residue`, `Xiumi state toggle residue`,
  `Xiumi sortable pin residue`, `Xiumi group sortable box residue`,
  `Xiumi operation panel component control residue`, and
  `Xiumi background transparency operation residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, state/loading
  animation fidelity, H5 behavior, Dark Mode behavior, public-host acceptance, or publish success.

## 227. Xiumi Color Selector Class Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains color selector class controls
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `tn-color-selector` and `tn-color-selector-x`.
- These markers are editor-side color selector class controls. They are not article body color
  styling, reusable InkForge source, WeChat color fidelity proof, Dark Mode proof, upload
  manifests, or target-platform proof.
- This rule is additive and diagnostic. `tn-color-selector` was already covered as an authoring
  directive/attribute, but the live editor also emits it as a class token. A cleaned-down class-only
  fragment must now receive the existing precise `Xiumi color selector control residue` label.
- This rule must stay separate from `Xiumi color palette panel residue`,
  `Xiumi color picker trigger residue`, `Xiumi theme color widget residue`, and
  `Xiumi font and format control residue`, which cover adjacent but different color/text UI
  controls.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi color selector control residue` for WeChat, Xiaohongshu, and Zhihu when a class or id
  value carries `tn-color-selector` or `tn-color-selector-x`.
- A reduced fixture containing only `tn-color-selector` and `tn-color-selector-x` must fail even
  when color selector dropdowns, theme color controls, `tn-color-circle`, color selector
  directives, palette panels, picker triggers, theme color widgets, hosted media, sidebar controls,
  or meta panels are absent.
- The detector must not block ordinary color wording, selector wording, CSS color properties,
  palette prose, user article text, generic form controls, or non-Xiumi class names by itself. It
  must stay anchored to Xiumi-specific `tn-color-selector` / `tn-color-selector-x` class/id markers
  or the existing color selector directives.

### 3. Required Checks

- Use TDD to prove the reduced color selector class fixture emits no market-editor-residue issue
  before implementation and reports `Xiumi color selector control residue` after the detector
  update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi color palette panel residue`,
  `Xiumi color picker trigger residue`, `Xiumi theme color widget residue`,
  `Xiumi color selector control residue`, and `Xiumi font and format control residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, color fidelity,
  Dark Mode behavior, public-host acceptance, or publish success.

## 228. Xiumi Text Operation Section Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains text operation section controls
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including standalone
  `op-text-sec`.
- This marker is an editor-side text operation section shell. It is not article body typography,
  reusable InkForge source, WeChat typography fidelity proof, Dark Mode proof, upload manifests, or
  target-platform proof.
- This rule is additive and diagnostic. `op-text-sec` was already covered when paired with
  `font-size`, `font-family`, `text-style`, or `text-misc`; the live editor can also leave a
  cleaned-down standalone operation section that must receive the existing precise
  `Xiumi text toolbar control residue` label.
- This rule must stay separate from `Xiumi color selector control residue`,
  `Xiumi font and format control residue`, `Xiumi text editing flyout residue`, and
  `Xiumi brush panel residue`, which cover adjacent but different text/color UI controls.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi text toolbar control residue` for WeChat, Xiaohongshu, and Zhihu when a class or id value
  carries standalone `op-text-sec`.
- A reduced fixture containing only `op-text-sec` must fail even when font-size, font-family,
  text-style, text-misc, color-selector controls, font-format controls, text editing flyouts,
  brush panels, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary text wording, toolbar wording, CSS font properties, article
  typography prose, generic text sections, or non-Xiumi class names by itself. It must stay
  anchored to Xiumi-specific `op-text-sec` class/id markers and preserve earlier color-selector
  rule precedence for color selector fixtures.

### 3. Required Checks

- Use TDD to prove the reduced text operation section fixture emits no market-editor-residue issue
  before implementation and reports `Xiumi text toolbar control residue` after the detector
  update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi color selector control residue`,
  `Xiumi font and format control residue`, `Xiumi text toolbar control residue`,
  `Xiumi text editing flyout residue`, and `Xiumi brush panel residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, typography fidelity,
  Dark Mode behavior, public-host acceptance, or publish success.

## 229. Xiumi Cover Image Description Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains cover image or cover description
  child markers observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `cover-img` and `cover-desc`.
- These markers are editor-side cover child shells. They are not article body cover prose,
  reusable InkForge source, WeChat cover thumbnail acceptance proof, Dark Mode proof, upload
  manifests, or target-platform proof.
- This rule is additive and diagnostic. `cover-imgs` was already covered by the
  `Xiumi cover placeholder residue` detector, but the live editor can also leave a cleaned-down
  single-image child marker plus a description child marker that must receive the same precise
  cover-placeholder label.
- This rule must stay separate from `Xiumi WeChat cover control residue`, which covers cover menu
  and preview controls, from `Xiumi dark mask control residue`, and from
  `Xiumi scale panel control residue`.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi cover placeholder residue` for WeChat, Xiaohongshu, and Zhihu when a class or id value
  carries `cover-img` or `cover-desc`.
- A reduced fixture containing only `cover-img` and `cover-desc` must fail even when
  `cover-imgs`, `cover-placeholder`, `cover-mask`, `mask-border`, `play-placeholder`,
  `second-placeholder`, `op-bar-menu`, `cover-menu`, `op-ce-wx-cover`, `op-dark-mask`,
  generated-link controls, operation-bar controls, hosted media, sidebar controls, or meta panels
  are absent.
- The detector must not block ordinary cover wording, image wording, description wording, article
  cover prose, generic image classes, generic description classes, or non-Xiumi class names by
  itself. It must stay anchored to Xiumi cover placeholder / cover child class or id markers.

### 3. Required Checks

- Use TDD to prove the reduced cover image/description fixture emits no market-editor-residue
  issue before implementation and reports `Xiumi cover placeholder residue` after the detector
  update.
- Regression tests must assert the residue label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi cover placeholder residue`,
  `Xiumi WeChat cover control residue`, `Xiumi dark mask control residue`, and
  `Xiumi scale panel control residue` independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, cover thumbnail
  acceptance, Dark Mode behavior, public-host acceptance, or publish success.

## 230. Xiumi Animation Picker Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains animation picker / animation
  operation directives observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback,
  including `tn-animation-picker`, `tn-animation-selector`, `tn-animate-x-clipboard`,
  `tn-animate-x-creator`, `tn-animate-x-list`, `tn-animate-x-selector`, and
  `tn-animate-x-unit`.
- These markers are editor-side animation picker and animation clipboard/list/unit directives.
  They are not article body animation semantics, reusable InkForge source, WeChat SMIL proof,
  H5 interaction proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  these directives, but a cleaned-down animation directive fragment must receive the precise
  `Xiumi animation picker directive residue` label for actionable diagnostics.
- This rule must stay separate from `Xiumi animation binding metadata residue`,
  `Xiumi animation attribute panel residue`, `Xiumi animation panel child residue`,
  `Xiumi animation style picker residue`, and `Xiumi animate operation panel residue`.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi animation picker directive residue` for WeChat, Xiaohongshu, and Zhihu when supported
  `tn-animation-*` or `tn-animate-x-*` directive attributes appear.
- A reduced fixture containing only supported animation picker directives must fail with the
  precise label even when animation list classes, animation style picker classes, animation
  attribute panels, animate-operation panels, broad Angular runtime attributes/classes, hosted
  media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary animation wording, picker wording, selector wording,
  clipboard wording, list wording, unit wording, CSS animation properties, SVG `<animate>`
  elements, or motion-related article text by itself. It must stay anchored to Xiumi-specific
  directive attribute names.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture;
  the acceptance requirement is that the precise animation picker directive label is also present.

### 3. Required Checks

- Use TDD to prove the reduced animation picker directive fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports the precise
  `Xiumi animation picker directive residue` label after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi animation binding metadata residue`,
  `Xiumi animation attribute panel residue`, `Xiumi animation panel child residue`,
  `Xiumi animation style picker residue`, and `Xiumi animate operation panel residue`
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, SMIL/H5 animation
  fidelity, Dark Mode behavior, public-host acceptance, or publish success.

## 231. Xiumi Preload Image Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the image preload directive
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback: `tn-pre-load-image`.
- This marker is an editor-side image preload directive. It is not article body image markup,
  reusable InkForge source, image loading fidelity proof, upload manifests, public-host proof, or
  target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  this directive, but a cleaned-down preload-image fragment must receive the precise
  `Xiumi preload image directive residue` label for actionable diagnostics.
- This rule must stay separate from `Xiumi image binding metadata residue`, which covers
  `tn-image` / `tn-image-usage`, and from `Xiumi component structure binding metadata residue`.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi preload image directive residue` for WeChat, Xiaohongshu, and Zhihu when
  `tn-pre-load-image` appears as an attribute.
- A reduced fixture containing only `tn-pre-load-image` must fail with the precise label even when
  `tn-image`, `tn-image-usage`, component/cell/page bindings, image presenter classes, raw image
  cell classes, image enhancement controls, hosted media, sidebar controls, or meta panels are
  absent.
- The detector must not block ordinary preload wording, image wording, lazy-loading prose, CSS
  image properties, standard `<img>` markup, article text, or non-Xiumi class names by itself. It
  must stay anchored to the Xiumi-specific `tn-pre-load-image` directive attribute.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the precise preload image directive label is also present.

### 3. Required Checks

- Use TDD to prove the reduced preload image directive fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports the precise
  `Xiumi preload image directive residue` label after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi image binding metadata residue`,
  `Xiumi component structure binding metadata residue`, and the broad `Xiumi tn-* attribute`
  fallback independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, image loading
  fidelity, Dark Mode behavior, public-host acceptance, or publish success.

## 232. Xiumi Operation Panel Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains operation panel/menu directive
  attributes observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback, including
  `tn-panel-move`, `tn-op-back-mask`, and `tn-op-menu`.
- These markers are editor-side operation panel, back-mask, and menu directives. They are not
  article body layout semantics, reusable InkForge source, WeChat panel/menu fidelity proof, H5
  interaction proof, upload manifests, or target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  these directives, but a cleaned-down operation-panel directive fragment must receive the precise
  `Xiumi operation panel directive residue` label for actionable diagnostics.
- This rule must stay separate from `Xiumi operation panel loader residue`,
  `Xiumi operator dock control residue`, `Xiumi operation panel component control residue`, and
  `Xiumi menu pin control residue`.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi operation panel directive residue` for WeChat, Xiaohongshu, and Zhihu when supported
  operation panel/menu directive attributes appear.
- A reduced fixture containing only `tn-panel-move`, `tn-op-back-mask`, and `tn-op-menu` must fail
  with the precise label even when operation panel loader classes, operator dock classes,
  operation panel component controls, menu pin controls, broad Angular runtime attributes/classes,
  hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary panel wording, menu wording, move wording, mask wording,
  CSS positioning properties, article text, or non-Xiumi class names by itself. It must stay
  anchored to Xiumi-specific directive attribute names.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the precise operation panel directive label is also present.

### 3. Required Checks

- Use TDD to prove the reduced operation panel directive fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports the precise
  `Xiumi operation panel directive residue` label after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi operation panel loader residue`,
  `Xiumi operator dock control residue`, `Xiumi operation panel component control residue`, and
  the broad `Xiumi tn-* attribute` fallback independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, panel/menu interaction
  fidelity, H5 behavior, Dark Mode behavior, public-host acceptance, or publish success.

## 233. Xiumi Text Input Begin Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the text-input callback directive
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback: `tn-text-input-begin`.
- This marker is an editor-side text/title/author input begin callback. It is not article body
  typography, reusable InkForge source, WeChat title/author fidelity proof, upload manifests, or
  target-platform proof.
- This rule is additive and diagnostic. `tn-text-input-done` was already covered by the
  `Xiumi font and format control residue` detector, but the live editor also emits the paired
  begin callback. A cleaned-down begin-only fragment must receive the same precise font/format
  label instead of relying only on the broad `Xiumi tn-* attribute` fallback.
- This rule must stay separate from `Xiumi text toolbar control residue`,
  `Xiumi text editing flyout residue`, `Xiumi color selector control residue`, and the broad
  `Xiumi tn-* attribute` fallback.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi font and format control residue` for WeChat, Xiaohongshu, and Zhihu when
  `tn-text-input-begin` appears as an attribute.
- A reduced fixture containing only `tn-text-input-begin` must fail with the precise font/format
  label even when font-family classes, font-size classes, `tn-text-input-done`, text toolbar
  classes, color selector controls, operation-bar controls, broad Angular runtime
  attributes/classes, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary title wording, author wording, input wording, begin
  wording, CSS typography properties, standard text inputs, article text, or non-Xiumi class names
  by itself. It must stay anchored to the Xiumi-specific directive attribute.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the precise font/format label is also present.

### 3. Required Checks

- Use TDD to prove the reduced text-input-begin fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports the precise
  `Xiumi font and format control residue` label after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi color selector control residue`,
  `Xiumi font and format control residue`, `Xiumi text toolbar control residue`, and the broad
  `Xiumi tn-* attribute` fallback independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, title/author input
  fidelity, typography fidelity, Dark Mode behavior, public-host acceptance, or publish success.

## 234. Xiumi Template List Refresh Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the template/material list
  refresh directive observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback:
  `tn-pull-to-refresh`.
- This marker is an editor-side template/material list loading directive. It is not article body
  pagination, reusable InkForge source, WeChat template refresh fidelity proof, upload manifests,
  or target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  this directive, but a cleaned-down refresh directive fragment must receive the precise
  `Xiumi template list refresh directive residue` label for actionable diagnostics.
- This rule must stay separate from `Xiumi template entry block residue`,
  `Xiumi template authoring tree residue`, `Xiumi source-house authoring residue`, and the broad
  `Xiumi tn-* attribute` fallback.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi template list refresh directive residue` for WeChat, Xiaohongshu, and Zhihu when
  `tn-pull-to-refresh` appears as an attribute.
- A reduced fixture containing only `tn-pull-to-refresh` must fail with the precise label even
  when template entry block classes, template authoring tree classes, source-house classes,
  `on-refresh`, `has-more`, `trigger-threshold`, broad Angular runtime attributes/classes, hosted
  media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary template wording, list wording, refresh wording, pull
  wording, pagination prose, standard list markup, article text, or non-Xiumi class names by
  itself. It must stay anchored to the Xiumi-specific directive attribute.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the precise template list refresh label is also present.

### 3. Required Checks

- Use TDD to prove the reduced template list refresh fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports the precise
  `Xiumi template list refresh directive residue` label after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi template entry block residue`,
  `Xiumi template authoring tree residue`, `Xiumi source-house authoring residue`, and the broad
  `Xiumi tn-* attribute` fallback independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, material-list loading
  fidelity, template refresh behavior, Dark Mode behavior, public-host acceptance, or publish
  success.

## 235. Xiumi Editor Interaction Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains editor interaction directives
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback: `tn-snatch-at`,
  `tn-ui-droppable`, `tn-comp-enter-editing`, `tn-comp-exit-editing`,
  `tn-bind-comp-inst-page-mode`, or `tn-data-list`.
- These markers are editor-side drag/drop, component editing-state, page-mode, and data-list
  directives. They are not publishable article interaction semantics, reusable InkForge source,
  upload manifests, WeChat H5 fidelity proof, or target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  these directives, but a cleaned-down editor-interaction fragment must receive the precise
  `Xiumi editor interaction directive residue` label for actionable diagnostics.
- This rule must stay separate from `Xiumi atom drag-drop residue`,
  `Xiumi editing dock residue`, `Xiumi component drag receiver residue`, and the broad
  `Xiumi tn-* attribute` fallback.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi editor interaction directive residue` for WeChat, Xiaohongshu, and Zhihu when any
  supported editor interaction directive appears.
- A reduced fixture containing only the supported directive attributes must fail with the precise
  label even when atom drag/drop classes, editing-dock classes, component drag receiver classes,
  broad Angular runtime attributes/classes, hosted media, sidebar controls, or meta panels are
  absent.
- The detector must not block ordinary interaction wording, editor wording, drag/drop prose,
  component wording, ordered-list markup, article text, or non-Xiumi class names by itself. It
  must stay anchored to Xiumi-specific directive attribute names.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the precise editor interaction directive label is also present.

### 3. Required Checks

- Use TDD to prove the reduced editor interaction directive fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports the precise
  `Xiumi editor interaction directive residue` label after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi atom drag-drop residue`, `Xiumi editing dock residue`,
  `Xiumi component drag receiver residue`, and the broad `Xiumi tn-* attribute` fallback
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, drag/drop fidelity,
  component-editing fidelity, H5 interaction behavior, Dark Mode behavior, public-host
  acceptance, or publish success.

## 236. Xiumi Image Crop Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the image crop directive
  observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback: `tn-img-crop`.
- This marker is an editor-side image crop binding directive. It is not publishable article image
  markup, reusable InkForge crop source, upload manifests, crop fidelity proof, public-host proof,
  or target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  this directive, but a cleaned-down image crop directive fragment must receive the precise
  `Xiumi image crop directive residue` label for actionable diagnostics.
- This rule must stay separate from `Xiumi worker surface crop control residue`,
  `Xiumi crop panel child control residue`, `Xiumi image enhancement crop control residue`, and
  the broad `Xiumi tn-* attribute` fallback.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi image crop directive residue` for WeChat, Xiaohongshu, and Zhihu when `tn-img-crop`
  appears as an attribute.
- A reduced fixture containing only `tn-img-crop` must fail with the precise label even when
  worker-surface crop classes, crop-panel child classes, image-enhancement controls, broad
  Angular runtime attributes/classes, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary crop wording, image wording, `<img>` markup, standard
  cropping prose, article text, or non-Xiumi class names by itself. It must stay anchored to the
  Xiumi-specific directive attribute.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the precise image crop directive label is also present.

### 3. Required Checks

- Use TDD to prove the reduced image crop directive fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports the precise
  `Xiumi image crop directive residue` label after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi worker surface crop control residue`,
  `Xiumi crop panel child control residue`, `Xiumi image enhancement crop control residue`, and
  the broad `Xiumi tn-* attribute` fallback independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, image crop fidelity,
  public-host acceptance, Dark Mode behavior, cover-thumbnail acceptance, or publish success.

## 237. Xiumi Sound/Comment Binding Metadata Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the sound/comment binding
  directives observed in a live CloakBrowser Xiumi v5 paper-editor DOM readback: `tn-sound` or
  `tn-comment`.
- These markers are editor-side audio/comment binding metadata. They are not publishable article
  audio semantics, reusable InkForge comment semantics, upload manifests, playback fidelity proof,
  comment-system proof, or target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  these directives, but a cleaned-down sound/comment binding fragment must receive the precise
  `Xiumi sound/comment binding metadata residue` label for actionable diagnostics.
- This rule must stay separate from `Xiumi audio panel residue`,
  `Xiumi audio library control residue`, `Xiumi audio room tab residue`,
  `Xiumi comment toolbar panel residue`, and the broad `Xiumi tn-* attribute` fallback.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report
  `Xiumi sound/comment binding metadata residue` for WeChat, Xiaohongshu, and Zhihu when
  `tn-sound` or `tn-comment` appears as an attribute.
- A reduced fixture containing only `tn-sound` and `tn-comment` must fail with the precise label
  even when audio panel classes, hidden audio-library controls, audio-room tabs, comment toolbar
  classes, broad Angular runtime attributes/classes, hosted media, sidebar controls, or meta
  panels are absent.
- The detector must not block ordinary sound wording, comment wording, standard `<audio>` markup,
  article text, or non-Xiumi class names by itself. It must stay anchored to the Xiumi-specific
  directive attributes.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the precise sound/comment binding label is also present.

### 3. Required Checks

- Use TDD to prove the reduced sound/comment binding fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports the precise
  `Xiumi sound/comment binding metadata residue` label after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep `Xiumi audio panel residue`,
  `Xiumi comment toolbar panel residue`, and the broad `Xiumi tn-* attribute` fallback
  independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, credentialed sync, public rendering, upload, audio playback
  fidelity, comment-system fidelity, Dark Mode behavior, public-host acceptance, or publish
  success.

## 238. Xiumi Third-Party Image Source Coverage - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains image-like elements whose
  `src`, `href`, `data-src`, or `xlink:href` points at Xiumi-hosted material domains such as
  `statics.xiumi.us` or `xiumi.us/stc`, or inline CSS `background` / `background-image` URLs that
  reference the same hosts.
- This marker is an external market-editor asset dependency. It is not a reusable InkForge image
  source, not a local asset-pipeline record, not public-host proof, not platform-host proof, and
  not evidence that WeChat/XHS/Zhihu will retain or proxy the asset.
- The detector already exists as `Xiumi third-party image source`; this section records the
  coverage contract added after finding it was the only Xiumi market-editor detector label without
  direct regression assertions.
- This rule must stay separate from Xiumi `tn-*`, Angular/Vue, editable-surface, and hosted-media
  layout diagnostics. It should report asset-source dependency, not authoring wrapper state.
- This rule must not download remote assets, mutate export artifacts, alter renderer output, mark
  any style as selectable, or claim public-host/publish proof.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi third-party image source` for WeChat,
  Xiaohongshu, and Zhihu when an image-like element or inline CSS background URL references the
  supported Xiumi material hosts.
- A reduced fixture containing only `img` / `source` nodes with Xiumi material URLs must fail with
  the precise label even when `tn-*`, `ng-*`, contenteditable, editor wrapper classes, sidebar
  controls, or meta panels are absent.
- A reduced fixture containing only a normal element with `background-image:url(...)` pointing at
  a Xiumi material host must fail with the same precise label and must not rely on
  `svg-layout-content`, `root-svg`, `rect-content`, `fade-self-animation`, `tn-*`, `ng-*`,
  contenteditable, editor wrapper classes, sidebar controls, or meta panels.
- The detector must not block ordinary local image references, ordinary public HTTPS image hosts,
  ordinary local CSS backgrounds, article text mentioning Xiumi, or non-image/link attributes by
  itself. It must stay anchored to image-like element source attributes or inline CSS background
  URLs plus the supported Xiumi material hosts.

### 3. Required Checks

- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports for the reduced hosted-image fixture and the reduced CSS background-image
  fixture.
- Adjacent editable-surface regression must remain independent so `contenteditable` is not
  misclassified as third-party image source and third-party image source is not dependent on editor
  runtime markers.
- Adjacent applied-SVG content-layer regressions must remain independent so a hosted CSS background
  URL does not require Xiumi SVG wrapper classes or SMIL markers.
- Evidence docs must state that this is static publishability protection only and does not prove
  image availability, public-host acceptance, platform-host proxying, WeChat paste, phone preview,
  upload, credentialed sync, scheduled send, or publish success.

## 239. 135 Base Residue Coverage - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 editor HTML contains base authoring markers such as
  `data-tools="135编辑器"`, a numeric `data-id` tied to a 135 market block, or image-like elements
  whose source attributes point at 135 material hosts such as `135editor.com` or
  `bcn.135editor.com`.
- These markers are market-editor provenance and external material dependencies. They are not
  reusable InkForge style source, local asset-pipeline records, public-host proof, platform-host
  proof, WeChat paste proof, or target-platform proof.
- The detector labels already existed as `135 data-tools marker`,
  `135 numeric style id on copied market block`, and `135 third-party image source`; this section
  records the coverage contract added after finding those labels lacked direct regression
  assertions.
- These rules must stay separate from `135 class/id authoring residue`, hosted-background
  diagnostics, SVG builder controls, material panel controls, and ordinary article prose.
- These rules must not download remote assets, import 135 template source, mutate export
  artifacts, alter renderer output, mark any style as selectable, or claim public-host/publish
  proof.

### 2. Contract

- `detectQuality(..., platform)` must report `135 data-tools marker`,
  `135 numeric style id on copied market block`, and `135 third-party image source` for WeChat,
  Xiaohongshu, and Zhihu when the reduced 135 base fixture contains those markers.
- A reduced fixture containing only a 135 block wrapper, `data-tools`, numeric `data-id`, and a
  135-hosted image source must fail with the precise labels even when SVG builder controls,
  material list controls, background URL diagnostics, Xiumi markers, Angular/Vue markers,
  contenteditable, sidebar controls, or meta panels are absent.
- The detector must not block ordinary prose about 135, local image references, ordinary public
  HTTPS image hosts, or numeric ids unrelated to 135 market blocks by itself.

### 3. Required Checks

- Regression tests must assert all three precise labels appear in the WeChat, Xiaohongshu, and
  Zhihu quality reports for the reduced 135 base fixture.
- Adjacent market-residue and hosted-background regressions must remain independent, so class/id
  authoring, base provenance, hosted-image, and hosted-background diagnostics remain separately
  actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  image availability, public-host acceptance, platform-host proxying, WeChat paste, phone preview,
  upload, credentialed sync, scheduled send, or publish success.

## 240. Xiumi Page Mode Binding Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the live page-mode binding
  directive `tn-bind-page-mode`.
- CloakBrowser live DOM refresh on the Xiumi v5 paper editor observed `tn-bind-page-mode` on the
  central editor surface alongside already-covered page binding metadata such as `tn-page-*` and
  editor interaction directives.
- This marker is editor-side page mode binding metadata. It is not publishable article layout
  semantics, reusable InkForge page-mode source, mobile rendering proof, public-host proof, or
  target-platform proof.
- This rule is additive and diagnostic. The broad `Xiumi tn-* attribute` fallback already blocks
  `tn-bind-page-mode`, but a cleaned-down page-mode fragment must receive the precise
  `Xiumi page binding metadata residue` label for actionable diagnostics.
- This rule must stay separate from `Xiumi editor interaction directive residue`, component
  structure binding, page authoring tree classes, and the broad `Xiumi tn-* attribute` fallback.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi page binding metadata residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-bind-page-mode` appears as an attribute.
- A reduced fixture containing only `tn-bind-page-mode` must fail with the precise page binding
  label even when `tn-page-*`, editor interaction directives, component binding metadata, broad
  Angular runtime attributes/classes, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary page wording, mode wording, layout prose, article text, or
  non-Xiumi class names by itself. It must stay anchored to the Xiumi-specific page binding
  attribute.

### 3. Required Checks

- Use TDD to prove the reduced page-mode binding fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports `Xiumi page binding metadata residue` after the
  detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent regressions must keep existing page binding metadata and editor interaction directive
  diagnostics independent.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, page-mode fidelity, mobile rendering, public-host acceptance,
  upload, credentialed sync, scheduled send, or publish success.

## 241. Xiumi Angular Input/Source/Event Attribute Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains Angular authoring attributes
  observed in the live Xiumi v5 paper editor, including `ng-keydown`, `ng-keyup`, `ng-src`,
  `ng-mousedown`, `ng-mouseup`, `ng-mouseenter`, `ng-copy`, `ng-readonly`, and
  `ng-transclude`.
- These attributes are editor-side event, source-binding, readonly, copy, hover, and transclusion
  directives. They are not publishable article semantics, reusable InkForge component source,
  platform-safe media references, input behavior proof, public-host proof, or target-platform
  proof.
- This rule extends the existing `Angular/Vue authoring attribute` diagnostic. It must stay
  separate from `Angular authoring class`, `Xiumi tn-* attribute`, `Xiumi third-party image
  source`, editable-surface markers, sidebar controls, and meta panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Angular/Vue authoring attribute` for WeChat,
  Xiaohongshu, and Zhihu when the above `ng-*` attributes appear on real HTML elements.
- A reduced fixture containing only input/source/mouse/copy/transclusion Angular attributes must
  fail with the precise Angular/Vue label even when Angular runtime classes, `tn-*`, `opera-tn-*`,
  contenteditable, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary prose that mentions Angular, keydown, copy, source, hover,
  transclusion, or Xiumi by itself. It must remain anchored to tag attributes with an assignment.

### 3. Required Checks

- Use TDD to prove the reduced input/source/event fixture initially emits no
  `*-market-editor-residue` issue, then emits `Angular/Vue authoring attribute` after the detector
  update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports while `Angular authoring class` stays absent for the reduced class-cleaned
  fixture.
- Adjacent Angular runtime class tests must remain green so class-based and attribute-based
  diagnostics stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, input behavior fidelity, mobile rendering, public-host acceptance,
  upload, credentialed sync, scheduled send, or publish success.

## 244. Xiumi Angular Link/Dropzone Attribute Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains Angular authoring attributes
  observed in the live Xiumi v5 paper editor, including `ng-href`, `ng-dropzone`,
  `ng-dropzone-handler`, and `ng-dropzone-options`.
- These attributes are editor-side link binding and drag/drop upload binding directives. They are
  not ordinary publishable `href` attributes, reusable InkForge upload source, asset upload proof,
  public-host proof, credentialed-channel proof, or target-platform proof.
- This rule extends the existing `Angular/Vue authoring attribute` diagnostic. It must stay
  separate from ordinary `href`, Xiumi `tn-link`, `Xiumi atom drag-drop residue`,
  `Xiumi editor interaction directive residue`, `Angular authoring class`, hosted-media checks,
  sidebar controls, and meta panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Angular/Vue authoring attribute` for WeChat,
  Xiaohongshu, and Zhihu when the above `ng-*` link/dropzone attributes appear on real HTML
  elements.
- A reduced fixture containing only `ng-href` and `ng-dropzone*` attributes must fail with the
  precise Angular/Vue label even when Angular runtime classes, `tn-*`, `opera-tn-*`,
  contenteditable, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary prose that mentions Angular, href, links, dropzone,
  upload, handler, options, or Xiumi by itself. It must remain anchored to tag attributes with an
  assignment.
- The detector must not treat ordinary `href` as residue unless it is the Angular `ng-href`
  binding attribute.

### 3. Required Checks

- Use TDD to prove the reduced link/dropzone fixture initially emits no
  `*-market-editor-residue` issue, then emits `Angular/Vue authoring attribute` after the detector
  update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports while `Angular authoring class` stays absent for the reduced class-cleaned
  fixture.
- Adjacent Angular input/source/event tests must remain green so link/dropzone and event/source
  diagnostics stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, link fidelity, drag/drop fidelity, upload, public-host acceptance,
  credentialed sync, scheduled send, or publish success.

## 245. Xiumi Text Input Done-For Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the text-input completion
  directive attribute `tn-text-input-done-for`.
- CloakBrowser live DOM refresh on the active Xiumi v5 paper editor observed
  `tn-text-input-done-for` on text/description input surfaces alongside already-covered
  `tn-text-input-begin` and `tn-text-input-done` controls.
- This marker is editor-side text editing event binding metadata. It is not article text,
  publishable input behavior, reusable InkForge typography source, platform paste proof, or
  target-platform proof.
- This rule extends the existing `Xiumi font and format control residue` diagnostic. It must stay
  separate from `Xiumi text toolbar control residue`, `Xiumi tn-* attribute`,
  editable-surface markers, Angular/Vue attributes, hosted-media checks, sidebar controls, and
  meta panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi font and format control residue` for WeChat,
  Xiaohongshu, and Zhihu when `tn-text-input-done-for` appears as an attribute.
- A reduced fixture containing only `tn-text-input-done-for` must fail with the font/format label
  even when font-family classes, font-size classes, `tn-text-input-begin`, `tn-text-input-done`,
  text toolbar controls, Angular runtime attributes/classes, hosted media, sidebar controls, or
  meta panels are absent.
- The broad `Xiumi tn-* attribute` fallback may still be reported on the same reduced fixture; the
  acceptance requirement is that the actionable font/format label is also present.
- The detector must not block ordinary prose that mentions done, blur, text input, completion,
  typography, or Xiumi by itself. It must remain anchored to the Xiumi-specific directive
  attribute.

### 3. Required Checks

- Use TDD to prove the reduced `tn-text-input-done-for` fixture first reports only the broad
  `Xiumi tn-* attribute` label, then reports `Xiumi font and format control residue` after the
  detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent font/format and `tn-text-input-begin` regressions must remain green so text-input
  directive diagnostics stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, text editing fidelity, typography fidelity, upload, public-host
  acceptance, credentialed sync, scheduled send, or publish success.

## 246. Xiumi Angular/UI Bootstrap Button State Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains Angular/UI Bootstrap button-state
  attributes observed in the live Xiumi v5 paper editor, including `ng-checked`, `uib-btn-radio`,
  and `uib-btn-checkbox`.
- These attributes are editor-side selection/toggle binding directives. They are not article
  semantics, reusable InkForge form state source, WeChat form-control fidelity proof,
  credentialed-channel proof, or target-platform proof.
- This rule extends the existing `Angular/Vue authoring attribute` and
  `Xiumi UI Bootstrap control directive residue` diagnostics. It must stay separate from ordinary
  checkbox/radio HTML, Xiumi dropdown directives, Angular runtime classes, `Xiumi tn-* attribute`,
  hosted-media checks, sidebar controls, and meta panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Angular/Vue authoring attribute` for WeChat,
  Xiaohongshu, and Zhihu when `ng-checked` appears as an attribute.
- `detectQuality(..., platform)` must report `Xiumi UI Bootstrap control directive residue` for
  WeChat, Xiaohongshu, and Zhihu when `uib-btn-radio` or `uib-btn-checkbox` appears as an
  attribute.
- Reduced fixtures containing only those attributes must fail with their precise existing labels
  even when Angular runtime classes, `tn-*`, dropdown wrappers, operation buttons, hosted media,
  sidebar controls, or meta panels are absent.
- The detector must not block ordinary checkbox/radio prose, checked wording, button wording,
  option prose, or Xiumi by itself. It must remain anchored to real directive attributes with an
  assignment or boolean attribute marker.

### 3. Required Checks

- Use TDD to prove the reduced button-state fixtures initially emit no
  `*-market-editor-residue` issue, then emit the expected Angular/Vue and UI Bootstrap labels after
  the detector update.
- Regression tests must assert the precise labels appear in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent UI Bootstrap dropdown and Angular link/dropzone regressions must remain green so button
  state, dropdown, and link/dropzone diagnostics stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, form-control fidelity, upload, public-host acceptance, credentialed
  sync, scheduled send, or publish success.

## 247. Xiumi UI Bootstrap Tab Content Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the Angular UI Bootstrap
  tab-body transclusion directive `uib-tab-content-transclude`.
- CloakBrowser live DOM refresh on the active Xiumi v5 paper editor observed
  `uib-tab-content-transclude` alongside already-covered `uib-tab-heading-transclude`,
  `uib-dropdown*`, `uib-tooltip`, and `tooltip-*` controls.
- This marker is editor-side tab panel plumbing. It is not publishable article tab semantics,
  reusable InkForge component source, mobile interaction proof, credentialed-channel proof, or
  target-platform proof.
- This rule extends the existing `Xiumi UI Bootstrap control directive residue` diagnostic. It
  must stay separate from Xiumi dropdown directives, Angular runtime classes,
  `Xiumi tn-* attribute`, hosted-media checks, sidebar controls, and meta panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi UI Bootstrap control directive residue` for
  WeChat, Xiaohongshu, and Zhihu when `uib-tab-content-transclude` appears as an attribute.
- A reduced fixture containing only `uib-tab-content-transclude` must fail with the UI Bootstrap
  label even when dropdown wrappers, heading transclusion, Angular runtime classes, `tn-*`,
  operation buttons, hosted media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary tab prose, content prose, heading prose, transclusion
  wording, or Xiumi by itself. It must remain anchored to the explicit UI Bootstrap directive
  attribute.

### 3. Required Checks

- Use TDD to prove the reduced `uib-tab-content-transclude` fixture initially emits no
  `*-market-editor-residue` issue, then emits `Xiumi UI Bootstrap control directive residue` after
  the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent UI Bootstrap dropdown, heading-transclude, and button-state regressions must remain
  green so tab-content, dropdown, and button-state diagnostics stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, tab interaction fidelity, upload, public-host acceptance,
  credentialed sync, scheduled send, or publish success.

## 248. 135 SVG Trial Coverage Audit - 2026-06-29

### 1. Scope / Trigger

- Trigger: a live CloakBrowser pass on the 135 SVG editor selects a center-canvas `试用` effect and
  reads the selected block plus the right-side effect settings panel.
- Observed center markers included `data-name="multiselectpopup"`, `app-content-canvas`,
  `content-wrapper`, `content-background`, `content-inner`, `block active`, `block-inner`,
  `block-img`, `block-img__inner`, `edit-placeholder block-img__default`,
  `placeholder__help`, and `placeholder__icon`.
- Observed right-panel controls included `editor-bar-title`, `editor-bar-btn`,
  `bar-template-name`, `editor-course__detail`, `course__intro`, `editor-img__block`,
  `edit-image`, `image__title-bar`, `image__upload`, `image_help`, `edit-add-images`,
  `edit-add-btn`, `edit-add__title`, `edit-animate__opt`, `animate__dur`, `input-number`,
  `opt__value`, and counter controls.
- This is coverage-alignment evidence for local static publishability diagnostics. It is not a
  template source license, not reusable InkForge schema, not platform paste proof, not phone
  preview proof, not mobile interaction proof, and not publish proof.

### 2. Contract

- Existing 135 SVG builder `data-name` rules must continue to cover live trial values such as
  `multiselectpopup`.
- Existing 135 SVG builder canvas and shell diagnostics must continue to cover
  `app-content-canvas`, `content-*`, `block-*`, `edit-placeholder`, and `placeholder__*` markers.
- Existing 135 material-panel diagnostics must continue to cover the right-panel
  `editor-bar`, `editor-course`, `editor-img`, `edit-image`, `edit-add`, and `edit-animate`
  control families.
- Vue scoped `data-v-*` attributes must not become a standalone publishability blocker by
  themselves. They are too broad unless paired with a source-specific 135 anchor such as known
  `data-name`, center canvas shell, material panel, image-slot, trigger, or animation controls.
- This audit must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 3. Required Checks

- When future 135 live passes reveal a source-specific marker not covered by existing labels, add a
  reduced regression before changing detector rules.
- If the only new marker is `data-v-*`, document it as generic Vue implementation detail and do
  not add a broad standalone blocker.
- Evidence docs must state that this is coverage alignment only and does not prove WeChat paste,
  phone preview, SVG interaction fidelity, upload, public-host acceptance, credentialed sync,
  scheduled send, or publish success.

## 249. 135 Ordinary Editor Helper Iframe Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 ordinary editor page HTML contains helper iframe chrome
  such as `ai_polish_box_iframe`, `js_shared_iframe`, `svg_editor_iframe`, `ueditor_0`, or a 135
  style-center iframe `_src` value.
- CloakBrowser live DOM refresh on the active 135 ordinary editor observed those iframe markers
  around the central editor and side surfaces after the full-page navigation refresh.
- These iframes are editor helpers, route bridges, AI panels, SVG editor mounts, or style-center
  browser frames. They are not article semantics, reusable InkForge modules, target-platform paste
  proof, phone preview proof, mobile interaction proof, credentialed sync proof, or publish proof.
- This rule must stay separate from the generic unsupported `<iframe>` warning, 135 full-page
  navigation chrome, 135 UEditor toolbar chrome, action rail chrome, style-panel controls, hosted
  image sources, and SVG-builder markers.
- This rule must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 editor helper iframe residue` for WeChat,
  Xiaohongshu, and Zhihu when a reduced fixture contains the observed 135 helper iframe ids or
  `_src="/style-center?...` marker.
- The reduced fixture must fail with the helper-iframe label even when `_135editor`, `data-tools`,
  `style_id/style_name/style_price`, full-page navigation chrome, style-panel controls,
  style-card operation buttons, UEditor toolbar chrome, action rail chrome, hosted image sources,
  and SVG-builder markers are absent.
- The detector must not label every generic `<iframe>` as 135 residue. It must remain anchored to
  observed 135 helper iframe ids or a 135 style-center iframe source marker.

### 3. Required Checks

- Use TDD to prove the reduced helper-iframe fixture initially emits no
  `*-market-editor-residue` issue, then emits `135 editor helper iframe residue` after the
  detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent 135 style-panel, full-page navigation, UEditor, and action-rail regressions must remain
  green so each diagnostic stays independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, iframe fidelity, upload, public-host acceptance, credentialed sync,
  scheduled send, or publish success.

## 250. 135 Ordinary Editor Announcement Link Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned 135 ordinary editor page HTML contains announcement-strip
  link chrome such as `class="announcement unread"` or an `/announcements/view/<id>` link.
- CloakBrowser live DOM refresh on the active 135 ordinary editor observed those links inside the
  announcement area after the full-page navigation and helper-iframe refreshes.
- These links are editor/site notice chrome. They are not article semantics, reusable InkForge
  modules, target-platform paste proof, phone preview proof, credentialed sync proof, or publish
  proof.
- This rule must stay separate from 135 full-page navigation chrome, helper iframe chrome,
  UEditor toolbar chrome, action rail chrome, style-panel controls, hosted image sources, and
  SVG-builder markers.
- This rule must not alter renderer output, style availability, selectable actions,
  release-gate success accounting, clipboard behavior, account state, upload, sync, schedule, or
  publish behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `135 announcement link chrome residue` for WeChat,
  Xiaohongshu, and Zhihu when a reduced fixture contains the observed 135 announcement-link class
  combination or `/announcements/view/<id>` href.
- The reduced fixture must fail with the announcement-link label even when `_135editor`,
  `data-tools`, `style_id/style_name/style_price`, full-page navigation chrome, helper iframe
  chrome, style-panel controls, style-card operation buttons, UEditor toolbar chrome, action rail
  chrome, hosted image sources, and SVG-builder markers are absent.
- The detector must not block ordinary prose about announcements. It must remain anchored to a real
  anchor tag with the observed 135 announcement class pair or the 135 announcement URL shape.

### 3. Required Checks

- Use TDD to prove the reduced announcement-link fixture initially emits no
  `*-market-editor-residue` issue, then emits `135 announcement link chrome residue` after the
  detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent 135 style-panel, full-page navigation, helper-iframe, UEditor, and action-rail
  regressions must remain green so each diagnostic stays independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, link fidelity, upload, public-host acceptance, credentialed sync,
  scheduled send, or publish success.

## 251. Xiumi UI Bootstrap Modal Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains the Angular UI Bootstrap
  modal-animation directive `uib-modal-animation-class`.
- CloakBrowser live DOM refresh on the active Xiumi v5 paper editor observed
  `uib-modal-animation-class` alongside already-covered UI Bootstrap dropdown, tooltip, tab, and
  button-state directives.
- This marker is editor-side modal animation plumbing. It is not publishable article modal
  semantics, reusable InkForge component source, paste proof, mobile interaction proof,
  credentialed-channel proof, or target-platform proof.
- This rule extends the existing `Xiumi UI Bootstrap control directive residue` diagnostic. It
  must stay separate from Xiumi dropdown directives, Angular/Vue authoring attributes,
  `Xiumi tn-* attribute`, hosted-media checks, operation panels, sidebar controls, and meta
  panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi UI Bootstrap control directive residue` for
  WeChat, Xiaohongshu, and Zhihu when `uib-modal-animation-class` appears as an attribute.
- A reduced fixture containing only `uib-modal-animation-class` must fail with the UI Bootstrap
  label even when dropdown wrappers, tooltip attributes, tab transclusion, button-state controls,
  Angular/Vue authoring attributes, `tn-*`, operation buttons, hosted media, sidebar controls, or
  meta panels are absent.
- The detector must not block ordinary modal prose, animation prose, class prose, or Xiumi by
  itself. It must remain anchored to an explicit UI Bootstrap `uib-modal*` directive attribute.

### 3. Required Checks

- Use TDD to prove the reduced `uib-modal-animation-class` fixture initially emits no
  `*-market-editor-residue` issue, then emits `Xiumi UI Bootstrap control directive residue` after
  the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent UI Bootstrap dropdown, tab-content, and button-state regressions must remain green so
  modal, tab-content, dropdown, and button-state diagnostics stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, modal interaction fidelity, upload, public-host acceptance,
  credentialed sync, scheduled send, or publish success.

## 253. Xiumi UI Router View Directive Residue - 2026-07-03

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains Angular UI Router route outlet
  attributes such as `ui-view`.
- CloakBrowser live DOM refresh on the active Xiumi v5 paper editor observed `ui-view` on page
  shell regions including the root route outlet, header, and action-button containers.
- These markers are editor-side route placeholders. They are not publishable article structure,
  reusable InkForge layout source, paste proof, platform preview proof, credentialed-channel proof,
  or target-platform proof.
- This rule extends the existing `Angular/Vue authoring attribute` diagnostic. It must stay
  separate from Angular runtime classes, `ng-*` authoring attributes, Xiumi UI Bootstrap modal
  directives, `Xiumi tn-* attribute`, hosted-media checks, operation panels, sidebar controls, and
  meta panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Angular/Vue authoring attribute` for WeChat,
  Xiaohongshu, and Zhihu when `ui-view` appears as an attribute.
- A reduced fixture containing only `ui-view` must fail with the Angular/Vue label even when
  `ng-*`, Angular runtime classes, `uib-*`, modal runtime directives, dropdown wrappers,
  tooltip attributes, `tn-*`, operation buttons, hosted media, sidebar controls, or meta panels
  are absent.
- The detector must not block ordinary prose about routing, views, headers, actions, or Xiumi by
  itself. It must remain anchored to the explicit `ui-view` directive attribute.

### 3. Required Checks

- Use TDD to prove the reduced `ui-view` fixture initially emits no `*-market-editor-residue`
  issue, then emits `Angular/Vue authoring attribute` after the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent Angular runtime, Angular input/event, and Angular link/dropzone regressions must remain
  green so UI Router, normal Angular authoring attributes, and Angular runtime classes stay
  independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, route rendering fidelity, upload, public-host acceptance,
  credentialed sync, scheduled send, or publish success.

## 252. Xiumi Modal Runtime Directive Residue - 2026-06-29

### 1. Scope / Trigger

- Trigger: copied or partially cleaned Xiumi editor HTML contains Angular UI Bootstrap modal
  runtime directives such as `modal-render`, `modal-in-class`, or `modal-animation`.
- CloakBrowser live DOM refresh on the active Xiumi v5 paper editor observed these attributes on
  the modal window and backdrop alongside `uib-modal-animation-class`, `uib-modal-window`,
  `uib-modal-backdrop`, and `uib-modal-transclude`.
- These markers are editor-side modal runtime plumbing. They are not publishable article
  attributes, reusable InkForge component source, modal fidelity proof, paste proof,
  credentialed-channel proof, or target-platform proof.
- This rule extends the existing `Xiumi UI Bootstrap control directive residue` diagnostic. It
  must stay separate from Xiumi dropdown directives, Angular/Vue authoring attributes,
  `Xiumi tn-* attribute`, hosted-media checks, operation panels, sidebar controls, and meta
  panels.
- This rule must not alter renderer output, style availability, selectable actions, release-gate
  success accounting, clipboard behavior, account state, upload, sync, schedule, or publish
  behavior.

### 2. Contract

- `detectQuality(..., platform)` must report `Xiumi UI Bootstrap control directive residue` for
  WeChat, Xiaohongshu, and Zhihu when `modal-render`, `modal-in-class`, or `modal-animation`
  appears as an attribute.
- A reduced fixture containing only those three modal runtime attributes must fail with the UI
  Bootstrap label even when `uib-*`, dropdown wrappers, tooltip attributes, tab transclusion,
  button-state controls, Angular/Vue authoring attributes, `tn-*`, operation buttons, hosted
  media, sidebar controls, or meta panels are absent.
- The detector must not block ordinary modal prose, render prose, animation prose, class prose, or
  Xiumi by itself. It must remain anchored to explicit modal runtime directive attributes.

### 3. Required Checks

- Use TDD to prove the reduced modal runtime fixture initially emits no
  `*-market-editor-residue` issue, then emits `Xiumi UI Bootstrap control directive residue` after
  the detector update.
- Regression tests must assert the precise label appears in the WeChat, Xiaohongshu, and Zhihu
  quality reports.
- Adjacent UI Bootstrap dropdown, tab-content, button-state, and `uib-modal*` regressions must
  remain green so modal runtime and UIB modal diagnostics stay independently actionable.
- Evidence docs must state that this is static publishability protection only and does not prove
  WeChat paste, phone preview, modal interaction fidelity, upload, public-host acceptance,
  credentialed sync, scheduled send, or publish success.
