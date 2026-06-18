# SPEC — Inline-SVG 高级排版组件系统（实现契约）

- **任务**：`.trellis/tasks/06-01-multiplatform-render-svg` · 基线 `dev/visual-fixes`
- **配套**：`prompts/0601/PRD.md`、`prompts/0601/research/*.md`
- **目标树**：`inkforge/`（活体）。所有路径以 `inkforge/src/...` 为根。
- **铁律**：不重构主管线、不删除任何现有功能/组件；零 mock；全程 lucide、零 emoji。

---

## 1. 模块物理结构（新增，不动既有文件结构）

```
inkforge/src/services/export/svg-modules/
├── index.ts            # 注册表 + composeSvgDecorate + 公共导出
├── types.ts            # SvgThemeContext / SvgPalette / SvgModuleParams / SvgModuleSpec
├── theme.ts            # 从 primaryColor+persona+品牌token 派生 SvgPalette
├── primitives.ts       # 安全 SVG 原子构造器 + 脚手架 + section 包裹
├── wechat-safe.ts      # 安全子集校验器（assertWechatSafe / sanitizeSvgForWechat）
├── headers.ts          # R1.1 章节标题头（≥4 变体）
├── dividers.ts         # R1.2 分隔线/装饰线（≥5 变体）
├── quotes.ts           # R1.3 引用卡（≥4 变体）
├── badges.ts           # R1.4 要点/数据徽章（≥3 变体）
├── endmarks.ts         # R1.5 文末签名/结束标（≥3 变体）
├── covers.ts           # R1.6 封面/导语 banner（≥3 变体）
├── interactive.ts      # R1.7 SMIL 交互族（ClickSwitch/ScrollCards/FadeIn/SequenceFrame）
├── raster.ts           # SVG→PNG（canvas）供小红书海报/知乎 SVG-as-img
├── inject.ts           # decorate 钩子：扫描 HTML 锚点替换为 SVG 模块（幂等）
└── __tests__/
    ├── wechat-safe.test.ts
    ├── theme.test.ts
    ├── primitives.test.ts
    ├── modules.snapshot.test.ts   # 每模块 × persona 快照 + safe 校验
    ├── inject.test.ts             # 幂等 + 锚点替换 + 三平台分支
    ├── interactive.test.ts        # SMIL 模式合规 + 静态兜底
    └── raster.test.ts             # canvas 栅格化真实产图
```

既有文件**仅做加法式改动**（见 §5），不删函数、不改既有签名语义。

---

## 2. 数据模型（types.ts）

```ts
import type { PresetPersona, ExportTarget } from '@/types'

export interface SvgPalette {
  ink: string         // 正文/主文字色（深）
  inkSoft: string     // 次文字 rgba
  accent: string      // = preset.primaryColor
  accentSoft: string  // 低透明度 accent（rgba，渐变/光晕替代）
  paper: string       // 背景（亮）
  paperWarm: string   // 品牌 --paper-warm
  ember: string       // 品牌 --ember（每屏≤2 次铁律，模块层自律）
  hairline: string    // 细线/分隔
  onAccent: string    // accent 上的文字色（通常 #fff）
}

export interface SvgThemeContext {
  primaryColor: string
  persona: PresetPersona
  accentColor?: string        // xhs/zhihu secondary
  target: ExportTarget        // 'preview' | 'wechat' | 'xhs' | 'zhihu'
  palette: SvgPalette
  /** 是否允许 SMIL（preview/wechat 允许；xhs/zhihu 栅格化时取静态首帧） */
  allowMotion: boolean
}

export interface SvgModuleParams {
  theme: SvgThemeContext
  text?: string
  subtitle?: string
  index?: number              // 编号徽章
  items?: { title: string; body?: string }[]  // scroll/sequence
  variant?: string            // 模块族内变体 id
}

export type SvgModuleRenderer = (p: SvgModuleParams) => string  // 返回安全 HTML 片段

export type SvgModuleFamily =
  | 'header' | 'divider' | 'quote' | 'badge' | 'endmark' | 'cover' | 'interactive'

export interface SvgModuleSpec {
  id: string                  // 全局唯一，用作 data-ink-svg 值
  family: SvgModuleFamily
  description: string
  render: SvgModuleRenderer
  interactive?: boolean       // 是否含 SMIL（需 allowMotion）
  /** preview/wechat 直出 inline；xhs/zhihu 需 raster() 包成 <img> */
  rasterizeOn?: ExportTarget[]  // 默认 ['xhs','zhihu']
}
```

