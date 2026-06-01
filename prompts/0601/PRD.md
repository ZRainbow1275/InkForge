# PRD — 多平台渲染排版突破：微信公众号 / 小红书 / 知乎 + SVG 高级排版

- **任务**：`.trellis/tasks/06-01-multiplatform-render-svg`
- **分支基线**：`dev/visual-fixes`
- **日期**：2026-06-01
- **状态**：需求已收敛（brainstorm 完成，4 项关键决策已锁定）
- **配套**：`prompts/0601/SPEC.md`（技术契约）、`prompts/0601/research/*.md`（5 份一手调研）

---

## 0. 一句话目标

在**不重构主管线、不删除任何现有功能/模块/组件**的前提下，为 InkForge 落地一套 **WeChat-safe、参数化、可复用、契合「静谧刊印 Quiet Press」品牌哲学、不与市面任何排版雷同**的 **inline-SVG 高级排版组件系统**，并按三平台真实渲染能力分别落地（微信 inline-SVG 旗舰 / 小红书 SVG→海报图 / 知乎 SVG-as-img 优雅适配）。**务必保持真实**：真实渲染、真实跑通、零 mock、零模拟数据。

---

## 1. 背景与现状（实地勘察结论）

活体应用树为 `inkforge/`（非根 `src/`，后者为 2026-01-30 遗留旧树）。当前导出系统已相当成熟：

- **微信管线** `inkforge/src/services/export/wechat.ts:1158-1367`：15 步转换链（marked→DOMPurify→highlight.js→alerts→footnotes→`section#nice`→注入 CSS→**juice 内联**→`applyHeadingDecorations`→**`preset.decorate(html,'wechat')`**→`enhanceTableStyles`→`postProcessForWechat`→`enforcePlatformCSS('wechat')`→`wechatComplianceTransform`）。
- **装饰系统** `preset-decorations.ts`（664 行）：`{previewCSS, exportCSS, decorate(html,target)}` 配方契约，9 个 recipe + 12 个 preset 专属 helper，所有 decorate 幂等（class 哨兵）。**这是 SVG 注入的天然挂载点。**
- **平台能力矩阵** `platform-css.ts`：微信 `flexbox/grid/transform/transition/filter/customProperties/mediaQuery/calc:false`，`boxShadow/gradient(CSS)/borderRadius/opacity:true`。
- **预设**：微信 12（`themes.ts`）+ 小红书 5（`xiaohongshu.ts`）+ 知乎 3（`zhihu.ts`），各带 `persona/fonts/primaryColor/decorate`。
- **20-22 字/行已落地**：`preset-fonts.ts:203` `max-width:min(22em,calc(100vw-32px))` + `font-size:17px`（22×17=374px）+ `WorkstationView.vue:4344` `.preview-device-frame{width:375px}`。
- **预览保真层** `preview-fidelity/{wechat,xhs,zhihu}-mock.ts`：近似平台真实渲染供应用内预览（**非假数据，是必要特性，禁止删除**）。
- **SVG 现状**：微信路径经 DOMPurify 显式剥所有 SVG（白名单无 svg），Mermaid 在 sanitize 前降级为文本占位；预览 DOMPurify（`MarkdownPreview.vue:35-38`）放行 `svg/g/path/rect/circle/text/tspan` 等但无 `linearGradient/foreignObject`。
- **图标库**：唯一 `lucide-vue-next`（`utils/iconography.ts` 集中映射），**全程禁用 emoji 图标**。

> 详见 `research/codebase-export-pipeline.md`。

---

## 2. 调研关键结论（决定设计的硬约束）

来自三个生产级仓库（`S-N-Lewis/wechat-apple-layout`、`Yuezi32/weixin_svg_demo`、`cailven/opensvg`）+ MDN 的一手交叉验证（详见 `research/wechat-svg-capabilities.md`）：

