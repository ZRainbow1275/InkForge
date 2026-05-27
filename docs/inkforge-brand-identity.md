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
| 辅助色 | 灰 / 浅蓝 / 无 | **Tempera 铜绿** (#3B7A6B) — 与 Kiln 的冷热对比独一无二 |
| 金属感 | 商务金 (#B8860B) / 奢侈金 (#FFD700) | **Amber 黄铜** (#C19A56) — 更朴素、更匠人 |
| 背景 | 纯白 (#FFF) / 冷灰 (#FAFAFA) | **Vellum 宣纸** (#F5F0E6) — 有温度的暖白 |
| 文字色 | 纯黑 (#000) / 炭灰 (#333) | **Graphite 高碳钢** (#252933) — 带蓝底调的深色 |
| 整体感 | 企业/学术/极简 | **匠人工坊** — 温暖而精确 |

**Kiln + Tempera 的冷热对比**是 InkForge 品牌的视觉 DNA。市面上没有任何编辑器或内容平台使用这一组合。

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

## 9. Logo Mark 标识

### 9.1 Design Intent 设计意图

- **形 (Form)**: 「铸」字方印 (bronze stamp seal) — 圆角矩形 + 中央阴文 + 底部 ◇ 三连印章符号
- **色 (Color)**: Kiln `#D95B3F` 朱砂底 + Graphite `#252933` 阴文「铸」+ Vellum `#F5F0E6` ◇ 衬底
- **叙 (Narrative)**: 「墨 + 铸」= ink cast into form。印章 (CJK 千年传统) × 圆角矩形 (现代 OS chrome 语言) 的桥接
- **唯一性 (Differentiation)**: 市面无任何 editor 使用 Kiln 朱砂底方印 + CJK 阴文 + 三连菱形组合作为 app icon

### 9.2 SVG Master

- **Location**: `inkforge/src-tauri/icons/master.svg`
- **viewBox**: 1024 × 1024
- **Safe area padding**: ~22% (seal 位于 226..798，572×572)，防 Win11 squircle 自动圆角 / macOS rounded square 自动剪切到主体
- **纯矢量**: 无 raster embed，CJK 字符通过 `font-family` fallback chain 渲染（`Source Han Serif SC` → `Noto Serif SC` → `Songti SC` → `STSong` → `SimSun`）
- **装饰细节**: `radialGradient` 内阴影模拟铸造金属质感 + `feGaussianBlur` 外阴影 6px@28% alpha

### 9.3 Sizing Rules 尺寸策略

| 用途 | size 范围 | padding 策略 |
|---|---|---|
| App icon (Win/macOS/Linux) | 16 ~ 1024 | 22% padding 主体留中 (使用 master.svg) |
| Favicon (浏览器 tab) | 32 | 减少 padding 至 ~6% 提升小尺寸辨识 (使用 `public/favicon.svg`) |
| Splash logo (居中印章) | 96 ~ 128 | 容器已限定空间，0 padding |
| TitleBar 内嵌 logo | 16 | 仅主体印章，0 padding，无 ◇ 衬底 |

### 9.4 Platform Squircle Handling 平台圆角处理

- **Windows 11**: 任务栏 / Start 自动 ~22% 圆角 crop，master 的 22% 安全 padding 确保「铸」字主体不被切到
- **macOS Big Sur+**: 系统对 app icon 自动 squircle 包装 (圆角矩形 mask)，22% padding 同样适用
- **Linux**: 各桌面环境 (GNOME / KDE / XFCE) 不统一；master 提供完整方形 + transparent 背景，DE 自行处理 mask

### 9.5 Generated Asset Pipeline 资产生成管线

- **Source**: `inkforge/src-tauri/icons/master.svg` (1024×1024 viewBox)
- **Tool**: `inkforge/scripts/build-icons.mjs` (Node ESM + `sharp` + `png-to-ico`)
- **Outputs**:
  - **Win `.ico`** (multi-resolution 包): 16 / 24 / 32 / 48 / 64 / 128 / 256
  - **macOS `.icns`** (8 entries): 16 / 32 / 64 / 128 / 256 / 512 / 1024 + 1024@2x (2048 actual)
  - **Linux PNG**: 32 / 64 / 128 / 256 / 512
  - **Tauri-named** (back-compat for `tauri.conf.json` bundle.icon): `32x32.png`, `128x128.png`, `128x128@2x.png`
- **Rebuild command**:
  ```bash
  cd inkforge && pnpm run icons:build
  # 或: node scripts/build-icons.mjs
  ```
- **Idempotency**: 安全重跑，每次完整覆盖 `src-tauri/icons/` 输出

---

## 10. Splash Screen 启动屏

### 10.1 Design Intent 设计意图

InkForge 启动 splash 是 **「双击 icon → 首屏可交互」全链路** 第一个品牌投射节点。市面 editor 多用纯色背景 + spinner 占位（Notion / Obsidian / Logseq），instant-but-anonymous。InkForge splash 走相反方向：动画短（≤ 800ms）但有「印章降落 + 墨痕渗透」的人文叙事，让用户在毫秒级时间内感知到产品的匠人气质。

- **形 (Form)**: 居中印章 + wordmark + tagline 三层垂直布局
- **色 (Color)**: Vellum `#F5F0E6` 仿宣纸底 + Kiln 印章 + Graphite 阴文「铸」+ Ash tagline
- **叙 (Narrative)**: 「印章落下 → 盖印瞬间挤压 → 墨痕从印章边缘 8 方向渗透」— 把品牌名「墨铸」（ink cast into form）翻译为可视动画

### 10.2 Layout 布局

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              ╔══════════╗               │  ← 108×108 印章
│              ║   铸     ║               │     (master.svg 几何 -22% padding)
│              ║ ◇ ◇ ◇   ║               │
│              ╚══════════╝               │
│                                         │
│        InkForge · 墨铸                  │  ← wordmark
│         成为作者吧                       │  ← tagline (italic, letter-spacing 0.25em)
│                                         │
│                                         │
└─────────────────────────────────────────┘
                  520 × 340
```

### 10.3 Animation Timing 动画时序

| 阶段 | 时间 | 元素 | 行为 |
|---|---|---|---|
| **0 → 300ms** | drop | 印章 | translateY(-40px) → 0 + scale(0.92) → 1.0，easing `cubic-bezier(0.16, 1, 0.3, 1)` |
| **300 → 360ms** | squish | 印章 | scaleY(0.92) → 1.02 → 1.0，模拟「盖印瞬间的橡胶弹性」 |
| **240 → 740ms** | rise | wordmark | translateY(8px) → 0 + opacity(0) → 1，250ms delay |
| **360 → 800ms** | bleed | 8-direction ink | opacity(0) → 0.35 → 0，radial 渐变从印章 8 方向边缘扩散 |
| **480 → 880ms** | fade | tagline | opacity(0) → 1，最后出现的元素 |

**总时长**：约 800–880ms。后端 setup hook → splash 渲染 → onMounted → IPC `app_ready` 链路通常 ≤ 600ms，留约 200ms 让动画完成自然收尾再被 `close_splash_and_show_main` 关闭。

### 10.4 Dark Mode 暗色模式

启动链路 dark/light 通过 **Rust setup hook 优先 + CSS 媒体查询兜底** 双层保险：

1. **Rust setup hook**: 用 `dark-light` crate 探测 OS 主题，在 splash 窗口 ready 后通过 `splash.eval(...)` 注入 `<html data-theme="dark|light">`
2. **CSS 媒体查询**: 即使 IPC 失败，`@media (prefers-color-scheme: dark)` 也会回退到正确主题
3. **优先级**: `:root[data-theme="dark"]` 选择器特异性高于 `@media`，所以 Rust 显式注入永远 wins

| Token | Light | Dark |
|---|---|---|
| 背景 | Vellum `#F5F0E6` | Char `#1A1D24` |
| 文字 | Graphite `#252933` | `#E8E4DC` |
| 辅文 | Ash `#6E7580` | Smoke `#9B958D` |
| 印章 Kiln | `#D95B3F` | `#E8734F` (提亮以补暗底对比) |

### 10.5 Reduced Motion 减少动画

`@media (prefers-reduced-motion: reduce)` 用户场景（Windows 设置 → 关闭动画 / macOS 辅助功能 → 减少动画）：

- 所有 `animation` 被 `!important` 重置为 `none`
- 所有 `opacity` 被强制为 `1`
- 所有 `transform` 被强制为 `none`
- 8-方向墨痕 `.ink-bleed` 直接 `display: none`（裸露的 8 个圆点对静态画面无意义）

结果：用户仍能看到完整的「印章 + wordmark + tagline」静态品牌印记，但无任何运动。

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
it must read as a continuation of the splash — same seal, same Vellum field,
same wordmark, same tagline narrative — but quieter and motion-restrained.

- **形 (Form)**: 静态「铸」印章 (64×64) + 「InkForge · 墨铸」wordmark + 「正在准备墨砚...」caption
- **色 (Color)**: Vellum `#F5F0E6` 底 + Kiln `#D95B3F` 印章 + Graphite `#252933` 阴文「铸」+ Ash `#6E7580` wordmark + Smoke `#9B958D` caption
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
- Wordmark → Smoke `#9B958D`
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

Windows / Linux structure (32px tall):

```
┌────────────────────────────────────────────────────────────────────────┐
│ [data-tauri-drag-region                                                ] │
│  [16×16 seal SVG]  「文档名 or 成为作者吧」    [_]  [□]  [×]          │
│ ──────────────────────────────────────────────────────────────────── ◀ Hairline (1px)
└────────────────────────────────────────────────────────────────────────┘
   ↑ drag region (whole bar minus buttons)              ↑ no-drag controls
```

macOS structure (28px inset):

```
┌──────────────────────────────────────────────────────┐
│ ●●●   [seal + 文档名 center, data-tauri-drag-region] │
└──────────────────────────────────────────────────────┘
  ↑ system traffic light       ↑ background transparent
```

### 12.4 Logo 嵌入 Embedded Seal

- Size: 16×16 (inline `<svg>`, no external request)
- Composition: only the Kiln rounded square + Graphite「铸」阴文 — **no ◇ ornament row** at this size (would degrade to noise)
- Padding: 0 (the titlebar acts as the container)

### 12.5 Title Text 标题文本

- **Source**: active article title (`articleStore.selectedArticle?.title`) when present, otherwise `成为作者吧` tagline fallback
- **Font**: `Source Han Serif SC, Noto Serif SC, EB Garamond, Georgia, serif`
- **Size / weight**: 12px / 600
- **Color**: Graphite `#252933` (light) / `#E8E4DC` (dark)
- **Letter-spacing**: 0.04em
- **Truncation**: `text-overflow: ellipsis` with `max-width: 60vw` so very long article titles fade into `...` instead of pushing the window-control buttons offscreen

### 12.6 Window Control Buttons 窗口按钮 (Windows / Linux)

| 按钮 | 图标 | 默认状态 | Hover / Focus |
|---|---|---|---|
| Minimize | `lucide-vue-next` Minus | 透明背景 + Graphite icon | bg `rgba(217,91,63,0.10)` (Kiln @10%) |
| Maximize / Restore | `lucide-vue-next` Square (max) → Copy (restore) | 同上 | 同上 |
| Close | `lucide-vue-next` X | 同上 | bg Kiln `#D95B3F` + white icon |

- Button size: 46×32 (matches Win11 chrome conventions)
- Buttons MUST NOT carry `data-tauri-drag-region` (would block clicks)
- Buttons MUST carry `-webkit-app-region: no-drag` for the same reason on WebKit-based WebViews

### 12.7 Dark Mode 暗色模式

Driven by `:root[data-theme="dark"]` (the Settings-store synced attribute) **and**
`@media (prefers-color-scheme: dark)` as a fallback when no explicit theme is
set. Palette:

| Token | Light | Dark |
|---|---|---|
| Titlebar bg | Vellum `#F5F0E6` | Char `#1A1D24` |
| Titlebar fg | Graphite `#252933` | `#E8E4DC` |
| Border | Hairline `#DED7CA` | `#3A3D44` |
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
- Do **not** put `data-tauri-drag-region` on the window control buttons.
- Do **not** import lucide icons that are not already in the bundle just to
  vary the chrome — Minus / Square / Copy / X are sufficient.
- Do **not** use Emoji as the seal or the buttons.

---

*Last updated: 2026-05-27*
*Version: 1.0*
*Author: InkForge Design System*