**约束**：`render` 返回值必须通过 `assertWechatSafe()`（开发期/测试期断言）。`SvgModuleParams.theme.target` 决定输出形态。

---

## 3. 调色板派生（theme.ts）

```ts
export function deriveSvgPalette(primaryColor: string, persona: PresetPersona, accentColor?: string): SvgPalette
export function buildThemeContext(opts: {
  primaryColor: string; persona: PresetPersona; target: ExportTarget; accentColor?: string
}): SvgThemeContext
```

规则：
- `accent = primaryColor`；`accentSoft = rgba(accent, 0.08~0.12)`（渐变/光晕替代，**不用 SVG 渐变**）。
- `paper=#FFFFFF`、`paperWarm` 取品牌 `--paper-warm`（从 `docs/inkforge-brand-identity.md` 同步常量，不新造）。
- `ember` 取品牌 `--ember`；模块层遵守**每屏 ≤2 次 ember** 自律（endmark/cover 各最多 1 处点缀）。
- `ink=#1a1a1a`（与 `preset-fonts.ts` 一致）、`hairline=rgba(ink,0.12)`。
- 颜色全部输出为 **hex 或 rgba**（微信安全；**禁止 `var()`**）。
- persona 影响装饰密度与字体族（复用 `PERSONA_FONTS`，不新造字体）。

`deriveSvgPalette` 必须是**纯函数**（同输入同输出，便于快照测试与幂等）。

---

## 4. 安全原子与校验器

### 4.1 primitives.ts — 安全构造器（只产安全子集）

```ts
// 几何
rect(attrs): string            // 支持 x/y/width/height/rx/ry/fill/stroke/stroke-width/opacity/transform(属性)
circle(attrs): string
path(d, attrs): string
hairlineRule(opts): string     // = <rect height="1">，分隔线专用
glow(cx,cy,r,colorSoft): string// 大半径低透明度 <circle>，替代 filter 光晕
textLine(opts): string         // 单行 <text>（每视觉行一个），强制显式 fill + 设备字体
diamondSig(opts): string       // ◇◇◇ 品牌签名（<path>/<rect> 旋转 45°）
// 包裹与脚手架
svgSection(opts): string       // <section style="...inline...;height:0?"> + <svg viewBox width="100%">
hiddenFulltext(text): string   // 顶部隐藏全文 <p>（无障碍/SEO）
mpStyleTrailer(): string       // 末尾 <p style="display:none"><mp-style-type data-value="10000"></mp-style-type></p>
darkSafeBg(w,h,color): string  // 深色模块自有不透明背景 <rect>
// SMIL（仅 interactive 用）
smilAnimate(opts): string      // begin/dur/values/keyTimes/keySplines/calcMode/fill="freeze"/restart="never"
smilSet(opts): string
smilAnimateTransform(opts): string
```

**硬规则（编码进构造器）**：
- 外层 `<svg>` 必带 `viewBox`、`width="100%"`，**绝不**设固定 px `width/height`。
- 包裹一律 `<section>`，**绝不** `<div>`。
- 颜色/样式只走表现属性或内联 `style`，**禁止** class、`<style>`、`var()`、`calc()`、`style` 内 `transform/transition/filter/animation`。
- `transform` 只以 **XML 属性**形式（`transform="translate(..)"`），不以 `style="transform:.."`（后者被 `enforcePlatformCSS` 剥）。
- 不产 `<defs>/<linearGradient>/<clipPath>/<mask>/<filter>/<use>/foreignObject/<image href>`。
- 每个模块根节点带 `data-ink-svg="<moduleId>"` 幂等哨兵。

### 4.2 wechat-safe.ts — 校验器

```ts
export interface SafeViolation { rule: string; detail: string }
export function checkWechatSafe(svgHtml: string): SafeViolation[]   // 空数组=合规
export function assertWechatSafe(svgHtml: string): void             // 测试/开发期抛错
```

检测项（违规即非空）：含 `class=`、`<style`、`var(`、`calc(`、`<div`、`foreignObject`、`<linearGradient|<radialGradient|<defs|<clipPath|<mask|<filter|<use|<symbol`、`url(#`、`style="[^"]*transform`、`@keyframes`、`<script`、外层 svg 固定 px `width="\d`、`xlink:href`、`begin="touchstart|mouseover`。
> 该校验器是 AC9 的执行体，单测全模块输出零违规。

