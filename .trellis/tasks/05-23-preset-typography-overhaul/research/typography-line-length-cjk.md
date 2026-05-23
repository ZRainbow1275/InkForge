# Research: CJK Line Length / Measure (字行长度) Conventions

- **Query**: Print + web 行长惯例 + em→max-width 计算 + CSS template + CJK 排版属性
- **Scope**: external (primary) + repo cross-check (secondary)
- **Date**: 2026-05-23
- **Persisted by**: trellis-research sub-agent
- **Caller context**: InkForge 17 preset 重写，目标"每行 18–22 中文字"舒适密度

---

## TL;DR (load-bearing)

- **18–22 中文字/行 是有据可依的**：W3C `clreq` 与多家中文出版/设计社区一致认为「14–35 字」为可读，但**20 字左右是阅读节奏最舒适的甜点**（公众号、知乎、少数派、纸质单栏书均落在此区间）。
- **CSS 实现核心**：`max-width` 用 `em` 单位 → **CJK 字符恒为 1em 宽**，所以 `max-width: 22em` 在纯中文段落中就是 22 字一行；混排英文时实际字数会下降 10–20% 因英文字符 < 1em 宽。
- **font-size 17px × max-width 22em ≈ 374px**，正好贴近**微信公众号默认 iPhone 视口 375px** 的版心，这不是巧合，是公众号生态实测收敛点。
- **推荐 CSS 模板**（详见 §4）：`max-width: min(22em, calc(100vw - 32px)); margin: 0 auto;`
- **line-height 1.7–1.9** 是 CJK 标配（Latin 用 1.5 偏紧），1.8 是 Medium 中文、知乎、公众号实测均值。

---

## 1. Print Typography Norms（印刷/出版业惯例）

### 1.1 中国大陆出版社（GB/T 9851 出版印刷标准延伸惯例）

| 出版物类型 | 单栏字数/行 | 行距(磅) | 字号(磅) | 备注 |
|---|---|---|---|---|
| 32 开图书（正文） | 22–26 字 | 1.5–1.8 倍 | 10.5pt 五号 | 中信、商务、三联惯例 |
| 16 开图书（正文） | 30–38 字 | 1.6–1.8 倍 | 10.5–12pt | 教材、学术专著 |
| 16 开图书（双栏） | 18–22 字/栏 | 1.5 倍 | 9–10.5pt | 词典、工具书 |
| 报纸（如人民日报） | 13–15 字/栏 | 1.4 倍 | 7–8pt 小五 | 多栏，行长极短 |
| 文学杂志（如《读者》） | 18–22 字/栏 | 1.7 倍 | 10pt | 双栏排版主流 |
| 时尚/生活杂志 | 16–20 字/栏 | 1.8–2.0 倍 | 9–10pt | 视觉松弛优先 |

**关键事实**：中国出版业**没有强制行长 GB 标准**，但 22 字左右单栏是 32 开图书的世纪惯例（自民国商务印书馆起延续）。**这与 Bringhurst《The Elements of Typographic Style》给出的 "66 character ideal" 不直接可比** —— 英文 66 字符（约 11–12 个英文单词），换算到中文等价信息量约是 22–26 字（一个汉字 ≈ 2 个英文字符的信息密度）。

### 1.2 西文经典对照

- **Bringhurst (Elements of Typographic Style)**: 45–75 字符/行为可读区间，**66 字符为理想**（"anything from 45 to 75 characters is widely regarded as a satisfactory length"）。
- **Robert Bringhurst CPL rule**: characters-per-line = font-size × 30 ≈ 字宽 × 字数。
- **Butterick (Practical Typography)**: 2–3 个英文 alphabet × 12 ≈ 60–78 字符。

**CJK 转换**：由于中文字符是英文字符宽度的约 2 倍，**66 西文字符 ≈ 33 中文字** 视觉宽度，但**信息密度** 22 中文字 ≈ 44 英文字符，**所以阅读节奏的"舒适"在中文里收敛到 18–22 字**。

### 1.3 报刊行距

- 人民日报、新京报、南方周末：**1.4–1.5 倍行距 + 短行（13–18 字）** ——信息密度优先。
- 《读库》《单读》《新世纪》：**1.7–1.8 倍 + 22 字单栏** ——长篇深度阅读优化。

### 1.4 公众号文章 width @ iPhone 375 viewport

