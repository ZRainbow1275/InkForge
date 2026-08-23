# Implementation Plan — 原生媒体、Tauri 交互与三平台编辑器验收

## 1. Start gate

- [x] 用户同意创建本 Trellis 子任务。
- [x] 已复用现有 135、秀米、doocs/md、mdnice、WeChat、XHS 与 Zhihu 研究；不重复泛化调研。
- [x] 已核对单一 converter、writing/delivery component、WeChat service、native shell、XHS/Zhihu
  manifest 和 style-proof acceptance 路径。
- [x] 用户审阅本任务最终 Goal、范围、验收、混合原生媒体策略和不发布边界，并在后续消息明确
  批准实施。
- [x] 仅在批准后运行 `python .trellis/scripts/task.py start ...`；批准前不编辑产品代码。

## 2. Pre-edit protocol

- [x] 运行 `trellis-before-dev`，读取本任务 PRD/design/implement、curated JSONL 和适用 specs。
- [x] 重新记录 branch、HEAD、dirty/staged/untracked 状态、运行中的 InkForge/Tauri/CloakBrowser 进程
  和端口；保护全部既有修改。
- [x] 检查 GitNexus index 新鲜度。每个拟修改函数/类/方法先做 upstream impact；涉及下游数据合同
  时补 downstream impact。HIGH/CRITICAL 先向用户报告 blast radius 和缩小方案。
- [x] 为每个切片先建立一个能失败的最小回归或真实复现；失败先判定产品根因，不放宽断言。
- [x] 不新增依赖、renderer、store、窗口框架、文章模型、平台 publisher 或重复 registry。
- [x] 重型 Vitest/export/build/Tauri/WDIO 串行执行，`maxWorkers=1`，避免与浏览器外部验收并发。

## 3. Ordered implementation slices

### Slice 0 — Baseline and exact fixture

- [ ] 选用一篇现有真实本地文章或由用户当前文章内容派生的非敏感验收稿，覆盖标题、正文、强调、
  列表、引用、代码、表格、公式、图片、时间线、对比、统计、图集、来源、song、profile、article
  和 media；不编造人物、来源、图片、平台 ID 或外部事实。
- [ ] 从当前 release/production path 生成 WeChat、XHS、Zhihu 基线，记录 converter result、quality
  issues、manifest、artifact hash 和当前 native shell 行为。
- [ ] 建立 artifact-readiness gate：证明 release Export 能写出 XHS raster pack 与 Zhihu fallback
  image bytes/manifest。当前仅能接收/校验 caller-supplied manifest 的路径必须先接入现有
  slicer/raster/image pipeline 和文件保存入口；否则 AC-08/09 预先为 `blocked`，不进入浏览器实测。
- [ ] 跑最小基线测试，确认失败项与本 PRD 一一对应；已有通过项不重复重写。
- [ ] 建立脱敏 evidence 目录/模板，只允许 hash、计数、safe label、几何、readback 和边界。

### Slice 1 — WeChat official media and native handoff

- [ ] 对 `convertToNativeFormat`、`resolveDeliveryAdornmentSlots`、`uploadWechatArticleImage`、现有
  draft/material commands 和拟触及 UI symbols 运行 GitNexus impact。
- [ ] 先补失败测试：官方正文图片/封面、`draft_add → getDraft → draft_delete → absence readback`、
  `digest` 120/121 边界及错误 readback；native song/profile/media 的 disposition、真实字段、稳定
  anchor、顺序、去重、static fallback 与 blocked/manual 状态。
- [ ] 从当前 writing-component registry 动态生成全组件矩阵，逐 ID 记录 disposition、fallback、
  handoff、validator、local/external evidence 和状态；禁止手写第二份 ID 清单，未知/遗漏/未执行行失败。
- [ ] 为每个最终 artifact occurrence 派生临时 key：artifact hash + AST ordinal + component type +
  props hash。重复同类型/同 props 组件也必须唯一定位；歧义或锚点不唯一时 fail closed，不写回文章、
  Settings、数据库或新 store。
