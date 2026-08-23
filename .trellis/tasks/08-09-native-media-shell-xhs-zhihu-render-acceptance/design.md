# Technical Design — 原生媒体、Tauri 交互与三平台编辑器验收

## 1. Design summary

本任务不是新增功能大框架，而是把三条已有链路闭合：

1. writing-components / delivery-adornments 已表达真实歌曲、名片、文章、图片和媒体，但原生微信
   组件仍缺平台编辑器插入与证据闭环；
2. Workstation 已有 docked、in-app float、allowlisted Tauri window、layout persistence、焦点和
   transition helper，但剩余生命周期与 reduced-motion 没有一份最终 release 验收；
3. XHS/Zhihu 已有独立 converter、manifest 和 quality rules，但尚未用最终 release 的精确产物在
   当前真实编辑器完成不发布的读回。

最小正确方案是复用这些生产路径，补 disposition/handoff、共享交互根因和证据，不增加第二套
renderer、窗口框架或平台发布自动化。

## 2. Canonical data flow

```text
Article revision + title/category + preset/typography
Canonical JSX components + Settings delivery snapshot + real assets
        │
        └─ existing immutable NativeExportOptions boundary
              └─ convertToNativeFormat(platform)
                    ├─ WeChat safe HTML/SVG + official media/draft service
                    ├─ XHS plain text + caller-supplied raster manifest validation
                    └─ Zhihu clean Markdown + caller-supplied image manifest validation
                              │
                              ├─ release Export writes real raster/image bytes + manifest
                              └─ exact-artifact external editor handoff
                                      └─ redacted StyleProofManifest/readback
```

`convertToNativeFormat()` 当前只校验 caller 提供的 XHS/Zhihu manifest，不会生成文件。实施必须把
现有 XHS slicer/raster 与 image-pipeline manifest writer 接入当前 release Export 路径；
`StyleProofManifest`/acceptance audit 仍只记录证据，不生成产物、不修改可选状态、不把本地状态
升级为平台成功。任何测试工具都必须消费生产 Export 的真实文件和 converter 结果。

## 3. WeChat media design

### 3.1 Capability matrix

| Capability | Production source | Delivery | Completion proof |
| --- | --- | --- | --- |
| Body image | existing asset pipeline + WeChat upload image service | final HTML uses returned URL | upload response, final HTML URL readback, no local/blob/data URL |
| Cover | permanent material + existing `thumb_media_id` preflight | draft field | material preflight plus persisted draft get readback |
| Draft | single backend-only round-trip command; get/list/delete stay internal | official draft API | add → get → delete/reconcile → marker absence readback; no publish claim |
| Song | `SongBlock` / delivery song real title, artist, URL/cover | static link card plus native-editor handoff | real platform-native insertion/readback or `manual-native-insert` |
| Official profile | `MpProfile` / delivery contact card real identity | static follow card plus native-editor handoff | real platform-native insertion/readback or `manual-native-insert` |
| Article/media | `ArticleBlock` / `WechatMedia` real metadata | safe semantic fallback plus native-editor handoff | real editor insertion/readback or blocked |

The official image/cover/draft rows remain automated through existing services. The native component
rows never become “automated” merely because a private tag survives local sanitization.

### 3.2 No new native-media store

- Existing component definitions and delivery records remain the only persisted source.
- Handoff derives from the validated component: component type, stable source/delivery ID, document
  anchor, expected visible title/nickname, required real fields, fallback disposition, and action state.
- Registry `componentId` identifies the type, not an occurrence. Each final artifact derives an
  ephemeral occurrence key from `artifactHash + AST ordinal + componentType + propsHash`; it is never
  persisted. Duplicate/ambiguous anchors fail closed instead of guessing the insertion location.
- Reuse the current style-proof/external-handoff report shape where it already represents these
  fields. Add only the smallest typed field or requirement when current evidence cannot distinguish
  static fallback from completed native insertion.
- Do not persist browser selectors, private platform DOM, cookies, account IDs, or editor-generated
  hidden attributes.