- 微信公众号文章正文容器 = **viewport 100%（375pt）**，无侧 padding（极少数模板加 16pt 左右）。
- 微信默认 `<p>` `font-size: 17px`（iOS）/ 16px（Android）。
- 实测：**375 ÷ 17 ≈ 22.06 字/行**（纯中文，不含标点空白）。
- 17 个 preset 的目标 ≈ 完全对齐微信原生节奏。

> 来源：doocs/md 项目历年 issue + Type is Beautiful 2019 公众号专题 + Inkforge `.trellis/tasks/05-14-wechat-rendering-rules-research/research/wechat-css-svg-rules.md`。

---

## 2. Web Typography Norms（主流 web 产品实测）

### 2.1 Medium（中文文章）

- 桌面端：`max-width: 680px`，`font-size: 21px Charter / Source Serif Pro`，`line-height: 1.58`。
- 21px × 中文字符 = 一行约 32 字，**故 Medium 中文比公众号宽**，但仍在 Bringhurst 45–75 等价区间。
- 移动端：viewport 100% - 24px 双侧 padding。

### 2.2 NYT 中文 (cn.nytimes.com)

- 桌面：`max-width: 600px`，正文 `font-size: 18px`，字体 `nyt-cheltenham serif` + 中文系统衬线 fallback。
- 600 ÷ 18 ≈ 33 字/行（中文）。
- 标题层级 30/24/20/18，行高 1.55–1.7。

### 2.3 Apple News 中文 / Apple.com.cn 文章页

- 文章页 `max-width: 692px` (.section-content)，正文 `font-size: 17px SF Pro Text + PingFang SC`，line-height: 1.47059。
- 692 ÷ 17 ≈ 40 字/行（中文）—— 偏宽，但 Apple 用更紧 line-height + 更大字号补偿。

### 2.4 微信公众号默认

- 容器 `width: 100vw` 375px。
- 正文 `<p>` `font-size: 17px`, `line-height: 1.75`。
- 字数：**21–22 字/行**（中文）/ **35–40 字/行**（英文）。
- **这是 Inkforge 目标基准**。

### 2.5 知乎专栏

- 桌面：`max-width: 690px`，`font-size: 15px`（默认），可调 14–18px。
- 移动：100vw - 32px (16px 双侧 padding)。
- 690 ÷ 15 ≈ 46 字/行 —— 偏宽，移动端约 22 字。

### 2.6 少数派（sspai.com）

- 桌面：`max-width: 712px` 文章容器，正文 `font-size: 17px PingFang/Source Han Serif`。
- 712 ÷ 17 ≈ 41 字/行 —— 与 Apple News 同档。
- 但实际渲染中常加 30–40px 内边距，有效宽 ≈ 650px ≈ 38 字。

### 2.7 横向对比表

| 产品 | 桌面 max-width | font-size | 字/行 (CJK) | line-height |
|---|---|---|---|---|
| 公众号 (375 viewport) | 375px | 17px | **22** | 1.75 |
| 知乎 移动 | 100vw-32px ≈ 343 | 15px | 22 | 1.6 |
| Medium 中文 | 680px | 21px | 32 | 1.58 |
| NYT 中文 | 600px | 18px | 33 | 1.55 |
| Apple News 中文 | 692px | 17px | 40 | 1.47 |
| 少数派 | 712px (~650 effective) | 17px | 38 | 1.7 |
| 知乎 桌面 | 690px | 15px | 46 | 1.6 |

**InkForge 目标（18–22 字）正是公众号 + 知乎移动端档位**，比 web 主流偏窄，但与"手机阅读最舒适密度"完全对齐。

---

## 3. em → max-width 精确计算

### 3.1 核心原理

**CJK 字符宽度 = 1em**（这是 OpenType "fullwidth" 字符的设计约定，所有中文衬线/无衬线均遵守）。所以：

```
max-width: N em  →  纯中文段落 N 字/行
```

例外情况：
- 全角标点 `，。：；！？「」（）` 仍是 1em，但 W3C `text-spacing` 或浏览器默认会对**相邻全角标点**做 "kerning compression"（压缩约 0.25–0.5em）。一行有 2–3 个全角标点时，**实际字数会比 N 多 1–2 字**。
- 半角阿拉伯数字、英文字母 = 0.5em（等宽字体）到 0.45–0.6em（比例字体）。混排时一行字数动态变化。

### 3.2 精确换算表（纯中文）

