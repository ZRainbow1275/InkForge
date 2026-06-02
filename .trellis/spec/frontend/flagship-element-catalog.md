# 旗舰排版元素目录（Flagship Element Catalog）

> 「墨铸」旗舰预设（flagship-kiln / flagship-tempera / flagship-amber）使用的 inline-SVG +
> HTML 色块装饰元素的统一目录。每个元素 = 一条**规则**：触发方式 + 微信安全输出要点 +
> 品牌几何 + 装饰器函数 + 幂等哨兵。后期工具 UI（InkForge 工具栏）接入元素时按此目录读规则
> 「按钮 → 插 marker / 自动应用」。
>
> 母题统一：方格 grid × 菱形 diamond × 印章 × 构成主义。零 emoji。**preview + wechat 双轨执行**。
> 所有装饰器：`(palette, opts?) => (html, target) => html`，幂等（data-ink-block / data-ink-svg）。
> 非旗舰预设零行为改动。

---

## 1. 触发方式分类

| 类型 | 含义 | 工具 UI 形态 |
|------|------|--------------|
| **auto-structural** | 装饰器自动识别 HTML 锚点（`<h1-3>`/`<hr>`/`<blockquote>`/`<img>`/阅读头）并替换 | 无 UI（背景自动） |
| **auto-decoration** | 装饰器在文档首/末追加（cover / footer / TOC） | 「插入旗舰封面/版权页/目录」按钮 |
| **marker (markdown)** | 正文写约定标记（`> 金句：…` / `[数据] …`）触发 | 「插入金句卡 / 数据块」按钮 → 写 marker |

---

## 2. 元素目录（R1–R4 全量）

### R1–R3 已有元素

| 元素 | 触发 | 微信安全输出要点 | 品牌几何 | 装饰器函数 | 幂等哨兵 |
|------|------|------------------|----------|-----------|----------|
| **封面卡** | auto-structural（首部 SVG 插入） | `<svg viewBox width="100%">` + 顶部满幅 `accentDeep` 色带 + 巨号标题 + 重 accent tab + 右下方印 | 报头 nameplate / 印章 / 双线规则 | `composeSvgDecorate({cover})` → `renderCoverTitle` / `renderCoverGrid` | `data-ink-svg="cover-*"` |
| **分隔线** | auto-structural（替换 `<hr>`） | `<svg>` 内联 + 实心 accent 菱形 / 网格 / Forge Line + hairline 两侧 | 实心菱形 / 2×2 方格 / 锻造光晕 | `composeSvgDecorate({replaceHr})` → `divider-{diamond,grid,forge}` | `data-ink-svg="divider-*"` |
| **首字下沉** versal | auto-structural（首段第一个文本字符） | 内联 `<span>`，`background-color:{accentDeep}` + 反白 #fff + 52×52 方块 | 铸字方印（accentDeep + 白字 + serif） | `decorateFlagshipLede(palette)` | `data-ink-block="flagship-lede"` |
| **章节头** H2 | auto-structural（替换 `<h2>`） | `<section>` 嵌套 + `background-color:{accentDeep}` + `border-radius:4px` + 反白 + 方格铸号 svg | 方格铸号（白描边方框 + 套准小方 + 反白号）+ 节奏基线 3 小方块 | `decorateFlagshipH2(palette,{variant})` | `data-ink-block="flagship-h2"` |
| **小节头** H3 | auto-structural（替换 `<h3>`） | `<section>` + 底线 hairline + ink 标题 + 方格锚 svg | 方格锚（2×2 描边 + 实心朱文格） | `decorateFlagshipH3(palette)` | `data-ink-block="flagship-h3"` |
| **引用卡** QUOTE | auto-structural（默认 blockquote 分支） | `<section>` 左 7px accent 条 + 斜角三角 svg + 菱形收尾 + 内部 HTML 保留 | 构成主义斜角 + 菱形 | `decorateFlagshipBlockquote(palette)` (quote 分支) | `data-ink-block="flagship-quote"` |
| **CALLOUT 提示框** | marker（blockquote 首段以 `提示`/`注意`/`重点`/`警告`/`要点`/`Note`/`Tip`/`Warning` 起头） | `<section>` 左 5px 条 + `accentTintStrong` 底 + 内联 `<svg><path>` 图标 | octicon path（info / warn / tip） | `decorateFlagshipBlockquote(palette)` (callout 分支) | `data-ink-block="flagship-callout"` |
| **列表** UL | auto-structural（包 `<ul>/<li>`） | `<ul style="list-style:none">` + 每 li 前置实心 accent 菱形 svg + `display:inline-block` | 实心菱形 | `decorateFlagshipLists(palette)` (UL 分支) | `data-ink-block="flagship-ul"` |
| **列表** OL | auto-structural（包 `<ol>/<li>`） | `<ol style="list-style:none">` + 每 li 前置 22×22 方块 chip + 右上 1px 套准小白点 | 方格铸号 chip（border-radius:3px） | `decorateFlagshipLists(palette)` (OL 分支) | `data-ink-block="flagship-ol"` |
| **关键句高亮** | auto-structural（`<strong>` CSS） | juice 内联 `background:rgba({accent},0.18) + border-bottom:2px solid rgba({accent},0.5)` | accent rgba 半透明带 | flagship `#nice strong` CSS（themes.ts） | n/a（CSS 内联） |
| **文末落款卡** colophon | auto-decoration（文末追加） | `<section>` paperWarm 卡 + 双细线 + vessel mark svg + 方印 svg + 全文完 | vessel mark / 双线 / 方印（accentDeep + 白印文） | `decorateFlagshipFooterCard(palette,{brand,tagline})` | `data-ink-block="flagship-footer"` |