### 3.3 Native insertion order and identity

1. Render the exact release WeChat artifact and identify existing stable body/masthead/end anchors.
2. For each eligible native item, show one actionable row in the existing delivery/publish-preparation
   surface; disabled/blocked state explains the missing real field or permission.
3. In the logged-in WeChat editor, target the intended article body, insert the actual platform
   component at the corresponding anchor, then read back visible identity and order.
4. Record the redacted result against the exact occurrence key, artifact hash, release hash, editor
   target/surface verification, and cleanup result.
5. If a platform component is unavailable or its identity cannot be read back, leave the row
   `manual-native-insert` or `blocked`; do not substitute a lookalike and mark it complete.

Explicit body components remain where the author inserted them. Automatic masthead song and end
profile continue through the existing slot resolver and do not move body components or duplicate a
delivery ID.

### 3.4 Official service safety

- Credentials stay in existing Tauri/local secret handling and are never passed through Vue props,
  route query, local evidence, or browser automation.
- Trust-boundary inputs remain schema-validated; URLs and media IDs are normalized/validated before
  command invocation.
- Existing WeChat error codes remain visible and actionable. A failed upload, missing cover, or draft
  rejection cannot be converted to a success toast.
- Current official field parity is an executable preflight: `digest` accepts at most 120 characters;
  120 succeeds locally and 121 fails before transport. Frontend, Rust, tests, and owning backend spec
  must agree before a live call.
- Live draft proof is one backend-only round-trip operation; Vue never receives generic get/list/
  delete commands or a raw `media_id`. Before add the backend persists an intent with a non-sensitive
  unique operation marker and embeds that marker into a dedicated repository calibration draft.
  After add it atomically updates a private Tauri app-data `cleanup_pending` journal, performs
  get/delete/absence in `finally`, and removes the journal only after confirmed cleanup.
- Startup/retry uses backend-only draft batch listing to match marker + payload hash. It deletes only
  one exact match. Zero/multiple candidates, missing permission, or an unknown outcome remains blocked
  and exposes a manual-cleanup checklist; success still requires marker absence readback. The journal
  is excluded from IndexedDB, ActivityLog, logs, exports, and repository evidence.
- Reconciliation requests `count=20`, `no_content=0`, and advances `offset` until the returned
  `total_count` is exhausted; stalled/inconsistent pagination is blocked. The canonical recovery hash
  uses only stable readable fields after request/readback normalization: article type, title, author,
  explicit digest, marker, and visible-text sentinel. It excludes media IDs, temporary URL, update
  time, HTML attribute order, and server-added fields.
- Any official upload test uses a real user-owned asset selected in the product; no placeholder image,
  guessed `media_id`, or sample account is introduced.

## 4. Native shell design

### 4.1 Existing state remains authoritative

- `WorkstationView` keeps manager/stage/inspector state and the current panel geometry.
- Existing layout persistence remains the durable source with current fallback/migration behavior.
- Existing desktop service and Rust allowlist remain the only native-window boundary.
- Existing inspector data/component stays shared across docked, in-app floating, and native utility
  presentations. No second widget store or arbitrary HTML window is added.

### 4.2 Lifecycle contract

For every supported surface, acceptance follows the same observable sequence:

```text
trigger focus
  → request open/reveal/detach
  → transition/layout completion
  → destination focus + pointer hit target
  → user interaction and state mutation
  → close/redock/collapse
  → transition/layout completion
  → source content/geometry restored
  → focus or editor selection restored
  → restart readback where persistence applies
```

Tests assert observable state and geometry, not internal timer duration. A native window handshake
must complete before its content is considered ready. Closing a utility window reconciles the main
window state exactly once.

### 4.3 Motion strategy

- Effective reduced motion is `settings.appearance.reducedMotion || OS prefers-reduced-motion`.
  App class/data attributes, CSS media behavior, and JavaScript transition waits consume that same
  effective decision; neither authority silently overrides the other.
