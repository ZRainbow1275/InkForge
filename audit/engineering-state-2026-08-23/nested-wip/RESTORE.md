# Nested WIP restore

```bash
git init <restore-dir>
git -C <restore-dir> fetch ./nested.bundle '+refs/*:refs/*'
git -C <restore-dir> fsck --full
git -C <restore-dir> rev-parse refs/preserve/engineering-audit/wip-2026-05-07
git -C <restore-dir> rev-parse refs/preserve/engineering-audit/wip-2026-05-26
```

Expected commits are recorded in `manifest.json`; each readable patch was restore-tested against its recorded parent tree before this archive was created.