### R4 新增（2026-06-02）

| 元素 | 触发 | 微信安全输出要点 | 品牌几何 | 装饰器函数 | 幂等哨兵 |
|------|------|------------------|----------|-----------|----------|
| **E1 品牌阅读条** | auto-structural（替换 `buildReadingTimeHeader` 注入的裸 `<div>阅读约 X 分钟 全文 Y 字</div>` 块） | `<section>` 上下细线 + 小方格 svg + 「墨铸 · {persona栏目}」+ 实心菱形 sep + 「全文 Y 字 · 约 X 分钟 · 第 01 期」 | 小方格 + 实心菱形分隔 | `decorateFlagshipReadingBar(palette,{variant?})` | `data-ink-block="flagship-readbar"` |
| **E2 篇目目录** | auto-decoration（按原始 `<h2>` 收集；必须在 H2 装饰前） | `<section>` accentTint 底 + 左 5px accent 条 + 「本期目录」标头 + 每 H2 一行（方格小号 svg + 标题）；≤1 个 H2 不生成 | 方格铸号小尺寸（accent 底 + 反白号） | `decorateFlagshipTOC(palette)` | `data-ink-block="flagship-toc"` |
| **E3 金句大字卡** | marker（blockquote 首段以 `金句` / `金句：` / `[金句]` 起头） | `<section>` paperWarm 底 + 居中 + 大装饰引号 svg + 22px 600 居中正文 + 双线 + 「墨铸 · 菱形」收尾 | 大装饰引号 + 双线 + 菱形 | `decorateFlagshipBlockquote(palette)` (pullquote 分支，优先于 callout/quote) | `data-ink-block="flagship-pullquote"` |
| **E4 数据 callout** | marker（`<p>[数据] 大数字 \| 标签 \| 描述?</p>`） | `<section>` accentBorder 描边 + accentTint 底 + 40px 800 accent 实色大数字 + 15px ink 标签 + 13px inkSoft 描述 + 收尾菱形 | 方格铸框 + 菱形 | `decorateFlagshipStat(palette)` | `data-ink-block="flagship-stat"` |
| **E5 品牌图框** | auto-structural（`<p><img></p>` 或裸 `<img>`） | `<section>` paperWarm 衬纸 + hairline 边 + 圆角；img 补 `display:block;width:100%;border-radius:6px;`；alt 非空 → 题注行（小方格 svg + alt 文本） | 衬纸 + 小方格题注 | `decorateFlagshipFigure(palette)` | `data-ink-block="flagship-figure"` |

---

