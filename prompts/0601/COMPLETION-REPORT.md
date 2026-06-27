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
- 2026-06-09 已补强强证据门禁负向回归：`validateStyleProofManifest()` 不再允许 authenticated editor、PC DOM、local browser 或 PC ClipboardEvent readback 仅凭 matching `requirementId` 满足 `safe-disposable-draft`、`mobile-preview`、`credentialed-sync` 或 `published` gates；`safe-disposable-draft` 需要显式 `action:'safe-disposable-draft'`，`cover-thumbnail-check` 需要 `phone-preview`，`sync-readback` 需要 `credentialed-channel` 与正向外部账户认证读回，`published-url-or-platform-preview` 需要 `public-web` 或 `credentialed-channel` 与正向外部账户认证读回；`phone-preview` 不再满足 publish/platform-preview 行。Focused Vitest 已通过 1 file / 66 tests。
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

## 2026-06-18 OSS Converter Source Refresh Addendum

- Added `prompts/0601/evidence/oss-converter-source-refresh-20260618.txt`.
- Used Grok Search as a narrow GitHub/source discovery pass and then inspected public raw source
  from doocs/md, mdnice/markdown-nice, and RedBookCards.
- doocs/md and mdnice confirm the converter-family WeChat pattern: collect effective theme CSS,
  make it match the copied fragment, inline with `juice`, and run platform cleanup before
  clipboard/export.
- doocs/md source confirms hardening points already compatible with InkForge's direction: preview
  readiness checks, unresolved placeholder stripping, local anchor removal, image dimension
  normalization into style data, and SVG text/baseline compatibility handling.
- mdnice source keeps WeChat and Zhihu copy workflows separate, supporting InkForge's rule that
  Zhihu must receive semantic Markdown/formula text or public-host image fallback instead of
  inheriting WeChat rich HTML/SVG assumptions.
- RedBookCards source supports the XHS image-page/long-image contract: Markdown becomes WebView
  pages and is captured as fixed-size 1080x1440 image artifacts.
- Updated the 06-01 research report, product spec addendum, Trellis frontend spec, market-practice
  catalog, task implementation log, and evidence index.
- Boundary: this is source-backed rule extraction only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, ordinary rich Ctrl+V for all flagship artifacts,
  credentialed sync, scheduled-send, XHS/Zhihu account upload, public host acceptance, or publish
  success.

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

## 2026-06-18 Xiumi Editable Surface Residue Gate Addendum

- Added `prompts/0601/evidence/xiumi-editable-surface-residue-gate-20260618.txt`.
- Continued CloakBrowser-only Xiumi v5 center-editor sampling without save, export, sync, upload,
  phone preview, scheduled send, or publish actions.
- The active `.tn-editing-panel` exposed 19 `contenteditable` nodes, 0 `spellcheck` nodes, and
  0 `draggable` nodes.
- The `contenteditable="true"` samples were applied SVG/title/card text cells, including title
  text, numbered badges, and card body paragraphs.
- `MARKET_EDITOR_RESIDUE_RULES` now rejects copied editor text surfaces as
  `editor editable surface attribute`, even when no `tn-*`, `ng-*`, 135 wrapper, or vendor-media
  marker remains.
- Added a three-platform regression proving WeChat, Xiaohongshu, and Zhihu reject editable-surface
  residue; verification passed with focused `platform-export-rendering.test.ts` at 90 tests,
  4-file export regression at 129 tests, full export serial suite at 1052 tests, ESLint,
  `vue-tsc`, and production build.
- Boundary: local detector proof and market-editor rule extraction only. It does not prove WeChat
  phone preview, mobile interaction, Dark Mode, cover thumbnail, ordinary WeChat Ctrl+V rich HTML/SVG
  acceptance, sync, scheduled-send, XHS/Zhihu upload, public host, or publish success.

## 2026-06-18 Style Proof Execution Runbook Addendum

- Added `prompts/0601/evidence/style-proof-execution-runbook-20260618.txt`.
- Implemented `getPlatformStyleProofExecutionRunbook(platform, manifests)` and
  `getStyleProofExecutionRunbook(manifests)` as a local operator runbook above the acceptance audit.
- The runbook maps every proof requirement to required channel/action/readback, required artifact
  fields, accepted host statuses, redaction boundary, success criteria, failure signals, and
  cannot-claim reason.
- Ordinary WeChat PC paste now has a machine-readable contract requiring one same
  `platform-editor` / `pc-paste` artifact with the bound paste flags
  `ordinaryClipboardPasteVerified`, `sameEditorTabVerified`, `pasteInputEventVerified`,
  `editorBodyMutationVerified`, and `mojibakeFreeVerified`.
- Phone preview, Dark Mode, cover thumbnail, public host, credentialed channel, and publish gates
  remain separate cannot-claim rows and cannot be completed by local, PC DOM, or weak browser
  evidence.
- Verification passed with focused `platform-export-rendering.test.ts` at 92 tests, 4-file export
  regression at 131 tests, full export serial suite at 1054 tests, ESLint, `vue-tsc`, and
  production build.
- Boundary: local execution-runbook proof only. It does not prove WeChat phone preview, mobile
  interaction, Dark Mode, cover thumbnail, ordinary rich Ctrl+V for all flagship artifacts,
  credentialed sync, scheduled-send, XHS/Zhihu account upload, public host acceptance, or publish
  success.

## 2026-06-19 ExportModal Execution Runbook UI Addendum

- Added `prompts/0601/evidence/style-proof-execution-runbook-exportmodal-20260619.txt`.
- ExportModal now consumes the local style proof execution runbook and surfaces it as read-only UI:
  global summary, acceptance preflight totals, next runbook gate, per-style execution summary, and
  top artifact-contract labels across WeChat, Xiaohongshu, and Zhihu.
- The UI explicitly exposes required proof fields such as `phonePreviewContentVerified`,
  `darkModeEnabledVerified`, `coverThumbnailAccepted`, and ordinary PC paste flags without claiming
  that phone preview, Dark Mode, cover, sync, public host, or publish proof has been completed.
- A real WDIO/Tauri/WebView2 run caught and fixed a layout regression where long contract labels
  could squeeze the preview body to 61px. The final run restored `#nice` width to 401px and kept
  `charsPerLine=20`; the 980px responsive branch also resets the fixed desktop control-column
  max-width.
- Verification passed with component ESLint, focused `platform-export-rendering.test.ts` at
  92 tests, `vue-tsc`, production build, and real `svg-render.spec.cjs` WDIO e2e at 1 spec /
  6 tests.
- Boundary: local ExportModal runbook visibility and layout stability only. It does not prove
  WeChat phone preview, mobile SMIL/click, mobile Dark Mode, cover-thumbnail acceptance,
  credentialed sync, scheduled-send, XHS/Zhihu account upload, public host acceptance, or publish
  success.

## 2026-06-19 WeChat Dashboard Authenticated Readback Addendum

- Added `prompts/0601/evidence/wechat-dashboard-auth-redacted-readback-20260619.txt`.
- Used CloakBrowser only to verify the persistent WeChat Official Account backend session still
  reaches the authenticated dashboard after the machine reboot.
- Redacted readback observed `/cgi-bin/home`, visible backend/home root, draftbox link, all-drafts
  button, dashboard draft cards, publish-record cards, appmsg-family anchors, and publish-related
  dashboard controls.
- Login-page containers were absent and visible login QR image was absent; dashboard-side QR class
  nodes were treated as ordinary backend UI, not as a login blocker.
- No editor was opened, no draft was edited, no paste was attempted, no phone preview was opened,
  no sync/upload/publish action was triggered, and no screenshots, account-identifying text,
  article-identifying text, link targets, credential material, browser state locations, raw markup,
  or local runtime paths were committed.
- Boundary: authenticated dashboard reachability only. It does not prove editor DOM readback,
  ordinary Ctrl+V rich HTML/SVG paste, safe disposable draft cleanup, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, XHS/Zhihu upload, public host, or
  publish gates.

## 2026-06-19 XHS Committed Local Evidence Addendum

- Added `prompts/0601/evidence/style-proof-committed-xhs-local-evidence-20260619.txt`.
- Extended `getCommittedStyleProofLocalEvidenceManifests()` so the committed local evidence pack
  now includes `xhs-cover-carousel` in addition to the three WeChat flagship manifests.
- The XHS manifest references only repository-safe local evidence: the tracked browser-canvas
  raster PNG, `xhs-raster/README.md`, and `xhs-image-manifest-gate-20260609.txt`.
- The XHS local rows satisfy `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`,
  `xhs-artifact-manifest`, and `no-sensitive-artifact` for that exact raster artifact.
- Cross-platform accounting remains isolated: WeChat ignores the XHS manifest, XHS ignores the
  WeChat manifests, and Zhihu still has no committed public-host/platform-host proof.
- Verification passed with focused `platform-export-rendering.test.ts` at 92 tests, 4-file
  cross-platform export regression at 131 tests, full export serial suite at 1054 tests, ESLint,
  `vue-tsc`, and production build.
- Boundary: committed local XHS artifact accounting only. It does not prove Xiaohongshu account
  upload, platform preview, public URL acceptance, publish success, or any WeChat/Zhihu external
  gate.

## 2026-06-19 XHS Raster Manifest Builder Addendum

- Added `prompts/0601/evidence/xhs-raster-manifest-builder-20260619.txt`.
- Added `createXhsImageArtifactManifestFromRaster()` plus small inference helpers in
  `image-pipeline/artifact-manifest.ts`, exported through the image-pipeline and export facades.
- The helper turns real raster data URLs or explicit local raster metadata into
  `XhsImageArtifactManifest`, while still relying on `validateXhsImageArtifactManifest()` for the
  final local preflight decision.
- It computes bytes from base64 data URLs, infers PNG/JPEG formats and 3:4 / 1:1 ratios, and
  rejects missing dimensions, missing bytes, unsupported ratio, or unsupported format instead of
  fabricating a local pass.
- Verification passed with focused `image-pipeline.test.ts` at 16 tests, focused
  `platform-export-rendering.test.ts` at 93 tests, 4-file cross-platform export regression at
  132 tests, full export serial suite at 1060 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local manifest construction only. It does not prove Xiaohongshu upload, platform
  preview, public URL acceptance, publish success, or any WeChat/Zhihu external gate.

## 2026-06-19 Zhihu Image Manifest Builder Addendum

- Added `prompts/0601/evidence/zhihu-image-manifest-builder-20260619.txt`.
- Added `createZhihuImageArtifactManifest()`, `inferZhihuImageArtifactFormat()`, and
  `inferZhihuImageHostStatus()` in `image-pipeline/artifact-manifest.ts`, exported through the
  image-pipeline and export facades.
- The helper turns real public-host or platform-host image metadata into
  `ZhihuImageArtifactManifest`, derives Markdown references when needed, and still relies on
  `validateZhihuImageArtifactManifest()` for the final local/platform-host preflight decision.
- It rejects fake hostStatus overrides, public URLs marked as upload proof, local/blob/data/http/
  private URLs, missing local bytes/existence, blank alt text, and semantic images without caption
  or text fallback instead of fabricating readiness.
- Verification passed with focused `image-pipeline.test.ts` at 20 tests, focused
  `platform-export-rendering.test.ts` at 94 tests, 4-file cross-platform export regression at
  133 tests, full export serial suite at 1065 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local manifest construction only. It does not prove Zhihu account upload, editor
  preview, public article rendering, sync, scheduled publish, or publish success.

## 2026-06-19 XHS Raster Pack Manifest Builder Addendum

- Added `prompts/0601/evidence/xhs-raster-pack-manifest-builder-20260619.txt`.
- Added `createXhsImageArtifactManifestFromRasterArtifacts()` in
  `image-pipeline/artifact-manifest.ts`, exported through the image-pipeline and export facades.
- The helper builds multi-page Xiaohongshu carousel/page-pack manifests from real raster metadata,
  sorts pages deterministically, defaults cover to page 1, and derives body references while still
  relying on `validateXhsImageArtifactManifest()` for page-order, cover, reference, file, ratio,
  format, bytes, and crop validation.
- Verification passed with focused `image-pipeline.test.ts` at 22 tests, focused
  `platform-export-rendering.test.ts` at 95 tests, 4-file cross-platform export regression at
  134 tests, full export serial suite at 1068 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local multi-page manifest construction only. It does not prove Xiaohongshu account
  upload, platform preview, public URL acceptance, scheduled publish, or publish success.

## 2026-06-19 Style Proof Artifact Manifest Validation Addendum

- Added `prompts/0601/evidence/style-proof-artifact-manifest-validation-20260619.txt`.
- Added `artifactManifestValidated?: boolean` to style proof artifacts and required it for
  `xhs-artifact-manifest` and `zhihu-artifact-manifest` proof rows.
- Added `style-proof-manifest-artifact-manifest-not-validated` so a manifest-shaped local proof row
  remains invalid until the matching XHS or Zhihu artifact manifest validator returns no issues for
  the exact redacted manifest.
- Added `style-proof-manifest-artifact-ref-missing` so validator-passed manifest rows still remain
  invalid when they do not point to the redacted manifest report that was validated.
- Updated the execution runbook contracts so operator/UI checklists expose
  `artifactManifestValidated` alongside `artifactRef` and `safeForCommit`.
- Updated runbook next actions and failure signals so XHS rows point to
  `validateXhsImageArtifactManifest()` and Zhihu rows point to
  `validateZhihuImageArtifactManifest()`.
- Updated committed XHS local evidence to set the field only for the committed validator-passed
  local manifest report.
- Verification passed with focused `platform-export-rendering.test.ts` at 96 tests, 4-file
  cross-platform export regression at 135 tests, full export serial suite at 1069 tests, ESLint,
  `vue-tsc`, and production build.
- Boundary: local validator-passed accounting only. It does not prove Xiaohongshu upload, platform
  preview, public URL acceptance, Zhihu account upload/editor preview/public article rendering,
  sync, scheduled publish, or publish success.

## 2026-06-19 E2E SVG Render Refresh Addendum

- Added `prompts/0601/evidence/e2e-svg-render-refresh-20260619.txt`.
- Rebuilt production assets with `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`;
  Vite transformed 4652 modules and built in 24.15s.
- Reran the real Tauri/WebView2 SVG render spec with
  `pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`.
- `wdio.conf.cjs` compiled the real Tauri debug binary via Cargo in 7.06s, then WebView2
  149.0.4022.69 passed 1 spec / 6 tests.
- The e2e run re-confirmed ExportModal style capability gates, responsive `[data-ink-svg]`
  injection for `flagship-kiln`, `flagship-tempera`, and `flagship-amber`, and the flagship body
  mobile line-rhythm gate at `charsPerLine=20`.
- Boundary: local production build and real Tauri/WebView2 ExportModal proof only. It does not
  prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, credentialed sync,
  scheduled-send, XHS/Zhihu upload, public host acceptance, platform preview, public article
  rendering, or publish success.

## 2026-06-19 WeChat Create Entry No-op Readback Addendum

- Added `prompts/0601/evidence/wechat-create-entry-noop-readback-20260619.txt`.
- Performed a redacted authenticated browser-only preflight for the next WeChat disposable-draft
  proof step.
- The backend home path remained reachable, was not a login page, and the deterministic
  disposable-draft sentinel prefix had 0 matches before any mutation attempt.
- The visible article create entry existed, but DOM click plus two browser-layer clicks against the
  visible create nodes did not open the editor.
- Post-attempt readback stayed on `/cgi-bin/home`; editor shell, ProseMirror, contenteditable, and
  sentinel counts all stayed 0, with no visible blocking dialog.
- A redacted anchor scan found draftbox/publish-record/public article path families, but no safe
  visible new-editor href suitable for a runbook-compliant creation path.
- Boundary: this is a no-mutation blocked attempt. It does not prove safe-disposable-draft,
  editor DOM readback, ordinary Ctrl+V paste, phone preview, Dark Mode, cover thumbnail,
  credentialed sync, scheduled-send, upload, public host, platform preview, public article
  rendering, or publish success.

## 2026-06-19 Committed WeChat PC Evidence Addendum

- Added `prompts/0601/evidence/style-proof-committed-wechat-pc-evidence-20260619.txt`.
- Added `getCommittedStyleProofWechatPcEvidenceManifests()` and
  `getCommittedStyleProofWechatPcEvidenceAuditReport()` as a separate committed evidence pack for
  redacted WeChat PC editor proof.
- The helper originally represented Amber's exact PC ordinary OS Ctrl+V proof from
  `wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt`, bound to SHA-256
  `09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d`; it now also represents
  Tempera's entity-safe PC ordinary OS Ctrl+V proof from
  `wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt`, bound to SHA-256
  `f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`.
- The pack satisfies each committed PC proof manifest's `authenticated-editor-url`,
  `pc-editor-dom-readback`, `exact-artifact`, `safe-disposable-draft`, `pc-editor-paste-event`,
  and `no-sensitive-artifact` rows, with all proof artifacts marked `committed:true` and
  `safeForCommit:true`.
- It remains independent from `getCommittedStyleProofLocalEvidenceManifests()` so exact HTML
  artifact proof is not merged with local Tauri/WebView2 screenshot fingerprints.
- Regression coverage proves Amber remains catalog-blocked/invalid, Tempera remains missing due
  external rows, and phone preview, Dark Mode, cover thumbnail, sync, scheduled-send, platform
  preview/public URL, and publish rows remain missing/cannot-claim.
- Verification passed with focused `platform-export-rendering.test.ts` at 116 tests, 4-file
  cross-platform export regression at 155 tests, full export serial suite at 1089 tests, targeted
  ESLint, `vue-tsc --noEmit --pretty false`, and production build in 28.59s.
- Boundary: committed Amber raw PC proof and Tempera entity-safe PC proof accounting only. It does
  not prove raw UTF-8 Tempera direct paste, Kiln ordinary
  Ctrl+V, phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send,
  upload, public host, platform preview, public article rendering, or publish success.

## 2026-06-19 Market Editor Applied Rule Refresh Addendum

- Added `prompts/0601/evidence/market-editor-applied-rule-refresh-20260619.txt`.
- Converted the latest CloakBrowser-only 135/Xiumi applied-rule observations into local detector
  and spec/doc rules without committing raw platform DOM, account artifacts, capture references, or
  browser state.
- 135 ordinary style clicks that only create an empty `_135editor` center placeholder now remain
  insertion-risk evidence instead of applied style proof.
- 135 SVG trigger-canvas wrappers such as `app-content-canvas`, `block-img__content`, and
  `ant-tooltip-open` are documented as authoring residue and local schema inputs only.
- Xiumi SVG carousel/flow-canvas authoring metadata such as `tn-svg-animation-*`, flow-canvas,
  `tn-yzk-font-*`, `tn-placeholder`, `opera-tn-ra-*`, Angular `ng-*`, and `ui-sortable` is now
  covered by explicit regression labels.
- Verification passed with focused `platform-export-rendering.test.ts` at 99 tests, 4-file
  cross-platform export regression at 138 tests, full export serial suite at 1072 tests, targeted
  ESLint, `vue-tsc`, and production build.
- Boundary: local detector and documentation proof only. It does not prove WeChat ordinary
  Ctrl+V rich HTML/SVG acceptance, phone preview, mobile interaction, Dark Mode, cover thumbnail,
  sync, scheduled-send, XHS/Zhihu upload, public host acceptance, platform preview, public article
  rendering, or publish success.

## 2026-06-19 WeChat Draftbox Create Menu Readback Addendum

- Added `prompts/0601/evidence/wechat-draftbox-create-menu-readback-20260619.txt`.
- CloakBrowser-only navigation confirmed that a bare draftbox backend path can return a relogin
  prompt, while the authenticated backend DOM menu link can reach the draftbox route with active
  session context.
- The draftbox page exposed no editor shell, no `.ProseMirror`, and no `contenteditable` article
  body before mutation.
- The draftbox toolbar create menu opened and exposed an article-like item plus non-article/import
  choices. The article item was not selected in this pass.
- No editor opened, no draft was created, no paste was attempted, no preview/sync/upload/publish
  action was triggered, and no raw account text, article titles, query parameters, browser state,
  screenshots, or raw markup were committed.
- Boundary: create-menu reachability only. It does not prove safe-disposable-draft, editor DOM
  readback, ordinary Ctrl+V paste, phone preview, Dark Mode, cover thumbnail, credentialed sync,
  scheduled-send, upload, public host, platform preview, public article rendering, or publish
  success.

## 2026-06-19 WeChat Draftbox Article Menu Click Blocked Addendum

- Added `prompts/0601/evidence/wechat-draftbox-article-menu-click-blocked-20260619.txt`.
- CloakBrowser-only authenticated follow-up attempted to select the visible article item from the
  draftbox create menu without bypassing the platform UI.
- DOM click and calibrated OS mouse clicks did not open an article editor.
- CloakBrowser selector clicks against the article list item, inner container, and text span were
  blocked by element-stability failures.
- A diagnostic in-page pointer/mouse event sequence closed the menu, but it is not trusted user
  proof and did not open an editor.
- Post-attempt readback stayed on `/cgi-bin/appmsg`; editor shell selectors, `.ProseMirror`,
  article-body contenteditable nodes, iframe nodes, textarea nodes, and the deterministic sentinel
  all stayed absent.
- Boundary: authenticated draftbox article-menu selection is blocked. This does not prove
  authenticated editor URL, editor DOM readback, safe disposable draft, ordinary Ctrl+V paste,
  phone preview, Dark Mode, cover thumbnail, credentialed sync, scheduled-send, upload, public
  host, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat OS Click Calibration Abort Addendum

- Added `prompts/0601/evidence/wechat-os-click-calibration-abort-20260619.txt`.
- CloakBrowser-only follow-up compared browser geometry, Win32 top-level window geometry,
  render-window hit testing, and `document.elementFromPoint()` before any further article-entry
  selection.
- The candidate point landed on a Chromium render window and the intended page coordinate matched
  the visible create button, but Win32 `mouse_event` and `SendInput` did not open the create menu.
- CSS hover diagnostics showed the OS cursor path was not safely bound to the intended DOM target
  and intersected a draft-card region; private hover text was not committed.
- Final readback stayed on `/cgi-bin/appmsg`; editor shell selectors, `.ProseMirror`, article-body
  contenteditable nodes, iframe nodes, textarea nodes, create-menu items, and the deterministic
  sentinel all stayed absent.
- Boundary: OS-coordinate clicking is aborted for this session. This does not prove authenticated
  editor URL, editor DOM readback, safe disposable draft, ordinary Ctrl+V paste, phone preview,
  Dark Mode, cover thumbnail, credentialed sync, scheduled-send, upload, public host, platform
  preview, public article rendering, or publish success.

## 2026-06-19 Completion Gap Audit Refresh Addendum

- Added `prompts/0601/evidence/completion-gap-audit-20260619.txt`.
- The audit refresh summarizes the current 06-01 status after committed local evidence,
  committed WeChat PC proof, market-editor rule extraction, E2E SVG render proof, WeChat
  dashboard/draftbox/create-menu readbacks, draftbox article-menu block, and OS-click calibration
  abort.
- This gap audit predated the Tempera entity-safe manifest refresh. Current committed PC accounting
  includes Amber raw proof and Tempera entity-safe proof, but it must not generalize to raw UTF-8
  Tempera direct paste, Kiln, phone preview, Dark Mode, cover thumbnail, sync, scheduled-send,
  platform preview, public rendering, or publish.
- WeChat article-editor entry remains blocked-safe-abort until actual OS cursor path and exact DOM
  target identity can be proved without intersecting account content.
- XHS and Zhihu local artifact manifests remain preflight only until real account/platform or
  public-host proof exists.
- Boundary: gap audit only. It does not create new platform proof or close phone, sync, upload,
  public-host, platform preview, public article rendering, scheduled-send, or publish gates.

## 2026-06-19 Platform Editor Target Identity Gate Addendum

- Added `prompts/0601/evidence/platform-editor-target-identity-gate-20260619.txt`.
- Added `StyleProofArtifact.platformEditorTargetVerified?: boolean` and the validator issue
  `style-proof-manifest-platform-editor-target-not-verified`.
- Required `platformEditorTargetVerified:true` for authenticated editor URL proof, PC editor DOM
  readback proof, and ordinary PC editor paste proof.
- Draftbox/create-menu/article-menu readbacks with active session can no longer satisfy article
  editor target proof from `authenticatedSessionVerified:true` alone.
- OS click calibration, hover-chain diagnostics, render-window hit tests, wrong-tab paste, and
  no-mutation body focus attempts cannot satisfy ordinary PC paste without exact editor target
  identity.
- Regression coverage proves authenticated draftbox/menu readbacks and OS click calibration aborts
  remain invalid/cannot-claim while preserving the exact committed Amber PC proof.
- Verification passed with focused `platform-export-rendering.test.ts` at 101 tests, 4-file
  cross-platform export regression at 140 tests, full export serial suite at 1074 tests, targeted
  ESLint, `vue-tsc`, and production build.
- Boundary: local validator/runbook proof only. It does not prove WeChat editor opening, ordinary
  Ctrl+V rich paste success, safe disposable draft cleanup, phone preview, Dark Mode, cover
  thumbnail, sync, scheduled-send, upload, public host, platform preview, public article rendering,
  or publish success.

## 2026-06-19 WeChat Create Entry CloakBrowser Stability Block Addendum

- Added `prompts/0601/evidence/wechat-create-entry-cloakbrowser-stability-blocked-20260619.txt`.
- CloakBrowser-only readback stayed on authenticated `/cgi-bin/appmsg`; login containers were
  absent, but editor shell selectors, article-body contenteditable nodes, iframe nodes, textarea
  nodes, and deterministic sentinels were also absent.
- The visible new-creation button geometry stayed stable across repeated samples, and its center
  hit the intended button.
- CloakBrowser selector clicks against the button, outer operation group, and default span all
  failed the element-stability gate; no menu item was selected.
- The toolbar DOM contained article/create-option text, but the real dropdown menu remained
  `display:none` and its menu item rects stayed zero-size.
- Boundary: visible create controls, hidden dropdown DOM text, and CloakBrowser click-stability
  failures do not prove article editor target identity, editor DOM readback, safe disposable draft,
  ordinary Ctrl+V paste, phone preview, Dark Mode, cover thumbnail, sync, scheduled-send, upload,
  public host, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat Existing Draft Edit Entry Blocked Addendum

- Added `prompts/0601/evidence/wechat-existing-draft-edit-entry-blocked-20260619.txt`.
- CloakBrowser selector click against a visible existing draft title returned ok, but the page
  stayed on `/cgi-bin/appmsg`.
- Post-click readback still showed no `.ProseMirror`, article-body contenteditable node, iframe,
  textarea, visible editor-like node, or deterministic sentinel.
- A visible edit candidate existed in the card action layer, but computed visibility resolved to
  hidden and its center hit the parent action layer.
- CloakBrowser selector click against the tagged edit candidate failed the element-stability gate.
- Boundary: existing draft title links, hidden hover/action affordances, and click-stability
  failures do not prove article editor target identity, editor DOM readback, safe disposable draft,
  ordinary Ctrl+V paste, phone preview, Dark Mode, cover thumbnail, sync, scheduled-send, upload,
  public host, platform preview, public article rendering, or publish success.

## 2026-06-19 XHS/Zhihu Account Login Gate Readback Addendum

- Added `prompts/0601/evidence/xhs-zhihu-account-login-gate-readback-20260619.txt`.
- CloakBrowser navigation to the Xiaohongshu creator home redirected to the creator login route.
- XHS login controls were visible, but no file-upload input, platform preview, or publish surface
  was reachable in the current browser profile.
- CloakBrowser navigation to the Zhihu write entry redirected to the Zhihu sign-in route.
- Zhihu verification-code login controls were visible, but no `.ProseMirror`, contenteditable
  editor, textarea, upload input, editor preview, or publish surface was reachable.
- Boundary: this proves only the current external-account blocker. XHS/Zhihu local manifests remain
  preflight proof and do not prove account upload, platform preview, public-host acceptance, public
  article rendering, scheduled-send, or publish success.

## 2026-06-19 External Account Login Blocker Validator Addendum

- Added `prompts/0601/evidence/external-account-login-blocker-validator-20260619.txt`.
- Added `StyleProofAction` value `external-account-login-readback`.
- Added `StyleProofArtifact.externalAccountAuthenticated?: boolean` and
  `StyleProofArtifact.externalAccountLoginBlocked?: boolean`.
- Added validator issue `style-proof-manifest-external-account-login-blocked`.
- Credentialed-channel, sync-readback, and platform-publish runbook artifact contracts now expose
  `externalAccountAuthenticated` as an explicit required field.
- The manifest validator remains backward-compatible for older proof rows: only explicit login
  blockers (`externalAccountLoginBlocked:true`, `externalAccountAuthenticated:false`, or
  `external-account-login-readback`) become invalid.
- Regression coverage proves XHS login-gate readback cannot satisfy upload preview or publish
  proof, and Zhihu sign-in readback cannot satisfy public-host, upload-manifest, or publish proof.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 103 tests.
- 4-file cross-platform export regression passed at 4 files / 142 tests.
- Full export serial regression passed at 35 files / 1076 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove XHS/Zhihu account
  authentication, upload surface availability, platform preview, public-host acceptance, public
  article rendering, scheduled-send, or publish success.

## 2026-06-19 WeChat Session Relogin CloakBrowser Readback Addendum

- Added `prompts/0601/evidence/wechat-session-relogin-cloakbrowser-readback-20260619.txt`.
- CloakBrowser-only navigation to the WeChat backend article-list path returned a relogin/platform
  state rather than a usable authenticated article editor.
- Redacted readback found zero `.ProseMirror`, zero contenteditable article bodies, zero iframe
  nodes, and zero textarea nodes for the checked editor surfaces.
- Login/relogin text signal was present; create, publish, and editor text signals were absent.
- No screenshot, form fill, draft mutation, paste, phone preview, sync, scheduled send, or publish
  action was performed.
- Boundary: this is relogin platform-state evidence only. It does not prove authenticated editor
  URL, PC editor DOM readback, safe disposable draft, ordinary PC paste, phone preview, Dark Mode,
  cover thumbnail, sync, scheduled-send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 WeChat Phone Preview Matrix Validator Addendum

- Added `prompts/0601/evidence/wechat-phone-preview-matrix-validator-20260619.txt`.
- Added `StyleProofAction` value `phone-preview-entry-readback`.
- Added `StyleProofArtifact.phonePreviewBlocked?: boolean` and validator issue
  `style-proof-manifest-phone-preview-blocked`.
- `phone-screenshot` proof now requires `action:'phone-preview'` and
  `phonePreviewContentVerified:true`.
- `dark-mode-check` proof now requires `phonePreviewContentVerified:true` in addition to
  `darkModeEnabledVerified:true`.
- Acceptance audit requirement rows carrying `style-proof-manifest-phone-preview-blocked` report
  `invalid` rather than generic external-blocked status.
- Regression coverage proves scan/setup/PC-preview-shell readbacks cannot satisfy phone preview
  readback, phone screenshot, Dark Mode, or cover-thumbnail matrix rows.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 104 tests.
- 4-file cross-platform export regression passed at 4 files / 143 tests.
- Full export serial regression passed at 35 files / 1077 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, platform preview, public
  article rendering, or publish success.

## 2026-06-19 External Account Proof Contract Validator Addendum

- Added `prompts/0601/evidence/external-account-proof-contract-validator-20260619.txt`.
- Added validator issue `style-proof-manifest-external-account-auth-missing`.
- `credentialed-channel-response` and `sync-readback` now require a same-artifact
  `externalAccountAuthenticated:true` readback, matching their runbook required fields.
- `published-url-or-platform-preview` now accepts only `public-web` or `credentialed-channel`
  proof with `externalAccountAuthenticated:true`; `phone-preview` is mobile-preview evidence only.
- Regression coverage proves missing positive external account authentication invalidates
  credentialed sync, sync readback, and publish/platform-preview rows.
- Regression coverage also proves `phone-preview` cannot satisfy publish/platform-preview, and
  each explicit external-account blocker works independently:
  `externalAccountLoginBlocked:true`, `externalAccountAuthenticated:false`, and
  `action:'external-account-login-readback'`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 108 tests.
- 4-file cross-platform export regression passed at 4 files / 147 tests.
- Full export serial regression passed at 35 files / 1081 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove account authentication,
  upload surface availability, public-host acceptance, platform preview, public article rendering,
  scheduled-send, or publish success.

## 2026-06-19 Public Host ArtifactRef Validator Addendum

- Added `prompts/0601/evidence/public-host-artifact-ref-validator-20260619.txt`.
- `public-image-host` proof now requires `channel:'public-web'`, action
  `public-image-host-check`, accepted host status, and a non-empty `artifactRef` bound to the
  redacted public-host or platform-host proof report.
- Accepted-host rows without `artifactRef` emit
  `style-proof-manifest-artifact-ref-missing`.
- Acceptance requirement rows carrying `style-proof-manifest-artifact-ref-missing` now report
  `invalid`, so bad public-host evidence is not collapsed into generic external waiting state.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 109 tests.
- 4-file cross-platform export regression passed at 4 files / 148 tests.
- Full export serial regression passed at 35 files / 1082 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove public-host acceptance,
  account upload, platform preview, public article rendering, scheduled-send, or publish success.

## 2026-06-19 Published Preview Exact Artifact Validator Addendum

- Added `prompts/0601/evidence/published-preview-exact-artifact-validator-20260619.txt`.
- `published-url-or-platform-preview` proof now requires `exactArtifact:true` on the same
  authenticated public-web or credentialed-channel published-preview artifact.
- Authenticated published/platform-preview rows without exact artifact binding emit
  `style-proof-manifest-exact-artifact-missing`.
- Acceptance requirement rows carrying `style-proof-manifest-exact-artifact-missing` now report
  `invalid`, so an old public URL or different article preview cannot be treated as pending
  external proof for the current artifact.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 110 tests.
