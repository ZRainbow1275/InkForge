# Trellis Tooling Dirty-Tree Audit

Date: 2026-05-11
Branch: `dev/visual-fixes`
Task: `.trellis/tasks/05-11-trellis-tooling-dirty-tree-audit`
Work commit: `669ce5d chore(trellis): sync local tooling templates`

## Executive Summary

The remaining dirty tree is a coherent Trellis tooling migration, not product app work. The migration updates local Trellis from the previous mixed shell/Python and `.current-task` model to a Python-first, session-scoped workflow with safer task/archive commits and platform-specific hook behavior.

One real issue was found and fixed during this audit: `session-start.py` could report an already-started `in_progress` task as still blocked in Phase 1.3 when `implement.jsonl` contained only the seed row. That is wrong for activated tasks and especially wrong for Codex inline mode, where JSONL curation is intentionally skipped. The Claude hook and local ignored Codex hook were patched to treat `task.json.status` as the phase authority after `task.py start`.

## Dirty-Tree Classification

### Trellis Python Runtime And Config

Included paths:

- `.trellis/scripts/common/active_task.py`
- `.trellis/scripts/common/safe_commit.py`
- `.trellis/scripts/common/trellis_config.py`
- `.trellis/scripts/common/*.py`
- `.trellis/scripts/task.py`
- `.trellis/scripts/get_context.py`
- `.trellis/scripts/add_session.py`
- `.trellis/scripts/init_developer.py`
- `.trellis/config.yaml`
- `.trellis/.gitignore`
- `.trellis/.version`
- `.trellis/workflow.md`
- `.trellis/.template-hashes.json`

Assessment:

- `active_task.py` introduces session-scoped active task resolution under `.trellis/.runtime/sessions/`.
- `task.py current --source` confirms the current active task is session scoped.
- `safe_commit.py` restricts auto-staging to specific Trellis-owned task/workspace paths and explicitly avoids `git add -f .trellis/`.
- `config.yaml` documents `session_auto_commit` and `codex.dispatch_mode`.
- `.template-hashes.json` moved to a versioned `{"__version": 2, "hashes": ...}` schema.

Risk:

- The new helper files are untracked. They must be included in the Trellis runtime commit; otherwise the modified hooks and scripts will import missing modules.

### Claude Platform Integration

Included paths:

- `.claude/hooks/session-start.py`
- `.claude/hooks/inject-workflow-state.py`
- `.claude/hooks/inject-subagent-context.py`
- `.claude/hooks/statusline.py`
- `.claude/settings.json`
- `.claude/agents/trellis-*.md`
- `.claude/commands/trellis/continue.md`
- `.claude/commands/trellis/finish-work.md`
- `.claude/skills/trellis-before-dev/SKILL.md`
- `.claude/skills/trellis-brainstorm/SKILL.md`
- `.claude/skills/trellis-check/SKILL.md`
- `.claude/skills/trellis-meta/**`

Assessment:

- `session-start.py`, `inject-workflow-state.py`, and `statusline.py` now resolve active tasks via `common.active_task`.
- `inject-subagent-context.py` handles multiple platform Task/Subagent encodings and injects a marker so sub-agents know whether hook context was loaded.
- `trellis-implement` and `trellis-check` agent files now include recursion guards.
- The deleted per-layer Trellis commands are replaced by unified skills and workflow phases.
- The new `trellis-meta` skill is complete in `.claude/skills/trellis-meta/`.

Risk:

- Hook behavior must be verified with real JSON input because these scripts are called by platform hook runtimes, not by normal tests.

### Shell Archive Removal

Included paths:

- `.trellis/scripts-shell-archive/**` deletions.

Assessment:

- The active runnable entrypoints are Python scripts under `.trellis/scripts/`.
- Repository search found no active runtime or settings reference to the deleted shell archive directory or deleted shell command paths.
- Remaining historical references, if any, are in old task artifacts or backup-style documentation and are not current execution paths.

Risk:

- The deletion is high volume but low runtime risk after Python smoke tests pass.

### Root Instruction Documents

Included paths:

- `AGENTS.md`
- `CLAUDE.md`
- `.gitignore`

Assessment:

- `AGENTS.md` now points agents to `.trellis/workflow.md`, `.trellis/spec/`, `.trellis/tasks/`, `.agents/skills/`, and `.codex/agents/`.
- GitNexus stats in `AGENTS.md` and `CLAUDE.md` were updated to the current index scale.
- `.gitignore` now excludes Python cache files, which prevents hook compile checks from polluting the normal dirty tree.

### Ignored Local Platform Files

Included local-only paths:

