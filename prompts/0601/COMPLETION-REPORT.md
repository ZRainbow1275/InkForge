# 完成报告 — InkForge WeChat-safe inline-SVG 高级排版系统（PR1–PR7）

- **任务**：`.trellis/tasks/06-01-multiplatform-render-svg`
- **分支基线**：`dev/visual-fixes`（活体应用树 `inkforge/`）
- **配套契约**：`prompts/0601/PRD.md`（AC1–AC10 / R1–R8）、`prompts/0601/SPEC.md`（实现契约 / 26 变体清单）、`prompts/0601/research/*.md`（5 份一手调研）
- **验证日期**：2026-06-01；最新证据刷新：2026-06-18
- **验证类型**：对抗式终审（adversarial verification）—— 所有断言均经实测复核，未采信未验证的声称。

---

## 0. 一句话结论

在**不重构主管线、不删除任何现有功能/预设/测试**的前提下，落地了一套 WeChat-safe、参数化、可复用、契合「静谧刊印 Quiet Press」品牌哲学的 inline-SVG 高级排版组件系统（26 个注册模块 × 7 族）、3 个全量使用该系统的「SVG 旗舰」微信预设，以及小红书海报栅格化 / 知乎 SVG-as-img 适配。

**自动化与真实运行门禁已刷新**：
- 最新完整 export 测试套件：**35 文件 / 990 用例 全绿**。
- 最新跨平台导出 focused 套件：**4 文件 / 96 用例 全绿**。
- 最新 `platform-export-rendering.test.ts`：**58 用例全绿**。
- 最新 XHS manifest focused 套件：**3 文件 / 69 用例 全绿**。
- 最新非变异 ESLint：`src/services/export` 与本轮质量检测文件均通过。
- 最新 `vue-tsc --noEmit --pretty false`：**exit 0，无错误**。
- 最新生产构建：PowerShell 环境下设置 `NODE_OPTIONS=--max-old-space-size=4096` 后执行 `pnpm -C inkforge build` 通过，Vite built in **27.55s**（本轮证据见 `evidence/style-proof-manifest-draft-20260609.txt`）。
- 最新 Tauri debug 二进制编译：`cargo build -p inkforge` 通过，dev profile **9.15s**（`evidence/cargo-build-refresh-20260608-082813.txt`）。
- GUI e2e 已通过真实 Tauri/WebView2 二进制：`svg-render.spec.cjs` **5 passing**，`visual.spec.cjs` **11 passing**。
- A1 诊断探针已刷新：三旗舰 SVG 几何正常（`viewBox` + `width:100%` + `deltaToParent=0`），但诊断脚本在 401px ExportModal 宽列下报告 `CHARS-OUT-OF-BAND: 27/line`；该项不作为 AC3 graded gate，正式移动排版口径由已通过的 `svg-render.spec.cjs` 覆盖。
- 小红书海报栅格化已通过真实浏览器 canvas 证明：实际动态导入 `renderXhsPosterCard()`，从 `cover-grid` 的 `data-ink-svg` wrapper 产出 1080×1440 PNG。

**诚实声明（剩余人工门禁）**：
- 真实微信公众号后台 **PC 编辑器粘贴路径** 已通过历史 Playwright + 用户扫码登录样本验证：`flagship-kiln` 与 `flagship-tempera` 均有真实 `mp.weixin.qq.com` PC 编辑器 sanitizer/可视化证据；微信 paste sanitizer 在实测样本中保留 8 个 inline SVG 和全部 `data-ink-svg`，并暴露/修复了封面长标题溢出。这些历史样本不等于当前普通 OS Ctrl+V 富 HTML/SVG 证明。
- `flagship-amber` 已由真实导出管线、Tauri/WebView2 e2e、本地 artifact probe、2026-06-09 CloakBrowser 程序化 `ClipboardEvent` channel DOM readback，以及 2026-06-18 普通 OS Ctrl+V disposable draft 证明覆盖。`flagship-kiln` 在 2026-06-18 当前 CloakBrowser type=10/type=77 普通 OS Ctrl+V 重试中进入正文但退化为纯文本（0 SVG / 0 `data-ink-svg`）并已清理失败草稿，因此不得把 Kiln 当前普通 Ctrl+V 视为通过，也不得把 Amber exact-artifact 成功外推到 Kiln/Tempera、手机预览、同步或发布。
- 仍未由当前自动化完全证明的是：微信「预览」扫码后的**手机微信端最终渲染 / SMIL 交互 / 暗黑模式人工确认**。该门禁依赖账号封面图、微信手机客户端和扫码预览，不应被本地测试、Tauri e2e 或 PC 后台 DOM 证据冒充。
- 2026-06-09 已用 CloakBrowser `inkforge-0601` 复核真实微信公众号 PC 图文编辑器：编辑器可达，标题/正文 `.ProseMirror` DOM 可读，底部保存/预览/发表按钮可见且未点击。当前草稿正文含真实音频卡，本轮未做粘贴/保存/预览/发布，因此该证据只标记为 `authenticated-editor-reachable` / `pc-editor-dom-readable`，不能升级 `flagship-amber` 的 `pc-editor-paste` 门禁。
- 2026-06-09 随后已用 CloakBrowser 在真实微信 PC 图文编辑器中对 exact `flagship-amber.html` 触发程序化 `ClipboardEvent('paste')` + `DataTransfer`。微信 paste handler 接管并阻止默认行为，正文读回 `data-ink-svg=3`、`svg=35`、`styleAttr=195`、`classAttr=30`、`hasFlagshipFooter=true`、`hasInteractiveStretch=true`、`hasCover=true`。未点击保存、预览或发表；重启后只读复核首页无 `.ProseMirror` 挂载，近期草稿列表仍为原有四项，未发现新增可见草稿。该证据只升级 amber 的特定 PC ClipboardEvent channel readback，不证明普通 Ctrl+V、手机预览、暗黑模式、封面缩略图、同步、定时发送或发布。
- 2026-06-09 已把 evidence label 的 proof checklist 落到 `style-catalog.ts`：`pc-editor-paste` 明确要求 exact artifact、safe disposable draft、真实 PC paste/channel event、PC DOM readback 和敏感证据隔离；`mobile-preview` 明确要求手机读回/截图、Dark Mode 和封面缩略图检查。只读探测到的微信 `#js_add_appmsg` 会改变真实多图文草稿结构，未点击，不能作为安全粘贴入口。
- 2026-06-09 已新增 `validateStyleProofManifest()`：它校验 redacted proof manifest 是否覆盖 required proof items、是否同一 artifact、是否真实 action/channel/readback、是否存在弱证据冒充强证据、blocked choice 被升级、平台/choice 不一致、敏感本地/profile/HAR/QR/token/cookie 证据引用，以及 Zhihu/XHS manifest proof 缺失。该 validator 不改变 availability/selectable，不证明手机预览、同步或发布。
- 2026-06-09 已新增 `getStyleProofManifestReport()`：它复用 `validateStyleProofManifest()` 的结果，把 manifest 拆成 requirement rows 与 artifact rows，标记 `satisfied` / `missing` / `invalid` / `accepted` / `sensitive` / `unsafe-commit`，并输出缺口、敏感证据和不可提交证据计数。该 report 只服务证据清单和验收报告，不改变 export、availability、selectable、手机预览、同步或发布状态。
- 2026-06-09 已用 CloakBrowser `inkforge-0601` 对 `getStyleProofManifestReport()` 做本地运行时 smoke：真实 Vite 模块动态导入成功，完整 manifest 返回 `valid=true`，弱 PC paste manifest 返回 4 missing + 1 invalid，合成敏感引用返回 sensitive/unsafe 计数；首页 1400×900 无横向溢出。未进入账号页面，未提交截图路径、profile 路径、token、cookie、HAR、QR 或账号材料。
- 2026-06-09 已新增 `createStyleProofManifestDraft()`：它为 evidence-label 或 style-choice 创建空 artifacts 的 redacted proof manifest scaffold，让 `getStyleProofManifestReport()` 在采集真实证据前列出所有缺口；不会生成假 artifact，不改变 export、availability、selectable、手机预览、同步或发布状态。
- 2026-06-09 已用 CloakBrowser `inkforge-0601` 对 `createStyleProofManifestDraft()` 做本地运行时 smoke：真实 Vite 模块动态导入成功，`wechat-flagship-amber` draft 返回 `artifacts: []`、`scope: style-choice`，report 明确列出 10 个 missing proof；`pc-editor-dom-readable` evidence draft 明确列出 3 个 missing proof。未进入账号页面，未提交截图路径、profile 路径、token、cookie、HAR、QR 或账号材料。
- 2026-06-09 已新增 `getPlatformStyleProofReadinessReport()`：它把空 style-choice draft 扩展成平台级验收矩阵，列出每个平台所有样式选择的 missing/invalid proof requirement ids 和 catalog blocked 状态。该矩阵用于后续 CloakBrowser/平台证据采集排程，不证明任何平台粘贴、手机预览、同步或发布成功。CloakBrowser runtime smoke 已确认三平台矩阵在真实 Vite 模块中可运行，并修正了 proof requirement 归属：`credentialed-sync` 只保留通用账号/同步/敏感清洁证明，XHS image-page/long-image 选择单独要求 `xhs-artifact-manifest`，Zhihu image-fallback/upload 选择单独要求 `public-image-host` 与 `zhihu-artifact-manifest`。
- 2026-06-09 已新增 `getPlatformStyleProofCollectionPlan()`：它把平台 readiness 的 missing/invalid requirements 拆成可执行 collection gates：`local-evidence`、`market-editor`、`authenticated-pc-editor`、`phone-preview`、`credentialed-channel`、`public-host`、`platform-publish`、`sensitive-hygiene`，并标记 mutating/external-account/phone/safe-to-automate。CloakBrowser runtime smoke 已动态导入真实 Vite 模块并读回 WeChat/XHS/Zhihu 统计：WeChat 143 个待采集步骤，其中 phone-preview 52、authenticated PC editor 24、safe-to-automate 44；XHS 38 个步骤；Zhihu 43 个步骤。该计划只用于真实证据排程，不升级 blocked 样式，也不证明平台粘贴、手机预览、同步或发布完成。
- 2026-06-09 已把 proof collection plan 接入 ExportModal 样式能力 UI：每个 style choice card 显示 proof summary 和最多 4 个 gate labels，preflight 行显示本平台待补证据总数、本地可自动化、手机和账号/平台步骤。CloakBrowser 桌面 1400×900 与移动 390×844 验证均无水平溢出；重启后已用同一 `inkforge-0601` profile 重复本地 UI 复核。WeChat 样式卡为 15 个，proof summary 15 个，gate labels 60 个。该 UI 只提高用户可见性，不改变 `selectable` / `usable` / `blocked` / `unavailable` 判定，也不证明平台粘贴、手机预览、同步或发布完成。
- 2026-06-09 已新增 `getPlatformStyleProofCollectionQueue()`：它把 collection plan 按有序 gate 分组，输出 `nextGate` / `nextSafeGate`、gate-level choice ids、blocked choice count、mutating/external-account/phone/safe-to-automate counts。CloakBrowser runtime smoke 动态导入真实 Vite 模块读回 WeChat 143 steps / 6 gates、XHS 38 steps / 3 gates、Zhihu 43 steps / 5 gates；ExportModal 样式能力摘要与 preflight 已显示“下一步 本地证据”。该 queue 只用于真实 proof collection 排程，不升级 blocked 样式，也不证明平台粘贴、手机预览、同步或发布完成。
- 2026-06-09 已新增 `getPlatformStyleProofProgressReport(platform, manifests)`：它接收真实 redacted `StyleProofManifest`，按 platform / style choice / gate 聚合 satisfied、missing、invalid、accepted、sensitive 与 unsafe-commit 进度；跨平台或未知 choice manifests 会进入 `ignoredManifestCount`，不会污染当前平台。该 report 复用 `getStyleProofManifestReport()`，只做本地 proof accounting，不改变 `selectable` / `usable` / `blocked` / `unavailable`，也不证明平台粘贴、手机预览、同步、上传、public host acceptance 或发布完成。Focused Vitest 已通过 1 file / 62 tests。
- 2026-06-09 已新增 `getStyleProofManifestPackReport(manifests)`：它把一组 redacted manifests 汇总为 WeChat / Xiaohongshu / Zhihu 三个平台的 progress reports，并额外报告 unknown choices、platform/choice mismatch、duplicate artifact ids 与 same-choice fingerprint mismatch；blocked/unavailable catalog choice 即使证据齐全也保持 invalid progress，不计入 `proofSatisfiedChoices`。该 pack report 是后续真实证据收集器的本地 intake/accounting 边界，不把 evidence-label-only manifest 自动套到所有 choice，也不改变 `selectable` / `usable` / `blocked` / `unavailable`。Focused Vitest 已通过 1 file / 65 tests。
- 2026-06-09 已补强强证据门禁负向回归：`validateStyleProofManifest()` 不再允许 authenticated editor、PC DOM、local browser 或 PC ClipboardEvent readback 仅凭 matching `requirementId` 满足 `safe-disposable-draft`、`mobile-preview`、`credentialed-sync` 或 `published` gates；`safe-disposable-draft` 需要显式 `action:'safe-disposable-draft'`，`cover-thumbnail-check` 需要 `phone-preview`，`sync-readback` 需要 `credentialed-channel`，`published-url-or-platform-preview` 需要 `public-web` 或 `phone-preview`。Focused Vitest 已通过 1 file / 66 tests。
- 2026-06-09 已把 135/秀米 applied-element 学习落到三平台 runtime 残留阻断：`quality-detector.ts` 现在分别输出 `wechat-market-editor-residue`、`xhs-market-editor-residue`、`zhihu-market-editor-residue`。该规则阻断市场 authoring DOM、`tn-*`/`ng-*` 属性和第三方市场素材源；普通文字提到 135/秀米不误报。CloakBrowser 本地首页/工作站/导出面板视觉检查通过，无水平溢出，blocked/unavailable 样式卡保持 disabled。
- 2026-06-09 已把 135/秀米 applied-element 的图层/自由布局风险落到 WeChat runtime 门禁：`quality-detector.ts` 现在输出 `wechat-layout-report-required`，阻断自由定位、z-order、背景图层、裁切、固定几何、手动位移、负 margin 和隐藏触发区，要求 readable DOM order、文本 fallback、crop/overflow/trigger-area 证明或 raster/long-image fallback；普通自有 inline flow 色块不误报。CloakBrowser 本地首页/工作站/导出面板视觉检查通过，无水平溢出、无 emoji、可见控件非零尺寸。
- 2026-06-09 已把小红书图片页/封面/长图 artifact manifest 落到 runtime preflight：`XhsImageArtifactManifest` 与 `validateXhsImageArtifactManifest()` 阻断页序、封面、文件存在性、正文引用、比例/尺寸、格式、bytes 和裁切问题；`convertToNativeFormat(..., 'xiaohongshu')` 可返回 `artifacts.xiaohongshuImageManifest`，但该字段只证明本地 artifact 预检，不升级为小红书上传、手机预览或发布完成。CloakBrowser `inkforge-0601` 本地首页/工作站/导出面板/小红书页签视觉检查通过，无水平溢出、无 emoji、可见控件非零尺寸。
- 2026-06-09 已把知乎公式图/图表图/表格图/正文图/封面图 fallback artifact manifest 落到 runtime preflight：`ZhihuImageArtifactManifest` 与 `validateZhihuImageArtifactManifest()` 阻断 host、上传证明、本地文件、alt/caption、格式、尺寸、bytes 与 Markdown 引用不一致；`convertToNativeFormat(..., 'zhihu')` 可返回 `artifacts.zhihuImageArtifactManifest`，但该字段只证明本地/平台 host 预检，不升级为知乎账号上传、编辑器预览、同步或发布完成。样式能力目录同步新增 `zhihu-artifact-manifest` proof requirement，知乎 image-fallback 样式会同时列出 `public-image-host` 与 manifest 门禁。

