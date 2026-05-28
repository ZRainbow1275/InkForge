# Elevate Visual to Stunning — Inkstone Glass Titlebar + Client-wide Polish

## Goal

用户测后反馈"目前整个客户端不够惊艳"。本任务把 InkForge 客户端从"功能完整的桌面 Markdown 编辑器"提升到"premium 写作工具"视觉/交互档次。

不是 cosmetic 微调; 是品质感 / 视觉信号 / 微互动 / 排版严谨度 的整体跃迁。和 Bear / Ulysses / iA Writer / Linear / Arc 同一档次, 但保持 "笔耕铸字 · 印章 · Vellum / Kiln / Graphite / Amber" 的独有品牌语言。

## What I already know

### Brand 已锁

- 名: 「InkForge · 墨铸」, tagline "成为作者吧" (canonical, 见 `feedback_brand_canonical_naming`)
- Palette: Kiln #D95B3F · Graphite #252933 · Amber #C19A56 · Vellum #F5F0E6 · Hearth #EDE7DB · Tempera #3B7A6B · Char #1A1D24 · Ash #6E7580 · Smoke #9B958D · Hairline #DED7CA · Kiln-dark #B84A30 · Kiln-light #E8734F
- Brand mark: Forge Nib (Kiln seal + Graphite 菱形 + Vellum slit + Amber forge line), 已 ship 在 `ForgeNibMark.vue`, 5 处一致 (e87f283)
- Typography: Source Han Serif SC / Noto Serif SC for CJK, EB Garamond / Crimson Pro for Latin, monospace for code

### Titlebar 方向已锁 (Inkstone Glass)

```
[ 🔥 InkForge · 我的文章...               —  ▢  ×   ]
  ↑                ↑                       ↑
  20px Forge Nib  EB Garamond italic     50px controls
  + Kiln 4px glow  serif muted doc title  Kiln hover ripple
  hover scale 1.06 opacity 0.72
  
背景: rgba(245,240,230,0.92) + backdrop-filter: blur(20px) saturate(140%)
底: ember gradient (transparent → Kiln 25% → transparent)
高: 36px (vs 32)
```

- 左锚 seal+wordmark (Linear/VSCode 范式)
- 无活跃 doc 时中心**静默** (不再 "成为作者吧" 兜底)
- 微互动: seal hover scale 1.06 + Kiln glow, controls hover Kiln 8% bg

### 当前各 surface 状态

- TitleBar: 已是 e87f283 后的"修复 + 14px seal + 软化 border", 但仍是平条
- Hub: `inkforge/src/views/HubView.vue` — 大文件 (5000+ 行), header brand 已用 ForgeNibMark, 但卡片层次、hover、字体节奏需打磨
- Workstation: `inkforge/src/views/WorkstationView.vue` — 工具栏 + 写作主区, 当前简洁但缺质感
- Settings: `inkforge/src/views/SettingsView.vue` — 12 tabs, 排版有空间提升
- Welcome / Splash: 已 Forge Nib ship, 动画 OK
- Dark mode: 每 surface 都有 `[data-theme='dark']` 分支, 但深色面板 elevation / shadow 节奏可能不一致

### 技术约束

- Tauri 1.x WebView2 (Win) / WKWebView (mac) / WebKitGTK (Linux) — 三端 `backdrop-filter` 支持差: WebView2 ✓ / WKWebView ✓ / WebKitGTK 部分 (依赖发行版). 需 fallback (无 backdrop-filter 时降级为半透明 Vellum)
- `prefers-reduced-motion`: 微互动必须降级 (transform / scale / glow 关闭, opacity 保留)
- `prefers-color-scheme` + `:root[data-theme]` dual contract
- Vue 3 scoped style (CSS var override 通过 `:global()`)
- 不破坏 e87f283 已修的 drag/buttons/IF/Forge Nib 一致性

## Assumptions (to validate)

- "惊艳" 不等于 maximalist — 适度克制 + 精细打磨 > 过度装饰
- 用户不喜欢 cosmetic 表面修饰, 要的是"看一眼就觉得这是 premium 工具"的整体感
- 性能不该被 backdrop-filter / 动画拖累 (writing app 必须 buttery smooth)
- macOS 测试机不在本机, 微调以 Win11 + WebKit fallback 双端验证

## User 决定 (锁定)

### 1. 范围 = Full Sweep (3 PR, ~25 files)

chrome + Hub + Workstation + Settings + Welcome + Splash + view transitions + form controls + error boundary + dark mode 全 re-tune + brand doc 拓 §§13-16.

### 2. 微互动 = Restrained Premium (Linear/Notion 风)

```
Hover bg:        120ms · ease-out-quart
Seal scale 1.06: 180ms
Modal open:      240ms fade+slide
View transition: 240ms cross-fade
Reduced motion:  0ms (all durations)
```

0 spring / 0 bounce / 0 parallax. 安静、有序、高级商务感。

### 3. Typography = Rhythm Reset (Ulysses 风)

