# Trellis tooling dirty-tree audit

## Goal

Audit and close the remaining dirty tree after the completed export rendering and bootstrap guideline tasks. The work is limited to the Trellis and Claude/Codex tooling surface: classify the existing `.claude/**`, `.agents/**`, `.codex/**`, `.trellis/**`, `AGENTS.md`, and `CLAUDE.md` changes; verify that the current Trellis workflow still runs on this Windows repository; fix only issues discovered during that verification; then commit the resulting toolchain changes in coherent groups.

## What I Already Know

- `python ./.trellis/scripts/task.py current --source` reports no current task, so this task was created to anchor the remaining dirty-tree work.
- The current branch is `dev/visual-fixes`.
- The dirty tree is large and toolchain-focused: Claude agents/commands/hooks/settings/skills, Trellis workflow/config/scripts, shell-script archive deletion, and root agent documents.
- `.trellis/.template-hashes.json` changed from a flat hash map to a versioned `{"__version": 2, "hashes": ...}` shape and now includes new Trellis meta skill files, Codex platform files, and Python-only Trellis helpers.
- The old `.trellis/scripts-shell-archive/**` shell scripts are deleted in the dirty tree, while Python entrypoints under `.trellis/scripts/**` remain the active runnable path.
- Earlier GitNexus analysis needed `NODE_OPTIONS=--max-old-space-size=4096 npx gitnexus analyze` because a normal analyze hit a tree-sitter allocation failure.

## Requirements

- Preserve user or previous-session work unless it is proven to be part of this toolchain migration and passes verification.
- Do not silently revert dirty files.
- Do not include cache, backup, generated runtime logs, or unrelated app code in commits.
- Classify the dirty tree into explicit groups:
  - Trellis Python runtime and config changes.
  - Claude/Codex/Agents platform integration changes.
  - Shell archive deletion and replacement proof.
  - Root instruction document changes.
  - Task bookkeeping for this audit.
- Verify deleted shell archive commands have current Python or platform replacements where they are still referenced.
- Verify core Trellis CLI flows still work from the real repository:
  - `get_context.py`
  - `get_context.py --mode phase`
  - `get_context.py --mode packages`
  - `task.py current --source`
  - `task.py list`
  - `task.py validate <this task>`
  - `add_session.py --help`
- Run Python syntax checks over the modified Trellis and Claude hook scripts.
- Run `git diff --check`.
- Run GitNexus change detection if available; if it is unavailable, record the exact failure and use CLI status/analyze as the fallback evidence.
- If code fixes are necessary, keep them scoped to the failing toolchain path and document what changed.

## Acceptance Criteria

- [x] A written audit artifact records the dirty-tree classification, risky deletions, replacement evidence, and verification results.
- [x] The current task has a valid `prd.md` and passes `task.py validate`.
- [x] Trellis core commands listed above run successfully or have a documented, task-relevant failure with a fix.
- [x] Modified Python scripts compile with `python -m py_compile` or `compileall`.
- [x] `git diff --check` passes.
- [x] Commit groups are coherent and avoid unrelated dirty files.
- [x] After work commits, GitNexus status/analyze is refreshed with the known heap setting.
- [ ] The task is archived and the session is recorded after successful verification.

## Out of Scope

- App UI, export rendering, front-end lint debt, and feature implementation unrelated to Trellis tooling.
- Reopening the completed `02-26-enhance-export-rendering` or `00-bootstrap-guidelines` tasks.
- Broad cleanup of old planning tasks that happen to be listed by `task.py list`.
- Destructive rollback of existing dirty changes without explicit user instruction.
- Pushing commits to any remote.

## Technical Notes

- Current workspace context was gathered with `python ./.trellis/scripts/get_context.py` and `python ./.trellis/scripts/get_context.py --mode phase`.
- `git diff --stat` currently reports roughly 56 changed tracked files, about 1.8k insertions and 6k deletions before this audit task's own files.
- The new task directory is `.trellis/tasks/05-11-trellis-tooling-dirty-tree-audit/`.
- This project is in Codex inline mode per `.trellis/workflow.md`; Phase 1.3 context jsonl curation is skipped for Codex inline, and Phase 2 should load `trellis-before-dev` before direct implementation.
