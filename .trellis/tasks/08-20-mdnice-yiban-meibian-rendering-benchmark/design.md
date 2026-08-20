# Design: evidence-gated WeChat fidelity optimization

## Status

P0 local implementation is active against `dev/visual-fixes@51696357`. This does not authorize browser writes, media uploads, phone preview or publication; every external batch still requires separate approval.

## 1. Design decision

Keep the current InkForge architecture and wrap the two existing channels in an exact-artifact evidence loop:

```text
repo-owned Markdown corpus + source-owned media role
  -> markdownToWechatWithStats()
     -> existing lazy Markdown enhancements
     -> convertToWechatWithStats()                 canonical renderer result
  -> current quality + sanitizer + SVG gates
  -> channel A: rich clipboard                     channel payload
  -> channel B: eligibility-gated publishWechatDraft()
     -> optional approved media binding/upload     rewritten channel payload
  -> authenticated WeChat editor                   editor applied state
  -> explicit save + reload                        host saved readback
  -> real phone + Dark Mode + cover                external visual readback
  -> exact draft cleanup + media residual ledger   cleanup result
```

No layer is a byte-equivalence promise. The canonical artifact remains the stable StyleProof identity; channel and host summaries are separate task evidence.

## 2. Existing boundaries to reuse

| Boundary | Existing owner | Design rule |
|---|---|---|
| Markdown entry | `markdownToWechatWithStats()` | Required for formula, Mermaid, component/lazy enhancement and AST stats. |
| HTML conversion | `convertToWechatWithStats()` | Remains the only underlying WeChat renderer. |
| Clipboard | `prepareWechatClipboardHtml()` / `copyWechatHtmlToClipboard()` | Keep modern Clipboard API, dual MIME and fail-closed fallback. |
| Official draft UI caller | `PublishView.handleCreateWechatDraft()` | Freeze one input, show one native confirmation with target hint/fingerprint/side-effect bounds, then pass mandatory transient approval. |
| Official draft orchestration | `publishWechatDraft()` | Reuse image rewrite/upload, cover preparation and internal create call only after shared no-write planning and mandatory caller approval. |
| Low-level draft create | `createWechatDraft()` | Internal primitive; response has count/time, not arbitrary draft identity. |
| Corpus readback/delete | Authenticated WeChat visible UI | The bound baseline intentionally has no destructive generic round-trip; locate only the unique short title + body sentinel and never delete broadly. |
| Safety | DOMPurify, publish-copy sanitizer, WeChat rules, SVG validator | Never relax to imitate mdnice or Yiban. |
| Evidence | runtime catalog, quality detector, StyleProof, manual checklist | Keep canonical identity in existing manifest; task receipt holds layered hashes. |

The planning dirty tree remains historical evidence, not an implementation baseline. Local implementation is bound to the separately reviewed `dev/visual-fixes@51696357`; its ordinary draft path is retained and the destructive live-round-trip/delete/recovery chain is excluded. Source inspection identifies two required product owners: `wechat-publish.ts` lacks a non-mutating plan shared with execution, and the existing `PublishView` caller must carry its mandatory transient approval. Apart from that one native confirmation bridge, no renderer/style/formula/other UI file is selected before a reproduced fidelity failure identifies its owner.

## 3. Deterministic corpus and media binding

Create one task-owned Markdown fixture only if the bound baseline has no equivalent. It covers:

- H1–H6, CJK/Latin paragraphs, strong/emphasis/deletion/inline code/links;
- blockquote, nested ordered/unordered/task lists;
- wide table and formula-in-table;
- tagged/untagged code fences;
- inline/block/long formula, footnote and Mermaid;
- registered writing-component families required by the existing spec;
- one source-owned image role with stable asset SHA-256, alt/caption/width cases, and cover intent.

The fixture stores no account or third-party content. A runtime `WechatMediaBinding` may supply an already approved WeChat-hosted copy of that source asset plus an existing cover handle. Raw URL/handle are never committed; the task receipt stores only binding/source hashes and whether a new upload occurred.

Preferred path: reuse an existing, explicitly approved WeChat-hosted test image and cover handle, creating no new media. Fallback path: user separately approves exact body-image and permanent-cover upload counts; any asset without a verified delete path remains `residual-external-media` after draft deletion.

Do not overload `DEFAULT_SAMPLE_MARKDOWN` or the style-gallery sample. They keep their current preview/all-style duties; the fidelity corpus is one evidence fixture, not another content system.

## 4. Representative matrix and no-write eligibility

At baseline binding, pin exactly three currently usable catalog choices: ordinary inline, source-owned SVG-heavy flagship, and paste-safe/static fallback.

| Channel | Planned coverage |
|---|---|
| rich clipboard | all three choices |
| official draft | run preflight for all three; execute only eligible and approved cases |

Official-draft preflight runs before network or media mutation and records:

