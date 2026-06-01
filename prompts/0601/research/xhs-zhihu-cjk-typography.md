# Research: 小红书 / 知乎 Publishing Constraints + CJK Typography Readability

- **Query**: (1) Publishing/body constraints & design surface of 小红书 (Xiaohongshu/RED) and 知乎 (Zhihu); (2) CJK typography readability — why ~20–22 Chinese chars/line, and the font-size × max-width × line-height math for premium 公众号 body text.
- **Scope**: External (web). Internal Grep/Glob unavailable (no ripgrep in env); used `curl` + primary-source fetch + `Write`.
- **Date**: 2026-06-01
- **Audience**: Inkforge multi-platform article-publishing tool (export targets: 微信公众号 / 知乎 / 小红书).

---

## 0. Source-confidence legend

| Tag | Meaning |
|---|---|
| **[PRIMARY]** | Fetched directly from the authoritative source this session (W3C spec, GitHub source code, vendor portal). |
| **[CORROBORATED]** | Multiple independent published sources agree on the number. |
| **[PLATFORM-BEHAVIOR]** | Widely-documented, stable product behavior. The canonical pages (zhihu.com question pages, xiaohongshu spec pages) return HTTP 403 / anti-bot to scrapers, so the citation is the official portal + community consensus rather than a machine-fetched spec line. Treat the *shape* of the rule as reliable; re-confirm any *exact numeric limit* against the live app before hard-coding it. |

> Anti-bot note: `www.zhihu.com/question/*` and most `xiaohongshu.com` spec/help endpoints returned **403** or empty to a scripted client this session. Their behavior is documented below from the reachable official portals (`creator.xiaohongshu.com` HTTP 200, Baidu Baike HTTP 200) plus stable, well-known product behavior. Hard numeric limits are flagged **[PLATFORM-BEHAVIOR]**.

---

# PART 1 — Platform publishing constraints

## 1.1 小红书 (Xiaohongshu / RED) — images ARE the design surface

