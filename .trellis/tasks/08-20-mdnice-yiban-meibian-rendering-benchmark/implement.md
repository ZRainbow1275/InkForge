# Implementation Plan: evidence-gated WeChat fidelity optimization

## Status

Planning approved on 2026-08-21. Local implementation is bound to `dev/visual-fixes@51696357`; external WeChat actions still require a separate preflighted batch approval.

Local implementation commit: `05ec1a6023f6eeea6ec37a86a1697e653732bda6`. Its clean-tree `wechat-draft-preflight/v1` verified successfully; all three official-draft candidates remain ineligible with `content-invalid`, so no external batch is approved or runnable.

## 0. Entry gates

- [x] Bind `dev/visual-fixes@51696357`, containing `markdownToWechatWithStats()`, the existing clipboard path, ordinary `publishWechatDraft()`, StyleProof/manual manifest and current tests.
- [x] Land the required ordinary-draft capability in a separate reviewed baseline; exclude the destructive live-round-trip/delete/recovery chain rather than depend on dirty-only code.
- [x] Record the bound commit and three usable catalog choices in task metadata/research: `wechat-classic-inline`, `wechat-flagship-kiln`, `wechat-flagship-kiln-paste-safe`.
- [x] Resolve the bound worktree in GitNexus and run final staged change detection for the baseline. Before each new symbol edit, still run upstream impact and warn on HIGH/CRITICAL risk.
- [x] Explicitly read the bound spec's relevant market-evidence, sanitizer/SVG application, PublishView, style-sample and application/release-gate sections in `.trellis/spec/frontend/wechat-svg-modules.md`; JSONL injection was not treated as a substitute.
- [x] Obtain user approval of this latest planning summary before local implementation (2026-08-21).

Stop if any entry gate is unresolved.

## 1. Prepare one deterministic corpus and receipt assertion

- [x] Search the bound baseline for an equivalent comprehensive fixture; reuse it if it satisfies the PRD.
- [x] Otherwise add one task-owned Markdown fixture, not a generator, DSL or new content registry.
- [x] Cover the PRD semantic matrix and one source-owned image role/cover intent; record fixture and asset SHA-256.
- [x] Render through `markdownToWechatWithStats()`; do not pass raw Markdown to `convertToWechatWithStats()`.
- [x] Add one smallest standard-library receipt assertion for `wechat-fidelity-receipt/v1` and `wechat-semantic-readback/v1` required fields, canonical-summary fingerprint recomputation, account-target match state, observable/unknown upload-count rules, state transitions and privacy denylist.

Expected result: one corpus and one assertion script; no product UI/schema change.

## 2. Pin choices, generate canonical artifacts and preflight