- transient `getWechatPublishStatus()` target hint matched by the user to the currently visible editor account; persist only `matched: true/false` and the verification-method enum, never either account value;
- title length `<=32` characters and a unique nonce;
- rendered content `<20,000` Unicode characters and `<1 MiB` UTF-8;
- source-owned body-image roles, unique non-WeChat-hosted image count and whether each requires upload;
- existing cover-handle format validity plus `remote-validity-unverified`, or exact permanent-cover upload requirement;
- expected draft count, body-image upload count, permanent-cover count and known residual state;
- channel payload headroom after binding; already-over-limit canonical output is blocked before upload.

An ineligible SVG-heavy case is a valid `official-draft-ineligible` result and should point to the existing paste-safe/clipboard fallback. Do not shrink the corpus, bypass validation or silently switch choices.

The current implementation cannot produce this plan without entering the upload loop. P0 therefore extracts one no-WeChat-write `planWechatDraftPublish()` (final name may follow the bound baseline) at the existing publish boundary. It reuses the current metadata/content validators, image-host classifier, `assertWechatUploadImage()` rules, source-scheme normalization and cover validator; resolves every local asset/blob candidate and rejects deterministic MIME/extension/source failures before any Tauri upload invoke; then returns input/plan fingerprints, unique prepared upload candidates/counts and cover requirement. HTTP(S) reachability, remote MIME truth and existing cover-handle ownership/existence remain explicitly unverified until the remote call. The planner is consumed by `publishWechatDraft()`, the current `PublishView` caller, and the existing style-sample CLI's new `--draft-preflight` mode. `PublishView` freezes the exact input, shows one native confirmation containing the transient API target hint, short plan fingerprint and per-kind side-effect upper bounds, and passes a mandatory in-memory approval only after the user confirms the target/bounds. The mutating path rejects missing approval or a recomputed fingerprint mismatch before its first upload and consumes the already prepared candidates rather than normalizing later images inside the upload loop. Image discovery/classification/preparation has one owner, not parallel preflight/execution implementations.

The CLI mode emits strict `wechat-draft-preflight/v1`: `schemaVersion`, `status: "complete"`, corpus/commit/choice identity and one redacted case result per requested choice, including eligibility/reason codes, input/plan fingerprints, limits, prepared unique counts, cover state and unverified-remote flags. A complete report exits `0` even when some or every case is ineligible; missing input, an unhandled/incomplete report exits `1`; unknown options exit `2`; help exits `0`. Ineligible is evidence, not a process error. The task verifier validates this schema before any approval.

## 5. Fingerprint and receipt contract

### 5.1 Existing manifest identity

`StyleProofArtifact.artifactFingerprint` remains the canonical renderer artifact fingerprint required by the current manifest. P0 does not add unknown channel/readback fields to that interface or intake JSON.

### 5.2 Task-local receipt

One source-free `wechat-fidelity-receipt/v1` JSON per batch is referenced through the manifest's existing `artifactRef`. Manifest intake only retains that known reference; receipt fields never pass through intake. The receipt contains no raw DOM, URL, handle, account value or screenshot path.

Minimum fields:

- case ID, corpus SHA-256, bound commit, choice/options;
- canonical `artifactFingerprint` copied exactly from StyleProof;
- channel kind, transient full-payload digest, persisted normalized payload summary/fingerprint, media-binding SHA-256, non-sensitive account-target match state/method, approved upload upper bounds, and observable actual upload counts;
- applied and saved `wechat-semantic-readback/v1` fingerprints plus their persisted allowlisted normalized node/issue summaries;
- phone/Dark Mode/cover states;
- draft cleanup state and remote-media residual state. If `publishWechatDraft()` fails before returning its success result, affected actual counts are `unknown` (optionally with a defensible lower bound), the receipt records the last confirmed phase and approved upper bound, and the residual state is `residual-external-media-unknown`; estimates never fill actual fields.

`wechat-semantic-readback/v1` hashes deterministic JSON: UTF-8, sorted object keys, arrays in document order, decoded entities, CRLF normalized to LF, DOM tag/role order, text digest, allowlisted semantic attributes, sorted inline-style properties, node counts and separate forbidden/vendor-residue findings. The persisted channel/readback summaries follow this canonicalization. It excludes editor chrome and non-source host IDs from the hash but reports their counts; it never removes semantic loss such as literal `**`, backticks, missing blockquote or missing image.

The receipt gets a small standard-library assertion script that canonicalizes every persisted normalized summary, recomputes its SHA-256 and compares it to the claimed fingerprint, in addition to schema/state/privacy checks. A transient full-payload digest is explicitly capture provenance and is not mislabeled independently reproducible after the private payload is discarded. `task.py validate` remains only the JSONL/path validator and is never cited as receipt-schema proof.

## 6. Rich clipboard procedure

For each pinned choice:

1. Render Markdown through `markdownToWechatWithStats()` and record canonical identity.
2. Use the existing clipboard preparation/copy path.
3. In the single approved CloakBrowser session, create one uniquely named disposable draft and paste once.
4. Capture a redacted semantic summary before save; explicitly save, reload, then capture the same summary again.
5. Complete phone/Dark Mode/cover checks only after the user/device gate.
6. Delete only the exact title/nonce match and run bounded absence reconciliation.