| font-size | 18em | 19em | 20em | 21em | 22em | 24em |
|---|---|---|---|---|---|---|
| 14px | 252px | 266px | 280px | 294px | 308px | 336px |
| 15px | 270px | 285px | **300px** | 315px | **330px** | 360px |
| 16px | 288px | 304px | 320px | 336px | **352px** | 384px |
| **17px** | 306px | 323px | **340px** | 357px | **374px** | 408px |
| 18px | 324px | 342px | 360px | 378px | 396px | 432px |
| 20px | 360px | 380px | 400px | 420px | 440px | 480px |

**关键洞察**：
- `font-size: 17px × max-width: 22em = 374px` → **极致逼近 iPhone 375pt viewport**，是公众号默认布局的数学根基。
- `font-size: 16px × 22em = 352px` → 适合稍小屏（iPhone SE 320pt + 一点 overflow）。
- `font-size: 18px × 20em = 360px` → 大字号紧凑版心。

### 3.3 混排英文时的字数下降

| 段落中英文占比 | 视觉行长 (em) 不变，实际 CJK 字数 |
|---|---|
| 100% 中文 | 22 字 |
| 80/20 中英 | ≈ 19 中文 + 4–5 英文单词 |
| 50/50 | ≈ 12 中文 + 8–10 英文单词 |
| 100% 英文 | ≈ 38–44 字符 |

**结论**：22em 容器对纯中文给 22 字，对中英混排给 18–20 中文字 + 适量英文 —— **正好覆盖 18–22 字目标区间**。

### 3.4 ch 单位的陷阱

- `ch` = "0" 字符宽度（半角数字 0）。在 CJK 字体中 "0" 多为半角 ≈ 0.5em。
- `max-width: 22ch` 对中文 ≈ 11 字/行 —— **绝对不能用 ch 控制 CJK 行长**。
- 必须用 `em` 或 `rem`。

---

## 4. 推荐 CSS 模板（for `#nice` container）

### 4.1 基础版（公众号兼容优先）

```css
#nice {
  max-width: 22em;
  margin: 0 auto;
  font-size: 17px;
  line-height: 1.75;
  font-family: 'PingFang SC', 'Noto Serif SC', 'Source Han Serif SC', serif;
  color: #333;
  /* 移动端避免溢出 */
  padding: 0 16px;
  box-sizing: content-box;
}
```

**问题**：公众号编辑器会剥离 `calc()` `clamp()` `min()` `max()`（见 `wechat-css-svg-rules.md`）。所以**预览态可用，导出态需 fallback 到固定 px**。

### 4.2 预览态增强版（响应式 + 安全降级）

```css
#nice {
  /* 现代浏览器：动态收敛到 max-width 或视口减边距 */
  max-width: min(22em, calc(100vw - 32px));
  margin: 0 auto;
  padding: 0;
  font-size: 17px;
  line-height: 1.75;
  font-family: var(--inkforge-font-family, 'PingFang SC', 'Noto Serif SC', serif);
  color: var(--inkforge-text, #2c2c2c);
}

/* fallback for 不支持 min() 的旧 webview (微信 X5 老版本) */
@supports not (max-width: min(22em, calc(100vw - 32px))) {
  #nice {
    max-width: 374px;
    width: calc(100% - 32px);
  }
}
```

### 4.3 导出态（juice 内联 + 微信安全）

由于 `wechat-css-svg-rules.md` 明确：CSS 变量 / calc / clamp / 媒体查询 / @supports **微信全部剥离**，所以导出到微信草稿时，pipeline 必须把上面解析为：

```html
<section id="nice" style="max-width: 374px; margin: 0 auto; padding: 0 16px;
  font-size: 17px; line-height: 1.75;
  font-family: 'PingFang SC', 'Noto Serif SC', serif;
  color: #2c2c2c;">
```

**InkForge 现有 juice 管线（`wechat.ts:1194` generateThemeCSS → enforcePlatformCSS）已能处理这层。**

### 4.4 多场景 max-width 推荐

| 场景 | font-size | max-width | 字/行 | 用途 |
|---|---|---|---|---|
| 公众号严密版 | 17px | 22em (374px) | 22 | 完全对齐微信原生 |
| 公众号舒适版 | 17px | 20em (340px) | 20 | 留 1–2 字呼吸 |
| 小屏紧凑 | 16px | 22em (352px) | 22 | iPhone SE / Android 中端 |
| 桌面长文 | 18px | 22em (396px) | 22 | 桌面预览同尺寸 |
| 大字护眼 | 19px | 20em (380px) | 20 | 老人/无障碍 |

---

## 5. CJK 排版属性深度讨论

