# Implementation Plan — 全类型渲染视觉系统重制

## 1. Start gate

- [x] 用户同意创建本任务。
- [x] 七 Variant / 十 Article Profile 映射已确认。
- [x] Atomic 底座选择 B“数字人文主义”。
- [x] 三平台采用同一 DNA、平台原生重排。
- [x] 七套最终方向已按 D13 批量收敛，不再逐套等待。
- [x] 24 个现有 runtime ID 已从当前源码盘点并形成兼容映射。
- [x] `prd.md` 与 `design.md` 已完成。
- [x] 用户完成最终总审并明确进入生产实现。

当前 `task.py current --source` 为 `(none)`，但
`.trellis/tasks/07-29-rendering-visual-system-reconstruction/task.json`
真实存在且状态为 `in_progress`。该任务已启动；不得创建重复任务。若当前
Codex 会话仍无 Trellis context key，保留该不一致并使用精确任务目录继续，不篡改其他
五个 active task。

## 2. Pre-edit protocol

- [ ] 加载 `trellis-before-dev`、本任务 PRD/design/implement、frontend spec 和品牌文档。
- [ ] 记录当前 241 项 dirty tree；只编辑、检查和最终精确 stage 本任务文件，不还原其他任务改动。
- [ ] 重新检查 GitNexus 索引；修改任何函数、类或方法前执行 upstream impact。
- [ ] 优先检查的共享符号：
  - `generateThemeCSS`
  - `themePresets`
  - `composeRecipes`
  - `chainDecorators`
  - `convertToWechatWithStats`
  - `getPlatformPresets`
  - `convertToXiaohongshu`
  - `convertToZhihu`
  - `useThemeStore`
  - `usePreviewRenderer`
- [ ] GitNexus 返回 HIGH/CRITICAL 时，编辑前报告真实调用者、受影响流程和最小共享根方案。
- [ ] 每个切片先留下一个能失败的最小回归；不通过时定位产品根因，不修改断言掩盖缺陷。
- [ ] 不新增依赖，不建立平行 renderer，不复制写作组件注册表。
- [ ] 重型测试、Vite build、Tauri build 与 native E2E 串行执行，避免本机内存峰值。

## 3. Ordered implementation slices

### Slice A — Canonical Variant/Profile mapping

**Goal:** 用最薄的映射恢复原始 Atomic + 7 Variants 架构，不改变现有平台 API。

- [ ] 增加封闭的 `VisualVariantId`、`ArticleProfileId` 与只读映射。
- [ ] 写入七 Variant、十 Profile 和 24 个 legacy platform ID 的精确映射。
- [ ] 提供最小 resolver：
  - Article Profile → 默认 Variant；
  - platform + legacy preset ID → Variant；
  - Variant + platform → 现有兼容 preset / recipe；
  - 未知值 → 当前平台默认值 + 可诊断 fallback。
- [ ] 锁定 16/5/3 个现有 ID 的名称、顺序和可选择性。
- [ ] 不引入模板 DSL、运行时插件、动态代码或网络主题。

**Red/green gate**

- 7 个 Variant、10 个 Profile、24 个 legacy ID 覆盖完整；
- `flagship-kiln-paste-safe` 与 `flagship-kiln` 同人格；
- 未知 ID 不删除原值、不崩溃、不伪造新 preset。

### Slice B — Shared article tokens and body contract

**Goal:** 七套共享可读性和品牌纪律，但普通段落区域也能呈现各自身份。

- [ ] 复用 `generatePersonaBaseCSS()` 与现有 Typography token；不复制七份基础 reset。
- [ ] 固定品牌角色 token：Graphite、Kiln、Tempera、Amber、Vellum。
- [ ] 为 Variant 提供最小字体角色、节奏、版心、强调预算和图片装裱 token。
- [ ] 保持用户 Typography 覆盖有效：字号、行高、字距、段距、版心、首行缩进、对齐。
- [ ] 使用 paragraph-only corpus 验证七套在移除颜色后仍有不同结构/节奏。
- [ ] 320–677px 无横向溢出；375px 默认满足已验证的 22 字完整行基线。

