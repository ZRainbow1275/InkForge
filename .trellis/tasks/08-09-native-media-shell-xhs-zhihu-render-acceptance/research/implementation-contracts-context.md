# Compact Implementation Contracts — 2026-08-09

The authoritative specs are large. This file injects only clauses that change this task's design,
implementation, or acceptance; implementers still open the owning source section before editing.

## Canonical state and renderer

Sources:

- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/visual-variant-system.md`

Contracts:

1. Pinia owns shared UI state; services and Zod own business validation. Components do not duplicate
   validation or persist a second platform/component state.
2. Canonical article/Settings/preset/typography/component data produces `NativeExportOptions` and
   flows through `convertToNativeFormat()`. Preview HTML is not a second delivery artifact.
3. Explicit body components remain canonical JSX/TipTap atoms. Automatic song/profile/source/CC data
   remains the existing delivery Settings snapshot.
4. Existing preset IDs, component IDs, articles, assets, settings, history, migrations, and shortcuts
   remain backward-compatible. No renderer, theme DSL, store, or window manager is added.
5. Empty or incomplete real data remains empty/incomplete/blocked. Sample documents, sample accounts,
   guessed IDs, placeholder images, and fallback success claims are forbidden.

## Real UI and packaged software evidence

Source: `.trellis/spec/frontend/quality-guidelines.md`.

Contracts:

1. Unit/source tests do not replace layout-sensitive visual and pointer/keyboard proof.
2. Final InkForge acceptance uses the packaged release Tauri/WebView2 executable, not a Vite/browser
   tab. Browser use is reserved for the authenticated external platform editors.
3. Native-window, persistence, focus, keyboard, motion, and restart claims need current release
   behavior with real local state. A DOM node or script `.click()` alone is not proof.
4. Heavy tests/build/E2E run serially on this machine. Failures are investigated as product failures
   before test-harness explanations.
5. Exact task diff, generated-file cleanup, GitNexus change detection, and sensitive-artifact scans
   are required before closeout.

## WeChat safe output and native components

Source: `.trellis/spec/frontend/wechat-svg-modules.md`.

Contracts:

1. One writing-component registry, Zod boundary, stable PascalCase JSX serialization, TipTap atom,
   and platform-safe fallback drive editor and export.
2. Final inline artifact after typography, post-processing, sanitizer, clipboard, and platform
   cleaning is authoritative. Preview success alone is not a platform claim.
3. Real metadata is required; absent song/category/author/source/image/number/platform fields are
   omitted or blocked. Promoted masthead/end items cannot reappear in suffix.
4. Official image/cover/draft APIs remain server/Tauri-side. Native song/profile/article/media cards
   require real platform-editor insertion/readback or remain static fallback/manual/blocked.
5. Current official draft parity is executable: digest max 120 with 120/121 tests. Live proof is one
   backend-only add → get → list-reconcile → delete → marker-absence operation. A pre-add non-sensitive
   marker plus payload hash makes pending cleanup uniquely recoverable; unknown outcomes stay blocked.
   Recovery fully paginates draft_batchget with count 20 and content enabled; its canonical hash uses
   only stable readable normalized fields and covers >20 drafts/server normalization. Vue receives no
   generic ID read/delete command or raw media ID.
6. Registry component IDs are types. External native handoff uses a non-persisted per-artifact
   occurrence key plus a unique anchor; ambiguity fails closed.
7. Authenticated PC editor proof must identify the intended article editor, intended body surface,
   exact artifact/component, same session, actual visible/DOM readback, and safe cleanup.
8. PC editor proof does not prove phone preview, Dark Mode, cover thumbnail, interaction, sync,
   schedule, group-send, or publication.

## Native shell, keyboard, focus, and reduced motion

Sources:

- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- existing Workstation/native-window task contracts cited in `current-capability-map.md`

Contracts:

1. Use semantic native controls, accessible names, explicit pressed/disabled state, visible focus, and
   installed Lucide icons. No emoji icon or inaccessible clickable container.
2. Transient overlays do not change document geometry; docked/pinned panels may reserve space.
3. Close/redock restores the trigger or exact editor selection. Escape only closes the current
   topmost closable surface; shell listeners do not compete with EditorKeymap/IME.
4. Effective reduced motion is product setting OR OS preference; App class/data, CSS and JavaScript
   waits use the same result. Cover app-only, OS-only, both-off, and zero-duration cases.
5. Wait for actual transition/layout completion, including zero-duration completion under reduced
   motion. Do not mask races with fixed sleeps.
6. Reduced motion removes nonessential movement/scale/breathing/smooth scroll but preserves visible
   state, focus, error, and hit targets.
7. Native utility windows remain allowlisted and share existing inspector data; arbitrary HTML
   windows and a second widget store are forbidden.
8. Generate shell rows from current capabilities only: Manager/Stage collapse-expand; Inspector panel
   pin-hover-collapse; Inspector widget dock-float-native-close-redock. No invented Cartesian product.

## XHS and Zhihu output boundaries

Sources:

- `docs/platform-rendering-rules/xiaohongshu-rules.md`
- `docs/platform-rendering-rules/zhihu-rules.md`
- `.trellis/spec/guides/cross-platform-thinking-guide.md`

Contracts:

1. XHS canonical body is plain text; visual output is real 3:4/1:1 raster pages/cover/long image plus
   a validated manifest. HTML, CSS, SVG, raw Markdown controls, fake links, and hard-coded market
   limits are rejected.
2. Zhihu canonical output is clean Markdown. WeChat wrappers/styles/SVG are removed; formulas,
   diagrams, complex tables, and other fallbacks need real image bytes, alt/caption, and actual public
   HTTPS or platform-uploaded hosts.
3. This later user-approved child extends prior local-only XHS/Zhihu scope to authenticated editor
   rendering tests. It still stops before publication and does not rewrite the parent task's evidence.
4. Live tests use the exact final release artifact through visible paste/import/upload controls and
   read back the intended editor surface. They do not inject TipTap/Draft.js state.
5. A platform syntax that remains raw, an image without a valid host/upload, or unavailable account
   capability is manual/blocked, not success.
6. `convertToNativeFormat()` currently validates caller-supplied image manifests; it does not write
   XHS/Zhihu files. A visible release Export must use existing slicer/raster/image-pipeline pieces to
   write exact bytes and manifests before authenticated editor testing.

## Evidence and no-claim rules

1. For static editor proof, `releaseArtifactReceipt` binds current final EXE/producer to exact bytes.
   Independent `platformReadbackReceipt` binds those bytes plus platform/ingress/target surface to
   authenticated visual/DOM readback and cleanup.
2. Results remain distinct: not-run, local, platform-editor-rendered, manual-native-insert, blocked,
   and invalidated. `published=false` is an independent field; only the precise success state closes
   its matching required gate.
3. No Cookie, Token, QR, HAR, profile path, browser/session artifact, account chrome, private draft,
   private selector/DOM, or real platform resource ID enters the repository.
4. EXE changes rerun releaseArtifact and shell receipts. A byte-identical static artifact may connect
   to the unchanged platform receipt; changed bytes/ingress/target invalidate it. WeChat API uses a
   separate live receipt bound to current EXE/backend/schema/cleanup protocol/redacted account
   capability; any change reruns it. Docs-only changes do not invalidate proof.