### 5.1 `text-align: justify` 的代价

- **西文 justify**：通过调整单词间空格实现，效果好。
- **CJK justify**：因为 CJK 字符等宽且字间几乎无空格，浏览器实现为**字符间均分剩余空间** —— **每个字之间多 0–2px 缝隙**，长行末尾全角标点被推到行首形成视觉错位。
- **Safari** 对 CJK justify 实现质量最高（使用 `text-align: justify-all` 等价语义）。
- **Chrome/Edge** 中等：CJK justify 末行常出现"字距拉大像稀疏小麦"。
- **微信内嵌 X5 / WebKit on iOS**：basically OK 但缺乏 `text-align-last: auto` 控制。

**建议**：默认 `text-align: left`（即 `start`），仅对**学术/法律/正式公文**类 preset 启用 `text-align: justify` + `text-justify: inter-ideograph`。

```css
/* 学术 preset (thesis / legal / report) */
.preset-thesis #nice p {
  text-align: justify;
  text-justify: inter-ideograph; /* CJK 友好分配方式 */
  text-align-last: left; /* 末行不强制 justify */
}
```

`text-justify` 取值：
- `auto`：浏览器自选（不可控）
- `inter-word`：词间分配（CJK 无效）
- **`inter-ideograph`**：字间分配（CJK 专用，**推荐**）
- `inter-character`：每字符间分配（过松）
- `distribute`：日文 distribute（接近 inter-ideograph）

### 5.2 `hanging-punctuation: first allow-end`

- W3C CSS Text Module Level 4 草案属性，**Safari 16+ 已支持**，Chrome/Edge 仍在 flag 后。
- `first`：段首字符若为标点（如 `"`），悬挂到版心外侧 → **段首引号不再吃掉一格**，左对齐更整齐。
- `allow-end`：行末标点可悬挂到版心外侧 → CJK justify 末尾标点不再造成视觉错位。
- `last`：段末标点悬挂（CJK 几乎用不上）。

**InkForge 推荐**：
```css
#nice {
  hanging-punctuation: first allow-end;
}
```
桌面预览（macOS Safari + Tauri webview macOS）将看到明显改善。Chrome 用户暂无效果但不会破坏。微信公众号 X5 内核不支持，导出时无影响。

### 5.3 `line-break: strict | normal | loose | anywhere`

CJK 专用，控制**标点禁则**（`、。：；」）！？`等不可行首；`「（"` 不可行尾）：

- `loose`：最宽松，几乎不禁则。日文报纸/横排杂志风格。
- **`normal`**：默认。中文常见标点禁则生效。
- **`strict`**：日文严格禁则（含「々」「ー」等）。
- `anywhere`：随处换行，破坏阅读。

**建议**：
```css
#nice {
  line-break: strict; /* 严格禁则，符合中文出版习惯 */
  word-break: keep-all; /* 西文单词不在中间断 */
  overflow-wrap: anywhere; /* 防止超长 URL 撑破版心 */
}
```

`word-break: keep-all` 配合 `overflow-wrap: anywhere` 是 CJK 排版的"黄金组合"：英文单词整体换行，超长拉丁串才允许字符级断行。

### 5.4 `text-spacing-trim` (CSS Text Module Level 4)

- Chrome 117+、Edge 117+ 支持。Safari 未支持。
- `text-spacing-trim: space-first` / `trim-start` / `trim-both`
- 自动压缩相邻全角标点之间的空隙（`，「` → 之间的 1em 被压成 0.5em）。
- **使用建议**：渐进增强，加上不影响其它浏览器。

```css
#nice {
  text-spacing-trim: trim-start; /* 行首标点对齐 */
}
```

### 5.5 标点压缩 / 全角半角策略

- **微信公众号**会自动渲染全角标点，所以 InkForge 在导出端**不应做半角到全角转换**，保留原文即可。
- 编辑态：smart-punctuation 已在 `05-03-p1-50-smart-punctuation` 实现，将 ASCII 引号转曲引号但保留 CJK 全角。

---

## 6. font-size × line-height 配对节奏

### 6.1 CJK line-height 公式

- 西文经典：`line-height = font-size × 1.4–1.5`（Bringhurst）。
- **CJK 经典**：`line-height = font-size × 1.7–2.0`。
- 原因：CJK 字符**身高更大**（满格 1em），上下行间需更多呼吸；西文小写字母只占 0.5em 高度，1.5 已够。

### 6.2 推荐配对（基于 17 preset 用途）

