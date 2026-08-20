# WeChat Manual Style Proof Checklist

This checklist is not proof. It is a human worksheet for collecting external WeChat phone/account proof.
Do not paste account secrets, QR payloads, cookies, auth secrets, HAR files, local browser-runtime directories, or unredacted platform URLs into committed evidence.

## Claim Boundary

- notProof: true
- canClaimComplete: false
- committedCanClaimComplete: false
- status: blocked-by-external
- filteredRows: 3
- filteredNextRows: 3
- filteredNextRowRefs: 4
- phoneRows: 1
- externalAccountRows: 2
- safeExternalRows: 0
- cannotClaimRows: 3

## Filters

- platform: wechat
- kind: all
- status: all
- issueId: all
- nextOnly: true
- freshnessOnly: false

## Local Gates Before External Collection

- Application preflight: pnpm --silent -C inkforge style-proof:application-preflight --json
- Application acceptance: pnpm --silent -C inkforge style-proof:application-acceptance --json
- WeChat style samples: pnpm --silent -C inkforge style-proof:wechat-style-samples --json
- Strict release boundary: pnpm --silent -C inkforge style-proof:release-preflight --json

Only collect external proof after application-ready, application-acceptance-ready, and wechat-style-samples-ready are all true.
The strict release boundary must still report blocked-by-external with canClaimComplete=false until real phone/account proof is merged.

## Intake Commands After Real Proof Exists

- Draft pack: pnpm --silent -C inkforge style-proof:wechat-manual-manifest-drafts
- Intake: pnpm --silent -C inkforge style-proof:manifest-intake --file REDACTED_MANIFEST.json --json
- Merge preview: pnpm --silent -C inkforge style-proof:manifest-merge --file REDACTED_MANIFEST.json --json
- Release check: pnpm --silent -C inkforge style-proof:release-preflight --json

## Rows To Collect

### 1. wechat / cover-thumbnail-check

- status: blocked-by-external
- gate: phone-preview
- boundary: phone-preview
- cannotClaim: true
- issueIds: style-proof-manifest-requirement-missing
- blockerKinds: phone-preview
- choiceIds: wechat-card-rich, wechat-carousel-switch, wechat-classic-inline, wechat-click-reveal, wechat-cover-seal-divider, wechat-flagship-amber, wechat-flagship-kiln, wechat-flagship-kiln-paste-safe, wechat-flagship-tempera, wechat-market-svg-h5-fallback-matrix, wechat-mobile-only-effect, wechat-plugin-transfer-checklist, wechat-quiet-editorial, wechat-sync-draft-checklist, wechat-toolbar-parameter-map
- nextOperatorAction: Use the target phone preview for readback, screenshots, Dark Mode, cover thumbnail, and interaction checks; PC DOM proof is not enough.

Required proof values:
- channels: phone-preview
- actions: cover-thumbnail-check
- readbacks: phone, visual, visual-and-dom, screenshot
- requiredFields: artifactFingerprint, exactArtifact, coverThumbnailAccepted, collectedAt, safeForCommit
- forbiddenFields: phonePreviewBlocked
- maxFreshnessDays: none

Artifact draft fields to fill only after real external proof:
- requirementId: cover-thumbnail-check
- platform: wechat
- id: <redacted-stable-id>
- kind: <proof-kind>
- label: <redacted-label>
- choiceId: <matching-style-choice-id-or-null>
- channel: <one accepted channel above>
- action: <one accepted action above>
- readback: <one accepted readback above>
- artifactFingerprint: <exact exported artifact fingerprint>
- artifactRef: <redacted reference only>
- exactArtifact: true
- collectedAt: <ISO timestamp>
- safeForCommit: true
- committed: false until merged through manifest tooling
- sensitive: false after redaction review

Success criteria:
- Add at least one StyleProofArtifact with requirementId "cover-thumbnail-check".
- Use channel phone-preview and action cover-thumbnail-check.
- Use readback phone or visual or visual-and-dom or screenshot for the same exact artifact under review.
- Set required artifact fields on one matching row: artifactFingerprint: non-empty fingerprint for the exact artifact; exactArtifact:true for the same exported artifact; coverThumbnailAccepted:true after the exact cover thumbnail is accepted; collectedAt: parseable timestamp within 14 days for external proof rows; safeForCommit:true after redaction and repository hygiene review.
- Capture collectedAt on the same matching proof row at collection time; it must stay parseable, non-future, and within 14 days of validation.
- Do not set forbidden artifact fields: phonePreviewBlocked:true only when phone preview is the recorded blocker; forbidden on matching phone success proof rows.
- The catalog choice must be unblocked before this proof can complete acceptance.

