# InkForge 工程状态与分支资产梳理

## Goal

在进入逐点修改与打磨前，建立一份 preservation-first 的工程资产基线：查清 Git 仓库、工作树、分支、提交、未提交变更与 Trellis 任务之间的真实关系，识别零散开发、重复资产、状态漂移和清理风险，为后续人机协作提供可追溯入口。

## Confirmed Facts

- 2026-08-23 的实时 Trellis 上下文显示当前分支为 `dev/visual-fixes`。
- 创建本审计任务前，当前工作目录有 `355` 项普通粒度的未提交状态；创建后为 `356` 项，差额正好是本任务目录。
- 创建任务后的首次展开快照为 `1119` 个路径状态；补齐 `design.md`、`implement.md` 和本报告后，当前为 `1122`：`200 M`、`12 D`、`910 ??`。暂存区为空，也不存在 merge/rebase/cherry-pick/index lock。
- `task.py current` 当前为 `(none)`；创建本任务前有 `14` 个活动任务，创建后活动任务目录为 `15` 个，任务绑定和状态一致性存在漂移。
- `.trellis/tasks/` 另有 4 个不含 `task.json` 的 orphan evidence/research 目录，不属于标准 active task，但也不能遗漏或直接清理。
- 外层仓库当前分支相对 `origin/dev/visual-fixes` 为 `ahead 625 / behind 0`，相对远端默认分支 `origin/main` 为 `ahead 707 / behind 1`。
- 仓库内存在一个未声明为 submodule 的独立嵌套 Git 仓库 `inkforge/.git`；其对象库含两个外层仓库不存在的 WIP commit/tree，不能直接删除。
- 用户已决定最终只维护 `main`：所有有价值的现有开发应先保全、核验，再汇入 `main`；其他长期分支最终关闭或删除。
- 用户已决定采用全量快照范围：当前 Git 可见的 tracked/untracked 文件均纳入 `main`，包括日志、截图、probe、DB 和重复证据。
- `.git` 内部对象、Git 已忽略的依赖/构建缓存、浏览器状态和真实密钥不作为普通仓库文件提交；嵌套 Git 的两个唯一 WIP 需导出为可恢复 bundle/manifest 后纳入保全范围。
- 用户已决定保留当前 HEAD 的全部 711 个祖先提交，其中 707 个为 `origin/main..dev/visual-fixes` 独有提交；不 squash、不 force-push，最终 `main` 采用普通 fast-forward 路径。
- 用户已决定三个未包含的旧 feature commit 进入 `main` ancestry，但冲突和最终工作树以当前代码为准，不恢复已被后续开发替代的旧实现。
- 用户已决定嵌套仓库的两个唯一 WIP 以可恢复 bundle、refs manifest 和可读 patch 纳入 `main`，不把 5 月旧源码覆盖到当前产品工作树。
- 全量启发式扫描覆盖当前 3422 个 Git 可见文件：已知 provider token/private-key 签名为 0，但 3 个测试文件仍含需要人工确认的 quoted credential literal；在确认其为测试值或完成替换前，这 3 个文件不得进入提交。
- 独立复核误执行一次 nested `git write-tree`，只改变了 nested index/cache-tree 字节和疑似 28 个 reachable loose tree 副本；refs、staged entries、worktree 内容及外层 Git 状态未变。该 side effect 已记录且未清理。
- 本任务最初仅负责盘点与方案；用户在审阅方案后明确批准 `implement.md` 的全部阶段。批准不绕过保全、秘密扫描、远端竞态、自动验证和用户验收门禁。

## Requirements

### R1. Preservation-first execution

- 只执行 `implement.md` 中已批准且证据门禁通过的动作；产品功能与视觉行为不因本次工程收拢被顺手修改。
- Git/文件动作必须按 exact ref/path 执行并可恢复；禁止 `clean`、`reset --hard`、rebase、force-push、`git add .` 和广泛进程清理。
- 对疑似密钥、账号、浏览器状态、数据库、日志和运行时文件只报告路径与风险类别，不输出敏感内容。

### R2. Git topology and branch inventory

- 发现工作区内所有实际 Git 根、嵌套仓库、submodule 与 linked worktree。
- 记录每个仓库的当前分支、HEAD、默认分支、remote、upstream、ahead/behind、工作树状态和 remote-tracking ref 新鲜度。
- 盘点本地及已配置远端分支的 tip、最后提交时间、合并状态、独有提交和主要文件范围。
- 将分支分类为：当前/受保护基线、已合并、仍含独有工作、仅远端、仅本地、关系未知、可进一步核实的陈旧候选；不得直接判定删除。

### R3. Dirty-worktree inventory

