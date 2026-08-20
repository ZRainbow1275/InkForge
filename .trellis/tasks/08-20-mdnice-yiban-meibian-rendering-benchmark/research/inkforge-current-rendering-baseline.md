# InkForge Current WeChat Rendering Baseline

- Collected: 2026-08-20 (Asia/Shanghai)
- Branch: `dev/visual-fixes`
- HEAD: `9a2f56e0b679ec9e8a9cb5951690ad222a49199a`
- **Evidence status: working-tree-only unless a row below says otherwise.** The repository already had a large dirty worktree before this research. The task directory is untracked and this session's operator record says no product code was edited, but Git has no clean before-snapshot from which to prove attribution independently.
- GitNexus index: `InkForge`, indexed at the same HEAD with 23,059 symbols / 42,203 relationships / 300 flows.
- GitNexus describes committed `HEAD`; it cannot prove code that exists only in the current dirty source. `detect_changes(scope=all)` reported a CRITICAL-sized worktree delta, so no dirty-only capability may be treated as release-verified.
- ABCoder result: repository was registered as `Inkforge`, but `get_repo_structure` returned `modules:null`; structure conclusions below therefore use current source, Serena symbols, GitNexus context, specs, and runnable gates.

## 1. Current source-of-truth pipeline

The current dirty-source WeChat path is not greenfield and must remain one renderer:

```text
Markdown
  -> renderWechatMarkdownWithLazyEnhancements()
  -> convertToWechatWithStats()
  -> task-list / KaTeX / Mermaid pre-sanitization transforms
  -> sanitizeUntrustedPreviewHtml + isolated DOMPurify
  -> code / alert / footnote / masthead / delivery-adornment transforms
  -> section#nice
  -> preview theme CSS + code CSS + sanitized export custom CSS
  -> juice inline
  -> applyHeadingDecorations
  -> preset.decorate(..., 'wechat') exactly once
  -> applyWechatOptionSvgModules
  -> typography and table overrides
  -> postProcessForWechat
  -> enforcePlatformCSS('wechat')
  -> wechatComplianceTransform (CJK spacing, 677px clamp, optional dark-mode metadata)
  -> native HTML artifact
  -> prepareWechatClipboardHtml / copyWechatHtmlToClipboard
```

Current anchors:

- `inkforge/src/services/export/wechat.ts:1199-1453`
- `inkforge/src/services/export/platform-rules/wechat.ts:272-291`
- `inkforge/src/services/export/utils.ts:954-1060`
- `inkforge/src/composables/usePreviewRenderer.ts:107-348`
- `inkforge/src/components/export/ExportModal.vue:1556-1579`

In the current dirty source, preview calls `convertToNativeFormat(..., 'wechat')` and wraps the canonical result with `renderWechatMockHtml`. Copy starts from the same `nativeResult.content`, then `prepareWechatClipboardHtml` performs channel preparation/entity encoding before writing `text/html`. Therefore preview and copy share a canonical source, but their byte payloads are not identical. A second mdnice-style renderer or preview-only theme path would create drift and is out of scope.

### 1.1 Capability provenance

| Capability | `main` | `dev/visual-fixes` HEAD | Current dirty source | Status used by this research |
|---|---|---|---|---|
| Core WeChat conversion (`convertToWechatWithStats`) | present | present | modified | committed foundation; current behavior still needs diff/tests |
| Rich WeChat clipboard helper (`copyWechatHtmlToClipboard`) | absent | present | modified | dev-HEAD capability; not a `main` baseline |
| Preview consuming `convertToNativeFormat(..., 'wechat')` | absent | absent | present | dirty-only |
| Official draft creation (`createWechatDraft`) | absent | present | modified | dev-HEAD capability; current behavior is dirty |
| Restricted live add/read/delete/absence round-trip | absent | absent | present | dirty-only |
| Current ExportModal style/proof controls | not established | not established by the checked token | present in a modified file | working-tree-only for this plan |

Implementation is blocked until the target branch/commit containing the capabilities to be reused is explicitly bound. This table prevents a plan based on dirty source from silently claiming parity with `main` or a release.

## 2. Current dirty-worktree live gate

Command:

```bash
pnpm --silent -C inkforge style-proof:current-round
```

Result against the current dirty source: exit `0`, `status=application-acceptance-ready`, `canClaimApplicationReady=true`, while `canClaimReleaseComplete=false` and strict release remains `blocked-by-external`.

Current counts:

| Metric | Value |
|---|---:|
| SVG modules | 27 |
| module/persona renders | 108 |
| WeChat SVG application slots | 5 (0 failures) |
| WeChat application surfaces | 2 (0 failures) |
| WeChat export pipeline contracts | 3 (0 failures) |
| option-injected modules | 27 (0 failures) |
| WeChat style choices | 17 |
| usable choices | 8 |
| selectable/rendered choices | 13 / 13 |
| SVG-bearing selectable choices | 13 |
| total SVG modules in style samples | 45 |
| style sample issues | 0 |
| actionable local rows | 0 |