- 4-file cross-platform export regression passed at 4 files / 149 tests.
- Full export serial regression passed at 35 files / 1083 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove account authentication,
  platform preview, public article rendering, scheduled-send, or publish success.

## 2026-06-19 Phone Matrix Exact Artifact Validator Addendum

- Added `prompts/0601/evidence/phone-matrix-exact-artifact-validator-20260619.txt`.
- `phone-preview-readback` now requires `phonePreviewContentVerified:true` and
  `exactArtifact:true` on the same phone-preview artifact.
- `dark-mode-check` now requires `phonePreviewContentVerified:true`,
  `darkModeEnabledVerified:true`, and `exactArtifact:true` on the same proof artifact.
- `cover-thumbnail-check` now requires `coverThumbnailAccepted:true` and `exactArtifact:true` on
  the same proof artifact.
- Unbound phone/Dark Mode/cover rows emit `style-proof-manifest-exact-artifact-missing`, even when
  a separate local exact-artifact proof exists for the manifest.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 111 tests.
- 4-file cross-platform export regression passed at 4 files / 150 tests.
- Full export serial regression passed at 35 files / 1084 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  23.68s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, scheduled-send, or publish success.

## 2026-06-19 Phone Screenshot Exact Artifact Validator Addendum

- Added `prompts/0601/evidence/phone-screenshot-exact-artifact-validator-20260619.txt`.
- `phone-screenshot` runbook fields now include `artifactFingerprint` and `exactArtifact`.
- `phone-screenshot` proof now requires `phonePreviewContentVerified:true` and
  `exactArtifact:true` on the same phone-preview screenshot artifact.
- Unbound phone screenshot rows emit `style-proof-manifest-exact-artifact-missing`, even when a
  separate local exact-artifact proof exists for the manifest.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 111 tests.
- 4-file cross-platform export regression passed at 4 files / 150 tests.
- Full export serial regression passed at 35 files / 1084 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  28.23s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, scheduled-send, or publish success.

## 2026-06-19 Exact Artifact Fingerprint Validator Addendum

- Added `prompts/0601/evidence/exact-artifact-fingerprint-validator-20260619.txt`.
- Generic `exact-artifact` proof now requires `exactArtifact:true` and a non-empty
  `artifactFingerprint` on the same proof row.
- Bare exact-artifact boolean rows emit `style-proof-manifest-exact-artifact-missing`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 112 tests.
- 4-file cross-platform export regression passed at 4 files / 151 tests.
- Full export serial regression passed at 35 files / 1085 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  24.59s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, platform preview, public
  article rendering, or publish success.

## 2026-06-19 WeChat Draft List CloakBrowser Readback Addendum

- Added `prompts/0601/evidence/wechat-draft-list-cloakbrowser-readback-20260619.txt`.
- Used CloakBrowser only.
- Performed a read-only backend home and draft-list state check.
- No screenshot, form fill, paste, save, sync, phone preview, scheduled send, publish, delete, or
  draft mutation was performed.
- Raw URL token, account text, article titles, and page text samples were not recorded.
- The authenticated draft-list route was reachable with login/relogin blocker signals absent.
- Redacted selector counts on the draft-list surface were iframe 0, contenteditable editor nodes 0,
  textarea 0, ProseMirror 0, editor-like containers 6, draft/card-like containers 64, buttons 31,
  anchors 93.
- Boundary: this is authenticated draft-list reachability evidence only. It does not prove
  authenticated article editor target readback, ordinary PC paste, editor body mutation, safe
  disposable draft cleanup, WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 WeChat Draft Edit Entry CloakBrowser Readback Addendum

- Added `prompts/0601/evidence/wechat-draft-edit-entry-cloakbrowser-readback-20260619.txt`.
- Used CloakBrowser only.
- Performed a read-only draft edit-entry check from the authenticated draft-list surface.
- No screenshot, form fill, paste, save, sync, phone preview, scheduled send, publish, delete, or
  draft mutation was performed.
- Raw credential parameters, account text, article titles, draft body, page text samples, raw
  network URLs, browser session secrets, and local runtime paths were not recorded.
- The delete-shaped control and publish-shaped control were distinguished from the edit-shaped
  control by parent wrapper text flags and control placement; only the edit-shaped control was
  clicked.
- After waiting for the active page to settle, the active CloakBrowser page remained on the
  draft-list route shape.
- Redacted selector counts after edit-entry click were iframe 0, contenteditable editor nodes 0,
  textarea 0, ProseMirror 0, editor-like class/id nodes 6, rich-media/appmsg-edit/js-editor nodes 0,
  known JS editor ids 0.
- Boundary: this is authenticated draft-list and edit-shaped control reachability evidence only. It
  does not prove authenticated article editor DOM, ordinary PC paste, editor body mutation, safe
  disposable draft cleanup, WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 WeChat New Article Editor CloakBrowser Readback Addendum

- Added `prompts/0601/evidence/wechat-new-article-editor-cloakbrowser-readback-20260619.txt`.
- Used CloakBrowser only.
- Performed an authenticated new-article editor surface readback from the WeChat article-list
  session.
- No screenshot, form fill, paste, save, preview, sync, phone preview, scheduled send, publish,
  delete, or draft cleanup action was performed.
- Raw credential parameters, account text, article titles, article body, page text samples, raw
  network URLs, browser session secrets, and local runtime paths were not recorded.
- Existing list-card edit controls were distinguishable from delete and publish controls, but the
  existing-card edit click remained on the list route shape.
- The browser then used the official new-article route shape exposed by the current WeChat static
  bundle and reached `media/appmsg_edit_v2`, `action=edit`, `isNew=1`, `type=10`.
- Redacted selector counts on the final editor route were iframe 1, visible iframe 0,
  `contenteditable=true` 3, visible contenteditable 2, textarea 2, visible textarea 1,
  ProseMirror 2, known JS editor ids 31, appmsg-edit signals 16, rich-media signals 1,
  `#js_content` signals 1, title/input signals 103, cover signals 46, visible save/preview
  controls 2, and visible publish/send controls 1.
- The visible main body editor was a ProseMirror contenteditable under a mock-iframe wrapper,
  approximately 586px wide and 538px high, using `white-space: break-spaces`,
  `word-break: break-word`, `font-size: 17px`, and `line-height: 27.2px`.
- Empty main body embedded counts were SVG 0, `foreignObject` 0, style 0, image 0, section 1,
  paragraph 0, and span 1.
- Boundary: this proves authenticated new-article editor surface reachability and redacted DOM
  identity only. It does not prove ordinary PC Ctrl+V rich HTML/SVG paste, editor body mutation,
  safe disposable draft cleanup, WeChat phone preview, mobile interaction, Dark Mode, cover
  thumbnail, credentialed sync, scheduled send, platform preview, public article rendering, or
  publish success.

## 2026-06-19 WeChat Editor Surface Validator Addendum

- Added `prompts/0601/evidence/wechat-editor-surface-validator-20260619.txt`.
- Added `StyleProofArtifact.platformEditorSurfaceVerified?: boolean`.
- Added `platformEditorSurfaceVerified` to `StyleProofArtifactVerificationField`.
- Added `style-proof-manifest-platform-editor-surface-not-verified`.
- `pc-editor-paste-event` now requires same-artifact `platformEditorSurfaceVerified:true` in
  addition to ordinary clipboard paste, authenticated/editor target, same tab, paste/input, body
  mutation, mojibake-free, exact artifact, and safe commit proof.
- The runbook now exposes `platformEditorSurfaceVerified` as a required field for PC paste proof.
- Regression coverage rejects a PC paste row where every ordinary paste flag is true but the exact
  editor body surface was never verified.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 113 tests.
- 4-file cross-platform export regression passed at 4 files / 152 tests.
- Full export serial regression passed at 35 files / 1086 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  26.43s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove ordinary WeChat Ctrl+V
  rich HTML/SVG acceptance, editor body mutation in the live platform, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled send, platform preview,
  public article rendering, or publish success.

## 2026-06-19 WeChat Editor DOM Surface Validator Addendum

- Added `prompts/0601/evidence/wechat-editor-dom-surface-validator-20260619.txt`.
- `pc-editor-dom-readback` now requires `platformEditorSurfaceVerified:true` in addition to
  authenticated session, article editor target, editor DOM readback, and safe commit proof.
- `validateStyleProofManifest()` now emits
  `style-proof-manifest-platform-editor-surface-not-verified` for PC editor DOM rows that never
  verify the main article body editing surface.
- The authenticated-PC-editor collection note and execution runbook expose
  `platformEditorSurfaceVerified` for PC DOM readback, not only for PC paste.
- Regression coverage rejects DOM readback that can identify an authenticated article editor and
  DOM nodes but cannot prove the WeChat main body ProseMirror surface.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 114 tests.
- 4-file cross-platform export regression passed at 4 files / 153 tests.
- Full export serial regression passed at 35 files / 1087 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  33.13s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove ordinary WeChat Ctrl+V
  rich HTML/SVG acceptance, live editor body mutation, phone preview, mobile interaction, Dark Mode,
  cover thumbnail, credentialed sync, scheduled send, platform preview, public article rendering,
  or publish success.

## 2026-06-19 WeChat Tempera Ordinary Ctrl+V Input-Bridge Blocked Addendum

- Added `prompts/0601/evidence/wechat-tempera-ordinary-ctrlv-input-bridge-blocked-20260619.txt`.
- Used CloakBrowser only; Playwright was not used.
- The authenticated WeChat new-article editor body was reachable and read back as the intended
  ProseMirror body surface before mutation.
- Exact `flagship-tempera.html` was written to Windows CF_HTML clipboard with SHA-256
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585`, `svgCount=35`,
  `dataInkSvgCount=3`, and `dataInkBlockCount=23`.
- Repeated OS input attempts through `keybd_event`, `SendInput`, body-coordinate clicks, and
  `WScript.Shell.AppActivate + SendKeys` did not produce page `keydown`, `paste`, `beforeinput`,
  `input`, trusted paste/input, or editor body DOM mutation.
- The temporary title was cleared and the editor body remained placeholder-only with 0 SVG,
  0 `data-ink-svg`, and 0 `data-ink-block`.
- Boundary: this is a current-session input-bridge-blocked negative result, not evidence that
  WeChat accepts or rejects Tempera rich HTML/SVG. It must not satisfy `pc-editor-paste-event`,
  `ordinaryClipboardPasteVerified:true`, `safe-disposable-draft`, phone preview, Dark Mode, cover,
  sync, schedule, public rendering, or publish gates.

## 2026-06-19 WeChat Tempera Ordinary Ctrl+V Mojibake Cleanup Addendum

- Added `prompts/0601/evidence/wechat-tempera-ordinary-ctrlv-mojibake-cleanup-20260619.txt`.
- Used CloakBrowser only; Playwright was not used.
- Root-caused the earlier Tempera input-bridge block to a visible-tab mismatch and DPI coordinate
  mismatch. After selecting the CloakBrowser-controlled tab and calibrating coordinates, a
  transient page probe received real OS mouse/key/input events.
- Exact `flagship-tempera.html` was written to Windows CF_HTML clipboard with SHA-256
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585`.
- Same-visible-tab WeChat PC editor ordinary OS Ctrl+V preserved rich structure:
  `svgCount=35`, `dataInkSvgCount=3`, `dataInkBlockCount=23`, `bodyPaste=1`,
  `docPaste=1`, `docInput=1`, and `mutation=5`.
- The result remains negative for complete acceptance because text was mojibake-damaged:
  `replacementCharCount=1118`, `mojibakeHintCount=1118`.
- Cleanup completed: session-bound credentialed `operate_appmsg` returned `base_resp.ret=0`; two post-delete
  reload readbacks reported itemCount `6`, title matches `0`, target content matches `0`, and the
  target app id absent.
- Boundary: this proves Tempera same-tab ordinary OS Ctrl+V reachability, SVG/data-ink survival,
  and cleanup, but it does not satisfy `pc-editor-paste-event`, `mojibakeFreeVerified:true`,
  phone preview, Dark Mode, cover thumbnail, sync, schedule, public rendering, or publish gates.

## 2026-06-19 WeChat PC Paste Artifact Binding Validator Addendum

- Added `prompts/0601/evidence/wechat-pc-paste-artifact-binding-validator-20260619.txt`.
- `pc-editor-paste-event` now requires one same `platform-editor` / `pc-paste` artifact to bind
  exact artifact fingerprint, `exactArtifact:true`, authenticated-session proof, target/surface/DOM
  proof, ordinary Ctrl+V proof, same-tab proof, paste/input proof, editor-body mutation,
  mojibake-free readback, and `safeForCommit:true`.
- Added `style-proof-manifest-safe-commit-not-verified`.
- Regression coverage rejects strong paste flags that lack same-artifact exact/authenticated/DOM
  binding and keeps split multi-artifact paste proof invalid when fields are distributed across
  separate pc-paste artifacts.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 115 tests.
- 4-file cross-platform export regression passed at 4 files / 154 tests.
- Full export serial regression passed at 35 files / 1088 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  31.57s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove ordinary WeChat Ctrl+V
  rich HTML/SVG acceptance, live editor body mutation, phone preview, mobile interaction, Dark Mode,
  cover thumbnail, credentialed sync, scheduled send, platform preview, public article rendering,
  or publish success.

## 2026-06-19 WeChat Tempera Entity-Safe Clipboard Addendum

- Added `prompts/0601/evidence/wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt`.
- Added a WeChat-specific clipboard transform in `inkforge/src/services/export/utils.ts`:
  `encodeNonAsciiHtmlEntities()`, `prepareWechatClipboardHtml()`, and
  `prepareWechatClipboardPlainText()`, plus `copyWechatHtmlToClipboard()`.
- `ExportModal` now uses the WeChat helper only when the selected platform is `wechat`; normal
  preview/export HTML and non-WeChat clipboard copy remain unchanged.
- `inkforge/scripts/set-windows-html-clipboard.ps1` now supports `-EncodeNonAsciiEntities` and
  reports source/transformed bytes, SHA-256, non-ASCII count, entity count, and preserved SVG
  counts.
- Live WeChat PC proof: source `flagship-tempera.html` SHA-256
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585` was transformed into
  entity-safe SHA-256 `f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`.
- The transformed payload reduced non-ASCII characters from `944` to `0`, preserved
  `svgCount=35`, `dataInkSvgCount=3`, and `dataInkBlockCount=23`, and ordinary OS Ctrl+V into the
  authenticated WeChat PC editor read back `replacementCharCount=0` and `mojibakeHintCount=0`.
- Cleanup completed with post-delete readbacks finding zero title/content/app-id matches.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 116 tests.
- 4-file cross-platform export regression passed at 4 files / 155 tests, and full export serial
  regression passed at 35 files / 1089 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  23.37s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this proves WeChat PC ordinary Ctrl+V for the entity-safe clipboard payload only. It
  does not prove raw UTF-8 Tempera direct paste, WeChat phone preview, mobile interaction, Dark
  Mode, cover thumbnail, credentialed sync, scheduled send, platform preview, public article
  rendering, or publish success.

## 2026-06-19 WeChat Kiln Entity-Safe Editor-Return Cleanup Addendum

- Added `prompts/0601/evidence/wechat-kiln-entity-ordinary-ctrlv-editor-return-cleanup-20260619.txt`.
- Used CloakBrowser only; Playwright was not used.
- Exact source `flagship-kiln.html` SHA-256
  `90581eec1c3cb2805ddc235b8d41725795bfeaf2fc3628c707d485201af0d531` was transformed into
  entity-safe SHA-256 `d099275aadb399a7b63792d3fb0c826c66b7bb02aba50d67820fb9b0fa23d335`.
- The transformed payload reduced non-ASCII characters from `941` to `0`, preserved
  `svgCount=35`, `dataInkSvgCount=3`, and `dataInkBlockCount=23`, and was written to Windows
  `HTML Format` plus `UnicodeText`.
- The authenticated WeChat editor surface was reachable before paste setup, with 3 contenteditable
  nodes, 2 ProseMirror nodes, `#js_ueditor=1`, `#js_appmsg_editor=1`, and `#editor_pannel=1`.
- Win32 `keybd_event` ordinary Ctrl+V was sent with foreground window stable, preserved clipboard,
  no mouse move, and no click.
- The post-paste readback found the active page back on the draft-list route, with no editor
  ProseMirror body, no in-page paste/input/mutation counter state, no deterministic proof title,
  and no `data-ink-svg` / `data-ink-block` marker visible in the list. The current-run untitled
  draft increased the visible article count from 6 to 7, so this remains editor-return/no-rich-
  readback negative evidence rather than paste acceptance.
- Cleanup completed through the visible top current-run draft delete path; two post-delete
  readbacks reported article count `6`, current-run time matches `0`, deterministic proof title
  matches `0`, relogin signals absent, and editor selectors absent.
- Boundary: this must not set `ordinaryClipboardPasteVerified:true`,
  `pasteInputEventVerified:true`, `editorBodyMutationVerified:true`, `mojibakeFreeVerified:true`,
  `safe-disposable-draft`, phone preview, Dark Mode, cover thumbnail, credentialed sync, scheduled
  send, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Credentialed Sync Exact Artifact Addendum

- Added `prompts/0601/evidence/style-proof-credentialed-sync-exact-artifact-20260619.txt`.
- Strengthened `credentialed-channel-response` and `sync-readback` so both require
  `exactArtifact:true` in addition to `artifactFingerprint`, `externalAccountAuthenticated:true`,
  and `safeForCommit:true`.
- `validateStyleProofManifest()` now emits `style-proof-manifest-exact-artifact-missing` when an
  authenticated credentialed response or sync readback is not bound to the exact exported artifact.
- Runbook failure signals reject account responses, upload responses, draft ids, or material
  readbacks for a different artifact as proof that the current exported artifact was synced.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 117 tests.
- 4-file cross-platform export regression passed at 4 files / 156 tests, and full export serial
  regression passed at 35 files / 1090 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  26.43s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove credentialed sync,
  draft/material readback, scheduled-send, platform preview, public rendering, upload, or publish
  success.

## 2026-06-19 Style Proof Scheduled Send Contract Addendum

- Added `prompts/0601/evidence/style-proof-scheduled-send-contract-20260619.txt`.
- Added `scheduled-send-readback` as a distinct `StyleProofRequirementId` under `published`
  evidence so scheduled/send state cannot be hidden inside generic platform preview proof.
- Added `StyleProofAction:'scheduled-send'`, `StyleProofReadback:'scheduled-send-state'`,
  `StyleProofArtifact.scheduledSendVerified?: boolean`, and
  `style-proof-manifest-scheduled-send-not-verified`.
- `scheduled-send-readback` now requires a credentialed-channel scheduled-send artifact with
  `artifactFingerprint`, `exactArtifact`, `externalAccountAuthenticated:true`,
  `scheduledSendVerified:true`, and `safeForCommit:true`.
- Runbook failure signals reject credentialed sync responses, editor previews, draft creation, and
  public preview URLs as proof that the exact artifact entered a real send or scheduled-send state.
- Added the `ExportModal` label for `scheduled-send-readback` so runbook/cannot-claim UI remains
  type-complete.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 116 tests.
- 4-file cross-platform export regression passed at 4 files / 155 tests, and full export serial
  regression passed at 35 files / 1089 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  29.30s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove credentialed sync,
  scheduled-send, platform preview, public article rendering, upload, or publish success.

## 2026-06-19 Style Proof Phone Runbook Failure Signals Addendum

- Added `prompts/0601/evidence/style-proof-phone-runbook-failure-signals-20260619.txt`.
- Strengthened `buildStyleProofExecutionFailureSignals()` so phone-preview runbook rows explicitly
  reject scan entries, setup dialogs, PC preview shells, relogin pages, generic QR screens, local
  browser screenshots, and PC DOM as final phone article proof.
- Added Dark Mode-specific runbook failure text rejecting settings pages, generic phone
  screenshots, and PC preview shells unless the exact article body is inspected with mobile Dark
  Mode enabled.
- Added cover-thumbnail-specific runbook failure text rejecting cover crop panels, cover-setting
  screens, and upload dialogs unless the exact cover thumbnail is accepted in a phone share,
  preview entry, or platform list entry.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 116 tests.
- 4-file cross-platform export regression passed at 4 files / 155 tests, and full export serial
  regression passed at 35 files / 1089 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  28.42s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local runbook/checklist proof only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled send, platform
  preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Public Host and Manifest Safe Commit Addendum

- Added `prompts/0601/evidence/style-proof-public-host-manifest-safe-commit-20260619.txt`.
- Strengthened `public-image-host` so accepted host status and non-empty `artifactRef` must be
  paired with `safeForCommit:true` on the same public-web proof artifact.
- Strengthened `xhs-artifact-manifest` and `zhihu-artifact-manifest` so non-empty `artifactRef`,
  `artifactManifestValidated:true`, and `safeForCommit:true` must be on the same
  artifact-manifest validation row.
- Requirement-level acceptance audit now reports local proof hygiene failures as invalid instead
  of hiding them behind the broader external gate status.
- Regression coverage rejects unsafe public-host rows, unsafe artifact-manifest rows, and split
  artifact-manifest rows where `artifactRef` and `artifactManifestValidated:true` are not bound to
  the same evidence row.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 117 tests.
- 4-file cross-platform export regression passed at 4 files / 156 tests, and full export serial
  regression passed at 35 files / 1090 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  36.83s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove public-host availability,
  XHS/Zhihu account upload, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Required Safe Commit Addendum

- Added `prompts/0601/evidence/style-proof-required-safe-commit-contract-20260619.txt`.
- Added a generic validator layer for every execution contract that lists `safeForCommit` in
  `requiredFields`.
- Matching action/channel proof rows now require same-row `safeForCommit:true`; otherwise
  `validateStyleProofManifest()` emits `style-proof-manifest-safe-commit-not-verified` and keeps
  requirement-level acceptance audit invalid.
- Existing specialized validators keep their precise field checks; the generic layer only closes
  the common safe-for-commit gap and avoids duplicate safe-commit issues.
- Regression coverage rejects unsafe local unit-test proof, unsafe authenticated editor proof, and
  unsafe phone screenshot proof.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 118 tests.
- 4-file cross-platform export regression passed at 4 files / 157 tests, and full export serial
  regression passed at 35 files / 1091 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  32.66s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Required Artifact Fingerprint Addendum

- Added `prompts/0601/evidence/style-proof-required-artifact-fingerprint-contract-20260619.txt`.
- Added a generic validator layer for every execution contract that lists `artifactFingerprint` in
  `requiredFields`.
- Matching action/channel proof rows now require a non-empty same-row `artifactFingerprint`;
  otherwise `validateStyleProofManifest()` emits `style-proof-manifest-exact-artifact-missing`
  and keeps requirement-level acceptance audit invalid.
- Existing specialized validators keep their precise exact-artifact checks; the generic layer only
  closes the common fingerprint traceability gap and avoids duplicate exact-artifact issues.
- Regression coverage rejects untraceable phone screenshot, credentialed sync, scheduled-send, and
  published-preview proof rows.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 119 tests.
- 4-file cross-platform export regression passed at 4 files / 158 tests, and full export serial
  regression passed at 35 files / 1092 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  35.43s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Required Exact Artifact Addendum

- Added `prompts/0601/evidence/style-proof-required-exact-artifact-contract-20260619.txt`.
- Added a generic validator layer for every execution contract that lists `exactArtifact` in
  `requiredFields`.
- Matching action/channel proof rows now require same-row `exactArtifact:true`; otherwise
  `validateStyleProofManifest()` emits `style-proof-manifest-exact-artifact-missing` and keeps
  requirement-level acceptance audit invalid.
- Existing specialized validators keep their precise exact-artifact checks; the generic layer only
  fills the common exact-artifact binding gap and avoids duplicate exact-artifact issues.
- Regression coverage rejects phone screenshot, credentialed sync, scheduled-send, and
  published-preview proof rows with matching fingerprints and business-specific proof flags but no
  same-row `exactArtifact:true`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 120 tests.
- 4-file cross-platform export regression passed at 4 files / 159 tests, and full export serial
  regression passed at 35 files / 1093 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  29.30s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Required Readback Addendum

- Added `prompts/0601/evidence/style-proof-required-readback-contract-20260619.txt`.
- Added a generic validator layer for every execution contract's `requiredReadbacks`.
- Matching action/channel proof rows now require an accepted same-row `readback`; otherwise
  `validateStyleProofManifest()` emits `style-proof-manifest-readback-missing` and keeps
  requirement-level manifest status invalid.
- Shared required-field helpers now require channel, action, accepted host status when applicable,
  and accepted readback on the same proof row before `safeForCommit`, `artifactFingerprint`, or
  `exactArtifact` can satisfy an execution contract.
- Synchronized required readback lists with the existing market-editor, authenticated editor, PC
  editor DOM, safe disposable draft, phone preview, Dark Mode, cover thumbnail, and
  published/platform-preview validators.
- Regression coverage rejects readback-split phone screenshot proof and authenticated editor rows
  with unsupported readback types.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 122 tests.
- 4-file cross-platform export regression passed at 4 files / 161 tests, and full export serial
  regression passed at 35 files / 1095 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  47.75s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Dark Mode Same Row Addendum

- Added `prompts/0601/evidence/style-proof-dark-mode-same-row-contract-20260619.txt`.
- Dark Mode proof now requires `phonePreviewContentVerified:true` and
  `darkModeEnabledVerified:true` on the same `dark-mode-check` proof artifact.
- Split Dark Mode proof rows now emit `style-proof-manifest-dark-mode-not-verified` and keep
  manifest requirement status invalid.
- Requirement-level acceptance audit now treats phone-content-missing, dark-mode-not-verified, and
  cover-thumbnail-not-accepted as invalid local proof rows instead of generic phone external
  blockers.
- TDD first run failed as expected because split Dark Mode proof emitted no issue; after the
  validator fix, focused verification passed.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 123 tests.
- 4-file cross-platform export regression passed at 4 files / 162 tests, and full export serial
  regression passed at 35 files / 1096 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  53.80s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Forbidden Field Contract Addendum

- Added `prompts/0601/evidence/style-proof-forbidden-field-contract-20260619.txt`.
- Added executable `forbiddenFields` validation for matching channel/action/readback contract rows.
- Matching `no-proprietary-template-source` and `no-sensitive-artifact` hygiene rows with
  `sensitive:true` now emit requirement-level `style-proof-manifest-sensitive-artifact` issues
  instead of relying only on artifact-level hygiene.
- Added `style-proof-manifest-forbidden-field-present` for future non-sensitive forbidden-field
  contract rows.
- Synchronized `no-proprietary-template-source` with existing market-editor source-hygiene
  evidence by allowing both `local-artifact` and `market-editor` channels.
- TDD first focused run failed as expected because sensitive hygiene artifacts only emitted
  artifact-level issue locations; after the validator fix, focused verification passed.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 125 tests.
- 4-file cross-platform export regression passed at 4 files / 164 tests, and full export serial
  regression passed at 35 files / 1098 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  1m 30s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Action Channel Contract Addendum

- Added `prompts/0601/evidence/style-proof-action-channel-contract-20260619.txt`.
- Added executable `requiredChannels` / `requiredActions` validation for proof artifacts attached
  to a requirement.
- Wrong-channel hygiene rows now emit
  `style-proof-manifest-contract-action-channel-mismatch` instead of satisfying
  `no-proprietary-template-source` or `no-sensitive-artifact`.
- Synchronized `local-browser-rendering` so existing Tauri/WebView2 local-render evidence remains
  accepted by the execution contract.
- Weak PC editor rows attached to phone or publish requirements now stay invalid instead of
  falling back to broader external-gate status.
- TDD first focused run failed as expected because no action/channel mismatch issue was emitted;
  after the validator fix, focused verification passed.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 126 tests.
- 4-file cross-platform export regression passed at 4 files / 165 tests, and full export serial
  regression passed at 35 files / 1099 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  35.55s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Requirement Scope Regression Addendum

- Added `prompts/0601/evidence/style-proof-requirement-scope-regression-20260619.txt`.
- Added a regression proving PC paste proof fields cannot backfill from an artifact assigned to
  `authenticated-editor-url` into `pc-editor-paste-event`.
- No production code change was needed; the current validator combination already keeps the target
  requirement invalid.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 127 tests.
- 4-file cross-platform export regression passed at 4 files / 166 tests, and full export serial
  regression passed at 35 files / 1100 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  34.21s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Host and Manifest Audit Regression Addendum

- Added `prompts/0601/evidence/style-proof-host-manifest-audit-regression-20260619.txt`.
- Added acceptance-audit regression coverage without production code changes.
- Locked Zhihu `public-image-host` proof rows with non-public host status (`local-only`) as
  `invalid` in both manifest report and acceptance audit.
- Locked XHS `xhs-artifact-manifest` proof rows without `artifactManifestValidated:true`, and
  split ref/validation rows, as `invalid` in both manifest report and acceptance audit.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  38.59s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit regression proof only. It does not prove phone preview,
  mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Scheduled Send Audit Addendum

- Added `prompts/0601/evidence/style-proof-scheduled-send-audit-20260619.txt`.
- Added an acceptance-audit regression proving same-account exact-artifact scheduled-send proof
  rows without `scheduledSendVerified:true` stay `invalid`.
- TDD failed first because `scheduled-send-readback` was classified as `unsafe-to-automate` in the
  acceptance audit despite carrying `style-proof-manifest-scheduled-send-not-verified`.
- Added `style-proof-manifest-scheduled-send-not-verified` to the acceptance-audit invalid issue
  set while preserving ordinary missing scheduled-send gates as `unsafe-to-automate`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 128 tests.
- 4-file cross-platform export regression passed at 4 files / 167 tests, and full export serial
  regression passed at 35 files / 1101 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  34.94s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof External Account Auth Audit Addendum

- Added `prompts/0601/evidence/style-proof-external-account-auth-audit-20260619.txt`.
- Added an acceptance-audit regression proving credentialed sync, sync readback, and
  published-preview proof rows without positive `externalAccountAuthenticated:true` stay `invalid`.
- TDD failed first because `published-url-or-platform-preview` was classified as
  `unsafe-to-automate` in the acceptance audit despite carrying
  `style-proof-manifest-external-account-auth-missing`.
- Added `style-proof-manifest-external-account-auth-missing` to the acceptance-audit invalid issue
  set while preserving ordinary missing external gates as `blocked-by-external` or
  `unsafe-to-automate`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 127 tests.
- 4-file cross-platform export regression passed at 4 files / 166 tests, and full export serial
  regression passed at 35 files / 1100 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  43.46s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Required Field Binding Addendum

- Added `prompts/0601/evidence/style-proof-required-field-binding-contract-20260619.txt`.
- Added `style-proof-manifest-proof-not-bound` for required fields split across multiple matching
  proof rows.
- Added a generic same-row validator that only fires after every required field exists somewhere
  among matching channel/action/host/readback candidates, but no single candidate carries all
  required fields.
- Requirement-level acceptance audit now treats proof-not-bound as invalid local proof.
- Regression coverage rejects `phone-screenshot` proof split across two matching screenshot rows.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 124 tests.
- 4-file cross-platform export regression passed at 4 files / 163 tests, and full export serial
  regression passed at 35 files / 1097 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  39.51s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Market Editor Applied Audit Addendum

- Added `prompts/0601/evidence/style-proof-market-editor-application-audit-20260619.txt`.
- Bound the market-editor non-applied regression to the real `wechat-classic-inline` style choice so
  acceptance audit aggregation covers the `market-applied-dom-readback` row.
- TDD failed first because `centralEditorChanged:false` market proof was classified as
  `blocked-by-external` in the acceptance audit despite carrying
  `style-proof-manifest-market-editor-not-applied`.
- Added `style-proof-manifest-market-editor-not-applied` to the acceptance-audit invalid issue set.
  A concrete 135/Xiumi library click or style selection that does not change the central editor is
  invalid proof, not a pending external market-editor task.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  45.98s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove 135/Xiumi account
  operations, WeChat PC paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, public-host availability, platform preview, public article
  rendering, upload, or publish success.

## 2026-06-19 Style Proof Safe Draft Cleanup Audit Addendum

- Added `prompts/0601/evidence/style-proof-safe-draft-cleanup-audit-20260619.txt`.
- Extended the safe-disposable-draft cleanup regression with requirement-level acceptance audit
  assertions.
- TDD failed first because a `safe-disposable-draft` row with `disposableDraft:true` but no
  `cleanupPathVerified:true` was classified as `unsafe-to-automate` in the acceptance audit despite
  carrying `style-proof-manifest-cleanup-path-missing`.
- Added `style-proof-manifest-disposable-draft-missing` and
  `style-proof-manifest-cleanup-path-missing` to the acceptance-audit invalid issue set. Missing
  safe-draft proof remains a manual authenticated-PC-editor gate; submitted unclean safe-draft
  proof is invalid proof.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  38.36s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove WeChat authenticated PC
  paste, safe draft deletion on the live platform, phone preview, mobile SMIL/click, mobile Dark
  Mode, cover thumbnail, credentialed sync, scheduled send, public-host availability, platform
  preview, public article rendering, upload, or publish success.

## 2026-06-19 Style Proof Ordinary PC Paste Audit Addendum

- Added `prompts/0601/evidence/style-proof-pc-paste-ordinary-audit-20260619.txt`.
- Strengthened the programmatic ClipboardEvent regression so all same-row exact/auth/editor/body
  proof fields are present except `ordinaryClipboardPasteVerified:true`, then added
  acceptance-audit assertions.
- TDD failed first because the acceptance audit classified the concrete weak PC paste row as
  `unsafe-to-automate` despite `style-proof-manifest-ordinary-paste-not-verified`.
- Added PC paste-specific issue ids to the acceptance-audit invalid issue set:
  ordinary paste not verified, same editor tab not verified, paste/input missing, editor body not
  mutated, mojibake not ruled out, and paste proof not bound.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  53.47s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove WeChat ordinary Ctrl+V rich
  HTML/SVG paste on the live platform, safe draft deletion, phone preview, mobile SMIL/click,
  mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host availability,
  platform preview, public article rendering, upload, or publish success.