---

## 1. 交付范围（PR1–PR7 汇总表）

| PR | 主题 | 交付物 | 状态 |
|----|------|--------|------|
| PR1 | 地基 | `svg-modules/{types,primitives,theme,wechat-safe}.ts` + 单测（安全子集校验器、调色板派生、原子构造器） | ✅ 完成 · 测试绿 |
| PR2 | 静态模块族 | `headers/dividers/quotes/badges/endmarks/covers.ts`（22 个静态变体）+ 每族单测 | ✅ 完成 · 测试绿 |
| PR3 | 注入集成 | `inject.ts`（`composeSvgDecorate`）+ `index.ts` 注册表；微信 `OPAQUE_TAGS` 加 `svg`；契约测试断言放宽；`MarkdownPreview.vue` 预览白名单加白；preview-fidelity mock 增强 | ✅ 完成 · 测试绿 |
| PR4 | SMIL 交互族 | `interactive.ts`（i-clickswitch / i-scrollcards / i-fadein / i-sequence，4 变体）+ 静态兜底 + 单测 | ✅ 完成 · 测试绿 |
| PR5 | 小红书海报 + 知乎适配 | `raster.ts`（`rasterizeSvg` 真 canvas / `buildSvgDataUri` / `svgToImgTag` / `posterViewBox`）+ 单测 | ✅ 完成 · 测试绿 |
| PR6 | 冗余双做预设 | `ExportOptions` 加 `enableSvgModules`/`svgInjectionPlan`（默认关，零回归）+ 3 个旗舰预设接入 `themes.ts` + `iconography.ts` lucide 映射 + `flagship-svg.test.ts` | ✅ 完成 · 测试绿 |
| PR7 | 验证与证据 | `flagship-pipeline-smoke.test.ts`（端到端真测）+ e2e 探针 `svg-render.cjs`/`.spec.cjs` + 本报告 + 证据指南 | 自动化与真实 Tauri e2e 已覆盖三旗舰；历史公众号后台 PC sanitizer 样本覆盖 kiln/tempera，amber 已补特定 ClipboardEvent channel 和普通 OS Ctrl+V exact-artifact proof；Kiln 当前普通 OS Ctrl+V 为纯文本负向证据；手机扫码预览仍为人工门禁 |

---

## 2. 文件清单

### 2.1 新建（svg-modules/，主要交付，低风险加法）

| 文件 | 职责 |
|------|------|
| `src/services/export/svg-modules/types.ts` | `SvgPalette` / `SvgThemeContext` / `SvgModuleParams` / `SvgModuleSpec` / `SvgModuleFamily` |
| `src/services/export/svg-modules/theme.ts` | `deriveSvgPalette`（纯函数）/ `buildThemeContext` — 从 primaryColor+persona+品牌 token 派生调色板 |
| `src/services/export/svg-modules/primitives.ts` | 安全 SVG 原子构造器 + 脚手架（`svgSection`/`hiddenFulltext`/`mpStyleTrailer`/`darkSafeBg`/SMIL 构造器） |
| `src/services/export/svg-modules/wechat-safe.ts` | `checkWechatSafe`/`assertWechatSafe` — 19 条安全子集规则（AC9 执行体） |
| `src/services/export/svg-modules/headers.ts` | header 族 4 变体（badge-num / bracket / ribbon / vrule） |
| `src/services/export/svg-modules/dividers.ts` | divider 族 5 变体（grid / dots / fade / diamond / forge） |
| `src/services/export/svg-modules/quotes.ts` | quote 族 4 变体（corner / vbar / mark / card） |
| `src/services/export/svg-modules/badges.ts` | badge 族 3 变体（num / kpi / tag） |
| `src/services/export/svg-modules/endmarks.ts` | endmark 族 3 变体（fin / vessel / rule） |
| `src/services/export/svg-modules/covers.ts` | cover 族 3 变体（title / grid / quote） |
| `src/services/export/svg-modules/interactive.ts` | interactive 族 4 变体（i-clickswitch / i-scrollcards / i-fadein / i-sequence）+ 静态兜底 |
| `src/services/export/svg-modules/raster.ts` | SVG→PNG 真 canvas 栅格化 + SVG-as-img data-URI（小红书海报 / 知乎） |
| `src/services/export/svg-modules/inject.ts` | `composeSvgDecorate(plan, theme)` — 符合 `decorate(html,target)` 契约，幂等锚点替换 |
| `src/services/export/svg-modules/index.ts` | 注册表 `SVG_MODULES`(26) / `SVG_MODULE_REGISTRY` + 公共导出（含 `composeSvgDecorate`/`checkWechatSafe`） |
| `src/services/export/svg-modules/__tests__/*.test.ts` | 13 个单测文件（见 §4） |

### 2.2 新建（测试 / e2e）

| 文件 | 职责 |
|------|------|
| `src/services/export/__tests__/flagship-svg.test.ts` | PR6 旗舰预设全 wechat 管线集成测试 + 非旗舰降级守护 |
| `src/services/export/__tests__/flagship-pipeline-smoke.test.ts` | PR7 端到端冒烟（逐 module-id 命中 + 全 section safe + 字/行锁 + 幂等 + opt-in 守护） |
| `tests/e2e/probes/svg-render.cjs` | tauri-driver 真二进制几何探针（bbox / viewBox / width:100% / charsPerLine），诊断脚本 |
| `tests/e2e/specs/svg-render.spec.cjs` | wdio 可纳入 spec glob 的 e2e 规格 |