- [ ] 复用现有 component/delivery schemas；只有现有字段不能表达已验证官方返回或 handoff 状态时，
  增加最小 optional typed field，并保持旧 JSX/Settings round-trip。
- [ ] 让现有 delivery/publish-preparation surface 显示每个原生组件的真实名称/类型、插入位置、所需
  字段、当前 disposition 和下一步；不得增加第二份表单或平台 ID store。
- [ ] 保证图片/封面/draft 继续只走 Tauri/local service，错误码可见；不在浏览器侧读取凭据。
- [ ] 最小补齐一个 backend-only draft round-trip command，而非暴露通用 get/list/delete invoke。它在
  add 前写含非敏感唯一 marker 的 intent，并把 marker 嵌入专用仓库校准草稿；获得 ID 后原子更新
  私有 Tauri app-data `cleanup_pending` journal，在 `finally` 执行 get/delete/absence。
- [ ] 启动/重试通过 backend-only draft batch list 按 marker + payload hash 唯一重识别；只删除一个
  exact match。零/多候选、权限缺失或 unknown outcome 保持 blocked 并提供人工清理步骤，marker
  absence readback 前不关闭门禁。Vue 只接收脱敏 receipt。
- [ ] Reconciliation 固定 `count=20`、`no_content=0` 并遍历完整 `total_count`；定义仅含稳定可读字段的
  canonical recovery hash，排除 media ID/临时 URL/update time/HTML 属性顺序/服务端生成字段。
- [ ] 覆盖 add/get/list/delete 各阶段失败、响应后落盘前中断、pending recovery、无权限、歧义候选、
  人工清理、absence 失败、journal 清除、>20 草稿分页、分页停滞及服务端内容规范化，以及 raw ID
  不进入 Web/ActivityLog/日志/证据。
- [ ] 在最终 release 之前只做本地路径验证；外部 WeChat 原生插入留到 Slice 4，与同一最终二进制
  一起验收。

### Slice 2 — Native shell, focus, keyboard, motion

- [x] 对 `waitForManagerPanelTransition`、inspector handshake、desktop focus/window commands、layout
  persistence 和拟触及 tests 运行 GitNexus impact。
- [x] 为 collapse/open、dock/float/native detach、close/reopen/redock、restart restore 建立失败优先
  unit/source/native E2E；断言内容、geometry、state 和 focus，而非固定等待时间。
- [x] 先固化当前能力表，再生成有效矩阵：Manager/Stage collapse/expand；Inspector panel
  pin/hover/collapse；Inspector widget dock/float/native/close/redock。逐行记录 state、geometry、
  focus、persistence、default/reduced motion、restart relevance 和 release readback；unsupported
  显式记录，不为过门禁发明 Manager/Stage native window。
- [x] 在共享根修复实际缺陷：复用现有 state/persistence/window allowlist；不复制 widget content 或
  新建 window manager。
- [x] 修复 Tab/Shift+Tab、Enter/Space、Escape、shortcut、focus/selection restore 和 pointer hit-test
  问题，保持 EditorKeymap、IME、Focus/Typewriter/Command Palette 行为。
- [x] 将产品 `settings.appearance.reducedMotion` 与 OS media query 按 OR 合并为唯一 effective 状态；
  App class/data、CSS 与 JS wait 一致。覆盖仅产品、仅 OS、均关闭、effective reduce/零时长四组；
  零时长立即完成且保留焦点/状态反馈。只在重复根因成立时抽取一个最小 shared helper。
- [x] 在 release 软件中连续快速切换至少 10 轮，验证最后状态、无双层遮罩、无 editor geometry 漂移。

#### Slice 2 local implementation evidence (2026-08-09)

- `LOCAL-PASS`：失败优先契约从 `1 failed / 26 passed` 起步；修复后 Workstation 三个聚焦套件
  `3 files / 39 tests` 通过，`vue-tsc --noEmit` 与精确 ESLint error gate 通过。