## 2026-06-19 Style Proof Gate Invalid Status Audit Addendum

- Added `prompts/0601/evidence/style-proof-gate-invalid-status-audit-20260619.txt`.
- Added a gate-level acceptance regression to the scheduled-send invalid-proof case: an invalid
  `scheduled-send-readback` row must make the aggregate `platform-publish` gate `invalid`.
- TDD failed first because the gate was still classified as `unsafe-to-automate` even though the
  requirement row carried `style-proof-manifest-scheduled-send-not-verified`.
- Updated `buildStyleProofAcceptanceGateAudit()` so an acceptance gate with `gate.invalid > 0`
  reports `invalid` before falling back to external/manual status. Missing, unattempted
  phone/account/publish gates remain `blocked-by-external` or `unsafe-to-automate`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  32.90s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local acceptance-audit classification proof only. It does not prove scheduled
  send, publish, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed
  sync, public-host availability, platform preview, public article rendering, upload, or publish
  success.

## 2026-06-19 Style Proof Readback Requirement Status Audit Addendum

- Added `prompts/0601/evidence/style-proof-readback-requirement-status-audit-20260619.txt`.
- Added a phone-screenshot wrong-readback regression: a row with the expected
  `phone-preview` action/channel and same-row exact artifact, phone-content, and safe-commit flags
  must remain invalid when it records `readback:'phone'` instead of `readback:'screenshot'`.
- TDD failed first because the requirement-level acceptance audit classified that concrete failed
  phone proof as `blocked-by-external`.
- Updated the acceptance invalid classifier so `style-proof-manifest-readback-missing` becomes
  `invalid` outside `authenticated-pc-editor` gates. The authenticated editor wrong-readback case
  keeps its existing `unsafe-to-automate` behavior.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 130 tests.
- 4-file cross-platform export regression passed at 4 files / 169 tests, and full export serial
  regression passed at 35 files / 1103 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  34.09s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local acceptance-audit classification proof only. It does not prove phone
  preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, upload, or publish success.

## 2026-06-19 Style Proof PC Paste Editor Flags Audit Addendum

- Added `prompts/0601/evidence/style-proof-pc-paste-editor-flags-audit-20260619.txt`.
- Added table-driven PC paste regressions for concrete `pc-editor-paste-event` rows missing only
  one of `authenticatedSessionVerified`, `platformEditorTargetVerified`,
  `platformEditorSurfaceVerified`, or `platformEditorDomVerified`.
- TDD failed first because those paste rows were classified as `unsafe-to-automate` despite being
  concrete failed paste proof.
- Added a requirement-specific invalid issue map for `pc-editor-paste-event`; the same issue ids
  still keep their existing manual-gate behavior for `authenticated-editor-url` and
  `pc-editor-dom-readback`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 134 tests.
- 4-file cross-platform export regression passed at 4 files / 173 tests, and full export serial
  regression passed at 35 files / 1107 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  33.62s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local acceptance-audit classification proof only. It does not prove WeChat
  ordinary Ctrl+V rich HTML/SVG paste on the live platform, safe draft deletion, phone preview,
  mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, upload, or publish success.

## 2026-06-19 Market Editor CloakBrowser Field Study Addendum

- Added `prompts/0601/evidence/market-editor-cloakbrowser-field-study-20260619.txt`.
- Used headed CloakBrowser only to observe 135 SVG editor and Xiumi studio authoring surfaces.
- 135 material-included free-trial SVG effects showed a background-only 1080x1920 SVG visual layer,
  separate percentage-inset trigger overlay, and structured panel controls for media, direction,
  animation timing, and expanded content.
- Xiumi SVG category insertion showed SVG behavior metadata in the library, while the center editor
  materialized the sample as nested `tn-cell` authoring cells, images, text, fixed groups, and
  flow-canvas structures rather than literal inline SVG.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md` and `prompts/0601/evidence/README.md`
  to preserve these rules as InkForge-owned schema/fallback guidance and vendor-residue blockers.
- Boundary: this is rule extraction only. It does not prove WeChat paste, phone preview, mobile
  interaction, cover thumbnail acceptance, credentialed sync, scheduled send, public host,
  XHS/Zhihu account upload, or publish success.

## 2026-06-19 WeChat Editor Surface CloakBrowser Revalidation Addendum

- Added `prompts/0601/evidence/wechat-editor-surface-cloakbrowser-revalidation-20260619.txt`.
- Recovered the fixed CloakBrowser browser session after a stale no-window Chrome holder blocked
  startup. A temporary empty-session smoke verified the CloakBrowser package was still functional,
  then the existing browser session was reused successfully without deleting account data.
- Authenticated WeChat backend home readback succeeded after recovery: title `公众号`, path
  `/cgi-bin/home`, creation/draft/material/publish-record entry signals present, and login/scan
  state not active.
- Authenticated new-article editor readback succeeded through the official editor route shape:
  login/scan signals absent, 3 contenteditable nodes, 2 textareas, 53 inputs, 1 iframe, 9 SVG
  nodes, 99 editor candidates, 104 title candidates, 46 cover candidates, 1 visible preview
  control, 2 visible save controls, and 1 visible publish control.
- Visual inspection confirmed the left draft card, top toolbar, central editor canvas, and bottom
  save/preview/publish controls. The transient local visual file was deleted and not committed.
- No form fill, paste, save, preview, publish, delete, sync, upload, or phone action was performed.
- Boundary: this proves current authenticated WeChat editor-surface reachability only. It does not
  prove ordinary Ctrl+V rich HTML/SVG paste, editor body mutation, safe draft cleanup, phone
  preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, XHS/Zhihu account upload,
  or publish success.

## 2026-06-20 Style Proof Current Open Gate Audit Addendum

- Added `prompts/0601/evidence/style-proof-current-open-gate-audit-20260620.txt`.
- Re-audited the committed proof packs after the editor-surface revalidation slice.
- Current state remains intentionally split:
  Amber and Tempera have committed WeChat PC evidence; Kiln remains outside the positive PC pack
  because both ordinary and entity-safe WeChat paste attempts are negative evidence.
- Amber and Tempera PC proof rows satisfy authenticated editor, PC DOM, exact artifact, safe draft
  cleanup, PC paste, and sensitive-hygiene requirements for their exact artifacts, while phone
  preview, Dark Mode, cover thumbnail, scheduled-send, and published/platform preview rows remain
  missing/cannot-claim.
- Verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "committed.*evidence" --reporter=default`
  at 1 file / 2 selected tests.
- Boundary: this is current local audit evidence only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, XHS/Zhihu account upload, or publish
  success.

## 2026-06-20 WeChat Tempera Preview Entry Precondition Failed Addendum

- Added `prompts/0601/evidence/wechat-tempera-preview-entry-precondition-failed-20260620.txt`.
- Attempted to prepare the already-proven Tempera entity-safe artifact for a preview-entry probe,
  but did not open preview because the live editor precondition failed.
- Attempt 1 used `keybd_event` Ctrl+V without mouse movement/click; body paste/input/mutation
  counters stayed 0 and the main body stayed placeholder-only.
- Attempt 2 used `keybd_event` Ctrl+V after a fixed screen click inside the central editor area.
  The foreground window stayed stable, but the artifact degraded to wrong-surface/plain-text:
  `svgCount=0`, `dataInkSvgCount=0`, `dataInkBlockCount=0`, and `sectionNice=false`.
- Cleanup cleared both ProseMirror surfaces, then authenticated home/draftbox readback found 0
  matches for the cleanup sentinel, preview-gate marker, entity-safe hash, and artifact filename.
  No delete action was performed because no current-run marker was present.
- Boundary: this is negative precondition evidence only. It does not prove PC paste, phone preview,
  mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, XHS/Zhihu account upload,
  or publish success.

## 2026-06-20 Style Proof Wrong-Surface Preview Regression Addendum

- Added `prompts/0601/evidence/style-proof-wrong-surface-preview-regression-20260620.txt`.
- Added a regression for the real WeChat Tempera preview-entry precondition failure:
  OS Ctrl+V and same-tab evidence are not enough when the main body surface is not verified,
  the body paste/input event is absent, and the body did not mutate.
- The fixture also includes `phone-preview-entry-readback` with `phonePreviewBlocked:true`, so
  `phone-preview-readback` remains invalid and downstream phone screenshot, Dark Mode, cover
  thumbnail, and publish rows remain cannot-claim.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 135 tests.
- Cross-platform export regression passed with 4 files / 174 tests, and full export serial
  regression passed with 35 files / 1108 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  32.53s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit regression proof only. It does not prove PC paste, phone
  preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, XHS/Zhihu account upload,
  or publish success.

## 2026-06-20 Public Source Rule Refresh Addendum

- Added `prompts/0601/evidence/public-source-rule-refresh-20260620.txt`.
- Used Exa and Grok as discovery tools, then promoted only official documentation or source
  repository claims into project rules.
- Checked WeChat official editor plugin specification, WeChat editor JSAPI, doocs/md,
  mdnice/markdown-nice, wx-art-formatter, and md2red.
- Updated `docs/platform-rendering-rules/market-practices-catalog.md` and
  `.trellis/spec/frontend/wechat-svg-modules.md` to keep official WeChat plugin bad cases above
  market tutorial advice.
- `git diff --check` and sensitive scan passed for this docs/evidence slice.
- Preserved the runtime boundary: JSAPI/plugin documentation, OSS formatter architecture, and XHS
  image-card generators inform future runbooks and manifests, but cannot satisfy paste,
  phone-preview, Dark Mode, cover thumbnail, credentialed sync, scheduled-send, or publish proof.
- Boundary: this is public-source rule refresh only. It does not prove WeChat PC paste, phone
  preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, XHS/Zhihu account upload,
  or publish success.

## 2026-06-20 WeChat Home Post-Reboot Readonly Addendum

- Added `prompts/0601/evidence/wechat-home-post-reboot-readonly-20260620.txt`.
- Used CloakBrowser only with the existing InkForge browser profile.
- Authenticated WeChat backend home readback succeeded after the workstation reboot: title
  `公众号`, sanitized route shape `/cgi-bin/home`, login/scan state absent, and backend home /
  creation / draft-material / publish-record style entry signals present.
- The readback included account and draft text; those strings were redacted and not recorded.
- No form fill, paste, save, preview, publish, delete, sync, upload, phone action, or draft mutation
  was performed.
- Boundary: this proves current authenticated WeChat backend home reachability only. It does not
  prove new-article editor body reachability, PC paste, body mutation, safe draft cleanup, phone
  preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, or publish
  success.

## 2026-06-20 WeChat Official Bad-Case Runtime Audit Addendum

- Added `prompts/0601/evidence/wechat-official-badcase-runtime-audit-20260620.txt`.
- Confirmed the public-source WeChat editor bad cases are already executable in
  `detectWechatOfficialEditorSpecIssues()`.
- Existing local blockers cover line-height-zero, fixed container size, logical text alignment,
  ordinary prose in `<pre>`, transparent image plus SVG overlay, touchstart-only SVG animation,
  event handlers, class/id dependency, unsupported CSS, unsafe SVG constructs, SVG text Dark Mode
  risk, important styles, and layout-report-required.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "WeChat official editor structure risks|blocks generic WeChat unsafe" --reporter=default`
  at 1 file / 2 selected tests, 133 skipped.
- Boundary: this is local detector/test coverage proof only. It does not prove WeChat PC paste,
  phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail acceptance, credentialed
  sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, or
  publish success.

## 2026-06-20 WeChat Draft Editor Readonly Preflight Addendum

- Added `prompts/0601/evidence/wechat-draft-editor-readonly-preflight-20260620.txt`.
- Used CloakBrowser only with the existing authenticated WeChat backend session.
- Reached the sanitized existing-draft editor route shape via the official card-list route and the
  public WeChat bundle edit route template. Appmsg id, credential query values, account strings,
  draft title, full URL, browser runtime directory, and transient visual file names were redacted
  and not recorded.
- No form fill, paste, save, preview, publish, delete, sync, upload, phone action, or draft
  mutation was performed.
- Readonly DOM evidence confirmed a visible main `.ProseMirror` body with 3948 text chars,
  87187 HTML chars, 70 inline SVG nodes, 4 images, 94 sections, 390 inline style attributes, 4
  animation-related hits, and 0 script/iframe/object/embed tags inside the main body.
- Visual inspection confirmed a nonblank editor with toolbar, left draft/history rail, central
  article canvas, body content, and bottom save/preview/publish controls. Transient screenshots
  were deleted and not committed.
- Negative fidelity finding: the real draft body contained visible replacement-glyph/mojibake
  blocks, with 4520 replacement-character hits across main body text/html and 2236 text
  replacement-character hits. This remains a badcase, not successful style proof.
- Boundary: this proves authenticated existing-draft editor reachability and readonly PC DOM
  preconditions only. It does not prove InkForge artifact paste, exact artifact preservation, safe
  draft cleanup, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account
  upload, or publish success.

## 2026-06-20 Style Proof Editor Mojibake Readback Contract Addendum

- Added `prompts/0601/evidence/style-proof-editor-mojibake-readback-contract-20260620.txt`.
- Converted the real WeChat existing-draft replacement-glyph/mojibake badcase into an executable
  local style-proof contract.
- `pc-editor-dom-readback` now requires `mojibakeFreeVerified:true` on the same authenticated
  `platform-editor` / `pc-editor-dom-readback` proof row. Missing clearance emits
  `style-proof-manifest-editor-mojibake-not-ruled-out` and keeps the requirement-level acceptance
  audit invalid.
- Added regression coverage proving editor reachability, target/surface/DOM flags, accepted
  readback, and `safeForCommit:true` cannot satisfy PC editor DOM fidelity unless mojibake damage
  is explicitly ruled out.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 136 tests.
- Cross-platform export regression passed with 4 files / 175 tests, and full export serial
  regression passed with 35 files / 1109 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  32.06s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit enforcement only. It does not prove WeChat artifact
  paste, exact artifact preservation, safe draft cleanup, phone preview, mobile SMIL/click, mobile
  Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform preview,
  public article rendering, XHS/Zhihu account upload, public-host availability, or publish success.

## 2026-06-20 Market Editor CloakBrowser SVG Deep Pass Addendum

- Added `prompts/0601/evidence/market-editor-cloakbrowser-svg-deep-pass-20260620.txt`.
- Used CloakBrowser only for a deeper applied-rule pass over 135 SVG editor and Xiumi SVG category
  authoring surfaces.
- 135 free-trial/no-material SVG effects are now recorded as schema inputs for image slots,
  trigger zones, trigger type, direction, motion duration, expanded content, ordering, spacing,
  static-expanded fallback, raster fallback, and mobile-preview proof requirements.
- Xiumi SVG labels are now recorded as taxonomy inputs for component family, behavior family,
  interaction channel, image ratio, fallback family, and proof requirement. Interactive and
  non-interactive samples are kept separate.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md`,
  `docs/platform-rendering-rules/market-practices-catalog.md`, and
  `prompts/0601/evidence/README.md`.
- Boundary: this is market rule extraction only. It does not prove WeChat paste, phone preview,
  mobile SMIL/click, mobile Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, platform preview, public article rendering, XHS/Zhihu account upload, public-host
  availability, or publish success.

## 2026-06-20 Market Editor Trigger Overlay Residue Contract Addendum

- Added `prompts/0601/evidence/market-editor-trigger-overlay-residue-contract-20260620.txt`.
- Expanded runtime market-editor residue detection for 135 SVG trigger overlay authoring markers:
  `block-img__trigger`, `edit-trigger`, `edit-trigger__switch`, and `trigger__ajuster`.
- Added a regression that proves those markers are blocked across WeChat, Xiaohongshu, and Zhihu
  even without `app-content-canvas` or known 135 builder `data-name` values.
- Verification passed:
  - focused trigger-overlay test at 1 selected test / 136 skipped
  - full `platform-export-rendering.test.ts` at 1 file / 137 tests
  - cross-platform export regression at 4 files / 176 tests
  - full export serial regression at 35 files / 1110 tests
  - targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build
- Boundary: this is local detector/test enforcement only. It does not prove WeChat paste, phone
  preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload,
  public-host availability, or publish success.

## 2026-06-20 Market Editor Placeholder-Only Readback Contract Addendum

- Added `prompts/0601/evidence/market-editor-placeholder-only-readback-contract-20260620.txt`.
- Added `StyleProofArtifact.marketAppliedContentVerified` and the issue id
  `style-proof-manifest-market-editor-placeholder-only`.
- `market-applied-dom-readback` now requires a same-row applied-content proof. A 135/Xiumi center
  canvas change that is only listing-only, placeholder-only, no-material, or otherwise lacks
  meaningful DOM/controls/slots/visible content stays invalid even when `centralEditorChanged:true`
  and `safeForCommit:true` are present.
- Acceptance audit maps the placeholder-only issue to requirement-level `invalid` and exposes it
  through `cannotClaim`.
- Verification passed:
  - focused market-editor regression at 4 selected tests / 134 skipped
  - full `platform-export-rendering.test.ts` at 1 file / 138 tests
  - cross-platform export regression at 4 files / 177 tests
  - full export serial regression at 35 files / 1111 tests
  - targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build
- Boundary: this is local validator/audit enforcement only. It does not prove WeChat paste, phone
  preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload,
  public-host availability, or publish success.

## 2026-06-20 Style Proof Runbook Field Criteria Addendum

- Added `prompts/0601/evidence/style-proof-runbook-field-criteria-20260620.txt`.
- Added `STYLE_PROOF_ARTIFACT_FIELD_CRITERIA` and
  `formatStyleProofArtifactVerificationFields()` in `style-catalog.ts`.
- Execution runbook success criteria and failure signals now explain required and forbidden
  artifact fields with field-level criteria while preserving exact field names for traceability.
- Added regression coverage for a manifest claiming `applied-editor-element`: the
  `market-applied-dom-readback` runbook step must expose `marketAppliedContentVerified:true` and
  non-placeholder applied-content criteria.
- Verification passed:
  - focused execution-runbook regression at 2 selected tests / 136 skipped
  - full `platform-export-rendering.test.ts` at 1 file / 138 tests
  - cross-platform export regression at 4 files / 177 tests
  - full export serial regression at 35 files / 1111 tests
  - targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build
- Boundary: this is local runbook wording and regression coverage only. It does not prove WeChat
  paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account
  upload, public-host availability, or publish success.

## 2026-06-20 Xiumi SVG Layer Slot Residue Contract Addendum

- Added `prompts/0601/evidence/xiumi-svg-layer-slot-residue-contract-20260620.txt`.
- Used CloakBrowser only on the authenticated Xiumi v5 paper editor SVG category.
- Clicked a visible SVG gallery/scrolling item and read the center `.tn-editing-panel` delta:
  `htmlLength +31920`, `tnComp +15`, `tnCell +18`, `img +3`, `contenteditable +1`, and center
  inline SVG still `0`.
- Added runtime residue detection for fine-grained Xiumi SVG layer-slot authoring markers:
  `tn-page-slot`, `tn-layer-slot`, `tn-child-position-absolute/static`,
  `tn-child-orientation-fixed/flow-canvas`, and `raw-image`.
- Added a regression proving those markers are blocked across WeChat, Xiaohongshu, and Zhihu even
  without broad `tn-comp` / `tn-cell` wrappers, flow-canvas attributes, or Xiumi hosted-media URLs.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "Xiumi SVG layer slot|Xiumi SVG carousel" --reporter=default`
  at 1 file / 2 selected tests / 137 skipped.
- Boundary: this is Xiumi applied-authoring DOM learning and local detector enforcement only. It
  does not prove WeChat paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 135 SVG Editor Layout Control Residue Addendum

- Added `prompts/0601/evidence/135-svg-editor-layout-control-residue-contract-20260620.txt`.
- Used CloakBrowser only on the active 135 SVG editor free-trial page. No save, export, sync,
  upload, publish, payment action, phone preview capture, screenshot artifact, profile artifact,
  account artifact, QR material, token, cookie, HAR artifact, template source, private SVG source,
  hosted material URL, or local browser path was committed.
- After clicking a visible `免费试用` control, the center `.content-canvas` exposed
  `nodes=328`, `svgs=11`, `images=4`, `inlineStyle=46`, `dataName=11`, `absolute=90`,
  `zeroFont=4`, and `hidden=54`.
- Added the dedicated runtime detector label `135 SVG editor layout control residue` for
  `block-spacing`, `block-gap`, `gap-item-wrapper`, `article-item__editing`,
  `ant-slider-track`, and `ant-slider-handle`.
- TDD first run failed because the layout-control-only fixture produced no market-editor residue
  issue. The focused regression then passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "135 SVG editor layout controls" --reporter=default`.
- Full local verification also passed:
  adjacent 135/market residue regression 7 selected tests, `platform-export-rendering.test.ts`
  150 tests, four-file cross-platform export regression 189 tests, full `src/services/export`
  serial run 35 files / 1123 tests, targeted ESLint, `vue-tsc --noEmit`, and production build.
  Vite built in 26.30s, and generated `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is 135 SVG editor authoring-control learning and local detector enforcement only.
  It does not prove WeChat paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public article
  rendering, XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 Style Proof Committed Evidence Runbook Report Addendum

- Added `prompts/0601/evidence/style-proof-committed-evidence-runbook-report-20260620.txt`.
- Added `CommittedStyleProofExecutionRunbookReport` plus
  `getCommittedStyleProofLocalEvidenceExecutionRunbook()`,
  `getCommittedStyleProofWechatPcEvidenceExecutionRunbook()`, and
  `getCommittedStyleProofEvidenceExecutionRunbookReport()`.
- The report runs the existing execution-runbook layer over the committed local evidence pack, the
  committed WeChat PC evidence pack, and their combined committed-evidence pack. It does not create
  artifacts or alter acceptance status.
- The combined summary surfaces exact-artifact fingerprint conflicts, cannot-claim steps,
  phone-open steps, external-dependency-open steps, unsafe-to-automate steps, and mutating-open
  steps so dashboards can distinguish operator gates from local proof.
- TDD first run failed because `getCommittedStyleProofEvidenceExecutionRunbookReport()` did not
  exist. After implementation, the focused committed runbook regression passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "committed evidence execution runbook report" --reporter=default`.
- Full local verification also passed:
  committed evidence focused group 4 selected tests, `platform-export-rendering.test.ts`
  148 tests, four-file cross-platform export regression 187 tests, full `src/services/export`
  serial run 35 files / 1121 tests, targeted ESLint, `vue-tsc --noEmit`, and production build.
  Vite built in 28.18s, and generated `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local committed-evidence runbook aggregation only. It does not prove WeChat
  ordinary Ctrl+V rich HTML/SVG paste for every flagship, phone preview, mobile SMIL/click, mobile
  Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public
  article rendering, XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 Style Proof Committed Evidence Release Gate Addendum

- Added `prompts/0601/evidence/style-proof-committed-evidence-release-gate-20260620.txt`.
- Added `CommittedStyleProofReleaseGateStatus`, `CommittedStyleProofReleaseGateBlocker`,
  `CommittedStyleProofReleaseGateReport`, and
  `getCommittedStyleProofEvidenceReleaseGateReport()`.
- The release gate reads only from `getCommittedStyleProofEvidenceExecutionRunbookReport()` and
  returns `canClaimComplete:false` for the current committed evidence pack.
- The current status is `blocked-by-local-conflict` because the combined committed evidence pack
  still exposes exact-artifact fingerprint mismatch. Phone preview, external dependency,
  unsafe-to-automate, and mutating-platform blockers remain visible separately.
- The local-conflict blocker now includes `fingerprintConflicts` for the current
  `wechat-flagship-amber` and `wechat-flagship-tempera` local-vs-PC exact artifact conflicts, so
  dashboards can show which choice/fingerprint families must be collected separately.
- TDD first run failed because `getCommittedStyleProofEvidenceReleaseGateReport()` did not exist.
  After implementation, the focused release-claim regression passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "release claims" --reporter=default`.
- Full local verification also passed:
  committed evidence plus release-claim focused group 5 selected tests,
  `platform-export-rendering.test.ts` 150 tests, four-file cross-platform export regression
  189 tests, full `src/services/export` serial run 35 files / 1123 tests, targeted ESLint,
  `vue-tsc --noEmit`, and production build. Vite built in 26.19s, and generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local release-claim blocking only. It does not prove WeChat ordinary Ctrl+V
  rich HTML/SVG paste for every flagship, phone preview, mobile SMIL/click, mobile Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public article
  rendering, XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 Style Proof Committed Evidence Combined Audit Addendum

- Added `prompts/0601/evidence/style-proof-committed-evidence-combined-audit-20260620.txt`.
- Added `getCommittedStyleProofEvidenceManifests()` and
  `getCommittedStyleProofEvidenceAuditReport()`.
- The combined helper clones committed local evidence plus committed WeChat PC evidence, while the
  audit report keeps local, WeChat PC, and combined views separate.
- The combined view intentionally exposes `style-proof-manifest-pack-fingerprint-mismatch` when
  local WebView/browser proof and PC paste proof for the same WeChat choice refer to different exact
  artifact fingerprints.
- The summary field `hasExactArtifactFingerprintConflicts` is true in that state, so consumers must
  treat the combined view as current-state accounting, not a complete single-artifact acceptance
  claim.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "committed local and WeChat PC evidence together" --reporter=default`
  at 1 file / 1 selected test.
- Full local verification also passed:
  committed evidence focused group 3 selected tests, `platform-export-rendering.test.ts`
  147 tests, four-file cross-platform export regression 186 tests, full `src/services/export`
  serial run 35 files / 1120 tests, targeted ESLint, `vue-tsc --noEmit`, and production build.
  Vite built in 30.70s, and generated `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local committed-evidence accounting only. It does not prove WeChat ordinary
  Ctrl+V for Kiln, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account
  upload, public-host availability, or publish success.

---

## 2026-06-20 135 SVG Editor Shell Residue Addendum

- Added `prompts/0601/evidence/135-svg-editor-shell-residue-contract-20260620.txt`.
- Used CloakBrowser only on the active 135 SVG editor free-trial page. No save, export, sync,
  upload, publish, screenshot capture, profile artifact, account artifact, template source, or
  material URL was recorded.
- After clicking a visible `免费试用` control, the center canvas/editor state exposed authoring shell
  families such as `content-canvas`, `content-background`, `content-inner`, `block`, `block-inner`,
  `block-img`, `block-img__inner`, `placeholder__help`, `placeholder__icon`,
  `article-item__inner`, `article-item__label`, and `article-item__del`.
- Added the dedicated runtime detector label `135 SVG editor shell residue` for shell-only markers
  such as `block-img__inner`, `placeholder__help/icon`, `article-item__inner/label/del`, and
  `articles_pop`.
- TDD first run failed because the shell-only fixture produced no market-editor residue issue. The
  focused regression then passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "135 SVG editor shell wrappers" --reporter=default`.
- Full local verification also passed: adjacent market-residue regression 7 selected tests,
  `platform-export-rendering.test.ts` 145 tests, four-file cross-platform export regression
  184 tests, full `src/services/export` serial run 35 files / 1118 tests, targeted ESLint,
  `vue-tsc --noEmit`, and production build. Vite built in 28.56s, and generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is 135 SVG editor authoring-shell learning and local detector enforcement only. It
  does not prove WeChat paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 135 Background-Only SVG Compatibility Fixture Addendum

- Added `prompts/0601/evidence/135-background-only-svg-compatibility-fixture-20260620.txt`.
- Added a minimal fixture for the previously observed 135 material-included/background-only SVG
  risk without vendor residue markers: no `_135editor`, no `app-content-canvas`, no known builder
  `data-name`, no trigger-overlay classes, and no hosted material URLs.
- The fixture keeps the compatibility-risk structure: `font-size:0`, `line-height:0`,
  `background-size:100.1% 100.1%`, `margin-top:-1px`, `vertical-align:top`,
  `pointer-events:none`, `svg viewBox="0 0 1080 1920"`, and `width="100%"`.
- Existing detectors already block it. WeChat emits `wechat-line-height-zero` and
  `wechat-layout-report-required`; Xiaohongshu emits `xhs-html-tags` and
  `xhs-wechat-decoration-leak`; Zhihu emits `zhihu-inline-svg`, `zhihu-html-tags`, and
  `zhihu-inline-style`.
- Full local verification passed: focused fixture regression, adjacent 8-test compatibility
  regression, `platform-export-rendering.test.ts` 146 tests, four-file cross-platform export
  regression 185 tests, full `src/services/export` serial run 35 files / 1119 tests, targeted
  ESLint, `vue-tsc --noEmit`, and production build. Vite built in 33.39s, and generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local compatibility-fixture coverage for existing safety gates only. It does
  not prove WeChat paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 Xiumi Component Binding Attribute Residue Addendum

- Added `prompts/0601/evidence/xiumi-component-binding-attribute-residue-20260620.txt`.
- Used CloakBrowser only on the active Xiumi v5 paper editor center state. No save, export, sync,
  upload, publish, screenshot capture, profile artifact, account artifact, template source, or
  material URL was recorded.
- The applied SVG-gallery/game-screen sample exposed `nodeCount=4736`, `imgCount=81`, center inline
  SVG `0`, `contenteditableCount=2`, and `inlineStyleCount=347`. High-volume component binding
  attributes included `tn-bind-comp-tpl-id`, `tn-comp-role`, `tn-comp`, `tn-comp-pose`, `tn-uuid`,
  `tn-animate`, `tn-animate-on-self`, `tn-cell-type`, `tn-child-position`,
  `tn-child-orientation`, `tn-page-stage-size`, `tn-page-cache-gatherer`, `tn-atom-context`,
  `tn-link`, and `tn-image-usage`.
- Added the dedicated runtime detector label `Xiumi component binding attribute residue` before the
  generic `Xiumi tn-* attribute` fallback.
- TDD first run failed because the detector only emitted generic `Xiumi tn-* attribute`. The
  focused regression then passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "Xiumi component binding attributes" --reporter=default`.
- Full local verification also passed: adjacent market-residue regression 9 selected tests,
  `platform-export-rendering.test.ts` 144 tests, four-file cross-platform export regression
  183 tests, full `src/services/export` serial run 35 files / 1117 tests, targeted ESLint,
  `vue-tsc --noEmit`, and production build. Vite built in 31.97s, and generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is Xiumi applied-authoring DOM learning and local detector enforcement only. It
  does not prove WeChat paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public-host availability, or publish success.
---

## 2026-06-20 Market Fallback Catalog Contract Addendum

This addendum records a local runtime catalog follow-up to the CloakBrowser Xiumi/135 SVG/H5 style
learning pass.

Implemented:
- Added `wechat-market-svg-h5-fallback-matrix` as a blocked WeChat fallback catalog choice for
  market SVG/H5 interaction families. It requires phone-preview and publish proof before it can be
  claimed or selected.
- Added `xhs-market-rich-card-fallback` as a blocked Xiaohongshu image-page/long-image fallback
  catalog choice for market-inspired rich cards and poster slices. It requires real artifact
  manifest and publish proof before selection.
- Added `zhihu-market-rich-layout-fallback` as a blocked Zhihu public-host image fallback catalog
  choice for market-inspired rich layouts. It requires public image host proof, alt/caption,
  manifest validation, and publish proof before selection.
- Added regression coverage so these choices remain blocked under default evidence, have no preset
  application mapping, retain platform market-residue detector blockers, and keep WeChat/XHS/Zhihu
  proof requirements isolated.

Boundary:
- This proves local catalog/proof-gate behavior only.
- It does not prove WeChat phone preview, mobile SMIL/click/tap/swipe/long-press, mobile Dark Mode,
  cover thumbnail acceptance, credentialed sync, scheduled send, public preview, XHS/Zhihu account
  upload, public-host acceptance, or publish success.

---

## 2026-06-20 Phone Preview Blocker Forbidden Contract Addendum

- Added `prompts/0601/evidence/style-proof-phone-blocker-forbidden-contract-20260620.txt`.
- `phonePreviewBlocked:true` is now blocker-only contract data and is forbidden on matching
  phone success rows for `phone-preview-readback`, `phone-screenshot`, `dark-mode-check`, and
  `cover-thumbnail-check`.
- The validator emits `style-proof-manifest-forbidden-field-present` for those contradictory rows,
  the acceptance audit keeps the requirements `invalid` and visible in `cannotClaim`, and the
  execution runbook names `phonePreviewBlocked:true` in success criteria and failure signals.
- TDD first run failed as expected before the contract update; the focused regression then passed
  with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "phone preview blocker flags forbidden" --reporter=default`.
- Full verification passed: `platform-export-rendering.test.ts` at 141 tests, 4-file
  cross-platform export regression at 180 tests, full export serial regression at 35 files /
  1114 tests, targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build. Vite built
  in 29.34s and `inkforge/tsconfig.tsbuildinfo` was restored.
- Boundary: this is local validator/audit/runbook enforcement only. It does not prove WeChat phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload,
  public-host availability, or publish success.

---

## 2026-06-20 External Account Blocker Forbidden Contract Addendum

- Added `prompts/0601/evidence/style-proof-external-account-blocker-forbidden-contract-20260620.txt`.
- `externalAccountLoginBlocked:true` is now blocker-only contract data and is forbidden on matching
  credentialed/publish success rows for `credentialed-channel-response`, `sync-readback`,
  `scheduled-send-readback`, and `published-url-or-platform-preview`.
- The validator emits `style-proof-manifest-forbidden-field-present` for those contradictory rows,
  the acceptance audit keeps the requirements `invalid` and visible in `cannotClaim`, and the
  execution runbook names `externalAccountLoginBlocked:true` in success criteria and failure
  signals.
- TDD first run failed as expected before the contract update; the focused regression then passed
  with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "external account blockers forbidden" --reporter=default`.
