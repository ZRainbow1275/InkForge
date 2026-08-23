# InkForge 工程资产与分支审计

审计日期：2026-08-23<br>
审计模式：目标为只读、preservation-first；独立复核发生一次已记录的 nested Git metadata side effect<br>
权威范围：本地 Git/文件系统、已配置 GitHub remote/PR、`.trellis/tasks/` 原文<br>

## 1. 结论

InkForge 当前的主要问题并不是“很多分支各自承载大量新开发”，而是五个相互叠加的状态：

1. `dev/visual-fixes` 已成为事实上的开发主线，但有 `625` 个提交未推送到其 upstream，且相对 `origin/main` 为 `ahead 707 / behind 1`。
2. 主工作树同时承载了大规模未提交产品开发、Trellis 工具更新、任务证据和实验资产：普通状态 `356` 项；补齐本规划文档后，展开为 `1122` 个路径。
3. `inkforge/.git` 是一个未声明的旧嵌套仓库，其中仍有两个外层仓库不存在的 WIP snapshot；它看似冗余，实际暂时属于受保护资产。
4. 创建本任务前的 `14` 个活动 Trellis 任务全部未归档，多个任务声明相同文件，且大量任务目录本身从未纳入外层 Git。
5. 根目录同时保留旧 `src/`、旧 `package.json` 和与产品目录相同的 `package-lock.json`，与 README 指定的唯一产品目录 `inkforge/` 冲突，容易从错误目录运行命令。

因此，不能直接做 `git clean`、删分支、删 `inkforge/.git` 或批量归档任务。用户已决定最终只维护 `main`；正确顺序应是：先独立保全，再归属并分批提交全量 dirty 快照，再集成 `origin/main` 与旧 feature ancestry，完整验证后才 fast-forward/push `main`，最后清理重复拓扑与陈旧入口。

## 2. Git 边界

### 2.1 外层仓库

| 项目 | 实时值 |
| --- | --- |
| 根目录 | `D:/Desktop/Inkforge` |
| Git 元数据 | `D:/Desktop/Inkforge/.git` |
| 当前分支 | `dev/visual-fixes` |
| HEAD | `5759d925035a0303e2e50c944d434c38ac13f462` |
| upstream | `origin/dev/visual-fixes` |
| upstream 差异 | `ahead 625 / behind 0` |
| 远端默认分支 | `main` |
| 相对 `origin/main` | `ahead 707 / behind 1` |
| submodule | 无 |
| 暂存内容 | 无 |
| Git 进行中操作 | 无 merge/rebase/cherry-pick/revert/bisect/index lock |
| stash | 无 |

Remote 为私有 GitHub 仓库。`git ls-remote` 已实时核对 remote refs；没有为审计执行 fetch、pull 或任何远端写入。

### 2.2 独立嵌套仓库

`D:/Desktop/Inkforge/inkforge/.git` 是完整、独立的 Git 元数据目录，不是 submodule gitfile。外层仓库又把 `inkforge/*` 当普通文件跟踪，因此同一产品目录被两个对象库解释。

| 项目 | 实时值 |
| --- | --- |
| 当前分支 | `main` |
| HEAD | `145ee02556c3ee284414cbf48dd402ad14cd0728` |
| HEAD 日期 | 2026-01-30 |
| refs | 本地 `main` 与 `origin/main`，均停在同一初始提交 |
| linked worktree | 仅自身 |
| 普通 dirty 状态 | `302`：`71 M`、`3 D`、`228 ??` |
| 展开 dirty 状态 | `674`：`71 M`、`3 D`、`600 ??` |
| staged | `0` |

`git fsck --unreachable --no-reflogs` 还发现四个 unreachable commit：

- `0026742...`、`2850fae...`：index snapshot，内容树与旧初始状态等价。
- `59feabcd...`：2026-05-07 WIP，相对第一父提交为 `65 files / 31229+ / 5190-`。
- `ca59620...`：2026-05-26 WIP，相对第一父提交为 `67 files / 33272+ / 5752-`。

后两个 commit 及 tree 在外层对象库中均不存在。结论：嵌套 `.git` 是结构问题，但删除前必须先为这两个 WIP 建立可验证的保全副本或 refs，并比较它们是否含外层当前状态未覆盖的代码。

