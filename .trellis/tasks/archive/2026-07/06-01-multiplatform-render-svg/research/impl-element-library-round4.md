# 实现规格 R4 — 墨铸排版元素库（aha 元素 + 规则目录，为工具化复用打基础）

> 用户战略方向：**把排版设计落实为「规则」→ 后期落地到 InkForge 工具 → 方便复用 + 持续扩元素**。
> 故 R4 不只是加元素，而是建一套 **marker 触发 → WeChat 安全 HTML 输出 → 品牌几何** 的可复用规则，
> 并写成元素库目录 spec。所有元素沿用 R1-R3 的「铸字×构成主义×金石」母题（方格/菱形/印章/铸号）。
> 只增不减；保留 R1-R3 全部成果；非旗舰预设零改动；全程 WeChat 安全子集。

## 元素 = 规则（统一约定）
每个元素是一个 **factory 装饰器** `(palette, opts?) => (html, target) => html`，幂等哨兵 `data-ink-block`，
**preview + wechat 双轨执行**。触发方式两类：① **自动**（结构性，如阅读头/H2 目录）；② **marker**
（正文里写约定标记，如 `> 金句：…`、`[数据] …`）——marker 形态是为后期工具 UI 按钮插入做准备。
新装饰器接入 `themes.ts` 三条 flagship `chainDecorators`（注意顺序见各条）。

## 本轮实现 5 个静态元素（E1–E5，全在 `svg-modules/html-blocks.ts`）

### E1. 品牌阅读条 `decorateFlagshipReadingBar(palette)` — 自动（修「阅读时间没落地」）
微信管线 `buildReadingTimeHeader(stats)`（wechat.ts:1291）在正文顶注入裸灰阅读头（真机是 `<div>`，
文本形如「阅读约 X 分钟 全文 Y 字」可能含「N 段代码」）。本装饰器**定位该头元素**（正则匹配含
`阅读`+`分钟`+`全文`+`字` 的首个块），**提取数字 Y(字数)/X(分钟)**，替换为品牌阅读条：
```
<section data-ink-block="flagship-readbar" style="margin:0 0 24px;padding:9px 0;
  border-top:1px solid {accentBorder};border-bottom:1px solid {accentBorder};">
  <p style="margin:0;font-size:13px;color:{inkSoft};letter-spacing:1px;font-family:{HTML_FONT};">
    {gridSquareMark 内联svg 小尺寸} 墨铸 · 深读 {sep} 全文 {Y} 字 {sep} 约 {X} 分钟 {sep} 第 01 期
  </p>
</section>
```
`{sep}` = 实心 accent 小菱形（内联 svg `diamond`，~6px，`vertical-align:middle;margin:0 8px`）。
「深读/洞察/专栏」按 persona（kiln=专栏/tempera=深读/amber=洞察）。期号「第 01 期」静态占位（后期工具可填）。
chain 顺序：排在最前（与 lede 同区，先于其它）。若找不到阅读头（enableReadingTime=false）则原样返回。

### E2. 目录 / 篇目导航卡 `decorateFlagshipTOC(palette)` — 自动（按 H2 生成，wayfinding aha）
**在 H2 装饰之前**收集所有 `<h2>…</h2>` 内部纯文本（按序，编号 01..0N），生成目录卡，
**插入到封面 section 之后**（定位首个 `data-ink-svg="cover` 的 `</section>` 结束位；若有阅读条则插其后）：
```
<section data-ink-block="flagship-toc" style="margin:22px 0;padding:16px 18px;
  background-color:{accentTint};border-radius:8px;border-left:5px solid {accent};">
  <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:3px;color:{accent};
    font-family:{HTML_FONT};">本 期 目 录</p>
  {每个 H2 一行：}
  <p style="margin:7px 0;font-size:15px;color:{ink};line-height:1.5;font-family:{HTML_FONT};">
    {方格小号 svg 含 0N} <span style="margin-left:8px;vertical-align:middle;">{标题}</span></p>
</section>
```
方格小号 = 复用/微调 `gridNumberSvg` 的小尺寸版（viewBox 同，width 26）。≤1 个 H2 时不生成目录（无意义）。
幂等哨兵；只生成一次。chain 顺序：在 H2 装饰**之前**（要读原始 `<h2>`），插入逻辑在 lede/readbar 之后。

### E3. 金句大字卡 — 扩 `decorateFlagshipBlockquote` 增 PULLQUOTE 分支（marker，rhythm/emphasis aha）
在现有 callout/quote 分流前加判定：blockquote 首段纯文本以 `金句` / `金句：` / `[金句]` 起头 →
**满幅大字 feature 卡**（去前缀）：
```
<section data-ink-block="flagship-pullquote" style="margin:30px 0;padding:26px 22px;
  background-color:{paperWarm};border-radius:10px;text-align:center;">
  {大装饰引号 svg：复用 quoteGlyph，width 64，fill accent，居中 display:block;margin:0 auto 8px}
  <section style="font-size:22px;font-weight:600;line-height:1.7;letter-spacing:0.04em;color:{ink};
    font-family:{HTML_FONT};">{金句正文，保留内部 HTML}</section>
  {居中：双线 + 「墨铸」小字 + 实心菱形 diamondTerminalSvg}
</section>
```
保留 callout 分支（R2）与 quote 卡分支（R3 斜角块）不变；仅新增 pullquote 优先判定。

