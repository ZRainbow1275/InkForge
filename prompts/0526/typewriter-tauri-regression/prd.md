# PRD — 打字机 Tauri 退化（浏览器 E2E 全过但 Tauri 全无效）

## 症状

User 0526 commit `fbc1662` 后手测 Tauri：

> "打字机依然没有实装"

浏览器 Playwright E2E 全过：dim 分布、sentence dim、sidebar 伪元素、idle attr、slider sync、persist 6 项均拍照存档（`prompts/0526/verification-evidence/*.png`）。Tauri webview2 全无效。

## Root cause hypothesis（3 选 1）

**H1 — Tauri 实例陈旧**：`b39mg0gvr` 这次 Tauri dev 是在 commit `fbc1662` 之前编译的，user 操作的窗口跑旧 bundle。Vite HMR 不重启 TipTap Editor 实例 → 旧 plugin 闭包。

**H2 — WebView2 渲染差异**：Tauri Windows 用 Edge WebView2，与 Playwright chromium 在以下机制可能不同：
- CSS `transition: opacity` Tauri 默认关 GPU 加速？
- `position: absolute + ::before` 渲染优先级？
- ProseMirror dispatch 在 WebView2 上的 reflow 顺序？

**H3 — 反应性在 Tauri 断**：`settingsStore.settings.editor.typewriterMode` 是否在 Tauri webview window 上 watch 不到？（Vue reactivity 与 Pinia 在 WebView2 应等同，但需排除）

## Diagnostic protocol（user 操作）

1. **Tauri 窗口右键 → Inspect**（或 Ctrl+Shift+I）开 devtools
2. console 输入：
   ```js
   window.__inkforgeEditor.extensionManager.extensions.find(e=>e.name==='typewriterMode').options
   ```
3. F9 切打字机 → 再次输入 ↑ 命令
4. 观察打印分支：

| 分支 | 现象 | 结论 |
|---|---|---|
| A1 | `__inkforgeEditor` 未定义 | Tauri 跑旧代码（H1） → user 硬重启 Tauri |
| A2 | `enabled` 不随 F9 变化 | 反应性断（H3） → 改 watch source |
| A3 | `enabled: true` 但视觉无变 | WebView2 渲染问题（H2） → 加 GPU accel hint / inline style 兜底 |
| A4 | console.debug `[typewriter] decorations call` 不打印 | plugin 未挂（H3 严重型） → 检查 extension registration |

## Decision

**Phase A — 等 user devtools diagnostic 回报，不动业务代码**

Phase A 不写任何修复代码。等 user 报告 A1/A2/A3/A4 后定向修。

**Phase B — 按分支修**

- **A1**: hard-restart Tauri，kill `tauri-app.exe` + `node` + `cargo` 残留，`npm run tauri:dev` 全冷启
- **A2**: `EditorPanel.vue` watch source 改 `() => writingAssistStore.typewriterMode`（不依赖 deep）
- **A3**: `TypewriterMode.ts` decoration 加 inline `style: 'opacity: 0.5'` 兜底（Phase 1 验证有效路径）；或 `.typewriter-dim-*` 加 `will-change: opacity`
- **A4**: 检查 EditorPanel extensions 数组是否真含 `typewriterMode`；可能 SmartPunctuation throw 阻断

## Files Touched

### Phase A
无（仅 diagnostic 协议输出给 user）

### Phase B（最坏情况）
- `inkforge/src/components/editor/EditorPanel.vue` — watcher 收窄 / extension 排查
- `inkforge/src/extensions/TypewriterMode.ts` — inline style 兜底
- `inkforge/src/styles/design-system.css` — `will-change: opacity` GPU hint

## Acceptance Criteria

- [ ] Phase A: user devtools 回报分支
- [ ] Phase B: F9 后 Tauri 窗口**视觉上**出现 dim/sidebar/scroll
- [ ] `npm run typecheck` / `lint` / `test` 全绿
- [ ] 不退化已 commit Phase 2 浏览器层成果

## Out of Scope

- 不再跑浏览器 E2E（已 6 项证据）
- 不并入 preview-device-size / mobile-typography 任务