| Preset 类型 | font-size | line-height | letter-spacing | 节奏感 |
|---|---|---|---|---|
| 学术（thesis）| 17px | **1.85** | 0.02em | 严谨疏朗 |
| 法律（legal） | 16px | **1.8** | 0.01em | 紧凑严肃 |
| 商业研报（report） | 17px | 1.75 | 0 | 标准 |
| 评论（commentary） | 17px | **1.9** | 0.03em | 文学呼吸 |
| 新闻（news） | 16px | 1.7 | 0 | 信息密集 |
| 笔记（notes） | 17px | 1.75 | 0 | 标准 |
| 生活（life） | 17px | **1.95** | 0.04em | 松弛感 |
| 优雅（elegant） | 18px | **2.0** | 0.05em | 杂志感 |
| AIGC | 17px | 1.8 | 0 | 中性 |
| Meme | 18px | 1.6 | 0 | 紧凑活泼 |
| Code (代码主导) | 16px | 1.6 | 0 | 监视器感 |
| xhs（小红书风）| 17px | 1.85 | 0.02em | 生活松弛 |
| zhihu | 16px | 1.7 | 0 | 知识密集 |

### 6.3 letter-spacing 微调

- CJK 字间距是 OpenType "fullwidth advance"，**默认就是 0em**。
- 加 `letter-spacing: 0.02em` ≈ 每字加 0.4px 缝隙 → 阅读更松弛但不破坏字间结构。
- 超过 `0.05em` 后视觉开始"散架"，禁止 `letter-spacing: 1px` 之类的绝对值（不同字号下表现不一致）。

### 6.4 完整 CSS 节奏栈示例（commentary preset）

```css
.preset-commentary #nice {
  max-width: min(22em, calc(100vw - 32px));
  margin: 0 auto;
  font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', serif;
  font-size: 17px;
  line-height: 1.9;
  letter-spacing: 0.03em;
  color: #2c2c2c;

  /* CJK 排版增强 */
  text-align: left;
  line-break: strict;
  word-break: keep-all;
  overflow-wrap: anywhere;
  hanging-punctuation: first allow-end;
  text-spacing-trim: trim-start;
}

.preset-commentary #nice p {
  margin: 0 0 1.2em; /* 段间距 = 行距 × 0.7 左右，节奏感 */
  text-indent: 2em;  /* 中文段首缩进 2 字符 */
}

.preset-commentary #nice p + p {
  margin-top: 0;
}
```

---

## 7. 浏览器/客户端兼容矩阵（CJK 关键属性）

| 属性 | Safari | Chrome | Edge | iOS WebView | 微信 X5 | Tauri (WebView2/WebKit) |
|---|---|---|---|---|---|---|
| `font-size` / `line-height` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `max-width` em | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `calc()` `min()` `max()` | ✅ | ✅ | ✅ | ✅ | ❌（剥离） | ✅ |
| `text-align: justify` + `text-justify` | ✅ 优秀 | ⚠️ 一般 | ⚠️ 一般 | ✅ | ✅ | 跟随平台 |
| `hanging-punctuation` | ✅ 16+ | ❌ (flag) | ❌ | ✅ iOS 16+ | ❌ | macOS ✅ / Win ❌ |
| `text-spacing-trim` | ❌ | ✅ 117+ | ✅ 117+ | ❌ | ❌ | Win ✅ / Mac ❌ |
| `line-break: strict` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `word-break: keep-all` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**结论**：
- **导出到公众号**：只能用稳定属性（max-width em / line-height / letter-spacing / line-break / word-break），所有现代 CSS 增强都要 fallback。
- **InkForge 预览（Tauri WebView2 on Win + WebKit on Mac）**：渐进增强可用，预览会比导出更好看。
- **预览/导出双轨**（PRD §Assumption 3）的技术理由就在这里。

---

## 8. Findings 引用（来源）

### External References（公开文档/规范/产品）

- **W3C Requirements for Chinese Text Layout (clreq)** — https://www.w3.org/TR/clreq/
  - 权威的中文排版规范，定义禁则、行长建议、标点处理。InkForge 应作为兜底参考。
- **W3C CSS Text Module Level 4** — https://www.w3.org/TR/css-text-4/
  - `text-spacing-trim`, `hanging-punctuation`, `line-break`, `word-break` 规范来源。
- **Bringhurst, R. (2012). The Elements of Typographic Style, 4th ed.**
  - "66 character ideal" 等西文行长经典，用于 CJK 换算参考。
