# brainstorm: 多平台渲染排版突破（微信公众号 / 小红书 / 知乎 + SVG 高级排版）

> 状态：需求发现中（research-first）。本文件随调研与 Q&A 持续演进。
> 配套交付：`prompts/0601/` 下的 PRD + SPEC 文档（用户指定）。

## Goal

在**不重构、不删除任何现有功能/模块/组件**的前提下，突破并落地微信公众号 / 小红书 / 知乎三平台的渲染排版边界。核心是把 **SVG 作为微信公众号的「高级排版」渲染手段**（微信剥离 `<style>`/class/flex/grid/transform，但保留内联 SVG），打造一套**高级、大气、有设计感、不与市面任何一种排版雷同、可复用**的视觉语言；并把这套能力以契合「静谧刊印 / Ethereal Constructivism」品牌哲学的方式，叠加到现有 12 微信 / 5 小红书 / 3 知乎预设之上。**务必保持真实**：真实渲染、真实跑通、零 mock。

## What I already know（来自实地勘察）

* 渲染核心在 `inkforge/src/services/export/`：`themes.ts`（12 微信预设）、`xiaohongshu.ts`（5 预设）、`zhihu.ts`（3 预设）、`preset-decorations.ts`（装饰配方 + `decorate(html,target)` 钩子）、`preset-fonts.ts`（persona 字体 + 22em 行宽锁）。
* 「20-22 字/行」已落地：`preset-fonts.ts:203` `#nice{max-width:min(22em,calc(100vw-32px));font-size:17px}` + `WorkstationView.vue` 的 `.preview-device-frame{width:375px}` 真机预览框。
* 微信管线（`wechat.ts`）：marked→DOMPurify→highlight.js→alerts→footnotes→`<section id="nice">`→注入预设 CSS→**juice 内联**→`preset.decorate(html,'wechat')`→`postProcessForWechat`（剥离禁用标签/CSS、`replaceCssVariables`）→`enforcePlatformCSS('wechat')`→`wechatComplianceTransform`（CJK 间距 + 677px 列宽夹紧 + 暗黑模式元数据）。
* 平台 CSS 支持矩阵 `platform-css.ts`：微信 `flexbox:false, grid:false, customProperties:false, transform:false, transition:false, mediaQuery:false, calc:false`，但 `boxShadow:true, gradient:true, borderRadius:true`。
* **全项目零 `foreignObject` / 零 HTML→SVG**；SVG 仅来自 Mermaid/KaTeX。`MarkdownPreview.vue` 的 DOMPurify 白名单已放行 `svg/g/path/defs/marker/line/rect/circle/ellipse/polygon/polyline/text/tspan` 及 `viewBox/d/x/y/cx/cy/r/stroke/fill/transform`。
* 装饰配方系统（`preset-decorations.ts`）：每个配方带 `previewCSS/exportCSS/decorate()`，用真实 `<span class="ink-dc">` 等替换伪元素以在 juice/微信下存活——**这是注入 SVG 模块的天然挂载点**。
* 图标库：唯一 `lucide-vue-next`（禁用 emoji 图标，已有 `utils/iconography.ts` 映射）。
* 品牌：「静谧刊印 Quiet Press」+ `--ember`/`--paper-warm` token，ember 每屏≤2 次铁律。
* 数据模型：`services/export/types.ts`（`ExportPreset/XiaohongshuPreset/ZhihuPreset/Platform/WechatExportOptions`…）、`src/types/index.ts`（`ExportPreset/PresetPersona/ExportTarget/FontSpec`）。
* 测试齐全：`*.test.ts` 与源码同目录 + `tests/e2e/`（WebdriverIO + tauri-driver）。
* 依赖：marked15 / katex / mermaid / highlight.js / dompurify / **juice11**；无 satori/html2canvas/dom-to-image（若需 HTML→SVG 需评估引入）。

## Assumptions（待验证）

* A1：内联 SVG 在微信公众号粘贴后能稳定渲染（含 `linearGradient`、`path`、`text`），但 `foreignObject` / SMIL 动画 / 外链 `<image>` 不可靠。→ 调研 A 验证。
* A2：突破主战场是**微信**；小红书发布产物是纯文本/图片（SVG 不可入正文，但可走「SVG→海报图」），知乎是 Markdown/HTML（SVG 多以 `<img>` 公式形态）。→ 调研 C 验证。
* A3：SVG 模块应走「手工参数化组件库 + 现有 `decorate()` 钩子注入」，而非整块 HTML→SVG（保真 + 可复用 + 零重构）。→ 调研 B/D 验证。
* A4：视觉语言应从既有品牌 token 派生（不另起炉灶），以满足「不撞市面 + 契合静谧刊印」。

## Decision（ADR-lite，2026-06-01 已锁定）

调研落盘 `prompts/0601/research/`（5 份一手证据，交叉验证 `wechat-apple-layout`/`weixin_svg_demo`/`cailven/opensvg`+MDN+W3C CLReq）。4 项关键决策：

* **D1（原 Q1）SVG 架构 = 手工参数化 inline-SVG 组件库** + 现有 `decorate()` 注入。依据：satori 产出 id 依赖的 defs/渐变/foreignObject，微信剥 id → 全失效；手工安全子集是唯一可靠路径，零重型依赖、零重构。
* **D2（原 Q2）平台范围 = 微信深做 inline-SVG 旗舰 + 小红书 SVG→海报图（复用 image-pipeline）+ 知乎 SVG-as-img 适配**。依据：契合各平台真实渲染能力（小红书正文纯文本、知乎剥 inline SVG）。
* **D3（原 Q3）预设策略 = 冗余双做**：现有 20 预设加可选 SVG 开关（默认关、零回归）**且**新增「SVG 旗舰」预设族（微信 ≥3）。依据：用户「冗余开发」铁律 + 不删不破坏。
* **D4 动效尺度 = 全功能含 SMIL 交互**（点击切换/横滑卡片/淡入/序列帧），用静谧刊印克制视觉去做，预览/PC 留静态兜底。依据：用户明确选择全交互。

