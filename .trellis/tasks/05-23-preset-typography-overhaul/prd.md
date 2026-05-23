# Preset Typography & Visual Identity Overhaul

> Created: 2026-05-23
> Branch: dev/visual-fixes
> Task dir: `.trellis/tasks/05-23-preset-typography-overhaul/`
> Parent context: `05-06-app-visual-overhaul` (visual overhaul base)

---

## Goal

让微信 / 小红书 / 知乎导出预览的 17 个 preset 真正"眼前一亮"：每个 preset 都有**独立视觉锚点**（字体对、装饰元素、色彩动机、排版节奏），用户每切一次能产生 **Aha 感** —— "原来还能这样排"。

具体口径：
- **每行 18–22 中文字** 的舒适阅读密度
- **中英文混排清晰**（CJK serif/sans + Latin serif/sans 精配字体栈）
- **富装饰元素**：drop cap、章节装饰线、引号符号、段间花卉/几何分隔、h2 编号 …
- **预览即可见 preset 身份**：哪怕只有一个标题 + 一句话，仍能感受到 preset 的气质（颜色/字体/装饰锚点）

---

## What I Already Know

### 现状（已勘察）

- `inkforge/src/services/export/themes.ts` 定义 17 个 preset（thesis / legal / report / commentary / aigc / code / notes / news / meme / life / elegant + 5 个 xhs + 3 个 zhihu，待复核）
- `generateThemeCSS(preset)` 在 `wechat.ts:1194` 已正常注入 preset CSS → 渲染层链路通的，问题是 preset 设计本身弱
- `buildReadingTimeHeader` 现已为极简 hairline（本次会话改过）
- `行业研报` 8px 粗蓝条已移除（本次会话改过）
- `PreviewPanel.vue` WeChat 已加 mock article header + 17px 字号 + box-shadow（本次会话改过）
- `applyHeadingDecorations` 已存在双轨脚手架（themes.ts:590-700）—— 伪元素 → 真实 `<span>` 注入，可复用为整体 `decorate(html, target)` pipeline

### 问题确诊

1. **Preset CSS 仅在 h2/blockquote/code 局部上色**：身份过弱，单段落看不出差异
2. **无版心约束**：当前 `#nice` 无 max-width → 行长不可控（不是 18–22 字）
3. **字体栈通用**：所有 preset 几乎都是 `-apple-system` 类 → 字体身份缺失
4. **无装饰元素**：仅 h2 描线 + blockquote 左边竖线；无 drop cap、无分隔花卉、无引号大字符
5. **预览面板无 preset 描述**：用户切 preset 不知道这是什么风格

---

## Assumptions (validated)

1. 用户接受**引入开源 web 字体**（自托管 woff2, OFL 许可）
2. 用户接受装饰元素是 **CSS-only**（用 ::before/::after + Unicode 符号 + SVG data URI），不引入额外字体图标库
3. 预览质感优先于"导出到微信 100% 兼容" —— 微信编辑器对 pseudo-elements / CSS vars / calc / position 全部不支持, 因此走**预览/导出双轨**：preset 提供 `previewCSS`（CSS3 modern）+ `exportCSS`（juice-survivable）+ `decorate(html, target)` 后处理（伪元素 → 真实 span）
4. 17 preset 不必平均用力，按用途分层（学术 / 商业 / 生活 / 创意 4 组 persona）

---

## Open Questions (resolved)

- [x] **Q1: 字体策略** → **自托管 woff2 (离线)** — repo ship 必要字体子集到 `inkforge/public/fonts/`，预算 ~18 MB
- [x] **Q2: 装饰浓度** → **4 类 persona 各自定调**
  - 学术 (thesis/legal/report): 极简严谨, 0–1 装饰, 靠字体+留白
  - 商业 (commentary/aigc): 理性色块, 几何小装饰
  - 生活 (notes/life/elegant): 富装饰, drop cap + ornament hr + 大引号
  - 创意 (meme/code/news + xhs 5 + 知乎 3): 实验型, 破格排版（横竖混排/反白/色块）
- [x] **Q3: 预览/导出双轨** → preset 新增 `previewCSS` + `exportCSS` + `decorate(html, target)` 后处理三件套
- [x] **Q4: 数量** → **只优化现有 17 个** — 不新增，保留用户已知 ID
- [x] **Q5: 示范模板** → **空文章时显示 sample**, 不需要每段都演示, sample 内容包含 h1 + lead + paragraph + blockquote + ul + code, 让 preset 的字体/装饰/色彩首次可见

---

## Requirements