- Waits read actual transition state/computed duration or complete immediately when duration is zero.
  Tests cover app-only, OS-only, both-off, and effective-reduce/zero-duration combinations.
- A shared helper is added only if at least two existing lifecycle paths need the identical wait;
  otherwise extend the local existing helper. No animation dependency is introduced.
- Reduced motion removes nonessential movement/scale/breathing/smooth scrolling, but never removes
  visible state change, focus ring, error, or hit target.

### 4.4 Keyboard and focus strategy

- Native buttons retain accessible names, `aria-pressed`/disabled semantics, and installed Lucide
  icons.
- Tab order follows visual order; floating/native content traps focus only when modal semantics truly
  apply. Nonmodal inspector windows do not trap the user.
- Escape closes the topmost closable surface. Close/redock restores the trigger; editor-originated
  actions restore the exact ProseMirror selection where current APIs support it.
- Existing EditorKeymap owns list/code/paragraph structural keys. Shell shortcuts must not add a
  competing document-level listener.
- WDIO uses native pointer/keyboard actions and current window handles; source-contract tests may
  supplement but never replace release behavior.

## 5. XHS editor acceptance design

### 5.1 Exact artifacts

- Canonical text: `markdownToXiaohongshuText()` result through `convertToNativeFormat()`.
- Visual artifacts: current 3:4/1:1 image-page or long-image generator and
  `validateXhsImageArtifactManifest()`.
- Fixture: one real local InkForge article containing headings, paragraphs, emphasis, lists, quote,
  code, table/formula/image/component cases without invented external facts.
- Artifact-readiness gate: the visible release Export action must invoke the existing slicer/raster
  and manifest constructors and write actual bytes. Passing a test-built manifest into
  `convertToNativeFormat()` is insufficient and leaves the editor gate blocked.

### 5.2 Editor procedure

1. Build the final release and record its SHA-256.
2. Export exact text and a selected full raster pack; validate manifest and fingerprint all files.
3. In the authenticated XHS creator editor, paste via the visible text input and upload files through
   the platform's real upload control.
4. Read back the intended editor/title/body/media surfaces and visually inspect page order, cropping,
   body order, and leaked syntax.
5. Stop before publish, clear/discard the disposable content, and record only redacted structure and
   fingerprints.

No script writes ProseMirror/TipTap state directly. If the account UI exposes a different current
limit, record it as current editor evidence and keep the product limit configurable.

## 6. Zhihu editor acceptance design

### 6.1 Exact artifacts

- Canonical text: `markdownToZhihuClean()` result through `convertToNativeFormat()`.
- Image fallback: current `ZhihuImageArtifactManifest`, real local artifact bytes, then actual public
  HTTPS or platform upload response before a final-host claim.
- Fixture covers headings, paragraphs, emphasis, nested lists, quote, fenced code with language,
  table, inline/block formula, diagram/table fallback, links, images, alt, and caption.
- Artifact-readiness gate: the visible release Export action must write fallback image bytes and the
  corresponding manifest through the existing image pipeline. A caller-built manifest without files
  is not a product capability.

### 6.2 Editor procedure

1. Use the actual visible Zhihu paste/import/upload entry; record which ingress was used.
2. Do not inject Draft.js state. Import/paste the exact clean Markdown and upload exact fallback
   images through the real control.
3. Read back editor blocks and visible content. A heading passes only when the platform editor has a
   heading block or equivalent visible semantics; raw `##` text is not a successful heading render.
4. Formula/table/diagram rows pass only with native rendering or a real uploaded fallback retaining
   alt/caption/text semantics.
5. Stop before publish and clear/discard disposable content.

If the current editor lacks a Markdown import for a syntax, InkForge reports the row as manual or
blocked rather than switching to hidden preview HTML.

## 7. Evidence model

Reuse the existing proof manifest and acceptance-audit fields, including target editor, target
surface, DOM readback, exact artifact, authenticated session, safe cleanup, collected time, and
commit safety. The task-level progress state machine and independent publication flag are defined
below; no UI may collapse them into a single success/failed badge.