- Full local verification also passed:
  `platform-export-rendering.test.ts` 142 tests, four-file cross-platform export regression
  181 tests, full `src/services/export` serial run 35 files / 1115 tests, targeted ESLint,
  `vue-tsc --noEmit`, and production build. The generated `inkforge/tsconfig.tsbuildinfo`
  was restored afterward.
- Boundary: this is local validator/audit/runbook enforcement only. It does not prove credentialed
  sync, scheduled send, platform preview, public article rendering, public URL acceptance,
  XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 Xiumi SVG Gallery State Wrapper Residue Addendum

- Added `prompts/0601/evidence/xiumi-svg-gallery-state-wrapper-residue-20260620.txt`.
- Used CloakBrowser only on the active Xiumi v5 paper editor center state. No save, export, sync,
  upload, publish, screenshot capture, profile artifact, account artifact, template source, or
  material URL was recorded.
- The applied SVG-gallery/game-screen sample exposed `totalNodes=4736`, `tnComp=51`, `tnCell=27`,
  `tnLayerSlot=2`, `flowCanvas=3`, `imageWrappers=3`, `contenteditable=2`, `imgs=81`,
  `inlineStyle=347`, `dataOrNgAttrs=5572`, and center inline SVG `0`.
- Added the dedicated runtime detector label `Xiumi SVG gallery state wrapper residue` for
  `tn-image-inst-wrapper`, `tn-quick-input-*`, `tn-page-vessel`, `tn-group-sortable-box`,
  `tn-sortable-pin`, `tn-state-*`, `tn-on-*`, `tn-in-cell-state-active`, `tn-overflow-hidden`,
  and `tn-content-overlap`.
- TDD first run failed because the detector only emitted generic `Xiumi tn-*` labels. The focused
  regression then passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "Xiumi SVG gallery state wrappers" --reporter=default`.
- Full local verification also passed:
  focused market-residue regression 4 selected tests, `platform-export-rendering.test.ts`
  143 tests, four-file cross-platform export regression 182 tests, full `src/services/export`
  serial run 35 files / 1116 tests, targeted ESLint, `vue-tsc --noEmit`, and production build.
  Vite built in 30.80s, and generated `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is Xiumi applied-authoring DOM learning and local detector enforcement only. It
  does not prove WeChat paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 135 Ordinary Free Style Applied Readback Refresh Addendum

- Added `prompts/0601/evidence/135-ordinary-free-style-applied-readback-refresh-20260620.txt`.
- Used CloakBrowser only on the active 135 ordinary editor page. No save, export, sync, upload,
  preview, scheduled-send, publish, screenshot capture, browser profile artifact, account artifact,
  template source, material URL, cookie, token, HAR, or QR artifact was recorded.
- After focusing the central UEditor iframe body and clicking visible non-VIP style
  `#style-173703`, current readback confirmed `bodyChildren=6`, `bodyTextLen=2790`,
  `bodyHtmlLen=25148`, `nodes=186`, `sections=122`, `styleAttrs=131`, `dataTools=7`,
  `dataId=7`, `dataBrushType=18`, `svgs=5`, `images=12`, and `style173703=2`.
- This refresh confirms the existing applied-editor-element and no-copy boundary for 135 ordinary
  styles. Existing market-editor residue gates already cover the observed `_135editor`,
  `data-tools`, market `data-id`, and `data-brushtype` families, so no runtime detector change was
  required.
- Grok/Exa public-source refreshes corroborated 135/Xiumi SVG/H5 taxonomy only. Public pages do not
  prove InkForge platform paste, phone preview, sync, upload, scheduled-send, or publish success.
- Verification passed: focused `market editor residue` regression 1 selected test and
  `git diff --check` on this slice's docs/evidence files.
- Boundary: this is 135 ordinary editor applied-authoring DOM learning only. It does not prove
  WeChat ordinary Ctrl+V rich HTML/SVG paste, phone preview, mobile SMIL/click, mobile Dark Mode,
  cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public article
  rendering, XHS/Zhihu account upload, public-host availability, or publish success.

---

## 2026-06-20 ExportModal Committed Release Gate Preflight Addendum

- Added `prompts/0601/evidence/exportmodal-release-gate-preflight-20260620.txt`.
- ExportModal now reads `getCommittedStyleProofEvidenceReleaseGateReport()` and surfaces the
  committed-evidence release gate in the existing style capability/preflight UI.
- The style summary and dedicated preflight row expose `canClaimComplete=false`, blocker count, and
  the committed local-vs-PC evidence conflict count; the 2026-06-21 Amber reconciliation refreshed
  that then-current count to `fingerprintConflicts 1`, and the later Tempera reconciliation
  refreshes the current count to 0. The preflight row remains `preflight-blocked`.
- CloakBrowser local DOM/visual verification opened the real ExportModal from the existing local
  article "未命名文章" and confirmed a nonblank panel, `preflight-blocked` release row, and no
  horizontal overflow at a 1400x900 viewport.
- Verification passed:
  `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue --ext .ts,.vue --quiet`;
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`;
  `node --check inkforge/tests/e2e/specs/svg-render.spec.cjs`;
  `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build` (Vite built in 24.34s).
- Boundary: this is local UI/readout proof only. It does not prove phone preview, mobile
  interaction, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, platform
  preview, public article rendering, XHS/Zhihu account upload, public-host acceptance, or publish
  success.

---

## 2026-06-20 Release Gate Operator Actions Addendum

- Added `prompts/0601/evidence/release-gate-operator-actions-20260620.txt`.
- `CommittedStyleProofReleaseGateBlocker` now exposes `nextOperatorActions` derived from existing
  execution-runbook open steps.
- The local-conflict blocker now gives a committed-manifest reconciliation action; phone,
  external-dependency, unsafe-to-automate, and mutating-platform blockers prioritize the relevant
  phone-preview, public-host / credentialed-channel, or platform-publish proof action.
- ExportModal now includes a short `operatorNext` summary in the committed-proof-release preflight
  row while keeping `canClaimComplete=false`.
- Focused verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "blocks committed evidence release claims" --reporter=default`.
- Full local verification also passed: `platform-export-rendering.test.ts` 150 tests, four-file
  cross-platform export regression 189 tests, full `src/services/export` serial run 35 files /
  1123 tests, targeted ESLint, `vue-tsc --noEmit`, e2e CJS syntax check, and production build
  (Vite built in 25.23s). `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- CloakBrowser local visual/DOM verification confirmed the committed-proof-release row is
  `preflight-blocked`, contains `operatorNext`, contains the local-conflict reconciliation and
  phone-preview actions, and has no horizontal overflow at 1400x900 or 390x844. Screenshots were
  used only for local visual inspection and were not committed as evidence.
- Boundary: this is local operator guidance and UI readout only. It does not prove WeChat paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  platform preview, public article rendering, XHS/Zhihu account upload, public-host acceptance, or
  publish success.

---

## 2026-06-20 Style Proof External Freshness Contract Addendum

- Added `prompts/0601/evidence/style-proof-external-freshness-contract-20260620.txt`.
- Added `StyleProofArtifact.collectedAt` and a 14-day default freshness window for external proof
  rows.
- `collectedAt` is required on matching proof rows for market-editor, authenticated PC editor,
  phone-preview, credentialed-channel, platform-publish, and public-host gates. Local-only unit,
  browser, exact-artifact, artifact-manifest, and sensitive-hygiene rows remain timestamp-free.
- Missing timestamps, future/unparseable timestamps, and stale timestamps now emit
  `style-proof-manifest-collected-at-missing`, `style-proof-manifest-collected-at-invalid`, or
  `style-proof-manifest-proof-stale`; these issue ids are acceptance-invalid and keep requirements
  in `cannotClaim`.
- Committed WeChat PC proof manifests now record their real evidence dates instead of auto-renewing
  during local tests.
- Verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  with 151 tests; four-file cross-platform export regression with 190 tests; full
  `src/services/export` serial regression with 35 files / 1124 tests; targeted ESLint;
  `vue-tsc --noEmit`; and production build (Vite built in 31.07s). The generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local proof freshness enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview,
  XHS/Zhihu upload, public-host acceptance, or publish success.

---

## 2026-06-21 Style Proof Runbook Freshness Guidance Addendum

- Added `prompts/0601/evidence/style-proof-runbook-freshness-guidance-20260621.txt`.
- Execution runbook steps now expose `requiresFreshCollectedAt`, `freshnessMaxDays`, and
  `freshnessIssueIds` so UI/report consumers can display timestamp requirements without
  reimplementing validator logic.
- Missing, future/unparseable, and stale `collectedAt` issue ids now produce specialized
  `cannotClaimReason` messages and `nextOperatorAction` recapture guidance.
- Success criteria and failure signals now name the active 14-day freshness window for external
  proof rows, while local-only rows such as `exact-artifact` remain timestamp-free.
- Verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  with 151 tests; four-file cross-platform export regression with 190 tests; full
  `src/services/export` serial regression with 35 files / 1124 tests; targeted ESLint;
  `vue-tsc --noEmit`; and production build (Vite built in 1m 8s). The generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local runbook/operator guidance only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview,
  XHS/Zhihu upload, public-host acceptance, or publish success.

---

## 2026-06-21 135 SVG Free Trial CloakBrowser Recheck Addendum

- Added `prompts/0601/evidence/135-svg-free-trial-cloakbrowser-recheck-20260621.txt`.
- CloakBrowser opened the live 135 SVG editor, clicked a visible `免费试用` SVG effect, and read
  the center editor DOM after mutation.
- The post-click DOM contained duplicated `content-canvas` / `content-inner` /
  `content-background` containers, ten `block-img__inner` image-slot shells, ten
  `placeholder__help` helpers, spacing/gap controls, slider handles, and trigger switches.
- No code change was needed because existing residue rules and tests already cover the observed
  135 SVG authoring markers.
- Focused verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "135 SVG" --reporter=default`
  with 5 selected tests.
- Boundary: this is market-editor DOM learning only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview,
  XHS/Zhihu upload, public-host acceptance, or publish success.

---

## 2026-06-21 Xiumi SVG Recovery Modal Blocker Addendum

- Added `prompts/0601/evidence/xiumi-svg-recheck-recovery-modal-blocker-20260621.txt`.
- CloakBrowser opened the live Xiumi v5 paper editor, selected the SVG category, and read the
  center `.tn-editing-panel` state.
- The SVG category exposed families such as basic SVG, image carousel, click-expand, path
  animation, slide trigger, click switch, page flip, zoom, long-press switch, area trigger, and
  click + auto.
- A recovery confirmation dialog asked whether to restore a previous unsaved draft. I did not click
  either choice because that would mutate account/editor state.
- No Xiumi applied proof was claimed from this run. The result is a blocked market-editor DOM
  recheck, not a `market-applied-dom-readback` proof row.
- Boundary: this does not prove WeChat paste, phone preview, mobile interaction, Dark Mode, cover
  thumbnail, sync, scheduled send, public preview, XHS/Zhihu upload, public-host acceptance, or
  publish success.

---

## 2026-06-21 Style Proof Current Release/Runbook Audit Addendum

- Added `prompts/0601/evidence/style-proof-current-release-runbook-audit-20260621.txt`.
- The local API readout of `getCommittedStyleProofEvidenceReleaseGateReport()` returned
  `status=blocked-by-local-conflict`, `canClaimComplete=false`, and `blockerCount=5`.
- Current committed evidence summary: 4 local manifests, 2 WeChat PC manifests, 6 combined
  manifests, 14 combined issues, exact-artifact fingerprint conflicts, 35 cannot-claim steps, 4
  phone-open steps, 15 external-dependency-open steps, 14 unsafe-to-automate steps, and 14
  mutating-open steps.
- Current combined execution runbook summary: 35 total steps, 35 open steps, 35 cannot-claim
  steps, 16 safe-to-automate open local rows, 15 external-dependency-open rows, 4 phone-open rows,
  14 unsafe-to-automate rows, and 14 mutating rows.
- Platform isolation remained visible in the report: WeChat 17 open steps, Xiaohongshu 8 open
  steps, and Zhihu 10 open steps.
- No runtime code change was needed. The existing release gate already exposes local-conflict,
  phone-preview, external-dependency, unsafe-to-automate, and mutating-platform blockers with next
  operator actions.
- Verification passed: local API assertion for `status=blocked-by-local-conflict`,
  `canClaimComplete=false`, `blockerCount=5`, and `cannotClaimSteps=35`; focused committed-evidence
  regression 2 selected tests; `git diff --check` on this docs/evidence slice with only Windows
  CRLF conversion warnings.
- Boundary: this is local committed-evidence accounting only. It does not prove WeChat paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public
  preview, XHS/Zhihu upload, public-host acceptance, or publish success.

---

## 2026-06-21 WeChat MP Login State Blocker Addendum

- Added `prompts/0601/evidence/wechat-mp-login-state-blocker-20260621.txt`.
- CloakBrowser opened the WeChat Official Account Platform entry page and confirmed page title
  `微信公众平台`.
- The visible state was a public login page with a WeChat scan-login panel, not an authenticated
  article editor, editor iframe, preview dialog, draft list, material manager, or publishing
  control surface.
- No QR image, browser runtime artifact, account identifier, credential material, request payload,
  or raw platform response was committed.
- The next WeChat proof attempt still requires a human operator to complete the official login flow
  in the visible browser before collecting redacted authenticated editor/draft readback.
- Verification passed: CloakBrowser status/title check, `git diff --check` with only Windows CRLF
  conversion warnings, sensitive scan with no matches, and GitNexus `detect_changes` low risk with
  0 affected processes.
- Boundary: this is a login-state blocker only. It does not prove WeChat paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview, public
  article rendering, or publish success.

---

## 2026-06-21 Local Full Validation Sweep Addendum

- Added `prompts/0601/evidence/local-full-validation-sweep-20260621.txt`.
- Serial full Vitest passed:
  `pnpm -C inkforge exec vitest run --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed 87 test files and 1464 tests in 45.28s.
- Type check passed:
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`.
- Production build passed:
  `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`; Vite transformed 4652 modules
  and built in 46.89s.
- Restored the build-generated `inkforge/tsconfig.tsbuildinfo` file after verification.
- Restored fidelity output files regenerated by the full test run before staging.
- Non-failing warnings were limited to intentional boundary paths: KaTeX quirks-mode output,
  oversize HTML threshold warnings, IndexedDB/audit fallback failures, keychain-unavailable paths,
  and no-provider sync paths.
- Boundary: this is local validation only. It does not prove WeChat paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview, public article
  rendering, XHS/Zhihu upload, public-host acceptance, or publish success.

---

## 2026-06-21 Style Acceptance ExportModal E2E Refresh Addendum

- Added `prompts/0601/evidence/style-acceptance-exportmodal-e2e-refresh-20260621.txt`.
- Initial `pnpm -C inkforge test:e2e` failed because `svg-render.spec.cjs` still expected stale
  style catalog counts. Real ExportModal reported WeChat `8/17`, not `8/16`.
- Confirmed current catalog counts through `getPlatformStyleChoices()`:
  WeChat 17 total / 8 available / 5 blocked / 4 unavailable; Xiaohongshu 8 total / 4 available /
  3 blocked / 1 unavailable; Zhihu 8 total / 4 available / 3 blocked / 1 unavailable.
- Updated `inkforge/tests/e2e/specs/svg-render.spec.cjs` to assert those current counts and to
  verify market fallback choices remain blocked until real fallback/public-host proof exists.
- Verification passed:
  `node --check inkforge/tests/e2e/specs/svg-render.spec.cjs`;
  targeted `svg-render.spec.cjs` WDIO run with 1 spec / 6 tests; full `pnpm -C inkforge test:e2e`
  with 2 specs / 17 tests.
- Boundary: this is local Tauri/WebView2 e2e proof only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview,
  public article rendering, XHS/Zhihu upload, public-host acceptance, or publish success.

---

## 2026-06-21 Market Editor SVG Pipeline Residue Refresh Addendum

- Added `prompts/0601/evidence/market-editor-cloakbrowser-svg-pipeline-residue-refresh-20260621.txt`.
- Used CloakBrowser only. Opened the live 135 SVG editor, clicked a visible `免费试用` effect, and
  read the center `.editor-content` DOM without save, export, sync, upload, publish, screenshot
  capture, HAR, credential entry, account artifact, or browser profile artifact.
- 135 observation: material-included background SVG layers exposed zero-gap section wrappers and
  a 135-specific inline style marker `svg:135` alongside `background-attachment`,
  `background-position`, `background-repeat`, `background-size:100.1% 100.1%`,
  `margin-top:-1px`, `pointer-events:none`, `user-select:none`, `vertical-align:top`, and
  `width:100%`.
- Used CloakBrowser only on Xiumi v5 paper editor, cancelled the unsaved-draft recovery prompt,
  and read taxonomy/export/animation/template DOM without mutating account/editor state.
- Xiumi observation: the template list and hidden controls exposed renderer pipeline markers
  `tplLib.onTemplateClicked`, `tpl2BoxClasses`, `tpl2PresentType`, `tn-tpl-pose-fit-box`,
  `renderer_accelerate`, and `validateImageTypeInHtml`.
- Added detector labels `135 SVG background style marker` and
  `Xiumi template renderer pipeline residue`, both routed through existing
  WeChat/XHS/Zhihu market-editor-residue issues.
- Verification passed:
  focused TDD pair at 1 file / 2 selected tests, and adjacent market/135/Xiumi regression at
  1 file / 18 selected tests.
- Boundary: this is market-editor DOM learning and local detector enforcement only. It does not
  prove WeChat paste, phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled send, public preview, public article rendering, XHS/Zhihu upload, public-host
  acceptance, or publish success.

---

## 2026-06-21 Style Proof Amber Reconciliation Addendum

- Added `prompts/0601/evidence/style-proof-amber-reconciliation-20260621.txt`.
- Reconciled `wechat-flagship-amber` with the later 2026-06-18 CloakBrowser-only ordinary OS
  Ctrl+V exact proof. The raw `flagship-amber.html` SHA is
  `09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d`.
- Runtime catalog now marks Amber `available` for the `pc-editor-paste` evidence floor, while
  mobile preview, Dark Mode, cover thumbnail, platform preview, sync, scheduled send, and publish
  proof remain unproven.
- Default ExportModal availability still reports WeChat `8/17` because the UI's default evidence is
  `local-browser`; Amber is no longer catalog-hard-blocked, but it is not selectable there until
  `pc-editor-paste` evidence is present.
- The committed local Amber manifest now uses the same exact raw HTML artifact fingerprint as the
  PC proof. At this Amber-only checkpoint, Tempera still had a local-vs-PC fingerprint split
  because its PC proof covers the entity-safe clipboard payload, not the raw source HTML artifact.
- The later `style-proof-tempera-fingerprint-reconciliation-20260621.txt` slice reconciles Tempera
  to the entity-safe WeChat clipboard artifact fingerprint, so the current committed pack has no
  `fingerprintConflicts`.
- Verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "committed.*evidence|release claims" --reporter=default`
  passed 1 file / 5 selected tests; full `platform-export-rendering.test.ts` passed 153 tests;
  4-file cross-platform export regression passed 192 tests; full export serial suite passed 35
  files / 1126 tests; targeted TS/Vue ESLint passed; `node --check` passed; targeted
  `svg-render.spec.cjs` WDIO passed 1 spec / 6 tests; `vue-tsc` passed; production build passed
  with 4652 transformed modules; full `pnpm -C inkforge test:e2e` passed 2 specs / 17 tests.
- Boundary: this is local catalog/evidence accounting only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, platform preview, public
  article rendering, XHS/Zhihu account upload, public-host acceptance, or publish success.

---

## 2026-06-21 WeChat Session Timeout Read-Only Recheck Addendum

- Added `prompts/0601/evidence/wechat-session-timeout-readonly-recheck-20260621.txt`.
- CloakBrowser opened the WeChat backend home route and the visible page reported
  `登录超时，请重新登录`.
- The DOM readback found zero contenteditable/`.ProseMirror` nodes, zero iframes, and zero editor
  candidates for `#js_editor`, `#js_appmsg_editor`, `#ueditor_0`, `.edui-editor`,
  `.ProseMirror`, `.rich_media_content`, or `[data-action]`.
- Verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "login or expired-session|session and editor DOM issue ids" --reporter=default`
  passed 1 file / 2 selected tests.
- GitNexus impact for `validateStyleProofManifest` was LOW with 6 impacted items and one affected
  process (`progressChoices`).
- Boundary: this is current external session-state blocker evidence only. It does not prove
  authenticated editor URL, PC editor DOM, PC paste, phone preview, mobile interaction, Dark Mode,
  cover thumbnail, sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public-host acceptance, or publish success.

---

## 2026-06-21 Style Proof Current Release Gate Refresh Addendum

- Added `prompts/0601/evidence/style-proof-current-release-gate-refresh-20260621.txt`.
- Re-ran the local release/runbook/acceptance API readout after Amber reconciliation, the
  WeChat session-timeout recheck, Tempera fingerprint reconciliation, and Zhihu data-table local
  evidence.
- Release gate remains blocked:
  `status=blocked-by-local-conflict`, `canClaimComplete=false`, `blockerCount=5`,
  `localManifestCount=5`, `combinedManifestCount=7`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, `cannotClaimSteps=34`, `phoneOpenSteps=4`,
  `externalDependencyOpenSteps=14`, `unsafeToAutomateOpenSteps=13`, and
  `mutatingOpenSteps=13`.
- Amber and Tempera are no longer in release gate `fingerprintConflicts`; no current
  exact-artifact fingerprint conflict remains in the committed pack.
- Current combined runbook platform summary:
  WeChat 17 total / 1 completed / 16 open steps; Xiaohongshu 8 total / 0 completed / 8 open steps;
  Zhihu 10 total / 0 completed / 10 open steps.
- Boundary: this is local committed-evidence accounting only. It does not prove WeChat paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled
  send, platform preview, public article rendering, XHS/Zhihu upload, public-host acceptance, or
  publish success.

---

## 2026-06-21 Style Proof Tempera Fingerprint Reconciliation Addendum

- Added `prompts/0601/evidence/style-proof-tempera-fingerprint-reconciliation-20260621.txt`.
- Updated the committed local `wechat-flagship-tempera` manifest fingerprint to the proven
  entity-safe WeChat clipboard artifact SHA
  `f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`.
- Kept the local Tauri/WebView screenshot as `artifactRef`; the fingerprint now names the
  effective WeChat clipboard payload that passed ordinary OS Ctrl+V without mojibake.
- At the Tempera checkpoint the release gate remained blocked and unclaimable with
  `hasExactArtifactFingerprintConflicts=false`, `combinedIssueCount=11`, and
  `cannotClaimSteps=34`. The later Zhihu data-table local evidence slice refreshes the current
  committed count to `combinedIssueCount=13`.
- Follow-up fixed the stale local-conflict `operatorNext` action. When no
  `style-proof-manifest-pack-fingerprint-mismatch` issue remains, the release preflight now asks
  operators to complete the remaining committed proof rows; manifest reconciliation is only shown
  for actual fingerprint conflicts.
- Verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "committed.*evidence|release claims" --reporter=default`
  passed 1 file / 5 selected tests; full `platform-export-rendering.test.ts` passed 153 tests;
  4-file cross-platform export regression passed 192 tests; full export serial suite passed 35
  files / 1126 tests; targeted ESLint passed; `vue-tsc` passed; production build passed with 4652
  transformed modules; runtime API readout confirmed the updated release summary; follow-up
  `node --check`, targeted `svg-render.spec.cjs` WDIO, and full `pnpm -C inkforge test:e2e` passed
  after the rebuilt ExportModal showed `fingerprintConflicts 0` and the remaining-proof
  `operatorNext` copy.
- Boundary: this is local catalog/evidence accounting only. It does not prove raw UTF-8 Tempera
  direct paste, WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu upload, public-host
  acceptance, or publish success.

---

## 2026-06-21 WeChat Session Timeout Post-Reboot Recheck Addendum

- Added `prompts/0601/evidence/wechat-session-timeout-post-reboot-recheck-20260621.txt`.
- Used CloakBrowser only after the local reboot. The WeChat backend home route still returned
  title `公众号` with visible relogin text beginning `请重新登录`.
- DOM readback found zero authenticated editor candidates for `#js_editor`, `#js_appmsg_editor`,
  `#ueditor_0`, `.edui-editor`, `.ProseMirror`, `.rich_media_content`,
  `[contenteditable="true"]`, `iframe`, or `[data-action]`.
- No login attempt, credential entry, QR capture, draft creation, paste, save, preview, sync,
  upload, scheduled send, publish, screenshot capture, HAR capture, account artifact, browser
  runtime artifact, or raw platform response was recorded.
- Boundary: this is external session-state blocker evidence only. It does not prove authenticated
  editor access, WeChat paste, phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu upload, public-host
  acceptance, or publish success.

---

## 2026-06-21 Zhihu Data Table Local Evidence Addendum

- Added `prompts/0601/evidence/zhihu-data-table-local-artifact-20260621.md` and
  `prompts/0601/evidence/zhihu-data-table-local-evidence-20260621.txt`.
- Generated the exact source-owned clean Markdown table artifact through the real local
  `markdownToZhihuClean(..., { tableHandling:'preserve', codeLangCoerce:true })` path. The output
  has hash `sha256:9e828ff7b50d642be8f59f4907dc5cd47fc9973f465e904446a21f6e79bccd8f` and no
  pipeline issues.
- Verified the local `zhihu-tech` preview fidelity path with `renderZhihuMockHtml(...)`: one
  table, no inline SVG, no `data-ink-svg`, and a `#zhihu-answer` container.
- Added one committed local `zhihu-data-table` manifest. It satisfies only local
  `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`, and `no-sensitive-artifact`
  rows for the exact clean Markdown artifact.
- Kept `zhihu-artifact-manifest`, `public-image-host`, credentialed sync, scheduled send,
  platform preview, public article rendering, and publish rows missing or unclaimable.
- Current committed release-gate readout is now `localManifestCount=5`,
  `combinedManifestCount=7`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: focused committed/local/release runbook regression with 4 selected tests,
  full `platform-export-rendering.test.ts` with 153 tests, 4-file cross-platform export regression
  with 192 tests, full export serial suite with 35 files / 1126 tests, targeted ESLint,
  `vue-tsc`, and production build with 4652 transformed modules in 37.77s. Follow-up WDIO passed:
  targeted `svg-render.spec.cjs` with 1 spec / 6 tests, then full `pnpm -C inkforge test:e2e`
  with 2 specs / 17 tests covering the SVG/export gate and base visual checks.
- Boundary: this is local clean Markdown/table artifact accounting only. It does not prove Zhihu
  public image-host acceptance, account upload, editor preview, sync, scheduled send, platform
  preview, public article rendering, or publish success.

---

## 2026-06-21 XHS Cover Hook Local Evidence Addendum

- Added `prompts/0601/evidence/xhs-cover-hook-local-evidence-20260621.txt`.
- Added the exact local raster artifact
  `prompts/0601/evidence/xhs-raster/xhs-raster-cover-hook-browser-2026-06-21.png` and metadata
  `prompts/0601/evidence/xhs-raster/xhs-raster-cover-hook-browser-2026-06-21.json`.
- Generated the PNG through CloakBrowser against the local Vite app using the source-owned
  `cover-title` SVG module and `renderXhsPosterCard(..., '3:4', '#fff7ed')`; no Playwright or
  external platform action was used.
- Visual QA caught subtitle truncation in the first two variants; the committed PNG uses
  `InkForge 本地验证` and has no ellipsis/truncation.
- Final PNG dimensions are 1080 x 1440, bytes 92316, hash
  `sha256:c7200947079cda16ccafc51b5c56bfd840355da199da48b790b6725233af2d32`.
- `validateXhsImageArtifactManifest()` returned `issues=[]` for the exact one-page image manifest.
- Added one committed local `xhs-cover-hook` manifest. It satisfies only local
  `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`, `xhs-artifact-manifest`, and
  `no-sensitive-artifact` rows.
- Current committed release-gate readout is now `localManifestCount=6`,
  `combinedManifestCount=8`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: focused committed/local/release runbook regression with 4 selected tests,
  full `platform-export-rendering.test.ts` with 153 tests, 4-file cross-platform export regression
  with 192 tests, full export serial suite with 35 files / 1126 tests, targeted ESLint,
  `vue-tsc`, and production build with 4652 transformed modules in 30.25s.
- Boundary: this is local XHS raster/image-manifest accounting only. It does not prove
  Xiaohongshu account upload, mobile/platform preview, public URL acceptance, scheduled send,
  public article rendering, or publish success.

---

## 2026-06-21 XHS Clean Text Local Evidence Addendum

- Added `prompts/0601/evidence/xhs-clean-text-local-artifact-20260621.txt` and
  `prompts/0601/evidence/xhs-clean-text-local-evidence-20260621.txt`.
- Generated the text artifact through the real local
  `markdownToXiaohongshuText(...)` path with source-owned Markdown content, `emojiStyle:'fresh'`,
  `titleSplit:true`, and `hashtagInBody:true`.
- Persisted artifact hash is
  `sha256:e590d621cb09f988c76f76c7b4db87295bce7765bdd8300479dac2d80c4d4e68`; persisted bytes are
  531, exporter char count is 203, paragraph count is 7, and `overLimit=false`.
- Local hygiene check found no HTML tags and no Markdown control syntax after expected XHS hashtag
  markers were removed.
- Added one committed local `xhs-clean-text` manifest through a dedicated plain-text helper. It
  satisfies only `unit-test-coverage`, `exact-artifact`, and `no-sensitive-artifact`.
- Kept `scheduled-send-readback`, platform preview, public URL, and publish rows missing or
  unclaimable. The manifest does not claim `local-browser-rendering` or `xhs-artifact-manifest`.
- Current committed release-gate readout is now `localManifestCount=7`,
  `combinedManifestCount=9`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: focused committed/local/release runbook regression with 4 selected tests,
  full `platform-export-rendering.test.ts` with 153 tests, 4-file cross-platform export regression
  with 192 tests, full export serial suite with 35 files / 1126 tests, targeted ESLint,
  `vue-tsc`, and production build with 4652 transformed modules in 27.21s.
- Boundary: this is local XHS clean-text export and exact-artifact accounting only. It does not
  prove Xiaohongshu account upload, mobile/platform preview, public URL acceptance, scheduled send,
  public article rendering, or publish success.

---

## 2026-06-21 Zhihu Clean Column Local Evidence Addendum

- Added `prompts/0601/evidence/zhihu-clean-column-local-artifact-20260621.md` and
  `prompts/0601/evidence/zhihu-clean-column-local-evidence-20260621.txt`.
- Generated the Markdown artifact through the real local
  `markdownToZhihuClean(..., { tableHandling:'preserve', codeLangCoerce:true })` path with
  source-owned Markdown content.
- Persisted artifact hash is
  `sha256:eccc28007327ade6c6b05fd37567dd31632b9daada68b28aa7146afe8b64b329`; persisted bytes are
  563, exporter Markdown char count before the final file newline is 248, and pipeline
  `issues=[]`.
- Local hygiene check found no HTML tags, inline SVG, `data-ink-svg`, or `foreignObject`.
- Added one committed local `zhihu-clean-column` manifest through a dedicated clean Markdown
  helper. It satisfies only `unit-test-coverage`, `exact-artifact`, and
  `no-sensitive-artifact`.
- Kept `scheduled-send-readback`, platform preview, public article rendering, and publish rows
  missing or unclaimable. The manifest does not claim `local-browser-rendering`,
  `public-image-host`, or `zhihu-artifact-manifest`.
- Current committed release-gate readout is now `localManifestCount=8`,
  `combinedManifestCount=10`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: focused committed/local/release runbook regression with 4 selected tests,
  full `platform-export-rendering.test.ts` with 153 tests, 4-file cross-platform export regression
  with 192 tests, full export serial suite with 35 files / 1126 tests, targeted ESLint,
  `vue-tsc`, and production build with 4652 transformed modules in 27.68s.
- Boundary: this is local Zhihu clean Markdown export and exact-artifact accounting only. It does
  not prove Zhihu public image-host acceptance, account upload, editor preview, sync, scheduled
  send, platform preview, public article rendering, or publish success.

---

## 2026-06-21 XHS Markdown Card Slicer Local Evidence Addendum

- Added source-owned XHS Markdown card slicer APIs:
  `sliceMarkdownToXhsCards()`, `renderXhsMarkdownCardSliceSvg()`, and
  `createXhsMarkdownCardSliceManifestInputs()`.
- Exported the slicer through `svg-modules/index.ts` and `services/export/index.ts`, so future
  UI/export integration can consume the same runtime code used by the evidence path.
- Generated the committed raster pack with CloakBrowser against the local Vite app, importing
  `/src/services/export/svg-modules/index.ts` and running:
  `sliceMarkdownToXhsCards` -> `renderXhsMarkdownCardSliceSvg` -> `renderXhsPosterCard`.
- Added four 1080 x 1440 PNG pages under `prompts/0601/evidence/xhs-raster/`:
  cover, section, section, and code cards. JSON metadata pack:
  `xhs-markdown-card-slicer-browser-2026-06-21.json`.
- Visual QA caught awkward short-line wrapping and code-string breaks in the first generated
  variant. The slicer line wrapping was adjusted, then the PNG pack was regenerated and checked
  again.
- JSON pack hash:
  `sha256:e3716eb5903b1b11a167b467c3c2aae4c6eff793ef5e0c29b39ddeb3b0da375c`.
- Page hashes:
  page 01 `sha256:a0fd32a89ce85c0b520052b8b4ed034481ef2599d10a0ccb9ffee8639a647965`;
  page 02 `sha256:3acf196a8aa512ad4664e28842fbfd99092d50baaeed5dab187499fe5a8d28fe`;
  page 03 `sha256:26ec2555f23dfd73400763813f9d929b6cf5299b8b4a9c5ba53c3ef6c74cea05`;
  page 04 `sha256:0bb2f4bb8348bc11264c1036e005185475b8cd5efca9be83e6b36ecd37d5798d`.