### 2.3 既有文件加法式改动（不删函数、不改既有签名语义）

| 文件 | 改动（加法） |
|------|------|
| `src/services/export/platform-rules/wechat.ts` | `OPAQUE_TAGS` 集合新增 `'svg'`（连同子树视为不透明，`applyCjkLatinSpacing` 不向 SVG `<text>` 注 U+202F） |
| `src/services/export/types.ts` | `ExportOptions` 新增可选 `enableSvgModules?: boolean` / `svgInjectionPlan?: SvgInjectionPlan`（默认 undefined → 现状零回归） |
| `src/services/export/themes.ts` | 追加 3 个旗舰预设 + 3 个 `SvgInjectionPlan` + 3 个品牌色常量 + `import { composeSvgDecorate }`（既有 12 预设 decorate 不变） |
| `src/utils/iconography.ts` | `exportIconMap` 新增 `flagship-kiln→Flame` / `flagship-tempera→BookOpen` / `flagship-amber→Award`（lucide，零 emoji） |
| `src/components/editor/MarkdownPreview.vue` | 预览 DOMPurify `ADD_TAGS` 加 `svg/g/path/.../animate/set/animateTransform`；`ADD_ATTR` 加 SMIL 属性（begin/dur/values/…/restart）+ `data-ink-svg` |
| `src/services/export/preview-fidelity/*-mock.ts` | 末尾叠加 SVG 模块呈现（不删既有逻辑） |
| 既有 `*.test.ts`（`platform-export-rendering` 等） | 按 SPEC §5.4 放宽「有意 SVG」识别（允许 `data-ink-svg`，仍禁游离 Mermaid SVG / 全局 class） |

> 注：`inkforge/` 子树相对父仓库为新增/未跟踪态，故 `git diff` 在子树层级对部分文件无输出；改动以源码现态为准（已逐一读核）。

---

## 3. WeChat-safe 子集契约（`wechat-safe.ts` 强制）

`checkWechatSafe(svgHtml)` 返回违规数组（空=合规）；`assertWechatSafe` 抛错。19 条规则（来自 `research/wechat-svg-capabilities.md` 的 DIES/CONDITIONAL 表）：

| 规则 | 命中即违规 |
|------|------------|
| no-class | `\sclass=`（微信剥 class） |
| no-style-block | `<style` |
| no-css-var | `var(--` |
| no-calc | `calc(` |
| no-div | `<div`（须 `<section>`） |
| no-foreign-object | `<foreignObject` |
| no-id-referenced | `<defs/linearGradient/radialGradient/clipPath/mask/filter/feGaussianBlur/feColorMatrix/use/symbol/pattern`（依赖 id，微信剥 id） |
| no-url-ref | `url(#`（fill="url(#id)" 失效） |
| no-style-transform | `style="…transform:"`（被 `enforcePlatformCSS` 剥；须用 transform XML 属性） |
| no-style-animation | `style="…animation/transition:"`（须用 SMIL） |
| no-keyframes | `@keyframes` |
| no-script | `<script` |
| no-xlink | `xlink:href` |
| no-svg-image | `<image`（须 background-image 或 `<img>`） |
| no-bad-smil-trigger | `begin="…touchstart/touchend/mouseover/mouseout/focusin/focusout"`（须 `begin="click"`） |
| no-fixed-svg-width | 外层 `<svg width="123">`（须 `width="100%"`+viewBox） |
| no-iframe / no-media | `<iframe>` / `<video|audio>` |

**强制点**：所有 26 模块在 `modules.snapshot`/各族单测中逐条 `checkWechatSafe()` 必须返回 `[]`；旗舰预设经**完整微信管线**后切出的每个 `<section data-ink-svg>` 块也逐块 `checkWechatSafe()` 零违规（`flagship-svg.test.ts` + `flagship-pipeline-smoke.test.ts`）。

---

## 4. 测试统计（实测复核）

### 4.1 svg-modules 套件 — 13 文件 / 255 用例 全绿（初始 PR1-PR7）
```
pnpm exec vitest run src/services/export/svg-modules
 Test Files  13 passed (13)
      Tests  255 passed (255)
```
文件：`wechat-safe / theme / primitives / headers / dividers / quotes / badges / endmarks / covers / interactive / inject / raster / registry`。

### 4.2 完整 export 套件 — 33 文件 / 822 用例 全绿（初始 PR1-PR7，含上面 13 + 旗舰冒烟）
```
pnpm exec vitest run src/services/export --testTimeout=30000
 Test Files  33 passed (33)
      Tests  822 passed (822)
```
含 `__tests__/flagship-pipeline-smoke.test.ts`（PR7 端到端真测）与 `__tests__/flagship-svg.test.ts`、既有回归套件（`platform-export-rendering` / `pipeline-cross-platform` / `preset-decorations` / `themes-migration` / `xhs` / `zhihu` / `preset-fonts` / `wechat-publish` / `citation-export` 等）。

### 4.3 typecheck — exit 0
```
pnpm exec vue-tsc --noEmit   → EXIT=0（无错误输出）
```

### 4.4 lint — exit 0
```
pnpm exec eslint src/services/export/svg-modules src/services/export/themes.ts src/services/export/types.ts src/utils/iconography.ts --ext .ts   → EXIT=0
```

### 4.5 2026-06-09 最新质量门刷新

```bash
pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default
# 1 file passed, 55 tests passed

pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default
# 4 files passed, 94 tests passed

pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/image-pipeline/image-pipeline.test.ts src/services/export/xhs.test.ts --reporter=default
# 3 files passed, 69 tests passed

pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism
# 35 files passed, 988 tests passed

pnpm -C inkforge exec eslint src/services/export --ext .ts,.vue --quiet
# passed

pnpm -C inkforge exec vue-tsc --noEmit --pretty false
# passed

NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
# passed, Vite built in 32.64s

cargo build -p inkforge
# passed, dev profile compiled in 9.15s
```

对应新增日志：

- `prompts/0601/evidence/build-refresh-20260608-082644.txt`
- `prompts/0601/evidence/cargo-build-refresh-20260608-082813.txt`
- `prompts/0601/evidence/probe-svg-render-20260608-082919.txt`
- `prompts/0601/evidence/e2e-svg-render-20260608-083022.txt`
- `prompts/0601/evidence/market-source-refresh-20260608.txt`
- `prompts/0601/evidence/market-editor-residue-gate-20260609.txt`
- `prompts/0601/evidence/xhs-image-manifest-gate-20260609.txt`
- `prompts/0601/evidence/zhihu-image-manifest-gate-20260609.txt`
- `prompts/0601/evidence/style-proof-manifest-validator-20260609.txt`
- `prompts/0601/evidence/style-proof-strong-gate-regression-20260609.txt`

补充解释：`probe-svg-render-20260608-082919.txt` 是非 graded 的几何诊断探针。它在当前
ExportModal 401px / 15px 口径下报告 27 字/行，因此保留为需要人工解读的诊断提示；
`e2e-svg-render-20260608-083022.txt` 中正式 `svg-render.spec.cjs` 仍通过移动排版真实布局断言：
三旗舰注入 responsive `[data-ink-svg]`，并且 flagship body yields a mobile-comfortable
~20-22 CJK chars/line。

市场来源刷新：`market-source-refresh-20260608.txt` 记录了 Playwright 对 135/Xiumi 公开页的
真实浏览器观察、Exa 对 135 官方产品页与 Xiumi Chrome 插件页的复核，以及 Grok 搜索弱来源处理。
结论只进入 taxonomy、artifact-family、credentialed workflow 和 proof hierarchy，不放宽
WeChat-safe SVG 安全子集，也不把插件/同步/授权/定时群发视作最终发布证明。

---

## 5. 3 个 SVG 旗舰预设（R7 / AC7）

| id | 名称 | primaryColor | persona | plan 注入模块（逐字核自 themes.ts） |
|----|------|--------------|---------|--------------------------------------|
| `flagship-kiln` | 赤陶旗舰（炉火·朱砂） | `#D95B3F` | creative | cover-grid / header-ribbon(h2) / header-vrule(h3) / divider-forge(hr) / quote-mark / endmark-vessel |
| `flagship-tempera` | 铜绿旗舰（冷却铜绿） | `#3B7A6B` | academic | cover-title / header-bracket(h2) / header-vrule(h3) / divider-diamond(hr) / quote-corner / endmark-fin |
| `flagship-amber` | 黄铜旗舰（熔铸黄铜） | `#C19A56` | business | cover-title / header-vrule(h2) / divider-grid(hr) / quote-vbar / endmark-rule |

- 3 个旗舰预设的 `decorate` 全量为 `composeSvgDecorate(plan, theme)`；既有 12 微信预设的 `decorate` 仍走 `chainDecorators` / 既有 recipe，**不注入任何 SVG**（`flagship-svg.test.ts` + `flagship-pipeline-smoke.test.ts` 的非旗舰守护用例实测验证）。
- 全部追加进 `themePresets[]`，既有 12 微信 + 5 小红书 + 3 知乎预设**原样保留**（实测计数：themes.ts 15 个 id = 12 + 3 旗舰；xiaohongshu.ts 5 个；zhihu.ts 3 个）。

---

## 6. 验收标准逐条映射（AC1–AC10）