Failure signals:
- Proof is collected from a different platform, style choice, channel, or artifact fingerprint.
- Artifact references contain sensitive account, browser profile, token, QR, HAR, or local credential material.
- Any missing, false, or unbound required field invalidates this row: artifactFingerprint: non-empty fingerprint for the exact artifact; exactArtifact:true for the same exported artifact; coverThumbnailAccepted:true after the exact cover thumbnail is accepted; collectedAt: parseable timestamp within 14 days for external proof rows; safeForCommit:true after redaction and repository hygiene review.
- Missing, timestamp-free, unparseable, future-dated, or older-than-14-days collectedAt invalidates this external proof row.
- Any present forbidden field invalidates this row: phonePreviewBlocked:true only when phone preview is the recorded blocker; forbidden on matching phone success proof rows.
- Current validator issue ids: style-proof-manifest-requirement-missing.
- PC editor DOM, local browser screenshots, scan pages, or setup screens do not prove phone final-article rendering.
- Phone preview scan entries, setup dialogs, PC preview shells, relogin pages, and generic QR screens are blocker evidence until the exact article body is visible on the phone.
- Cover crop panels, cover-setting screens, or upload dialogs do not prove the exact cover thumbnail was accepted in a phone share, preview entry, or platform list entry.

Never include:
- raw account session material
- credential browser storage
- local browser-runtime directories
- network archive files
- QR payload contents
- third-party material URLs
- unredacted draft or publish URLs
- local capture file references

### 2. wechat / authenticated-editor-url

- status: invalid
- gate: authenticated-pc-editor
- boundary: authenticated-pc-editor
- cannotClaim: true
- issueIds: style-proof-manifest-proof-stale
- blockerKinds: external-dependency, mutating-platform
- choiceIds: wechat-card-rich, wechat-classic-inline, wechat-cover-seal-divider, wechat-flagship-amber, wechat-flagship-kiln, wechat-flagship-kiln-paste-safe, wechat-flagship-tempera, wechat-quiet-editorial, wechat-toolbar-parameter-map
- nextOperatorAction: Recapture authenticated editor URL for the exact artifact and attach one matching proof row with collectedAt within 14 days; do not reuse stale, future-dated, or timestamp-free external proof.

Required proof values:
- channels: platform-editor
- actions: authenticated-editor-opened
- readbacks: dom, visual, visual-and-dom
- requiredFields: authenticatedSessionVerified, platformEditorTargetVerified, collectedAt, safeForCommit
- forbiddenFields: none
- maxFreshnessDays: none

Artifact draft fields to fill only after real external proof:
- requirementId: authenticated-editor-url
- platform: wechat
- id: <redacted-stable-id>
- kind: <proof-kind>
- label: <redacted-label>
- choiceId: <matching-style-choice-id-or-null>
- channel: <one accepted channel above>
- action: <one accepted action above>
- readback: <one accepted readback above>
- artifactFingerprint: <exact exported artifact fingerprint>
- artifactRef: <redacted reference only>
- exactArtifact: true
- collectedAt: <ISO timestamp>
- safeForCommit: true
- committed: false until merged through manifest tooling
- sensitive: false after redaction review

Success criteria:
- Add at least one StyleProofArtifact with requirementId "authenticated-editor-url".
- Use channel platform-editor and action authenticated-editor-opened.
- Use readback dom or visual or visual-and-dom for the same exact artifact under review.
- Set required artifact fields on one matching row: authenticatedSessionVerified:true for the same authenticated editor session; platformEditorTargetVerified:true for the intended editor route and target; collectedAt: parseable timestamp within 14 days for external proof rows; safeForCommit:true after redaction and repository hygiene review.
- Capture collectedAt on the same matching proof row at collection time; it must stay parseable, non-future, and within 14 days of validation.