- `.agents/**`
- `.codex/**`

Assessment:

- Root `.gitignore` intentionally ignores `.agents/` and `.codex/`.
- These files are present locally and are referenced by the Trellis template hash file, but they are not included by normal `git add`.
- The local `.codex/hooks/session-start.py` was patched in-place to match the `in_progress` task-state fix because it affects this machine's Codex sessions.

Commit decision:

- Do not force-add `.agents/` or `.codex/` in this task. They are local helper surfaces by current repository policy.
- Keep the ordinary tracked project surface in commits: `.claude/**`, `.trellis/**`, root docs, and this task's artifacts.

## Fix Applied During Audit

### SessionStart Phase Drift

Problem:

- `session-start.py` checked for curated `implement.jsonl` before honoring `task.json.status`.
- An activated task with `status=in_progress` and seed-only JSONL was incorrectly reported as `PLANNING (Phase 1.3)`.
- This contradicted `inject-workflow-state.py`, which correctly reported `in_progress`.

Fix:

- Treat `task_status == "in_progress"` as Phase 2 / Phase 3 before JSONL readiness checks.
- Treat `task_status == "planning"` with PRD + curated JSONL as `READY_TO_START (Phase 1.4)`, not implementation-ready.
- Surface unknown custom statuses instead of guessing from JSONL alone.
- Apply the same local fix to ignored `.codex/hooks/session-start.py` for this machine's Codex hook runtime.
- Update the relevant hashes in `.trellis/.template-hashes.json`.

## Verification Evidence

Already run successfully:

```bash
python ./.trellis/scripts/task.py current --source
python ./.trellis/scripts/task.py validate .trellis/tasks/05-11-trellis-tooling-dirty-tree-audit
python -m compileall -q .trellis/scripts .claude/hooks
python -m py_compile .codex/hooks/session-start.py .claude/hooks/session-start.py .claude/hooks/inject-workflow-state.py .claude/hooks/inject-subagent-context.py
git diff --check
```

Core command smoke test also succeeded:

```bash
python ./.trellis/scripts/get_context.py
python ./.trellis/scripts/get_context.py --mode phase
python ./.trellis/scripts/get_context.py --mode packages
python ./.trellis/scripts/task.py current --source
python ./.trellis/scripts/task.py list
python ./.trellis/scripts/task.py validate .trellis/tasks/05-11-trellis-tooling-dirty-tree-audit
python ./.trellis/scripts/add_session.py --help
```

Hook smoke tests:

- `.claude/hooks/inject-workflow-state.py` emits valid `UserPromptSubmit` JSON and reports the task as `in_progress`.
- `.claude/hooks/session-start.py` emits valid `SessionStart` JSON and now reports the task as `IN_PROGRESS`.
- `.codex/hooks/session-start.py` emits valid Codex hook JSON and now reports the task as `IN_PROGRESS`.
- `.claude/hooks/inject-subagent-context.py` emits valid `PreToolUse` JSON for `trellis-implement`; with empty JSONL it warns and injects `prd.md` only, which is expected for this audit task.

GitNexus evidence:

- `npx gitnexus status` reports repository `D:\Desktop\Inkforge`, indexed commit `f5bd916`, current commit `f5bd916`, status `up-to-date`.
- `npx gitnexus detect_changes` is not a CLI command in this installed GitNexus version; it exits with `error: unknown command 'detect_changes'`.
- `npx gitnexus impact _get_task_status --repo Inkforge --direction upstream --depth 3` and the matching `context` command both report the symbol is not indexed. The hook files are therefore verified through direct hook smoke tests and Python compilation rather than graph impact.
- After work commit `669ce5d`, `NODE_OPTIONS=--max-old-space-size=4096 npx gitnexus analyze` completed successfully in 23.9s with `10,828 nodes`, `20,440 edges`, `533 clusters`, and `300 flows`.
- Post-analyze `npx gitnexus status` reports indexed commit `669ce5d`, current commit `669ce5d`, status `up-to-date`.

## Final Commit Guardrails

- Avoid committing ignored cache/runtime files:
  - `.trellis/.runtime/`
  - `.trellis/**/__pycache__/`
  - `.claude/**/__pycache__/`
  - `.codex/**/__pycache__/`
  - `.agents/**`
  - `.codex/**`
- Include the untracked Trellis helper modules:
  - `.trellis/scripts/common/active_task.py`
  - `.trellis/scripts/common/safe_commit.py`
  - `.trellis/scripts/common/trellis_config.py`
- Include the untracked Claude `trellis-meta` skill files under `.claude/skills/trellis-meta/**`.