| AC | 结论 | 证据 |
|----|------|------|
| **AC1** 微信真机粘贴渲染正确 | PC 后台粘贴路径已实测；amber 有特定 ClipboardEvent channel 与普通 OS Ctrl+V exact proof；手机扫码预览仍为人工门禁 | `flagship-pipeline-smoke.test.ts` 证明产物经完整微信管线后 SVG 存活且 safe；`pnpm -C inkforge test:e2e` 已用真实 Tauri/WebView2 二进制验证三旗舰响应式 SVG 与 20 字/行；真实 `mp.weixin.qq.com` 后台 PC 编辑器 paste sanitizer 已在 kiln/tempera 历史样本中保留 8 个 inline SVG / 8 个 `data-ink-svg`。`flagship-amber` 在 2026-06-09 CloakBrowser 程序化 `ClipboardEvent` + `DataTransfer` channel 读回 `data-ink-svg=3` / `svg=35`，并在 2026-06-18 普通 OS Ctrl+V disposable draft 中读回 `svg=35` / `data-ink-svg=3`。`flagship-kiln` 当前普通 OS Ctrl+V 重试退化为纯文本并已清理，不能 claim ordinary rich paste。尚缺手机微信扫码预览截图来证明最终手机端渲染、暗黑模式、封面缩略图与 SMIL 交互。 |
| **AC2** ≥7 族 × persona 可复用 | ✅ 实测绿 | `svg-modules/__tests__/registry.test.ts`（26 模块 / 7 族）+ 各族 `*.test.ts` × 4 persona 快照 + safe 校验；`flagship-pipeline-smoke.test.ts` 逐 module-id 命中。 |
| **AC3** 20-22 字/行不破坏 | 实测绿 | `flagship-pipeline-smoke.test.ts` 断言 `generatePersonaBaseCSS` 仍含 `min(22em` + `font-size: 17px`；真实 Tauri/WebView2 e2e 在 360px 移动列测得 **20 字/行**，落在目标带内。 |
| **AC4** 12+5+3 预设 + 既有测试零回归 | ✅ 实测绿 | 完整 export 套件 33 文件 / 822 用例全绿（含 `themes-migration`/`platform-export-rendering`/`pipeline-cross-platform`）；预设计数 12+5+3 原样；`flagship-svg.test.ts` + `flagship-pipeline-smoke.test.ts` 非旗舰守护实测「无 data-ink-svg / 无 `<svg`」。 |
| **AC5** SMIL 交互 + PC 静态兜底 | 自动化结构与静态兜底实测绿；手机微信触发仍随 AC1 人工门禁确认 | `svg-modules/__tests__/interactive.test.ts`：wechat(allowMotion=true) 出 SMIL（`restart="never"` + `begin∈{click,0s}`）；xhs(allowMotion=false) 实测**无 `<animate`/`<set`**（静态首帧）；i-scrollcards 纯 CSS scroll-snap 无 flex 无 SMIL。该证据证明模块结构、静态兜底与本地/预览路径，不证明手机微信扫码预览中的点击/SMIL 触发。 |
| **AC6** 小红书海报 canvas 真栅格 / 知乎 SVG-as-img | 实测绿；知乎发布仍受 public image host / platform-host manifest gate 约束 | `svg-modules/__tests__/raster.test.ts` 覆盖 `posterViewBox`、`buildSvgDataUri`、`svgToImgTag` 与 DOM 缺失守卫；2026-06-08 真实浏览器 canvas 动态导入项目实际 `renderXhsPosterCard()`，将 `cover-grid` 的 `data-ink-svg` wrapper 产出 1080×1440 PNG（99114 bytes，SHA-256 `1132933ecec1828c0129e8e92ec2553b4c54264ecda70ad228f15e7c62db101d`），证据见 `evidence/xhs-raster/`。2026-06-09 `renderZhihuMockHtml()` 已改为把 `section[data-ink-svg]` inline SVG 转成 `<img data-ink-svg src="data:image/svg+xml...">` 预览 fallback，并由 `zhihu-mock.test.ts` / `svg-modules-fidelity.test.ts` / `usePreviewRenderer.test.ts` 证明；同日新增 `ZhihuImageArtifactManifest` preflight 与 regression tests，阻断不可发布 host、缺上传证明、缺本地文件/bytes、缺 alt/caption、格式/尺寸/Markdown 引用不一致。该证据不外推为知乎账号上传、编辑器预览、同步或发布成功。 |
| **AC7** 旗舰预设 ≥3 全量 SVG | 实测绿；手机端最终确认同 AC1 | §5 三个旗舰预设；`flagship-pipeline-smoke.test.ts` 逐字核对每个预期 module id；真实 Tauri/WebView2 e2e 对三旗舰均确认 `[data-ink-svg]` 注入和响应式绘制。 |
| **AC8** 单测+冒烟+e2e+lint+typecheck 全绿 | 实测绿 | §4.1–4.5 全绿；`pnpm -C inkforge test:e2e` 已跑真实 Tauri/WebView2 二进制，`svg-render.spec.cjs` 5 passing，`visual.spec.cjs` 11 passing。 |
| **AC9** WeChat-safe 校验零违规 | ✅ 实测绿 | `wechat-safe.test.ts` 正/负样本；全 26 模块单测 `checkWechatSafe()=[]`；旗舰预设经**完整管线**后每个 section 仍零违规（`flagship-svg`/`flagship-pipeline-smoke`）。 |
| **AC10** 全程零 emoji，仅 lucide | ✅ 实测绿 | `iconography.ts` 扫描：emoji 仅作 **alias 键**（待归一化的旧输入），渲染图标值 **全部 lucide 组件**（34 行 alias-key emoji / 0 行非 alias emoji）；旗舰图标 = `Flame`/`BookOpen`/`Award`（lucide）。 |

---

## 7. 已知限制（诚实披露）

1. **GUI e2e 已覆盖三旗舰；真实公众号后台 PC sanitizer 样本已覆盖 kiln/tempera；amber 已补特定 ClipboardEvent channel 和普通 OS Ctrl+V exact proof；剩余手动门禁仍包括微信手机端扫码预览确认和 Kiln/Tempera 当前 ordinary-rich-paste 证明**。tauri-driver 真二进制几何探针已跑通（含 prod 加密路径），真实公众号后台 PC 编辑器 paste sanitizer 也已证明 inline SVG 在已测样本中被保留并渲染。`flagship-kiln` 在 2026-06-18 当前普通 OS Ctrl+V 重试中退化为纯文本并完成失败草稿清理。剩下需要补齐的，是微信手机客户端扫码预览后的最终移动端渲染、SMIL 交互、暗黑模式和封面缩略图门槛；若要对外声称 Kiln/Tempera 普通 Ctrl+V、插件传输或授权同步可用，需要单独渠道证明。
2. **旗舰 SVG 为品牌色锁定（by design）**。3 个旗舰预设 primaryColor 固定为 `#D95B3F`/`#3B7A6B`/`#C19A56`，体现「静谧刊印」品牌门面；如需任意色，使用既有 12 预设 + `ExportOptions.enableSvgModules` 开关（默认关，零回归）按需注入。
3. **真 canvas 栅格化（`rasterizeSvg`）仅在浏览器 / Tauri WebView 运行**。Node 单测覆盖纯函数（viewBox / data-URI / img-tag）与无 DOM 守卫抛错路径；2026-06-08 追加真实浏览器证据：动态导入实际 `renderXhsPosterCard()`，由 `cover-grid` 的 `data-ink-svg` wrapper 产出 `data:image/png;base64,`，自然尺寸 1080×1440，字节数 99114，SHA-256 `1132933ecec1828c0129e8e92ec2553b4c54264ecda70ad228f15e7c62db101d`。证据见 `evidence/xhs-raster/`。
4. **知乎图片 manifest 是 preflight，不是发布证明**。`ZhihuImageArtifactManifest` 可证明图片 fallback 的 host、上传证明、本地文件、alt/caption、格式、尺寸、bytes 与 Markdown 引用一致性；没有真实知乎账号上传响应、编辑器预览读回、同步或发布回执时，平台状态仍应是 `blocked` / `unavailable`。
5. **跨 WebView2 版本兼容**已按 SVG 1.1 标准子集 + SMIL `begin="click"` + 静态兜底设计，并在当前 Win11 自动化门禁下验证；其他 WebView2 版本的真机渲染属周期性人工复验范畴（AC1 门禁覆盖）。

---

## 8. 复现命令

```bash
cd D:/Desktop/Inkforge/inkforge
pnpm exec vitest run src/services/export/svg-modules                 # 13 文件 / 255 绿
pnpm exec vitest run src/services/export --testTimeout=30000         # 33 文件 / 822 绿
pnpm exec vue-tsc --noEmit                                           # exit 0
pnpm exec eslint src/services/export/svg-modules src/services/export/themes.ts \
  src/services/export/types.ts src/utils/iconography.ts --ext .ts    # exit 0
```

真机 / GUI 证据采集与当前剩余门禁见 `prompts/0601/evidence/README.md`。

```bash
# 真机 GUI e2e（真 Tauri WebView2 二进制，prod dist）
pnpm build                      # PROD dist（加密开启）
pnpm test:e2e                   # onPrepare cargo build 重嵌 + 跑 svg-render + visual
#  → svg-render.spec 5 passing（前置播种 + 3 旗舰 SVG 注入 + chars/line=20）
#  → visual.spec     11 passing
# 全量单测（含 7 个 keychain 单测）
npx vitest run --testTimeout=30000     # 85 文件 / 1165 用例全绿
# Rust keychain 命令
cd src-tauri && cargo build            # exit 0（keyring 3.6.3 windows-native）
```

---

## 10. 真机 e2e 实测纪实 + prod 加密自动解锁修复（本轮新增）

### 10.1 真机多轮 e2e（tauri-driver + msedgedriver 驱动真 WebView2 二进制）
- **播种走 app 自有真实路径**：经 Vue runtime 触达 live Pinia `article` store → `addArticle`（zod 校验 + 加密 + 审计）→ `selectArticle` → editor 载入 → ExportModal 预览经**真实 `markdownToWechatWithStats` 管线**渲染。零 mock。
- **多轮稳定确定性**（rounds 2/3/4 连跑）：`svg-render.spec` **5 passing**（前置 + flagship-kiln/tempera/amber 各注入 6–7 个 `[data-ink-svg]` 模块，viewBox `0 0 1080 620`、`svgW==parentW` deltaToParent=0=width:100% 完美追踪、绘制尺寸>0）；`visual.spec` **11 passing**；每轮一致。
- **20–22 字/行铁律真机实证**：以**出货字号 17px** 在离屏 360px 移动列对真实正文做真实字形排版 → **20 字/行**（99 字 5 行），落在 18–24 带、正中目标。该探针顺带可抓 U+202F 字距注入回归。
- **证据**：`evidence/e2e/{flagship-kiln,flagship-tempera,flagship-amber}.png`（真 WebView2 截图，各 ~300KB，可见 cover 网格+ember、引用符、标题入封面）。

### 10.2 e2e 揭示并修复的正交潜伏缺陷：prod Tauri 加密主密钥永不解锁
- **现象**：round 1（修复前，prod dist）`addArticle` 抛 `创建articles失败` → 5 个 SVG 用例 skip。
- **根因**：`ENABLE_ENCRYPTION = PROD && Tauri`，prod 桌面构建加密开启，但全仓**无人调用 `unlockWithPassword`** → `getMasterKey()` 抛「主密钥未解锁」。用户日常 `tauri:dev`（PROD=false 加密关）从不触达。与 SVG 任务**正交**，是「设计已画、接线未接」（TS 早已 `invoke('store_key')` 但 Rust 端这 3 个命令从未实现）。
- **修复（用户批准的 Option 1：OS keychain 启动自动解锁）**：
  - Rust 新增 `commands/secure_store.rs` 的 `store_key/get_key/delete_key`（`keyring 3.6.3` windows-native = Windows 凭据管理器；`NoEntry→Ok(None)`），注册进 `generate_handler!`。
  - TS 新增 `ensureMasterKeyUnlocked()`（keychain 空才 generate+save，否则 load——**绝不每次重生成**），`main.ts` 启动调用（不阻塞 mount）。
  - `storage.ts` 三 keychain 函数改走 `@/utils/platform.tauriInvoke`；统一 Tauri 环境判定到 6-全局 `isTauriEnv()`（`withGlobalTauri:false` 下无 `window.__TAURI__`）。
