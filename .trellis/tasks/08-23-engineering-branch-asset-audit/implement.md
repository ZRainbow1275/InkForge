# Implementation plan

本文件是用户已批准的执行顺序。批准覆盖各阶段列出的提交、合并、普通推送与精确清理动作，但不覆盖 force-push、历史改写或跳过退出条件。

## Phase 0 — Audit baseline（本轮已完成）

- [x] 核对外层/嵌套 Git 根、remote、refs、worktree、submodule 与 Git 操作状态。
- [x] 核对本地/远端分支的 tip、ahead/behind、包含关系、独有提交与 PR。
- [x] 对账创建任务前 `355` 项和创建后 `356` 项普通 dirty 状态。
- [x] 展开并分类 tracked/untracked 文件、体积、重复资产与敏感风险候选。
- [x] 全文核对创建任务前的 14 个活动 Trellis PRD，并建立 relatedFiles 重叠证据。

## Phase 1 — Independent preservation package（已完成）

此阶段只在独立备份位置生成保全材料，不删除、移动或提交原工作树资产。至少一份完整 payload 必须位于不同故障域，不能只复制到同一 `D:` 盘的另一个目录。

1. 先停止其他会访问这两个 Git object database 的 agent/process，建立排他 quiescence 窗口；记录 index/ref/object 基线。
2. 立即为 `59feabcd...`、`ca59620...` 建立两个完整 hash 对应的 preservation refs，避免 unreachable objects 被自动维护清除。
3. 定义不可变源快照 `S0`：记录时间、外/内 HEAD、refs、index hash、普通/展开 status、NUL-safe path list、mode、size 和 SHA-256；后续 bundle/manifest/archive 归入 `S1`，不得递归算回 `S0`。
4. 建立 source–destination ledger，记录每个 `S0` 资产的目标 commit/archive、恢复命令和验证状态。
5. 为外层所有本地/remote-tracking refs 生成 bundle 与 refs manifest，覆盖 625 个 upstream 未推送提交、三个旧 feature 独有提交和 `origin/main` 唯一提交。
6. 为四个 dirty worktree 保存真实 payload：tracked 变更生成绑定准确 base HEAD 的 `git diff --binary --full-index`，并同时保存完整文件归档；untracked 保存文件本体，不以 manifest/hash 代替内容。路径清单必须 NUL-safe，并保存 mode/size/hash。
7. 在嵌套仓库 `.git` 之外的独立位置生成 WIP bundle、refs manifest、每个 WIP 的可读 patch 和恢复说明；bundle 不得写入 `inkforge/.git/**`。
8. 在隔离目录对两个 bundle 做 verify、clone/fetch、checkout，并逐文件比对 path、mode、size、hash 和数量；二进制 patch 也要做实际恢复演练。
9. 使用正式 secret scanner 覆盖所有待合入 refs/history、四个 worktree、解包后的嵌套 WIP 和所有 archive 候选；对 log/JSONL/MHTML/SQLite 做结构化检查，对图片做 OCR 加高风险人工复核。若工具不可用或存在未处置候选，后续 commit/push gate 为 `blocked`。

退出条件：每类资产都能从独立备份恢复；原工作树文件未改变。嵌套仓库只新增明确的 preservation refs，不删除任何对象或 `.git`。

状态：两份跨物理盘 S0 的 46 个 artifact hash 相等，bundle/payload/binary patch/WIP patch 恢复演练通过；正式 Gitleaks、结构化不透明文件扫描、717 张图片 OCR 与高风险截图人工复核已完成。历史中的真实 bearer 已轮换并撤销，未把其值写入报告。

## Phase 2 — Commit the full working snapshot（已完成）

用户已决定把当前 Git 可见的全量 tracked/untracked 快照纳入最终 `main`。先在当前 `dev/visual-fixes` 临时集成线上分批提交，再做任何历史合并。