---

## 5. 注入集成（不重构主管线）

### 5.1 inject.ts — decorate 钩子

```ts
export interface SvgInjectionPlan {
  headings?: { level: 1|2|3; module: string }[]  // 标题→标题头模块
  replaceHr?: string                              // <hr>→分隔线模块
  blockquote?: string                             // blockquote→引用卡
  endmark?: string                                // 文末追加结束标
  cover?: string                                  // 文首插入封面/导语
}

/** 返回一个符合现有 decorate(html,target) 契约的函数 */
export function composeSvgDecorate(plan: SvgInjectionPlan, theme: {
  primaryColor: string; persona: PresetPersona; accentColor?: string
}): (html: string, target: ExportTarget) => string
```

行为：
- 扫描 HTML 锚点（`<h1-3>`/`<hr>`/`<blockquote>`/文档首尾）按 plan 替换/包裹为 SVG 模块。
- **幂等**：替换前检测 `data-ink-svg`，已注入则跳过（哨兵在 DOMPurify 后注入，data-* 在我方管线存活）。
- **目标分支**：`preview`/`wechat` → 直出 inline SVG；`xhs`/`zhihu` → `render()` 后经 `raster.ts` 包成 `<img src="data:image/png;base64,...">`（知乎可选 SVG data-URI）。
- 与现有 `composeRecipes().decorate` 用 `chainDecorators(existing, svgDecorate)` 串联——**SVG 注入叠加在既有装饰之后，互不破坏**。

### 5.2 接线 `preset-decorations.ts`（加法）
- 新增导出，不改既有 9 recipe / 12 helper 的签名与行为。
- 预设可在其 `decorate` 中 `chainDecorators(原有, composeSvgDecorate(plan, theme))`。

### 5.3 微信管线保护（`platform-rules/wechat.ts`，加法）
- `OPAQUE_TAGS`（@54）**新增 `svg`**（连同子树视为不透明），使 `applyCjkLatinSpacing` 不向 SVG `<text>` 注入 U+202F。需保证 `tokenize()` 对 `<svg>...</svg>` 整段跳过。
- 不改 `clampContentWidth`/`injectDarkModeMetadata` 行为。

### 5.4 契约测试调整（`platform-export-rendering.test.ts:222`）
- 原断言 `not.toMatch(/<svg\b|<text\b|\sclass=/i)` 改为：
  - 仍断言**无游离 Mermaid SVG**（无 `class="mermaid`、无未带 `data-ink-svg` 的 `<svg>`）；
  - **允许**带 `data-ink-svg` 的有意 SVG；
  - 仍断言全局无 `class=`（我方 SVG 不用 class）。
- 新增用例：注入标题头/分隔线后，输出含 `data-ink-svg` 且 `checkWechatSafe()` 零违规。

### 5.5 预览白名单（`MarkdownPreview.vue:35-38`，加法）
`ADD_TAGS` 增 `animate/set/animateTransform`；`ADD_ATTR` 增 `begin/dur/values/keyTimes/keySplines/calcMode/repeatCount/repeatDur/restart/attributeName/attributeType/type/from/to/font-size/font-weight/font-family/opacity/rx/ry/pointer-events/style/data-ink-svg/text-anchor/dominant-baseline`。
> 仅加白名单，不动既有安全策略；导出路径 DOMPurify 不变（SVG 在 decorate 后注入，绕过导出 DOMPurify，由 `wechat-safe` 把关）。

### 5.6 预览保真增强（`preview-fidelity/*-mock.ts`，加法）
三个 mock 在渲染预览时让 SVG 模块原样呈现（wechat-mock 直出 inline；xhs/zhihu-mock 呈现栅格 `<img>` 或安全 SVG）——**不删既有逻辑**，仅在管线末尾叠加 SVG 模块呈现。

---

## 6. 小红书海报 / 知乎适配（raster.ts）

```ts
export interface RasterOptions { width: number; height: number; scale?: number; background?: string }
/** 真实 canvas 栅格化：SVG 字符串 → PNG dataURL（无 mock） */
export async function rasterizeSvg(svgHtml: string, opts: RasterOptions): Promise<string>
/** 小红书海报卡：封面 3:4(1080×1440) / 内容 1:1(1080×1080) */
export async function renderXhsPosterCard(module: SvgModuleSpec, p: SvgModuleParams, ratio: '3:4'|'1:1'): Promise<string>
```