```
Vertical rhythm:  14 / 22 / 34 / 56 px
Weight ladder:    400 normal · 600 emphasis (双权重制)
Serif (brand):    EB Garamond / Source Han Serif → wordmark + doc title
Sans (UI):        System UI / Inter fallback → labels + buttons
Mono (data):      JetBrains Mono → counters + timestamps + code
```

## Research References

- [`research/premium-writing-app-chrome.md`](research/premium-writing-app-chrome.md) — 9 app patterns + 10 anti-patterns + 5 InkForge-mapped recommendations + motion token ladder
- [`research/glassmorphism-cross-webview.md`](research/glassmorphism-cross-webview.md) — `@supports` gate pattern + rgba(0.94) fallback; backdrop-filter works in WebView2 / WKWebView / WebKitGTK 2.40+

## Diverge Sweep

### Future evolution
- v2.1 多主题 (sepia / paper / neon) 留扩展点: tokens 用 CSS var, 主题切换替 var 集而非改组件
- 后续可能加 Workspace switcher (Linear 风) 在 titlebar — 现 36px 高度 + 左锚 layout 已留位

### Related scenarios
- Editor 内部 (TipTap) 也应继承 tokens — focus ring / hover bg / type rhythm 跨编辑器内外一致 (本任务不动 editor canvas, 但 token 自动渗透)
- Splash → main 切换微互动: 已是 fade out 256ms, 与新 240ms cross-fade 节奏一致, 不动

### Failure & edge cases
- **backdrop-filter** 在低端 GPU / WebKitGTK 旧版 → `@supports` gate 降级 rgba 0.94 实色 (research/glassmorphism)
- **type 字体 fallback**: EB Garamond 不装时 fallback Georgia (已在现代 chain); JetBrains Mono 不装时 fallback Consolas/Menlo
- **dark mode shadow 错调**: 必须 LIGHTER alpha (0.4 not 0.06) — research 第 7 anti-pattern, 强制 lint
- **reduced-motion**: 用 `@media (prefers-reduced-motion: reduce)` 覆盖 tokens 为 0ms, 而非每处 `@keyframes none`
- **focus ring 不可破** accessibility: `outline: none` 必须 always 配 `box-shadow` 替换 ring, 否则键盘用户失去定位
- **不破坏 e87f283**: drag/buttons/Forge Nib/IPC splash handshake 零退步

## Implementation Plan (3 PRs)

### PR1 — Foundation Tokens + Chrome (~7 files)

**NEW**:
- `inkforge/src/styles/tokens.css` — `--motion-*` + `--ease-*` + `--elev-1/2/3` + `--hairline-light/dark` + `--focus-ring-kiln` + `--type-step-*` + reduced-motion override

**MODIFY**:
- `inkforge/src/App.vue` — import tokens.css, global `*:focus-visible` ring, body type rhythm baseline
- `inkforge/src/components/chrome/TitleBar.vue` — Inkstone Glass: 36px / `backdrop-filter: blur(20px) saturate(140%)` + `@supports` fallback / 左锚 seal+wordmark / EB Garamond italic doc title / ember gradient bottom / Kiln control hover with double-ring focus
- `inkforge/src/components/chrome/ForgeNibMark.vue` — hover glow variant (prop `interactive` → scale 1.06 + Kiln drop-shadow)
- `inkforge/public/splash.html` — adopt motion tokens, hairline opacity, no visual break
- `docs/inkforge-brand-identity.md` — §13 Motion Tokens, §14 Elevation Ladder, §15 Typography Rhythm
- `inkforge/index.html` — placeholder fallback inherits tokens

### PR2 — Hub + Workstation + Welcome + View Transitions (~10 files)

- `inkforge/src/views/HubView.vue` — header brand zone + 卡片 elevation 1→2 hover + 14/22/34/56 rhythm + One Accent rule (Kiln 限 selected + Forge Nib)
- `inkforge/src/views/WorkstationView.vue` — toolbar depth (hairline + elevation), surface breathing, type rhythm
- `inkforge/src/components/help/WelcomeModal.vue` — modal elevation 3 + double-ring focus + type rhythm
- `inkforge/src/router/index.ts` (or wrapper) — `<RouterView v-slot="{Component}">` + `<Transition name="view-fade" mode="out-in">` 240ms cross-fade
- `inkforge/src/components/error/ErrorBoundary.vue` (if exists) — token-driven visual
- Possibly: `inkforge/src/components/sidebar/*` if Workstation has sidebar — apply hairline + hover bg

### PR3 — Settings + Form Controls + Dark Mode Re-tune + Brand Doc Closeout (~8 files)

- `inkforge/src/views/SettingsView.vue` — 12 tabs 字号节奏, hairline-only dividers, hover state, double-ring focus on inputs
- Form input components (search/textarea/select used in settings/hub) — `box-shadow` focus ring
- Buttons globally — token-driven hover bg / focus ring / disabled state
- Dark mode pass: in tokens.css 输出 dark variants for elevation (lighter shadow alpha 0.4 vs light 0.06), hairline (`rgba(245,240,230,0.08)`), 双 fallback `:root[data-theme='dark']` + `prefers-color-scheme: dark`
- `docs/inkforge-brand-identity.md` — §16 Dark Mode Contract, final closeout