嵌套仓库视角的 `600` 个 untracked 路径已逐项与外层索引/工作树对账：`537` 个由外层 Git 跟踪，`63` 个是外层 untracked，未发现第三份仅存在于 nested worktree 的文件。这里的独有资产是 WIP object/history，而不是额外的工作树路径。

## 3. Linked worktree

| 工作树 | 分支 | HEAD | dirty |
| --- | --- | --- | --- |
| `D:/Desktop/Inkforge` | `dev/visual-fixes` | `5759d92` | `356` 个普通状态项 |
| `D:/Desktop/trellis-worktrees/codex/inkforge-wechat-benchmark` | `codex/wechat-baseline-20260821` | `5759d92` | `M inkforge/src-tauri/Cargo.toml` |
| `D:/Desktop/trellis-worktrees/feature/hub-polish-v2` | `feature/hub-polish-v2` | `8da657f` | 3 个 untracked Trellis/session 文件 |
| `D:/Desktop/trellis-worktrees/feature/toolbar-fix-v2` | `feature/toolbar-fix-v2` | `6e73ca5` | 3 个 untracked Trellis/session 文件 |

四个 worktree 都不干净。任何 prune/remove/switch 之前都要逐个保存和归属这些变更。

补充展开后：

- benchmark worktree 的 `Cargo.toml` 虽显示 modified，但与主工作树当前文件 SHA-256 完全相同，因此该内容已被主工作树覆盖，不是第二份独有源码。
- `hub-polish-v2` worktree 有 7 个 untracked 文件：`.agent-log`、`.session-id` 和 5 个 `03-31-hub-polish-v2` task 文件，总体约 63 KB。
- `toolbar-fix-v2` worktree 同样有 7 个 untracked 文件，总体约 11.6 KB。
- 两个 worktree 的 `.agent-log` / `.session-id` 路径冲突；全量收拢时应放入按 branch 命名的 archive 目录并保留原路径、hash、size manifest，不能互相覆盖。

## 4. 分支与 PR

### 4.1 本地分支

| 分支 | tip | 相对 `origin/main`（behind/ahead） | 是否已包含于当前 HEAD | 判断 |
| --- | --- | --- | --- | --- |
| `dev/visual-fixes` | `5759d92` | `1 / 707` | 是 | 事实开发主线候选 |
| `codex/wechat-baseline-20260821` | `5759d92` | `1 / 707` | 是，同 tip | 基线别名；仍有独立 dirty worktree |
| `feature/hub-polish-v2` | `8da657f` | `1 / 2` | 是 | 提交已并入当前；worktree 未清 |
| `feature/toolbar-fix-v2` | `6e73ca5` | `1 / 1` | 是 | 提交已并入当前；worktree 未清；PR 仍开着 |
| `feature/hub-layout-polish` | `b259394` | `1 / 0` | 是 | 与本地 `main` 同 tip |
| `main` | `b259394` | `1 / 0` | 是 | 本地 main 比远端 main 少 1 提交 |
| `feature/hub-visual-fix` | `e2fc8aa` | `3 / 1` | 否 | 1 个非 patch-equivalent 独有提交 |
| `feature/statusbar-cleanup` | `dadfded` | `3 / 1` | 否 | 1 个非 patch-equivalent 独有提交，范围达 37 文件 |
| `feature/toolbar-redesign` | `9ac2fb4` | `3 / 1` | 否 | 1 个非 patch-equivalent 独有提交 |

最后三个分支不能仅因“很旧”就删除。它们应做语义级比较：确认当前 UI 是否已经以不同实现覆盖其意图，再决定保留、摘取说明或关闭。

### 4.2 远端分支与 PR

GitHub 当前有四个 OPEN DRAFT PR，均自 2026 年 3 月创建后未更新：

| PR | head | 状态 |
| --- | --- | --- |
| #1 | `feature/toolbar-redesign` | open draft，分支有 1 个当前未包含提交 |
| #2 | `feature/statusbar-cleanup` | open draft，分支有 1 个当前未包含提交 |
| #3 | `feature/hub-visual-fix` | open draft，分支有 1 个当前未包含提交 |
| #4 | `feature/toolbar-fix-v2` | open draft，分支 tip 已包含于当前开发线 |