- **修复后端到端验证**：round 2+ `addArticle` **成功**（`articleId` 返回），SVG 全程跑通。
- **数据安全（密钥持久化）铁证**：① `cmdkey /list` 见 `LegacyGeneric:target=com.inkforge.keychain:inkforge_master_key_v3.com.inkforge.keychain`（OS 级，跨重启/跨 WebView2 profile 存活）；② keyring set→get→delete→NoEntry 真凭据库探针；③ 7 个 `ensure-unlock.test.ts` 单测覆盖全分支。契约见 `.trellis/spec/backend/secure-keychain-unlock.md`。

### 10.3 真实微信公众号后台「PC 编辑器粘贴渲染」验证（Playwright 驱动真浏览器 + 用户扫码登录）
在**真实公众号后台**（账号「高天方寒」，`mp.weixin.qq.com` 图文编辑器）经 Playwright 模拟**真实 paste 事件**（`text/html` 经 `DataTransfer`，触发微信 ProseMirror 自身 paste sanitizer）灌入 `flagship-kiln` 产物，并读回 sanitizer 实际保留的 DOM：
- **inline SVG 穿透微信编辑器 paste sanitizer**：历史 sanitizer 样本粘贴前 8 `<svg>` → 保留 **8**；`data-ink-svg` 8 → **8**；`<rect>` 22 / `<text>` 10 / `<path>` 11 全部保留；`<img>` 0（SVG 保持内联，无需降级栅格化）。这证明 `flagship-kiln` / `flagship-tempera` 样本在真实公众号 **PC 编辑器 paste sanitizer** 中可保留并渲染 inline SVG；`flagship-amber` 在 2026-06-09 通过 CloakBrowser 程序化 `ClipboardEvent` channel 读回 `data-ink-svg=3` / `svg=35`，并在 2026-06-18 普通 OS Ctrl+V 中读回 `svg=35` / `data-ink-svg=3`。这些 PC 证据仍不代表手机微信端最终预览、SMIL 触发或暗黑模式已通过；当前 Kiln 普通 OS Ctrl+V 重试已记录为纯文本负向证据。
- **PC 编辑器可视化渲染**（实测此版编辑器**会**渲染 inline SVG，非 README 旧设想）：`flagship-kiln` 的封面 `cover-grid`（网格 + ember 点 + 标题）、`divider-forge`（线 + 中心 ember）、`quote-mark` 大引号、文末 `endmark-vessel`（鼎×笔尖 + "InkForge·墨铸" 署名）曾在历史 PC sanitizer 样本中正确渲染；`flagship-tempera` 的 `cover-title`（96px 大标题）+ `quote-corner`（铜绿角括号）亦验证。证据截图见 `evidence/wechat-paste/wechat-*.png`。`flagship-amber` 已补程序化 ClipboardEvent channel 的 PC DOM readback和普通 OS Ctrl+V exact proof；Kiln/Tempera 当前 ordinary-rich-paste、手机预览、暗黑模式和发布仍需另证。
- **真机暴露并修复封面长标题溢出**：长标题「静谧刊印：当排版成为一种克制的力量」(17 字) 在 `cover-grid` 第一行排 14 字、字号 84、溢出 viewBox 122px。根因：`covers.ts` `splitLines` 的 `maxCharsPerLine` 硬编码 14、不随字号/可用宽度自适应。修复：新增 `fitCharsPerLine(availableW, fontSize, letterSpacing)`，三封面变体改按可用宽度推导每行字数（cover-title 9 / cover-grid 10 / cover-quote 16）。重生成产物后真机重粘验证：两封面变体 `coverMaxOverflowPx` 分别 −62 / −63（落在 viewBox 内，**不再溢出**），svg-modules 13 文件/264 测试绿（含新增溢出守卫）。
- **仍需人工补证**：微信「预览/群发到手机」要求先插一张封面缩略图（微信硬性要求，与正文无关）——手机微信端最终渲染、SMIL 交互、暗黑模式和封面缩略图由用户完成最后确认。PC 后台 paste 成功不能替代手机端最终预览；Kiln/Tempera 普通 Ctrl+V、插件传输或授权同步若要对外宣称，也必须按渠道单独证明。

---

## 9. 结论

自动化门禁（单测/冒烟/typecheck/lint/build）全绿，真实 Tauri/WebView2 e2e 全绿：3 旗舰预设在真 WebView2 注入响应式 SVG、20 字/行铁律实证、prod 加密路径打通。真实微信公众号后台 PC 编辑器粘贴路径已证明 inline SVG 能在历史样本中穿透 paste sanitizer 并可视化渲染；该实测还暴露并修复了封面长标题溢出。`flagship-amber` 已补充 CloakBrowser 程序化 `ClipboardEvent` channel 的 PC DOM readback 和 2026-06-18 ordinary OS Ctrl+V exact proof；`flagship-kiln` 当前 ordinary OS Ctrl+V 重试已记录为纯文本负向证据。AC2/AC3/AC4/AC6/AC7/AC8/AC9/AC10 已由自动化与真实运行证据覆盖；AC5 的安全 SMIL 结构与静态兜底由自动化覆盖，但手机微信点击/SMIL 触发仍并入 AC1 人工门禁。**剩余门禁** = 微信手机端扫码预览中的最终渲染、SMIL 交互、暗黑模式、封面缩略图要求确认，以及 Kiln/Tempera 普通 Ctrl+V/插件/同步等其他渠道如需宣称时的单独证明。

---

## 2026-06-09 Style Proof Acceptance Audit Addendum

- Added `getPlatformStyleProofAcceptanceAuditReport(platform, manifests)` and
  `getStyleProofAcceptanceAuditReport(manifests)` as a local acceptance audit layer above the
  style-proof progress and manifest-pack reports.
- The audit report classifies open proof gates as `completed`, `missing`, `invalid`,
  `blocked-by-external`, or `unsafe-to-automate`, and emits explicit `cannotClaim` requirement
  rows. It does not create proof artifacts and does not change style availability or selectability.
- The report keeps ordinary Ctrl+V rich HTML, channel-specific PC ClipboardEvent readback, phone
  preview, phone SMIL/click behavior, Dark Mode, cover thumbnail, credentialed sync, public host,
  and publish proof as separate claims. Local browser, PC DOM, authenticated editor, and weak
  ClipboardEvent readbacks cannot satisfy those stronger rows.