- `LOCAL-SOURCE-PASS`：Manager/Stage/Inspector 折叠控件使用原生 button；Inspector 菜单、应用内浮动、
  close/redock 与 native handshake 已接线恢复目标焦点，Escape 先关闭顶层 shell surface，未新增 document listener。
- `LOCAL-SOURCE-PASS`：Workstation shell 使用产品设置与 OS media query 的 OR 作为 DOM class/data 与 JS wait
  的同一 effective 状态；零时长立即完成，默认动效 timeout 来自 computed duration，不再固定 700ms。
- `LOCAL-RELEASE-PASS`：最终 release WebView2 的动态 capability table、OS-only/app-only 组合、原生
  utility 首控件、真实进程重启恢复、pointer/Tab/Shift+Tab 与 10 轮快速切换均已通过。默认系统动效
  为 `1 passing / 1 skipped`，OS-only reduced motion 为 `2 passing`；Windows 动效设置已恢复并回读为
  `True`。

### Slice 3 — Final local verification and release build

- [x] 串行跑全部聚焦回归、完整 export suite、精确 ESLint、typecheck、production build 和 application
  preflight；修复所有本任务引入的失败。
- [x] 构建 Tauri release，运行目标 WDIO suites；真实窗口、指针、键盘、焦点、重启、默认 motion 与
  reduced-motion 全部通过。
- [ ] 在 release 软件内手动/自动可见核对 WeChat/XHS/Zhihu 当前 preview/export、native media
  handoff 和 shell lifecycle。
- [x] 通过 release UI 实际导出并读取 XHS raster pack、Zhihu fallback bytes 与两个 manifest；若只能
  从测试 helper 构造 manifest，本 Slice 失败，不构建用于外部实测的“最终 release”。
- [x] 记录最终 EXE SHA-256 与三个 exact artifact fingerprints。此后除证据/docs 外不再改产品代码；
  若必须修产品，回到本 Slice 重建并重跑。

### Slice 4 — Authenticated WeChat native component readback

- [ ] 仅复用一个任务 CloakBrowser 会话，确认登录态和目标公众号文章编辑器 surface；不启动
  Playwright 或第二 profile。
- [ ] 从最终 release 使用现有 copy/handoff 产物进入编辑器；使用平台真实控件插入一项真实歌曲及
  一项真实公众号名片/媒体，并与 InkForge anchor/expected identity 对齐。
- [ ] 通过受限 backend round-trip 操作执行 add/get/delete/absence；Web 只读取脱敏 receipt 和
  cleanup state。若恢复队列非空，先完成该队列且确认 absence，再进行新的 live gate。
- [ ] 读取目标 editor DOM/visible text、组件顺序、标题/昵称和 cleanup 状态；记录 release/artifact/
  component fingerprint 与现有 proof fields。
- [ ] 若账号无可用条目、权限或平台 UI 不提供对应能力，记录 `manual-native-insert`/`blocked`，不得
  使用样例数据、私有标签或仿卡补齐 AC。
- [ ] 清空/丢弃测试内容；不点击手机预览、保存群发、同步、定时、群发或发布。

### Slice 5 — Authenticated XHS editor rendering

- [ ] 使用最终 release 的可见 Export 入口写出 exact XHS plain text 与一套完整 raster pack；
  validator、manifest、文件 bytes、页序、cover 和裁切全部通过，测试/历史文件不可替代。
- [ ] 在真实 XHS editor 通过可见正文输入与上传控件粘贴/上传，不用脚本注入 editor state。
- [ ] 读回标题/正文顺序、段落、控制符泄漏、图片数量/顺序/裁切和目标 editor surface；绑定最终
  release/artifact fingerprints。
- [ ] 记录当前账号 UI 显示的限制但不硬编码；不点击发布，清理/丢弃测试内容。