- Independent Node evidence verification re-reads the committed JSON/PNG evidence pack,
  recomputes every PNG hash, checks byte lengths, rebuilds a `XhsImageArtifactManifest`, and
  verifies `validateXhsImageArtifactManifest() === []`. The Vitest coverage stays focused on
  parser, SVG render safety, and manifest-input generation without adding Node globals to the
  browser-targeted TS config.
- Added one committed local `xhs-markdown-card-slicer` manifest. It satisfies only local
  `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`, `xhs-artifact-manifest`, and
  `no-sensitive-artifact` rows.
- CloakBrowser release-gate readout from the local Vite runtime:
  `canClaimComplete=false`, `status=blocked-by-local-conflict`, `localManifestCount=9`,
  `wechatPcManifestCount=2`, `combinedManifestCount=11`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, `cannotClaimSteps=34`, `phoneOpenSteps=4`,
  `externalDependencyOpenSteps=14`, `unsafeToAutomateOpenSteps=13`, `mutatingOpenSteps=13`,
  and `blockerCount=5`.
- Verification passed: `xhs-card-slicer.test.ts` with 1 file / 4 tests, independent JSON/PNG
  evidence-pack hash verification, `vue-tsc`, `svg-modules` at 15 files / 386 tests,
  `platform-export-rendering.test.ts` at 1 file / 153 tests, 4-file cross-platform export
  regression at 4 files / 192 tests, full `src/services/export` serial regression at
  36 files / 1130 tests, targeted ESLint, and production build.
- Boundary: this is local Markdown-to-card slicing, browser-canvas raster, image-manifest,
  exact-artifact, and sensitive-hygiene accounting only. It does not prove Xiaohongshu account
  upload, mobile/platform preview, public URL acceptance, scheduled send, public article
  rendering, or publish success.

---

## 2026-06-21 Zhihu Available Clean Markdown Local Evidence Addendum

- Added `prompts/0601/evidence/zhihu-academic-latex-local-artifact-20260621.md` and
  `prompts/0601/evidence/zhihu-academic-latex-local-evidence-20260621.txt`.
- Added `prompts/0601/evidence/zhihu-wechat-adapted-local-artifact-20260621.md` and
  `prompts/0601/evidence/zhihu-wechat-adapted-local-evidence-20260621.txt`.
- Generated both exact artifacts through the real local `markdownToZhihuClean()` path.
  `zhihu-academic-latex-column` covers block/inline LaTeX equation image Markdown, a footnote,
  a quote, and a typed code fence. `zhihu-wechat-adapted` proves WeChat-style `section`,
  inline SVG, `data-ink-block`, `style`, `class`, and `span` residue is stripped to readable
  Markdown/text.
- Academic artifact hash:
  `sha256:0bed075e0f24a94f4ecb0a9bf410e42f5de6caaff560347e6b016757916a7ff9`; persisted bytes:
  815.
- WeChat-adapted artifact hash:
  `sha256:5aaf2834bcd50e8251b2d8e99deb72c550826909598dc17e3f80ec7ac3efba63`; persisted bytes:
  372.
- Added two committed local Zhihu manifests. They satisfy only `unit-test-coverage`,
  `exact-artifact`, and `no-sensitive-artifact`; `public-image-host`,
  `zhihu-artifact-manifest`, scheduled-send, platform preview, public article rendering, and
  publish rows remain missing or unclaimable.
- Current committed release-gate readout is now `localManifestCount=11`,
  `wechatPcManifestCount=2`, `combinedManifestCount=13`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: focused committed/local/release regression with 1 file / 6 selected tests,
  `platform-export-rendering.test.ts` with 1 file / 155 tests, 4-file cross-platform export
  regression with 4 files / 194 tests, full `src/services/export` serial regression with
  36 files / 1132 tests, targeted ESLint, `vue-tsc`, and production build with 4653 transformed
  modules.
- Boundary: this is local Zhihu clean Markdown export and exact-artifact accounting only. It does
  not prove Zhihu formula preview acceptance, public image-host acceptance,
  artifact-manifest acceptance, account upload, editor preview, sync, scheduled send, platform
  preview, public article rendering, or publish success.

---

## 2026-06-21 XHS Data Card Local Raster Evidence Addendum

- Added `prompts/0601/evidence/xhs-data-card-local-evidence-20260621.txt`.
- Added the committed raster pack:
  `prompts/0601/evidence/xhs-raster/xhs-data-card-browser-2026-06-21.json` and
  pages 01-03 PNG under the same directory.
- Generated the final pack through CloakBrowser against the local Vite app, importing
  `/src/services/export/svg-modules/index.ts` and running:
  `sliceMarkdownToXhsCards` -> `renderXhsMarkdownCardSliceSvg` -> `renderXhsPosterCard`.
- Visual QA rejected two earlier variants because of Markdown table slash wrapping, overflow
  warnings, mixed English term splits, and percentage line breaks. The committed pack uses short
  Chinese metric rows and has no overflow warning, blank page, crop, or overlap.
- JSON pack hash:
  `sha256:bb78392d7b217251509eff0a9295ff3d601303747dd4eaa772e1b871c60bdc1a`.
- Page hashes:
  page 01 `sha256:00fb3bd22433e7a65bc630bb0f39d44acfbef11da7bf873182939ec15002577f`;
  page 02 `sha256:0fdcefa6f1fcd285c2cb8f16f580b994ae689d7db7e19794b1e70bc2ab3c9e48`;
  page 03 `sha256:7ced2189801b60ee22a279874b65b8f64167661c081a1c3712119daaef433a67`.
- Browser-side `validateXhsImageArtifactManifest()` returned `issues=[]`; independent Node
  verification re-read committed JSON/PNG files, recomputed hashes, checked bytes, and confirmed
  1080 x 1440 dimensions.
- Added one committed local `xhs-data-card` manifest. Because the catalog choice still remains
  `blocked`, progress gates remain invalid and include `style-proof-manifest-choice-blocked`;
  the evidence does not make `xhs-data-card` publishable.
- Current committed release-gate readout is now `localManifestCount=12`,
  `wechatPcManifestCount=2`, `combinedManifestCount=14`, `combinedIssueCount=14`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: independent JSON/PNG evidence verification; focused committed/local/release
  regression with 1 file / 4 selected tests; `platform-export-rendering.test.ts` with 1 file /
  155 tests; 4-file cross-platform export regression with 4 files / 194 tests; full
  `src/services/export` serial regression with 36 files / 1132 tests; targeted ESLint;
  `vue-tsc`; and production build with 4653 transformed modules.
- Boundary: this is local XHS data-card raster, visual QA, image-manifest, exact-artifact, and
  sensitive-hygiene accounting only. It does not prove Xiaohongshu account upload,
  mobile/platform preview, public URL acceptance, scheduled send, public article rendering, or
  publish success.

---

## 2026-06-21 XHS Long Report Local Raster Evidence Addendum

- Added `prompts/0601/evidence/xhs-long-report-local-evidence-20260621.txt`.
- Added the committed raster pack:
  `prompts/0601/evidence/xhs-raster/xhs-long-report-browser-2026-06-21.json` and
  pages 01-04 PNG under the same directory.
- Generated the final pack through CloakBrowser against the local Vite app, importing
  `/src/services/export/svg-modules/index.ts` and running:
  `sliceMarkdownToXhsCards` -> `renderXhsMarkdownCardSliceSvg` -> `renderXhsPosterCard`.
- Visual QA inspected a first sparse variant and regenerated the final pack with six short
  Chinese report rows per page. The committed pack has no overflow warning, blank page, crop, or
  overlap.
- JSON pack hash:
  `sha256:102dafef61c4d978f8fd4cb501f7469d714f4db5125e1943e940f77df59d2a9e`.
- Page hashes:
  page 01 `sha256:5b71f34ef0df133f61ae87e2e4849cd4530067ac8092ee7a2459995a44960cce`;
  page 02 `sha256:167e6d909d09f85922c6e80fb6fcc871e6a49f3127d378585ba13ae8b7fc036c`;
  page 03 `sha256:a86d239369571a66c71014ce5a10a8845a1f6f3db0918fa81e8c2ff15751e7ea`;
  page 04 `sha256:fb7fcdfeacc7c0c964ac58eb3539cc7ac89eba23ada45d0ef3129137c6fe1b8c`.
- Browser-side `validateXhsImageArtifactManifest()` returned `issues=[]`; independent Node
  verification re-read committed JSON/PNG files, recomputed hashes, checked bytes, confirmed
  1080 x 1440 dimensions, `overflow=false`, body references `[1, 2, 3, 4]`, and page
  crop/reference fields.
- Added one committed local `xhs-long-report` manifest. Because the catalog choice still remains
  `blocked`, progress gates remain invalid and include `style-proof-manifest-choice-blocked`;
  the evidence does not make `xhs-long-report` publishable.
- Current committed release-gate readout is now `localManifestCount=13`,
  `wechatPcManifestCount=2`, `combinedManifestCount=15`, `combinedIssueCount=15`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: independent JSON/PNG evidence verification; CloakBrowser runtime smoke
  showing `canClaimComplete=false`, `localManifestCount=13`, `combinedManifestCount=15`, and
  `combinedIssueCount=15`; focused committed/local/release regression with 1 file / 4 selected
  tests; `platform-export-rendering.test.ts` with 1 file / 155 tests; 4-file cross-platform
  export regression with 4 files / 194 tests; full `src/services/export` serial regression with
  36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with 4653 transformed
  modules.
- Boundary: this is local XHS long-report raster, visual QA, image-manifest, exact-artifact, and
  sensitive-hygiene accounting only. It does not prove Xiaohongshu account upload,
  mobile/platform preview, public URL acceptance, scheduled send, public article rendering, or
  publish success.

---

## 2026-06-21 XHS Market Rich Card Fallback Local Raster Evidence Addendum

- Added `prompts/0601/evidence/xhs-market-rich-card-fallback-local-evidence-20260621.txt`.
- Added the committed raster pack:
  `prompts/0601/evidence/xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21.json` and
  pages 01-04 PNG under the same directory.
- Generated the final pack through CloakBrowser against the local Vite app, importing
  `/src/services/export/svg-modules/index.ts` and `/src/services/export/quality-detector.ts`,
  then running:
  `sliceMarkdownToXhsCards` -> `renderXhsMarkdownCardSliceSvg` -> `renderXhsPosterCard`.
- The source Markdown is InkForge-owned market-rich fallback guidance. It does not copy 135/Xiumi
  template source, vendor class names, remote media, account artifacts, or browser profile
  material.
- Visual QA inspected all four PNG pages. The committed pack has no overflow warning, blank page,
  crop, overlap, or unreadable wrapping. The final page explicitly keeps platform upload behind an
  account gate and does not claim publish success.
- JSON pack hash:
  `sha256:beefe00ac8ceaa97aaaf1ad27b72055e70a3967bc148372666cd1d9e3f6a1b7b`.
- Source Markdown hash:
  `sha256:a157969d5a838589e9d2f42e6da717666af3b96257512db7377e0b57a6426644`.
- Page hashes:
  page 01 `sha256:4fe54645576d8bd55fb232ee543011199834a45d65b4e60e1edacde59c9687df`;
  page 02 `sha256:0c181783d54ea487b92cb0bd3883e1f6d5271abf0dcff26a97956cdb3f08086f`;
  page 03 `sha256:43ad3d12495da5a670818aefba1fe34aacc1187f56d57b897989c9ffa40e7968`;
  page 04 `sha256:ae31e128b05d26621ea2451688b981109cd7c47b323bc94fd6bf787587aad4d3`.
- Browser-side `validateXhsImageArtifactManifest()` returned `issues=[]`; independent Node
  verification re-read committed JSON/PNG files, recomputed hashes, checked bytes, confirmed
  1080 x 1440 dimensions, `overflow=false`, body references `[1, 2, 3, 4]`, cover marking, and
  page crop/reference fields.
- Added one committed local `xhs-market-rich-card-fallback` manifest. Because the catalog choice
  still remains `blocked`, progress gates remain invalid and include
  `style-proof-manifest-choice-blocked`; the evidence does not make
  `xhs-market-rich-card-fallback` publishable.
- Current committed release-gate readout remains blocked with
  `localManifestCount=14`, `wechatPcManifestCount=2`, `combinedManifestCount=16`,
  `combinedIssueCount=16`, `hasExactArtifactFingerprintConflicts=false`, and
  `canClaimComplete=false`.
- CloakBrowser runtime smoke confirmed blocker kinds `local-conflict`, `phone-preview`,
  `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: independent JSON/PNG evidence verification; CloakBrowser runtime smoke
  showing `canClaimComplete=false`, `localManifestCount=14`, `combinedManifestCount=16`, and
  `combinedIssueCount=16`; focused committed/local/release regression with 1 file / 6 selected
  tests; `platform-export-rendering.test.ts` with 1 file / 155 tests; 4-file cross-platform
  export regression with 4 files / 194 tests; full `src/services/export` serial regression with
  36 files / 1132 tests; targeted ESLint; `vue-tsc`; production build with 4653 transformed
  modules; and GitNexus detect showing 0 affected processes / low risk for the current dirty
  worktree.
- Boundary: this is local XHS market-rich fallback raster, visual QA, image-manifest,
  exact-artifact, and sensitive-hygiene accounting only. It does not prove Xiaohongshu account
  upload, mobile/platform preview, public URL acceptance, scheduled send, public article
  rendering, or publish success.

---

## 2026-06-21 WeChat Classic Inline Local Unit Evidence Addendum

- Added `prompts/0601/evidence/wechat-classic-inline-local-artifact-20260621.html`.
- Added `prompts/0601/evidence/wechat-classic-inline-local-evidence-20260621.txt`.
- Generated the exact HTML artifact through CloakBrowser against the local Vite app, importing
  `/src/services/export/index.ts` and running:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('report'), options)`.
- The source Markdown is InkForge-owned and covers headings, paragraphs, quote, list, and code
  flow. It does not copy 135/Xiumi template source, vendor class names, remote media, account
  artifacts, or browser profile material.
- HTML artifact hash:
  `sha256:13531674720c5015b00b652e05c8127c75c01b6395922d0f1572726a5b030562`.
- HTML bytes: 3605.
- Source Markdown hash:
  `sha256:e147546a1ef52498b139cc226c7dfbf4f3a1f91160dce9fb8a2e2ef652870aa7`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length,
  `id="nice"`, inline style presence, and absence of obvious market-editor residue or credential
  path markers.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, and
  `wechat-layout-report-required`. These are recorded blockers; this evidence is not render-quality
  proof, PC editor paste proof, phone preview proof, or publish proof.
- Added one committed local `wechat-classic-inline` manifest. It claims only `unit-tested`
  evidence and satisfies unit, exact-artifact, and sensitive-hygiene accounting for this exact HTML
  artifact.
- Current committed release-gate readout remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=15`, `wechatPcManifestCount=2`,
  `combinedManifestCount=17`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: independent HTML evidence verification; CloakBrowser runtime smoke; focused
  committed/local/release regression with 1 file / 4 selected tests;
  `platform-export-rendering.test.ts` with 1 file / 155 tests; 4-file cross-platform export
  regression with 4 files / 194 tests; full `src/services/export` serial regression with
  36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 transformed modules in 30.43s. GitNexus detect reported 39 dirty files across the whole
  worktree, 0 affected processes, and low risk; unrelated pre-existing local changes remain
  outside this slice's commit boundary.
- Boundary: this is local WeChat classic inline unit/exact-artifact/sensitive-hygiene accounting
  only. It does not prove official editor paste, phone preview, mobile interaction, Dark Mode,
  cover thumbnail acceptance, sync, scheduled send, platform preview, public article rendering, or
  publish success.

---

## 2026-06-21 WeChat Quiet Editorial Local Browser Evidence Addendum

- Added `prompts/0601/evidence/wechat-quiet-editorial-local-artifact-20260621.html`.
- Added `prompts/0601/evidence/wechat-quiet-editorial-local-evidence-20260621.txt`.
- Generated the exact HTML artifact through the real local WeChat export path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-tempera'), options)`.
- The source Markdown is InkForge-owned and exercises quiet editorial blocks: lede, reading bar,
  quote, banner, list markers, citation card, footer, and cover SVG. It does not copy 135/Xiumi
  template source, vendor class names, remote media, account artifacts, or browser profile
  material.
- HTML artifact hash:
  `sha256:1962d5ef8cd5a76c9b8b5ffe33b87f80bd59cf1cd284b05d529608e1fbd2255e`.
- HTML bytes: 15324.
- Source Markdown hash:
  `sha256:ed57e4a7006141cf236db45ff7a7f526919bbb40b5f30577818531c0d33a577a`.
- CloakBrowser loaded a local read-only artifact preview and measured `rootWidth=677`,
  `niceWidth=677`, `bodyOverflowX=false`, `overflowing=[]`, `svgElementCount=17`, and
  `textLength=486`.
- DOM readback found `flagship-readbar=1`, `flagship-h2=1`, `flagship-quote=1`,
  `flagship-banner=1`, `flagship-lede=1`, `flagship-ul=4`, `flagship-h3=1`,
  `flagship-citation=1`, `flagship-footer=1`, and `data-ink-svg="cover-title"=1`.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, and
  `wechat-layout-report-required`. These are recorded blockers; this evidence is not PC editor
  paste proof, phone preview proof, Dark Mode proof, cover-thumbnail proof, sync proof, or publish
  proof.
- Added one committed local `wechat-quiet-editorial` manifest. It claims only `unit-tested` and
  `local-browser` evidence and satisfies unit, local-browser, exact-artifact, and
  sensitive-hygiene accounting for this exact HTML artifact.
- Current committed release-gate readout remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=16`, `wechatPcManifestCount=2`,
  `combinedManifestCount=18`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: independent HTML evidence verification; CloakBrowser artifact readback;
  CloakBrowser runtime smoke; focused committed/local/release regression with 1 file / 4 selected
  tests; `platform-export-rendering.test.ts` with 1 file / 155 tests; 4-file cross-platform export
  regression with 4 files / 194 tests; full `src/services/export` serial regression with
  36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 transformed modules in 1m19s. GitNexus detect reported 39 dirty files across the whole
  worktree, 0 affected processes, and low risk; unrelated pre-existing local changes remain
  outside this slice's commit boundary.
- Boundary: this is local WeChat quiet editorial browser/exact-artifact/sensitive-hygiene
  accounting only. It does not prove official editor paste, phone preview, mobile interaction,
  Dark Mode, cover thumbnail acceptance, sync, scheduled send, platform preview, public article
  rendering, or publish success.

---

## 2026-06-22 WeChat Card Rich Local Browser Evidence Addendum

- Added `prompts/0601/evidence/wechat-card-rich-local-artifact-20260622.html`.
- Added `prompts/0601/evidence/wechat-card-rich-local-evidence-20260622.txt`.
- Generated the exact HTML artifact through the real local WeChat export path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-tempera'), options)`.
- The source Markdown is InkForge-owned and exercises rich card blocks: data stat, comparison
  card, timeline, gallery track, citation card, list markers, reading bar, lede, H2/H3, footer,
  and cover SVG. It does not copy 135/Xiumi template source, vendor class names, remote media,
  account artifacts, local browser runtime material, or local capture file references.
- HTML artifact hash:
  `sha256:91a8c7ac75fc9a9359cc5cd6a6f9a407a7317bb300cf827403bc72e67e4d2990`.
- HTML bytes: 24797.
- Source Markdown hash:
  `sha256:8448b9c82bd1175c115dba40e815601ab744fc1dfec0a1b5e5b6d8f378e0b3dd`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length,
  card-rich block sentinels, SVG sentinel, and structured sensitive / market-editor residue scan.
- CloakBrowser loaded a local read-only artifact preview and measured `clamp.width=677`,
  `clamp.scrollWidth=677`, `bodyOverflowX=false`, `pageOverflowing=[]`, `svgElementCount=23`,
  `styleElementCount=0`, `foreignObjectCount=0`, `imageInSvgCount=0`, and `scriptCount=0`.
- The gallery block is intentionally an internal horizontal track:
  `gallery.width=677`, `gallery.scrollWidth=1786`, `gallery.clientWidth=677`,
  `galleryOverflowX=true`; this is not page-level overflow.
- DOM readback found `flagship-stat=1`, `flagship-compare=1`, `flagship-timeline=1`,
  `flagship-gallery=1`, `flagship-citation=1`, `flagship-readbar=1`, `flagship-h2=1`,
  `flagship-h3=1`, `flagship-lede=1`, `flagship-ul=4`, `flagship-footer=1`, and
  `data-ink-svg="cover-title"=1`.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, and
  `wechat-layout-report-required`. These are recorded blockers; this evidence is not PC editor
  paste proof, phone preview proof, Dark Mode proof, cover-thumbnail proof, sync proof, or publish
  proof.
- Added one committed local `wechat-card-rich` manifest. It claims only `unit-tested` and
  `local-browser` evidence and satisfies unit, local-browser, exact-artifact, and
  sensitive-hygiene accounting for this exact HTML artifact.
- Current committed release-gate accounting remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=17`, `wechatPcManifestCount=2`,
  `combinedManifestCount=19`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: temporary artifact generator; independent HTML evidence verification;
  CloakBrowser artifact readback; focused committed/local/release regression with 1 file / 4
  selected tests; `platform-export-rendering.test.ts` with 1 file / 155 tests; 4-file
  cross-platform export regression with 4 files / 194 tests; full `src/services/export` serial
  regression with 36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 transformed modules in 36.58s. GitNexus detect reported 39 dirty files across the whole
  worktree, 20 changed symbols, 0 affected processes, and low risk; unrelated pre-existing local
  changes remain outside this slice's commit boundary.
- Boundary: this is local WeChat card-rich browser/exact-artifact/sensitive-hygiene accounting
  only. It does not prove official editor paste, phone preview, mobile interaction, Dark Mode,
  cover thumbnail acceptance, sync, scheduled send, platform preview, public article rendering, or
  publish success.

---

## 2026-06-22 WeChat Cover Seal Divider Local Browser Evidence Addendum

- Added `prompts/0601/evidence/wechat-cover-seal-divider-local-artifact-20260622.html`.
- Added `prompts/0601/evidence/wechat-cover-seal-divider-local-evidence-20260622.txt`.
- Generated the exact HTML artifact through the real local WeChat export path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-kiln'), options)`.
- The source Markdown is InkForge-owned and exercises static SVG cover/seal/divider blocks:
  `cover-grid`, two `divider-forge` blocks, reading bar, H2/H3, callout, lede, list markers,
  footer, and endmark/seal motifs. It does not copy 135/Xiumi template source, vendor class names,
  remote media, account artifacts, or local browser runtime material.
- HTML artifact hash:
  `sha256:e8537db3ddff4b51b5fc6cd189d92cc71fdc9dcc7b8beea7879c7dc96ecfcb2f`.
- HTML bytes: 15452.
- Source Markdown hash:
  `sha256:50fb494a48a0e320dda15913b793e65860fa9181b18969e25788310081c2dabd`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length,
  static SVG sentinels, block sentinels, and structured sensitive / market-editor residue scan.
- CloakBrowser loaded a local read-only artifact preview and measured `clamp.width=677`,
  `clamp.scrollWidth=677`, `bodyOverflowX=false`, `pageOverflowing=[]`, `svgElementCount=16`,
  `styleElementCount=0`, `foreignObjectCount=0`, `imageInSvgCount=0`, `scriptCount=0`, and
  `textLength=503`.
- DOM readback found `cover-grid=1`, `divider-forge=2`, `flagship-callout=1`,
  `flagship-footer=1`, `flagship-h2=1`, `flagship-h3=1`, `flagship-lede=1`,
  `flagship-readbar=1`, and `flagship-ul=4`.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, and
  `wechat-layout-report-required`. These are recorded blockers; this evidence is not PC editor
  paste proof, phone preview proof, Dark Mode proof, cover-thumbnail proof, sync proof, or publish
  proof.
- Added one committed local `wechat-cover-seal-divider` manifest. It claims only `unit-tested`
  and `local-browser` evidence and satisfies unit, local-browser, exact-artifact, and
  sensitive-hygiene accounting for this exact HTML artifact.
- Current committed release-gate accounting remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=18`, `wechatPcManifestCount=2`,
  `combinedManifestCount=20`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: temporary artifact generator; independent HTML evidence verification;
  CloakBrowser artifact readback; focused committed/local/release regression with 1 file /
  4 selected tests; full `platform-export-rendering.test.ts` regression with 1 file / 155 tests;
  four-file cross-platform export regression with 4 files / 194 tests; full export serial
  regression with 36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 transformed modules in 32.60s. `git diff --check` passed for the slice files, and GitNexus
  detect reported 39 dirty files across the whole working tree, 24 changed symbols, 0 affected
  processes, and low risk; the dirty-file count includes unrelated pre-existing files.
- Boundary: this is local WeChat cover/seal/divider browser/exact-artifact/sensitive-hygiene
  accounting only. It does not prove official editor paste, phone preview, mobile interaction,
  Dark Mode, cover thumbnail acceptance, sync, scheduled send, platform preview, public article
  rendering, or publish success.

---

## 2026-06-22 WeChat Toolbar Parameter Map Local Browser Evidence Addendum

- Added `prompts/0601/evidence/wechat-toolbar-parameter-map-local-artifact-20260622.html`.
- Added `prompts/0601/evidence/wechat-toolbar-parameter-map-local-evidence-20260622.txt`.
- Generated the exact HTML artifact through the real local WeChat export path:
  `markdownToWechatWithStats(sourceMarkdown, getDefaultPreset(), options)`.
- The source Markdown is InkForge-owned and exercises renderer-owned toolbar mappings:
  font family, font size, primary color, line height, letter spacing, first-line indent,
  content-width clamp, paragraph rhythm, quote, list, table, inline code, and code block output.
  It does not copy 135/Xiumi template source, vendor class names, remote media, account artifacts,
  or local browser runtime material.
- HTML artifact hash:
  `sha256:f5e6487905e11bfc64e2998d553de45de29b372a87b584014076e38b49263e79`.
- HTML bytes: 9058.
- Source Markdown hash:
  `sha256:c9be54a38b16d9765d8168bd1b47692a26db6f925aa32fa9cbebdb5a16f3d1cb`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length,
  parameter sentinels, structural sentinels, and structured sensitive / market-editor residue
  scan.
- CloakBrowser loaded a local read-only artifact preview and measured `clamp.width=677`,
  `clamp.scrollWidth=677`, `bodyOverflowX=false`, `pageOverflowing=[]`, `styleElementCount=0`,
  `classAttrCount=0`, `foreignObjectCount=0`, `scriptCount=0`, `svgElementCount=0`, and
  `textLength=579`.
- DOM readback found `fontSize17=true`, `primaryColor=true`, `textIndent=true`,
  `maxWidth677=true`, `paragraph=5`, `h1=1`, `h2=1`, `blockquote=1`, `ul=1`, `table=1`,
  and `code=6`.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, `wechat-unsupported-css`,
  `wechat-layout-report-required`, and `render-html-table`. These are recorded blockers; this
  evidence is not PC editor paste proof, phone preview proof, Dark Mode proof, sync proof, or
  publish proof.
- Added one committed local `wechat-toolbar-parameter-map` manifest. It claims only
  `unit-tested` and `local-browser` evidence and satisfies unit, local-browser, exact-artifact,
  and sensitive-hygiene accounting for this exact HTML artifact.
- Current committed release-gate accounting remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=19`, `wechatPcManifestCount=2`,
  `combinedManifestCount=21`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: temporary artifact generator; independent HTML evidence verification;
  CloakBrowser artifact readback; focused committed/local/release regression with 1 file /
  4 selected tests; full `platform-export-rendering.test.ts` regression with 1 file / 155 tests;
  four-file cross-platform export regression with 4 files / 194 tests; full export serial
  regression with 36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 transformed modules in 36.36s. `git diff --check` passed for the slice files, and GitNexus
  detect reported 39 dirty files across the whole working tree, 32 changed symbols, 0 affected
  processes, and low risk; the dirty-file count includes unrelated pre-existing files.
- Boundary: this is local WeChat toolbar-parameter browser/exact-artifact/sensitive-hygiene
  accounting only. It does not prove official editor paste, phone preview, mobile interaction,
  Dark Mode, sync, scheduled send, platform preview, public article rendering, or publish success.

---

## 2026-06-22 WeChat Kiln Paste-Safe Committed Local Evidence Addendum

- Added `prompts/0601/evidence/wechat-kiln-paste-safe-committed-local-evidence-20260622.txt`.
- Reused the already tracked exact HTML artifact:
  `prompts/0601/evidence/wechat-paste/flagship-kiln-paste-safe.html`.
- HTML artifact hash:
  `sha256:338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`.
- HTML bytes: 41618.
- Historical probe metadata remains valid: `cfHtmlBytes=41787`, `svgCount=35`,
  `dataInkSvgCount=3`, `dataInkBlockCount=23`, first module `cover-title`.
- Independent Node verification re-read the tracked HTML, checked the hash, byte length,
  required `cover-title` / `i-stretch` / `divider-forge` SVG sentinels, flagship block sentinels,
  and structured sensitive / market-editor residue scan.
- CloakBrowser loaded a local read-only artifact preview and measured `nice.width=677`,
  `clamp.width=669`, `bodyOverflowX=false`, `svgElementCount=35`, `styleElementCount=0`,
  `foreignObjectCount=0`, `imageInSvgCount=0`, `scriptCount=0`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, and `textLength=1370`.
- SVG sentinel readback found `cover-title`, `i-stretch`, and `divider-forge`; block sentinel
  readback found `flagship-readbar=1`, `flagship-toc=1`, `flagship-quote=2`,
  `flagship-lede=1`, `flagship-banner=1`, `flagship-stat=1`, `flagship-compare=1`,
  `flagship-timeline=1`, `flagship-gallery=1`, and `flagship-footer=1`.
- One internal SVG `<text>` node reported a small scroll-width delta without causing page-level
  overflow; this is recorded as local visual evidence only.
- Added one committed local `wechat-flagship-kiln-paste-safe` manifest. It claims only
  `unit-tested` and `local-browser` evidence and satisfies unit, local-browser, exact-artifact,
  and sensitive-hygiene accounting for this exact HTML artifact.