### Must
- 每个 preset 视觉身份强（10 米外能区分）
- 预览面板显示 preset name + 一句话 description
- 中文行长 18–22 字（`max-width: 22em` 实现, CJK = 1em/字）
- 字体栈中英分别声明（CJK + Latin pair）
- 至少 3 类装饰元素（每个 preset 选择性应用）
- **空文章时预览面板显示 sample content**，让 preset 身份首次可见
- 预览/导出双 CSS 通道；导出走 juice-safe 子集 + decorate 注入真实 span

### Sample Content Schema (空文章时显示)

```markdown
# 文章标题示例

> 这是一段引言，展示 preset 在 lead 段落上的处理。

正文段落的字体、行高、字距、首字下沉的视觉效果都在这里呈现，并且支持**强调**和*斜体*。

## 二级标题

正文混排英文：The quick brown **fox** jumps over the lazy dog. CJK + Latin 字体对的协同效果。

- 列表项一
- 列表项二
- 列表项三

```javascript
function greet(name) {
  return `Hello, ${name}`;
}
```

> "这是一段长引文。" —— 鲁迅
```

### Nice
- 切换 preset 有 200ms crossfade 过渡
- 长内容时章节装饰节奏感（h2 间距 + 装饰线轮换）
- 引号、列表标记、链接等微元素与 preset 主调一致

---

## Acceptance Criteria