**Rollback point:** 该切片只增加共享 token/映射；任何几何回归均先回退 Variant 覆盖，不修改用户 Typography 数据。

### Slice C — Seven WeChat Variant recipes

**Goal:** 在现有 `previewCSS` / `exportCSS` / `decorate` 双轨中完成七套全文艺术指导。

#### C1 V1 Critical Translation

- [ ] 典藏译本报头、原文—译文双轨、译注、术语、图版、版本谱系和参考资料；
- [ ] 长文本保持 HTML；短桥接线、节点和校勘符号使用安全 SVG；
- [ ] 映射 `thesis`，保留其旧调用和设置。

#### C2 V2 Jurisprudence Atlas

- [ ] 法理坐标、IRAC 纵轴、权威层级、判例谱系、证据链和多数/异议；
- [ ] 连续法学正文优先，减少后台式卡片；
- [ ] 映射 `legal`。

#### C3 V3 Industry Section

- [ ] 产业剖面、价值链、情景带、风险切口、决策窗口和高价值图表；
- [ ] 所有数据组件要求真实口径、单位、时间和来源；
- [ ] 映射 `report` 与 `flagship-amber`。

#### C4 V4 Fact Wire

- [ ] 铸红构成主义大封面、纪实图片、时间码、来源节点、更新与勘误；
- [ ] `news` 使用事实流，`commentary` 使用观点/证据/反方/不确定性；
- [ ] 斜向几何不承载正文。

#### C5 V5 Machine Foundry

- [ ] 数字铸场报头、材料—模具—淬炼—锻次构建轨；
- [ ] AIGC 强调媒体/Prompt/模型，编程创造强调代码/版本/复现；
- [ ] 映射 `aigc`、`code`、`tech`、`flagship-kiln` 和 paste-safe 通道；
- [ ] 移除任何泄漏的 `THE FACT WIRE` 等跨 Variant 品牌串味。

#### C6 V6 Knowledge Weave

- [ ] 问题—概念—证据—应用—复盘、回链、页边注、正反例和知识图；
- [ ] 节点图只保留短概念，解释和来源保持 HTML；
- [ ] 映射 `notes` 与 `flagship-tempera`。

#### C7 V7 Human Margins

- [ ] playful：成熟编辑拼贴、真实梗图位、对话节拍和手切装裱；
- [ ] quiet：纪实图像、信件、回忆时间线、诗性引文和慢正文；
- [ ] 映射 `meme`、`life`、`elegant`；
- [ ] 禁止 Emoji、儿童卡通、廉价表情包和假社交控件。

**Shared recipe rules**

- [ ] 只扩展现有 `composeRecipes` / `chainDecorators` / HTML blocks / SVG modules；
- [ ] decorator 幂等，每次渲染 token 恰好执行一次；
- [ ] 预览与实际微信导出共享设计意图，但 export 只使用安全子集；
- [ ] 所有完整语义元素有基线和 Variant 表现，不出现裸区；
- [ ] 自动抬头、组件和文末不重复注入；
- [ ] 空数据不输出空大卡或假内容。

### Slice D — Writing components under every Variant

**Goal:** 现有组件在七套中都可生成、可编辑、可导出，并具有各自视觉语言。

- [ ] 复用现有 18 个内置定义，不更改组件数据模型。
- [ ] 时间线、对比、统计、图集、引文、歌曲、名片、文章链接和微信媒体在七套中都有明确样式或真实 fallback。
- [ ] 缺少必填真实字段时不进入最终导出。
- [ ] 组件 JSX、TipTap Node、Source 往返和自动保存保持无损。
- [ ] Stage 与 `/组件` 继续打开同一组件库。
- [ ] 组件视觉只读取 Variant token，不再按每个组件复制 7 份字段/渲染实现。

### Slice E — Canonical UI selection and persistence

**Goal:** 工作台、主题页、导出与发布中心共享同一 Variant 意图，旧 preset 仍可用。