**微信安全 SVG 子集（铁律）**
- ✅ **存活**：`<svg viewBox width="100%">`、`<g>/<path>/<rect>(rx/ry)/<circle>/<text>(每行一个)`、`fill(hex/rgba)/stroke/stroke-width/opacity/transform(属性或style)/font-*(设备字体)/pointer-events`、`<section>` 包裹、`height:0`+viewBox 自适应高度、`background-image` 内联、CSS `scroll-snap` 横滑、SMIL `<animate>/<set>/<animateTransform>` + `begin="click"` + `fill="freeze"` + `restart="never"`。
- ❌ **死亡**：`<style>`、class、`var()`、`calc()`、`<div>`、`foreignObject`、外链 `<image href>`、JS、CSS `@keyframes/transition/animation`、`<video>/<audio>/<iframe>`、`begin="touchstart/mouseover"`。
- ⚠️ **不可靠**（依赖 `id`，微信粘贴/发布会剥 `id`）：`<defs>/<linearGradient>/<radialGradient>/<clipPath>/<mask>/<filter>/<feGaussianBlur>/<use>/<symbol>/fill="url(#id)"` → **用实色 + 低透明度叠加代替渐变/滤镜/光晕**。
- **暗黑模式免疫**：深色 SVG 内必带自有不透明背景 `<rect>`；每个文本节点显式 `fill`。
- **必备脚手架**：顶部隐藏全文 `<p>`（无障碍/SEO）+ 末尾 `<p style="display:none"><mp-style-type data-value="10000"></mp-style-type></p>` 尾标。
- **几何**：1080px 宽 viewBox 创作，`width:100%` 缩放，**绝不设固定 px 外层 `width/height`**。

**平台真实能力**（详见 `research/xhs-zhihu-cjk-typography.md`）
- **小红书**：正文仅纯文本 + #标签，**不接受富 HTML/CSS/inline SVG**；设计=栅格图（封面 3:4 1080×1440 / 内容 1:1 1080×1080，≤18 图，安全边距）。SVG 只能以**栅格化 PNG** 入图。
- **知乎**：受限富文本，接受 Markdown/HTML 子集（标题/粗体/列表/引用/代码块/表格/图片/官方 LaTeX→img），**剥所有自定义 CSS/class/style/inline SVG/脚本**。SVG 装饰只能走 **SVG-as-img**（PNG data-URI）。
- **CJK 可读性**：W3C CLReq 正文 17-40 字（典型），20-22 为移动端最佳；doocs/md 默认 16px/line-height 1.75/letter-spacing 0.1em/宽 375px；mdnice 16px/26px/3px。

**架构与集成**（详见 `research/oss-md-architecture.md`、`research/wechat-svg-typesetting-patterns.md`）
- 秀米/135 的「SVG 互动」≠ 用户裸写 SVG，而是预制参数化模块编译成 `<section>`+全内联样式+`<svg background-image>`+SMIL。**我们直接产出这个安全形状即正解。**
- mdnice 的 `.prefix/.content/.suffix` heading-span 脚手架是锚定 SVG 装饰的最佳借鉴。
- `Redink` 修正：它是 AI 小红书图文生成器（Flask+Vue3+Gemini），非微信 Markdown 工具，仅「分阶段管线/外置 prompt/并发降级」概念可借鉴，与渲染正交。

---

## 3. 已锁定决策（ADR-lite）

| # | 决策 | 选择 | 依据 |
|---|------|------|------|
| D1 | SVG 落地架构 | **手工参数化 inline-SVG 组件库** + 现有 `decorate()` 注入 | satori 会产出 id 依赖的 defs/渐变/foreignObject，微信全失效；手工安全子集是唯一可靠路径，且零重型依赖/零重构 |
| D2 | 平台范围 | **微信深做 + 小红书 SVG→海报图 + 知乎 SVG-as-img** | 契合各平台真实渲染能力，全部真实落地 |
| D3 | 预设策略 | **冗余双做**：增强现有 20 预设（可选 SVG 开关）**且**新增「SVG 旗舰」预设族 | 用户「冗余开发」铁律；不删/不破坏任何现有预设 |
| D4 | 动效尺度 | **全功能含 SMIL 交互**（点击切换/横滑卡片/淡入/序列帧），用静谧刊印克制视觉去做，预览/PC 留静态兜底 | 用户明确选择全交互；但视觉保持克制以「不撞市面」 |

---

## 4. 需求（Requirements）

### R1 — SVG 组件库（核心）
新建 `inkforge/src/services/export/svg-modules/`：参数化、吃 `preset.primaryColor`/`persona`/品牌 token、契合静谧刊印、可被任意预设复用。模块族（每族多变体，见 SPEC §3）：
- **R1.1 章节标题头** `header`：编号徽章 / 方括号框 / ribbon / 竖线 accent。
- **R1.2 分隔线/装饰线** `divider`：几何细线 / 点列 / opacity 渐隐 / ◇◇◇ 品牌签名线 / Forge Line。
- **R1.3 引用卡** `quote`：「」角标 / 左竖条 / 大引号 / 卡片（box-shadow）。
- **R1.4 要点/数据徽章** `badge`：圆形编号 / KPI chip / 标签。
- **R1.5 文末签名/结束标** `endmark`：「全文完」+ ◇◇◇ + vessel mark 锁版。
- **R1.6 封面/导语 banner** `cover`：标题+副题+几何装饰+暗黑免疫背景 rect。
- **R1.7 SMIL 交互族** `interactive`：点击切换 ClickSwitch / 横滑卡片 ScrollCards / 入场淡入 FadeIn / 序列帧 SequenceFrame。

