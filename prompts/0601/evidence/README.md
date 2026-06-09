# 证据采集指南 — WeChat-safe inline-SVG 旗舰排版（真机 / GUI e2e）

本目录存放 **AC1（微信真机粘贴 / 手机预览渲染）** 与 **AC8 的 GUI e2e（tauri-driver 真二进制）** 的人工 / 机器门禁证据。
自动化门禁（单测 / 冒烟 / typecheck / lint / build）、真实 Tauri e2e、真实公众号后台 PC 粘贴路径已在 `prompts/0601/COMPLETION-REPORT.md` 中留档，**不需在此重复**。注意：PC 粘贴路径证据目前单独覆盖 `flagship-kiln` 与 `flagship-tempera`；`flagship-amber` 仍需补一次真实公众号后台 PC 粘贴登记。

> 关键事实（已对源码核实）：`[data-ink-svg]` 模块由 `preset.decorate`（= `composeSvgDecorate`）注入，**只在真实导出管线**（`convertToWechatWithStats` → `markdownToWechatWithStats`）内运行。在 UI 里该管线喂的是 **ExportModal 预览**（`.export-panel .preview-render`），**不是** Stage 迷你手机预览（后者走 mock 渲染器 `#wechat-article` / 677px，**不**含 `data-ink-svg`）。因此探针与 e2e 都在 **ExportModal** 内取证。

---

## A. 跑 tauri-driver 真二进制探针 / e2e（机器门禁）

**当前状态（2026-06-08）**：已执行并通过。最新机器日志已留档：
`build-refresh-20260608-082644.txt`（Vite built in 42.06s）、
`cargo-build-refresh-20260608-082813.txt`（`cargo build -p inkforge` dev profile 9.15s）、
`probe-svg-render-20260608-082919.txt`（A1 诊断探针）、
`e2e-svg-render-20260608-083022.txt`（A2 正式 e2e）、
`market-source-refresh-20260608.txt`（135/Xiumi/Exa/Grok 市场来源刷新）。
2026-06-08 后续 focused 机器门禁刷新已新增：
`focused-export-refresh-20260608.txt`（4 files / 64 tests passed）、
`svg-modules-refresh-20260608.txt`（15 files / 383 tests passed）、
`platform-gate-matrix-20260608.md`（当前平台门禁缺口矩阵）、
`market-rule-overnight-refresh-20260608.txt`（135/Xiumi 当前实机复核、微信官方插件规范、
XHS/Zhihu 弱来源冲突、agent 复审和聚焦测试）、
`quality-gate-hardening-20260608.txt`（WeChat/XHS/Zhihu 质量门禁阻断规则实现与验证）、
`xhs-markdown-gate-refresh-20260608.txt`（微信登录态复核 + 小红书 raw Markdown 控制符阻断门禁）、
`style-catalog-amber-paste-refresh-20260608.txt`（可执行样式选择 catalog + `flagship-amber`
普通剪贴板富 HTML 粘贴降级为纯文本的真实微信证据）。
`market-editor-element-probe-20260608.txt`（用户重新登录后对微信公众号、135、秀米的
只读浏览器元素探针；后续已追加 CloakBrowser-only applied-element rerun：点击 135/秀米
真实样式/SVG 效果、视觉确认中间编辑区/画布出现内容、再读 DOM/参数面板；不含截图、QR、
token、账号 ID、模板代码或私有素材）。
`wechat-editor-authenticated-readable-20260609.txt`（CloakBrowser `inkforge-0601` 登录态微信
编辑器只读证据：编辑器可达、`.ProseMirror` 标题/正文 DOM 可读、正文含真实音频卡，因此本轮未做
粘贴/保存/预览/发布；该证据只对应 `authenticated-editor-reachable` 和 `pc-editor-dom-readable`，
不升级为 `pc-editor-paste`、`mobile-preview`、`credentialed-sync` 或 `published`）。
`style-proof-checklist-20260609.txt`（style-catalog 运行时 proof checklist：`pc-editor-paste`
必须有 exact artifact、safe disposable draft、真实 PC paste/channel event、PC DOM readback 和敏感
证据隔离；`mobile-preview` 单独要求手机读回/截图、Dark Mode 和封面缩略图检查；同次 CloakBrowser
只读复核观察到 `#js_add_appmsg` 会改变真实多图文草稿结构，因此未点击）。
`market-editor-residue-gate-20260609.txt`（CloakBrowser applied-element 规则落地为 runtime
质量门禁：WeChat/XHS/Zhihu 分别阻断 135/秀米 authoring residue，普通文字提到 135/秀米不误报；
focused Vitest 42 tests passed，4-file export regression 81 tests passed，full export serial 975
tests passed，ESLint/vue-tsc/build exit 0，CloakBrowser local visual check done；不含截图路径、
账号数据、模板源码或私有素材）。
`layout-report-runtime-gate-20260609.txt`（CloakBrowser applied-element 的图层/自由布局规则落地为
WeChat runtime 门禁：`wechat-layout-report-required` 阻断自由定位、z-order、背景图层、裁切、
固定几何、手动位移、负 margin 和隐藏触发区；普通自有 inline flow 色块不误报；focused Vitest
44 tests passed，4-file export regression 83 tests passed，full export serial 977 tests passed，
ESLint/vue-tsc/build exit 0，CloakBrowser local visual check done；不含截图路径或账号数据）。
`xhs-image-manifest-gate-20260609.txt`（小红书 image-page / cover / long-image 本地 artifact
manifest runtime 门禁：`validateXhsImageArtifactManifest()` 阻断页序、封面、文件存在性、正文引用、
比例/尺寸、格式、bytes 与裁切问题；`convertToNativeFormat(..., 'xiaohongshu')` 只把 manifest
作为 local preflight artifact 返回，不升级为上传、预览或发布证明；focused XHS/export 69 tests
passed，4-file export regression 85 tests passed，full export serial 979 tests passed，ESLint/vue-tsc/build
exit 0，CloakBrowser `inkforge-0601` local visual check done；不含截图路径、账号数据或平台发布声称）。
`pnpm -C inkforge test:e2e` 由
`onPrepare` 真实 `cargo build`，通过 `tauri-driver.exe` + `msedgedriver.exe` 驱动真
Tauri/WebView2 二进制；`svg-render.spec.cjs` 5 tests passed，`visual.spec.cjs` 11 tests
passed。证据截图已存 `prompts/0601/evidence/e2e/flagship-{kiln,tempera,amber}.png`。

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