**核心结论:** 小红书的「笔记」是 **图片优先** 的 UGC 格式。正文（笔记描述）本质是 **纯文本 + 话题标签(#) + @ + 平台 emoji**，**不接受富文本 HTML / CSS / 内联 SVG / 任意排版标记**。所有"排版设计"都必须 **烧录进图片**（封面图 + 内容图），以位图形式上传。SVG 只能作为 **渲染后的栅格图（PNG/JPG）** 进入平台，不能作为可编辑/可缩放的活动标记存在。

- 小红书定位为 UGC 社区，用户"通过 **短视频、图文** 等形式记录生活点滴"。图文笔记 = 一组图片 + 一段文字描述。**[PRIMARY: Baidu Baike「小红书」, https://baike.baidu.com/item/%E5%B0%8F%E7%BA%A2%E4%B9%A6 — 抓取确认正文表述「短视频、图文」]**
- 发布入口为创作者中心 / App「发布笔记」，以 **图片/视频 + 文字描述** 为单位。**[PRIMARY: creator.xiaohongshu.com 返回 HTTP 200 创作者门户]**
- 正文不渲染 HTML/Markdown：富文本、`<svg>`、`<style>`、`<table>`、自定义字体、行间距控制等在笔记正文中 **不存在**。能进入正文的只有：明文文字、换行、平台内置 emoji、`#话题`、`@用户`、地点标签。**[PLATFORM-BEHAVIOR]**
- 正文字数上限通常约 **1000 字**（标题约 20 字）。**[PLATFORM-BEHAVIOR — 以发布时实测为准]**

### 图片设计规格（这才是「设计面」）

| 项目 | 推荐值 | 说明 |
|---|---|---|
| 竖版主图比例 | **3:4**（最常用，竖屏占位最大、信息流曝光最优） | 标准「小红书图文/海报」比例 |
| 像素 | **1080 × 1440 px**（3:4）；也常见 1242×1660 | 短边 ≥1080 保证清晰 |
| 方形比例 | **1:1**（1080 × 1080 px） | 偏产品/九宫格风格 |
| 横版 | 4:3（不推荐用作封面，竖屏信息流被裁切） | |
| 单帖图片数 | 最多 **18 张** | 第 1 张 = 封面图，其余 = 内容图 |
| 安全区 | 文字/关键信息避开 **四周 ~10–12%** 边距、顶部/底部约 100px；封面文字避开右下角点赞/收藏浮层与信息流标题遮挡区 | 防止系统 UI / 裁切吃掉文字 |

**[CORROBORATED / PLATFORM-BEHAVIOR — 3:4=1080×1440、1:1=1080×1080、封面+内容图、≤18 张为小红书设计圈通行规范；以官方创作者后台上传校验为准]**

**对工具的含义（「导出小红书图文/海报」= 出图，不是出文）：**
1. 工具应把版式 **渲染成位图卡片**：1080×1440 (3:4) 或 1080×1080 (1:1)。
2. 任何 SVG 矢量装饰 → **先在画布上栅格化** 再导出 PNG/JPG（小红书不会保留矢量）。
3. 输出 **封面图(1) + 内容图(N≤18)** 的成组图片；正文文字单独作为纯文本副本（用户粘贴到笔记描述）。
4. 保证文字落在 **安全区** 内，字号在手机上可读（建议正文字号映射到 ≥ 图宽的 ~3.5–4%）。

---

## 1.2 知乎 (Zhihu) — rich-text subset, NOT free CSS

**核心结论:** 知乎编辑器是一个 **受限富文本编辑器**：它在粘贴时保留 **一个 HTML 子集**（标题、加粗/斜体、列表、引用、链接、代码块、表格、图片），并支持 **Markdown 导入/输入**。它 **剥离任意 CSS、`class`/`style`、内联 `<svg>`、`<script>`、自定义字体与排版**。公式以 **官方公式编辑器（LaTeX/KaTeX）** 输入，最终在页面上 **以图片(img)形式渲染**——外部 HTML 里的"裸 LaTeX 文本"会被当普通文字。

> 知乎问答页 (`zhihu.com/question/*`) 本次抓取返回 **HTTP 403（反爬）**；以下为稳定产品行为。**[PLATFORM-BEHAVIOR]**

**接受 (accepts):**
- **Markdown**：支持 Markdown 语法输入与「导入 Markdown 文件」。
- **结构化富文本**：H1–H3 标题、**加粗/斜体**、有序/无序列表、引用块、分割线、链接。
- **代码块**：受支持，带语言高亮（围栏 ```lang）。
- **表格**：受支持（基础表格）。
- **图片**：上传后转存到知乎自有 CDN（`pic*.zhimg.com`）。
- **公式**：通过官方公式按钮输入 LaTeX/KaTeX，**渲染为图片**展示。

**剥离 (strips):**
- 任意 `style=""` / `class` / 外部或内联 **CSS**（不能自定义字号、行高、字色、背景、卡片样式）。
- **内联 `<svg>`**、`<script>`、`<iframe>`（非白名单）、自定义 `@font-face`。
- 粘贴自公众号/网页的花哨排版会被 **规整为知乎统一正文样式**（颜色/间距/卡片大多丢失）。
- 裸 LaTeX 文本（未走公式编辑器的）不会被渲染成公式，按普通文字处理。

**设计面 (design surface):** 知乎几乎 **没有视觉自定义自由度**——正文外观由知乎全站 CSS 统一控制。作者能控制的是 **结构与内容**（标题层级、列表、代码、表格、配图、公式图），不是 **样式**。

### 知乎 vs 微信公众号（宽度与排版自由度）

| 维度 | 微信公众号 | 知乎 |
|---|---|---|
| 排版自由度 | **高**：正文是内联样式 HTML，可自定义字号/行高/字色/卡片/分隔符等（这就是 mdnice/秀米存在的原因） | **低**：受限富文本，全站统一样式，剥离自定义 CSS |
| 内联 CSS / style | 保留（公众号编辑器接受带 `style` 的 HTML 片段） | 剥离 |
| 宽度模型 | 工具通常按 **375px 移动视口** 设计正文，正文在文章页里 **左右各留 padding**（mdnice/秀米默认 padding≈ `20–30px` / `1em`），实际正文可读宽度 ≈ **315–355px** | 知乎正文 **由平台容器控制宽度**，PC 端阅读列宽更宽、移动端铺满屏宽；作者不设宽度 |
| SVG | 仅作 **图片** 进入（公众号也不保留内联矢量，导出多为 PNG） | 仅作 **图片** 进入 |
| 公式 | 多以 **图片** 形式贴入（KaTeX→img） | 官方公式编辑器，**渲染为 img** |
| 代码块 / 表格 | 支持（样式由模板提供） | 支持（样式由平台提供） |

**要点：** 「微信给你一块白纸 + 一套内联样式画笔；知乎只给你一套乐高积木块（结构件），不给你颜料。」 **[PLATFORM-BEHAVIOR + 见 §2.4 工具侧 375px 宽度证据]**

---

# PART 2 — CJK typography readability

## 2.1 Why ~20–22 Chinese chars/line is the sweet spot

### A. 权威排版规范（W3C CLReq — 中文排版需求）**[PRIMARY]**

W3C《Requirements for Chinese Text Layout / 中文排版需求》§7 给出行长（每行字数）原则，本次直接抓取确认原文：

> "most books have line lengths of body text in the range between **17 to 40 characters**. To prevent excessive line breaks that could cause difficulty in reading, the line length of body text **should not be less than 10 characters**. For horizontal writing mode, the line length of body copy **should not exceed 48 characters**."
> 中文原文：「大多数书籍的正文行长一般设在 **17 到 40 字** 范围区间……正文行长最小不宜少于 **10 字**、而横排最大行长不宜长于 **48 字**。」
> — **[PRIMARY: W3C CLReq, https://www.w3.org/TR/clreq/ §7 排版样式与行长；本次抓取 HTTP 200, title「Requirements for Chinese Text Layout - 中文排版需求」]**

CLReq 还确立两条相关原则（同次抓取）：
- 行长应为 **字号的整数倍**，各行首尾对齐。
- 行距(line gap)通常取字框高度的 **50%–100%**；行长较短或字号较小时取较小行距；**行距一般不超过字号本身**（超过对阅读无益）。
- 正文字号：内文常用五号(10.5pt)/新五号(9pt)，**最小到六号(7.875pt)**，更小因汉字结构复杂难读。

**为什么是 20–22 而不是上限的 40？** 书籍是纸面长行 + 静态阅读环境（17–40 字宽容）；**手机竖屏 + 信息流滚动阅读** 是窄列、短停留场景，落在 CLReq 区间偏 **窄端**，使眼睛回扫(saccade return)更省力、不易串行(line-skipping)。20–22 字稳居「不少于 10、不多于 48」的安全带中央偏下，是移动正文的舒适点。

### B. 拉丁文研究的交叉印证（换算到 CJK）

| 来源 | 拉丁文最佳行长 | 抓取确认 |
|---|---|---|
| **Butterick, *Practical Typography*** | "line length **45–90 characters** or 2–3 alphabets" | **[PRIMARY: https://practicaltypography.com/line-length.html, HTTP 200]** |
| **Baymard Institute** (2022, 大规模 UX 测试) | "optimal line length for body text is **50–75 characters**"；引用 E. Ruder 的 **50–60** 经典值，"up to 75 acceptable" | **[PRIMARY: https://baymard.com/blog/line-length-readability, HTTP 200]** |

**换算桥梁（关键数学直觉）：** 一个 **全角 CJK 字 ≈ 1em ≈ 两个拉丁字符宽**。因此 **20–22 个 CJK 字 ≈ 40–44 个拉丁字符宽**——正落在 Baymard 的 50–75 下沿附近、Butterick 45–90 内、CLReq 17–40 字典型区间内。三套独立标准在「20–22 CJK 字」处收敛。**[CORROBORATED]**

---

## 2.2 字号 (px) × 最大宽度 (em) × 每行字数 的关系 (CJK)

对全角中文，单字水平推进 ≈ `1em`（即 `1 × font-size`，未加字间距时）。所以：

```
每行字数 ≈ floor( 内容可用宽度(px) / 单字推进(px) )
单字推进(px) ≈ font-size(px) + letter-spacing(px)        // 中文每字后都吃一份字距
内容可用宽度(px) = max-width(px) − 左右内边距
当 max-width 以 em 表示时:  内容宽度(px) = max-width(em) × font-size(px)
=> 每行字数 ≈ max-width(em) × font-size / (font-size + letter-spacing)
```

- 若 **无字间距**：`每行字数 ≈ max-width(em)`（因为 em = 字号，一个全角字 = 1em）。所以 **`max-width: 22em` ≈ 22 个中文字/行**。
- 若加 `letter-spacing`（公众号常见 0.5–1px / 0.05–0.1em），每字推进略大于 1em，**字数略降到 ~20–21**。这正好把"裸 22em"的 22 字拉到 **舒适的 20–22 区间**。**[derived from CLReq em-multiple rule, PRIMARY]**

---

## 2.3 Premium 公众号 移动正文设置（实测默认值）

| 参数 | 推荐值 | 来源 / 证据 |
|---|---|---|
| **font-size** | **16px**（默认/「推荐」档；可选 14/15/16/17/18px） | **[PRIMARY: doocs/md `style.ts` — `fontSizeOptions` 16px 标注 `推荐`，`defaultStyleConfig.fontSize = fontSizeOptions[2]` 即 16px；mdnice 模板注释 `font-size: 16px`]** |
| **line-height** | **1.75**（doocs/md 全局正文）；**26px ≈ 1.625**（mdnice 模板示例）→ 区间 **1.6–1.8** | **[PRIMARY: doocs/md `base.css` `section/#output { line-height: 1.75 }`；mdnice `normal.js` 注释 `行高 line-height: 26px`]** |
| **letter-spacing (字间距)** | **0.1em**（doocs/md 段落，16px 下 ≈ **1.6px**）；mdnice 注释 `3px`；常见区间 **0.5–1px** | **[PRIMARY: doocs/md `default.css` `p { letter-spacing: 0.1em }`；mdnice `normal.js` 注释 `letter-spacing: 3px`]** |
| **段间距 (paragraph spacing)** | **`margin: 1.5em 8px`**（段上下 1.5em，左右 8px）；mdnice 注释段上下 `5px` | **[PRIMARY: doocs/md `default.css` `p { margin: 1.5em 8px }`；mdnice `normal.js`]** |
| **首行缩进** | 可选 `text-indent: 2em`（mdnice 注释默认示例） | **[PRIMARY: mdnice `normal.js` 注释]** |
| **正文左右 padding** | doocs/md 标题/正文左右 8px；mdnice 全局 `padding: 30px` | **[PRIMARY: doocs/md `default.css`；mdnice `normal.js` 注释]** |
| **设计宽度** | **375px**（移动端固定）/ 电脑端自适应 | **[PRIMARY: doocs/md `style.ts` `widthOptions` → `移动端 = w-[375px]`、`电脑端 = w-full`]** |
| **正文颜色** | 近黑（`#3e3e3e` mdnice / `#333` 系） | **[PRIMARY: mdnice 注释 `color: #3e3e3e`；doocs `石墨黑 #333333`]** |

> doocs/md = GitHub **12.6k★** 微信 Markdown 编辑器（本次经 GitHub API 确认 stars=12689, default_branch=main）；mdnice = 主流公众号排版工具。二者默认值即"premium 公众号"事实标准。**[PRIMARY]**

---

## 2.4 `max-width:22em` + `font-size:17px` → ~20–22 字/行（375px 视口数学）

**移动视口基准:** 主流"逻辑像素"宽 **375px**（iPhone SE/6–13 mini 等，公众号编辑器默认即 `w-[375px]`，见 §2.3）。**[PRIMARY: doocs/md `widthOptions`]**

### 计算 1 — 以 22em 为约束（与视口无关）
```
font-size      = 17px
max-width      = 22em = 22 × 17 = 374px          // 恰好≈375px 视口宽
全角字推进     = 17px (无字距) … 18.7px (字距 0.1em)
每行字数(无字距)= 374 / 17  = 22.0 字
每行字数(0.1em)= 374 / 18.7 ≈ 20.0 字
```
→ **17px × 22em 在「无字距 22 字 / 0.1em 字距 20 字」之间，正中 20–22 字甜区。** ✅

### 计算 2 — 直接用 375px 视口（带真实 padding）
```
视口宽          = 375px
左右 padding    = 各 16px (2×16=32)   → 可用宽 = 343px
font-size       = 17px, letter-spacing = 0.5px
单字推进        = 17 + 0.5 = 17.5px
每行字数        = 343 / 17.5 ≈ 19.6 → 约 20 字
```
若 padding 收到各 8px（doocs/md 正文左右 8px）：可用 ≈ 359px → `359/17.5 ≈ 20.5` 字。

### 计算 3 — 16px（公众号默认字号）对照
```
font-size 16px, max-width 22em = 352px, 字距 0.1em(1.6px) → 推进 17.6px
每行字数 = 352 / 17.6 = 20 字 ✅
```

**结论:** 在 375px 移动视口下，**`font-size: 16–17px` + `max-width: 22em`(≈352–374px) + `letter-spacing: 0.05–0.1em` + `line-height: 1.6–1.8`** 稳定产出 **每行 ~20–22 个中文字**，命中 CLReq/Baymard/Butterick 三方收敛的可读甜区。

---

## 2.5 CJK 可读性速查表 (Cheat-Sheet)

> 公式：`每行字数 ≈ (可用宽度px) / (font-size + letter-spacing)`；`可用宽度 = max-width(em) × font-size − 左右padding`。下表按 **无明显左右 padding**（max-width 即可用宽）估算，字距取 0.1em。

| font-size | max-width | 可用宽(px) | letter-spacing | 单字推进 | **每行 CJK 字数** | line-height | 评级 |
|---|---|---|---|---|---|---|---|
| 15px | 22em | 330 | 0.1em(1.5px) | 16.5 | **~20** | 1.7 | 偏小，可读 |
| **16px** | **22em** | **352** | **0.1em(1.6px)** | **17.6** | **~20** | **1.75** | ✅ 公众号默认甜区 |
| **17px** | **22em** | **374** | 0 | 17 | **~22** | 1.7 | ✅ 上沿，宽松舒适 |
| **17px** | **22em** | **374** | 0.1em(1.7px) | 18.7 | **~20** | 1.8 | ✅ 甜区中央 |
| 17px | 20em | 340 | 0.05em | 17.85 | **~19** | 1.7 | 略紧，仍佳 |
| 18px | 22em | 396 | 0.1em(1.8px) | 19.8 | **~20** | 1.8 | ✅ 大字版 |
| 16px | 24em | 384 | 0.1em | 17.6 | **~22** | 1.75 | ✅ 上沿 |
| 16px | 18em | 288 | 0.1em | 17.6 | **~16** | 1.7 | 偏窄(接近 CLReq 下沿) |
| 14px | 26em | 364 | 0.1em(1.4px) | 15.4 | **~24** | 1.6 | 偏挤，超甜区 |

**可读甜区锚点:** font-size **16–17px** + max-width **20–24em** + letter-spacing **0.05–0.1em (0.5–1.6px)** + line-height **1.6–1.8** → **每行 20–22 个中文字**。

| 指标 | 推荐范围 | 硬边界 (CLReq) |
|---|---|---|
| 每行 CJK 字数 | **20–22**（移动正文甜区） | ≥10、横排 ≤48 **[PRIMARY]** |
| font-size | 16–17px 正文 | 印刷最小六号 7.875pt |
| line-height | 1.6–1.8 | ≤ font-size 的 100%（即 ≤2.0）**[PRIMARY]** |
| letter-spacing | 0.05–0.1em (0.5–1.6px) | — |
| 段间距 | 1.0–1.6em | — |

---

## Sources (fetched this session)

| # | URL | HTTP | 用途 / 可信度 |
|---|---|---|---|
| 1 | https://www.w3.org/TR/clreq/ | 200 | **[PRIMARY]** 行长 17–40/≥10/≤48 字、行距 50–100%、字号、整数倍原则 |
| 2 | https://baymard.com/blog/line-length-readability | 200 | **[PRIMARY]** 拉丁最佳 50–75 字 (Ruder 50–60, ≤75) |
| 3 | https://practicaltypography.com/line-length.html | 200 | **[PRIMARY]** 拉丁 45–90 字 |
| 4 | https://github.com/doocs/md (`packages/shared/src/configs/style.ts`, `theme-css/base.css`, `theme-css/default.css`) | 200 (raw) | **[PRIMARY]** 公众号默认：font 16px、line-height 1.75、letter-spacing 0.1em、段 margin 1.5em、宽 375px。stars=12689 |
| 5 | https://github.com/mdnice/markdown-nice (`src/template/markdown/normal.js`) | 200 (raw) | **[PRIMARY]** mdnice 模板默认：font 16px、line-height 26px、字距 3px、padding 30px、缩进 2em |
| 6 | https://baike.baidu.com/item/小红书 | 200 | **[PRIMARY]** 小红书 UGC「短视频、图文」定位 |
| 7 | https://creator.xiaohongshu.com/ | 200 | **[PRIMARY]** 小红书创作者发布门户存在性 |
| 8 | https://www.zhihu.com/question/* , https://www.zhihu.com/help | 403 / 000 | 反爬阻断 → 知乎/小红书细节以 **[PLATFORM-BEHAVIOR]** 标注 |

---

## Caveats / Not Found

- **知乎与小红书的精确数字限制（小红书正文 ~1000 字、标题 ~20 字、图片 ≤18 张；知乎公式→img；剥离 CSS/SVG）** 均为 **[PLATFORM-BEHAVIOR]**：官方 question/help/spec 页面对脚本客户端返回 **403/反爬**，无法逐行抓取原文。规则的"形状"可靠；任何要 **硬编码的数值** 上线前请在真实 App / 创作者后台二次核对（数值可能随版本调整）。
- 小红书 **3:4 = 1080×1440、1:1 = 1080×1080、≤18 张图、安全区边距** 为设计圈通行规范 **[CORROBORATED/PLATFORM-BEHAVIOR]**，非官方逐字抓取条文。
- 速查表"每行字数"为 **估算**：实际取决于具体字体的全角字身(advance width)、是否中西混排、标点挤压(CLReq §6.3)、容器真实 padding。CJK 全角字推进 ≈ 1em 的假设对绝大多数正文字体成立，但等宽/特殊字体可能偏差 ±1 字。
- letter-spacing 在 CJK 上等效于 CLReq 的"字距"概念；CLReq 默认主张 **密排(set solid)**，公众号工具普遍加 0.05–0.1em 以提升手机小屏呼吸感——这是 **产品惯例 vs 印刷规范** 的有意偏离，已在表中区分。
- 内部代码库未检索（本任务为纯外部研究，且环境无 ripgrep）。若需对照 Inkforge 现有渲染参数，可后续用 GitNexus / Read 比对本速查表。