- Current committed release-gate accounting remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=20`, `wechatPcManifestCount=2`,
  `combinedManifestCount=22`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: independent HTML evidence verification; CloakBrowser artifact readback;
  focused committed/local/release regression with 1 file / 4 selected tests; full
  `platform-export-rendering.test.ts` regression with 1 file / 155 tests; four-file
  cross-platform export regression with 4 files / 194 tests; full export serial regression with
  36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with 4653 transformed
  modules in 35.83s. `git diff --check` passed for the slice files, and GitNexus detect reported
  39 dirty files across the whole working tree, 18 changed symbols, 0 affected processes, and low
  risk; the dirty-file count includes unrelated pre-existing files.
- Boundary: this is local WeChat Kiln paste-safe browser/exact-artifact/sensitive-hygiene
  accounting only. It does not prove official editor paste, phone preview, mobile interaction,
  Dark Mode, cover thumbnail acceptance, sync, scheduled send, platform preview, public article
  rendering, or publish success.

---

## 2026-06-22 Style Proof Release Blocker Count Addendum

- Added read-only blocker count fields to `getCommittedStyleProofEvidenceReleaseGateReport()`:
  `issueCount`, `platformStepCounts`, `requirementStepCounts`, and `issueCounts`.
- `issueIds` is now a de-duplicated scanner list, while `issueCounts` preserves current issue
  occurrence totals.
- Current live committed-evidence release report remains blocked:
  `status=blocked-by-local-conflict`, `canClaimComplete=false`, `localManifestCount=20`,
  `wechatPcManifestCount=2`, `combinedManifestCount=22`, `combinedIssueCount=16`,
  `cannotClaimSteps=32`, `phoneOpenSteps=4`, `externalDependencyOpenSteps=14`,
  `unsafeToAutomateOpenSteps=13`, `mutatingOpenSteps=13`, `blockerCount=5`.
- Current blocker counts:
  `local-conflict issueCounts=[requirement-missing:13, choice-blocked:3]`,
  `phone-preview platformStepCounts=[wechat:4]`,
  `external-dependency platformStepCounts=[wechat:7,xiaohongshu:2,zhihu:5]`,
  `unsafe-to-automate platformStepCounts=[wechat:7,xiaohongshu:2,zhihu:4]`.
- ExportModal committed proof preflight now surfaces those count fields in the existing read-only
  blocked row without changing action availability.
- Added evidence file:
  `prompts/0601/evidence/style-proof-release-blocker-counts-20260622.txt`.
- Verification passed: GitNexus impact checks for the release-gate report, release blocker helper,
  and blocker interface; focused `release claims` regression with 1 selected test; direct `tsx`
  live report readout; full `platform-export-rendering.test.ts` regression with 1 file /
  155 tests; four-file cross-platform export regression with 4 files / 194 tests; full export
  serial regression with 36 files / 1132 tests; targeted ESLint; `vue-tsc`; production build with
  4653 transformed modules in 37.94s; ExportModal UI production build with 4653 transformed
  modules in 33.96s; `git diff --check` for slice files; and GitNexus detect
  with low risk, 39 dirty files across the whole working tree, 24 changed symbols, and 0 affected
  processes. The dirty-file count includes unrelated pre-existing files.
- Additional UI smoke passed through CloakBrowser: a real local article was created through the UI,
  the real `发布` button opened ExportModal, the committed proof preflight row displayed
  `本地冲突 16`, `缺项 13`, `目录阻断 3`, `手机预览 4`, `外部依赖 14`, `小红书 2`,
  `知乎 5`, `requirementCounts`, and the cannot-claim sentence; desktop readback reported
  `scrollWidth=1400`, `bodyScrollWidth=1400`, and `overflowCount=0`.
- Follow-up UI localization passed: ExportModal now maps release-gate `nextOperatorActions` into
  Chinese operator summaries instead of showing raw service-layer English strings. CloakBrowser
  narrow readback at `390x844` found `补齐剩余已提交证据行`,
  `在目标手机预览中读取同一正文`, the same blocker counts, the cannot-claim sentence,
  `scrollWidth=390`, `bodyScrollWidth=390`, and `overflowCount=0`. Follow-up checks passed:
  targeted ExportModal ESLint, `vue-tsc`, focused `release claims` Vitest, and production build
  with 4653 modules in 33.19s. GitNexus detect reported low risk, 39 dirty files across the whole
  working tree, 15 changed symbols, and 0 affected processes; the dirty-file count includes
  unrelated pre-existing files. Runtime screenshots were used only for local visual inspection
  and are not committed artifacts.
- Boundary: this is release-gate accounting only. It does not prove WeChat PC paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, public
  host acceptance, scheduled send, platform preview, public rendering, Xiaohongshu upload, Zhihu
  upload, or publish success.

---

## 2026-06-22 Style Proof Release Local Conflict Scope Addendum

- `getCommittedStyleProofEvidenceReleaseGateReport()` now filters the `local-conflict` blocker to
  true local committed-evidence and catalog conflicts.
- Missing proof rows for phone preview, authenticated PC editor, credentialed channel, public host,
  scheduled send, and platform publish remain in their dedicated step-backed blocker buckets.
- Current live committed-evidence release report remains blocked and unclaimable:
  `status=blocked-by-local-conflict`, `canClaimComplete=false`, `combinedIssueCount=16`,
  `phoneOpenSteps=4`, `externalDependencyOpenSteps=14`, `unsafeToAutomateOpenSteps=13`,
  `mutatingOpenSteps=13`, and `blockerCount=5`.
- The local-conflict blocker now reports `issueCount=6`, with
  `style-proof-manifest-choice-blocked=3`,
  `style-proof-manifest-requirement-missing=3`, and requirement ids
  `zhihu-artifact-manifest`, `unit-test-coverage`, `local-browser-rendering`.
- Added evidence file:
  `prompts/0601/evidence/style-proof-release-local-conflict-scope-20260622.txt`.
- Verification passed: GitNexus impact for `getCommittedStyleProofManifestIssueIds`,
  `getCommittedStyleProofReleaseGateStatus`, and
  `getCommittedStyleProofEvidenceReleaseGateReport`; TDD first focused release-claims test failed
  while local-conflict still counted 16 rows; focused release-claims regression passed after the
  implementation; targeted ESLint passed; four-file cross-platform export regression passed 4
  files / 194 tests; full export serial regression passed 36 files / 1132 tests; `vue-tsc` passed;
  and production build passed with 4653 modules in 53.68s after the UI summary follow-up.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 40 dirty files
  across the whole working tree, 22 changed symbols, and 0 affected processes; the dirty-file
  count includes unrelated pre-existing local changes and does not define the staged boundary.
- CloakBrowser narrow readback at `390x844` used a real local article and the real `发布` button.
  ExportModal showed `本地冲突 6`, no `本地冲突 16`, `缺项 3`, `目录阻断 3`, `手机预览 4`,
  `外部依赖 14`, `canClaimComplete=false`, the updated local-conflict operator summary,
  `scrollWidth=390`, `bodyScrollWidth=390`, and `overflowCount=0`. Runtime screenshots were used
  only for local visual inspection and are not committed artifacts.
- Boundary: this is release-gate classification precision only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  public host acceptance, scheduled send, platform preview, public rendering, Xiaohongshu upload,
  Zhihu upload, or publish success.

---

## 2026-06-22 Style Proof Blocked-Choice-Only Local Conflict Scope Addendum

- `getCommittedStyleProofEvidenceReleaseGateReport()` now excludes blocked-choice-only aggregate
  local requirement gaps from the `local-conflict` blocker.
- `zhihu-artifact-manifest` gaps that require public/platform image hosts remain unclaimable, but
  they are no longer displayed as local artifact chores in the committed release blocker.
- Current live committed-evidence release report remains blocked and unclaimable:
  `status=blocked-by-local-conflict`, `canClaimComplete=false`, `combinedIssueCount=16`,
  `phoneOpenSteps=4`, `externalDependencyOpenSteps=14`, `unsafeToAutomateOpenSteps=13`,
  `mutatingOpenSteps=13`, and `blockerCount=5`.
- The local-conflict blocker now reports only committed proof rows targeting catalog-blocked
  choices: `issueCount=3`, `style-proof-manifest-choice-blocked=3`, and no local requirement ids.
- Added evidence file:
  `prompts/0601/evidence/style-proof-release-blocked-choice-only-scope-20260622.txt`.
- Verification passed so far: GitNexus impact for
  `getCommittedStyleProofEvidenceReleaseGateReport` and `getCommittedStyleProofRunbookOpenSteps`;
  TDD first focused release-claims test failed while requirement-missing still appeared in
  local-conflict; focused release-claims regression passed after the implementation; runtime report
  readback showed `local-conflict issueCount=3` while phone/external/unsafe/mutating blockers
  stayed open.
- Follow-up verification passed: targeted ESLint, focused `release claims` regression, four-file
  cross-platform export regression with 4 files / 194 tests, full export serial regression with
  36 files / 1132 tests, `vue-tsc`, and production build with 4653 modules in 46.56s.
- CloakBrowser narrow readback at `390x844` used a real local article and the real `发布` button.
  ExportModal showed `本地冲突 3`, no `本地冲突 6`, no `本地冲突 16`, no stale local
  artifact-manifest summary, `目录阻断 3`, `手机预览 4`, `外部依赖 14`,
  `canClaimComplete=false`, the updated choice-only local-conflict operator summary,
  `scrollWidth=390`, `bodyScrollWidth=390`, and `overflowCount=0`. Runtime screenshots were not
  saved as committed artifacts.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 40 dirty files
  across the whole working tree, 18 changed symbols, and 0 affected processes; the dirty-file
  count includes unrelated pre-existing local changes and does not define the staged boundary.
- Boundary: this is release-gate classification precision only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  public host acceptance, scheduled send, platform preview, public rendering, Xiaohongshu upload,
  Zhihu upload, or publish success.

---

## 2026-06-22 XHS Local Catalog Open Addendum

- `xhs-data-card`, `xhs-long-report`, and `xhs-market-rich-card-fallback` are now local-browser
  available catalog choices. The committed CloakBrowser raster packs already prove exact
  image-page manifests, 1080 x 1440 PNG dimensions, `overflow=false`, `cropStatus=ok`, body
  references, and `validationIssueIds=[]`.
- They remain unselectable in ExportModal because no `STYLE_CHOICE_APPLICATIONS` mapping points to
  a real InkForge preset/export option yet.
- Current live committed-evidence release report remains blocked and unclaimable, but now by
  external gates: `status=blocked-by-external`, `canClaimComplete=false`,
  `combinedIssueCount=13`, `cannotClaimSteps=29`, `phoneOpenSteps=4`,
  `externalDependencyOpenSteps=14`, `unsafeToAutomateOpenSteps=13`,
  `mutatingOpenSteps=13`, and `blockerCount=4`.
- The local-conflict blocker is absent in this snapshot. Remaining blockers are `phone-preview`,
  `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Added evidence file:
  `prompts/0601/evidence/xhs-local-catalog-open-20260622.txt`.
- Verification passed so far: GitNexus impact for `PLATFORM_STYLE_CHOICES`,
  `evaluateStyleChoiceAvailability`, `validateStyleProofManifest`, and
  `getCommittedStyleProofEvidenceReleaseGateReport`; focused
  `platform-export-rendering.test.ts` with 1 file / 155 tests.
- Follow-up verification passed: full export serial regression with 36 files / 1132 tests;
  targeted ESLint; e2e script syntax check; `vue-tsc`; production build with 4653 modules in
  31.91s; and Tauri/WebView2 e2e with 1 spec / 6 passing.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 41 dirty files
  across the whole working tree, 27 changed symbols, and 0 affected processes; the dirty-file
  count includes unrelated pre-existing local changes and does not define the staged boundary.
- CloakBrowser visual/DOM readback at `390x844` used a real local article and the real `发布`
  button. ExportModal showed XHS `7/8` available, `total=8`, `available=7`, `blocked=0`,
  `unavailable=1`, `overflowingCards=0`, no horizontal document/panel overflow,
  `status blocked-by-external`, `blockers 4`, `canClaimComplete=false`, no local-conflict blocker,
  and the three opened choices rendered as available but disabled/unmapped. Runtime screenshots
  were used only for local visual inspection and are not committed artifacts.
- Boundary: this opens local catalog availability only. It does not prove Xiaohongshu account
  upload, mobile/platform preview, scheduled send, public article rendering, public URL acceptance,
  or publish success.

---

## 2026-06-22 Style Choice Notice Localization Addendum

- ExportModal style cards now translate known catalog blocker/reason strings into compact Chinese
  display copy before rendering the operator UI.
- Follow-up display consistency replaces the remaining raw `fallback：` label with `降级：` and
  localizes the style-catalog preflight blocked action reason through the same notice mapper.
- This is a display-layer mapping only: the runtime catalog, style availability, selectable state,
  release-gate reports, execution runbooks, and committed proof manifests are unchanged.
- Added evidence file:
  `prompts/0601/evidence/style-choice-notice-localization-20260622.txt`.
- Verification passed: GitNexus impact for exact `styleChoiceRows` reported LOW risk with 0
  affected processes; targeted ExportModal ESLint, `vue-tsc`, and production build with
  4653 modules in 32.90s passed; GitNexus detect reported low risk, 38 dirty files across the
  whole working tree, 17 changed symbols, and 0 affected processes; CloakBrowser narrow readback
  at `390x844` through a real local article and the real `发布` button found known English blocker
  fragments absent, Chinese notices present, the Amber card still blocked, and `scrollWidth=390`,
  `bodyScrollWidth=390`, `overflowCount=0`.
- Follow-up verification passed: GitNexus impact for `styleChoiceDetail` and exact
  `styleCatalogPreflightRow` reported LOW risk with 0 affected processes; targeted ExportModal
  ESLint; focused style/release Vitest with 1 file / 4 selected tests; `vue-tsc`; production build
  with 4653 modules in 37.62s; and GitNexus detect with low risk, 39 dirty files across the whole
  working tree, 10 changed symbols, and 0 affected processes. CloakBrowser narrow readback at
  `390x844` reported `fallbackOld=false`, `fallbackNewCount=17`, no known English reason
  fragments, `scrollWidth=390`, `bodyScrollWidth=390`, and `overflowCount=0`. Runtime screenshots
  were used only for local visual inspection and are not committed artifacts.
- Boundary: this is UI copy localization and narrow viewport validation only. It does not prove
  WeChat PC paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public host acceptance, scheduled send, platform preview, public rendering,
  Xiaohongshu upload, Zhihu upload, or publish success.

---

## 2026-06-22 XHS Style Choice Application Mapping Addendum

- `xhs-data-card`, `xhs-long-report`, and `xhs-market-rich-card-fallback` now have real
  `STYLE_CHOICE_APPLICATIONS` mappings to existing Xiaohongshu presets.
- Exact mappings: `xhs-data-card -> xhs-tech / 科技数码`,
  `xhs-long-report -> xhs-simple / 极简高级`, and
  `xhs-market-rich-card-fallback -> xhs-nature / 自然清新`.
- This makes the previously local-browser available choices selectable in ExportModal without
  introducing any new upload, sync, public-host, scheduled-send, preview, or publish path.
- Added evidence file:
  `prompts/0601/evidence/xhs-style-choice-application-mapping-20260622.txt`.
- Verification passed: GitNexus impact for `STYLE_CHOICE_APPLICATIONS` and
  `evaluateStyleChoiceApplication`; focused style-choice regression with 1 file / 3 selected
  tests; full platform style-catalog regression with 1 file / 155 tests; full export serial
  regression with 36 files / 1132 tests; targeted ESLint; e2e script syntax check; `vue-tsc`;
  production build with 4653 modules in 39.75s; and Tauri/WebView2 e2e with 1 spec / 6 tests.
- CloakBrowser narrow readback at `390x844` used a real local article and the real `发布` button.
  XHS showed `7/8` available; the three mapped cards were enabled as `style-choice-available`;
  clicking Data -> Long -> Market selected `xhs-nature / 自然清新`; the preflight row read
  `已选择 Market rich card image fallback → 自然清新（xhs-nature）`; `scrollWidth=390`,
  `clientWidth=390`, and `overflowCount=0`.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 40 dirty files
  across the whole working tree, 25 changed symbols, and 0 affected processes; the dirty-file
  count includes unrelated pre-existing local changes and does not define the staged boundary.
- Boundary: this is local application mapping only. It does not prove Xiaohongshu account upload,
  mobile/platform preview, public URL acceptance, scheduled send, public article rendering, public
  host acceptance, or publish success.

---

## 2026-06-22 Market Live Recheck - 135 SVG and Xiumi Addendum

- CloakBrowser post-reboot recheck opened the live 135 SVG editor, clicked a visible
  `免费试用` effect, accepted the material-included confirmation, and read back an active
  `coverclickmovewithspread` center-editor block.
- The sampled 135 block used a zero-font/zero-line-height section plus a background-only
  `viewBox="0 0 1080 1920"` SVG with `background-size:100.1% 100.1%`,
  `display:inline-block`, `margin-top:-1px`, `pointer-events:none`, `svg:135`,
  `user-select:none`, `vertical-align:top`, and `width:100%`.
- This confirms the existing 135 background-style residue fixture and keeps the rule as
  InkForge-owned image-slot, trigger-zone, fallback, and layout-report schema input. Copied 135
  markers and hosted material remain market-editor residue.
- The same CloakBrowser profile opened Xiumi Studio v5 but stayed on the editor-selection/login
  surface after `图文排版` was clicked. This is current login-state blocker evidence only, not
  Xiumi applied-editor DOM proof.
- Added evidence file:
  `prompts/0601/evidence/market-live-recheck-135-xiumi-20260622.txt`.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 37 dirty files
  across the whole working tree, 7 changed symbols, and 0 affected processes; the dirty-file count
  includes unrelated pre-existing local changes and does not define the staged boundary.
- Boundary: this is market-rule extraction and blocker evidence only. It does not prove WeChat
  official editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, XHS/Zhihu upload, scheduled send, platform preview, public rendering, or
  publish success.

---

## 2026-06-22 Style Proof External Checklist Addendum

- Added `getCommittedStyleProofExternalProofChecklistReport()` as a read-only operator checklist
  above the existing committed release-gate report.
- The checklist mirrors the current committed release state:
  `status=blocked-by-external`, `canClaimComplete=false`, `blockerCount=4`,
  `groupCount=4`, `groupRowCount=44`, `uniqueChecklistRowCount=18`, `phoneRows=4`,
  `externalAccountRows=13`, `publicHostRows=1`, `mutatingRows=13`,
  `unsafeToAutomateRows=13`, and `safeToAutomateRows=0`.
- The four checklist groups are `phone-preview`, `external-dependency`, `unsafe-to-automate`, and
  `mutating-platform`. They preserve overlapping blocker membership instead of flattening platform
  publish rows into a single misleading bucket.
- Each checklist row preserves the runbook proof contract: required channels, actions, readbacks,
  fields, forbidden fields, accepted host statuses, freshness, success criteria, failure signals,
  redaction boundary, cannot-claim reason, and next operator action.
- Local-only rows are intentionally excluded from the external checklist. This prevents local
  evidence cleanup from being confused with phone, account, public-host, scheduled-send,
  platform-preview, upload, public-rendering, or publish proof.
- Added evidence file:
  `prompts/0601/evidence/style-proof-external-checklist-20260622.txt`.
- Verification passed: refreshed GitNexus index; impact analysis for
  `getCommittedStyleProofEvidenceReleaseGateReport`,
  `getCommittedStyleProofEvidenceExecutionRunbookReport`, and `getStyleProofExecutionRunbook`;
  focused external-checklist Vitest with 1 file / 1 selected test; full
  `platform-export-rendering.test.ts` with 1 file / 156 tests; full `src/services/export` serial
  regression with 36 files / 1133 tests; targeted ESLint; `vue-tsc`; production build with
  4653 modules transformed in 30.78s; `git diff --check`; and GitNexus detect with low risk,
  39 dirty files across the whole working tree, 19 changed symbols, and 0 affected processes.
  The dirty-file count includes unrelated pre-existing local changes.
- Boundary: this is proof-collection handoff only. It does not prove WeChat PC editor paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, public
  host acceptance, scheduled send, platform preview, public rendering, Xiaohongshu upload, Zhihu
  upload, or publish success.

---

## 2026-06-22 ExportModal External Checklist Surface Addendum

- ExportModal now surfaces `getCommittedStyleProofExternalProofChecklistReport()` as a read-only
  checklist inside the style capability area.
- The visible summary reads `外部证明清单 18 行；分组 4；手机 4；账号 13；public host 1；需人工 13`.
- Four localized groups are shown: `手机预览` with 4 rows, `外部依赖` with 14 rows, `需人工` with
  13 rows, and `平台变更` with 13 rows.
- The committed proof release preflight row now includes the same checklist summary but remains
  blocked while `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/exportmodal-external-checklist-surface-20260622.txt`.
- Verification passed: GitNexus impact before editing; targeted ExportModal ESLint; `vue-tsc`;
  E2E script syntax check; production build with 4653 modules transformed; CloakBrowser desktop
  readback at `1400x900`; CloakBrowser mobile readback at `390x844`; and real Tauri/WebView2
  `svg-render.spec.cjs` with 1 spec / 6 tests.
- Boundary: this is UI exposure and no-claim accounting only. It does not prove WeChat official
  editor paste, phone preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail
  acceptance, credentialed sync, public host acceptance, scheduled send, platform preview, public
  rendering, Xiaohongshu upload, Zhihu upload, or publish success.

---

## 2026-06-22 Zhihu Clean-Primary Requirement Scope Addendum

- Zhihu clean-primary outputs no longer inherit image fallback manifest/public-host requirements
  just because `fallbackOutput` is `image-fallback`.
- `zhihu-data-table` and `zhihu-clean-column` now keep image fallback proof out of their primary
  clean Markdown requirement set.
- `zhihu-diagram-article`, `zhihu-complex-table-fallback`,
  `zhihu-market-rich-layout-fallback`, and `zhihu-public-image-upload-checklist` remain bound to
  `zhihu-artifact-manifest` and `public-image-host` gates.
- Added evidence file:
  `prompts/0601/evidence/zhihu-clean-primary-requirement-scope-20260622.txt`.
- Verification passed: GitNexus impact for `getStyleChoiceProofRequirements`; focused Vitest for
  style proof requirements, committed local evidence manifests, and execution runbooks; full
  `platform-export-rendering.test.ts` with 156 tests; targeted ESLint; full `src/services/export`
  serial regression with 36 files / 1133 tests; `vue-tsc`; and production build with 4653 modules
  transformed in 33.90s.
- Runtime readback after the change keeps `canClaimComplete=false`, `status=blocked-by-external`,
  and `blockerCount=4`; `combinedIssueCount` drops from 13 to 11 without closing phone, account,
  public-host, scheduled-send, platform-preview, public-rendering, upload, or publish gates.
- Boundary: this is local requirement-scope correction only. It does not prove Zhihu public
  image-host acceptance, account upload, editor sync, scheduled send, platform preview, public
  rendering, or publish success.

---

## 2026-06-22 Style Proof Local Actionability Addendum

- Added `getCommittedStyleProofLocalActionabilityReport()` as a read-only report above the
  committed release gate and committed external proof checklist.
- The report exposes only local safe open rows (`safeToAutomate:true`, `boundary:'local-only'`)
  and classifies them as `actionable-local` or `catalog-blocked`.
- Current committed snapshot remains `status=blocked-by-external`, `canClaimComplete=false`,
  `localManifestCount=20`, `wechatPcManifestCount=2`, `combinedManifestCount=22`,
  `combinedIssueCount=11`, `hasExactArtifactFingerprintConflicts=false`, and `blockerCount=4`.
- Current local actionability summary:
  `safeLocalOpenRows=11`, `actionableLocalRows=0`, `catalogBlockedLocalRows=11`,
  `externalChecklistRows=18`, `externalChecklistGroupRows=44`, `phoneExternalRows=4`,
  `unsafeExternalRows=13`, `mutatingExternalRows=13`, and `safeExternalRows=0`.
- The report deliberately has `nextLocalActionableRow=null`: all current local safe open rows are
  fully explained by blocked catalog choices. External phone/account/public-host/platform rows stay
  in the external checklist and are not converted into local chores.
- Added evidence file:
  `prompts/0601/evidence/style-proof-local-actionability-20260622.txt`.
- Verification passed: focused `local actionability` Vitest with 1 file / 1 selected test; full
  `platform-export-rendering.test.ts` with 1 file / 157 tests; full `src/services/export` serial
  regression with 36 files / 1134 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 modules transformed in 54.34s.
- Boundary: this is local actionability accounting only. It does not prove WeChat official editor
  paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed
  sync, public host acceptance, scheduled send, platform preview, public rendering, Xiaohongshu
  upload, Zhihu upload, or publish success.

---

## 2026-06-22 ExportModal Local Actionability Surface Addendum

- ExportModal now surfaces `getCommittedStyleProofLocalActionabilityReport()` as a read-only local
  actionability block inside the style capability area.
- The visible summary reads `本地可行动 0；目录阻断 11；安全本地 11；外部清单 18`.
- The visible groups are `本地可做` with 0 rows and `目录阻断` with 11 rows. The zero-actionable
  row says there is currently no direct local proof task and points the operator to catalog
  blockers or external proof instead.
- The committed proof release preflight row now includes the same local actionability summary but
  remains blocked while `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/exportmodal-local-actionability-surface-20260622.txt`.
- Verification passed: GitNexus impact for `ExportModal.vue`; `node --check` for
  `svg-render.spec.cjs`; targeted ExportModal ESLint; focused local-actionability Vitest;
  `vue-tsc`; production build with 4653 modules transformed; real Tauri/WebView2
  `svg-render.spec.cjs` with 1 spec / 6 tests; and CloakBrowser narrow viewport readback with no
  horizontal overflow.
- Boundary: this is UI exposure and no-claim accounting only. It does not prove WeChat official
  editor paste, phone preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail
  acceptance, credentialed sync, public host acceptance, scheduled send, platform preview, public
  rendering, Xiaohongshu upload, Zhihu upload, or publish success.

---

## 2026-06-23 Style Proof Manifest Intake Addendum

- Added `getStyleProofManifestIntakeReport(input)` as a runtime-safe local preflight layer for
  redacted `StyleProofManifest` packs before they enter the existing style proof semantic
  validator, pack report, acceptance audit, and execution runbook.
- Invalid roots and schema-invalid manifest rows are returned as `rejected` and are not passed into
  semantic validation. Unknown accepted fields are warning-level schema issues and are dropped from
  sanitized manifests.
- Unsafe or sensitive accepted artifacts still surface through the existing semantic issue ids, so
  intake cannot bypass `style-proof-manifest-sensitive-artifact`,
  `style-proof-manifest-unsafe-commit-artifact`, phone/account/public-host, scheduled-send, or
  publish gates.
- Added evidence file:
  `prompts/0601/evidence/style-proof-manifest-intake-20260623.txt`.
- Verification passed: targeted ESLint; focused `platform-export-rendering.test.ts` run with 5
  selected manifest/intake tests; full `platform-export-rendering.test.ts` with 163 tests; full
  serial `src/services/export` regression with 36 files / 1140 tests; `vue-tsc`; production build
  with 4653 modules transformed; and GitNexus detect-changes with 0 affected processes.
- Boundary: this is local intake accounting only. It does not prove WeChat official editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send, platform preview,
  public rendering, or publish success.

---

## 2026-06-23 Style Proof Manifest JSON Intake Addendum

- Added `getStyleProofManifestJsonIntakeReport(jsonText)` as a safe JSON-string companion for
  redacted external proof manifest packs.
- Valid JSON delegates into `getStyleProofManifestIntakeReport()`. Empty or malformed JSON returns
  the same report shape with `status:'schema-invalid'`, one root rejected row, and
  `style-proof-manifest-intake-json-invalid`; callers do not need to catch parse errors.
- Added evidence file:
  `prompts/0601/evidence/style-proof-manifest-json-intake-20260623.txt`.
- Verification passed: focused `platform-export-rendering.test.ts` run with 7 selected
  manifest/intake/JSON-intake tests; full `platform-export-rendering.test.ts` run with 165 tests;
  serial `src/services/export` run with 36 files / 1142 tests; target ESLint; `vue-tsc`; and
  production build with 4653 modules transformed in 36.64s. GitNexus staged detect reported low
  risk, 8 staged files, 14 touched symbols, and 0 affected processes.
- Boundary: this is local JSON parse safety only. It does not prove WeChat official editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send, platform preview,
  public rendering, or publish success.

---

## 2026-06-23 Style Proof Manifest JSON Size Guard Addendum

- Added a 2,000,000 character pre-parse guard to `getStyleProofManifestJsonIntakeReport(jsonText)`.
- Oversized JSON-string input returns the same report shape with `status:'schema-invalid'`, one
  root rejected row, and `style-proof-manifest-intake-json-too-large`; callers do not need to catch
  parse or allocation-path failures from oversized proof handoff text.
- Added evidence file:
  `prompts/0601/evidence/style-proof-manifest-json-size-guard-20260623.txt`.
- Verification passed: focused `platform-export-rendering.test.ts` run with 8 selected
  manifest/intake/JSON-intake tests; full `platform-export-rendering.test.ts` run with 166 tests;
  serial `src/services/export` run with 36 files / 1143 tests; target ESLint; `vue-tsc`; and
  production build with 4653 modules transformed in 37.62s. GitNexus staged detect reported low
  risk, 7 staged files, 5 changed symbols, and 0 affected processes.
- Boundary: this is local JSON intake resource protection only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send,
  platform preview, public rendering, or publish success.

---

## 2026-06-23 Style Proof Manifest Cardinality Guard Addendum

- Added root manifest-pack and per-manifest artifact-array cardinality guards to
  `getStyleProofManifestIntakeReport(input)`.
- Packs above 128 manifests return `style-proof-manifest-intake-manifest-count-too-large`.
- Manifests above 512 artifacts return `style-proof-manifest-intake-artifact-count-too-large`.
- Oversized inputs fail closed as `status:'schema-invalid'` and do not truncate partial proof into
  accepted manifests.
- Added evidence file:
  `prompts/0601/evidence/style-proof-manifest-cardinality-guard-20260623.txt`.
- Verification passed: focused `platform-export-rendering.test.ts` run with 10 selected
  manifest/intake/JSON-intake tests; full `platform-export-rendering.test.ts` run with 168 tests;
  serial `src/services/export` run with 36 files / 1145 tests; target ESLint; `vue-tsc`; and
  production build with 4653 modules transformed in 36.09s. GitNexus staged detect reported low
  risk, 7 staged files, 9 changed symbols, and 0 affected processes.
- Boundary: this is local proof-handoff resource protection only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send,
  platform preview, public rendering, or publish success.

---

## 2026-06-23 WeChat Market SVG/H5 Fallback Matrix Addendum

- Expanded the executable `wechat-market-svg-h5-fallback-matrix` runtime catalog entry using the
  CloakBrowser-only 135/Xiumi live DOM study.
- Added observed family labels for click show/hide, click switch, slide trigger, text marquee,
  quiz/game, typed image-slot manifests, and normalized trigger-zone manifests.
- Added explicit blockers for 135 background-SVG shells requiring source-owned layout reports,
  image slots, trigger zones, and static/raster fallback; Xiumi wrapper/image-layer/action trees
  without center inline SVG remain authoring evidence only.
- Kept the choice blocked, mobile-only, unmapped from style applications, and gated by
  phone-preview plus publish proof.
- Added evidence file:
  `prompts/0601/evidence/wechat-market-svg-h5-fallback-matrix-20260623.txt`.
- Verification passed: focused `platform-export-rendering.test.ts` run with 3 selected
  availability/application/market tests; full `platform-export-rendering.test.ts` run with 169
  tests; serial `src/services/export` run with 36 files / 1146 tests; target ESLint; `vue-tsc`;
  and production build with 4653 modules transformed in 44.63s.
- Boundary: this is local runtime-catalog accounting only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public preview, scheduled send, public rendering, XHS/Zhihu upload, or publish
  success.

---

## 2026-06-23 ExportModal WeChat Market Fallback CloakBrowser Smoke Addendum

- Started local Vite on `http://127.0.0.1:3016/` because port `3005` was already occupied.
- Used CloakBrowser only at 390 x 844 against the local app.
- Created one local InkForge draft through the real UI, opened Workstation, and clicked local
  `发布` to inspect ExportModal.
- Final readback: `hasModal=true`, `documentElement.scrollWidth=390`, `body.scrollWidth=390`,
  `overflowCount=0`.
- WeChat style capability stayed `当前可用 8/17`; committed proof stayed
  `canClaimComplete=false` with `blockers 4`; external handoff stayed `外部交接 18 行`,
  `安全外部 0`, and `本地可行动 0`.
- `Market SVG/H5 fallback matrix` rendered as a disabled blocked choice rather than a selectable
  action.
- Added evidence file:
  `prompts/0601/evidence/exportmodal-wechat-market-fallback-cloakbrowser-20260623.txt`.
- Boundary: this is local UI layout and blocked-choice display evidence only. It does not prove
  WeChat official editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail
  acceptance, credentialed sync, public preview, scheduled send, public rendering, XHS/Zhihu upload,
  or publish success.

---

## 2026-06-23 WeChat Home Authenticated CloakBrowser Readback Addendum

- Used CloakBrowser only for a read-only WeChat Official Account backend home/dashboard readback.
- The live page title read `公众号`; login-page text and password input were absent; home/dashboard
  navigation signals were visible.
- Account label, draft titles, published titles, credential material, and local browser details were
  redacted and not recorded.
- Added evidence file:
  `prompts/0601/evidence/wechat-home-authenticated-cloakbrowser-readback-20260623.txt`.
- Verification passed: docs/evidence `git diff --check`; staged sensitive scan; and GitNexus staged
  detect with zero affected runtime processes.
- Boundary: this is authenticated-home session evidence only. It does not prove WeChat official
  editor paste, PC editor DOM readback, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, public preview, scheduled send, public rendering, or
  publish success.

---

## 2026-06-23 Market Live DOM Study Addendum

- Used CloakBrowser only to study 135 SVG editor and Xiumi Studio v5 live DOM behavior.
- 135 free-trial SVG insertion with material-included confirmation produced a center-editor block
  with a zero-flow wrapper, 1080-wide background SVG, `background-size:100.1% 100.1%`,
  `margin-top:-1px`, `pointer-events:none`, and absolute percentage trigger overlays.
- Xiumi SVG taxonomy exposed rich category and behavior labels, plus wrapper-heavy `tn-*` preview
  structures. A first-card click changed the center editor but did not yield a visible inline SVG
  node in the center readback, so it is not treated as applied interactive SVG proof.
- Added evidence file:
  `prompts/0601/evidence/market-live-dom-135-xiumi-20260623.txt`.
- Boundary: this is market-rule extraction only. It does not prove WeChat official editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  public preview, scheduled send, public rendering, Xiumi account save, 135 export, XHS/Zhihu
  upload, or publish success.

---

## 2026-06-23 Style Proof Manifest String Field Guard Addendum

- Added a 4,096 character guard for required and optional local intake string fields in
  `getStyleProofManifestIntakeReport(input)`.
- Oversized string fields return `style-proof-manifest-intake-field-too-large`.
- Oversized string inputs fail closed as `status:'schema-invalid'` and do not truncate partial
  proof into accepted manifests.
- Added evidence file:
  `prompts/0601/evidence/style-proof-manifest-string-field-guard-20260623.txt`.
- Verification passed: focused `platform-export-rendering.test.ts` run with 11 selected
  manifest/intake/JSON-intake tests; full `platform-export-rendering.test.ts` run with 169 tests;
  serial `src/services/export` run with 36 files / 1146 tests; target ESLint; `vue-tsc`; and
  production build with 4653 modules transformed in 46.34s. GitNexus staged detect reported low
  risk, 7 staged files, 7 changed symbols, and 0 affected processes.
- Boundary: this is local proof-handoff resource protection only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send,
  platform preview, public rendering, or publish success.

---

## 2026-06-23 WeChat Draft Box Authenticated CloakBrowser Readback Addendum

- Used CloakBrowser only for a read-only WeChat Official Account backend home and draft-box
  readback.
- The draft-box list was reachable at sanitized backend URL category
  `https://mp.weixin.qq.com/cgi-bin/appmsg`.
- Draft-box readback reported `iframe=0`, `contenteditable=0`, `ProseMirror=0`, `textarea=0`,
  `input=1`, `appmsgItems=118`, and no editor links in the sanitized readback.
- The observed new-creation control was not activated, and existing draft cards were not opened.
- Account labels, draft titles, published titles, credential query parameters, account images,
  runtime capture locations, and local browser-state details were redacted and not recorded.
- Added evidence file:
  `prompts/0601/evidence/wechat-draftbox-authenticated-cloakbrowser-readback-20260623.txt`.
- Verification passed: docs/evidence `git diff --check`; staged redaction scan; and GitNexus
  staged detect with `No changes detected`, matching the docs-only scope.
- Boundary: this is authenticated draft-box list evidence only. It does not prove WeChat official
  editor reachability, PC editor DOM readback, paste, phone preview, mobile interaction, Dark Mode,
  cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public
  rendering, or publish success.

---

## 2026-06-23 WeChat New Creation Menu CloakBrowser Readback Addendum