2026-06-08 当前探针结果说明：`probe-svg-render-20260608-082919.txt` 对三旗舰均确认
`moduleCount=2`、`viewBox` 存在、`widthAttr=100%`、`deltaToParent=0`，SVG 几何与响应式宽度
正常；同时因诊断脚本读取的是 401px ExportModal 宽列与 15px 字号，VERDICT 报
`CHARS-OUT-OF-BAND: 27/line`。该脚本是人读几何诊断，不是 AC3 graded gate；正式 AC3 仍以
`svg-render.spec.cjs` 在移动排版口径下的真实字形布局断言为准，当前 A2 e2e 已通过。

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

**当前状态（2026-06-08）**：

- 已完成：真实 `mp.weixin.qq.com` PC 图文编辑器粘贴路径验证。Playwright 触发真实 `text/html` paste 事件后，微信编辑器 paste sanitizer 在 `flagship-kiln` / `flagship-tempera` 样本中保留 inline SVG / `data-ink-svg`，并在 PC 编辑器中可视化渲染封面、分隔线、引用卡和文末结束标。
- 已完成：PC 粘贴验证暴露的封面长标题溢出已修复，并通过重粘验证 `coverMaxOverflowPx` 为负值，标题落在 viewBox 内。
- 未完成：`flagship-amber` 单独 PC 后台粘贴登记；微信手机端扫码预览 / 最终手机渲染 / SMIL 交互 / 暗黑模式确认。手机端步骤需要公众号后台封面缩略图、手机微信和扫码预览，不能用本地浏览器或 PC 后台 DOM 证据替代。

对**每个旗舰预设**（赤陶旗舰 / 铜绿旗舰 / 黄铜旗舰）执行：

