# 0503 UI/UX Manual Test Ledger

## Scope

This ledger records the real browser manual and assisted UI/UX verification for the Inkforge `prompts/0420` development stage.

The target runtime is the nested frontend app at `inkforge/`, served through Vite on `http://127.0.0.1:3005/` unless a live port check proves otherwise.

## Rules

- Use real app navigation and real browser state.
- Do not inject mock rows, fake endpoint responses, fake localStorage success states, or simulated publish results.
- Record defects before fixing them.
- Preserve existing modules and product style; do not delete existing features.
- User-facing icons must come from the installed icon library, not Emoji.
- Every fixed issue must be re-tested through browser interaction and code gates where applicable.

## Page Groups

- Hub and creation entry points
- Workstation editor, preview, source, layout, tabs, command palette, citation and markdown extensions
- Drafts and document lifecycle management
- Publish and export preview paths
- Settings, profiles, sync, custom CSS, updater, extensions and diagnostics
- Themes and visual system
- Account welcome and local profile boundary
- Help and FTUE surfaces
- NotFound and compatibility redirects
- Desktop and narrow mobile viewport checks

## Severity

- P0: page cannot load, white screen, route crash, save/data-loss risk, or blocking console exception.
- P1: core workflow fails, persisted state is wrong, export/preview is incorrect, or an advertised control is non-functional.
- P2: visual overlap, unclear state, responsive defect, accessibility/usability issue, or polish gap that does not block the core workflow.

## Verification Loop

1. Read specs and current route/page structure.
2. Start or reuse the dev server.
3. Run browser smoke on each page and collect console/page errors.
4. Record findings in `findings.md` before code changes.
5. Run impact analysis for code symbols that need modification.
6. Fix grouped issues without deleting existing features.
7. Re-run browser checks and code gates.
8. Mark findings fixed only after re-test evidence is recorded.