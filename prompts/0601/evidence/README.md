# 证据采集指南 — WeChat-safe inline-SVG 旗舰排版（真机 / GUI e2e）

本目录存放 **AC1（微信真机粘贴渲染）** 与 **AC8 的 GUI e2e（tauri-driver 真二进制）** 的人工 / 机器门禁证据。
自动化门禁（单测 / 冒烟 / typecheck / lint）已在 `prompts/0601/COMPLETION-REPORT.md` 中全绿留档，**不需在此重复**。

> 关键事实（已对源码核实）：`[data-ink-svg]` 模块由 `preset.decorate`（= `composeSvgDecorate`）注入，**只在真实导出管线**（`convertToWechatWithStats` → `markdownToWechatWithStats`）内运行。在 UI 里该管线喂的是 **ExportModal 预览**（`.export-panel .preview-render`），**不是** Stage 迷你手机预览（后者走 mock 渲染器 `#wechat-article` / 677px，**不**含 `data-ink-svg`）。因此探针与 e2e 都在 **ExportModal** 内取证。

---

## A. 跑 tauri-driver 真二进制探针 / e2e（机器门禁）

### A0. 前置（探针与 spec 都**不自带 build**）

1. **刷新嵌入 dist**（Tauri 在 cargo build 时把 `inkforge/dist` 嵌进二进制，视觉/代码改动不 rebuild 就看不到）：
   ```bash
   cd D:/Desktop/Inkforge/inkforge
   pnpm build            # 串行、限 node 内存，避免 OOM；build 时不要同时开 tauri:dev
   ```
2. **编译 debug 二进制**（产物 `inkforge/src-tauri/target/debug/InkForge.exe`）：
   ```bash
   cd D:/Desktop/Inkforge/inkforge/src-tauri
   cargo build -p inkforge        # 或：cd ../ && pnpm tauri build --debug
   ```
   > `wdio.conf.cjs` 的 `onPrepare` 会替你跑 `cargo build`，但 `pnpm build` 必须**先手动**跑，确保嵌入的 dist 是新的。
3. **准备 driver**（与 `wdio.conf.cjs` / `paint-h1.cjs` 一致的 fallback 路径）：
   - `tauri-driver.exe`：在 PATH 或 `~/.cargo/bin/tauri-driver.exe`；可用 `TAURI_DRIVER_PATH` 覆盖。
   - `msedgedriver.exe`：与本机 WebView2 运行时版本匹配，在 `~/.local/bin/msedgedriver.exe`；可用 `MSEDGE_DRIVER_PATH` 覆盖。
   ```bash
   # PowerShell 示例（按实际路径调整）
   $env:TAURI_DRIVER_PATH="$HOME\.cargo\bin\tauri-driver.exe"
   $env:MSEDGE_DRIVER_PATH="$HOME\.local\bin\msedgedriver.exe"
   ```

### A1. 诊断探针（人读几何，非 graded）
```bash
cd D:/Desktop/Inkforge/inkforge
node tests/e2e/probes/svg-render.cjs
```
对每个旗舰预设（赤陶 / 铜绿 / 黄铜）打印每个 `[data-ink-svg]` 模块的 bbox / viewBox / `width:100%` 与容器的 delta、`#nice` 列宽、charsPerLine，并给出 VERDICT（OK / NO-SVG / VIEWBOX-MISSING / WIDTH-DRIFT / PAINT-CULLED / NICE-WIDTH-OUT-OF-BAND / CHARS-OUT-OF-BAND）。把整段 stdout 存为 `prompts/0601/evidence/probe-svg-render-<日期>.txt`。

### A2. 正式 e2e spec（graded，wdio）
```bash
cd D:/Desktop/Inkforge/inkforge
pnpm test:e2e      # wdio.conf.cjs 收集 tests/e2e/specs/*.spec.cjs，含 svg-render.spec.cjs
```
`svg-render.spec.cjs` 断言（容差带）：
- 每个旗舰预设在 ExportModal 预览注入 ≥1 个 `[data-ink-svg]` 模块；每模块含 `<svg>` 且 `viewBox` 形如 `0 0 W H`；`width:100%` 跟随容器（delta < 2.5px）；painted width > 0（捕捉 WebView2 0×0 culling）。
- `#nice` 正文列宽落在 300–460px（移动端框 ~375px）；最长 CJK 段 charsPerLine 落在 16–24（目标 ~18–22，**AC3**）。