If saving the clipboard case causes host-side image persistence, record it as external media state; draft deletion alone is not media cleanup proof.

## 7. Official draft procedure

For each pinned choice:

1. Run the no-write eligibility/side-effect preflight. Block before network on any limit or approval failure.
2. Call existing `getWechatPublishStatus()` and have the user transiently match its target hint to the account visible in the sole CloakBrowser editor session. Persist no target value; a missing or mismatched binding blocks the case.
3. Prefer an approved existing media binding. If new uploads are required, stop until their exact upper bounds and residual policy are approved.
4. In the current `PublishView` caller, freeze the exact input and show its planner result in one native confirmation. The user confirms that the displayed target hint matches the sole visible editor account and approves the shown side-effect upper bounds; cancellation writes nothing.
5. Pass that mandatory transient approval and frozen input to `publishWechatDraft()`; it recomputes and rejects missing/mismatched identity before network. Record canonical and rewritten payload fingerprints separately.
6. Treat its result as creation acknowledgement only; it does not expose an arbitrary draft handle. If it throws, do not infer zero uploads: record approved upper bounds, last confirmed phase, unknown actual counts and `residual-external-media-unknown`, then stop the batch.
7. In the visible draft list, require exactly one match for the unique short title. Open only that draft and verify the repo-owned body sentinel before any further action.
8. Capture applied/save/reload/phone/cover evidence through the same semantic receipt.
9. Delete through the exact visible draft UI path and run bounded absence reconciliation. Do not claim the fixed live-round-trip function deleted this corpus draft.

Official-draft and clipboard states remain independent. Ineligible cases remain blocked rather than disappearing from the report.

## 8. Cleanup and recovery

Maintain one non-sensitive task ledger with `caseId`, unique short title/nonce, channel and state:

`planned → write-requested → visible-and-sentinel-verified → delete-pending → confirmed`

Optional terminal states: `creation-unconfirmed`, `cleanup-pending`, `residual-external-media`, `residual-external-media-unknown`.

- Before a new external batch, reconcile every non-confirmed prior case.
- After delete: reload immediately, reload after at least `15s`, and allow one final check by `30s` total.
- If exactly one draft remains, keep `cleanup-pending`; if more than one matches, stop without deleting and require user resolution.
- If a response is lost, search only by the task title/nonce; verify the sentinel after opening.
- Remote body/cover assets are tracked separately. No delete contract means residual, not absence.
- A mid-call failure with unobservable upload progress keeps the approved upper bound and unknown residual state; it blocks completion and the next write batch until user-led reconciliation or an explicit residual acceptance decision.

## 9. Readback comparison and failure ownership

Compare semantic preservation rather than raw HTML length:

- heading/paragraph/inline semantics;
- quote, list/task-list and table structure;
- code language/whitespace;
- formula presentation and readable fallback;
- image/caption/src host/width and cover outcome;
- links, footnotes, Mermaid fallback and writing components;
- source-owned SVG sentinels, forbidden nodes and vendor residue.

| First failing layer | Owner | Allowed response |
|---|---|---|
| canonical result | shared renderer/decorator/platform rule | one root-cause fix after GitNexus impact |
| channel payload | clipboard preparation or official draft orchestration | channel-local fix; no renderer fork |
| editor applied | channel/editor interoperability | narrow transform or explicit blocked fallback |
| host saved readback | WeChat-safe output contract | remove/replace unsupported construct at shared boundary |
| phone/Dark Mode | style/SVG/image compatibility | source-owned static fallback or blocked state |
| cover/media | existing media/cover path | fix producer/readback or record residual state |

If no fidelity defect is observed, the correct result is the shared publish-safety planner/confirmation bridge plus evidence, with no renderer/style/formula change.

## 10. Conditional formula experiment

Start only when P0 demonstrates a formula defect. Compare current readable TeX, source-owned safe SVG and the current image-artifact path through PC saved readback, formula-in-table, phone and Dark Mode. A local screenshot or mdnice MathJax behavior is insufficient. Any shipped visual branch keeps escaped TeX as fail-safe and can be disabled without changing non-formula output.

## 11. Companion decision

No companion code, manifest or scaffold is created. If a later task reopens it: `mp.weixin.qq.com` only, explicit selection insert, all writes treated as autosaving, nonce-owned summary only, strict origin/source/schema validation and independent disable/rollback.

## 12. Security and rollback

- Reuse one CloakBrowser session; never start a second browser/profile for the batch.
- Persist only redacted hashes/summaries. No raw private DOM, account chrome, private URL/handle, auth header, HAR, QR payload or browser profile.
- Never publish or group-send. Stop on ambiguity, permission change, unapproved upload or sensitive-data exposure.
- Block official-draft writes unless the transient API-target hint and the currently visible editor account are user-confirmed as the same target.
- Rollback targeted code only; keep the failure receipt and capability blocked. Formula returns to TeX. Draft cleanup never performs broad deletion. Remote assets without a delete path remain explicitly residual.
