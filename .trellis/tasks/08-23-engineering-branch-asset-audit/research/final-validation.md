# Final integration validation

日期：2026-08-23
验证产品 tip：`732b4791df4bdfc6b5067fd6c38b127b2629e83c`

## Git 与恢复

- `origin/main` 正常双亲合并及三个 `-s ours` ancestry merge 的 parent/tree/ancestor 断言全部通过；当前工作树在验证副作用恢复后无 tracked diff。
- 外层 S0 bundle 在隔离仓库恢复 `15` 个 refs，nested repository bundle 恢复 `4` 个 refs；两者 `git fsck --full` 均通过，临时恢复目录已精确移除。
- 当前外层 `git fsck --full` 无 missing/corrupt object，报告 `339` 个 dangling blob 和 `1` 个 dangling commit；它们是历史 index/工作树快照遗留对象，不是完整性错误。nested `git fsck --full` 为 `0` dangling。
- repository-side nested bundle SHA-256 为 `567af392c337b08a2c21d91b0c3c30625c54c33a46ed4f6cb0824699e4fad896`，与 S0 完全一致；两个 WIP exact refs 分别恢复为 `59feabcd3c6538bb984d3d4ce7577fabfb19a88f` 和 `ca59620b45da1fe0c35184335545d345652c97e2`。
- GitNexus MCP 的最终调用连续两次返回 `Session not found` HTTP 404；按 fallback 契约改用仓库 `.gitnexus/run.cjs detect-changes --scope all --repo InkForge`，结果为 `No changes detected`。GitNexus index 仍落后，最终判断以实时 Git、测试、构建和运行证据为准。

## 自动检查

| Gate | Result |
| --- | --- |
| Vitest targeted retry | 超时用例单独运行 `1 passed / 14 skipped`，用例耗时约 `2.57s` |
| Vitest full | 默认高并发首次为 `2155/2156`，同一 `5000ms` 资源竞争超时；`--maxWorkers=4` 干净重跑为 `145 files / 2156 tests passed` |
| TypeScript | `pnpm typecheck`，exit `0` |
| ESLint readonly | `eslint src --ext .ts,.tsx,.vue`，`0 errors / 800 warnings`，exit `0` |
| Web build | `pnpm build`，`5580 modules`，exit `0` |
| Rust format/check/test | `cargo fmt --check`、`cargo check --locked`、`cargo test --locked` 全部 exit `0`；Rust tests `41 passed` |
| Tauri bundle | 首次 release compile 成功但 Microsoft WebView2 下载 TLS EOF；按 Tauri 1.x 原生缓存规则放入 Microsoft 签名有效的官方 offline installer 后，原配置无修改重跑成功生成 MSI 与 NSIS |

Vitest 每次会重写 10 个既有 fidelity HTML/stats 文件；每次都先断言变更集合精确相等，再从 S0 payload 恢复与 `HEAD` 相同的原始字节。Web/Tauri build 重写的 `inkforge/tsconfig.tsbuildinfo` 同样按 exact path 恢复为 `HEAD` bytes。

最终 staged `diff --check` 只剩 `final-vitest.log` 的一个 `new blank line at EOF`；该文件是原始命令输出证据，未为通过格式检查而改写。作者维护的 Markdown/JSON 无 whitespace error。

## 产物与真实运行

- release executable：`82e7702869fe0e0a0f973dff09f8069948d4b32088af9d18cb2a6b878b42bd04`，`17797632` bytes。
- MSI：`14593f2422c9176c34fe85362a5538538a74f4ae60db35131b0960a0913031bb`，`228712448` bytes。
- NSIS：`670d853381c9a4a5e508337700cb4b12af5c7fe617b0a89e2775caaf1fd368ce`，`230273058` bytes。
- WebView2 offline installer 位于外部 Tauri cache，不进入仓库；固定长度 `212949712` bytes，SHA-256 `82b2d8a7013e0c0ea15d48ff4742ee3778ba16bd8b7b4a47876645b3e48d4016`，Authenticode `Valid`，signer 为 Microsoft Corporation。
- release executable 在隔离 `APPDATA` / `LOCALAPPDATA` / WebView2 user-data 下启动；8 秒后进程仍 alive/responding，观察到标题为 `InkForge` 的 native window 和绑定隔离 user-data 的 WebView2 child。随后只停止该 task-created process tree，并移除隔离数据。
- Computer Use native pipe 不可用，故未声称原生窗口交互验收。作为补充，production preview 在独立 Playwright Chromium 中以 `1400x900` 渲染首页，标题、可访问树和截图均正常，console `0 errors / 0 warnings`；截图已人工检查，不含 secret。
- CloakBrowser 首轮有 8 个外部字体 CSP error；DOM 只发现应用 bundle 和 `chrome-extension://ibefaeehajgcpooopoegkifhgecigeeg/data-poster.js`，应用 DOM 不含对应 URL。切换无扩展 Playwright 后错误归零，因此将其归类为浏览器扩展注入，不冒充应用 console failure。

## Secret gate

- integration history：Gitleaks 扫描 `718` commits，4 个 redacted finding；其中 2 个是同一已撤销旧 bearer 在 `.mcp.json` 的历史出现，2 个是已人工复核的 MHTML false positive。
- current directory：36 个 redacted finding，仍精确为 GitNexus 内容 hash `34` 个和同一 MHTML false positive `2` 个；新增验证日志、JSON 和截图没有命中。
- 旧 bearer 两个历史出现已验证为同一 16 字符值；此前最终探针为 unauthenticated `401`、旧值 `403`、替代值 `200`。仓库报告不保存其值。

## Remaining boundary

自动、构建、恢复和非交互真实运行门已通过。本地 `main` 已 fast-forward 至验证产品 tip；远端 race check 确认 `origin/main` 仍为 `7640cae929ac48240f4877cb081d9ef4790a24fe` 后完成普通 push，随后以 docs-only 回执提交收敛到 `fd37133abe2f5743b2e549130f4b741815ecec7b`，本地、tracking ref 与 `git ls-remote` 回读一致。用户随后明确表示人工验收以本任务已经完成的验证证据为准并要求继续，因此产品验收门通过。删除前又重新逐项核对两份 S0，并在隔离仓库恢复 repository-side nested bundle、核对两个 WIP exact ref、执行 `fsck`；Phase 5 可以开始。
