# Migration Task: Upgrade to v0.3.0

**Created**: 2026-02-28
**From Version**: 0.3.0-beta.16
**To Version**: 0.3.0
**Assignee**: name=ZRainbow1275
initialized_at=2026-02-20T23:05:48.093525

## Status

- [ ] Review migration guide
- [ ] Update custom files
- [ ] Run `trellis update --migrate`
- [ ] Test workflows

---

## v0.3.0 Migration Guide

# Migration Guide: v0.2.x → v0.3.0

## Overview

All shell scripts (.sh) have been replaced by Python scripts (.py). This affects any custom workflows, slash commands, or documentation that references the old scripts.

## Requirements

- Python 3.10 or higher

## What Changed

### Script Extensions

| Old Path | New Path |
|----------|----------|
| `.trellis/scripts/*.sh` | `.trellis/scripts/*.py` |
| `.trellis/scripts/common/*.sh` | `.trellis/scripts/common/*.py` |
| `.trellis/scripts/multi-agent/*.sh` | `.trellis/scripts/multi_agent/*.py` |

### Directory Rename

| Old | New |
|-----|-----|
| `multi-agent/` (hyphen) | `multi_agent/` (underscore) |

### Invocation Change

| Old | New |
|-----|-----|
| `./script.sh` | `python3 ./script.py` |
| `./.trellis/scripts/task.sh` | `python3 ./.trellis/scripts/task.py` |

## After Migration

Run `trellis update --migrate` to remove the old shell scripts from your project.

### AI Assistant Instructions

When helping with this migration:

When assisting users upgrading from 0.2.x to 0.3.0:
1. Search for files containing `.trellis/scripts/*.sh` references and update to `.py`
2. Replace `multi-agent/` directory references with `multi_agent/` (underscore)
3. Always use `python3` explicitly, not just `python` (Windows compatibility)
4. Check ALL locations: docstrings, help text, error messages, markdown docs
5. Run `trellis update --migrate` to remove legacy shell scripts

Note: Users upgrading from any 0.3.0 prerelease (beta/rc) need no file changes — only the version stamp is updated.

---

## Closeout evidence - 2026-07-05

This migration task is closed as superseded and satisfied by the current Trellis runtime state:

- `.trellis/.version` is `0.6.5`, which is newer than this task's target migration version.
- `.trellis/scripts/task.py` and `.trellis/scripts/get_context.py` exist.
- No `.sh` files remain under `.trellis/scripts/`.
- `.trellis/scripts/multi-agent/` does not exist.
- Legacy unprefixed Codex skill directories checked for this migration are absent.
- Current Codex Trellis skill directories are present under `.agents/skills/trellis-*`.

No product source code changes are required for this closeout; this is a Trellis housekeeping migration archive only.