`origin/main` 唯一领先当前 HEAD 的提交是 `7640cae929ac48240f4877cb081d9ef4790a24fe feat(None): toolbar-fix-v2`。其实际内容主要是 Trellis task、`start.py` 和已跟踪的 `server/data/...` 运行数据，共 `20 files / 408+ / 2-`，并不包含 PR #4 的 toolbar 源码提交。该 commit 需要单独拆分价值与运行时产物风险，不能把 `origin/main` 直接当成干净产品基线。

仓库当前无可用保护规则；GitHub API 对私有免费仓库返回 403。后续若主线迁移，需要用流程纪律代替“当前已有保护”。

## 5. 当前开发线的形态

`dev/visual-fixes` 相对其 upstream 有 `625` 个只存在本地的 commit；它们全部为同一作者、无 merge commit：

- 2026-06：493
- 2026-07：122
- 2026-08：10
- 前缀：`fix` 389、`docs` 124、`test` 56、`feat` 37、`chore` 18、`refactor` 1

这说明“开发零散”主要表现为一个超长本地主线和大规模未提交工作，而不是许多并行分支。风险集中在单机未推送、难以审阅、任务边界消失和无法可靠回滚。

## 6. Dirty worktree

### 6.1 对账

创建本任务前，Trellis 报告 `355` 个普通粒度状态项。创建任务并完成规划文档后：

- 普通粒度：`356`，新增 1 项正是 `.trellis/tasks/08-23-engineering-branch-asset-audit/`。
- 创建任务后的首次展开快照是 `1119`；新增 `design.md`、`implement.md`、`research/engineering-inventory.md` 后，当前为 `1122`，即 `200 M`、`12 D`、`910 ??`。
- tracked diff：`212 files / 23988+ / 10676-`。
- 暂存区为空。

### 6.2 tracked 变更主区域

| 区域 | 文件数 | 增删规模 | 类别 |
| --- | ---: | ---: | --- |
| `inkforge/src` | 104 | `14865+ / 5973-` | 产品源码与测试，核心未提交开发 |
| `.claude/skills` | 33 | `590+ / 960-` | Trellis/工具模板更新 |
| `.trellis/tasks` | 15 | `141+ / 1246-` | 任务状态与证据漂移 |
| `.trellis/scripts` | 14 | `1274+ / 216-` | Trellis 工具链更新 |
| `.trellis/spec` | 6 | `1113+ / 38-` | 规范更新，含超大生成式文档 |
| `inkforge/src-tauri` | 5 | `1975+ / 346-` | 桌面壳层开发 |
| `inkforge/tests` | 5 | `1353+ / 426-` | E2E/验收开发 |

删除项包括旧拼写错误的 `.claude/skills/trellis-spec-bootstarp/*`、`08-20` 任务研究文件和一个 PublishView snapshot race test。它们需要按各自任务归属确认，不能作为普通垃圾直接清理。

### 6.3 untracked 资产

展开统计的主要区域：

| 区域 | 文件数 | 近似体积 | 主要内容 |
| --- | ---: | ---: | --- |
| `.trellis/` | 570 | 121.38 MB | 活动任务原文、测试日志、截图和证据 |
| `experiment/` | 127 | 24.35 MB | 视觉实验和导出资产 |
| `prompts/` | 114 | 21.44 MB | 规划/研究材料 |
| `resource/` | 16 | 6.65 MB | 资源文件 |
| `inkforge/` | 63 | 0.80 MB | 当前产品新代码/测试/配置 |
| `.claude/` | 16 | 0.10 MB | 未跟踪的 agent/skill/tooling 文件 |

根级 untracked 还包括 `activated`、`probe.json`、`classic-payload-summary.json` 与 `workstation-menu-current.png`。这些名称呈现运行探针/临时证据特征，但未做内容删除判断。

## 7. Trellis 任务状态

创建本任务前共有 14 个活动任务；本任务创建后为 15 个活动目录，但 `task.py current --source` 仍返回 `(none)`。这不是“没有工作”，而是 current binding 缺失。

关键事实：