Raw result: `research/inkforge-current-round.json`, SHA-256 `587541815f0c6cc979652a49ddba56398bf790710425c7151c4219aaa330e096`.

This is local application/export evidence only. It does not prove ordinary WeChat paste, phone preview, mobile Dark Mode/interaction, cover thumbnail, credentialed sync, scheduled send, public rendering, or publication.

## 3. Remaining real WeChat gates

`pnpm --silent -C inkforge style-proof:wechat-manual-checklist` currently reports three next rows:

1. `cover-thumbnail-check` — phone preview, exact-artifact visual/readback, blocked by external phone proof.
2. `authenticated-editor-url` — authenticated PC editor proof is stale and must be recollected against the exact artifact.
3. `credentialed-channel-response` — real authenticated sync/plugin/upload/API response plus created-artifact readback; unsafe to automate silently.

Raw checklist: `research/inkforge-wechat-manual-checklist.md`, SHA-256 `e3a7c9c7a18d4e63fec6812e1601720b3b5bfa9b8f5af0b10e7f4c25146d430e`.

## 4. Existing market research already covered

The repository already contains source-backed doocs/md and OSS mdnice research:

- `prompts/0601/research/oss-md-architecture.md`
- `prompts/0601/evidence/oss-converter-source-refresh-20260618.txt`
- `docs/platform-rendering-rules/market-practices-catalog.md`
- `.trellis/tasks/08-09-native-media-shell-xhs-zhihu-render-acceptance/research/market-platform-evidence-map.md`

Already adopted or explicitly retained:

- `#nice`/scoped theme -> Juice inlining -> platform cleanup;
- CSS-variable/color/font parameterization;
- real heading/decorator nodes instead of relying on pseudo-elements;
- zero-height boundary nodes for SVG clipboard compatibility;
- image dimension normalization, nested-list repair, Mermaid/KaTeX degradation, CJK spacing, width clamp;
- separate WeChat/XHS/Zhihu native output contracts;
- strict no-copy boundary for GPL/private templates, vendor DOM, hosted assets, and account state.

The new research should therefore focus on **current `mdnice.com` SaaS/runtime behavior and the extension-integrated workflows of 壹伴/美编**, not repeat the older OSS architecture survey.

## 5. Current gaps after market/runtime verification

Subsequent current dirty-source review closed several initial hypotheses: operator-facing preflight/style-proof, copy feedback/history, font/size/color controls, official WeChat draft creation and a redacted add/read/delete/absence receipt are present in that working tree. They must not be rebuilt **when implementation is based on a commit that actually contains them**; they are not facts about `main` or a release.

Remaining decision/verification candidates are:

- **External fidelity evidence:** authenticated PC editor readback, phone preview/Dark Mode, cover thumbnail and publication remain external gates.
- **Visual formula output:** mdnice currently normalizes MathJax SVG, while InkForge deliberately emits readable TeX fallback; SVG/image/fallback must be compared on the same real WeChat artifact before changing behavior.
- **Existing-channel proof first:** collect exact-corpus PC editor, phone/Dark Mode and cover evidence through the current rich-copy and official-draft paths. A companion does not close the phone/cover gates by itself.
- **Optional editor companion, conditional only:** Yiban demonstrates that direct in-editor insertion can reduce context switching, but InkForge already has clipboard and official draft channels in the dev/dirty baseline. Reopen a minimal `mp.weixin.qq.com`-only bridge only after a reproducible existing-channel failure or an explicit editor-insertion requirement.
- **Targeted anchor fixes only:** earlier OSS research suggested local-anchor stripping, but no new anchor/style token should be added without a dedicated behavior failure.

## 6. Guardrail

Do not interpret a mature tool's authoring DOM, extension chrome, template HTML, CDN URLs, network payloads, or successful local preview as reusable source or WeChat proof. Extract only source-owned interaction patterns and independently verified platform contracts.

## 7. Implementation baseline binding (2026-08-21)

- Branch/commit: `dev/visual-fixes@51696357e44a1314e7ec05152f7c217240affa46`.
- The baseline was committed from an isolated clean worktree after focused Vitest (34/34), `vue-tsc`, focused ESLint (0 errors), production build, Rust WeChat tests (27/27), `cargo fmt --check`, Git diff checks and two independent read-only reviews.
- It retains ordinary draft publishing, an opaque process-local cover handle, bounded/pinned remote-image fetching, strict Rust trust-boundary validation and the single `PublishView` owner.
- It intentionally excludes the destructive live-round-trip/delete/recovery chain found in the planning dirty snapshot. P0 does not depend on that removed capability and must use the visible unique-title + body-sentinel workflow for any later approved external readback/cleanup.
- Pinned choices from `style-proof:wechat-style-samples --json`: ordinary inline `wechat-classic-inline`, SVG-heavy flagship `wechat-flagship-kiln`, and paste-safe fallback `wechat-flagship-kiln-paste-safe`; all three were `usable=true` at binding time.
- The user's main dirty worktree was preserved byte-for-byte across the branch fast-forward; P0 implementation proceeds only in the isolated bound worktree.