实现：
- 浏览器/Tauri WebView 下用 `new Image()` 载入 `data:image/svg+xml;utf8,<svg>` → `canvas.drawImage` → `toDataURL('image/png')`。**真实渲染**，跨机用设备无关度量 + 安全边距。
- 小红书：SVG 模块取静态首帧（`allowMotion=false`），栅格成海报图，经 `image-pipeline/` 资源流转（复用现有 `asset-resolver`/`dimension-extractor`）。
- 知乎：装饰 SVG → `<img src=PNG dataURL alt="...">`（默认）或安全 SVG data-URI；正文 CSS-safe 增强（`zhihu.ts` 现有路径）。

---

## 7. 冗余预设（R7）

### 7.1 现有 20 预设可选开关
- `ExportOptions`（`services/export/types.ts:105-134`）**新增可选字段**（不破坏既有）：
  ```ts
  enableSvgModules?: boolean          // 默认 false → 现状零回归
  svgInjectionPlan?: SvgInjectionPlan // 细粒度控制注入哪些模块
  ```
- 关闭时（默认）管线行为与今天完全一致（迁移测试守护）。

### 7.2 新增「SVG 旗舰」预设族（微信 ≥3）
- `flagship-kiln`（赤陶 Kiln，creative）、`flagship-tempera`（铜绿 Tempera，academic）、`flagship-amber`（黄铜 Amber，business）。
- 全量使用 SVG 模块系统（标题头/分隔/引用卡/结束标/封面 + 至少一个 SMIL 交互），`primaryColor`/`fonts`/`persona` 取品牌色板。
- 进 `themePresets[]`（追加，不改既有 12 个）；图标走 `iconography.ts`（新增 lucide 映射，禁 emoji）。
- `themes-migration.test.ts` 扩展：旗舰预设双轨 schema 合规。

---

## 8. 模块变体清单（R1 细化，实现时按此交付）

| 族 | 变体 id | 视觉 | 安全要点 |
|----|---------|------|----------|
| header | `header-badge-num` | 圆形编号 + 标题 + 细线 | circle+text+rect(1px) |
| header | `header-bracket` | 方括号框标题 | path 折线 + text |
| header | `header-ribbon` | 实色 ribbon 标题条 | rect + text + onAccent |
| header | `header-vrule` | 左竖线 accent + 标题 | rect(竖) + text |
| divider | `divider-grid` | 构成主义网格细线 | 多 rect(1px) |
| divider | `divider-dots` | 点列 | 多 circle |
| divider | `divider-fade` | opacity 渐隐线 | rect + opacity 梯度（多段实色，非渐变） |
| divider | `divider-diamond` | ◇◇◇ 品牌签名线 | diamondSig + rect |
| divider | `divider-forge` | Forge Line（品牌） | path + 低透明 glow |
| quote | `quote-corner` | 「」角标卡 | path 角 + text/原文 |
| quote | `quote-vbar` | 左竖条引用 | rect + 原 blockquote 内容 |
| quote | `quote-mark` | 大引号 | path 引号 + text |
| quote | `quote-card` | 卡片(box-shadow) | rect + box-shadow(微信支持) |
| badge | `badge-num` | 圆形编号徽章 | circle + text |
| badge | `badge-kpi` | KPI chip | rect(rx) + text×2 |
| badge | `badge-tag` | 标签 | rect(rx) + text |
| endmark | `endmark-fin` | 「全文完」+ ◇◇◇ | text + diamondSig |
| endmark | `endmark-vessel` | vessel mark 锁版 | path(鼎×笔尖×方格) + text |
| endmark | `endmark-rule` | 细线 + 署名 | rect + text |
| cover | `cover-title` | 标题+副题+几何 | darkSafeBg + text×2 + 几何 |
| cover | `cover-grid` | 构成主义网格封面 | 网格 rect + text |
| cover | `cover-quote` | 导语式封面 | quote-mark + text |
| interactive | `i-clickswitch` | 点击切换 A→B | SMIL animate opacity begin=click fill=freeze |
| interactive | `i-scrollcards` | 横滑卡片 | section scroll-snap + 子卡 |
| interactive | `i-fadein` | 入场淡入 | SMIL animate begin=0s |
| interactive | `i-sequence` | 序列帧 | SMIL set/animate 多帧 |