- `07-22-workbench-rendering-software-ux`：420 个文件、约 79.86 MB，整个任务目录 untracked，17 个未完成 AC。
- `07-29-rendering-visual-system-reconstruction`：26 个文件、约 35.6 MB，整个目录 untracked，14 个未完成 AC。
- 07-28 至 08-09 的多个活动任务目录全部或主要 untracked；任务原文和验收证据尚未进入外层 Git 保护。
- `08-02-rendering-editor-wechat-design-system-parent` 的 PRD 明确声明自己是集成权威，并明确重开历史 child 的集成缺口。
- 任务元数据里共有 19 个 `relatedFiles` 被至少两个活动任务重复声明；其中 3 个文件被 4 个任务同时声明。
- `07-30-design-fidelity-native-visual-alignment` 的 25/25 related files 当前都 dirty；`07-31-wechat-editor-paste-validation` 为 12/12；`08-02` parent 为 12/13；其 child 为 12/12；`08-09` 为 18/19。
- `07-31-preset-brand-differentiation`、`07-31-wechat-editor-paste-validation` 与 `08-02` child 的 PRD checkbox 已全部勾选，但 task status 仍是 `in_progress`；而 parent 明确说明历史通过不代表当前集成通过。
- `08-09` 仍有真实外部平台验收 blocker，不能伪归档为完成。

此外还有 4 个不含 `task.json` 的顶层目录，不能计作标准 active task，也不能当作垃圾：

- `05-26-render-wechat-fidelity-test`：11 个渲染输出文件，约 1.44 MB。
- `07-11-three-economies-research-article`：空目录。
- `07-15-agent-dinner-frontier-protocol-knowledge-graph`：1 个 research corpus 文件。
- `test-evidence`：5 张视觉证据图，约 0.72 MB。

建议把 `08-02` parent 作为当前渲染/编辑器集成的唯一任务入口，其他重叠任务先标记为“历史证据/子范围/待归档候选”，但任何状态修改仍需单独批准。

## 8. 工程卫生问题

### P0：先保全，禁止直接清理

1. **嵌套 Git WIP**：两个唯一 WIP tree 只存在于 `inkforge/.git/objects`。先建立 refs/bundle/校验清单，再谈移除嵌套仓库。
2. **单机开发线**：625 个 upstream 未推送 commit，加上 212 个 tracked dirty 文件和当前 910 个 untracked 文件，丢失半径过大。
3. **未跟踪任务资产**：多个活动任务及其完整证据目录未被外层 Git 保护。
4. **四个 dirty worktree**：worktree 清理或 prune 会丢掉未归属状态。

### P1：确定单一真值源

1. `dev/visual-fixes`、本地 `main`、远端 `main` 与旧 PR 分支不存在统一权威。
2. README 已把 `inkforge/` 定义为唯一产品目录，但根目录仍有旧 `src/` 和可直接运行的旧 `package.json`。
3. 根 `package-lock.json` 与 `inkforge/package-lock.json` 字节完全相同，但两个 `package.json` 明显不同，说明根 lockfile 不能可靠描述根 manifest。
4. 根目录没有 `src-tauri/`，却暴露 `tauri:dev` / `tauri:build`，从根运行会误导或失败。

### P2：产物与版本控制边界

1. `.gitignore` 只有 24 行；虽然现在忽略 `.playwright-mcp/`，历史上已有 10 个 Playwright console log 被跟踪。
2. `mitm_mcp_traffic.db` 是被跟踪的 SQLite 运行数据库；当前 `flows` 表为 0 行，但文件类型本身不应默认进入版本库。
3. 路径/扩展名启发式发现 116 个日志、DB、环境或认证相关候选。对当前 3422 个 Git 可见文件做全量内容启发式后，已知 provider token/private-key 签名为 0；更宽的 credential assignment/header 规则命中 10 个文件。redacted triage 显示多数为源码 identifier、fixture placeholder 或文档示例，但 `inkforge/src/services/sync/configuration.test.ts`、`inkforge/src/stores/settings.ai.test.ts`、`inkforge/tests/e2e/specs/editor-settings.spec.cjs` 各有 quoted test literal，尚未证明不是有效凭据。它们是提交前 blocker；本机未安装 gitleaks/trufflehog，不能声称秘密扫描完整通过。
4. tracked + untracked 文件中发现 48 组大于 4 KiB 的字节级重复文件，理论重复体积约 10.2 MB；包括 `audit/hub-flow/` 与归档任务证据的重复截图、重复实验图和相同的根/产品 `package-lock.json`。
5. 被跟踪的明显临时/异常路径还包括空文件 `Ctrl+Shift+V`、异常脚本片段文件名、`tsconfig.tsbuildinfo`、旧 console log 和多批根级截图。它们是候选，不是删除清单。
6. 当前 3422 个 Git 可见文件合计约 297.9 MB，最大单文件约 9.47 MB；不存在单个超大文件，但全量纳入仍会显著增加 clone/review 成本。