Failure signals:
- Proof is collected from a different platform, style choice, channel, or artifact fingerprint.
- Artifact references contain sensitive account, browser profile, token, QR, HAR, or local credential material.
- Any missing, false, or unbound required field invalidates this row: authenticatedSessionVerified:true for the same authenticated editor session; platformEditorTargetVerified:true for the intended editor route and target; collectedAt: parseable timestamp within 14 days for external proof rows; safeForCommit:true after redaction and repository hygiene review.
- Missing, timestamp-free, unparseable, future-dated, or older-than-14-days collectedAt invalidates this external proof row.
- Current validator issue ids: style-proof-manifest-proof-stale.
- Current freshness issue ids: style-proof-manifest-proof-stale.
- Request success alone is insufficient; the created draft, preview, or published result must be read back.

Never include:
- raw account session material
- credential browser storage
- local browser-runtime directories
- network archive files
- QR payload contents
- third-party material URLs
- unredacted draft or publish URLs
- local capture file references

### 3. wechat / credentialed-channel-response

- status: unsafe-to-automate
- gate: credentialed-channel
- boundary: credentialed-channel
- cannotClaim: true
- issueIds: style-proof-manifest-requirement-missing
- blockerKinds: external-dependency, unsafe-to-automate, mutating-platform
- choiceIds: wechat-h5-design-boundary, wechat-official-widget-checklist, wechat-plugin-transfer-checklist, wechat-sync-draft-checklist
- nextOperatorAction: Use a real credentialed sync, plugin, upload, or API channel and read back the created draft/material; login or sign-in pages must stay blocked evidence.

Required proof values:
- channels: credentialed-channel
- actions: credentialed-sync
- readbacks: api-response
- requiredFields: artifactFingerprint, exactArtifact, externalAccountAuthenticated, collectedAt, safeForCommit
- forbiddenFields: externalAccountLoginBlocked
- maxFreshnessDays: none

Artifact draft fields to fill only after real external proof:
- requirementId: credentialed-channel-response
- platform: wechat
- id: <redacted-stable-id>
- kind: <proof-kind>
- label: <redacted-label>
- choiceId: <matching-style-choice-id-or-null>
- channel: <one accepted channel above>
- action: <one accepted action above>
- readback: <one accepted readback above>
- artifactFingerprint: <exact exported artifact fingerprint>
- artifactRef: <redacted reference only>
- exactArtifact: true
- collectedAt: <ISO timestamp>
- safeForCommit: true
- committed: false until merged through manifest tooling
- sensitive: false after redaction review

Success criteria:
- Add at least one StyleProofArtifact with requirementId "credentialed-channel-response".
- Use channel credentialed-channel and action credentialed-sync.
- Use readback api-response for the same exact artifact under review.
- Set required artifact fields on one matching row: artifactFingerprint: non-empty fingerprint for the exact artifact; exactArtifact:true for the same exported artifact; externalAccountAuthenticated:true for the required platform account; collectedAt: parseable timestamp within 14 days for external proof rows; safeForCommit:true after redaction and repository hygiene review.
- Capture collectedAt on the same matching proof row at collection time; it must stay parseable, non-future, and within 14 days of validation.
- Do not set forbidden artifact fields: externalAccountLoginBlocked:true only when login is the recorded blocker; forbidden on matching credentialed or publish success proof rows.
- The catalog choice must be unblocked before this proof can complete acceptance.

Failure signals:
- Proof is collected from a different platform, style choice, channel, or artifact fingerprint.
- Artifact references contain sensitive account, browser profile, token, QR, HAR, or local credential material.
- Any missing, false, or unbound required field invalidates this row: artifactFingerprint: non-empty fingerprint for the exact artifact; exactArtifact:true for the same exported artifact; externalAccountAuthenticated:true for the required platform account; collectedAt: parseable timestamp within 14 days for external proof rows; safeForCommit:true after redaction and repository hygiene review.
- Missing, timestamp-free, unparseable, future-dated, or older-than-14-days collectedAt invalidates this external proof row.
- Any present forbidden field invalidates this row: externalAccountLoginBlocked:true only when login is the recorded blocker; forbidden on matching credentialed or publish success proof rows.
- Current validator issue ids: style-proof-manifest-requirement-missing.
- Credentialed account responses, upload responses, draft ids, or material readbacks for a different artifact cannot prove this exported artifact was synced.
- Request success alone is insufficient; the created draft, preview, or published result must be read back.

Never include:
- raw account session material
- credential browser storage
- local browser-runtime directories
- network archive files
- QR payload contents
- third-party material URLs
- unredacted draft or publish URLs
- local capture file references