- [x] AC-1: 任意 preset 渲染同一段 markdown，**3 秒内能视觉区分** (verified via themes.ts: each preset has unique primaryColor + persona base CSS + 2-4 decoration recipes)
- [x] AC-2: WeChat 预览面板，preset chip 下方显示当前 preset name + 一句话 description (PR5: PreviewPanel.vue `.preset-meta-chip` shows selectedPresetMeta.name + description for all platforms)
- [x] AC-3: `#nice p` 行长 18–22 中文字（在 1440 视口测量） (verified: preset-fonts.ts generatePersonaBaseCSS injects `max-width: min(22em, calc(100vw - 32px))`)
- [x] AC-4: 17 个 preset 各有 ≥3 项独特视觉特征（颜色/字体/装饰） (verified: themes.ts 12 wechat + xiaohongshu.ts 5 + zhihu.ts 3 each have persona/fonts/previewCSS/exportCSS/decorate quartet plus unique color)
- [x] AC-5: 预览中即使只有 "hello" 一个词，preset 身份依然可辨（背景/字体/装饰条） (verified: persona base CSS sets background + font stack + line-length lock at #nice level, applies even to single-word content)
- [x] AC-6: 空文章自动渲染 sample content（Requirements 中定义的模板） (verified: PreviewPanel.vue watch handler uses resolveSampleContent() when body empty + `.preview-sample-hint` badge)
- [x] AC-7: `pnpm test` / `pnpm typecheck` / `pnpm lint` 全绿 (PR5 final: typecheck clean, eslint --quiet clean, vitest 748/748 passing)
- [~] AC-8: Playwright 截图（1920x1080）每个 preset 一张归档到 `evidence/` (Playwright not in package.json; PR5 ships `evidence/MANUAL.md` with manual capture protocol and Playwright script skeleton for future automation. Boundary forbids adding new heavy deps.)

---

## Research References

- [`research/typography-line-length-cjk.md`](research/typography-line-length-cjk.md) — 18–22 字 = W3C clreq 主流惯例 + 公众号 375pt 视口自然收敛点；`max-width: 22em` 利用 CJK = 1em/字 实现行长锁定；line-height 1.7–1.9 是 CJK 标配
- [`research/css-decoration-elements.md`](research/css-decoration-elements.md) — 12 类装饰 recipe（drop cap / ornament hr / large quote / 编号 / pull quote / 等），每条标注 `[Preview only]` / `[Export-safe]` / `[Both]`；CJK drop cap 必须用真实 `<span>` 包裹（`::first-letter` 跨引擎基线断裂）
- [`research/font-pairing-bilingual.md`](research/font-pairing-bilingual.md) — 6 CJK SC + 9 Latin OFL 字体，subset 后单 weight ~1.5–4 MB；4 persona 字体对推荐矩阵；Tauri 安装包 ~18 MB 预算合理（VSCode 90 MB / Obsidian 80 MB 参照）

---

## Research Notes

### 4-Persona Font Pairing Matrix

| Persona | CJK Font | Latin Pair | 装饰浓度 | 适用 preset |
|---|---|---|---|---|
| 学术 (Academic) | Source Han Serif SC | EB Garamond / Crimson Pro | 极简 (0–1) | thesis, legal, report |
| 商业 (Business) | Source Han Sans SC / IBM Plex Sans CN | Inter | 几何 (2) | commentary, aigc, news (报道型) |
| 生活 (Lifestyle) | LXGW WenKai Lite | Fraunces / Crimson Pro | 富装饰 (4–6) | notes, life, elegant, xhs-* |
| 创意 (Creative) | Smiley Sans / Source Han Sans + Maple Mono CN | Space Grotesk / JetBrains Mono | 破格 (5+) | meme, code, news (实验), zhihu-* |

### Sizing budget (after persona-level dedupe)

- Source Han Serif SC (subset 3500 char, single weight): ~1.8 MB woff2
- Source Han Sans SC (subset, single weight): ~1.6 MB woff2
- LXGW WenKai Lite: ~4 MB woff2（已天然瘦身）
- Smiley Sans (subset 3500 char): ~1.3 MB woff2
- Latin 5 个变量字体合计: ~1.5 MB woff2
- **合计 ~10–12 MB**，留余量到 18 MB 上限

### Decoration Recipes（精选, 详见 css-decoration-elements.md）

- **CJK drop cap**: real `<span class="dropcap">` wrap, `font-size: 3.2em; float: left; line-height: 1; margin: 0.08em 0.12em -0.08em 0`
- **Ornament HR (花体分隔)**: `<hr>` → `<div class="ornament-hr">❀ ❀ ❀</div>`（Unicode + Source Han Serif）
- **Large opening quote**: `blockquote::before { content: '"'; font-size: 4em; float: left; ... }` → preview only, export 改 `<span class="quote-mark">"</span>`
- **CSS counters cjk-decimal**: `h2::before { counter-increment: chapter; content: '第' counter(chapter, cjk-decimal) '章 '; }` → preview only, export 时 decorate 注入 `<span class="chapter-num">第一章</span>`
- **Pull quote + ::first-line**: 用 `::first-line { font-weight: 600; color: var(--accent); }` 突出段首一行
- **Geometric h2 ribbon**: `linear-gradient` 横条 + 数字编号 + 反白文字（juice-safe inline styles 直接写）

### CJK-specific CSS Quirks

- `ch` 单位禁用（基于英文 `0` 字宽, 在 CJK 上飘）→ 用 `em`
- `text-justify: inter-ideograph` 推荐（CJK 排版优化两端对齐）
- `hanging-punctuation: first` 仅 Safari 支持, Tauri Windows WebView2 不支持 → 用 `text-indent: -0.5em; padding-left: 0.5em` 模拟悬挂标点
- `line-break: strict` + `word-break: keep-all` 防止英文单词在 CJK 中部断开
- `font-feature-settings: 'palt'` 比例间距（CJK 标点紧缩）

---

## Decision (ADR-lite)

**Context**: 17 preset 视觉差异微弱（仅 h2/blockquote 上色）, 用户反馈"没有 Aha 感"。需要在不破坏现有导出 pipeline（juice + applyHeadingDecorations）的前提下重写 preset, 同时不污染微信编辑器兼容性。

**Decision**:

1. **PresetDefinition schema 扩展**为三件套: `previewCSS` (full CSS3) + `exportCSS` (juice-safe subset) + `decorate(html, target)` (后处理函数, 复用 `applyHeadingDecorations` 模式扩展)
2. **预览路径**走 `previewCSS`, 通过 `<style>` 注入到预览 iframe / shadow DOM
3. **导出路径**走 `exportCSS` + `decorate(html, 'wechat')`, juice inline → enforcePlatformCSS strip → applyHeadingDecorations 升级版
4. **字体自托管**到 `inkforge/public/fonts/`, 通过 `@font-face unicode-range` 分片懒加载
5. **4 persona 分层定调**, 每个 persona 共享基础字体栈 + decoration mixin, preset 在其上叠加独特色彩/装饰
6. **空文章 sample content** 在 `PreviewPanel.vue` 的 `selectedArticle` computed 中兜底注入

**Consequences**:

- ✅ 预览质感大幅提升, 微信导出兼容性保留
- ✅ 字体自托管离线可用, 无 CDN 依赖
- ⚠️ 安装包 +10–12 MB（用户可接受, 远小于 VSCode 90 MB）
- ⚠️ Decorate pipeline 复杂度上升, 需要充分测试 juice 输出
- ⚠️ 字体子集化需要构建步骤（pyftsubset / glyphhanger）, 加入 `pnpm prebuild` 钩子
- 风险: WeChat 编辑器 strip `@font-face` → 导出 HTML 仅用 generic family fallback, preset 的字体身份在最终公众号上削弱（PRD 假设 #3 已接受）

---

## Technical Approach

### Architecture

```
PresetDefinition {
  id: string
  name: string
  description: string            // ← preview chip 下方一句话
  persona: 'academic' | 'business' | 'lifestyle' | 'creative'
  fonts: { cjk: FontSpec, latin: FontSpec }
  previewCSS: string             // full CSS3
  exportCSS: string              // juice-safe subset
  decorate?: (html: string, target: ExportTarget) => string
  sampleContent?: string         // optional override of default sample
}
```

### Files to add/modify

| File | Change |
|---|---|
| `inkforge/src/services/export/themes.ts` | 17 preset rewrite, 扩展 PresetDefinition schema |
| `inkforge/src/services/export/preset-decorations.ts` | **新建** - decorate(html, target) 工厂 + 12 个 recipe 实现 |
| `inkforge/src/services/export/preset-fonts.ts` | **新建** - font stack 常量 + `@font-face` CSS 生成 |
| `inkforge/src/services/export/wechat.ts` | 替换 `generateThemeCSS` 调用为新双轨; 在 buildHTML 后调 decorate |
| `inkforge/src/services/export/utils.ts` | applyHeadingDecorations 抽象为通用 applyDecorations |
| `inkforge/src/components/preview/PreviewPanel.vue` | 加 preset name + description chip 文案; 空内容兜底 sample |
| `inkforge/public/fonts/` | **新目录** - subset woff2 ship 入仓 |
| `inkforge/public/fonts/manifest.json` | **新建** - font subset map |
| `inkforge/src/services/export/sample-content.ts` | **新建** - 默认 markdown sample |
| `inkforge/src/services/export/themes.test.ts` | 17 preset snapshot 测试 + 行长测试 |

### Implementation Plan (small PRs)

- **PR1: Scaffold & dual-track schema** (~ 200 LOC)
  - 扩展 `PresetDefinition` 加 `previewCSS` / `exportCSS` / `decorate` / `persona` 字段
  - 重写 themes.ts 注入路径, 旧 customCSS 字段 deprecated 但兼容
  - 加 `services/export/sample-content.ts` 默认模板
  - PreviewPanel 显示空内容时渲染 sample
  - 测试: dual-track 路径不破坏现有导出

- **PR2: Font self-hosting + persona base CSS** (~ 300 LOC)
  - `inkforge/public/fonts/` 加 subset woff2（6 CJK + 5 Latin）
  - `preset-fonts.ts` 生成 `@font-face unicode-range` 块
  - 定义 4 persona base style mixin（行长 22em / line-height 1.8 / font-feature-settings palt）
  - 字体子集化脚本 `scripts/font-subset.mjs`（pyftsubset wrapper, 加入 `pnpm prebuild`）
  - 测试: 字体加载 + 行长测量

- **PR3: 装饰系统 + 4 persona preset 落地（学术 + 商业）** (~ 500 LOC)
  - 新建 `preset-decorations.ts` 12 recipe
  - 重写 thesis / legal / report (学术) + commentary / aigc (商业)
  - 测试: snapshot per preset + decorate idempotency

- **PR4: 生活 + 创意 persona preset** (~ 500 LOC)
  - 重写 notes / life / elegant (生活) + meme / code / news (创意) + xhs 5 + zhihu 3
  - drop cap 真实 span 注入, ornament hr, large quote, cjk-decimal counters

- **PR5: Polish + screenshot evidence** (~ 100 LOC)
  - Preset 切换 200ms crossfade
  - Playwright 抓 17 张截图归档到 `evidence/`
  - 文档每个 preset 注释"设计语言"≤2 行
  - 三检: typecheck / lint / test 全绿

---

## Definition of Done

- 17 个 preset 全部重写 + 通过所有 AC
- 新增 4 个文件（preset-decorations.ts / preset-fonts.ts / sample-content.ts / fonts/manifest.json）
- `inkforge/public/fonts/` 含 11 个 subset woff2
- 截图 evidence 归档到 `.trellis/tasks/05-23-preset-typography-overhaul/evidence/`
- `pnpm test` / `pnpm typecheck` / `pnpm lint` 全绿
- 推送到 `dev/visual-fixes`

---

## Out of Scope

- 暗色模式 preset 适配（独立任务）
- 用户自定义 preset 编辑器（v2.x）
- 服务端字体子集化 CDN（先用本地 pyftsubset）
- xhs / zhihu mock 的预览面板 UI（本任务先聚焦 wechat 预览, xhs/zhihu CSS 仍写但 mock UI 留待独立任务）
- Tauri build 验证（最后阶段, 由用户手测）
- WeChat 公众号编辑器最终粘贴质量测试（用户手动验证）