## 9. 最小、可逆的整理顺序

1. **冻结破坏性动作**：保持当前分支、worktree、嵌套 `.git` 和 dirty 内容原样。
2. **建立保全层**：为外层 refs、四个 worktree dirty 状态、全部 untracked task 资产和两个嵌套 WIP commit 生成可校验备份；完成恢复演练后再继续。
3. **先提交全量快照**：在临时集成线上按工具链/规范、任务证据、产品源码/测试、实验/运行产物分批提交；不要一次性 stage 当前 1122 个主工作树路径及外部 worktree 资产。
4. **再构造唯一 `main`**：全量快照 clean 后，纳入 `origin/main` 和旧 feature ancestry，完整验证，再让 `main` 快进并普通推送。
5. **统一任务入口**：以 `08-02` parent 接管渲染/编辑器集成，逐个核对其他 active task 的剩余 AC、证据和归档条件。
6. **消除双入口**：在验证所有脚本、CI 和文档后，再决定删除根 legacy `src/`/manifest，或把根 manifest 缩成只代理到 `inkforge/` 的最小入口。
7. **补 ignore 与移除已跟踪产物**：只对确认可再生且不承担证据职责的文件执行；先列 exact path，再逐项批准。
8. **最后处理分支/PR/worktree**：语义核验通过后，关闭陈旧 PR、归档已包含分支、移除空 worktree；删除仍是最后一步。

## 9.1 用户已确认的目标状态

- 唯一长期分支：`main`。
- `dev/visual-fixes` 和 feature/codex 分支只作为迁移与保全来源，不作为最终长期分支。
- 不从旧 `main` 逐个挑回 707 个提交；应先让集成 tip 包含 `origin/main` 的 ancestry，避免不必要的 force-push，再把本地 `main` 快进到该 tip。
- 完整保留当前 HEAD 的全部 711 个祖先提交，其中 707 个为 `origin/main..dev/visual-fixes` 独有提交；不 squash、不 force-push。
- 三个旧 feature 独有提交进入 `main` ancestry；冲突时保留当前实现，不把 3 月旧 UI 覆盖回最终工作树。
- 当前 Git 可见的全量工作树快照进入 `main`：包括日志、截图、probe、SQLite DB、实验目录与重复证据。
- `.git` internals、已忽略的依赖/构建缓存、浏览器状态和真实 secrets 不作为普通文件提交。嵌套 Git 的两个唯一 WIP 先导出为 bundle/manifest，再让产品目录回归外层仓库的普通跟踪边界。
- 两个唯一 WIP 只以可恢复 bundle、refs manifest 和可读 patch 纳入 `main`，不把 5 月旧源码覆盖进当前工作树。
- 由于用户明确选择全量快照，约 10.2 MB 字节重复项和历史运行证据本轮不做去重；后续若要瘦身，应另开任务并保持可恢复来源。

## 10. 验证命令摘要

本报告使用的关键只读命令包括：

```text
git status --porcelain=v2 --branch
git status --porcelain=v1 -z --untracked-files=all
git worktree list --porcelain
git for-each-ref ... refs/heads refs/remotes
git rev-list --left-right --count <base>...<branch>
git merge-base --is-ancestor <branch> HEAD
git cherry HEAD <branch>
git ls-remote --symref origin HEAD refs/heads/*
gh pr list --state open --json ...
git -C inkforge fsck --unreachable --no-reflogs
git -C inkforge diff --shortstat <wip>^1 <wip>
git ls-files / git ls-files --others --exclude-standard
```

没有执行 clean、reset、checkout、switch、merge、rebase、cherry-pick、branch delete、worktree remove、commit、push 或 PR 写入。

## 11. 活动任务逐项矩阵

`最后文件日期` 来自任务目录内最新文件 mtime，仅用于定位，不等同于 Git commit 时间。`T/U` 为当前存在文件中的 tracked/untracked 数；所有 task metadata 的 `commit` 都为空。除 `08-09` 和本审计任务外，其余 task metadata 也没有 branch 绑定。