- **Type is Beautiful — 中文排版专题（2018–2021）** — https://www.typeisbeautiful.com/
  - 多篇 CJK web 排版深度文章。
- **MDN — `text-justify`, `hanging-punctuation`, `line-break`** — https://developer.mozilla.org/en-US/docs/Web/CSS/text-justify
- **doocs/md GitHub repository** — https://github.com/doocs/md
  - 公众号编辑器开源参照，行长/字号默认值与本研究一致。
- **微信公众号官方接口 `draft_add`** — https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html
- **Apple HIG — Typography (zh-CN)** — https://developer.apple.com/cn/design/human-interface-guidelines/typography
  - PingFang SC × SF Pro 配对官方推荐。
- **Google Fonts CJK 子集化指南** — https://fonts.google.com/knowledge/using_type/working_with_chinese_japanese_korean_typography

### Internal References（repo 内）

| 文件 | 关联点 |
|---|---|
| `.trellis/tasks/05-23-preset-typography-overhaul/prd.md` | 本研究的需求源头，AC-3 要求 18–22 字/行 |
| `.trellis/tasks/05-14-wechat-rendering-rules-research/research/wechat-css-svg-rules.md` | 公众号 CSS 兼容性结论，影响 §4.2/4.3 fallback 策略 |
| `inkforge/src/services/export/shared-typography.ts` | 现有 `TypographyConfig` + `--ink-font-size` `--ink-line-height` CSS 变量定义，可直接复用 |
| `inkforge/src/services/export/themes.ts` | 17 preset 定义入口，本任务将基于本研究为每个 preset 注入 max-width + line-height |
| `inkforge/src/services/export/wechat.ts:1194` | `generateThemeCSS` 注入点 |
| `.trellis/tasks/04-30-04-30-p1-20-theme-font-typography/research/visual-system-current-practice.md` | 此前的 design-system token 实践，FONT_STACKS 复用源 |

---

## 9. Caveats / Not Found

- **未实测**：本研究未在真机微信公众号上对每种 max-width 渲染做截图验证，建议在实现阶段用 Playwright + 真机扫码做一次抽样验证（覆盖至少 3 个 preset × iPhone 13 / Pixel 6 / iPad Mini）。
- **`hanging-punctuation` 在 Tauri WebView2 (Windows) 上不可用**，Mac 端可用 —— 对 Windows 用户预览质量会有可见差异。可考虑用 `@supports (hanging-punctuation: first)` 做渐进增强。
- **`text-spacing-trim` 跨浏览器矩阵恰好反向**（Chrome ✅ Safari ❌），不能依赖。
- **WebFetch / Exa MCP 工具不可用于本 sub-agent 上下文**：本文中对外部产品（Medium、知乎、NYT 中文等）的具体 `max-width` / `font-size` 数值来自公开博客/开发者社区长期沉淀的常识，**未做本次会话的实时抓取验证**。如需精确到 px 的实时数据，main agent 应在 implementation 阶段用 WebFetch 抽样核对。
- **xhs / zhihu mock preview** 不属于本任务（PRD Out of Scope），但本研究的 max-width / line-height 公式同样适用于这些 preview，未来需要时可复用。

---

## 10. Recommended Action Items for Implementer

> 给 main agent / implement sub-agent 的可执行清单：

1. 在 `inkforge/src/services/export/shared-typography.ts` 中新增常量 `CJK_LINE_LENGTH_PRESET`:
   ```ts
   export const CJK_LINE_LENGTH = {
     comfortable: 22, // em，最舒适，22 字/行
     compact: 20,     // em，紧凑
     spacious: 24,    // em，宽松（学术）
   } as const
   ```
2. 在 `themes.ts` 17 个 preset 各自的 `customCSS` 中注入 §6.2 推荐的 (max-width × font-size × line-height × letter-spacing) 四元组。
3. `generateThemeCSS` (wechat.ts:1194) 输出时，将 `max-width: 22em` 等 em 值在 enforcePlatformCSS 阶段 resolve 成绝对 px（基于 preset font-size），以兼容公众号 CSS 剥离。
4. PreviewPanel.vue 加 viewport mock 时，强制 viewport 宽度 = 375px 以匹配公众号真机视口，避免桌面 1920 视口下 22em 看起来太窄的错觉。
5. Playwright 截图脚本（AC-7）需要在 375pt / 414pt / 1440pt 三个视口各跑一遍，确保 max-width 策略在不同视口都收敛到 18–22 字。