1. 将已验证的嵌套 WIP bundle/manifest/patch 从独立保全位置复制到 `.git` 之外、按来源命名的仓库 archive 路径，作为 `S1` 增量。
2. 将两个 feature worktree 的 `.agent-log` / `.session-id` 复制到按 branch 命名的 archive 路径，保留 size/hash/original-path manifest；各自的 `03-31-*` task 目录按原 Trellis 路径纳入。
3. 按 exact path 分批 stage/commit，禁止 `git add .`：
   - Trellis/Claude 模板与规范；
   - Trellis task 原文与证据；
   - 产品源码、测试与 Tauri；
   - 文档、prompts 与研究材料；
   - 实验、截图、日志、DB、probe、重复证据及其他可再生产物。
4. 当前 12 个 tracked deletion 作为删除变更单独复核并记录；旧内容继续由历史保留，不擅自复活。
5. 人工确认三个 quoted test literal：`configuration.test.ts`、`settings.ai.test.ts`、`editor-settings.spec.cjs`。若为真实 secret，先撤销/轮换，只进入加密保全包，不进入 Git。
6. 每批提交前后复核 ledger、diff、file count/hash，并运行该批最小相关检查。

退出条件：主工作树和三个外部 worktree 的所有审计可见资产都有唯一目标；临时集成线 clean；每个提交可独立审查和恢复。

状态：1,148 个规划路径已按 84/435/154/184/139/140/12 七批 exact path 提交；嵌套 WIP、两个 feature worktree 的 task/session 资产和 12 个 deletion 均有唯一目标。验证发现 full Vitest 会重写 11 个历史 fidelity evidence 文件，已从 S0 恢复原始字节；另两个为通过 whitespace check 曾被语义等价调整的既有文档，也已从 S0 精确恢复。S0 的 1,123 个 manifest entry 中 1,115 个逐字节相等，剩余 8 个仅为本审计任务自身的实施更新。

## Phase 3 — Integrate all histories（已完成）

1. 执行前重新 fetch 并读取远端 `main` hash；若它不再是审计过的 `7640cae...`，停止并重新审计，不在移动目标上继续。
2. 正常合并锁定后的 `origin/main`，保留其 `7640cae`、Trellis 文件和 `server/data`；冲突按全量范围做最小解析。
3. 对 `e2fc8aa3388ecef3507ce1bdcf0ffcb0566b5abb`、`dadfdedc26a9e7d0149dc6c3387f5013eb6e23db`、`9ac2fb48cb89d308c9ea98c4ae2edd64a36bc968` 分别执行 `git merge --no-ff -s ours <exact-tip>`；这里必须是 `-s ours` merge strategy，不得用普通 merge 或 `-X ours`。每次合并前后断言 `HEAD^{tree}` 完全相同。
4. 用 `git merge-base --is-ancestor` 验证 `origin/main`、三个旧 feature tip 和已包含的 local feature/codex tip 都是最终 integration tip 的祖先。

历史约束：保留当前 HEAD 的全部 711 个祖先提交，其中 707 个为 `origin/main..dev/visual-fixes` 独有提交；不 squash、不 rebase 改写、不 force-push。

嵌套 WIP 约束：WIP objects 通过已验证 bundle/manifest/patch 保存，不把 5 月旧源码应用到最终工作树。

退出条件：integration tip 同时包含全部确认历史与全量快照，工作树 clean，所有 tree/ancestry 断言通过。

状态：锁定并重新核对 `origin/main=7640cae929ac48240f4877cb081d9ef4790a24fe` 后，以双亲 merge commit `ed4c2ca217a466eec7fa1e51b20b815dc177a2b7` 纳入其 20 个独有路径；冲突的 `start.py` 与远端 blob `42726b952a0610a197bb16772cff07246da7a715` 完全一致。随后三个 `-s ours` ancestry merge 分别生成 `cbe6e161...`、`75b2f287...`、`06160e0b...`，每次 tree 均保持 `ef215a1c7686fd2aacb0a7168bb342aef1380968` 不变。最终 integration tip 为 `06160e0b8f23d7f24e0e2870fc89040d5567569a`；全部本地、remote-tracking、feature/codex 来源 tip 的 ancestry 断言通过，工作树 clean。

## Phase 4 — Validate and fast-forward `main`（已完成）