| Task | status | 最后文件日期 | 文件 T/U | MiB | AC 完成/未完成 | related dirty | 关键产物 |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `05-12-full-app-functionality-audit-repair` | in_progress | 2026-07-17 | 18/0 | 0.48 | 0/15 | — | research 1、log 2、image 1 |
| `05-28-logo-chrome-aesthetic-re-tune-aha-factor-style-coherence` | in_progress | 2026-07-05 | 11/0 | 0.10 | 0/19 | — | research 6 |
| `07-22-workbench-rendering-software-ux` | in_progress | 2026-07-27 | 0/420 | 76.16 | 0/17 | — | evidence 118、log 78、image 132 |
| `07-28-rendering-empty-output-fix` | in_progress | 2026-07-28 | 0/7 | 0.03 | 0/17 | — | research 1 |
| `07-28-rendering-spec-editor-components` | in_progress | 2026-08-02 | 0/7 | 0.03 | 9/0 | — | parent=`08-02` |
| `07-29-rendering-visual-system-reconstruction` | in_progress | 2026-08-02 | 0/26 | 33.97 | 0/14 | — | research 20、image 18、parent=`08-02` |
| `07-30-brand-rendering-design-recovery` | in_progress | 2026-08-02 | 0/6 | 0.02 | 0/14 | — | parent=`08-02` |
| `07-30-design-fidelity-native-visual-alignment` | in_progress | 2026-07-30 | 0/7 | 0.03 | 0/14 | 25/25 | evidence 1 |
| `07-31-preset-brand-differentiation` | in_progress | 2026-07-31 | 0/6 | 0.02 | 12/0 | — | parent=`07-30-brand...` |
| `07-31-wechat-editor-paste-validation` | in_progress | 2026-08-02 | 0/6 | 0.03 | 11/0 | 12/12 | parent=`08-02` |
| `08-02-rendering-editor-wechat-design-system-parent` | in_progress | 2026-08-09 | 0/14 | 0.31 | 0/18 | 12/13 | 集成权威候选 |
| `08-02-wechat-editor-component-parity-frontmatter-colophon` | in_progress | 2026-08-02 | 0/18 | 3.43 | 12/0 | 12/12 | research 4、image 4、parent=`08-02` |
| `08-09-native-media-shell-xhs-zhihu-render-acceptance` | in_progress | 2026-08-10 | 0/29 | 0.29 | 8/5 | 18/19 | evidence 17、log 10、branch=`dev/visual-fixes` |
| `08-20-mdnice-yiban-meibian-rendering-benchmark` | planning | 2026-08-21 | 21/0 | 2.97 | 0/13 | — | research 15 |
| `08-23-engineering-branch-asset-audit` | planning | 2026-08-23 | 0/7 | 0.04 | 6/1 | — | 本报告；branch=`dev/visual-fixes` |

映射结论：

- 07-22 至 08-09 的主要任务目录未进入任何 commit，因此不能从分支 history 找回；它们目前只受工作树保护。
- metadata 未提供 commit 映射，不能把旧 branch/PR 与这些任务作无证据的一一对应。
- 已声明 relatedFiles 的五个任务高度重叠，且几乎全部落在当前 dirty 产品路径；`08-02` parent 是 PRD 明示的集成权威候选。
- 4 个无 `task.json` 目录属于 orphan evidence/research，不计入 15 个标准活动任务；其跟踪状态分别为 `0T/11U`、空、`0T/1U`、`5T/0U`。

## 12. Finding ledger

