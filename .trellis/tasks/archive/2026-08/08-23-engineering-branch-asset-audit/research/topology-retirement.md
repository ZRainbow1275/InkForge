# Git topology retirement receipt

日期：2026-08-23

## Entry gates

- 用户明确以本任务已经完成的自动、恢复、构建和真实运行证据作为验收依据，并要求继续。
- 删除前本地、tracking ref 与 `git ls-remote` 均为 `main=f79cfd1422eba94849f577ef276c31b7bc28658d`，主工作树 clean。
- 两份 S0 的 `46` 个 artifact、`322294033` bytes 已重新逐项核对；manifest SHA-256 均为 `15fc5e5e5594748b4d156c6628a655635fe5c110411284a5c418f6c22c28d711`。
- repository-side nested bundle 与远端 Git blob、两份 S0 的 SHA-256 均为 `567af392c337b08a2c21d91b0c3c30625c54c33a46ed4f6cb0824699e4fad896`。隔离 fetch、两个 WIP exact ref 和 `fsck` 通过。

## Retired topology

1. 精确移除 `D:/Desktop/Inkforge/inkforge/.git`：删除 `293` 个 Git 元数据文件、`961154` bytes。删除后外层 HEAD 保持 `f79cfd1...`，外层 tree 保持 `53586edb34bb3dbba94a25eade8f1781d859f921`，`inkforge` 子树保持 `06fcfe96e4eeb7751db1a443826a4920fb390ee3`，外层 status 仍为 clean。
2. 退役三个 linked worktree：
   - `codex/wechat-baseline-20260821` 的 `Cargo.toml` 仅为 stat/EOL 假脏；filtered blob 与 HEAD 完全一致后执行单文件 exact restore。普通 `git worktree remove` 完成注销，但目录删除被 ignored 依赖/构建缓存阻断；在确认无 `.git`、无 worktree 注册、branch tip 已进入 `main`、S0 payload 为 `0` 后，精确移除旧 worktree 根，删除 `44459` 个残留文件、`3091097636` bytes。
   - `feature/hub-polish-v2` 与 `feature/toolbar-fix-v2` 各 `7` 个 untracked 文件均先按 S0 SHA-256 复核；任务文件已进入 `main`，session/log 已进入 repository archive。随后逐文件 exact unlink，再以普通 `git worktree remove` 一次移除。
3. PR #1–#4 均因 ancestry 集成显示为 `MERGED`，没有额外 close 操作。
4. 仅用安全的 `git branch -d` 删除八条本地开发分支。`dev/visual-fixes` 因陈旧 upstream 阻断 `-d`，先精确解除该 upstream 绑定，再由 `-d` 按当前 `main` 完成合并检查；未使用 `-D`。
5. 五条远端开发分支均在删除前实时核对 exact tip 与 `main` ancestry，再用普通 `git push origin --delete <branch>` 删除并立即回读；未使用 force 或 lease。

## Exit verification

- Git 根：仅 `D:/Desktop/Inkforge/.git`；`inkforge/` 解析到该外层仓库。
- Worktree：仅 `D:/Desktop/Inkforge`。
- Local/remote branch：仅 `main=f79cfd1422eba94849f577ef276c31b7bc28658d`。
- 所有已删 branch tip 仍是 `main` 的祖先；PR #1–#4 仍为 `MERGED`。
- 删除后再次隔离恢复 outer bundle `15` refs、nested bundle `4` refs，两个 WIP ref 精确为 `59feabcd...` 与 `ca59620...`；两者 `fsck` 通过。
- 主工作树 clean，outer Git connectivity check 通过。本阶段没有修改产品代码或产品文件内容。

Phase 6 的 Trellis task/orphan/legacy filesystem 收敛仍按计划作为后续独立小任务处理，不混入本次拓扑退役提交。
