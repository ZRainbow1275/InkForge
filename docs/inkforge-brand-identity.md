# InkForge Brand Identity System

> "Every text passes through fire."
> 每一段文字，都经过锻造。

---

## 1. Brand Philosophy 品牌哲学

**InkForge（墨铸）** — 名字本身就是品牌叙事。

- **Ink（墨）**: 书写、CJK 书法传统、宣纸、文人气质
- **Forge（锻造）**: 精密、变形、热力、匠人精神

InkForge 将原始 Markdown 锻造成精致排版——如矿石成钢，如墨迹成字。品牌视觉语言追踪这一转变过程：从原料到成品，从粗砺到精致。

**Brand Personality 品牌人格**:

| 维度 | InkForge 是 | InkForge 不是 |
|---|---|---|
| 温度 | 温暖的精确 (warm precision) | 冰冷的技术感 |
| 文化 | 东西桥接 (East-West bridge) | 纯中式或纯西式 |
| 质感 | 匠人品质 (artisanal quality) | 工业批量感 |
| 态度 | 沉稳自信 (confident quietness) | 张扬喧闹或极简冷淡 |
| 受众 | 创作者、独立写作者、知识工作者 | 企业 PPT 用户 |

---

## 2. Color System 色彩系统 — "锻造光谱 (The Forge Spectrum)"

色彩随锻造过程流转：原矿 → 炉火 → 锤炼 → 冷却 → 打磨 → 岁月。