### Slice 6 — Authenticated Zhihu editor rendering

- [ ] 使用最终 release 的可见 Export 入口写出 exact clean Markdown、真实 image fallback bytes 与
  manifest；清理 WeChat HTML/SVG/CSS、本地/临时 URL 并通过 validator。
- [ ] 通过真实可见 paste/import/upload 入口导入，不写 Draft.js internal state。
- [ ] 读回标题/heading、正文、强调、列表、引用、代码语言、表格、公式、图片 alt/caption 与 host；
  raw syntax 未转换时如实标为 manual/blocked。
- [ ] 绑定最终 release/artifact fingerprints；不点击发布，清理/丢弃测试内容。

### Slice 7 — Integrated review and closeout

- [ ] 任一外部实测暴露产品缺陷时回到 Slice 1/2，修复共享根并重建 release。静态平台分别生成
  `releaseArtifactReceipt`（current EXE/producer → exact artifact）和 `platformReadbackReceipt`
  （exact artifact + ingress/target → 外部读回）；EXE 变化重跑前者与 shell，逐字节相同时可连接原
  platform receipt。WeChat API 使用独立 `wechatApiLiveReceipt`，current EXE/backend/schema/cleanup/
  account capability 任一变化都重跑 live round trip；docs-only 不触发重跑。
- [x] 运行 GitNexus `detect_changes(scope=all)`，将全局 dirty-worktree 风险与精确任务 diff 分开审查。
- [x] 两名独立只读 Sol reviewer 分别审查 correctness/security 与 scope/evidence；主线程处理 findings
  后重跑最小相关门禁。
- [x] 运行精确 `git diff --check` 和敏感扫描；确认无凭据、profile、账号、QR/HAR、私有稿或资源 ID。
- [x] 更新相关 spec、平台规则、task evidence 和 completion report；明确未发布、未手机、未同步边界。
- [x] 未经用户明确要求不 stage、commit、push 或创建 PR。

## 4. Focused validation commands

实际命令以最终变更文件收敛，重型检查保持串行：

```bash
pnpm -C inkforge exec vitest run \
  src/services/export/delivery-adornments.test.ts \
  src/services/export/writing-components-platform.test.ts \
  src/services/export/wechat-publish.test.ts \
  src/services/export/platform-export-rendering.test.ts \
  src/services/export/xhs.test.ts \
  src/services/export/zhihu.test.ts \
  src/views/__tests__/WorkstationView.desktop-layout.test.ts \
  src/views/__tests__/WorkstationView.focus-collision.test.ts \
  src/views/__tests__/WorkstationView.vignette.test.ts \
  --reporter=default --maxWorkers=1 --no-file-parallelism

pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism

pnpm -C inkforge exec eslint <exact-changed-source-and-test-files> --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
pnpm -C inkforge style-proof:application-preflight
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge exec tauri build

pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs \
  --spec tests/e2e/specs/native-runtime.spec.cjs \
  --spec tests/e2e/specs/editor-settings.spec.cjs \
  --spec tests/e2e/specs/svg-render.spec.cjs
```

If Rust command behavior changes, run the smallest matching Cargo test target before Tauri build.
If build rewrites `inkforge/tsconfig.tsbuildinfo`, restore only that generated file after verifying the
build result; do not reset unrelated worktree changes.

## 5. Evidence checklist

- [x] final release EXE SHA-256;
- [ ] exact WeChat/XHS/Zhihu artifact SHA-256 and manifest fingerprints;
- [x] every required row has one of `not-run` / `local` / `platform-editor-rendered` /
  `manual-native-insert` / `blocked` / `invalidated`; `published=false` is a separate field;
- [x] registry-derived full component matrix and generated shell lifecycle matrix contain no unknown,
  omitted, duplicate, unexecuted, or stale-hash row;