| ID | Evidence | Impact | Confidence | Next gate |
| --- | --- | --- | --- | --- |
| F1 | current line 对 upstream `+625`、对 `origin/main` `+707/-1` | 单机丢失、审查和发布风险 | confirmed | Phase 1 外部 bundle + 恢复演练 |
| F2 | nested `.git` 有两个 outer 不存在的 WIP tree | 直接删除会永久丢失唯一历史 | confirmed | preservation refs + bundle + patch + 双份验证 |
| F3 | outer `212` tracked dirty、`910` untracked；nested expanded `674` | 无法安全切分、切换或 clean | confirmed | source–destination ledger 后分批提交 |
| F4 | 四个 linked worktree 均 dirty；两个有同名 log/session | 路径冲突和 worktree remove 丢失 | confirmed | namespaced archive + hash manifest |
| F5 | 三个旧 feature 各有 1 个当前未包含提交；四个 draft PR open | 删除会失去 ancestry/PR 证据 | confirmed | ancestry-only merge，tree 不变断言 |
| F6 | 15 个标准 active task、4 个 orphan 目录、current=(none)、19 个 relatedFiles 重叠 | 任务权威和验收漂移 | confirmed | `08-02` parent 为候选，逐项状态审查 |
| F7 | README 指定 `inkforge/`，根仍有 legacy `src/`/manifest；lockfile 相同而 manifest 不同 | 从错误目录运行命令、锁文件不可信 | confirmed | 主线收拢后另开 exact-path 清理任务 |
| F8 | 48 组字节重复，约 10.2 MB；116 个风险文件名候选 | 仓库体积和运行产物边界不清 | confirmed | 本轮全量保留；未来瘦身另开任务 |
| F9 | 10 个宽规则 credential 候选；3 个 quoted test literal 未证伪 | 可能把有效凭据推入完整历史 | unverified / blocking | 正式 scanner + 人工确认/轮换 |
| F10 | GitNexus 落后 HEAD 10 commits；保护 API 403 | 图谱/保护状态不能单独作为依据 | confirmed tool boundary | 实时 Git + 测试；推送前流程型保护 |

## 13. Redacted risk-scan manifest

扫描范围：当前 `git ls-files -co --exclude-standard` 返回的 `3422` 个文件，`297926404` bytes，最大文件 `9466313` bytes；读取失败 `0`。

规则组：private-key header、GitHub token prefix、OpenAI-style key prefix、AWS access key、Slack token、Authorization/Cookie header、`apiKey/accessToken/clientSecret/password` assignment。报告只保存文件名、规则类别和计数，不保存匹配值。

已知 provider/private-key signature：`0`。宽规则候选：

- identifier/diff context：`rust-agent-current.diff`、`pi.ts`、`wechat.rs`、`stores/ai.ts`、`SettingsView.vue`。
- 明确 placeholder fixture：`pi.test.ts`。
- quoted test literal，仍为 blocker：`configuration.test.ts`、`settings.ai.test.ts`、`editor-settings.spec.cjs`。
- 文档 Authorization 示例：`prompts/0420/specs/23-sync-provider-spec.md`。

额外定向扫描 `experiment/清明，烧Token，祭图灵.mhtml`、两个 `.agent-log` 和两个 `.session-id`，上述规则均为 `0` 命中。本机没有 gitleaks/trufflehog，且本轮没有完成全 history secret scan；因此最终状态是 `partial / blocked before commit`，不是 pass。

## 14. Audit-side-effect record

独立复核期间，scope reviewer 误执行 `git -C inkforge write-tree`。这是一次 Git metadata 写入，不是纯只读操作，已如实保留而未尝试清理：

- 返回 tree `0adc653d212007438dad873ae68134d764013d77`，与 nested HEAD tree 完全相同。
- nested refs 仍为 `145ee02556c3ee284414cbf48dd402ad14cd0728`；staged 仍为 `0`，unstaged `74`，expanded untracked `600`。
- nested index SHA 从 reviewer 初检的 `3dcadb...` 变为 `561317...`，mtime 为 `2026-08-23 18:15:15.435899`；变化符合 cache-tree/stat-cache 刷新，未改变 index entries 的语义。
- 同一时间窗出现 28 个 reachable loose tree objects；没有 pre-object 清单，故“全部由本命令新建”是高置信推断而非证明。
- 没有删除这些对象，也没有 reset/checkout；外层 HEAD、branch、staging 和工作树内容未变。

这项 side effect 不改变产品代码或历史，但证明后续迁移必须先建立排他 quiescence gate，并区分“Git 语义只读”与“对象库/index 字节完全不写”。

## 15. Implementation update（2026-08-23）

用户已在审阅实施方案后明确批准全部阶段。以下为审计完成后的增量事实；第 1–14 节保留为审计时点原始记录，不用事后结果改写历史：