## 3. Chain 顺序（旗舰 decorate）

```
1. composeSvgDecorate(plan)           // SVG 图形：封面 / 分隔
2. decorateFlagshipReadingBar         // 替换裸阅读头（必须先于 lede，否则 lede 落上）
3. decorateFlagshipStat               // marker `<p>[数据]…</p>` → stat 块（必须先于 lede + H2）
4. decorateFlagshipFigure             // `<img>` → figure 框
5. decorateFlagshipLede               // 首段首字 versal（跳过 readbar/blockquote/data-ink）
6. decorateFlagshipTOC                // 按原始 `<h2>` 生成（必须先于 H2 装饰）
7. decorateFlagshipH2                 // H2 → 满幅章节头
8. decorateFlagshipH3                 // H3 → 方格锚 + 底线
9. decorateFlagshipBlockquote         // pullquote > callout > quote 三分流
10. decorateFlagshipLists             // UL 菱形 / OL 方号
11. decorateFlagshipFooterCard        // 文末追加版权页
```

---

## 4. 微信安全硬约束（所有元素共享）

- **允许**：`color`/`background-color`/`background(实色)`/`border`/`border-left`/`border-radius`/
  `padding`/`margin`/`box-shadow(非 inset)`/`font-*`/`text-align`/`line-height`/`letter-spacing`/
  `display:inline-block`/`vertical-align`/`word-break`/`opacity`。
- **禁止（被 postProcessForWechat / enforcePlatformCSS / DOMPurify 剥）**：
  `class` / `id` / `<style>` / `var(--)` / `calc()` / `linear-gradient` / `radial-gradient` /
  `transform`(style 内) / `transition` / `animation` / `filter` / `flex` / `grid` / `position` /
  输出 `<div>` / `box-shadow ... inset` / `xlink:href`。
- **内联 SVG 子集**：仅 `<svg viewBox width="N">`（固定 px 在 inline html-blocks 内 OK）+
  `<rect>`/`<path>`/`<line>`/`<circle>`/`<text>` + `fill`(hex/rgba) + `stroke` + `opacity` +
  `transform`(XML 属性)。**禁** `<defs>`/`<linearGradient>`/`<clipPath>`/`<mask>`/`<filter>`/
  `<use>`/`<symbol>`/`url(#)`/`<foreignObject>`/`<image href>`。
- **图标**：仅内联 SVG `<path>`（octicon 风格）或几何标点。**绝不 emoji**。
- **幂等**：所有装饰器先检 `data-ink-block` / `data-ink-svg` 哨兵；二跑 === 一跑。

---

## 5. 测试守护

- `svg-modules/__tests__/html-blocks.test.ts` — R1–R4 全部装饰器单测（含幂等 + 无禁用构造 +
  preview/wechat 双轨）。
- `svg-modules/__tests__/wechat-safe.test.ts` — 安全子集校验器（17 规则）。
- `services/export/__tests__/emit-flagship-artifacts.test.ts` — 真管线集成 + 三旗舰产物
  含 `data-ink-svg` + `data-ink-block="flagship-{h2,quote|callout,ul|ol,footer}"`。
- `services/export/__tests__/flagship-pipeline-smoke.test.ts` — 真 `convertToWechatWithStats`
  端到端，每个 `<section data-ink-svg>` 块经全管线后 `checkWechatSafe===[]`。

---

## 6. 后期工具化接入点（InkForge 编辑器 UI）

| UI 按钮 | 写入 markdown | 触发元素 |
|---------|---------------|---------|
| 「金句」 | `> 金句：{正文}` | E3 pullquote |
| 「数据块」 | `[数据] {大数字} \| {标签} \| {描述}` | E4 stat |
| 「提示」 | `> 提示：{正文}` | callout |
| 「警告」 | `> 警告：{正文}` | callout（ember） |
| 「目录」 | （自动，无 marker） | E2 TOC |
| 「插入图片」 | `![{alt}]({url})` | E5 figure |

（自动元素无需 UI 按钮：封面 / 分隔 / 阅读条 / 首字下沉 / H2/H3/列表 / 版权页 — 由 chain 自动应用。）