### E4. 数字 / 数据 callout `decorateFlagshipStat(palette)` — marker（info-design aha）
正文段落 marker：`[数据] 大数字 | 标签 | 描述`（`|` 分三段，描述可省）。装饰器匹配
`<p>[数据] …</p>` → 方格铸框大数字块：
```
<section data-ink-block="flagship-stat" style="margin:24px 0;padding:18px 20px;
  border:1px solid {accentBorder};border-radius:8px;background-color:{accentTint};">
  <p style="margin:0;font-size:40px;font-weight:800;line-height:1.05;color:{accent};
    letter-spacing:1px;font-family:{HTML_FONT};">{大数字}</p>
  <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:{ink};font-family:{HTML_FONT};">{标签}</p>
  {若有描述：<p 小字 inkSoft>{描述}</p>}
  {右上/末尾点缀：小菱形 diamondTerminalSvg}
</section>
```
（大数字用 accent 实色而非 accentDeep 反白——区别于 H2 满幅块，避免雷同。）

### E5. 图片框 `decorateFlagshipFigure(palette)` — 自动（`<img>`，框 + 衬纸 + 题注 aha）
匹配 `<img …>`（含被 `<p>` 包裹的），包成品牌图框：
```
<section data-ink-block="flagship-figure" style="margin:24px 0;padding:8px;
  background-color:{paperWarm};border:1px solid {hairline};border-radius:10px;">
  <原 img，补 style="display:block;width:100%;border-radius:6px;">
  {若 img 有 alt：题注行 <p style="margin:8px 4px 2px;font-size:13px;color:{inkSoft};
    letter-spacing:0.5px;text-align:center;">{gridSquareMark 极小} {alt 文本}</p>}
</section>
```
注意：真微信里**外链 `<img src>` 需上传后才显示**（粘贴外链图常被替换/拦截）——这是微信侧限制，
本元素只负责「框+题注」设计；img 本身上传由作者在编辑器完成。本地 393px 渲染用占位图演示框样式即可。

## 元素库目录 spec（规则文档，为工具化复用）
新建 `.trellis/spec/frontend/flagship-element-catalog.md`：表格列出**每个元素 = {触发(自动/marker 语法)、
WeChat 安全输出要点、品牌几何、装饰器函数、幂等哨兵}**，含 R1-R3 已有元素（封面/H2/H3/引用/列表/印章/
versal/分隔/colophon/高亮）+ R4 新增 5 个。这是后期把元素接进 InkForge 工具 UI（按钮插 marker）的依据。

## 示例联动（演示 marker 元素）
更新 `__tests__/emit-flagship-artifacts.test.ts` 的 SAMPLE_MARKDOWN + PRERENDERED_HTML：
加 1 处 `> 金句：…`（可复用现有引言改成金句）、1 处 `[数据] 20-22 | 汉字/行 | 移动端竖屏舒适区间`、
1 处占位图片 `![示意图：版心宽度示例](https://…占位…)`，以便重生成产物里能看到 E3/E4/E5。
（保留原有正文结构，仅插入演示节点；不破坏既有断言。）

## 硬约束（同 R1-R3）
WeChat 安全子集；禁 class/id/style标签/var/calc/gradient/transform/transition/animation/filter/flex/grid/
position/`<div>`(输出)；内联 svg 母题只 rect/path/line/text/circle；**绝不 emoji**；幂等哨兵；
preview+wechat 双轨；**零删除**；非旗舰零改动。

## 测试
- `html-blocks.test.ts`：E1 阅读条（含菱形 sep + 提取字数/分钟 + border 双线）、E2 目录（按 H2 生成、
  ≤1 H2 不生成、幂等、方格号）、E3 金句卡（marker 触发、与 callout/quote 分流不冲突）、E4 数字块
  （marker 解析 3 段、大数字 accent）、E5 图片框（包裹 img、alt 题注、无 img 时不动）。各含幂等 + 无 forbidden。
- 跑 `pnpm exec vitest run src/services/export` 全绿；vue-tsc + eslint 干净；
  `EMIT_ARTIFACTS=1` 重生成三产物（含新元素演示）。

## 并行研究任务（trellis-research，单独）
核实 **横滑(swipe gallery) / 伸缩栏(accordion 折叠) / 外链图片** 在真微信「粘贴 HTML」路径的存活边界：
查 `platform-rules/wechat.ts` + `postProcessForWechat` 的 strip 表对 `overflow`/`<details>`/`<summary>`/
事件属性 的处理；查微信图文是否保留 `overflow-x:auto` 横滑或 `<details>` 折叠（大概率否）；
结论 + 替代方案（如：交互类只能靠 InkForge 工具调微信原生组件，非粘贴 HTML）写入
`research/feasibility-interactive-elements.md`。**不改代码。**

## 验证（主会话）
393px 渲染三产物自读图（阅读条/目录/金句/数字/图片框到位、不溢出、品牌一致）；后续真公众号 paste 复核新元素存活。