- 已为两个 nested WIP exact commit 建立 `refs/preserve/engineering-audit/*`，nested `git fsck --full` 通过。
- 已在 `E:/codex-session-backups/.../S0` 与 `C:/Users/HP/OneDrive/CodexBackups/.../S0` 建立两份逐文件 hash 相等的完整保全副本；source `D:` 位于物理 Disk0，两个副本位于物理 Disk1。OneDrive 进程未运行，故这里只证明跨物理盘，不声称云端副本。
- 两份 S0 均含外/内 bundle、refs/index/status、五个 worktree 的完整 payload、binary patch/WIP patch 和恢复说明；46 个 artifact、`322294033` bytes，artifact manifest SHA-256 为 `15fc5e5e5594748b4d156c6628a655635fe5c110411284a5c418f6c22c28d711`，bundle/patch/payload 恢复演练通过。
- 已安装并校验官方 Gitleaks 8.30.1。正式历史扫描在旧提交中识别出一个当时仍有效的本机 Grok bearer；该值早已存在于 `origin/main` 与 `origin/dev/visual-fixes` ancestry，当前 tree 不含 `.mcp.json`。已先完成双 key 切换、更新 8 个本机 consumer、重启本机服务并撤销旧 key；最终验证为 unauth `401`、旧 key `403`、新 key `200`，报告不保存 key 值。
- 当前 tree 的其余 Gitleaks 命中已归类为 GitNexus SHA-256 内容 hash、MHTML 静态资源/二进制 MIME 行和三个低熵测试 fixture；两个 Vitest 文件共 11 个测试通过，E2E fixture 文件 `node --check` 通过。
- JSONL/log/session/HAR/SQLite 结构化扫描未发现 provider key、认证头、Cookie 或 credential assignment；图片 OCR 覆盖 717 个路径/658 份唯一内容，四分片均为 0 candidate、0 error，六张高风险截图人工复核也未见 secret。
- 审计过程中一条本应重定向到空设备的 Bash 命令错误使用 `2>nul`，在仓库根生成了一个 agent-created 零字节文件 `nul`。该 exact path 不属于 S0，已验证后用同一 Bash 路径语义精确移除；没有执行广泛删除。
- 全量快照已按七个内容批次和一个审计回执批次提交；随后锁定的 `origin/main=7640cae929ac48240f4877cb081d9ef4790a24fe` 通过双亲 merge commit `ed4c2ca217a466eec7fa1e51b20b815dc177a2b7` 正常纳入。唯一 modify/delete 冲突 `.trellis/scripts/multi_agent/start.py` 保留远端原 blob，并通过 `py_compile` 与 `--help`；命令产生的 exact ignored 文件 `start.cpython-312.pyc` 已单文件移除，原有 `_bootstrap.cpython-313.pyc` 未动。
- 三个旧 feature exact tip 已分别用 `git merge --no-ff -s ours` 接入 ancestry，生成 `cbe6e1616515d2463d2af0ce20fba89a048e5f9d`、`75b2f287b1cd1bace8b1c3fd448453b21f55d7a9`、`06160e0b8f23d7f24e0e2870fc89040d5567569a`；三次合并前后 tree 都保持 `ef215a1c7686fd2aacb0a7168bb342aef1380968`。当前 integration tip 已包含审计列出的全部本地、remote-tracking、feature 与 codex 来源 tip，且工作树 clean。
- 最终自动验证覆盖 bundle restore/fsck、Vitest `2156/2156`、typecheck、readonly ESLint、Web build、Rust `fmt/check/test`、Tauri MSI/NSIS bundle、隔离原生进程和无扩展 Playwright production preview。默认高并发 Vitest 首轮出现同一 5 秒超时，目标用例与 `--maxWorkers=4` 全量重跑均通过；对应 10 个 fidelity 输出和 build 生成的 `tsconfig.tsbuildinfo` 已按 exact path 恢复为提交字节。
- Tauri 首次在已成功编译 release binary 后因 Microsoft WebView2 下载 TLS EOF 停在 bundling。按 Tauri 1.x 官方源码的原生 cache 规则缓存固定 redirect GUID 下的 offline installer，并验证固定长度、SHA-256 与 Microsoft Authenticode 签名后，未改项目配置的重跑成功生成当日 MSI/NSIS。
- 最终 Gitleaks 扫描 `718` 个 commit：两个 `.mcp.json` finding 是同一已撤销旧 bearer，两个是已复核 MHTML false positive；current directory 的 36 个 finding 仍精确为 34 个 GitNexus hash 和 2 个 MHTML false positive。新增验证证据无命中。