1. 启动真应用：`cd D:/Desktop/Inkforge/inkforge && pnpm tauri:dev`（或运行 A0 编译出的 `InkForge.exe`）。**手测一律走 Tauri，不要走浏览器/vite。**
2. 打开/新建一篇含 **h2 / h3 标题 + 多段中文正文 + `---` 分隔线 + `>` 引用块** 的草稿（命中 cover / header / divider / quote / endmark 全部锚点）。
3. Workstation → Stage 面板 →「全屏导出」打开 ExportModal → 平台选「微信」→ 选中该旗舰预设卡片。
4. 确认 ExportModal 预览（`.preview-render`）出现 SVG 标题头 / 分隔线 / 引用卡 / 封面 / 文末结束标，且正文每行 ≈ 20–22 个汉字。
5. 复制导出 HTML → 在 **PC 浏览器**打开微信公众号后台图文编辑器正文区 → 粘贴。
6. 插入/选择一张符合微信要求的封面缩略图，然后点「预览」，用**手机微信**扫码打开。
7. 在手机微信里确认渲染：
   - 章节标题头（ribbon / bracket / vrule）显示，配色 = 该预设品牌色；
   - 分隔线（forge / diamond / grid）显示；
   - 引用卡（mark / corner / vbar）显示，原引用文字在内；
   - 文末结束标（vessel / fin / rule，含 ◇◇◇）显示；
   - 正文每行约 20–22 字（不被 SVG 撑破行宽）；
   - 暗黑模式下 SVG 不反色（自带不透明背景 rect）；
   - 点击/SMIL 交互若该产物包含互动模块，必须在手机微信预览里真实触发，不能用 PC 后台 DOM 或本地 e2e 替代；
   - 无裸标签泄漏、无 `<style>`/class 残留。
8. 手机截图存本目录，命名 `wechat-<presetId>-mobile-<日期>.png`（如 `wechat-flagship-kiln-mobile-20260608.png`）。

---

## C. 证据清单（采集后逐项打勾）

```
[x] build-refresh-20260608-082644.txt   # A0 PROD dist 刷新，Vite built in 42.06s
[x] cargo-build-refresh-20260608-082813.txt # A0 Tauri debug 二进制编译，9.15s
[x] probe-svg-render-20260608-082919.txt # A1 探针 stdout；SVG 几何 OK，chars/line 诊断提示见上文
[x] e2e-svg-render-20260608-083022.txt   # A2 wdio spec：2 spec files / 16 tests passed
[x] market-source-refresh-20260608.txt   # 市场来源刷新：135/Xiumi/Exa/Grok，非敏感文本证据
[x] focused-export-refresh-20260608.txt  # focused 导出测试：4 files / 64 tests passed
[x] svg-modules-refresh-20260608.txt     # SVG 模块 + 旗舰产物 emitter：15 files / 383 tests passed
[x] platform-gate-matrix-20260608.md     # 当前平台门禁矩阵：机器门禁完成，WeChat 手机/amber 门禁仍缺
[x] market-rule-overnight-refresh-20260608.txt # 当前市场规则硬化：135/Xiumi/WeChat official/XHS/Zhihu/agent 复审
[x] quality-gate-hardening-20260608.txt # 当前质量门禁实现：WeChat/XHS/Zhihu 阻断规则 + tests/lint/typecheck/build
[x] xhs-markdown-gate-refresh-20260608.txt # 当前质量门禁实现：XHS raw Markdown 控制符阻断 + WeChat 登录态复核
[x] style-catalog-amber-paste-refresh-20260608.txt # 当前规则实现：style-catalog typed choices + amber paste blocked proof
[x] market-editor-element-probe-20260608.txt # 本轮只读浏览器元素探针 + CloakBrowser applied-element rerun：WeChat 后台 + 135/Xiumi taxonomy/应用元素规则
[x] wechat-editor-authenticated-readable-20260609.txt # 当前微信后台：CloakBrowser 登录态编辑器可达且 DOM 可读；不含粘贴/预览/保存/发布
[x] style-proof-checklist-20260609.txt # 当前规则实现：evidence label -> proof requirement 清单；safe draft/phone/Dark Mode/cover gates 独立
[x] market-editor-residue-gate-20260609.txt # 当前规则实现：135/秀米 authoring residue 三平台 runtime 阻断 + focused tests/lint
[x] layout-report-runtime-gate-20260609.txt # 当前规则实现：WeChat 自由布局/图层/背景/触发区 runtime 阻断 + CloakBrowser local visual
[x] xhs-image-manifest-gate-20260609.txt # 当前规则实现：XHS image artifact manifest 本地 preflight 门禁 + CloakBrowser local visual
[x] e2e/flagship-kiln.png                # A2 真 WebView2：赤陶旗舰 SVG 注入截图
[x] e2e/flagship-tempera.png             # A2 真 WebView2：铜绿旗舰 SVG 注入截图
[x] e2e/flagship-amber.png               # A2 真 WebView2：黄铜旗舰 SVG 注入截图
[x] xhs-raster/xhs-raster-cover-grid-browser-*.png  # AC6 真浏览器 canvas：小红书 3:4 PNG 产图
[x] wechat-paste/wechat-*.png            # B PC 后台：真实公众号编辑器粘贴/重粘截图（kiln/tempera 路径证据）
[ ] wechat-paste/wechat-amber-*.png      # B PC 后台：黄铜旗舰富文本/SVG 粘贴补证；普通剪贴板路径已失败，需明确替代渠道
[ ] wechat-flagship-kiln-mobile-<日期>.png      # B 手机预览：赤陶旗舰公众号渲染
[ ] wechat-flagship-tempera-mobile-<日期>.png   # B 手机预览：铜绿旗舰公众号渲染
[ ] wechat-flagship-amber-mobile-<日期>.png     # B 手机预览：黄铜旗舰公众号渲染
[ ] charsperline-<presetId>-<日期>.png   # 推荐：标尺/字数佐证 20-22 字/行（AC3）
[ ] darkmode-flagship-kiln-<日期>.png       # B 手机暗黑模式：赤陶旗舰不反色/不丢背景
[ ] darkmode-flagship-tempera-<日期>.png    # B 手机暗黑模式：铜绿旗舰不反色/不丢背景
[ ] darkmode-flagship-amber-<日期>.png      # B 手机暗黑模式：黄铜旗舰不反色/不丢背景
[ ] smil-interaction-<presetId>-<日期>.png  # B 手机互动：若文章含 SMIL/click 模块，记录触发前后
```