- [ ] 在现有主题状态中保存 `VisualVariantId` 和 `ArticleProfileId`，不建立第二个 store。
- [ ] 从旧微信 preset ID 无损推导初始 Variant；旧平台 ID 保留为高级兼容覆盖。
- [ ] 工作台预设、主题页、导出和发布中心使用同一 resolver。
- [ ] 平台切换保持 Variant，只重新解析平台配方。
- [ ] 七个主 Variant 卡展示真实运行时签名；旧兼容入口仍可访问。
- [ ] 不增加重复的“样式/导出/发布”导航概念。
- [ ] 使用现有 Lucide 图标；无 Emoji。

### Slice F — Xiaohongshu and Zhihu native recomposition

**Goal:** 同一 Variant 在两个平台拥有原生结构，而不是微信 HTML 截图式复用。

#### Xiaohongshu

- [ ] 七 Variant 均能生成本地封面/正文/数据/图集/文末页。
- [ ] 复用现有 5 个 XHS preset、图片页切片和文本输出。
- [ ] 页面数量由真实内容决定；空组件不生成空页。
- [ ] 图片、来源、作者、数字和平台信息只用真实字段。
- [ ] 无 `#nice`、微信 SVG wrapper 或公众号控制属性泄漏。

#### Zhihu

- [ ] 七 Variant 均能生成语义长文；
- [ ] 标题、段落、引用、表格、代码、公式和来源保持可访问；
- [ ] 复杂图形使用真实图片 fallback 和替代文本；
- [ ] 无微信 wrapper 或 XHS 卡片控制属性泄漏。

**Boundary:** 不执行小红书/知乎账号发布。

### Slice G — Automated verification

按内存压力串行执行：

```bash
pnpm -C inkforge exec vitest run \
  src/services/export/persona-distinction.test.ts \
  src/services/export/themes-migration.test.ts \
  src/services/export/writing-components-platform.test.ts \
  src/services/export/platform-export-rendering.test.ts \
  --reporter=default --maxWorkers=1 --no-file-parallelism
```

```bash
pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism
```

```bash
pnpm -C inkforge exec eslint \
  <exact changed source and test files> --quiet
```

```bash
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
```

```bash
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
```

```bash
pnpm -C inkforge style-proof:release-preflight
pnpm -C inkforge style-proof:application-preflight
```

Required automated assertions:

- 7/7 Variant、10/10 Profile、24/24 legacy ID；
- paragraph-only 与 full-semantic 两种 corpus 的七套结构指纹唯一；
- 16 个微信 ID 继续可选择和导出；
- XHS 5 个、Zhihu 3 个 legacy ID 保留；
- 375/393/677px 无横向/SVG 裁切；
- 微信最终 HTML 无危险节点、长文本 SVG、伪元素依赖或重复 sentinel；
- XHS/Zhihu 无微信 wrapper；
- 所有用户 Typography 控制仍有实际效果；
- 不生成假数据、假媒体或空白大卡。

### Slice H — Real native visual acceptance

- [x] 构建真实 release Tauri 软件：

```bash
pnpm -C inkforge tauri:build
```

- [x] 关闭旧的任务内 InkForge 开发实例，只启动本次构建的 Release 软件；未终止浏览器或无关进程。
- [ ] 在真实 WebView2 中检查工作台、主题页、分栏、全屏、导出和发布中心。
- [ ] 动态读取本机真实文章，选择最长、最短和组件最丰富三篇。
- [ ] 生成 7 Variant × 3 真实文章 × 375/393/677px 的长页证据。
- [x] 使用当前本机真实文章生成 Release 软件 contact sheet，确认七个主方向与 V7 playful 分支的辨识度和共同品牌 DNA。
- [ ] 检查实际复制微信富文本的源码、可见正文、SVG 边界和组件。
- [ ] 若当前持久 CloakBrowser 登录态可用，只在微信公众号桌面编辑器执行不发布的复制/粘贴/DOM 读回；不触发保存、同步、定时或发布。
- [ ] 生成七 Variant 的 XHS/知乎本地产物交给用户手测，不自动发布。

视觉失败优先于字符串测试通过；任何一套只换色、正文裸露、空白过大、假控件、过小文字或裁切都返回对应 C/F 切片修复。

### Slice I — Review, spec, evidence and handoff