- [x] At the bound `wechat-publish.ts` owner, extract one no-WeChat-write `planWechatDraftPublish()` (name may follow the baseline) from the current metadata/content validation, image-host classification, unique source counting, `assertWechatUploadImage()` compatibility rules, local source normalization and cover decision. It may read/normalize local asset/blob sources but must finish all such work before any Tauri upload invoke or remote mutation.
- [x] Make `publishWechatDraft()` consume that same plan/image classification and require a transient approval object; missing approval or a recomputed plan-fingerprint mismatch must fail before its first network call. Do not build a second parser or estimator.
- [x] Update the only real product caller, `PublishView.handleCreateWechatDraft()`: freeze the exact input, call the no-WeChat-write planner, show one native confirmation containing the transient API target hint, short plan fingerprint and per-kind side-effect upper bounds, then pass the mandatory in-memory approval only after the user confirms. Do not add a component, persisted setting or evidence-only bypass.
- [x] Extend the existing `scripts/style-proof-wechat-style-samples.ts` with one `--draft-preflight` JSON mode rather than adding a second CLI framework. It emits strict `wechat-draft-preflight/v1` with a complete result for every requested choice, input/plan fingerprints, reason codes, redacted eligibility and side-effect upper bounds. Exit `0` means a complete schema-valid report even when cases are ineligible; incomplete/unhandled failure exits `1`, unknown option exits `2`, help exits `0`.
- [x] Add focused tests proving zero invoke/upload calls during planning, duplicate image sources count once, WeChat-hosted images count zero, cover-handle format versus cover-upload decisions match execution, limits fail before mutation, and missing/mismatched approval fails before mutation. Put a valid image before WebP/SVG/unsupported-source cases and prove the whole plan fails before the first upload. Keep the source contract in `PublishView.wechat-presets.test.ts`; use the mounted `PublishView.snapshot-race.test.ts` to prove cancellation returns before `publishWechatDraft()` and confirmed frozen identity reaches the real caller. The later real Tauri UI check remains the runtime gate.
- [x] Pin one usable inline, one SVG-heavy flagship and one paste-safe fallback from the current runtime application report.
- [x] Generate all three canonical artifacts through `markdownToWechatWithStats()` and record their existing StyleProof `artifactFingerprint`.
- [x] Confirm repeated generation is deterministic and quality detection has no unexpected blocker.
- [ ] For every official-draft candidate, before the first WeChat remote call record and verify input/plan fingerprints, title length, Unicode char count, UTF-8 byte count, unique non-WeChat-hosted image count, deterministic MIME/extension/source compatibility, local-source preparation, cover-handle format or upload requirement, non-sensitive API/editor target-match result and expected remote side effects. Never claim an existing handle's remote validity from this no-write plan.
- [x] Mark any title `>32`, content `>=20,000` chars, content `>=1 MiB`, invalid media binding or unapproved upload as ineligible. Do not shrink the corpus or silently change choice.
- [ ] Reconcile any prior non-confirmed cleanup ledger entry before approving a new batch.
- [ ] Present the verified report to the user and obtain separate approval for exact draft case count, per-kind upload upper bounds, phone/cover actions, draft cleanup and any unavoidable remote-media residual.
- [ ] Immediately before each official-draft write, call existing `getWechatPublishStatus()` and have the user confirm the displayed target hint matches the account visible in the sole CloakBrowser editor session; persist only match state/method, never account values.

Concrete local gates:

```bash
pnpm --silent -C inkforge style-proof:application-preflight
pnpm --silent -C inkforge style-proof:application-acceptance
pnpm --silent -C inkforge style-proof:wechat-style-samples
pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/wechat-style-export-samples.test.ts scripts/style-proof-wechat-style-samples.test.ts src/views/__tests__/PublishView.snapshot-race.test.ts src/views/__tests__/PublishView.wechat-presets.test.ts --reporter=default --maxWorkers=1 --no-file-parallelism
python -B .trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/research/test_verify_wechat_fidelity_receipt.py
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
```

Generate and verify a repo-owned candidate batch plan before requesting the batch maximum. This CLI report is not the final runtime approval: the revised `PublishView` authoritatively plans the frozen full input (final title/nonce, choice, media binding and cover) and obtains the per-case confirmation immediately before any write.

```bash
set -euo pipefail
ROOT="$(pwd)"
TASK=.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark
CORPUS="${CORPUS:-$ROOT/$TASK/research/wechat-fidelity-corpus.md}"
PREFLIGHT="$ROOT/$TASK/research/wechat-draft-preflight.json"
PREFLIGHT_TMP="$(mktemp "${TMPDIR:-/tmp}/inkforge-wechat-preflight.XXXXXX.json")"
trap 'rm -f "$PREFLIGHT_TMP"' EXIT
test -z "$(git status --porcelain=v1 --untracked-files=all)" || { echo "preflight generation requires a clean Git worktree" >&2; exit 1; }
pnpm --silent -C inkforge exec tsx scripts/style-proof-wechat-style-samples.ts --draft-preflight --corpus "$CORPUS" --json > "$PREFLIGHT_TMP"
python "$ROOT/$TASK/research/verify-wechat-fidelity-receipt.py" --preflight "$PREFLIGHT_TMP" && mv "$PREFLIGHT_TMP" "$PREFLIGHT"
trap - EXIT
```