把截图直接放本目录（`prompts/0601/evidence/`）。文本日志同目录。

---

## D. 说明（与 COMPLETION-REPORT 一致）

- 最新自动化门禁与真实 Tauri e2e 已覆盖三旗舰；真实公众号后台 PC 粘贴路径已覆盖 kiln/tempera。`flagship-amber` 普通剪贴板 `text/html` 粘贴在 2026-06-08 已认证编辑器重试中被微信降级为纯文本，因此当前剩余手动门禁是：为 amber 明确验证一个能保留富 HTML/SVG 的真实渠道、微信手机端扫码预览截图、SMIL/点击交互确认、三旗舰手机暗黑模式确认与封面缩略图入口确认。
- 2026-06-09 CloakBrowser `inkforge-0601` 复核证明当前账号可进入微信 PC 图文编辑器，并能读取顶层 `.ProseMirror` 标题/正文 DOM；但当前草稿正文含真实音频卡，未执行任何粘贴、保存、预览或发布。该证据只能作为 `authenticated-editor-reachable` / `pc-editor-dom-readable`，不得外推为 `pc-editor-paste` 或手机端证明。
- 2026-06-09 runtime proof checklist 已落到 `style-catalog.ts`：`pc-editor-paste` 的安全前置包括 `safe-disposable-draft`；本轮只读探测到的 `#js_add_appmsg` 会改变真实多图文草稿结构，未点击，不能作为粘贴测试入口。
- 真 canvas 栅格化（小红书海报）仅在浏览器/Tauri 有 DOM 时运行；2026-06-08 已用 Playwright Chromium 动态导入实际 `renderXhsPosterCard()` 产出 1080×1440 PNG。2026-06-09 已补强知乎 preview-fidelity：`renderZhihuMockHtml()` 会把 `section[data-ink-svg]` inline SVG 转成 `<img data-ink-svg src="data:image/svg+xml...">` image fallback，并由 focused Vitest 覆盖。该本地预览证据不等于知乎 public host、上传、同步或发布成功。
- 2026-06-09 小红书 image artifact manifest 已落到 runtime preflight：`XhsImageArtifactManifest`
  与 `validateXhsImageArtifactManifest()` 只证明本地图片页/封面/长图 artifact 的文件、页序、封面、
  引用、比例、格式、bytes 和裁切状态；`NativeExportResult.artifacts.xiaohongshuImageManifest`
  不是小红书账号上传、手机预览或发布证明。