- [ ] WeChat official image/cover/draft success and failure readback;
- [ ] WeChat draft add/get/list-reconcile/delete/marker-absence cleanup and digest 120/121 parity;
- [ ] WeChat native component target/surface/identity/order/cleanup readback;
- [x] per-occurrence ephemeral identity and unique-anchor readback;
- [x] native shell default/reduced-motion window/focus/keyboard/geometry readback;
- [x] shell capability table plus app-only/OS-only/both-off/zero-duration motion rows;
- [ ] XHS target editor, text/image order, leakage/crop readback, published=false;
- [ ] Zhihu target editor, semantic blocks/image host/alt/caption readback, published=false;
- [ ] linked static releaseArtifact/platformReadback receipts plus separate WeChat API live receipt;
- [x] no-sensitive-artifact scan;
- [x] final diff and two-reviewer reconciliation.

## 6. Rollback points

1. Optional media/handoff fields can roll back without rewriting old JSX/Settings.
2. Official WeChat command changes are isolated from native manual insertion state.
3. Manager/stage/inspector/window fixes are sliced by existing state boundary; no user content migration.
4. XHS/Zhihu external evidence is disposable and never changes canonical source by itself.
5. A platform failure restores honest fallback/blocked state rather than deleting the component or loosening validation.

## 7. Stop rules

- 用户未批准本规划最终摘要：停在 planning，不运行 `task.py start`。
- GitNexus HIGH/CRITICAL 未评审：停止编辑对应 symbol。
- 只能用 mock、样例账号、假图片、假 ID 或私有平台接口才能通过：标记 blocked，不实现伪能力。
- 任一必需 test/build/native/external-editor gate 失败：不得报告任务完成。
- 任一 required row 为 `not-run`、`manual-native-insert`、`blocked` 或 `invalidated`：对应 AC 保持
  未完成；准确记录边界不能替代成功。
- 外部平台要求发布才能验证：停止在发布前，将该行交给用户手测，不代替用户点击发布。

## 8. 2026-08-09 最终 release 本地验收状态

### 8.1 此前本地门禁（2026-08-09 21:06 后已失效）

- `INVALIDATED`：此前 release `InkForge.exe` 为 17,781,248 bytes，SHA-256
  `f15a58e15895b930306c07ce2dc5057ae66d84f3043fba669b51d6b4f52bc439`。
- `INVALIDATED`：`native-shell-lifecycle.spec.cjs` 在默认动效下连续两次均为
  `1 passing / 1 skipped`；OS-only reduced-motion 运行是 `2 passing`。验收后再次读取 Windows
  client-area animation 为 `True`，系统设置已恢复。
- `INVALIDATED`：`platform-artifact-release.spec.cjs` 连续两次通过，均从此前软件的
  可见导出入口、原生文件/目录窗口写出 XHS 与 Zhihu 产物；测试未调用发布入口，
  `published=false`。
- `INVALIDATED`：聚焦回归 `9 files / 480 tests`；保存的完整 export suite 日志实际为
  `51 files / 1496 tests`（此前 `1497` 记录错误）。精确
  ESLint、`vue-tsc --noEmit`、production build、application preflight 全部通过。
- `INVALIDATED`：`cargo fmt --check`、`cargo check` 与 `cargo test commands::wechat -- --nocapture`
  通过，微信后端为 `28 passed / 0 failed`。

以上记录仅保留为历史基线。独立审查发现的 release/source 绑定、同名覆盖、SSRF、原始 ID、动态矩阵
和 manifest 断言缺口已进入后续整改；旧 hash 不得重新连接当前证据。

### 8.2 当前本地 release 门禁

- `LOCAL-RELEASE-PASS`：当前 `InkForge.exe` 为 17,797,632 bytes，SHA-256
  `524b72a5fa1b4b72832aff88460a7487fbffbed8024035fb4221b29966e32791`；artifact producer 为
  `export-source-set-v1:62`，SHA-256
  `88c35464733fb2f309e895dad536a8a9575c6292f61043f87a5de5a1f3440cf3`。当前二进制包含最终焦点修复和
  Zhihu 本地字节生成/平台上传门禁分离修复，之后仅修改 E2E 验收、证据和文档。