- [x] 独立 correctness/security 与 scope/evidence 两类只读审查。
- [ ] 修正 in-scope 发现并重跑最小相关检查。
- [ ] 更新 `.trellis/spec/frontend`：
  - 七 Variant / 十 Profile / legacy ID 映射；
  - Variant 与平台 adapter 分层；
  - 微信安全 HTML/SVG；
  - 真实数据与组件 fallback；
  - 原生视觉验收契约。
- [ ] 更新任务完成矩阵与用户手测清单。
- [ ] 运行 GitNexus `detect_changes(scope=all)`，区分本任务与既有 dirty tree。
- [ ] 精确 `git diff --check`、敏感信息和运行时文件扫描。
- [ ] 只精确 stage 本任务文件；不使用 `git add .`。
- [ ] 未经用户明确要求不 commit、不 push、不创建 PR。

## 4. Acceptance matrix

| Contract | Automated proof | Native/software proof | External boundary |
|---|---|---|---|
| 7 Variant / 10 Profile | mapping coverage | seven canonical choices reachable | none |
| 24 legacy IDs preserved | registry migration tests | old choices/settings still open | none |
| body-level distinction | color-normalized fingerprints | paragraph-only contact sheet | user visual sign-off |
| full semantic coverage | complete corpus × seven | long-page review | none |
| WeChat safe rendering | sanitizer/compliance/geometry | actual copy source and preview | desktop editor readback if login available |
| writing components | Schema/round-trip/platform tests | Stage insert/edit/export | platform-native media finalized manually |
| XHS native output | wrapper/page/artifact tests | local pages | user publishes manually |
| Zhihu native output | semantic/fallback tests | local longform | user publishes manually |
| Typography preserved | every-control effect tests | 375/393/677 measurements | none |
| no fake data | missing-field tests | current real article corpus | user supplies platform-only IDs/media |

## 5. Stop rules

- 共享符号 impact 为 HIGH/CRITICAL 时，先报告再编辑；
- 任一 Variant 需要第二套 renderer 才能成立时，返回设计层简化，不继续复制；
- 任一视觉依赖微信不支持的长文本 SVG、脚本、伪元素或定位时，重做视觉，不偷偷降成裸文本；
- 任一组件缺少真实字段时保持缺失，不填示例；
- 发现需要删除现有功能、preset、组件或迁移用户正文时停止并重新评审；
- 只有自动检查、生产构建、真实 Tauri 视觉矩阵和可复制微信产物均通过，才交付用户进行最终平台实测。

## 6. 2026-07-30 batch implementation checkpoint

### Completed implementation

- Added the closed seven-Variant / ten-Profile registry and preserved all 16 WeChat,
  5 Xiaohongshu, and 3 Zhihu preset IDs.
- Connected the variant layer to the existing WeChat renderer and to the existing
  Xiaohongshu/Zhihu compatibility CSS mappings without adding another renderer or
  component model. Seven distinct native XHS/Zhihu compositions are not claimed.
- Added safe inner masthead hooks while preserving the outer markup required by the
  existing flagship read-bar decorator.
- Added a distinct paragraph-only skeleton for every canonical Variant. V7 keeps
  separate quiet and playful treatments.
- Kept explicit user Typography overrides effective after the variant layer.
- Added focused regression coverage for mappings, masthead hooks, paragraph-only
  distinction, complete semantics, writing components, and platform isolation.
- Added `.trellis/spec/frontend/visual-variant-system.md` as the executable contract.

### Verification completed

```text
focused export regression:
  8 files / 694 tests passed

full export service regression:
  48 files / 1438 tests passed

exact changed-file ESLint:
  passed

vue-tsc --noEmit:
  passed

production frontend build:
  passed, 5577 modules

style-proof application preflight:
  application-ready
  27 SVG modules / 7 SVG families
  108 rendered module-persona pairs
  13 rendered selectable WeChat style choices
  0 SVG safety, sentinel, slot, surface, pipeline, option, or style-sample issues
```

### Native visual evidence

- A real Tauri/WebView2 development process loaded the operator's existing local
  article; no article or component proof data was injected.