Capture expected pre-external release status without treating exit `1` as a test failure:

```bash
TASK=.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark
REPORT="$TASK/research/release-preflight-before-external.json"
set +e
pnpm --silent -C inkforge style-proof:release-preflight --json > "$REPORT"
CODE=$?
set -e
python - "$REPORT" "$CODE" <<'PY'
import json, sys
report = json.load(open(sys.argv[1], encoding='utf-8'))
assert int(sys.argv[2]) == (0 if report['canClaimComplete'] else 1)
assert report['canClaimComplete'] is False
PY
```

## 3. Collect rich-clipboard cases

For all three pinned choices, one case at a time:

- [ ] Use the existing canonical result and `copyWechatHtmlToClipboard()` path.
- [ ] Create exactly one approved, uniquely titled disposable draft and paste once.
- [ ] Verify title uniqueness and repo-owned sentinel; record only redacted applied semantic summary/fingerprints.
- [ ] Explicitly save, reload and record host semantic diff.
- [ ] With user/device action, verify exact artifact phone, Dark Mode and cover outcome.
- [ ] Delete only the unique match; check immediately, after at least `15s`, and once more by `30s` total.
- [ ] Update ledger to `confirmed`, `cleanup-pending` or `residual-external-media` as applicable.

Stop on ambiguity, unexpected autosave target, login/permission gate, unapproved media persistence or sensitive-data exposure.

## 4. Collect eligible official-draft cases

For each preflight-eligible and approved choice:

- [ ] Prefer an existing approved WeChat-hosted test image and cover handle; raw values stay transient and are not committed.
- [ ] If new media is unavoidable, approve exact per-kind upload upper bounds. On success, verify observable actual counts do not exceed them and record that missing delete APIs leave residual external state.
- [ ] Use the revised `PublishView` caller: verify its native confirmation shows the same frozen plan identity, target hint and approved side-effect bounds, then confirm once. It passes the mandatory transient approval into `publishWechatDraft()`; record canonical and rewritten payload fingerprints separately.
- [ ] If that call throws before returning its success result, never infer zero or substitute expected counts: record the last confirmed phase, approved upper bounds, `actualUploadCount: unknown` for affected kinds and `residual-external-media-unknown`; stop completion and subsequent writes pending reconciliation.
- [ ] Treat `articleCount/createdAt` as acknowledgement only; do not claim an arbitrary draft handle or use fixed sentinel round-trip as corpus proof.
- [ ] In the visible draft list, require exactly one unique short-title match. Open it, verify the body sentinel, then capture save/reload/phone/cover evidence.
- [ ] Delete through the exact visible UI path and run the same bounded reconciliation.
- [ ] Keep official-draft, clipboard, cleanup and media-residual states independent.

If no official-draft case is eligible, keep AC7 blocked and report the exact limit/fallback; do not force a write.

## 5. Triage; change code only for a reproduced failure

- [ ] Classify each difference as renderer, channel preparation, editor application, host save normalization, phone/Dark Mode, cover or media side effect.
- [ ] If all required nodes survive, record `shared publish preflight + native confirmation bridge only; no renderer/style/formula/new-component change required` and skip to step 7.
- [ ] For a real defect, locate the shared owner with GitNexus/Serena and run upstream impact before editing.
- [ ] Make the smallest root-cause fix; no per-caller patches, second renderer, new template DSL or duplicate evidence UI/framework.
- [ ] Add/update one focused regression that fails on the observed corpus case.
- [ ] Rerun the exact affected case and relevant local gates; run GitNexus `detect_changes` against the actual diff.
- [ ] Construct and record a concrete eslint command from the actual changed source files. Do not execute a literal placeholder command.

Minimum shared checks after any product-code change remain `vue-tsc`, build, application preflight and release preflight. Add the exact affected test files identified by impact; do not substitute an unrelated broad green suite.