- Verification for this addendum:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed 1 file / 68 tests.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/__tests__/pipeline-cross-platform.test.ts src/services/export/xhs.test.ts src/services/export/zhihu.test.ts --reporter=default`
  passed 4 files / 107 tests.
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed 35 files / 1001 tests.
  `pnpm -C inkforge exec eslint src/services/export/style-catalog.ts src/services/export/index.ts src/services/export/platform-export-rendering.test.ts --quiet`
  passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built in 43.75s.
- Boundary: this addendum proves local acceptance accounting and cannot-claim enforcement only. It
  does not prove WeChat phone preview, mobile Dark Mode, mobile SMIL/click interaction, cover
  thumbnail acceptance, credentialed sync, scheduled send, public host acceptance, XHS/Zhihu account
  upload, or publish success.

---

## 2026-06-17 Style Proof Acceptance UI Addendum

- ExportModal now consumes `getPlatformStyleProofAcceptanceAuditReport(platform)` and surfaces the
  local acceptance audit directly in the style capability area.
- The style catalog summary shows cannot-claim totals; each style choice card shows a compact
  acceptance audit line and up to four cannot-claim requirement labels; export preflight now includes
  a `验收宣称审计` row.
- This is a read-only operator guard. It does not change style availability, selectable state,
  preset mapping, export rendering, copy/download, draft creation, sync, upload, or publish behavior.
- Verification:
  `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue --quiet` passed.
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` passed.
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed 1 file / 68 tests.
  `cd inkforge && pnpm exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
  passed 1 file / 6 tests against the real Tauri/WebView2 runner.
  `pnpm -C inkforge test:e2e` passed 2 files / 17 tests against the real Tauri/WebView2 runner.
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed, Vite built in 39.18s.
- Boundary: this addendum proves local UI surfacing of cannot-claim accounting only. It does not
  prove WeChat phone preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail
  acceptance, credentialed sync, scheduled send, public host acceptance, XHS/Zhihu account upload,
  or publish success.

---

## 2026-06-17 Committed Local Style Proof Evidence Addendum

- Added `getCommittedStyleProofLocalEvidenceManifests()` and
  `getCommittedStyleProofLocalEvidenceAuditReport()` as explicit local-evidence helpers above the
  existing `StyleProofManifest` validator, progress report, manifest pack report, and acceptance
  audit.
- The helper records three repo-committed WeChat flagship local/Tauri evidence manifests:
  `wechat-flagship-kiln`, `wechat-flagship-tempera`, and `wechat-flagship-amber`.
- The helper references only repository-safe evidence paths under `prompts/0601/evidence/`, returns
  cloned manifests, uses twelve safe committed artifacts, and has zero duplicate artifact ids.
- Runtime summary from the helper: `manifestCount=3`, `artifactCount=12`,
  `validManifestCount=0`, `invalidManifestCount=3`, `wechatChoicesWithManifest=3`,
  `wechatCannotClaimRequirements=15`, `nextPhoneGate=phone-preview`, and
  `nextUnsafeGate=authenticated-pc-editor`.
- The zero valid manifests are intentional: this local pack satisfies local evidence rows only.
  External PC editor paste, safe disposable draft, phone preview, Dark Mode, cover thumbnail,
  credentialed sync, public host, scheduled-send, and publish claims remain absent. Amber also
  remains blocked/invalid because ordinary Ctrl+V/mobile/publish proof is still missing.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed 1 file / 69 tests.
- Boundary: this addendum proves committed local evidence accounting only. It does not prove WeChat
  ordinary Ctrl+V rich HTML paste, phone preview, mobile Dark Mode, mobile SMIL/click interaction,
  cover thumbnail acceptance, credentialed sync, scheduled send, public host acceptance,
  XHS/Zhihu account upload, or publish success.

---

## 2026-06-17 Completion Gap Audit Addendum

- Added `prompts/0601/evidence/completion-gap-audit-20260617.txt` as the current-state audit above
  the older 2026-06-08 completion and platform-gate matrices.
- The audit reviews `prompts/0601/PRD.md`, `prompts/0601/SPEC.md`, this completion report,
  `prompts/0601/evidence/README.md`, `.trellis/spec/frontend/wechat-svg-modules.md`, and the
  2026-06-09 / 2026-06-17 proof evidence files.
- It classifies AC1-AC10 and platform proof channels as `complete-local`, `complete-pc-editor`,
  `partial`, `missing-external`, or `unsafe-to-automate-now`.
- Current conclusion: AC2, AC3, AC4, AC8, AC9, and AC10 are locally proven by current tests,
  Tauri/WebView2 evidence, or source/evidence review. AC6 and AC7 are locally proven but still
  require real account/platform evidence for publication claims. AC1 and AC5 remain partial because
  final phone preview, mobile Dark Mode, mobile SMIL/click, cover entry, and channel-specific
  external proof are absent.
- The audit preserves the cannot-claim boundary: local renderer proof, PC editor proof, market
  editor DOM learning, and committed local manifests cannot close phone, sync, upload, scheduled
  send, or publish gates.
- Boundary: this addendum is evidence accounting only. It does not create platform proof, mutate a
  live editor, open phone preview, sync, upload, schedule, or publish.

---

## 2026-06-17 Safe Draft Cleanup Gate Addendum

- Added `cleanupPathVerified?: boolean` to `StyleProofArtifact`.
- Strengthened `safe-disposable-draft` validation: a platform-editor safe-draft proof must now
  record both `disposableDraft:true` and `cleanupPathVerified:true` on the same proof artifact.
- A PC editor paste manifest with exact artifact, PC paste, PC DOM, and sensitive-hygiene proof now
  remains invalid when the safe-draft artifact lacks cleanup proof, surfacing
  `style-proof-manifest-cleanup-path-missing`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed 1 file / 70 tests.
- Boundary: this addendum proves local proof-gate enforcement only. It does not prove a real
  disposable platform draft, real cleanup path, phone preview, mobile Dark Mode, mobile SMIL/click,
  cover thumbnail acceptance, credentialed sync, scheduled send, public host acceptance,
  XHS/Zhihu account upload, or publish success.

---

## 2026-06-17 WeChat Backend Session Preflight Addendum

- Added `prompts/0601/evidence/wechat-backend-session-preflight-20260617.txt`.
- A CloakBrowser-only read-only preflight opened the WeChat backend home path, but the page reported
  a timed-out session and exposed no workbench/editor controls.
- This evidence is intentionally classified as blocked evidence. It does not satisfy authenticated
  editor access, safe disposable draft cleanup, PC paste, phone preview, Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, upload, or publish requirements.
- Boundary: no platform mutation, paste, draft creation, cleanup action, preview, sync, upload,
  schedule, or publish was performed.

---

## 2026-06-17 Tauri/WebView2 E2E Refresh Addendum

- Added `prompts/0601/evidence/tauri-e2e-refresh-20260617.txt`.
- Ran `pnpm -C inkforge test:e2e` against the real Tauri/WebView2 runner.
- Result: 2 spec files / 17 tests passed:
  - `svg-render.spec.cjs`: 6 passing.
  - `visual.spec.cjs`: 11 passing.
- The export-rendering spec verified ExportModal style capability gates, acceptance audit
  cannot-claim messaging, flagship SVG injection for kiln/tempera/amber, and a 20 chars/line
  mobile-emulated body layout.
- The visual spec verified desktop titlebar controls, brand mark rendering, motion ladder,
  typography rhythm, easing, focus ring, and light/dark theme cascade.
- Boundary: this addendum proves current local desktop rendering and local UI gate surfacing only.
  It does not prove WeChat phone preview, mobile Dark Mode, mobile SMIL/click interaction, cover
  thumbnail acceptance, ordinary Ctrl+V paste, safe disposable draft cleanup, credentialed sync,
  scheduled send, public host acceptance, XHS/Zhihu account upload, or publish success.

---

## 2026-06-17 Local Sensitive Path Redaction Addendum

- Added `prompts/0601/evidence/local-sensitive-path-redaction-20260617.txt`.
- Redacted historical local executable absolute paths from
  `prompts/0601/evidence/probe-svg-render-20260608-082919.txt`.
- Redacted the historical absolute CloakBrowser persistent profile path from
  `prompts/0601/evidence/market-editor-element-probe-20260608.txt`, preserving only the
  non-sensitive profile label `inkforge-0601`.
- Boundary: this is evidence hygiene only. It does not create new platform proof, mutate an editor,
  open phone preview, sync, upload, schedule, or publish.

---

## 2026-06-17 CloakBrowser Market Editor Applied Refresh Addendum

- Added `prompts/0601/evidence/market-editor-applied-refresh-20260617.txt`.
- 135 SVG editor: a visible free-trial SVG effect click changed the center 336px canvas from
  4 to 5 blocks, `htmlLen` 13636 to 15500, `svg` 5 to 6, with `img` unchanged at 4.
- 135 ordinary editor: a visible non-VIP style item click changed the center UEditor iframe from
  5 to 6 `section._135editor` blocks and from 101 to 102 sections, with `svg` and `img` counts
  unchanged.
- Xiumi: the SVG category exposed SVG/H5 families, and a visible SVG library item could be
  selected, but the center paper did not change because the page was not authenticated and a
  draft-recovery confirmation was present. This remains taxonomy/listing evidence, not applied
  editor evidence.
- WeChat: backend home still reported a timed-out session and exposed no editor controls.
- Boundary: this addendum is market-learning and blocked platform-state evidence only. It does not
  prove WeChat phone preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail,
  safe draft cleanup, credentialed sync, scheduled send, XHS/Zhihu account upload, or publish.

---

## 2026-06-17 Market Editor Applied Gate Addendum

- Added `centralEditorChanged?: boolean` to `StyleProofArtifact`.
- Strengthened `market-applied-dom-readback`: `applied-editor-element` now requires a concrete
  market-editor readback and `centralEditorChanged:true`.
- Added `style-proof-manifest-market-editor-not-applied` so left library/category/item selection,
  settings-panel readback, and preview-library SVG count changes stay invalid unless the center
  editor/canvas/paper actually changed.
- The rule preserves missing proof semantics when no applied market readback exists at all, and it
  does not change style availability, selectable, usable, blocked, or unavailable states.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed 1 file / 72 tests.
- Broader verification:
  4-file export regression passed 111 tests; full export serial run passed 35 files / 1005 tests;
  targeted export ESLint passed; `vue-tsc --noEmit --pretty false` passed; direct Vite production
  build passed with exit 0. The combined `pnpm -C inkforge build` script hit a Node heap
  out-of-memory failure during `vue-tsc -b` on this low-free-memory host, so the type and Vite
  build gates were rerun separately.
- Boundary: this addendum proves local proof-gate enforcement only. It does not prove WeChat phone
  preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail, ordinary rich paste,
  safe draft cleanup, credentialed sync, scheduled send, public host acceptance, XHS/Zhihu account
  upload, or publish success.

---

## 2026-06-17 Phone Preview Content Gate Addendum

- Added `phonePreviewContentVerified?: boolean` to `StyleProofArtifact`.
- Strengthened `phone-preview-readback`: `mobile-preview` now requires phone-preview action,
  phone-preview channel, phone/visual readback, and `phonePreviewContentVerified:true`.
- Added `style-proof-manifest-phone-content-missing` so scan pages, preview entries, setup dialogs,
  cover-setting pages, and PC backend DOM readbacks stay invalid unless the exact artifact is
  visible in the final phone preview article body.
- Screenshot, Dark Mode, and cover-thumbnail rows remain separate proof rows; they cannot replace
  the final article-body readback.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed 1 file / 73 tests.
- Broader verification:
  4-file export regression passed 112 tests in serial mode; full export serial run passed
  35 files / 1006 tests; targeted export ESLint passed; `vue-tsc --noEmit --pretty false`
  passed; direct Vite production build passed with exit 0. A parallel pnpm 4-file run hit the
  existing 5s timeout on the WeChat full-pipeline case under local load, and the same scope passed
  when rerun through the local Vitest binary in serial mode.
- Boundary: this addendum proves local proof-gate enforcement only. It does not prove WeChat phone
  preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail, ordinary rich paste,
  safe draft cleanup, credentialed sync, scheduled send, public host acceptance, XHS/Zhihu account
  upload, or publish success.

---

## 2026-06-17 Phone Dark Mode and Cover Thumbnail Gate Addendum

- Added `darkModeEnabledVerified?: boolean` to `StyleProofArtifact`.
- Added `coverThumbnailAccepted?: boolean` to `StyleProofArtifact`.
- Strengthened `dark-mode-check`: a phone-preview readback artifact must also prove that mobile
  Dark Mode was enabled for the exact inspected phone preview.
- Strengthened `cover-thumbnail-check`: a phone-preview readback artifact must also prove that the
  platform preview/share/list entry accepted the exact cover thumbnail.
- Added `style-proof-manifest-dark-mode-not-verified` and
  `style-proof-manifest-cover-thumbnail-not-accepted` so ordinary phone screenshots and cover setup
  pages stay invalid for those strong proof rows.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed 1 file / 74 tests.
- Broader verification:
  4-file export regression passed 113 tests in serial mode; full export serial run passed
  35 files / 1007 tests; targeted export ESLint passed; `vue-tsc --noEmit --pretty false`
  passed; direct Vite production build passed with exit 0.
- Boundary: this addendum proves local proof-gate enforcement only. It does not prove WeChat phone
  preview, mobile Dark Mode, mobile SMIL/click interaction, cover thumbnail, ordinary rich paste,
  safe draft cleanup, credentialed sync, scheduled send, public host acceptance, XHS/Zhihu account
  upload, or publish success.

---

## 2026-06-17 PC Ordinary Clipboard Paste Gate Addendum

- Added `ordinaryClipboardPasteVerified?: boolean` to `StyleProofArtifact`.
- Strengthened `pc-editor-paste-event`: a platform-editor `pc-paste` artifact must also prove the
  ordinary user Ctrl+V rich HTML/SVG path.
- Added `style-proof-manifest-ordinary-paste-not-verified` so programmatic
  ClipboardEvent/DataTransfer readback remains diagnostic and cannot satisfy ordinary paste proof.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed 1 file / 75 tests.
- Broader verification:
  4-file export regression passed 114 tests in serial mode; full export serial run passed
  35 files / 1008 tests; targeted export ESLint passed; `vue-tsc --noEmit --pretty false`
  passed; direct Vite production build passed with exit 0.
- Boundary: this addendum proves local proof-gate enforcement only. It does not prove ordinary
  WeChat Ctrl+V paste, WeChat phone preview, mobile Dark Mode, mobile SMIL/click interaction,
  cover thumbnail, safe draft cleanup, credentialed sync, scheduled send, public host acceptance,
  XHS/Zhihu account upload, or publish success.

---

## 2026-06-17 WeChat Backend Read-only Preflight Addendum

- Added `prompts/0601/evidence/wechat-home-readonly-preflight-20260617.txt`.
- CloakBrowser reached the authenticated WeChat backend home page and read the recent draft list.
- A previously created draft titled `静谧刊印：当排版成为一种克制的力量` was visible.
- Attempting to open that existing draft did not navigate away from the home page; a publish action
  became visible in the draft card area, so no further click was attempted.
- Boundary: this addendum proves backend-home reachability only. It does not prove ordinary
  WeChat Ctrl+V paste, PC editor paste, phone preview, mobile Dark Mode, mobile SMIL/click
  interaction, cover thumbnail, safe draft cleanup, credentialed sync, scheduled send, public host
  acceptance, XHS/Zhihu account upload, or publish success.

---

## 2026-06-17 WeChat Draftbox Read-only Preflight Addendum

- Added `prompts/0601/evidence/wechat-draftbox-readonly-preflight-20260617.txt`.
- CloakBrowser reached the authenticated WeChat draftbox list through content management.
- The existing draft titled `静谧刊印：当排版成为一种克制的力量` was visible in the draftbox list.
- The target draft card exposed separate hidden hover actions for delete, edit, and publish.
- The isolated edit action was clicked, but the page stayed on the draftbox list and no article
  editor DOM appeared.
- Boundary: this addendum proves draftbox-list reachability and action taxonomy only. It does not
  prove ordinary WeChat Ctrl+V paste, PC editor paste, phone preview, mobile Dark Mode, mobile
  SMIL/click interaction, cover thumbnail, safe draft cleanup, credentialed sync, scheduled send,
  public host acceptance, XHS/Zhihu account upload, or publish success.

---

## 2026-06-18 WeChat Amber Ordinary Ctrl+V Disposable Draft Addendum

- Added `prompts/0601/evidence/wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt`.
- In CloakBrowser only, created deterministic disposable draft
  `InkForge disposable proof 20260618-0515`.
- Wrote exact `flagship-amber.html` to Windows CF_HTML clipboard with SHA-256
  `09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d`.
- Inserted the artifact into the authenticated WeChat PC editor body by ordinary OS Ctrl+V through
  the Windows `keybd_event` path. No synthetic ClipboardEvent/DataTransfer, plugin transfer, sync,
  upload, schedule, or publish API was used for body insertion.
- PC editor DOM readback preserved `svgCount=35`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, `sectionNice=true`, and `placeholder=false`.
- Cleanup was completed for the same disposable draft: after deletion, stable DOM and post-reload
  draftbox readbacks both showed the deterministic title absent and list count `Article 6`.
- A remaining untitled InkForge/Amber residual draft from earlier Amber attempts was also deleted;
  stable and post-reload readbacks reported untitled InkForge/Amber residual count `0` and final
  list count `Article 5`.
- Boundary: this closes Amber PC ordinary Ctrl+V rich HTML/SVG insertion plus disposable draft
  cleanup only. It does not prove Kiln/Tempera ordinary paste, phone preview, mobile Dark Mode,
  mobile SMIL/click interaction, cover thumbnail acceptance, credentialed sync/draft readback,
  scheduled send, public host acceptance, XHS/Zhihu account upload, or publish success.

## 2026-06-18 WeChat Kiln Ordinary Ctrl+V Plain-Text Addendum

- Added `prompts/0601/evidence/wechat-kiln-ordinary-ctrlv-plain-text-cleanup-20260618.txt`.
- In CloakBrowser only, wrote exact `flagship-kiln.html` to Windows CF_HTML clipboard with SHA-256
  `90581eec1c3cb2805ddc235b8d41725795bfeaf2fc3628c707d485201af0d531`.
- Authenticated WeChat PC editor attempts for both `type=10` and `type=77` used ordinary OS Ctrl+V
  through Windows `keybd_event`. The editor body received content, but readback degraded to plain
  text: `bodyTextLength=1790`, `bodyHtmlLength=1800`, `svgCount=0`, `dataInkSvgCount=0`,
  `dataInkBlockCount=0`, and `sectionNice=false`.
- Cleanup was completed after the negative attempts: stable/reloaded draftbox readback showed
  `Article 5`, current-run failed title count `0`, recent draft count `0`, Kiln marker/fingerprint
  count `0`, and local path count `0`.
- Boundary: this is negative evidence. It does not prove Kiln ordinary rich HTML/SVG Ctrl+V, must
  not set `ordinaryClipboardPasteVerified:true`, and does not affect the exact-artifact Amber proof
  or prove Tempera, phone preview, Dark Mode, cover, sync, schedule, XHS/Zhihu upload, or publish.

## 2026-06-18 Kiln Paste-Safe Candidate Addendum

- Added additive preset `flagship-kiln-paste-safe`.
- Added style catalog choice `wechat-flagship-kiln-paste-safe`, mapped to the real
  `flagship-kiln-paste-safe` preset.
- The original `flagship-kiln` preset, `cover-grid` module, and current Kiln negative proof remain
  unchanged.
- Generated `prompts/0601/evidence/wechat-paste/flagship-kiln-paste-safe.html` through the real
  flagship artifact emitter. The candidate keeps the Kiln palette, creative persona, Forge divider,
  and flagship HTML block chain, but uses `cover-title` as the first SVG module.
- Candidate artifact metadata: SHA-256
  `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`,
  `htmlBytes=41618`, `cfHtmlBytes=41787`, `svgCount=35`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, first module `cover-title`.
- Local CloakBrowser controlled-contenteditable proof with Windows CF_HTML plus `keybd_event`
  Ctrl+V preserved rich HTML/SVG and read back `svgCount=35`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, `sectionNice=true`, and first module `cover-title`.
- Authenticated WeChat draftbox no-mutation check stayed at `Article 5` with candidate title count
  `0` and current-run marker count `0`. The article creation entry did not open a safe disposable
  editor in this state, so the run stopped before platform mutation.
- Boundary: this is candidate/local proof only. It does not set
  `ordinaryClipboardPasteVerified:true`, does not satisfy `pc-editor-paste-event` or
  `safe-disposable-draft`, and does not prove WeChat phone preview, mobile Dark Mode,
  mobile SMIL/click, cover thumbnail, credentialed sync, scheduled send, XHS/Zhihu upload, public
  URL, or publish success.

## 2026-06-18 WeChat Kiln Paste-Safe Ctrl+V Tab-Mismatch Cleanup Addendum

- Added `prompts/0601/evidence/wechat-kiln-paste-safe-wechat-ctrlv-tab-mismatch-cleanup-20260618.txt`.
- In CloakBrowser only, wrote exact `flagship-kiln-paste-safe.html` to Windows CF_HTML clipboard
  with SHA-256 `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`.
- Authenticated WeChat PC editor attempts used ordinary OS Ctrl+V through Windows `keybd_event`.
  The intended deterministic-title DOM target stayed unchanged with the WeChat body placeholder
  still present and `svgCount=0`.
- A later foreground paste hit a different visible WeChat editor tab than the CloakBrowser-bound
  DOM target. That wrong-tab body contained large InkForge SVG/block counts, but it was
  mojibake-damaged and titleless, so it is invalid as platform proof.
- Cleanup was completed: the current-run empty-title residue was identified by content fingerprint
  (`contentLength=209829`, `svgCount=175`, `dataInkBlockCount=115`, `dataInkSvgCount=15`,
  `replacementCharCount=5720`), deleted through WeChat with `ret=0`, and post-delete checks found
  zero deterministic-title, deleted-candidate, or recent empty/default-title InkForge-like residue
  matches.
- Boundary: this is negative evidence and cleanup proof only. It does not prove Kiln paste-safe
  ordinary rich HTML/SVG Ctrl+V, must not set `ordinaryClipboardPasteVerified:true`, must not
  satisfy `pc-editor-paste-event` or `safe-disposable-draft`, and does not prove phone preview,
  Dark Mode, cover, sync, schedule, XHS/Zhihu upload, public URL, or publish success.

## 2026-06-18 WeChat Kiln Paste-Safe Single-Tab Ctrl+V No-Paste Addendum

- Added `prompts/0601/evidence/wechat-kiln-paste-safe-wechat-ctrlv-single-tab-nopaste-20260618.txt`.
- Added `-NoClick` to `inkforge/scripts/probe-windows-foreground-input.ps1` for no-mouse
  `keybd_event` Ctrl+V diagnostics.
- In a single visible authenticated WeChat editor tab, page focus, body ProseMirror focus, and a
  successful CloakBrowser body click were verified before the paste attempts.
- `System.Windows.Forms.SendKeys("^v")` and Windows `keybd_event -NoClick` both left the body
  unchanged: `bodyTextLength=8`, `bodyHtmlLength=298`, `svgCount=0`, `dataInkSvgCount=0`, and
  `dataInkBlockCount=0`.
- Cleanup/absence checks after returning home found deterministic title matches `0` and recent
  empty/default-title InkForge-like residue candidates `0`.
- Boundary: this is negative evidence. It does not prove WeChat ordinary rich HTML/SVG Ctrl+V,
  must not set `ordinaryClipboardPasteVerified:true`, and must not satisfy `pc-editor-paste-event`
  or `safe-disposable-draft`.

## 2026-06-18 WeChat PC Paste Strong Gate Addendum

- Added `prompts/0601/evidence/wechat-pc-paste-strong-gate-20260618.txt`.
- Added bound ordinary paste proof flags to `StyleProofArtifact`:
  `sameEditorTabVerified`, `pasteInputEventVerified`, `editorBodyMutationVerified`, and
  `mojibakeFreeVerified`.
- `pc-editor-paste-event` now requires one same `platform-editor` / `pc-paste` artifact to carry
  all strong flags together with `ordinaryClipboardPasteVerified:true`.
- Added regression tests that keep same-tab no-paste evidence, wrong-tab/mojibake readback, and
  split multi-artifact paste proof invalid.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 84 tests.
- Broader verification:
  4-file export regression passed with 4 files / 123 tests; full export serial run passed with
  35 files / 1046 tests; targeted ESLint passed; `vue-tsc --noEmit --pretty false` passed; direct
  Vite production build through `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
  passed and `inkforge/tsconfig.tsbuildinfo` was restored before staging.