1. 运行相关目标测试、typecheck、lint/build、Tauri/真实运行验证和最终 diff 审查。
2. 对 integration tip 的完整 history 再跑 secret scan；对 Git object database 跑 `git fsck`；再次恢复验证两套 bundle。
3. 在 clean worktree 中切到本地 `main`，执行 `git merge --ff-only <integration-tip>`；若不能 ff-only，立即停止。
4. 再次读取远端 `main` hash并确认未发生 race，完成 pack/remote size preflight 后普通 push；禁止 `--force` 和 `--force-with-lease`。随后用 `git ls-remote` 对账远端 hash。
5. 保留全部旧 refs、worktree 和嵌套 `.git`，直到远端 hash、恢复演练、自动检查和用户验收全部通过。

退出条件：本地/远端 `main` 同 tip，包含完整历史和全量快照；无 force-push；用户确认主线可用。

状态：恢复演练、Git object 检查、Gitleaks、Vitest `2156/2156`、typecheck、readonly ESLint、Web build、Rust `fmt/check/test`、Tauri MSI/NSIS bundle、隔离原生进程 smoke 和无扩展 Playwright UI smoke 已完成。测试/构建产生的 exact tracked 副作用均恢复为提交字节。保守 non-thin pack preflight 通过；本地 `main` 已 fast-forward 至已验证产品 tip `732b4791df4bdfc6b5067fd6c38b127b2629e83c`。远端竞态门确认 `origin/main` 仍为锁定的 `7640cae929ac48240f4877cb081d9ef4790a24fe` 后执行普通 push，随后以 docs-only 回执提交收敛到 `fd37133abe2f5743b2e549130f4b741815ecec7b`。本地、tracking ref 与 `git ls-remote` 回读一致。用户明确以本任务验证证据为验收依据并要求继续，产品验收门通过。

## Phase 5 — Retire duplicate Git topology（执行中）

1. 确认嵌套 WIP bundle 已同时存在于远端 `main` 和独立备份，并再次验证恢复。
2. 解析并验证精确目标 `D:/Desktop/Inkforge/inkforge/.git` 后才移除它；外层 `D:/Desktop/Inkforge/.git` 绝不触碰。随后断言产品文件 hash 和外层 status 没有意外变化。
3. 把四个 worktree 逐个变干净并验证内容已进入 `main`，再逐个移除。
4. 核对 PR 是否因 ancestry 合入而自动完成；仍 open 的逐个关闭。
5. 按 exact ref 清单删除除 `main` 外的本地和远端开发分支；本地只用安全的 `git branch -d`，不得 `-D`。每次删除后验证 `main` hash/ancestry 和 remote refs。

退出条件：唯一长期分支为 `main`；只有外层 Git 根；无 linked worktree 遗留；全部保全材料仍可恢复。

状态：删除前门已通过。两份 S0 的 46 个 artifact 已重新逐项校验；repository-side nested bundle 与远端 Git blob 一致，并已在隔离仓库重新 fetch、核对 `59feabcd...` / `ca59620...`、执行 `fsck`。三个 linked worktree 的全部 dirty/untracked 内容已逐项映射到 `main` 或 repository archive；PR #1–#4 已因 ancestry 集成显示为 `MERGED`。

## Phase 6 — Task and filesystem convergence（后续独立小任务）

1. 以 `08-02-rendering-editor-wechat-design-system-parent` 为候选集成入口，逐项处理 active task 的 `continue / child-evidence / archive-candidate / blocked` 状态。
2. 对四个无 `task.json` 的顶层目录分别决定补任务元数据、迁入证据来源或归档；空目录若要在 Git 保留需显式 `.gitkeep` 决策，不批量删除。
3. 根 legacy `src/`、manifest/lockfile、异常文件名、重复证据、未来 ignore 与仓库瘦身分别开小任务处理。
4. 本轮保留的 runtime/log/screenshot/probe/DB/重复证据不在主线收拢阶段删除。

## Validation

- 每阶段前后重跑 `git status --porcelain=v2 --branch` 和 refs/worktree 清单。
- 分支动作前后比较 commit/tree hash、ancestry 与 `git fsck`。
- 代码批次按项目规范运行目标测试、typecheck/lint/build 与真实运行证据。
- 实际代码 diff 完成后运行 GitNexus `detect_changes`；以实时 Git diff、测试和运行证据为最终判断。