## Requirements (evolving)

- Titlebar 升级到 Inkstone Glass (36px + blur + 左锚 + ember 底 + 微互动)
- Hub 卡片层次、hover、字体节奏精化 (具体待选)
- Workstation 工具栏深度 / 写作主区呼吸感
- Settings 排版栅格 / 字号节奏
- Welcome modal / Splash 与新 chrome 风格统一 (已 Forge Nib, 仅细节微调)
- Dark mode 各 surface shadow / elevation 一致, 不再是 light 翻 luma 的简单替换
- 微互动: 至少 seal hover / window control hover / 主按钮 / 卡片 hover / focus ring 全 polish
- 不破坏: drag/buttons (e87f283), IPC handshake (PR2 splash), brand mark consistency, accessibility (键盘焦点、aria), reduced-motion, dark mode

## Acceptance Criteria (evolving)

- [ ] Titlebar 实装 Inkstone Glass (36px + backdrop-filter 含 fallback + ember gradient + 左锚 seal+wordmark + 微互动)
- [ ] WebKitGTK 无 backdrop-filter 时降级为半透明 Vellum (不破)
- [ ] Hub 主视觉 (header + 卡片 + scroll-snap region) 提升: 至少 hover state + 阴影节奏 + 字体节奏
- [ ] Workstation 顶 toolbar + 写作 surface 深度统一
- [ ] Settings tabs/分节字号节奏精化
- [ ] Dark mode 各 surface 阴影/边线/纹理 一致 (不是单纯 luma flip)
- [ ] `prefers-reduced-motion: reduce` 时所有动画/transform/scale 关闭, opacity 保留
- [ ] 不破坏 drag/buttons/IPC handshake/brand mark 一致性
- [ ] lint + typecheck + cargo check 全绿; 不引入 NEW clippy warning
- [ ] 真 tauri dev 手测: 主窗起来 (无 native chrome 双重) + drag works + buttons work + Inkstone Glass titlebar 视觉到位

## Definition of Done

- 所有 AC checkbox 过
- 不破坏 e87f283 drag/buttons/Forge Nib 一致性
- 跨视图 surface consistency (shadow/radius/font scale 不分裂)
- 真机手测 (Win11) 流畅, 暗模 + reduced-motion + 主流路径不卡

## Out of Scope (explicit)

- macOS .icns 视觉验证 + traffic light 行为 (无 mac)
- 新 brand asset 重设计 (Forge Nib 已锁)
- splash 动画时长 / 内容 (已锁)
- 编辑器 TipTap 内部 view (本任务不动 editor canvas, 只动周边 chrome)
- 安装包 (msi/dmg) 视觉 / 应用图标
- WeChat 导出 / 微信平台规则 (parallel 任务)

## Technical Notes

### Files likely impacted

- `inkforge/src/components/chrome/TitleBar.vue` — Inkstone Glass 实装
- `inkforge/src/components/chrome/ForgeNibMark.vue` — 可能加 hover/glow variant
- `inkforge/src/views/HubView.vue` — 卡片/header
- `inkforge/src/views/WorkstationView.vue` — toolbar/surface
- `inkforge/src/views/SettingsView.vue` — 排版
- `inkforge/src/components/help/WelcomeModal.vue` — 风格统一微调
- `inkforge/public/splash.html` — 与 chrome 风格统一微调
- `inkforge/src/App.vue` — 全局 css var / surface contract
- `inkforge/src/styles/` — 可能新增全局 elevation / motion tokens
- `docs/inkforge-brand-identity.md` — §§10-12 chrome/motion 补充

### Cross-platform 关键

- `backdrop-filter`: WebView2 ✓, WKWebView ✓, WebKitGTK 视 GTK 版本. 必须 `@supports (backdrop-filter: blur(1px))` gate + 降级
- 性能: backdrop-filter 在大面板/低端机有 GPU 开销, 仅用于 chrome (~36px 高), 不用于全屏面板

### References

- Brand identity doc: `docs/inkforge-brand-identity.md`
- Prior task (regressions fix): `.trellis/tasks/archive/2026-05/05-27-fix-visual-polish-regressions/`
- Recent commit: `e87f283 fix(visual): titlebar drag/buttons + Forge Nib brand consistency`

### Research topics (delegate to trellis-research)

- `research/premium-writing-app-chrome.md` — Bear / Ulysses / iA Writer / Linear / Arc 高端写作 + 工作流 app 的 chrome 设计模式
- `research/glassmorphism-cross-webview.md` — backdrop-filter 跨 WebView2/WKWebView/WebKitGTK 兼容性 + fallback 模式
- `research/micro-interaction-patterns.md` — premium app hover/focus/transition 节奏 token 系统 (durations / curves)
