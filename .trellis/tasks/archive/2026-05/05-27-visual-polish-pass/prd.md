# Visual Polish Pass: Logo / Icons / Splash / Loading / Titlebar

## Goal

对 InkForge 从「双击图标 → 首屏可交互」全链路的视觉接触点做一次系统化品牌投射。把 `docs/inkforge-brand-identity.md` 沉淀的设计系统（Graphite + Kiln + Tempera + Amber + ◇ 印章 + Forge Line）从「纸面规范」落地为「可执行 chrome 资产」。让 InkForge 的「外表」从「能用」升级到「值得截图分享」。

## Requirements (locked)

### 命名

- 产品中文名：**「墨铸」**（NOT「墨锻」— 覆盖 brand identity v1.0 拼写偏差）
- Tagline：**「成为作者吧」**
- 所有品牌位（splash / loading / about / welcome / titlebar tooltip）统一使用「InkForge · 墨铸 · 成为作者吧」组合
- `index.html` title：`InkForge - 墨铸编辑器`

### 视觉资产工艺

- 全部 icon / 装饰元素以 **SVG 为源** 入仓（含 logo、favicon、splash 装饰、loading 印章、titlebar 控件 icon）
- 必须符合现有 brand identity 调性（色板、CJK-first、匠人/锻造叙事、温暖精确）
- 平台 raster（.ico / .icns / PNG）由 SVG master 通过构建脚本生成，SVG 是 source of truth

### MVP 模块（已锁，4 模块全包）

1. **Core brand chrome**：Logo SVG master + 品牌 favicon + title 修正 + error boundary 配色修正
2. **App icon 全套重生**：从 SVG master 跨平台生成全套尺寸 ICO/ICNS/PNG
3. **Tauri 原生 splash window**：主窗口 `visible: false`，Rust 启动 splash 子窗口 → IPC `app_ready` 关闭切换
4. **HTML loading + titlebar 品牌化**：index.html 内嵌 CSS-only loading + Tauri `decorations: false` 自定义 titlebar

### 设计决定（已锁，全部由 user 在 brainstorm 中选定）

| 维度 | 决定 |
|---|---|
| **Logo 主体** | A. 「铸」字方印（Kiln 朱砂底 + Graphite 阴文 + ◇ 印章符号衬底） |
| **Splash 视觉** | D. 宣纸墨痕（仿宣纸 Vellum 纹理 + 印章降落 + 墨痕从印章边缘 8 方向 radial 渗透） |
| **HTML loading** | A. Splash 延续（印章静态缩小版 + 「正在准备墨砚...」+ Vellum 背景 + CSS-only 零 JS） |
| **Titlebar 程度** | 2. 中度（Win: `decorations:false` 自绘 min/max/close + Kiln hover；macOS: `titleBarStyle: "Overlay"` 保留 traffic light） |
| **Dark mode** | A. 跟随系统 + IPC 同步（Rust setup hook 读 system theme，splash + main 初始 DOM 注入 data-theme） |
| **Splash 关闭时机** | B. IPC `app_ready` 同步 + 3s timeout 兜底 |
| **Icon 跨平台覆盖** | A. 完整工业级（Win .ico 7 size / macOS .icns 8+@2x / Linux PNG 5 size，SVG master 预留 22% padding 防 Win11 切角与 macOS squircle） |

## Acceptance Criteria

### 启动链路

- [ ] 启动 `InkForge.exe` / `.app` / Linux binary 后 0 白闪（主窗口 `visible:false`，splash 立即接管）
- [ ] Splash 显示「铸」印章 + 「InkForge / 墨铸」wordmark + tagline「成为作者吧」+ 宣纸墨痕动画
- [ ] Splash 总动画 600–800ms（印章降落 300ms + 盖印瞬间 60ms + 墨痕渗透 440ms）
- [ ] `prefers-reduced-motion: reduce` 用户：splash 跳过动画，直接静态显示
- [ ] Vue `onMounted` 后立即 emit `app_ready` → Rust 关闭 splash + show 主窗口（90%+ 场景总耗时 ≤ 800ms）
- [ ] 后端崩溃 / Vue 异常导致永不发 `app_ready` 时，3s 强制 timeout 切主窗口（防 splash 永久卡死）
- [ ] reload (F5 / Tauri devtools) 场景：index.html 内嵌印章静态 + 「正在准备墨砚...」CSS-only 占位 → Vue 挂载后自动 innerHTML 覆盖

### 品牌一致性

- [ ] 任务栏 / Dock / Alt-Tab / Win11 Start 显示「铸」印章 logo，16/32/256/1024 均清晰无模糊
- [ ] 浏览器 tab 显示「铸」印章 SVG favicon
- [ ] `index.html` `<title>` 为 `InkForge - 墨铸编辑器`
- [ ] App.vue 错误边界按钮配色：主 Kiln `#D95B3F` / 次 Tempera `#3B7A6B`，**禁用 `#0066cc`**
- [ ] `docs/inkforge-brand-identity.md` 全文「墨锻」→「墨铸」+ 新增 §9 Logo / §10 Splash / §11 Loading / §12 Titlebar 章节