- Boundary: this is local validator proof only. It does not prove Kiln paste-safe WeChat ordinary
  rich HTML/SVG Ctrl+V, phone preview, Dark Mode, cover, sync, schedule, XHS/Zhihu upload, public
  URL, or publish success.

## 2026-06-18 Market Editor DOM/CSS Learning Addendum

- Added `prompts/0601/evidence/market-editor-dom-css-learning-20260618.txt`.
- Updated the 06-01 evidence index, research report, product spec addendum, Trellis implementation
  log, and WeChat SVG module spec with the CloakBrowser-only market editor findings.
- Xiumi findings: the SVG category preview can contain literal SVG/SMIL/foreignObject, but applied
  editor-canvas output may become image cells and `tn-*` authoring layers. InkForge must therefore
  translate Xiumi-style SVG ideas into image-slot/fallback manifests instead of treating them as
  direct inline-SVG proof.
- 135 findings: SVG effects should map to typed image slots, hot zones, triggers, motion schema,
  static-expanded fallback, raster fallback, and layout reports. Ordinary 135 styles are useful
  nested-section references only.
- Hardened documentation boundary: `_135editor`, `135brush`, `135bg`, market `data-tools`, market
  data ids, `tn-*`, `tn-comp-role`, `tn-bind-comp-tpl-id`, vendor class names, hosted media URLs,
  private editor source, and paid/member assets are forbidden in InkForge publishable output.