## 6. Conditional formula decision

Run only if P0 proves a formula defect:

- [ ] Preserve current readable TeX as control/fallback.
- [ ] Produce source-owned safe-SVG and current image-artifact candidates without copying mdnice output.
- [ ] Compare PC saved readback, formula-in-table, phone and Dark Mode.
- [ ] Keep TeX if no candidate wins all gates; otherwise place the winner at the existing safe boundary, retain fallback, add focused tests and repeat the exact external case.

## 7. Evidence intake and final review

- [ ] Redact evidence; reject token/account/private URL or handle/HAR/QR/raw private DOM/browser-profile data.
- [ ] Verify each `wechat-fidelity-receipt/v1` with the task assertion script; it must canonicalize every persisted payload/readback summary, recompute SHA-256 and compare the claimed fingerprint. `task.py validate` alone and hash-shape checks are insufficient.
- [ ] Generate the existing manual draft pack to a task-local temporary file, create a separate reviewed `REDACTED_MANIFEST.json`, then run intake/merge. Do not assume the draft command creates that file.
- [ ] Keep manifest `artifactFingerprint` canonical; put channel/readback hashes only in the referenced task receipt.
- [ ] Re-run release preflight, capture its exit code and JSON, and report every remaining blocker without forcing completion.
- [x] Run two independent read-only reviews: correctness/security and scope/evidence.
- [x] Confirm task-scoped files contain no unrelated dirty change, credential, raw media binding or browser runtime artifact.

Commands:

```bash
ROOT="$(pwd)"
TASK=.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark
MANIFEST="$ROOT/$TASK/research/REDACTED_MANIFEST.json"
pnpm --silent -C inkforge style-proof:wechat-manual-manifest-drafts > "$TASK/research/wechat-manual-manifest-drafts.txt"
# Operator creates and redaction-reviews $TASK/research/REDACTED_MANIFEST.json from that draft pack.
pnpm --silent -C inkforge style-proof:manifest-intake --file "$MANIFEST" --json
pnpm --silent -C inkforge style-proof:manifest-merge --file "$MANIFEST" --json
python "$TASK/research/verify-wechat-fidelity-receipt.py" --receipt "$TASK/research/wechat-fidelity-receipt.json"
python .trellis/scripts/task.py validate "$TASK"
```

The draft pack and unmerged manifest are working files; only redacted, validator-accepted evidence enters final task output.

## Expected file surface

Always expected after execution:

- task planning/research/evidence files;
- one deterministic corpus, one standard-library receipt assertion and its focused standard-library regression.
- the existing `wechat-publish.ts` shared no-WeChat-write planner plus its focused existing test file;
- one narrow `--draft-preflight` mode in the existing style-sample script and its existing `scripts/style-proof-wechat-style-samples.test.ts` test.
- the current `PublishView.handleCreateWechatDraft()` caller and its existing focused test; this native confirmation bridge is the only planned UI change, with no new component or persisted state.

Only after a reproduced defect:

- the existing shared renderer/channel/cover/formula owner identified by impact;
- its directly relevant focused test.

Not expected: browser extension package, new theme/catalog/manifest framework, vendor assets/source, account/auth/HAR/raw media binding/screenshots with account chrome/browser profile.

## Rollback and stop conditions

- Corpus/evidence has no product behavior rollback; invalid batches stay unmerged. The preflight extraction rolls back as one shared publish-boundary diff if its equivalence test fails.
- Revert only the focused product diff and keep the failed capability blocked.
- Formula returns to current readable TeX.
- Draft cleanup uses exact title/sentinel only; never broad deletion. Missing media deletion remains residual.
- Stop when baseline or user approval is missing; API/editor target binding is absent or mismatched; plan identity changes; case is over limits; upload counts exceed approval or become unobservable; more than one draft matches; cleanup/media reconciliation is pending; evidence is sensitive; or the proposed fix creates a second system.