- The seven canonical Variants plus V7 playful mode were selected through the real
  Export dialog and captured as one local-only contact sheet.
- The initial paragraph-only comparison failed because V1-V5 were too similar. The
  shared masthead/paragraph fix was applied, hot-reloaded, and recaptured; the final
  comparison shows distinct masthead, rail, border, spacing, paper, and type rhythm.
- The contact sheet remains in the local temporary directory only because it contains
  operator article metadata and must not be committed.

### Explicit external boundary

- `style-proof:release-preflight` remains `blocked-by-external` for WeChat phone
  preview, Dark Mode, cover thumbnail, credentialed channel, scheduled send, and
  publication proof.
- This is not an application-renderer failure. The user-defined current-round target
  is the local software plus WeChat-safe selectable rendering surface; Xiaohongshu
  and Zhihu publication is manually deferred.

### Packaged Release acceptance

```text
pnpm -C inkforge tauri:build:
  passed

release executable:
  inkforge/src-tauri/target/release/InkForge.exe
  size: 17,686,016 bytes
  SHA-256: 116F503361FA0EC7E91E3A979179D0C5696E64D58FB01FBFDB6F6349B3171A30

MSI:
  inkforge/src-tauri/target/release/bundle/msi/InkForge_0.1.0_x64_en-US.msi
  size: 219,467,776 bytes
  SHA-256: FEF7054E538D3EB21BAEC470CF0F0D30E81C95854DE52EC56CF575023B6CA20F

NSIS:
  inkforge/src-tauri/target/release/bundle/nsis/InkForge_0.1.0_x64-setup.exe
  size: 220,916,432 bytes
  SHA-256: 9958B20BAC8BA6271AAB99DD57D5AD9043A7F9FC7ECEF7F83C55468CED730A13
```

- The exact Release executable was launched without a Vite server and remains
  available for operator testing.
- The packaged Workstation loaded existing local content. The real Export dialog was
  opened and its native WebView2 accessibility controls selected all seven canonical
  directions plus V7 playful mode.
- One release-only batch contact sheet was visually reviewed. The eight panels are
  distinguishable by masthead composition, heading axis, paragraph rhythm, rail and
  border geometry, type role, and palette. It remains local-only because it contains
  operator article metadata.
- The installed local Release corpus currently provides one real article, so the
  planned three-article and 375/393/677 long-page matrix is not claimed. No sample
  article was inserted to make the count appear complete.
- Actual WeChat desktop paste/readback, phone rendering, credentialed sync, schedule,
  and publication remain operator/external proof and are not claimed by this batch.

### Independent review and post-review correction

- Correctness/security review found that `RenderOverrides.primaryColor` could break
  out of generated `<style>` blocks because the value was interpolated after HTML
  sanitization. A shared strict six-digit HEX normalizer now protects the unified
  converter and all three direct platform converters. The follow-up review also found
  and closed the direct WeChat `preset.primaryColor` bypass. Invalid overrides preserve
  the selected preset color; an invalid direct preset color falls back to safe brand red.
- A real malicious style-breakout payload is covered through WeChat, Xiaohongshu,
  and Zhihu public conversion paths. Focused regression: `419/419` passed. Full
  export service regression: `48 files / 1439 tests` passed.
- Unknown WeChat legacy IDs now fall back to the application default
  `DEFAULT_PRESET_ID` (`report`) instead of the unrelated `thesis` preset.
- Scope/evidence review keeps these gates open: canonical Variant/Profile UI
  persistence, seven distinct native XHS/Zhihu compositions, the three-real-article
  by three-width matrix, task-isolated clean-tree packaging, signed installer
  installation, and external WeChat paste/phone/sync/publish evidence. It also keeps
  open a privacy-redacted auditable contact sheet/build-log manifest, end-to-end proof
  for all ten Profiles and eighteen writing components including TipTap/Source
  round-trip and autosave, all WebView2 surface checks, actual WeChat copied-source
  inspection, and an exact task-slice/source-revision manifest.
- The local Release is a real runnable software artifact built from the current
  aggregate working tree. It is not claimed as a clean task-isolated release or a
  signed distribution artifact.