### Titlebar

- [ ] Windows: 自绘 min/max/close 按钮（Kiln hover 反馈），左侧嵌入印章 logo + 当前文档名（无文档时显示 tagline），整条区域 `data-tauri-drag-region` 可拖拽
- [ ] Windows Snap (Win+左/右/上 + 边缘拖拽 maximize) 仍可用
- [ ] macOS: `titleBarStyle: "Overlay"` + `hiddenTitle: true`，保留 native traffic light（红黄绿），内容 inset 28px 顶部 padding
- [ ] Titlebar 暗色主题：Char `#1A1D24` 底 + 浅色文字，IPC 同步切换

### 跨平台 Icon 完整度

- [ ] `inkforge/src-tauri/icons/master.svg`（1024×1024 SVG 源，预留 22% padding）
- [ ] Win `.ico`：含 16/24/32/48/64/128/256 七 size
- [ ] macOS `.icns`：含 16/32/64/128/256/512/1024 + 1024@2x
- [ ] Linux PNG：32/64/128/256/512 五 size
- [ ] favicon SVG: 32×32 优化版本（去除 padding，提升小尺寸辨识）
- [ ] Win11 圆角自动剪切后印章主体仍居中、不被切到「铸」字

## Definition of Done

- [ ] `pnpm tauri build` 通过 (Windows .msi + macOS .dmg + Linux .deb/.AppImage)
- [ ] `pnpm tauri dev` 完整启动链路手动验证 (双击 → splash → 主窗口 → reload)
- [ ] 视觉回归截图存档至 `prompts/0527/visual-polish-evidence/`：logo 1024×1024 / splash 三帧 (0ms/300ms/800ms) / HTML loading / 暗色 splash / Windows titlebar / macOS titlebar
- [ ] Brand identity 文档完成「墨铸」正名 + 新增四章节规范
- [ ] 不破坏现有 router-view 路由切换 / error boundary / WelcomeModal / HelpCenter / CommandPalette / UpdateToast
- [ ] reduced-motion 用户验证 (Windows 设置 → 关闭动画 / macOS 辅助功能 → 减少动画)
- [ ] gitnexus_impact 跑 `App.vue` / `tauri.conf.json` / `index.html` 编辑前 d=1 检查

## Out of Scope (locked)

- 系统托盘 icon / 后台驻留（v2.1+）
- App icon 状态变体（idle/busy/error 动态切换）
- About / Welcome modal / FTUE 重设计（独立任务）
- 内部 view（编辑器、Hub、设置）视觉微调（独立任务）
- 错误边界以外的 UI 配色全量审计（独立 brand audit 任务）
- 字体加载策略 / FOIT/FOUT 处理（独立任务）
- 安装包 (msi/dmg) 安装向导自定义品牌化（独立任务）

## Technical Approach

### 实现分层

```
┌─────────────────────────────────────────────────────────────┐
│ Rust 端 (src-tauri/)                                        │
│  ├─ tauri.conf.json: main visible:false + decorations:false │
│  ├─ src/splash.rs: 创建 splash window + close handler       │
│  ├─ src/main.rs: setup hook 读 dark-light + spawn splash    │
│  ├─ src/commands/app_ready.rs: IPC 监听 + 关闭 splash       │
│  └─ icons/master.svg + 生成脚本 (build.rs 或 pnpm script)   │
├─────────────────────────────────────────────────────────────┤
│ 前端 (src/)                                                  │
│  ├─ index.html: 内嵌 CSS-only HTML loading + favicon link    │
│  ├─ public/splash.html: splash 子窗口内容 (CSS-only 动画)    │
│  ├─ src/components/chrome/TitleBar.vue: 自定义 titlebar     │
│  ├─ src/services/app-lifecycle/notifyAppReady.ts: IPC emit  │
│  └─ src/App.vue: onMounted 调用 notifyAppReady + 修配色      │
├─────────────────────────────────────────────────────────────┤
│ Brand assets (新增)                                          │
│  ├─ assets/brand/logo-master.svg                            │
│  ├─ assets/brand/favicon.svg                                │
│  ├─ assets/brand/splash-illustration.svg (墨痕装饰)         │
│  └─ scripts/build-icons.mjs (SVG → 跨平台 raster)           │
└─────────────────────────────────────────────────────────────┘
```

### IPC Handshake 协议

```
Rust (setup hook)
  ├─ 1. detect system theme (dark-light crate)
  ├─ 2. spawn splash window (visible:true, transparent + always-on-top)
  ├─ 3. inject ?theme=dark|light query to splash url
  ├─ 4. listen event "app_ready" (max 3s timeout)
  └─ 5. on receive | timeout:
       ├─ splash.close()
       └─ main.show()

Frontend (App.vue onMounted)
  └─ await nextTick() → invoke('emit_app_ready')
```

### Reduced-motion 兜底

```css
/* splash.html + index.html 共享 */
@media (prefers-reduced-motion: reduce) {
  .ink-seal,
  .ink-bleed,
  .ink-wordmark { animation: none !important; opacity: 1 !important; }
}
```

## Decision (ADR-lite)

