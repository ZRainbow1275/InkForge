# Fix Visual Polish Regressions — Titlebar drag/interaction + Logo redesign

## Goal

修复 05-27 visual-polish-pass 上线后手测发现的硬伤：

1. **无法拖动**: TitleBar 拖拽 + Tauri drag region 配置不全, window 不能从 titlebar 拖
2. **无法交互**: titlebar / app toolbar 区域点击事件 / hover 失常
3. **Logo 设计 + 渲染质量差**: SVG「铸」字依赖系统 CJK 字体 fallback, 16-32px 全套 icon 都看不清; 整体印章方块 + 一字 mark 缺乏设计层次

不是 cosmetic 微调, 是用户体验级别 block — 直接影响日常拖窗 + 启动看到的品牌第一印象。

## What I already know (from repo inspection)

### Logo 致命缺陷

`inkforge/src-tauri/icons/master.svg` line 33-40:
```
<text x="512" y="612"
      font-family="'Source Han Serif SC','Noto Serif SC','Songti SC','STSong','SimSun',serif"
      font-size="380"
      fill="#252933">铸</text>
```

- **`<text>` 元素 + 字体 fallback 链**: raster 引擎 (sharp / Tauri build) 渲染 SVG → PNG 时, 用系统字体。 Windows 11 默认装 SimSun (宋体), 但 Source Han / Noto Serif SC 通常没有 → raster 出来用宋体衬线。
- **小尺寸糊**: 16x16 PNG 时, font-size 380 在 1024 viewBox 中 scale 至 ~6px → 「铸」字完全不可读。 32px 时 ~12px → 模糊。这就是 user 报告"看不清"的根因。
- **跨机不一致**: 不同电脑装的字体不同, 生成的 raster icon 视觉表现不一致, 不能用作 brand mark。
- **`text-anchor="middle"` + `y="612"` 视觉中心偏低**: SVG text 的 baseline 不是字形中线, 实际「铸」字会偏下。

### 全套 icon 都基于这个 SVG

`inkforge/scripts/build-icons.mjs` 调用 sharp 将 master.svg 转 PNG → png-to-ico 打包 ico。 raster 链中字体渲染失败 → 影响每一个 size：16/24/32/48/64/128/256/512/1024 全糊。

### TitleBar.vue drag region 嫌疑

`inkforge/src/components/chrome/TitleBar.vue`:

- `<div class="ink-titlebar__drag" data-tauri-drag-region>` 包 `<span class="ink-titlebar__seal">` + `<span class="ink-titlebar__title">`
- Buttons 在兄弟 div `.ink-titlebar__controls` 内, **无 `data-tauri-drag-region="false"`** (Tauri 1.x 文档建议子元素若不应被拖, 显式标 false)
- `.ink-titlebar` 自身 `position: fixed; top: 0; z-index: 1000`, 全宽
- macOS spacer 用 `data-aria-hidden`, 没标 drag/no-drag

**理论上 drag region 应工作**, 但截图显示无法拖。可能原因:
- (a) `<span>` 子元素阻止 Tauri 1.x 识别 drag attribute 继承
- (b) `tauri.conf.json` 的 `decorations: false` 在 dev 模式 hot reload 没生效, native chrome 还在最上层接管 drag, TitleBar 被压低 32px 看起来是渲染但 drag 给了 native
- (c) buttons 显示但点击不响应, 因为 `-webkit-app-region: no-drag` 是 Electron 语法, Tauri 1.x 不识别 — buttons 区域可能被 drag region 父级"继承"成 drag, 反而阻塞 onclick

### tauri.conf.json 状态

- main window: `visible:false` + `decorations:false` + `titleBarStyle:Overlay` + `hiddenTitle:true`
- `titleBarStyle` + `hiddenTitle` 是 macOS-only 字段, 在 Windows 应该被忽略 (但可能有 CLI 警告)
- Tauri 1.x dev 模式 hot reload 不一定重启 main window 应用 decorations 变化 → **需用户重启 `pnpm tauri dev` 才生效**

### App.vue 包结构

```vue
<TitleBar :document-title="activeArticleTitle" />
<div class="app-content">
  <router-view + 错误边界 ... />
</div>
```

- `.app-content { height: calc(100vh - 32px); margin-top: 32px; overflow: hidden; }`
- Layout 合理, TitleBar fixed + .app-content margin-top, 不重叠
- 但 router-view 内某些 view 可能有自己的 `position: fixed; top: 0` (PublishView 顶 toolbar), 会被 TitleBar 32px 高遮挡 — **需 inspect 各 view 顶 toolbar**

## Assumptions (to validate)