> vessel mark 几何复用品牌「鼎×笔尖×方格」定义（见 `feedback_logo_flag_trap`/`feedback_icon_brand_faithful` 记忆与 brand doc），**水平条纹构图禁用**（国旗陷阱）。

---

## 9. 测试策略（TDD + 冒烟 + e2e）

### 9.1 单测（vitest，co-located）
- `wechat-safe.test.ts`：正/负样本，每禁用构造命中违规。
- `theme.test.ts`：`deriveSvgPalette` 纯函数性、rgba 合法、ember 自律。
- `primitives.test.ts`：每构造器输出含必备属性、无禁用构造、viewBox 存在。
- `modules.snapshot.test.ts`：26 变体 × 4 persona 快照；每条 `assertWechatSafe` 通过；含 `data-ink-svg`。
- `inject.test.ts`：锚点替换正确；**幂等**（跑 2 次输出相同）；三平台分支（wechat=inline / xhs/zhihu=img）。
- `interactive.test.ts`：SMIL 属性合规（fill=freeze/restart=never/begin∈{click,Ns,id.end}）；`allowMotion=false` 取静态首帧。
- `raster.test.ts`：`rasterizeSvg` 真实产出 PNG dataURL（非空、`image/png`、尺寸正确）。
- **回归**：既有 `platform-export-rendering`/`pipeline-cross-platform`/`preset-decorations`/`themes-migration` 全绿（仅按 §5.4 调整必要断言）。

### 9.2 冒烟
- `pnpm build`（串行，限 node 内存，避免 OOM）→ 构建通过。
- 脚本级：对每个旗舰预设跑 `markdownToWechat(sample)` → `checkWechatSafe()` 零违规 + 含 SVG。

### 9.3 e2e（`tests/e2e/`，tauri-driver 真二进制）
- 探针 `probes/svg-render.cjs`：在真 Tauri 内渲染含 SVG 模块的预设，`getBoundingClientRect` 验证：
  - 正文每行 ≈20-22 字（AC3，复用现有 375px 真机框探针法）。
  - SVG 模块可见（width>0/height>0）、viewBox 生效、`width:100%` 自适应。
  - SMIL 交互首帧存在；点击后状态变化（如可触发）。
- 截图证据落 `prompts/0601/evidence/`（真机粘贴另需手动微信验证，留档）。

### 9.4 兼容性
- SVG 走 1.1 子集 + SMIL 标准；PC/预览静态兜底；跨 WebView2 版本验证（at least 当前 Win11 + 文档化最低版本）。

---

## 10. 实现顺序与 gitnexus 纪律

按 PRD §9 的 PR1→PR7。每个改动符号**先 `gitnexus_impact({target, direction:"upstream"})`**，HIGH/CRITICAL 风险先告警；提交前 `gitnexus_detect_changes()` 核对范围。改既有符号（如 `OPAQUE_TAGS`、`ExportOptions`、契约测试）前必跑 impact。重命名走 `gitnexus_rename`。

新增文件为主（低风险）；既有文件改动清单（加法）：
- `platform-rules/wechat.ts`（OPAQUE_TAGS 加 svg）
- `services/export/types.ts`（ExportOptions 加可选字段）
- `themes.ts`（追加旗舰预设）
- `preset-decorations.ts`（加导出/接线，不改既有）
- `MarkdownPreview.vue`（预览白名单加白）
- `preview-fidelity/*-mock.ts`（末尾叠加 SVG 呈现）
- `iconography.ts`（旗舰预设图标映射，lucide）
- 既有相关 `*.test.ts`（§5.4 断言放宽 + 新增用例）

---

## 11. 完成判据映射（对齐 PRD AC）

| AC | 由谁证明 |
|----|----------|
| AC1 微信真机渲染 | e2e 探针 + 手动真机截图（evidence/） |
| AC2 ≥7 族×persona 可复用 | modules.snapshot.test |
| AC3 20-22 字/行 | e2e probes/svg-render |
| AC4 零回归 | 全既有测试绿 + detect_changes |
| AC5 SMIL+静态兜底 | interactive.test + e2e |
| AC6 海报/SVG-as-img | raster.test + 冒烟 |
| AC7 旗舰预设≥3 | themes-migration.test + 冒烟 |
| AC8 全测试绿 | vitest + wdio + lint + typecheck |
| AC9 safe 校验零违规 | wechat-safe.test + 冒烟 |
| AC10 零 emoji | iconography 审查（lucide-only） |