- 将实时 `git status` 与 Trellis 报告的创建前 `355` 项变更对账。
- 按目录、文件类型和用途归类 tracked/untracked 变更：产品源码、测试、配置、文档、Trellis、生成物、构建/运行时产物及敏感风险。
- 识别明显重复、过期、错误纳入版本控制或应由 ignore 规则承接的候选，但保留所有用户资产。

### R4. Trellis task and development-line mapping

- 盘点全部活动任务及其状态、父子关系、关键产物、最后更新时间和已声明范围。
- 在有证据时，把任务映射到相关路径、dirty 变更、分支或提交；标出重叠、孤立、状态漂移和重复规划。
- 不因 `current=(none)` 自动创建重复任务，也不擅自归档或改变既有任务。

### R5. Engineering hygiene findings

- 检查仓库边界、Git 元数据、ignore 规则、超大文件、生成物、临时文件、重复目录、失联任务、索引新鲜度和可能影响后续打磨的工程结构问题。
- 每个发现必须包含证据、影响、置信度和最小可逆建议；区分 confirmed、inferred、unverified 与 blocked。

### R6. Deliverables

- 形成可审阅的工程资产清单、分支/任务关系图、问题清单和分阶段整理建议。
- 清理与整合动作按已批准的 `implement.md` 顺序执行；每项高风险或不可逆动作仍须先满足其写明的保全与验证条件。

## Acceptance Criteria

- [x] 列出所有发现的 Git 根、linked worktree、submodule、remote、当前/默认分支及 HEAD 证据。
- [x] 本地与已配置远端分支均有可追溯清单；每个非基线分支均有合并/独有提交/主要路径证据或明确标为未知。
- [x] 实时 dirty 状态已与创建前 `355` 项基线对账，并按用途与风险分组；动态变化项单独列出。
- [x] 创建前 `14` 个活动 Trellis 任务已逐项核对；本任务为第 `15` 个标准活动目录，另有 4 个 orphan 目录，并已形成任务—路径重叠证据。
- [x] 问题清单覆盖零散开发、重复/生成资产、状态漂移、潜在敏感文件、超大文件与索引/工具边界。
- [x] 审计阶段每项建议说明收益、风险、可逆性和前置验证，且当时没有执行删除、移动、合并、重写历史、提交或推送。
- [x] 用户已批准按 `implement.md` 执行全部阶段。
- [ ] 两份 S0、正式 secret scan、全量快照提交、ancestry 集成、完整验证、普通 push 和最终恢复演练均有可审查证据。
- [ ] 在删除 nested Git、worktree、旧 ref/PR 前，远端 `main`、恢复能力和产品验收均已通过。

## Out of Scope

- 产品功能修改、视觉打磨、依赖升级、性能优化或 Bug 修复。
- 历史改写、force-push、未列入 `implement.md` 的产品改造、依赖升级和发布打包。
- 未配置远端平台中的 PR、Issue、保护规则或 CI 状态，除非后续证据表明这些信息是正确判断分支归属所必需。

## Open Questions

- 无待确认的实施授权问题；若远端 `main` 漂移、秘密扫描未清零、自动检查失败或产品验收无法完成，则对应后续阶段保持 blocked，不自行降低门槛。

## Decision Log

- 2026-08-23：用户选择最终以 `main` 为唯一长期分支，把所有有价值的改动合并到 `main`，不继续维护长期 `dev`/feature 分支。
- 迁移策略不采用“从旧 main 逐个回捞 707 个提交”；推荐先把当前 `dev/visual-fixes` 作为临时集成载体，使其历史包含 `origin/main`，完成资产归属与验证后再让 `main` 快进到集成 tip。
- 2026-08-23：用户选择把当前 Git 可见的全量工作树快照纳入 `main`，包括通常会被归为运行/证据产物的文件；仍不提交 Git internals、ignored caches、浏览器状态或真实 secrets。
- 2026-08-23：用户选择保留当前 HEAD 的全部 711 个祖先提交，其中 707 个为 `origin/main..dev/visual-fixes` 独有提交；使用包含 `origin/main` 的普通 fast-forward 迁移，不 squash、不 force-push。
- 2026-08-23：用户选择让三个旧 feature 独有提交进入 `main` ancestry，但冲突和最终代码以当前开发线为准。
- 2026-08-23：用户选择把嵌套仓库两个唯一 WIP 作为 bundle/manifest/patch 纳入 `main`，不恢复旧源码到最终工作树。
- 2026-08-23：用户明确“批准所有任务进行”，授权执行 `implement.md` 的提交、合并、普通推送、拓扑退休与任务/文件系统收敛；force-push、历史改写及跳过证据门禁仍不在授权内。