- Used CloakBrowser only to open the WeChat draft-box new-creation dropdown.
- No child option was activated.
- The dropdown exposed `文章`, `选择已有内容`, `贴图`, `视频`, `播客`, and `转载`.
- Editor-surface counts stayed `iframe=0`, `contenteditable=0`, `ProseMirror=0`, `textarea=0`,
  `input=1`; no editor route or editor link was proven by this menu readback.
- Added evidence file:
  `prompts/0601/evidence/wechat-new-creation-menu-cloakbrowser-readback-20260623.txt`.
- Verification passed: docs/evidence `git diff --check`; staged redaction scan; and GitNexus
  staged detect with `No changes detected`, matching the docs-only scope.
- Boundary: this is route-discovery evidence only. It does not prove WeChat official editor
  reachability, PC editor DOM readback, paste, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering, or
  publish success.

---

## 2026-06-23 WeChat Safe Disposable Draft Preflight Blocker Addendum

- Used CloakBrowser only for a read-only metadata scan of the draft-box new-creation menu.
- The visible article/create menu option did not expose a sanitized `href`, `data-url`, or
  `data-action` route in the DOM metadata scan.
- A separate article-template link exposed only `https://mp.weixin.qq.com/cgi-bin/appmsgtemplate`;
  this is not the proof target editor route.
- Existing generic untitled draft labels were present, making blank/untitled cleanup ambiguous.
- The article/create menu option was not activated. This keeps `safe-disposable-draft`, editor
  reachability, PC editor DOM readback, and paste unclaimed for this route.
- Added evidence file:
  `prompts/0601/evidence/wechat-safe-disposable-draft-preflight-blocker-20260623.txt`.
- Verification passed: docs/evidence `git diff --check`; staged redaction scan; and GitNexus
  staged detect with `No changes detected`, matching the docs-only scope.
- Boundary: this is preflight blocker evidence only. It does not prove WeChat official editor
  reachability, PC editor DOM readback, paste, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering, or
  publish success.

---

## 2026-06-23 Style Proof Safe Disposable Draft Preflight Blocker Fields Addendum

- Added executable manifest blocker fields for the WeChat safe disposable draft preflight boundary:
  `createRouteActionMetadataMissing` and `cleanupTargetAmbiguous`.
- Added semantic issue ids `style-proof-manifest-create-route-action-missing` and
  `style-proof-manifest-cleanup-target-ambiguous`.
- The intake allowlist accepts both boolean fields without schema warnings, while semantic
  validation keeps the artifact invalid and keeps `safe-disposable-draft` in acceptance-audit
  `cannotClaim`.
- Added evidence file:
  `prompts/0601/evidence/style-proof-safe-disposable-draft-preflight-blockers-20260623.txt`.
- Verification passed: TDD red run for the new route-discovery preflight regression; post-fix
  focused route-discovery regression; 23 selected proof/acceptance/runbook tests; full
  `platform-export-rendering.test.ts` with 170 tests; full serial `src/services/export` with 36
  files / 1147 tests; targeted ESLint; `vue-tsc`; and production build with 4653 modules
  transformed in 31.46s.
- Boundary: this is local cannot-claim enforcement only. It does not prove WeChat official editor
  reachability, PC editor DOM readback, paste, safe disposable draft creation/cleanup, phone
  preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, platform preview, public rendering, or publish success.

---

## 2026-06-23 Style Proof Redaction Review Gate Addendum

- Added `redactionReviewRequired` and `redactionVerified` to proof artifacts so platform visible
  text readbacks can require explicit redaction review before becoming claimable evidence.
- Added semantic issue id `style-proof-manifest-redaction-review-missing`.
- Intake accepts both boolean fields without schema warnings. Semantic validation keeps a
  `redactionReviewRequired:true` artifact invalid until `redactionVerified:true` is recorded.
- Added evidence file:
  `prompts/0601/evidence/style-proof-redaction-review-gate-20260623.txt`.
- Verification passed: TDD red run for the unknown redaction fields; focused visible-text
  regression; 21 selected manifest/intake/sensitive/proof/acceptance tests; full
  `platform-export-rendering.test.ts` with 171 tests; full serial `src/services/export` with 36
  files / 1148 tests; targeted ESLint; `vue-tsc`; and production build with 4653 modules
  transformed in 34.94s.
- Boundary: this is local evidence-hygiene accounting only. It does not prove WeChat official
  editor reachability, PC editor DOM readback, paste, safe disposable draft creation/cleanup, phone
  preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, platform preview, public rendering, upload, or publish success.

---

## 2026-06-23 Public Market Taxonomy and Platform Boundary Review Addendum

- Used Grok search to review public WeChat SVG/H5, 135 Editor, Xiumi, Xiaohongshu, and Zhihu
  references.
- Same-day public-source recheck used Grok session `10428e903db8` plus Exa cross-search and
  reconfirmed the official WeChat plugin-spec / H5 DarkMode / MP Editor JSAPI boundary without
  requiring code or catalog availability changes.
- Recorded market capability families that can guide InkForge-owned modules: background SVG, click
  reveal/switch, carousel, slide trigger, area trigger, path/parallax, quiz/game, card, title,
  divider, cover, and image-slot manifests.
- Preserved conservative platform boundaries: XHS rich layout must become text plus image/card
  artifacts; Zhihu rich diagrams/tables/formulas must become clean Markdown or hosted image
  fallbacks; WeChat market taxonomy does not close phone/publish gates.
- Added evidence file:
  `prompts/0601/evidence/market-public-taxonomy-platform-boundary-20260623.txt`.
- Boundary: this is public-source taxonomy and docs-only boundary review. It does not prove WeChat
  official editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public-host acceptance, XHS/Zhihu account upload, scheduled send, platform
  preview, public rendering, or publish success.

---

## 2026-06-23 Runtime Market SVG/H5 Fallback Matrix Reconciliation Addendum

- Expanded the executable `wechat-market-svg-h5-fallback-matrix` row with the public taxonomy terms
  that were still only documented: `background SVG shell`,
  `card/title/divider/cover structures`, and `external H5 handoff boundary`.
- Added a runtime blocker stating that external H5 pages, vendor H5 packages, and plugin/sync
  handoffs stay publish-checklist states until exact InkForge artifact platform preview or publish
  proof exists.
- Preserved the safety posture: the WeChat market fallback matrix remains `blocked`,
  `mobile-only`, `mobile-preview` gated, and unmapped from style applications.
- Added/updated evidence file:
  `prompts/0601/evidence/wechat-market-svg-h5-fallback-matrix-20260623.txt`.
- Verification passed: TDD red run failed before the fields existed; post-fix focused rerun passed
  1 selected `platform-export-rendering.test.ts` regression; focused availability/application/market
  run passed 3 selected tests; full `platform-export-rendering.test.ts` passed 171 tests; full
  serial `src/services/export` passed 36 files / 1148 tests; targeted ESLint, `vue-tsc`, production
  build, path-scoped `git diff --check`, and GitNexus low-risk impact/detect passed.
- Boundary: this is local runtime catalog reconciliation only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, XHS/Zhihu upload, or
  publish success.

---

## 2026-06-23 WeChat Home New-Creation Route Blocker Addendum

- Used CloakBrowser only for a read-only authenticated WeChat backend home check.
- Sanitized URL category: `https://mp.weixin.qq.com/cgi-bin/home`.
- Aggregate counts: `iframe=0`, `contenteditable=0`, `ProseMirror=0`, `textarea=0`, `input=0`,
  `svg=63`, `editorLike=0`, `appmsgLinks=19`.
- Generic new-creation entries were visible for article, existing-content selection, sticker/image,
  video, reprint, and podcast, but no sanitized `href`, `data-url`, or `data-action` metadata was
  exposed for those entries.
- Existing draft and published labels were visible in the live browser surface but are redacted and
  not committed.
- Added evidence file:
  `prompts/0601/evidence/wechat-home-new-creation-route-blocker-20260623.txt`.
- Boundary: this is backend-home reachability and route-blocker evidence only. It does not prove
  WeChat official editor reachability, PC editor DOM readback, paste, safe disposable draft
  creation/cleanup, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, upload, or publish
  success.

---

## 2026-06-23 ExportModal Market Fallback Local CloakBrowser Smoke Addendum

- Reused the existing local Vite server on `http://127.0.0.1:3005/` and opened a real local
  Workstation draft through the UI.
- At `390x844`, Home and Workstation both measured `document.scrollWidth=390`,
  `document.clientWidth=390`, `body.scrollWidth=390`, and `body.clientWidth=390`.
- Workstation editor readback: `contenteditable/textarea=1`, `ProseMirror=1`, `buttons=32`,
  `svg=35`.
- Local Publish panel readback: `dialogs=7`, `buttons=88`, `disabledButtons=11`,
  `styleChoiceRows=262`.
- The WeChat `Market SVG/H5 fallback matrix` row stayed blocked/non-applicable and displayed the
  external-H5/plugin/sync handoff blocker text.
- Added evidence file:
  `prompts/0601/evidence/exportmodal-market-fallback-local-cloakbrowser-smoke-20260623.txt`.
- Boundary: this is local UI visibility and layout smoke only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, XHS/Zhihu upload, or
  publish success.

---

## 2026-06-23 Style Proof External Handoff Packet Addendum

- Added a deterministic local operator handoff packet for committed external proof gates:
  `getCommittedStyleProofExternalHandoffPacket(report?)`.
- Added `formatCommittedStyleProofExternalHandoffPacketMarkdown(packet?)` so remaining external
  proof rows can be handed off without creating artifacts, touching browser profiles, or implying
  platform success.
- The packet reuses `getCommittedStyleProofExternalHandoffReport()` and preserves
  `status=blocked-by-external`, `canClaimComplete=false`, `canContinueLocally=false`,
  `safeExternalRows=0`, `externalHandoffRows=18`, `phoneRows=4`, `externalAccountRows=13`,
  `publicHostRows=1`, `unsafeToAutomateRows=13`, and `mutatingRows=13`.
- The Markdown includes required channels/actions/readbacks, required and forbidden evidence
  fields, accepted host statuses, freshness, redaction boundary, success criteria, failure signals,
  cannot-claim reason, and next operator action.
- Added evidence file:
  `prompts/0601/evidence/style-proof-external-handoff-packet-20260623.txt`.
- Verification passed: TDD red run for the missing packet API; focused packet regression passed 1
  selected test; adjacent checklist/actionability/handoff/release selected run passed 5 tests; full
  `platform-export-rendering.test.ts` passed 172 tests; full serial `src/services/export` passed
  36 files / 1149 tests; targeted ESLint, `vue-tsc`, production build, staged diff check,
  sensitive-fragment scan, and GitNexus staged detect passed.
- Boundary: this is local operator handoff formatting only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, public-host acceptance,
  XHS/Zhihu upload, or publish success.

---

## 2026-06-23 ExportModal External Handoff Packet UI Addendum

- Added a visible local Publish modal entry for the deterministic committed-proof external handoff
  packet.
- ExportModal now derives the packet through `getCommittedStyleProofExternalHandoffPacket()` and
  formats it through `formatCommittedStyleProofExternalHandoffPacketMarkdown()` instead of
  duplicating checklist rows in the component.
- The external handoff block exposes a real `Copy` / `CheckCircle` icon button. Copy success states
  that the packet is for manual acceptance and does not mean platform proof is complete; copy
  failure stays a local clipboard-permission failure.
- Added evidence file:
  `prompts/0601/evidence/exportmodal-external-handoff-packet-ui-20260623.txt`.
- CloakBrowser local smoke reused the real local app, opened a real Workstation article from Home,
  and opened the real Publish modal. At `390x844`, the modal reported `scrollWidth=390`,
  `bodyScrollWidth=390`, `handoffVisible=true`, `actionVisible=true`, `actionText=复制交接包`,
  `flagCount=5`, `checklistGroupCount=4`, `copyButtonPresent=true`, `overflowing=false`, and
  `modalWidth=374`.
- Hit-test readback showed the button visible, enabled, and not covered. DOM handler smoke verified
  the Vue binding, success class, and feedback text while preserving the manual-proof boundary.
- Verification passed: targeted ExportModal ESLint, `vue-tsc`, production build, docs/evidence
  `git diff --check`, staged redaction scan, and GitNexus staged detect.
- Boundary: this is local UI reachability, layout safety, and Vue handler wiring only. It does not
  prove operating-system clipboard contents, WeChat editor paste, phone preview, mobile interaction,
  Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public
  rendering, public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 135/Xiumi Applied SVG DOM Learning Addendum

- Used CloakBrowser only for 135 SVG editor and Xiumi paper editor applied DOM learning.
- 135: clicked a visible `免费试用` SVG effect, selected `不需要` in the material prompt, and read
  the center canvas after it rendered five `section + svg` blocks.
- 135 learned rules: zeroed wrapper typography/spacing, centered safe wrapper, portrait SVG view
  boxes, background image SVG frames, seam compensation, non-overlapping trigger zones, minimum
  trigger-area guidance, image-slot equality, animation delay, and fade duration.
- Xiumi: cancelled old draft recovery, opened the SVG category, closed the overlaying category
  menu, clicked a visible SVG style card, and read the center document after it changed.
- Xiumi readback showed the SVG taxonomy list and a center article component tree with
  `section=14`, `svg=12`, `foreignObject=4`, `animate=2`, `rect=2`, and text paragraph nodes.
- Updated docs/spec and evidence:
  `docs/platform-rendering-rules/market-practices-catalog.md`,
  `.trellis/spec/frontend/wechat-svg-modules.md`, and
  `prompts/0601/evidence/market-editor-applied-dom-135-xiumi-20260623.txt`.
- Boundary: this is market-editor applied DOM learning only. It does not prove WeChat editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or
  publish success.

---

## 2026-06-23 Xiumi Applied SVG Detector Regression Addendum

- Added a regression fixture for the Xiumi applied SVG/foreignObject/SMIL pattern observed through
  CloakBrowser.
- The fixture verifies copied Xiumi-like applied SVG output triggers
  `wechat-market-editor-residue`, `xhs-market-editor-residue`, `zhihu-market-editor-residue`, and
  WeChat `wechat-unsafe-svg-construct` for `foreignObject`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-applied-svg-foreignobject-detector-20260623.txt`.
- Verification passed: 1 selected regression, full `platform-export-rendering.test.ts` with 173
  tests, targeted ESLint, full serial `src/services/export` with 36 files / 1150 tests, and
  `vue-tsc --noEmit`.
- Boundary: this is local detector regression coverage only. It does not prove WeChat editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or
  publish success.

---

## 2026-06-23 Xiumi Applied SVG Content-Layer Residue Addendum

- Added production quality-detector coverage for Xiumi applied SVG content-layer classes observed
  in applied DOM: `svg-layout-content`, `root-svg`, `rect-content`, and `fade-self-animation`.
- Added a reduced fixture without `tn-*` wrappers or Xiumi-hosted backgrounds so wrapper-cleaned
  copied SVG still fails as market-editor residue on WeChat, Xiaohongshu, and Zhihu.
- TDD red run failed before implementation because `wechat-market-editor-residue` was absent; the
  focused run passed after adding the detector rule.
- Updated spec and evidence:
  `.trellis/spec/frontend/wechat-svg-modules.md` and
  `prompts/0601/evidence/xiumi-applied-svg-content-layer-residue-20260623.txt`.
- Verification passed: focused green regression, full `platform-export-rendering.test.ts` with 174
  tests, targeted ESLint, full serial `src/services/export` with 36 files / 1151 tests,
  `vue-tsc --noEmit`, and production build.
- Boundary: this is local quality-detector hardening only. It does not prove WeChat editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or
  publish success.

---

## 2026-06-23 WeChat Home Article Create Click Blocker Addendum

- Used CloakBrowser only on the authenticated WeChat home dashboard.
- The `新的创作` area exposed visible creation cards including `文章`, `选择已有内容`, `贴图`,
  `视频`, `转载`, `播客`, and `直播`.
- The `文章` card was visible and hit-testable as `.new-creation__menu-item`.
- Three CloakBrowser click attempts against the card/container/content did not enter the article
  editor; the page stayed on the sanitized home route and editor signals remained absent
  (`contenteditableCount=0`, `iframeCount=0`, no `#js_appmsg_editor`, no `#ueditor_0`).
- Added evidence file:
  `prompts/0601/evidence/wechat-home-article-create-click-blocker-20260623.txt`.
- Boundary: this is authenticated home visibility and route blocker evidence only. It does not
  prove WeChat editor creation, PC paste, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 WeChat Draftbox Editor Entry Click Blocker Addendum

- Used CloakBrowser only on the authenticated WeChat draftbox list.
- The sanitized draftbox route category was reachable through `action=list_card` / `type=77`.
- Safe visible labels included `草稿箱`, `文章模板`, and `新的创作`; draft card/container wrappers
  were present.
- Publish/send controls were observed only as route-risk markers and were not clicked.
- `新的创作` physical click failed stable-position checking; its DOM click returned clicked=true but
  did not open a creation menu/editor.
- `新的创作` native pointer/mouse/click dispatch returned clicked=true; the route remained draftbox
  and no creation menu/editor appeared.
- Existing draft-title, edit-pencil, and draft-card-inner click paths returned ok/clicked=true but
  stayed on draftbox.
- Final editor signals remained absent: `iframeCount=0`, `contenteditableCount=0`, no
  `#js_appmsg_editor`, no `#ueditor_0`, no `.ProseMirror`, no `.rich_media_content`, and no visible
  modal.
- Added evidence file:
  `prompts/0601/evidence/wechat-draftbox-editor-entry-click-blocker-20260623.txt`.
- Boundary: this is authenticated draftbox list reachability and standard-click blocker evidence
  only. By itself it does not prove WeChat editor reachability, PC paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform
  preview, public rendering, public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 WeChat Editor Entry Surface Readback Addendum

- Used CloakBrowser only on the authenticated WeChat official-account backend.
- Standard selector-click entry paths stayed blocked by stable-position checks, but the page's own
  Vue parent `createMsg(0)` article action exposed the official article-editor route.
- Temporarily redirected `window.open` to same-tab navigation so CloakBrowser could keep the editor
  active.
- Captured route category: `action=edit`, `type=10`, `t=media/appmsg_edit_v2`; credential query
  parameters were redacted.
- Final active route category was `appmsg-edit-like`.
- PC editor DOM surface readback returned `#js_appmsg_editor=1`, `#ueditor_0=1`,
  `.ProseMirror=2`, `.rich_media_content=1`, `contenteditable=3`, `iframe=1`, `textarea=2`,
  `input=53`, `svg=9`, and `button=18`.
- A visible title ProseMirror editor with placeholder `请在这里输入标题` and a visible focused body
  ProseMirror editor were present.
- Save-draft, preview, and publish controls were visible as route-risk markers and were not
  clicked.
- The editor surface showed platform auto-save/zero-body-word-count state; this is not manual save,
  paste, preview, or publish proof.
- Added evidence file:
  `prompts/0601/evidence/wechat-editor-entry-surface-readback-20260623.txt`.
- Boundary: this proves authenticated WeChat article editor reachability and PC editor DOM surface
  readback only. It does not prove ordinary paste, exact InkForge artifact retention, safe
  disposable draft cleanup, phone preview, mobile interaction, Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 WeChat Kiln Paste-Safe Ctrl+V No-Input Addendum

- Used the live authenticated WeChat article editor reached through the same-session CloakBrowser
  route.
- Prepared exact artifact
  `prompts/0601/evidence/wechat-paste/flagship-kiln-paste-safe.html` as Windows `HTML Format` plus
  `UnicodeText`.
- Clipboard metadata: SHA-256
  `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`, 41618 HTML bytes,
  41787 CF_HTML bytes, 35 source SVGs, 3 `data-ink-svg`, and 23 `data-ink-block`.
- Attempted disposable marker `InkForge disposable proof 20260623-0925` matched in the editor, but
  the draftbox list later returned `markerCount=0`; no cleanup delete was executed because no
  unique disposable draft card was present.
- Tried Win32 `keybd_event` Ctrl+V with foreground click, Win32 `keybd_event` Ctrl+V with `NoMove`
  / `NoClick`, and Win32 `SendInput` Ctrl+V with a temporary body event probe.
- Final editor body readback stayed unchanged: body text length 8, body HTML length 298,
  `svgCount=0`, `dataInkSvgCount=0`, `dataInkBlockCount=0`, `sectionNice=false`, and
  `eventCount=0` for the probed `SendInput` attempt.
- Added evidence file:
  `prompts/0601/evidence/wechat-kiln-paste-safe-editor-ctrlv-noinput-20260623.txt`.
- Boundary: this is negative live WeChat PC paste evidence. It must not set
  `ordinaryClipboardPasteVerified:true`, `pasteInputEventVerified:true`,
  `editorBodyMutationVerified:true`, `safe-disposable-draft`, or `cleanupPathVerified:true`; it does
  not prove phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed
  sync, scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu
  upload, or publish success.

---

## 2026-06-23 WeChat Disposable Save No-Card Addendum

- Used the live authenticated WeChat article editor reached through same-session CloakBrowser
  `createMsg(0)`.
- Attempt 1 wrote title marker `InkForge disposable cleanup 20260623-1010`, verified the visible
  `保存为草稿` button, and tried DOM pointer/mouse/click plus DOM `click()` after physical
  CloakBrowser click was blocked by stable-position checking.
- Attempt 1 returned to draftbox with `markerCount=0`; no delete action was executed.
- Attempt 2 wrote title marker `InkForge disposable cleanup 20260623-1025` and body sentinel
  `InkForge cleanup body sentinel 20260623-1025`, verified the visible `保存为草稿` button, and sent
  a real Windows mouse click to the save-draft button center.
- Attempt 2 returned to draftbox with `markerCount=0`, `bodyMarkerCount=0`, and
  `cardWrapperCount=14`; no delete action was executed because no unique disposable draft card was
  present.
- Added evidence file:
  `prompts/0601/evidence/wechat-disposable-save-no-card-20260623.txt`.
- Boundary: this is negative safe-disposable-draft lifecycle evidence. It must not set
  `safe-disposable-draft`, `disposableDraft:true`, or `cleanupPathVerified:true`; it does not prove
  ordinary paste, exact artifact retention, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 Foreground Input ClickOnly Helper Addendum

- Added `-Action ClickOnly` to `inkforge/scripts/probe-windows-foreground-input.ps1`.
- `ClickOnly` preserves foreground-window restore, optional move, and optional mouse-click behavior
  while skipping all keyboard input paths.
- Changed empty-input reporting to `@($inputs).Count`, so `requestedInputCount=0` works under
  PowerShell StrictMode.
- Verification command used `-NoMove -NoClick`, matched the current WeChat Chromium window, and
  returned `requestedInputCount=0`, `sentInputCount=0`, and `keybdEventCount=0`.
- Added evidence file:
  `prompts/0601/evidence/foreground-input-clickonly-helper-20260623.txt`.
- Boundary: this is local proof-tooling support only. It does not prove WeChat save-draft success,
  cleanup, paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, public-host acceptance,
  XHS/Zhihu upload, or publish success.

---

## 2026-06-23 Style Proof Save-Draft No-Card Validator Addendum

- Added `StyleProofArtifact.saveDraftNoCard?: boolean`.
- Added issue id `style-proof-manifest-save-draft-no-card`.
- Safe-disposable-draft artifacts with `saveDraftNoCard:true` are invalid blocker evidence and
  cannot satisfy `disposableDraft:true`, `cleanupPathVerified:true`, or `safe-disposable-draft`.
- Intake accepts `saveDraftNoCard` as a known boolean field without schema warnings.
- Acceptance audit treats `style-proof-manifest-save-draft-no-card` as invalid proof rather than a
  missing manual gate.
- Added evidence file:
  `prompts/0601/evidence/style-proof-save-draft-no-card-validator-20260623.txt`.
- Verification: TDD red failed before implementation because the issue id was absent; focused green
  passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t 'save-draft no-card' --reporter=default`.
- Boundary: this is local validation/accounting only. It does not prove WeChat save-draft success,
  cleanup, paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, public-host acceptance,
  XHS/Zhihu upload, or publish success.

---

## 2026-06-23 Market Editor DOM Learning Addendum

- Used CloakBrowser only for live 135 editor and Xiumi editor inspection.
- 135 SVG editor learning: left taxonomy covers image/click/carousel/slide/auto/audio-video/
  expand/long-press/layout/official-account/link-miniprogram/other effect families; `免费试用`
  insertion produced central WeChat-width trial blocks with gap-safe `section` wrappers and
  SVG-like media panels.
- 135 media wrapper learning: zero `font-size`/`line-height`, zero margin/padding, centered media,
  1080x1920 viewBox scaling, redacted background-image layers, `background-size:100.1% 100.1%`,
  `display:inline-block`, `margin-top:-1px`, and `pointer-events:none`.
- Xiumi learning: the article editor exposes title/card/image/layout/SVG/component groups; the SVG
  branch expands into base SVG, carousel, click, path animation, lottery, slide, transition,
  parallax, long-press, region-trigger, and click-plus-auto families.
- Xiumi insertion learning: the first SVG card compiled into an article component tree rather than
  raw `svg`, using section/cell/group/image/text layers, flex rows, `line-height:0`,
  `overflow:hidden`, percentage images, ratio boxes, and capability metadata such as `SVG图集`,
  `SVG布局`, `SVG动画`, and `自由滑动布局`.
- Public-source cross-checks were recorded from Zhihu/CNBlogs SVG/CSS WeChat boundary notes, 135 SVG
  workflow documentation, and Doocs WeChat Markdown editor references.
- Added evidence file:
  `prompts/0601/evidence/market-editor-dom-learning-20260623.txt`.
- Boundary: this is taxonomy/rendering-rule learning only. It does not prove 135/Xiumi proprietary
  template reuse, WeChat PC paste, exact artifact retention, safe disposable draft cleanup, phone
  preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or publish
  success.

---

## 2026-06-23 Style Market Capability Metadata Addendum

- Applied the 135/Xiumi/public-source learning to the executable style catalog as local metadata,
  not as a platform proof claim.
- Added `StyleMarketCapability` plus source/family/trigger/render/status metadata types.
- Added optional `PlatformStyleChoice.marketCapabilities`.
- Added and exported:
  `getStyleChoiceMarketCapabilities(choiceId)` and
  `getPlatformStyleMarketCapabilityReport(platform)`.
- Populated capability metadata for `wechat-market-svg-h5-fallback-matrix`,
  `xhs-market-rich-card-fallback`, and `zhihu-market-rich-layout-fallback`.
- WeChat market capabilities cover background SVG shell, carousel, click expand/show/switch, path
  animation, parallax, slide trigger, long press, region trigger, ratio image layer, title/card
  layout, H5 handoff, and static raster fallback; interactive/H5 rows remain
  `blocked-until-proof` or `external-handoff`.
- XHS capabilities remain source-owned image-page / long-image fallback metadata with artifact
  manifest proof. Zhihu capabilities remain clean Markdown or public-image fallback metadata with
  public-host and artifact-manifest proof.
- Added regression test:
  `exposes market-derived capability metadata without promoting platform proof`.
- Verification: focused TDD red/green, full `platform-export-rendering.test.ts` 176 tests, targeted
  ESLint, full serial `src/services/export` 36 files / 1153 tests, `vue-tsc --noEmit`, and
  production build passed.
- Added evidence file:
  `prompts/0601/evidence/style-market-capability-metadata-20260623.txt`.
- Boundary: this is local executable metadata only. It does not prove 135/Xiumi proprietary template
  reuse, WeChat PC paste, exact artifact retention, safe disposable draft cleanup, phone preview,
  mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send,
  platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 ExportModal Market Capability UI Addendum

- Added local ExportModal surfacing for style market capability metadata.
- ExportModal now consumes `getPlatformStyleMarketCapabilityReport(selectedPlatform)`.
- Style choice cards with market metadata show a compact `市场能力` summary and up to five chips
  naming family, trigger mode, and metadata status.
- Ordinary non-market style choices do not show empty capability rows.
- Existing `selectable`, preset application, proof gate, acceptance audit, execution runbook, and
  release gate behavior remains unchanged.
- CloakBrowser visual verification:
  - WeChat tab: 17 style cards, 1 market card, 0 horizontal overflow cards.
  - Xiaohongshu tab: 8 style cards, 1 market card, 0 horizontal overflow cards.
  - Zhihu tab: 8 style cards, 1 market card, 0 horizontal overflow cards.
- Verification: `eslint src/components/export/ExportModal.vue --quiet`,
  `vue-tsc --noEmit --pretty false`, and production build passed.
- Added evidence file:
  `prompts/0601/evidence/export-modal-market-capability-ui-20260623.txt`.
- Boundary: this is local UI rendering only. It does not prove WeChat PC paste, exact artifact
  retention, safe disposable draft cleanup, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 ExportModal Market Capability E2E Addendum

- Extended `tests/e2e/specs/svg-render.spec.cjs` so the real ExportModal DOM probe reads market
  capability summaries, market chip labels, and market-row horizontal overflow counts.
- WeChat e2e now asserts the Market SVG/H5 fallback matrix exposes `市场能力：14；降级 3；待证明
  10；外部交接 1`, visible SVG/H5 chip labels, and remains blocked/disabled.
- Xiaohongshu e2e now asserts the Market rich card image fallback exposes `市场能力：3；自有 1；降级
  2` and remains mapped to the real preset-backed action.
- Zhihu e2e now asserts the Market rich layout image fallback exposes `市场能力：3；降级 2；待证明 1`
  and remains blocked/disabled until public-host proof exists.
- Verification:
  `node --check inkforge/tests/e2e/specs/svg-render.spec.cjs` passed.
- Verification:
  `pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
  passed with 1 spec / 6 tests against the real Tauri/WebView2 harness.
- Added evidence file:
  `prompts/0601/evidence/exportmodal-market-capability-e2e-20260623.txt`.
- Boundary: this is local Tauri/WebView2 ExportModal evidence only. It does not prove WeChat PC
  paste, exact artifact retention, safe disposable draft cleanup, phone preview, mobile
  interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform
  preview, public rendering, public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 WDIO E2E CJS Lint Addendum

- Added a file-scoped `tests/e2e/**/*.cjs` override in `inkforge/eslint.config.js` so the real
  WDIO/Mocha/CommonJS e2e harness can be statically checked.
- The override declares only the WDIO/Mocha/Node/browser globals used by the `.cjs` harness as
  readonly globals, sets `sourceType: 'commonjs'`, and leaves product `src` lint rules unchanged.
- The override disables `@typescript-eslint/no-require-imports` for CommonJS harness files and
  `@typescript-eslint/no-unused-expressions` for Chai fluent assertions. It intentionally does not
  declare `expect` as a global because specs import `expect` from `chai`.
- Removed an unused `spawnSync` import from `tests/e2e/probes/paint-h1.cjs`.
- Removed a repeated `ready = false` assignment from `tests/e2e/specs/svg-render.spec.cjs`.
- Verification:
  `pnpm -C inkforge exec eslint 'tests/e2e/**/*.cjs' --quiet` passed.
- Verification:
  `node --check inkforge/tests/e2e/specs/svg-render.spec.cjs`,
  `node --check inkforge/tests/e2e/probes/paint-h1.cjs`, and
  `node --check inkforge/eslint.config.js` passed.
- Verification:
  `pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
  passed with 1 spec / 6 tests after the lint cleanup.
- Added evidence file:
  `prompts/0601/evidence/wdio-e2e-cjs-lint-20260623.txt`.
- Boundary: this is local lint/test-harness maintainability only. It does not prove WeChat PC paste,
  exact artifact retention, safe disposable draft cleanup, phone preview, mobile interaction, Dark
  Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public
  rendering, public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 Full Tauri/WebView2 E2E Refresh Addendum

- Ran `pnpm -C inkforge test:e2e` after the market capability e2e and WDIO CJS lint slices.
- Result: 2 spec files / 17 tests passed against the real Tauri/WebView2 harness.
- `svg-render.spec.cjs` passed with 6 tests covering real Pinia draft seeding, real ExportModal
  WeChat/XHS/Zhihu style capability gates, three flagship SVG export-preview probes, and the mobile
  line-width probe.
- `visual.spec.cjs` passed with 11 tests covering titlebar controls, IPC click round trips, brand
  mark rendering, Settings About hero mark, motion tokens, typography rhythm, easing, focus ring,
  and light/dark theme cascade.
- Added evidence file:
  `prompts/0601/evidence/full-tauri-webview2-e2e-refresh-20260623.txt`.
- Boundary: this is local Tauri/WebView2 e2e evidence only. It does not prove WeChat PC paste, exact
  artifact retention, safe disposable draft cleanup, phone preview, mobile interaction, Dark Mode,
  cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-23 Local Release Validation Refresh Addendum

- Ran the full export service regression serially:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`.
- Result: 36 files / 1153 tests passed.
- Ran `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`; passed.
- Ran `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`; passed with 4653 modules
  transformed and Vite build completed in 37.39s.
- Restored `inkforge/tsconfig.tsbuildinfo` after the build.
- Added evidence file:
  `prompts/0601/evidence/local-release-validation-refresh-20260623.txt`.
- Boundary: this is local test/type/build evidence only. It does not prove WeChat PC paste, exact
  artifact retention, safe disposable draft cleanup, phone preview, mobile interaction, Dark Mode,
  cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

---

## 2026-06-26 Xiumi Auxiliary Binding Metadata Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed an applied center
  paper shape/line cell can retain `tn-bind-aux-prop="{ backgroundColor: compAux.bgc1 }"`.
- Added the static detector label `Xiumi auxiliary binding metadata residue` before the final
  generic `Xiumi tn-* attribute` catch-all.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 228 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1205 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 40.09s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-auxiliary-binding-metadata-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Editor Article List Wrapper Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed the center canvas can retain
  the misspelled article/list wrapper class `artilce-list`.