**Context**: Brand identity v1.0 文档定义齐备但代码 0 落地，Tauri 仍用默认占位 icon，启动白闪，错误边界违反 brand doc 配色禁忌。
**Decision**:
- 用户名锁定「墨铸」（覆盖文档拼写偏差），所有视觉资产以 SVG 为 source of truth
- 选 D 宣纸墨痕 splash（人文调性最契合作家产品）+ A IPC 同步 dark mode（启动链路零白闪）
- Titlebar 用「中度」方案（Win 自绘 + macOS overlay）平衡品牌感与系统熟悉度
**Consequences**:
- Win Snap / Win+arrow / 边缘 maximize 需要专门测试（decorations:false 副作用）
- Splash IPC 需要 Rust + TS 双端协议，引入 `dark-light` crate
- macOS overlay 模式需要每个 view 顶部预留 28px padding（Tauri 1.x 已知约束）
- Reduced-motion 用户跳过墨痕渗透，但仍能看到静态印章 + wordmark + tagline

## Research References

未启用 trellis-research sub-agent — 所需信息全部从 repo 内 brand doc + Tauri 1.x 公开文档可知。如实施阶段遇到具体 Tauri API 不清晰再 spawn。

## Technical Notes

- Brand identity: `docs/inkforge-brand-identity.md`
- Tauri config: `inkforge/src-tauri/tauri.conf.json`
- Icon dir: `inkforge/src-tauri/icons/`
- App entry: `inkforge/src/App.vue` (error boundary line 308-373 + colors line 522)
- Index HTML: `inkforge/index.html` (line 5 favicon + line 8 title)
- Tauri 1.x splash: https://tauri.app/v1/guides/features/splashscreen
- `dark-light` crate: https://crates.io/crates/dark-light
- Tauri icon CLI: `cargo tauri icon <path-to-master.png>` (可生成全套但不读 SVG，需 svg→png→icon 链)
- Build script lib 候选：`sharp` (node) 或 `resvg-cli` (Rust)，前者已在 npm 生态熟悉
- 验证截图存放：`prompts/0527/visual-polish-evidence/`

## Implementation Plan (3 PRs)

### PR1 — Brand Assets Foundation（小，可独立）

1. 设计 `assets/brand/logo-master.svg`（「铸」字方印，1024×1024，预留 22% padding）
2. 设计 `assets/brand/favicon.svg`（32×32 优化版）
3. 写 `scripts/build-icons.mjs`（SVG → Win .ico 7 size / macOS .icns 8 size / Linux PNG 5 size）
4. 替换 `inkforge/src-tauri/icons/` 全部文件
5. 替换 `inkforge/public/favicon.svg`（或新建），更新 `index.html` link 与 title
6. 修 `App.vue` 错误边界配色（Kiln + Tempera）
7. 更新 brand identity 文档「墨锻」→「墨铸」+ 新增 §9 Logo 章节
8. 视觉回归 evidence 截图（app icon 16/32/256/1024 + favicon）

### PR2 — Splash Window + IPC Handshake（中，工程主体）

1. `tauri.conf.json`: main window `visible: false` + 加 splash window 定义
2. `inkforge/src-tauri/Cargo.toml`: 加 `dark-light` 依赖
3. `inkforge/src-tauri/src/splash.rs`: spawn splash + close handler
4. `inkforge/src-tauri/src/main.rs` setup hook：detect theme + spawn splash + IPC listener + 3s timeout
5. `inkforge/src-tauri/src/commands/app_ready.rs`: 新 IPC command
6. `inkforge/public/splash.html`: 宣纸墨痕 splash 子窗口内容（CSS-only animation + reduced-motion fallback）
7. `inkforge/src/services/app-lifecycle/notifyAppReady.ts`: 前端 emit 工具
8. `inkforge/src/App.vue` `onMounted`: await nextTick + notifyAppReady
9. 暗色模式：splash URL `?theme=dark|light` + CSS 切换
10. 更新 brand identity 文档新增 §10 Splash 章节
11. 视觉回归 evidence：splash 三帧 (0ms/300ms/800ms) light + dark

### PR3 — HTML Loading + Titlebar Chrome（中，UI 落地）

1. `inkforge/index.html`: 在 `#app` 内嵌静态印章 + 「正在准备墨砚...」+ Vellum 背景 + dark mode media query
2. `tauri.conf.json`: Windows `decorations: false` + macOS `titleBarStyle: "Overlay"` + `hiddenTitle: true`
3. `inkforge/src/components/chrome/TitleBar.vue`: 新组件（嵌入式 logo + 文档名 + Win 自绘按钮 + drag region + Kiln hover）
4. `inkforge/src/App.vue`: 路由外层包 `<TitleBar />`，处理 inset padding（macOS 28px / Windows custom height）
5. macOS / Windows 平台分支（用 `useOSPlatform` 或 `import.meta.env`）
6. Snap / Win+arrow / 边缘最大化测试
7. 更新 brand identity 文档新增 §11 Loading + §12 Titlebar 章节
8. 视觉回归 evidence：HTML loading reload 场景 + Windows titlebar + macOS titlebar