- user 重启了 `pnpm tauri dev` 后 decorations:false 才真应用 (没重启会看到 native chrome + TitleBar 同时存在双 titlebar)
- 「铸」字策略整体放弃, 改用 path-化 OR 几何符号 (字体不可控)
- 整体设计层次需提升: 单 Kiln 方块 + 一字 → 加入 ◇ 衬底 / 锻线 / 印章纹理 / 雕刻光高 才有"设计感"
- macOS 测试不在本机, 暂搁置

## Real Testing Done (main session)

1. ✅ Tauri 1.8.3 build OK (24s clean cargo, dark-light 1.1.1 编进去)
2. ✅ Vite dev at http://127.0.0.1:3005 serving frontend
3. ✅ Playwright headless drove `/` route → DOM/CSS 验证:
   - TitleBar 挂载 ✓ (32px 固定顶部, z-index 1000, Vellum bg)
   - `[data-tauri-drag-region]` attribute 正确出现在 `.ink-titlebar__drag` 上
   - `.app-content` margin-top: 32px ✓ (与 TitleBar 不重叠)
   - Buttons 在浏览器模式下隐藏 (correct fallback: `isTauriEnv()` = false)
4. ✅ tauri.conf.json 静态校验: main window decorations=false, visible=false; splash transparent+alwaysOnTop ✓
5. ⚠️ 视觉直接看 raster icon:
   - **32×32 PNG**: 「铸」字一坨黑点几乎不可读 (SimSun fallback 致命)
   - **128×128 PNG**: 「铸」字可见但宋体衬线, ◇ 衬底 stroke 2px 极细几乎不见
   - **TitleBar 16px 渲染 (Playwright 截图)**: 红方块清楚但中字糊
6. ⚠️ 无 Tauri 运行时则无法验真 native window drag — 但 DOM 结构已正确, drag 失败主因为 **`<span>` child 截胡 mousedown**

## User 决定 (锁定)

- **Logo = 设计感几何形状, 不是「铸」字字符** — User 明示 (后续追加: "Logo 不能是一个所谓的铸字，而是要有设计感的一个形状 / 一个图标")
- 必须能在 16×16 仍清晰可辨, 跨机器零字体依赖 → 纯 path/shape
- **Logo 方向锁定: A. 锻铸笔尖 (Forge Nib)** — Kiln 衬底 + Graphite 菱形笔尖 + Vellum 中线劈缝 + Amber 底锻线

### Forge Nib 几何规范 (master.svg, viewBox 1024×1024)

- **Kiln 衬底 (existing, keep)**: `rect x=226 y=226 w=572 h=572 rx=72` fill=`url(#kilnGrad)` (E27654→D95B3F→B84A30); 内部 hairline rect 244 / stroke Vellum 0.18
- **Graphite 菱形笔尖**: `polygon points="512,312 680,512 512,712 344,512"` fill=`#252933` — 占衬底中央 ~70%
- **Vellum 中线劈缝 (nib slit)**: `rect x=506 y=380 w=12 h=260 rx=6` fill=`#F5F0E6` — 暗示金属切口, 视觉对比, 16px 仍可见
- **Amber 底锻线**: `rect x=412 y=748 w=200 h=10 rx=5` fill=`url(#amberGrad)` (D4B070→C19A56) — 印章下方"锻造火痕"
- **Top-left bevel highlight (装饰)**: `polyline 380,500 → 512,360` stroke=`#F5F0E6` opacity=0.22 width=14 linecap=round — 仅大尺寸可见
- **0 `<text>` 元素**, 0 字体依赖

### 16/32px 退化策略

- 16×16 raster: 菱形 + 中线劈缝 + 底锻线全保留, bevel highlight 不可辨但不破坏轮廓
- favicon.svg (32×32 viewBox): 缩比版 Forge Nib, rx 比例同步缩小, hairline+highlight 删除

## Diverge Sweep — 失败模式 + 相关场景

### Future evolution
- v2.1 暗色模式可能扩展为多主题 (sepia / paper / neon) → SVG master 用 currentColor / CSS var 留扩展点? **MVP 不做**, 保持硬编码 Kiln/Graphite/Amber, brand identity §9 已锁定
- Splash 可能后续加品牌动画 → 当前 fade-in 已够, 不在本任务

### Related scenarios
- favicon (浏览器 tab) / titlebar 内嵌 16px / splash 印章 256px / system tray (未来可能) — 都派生同一 master.svg, **本任务 covers favicon + titlebar + splash, tray 留给未来**
- Brand identity doc §9 Logo Mark — 必须同步重写为 Forge Nib (旧「铸」字段已死)