### 2.1 Primary Palette 主色板

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ██████  GRAPHITE   #252933   主文字 · 高碳钢蓝灰          │
│  ██████  KILN       #D95B3F   炉火 · 朱砂 × 赤陶          │
│  ██████  TEMPERA    #3B7A6B   冷却铜绿 · 时间与匠心的印记  │
│  ██████  AMBER      #C19A56   熔铸 · 液态金属注入模具瞬间  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| Token | Hex | HSL | 角色 | 灵感 |
|---|---|---|---|---|
| **Graphite** | `#252933` | 226° 14% 17% | Primary text, H1/H2 | 高碳钢，比纯黑有温度 |
| **Kiln** | `#D95B3F` | 12° 66% 55% | Signature accent, 装饰焦点 | 朱砂 (cinnabar) × 窑变赤陶 |
| **Tempera** | `#3B7A6B` | 160° 35% 35% | Secondary accent, 视觉呼吸 | 铜绿 (verdigris), 时间的痕迹 |
| **Amber** | `#C19A56` | 38° 46% 54% | Warm metallic, 强调/规则线 | 熔铸黄铜，NOT gold (#FFD700) |

### 2.2 Extended Palette 辅助色板

| Token | Hex | 角色 |
|---|---|---|
| **Vellum** | `#F5F0E6` | 页面背景，仿宣纸暖白 |
| **Ash** | `#6E7580` | 辅助文字、caption、meta |
| **Smoke** | `#9B958D` | 更浅辅助灰，placeholder |
| **Hairline** | `#DED7CA` | 边框、分隔线 |
| **Hearth** | `#EDE7DB` | 卡片/引用块背景，比 Vellum 深一阶 |
| **Char** | `#1A1D24` | 极深色场景（暗黑模式文字、重标题） |

### 2.3 Semantic Tokens 语义映射

```css
/* Light Mode */
--ink-bg:          #F5F0E6;   /* Vellum */
--ink-text:        #252933;   /* Graphite */
--ink-text-muted:  #6E7580;   /* Ash */
--ink-accent:      #D95B3F;   /* Kiln */
--ink-accent-2:    #3B7A6B;   /* Tempera */
--ink-highlight:   #C19A56;   /* Amber */
--ink-border:      #DED7CA;   /* Hairline */
--ink-surface:     #EDE7DB;   /* Hearth */

/* Dark Mode (WeChat 暗黑) */
--ink-bg-dark:          #1A1D24;
--ink-text-dark:        #E8E4DC;
--ink-text-muted-dark:  #9B958D;
--ink-accent-dark:      #E8734F;   /* Kiln lightened for dark bg */
--ink-accent-2-dark:    #5BA08D;   /* Tempera lightened */
--ink-highlight-dark:   #D4AD6A;   /* Amber lightened */
--ink-border-dark:      #3A3D44;
--ink-surface-dark:     #242830;
```

### 2.4 Why This Palette Is Unique 独特性论证

| 维度 | 市面常见 | InkForge |
|---|---|---|
| 主强调色 | 蓝 (#0066cc) / 红 (#E74C3C) / 紫 (#6B5B95) | **Kiln 朱砂赤陶** (#D95B3F) — 不是红、不是橙、不是珊瑚 |
| 辅助色 | 灰 / 浅蓝 / 无 | **Tempera 铜绿** (#3B7A6B) — 文章正文内的冷暖呼吸 |
| 金属感 | 商务金 (#B8860B) / 奢侈金 (#FFD700) | **Amber 黄铜** (#C19A56) — 更朴素、更匠人 |
| 背景 | 纯白 (#FFF) / 冷灰 (#FAFAFA) | **Vellum 宣纸** (#F5F0E6) — 有温度的暖白 |
| 文字色 | 纯黑 (#000) / 炭灰 (#333) | **Graphite 高碳钢** (#252933) — 带蓝底调的深色 |
| 整体感 | 企业/学术/极简 | **匠人工坊** — 温暖而精确 |

**Logo-mark DNA (Logo Concept 08, 2026-05-29)**: the **logo / brand-mark
surfaces have their OWN five-color palette** — **墨黑 Ink Black `#1C1F23` ×
铸红 Forged Red `#C9362C` × 灰 Grey `#6B6F76` × 浅灰 Light Grey `#E6E8EB` ×
砚白 Paper `#F7F4EF`** (see §9.0). The 墨滴 · 笔锋 · 铁砧 mark narrates 墨×铸 as:
墨 (Ink-Black ink-drop) + 铸 (Ink-Black forging anvil) + a Forged-Red ember
(灵感) + a nib-arrow shooting ↗ (创作/发送/发布). This palette governs **logo /
mark surfaces only** — the icon masters, `ForgeNibMark.vue`, favicon, splash,
boot placeholder, and §9.

**Article-side + broader-chrome DNA (unchanged)**: **Kiln `#D95B3F` × Tempera
`#3B7A6B` 冷热对比** remains the Forge-Spectrum DNA for long-form reading
surfaces (link hover, H3 headings, blockquote rules, cool ornaments) AND for
the broader UI chrome / tokens (focus ring, accents). The Forge Spectrum
(Graphite / Kiln / Tempera / Amber, §2.1) is intact; the logo palette is a
parallel mark-specific system, not a replacement.

简言之：**logo / mark = 墨黑×铸红×灰×浅灰×砚白 (墨滴·笔锋·铁砧)**，**article body +
broader chrome = Forge Spectrum (Graphite / Kiln / Tempera / Amber)**。两套
体系并存：logo 用 Logo Concept 08 专属五色，正文与 UI chrome 继续用锻造光谱。

---

## 3. Typography 字体系统

### 3.1 Font Stacks

| 用途 | 字体栈 | 理由 |
|---|---|---|
| **CJK 正文** | `"Source Han Serif SC", "Noto Serif SC", "Source Han Serif CN", STSong, serif` | 学术感、CJK-first |
| **Western Display** | `"EB Garamond", "Crimson Pro", Georgia, serif` | 古典编辑/排版传统 |
| **UI/Sans** | `Inter, "PingFang SC", "Microsoft YaHei", sans-serif` | 现代、清晰 |
| **Mono** | `"JetBrains Mono", "Fira Code", Consolas, monospace` | 开发者语境 |

### 3.2 Type Scale (16px base)

```
H1:  2.0em  (32px)  Graphite   weight 700   EB Garamond + Source Han Serif
H2:  1.35em (21.6px) Graphite  weight 600   Source Han Serif
H3:  1.12em (17.9px) Tempera   weight 600   italic
H4:  1.0em  (16px)   Ash       weight 600   SMALL-CAPS
Body: 1.0em (16px)   Graphite  weight 400   line-height 1.85
Caption: 0.85em      Ash       weight 400
```

### 3.3 CJK Typography Rules

- **行高 (line-height)**: 1.85 for body（CJK 比 Latin 需更大行距）
- **字间距 (letter-spacing)**: 0.02em for body, 0.05em for H2
- **段间距**: 1.2em（比西文稍大）
- **CJK/Latin 间距**: U+202F (Narrow No-Break Space) 自动注入
- **首行缩进**: 可选，默认关闭（微信端不缩进更现代）

---

## 4. Visual Elements 视觉元素 — "InkForge Marks（锻痕）"

每个视觉元素都有其在「锻造」叙事中的角色。

### 4.1 The Seal 印章 ◇

InkForge 的 signature ornament 使用 **空心菱形** `◇` 而非实心 `◆`。

- 三连 `◇ ◇ ◇` 用于 H1 装饰和章节分隔
- 颜色：Kiln `#D95B3F`
- 间距：字符间 0.5em
- 灵感：传统印章的现代化抽象，空心比实心更通透精致

```html
<p style="text-align:center;color:#D95B3F;font-size:18px;letter-spacing:0.5em;margin:1.5em 0;opacity:0.85;">
  ◇ ◇ ◇
</p>
```

### 4.2 The Forge Line 锻线

章节标题 (H2) 下方的标志性装饰线：一条短的 Amber 实色线。

- 宽度：72px
- 高度：3px
- 颜色：Amber `#C19A56`
- 左对齐（不居中 — 匠人的不对称美学）

```html
<div style="width:72px;height:3px;background:#C19A56;margin:0.6em 0 1.4em 0;border-radius:1.5px;"></div>
```

### 4.3 Drop Cap 首字下沉

第一段首字符放大，带左侧 Kiln 色细线。

- 字号：3.2em
- 字体：EB Garamond (Latin) / Source Han Serif SC (CJK)
- 颜色：Graphite `#252933`
- 左边距：-2px
- 行高：0.82
- 左侧装饰：2px solid Kiln `#D95B3F`（距文字 6px）

```html
<span style="font-size:3.2em;float:left;line-height:0.82;margin:0.06em 0.12em 0 0;padding-left:8px;border-left:2px solid #D95B3F;color:#252933;font-family:'EB Garamond','Source Han Serif SC',serif;font-weight:600;">
  首
</span>
```

### 4.4 Chapter Numerals 章节序号

H2 前的序号使用 EB Garamond，半透明，营造「刊物」感。

- 字号：2.4em
- 颜色：Graphite `#252933` at 14% opacity → `rgba(37,41,51,0.14)`
- 字体：EB Garamond
- weight：300 (light, elegant)
- 格式：`01` `02` ... `06`（双位阿拉伯数字）

### 4.5 Strong Emphasis 段内强调

InkForge 不使用纯色 bold。使用 **Amber 半高底纹**（下方 35% 区域填充），仿「金箔高光笔」效果。

```css
strong {
  font-weight: 700;
  color: #252933;
  background: linear-gradient(180deg, transparent 65%, rgba(193,154,86,0.22) 65%);
}
```

为什么 65%/22%:
- 65% 起始点让底纹只覆盖文字下方 35%（CJK 视觉重心在上部）
- 22% opacity 在 Vellum 背景上刚好可辨但不抢夺阅读焦点

### 4.6 H2 Treatment 章节标题处理

H2 是文章视觉节奏的核心节点：

1. 序号（2.4em, 半透明 Graphite）
2. 标题文字（Graphite, 1.35em, 600 weight, 0.05em letter-spacing）
3. Forge Line（72px × 3px Amber，左对齐）

不使用 border-left、不使用背景色块 — 这些是「企业 PPT」的标志。InkForge H2 靠**序号体量差 + 底部金线**建立层级。

### 4.7 H3 Treatment 子章节

- 颜色：Tempera `#3B7A6B`
- 前缀：`§ 1.1`（EB Garamond italic）
- weight：600
- 无额外装饰

Tempera 绿与 Kiln 赤的冷热对比在 H2/H3 交替间产生视觉呼吸。

### 4.8 Blockquote 引用块

```css
blockquote {
  border-left: 3px solid #3B7A6B;  /* Tempera */
  background: #EDE7DB;              /* Hearth */
  padding: 1em 1.4em;
  color: #3D4048;
  font-style: italic;
  border-radius: 0 4px 4px 0;
}
```

### 4.9 Image Frame 图片装裱

模仿中国画装裱（mounting）工艺：大量留白 + 不对称阴影线。

- 容器：纯白 `#FFFFFF` 背景，四周 24px padding
- 边框：**仅底部 + 右侧** 各 1px `Hairline` 色线（不对称，制造微妙的悬浮感）
- 上方 / 左侧无边框（留白呼吸）
- Caption：底部左对齐，13px，Ash 色，EB Garamond italic
- 上下间距：2em

```html
<div data-ink-img="1" style="margin:2em 0;padding:24px;background:#FFF;
  border-right:1px solid #DED7CA;border-bottom:1px solid #DED7CA;overflow:hidden;">
  <img src="..." style="display:block;width:100%;height:auto;border:0;">
  <p data-ink-caption="1" style="margin:10px 0 0;font-size:13px;color:#6E7580;
    font-style:italic;font-family:'EB Garamond','Source Han Serif SC',serif;">
    图1：数字人民币双层运营架构
  </p>
</div>
```

为什么不对称：
- 四边等宽边框 = 相框 = 模板感
- 仅底+右 = 装裱纸的折叠痕迹，有手工感
- 与 Forge Line 的左对齐共享「不对称匠人美学」DNA

### 4.10 Table 表格

表格是 InkForge 品牌的关键差异化区域（竞品几乎都是灰/蓝表头）：

| 部位 | 样式 |
|---|---|
| **表头 (th)** | background: Hearth `#EDE7DB`, color: Graphite `#252933`, weight 700, font-size 15px, padding 14px 16px |
| **表头底线** | 3px solid Kiln `#D95B3F`（表头底边是 Kiln 色 — InkForge 表格的签名元素。暖底+深字确保可读性） |
| **奇数行** | background: `#FFFFFF` |
| **偶数行** | background: Vellum `#F5F0E6` |
| **单元格** | color: Graphite, padding: 10px 16px, border: 1px solid Hairline `#DED7CA` |
| **整体** | border-radius: 6px (via wrapper), box-shadow: 0 1px 4px rgba(0,0,0,0.06) |

表头底部的 Kiln 色线是关键：它让表格从「信息容器」变成「品牌接触点」。

---

## 5. WeChat Export Mapping 微信导出适配

### 5.1 Compliance Constraints

微信公众号编辑器限制：
- `class=` 属性被剥离 → 所有样式必须 inline
- `data-*` 属性保留 → 用于锚定和暗黑模式
- `position: fixed/absolute` 不可靠 → 仅使用 flow layout
- `::before` / `::after` 伪元素不可靠 → 装饰元素用真实 DOM 节点
- 最大内容宽度 677px

### 5.2 Dark Mode Token Mapping

| Light Token | Light Value | Dark Value | 对比度 (WCAG AA) |
|---|---|---|---|
| Graphite text | `#252933` on Vellum `#F5F0E6` | `#E8E4DC` on `#1A1D24` | 12.8:1 → 11.4:1 |
| Kiln accent | `#D95B3F` on Vellum | `#E8734F` on `#1A1D24` | 4.5:1 → 5.2:1 |
| Tempera accent | `#3B7A6B` on Vellum | `#5BA08D` on `#1A1D24` | 4.5:1 → 4.8:1 |
| Amber highlight | `#C19A56` on Vellum | `#D4AD6A` on `#1A1D24` | 3.2:1 → 4.6:1 |

### 5.3 Preset Configuration

```typescript
const inkforgePreset: ExportPreset = {
  id: 'inkforge-signature',
  name: 'InkForge Signature（墨铸）',
  icon: 'forge',
  description: 'InkForge 品牌专属：Graphite + Kiln + Tempera + Amber',
  theme: 'grace',
  fontFamily: 'serif',
  fontSize: '16px',
  primaryColor: '#252933',
  isUseIndent: false,
  isUseJustify: true,
  previewCSS: INKFORGE_BRAND_CSS,
  exportCSS: INKFORGE_BRAND_CSS,
  decorate: chainDecorators(
    decorateInkForgeH1,
    decorateInkForgeDropCap,
    decorateInkForgeChapterNumerals,
    decorateInkForgeLine,
    decorateInkForgeOrnament,
  ),
}
```

---

## 6. Application Examples 应用示例

### 6.1 Article Page (WeChat Export)

```
  ◇ ◇ ◇                          ← Kiln 色空心菱形

  中国数字人民币战略全景报告        ← H1: Graphite, 2.0em, 700
  Digital RMB Strategic Overview   ← Subtitle: Ash italic, EB Garamond

  ─                                ← Kiln 色细线 (80px × 1px)

  首一段正文首字下沉（3.2em），     ← Drop cap with Kiln left border
  带左侧朱砂细线...

  01                               ← 半透明 Graphite 序号
  架构蓝图——数字人民币的设计哲学    ← H2: Graphite, 1.35em
  ▬▬▬▬▬                            ← Forge Line: Amber 72×3px, 左对齐

  § 1.1 顶层设计                   ← H3: Tempera 绿, italic prefix
  正文 Graphite on Vellum...
  **强调文字** 带 Amber 半高底纹

  ◇ ◇ ◇                          ← 章节分隔

  02
  从试点到实践：解析国内推行
  ▬▬▬▬▬

  ┌──────────────────────────────┐
  │ 阶段   │ 核心目标  │ 战略   │ ← Graphite 表头 + Kiln 底线
  ├──────────────────────────────┤
  │ 内容   │ 内容      │ 内容   │ ← 交替 White / Vellum
  └──────────────────────────────┘
```

### 6.2 Color in Context

在一篇 30,000 字的长文中，色彩分布大致为：
- **90% Graphite on Vellum**: 正文主体，沉稳不疲劳
- **5% Amber**: 强调底纹 + Forge Lines，提供节奏感
- **3% Kiln**: 章节装饰 + 表头底线 + drop-cap 侧线，品牌记忆点
- **2% Tempera**: H3 + 引用块左线，冷暖呼吸

这个比例确保读者在 101 分钟阅读过程中不会视觉疲劳，同时每翻一屏都能遇到 InkForge 品牌元素。

---

## 7. Brand Don'ts 品牌禁忌

| 禁止 | 原因 |
|---|---|
| 使用纯黑 `#000000` 作为文字色 | 太harsh，用 Graphite |
| 使用纯白 `#FFFFFF` 作为页面背景 | 太冷，用 Vellum |
| 使用 `border-left` 装饰 H2 | 企业 PPT 风格 |
| 使用蓝色 `#0066cc` 作为强调色 | 通用商务感 |
| 表头使用与表体相同的灰色 | 失去品牌接触点 |
| 装饰元素使用 `class=` | 微信会剥离 |
| strong 使用与正文相同颜色 | 强调失效 |
| H2/H3 使用相同颜色 | 层级坍缩 |

---

## 8. File Reference 文件索引

| 文件 | 位置 | 用途 |
|---|---|---|
| Brand Identity (本文件) | `docs/inkforge-brand-identity.md` | 品牌系统总纲 |
| Brand CSS Constants | (待落地) `src/constants/brand.ts` | 色彩 token + font stack 代码定义 |
| WeChat Preset | (待落地) `src/services/export/themes.ts` | InkForge Signature preset |
| Decorators | (待落地) `src/services/export/decorators/inkforge.ts` | 品牌专属装饰器 |

---

## 9. Logo Mark 标识 — 墨滴 · 笔锋 · 铁砧 Mark

> Version: 2026-05-29 v5 redesign. Supersedes the prior 鼎 × 笔尖 × 方格 grid
> mark (v4, "LOGO CONCEPT 06"), which the user retired because the 5×3 module
> grid read muddy / unclear at small sizes (the #1 acceptance failure). The
> user supplied a new approved concept sheet ("Logo Concept 08") and selected
> this 墨滴 · 笔锋 · 铁砧 mark as the official InkForge logo.
>
> The v5 mark is a **vertically stacked, single-silhouette** mark that spells
> 墨铸 / InkForge literally — ink being forged on an anvil. Narrative top→bottom:
>
> - **红珠 ember (灵感)** — a solid Forged-Red circle at the top: the spark of
>   inspiration.
> - **墨滴 ink-drop (墨)** — a black teardrop below the ember (sharp point at
>   top, bulbous round bottom), sliced by a paper-colored diagonal gap.
> - **笔锋箭头 nib-arrow (创作 / 发送 / 发布)** — a bold diagonal stroke that
>   slices the lower-right of the drop and continues past it to an arrowhead
>   pointing up-right (↗): the writing-and-publish gesture.
> - **铁砧 anvil (铸 / Forge)** — a black forging-anvil base below the drop:
>   the Forge made literal.
>
> This is a **clarity-first, bold-silhouette** mark. Where the retired 鼎-grid
> packed many small modules that turned to mud at 16px, the new mark is a few
> large, high-contrast shapes that survive 16px AND tell the 墨→铸 story at
> 1024px. The slice + arrow are the second-look reward; the drop + anvil read
> instantly.

### 9.0 Logo Palette 标识专属色板

The logo uses its OWN five-color palette (Logo Concept 08). This is the
palette for **logo / mark surfaces only** — the app's article-side palette
(§2, Forge Spectrum: Graphite / Kiln / Tempera / Amber) is unchanged and
continues to govern body-copy, export themes, and the broader UI chrome.

| Token | Hex | 角色 |
|---|---|---|
| **墨黑 Ink Black** | `#1C1F23` | ink-drop, anvil, nib-arrow — the forged mass |
| **铸红 Forged Red** | `#C9362C` | ember + accents — the molten signal of inspiration |
| **灰 Grey** | `#6B6F76` | secondary detail (rarely needed) |
| **浅灰 Light Grey** | `#E6E8EB` | subtle fills |
| **砚白 Paper** | `#F7F4EF` | background, slice gap, negative space — the page |

Dark-mode lift: Forged Red `#C9362C` → `#E15A4E` on Char backgrounds for
contrast on splash / boot placeholder wordmark separators.

The retired v4 logo palette (`#1F1F1F` / `#A72A2A` / `#B28A5E` / `#F2F0EB`) is
fully replaced across all logo surfaces by these tokens.

### 9.1 Design Intent 设计意图

- **形 (Form)**: a Forged-Red ember circle at the top + a black ink-drop
  (teardrop) sliced by a paper-colored diagonal gap (carved via `<mask>`) + a
  black nib-arrow stroke (shaft along the slice's upper edge + arrowhead
  shooting ↗) + a black forging-anvil base (wide overhanging top slab, pinched
  waist, flared trapezoidal foot) + (256+) a soft top-left highlight on the
  drop + a warm contact shadow under the anvil + (1024-tier) a vertical sheen
  gradient on the drop + a soft ember glow.
- **色 (Color)**: Ink Black `#1C1F23` drop/arrow/anvil (primary mass) + Paper
  `#F7F4EF` slice gap + negative space + Forged Red `#C9362C` ember +
  (1024) ember-glow radial fade + drop-sheen linear gradient (`#2B2F35`→
  `#1C1F23`→`#141619`) + anvil contact-shadow radial fade.
- **叙 (Narrative)** — three design pillars:
  - **墨滴 / 书写**: the ink-drop is 墨, the writing substance — thought made
    into ink.
  - **锻造 / 铁砧**: the anvil is 铸 (Forge) — the vessel on which the ink is
    hammered into form.
  - **发送 / 发布**: the nib-arrow shooting ↗ is the creative + publish
    gesture — InkForge's cross-platform 发布 promise.
- **唯一性 (Differentiation)**: No editor brand stacks an ink-drop on a
  forging anvil with a publish-arrow slicing through. The cool-hot tension is
  the Ink-Black mass + the single Forged-Red ember signal; the diagonal slice
  + arrow give a dual reading (a calm ink-drop ⇄ a launching publish gesture).
  The single-gesture economy + bold silhouette echo Bear / Cursor / Nike — one
  clean primary read, one second-look reward.
- **0 字体依赖**: All shapes are `path` / `circle` / `ellipse` / `mask` /
  `linearGradient` / `radialGradient` primitives. No `<text>` element, no CJK
  font reference, no Latin font reference inside the SVG, no `<polygon>`. The
  墨铸 wordmark lives entirely in the host HTML (`.ink-logo-lockup__cn` /
  `.ink-app-shell__wordmark-cn` text nodes), so cross-machine raster is
  identical. Contract: `grep -c '<text' inkforge/src-tauri/icons/master-*.svg`
  MUST return 0, and `grep -c '<polygon' ...` MUST return 0.

### 9.2 SVG Masters — Progressive 5-Tier

Five progressive masters cover every output size — clarity is the #1 goal, so
each smaller tier sheds the finer detail that would turn to mud:

| Master | Tier | Detail level | Location |
|---|---|---|---|
| `master-16.svg` | 1 | SOLID ink-drop (NO slice — too fine) + ember dot + bold simplified anvil; NO arrow | `src-tauri/icons/master-16.svg` |
| `master-32.svg` | 2 | ink-drop + thin slice gap + short stub nib-arrow (simple triangular head) + ember dot + clearer anvil waist | `src-tauri/icons/master-32.svg` |
| `master-64.svg` | 3 | full drop + slice + full arrowhead + ember + anvil overhang + 1px-equivalent drop highlight | `src-tauri/icons/master-64.svg` |
| `master-256.svg` | 4 | full detail + soft top-left highlight on drop + ember highlight + soft contact shadow under anvil | `src-tauri/icons/master-256.svg` |
| `master-1024.svg` | 5 (hero) | full mark + drop sheen gradient + ember glow + warm contact shadow | `src-tauri/icons/master-1024.svg` |

All five share the same viewBox `0 0 1024 1024` and the same canonical mark
geometry (centered, vertically stacked, slightly taller than wide).

**Canonical geometry (shared across tiers, simplified downward)**:

- **Ember**: `circle cx=512 cy≈178 r≈54` Forged Red `#C9362C` (r grows to 64
  at tier 16 for small-raster presence).
- **Ink-drop**: teardrop `path` with apex ≈ (512, 286) and bulbous bottom
  ≈ y 614, half-width ≈ 112, symmetric about x=512, fill `#1C1F23` (or the
  sheen gradient at tier 5).
- **Slice**: a diagonal paper-colored band carved via `<mask>` (white keeps
  the drop, a black `<path>` band ≈30° above horizontal removes the gap),
  splitting the drop into an upper-left mass + a lower crescent.
- **Nib-arrow**: a shaft `<path>` running along the slice's upper edge
  (lower-left → upper-right) + an arrowhead `<path>` with tip ≈ (786, 292)
  pointing up-right. Both fill `#1C1F23`. Authored as `<path>`, NOT polygon.
- **Anvil**: a `<path>` with a wide overhanging top slab (x ≈ 296→730 at
  y ≈ 700), a pinched waist, and a flared trapezoidal foot (bottom ≈ y 874),
  symmetric about x=512, fill `#1C1F23`.

**Validation contract**:

- `grep -c '<text' inkforge/src-tauri/icons/master-*.svg` MUST return 0
- `grep -c '<polygon' inkforge/src-tauri/icons/master-*.svg` MUST return 0
- Each master MUST parse as well-formed XML
- Each master MUST contain at least 2 `<path>` elements filled `#1C1F23`
  (the drop + anvil; tiers 32+ add the arrow shaft + head) — Ink-Black body
  acceptance gate
- Each master MUST contain at least 1 element filled `#C9362C` (the Forged-Red
  ember) — molten-signal presence gate
- Tiers 32–1024 MUST contain at least 1 `<mask>` (or `<clipPath>`) carving the
  slice negative space; tier 16 is exempt (solid drop, no slice)
- NOTE: the old `inkBlackRects >= 3` (鼎-grid) gate is RETIRED — the v5 mark
  has NO `<rect>` body modules. The body is now a few large `<path>` shapes.

### 9.3 Sizing Rules 尺寸策略

| 用途 | size 范围 | 几何策略 / Tier 选择 |
|---|---|---|
| App icon raster ≤ 24px (favicon, Win taskbar small) | 16, 24 | Tier 1 (`master-16.svg`) — solid drop + ember + anvil |
| App icon raster 25–48px (Win taskbar large, macOS dock @1x) | 32, 48 | Tier 2 (`master-32.svg`) — slice + stub arrow |
| App icon raster 49–128px (Win Start tile, macOS dock @2x) | 64, 128 | Tier 3 (`master-64.svg`) — full arrowhead + highlight |
| App icon raster 129+px (macOS icns 256–1024 slots, Linux PNG) | 256, 512, 1024, 2048 | Tier 4 (`master-256.svg`) — full detail + contact shadow |
| In-app hero / About / WelcomeModal / splash | 256+ (CSS px) | Tier 5 (`master-1024.svg`) — adds drop sheen + ember glow |

**Why tier 5 IS suitable for in-app inline use only**: at 256×256 platform
icon size, the sheen gradient + ember glow + soft contact shadow blur into the
platform squircle mask edge and lose definition. Reserving tier 5 for in-app
inline rendering (100+ CSS px, no platform crop) preserves the material aura
as a hero-tier flourish. `build-icons.mjs` does NOT consume tier 5.

### 9.3.1 16/32px Survival Strategy 退化策略

- **16×16 raster** (tier 1): The drop is SOLID (the slice gap turns to mud at
  this scale), the ember is a clean dot, and the anvil is a bold simplified
  silhouette. Reads unambiguously as "an ink-drop on an anvil." This is the
  single biggest improvement over the retired 鼎-grid, which collapsed to a
  black smudge at 16px.
- **24×24 raster** (tier 1): identical strategy; ember + drop + anvil resolve
  cleanly.
- **32×32 raster** (tier 2): a thin slice gap + a short stub nib-arrow appear;
  the anvil waist is defined.
- **64×64 raster** (tier 3): the full arrowhead + the slice + a 1px drop
  highlight all read.
- **128+ raster** (tier 4): the soft top-left drop highlight + ember highlight
  + contact shadow add material depth.

### 9.4 Platform Squircle Handling 平台圆角处理

The mark's bounding box is ~498px wide (drop/anvil) by ~710px tall (ember top
to anvil foot) inside a 1024×1024 canvas — horizontal padding ~26% each side,
vertical padding ~12% top and ~14% bottom — so platform squircle /
Big-Sur-style icon masks never reach the mark. The arrowhead extends to
x≈786 (right ~23% margin), clearing the crop.

- **Windows 11**: Taskbar / Start auto-rounds icons; the centered stack sits
  well inside the ~22% crop radius.
- **macOS Big Sur+**: System wraps icons in a squircle mask; the mark reads
  cleanly after the crop.
- **Linux**: DE-specific masks are not uniform; the master ships full square
  canvas with transparent background, DE crops at will.

### 9.5 Generated Asset Pipeline 资产生成管线

- **Sources**: 5 progressive masters in `inkforge/src-tauri/icons/master-{16,32,64,256,1024}.svg`
- **Tool**: `inkforge/scripts/build-icons.mjs` (Node ESM + `sharp` + `png-to-ico`)
- **Tier selection logic** (`masterForSize(size)` in build-icons.mjs):
  - `size ≤ 24` → `master-16.svg`
  - `24 < size ≤ 48` → `master-32.svg`
  - `48 < size ≤ 128` → `master-64.svg`
  - `size > 128` → `master-256.svg`
  - `master-1024.svg` is intentionally NOT a raster source (reserved for
    in-app inline use; see §9.3).
- **Outputs**:
  - **Win `.ico`** (multi-resolution): 16 / 24 / 32 / 48 / 64 / 128 / 256
  - **macOS `.icns`** (8 entries): 16 / 32 / 64 / 128 / 256 / 512 / 1024 + 1024@2x (2048 actual)
  - **Linux PNG**: 32 / 64 / 128 / 256 / 512
  - **Tauri-named** (back-compat for `tauri.conf.json` bundle.icon): `32x32.png`, `128x128.png`, `128x128@2x.png`
- **Derivation chain**:
  - `master-16.svg` → 16×16, 24×24 raster
  - `master-32.svg` → 32×32, 48×48 raster, and `inkforge/public/favicon.svg` (favicon mirrors this tier)
  - `master-64.svg` → 64×64, 128×128 raster
  - `master-256.svg` → 256×256, 512×512, 1024×1024, 2048×2048 raster
  - `master-1024.svg` → inline reference in Vue components (`ForgeNibMark.vue` hero variant) / `index.html` boot placeholder / `splash.html` static identity. `build-icons.mjs` does NOT consume this tier.
- **Rebuild command**:
  ```bash
  cd inkforge && pnpm run icons:build
  # or: node scripts/build-icons.mjs
  ```
- **Idempotency**: Safe to re-run; each invocation fully overwrites
  `src-tauri/icons/*.png` / `.ico` / `.icns`. Output bytes are deterministic
  across machines because all masters are 0-font-dependency.

### 9.6 Motion Spec 动效规范

The mark has three living states beyond idle. All durations and easing
reference the canonical token ladder in `inkforge/src/styles/tokens.css`
(see §13).

| State | Trigger | Effect | Duration / Easing |
|---|---|---|---|
| **Idle** | Default | Static, no transform, no glow | — |
| **Hover** | `.forge-nib-mark--interactive:hover` (TitleBar seal, About page mark) | The whole mark warms via `filter: brightness(1.08) saturate(1.1)` — the Forged-Red ember warms up; no scale, no exterior aura | `var(--motion-base)` (180ms), `var(--ease-out-quart)` |
| **Annealing** | `data-state="annealing"` attribute set 600ms by autosave event subscriber | The Forged-Red ember (`.forge-nib-mark__ember` + glow + highlight) pulses 100% → 125% brightness → 100% (single warmth flare narrating the 铸/cast moment) | 600ms total, `var(--ease-out-quart)` symmetric in/out |
| **Launch** | Splash window draw — see §10 | Splash mark stamps down using EXISTING drop → squish → bleed sequence; the static identity inside the bleed is the mark from `master-1024.svg` | 800–880ms total (timing inherited from prior splash, NOT recalibrated) |

**Removed from prior versions**:
- The `transform: scale(1.06)` hover scale-up stays REMOVED. The mark warms
  rather than bounces.
- The exterior drop-shadow on hover stays REMOVED. The hero-tier contact
  shadow + ember glow live only at tier 5 (static, not hover-triggered).

**Reduced motion**: Per §13.4, `prefers-reduced-motion: reduce` cascades
`var(--motion-base)` to 0ms, so the hover warmth becomes instant. The
annealing pulse does not reference a motion token (its 600ms is a semantic
warmth window), so it is killed explicitly under reduced motion. The splash
drop / squish / bleed sequence is independently neutralized via
`splash.html`'s `@media` block — see §10.5.

### 9.7 Material Layer 立体材质层

> The flat silhouette reads clean but the hero tiers add a restrained material
> layer so the mark reads as a CAST object rather than a flat icon.

#### 9.7.1 Material Intent 材质意图

1. **Drop sheen** — at tier 5 the ink-drop is filled by a vertical
   `linearGradient` (`#2B2F35` top → `#1C1F23` mid → `#141619` bottom), so the
   drop catches a soft top highlight like a wet bead of ink.
2. **Ember glow** — at tiers 4–5 a soft Forged-Red radial highlight warms the
   ember (the molten signal of inspiration).
3. **Contact shadow** — at tiers 4–5 a warm radial ellipse sits under the
   anvil foot, grounding the mass.

#### 9.7.2 Per-Tier Material Specification 分级材质规范

| Tier | Slice | Arrow | Drop highlight | Ember | Anvil shadow |
|---|---|---|---|---|---|
| 16 | — (solid drop) | — | — | flat dot | — |
| 32 | thin gap | stub + simple head | — | flat dot | — |
| 64 | full gap | full head | 1px-equiv highlight path | flat dot | — |
| 256 | full gap | full head | soft top-left highlight | dot + soft highlight | soft radial ellipse |
| 1024 | full gap | full head | drop sheen gradient | dot + radial glow | warm radial ellipse |

**Color tokens used**: `#1C1F23` Ink Black (drop / arrow / anvil / shadow),
`#C9362C` Forged Red (ember), `#E66054` lighter red (ember glow / highlight),
`#2B2F35`–`#141619` (drop sheen stops), `#F7F4EF` Paper (slice gap, revealed
through the `<mask>`).

#### 9.7.3 SVG Primitives Used 实现手法

`circle` (ember + glow) + `path` (drop + arrow shaft + arrowhead + anvil +
slice mask cut + drop highlight) + `ellipse` (contact shadow) + `mask` (slice
negative space) + `linearGradient` (drop sheen) + `radialGradient` (ember glow
+ contact shadow). No `rect` body modules. No `filter`. No `polygon`.

#### 9.7.4 Validation Contract 验证契约

The material layer does NOT remove or alter the brand-mark structural
primitives asserted by e2e:

- `darkPaths >= 2` (`<path fill="#1C1F23">` drop + anvil [+ arrow]) — HOLDS at every tier.
- `redAccents >= 1` (`#C9362C` ember) — HOLDS at every tier.
- `nibSlice >= 1` (a `<mask>`/`clipPath` carving the slice) — HOLDS at tiers 32–1024.
- `polygons === 0` (arrow authored as `<path>`) — HOLDS, ENFORCED.
- Tier-1024 hero `paths >= 3` (drop + arrow shaft + arrowhead + anvil) +
  `gradients >= 1` (sheen + ember glow + contact shadow) — HOLDS.

All 11 e2e specs in `inkforge/tests/e2e/specs/visual.spec.cjs` pass after the
brand-mark spec calibration (which retires the defunct 鼎-grid assertions —
`inkBlackRects >= 3`, `rects >= 5`, `filters >= 1` — in favor of the new
墨滴·笔锋·铁砧 ground-truth signals above — see the leading comment block in
that spec for the full rationale).

---

## 10. Splash Screen 启动屏

### 10.1 Design Intent 设计意图

InkForge 启动 splash 是 **「双击 icon → 首屏可交互」全链路** 第一个品牌投射节点。市面 editor 多用纯色背景 + spinner 占位（Notion / Obsidian / Logseq），instant-but-anonymous。InkForge splash 走相反方向：动画短（≤ 800ms）但有「印章降落 + 墨痕渗透」的人文叙事，让用户在毫秒级时间内感知到产品的匠人气质。

- **形 (Form)**: 居中 墨滴 · 笔锋 · 铁砧 mark + Latin wordmark + tagline 三层垂直布局; the static identity inside the bleed sequence is the §9 v5 墨滴·笔锋·铁砧 mark (`master-1024.svg`), not the prior 鼎 grid mark.
- **色 (Color)**: Paper `#F7F4EF` 仿宣纸底 + Ink-Black `#1C1F23` ink-drop + anvil + nib-arrow + Forged-Red `#C9362C` ember + drop sheen gradient + ember glow + warm contact shadow + Ash tagline
- **叙 (Narrative)**: 「mark 落下 → 盖印瞬间挤压 → Forged-Red 墨痕从 mark 边缘 8 方向渗透」— 把品牌名「墨铸」(ink forged into form) 翻译为可视动画. The Forged-Red 8-direction bleed echoes the ember — the same molten signal spreading outward.

### 10.2 Layout 布局

```
┌─────────────────────────────────────────┐
│                                         │
│                ●                        │  ← 108×108 墨滴·笔锋·铁砧 mark
│               ◢◣      ↗                 │     (master-1024.svg 几何,
│              ◢██◣  ╱                    │      Forged-Red ember ● +
│              ███◤╱                      │      sliced Ink-Black ink-drop +
│               ◥◤                        │      nib-arrow ↗ + forging anvil)
│             ╱▔▔▔▔╲                      │
│             ╲▁▁▁▁╱                      │
│                                         │
│        InkForge · 墨铸                  │  ← wordmark (host HTML uses app font stack)
│         成为作者吧                       │  ← tagline (italic, letter-spacing 0.25em)
│                                         │
└─────────────────────────────────────────┘
                  520 × 340
```

The mark is centered and slightly taller than wide (~498px wide × ~710px tall
inside the 1024 canvas), so its 108×108 splash footprint is balanced. The
top→bottom narrative — ember (灵感) → ink-drop (墨) → nib-arrow (发送) → anvil
(铸) — leads the eye straight down to where the wordmark anchors beneath.

### 10.3 Animation Timing 动画时序

Timing is **preserved as-is** across all logo redesigns (v1 Forge Nib →
v2 印×笔 镇尺 lockup → v3 笔锋 + 火 single-gesture → v4 鼎 × 笔尖 × 方格 →
v5 墨滴 · 笔锋 · 铁砧). Only the static identity inside the bleed sequence has
changed; the drop/squish/bleed choreography below was tuned against the IPC
handshake budget and the v5 mark inherits it intact.

| 阶段 | 时间 | 元素 | 行为 |
|---|---|---|---|
| **0 → 300ms** | drop | mark | translateY(-40px) → 0 + scale(0.92) → 1.0，easing `cubic-bezier(0.16, 1, 0.3, 1)` |
| **300 → 360ms** | squish | mark | scaleY(0.92) → 1.02 → 1.0，模拟「盖印瞬间的橡胶弹性」 — the Ink-Black mass flexes; the Forged-Red ember stays static (the molten signal inside the cooler compression) |
| **240 → 740ms** | rise | wordmark | translateY(8px) → 0 + opacity(0) → 1，250ms delay |
| **360 → 800ms** | bleed | 8-direction ink (Forged Red) | opacity(0) → 0.35 → 0，radial gradient spreading from the mark perimeter — the molten signal made visible as a transient halo (the same red signature the ember carries) |
| **480 → 880ms** | fade | tagline | opacity(0) → 1，最后出现的元素 |

**总时长**：约 800–880ms。后端 setup hook → splash 渲染 → onMounted → IPC `app_ready` 链路通常 ≤ 600ms，留约 200ms 让动画完成自然收尾再被 `close_splash_and_show_main` 关闭。

### 10.4 Dark Mode 暗色模式

启动链路 dark/light 通过 **Rust setup hook 优先 + CSS 媒体查询兜底** 双层保险：

1. **Rust setup hook**: 用 `dark-light` crate 探测 OS 主题，在 splash 窗口 ready 后通过 `splash.eval(...)` 注入 `<html data-theme="dark|light">`
2. **CSS 媒体查询**: 即使 IPC 失败，`@media (prefers-color-scheme: dark)` 也会回退到正确主题
3. **优先级**: `:root[data-theme="dark"]` 选择器特异性高于 `@media`，所以 Rust 显式注入永远 wins

| Token | Light | Dark |
|---|---|---|
| 背景 | Paper `#F7F4EF` | Char `#1A1D24` |
| 文字 | Ink Black `#1C1F23` | `#E8E4DC` |
| 辅文 | Ash `#6E7580` | Smoke `#9B958D` |
| mark body Ink Black | `#1C1F23` | `#1C1F23` (drop-shadow alpha lifts for legibility on Char bg) |
| ember Forged Red | `#C9362C` | `#E15A4E` (提亮以补暗底对比) |
| 8-direction bleed Forged Red | `#C9362C` @ peak alpha 0.35 | `#E15A4E` @ peak alpha 0.42 (compensates dark-mode shadow LIFT, per §16 anti-pattern #7) |

### 10.5 Reduced Motion 减少动画

`@media (prefers-reduced-motion: reduce)` 用户场景（Windows 设置 → 关闭动画 / macOS 辅助功能 → 减少动画）：

- 所有 `animation` 被 `!important` 重置为 `none`
- 所有 `opacity` 被强制为 `1`
- 所有 `transform` 被强制为 `none`
- 8-方向墨痕 `.ink-bleed` 直接 `display: none`（裸露的 8 个圆点对静态画面无意义）

结果：用户仍能看到完整的「ember + ink-drop + nib-arrow + anvil + wordmark + tagline」静态品牌印记，但无任何运动。The static 墨滴·笔锋·铁砧 mark (Forged-Red ember + sliced Ink-Black ink-drop + nib-arrow + forging anvil) is fully legible without animation — no part of the brand identity depends on movement.

### 10.6 IPC Handshake 协议

```
┌──────────────────────┐       ┌──────────────────────┐
│  Rust setup hook     │       │  Vue App.vue          │
│  (main thread)       │       │  (frontend)           │
├──────────────────────┤       ├──────────────────────┤
│ 1. dark-light::detect│       │                       │
│ 2. spawn splash      │──────▶│                       │
│    (visible:true)    │       │                       │
│ 3. eval(data-theme)  │──────▶│ <html data-theme>     │
│ 4. spawn 3s timeout  │       │                       │
│    (cancellable via  │       │                       │
│     tokio::Notify)   │       │ 5. onMounted          │
│                      │       │ 6. await nextTick     │
│ 7. invoke('app_ready')◀──────│ 7. invoke('app_ready')│
│ 8. notify_waiters()  │       │                       │
│ 9. splash.close()    │       │                       │
│ 10. main.show()      │       │                       │
└──────────────────────┘       └──────────────────────┘

Fallback path (frontend never signals):
  ├─ timeout fires after 3s
  ├─ splash.close()
  └─ main.show()
```

### 10.7 Splash 关闭时机契约

| 场景 | 关闭路径 | 期望耗时 |
|---|---|---|
| **正常启动 (90%+ 场景)** | IPC `app_ready` 立即关闭 | ≤ 800ms (含动画) |
| **后端崩溃 / Vue 异常** | 3s 强制 timeout 兜底 | ≤ 3s |
| **reload (F5)** | splash 不会被重新启动；index.html 内嵌静态印章占位（§11）→ Vue 挂载完成后 innerHTML 自动覆盖 | 几乎无感 |

### 10.8 文件位置

| 文件 | 用途 |
|---|---|
| `inkforge/public/splash.html` | Splash 子窗口 HTML + CSS-only 动画 |
| `inkforge/src-tauri/src/splash.rs` | Rust 端 `inject_splash_theme` / `close_splash_and_show_main` |
| `inkforge/src-tauri/src/commands/app_ready.rs` | `#[tauri::command] app_ready` + `SplashReadySignal` (Arc\<Notify\>) |
| `inkforge/src-tauri/src/main.rs` (setup hook) | 主题检测 + splash 注入 + 3s timeout 任务 |
| `inkforge/src/services/app-lifecycle/notifyAppReady.ts` | 前端 `invoke('app_ready')` 工具 (非 Tauri 环境 no-op) |
| `inkforge/src/App.vue` (`onMounted` 末尾) | `await nextTick() → void notifyAppReady()` |

---

## 11. Loading Placeholder 启动占位

### 11.1 Design Intent 设计意图

The inline placeholder rendered inside `index.html` `<div id="app">` is the
**third moment** in the InkForge startup chain (after the Tauri splash window
and just before the Vue app mounts and replaces it). It is the only visible
artifact during full reload (F5 / devtools reload) inside the main window, so
it must read as a continuation of the splash — same seal, same Paper field,
same wordmark, same tagline narrative — but quieter and motion-restrained.

- **形 (Form)**: 静态 墨滴 · 笔锋 · 铁砧 mark (140×140, mirrors `master-1024.svg` geometry) + 「InkForge · 墨铸」wordmark + 「正在准备墨砚...」caption
- **色 (Color)**: Paper `#F7F4EF` 底 + Ink-Black `#1C1F23` ink-drop + anvil + nib-arrow + Forged-Red `#C9362C` ember + drop sheen + ember glow + warm contact shadow + Ink-Black `#1C1F23` wordmark + Smoke `#9B958D` caption
- **声 (Voice)**: caption「正在准备墨砚...」延续匠人锻造叙事，比通用 "Loading..." 更有人格

### 11.2 Technical Contract 技术约束

- **0 JavaScript dependency**: placeholder must render before `/src/main.ts`
  finishes evaluating. All markup + styles are inline in `index.html`.
- **0 external request**: seal SVG is inlined as DOM (not `<img src=…>`),
  fonts fall through the system CJK serif chain — no font fetch on first paint.
- **CSS class anchor**: container uses `.ink-app-shell` so Vue's `app.mount('#app')`
  cleanly replaces it; do **not** mount the Vue app at a different node.
- **A11y**: container is `role="status"` `aria-live="polite"` so screen readers
  announce loading state without stealing focus.

### 11.3 Animation 动效

The caption text is the only animated element: a 1.4s `cubic-bezier(0.4, 0, 0.2, 1)`
infinite opacity pulse between 0.45 and 1.0. This is intentionally subtle —
just enough to communicate liveness without competing with the brand seal.

- **`prefers-reduced-motion: reduce`**: caption animation is disabled, opacity
  pinned at 0.85. Seal and wordmark are always static (no entry animation).

### 11.4 Dark Mode 暗色模式

Activated by `@media (prefers-color-scheme: dark)` at the CSS level (the
placeholder exists before the Settings-store-driven `data-theme` attribute is
ever set on `:root`, so the placeholder uses OS preference as the only
signal). Dark palette:

- Background → Char `#1A1D24`
- Wordmark → `#E8E4DC` (light text on Char)
- Wordmark separator dot → Forged Red lifted `#E15A4E`
- Caption → Ash `#6E7580`
- Seal drop-shadow alpha lifted to 0.55 for visibility on the dark field

### 11.5 When the Placeholder Appears 出现时机

| 场景 | 是否可见 |
|---|---|
| 双击 InkForge.exe 冷启动 | 不可见（splash window 接管） |
| Tauri 主窗口 F5 reload / devtools reload | 可见（`index.html` 重新加载） |
| 浏览器开发模式 `pnpm dev` 首次加载 | 可见（无 splash window） |
| Vue 已挂载后 | 不可见（被 router-view + TitleBar 替换） |

---

## 12. Titlebar 标题栏

### 12.1 Design Intent 设计意图

InkForge's titlebar is the **first piece of branded UI** the user sees after
the splash hands off to the main window. It must:

- Carry brand continuity (seal logo + brand wordmark / current document name)
- Provide native-feeling window controls without giving up the design system
- Respect each OS's window chrome conventions

### 12.2 Platform Strategy 平台策略

| 平台 | tauri.conf | 渲染策略 |
|---|---|---|
| **Windows** | `decorations: false` | 自绘 32px 高 titlebar，内嵌 seal + 文档名 + min/max/close 按钮 |
| **Linux** | `decorations: false` | 同 Windows 策略 |
| **macOS** | `titleBarStyle: "Overlay"` + `hiddenTitle: true` | 系统保留 traffic light（左 ~80px），内容区右移 28px inset，仅渲染 seal + 文档名 |

### 12.3 Layout 布局

Windows / Linux structure (Inkstone Glass, **36px** tall — increased from 32px
in the PR1 visual-polish sweep to give the seal + EB Garamond italic wordmark
room to breathe and to expose the Kiln ember gradient signature line):

```
┌────────────────────────────────────────────────────────────────────────┐
│ [data-tauri-drag-region — backdrop-filter blur(20px) saturate(140%)]  │
│  [20px ForgeNibMark]  InkForge · 「文档名」          [_]  [□]  [×]    │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ◀ Ember gradient   │
└────────────────────────────────────────────────────────────────────────┘
   ↑ drag region (whole bar minus buttons)              ↑ no-drag controls
```

macOS structure (28px inset, traffic light spacer retained):

```
┌──────────────────────────────────────────────────────┐
│ ●●●   [seal + 文档名 center, data-tauri-drag-region] │
└──────────────────────────────────────────────────────┘
  ↑ system traffic light       ↑ background transparent
```

### 12.4 Logo 嵌入 Embedded Seal

- Size: **20×20** on Windows / Linux Inkstone Glass titlebar (PR1 upgrade
  from 14×14, in tandem with the 36px chrome height); 14×14 on macOS where
  the 28px inset bar keeps the smaller footprint. Uses the shared inline
  `<ForgeNibMark :size="20" interactive />` component.
- Composition: Forge Nib geometry — Kiln rounded square + Graphite nib diamond + Vellum slit + Amber forge line. **No ◇ ornament row** at this size (would degrade to noise)
- Padding: 0 (the titlebar acts as the container)
- Hover (Inkstone Glass): seal scales 1.06 with a Kiln drop-shadow glow at
  `var(--motion-base)` (180ms) / `var(--ease-out-quart)`. The
  `interactive` prop on `ForgeNibMark.vue` enables this; the parent
  `.ink-titlebar__seal` wrapper keeps `pointer-events: none` so the drag
  region still hit-tests, and a `:global` selector lifts the hover
  signal into the SVG class.

### 12.5 Title Text 标题文本

- **Source**: active article title (`articleStore.selectedArticle?.title`) when present, otherwise `成为作者吧` tagline fallback
- **Font**: `Source Han Serif SC, Noto Serif SC, EB Garamond, Georgia, serif`
- **Size / weight**: 12px / 500
- **Color**: Graphite `#252933` (light) / `#E8E4DC` (dark)
- **Letter-spacing**: 0.06em
- **Opacity**: 0.78 — softer presence so the chrome title hints at the document instead of competing with the editor content below
- **Truncation**: `text-overflow: ellipsis` with `max-width: 60vw` so very long article titles fade into `...` instead of pushing the window-control buttons offscreen

### 12.6 Window Control Buttons 窗口按钮 (Windows / Linux)

| 按钮 | 图标 | 默认状态 | Hover / Focus |
|---|---|---|---|
| Minimize | `lucide-vue-next` Minus | 透明背景 + Graphite icon | bg `rgba(217,91,63,0.10)` (Kiln @10%) |
| Maximize / Restore | `lucide-vue-next` Square (max) → Copy (restore) | 同上 | 同上 |
| Close | `lucide-vue-next` X | 同上 | bg Kiln `#D95B3F` + white icon |

- Button size: **50×36** in the Inkstone Glass chrome (PR1 upgrade from
  46×32 — matches the new 36px chrome height). Win11's native chrome uses
  46×32 at the standard density, but the Inkstone Glass titlebar runs 36px
  to surface the ember gradient + EB Garamond italic doc title, and the
  controls scale with it.
- Hover transitions are token-driven:
  `transition: background-color var(--motion-fast) var(--ease-out-quart),
   color var(--motion-fast) var(--ease-out-quart);`
- `:focus-visible` uses `box-shadow: inset var(--focus-ring)` — inset because
  the controls hit the window edge and an outer ring would overflow.
- Buttons MUST NOT carry `data-tauri-drag-region` in any form — Tauri 1.x
  core.js drag handler tests with `hasAttribute()`, so the attribute's mere
  presence (even with value `"false"`) traps mousedown and breaks `@click`.
  Buttons live in a sibling container (`.ink-titlebar__controls`) that lacks
  the attribute, so they default-correctly. Child Lucide SVG icons get
  `pointer-events: none` so `e.target` of mousedown is always the button.
- The Electron-only `-webkit-app-region: no-drag` declaration is **not** used. Tauri WebView2/WKWebView honors the `data-tauri-drag-region` attribute instead.

### 12.7 Dark Mode 暗色模式

Driven by `:root[data-theme="dark"]` (the Settings-store synced attribute) **and**
`@media (prefers-color-scheme: dark)` as a fallback when no explicit theme is
set. Palette:

| Token | Light | Dark |
|---|---|---|
| Titlebar bg | Vellum `#F5F0E6` | Char `#1A1D24` |
| Titlebar fg | Graphite `#252933` | `#E8E4DC` |
| Border token (`--ink-titlebar-border`, no longer rendered as hard line) | Hairline `#DED7CA` | `#3A3D44` |
| Shadow (`--ink-titlebar-shadow`, replaces border) | `0 1px 0 rgba(0,0,0,0.02)` | `0 1px 0 rgba(255,255,255,0.04)` |
| Accent (close hover, btn hover) | Kiln `#D95B3F` | Kiln lifted `#E8734F` |
| Btn hover bg | `rgba(217,91,63,0.10)` | `rgba(232,115,79,0.16)` |

### 12.8 CSS Variable Contract CSS 变量契约

The titlebar exposes one global variable so view shells can offset their
content:

```
--ink-titlebar-height: 32px  /* Windows / Linux default */
--ink-titlebar-height: 28px  /* macOS inset */
```

Set on `:root` by `TitleBar.vue` during `onMounted`. View shells should pad
their top by `var(--ink-titlebar-height)` rather than hard-coding a number.

### 12.9 Snap / Maximize Compatibility Snap 与最大化兼容

- Windows Snap (Win + ←/→/↑, edge-drag maximize, AeroSnap regions) continues
  to work because `data-tauri-drag-region` enables hit-testing for snap zones.
- Double-click on the drag region triggers maximize/restore via Tauri's
  built-in behavior — `toggleMaximize()` in `window-controls.ts` is the
  programmatic equivalent.
- `decorations: false` does **not** disable Snap; it only removes the OS-drawn
  chrome. Resize handles remain active.

### 12.10 Forbidden Patterns 禁忌

- Do **not** render the titlebar inside a `router-view` slot — it must live in
  `App.vue` at the same level as the route shell so it survives transitions.
- Do **not** put `data-tauri-drag-region` on the window control buttons in any
  form — including `data-tauri-drag-region="false"`. Tauri 1.x core.js uses
  `e.target.hasAttribute('data-tauri-drag-region')` which returns TRUE for
  any value (including `"false"`), so the attribute's presence alone traps
  mousedown and prevents the `@click` handler from firing. Buttons MUST OMIT
  the attribute entirely. Only the parent `.ink-titlebar__drag` div carries
  it; child Lucide SVG icons inside the buttons get `pointer-events: none`
  so `e.target` of mousedown is always the button itself (which lacks the
  attribute, so no drag fires).
- Do **not** import lucide icons that are not already in the bundle just to
  vary the chrome — Minus / Square / Copy / X are sufficient.
- Do **not** use Emoji as the seal or the buttons.

---

## 13. Motion Tokens 动效令牌

> Canonical source: `inkforge/src/styles/tokens.css`. Splash window mirrors a
> subset inline (it loads before Vue and cannot import the file).

### 13.1 Design Intent 设计意图

Restrained Premium — the same lane as Linear and Notion. 0 spring, 0 bounce,
0 parallax. The motion ladder is short on purpose: four durations and one
easing curve cover every InkForge transition. Anything that needs more is a
sign the interaction is fighting the rest of the system.

### 13.2 Ladder 阶梯

| Token | Value | Use case |
|---|---|---|
| `--motion-instant` | `80ms` | tooltip show/hide, focus ring fade |
| `--motion-fast` | `120ms` | button/sidebar hover bg, control tint |
| `--motion-base` | `180ms` | Forge Nib seal scale 1.06, window control hover, icon tint |
| `--motion-slow` | `240ms` | modal fade+slide, view transitions, surface cross-fade |

Single easing curve:

| Token | Value |
|---|---|
| `--ease-out-quart` | `cubic-bezier(0.22, 1, 0.36, 1)` |

### 13.3 Usage Rules 使用规则

- Always reference the variable, never hardcode the ms value. The variable
  cascades through `prefers-reduced-motion`; raw ms does not.
- Pair `transition` and `animation-duration` declarations with
  `var(--ease-out-quart)` unless there is a specific reason (e.g. ember bleed
  uses a symmetrical curve because both ends fade out).
- No spring / no bounce tokens are exposed. If a celebratory moment ever needs
  one, gate it behind a feature flag, do not promote it into the shared ladder.

### 13.4 Reduced Motion 减少动画

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-instant: 0ms;
    --motion-fast: 0ms;
    --motion-base: 0ms;
    --motion-slow: 0ms;
  }
}
```

Cascading the tokens to `0ms` is preferred over per-rule `animation: none`
overrides — every component that respects the ladder is now reduced-motion-
compliant automatically. Decorative `transform` / `scale` / `glow` effects
collapse; functional `opacity` transitions remain visible because they read
as state, not motion.

### 13.5 Example 示例

```css
.ink-titlebar__btn {
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.forge-nib-mark--interactive {
  transition: transform var(--motion-base) var(--ease-out-quart),
              filter var(--motion-base) var(--ease-out-quart);
}

.forge-nib-mark--interactive:hover {
  transform: scale(1.06);
  filter: drop-shadow(0 0 8px rgba(217, 91, 63, 0.5));
}
```

---

## 14. Elevation Ladder 层级阴影

> Canonical source: `inkforge/src/styles/tokens.css`. Light / dark variants
> live on `:root` and `:root[data-theme='dark']` respectively, with an OS
> preference fallback for unbranded sessions.

### 14.1 Design Intent 设计意图

Three levels. No more. The premium-app survey (`research/premium-writing-app-
chrome.md` §3) shows Linear, Bear, Ulysses, and Notion all converge on the
same 3-rung ladder: resting card → hover/popover → modal. Anything beyond
elevation-3 is either a `position: fixed` overlay or a wrong choice.

### 14.2 Light Mode 浅色模式

| Token | Value | Use case |
|---|---|---|
| `--elev-1` | `0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)` | resting card, surface chrome |
| `--elev-2` | `0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)` | card hover, popover, dropdown |
| `--elev-3` | `0 16px 40px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)` | modal, command palette, floating panel |

### 14.3 Dark Mode 暗色模式

Per the research §4 anti-pattern #7: dark mode shadows must be **LIGHTER on
darker surfaces, not darker shadows**. The black alpha is lifted so the
shadow remains a visual layer rather than disappearing into the bg.

| Token | Value |
|---|---|
| `--elev-1` | `0 1px 2px rgba(0,0,0,0.4)` |
| `--elev-2` | `0 4px 12px rgba(0,0,0,0.5)` |
| `--elev-3` | `0 16px 40px rgba(0,0,0,0.6)` |

### 14.4 Hairlines 发丝边

Hard `1px solid #DED7CA` reads as Bootstrap 2014 (research §4 anti-pattern
#1). Replace with cascading hairline tokens:

| Token | Value |
|---|---|
| `--hairline-light` | `rgba(37, 41, 51, 0.06)` |
| `--hairline-dark` | `rgba(245, 240, 230, 0.08)` |
| `--hairline` | `var(--hairline-light)` (auto-flips under dark contract) |

The original `Hairline` brand token (`#DED7CA`) is reserved for INTENTIONAL
dividers (Settings tab dividers, image frame edges) — not all panel edges.

### 14.5 Focus Ring 焦点环

Kiln double-ring, accessibility-mandatory:

| Token | Value |
|---|---|
| `--focus-ring` | `0 0 0 2px #D95B3F, 0 0 0 4px rgba(217, 91, 63, 0.2)` |

App.vue applies it globally to `button, a, input, select, textarea,
[tabindex]` via `:focus-visible`. TitleBar window controls use the same
token with `inset` so the ring does not spill past the window edge.

### 14.6 Surface Translucency 表面半透明

Chrome only (research §3 lesson: glass is for chrome, NOT for content). The
fallback hex applies under `@supports` for engines that cannot composite
`backdrop-filter` — older WebKitGTK, software rasterizer.

| Token | Value |
|---|---|
| `--surface-chrome-light` | `rgba(245, 240, 230, 0.92)` |
| `--surface-chrome-dark` | `rgba(26, 29, 36, 0.84)` |
| `--surface-chrome-fallback-light` | `#F5F0E6` |
| `--surface-chrome-fallback-dark` | `#1A1D24` |

### 14.7 Example 示例

```css
.surface-card {
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-fast) var(--ease-out-quart),
              transform var(--motion-base) var(--ease-out-quart);
}

.surface-card:hover {
  box-shadow: var(--elev-2);
  transform: translateY(-2px);
}

.surface-modal {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: var(--elev-3);
}
```

---

## 15. Typography Rhythm 排版节奏

> Canonical source: `inkforge/src/styles/tokens.css`. App.vue installs the
> body default (`var(--font-sans)`, `var(--type-weight-normal)`) so every
> view inherits the dual-weight ladder automatically.

### 15.1 Design Intent 设计意图

Ulysses rule (research §5 Pattern E): typography rhythm carries layout, not
borders. Pick a scale and obey it. The 14 / 22 / 34 / 56 ladder powers Hub
cards, Settings sections, modal stack spacing — anywhere whitespace can
substitute for hairlines.

Dual-weight ladder (research §4 anti-pattern #4): premium apps pick 2-3
weights MAX. InkForge uses 400 (normal) + 600 (emphasis). No 500. No 700
heading weights outside the article body itself.

### 15.2 Vertical Scale 垂直比例

| Token | Value | Use case |
|---|---|---|
| `--type-step-1` | `14px` | meta / caption / micro-label |
| `--type-step-2` | `22px` | body / paragraph baseline |
| `--type-step-3` | `34px` | section heading inside a view |
| `--type-step-4` | `56px` | view title, modal hero |

### 15.3 Weight Ladder 字重阶梯

| Token | Value |
|---|---|
| `--type-weight-normal` | `400` |
| `--type-weight-emphasis` | `600` |

### 15.4 Font Faces 字体栈

| Token | Stack | Use case |
|---|---|---|
| `--font-serif` | `'EB Garamond', 'Source Han Serif SC', 'Noto Serif SC', Georgia, serif` | brand wordmark, doc title in titlebar, drop caps, chapter numerals |
| `--font-sans` | `'Inter', system-ui, -apple-system, 'Segoe UI', 'Source Han Sans SC', sans-serif` | UI labels, buttons, body chrome |
| `--font-mono` | `'JetBrains Mono', 'Cascadia Code', Consolas, Menlo, monospace` | counters, timestamps, code |

### 15.5 Usage Rules 使用规则

- Headings and large text use `var(--font-serif)`; UI surface text uses
  `var(--font-sans)`. Mixing them in the same horizontal strip is a smell.
- Use `var(--type-weight-emphasis)` for headings and active states only. Body
  emphasis (`<strong>`) keeps the Amber gradient underlay (§4.5), not raw
  weight 700.
- Letter spacing is rhythm-adjacent: serif headings use `0.04em–0.06em`,
  sans UI defaults to none.

### 15.6 Example 示例

```css
.view-title {
  font-family: var(--font-serif);
  font-size: var(--type-step-4);
  font-weight: var(--type-weight-emphasis);
  letter-spacing: 0.04em;
  line-height: 1.1;
}

.section-heading {
  font-family: var(--font-serif);
  font-size: var(--type-step-3);
  font-weight: var(--type-weight-emphasis);
  margin-block: var(--type-step-2);
}

.meta-row {
  font-family: var(--font-mono);
  font-size: var(--type-step-1);
  color: var(--ink-text-muted, #6E7580);
}
```

---

## 16. Dark Mode Contract 暗色模式契约

> Canonical source: `inkforge/src/styles/tokens.css`. Closeout from the PR3
> visual-polish sweep — finalises the cross-surface dark-mode rules that the
> Hub/Workstation/Settings/Welcome pages now obey via tokens instead of
> hand-tuned per-component overrides.

### 16.1 Design Intent 设计意图

Dark mode is **not** a luma flip of light mode. The premium-app research (see
`research/premium-writing-app-chrome.md` §4 anti-pattern #7) calls this out as
the single most common "cheap" tell in cross-platform apps: invert the page
luma but reuse the same shadow alpha and the same hairline colour, and the
chrome dies under the dark field.

InkForge's dark contract instead re-tunes three things at the token layer so
every surface stays consistent:

1. **Elevation shadow alpha is LIFTED**, not flipped. Dark surfaces need
   *darker* (= more visible) shadows because there is less luma headroom
   behind them. Anti-pattern #7 says: `0.06 → 0.4` for elev-1, `0.06 → 0.5`
   for elev-2, `0.12 → 0.6` for elev-3.
2. **Hairlines flip to a Vellum-tinted alpha** so they read against Char
   backgrounds without becoming hard ink lines. Light `rgba(37,41,51,0.06)`
   → dark `rgba(245,240,230,0.08)`. The `--hairline` token cascades; consumers
   only ever write `var(--hairline)` (or `var(--hairline-light)` directly
   when intentional).
3. **Brand-locked surfaces keep their hand-tuned palette** but route their
   shadows through `var(--elev-*)` so the alpha auto-flips. Examples that
   PR3 migrated:
   - HubView bento-card (`box-shadow: var(--elev-1)`)
   - HubView article-card hover (`var(--elev-2)`)
   - HubView template-market-card hover (`var(--elev-2)`)
   - HubView insight-card (`var(--elev-1)`)
   - HubView category-dropdown (`var(--elev-2)`)
   - WorkstationView preview-device-frame (`var(--elev-2)`)
   - WorkstationView panel-stage shell (`var(--elev-3)`)
   - WorkstationView mode-toast (`var(--elev-3)`)
   - WorkstationView stage-tab.active / panel-tab.active (`var(--elev-1)`)
   - SettingsView sv-tab / sv-nav / sv-stat-card / sv-theme-card hover /
     sv-platform-card hover / sv-provider-card hover (`var(--elev-1)`)

   Intentional brand glows that DO NOT migrate (the colour IS the message —
   the Kiln/Tempera tint must stay regardless of light/dark): the Hero card
   ember glow (`HubView .card-hero`), Kiln CTA pillow shadows, native slider
   thumb shadows, and the inspector pinned drop shadow (directional, not a
   resting elevation).

### 16.2 Token Behaviour 令牌行为

```css
:root {
  --elev-1: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 1px rgba(0, 0, 0, 0.02);
  --elev-2: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
  --elev-3: 0 16px 40px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
  --hairline-light: rgba(37, 41, 51, 0.06);
  --hairline-dark:  rgba(245, 240, 230, 0.08);
  --hairline:       var(--hairline-light);
}

:root[data-theme='dark'] {
  --elev-1: 0 1px 2px rgba(0, 0, 0, 0.4);
  --elev-2: 0 4px 12px rgba(0, 0, 0, 0.5);
  --elev-3: 0 16px 40px rgba(0, 0, 0, 0.6);
  --hairline: var(--hairline-dark);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --elev-1: 0 1px 2px rgba(0, 0, 0, 0.4);
    --elev-2: 0 4px 12px rgba(0, 0, 0, 0.5);
    --elev-3: 0 16px 40px rgba(0, 0, 0, 0.6);
    --hairline: var(--hairline-dark);
  }
}
```

Two-tier cascade:

1. `:root[data-theme='dark']` — the explicit theme set by the Settings store
   wins. Once the user picks dark, system preference is ignored.
2. `@media (prefers-color-scheme: dark) :root:not([data-theme])` — the OS
   preference fills in only when no explicit theme is set yet (e.g. the
   splash window before the Settings store is even loaded; the loading
   placeholder in `index.html`).

Both branches output the same token values; the cascade is purely about who
wins when both signal at once. The explicit attribute selector has higher
specificity than the media query, so the Settings store always wins.

### 16.3 Anti-pattern #7 Callout 错调红线

> Dark mode shadows must use HIGHER alpha, NOT lower. A dark surface needs
> MORE shadow to register, not less.

Concretely:

| Token | Light alpha | Dark alpha | Direction |
|---|---|---|---|
| `--elev-1` (resting) | 0.04 + 0.02 | 0.4 | LIFTED (~10×) |
| `--elev-2` (hover/popover) | 0.06 + 0.04 | 0.5 | LIFTED |
| `--elev-3` (modal/floating) | 0.12 + 0.06 | 0.6 | LIFTED |

If a future contributor adds a dark-mode override that LOWERS the shadow
alpha — `box-shadow: 0 1px 2px rgba(0,0,0,0.04)` in a
`html[data-theme="dark"]` block — that is the regression to catch in code
review.

### 16.4 Migration Helper 迁移辅助

When porting a hand-tuned dark shadow to tokens, prefer this decision tree:

1. Is the shadow **brand-coloured** (Kiln tint, Tempera tint, Amber glow)?
   → Keep the hand-tuned value. The colour IS the design intent.
2. Is the shadow **directional / inset / asymmetric**? (e.g.
   `-2px 0 12px` for a pinned right rail)
   → Keep the hand-tuned value. `--elev-*` is symmetric resting elevation.
3. Otherwise (neutral black-ink shadow):
   → Replace with the matching `--elev-1/2/3`. The token's dark variant
     already lifts the alpha; you don't need a separate dark override.

### 16.5 Reduced-Motion Independence

The dark contract operates on tokens that DO NOT cascade through
`prefers-reduced-motion`. Shadow alpha is a visual layering concern and
should not change with motion preference. Only the `--motion-*` ladder
collapses under reduced motion (see §13.4).

---

*Last updated: 2026-05-29*
*Version: 1.5*
*Author: InkForge Design System*
*v1.5 (2026-05-29): logo §9 fully rewritten again — the 鼎 × 笔尖 × 方格 grid mark (v4) was retired (read muddy/unclear at small sizes) and replaced with the user-approved 墨滴 · 笔锋 · 铁砧 mark (Logo Concept 08): a Forged-Red ember (灵感) atop a sliced Ink-Black ink-drop (墨), a nib-arrow shooting up-right (创作/发送/发布), over a forging anvil (铸/Forge) — clarity-first, bold-silhouette, surviving 16px. New logo-only 5-color palette (§9.0): 墨黑 #1C1F23 / 铸红 #C9362C / 灰 #6B6F76 / 浅灰 #E6E8EB / 砚白 #F7F4EF. §2.4 logo-mark DNA + §10–11 splash/boot recolored to the new palette; e2e brand-mark specs calibrated to the 墨滴·笔锋·铁砧 ground truth (darkPaths/redAccents/nibSlice replace the 鼎-grid rect assertions).*
*v1.3 (2026-05-28): logo §9 rewritten — 印×笔 镇尺 lockup retired after three flag misreads (Sri Lanka / Sudan); replaced with 笔锋 + 火 single-gesture mark (tapered Graphite nib + Kiln ember in V-notch, no rectangular frame).*