Evidence files contain hashes, counts, safe labels, geometry/readback assertions, and sanitized
screenshots only when account chrome and private content are excluded. Browser/session/profile paths
are never written.

### 7.1 State machine and aggregation

| State | Required-gate meaning | May close matching AC? |
| --- | --- | --- |
| `not-run` | no current exact-artifact attempt exists | no |
| `local` | converter/validator/release checks passed only | only a local-only AC |
| `platform-editor-rendered` | exact artifact/component passed authenticated target-surface readback | yes, for the matching editor gate |
| `manual-native-insert` | handoff is ready but native insertion is still an editor action | no |
| `blocked` | real data, permission, host, upload, or target capability is missing | no |
| `invalidated` | evidence hash no longer matches current product/release/artifact | no |

`published` is not a progress state. It is an independent boolean and remains `false` for every row.
An acceptance criterion closes only when every row it declares required is in its exact success state;
accurate boundary text never upgrades a failed, blocked, unrun, manual, or invalidated row.

### 7.2 Generated coverage matrices

Two runtime-derived matrices prevent partial examples from masquerading as complete coverage:

1. **Component matrix:** enumerate the current writing-component registry and join each ID to its
   disposition, fallback artifact, native handoff, validation result, local proof, external proof,
   artifact hash, and final state. Unknown, duplicate, omitted, or unexecuted rows fail.
2. **Shell matrix:** first read one capability table, then enumerate only supported combinations:
   Manager/Stage = collapse/expand; Inspector panel = pin/hover/collapse; Inspector widget =
   dock/float/native/close/redock. Every row records expected/actual state, geometry, focus,
   persistence, default motion, reduced motion, restart relevance, and release readback. Unsupported
   combinations are explicit; no product capability is invented to complete a Cartesian product.

## 8. Failure and rollback behavior

1. Media/schema additions, if required, are optional and backward-compatible; old JSX and Settings
   snapshots continue to parse unchanged.
   The private backend cleanup journal is a bounded operational safety record, not article/Settings
   state or a front-end database schema; it stores only unfinished round-trip handles and is deleted
   after confirmed cleanup.
2. Native insertion failure leaves static fallback/manual status intact; it does not modify canonical
   article content or delete the component.
3. Shell fixes are sliced by manager/stage/inspector/window/focus path and never migrate user content.
4. XHS/Zhihu external failure does not alter converter output to match a one-off account. Record the
   current platform observation, then change product rules only when the shared contract is wrong.
5. Static editor evidence uses two linked receipts: `releaseArtifactReceipt` proves current final
   EXE/producer → exact artifact; `platformReadbackReceipt` proves exact bytes plus ingress/target →
   external readback. EXE changes rerun the first receipt and all shell runtime rows. Byte-identical
   outputs may reconnect the unchanged platform receipt; changed bytes/ingress/target invalidate it.
   WeChat side-effecting API proof instead uses `wechatApiLiveReceipt`, bound to current EXE,
   backend/service, schema, cleanup protocol, redacted account capability, and live result; any such
   change reruns the round trip. Docs-only edits invalidate neither.

## 9. Expected code surface

This is a candidate list, not permission for broad edits. GitNexus impact and failing tests decide the
actual minimum set:

- WeChat/media: existing export types/index, writing-components, delivery-adornments,
  `wechat-publish.ts`, `DeliveryAdornmentPanel.vue`, Publish/Workstation handoff, and current Tauri
  WeChat commands.
- Native shell: `WorkstationView.vue`, existing desktop/inspector-widget services, Rust allowlisted
  window commands, layout persistence, and focused WDIO/Vitest tests.
- XHS/Zhihu: current `ExportModal.vue`, converters, XHS card slicer/raster helpers, image-pipeline
  artifact manifest/file writer, quality validators, external proof reports, and docs. The missing
  release Export wiring is an implementation prerequisite, not an optional post-test enhancement.

No new dependency, renderer, platform publisher, arbitrary browser automation layer, or broad
Workstation refactor is planned.
