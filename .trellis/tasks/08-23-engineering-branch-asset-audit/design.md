# Design: preservation-first engineering audit

## Objective

在不改变现有开发状态的前提下，把“仓库里到底有什么、属于谁、能否清理”转换为可审查证据和后续决策门。

## Authority order

1. 实时本地 Git refs、object database、index 与 worktree。
2. 实时 GitHub remote refs 和 PR 元数据。
3. 文件系统中的 Git 根、任务目录与实际文件。
4. `.trellis/tasks/*/prd.md`、`task.json` 和已有证据原文。
5. README/ignore/package manifests 对工程入口的声明。

Trellis 摘要、GitNexus 索引和文件名启发式只用于定位；与实时 Git/原文冲突时以后者为准。GitNexus 当前比 HEAD 落后 10 个提交，因此不作为本次分支拓扑的权威。

## Audit model

每个发现记录四项：

- `Evidence`：可重复的命令、ref、hash、路径或原文。
- `Impact`：对丢失、误操作、协作或后续打磨的影响。
- `Confidence`：confirmed / inferred / unverified / blocked。
- `Next gate`：最小可逆动作及其前置条件。

## Safety invariants

- 不顺手改变产品语义；Git refs/history、远端和任务状态只按用户已批准的 `implement.md` exact ref/path 清单改变。
- 不把 untracked、旧分支、旧 PR、嵌套 `.git` 或重复文件等同于垃圾。
- 在可恢复性被实际验证前，不允许删除唯一对象、dirty worktree 或任务证据。
- 不输出 secret 值、数据库内容、Cookie、认证头或浏览器状态。
- 三个 quoted credential test literal 未完成确认前，禁止进入 staged/commit；若为真实值，先撤销/轮换并只保留无效测试 fixture。
- 普通 fast-forward 会把全部历史推到 `main`；因此 secret gate 必须覆盖所有待合入 refs/history，而不只扫描当前工作树。若历史中存在有效 secret，先轮换并重新提交处理方案，不能把“保留历史”当成继续暴露的理由。
- manifest/hash 不是备份 payload；tracked 二进制变更、untracked 文件、bundle 内对象和不透明日志/图片/DB 都必须有真实内容副本、跨故障域副本和恢复演练。
- 定义 `S0` 源快照与 `S1` 保全产物，禁止 manifest/archive 递归纳入自己的源清单；任何未解释的状态漂移都重新建立 baseline。

## Decision gates

1. **Canonical line（已确认）**：最终只维护 `main`；当前 `dev/visual-fixes` 仅作为临时集成载体和保全来源。
2. **Preservation（已批准，执行中）**：生成两份独立 S0，并实际验证恢复。
3. **Semantic salvage**：审查 `origin/main` 唯一提交、三个旧 feature 独有提交和两个嵌套 WIP。
4. **Task authority**：确认 `08-02` parent 是否作为当前集成入口。
5. **Full snapshot（已确认）**：当前 Git 可见的全量文件进入 `main`，包括运行/证据产物；Git internals、ignored caches、浏览器状态和真实 secrets 除外。
6. **History form（已确认）**：保留当前 HEAD 的全部 711 个祖先提交，其中 707 个为 `origin/main..dev/visual-fixes` 独有提交；集成 `origin/main` 后普通 fast-forward，禁止 squash/force-push。
7. **Legacy branch semantics（已确认）**：旧 feature ancestry 进入主线，冲突和最终工作树以当前代码为准。
8. **Nested WIP semantics（已确认）**：两个唯一 WIP 以 bundle/manifest/patch 保存，不覆盖当前源码。

## Deliverable boundary

用户已批准完整实施。全量快照仍拆成 exact-path 小批提交；任何清理都排在远端 `main`、恢复演练、自动检查和用户验收之后，不因授权而压缩证据门禁。
