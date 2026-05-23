# Verification Strategy Research

## Purpose

Define the verification strategy for a full-app button, component, and Settings audit. This file is intentionally concise: the executable evidence belongs in `audit-matrix.md`, `evidence.md`, and `findings.md`.

## External References

- Playwright locators and role-based queries: https://playwright.dev/docs/locators
- Playwright assertions: https://playwright.dev/docs/test-assertions
- Playwright screenshots and visual comparisons: https://playwright.dev/docs/test-snapshots
- Playwright trace viewer: https://playwright.dev/docs/trace-viewer

## Relevant Practices

- Prefer user-facing selectors such as role/name where the UI exposes accessible names. This helps verify the same surface a user or assistive technology would operate.
- Use assertions for both positive and negative states: visible, enabled/disabled, selected, checked, text, URL, storage-backed result, and absence of console errors.
- Use screenshots for layout-sensitive route checks, but do not use screenshot existence as proof of behavior. Pair each screenshot with interaction assertions.
- Use traces or structured logs for longer flows such as Settings persistence, Workstation editor actions, publish/export overlays, and command palette routing.
- Treat browser storage as evidence only in read-only mode. Do not seed IndexedDB, localStorage, or sessionStorage to make a workflow appear successful.

## Repo-Specific Strategy

- Start from a static inventory of routes, Settings schema/store paths, component directories, command palette entries, and common controls.
- Enrich the inventory manually with expected product behavior and data boundaries.
- Browser-smoke every production route at desktop and 390px mobile viewports.
- For each Settings item, prove the chain: UI control -> settings store/schema -> persistence/migration -> reload behavior.
- For Workstation/editor flows, use real existing or UI-created local articles.
- For native/Tauri boundaries, Web runtime evidence is not sufficient. Native-dependent workflows must be exercised in the real Tauri desktop shell. Web runtime may still prove that unavailable states are honest, but the native row cannot pass without shell evidence.
- For platform export, import evidence from the existing export audit task, then add any UI-level Publish/Workstation overlay rows that were not covered at service level.

## Proposed Evidence Files

- `audit-matrix.md`: canonical row-by-row inventory and result ledger.
- `findings.md`: defect register with reproduction, cause, fix, and re-test.
- `evidence.md`: commands, browser runtime, screenshots/traces/logs, and storage read-only observations.
- `repair-log.md`: link from code changes to inventory/finding rows.

## Tool Limitations Observed

- Serena MCP calls in this session returned `Session terminated` for initial instructions and project activation. If this persists during implementation, record the failure and compensate with narrower diffs, targeted tests, full lint/type/build, and browser evidence.
- GitNexus impact/detect should still be retried before risky edits and wrap-up. If unavailable, record the exact failure instead of claiming graph coverage.
- If the Tauri shell cannot start or a native capability cannot be safely exercised, the related row is a blocker with command/log evidence, not a pass.
