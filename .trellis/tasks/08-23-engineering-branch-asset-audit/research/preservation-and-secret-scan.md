# Preservation and secret-scan receipt

## Preservation result

- Source snapshot: outer `dev/visual-fixes` at `5759d925035a0303e2e50c944d434c38ac13f462`; nested `main` at `145ee02556c3ee284414cbf48dd402ad14cd0728`.
- Nested preservation refs: `59feabcd3c6538bb984d3d4ce7577fabfb19a88f` and `ca59620b45da1fe0c35184335545d345652c97e2`.
- Verified S0 copies:
  - `E:/codex-session-backups/Inkforge/2026-08-23-engineering-branch-asset-audit/S0`
  - `C:/Users/HP/OneDrive/CodexBackups/Inkforge/2026-08-23-engineering-branch-asset-audit/S0`
- Source `D:` is on physical Disk0; both S0 destinations are on physical Disk1. OneDrive was not running, so cloud replication is unverified.
- Each copy contains 46 artifacts and `322294033` bytes. Both artifact manifests have SHA-256 `15fc5e5e5594748b4d156c6628a655635fe5c110411284a5c418f6c22c28d711`.
- Bundle fetch/checkout, index-only binary patch application, WIP patch application and path/mode/size/SHA-256 payload comparison all passed.
- Repository archive `audit/engineering-state-2026-08-23/` contains the nested bundle/refs/WIP patches and the two feature worktrees' namespaced session/task assets. No `.mcp.json`, Git internals, browser profile or active credential was copied into the repository.

## Secret-scan result

- Official Gitleaks 8.30.1 was checksum-verified and run with stock defaults, full-history mode where applicable and `--redact=100`.
- One real local Grok bearer was found in two old outer-history occurrences and in ignored feature-worktree `.mcp.json` copies. The same commits were already ancestors of `origin/main`; the current tree does not contain `.mcp.json`.
- Before any commit, the bearer was rotated using a dual-key transition, eight local consumers were updated, the service was restarted, and the old key was revoked. Final probes: unauthenticated `401`, revoked key `403`, replacement key `200`. No key value appears in this receipt.
- The remaining current-tree findings are 34 GitNexus SHA-256 content hashes and two MHTML false positives. The three quoted credential-like test literals are low-entropy synthetic fixtures; focused checks passed.
- Structured scans covered 184 JSONL files, 113 log/session/HAR candidates and one SQLite database; no provider key, authorization header, Cookie or credential assignment was found. Four UIA JSONL files contain one parse boundary each but had no risk hit.
- OCR covered all 717 Git-visible image paths, deduplicated to 658 SHA-256 contents and 36,664 recognized text boxes. Four shards returned 0 candidate groups and 0 errors. Six high-risk screenshots were also inspected at original resolution; they show empty fields or explicit example fixtures only.

## Gate decision

The pre-commit secret gate passes with one explicitly documented historical exception: the old bearer remains recoverable from preserved/published history but is revoked. No active secret may enter new commits. Gitleaks is rerun against the final staged/current snapshot before integration and again against the integration history before push.