- Added the static detector label `135 SVG editor article list wrapper residue` for that
  source-specific center-canvas wrapper. Generic article, list, wrapper, SVG, editor wording and
  generic `article-item` are not enough.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "artilce-list" --reporter=default`
  failed before the detector and passed after it.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 259 tests after an unrelated Mermaid timeout was proven by focused rerun.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1236 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 50.73s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-editor-article-list-wrapper-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Editor Articles Anchor Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed the center canvas can retain
  the article/navigation anchor wrapper class `articles-anchor`.
- Added the static detector label `135 SVG editor articles anchor residue` for that
  source-specific center-canvas wrapper. Generic article, anchor, list, wrapper, SVG, editor
  wording and generic `article-item` are not enough.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "articles-anchor" --reporter=default`
  failed before the detector and passed after it.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 260 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1237 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 33.05s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-editor-articles-anchor-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Builder Effect Data-Name Second Expansion Addendum

- Clicked the remaining visible live 135 SVG editor free-trial effect buttons through
  CloakBrowser and selected the no-bundled-design-material option whenever prompted.
- Confirmed the center editor can retain 19 additional builder effect `data-name` metadata values:
  `devicephotos`, `clickopenverticalandretainimg`, `slidecardsexpand`,
  `scrollwithclickchangeimage`, `clickpalywithsacleimageandspread`,
  `clickspreadtrackchangeimage`, `clicktrackchangeimage`,
  `touchmoveshowimagewithleakagecarousel`, `autoshowimagewithleakagecarousel`,
  `clickshowimagewithleakagecarousel`, `marqueeclickpopimage`,
  `clickplaygifwithhorizontalscroll`, `clickslideandclickswitchpop`, `doubleclickimage`,
  `clickscaleremovechangeimgs`, `clickcoverandmoveimages`, `clickchooseonepopup`,
  `clickrotatechangeimgswithtopandbgchange`, and `chooseonefromtwoclickimagewithcallback`.
- Added a second same-label static detector row for `135 SVG builder effect data-name`. Generic
  effect wording is not enough; the trigger is the exact `data-name` metadata attribute.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "second-batch 135 SVG builder effect data-name" --reporter=default`
  failed before the detector and passed after it.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 263 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1240 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 34.05s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-builder-effect-data-name-second-expansion-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Builder Effect Data-Name Expansion Addendum

- Clicked live 135 SVG editor free-trial effect buttons through CloakBrowser and selected the
  no-bundled-design-material option when prompted.
- Confirmed the center editor can retain additional builder effect `data-name` metadata:
  `autobounceflipcard`, `multipletouchmovetodismissimgs`, `svgscrollswithgruopsslide`,
  `clickchangecoverwithscroll`, and `clickredpakcetwithscroll`.
- Added these values to the static detector label `135 SVG builder effect data-name`. Generic
  effect wording is not enough; the trigger is the exact `data-name` metadata attribute.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "newly learned 135 SVG builder effect data-name" --reporter=default`
  failed before the detector and passed after it.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 262 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1239 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 30.11s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-builder-effect-data-name-expansion-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Editor Gap Input Child Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed the layout controls can
  retain the spacing/gap input child class `gap_input`.
- Added `gap_input` to the static detector label `135 SVG editor layout control residue`.
  Generic gap, spacing, input, SVG, or editor wording is not enough.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "gap input" --reporter=default`
  failed before the detector and passed after it.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 261 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1238 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 31.97s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-editor-gap-input-child-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Sidebar Icon Help Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed sidebar icon/help DOM can
  retain `side-tab-menu__icon-box`, `side-tab-menu__icon`, `side-bar-banner-wrap`, and
  `sidebar-help black`.
- Added the static detector label `135 SVG sidebar icon/help residue` for source-specific sidebar
  icon, banner, and help editor chrome. Generic sidebar, icon, help, banner, active, work, upload,
  material, or editor wording is not enough.
- Tightened the older sidebar navigation detector so `side-bar` is treated as a complete class
  name and `side-bar-banner-wrap` is not mislabeled as navigation residue.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 254 tests after an unrelated Mermaid timeout was proven by focused rerun.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1231 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 59.71s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-sidebar-icon-help-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material Category Helper Asset Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed material-category DOM can
  retain paired relative editor chrome resources such as `img/hot.74ee6ac4.png` and
  `img/icon-up2.e0ef1973.png`.
- Added the static detector label `135 SVG material category helper asset residue` for
  source-specific nearby pairs of `img/hot` and `img/icon-up2` PNG editor chrome resources.
  Generic hot, fold, up, category, helper, icon, material, PNG, asset, or editor wording is not
  enough, and a single generic PNG image path is not a standalone trigger.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "category helper asset" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 257 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 258 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1235 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 55.26s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-category-helper-asset-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material Action Asset Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed material-card DOM can
  retain paired relative editor chrome resources such as `img/message.6ba842d4.svg` and
  `img/collect.645fe3be.svg`.
- Added the static detector label `135 SVG material action asset residue` for source-specific
  nearby pairs of `img/message` and `img/collect` SVG editor chrome resources. Generic message,
  collect, summary, action, icon, material, SVG, asset, or editor wording is not enough, and a
  single generic SVG icon path is not a standalone trigger.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "material action asset" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 256 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 257 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1234 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 42.76s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-action-asset-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material Preview Asset Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed material preview DOM can
  retain relative editor chrome resources such as `img/img-preview-show.0471d3a6.svg` and
  `img/img-preview-hide.bff8f2cc.svg`.
- Added the static detector label `135 SVG material preview asset residue` for source-specific
  `img/img-preview-show|hide` SVG editor chrome resources. Generic preview, image, show, hide,
  material, SVG, asset, or editor wording is not enough, and generic SVG images are not standalone
  triggers.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "material preview asset" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 255 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 256 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1233 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 55.05s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-preview-asset-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Sidebar Icon Asset Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed sidebar icon DOM can retain
  relative editor chrome resources such as `img/sidebar-work-active.1e2c6eb1.png`.
- Added the static detector label `135 SVG sidebar icon asset residue` for source-specific
  `img/sidebar-*.png` editor chrome resources. Generic sidebar, icon, asset, image, help, active,
  work, upload, material, or editor wording is not enough, and generic data images are not
  standalone triggers.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 255 tests after an unrelated Mermaid timeout was proven by focused rerun.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1232 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 57.42s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-sidebar-icon-asset-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Header Logo Menu Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed header brand/home menu DOM
  can retain `header__logo`, `header__link menu`, `/svgeditor/`, and `img/logo_name.*.png`.
- Added the static detector label `135 SVG header logo menu residue` for source-specific
  header/logo/menu editor chrome. Generic header, logo, menu, home, brand, link, or editor wording
  is not enough.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 252 tests after an unrelated Mermaid timeout was proven by focused rerun.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1229 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 49.29s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-header-logo-menu-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Work Title Edit Control Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed work-title edit controls can
  retain `work-title`, `work-title__editing`, `edit-text__input`, and the live placeholder
  `作品标题`.
- Added the static detector label `135 SVG work title edit control residue` for source-specific
  title edit chrome. The rule avoids generic title, work, edit, input, placeholder, header, and
  editor wording by itself.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "work title edit controls" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 250 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  initially hit one unrelated Mermaid timeout; the focused Mermaid rerun passed, then the full
  platform rerun passed with 1 file / 251 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1228 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 53.27s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-work-title-edit-control-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG User Header Chrome Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed header/user chrome can
  retain `header-user`, `user-info noheader`, `user-info__head`, and `user-info__nickname`.
- Added the static detector label `135 SVG user header chrome residue` for source-specific
  header/user chrome. The committed fixture redacts account text and the rule avoids generic user,
  avatar, nickname, profile, account, personal-mode, header, and editor wording.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "user header chrome" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 249 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 250 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1227 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 52.17s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-user-header-chrome-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material Component Path Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed material cards can retain
  the exact source component path `file_path="sidebar/tabs/ItemElement"`.
- Added the static detector label `135 SVG material component path residue` for that exact
  source-specific component path. The rule avoids generic `file_path`, path, sidebar, tab, item,
  component, material, and SVG wording.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "component path attributes" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 248 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 249 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1226 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 33.51s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-component-path-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material Search Control Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed left material search DOM can
  retain `search__wrap`, `search-area`, `search-input`, `search__input`, `search-hint`, the
  placeholder `请输入关键词搜索`, and search/help icon markers.
- Added the static detector label `135 SVG material search control residue` for source-specific
  material search child controls. The rule avoids generic search wording, `search-input` alone,
  `anticon`, `ant-btn`, and button selectors.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "search child controls" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 247 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  initially hit one unrelated Mermaid timeout, the focused Mermaid rerun passed, and the full
  platform rerun passed with 1 file / 248 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1225 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 56.46s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-search-control-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material Purchase Control Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed left material list purchase
  controls can retain `discount-instructions`, `discount-desc`, and `btn-buy` buttons paired with
  `ant-btn` and the live action text `免费试用` / `立即购买`.
- Added the static detector label `135 SVG material purchase control residue` for source-specific
  material purchase/discount child controls. The rule avoids generic price, buy, trial, discount,
  `btn`, `ant-btn`, `button`, and `new` selectors.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "purchase child controls" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 246 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  initially hit one unrelated Mermaid timeout, the focused Mermaid rerun passed, and the full
  platform rerun passed with 1 file / 247 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1224 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 50.99s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-purchase-control-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material List Loader Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed left material list runtime
  state can retain `issvglist="true"`, `list-loader__inner`, `list-loader__load`,
  `list-loader__loading`, and `list-loader__loading-inner`.
- Added the static detector label `135 SVG material list loader residue` for source-specific
  material list-loader editor state. The rule avoids generic `list-item`, `loading`, `black`,
  `active`, Ant icon, and button selectors.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "material list loader" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 245 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 246 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1223 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 40.63s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-list-loader-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material Category Wrapper Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed left material category/list
  wrapper DOM can retain `tab-special__functions`, `tab-special__tags`, `tab-special__tap`,
  `tab-special__list`, `tab_special_functions`, `tab-menufilter`, `filter_category`,
  `filter-list__fold`, `svgMubanYaoqingEnter`, and `img-preview-hide`.
- Added the static detector label `135 SVG material category wrapper residue` for source-specific
  material category/list wrapper editor chrome. The rule avoids generic `item`, `active`, `more`,
  `new`, `search-input`, and `list-item` selectors.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "material category wrappers" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 244 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 245 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1222 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 37.95s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-category-wrapper-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material Filter Control Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed left material
  filter/category DOM can retain `menu-filter`, `menu-filter__container`,
  `menu-filter__group`, `menu-level__group`, `menu__warp_btn`, `level_entry`, `svg-types`,
  `tab-switch_btn`, `special-tags__left`, `special-tags__center`, `special-tags__right`,
  `special-tags__cover`, `tab-visible_cat`, `preview-guide`, `usage-history`, and
  `modal-entrance`.
- Added the static detector label `135 SVG material filter control residue` for source-specific
  material filter/category editor chrome. The rule avoids generic `search-input`,
  `search-container`, `list-item`, and `new` selectors.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Red verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "material filter controls" --reporter=default`
  failed with 1 selected failing test before the detector rule existed.
- Green verification:
  the same focused command passed with 1 selected test and 243 skipped tests after the detector
  update.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 244 tests after one unrelated Mermaid timeout was isolated by focused
  rerun and the full command was rerun successfully.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1221 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 49.04s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-filter-control-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Material List Item Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed left material-list card DOM
  can retain `item-element`, `item-element_id`, `item-element__box`, `item-element__help`,
  `item-content__tag`, `item-element__title`, `item-element__price`, `item-line`,
  `element-price__wrap`, `element-actions__wrap`, `item-summary-tag`, and `item-collect-tag`.
- Added the static detector label `135 SVG material list item residue` for source-specific
  material-list card/action editor chrome.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 243 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1220 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 33.86s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-material-list-item-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 135 SVG Sidebar Navigation Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed left sidebar/navigation DOM
  can retain `side-bar`, `side-bar-wrap`, `side-bar-menu-wrap`, `side-tab-menu`,
  `side-tab-menu__content`, `side-tab-menu__label`, `side-tab-content`,
  `side-bar-content-wrap`, and `tab-special`.
- Added the static detector label `135 SVG sidebar navigation residue` for source-specific
  sidebar/navigation editor chrome.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 242 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1219 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 1m 1s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-sidebar-navigation-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Text Toolbar Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the text toolbar DOM
  can retain paired `op-text-sec` controls with `font-size`, `font-family`, `text-style`, and
  `text-misc`.
- Added the static detector label `Xiumi text toolbar control residue` for paired text-toolbar
  controls after font-format, color-selector, operation-bar, UI Bootstrap, top-operation,
  operator, auxiliary, selection, crop, and runtime markers have been removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 237 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1214 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 42.93s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-text-toolbar-control-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Font And Format Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the font/basic-format
  DOM can retain `tn-global-format-dropdown`, `tn-basic-format-tabset`, `font-family-menu`,
  `font-family-list`, `stc-family-name-yzk--1`, `text-format-brush`, `text-misc`, `size-input`,
  `tn-list-locate-active-item`, `tn-number-input`, `tn-text-input-done`, `skim-value-prev`,
  `skim-value-next`, `skim-change`, and `skim-end`.
- Added the static detector label `Xiumi font and format control residue` for font-family,
  font-size, and basic-format controls after color-selector, operation-bar, UI Bootstrap,
  top-operation, operator, auxiliary, selection, crop, and runtime markers have been removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 236 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1213 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 46.43s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-font-format-control-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Color Selector Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the color-selector DOM
  can retain `color-selector-dropdown`, `op-theme-color-sec`, `text-color-btn`,
  `tn-color-circle`, `text-shadow-icon`, `text-fill-image-icon`, `tn-color-selector`,
  `tn-color-selector-x`, `hello-color-x`, `on-color-choose`, `support-color-category`, and
  template color-fetch flags.
- Added the static detector label `Xiumi color selector control residue` for color palette,
  text-color, theme-color, and template color extraction controls after operation-bar,
  UI Bootstrap, top-operation, operator, auxiliary, selection, crop, and runtime markers have been
  removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 235 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1212 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 44.52s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-color-selector-control-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Operation Bar Dropdown Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the operation-bar and
  dropdown/menu DOM can retain `op-bar-menu`, `op-bar-btn`, `op-bar-icon`,
  `shortcut-op-bar-panel`, `spacing-panel`, `format-panel`, `size-list-menu`, and
  `insert-text-op-bar-panel`.
- Added the static detector label `Xiumi operation bar dropdown residue` for operation-bar
  dropdown/menu controls after UI Bootstrap/top-operation/operator/auxiliary/selection/crop/runtime
  markers have been removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 234 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1211 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 40.45s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-operation-bar-dropdown-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Worker Surface Crop Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the control DOM can
  retain crop/worker surface classes such as `crop-mask`, `crop-box`, `crop-handle`,
  `op-worker-surface`, and `op-worker-block-gesture`.
- Added the static detector label `Xiumi worker surface crop control residue` for child-only crop
  and gesture-blocking worker controls after broader selection/operator wrappers have been removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 230 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1207 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 43.60s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-worker-surface-crop-control-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Paper Auxiliary Component Tree Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the auxiliary
  component-tree DOM can retain `tn-paper-aux-comps-tree-assistant`,
  `tn-paper-aux-comps-tree`, `paper-comps-assistant`, `paper-aux-comp-tree`,
  `aux-tree-node-data`, and `on-paper-aux-tree-node-*`.
- Added the static detector label `Xiumi paper auxiliary component tree residue` for child-only
  auxiliary component-tree controls after broader operator/selection/crop/runtime markers have
  been removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 231 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1208 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 38.53s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-paper-auxiliary-component-tree-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Top Operation Button Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the top operation bar
  can retain `x3-nav-op-buttons`, `tn-op-btn-group`, `op-btn`, `op-btn-inset-icon`,
  `op-btn-inset-desc`, and `op-more`.
- Added the static detector label `Xiumi top operation button residue` for top operation controls
  after broader Angular/operator/auxiliary/selection/crop/runtime markers have been removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 232 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1209 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 43.56s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-top-operation-button-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi UI Bootstrap Control Directive Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed editor dropdown,
  tooltip, panel, and template menu DOM can retain `uib-dropdown`, `uib-dropdown-toggle`,
  `uib-dropdown-menu`, `uib-tooltip`, `tooltip-placement`, and `tooltip-popup-delay`.
- Added the static detector label `Xiumi UI Bootstrap control directive residue` for UI Bootstrap
  directives after broader Angular/top-operation/operator/auxiliary/selection/crop/runtime markers
  have been removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 233 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1210 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 39.79s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-ui-bootstrap-control-directive-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Operator Depot Item Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the operation-control
  DOM can retain operator-depot/menu item classes such as `op-dc-depot`, `op-dc-slot`,
  `dc-ce-svg`, `dc-ce-animation`, `dc-cp-aux-props`, and `dc-cp-copy-to-clipboard`.
- Added the static detector label `Xiumi operator depot item residue` for child-only operation
  depot/menu item residue after parent `op-dock` wrappers have been removed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 229 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1206 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 42.11s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-operator-depot-item-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Right Toolbar Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed right-side editor
  toolbar/page-assist DOM can retain `x5-right-toolbar`, `right-toolbar-container`,
  `right-toolbar-container-normal`, `right-toolbar-switch-container`, `right-toolbar-switch`,
  `right-toolbar-arrow-up`, `right-toolbar-arrow-down`, `content-statistics`,
  `page-assist-on-toolbar`, `zooming-selector`, and `tn-viewport-zooming-panel`.
- Added the static detector label `Xiumi right toolbar control residue` for right-toolbar editor
  chrome after text-toolbar/font/color/operation controls have been cleaned.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 238 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1215 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 39.87s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-right-toolbar-control-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Sidebar Tab Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed left
  material/template sidebar DOM can retain `sidebar-panel`, `sidebar-style-normal`, `x3-tab-item`,
  `uib-tab`, `tn-tab-ctrl-pin`, and adjacent icon classes such as `icon templates`,
  `icon material-img`, `icon fragments`, `icon clipboard`, `icon images`, `icon team-images`, and
  `icon music`.
- Added the static detector label `Xiumi sidebar tab control residue` for source-specific
  sidebar/tab editor chrome. Adjacent icon classes are documented as context only and are not
  standalone detector triggers.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 239 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1216 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 41.99s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-sidebar-tab-control-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 Xiumi Meta Panel Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed cover/article
  metadata panel DOM can retain `tn-meta-container`, `tn-meta-panel`, `top-group meta-group`,
  `toggle-btn`, `toggle-green-gray`, `toggle-off`, `toggle-on`, and `tn-lighting-box`.
- Added the static detector label `Xiumi meta panel control residue` for source-specific
  meta-panel editor chrome. Generic adjacent classes such as `meta-group`, `toggle-btn`, and
  `tn-lighting-box` are documented as context only and are not standalone detector triggers.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 240 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1217 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 28.75s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-meta-panel-control-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-26 135 SVG Editor Toolbar Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed top-toolbar DOM can retain
  `editor-toolbar`, `editor-toolbar__tool`, `toolbar-tool`, `bar-item`, `bar-item__label`,
  `delete-dropdown_entry`, `tool-dropdown_entry`, and `team_btn`.
- Added the static detector label `135 SVG editor toolbar residue` for source-specific toolbar
  editor chrome.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 241 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1218 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 40.92s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-editor-toolbar-residue-20260626.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 135 SVG Work Tool Quick-Entry Addendum

- Reviewed the live 135 SVG editor through CloakBrowser and confirmed work-tool quick-entry DOM can
  retain `work-tool`, `work-tool-signature fixed`, `ant_btn_panel`, `idea-entry-quick`,
  `entry-popover`, and `btn-entry ant-btn`.
- Added the static detector label `135 SVG work tool quick-entry residue` for source-specific
  work-tool quick-entry editor chrome. Generic work, tool, entry, history, signature, quick,
  panel, button, or editor wording is not enough.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  passed with 1 file / 253 tests after an unrelated Mermaid timeout was proven by focused rerun.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`
  passed with 36 files / 1230 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 50.64s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/135-svg-work-tool-quick-entry-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-27 Xiumi Quick Input Instance Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed a quick-input
  component instance can retain `tn-__quick_input__-inst` in addition to broader quick-input,
  source-house, and component authoring classes.
- Expanded the existing static detector label `Xiumi quick input residue` so partially cleaned
  copied HTML that retains only `tn-__quick_input__-inst` is still blocked with a precise
  quick-input diagnostic instead of relying on broad Xiumi residue handling.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update and focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "quick input instance" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 264 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1241 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 27.09s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-quick-input-instance-residue-20260627.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Editing Frozen-Toggle Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the page editing
  surface can retain `tn-editing-cell-frozen-toggle-enabled` beside broader page/container,
  Angular, and atom drag/drop markers.
- Added the static detector label `Xiumi editing frozen-toggle residue` so partially cleaned
  copied HTML that retains only this page editing-state class is blocked with a precise diagnostic.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update and focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "editing frozen-toggle" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 265 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1242 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 54.95s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-editing-frozen-toggle-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Atom Drag-Drop Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed atom drag/drop editor
  state markers can remain as `tn-atom-dragging-source`, `tn-atom-dropping-sink`, and
  `on-atom-drop`.
- Added the static detector label `Xiumi atom drag-drop residue` so copied interaction-state
  markers get a precise diagnostic instead of falling back to generic Xiumi `tn-*` handling.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update and focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "atom drag-drop" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 266 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1243 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 28.24s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-atom-drag-drop-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Editing Dock Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed editing dock
  markers can remain as `tn-editing-dock`, `tn-editing-show-data`, and `tn-editing-cube-index`.
- Added the static detector label `Xiumi editing dock residue` so copied editing-dock state gets a
  precise diagnostic instead of falling through to generic Xiumi `tn-*` handling or being missed.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update and focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "editing dock" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 267 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1244 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 28.88s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-editing-dock-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Comment Toolbar Panel Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed comment toolbar and
  panel markers can remain as `page-comment-on-toolbar`, `tn-comment-panel`, and
  `tn-comment-list`.
- Added the static detector label `Xiumi comment toolbar panel residue` so copied comment-entry
  editor state gets a precise diagnostic instead of being missed after broader toolbar cleanup.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update and focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "comment toolbar" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 268 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1245 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 33.55s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-comment-toolbar-panel-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Page Toolbar Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the page statistics
  toolbar marker can remain as `tn-page-toolbar` on the editor-side page toolbar.
- Added the static detector label `Xiumi page toolbar residue` so copied editor page-statistics
  controls get a precise diagnostic instead of being reported as generic page authoring-tree
  residue.
- Updated the broader `Xiumi page authoring tree residue` rule so `tn-page-toolbar` is excluded
  and remains independently diagnosable.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because the reduced fixture was only reported
  as `Xiumi page authoring tree residue`, not the precise page-toolbar label; focused green passed
  after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "page toolbar" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 269 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1246 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 29.75s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-page-toolbar-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Attribute Board Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed attribute-board
  controls can remain as `tn-attribute-board-entry`, `tn-attr-assemble-tabs`,
  `op-attr-assemble-item-slot`, and `op-attr-view-attr-assemble-*`.
- Added the static detector label `Xiumi attribute board control residue` so copied margin,
  border, shadow, formatting, text-decoration, action, and link property-panel controls are
  blocked even after operator-depot and `dc-*` markers are absent.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "attribute board" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 270 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1247 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 26.46s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-attribute-board-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Generated Link Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed generated-link
  controls can remain as `op-gen-link`, `op-cp-background-audio`, and
  `op-cp-wx-miniprogram-link`.
- Added the static detector label `Xiumi generated link control residue` so copied background
  music and WeChat mini-program link editor controls are blocked even after attribute-board and
  operator/depot markers are absent.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "generated link" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 271 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1248 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 25.35s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-generated-link-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi WeChat Cover Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed WeChat cover picker
  controls can remain as `op-ce-wx-cover` with cover-selection text for choosing a cover from the
  left gallery.
- Added the static detector label `Xiumi WeChat cover control residue` so copied WeChat cover
  selection controls are blocked even after generated-link, attribute-board, and operator/depot
  markers are absent.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "WeChat cover controls" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 272 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1249 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 38.37s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-wechat-cover-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Scale Panel Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed scale/size panel
  controls can remain as `op-ce-scale` with scale, width, and height labels.
- Added the static detector label `Xiumi scale panel control residue` so copied scale/size editor
  controls are blocked even after WeChat-cover, generated-link, attribute-board, and operator/depot
  markers are absent.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "scale panel controls" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 273 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1250 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 27.04s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-scale-panel-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Menu Input/Icon Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed menu input/icon
  controls can remain as `op-menu-input`, `op-menu-icon`, and `op-bar-item-icon`.
- Added the static detector label `Xiumi menu input/icon control residue` so copied font-size,
  spacing, padding, layout-menu, style-brush, and table-control editor surfaces are blocked even
  after operation-bar dropdown, scale-panel, WeChat-cover, generated-link, attribute-board, and
  operator/depot markers are absent.
- Tightened the 135 toolbar detector so Xiumi `op-bar-item-icon` is not misreported as
  `135 SVG editor toolbar residue`.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because the reduced fixture was not reported
  with the Xiumi menu input/icon label; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "menu input and icon controls" --reporter=default`.
- Verification:
  adjacent 135 toolbar regression passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "135 SVG editor toolbar" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 274 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1251 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 32.28s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-menu-input-icon-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Operation Bar Input/Separator Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed operation-bar
  input/separator controls can remain as `op-bar-input` and `op-bar-separator`.
- Added the static detector label `Xiumi operation bar input/separator residue` so copied
  width/height, x/y, margin, padding, line-height, text-decoration, and panel separator editor
  controls are blocked even after operation-bar dropdown, menu input/icon, scale-panel,
  WeChat-cover, generated-link, attribute-board, and operator/depot markers are absent.
- Kept `op-bar-menu-item` outside the new detector because it overlaps the existing
  operation-bar dropdown/menu boundary through `op-bar-menu`.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "operation bar input and separator" --reporter=default`.
- Verification:
  adjacent menu input/icon and operation-bar dropdown regressions passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "menu input and icon controls" --reporter=default`
  and
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "operation bar dropdown controls" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 275 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1252 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 36.21s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-operation-bar-input-separator-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Box Metrics Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed box-metrics controls
  can remain as `op-ce-box-metrics`.
- Added the static detector label `Xiumi box metrics control residue` so copied margin, padding,
  line-height, border style, border width, border radius, and format-extraction editor controls
  are blocked even after operation-bar input/separator, operation-bar dropdown, menu input/icon,
  scale-panel, WeChat-cover, generated-link, attribute-board, and operator/depot markers are
  absent.
- Kept the rule anchored to a class/id marker so ordinary box, metrics, margin, padding,
  line-height, border, radius, extraction, Xiumi, editor, or template wording is not blocked by
  itself.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "box metrics controls" --reporter=default`.
- Verification:
  adjacent operation-bar input/separator, operator-dock, and color-selector regressions passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "operation bar input and separator" --reporter=default`,
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "operator dock child controls" --reporter=default`,
  and
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "color selector controls" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 276 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1253 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 36.28s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-box-metrics-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Crop Panel Child Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed crop-panel child
  controls can remain as `crop-panel`, `crop-attr-menu`, `crop-ratio-item`, and `crop-image`.
- Added the static detector label `Xiumi crop panel child control residue` so copied crop menus,
  crop-ratio choices, and crop preview image surfaces are blocked even after worker-surface crop,
  selection-overlay, operator/depot, paper auxiliary tree, Angular runtime, hosted media, sidebar,
  and meta-panel markers are absent.
- Kept the rule anchored to class/id markers so ordinary crop, image, panel, ratio, cover, Xiumi,
  editor, or template wording is not blocked by itself.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "crop panel child controls" --reporter=default`.
- Verification:
  adjacent worker-surface crop and selection-overlay regressions passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "worker surface crop controls" --reporter=default`
  and
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "selection overlay child controls" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 277 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1254 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 25.94s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-crop-panel-child-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Background Attribute Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed background-attribute
  controls can remain as `bg-attr-menu`, `bg-repeat-select`, `bg-attach-check`, and
  `ce-op-background`.
- Added the static detector label `Xiumi background attribute control residue` so copied
  background-repeat selectors, background-attachment toggles, and background operation surfaces
  are blocked even after crop-panel child, worker-surface crop, selection-overlay,
  attribute-board, operator/depot, paper auxiliary tree, Angular runtime, hosted media, sidebar,
  and meta-panel markers are absent.
- Kept the rule anchored to class/id markers so ordinary background CSS, image, repeat, attach,
  cover, Xiumi, editor, or template wording is not blocked by itself.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "background attribute controls" --reporter=default`.
- Verification:
  adjacent attribute-board and operator-dock regressions passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "attribute board controls" --reporter=default`
  and
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "operator dock child controls" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 278 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1255 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 27.06s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-background-attribute-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, public-host acceptance, XHS/Zhihu
  account upload, or publish success.

---

## 2026-06-28 Xiumi Animation Attribute Panel Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed animation attribute
  panels can remain as `op-comp-animation-attr-board`, `op-attr-view-cp-animation`,
  `op-attr-view-cp-animation-creation`, `op-attr-view-cp-animation-clipboard`, and
  `anim-selector-x`.
- Added the static detector label `Xiumi animation attribute panel residue` so copied animation
  effect, direction, duration, delay, loop, easing, extraction, and clipboard surfaces are blocked
  even after background-attribute, crop-panel child, worker-surface crop, selection-overlay,
  attribute-board, operator/depot, paper auxiliary tree, Angular runtime, hosted media, sidebar,
  and meta-panel markers are absent.
- Kept the rule anchored to class/id markers so ordinary animation wording, CSS animation
  properties, SVG `<animate>` elements, and motion-related article text are not blocked by
  themselves.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "animation attribute panel" --reporter=default`.
- Verification:
  adjacent attribute-board, operator-depot, and operator-dock regressions passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "attribute board controls" --reporter=default`,
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "operator depot item controls" --reporter=default`,
  and
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "operator dock child controls" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 279 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1256 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 28.48s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-animation-attribute-panel-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, public-host
  acceptance, XHS/Zhihu account upload, or publish success.

---

## 2026-06-28 Xiumi Animate Operation Panel Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed the animate operation
  panel can remain as `animate-op-btn-panel`, including action-extraction controls such as
  `提取动作`.
- Added the static detector label `Xiumi animate operation panel residue` so copied
  action-extraction panel DOM is blocked even after animation-child, animation-attribute,
  top-operation, paper auxiliary tree, Angular runtime, hosted media, sidebar, and meta-panel
  markers are absent.
- Tightened the adjacent top-operation detector to class/id token matching so
  `animate-op-btn-panel` is not misclassified as `Xiumi top operation button residue`.
- Kept the rule anchored to source-specific class/id markers so ordinary animate/action wording,
  button wording, panel wording, SVG `<animate>` elements, and motion-related article text are not
  blocked by themselves.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the exact detector and token-boundary fix because the reduced
  fixture was classified as `Xiumi top operation button residue`; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "animate operation" --reporter=default`.
- Verification:
  adjacent top-operation and animation-child regressions passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "top operation buttons" --reporter=default`
  and
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "animation panel child" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 282 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1259 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 26.82s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-animate-operation-panel-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, public-host
  acceptance, XHS/Zhihu account upload, or publish success.

---

## 2026-06-28 Xiumi Animation Panel Child Control Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed nested animation
  child controls can remain as `anim-unit-container`, `anim-item-list`, `anim-unit-box`,
  `anim-clipboard`, `anim-title-bar`, and `anim-content`.
- Added the static detector label `Xiumi animation panel child residue` so copied animation list,
  title, unit, and clipboard surfaces are blocked even after animation-attribute panel,
  attribute-board, operator/depot, paper auxiliary tree, Angular runtime, hosted media, sidebar,
  and meta-panel markers are absent.
- Kept the rule anchored to class/id markers so ordinary animation wording, CSS animation
  properties, SVG `<animate>` elements, and motion-related article text are not blocked by
  themselves.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "animation panel child" --reporter=default`.
- Verification:
  adjacent animation-attribute-panel regression passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "animation attribute panel" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 280 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1257 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 29.53s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-animation-panel-child-control-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, public-host
  acceptance, XHS/Zhihu account upload, or publish success.

---

## 2026-06-28 Xiumi Attribute Stack Panel Addendum

- Reviewed the live Xiumi v5 paper editor through CloakBrowser and confirmed attribute stack panel
  controls can remain as `tn-attribute-stack-panel-root` and `tn-attribute-stack-panel`.
- Added the static detector label `Xiumi attribute stack panel residue` so copied stacked
  property-panel containers are blocked even after attribute-board, generated-link,
  operator/depot, Angular runtime, hosted media, sidebar, and meta-panel markers are absent.
- Kept the rule anchored to source-specific `tn-attribute-stack-panel*` class/id markers so
  ordinary attribute wording, stack wording, panel wording, style article text, and non-Xiumi
  classes are not blocked by themselves.
- Added three-platform regression coverage in
  `inkforge/src/services/export/platform-export-rendering.test.ts`.
- Verification:
  focused TDD red failed before the detector update because no market-editor-residue issue was
  emitted; focused green passed after it:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "attribute stack panel" --reporter=default`.
- Verification:
  adjacent attribute-board and generated-link regressions passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "attribute board controls" --reporter=default`
  and
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "generated link controls" --reporter=default`.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default --testTimeout=60000`
  passed with 1 file / 281 tests.
- Verification:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --testTimeout=60000`
  passed with 36 files / 1258 tests.
- Verification:
  targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; build
  transformed 4653 modules and completed in 29.02s.
- Release preflight remained correctly blocked by external proof gates:
  `status=blocked-by-external`, `canClaimComplete=false`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, `uniqueNextRows=3`.
- Added evidence file:
  `prompts/0601/evidence/xiumi-attribute-stack-panel-residue-20260628.txt`.
- Boundary: this is local static publishability protection only. It does not prove WeChat PC paste,
  phone preview, mobile SMIL/click interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, public-host
  acceptance, XHS/Zhihu account upload, or publish success.