### R2 — 注入复用 `decorate()`，不重构主管线
SVG 模块以 `decorate(html, target)` 契约挂载；新增 `composeSvgDecorate()` 与现有 `composeRecipes`/`chainDecorators` 并存协作。主管线 15 步不动。

### R3 — 微信存活保障
- SVG 经 juice/`postProcessForWechat`/`enforcePlatformCSS`/`wechatComplianceTransform` 后仍正确渲染：
  - 把 `<svg>`（含子树）纳入 `applyCjkLatinSpacing` 的 `OPAQUE_TAGS`，避免 U+202F 注入 SVG `<text>`。
  - 仅用安全子集（实色/opacity/几何/SMIL），不用 class、不用 `style` 内 `transform/var()/calc()`，规避下游剥除。
  - 幂等哨兵用 `data-ink-svg="<moduleId>"`（decorate 在 DOMPurify 后运行，data-* 在我方管线存活）。
- 调整契约测试 `platform-export-rendering.test.ts:222` 的 `not.toMatch(/<svg/)` 断言：允许带 `data-ink-svg` 的**有意 SVG**，仍禁止游离 Mermaid SVG。

### R4 — 真机宽度与可读性
SVG 在 375px / 677px 下 `viewBox`+`width:100%` 自适应，不破坏 20-22 字/行铁律（探针验证）。

### R5 — 预览保真（WYSIWYG）
SVG 模块在预览 `target='preview'` **照常注入 inline SVG**（安全子集浏览器原生渲染），扩展 `MarkdownPreview.vue` 预览 DOMPurify 白名单以放行所用 SVG 元素/属性（`animate/set/animateTransform`、`begin/dur/values/keyTimes/keySplines/calcMode/repeatCount/restart/attributeName/type/from/to`、`font-size/font-weight/font-family/opacity/rx/ry/pointer-events/style/data-ink-svg`）。同步增强三个 preview-fidelity mock。

### R6 — 小红书/知乎适配
- **小红书**：SVG→栅格海报卡（复用 `image-pipeline/`），3:4 / 1:1 模板，真实 canvas 栅格化（非 mock）。
- **知乎**：装饰 SVG → `<img>`（PNG data-URI 栅格化，或安全 SVG data-URI），正文走 CSS-safe 增强。

### R7 — 冗余双做预设
- 现有 20 预设：通过 `ExportOptions` 新增可选开关（如 `enableSvgModules`、模块族选择）启用 SVG 模块，默认保持现状不变（零回归）。
- 新增「SVG 旗舰」预设族：微信 ≥3 个旗舰预设（如 `flagship-kiln` 赤陶 / `flagship-tempera` 铜绿 / `flagship-amber` 黄铜），全量使用 SVG 模块系统。

### R8 — 兼容性与真实性
- SVG 走 1.1 标准子集（无 SMIL 必需依赖之外的高级特性），跨 WebView2/各 Windows 版本稳定。
- 零 mock、零模拟数据；栅格化用真实 canvas；所有逻辑真实跑通。

---

## 5. 验收标准（Acceptance Criteria）

- [ ] AC1 新增 SVG 模块在微信真机粘贴渲染正确（截图/探针证据存 `prompts/0601/evidence/`）。
- [ ] AC2 覆盖 ≥7 模块族 × 全部 persona 配色，可被任意预设复用（单测枚举）。
- [ ] AC3 20-22 字/行铁律不被破坏（e2e 探针 `getBoundingClientRect` 验证）。
- [ ] AC4 现有 12+5+3 预设 + 全部既有测试零回归（`gitnexus_detect_changes` + 全测试套件绿）。
- [ ] AC5 SMIL 交互族（点击切换/横滑/淡入/序列帧）按安全 SMIL 模式产出，预览可见、PC 有静态兜底。
- [ ] AC6 小红书海报 canvas 栅格化真实产图；知乎 SVG-as-img 真实可贴。
- [ ] AC7 新增「SVG 旗舰」预设族 ≥3 个，全量 SVG 模块，真机验证。
- [ ] AC8 单测 + 冒烟 + e2e（tauri-driver 真二进制）全绿；lint/typecheck 绿。
- [ ] AC9 SVG 输出经 WeChat-safe 校验器（`wechat-safe.ts`）零违规（无 class/style-transform/var/calc/foreignObject/id-ref）。
- [ ] AC10 全程零 emoji 图标，仅 lucide。