- `LOCAL-RELEASE-PASS`：动态 shell 能力表包含 3 个 panel、3 个 runtime widget；默认 Windows 动效
  `1 passing / 1 skipped`，OS-only reduced motion `2 passing`。真实指针、键盘、焦点、hover geometry、
  dock/float/native/close/redock、真实 Win32 `WM_SYSCOMMAND/SC_CLOSE`、10 轮快速切换和真实进程重启
  恢复全部通过；系统动画恢复并回读为 `True`。
- `LOCAL-RELEASE-PASS`：可见 release UI 与原生文件/目录窗口真实写出 6 张 1080×1440 XHS PNG、
  plain text、clean Zhihu Markdown、图片 fallback 和两个 manifest；receipt 绑定 current EXE、producer
  及逐文件 SHA-256。Zhihu 输出 manifest 保持 `requirePlatformUpload=true`、`uploaded=false`、
  `hostStatus=local-only`；工厂仅使用不持久化的 relaxed clone 构造并校验本地元数据与真实字节，
  `convertToNativeFormat()`、返回的 `nativeResult`、写盘 manifest 与 publish/platform 门禁始终接收严格
  `requirePlatformUpload=true` manifest。`platformReadbackReceipt.status=not-run`，`published=false`。
- `LOCAL-PASS`：完整 Vitest 为 `145 files / 2156 tests`，完整 export suite 为
  `51 files / 1503 tests`；精确 ESLint、`vue-tsc`、CJS syntax、production build、host/WebView bounds、
  application preflight、`cargo fmt --check` 与 `cargo check` 通过。Rust 微信命令 `31 passed`，桌面命令
  `6 passed`。
- `LOCAL-RELEASE-PASS`：最终 Tauri release build 生成 EXE、MSI 与 NSIS；MSI 为 225,366,016 bytes，
  SHA-256 `13f75d77b83c1ca6645ccdbd67336fdb2e2305fbd98e33a0e985a5d41ac78488`；NSIS 为
  226,884,560 bytes，SHA-256
  `c5e74cdfa2c620b6b246dbae3857c7a397746055c905179df13160ff144be660`。
- `LOCAL-PASS`：GitNexus 增量重建为 23,059 nodes / 42,203 edges / 1,201 clusters / 300 flows；仓库级
  大型 dirty worktree 的 `detect_changes(scope=all)` 为 185 files、1,136 changed symbols、111 affected
  processes、`critical`。这是全工作树风险，不可外推为本任务精确 diff 风险；
  `buildZhihuArtifactBundle` 预编辑 impact 为 `LOW`、1 个 direct caller、1 个本地导出 process，最终 E2E
  helpers `waitForWidgetPlacement` 与 `interactWithOwnedNativeDialog` 为 `LOW`、0 affected process。

完整当前收据见 `evidence/local-release-acceptance-20260809.md`。

### 8.3 外部门禁

| Gate | Current state | Exact boundary |
| --- | --- | --- |
| WeChat official draft live round trip | `blocked` | 当前运行环境无可用官方凭据，未调用 add/get/delete |
| WeChat native song/profile/media editor readback | `blocked` | 既定专用浏览器会话到达登录页，但登录态已失效 |
| XHS exact artifact editor readback | `blocked` | release 产物已写出；创作中心登录态已失效，未上传 |
| Zhihu exact artifact editor readback | `blocked` | release 产物已写出；写作入口登录态已失效，未导入 |

浏览器未进行粘贴、上传、保存、手机预览、同步、定时、群发或发布。外部账号动作的脱敏记录见
`evidence/external-auth-gate-20260809.md`。因此 Slice 4/5/6、AC-02 的 live gate、AC-04、AC-08 的
外部半段、AC-09 的外部半段和 AC-11 仍不能勾选，任务保持 `in_progress`。
