# 实现规格 R3 — 构成主义结构系统（H2/H3/引用/列表 专属母题）

> 用户判 R2：封面/印章/versal/报头/colophon 品牌感够了，但 **H2/H3/引用框还是「实色条 + 左竖条
> 卡片」=135/秀米 通用做法，没形成墨铸自己的母题**。R3 = 用墨铸几何母题（**方格 grid × 菱形
> diamond × 构成主义**，与已认可的 印章/鼎徽/versal/分隔菱形 同源）把结构元素重塑为专属形态。
> 用户选定 = **构成主义印记**。只改这几个装饰器的**形态**，保留 R1/R2 全部其他成果；零删除。

## 核心母题（贯穿结构元素，建立节奏）
- **方格 grid**：2×2 细线方格 / 小实心方格 —— 来自 vessel mark 的「方寸之印」基座 + 封面网格。
- **菱形 diamond**：实心/描边菱形 —— 品牌签名（已用于 divider / colophon）。
- **构成主义**：满幅实色场 + 反白、不对称、强几何、方格节奏基线、斜角。

全部承文字节点保持 **HTML 文字（live）**；几何母题用**内联 `<svg>`**（viewBox + 固定 px width/height +
`display:inline-block` + `vertical-align`，rect/path/line/text，无 class/defs/gradient/transform），
内联在 HTML 块内（已验证 WeChat 存活）。新增小母题 SVG 助手建议放 `html-blocks.ts` 局部（emit 裸 `<svg>`，
非 `svgSection`），可复用 `primitives` 的 rect/path/diamond/textLine 思路但自带 `<svg>` 包裹。

## 1. H2 — 构成主义满幅章节头（`decorateFlagshipH2`，三变体统一为本形态，仅 hue 不同）
保留 R1 满幅 `accentDeep` 实色块 + 反白（用户认可的「猛」），但把内部从「巨号 + 标题」升级为构成主义：
```
<section data-ink-block="flagship-h2" style="margin:38px 0 22px;">
  <section style="background-color:{accentDeep};border-radius:4px;padding:18px 20px;">
    {gridNumberSvg(idx)}                         // 方格铸号（内联 svg，左，inline-block）
    <p style="margin:12px 0 0;font-size:21px;font-weight:700;line-height:1.45;letter-spacing:0.5px;
       color:#ffffff;font-family:{HTML_FONT};">{inner}</p>   // 反白标题
    <p style="margin:14px 0 0;padding-top:10px;border-top:1px solid rgba(255,255,255,0.32);">
       {3 个方格节奏方块}</p>                      // 方格节奏基线（rule + grid nodes）
  </section>
</section>
```
**`gridNumberSvg(idx)`**（内联 svg）：`viewBox 0 0 48 48` width=46 height=46
`style="display:inline-block;vertical-align:middle;"`：
- 方框：`rect x=1.5 y=1.5 width=45 height=45 rx=4` `fill=none stroke=rgba(255,255,255,0.85) stroke-width=2`
- 角标 registration tick：`rect x=37 y=5 width=5 height=5 fill=#ffffff`（右上角小实心方，构成主义套准记号）
- 号码：`<text x=23 y=33 text-anchor=middle font-size=25 font-weight=800 fill=#ffffff font-family=...>{idx}</text>`
**方格节奏基线方块**（3 个，HTML inline-block，落在 border-top 规则线下）：
`<span style="display:inline-block;width:7px;height:7px;margin-right:6px;vertical-align:middle;
 background-color:#ffffff;"></span>`（第 1、3 个 `background-color:#fff`，第 2 个改
`background-color:transparent;border:1px solid rgba(255,255,255,0.7)` —— 实/虚交替的方格节奏）。
保留：闭包内计数器、`data-ink-block="flagship-h2"` 哨兵、`<h2>` 正则替换。**移除** R2 的
kiln/tempera/amber 三套编号差异（统一构成主义形态，仅 accentDeep hue 不同）。

## 2. H3 — 方格锚 + 基线（`decorateFlagshipH3`）
丢弃 R2 的「左 5px 条 + 淡底 plate」（通用）。改构成主义小标题：
```
<section data-ink-block="flagship-h3" style="margin:28px 0 14px;padding-bottom:8px;
  border-bottom:1px solid {accentBorder};">
  {gridSquareMark()}                              // 方格锚（内联 svg，左）
  <span style="margin-left:10px;color:{ink};font-size:18px;font-weight:700;letter-spacing:0.5px;
    line-height:1.5;font-family:{HTML_FONT};vertical-align:middle;">{inner}</span>
</section>
```
**`gridSquareMark()`**（内联 svg 2×2 方格）：`viewBox 0 0 16 16` width=15 height=15
`style=display:inline-block;vertical-align:-2px;`：
- `rect x=1 y=1 width=14 height=14 fill=none stroke={accent} stroke-width=1.6`
- 内十字：`line`/细 rect 各一（竖 `rect x=7.4 y=1 w=1.2 h=14`、横 `rect x=1 y=7.4 w=14 h=1.2`，fill={accent} opacity=0.55）
- 左上格实心：`rect x=1 y=1 width=6.4 height=6.4 fill={accent}`（朱文实格，点睛）