### Failure & edge cases
- **Tauri dev hot reload 不刷新 decorations**: PRD 已记录, 修复后必须 user **重启** `pnpm tauri dev`, 仅热更新 frontend 看不到 native chrome 消失 — 加入 README + 提示
- **`.app-content { overflow: hidden }` 遮挡 modal/dropdown popover**: 全局 popover (如 Settings dialog / publish menu) 若用 portal 不影响, 若用 inline absolute 会被裁剪 → **PR1 检查 PublishView / SettingsView / 工具栏 dropdown 是否 portal-mounted**, 必要时改 `overflow: visible`
- **drag region 修复后 buttons 仍 dead**: 若 `data-tauri-drag-region="false"` 加上仍 dead, 排查 `<button>` 是否被 z-index 较低 — 实际上 buttons 在 `.ink-titlebar__controls` 内, controls 是 drag div 兄弟, 不在 drag region 内, 加 explicit false 是 belt-and-suspenders
- **raster icon 跨平台不一致**: sharp 用 librsvg 渲染, 纯 path 应稳定, 但 .icns 走 iconutil/png2icns 链路 — 本任务在 Win11 上测; macOS .icns 验证 out of scope (无 mac)
- **splash IPC handshake 不能破**: PR2 已上线的 `app_ready` 通道 + Arc&lt;Notify&gt; + 3s fallback 必须零改动, 只换 SVG asset

### Out of Scope (本任务确认)
- macOS .icns 实机视觉验证
- system tray icon
- 多主题 SVG (currentColor / CSS var 扩展)
- splash 动画时长 / 内容

## Open Questions (resolved)

- ~~Logo 几何方向~~ → **A. Forge Nib 锁定**
- ~~Drag/交互根因~~ → `<span>` child 截胡 mousedown + buttons 缺 explicit no-drag; 修复方案 derivable
- ~~Splash 印章同步改~~ → **是** (品牌一致)

## Requirements (locked)

- 所有 brand 资产 (logo SVG master / favicon / titlebar 内嵌 / splash 印章 / app icon 全套) 全部由 **path/shape 构成, 0 个 `<text>` 元素**, 0 字体依赖
- 16×16 icon 主体 mark 清晰可辨, 16-1024 全尺寸视觉一致
- TitleBar 拖拽全 header 正常工作:
  - `<span>` child 加 `pointer-events: none` 防 mousedown 截胡
  - Buttons 加 `data-tauri-drag-region="false"` (即使在兄弟 div 内, Tauri 文档建议显式)
  - macOS spacer 也加 drag region 属性
- App toolbar 全 buttons 正常响应 (验证 `.app-content overflow: hidden` 不影响 modal/dropdown 弹出 — 修改为 `overflow: visible` 如有问题)
- 不破坏已上线: splash 链路 / IPC handshake / dark mode / reduced-motion / brand identity §§9-12 (§9 logo 改新方向, 其他不动)

## Acceptance Criteria

- [ ] **Logo master.svg**: 0 个 `<text>` 元素 (grep `<text` → 0); 主体由 path/rect/polygon/circle 构成
- [ ] **16×16 PNG** 渲染后主体 mark 清晰可辨, "看一眼能识别"
- [ ] **256×256 PNG** 设计完整, 有层次 (主形 + 衬底/装饰 + 渐变 / 高光)
- [ ] **跨机器一致**: raster 在不装 CJK 字体的机器 (如 CI runner) 渲染结果与本地相同
- [ ] **Favicon + titlebar 内嵌 logo + splash 印章**: 用新 logo 同源 SVG 派生 (或缩比版)
- [ ] **TitleBar drag**: 鼠标按下 header 任意位置 (除 buttons) 都能拖窗
- [ ] **TitleBar buttons**: min/max/close 点击全响应
- [ ] **App 主 toolbar**: 所有 buttons (复制/上传/全屏/默认/写作/审阅/专注/侧栏/发布) 正常 hover + click
- [ ] **tauri dev 重启后**: Win 11 native chrome 完全消失, 只见 InkForge 自绘 TitleBar
- [ ] **Splash → main**: IPC handshake 仍正常 (PR2 链路不破)
- [ ] **lint + typecheck + cargo check/clippy/fmt** 全绿, 0 NEW warning

## Out of Scope (locked)

- macOS native traffic light 渲染验证 (无 mac 测试机)
- splash 动画时长调整 (上一轮已定型)
- 错误边界配色 (PR1 已完成)
- 安装包 (msi/dmg) 视觉
- 编辑器内部 view 调整

## Technical Notes

- TitleBar.vue: `inkforge/src/components/chrome/TitleBar.vue`
- master.svg: `inkforge/src-tauri/icons/master.svg`
- favicon: `inkforge/public/favicon.svg`
- splash.html: `inkforge/public/splash.html`
- build-icons script: `inkforge/scripts/build-icons.mjs`
- App.vue 包: `inkforge/src/App.vue` line 318-321
- tauri.conf.json: `inkforge/src-tauri/tauri.conf.json`
- Tauri 1.x drag region doc: https://tauri.app/v1/api/js/window/#setdecorations + https://tauri.app/v1/guides/features/window-customization/#manual-drag-region
- 引用 brand identity §9-12 (已上线)