---

## 2026-06-18 Addendum: Kiln Paste-Safe Candidate

`flagship-kiln-paste-safe` is an additive WeChat flagship candidate. It does not replace or modify
the original `flagship-kiln` preset, `cover-grid` module, or any existing SVG module.

Contract:

- The candidate keeps the Kiln palette, creative persona, Forge divider, and flagship HTML block
  decorator chain.
- The candidate changes only the first SVG cover module from `cover-grid` to `cover-title`, because
  the exact original Kiln artifact has current WeChat ordinary Ctrl+V negative proof while the
  `cover-title` first-block shape has stronger paste precedent.
- The style catalog choice is `wechat-flagship-kiln-paste-safe` and maps to the real
  `flagship-kiln-paste-safe` preset.
- The artifact `prompts/0601/evidence/wechat-paste/flagship-kiln-paste-safe.html` is generated by
  the real flagship emitter and has SHA-256
  `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`,
  `svgCount=35`, `dataInkSvgCount=3`, and `dataInkBlockCount=23`.
- The local CloakBrowser Windows CF_HTML + `keybd_event` contenteditable probe is local readiness
  only. It must not satisfy WeChat `pc-editor-paste-event`, `safe-disposable-draft`,
  `ordinaryClipboardPasteVerified:true`, phone preview, Dark Mode, cover thumbnail, sync, schedule,
  publish, XHS upload, or Zhihu public-host gates.

Required regression:

- `flagship-kiln` continues to render `cover-grid`.
- `flagship-kiln-paste-safe` renders `cover-title` plus `divider-forge`.
- Theme migration, preset decoration, flagship SVG, artifact emitter, pipeline smoke, style catalog,
  iconography, lint, typecheck, and build gates must include the candidate without deleting any
  existing preset or module.

## 2026-06-18 Addendum: WeChat Ctrl+V Tab Identity Gate

Live WeChat ordinary OS Ctrl+V proof must establish tab identity before the paste:

- The visible Windows foreground tab that receives OS keyboard input and the CloakBrowser DOM
  readback target must be the same WeChat editor.
- Multiple open WeChat editor tabs are an abort condition unless non-target tabs are closed or
  navigated away before the OS input run.
- A wrong-tab insertion cannot be converted into success by reading a different tab's DOM or by
  citing large SVG/block counts from the wrong tab.
- Mojibake/replacement-character damage, duplicated source artifact counts, empty-title wrong-tab
  insertion, or title/body mismatch keeps `pc-editor-paste-event` invalid.
- Any current-run wrong-tab residue must be cleaned up by deterministic title or content
  fingerprint, and the cleanup must be verified by post-delete absence checks before the failed
  attempt can be cited as safe cleanup evidence.
- Same-tab focus is still not sufficient by itself. If the body editor is focused and OS key events
  are sent but no paste/input event or body DOM mutation occurs, `pc-editor-paste-event` remains
  invalid.
- Local proof manifests now encode this as bound artifact flags. One same `platform-editor` /
  `pc-paste` artifact must carry `ordinaryClipboardPasteVerified:true`,
  `sameEditorTabVerified:true`, `pasteInputEventVerified:true`,
  `editorBodyMutationVerified:true`, and `mojibakeFreeVerified:true`; flags split across multiple
  artifacts remain invalid.

Recorded evidence:

- `wechat-kiln-paste-safe-wechat-ctrlv-tab-mismatch-cleanup-20260618.txt` is the current negative
  example. It used the exact `flagship-kiln-paste-safe.html` CF_HTML artifact, found the intended
  deterministic-title editor unchanged, detected a separate wrong-tab mojibake insertion, deleted
  the current-run residue through WeChat with `ret=0`, and verified zero post-cleanup title,
  deleted-candidate, or recent InkForge-like residue matches.
- `wechat-kiln-paste-safe-wechat-ctrlv-single-tab-nopaste-20260618.txt` is the stricter same-tab
  negative example. It verified visible page focus and body focus, then showed SendKeys and
  `keybd_event -NoClick` left the body unchanged and created no residue.
- `wechat-pc-paste-strong-gate-20260618.txt` records the local validator hardening and regression
  coverage for the new bound paste flags.