## 3. 引用 — 构成主义不对称块（`decorateFlagshipBlockquote` 的 QUOTE 卡分支）
丢弃 R2 的「对称淡底卡 + 大 66 引号」（通用）。改不对称构成块（callout 分支**保留 R2 不动**）：
```
<section data-ink-block="flagship-quote" style="margin:26px 0;padding:16px 20px 14px;
  border-left:7px solid {accent};background-color:{accentTint};border-radius:0 6px 6px 0;">
  {diagonalCornerSvg()}                            // 左上斜角实色三角（内联 svg，inline-block）
  <section style="margin:6px 0 0;font-size:17px;line-height:1.95;letter-spacing:0.04em;
    color:{ink};word-break:break-word;">{quoteBody}</section>
  <p style="margin:12px 0 0;text-align:right;">{diamondTerminalSvg()}{attrNode 文字（若有署名）}</p>
</section>
```
**`diagonalCornerSvg()`**：`viewBox 0 0 30 30` width=26 height=26 inline-block：
实色三角 `path d="M0,0 L30,0 L0,30 Z" fill={accent}` + 内嵌一枚白小方格
`rect x=4 y=4 width=7 height=7 fill={paper}`（构成主义斜角 + 方格）。
**`diamondTerminalSvg()`**：`viewBox 0 0 16 16` width=12 height=12 inline-block：
`{diamond(8,8,6,accent)}`（实心 accent 菱形，作引文收尾签名）；其右接署名文字（若 splitAttribution 命中）。
保留：`detectCallout` 分流、`splitAttribution` 署名分离、保留内部 HTML、幂等哨兵。

## 4. 列表 / callout 标记 — 跟随母题统一（`decorateFlagshipLists`、callout）
- **UL marker**：现 7px 圆角小方 → 改**实心 accent 菱形**（内联 svg 或 `diamond`，~9px），与 divider/引用菱形统一。
- **OL chip**：现**圆形**编号（`border-radius:50%`，通用）→ 改**方格铸号**风：`border-radius:3px` 方形 +
  accent 底 + 白号 + 右上角 1px 套准小白点（或保持简洁纯方块）。与 H2 方格铸号同语言。
- **callout 框**：左条 5px 保留；把图标前的形态与方格呼应——可不动图标，仅把外框 `border-radius` 收到 6px、
  加一枚小 `gridSquareMark` 在标签行首（可选，时间不够可跳过，**不破坏** R2 callout 行为）。

## 硬约束（同 R1/R2）
- 微信安全子集；禁 class/id/style/var/calc/gradient/transform/transition/animation/filter/flex/grid/
  position/`<div>`；内联 svg 母题只用 rect/path/line/text/circle；**绝不 emoji**；所有内联 svg 片段
  经现有 `checkWechatSafe` 思路自检（无 defs/gradient）。
- **零删除**：26 SVG 模块、cover-quote、R1/R2 全部成果（封面报头/印章/versal/分隔/colophon/高亮）保留。
  非旗舰预设零改动。H2 仍满幅 accentDeep（用户认可的「猛」不可丢）。
- ember 不新增（结构母题用 accent/accentDeep）。

## 测试（全绿 + 重生成产物）
- `html-blocks.test.ts`：H2 含 `gridNumberSvg`(svg + rect 方框 + 反白号 + 套准 tick) + 方格节奏基线
  (border-top + 3 方块) + 仍满幅 accentDeep；H3 含方格锚 svg + 底线；引用含斜角三角 svg + 菱形收尾 + 左 7px 条；
  保留幂等/哨兵/无 forbidden 构造/callout 分流/footer/versal 断言。
- `dividers`/`covers`/`theme` 等 R1/R2 断言保持绿。
- 跑 `pnpm exec vitest run src/services/export` 全绿（报通过数）；`vue-tsc --noEmit` + `eslint` 干净；
  `EMIT_ARTIFACTS=1` 重生成 `prompts/0601/evidence/wechat-paste/flagship-{kiln,tempera,amber}.html`（报字节/时间戳）。

## 验证（主会话）
393px Playwright 三产物自读图：H2 方格铸号 + 节奏基线、H3 方格锚、引用斜角 + 菱形收尾、列表菱形/方号
全部到位、不溢出、反白对比足够、整体读作一致的「构成主义墨铸」结构语言。