---

## 6. Definition of Done

- 单测/集成/e2e 新增或更新且全绿；`pnpm lint`/`pnpm typecheck` 绿。
- `prompts/0601/` PRD + SPEC 完备；真机渲染证据留档 `prompts/0601/evidence/`。
- `gitnexus_impact` 对每个改动符号已跑；`gitnexus_detect_changes()` 范围核对仅触及预期符号。
- 不同 Windows/WebView2 版本可运行（SVG 走标准子集 + 静态兜底）。
- 完成报告：spec 要求逐条核对完成。

---

## 7. Out of Scope（明确禁止）

- 大规模重构主渲染管线 / 删除既有预设/组件/功能（**绝对禁止**）。
- 引入重型运行时（satori/puppeteer 等）做 HTML→SVG。
- 依赖微信 `id`-引用特性（defs/渐变/clip/mask/filter/use）。
- 任何 mock/模拟数据/模拟操作。

---

## 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 微信 sanitizer 静默变更，安全子集失效 | `wechat-safe.ts` 校验器 + 真机周期性复验 + CONDITIONAL 特性一律不依赖 |
| juice/postProcess/compliance 误伤 SVG | 仅安全子集 + `<svg>` 纳入 OPAQUE_TAGS + 不用 class/style-transform；单测覆盖每步后 SVG 完整性 |
| 改动既有测试断言引入回归 | 仅放宽「有意 SVG」识别（`data-ink-svg`），保留 Mermaid 降级断言；`detect_changes` 守护 |
| SMIL 交互在 PC/预览不触发 | 静态兜底 + `begin="click"`（移动端可靠）+ 预览注入静态首帧 |
| 小红书栅格化跨机字体差异 | 海报用设备无关度量 + 安全边距 + 真实 canvas 测量 |
| 暗黑模式色彩反转 | 深色 SVG 自带不透明背景 rect + 每文本显式 fill |

---

## 9. 实施计划（小步 PR，文档驱动）

- **PR1 — 地基**：`svg-modules/{types,primitives,theme,wechat-safe}.ts` + 单测（安全子集校验器、调色板派生）。
- **PR2 — 静态模块族**：`headers/dividers/quotes/badges/endmarks/covers.ts` + 单测（每模块 × persona 快照 + safe 校验）。
- **PR3 — 注入集成**：`composeSvgDecorate` + 接入 `preset-decorations`；微信 `OPAQUE_TAGS`/契约测试调整；预览 DOMPurify 白名单 + mock 增强。
- **PR4 — SMIL 交互族**：`interactive.ts`（ClickSwitch/ScrollCards/FadeIn/SequenceFrame）+ 静态兜底 + 单测。
- **PR5 — 小红书海报 + 知乎适配**：`raster.ts` canvas 栅格化 + image-pipeline 接线 + 知乎 SVG-as-img。
- **PR6 — 冗余预设**：`ExportOptions` 开关 + 新增「SVG 旗舰」预设族（≥3）+ 迁移测试。
- **PR7 — 验证与证据**：冒烟 + e2e 探针 + 真机截图 + 完成报告。

> 实现阶段按用户要求用 `TeamCreate` 启动协同 agent team 并行开发与冲突合并；每个命题跑 ralph-loop 反复验证。

---

## 10. Research References

- `research/codebase-export-pipeline.md` — 导出管线全量测绘（含 SVG 注入点、下游风险、行号）。
- `research/wechat-svg-capabilities.md` — 微信内联 SVG 能力边界（SURVIVES/DIES/CONDITIONAL 表 + 安全子集）。
- `research/wechat-svg-typesetting-patterns.md` — 可复用 SVG 模块分类 + 高级/不撞市面设计原则。
- `research/xhs-zhihu-cjk-typography.md` — 小红书/知乎能力 + CJK 行宽可读性 cheat-sheet。
- `research/oss-md-architecture.md` — doocs/md·mdnice·Redink 架构与集成借鉴。