- Public reference cross-check: doocs/md remains a relevant Markdown-to-WeChat theme pipeline
  reference, and OpenSVG's public feature list aligns with the observed WeChat SVG effect taxonomy.
  Grok Search returned no usable result content for this specific query.
- Boundary: this is rule-extraction evidence and spec hardening only. It does not prove WeChat
  phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, schedule, XHS/Zhihu upload,
  public host, or publish success.

## 2026-06-18 Market Editor Hosted Background Residue Gate Addendum

- Added `prompts/0601/evidence/market-editor-residue-background-gate-20260618.txt`.
- Hardened `MARKET_EDITOR_RESIDUE_RULES` so CSS `url(...)` references to 135/Xiumi hosted media are
  blocked as `market editor hosted background source`, not only `<img>`/`<image>` sources.
- Added centralized `PLATFORM_STYLE_CHOICES` market-residue blocker injection so style catalog
  preflight semantics stay aligned with the quality detector.
- Added `MARKET_EDITOR_BACKGROUND_RESIDUE_HTML` and a three-platform regression proving WeChat,
  Xiaohongshu, and Zhihu quality reports all fail when copied 135/Xiumi hosted background sources
  are present.
- Verification passed:
  - `platform-export-rendering.test.ts`: 1 file / 85 tests.
  - cross-platform export regression: 4 files / 124 tests.
  - full export serial run: 35 files / 1047 tests.
- Boundary: this is a local detector gate only. It does not prove WeChat phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, XHS/Zhihu upload, public host, or
  publish success.

## 2026-06-18 Style Acceptance ExportModal E2E Refresh Addendum

- Added `prompts/0601/evidence/style-acceptance-exportmodal-e2e-20260618.txt`.
- Real Tauri/WebView2 WDIO e2e initially failed because the spec expected stale WeChat style
  catalog count `7/15`, while runtime ExportModal now reports `8/16`.
- Updated `tests/e2e/specs/svg-render.spec.cjs` to assert the current runtime counts:
  `8/16`, `cardCount=16`, `availableCount=8`, `blockedCount=4`, and `unavailableCount=4`.
- Re-ran `pnpm exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`;
  it passed with 1 spec / 6 tests.
- The passing run still verifies cannot-claim preflight, phone-preview next action, blocked Amber,
  mobile-only SVG blockers, plugin transfer unavailability, XHS/Zhihu summaries, responsive
  flagship SVG injection, and `charsPerLine=20`.
- Boundary: local Tauri/WebView2 proof only. It does not prove WeChat phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, XHS/Zhihu upload, public host, or
  publish success.

## 2026-06-18 Full Tauri/WebView2 E2E Refresh Addendum

- Added `prompts/0601/evidence/full-tauri-e2e-refresh-20260618.txt`.
- Re-ran the complete local Tauri/WebView2 WDIO suite with `pnpm test:e2e`; it passed with 2 specs
  / 17 tests.
- `svg-render.spec.cjs` passed with 6 tests covering real Pinia draft seeding, ExportModal style
  gates, cannot-claim UI, phone-preview next action, responsive flagship SVG injection, and
  `charsPerLine=20`.
- `visual.spec.cjs` passed with 11 tests covering titlebar controls, brand mark rendering,
  motion/type/easing/focus styles, and light/dark theme cascade.
- The run emitted an EdgeDriver compatibility warning for Edge 149, but all assertions passed.
- Boundary: local Tauri/WebView2 UI/rendering proof only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, ordinary WeChat Ctrl+V rich HTML/SVG acceptance,
  sync, scheduled-send, XHS/Zhihu upload, public host, or publish success.

## 2026-06-18 135 Applied Text Slot Residue Gate Addendum

- Added `prompts/0601/evidence/135-applied-text-slot-residue-gate-20260618.txt`.
- In CloakBrowser-only 135 ordinary editor sampling, free style `#style-173703` was inserted into
  the central UEditor iframe after the iframe body had a collapsed insertion range.
- The central editor readback changed `data-id="173703"` from `0` to `1`, body children from `4`
  to `5`, and body HTML length from `20627` to `22552`.
- The applied block confirmed 135 text-slot/list metadata that can survive beyond wrapper class
  detection: `data-brushtype`, `autonum[data-num]`, and `style_id/style_name/style_price`.
- `MARKET_EDITOR_RESIDUE_RULES` now rejects those residues as `135 editable brush slot`,
  `135 automatic numbering marker`, and `135 style-list metadata`.
- Added a three-platform regression proving WeChat, Xiaohongshu, and Zhihu reject those residues;
  verification passed with focused 86 tests, 4-file export regression 125 tests, full export serial
  1048 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local detector proof only. It does not prove WeChat phone preview, mobile interaction,
  Dark Mode, cover thumbnail, ordinary WeChat Ctrl+V rich HTML/SVG acceptance, sync,
  scheduled-send, XHS/Zhihu upload, public host, or publish success.

## 2026-06-18 135 SVG Builder Canvas Residue Gate Addendum

- Added `prompts/0601/evidence/135-svg-builder-canvas-residue-gate-20260618.txt`.
- In CloakBrowser-only 135 SVG editor sampling, the center `#app-content-canvas` was readable and
  contained 8 blocks, 8 SVG previews, 0 images, and HTML length `11946`.
- Observed builder effect identities included `multiselectpopup`, `carouselslide`,
  `slidesectorclickredpacket`, `clickelementscaleimagesspread`, and
  `coverclickmovewithspread`.
- The first visible `免费试用` click did not change current canvas counts, so it is recorded as a
  no-delta click, not insertion proof.
- `MARKET_EDITOR_RESIDUE_RULES` now rejects copied 135 SVG builder effect `data-name` values and
  canvas placeholder/block classes as market residue.
- Added a three-platform regression proving WeChat, Xiaohongshu, and Zhihu reject those residues;
  verification passed with focused 87 tests, 4-file export regression 126 tests, full export serial
  1049 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local detector proof only. It does not prove WeChat phone preview, mobile interaction,
  Dark Mode, cover thumbnail, ordinary WeChat Ctrl+V rich HTML/SVG acceptance, sync,
  scheduled-send, XHS/Zhihu upload, public host, or publish success.

## 2026-06-18 Xiumi Applied Runtime Binding Residue Gate Addendum

- Added `prompts/0601/evidence/xiumi-applied-runtime-binding-residue-gate-20260618.txt`.
- In CloakBrowser-only Xiumi v5 paper editor sampling, SVG, Title, and Card categories were clicked
  and one visible sample from each category was inserted into the center `.tn-editing-panel`.
- Center editor deltas:
  - SVG sample: `htmlLength +32007`, `tnComp +15`, `tnCell +18`, `contenteditable +1`,
    `img +3`, `tnUuid +15`.
  - Title sample: `htmlLength +15313`, `tnComp +6`, `tnCell +7`, `contenteditable +1`,
    `img +6`.
  - Card sample: `htmlLength +30728`, `tnComp +17`, `tnCell +21`, `contenteditable +7`,
    `img +3`.
- The applied readbacks exposed Xiumi runtime binding residues such as `opera-tn-ra-comp`,
  `opera-tn-ra-cell`, and preview-side `disable-tn-*`; these are authoring DOM signals, not
  publishable InkForge output.
- `MARKET_EDITOR_RESIDUE_RULES` now rejects copied Xiumi runtime binding attributes as
  `Xiumi runtime binding attribute`.
- Added a three-platform regression proving WeChat, Xiaohongshu, and Zhihu reject those residues;
  verification passed with focused 88 tests, 4-file export regression 127 tests, full export serial
  1050 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local detector proof and market-editor rule extraction only. It does not prove WeChat
  phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary WeChat Ctrl+V rich HTML/SVG
  acceptance, sync, scheduled-send, XHS/Zhihu upload, public host, or publish success.

## 2026-06-18 Xiumi Angular Runtime Residue Gate Addendum

- Added `prompts/0601/evidence/xiumi-angular-runtime-residue-gate-20260618.txt`.
- Continued CloakBrowser-only Xiumi v5 center-editor sampling without save, export, sync, upload,
  phone preview, scheduled send, or publish actions.
- The active `.tn-editing-panel` contained `htmlLength 706660`, 5093 elements, 19 contenteditable
  nodes, 99 images, and 0 center inline SVG elements.
- The same readback counted 4905 Angular `ng-*` attributes, 83 `tn-uuid` values, 184
  `opera-tn-ra-*` bindings, 38 `statics.xiumi.us` references, and 14 CSS `url(...)` occurrences.
- `MARKET_EDITOR_RESIDUE_RULES` now rejects Angular/Vue runtime controls such as `ng-model`,
  `ng-include`, `ng-controller`, `ng-change`, and `ng-hide`, plus Angular runtime classes such as
  `ng-scope`, `ng-binding`, `ng-hide`, `ng-pristine`, `ng-valid`, `ng-empty`, `ng-not-empty`, and
  `ui-sortable`.
- Added a three-platform regression fixture without `tn-*` markers, proving WeChat, Xiaohongshu,
  and Zhihu reject Angular-only Xiumi authoring residue.
- Verification passed with focused `platform-export-rendering.test.ts` at 89 tests, 4-file export
  regression at 128 tests, full export serial suite at 1051 tests, ESLint, `vue-tsc`, and
  production build.
- Boundary: local detector proof and market-editor rule extraction only. It does not prove WeChat
  phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary WeChat Ctrl+V rich HTML/SVG
  acceptance, sync, scheduled-send, XHS/Zhihu upload, public host, or publish success.