- This evidence must not set `ordinaryClipboardPasteVerified:true`, must not satisfy
  `pc-editor-paste-event`, and must not satisfy `safe-disposable-draft`.

## 2026-06-18 Addendum: Market Editor DOM/CSS Rule Extraction

135 and Xiumi live sampling is now a design-rule input only. It must not create a shortcut around
InkForge renderers or proof gates.

Contract:

- Market editor learning must be based on applied central-canvas/editor DOM changes, not just list
  previews.
- Xiumi SVG preview markup may include `svg`, `animateTransform`, and `foreignObject`, but applied
  Xiumi canvas output can become image cells and `tn-*` authoring layers. That evidence maps to
  InkForge image-slot/fallback manifests, not direct inline-SVG availability.
- 2026-06-18 Xiumi applied readback confirmed central editor mutation for SVG, title, and card
  samples. SVG insertion changed `.tn-editing-panel` by `htmlLength +32007`, `tnComp +15`, and
  `tnCell +18`; title insertion changed it by `htmlLength +15313`, `tnComp +6`, and `tnCell +7`;
  card insertion changed it by `htmlLength +30728`, `tnComp +17`, and `tnCell +21`.
- 135 SVG effects map to InkForge-owned image slots, hot zones, trigger type, motion schema,
  static-expanded fallback, raster fallback, and layout report.
- 135 ordinary section styles and Xiumi title/card/card-like modules may influence InkForge only
  through source-owned title/card/callout/timeline/QA/image-frame/gallery/poster/long-image
  renderers.
- Market residue is forbidden in publishable output: `_135editor`, `135brush`, `135bg`,
  `data-tools`, market data ids, `tn-*`, `tn-comp-role`, `tn-bind-comp-tpl-id`,
  `opera-tn-ra-*`, `disable-tn-*`, vendor class names, vendor hosted media, private editor source,
  and paid/member assets.
- Xiumi/Angular authoring residue remains forbidden even if copied without `tn-*` markers:
  `ng-model`, `ng-include`, `ng-controller`, `ng-change`, `ng-hide`, `ng-show`, Vue-style
  authoring directives, and Angular runtime classes such as `ng-scope`, `ng-binding`, `ng-hide`,
  `ng-pristine`, `ng-valid`, `ng-empty`, `ng-not-empty`, and `ui-sortable` must fail publishable
  output quality checks.
- Editor runtime editable surfaces are also forbidden: `contenteditable` marks a live editor text
  cell or paste surface, not final article semantics, and must fail publishable output quality
  checks even when no market-editor vendor class or `tn-*`/`ng-*` marker remains.
- WeChat must still pass `convertToWechatWithStats`, `checkWechatSafe`, quality detector, style
  catalog gates, and style proof manifests. Xiaohongshu and Zhihu must receive platform-specific
  plain-text/image/Markdown fallbacks rather than rich HTML copied from market editors.
- Mobile-only/touch-only market effects stay blocked until exact phone-preview evidence exists for
  the InkForge artifact.

Recorded evidence:

- `prompts/0601/evidence/market-editor-dom-css-learning-20260618.txt`
- `prompts/0601/evidence/market-editor-residue-background-gate-20260618.txt`
- `prompts/0601/evidence/xiumi-applied-runtime-binding-residue-gate-20260618.txt`
- `prompts/0601/evidence/xiumi-angular-runtime-residue-gate-20260618.txt`
- `prompts/0601/evidence/xiumi-editable-surface-residue-gate-20260618.txt`
- `prompts/0601/research/wechat-svg-typesetting-patterns.md` section 11.

Implemented gate:

- `MARKET_EDITOR_RESIDUE_RULES` blocks CSS `url(...)` references to 135/Xiumi hosted media as
  `market editor hosted background source`.
- `MARKET_EDITOR_RESIDUE_RULES` blocks copied Xiumi runtime binding attributes as
  `Xiumi runtime binding attribute`.
- `MARKET_EDITOR_RESIDUE_RULES` blocks Xiumi Angular/Vue runtime controls and Angular authoring
  classes as `Angular/Vue authoring attribute` and `Angular authoring class`.
- `MARKET_EDITOR_RESIDUE_RULES` blocks copied editor text surfaces as
  `editor editable surface attribute`.
- The gate applies to WeChat, Xiaohongshu, and Zhihu quality reports and is covered by
  `platform-export-rendering.test.ts`.