**Consequences**：核心交付 = `inkforge/src/services/export/svg-modules/` 新模块系统；既有文件仅加法式改动（OPAQUE_TAGS 加 svg、ExportOptions 加可选字段、追加旗舰预设、预览白名单加白、mock 末尾叠加、契约测试断言放宽）。完整契约见 `prompts/0601/SPEC.md`。

## 交付文档（prompts/0601）

* `prompts/0601/PRD.md` — 产品需求（R1-R8 / AC1-AC10 / 风险 / 7 段 PR 计划）
* `prompts/0601/SPEC.md` — 技术契约（模块结构 / 数据模型 / 安全子集 / 注入集成点 file:line / 26 变体清单 / 测试策略）
* `prompts/0601/research/*.md` — 5 份调研

## Requirements（evolving）

* R1：SVG 模块库——可复用、参数化（吃 preset 主色/persona）、契合静谧刊印；含但不限于：章节标题头、分隔线/装饰线、引用卡、要点/数据徽章、文末签名/结束标、封面/导语 banner。
* R2：注入点复用现有 `preset-decorations.ts` 的 `decorate(html,target)` 钩子，**不重构**主管线。
* R3：微信存活——SVG 经 juice/`postProcessForWechat`/`enforcePlatformCSS`/`wechatComplianceTransform` 后仍正确渲染（新增 SVG 白名单豁免，避免被误剥离）。
* R4：真机宽度——SVG 在 375px / 677px 下自适应（`viewBox` + `width:100%`），不破坏 20-22 字/行。
* R5：保留并增强现有全部预设；不删除任何现有功能/组件。
* R6：小红书 / 知乎按平台特性获得对应增强（海报图 / HTML-SVG-as-img）。

## Acceptance Criteria（evolving）

* [ ] 新增 SVG 模块在微信真机粘贴渲染正确（截图/探针证据）。
* [ ] 至少覆盖 N 类 SVG 模块 × 全部 persona 配色，且可被任意预设复用。
* [ ] 20-22 字/行铁律不被破坏（探针验证）。
* [ ] 现有 12+5+3 预设 + 全部测试零回归（`detect_changes` + 全测试套件绿）。
* [ ] 单测 + 冒烟 + e2e（tauri-driver 真二进制）全绿。

## Definition of Done

* 单测/集成/e2e 新增或更新且全绿；lint/typecheck 绿。
* `prompts/0601/` PRD + SPEC 文档完备、深度。
* 真机渲染证据留档（`prompts/0601/.../evidence/`）。
* `gitnexus_impact` 对每个改动符号已跑；`gitnexus_detect_changes` 范围核对。
* 兼容性：不同 Windows/WebView2 版本均可运行（SVG 走标准子集）。

## Out of Scope（explicit，待确认）

* 大规模重构主渲染管线 / 删除既有预设或组件（明确禁止）。
* 引入重型运行时（除非调研证明 satori 等不可或缺且零回归）。

## Research References

* `prompts/0601/research/wechat-svg-capabilities.md` — 微信内联 SVG 能力与边界（已落地，后续按平台变化持续刷新）
* `prompts/0601/research/wechat-svg-typesetting-patterns.md` — 秀米/135/mdnice 可复用 SVG 模式（已落地，后续按实机学习持续刷新）
* `prompts/0601/research/xhs-zhihu-cjk-typography.md` — 小红书海报/知乎适配/CJK 行宽可读性（已落地，硬性数值发布前继续实测校验）
* `prompts/0601/research/oss-md-architecture.md` — doocs/md·mdnice·Redink 架构集成借鉴（已落地，外部依赖版本变化时刷新）

## Technical Notes

* 关键文件：见 What I already know。注入点 = `preset-decorations.ts` 的 `decorate()`；白名单 = `postProcessForWechat`/`enforcePlatformCSS`/DOMPurify。
* 风险点：juice 会内联/剥离 `<style>`；`postProcessForWechat` 的 `unsupportedProps` 与 class 剥离可能误伤 SVG → 需 SVG 豁免逻辑。
* 兼容性：SVG 走 1.1 标准子集（无 SMIL/foreignObject 依赖），跨 WebView2 版本稳定。

## 2026-07-04 Scope Amendment

The operator cancelled automated Xiaohongshu/Zhihu publish-side testing for this round and will
test those platforms manually. Do not delete or weaken existing Xiaohongshu/Zhihu renderers,
artifact manifests, degradation rules, or lower-level proof contracts; only defer their
publish-side automation from the current round gate.

Current-round completion target:

- The application can apply all project-owned SVG rendering modules in the local WeChat-safe
  rendering surface.
- Every currently usable WeChat style-catalog row under default local evidence is selectable
  through an InkForge-owned application mapping.
- The WeChat application surface remains safe and applicable to the official-account HTML/SVG
  export/copy pipeline without claiming account, phone, sync, schedule, or publish proof.
- `style-proof:release-preflight --scope=application --json` is the machine-readable gate for this
  narrowed local target.

External/manual proof that remains outside this round's automatic completion claim:

- WeChat ordinary paste, phone preview, mobile Dark Mode, mobile interaction, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public rendering, and publish
  success.
- Xiaohongshu/Zhihu account upload, platform preview, scheduled send, public-host acceptance, and
  publish success.
