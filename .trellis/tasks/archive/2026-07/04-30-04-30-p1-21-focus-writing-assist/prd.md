# P1 Focus Writing Assist Baseline PRD

> Date: 2026-04-30
> Source spec: `prompts/0420/specs/21-focus-writing-assist-spec.md`
> Delivery mode: compatible baseline, no mock data, no emoji glyphs, no deletion of existing editor behavior

## Objective

Deliver a real vertical slice of Spec 21 focused writing assistance while preserving the existing InkForge editor architecture. The baseline must extend the already implemented Focus Mode and Typewriter Mode with a persistent writing-assist state layer, real session statistics, Pomodoro timing, ambient sound playback, and a focus-session exit summary.

## In Scope

- Keep current `WorkstationView` focus mode behavior and layout-restore contract intact.
- Add a typed Pinia writing-assist store for focus session metadata, vignette preferences, Pomodoro state, ambient sound state, WPM sampling, and last focus summary.
- Reuse existing `settings.writingGoal` and `settings.editor.typewriterMode` instead of introducing a conflicting goal model.
- Add a real Workstation-side writing assistant panel using current document words and persisted article window statistics.
- Add focus-session summary on exit with duration, net new words, and daily-goal progress.
- Add Pomodoro controls that run on real timers and survive ordinary UI re-rendering.
- Add ambient sound playback through browser Web Audio generated sound profiles, not fake UI state and not missing asset placeholders.
- Keep focus mode visual-only: `Ctrl+S`, slash commands, floating toolbar, autosave, and editor keyboard handling remain available.
- Update docs/spec evidence for the compatible baseline and known pending full-spec requirements.

## Out of Scope For This Baseline

- Full Tauri desktop notification integration for Pomodoro completion.
- External ambient audio asset packaging under `src-tauri/assets/audio/`.
- Dedicated `Settings > Writing` tab split; current project keeps writing goal under `Settings > Editor`.
- Full command palette integration; Spec 22 owns the dedicated palette implementation.
- SplitView conflict enforcement beyond preserving the current no-split workstation baseline.

## Acceptance Criteria

- Focus mode entry records `startedAt`, `startWordCount`, and daily goal progress before the session.
- Focus mode exit records and displays a non-emoji `FocusSessionSummary` with duration, words added, before/after goal percentage, and goal-achieved state.
- Writing assistant panel shows current document words, today words, weekly words, WPM, estimated minutes to document goal, Pomodoro display, and ambient sound controls from real state.
- Pomodoro start/pause/reset/skip changes real countdown state and completed Pomodoro count without mock timers.
- Ambient sound controls call a real Web Audio service; unsupported browser or playback errors surface as typed error state.
- Typewriter mode continues to use existing editor extension and user settings.
- Vignette preference changes the focus-mode visual layer without disabling editor interactions.
- `pnpm exec vue-tsc --noEmit` passes for the touched app.
- Emoji presentation scan over touched files finds no Unicode emoji glyphs.

## Verification Plan

1. Run TypeScript checking for the nested app.
2. Run ESLint in quiet mode for touched frontend files if typecheck succeeds.
3. Run a targeted no-emoji scan over new/modified writing-assist files and docs.
4. Use GitNexus `detect_changes` to confirm changed execution scope is expected despite known historical worktree noise.