> **若 harness 无已加载文章**：Stage「全屏导出」按钮为 `:disabled`，spec 会**优雅 skip** 并打印诊断（不是 fail）。请先在 Workstation 打开/新建一篇草稿再跑。
> 把 wdio 报告 / 终端输出存为 `prompts/0601/evidence/e2e-svg-render-<日期>.txt`，失败截图（若有）存本目录。

---

## B. 真机手动验证（微信公众号后台，AC1）

对**每个旗舰预设**（赤陶旗舰 / 铜绿旗舰 / 黄铜旗舰）执行：

1. 启动真应用：`cd D:/Desktop/Inkforge/inkforge && pnpm tauri:dev`（或运行 A0 编译出的 `InkForge.exe`）。**手测一律走 Tauri，不要走浏览器/vite。**
2. 打开/新建一篇含 **h2 / h3 标题 + 多段中文正文 + `---` 分隔线 + `>` 引用块** 的草稿（命中 cover / header / divider / quote / endmark 全部锚点）。
3. Workstation → Stage 面板 →「全屏导出」打开 ExportModal → 平台选「微信」→ 选中该旗舰预设卡片。
4. 确认 ExportModal 预览（`.preview-render`）出现 SVG 标题头 / 分隔线 / 引用卡 / 封面 / 文末结束标，且正文每行 ≈ 20–22 个汉字。
5. 复制导出 HTML → 在**手机**上打开微信公众号后台编辑器 → 粘贴。
6. 确认渲染：
   - 章节标题头（ribbon / bracket / vrule）显示，配色 = 该预设品牌色；
   - 分隔线（forge / diamond / grid）显示；
   - 引用卡（mark / corner / vbar）显示，原引用文字在内；
   - 文末结束标（vessel / fin / rule，含 ◇◇◇）显示；
   - 正文每行约 20–22 字（不被 SVG 撑破行宽）；
   - 暗黑模式下 SVG 不反色（自带不透明背景 rect）；
   - 无裸标签泄漏、无 `<style>`/class 残留。
7. 手机截图存本目录，命名 `wechat-<presetId>-<日期>.png`（如 `wechat-flagship-kiln-20260601.png`）。

---

## C. 证据清单（采集后逐项打勾）

```
[ ] probe-svg-render-<日期>.txt          # A1 探针 stdout（3 预设几何 + VERDICT）
[ ] e2e-svg-render-<日期>.txt            # A2 wdio spec 结果
[ ] wechat-flagship-kiln-<日期>.png      # B 真机：赤陶旗舰公众号渲染
[ ] wechat-flagship-tempera-<日期>.png   # B 真机：铜绿旗舰公众号渲染
[ ] wechat-flagship-amber-<日期>.png     # B 真机：黄铜旗舰公众号渲染
[ ] charsperline-<presetId>-<日期>.png   # 可选：标尺/字数佐证 20-22 字/行（AC3）
[ ] darkmode-<presetId>-<日期>.png       # 可选：暗黑模式不反色佐证
```

把截图直接放本目录（`prompts/0601/evidence/`）。文本日志同目录。

---

## D. 说明（与 COMPLETION-REPORT 一致）

- 本轮**自动化门禁全绿**（svg-modules 13/255、export 33/822、typecheck exit 0、lint exit 0）；A/B 两节为**手动 / 机器门禁**，本轮**未执行**，代码与探针均**已就绪可即跑**。
- 真 canvas 栅格化（小红书海报）仅在浏览器/Tauri 有 DOM 时运行；知乎 SVG-as-img（`buildSvgDataUri`）路径在 Node 单测完整覆盖。海报真机产图证据可选附 `xhs-poster-<日期>.png`（在应用内导出小红书海报后截图）。