- `PLATFORM_STYLE_CHOICES` injects the platform-specific market-residue detector blocker into every
  style choice, so catalog preflight semantics cannot drift from the quality detector.

## 2026-06-18 Addendum: OSS Converter Source Rules

Public OSS converter source is now part of the documented market-practice evidence base. This is
source learning only and must not be treated as platform-account proof.

Contract:

- doocs/md and mdnice-style WeChat conversion confirms the required pipeline shape:
  theme CSS -> export-fragment scoping/de-scoping -> `juice` inlining -> platform-specific HTML
  cleanup -> clipboard/export artifact. InkForge must keep using its own renderers, sanitizer,
  quality detector, style catalog gates, and proof manifests rather than importing third-party DOM
  or template geometry.
- Runtime theme injection and custom CSS editors are authoring conveniences. A style is publishable
  only after the copied/exported artifact has inline, fragment-matching styles and passes the target
  platform checks.
- WeChat image dimensions should be normalized into inline style data before paste/export. Do not
  rely on raw `width`/`height` attributes as the only layout contract.
- Math, Mermaid, and SVG-derived diagrams must have platform shims or degradation paths. WeChat can
  use exact-artifact inline SVG proof where available, while Zhihu and Xiaohongshu should receive
  formula text, semantic Markdown, public-host images, posters, or long-image artifacts as
  appropriate.
- Xiaohongshu high-visual output is an image-page/long-image contract. It must be backed by a
  manifest with real files, dimensions, format, page count, cover/crop/reference consistency, and
  no market-editor residue.
- Zhihu high-visual output is semantic Markdown or public-host image fallback with alt/caption.
  Local/private/data/blob URLs, WeChat wrappers, raw diagram fences that need upload, and market
  editor residue remain blocked.
- Clipboard/export readiness does not complete authenticated PC editor paste, safe disposable draft,
  phone preview, Dark Mode, cover thumbnail, credentialed sync, public-host acceptance, platform
  upload, scheduled send, or publish gates.

Recorded evidence:

- `prompts/0601/evidence/oss-converter-source-refresh-20260618.txt`
- `prompts/0601/research/wechat-svg-typesetting-patterns.md` section 12.

## 2026-06-18 Addendum: Style Proof Execution Runbook

The style proof system now exposes an execution runbook for operator/deployment acceptance. This
is a local accounting and checklist API only; it does not automate account actions or prove any
external gate by itself.

Contract:

- `getPlatformStyleProofExecutionRunbook(platform, manifests)` and
  `getStyleProofExecutionRunbook(manifests)` must derive from the acceptance audit and manifest
  pack report. They must not fork platform isolation, duplicate artifact id checks, fingerprint
  mismatch handling, or blocked-choice invalidation.
- Every proof requirement maps to a concrete `StyleProofExecutionArtifactContract` with required
  `StyleProofChannel`, `StyleProofAction`, `StyleProofReadback`, artifact fields, redaction
  boundary, success criteria, and failure signals.
- Ordinary WeChat PC paste requires one same `platform-editor` / `pc-paste` artifact with
  `artifactFingerprint`, `exactArtifact`, authenticated editor/DOM flags,
  `ordinaryClipboardPasteVerified`, `sameEditorTabVerified`, `pasteInputEventVerified`,
  `editorBodyMutationVerified`, `mojibakeFreeVerified`, and `safeForCommit`.
- Phone preview, Dark Mode, and cover thumbnail proof remain separate phone-preview rows requiring
  `phonePreviewContentVerified`, `darkModeEnabledVerified`, and `coverThumbnailAccepted`.
- Public host proof must identify `artifactRef`, `hostStatus`, `safeForCommit`, and a host status
  of `public-https` or `platform-hosted`.
- XHS and Zhihu artifact-manifest proof must identify `artifactRef`, `safeForCommit`, and
  `artifactManifestValidated:true`. The flag may be set only after the matching platform manifest
  validator returns no issues for the exact redacted manifest being referenced. The execution
  runbook must name the matching validator in next actions and failure signals.
- Credentialed sync, scheduled-send, upload, and publish rows remain external/manual gates until
  exact artifact readback exists.

Recorded evidence:

- `prompts/0601/evidence/style-proof-execution-runbook-20260618.txt`
- `prompts/0601/evidence/style-proof-artifact-manifest-validation-20260619.txt`
